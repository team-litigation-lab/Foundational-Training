// 📝 Day 8's Intake Worksheet as the trainee answered it (worker.js /api/intake/worksheet): the Google Doc whose link they
// submitted on the slide, else the one in their Assessments/Activities folder named for it, read as text for the 📋 Batch Sheet;
// a Word file or a file the platform can't read says so; trainees only their own.
// Usage: node .github/scripts/intake-worksheet.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'ina-take--b9';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Ina Take', batch: 'B9', approved: true }));
  const DOC = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  let shared = true;
  globalThis.fetch = async (url) => { const u = String(url);
    if (u.includes(`/document/d/${DOC}/export`)) return shared ? new Response('INTAKE - Client\'s Info Sheet: personal details\nINTAKE - DMV: the vehicle\'s loss in value') : new Response('<!doctype html>sign in', { status: 200 });
    return new Response('not found', { status: 404 }); };
  const call = async (body, token) => { const r = await worker.fetch(new Request('http://x/api/intake/worksheet', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const admin = (await (await worker.fetch(new Request('http://x/api/auth/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passphrase: 'ci-pass' }) }), env, { waitUntil() {} })).json()).token;
  let r = await call({ id }, admin);
  if (!r.body || r.body.link !== '' || r.body.why !== 'none') fail(`nothing submitted and no folder: not "none": ${JSON.stringify(r.body)}`);
  store.set('ft:actsub:' + id, JSON.stringify({ items: { intakews: { answer: `https://docs.google.com/document/d/${DOC}/edit`, submittedAt: '2026-11-10T10:00:00Z' } } }));
  r = await call({ id }, admin);
  if (!r.body || !/Client's Info Sheet: personal details/.test(r.body.text || '') || r.body.submittedAt !== '2026-11-10T10:00:00Z') fail(`the submitted Doc wasn't read: ${JSON.stringify(r.body)}`);
  shared = false; r = await call({ id }, admin);
  if (!r.body || r.body.text !== null || r.body.why !== 'not-shared') fail(`a Doc the platform can't read isn't "not-shared": ${JSON.stringify(r.body)}`);
  store.set('ft:actsub:' + id, JSON.stringify({ items: { intakews: { answer: 'https://drive.google.com/file/d/1WordFile000000000000000/view' } } }));
  r = await call({ id }, admin);
  if (!r.body || r.body.why !== 'not-a-doc') fail(`a Word file on Drive isn't "not-a-doc": ${JSON.stringify(r.body)}`);
  if (failures.length) { console.error('Intake Worksheet test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Intake Worksheet test passed (the submitted Google Doc read as text; one the platform can\'t read, or a Word file, says so; nothing submitted says so).');
})().catch((e) => { console.error('Intake Worksheet test FAILED:', e && e.stack || e); process.exit(1); });
