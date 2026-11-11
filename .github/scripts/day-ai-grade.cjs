// 🤖 The day's own Task Tracker and Monitoring Sheet input graded by the AI (worker.js aiDayGrade, in dailyCompliance):
//   - the tracker's part is the grade of the rows for that day (compliance, completeness & accuracy, personal input,
//     effort, attention to detail, professionalism — each out of 5 — as a %), and so is the Monitoring Sheet entry's;
//   - only that day's input goes to the AI, never the whole sheet;
//   - an entry graded once isn't graded again until it changes;
//   - without the AI, the checks' score stands;
//   - the dates a trainee writes in other ways are still read (FTTrackerRules.isoDate).
// Usage: node .github/scripts/day-ai-grade.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const TR = globalThis.FTTrackerRules;
  for (const [v, want] of [['Fri, 10/30/2026', '2026-10-30'], ['10/30/26 (Fri)', '2026-10-30'], ['10.30.26', '2026-10-30'], ['30-Oct', '2026-10-30'], ['October 30, 2026', '2026-10-30'], ['2026-10-30', '2026-10-30']])
    if (TR.isoDate(v, '2026') !== want) fail(`the date "${v}" reads as "${TR.isoDate(v, '2026')}", not ${want}`);
  // (a tracker kept as a log: the day's tasks entered as rows dated that day, no Daily Notes column for it, is updated)
  { const t = { tracker: { noteDates: [], rows: [TR.taskRow('completion', { dateReceived: '2026-11-03', type: 'LSH-TRAINING', details: 'Reception mock call prep' })] } };
    // (the Daily Notes rule: the tracker's other rules — the recurring tests and the rest, tracker-eval.cjs — check other things)
    const r = TR.checkDay(t, '2026-11-03'), dn = r.rules.find(x => x.id === 'daily-notes'); if (!dn || dn.pct !== 100) fail(`a task entered for the day doesn't count as updating the tracker: ${JSON.stringify(r.rules)}`);
    if (!/Reception mock call prep/.test(TR.dayExcerpt(t, '2026-11-03')) || TR.dayExcerpt(t, '2026-11-04')) fail('the day\'s excerpt isn\'t only that day\'s rows'); }

  const store = new Map(), id = 'dee-grade--b110226', D = '2026-11-04';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Dee Grade', batch: 'B110226', approved: true }));
  store.set('ft:drive:' + id, JSON.stringify({ tracker: 'https://docs.google.com/spreadsheets/d/' + 'a'.repeat(30) + '/edit', monitor: 'https://docs.google.com/document/d/' + 'b'.repeat(30) + '/edit', days: {} }));
  const excerpt = '- LSH-TRAINING | Reception Training Day 2 | status: Ongoing\n  Daily Note: Practiced the call flow with Mara; took 3 mock calls, missed the callback number once — will repeat the verification step tomorrow.';
  const entry = { topic: 'Reception Training Day 2', date: D, pct: 75, takeaways: 5, questions: 1, text: 'Date: 11/04/2026\nTakeaways\n1. Verify the caller before giving any detail\n2. ...', checks: [{ label: 'Date', ok: true }, { label: '5 takeaways', ok: true }, { label: 'Questions', ok: true }, { label: 'Understanding rated', ok: false }] };
  const rv = () => ({ days: { [D]: { date: D, pct: 50, rules: [{ id: 'daily-notes', label: 'Daily Notes filled in', pass: false, pct: 50, detail: '1 of 2' }], excerpt, source: 'drive' } },
    monitor: { entries: [entry, { topic: 'Reception Training Day 3', date: '2026-11-05', pct: 100, text: 'SHOULD NOT BE SENT', checks: [] }], checkedAt: D + 'T20:00:00Z' } });
  store.set('ft:trackerreview:' + id, JSON.stringify(rv()));

  let calls = 0; const prompts = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      calls++; const body = JSON.parse(init.body), prompt = body.messages.map(m => typeof m.content === 'string' ? m.content : '').join('\n'); prompts.push(prompt);
      const tracker = /Daily Task Tracker/.test(body.system || '');
      // (🗂 the tracker on the trainer's sample evaluation's seven metrics, 28/35 = 80; the Monitoring Sheet on the six criteria)
      const scores = tracker ? { organization: 4, status: 4, accuracy: 3, takeaways: 5, application: 4, memory: 4, instructions: 4 } : { compliance: 3, completeness: 3, personal: 1, effort: 2, detail: 3, professionalism: 4 };
      const why = Object.fromEntries(Object.keys(scores).map(k => [k, 'Reason for ' + k + '.']));
      const text = JSON.stringify({ scores, why, aiLikely: !tracker, flags: tracker ? [] : ['Generic takeaways'], feedback: tracker ? 'Specific notes.' : 'Write your own takeaways.' });
      return new Response(JSON.stringify({ content: [{ type: 'text', text }], model: 'm', stop_reason: 'end_turn' }));
    }
    return new Response('not found', { status: 404 });
  };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const day = () => (JSON.parse(store.get('ft:trackerreview:' + id)).compliance || {})[D] || {};

  // 1. with the AI: each sheet's part is its grade of the day's input
  env.ANTHROPIC_API_KEY = 'ci-key';
  await call('/api/eod/grade', { id, date: D, score: 80 }, admin);
  { const c = day(), P = c.parts || {};
    if (P.tracker !== 80) fail(`the tracker's part isn't the AI grade of the day's rows (28/35 = 80): ${P.tracker} ${JSON.stringify(c.trackerAi)}`);
    if (P.monitor !== 53) fail(`the Monitoring Sheet's part isn't the AI grade of the day's entry (16/30 = 53): ${P.monitor} ${JSON.stringify(c.monitorAi)}`);
    if (!c.monitorAi || !c.monitorAi.aiLikely || !c.trackerAi || c.trackerAi.aiLikely) fail(`the AI-generated flag isn't kept: ${JSON.stringify([c.trackerAi, c.monitorAi])}`);
    if (calls !== 2) fail(`${calls} AI requests for one day's two sheets`);
    // (📝 each criterion's reason kept, for the score's rationale on the trainee's page)
    if (!c.trackerAi || !c.trackerAi.why || c.trackerAi.why.accuracy !== 'Reason for accuracy.') fail(`each criterion's reason isn't kept with the grade: ${JSON.stringify(c.trackerAi && c.trackerAi.why)}`);
    if (prompts.some(p => /SHOULD NOT BE SENT/.test(p))) fail('another day\'s entry went to the AI');
    if (!prompts.some(p => /missed the callback number once/.test(p))) fail('the day\'s tracker rows didn\'t go to the AI'); }
  // 2. the same entries aren't graded again
  await call('/api/eod/grade', { id, date: D, score: 90 }, admin);
  if (calls !== 2) fail(`the same day's entries were graded again (${calls} AI requests)`);
  // 3. a changed entry is
  { const r = JSON.parse(store.get('ft:trackerreview:' + id)); r.days[D].excerpt += '\n- ADMIN | Filed the call log | status: Completed'; store.set('ft:trackerreview:' + id, JSON.stringify(r)); }
  await call('/api/eod/grade', { id, date: D, score: 90 }, admin);
  if (calls !== 3) fail(`a changed tracker day wasn't graded again (${calls} AI requests)`);
  // 4. without the AI: the checks' score stands
  delete env.ANTHROPIC_API_KEY;
  store.set('ft:trackerreview:' + id, JSON.stringify(rv()));
  await call('/api/eod/grade', { id, date: D, score: 80 }, admin);
  { const P = day().parts || {}; if (P.tracker !== 50 || P.monitor !== 75) fail(`without the AI the checks' scores don't stand: ${JSON.stringify(P)}`); }

  // 5. 🔎 what was read: trainers only; the day's saved parts come back (the sheets themselves can't be fetched here: each says why)
  { const r = (await call('/api/drive/read-check', { id, date: D }, admin)).body || {};
    if (!r.ok || !r.saved || !r.saved.parts || !r.tracker || !r.tracker.error || !r.monitor || !r.monitor.error || !r.eod || !r.process || !Array.isArray(r.process.sheets)) fail(`the read check didn't answer with the day and why each sheet couldn't be read: ${JSON.stringify(r).slice(0, 300)}`);
    if ((await call('/api/drive/read-check', { id, date: D })).status !== 401 && (await call('/api/drive/read-check', { id, date: D })).status !== 403) fail('the read check answered without a trainer\'s sign-in'); }
  // 6. ✅ today's compliance worked out again on a trainer's ask (the Batch Sheet opening): trainers only
  { const r = (await call('/api/compliance/today', { ids: [id] }, admin)).body || {};
    if (!r.ok) fail(`today's compliance wasn't worked out again: ${JSON.stringify(r)}`);
    if ((await call('/api/compliance/today', { ids: [id] })).status < 400) fail('a request without a trainer\'s sign-in worked out today\'s compliance'); }
  if (failures.length) { console.error('Day AI grade test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Day AI grade test passed (each day\'s Task Tracker rows graded on the trainer\'s seven tracker metrics and its Monitoring Sheet entry on compliance, completeness & accuracy, personal input, effort, attention to detail and professionalism; only that day\'s input sent; graded once until it changes; the checks\' score without the AI; dates written other ways read).');
})().catch((e) => { console.error('Day AI grade test FAILED:', e && e.stack || e); process.exit(1); });
