import { defineConfig } from "drizzle-kit";

/**
 * Only used by the `drizzle-kit` CLI (`bun run db:generate`) for ad-hoc
 * migration generation and editor tooling.
 *
 * The deploy path does not read this file: `Drizzle.Schema` in `alchemy.run.ts`
 * drives drizzle-kit programmatically with the same schema/out/dialect, and
 * `Cloudflare.D1.Database` applies the generated SQL. Keep the three values
 * below in sync with the `Drizzle.Schema` props.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
