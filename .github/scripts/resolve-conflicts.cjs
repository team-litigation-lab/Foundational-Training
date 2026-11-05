// 🔀 Resolves the merge conflicts that are safe to resolve without a person, in files git left conflicted (diff3 style:
// merge.conflictStyle=diff3, so each conflict shows what the common ancestor had). Used by .github/workflows/pr-auto-update.yml,
// which merges main into every open pull request after each deploy, so a branch doesn't fall behind what is live.
//
// A conflict is resolved only when it is one of these, and left exactly as git wrote it otherwise:
//   1. 🔁 version stamps: both sides have the same lines but for a script's or stylesheet's ?v=… or APP_BUILD's value
//      (a branch that committed build/script-versions.cjs's fingerprints, against main's hand-written stamps). main's side
//      is kept: the deploy writes every stamp again from the files themselves (wrangler.json build.command).
//   2. ➕ both sides added lines where the ancestor had none (two features each adding a line at the same spot): both are
//      kept whole, the branch's first, then main's (exactly the same lines on both sides: kept once).
//   3. ✓ one side left the ancestor's lines as they were: the other side's change is kept (git normally does this itself).
// Anything else — the same lines changed two different ways, a deleted file, a binary — is a person's decision.
//
// Usage: node resolve-conflicts.cjs <file>…   (in the repository, mid-merge, the branch checked out and main merged in)
//   Each file resolved in full is rewritten and `git add`ed. Prints what it did. Exit 0: every file resolved; exit 2: some
//   are not (those files are left untouched, conflict markers and all).
// Also require()d by .github/scripts/resolve-conflicts-test.cjs: resolveText(text) → {text, resolved, left, how}.
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

const OURS = /^<{7}(?: |$)/, BASE = /^\|{7}(?: |$)/, SEP = /^={7}$/, THEIRS = /^>{7}(?: |$)/;
// a line with its version stamps blanked: ?v=… in a src/href, and APP_BUILD's value
const unstamp = l => l.replace(/\?v=[^"'\s>]*/g, '?v=').replace(/(APP_BUILD\s*=\s*)(["'])[^"']*\2/, '$1$2$2');
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// one conflict's three parts (ours = the branch, base = the ancestor, theirs = main) → the lines to keep, or null
function resolveHunk(ours, base, theirs) {
  if (same(ours, theirs)) return { lines: ours, how: 'same on both sides' };
  if (base && same(ours, base)) return { lines: theirs, how: 'only main changed it' };
  if (base && same(theirs, base)) return { lines: ours, how: 'only the branch changed it' };
  if (ours.length && same(ours.map(unstamp), theirs.map(unstamp))) return { lines: theirs, how: 'version stamps (main\'s kept; the deploy writes them again)' };
  // (each side's lines whole, never picked apart: a closing brace or a blank line on both sides is part of both additions)
  if (base && !base.length && ours.length && theirs.length) return { lines: ours.concat(theirs), how: 'both sides added lines (both kept)' };
  return null;
}

function resolveText(text) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const out = [], how = [];
  let resolved = 0, left = 0, i = 0;
  while (i < lines.length) {
    if (!OURS.test(lines[i])) { out.push(lines[i++]); continue; }
    // <<<<<<< … ||||||| … ======= … >>>>>>>
    const start = i, ours = [], theirs = []; let base = null, part = 'ours', end = -1;
    for (i = i + 1; i < lines.length; i++) {
      const l = lines[i];
      if (part === 'ours' && BASE.test(l)) { part = 'base'; base = []; continue; }
      if ((part === 'ours' || part === 'base') && SEP.test(l)) { part = 'theirs'; continue; }
      if (part === 'theirs' && THEIRS.test(l)) { end = i; break; }
      (part === 'ours' ? ours : part === 'base' ? base : theirs).push(l);
    }
    if (end < 0) {   // (no end marker: not a conflict git wrote; left as it is)
      out.push(...lines.slice(start)); left++; break;
    }
    i = end + 1;
    const r = resolveHunk(ours, base, theirs);
    if (r) { out.push(...r.lines); resolved++; how.push(r.how); }
    else { out.push(...lines.slice(start, end + 1)); left++; }
  }
  return { text: out.join(nl), resolved, left, how };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  let unresolved = 0;
  for (const f of files) {
    let text;
    try { text = fs.readFileSync(f, 'utf8'); } catch (e) { console.log(`✗ ${f}: can't be read (deleted on one side?): a person's decision`); unresolved++; continue; }
    if (text.includes('\u0000')) { console.log(`✗ ${f}: a binary file: a person's decision`); unresolved++; continue; }
    const r = resolveText(text);
    if (!r.resolved && !r.left) { console.log(`✗ ${f}: conflicted, but not in its lines (deleted or renamed on one side?): a person's decision`); unresolved++; continue; }
    if (r.left) { console.log(`✗ ${f}: ${r.left} conflict(s) need a person (${r.resolved} of them safe, but the file is left as git wrote it)`); unresolved++; continue; }
    fs.writeFileSync(f, r.text);
    execFileSync('git', ['add', '--', f]);
    console.log(`✓ ${f}: ${r.resolved} conflict(s) resolved — ${[...new Set(r.how)].join('; ')}`);
  }
  process.exit(unresolved ? 2 : 0);
}
module.exports = { resolveText, resolveHunk, unstamp };
