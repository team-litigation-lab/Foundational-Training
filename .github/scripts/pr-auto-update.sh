#!/usr/bin/env bash
# 🔄 Brings one pull request's branch up to date with main (.github/workflows/pr-auto-update.yml runs it for every open pull
# request into main after each deploy). Merges main into the branch; resolves only the conflicts that are safe without a
# person (.github/scripts/resolve-conflicts.cjs); checks the result the way the Checks workflow's first job does (every
# changed script parses, the Day decks build, every versioned file exists, every local reference resolves); and pushes the
# merge — never a force push, never a rewrite: the branch's own commits stay as they are.
#
# Usage: PR_AUTO_UPDATE=1 pr-auto-update.sh <branch>
#   In a throwaway clone whose origin is the repository (it checks each branch out and cleans the tree: never run it in a
#   checkout with work in it — without PR_AUTO_UPDATE=1 it refuses). RESOLVER = the path of resolve-conflicts.cjs (taken
#   from main before any branch is checked out). PUSH_TOKEN, if set, is used for fetch / push only, never left in
#   .git/config and never seen by the branch's own code (the checks run without it). CAN_PUSH_WORKFLOWS=1 when that token
#   may push changes to .github/workflows (GitHub refuses them from the workflow's own token).
#   Writes what happened to $SUMMARY (default: pr-auto-update-summary.md) and exits:
#     0  updated and pushed          10  nothing to do (already up to date, or already merged into main)
#     2  conflicts that need a person (nothing pushed)
#     3  the merged result failed a check the branch passed, or the push failed (nothing pushed)
#     4  main changed a workflow file, and this token may not push that (nothing pushed)
set -uo pipefail
BRANCH="${1:?the branch}"
RESOLVER="${RESOLVER:?the path of resolve-conflicts.cjs}"
SUMMARY="${SUMMARY:-pr-auto-update-summary.md}"
if [ "${PR_AUTO_UPDATE:-}" != "1" ]; then
  echo "pr-auto-update.sh checks out each branch and cleans the tree, so it runs in the workflow, or with PR_AUTO_UPDATE=1 in a throwaway clone." >&2; exit 3
fi
: > "$SUMMARY"
say() { echo "$*"; echo "$*" >> "$SUMMARY"; }
TMPD=$(mktemp -d); trap 'git worktree remove --force "$TMPD/before" >/dev/null 2>&1; rm -rf "$TMPD"' EXIT
# git over the network with the push token (in this command's config only); everything else without any token
net() {
  if [ -n "${PUSH_TOKEN:-}" ]; then
    git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $(printf 'x-access-token:%s' "$PUSH_TOKEN" | base64 | tr -d '\n')" "$@"
  else git "$@"; fi
}
clean() { env -u PUSH_TOKEN -u GH_TOKEN -u GITHUB_TOKEN -u ACTIONS_RUNTIME_TOKEN -u ACTIONS_ID_TOKEN_REQUEST_TOKEN "$@"; }
MAIN=refs/remotes/origin/main BR="refs/remotes/origin/$BRANCH"

# (exact refs: a tag with the branch's name never stands in for it)
net fetch --quiet --no-tags origin "+refs/heads/main:$MAIN" "+refs/heads/$BRANCH:$BR" || { say "Couldn't fetch \`$BRANCH\` or \`main\`: the branch was deleted?"; exit 3; }
TIP=$(git rev-parse "$BR")
git checkout --quiet --force --detach "$TIP" || { say "Couldn't check out \`$BRANCH\`."; exit 3; }
git clean -fdqx
if git merge-base --is-ancestor "$MAIN" HEAD; then echo "$BRANCH: already up to date"; exit 10; fi
if git merge-base --is-ancestor HEAD "$MAIN"; then echo "$BRANCH: already merged into main"; exit 10; fi

MAIN_SHA=$(git rev-parse --short "$MAIN")
MSG="Merge main ($MAIN_SHA) into $BRANCH: kept up to date after the deploy

Merged by .github/workflows/pr-auto-update.yml."
if ! git -c merge.conflictStyle=diff3 merge --no-ff --no-edit -m "$MSG" "$MAIN" >/dev/null 2>&1; then
  mapfile -t CONFLICTED < <(git diff --name-only --diff-filter=U)
  if [ "${#CONFLICTED[@]}" -eq 0 ]; then git merge --abort 2>/dev/null; say "The merge of \`main\` failed without a conflict to resolve."; exit 3; fi
  say "Merging \`main\` ($MAIN_SHA) into \`$BRANCH\` conflicted in ${#CONFLICTED[@]} file(s):"
  OUT=$(clean node "$RESOLVER" "${CONFLICTED[@]}" 2>&1); CODE=$?
  while IFS= read -r line; do [ -n "$line" ] && say "- $line"; done <<< "$OUT"
  if [ $CODE -ne 0 ] || [ -n "$(git diff --name-only --diff-filter=U)" ]; then
    git merge --abort 2>/dev/null || git reset --quiet --hard "$TIP"
    say ""
    say "Nothing was pushed: merge \`main\` into this branch by hand and resolve those files."
    exit 2
  fi
  git commit --quiet --no-edit -m "$MSG

