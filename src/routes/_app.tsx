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
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import { authClient } from "~/client/auth";
import { Container, Page, ThemeToggle, Wordmark } from "~/client/chrome";
import { Button, Row, Stack, Text } from "~/components";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    // The session was already resolved by the root route, so this is a pure
    // guard: one lookup per navigation, not one per layer.
    const { user } = context;
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
