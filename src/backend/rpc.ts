/**
 * The shared RPC contract.
 *
 * This module is imported by **both** Workers — the backend that serves the
 * contract and the Website that calls it from `src/server/rpc.ts` — so it must
 * stay free of server-only imports (no `alchemy/*` values, no `better-auth`, no
 * `drizzle-orm`). The single `import type` below is erased at compile time.
 * Routes may import the types from here too; keep those imports `import type`,
 * or the Website's client bundle starts pulling the contract in.
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
 * `requiredForClient` is left `false`, so the calling client does not have to
 * provide a client-side half; the session travels in the `Cookie` header, which
 * `src/server/rpc.ts` forwards from the browser's request onto the rpc.
 */
export class AuthMiddleware extends RpcMiddleware.Service<
  AuthMiddleware,
  {
    provides: CurrentUser;
    requires: RuntimeContext;
  }
>()("kindling/backend/AuthMiddleware", { error: Unauthorized }) {}

// ---------------------------------------------------------------------------
// Payloads
//
// Named rather than inlined into `Rpc.make` so the *same* schema can validate
// the server function that fronts each mutation. `src/server/api.ts` feeds these
// to `Schema.toStandardSchemaV1`, which is what TanStack's `.validator()` wants;
// a bare `Schema.Struct` has no `~standard` property and is silently useless
// there. One schema, both gates.
// ---------------------------------------------------------------------------

/** Payload of {@link AppRpcs} `updateProfile`. */
export const UpdateProfilePayload = Schema.Struct({
  name: Schema.String,
  image: Schema.NullOr(Schema.String),
});

/** Payload of {@link AppRpcs} `createProject`. */
export const CreateProjectPayload = Schema.Struct({
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
});

/** Payload of {@link AppRpcs} `deleteProject`. */
export const DeleteProjectPayload = Schema.Struct({
  id: Schema.String,
});

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
    payload: UpdateProfilePayload,
    success: User,
  }),

  // --- projects (the CRUD pattern to copy) ---------------------------------
  Rpc.make("listProjects", { success: Schema.Array(Project) }),
  Rpc.make("createProject", {
    payload: CreateProjectPayload,
    success: Project,
  }),
  Rpc.make("deleteProject", {
    payload: DeleteProjectPayload,
    success: Schema.String,
    error: ProjectNotFound,
  }),
).middleware(AuthMiddleware) {}