Conflicts resolved automatically (.github/scripts/resolve-conflicts.cjs): ${CONFLICTED[*]}" || { git merge --abort 2>/dev/null; say "The resolved merge couldn't be committed."; exit 3; }
fi

WF_MSG="\`main\` ($MAIN_SHA) changed a workflow file (.github/workflows), and GitHub doesn't let this workflow's own token push that to a branch. Nothing was pushed: merge \`main\` into this branch by hand once, or add the PR_UPDATE_TOKEN secret (README: Open pull requests are kept up to date) so it is done for you."
if [ "${CAN_PUSH_WORKFLOWS:-0}" != "1" ] && ! git diff --quiet "$TIP" HEAD -- .github/workflows; then
  say "$WF_MSG"; git reset --quiet --hard "$TIP"; exit 4
fi

# ✓ the merged result, checked before anything is pushed (the branch's own code, run without any token)
checks() {   # $1: the tree to check, $2: the list of changed files → one line per failed check
  local d="$1" f
  while IFS= read -r f; do
    case "$f" in *.js|*.cjs|*.mjs) [ -f "$d/$f" ] && { clean node --check "$d/$f" >/dev/null 2>&1 || echo "\`$f\` doesn't parse"; } ;; esac
  done < "$2"
  (cd "$d" && clean node build/day-decks.cjs >/dev/null 2>&1) || echo "the Day decks' build (build/day-decks.cjs) failed"
  (cd "$d" && clean node build/script-versions.cjs --check >/dev/null 2>&1) || echo "a versioned script is missing (build/script-versions.cjs --check)"
  (cd "$d" && clean node .github/scripts/check-site.mjs >/dev/null 2>&1) || echo "the site check failed (.github/scripts/check-site.mjs)"
}
git diff --name-only "$TIP" HEAD > "$TMPD/changed"
mapfile -t NOW < <(checks "$PWD" "$TMPD/changed")
git checkout --quiet -- . 2>/dev/null; git clean -fdqx   # (the checks' own output is never committed)
NOTE=""
if [ "${#NOW[@]}" -gt 0 ]; then
  # (a check the branch already failed before the merge isn't the merge's doing: it is said, and the update goes on)
  git worktree add --quiet --detach "$TMPD/before" "$TIP" >/dev/null 2>&1
  mapfile -t BEFORE < <(checks "$TMPD/before" "$TMPD/changed")
  git worktree remove --force "$TMPD/before" >/dev/null 2>&1
  NEW=(); for x in "${NOW[@]}"; do printf '%s\n' "${BEFORE[@]:-}" | grep -qxF -- "$x" || NEW+=("$x"); done
  if [ "${#NEW[@]}" -gt 0 ]; then
    say ""; say "The merged result failed a check that \`$BRANCH\` passes, so nothing was pushed:"
    for x in "${NEW[@]}"; do say "- $x"; done
    git reset --quiet --hard "$TIP"
    exit 3
  fi
  NOTE=" (it already failed before the merge: $(printf '%s; ' "${NOW[@]}" | sed 's/; $//'))"
fi

# (the branch as it was fetched, still there and unmoved: one deleted or pushed to meanwhile is left for the next deploy)
REMOTE=$(net ls-remote --heads origin "refs/heads/$BRANCH" 2>/dev/null | cut -f1)
if [ "$REMOTE" != "$TIP" ]; then say "\`$BRANCH\` was pushed to or deleted meanwhile: nothing pushed; the next deploy tries again."; git reset --quiet --hard "$TIP"; exit 3; fi
if ! ERR=$(net push --quiet origin "HEAD:refs/heads/$BRANCH" 2>&1); then
  git reset --quiet --hard "$TIP"
  if grep -qi "workflow" <<< "$ERR"; then say "$WF_MSG"; exit 4; fi
  say "The push to \`$BRANCH\` was refused: $(tail -n 2 <<< "$ERR" | tr '\n' ' ')"; exit 3
fi
say "\`$BRANCH\` is up to date with \`main\` ($MAIN_SHA)$NOTE."
exit 0
