#!/usr/bin/env bash
# 🔄 Brings one pull request's branch up to date with main (.github/workflows/pr-auto-update.yml runs it for every open pull
# request after each deploy). Merges origin/main into origin/<branch>; resolves only the conflicts that are safe without a
# person (.github/scripts/resolve-conflicts.cjs: version stamps, lines both sides added); checks the result the way the
# Checks workflow's first job does (every changed script parses, every versioned file exists, every local reference
# resolves); and pushes the merge — never a force push, never a rewrite: the branch's own commits stay as they are.
#
# Usage: pr-auto-update.sh <branch>     (in a clone whose origin is the repository; RESOLVER = the path of
#                                         resolve-conflicts.cjs, taken from main before the branch is checked out)
#   Writes what happened to $SUMMARY (default: pr-auto-update-summary.md) and exits:
#     0  updated and pushed        10  already up to date (nothing pushed)
#     2  conflicts that need a person (nothing pushed)   3  the merged result failed a check (nothing pushed)
set -uo pipefail
BRANCH="$1"
RESOLVER="${RESOLVER:?the path of resolve-conflicts.cjs}"
SUMMARY="${SUMMARY:-pr-auto-update-summary.md}"
: > "$SUMMARY"
say() { echo "$*"; echo "$*" >> "$SUMMARY"; }

git fetch --quiet origin main "$BRANCH" || { say "Couldn't fetch \`$BRANCH\` or \`main\`."; exit 3; }
git checkout --quiet --force -B "pr-auto-update/$BRANCH" "origin/$BRANCH" || { say "Couldn't check out \`$BRANCH\`."; exit 3; }
git clean -fdq
if git merge-base --is-ancestor origin/main HEAD; then echo "$BRANCH: already up to date"; exit 10; fi

MAIN_SHA=$(git rev-parse --short origin/main)
MSG="Merge main ($MAIN_SHA) into $BRANCH: kept up to date after the deploy

Merged by .github/workflows/pr-auto-update.yml."
if ! git -c merge.conflictStyle=diff3 merge --no-ff --no-edit -m "$MSG" origin/main >/dev/null 2>&1; then
  mapfile -t CONFLICTED < <(git diff --name-only --diff-filter=U)
  if [ "${#CONFLICTED[@]}" -eq 0 ]; then git merge --abort 2>/dev/null; say "The merge of \`main\` failed without a conflict to resolve."; exit 3; fi
  say "Merging \`main\` ($MAIN_SHA) into \`$BRANCH\` conflicted in ${#CONFLICTED[@]} file(s):"
  OUT=$(node "$RESOLVER" "${CONFLICTED[@]}" 2>&1); CODE=$?
  while IFS= read -r line; do say "- $line"; done <<< "$OUT"
  if [ $CODE -ne 0 ] || [ -n "$(git diff --name-only --diff-filter=U)" ]; then
    git merge --abort 2>/dev/null || git reset --quiet --hard "origin/$BRANCH"
    say ""
    say "Nothing was pushed: merge \`main\` into this branch by hand and resolve those files."
    exit 2
  fi
  RESOLVED=("${CONFLICTED[@]}")
  git commit --quiet --no-edit -m "$MSG

Conflicts resolved automatically (.github/scripts/resolve-conflicts.cjs): ${RESOLVED[*]}" || { git merge --abort 2>/dev/null; say "The resolved merge couldn't be committed."; exit 3; }
fi

# ✓ the merged result, checked before anything is pushed
FAIL=""
while IFS= read -r f; do
  case "$f" in *.js|*.cjs|*.mjs) [ -f "$f" ] && { node --check "$f" >/dev/null 2>&1 || FAIL="$FAIL\n- \`$f\` doesn't parse"; } ;; esac
done < <(git diff --name-only "origin/$BRANCH" HEAD)
node build/day-decks.cjs >/dev/null 2>&1 || FAIL="$FAIL\n- the Day decks' build (build/day-decks.cjs) failed"
node build/script-versions.cjs --check >/dev/null 2>&1 || FAIL="$FAIL\n- a versioned script is missing (build/script-versions.cjs --check)"
node .github/scripts/check-site.mjs >/dev/null 2>&1 || FAIL="$FAIL\n- the site check failed (.github/scripts/check-site.mjs)"
git checkout --quiet -- . 2>/dev/null; git clean -fdq   # (the checks' own output is never committed)
if [ -n "$FAIL" ]; then
  say ""; say "The merged result failed a check, so nothing was pushed:"; printf "%b\n" "$FAIL" | sed '/^$/d' | tee -a "$SUMMARY"
  git reset --quiet --hard "origin/$BRANCH"
  exit 3
fi

git push --quiet origin "HEAD:refs/heads/$BRANCH" || { say "The push to \`$BRANCH\` was refused (the branch moved meanwhile?): the next deploy tries again."; git reset --quiet --hard "origin/$BRANCH"; exit 3; }
say "\`$BRANCH\` is up to date with \`main\` ($MAIN_SHA)."
exit 0
