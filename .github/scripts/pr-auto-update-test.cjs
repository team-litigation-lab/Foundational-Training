// 🔄 Keeping pull requests up to date after a deploy (.github/workflows/pr-auto-update.yml): the conflict resolver
// (.github/scripts/resolve-conflicts.cjs) on its own and as a command in a real merge, then the updater
// (.github/scripts/pr-auto-update.sh) on real branches of a copy of this repository, pushed to a local "origin":
//   - a branch that committed build/script-versions.cjs's ?v= fingerprints and added a line where main added another (what
//     PR #540 met) is merged, resolved (main's stamps, both lines) and pushed, its own commits untouched;
//   - never resolved: the same line changed two ways, additions with a line in common or a name declared on both sides,
//     a ?v= outside index.html's stamps, a file deleted on one side or created on both, binary, not UTF-8, mixed line
//     ends or with marker-like lines of its own;
//   - a resolution that doesn't parse is caught by the checks, but a check the branch already failed isn't blamed on
//     the merge;
//   - a change to .github/workflows is not pushed without a token allowed to (CAN_PUSH_WORKFLOWS), and is with one;
//   - a branch already up to date, or already merged into main, is left alone; one pushed to meanwhile isn't overwritten.
// Run: node .github/scripts/pr-auto-update-test.cjs   (from the repository root; needs git and node)
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { resolveText } = require('./resolve-conflicts.cjs');

const failures = []; const fail = m => failures.push(m);
const check = (ok, m) => { if (!ok) fail(m); };
const BUF = 256 * 1024 * 1024;
const sh = (cwd, cmd, ...args) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: BUF }).trim();
const git = (cwd, ...args) => sh(cwd, 'git', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'init.defaultBranch=main', ...args);

/* ---------- the resolver on its own ---------- */
const H = (ours, base, theirs) => ['top', '<<<<<<< HEAD', ...ours, '||||||| base', ...base, '=======', ...theirs, '>>>>>>> origin/main', 'bottom'].join('\n');
let r = resolveText(H(['<script src="/js/a.js?v=04f3817ed3"></script>', '<script src="/js/b.js?v=1"></script>'], ['<script src="/js/a.js?v=old"></script>', '<script src="/js/b.js?v=1"></script>'],
  ['<script src="/js/a.js?v=ft-2026.11.05-x"></script>', '<script src="/js/b.js?v=ft-2"></script>']), 'index.html');
