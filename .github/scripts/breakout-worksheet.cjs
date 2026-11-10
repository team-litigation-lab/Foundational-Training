// 📝 The Breakout Session worksheets (js/ft-assess.js "breakout-d<day>", assess-keys.js): the Digital Handouts done on one's own,
//   a worksheet of 5 questions or more on each Breakout day (Days 1, 2, 7, 10 and 13), graded by 📝 Submit for Grading
//   (worker.js /api/assess/grade): each answer by the AI out of 5 against the key's model answer; without the AI, left to the
//   trainer, never a 0. The grade counts on the scorecards and in that day's outputs (Assessment: …).
// Usage: node .github/scripts/breakout-worksheet.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const { ASSESS_KEYS } = await import(pathToFileURL(path.join(process.cwd(), 'assess-keys.js')).href);
  for (const d of [1, 2, 7, 10, 13]) { const k = ASSESS_KEYS['breakout-d' + d], n = k ? Object.keys(k.items).length : 0;
    if (n < 5 || Object.values(k.items).some(x => !x.essay || x.pts !== 5 || !x.answer)) fail(`Day ${d}'s Breakout worksheet hasn't 5 questions or more, each an essay out of 5 with its model answer (${n})`); }
  const store = new Map(), id = 'bea-break--b9', D = '2026-11-09';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Bea Break', batch: 'B9', approved: true }));
  const answers = { q1: 'Police report shows fault; photos show damage; medical records show the injuries; bills show the cost.', q2: 'Retainer, client info sheet, HIPAA authorization, accident questionnaire.',
    q3: 'Everything after it relies on it; a wrong claim number delays the LOR.', q4: 'Empathy, verifying spelling, logging it in the CMS at once.', q5: 'Get the date, place and police agency and request the report.' };
  store.set('ft:assess:' + id, JSON.stringify({ v: 1, docs: { 'breakout-d7': { answers, updatedAt: D + 'T18:00:00Z' } } }));
  let calls = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).startsWith('https://api.anthropic.com/')) { calls++;
      const prompt = JSON.parse(init.body).messages.map(m => typeof m.content === 'string' ? m.content : '').join('\n');
      const ids = [...prompt.matchAll(/^\[(q\d+)\]/gm)].map(m => m[1]);
      return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ results: ids.map(i => ({ id: i, points: 4, note: 'Good, add one more example.' })) }) }], model: 'm', stop_reason: 'end_turn' })); }
    return new Response('not found', { status: 404 });
  };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const g = () => (JSON.parse(store.get('ft:trackerreview:' + id) || '{}').assess || {})['breakout-d7'] || {};
  // 1. with the AI: each answer out of 5 (4 each: 20 of 25 = 80%)
  env.ANTHROPIC_API_KEY = 'ci-key';
  const r = await call('/api/assess/grade', { id, doc: 'breakout-d7' }, admin);
  if (!r.body || !r.body.ok) fail(`the worksheet wasn't graded: ${JSON.stringify(r.body)}`);
  if (!calls) fail('the AI wasn\'t asked');
  if (g().score !== 20 || g().max !== 25 || g().pct !== 80 || !/Breakout Session Worksheet – Day 7/.test(g().title || '')) fail(`the worksheet's grade isn't 20 of 25 (80%): ${JSON.stringify(g()).slice(0, 300)}`);
  // 2. it counts in the day's outputs
  // (the day it was graded, in Pacific time as the platform's days are: not the UTC date, a day ahead in the evening)
  const gd = g().at ? globalThis.FTTrackerRules.ptDate(new Date(g().at)) : D;
  await call('/api/eod/grade', { id, date: gd, score: 80 }, admin);
  { const day = gd, c = ((JSON.parse(store.get('ft:trackerreview:' + id)).compliance) || {})[day] || {};
    if (!(c.graded || []).some(x => /Breakout Session Worksheet – Day 7/.test(x.what) && x.pct === 80)) fail(`the worksheet's grade isn't among the day's graded work: ${JSON.stringify(c.graded)}`); }
  // 3. without the AI: the answers wait for the trainer, never 0
  delete env.ANTHROPIC_API_KEY;
  { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.assess; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }
  await call('/api/assess/grade', { id, doc: 'breakout-d7' }, admin);
  if (!g().pending || Object.values(g().items || {}).some(x => x.ok === false && !x.pending)) fail(`without the AI the worksheet isn't left to the trainer: ${JSON.stringify(g()).slice(0, 300)}`);
  if (failures.length) { console.error('Breakout worksheet test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Breakout worksheet test passed (a worksheet of 5 questions or more on each Breakout day, each answer graded by the AI out of 5 against its model answer, the grade in the day\'s outputs; without the AI, left to the trainer).');
})().catch((e) => { console.error('Breakout worksheet test FAILED:', e && e.stack || e); process.exit(1); });
