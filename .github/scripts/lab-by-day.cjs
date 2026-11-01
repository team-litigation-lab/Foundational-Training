// 🛠 The Practice Lab by the day (js/ft-simulators.js): every card filed under the first training day it is worked on, the
//   days in order, a card ✓ Done once its work is in (and its button 👁 Review, opening the same page), a day whose work is
//   all done folded away, the All · To do · ✓ Done filter, and every card's button going where it should.
// Usage: NODE_PATH=…/node_modules node .github/scripts/lab-by-day.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} });
  await signIn(page, 'Dana', 'Daybyday', 'B102926');
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  // work handed in: Day 8's Process Guide and Intake Packet drill, Day 9's two transcriptions, Day 5's Calendar Activity Check
  const at = new Date().toISOString();
  await put(`guide:${id}:intake-packet`, { html: '<p>My guide</p>', submittedAt: at });
  await put('drills:' + id, { runs: [{ set: 'intake', score: 9, total: 10, at }] });
  await put('transcribe:' + id, { v: 1, r: { 1: { startedAt: at, submittedAt: at, f: {} }, 2: { startedAt: at, submittedAt: at, f: {} } } });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(2500);

  const lab = await page.evaluate(() => ({
    days: [...document.querySelectorAll('.fts-day')].map(d => d.id),
    cards: [...document.querySelectorAll('.fts-day')].map(d => ({ day: d.id, open: d.open, cards: [...d.querySelectorAll('.fts-card')].map(c => ({ h: c.querySelector('h3').innerText, st: c.dataset.status, btn: ((c.querySelector('.fts-tool-act .btn') || {}).innerText || '') })) }))
  }));
  const nums = lab.days.map(d => Number(d.replace('fts-day-', ''))).filter(Boolean);
  if (!nums.length) fail('the Practice Lab has no day sections');
  if (nums.some((n, i) => i && n <= nums[i - 1])) fail(`the days are not in order: ${nums.join(', ')}`);
  [3, 4, 5, 6, 8, 9].forEach(d => { if (!nums.includes(d)) fail(`the Practice Lab has no Day ${d}`); });
  const day = n => (lab.cards.find(x => x.day === 'fts-day-' + n) || { cards: [] });
  const find = (n, re) => day(n).cards.find(c => re.test(c.h));
  if (!find(4, /Reception Mock Calls/)) fail('Reception Mock Calls is not under Day 4');
  if (!find(5, /Calendar Activity Check/)) fail('the Calendar Activity Check is not under Day 5');
  if (!find(3, /Reception calls/)) fail('the Reception Call Listening set is not under Day 3');
  const g = find(8, /Process Guide/), dr = find(8, /Drill: Intake Packet/), tr = find(9, /Transcription Activity/);
  if (!g || g.st !== 'done' || !/Review/.test(g.btn)) fail(`Day 8's submitted Process Guide isn't ✓ Done with 👁 Review: ${JSON.stringify(g)}`);
  if (!dr || dr.st !== 'done') fail(`Day 8's finished drill isn't ✓ Done: ${JSON.stringify(dr)}`);
  if (!tr || tr.st !== 'done' || !/Review/.test(tr.btn)) fail(`Day 9's submitted Transcription Activity isn't ✓ Done: ${JSON.stringify(tr)}`);
  const s4 = find(4, /Reception Mock Calls/);
  if (s4 && s4.st === 'done') fail('a session never started shows ✓ Done');

  // the filter: ✓ Done shows only the done cards, To do none of them
  await page.evaluate(() => ftsFilter('done')); await page.waitForTimeout(300);
  const doneOnly = await page.evaluate(() => [...document.querySelectorAll('.fts-day .fts-card')].map(c => c.dataset.status));
  if (!doneOnly.length || doneOnly.some(s => s !== 'done')) fail(`✓ Done shows other cards: ${JSON.stringify(doneOnly)}`);
  await page.evaluate(() => ftsFilter('todo')); await page.waitForTimeout(300);
  if ((await page.evaluate(() => [...document.querySelectorAll('.fts-day .fts-card')].map(c => c.dataset.status))).includes('done')) fail('To do shows done cards');
  await page.evaluate(() => ftsFilter('all')); await page.waitForTimeout(300);

  // every card's button goes where it should: a page of this platform, a Portal tab, or the Portal's drafting tool
  const n = await page.evaluate(() => document.querySelectorAll('.fts-card .fts-tool-act .btn:not([disabled])').length);
  const bad = [];
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(async i => {
      const opened = []; const wo = window.open, dr = window.lshOpenPortalDrafting;
      window.open = (u) => { opened.push(String(u)); return null; };
      window.lshOpenPortalDrafting = (k) => { opened.push('drafting:' + (k || 'lor')); };
      document.querySelectorAll('.fts-day').forEach(d => { d.open = true; });
      const b = document.querySelectorAll('.fts-card .fts-tool-act .btn:not([disabled])')[i];
      const label = (b.closest('.fts-card').querySelector('h3').innerText + ' → ' + b.innerText).trim();
      if (b.tagName === 'A') { const href = b.getAttribute('href'); window.open = wo; window.lshOpenPortalDrafting = dr; return { label, view: 'link', href }; }
      b.click(); await new Promise(r => setTimeout(r, 400));
      const v = state.view; window.open = wo; window.lshOpenPortalDrafting = dr;
      return { label, view: v, opened };
    }, i);
    if (r.view === 'link' ? !/^https:\/\//.test(r.href || '') : (r.view === 'simulators' && !r.opened.length)) bad.push(r);
    console.log(`  ${r.label} → ${r.view === 'link' ? r.href : r.opened.length ? r.opened.join(', ') : '#/' + r.view}`);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(500);
  }
  if (bad.length) fail(`buttons that go nowhere: ${JSON.stringify(bad)}`);
  if (n < 15) fail(`only ${n} card buttons on the Practice Lab`);

  if (process.env.LAB_SHOT) { await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800); await page.screenshot({ path: process.env.LAB_SHOT, fullPage: true }); }
  await browser.close();
  if (failures.length) { console.error('Practice Lab by the day test FAILED:\n  - ' + failures.join('\n  - ')); process.exit(1); }
  console.log(`Practice Lab by the day test passed (${nums.length} days in order, each card under its first day, ✓ Done and 👁 Review from the work handed in, the filters, and ${n} card buttons each going somewhere).`);
})().catch(e => { console.error(e); process.exit(1); });
