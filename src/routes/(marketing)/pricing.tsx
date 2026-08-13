import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";

import { ActionLink, Container, MarketingLayout } from "~/client/chrome";
import { Card, Heading, Row, Stack, Text } from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/(marketing)/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Kindling" },
      {
        name: "description",
        content:
          "Three plans, no seat maths. Start free, upgrade when the project turns into a product.",
      },
    ],
  }),
  component: PricingPage,
});

const styles = stylex.create({
  section: {
    paddingBlock: { default: space.xxxl, [breakpoint.md]: space.huge },
  },
  header: {
    marginInline: "auto",
    textAlign: "center",
    maxWidth: 640,
  },
  grid: {
    gap: space.lg,
    alignItems: "stretch",
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoint.lg]: "repeat(3, minmax(0, 1fr))" },
  },
  plan: {
    height: "100%",
  },
  planFeatured: {
    borderColor: color.primary,
    borderWidth: 2,
  },
  badge: {
    borderRadius: radius.pill,
    paddingBlock: space.xxs,
    paddingInline: space.sm,
    backgroundColor: color.primarySubtle,
    color: color.primaryText,
    fontFamily: font.sans,
    fontSize: font.size2xs,
    fontWeight: font.weightSemibold,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  price: {
    alignItems: "baseline",
    color: color.text,
    display: "flex",
    fontFamily: font.sans,
    fontSize: font.size4xl,
    fontWeight: font.weightSemibold,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineTight,
  },
  list: {
    margin: 0,
    padding: 0,
    gap: space.sm,
    display: "flex",
    flexDirection: "column",
    listStyleType: "none",
  },
  listItem: {
    gap: space.sm,
    alignItems: "flex-start",
    display: "flex",
  },
  tick: {
    color: color.success,
    flexShrink: 0,
    fontSize: font.sizeSm,
    lineHeight: font.lineNormal,
  },
  faq: {
    gap: space.xl,
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoint.md]: "repeat(2, minmax(0, 1fr))" },
  },
  spacer: {
    marginBlockStart: "auto",
  },
});

type Plan = {
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly summary: string;
  readonly features: ReadonlyArray<string>;
  readonly cta: "/register" | "/login";
  readonly ctaLabel: string;
  readonly featured: boolean;
};

const plans: ReadonlyArray<Plan> = [
  {
    name: "Hobby",
    price: "$0",
    cadence: "forever",
    summary: "For the weekend build that might become something.",
    features: [
      "One project",
      "Community support",
      "Deploy to your own Cloudflare account",
      "All template source, MIT licensed",
    ],
    cta: "/register",
    ctaLabel: "Start free",
    featured: false,
  },
  {
    name: "Team",
    price: "$24",
    cadence: "per month",
    summary: "For the point where other people depend on it.",
    features: [
      "Unlimited projects",
      "Email support, one business day",
      "Preview environments per branch",
      "Audit log and role-based access",
      "Uptime and error dashboards",
    ],
    cta: "/register",
    ctaLabel: "Start a trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    cadence: "annual",
    summary: "For procurement, compliance and a signature.",
    features: [
      "Everything in Team",
      "SSO and SCIM provisioning",
      "Data residency options",
      "Custom terms and a shared Slack channel",
    ],
    cta: "/login",
    ctaLabel: "Contact sales",
    featured: false,
  },
];

const faqs = [
  {
    question: "Is this a real price list?",
    answer:
      "No. It is the shape of one. Kindling ships no billing integration — swap this table for your provider's and the surrounding page still works.",
  },
  {
    question: "What does it cost to run?",
    answer:
      "Whatever Cloudflare charges you. Two Workers and a D1 database sit inside the free tier for a long time; you deploy into your own account, so there is no markup in between.",
  },
  {
    question: "Can I change the stack?",
    answer:
      "Every choice is one file. The RPC contract, the auth configuration, the database schema and the infrastructure each live in a single readable module.",
  },
  {
    question: "Do I have to use the design system?",
    answer:
      "No, but it is doing more than it looks: focus rings, label wiring and live regions are already correct, and it is themed in light and dark.",
  },
] as const;

function PricingPage() {
  return (
    <MarketingLayout>
      <Container style={styles.section}>
        <Stack gap="xxl">
          <Stack gap="md" style={styles.header}>
            <Heading level={1} as="h1">
              Simple, honest pricing
            </Heading>
            <Text size="lg" tone="muted">
              Start free. Pay when the thing you built starts paying you.
            </Text>
          </Stack>

          <div {...stylex.props(styles.grid)}>
            {plans.map((plan) => (
              <Card
                key={plan.name}
                elevation={plan.featured ? "md" : "none"}
                padding="xl"
                style={[styles.plan, plan.featured && styles.planFeatured]}
              >
                <Stack gap="lg" grow>
                  <Row gap="sm" justify="between">
                    <Heading level={4} as="h2">
                      {plan.name}
                    </Heading>
                    {plan.featured ? (
                      <span {...stylex.props(styles.badge)}>Most popular</span>
                    ) : null}
                  </Row>

                  <Stack gap="xxs">
                    <span {...stylex.props(styles.price)}>{plan.price}</span>
                    <Text size="sm" tone="subtle">
                      {plan.cadence}
                    </Text>
                  </Stack>

                  <Text size="sm" tone="muted">
                    {plan.summary}
                  </Text>

                  <ul {...stylex.props(styles.list)}>
                    {plan.features.map((feature) => (
                      <li key={feature} {...stylex.props(styles.listItem)}>
                        <span aria-hidden="true" {...stylex.props(styles.tick)}>
                          ✓
                        </span>
                        <Text size="sm">{feature}</Text>
                      </li>
                    ))}
                  </ul>

                  <Stack style={styles.spacer}>
                    <ActionLink to={plan.cta} variant={plan.featured ? "primary" : "secondary"}>
                      {plan.ctaLabel}
                    </ActionLink>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </div>

          <Stack gap="xl">
            <Heading level={3} as="h2">
              Questions people actually ask
            </Heading>
            <div {...stylex.props(styles.faq)}>
              {faqs.map((faq) => (
                <Stack key={faq.question} gap="xs">
                  <Heading level={5} as="h3">
                    {faq.question}
                  </Heading>
                  <Text size="sm" tone="muted">
                    {faq.answer}
                  </Text>
                </Stack>
              ))}
            </div>
          </Stack>
        </Stack>
      </Container>
    </MarketingLayout>
  );
}
