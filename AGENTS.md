# AGENTS.md

Instructions for coding agents working in Kindling (or a fork of it). Read
[README.md](./README.md) for what the app is and how it fits together; this file
covers the things that will make you write broken code if you do not know them.

## Effect 4 is not Effect 3, and the internet only knows Effect 3

This repo pins `effect@4.0.0-rc.108`. Effect 4 renamed, moved or deleted a large
part of the v3 surface, and **effect.website documents v3**. Anything you
remember, and anything a search turns up, is likely to be wrong here.

The authoritative reference is installed locally:

- `node_modules/effect/AGENTS.md` — the short guide. Read it before writing
  Effect code.
- `node_modules/effect/ai-docs/src/**` — runnable examples per topic
  (`01_effect/`, `50_http-client/`, `51_http-server/`, `08_observability/`, …).
- `node_modules/effect/src/**` — the source, with doc comments. When in doubt,
  grep it. This is faster and more reliable than guessing.

Do not add `@effect/platform`, `@effect/rpc` or `@effect/schema`. In v4 all of
that is in core `effect`, under `effect/unstable/*` and `effect/Schema`. This
repo imports e.g. `effect/unstable/rpc/RpcServer`,
`effect/unstable/rpc/RpcClient`, `effect/unstable/http/HttpServerRequest`.

### The v3 → v4 renames that bite

