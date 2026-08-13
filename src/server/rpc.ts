/**
 * The **server-only** half of the RPC contract.
 *
 * Kindling has exactly one data layer: TanStack Start. Route loaders read,
 * server functions write, `router.invalidate()` refreshes. Nothing in the
 * browser speaks RPC — the browser calls a server function, and *this* module
 * is the hop that turns that into a typed Effect RPC call against the private
 * backend Worker.
 *
 *   Browser  ──fetch──▶  Website worker   (TanStack loader / server function)
 *   Website  ──RPC───▶   Backend worker   (env.BACKEND, the service binding)
 *
 * Two consequences worth internalising before editing this file:
 *
 *  1. **Loaders run in the browser too**, on client-side navigation, where
 *     `env.BACKEND` does not exist. Every call into here must therefore sit
 *     behind a `createServerFn` handler (see `src/server/api.ts`). The static
 *     `cloudflare:workers` import below is safe *because of* that: the Start
 *     compiler replaces server-function bodies with fetch stubs in the client
 *     build, nothing is left referencing `env`, and the import is dropped.
 *     It must stay a static import — a dynamic `await import()` is not
 *     externalised by rolldown and breaks the build.
 *
 *  2. There is no public `/rpc` route any more. The RPC surface is reachable
 *     only over the service binding, from our own server code.
 */
import { getRequestHeader, getRequestUrl } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as RpcClient from "effect/unstable/rpc/RpcClient";
import * as RpcSerialization from "effect/unstable/rpc/RpcSerialization";

import { AppRpcs, ProjectNotFound, Unauthorized } from "~/backend/rpc";

// ---------------------------------------------------------------------------
// The error convention
//
// Server functions serialize their *return value*; a thrown Effect failure does
// not survive the boundary as anything a component can switch on. So failures
// are values here: every helper in `src/server/api.ts` returns an `RpcResult`,
// and callers narrow on `_tag`.
//
// `RpcFailure` mirrors the contract's tagged errors one-for-one, plus a
// `BackendError` catch-all for transport faults and defects. Every variant
// carries a `message` so a component can render an <Alert> without a switch,
// while `_tag` is still there when it wants to handle a specific case.
// ---------------------------------------------------------------------------

/** A backend failure, flattened into something serializable. */
export type RpcFailure =
  | { readonly _tag: "Unauthorized"; readonly message: string }
  | { readonly _tag: "ProjectNotFound"; readonly id: string; readonly message: string }
  | { readonly _tag: "BackendError"; readonly message: string };

/** The result of an RPC call, as it crosses the server-function boundary. */
export type RpcResult<A> =
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly failure: RpcFailure };

/**
 * Reduce a failed `Cause` to an {@link RpcFailure}.
 *
 * The contract's errors are `Schema.TaggedError` classes, and the RPC client
 * decodes them back into real instances on this side of the wire — so
 * `instanceof` is an honest test, not a string sniff. Anything else (transport
 * error, defect, decode failure) is deliberately dulled down: internal shapes
 * do not belong in the UI.
 */
function toFailure(cause: Cause.Cause<unknown>): RpcFailure {
  const error: unknown = Cause.squash(cause);

  if (error instanceof Unauthorized) {
    return { _tag: "Unauthorized", message: error.message };
  }
  if (error instanceof ProjectNotFound) {
    return { _tag: "ProjectNotFound", id: error.id, message: "That project no longer exists." };
  }
  if (error instanceof Error && error.message !== "") {
    return { _tag: "BackendError", message: error.message };
  }
  return { _tag: "BackendError", message: "The request failed. Please try again." };
}

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------

/**
 * `fetch` that goes to the backend Worker over the service binding.
 *
 * Not a public URL: the backend sets `workersDev: false` and has no hostname.
 * `env.BACKEND.fetch` is a direct isolate-to-isolate call — no DNS, no TLS, no
 * CORS, and nothing on the public internet to attack.
 */
const backendFetch: typeof globalThis.fetch = (input, init) =>
  env.BACKEND.fetch(new Request(input, init));

/**
 * The transport layer for one request.
 *
 * Built per request because both halves are request-scoped:
 *
 *  - **the URL** is `/rpc` on the *incoming* origin. Better Auth derives its
 *    base URL from the `Host` header (`baseURL`/`trustedOrigins` are unset on
 *    purpose — see `src/backend/api.ts`), so handing the backend a made-up host
 *    would change how it resolves the session. What actually goes out is
 *    `POST /rpc/`: the client issues `post("")` and `prependUrl` joins the two
 *    segments with a slash. The backend's dispatch accepts both spellings,
 *    which is cheaper and more honest than rewriting the URL back here.
 *  - **the cookie** is forwarded explicitly. The service binding is a fresh
 *    request, not a proxied one; without this header the auth middleware sees
 *    an anonymous caller and every rpc fails with `Unauthorized`.
 */
function transportLayer(url: string, cookie: string | undefined) {
  return RpcClient.layerProtocolHttp({
    url,
    transformClient: HttpClient.mapRequest(
      cookie === undefined
        ? HttpClientRequest.setHeader("accept", "application/json")
        : HttpClientRequest.setHeaders({ accept: "application/json", cookie }),
    ),
  }).pipe(
    Layer.provide([
      // Swap the fetch implementation for the service binding. `RpcSerialization`
      // must stay `layerJson` — it has to match the server's in `src/backend/api.ts`.
      FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, backendFetch))),
      RpcSerialization.layerJson,
    ]),
  );
}

/**
 * Strip a decoded schema class down to a plain object.
 *
 * TanStack Start serializes loader and server-function results with seroval,
 * which handles `Date`, `Map` and `Set` as real instances but refuses an
 * unknown class prototype outright ("The value [object Object] ... cannot be
 * parsed/serialized"). `Project` and `User` arrive here as `Schema.Class`
 * instances, whose own properties are exactly the declared fields — so a spread
 * is a complete, lossless conversion, and the `Date` fields stay `Date`s.
 *
 * Apply it to every schema class that crosses the boundary; primitives and
 * arrays of plain objects need nothing.
 */
export const plain = <A extends object>(value: A): { [K in keyof A]: A[K] } => ({ ...value });

const makeClient = RpcClient.make(AppRpcs);

/** The typed client, exactly as generated from {@link AppRpcs}. */
export type AppRpcClient = Effect.Success<typeof makeClient>;

/**
 * Run one RPC against the backend and flatten the outcome into an
 * {@link RpcResult}.
 *
 * Call this **only** from inside a `createServerFn` handler: it reads the
 * request headers and touches `env`, neither of which exists in the browser.
 *
 * ```ts
 * const projects = await callBackend((client) => client.listProjects(undefined));
 * ```
 */
export function callBackend<A, E>(
  use: (client: AppRpcClient) => Effect.Effect<A, E>,
): Promise<RpcResult<A>> {
  const url = new URL("/rpc", getRequestUrl()).toString();
  const cookie = getRequestHeader("cookie");

  return Effect.gen(function* () {
    const client = yield* makeClient;
    return yield* use(client);
  }).pipe(
    Effect.map((value): RpcResult<A> => ({ _tag: "Success", value })),
    // `catchCause` — not `catch` — so a defect on either side of the wire lands
    // in the same place as a declared error. Nothing escapes as a thrown value.
    Effect.catchCause((cause) =>
      Effect.succeed<RpcResult<A>>({ _tag: "Failure", failure: toFailure(cause) }),
    ),
    Effect.provide(transportLayer(url, cookie)),
    Effect.scoped,
    Effect.runPromise,
  );
}
