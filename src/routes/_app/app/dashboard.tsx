/**
 * The worked example: Projects CRUD over the typed RPC contract.
 *
 * This is the page every fork copies, so the pattern is deliberately explicit:
 *
 *   1. A query atom (`projectsAtom`) declares the reactivity key it depends on.
 *   2. Mutations declare the keys they invalidate when they succeed.
 *   3. Nothing refetches by hand. Writing `reactivityKeys` on the mutation is
 *      the entire cache-invalidation story.
 *
 * Ownership is enforced server-side (`ownerId = currentUser.id`, in the SQL), so
 * there is no user id anywhere in this file.
 */
import { useAtom, useAtomValue } from "@effect/atom-react";
import { createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";

import {
  createProjectAtom,
  deleteProjectAtom,
  keys,
  projectsAtom,
  rpcErrorMessage,
} from "~/client/rpc";
import {
  Alert,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Row,
  Stack,
  Text,
  Textarea,
} from "~/components";
import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font, radius, space } from "~/styles/tokens.stylex";

export const Route = createFileRoute("/_app/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Kindling" }] }),
  component: DashboardPage,
});

const styles = stylex.create({
  layout: {
    gap: space.xl,
    alignItems: "start",
    display: "grid",
    gridTemplateColumns: { default: "1fr", [breakpoint.lg]: "minmax(0, 2fr) minmax(0, 1fr)" },
  },
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
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const projects = useAtomValue(projectsAtom);

  // One delete mutation for the whole list — atoms are identities, so calling
  // `useAtom(deleteProjectAtom)` inside each row would give every row the same
  // shared in-flight state. `deletingId` is what makes the spinner local.
  const [deleteResult, deleteProject] = useAtom(deleteProjectAtom);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = AsyncResult.isWaiting(deleteResult);

  return (
    <Stack gap="xxl">
      <Stack gap="xs">
        <Heading level={3} as="h1">
          Welcome back, {user.name}
        </Heading>
        <Text tone="muted">
          Projects is the example entity: one table, one RPC group, one page. Copy the shape and
          delete the word &ldquo;project&rdquo;.
        </Text>
      </Stack>

      <div {...stylex.props(styles.layout)}>
        <Stack gap="lg">
          <Row gap="md" justify="between">
            <Heading level={5} as="h2">
              Your projects
            </Heading>
            {AsyncResult.isSuccess(projects) ? (
              <Text size="sm" tone="subtle">
                {projects.value.length} total
              </Text>
            ) : null}
          </Row>

          <div aria-live="polite">
            {AsyncResult.isFailure(deleteResult) ? (
              <Alert tone="danger" title="Could not delete that project">
                {rpcErrorMessage(deleteResult.cause)}
              </Alert>
            ) : null}
          </div>

          <div aria-busy={AsyncResult.isWaiting(projects)} aria-live="polite">
            {AsyncResult.isInitial(projects) ? (
              <Text tone="muted">Loading projects…</Text>
            ) : AsyncResult.isFailure(projects) ? (
              <Alert tone="danger" title="Could not load your projects">
                {rpcErrorMessage(projects.cause)}
              </Alert>
            ) : projects.value.length === 0 ? (
              <div {...stylex.props(styles.empty)}>
                <Stack align="center" gap="xs">
                  <Text weight="medium">No projects yet</Text>
                  <Text size="sm" tone="muted">
                    Create your first one with the form alongside.
                  </Text>
                </Stack>
              </div>
            ) : (
              <Stack as="ul" gap="md" style={styles.list}>
                {projects.value.map((project) => (
                  <Card key={project.id} as="li" elevation="none" padding="lg">
                    <Row align="start" gap="lg" justify="between">
                      <Stack gap="xxs">
                        <Text weight="medium">{project.name}</Text>
                        {project.description === null || project.description === "" ? null : (
                          <Text size="sm" tone="muted">
                            {project.description}
                          </Text>
                        )}
                        <span {...stylex.props(styles.meta)}>
                          created {project.createdAt.toISOString().slice(0, 10)}
                        </span>
                      </Stack>
                      <Button
                        aria-label={`Delete ${project.name}`}
                        loading={deleting && deletingId === project.id}
                        loadingLabel="Deleting"
                        onClick={() => {
                          setDeletingId(project.id);
                          // Invalidating the `projects` key is the whole
                          // refresh: `projectsAtom` declares the same key, so it
                          // re-runs as soon as this succeeds.
                          deleteProject({
                            payload: { id: project.id },
                            reactivityKeys: [keys.projects],
                          });
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        Delete
                      </Button>
                    </Row>
                  </Card>
                ))}
              </Stack>
            )}
          </div>
        </Stack>

        <CreateProjectForm />
      </div>
    </Stack>
  );
}

function CreateProjectForm() {
  const [result, createProject] = useAtom(createProjectAtom);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const pending = AsyncResult.isWaiting(result);
  const nameError = submitted && name.trim() === "" ? "Give the project a name." : undefined;

  return (
    <Card padding="xl">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (name.trim() === "") return;

          createProject({
            payload: {
              name: name.trim(),
              description: description.trim() === "" ? null : description.trim(),
            },
            reactivityKeys: [keys.projects],
          });
          setName("");
          setDescription("");
          setSubmitted(false);
        }}
      >
        <Stack gap="lg">
          <Stack gap="xxs">
            <Heading level={5} as="h2">
              New project
            </Heading>
            <Text size="sm" tone="muted">
              Client-side validation stops at &ldquo;not empty&rdquo;. The schema in the RPC
              contract is the real gate.
            </Text>
          </Stack>

          <div aria-live="polite">
            {AsyncResult.isFailure(result) ? (
              <Alert tone="danger" title="Could not create the project">
                {rpcErrorMessage(result.cause)}
              </Alert>
            ) : null}
          </div>

          <Field error={nameError} label="Name" required>
            <Input
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ignition"
              value={name}
            />
          </Field>

          <Field hint="Optional." label="Description">
            <Textarea
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is it for?"
              rows={3}
              value={description}
            />
          </Field>

          <Button fullWidth loading={pending} loadingLabel="Creating" type="submit">
            Create project
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
