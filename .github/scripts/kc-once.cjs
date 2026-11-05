// 🔒 A Knowledge Check is taken once (js/ft-process.js, worker.js traineeWrite process:<id>), on the Worker with real tokens:
//   a trainee's first graded attempt is saved; a second one, a changed score on the same attempt, or an attempt taken away
//   is not; the 📖 Reading Task the same, on its own; a trainee can't grant themselves a retry (kcreview:<id> is the
//   trainer's); a retry the trainer grants (↺ Grant a retry: kcreview:<id>.retries) lets exactly one more attempt through;
//   the answers themselves still save as the trainee types.
// Usage: node .github/scripts/kc-once.cjs   (no server, no browser needed)
const path = require('path');
const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);

(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const me = (await call('/api/auth/trainee', { name: 'Kim Once', batch: 'B103026' })).body;
  if (!me || !me.token) throw new Error('sign-in failed');
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const K = 'process:' + me.id;
  const set = (v, tok) => call('/api/storage/set', { key: K, value: JSON.stringify(v) }, tok || me.token);
  const get = async () => JSON.parse((await call('/api/storage/get', { key: K }, admin)).body.value || 'null');
  const att = (n, best) => ({ attempts: n, best, last: { pct: best, at: 'x' + n } });
  const sets = { 'va-essentials': { answers: ['first answer'] } };

  // the first attempt is saved, with the answers
  await set({ sets, kc: { 1: att(1, 50) } });
  let p = await get();
  if (!p || !p.kc || p.kc[1].attempts !== 1 || p.kc[1].best !== 50) fail(`the first attempt wasn't saved: ${JSON.stringify(p && p.kc)}`);
  // a second attempt isn't
  await set({ sets, kc: { 1: att(2, 90) } });
  p = await get();
  if (p.kc[1].attempts !== 1 || p.kc[1].best !== 50) fail(`a second attempt was saved: ${JSON.stringify(p.kc[1])}`);
  // nor a changed score on the same attempt, nor the attempt taken away (to start again)
  await set({ sets, kc: { 1: att(1, 99) } });
  if ((await get()).kc[1].best !== 50) fail('a trainee changed the score of the attempt they took');
  await set({ sets, kc: {} });
  if (!((await get()).kc[1])) fail('a trainee took their attempt away');
  await set({ sets });
  if (!((await get()).kc || {})[1]) fail('a trainee dropped their Knowledge Checks by leaving them out');
  // a first write can't claim several attempts at once
  await set({ sets, kc: { 1: (await get()).kc[1], 2: att(3, 95) } });
  if (((await get()).kc || {})[2]) fail('a first attempt claiming 3 attempts was saved');
  // the answers still save as they type
  await set({ sets: { 'va-essentials': { answers: ['changed answer'] } }, kc: (await get()).kc });
  if ((await get()).sets['va-essentials'].answers[0] !== 'changed answer') fail('the answers no longer save');
  // 📖 the Reading Task: once, on its own
  await set({ sets, kc: (await get()).kc, kcRead: { 1: att(1, 60) } });
  await set({ sets, kc: (await get()).kc, kcRead: { 1: att(2, 80) } });
  p = await get();
  if (!p.kcRead || p.kcRead[1].attempts !== 1 || p.kcRead[1].best !== 60) fail(`the Reading Task wasn't held to one attempt: ${JSON.stringify(p.kcRead)}`);
  // a trainee can't grant themselves a retry
  const self = await call('/api/storage/set', { key: 'kcreview:' + me.id, value: JSON.stringify({ lessons: {}, retries: { 1: 5 } }) }, me.token);
  if (self.status === 200) fail('a trainee wrote their own kcreview (a retry)');
  // ↺ the trainer grants one retry on Lesson 1: exactly one more attempt goes through
  await call('/api/storage/set', { key: 'kcreview:' + me.id, value: JSON.stringify({ lessons: {}, retries: { 1: 1 }, retryLog: [{ key: '1', lesson: 1, why: 'connection dropped', at: 'now' }] }) }, admin);
  await set({ sets, kc: { 1: att(2, 90) }, kcRead: p.kcRead });
  p = await get();
  if (p.kc[1].attempts !== 2 || p.kc[1].best !== 90) fail(`the granted retry wasn't saved: ${JSON.stringify(p.kc[1])}`);
  await set({ sets, kc: { 1: att(3, 100) }, kcRead: p.kcRead });
  if ((await get()).kc[1].attempts !== 2) fail('a third attempt went through on one retry');
  // (the retry was Lesson 1's own sheet: the Reading Task is still held)
  await set({ sets, kc: (await get()).kc, kcRead: { 1: att(2, 90) } });
  if ((await get()).kcRead[1].attempts !== 1) fail('Lesson 1\'s retry also opened its Reading Task');
  // the trainer's own write (the trainer-side grading) isn't held
  await call('/api/storage/set', { key: K, value: JSON.stringify({ sets, kc: { 1: att(2, 90) }, kcRead: { 1: att(1, 60) }, kc2: 1 }) }, admin);
  if ((await get()).kc2 !== 1) fail('the trainer could not write the record');

  if (failures.length) { console.error('Knowledge Check once test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Knowledge Check once test passed (one graded attempt is kept, a second, a changed score or a removed attempt is not; the Reading Task on its own; no self-granted retry; a trainer\'s retry lets exactly one more attempt through; the answers still save).');
})().catch(e => { console.error(e); process.exit(1); });
