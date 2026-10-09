// The Practice Lab's real-time Practice Sessions at the trainee's own law firm (js/ft-firms.js, js/ft-sessions.js), the
// trainer's inputs, and the Knowledge Check's trainer review (js/ft-process.js):
//   1. Admin → 🏛 Law Firms: the three starting firm profiles; a firm for the trainee and 🎲 Spread cases gives two trainees
//      different cases in every practice area (assign:<id>).
//   2. The trainee's 🏛 My Firm shows the firm, its rules and their cases; ✓ I've read the rules is saved.
//   3. The Practice Lab has the six sessions and no simulator cards; the landing page has no Simulators / Blueprint card.
//   4. A ChartSwap records request filled from the case file passes every check; a calendar event in the wrong color doesn't.
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
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);

    // 3. the landing page and the Practice Lab
    const land = await page.evaluate(() => { goto('dashboard'); return [...document.querySelectorAll('.fts-banner')].length; });
    if (land) fail(`the landing page still has ${land} Simulators / Blueprint card(s)`);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
    const lab = await page.evaluate(() => ({ sessions: document.querySelectorAll('.fss-card').length, text: document.querySelector('main').innerText }));
    // Five Practice Sessions: Claims is no longer one of them — the Claims Specialist work is the
    // 🧰 Drafting Tools' LOR Drafting Activity, which has no CMS case file and no firm case.
    if (lab.sessions !== 5) fail(`the Practice Lab has ${lab.sessions} Practice Sessions (expected 5)`);
    if (/All simulators|📅 Calendaring Simulators\n/.test(lab.text)) fail('the Practice Lab still lists the simulators');
    if (/Claims: LORs to the 1P and 3P carriers/.test(lab.text)) fail('the Claims Specialist Practice Session is still in the Practice Lab');
    if (!/Drafting Tools/.test(lab.text) || !/LOR Drafting Activity/.test(lab.text)) fail('the Practice Lab has no 🧰 Drafting Tools / LOR Drafting Activity');
    if (!/Templates in this tool/i.test(lab.text)) fail('the drafting tool\'s card does not list the templates it carries');
    if (!/LOR Drafting for 1P/.test(lab.text) || !/Drafting for 3P/.test(lab.text)) fail('the drafting tool\'s card does not name its two templates');
    if (!/Waiting for your firm/.test(lab.text)) fail('without a firm the sessions should wait for one');

    // 3b. the LOR Drafting Activity: a standalone activity, the trainer assigns the case, the trainee drafts and downloads
    await page.evaluate(() => goto('lor')); await page.waitForTimeout(1200);
    const lor0 = await page.evaluate(() => document.querySelector('main').innerText);
    if (!/Do not create a case file in the CMS/i.test(lor0.replace(/\s+/g, ' '))) fail('the LOR activity does not tell trainees to keep it out of the CMS');
    if (!/hasn’t assigned your case yet|hasn't assigned your case yet/.test(lor0)) fail('with no case assigned the LOR activity should say so');
    await put('lorassign:' + id, { case: 1 });
    await page.evaluate(() => { FTLor.reload(); }); await page.waitForTimeout(1500);
    const lor = await page.evaluate(() => {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      document.querySelectorAll('.lorl-box').forEach(b => b.click());
      return { fields: document.querySelectorAll('.lorl-in, .lorl-ta').length, boxes: document.querySelectorAll('.lorl-box').length,
               ticked: document.querySelectorAll('.lorl-box.on').length, dateOk: (document.querySelector('.lorl-auto') || {}).textContent === today,
               notes: document.querySelectorAll('.lor-notes dd').length, text: document.querySelector('main').innerText };
    });
    if (!lor.fields) fail('the LOR letter has no fields to fill in');
    if (lor.boxes !== 3 || lor.ticked !== 3) fail(`the 1P letter's tick boxes don't work (${lor.ticked} of ${lor.boxes} ticked)`);
    if (!lor.dateOk) fail('the letter is not dated today');
    if (!lor.notes) fail('the assigned case notes are not on the page');
    if (!/Sandy Van, Esq\./.test(lor.text)) fail('the letter is not the firm\'s template');
    // the file name: the trainers' convention filled in, editable, and what the PDF is actually saved as
    const nm = await page.evaluate(() => {
      const box = document.getElementById('lorFile');
      return { val: box ? box.value : '', reset: !!(document.getElementById('lorFileReset') || {}).disabled,
               help: (document.getElementById('lorFileHelp') || {}).textContent || '' };
    });
    const mmddyyyy = (d => [d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('.') + '.' + d.getFullYear())(new Date());
    if (!nm.val) fail('the LOR tool has no file-name box');
    if (!/^INS – /.test(nm.val)) fail(`the file name does not follow the convention: ${nm.val}`);
    if (nm.val.indexOf(mmddyyyy) < 0) fail(`the file name is not dated today (${mmddyyyy}): ${nm.val}`);
    if (/mm\.dd\.yyyy|VA’s name|1P Insurance Provider/.test(nm.val)) fail(`the convention's tokens were not filled in: ${nm.val}`);
    if (!nm.reset) fail('Reset to the convention should start disabled, with nothing edited yet');
    if (nm.help.indexOf('mm.dd.yyyy') < 0) fail('the help line does not show the convention');
    // edit it: the typed name is what the download uses, and it survives a reload
    const edited = await page.evaluate(() => {
      const box = document.getElementById('lorFile');
      box.value = 'INS - My Own Name 01.02.2030'; box.dispatchEvent(new Event('input', { bubbles: true }));
      return { reset: !!(document.getElementById('lorFileReset') || {}).disabled };
    });
    if (edited.reset) fail('Reset to the convention stays disabled after the name is edited');
    await page.waitForTimeout(1400);
    const saved = await get('lor:' + id);
    if (!saved || !saved.letters || !saved.letters.lor1p || saved.letters.lor1p.file !== 'INS - My Own Name 01.02.2030') fail(`the edited file name wasn't saved: ${JSON.stringify(saved && saved.letters && saved.letters.lor1p)}`);
    // the downloads come out under that name. Checked through the name the download layer is handed and
    // through the Word download's own anchor: jsPDF comes off a CDN, so the PDF is not fetched here.
    const dl = await page.evaluate(() => {
      const names = [];
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { if (this.download) names.push(this.download); };
      try { FTLor.word('lor1p'); } finally { HTMLAnchorElement.prototype.click = click; }
      return { handed: FTLor.fileName('lor1p'), names };
    });
    if (dl.handed !== 'INS - My Own Name 01.02.2030') fail(`the download is handed the wrong name: ${dl.handed}`);
    if (dl.names[0] !== 'INS - My Own Name 01.02.2030.doc') fail(`the download was not named as edited: ${JSON.stringify(dl.names)}`);
    // reset puts the convention back
    await page.evaluate(() => FTLor.resetName('lor1p')); await page.waitForTimeout(300);
    const back = await page.evaluate(() => (document.getElementById('lorFile') || {}).value || '');
    if (!/^INS – /.test(back) || back.indexOf(mmddyyyy) < 0) fail(`Reset did not put the convention back: ${back}`);

    const lor3 = await page.evaluate(() => { FTLor.tab('lor3p'); return document.querySelector('main').innerText; });
    if (!/AFFIDAVIT OF INSURANCE COVERAGE/.test(lor3)) fail('the 3P letter has no affidavit');
    const nm3 = await page.evaluate(() => (document.getElementById('lorFile') || {}).value || '');
    if (!/LOR with Affidavit/.test(nm3)) fail(`the 3P letter's file name is not its own convention: ${nm3}`);

    // 1. Admin → 🏛 Law Firms
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'firms'; goto('admin'); }); await page.waitForTimeout(2500);
    const firmsTxt = await page.evaluate(() => document.querySelector('.ff-admin') ? document.querySelector('.ff-admin').innerText : '');
    ['LSH Training Law Group', 'Harbor & Pine Injury Law', 'Summit Trial Attorneys'].forEach(n => { if (firmsTxt.indexOf(n) < 0) fail(`Admin → Law Firms doesn't list ${n}`); });
    await page.evaluate(([id, other, batch]) => { FTFirmsAdmin.batch(batch); FTFirmsAdmin.setFirm(id, 'harbor-pine-injury-law'); FTFirmsAdmin.setFirm(other, 'harbor-pine-injury-law'); FTFirmsAdmin.spread(); }, [id, other, batch]);
    await page.evaluate(() => FTFirmsAdmin.saveAll({ disabled: false })); await page.waitForTimeout(800);
    const a1 = await get('assign:' + id), a2 = await get('assign:' + other);
    if (!a1 || a1.firm !== 'harbor-pine-injury-law') fail(`the trainee's firm wasn't saved: ${JSON.stringify(a1)}`);
    const areas = ['pi', 'intake', 'claims', 'records'];
    if (!a1 || !areas.every(k => (a1.cases[k] || []).length === 1)) fail(`the trainee didn't get a case in every area: ${JSON.stringify(a1)}`);
    if (a1 && a2 && areas.some(k => a1.cases[k][0] === a2.cases[k][0])) fail(`two trainees got the same case: ${JSON.stringify([a1.cases, a2.cases])}`);
    const pool = await page.evaluate(() => FTFirms.firmById('harbor-pine-injury-law').cases);
    if (a1 && !areas.every(k => pool.includes(a1.cases[k][0]))) fail('a case came from outside the firm\'s caseload');

    // 2. the trainee's 🏛 My Firm
    await page.evaluate(() => { state.isAdmin = false; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(() => goto('firm')); await page.waitForTimeout(1500);
    const firm = await page.evaluate(() => document.querySelector('main').innerText);
    if (!/Harbor & Pine Injury Law/.test(firm) || !/PIP claim within 14 days/.test(firm) || (a1 && firm.indexOf(a1.cases.records[0]) < 0)) fail(`My Firm doesn't show the firm, its rules and the cases: ${firm.slice(0, 300)}`);
    await page.evaluate(() => FTSessions.acknowledge('harbor-pine-injury-law')); await page.waitForTimeout(800);
    if (!((await get('sessions:' + id)) || {}).ack) fail('✓ I\'ve read my firm\'s rules wasn\'t saved');

    // 4. a ChartSwap request, filled from the case file
    const rec4 = await page.evaluate(async () => {
        FTSessions.open('records'); await new Promise(r => setTimeout(r, 300));
        FTSessions.start('records'); await new Promise(r => setTimeout(r, 300));
        const f = FTFirms.myFirm(), c = FTFirms.myCases('records')[0], p = c.providers[0];
        const iso = s => { const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; };
        const hold = c.hipaa === 'sent, not signed';
        Object.entries({ requester: f.name, deliver: f.recordsEmail, patient: c.client.name, dob: iso(c.client.dob), provider: p.name, from: iso(p.dates.split(/\s+[–-]\s+/)[0]),
            purpose: 'Legal: attorney request', hipaa: hold ? 'Not signed yet: hold the request and send it to the client' : 'Signed authorization attached', rep: c.authorized ? c.authorized.split(' (')[0] : c.client.name })
            .forEach(([k, v]) => FTSessions.set(k, v));
        f.recordTypes.forEach(t => FTSessions.toggle('types', t, true));
        await FTSessions.submit();
        return { key: 'records|' + c.id, text: document.querySelector('main').innerText };
    });
    await page.waitForTimeout(800);
    const s4 = (await get('sessions:' + id)) || { runs: {} }, run = s4.runs[rec4.key];
    if (!run || !run.auto || run.auto.pct !== 100) fail(`a request filled from the case file should pass every check: ${JSON.stringify(run && run.auto)}`);
    if (!/Automated checks/.test(rec4.text)) fail('the submitted session doesn\'t show its checks');
    // a calendar event in the wrong color for its length
    const cal = await page.evaluate(async () => {
        FTSessions.open('calendaring'); await new Promise(r => setTimeout(r, 300)); FTSessions.start('calendaring'); await new Promise(r => setTimeout(r, 300));
        Object.entries({ caller: 'Test Caller', caseRef: 'MC-21', kind: 'Consultation', attorney: 'Atty. Celeste Harbor', date: '2026-10-14', start: '10:00', length: '30', color: 'Tomato', meet: true, reminder: true, desc: 'Consultation with the client about the case' })
            .forEach(([k, v]) => FTSessions.set(k, v));
        await FTSessions.submit();
        return (JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'sessions:' + state.traineeId }) }).then(r => r.json())).value).runs['calendaring|-'] || {}).auto;
    });
    const color = cal && cal.checks.find(x => /color/.test(x.label));
    if (!color || color.ok || !/Banana/.test(color.want)) fail(`a 30-minute event in Tomato should miss the firm's color rule (Banana): ${JSON.stringify(cal)}`);

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

    // 7. 👁 Trainee view: an admin previewing the portal is not a signed-out visitor. The engine sets
    //    isAdmin=false and adminPreview=true there, so a "!traineeId && !isAdmin" guard would read it
    //    as signed out — the top bar lost its sections and every program page bounced to the dashboard.
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; render(); }); await page.waitForTimeout(600);
    await page.evaluate(() => { state.traineeId = ''; setAdminViewMode('trainee'); }); await page.waitForTimeout(1200);
    const tv = await page.evaluate(() => ({ isAdmin: state.isAdmin, preview: state.adminPreview,
        bar: [...document.querySelectorAll('.topbar .nav button')].map(b => b.textContent.trim()).join(' | ') }));
    if (tv.isAdmin || !tv.preview) fail(`Trainee view should be isAdmin=false, adminPreview=true: ${JSON.stringify(tv)}`);
    ['Modules', 'Process Questions', 'Practice Lab', 'My Dashboard'].forEach(n => {
        if (tv.bar.indexOf(n) < 0) fail(`Trainee view's top bar has no ${n}: ${tv.bar}`);
    });
    for (const [view, what] of [['process', 'Process Questions'], ['simulators', 'the Practice Lab'], ['lor', 'the LOR Drafting Activity']]) {
        const got = await page.evaluate(async (v) => { goto(v); await new Promise(r => setTimeout(r, 1200)); return state.view; }, view);
        if (got !== view) fail(`Trainee view can't open ${what}: goto('${view}') landed on '${got}'`);
    }
    const typing = await page.evaluate(() => document.querySelectorAll('main textarea').length);
    await page.evaluate(async () => { goto('process'); await new Promise(r => setTimeout(r, 1200)); });
    const boxes = await page.evaluate(() => document.querySelectorAll('main textarea').length);
    if (!boxes) fail('Trainee view: Process Questions has no boxes for a trainee to type in');
    if (!await page.evaluate(() => !!document.querySelector('.fp-preview'))) fail('Trainee view: Process Questions does not say it is a preview');

    // 8. Process Questions, one set per module: every module locked until the trainee finishes it,
    //    ✓ Finish lesson marks it studied and brings them to that module's questions, and each module
    //    row in 📚 Training Modules carries its own activities.
    // step 7 emptied the trainee to test the preview: put the real one back and leave preview
    await page.evaluate((tid) => { state.isAdmin = false; state.adminPreview = false; state.traineeId = tid;
        try { sessionStorage.removeItem('lsh_admin_preview'); } catch (e) {} }, id);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2200);
    await page.evaluate(async () => { goto('process'); await new Promise(r => setTimeout(r, 1600)); });
    // One card per module, and a module only opens once it has been finished. Earlier steps already
    // passed one module's Knowledge Check, so count from what is locked now rather than from zero.
    const before = await page.evaluate(() => ({ sets: document.querySelectorAll('.fp-set').length, locked: document.querySelectorAll('.fp-locked').length }));
    if (!before.sets) fail('Process Questions shows no modules');
    if (!before.locked) fail('no module is locked, so the per-module lock is doing nothing');
    const pick = await page.evaluate(() => (DAYS.find(d => window.ftKcQuestions(d.id).length && !window.ftModuleStudied(d.id)) || {}).id);
    if (!pick) fail('no unfinished module with questions to test the lock with');
    await page.evaluate(async (l) => { await window.finishTrainingForDay(l); await new Promise(r => setTimeout(r, 1600)); }, pick);
    if (!await page.evaluate((l) => !!(state.progress[l] || {}).studied, pick)) fail('✓ Finish lesson did not mark the module studied');
    if (await page.evaluate(() => state.view) !== 'process') fail('✓ Finish lesson did not open that module\'s Process Questions');
    const after = await page.evaluate(() => ({ locked: document.querySelectorAll('.fp-locked').length,
        open: [...document.querySelectorAll('.fp-set:not(.fp-locked) .fp-head b')].map(x => x.textContent),
        boxes: document.querySelectorAll('main textarea').length }));
    if (after.locked !== before.locked - 1) fail(`finishing one module should unlock exactly that one: was ${before.locked} locked, now ${JSON.stringify(after)}`);
    const want = await page.evaluate((l) => ftName(l), pick);
    if (after.open.indexOf(want) < 0) fail(`the module just finished (${want}) is not the one that opened: ${JSON.stringify(after.open)}`);
    if (!after.boxes) fail('the finished module has no boxes to answer in');
    await page.evaluate(async () => { goto('modules'); await new Promise(r => setTimeout(r, 1400)); });
    const claims = await page.evaluate(() => { const r = [...document.querySelectorAll('.lp-lesson')]
        .find(x => /Claims Specialist/.test((x.querySelector('.lp-lesson-t b') || {}).textContent || ''));
        return r ? [...r.querySelectorAll('.lp-act')].map(a => a.textContent.trim()).join(' | ') : ''; });
    if (!/LOR Drafting Activity/.test(claims)) fail(`the Claims module doesn't carry its LOR Drafting Activity: ${claims}`);
    if (!/Process Questions/.test(claims)) fail(`the Claims module doesn't carry its Process Questions: ${claims}`);

    await browser.close();
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Practice Sessions test passed (firm profiles and case assignment, My Firm, the five sessions checked against the case and the firm, the Drafting Tools\' LOR Drafting Activity with its editable naming convention, the trainer\'s review and inputs, the Knowledge Check\'s trainer score, the Scorecard, Trainee view reaching all of it, and Process Questions locked per module until each is finished).');
})().catch(e => { console.error(e); process.exit(1); });
