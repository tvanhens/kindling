/**
 * The settings layout: a heading and the sub-navigation shared by every
 * settings page.
 *
 * It is a *layout* route (`settings.tsx` alongside the `settings/` directory),
 * so adding a page means adding one file under `settings/` and one entry to
 * {@link tabs} — the nav cannot drift out of sync with the pages by being
 * copy-pasted into each of them.
 *
 * It sits under `src/routes/_app/`, so it inherits THE GUARD in
 * `src/routes/_app.tsx` like every other signed-in page. Nothing auth-related
 * happens here.
 */
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";

import { Heading, Row, Stack, Text } from "~/components";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/_app/app/settings")({
  component: SettingsLayout,
});

const tabs = [
  { label: "Profile", to: "/app/settings/profile" },
  { label: "API keys", to: "/app/settings/api-keys" },
] as const;

const styles = stylex.create({
  tab: {
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
  tabActive: {
    backgroundColor: color.primarySubtle,
    color: color.primaryText,
  },
});

function SettingsLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Stack gap="xxl">
      <Stack gap="lg">
        <Stack gap="xs">
          <Heading level={3} as="h1">
            Settings
          </Heading>
          <Text tone="muted">Your account, and the keys that speak for it.</Text>
        </Stack>
        <Row as="nav" aria-label="Settings" gap="xxs">
          {tabs.map((tab) => (
            // The active class is computed here rather than via `Link`'s
            // `activeProps`, which would append a second className — merging
            // two StyleX class strings on one element loses styles silently.
            // See `src/styles/README.md`.
            <Link
              key={tab.to}
              aria-current={pathname === tab.to ? "page" : undefined}
              to={tab.to}
              {...stylex.props(styles.tab, pathname === tab.to && styles.tabActive)}
            >
              {tab.label}
            </Link>
          ))}
        </Row>
      </Stack>
      <Outlet />
    </Stack>
  );
}
