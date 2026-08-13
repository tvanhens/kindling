/**
 * The one place the app asks "who is signed in?".
 *
 * This is resolved in `__root.tsx`'s `beforeLoad`, so **every** route — public
 * marketing pages included — has the answer in context. That is what lets the
 * site header show "Dashboard" instead of "Sign in" to someone who is already
 * signed in, without each page fetching for itself.
 *
 * The guard in `_app.tsx` reads the same context value rather than calling this
 * again: one session lookup per navigation, not one per layer.
 *
 * The cost, stated plainly: a public page now does a session lookup during SSR
 * even for anonymous visitors. That is one service-binding call inside the same
 * colo — cheap, but it does mean marketing pages are rendered per-visitor and
 * cannot be served from an anonymous edge cache as-is. If you later want that,
 * the move is to drop this from the root, cache the marketing routes, and let
 * the header resolve its state on the client after hydration (accepting a brief
 * flash of the signed-out header).
 *
 * Why a server function rather than a `fetch` from the component: it must run
 * inside the SSR pass, and it must reach the *private* backend Worker. Both are
 * only possible server-side.
 *
 * Why `env.BACKEND.fetch` rather than `fetch("/api/auth/get-session")`: the
 * backend has no public hostname (`workersDev: false`), and a Worker calling its
 * own public origin would be a wasteful extra hop. The service binding goes
 * straight there.
 *
 * The `cloudflare:workers` import at the top looks alarming. It is not: the
 * Start compiler replaces this handler body with a fetch stub in the client
 * build, and with nothing left referencing `env`, the import is tree-shaken out.
 * It must stay a *static* import — a dynamic `await import()` is not
 * externalized by rolldown and breaks the build.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";

/** The signed-in user, as every route sees it. `null` means anonymous. */
export type SessionUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
  readonly emailVerified: boolean;
};

type GetSessionBody = {
  readonly user?: {
    readonly id?: unknown;
    readonly name?: unknown;
    readonly email?: unknown;
    readonly image?: unknown;
    readonly emailVerified?: unknown;
  } | null;
} | null;

/** Resolve the current session, or `null`. Never throws for "not signed in". */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    // Rebuild the URL against the *public* origin, then hand the backend a
    // request that looks exactly like a browser one: same host, same cookies.
    // Better Auth reads its base URL off those headers.
    const url = new URL("/api/auth/get-session", getRequestUrl());
    const headers = new Headers();
    const cookie = getRequestHeader("cookie");
    if (cookie !== undefined) headers.set("cookie", cookie);
    headers.set("accept", "application/json");

    const response = await env.BACKEND.fetch(new Request(url, { headers }));
    if (!response.ok) return null;

    const body = (await response.json()) as GetSessionBody;
    const user = body?.user;
    if (
      user == null ||
      typeof user.id !== "string" ||
      typeof user.name !== "string" ||
      typeof user.email !== "string"
    ) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: typeof user.image === "string" ? user.image : null,
      emailVerified: user.emailVerified === true,
    };
  },
);
