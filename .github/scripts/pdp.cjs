// 🌱 Professional Development & Progress, a trainer's weekly score of each trainee (worker.js /api/pdp/set →
// trackerreview:<id>.pdp[<week>]; js/ft-batch-sheet.js pdpRow; index.html ftPdp), and 📏 Following instructions folded into the
// Day's outputs (worker.js outputsOf / foldInstr; index.html ftDay1.comp):
//   - a trainer saves a week's three criteria (Competency in taking on a role, Communication, Quality of output; 1–5, half
//     points) and a note: kept as their average out of 5 (and its %); a trainee can't write it, by the endpoint or by saving the
//     record; out-of-range or non-half scores are refused; all three cleared takes the week's score off;
//   - a day stored while Following instructions was its own part has it folded into its Day's outputs (half each) and its %
//     worked out again — by the Worker on its next check and by ftDay1.comp where the browser reads it — never counted twice;
//     a day with nothing handed in drops it (no outputs row);
//   - with a URL: on the 📋 Batch Sheet trainee page, each week has a "🌱 Professional Development & Progress · Week N" row:
//     the trainer picks the three and saves, the week's Daily compliance counts it beside the days, an unscored week reads
//     "Not scored yet" and isn't counted; the trainee sees the scores read-only.
// Usage: node .github/scripts/pdp.cjs [http://localhost:8787/]   (the Worker part needs no browser or network)
const path = require('path'), fs = require('fs'), vm = require('vm'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
const BASE = process.argv[2] || '';
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const TR = globalThis.FTTrackerRules;
  const store = new Map(), B = 'B110226', id = 'pia-pdp--b110226';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  const put = (k, v) => store.set('ft:' + k, JSON.stringify(v)), get = (k) => JSON.parse(store.get('ft:' + k) || 'null') || {};
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  put('trainee:' + id, { id, name: 'Pia Pdp', batch: B, approved: true });
  // (two past weekdays: D1 stored while 📏 Following instructions was its own part, with outputs; D2 the same with nothing handed in)
  const past = []; for (let t = Date.parse(TR.ptDate() + 'T12:00:00Z') - 864e5; past.length < 3; t -= 864e5) { const d = new Date(t).toISOString().slice(0, 10); if (TR.isWeekday(d)) past.unshift(d); }
  const [D1, D2, D3] = past;
  put('trackerreview:' + id, { days: {}, compliance: {
    [D1]: { v: 2, pct: 83, parts: { tests: 100, outputs: 100, instructions: 50, eod: 80 }, instr: { v: 2, pct: 50, ok: 1, of: 2, issues: [{ k: 'name', why: 'answer sheet not named by the convention' }], links: [] }, final: true },
    [D2]: { v: 2, pct: 75, parts: { tests: 100, outputs: null, instructions: 50 }, instr: { v: 2, pct: 50, ok: 1, of: 2, issues: [], links: [] }, final: true } } });
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const trainee = (await call('/api/auth/trainee', { name: 'Pia Pdp', batch: B })).body.token;
  if (!admin || !trainee) fail(`no admin or trainee token: ${!!admin} ${!!trainee}`);

  // 🌱 the trainer saves Week 2: 4, 3.5, 4.5 → 4/5, 80%
  { const r = await call('/api/pdp/set', { id, week: 2, role: 4, comm: 3.5, quality: 4.5, note: 'Owns the receptionist role well.' }, admin), x = (get('trackerreview:' + id).pdp || {})[2];
    if (r.status !== 200 || !r.body || !r.body.ok || !x || x.role !== 4 || x.comm !== 3.5 || x.quality !== 4.5 || x.avg !== 4 || x.pct !== 80 || x.note !== 'Owns the receptionist role well.') fail(`the trainer's Week 2 score wasn't kept: ${JSON.stringify({ r, x })}`);
    // (the trainee reads it with the rest of the record)
    const g = await call('/api/storage/get', { key: 'trackerreview:' + id }, trainee), v = JSON.parse((g.body || {}).value || 'null') || {};
    if (!v.pdp || !v.pdp[2] || v.pdp[2].avg !== 4) fail(`the trainee can't read her Professional Development & Progress: ${JSON.stringify(g.body).slice(0, 200)}`); }
  // (a trainee can't write it: not by the endpoint, not by saving the record herself)
  { const r = await call('/api/pdp/set', { id, week: 2, role: 5, comm: 5, quality: 5 }, trainee);
    if (r.status !== 403) fail(`a trainee scored her own Professional Development & Progress: ${r.status}`);
    const rv = get('trackerreview:' + id); rv.pdp = { 2: { role: 5, comm: 5, quality: 5, avg: 5, pct: 100 }, 3: { role: 5, comm: 5, quality: 5, avg: 5, pct: 100 } };
    const w = await call('/api/storage/set', { key: 'trackerreview:' + id, value: JSON.stringify(rv) }, trainee), now = get('trackerreview:' + id).pdp || {};
    if ((w.body && w.body.ok) || now[2].avg !== 4 || now[3]) fail(`a trainee rewrote her Professional Development & Progress through the record: ${JSON.stringify({ w: w.body, now })}`); }
  // (scores out of range, not a half point, or a week outside 1–6 are refused; partial scores too)
  for (const [b, why] of [[{ role: 6, comm: 4, quality: 4 }, 'a 6'], [{ role: 3.3, comm: 4, quality: 4 }, 'a 3.3'], [{ role: 0, comm: 4, quality: 4 }, 'a 0'], [{ role: 4, comm: '', quality: 4 }, 'one left out']])
    if ((await call('/api/pdp/set', Object.assign({ id, week: 2 }, b), admin)).status !== 400) fail(`a score with ${why} was saved`);
  if ((await call('/api/pdp/set', { id, week: 7, role: 4, comm: 4, quality: 4 }, admin)).status !== 400) fail('a Week 7 score was saved');
  if ((get('trackerreview:' + id).pdp || {})[2].avg !== 4) fail('a refused save changed the week\'s score');
  // (all three cleared: the week's score taken off — not scored, not a 0)
  { await call('/api/pdp/set', { id, week: 3, role: 2, comm: 2.5, quality: 3 }, admin);
    const r = await call('/api/pdp/set', { id, week: 3, role: null, comm: null, quality: null }, admin);
    if (!r.body || !r.body.ok || r.body.pdp !== null || (get('trackerreview:' + id).pdp || {})[3]) fail(`clearing Week 3 didn't take its score off: ${JSON.stringify(r.body)}`); }

  // 📏 the Worker's next check folds the stored days' instructions into their Day's outputs: D1 (100 + 50) / 2 = 75, its %
  // (100 + 75 + 80) / 3 = 85; D2, nothing handed in, drops it: 100
  await call('/api/eod/grade', { id, date: D3, score: 90 }, admin);
  { const C = get('trackerreview:' + id).compliance || {}, a = C[D1] || {}, b = C[D2] || {}, c = C[D3] || {};
    if (!a.parts || 'instructions' in a.parts || a.parts.outputs !== 75 || a.outputsWork !== 100 || a.pct !== 85) fail(`a stored day's instructions weren't folded into its Day's outputs: ${JSON.stringify(a)}`);
    if (!b.parts || 'instructions' in b.parts || b.parts.outputs !== null || b.pct !== 100) fail(`a stored day with nothing handed in still counts its instructions: ${JSON.stringify(b)}`);
    if (!c.parts || 'instructions' in c.parts) fail(`a new day still has an instructions part: ${JSON.stringify(c.parts)}`);
    if (c.instr && typeof c.parts.outputs === 'number' && c.parts.outputs !== Math.round((c.outputsWork + c.instr.pct) / 2)) fail(`a new day's Day's outputs isn't its hand-in and instructions averaged: ${JSON.stringify({ parts: c.parts, work: c.outputsWork, instr: c.instr.pct })}`); }

  // 🖥 index.html, where the browser reads trackerreview: ftDay1.comp folds a stored day the same way (nothing written back);
  // ftPdp reads a week's score, counts it beside the week's days, and an unscored week counts nothing
  { const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'), a = html.indexOf('const batchRealDay = '), b = html.indexOf('// ===== W1-OVERRIDE B103026 one-off');
    if (a < 0 || b < a) fail('index.html\'s batch helpers, ftDay1 and ftPdp are no longer where the test looks');
    else {
      const ctx = { FTTrackerRules: TR, console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(html.slice(a, b), ctx);
      const rv = { compliance: { '2026-11-03': { v: 2, pct: 83, parts: { tests: 100, outputs: 100, instructions: 50, eod: 80 }, final: true }, '2026-11-04': { v: 2, pct: 75, parts: { tests: 100, outputs: null, instructions: 50 }, final: true } },
        pdp: { 2: { role: 4, comm: 3.5, quality: 4.5 }, 3: { role: 4 } } };
      const before = JSON.stringify(rv), c = ctx.ftDay1.comp(rv, B).compliance;
      if ('instructions' in c['2026-11-03'].parts || c['2026-11-03'].parts.outputs !== 75 || c['2026-11-03'].outputsWork !== 100 || c['2026-11-03'].pct !== 85) fail(`ftDay1.comp doesn't fold a stored day's instructions into its Day's outputs: ${JSON.stringify(c['2026-11-03'])}`);
      if ('instructions' in c['2026-11-04'].parts || c['2026-11-04'].pct !== 100) fail(`ftDay1.comp keeps the instructions of a day with nothing handed in: ${JSON.stringify(c['2026-11-04'])}`);
      if (JSON.stringify(rv) !== before) fail('ftDay1.comp wrote into the record it read');
      const P = ctx.ftPdp, w2 = P.of(rv, 2);
      if (!w2 || w2.avg5 !== 4 || w2.pct !== 80 || P.of(rv, 3) || P.of(rv, 1)) fail(`ftPdp reads a week wrong (Week 2 4/5; Week 3 half-scored and Week 1 unscored: none): ${JSON.stringify([w2, P.of(rv, 3), P.of(rv, 1)])}`);
      if (P.withWeek([60, 70], rv, 2) !== 70 || P.withWeek([60, 70], rv, 1) !== 65 || P.withWeek([], rv, 1) !== null || P.withWeek([], rv, 2) !== 80) fail('ftPdp.withWeek doesn\'t count the week\'s score beside its days (and nothing for an unscored week)');
    } }

  // 📋 the Batch Sheet trainee page (with a URL)
  if (BASE) await browserPart().catch((e) => fail(`the browser part failed: ${e && e.stack || e}`));
  if (failures.length) { console.error(`${failures.length} failure(s):`); failures.forEach((f, i) => console.error(`${i + 1}. ${f}`)); process.exit(1); }
  console.log(`Professional Development & Progress test passed (a trainer's weekly score of three criteria, 1–5 in half points, kept as their average; a trainee can't write it; an unscored week isn't counted; stored days' Following instructions folded into their Day's outputs by the Worker and by ftDay1.comp${BASE ? '; on the Batch Sheet trainee page the trainer scores a week, its Daily compliance counts it, the trainee sees it read-only' : ''}).`);
})().catch((e) => { console.error(e); process.exit(1); });

