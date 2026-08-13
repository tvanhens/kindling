import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient, authErrorMessage } from "~/client/auth";
import { AuthLayout } from "~/client/chrome";
import { Alert, Button, Field, Input, Stack, Text } from "~/components";

export const Route = createFileRoute("/(auth)/register")({
  head: () => ({ meta: [{ title: "Create an account — Kindling" }] }),
  component: RegisterPage,
});

/** Better Auth's own minimum. Raise it here and in the backend together. */
const MIN_PASSWORD_LENGTH = 8;

function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = submitted && name.trim() === "" ? "Tell us what to call you." : undefined;
  const emailError = submitted && email.trim() === "" ? "Enter your email address." : undefined;
  const passwordError =
    submitted && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (name.trim() === "" || email.trim() === "" || password.length < MIN_PASSWORD_LENGTH) return;

    setPending(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setPending(false);

    if (result.error != null) {
      setError(authErrorMessage(result.error));
      return;
    }

    // `requireEmailVerification` is false in `src/backend/api.ts`, so sign-up
    // also signs in. Flip that flag and this navigation becomes a "check your
    // inbox" screen instead.
    await router.invalidate();
    await router.navigate({ to: "/app/dashboard" });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one? <Link to="/login">Sign in</Link>.
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
            {error === null ? null : (
              <Alert tone="danger" title="Could not create your account">
                {error}
              </Alert>
            )}
          </div>

          <Field label="Name" error={nameError} required>
            <Input
              autoComplete="name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              value={name}
            />
          </Field>

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

          <Field
            label="Password"
            error={passwordError}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            required
          >
            <Input
              autoComplete="new-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </Field>

          <Button
            fullWidth
            loading={pending}
            loadingLabel="Creating account"
            size="lg"
            type="submit"
          >
            Create account
          </Button>

          <Text size="xs" tone="subtle">
            Email verification is disabled in this template and outbound email is stubbed to
            `console.log` — see the TODO(email) markers in `src/backend/api.ts`.
          </Text>
        </Stack>
      </form>
    </AuthLayout>
  );
}
