import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Effect from "effect/Effect";

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
