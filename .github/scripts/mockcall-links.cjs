// ☎ 🗂 Ring Channel and the CMS on the mock call scorecards (js/ft-mockcall-links.js): on 🧑‍🏫 Graders, the Reception,
// Calendar Management and Intake Mock Calls each show their Ring Channel line (its button and the trainee's graded calls on it,
// callsim:<id>) and the CMS (its buttons and the trainee's Practice Session record, sessions:<id>: the checks, what was missed,
// what was recorded); ⤓ fills the scorecard from the graded call's metrics and from the CMS checks, never over a typed score;
// a demo has no panel; 💾 Save keeps the graded call and the CMS record the score was given beside (sources). The slide's
// scoresheet pop-up (FTMetrics) and 🧑‍🏫 Trainer Inputs show the same panel.
// Usage: NODE_PATH=…/node_modules node .github/scripts/mockcall-links.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  const panel = () => page.evaluate(() => { const el = document.querySelector('.fms-sheet .mcl'); return el ? { text: el.innerText, links: [...el.querySelectorAll('a')].map(a => a.href) } : null; });
  const id = 'mona-link--b110926';
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTMockScores === 'object' && typeof FTMockLinks === 'object', null, { timeout: 20000 });
    await put('trainee:' + id, { id, name: 'Mona Link', batch: 'B110926', approved: true, registeredAt: '2026-11-09T12:00:00Z' });
    await put('labreview:' + id, null);
    const recep = await page.evaluate(() => FT_RUBRICS.list.reception.criteria.map(c => c.n));
    // the graded calls Ring Channel reported (the Portal's callsim:<id>): two on the Reception line, one with its metrics
    await put('callsim:' + id, { traineeId: id, best: { lesson4: { score: 86, calls: 2 }, lesson6: { score: 71, calls: 1 } }, calls: [
      { lesson: 4, line: 'Reception Mock Calls', score: 74, at: '2026-11-08T15:00:00Z', scenario: 'A first call' },
      { lesson: 4, line: 'Reception Mock Calls', score: 86, at: '2026-11-09T15:00:00Z', scenario: 'A client asks for an update',
        rows: [{ metric: recep[0], score: 5, feedback: 'Firm and name, clearly' }, { metric: recep[1], score: 4, feedback: 'Asked for the DOL late' }] },
      { lesson: 6, line: 'Intake Mock Calls', score: 71, at: '2026-11-09T16:00:00Z' }] });
    // the CMS record: the Reception Mock Calls Practice Session, submitted with one check missed
    await put('sessions:' + id, { v: 1, runs: { 'reception|-': { answers: { greeting: 'Thank you for calling', caller: 'Pat Doe', need: 'An update on the case' }, attempts: 1, minutes: 12,
      startedAt: '2026-11-09T14:00:00Z', submittedAt: '2026-11-09T14:12:00Z',
      auto: { pct: 83, checks: [{ label: 'Opened with the firm’s greeting', ok: true }, { label: 'Caller verified first', ok: false }, { label: 'Initials on the note', ok: true },
        { label: 'The case and what they need', ok: true }, { label: 'A complete message', ok: true }, { label: 'Routed to a person', ok: true }] } } } });

    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.adminData = null; state.adminTab = 'graders'; goto('admin'); });
    await page.waitForFunction(() => !!document.querySelector('.fms-sheet .fms-tbl'), null, { timeout: 20000 });
    await page.evaluate(() => { FTMockScores.batch('B110926'); FTMockScores.act('reception-live'); }); await page.waitForTimeout(400);
    await page.evaluate(id => FTMockScores.va(id), id);
    await page.waitForFunction(() => /Graded calls/.test((document.querySelector('.fms-sheet .mcl') || {}).innerText || ''), null, { timeout: 10000 }).catch(() => {});
    let p = await panel();
    if (!p) fail('the Reception Mock Call scorecard has no Ring Channel and CMS panel');
    else {
      if (!/Ring Channel · Main Line/.test(p.text) || !/best 86%/.test(p.text) || !/2 calls/.test(p.text) || !/latest 86%/.test(p.text)) fail(`the Reception line's graded calls aren't shown: ${p.text.slice(0, 300)}`);
      if (/71%/.test(p.text)) fail('an Intake call shows on the Reception scorecard');
      if (!p.links.some(h => /call\.html\?.*line=Reception\+Mock\+Calls/.test(h))) fail(`no Ring Channel button on the Reception line: ${p.links}`);
      if (!p.links.some(h => /drill=1/.test(h)) || !p.links.some(h => /lshcasemanagementtraining-trainingcrm\.pages\.dev\/$/.test(h))) fail(`the CMS buttons (case files, Front Desk Drill) aren't there: ${p.links}`);
      if (!/Reception Mock Calls/.test(p.text) || !/automated checks 83%/.test(p.text) || !/Missed: Caller verified first/.test(p.text)) fail(`the CMS record isn't shown: ${p.text}`);
      if (!/What the trainee recorded \(3\)/.test(p.text)) fail(`what the trainee recorded isn't listed: ${p.text}`);
    }
    // ⤓ from the graded call's metrics: the two criteria it carries, with their notes; a typed one is left alone
    await page.fill('.fms-tbl tbody tr:nth-child(2) input[type=number]', '2');
    await page.evaluate(() => [...document.querySelectorAll('.fms-sheet .mcl button')].find(b => /graded call/.test(b.textContent)).click()); await page.waitForTimeout(300);
    let v = await page.evaluate(() => [...document.querySelectorAll('.fms-tbl tbody tr')].map(tr => [(tr.querySelector('input') || {}).value, (tr.querySelector('textarea') || {}).value]));
    if (v[0][0] !== '5' || v[0][1] !== 'Firm and name, clearly') fail(`the graded call's metric didn't fill its criterion: ${JSON.stringify(v[0])}`);
    if (v[1][0] !== '2') fail(`⤓ wrote over a typed score: ${JSON.stringify(v[1])}`);
    // ⤓ from the CMS checks: 5 of 6 → 4.0/5 into Attention to Details and Tools Utilization, what was missed in their Remarks
    await page.evaluate(() => [...document.querySelectorAll('.fms-sheet .mcl button')].find(b => /CMS checks/.test(b.textContent)).click()); await page.waitForTimeout(300);
    v = await page.evaluate(() => [...document.querySelectorAll('.fms-tbl tbody tr')].map(tr => [tr.querySelector('td').textContent, (tr.querySelector('input') || {}).value, (tr.querySelector('textarea') || {}).value]));
    const att = v.find(x => /^Attention to Details/.test(x[0])), tools = v.find(x => /^Tools Utilization/.test(x[0]));
    if (!att || att[1] !== '4' || !/missed: Caller verified first/.test(att[2])) fail(`Attention to Details wasn't filled from the CMS checks: ${JSON.stringify(att)}`);
    if (!tools || tools[1] !== '4') fail(`Tools Utilization wasn't filled from the CMS checks: ${JSON.stringify(tools)}`);
    // 💾 Save keeps what it was scored beside
    await page.evaluate(() => FTMockScores.save(document.querySelector('[data-ms-save]'))); await page.waitForTimeout(1200);
    const cell = (((await get('labreview:' + id)) || {}).acts || {})['reception-live'] || {};
    const s = cell.sources || {};
    if (!cell.rubric || !s.call || s.call.best !== 86 || s.call.calls !== 2 || !s.call.latest || s.call.latest.score !== 86 || !s.cms || s.cms.pct !== 83 || s.cms.session !== 'reception|-') fail(`the saved scorecard doesn't keep its graded call and CMS record: ${JSON.stringify(cell)}`);

    // the Calendar Management and Intake Mock Calls: their own lines and CMS; a trainee with no graded call or session is told so
    await page.evaluate(() => FTMockScores.act('intake-live')); await page.waitForTimeout(600);
    p = await panel();
    if (!p || !/Ring Channel · Intake Line/.test(p.text) || !/best 71%/.test(p.text) || !p.links.some(h => /line=Intake\+Mock\+Calls/.test(h)) || !p.links.some(h => /program=intake/.test(h))) fail(`the Intake Mock Call's panel isn't on the Intake line and the Prototype CMS: ${p && p.text}`);
    if (p && !/No Intake Mock Calls Practice Session yet/.test(p.text)) fail(`the Intake panel doesn't say no session was recorded: ${p.text}`);
    await page.evaluate(() => FTMockScores.act('calendar-live')); await page.waitForTimeout(600);
    p = await panel();
    if (!p || !/No graded call on Ring Channel’s Calendar Management Mock Calls yet/.test(p.text) || !p.links.some(h => /line=Calendar\+Management\+Mock\+Calls/.test(h))) fail(`the Calendar Management panel isn't right: ${p && p.text}`);
    // a demo has none
    await page.evaluate(() => FTMockScores.act('lor-demo')); await page.waitForTimeout(600);
    if (await panel()) fail('a demo\'s scorecard shows the Ring Channel and CMS panel');

    // the slide's scoresheet pop-up (FTMetrics) and Trainer Inputs: the same panel
    await page.evaluate(([id]) => { FTMetrics.open('reception'); FTMetrics.batch('B110926'); FTMetrics.who('reception', id); }, [id]); await page.waitForTimeout(1500);
    // (folded under one line there: the pop-up keeps to one screen)
    if (!(await page.evaluate(() => !!document.querySelector('#ftmsModal details.mcl-fold:not([open]) .mcl')))) fail('the scoresheet pop-up\'s panel isn\'t folded (the pop-up keeps to one screen)');
    await page.evaluate(() => { const d = document.querySelector('#ftmsModal details.mcl-fold'); if (d) d.open = true; });
    const pop = await page.evaluate(() => (document.querySelector('#ftmsModal .mcl') || {}).innerText || '');
    if (!/Ring Channel · Main Line/.test(pop) || !/automated checks 83%/.test(pop)) fail(`the scoresheet pop-up has no Ring Channel and CMS panel: ${pop.slice(0, 200)}`);
    await page.evaluate(() => FTMetrics.close());
    await page.evaluate(() => { state.adminTab = 'trainerinputs'; render(); }); await page.waitForTimeout(1500);
    await page.evaluate(id => FTInputs.cell(id, 'reception-live'), id); await page.waitForTimeout(800);
    const ti = await page.evaluate(() => (document.querySelector('.fss-cellform .mcl') || {}).innerText || '');
    if (!/Ring Channel · Main Line/.test(ti) || !/best 86%/.test(ti)) fail(`Trainer Inputs has no Ring Channel and CMS panel: ${ti.slice(0, 200)}`);
  } catch (e) { fail(e.stack || String(e)); }
  for (const k of ['labreview:', 'callsim:', 'sessions:']) await put(k + id, null).catch(() => {});
  await put('trainee:' + id, { id, name: 'Mona Link', batch: 'B110926', approved: true, archived: true }).catch(() => {});
  await browser.close();
  if (failures.length) { console.log('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Mock call scorecards with Ring Channel and the CMS test passed (each mock call\'s line and graded calls, the CMS buttons and Practice Session record; ⤓ from the graded call\'s metrics and the CMS checks, never over a typed score; saved with its sources; none on a demo; the same panel on the pop-up and Trainer Inputs).');
})();
