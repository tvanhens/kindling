import path from "node:path";
import { fileURLToPath } from "node:url";

import stylex from "@stylexjs/unplugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  plugins: [
    // StyleX MUST come before @vitejs/plugin-react. Its transform runs with
    // `enforce: 'pre'`, and ordering it after the React plugin breaks Fast
    // Refresh boundary detection.
    stylex.vite({
      // StyleX resolves `*.stylex.ts` imports itself, with its own resolver --
      // it does not see Vite's `resolve.alias`. Without these two options every
      // `import { color } from "~/styles/tokens.stylex"` fails the build with
      // "Could not resolve the path to the imported file".
      aliases: { "~/*": [path.join(rootDir, "src", "*")] },
      unstable_moduleResolution: { type: "commonJS", rootDir },
      // Emit rules into @layer blocks so the reset in src/styles/app.css always
      // sorts below component styles.
      useCSSLayers: true,
      // Readable, source-derived class names while developing.
      enableDevClassNames: isDev,
      // Never ship the runtime style injector: CSS is extracted at build time
      // and appended to the bundle's CSS asset.
      runtimeInjection: false,
    }),
    // Alchemy's Cloudflare.Website.Vite appends its own Cloudflare plugin.
    // Do NOT add @cloudflare/vite-plugin here -- the two are incompatible.
    tanstackStart(),
    react(),
  ],
  resolve: {
    alias: { "~": path.join(rootDir, "src") },
  },
});
