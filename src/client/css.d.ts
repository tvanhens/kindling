/**
 * Side-effect CSS imports.
 *
 * `src/routes/__root.tsx` imports `~/styles/app.css` to pull the StyleX
 * entrypoint into the graph. Vite understands that; `tsc` needs to be told the
 * module exists. (Vite ships `vite/client` types for this, but adding them to
 * `tsconfig.json`'s `types` array would drop `@cloudflare/workers-types` from
 * the default include, so a one-line declaration is the smaller change.)
 */
declare module "*.css";
