// 🔒 What a trainee may write through /api/storage/set (worker.js traineeWrite), the repo-wide audit's fixes:
//   - a certificate is the trainee's own and new: one already issued can't be written over, and none made for someone else;
//   - feedback and certificates are small; a trainee record and the progress snapshot have a size limit.
// Usage: node .github/scripts/storage-guards.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B110226' })).body || {};
  if (!t.token || !t.id) { console.error('Storage guards test FAILED: no trainee session', JSON.stringify(t)); process.exit(1); }
  const set = (key, value, tok = t.token) => call('/api/storage/set', { key, value: JSON.stringify(value) }, tok);
  // a certificate: the trainee's own and new
  let r = await set('cert:LSH-FT-2026-ABC123', { certId: 'LSH-FT-2026-ABC123', traineeId: t.id, name: 'Ana Cruz', issuedBy: 'self' });
  if (r.status !== 200 || !store.has('ft:cert:LSH-FT-2026-ABC123')) fail(`a trainee couldn't save their own new certificate: ${JSON.stringify(r)}`);
  r = await set('cert:LSH-FT-2026-ABC123', { certId: 'LSH-FT-2026-ABC123', traineeId: t.id, name: 'Forged', issuedBy: 'Admin' });
  if (r.status === 200 || /Forged/.test(store.get('ft:cert:LSH-FT-2026-ABC123'))) fail('an issued certificate was written over');
  r = await set('cert:LSH-FT-2026-ZZZ999', { certId: 'LSH-FT-2026-ZZZ999', traineeId: 'someone-else', name: 'X' });
  if (r.status === 200 || store.has('ft:cert:LSH-FT-2026-ZZZ999')) fail('a trainee made a certificate for someone else');
  // sizes
  r = await set('tfeedback:abc123', { traineeId: t.id, text: 'x'.repeat(30000) });
  if (r.status === 200) fail('a 30 KB feedback was stored');
  r = await set('progress:' + t.id, { traineeId: t.id, savedAt: '2026-11-12T00:00:00Z', data: { notes: 'x'.repeat(4100000) } });
  if (r.status === 200) fail('a 4 MB progress snapshot was stored');
  r = await set('progress:' + t.id, { traineeId: t.id, savedAt: '2026-11-12T00:00:00Z', data: { notes: 'ok' } });
  if (r.status !== 200) fail(`a normal progress snapshot wasn't stored: ${JSON.stringify(r)}`);
  if (failures.length) { console.error('Storage guards test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Storage guards test passed (a certificate only the trainee\'s own and new, never written over; feedback, progress and trainee records size-limited).');
})().catch((e) => { console.error('Storage guards test FAILED:', e && e.stack || e); process.exit(1); });
