import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient, authErrorMessage, sanitizeRedirect } from "~/client/auth";
import { AuthLayout } from "~/client/chrome";
import { Alert, Button, Field, Input, Row, Stack, Text } from "~/components";

export const Route = createFileRoute("/(auth)/login")({
  // `_app`'s guard redirects here with the destination it refused. The value is
  // untrusted user input; `sanitizeRedirect` clamps it to a same-origin path.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const value = search["redirect"];
    return typeof value === "string" ? { redirect: value } : {};
  },
  head: () => ({ meta: [{ title: "Sign in — Kindling" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = submitted && email.trim() === "" ? "Enter your email address." : undefined;
  const passwordError = submitted && password === "" ? "Enter your password." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (email.trim() === "" || password === "") return;

    setPending(true);
    const result = await authClient.signIn.email({ email: email.trim(), password });
    setPending(false);

    if (result.error != null) {
      setError(authErrorMessage(result.error));
      return;
    }

    // Drop every cached `beforeLoad` result before navigating, or the guard on
    // `_app` would replay the pre-login "no session" answer.
    await router.invalidate();
    await router.navigate({ to: sanitizeRedirect(redirect, "/app/dashboard") });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle={
        <>
          New here? <Link to="/register">Create an account</Link>.
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="lg">
          {/* Async failures land here. `Alert` with tone="danger" is role="alert",
              so a failed sign-in is announced without stealing focus. */}
          <div aria-live="polite">
            {error === null ? null : (
              <Alert tone="danger" title="Could not sign in">
                {error}
              </Alert>
            )}
          </div>

          <Field label="Email" error={emailError} required>
            <Input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </Field>

          <Field label="Password" error={passwordError} required>
            <Input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>

          <Button fullWidth loading={pending} loadingLabel="Signing in" size="lg" type="submit">
            Sign in
          </Button>

          <Row justify="between">
            <Text size="sm" tone="muted">
              Forgot your password?
            </Text>
            <Link to="/reset-password">
              <Text size="sm">Reset it</Text>
            </Link>
          </Row>
        </Stack>
      </form>
    </AuthLayout>
  );
}
