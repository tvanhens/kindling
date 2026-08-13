#!/usr/bin/env bash
# Validate a RANGE of commit messages against the Conventional Commits spec.
#
# Works in both worlds:
#   * locally, where the repo is jj-colocated -> uses `jj log` + a revset
#   * in CI, where only plain git exists      -> uses `git log`
#
# Usage:
#   scripts/check-commit-messages.sh                  # auto: unpushed work
#   scripts/check-commit-messages.sh 'trunk()..@'     # explicit jj revset
#   scripts/check-commit-messages.sh origin/main..HEAD  # explicit git range
#   scripts/check-commit-messages.sh --git <range>    # force the git backend
#   scripts/check-commit-messages.sh --jj  <revset>   # force the jj backend
#
# Exits 1 if any commit message is invalid. Pure bash + grep: no deps.
set -euo pipefail

TYPES='build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test'
SUBJECT_RE="^(${TYPES})(\([a-zA-Z0-9._/ -]+\))?!?: .+"
SUBJECT_MAX_LEN=72

# Merge/revert commits produced by tooling rather than by a human.
IGNORE_RE='^(Merge |Revert ")'

backend=auto
range=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --git) backend=git; shift ;;
    --jj) backend=jj; shift ;;
    -h | --help)
      sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      range="$1"
      shift
      ;;
  esac
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [ "$backend" = auto ]; then
  if command -v jj > /dev/null 2>&1 && jj root > /dev/null 2>&1; then
    backend=jj
  else
    backend=git
  fi
fi

# --- collect subjects ---------------------------------------------------------
# Each line is one commit subject. Empty commits, the root commit and an
# as-yet-undescribed working copy are excluded by the backend itself, so
# work in progress never fails the check.
subjects=""

if [ "$backend" = jj ]; then
  revset="${range:-trunk()..@}"
  if ! subjects="$(
    jj log --no-graph --ignore-working-copy \
      -r "(${revset}) ~ empty() ~ root() ~ (@ & description(exact:''))" \
      -T 'if(description, description.first_line(), "(no description set)") ++ "\n"' 2> /dev/null
  )"; then
    printf 'error: revset %s could not be evaluated\n' "$revset" >&2
    exit 1
  fi
  source_desc="jj revset '${revset}'"
else
  if [ -n "$range" ]; then
    git_range="$range"
  elif git rev-parse --verify --quiet origin/main > /dev/null; then
    git_range="origin/main..HEAD"
  elif git rev-parse --verify --quiet main > /dev/null; then
    git_range="main..HEAD"
  else
    # Fresh repo / no trunk yet: check everything that exists.
    git_range="HEAD"
  fi

  if ! git rev-parse --verify --quiet "${git_range%%..*}" > /dev/null 2>&1 \
    && [ "$git_range" = "HEAD" ]; then
    printf 'no commits yet; nothing to check\n'
    exit 0
  fi

  subjects="$(git log --no-merges --format='%s' "$git_range" 2> /dev/null || true)"
  source_desc="git range '${git_range}'"
fi

# --- validate -----------------------------------------------------------------
total=0
failed=0

while IFS= read -r subject; do
  # Skip blank lines (empty descriptions filtered upstream, but be defensive).
  [ -z "${subject//[[:space:]]/}" ] && continue
  printf '%s' "$subject" | grep -Eq "$IGNORE_RE" && continue

  total=$((total + 1))

  if ! printf '%s' "$subject" | grep -Eq "$SUBJECT_RE"; then
    printf 'FAIL  %s\n' "$subject"
    printf '      not a Conventional Commit subject\n'
    failed=$((failed + 1))
  elif [ "${#subject}" -gt "$SUBJECT_MAX_LEN" ]; then
    printf 'FAIL  %s\n' "$subject"
    printf '      subject is %d chars; keep it under %d\n' "${#subject}" "$SUBJECT_MAX_LEN"
    failed=$((failed + 1))
  else
    printf 'ok    %s\n' "$subject"
  fi
done <<< "$subjects"

printf '\n'

if [ "$total" -eq 0 ]; then
  printf 'No commit messages to check (%s).\n' "$source_desc"
  exit 0
fi

if [ "$failed" -gt 0 ]; then
  printf '%d of %d commit message(s) failed (%s).\n\n' "$failed" "$total" "$source_desc"
  printf 'Conventional Commits: <type>[optional scope][!]: <description>\n'
  printf '  types:    %s\n' "${TYPES//|/, }"
  printf '  examples: feat(auth): add passkey login\n'
  printf '            fix!: drop support for Node 18\n'
  printf '            chore(deps): bump drizzle-orm\n'
  exit 1
fi

printf 'All %d commit message(s) OK (%s).\n' "$total" "$source_desc"
