/**
 * API keys — mint, list, revoke.
 *
 * Two write paths again, for the same reason as `./profile.tsx`:
 *
 *   - The **list** is a route `loader` over the `listApiKeys` RPC, so it is in
 *     the server-rendered HTML on first paint and refreshes with
 *     `router.invalidate()` like every other list in the app.
 *   - **Minting and revoking** go through the auth client
 *     (`authClient.apiKey.*`), which posts to `/api/auth/api-key/*`. The
 *     `apiKey` plugin owns that table; the secret it returns is generated,
 *     hashed and forgotten inside Better Auth, and there is no reason to build
 *     a second transport for it.
 *
 * ## The secret is shown exactly once
 *
 * `create` is the only moment the full key exists in plaintext anywhere. It is
 * held in component state, rendered with a copy button and an explicit warning,
 * and lost on the next navigation — the list below can only ever show the
 * `start` prefix, because that is all the database has.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import type { ApiKeySummary } from "~/backend/rpc";
import { authClient, authErrorMessage } from "~/client/auth";
import { listApiKeys } from "~/server/api";
import { Alert, Button, Card, Field, Heading, Input, Row, Stack, Text } from "~/components";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/_app/app/settings/api-keys")({
  head: () => ({ meta: [{ title: "API keys — Kindling" }] }),
  loader: () => listApiKeys(),
  component: ApiKeysPage,
});

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  empty: {
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    paddingBlock: space.xxxl,
    paddingInline: space.xl,
    textAlign: "center",
  },
  meta: {
    color: color.textSubtle,
    fontFamily: font.mono,
    fontSize: font.sizeXs,
  },
  secret: {
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    paddingBlock: space.sm,
    paddingInline: space.md,
    backgroundColor: color.surfaceSunken,
    color: color.text,
    fontFamily: font.mono,
    fontSize: font.sizeSm,
    overflowWrap: "anywhere",
    userSelect: "all",
  },
});

/** A key the browser has just minted, and will never see again. */
type MintedKey = { readonly name: string; readonly secret: string };

