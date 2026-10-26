// 🧪 The daily Typing and Spelling Tests, taken on the platform (js/ft-skilltests.js):
//   worker.js keeps skills:<id> append-only — a trainee's new results are added with the server's time, a result
//   already logged can't be changed or backdated, and nobody else's log can be written;
//   a trainee takes the typing test (pasting off) and the spelling test (the corrections shown), both saved with the
//   date and AM/PM slot; the day's card shows them; a missed slot is made up and the log says so;
//   the trainer's grid shows the batch day by day with the compliance line in the facilitator's wording; the
//   📊 Weekly Ranking's Spelling & Typing column ⤓ fills from it; 🏅 My Performance shows the averages.
// Usage: NODE_PATH=…/node_modules node .github/scripts/skilltests.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102926';
const failures = []; const fail = m => failures.push(m);
const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// the last weekday before today, n weekdays back
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const weekdayBack = n => { const d = new Date(); let k = 0; while (k < n) { d.setDate(d.getDate() - 1); if (d.getDay() !== 0 && d.getDay() !== 6) k++; } return d; };

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, t);
  const get = async k => JSON.parse(((await call('/api/storage/get', { key: k }, t)).body || {}).value || 'null');
  const first = { id: 'aaa1', at: '2020-01-01T00:00:00Z', date: '2026-10-12', slot: 'AM', net: 40, gross: 44, acc: 95, errors: 3, chars: 220, secs: 60 };
  if ((await set('skills:ana-cruz--b1', { typing: [first], spelling: [] })).status !== 200) fail('a trainee can\'t save their own test log');
  let rec = await get('skills:ana-cruz--b1');
  if (!rec || rec.typing.length !== 1 || rec.typing[0].at.startsWith('2020')) fail(`the worker didn't stamp the server's time on a new result: ${JSON.stringify(rec)}`);
  const stamped = rec.typing[0].at;
  // rewrite the old result, backdate it, and add a new one with an absurd speed
  await set('skills:ana-cruz--b1', { typing: [Object.assign({}, first, { net: 99, at: '2019-01-01T00:00:00Z' }), { id: 'bbb2', date: '2026-10-12', slot: 'PM', net: 9999, acc: 250 }], spelling: [] });
  rec = await get('skills:ana-cruz--b1');
  if (rec.typing.length !== 2 || rec.typing[0].net !== 40 || rec.typing[0].at !== stamped) fail(`a result already logged was changed: ${JSON.stringify(rec.typing[0])}`);
  if (rec.typing[1].net !== 300 || rec.typing[1].acc !== 100) fail(`a new result's numbers weren't kept in range: ${JSON.stringify(rec.typing[1])}`);
  // a trainee can't drop entries either
  await set('skills:ana-cruz--b1', { typing: [], spelling: [] });
  if ((await get('skills:ana-cruz--b1')).typing.length !== 2) fail('a trainee deleted results from their log');
  if ((await set('skills:ben-diaz--b1', { typing: [first] })).status === 200) fail('a trainee wrote another trainee\'s test log');
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
  await signIn(page, 'Tia', 'Typist', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  // an older day with only the morning typing test: its PM and its spelling test are missing
  const old = weekdayBack(2), oldK = key(old), oldMD = `${old.getMonth() + 1}/${old.getDate()}`;
  await put('skills:' + id, { typing: [{ id: 'seed1', at: old.toISOString(), date: oldK, slot: 'AM', net: 45, gross: 47, acc: 97, errors: 1, chars: 230, secs: 60 }], spelling: [] });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1800);

  // the tests have their own page: no Skill Building section on the Practice Lab; the orientation's and the day map's way in opens them
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);
  if (await page.$('#fts-skills') || /Skill Building/.test(await page.evaluate(() => [...document.querySelectorAll('.fts-group h2')].map(h => h.textContent).join('|')))) fail('the Practice Lab still has a Skill Building section');
  await page.evaluate(() => ftsGotoSkills()); await page.waitForTimeout(1200);
  if (await page.evaluate(() => state.view) !== 'skills') fail('ftsGotoSkills() didn\'t open #/skills');

  // ⌨ typing: pasting is off; the passage typed in full ends the test and saves it
  await page.click('text=Start the typing test'); await page.waitForTimeout(300);
  const passage = await page.evaluate(() => FTSkills.run().passage);
  await page.evaluate(() => { const t = document.getElementById('stType'); const ev = new ClipboardEvent('paste', { cancelable: true, bubbles: true }); t.dispatchEvent(ev); window.__pasteBlocked = ev.defaultPrevented; });
  if (!(await page.evaluate(() => window.__pasteBlocked))) fail('pasting into the typing test isn\'t blocked');
  await page.click('#stType'); await page.keyboard.type(passage.slice(0, 40)); await page.keyboard.type('X'); await page.keyboard.press('Backspace');
  await page.keyboard.type(passage.slice(40)); await page.waitForTimeout(1500);
  const tres = await page.evaluate(() => FTSkills.run() && FTSkills.run().done);
  if (!tres || tres.acc !== 100 || tres.net <= 0) fail(`the typing test didn't finish with its result: ${JSON.stringify(tres)}`);
  await page.click('text=Done'); await page.waitForTimeout(800);

  // 🔤 spelling: 15 words, two typed wrong
  await page.click('text=Start the spelling test'); await page.waitForTimeout(300);
  const words = await page.evaluate(() => FTSkills.run().words.map(w => w[0]));
  if (words.length !== 15) fail(`the spelling test has ${words.length} words, not 15`);
  for (let i = 0; i < words.length; i++) { await page.fill('#stSpell', i < 2 ? words[i] + 'x' : words[i]); await page.press('#stSpell', 'Enter'); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  const sres = await page.evaluate(() => FTSkills.run() && FTSkills.run().done);
  if (!sres || sres.score !== 13 || sres.missed.length !== 2 || sres.missed[0].word !== words[0]) fail(`the spelling test's score and corrections are wrong: ${JSON.stringify(sres)}`);
  if (!/You typed/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the spelling result doesn\'t show the corrections');
  await page.click('text=Done'); await page.waitForTimeout(800);
  let rec = await get('skills:' + id);
  const today = key(new Date()), slot = new Date().getHours() < 12 ? 'AM' : 'PM';
  const t1 = (rec.typing || []).find(x => x.date === today), s1 = (rec.spelling || []).find(x => x.date === today);
  if (!t1 || t1.slot !== slot || t1.acc !== 100) fail(`the typing result wasn't saved with today's date and slot: ${JSON.stringify(t1)}`);
  if (!s1 || s1.score !== 13 || s1.total !== 15) fail(`the spelling result wasn't saved: ${JSON.stringify(s1)}`);
  const todayCard = await page.evaluate(() => (document.querySelector('.st-today') || {}).innerText || '');
  if (!new RegExp(`Typing · ${slot}\\s*\\n?\\s*\\d+ WPM`).test(todayCard) || !/13 \/ 15/.test(todayCard)) fail(`today's card doesn't show the tests taken: ${todayCard}`);

  // ↺ the missed PM typing test of that older day, made up now
  const chip = `.st-makeup >> text=⌨ Typing · ${oldMD} PM`;
  if (!(await page.$(chip))) fail(`the missed ${oldMD} PM typing test isn't offered as a make-up`);
  else {
    await page.click(chip); await page.waitForTimeout(300);
    const p2 = await page.evaluate(() => FTSkills.run().passage);
    await page.click('#stType'); await page.keyboard.type(p2); await page.waitForTimeout(1500);
    await page.click('text=Done'); await page.waitForTimeout(800);
    rec = await get('skills:' + id);
    if (!(rec.typing || []).some(x => x.makeup === `${oldK} PM`)) fail('the make-up wasn\'t saved against the missed slot');
    if (await page.$(chip)) fail('a slot already made up is still offered');
  }

  // 🧑‍🏫 the trainer's grid and the compliance line
  const from = oldK, to = today;
  const line = await page.evaluate(([f, t]) => FTSkills.complianceText(FTSkills.record(), f, t), [from, to]);
  // the seeded day lacks its spelling test, and every weekday after it up to yesterday lacks all three; today doesn't count yet
  const gap = []; for (let d = new Date(old); key(d) < today; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0 && d.getDay() !== 6) gap.push(key(d));
  const wantSp = gap.length, wantTy = (gap.length - 1) * 2;
  const sp = new RegExp(`^Spelling Test – Complied; however, lacking ${wantSp} entr(y|ies) \\(`), ty = wantTy ? new RegExp(`Typing Test – Complied; however, lacking ${wantTy} entr`) : /Typing Test – Complete \(1 made up\)/;
  if (!sp.test(line) || !ty.test(line)) fail(`the compliance line isn't in the facilitator's wording: ${line}`);
  if (line.includes(md(new Date()))) fail(`today's slots count as missing before the day is over: ${line}`);
  if (line.includes(`${oldMD} PM`)) fail(`the made-up slot is still listed as lacking: ${line}`);
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'skilltests'; goto('admin'); }); await page.waitForTimeout(2500);
  await page.evaluate(b => FTSkills.batch(b), BATCH); await page.waitForTimeout(500);
  await page.evaluate(([f, t]) => { FTSkills.range('from', f); FTSkills.range('to', t); }, [from, to]); await page.waitForTimeout(500);
  const grid = await page.evaluate(() => ([...document.querySelectorAll('.st-grid tbody tr')].find(r => /Tia Typist/.test(r.innerText)) || {}).innerText || '');
  if (!/Tia Typist/.test(grid) || !/Spelling Test – Complied; however, lacking/.test(grid)) fail(`the trainer's grid doesn't show the trainee and the compliance line: ${grid.slice(0, 300)}`);
  if (!(await page.$('.st-grid i.mk'))) fail('the grid doesn\'t mark the made-up slot');

  // 📊 the Weekly Ranking's Spelling & Typing column fills from the log
  await put(`ranking:${BATCH}:w1`, null);
  await page.evaluate(() => { state.adminTab = 'ranking'; FTRanking.reload(); render(); }); await page.waitForTimeout(2500);
  await page.evaluate(b => FTRanking.batch(b), BATCH); await page.waitForTimeout(1500);
  await page.evaluate(() => FTRanking.start('week1')); await page.waitForTimeout(600);
  await page.evaluate(sub => FTRanking.col(0, 'sub', sub), `${oldMD} to ${md(new Date())}`); await page.waitForTimeout(400);
  await page.evaluate(() => FTRanking.fill()); await page.waitForTimeout(2500);
  const rk = await get(`ranking:${BATCH}:w1`);
  const c0 = rk && rk.cols[0], cell = c0 && rk.rows && rk.rows[id] && rk.rows[id].cells[c0.id];
  if (!cell || cell.note !== line) fail(`the ranking's Spelling & Typing column didn't fill from the log: ${JSON.stringify(cell)} vs ${line}`);

  // 🏅 My Performance
  await page.evaluate(([tid]) => { state.isAdmin = false; state.traineeId = tid; }, [id]);
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  const sc = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Typing & Spelling/.test(sc) || !/target 60 WPM/.test(sc) || !/Spelling Test/.test(sc)) fail('🏅 My Performance has no Typing & Spelling scores');

  await put('skills:' + id, null); await put(`ranking:${BATCH}:w1`, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Typing & Spelling test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Typing & Spelling test passed (the log append-only with the server\'s time, results kept in range, no deleting, no writing another\'s; no Skill Building section on the Practice Lab, ftsGotoSkills() opens the tests; typing with pasting off, saved with the date and slot; spelling with the corrections; today\'s card; a missed slot made up; the trainer\'s grid and the compliance line in the facilitator\'s wording; the Weekly Ranking\'s column filled from it; My Performance).');
})().catch(e => { console.error(e); process.exit(1); });