check(r.left === 0 && r.text === 'top\n<script src="/js/a.js?v=ft-2026.11.05-x"></script>\n<script src="/js/b.js?v=ft-2"></script>\nbottom', `version stamps: main's side wasn't kept: ${JSON.stringify(r)}`);
r = resolveText(H(['var APP_BUILD = "ft-2026.11.05-aaaa";'], ['var APP_BUILD = "ft-1";'], ['var APP_BUILD = "ft-2026.11.05-bbbb";']), 'index.html');
check(r.left === 0 && /bbbb/.test(r.text) && !/aaaa/.test(r.text), `APP_BUILD wasn't resolved to main's: ${r.text}`);
r = resolveText(H(['<script src="/js/a.js?v=1"></script>'], ['<script src="/js/a.js?v=0"></script>'], ['<script src="/js/a.js?v=2"></script>']), 'js/ft-x.js');
check(r.left === 1, 'a ?v= outside index.html was taken for a deploy stamp');
r = resolveText(H(['  const v = s && /\\?v=([^&#]+)/.exec(s.src);'], ['  const v = s && /\\?v=([^&]+)/.exec(s.src);'], ['  const v = s && /\\?v=([^&]+)/.exec(s.currentSrc);']), 'index.html');
check(r.left === 1, 'code after a ?v= (a regex) was taken for a stamp: a real change would be lost');
r = resolveText(H(['  background: url("/img/bg.webp?v=2026-11-05");'], ['  background: url("/img/bg.webp?v=2026-10-23");'], ['  background: url("/img/bg.webp?v=2026-10-30");']), 'index.html');
check(r.left === 1, 'an image\'s cache-buster in index.html was taken for a deploy stamp');
r = resolveText(H(['    ${approvalsHtml(ppl)}'], [], ['    ${dupHtml()}']), 'js/ft-batch-sheet.js');
check(r.left === 0 && r.text === 'top\n    ${approvalsHtml(ppl)}\n    ${dupHtml()}\nbottom', `lines both sides added: not both kept: ${r.text}`);
r = resolveText(H(['  linksPct(id){ return 1; },', '  archive(){ return 2; },'], [], ['  ofRow(id){ return 3; },', '  ofDay(d){ return 4; },']), 'js/ft-batch-sheet.js');
check(r.left === 0, `different methods both sides added weren't both kept: ${JSON.stringify(r.why)}`);
r = resolveText(H(['  }', '  x();'], [], ['  }', '  y();']), 'a.js');
check(r.left === 0 && r.text === 'top\n  }\n  x();\n  }\n  y();\nbottom', `both additions must be kept whole (a shared closing brace too): ${r.text}`);
r = resolveText(H(['same();'], [], ['same();']), 'a.js');
check(r.left === 0 && r.text === 'top\nsame();\nbottom', `the same addition on both sides isn't kept once: ${r.text}`);
r = resolveText(H(['shared();', 'mine();'], [], ['shared();']), 'a.js');
check(r.left === 1, 'additions with a line in common (a cherry-pick) were both kept: the line would be there twice');
r = resolveText(H(['<script src="/js/ft-helper.js?v=1"></script>', '<script src="/js/ft-mine.js?v=1"></script>'], [], ['<script src="/js/ft-helper.js?v=ft-2026.11.05-helper"></script>']), 'index.html');
check(r.left === 1, 'the same script added on both sides (stamps apart) was kept twice');
r = resolveText(H(['  csvName(){ return "batch-sheet.csv"; },'], [], ['  csvName(){ return "export.csv"; },']), 'js/ft-batch-sheet.js');
check(r.left === 1, 'the same method added two ways was kept twice');
r = resolveText(H(['  pending: "Waiting",'], [], ['  pending: "Pending",']), 'a.js');
check(r.left === 1, 'the same object key added two ways was kept twice');
r = resolveText(H(['function fmt(x){ return "a" + x; }'], [], ['async function fmt(x){ return "b" + x; }']), 'a.js');
check(r.left === 1, 'the same function added two ways was kept twice');
r = resolveText(H(['<div id="bsMenu">a</div>'], [], ['<section id="bsMenu">b</section>']), 'index.html');
check(r.left === 1, 'two elements with the same id were both kept');
r = resolveText(H(['a = 1;'], ['a = 0;'], ['a = 2;']), 'a.js');
check(r.resolved === 0 && r.left === 1 && /<<<<<<< HEAD/.test(r.text), 'the same line changed two ways was resolved: it is a person\'s decision');
r = resolveText(['<<<<<<< HEAD', 'a();', '=======', 'b();', '>>>>>>> main'].join('\n'), 'a.js');
check(r.left === 1, 'a conflict without the ancestor (no diff3) was resolved as an addition');
r = resolveText(H(['x();'], [], ['y();']).replace(/\n/g, '\r\n'), 'a.js');
check(r.left === 0 && r.text === 'top\r\nx();\r\ny();\r\nbottom', `CRLF line ends aren't kept: ${JSON.stringify(r.text)}`);
r = resolveText(H(['<link href="/css/a.css?v=1">'], ['<link href="/css/a.css?v=0">'], ['<link href="/css/a.css?v=2">']) + '\n' + H(['p();'], ['q();'], ['s();']), 'index.html');
check(r.resolved === 1 && r.left === 1, `a file with one safe and one unsafe conflict: ${JSON.stringify({ resolved: r.resolved, left: r.left })}`);

