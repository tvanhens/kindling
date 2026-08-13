/**
 * `/v1/*` — the proxy to the public REST API on the private backend Worker.
 *
 * Identical in shape to `./api.auth.$.ts`, and for the same reason: the request
 * is forwarded **verbatim**, `env.BACKEND.fetch(request)` and nothing else.
 * Rebuilding it would strip the `Authorization` header the API-key middleware
 * reads, and change the origin Better Auth infers while verifying the key.
 *
 * The `$` splat is required — the API is a tree (`/v1/projects`,
 * `/v1/projects/:id`, `/v1/openapi.json`, `/v1/docs`) and a non-splat route
 * matches only the first segment.
 *
 * This route is deliberately *not* under `src/routes/_app/`: it is public by
 * construction, authenticated by API key rather than by session, and the
 * structural guard (see `src/routes/_app.tsx`) must not apply to it. The
 * backend's own `ApiKeyAuth` middleware is the gate — except for `/v1/docs` and
 * `/v1/openapi.json`, which are meant to be readable by anyone.
 */
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/v1/$")({
  server: {
    handlers: {
      ANY: ({ request }) => env.BACKEND.fetch(request),
    },
  },
});
