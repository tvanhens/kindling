import { BetterAuth } from "@alchemy.run/better-auth";
import { CloudflareD1 } from "@alchemy.run/better-auth/CloudflareD1";
import * as Cloudflare from "alchemy/Cloudflare";
import * as DrizzleD1 from "alchemy/Drizzle/D1";
import type { RuntimeContext } from "alchemy/RuntimeContext";
import { and, eq } from "drizzle-orm";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import { projects, relations } from "../db/schema.ts";
import { AppDatabase } from "./database.ts";
import {
  AppRpcs,
  AuthMiddleware,
  CurrentUser,
  Project,
  ProjectNotFound,
  Unauthorized,
  User,
} from "./rpc.ts";

/**
 * The backend Worker.
 *
 * It is a **plain** `Cloudflare.Worker`, not a `Cloudflare.Workers.RpcWorker`:
 * an RpcWorker's `fetch` *is* the RPC server, which leaves no room for the
 * Better Auth routes. Here `fetch` dispatches on the path instead:
 *
 *   /api/auth/*  ->  Better Auth
 *   /rpc         ->  the Effect RPC server
 *   *            ->  404
 *
 * The Worker is private (`workersDev: false`); the browser reaches it through
 * the Website's service binding, which forwards the original `Request` — same
 * URL, same `Host`, same cookies. That property is what makes the auth
 * configuration below work without knowing the public origin at deploy time.
 */
