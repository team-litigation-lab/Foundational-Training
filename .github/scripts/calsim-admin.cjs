// 📅 Calendar Scores (js/ft-calendar.js, Admin → 📅 Calendar Scores, window.FTCalAdmin), the trainer's side:
//   - a failed read of the trainee's calendar record (calsim:<id>) never saves a blank record over it: ↩ Back to draft (withdraw),
//     a draft or final review (review / liveSave) and ↻ Regenerate all read the record afresh first, strictly, and save nothing
//     when that read fails;
//   - a submission naming a scenario the page doesn't know (the trainee writes scn) shows in the 📡 feed without 🖥 Open live
//     review, and FTCalAdmin.live / FTCalAdmin.regen on it do nothing instead of throwing.
// Usage: NODE_PATH=…/node_modules node .github/scripts/calsim-admin.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Rhea', 'Reviewed', 'B103099');
  const id = await page.evaluate(() => state.traineeId);
  const w = await get('trainee:' + id); w.approved = true; w.archived = false; await put('trainee:' + id, w);
  const good = { scn: 'rivera', at: '2026-11-05T10:00:00.000Z', events: [] }, odd = { scn: 'no-such-week', at: '2026-11-05T11:00:00.000Z', events: [] };
  const rec = { v: 2, anchors: {}, drafts: { rivera: [{ id: 'k1', title: 'Keep me', day: 0, start: 600, dur: 60 }] }, autos: [], submissions: [good, odd],
    reviews: { 'rivera|2026-11-05T10:00:00.000Z': { score: 80, comment: 'Good', released: true } }, external: [] };
  await put('calsim:' + id, rec);

  // the trainer opens 📅 Calendar Scores
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'calscores'; FTCalAdmin.refresh(); goto('admin'); });
  await page.waitForFunction(() => !!document.querySelector('.cs-admin'), null, { timeout: 15000 }).catch(() => fail('the 📅 Calendar Scores tab didn\'t load'));
  await page.waitForTimeout(800);

  // ---------- a failed read saves nothing ----------
  await page.route('**/api/storage/get', async route => { const b = route.request().postData() || ''; if (/calsim:/.test(b)) return route.fulfill({ status: 503, body: 'down' }); return route.continue(); });
  await page.evaluate(([id, k]) => FTCalAdmin.withdraw(id, k), [id, 'rivera|' + good.at]); await page.waitForTimeout(600);
  await page.unroute('**/api/storage/get');
  const after = await get('calsim:' + id);
  if (!after || !(after.drafts.rivera || []).length || after.submissions.length !== 2 || !after.reviews['rivera|' + good.at] || after.reviews['rivera|' + good.at].released !== true)
    { fail(`a failed read of the trainee's calendar record was saved over it: ${JSON.stringify(after)}`); await put('calsim:' + id, rec); }
  // and with the read working, the same click saves (the trainer's change, the trainee's work kept)
  await page.evaluate(([id, k]) => FTCalAdmin.withdraw(id, k), [id, 'rivera|' + good.at]); await page.waitForTimeout(600);
  const ok = await get('calsim:' + id);
  if (!ok || (ok.reviews['rivera|' + good.at] || {}).released !== false || !(ok.drafts.rivera || []).length) fail(`↩ Back to draft didn't save with the read working: ${JSON.stringify(ok)}`);

  // ---------- a submission of an unknown scenario ----------
  await page.evaluate(() => FTCalAdmin.refresh()); await page.waitForTimeout(1500);
  const feed = await page.evaluate(() => [...document.querySelectorAll('.cs-feed-row')].map(r => ({ t: r.innerText, live: !!r.querySelector('button') })));
  const oddRow = feed.find(r => /no-such-week/.test(r.t)), goodRow = feed.find(r => !/no-such-week/.test(r.t));
  if (!oddRow || oddRow.live) fail(`the feed offers 🖥 Open live review for a scenario the page doesn't know: ${JSON.stringify(feed)}`);
  if (!goodRow || !goodRow.live) fail(`the feed lost 🖥 Open live review for a known scenario: ${JSON.stringify(feed)}`);
  const thrown = await page.evaluate(async ([id, k]) => {
    const out = [];
    try { FTCalAdmin.live(id, k); } catch (e) { out.push('live: ' + e.message); }
    try { await FTCalAdmin.regen(id, k); } catch (e) { out.push('regen: ' + e.message); }
    return out.concat(document.getElementById('csLive') ? ['live review opened'] : []);
  }, [id, 'no-such-week|' + odd.at]);
  if (thrown.length) fail(`an unknown scenario's submission: ${thrown.join('; ')}`);

  await put('calsim:' + id, null);
  const w2 = await get('trainee:' + id); if (w2) { w2.archived = true; await put('trainee:' + id, w2); }
  await browser.close();
  if (failures.length) { console.error('Calendar Scores (trainer) test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Calendar Scores (trainer) test passed (a failed read of the trainee\'s calendar record saves nothing over it; a working one saves; an unknown scenario\'s submission has no live review and live/regen do nothing).');
})().catch(e => { console.error(e); process.exit(1); });
