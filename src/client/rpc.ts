/**
 * The browser half of the RPC contract.
 *
 * `AppRpcs` is imported from `~/backend/rpc` — the *same value* the Worker
 * serves. That is the whole point of keeping `src/backend/rpc.ts` free of
 * server-only imports: there is one description of the API, and both ends are
 * checked against it. Rename an rpc or change a payload and this file stops
 * compiling before anything reaches production.
 *
 * The transport is a plain HTTP POST to `/rpc` on *this* origin. `src/routes/rpc.ts`
 * forwards it to the private backend Worker over the service binding, so the
 * session cookie travels as a first-party cookie and there is no CORS.
 */
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as Atom from "effect/unstable/reactivity/Atom";
import * as AtomRpc from "effect/unstable/reactivity/AtomRpc";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";

import { AppRpcs } from "~/backend/rpc";

/**
 * The RPC client, exposed as atoms.
 *
 * `AtomRpc.Service` builds three things at once: the flattened client, an atom
 * runtime that owns its lifecycle, and the `.query()` / `.mutation()` helpers
 * used below. `AuthMiddleware` declares `requiredForClient: false`, so there is
 * no client-side middleware half to provide here — the session rides along in
 * the cookie.
 */
export class Rpc extends AtomRpc.Service<Rpc>()("kindling/client/Rpc", {
  group: AppRpcs,
  // JSON over HTTP. `RpcSerialization.layerJson` must match the server's
  // serialization in `src/backend/api.ts`, and `layerProtocolHttp` must point at
  // the proxy route, never at the backend Worker directly.
  protocol: RpcClient.layerProtocolHttp({
    url: "/rpc",
    // The client issues `post("")` against the base URL, which resolves to
    // `/rpc/` — with a trailing slash. TanStack Start normalizes trailing
    // slashes away when matching server routes, so `/rpc/` never matches the
    // `/rpc` proxy: every call 404s and surfaces as the *very* misleading
    // "RpcClientDefect: Error decoding HTTP response" (the client parsing a 404
    // HTML page as JSON). Strip it here so the request matches the route.
    transformClient: HttpClient.mapRequest((request) =>
      HttpClientRequest.setUrl(request, request.url.replace(/\/+$/, "")),
    ),
  }).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson])),
}) {}

/**
 * Reactivity keys.
 *
 * A query declares the keys it depends on; a mutation declares the keys it
 * invalidates. After the mutation succeeds every mounted query holding a
 * matching key re-runs. This is the only wiring needed to keep a list fresh
 * after a create/delete — no manual refetch, no cache surgery.
 */
export const keys = {
  projects: "projects",
  user: "user",
} as const;

// ---------------------------------------------------------------------------
// Atoms
//
// Every atom is created ONCE at module scope, never inside a component: an atom
// is an identity, and building a new one per render would restart the request
// on every commit.
// ---------------------------------------------------------------------------

/**
 * Query atoms are built from `Rpc.runtime.atom` rather than `Rpc.query(...)`.
 *
 * This is a workaround for a type-level bug in effect 4.0.0-rc.108, not a style
 * preference. `AtomRpc`'s `query` helper matches each procedure against
 * `Rpc.Rpc<Tag, Payload, Success, Error, Middleware>` — five type parameters,
 * omitting the sixth (`Requires`). `AuthMiddleware` in `~/backend/rpc` declares
 * `requires: RuntimeContext`, so our procedures carry a non-`never` `Requires`,
 * the conditional type fails to match, and `query` resolves to `never`. Its
 * sibling `mutation` infers all six parameters and is unaffected, which is why
 * the mutations below use it directly.
 *
 * `runtime.atom` + `Atom.withReactivity` is the same machinery `query` uses
 * internally: run the effect, expose it as an `AsyncResult`, and re-run when one
 * of the declared keys is invalidated. Once the upstream conditional is fixed,
 * each of these collapses back to a one-line `Rpc.query(...)` call.
 */
const query = <A, E>(effect: Effect.Effect<A, E, Rpc>, reactivityKeys: ReadonlyArray<string>) =>
  Atom.withReactivity(reactivityKeys)(Rpc.runtime.atom(effect));

/** The signed-in user, straight from the server. */
export const currentUserAtom = query(
  Effect.gen(function* () {
    const client = yield* Rpc;
    return yield* client("me", undefined);
  }),
  [keys.user],
);

/** Every project owned by the caller. Scoping happens server-side. */
export const projectsAtom = query(
  Effect.gen(function* () {
    const client = yield* Rpc;
    return yield* client("listProjects", undefined);
  }),
  [keys.projects],
);

/** Create a project, then invalidate {@link projectsAtom}. */
export const createProjectAtom = Rpc.mutation("createProject");

/** Delete a project, then invalidate {@link projectsAtom}. */
export const deleteProjectAtom = Rpc.mutation("deleteProject");

/** Update name/avatar, then invalidate {@link currentUserAtom}. */
export const updateProfileAtom = Rpc.mutation("updateProfile");

/**
 * Reduce a failed `AsyncResult`'s cause to one line for an `Alert`.
 *
 * Every error the contract can produce (`Unauthorized`, `ProjectNotFound`) is a
 * `Schema.TaggedError`, which extends `Error`, as is `RpcClientError`. Anything
 * else is a defect and gets a deliberately dull fallback rather than leaking an
 * internal representation into the UI.
 */
export function rpcErrorMessage(cause: Cause.Cause<unknown>): string {
  const error: unknown = Cause.squash(cause);
  if (error instanceof Error && error.message !== "") return error.message;
  if (typeof error === "string" && error !== "") return error;
  return "The request failed. Please try again.";
}
