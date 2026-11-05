// 🔀 Resolves the merge conflicts that are safe to resolve without a person, in files git left conflicted (diff3 style:
// merge.conflictStyle=diff3, so each conflict shows what the common ancestor had). Used by .github/workflows/pr-auto-update.yml,
// which merges main into every open pull request after each deploy, so a branch doesn't fall behind what is live.
//
// A conflict is resolved only when it is one of these, and left exactly as git wrote it otherwise:
//   1. 🔁 version stamps, in index.html only: both sides have the same lines but for a <script src> / <link href> ?v=… or
//      `var APP_BUILD = "…"` — exactly what the deploy writes again (build/script-versions.cjs, wrangler.json build.command),
//      so main's side is kept. (A ?v= anywhere else — an image's cache-buster, a regex — is a real edit, never "a stamp".)
//   2. ➕ both sides added lines where the ancestor had none (two features each adding a line at the same spot): both are
//      kept whole, the branch's first, then main's — but only when the two additions are really different: no line in
//      common (blank lines and lone brackets aside), and no name declared on both sides (a function, const/let/var/class,
//      a method, an object key, a CSS selector, an element id). Otherwise the same thing reached both sides (a cherry-pick,
//      the same fix made twice) or two things clash, and keeping both would duplicate or shadow it.
//   3. ✓ one side left the ancestor's lines as they were: the other side's change is kept (git normally does this itself).
// A file is left whole for a person when: either side deleted it or both created it (no common ancestor), it is binary or
// not UTF-8 text, it mixes CRLF and LF line ends, any side's own content has lines that look like conflict markers, or
// any one of its conflicts isn't safe.
//
// Usage: node resolve-conflicts.cjs <file>…   (in the repository, mid-merge, the branch checked out and main merged in)
//   Each file resolved in full is rewritten and `git add`ed. Prints what it did. Exit 0: every file resolved; exit 2: some
//   are not (those files are left untouched, conflict markers and all).
// Also require()d by .github/scripts/pr-auto-update-test.cjs: resolveText(text, file) → {text, resolved, left, how}.
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');