async function browserPart(){
  const { chromium } = require('playwright'), signIn = require('./sign-in.cjs');
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`)); page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    // (a batch that started on the Monday two weeks before today's week: Week 1 and Week 2 over, Week 3 under way)
    const S = await page.evaluate(() => { const T = FTTrackerRules.ptDate(), t = Date.parse(T + 'T12:00:00Z'), dow = new Date(t).getUTCDay() || 7, mon = t - (dow - 1) * 864e5 - 14 * 864e5, iso = ms => new Date(ms).toISOString().slice(0, 10);
      const st = iso(mon); return { today: T, st, w1: iso(mon + 864e5), batch: 'B' + st.slice(5, 7) + st.slice(8, 10) + st.slice(2, 4) }; });
    await signIn(page, 'Pia', 'Pdp', S.batch);
    const pid = await page.evaluate(() => state.traineeId), rec = await get('trainee:' + pid); rec.approved = true; await put('trainee:' + pid, rec);
    const wN = await page.evaluate(b => ftWeeks.now(b), S.batch);
    if (wN !== 3) fail(`the test batch isn't in its Week 3: ${wN} (${JSON.stringify(S)})`);
    // (a Week 1 day at 70% and today's at 60%, both final)
    await put('trackerreview:' + pid, { days: {}, compliance: { [S.w1]: { v: 2, pct: 70, parts: { tests: 70, eod: 70 }, tests: {}, final: true }, [S.today]: { v: 2, pct: 60, parts: { tests: 60, eod: 60 }, tests: {}, final: true } } });
    const openPage = async () => { await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(600);
      await page.evaluate(b => FTBatchSheet.batch(b), S.batch);
      await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the Batch Sheet never finished loading'));
      await page.evaluate(id => FTBatchSheet.ptPick(id), pid); await page.waitForTimeout(600);
      // (every week open, to read its rows)
      await page.evaluate(id => { for (const w of [1, 2, 3]) { const r = document.querySelector(`.bs-pt-wk[onclick*="'${id}', ${w})"]`); if (r && r.classList.contains('is-folded')) r.click(); } }, pid); await page.waitForTimeout(400); };
    const read = () => page.evaluate(id => { const d = document.getElementById('bs-pt-' + id); if (!d) return null;
      return { chips: [...d.querySelectorAll('.bs-pt-h .bs-pt-k')].map(x => x.innerText.replace(/\s+/g, ' ') + ' | ' + (x.title || '')), wk: [...d.querySelectorAll('tr.bs-pt-wk')].map(x => x.innerText.replace(/\s+/g, ' ')),
        rows: [...d.querySelectorAll('tr.bs-pdp')].map(tr => ({ w: tr.dataset.week, text: tr.innerText.replace(/\s+/g, ' '), selects: tr.querySelectorAll('select').length, save: !!tr.querySelector('button') })) }; }, pid);
    await openPage();
    // (the expected figures from the record as the page reads it — the sheet's own backfill adds the batch's other days, at 0:
    // the week's days' % with the 🌱 score as one more entry, ftPdp.withWeek; shown in points out of 5)
    const want = () => page.evaluate(async ([id, b]) => { const rv = ftDay1.comp(JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'trackerreview:' + id }) }).then(r => r.json())).value || 'null') || {}, b);
      const wk = n => { const r = ftWeeks.range(b, n); return Object.entries(rv.compliance || {}).filter(([d, c]) => d >= r[0] && d <= r[1] && c && typeof c.pct === 'number').map(([, c]) => c.pct); };
      return { w3: ftPdp.withWeek(wk(3), rv, 3), w3days: ftPdp.withWeek(wk(3), {}, 3), w1: ftPdp.withWeek(wk(1), rv, 1) }; }, [pid, S.batch]);
    const p5 = v => (v / 20).toFixed(1) + '/5';
    let v = await read(), E = await want();
    const row = w => ((v && v.rows) || []).find(r => r.w === String(w)), chip = () => ((v && v.chips) || []).find(c => /^Daily compliance · Week 3/.test(c)) || '';
    if (!row(1) || !row(3) || !/🌱 Professional Development & Progress · Week 3/.test(row(3).text) || row(3).selects !== 3 || !row(3).save) fail(`the trainer has no Week 3 🌱 Professional Development & Progress row with its three criteria: ${JSON.stringify(v && v.rows)}`);
    if (!/Competency in taking on a role/.test(row(3) && row(3).text) || !/Communication/.test(row(3) && row(3).text) || !/Quality of output/.test(row(3) && row(3).text)) fail(`the row doesn't name the three criteria: ${row(3) && row(3).text}`);
    if (!/Not scored yet — your trainer scores this weekly/.test(row(3) && row(3).text)) fail(`an unscored week doesn't say so: ${row(3) && row(3).text}`);
    if (E.w3 !== E.w3days || !chip().includes('Week 3 ' + p5(E.w3days)) || !/not scored yet this week: not counted/.test(chip())) fail(`an unscored week's Daily compliance isn't the days' alone (${p5(E.w3days)}): ${chip()}`);
    // (the trainer picks 4.5, 4 and 3.5 and a note, then 💾 Save Week 3)
    const sel = (c, val) => page.selectOption(`#bs-pt-${pid} tr.bs-pdp[data-week="3"] select[data-c="${c}"]`, val);
    await sel('role', '4.5'); await sel('comm', '4'); await sel('quality', '3.5');
    await page.fill(`#bs-pt-${pid} tr.bs-pdp[data-week="3"] input.bs-pdp-n`, 'PDP-NOTE: takes the lead on calls.');
    await page.click(`#bs-pt-${pid} tr.bs-pdp[data-week="3"] button`); await page.waitForTimeout(1500);
    const x = ((await get('trackerreview:' + pid)) || {}).pdp || {};
    if (!x[3] || x[3].role !== 4.5 || x[3].comm !== 4 || x[3].quality !== 3.5 || x[3].avg !== 4 || x[3].pct !== 80 || !/PDP-NOTE/.test(x[3].note)) fail(`💾 Save didn't keep the trainer's Week 3 score: ${JSON.stringify(x)}`);
    await openPage(); v = await read(); E = await want();
    // (the week's Daily compliance counts it beside the days — one more entry, 80%; Week 1, not scored, stays its days' alone)
    if (!(E.w3 > E.w3days) || !chip().includes('Week 3 ' + p5(E.w3)) || !/4\.0\/5 = 80%/.test(chip())) fail(`the week's Daily compliance doesn't count its 🌱 score (${p5(E.w3days)} → ${p5(E.w3)}): ${chip()}`);
    if (!/4\.0\/5/.test(row(3) && row(3).text) || !/counted in Week 3's Daily compliance/.test(row(3) && row(3).text)) fail(`the scored row doesn't show its score: ${row(3) && row(3).text}`);
    if (!/Not scored yet/.test(row(1) && row(1).text)) fail(`Week 1, not scored, doesn't say so: ${row(1) && row(1).text}`);
    { const w3 = (v.wk || []).find(t => /Week 3/.test(t)) || '', w1 = (v.wk || []).find(t => /Week 1/.test(t)) || '';
      if (!w3.includes(E.w3 + '% average') || !w1.includes(E.w1 + '% average')) fail(`the week headings don't average the 🌱 score beside the days (Week 3 ${E.w3}%, Week 1 ${E.w1}%): ${JSON.stringify(v.wk)}`); }
    // 🔒 the trainee's own page: the scores read-only, the note, no inputs
    await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; state.traineeName = 'Pia Pdp'; state.view = 'modules'; render(); }, pid); await page.waitForTimeout(400);
    await page.evaluate(() => goto('mysheet'));
    await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('My Progress never finished loading'));
    await page.waitForTimeout(600);
    const me = await page.evaluate(() => [...document.querySelectorAll('tr.bs-pdp')].map(tr => ({ w: tr.dataset.week, text: tr.innerText.replace(/\s+/g, ' '), inputs: tr.querySelectorAll('select, input, button').length })));
    const m3 = me.find(r => r.w === '3');
    if (!m3 || m3.inputs || !/4\.5\/5/.test(m3.text) || !/3\.5\/5/.test(m3.text) || !/PDP-NOTE/.test(m3.text)) fail(`the trainee doesn't see her Week 3 score read-only: ${JSON.stringify(me)}`);
    const m1 = me.find(r => r.w === '1');
    if (!m1 || !/Not scored yet — your trainer scores this weekly/.test(m1.text)) fail(`the trainee's unscored week doesn't say so: ${JSON.stringify(m1)}`);
    { const r = await get('trainee:' + pid); if (r) { r.archived = true; await put('trainee:' + pid, r); } }
  } finally { await browser.close(); }
}
