// 📤 The Day's outputs with the scores of what was graded that day (worker.js dailyCompliance graded): each Knowledge
// Check, assessment, Transcription, Monitoring Sheet items' review and Practice Session handed in that day counts beside the
// hand-in (the average); a practice-only activity (the Insurance Email Simulator) and another day's grades don't.
// Usage: node .github/scripts/outputs-scores.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'oli-out--b110226', D = '2026-11-04', at = D + 'T18:00:00Z', other = '2026-11-03T18:00:00Z';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Oli Out', batch: 'B110226', approved: true }));
  store.set('ft:process:' + id, JSON.stringify({ sets: { 'pi-overview': { submittedAt: at } }, kc: { 'reception': { attempts: 1, best: 80, last: { at } }, 'old': { attempts: 1, best: 10, last: { at: other } } } }));
  store.set('ft:sessions:' + id, JSON.stringify({ runs: { 'intake|1': { submittedAt: at, auto: { pct: 70 } } } }));
  store.set('ft:trackerreview:' + id, JSON.stringify({ days: {}, assess: { recact: { at, score: 30, max: 50, pct: 60, title: 'Reception Listening Activity' }, 'claims-email': { at, score: 0, max: 60, pct: 0, title: 'Insurance Email Simulator' } } }));
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  await call('/api/eod/grade', { id, date: D, score: 80 }, admin);
  const c = (JSON.parse(store.get('ft:trackerreview:' + id)).compliance || {})[D] || {};
  const g = (c.graded || []).map(x => x.what + ' ' + x.pct).sort();
  const want = ['Assessment: Reception Listening Activity 60', 'Knowledge Check: reception 80', 'Practice Session: intake 70'];
  if (JSON.stringify(g) !== JSON.stringify(want)) fail(`the day's graded work isn't what was graded that day (practice and another day's left out): ${JSON.stringify(g)}`);
  // (the hand-in, 100, and the three scores: (100 + 80 + 60 + 70) / 4 = 78)
  if ((c.parts || {}).outputs !== 78) fail(`the Day's outputs isn't the hand-in averaged with the day's scores (78): ${(c.parts || {}).outputs}`);
  if (failures.length) { console.error('Outputs scores test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log("Outputs scores test passed (the Day's outputs averages the hand-in with each Knowledge Check, assessment and Practice Session graded that day; a practice-only activity and another day's grades left out).");
})().catch((e) => { console.error('Outputs scores test FAILED:', e && e.stack || e); process.exit(1); });
