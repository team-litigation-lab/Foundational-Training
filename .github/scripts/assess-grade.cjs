// 📝 Submit for Grading on a long sheet (worker.js /api/assess/grade): Day 3's Reception Listening Activity, 40 answers.
//   - graded in batches of 10, so no single AI reply runs past its length;
//   - a reply cut off part-way still counts for each result that came through whole;
//   - without the AI, a short answer is checked by the key's pattern (the caller, the callback number, the birth year), and
//     one the key has no pattern for goes to the trainer ("Your trainer checks this one"), never a ✗ for a right answer.
// Usage: node .github/scripts/assess-grade.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'gia-grade--b9';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Gia Grade', batch: 'B9', approved: true }));
  // her log: call 1 answered right, the way the screenshot showed it
  const call1 = { caller: 'gloria benton, client', callback: '555-019-2047', verified: 'gloria benton, DOB-July 5th 1960, DOL-September 3rd, 2026',
    reason: 'she said they would send her an email with information for her to attend the clinic for her treatment and she never received it',
    action: 'send message to mara to resend the correct email for client with clinic information.', obstacle: 'Mixed-up details', response: 'Asked the birth year again.' };
  const logs = { 1: call1 };
  for (const n of [2, 3, 4, 5]) logs[n] = { caller: 'someone', callback: '555', verified: 'yes', reason: 'a reason', action: 'an action', obstacle: 'an obstacle', response: 'a response' };
  store.set('ft:listening:' + id, JSON.stringify({ logs: { recact: logs } }));

  // the AI: every answer right, one batch's reply cut off part-way (as a long reply was)
  let calls = 0, cutOne = true;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      calls++;
      const body = JSON.parse(init.body), prompt = body.messages.map(m => typeof m.content === 'string' ? m.content : '').join('\n');
      const ids = [...prompt.matchAll(/^\[(c\d_\w+)\]/gm)].map(m => m[1]);
      if (ids.length > 10) fail(`one AI request carried ${ids.length} answers (batches of 10)`);
      let text = JSON.stringify({ results: ids.map(i => ({ id: i, points: /response/.test(i) ? 2 : 1, note: 'Right.' })) });
      if (cutOne && ids.includes('c1_caller')) { cutOne = false; text = text.slice(0, Math.floor(text.length * 0.6)); }   // (cut off mid-reply)
      return new Response(JSON.stringify({ content: [{ type: 'text', text }], model: 'm', stop_reason: 'end_turn' }));
    }
    return new Response('not found', { status: 404 });
  };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const items = () => JSON.parse(store.get('ft:trackerreview:' + id)).assess.recact.items;

  // 1. with the AI: in batches; the cut-off reply's whole results count, the rest of call 1 by the key's pattern or the trainer
  env.ANTHROPIC_API_KEY = 'ci-key';
  const g1 = await call('/api/assess/grade', { id, doc: 'recact' }, admin);
  if (!g1.body || !g1.body.ok) fail(`grading didn't go through: ${JSON.stringify(g1.body)}`);
  if (calls !== 4) fail(`40 answers went in ${calls} AI requests, not 4 batches of 10`);
  const it1 = items();
  if (!it1.c1_caller.ok || !it1.c1_callback.ok || !it1.c1_verified.ok) fail(`call 1's right answers aren't ✓ after a cut-off reply: ${JSON.stringify([it1.c1_caller, it1.c1_callback, it1.c1_verified])}`);
  if (!it1.c4_caller.ok || !it1.c5_response.ok) fail('the other batches\' results were lost');
  const wrong = Object.entries(it1).filter(([k, r]) => /^c1_/.test(k) && !r.ok && !r.pending);
  if (wrong.length) fail(`call 1's right answers marked ✗: ${wrong.map(w => w[0]).join(', ')}`);

  // 2. without the AI: the key's patterns, and the trainer for the rest (never ✗ for a right answer)
  delete env.ANTHROPIC_API_KEY;
  { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.assess; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }
  await call('/api/assess/grade', { id, doc: 'recact' }, admin);
  const it2 = items();
  if (!it2.c1_caller.ok || !it2.c1_callback.ok || !it2.c1_verified.ok) fail(`without the AI, call 1's caller, callback and birth year aren't ✓ by the key: ${JSON.stringify([it2.c1_caller, it2.c1_callback, it2.c1_verified])}`);
  if (!it2.c1_reason.pending || !/trainer/.test(it2.c1_reason.note || '')) fail(`without the AI, an answer the key has no pattern for isn't left to the trainer: ${JSON.stringify(it2.c1_reason)}`);
  if (it2.c2_caller.ok) fail('a wrong caller passed the key\'s pattern');

  if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
  console.log('Assessment grading test passed (a 40-answer sheet graded in batches of 10; a cut-off AI reply keeps its whole results; without the AI, the key\'s patterns grade the caller, callback and birth year, and an answer with no pattern goes to the trainer, never a ✗ for a right answer).');
})().catch(e => { console.error(e); process.exit(1); });
