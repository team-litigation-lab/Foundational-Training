// 📞 The Intake Mock Call on the same case in the CMS and on Ring Channel (js/ft-intake.js .ftis-mockcall / .ftis-mcase): the
// cases are the CMS's own Intake Mock Calls (its call-packs.js, which Ring Channel mirrors); the trainer assigns each trainee
// one in Admin → 📦 Intake Packets, beside the packet, in the same intakeassign:<id> record (each write keeps the other);
// the trainer's slide lists every case with where to pick it on Ring Channel and the caller's script; the trainee's slide
// shows only their own case (never the script) with the Prototype CMS opened blank for a first call, on the case file for a
// call back; the trainer's scoring sheet shows the picked trainee's case and 💾 Save keeps it with the score.
// The CMS's file is served here from a stub, so the test doesn't depend on the network.
// Usage: NODE_PATH=…/node_modules node .github/scripts/intake-mockcall.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B103026';
const failures = []; const fail = m => failures.push(m);

const call = (id, title, name, level, doc, you, role) => ({ id, program: 'FT', line: 'Intake Mock Calls', name, role, title, level, gender: 'm', doc, you,
  facts: `Facts for ${title}.`, goals: [`Goal of ${id}`], hidden: `SCRIPT-${id}: the caller's secret details.`, opening: `Opening of ${id}.` });
