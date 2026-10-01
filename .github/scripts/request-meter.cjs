// The server request meter on this site (README → Server request meter):
// 1. /api/request-budget (worker.js, in secure mode): admins only (a trainee is refused, no token is
//    401); before the Request budget workflow (EA-PA-TRAINING) has run it answers usage: null; after,
//    the month's numbers as the workflow saved them to KV ("_request-usage"; not this course's prefix:
//    every LSH site reads the same key), without the workflow's own working data.
// 2. In a browser (the page from .github/scripts/server.mjs): a trainee's page has no meter and never
//    asks for it; an admin's page asks once and shows it ("Not set up" from the local server, which has
//    no numbers; then the numbers from a stand-in reply).
// The meter itself (every level, the note, the details): request-meter-widget.cjs.
// Usage: node .github/scripts/request-meter.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const path = require('path'); const { pathToFileURL } = require('url');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
const DAY = 86400000;
const start = Math.floor(Date.now() / DAY) * DAY - 5 * DAY;
const SNAPSHOT = {
    v: 1, at: new Date(Date.now() - 10 * 60000).toISOString(),
    month: { start: new Date(start).toISOString().slice(0, 10), end: new Date(start + 30 * DAY).toISOString().slice(0, 10) },
    total: 2497500, limit: 9990000, included: 10000000, projected: 13600000, paused: false, pausedAt: null,
    sites: [{ kind: 'worker', name: 'ea-pa-training', requests: 2497500 }], days: {}, notes: [],
    cache: { through: new Date(start).toISOString(), scripts: [], days: {} }
};

async function workerChecks() {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const store = new Map();
    const env = {
        ADMIN_PASSPHRASE: 'ci-pass', SESSION_SECRET: 'ci-secret',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) }
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const t = ((await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body || {}).token;
    const a = ((await call('/api/auth/admin', { passphrase: 'ci-pass' })).body || {}).token;
    if (!t || !a) return fail(`signing in for the endpoint checks failed (trainee ${!!t}, admin ${!!a})`);
    if ((await call('/api/request-budget', {}, null)).status !== 401) fail('/api/request-budget answers without signing in');
    if ((await call('/api/request-budget', {}, t)).status !== 403) fail('/api/request-budget answers a trainee');
    const none = await call('/api/request-budget', {}, a);
    if (none.status !== 200 || !none.body || none.body.usage !== null) fail(`before the workflow has run: ${JSON.stringify(none)}`);
    store.set('_request-usage', JSON.stringify(SNAPSHOT));
    const some = await call('/api/request-budget', {}, a);
    if (!some.body || !some.body.usage || some.body.usage.total !== 2497500 || 'cache' in some.body.usage) fail(`the month's numbers: ${JSON.stringify(some.body)}`);
}

(async () => {
    await workerChecks();

    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    const asked = [];
    page.on('request', r => { if (new URL(r.url()).pathname === '/api/request-budget') asked.push(Date.now()); });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    if (await page.$('#rqb-chip') || asked.length) fail(`a trainee's page shows the meter or asks for it (${asked.length} requests)`);

    // an admin: one request to this site's server (no numbers there yet: "Not set up")
    await page.evaluate(() => { state.isAdmin = true; });
    await page.waitForSelector('#rqb-chip', { timeout: 5000 }).catch(() => fail('an admin\'s page doesn\'t show the meter'));
    await page.waitForTimeout(800);
    const text = () => page.evaluate(() => { const c = document.getElementById('rqb-chip'); return c ? c.textContent.replace(/\s+/g, ' ').trim() + ' | ' + c.className : ''; });
    if (!/Not set up/.test(await text())) fail(`an admin's meter with no numbers yet: "${await text()}"`);
    if (asked.length !== 1) fail(`an admin's page asked for the meter ${asked.length} times on opening (expected 1)`);

    // with numbers
    await page.route('**/api/request-budget', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, usage: Object.assign({}, SNAPSHOT, { cache: undefined }) }) }));
    await page.evaluate(() => RequestBudget.refresh()); await page.waitForTimeout(300);
    if (!/Requests 25%/.test(await text()) || !/rqb-warn/.test(await text())) fail(`an admin's meter: "${await text()}" (expected 25%, amber: this pace runs out before the month ends)`);
    await page.click('#rqb-chip');
    if (!/2,497,500/.test(await page.textContent('#rqb-panel'))) fail('the details don\'t show the month\'s total');

    await browser.close();
    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Request meter on this site passed (admins only, on the server and the page; one request; the month\'s numbers).');
})().catch(e => { console.error(e); process.exit(1); });
