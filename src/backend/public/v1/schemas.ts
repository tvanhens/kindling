/**
 * The **public** v1 contract's data types.
 *
 * ## Why these are not `Project` / `User` from `src/backend/domain.ts`
 *
 * They look almost identical today, and that is exactly the moment to split
 * them. An internal schema changes whenever the domain does; a public schema is
 * a compatibility promise to strangers who are not in this repository and
 * cannot be asked to redeploy. Reusing the domain class would silently publish
 * every future column, and would make "rename a field" a breaking change for
 * people we have never met.
 *
 * The mapping is the point. `fromProject` below is the one place where an
 * internal shape becomes a published one:
 *
 *   - `ownerId` is **dropped**. It is always the caller — telling them their own
 *     id back is noise, and the day projects grow a second owner column the
 *     public shape does not have to move.
 *   - timestamps are published as explicit ISO-8601 **strings**, so the wire
 *     format is a decision rather than a side effect of whatever `Schema.Date`
 *     happens to encode to.
 *
 * When the domain gains a field, this file does not change until someone
 * decides it should. That is the whole argument.
 */
import * as Schema from "effect/Schema";
import type { Project } from "../../domain.ts";

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

/** A project, as v1 of the public API publishes it. */
export class ProjectResource extends Schema.Class<ProjectResource>("v1.Project")({
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  /** ISO-8601, UTC. */
  createdAt: Schema.String,
  /** ISO-8601, UTC. */
  updatedAt: Schema.String,
}) {}

/** The one explicit domain → public mapping. See the module comment. */
export const fromProject = (project: Project): ProjectResource =>
  new ProjectResource({
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  });

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/**
 * The body of `POST /v1/projects`.
 *
 * Note what is *not* here: an owner. The actor comes from the verified API key
 * and nowhere else — a body field naming a different owner would be a
 * cross-tenant write waiting to happen. Decoding failures render as `400`
 * (`HttpApiSchemaError`) automatically.
 */
export const CreateProjectBody = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()),
  description: Schema.optional(Schema.NullOr(Schema.String)),
});

// ---------------------------------------------------------------------------
// Errors
//
// Public errors are their own types too, with their HTTP status declared on the
// class. The domain's `ProjectNotFound` is mapped onto `NotFound` in the
// handlers rather than serialized directly, for the same reason the resources
// are mapped: its shape is internal.
// ---------------------------------------------------------------------------

/** 401 — no key, an unknown key, or a revoked one. */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

/** 404 — no such project *for this caller*. Missing and not-yours are one case. */
export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  { message: Schema.String },
  { httpApiStatus: 404 },
) {}
