// The Worker's Gemini key pool (worker.js callGemini), with Gemini answered by this test through /api/ai, as the AI
// review, grading and live chat use it. Checks: the keys take turns; a rate-limited key rests for that model and the
// next key answers; a key out of credits or with billing off (402, a 429 about credits, a 400 or 403 about billing) or
// rejected hands over to the next key and rests on every model; a busy key or one that can't be reached hands over; the
// ordinary rate-limit message ("check your plan and billing details") is only a rate limit; when every key is out of
// credits the answer says so.
// Usage: node .github/scripts/gemini-keys.mjs   (from the repository root; no browser, nothing outside this machine)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const failures = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures.push(msg); };

let n = 0;
// A fresh Worker each time (its keys' rests live in the module), with an in-memory KV and no sign-in (open mode).
const fresh = async () => (await import(pathToFileURL(path.join(ROOT, 'worker.js')).href + '?k=' + (++n))).default;
const store = new Map();
const KV = { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => { store.set(k, String(v)); }, delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const env = { LSH_KV: KV, ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) }, SESSION_SECRET: 'ci-only-secret',
    GEMINI_API_KEY5: 'K5', GEMINI_API_KEY6: 'K6', GEMINI_API_KEY7: 'K7' };

// Gemini, answered here: answer[key] → [status, message] or (model) => [status, message] | null; no entry: it answers
let answer = {}, seen = [];
globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (!/generativelanguage\.googleapis\.com/.test(u)) throw new Error('unexpected request: ' + u);
    const key = init.headers['x-goog-api-key'], model = decodeURIComponent(u.match(/models\/([^:]+):/)[1]);
    seen.push(key + ' ' + model);
    const a = typeof answer[key] === 'function' ? answer[key](model) : answer[key];
    if (a === 'down') throw new Error('connection reset');
    if (a) return new Response(JSON.stringify({ error: { message: a[1] } }), { status: a[0], headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'from ' + key }] }, finishReason: 'STOP' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const ask = async (worker, feature = 'grading') => {
    const res = await worker.fetch(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, system: 'Review this', messages: [{ role: 'user', content: 'The trainee\'s calendar' }], max_tokens: 200 }) }), env, { waitUntil() {} });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, text: j.content ? j.content.map(c => c.text).join('') : '', error: j.error ? (j.error.message || j.error) : '' };
};
const run = async (label, setup, want, times = 4) => {
    const w = await fresh(); answer = setup; seen = [];
    const outs = []; for (let i = 0; i < times; i++) outs.push(await ask(w));
    check(outs.every(o => o.status === 200 && want.includes(o.text.slice(5))), `${label}: ${outs.map(o => o.status === 200 ? o.text : o.status + ' ' + o.error).join(' | ')}`);
    return outs;
};

await run('the keys take turns', {}, ['K5', 'K6', 'K7']);
check(new Set(seen.map(x => x.split(' ')[0])).size === 3, `every key got a turn: ${seen.join(', ')}`);
await run('a key out of prepaid credits (429) hands over to the next key', { K5: [429, 'Your prepayment credits are depleted. Please manage your project and billing in AI Studio.'] }, ['K6', 'K7']);
check(seen.filter(x => x.startsWith('K5 ')).length <= 1, `the key out of credits rests on every model (tried ${seen.filter(x => x.startsWith('K5 ')).length} times)`);
await run('a key with billing off (400) hands over', { K6: [400, 'Gemini API free tier is not available in your country. Please enable billing on your project in Google AI Studio.'] }, ['K5', 'K7']);
await run('a key that is out of money (402) hands over', { K7: [402, 'Payment required'] }, ['K5', 'K6']);
await run('a key whose billing account is disabled (403) hands over', { K5: [403, 'Billing account is disabled for project 123.'] }, ['K6', 'K7']);
await run('a rejected key (400 API key not valid) hands over', { K5: [400, 'API key not valid. Please pass a valid API key.'] }, ['K6', 'K7']);
await run('a busy key (503) hands over', { K5: [503, 'The model is overloaded.'] }, ['K6', 'K7']);
await run('a key that can\'t be reached hands over', { K6: 'down' }, ['K5', 'K7']);
await run('the ordinary rate-limit message only rests the key for that model', { K5: [429, 'You exceeded your current quota, please check your plan and billing details.'] }, ['K6', 'K7']);
{
    const w = await fresh(); seen = [];
    answer = { K5: [429, 'Your prepayment credits are depleted.'], K6: [403, 'Billing account is disabled.'], K7: [400, 'Please enable billing on your project.'] };
    const o = await ask(w);
    check(o.status === 502 && /out of credits or has billing off/.test(o.error), `every key out of credits: the answer says so (${o.status} ${o.error})`);
}
{
    const w = await fresh(); seen = [];
    answer = { K5: [429, 'Resource exhausted: per minute'], K6: [429, 'Resource exhausted: per minute'], K7: [429, 'Resource exhausted: per minute'] };
    const o = await ask(w);
    check(o.status === 429 && /rate limit/.test(o.error), `every key at its limit: a 429 the page can retry (${o.status} ${o.error})`);
}

if (failures.length) { console.error(`\nGemini key pool test FAILED: ${failures.length}`); process.exit(1); }
console.log('\nGemini key pool test passed (turns; rate limits, credits, billing, rejected, busy and unreachable keys hand over; plain errors).');
