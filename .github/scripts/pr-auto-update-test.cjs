// 🔄 Keeping pull requests up to date after a deploy (.github/workflows/pr-auto-update.yml): the conflict resolver
// (.github/scripts/resolve-conflicts.cjs) on its own, then the updater (.github/scripts/pr-auto-update.sh) on real
// branches of a copy of this repository, pushed to a local "origin":
//   - a branch that committed build/script-versions.cjs's ?v= fingerprints and added a line where main added another (what
//     PR #540 met) is merged, resolved (main's stamps, both lines) and pushed, its own commits untouched;
//   - the same line changed two ways is left for a person: nothing pushed, the branch as it was;
//   - a resolution that doesn't parse is caught by the checks: nothing pushed;
//   - a branch already up to date is left alone.
// Run: node .github/scripts/pr-auto-update-test.cjs   (from the repository root; needs git and node)
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { resolveText } = require('./resolve-conflicts.cjs');

const failures = []; const fail = m => failures.push(m);
const check = (ok, m) => { if (!ok) fail(m); };

/* ---------- the resolver on its own ---------- */
const H = (ours, base, theirs) => ['top', '<<<<<<< HEAD', ...ours, '||||||| base', ...base, '=======', ...theirs, '>>>>>>> origin/main', 'bottom'].join('\n');
let r = resolveText(H(['<script src="/js/a.js?v=04f3817ed3"></script>', '<script src="/js/b.js?v=1"></script>'], ['<script src="/js/a.js?v=old"></script>', '<script src="/js/b.js?v=1"></script>'],
  ['<script src="/js/a.js?v=ft-2026.11.05-x"></script>', '<script src="/js/b.js?v=ft-2"></script>']));
