# Contributing

This repo uses [jj (Jujutsu)](https://jj-vcs.dev) 0.38 as its VCS, colocated
with git. "Colocated" means there is a real `.git` directory next to `.jj`:
every git tool, GitHub, and `git` itself still work. If you would rather use
git, you can — nothing in the build depends on jj. The rest of this document is
for the jj path, written for someone who has never used it.

## The jj mental model, in three points

Everything surprising about jj follows from these.

**1. `@` is a real commit — the working copy _is_ a commit.** There is no
"dirty working tree" in jj. Your edits are continuously snapshotted into the
commit called `@`. `jj status` shows you what `@` contains; `jj log` shows `@`
in the graph like any other commit. A brand new `@` is an empty commit with no
description, and that is a perfectly normal state to be in.

**2. There is no staging area.** No `git add`, no `git stash`, no `.gitignore`
dance to keep something out of a commit. Every tracked change in the working
copy is already in `@`. To split work apart you move changes _between commits_
(`jj split`, `jj squash`) rather than staging them.

**3. Bookmarks (branches) do not move on their own.** In git, committing on
`main` advances `main`. In jj, `main` is a bookmark that sits where you put it
and stays there. This is why you will see `-r @-` in the push flow below: after
`jj commit`, your finished work is the _parent_ of `@` (`@-` means "the parent
of `@`"), because `jj commit` describes the current commit and immediately
starts a fresh empty one on top. Pointing `main` at `@` would point it at that
empty commit.

Two more things worth knowing early: `jj undo` reverses the last operation
(including a bad rebase or a lost bookmark), and `jj log` defaults to a useful
subset rather than all of history — `jj log -r 'all()'` when you want everything.

## The workflow

```bash
# Start a new change on top of main.
jj new main

# ... edit files. There is nothing to add. Check what you have:
jj status
jj diff

# Give the change a message (opens $EDITOR, pre-filled with the guidance
# template if you adopted .jj-config.toml — see below).
jj describe

# Or in one shot, skipping the editor:
jj describe -m "feat(auth): add passkey login"
```

`jj describe` sets the message on `@` and leaves you _on_ that commit, so you
can keep editing it. When the change is finished and you want to start the next
one:

```bash
# Describe @ (if you haven't) and start a new empty commit on top of it.
jj commit -m "feat(auth): add passkey login"
```

After `jj commit`, `@` is the new empty commit and your work is at `@-`.

To publish:

```bash
# Point the main bookmark at the finished commit — the parent of @.
jj bookmark set main -r @-

# Push it. `jj git push` pushes bookmarks, not "the current branch".
jj git push
```

If you stayed on `@` with `jj describe` instead of running `jj commit`, then
your work _is_ `@`, and the bookmark command is `jj bookmark set main -r @`.
Read the log before you push; `jj log` makes the shape obvious.

Working with a remote:

```bash
jj git fetch                 # update remote-tracking bookmarks
jj rebase -d main            # move your change onto the latest main
jj git push --bookmark main  # push one bookmark explicitly
```

For a pull-request workflow, use a bookmark per change instead of `main`:

```bash
jj bookmark set my-feature -r @-
jj git push --bookmark my-feature
```

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) v1.0.0:

```
<type>[optional scope][!]: <description>
```

The allowed types are exactly:

```
build  chore  ci  docs  feat  fix  perf  refactor  revert  style  test
```

Rules the checker enforces (`scripts/check-commit-message.sh`):

- the subject must match `<type>(<optional scope>)!?: <description>`;
- the subject must be **72 characters or fewer**;
- only the first line is checked — the body is free-form.

Conventions the checker cannot enforce but reviewers will: imperative mood, no
trailing period, lowercase scope (`(auth)`, `(db)`, `(ui)`, `(deps)`).

```
feat(auth): add passkey login
fix(db): correct migration ordering
chore(deps): bump drizzle-orm
feat(api)!: drop the legacy project endpoint
```

Merge commits and `Revert "..."` commits are skipped by the range checker.

## Adopting `.jj-config.toml` (optional)

`.jj-config.toml` gives you an editor template that reminds you of the
conventional-commit format, plus two aliases: `jj lint-commits` (validate a
range) and `jj describe-checked "<msg>"` (validate a message, then set it on
`@` only if it is valid).

It is opt-in because **jj does not read config from the working copy**.
Per-repo jj config lives outside the repo, at the path printed by
`jj config path --repo`, so it can never be committed. Pick one of the three
methods documented at the top of the file:

```bash
# 1. Recommended — merge it into this repo's own jj config.
mkdir -p "$(dirname "$(jj config path --repo)")"
cat .jj-config.toml >> "$(jj config path --repo)"

# 2. For a whole shell session, without installing anything.
export JJ_CONFIG="$(jj config path --user):$PWD/.jj-config.toml"

# 3. User-wide but scoped to this checkout.
cp .jj-config.toml ~/.config/jj/conf.d/kindling.toml
# then add as the FIRST line of the copy:
#   --when.repositories = ["/absolute/path/to/kindling"]
```

There is a fourth form, `jj --config-file=.jj-config.toml describe`, which works
for the _editor template_ but **does not register the aliases** — jj only picks
aliases up from config files it loads for itself. Use method 1 or 2 if you want
`jj lint-commits`.

Nothing auto-syncs: re-run whichever method you chose after editing the file.

## Enforcement is CI, and only CI

jj has no hooks of any kind — no `commit-msg`, no `pre-push` — and it does not
run git hooks even in a colocated repo. husky, lefthook and pre-commit are
therefore useless in this repo, and `jj fix` only rewrites file contents, so it
cannot validate a message either. Do not try to add a local hook; there is
nothing to hook into.

`.github/workflows/commits.yml` runs `scripts/check-commit-messages.sh` on every
pull request and merge group. The script auto-detects its backend: jj locally,
plain git on the runner (no jj installed there). That workflow is the real gate.

## Running the checks locally

```bash
bun install
bun run check        # typecheck + lint + fmt:check — exactly what CI runs
```

Individually:

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # oxlint, including the StyleX rules
bun run lint:fix     # auto-fix, including StyleX key sorting
bun run fmt          # oxfmt, writes
bun run fmt:check    # oxfmt, exits 1 on anything unformatted
```

Commit messages:

```bash
bun run commits:lint                    # everything in trunk()..@
bun run commits:lint 'main::@'          # explicit jj revset
bun run commits:lint --git origin/main..HEAD
bun run commit:lint "feat(auth): add passkey login"

# with .jj-config.toml adopted:
jj lint-commits
jj describe-checked "feat(auth): add passkey login"
```

Both scripts are pure bash + grep — no dependencies, and they run the same rules
CI does.

`.github/workflows/ci.yml` runs typecheck, lint and format as three parallel
jobs on `bun install --frozen-lockfile`. Note that lint needs `node_modules`
present even though oxlint is a binary: it loads `@stylexjs/eslint-plugin`
through its JS plugin bridge.

There is no automated test suite in this template. If you add one, add a job to
`ci.yml` alongside the others.

## A few repo-specific rules

Before sending a change, check it does not break one of these — they are load
bearing and explained at the site, and in [AGENTS.md](./AGENTS.md):

- Better Auth's tables (`user`, `session`, `account`, `verification`) never
  appear in `src/db/schema.ts`.
- `src/routes/rpc.ts` and `src/routes/api.auth.$.ts` forward the original
  `Request` unchanged.
- The explicit type annotation on `rpcServer` in `src/backend/api.ts` stays.
- Guarded pages live under `src/routes/_app/`.
- `src/backend/rpc.ts` imports nothing server-only — it ships to the browser.
- New dependencies are a deliberate choice here, not a default. The toolchain is
  small on purpose (no ESLint, no Prettier, no commitlint, no test framework);
  say why in the PR.
