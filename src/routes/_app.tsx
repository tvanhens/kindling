/**
 * THE GUARD.
 *
 * `_app` is a pathless layout route. Every guarded page lives underneath it in
 * `src/routes/_app/`, which is what makes the guard *structural*: you cannot add
 * a page to the signed-in area without inheriting this `beforeLoad`, because the
 * only way in is to be a child of this route. Adding a page outside `_app/`
 * gives it a URL outside `/app`, which is the visible signal that it is public.
 *
 * The session is resolved **on the server during SSR**. A client-only check
 * would render the protected shell first and redirect afterwards — a visible
 * flash of content the visitor is not entitled to, and a real leak if the page
 * embeds anything from the loader.
 */
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";
import * as stylex from "@stylexjs/stylex";
import { env } from "cloudflare:workers";
import { useState } from "react";

import { authClient } from "~/client/auth";
import { Container, Page, ThemeToggle, Wordmark } from "~/client/chrome";
import { Button, Row, Stack, Text } from "~/components";
import { color, font, radius, space } from "~/styles/tokens.stylex";

/** The slice of the Better Auth user the guarded UI needs. Serializable. */
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

/**
 * Ask the backend who is signed in.
 *
 * Why a server function rather than a `fetch` from the component: this must run
 * inside the SSR pass, before any protected markup exists, and it must reach the
 * *private* backend Worker. Both are only possible server-side.
 *
 * Why `env.BACKEND.fetch` rather than `fetch("/api/auth/get-session")`: the
 * backend has no public hostname (`workersDev: false`), and a Worker calling its
 * own public origin would be a wasteful extra hop. The service binding goes
 * straight there.
 *
 * This route file also ships to the browser — it renders the app shell — so the
 * `cloudflare:workers` import at the top looks alarming. It is not: the Start
 * compiler replaces this handler body with a fetch stub in the client build, and
 * with nothing left referencing `env`, the import is tree-shaken out. Verify
 * with `grep -r "cloudflare:workers" dist/client` after a build; it finds
 * nothing.
 */
const fetchSession = createServerFn({ method: "GET" }).handler(
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

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const user = await fetchSession();
    if (user === null) {
      // `redirect` carries the intended destination so `/login` can send the
      // visitor back where they were headed. `login.tsx` validates it.
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // Everything below `_app` reads the user from route context rather than
    // re-fetching it. One session lookup per navigation.
    return { user };
  },
  component: AppLayout,
});

const styles = stylex.create({
  header: {
    backgroundColor: color.surface,
    borderBlockEndColor: color.border,
    borderBlockEndStyle: "solid",
    borderBlockEndWidth: 1,
    position: "sticky",
    zIndex: 20,
    top: 0,
  },
  navLink: {
    borderRadius: radius.md,
    paddingBlock: space.xs,
    paddingInline: space.md,
    textDecoration: "none",
    color: { default: color.textMuted, ":hover": color.text },
    fontFamily: font.sans,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
    outlineColor: color.focusRing,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
  navLinkActive: {
    backgroundColor: color.primarySubtle,
    color: color.primaryText,
  },
  main: {
    paddingBlock: space.xxl,
  },
});

/**
 * A nav link that knows whether it is current.
 *
 * The active state is computed from the router state rather than passed through
 * `Link`'s `activeProps`: `activeProps` would append a second `className`, and
 * merging two StyleX class strings on one element loses styles silently (see
 * `src/styles/README.md`).
 */
function NavLink({ active, children, to }: { active: boolean; children: string; to: AppPath }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      to={to}
      {...stylex.props(styles.navLink, active && styles.navLinkActive)}
    >
      {children}
    </Link>
  );
}

type AppPath = "/app/dashboard" | "/app/settings/profile";

function AppLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    // Clear every cached loader/beforeLoad result, or the guard would keep
    // handing back the stale session on the next navigation.
    await router.invalidate();
    await router.navigate({ to: "/login", search: {} });
  };

  return (
    <Page>
      <Stack as="header" style={styles.header}>
        <Container>
          <Row justify="between" paddingY="md" gap="md">
            <Row gap="lg">
              <Wordmark />
              <Row as="nav" aria-label="Application" gap="xxs">
                <NavLink active={pathname.startsWith("/app/dashboard")} to="/app/dashboard">
                  Dashboard
                </NavLink>
                <NavLink active={pathname.startsWith("/app/settings")} to="/app/settings/profile">
                  Settings
                </NavLink>
              </Row>
            </Row>
            <Row gap="sm">
              <Text size="sm" tone="muted" truncate>
                {user.email}
              </Text>
              <ThemeToggle />
              <Button
                loading={signingOut}
                loadingLabel="Signing out"
                onClick={() => {
                  void signOut();
                }}
                size="sm"
                variant="secondary"
              >
                Sign out
              </Button>
            </Row>
          </Row>
        </Container>
      </Stack>
      <Container style={styles.main}>
        <Outlet />
      </Container>
    </Page>
  );
}
