/**
 * `/api/auth/*` — the proxy to Better Auth on the private backend Worker.
 *
 * The `$` splat is required: Better Auth serves a whole tree of endpoints
 * (`/api/auth/sign-in/email`, `/api/auth/get-session`, `/api/auth/reset-password/:token`,
 * ...), and a non-splat route would only match the first segment.
 *
 * As with `rpc.ts`, the request is forwarded verbatim. Better Auth derives its
 * base URL — and therefore its cookie domain and CSRF origin check — from the
 * incoming `Host`/`Origin` headers, because `alchemy.run.ts` cannot tell the
 * backend the Website's public URL without creating a binding cycle. See the
 * "Public origin" comment in `src/backend/api.ts`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      ANY: ({ request }) => env.BACKEND.fetch(request),
    },
  },
});
