import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";

import { ActionLink, Container, MarketingLayout } from "~/client/chrome";
import { Card, Heading, Row, Stack, Text } from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/(marketing)/")({
  head: () => ({
    meta: [
      { title: "Kindling — an opinionated launchpad for Cloudflare" },
      {
        name: "description",
        content:
          "SSR, typed end-to-end RPC, session auth and a D1 database, wired together across two Workers and deployable with one command.",
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
    body: "A public SSR Worker and a private backend joined by a service binding. The browser only ever talks to your own origin, so session cookies stay first-party and CORS never enters the picture.",
  },
  {
    title: "One domain, two transports",
    body: "Business logic lives in services that no transport owns. The internal RPC contract and the public REST API are both thin adapters over them, so a rule written once holds on both.",
  },
  {
    title: "Session auth, already wired",
    body: "Better Auth with email and password, backed by D1 through Drizzle. Sign-up, sign-in, sign-out and password reset are implemented pages, not a TODO list.",
  },
  {
    title: "Guarded by construction",
    body: "Protected pages are children of a single layout route whose beforeLoad resolves the session during SSR. You cannot add a page to the signed-in area and forget the check.",
  },
  {
    title: "A design system, not a CSS file",
    body: "StyleX atoms compiled at build time: zero runtime, no class collisions, themeable tokens, and a set of primitives that already handle focus rings and label wiring.",
  },
  {
    title: "Infrastructure as code you can read",
    body: "Alchemy describes the Workers, the D1 database and the bindings in TypeScript that lives next to the app. One command plans it, one deploys it.",
  },
] as const;

const apiPoints = [
  "API keys minted and revoked from the signed-in settings page, hashed at rest and shown once.",
  "Public response shapes kept separate from the internal domain, so renaming a column is not a breaking change for anyone integrating.",
  "Every endpoint scoped to the key's owner in SQL — not found and not yours are the same answer.",
] as const;

const steps = [
  {
    title: "Fork it",
    body: "Clone the template and install. Every dependency is deliberate; the list is short enough to audit in a sitting.",
  },
  {
    title: "Rename the domain",
    body: "Projects is the worked example: one table, one RPC group, one CRUD page. Copy its shape for whatever you are actually building.",
  },
  {
    title: "Deploy",
    body: "`bun run deploy` provisions the database, applies migrations, builds the client and ships both Workers.",
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
            Stop rebuilding the first two weeks of every project.
          </Heading>
          <Text size="lg" tone="muted">
            Kindling is the boring part, finished: server rendering, a typed API, real sessions and
            a database — wired together, deployed to Cloudflare in one command, and small enough
            that you can read all of it.
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
              <Heading level={2}>What you get on day one</Heading>
              <Text size="lg" tone="muted">
                Six decisions already made, each one you would otherwise spend an afternoon on.
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
            <Heading level={2}>Your product ships with an API</Heading>
            <Text size="lg" tone="muted">
              Not a plan for one. <code>/v1</code> is live from the first deploy: key
              authentication, per-key rate limits, and an OpenAPI 3.1 document generated from the
              same contract the handlers implement — so the reference cannot drift from the code.
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
            <Heading level={2}>From clone to production</Heading>
            <Text size="lg" tone="muted">
              Three steps, and none of them involve a dashboard.
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
            <Heading level={3}>Ready when you are</Heading>
            <Text size="lg" tone="muted">
              {user === null
                ? "Create an account and look around the signed-in app — it is the same code you will be editing five minutes from now."
                : "You are signed in. The app below is the same code you will be editing five minutes from now."}
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