/* ---------- the resolver as a command, in a real merge ---------- */
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prau-cli-'));
  try {
    git(d, 'init', '--quiet'); git(d, 'checkout', '--quiet', '-b', 'main');
    const W = (f, v) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), v); };
    W('bin.png', Buffer.from([0x89, 0x50, 0x00, 0x01])); W('gone.js', 'a();\n'); W('unsafe.js', 'a = 0;\n'); W('mixed.js', 'x();\r\ny();\n');
    W('latin.txt', Buffer.from('caf\xe9 0\n', 'latin1')); W('notes.md', 'Intro\n'); W('fine.js', 'one();\n');
    git(d, 'add', '-A'); git(d, 'commit', '--quiet', '-m', 'base');
    git(d, 'checkout', '--quiet', '-b', 'feature');
    W('bin.png', Buffer.from([0x89, 0x50, 0x00, 0x02])); fs.unlinkSync(path.join(d, 'gone.js')); W('unsafe.js', 'a = 1;\n'); W('mixed.js', 'x();\r\ny(1);\n');
    W('latin.txt', Buffer.from('caf\xe9 1\n', 'latin1')); W('notes.md', 'Intro\n<<<<<<< HEAD\nbranch\n'); W('fine.js', 'one();\nbranchLine();\n'); W('both.md', '# Plan\nbranch\n');
    git(d, 'add', '-A'); git(d, 'commit', '--quiet', '-m', 'feature');
    git(d, 'checkout', '--quiet', 'main');
    W('bin.png', Buffer.from([0x89, 0x50, 0x00, 0x03])); W('gone.js', 'a(2);\n'); W('unsafe.js', 'a = 2;\n'); W('mixed.js', 'x();\r\ny(2);\n');
    W('latin.txt', Buffer.from('caf\xe9 2\n', 'latin1')); W('notes.md', 'Intro\nmain\n'); W('fine.js', 'one();\nmainLine();\n'); W('both.md', '# Plan\nmain\n');
    git(d, 'add', '-A'); git(d, 'commit', '--quiet', '-m', 'main');
    git(d, 'checkout', '--quiet', 'feature');
    spawnSync('git', ['-c', 'merge.conflictStyle=diff3', '-c', 'user.name=t', '-c', 'user.email=t@t', 'merge', '--no-edit', 'main'], { cwd: d });
    const files = ['bin.png', 'gone.js', 'unsafe.js', 'mixed.js', 'latin.txt', 'notes.md', 'both.md', 'fine.js'];
    const before = Object.fromEntries(files.map(f => [f, fs.existsSync(path.join(d, f)) ? fs.readFileSync(path.join(d, f)) : null]));
    const p = spawnSync('node', [path.join(__dirname, 'resolve-conflicts.cjs'), ...files], { cwd: d, encoding: 'utf8' });
    const said = f => (p.stdout.split('\n').find(l => l.includes(` ${f}:`)) || '');
    check(p.status === 2, `the resolver should exit 2 when files need a person, got ${p.status}: ${p.stdout}`);
    check(/binary/.test(said('bin.png')), `bin.png: ${said('bin.png')}`);
    check(/deleted on one side/.test(said('gone.js')), `gone.js (deleted on the branch): ${said('gone.js')}`);
    check(/need a person/.test(said('unsafe.js')), `unsafe.js: ${said('unsafe.js')}`);
    check(/mixed CRLF and LF/.test(said('mixed.js')), `mixed.js: ${said('mixed.js')}`);
    check(/not UTF-8/.test(said('latin.txt')), `latin.txt: ${said('latin.txt')}`);
    check(/look like conflict markers/.test(said('notes.md')), `notes.md (a marker-like line of its own): ${said('notes.md')}`);
    check(/created this file/.test(said('both.md')), `both.md (created on both sides): ${said('both.md')}`);
    check(/^✓ fine\.js: 1 conflict/.test(said('fine.js')) && fs.readFileSync(path.join(d, 'fine.js'), 'utf8') === 'one();\nbranchLine();\nmainLine();\n', `fine.js wasn't resolved: ${said('fine.js')}`);
    for (const f of files.filter(f => f !== 'fine.js')) {
      const now = fs.existsSync(path.join(d, f)) ? fs.readFileSync(path.join(d, f)) : null;
      check(String(now) === String(before[f]), `${f} was changed although it needs a person`);
    }
  } catch (e) { fail('the resolver command test itself failed: ' + (e.stderr || e.message)); }
  finally { fs.rmSync(d, { recursive: true, force: true }); }
}

