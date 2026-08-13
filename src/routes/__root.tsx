/**
 * The document shell.
 *
 * `shellComponent` owns everything outside the route tree — `<html>`, `<head>`,
 * `<body>` — and is rendered on the server and hydrated as-is. Route-level
 * `head()` output lands in `<HeadContent />`; `<Scripts />` emits the hydration
 * bundle.
 */
import {
  createRootRoute,
  ErrorComponent,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { Alert, Heading, Stack, Text } from "~/components";
import { ActionLink, Container, Page } from "~/client/chrome";
import { themeInitScript } from "~/client/theme";
import { color, font, space } from "~/styles/tokens.stylex";

// The single CSS entrypoint. StyleX appends every compiled rule to the asset
// built from this file, so it must be imported exactly once in the app.
import "~/styles/app.css";

const styles = stylex.create({
  body: {
    margin: 0,
    backgroundColor: color.backdrop,
    color: color.text,
    fontFamily: font.sans,
  },
  boundary: {
    paddingBlock: space.huge,
  },
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kindling — ship on Cloudflare, today" },
      {
        name: "description",
        content:
          "Kindling is an opinionated launchpad for products on Cloudflare: SSR, typed RPC, auth and a database, wired together and deployable in one command.",
      },
      { name: "color-scheme", content: "light dark" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: RootErrorBoundary,
  notFoundComponent: RouteNotFound,
});

function RootComponent() {
  return <Outlet />;
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // `suppressHydrationWarning` is required: the inline script below stamps the
    // dark-theme class onto <html> before React ever runs. See ~/client/theme.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Blocking, pre-paint: resolves the color scheme so dark users never
            see a white flash. Inline so it cannot be delayed by the network. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body {...stylex.props(styles.body)}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Catches anything a route throws that the route itself did not handle.
 * `ErrorComponent` prints the message (and, in dev, the stack).
 */
function RootErrorBoundary(props: ErrorComponentProps) {
  return (
    <Page>
      <Container narrow style={styles.boundary}>
        <Stack gap="lg">
          <Heading level={3} as="h1">
            Something broke
          </Heading>
          <Alert tone="danger" title="Unhandled error">
            The page could not be rendered. The details below come from the server; they are visible
            in development only.
          </Alert>
          <ErrorComponent error={props.error} />
          <Stack align="start">
            <ActionLink to="/" variant="secondary">
              Back to safety
            </ActionLink>
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
}

function RouteNotFound() {
  return (
    <Page>
      <Container narrow style={styles.boundary}>
        <Stack gap="lg">
          <Text mono size="sm" tone="muted">
            404
          </Text>
          <Heading level={2} as="h1">
            This page does not exist
          </Heading>
          <Text tone="muted">
            The link may be out of date, or the route may not have been added yet. Everything under{" "}
            <Link to="/app/dashboard">/app</Link> also requires a signed-in session.
          </Text>
          <Stack align="start">
            <ActionLink to="/">Go home</ActionLink>
          </Stack>
        </Stack>
      </Container>
    </Page>
  );
}
