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
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Box, Button, Card, Heading, Row, Stack, Text } from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, motion, radius, space } from "~/styles/tokens.stylex";
import { useColorScheme } from "./theme";

/**
 * The mark's own ember ramp.
 *
 * Deliberately literal rather than StyleX tokens: the identical geometry also
 * ships as a standalone `public/favicon.svg`, where no stylesheet exists to
 * resolve a custom property. One hard pair of values in both places means the
 * mark can never drift between the tab and the header.
 *
 * Note these are the *logo's* orange (#FF6A00 → #FFA32B), which is brighter
 * than the UI accent in `tokens.stylex.ts`. See the note in
 * src/styles/README.md before reconciling them.
 */
const EMBER_DEEP = "#FF6A00";
const EMBER_LIGHT = "#FFA32B";

/** Stable id so the gradient resolves even with several marks on one page. */
const GRADIENT_ID = "kindling-mark-ember";

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
  mark: {
    display: "block",
    height: 26,
    width: 26,
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

/**
 * The Kindling mark: a four-pointed spark held inside a hexagon.
 *
 * Both shapes carry the same ember ramp, so the mark is one colour idea rather
 * than a container plus a contrasting fill. That is also why it needs no
 * light/dark variant — the orange holds on white and on black alike, unlike an
 * ink-based mark which has to flip.
 *
 * Keep in step with `public/favicon.svg`, which carries identical geometry.
 * Both are generated from a parametric study; adjust the parameters there
 * rather than editing these paths by hand.
 */
export function KindlingMark({ style }: { style?: StyleXStyles }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      {...stylex.props(styles.mark, style)}
    >
      <defs>
        {/* `userSpaceOnUse`, not the default object bounding box: the stroked
            hexagon and the filled star have different boxes, so a relative
            gradient would run at a different angle on each and the two shapes
            would not share one light source. */}
        <linearGradient
          id={GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          x1="12"
          y1="56"
          x2="52"
          y2="8"
        >
          <stop offset="0" stopColor={EMBER_DEEP} />
          <stop offset="1" stopColor={EMBER_LIGHT} />
        </linearGradient>
      </defs>
      <path
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="5.5"
        strokeLinejoin="round"
        d="M37.20 11.75Q32.00 8.75 26.80 11.75L17.06 17.38Q11.86 20.38 11.86 26.38L11.86 37.63Q11.86 43.63 17.06 46.63L26.80 52.25Q32.00 55.25 37.20 52.25L46.94 46.63Q52.14 43.63 52.14 37.63L52.14 26.38Q52.14 20.38 46.94 17.38Z"
      />
      <path
        fill={`url(#${GRADIENT_ID})`}
        d="M32 17Q34.31 28.7 42.5 32Q34.31 35.3 32 47Q29.69 35.3 21.5 32Q29.69 28.7 32 17Z"
      />
    </svg>
  );
}

/** The Kindling wordmark, always a link home. */
export function Wordmark() {
  return (
    <Link to="/" {...stylex.props(styles.wordmark)}>
      <KindlingMark />
      kindling
    </Link>
  );
}

/**
 * A link styled as a button.
 *
 * `to` is the router's own path union rather than a hand-written list, so
 * adding a route makes it available here automatically instead of failing to
 * compile until someone remembers to extend this type.
 */
export function ActionLink({
  children,
  to,
  variant = "primary",
}: {
  children: ReactNode;
  to: NonNullable<LinkProps["to"]>;
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
            <Link to="/docs" {...stylex.props(styles.navLink)}>
              Docs
            </Link>
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
