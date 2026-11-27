// 🛠 → 🏅 Every Practice Lab activity a trainee hands in, on their Score Card: one realistic hand-in per activity, each in
//   the record its page writes, and each on the trainee's 🏅 My Performance (lshProgram.compute and the cards drawn) and the
//   trainer's 📋 Batch Sheet, in the grading system it belongs to — scored where the Training Guide grades it, 📎 Additional
//   Reference (shown, not counted) or hidden where the program says so:
//   - 🎧 Call Listening logs (listening:<id>.logs): Reception and Intake calls scored by the share logged; Day 13's provider
//     calls are samples, off the Score Card; 🎧 Day 3's Reception Listening Activity by its grade (trackerreview .assess.recact),
//     under 🎧 Call Listening only;
//   - 🟢 the Practice Sessions (sessions:<id>.runs): practice, hidden; the Booking Rule Check (calrules:<id>) 📎 on 📅 Calendar checks;
//   - 🗓 Day 5–6's Calendar Activity Check (calcheck:<id>), Standard Training - Calendaring Activity (calweek:<id>) and the
//     Calendar Sim (calsim:<id>, and a connected simulator's result): 📎;
//   - 📘 a Process Guide (guide:<id>:<guide>) and its trainer's review (trainerfb .act guide): feedback only, on no Score Card;
//   - 🏷 the Naming & Reporting Drills (drills:<id>.runs): 📎, the best round per set;
//   - 📦 the Intake Worksheet answered on the platform (actsub:<id>.items.intakews, its answers kept by the worker) and graded
//     (trackerreview .assess.intakews): scored under 📋, on Day 8;
//   - 🎧 the Transcription Activity (transcribe:<id>, its automatic score trackerreview .transcribe): 📎 until the trainer scores it;
//   - 📄 the LOR Drafting Activity, done on the Training Portal (simresults:<id> "Drafting — LOR"): 📎 under 🧰 Portal simulators,
//     and done on the Batch Sheet's Day 11.
// Usage: NODE_PATH=…/node_modules node .github/scripts/lab-scorecard.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B111626';
const failures = []; const fail = m => failures.push(m);

// 🔒 the worker, signed in as the trainee: the Intake Worksheet's answers, handed in on the platform, are kept
async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const s = await call('/api/auth/trainee', { name: 'Wes Worksheet', batch: BATCH });
  if (!s.body || !s.body.token) { fail(`the worker didn't sign the trainee in: ${JSON.stringify(s)}`); return; }
  const t = s.body.token, id = s.body.id;
  const answers = ['The retainer agreement: the client hires the firm.', '', 'HIPAA authorization: lets the firm request the records.'];
  const w = await call('/api/storage/set', { key: 'actsub:' + id, value: JSON.stringify({ items: { intakews: { answers, answer: 'platform', submittedAt: '2026-11-24T15:00:00Z' } } }) }, t);
  if (w.status !== 200) fail(`the trainee couldn't hand in the Intake Worksheet: ${JSON.stringify(w)}`);
  const kept = ((JSON.parse((await call('/api/storage/get', { key: 'actsub:' + id }, t)).body.value || 'null') || {}).items || {}).intakews || {};
  if (JSON.stringify(kept.answers) !== JSON.stringify(answers) || kept.submittedAt !== '2026-11-24T15:00:00Z' || kept.answer !== 'platform')
    fail(`the Intake Worksheet's answers, handed in on the platform, weren't kept: ${JSON.stringify(kept)}`);
}

