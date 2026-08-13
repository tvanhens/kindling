/**
 * The `ApiKeys` domain service — reads of the caller's own API keys.
 *
 * ## Why the actor here is a credential, not an id
 *
 * Same reason as `./profile.ts`: the `apikey` table belongs to Better Auth's
 * `apiKey` plugin (see the ownership note in `src/db/schema.ts`), so reads go
 * through `auth.api.listApiKeys` rather than through Drizzle, and Better Auth
 * identifies the subject of that call from the request *credentials*. Passing
 * the session headers is what scopes the list to one user — there is no
 * `ownerId` argument to forget.
 *
 * It is still an argument, which is the property that matters: nothing here
 * yields `CurrentUser` or `HttpServerRequest`.
 *
 * ## Why there is no `create` / `revoke` here
 *
 * Minting and revoking are session operations that the browser performs
 * directly against `/api/auth/api-key/*` via `authClient.apiKey.*` — the same
 * path a password change takes. The full secret is returned exactly once, in
 * that response, and never passes through our own transports. Add methods here
 * the day something server-side needs to mint a key.
 */
import type { RuntimeContext } from "alchemy/RuntimeContext";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Auth } from "./auth.ts";
import { ApiKeySummary } from "./domain.ts";

export class ApiKeys extends Context.Service<
  ApiKeys,
  {
    /** Every API key belonging to whoever `credentials` authenticate as. */
    readonly list: (
      credentials: Headers,
    ) => Effect.Effect<ReadonlyArray<ApiKeySummary>, never, RuntimeContext>;
  }
>()("kindling/backend/ApiKeys") {
  /** Effect 4: no generated `.Default`, no `dependencies` — write it out. */
  static readonly layer: Layer.Layer<ApiKeys, never, Auth> = Layer.effect(
    ApiKeys,
    Effect.gen(function* () {
      const auth = yield* Auth;

      const list = Effect.fn("ApiKeys.list")(function* (credentials: Headers) {
        const { apiKeys } = yield* auth.api.listApiKeys({ headers: credentials });

        // Project onto the domain type rather than handing the plugin's row
        // out: the row carries rate-limit counters, metadata and the *hashed*
        // secret, none of which is anyone's business.
        return apiKeys.map(
          (key) =>
            new ApiKeySummary({
              id: key.id,
              name: key.name,
              start: key.start,
              enabled: key.enabled,
              createdAt: key.createdAt,
              lastRequest: key.lastRequest,
              expiresAt: key.expiresAt,
            }),
        );
      }, Effect.orDie);

      return ApiKeys.of({ list });
    }),
  );
}
