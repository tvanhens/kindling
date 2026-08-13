import { CloudflareD1 } from "@alchemy.run/better-auth/CloudflareD1";
import * as Cloudflare from "alchemy/Cloudflare";
import * as DrizzleD1 from "alchemy/Drizzle/D1";
import type { RuntimeContext } from "alchemy/RuntimeContext";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";
import * as RpcServer from "effect/unstable/rpc/RpcServer";
import { relations } from "../db/schema.ts";
import { Auth, makeAuth } from "./auth.ts";
import { AppDatabase, Database } from "./database.ts";
import { Profile } from "./profile.ts";
import { Projects } from "./projects.ts";
import { AppRpcs, AuthMiddleware, CurrentUser, Unauthorized, User } from "./rpc.ts";

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
 * configuration in `./auth.ts` work without knowing the public origin at
 * deploy time.
 *
 * ## Layering
 *
 * This file is the **composition root and the RPC transport**, nothing else:
 *
 *   ./projects.ts, ./profile.ts   domain services — the actual logic
 *      ^                          take their actor as an argument
 *      |
 *   AppRpcs handlers (here)       internal transport; `yield* CurrentUser`,
 *                                 then call the service
 *
 * Adding a public REST/OpenAPI surface later is a third branch in the `fetch`
 * dispatch below, provided the same service layers — not a second copy of the
 * logic. See the "Adding a public API" section in AGENTS.md.
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

    // The Better Auth configuration itself lives in `./auth.ts`, because both a
    // transport (the middleware below) and a domain service (`./profile.ts`)
    // need this instance — and the latter needs its *type* to declare a tag.
    const auth = yield* makeAuth();

    const d1 = yield* Cloudflare.D1.QueryDatabase(AppDatabase);
    const db = yield* DrizzleD1.D1(d1, { relations });

    /**
     * The two init-phase values, published as services.
     *
     * `Projects.layer` and `Profile.layer` declare what they need (`Database`,
     * `Auth`) and nothing about how this Worker was built; this is the single
     * place the two halves meet. A future public-API branch provides the very
     * same `ServicesLayer`.
     */
    const ServicesLayer = Layer.mergeAll(Projects.layer, Profile.layer).pipe(
      Layer.provide([Layer.succeed(Database, db), Layer.succeed(Auth, auth)]),
    );

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
    //
    // Adapters, not logic. Each one does two things and stops: resolve the
    // actor (`yield* CurrentUser`, put there by the middleware above) and hand
    // it to a domain service. Nothing here knows any SQL.
    //
    // Identity is *never* read from a payload — `CurrentUser` is derived from
    // the session cookie, and it is the only source of the `ownerId` the
    // services scope their queries by.
    // -----------------------------------------------------------------------

    const HandlersLayer = AppRpcs.toLayer(
      Effect.gen(function* () {
        const projects = yield* Projects;
        const profile = yield* Profile;

        return {
          me: () => CurrentUser,

          updateProfile: Effect.fn("updateProfile")(function* (payload, { headers }) {
            // `headers` is Effect's immutable record; Better Auth wants the DOM
            // type. The credential *is* the actor for a profile write — see the
            // note at the top of `./profile.ts`.
            return yield* profile.update(new Headers({ ...headers }), payload);
          }),

          // --- the CRUD pattern to copy -------------------------------------

          listProjects: Effect.fn("listProjects")(function* () {
            const user = yield* CurrentUser;
            return yield* projects.list(user.id);
          }),

          createProject: Effect.fn("createProject")(function* (payload) {
            const user = yield* CurrentUser;
            return yield* projects.create(user.id, payload);
          }),

          deleteProject: Effect.fn("deleteProject")(function* ({ id }) {
            const user = yield* CurrentUser;
            return yield* projects.remove(user.id, id);
          }),
        };
      }),
    );

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
     * handler, a middleware layer or a *domain service* layer is missing, this
     * line stops compiling. Drop `ServicesLayer` below and see for yourself —
     * `Projects` and `Profile` show up in the requirement channel immediately.
     */
    const rpcServer: Effect.Effect<
      Effect.Effect<HttpServerResponse.HttpServerResponse, never, Scope.Scope | HttpServerRequest>,
      never,
      Scope.Scope | RuntimeContext
    > = RpcServer.toHttpEffect(AppRpcs).pipe(
      Effect.provide(
        Layer.mergeAll(
          HandlersLayer.pipe(Layer.provide(ServicesLayer)),
          AuthMiddlewareLayer,
          RpcSerialization.layerJson,
        ),
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

        // `/rpc/` as well as `/rpc`: Effect's RPC client issues `post("")`
        // against the configured base URL, and `HttpClientRequest.prependUrl`
        // joins the two segments with a slash, so the request that actually
        // leaves `src/server/rpc.ts` is `POST /rpc/`. Accepting both here is
        // the whole fix — the alternative is rewriting the URL back on the
        // client, which is where the old trailing-slash hack lived.
        if (path === "/rpc" || path === "/rpc/") {
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