(async () => {
  try { await workerChecks(); } catch (e) { fail('worker checks threw: ' + e.message); }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
    await put('settings:listening', null);
    await signIn(page, 'Lab', 'Scorer', BATCH);
    const id = await page.evaluate(() => state.traineeId);
    { const rec = await get('trainee:' + id); rec.approved = true; rec.archived = false; await put('trainee:' + id, rec); }
    // (no automatic 🔄 Update all scores on opening the batch: it would work the seeded days out again on the server)
    await page.evaluate(b => localStorage.setItem('ft_bs_sync:' + b, String(Date.now())), BATCH);
    await page.waitForTimeout(2500);   // (the sign-in's own background checks done before the records are seeded)

    const at = new Date(Date.now() - 3600e3).toISOString(), when = 'Nov 24, 10:00 AM ET';
    // 🎧 Call Listening logs, each recording logged in full (js/ft-listening.js FIELDS): all ten Reception calls (her five
    // are among them: 5 of 5), two of the four Intake calls, one of Day 13's sample provider calls; and the Reception
    // Listening Activity's first call (ACT_FIELDS)
    const log = n => ({ who: 'Existing client', purpose: `Caller ${n} asking for a case status update`, at,
      handled: 'Greeted with the firm name, verified the caller by name, DOB and date of loss, checked the file, gave the next step and closed politely.',
      phrase: '“Let me pull up your file for you.”', better: 'Confirm the callback number before ending the call, so the attorney can reach them.' });
    const logs = { reception: {}, intake: { 1: log(1), 2: log(2) }, records: { 1: log(1) },
      recact: { 1: { caller: 'Gloria Benton, existing client', callback: '555-201-4410', verified: 'Name and DOB', reason: 'Missing email about her case', action: 'Message to the paralegal', obstacle: 'She was upset after calling twice with no answer.', response: 'Active listening, apologized and set a clear callback time.', at } } };
    for (let n = 1; n <= 10; n++) logs.reception[n] = log(n);
    await put('listening:' + id, { logs });
    // 📝 the graded activities (worker.js /api/assess/grade; the Intake Worksheet graded on 📦 Intake Packets) and the
    // Transcription Activity's automatic score (worker.js gradeTranscription), for the submission it was worked out from
    const trAt = new Date(Date.now() - 2 * 3600e3).toISOString();
    await put('trackerreview:' + id, { days: {}, assess: {
      recact: { at, when, title: 'Reception Listening Activity: Harbor & Pine Calls', score: 32, max: 40, pct: 80, pending: false, ai: true, items: { c1_caller: { ok: true, pts: 1 } } },
      intakews: { at, when, title: 'Intake Worksheet', score: 85, max: 100, pct: 85, comment: 'WS-COMMENT: the HIPAA form’s purpose is missing.', by: 'trainer' } },
      transcribe: { 1: { at, submittedAt: trAt, key: 'transcription', act: 'transcription-1', pct: 72, avg: 3.6, scored: 6, summary: 'TR-SUMMARY: clear minutes.' } } });
    // 📦 the Intake Worksheet as she answered it on the platform (js/ft-intake.js submitSheet)
    await put('actsub:' + id, { items: { intakews: { answers: ['The retainer agreement: the client hires the firm.'], answer: 'platform', submittedAt: at } } });
    await put('transcribe:' + id, { r: { 1: { startedAt: trAt, submittedAt: trAt, file: 'Minutes - Client Interview', f: { attendees: 'Atty. Magdalena, the client' } } } });
    // 🟢 the three Practice Sessions submitted, each with its automated checks (js/ft-sessions.js)
    await put('sessions:' + id, { runs: {
      'reception|-': { attempts: 1, startedAt: at, submittedAt: at, minutes: 25, answers: {}, auto: { pct: 70, checks: [] } },
      'calendaring|-': { attempts: 1, startedAt: at, submittedAt: at, minutes: 25, answers: {}, auto: { pct: 60, checks: [] } },
      'intake|-': { attempts: 1, startedAt: at, submittedAt: at, minutes: 25, answers: {}, auto: { pct: 50, checks: [] } } } });
    // 📅 the Booking Rule Check after the Appointment Setting mock calls (js/ft-calrules.js): a practice call and one with the trainer
    await put('calrules:' + id, { bookings: [{ at, mode: 'practice', pct: 80, checks: [] }, { at, mode: 'trainer', pct: 100, checks: [] }] });
    // 🗓 the Calendar Activity Check's submission (js/ft-calcheck.js submit), next week's calendar (calweek-api.js) and the Calendar Sim
    await put('calcheck:' + id, { entries: { 1: { title: 'Client Meeting' } }, submits: [{ at, met: 0, total: 10, pct: 0, checks: [['1', 'Title', true, '']], snap: { entries: { 1: { title: 'Client Meeting' } } } }] });
    await put('calweek:' + id, { submittedAt: at, pct: 60, done: 6, events: [] });
    const scn = await page.evaluate(() => FTCalCore.SCENARIOS[0]);
    await put('calsim:' + id, { submissions: [{ scn: scn.id, at, auto: { pct: 70 } }], autos: [{ scn: scn.id, pct: 70, at }], reviews: {}, external: [{ title: 'Google Calendar Sim', score: 8, max: 10, at }] });
    // 🏷 a round of each demo day's drills (js/ft-drills.js)
    await put('drills:' + id, { runs: [{ set: 'intake', score: 8, total: 10, at }, { set: 'intake', score: 6, total: 10, at }, { set: 'lor', score: 9, total: 10, at }, { set: 'medlor', score: 7, total: 10, at }, { set: 'lv', score: 10, total: 10, at }] });
    // 📘 a Process Guide submitted (js/ft-process-guide.js), and the trainer's review of it: feedback only
    await put(`guide:${id}:intake-packet`, { html: '<h1>Saving the Intake Packet</h1><ol><li>Open SA</li></ol>', submittedAt: at });
    await put('trainerfb:' + id, { items: { 'guide:intake-packet': { act: 'guide', item: 'intake-packet', title: 'Saving the Intake Packet', score: 90, verdict: 'Good' } } });
    // 📄 the LOR Drafting Activity, done on the Training Portal: its result, as the Portal's /api/sim-results keeps it
    await put('simresults:' + id, { best: { 'Drafting — LOR': { score: 88, count: 2 } }, results: [{ simulator: 'Drafting — LOR', scenario: '1P & 3P LORs', score: 88, at }] });

    // the Score Card as compute works it out, from the stored records (as 🏅 My Performance and 📋 Batch Sheet read them)
    const SC = () => page.evaluate(async id => {
      const P = window.LSH_PROGRAM, S = P.sources.filter(s => s.key), vals = await sharedGetMany(S.map(s => s.key + id).concat(P.shared)), rec = {}, shared = {};
      S.forEach((s, i) => { rec[s.key] = vals[i] || null; }); P.shared.forEach((k, i) => { shared[k] = vals[S.length + i] || null; });
      const sc = lshProgram.compute({ id, progress: {}, rec, shared, since: '' });
      const out = {}; sc.rows.forEach(r => { out[r.s.id] = { hidden: !!r.s.hidden, reference: !!r.reference, avg: r.avg,
        items: r.items.map(x => ({ name: String(x.name), pct: x.pct, refPct: x.refPct, reference: !!x.reference, note: x.note || '' })) }; });
      return out;
    }, id);
    const sc = await SC();
    const item = (src, re) => ((sc[src] || { items: [] }).items.find(x => re.test(x.name))) || null;
    const where = re => Object.keys(sc).filter(k => sc[k].items.some(x => re.test(x.name)));
    const scored = (src, re, pct, what) => { const x = item(src, re);
      if (!x || x.reference || x.pct !== pct) fail(`${what} isn't scored ${pct}% under ${src}: ${JSON.stringify(x)}`); };
    const ref = (src, re, pct, what) => { const x = item(src, re);
      if (!x || !x.reference || x.pct !== null || (pct != null && x.refPct !== pct) || (pct == null && typeof x.refPct !== 'number')) fail(`${what} isn't 📎 Additional Reference (${pct == null ? 'with its figure' : pct + '%'}) under ${src}: ${JSON.stringify(x)}`); };
    const once = (re, src, what) => { const w = where(re); if (JSON.stringify(w) !== JSON.stringify([src])) fail(`${what} is under ${JSON.stringify(w)}, not ${src} alone`); };

    // 🎧 Call Listening: scored, the share of her recordings logged in full; Day 13's samples off it; the activity by its grade
    scored('listening', /Reception calls/, 100, '🎧 Reception calls (5 of her 5 logged)');
    scored('listening', /Intake calls/, 50, '🎧 Intake calls (2 of 4 logged)');
    if (item('listening', /Provider communication/)) fail('Day 13\'s sample provider calls are on the Score Card (reference only, not scored)');
    scored('listening', /Reception Listening Activity/, 80, '🎧 the Reception Listening Activity (32 of 40)');
    once(/Reception Listening Activity/, 'listening', 'the Reception Listening Activity');
    if (sc.listening.avg !== Math.round((100 + 50 + 80) / 3)) fail(`🎧 Call Listening's average isn't its three items': ${sc.listening.avg}`);
    // 🟢 the Practice Sessions: hidden, practice (each kept with its automated checks, counted nowhere)
    if (!sc.sessions || !sc.sessions.hidden) fail('🟢 Practice Sessions has a Score Card card of its own');
    [[/Reception/, 70], [/Calendar|Appointment/, 60], [/Intake/, 50]].forEach(([re, p]) => ref('sessions', re, p, `the ${re.source} Practice Session`));
    // 📅 the Booking Rule Check, the Calendar Activity Check, next week's calendar and the Calendar Sim: 📎
    ref('calcheck', /Booking rules · Practice calls/, 80, '📅 the Booking Rule Check\'s practice calls');
    ref('calcheck', /Booking rules · Mock call with the trainer/, 100, '📅 the Booking Rule Check\'s mock calls with the trainer');
    ref('calcheck', /Attorney Calendar Management Activity/, null, '🗓 the Calendar Activity Check');
    if (!sc.calrules || !sc.calrules.hidden) fail('📅 Calendar booking rules has a card of its own (its items are on 📅 Calendar checks)');
    ref('calweek', /Standard Training - Calendaring Activity/, 60, '📅 Standard Training - Calendaring Activity');
    ref('calendar', new RegExp(scn.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 70, '📅 the Calendar Sim\'s week');
    ref('calendar', /Google Calendar Sim/, 80, '📅 the connected Google Calendar Sim');
    // 🏷 the drills: 📎, the best round of each set
    [[/Intake Packet/, 80], [/LORs/, 90], [/MedLOR/, 70], [/Lien Balance/, 100]].forEach(([re, p]) => ref('drills', re, p, `🏷 the ${re.source} drill`));
    // 📦 the Intake Worksheet: scored under 📋, once (not again under 🧑‍🏫 With your trainer)
    scored('drive', /Intake Worksheet/, 85, '📄 the Intake Worksheet');
    once(/Intake Worksheet/, 'drive', 'the Intake Worksheet');
    // 🎧 the Transcription Activity's automatic score: 📎, until the trainer scores it
    ref('trainer', /Transcription: Recording 1/, 72, '🎧 the Transcription Activity, Recording 1');
    // 📘 the Process Guide: on no Score Card (its review is feedback only)
    { const w = where(/Process Guide|Saving the Intake Packet/); if (w.length) fail(`the Process Guide is on the Score Card: ${w.join(', ')}`); }
    // 📄 the LOR Drafting Activity, from the Portal: 📎 under 🧰 Portal simulators
    ref('portalsims', /Drafting — LOR/, 88, '📄 the LOR Drafting Activity (on the Portal)');

    // 🏅 the trainee's own My Performance, drawn: the same, with 📎 where not scored and no 🟢 Practice Sessions card
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    await page.evaluate(() => goto('scorecard'));
    await page.waitForFunction(() => document.querySelectorAll('.sc-src').length > 3, null, { timeout: 20000 }).catch(() => fail('🏅 My Performance never finished loading'));
    await page.waitForTimeout(1500);
    const cards = await page.evaluate(() => [...document.querySelectorAll('.sc-src')].map(c => ({ h: c.querySelector('.sc-src-h').innerText, rows: [...c.querySelectorAll('tr')].map(r => r.innerText.replace(/\s+/g, ' ')) })));
    const row = (card, re) => { const c = cards.find(x => card.test(x.h)); return c ? c.rows.find(r => re.test(r)) || '' : null; };
    const shows = (card, re, val, what) => { const r = row(card, re); if (r == null) fail(`My Performance has no ${card.source} card (for ${what})`); else if (!r || !val.test(r)) fail(`My Performance doesn't show ${what} as ${val.source}: ${r || '(no row)'}`); };
    shows(/Call Listening/, /Reception calls/, /100%|5\.0\/5/, '🎧 Reception calls');
    shows(/Call Listening/, /Intake calls/, /50%|2\.5\/5/, '🎧 Intake calls');
    shows(/Call Listening/, /Reception Listening Activity/, /80%|4\.0\/5/, '🎧 the Reception Listening Activity');
    shows(/Task Tracker/, /Intake Worksheet/, /85%|4\.3\/5|4\.25\/5/, '📄 the Intake Worksheet');
    shows(/Calendar checks/, /Booking rules · Practice calls/, /📎/, '📅 the Booking Rule Check');
    shows(/Calendar checks/, /Attorney Calendar Management Activity/, /📎/, '🗓 the Calendar Activity Check');
    shows(/Calendaring Activity/, /Standard Training - Calendaring Activity/, /📎/, '📅 Standard Training - Calendaring Activity');
    shows(/Calendaring Sims/, /Google Calendar Sim/, /📎/, '📅 the Google Calendar Sim');
    shows(/Naming & Reporting Drills/, /Intake Packet/, /📎/, '🏷 the Intake Packet drill');
    shows(/With your trainer/, /Transcription: Recording 1/, /📎/, '🎧 the Transcription Activity');
    shows(/Portal simulators/, /Drafting — LOR/, /📎/, '📄 the LOR Drafting Activity');
    if (cards.some(c => /Practice Sessions/.test(c.h))) fail('My Performance has a 🟢 Practice Sessions card (practice, hidden)');
    if (cards.some(c => c.rows.some(r => /Provider communication calls/.test(r)))) fail('My Performance shows Day 13\'s sample provider calls');
    if (cards.some(c => c.rows.some(r => /Process Guide/.test(r)))) fail('My Performance shows the Process Guide');

    // 📋 the trainer's Batch Sheet: the same grades, on their days — Day 3's Reception Listening Activity, Day 8's Intake
    // Worksheet — and Day 11's LOR Drafting Activity done, from the Portal's result
    await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(800);
    await page.evaluate(b => { FTBatchSheet.batch(b); FTBatchSheet.refresh(); }, BATCH);
    await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 25000 }).catch(() => fail('the Batch Sheet never finished loading'));
    await page.waitForTimeout(500);
    const bs = await page.evaluate(() => { const T = id => FTBatchSheet.tables().find(t => t.id === id), me = t => t && t.rows.find(r => /Lab Scorer|Scorer/.test(r[0].v));
      const pick = (t, h) => { const r = me(t); return r && t.head.indexOf(h) >= 0 ? r[t.head.indexOf(h)] : null; };
      const ds = T('dayscores'), days = T('days');
      return { ds3: pick(ds, 'Day 3'), ds8: pick(ds, 'Day 8'), d11: pick(days, 'Day 11'), heads: ds ? ds.head : [] }; });
    if (!bs.ds3 || !/Reception Listening Activity/.test(bs.ds3.f || '') || !/80%/.test((bs.ds3.f || '') + (bs.ds3.v || ''))) fail(`Day 3 on 📅 Day 1–16 doesn't score the Reception Listening Activity: ${JSON.stringify(bs.ds3)}`);
    if (!bs.ds8 || !/Intake Worksheet/.test(bs.ds8.f || '') || !/85%/.test((bs.ds8.f || '') + (bs.ds8.v || ''))) fail(`Day 8 on 📅 Day 1–16 doesn't score the Intake Worksheet: ${JSON.stringify(bs.ds8)}`);
    { const lor = await page.evaluate(() => FTBatchSheet.autoDone({ sims: { best: { 'Drafting — LOR': { score: 88, count: 2 } } }, src: {}, data: {} }, {}, { at: 'tool', id: 'lor' }, {}));
      if (!lor || !lor.done || !/Training Portal/.test(lor.how)) fail(`Day 11's LOR Drafting Activity, done on the Portal, isn't done on the Batch Sheet: ${JSON.stringify(lor)}`); }
    if (!bs.d11 || !/done/.test(String(bs.d11.f || '')) || /Still to do:[^]*LOR Drafting/.test(String(bs.d11.f || ''))) fail(`Day 11 on 📅 Day by Day doesn't count the LOR Drafting Activity done on the Portal: ${JSON.stringify(bs.d11)}`);
    // (📦 the Intake Worksheet handed in on the platform and not graded yet is done on Day 8, waiting for the trainer's grade)
    { const W = { t: 'Intake Worksheet', at: 'drive', assess: 'intakews' };
      const ws = await page.evaluate(W => [FTBatchSheet.autoDone({ actsub: { items: { intakews: { answers: ['x'], answer: 'platform', submittedAt: '2026-11-24T15:00:00Z' } } }, src: {}, data: {} }, {}, W, {}),
        FTBatchSheet.autoDone({ actsub: { items: {} }, src: {}, data: {} }, {}, W, {})], W);
      if (!ws[0] || !ws[0].done || ws[1]) fail(`Day 8's Intake Worksheet, handed in on the platform, isn't done on the Batch Sheet until graded (or is, with nothing handed in): ${JSON.stringify(ws)}`); }
    // 🔎 Grades in detail: each grading system with its items, the scored ones scored
    await page.evaluate(id => { FTBatchSheet.view('tables'); FTBatchSheet.more(true); render(); FTBatchSheet.grWho(id); }, id); await page.waitForTimeout(600);
    const gd = await page.evaluate(() => [...document.querySelectorAll('#bs-scores .bs-day')].map(b => ({ h: b.querySelector('.bs-day-h').innerText, t: b.innerText })));
    const block = re => gd.find(b => re.test(b.h)) || null;
    if (!block(/Call Listening/) || !/Reception Listening Activity/.test(block(/Call Listening/).t) || !/Intake calls/.test(block(/Call Listening/).t)) fail(`🔎 Grades in detail: 🎧 Call Listening doesn't hold her logs and the activity: ${gd.map(b => b.h).join(' | ')}`);
    if (!block(/Task Tracker/) || !/Intake Worksheet/.test(block(/Task Tracker/).t)) fail(`🔎 Grades in detail: the Intake Worksheet isn't under 📋: ${gd.map(b => b.h).join(' | ')}`);
    if (gd.some(b => /Practice Sessions/.test(b.h))) fail('🔎 Grades in detail has a 🟢 Practice Sessions block');
  } catch (e) { fail('threw: ' + (e && e.stack || e)); }
  await browser.close();
  if (failures.length) { console.error('Practice Lab Score Card test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Practice Lab Score Card test passed (every Practice Lab hand-in on the trainee\'s Score Card in its grading system: Call Listening and the Reception Listening Activity scored, the Intake Worksheet scored under 📋 once, its answers kept; the Practice Sessions hidden; the calendaring checks, drills, transcription\'s automatic score and the Portal\'s LOR result 📎; Day 13\'s samples and the Process Guides off it; the Batch Sheet\'s Days 3, 8 and 11 follow, the Intake Worksheet done once handed in, the LOR once drafted on the Portal).');
})();
