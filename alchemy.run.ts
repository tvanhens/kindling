import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import Backend from "./src/backend/api.ts";
import { AppDatabase } from "./src/backend/database.ts";

/**
 * The public-facing Worker: a Vite build (TanStack Start) serving the client
 * assets and SSR, with a service binding to the private {@link Backend}.
 *
 * The browser never talks to the backend directly — it posts to `/rpc` and
 * `/api/auth/*` on this origin and the routes forward to `env.BACKEND`. That
 * keeps the backend off the public internet and sidesteps CORS entirely.
 */
export class Website extends Cloudflare.Website.Vite<Website>()("Website", {
  env: { BACKEND: Backend },
  compatibility: { flags: ["enable_request_signal"] },
}) {}

/** Bindings available to the frontend Worker; see `src/env.d.ts`. */
export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
  "kindling",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Drizzle.providers()),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const database = yield* AppDatabase;
    const website = yield* Website;

    return {
      url: website.url,
      databaseId: database.databaseId,
      databaseName: database.databaseName,
    };
  }),
);
