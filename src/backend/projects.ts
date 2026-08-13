/**
 * The `Projects` domain service — the CRUD pattern to copy.
 *
 * ## The one rule that makes this reusable
 *
 * **The actor is an argument.** Every method takes `ownerId` explicitly; none
 * of them reaches for `CurrentUser`, `HttpServerRequest`, or anything else a
 * transport happens to have lying around. `CurrentUser` is provided by the RPC
 * auth middleware, so a service that yielded it would only ever work over RPC.
 * The public HttpApi in `./public/v1/` has no such tag — it authenticates with
 * an API key — but it resolves a user id and calls `projects.list(id)` just as
 * well. That is the whole payoff.
 *
 * The consequence is that *the caller* is responsible for proving who the actor
 * is. In `./api.ts` that is one line per handler (`yield* CurrentUser`), and it
 * is the only place identity is derived. Never accept an owner id from a
 * payload.
 */
import { and, eq } from "drizzle-orm";
import type { RuntimeContext } from "alchemy/RuntimeContext";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { projects } from "../db/schema.ts";
import { Database } from "./database.ts";
import { Project, ProjectNotFound } from "./domain.ts";

/** Everything needed to create a project, minus the owner. */
export interface CreateProject {
  readonly name: string;
  readonly description: string | null;
}

export class Projects extends Context.Service<
  Projects,
  {
    /** Every project owned by `ownerId`, oldest first. */
    readonly list: (
      ownerId: string,
    ) => Effect.Effect<ReadonlyArray<Project>, never, RuntimeContext>;

    /**
     * One of `ownerId`'s projects.
     *
     * Added for the public API's `GET /v1/projects/:id`; it is a service
     * method rather than a query in the handler because that is where the
     * tenant scoping lives. The RPC transport is free to use it too.
     */
    readonly get: (
      ownerId: string,
      id: string,
    ) => Effect.Effect<Project, ProjectNotFound, RuntimeContext>;

    /** Create a project owned by `ownerId`. */
    readonly create: (
      ownerId: string,
      input: CreateProject,
    ) => Effect.Effect<Project, never, RuntimeContext>;

    /** Delete one of `ownerId`'s projects, returning its id. */
    readonly remove: (
      ownerId: string,
      id: string,
    ) => Effect.Effect<string, ProjectNotFound, RuntimeContext>;
  }
>()("kindling/backend/Projects") {
  /**
   * Effect 4 has no generated `.Default` layer and no `dependencies` option —
   * the layer is written out by hand, and its requirement (`Database`) is
   * satisfied by whoever composes it. `./api.ts` does that once.
   */
  static readonly layer: Layer.Layer<Projects, never, Database> = Layer.effect(
    Projects,
    Effect.gen(function* () {
      const db = yield* Database;

      // --- tenant scoping -------------------------------------------------
      //
      // Every query below is scoped by `ownerId`. Keep that filter in the SQL
      // itself (not in a post-filter, not in a helper that a future method
      // might forget to call) — it is the only thing standing between one
      // tenant's rows and another's.

      const list = Effect.fn("Projects.list")(function* (ownerId: string) {
        const rows = yield* db
          .select()
          .from(projects)
          .where(eq(projects.ownerId, ownerId))
          .orderBy(projects.createdAt);
        return rows.map((row) => new Project(row));
      }, Effect.orDie);

      const get = Effect.fn("Projects.get")(function* (ownerId: string, id: string) {
        // `and(eq(id), eq(ownerId))` again: another tenant's project is
        // indistinguishable from one that does not exist.
        const [row] = yield* db
          .select()
          .from(projects)
          .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
          .limit(1)
          .pipe(Effect.orDie);

        if (row === undefined) {
          return yield* new ProjectNotFound({ id });
        }
        return new Project(row);
      });

      const create = Effect.fn("Projects.create")(function* (
        ownerId: string,
        input: CreateProject,
      ) {
        const now = DateTime.toDate(yield* DateTime.now);

        const [row] = yield* db
          .insert(projects)
          .values({
            id: crypto.randomUUID(),
            ownerId,
            name: input.name,
            description: input.description,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (row === undefined) {
          return yield* Effect.die(new Error("insert returned no row"));
        }
        return new Project(row);
      }, Effect.orDie);

      const remove = Effect.fn("Projects.remove")(function* (ownerId: string, id: string) {
        // `and(eq(id), eq(ownerId))` makes "not found" and "not yours"
        // indistinguishable to the caller — deliberately.
        const [row] = yield* db
          .delete(projects)
          .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
          .returning()
          .pipe(Effect.orDie);

        if (row === undefined) {
          return yield* new ProjectNotFound({ id });
        }
        return row.id;
      });

      return Projects.of({ list, get, create, remove });
    }),
  );
}
