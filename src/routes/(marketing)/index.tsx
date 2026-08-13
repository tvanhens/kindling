import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";

import { ActionLink, Container, MarketingLayout } from "~/client/chrome";
import { Card, Heading, Row, Stack, Text } from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/(marketing)/")({
  head: () => ({
    meta: [
      { title: "Kindling — a Cloudflare application template" },
      {
        name: "description",
        content:
          "A Cloudflare template with server rendering, session authentication, a D1 database, a typed internal API and a documented public REST API.",
      },
    ],
  }),
  component: HomePage,
});

const styles = stylex.create({
  hero: {
    paddingBlock: { default: space.xxxl, [breakpoint.md]: space.huge },
  },
  heroCopy: {
    maxWidth: 720,
  },
  eyebrow: {
    borderColor: color.primaryBorder,
    borderRadius: radius.pill,
    borderStyle: "solid",
    borderWidth: 1,
    paddingBlock: space.xxs,
    paddingInline: space.md,
    backgroundColor: color.primarySubtle,
    color: color.primaryText,
    fontFamily: font.sans,
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  terminal: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: "solid",
    borderWidth: 1,
    paddingBlock: space.md,
    paddingInline: space.lg,
    backgroundColor: color.surfaceSunken,
    color: color.text,
    fontFamily: font.mono,
    fontSize: font.sizeSm,
    overflowX: "auto",
  },
  prompt: {
    color: color.textSubtle,
    userSelect: "none",
  },
  section: {
    paddingBlock: { default: space.xxxl, [breakpoint.md]: space.huge },
  },
  sectionAlt: {
    borderBlockStyle: "solid",
    backgroundColor: color.surface,
    borderBlockColor: color.border,
    borderBlockWidth: 1,
  },
  grid: {
    gap: space.lg,
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoint.sm]: "repeat(2, minmax(0, 1fr))",
      [breakpoint.lg]: "repeat(3, minmax(0, 1fr))",
    },
  },
  steps: {
    gap: space.lg,
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoint.md]: "repeat(3, minmax(0, 1fr))" },
  },
  stepNumber: {
    borderRadius: radius.pill,
    placeItems: "center",
    backgroundColor: color.primary,
    color: color.onAccent,
    display: "grid",
    fontFamily: font.mono,
    fontSize: font.sizeSm,
    height: 32,
    width: 32,
  },
  apiLayout: {
    gap: space.xxl,
    alignItems: "center",
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoint.lg]: "1fr 1fr" },
  },
  apiTerminal: {
    lineHeight: font.lineRelaxed,
  },
  indent: {
    paddingInlineStart: space.lg,
  },
  response: {
    color: color.textSubtle,
  },
  tick: {
    color: color.primaryText,
    fontFamily: font.mono,
    fontSize: font.sizeSm,
    lineHeight: font.lineRelaxed,
  },
  ctaBand: {
    borderColor: color.border,
    borderRadius: radius.xl,
    borderStyle: "solid",
    borderWidth: 1,
    paddingBlock: space.xxl,
    paddingInline: space.xl,
    backgroundColor: color.surface,
    textAlign: "center",
  },
});

const features = [
  {
    title: "Two Workers, one origin",
    body: "A public SSR Worker and a private backend Worker, connected by a service binding. The browser only calls your own origin, so session cookies stay first-party and there is no CORS configuration to maintain.",
  },
  {
    title: "One domain, two transports",
    body: "Business logic lives in services that are independent of any transport. The internal RPC contract and the public REST API are both adapters over those services, so a rule written once applies to both.",
  },
  {
    title: "Session authentication",
    body: "Better Auth with email and password, stored in D1. Sign-up, sign-in, sign-out, password reset and profile management are implemented.",
  },
  {
    title: "Protected routes",
    body: "Protected pages sit under one layout route that resolves the session during server rendering. Any page added to the signed-in area inherits the check.",
  },
  {
    title: "A design system",
    body: "StyleX compiles styles at build time: no runtime cost, no class collisions, themeable tokens, and primitives that handle focus states and label association.",
  },
  {
    title: "Infrastructure as code",
    body: "Alchemy defines the Workers, the D1 database and their bindings in TypeScript alongside the application code. One command previews changes, another applies them.",
  },
] as const;

const apiPoints = [
  "Keys are created and revoked in account settings. They are hashed at rest and shown once, at creation.",
  "Public response types are declared separately from internal ones, so changes to the domain do not alter the published contract.",
  "Every query is scoped to the key owner in SQL. A request for another account's record returns 404.",
] as const;

const steps = [
  {
    title: "Fork it",
    body: "Clone the repository and install. The dependency list is short and every entry has a stated purpose.",
  },
  {
    title: "Rename the domain",
    body: "Projects is the example entity: one table, one RPC group, one page. Use it as the pattern for your own.",
  },
  {
    title: "Deploy",
    body: "bun run deploy provisions the database, applies migrations, builds the client and deploys both Workers.",
  },
] as const;