/* ---------- the updater on real branches ---------- */
const ROOT = path.join(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'prau-'));
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
  if (!fs.readFileSync(path.join(DEV, 'js/ft-batch-sheet.js'), 'utf8').includes('const ME = "mysheet";')) throw new Error('the test\'s "const ME" line is gone from js/ft-batch-sheet.js');
  const addAt = (line) => edit('js/ft-batch-sheet.js', s => s.replace(anchor, line + '\n' + anchor));
  const from = b => git(DEV, 'checkout', '--quiet', '-b', b, 'origin/main');

  // "feature": its index.html with the build's fingerprints committed, and a line added at the anchor
  from('feature'); sh(DEV, 'node', 'build/script-versions.cjs'); addAt('const featureLine = 1;'); commit('feature: fingerprints committed, a line added');
  const featureOwn = git(DEV, 'rev-parse', 'HEAD');
  // "clash": the same line main changes, changed another way
  from('clash'); edit('js/ft-batch-sheet.js', s => s.replace('const ME = "mysheet";', 'const ME = "mysheet-clash";')); commit('clash');
  // "broken": a new page of its own loading js/ft-deck-motion.js, which main deletes later: each side passes the checks,
  // the merge (no conflict at all) doesn't
  from('broken'); fs.writeFileSync(path.join(DEV, 'zz-broken.html'), '<!doctype html><title>t</title><script src="/js/ft-deck-motion.js"></script>\n'); commit('broken: a page loading ft-deck-motion.js');
  // "prebroken": a script of its own that doesn't parse, before any merge (the site check fails on it already)
  from('prebroken'); fs.writeFileSync(path.join(DEV, 'js/ft-zz-prebroken.js'), 'function (\n'); commit('prebroken: a script that does not parse');
  // "current": nothing of main's it lacks
  from('current'); fs.writeFileSync(path.join(DEV, 'current.txt'), 'current\n'); commit('current');
  // "merged": already merged into main
  from('merged'); fs.writeFileSync(path.join(DEV, 'merged.txt'), 'merged\n'); commit('merged');
  // "moving": pushed to again by its author while the update runs
  from('moving'); fs.writeFileSync(path.join(DEV, 'moving.txt'), 'moving 1\n'); commit('moving 1');
  // "wf": an ordinary branch, from before main changes a workflow
  from('wf'); fs.writeFileSync(path.join(DEV, 'wf.txt'), 'wf\n'); commit('wf');
  // main moves on: a hand-written stamp changed, a line added at the same spot, the same line changed, "merged" merged
  git(DEV, 'checkout', '--quiet', 'main');
  edit('index.html', s => s.replace(/(src="\/js\/ft-batch-sheet\.js\?v=)[^"]*/, '$1ft-2099.01.01-test'));
  addAt('const mainLine = 2;'); edit('js/ft-batch-sheet.js', s => s.replace('const ME = "mysheet";', 'const ME = "mysheet-main";')); commit('main moves on');
  git(DEV, 'merge', '--quiet', '--no-ff', '--no-edit', 'merged');
  git(DEV, 'push', '--quiet', 'origin', 'main', 'feature', 'clash', 'broken', 'prebroken', 'merged', 'moving', 'wf');
  git(DEV, 'checkout', '--quiet', 'current'); git(DEV, 'merge', '--quiet', '--no-edit', 'origin/main'); git(DEV, 'push', '--quiet', 'origin', 'current');

  // the workflow's checkout: main, the resolver and the updater taken from it
  git(TMP, 'clone', '--quiet', ORIGIN, CI);
  const tip = b => git(ORIGIN, 'rev-parse', 'refs/heads/' + b);
  const run = (branch, env) => { const s = path.join(TMP, `summary-${branch}.md`);
    const p = spawnSync('bash', [path.join(ROOT, '.github/scripts/pr-auto-update.sh'), branch], { cwd: CI, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env, { PR_AUTO_UPDATE: '1', RESOLVER: path.join(ROOT, '.github/scripts/resolve-conflicts.cjs'), SUMMARY: s, PUSH_TOKEN: '',
        GIT_AUTHOR_NAME: 'bot', GIT_AUTHOR_EMAIL: 'b@b', GIT_COMMITTER_NAME: 'bot', GIT_COMMITTER_EMAIL: 'b@b' }, env || {}) });
    return { code: p.status, out: p.stdout + p.stderr, summary: fs.existsSync(s) ? fs.readFileSync(s, 'utf8') : '' }; };
  const show = (rev, f) => git(ORIGIN, 'show', `${rev}:${f}`);

  // (refuses to run outside the workflow: it cleans the tree it runs in)
  const guard = spawnSync('bash', [path.join(ROOT, '.github/scripts/pr-auto-update.sh'), 'feature'], { cwd: CI, encoding: 'utf8', env: Object.assign({}, process.env, { PR_AUTO_UPDATE: '', RESOLVER: 'x' }) });
  check(guard.status === 3 && /throwaway clone/.test(guard.stderr), `run by hand without PR_AUTO_UPDATE=1 it should refuse: ${guard.status} ${guard.stderr}`);

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
  check(u.code === 2 && tip('clash') === before, `clash: expected "needs a person" (2) and nothing pushed, got ${u.code}: ${u.out}`);
  check(/js\/ft-batch-sheet\.js/.test(u.summary) && /by hand/.test(u.summary), `clash: the summary doesn't name the file: ${u.summary}`);


  // prebroken: the site check failed before the merge too: not the merge's doing, so it is updated, and says so
  before = tip('prebroken'); u = run('prebroken');
  check(u.code === 0 && tip('prebroken') !== before, `prebroken: a check the branch already failed was blamed on the merge (${u.code}): ${u.out}`);
  check(/already failed before the merge/.test(u.summary), `prebroken: the summary doesn't say the check failed before: ${u.summary}`);

  // current and merged: nothing to do
  before = tip('current'); u = run('current');
  check(u.code === 10 && tip('current') === before, `current: expected left alone (10), got ${u.code}`);
  before = tip('merged'); u = run('merged');
  check(u.code === 10 && tip('merged') === before, `merged (already in main): expected left alone (10), got ${u.code}: ${u.out}`);

  // moving: its author pushes while the update runs (between its fetch and its push) — the update doesn't overwrite it
  {
    const s = path.join(TMP, 'summary-moving.md'), hook = path.join(TMP, 'node-hook.cjs');
    // (the moment the checks start: another push to the branch)
    fs.writeFileSync(hook, `if (process.argv.some(a => /day-decks\\.cjs$/.test(a)) && !require('fs').existsSync(${JSON.stringify(path.join(TMP, 'moved'))})) {
      require('fs').writeFileSync(${JSON.stringify(path.join(TMP, 'moved'))}, '1');
      require('child_process').execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '--allow-empty', '-m', 'moving 2'], { cwd: ${JSON.stringify(DEV)} });
      require('child_process').execFileSync('git', ['push', '--quiet', 'origin', 'HEAD:moving'], { cwd: ${JSON.stringify(DEV)} });
    }`);
    git(DEV, 'checkout', '--quiet', 'moving');
    const p = spawnSync('bash', [path.join(ROOT, '.github/scripts/pr-auto-update.sh'), 'moving'], { cwd: CI, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env, { PR_AUTO_UPDATE: '1', RESOLVER: path.join(ROOT, '.github/scripts/resolve-conflicts.cjs'), SUMMARY: s, NODE_OPTIONS: `--require ${hook}`,
        GIT_AUTHOR_NAME: 'bot', GIT_AUTHOR_EMAIL: 'b@b', GIT_COMMITTER_NAME: 'bot', GIT_COMMITTER_EMAIL: 'b@b' }) });
    check(p.status === 3 && /meanwhile/.test(fs.readFileSync(s, 'utf8')), `moving: a branch pushed to meanwhile should be left for the next deploy (3), got ${p.status}: ${p.stdout}${p.stderr}`);
    check(git(ORIGIN, 'log', '-1', '--format=%s', 'refs/heads/moving') === 'moving 2', 'moving: its author\'s push was overwritten');
  }

  // broken: main deletes js/ft-deck-motion.js (and its tag); the merge is clean, but the branch's page now loads a file
  // that isn't there: the site check fails on the merged result although it passes on the branch, so nothing is pushed
  git(DEV, 'checkout', '--quiet', 'main'); git(DEV, 'pull', '--quiet', 'origin', 'main');
  fs.unlinkSync(path.join(DEV, 'js/ft-deck-motion.js')); edit('index.html', s => s.replace(/\n<script src="\/js\/ft-deck-motion\.js[^\n]*/, ''));
  commit('main drops ft-deck-motion.js'); git(DEV, 'push', '--quiet', 'origin', 'main');
  before = tip('broken'); u = run('broken');
  check(u.code === 3 && tip('broken') === before, `broken: expected "failed a check" (3) and nothing pushed, got ${u.code}: ${u.out}`);
  check(/site check failed/.test(u.summary) && /passes/.test(u.summary), `broken: the summary doesn't say what failed: ${u.summary}`);

  // wf: main changes a workflow file; without a token allowed to push it nothing is pushed (4); with one it is (0)
  edit('.github/workflows/checks.yml', s => s + '\n# (a change to a workflow)\n'); commit('main changes a workflow'); git(DEV, 'push', '--quiet', 'origin', 'main');
  before = tip('wf'); u = run('wf', { CAN_PUSH_WORKFLOWS: '0' });
  check(u.code === 4 && tip('wf') === before, `wf: a merge bringing in a workflow change was pushed without the token for it (${u.code}): ${u.out}`);
  check(/workflow file/.test(u.summary) && /PR_UPDATE_TOKEN/.test(u.summary), `wf: the summary doesn't say why: ${u.summary}`);
  u = run('wf', { CAN_PUSH_WORKFLOWS: '1' });
  check(u.code === 0 && tip('wf') !== before, `wf: with a token allowed to push workflows it should be updated (${u.code}): ${u.out}`);
} catch (e) {
  fail('the test itself failed: ' + (e.stderr || e.message));
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

if (failures.length) { console.error('Pull request auto-update test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
console.log('Pull request auto-update test passed (index.html\'s stamps and different lines both sides added resolved; never: the same lines changed two ways, a line or a name on both sides, a ?v= that isn\'t a deploy stamp, a file deleted, created on both sides, binary, not UTF-8, with mixed line ends or marker-like lines; a result that doesn\'t parse never pushed, a check the branch already failed not blamed on the merge; a workflow change only with a token allowed to push it; a branch up to date, merged or pushed to meanwhile left alone; the branch\'s own commits never rewritten).');
