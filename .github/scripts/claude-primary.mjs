// Claude as the Worker's primary AI provider (worker.js callClaude), with Claude and Gemini answered by this test through
// /api/ai. Checks: with ANTHROPIC_API_KEY set Claude answers first (Gemini isn't called); chat and the tracker use Haiku,
// grading and trainer tools Sonnet (with the server-side refusal fallback); turns alternate and start and end with the user;
// no temperature is sent; a rate limit, a rejected key, a refusal or a Claude that can't be reached hands over to the Gemini
// pool, and Claude rests after a limit instead of being asked every request; with no Gemini key a Claude limit is a 429;
// without ANTHROPIC_API_KEY nothing goes to Claude.
// Usage: node .github/scripts/claude-primary.mjs   (from the repository root; no browser, nothing outside this machine)
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
const base = { LSH_KV: KV, ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) }, SESSION_SECRET: 'ci-only-secret' };

let mode = 'ok', claude = [], gemini = 0;
globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
        claude.push({ body: JSON.parse(init.body), headers: init.headers });
        if (mode === 'down') throw new Error('connection reset');
        if (mode === '429') return new Response(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'Rate limited' } }), { status: 429, headers: { 'retry-after': '30' } });
        if (mode === '401') return new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401 });
        if (mode === 'refusal') return new Response(JSON.stringify({ content: [], stop_reason: 'refusal' }), { status: 200 });
        return new Response(JSON.stringify({ model: JSON.parse(init.body).model, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'from Claude' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
    }
    if (/generativelanguage\.googleapis\.com/.test(u)) { gemini++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'from Gemini' }] }, finishReason: 'STOP' }] }), { status: 200 }); }
    throw new Error('unexpected request: ' + u);
};
const ask = async (worker, env, feature, messages = [{ role: 'user', content: 'The trainee\'s calendar' }]) => {
    const res = await worker.fetch(new Request('http://localhost/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, system: 'Review this', messages, max_tokens: 200 }) }), env, { waitUntil() {} });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, text: j.content ? j.content.map(c => c.text).join('') : '', provider: j.provider, error: j.error ? (j.error.message || j.error) : '' };
};
const both = { ...base, ANTHROPIC_API_KEY: 'sk-test', GEMINI_API_KEY5: 'K5' };
const reset = (m = 'ok') => { mode = m; claude = []; gemini = 0; };

let w = await fresh(); reset();
let o = await ask(w, both, 'chat', [{ role: 'assistant', content: 'Hello, how can I help?' }, { role: 'user', content: [{ type: 'text', text: 'I need' }] }, { role: 'user', content: 'an appointment' }]);
const b = claude[0] && claude[0].body;
check(o.status === 200 && o.text === 'from Claude' && o.provider === 'claude' && gemini === 0, `Claude answers first and Gemini isn't called (${o.status} ${o.text || o.error})`);
check(b && b.model === 'claude-haiku-5-5' && b.output_config.effort === 'low' && !('temperature' in b) && b.system === 'Review this', `chat uses Haiku at low effort, no temperature (${b && b.model})`);
check(b && b.messages.map(m => m.role).join() === 'user,assistant,user' && b.messages[2].content === 'I need\n\nan appointment', 'turns alternate, start and end with the user, and same-role lines are joined');
check(claude[0].headers['anthropic-version'] === '2026-10-21' && claude[0].headers['x-api-key'] === 'sk-test', 'the key and API version are sent');

reset(); await ask(w, both, 'tracker');
check(claude[0].body.model === 'claude-haiku-5-5', 'the tracker uses Haiku');
reset(); await ask(w, both, 'grading');
check(claude[0].body.model === 'claude-sonnet-5-5' && claude[0].body.output_config.effort === 'medium' && claude[0].body.fallbacks === 'default' && claude[0].headers['anthropic-beta'] === 'server-side-fallback-2026-07-01', 'grading uses Sonnet at medium effort with the server-side fallback');
reset(); await ask(w, { ...both, CLAUDE_GRADING_MODEL: 'claude-opus-5-5' }, 'grading');
check(claude[0].body.model === 'claude-opus-5-5' && !claude[0].body.fallbacks, 'CLAUDE_GRADING_MODEL changes the grading model');

for (const [m, label] of [['429', 'a rate limit'], ['401', 'a rejected key'], ['refusal', 'a refusal'], ['down', 'a Claude that can\'t be reached']]) {
    w = await fresh(); reset(m);
    o = await ask(w, both, 'chat');
    check(o.status === 200 && o.text === 'from Gemini' && gemini === 1, `${label} hands over to the Gemini pool (${o.status} ${o.text || o.error})`);
}
w = await fresh(); reset('429');
await ask(w, both, 'chat'); await ask(w, both, 'chat');
check(claude.length === 1 && gemini === 2, `Claude rests after a limit instead of being asked every request (asked ${claude.length} times)`);

w = await fresh(); reset('429');
o = await ask(w, { ...base, ANTHROPIC_API_KEY: 'sk-test' }, 'chat');
check(o.status === 429 && /rate limit/.test(o.error), `with no Gemini key, a Claude limit is a 429 the page can retry (${o.status} ${o.error})`);
w = await fresh(); reset();
o = await ask(w, { ...base, ANTHROPIC_API_KEY: 'sk-test' }, 'chat');
check(o.status === 200 && o.text === 'from Claude', 'Claude alone (no Gemini key) is enough');
w = await fresh(); reset();
o = await ask(w, { ...base, GEMINI_API_KEY5: 'K5' }, 'chat');
check(o.status === 200 && o.text === 'from Gemini' && claude.length === 0, 'without ANTHROPIC_API_KEY nothing goes to Claude');

console.log(failures.length ? `\n${failures.length} failed` : '\nClaude primary-provider test passed (Claude first; Haiku for chat, Sonnet for grading; Gemini takes over on a limit, a rejected key, a refusal or no connection).');
process.exit(failures.length ? 1 : 0);