const OURS = /^<{7}(?: |$)/, BASE = /^\|{7}(?: |$)/, SEP = /^={7}$/, THEIRS = /^>{7}(?: |$)/;
const MARKERISH = /^(?:<{7}|>{7}|\|{7})(?: |$)|^={7}\r?$/m;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// 🔁 a line of index.html with what the deploy rewrites blanked (build/script-versions.cjs: a script's / stylesheet's ?v=,
// and APP_BUILD's value); any other file has no stamps
const unstamp = l => l.replace(/(<(?:script|link)\b[^>]*?\s(?:src|href)="[^"?]*\?v=)[^"]*(")/g, '$1$2')
  .replace(/^(\s*var\s+APP_BUILD\s*=\s*")[^"]*(")/, '$1$2');
const stamped = file => String(file || '').replace(/\\/g, '/') === 'index.html';

// ➕ what an addition declares: functions, const/let/var/class, methods (`name(…){`), object keys / CSS properties, CSS
// selectors, element ids
const KEYWORDS = /^(?:if|for|while|switch|catch|function|return|else|do|try|with)$/;
function declared(lines) {
  const out = new Set(); let m;
  for (const l of lines) {
    if ((m = /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/.exec(l))) out.add('fn:' + m[1]);
    if ((m = /^\s*(?:export\s+)?(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(l))) out.add('fn:' + m[1]);
    if ((m = /^\s*(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?\*?\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/.exec(l)) && !KEYWORDS.test(m[1])) out.add('fn:' + m[1]);
    if ((m = /^\s*["']?([A-Za-z_$][\w$-]*)["']?\s*:(?!:)/.exec(l)) && !/^(?:https?|default|case)$/.test(m[1])) out.add('key:' + m[1]);
    if ((m = /^\s*([.#@:][^{]*?)\s*\{/.exec(l))) out.add('css:' + m[1]);
    for (const x of l.matchAll(/\bid\s*=\s*["']([^"'$`{}]+)["']/g)) out.add('id:' + x[1]);
  }
  return out;
}
const TRIVIAL = /^[\s{}()\[\];,]*$/;
function overlap(ours, theirs, file) {
  // (in index.html two lines that differ only in their stamps are the same line: the same script added on both sides)
  const k = l => (stamped(file) ? unstamp(l) : l).trim();
  const a = new Set(ours.filter(l => !TRIVIAL.test(l)).map(k));
  const line = theirs.find(l => !TRIVIAL.test(l) && a.has(k(l)));
  if (line !== undefined) return `the same line on both sides (${line.trim().slice(0, 60)})`;
  const da = declared(ours), name = [...declared(theirs)].find(n => da.has(n));
  return name ? `both sides declare ${name.replace(/^\w+:/, '')}` : '';
}

// one conflict's three parts (ours = the branch, base = the ancestor, theirs = main) → {lines, how} to keep, or {why} not
function resolveHunk(ours, base, theirs, file) {
  if (same(ours, theirs)) return { lines: ours, how: 'same on both sides' };
  if (base && same(ours, base)) return { lines: theirs, how: 'only main changed it' };
  if (base && same(theirs, base)) return { lines: ours, how: 'only the branch changed it' };
  if (stamped(file) && ours.length && same(ours.map(unstamp), theirs.map(unstamp))) return { lines: theirs, how: 'version stamps (main\'s kept; the deploy writes them again)' };
  if (base && !base.length && ours.length && theirs.length) {
    const why = overlap(ours, theirs, file);
    if (why) return { why };
    return { lines: ours.concat(theirs), how: 'both sides added lines (both kept)' };
  }
  return { why: 'both sides changed the same lines' };
}

function resolveText(text, file) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const out = [], how = [], why = [];
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
      out.push(...lines.slice(start)); left++; why.push('a conflict with no end'); break;
    }
    i = end + 1;
    const r = resolveHunk(ours, base, theirs, file);
    if (r.lines) { out.push(...r.lines); resolved++; how.push(r.how); }
    else { out.push(...lines.slice(start, end + 1)); left++; why.push(r.why); }
  }
  return { text: out.join(nl), resolved, left, how, why };
}

// git's own stages of a conflicted file: 1 the ancestor, 2 the branch (ours), 3 main (theirs)
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
function stagesOf(f) {
  const st = new Set();
  try { git('ls-files', '-u', '--', f).split('\n').forEach(l => { const m = /^\d+ [0-9a-f]+ (\d)\t/.exec(l); if (m) st.add(+m[1]); }); } catch (e) {}
  return st;
}
// why a file is left whole for a person, or '' when its conflicts may be looked at
function fileWhy(f, buf, st) {
  if (!st.has(2) || !st.has(3)) return 'deleted on one side: a person\'s decision';
  if (!st.has(1)) return 'both branches created this file (no common ancestor): a person\'s decision';
  if (buf.includes(0)) return 'a binary file: a person\'s decision';
  const text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf)) return 'not UTF-8 text: a person\'s decision';
  const crlf = (text.match(/\r\n/g) || []).length, lf = (text.match(/\n/g) || []).length;
  if (crlf && crlf !== lf) return 'mixed CRLF and LF line ends: a person\'s decision';
  for (const s of [1, 2, 3]) { let c = ''; try { c = git('show', `:${s}:${f}`); } catch (e) { continue; }
    if (MARKERISH.test(c)) return 'its own content has lines that look like conflict markers: a person\'s decision'; }
  return '';
}

if (require.main === module) {
  const files = process.argv.slice(2);
  let unresolved = 0;
  for (const f of files) {
    const st = stagesOf(f);
    let buf = null; try { buf = fs.readFileSync(f); } catch (e) {}
    const early = buf ? fileWhy(f, buf, st) : (st.has(2) && st.has(3) ? 'can\'t be read: a person\'s decision' : 'deleted on one side: a person\'s decision');
    if (early) { console.log(`✗ ${f}: ${early}`); unresolved++; continue; }
    const r = resolveText(buf.toString('utf8'), f);
    if (!r.resolved && !r.left) { console.log(`✗ ${f}: conflicted, but not in its lines: a person's decision`); unresolved++; continue; }
    if (r.left) { console.log(`✗ ${f}: ${r.left} conflict(s) need a person — ${[...new Set(r.why)].join('; ')}${r.resolved ? ` (${r.resolved} other(s) safe, but the file is left as git wrote it)` : ''}`); unresolved++; continue; }
    if (MARKERISH.test(r.text)) { console.log(`✗ ${f}: conflict markers would be left in it: a person's decision`); unresolved++; continue; }
    fs.writeFileSync(f, r.text);
    git('add', '--', f);
    console.log(`✓ ${f}: ${r.resolved} conflict(s) resolved — ${[...new Set(r.how)].join('; ')}`);
  }
  process.exit(unresolved ? 2 : 0);
}
module.exports = { resolveText, resolveHunk, unstamp, declared, overlap };