| Effect 3                                             | Effect 4                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Effect.Service` (with a generated `.Default` layer) | `Context.Service`; **no `.Default`** — define `static readonly layer = Layer.effect(...)` yourself |
| `HttpApiBuilder.toWebHandler`                        | `HttpRouter.toWebHandler`                                                                          |
| `Schema.decodeUnknown`                               | `Schema.decodeUnknownEffect` (also `decodeUnknownOption`, …)                                       |
| `Either`                                             | `Result` (`effect/Result`)                                                                         |
| `Effect.catchAll`                                    | `Effect.catch`                                                                                     |

Also standard in v4 and used throughout this repo: `Effect.gen` for sequencing,
`Effect.fn("name")` for functions that return an Effect (it names the span and
improves stack traces — do not `.pipe` an `Effect.fn`, pass combinators as extra
arguments), and `Schema.TaggedError` for errors that cross the wire.

## Invariants you must not break

Each of these is explained at length in a comment at the site. Read the comment
before changing the code; if a change seems to require breaking one, stop and
ask.

1. **The Drizzle / Better Auth table split.** Better Auth owns `user`,
   `session`, `account`, `verification` and migrates them itself. `src/db/schema.ts`
   contains app tables only, and references `user.id` as a plain indexed `text`
   column — never a Drizzle `references()` foreign key. Adding an auth table to
   the Drizzle schema makes the two migrators fight.

2. **The `rpcServer` annotation in `src/backend/api.ts`.** The explicit
   `Effect.Effect<…, never, Scope.Scope | RuntimeContext>` type is load-bearing:
   Alchemy's Worker type does not constrain `fetch`'s requirement channel, so
   without it a missing service is a production runtime failure instead of a
   compile error. Do not delete or widen it.

3. **The structural guard.** Protected pages are files under
   `src/routes/_app/`; the `beforeLoad` in `src/routes/_app.tsx` resolves the
   session during SSR. Never add a client-only auth check, and never add a page
   under `/app` outside `_app/`.

4. **`src/routes/api.auth.$.ts` forwards the original `Request` unchanged.**
   It is `env.BACKEND.fetch(request)` and nothing else. Rebuilding the request,
   changing the URL, or filtering headers breaks session resolution and Better
   Auth's origin inference (`baseURL`/`trustedOrigins` are deliberately unset).
   It exists because Better Auth's React client runs in the _browser_. There is
   no equivalent proxy for RPC: the browser never speaks RPC, so
   `src/server/rpc.ts` calls the binding itself and forwards the `Cookie`
   header and the incoming origin by hand.

5. **Tenant scoping stays in the SQL.** `eq(projects.ownerId, user.id)` in the
   query itself; deletes use `and(eq(id), eq(ownerId))`. Identity comes from
   `CurrentUser`, never from a client payload. Do not "simplify" this into a
   post-filter or a shared helper that a handler can forget to call.

6. **`src/backend/rpc.ts` has no server-only imports.** It is imported by the
   Website Worker as well as the backend one. The single
   `import type { RuntimeContext }` is erased at compile time; a value import of
   `alchemy/*`, `better-auth` or `drizzle-orm` there breaks the Website build.

7. **`*.stylex.ts` files contain only `defineVars`/`defineConsts` exports.** A
   type, helper or constant in one of those files breaks the build for the whole
   app. Never put a `className` next to a `stylex.props()` spread on the same
   element. See `src/styles/README.md`.

8. **No new dependencies without asking.** The dependency list is short on
   purpose: no ESLint, no Prettier, no commitlint, no husky, no test framework.
   `effect` and the `@effect/platform-*` packages are pinned and must be
   bumped in lockstep; `@effect/platform-bun`,
   `-node` and `-node-shared` are optional peers of Alchemy that must stay
   installed or the CLI fails with `Cannot find module`.

## Running commands

`bun run check` (typecheck + lint + fmt:check) is the gate. Run it before you
report a task complete.

Alchemy detects agent and CI environments — it checks `CLAUDECODE`,
`CLAUDE_CODE_ENTRYPOINT`, `CURSOR_AGENT`, `AIDER_MODEL`, `CODEX_CLI`, `CI` and a
non-TTY stdout — and refuses to render prompts. Consequences:

- `deploy` and `destroy` need `--yes`, or they fail at the confirmation prompt.
  The `bun run deploy` / `bun run destroy` scripts already pass it.
- **`plan` does not accept `--yes`.** Passing it is an error. Use
  `bun run plan` (which is plain `alchemy plan`) to inspect a change safely; it
  never mutates anything.
- If no Cloudflare credentials are configured, Alchemy will not run the
  interactive login for you — it fails with a message telling the _human_ to run
  `alchemy login`. Do not try to work around this; surface it to the user.

Prefer `bun run plan` over `bun run deploy` when you are checking your work.
Never deploy or destroy a stage unless the user asked for it.

## Driving the UI with Playwright

`.mcp.json` registers the Playwright MCP server, so you can exercise the real
UI instead of guessing at it. It runs `--headless --isolated`: no window opens,
and the browser profile is held in memory, so **every session starts signed
out** — which is what you want when testing registration and login.

The dev server is not started for you. Run `bun run dev` first and drive
**http://localhost:1338** (the Website worker). Port 1337 is the private
backend; hitting it directly bypasses the proxy, so cookies and the auth origin
behave differently. Use 1337 only to isolate whether a fault is in the Website
or the backend.

Worth exercising, because none of it is covered by `bun run check`:

- register → land on `/app/dashboard` → sign out → sign back in
- visiting `/app/dashboard` signed out redirects to `/login?redirect=…`, and
  the redirect is honored after login
- create and delete a project, and confirm the list updates without a manual
  refresh (mutations `await router.invalidate()`, which re-runs the loader)
- `browser_console_messages` at level `error` after each flow — hydration
  mismatches and serialization failures surface there and nowhere else

Do not hand-write Effect RPC envelopes to test the API. The wire format is
internal and easy to get wrong (it wants `headers: []` — an array of pairs —
and a single request object, not an array). Drive the UI, or build a client
from `AppRpcs` with `RpcClient.make`.

### The service binding goes stale after a hot reload

`alchemy dev` watches and restarts the workers on edit, but the Website's
service binding to the backend does **not** survive the backend restarting.
Symptom: every proxied request returns `503` with

```
Worker "kindling-backend-dev-…" not found. Make sure the worker is running locally.
```

Diagnose it by comparing the two ports — the backend on `:1337` answers `200`
while the same request through `:1338` gives `503`. That means the backend is
healthy and only the binding is dead.

There is no fix in this repo; it is an Alchemy local-dev limitation. **Restart
`alchemy dev`.** Do not go looking for a bug in the auth or RPC code — it will
look exactly like one.

## Where to look

| Question                       | File                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| How are the two Workers wired? | `alchemy.run.ts`, `src/backend/api.ts`                                  |
| What does the API look like?   | `src/backend/rpc.ts` (the shared contract)                              |
| How do I add a table?          | `src/db/schema.ts`, `src/backend/database.ts`                           |
| How does the browser get data? | `src/server/api.ts` (loaders + server fns), `src/server/rpc.ts`         |
| How does auth work end to end? | `src/routes/_app.tsx`, `src/routes/api.auth.$.ts`, `src/backend/api.ts` |
| Styling rules                  | `src/styles/README.md`                                                  |
| Lint configuration and why     | `.oxlintrc.json` (it is commented)                                      |
| Commit message rules           | `CONTRIBUTING.md`, `scripts/check-commit-message.sh`                    |

The code comments in this repo are the design documentation — they record why a
thing is the way it is, not what it does. When you change code with a comment
above it, update the comment or explain why it still holds.

## Known upstream bugs already worked around

Do not "fix" these back to the obvious form without checking the upstream
version first.

- The RPC client posts to `/rpc/`, with a trailing slash: it issues `post("")`
  against the configured base URL and `HttpClientRequest.prependUrl` joins the
  two segments with a slash. `src/backend/api.ts` accepts `/rpc` and `/rpc/`
  rather than rewriting the URL back on the caller's side.
- seroval (TanStack Start's serializer) refuses an unknown class prototype, so
  a decoded `Schema.Class` cannot cross a loader or server-function boundary as
  an instance. `plain()` in `src/server/rpc.ts` spreads it into an object; its
  `Date` fields survive as `Date`s.
- `RpcServer.layerHttp` defaults to `protocol: "websocket"`; the repo uses
  `RpcServer.toHttpEffect`. Switching to `layerHttp` without `protocol: "http"`
  makes every POST to `/rpc` 404 silently.
- The RPC server effect is built inside `fetch`, not in the Worker's init phase,
  because `toHttpEffect` bakes its context in at build time and the auth
  middleware needs the request-scoped `RuntimeContext`.

## Honest state of the template

Deploy-time behaviour — the two-migrator split, and Better Auth inferring its
public origin through the service binding — is reasoned from the types and from
`alchemy plan`. It has **not** been observed against a real Cloudflare deploy.
`bun run dev` exercises the local path. If you are asked to verify deploy
behaviour, say what was actually run rather than asserting it works.
