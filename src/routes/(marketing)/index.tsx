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
  // Deliberately lighter than the feature cards: this section is reference, not
  // pitch, and should read as a list rather than compete with the value props.
  stackGrid: {
    gap: 0,
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoint.sm]: "repeat(2, minmax(0, 1fr))",
      [breakpoint.lg]: "repeat(3, minmax(0, 1fr))",
    },
  },
  stackItem: {
    paddingBlock: space.lg,
    borderBlockStartColor: color.border,
    borderBlockStartStyle: "solid",
    borderBlockStartWidth: 1,
    paddingInlineEnd: space.lg,
  },
  stackName: {
    color: color.text,
    fontFamily: font.mono,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  stepCommand: {
    marginBlockStart: space.xs,
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
    title: "Accounts and sessions",
    body: "Sign-up, sign-in, sign-out, password reset and profile management are built and working. Email verification is implemented and switched off until you add a provider.",
  },
  {
    title: "Private areas stay private",
    body: "Signed-in pages resolve the session on the server before anything renders, so protected content is never briefly visible to someone who should not see it.",
  },
  {
    title: "A database with migrations",
    body: "A SQL database with a typed schema, generated migrations and a worked example entity to copy. Applied automatically as part of deployment.",
  },
  {
    title: "Breakage caught at build time",
    body: "The browser and the server share one definition of every request and response. Change a field and the build fails, instead of a request failing for a customer.",
  },
  {
    title: "An accessible interface",
    body: "Light and dark themes, form controls with correct labelling and focus states, and error handling that is announced to screen readers.",
  },
  {
    title: "One command to deploy",
    body: "Provisioning the database, applying migrations, building the client and deploying both Workers is a single command. No dashboard steps.",
  },
] as const;

/**
 * Surface-level only. The point of this section is to let someone decide
 * whether the stack is one they want to work in, not to explain how it fits
 * together — the README does that.
 */
const stack = [
  { name: "Cloudflare Workers", role: "Hosting and compute" },
  { name: "D1", role: "SQLite database" },
  { name: "TanStack Start", role: "Routing and server rendering" },
  { name: "Better Auth", role: "Sessions and API keys" },
  { name: "Effect", role: "Services, typed RPC and the API contract" },
  { name: "Drizzle", role: "Schema and migrations" },
  { name: "StyleX", role: "Styles compiled at build time" },
  { name: "Alchemy", role: "Infrastructure defined in TypeScript" },
  { name: "Bun", role: "Runtime, package manager and test runner" },
] as const;

const apiPoints = [
  "Keys are created and revoked in account settings. They are hashed at rest and shown once, at creation.",
  "Public response types are declared separately from internal ones, so changes to the domain do not alter the published contract.",
  "Every query is scoped to the key owner in SQL. A request for another account's record returns 404.",
] as const;

const steps = [
  {
    title: "Fork it",
    body: "Clone the repository and install. The dependency list is short and every entry has a stated reason, so the whole thing can be read in an afternoon.",
  },
  {
    title: "Prompt it",
    body: "Point a coding agent at the repository. AGENTS.md sets out how to work in it, and the reasoning behind each decision sits in a comment beside the code it explains.",
  },
  {
    title: "Ship it",
    body: "One command provisions the database, applies migrations, builds the client and deploys both Workers.",
    command: "bun run deploy",
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
                Six things you would otherwise build before writing a feature.
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

      <div {...stylex.props(styles.sectionAlt)}>
        <Container style={styles.section}>
          <Stack gap="xl">
            <Stack gap="sm">
              <Heading level={2}>The stack</Heading>
              <Text size="lg" tone="muted">
                What the template is built on. The README lists every dependency with the reason it
                was chosen.
              </Text>
            </Stack>
            <div {...stylex.props(styles.stackGrid)}>
              {stack.map((item) => (
                <div key={item.name} {...stylex.props(styles.stackItem)}>
                  <Stack gap="xxs">
                    <span {...stylex.props(styles.stackName)}>{item.name}</span>
                    <Text size="sm" tone="muted">
                      {item.role}
                    </Text>
                  </Stack>
                </div>
              ))}
            </div>
          </Stack>
        </Container>
      </div>

      <Container style={styles.section}>
        <Stack gap="xxl">
          <Stack gap="sm">
            <Heading level={2}>Getting started</Heading>
            <Text size="lg" tone="muted">
              Fork it, hand it to an agent, deploy it.
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
                {"command" in step ? (
                  <div {...stylex.props(styles.terminal, styles.stepCommand)}>
                    <span aria-hidden="true" {...stylex.props(styles.prompt)}>
                      ${" "}
                    </span>
                    {step.command}
                  </div>
                ) : null}
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
