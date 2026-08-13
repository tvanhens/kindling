import type { WebsiteEnv } from "../alchemy.run.ts";

/**
 * Types `env` from `cloudflare:workers` inside the frontend Worker with the
 * bindings declared on `Website` in `alchemy.run.ts` — notably `env.BACKEND`,
 * the service binding the `/rpc` and `/api/auth/*` routes forward to.
 */
declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WebsiteEnv {}
  }
}
