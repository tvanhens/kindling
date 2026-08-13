/**
 * The Better Auth instance: its configuration, and the Context tag that hands
 * it to domain services.
 *
 * This module is **server-only** — it pulls in `@alchemy.run/better-auth`, so
 * nothing the Website bundles may import it.
 *
 * Why the configuration lives here rather than inline in `./api.ts`: two things
 * need the instance now — the RPC auth middleware (a transport concern, in
 * `./api.ts`) and the profile service (a domain concern, in `./profile.ts`) —
 * and the second one needs the instance's *type* to declare its Context tag.
 * `Auth` below is that tag; `makeAuth()` is still yielded exactly once, in the
 * Worker's init phase, and provided to the tag from there.
 */
import { BetterAuth } from "@alchemy.run/better-auth";
import { Context } from "effect";
import type * as Effect from "effect/Effect";

/**
 * Describe the Better Auth instance.
 *
 * A function, not a top-level constant: it must stay lazy so the Effect is
 * built inside the Worker's init phase, where the `Database` platform layer
 * (`CloudflareD1(AppDatabase)` in `./api.ts`) is provided.
 */
export const makeAuth = () =>
  BetterAuth({
    basePath: "/api/auth",

    // ── Public origin ────────────────────────────────────────────────────
    // `baseURL` and `trustedOrigins` are deliberately left unset.
    //
    // They would have to be the *Website's* origin, but the Website binds
    // this Worker — a dependency cycle. Alchemy can express such cycles
    // (https://alchemy.run/infrastructure-as-effects/circular-bindings) by
    // splitting a Worker's Tag from its `.make()` implementation, but that
    // escape hatch does not apply here: `Cloudflare.Website.Vite` has no
    // `.make()` form to split, and threading the URL back in the other
    // direction would put the whole stack module into the Worker bundle.
    //
    // Instead we lean on the property described in `./api.ts`: the Website
    // proxies the browser's original request unchanged, so Better Auth derives
    // the base URL from the incoming `Host`/`X-Forwarded-*` headers and
    // defaults `trustedOrigins` to it. Its CSRF check still compares the
    // `Origin` header against that same derived origin, so a cross-site POST is
    // rejected exactly as it would be with a hardcoded value.
    //
    // If you later serve auth from a *second* origin (a native app, a
    // marketing domain), set `trustedOrigins` here to an explicit list.

    emailAndPassword: {
      enabled: true,
      // Flip to `true` once you have wired a real email provider below.
      requireEmailVerification: false,

      // TODO(email): send a real email.
      // Replace this stub with your provider of choice — Cloudflare Email
      // Sending via a `send_email` binding, Resend, Postmark, SES, ... Add the
      // binding/secret to the Worker's props in `./api.ts` and call it from
      // here. Until then the link is logged so a fresh fork is runnable
      // offline.
      sendResetPassword: async ({ user, url }) => {
        console.log(`[auth] password reset for ${user.email}: ${url}`);
      },
    },

    emailVerification: {
      sendOnSignUp: false,

      // TODO(email): same as above — this is the second (and last) place a
      // real email provider needs to be wired in.
      sendVerificationEmail: async ({ user, url }) => {
        console.log(`[auth] verify email for ${user.email}: ${url}`);
      },
    },
  });

/** The configured Better Auth instance, with plugin/session inference intact. */
export type AppAuth = Effect.Success<ReturnType<typeof makeAuth>>;

/**
 * The Better Auth instance, as a service.
 *
 * Provided in `./api.ts` with `Layer.succeed(Auth, auth)` from the init-phase
 * value. Domain services depend on *this*, never on a live request.
 */
export class Auth extends Context.Service<Auth, AppAuth>()("kindling/backend/Auth") {}
