// 🎬 A lesson's AI discussion video (after Lesson 1, whose video the Day 1 steps open), asked for and approved per trainee (js/ft-updates.js): the lesson card's
//   🔒 Request Video writes videoreq:<id> (the trainee's own record: only lesson numbers and the server's time are kept),
//   the button then reads ⏳ Requested, the trainer approves it in Admin → 📅 Open Lessons → 🎬 Unlock Videos → Requests
//   (videoaccess:<id>, which only admins write and the trainee reads), and the card's button becomes 🎬 Video.
// Usage: NODE_PATH=…/node_modules node .github/scripts/video-access.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102926';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, {}); let b = null; try { b = await res.json(); } catch (e) {} return { status: res.status, body: b }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  const read = async (k, tok) => JSON.parse(((await call('/api/storage/get', { key: k }, tok || t)).body || {}).value || 'null');
  if ((await set('videoreq:ana-cruz--b1', { lessons: { 2: { at: '1999-01-01' }, evil: { at: 'x' } }, extra: 1 })).status !== 200) fail('a trainee can\'t ask for a video');
  const req = await read('videoreq:ana-cruz--b1');
  if (!req || !req.lessons || !req.lessons['2'] || req.lessons.evil || req.extra || req.lessons['2'].at === '1999-01-01') fail(`the request isn't kept as lesson numbers with the server's time: ${JSON.stringify(req)}`);
  if ((await set('videoaccess:ana-cruz--b1', { lessons: { 2: {} } })).status === 200) fail('a trainee approved their own video');
  if ((await set('videoaccess:ana-cruz--b1', { lessons: { 2: { at: 'now' } } }, at)).status !== 200) fail('the trainer can\'t approve a video');
  if (!((await read('videoaccess:ana-cruz--b1')) || { lessons: {} }).lessons['2']) fail('a trainee can\'t read the video the trainer approved for them');
  if ((await set('videoreq:someone-else--b1', { lessons: { 2: {} } })).status === 200) fail('a trainee asked for a video in someone else\'s name');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Vida', 'Video', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('videoreq:' + id, { lessons: {} }); await put('videoaccess:' + id, { lessons: {} });
  const vidsBefore = await get('settings:openvideos');
  await put('settings:openvideos', { all: [], batches: {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1500);
  const btn = () => page.evaluate(() => { const b = [...document.querySelectorAll('#dayl-2 .mc-grid > button')][1]; return b ? b.innerText.trim() : ''; });
  // Day 1's video is never asked for: it opens with the trainer's Handouts and Videos unlock (js/ft-day1-flow.js; the
  // test server starts with Day 1 unlocked to its end)
  const l1 = await page.evaluate(() => { const b = [...document.querySelectorAll('#dayl-1 .mc-grid > button')][1]; return b ? b.innerText.trim() : ''; });
  if (/Request/.test(l1)) fail(`Lesson 1's video offers a request: "${l1}"`);
  if (!/Request Video/.test(await btn())) fail(`a locked video doesn't offer 🔒 Request Video: "${await btn()}"`);
  // the trainee asks for it
  await page.click('#dayl-2 .ft-video-ask'); await page.waitForTimeout(1200);
  if (!/Requested/.test(await btn())) fail(`after asking, the button reads "${await btn()}", not ⏳ Requested`);
  if (!((await get('videoreq:' + id)) || { lessons: {} }).lessons['2']) fail('the request wasn\'t saved');
  // the trainer sees it under Requests and approves it
  await page.evaluate(() => { state.isAdmin = true; state.adminData = null; goto('admin'); state.adminTab = 'opendays'; render(); }); await page.waitForTimeout(3000);
  const adm = await page.evaluate(() => (document.querySelector('.ft-vreqs') || {}).innerText || '');
  if (!/Vida Video/.test(adm) || !/Approve/.test(adm)) fail(`the trainer's Requests don't list the trainee's request: ${adm.slice(0, 200)}`);
  await page.evaluate(id => ftApproveVideo(id, 2, true), id); await page.waitForTimeout(1500);
  if (!((await get('videoaccess:' + id)) || { lessons: {} }).lessons['2']) fail('the approval wasn\'t saved');
  // the trainee's card now plays it
  await page.evaluate(() => { state.isAdmin = false; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1500);
  if (!/^.?.?\s*Video$/.test(await btn()) || /Request|Requested/.test(await btn())) fail(`after the approval, the button reads "${await btn()}", not 🎬 Video`);
  if (!/Request Video/.test(await page.evaluate(() => { const b = [...document.querySelectorAll('#dayl-3 .mc-grid > button')][1]; return b ? b.innerText : ''; }))) fail('approving one lesson\'s video opened another\'s');

  await put('settings:openvideos', vidsBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Video access test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Video access test passed (the worker keeps a request to lesson numbers and the server\'s time, a trainee can\'t approve their own or ask in another\'s name; 🔒 Request Video → ⏳ Requested → the trainer\'s Requests → ✓ Approve → 🎬 Video, for that lesson only).');
})().catch(e => { console.error(e); process.exit(1); });
