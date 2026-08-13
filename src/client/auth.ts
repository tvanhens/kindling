/**
 * The Better Auth browser client.
 *
 * No `baseURL` is configured on purpose. The client defaults to `/api/auth` on
 * the current origin, and `src/routes/api.auth.$.ts` forwards that request —
 * unchanged — to the private backend Worker. Same origin means the session
 * cookie is first-party, so nothing here has to know the deployed hostname
 * (see the long comment in `src/backend/api.ts` for why that matters).
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/** The shape Better Auth returns in the `error` slot of every client call. */
export type AuthError = {
  readonly message?: string | undefined;
  readonly code?: string | undefined;
  readonly status?: number | undefined;
  readonly statusText?: string | undefined;
};

/**
 * Turn whatever a client call failed with into something worth showing a user.
 *
 * Better Auth mostly supplies `message`; the fallbacks exist so a network
 * failure or an unmapped status never renders an empty `Alert`.
 */
/**
 * Clamp a `?redirect=` value to a same-origin path.
 *
 * The guard puts the intended destination in the query string, which means an
 * attacker can put anything there. Only a single-leading-slash path survives;
 * `//evil.example` and `https://evil.example` do not.
 */
export function sanitizeRedirect(value: string | undefined, fallback: string): string {
  if (value === undefined || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function authErrorMessage(error: AuthError | null | undefined): string {
  if (error == null) return "Something went wrong. Please try again.";
  if (error.message !== undefined && error.message !== "") return error.message;
  if (error.statusText !== undefined && error.statusText !== "") return error.statusText;
  return "Something went wrong. Please try again.";
}
