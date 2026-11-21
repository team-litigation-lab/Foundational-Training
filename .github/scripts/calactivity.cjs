// 📅 Day 5's Attorney Calendar Management Activity on the Portal, for the 📋 Batch Sheet (worker.js /api/calactivity): the Portal's
// latest Calendaring Activity for the trainee with links to their calendar there (read only) and the evaluations, to back-check
// the score; no Portal account says so; trainers only.
// Usage: node .github/scripts/calactivity.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'cal-ender--b9';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', AI_GATEWAY_SECRET: 'gw', PORTAL_URL: 'https://portal.test',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Cal Ender', batch: 'B9', approved: true }));
  let known = true, asked = null;
  globalThis.fetch = async (url, o) => { const u = String(url);
    if (u.startsWith('https://portal.test/api/calsim-scorecard?')) { asked = { u, key: o && o.headers && o.headers['X-Gateway-Key'] };
      return new Response(JSON.stringify(known ? { success: true, username: 'cal.ender', activity: { id: 7, submittedAt: '2026-11-18T10:00:00Z', checkScore: 82, status: 'submitted', trainerScore: null } } : { success: true, username: '', activity: null })); }
    return new Response('not found', { status: 404 }); };
  const call = async (body, token) => { const r = await worker.fetch(new Request('http://x/api/calactivity', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const admin = (await (await worker.fetch(new Request('http://x/api/auth/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: 'ci-pass' }) }), env, { waitUntil() {} })).json()).token;
  let r = await call({ id }, admin);
  if (!asked || !/activity=1/.test(asked.u) || !/name=Cal\+Ender/.test(asked.u) || asked.key !== 'gw') fail(`the Portal wasn't asked for the trainee's Calendaring Activity: ${JSON.stringify(asked)}`);
  if (!r.body || !r.body.activity || r.body.activity.checkScore !== 82) fail(`the Portal's result isn't given back: ${JSON.stringify(r.body)}`);
  if (!r.body || r.body.calendar !== 'https://portal.test/simulators/gcal.html?track=activity&trainee=cal.ender') fail(`no link to their calendar on the Portal: ${JSON.stringify(r.body)}`);
  if (!r.body || !/gcal-review\.html\?track=activity/.test(r.body.reviews || '')) fail('no link to the Portal\'s Calendaring Activity evaluations');
  known = false; r = await call({ id }, admin);
  if (!r.body || r.body.why !== 'no-account' || r.body.calendar !== '') fail(`no Portal account isn't said: ${JSON.stringify(r.body)}`);
  r = await call({ id }, null);
  if (r.status !== 401 && r.status !== 403) fail(`someone not signed in got an answer (${r.status})`);
  // (the nightly sync keeps the Portal username with the score)
  const src = require('fs').readFileSync('worker.js', 'utf8');
  if (!/simFrom: "Standard Training - Calendaring Activity", simAt: a\.submittedAt \|\| "", simUser:/.test(src)) fail('the simulator-score sync doesn\'t keep the Portal username with the Calendaring Activity');
  const bs = require('fs').readFileSync('js/ft-batch-sheet.js', 'utf8');
  if (!/always: true/.test(bs) || !/FTBatchSheet\.calOut\(this\)/.test(bs)) fail('the Batch Sheet doesn\'t always show the Calendaring Activity row with its Portal result');
  if (failures.length) { console.error('Calendaring Activity test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Calendaring Activity test passed (the Portal\'s result with links to the trainee\'s calendar and the evaluations; no Portal account says so; trainers only; the row always on the Batch Sheet).');
})().catch((e) => { console.error('Calendaring Activity test FAILED:', e && e.stack || e); process.exit(1); });