const PACKS = `(function(){ const CALLS = ${JSON.stringify([
  call('ft_in_derek', 'New Intake: A Grocery-Store Fall', 'Derek Thompson', 'Intermediate', 'MC-02', "This is Derek Thompson's FIRST call to the firm: nothing is on file yet.", 'Potential client (first call)'),
  call('ft_in_nicole', 'New Intake With a Deadline Close', 'Nicole Adams', 'Advanced', 'MC-13', "This is Nicole Adams's FIRST call to the firm: nothing is on file yet.", 'Potential client (first call)'),
  call('ft_in_retainer', 'Did You Take My Case?', 'Derek Thompson', 'Intermediate', 'MC-02', 'Derek Thompson (MC-02) is calling back: open his case.', 'Potential client (MC-02), retainer unsigned'),
  call('ft_rc_appt', 'A reception call', 'Someone', 'Basic', 'MC-01', 'Reception.', 'Client')].map((c, i) => i === 3 ? Object.assign(c, { line: 'Reception Mock Calls' }) : c))};
  const DOCS = {"MC-02": {title: "MC-02 · Derek Thompson (slip and fall, intake)", text: "CASEFILE-MC-02"}, "MC-13": {title: "MC-13 · Nicole Adams", text: "CASEFILE-MC-13"}};
  window.CALL_PACKS = {CALLS, DOCS}; })();`;

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  await page.route('https://lshcasemanagementtraining-trainingcrm.pages.dev/call-packs.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: PACKS }));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const openWas = await get('settings:opendays');
    await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} });
    await signIn(page, 'Ivy', 'Intake' + String(Date.now()).slice(-6).replace(/\d/g, d => 'abcdefghij'[d]), BATCH);
    const id = await page.evaluate(() => state.traineeId);
    const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
    await put('intakeassign:' + id, null); await put('labreview:' + id, null);

    // 🧑‍🏫 Admin → 📦 Intake Packets: a Mock call case column beside the packet, with the CMS's intake calls only
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminData = null; state.adminTab = 'intake'; goto('admin'); });
    await page.waitForTimeout(2500);
    await page.evaluate(b => FTIntakeAdmin.batch(b), BATCH); await page.waitForTimeout(800);
    const opts = await page.evaluate(() => { const s = [...document.querySelectorAll('.ftis-admin select')].find(x => /assignCall/.test(x.getAttribute('onchange') || ''));
      return s ? [...s.options].map(o => o.value) : null; });
    if (JSON.stringify(opts) !== JSON.stringify(['', 'ft_in_derek', 'ft_in_nicole', 'ft_in_retainer'])) fail(`the Mock call case column's choices are ${JSON.stringify(opts)}`);
    await page.evaluate(id => FTIntakeAdmin.assign(id, '3'), id); await page.waitForTimeout(600);
    await page.evaluate(id => FTIntakeAdmin.assignCall(id, 'ft_in_nicole'), id); await page.waitForTimeout(600);
    let rec = await get('intakeassign:' + id);
    if (!rec || rec.packet !== 3 || rec.call !== 'ft_in_nicole') fail(`the case wasn't saved beside the packet: ${JSON.stringify(rec)}`);
    await page.evaluate(id => FTIntakeAdmin.assign(id, '4'), id); await page.waitForTimeout(600);
    rec = await get('intakeassign:' + id);
    if (!rec || rec.packet !== 4 || rec.call !== 'ft_in_nicole') fail(`assigning a packet lost the mock call case: ${JSON.stringify(rec)}`);

    // Day 8's Practice Intake Calls has no cases box (and no Sample Intake Forms): the cases are on Day 9's preparation slide
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's1g'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector('.ftdd-sheet .ftis-mockcall, .ftdd-sheet .ftis-forms'))) fail('Day 8\'s Practice Intake Calls still has the cases box or the sample forms');
    // the trainer's Day 9 Intake Mock Calls slide: every intake case, where to pick it on Ring Channel, its script; the trainee's
    // name on theirs (the metrics slide before it, s2, is the metrics alone)
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's3b'))); await page.waitForTimeout(2500);
    const tv = await page.evaluate(() => { const el = document.querySelector('.ftis-mockcall'); return el ? { cases: el.querySelectorAll('.ftis-mc-t').length, html: el.innerHTML,
      tag: [...el.querySelectorAll('.ftis-mc-t')].map(d => (d.querySelector('.ftis-mc-n') || {}).textContent || '') } : null; });
    if (!tv) fail('Day 9\'s Intake Mock Calls slide has no mock call case section for the trainer');
    else {
      if (tv.cases !== 3) fail(`the trainer's slide lists ${tv.cases} cases, not the CMS's 3 intake calls`);
      if (!/Scenario Picker/.test(tv.html) || !/SCRIPT-ft_in_nicole/.test(tv.html) || !/CASEFILE-MC-13/.test(tv.html)) fail('the trainer\'s case doesn\'t say where to pick it on Ring Channel, or lacks the script or the CMS file');
      if (tv.tag[1] !== 'Ivy' || tv.tag[0]) fail(`the trainer's slide doesn't mark the trainee on their case: ${JSON.stringify(tv.tag)}`);
    }

    // the trainer's scoring sheet: the picked trainee's case, kept with the score
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's2'))); await page.waitForTimeout(2000);
    // (the slide has the 🧑‍🏫 button; the scoresheet opens over it, a pop-up on one screen)
    const key = await page.evaluate(() => (document.querySelector('.ftms-launch[data-act="intake-live"]') || {}).getAttribute?.('data-ms') || '');
    if (!key) fail('Day 9\'s Intake Mock Calls metrics have no button to open the trainer\'s scoresheet');
    else {
      await page.evaluate(([b, k, id]) => { FTMetrics.open(k); FTMetrics.batch(b); FTMetrics.who(k, id); }, [BATCH, key, id]); await page.waitForTimeout(1500);
      const sheet = await page.evaluate(() => (document.querySelector('.ftms-trainer .ftis-mcase') || {}).innerHTML || '');
      if (!/New Intake With a Deadline Close/.test(sheet) || !/SCRIPT-ft_in_nicole/.test(sheet)) fail(`the scoring sheet doesn't show the trainee's case: ${sheet.slice(0, 200)}`);
      // (the sheet can sit on a later page of the slide: typed into and saved through the page)
      await page.evaluate(() => { const i = document.querySelector('.ftms-trainer input[data-crit="0"]'); i.value = '4'; i.dispatchEvent(new Event('input', { bubbles: true }));
        FTMetrics.save(document.querySelector('.ftms-trainer .ftms-save')); });
      await page.waitForTimeout(1500);
      const lr = await get('labreview:' + id), a = ((lr || {}).acts || {})['intake-live'] || {};
      if (!a.case || a.case.id !== 'ft_in_nicole' || !a.rubric) fail(`the score wasn't saved with the case it was played on: ${JSON.stringify(a)}`);
    }

    // the trainer's slide has no "👁 What trainees see" preview of the trainee's panel
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's3b'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector('.ftbf-pv'))) fail('the trainer\'s slide still shows the "What trainees see" preview');
    // a score saved after the case is unassigned doesn't keep the old case
    await page.evaluate(id => FTIntakeAdmin.assignCall(id, ''), id); await page.waitForTimeout(800);
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's2'))); await page.waitForTimeout(1500);
    await page.evaluate(([b, k, id]) => { FTMetrics.open(k); FTMetrics.batch(b); FTMetrics.who(k, id); }, [BATCH, key, id]); await page.waitForTimeout(1200);
    await page.evaluate(() => { const i = document.querySelector('.ftms-trainer input[data-crit="0"]'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true }));
      FTMetrics.save(document.querySelector('.ftms-trainer .ftms-save')); });
    await page.waitForTimeout(1500);
    const lr2 = ((((await get('labreview:' + id)) || {}).acts) || {})['intake-live'] || {};
    if (lr2.case !== null) fail(`a score saved with no case assigned kept the earlier case: ${JSON.stringify(lr2.case)}`);
    if (((await get('intakeassign:' + id)) || {}).packet !== 4) fail('unassigning the case lost the packet');

    // the trainee: their own case only, never the script; the CMS opened blank for a first call
    // (their mock call not scored yet: a scored one shows ✅ done on its panel instead of the case)
    await put('labreview:' + id, null);
    await put('intakeassign:' + id, { packet: 4, call: 'ft_in_nicole' });
    await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; }, id);
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    // (on the Mock Calls Ongoing slide's panel: the trainer's list of every case, in the slide's content, isn't shown to a trainee)
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's3b'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => [...document.querySelectorAll('.ftdd-sheet > .ftis-mockcall')].some(el => el.offsetParent))) fail('a trainee sees the trainer\'s list of every case');
    let mine = await page.evaluate(() => { const el = document.querySelector('.ftbf .ftis-mockcall'); return el ? { text: el.innerText, html: el.innerHTML,
      cms: (el.querySelector('a.btn-navy') || {}).href || '' } : null; });
    if (!mine || !/Your Intake Mock Call case/.test(mine.text) || !/New Intake With a Deadline Close/.test(mine.text)) fail(`the trainee doesn't see their case: ${JSON.stringify(mine)}`);
    else {
      if (/SCRIPT-|Goal of|CASEFILE|Scenario Picker/.test(mine.html) || (mine.html.match(/ftis-mc-card/g) || []).length !== 1) fail('the trainee sees more than their own case (the script, the goals, the file or the other cases)');
      if (!/program=intake/.test(mine.cms) || /mock=/.test(mine.cms)) fail(`a first call's CMS link isn't a blank intake: ${mine.cms}`);
    }
    // a call back opens the case file in the CMS
    await put('intakeassign:' + id, { packet: 4, call: 'ft_in_retainer' });
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    // (Day 9's graded call's slide, Mock Calls Ongoing, shows it: its Metrics slide before carries the metrics alone)
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's3b'))); await page.waitForTimeout(2000);
    mine = await page.evaluate(() => { const el = document.querySelector('.ftbf .ftis-mockcall'); return el ? { text: el.innerText, cms: (el.querySelector('a.btn-navy') || {}).href || '' } : null; });
    if (!mine || !/Did You Take My Case\?/.test(mine.text) || !/mock=MC-02/.test(mine.cms)) fail(`the Mock Calls Ongoing panel doesn't show the call back on its case file: ${JSON.stringify(mine)}`);
    // unassigned: the placeholder and the Intake line to practise on
    await put('intakeassign:' + id, { packet: 4 });
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's3b'))); await page.waitForTimeout(1500);
    const ph = await page.evaluate(() => (document.querySelector('.ftbf .ftis-mockcall') || {}).innerText || '');
    if (!/Your mock call case appears here/.test(ph)) fail(`an unassigned trainee doesn't see the placeholder: ${ph.slice(0, 200)}`);

    await put('intakeassign:' + id, null); await put('labreview:' + id, null);
    const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
    await put('settings:opendays', openWas || { all: [], batches: {} });
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Intake Mock Call case test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Intake Mock Call case test passed (the CMS\'s intake calls as the cases, assigned beside the packet and kept by both writes; the trainer\'s slide with every case, where to pick it on Ring Channel, the script and the trainee on their case; the scoring sheet showing the case and saving it with the score; the trainee seeing only their own case, the CMS blank for a first call and on the file for a call back, on Day 8, Day 9\'s preparation and the Mock Calls Ongoing panel; the placeholder until assigned).');
})();
