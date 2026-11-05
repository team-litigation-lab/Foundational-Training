// 🔑 GDRIVE_SA_KEY however it was pasted into Cloudflare (worker.js saKey): the PEM with real line breaks or "\n", the
//   private_key value copied with its quotes and comma, the "private_key": "…" line, or the whole JSON key file (whose
//   client_email signs in) all sign in; a key cut short, the private_key_id, an RSA key or a word pasted with it each say
//   plainly what is wrong (the Batch Sheet's 🔌 banner, /api/drive/status). The signature Google gets is checked here.
// Usage: node .github/scripts/drive-key.cjs   (no network)
const path = require('path'); const crypto = require('crypto'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  let lastIss = '';
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u === 'https://oauth2.googleapis.com/token') {
      const jwt = decodeURIComponent(String(init.body).split('assertion=')[1] || ''), [h, c, sig] = jwt.split('.');
      const ok = crypto.verify('RSA-SHA256', Buffer.from(h + '.' + c), publicKey, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      lastIss = JSON.parse(Buffer.from(c.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()).iss;
      return ok ? new Response(JSON.stringify({ access_token: 'tok' })) : new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }), { status: 400 });
    }
    if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) return new Response(JSON.stringify({ azp: '1234567890' }));
    return new Response('not found', { status: 404 });
  };
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', GDRIVE_SA_EMAIL: 'ci@lsh.iam.gserviceaccount.com',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async () => ({ keys: [], list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } }); return res.json(); };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).token;
  const status = async (key) => { env.GDRIVE_SA_KEY = key; return call('/api/drive/status', {}, admin); };
  const esc = pem.replace(/\n/g, '\\n');
  const json = JSON.stringify({ type: 'service_account', private_key_id: 'a'.repeat(40), private_key: pem, client_email: 'json@lsh.iam.gserviceaccount.com' }, null, 2);
  const good = { 'the PEM with line breaks': pem, 'the PEM with \\n': esc, 'with its quotes and comma': `"${esc}",`, 'the "private_key" line': `"private_key": "${esc}",`,
    'the PEM with Windows line breaks': pem.replace(/\n/g, '\r\n'), 'the PEM on one line with spaces': pem.replace(/\n/g, ' ') };
  for (const [what, key] of Object.entries(good)) { const s = await status(key); if (!s.saOk) fail(`${what} didn't sign in: ${s.saDetail}`); }
  { const s = await status(json); if (!s.saOk || lastIss !== 'json@lsh.iam.gserviceaccount.com') fail(`the whole JSON file didn't sign in as its client_email: ${s.saDetail} (${lastIss})`); }
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bad = {
    'cut short': [`-----BEGIN PRIVATE KEY-----\n${body.slice(0, 900)}\n-----END PRIVATE KEY-----`, /cut short \(900 characters/],
    'the private_key_id': ['0123456789abcdef0123456789abcdef01234567', /private_key_id/],
    'an RSA key': ['-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----', /RSA \(PKCS#1\)/],
    'a word pasted with it': [`-----BEGIN PRIVATE KEY-----\n${body.slice(0, 800)} private_key ${body.slice(800)}\n-----END PRIVATE KEY-----`, /characters a key can't have/],
    'JSON with no key': ['{"type":"service_account","client_email":"x@y"}', /no private_key/],
    'broken JSON': ['{"type":"service_account", "private_key": "-----BEGIN', /isn't complete JSON/] };
  for (const [what, [key, re]] of Object.entries(bad)) { const s = await status(key); if (s.saOk || !re.test(s.saDetail || '')) fail(`${what}: ${s.saOk ? 'signed in' : s.saDetail}`); }
  if (failures.length) { console.error('Drive key test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Drive key test passed (the PEM with line breaks or \\n, with its quotes, the private_key line, Windows line breaks and the whole JSON file all sign in; a key cut short, the private_key_id, an RSA key, a stray word and a JSON with no key each say what is wrong).');
})().catch(e => { console.error(e); process.exit(1); });