check(r.left === 0 && r.text === 'top\n<script src="/js/a.js?v=ft-2026.11.05-x"></script>\n<script src="/js/b.js?v=ft-2"></script>\nbottom', `version stamps: main's side wasn't kept: ${JSON.stringify(r)}`);
r = resolveText(H(['var APP_BUILD = "ft-2026.11.05-aaaa";'], ['var APP_BUILD = "ft-1";'], ['var APP_BUILD = "ft-2026.11.05-bbbb";']));
check(r.left === 0 && /bbbb/.test(r.text) && !/aaaa/.test(r.text), `APP_BUILD wasn't resolved to main's: ${r.text}`);
r = resolveText(H(['    ${approvalsHtml(ppl)}'], [], ['    ${dupHtml()}']));
check(r.left === 0 && r.text === 'top\n    ${approvalsHtml(ppl)}\n    ${dupHtml()}\nbottom', `lines both sides added: not both kept: ${r.text}`);
r = resolveText(H(['  }', '  x();'], [], ['  }', '  y();']));
check(r.left === 0 && r.text === 'top\n  }\n  x();\n  }\n  y();\nbottom', `both additions must be kept whole (a shared closing brace too): ${r.text}`);
r = resolveText(H(['same();'], [], ['same();']));
check(r.left === 0 && r.text === 'top\nsame();\nbottom', `the same addition on both sides isn't kept once: ${r.text}`);
r = resolveText(H(['a = 1;'], ['a = 0;'], ['a = 2;']));
check(r.resolved === 0 && r.left === 1 && /<<<<<<< HEAD/.test(r.text), 'the same line changed two ways was resolved: it is a person\'s decision');
r = resolveText(H(['<script src="/js/a.js?v=1"></script>', '<script src="/js/new.js?v=1"></script>'], ['<script src="/js/a.js?v=0"></script>'], ['<script src="/js/a.js?v=2"></script>']));
check(r.left === 1, 'a script added on one side was taken for a version stamp');
r = resolveText(['<<<<<<< HEAD', 'a();', '=======', 'b();', '>>>>>>> main'].join('\n'));
check(r.left === 1, 'a conflict without the ancestor (no diff3) was resolved as an addition');
r = resolveText(H(['x();'], [], ['y();']).replace(/\n/g, '\r\n'));
check(r.left === 0 && r.text === 'top\r\nx();\r\ny();\r\nbottom', `CRLF line ends aren't kept: ${JSON.stringify(r.text)}`);
r = resolveText(H(['<link href="/css/a.css?v=1">'], ['<link href="/css/a.css?v=0">'], ['<link href="/css/a.css?v=2">']) + '\n' + H(['p();'], ['q();'], ['s();']));
check(r.resolved === 1 && r.left === 1, `a file with one safe and one unsafe conflict: ${JSON.stringify({ resolved: r.resolved, left: r.left })}`);
// (the command: a binary file, a file deleted on one side and a file with an unsafe conflict are left exactly as they were)
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prau-cli-'));
  fs.writeFileSync(path.join(d, 'bin.png'), Buffer.from([0x89, 0x50, 0x00, 0x01]));
  const unsafe = H(['a = 1;'], ['a = 0;'], ['a = 2;']); fs.writeFileSync(path.join(d, 'unsafe.js'), unsafe);
  const p = spawnSync('node', [path.join(__dirname, 'resolve-conflicts.cjs'), 'bin.png', 'gone.js', 'unsafe.js'], { cwd: d, encoding: 'utf8' });
  check(p.status === 2, `the resolver should exit 2 when files need a person, got ${p.status}`);
  check(/bin\.png: a binary file/.test(p.stdout) && /gone\.js: can't be read/.test(p.stdout) && /unsafe\.js: 1 conflict/.test(p.stdout), `the resolver doesn't say why each file needs a person: ${p.stdout}`);
  check(fs.readFileSync(path.join(d, 'unsafe.js'), 'utf8') === unsafe, 'a file with an unsafe conflict was changed');
  fs.rmSync(d, { recursive: true, force: true });
}

/* ---------- the updater on real branches ---------- */
const ROOT = path.join(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prau-'));
const sh = (cwd, cmd, ...args) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }).trim();
const git = (cwd, ...args) => sh(cwd, 'git', '-c', 'user.name=t', '-c', 'user.email=t@t', ...args);
const ORIGIN = path.join(TMP, 'origin.git'), DEV = path.join(TMP, 'dev'), CI = path.join(TMP, 'ci');
try {
  // a copy of this repository as it is committed, as "origin", its main the current commit
  git(ROOT, 'clone', '--quiet', '--bare', '--no-local', ROOT, ORIGIN);
  git(ORIGIN, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  git(ORIGIN, 'branch', '-f', 'main', git(ROOT, 'rev-parse', 'HEAD'));
  git(TMP, 'clone', '--quiet', ORIGIN, DEV);
  const edit = (file, fn) => { const p = path.join(DEV, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
  const commit = (msg) => { git(DEV, 'add', '-A'); git(DEV, 'commit', '--quiet', '-m', msg); };
  const anchor = '/* ---------- 🔒 the trainee\'s own sheet';
  if (!fs.readFileSync(path.join(DEV, 'js/ft-batch-sheet.js'), 'utf8').includes(anchor)) throw new Error('the test\'s anchor line is gone from js/ft-batch-sheet.js');
  const addAt = (line) => edit('js/ft-batch-sheet.js', s => s.replace(anchor, line + '\n' + anchor));

  // branch "feature": its index.html with the build's fingerprints committed, and a line added at the anchor
  git(DEV, 'checkout', '--quiet', '-b', 'feature', 'origin/main');
  sh(DEV, 'node', 'build/script-versions.cjs'); addAt('const featureLine = 1;'); commit('feature: fingerprints committed, a line added');
  const featureOwn = git(DEV, 'rev-parse', 'HEAD');
  // branch "clash": the same line main changes, changed another way
  git(DEV, 'checkout', '--quiet', '-b', 'clash', 'origin/main');
  edit('js/ft-batch-sheet.js', s => s.replace('const ME = "mysheet";', 'const ME = "mysheet-clash";')); commit('clash');
  // branch "broken": opens a block where main adds a line, so the two added lines together don't parse
  git(DEV, 'checkout', '--quiet', '-b', 'broken', 'origin/main');
  addAt('if (window.__x) {'); commit('broken: an opening brace');
  // branch "current": nothing of main's it lacks
  git(DEV, 'checkout', '--quiet', '-b', 'current', 'origin/main');
  edit('README.md', s => s + '\n'); commit('current');
  // main moves on: a hand-written stamp changed, a line added at the same spot, the same line changed
  git(DEV, 'checkout', '--quiet', 'main');
  edit('index.html', s => s.replace(/(src="\/js\/ft-batch-sheet\.js\?v=)[^"]*/, '$1ft-2099.01.01-test'));
  addAt('const mainLine = 2;'); edit('js/ft-batch-sheet.js', s => s.replace('const ME = "mysheet";', 'const ME = "mysheet-main";')); commit('main moves on');
  git(DEV, 'push', '--quiet', 'origin', 'main', 'feature', 'clash', 'broken');
  git(DEV, 'checkout', '--quiet', 'current'); git(DEV, 'merge', '--quiet', '--no-edit', 'origin/main');
  git(DEV, 'push', '--quiet', 'origin', 'current');

  // the workflow's checkout: main, the resolver and the updater taken from it
  git(TMP, 'clone', '--quiet', ORIGIN, CI);
  const tip = b => git(ORIGIN, 'rev-parse', 'refs/heads/' + b);
  const run = (branch) => { const s = path.join(TMP, `summary-${branch}.md`);
    const p = spawnSync('bash', [path.join(ROOT, '.github/scripts/pr-auto-update.sh'), branch], { cwd: CI, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env, { RESOLVER: path.join(ROOT, '.github/scripts/resolve-conflicts.cjs'), SUMMARY: s, GIT_AUTHOR_NAME: 'bot', GIT_AUTHOR_EMAIL: 'b@b', GIT_COMMITTER_NAME: 'bot', GIT_COMMITTER_EMAIL: 'b@b' }) });
    return { code: p.status, out: p.stdout + p.stderr, summary: fs.existsSync(s) ? fs.readFileSync(s, 'utf8') : '' }; };
  const show = (rev, f) => git(ORIGIN, 'show', `${rev}:${f}`);

  // feature: merged, resolved and pushed
  let before = tip('feature'), u = run('feature');
  check(u.code === 0, `feature: expected it brought up to date (0), got ${u.code}: ${u.out}`);
  const after = tip('feature');
  check(after !== before, 'feature: nothing was pushed');
  check(git(ORIGIN, 'merge-base', '--is-ancestor', 'refs/heads/main', after) === '', 'feature: main isn\'t in it after the update');
  check(git(ORIGIN, 'rev-list', '--parents', '-n', '1', after).split(' ').includes(featureOwn), 'feature: its own commit isn\'t a parent of the merge (history rewritten?)');
  const js = show(after, 'js/ft-batch-sheet.js'), html = show(after, 'index.html');
  check(/const featureLine = 1;\nconst mainLine = 2;\n/.test(js), 'feature: the two added lines aren\'t both there, the branch\'s first');
  check(!/^(<{7}|>{7}|={7}|\|{7})/m.test(js + html), 'feature: conflict markers were pushed');
  check(/ft-batch-sheet\.js\?v=ft-2099\.01\.01-test"/.test(html), 'feature: main\'s version stamps weren\'t kept');
  check(/resolve-conflicts\.cjs/.test(git(ORIGIN, 'log', '-1', '--format=%B', after)), 'feature: the merge commit doesn\'t say what was resolved');
  check(!git(ORIGIN, 'ls-tree', '-r', '--name-only', after).split('\n').includes('js/ft-day-decks-data.js'), 'feature: the checks\' build output was committed');

  // clash: a person's decision
  before = tip('clash'); u = run('clash');
  check(u.code === 2, `clash: expected "needs a person" (2), got ${u.code}: ${u.out}`);
  check(tip('clash') === before, 'clash: something was pushed');
  check(/js\/ft-batch-sheet\.js/.test(u.summary) && /by hand/.test(u.summary), `clash: the summary doesn't name the file: ${u.summary}`);

  // broken: resolved, but the result doesn't parse
  before = tip('broken'); u = run('broken');
  check(u.code === 3, `broken: expected "failed a check" (3), got ${u.code}: ${u.out}`);
  check(tip('broken') === before, 'broken: a result that doesn\'t parse was pushed');
  check(/doesn't parse/.test(u.summary), `broken: the summary doesn't say what failed: ${u.summary}`);

  // current: already up to date
  before = tip('current'); u = run('current');
  check(u.code === 10 && tip('current') === before, `current: expected left alone (10), got ${u.code}`);
} catch (e) {
  fail('the test itself failed: ' + (e.stderr || e.message));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

if (failures.length) { console.error('Pull request auto-update test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Pull request auto-update test passed (version stamps and lines both sides added resolved, main\'s stamps kept, both lines kept whole; the same line changed two ways, a deleted or binary file left for a person; a result that doesn\'t parse never pushed; a branch already up to date left alone; the branch\'s own commits never rewritten).');
