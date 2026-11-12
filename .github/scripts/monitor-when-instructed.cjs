// 📒 The Monitoring Sheet is due only on a day the slides explicitly ask for an update, once its topic is covered
// (FTTrackerRules.MONITOR_SCHEDULE; the trainers: "not expected to be checked daily"):
//   - a training day with no instruction: parts.monitor null — not expected, not counted, no AI grade — even with an entry dated then;
//   - an instructed day without its entry: 0; with it: the entry's own check (date, 5 takeaways, questions, understanding);
//   - a day kept from before (scored every day) has its Monitoring Sheet taken out and its % worked out again: by the Worker
//     on the next check, and by index.html ftDay1.comp where the browser reads it.
// Usage: node .github/scripts/monitor-when-instructed.cjs   (no browser, no network)
const path = require('path'), fs = require('fs'), vm = require('vm'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
// (the clock held at 2026-11-20, so the batch's Days 11 and 13 — 11/16 and 11/18, days the slides ask for no update — are over)
{ const RealDate = Date, NOW = RealDate.parse('2026-11-20T20:00:00Z');
  globalThis.Date = class extends RealDate { constructor(...a){ if(a.length) super(...a); else super(NOW); } static now(){ return NOW; } }; }
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const TR = globalThis.FTTrackerRules;
  // the schedule: Day 3's item #12, Day 4's items #10–11; nothing on Day 11 or Day 13 (Days 5, 6, 9, 12, 16, 18: a topic just covered)
  { const st = '2026-11-02';
    if (!TR.monitorDueOn(st, '2026-11-04') || TR.monitorDueOn(st, '2026-11-04').items.join() !== '12') fail(`Day 3 doesn't ask for item #12: ${JSON.stringify(TR.monitorDueOn(st, '2026-11-04'))}`);
    if (!TR.monitorDueOn(st, '2026-11-05') || TR.monitorDueOn(st, '2026-11-05').items.join() !== '10,11') fail('Day 4 doesn\'t ask for items #10–11');
    // (and after each topic is covered: Reception on Day 5, Calendar Management on Day 6, Intake on Day 9)
    if (!TR.monitorDueOn(st, '2026-11-06') || TR.monitorDueOn(st, '2026-11-06').topic !== TR.MONITOR_TOPICS[4] || !TR.monitorDueOn(st, '2026-11-09') || !TR.monitorDueOn(st, '2026-11-12')) fail('a day a topic is covered (Days 5, 6, 9) asks for no update');
    // (Days 7 and 10, mid-topic: the Breakout handouts no longer ask for an update)
    if (TR.monitorDueOn(st, '2026-11-10') || TR.monitorDueOn(st, '2026-11-13') || /Breakout/.test(JSON.stringify(TR.MONITOR_SCHEDULE))) fail('a Breakout day (Day 7 or 10) still asks for a Monitoring Sheet update before its topic is done');
    if (!TR.MONITOR_SCHEDULE[18] || !TR.MONITOR_SCHEDULE[18].optional) fail('the optional Lien Negotiator topic isn\'t optional');
    if (TR.monitorDueOn(st, '2026-11-16') || TR.monitorDueOn(st, '2026-11-18') || TR.monitorDueOn('', '2026-11-04') || TR.monitorDueOn(st, '2026-10-30')) fail('a day the slides ask for no update (or before the batch, or with no start) is due');
    if (Object.values(TR.MONITOR_SCHEDULE).some((x) => !x.topic || !x.what || !x.where || x.on > Number(Object.keys(TR.MONITOR_SCHEDULE).find((k) => TR.MONITOR_SCHEDULE[k] === x)))) fail('a schedule entry lacks its topic, instruction or source, or is due before its topic is covered'); }

  const store = new Map(), id = 'mia-mon--b110226';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Mia Mon', batch: 'B110226', approved: true }));
  store.set('ft:drive:' + id, JSON.stringify({ monitor: 'https://docs.google.com/document/d/' + 'm'.repeat(30) + '/edit', days: {} }));
  const entry = (topic, date, pct) => ({ topic, date, pct, takeaways: 5, questions: 1, text: 'Date: ' + date + '\n1. something learned that day', checks: [{ label: 'Date', ok: true }] });
  // (Day 3, 11/04: Reception Day 1's entry; Day 11, 11/16: an entry written on a day nothing was asked; none for Day 4, 11/05)
  // (11/18, Day 13: a day kept from before, its Monitoring Sheet scored 0 then, and the day's % with it)
  store.set('ft:trackerreview:' + id, JSON.stringify({ days: {}, monitor: { entries: [entry(TR.MONITOR_TOPICS[2], '2026-11-04', 75), entry(TR.MONITOR_TOPICS[4], '2026-11-16', 100)], checkedAt: '2026-11-16T20:00:00Z' },
    compliance: { '2026-11-18': { v: 2, pct: 63, parts: { monitor: 0, tests: 100, eod: 50, instructions: 100 }, instr: { v: 2, pct: 100, links: [] }, final: true } } }));
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const day = (D) => (JSON.parse(store.get('ft:trackerreview:' + id)).compliance || {})[D] || {};
  env.ANTHROPIC_API_KEY = 'ci-key';
  let ai = 0; globalThis.fetch = async (u) => { if (String(u).startsWith('https://api.anthropic.com/')) ai++; return new Response('not found', { status: 404 }); };
  // (✍ a trainer's EOD score works the day out: worker.js dailyCompliance)
  await call('/api/eod/grade', { id, date: '2026-11-16', score: 80 }, admin);
  { const c = day('2026-11-16'), P = c.parts || {};
    if (!('monitor' in P) || P.monitor !== null || c.monitorAi || c.monDue || ai) fail(`a day the slides asked for no update counts the Monitoring Sheet: ${JSON.stringify({ P, ai: c.monitorAi, due: c.monDue, calls: ai })}`); }
  for (const D of ['2026-11-04', '2026-11-05', '2026-11-06']) await call('/api/eod/grade', { id, date: D, score: 80 }, admin);
  if (!ai) fail('the instructed day\'s entry wasn\'t sent to the AI for its grade');
  { const P = day('2026-11-05').parts || {}; if (P.monitor !== null) fail(`a mid-training item day (Day 4) without its entry counts against the day: ${JSON.stringify(P)}`);
    // (the day a training is done — Day 5, Reception — without its entry: 0)
    if ((day('2026-11-06').parts || {}).monitor !== 0) fail(`a training-done day (Day 5) without its entry isn't 0: ${JSON.stringify(day('2026-11-06').parts)}`);
    if (!day('2026-11-05').monDue || !/#10–11/.test(day('2026-11-05').monDue.what)) fail(`the day doesn't say what the slides asked for: ${JSON.stringify(day('2026-11-05').monDue)}`); }
  { const P = day('2026-11-04').parts || {}; if (P.monitor !== 75) fail(`an instructed day's entry isn't scored by its check (75): ${JSON.stringify(P)}`); }
  // (the day kept from before: its 0 taken out, its % the average of the rest — (100 + 50) / 2 = 75: its old 📏 instructions
  // part folded away too, the day having no Day's outputs to fold it into — worker.js foldInstr)
  { const c = day('2026-11-18'); if (!c.parts || c.parts.monitor !== null || 'instructions' in c.parts || c.pct !== 75) fail(`a stored non-instructed day still counts its Monitoring Sheet: ${JSON.stringify(c)}`); }

  // 🖥 index.html ftDay1.comp, where the browser reads trackerreview: the same, without writing anything back
  { const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'), a = html.indexOf('const batchRealDay = '), b = html.indexOf('// ===== W1-OVERRIDE B103026 one-off');
    if (a < 0 || b < a) fail('index.html\'s batch helpers and ftDay1 are no longer where the test looks');
    else {
      const ctx = { FTTrackerRules: TR, console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(html.slice(a, b), ctx);
      const rv = { compliance: { '2026-11-18': { v: 2, pct: 50, parts: { monitor: 0, tests: 100, eod: 50 }, final: true, monitorAi: { score: 0 } },
        '2026-11-05': { v: 2, pct: 50, parts: { monitor: 0, tests: 100 }, final: true }, '2026-11-06': { v: 2, pct: 50, parts: { monitor: 0, tests: 100 }, final: true }, '2026-11-02': { v: 2, pct: 100, day1: true, day1Parts: { monitor: 100, tests: 100 }, parts: { monitor: null, tests: null } } } };
      const before = JSON.stringify(rv), out = ctx.ftDay1.comp(rv, 'B110226'), c = out.compliance;
      if (c['2026-11-18'].parts.monitor !== null || c['2026-11-18'].pct !== 75 || c['2026-11-18'].monitorAi) fail(`ftDay1.comp keeps a non-instructed day's Monitoring Sheet: ${JSON.stringify(c['2026-11-18'])}`);
      if (c['2026-11-05'].parts.monitor !== null || c['2026-11-05'].pct !== 100) fail(`ftDay1.comp keeps a mid-training item day's missing-entry 0: ${JSON.stringify(c['2026-11-05'])}`);
      if (c['2026-11-06'].parts.monitor !== 0 || c['2026-11-06'].pct !== 50) fail(`ftDay1.comp changed a training-done day: ${JSON.stringify(c['2026-11-06'])}`);
      if (c['2026-11-02'].parts.monitor !== 100 || c['2026-11-02'].pct !== 100) fail(`ftDay1.comp lost Day 1's (instructed) Monitoring Sheet: ${JSON.stringify(c['2026-11-02'])}`);
      if (JSON.stringify(rv) !== before) fail('ftDay1.comp wrote into the record it read');
    } }
  // 📋 the Batch Sheet's day row: "Not expected today" greyed out on a day nothing was asked, what was asked on an instructed day
  { const src = fs.readFileSync(path.join(process.cwd(), 'js/ft-batch-sheet.js'), 'utf8');
    if (!/naV: "Not expected today"/.test(src) || !/a\.naV \|\| "Not counted"/.test(src) || !/as the day's slides asked/.test(src)) fail('the Batch Sheet day row doesn\'t say "Not expected today" or what the slides asked for'); }
  // 🗣 no user-facing text says the Monitoring Sheet is checked every day
  { const fr = fs.readFileSync(path.join(process.cwd(), 'js/ft-rules.js'), 'utf8');
    if (/all 4 daily deliverables—EOD email, tracker, monitoring sheet, and test files—to your Assessment and Activities Folder daily/.test(fr)) fail('the orientation still says the monitoring sheet is a daily deliverable'); }

  if (failures.length) { console.error(`${failures.length} failure(s):`); failures.forEach((f, i) => console.error(`${i + 1}. ${f}`)); process.exit(1); }
  console.log('Monitoring Sheet when instructed test passed (a day the slides ask for no update: not expected, not counted, no AI grade; an instructed day: 0 without its entry, its check with it; a day kept from before cleaned by the Worker and by ftDay1.comp on read; the Batch Sheet says "Not expected today").');
})().catch((e) => { console.error(e); process.exit(1); });
