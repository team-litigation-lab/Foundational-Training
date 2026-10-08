// Documents served from R2 (worker.js → docFromR2): the document folders listed in R2_DOC_DIRS come from the
// DOCUMENTS bucket under the course's prefix, with byte ranges (PDF viewers) and 304s; a file not in R2 yet
// comes from the static assets; other paths never touch R2; without the binding everything is assets.
// Also checks that wrangler.json routes those folders through the Worker (assets.run_worker_first).
// Usage: node .github/scripts/r2-docs.mjs   (from the repository root; no browser needed)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const src = fs.readFileSync(path.join(process.cwd(), 'worker.js'), 'utf8');
const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
const failures = []; const fail = (m) => failures.push(m);
const root = (src.match(/const R2_DOCS = "([^"]+)"/) || [])[1];
const dirs = JSON.parse('[' + ((src.match(/const R2_DOC_DIRS = \[([^\]]*)\]/) || [])[1] || '') + ']');
if (!root || !dirs.length) { console.log('worker.js has no R2_DOCS / R2_DOC_DIRS'); process.exit(1); }
const conf = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
if (!(conf.r2_buckets || []).some(b => b.binding === 'DOCUMENTS' && b.bucket_name === 'lshtraining')) fail('wrangler.json has no DOCUMENTS → lshtraining R2 binding');
const first = (conf.assets && conf.assets.run_worker_first) || [];
for (const d of dirs) if (!first.includes(d + '*')) fail(`wrangler.json's assets.run_worker_first doesn't send ${d}* through the Worker (R2 would never be read)`);

const dir = dirs[0], file = dir + 'sample doc.pdf', key = root + file;
const bytes = new TextEncoder().encode('%PDF-1.4 0123456789 sample document');
function makeR2() {
    const objs = new Map([[key, bytes]]);
    return {
        objs,
        get: async (k, o = {}) => {
            if (!objs.has(k)) return null;
            const b = objs.get(k), etag = '"e-' + b.length + '"';
            const meta = { key: k, size: b.length, httpEtag: etag, writeHttpMetadata: (h) => h.set('Content-Type', 'application/pdf') };
            const inm = o.onlyIf && o.onlyIf.get && o.onlyIf.get('If-None-Match');
            if (inm && inm === etag) return meta;
            const rh = o.range && o.range.get && o.range.get('Range');
            let part = b, range;
            const m = rh && rh.match(/^bytes=(\d*)-(\d*)$/);
            if (m) {
                if (m[1] === '') { range = { suffix: Number(m[2]) }; part = b.slice(b.length - Number(m[2])); }
                else { const s = Number(m[1]), e = m[2] ? Number(m[2]) : b.length - 1; range = { offset: s, length: e - s + 1 }; part = b.slice(s, e + 1); }
            }
            return Object.assign(meta, { range, body: new Blob([part]).stream() });
        }
    };
}
const ASSETS = { fetch: async (req) => { const p = decodeURIComponent(new URL(req.url).pathname); return p.startsWith(dir) ? new Response('from assets ' + p, { headers: { 'Content-Type': 'application/pdf' } }) : new Response('Not found', { status: 404 }); } };
const kv = { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [], list_complete: true }) };
const get = async (env, p, headers = {}, method = 'GET') => {
    const res = await worker.fetch(new Request('http://x' + encodeURI(p), { method, headers }), env, { waitUntil() {} });
    return { status: res.status, headers: res.headers, text: method === 'HEAD' ? '' : await res.text() };
};

{
    const env = { LSH_KV: kv, ASSETS, DOCUMENTS: makeR2(), SESSION_SECRET: 'ci-secret' };
    const r = await get(env, file);
    if (r.status !== 200 || !/sample document/.test(r.text) || !/pdf/.test(r.headers.get('Content-Type') || '')) fail(`a document in R2 isn't served from R2 (${key}): ${r.status} ${r.text.slice(0, 60)}`);
    const part = await get(env, file, { Range: 'bytes=0-7' });
    if (part.status !== 206 || part.text !== '%PDF-1.4' || part.headers.get('Content-Range') !== `bytes 0-7/${bytes.length}`) fail(`a byte range isn't answered with 206 and the right bytes: ${part.status} ${part.headers.get('Content-Range')} "${part.text}"`);
    const tail = await get(env, file, { Range: 'bytes=-8' });
    if (tail.status !== 206 || tail.text !== 'document' || tail.headers.get('Content-Range') !== `bytes ${bytes.length - 8}-${bytes.length - 1}/${bytes.length}`) fail(`a suffix range is wrong: ${tail.status} ${tail.headers.get('Content-Range')} "${tail.text}"`);
    const again = await get(env, file, { 'If-None-Match': r.headers.get('ETag') });
    if (again.status !== 304) fail(`re-checking an unchanged document doesn't give 304 (${again.status})`);
    const head = await get(env, file, {}, 'HEAD');
    if (head.status !== 200 || head.headers.get('Content-Length') !== String(bytes.length)) fail(`HEAD on a document: ${head.status} ${head.headers.get('Content-Length')}`);
    const missing = await get(env, dir + 'not-uploaded-yet.pdf');
    if (missing.status !== 200 || !/from assets/.test(missing.text)) fail(`a document not in R2 doesn't fall back to the static assets: ${missing.status} ${missing.text.slice(0, 60)}`);
    env.DOCUMENTS.get = async () => { throw new Error('R2 down'); };
    const down = await get(env, file);
    if (down.status !== 200 || !/from assets/.test(down.text)) fail(`with R2 failing, documents don't come from the static assets: ${down.status}`);
}
{
    let touched = false;
    const env = { LSH_KV: kv, ASSETS, DOCUMENTS: { get: async () => { touched = true; return null; } }, SESSION_SECRET: 'ci-secret' };
    await get(env, '/favicon.png');
    if (touched) fail('a path outside the document folders was looked up in R2');
}
{
    const env = { LSH_KV: kv, ASSETS, SESSION_SECRET: 'ci-secret' };
    const r = await get(env, file);
    if (r.status !== 200 || !/from assets/.test(r.text)) fail(`without the DOCUMENTS binding, documents don't come from the static assets: ${r.status}`);
}
if (dirs.includes('/trainer/')) {
    // trainer-only files stay trainer-only when they come from R2
    const r2 = makeR2(); r2.objs.set(root + '/trainer/notes.json', new TextEncoder().encode('{"secret":1}'));
    const env = { LSH_KV: kv, ASSETS, DOCUMENTS: r2, SESSION_SECRET: 'ci-secret', MASTER_ADMIN_PASSWORD: 'ci-pass' };
    const r = await get(env, '/trainer/notes.json');
    if (r.status !== 401 || /secret/.test(r.text)) fail(`a trainer-only file in R2 was served without a trainer sign-in (${r.status})`);
    if (!first.includes('/trainer/*')) fail('wrangler.json doesn\'t send /trainer/* through the Worker: the static assets would serve trainer-only files to anyone');
}

if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
console.log(`R2 documents test passed (${dirs.join(', ')} from R2 under ${root}/, ranges and 304s, missing files and no binding → static assets).`);
