# AGENTS.md

How to work in this repository. What the code does, and why it is shaped the way
it is, lives in the code and its comments. Read those.

## Delegate to subagents to keep the root context clean

Anything that involves reading widely, iterating on a build, or exploring to
find an answer should go to a subagent, which returns the conclusion instead of
the search. The root agent's context is the scarce resource: it holds the thread
of what is being built and why, and it degrades once it fills with file dumps
and compiler output. Run independent subagents in parallel.

## Give each implementing subagent its own jj workspace

A subagent writing new functionality works in its own workspace, so several can
run at once without overwriting each other's files:

```bash
jj workspace add --name <task> .claude/workspaces/<task>
```

Workspaces share one repository, so a commit made in one is immediately visible
from all the others. There is nothing to push, pull or fetch between them.

## Subagents do not merge their own work

A subagent finishes by committing in its workspace and reporting the change id.
The root agent integrates. Only the root agent has the whole picture, so it is
the only one positioned to resolve a conflict between two subagents sensibly
rather than by whoever happened to finish last.

## Clean up workspaces after integrating

```bash
jj workspace forget <task>
rm -rf .claude/workspaces/<task>
```

`forget` stops tracking the working copy but leaves its commits in the repo,
which is what makes integration possible. Abandon anything that was not
integrated (`jj abandon -r <change-id>`), or it stays as a stray head in the
log.

## Check the local Effect docs before writing Effect code

This repo runs Effect 4. Your training and effect.website both describe Effect
3, and the differences are large enough to produce code that does not compile.
`node_modules/effect/AGENTS.md` and `node_modules/effect/ai-docs/src/**` are
version-locked and correct; prefer them over anything you remember or find.

## Run `bun run check` before calling anything done

It runs typecheck, lint and format together. Work that has not passed it is not
finished, and reporting it as finished wastes a round trip.

## Verify behaviour in a browser, not just in the type checker

Playwright MCP is configured. Every runtime bug this project has had passed
typecheck, lint and a production build first. Load the page, exercise the flow,
and read the console before claiming something works.

## Separate what you observed from what you reasoned

"The types say this is wired correctly" and "I signed in and the request
returned 200" are different claims. Say which one you are making, and say
plainly when you could not verify something.

## Restart the dev server after editing

`alchemy dev` leaves the Website's service binding to the backend stale after a
hot reload. Proxied requests then fail with `503 Worker not found` while the
backend itself is healthy on its own port. Restart rather than debugging it.

## Never deploy or destroy unless asked

`bun run plan` is safe and shows what would change. `deploy` and `destroy` act
on real infrastructure in someone's account.

## Drive the UI instead of hand-writing RPC envelopes

The wire format is internal and easy to get subtly wrong, and a malformed
envelope fails in ways that look like a server fault. Use the app, or build a
client from the contract.

## Follow the commit convention

Conventional commits, enforced in CI. `scripts/check-commit-messages.sh` runs
the same check locally.

## Leave reasoning at the site, not in this file

When a decision is not obvious from the code, put the explanation in a comment
beside it. This file is for how to work here, not for what the code means.
