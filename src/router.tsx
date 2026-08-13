/**
 * The router entry.
 *
 * TanStack Start resolves `src/router.tsx` by convention and requires it to
 * export `getRouter()`. It is called once per SSR request and once in the
 * browser, so everything request-scoped must be created *inside* it.
 */
import { RegistryProvider } from "@effect/atom-react";
import { createRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { routeTree } from "./routeTree.gen";

/**
 * One Atom registry per router instance.
 *
 * `RegistryProvider` builds the registry in state, so each SSR render gets a
 * fresh one. Without it the atom hooks fall back to a module-global registry —
 * fine in the browser, a cross-request cache leak on the server.
 *
 * `Wrap` must render no DOM of its own, or hydration mismatches.
 */
function Wrap({ children }: { children: ReactNode }) {
  return <RegistryProvider>{children}</RegistryProvider>;
}

export function getRouter() {
  return createRouter({
    routeTree,
    // Preload on hover/focus. Route loaders here are cheap (the guard's session
    // check), so this is latency the user never sees.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    Wrap,
  });
}
