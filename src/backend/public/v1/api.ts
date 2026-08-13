/**
 * The public REST contract, v1 — *descriptions only*.
 *
 * This module says what the API looks like: paths, schemas, errors, and the
 * identity of the auth middleware. It holds no implementation, exactly like
 * `src/backend/rpc.ts` holds no handlers; the implementations are in
 * `./handlers.ts` and are composed in `src/backend/api.ts`.
 *
 * ## Versioned from the first endpoint
 *
 * `/v1` is in the path itself (`.prefix("/v1/projects")`), not bolted on by the
 * mount point. Adding `/v2` later is then routine — a second `HttpApi` served
 * from the same dispatch — whereas retrofitting a version onto unversioned URLs
 * is a migration for everyone who ever called us.
 *
 * ## Auth is a key, never a cookie
 *
 * The session cookie belongs to the browser. Public callers present a Better
 * Auth API key (see the `apiKey()` plugin in `src/backend/auth.ts`), declared
 * here as `HttpApiSecurity.apiKey` so it shows up in the generated OpenAPI
 * document, and enforced by {@link ApiKeyAuth} — the public equivalent of
 * `AuthMiddleware` in `src/backend/rpc.ts`.
 */
import type { RuntimeContext } from "alchemy/RuntimeContext";
import * as Context from "effect/Context";
import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from "effect/unstable/httpapi";
import { CreateProjectBody, NotFound, ProjectResource, Unauthorized } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * The caller, as resolved from the presented API key.
 *
 * A user id and nothing else: that is all a domain service needs, and it is the
 * only thing the transport is entitled to assert. Handlers `yield* CurrentActor`
 * and pass `actor.userId` on — identity is never read from a payload.
 */
export class CurrentActor extends Context.Service<CurrentActor, { readonly userId: string }>()(
  "kindling/backend/public/v1/CurrentActor",
) {}

/**
 * Resolves `Authorization: <key>` to a {@link CurrentActor}, or fails 401.
 *
 * This is only the middleware's *identity*; `ApiKeyAuthLayer` in `./handlers.ts`
 * implements it against Better Auth. `requires: RuntimeContext` is how the
 * implementation gets to reach D1 — verifying a key is a database read, and
 * alchemy's runtime context only exists while a request is in flight.
 *
 * `requiredForClient` is left `false`: this API is consumed with curl and
 * generated clients that set the header themselves.
 */
export class ApiKeyAuth extends HttpApiMiddleware.Service<
  ApiKeyAuth,
  {
    provides: CurrentActor;
    requires: RuntimeContext;
  }
>()("kindling/backend/public/v1/ApiKeyAuth", {
  security: {
    // `key`/`in` describe where the credential is read from *and* what the
    // OpenAPI security scheme says. The header is `authorization`; a leading
    // `Bearer ` is tolerated by the implementation.
    apiKey: HttpApiSecurity.apiKey({ key: "authorization", in: "header" }),
  },
  // A single error type, and that is a limitation rather than a design choice.
  // A spent quota deserves 429, not 401 — but in effect 4.0.0-rc.108
  // `httpApiStatus` is an annotation on a schema, and a `Schema.Union` carries
  // none of its own, so declaring `Union([Unauthorized, RateLimited])` here
  // makes *every* middleware failure a 500. Verified, not assumed.
  //
  // So the status stays 401 and the distinction is carried in the message (see
  // the middleware in ./handlers.ts). That is the part that actually misled
  // callers: being told an in-quota credential is "invalid" sends them off to
  // rotate a key that was never the problem.
  error: Unauthorized,
}) {}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** Projects, as strangers see them. */
export class ProjectsApiGroup extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: Schema.Array(ProjectResource),
    }),
    HttpApiEndpoint.post("create", "/", {
      payload: CreateProjectBody,
      success: ProjectResource,
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: Schema.Struct({ id: Schema.String }),
      success: ProjectResource,
      error: NotFound,
    }),
    HttpApiEndpoint.delete("delete", "/:id", {
      params: Schema.Struct({ id: Schema.String }),
      success: HttpApiSchema.NoContent,
      error: NotFound,
    }),
  )
  .middleware(ApiKeyAuth)
  .prefix("/v1/projects")
  .annotateMerge(
    OpenApi.annotations({
      title: "Projects",
      description: "Create, read and delete the projects owned by the presented API key.",
    }),
  ) {}

// ---------------------------------------------------------------------------
// The API
// ---------------------------------------------------------------------------

export class PublicApi extends HttpApi.make("kindling-v1")
  .add(ProjectsApiGroup)
  .annotateMerge(
    OpenApi.annotations({
      title: "Kindling API",
      version: "1.0.0",
      description:
        "The public API. Authenticate with an API key minted at /app/settings/api-keys and sent as the `Authorization` header.",
    }),
  ) {}
