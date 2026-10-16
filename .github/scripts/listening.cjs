// 🎧 Call Listening Log (js/ft-listening.js): the four Call Listening sets open with their days; a trainee logs a
//   recording, a half-filled log doesn't count and a full one does; it's saved in listening:<id>, counted on the
//   Practice Lab card and 🏅 My Performance; the day map's steps point to it; the trainer reads a trainee's log and
//   changes a set's recordings (settings:listening); the worker keeps listening:<id> the trainee's own.
// Usage: NODE_PATH=…/node_modules node .github/scripts/listening.cjs http://localhost:8787/
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
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  if ((await set('listening:ana-cruz--b1', { logs: { reception: { 1: { who: 'Existing client' } } } })).status !== 200) fail('a trainee can\'t save their own listening log');
  if ((await set('listening:ana-cruz--b1', { logs: [] })).status === 200) fail('a listening log whose logs is a list was saved');
  if ((await set('listening:ben-diaz--b1', { logs: {} })).status === 200) fail('a trainee wrote another trainee\'s listening log');
  if ((await set('settings:listening', { sets: {} })).status === 200) fail('a trainee changed the listening sets');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if ((await set('settings:listening', { sets: { reception: { n: 3 } } }, at)).status !== 200) fail('the trainer can\'t save the listening sets');
  else if (!JSON.parse(((await call('/api/storage/get', { key: 'settings:listening' }, t)).body || {}).value || 'null')) fail('a trainee can\'t read the listening sets');
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
  await put('settings:listening', null);
  await signIn(page, 'Lena', 'Listener', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('listening:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // the day map points to it on all four Call Listening days
  const steps = await page.evaluate(() => [3, 7, 11, 13].map(d => (FTDays.of(d).items || []).some(x => x.at === 'tool' && x.id === 'listening')));
  if (steps.some(x => !x)) fail(`not every Call Listening day points to the log: ${JSON.stringify(steps)}`);

  // the Practice Lab: all four sets, in day order (this platform locks no lesson)
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
  const cards = await page.evaluate(() => [...document.querySelectorAll('.fts-group')].map(s => s.innerText).filter(t => /Call Listening/.test(t)).join('\n'));
  ['Reception calls', 'Intake calls', 'Insurance communication calls', 'Provider communication calls'].forEach(t => { if (!cards.includes(t)) fail(`the Practice Lab has no Call Listening card for ${t}`); });

  await page.click('text=Open the log'); await page.waitForTimeout(1000);
  if (await page.evaluate(() => state.view) !== 'listening') fail('the card doesn\'t open #/listening');
  if (await page.$$eval('.ln-rec', x => x.length) !== 10) fail('the reception set doesn\'t show its ten recordings');

  // a half-filled log doesn't count
  await page.fill('#ln_reception_1_purpose', 'Client asking for a case status update');
  await page.selectOption('#ln_reception_1_who', 'Existing client');
  await page.locator('.ln-rec').first().locator('.ln-act button').click(); await page.waitForTimeout(1200);
  let rec = await get('listening:' + id);
  if (!rec || !rec.logs.reception || !rec.logs.reception['1']) fail(`a part-filled log wasn't saved: ${JSON.stringify(rec)}`);
  if (await page.evaluate(() => document.querySelector('.ln-count').innerText) !== '0 of 10 logged') fail('a part-filled log counted as logged');
  if (!/still to fill in/.test(await page.evaluate(() => document.querySelector('.ln-rec').innerText))) fail('a part-filled log doesn\'t say what is left');

  // filled in, it counts
  await page.fill('#ln_reception_1_handled', 'Answered with the firm name and her own, verified the caller by name, DOB and date of loss, checked the file, gave the status and the next step, then closed with the firm\'s spiel.');
  await page.fill('#ln_reception_1_phrase', '“Let me pull up your file so I can give you the exact date.”');
  await page.fill('#ln_reception_1_better', 'I would confirm the callback number before ending the call, so the attorney can reach them.');
  await page.locator('.ln-rec').first().locator('.ln-act button').click(); await page.waitForTimeout(1300);
  if (await page.evaluate(() => document.querySelector('.ln-count').innerText) !== '1 of 10 logged') fail('a full log doesn\'t count');
  rec = await get('listening:' + id);
  if (!rec.logs.reception['1'].better || !rec.logs.reception['1'].at) fail(`the full log wasn't saved: ${JSON.stringify(rec.logs.reception['1'])}`);
  if (!(await page.evaluate(() => FTListen.done(FTListen.state().rec.logs.reception['1'])))) fail('the page doesn\'t count the full log as done');
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!/Call Listening[\s\S]*Reception calls[\s\S]*10%/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the listening log');

  // the trainer: reads the log, and changes the set's recordings
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'listening'; FTListenAdmin.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(b => FTListenAdmin.batch(b), BATCH); await page.waitForTimeout(400);
  const grid = await page.evaluate(() => (document.querySelector('.ln-atbl') || {}).innerText || '');
  if (!/Lena Listener[\s\S]*1\/10/.test(grid)) fail(`the trainer's grid doesn't count the log: ${grid.slice(0, 300)}`);
  await page.locator('.ln-atbl tbody tr').first().locator('td:last-child button').click(); await page.waitForTimeout(600);
  const read = await page.evaluate(() => (document.querySelector('.ln-alogs') || {}).innerText || '');
  if (!/complete/.test(read) || !/pull up your file/.test(read)) fail(`the trainer can't read the log: ${read.slice(0, 300)}`);
  await page.click('text=✏️ Edit the recordings'); await page.waitForTimeout(500);
  await page.fill('#lnaN', '3');
  await page.fill('#lnaRecs', 'Angry caller, wrong department | https://drive.google.com/file/d/ABC/view\nPotential client, slip and fall\nAdjuster asking for the adjuster letter');
  await page.click('text=💾 Save this set'); await page.waitForTimeout(1300);
  const st = await get('settings:listening');
  if (!st || !st.sets.reception || st.sets.reception.n !== 3 || st.sets.reception.recs[0].title !== 'Angry caller, wrong department') fail(`the set wasn't saved: ${JSON.stringify(st)}`);

  // the trainee sees the trainer's set
  await page.evaluate(() => { state.isAdmin = false; state.adminData = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => FTListen.open('reception')); await page.waitForTimeout(1200);
  const recs = await page.evaluate(() => [...document.querySelectorAll('.ln-rec b')].map(x => x.innerText));
  if (recs.length !== 3 || recs[0] !== 'Angry caller, wrong department') fail(`the trainee doesn't see the trainer's recordings: ${JSON.stringify(recs)}`);
  if (!(await page.locator('.ln-rec').first().locator('a[href*="/file/d/ABC/"]').count())) fail('a recording\'s own link isn\'t offered');
  if (await page.evaluate(() => document.querySelector('.ln-count').innerText) !== '1 of 3 logged') fail('the count doesn\'t follow the trainer\'s set');

  await put('listening:' + id, null); await put('settings:listening', null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Call Listening Log test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Call Listening Log test passed (the four sets on their days and the day map\'s steps; a part-filled log saved but not counted, a full one counted, saved and on My Performance; the trainer reads a log and changes a set\'s recordings, which the trainee then sees; the worker\'s rules).');
})().catch(e => { console.error(e); process.exit(1); });
