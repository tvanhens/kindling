/**
 * Color scheme handling.
 *
 * StyleX themes are class names, not media queries: `darkTheme` only applies
 * where its class is present. That leaves one problem — the server cannot know
 * the visitor's `prefers-color-scheme`, so a server-rendered page would always
 * be light and then snap to dark on hydration.
 *
 * The fix is the usual one: a tiny blocking script in `<head>` resolves the
 * scheme *before first paint* and stamps the class onto `<html>`. React never
 * renders that class, so `<html>` carries `suppressHydrationWarning` (see
 * `src/routes/__root.tsx`) and React leaves the attribute alone.
 */
import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useState } from "react";

import type { ColorScheme } from "~/styles/themes";
import { darkTheme } from "~/styles/themes";

export type { ColorScheme };

/** Where the explicit user choice is remembered. Absent means "follow the OS". */
export const THEME_STORAGE_KEY = "kindling-color-scheme";

/**
 * The compiled class name(s) for the dark theme.
 *
 * `darkTheme` overrides two var groups, so this is a space-separated list and
 * every use has to split it — `classList.toggle` rejects strings with spaces.
 */
const darkClassName = stylex.props(darkTheme).className ?? "";

function applyScheme(scheme: ColorScheme): void {
  const root = document.documentElement;
  const classes = darkClassName.split(" ").filter((name) => name !== "");
  root.dataset["theme"] = scheme;
  if (scheme === "dark") {
    root.classList.add(...classes);
  } else {
    root.classList.remove(...classes);
  }
}

/**
 * The pre-hydration script, injected verbatim into `<head>`.
 *
 * It is deliberately dependency-free and wrapped in try/catch: Safari in
 * private mode throws on `localStorage`, and a broken theme must never take the
 * page down with it.
 */
export const themeInitScript = `(function(){try{
var k=${JSON.stringify(THEME_STORAGE_KEY)};
var c=${JSON.stringify(darkClassName)};
var s=localStorage.getItem(k);
var dark=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;
r.dataset.theme=dark?"dark":"light";
if(dark){r.classList.add.apply(r.classList,c.split(" ").filter(Boolean));}
}catch(e){}})();`;

/**
 * Read and toggle the current scheme.
 *
 * The initial state is `"light"` on both server and client so the first render
 * matches the SSR output; the real value is adopted in an effect by reading the
 * attribute the init script already wrote. Only the toggle button's glyph
 * depends on it, so nothing visible reflows.
 */
export function useColorScheme(): readonly [ColorScheme, () => void] {
  const [scheme, setScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    setScheme(document.documentElement.dataset["theme"] === "dark" ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    setScheme((current) => {
      const next: ColorScheme = current === "dark" ? "light" : "dark";
      applyScheme(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Storage is unavailable (private mode, blocked cookies). The choice
        // simply will not survive a reload.
      }
      return next;
    });
  }, []);

  return [scheme, toggle] as const;
}
