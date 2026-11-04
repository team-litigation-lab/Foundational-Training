// ✅ Buffer time, mock calls and demos (js/ft-buffer.js):
//   - the worker: a trainee marks only their own Done (at the server's time), can't undo it or release the batch, and
//     can't write another trainee's; the trainer writes the release, which the trainee reads;
//   - Day 8's demo has no slide of its own, only its preparation slide (build/day-decks.cjs PREP_OFF); a mock call (Day 4's Reception) shows no Mock Calls Ongoing box and no Done, only its metrics, and turns to ✅ Your mock call
//     is done once the trainer has saved the trainee's scoresheet (a Done saved before no longer counts); a
//     buffer slide (Day 9) and Day 5's Monitoring Sheet update get their own screens; other slides get none;
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
      const s9 = await t.evaluate(() => { const i = FTDayDecks.at(9, 's2'); const x = FTDayLocks.steps(9).find(s => i >= s.from && i <= s.to); return x ? x.n : 0; });
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

    // 🌅 no Buffer Time slide is left on a deck (Day 9's and Day 13's are off theirs: build/day-decks.cjs SKIP); Day 13
    // keeps its Call Listening session
    await open(t, 13, 'listen');
    const d13 = await t.evaluate(() => FTDayDecks.list(13).map(s => s.h || ''));
    if (d13.some(h => /Buffer Time/i.test(h))) fail(`Day 13 still has a Buffer Time slide: ${JSON.stringify(d13)}`);
    if (!d13.some(h => /Call Listening/.test(h))) fail(`Day 13 lost its Call Listening session: ${JSON.stringify(d13)}`);
    // 📒 the Monitoring Sheet's items #10–11 close Reception Part 2: their card and 📤 Submit at the lower right of s2b's last page
    // (how the one-on-one mock calls run: the metrics page that followed it is gone, its scorecard is on the preparation page)
    await open(t, 4, 's2b');
    if (!(await toPanel(t))) fail('Day 4\'s metrics page has no Monitoring Sheet card');
    else {
      if (!/Update items #10–11 in your Monitoring Sheet[^]*Once done, hit Submit/.test(await panel(t))) fail(`Day 4's Monitoring Sheet card reads: ${await panel(t)}`);
      const pos = await t.evaluate(() => { const c = document.querySelector('.ftbf-slot.ftbf-corner'), s = c && c.closest('.ftdd-sheet'); if (!c || !s) return null;
        const a = c.getBoundingClientRect(), b = s.getBoundingClientRect(); return { right: b.right - a.right, last: !c.nextElementSibling, run: /How the mock calls run/.test(s.textContent), metrics: /WEIGHTED AVERAGE/.test(s.textContent), only: s.classList.contains('ftbf-only') }; });
      if (!pos || pos.right > 60 || !pos.last || !pos.run || pos.metrics || pos.only) fail(`the Monitoring Sheet card should be at the lower right of the mock calls page, after it (and no metrics page after it): ${JSON.stringify(pos)}`);
    }
    // 📅 Day 5's Attorney Calendar Management Activity: no Submit panel (and no tracker) on its slides: it is submitted on the Main Portal
    await open(t, 5, 's3b');
    for (let k = 0; k < 4; k++) { await t.evaluate(() => FTDayDecks.go(1)); await t.waitForTimeout(300); }
    if (await t.evaluate(() => !!document.querySelector('.ftbf, .ftbf-slot'))) fail('Day 5\'s Attorney Calendar Management Activity still has a Submit panel');

    // 🧪 Day 8's intake packet demo: no slide of its own (build/day-decks.cjs PREP_OFF), only its preparation slide, s3p
    if (!(await t.evaluate(() => { const l = FTDayDecks.list(8); return !l.some(s => s.id === 's3') && l.some(s => s.id === 's3p'); })))
      fail("Day 8's demo still has a slide of its own, or lost its preparation slide");
    if (!(await t.evaluate(() => ['9:s3b', '8:s3', '12:s1d', '14:s1e', '15:s1b', '16:s2'].every(k => FTBuffer.ACTS[k].simple)))) fail('a Days 8–16 mock call or demo is not in Day 4\'s format (simple)');

    // ☎ Day 9's Intake mock calls: no slide of their own (build/day-decks.cjs PREP_OFF): the trainee's case and the Call
    // Simulator and CMS Intake links sit beside the metrics on the Intake Mock Calls Metrics slide, s2; no panel, no Done
    if (await t.evaluate(() => FTDayDecks.list(9).some(s => s.id === 's3b'))) fail("Day 9's Intake Mock Calls slide is still on the deck");
    await open(t, 9, 's2');
    const m9 = await t.evaluate(() => { const s = document.querySelector('main.main-ftdd .ftdd-sheet'); return { panel: !!s.querySelector('.ftbf'), metrics: !!s.querySelector('.ftdd-score .ftms-tbl'), cas: !!s.querySelector('.ftis-mockcall'),
      sim: !!s.querySelector('a[href*="call.html"][href*="track=intake"]'), cms: !!s.querySelector('a[href*="program=intake"]') }; });
    if (m9.panel || !m9.metrics || !m9.cas || !m9.sim || !m9.cms) fail(`Day 9's metrics slide isn't the metrics with the case and the two practice links beside them: ${JSON.stringify(m9)}`);

    // ☎ Day 4's Reception mock calls: no "Mock Calls Ongoing" box; the trainee reads the slide's metrics, read only
    await open(t, 4, 's3');
    const m4 = await t.evaluate(() => { const s = document.querySelector('main.main-ftdd .ftdd-sheet'); return { panel: !!s.querySelector('.ftbf'), only: s.classList.contains('ftbf-only'), ongoing: /Mock Calls Ongoing/.test(s.textContent), metrics: !!s.querySelector('.ftdd-score .ftms-tbl') }; });
    if (m4.panel || m4.only || m4.ongoing || !m4.metrics) fail(`Day 4's Reception mock calls still show the Mock Calls Ongoing box, or not the metrics: ${JSON.stringify(m4)}`);

    // 🧑‍🏫 the trainer's slides: no panel, no live tracker, no preview of what trainees see (a mock call and a demo)
    await a.goto(BASE); await a.evaluate(() => { state.isAdmin = true; state.adminPreview = false; });
    // (Day 4's mock calls, and Day 8's demo preparation now that its demo has no slide of its own)
    for (const [d, sl] of [[4, 's3'], [8, 's3p']]) {
      await open(a, d, sl); await a.waitForTimeout(1500);
      if (await a.evaluate(() => !!document.querySelector('.ftbf, .ftbf-tr, .ftbf-pv'))) fail(`the trainer's Day ${d} ${sl} slide still has a panel, a tracker or what trainees see`);
    }
  } catch (err) { fail('test crashed: ' + err.message); }
  try { await put(t, 'settings:opendays', openWas || { all: [], batches: {} }); if (locks && stepsWas) await put(t, 'settings:daysteps', stepsWas); } catch (err) {}
  await browser.close();
  if (failures.length) { console.error('Buffer / mock call test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Buffer / mock call test passed (the worker keeps a Done the trainee\'s own; the buffer and mock call screens; Day 8\'s demo off the deck, its preparation slide kept; Day 9\'s Intake mock calls on their metrics slide, with the case and the practice links; no panel or tracker on the trainer\'s slides).');
})();
