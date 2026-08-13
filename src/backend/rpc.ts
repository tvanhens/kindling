/**
 * The shared RPC contract.
 *
 * This module is imported by **both** the Worker and the browser bundle, so it
 * must stay free of server-only imports (no `alchemy/*` values, no `better-auth`,
 * no `drizzle-orm`). The single `import type` below is erased at compile time.
 *
 * Everything here is a description: schemas, error types, the middleware
 * *identity*. Implementations live in `src/backend/api.ts`.
 */
import { Context, Schema } from "effect";
import { Rpc, RpcGroup, RpcMiddleware } from "effect/unstable/rpc";

// Type-only: the auth middleware reaches the database through the Worker's
// runtime context, so it must declare that requirement. Erased at build time —
// no alchemy code reaches the browser bundle.
import type { RuntimeContext } from "alchemy/RuntimeContext";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/**
 * The subset of Better Auth's `user` row that is safe to hand to the browser.
 *
 * Better Auth owns the underlying table (see `src/db/schema.ts`); this class is
 * a projection of it onto the wire, not a database model.
 */
export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
}) {}

/** The example domain entity. Copy this shape for your own entities. */
export class Project extends Schema.Class<Project>("Project")({
  id: Schema.String,
  ownerId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
}) {}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Raised by {@link AuthMiddleware} when there is no valid session. */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {
  message: Schema.String,
}) {}

/** Raised when a project does not exist *or* is not owned by the caller. */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()("ProjectNotFound", {
  id: Schema.String,
}) {}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

/**
 * The authenticated user for the current RPC.
 *
 * Handlers `yield* CurrentUser` instead of taking a user id in the payload —
 * identity is never client-supplied.
 */
export class CurrentUser extends Context.Service<CurrentUser, User>()(
  "kindling/backend/CurrentUser",
) {}

/**
 * Resolves the session from the request headers and provides {@link CurrentUser}
 * to every rpc in {@link AppRpcs}.
 *
 * This is only the *identity* of the middleware — `RpcMiddleware.Service` mints
 * a Context tag. The implementation (which needs the Better Auth instance) is
 * `AuthMiddlewareLayer` in `src/backend/api.ts`.
 *
 * `requiredForClient` is left `false`, so the browser client does not have to
 * provide a client-side half; the session travels in the session cookie that
 * the browser sends with the `/rpc` request automatically.
 */
export class AuthMiddleware extends RpcMiddleware.Service<
  AuthMiddleware,
  {
    provides: CurrentUser;
    requires: RuntimeContext;
  }
>()("kindling/backend/AuthMiddleware", { error: Unauthorized }) {}

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

/**
 * Every procedure in this group is guarded: `.middleware(AuthMiddleware)`
 * applies to all rpcs added *before* the call, so add public procedures in a
 * separate group and `.merge()` them rather than appending them here.
 */
export class AppRpcs extends RpcGroup.make(
  // --- profile -------------------------------------------------------------
  Rpc.make("me", { success: User }),
  Rpc.make("updateProfile", {
    payload: {
      name: Schema.String,
      image: Schema.NullOr(Schema.String),
    },
    success: User,
  }),

  // --- projects (the CRUD pattern to copy) ---------------------------------
  Rpc.make("listProjects", { success: Schema.Array(Project) }),
  Rpc.make("createProject", {
    payload: {
      name: Schema.String,
      description: Schema.NullOr(Schema.String),
    },
    success: Project,
  }),
  Rpc.make("deleteProject", {
    payload: { id: Schema.String },
    success: Schema.String,
    error: ProjectNotFound,
  }),
).middleware(AuthMiddleware) {}