function ApiKeysPage() {
  const router = useRouter();
  const keys = Route.useLoaderData();

  const [minted, setMinted] = useState<MintedKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const revoke = async (id: string) => {
    setRevokingId(id);
    setRevokeError(null);
    const result = await authClient.apiKey.delete({ keyId: id });
    setRevokingId(null);

    if (result.error != null) {
      setRevokeError(authErrorMessage(result.error));
      return;
    }
    // A revoked key stops verifying immediately — every `/v1` request holding
    // it now gets a 401.
    await router.invalidate();
  };

  return (
    <Stack gap="xxl">
      <Stack gap="xs">
        <Heading level={4} as="h2">
          API keys
        </Heading>
        <Text tone="muted">
          Keys authenticate the public REST API at <code>/v1</code>. Send one as the{" "}
          <code>Authorization</code> header. The{" "}
          <a href="/v1/docs" rel="noreferrer" target="_blank">
            API reference
          </a>{" "}
          documents every endpoint.
        </Text>
      </Stack>

      {minted === null ? null : (
        <MintedKeyPanel minted={minted} onDismiss={() => setMinted(null)} />
      )}

      <CreateKeyForm onMinted={setMinted} />

      <Stack gap="lg">
        <Heading level={5} as="h3">
          Your keys
        </Heading>

        <div aria-live="polite">
          {revokeError === null ? null : (
            <Alert tone="danger" title="Could not revoke that key">
              {revokeError}
            </Alert>
          )}
        </div>

        <div aria-busy={revokingId !== null} aria-live="polite">
          {keys._tag === "Failure" ? (
            <Alert tone="danger" title="Could not load your keys">
              {keys.failure.message}
            </Alert>
          ) : keys.value.length === 0 ? (
            <div {...stylex.props(styles.empty)}>
              <Stack align="center" gap="xs">
                <Text weight="medium">No API keys yet</Text>
                <Text size="sm" tone="muted">
                  Create one above to call the API from outside the browser.
                </Text>
              </Stack>
            </div>
          ) : (
            <Stack as="ul" gap="md" style={styles.list}>
              {keys.value.map((key) => (
                <KeyRow
                  key={key.id}
                  apiKey={key}
                  busy={revokingId !== null}
                  revoking={revokingId === key.id}
                  onRevoke={() => {
                    void revoke(key.id);
                  }}
                />
              ))}
            </Stack>
          )}
        </div>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// The one-time reveal
// ---------------------------------------------------------------------------

function MintedKeyPanel({ minted, onDismiss }: { minted: MintedKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    // `navigator.clipboard` is unavailable over plain HTTP on some hosts; the
    // key is `user-select: all` below so a manual copy always works.
    await navigator.clipboard.writeText(minted.secret);
    setCopied(true);
  };

  return (
    <Alert tone="warning" title={`Copy “${minted.name}” now. It will not be shown again.`}>
      <Stack gap="md">
        <Text size="sm">
          This is the only time the full key is visible. Only a hash is stored, so it cannot be
          retrieved later. If you lose it, create a new one.
        </Text>
        <code {...stylex.props(styles.secret)}>{minted.secret}</code>
        <Row gap="sm">
          <Button
            onClick={() => {
              void copy();
            }}
            size="sm"
          >
            {copied ? "Copied" : "Copy key"}
          </Button>
          <Button onClick={onDismiss} size="sm" variant="secondary">
            I have saved it
          </Button>
        </Row>
      </Stack>
    </Alert>
  );
}

// ---------------------------------------------------------------------------
// Minting
// ---------------------------------------------------------------------------

function CreateKeyForm({ onMinted }: { onMinted: (minted: MintedKey) => void }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = submitted && name.trim() === "" ? "Give the key a name." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    if (name.trim() === "") return;

    setPending(true);
    const result = await authClient.apiKey.create({ name: name.trim() });
    setPending(false);

    if (result.error != null || result.data == null) {
      setError(authErrorMessage(result.error));
      return;
    }

    onMinted({ name: result.data.name ?? name.trim(), secret: result.data.key });
    setName("");
    setSubmitted(false);
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
            <Heading level={5} as="h3">
              New key
            </Heading>
            <Text size="sm" tone="muted">
              A key has the same access you do. It can read and write any data the API exposes for
              your account.
            </Text>
          </Stack>

          <div aria-live="polite">
            {error === null ? null : (
              <Alert tone="danger" title="Could not create the key">
                {error}
              </Alert>
            )}
          </div>

          <Field
            error={nameError}
            hint="So you can tell your keys apart later."
            label="Name"
            required
          >
            <Input
              disabled={pending}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="CI deploy bot"
              value={name}
            />
          </Field>

          <Stack align="start">
            <Button loading={pending} loadingLabel="Creating" type="submit">
              Create key
            </Button>
          </Stack>
        </Stack>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The list
// ---------------------------------------------------------------------------

const day = (value: Date | null) => (value === null ? "never" : value.toISOString().slice(0, 10));

function KeyRow({
  apiKey,
  busy,
  onRevoke,
  revoking,
}: {
  apiKey: ApiKeySummary;
  busy: boolean;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <Card as="li" elevation="none" padding="lg">
      <Row align="start" gap="lg" justify="between">
        <Stack gap="xxs">
          <Text weight="medium">{apiKey.name ?? "Unnamed key"}</Text>
          <Text mono size="sm" tone="muted">
            {apiKey.start === null ? "••••" : `${apiKey.start}…`}
          </Text>
          <span {...stylex.props(styles.meta)}>
            created {day(apiKey.createdAt)} · last used {day(apiKey.lastRequest)}
          </span>
        </Stack>
        <Button
          aria-label={`Revoke ${apiKey.name ?? "key"}`}
          disabled={busy}
          loading={revoking}
          loadingLabel="Revoking"
          onClick={onRevoke}
          size="sm"
          variant="ghost"
        >
          Revoke
        </Button>
      </Row>
    </Card>
  );
}
