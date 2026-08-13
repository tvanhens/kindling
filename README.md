# Kindling

An opinionated launchpad for building products on Cloudflare. Fork it, rename
the example entity, ship.

Kindling is not a library or a framework — it is a finished, working
application that happens to have nothing product-specific in it. Two Workers, a
D1 database, session auth, a typed end-to-end RPC contract, an SSR frontend, a
design-token-driven component set, and a deploy that is one command. Every
decision is already made, and the reasoning is in the code comments next to the
decision.

It is for you if you are starting a new product on Cloudflare and you would
rather spend the first week on your domain than on wiring auth to a database and
a database to a frontend.

## What you get out of the box

- **Registration and email+password sign-in**, with server-rendered session
  checks (`/register`, `/login`).
- **Password reset**, both halves of the flow — request and confirm
  (`/reset-password`). Email delivery is stubbed to `console.log`; see
  [Sharp edges](#sharp-edges).
- **Session management**: sign out, session invalidation on the router, cookie
  handling that works because everything is same-origin.
- **Profile management**: change your name and avatar over RPC, change your
  password through the auth client (`/app/settings/profile`).
- **Public marketing pages** (`/`, `/pricing`) that render without a session.
- **Guarded app pages** (`/app/*`) behind a structural route guard.
- **A worked CRUD example** — Projects: a table, an RPC group, a page, and
  multi-tenant scoping enforced in the SQL (`/app/dashboard`).
- **Light/dark theming** with no flash of the wrong theme, driven by design
  tokens.
- **CI** that typechecks, lints, format-checks and validates commit messages.

## The stack

| Piece                                                                                                   | Version                                | Why                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [bun](https://bun.sh)                                                                                   | 1.3.10                                 | Runtime, package manager and script runner. One tool.                                                        |
| [jj](https://jj-vcs.dev)                                                                                | 0.38, colocated with git               | VCS. See [CONTRIBUTING.md](./CONTRIBUTING.md); a plain git workflow also works.                              |
| [Alchemy](https://alchemy.run)                                                                          | 2.0.0-beta.72                          | Infrastructure as Effect. `alchemy.run.ts` _is_ the deploy: no wrangler.toml, no dashboard clicking.         |
| [Effect](https://effect.website)                                                                        | 4.0.0-rc.108 (pinned)                  | The backend's effect system, schema, RPC and HTTP layers — all from the core `effect` package.               |
| [Better Auth](https://better-auth.com)                                                                  | 1.6.27, via `@alchemy.run/better-auth` | Auth that owns its own tables and migrates itself at deploy time.                                            |
| [Cloudflare D1](https://developers.cloudflare.com/d1/)                                                  | —                                      | One SQLite database, created by the stack.                                                                   |
| [Drizzle](https://orm.drizzle.team)                                                                     | 1.0.0-rc.5                             | Typed SQL for _your_ tables. Migrations generated from `src/db/schema.ts`.                                   |
| [Effect RPC](https://effect.website) + [`@effect/atom-react`](https://github.com/tim-smart/effect-atom) | rc.108                                 | The browser↔backend contract and its React bindings. No TanStack Query, no REST layer, no codegen.           |
| [TanStack Start](https://tanstack.com/start)                                                            | 1.x on `Cloudflare.Website.Vite`       | File-based routing and SSR on a Worker.                                                                      |
| [StyleX](https://stylexjs.com)                                                                          | 0.19                                   | Atomic CSS compiled at build time, zero runtime. See [`src/styles/README.md`](./src/styles/README.md).       |
| [oxlint](https://oxc.rs) + [oxfmt](https://oxc.rs)                                                      | 1.x / 0.63                             | Lint and format. No ESLint, no Prettier, no commitlint, no husky — the whole toolchain is two Rust binaries. |

Two notes on what is _not_ here. `@effect/platform`, `@effect/rpc` and
`@effect/schema` are not used: in Effect 4 all of that lives in core `effect`,
under `effect/unstable/*` (`effect/unstable/rpc/RpcServer`,
`effect/unstable/http/HttpServerRequest`, …) and `effect/Schema`. And there is
no test framework wired up — add the one you like; nothing here fights it.

## Architecture

```
Browser
  │ same-origin
  ▼
Website worker (TanStack Start SSR)
  ├── (marketing)/  public          /, /pricing
  ├── (auth)/       public          /login, /register, /reset-password
  ├── _app.tsx      ← THE GUARD     /app/*
  ├── /rpc          ─┐ proxy: env.BACKEND.fetch(request)
  └── /api/auth/*   ─┤   forwards the ORIGINAL Request unchanged
                     ▼  (service binding, backend is private)
Backend worker (Effect, workersDev: false)
  ├── /api/auth/* → Better Auth  → D1 (owns user/session/account/verification)
  └── /rpc        → Effect RPC   → Drizzle → D1 (owns app tables)
```

Four things a forker has to understand before changing anything.

**The proxy forwards the original Request unchanged.** `src/routes/rpc.ts` and
`src/routes/api.auth.$.ts` are each one line: `env.BACKEND.fetch(request)`. Same
URL, same `Host`, same `Cookie`. That is what makes auth same-origin — the
session cookie is first-party, there is no CORS, and Better Auth derives its own
base URL and CSRF origin from the incoming headers. Which is why `baseURL` and
`trustedOrigins` are deliberately unset in `src/backend/api.ts`: setting them
would require the backend to know the Website's URL, and the Website already
binds the backend, so that is a dependency cycle. Read the "Public origin"
comment block in `src/backend/api.ts` before you touch this. If you reconstruct
the request or strip headers, sessions stop resolving.

**Two migrators, one D1.** Better Auth owns `user`, `session`, `account` and
`verification`, and migrates them itself through a deploy-time Action registered
by `BetterAuth({ migrate: true })` (the default) — additive and idempotent.
Drizzle owns your app tables and nothing else. **Never declare Better Auth's
tables in `src/db/schema.ts`.** That is the one rule that breaks things: both
migrators would emit DDL for the same tables and fight. App tables reference
`user.id` as a plain indexed `text` column, never a declared foreign key, because
the referenced table is not in Drizzle's snapshot. `src/backend/database.ts`
explains the ordering (`migrationsDir: schema.out` makes the D1 resource depend
on the schema resource, so SQL is regenerated before it is applied).

**The guard is structural.** `src/routes/_app.tsx` is a pathless layout route
whose `beforeLoad` resolves the session _during SSR_ and redirects to `/login`
if there is none. Every protected page is a file under `src/routes/_app/`, so it
inherits that `beforeLoad` by construction. You cannot accidentally add an
unguarded page under `/app`: a file outside `_app/` gets a URL outside `/app`,
which is the visible signal that it is public. The session lands in route
context, so children read `Route.useRouteContext().user` instead of re-fetching.

**Tenant scoping lives in the SQL.** Every projects query in
`src/backend/api.ts` filters on `eq(projects.ownerId, user.id)`, and the handler
gets `user` from `CurrentUser` — provided by the auth middleware, never from the
client payload. Delete uses `and(eq(projects.id, id), eq(projects.ownerId,
user.id))` so "not found" and "not yours" are indistinguishable to the caller.
Copy that shape for every entity you add. A post-filter in TypeScript, or a
helper a future handler forgets to call, is how tenants leak.

## Quickstart

You need [bun](https://bun.sh) 1.3.10+ and a Cloudflare account. jj is optional.

```bash
# 1. Fork, then clone your fork
git clone https://github.com/<you>/<your-fork>.git && cd <your-fork>

# 2. Install
bun install

# 3. Run it locally — Alchemy provisions local emulations of the two Workers
#    and D1, runs the migrations, and prints the local URL.
bun run dev
```

`bun run dev` needs no credentials and no `.env`. Register an account at
`/register`; email verification is off (`requireEmailVerification: false`), so
you land straight in `/app/dashboard`.

For the first deploy:

```bash
# One-time: authorize Alchemy against your Cloudflare account. This opens a
# browser and stores an OAuth profile on your machine.
bunx alchemy login

bun run deploy
```

If you skip `alchemy login`, the first `bun run deploy` runs that interactive
authorization itself, in the terminal. It needs a real TTY: Alchemy detects
`CI`, `CLAUDECODE` and friends and refuses to prompt, failing with "No
credentials configured for 'cloudflare' … run `alchemy login`". In CI, set
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` instead (see
[`.env.example`](./.env.example)).

Deploys are per-**stage**, and each stage gets its own Workers and its own D1
database. The default stage is `dev_$USER`; override it with `--stage`:

```bash
bunx alchemy plan --stage prod          # what would change
bunx alchemy deploy --yes --stage prod  # do it
bunx alchemy destroy --yes --stage prod # tear the whole stage down
```

The deploy prints the Website's URL. The backend Worker has no public hostname
(`workersDev: false`) — it is only reachable through the service binding.

Two things to know about state. Alchemy keeps its resource state locally
(`Alchemy.localState()` in `alchemy.run.ts`, under `.alchemy/`, gitignored), so a
CI runner cannot deploy your stage without a durable state store — that is why
the deploy job in `.github/workflows/ci.yml` is commented out rather than
enabled. And the Better Auth signing secret is an auto-provisioned
`Alchemy.Random` resource, generated once and kept in that state, so there is no
secret to set for a first deploy.

## How do I…

### …add a public page

Drop a file in `src/routes/(marketing)/` or `src/routes/(auth)/`. Parenthesized
directories are route _groups_: they organize files without adding a URL
segment, so `src/routes/(marketing)/pricing.tsx` serves `/pricing`. The route
tree in `src/routeTree.gen.ts` is regenerated by the dev server; do not edit it.

```tsx
// src/routes/(marketing)/about.tsx
import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "~/client/chrome";
import { Heading, Stack } from "~/components";

export const Route = createFileRoute("/(marketing)/about")({
  head: () => ({ meta: [{ title: "About — Kindling" }] }),
  component: () => (
    <MarketingLayout>
      <Stack gap="lg">
        <Heading level={2} as="h1">
          About
        </Heading>
      </Stack>
    </MarketingLayout>
  ),
});
```

### …add a guarded page

Same thing, but under `src/routes/_app/app/`. It inherits the guard, and the
signed-in user is already in route context:

```tsx
// src/routes/_app/app/billing.tsx
export const Route = createFileRoute("/_app/app/billing")({
  component: () => {
    const { user } = Route.useRouteContext();
    return <Text>{user.email}</Text>;
  },
});
```

If you want it in the header, add the path to the `AppPath` union and a
`<NavLink>` in `src/routes/_app.tsx`.

### …add an RPC procedure

Three edits, in this order — the type errors walk you through it.

1. **Declare it** in `src/backend/rpc.ts`, inside `RpcGroup.make(...)`. Note the
   `.middleware(AuthMiddleware)` at the end of the group: it applies to every
   rpc added _before_ the call, so a procedure appended inside the group is
   guarded automatically. For a genuinely public procedure, build a second
   group and `.merge()` it rather than appending here.

   ```ts
   Rpc.make("renameProject", {
     payload: { id: Schema.String, name: Schema.String },
     success: Project,
     error: ProjectNotFound,
   }),
   ```

2. **Implement it** in the `AppRpcs.toLayer({ … })` object in
   `src/backend/api.ts`. Use `Effect.fn("name")`, get the caller from
   `CurrentUser`, and scope the SQL by `ownerId`.

3. **Expose it** in `src/client/rpc.ts` — `Rpc.mutation("renameProject")` for a
   write, or the local `query(...)` helper for a read (see
   [Sharp edges](#sharp-edges) for why reads do not use `Rpc.query`). Then call
   it from a component with `useAtom` / `useAtomValue`, passing
   `reactivityKeys: [keys.projects]` on the mutation so dependent queries
   re-run. `src/routes/_app/app/dashboard.tsx` is the worked example.

Keep `src/backend/rpc.ts` free of server-only imports — it ships to the browser.
The one `import type { RuntimeContext }` there is erased at compile time.

### …add a table and a migration

Add it to `src/db/schema.ts` (app tables only — see the ownership split above),
then:

```bash
bun run db:generate   # drizzle-kit generate → ./migrations/*.sql
```

Commit the generated SQL. The next `bun run dev` / `bun run deploy` applies
whatever is pending, tracked in the `drizzle_migrations` table. You do not have
to run `db:generate` by hand — `Drizzle.Schema` in `src/backend/database.ts`
regenerates migrations at deploy time from the same schema/out/dialect — but
running it explicitly lets you read the SQL before it ships. Keep
`drizzle.config.ts` in sync with the `Drizzle.Schema` props; it exists only for
the CLI and editor tooling.

### …add an OAuth provider

Better Auth options pass straight through `BetterAuth({ … })` in
`src/backend/api.ts`, so it is `socialProviders`:

```ts
const auth = yield* BetterAuth({
  basePath: "/api/auth",
  emailAndPassword: { … },
  socialProviders: {
    github: {
      clientId: yield* Config.string("GITHUB_CLIENT_ID"),
      clientSecret: yield* Config.redacted("GITHUB_CLIENT_SECRET"),
    },
  },
});
```

`yield*`-ing an `effect/Config` in a Worker's init phase registers the binding
on that Worker: `Config.redacted` becomes a `secret_text` binding at deploy time,
resolved from your environment (and from `.env`, which Alchemy loads). Put the
values in `.env` locally and in repository secrets for CI.

The callback URL is `https://<your-website-host>/api/auth/callback/github` —
the _Website's_ origin, not the backend's, because that is where the browser
goes and the proxy forwards it verbatim. On the client, add a button that calls
`authClient.signIn.social({ provider: "github" })` (`src/client/auth.ts`).

### …wire real email

Two `TODO(email)` sites in `src/backend/api.ts`, and that is all:
`emailAndPassword.sendResetPassword` and
`emailVerification.sendVerificationEmail`. Both currently `console.log` the link
so a fresh fork runs offline. Replace them with your provider — Cloudflare Email
Sending via a `send_email` binding, Resend, Postmark, SES — declare the
key alongside (`yield* Config.redacted("RESEND_API_KEY")` in the init phase, or
on the Worker's `env`), then flip `requireEmailVerification: true` and, if you
want verification on signup, `emailVerification.sendOnSignUp: true`.

Until you do, `/reset-password` tells the user exactly that, and the link shows
up in the dev server output (or `bun run tail` on a deployed stage).

### …change the theme or tokens

Everything themeable is a `defineVars` entry in
`src/styles/tokens.stylex.ts`; the dark overrides are in `src/styles/themes.ts`.
Change a hex value in both and the whole app follows. To add a token, add it to
the `defineVars` group _and_ the matching `createTheme` override — `createTheme`
is typed against the group, so TypeScript points at anything you forget.

Read [`src/styles/README.md`](./src/styles/README.md) first. The rule that
bites: a `*.stylex.ts` file may contain _only_ `defineVars`/`defineConsts`
exports — adding a type or a helper there breaks the build for the whole app.
And never put a `className` next to a `stylex.props()` spread on the same
element; the last one wins and styles vanish silently.

### …rename the Projects entity

Projects is the example. To make it yours, in order:

1. `src/db/schema.ts` — rename the table and its index, then `bun run db:generate`.
   (In a fresh fork with no deployed data, delete the generated `migrations/`
   directory first so you get one clean initial migration.)
2. `src/backend/rpc.ts` — rename the `Project` class, `ProjectNotFound`, and the
   three `Rpc.make` declarations.
3. `src/backend/api.ts` — rename the handlers; keep the `ownerId` filters.
4. `src/client/rpc.ts` — rename the atoms and the `keys.projects` reactivity key.
5. `src/routes/_app/app/dashboard.tsx` — the page.

`bun run check` tells you when you are done.

## Project layout

```
alchemy.run.ts              The stack: Website worker + service binding to Backend.
drizzle.config.ts           drizzle-kit CLI config (deploy path does not read it).
vite.config.ts              StyleX before React; Alchemy adds its own CF plugin.
migrations/                 Generated SQL. Commit it. (Absent until first generate.)
src/
  backend/
    api.ts                  The Backend worker: path dispatch, Better Auth, auth
                            middleware, RPC handlers, the RPC server.
    rpc.ts                  The shared contract. No server-only imports — the
                            browser imports this same module.
    database.ts             The D1 database + Drizzle schema resource.
  db/schema.ts              App tables only. Read the ownership note at the top.
  client/
    rpc.ts                  Atoms over the RPC contract; the `query` workaround.
    auth.ts                 Better Auth browser client + redirect sanitizing.
    theme.tsx               Color scheme, incl. the pre-paint init script.
    chrome.tsx              Page shells: marketing header/footer, auth card.
  components/               UI primitives (Button, Card, Field, Stack, Text, …).
  routes/
    __root.tsx              Document shell, error boundary, 404.
    _app.tsx                THE GUARD.
    _app/app/**             Guarded pages.
    (marketing)/**          Public pages.
    (auth)/**               Login, register, reset password.
    rpc.ts                  One-line proxy to the backend.
    api.auth.$.ts           One-line splat proxy to Better Auth.
  styles/                   Tokens, themes, breakpoints, reset. Has its own README.
  router.tsx                getRouter(); one Atom registry per request.
scripts/                    Conventional-commit validators (bash, no deps).
.github/workflows/          CI: typecheck, lint, format, commit messages.
.jj-config.toml             Opt-in jj config. See CONTRIBUTING.md.
```

## Scripts

| Command                       | What it does                                                              |
| ----------------------------- | ------------------------------------------------------------------------- |
| `bun run dev`                 | `alchemy dev --yes` — local Workers + D1, migrations applied, hot reload. |
| `bun run plan`                | Dry-run the stack. **Takes no `--yes`.**                                  |
| `bun run deploy`              | Deploy the current stage.                                                 |
| `bun run destroy`             | Tear the current stage down.                                              |
| `bun run logs`                | Alchemy's stored logs for the stack.                                      |
| `bun run tail`                | Live-tail a deployed Worker.                                              |
| `bun run typecheck`           | `tsc --noEmit`.                                                           |
| `bun run lint` / `lint:fix`   | oxlint (with the StyleX rules).                                           |
| `bun run fmt` / `fmt:check`   | oxfmt.                                                                    |
| `bun run check`               | typecheck + lint + fmt:check. What CI runs.                               |
| `bun run db:generate`         | drizzle-kit generate → `./migrations`.                                    |
| `bun run commits:lint`        | Validate commit messages in `trunk()..@`.                                 |
| `bun run commit:lint "<msg>"` | Validate one message.                                                     |

Extra flags pass through: `bun run deploy --stage prod`, or call the CLI
directly with `bunx alchemy …`.

## Sharp edges

These are real, they are deliberate, and you will hit them. Nothing here is
hidden in a comment you have to discover.

**Effect 4 is a release candidate; Alchemy v2 is a beta.** Both are pinned to
exact versions in `package.json` on purpose. Effect 3 is _not_ compatible with
Alchemy v2. If you bump `effect`, you must bump `@effect/atom-react` and the
`@effect/platform-*` packages to the matching version in the same commit —
they share a version line and mixing them produces type errors that look like
they are in your code.

**Alchemy's optional peers must stay installed.** `@effect/platform-bun`,
`@effect/platform-node` and `@effect/platform-node-shared` are optional peer
dependencies of `alchemy`, listed here as direct dependencies. Prune them as
"unused" and the CLI dies with `Cannot find module`.

**`RpcServer.layerHttp` defaults to websocket.** This repo uses
`RpcServer.toHttpEffect` instead. If you switch to `layerHttp` and forget
`protocol: "http"`, every POST to `/rpc` silently 404s with no error anywhere.

**Do not delete the type annotation on `rpcServer`** in `src/backend/api.ts`.
Alchemy's Worker type accepts a `fetch` with an unconstrained requirement
channel, so a missing service inside `fetch` is not a type error — it is a
runtime failure in production. The explicit
`Effect.Effect<…, never, Scope.Scope | RuntimeContext>` annotation restores the
check: if a handler or middleware layer is missing, that line stops compiling.

**`Rpc.query()` from AtomRpc is unusable here.** In effect 4.0.0-rc.108,
`AtomRpc`'s `query` helper matches procedures against a five-parameter
`Rpc.Rpc<Tag, Payload, Success, Error, Middleware>`, omitting the sixth
(`Requires`). `AuthMiddleware` declares `requires: RuntimeContext`, so our
procedures carry a non-`never` `Requires`, the conditional fails to match, and
`query` resolves to `never`. `src/client/rpc.ts` defines a local `query()`
helper — `Rpc.runtime.atom` + `Atom.withReactivity`, which is what `query` does
internally. `mutation` infers all six parameters and is fine. When the upstream
conditional is fixed, delete the helper and collapse each call back to a
one-line `Rpc.query(...)`.

**Email is stubbed.** `requireEmailVerification: false` and both send functions
`console.log` the link, so a fresh fork runs offline. See
[…wire real email](#wire-real-email). Do not ship a product with this as-is.

**jj has no hooks, so commit conventions are enforced only in CI.** jj cannot
run git hooks even in a colocated repo, and repo-level jj config lives outside
the working copy so it cannot be committed. husky/lefthook/pre-commit do not
work here. `.jj-config.toml` is an opt-in local convenience;
`.github/workflows/commits.yml` is the enforcement. See
[CONTRIBUTING.md](./CONTRIBUTING.md).

**Deploy-time behaviour is reasoned, not yet observed.** The two-migrator split
and Better Auth's origin inference through the service binding are derived from
the types and from `alchemy plan` — they have not been verified against a real
`alchemy deploy` against a real Cloudflare account. `bun run dev` exercises the
local path. Treat your first deploy as the experiment it is, and check
`/api/auth/get-session` and a signed-in `/rpc` round trip before building on top.

## Contributing and agents

- [CONTRIBUTING.md](./CONTRIBUTING.md) — the jj workflow, conventional commits,
  running the checks.
- [AGENTS.md](./AGENTS.md) — what a coding agent needs to know before writing
  Effect 4 code in this repo.

## License

MIT. See [LICENSE](./LICENSE).
