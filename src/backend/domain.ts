/**
 * The domain model: the entities the app is *about*, and the failures that
 * belong to them.
 *
 * This is the bottom of the stack. It knows nothing about how a caller reached
 * us — no RPC, no HTTP, no session cookie — so every transport can share it.
 *
 * Like `./rpc.ts` (which re-exports this module), it must stay free of
 * server-only imports: no `alchemy/*` values, no `better-auth`, no
 * `drizzle-orm`. `src/backend/rpc.ts` is bundled into the Website Worker, and a
 * value import of any of those there breaks that build.
 *
 * ## Why the errors live here
 *
 * `ProjectNotFound` is raised by `Projects.remove` in `./projects.ts`. It is a
 * fact about projects, not about a wire format, and *every* transport that
 * calls the service has to map it — the RPC group today, a public HttpApi
 * tomorrow. Errors a transport invents for itself stay with that transport:
 * `Unauthorized` is raised by the RPC auth middleware in `./rpc.ts` and lives
 * there, because a public API would authenticate differently (bearer token,
 * API key) and mint its own 401.
 */
import { Schema } from "effect";

/**
 * The subset of Better Auth's `user` row that is safe to hand to a caller.
 *
 * Better Auth owns the underlying table (see `src/db/schema.ts`); this class is
 * a projection of it, not a database model.
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

/** Raised when a project does not exist *or* is not owned by the caller. */
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()("ProjectNotFound", {
  id: Schema.String,
}) {}
