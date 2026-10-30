// ✅ Buffer time, mock calls and demos (js/ft-buffer.js):
//   - the worker: a trainee marks only their own Done (at the server's time), can't undo it or release the batch, and
//     can't write another trainee's; the trainer writes the release, which the trainee reads;
//   - a demo (Day 8's) shows Demos Ongoing and Done, confirmed in a dialog (Cancel keeps them there), then ✅ Done and Go to
//     the next activity →; a mock call (Day 9's Intake) shows only Mock Calls Ongoing, no Done, and turns to ✅ Your mock call
//     is done once the trainer has saved the trainee's scoresheet (a Done saved before no longer counts); a
//     buffer slide (Day 9), Day 5's Monitoring Sheet update and a demo (Day 8) get their own screens; other slides get none;
//   - the trainer, on the same slide: no panel and no live tracker.
// Usage: NODE_PATH=…/node_modules node .github/scripts/buffer.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B103026';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  const get = async (k, tok) => JSON.parse(((await call('/api/storage/get', { key: k }, tok || t)).body || {}).value || 'null');
  const K = 'buffer:ana-cruz--b1';
  if ((await set(K, { acts: { '4:s3': { done: '2001-01-01T00:00:00.000Z', by: 'trainer' } }, released: { '4:s3': '2001-01-01T00:00:00.000Z' } })).status !== 200) fail('a trainee can\'t mark their own Done');
  let r = await get(K);
  if (!r || !r.acts || !r.acts['4:s3'] || r.acts['4:s3'].by !== 'trainee' || /^2001/.test(r.acts['4:s3'].done)) fail(`the trainee's Done isn't stamped by the server: ${JSON.stringify(r)}`);
  if (r && r.released && r.released['4:s3']) fail('a trainee released their own batch');
  await set(K, { acts: {}, released: {} });
  r = await get(K); if (!r || !r.acts['4:s3']) fail('a trainee undid their Done (only the trainer may)');
  if ((await set('buffer:ben-diaz--b1', { acts: { '4:s3': { done: true } } })).status === 200) fail('a trainee wrote another trainee\'s Done');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if ((await set(K, { acts: r.acts, released: { '4:s3': new Date().toISOString() } }, at)).status !== 200) fail('the trainer can\'t release the batch');
  r = await get(K); if (!r || !r.released || !r.released['4:s3']) fail('the trainee can\'t read the trainer\'s release');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const tc = await browser.newContext({ viewport: { width: 1600, height: 900 } }), ac = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const t = await tc.newPage(), a = await ac.newPage();
  for (const p of [t, a]) p.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (p, k, v) => p.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = (p, k) => p.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  let openWas, stepsWas = null, locks = false;
  try {
    // two trainees in the batch: Ray (signed up, then this browser signs in as Tia)
    await t.goto(BASE); await signIn(t, 'Ray', 'Buffer', BATCH); const ray = await t.evaluate(() => state.traineeId);
    await t.evaluate(() => localStorage.clear()); await t.goto(BASE); await signIn(t, 'Tia', 'Buffer', BATCH); const tia = await t.evaluate(() => state.traineeId);
    for (const id of [ray, tia]) { const r = await get(t, 'trainee:' + id); r.approved = true; r.archived = false; await put(t, 'trainee:' + id, r); await put(t, 'buffer:' + id, { acts: {}, released: {} }); }
    // every lesson open for the batch (where a day's steps wait for its lesson, js/ft-day-locks.js); put back at the end
    openWas = await get(t, 'settings:opendays');
    await put(t, 'settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8, 9], batches: {} });
    await t.evaluate(() => typeof ftLoadOpenDays === 'function' && ftLoadOpenDays());
    // where Activity Locks run (js/ft-day-locks.js), Day 9 is opened to its mock calls
    // (Day 9's Intake mock calls: Day 6's One-on-One slide, which this checked before, is off the deck)
    locks = await t.evaluate(() => !!window.FTDayLocks);
    if (locks) {
      stepsWas = await get(t, 'settings:daysteps');
      await t.evaluate(() => FTDayDecks.open(9, 0)); await t.waitForTimeout(1500);   // (the decks loaded, so Day 9's steps are known)
      const s9 = await t.evaluate(() => { const i = FTDayDecks.at(9, 's3b'); const x = FTDayLocks.steps(9).find(s => i >= s.from && i <= s.to); return x ? x.n : 0; });
      if (!s9) fail('Day 9\'s mock call step isn\'t among its Activity Locks steps');
      // (its records keep 9:s3)
      const all = Object.assign({}, (stepsWas || {}).all || {}, { 9: s9 });
      // (a count in card-row steps, flagged so: js/ft-day-locks.js reads an unflagged one as a count of the old slide steps)
      const rows = { all: Object.assign({}, ((stepsWas || {}).rows || {}).all || {}, { 9: 1 }), batches: {} };
      await put(t, 'settings:daysteps', Object.assign({}, stepsWas || {}, { all, batches: {}, rows }));
      await t.evaluate(() => ftLoadOpenDays());
    }
    const open = async (p, d, s) => { await p.evaluate(d => FTDayDecks.open(d, 0), d); await p.waitForTimeout(1200); await p.evaluate(([d, s]) => FTDayDecks.open(d, FTDayDecks.at(d, s)), [d, s]); await p.waitForTimeout(2200); };
    // the panel is at the foot of the slide: turn to the page it's on
    const toPanel = async (p) => { for (let k = 0; k < 8; k++) { if (await p.evaluate(() => { const x = document.querySelector('.ftbf'); return !!(x && x.offsetParent); })) return true; await p.evaluate(() => FTDayDecks.go(1)); await p.waitForTimeout(600); } return false; };
    const panel = p => p.evaluate(() => (document.querySelector('.ftbf') || {}).innerText || '');

    // a slide that isn't a buffer, mock call or demo has none
    await open(t, 4, 's2');   // (Day 4's Training Video Viewing: its one-line introduction joined it, build/day-decks.cjs SKIP)
    if (await t.evaluate(() => !!document.querySelector('.ftbf'))) fail('Day 4\'s Training Video Viewing slide got a buffer panel');

    // 🌅 a buffer slide: the line and Done, no dialog (Day 13's Buffer Time; Day 9's is off its deck)
    await open(t, 13, 's1');
    if (!(await toPanel(t))) fail('Day 13\'s Buffer Time has no buffer panel');
    else {
      if (!/Use this buffer to finish all your pending tasks\. Hit Done when you are\./.test(await panel(t))) fail(`the buffer panel's words: ${await panel(t)}`);
      if (await t.evaluate(() => !!document.querySelector('.ftdd-sheet .ftdd-wait'))) fail('the buffer slide still has its ⏳ While you wait box beside the panel');
      await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(1800); await toPanel(t);
      if (await t.evaluate(() => !!document.querySelector('.ftbf-modal'))) fail('Done on a buffer asked for a confirmation');
      if (!/✅ Done/.test(await panel(t))) fail(`a buffer's Done didn't turn the panel to Done: ${await panel(t)}`);
    }
    // 📒 the Monitoring Sheet's items #10–11 close Reception Part 2: their card and 📤 Submit at the lower right of the metrics page (s2b's last)
    await open(t, 4, 's2b');
    if (!(await toPanel(t))) fail('Day 4\'s metrics page has no Monitoring Sheet card');
    else {
      if (!/Update items #10–11 in your Monitoring Sheet[^]*Once done, hit Submit/.test(await panel(t))) fail(`Day 4's Monitoring Sheet card reads: ${await panel(t)}`);
      const pos = await t.evaluate(() => { const c = document.querySelector('.ftbf-slot.ftbf-corner'), s = c && c.closest('.ftdd-sheet'); if (!c || !s) return null;
        const a = c.getBoundingClientRect(), b = s.getBoundingClientRect(); return { right: b.right - a.right, last: !c.nextElementSibling, metrics: /WEIGHTED AVERAGE/.test(s.textContent), only: s.classList.contains('ftbf-only') }; });
      if (!pos || pos.right > 60 || !pos.last || !pos.metrics || pos.only) fail(`the Monitoring Sheet card should be at the lower right of the metrics page, after it: ${JSON.stringify(pos)}`);
    }
    // 📅 Day 5's Attorney Calendar Management Activity: no Submit panel (and no tracker) on its slides: it is submitted on the Main Portal
    await open(t, 5, 's3b');
    for (let k = 0; k < 4; k++) { await t.evaluate(() => FTDayDecks.go(1)); await t.waitForTimeout(300); }
    if (await t.evaluate(() => !!document.querySelector('.ftbf, .ftbf-slot'))) fail('Day 5\'s Attorney Calendar Management Activity still has a Submit panel');

    // 🧪 a demo slide, as Day 4's mock calls: only "Demos Ongoing", its line and Done; its instructions and metrics are on
    // the preparation slide before it (build/day-decks.cjs PREP), a card row and step of its own as on Day 4
    await open(t, 8, 's3'); await toPanel(t);
    const d8 = await panel(t);
    if (!/Demos Ongoing/.test(d8) || !/Hit Done when you are done with your Demo\./.test(d8) || /Practice Buffer/.test(d8)) fail(`Day 8's intake packet demo isn't Day 4's Done panel: ${d8.slice(0, 120)}`);
    if (!(await t.evaluate(() => { const l = FTDayDecks.list(8), i = l.findIndex(s => s.id === 's3'); return i > 0 && l[i - 1].id === 's3p' && l[i - 1].row === l[i].row - 1; })))
      fail("Day 8's demo has no preparation slide, a row of its own, before it");
    if (!(await t.evaluate(() => ['9:s3b', '8:s3', '12:s1d', '14:s1e', '15:s1b', '16:s2'].every(k => FTBuffer.ACTS[k].simple)))) fail('a Days 8–16 mock call or demo is not in Day 4\'s format (simple)');

    // 🧪 Day 8's demo: Done → the dialog → ✅ Done and the way on (no trainer's release to wait for)
    await open(t, 8, 's3');
    if (!(await toPanel(t))) fail('Day 8\'s demo has no Done panel');
    await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(300);
    const q = await t.evaluate(() => (document.querySelector('.ftbf-modal') || {}).innerText || '');
    if (!/Have you completed your 1-on-1 demo with the trainer\?/.test(q) || !/Cancel/.test(q) || !/Yes, I’m Done/.test(q)) fail(`the confirmation reads: ${q}`);
    await t.click('.ftbf-modal .btn-ghost'); await t.waitForTimeout(300);
    if (await t.evaluate(() => !!document.querySelector('.ftbf-modal'))) fail('Cancel didn\'t close the confirmation');
    if ((await get(t, 'buffer:' + tia) || { acts: {} }).acts['8:s3']) fail('Cancel marked the trainee done');
    await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(300); await t.click('.ftbf-modal .btn-primary'); await t.waitForTimeout(2200); await toPanel(t);
    const w8 = await panel(t);
    if (!/✅ Done/.test(w8) || !/Go to the next activity/.test(w8) || /Waiting for/.test(w8)) fail(`Day 8's Done reads: ${w8.slice(0, 200)}`);
    if (!((await get(t, 'buffer:' + tia)) || { acts: {} }).acts['8:s3']) fail('the trainee\'s Done wasn\'t saved');

    // ☎ Day 9's Intake mock calls: only "Mock Calls Ongoing", no Done (the trainer's scoresheet makes it done, below); the
    // metrics on the Intake Mock Calls Metrics slide before it, a card row and step of its own
    await open(t, 9, 's3b'); await toPanel(t);
    const m9 = await panel(t);
    if (!/Mock Calls Ongoing/.test(m9) || /Hit Done/.test(m9) || (await t.$('.ftbf .ftbf-done')) || /Practice Buffer/.test(m9)) fail(`Day 9's mock calls aren't the no-Done panel: ${m9.slice(0, 120)}`);
    if (!(await t.evaluate(() => { const l = FTDayDecks.list(9), i = l.findIndex(s => s.id === 's3b'); return i > 0 && l[i - 1].id === 's2' && l[i - 1].row === l[i].row - 1; })))
      fail("Day 9's mock calls have no Intake Mock Calls Metrics slide, a row of its own, before them");

    // ☎ a mock call is done once the trainer has saved the trainee's scoresheet (labreview), which turns their panel to ✅ done;
    // a Done saved before (the old tracker's, or the trainee's own) no longer counts
    const tiaBuf = (await get(t, 'buffer:' + tia)) || { acts: {}, released: {} };
    await put(t, 'buffer:' + tia, { acts: Object.assign({}, tiaBuf.acts, { '9:s3': { done: '2026-10-29T12:00:00.000Z', by: 'trainee' } }), released: tiaBuf.released || {} });
    await t.reload({ waitUntil: 'load' }); await t.waitForTimeout(1500);
    await open(t, 9, 's3b'); await toPanel(t);
    if (!/Mock Calls Ongoing/.test(await panel(t))) fail('a mock call Done saved before still counts');
    await put(t, 'labreview:' + tia, { acts: { 'intake-live': { status: 'Passed', score: 84, at: '2026-10-30T12:00:00.000Z', comment: 'Good.' } } });
    await t.reload({ waitUntil: 'load' }); await t.waitForTimeout(1500);
    await open(t, 9, 's3b'); await t.waitForTimeout(1500); await open(t, 9, 's3b'); await toPanel(t);
    const s9 = await panel(t);
    if (!/✅ Your mock call is done/.test(s9) || !/scored it: Passed/.test(s9)) fail(`a scored trainee's mock call panel reads: ${s9.slice(0, 200)}`);
    await put(t, 'buffer:' + tia, tiaBuf);

    // 🧑‍🏫 the trainer's slides: no panel, no live tracker, no preview of what trainees see (a mock call and a demo)
    await a.goto(BASE); await a.evaluate(() => { state.isAdmin = true; state.adminPreview = false; });
    for (const [d, sl] of [[9, 's3b'], [8, 's3']]) {
      await open(a, d, sl); await a.waitForTimeout(1500);
      if (await a.evaluate(() => !!document.querySelector('.ftbf, .ftbf-tr, .ftbf-pv'))) fail(`the trainer's Day ${d} ${sl} slide still has a panel, a tracker or what trainees see`);
    }
  } catch (err) { fail('test crashed: ' + err.message); }
  try { await put(t, 'settings:opendays', openWas || { all: [], batches: {} }); if (locks && stepsWas) await put(t, 'settings:daysteps', stepsWas); } catch (err) {}
  await browser.close();
  if (failures.length) { console.error('Buffer / mock call test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Buffer / mock call test passed (the worker keeps a Done the trainee\'s own; the buffer, demo and mock call screens; Day 8\'s demo Done, its confirmation and the way on; Day 9\'s Intake mock calls with no Done, done once the trainer has scored them; no panel or tracker on the trainer\'s slides).');
})();
