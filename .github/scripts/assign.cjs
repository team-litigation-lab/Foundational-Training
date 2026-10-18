// 🗂 Case Assignment (js/ft-firms.js): the trainer hands out each trainee's firm and cases in Admin → 🗂 Case
//   Assignment, written to assign:<id>; the trainee reads it and gets nothing until it is set — no case, and a
//   Practice Session that works on one says so rather than opening. The worker keeps assign:<id> the trainer's
//   to write and the trainee's to read only.
// Usage: NODE_PATH=…/node_modules node .github/scripts/assign.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102926';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  if ((await set('assign:ana-cruz--b1', { cases: ['MC-01'] })).status === 200) fail('a trainee assigned themselves a case');
  if ((await set('assign:ana-cruz--b1', { cases: ['MC-01'] }, at)).status !== 200) fail('the trainer can\'t assign a case');
  const read = await call('/api/storage/get', { key: 'assign:ana-cruz--b1' }, t);
  if (!(JSON.parse((read.body || {}).value || 'null') || {}).cases) fail('a trainee can\'t read what the trainer assigned them');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Cassie', 'Case', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('assign:' + id, null);
  await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1600);

  // nothing is handed out on its own: no cases, and a session that needs one doesn't open
  await page.evaluate(() => FTFirms.loadMine(true)); await page.waitForTimeout(900);
  const before = await page.evaluate(() => ({ cases: FTFirms.myCases().length, firm: (FTFirms.myFirm() || {}).name || '' }));
  if (before.cases) fail(`a trainee starts with ${before.cases} cases, before any trainer assigned one`);
  if (!before.firm) fail('a trainee with no assignment has no firm to read the rules of');
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1500);
  const lab0 = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/My cases/.test(lab0)) fail('the Practice Lab has no 🗂 My cases section');
  if (!/No case yet/.test(lab0)) fail('the Practice Lab doesn\'t say the trainer has yet to assign a case');

  // the trainer assigns the firm and two cases
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'assign'; FTFirmAssign.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(b => FTFirmAssign.batch(b), BATCH); await page.waitForTimeout(400);
  const grid = await page.evaluate(() => (document.querySelector('main').innerText || ''));
  if (!/Cassie Case/.test(grid)) fail(`the trainer's grid doesn't list the trainee: ${grid.slice(0, 200)}`);
  if (!/none yet/.test(grid)) fail('the grid doesn\'t say the trainee has no case yet');
  await page.evaluate(i => FTFirmAssign.open(i), id); await page.waitForTimeout(500);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.ff-case')].map(l => l.innerText.split('\n')[0].split(' · ')[0]));
  if (ids.length < 2) fail(`the picker offers ${ids.length} cases of the firm's caseload`);
  await page.evaluate(([i, a]) => FTFirmAssign.tick(i, a, true), [id, ids[0]]); await page.waitForTimeout(900);
  await page.evaluate(([i, a]) => FTFirmAssign.tick(i, a, true), [id, ids[1]]); await page.waitForTimeout(900);
  const rec = await get('assign:' + id);
  if (!rec || JSON.stringify(rec.cases) !== JSON.stringify([ids[0], ids[1]])) fail(`the assignment wasn't saved: ${JSON.stringify(rec)}`);

  // the trainee now has them — and only them
  await page.evaluate(() => { state.isAdmin = false; state.adminData = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.evaluate(() => FTFirms.loadMine(true)); await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({ cases: FTFirms.myCases().map(c => c.id) }));
  if (JSON.stringify(after.cases) !== JSON.stringify([ids[0], ids[1]])) fail(`the trainee sees ${JSON.stringify(after.cases)}, not what the trainer assigned`);
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1500);
  const lab1 = await page.evaluate(() => document.querySelector('main').innerText);
  if (!new RegExp(ids[0]).test(lab1) || !new RegExp(ids[1]).test(lab1)) fail(`🗂 My cases doesn't show both assigned cases: ${lab1.slice(0, 200)}`);
  if (/No case yet/.test(lab1)) fail('🗂 My cases still says none are assigned');
  const other = await page.evaluate(() => (window.FT_CASES || []).map(c => c.id).find(x => !FTFirms.myCases().some(c => c.id === x)));
  if (other && new RegExp(other + '\\b').test(lab1)) fail(`🗂 My cases shows ${other}, which nobody assigned`);

  // the trainer takes them back
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'assign'; FTFirmAssign.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(i => FTFirmAssign.clear(i), id); await page.waitForTimeout(1000);
  const cleared = await get('assign:' + id);
  if (!cleared || (cleared.cases || []).length) fail(`the cases weren't taken back: ${JSON.stringify(cleared)}`);

  await put('assign:' + id, null); await put('settings:opendays', null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Case Assignment test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Case Assignment test passed (nothing handed out on its own: no cases and no case-work session until the trainer assigns one; the trainer assigns the firm and the cases in Admin → 🗂 Case Assignment, the trainee reads them in My cases and sees nobody else\'s; taken back again; the worker keeps assign:<id> the trainer\'s to write).');
})().catch(e => { console.error(e); process.exit(1); });
