// 🎮 Knowledge Games (js/ft-kcgames.js, js/ft-kcbank.js): the bank (every lesson enough for all eight games, every
//   question with four different answers and a why, every document's answer among its choices); Survey Says' matching
//   (a typo or another wording finds the answer, a wrong one doesn't); the Process Questions page points to the games;
//   a trainee plays each of the eight games to the end, and each play is saved in kcgames:<id> and shows on 🏅 My
//   Performance; the trainer adds a question and hides a built-in one (settings:kcgames) and the games play them.
// Usage: NODE_PATH=…/node_modules node .github/scripts/kcgames.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

// worker.js with real tokens: kcgames:<id> is the trainee's own (a plays list), settings:kcgames readable, admin-written
async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, t);
  if ((await set('kcgames:ana-cruz--b1', { plays: [{ lesson: 1, game: 'bomb', score: 900, correct: 8, total: 10 }] })).status !== 200) fail('a trainee can\'t save their own game plays');
  if ((await set('kcgames:ana-cruz--b1', { plays: 'lots' })).status === 200) fail('a game log without a plays list was saved');
  if ((await set('kcgames:ben-diaz--b1', { plays: [] })).status === 200) fail('a trainee wrote another trainee\'s game log');
  if ((await set('settings:kcgames', { lessons: {}, hidden: {} })).status === 200) fail('a trainee changed the games\' question bank');
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body;
  const at = admin && admin.token;
  if (!at || (await call('/api/storage/set', { key: 'settings:kcgames', value: JSON.stringify({ lessons: {}, hidden: { 'b1-mc0': true } }) }, at)).status !== 200) fail('the trainer can\'t save the games\' questions');
  else if (!JSON.parse(((await call('/api/storage/get', { key: 'settings:kcgames' }, t)).body || {}).value || 'null')) fail('a trainee can\'t read the games\' questions');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  // the games are off for trainees for now (js/ft-kcgames.js GAMES_ON): this test turns them on for itself, so the engine stays tested
  await page.addInitScript(() => { window.FT_KCGAMES_ON = true; });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await put('settings:kcgames', null);
  await signIn(page, 'Gina', 'Gameshow', 'B102926');
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('kcgames:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => { try { localStorage.setItem('ft_kc_mute', '1'); } catch (e) {} });

  // the bank: enough for every game in every lesson, and well formed
  const bank = await page.evaluate(() => {
    const out = [], B = FT_KC_BANK;
    if (Object.keys(B.lessons).length !== 9) out.push(`the bank has ${Object.keys(B.lessons).length} lessons, not 9`);
    Object.entries(B.lessons).forEach(([l, b]) => {
      if (b.mc.length < 12) out.push(`lesson ${l}: only ${b.mc.length} questions`);
      if (new Set(b.mc.map(m => m[0])).size < 4) out.push(`lesson ${l}: fewer than 4 Jeopardy categories`);
      if (b.list.length < 3) out.push(`lesson ${l}: fewer than 3 survey boards`);
      if (b.term.length < 4) out.push(`lesson ${l}: fewer than 4 terms`);
      b.mc.forEach((m, i) => { if (m[3].length !== 4 || new Set(m[3]).size !== 4 || m[4] !== 0 || !m[2] || !m[5]) out.push(`lesson ${l} question ${i}: malformed`); });
      b.list.forEach((x, i) => { if (x[1].length < 3) out.push(`lesson ${l} board ${i}: fewer than 3 answers`); });
      const P = FTKCGames.pool(Number(l));
      FTKCGames.games.forEach(g => { const ok = g.id === 'feud' ? P.list.length : g.id === 'rapid' ? P.term.length : g.id === 'reveal' ? P.docs.length : P.mc.length >= 10; if (!ok) out.push(`lesson ${l}: not enough for ${g.name}`); });
    });
    B.docs.forEach(d => { if (!d.choices.includes(d.answer) || !d.html || !d.lesson.length) out.push(`document ${d.answer}: malformed`); });
    const all = JSON.stringify(B).toLowerCase();
    if (/password|passcode|username:/.test(all)) out.push('the bank mentions a password or username');
    return out;
  });
  bank.forEach(fail);

  // Survey Says: a typo or another wording finds the answer; a wrong one doesn't
  const feud = await page.evaluate(() => {
    const L = { answers: [{ t: 'Retainer agreement', pts: 30, alt: ['retainer', 'contract'] }, { t: 'HIPAA authorization', pts: 20, alt: ['hipaa'] }, { t: 'Police report', pts: 10, alt: [] }] };
    return [FTKCGames.matchFeud(L, 'retaner'), FTKCGames.matchFeud(L, 'the contract'), FTKCGames.matchFeud(L, 'HIPPA'), FTKCGames.matchFeud(L, 'police  REPORT'), FTKCGames.matchFeud(L, 'dog'), FTKCGames.matchFeud(L, '')];
  });
  if (JSON.stringify(feud) !== JSON.stringify([0, 0, 1, 2, -1, -1])) fail(`Survey Says matching: ${JSON.stringify(feud)}`);

  // the Process Questions page points to the games
  await page.evaluate(() => goto('process', 1)); await page.waitForTimeout(1200);
  if (!(await page.$('#kgPromo'))) fail('the Process Questions page has no 🎮 Knowledge Games card');
  else { await page.click('#kgPromo button'); await page.waitForTimeout(800); }
  if (await page.evaluate(() => state.view) !== 'kcgames') fail('the card doesn\'t open the games');
  const hub = await page.evaluate(() => ({ cards: document.querySelectorAll('.kg-card:not([disabled])').length, pills: [...document.querySelectorAll('.kg-lpill')].map(x => x.innerText) }));
  if (hub.cards !== 8) fail(`the hub has ${hub.cards} playable games, not 8`);
  if (hub.pills.length !== 1 || !/^1\./.test(hub.pills[0])) fail(`a new trainee sees lessons other than the first: ${JSON.stringify(hub.pills)}`);

  // each game, played to the end: the first answer wrong, the rest right (Millionaire: five right, then a wrong one;
  //   Survey Says: three strikes on the first board, then every answer on the others)
  const play = game => page.evaluate(async game => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const S = () => FTKCGames.state().s;
    document.querySelector(`.kg-card[onclick*="'${game}'"]`).click(); await sleep(100);
    let wrong = true, life = null;
    const pick = (m, f) => { const ci = wrong ? (m.a + 1) % 4 : m.a; wrong = false; f(ci); };
    for (let step = 0; step < 400 && !S().over; step++) {
      const s = S();
      if (game === 'millionaire' && s.shown == null) {
        if (s.i === 0) { FTKCGames.fifty(); FTKCGames.audience(); const a = S().audience; life = { gone: S().gone.slice(), sum: Object.values(a).reduce((x, y) => x + y, 0), right: a[s.v.m.a], gonePct: S().gone.map(i => a[i]) }; }
        FTKCGames.mill(s.i === 5 ? (s.v.m.a + 1) % 4 : s.v.m.a);
      }
      else if (game === 'bomb' && s.shown == null) pick(s.v.m, FTKCGames.bomb);
      else if (game === 'feud' && !s.roundOver) { const L = s.rounds[s.r], k = L.answers.findIndex((a, i) => !s.open.includes(i)); document.getElementById('kgGuess').value = s.r === 0 ? 'zzzz qqqq' : L.answers[k].t; FTKCGames.guess(); }
      else if (game === 'feud' && s.roundOver) FTKCGames.feudNext();
      else if (game === 'jeopardy' && !s.open) { const c = s.grid.findIndex(col => col.some(x => x && !x.done)); if (c < 0) break; FTKCGames.jeoOpen(c, s.grid[c].findIndex(x => x && !x.done)); }
      else if (game === 'jeopardy' && s.open && s.open.shown == null) pick(s.open.cell.m, FTKCGames.jeo);
      else if (game === 'rapid' && s.shown == null) { const q = s.qs[s.i], k = q.opts.findIndex(o => o.term === q.t.term); FTKCGames.rapid(wrong ? (k + 1) % 4 : k); wrong = false; }
      else if (game === 'wheel' && !s.q && !s.spinning) FTKCGames.spin();
      else if (game === 'wheel' && s.q && s.q.shown == null) pick(s.q.v.m, FTKCGames.wheelPick);
      else if (game === 'doors' && s.opened == null) FTKCGames.door(s.doors.findIndex(p => p.k === 'q'));
      else if (game === 'doors' && s.q && s.q.shown == null) pick(s.q.v.m, FTKCGames.doorPick);
      else if (game === 'reveal' && s.shown == null) { const d = s.ds[s.i], k = d.d.choices.indexOf(d.d.answer); FTKCGames.reveal(wrong ? (k + 1) % d.d.choices.length : k); wrong = false; }
      await sleep(250);
    }
    await sleep(300);
    const s = S();
    const expect = game === 'millionaire' ? 5 : game === 'feud' ? s.over && s.total - s.rounds[0].answers.length : s.over && s.over.total - 1;
    return { over: s.over, expect, life, text: (document.querySelector('.kg-over') || {}).innerText || '' };
  }, game);
  const games = await page.evaluate(() => FTKCGames.games.map(g => g.id));
  for (const g of games) {
    await page.evaluate(() => FTKCGames.hub()); await page.waitForTimeout(200);
    const r = await play(g);
    if (!r.over) { fail(`${g}: the game didn't end`); continue; }
    if (r.over.correct !== r.expect) fail(`${g}: ${r.over.correct} of ${r.over.total} right, expected ${r.expect}`);
    if (!/Worth another look/.test(r.text) || !r.over.missed.length) fail(`${g}: the end screen doesn't show what was missed`);
    if (g === 'millionaire') {
      if (r.over.score !== 2000) fail(`millionaire: a miss on question 6 should keep the 2,000 safe haven, got ${r.over.score}`);
      if (!r.life || r.life.gone.length !== 2 || r.life.sum !== 100 || r.life.gonePct.some(x => x) || r.life.right < 45) fail(`millionaire lifelines: ${JSON.stringify(r.life)}`);
    }
  }
  await page.waitForTimeout(1000);
  const rec = await get('kcgames:' + id);
  const saved = rec && Array.isArray(rec.plays) ? [...new Set(rec.plays.map(p => p.game))] : [];
  if (saved.length !== 8 || rec.plays.some(p => p.lesson !== 1)) fail(`not every play was saved for Lesson 1: ${JSON.stringify(rec)}`);
  await page.evaluate(() => FTKCGames.hub()); await page.waitForTimeout(300);
  if (await page.$$eval('.kg-card em', x => x.length) < 7) fail('the hub doesn\'t show the best scores');
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!/Knowledge Games[\s\S]*Lesson 1/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the Knowledge Games');

  // the trainer: add a question, hide a built-in one
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'kcgames'; goto('admin'); });
  await page.waitForTimeout(2000);
  const tabs = await page.evaluate(() => (document.querySelector('.lp-admin-sec.active') || {}).innerText || '');
  if (!/Dashboard/.test(tabs)) fail(`the Knowledge Games tab isn't under 📚 Dashboard: ${tabs}`);
  await page.fill('#kgaCat', 'Trainer'); await page.fill('#kgaQ', 'Which test question did the trainer add?');
  for (const [i, v] of ['This one', 'Not this', 'Nor this', 'Nor that'].entries()) await page.fill('#kgaC' + i, v);
  await page.fill('#kgaWhy', 'Added in the test.');
  await page.click('text=➕ Add to Lesson 1'); await page.waitForTimeout(1200);
  await page.click('.kg-atbl tr:first-child button'); await page.waitForTimeout(1200);
  const st = await get('settings:kcgames');
  if (!st || !st.hidden || !st.hidden['b1-mc0']) fail(`hiding a built-in question wasn't saved: ${JSON.stringify(st)}`);
  if (!st || !((st.lessons || {})[1] || {}).mc || st.lessons[1].mc[0].q !== 'Which test question did the trainer add?') fail('the trainer\'s question wasn\'t saved');
  const pool = await page.evaluate(async () => { await FTKCGames.reload(); const P = FTKCGames.pool(1); return { own: P.mc.some(m => m.own && m.q === 'Which test question did the trainer add?'), hidden: P.mc.some(m => m.id === 'b1-mc0') }; });
  if (!pool.own || pool.hidden) fail(`the games don't play the trainer's changes: ${JSON.stringify(pool)}`);

  await put('settings:kcgames', null); await put('kcgames:' + id, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Knowledge Games test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Knowledge Games test passed (the bank enough and well formed for all nine lessons; Survey Says matching; the Process Questions card; all eight games played to the end with what was missed, saved and on My Performance; the trainer\'s question added and a built-in one hidden).');
})().catch(e => { console.error(e); process.exit(1); });
