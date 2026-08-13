# Kindling

A template for building products on Cloudflare. Fork it, rename the example
entity, ship.

It is a working application with nothing product-specific in it: two Workers, a
D1 database, session auth, a typed internal API, a documented public one, an SSR
frontend, and a one-command deploy.

## What is in it

- Registration, sign-in, sign-out, password reset and profile management
- Public marketing pages, and `/app/*` pages behind a server-resolved guard
- A worked CRUD example (Projects) with tenant scoping enforced in SQL
- A public REST API at `/v1` with API keys, rate limits, an OpenAPI document
  and a reference at `/docs`
- Light and dark themes, design tokens, accessible form primitives
- CI that typechecks, lints, checks formatting and validates commit messages

## Quickstart

Needs [bun](https://bun.sh) 1.3.10+.

```bash
bun install
bun run dev
```

No credentials and no `.env` required: Alchemy emulates both Workers and D1
locally and applies the migrations. Register at `/register` and you land in
`/app/dashboard` — email verification is off until you wire a provider.

To deploy, once you have a Cloudflare account:

```bash
bunx alchemy login   # one-time, opens a browser
bun run deploy
```

Each **stage** gets its own Workers and its own database. The default is
`dev_$USER`; pass `--stage prod` for another. `bunx alchemy plan` shows what
would change, `bunx alchemy destroy --yes` removes a stage.

## The stack

| Piece                                                            | Role                                            |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [Cloudflare Workers + D1](https://developers.cloudflare.com/d1/) | Hosting, compute and the database               |
| [Alchemy](https://alchemy.run)                                   | Infrastructure defined in TypeScript            |
| [TanStack Start](https://tanstack.com/start)                     | Routing and server rendering                    |
| [Better Auth](https://better-auth.com)                           | Sessions and API keys                           |
| [Effect](https://effect.website)                                 | Services, typed RPC and the public API contract |
| [Drizzle](https://orm.drizzle.team)                              | Schema and migrations                           |
| [StyleX](https://stylexjs.com)                                   | Styles compiled at build time                   |
| [bun](https://bun.sh)                                            | Runtime, package manager, scripts               |
| [oxlint + oxfmt](https://oxc.rs)                                 | Lint and format                                 |

Versions are pinned in `package.json`. There is no test framework wired up; add
the one you prefer.

## Where things are

```
alchemy.run.ts        the stack: Workers, database, bindings
src/backend/          domain services, the RPC contract, the public /v1 API
src/db/schema.ts      your tables (Better Auth owns its own)
src/server/           server functions the frontend calls
src/routes/           pages: (marketing), (auth), _app for signed-in
src/components/       UI primitives
src/styles/           design tokens and themes
```

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) — the jj workflow (git works too),
conventional commits, running the checks.

## License

MIT. See [LICENSE](./LICENSE).
