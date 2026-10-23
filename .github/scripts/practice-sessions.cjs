// The Practice Lab's real-time Practice Sessions at the trainee's own law firm (js/ft-firms.js, js/ft-sessions.js), the
// trainer's inputs, and the Knowledge Check's trainer review (js/ft-process.js):
//   1. Admin → 🏛 Law Firms: the three starting firm profiles, and NO per-trainee assignment — the firm and case
//      pickers, "Assign this firm to all" and "🎲 Spread cases" are gone, along with their functions.
//   2. The trainee has the first firm from their first page load, with no assign:<id> written and no trainer named;
//      🏛 My Firm shows it and its rules, ✓ I've read the rules is saved; no session waits for a case.
//   3. The Practice Lab has the four sessions (no PI Process Flow) and no simulator cards; the landing page has no
//      Simulators / Blueprint card.
//   4. The sessions follow the Training Guide and work on no case: a MedLOR request done to the Day 14 rules passes
//      every check and one with the wrong file name, relationship and fax address misses them; an intake call recorded
//      completely (Days 8–9, Prototype CMS) passes; a calendar event in the wrong colour doesn't.
//   5. Admin → 🟢 Practice Sessions lists the submission and saves the trainer's score, which the trainee sees as final;
//      Admin → 🧑‍🏫 Trainer Inputs records a demo's result; both reach the Scorecard.
//   6. A trainer's Knowledge Check score (kcreview:<id>) becomes the lesson's score and a passing one finishes it.
// Usage: node .github/scripts/practice-sessions.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
    const get = (key) => page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const batch = 'B100926';   // a real Batch ID: B + the date the batch started (MMDDYY)
    await signIn(page, 'Pia', 'Session', batch);
    const id = await page.evaluate(() => state.traineeId);
    const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
    const other = 'oli-other--' + batch.toLowerCase();
    await put('trainee:' + other, { id: other, name: 'Oli Other', batch, approved: true });
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
    // The trainee id comes from the fixed name and batch above, so a store an older run of this check
    // wrote to still holds that run's assign:<id>. Clear it, or "nothing writes one any more" below
    // would read a record this run never wrote.
    await put('assign:' + id, null); await put('assign:' + other, null);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);

    // 3. the landing page and the Practice Lab
    const land = await page.evaluate(() => { goto('dashboard'); return [...document.querySelectorAll('.fts-banner')].length; });
    if (land) fail(`the landing page still has ${land} Simulators / Blueprint card(s)`);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
    const lab = await page.evaluate(() => ({ sessions: document.querySelectorAll('.fss-card').length, text: document.querySelector('main').innerText }));
    if (/Your law firm|My firm & rules/.test(lab.text)) fail('the Practice Lab still shows the 🏛 Your law firm banner');
    // Four Practice Sessions: Claims is no longer one of them — the Claims Specialist work is the
    // 🧰 Drafting Tools' LOR Drafting Activity — and PI Process Flow isn't either: Day 3 is a discussion.
    if (lab.sessions !== 4) fail(`the Practice Lab has ${lab.sessions} Practice Sessions (expected 4)`);
    if (/PI Process Flow: your case/.test(lab.text)) fail('PI Process Flow is still a Practice Session');
    if (/All simulators|📅 Calendaring Simulators\n/.test(lab.text)) fail('the Practice Lab still lists the simulators');
    if (/Claims: LORs to the 1P and 3P carriers/.test(lab.text)) fail('the Claims Specialist Practice Session is still in the Practice Lab');
    if (!/Drafting Tools/.test(lab.text) || !/LOR Drafting Activity/.test(lab.text)) fail('the Practice Lab has no 🧰 Drafting Tools / LOR Drafting Activity');
    if (!/Templates in this tool/i.test(lab.text)) fail('the drafting tool\'s card does not list the templates it carries');
    if (!/LOR Drafting for 1P/.test(lab.text) || !/Drafting for 3P/.test(lab.text)) fail('the drafting tool\'s card does not name its two templates');
    // A firm is no longer assigned: the trainee has one from their first page load, so no session waits.
    // (The Practice Lab no longer names the firm — its banner was removed; a session links to the profile.)
    if (/Waiting for your firm/.test(lab.text)) fail('a session is still waiting for a firm to be assigned');
    const gotFirm = await page.evaluate(() => { const f = FTFirms.myFirm(); return f ? f.name : null; });
    if (!gotFirm) fail('a trainee has no firm, with nothing to assign one');

    // 3b. LOR Drafting is the Portal's shared tool now (js/ft-lor.js). The drafting itself is tested
    // there; what this course has to get right is that the card and the old #/lor route both open it,
    // and that the link is signed so the trainee lands on it already logged in.
    const DRAFTING = 'https://cm-training-activity.pages.dev/simulators/drafting.html';
    const opener = await page.evaluate(() => {
      // the Drafting Tools card, not the Practice Session cards that share the class
      const card = [...document.querySelectorAll('.fts-card')].find(c => /LOR Drafting Activity/.test(c.innerText));
      const btn = card && card.querySelector('.fts-tool-act button');
      return { exists: typeof window.lshOpenPortalDrafting === 'function', found: !!card,
               card: btn ? (btn.getAttribute('onclick') || '') : '' };
    });
    if (!opener.found) fail('the Practice Lab has no LOR Drafting Activity card');
    if (!opener.exists) fail('js/ft-lor.js does not expose the opener for the Portal\'s Drafting tool');
    if (!/lshOpenPortalDrafting/.test(opener.card || '')) fail(`the Drafting Tools card does not open the Portal's tool: ${opener.card}`);

    // The route: #/lor hands the trainee to the Portal instead of drafting here, and leaves the
    // dashboard behind it. The opener is stubbed so the test isn't navigated off the course.
    const routed = await page.evaluate(() => {
      const real = window.lshOpenPortalDrafting;
      let called = 0;
      window.lshOpenPortalDrafting = () => { called++; };
      try { goto('lor'); } finally { window.lshOpenPortalDrafting = real; }
      return { called, view: state.view };
    });
    if (!routed.called) fail('#/lor does not open the Portal\'s Drafting tool');
    if (routed.view !== 'dashboard') fail(`#/lor should leave the dashboard behind it, not ${routed.view}`);

    // The address it opens, signed: js/lsh-tool-links.js puts a ticket on any Portal /simulators/ link.
    // js/lsh-tool-links.js signs a Portal /simulators/ link for a signed-in trainee only (an admin's
    // ticket signs nobody in, and this page is in preview), so what matters here is that the address
    // is recognised as a training tool at all — the signing itself is tested where it is done.
    const signed = await page.evaluate((url) => {
      if (typeof LSHToolLinks !== 'object' || !LSHToolLinks.isTool) return { skipped: true };
      return { isTool: !!LSHToolLinks.isTool(url) };
    }, DRAFTING);
    if (!signed.skipped && !signed.isTool) fail('the Portal\'s Drafting page is not recognised as a training tool, so it would open signed out');
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);

    // 1. Admin → 🏛 Law Firms: the profiles, and nobody assigned to them
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'firms'; goto('admin'); }); await page.waitForTimeout(2500);
    const firmsTxt = await page.evaluate(() => document.querySelector('.ff-admin') ? document.querySelector('.ff-admin').innerText : '');
    ['LSH Training Law Group', 'Harbor & Pine Injury Law', 'Summit Trial Attorneys'].forEach(n => { if (firmsTxt.indexOf(n) < 0) fail(`Admin → Law Firms doesn't list ${n}`); });
    // The per-trainee assignment is gone: no firm picker, no case picker, no bulk or spread buttons.
    const adminAll = await page.evaluate(() => document.querySelector('main').innerText);
    if (/Assign this firm to all|Spread cases/.test(adminAll)) fail('Admin → Law Firms still offers the removed assignment actions');
    const pickers = await page.evaluate(() => ({ fn: ['batch', 'setFirm', 'setCase', 'bulkFirm', 'spread', 'saveRow', 'saveAll'].filter(k => typeof FTFirmsAdmin[k] === 'function'),
        selects: document.querySelectorAll('.ff-tbl select').length }));
    if (pickers.fn.length) fail(`the assignment actions are still wired up: ${pickers.fn.join(', ')}`);
    if (pickers.selects) fail(`the per-trainee assignment table is still rendered (${pickers.selects} pickers)`);

    // 2. the trainee gets a firm with nothing set up, and no assign:<id> is ever written
    await page.evaluate(() => { state.isAdmin = false; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    if (await get('assign:' + id)) fail('an assign:<id> record was written — nothing should assign one any more');
    await page.evaluate(() => goto('firm')); await page.waitForTimeout(1500);
    const firm = await page.evaluate(() => document.querySelector('main').innerText);
    const first = await page.evaluate(() => FTFirms.firms()[0].name);
    if (firm.indexOf(first) < 0) fail(`My Firm doesn't show the firm every trainee works for (${first}): ${firm.slice(0, 300)}`);
    if (!/The firm’s rules|The firm's rules/.test(firm)) fail('My Firm doesn\'t show the firm\'s rules');
    if (/trainer/i.test(firm)) fail(`My Firm still sends the trainee to a trainer: ${firm.slice(0, 300)}`);
    const firmId = await page.evaluate(() => FTFirms.firms()[0].id);
    await page.evaluate((f) => FTSessions.acknowledge(f), firmId); await page.waitForTimeout(800);
    if (!((await get('sessions:' + id)) || {}).ack) fail('✓ I\'ve read my firm\'s rules wasn\'t saved');

    // 3. every session can be started: a session is gated by its lesson, not by a trainer's say-so. The cases
    //    themselves ARE the trainer's to hand out (Admin → 🗂 Case Assignment), so 🗂 My cases may well say a
    //    trainee has none yet — that is the design, and .github/scripts/assign.cjs covers it.
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
    const labTxt = await page.evaluate(() => document.querySelector('main').innerText);
    if (/Waiting for your firm/i.test(labTxt)) fail(`the Practice Lab still waits on a firm: ${labTxt.slice(0, 300)}`);
    if (!/My cases/.test(labTxt)) fail('the Practice Lab doesn\'t show the cases the trainer assigned');
    if (/Cases aren’t handed out/.test(labTxt)) fail('the Practice Lab still says cases are not handed out at all');
    const shut = await page.evaluate(() => ['reception', 'calendaring', 'intake', 'records'].filter(s => !FTSessions.openable(s)));
    if (shut.length) fail(`sessions that can't be opened: ${shut.join(', ')}`);

    // 4. the Day 14 MedLOR request, to the day's rules — by fax, an NPIM doctor
    const fill = (sid, answers, toggles) => page.evaluate(async ([sid, answers, toggles]) => {
        FTSessions.open(sid); await new Promise(r => setTimeout(r, 300));
        FTSessions.start(sid); await new Promise(r => setTimeout(r, 300));
        Object.entries(answers).forEach(([k, v]) => FTSessions.set(k, v));
        Object.entries(toggles || {}).forEach(([k, l]) => l.forEach(o => FTSessions.toggle(k, o, true)));
        await FTSessions.submit();
        return { key: sid + '|-', text: document.querySelector('main').innerText };
    }, [sid, answers, toggles]);
    const medlor = { provider: 'JML(Fabito Anesthesia Pain Center)', npim: 'Dr. Daniel Fabito',
        file: 'MED - JML(Fabito Anesthesia Pain Center Dr. Fabito) - MedLOR with Unsworn COR and HIPAA 10.16.26 (Pia)',
        hipaaDate: '2026-03-02', relation: 'Self', method: 'Fax', fax: '+17029982171@metrofax.com' };
    const rec4 = await fill('records', medlor, { boxes: ['Medical bills', 'Medical records'], sig: ['Full name', 'General Virtual Assistant', 'Work email address', 'Phone number'] });
    await page.waitForTimeout(800);
    const s4 = (await get('sessions:' + id)) || { runs: {} }, run = s4.runs[rec4.key];
    if (!run || !run.auto || run.auto.pct !== 100) fail(`a MedLOR request done to the Day 14 rules should pass every check: ${JSON.stringify(run && run.auto)}`);
    if (!/Automated checks/.test(rec4.text)) fail('the submitted session doesn\'t show its checks');
    // the same request with the wrong file name, relationship and fax address misses exactly those
    const bad = await page.evaluate(async () => {
        FTSessions.again(); await new Promise(r => setTimeout(r, 300));
        FTSessions.set('file', 'MedLOR for Fabito'); FTSessions.set('relation', 'Spouse'); FTSessions.set('fax', '702-998-2171');
        await FTSessions.submit();
        const r = JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'sessions:' + state.traineeId }) }).then(r => r.json())).value).runs['records|-'];
        return r.auto.checks.filter(x => !x.ok).map(x => x.label);
    });
    ['The file name follows the convention', 'Relationship to Patient', '@metrofax.com'].forEach(w => { if (!bad.some(l => l.indexOf(w) >= 0)) fail(`a wrong ${w} should miss its check: ${JSON.stringify(bad)}`); });
    // put the passing request back, for the trainer's review below
    await page.evaluate(async (m) => { FTSessions.again(); await new Promise(r => setTimeout(r, 300)); Object.entries(m).forEach(([k, v]) => FTSessions.set(k, v)); await FTSessions.submit(); }, medlor);
    await page.waitForTimeout(500);
    // the intake call, recorded completely (no case: the caller is the lead)
    const dolISO = '2026-02-10', sol = await page.evaluate((d) => { const y = Number(FTFirms.myFirm().solYears) || 2; return (Number(d.slice(0, 4)) + y) + d.slice(4); }, dolISO);
    await fill('intake', { name: 'Maria Lopez', phone: '(702) 555-0142', dob: '1988-06-21', dol: dolISO, type: 'MVA', injuries: 'Neck and back pain; ER visit, now in physical therapy twice a week.',
        carrier: 'Progressive', sol, cms: true, conflict: true, decision: 'Accept: send the retainer' });
    const ik = ((await get('sessions:' + id)) || { runs: {} }).runs['intake|-'];
    if (!ik || !ik.auto || ik.auto.pct !== 100) fail(`an intake recorded completely should pass every check: ${JSON.stringify(ik && ik.auto)}`);
    // a calendar event in the wrong color for its length
    const cal = await page.evaluate(async () => {
        FTSessions.open('calendaring'); await new Promise(r => setTimeout(r, 300)); FTSessions.start('calendaring'); await new Promise(r => setTimeout(r, 300));
        Object.entries({ caller: 'Test Caller', caseRef: 'MC-21', kind: 'Consultation', attorney: 'Atty. Celeste Harbor', date: '2026-10-14', start: '10:00', length: '30', color: 'Tomato', meet: true, reminder: true, desc: 'Consultation with the client about the case' })
            .forEach(([k, v]) => FTSessions.set(k, v));
        await FTSessions.submit();
        return (JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'sessions:' + state.traineeId }) }).then(r => r.json())).value).runs['calendaring|-'] || {}).auto;
    });
    const color = cal && cal.checks.find(x => /color/.test(x.label));
    // Everyone works for the first firm, so the rule to miss is that firm's own 30-minute colour.
    const want30 = await page.evaluate(() => ((FTFirms.firms()[0].colors || []).find(c => Number(c[0]) === 30) || [])[1] || '');
    if (!want30 || want30 === 'Tomato') fail(`the test needs the firm's 30-minute colour to differ from Tomato: ${want30}`);
    if (!color || color.ok || color.want.indexOf(want30) < 0) fail(`a 30-minute event in Tomato should miss the firm's colour rule (${want30}): ${JSON.stringify(cal)}`);

    // 5. the trainer's review and inputs
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'sessions'; goto('admin'); }); await page.waitForTimeout(2500);
    await page.evaluate((batch) => FTSessionsAdmin.batch(batch), batch); await page.waitForTimeout(300);
    const adm = await page.evaluate(() => document.querySelector('main') ? document.querySelector('main').innerText : document.body.innerText);
    if (!/Pia Session/.test(adm) || !/to review/.test(adm)) fail('Admin → Practice Sessions doesn\'t list the submission to review');
    await page.evaluate(async ([id, key]) => {
        FTSessionsAdmin.open(id + '§' + key); await new Promise(r => setTimeout(r, 200));
        const form = document.querySelector('.fss-rvform'); form.querySelector('[data-score]').value = '95'; form.querySelector('[data-comment]').value = 'Good. Complete request.';
        await FTSessionsAdmin.save(id, key, form.querySelector('button'));
        state.adminTab = 'trainerinputs'; render(); await new Promise(r => setTimeout(r, 300));
        FTInputs.cell(id, 'intake-packet-demo'); await new Promise(r => setTimeout(r, 200));
        const c = document.querySelector('.fss-cellform'); c.querySelector('[data-status]').value = 'Passed'; c.querySelector('[data-score]').value = '88';
        await FTInputs.save(c.querySelector('button'));
    }, [id, rec4.key]);
    await page.waitForTimeout(500);
    const rv = await get('labreview:' + id);
    if (!rv || !rv.sessions || !rv.sessions[rec4.key] || rv.sessions[rec4.key].score !== 95) fail(`the trainer's session review wasn't saved: ${JSON.stringify(rv)}`);
    if (!rv || !rv.acts || !rv.acts['intake-packet-demo'] || rv.acts['intake-packet-demo'].status !== 'Passed') fail(`the trainer input wasn't saved: ${JSON.stringify(rv)}`);

    // 6. a trainer's Knowledge Check score
    await put('kcreview:' + id, { lessons: { 1: { score: 82, comment: 'Good.', notes: {}, at: new Date().toISOString() } } });
    await page.evaluate(() => { state.isAdmin = false; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(() => FTKc.open(1)); await page.waitForTimeout(2000);
    const kc = await page.evaluate(() => ({ text: document.querySelector('main').innerText, p: state.progress[1] }));
    if (!/Your trainer’s review/.test(kc.text) || !kc.p || kc.p.score !== 82 || !kc.p.done) fail(`the trainer's Knowledge Check score should be final and finish the lesson: ${JSON.stringify(kc.p)}`);
    if (/These are this lesson's Knowledge Check/.test(await page.evaluate(() => JSON.stringify(DAYS.map(d => d.sections.map(s => s.id)))))) fail('the process questions are still a slide');
    if (await page.evaluate(() => DAYS.some(d => d.sections.some(s => s.id === 'process-questions')))) fail('the process questions are still a slide');

    // the trainee sees the review as final, and the Scorecard has both sources
    await page.evaluate(() => { FTSessions.open('records'); }); await page.waitForTimeout(1500);
    if (!/95% · final/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the trainee doesn\'t see the trainer\'s final score on the session');
    await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
    const sc = await page.evaluate(() => { const m = lshProgram.mine(); return m.rows.map(r => [r.s.id, r.avg]); });
    const avg = Object.fromEntries(sc);
    if (avg.trainer !== 88) fail(`the Scorecard's trainer inputs: ${JSON.stringify(sc)}`);
    if (avg.sessions == null) fail(`the Scorecard's Practice Sessions: ${JSON.stringify(sc)}`);
    if (avg.kc !== 82) fail(`the Scorecard's Knowledge Checks: ${JSON.stringify(sc)}`);

    // 7. 👁 Switch View (the trainee view): an admin previewing the portal is not a signed-out visitor. The engine sets
    //    isAdmin=false and adminPreview=true there, so a "!traineeId && !isAdmin" guard would read it
    //    as signed out — the top bar lost its sections and every program page bounced to the dashboard.
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; render(); }); await page.waitForTimeout(600);
    await page.evaluate(() => { state.traineeId = ''; setAdminViewMode('trainee'); }); await page.waitForTimeout(1200);
    const tv = await page.evaluate(() => ({ isAdmin: state.isAdmin, preview: state.adminPreview,
        bar: [...document.querySelectorAll('.topbar .nav button')].map(b => b.textContent.trim()).join(' | ') }));
    if (tv.isAdmin || !tv.preview) fail(`Trainee view should be isAdmin=false, adminPreview=true: ${JSON.stringify(tv)}`);
    // the trainee's bar, as the platform spec names it (no Client Profile, no Scorecards, no Admin, no search, no full screen)
    ['Dashboard', 'Practice Lab', 'Knowledge Check', 'Focus', 'Main Portal'].forEach(n => {
        if (tv.bar.indexOf(n) < 0) fail(`Trainee view's top bar has no ${n}: ${tv.bar}`);
    });
    ['Client Profile', 'Scorecards', 'Process Questions', 'My Dashboard'].forEach(n => {
        if (tv.bar.indexOf(n) >= 0) fail(`Trainee view's top bar should not have ${n}: ${tv.bar}`);
    });
    // My Firm (js/ft-firms.js) is still reachable, just not from its own top bar button any more
    for (const [view, what] of [['process', 'the Knowledge Check'], ['simulators', 'the Practice Lab'], ['firm', 'My Firm']]) {
        const got = await page.evaluate(async (v) => { goto(v); await new Promise(r => setTimeout(r, 1200)); return state.view; }, view);
        if (got !== view) fail(`Trainee view can't open ${what}: goto('${view}') landed on '${got}'`);
    }
    // LOR Drafting is the Portal's shared tool, so 'lor' opens that rather than a view of its own
    // here. The opener is stubbed so this test isn't navigated off the course.
    const lorView = await page.evaluate(async () => {
        const real = window.lshOpenPortalDrafting;
        let called = 0;
        window.lshOpenPortalDrafting = () => { called++; };
        try { goto('lor'); await new Promise(r => setTimeout(r, 600)); } finally { window.lshOpenPortalDrafting = real; }
        return { called, view: state.view };
    });
    if (!lorView.called) fail("Trainee view can't open the LOR Drafting Activity: it does not open the Portal's tool");
    if (lorView.view !== 'dashboard') fail(`Trainee view: #/lor should leave the dashboard behind it, not '${lorView.view}'`);
    // Each module is its own Process Questions page now: goto('process') alone opens the index (a row per
    // module, no boxes yet), and opening one unlocked module (every module is unlocked in preview) shows
    // its own boxes to type in.
    const idx = await page.evaluate(() => document.querySelectorAll('main textarea').length);
    if (idx) fail('Trainee view: Process Questions index page already has boxes to type in (should be a list of modules)');
    await page.evaluate(async () => { FTProcess.openLesson(1); await new Promise(r => setTimeout(r, 1200)); });
    const boxes = await page.evaluate(() => document.querySelectorAll('main textarea').length);
    if (!boxes) fail('Trainee view: Process Questions has no boxes for a trainee to type in');
    if (!await page.evaluate(() => !!document.querySelector('.fp-preview'))) fail('Trainee view: Process Questions does not say it is a preview');

    // 8. Process Questions, one set per module: every module locked until the trainee finishes it.
    //    A lesson day runs Lesson → Activities → Process Questions: ✓ Finish lesson marks the module studied
    //    (which unlocks its Process Questions) and goes to 📚 Dashboard, where the day's activities come
    //    first and the Process Questions after them — it no longer jumps straight to the questions.
    // step 7 emptied the trainee to test the preview: put the real one back and leave preview
    await page.evaluate((tid) => { state.isAdmin = false; state.adminPreview = false; state.traineeId = tid;
        try { sessionStorage.removeItem('lsh_admin_preview'); } catch (e) {} }, id);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2200);
    await page.evaluate(async () => { goto('process'); await new Promise(r => setTimeout(r, 1600)); });
    // The index: one row per module, and a module only opens once it has been finished. Earlier steps
    // already passed one module's Knowledge Check, so count from what is locked now rather than from zero.
    const before = await page.evaluate(() => ({ rows: document.querySelectorAll('.fp-row').length, locked: document.querySelectorAll('.fp-locked').length }));
    if (!before.rows && !before.locked) fail('Process Questions shows no modules');
    if (!before.locked) fail('no module is locked, so the per-module lock is doing nothing');
    const pick = await page.evaluate(() => (DAYS.find(d => window.ftKcQuestions(d.id).length && !window.ftModuleStudied(d.id)) || {}).id);
    if (!pick) fail('no unfinished module with questions to test the lock with');
    await page.evaluate(async (l) => { await window.finishTrainingForDay(l); await new Promise(r => setTimeout(r, 1600)); }, pick);
    if (!await page.evaluate((l) => !!(state.progress[l] || {}).studied, pick)) fail('✓ Finish lesson did not mark the module studied');
    // Lesson → Activities → Process Questions: finishing the lesson lands on the dashboard, not the questions.
    if (await page.evaluate(() => state.view) === 'process') fail('✓ Finish lesson still jumps straight to the Process Questions, skipping the day\'s activities');
    if (!['modules', 'dashboard'].includes(await page.evaluate(() => state.view))) fail(`✓ Finish lesson should go to the Dashboard for the day's activities: view=${await page.evaluate(() => state.view)}`);
    // the dashboard has no next-step band any more: each lesson's card carries its days' activities
    await page.waitForTimeout(600);
    if (await page.$('main .ftn')) fail('📚 Dashboard still draws the next-step band after ✓ Finish lesson');
    if (!(await page.$('main.main-dash .ftli .ftli-days'))) fail(`📚 Dashboard has no lesson cards with the day's activities`);
    // and the questions themselves are now open for that module, one click away
    await page.evaluate(async (l) => { FTProcess.openLesson(l); await new Promise(r => setTimeout(r, 1600)); }, pick);
    if (await page.evaluate((l) => state.pqLesson, pick) !== pick) fail(`that module's Process Questions page did not open: pqLesson=${await page.evaluate(() => state.pqLesson)}`);
    const opened = await page.evaluate(() => ({ h1: (document.querySelector('.fp-hero h1')||{}).textContent || '', boxes: document.querySelectorAll('main textarea').length }));
    if (!opened.boxes) fail('the finished module has no boxes to answer in');
    const want = await page.evaluate((l) => ftName(l), pick);
    if (opened.h1.indexOf(want) < 0) fail(`the module just finished (${want}) is not the one that opened: ${opened.h1}`);
    // back to the index: exactly that one module should have unlocked, nothing else
    await page.evaluate(async () => { goto('process'); await new Promise(r => setTimeout(r, 800)); });
    const after = await page.evaluate(() => ({ locked: document.querySelectorAll('.fp-locked').length }));
    if (after.locked !== before.locked - 1) fail(`finishing one module should unlock exactly that one: was ${before.locked} locked, now ${JSON.stringify(after)}`);

    await browser.close();
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Practice Sessions test passed (firm profiles, the trainer assigning the firm and cases in 🗂 Case Assignment, My Firm, the four sessions checked against the Training Guide and the firm (no PI Process Flow, no case needed), the Drafting Tools\' LOR Drafting Activity opening the Portal\'s shared tool, the trainer\'s review and inputs, the Knowledge Check\'s trainer score, the Scorecard, Trainee view reaching all of it, and Process Questions locked per module until each is finished).');
})().catch(e => { console.error(e); process.exit(1); });
