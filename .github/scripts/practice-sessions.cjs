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
    const batch = 'CIPS' + String(Date.now()).slice(-6);
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
    // 📚 Resource Library's LOR Drafting Activity, which has no CMS case file and no firm case.
    if (lab.sessions !== 5) fail(`the Practice Lab has ${lab.sessions} Practice Sessions (expected 5)`);
    if (/All simulators|📅 Calendaring Simulators\n/.test(lab.text)) fail('the Practice Lab still lists the simulators');
    if (/Claims: LORs to the 1P and 3P carriers/.test(lab.text)) fail('the Claims Specialist Practice Session is still in the Practice Lab');
    if (!/Resource Library/.test(lab.text) || !/LOR Drafting Activity/.test(lab.text)) fail('the Practice Lab has no 📚 Resource Library / LOR Drafting Activity');
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
    const lor3 = await page.evaluate(() => { FTLor.tab('lor3p'); return document.querySelector('main').innerText; });
    if (!/AFFIDAVIT OF INSURANCE COVERAGE/.test(lor3)) fail('the 3P letter has no affidavit');

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

    await browser.close();
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Practice Sessions test passed (firm profiles and case assignment, My Firm, the five sessions checked against the case and the firm, the Resource Library\'s LOR Drafting Activity, the trainer\'s review and inputs, the Knowledge Check\'s trainer score, the Scorecard).');
})().catch(e => { console.error(e); process.exit(1); });
