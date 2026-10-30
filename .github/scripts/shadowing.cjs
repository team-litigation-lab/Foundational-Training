// 👥 Shadowing log and the day's Hubstaff To-Do (js/ft-todo.js): every day's To-Do line in the guide's wording, the
//   shadowing line on the shadowing days, 📋 Copy in the 🛠 Practice Lab; a part-filled log saved but not
//   counted and a full one counted, saved in shadow:<id> and on 🏅 My Performance; the trainer sets a day's buddy
//   and wording (settings:todo) and reads the write-ups; the worker keeps shadow:<id> the trainee's own.
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
  const shadowDays = Object.keys(await page.evaluate(() => FTShadow.shadowDays)).map(Number);
  if (JSON.stringify(shadowDays) !== JSON.stringify([11, 14, 15, 16])) fail(`the shadowing days are ${JSON.stringify(shadowDays)}`);
  shadowDays.forEach(d => { if (!/^Shadowing .+ Role \(buddy’s name\)$/.test(lines[d][1] || '')) fail(`Day ${d} has no shadowing line: ${JSON.stringify(lines[d])}`); });
  if (lines[16][1] !== 'Shadowing Provider Communication Role (buddy’s name)') fail(`Day 16's shadowing line is ${lines[16][1]}`);
  if ((lines[8] || []).length !== 1 || (lines[7] || []).length !== 1) fail('a day with no shadowing session has a shadowing line');

  // the day map points to the log on every shadowing day
  const steps = await page.evaluate(() => [1, 11, 14, 15, 16].map(d => (FTDays.of(d).items || []).some(x => x.at === 'tool' && x.id === 'shadowing')));
  if (steps.some(x => !x)) fail(`not every shadowing day points to the log: ${JSON.stringify(steps)}`);

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
  await page.evaluate(() => FTShadow.open(11)); await page.waitForTimeout(1200);

  await page.fill('#sh_who', 'The claims specialist on duty');
  await page.fill('#sh_date', '2026-10-14');
  await page.click('text=💾 Save this log'); await page.waitForTimeout(1300);
  let rec = await get('shadow:' + id);
  if (!rec || !rec.logs['11'] || rec.logs['11'].role !== 'Insurance Communication') fail(`the part-filled log wasn't saved with its role: ${JSON.stringify(rec)}`);
  if (!/Still to fill in/.test(await page.evaluate(() => document.querySelector('.td-form').innerText))) fail('a part-filled log doesn\'t say what is left');

  // filled in, it counts
  await page.fill('#sh_did', 'Took three calls on the intake line, opened the CMS lead first, asked the accident questions in order, then entered everything into the fields while still on the call.');
  await page.fill('#sh_learned', 'She repeats the callback number back twice, and writes the date of loss before anything else.');
  await page.fill('#sh_asked', 'I asked how she handles a caller who already has a lawyer; she flags it and passes it to the attorney without advising.');
  await page.fill('#sh_apply', 'Confirm the callback number twice on every call.');
  await page.click('text=💾 Save this log'); await page.waitForTimeout(1300);
  if (!/✓ Logged/.test(await page.evaluate(() => document.querySelector('.td-form').innerText))) fail('a full log doesn\'t count as logged');
  if (!(await page.evaluate(() => FTShadow.done(FTShadow.state().rec.logs[11])))) fail('the page doesn\'t count the full log as done');
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!/Shadowing sessions logged[\s\S]*1 of 4/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the shadowing log');

  // the trainer: the buddy's name and a note, then reading the write-up
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'shadowing'; FTShadowAdmin.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(b => FTShadowAdmin.batch(b), BATCH); await page.waitForTimeout(400);
  await page.fill('#tdaBuddy', 'A. Buddy');
  await page.fill('#tdaNote', 'The session starts at 2:00 PM; recorded videos if no buddy is free.');
  await page.fill('#tdaVideos', 'Claims shadowing, part 1 | https://drive.google.com/file/d/1abcdefghijk/view');
  await page.click('text=💾 Save Day 11'); await page.waitForTimeout(1300);
  const st = await get('settings:todo');
  if (!st || !st.days['11'] || st.days['11'].buddy !== 'A. Buddy') fail(`the buddy's name wasn't saved: ${JSON.stringify(st)}`);
  const grid = await page.evaluate(() => (document.querySelector('.td-atbl') || {}).innerText || '');
  if (!/Sam Shadow/.test(grid) || !/✓/.test(grid)) fail(`the trainer's grid doesn't mark the logged session: ${grid.slice(0, 250)}`);
  await page.locator('.td-atbl tbody tr').first().locator('td:last-child button').click(); await page.waitForTimeout(600);
  const read = await page.evaluate(() => (document.querySelector('.td-alog') || {}).innerText || '');
  if (!/complete/.test(read) || !/callback number back twice/.test(read)) fail(`the trainer can't read the write-up: ${read.slice(0, 250)}`);

  // the trainee sees the buddy's name and the note
  await page.evaluate(() => { state.isAdmin = false; state.adminData = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);
  await page.evaluate(() => FTShadow.open(11)); await page.waitForTimeout(1200);
  const td = await page.evaluate(() => (document.querySelector('.td-card') || {}).innerText || '');
  const links = await page.evaluate(() => [...document.querySelectorAll('.td-vids a')].map(a => [a.innerText.replace(' ↗', ''), a.getAttribute('href')]));
  if (links.length !== 1 || links[0][0] !== 'Claims shadowing, part 1' || !links[0][1].includes('/file/d/1abcdefghijk')) fail(`the shadowing videos aren't linked by title: ${JSON.stringify(links)}`);
  if (!/To-Do: Shadowing Insurance Communication Role \(A\. Buddy\)/.test(td)) fail(`the trainee doesn't see the buddy's name: ${td.slice(0, 250)}`);
  if (!/starts at 2:00 PM/.test(td)) fail('the trainee doesn\'t see the trainer\'s note');

  await put('shadow:' + id, null); await put('settings:todo', null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await put('settings:opendays', openWas || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Shadowing & To-Do test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Shadowing & To-Do test passed (every day\'s To-Do in the guide\'s wording and the shadowing days\' lines, each day\'s own activities and the Process Questions of the lesson it discusses (Calendaring\'s absent sheet said so, not offered), the Practice Lab\'s To-Do with Copy and the Dashboard\'s lesson grid still on one screen; a part-filled log saved but not counted, a full one counted, saved and on My Performance; the trainer setting the buddy and note and reading the write-up, which the trainee then sees; the worker\'s rules).');
})().catch(e => { console.error(e); process.exit(1); });
