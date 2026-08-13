/**
 * `/rpc` — the proxy to the private backend Worker.
 *
 * The `$` splat is not decoration. Effect's RPC client builds its request as
 * `post("")` against the configured base URL, which resolves to `/rpc/` — with
 * a trailing slash. An exact `/rpc` route does not match that, so every call
 * 404s and the client fails with "Error decoding HTTP response" while trying to
 * parse the 404 page as JSON. The splat matches `/rpc` and `/rpc/` alike.
 *
 * This route has **only** a `server` prop, so the route generator prunes it out
 * of the client route tree entirely; the `cloudflare:workers` import never
 * reaches the browser bundle.
 *
 * The original `Request` is forwarded untouched. That is load-bearing, not
 * tidiness: same URL, same `Host`, same `Cookie`. Reconstructing the request
 * (or stripping headers) would break the session lookup the RPC auth middleware
 * performs on the other side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/rpc")({
  server: {
    handlers: {
      ANY: ({ request }) => env.BACKEND.fetch(request),
    },
  },
});
