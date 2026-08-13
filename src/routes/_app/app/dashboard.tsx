/**
 * The worked example: Projects CRUD over the typed RPC contract.
 *
 * This is the page every fork copies, so the pattern is deliberately explicit:
 *
 *   1. The route `loader` calls a server function (`listProjects`), so the list
 *      is in the server-rendered HTML on first paint and refetched by the
 *      router on navigation. No client cache, no hydration handoff.
 *   2. A mutation is an `await` on a server function, then
 *      `router.invalidate()`. That re-runs this loader — the entire
 *      cache-invalidation story, in one line.
 *   3. Failures arrive as values (`RpcResult`), not throws, so an error is
 *      narrowed and rendered like any other state.
 *
 * Ownership is enforced server-side (`ownerId = currentUser.id`, in the SQL), so
 * there is no user id anywhere in this file.
 */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import { createProject, deleteProject, listProjects } from "~/server/api";
import type { RpcFailure } from "~/server/rpc";
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
  // The loader runs on the server during SSR and in the browser on navigation.
  // `listProjects` is a server function either way, which is what lets the
  // browser half reach a Worker binding it cannot see.
  loader: () => listProjects(),
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
  const router = useRouter();
  const projects = Route.useLoaderData();

  // One piece of delete state for the whole list: `deletingId` is what makes
  // the spinner local to the row that was clicked.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteFailure, setDeleteFailure] = useState<RpcFailure | null>(null);

  const remove = async (id: string) => {
    setDeletingId(id);
    setDeleteFailure(null);
    const result = await deleteProject({ data: { id } });
    setDeletingId(null);

    if (result._tag === "Failure") {
      setDeleteFailure(result.failure);
      return;
    }
    // Re-runs this route's loader (and every other active one). The list is
    // fresh by the time this resolves.
    await router.invalidate();
  };

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
            {projects._tag === "Success" ? (
              <Text size="sm" tone="subtle">
                {projects.value.length} total
              </Text>
            ) : null}
          </Row>

          <div aria-live="polite">
            {deleteFailure === null ? null : (
              <Alert tone="danger" title="Could not delete that project">
                {deleteFailure.message}
              </Alert>
            )}
          </div>

          <div aria-busy={deletingId !== null} aria-live="polite">
            {projects._tag === "Failure" ? (
              <Alert tone="danger" title="Could not load your projects">
                {projects.failure.message}
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
                        disabled={deletingId !== null}
                        loading={deletingId === project.id}
                        loadingLabel="Deleting"
                        onClick={() => {
                          void remove(project.id);
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
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<RpcFailure | null>(null);

  const nameError = submitted && name.trim() === "" ? "Give the project a name." : undefined;

  const submit = async () => {
    setSubmitted(true);
    setFailure(null);
    if (name.trim() === "") return;

    setPending(true);
    const result = await createProject({
      data: {
        name: name.trim(),
        description: description.trim() === "" ? null : description.trim(),
      },
    });
    setPending(false);

    if (result._tag === "Failure") {
      setFailure(result.failure);
      return;
    }

    setName("");
    setDescription("");
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
            <Heading level={5} as="h2">
              New project
            </Heading>
            <Text size="sm" tone="muted">
              Client-side validation stops at &ldquo;not empty&rdquo;. The schema in the RPC
              contract is the real gate.
            </Text>
          </Stack>

          <div aria-live="polite">
            {failure === null ? null : (
              <Alert tone="danger" title="Could not create the project">
                {failure.message}
              </Alert>
            )}
          </div>

          <Field error={nameError} label="Name" required>
            <Input
              disabled={pending}
              name="name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ignition"
              value={name}
            />
          </Field>

          <Field hint="Optional." label="Description">
            <Textarea
              disabled={pending}
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
