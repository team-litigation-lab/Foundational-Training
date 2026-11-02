// 📋 The day's Hubstaff To-Do (js/ft-todo.js): every day's To-Do line in the guide's wording, and no shadowing anywhere
//   (no shadowing day, To-Do line, day step, log or 🏅 My Performance row: shadowing is off the training); the trainer
//   sets a day's note (settings:todo) and the trainee sees it; the worker keeps shadow:<id> the trainee's own.
// Usage: NODE_PATH=…/node_modules node .github/scripts/shadowing.cjs http://localhost:8787/
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
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  if ((await set('shadow:ana-cruz--b1', { logs: { 11: { who: 'The claims specialist' } } })).status !== 200) fail('a trainee can\'t save their own shadowing log');
  if ((await set('shadow:ana-cruz--b1', { logs: [] })).status === 200) fail('a shadowing log whose logs is a list was saved');
  if ((await set('shadow:ben-diaz--b1', { logs: {} })).status === 200) fail('a trainee wrote another trainee\'s shadowing log');
  if ((await set('settings:todo', { days: {} })).status === 200) fail('a trainee changed the day\'s To-Do wording');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if ((await set('settings:todo', { days: { 11: { buddy: 'A. Buddy' } } }, at)).status !== 200) fail('the trainer can\'t save the To-Do wording');
  else if (!JSON.parse(((await call('/api/storage/get', { key: 'settings:todo' }, t)).body || {}).value || 'null')) fail('a trainee can\'t read the To-Do wording');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await put('settings:todo', null);
  // the days' tools open with their lessons (🔓 js/ft-day-locks.js): open every lesson for this test, and put it back after
  const openWas = await get('settings:opendays');
  await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} });
  await signIn(page, 'Sam', 'Shadow', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('shadow:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);

  // 🛠 Practice Lab: no Shadowing & To-Do section (the To-Do and the shadowing log keep their own page)
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1500);
  if (await page.evaluate(() => [...document.querySelectorAll('.fts-group h2')].some(h => /Shadowing & the day/.test(h.textContent)))) fail('the Practice Lab still has the Shadowing & To-Do section');
  // the 📚 Dashboard keeps its one-screen lesson grid: nothing of ours is added above it
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
  const over = await page.evaluate(() => { const g = document.querySelector('.module-grid'); return g ? g.scrollHeight - g.clientHeight : 0; });
  if (over > 2) fail(`the Dashboard's lessons overflow by ${over}px`);

  // every day's line, and the shadowing line on the shadowing days
  const lines = await page.evaluate(() => { const out = {}; (FTDays.DAYS || []).forEach(d => { out[d.day] = FTShadow.lines(d.day); }); return out; });
  const want = {
    1: 'Classroom Discussion: Virtual Assistant Essentials - Day 1', 2: 'Classroom Discussion: Virtual Assistant Essentials - Day 2',
    3: 'Classroom Discussion: Reception Training Day 1', 5: 'Classroom Discussion: Reception Training Day 3',
    6: 'Classroom Discussion: Calendar Management Training', 7: 'Classroom Discussion: Intake Training Day 1',
    11: 'Classroom Discussion: Insurance Communication Training Day 2', 16: 'Classroom Discussion: Provider Communication Training Day 4' };
  Object.entries(want).forEach(([d, t]) => { if (lines[d][0] !== t) fail(`Day ${d}'s To-Do is “${lines[d][0]}”, expected “${t}”`); });
  // no shadowing: no shadowing day, no shadowing To-Do line, and no day step that points to a shadowing log
  const shadowDays = Object.keys(await page.evaluate(() => FTShadow.shadowDays));
  if (shadowDays.length) fail(`there are still shadowing days: ${JSON.stringify(shadowDays)}`);
  Object.entries(lines).forEach(([d, l]) => { if (l.length !== 1 || /shadow/i.test(l.join(' '))) fail(`Day ${d}'s To-Do lines aren't just its discussion: ${JSON.stringify(l)}`); });
  const shSteps = await page.evaluate(() => (FTDays.DAYS || []).filter(d => (d.items || []).some(x => x.id === 'shadowing' || /^Shadowing|Demo and Shadowing/i.test(x.t))).map(d => d.day));
  if (shSteps.length) fail(`days still have a shadowing step: ${JSON.stringify(shSteps)}`);
  const shRows = await page.evaluate(() => { const out = []; for (let d = 1; d <= 16; d++) { (FTDayDecks.list(d) || []).forEach(x => { if (/^(AM: |PM: )?Shadowing Session|Recorded Shadowing/i.test(x.h || '')) out.push(d + ':' + x.h); }); } return out; });
  if (shRows.length) fail(`a deck still has a shadowing slide: ${JSON.stringify(shRows)}`);

  // no recorded shadowing videos ship with any day (Day 7's intake shadowing videos are off the training), and Day 7 has
  // no shadowing session or step
  const vids = await page.evaluate(() => [7, 11, 14, 15, 16].map(d => FTShadow.videos(d).length));
  if (vids.some(Boolean)) fail(`a day still ships shadowing videos: ${JSON.stringify(vids)}`);
  if (await page.evaluate(() => (FTDays.of(7).items || []).some(x => x.id === 'shadowing'))) fail('Day 7 still points to the shadowing log');

  // the trainee's log: part-filled doesn't count
  // (its way in is a shadowing slide's 👥 Shadowing log: FTShadow.open(day))
  await page.evaluate(() => goto('shadowing')); await page.waitForTimeout(900);
  if (await page.evaluate(() => state.view) !== 'shadowing') fail('#/shadowing doesn\'t open');
  await page.evaluate(() => FTShadow.day(7)); await page.waitForTimeout(600);

  // every one of the 16 days shows its own activities, and the Process Questions of the lesson it discusses
  const perDay = await page.evaluate(async () => {
    const out = [];
    for (let d = 1; d <= 16; d++) { FTShadow.day(d); await new Promise(r => setTimeout(r, 140));
      const steps = document.querySelectorAll('.td-steps .td-step').length;
      const pq = [...document.querySelectorAll('.td-steps .td-pq')].map(li => ({ t: li.innerText.replace(/\s+/g, ' ').trim(), go: !!li.querySelector('button') }));
      out.push({ d, steps, pq });
    }
    return out;
  });
  perDay.forEach(x => {
    if (x.steps < 2) fail(`Day ${x.d} shows no activities of its own (${x.steps} rows)`);
    if (!x.pq.length) fail(`Day ${x.d} doesn't connect its Process Questions`);
  });
  // the sheet belongs to the day's lesson, and opens from the day
  const d7 = perDay.find(x => x.d === 7).pq[0];
  if (!/Intake Specialist Training/.test(d7.t) || !d7.go) fail(`Day 7's Process Questions row isn't its lesson's sheet: ${JSON.stringify(d7)}`);
  // Calendaring (Lesson 5) has no sheet in the guide: the row says so instead of opening an empty page
  const cal = perDay.find(x => x.d === 6).pq[0];
  if (cal.go || !/no sheet for this lesson/.test(cal.t)) fail(`Day 6 offers a Calendaring sheet that doesn't exist: ${JSON.stringify(cal)}`);
  await page.evaluate(() => FTShadow.day(7)); await page.waitForTimeout(500);
  await page.locator('.td-pq button').first().click(); await page.waitForTimeout(1200);
  if (await page.evaluate(() => state.view) !== 'process') fail('the day\'s Process Questions row doesn\'t open ✍️ Knowledge Check');
  if (await page.evaluate(() => Number(state.pqLesson)) !== 6) fail(`it opens lesson ${await page.evaluate(() => state.pqLesson)}, not Day 7's own lesson`);
  // the page has no shadowing log, and 🏅 My Performance no shadowing row
  await page.evaluate(() => FTShadow.open(11)); await page.waitForTimeout(1200);
  if (await page.evaluate(() => !!document.querySelector('#sh_who, .td-form'))) fail('the To-Do page still has a shadowing log');
  if (/shadow/i.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the To-Do page still mentions shadowing');
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (/Shadowing/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance still shows shadowing');

  // the trainer: a note for the day, which the trainee then sees
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'shadowing'; FTShadowAdmin.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  if (await page.evaluate(() => !!document.querySelector('#tdaBuddy, #tdaVideos, .td-atbl'))) fail('the trainer\'s To-Do tab still has the shadowing buddy, videos or write-ups');
  await page.fill('#tdaNote', 'Set it before the 8:00 AM session.');
  await page.click('text=💾 Save Day 11'); await page.waitForTimeout(1300);
  const st = await get('settings:todo');
  if (!st || !st.days['11'] || !/8:00 AM/.test(st.days['11'].note || '')) fail(`the day's note wasn't saved: ${JSON.stringify(st)}`);
  await page.evaluate(() => { state.isAdmin = false; state.adminData = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.evaluate(() => FTShadow.open(11)); await page.waitForTimeout(1200);
  const td = await page.evaluate(() => (document.querySelector('.td-card') || {}).innerText || '');
  if (!/To-Do: Classroom Discussion: Insurance Communication Training Day 2/.test(td) || /Shadowing/.test(td)) fail(`Day 11's To-Do card isn't just its discussion: ${td.slice(0, 250)}`);
  if (!/8:00 AM session/.test(td)) fail('the trainee doesn\'t see the trainer\'s note');

  await put('shadow:' + id, null); await put('settings:todo', null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await put('settings:opendays', openWas || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Shadowing & To-Do test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Shadowing & To-Do test passed (every day\'s To-Do in the guide\'s wording and no shadowing anywhere, each day\'s own activities and the Process Questions of the lesson it discusses (Calendaring\'s absent sheet said so, not offered), the Practice Lab\'s To-Do with Copy and the Dashboard\'s lesson grid still on one screen; no shadowing log or My Performance row; the trainer\'s note for a day, which the trainee then sees; the worker\'s rules).');
})().catch(e => { console.error(e); process.exit(1); });
