// The call simulators on Claude (worker.js callClaude): with ANTHROPIC_API_KEY set, a call simulator's live turn
// (feature "call") is answered by Claude Haiku 5.5 with thinking off; any Claude failure (a rate limit, no credit left,
// a rejected key, an outage, a refusal, no text) falls back to the Gemini pool, so the call goes on; nothing but
// "call" ever goes to Claude, and without the key nothing does. Claude and Gemini are answered by this test.
// Usage: node .github/scripts/claude-calls.mjs   (from the repository root after `npm ci`; nothing outside this machine)
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const failures = [];
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) failures.push(msg); };
let n = 0;
const fresh = async () => (await import(pathToFileURL(path.join(ROOT, 'worker.js')).href + '?c=' + (++n))).default;
const store = new Map();
const KV = { get: async (k) => (store.has(k) ? store.get(k) : null), put: async (k, v) => { store.set(k, String(v)); }, delete: async (k) => { store.delete(k); },
    list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) };
const base = { LSH_KV: KV, ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) }, SESSION_SECRET: 'ci-only-secret', GEMINI_API_KEY5: 'K5' };

let claude = null, sent = [];           // claude: null → a normal answer; [status, type, message] → an error; 'down'; 'refusal'; 'empty'
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'request-id': 'req_test' } });
globalThis.fetch = async (url, init = {}) => {
    const u = String(url instanceof Request ? url.url : url);
    if (/api\.anthropic\.com\/v1\/messages/.test(u)) {
        const body = JSON.parse(init.body || (url instanceof Request ? await url.text() : '{}'));
        sent.push({ to: 'claude', body });
        if (claude === 'down') throw new TypeError('fetch failed');
        if (Array.isArray(claude)) return jsonRes({ type: 'error', error: { type: claude[1], message: claude[2] } }, claude[0]);
        const msg = (text, stop = 'end_turn') => ({ id: 'msg_test', type: 'message', role: 'assistant', model: body.model, content: text == null ? [] : [{ type: 'text', text }], stop_reason: stop, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } });
        if (claude === 'refusal') return jsonRes(msg(null, 'refusal'));
        if (claude === 'empty') return jsonRes(msg(''));
        return jsonRes(msg('Hi, this is the caller (Claude).'));
    }
    if (/generativelanguage\.googleapis\.com/.test(u)) {
        sent.push({ to: 'gemini' });
        return jsonRes({ candidates: [{ content: { parts: [{ text: 'Hi, this is the caller (Gemini).' }] }, finishReason: 'STOP' }] });
    }
    throw new Error('unexpected request: ' + u);
};
const ask = async (env, feature) => {
    const w = await fresh(); sent = [];
    const res = await w.fetch(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, max_tokens: 200, messages: [{ role: 'user', content: 'You are the caller. The trainee said: Good morning, how can I help?' }] }) }), env, { waitUntil() {} });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, text: j.content ? j.content.map(c => c.text).join('') : '', provider: j.provider || '', error: j.error ? (j.error.message || j.error) : '' };
};
const env = { ...base, ANTHROPIC_API_KEY: 'sk-ant-test' };

claude = null;
let o = await ask(env, 'call');
check(o.status === 200 && o.provider === 'claude' && /Claude/.test(o.text), `a call simulator's turn is answered by Claude (${o.status} ${o.provider} ${o.text || o.error})`);
const b = (sent.find(s => s.to === 'claude') || {}).body || {};
check(b.model === 'claude-haiku-5-5', `on Claude Haiku 5.5 (${b.model})`);
check(b.thinking && b.thinking.type === 'disabled' && b.output_config && b.output_config.effort === 'low', `with thinking off and low effort (${JSON.stringify({ thinking: b.thinking, output_config: b.output_config })})`);
check(b.max_tokens === 200 && Array.isArray(b.messages) && b.messages[0].role === 'user', `the turn's max_tokens and message are passed on (${b.max_tokens})`);
check(!sent.some(s => s.to === 'gemini'), 'Gemini is not called when Claude answers');

for (const [label, how] of [
    ['a rate limit (429)', [429, 'rate_limit_error', 'Number of request tokens has exceeded your per-minute rate limit']],
    ['no credit left (400)', [400, 'invalid_request_error', 'Your credit balance is too low to access the Anthropic API.']],
    ['a rejected key (401)', [401, 'authentication_error', 'invalid x-api-key']],
    ['an outage (529)', [529, 'overloaded_error', 'Overloaded']],
    ['an unreachable API', 'down'],
    ['a refusal', 'refusal'],
    ['no text', 'empty']
]) {
    claude = how;
    o = await ask(env, 'call');
    check(o.status === 200 && o.provider === 'gemini' && /Gemini/.test(o.text) && sent.filter(s => s.to === 'claude').length === 1,
        `${label} on Claude: the call goes on, on Gemini, with no retry on Claude (${o.status} ${o.provider} ${o.text || o.error}; Claude tried ${sent.filter(s => s.to === 'claude').length}×)`);
}

claude = null;
for (const feature of ['chat', 'grading', 'tracker', 'trainer', '']) {
    o = await ask(env, feature);
    check(o.status === 200 && o.provider === 'gemini' && !sent.some(s => s.to === 'claude'), `"${feature || '(none)'}" never goes to Claude (${o.provider})`);
}
o = await ask(base, 'call');
check(o.status === 200 && o.provider === 'gemini' && !sent.some(s => s.to === 'claude'), `without ANTHROPIC_API_KEY a call turn stays on Gemini (${o.provider})`);
o = await ask({ ...env, GEMINI_API_KEY5: undefined }, 'call');
check(o.status === 200 && o.provider === 'claude', `Claude alone (no Gemini key) still answers the call simulators (${o.status} ${o.provider || o.error})`);

if (failures.length) { console.error(`\nClaude call simulator test FAILED: ${failures.length}`); process.exit(1); }
console.log('\nClaude call simulator test passed (call turns on Claude Haiku 5.5, thinking off; every Claude failure falls back to Gemini once; nothing else uses Claude).');
