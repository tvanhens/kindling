/**
 * The `Profile` domain service — reads and writes of the signed-in user's own
 * record.
 *
 * ## Why the actor here is a credential, not an id
 *
 * `./projects.ts` takes `ownerId` because it owns its table. This service does
 * not: the `user` table belongs to Better Auth (see `src/db/schema.ts`), so
 * writes go through `auth.api.updateUser` rather than through Drizzle — and
 * Better Auth identifies the subject of that call from the request
 * *credentials*, not from an id argument.
 *
 * So the explicit argument is `credentials: Headers`. It is still an argument,
 * which is the property that matters: nothing here yields `CurrentUser` or
 * `HttpServerRequest`, so a public API can call it too. Better Auth's bearer
 * plugin authenticates from `Authorization: Bearer …` in exactly the same
 * header bag that carries the session cookie today, so a token-authenticated
 * caller hands over the same shape.
 *
 * If you ever need to edit *another* user's profile, that is an admin
 * operation: add Better Auth's admin plugin and a separate method that takes
 * the target id explicitly.
 */
import type { RuntimeContext } from "alchemy/RuntimeContext";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Auth } from "./auth.ts";
import { User } from "./domain.ts";

/** The mutable part of a profile. */
export interface UpdateProfile {
  readonly name: string;
  readonly image: string | null;
}

export class Profile extends Context.Service<
  Profile,
  {
    /** Update the profile of whoever `credentials` authenticate as. */
    readonly update: (
      credentials: Headers,
      input: UpdateProfile,
    ) => Effect.Effect<User, never, RuntimeContext>;
  }
>()("kindling/backend/Profile") {
  /** Effect 4: no generated `.Default`, no `dependencies` — write it out. */
  static readonly layer: Layer.Layer<Profile, never, Auth> = Layer.effect(
    Profile,
    Effect.gen(function* () {
      const auth = yield* Auth;

      const update = Effect.fn("Profile.update")(function* (
        credentials: Headers,
        input: UpdateProfile,
      ) {
        // The `user` table belongs to Better Auth, so profile writes go through
        // its API rather than through Drizzle. See src/db/schema.ts.
        yield* auth.api.updateUser({
          body: { name: input.name, image: input.image },
          headers: credentials,
        });

        // Read back rather than echoing the input: Better Auth may normalise or
        // reject fields, and the caller wants the row that now exists.
        const session = yield* auth.getSession(credentials);
        const user = session?.user;
        if (user === undefined) {
          return yield* Effect.die(new Error("session vanished mid-request"));
        }

        return new User({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image ?? null,
          createdAt: user.createdAt,
        });
      }, Effect.orDie);

      return Profile.of({ update });
    }),
  );
}
