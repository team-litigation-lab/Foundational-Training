// 📞 The Intake Mock Call on the same case in the CMS and on Ring Channel (js/ft-intake.js .ftis-mockcall / .ftis-mcase): the
// cases are the CMS's own Intake Mock Calls (its call-packs.js, which Ring Channel mirrors); the trainer assigns each trainee
// a packet in Admin → 📦 Intake Packets and the case pairs with it, in the same intakeassign:<id> record (each write keeps the other);
// the trainer's slide has no list of every case (assigned in Admin → 📦 Intake; each case is on the scoring sheet); the trainee's slide
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
    const openWas = await get('settings:opendays'), intakeWas = await get('settings:intake');
    await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} });
    await signIn(page, 'Ivy', 'Intake' + String(Date.now()).slice(-6).replace(/\d/g, d => 'abcdefghij'[d]), BATCH);
    const id = await page.evaluate(() => state.traineeId);
    const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
    await put('intakeassign:' + id, null); await put('labreview:' + id, null);

    // 🧑‍🏫 Admin → 📦 Intake Packets: a Demo case column beside the packet, with the CMS's intake calls only
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminData = null; state.adminTab = 'intake'; goto('admin'); });
    await page.waitForTimeout(2500);
    await page.evaluate(b => FTIntakeAdmin.batch(b), BATCH); await page.waitForTimeout(800);
    // (no case dropdown: the packet is the trainer's only pick, and its case pairs with it: packet n, the n-th intake call)
    if (await page.evaluate(() => [...document.querySelectorAll('.ftis-admin select')].some(x => /assignCall/.test(x.getAttribute('onchange') || '')))) fail('the Mock call case is still a dropdown of its own');
    await page.evaluate(id => FTIntakeAdmin.assign(id, '2'), id); await page.waitForTimeout(800);
    let rec = await get('intakeassign:' + id);
    if (!rec || rec.packet !== 2 || rec.call !== 'ft_in_nicole') fail(`packet 2 didn't bring its demo case: ${JSON.stringify(rec)}`);
    const cell = await page.evaluate(() => (document.querySelector('.ftis-admin .ftis-case-auto') || {}).textContent || '');
    if (!/New Intake With a Deadline Close/.test(cell)) fail(`the case column doesn't show the paired case: ${cell}`);
    await page.evaluate(id => FTIntakeAdmin.assign(id, '4'), id); await page.waitForTimeout(800);
    rec = await get('intakeassign:' + id);
    if (!rec || rec.packet !== 4 || rec.call !== 'ft_in_derek') fail(`a new packet didn't re-pair the case (packet 4: the list's first again): ${JSON.stringify(rec)}`);
    // (a packet whose client is a caller pairs with that caller's first call)
    await put('settings:intake', Object.assign({}, (await get('settings:intake')) || {}, { packets: Object.assign({}, ((await get('settings:intake')) || {}).packets, { 5: { client: 'Nicole Adams', url: '' } }) }));
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    await page.evaluate(id => FTIntakeAdmin.assign(id, '5'), id); await page.waitForTimeout(800);
    if (((await get('intakeassign:' + id)) || {}).call !== 'ft_in_nicole') fail('a packet whose client is a caller didn\'t pair with their call');
    await page.evaluate(id => FTIntakeAdmin.assign(id, '2'), id); await page.waitForTimeout(800);

    // Day 8's Practice Intake Calls has no cases box (and no Sample Intake Forms): the cases are the Day 8 demo's, on its preparation slide (s3p)
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's1g'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector('.ftdd-sheet .ftis-mockcall, .ftdd-sheet .ftis-forms'))) fail('Day 8\'s Practice Intake Calls still has the cases box or the sample forms');
    // Day 9's Intake Mock Calls Metrics slide carries no case: the packet's case is the Day 8 demo's
    await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, 's2'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector('.ftdd-sheet .ftis-mockcall'))) fail('Day 9\'s Intake Mock Calls slide still has a case box (the case is the Day 8 demo\'s)');
    // the trainer's Day 8 demo preparation slide: no list of every case (removed: cases are assigned with the packets in
    // Admin → 📦 Intake, and each case is on the trainer's scoring sheet) — the box is empty and hidden
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's3p'))); await page.waitForTimeout(2500);
    const tv = await page.evaluate(() => { const el = document.querySelector('.ftdd-sheet .ftis-mockcall'); return el ? { text: el.innerText.trim(), shown: el.offsetParent !== null } : null; });
    if (tv && (tv.text || tv.shown)) fail(`the trainer's Day 8 demo slide still shows the demo cases box: ${tv.text.slice(0, 200)}`);

    // the trainer's Day 8 demo scoring sheet (as 🧑‍🏫 Graders opens it): the picked trainee's case, kept with the demo's score
    const key = 'intake-packet';
    {
      await page.evaluate(([b, k, id]) => { FTMetrics.open(k); FTMetrics.batch(b); FTMetrics.who(k, id); }, [BATCH, key, id]); await page.waitForTimeout(1500);
      const sheet = await page.evaluate(() => (document.querySelector('.ftms-trainer .ftis-mcase') || {}).innerHTML || '');
      if (!/New Intake With a Deadline Close/.test(sheet) || !/SCRIPT-ft_in_nicole/.test(sheet)) fail(`the scoring sheet doesn't show the trainee's case: ${sheet.slice(0, 200)}`);
      // (the sheet can sit on a later page of the slide: typed into and saved through the page)
      await page.evaluate(() => { const i = document.querySelector('.ftms-trainer input[data-crit="0"]'); i.value = '4'; i.dispatchEvent(new Event('input', { bubbles: true }));
        FTMetrics.save(document.querySelector('.ftms-trainer .ftms-save')); });
      await page.waitForTimeout(1500);
      const lr = await get('labreview:' + id), a = ((lr || {}).acts || {})['intake-packet-demo'] || {};
      if (!a.case || a.case.id !== 'ft_in_nicole' || !a.rubric) fail(`the score wasn't saved with the case it was played on: ${JSON.stringify(a)}`);
    }

    // the trainer's slide has no "👁 What trainees see" preview of the trainee's panel
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's3p'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => !!document.querySelector('.ftbf-pv'))) fail('the trainer\'s slide still shows the "What trainees see" preview');
    // a score saved after the case is unassigned doesn't keep the old case
    await page.evaluate(id => FTIntakeAdmin.assignCall(id, ''), id); await page.waitForTimeout(800);
    await page.evaluate(([b, k, id]) => { FTMetrics.open(k); FTMetrics.batch(b); FTMetrics.who(k, id); }, [BATCH, key, id]); await page.waitForTimeout(1200);
    await page.evaluate(() => { const i = document.querySelector('.ftms-trainer input[data-crit="0"]'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true }));
      FTMetrics.save(document.querySelector('.ftms-trainer .ftms-save')); });
    await page.waitForTimeout(1500);
    const lr2 = ((((await get('labreview:' + id)) || {}).acts) || {})['intake-packet-demo'] || {};
    if (lr2.case !== null) fail(`a score saved with no case assigned kept the earlier case: ${JSON.stringify(lr2.case)}`);
    if (((await get('intakeassign:' + id)) || {}).packet !== 2) fail('unassigning the case lost the packet');

    // the trainee: their own case only, never the script; the CMS opened blank for a first call
    // (their mock call not scored yet: a scored one shows ✅ done on its panel instead of the case)
    await put('labreview:' + id, null);
    await put('intakeassign:' + id, { packet: 4, call: 'ft_in_nicole' });
    await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; }, id);
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    // (on the Day 8 demo slide: the trainee's own case, never the trainer's list of every case)
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's3p'))); await page.waitForTimeout(2000);
    if (await page.evaluate(() => /Intake Demo cases:/.test((document.querySelector('.ftdd-sheet .ftis-mockcall') || {}).innerText || ''))) fail('a trainee sees the trainer\'s list of every case');
    let mine = await page.evaluate(() => { const el = document.querySelector('.ftdd-sheet .ftis-mockcall'); return el ? { text: el.innerText, html: el.innerHTML,
      cms: (el.querySelector('a.btn-navy') || {}).href || '' } : null; });
    if (!mine || !/Your Intake Demo case/.test(mine.text) || !/New Intake With a Deadline Close/.test(mine.text)) fail(`the trainee doesn't see their case: ${JSON.stringify(mine)}`);
    else {
      if (/SCRIPT-|Goal of|CASEFILE|Scenario Picker/.test(mine.html) || (mine.html.match(/ftis-mc-card/g) || []).length !== 1) fail('the trainee sees more than their own case (the script, the goals, the file or the other cases)');
      if (!/program=intake/.test(mine.cms) || /mock=/.test(mine.cms)) fail(`a first call's CMS link isn't a blank intake: ${mine.cms}`);
    }
    // a call back opens the case file in the CMS
    await put('intakeassign:' + id, { packet: 4, call: 'ft_in_retainer' });
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    // (the Day 8 demo slide shows it)
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's3p'))); await page.waitForTimeout(2000);
    mine = await page.evaluate(() => { const el = document.querySelector('.ftdd-sheet .ftis-mockcall'); return el ? { text: el.innerText, cms: (el.querySelector('a.btn-navy') || {}).href || '' } : null; });
    if (!mine || !/Did You Take My Case\?/.test(mine.text) || !/mock=MC-02/.test(mine.cms)) fail(`the Day 8 demo slide doesn't show the call back on its case file: ${JSON.stringify(mine)}`);
    // unassigned: the placeholder and the Intake line to practice on
    await put('intakeassign:' + id, { packet: 4 });
    await page.evaluate(() => FTIntake.reload()); await page.waitForTimeout(800);
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's3p'))); await page.waitForTimeout(1500);
    const ph = await page.evaluate(() => (document.querySelector('.ftdd-sheet .ftis-mockcall') || {}).innerText || '');
    if (!/Your demo case appears here/.test(ph)) fail(`an unassigned trainee doesn't see the placeholder: ${ph.slice(0, 200)}`);

    await put('intakeassign:' + id, null); await put('labreview:' + id, null);
    const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
    await put('settings:opendays', openWas || { all: [], batches: {} }); await put('settings:intake', intakeWas);
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Intake Demo case test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Intake Demo case test passed (the case is the Day 8 demo\'s, not on Day 9\'s mock call; the CMS\'s intake calls as the cases, assigned beside the packet and kept by both writes; the trainer\'s slide with every case, where to pick it on Ring Channel, the script and the trainee on their case; the scoring sheet showing the case and saving it with the score; the trainee seeing only their own case, the CMS blank for a first call and on the file for a call back, on Day 8, Day 9\'s preparation and the Mock Calls Ongoing panel; the placeholder until assigned).');
})();
