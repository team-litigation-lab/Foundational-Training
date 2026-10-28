// ✅ Buffer time, mock calls and demos (js/ft-buffer.js):
//   - the worker: a trainee marks only their own Done (at the server's time), can't undo it or release the batch, and
//     can't write another trainee's; the trainer writes the release, which the trainee reads;
//   - a trainee on Day 6's Calendar Management mock calls sees Practice Buffer: Mock Call Preparation (the Call
//     Simulator and Ring Channel links, the warning, Done at the foot), confirms Done in a dialog (Cancel keeps them
//     there), and gets Screen 2, Debrief Prep, with the activity's scorecard; a buffer slide (Day 5) and a demo (Day 8)
//     get their own screens; other slides get none;
//   - the trainer, on the same slide: Completed X / N, Waiting / Done per trainee, Start Group Debrief locked until all
//     are done, Mark done, the 🎉 banner, the release (the trainee's slide moves on by itself), 📋 Score into
//     Trainer Inputs and back.
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
    // where Activity Locks run (js/ft-day-locks.js), Day 6 is held at its mock calls: the release must open the next step
    locks = await t.evaluate(() => !!window.FTDayLocks);
    if (locks) {
      stepsWas = await get(t, 'settings:daysteps');
      await t.evaluate(() => FTDayDecks.open(6, 0)); await t.waitForTimeout(1500);   // (the decks loaded, so Day 6's steps are known)
      const s6 = await t.evaluate(() => { const i = FTDayDecks.at(6, 's1'); const x = FTDayLocks.steps(6).find(s => i >= s.from && i <= s.to); return x ? x.n : 0; });
      if (!s6) fail('Day 6\'s mock call step isn\'t among its Activity Locks steps');
      const all = Object.assign({}, (stepsWas || {}).all || {}, { 6: s6 });
      await put(t, 'settings:daysteps', Object.assign({}, stepsWas || {}, { all, batches: {} }));
      await t.evaluate(() => ftLoadOpenDays());
    }
    const open = async (p, d, s) => { await p.evaluate(d => FTDayDecks.open(d, 0), d); await p.waitForTimeout(1200); await p.evaluate(([d, s]) => FTDayDecks.open(d, FTDayDecks.at(d, s)), [d, s]); await p.waitForTimeout(2200); };
    // the panel is at the foot of the slide: turn to the page it's on
    const toPanel = async (p) => { for (let k = 0; k < 8; k++) { if (await p.evaluate(() => { const x = document.querySelector('.ftbf'); return !!(x && x.offsetParent); })) return true; await p.evaluate(() => FTDayDecks.go(1)); await p.waitForTimeout(600); } return false; };
    const panel = p => p.evaluate(() => (document.querySelector('.ftbf') || {}).innerText || '');

    // a slide that isn't a buffer, mock call or demo has none
    await open(t, 4, 's1');
    if (await t.evaluate(() => !!document.querySelector('.ftbf'))) fail('Day 4\'s Training Video Viewing slide got a buffer panel');

    // 🌅 a buffer slide: the line and Done, no dialog
    await open(t, 5, 's1');
    if (!(await toPanel(t))) fail('Day 5\'s Buffer Time has no buffer panel');
    else {
      if (!/Use this buffer to finish all your pending tasks\. Hit Done when you are\./.test(await panel(t))) fail(`the buffer panel's words: ${await panel(t)}`);
      if (await t.evaluate(() => !!document.querySelector('.ftdd-sheet .ftdd-wait'))) fail('the buffer slide still has its ⏳ While you wait box beside the panel');
      await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(1800); await toPanel(t);
      if (await t.evaluate(() => !!document.querySelector('.ftbf-modal'))) fail('Done on a buffer asked for a confirmation');
      if (!/✅ Done/.test(await panel(t))) fail(`a buffer's Done didn't turn the panel to Done: ${await panel(t)}`);
    }

    // 🧪 a demo slide: Demo Preparation
    await open(t, 8, 's3'); await toPanel(t);
    if (!/Practice Buffer: Demo Preparation/.test(await panel(t))) fail(`Day 8's intake packet demo has no Demo Preparation panel: ${(await panel(t)).slice(0, 120)}`);

    // ☎ a mock call: Practice Buffer, the links, the warning, Done → the dialog → Screen 2
    await open(t, 6, 's1');
    if (!(await toPanel(t))) fail('Day 6\'s mock calls have no Practice Buffer panel');
    const p6 = await panel(t);
    for (const w of ['Practice Buffer: Mock Call Preparation', 'Use the remaining time to practice for your mock calls.', 'Log in to the Ring Channel while on standby.',
      'Watch the pre-brief demonstration and review the additional instructions in the Ring Channel.', 'the trainer will call you individually for your session.',
      '⚠️ Only click ‘Done’ after you have completely finished your 1-on-1 mock call with the trainer.'])
      if (!p6.includes(w)) fail(`the mock call panel lacks “${w}”`);
    const links = await t.evaluate(() => [...document.querySelectorAll('.ftbf-steps a')].map(x => x.href));
    if (!links.some(h => /call\.html/.test(h) && /Calendar/.test(decodeURIComponent(h)))) fail(`the Call Simulator link isn't the Calendar Management line: ${links.join(' ')}`);
    await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(300);
    const q = await t.evaluate(() => (document.querySelector('.ftbf-modal') || {}).innerText || '');
    if (!/Have you completed your 1-on-1 mock call with the trainer\?/.test(q) || !/Cancel/.test(q) || !/Yes, I’m Done/.test(q)) fail(`the confirmation reads: ${q}`);
    await t.click('.ftbf-modal .btn-ghost'); await t.waitForTimeout(300);
    if (await t.evaluate(() => !!document.querySelector('.ftbf-modal'))) fail('Cancel didn\'t close the confirmation');
    if ((await get(t, 'buffer:' + tia) || { acts: {} }).acts['6:s1']) fail('Cancel marked the trainee done');
    await t.click('.ftbf .ftbf-done'); await t.waitForTimeout(300); await t.click('.ftbf-modal .btn-primary'); await t.waitForTimeout(2200); await toPanel(t);
    const s2 = await panel(t);
    if (!/Debrief Prep/.test(s2) || !/Waiting for the group debrief/.test(s2)) fail(`Done didn't turn to Screen 2 (Debrief Prep): ${s2.slice(0, 200)}`);
    if ((await t.evaluate(() => document.querySelectorAll('.ftbf-card li').length)) < 5) fail('Screen 2 has no scorecard to review');
    if (!((await get(t, 'buffer:' + tia)) || { acts: {} }).acts['6:s1']) fail('the trainee\'s Done wasn\'t saved');

    // 🧑‍🏫 the trainer's tracker on the same slide
    await a.goto(BASE); await a.evaluate(() => { state.isAdmin = true; state.adminPreview = false; });
    await open(a, 6, 's1'); await a.waitForTimeout(1500);
    await a.evaluate(b => FTBuffer.batch(b), BATCH); await a.waitForTimeout(300);
    const tr = () => a.evaluate(() => { const x = document.querySelector('.ftbf-tr'); return x ? { text: x.innerText, locked: x.querySelector('.ftbf-foot .ftbf-done').disabled, banner: (x.querySelector('.ftbf-banner') || {}).innerText || '' } : null; });
    let v = await tr();
    if (!v) fail('the trainer has no tracker on the mock call slide');
    else {
      if (!/Live Session: Mock Call Progress Tracker/.test(v.text) || !/Completed: 1 \/ 2 Trainees/.test(v.text)) fail(`the tracker reads: ${v.text.slice(0, 200)}`);
      if (!/Ray Buffer\s+Waiting/.test(v.text) || !/Tia Buffer\s+✓ Done/.test(v.text)) fail(`the tracker's roster: ${v.text}`);
      if (!v.locked || !/Waiting for all trainees to complete their mock calls\.\.\./.test(v.text)) fail('Start Group Debrief isn\'t locked while a trainee is still waiting');
      await a.evaluate(id => FTBuffer.mark(id, true), ray); await a.waitForTimeout(1200);
      v = await tr();
      if (!/Completed: 2 \/ 2 Trainees/.test(v.text) || v.locked || !/🎉 All trainees have completed their mock calls! You are ready to begin the debrief\./.test(v.banner)) fail(`all done, the tracker reads: ${JSON.stringify(v).slice(0, 300)}`);
      await a.click('.ftbf-tr .ftbf-foot .ftbf-done'); await a.waitForTimeout(2200);
      for (const id of [ray, tia]) if (!(((await get(a, 'buffer:' + id)) || {}).released || {})['6:s1']) fail(`Start Group Debrief didn't release ${id}`);
      if (locks) {
        const ds = await get(a, 'settings:daysteps'), b = BATCH.toLowerCase(), want = await a.evaluate(() => { const i = FTDayDecks.at(6, 's1') + 1; const x = FTDayLocks.steps(6).find(s => i >= s.from && i <= s.to); return x ? x.n : 0; });
        if (Number((((ds || {}).batches || {})[b] || {})[6]) !== want) fail(`the release didn't unlock Day 6's next step for the batch: ${JSON.stringify((ds || {}).batches)}`);
      }
      // the trainee's slide moves on by itself (it checks every 20 s)
      const was = await t.evaluate(() => FTDayDecks.state().i);
      await t.waitForTimeout(23000);
      const now = await t.evaluate(() => FTDayDecks.state().i);
      if (now !== was + 1) fail(`after the release the trainee's slide didn't move on: ${was} → ${now}`);
      // 📋 Score: the trainee's scorecard in Trainer Inputs, and back
      await a.evaluate(id => FTBuffer.score(id), ray); await a.waitForTimeout(2500);
      const sc = await a.evaluate(() => [state.view, state.adminTab, (document.querySelector('.fss-cellform b') || {}).innerText || '', !!document.querySelector('.ftbf-back')]);
      if (sc[0] !== 'admin' || sc[1] !== 'trainerinputs' || !/Ray Buffer · Calendar Management Mock Call/.test(sc[2]) || !sc[3]) fail(`📋 Score didn't open the trainee's scorecard: ${JSON.stringify(sc)}`);
      await a.click('.ftbf-back'); await a.waitForTimeout(2000);
      if (!(await a.evaluate(() => state.view === 'daydeck' && FTDayDecks.state().day === 6 && !!document.querySelector('.ftbf-tr')))) fail('↩︎ Back didn\'t return to the live session');
    }
  } catch (err) { fail('test crashed: ' + err.message); }
  try { await put(t, 'settings:opendays', openWas || { all: [], batches: {} }); if (locks && stepsWas) await put(t, 'settings:daysteps', stepsWas); } catch (err) {}
  await browser.close();
  if (failures.length) { console.error('Buffer / mock call test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Buffer / mock call test passed (the worker keeps a Done the trainee\'s own and the release the trainer\'s; the buffer, demo and mock call screens, the confirmation, Screen 2 with its scorecard; the trainer\'s tracker, its gate and banner, the release moving the trainee on, and 📋 Score into Trainer Inputs and back).');
})();
