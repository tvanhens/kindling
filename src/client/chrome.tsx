/**
 * Shared page chrome: the wordmark, the marketing header/footer, the auth card
 * shell and the theme toggle.
 *
 * Everything here composes `~/components`. The only hand-written styles are the
 * things the primitives deliberately do not cover: page-level max widths and a
 * link that has to *look* like a button without *being* a button.
 */
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { Link, useRouteContext } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Box, Button, Card, Heading, Row, Stack, Text } from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, motion, radius, space } from "~/styles/tokens.stylex";
import { useColorScheme } from "./theme";

const styles = stylex.create({
  page: {
    backgroundColor: color.backdrop,
    color: color.text,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },
  container: {
    marginInline: "auto",
    paddingInline: { default: space.lg, [breakpoint.md]: space.xl },
    maxWidth: 1120,
    width: "100%",
  },
  containerNarrow: {
    maxWidth: 720,
  },
  header: {
    backgroundColor: color.surface,
    borderBlockEndColor: color.border,
    borderBlockEndStyle: "solid",
    borderBlockEndWidth: 1,
    position: "sticky",
    zIndex: 20,
    top: 0,
  },
  footer: {
    borderBlockStartColor: color.border,
    borderBlockStartStyle: "solid",
    borderBlockStartWidth: 1,
    marginBlockStart: "auto",
  },
  wordmark: {
    gap: space.sm,
    textDecoration: "none",
    alignItems: "center",
    color: color.text,
    display: "inline-flex",
    fontFamily: font.sans,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    letterSpacing: font.trackingTight,
    outlineColor: color.focusRing,
    outlineOffset: 3,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
  flame: {
    borderRadius: radius.pill,
    placeItems: "center",
    backgroundColor: color.primary,
    color: color.onAccent,
    display: "grid",
    fontSize: font.sizeSm,
    height: 28,
    width: 28,
  },
  navLink: {
    borderRadius: radius.md,
    paddingBlock: space.xs,
    paddingInline: space.sm,
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
  // The one place a link is dressed as a button. It stays an <a> so marketing
  // CTAs are crawlable, middle-clickable and keyboard-navigable as links.
  actionLink: {
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    paddingInline: space.xl,
    textDecoration: "none",
    alignItems: "center",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: font.sans,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    justifyContent: "center",
    lineHeight: font.lineTight,
    outlineColor: color.focusRing,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    transitionDuration: motion.fast,
    transitionProperty: "background-color, border-color, color",
    transitionTimingFunction: motion.easeOut,
    whiteSpace: "nowrap",
    height: 48,
  },
  actionLinkPrimary: {
    borderColor: "transparent",
    backgroundColor: { default: color.primary, ":hover": color.primaryHover },
    color: color.onAccent,
  },
  actionLinkSecondary: {
    borderColor: { default: color.border, ":hover": color.borderStrong },
    backgroundColor: { default: color.surface, ":hover": color.surfaceHover },
    color: color.text,
  },
  authShell: {
    paddingBlock: space.xxxl,
    paddingInline: space.lg,
    alignItems: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "100vh",
  },
  authCard: {
    maxWidth: 420,
    width: "100%",
  },
  toggle: {
    minWidth: 40,
  },
});

/** Full-height page background. Every top-level route renders inside one. */
export function Page({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.page)}>{children}</div>;
}

/** Centered, max-width content column. */
export function Container({
  children,
  narrow = false,
  style,
}: {
  children: ReactNode;
  narrow?: boolean;
  style?: StyleXStyles;
}) {
  return (
    <div {...stylex.props(styles.container, narrow && styles.containerNarrow, style)}>
      {children}
    </div>
  );
}

/** The Kindling wordmark, always a link home. */
export function Wordmark() {
  return (
    <Link to="/" {...stylex.props(styles.wordmark)}>
      <span aria-hidden="true" {...stylex.props(styles.flame)}>
        ▲
      </span>
      Kindling
    </Link>
  );
}

/** A link styled as a button. `to` is type-checked against the route tree. */
export function ActionLink({
  children,
  to,
  variant = "primary",
}: {
  children: ReactNode;
  to: "/" | "/pricing" | "/login" | "/register" | "/app/dashboard";
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      to={to}
      {...stylex.props(
        styles.actionLink,
        variant === "primary" ? styles.actionLinkPrimary : styles.actionLinkSecondary,
      )}
    >
      {children}
    </Link>
  );
}

/** Switches between the light and dark StyleX themes. */
export function ThemeToggle() {
  const [scheme, toggle] = useColorScheme();
  return (
    <Button
      aria-label={`Switch to ${scheme === "dark" ? "light" : "dark"} theme`}
      onClick={toggle}
      size="sm"
      style={styles.toggle}
      variant="ghost"
    >
      <span aria-hidden="true">{scheme === "dark" ? "☀" : "☾"}</span>
    </Button>
  );
}

/**
 * Marketing/site header. Guarded pages get their own shell in `_app.tsx`.
 *
 * The session comes from the root route's context, which is resolved during SSR
 * for every route — public ones included. That is deliberate: inviting someone
 * who is already signed in to "Sign in" is a small thing that makes a product
 * feel broken, and resolving it on the client after hydration would swap the
 * link under the reader.
 */
export function SiteHeader() {
  const { user } = useRouteContext({ from: "__root__" });

  return (
    <Box as="header" style={styles.header}>
      <Container>
        <Row justify="between" paddingY="md">
          <Wordmark />
          <Row gap="xs">
            <Link to="/pricing" {...stylex.props(styles.navLink)}>
              Pricing
            </Link>
            {user === null ? (
              <Link to="/login" {...stylex.props(styles.navLink)}>
                Sign in
              </Link>
            ) : (
              <Link to="/app/dashboard" {...stylex.props(styles.navLink)}>
                Dashboard
              </Link>
            )}
            <ThemeToggle />
          </Row>
        </Row>
      </Container>
    </Box>
  );
}

export function SiteFooter() {
  return (
    <Box as="footer" style={styles.footer}>
      <Container>
        <Stack gap="md" paddingY="xl">
          <Row justify="between" wrap gap="md">
            <Wordmark />
            <Row gap="lg" wrap>
              <Link to="/" {...stylex.props(styles.navLink)}>
                Home
              </Link>
              <Link to="/pricing" {...stylex.props(styles.navLink)}>
                Pricing
              </Link>
              <Link to="/register" {...stylex.props(styles.navLink)}>
                Create account
              </Link>
            </Row>
          </Row>
          <Text size="sm" tone="muted">
            Kindling is a template. Replace this footer, the copy above it and the pricing table
            with your own — the plumbing underneath is what you forked it for.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

/** Marketing page frame: header, content, footer. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Page>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </Page>
  );
}

/** Centered card used by every page in the `(auth)` group. */
export function AuthLayout({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle: ReactNode;
  title: string;
}) {
  return (
    <Box background="backdrop" style={styles.authShell}>
      <Stack gap="xl" style={styles.authCard}>
        <Row justify="between">
          <Wordmark />
          <ThemeToggle />
        </Row>
        <Card padding="xl">
          <Stack gap="lg">
            <Stack gap="xs">
              <Heading level={3} as="h1">
                {title}
              </Heading>
              <Text size="sm" tone="muted">
                {subtitle}
              </Text>
            </Stack>
            {children}
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
