// 🩹 Find Lost Scores (js/ft-score-recover.js), 🛡 Admin Master Control → 🩹 Find Lost Scores: a demo score missing from a
// trainee's record is found in the Weekly Ranking sheet, the row shared with the trainee and the trainer's feedback, and
// ↩ Restore puts it back into labreview:<id>.acts as Graders saves one — merged, the trainee's other scores kept, marked
// restored with where it came from; ✍ Enter by hand saves one from the trainer's notes; another trainee's name isn't matched.
// Usage: NODE_PATH=…/node_modules node .github/scripts/score-recover.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(k => fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json()).then(j => JSON.parse(j.value || 'null')), k);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTScoreRecover === 'object' && typeof FTSessions === 'object', null, { timeout: 20000 });
    const B = 'B090126', A = 'ashanty-rivera--b090126', O = 'ashley-other--b090126';
    await put('trainee:' + A, { id: A, name: 'Ashanty Rivera', batch: B, approved: true });
    await put('trainee:' + O, { id: O, name: 'Ashley Other', batch: B, approved: true });
    // her record lost the LOR Demo; the Reception mock call is still there
    await put('labreview:' + A, { acts: { 'reception-live': { score: 91, status: 'Passed', facilitator: 'Michelle' } } });
    await put('labreview:' + O, { acts: { 'lor-demo': { score: 70, status: 'Failed' } } });
    // the Weekly Ranking sheet had it, out of 5
    await put(`ranking:${B}:w2`, { cols: [{ id: 'c1', label: 'LOR Uploading and Sending Demo', type: 'score', max: 5 }, { id: 'c2', label: 'MedLOR Demo', type: 'score', max: 5 }],
      rows: { [A]: { cells: { c1: { raw: 4.5 }, c2: { raw: 3 } } } } });
    await put('trainerfb:' + A, { items: [{ text: 'LOR demo: you scored 90% — clean uploads, both letters sent.' }] });
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'recover'; goto('admin'); });
    await page.waitForSelector('.fsr-q', { timeout: 20000 });
    await page.fill('.fsr-q', 'Ashanty'); await page.click('.fsr .btn-navy');
    await page.waitForSelector('.fsr-person', { timeout: 20000 });
    const people = await page.$$eval('.fsr-person h4', h => h.map(x => x.innerText));
    if (people.length !== 1 || !/Ashanty Rivera/.test(people[0])) fail(`the search didn't find just Ashanty: ${people}`);
    const lor = await page.evaluate(() => [...document.querySelectorAll('.fsr-act')].find(a => /LOR Uploading/.test(a.innerText)).innerText);
    if (!/no score/.test(lor)) fail(`the lost LOR Demo isn't shown as missing: ${lor.slice(0, 200)}`);
    if (!/90%[^\n]*Weekly Ranking, week 2/.test(lor)) fail(`the Weekly Ranking's 4.5 / 5 isn't offered as 90%: ${lor.slice(0, 400)}`);
    if (!/In the trainer feedback/.test(lor)) fail('the trainer\'s feedback naming the LOR Demo score isn\'t offered');
    if (/MedLOR Demo/.test(lor) && /60%/.test(lor)) fail('the MedLOR Demo column was taken for the LOR Demo');
    await page.evaluate(() => [...document.querySelectorAll('.fsr-act')].find(a => /LOR Uploading/.test(a.innerText)).querySelector('.fsr-found button').click());
    await page.waitForFunction(() => [...document.querySelectorAll('.fsr-act')].some(a => /LOR Uploading/.test(a.innerText) && /restored from/.test(a.innerText)), null, { timeout: 20000 });
    const rec = await get('labreview:' + A);
    const l = rec && rec.acts && rec.acts['lor-demo'];
    if (!l || l.score !== 90 || !l.restored || !/Weekly Ranking/.test(l.restored.from) || l.facilitator !== 'Michelle' || !l.status) fail(`the LOR Demo wasn't restored as Graders saves one: ${JSON.stringify(l)}`);
    if (!rec.acts['reception-live'] || rec.acts['reception-live'].score !== 91) fail('restoring wrote over her other scores');
    // ✍ by hand: the Intake Packet Demo from the trainer's notes
    await page.evaluate(() => { const a = [...document.querySelectorAll('.fsr-act')].find(a => /Intake Packet/.test(a.innerText)); a.querySelector('[data-f="score"]').value = '84'; a.querySelector('[data-f="comment"]').value = 'From Michelle\'s notes'; a.querySelector('.fsr-hand button').click(); });
    await page.waitForFunction(() => [...document.querySelectorAll('.fsr-act')].some(a => /Intake Packet/.test(a.innerText) && /84%/.test(a.innerText)), null, { timeout: 20000 });
    const rec2 = await get('labreview:' + A), ip = rec2.acts['intake-packet-demo'];
    if (!ip || ip.score !== 84 || ip.comment !== 'From Michelle\'s notes' || !ip.restored || ip.restored.from !== 'entered by hand') fail(`the hand-entered Intake Packet Demo: ${JSON.stringify(ip)}`);
    if (!rec2.acts['lor-demo'] || rec2.acts['lor-demo'].score !== 90 || !rec2.acts['reception-live']) fail('the hand entry wrote over the restored or other scores');
    const other = await get('labreview:' + O);
    if (!other || other.acts['lor-demo'].score !== 70) fail('another trainee\'s record was changed');
    // the tab sits under 🛡 Admin Master Control
    const tab = await page.$$eval('.admin-tab-btn', b => b.map(x => x.innerText).join('|'));
    if (!/Find Lost Scores/.test(tab)) fail(`no 🩹 Find Lost Scores tab: ${tab.slice(0, 300)}`);
  } catch (e) { fail(`threw: ${e && e.stack || e}`); }
  await browser.close();
  if (failures.length) { console.error('Find Lost Scores test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Find Lost Scores test passed (a lost demo score found in the Weekly Ranking sheet and the trainer\'s feedback and restored as Graders saves one, merged with her other scores; one entered by hand from the notes; another trainee untouched; the tab under 🛡 Admin Master Control).');
})();
