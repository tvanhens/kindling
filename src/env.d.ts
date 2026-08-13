import type { WebsiteEnv } from "../alchemy.run.ts";

/**
 * Types `env` from `cloudflare:workers` inside the frontend Worker with the
 * bindings declared on `Website` in `alchemy.run.ts` — notably `env.BACKEND`,
 * the service binding that `src/server/rpc.ts` and the `/api/auth/*` proxy
 * route reach the private backend Worker through.
 */
declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WebsiteEnv {}
  }
}
