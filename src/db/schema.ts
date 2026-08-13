import { defineRelations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Application tables owned by Drizzle.
 *
 * ## Table ownership split (read this before adding tables)
 *
 * Better Auth owns `user`, `session`, `account` and `verification`. It ships
 * its own additive, idempotent migrator which alchemy runs as a deploy-time
 * Action (see `BetterAuth({ migrate: true })`, the default). Those tables are
 * deliberately **not** declared here: if Drizzle also modelled them, every
 * `drizzle-kit generate` would emit `CREATE TABLE`/`ALTER TABLE` statements
 * for tables another migrator already manages, and the two would fight.
 *
 * The seam is therefore: Better Auth owns the auth tables, Drizzle owns the
 * app tables, and app tables reference `user.id` by a plain `text` column
 * with an index — never a declared foreign key, because the referenced table
 * does not exist in this schema's snapshot.
 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    /**
     * Better Auth `user.id`. Intentionally a plain indexed column, not a
     * Drizzle `references()` FK — see the note above on table ownership.
     */
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("projects_owner_id_idx").on(table.ownerId)],
);

export const relations = defineRelations({ projects }, () => ({}));
