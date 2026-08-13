/**
 * Password reset, both halves.
 *
 * Better Auth's flow is: request a link → the link hits
 * `/api/auth/reset-password/:token?callbackURL=…` → that endpoint redirects the
 * browser to the callback with `?token=…` appended. So one route serves both
 * screens and switches on the presence of `token`.
 *
 * Email sending in this template is a `console.log` stub, so the request screen
 * says exactly that: copy the URL out of the dev server output.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient, authErrorMessage } from "~/client/auth";
import { AuthLayout } from "~/client/chrome";
import { Alert, Button, Field, Input, Stack, Text } from "~/components";

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string; error?: string } => {
    const token = search["token"];
    const error = search["error"];
    return {
      ...(typeof token === "string" ? { token } : {}),
      ...(typeof error === "string" ? { error } : {}),
    };
  },
  head: () => ({ meta: [{ title: "Reset your password — Kindling" }] }),
  component: ResetPasswordPage,
});

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordPage() {
  const { token, error: linkError } = Route.useSearch();
  return token === undefined ? (
    <RequestReset linkError={linkError} />
  ) : (
    <ConfirmReset token={token} />
  );
}

// ---------------------------------------------------------------------------
// Step 1 — ask for a link
// ---------------------------------------------------------------------------

function RequestReset({ linkError }: { linkError: string | undefined }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailError = submitted && email.trim() === "" ? "Enter your email address." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (email.trim() === "") return;

    setPending(true);
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      // Where Better Auth sends the browser after it validates the token. It
      // appends `?token=…`, which lands back on this route's second screen.
      redirectTo: "/reset-password",
    });
    setPending(false);

    if (result.error != null) {
      setError(authErrorMessage(result.error));
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        <>
          Remembered it? <Link to="/login">Sign in instead</Link>.
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
          <div aria-live="polite">
            {linkError !== undefined ? (
              <Alert tone="danger" title="That link did not work">
                It may have expired or already been used. Request a new one below.
              </Alert>
            ) : error !== null ? (
              <Alert tone="danger" title="Could not send the link">
                {error}
              </Alert>
            ) : sent ? (
              <Alert tone="success" title="Link sent">
                If an account exists for that address, a reset link is on its way.
              </Alert>
            ) : null}
          </div>

          <Field
            label="Email"
            error={emailError}
            hint="You will get a link that signs you in long enough to pick a new password."
            required
          >
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

          <Button fullWidth loading={pending} loadingLabel="Sending" size="lg" type="submit">
            Send reset link
          </Button>

          <Alert tone="info" title="Running locally?">
            No email provider is configured yet. The reset URL is printed to the dev server output
            as `[auth] password reset for …` — paste it into the address bar to continue. Wire a
            real provider at the TODO(email) marker in `src/backend/api.ts`.
          </Alert>
        </Stack>
      </form>
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — set the new password
// ---------------------------------------------------------------------------

function ConfirmReset({ token }: { token: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordError =
    submitted && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;
  const confirmationError =
    submitted && confirmation !== password ? "The two passwords do not match." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH || confirmation !== password) return;

    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);

    if (result.error != null) {
      setError(authErrorMessage(result.error));
      return;
    }
    await router.navigate({ to: "/login", search: {} });
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="This link can only be used once.">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="lg">
          <div aria-live="polite">
            {error === null ? null : (
              <Alert tone="danger" title="Could not reset your password">
                {error}
              </Alert>
            )}
          </div>

          <Field label="New password" error={passwordError} required>
            <Input
              autoComplete="new-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>

          <Field label="Confirm new password" error={confirmationError} required>
            <Input
              autoComplete="new-password"
              name="confirmation"
              onChange={(event) => setConfirmation(event.target.value)}
              type="password"
              value={confirmation}
            />
          </Field>

          <Button fullWidth loading={pending} loadingLabel="Saving" size="lg" type="submit">
            Set new password
          </Button>

          <Text size="xs" tone="subtle">
            You will be asked to sign in again with the new password.
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}
