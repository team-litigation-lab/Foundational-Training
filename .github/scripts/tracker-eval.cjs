// 🗂 The Daily Task Tracker checked the way the trainer's sample evaluation does it (js/ft-tracker-rules.js RULES, weekEval,
// evalHtml/evalText; worker.js trackerWeekEval and /api/tracker/week-eval):
//   - a task marked Completed but left under ⬇ FOR COMPLETION ⬇ is named; so is a completed task without its Actual Completion
//     Date, a row under ⬇ COMPLETED ⬇ without its Date Received / Type of Task / Status, the template's sample row (11/16/2022),
//     a task without a Type of Task, and a day whose recurring Typing (AM and PM) or Spelling Test isn't recorded;
//   - a clean tracker passes them all;
//   - the week's evaluation has the sample's seven metrics, its overall their average with the sample's label, its sections
//     (Feedback Summary, Strengths, Areas Requiring Correction with the field example, Recommendations, Final Assessment);
//   - the Worker writes it into trackerreview:<id>.weekEval[<week>] for a trainer (with the AI's ratings, or the rules' own
//     without the AI), a trainee can't ask for it, and the day's tracker AI grade uses the seven metrics.
// Usage: node .github/scripts/tracker-eval.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const fails = []; const ck = (ok, t) => { if (!ok) fails.push(t); };
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const TR = globalThis.FTTrackerRules;
  // the sample's problems: the sample row kept, the Nov 2–3 entries Completed under For Completion with no completion date,
  // summaries under Completed with no fields, Typing (AM and PM) and Spelling recorded each day but Nov 5's PM test
  const csv = ['Date Received,Type of Task,Task Details,Accountable VA,11/02/2026,11/03/2026,11/04/2026,11/05/2026,11/06/2026,VA Notes,Deadline,Status,Actual Completion Date',
    '⬇ FOR COMPLETION ⬇,,,,,,,,,,,,',
    '11/16/2022,CALLER,Caller followed up regarding medical records,Dee,,,,,,,ASAP,Completed,',
    '11/02/2026,LSH-TRAINING,VA Essentials,Dee,"Learned the court system and the documents in a PI case; I will use it when organizing records",,,,,,ASAP,Completed,',
    '11/03/2026,LSH-TRAINING,Law Firm Communication,Dee,,"Insurance terms, policy limits; verify authorization before discussing a case",,,,,ASAP,Completed,',
    '11/06/2026,LSH-TRAINING,Calendar Management,Dee,,,,,"Color coding, time blocking, reminders",,ASAP,Ongoing,',
    '⬇ RECURRING ⬇,,,,,,,,,,,,',
    ',LSH-TRAINING,Typing Test,Dee,AM 41 wpm / PM 44 wpm,AM 42 / PM 45,AM done PM done,AM 43,AM/PM done,,,Ongoing,',
    ',LSH-TRAINING,Spelling Test,Dee,Done,Done,Done,Done,Done,,,Ongoing,',
    '⬇ COMPLETED ⬇,,,,,,,,,,,,',
    ',,VA Essentials summary,Dee,,,,,,"Summary of the lesson",,,'].join('\n');
  const t = TR.fromSheetCsv(csv, { today: '2026-11-06', startDate: '2026-11-02' });
  ck(t && t.tracker.rows.length === 7, `the fixture wasn't read: ${JSON.stringify(t && t.tracker.rows.map(r => [r.section, r.details]))}`);
  const r6 = TR.checkDay(t, '2026-11-06'), rule = (r, id) => r.rules.find(x => x.id === id) || {};
  const place = rule(r6, 'section-placement'), cd = rule(r6, 'completion-date'), cf = rule(r6, 'completed-fields'), sm = rule(r6, 'sample-row'), tt = rule(r6, 'task-type');
  ck(!place.pass && /VA Essentials" \(11\/02\/2026\)/.test(place.detail) && /Law Firm Communication/.test(place.detail) && /FOR COMPLETION/.test(place.detail) && !/Caller followed up/.test(place.detail), `Completed tasks under For Completion aren't named: ${JSON.stringify(place)}`);
  ck(!cd.pass && /no Actual Completion Date/.test(cd.detail) && /VA Essentials/.test(cd.detail) && /e\.g\. 11\/02\/2026/.test(cd.detail), `completed tasks without a completion date aren't named: ${JSON.stringify(cd)}`);
  ck(!cf.pass && /VA Essentials summary" — no Date Received, Type of Task, Status/.test(cf.detail), `a Completed-section row's missing fields aren't named: ${JSON.stringify(cf)}`);
  ck(!sm.pass && sm.pct === 0 && /11\/16\/2022/.test(sm.detail) && /delete/.test(sm.detail), `the template's sample row isn't flagged: ${JSON.stringify(sm)}`);
  ck(!tt.pass && /VA Essentials summary/.test(tt.detail) && /LSH-TRAINING/.test(tt.detail), `a task without a Type of Task isn't named: ${JSON.stringify(tt)}`);
  ck(rule(r6, 'recurring-tests').pass, `Nov 6's recurring tests aren't read: ${JSON.stringify(rule(r6, 'recurring-tests'))}`);
  const r5 = rule(TR.checkDay(t, '2026-11-05'), 'recurring-tests');
  ck(!r5.pass && r5.pct === 75 && /PM Typing Test/.test(r5.detail), `Nov 5's missing PM typing test isn't found: ${JSON.stringify(r5)}`);
  ck(r6.flags.some(f => f.col === 'completedOn') && r6.flags.some(f => f.col === 'status'), 'the rows aren\'t flagged in their cells (the platform tracker\'s live flags)');
  // (a row received after the day isn't held against it)
  ck(!/Calendar Management/.test(rule(TR.checkDay(t, '2026-11-03'), 'task-type').detail || ''), 'a later row was checked on an earlier day');
  // a clean tracker passes them all
  const clean = ['Date Received,Type of Task,Task Details,Accountable VA,11/02/2026,VA Notes,Status,Actual Completion Date', '⬇ FOR COMPLETION ⬇,,,,,,,',
    '11/02/2026,LSH-TRAINING,Calendar Activity,Dee,Started the scheduling exercise,,Ongoing,', '⬇ RECURRING ⬇,,,,,,,', ',LSH-TRAINING,Typing Test,Dee,AM 40 PM 42,,Ongoing,', ',LSH-TRAINING,Spelling Test,Dee,Done,,Ongoing,',
    '⬇ COMPLETED ⬇,,,,,,,', '11/02/2026,LSH-TRAINING,VA Essentials,Dee,Done,,Completed,11/02/2026'].join('\n');
  const c = TR.checkDay(TR.fromSheetCsv(clean, { today: '2026-11-02' }), '2026-11-02');
  ['section-placement', 'completion-date', 'completed-fields', 'sample-row', 'recurring-tests', 'task-type'].forEach(id => ck(rule(c, id).pass === true, `a clean tracker fails ${id}: ${JSON.stringify(rule(c, id))}`));
  // the week's evaluation from the rules alone
  const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
  const ev = TR.weekEval(t, days, { expected: { '2026-11-02': ['Process Questions', 'Digital Handouts for Breakout Session (Group Activity)'] } });
  const keys = TR.TRACKER_METRICS.map(([k]) => k);
  ck(keys.length === 7 && keys.every(k => ev.metrics[k] && typeof ev.metrics[k].rating === 'number' && ev.metrics[k].rating >= 0 && ev.metrics[k].rating <= 5 && ev.metrics[k].comment), `not the seven metrics, each rated with a comment: ${JSON.stringify(ev.metrics)}`);
  ck(Math.abs(ev.overall - Math.round(10 * keys.reduce((a, k) => a + ev.metrics[k].rating, 0) / 7) / 10) < 1e-9 && ev.label === TR.evalLabel(ev.overall), `the overall isn't the metrics' average: ${ev.overall} ${ev.label}`);
  ck(TR.evalLabel(3.6) === 'Good, with Improvements Needed', `3.6 reads "${TR.evalLabel(3.6)}"`);
  ck(ev.coverage === 'November 2–6, 2026' && TR.coverage('2026-10-30', '2026-11-03') === 'October 30 – November 3, 2026', `the coverage line: ${ev.coverage}`);
  const titles = ev.corrections.map(x => x.title);
  ['Remove the Original Sample Entry', 'Move Completed Tasks to the Correct Section', 'Complete the Actual Completion Date Column', 'Make Each Day\'s Expected Activities Identifiable'].forEach(x => ck(titles.includes(x), `"${x}" isn't among the corrections: ${titles.join(' | ')}`));
  ck(ev.corrections.some(x => x.example === 'Date Received: 11/02/2026\nType of Task: LSH-TRAINING\nStatus: Completed\nActual Completion Date: 11/02/2026'), 'the completion-date correction has no field example');
  ck(ev.strengths.some(x => /Recurring/.test(x.title)) === false && ev.corrections.some(x => /Recurring/.test(x.title)), 'Nov 5\'s missing PM test isn\'t a correction');
  ck(ev.metrics.organization.rating < 3 && /FOR COMPLETION/.test(ev.metrics.organization.comment), `organization isn't marked down for the placement: ${JSON.stringify(ev.metrics.organization)}`);
  const html = TR.evalHtml(ev, { name: 'Dee' }), text = TR.evalText(ev, { name: 'Dee' });
  ['Daily Task Tracker Evaluation', 'Coverage:', 'Evaluation Metric', '1. Tracker Organization &amp; Correct Section Placement', 'Feedback Summary', 'Strengths', 'Areas Requiring Correction', 'Recommendations:', 'Final Assessment:', 'Overall Performance Rating: ' + ev.overall.toFixed(1) + ' / 5 – ', 'no AI review']
    .forEach(x => ck(html.includes(x), `the report has no "${x}"`));
  ck(/Activity → What I Did → What I Learned → Mistakes\/Feedback → Correct Procedure → Future Application/.test(text) && /^Trainee: Dee/.test(text) && /\| \d\.\d\/5 \|/.test(text), 'the text report isn\'t in the sample\'s layout');
  ck(!TR.evalHtml({ metrics: {}, summary: ['<script>x</script>'], strengths: [], corrections: [], days }).includes('<script>x'), 'the report doesn\'t escape what it shows');

  // the Worker: a trainer's 🔄 writes the week's evaluation (the AI's, then the rules' without it); a trainee can't ask for it
  const store = new Map(), id = 'dee-eval--b110226';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Dee Eval', batch: 'B110226', approved: true }));
  store.set('ft:drive:' + id, JSON.stringify({ tracker: 'https://docs.google.com/spreadsheets/d/' + 'a'.repeat(30) + '/edit', days: {} }));
  let calls = 0, prompt = '';
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://docs.google.com/spreadsheets/')) return new Response(csv, { status: 200 });
    if (u.startsWith('https://api.anthropic.com/')) {
      calls++; const body = JSON.parse(init.body); prompt = body.messages.map(m => typeof m.content === 'string' ? m.content : '').join('\n');
      const metrics = Object.fromEntries(keys.map((k, i) => [k, { rating: [2.5, 3, 3.5, 4.5, 4, 4, 3.5][i], comment: 'Comment on ' + k + '.' }]));
      const text = JSON.stringify({ metrics, summary: ['Your tracker shows good understanding.'], strengths: [{ title: 'Detailed VA Essentials Documentation', points: ['Your November 3 entry…'] }],
        corrections: [{ title: 'Remove the Original Sample Entry', points: ['Delete the 11/16/2022 row.'] }, { title: 'Complete the Actual Completion Date Column', points: ['Fill it in.'], example: 'Date Received: 11/03/2026\nType of Task: LSH-TRAINING\nStatus: Completed\nActual Completion Date: 11/03/2026' }],
        recommendations: ['Use the structure.'], final: ['A reliable work record.'] });
      return new Response(JSON.stringify({ content: [{ type: 'text', text }], model: 'm', stop_reason: 'end_turn' }));
    }
    return new Response('not found', { status: 404 });
  };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  env.ANTHROPIC_API_KEY = 'ci-key';
  { const r = (await call('/api/tracker/week-eval', { id, week: 1 }, admin)).body || {}, w = ((JSON.parse(store.get('ft:trackerreview:' + id) || '{}').weekEval) || {})[1];
    ck(r.ok && w && w.ai === true && w.overall === 3.6 && w.label === 'Good, with Improvements Needed' && w.metrics.organization.rating === 2.5, `the AI's week evaluation isn't kept (3.6 / 5 – Good, with Improvements Needed): ${JSON.stringify(r).slice(0, 400)}`);
    ck(w && JSON.stringify(w.range) === '["2026-11-02","2026-11-08"]' && w.days.join() === days.join(), `not the platform's Week 1: ${JSON.stringify(w && [w.range, w.days])}`);
    ck(/11\/16\/2022/.test(prompt) && /Tracker Organization & Correct Section Placement/.test(prompt) && /Process Questions/.test(prompt) && /MISS Sample row/.test(prompt), 'the AI wasn\'t given the tracker, the rules\' findings, the metrics and the expected activities');
    ck(calls === 1, `${calls} AI requests for one week`); }
  // (asked again with the same tracker, a trainer's 🔄 writes it again; the nightly run doesn't on the same day)
  delete env.ANTHROPIC_API_KEY;
  { const r = (await call('/api/tracker/week-eval', { id, week: 1 }, admin)).body || {}, w = JSON.parse(store.get('ft:trackerreview:' + id)).weekEval[1];
    ck(r.ok && w.ai === false && keys.every(k => typeof w.metrics[k].rating === 'number') && w.corrections.length, `without the AI the rules' evaluation isn't kept: ${JSON.stringify(r).slice(0, 300)}`); }
  { const tr = (await call('/api/auth/trainee', { name: 'Dee Eval', batch: 'B110226' })).body || {};
    const st = (await call('/api/tracker/week-eval', { id, week: 1 }, tr.token)).status; ck(st === 403 || st === 401, `a trainee asked for the evaluation (${st})`); }
  // the day's tracker AI grade is on the seven metrics
  env.ANTHROPIC_API_KEY = 'ci-key';
  let sys = '';
  globalThis.fetch = async (url, init = {}) => { const body = JSON.parse(init.body || '{}'); sys = body.messages ? body.messages.map(m => m.content).join('\n') : '';
    const scores = Object.fromEntries(keys.map(k => [k, 4])); return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ scores, why: { organization: 'Why.' }, aiLikely: false, flags: [], feedback: 'Ok.' }) }], model: 'm', stop_reason: 'end_turn' })); };
  { const D = '2026-11-04', rv = JSON.parse(store.get('ft:trackerreview:' + id)); rv.days = { [D]: { date: D, pct: 50, rules: [], excerpt: '- LSH-TRAINING | Reception | status: Ongoing', source: 'drive' } }; store.set('ft:trackerreview:' + id, JSON.stringify(rv));
    await call('/api/eod/grade', { id, date: D, score: 80 }, admin);
    const c = JSON.parse(store.get('ft:trackerreview:' + id)).compliance[D] || {};
    ck(c.trackerAi && keys.every(k => c.trackerAi.crit[k] === 4) && c.parts.tracker === 80 && c.trackerAi.why.organization === 'Why.', `the day's tracker grade isn't on the seven metrics: ${JSON.stringify(c.trackerAi)}`);
    ck(/Classroom Discussion on PI Workflow/.test(sys) && /Spelling Test \(recurring\)/.test(sys), 'the day\'s expected activities (Day 3) weren\'t given to the grade'); }
  if (fails.length) { console.error('Tracker evaluation test FAILED:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('Tracker evaluation test passed (the sample evaluation\'s checks name the rows: Completed under For Completion, no Actual Completion Date, Completed-section fields, the 11/16/2022 sample row, the Type of Task, the recurring tests; the week\'s evaluation on the seven metrics in the sample\'s layout, by the AI or from the rules; the day\'s tracker grade on the seven metrics).');
})().catch((e) => { console.error('Tracker evaluation test FAILED:', e && e.stack || e); process.exit(1); });