export default class Backend extends Cloudflare.Worker<Backend>()(
  "Backend",
  {
    main: import.meta.url,
    workersDev: false,
    // Better Auth's password hashing and cookie handling need Node built-ins.
    compatibility: { flags: ["nodejs_compat"] },
  },
  Effect.gen(function* () {
    // -----------------------------------------------------------------------
    // Init phase — runs once per isolate (and at deploy time, to collect
    // bindings). Nothing here may depend on a live request.
    // -----------------------------------------------------------------------

    const auth = yield* BetterAuth({
      basePath: "/api/auth",

      // ── Public origin ────────────────────────────────────────────────────
      // `baseURL` and `trustedOrigins` are deliberately left unset.
      //
      // They would have to be the *Website's* origin, but the Website binds
      // this Worker — a dependency cycle. Alchemy can express such cycles
      // (https://alchemy.run/infrastructure-as-effects/circular-bindings) by
      // splitting a Worker's Tag from its `.make()` implementation, but that
      // escape hatch does not apply here: `Cloudflare.Website.Vite` has no
      // `.make()` form to split, and threading the URL back in the other
      // direction would put the whole stack module into the Worker bundle.
      //
      // Instead we lean on the property above: the Website proxies the browser's
      // original request unchanged, so Better Auth derives the base URL from the
      // incoming `Host`/`X-Forwarded-*` headers and defaults `trustedOrigins` to
      // it. Its CSRF check still compares the `Origin` header against that same
      // derived origin, so a cross-site POST is rejected exactly as it would be
      // with a hardcoded value.
      //
      // If you later serve auth from a *second* origin (a native app, a
      // marketing domain), set `trustedOrigins` here to an explicit list.

      emailAndPassword: {
        enabled: true,
        // Flip to `true` once you have wired a real email provider below.
        requireEmailVerification: false,

        // TODO(email): send a real email.
        // Replace this stub with your provider of choice — Cloudflare Email
        // Sending via a `send_email` binding, Resend, Postmark, SES, ... Add the
        // binding/secret to this Worker's props above and call it from here.
        // Until then the link is logged so a fresh fork is runnable offline.
        sendResetPassword: async ({ user, url }) => {
          console.log(`[auth] password reset for ${user.email}: ${url}`);
        },
      },

      emailVerification: {
        sendOnSignUp: false,

        // TODO(email): same as above — this is the second (and last) place a
        // real email provider needs to be wired in.
        sendVerificationEmail: async ({ user, url }) => {
          console.log(`[auth] verify email for ${user.email}: ${url}`);
        },
      },
    });

    const d1 = yield* Cloudflare.D1.QueryDatabase(AppDatabase);
    const db = yield* DrizzleD1.D1(d1, { relations });

    // -----------------------------------------------------------------------
    // Auth middleware
    // -----------------------------------------------------------------------

    /**
     * Implementation of the `AuthMiddleware` tag declared in `rpc.ts`.
     *
     * It reads the session from the request headers and provides `CurrentUser`
     * to the handler, or fails with `Unauthorized`. Handlers therefore never
     * see a user id from the client.
     */
    const AuthMiddlewareLayer = Layer.succeed(AuthMiddleware, (handler, { headers }) =>
      Effect.gen(function* () {
        // `headers` is Effect's immutable record; Better Auth wants the DOM type.
        const session = yield* auth.getSession(new Headers({ ...headers })).pipe(
          // A failure to *read* the session is not the same as "no session",
          // but from the caller's point of view both mean "not signed in".
          Effect.catchTag("BetterAuthApiError", () => Effect.succeed(null)),
        );

        if (session === null) {
          return yield* new Unauthorized({ message: "Not signed in" });
        }

        return yield* handler.pipe(
          Effect.provideService(
            CurrentUser,
            new User({
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              emailVerified: session.user.emailVerified,
              image: session.user.image ?? null,
              createdAt: session.user.createdAt,
            }),
          ),
        );
      }),
    );

    // -----------------------------------------------------------------------
    // Handlers
    // -----------------------------------------------------------------------

    const HandlersLayer = AppRpcs.toLayer({
      me: () => CurrentUser,

      updateProfile: Effect.fn("updateProfile")(function* ({ name, image }, { headers }) {
        const requestHeaders = new Headers({ ...headers });

        // The `user` table belongs to Better Auth, so profile writes go through
        // its API rather than through Drizzle. See src/db/schema.ts.
        yield* auth.api.updateUser({ body: { name, image }, headers: requestHeaders });

        const session = yield* auth.getSession(requestHeaders);
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
      }, Effect.orDie),

      // --- the CRUD pattern to copy ---------------------------------------
      //
      // Every query is scoped by `ownerId = currentUser.id`. Keep that filter in
      // the SQL itself (not in a post-filter, not in a helper that a future
      // handler might forget to call) — it is the only thing standing between
      // one tenant's rows and another's.

      listProjects: Effect.fn("listProjects")(function* () {
        const user = yield* CurrentUser;
        const rows = yield* db
          .select()
          .from(projects)
          .where(eq(projects.ownerId, user.id))
          .orderBy(projects.createdAt);
        return rows.map((row) => new Project(row));
      }, Effect.orDie),

      createProject: Effect.fn("createProject")(function* ({ name, description }) {
        const user = yield* CurrentUser;
        const now = DateTime.toDate(yield* DateTime.now);

        const [row] = yield* db
          .insert(projects)
          .values({
            id: crypto.randomUUID(),
            ownerId: user.id,
            name,
            description,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (row === undefined) {
          return yield* Effect.die(new Error("insert returned no row"));
        }
        return new Project(row);
      }, Effect.orDie),

      deleteProject: Effect.fn("deleteProject")(function* ({ id }) {
        const user = yield* CurrentUser;

        // `and(eq(id), eq(ownerId))` makes "not found" and "not yours"
        // indistinguishable to the caller — deliberately.
        const [row] = yield* db
          .delete(projects)
          .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
          .returning()
          .pipe(Effect.orDie);

        if (row === undefined) {
          return yield* new ProjectNotFound({ id });
        }
        return row.id;
      }),
    });

    // -----------------------------------------------------------------------
    // The RPC server
    // -----------------------------------------------------------------------

    /**
     * Builds the `/rpc` handler.
     *
     * Two things about this expression are easy to get wrong:
     *
     * 1. It is **not** yielded here in the init phase, only described. The auth
     *    middleware reaches D1 through alchemy's `RuntimeContext`, which exists
     *    only while a request is being served, and `toHttpEffect` bakes its
     *    context in at build time — building it during init would capture a
     *    context without it. So it is yielded inside `fetch` instead.
     *
     * 2. Use `toHttpEffect`, **not** `RpcServer.layerHttp`, whose `protocol`
     *    option defaults to `"websocket"`. Omitting `protocol: "http"` there
     *    silently 404s every POST to `/rpc`.
     *
     * The explicit annotation is load-bearing. Alchemy's Worker shape accepts
     * `fetch` with an unconstrained requirement channel, so an unprovided
     * service inside `fetch` would *not* be a type error — it would be a
     * runtime failure. Naming the requirements here restores that check: if a
     * handler or middleware layer is missing, this line stops compiling.
     */
    const rpcServer: Effect.Effect<
      Effect.Effect<HttpServerResponse.HttpServerResponse, never, Scope.Scope | HttpServerRequest>,
      never,
      Scope.Scope | RuntimeContext
    > = RpcServer.toHttpEffect(AppRpcs).pipe(
      Effect.provide(
        Layer.mergeAll(HandlersLayer, AuthMiddlewareLayer, RpcSerialization.layerJson),
      ),
    );

    // -----------------------------------------------------------------------
    // Request phase
    // -----------------------------------------------------------------------

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest;
        // `request.url` is path-only on some runtimes; the base is a throwaway.
        const path = new URL(request.url, "http://kindling.invalid").pathname;

        if (path.startsWith("/api/auth")) {
          return yield* auth.fetch;
        }

        if (path === "/rpc") {
          return yield* yield* rpcServer;
        }

        return HttpServerResponse.text("Not Found", { status: 404 });
      }),
    };
  }).pipe(
    Effect.provide(CloudflareD1(AppDatabase)),
    // `QueryDatabase` is how Drizzle reaches D1. Providing the *binding* layer
    // (rather than, say, the HTTP-API one) is what registers the D1 binding on
    // this Worker at deploy time.
    Effect.provide(Cloudflare.D1.QueryDatabaseBinding),
  ),
) {}
