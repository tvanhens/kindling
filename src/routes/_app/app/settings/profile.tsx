/**
 * Profile settings.
 *
 * Two different write paths on one page, on purpose — it is the clearest place
 * to show where the boundary sits:
 *
 *   - Name and avatar go through the `updateProfile` **RPC**, which calls Better
 *     Auth's API server-side. The `user` table belongs to Better Auth, so writes
 *     never touch it through Drizzle (see `src/db/schema.ts`).
 *   - Changing a password goes through the **auth client**, because it needs the
 *     current password and re-issues the session cookie.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import type { User } from "~/backend/rpc";
import { authClient, authErrorMessage } from "~/client/auth";
import { getCurrentUser, updateProfile } from "~/server/api";
import type { RpcFailure } from "~/server/rpc";
import { Alert, Button, Card, Field, Heading, Input, Stack, Text } from "~/components";

export const Route = createFileRoute("/_app/app/settings/profile")({
  head: () => ({ meta: [{ title: "Profile — Kindling" }] }),
  loader: () => getCurrentUser(),
  component: ProfilePage,
});

const MIN_PASSWORD_LENGTH = 8;

function ProfilePage() {
  const currentUser = Route.useLoaderData();

  return (
    <Stack gap="xxl">
      <Stack gap="xs">
        <Heading level={3} as="h1">
          Profile
        </Heading>
        <Text tone="muted">Your account details, and the password you sign in with.</Text>
      </Stack>
      {currentUser._tag === "Failure" ? (
        <Alert tone="danger" title="Could not load your account">
          {currentUser.failure.message}
        </Alert>
      ) : (
        <ProfileForm user={currentUser.value} />
      )}
      <PasswordForm />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Name + avatar, via the RPC contract
// ---------------------------------------------------------------------------

function ProfileForm({ user }: { user: User }) {
  // The loader already has the server's copy, so the inputs are seeded on the
  // first render — server and client agree, and there is no empty-then-filled
  // flash to hydrate around. Later refreshes must not clobber whatever the user
  // is currently typing, which is why this is `useState` and not derived state.
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<RpcFailure | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const nameError = submitted && name.trim() === "" ? "A name is required." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    setSaved(false);
    if (name.trim() === "") return;

    setPending(true);
    const result = await updateProfile({
      data: { name: name.trim(), image: image.trim() === "" ? null : image.trim() },
    });
    setPending(false);

    if (result._tag === "Failure") {
      setFailure(result.failure);
      return;
    }

    setSaved(true);
    // The guard's session and this route's loader both hold a copy of the user;
    // invalidating re-runs them so the header and this page agree.
    await router.invalidate();
  };

  return (
    <Card padding="xl">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="lg">
          <Stack gap="xxs">
            <Heading level={5} as="h2">
              Account
            </Heading>
            <Text size="sm" tone="muted">
              Signed in as {user.email}
            </Text>
          </Stack>

          <div aria-live="polite">
            {failure !== null ? (
              <Alert tone="danger" title="Could not save your profile">
                {failure.message}
              </Alert>
            ) : saved ? (
              <Alert tone="success">Profile saved.</Alert>
            ) : null}
          </div>

          <Field error={nameError} label="Display name" required>
            <Input
              autoComplete="name"
              disabled={pending}
              name="name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </Field>

          <Field hint="A link to an image. Leave empty to remove it." label="Avatar URL">
            <Input
              autoComplete="photo"
              disabled={pending}
              inputMode="url"
              name="image"
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/avatar.png"
              type="url"
              value={image}
            />
          </Field>

          <Stack align="start">
            <Button loading={pending} loadingLabel="Saving" type="submit">
              Save profile
            </Button>
          </Stack>
        </Stack>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Password, via the auth client
// ---------------------------------------------------------------------------

function PasswordForm() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const currentError =
    submitted && currentPassword === "" ? "Enter your current password." : undefined;
  const newError =
    submitted && newPassword.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    setChanged(false);
    if (currentPassword === "" || newPassword.length < MIN_PASSWORD_LENGTH) return;

    setPending(true);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      // Signing out other devices is the safe default after a password change.
      revokeOtherSessions: true,
    });
    setPending(false);

    if (result.error != null) {
      setError(authErrorMessage(result.error));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setSubmitted(false);
    setChanged(true);
    // The session cookie was reissued; drop cached guard results so the next
    // navigation revalidates against the new one.
    await router.invalidate();
  };

  return (
    <Card padding="xl">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Stack gap="lg">
          <Stack gap="xxs">
            <Heading level={5} as="h2">
              Password
            </Heading>
            <Text size="sm" tone="muted">
              Changing it signs out every other device.
            </Text>
          </Stack>

          <div aria-live="polite">
            {error !== null ? (
              <Alert tone="danger" title="Could not change your password">
                {error}
              </Alert>
            ) : changed ? (
              <Alert tone="success">Password updated.</Alert>
            ) : null}
          </div>

          <Field error={currentError} label="Current password" required>
            <Input
              autoComplete="current-password"
              name="currentPassword"
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </Field>

          <Field error={newError} label="New password" required>
            <Input
              autoComplete="new-password"
              name="newPassword"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </Field>

          <Stack align="start">
            <Button loading={pending} loadingLabel="Updating" type="submit">
              Change password
            </Button>
          </Stack>
        </Stack>
      </form>
    </Card>
  );
}
