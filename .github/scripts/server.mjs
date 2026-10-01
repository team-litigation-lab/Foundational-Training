// Local stand-in for Cloudflare: serves the site through worker.js with an in-memory KV store, so the
// browser tests run without an account. The same as the EA/PA portal's, with this Worker's bindings:
// LSH_KV (worker.js adds the "ft:" prefix itself) and ASSETS. No ADMIN_PASSPHRASE, so the Worker runs in
// open mode (no sign-in tokens), and no Gemini keys, so the AI features answer "No AI key is configured"
// and nothing outside this machine is called (GEMINI_RELAY is only used after a Gemini call).
// Usage: node .github/scripts/server.mjs [port]   (run from the repository root)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const worker = (await import(pathToFileURL(path.join(ROOT, 'worker.js')).href)).default;
const store = new Map();
const KV = {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => { store.set(k, String(v)); },
    delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true })
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const ASSETS = {
    fetch: async (req) => {
        let p = decodeURIComponent(new URL(req.url).pathname);
        if (p.endsWith('/')) p += 'index.html';
        const f = path.join(ROOT, p);
        if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return new Response('Not found', { status: 404 });
        return new Response(fs.readFileSync(f), { headers: { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' } });
    }
};
const env = { LSH_KV: KV, ASSETS, SESSION_SECRET: 'ci-only-secret' };
http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    try {
        const out = await worker.fetch(r, env, { waitUntil() {} });
        res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) { res.writeHead(500); res.end(String(e && e.stack || e)); }
}).listen(PORT, () => console.log(`listening on ${PORT}`));
