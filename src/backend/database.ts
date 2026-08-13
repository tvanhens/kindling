import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import type * as DrizzleD1 from "alchemy/Drizzle/D1";
import { Context } from "effect";
import * as Effect from "effect/Effect";
import type { relations } from "../db/schema.ts";

/**
 * The application database: one D1 instance shared by Better Auth and Drizzle.
 *
 * Two independent migrators write to it, and they must not overlap:
 *
 * - **Drizzle** owns the app tables. `Drizzle.Schema` regenerates SQL under
 *   `./migrations` whenever `src/db/schema.ts` changes, and the D1 resource
 *   applies whatever is pending, tracked in `drizzle_migrations`.
 * - **Better Auth** owns `user` / `session` / `account` / `verification`. Its
 *   migrator runs as a separate deploy-time Action registered by `BetterAuth(...)`
 *   in `api.ts`; it is additive and idempotent, and tracks nothing here.
 *
 * `migrationsDir: schema.out` is what orders the two: the D1 resource depends on
 * the schema resource's output, so migration SQL is always regenerated before it
 * is applied.
 */
export const AppDatabase = Effect.gen(function* () {
  const schema = yield* Drizzle.Schema("AppSchema", {
    schema: "./src/db/schema.ts",
    out: "./migrations",
    dialect: "sqlite",
  });

  return yield* Cloudflare.D1.Database("AppDatabase", {
    migrationsDir: schema.out,
    migrationsTable: "drizzle_migrations",
  });
});

/**
 * The Drizzle handle over {@link AppDatabase}, as the runtime sees it.
 *
 * Derived from `Drizzle.D1`'s own return type so it cannot drift: it is the
 * chainable proxy over `EffectSQLiteD1Database`, typed with this app's
 * relations.
 */
export type AppDrizzle = Effect.Success<ReturnType<typeof DrizzleD1.D1<typeof relations>>>;

/**
 * The database, as a service.
 *
 * `AppDatabase` above is the *resource* (deploy time); this is the *handle*
 * (request time). Domain services such as `./projects.ts` depend on this tag,
 * which is what lets them be written and reasoned about without knowing how the
 * Worker was wired. `./api.ts` builds the handle once in its init phase and
 * provides it with `Layer.succeed(Database, db)`.
 */
export class Database extends Context.Service<Database, AppDrizzle>()(
  "kindling/backend/Database",
) {}
