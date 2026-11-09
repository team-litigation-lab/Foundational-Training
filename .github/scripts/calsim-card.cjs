// 🗓 The Calendar Management Mock Call scorecard, one with the Training Portal's Google Calendar Simulator (worker.js /api/calsim-card):
// trainers only; the trainee's Portal scorecards read by their name and canonical batch, with the shared gateway secret; a scorecard
// saved in 🧑‍🏫 Graders sent there; without AI_GATEWAY_SECRET: {ok: false, off: true}; the Portal down: a clear error, no throw.
// Usage: node .github/scripts/calsim-card.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'abesh-dawn-jamon--b103026';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', AI_GATEWAY_SECRET: 'gw-secret', PORTAL_URL: 'https://portal.test',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Abesh Dawn Jamon', batch: 'b103026', approved: true }));
  const seen = []; let down = false;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (!u.startsWith('https://portal.test/api/calsim-scorecard')) return new Response('', { status: 404 });
    if (down) throw new Error('connection refused');
    seen.push({ u, method: init.method || 'GET', key: (init.headers || {})['X-Gateway-Key'], body: init.body ? JSON.parse(init.body) : null });
    if ((init.method || 'GET') === 'POST') return new Response(JSON.stringify({ success: true, card: { pct: 83, source: 'foundational' } }));
    return new Response(JSON.stringify({ success: true, username: 'abesh', cards: [{ average: 4, pct: 80, by: 'Coach Tess', rows: [] }] }));
  };
  const call = async (body, token) => { const res = await worker.fetch(new Request('http://x/api/calsim-card', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const admin = ((await (await worker.fetch(new Request('http://x/api/auth/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: 'ci-pass' }) }), env, { waitUntil() {} })).json()).token);
  const trainee = (await (await worker.fetch(new Request('http://x/api/auth/trainee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Abesh Dawn Jamon', batch: 'B103026' }) }), env, { waitUntil() {} })).json()).token;
  if ((await call({ id, op: 'get' }, trainee)).status !== 403) fail('a trainee read the scorecard through the trainers\' route');
  const g = (await call({ id, op: 'get' }, admin)).body || {};
  if (!g.ok || g.username !== 'abesh' || !g.cards || g.cards[0].pct !== 80) fail(`the Portal's scorecards weren't read: ${JSON.stringify(g)}`);
  const s0 = seen[seen.length - 1] || {};
  if (s0.key !== 'gw-secret' || !/name=Abesh\+Dawn\+Jamon/.test(s0.u) || !/batch=B103026/.test(s0.u)) fail(`the read didn't carry the secret, the name and the canonical batch: ${JSON.stringify(s0)}`);
  const rows = [5, 4, 4, 3, 4, 5, 4].map((v) => ({ score: v, feedback: 'ok' }));
  const p = (await call({ id, op: 'put', rows, by: 'Coach Tess' }, admin)).body || {};
  const s1 = seen[seen.length - 1] || {};
  if (!p.ok || s1.method !== 'POST' || !s1.body || s1.body.rows.length !== 7 || s1.body.by !== 'Coach Tess' || s1.body.batch !== 'B103026') fail(`the scorecard wasn't sent to the Portal: ${JSON.stringify({ p, s1 })}`);
  down = true; const d = (await call({ id, op: 'get' }, admin)).body || {};
  if (d.ok || !/unreachable/.test(d.error || '')) fail(`the Portal down didn't give a clear error: ${JSON.stringify(d)}`);
  delete env.AI_GATEWAY_SECRET; const o = (await call({ id, op: 'get' }, admin)).body || {};
  if (o.ok || !o.off) fail(`without the secret it isn't off: ${JSON.stringify(o)}`);
  if (failures.length) { console.log('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Calendar scorecard link test passed (trainers only; the Portal\'s scorecards read by name and batch with the secret; a Graders scorecard sent there; off without the secret; the Portal down explained).');
})().catch((e) => { console.log('FAIL', e && e.stack || e); process.exit(1); });