function HomePage() {
  // Resolved by the root route during SSR, so the signed-in variant is in the
  // first byte of HTML rather than swapped in after hydration.
  const { user } = useRouteContext({ from: "__root__" });

  return (
    <MarketingLayout>
      <Container style={styles.hero}>
        <Stack gap="xl" style={styles.heroCopy}>
          <Row>
            <span {...stylex.props(styles.eyebrow)}>Cloudflare launchpad</span>
          </Row>
          <Heading level={1} as="h1">
            Auth, a database and a typed API on Cloudflare.
          </Heading>
          <Text size="lg" tone="muted">
            A template for building applications on Cloudflare. It includes server rendering,
            session authentication, a D1 database, a typed internal API and a documented public one.
            Deploy it with a single command.
          </Text>
          <Row gap="md" wrap>
            {user === null ? (
              <ActionLink to="/register">Start building</ActionLink>
            ) : (
              <ActionLink to="/app/dashboard">Go to your dashboard</ActionLink>
            )}
            <ActionLink to="/pricing" variant="secondary">
              See pricing
            </ActionLink>
          </Row>
          <div {...stylex.props(styles.terminal)}>
            <span aria-hidden="true" {...stylex.props(styles.prompt)}>
              ${" "}
            </span>
            bun install &amp;&amp; bun run deploy
          </div>
        </Stack>
      </Container>

      <div {...stylex.props(styles.sectionAlt)}>
        <Container style={styles.section}>
          <Stack gap="xxl">
            <Stack gap="sm">
              <Heading level={2}>What is included</Heading>
              <Text size="lg" tone="muted">
                Six pieces of setup that are already done.
              </Text>
            </Stack>
            <div {...stylex.props(styles.grid)}>
              {features.map((feature) => (
                <Card key={feature.title} elevation="none" padding="xl">
                  <Stack gap="sm">
                    <Heading level={5} as="h3">
                      {feature.title}
                    </Heading>
                    <Text size="sm" tone="muted">
                      {feature.body}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </div>
          </Stack>
        </Container>
      </div>

      <Container style={styles.section}>
        <div {...stylex.props(styles.apiLayout)}>
          <Stack gap="lg">
            <Heading level={2}>A documented REST API</Heading>
            <Text size="lg" tone="muted">
              The <code>/v1</code> API is available from the first deploy. It authenticates with API
              keys, applies a per-key rate limit, and publishes an OpenAPI 3.1 document generated
              from the same contract the handlers implement.
            </Text>
            <Stack gap="sm">
              {apiPoints.map((point) => (
                <Row key={point} gap="sm" align="start">
                  <span aria-hidden="true" {...stylex.props(styles.tick)}>
                    →
                  </span>
                  <Text size="sm" tone="muted">
                    {point}
                  </Text>
                </Row>
              ))}
            </Stack>
            <Row gap="md" wrap>
              <ActionLink to="/docs">Read the API reference</ActionLink>
            </Row>
          </Stack>

          <div {...stylex.props(styles.terminal, styles.apiTerminal)}>
            <div>
              <span aria-hidden="true" {...stylex.props(styles.prompt)}>
                ${" "}
              </span>
              curl -H &quot;Authorization: $KINDLING_KEY&quot; \
            </div>
            <div {...stylex.props(styles.indent)}>https://your-app.workers.dev/v1/projects</div>
            <div {...stylex.props(styles.response)}>
              {`[{"id":"9ada60e3…","name":"First Project",`}
            </div>
            <div {...stylex.props(styles.response)}>
              {`  "createdAt":"2026-08-13T19:57:50.802Z"}]`}
            </div>
          </div>
        </div>
      </Container>

      <Container style={styles.section}>
        <Stack gap="xxl">
          <Stack gap="sm">
            <Heading level={2}>Getting started</Heading>
            <Text size="lg" tone="muted">
              Three steps, all from the command line.
            </Text>
          </Stack>
          <div {...stylex.props(styles.steps)}>
            {steps.map((step, index) => (
              <Stack key={step.title} gap="md">
                <span aria-hidden="true" {...stylex.props(styles.stepNumber)}>
                  {index + 1}
                </span>
                <Heading level={5} as="h3">
                  {step.title}
                </Heading>
                <Text size="sm" tone="muted">
                  {step.body}
                </Text>
              </Stack>
            ))}
          </div>
        </Stack>
      </Container>

      <Container style={styles.section}>
        <div {...stylex.props(styles.ctaBand)}>
          <Stack align="center" gap="lg">
            <Heading level={3}>Get started</Heading>
            <Text size="lg" tone="muted">
              {user === null
                ? "Create an account to see the signed-in application."
                : "Your dashboard is ready."}
            </Text>
            <Row gap="md" wrap justify="center">
              {user === null ? (
                <>
                  <ActionLink to="/register">Create an account</ActionLink>
                  <ActionLink to="/login" variant="secondary">
                    Sign in
                  </ActionLink>
                </>
              ) : (
                <ActionLink to="/app/dashboard">Open the dashboard</ActionLink>
              )}
            </Row>
          </Stack>
        </div>
      </Container>
    </MarketingLayout>
  );
}
