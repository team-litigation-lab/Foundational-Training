// Applies a list of changed document files to R2 (used by .github/workflows/r2-docs.yml): each line is
// "<status>\t<path>" from git diff --name-status; D removes <PREFIX>/<path> from the bucket, anything else
// uploads the file there with its content type. Six at a time, each tried three times.
// Usage: BUCKET=lshtraining PREFIX=courses/xx node .github/scripts/r2-sync.mjs <changes file>
//        (needs wrangler on the PATH and CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID)
import fs from 'node:fs';
import { execFile } from 'node:child_process';

const { BUCKET, PREFIX } = process.env;
if (!BUCKET || !PREFIX) { console.log('BUCKET and PREFIX are required'); process.exit(1); }
const TYPES = {
    pdf: 'application/pdf', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    svg: 'image/svg+xml', json: 'application/json', html: 'text/html; charset=utf-8', txt: 'text/plain; charset=utf-8',
    mp3: 'audio/mpeg', mp4: 'video/mp4',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};
const changes = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map((l) => {
    const [status, ...rest] = l.split('\t');
    return { status, file: rest.join('\t') };
});
const run = (args) => new Promise((resolve, reject) => execFile('wrangler', args, { maxBuffer: 1 << 24 }, (err, out, errOut) => (err ? reject(new Error(errOut || out || err.message)) : resolve())));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failed = [];
async function apply({ status, file }) {
    const key = `${PREFIX}/${file}`, gone = status === 'D';
    const args = gone
        ? ['r2', 'object', 'delete', `${BUCKET}/${key}`, '--remote']
        : ['r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--content-type', TYPES[file.split('.').pop().toLowerCase()] || 'application/octet-stream', '--remote'];
    for (let attempt = 1; ; attempt++) {
        try { await run(args); console.log(`${gone ? 'removed' : 'uploaded'} ${key}`); return; }
        catch (e) {
            if (attempt === 3) { failed.push(key); console.log(`::error::couldn't ${gone ? 'remove' : 'upload'} ${key}: ${String(e.message).trim().split('\n').pop()}`); return; }
            await sleep(attempt * 3000);
        }
    }
}
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < changes.length) await apply(changes[next++]); }));
console.log(`${changes.length - failed.length} of ${changes.length} applied to ${BUCKET}/${PREFIX}/`);
if (failed.length) process.exit(1);
