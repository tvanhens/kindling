/**
 * The router entry.
 *
 * TanStack Start resolves `src/router.tsx` by convention and requires it to
 * export `getRouter()`. It is called once per SSR request and once in the
 * browser, so everything request-scoped must be created *inside* it.
 */
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    // Preload on hover/focus. Route loaders reach the backend over the service
    // binding, so this is latency the user never sees.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}
