/**
 * The data layer, as TanStack Start sees it.
 *
 * Every read here is called from a route `loader`; every write is called from a
 * component and followed by `router.invalidate()`. There is no client cache to
 * keep in sync — the router *is* the cache — so "invalidation" is one line and
 * no key registry.
 *
 * All five functions are `createServerFn`, which is what makes the loaders work
 * on both sides: a loader runs on the server during SSR and in the *browser*
 * during client-side navigation, and only a server function guarantees the body
 * executes where `env.BACKEND` exists.
 *
 * Mutations validate their input with `Schema.toStandardSchemaV1(...)` over the
 * very schema the RPC contract uses (`src/backend/rpc.ts`). That is a
 * convenience for the caller, not the security boundary: the backend re-decodes
 * the payload and re-derives the user from the session cookie regardless.
 *
 * Failures are values, never throws — see the `RpcResult` note in
 * `./rpc.ts` for why, and `Alert` rendering in the pages for how it reads.
 */
import { createServerFn } from "@tanstack/react-start";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { CreateProjectPayload, DeleteProjectPayload, UpdateProfilePayload } from "~/backend/rpc";
import { callBackend, plain } from "./rpc.ts";

// ---------------------------------------------------------------------------
// Reads — called from route loaders
// ---------------------------------------------------------------------------

/** Every project owned by the caller. Scoping happens server-side, in the SQL. */
export const listProjects = createServerFn({ method: "GET" }).handler(() =>
  callBackend((client) => Effect.map(client.listProjects(undefined), (rows) => rows.map(plain))),
);

/** The signed-in user, straight from the backend. */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(() =>
  callBackend((client) => Effect.map(client.me(undefined), plain)),
);

// ---------------------------------------------------------------------------
// Writes — called from components, then `router.invalidate()`
// ---------------------------------------------------------------------------

/** Create a project owned by the caller. */
export const createProject = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(CreateProjectPayload))
  .handler(({ data }) => callBackend((client) => Effect.map(client.createProject(data), plain)));

/** Delete one of the caller's projects. Fails `ProjectNotFound` if it is not theirs. */
export const deleteProject = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(DeleteProjectPayload))
  .handler(({ data }) => callBackend((client) => client.deleteProject(data)));

/** Update the caller's display name and avatar. */
export const updateProfile = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(UpdateProfilePayload))
  .handler(({ data }) => callBackend((client) => Effect.map(client.updateProfile(data), plain)));
