#!/usr/bin/env bash
# Validate a SINGLE commit message against the Conventional Commits spec.
#
# Usage:
#   scripts/check-commit-message.sh "feat(auth): add passkey login"
#   echo "fix: correct off-by-one" | scripts/check-commit-message.sh
#
# Exits 0 if the message is valid, 1 otherwise. Pure bash + grep: no deps.
#
# jj has no hooks (see .jj-config.toml), so this is meant to be driven by a jj
# alias that validates a message before handing it to `jj describe --stdin`.
set -euo pipefail

# Conventional Commits v1.0.0 types.
TYPES='build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test'

# type(optional-scope)(optional !): subject
SUBJECT_RE="^(${TYPES})(\([a-zA-Z0-9._/ -]+\))?!?: .+"

SUBJECT_MAX_LEN=72

if [ "$#" -gt 0 ]; then
  message="$1"
else
  message="$(cat)"
fi

# Only the first line (the subject) is subject to the format rules.
subject="${message%%$'\n'*}"

if [ -z "${subject//[[:space:]]/}" ]; then
  printf 'FAIL  empty commit message\n' >&2
  printf '      A commit message is required.\n' >&2
  exit 1
fi

if ! printf '%s' "$subject" | grep -Eq "$SUBJECT_RE"; then
  printf 'FAIL  %s\n' "$subject" >&2
  printf '      Not a Conventional Commit subject.\n' >&2
  printf '      Expected: <type>[optional scope][!]: <description>\n' >&2
  printf '      Types:    %s\n' "${TYPES//|/, }" >&2
  printf '      Example:  feat(auth): add passkey login\n' >&2
  exit 1
fi

if [ "${#subject}" -gt "$SUBJECT_MAX_LEN" ]; then
  printf 'FAIL  %s\n' "$subject" >&2
  printf '      Subject is %d chars; keep it under %d.\n' "${#subject}" "$SUBJECT_MAX_LEN" >&2
  exit 1
fi

printf 'OK    %s\n' "$subject"
