// W1-OVERRIDE: batch B103026's Week 1 (training days 1–5) counted done and its EOD 100%, one-off, applied only where the browser
// reads the records (index.html window.ftW1Override; the lines tagged W1-OVERRIDE). Another batch is untouched, Week 2 is
// untouched, and nothing is written back. Delete this test with the override.
// Usage: NODE_PATH=…/node_modules node .github/scripts/w1-override.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    // (1) the override itself
    const pure = await page.evaluate(() => {
      const rv = { compliance: { '2026-10-30': { v: 2, pct: 50, parts: { tracker: 100, tests: 0, eod: 0, outputs: 100 } }, '2026-11-09': { v: 2, pct: 50, parts: { tracker: 100, tests: 0, eod: 0, outputs: 100 } } } };
      const before = JSON.stringify(rv), w = ftW1Override.comp(rv, 'B103026'), c = ftW1Override.comp(rv, 'B020225');
      return { eod: w.compliance['2026-10-30'].parts.eod, pct: w.compliance['2026-10-30'].pct, wk2: w.compliance['2026-11-09'].pct, same: c === rv, untouched: JSON.stringify(rv) === before,
        on: ftW1Override.on('b 10-30-26'), d6: ftW1Override.dayOn('B103026', 6), other: ftW1Override.dayOn('B020225', 1), d1: ftW1Override.dayOn('B103026', 1) };
    });
    if (pure.eod !== 100 || pure.pct !== 75) fail(`Week 1's EOD isn't 100 with the day's % worked out again (75): ${JSON.stringify(pure)}`);
    if (pure.wk2 !== 50 || !pure.same || !pure.untouched) fail(`Week 2, another batch or the record itself was changed: ${JSON.stringify(pure)}`);
    if (!pure.on || pure.d6 || pure.other || !pure.d1) fail(`the override's batch and days are wrong: ${JSON.stringify(pure)}`);
    // (Day 6, 11/06: its EOD alone counted done for B103026 — the rest of the day as scored; another batch untouched)
    const d6 = await page.evaluate(() => { const rv = { compliance: { '2026-11-06': { v: 2, pct: 50, parts: { tracker: 100, tests: 0, eod: 0, outputs: 100 } } } };
      const w = ftW1Override.comp(rv, 'B103026').compliance['2026-11-06'], c = ftW1Override.comp(rv, 'B020225').compliance['2026-11-06'];
      return { eod: w.parts.eod, tests: w.parts.tests, pct: w.pct, other: c.parts.eod }; });
    if (d6.eod !== 100 || d6.tests !== 0 || d6.pct !== 75 || d6.other !== 0) fail(`Day 6's EOD isn't counted done for B103026 alone: ${JSON.stringify(d6)}`);
    // (2) on the Batch Sheet: a B103026 trainee's Week 1 is done; a control batch's isn't
    const ids = {};
    for (const [f, l, b] of [['Wanda', 'Weekone', 'B103026'], ['Carl', 'Control', 'B020225']]) {
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; });
      await signIn(page, f, l, b);
      const id = await page.evaluate(() => state.traineeId); ids[f] = id;
      const rec = await get('trainee:' + id); rec.approved = true; rec.archived = false; await put('trainee:' + id, rec);
    }
    // (no automatic 🔄 Update all scores on opening the batches: it would work the seeded days out again on the server)
    await page.evaluate(() => { ['B103026', 'B020225'].forEach(b => localStorage.setItem('ft_bs_sync:' + b, String(Date.now()))); });
    await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(1500);
    // (the records seeded once the sign-ins' own background checks are done, then the sheet read again)
    await page.waitForTimeout(3000);
    const SEED = { days: {}, compliance: { '2026-10-30': { v: 2, pct: 50, parts: { tracker: 100, tests: 0, eod: 0, outputs: 100 } }, '2026-11-09': { v: 2, pct: 50, parts: { tracker: 100, tests: 0, eod: 0, outputs: 100 } } } };
    for (const id of Object.values(ids)) await put('trackerreview:' + id, SEED);
    const sheet = async (b, name) => {
      await page.evaluate(b => { FTBatchSheet.batch(b); FTBatchSheet.refresh(); }, b);
      await page.waitForFunction(n => { try { return FTBatchSheet.tables().find(t => t.id === 'days').rows.some(r => r[0].v.includes(n)); } catch (e) { return false; } }, name, { timeout: 20000 });
      return page.evaluate(n => { const T = FTBatchSheet.tables(), days = T.find(t => t.id === 'days'), row = days.rows.find(r => r[0].v.includes(n)), col = days.head.indexOf('Days complete');
        const sc = T.find(t => t.id === 'scores'), srow = sc.rows.find(r => r[0].v.includes(n)), dc = sc.head.indexOf('Daily compliance');
        const out = T.find(t => t.id === 'outputs'), orow = out.rows.find(r => r[0].v.includes(n));
        return { done: row[col].v, comp: srow[dc].v, outputs: orow.map(c => c.v).join('|') }; }, name);
    };
    const w = await sheet('B103026', 'Wanda'), c = await sheet('B020225', 'Carl');
    if (!/^5 \//.test(w.done)) fail(`the B103026 trainee's Week 1 isn't counted done (Days complete): ${w.done}`);
    if (!/^0 \//.test(c.done)) fail(`another batch's days were counted done: ${c.done}`);
    // (Daily compliance averages both days: Week 1's 75 with Week 2's 50 → 63%; the control batch stays at 50%)
    if (w.comp !== '63%' || c.comp !== '50%') fail(`the Daily compliance doesn't follow Week 1's 100% EOD: ${w.comp} / ${c.comp}`);
    if (!/75%/.test(w.outputs)) fail(`📤 Daily outputs doesn't show Week 1's day at 75%: ${w.outputs}`);
    // (3) nothing written back
    const raw = await get('trackerreview:' + ids.Wanda);
    if (raw.compliance['2026-10-30'].parts.eod !== 0 || raw.compliance['2026-10-30'].pct !== 50) fail(`the override was written back to the record: ${JSON.stringify(raw.compliance['2026-10-30'])}`);
  } catch (e) { fail('threw: ' + e.message); }
  await browser.close();
  if (failures.length) { console.error('Week 1 override test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Week 1 override test passed (B103026\'s Week 1 counted done and its EOD 100%, the day\'s % worked out again; Week 2, another batch and the stored record untouched).');
})();
