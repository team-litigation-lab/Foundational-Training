// 🗂 The batch's VAs (js/ft-batch-admin.js, worker.js /api/batch/*):
//   - the worker: 🚫 an offboarded VA can't sign in again (name + batch, as a Portal ticket would) and their open session reads
//     nothing but their own record, shown not approved; ↩ restore gives the access back; a trainee can't call /api/batch/*;
//     📦 the batch's Drive folder, every record of a VA saved as one JSON file, then the clear: the working records gone, the
//     trainee record kept (slim, archived, with the scorecard snapshot) with the trainer's reviews, and the access closed;
//   - the page: 📋 Mock Call Scorecards opens on the current batch (the one that started last) with a column per registered
//     VA, the Reception scorecard's criteria down the side, the weighted average and the % following the scores, and Save
//     writing labreview:<id> as Trainer Inputs does; 🚫 Offboard removes a VA from the sheet and the batch folders and lists
//     them under 🚫 Offboarded VAs, ↩ Restore access brings them back; 📦 Archive asks for the Drive folder, saves the
//     summaries (Scorecard Summary, Mock Call & Demo Scorecards, Progress Matrix, the batch summary) and each VA's records,
//     then clears the batch: it leaves Batch Folders and shows under ☁ Saved to Google Drive.
// Usage: NODE_PATH=…/node_modules node .github/scripts/batch-admin.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    GDRIVE_SA_EMAIL: 'ci@sa.example', GDRIVE_SA_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  // Google Drive, answered here: folders made, files uploaded (resumable)
  const drive = { folders: [], files: {} }; let n = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const reply = (o, h) => new Response(JSON.stringify(o), { status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}) });
    if (u.startsWith('https://oauth2.googleapis.com/token')) return reply({ access_token: 'ci-token' });
    if (u.startsWith('https://www.googleapis.com/drive/v3/files?q=')) return reply({ files: [] });
    if (u.startsWith('https://www.googleapis.com/drive/v3/files?supportsAllDrives')) { const m = JSON.parse(init.body); const id = 'fold' + (++n) + 'xxxxxxxx'; drive.folders.push(Object.assign({ id }, m)); return reply({ id, webViewLink: 'https://drive.google.com/drive/folders/' + id }); }
    if (u.startsWith('https://www.googleapis.com/upload/drive/v3/files')) { const m = JSON.parse(init.body); return new Response('{}', { status: 200, headers: { Location: 'https://upload.example/' + encodeURIComponent(JSON.stringify(m)) } }); }
    if (u.startsWith('https://upload.example/')) { const m = JSON.parse(decodeURIComponent(u.slice(23))); const id = 'file' + (++n); drive.files[m.name] = { parent: m.parents[0], body: Buffer.from(await new Response(init.body).arrayBuffer()).toString('utf8') }; return reply({ id, name: m.name, webViewLink: 'https://drive.google.com/file/d/' + id + '/view' }); }
    return realFetch(url, init);
  };
  try {
    const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
    const signin = async () => call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B103026' });
    const s = await signin(), t = s.body.token, id = s.body.id;
    const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok);
    const get = async (k, tok) => { const r = await call('/api/storage/get', { key: k }, tok); return r.status === 200 ? JSON.parse((r.body || {}).value || 'null') : { status: r.status }; };
    await set('trainee:' + id, { id, name: 'Ana Cruz', batch: 'B103026', approved: true, dayProgress: { 1: { done: true, score: 90, extra: 'x'.repeat(50) } } }, at);
    await set('progress:' + id, { data: { notes: 'mine' } }, t);
    await set('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 80 } } }, at);
    await set('feedback:' + id, { days: { 1: { status: 'sent', summary: 'Good' } } }, at);
    await set('guide:' + id + ':lor', { html: '<p>guide</p>' }, t);
    if ((await call('/api/batch/offboard', { id }, t)).status !== 403) fail('a trainee could offboard (an admin\'s action)');
    // 🚫 offboard
    if ((await call('/api/batch/offboard', { id, reason: 'Resigned' }, at)).status !== 200) fail('the admin couldn\'t offboard a VA');
    let r = await get('trainee:' + id, at);
    if (!r.offboarded || r.offboarded.reason !== 'Resigned' || r.approved !== false) fail(`the offboarded record isn't marked: ${JSON.stringify(r)}`);
    if ((await signin()).status !== 403 || (await signin()).body.code !== 'access-offboarded') fail('an offboarded VA could sign in again');
    r = await get('trainee:' + id, t);
    if (!r || r.approved !== false) fail('an offboarded VA\'s open session doesn\'t read their record as not approved (the page signs them out on it)');
    if ((await get('progress:' + id, t)).status !== 403) fail('an offboarded VA\'s open session still reads their records');
    if ((await set('progress:' + id, { data: {} }, t)).status !== 403) fail('an offboarded VA\'s open session still writes');
    if ((await call('/api/batch/offboard', { id, restore: true }, at)).status !== 200) fail('the admin couldn\'t restore an offboarded VA');
    if ((await signin()).status !== 200) fail('a restored VA can\'t sign in');
    r = await get('trainee:' + id, at);
    if (r.offboarded || r.approved !== true || r.rejected) fail(`the restored record isn't back: ${JSON.stringify(r)}`);
    if (!(await get('progress:' + id, t)).data) fail('a restored VA can\'t read their records');
    // 📦 the batch to Drive
    let f = await call('/api/batch/drive-folder', { folder: 'not a link', batch: 'B103026' }, at);
    if (f.status !== 400 || f.body.code !== 'no-folder') fail('a link that isn\'t a Drive folder is taken');
    f = await call('/api/batch/drive-folder', { folder: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp', batch: 'B103026' }, at);
    if (f.status !== 200 || !f.body.folder || !f.body.records) fail(`the batch's folder wasn't made: ${JSON.stringify(f.body)}`);
    else {
      if (!/^Batch B103026 — Archive \d{4}-\d\d-\d\d$/.test(drive.folders[0].name) || drive.folders[0].parents[0] !== '1AbCdEfGhIjKlMnOp' || drive.folders[1].name !== 'Full records') fail(`the folders aren't named and placed: ${JSON.stringify(drive.folders)}`);
      const fl = await call('/api/batch/backup-files', { parent: f.body.folder.id, files: [{ name: 'B103026 - Scorecard Summary.csv', text: 'Trainee\r\nAna' }] }, at);
      if (fl.status !== 200 || !(drive.files['B103026 - Scorecard Summary.csv'] || {}).body.includes('Ana')) fail('a summary file wasn\'t saved');
      const bt = await call('/api/batch/backup-trainee', { id, parent: f.body.records.id }, at);
      const file = Object.entries(drive.files).find(([k]) => k.endsWith('.json'));
      if (bt.status !== 200 || !file) fail(`the VA's records weren't saved: ${JSON.stringify(bt.body)}`);
      else { const j = JSON.parse(file[1].body); for (const k of ['trainee:', 'progress:', 'labreview:', 'feedback:', 'guide:']) if (!Object.keys(j.records).some(x => x.startsWith(k))) fail(`the VA's full records lack ${k}`); }
      if ((await call('/api/batch/purge', { id }, t)).status !== 403) fail('a trainee could clear records');
      const pu = await call('/api/batch/purge', { id, scorecard: { overall: 84, systems: [{ id: 'trainer', avg: 80 }] }, backup: { folder: f.body.folder.link } }, at);
      if (pu.status !== 200) fail('the clear failed');
      for (const k of ['progress:', 'guide:']) if ([...store.keys()].some(x => x.startsWith('ft:' + k + id))) fail(`the clear left ${k}`);
      for (const k of ['labreview:', 'feedback:']) if (!store.has('ft:' + k + id)) fail(`the clear removed ${k} (the Main Portal reads it)`);
      r = await get('trainee:' + id, at);
      if (!r.archived || !r.purgedAt || !r.scorecard || r.scorecard.overall !== 84 || !r.backup || r.dayProgress[1].score !== 90 || r.dayProgress[1].extra) fail(`the kept record isn't slim, archived, with its scorecard: ${JSON.stringify(r)}`);
      if ((await signin()).body.code !== 'access-archived') fail('a VA of a cleared batch can sign in again');
    }
  } finally { globalThis.fetch = realFetch; }
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  const text = sel => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTMockScores === 'object', null, { timeout: 20000 });
    const VAS = [['ana-cruz--b103026', 'Ana Cruz', 'B103026'], ['ben-diaz--b103026', 'Ben Diaz', 'B103026'], ['cara-lim--b103026', 'Cara Lim', 'B103026'], ['old-one--b090126', 'Old One', 'B090126']];
    for (const [id, name, batch] of VAS) {
      await put('trainee:' + id, { id, name, batch, approved: true, registeredAt: '2026-10-30T12:00:00Z', dayProgress: { 1: { done: true, score: 88 } } });
      await put('progress:' + id, { data: { notes: name } });
    }
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'mockscores'; goto('admin'); });
    await page.waitForFunction(() => document.querySelectorAll('.fms-tbl thead th').length > 1, null, { timeout: 20000 });
    // the current batch (started last), a column per registered VA, the Reception scorecard down the side
    const sel = await page.evaluate(() => { const s = document.querySelector('.fms-ctl select'); return s.options[s.selectedIndex].text; });
    if (!/B103026.*current/.test(sel)) fail(`the sheet didn't open on the current batch: ${sel}`);
    const cols = await page.evaluate(() => [...document.querySelectorAll('.fms-tbl thead th b')].map(b => b.textContent));
    if (cols.join() !== 'Ana Cruz,Ben Diaz,Cara Lim') fail(`the columns aren't the batch's VAs: ${cols}`);
    const rows = await page.evaluate(() => [...document.querySelectorAll('.fms-tbl tbody th')].map(t => t.textContent));
    if (!rows[0].startsWith('Introduction of Law Firm') || !rows.includes('WEIGHTED AVERAGE') || !rows.some(r => r.startsWith('Score'))) fail(`the scorecard rows aren't there: ${rows.slice(0, 3)}`);
    const nCrit = await page.evaluate(() => FT_RUBRICS.list.reception.criteria.length);
    // Ana: 4 on every criterion → 4.00/5 → 80%
    for (let i = 0; i < nCrit; i++) await page.fill(`.fms-tbl tbody tr:nth-child(${i + 1}) td[data-va="ana-cruz--b103026"] input[type=number]`, '4');
    await page.fill('.fms-tbl tbody tr:nth-child(1) td[data-va="ana-cruz--b103026"] .fms-fb', 'Clear intro');
    await page.fill('td[data-va="ana-cruz--b103026"] textarea', 'Good, with improvements needed.');
    await page.selectOption('.fms-sum td[data-va="ana-cruz--b103026"] select', 'Passed');
    const avg = await text('.fms-avg td[data-va="ana-cruz--b103026"]'), sc = await page.inputValue('td[data-va="ana-cruz--b103026"] [data-score]');
    if (avg !== '4.00/5' || sc !== '80') fail(`the average and the score don't follow the scores: ${avg} ${sc}`);
    if (!/Save 1 VA/.test(await text('[data-ms-save]'))) fail(`Save doesn't count the VA changed: ${await text('[data-ms-save]')}`);
    await page.click('[data-ms-save]'); await page.waitForTimeout(1500);
    const lr = await get('labreview:ana-cruz--b103026'), c = ((lr || {}).acts || {})['reception-live'] || {};
    if (c.status !== 'Passed' || c.score !== 80 || !c.rubric || c.rubric.avg !== 4 || c.rubric.feedback[0] !== 'Clear intro' || !/improvements/.test(c.comment)) fail(`the scorecard wasn't saved as Trainer Inputs saves it: ${JSON.stringify(c)}`);
    if (await get('labreview:ben-diaz--b103026')) fail('a VA who wasn\'t scored got a record');
    // 🚫 offboard Cara
    page.once('dialog', d => d.accept('Offboarded: resigned'));
    await page.evaluate(() => confirmRevokeTrainee('cara-lim--b103026', 'Cara Lim')); await page.waitForTimeout(1500);
    const cara = await get('trainee:cara-lim--b103026');
    if (!cara || !cara.offboarded || cara.approved !== false) fail(`Cara wasn't offboarded: ${JSON.stringify(cara)}`);
    await page.evaluate(() => { state.adminTab = 'mockscores'; render(); }); await page.waitForTimeout(1200);
    if ((await page.evaluate(() => [...document.querySelectorAll('.fms-tbl thead th b')].map(b => b.textContent))).includes('Cara Lim')) fail('an offboarded VA is still on the sheet');
    await page.evaluate(() => { state.adminTab = 'batches'; state.batchFolder = null; render(); }); await page.waitForTimeout(1500);
    let shelf = await page.evaluate(() => document.querySelector('main') ? document.querySelector('main').innerText : document.body.innerText);
    if (!/Offboarded VAs \(1\)[\s\S]*Cara Lim/.test(shelf)) fail('Cara isn\'t under 🚫 Offboarded VAs');
    const b1 = await page.evaluate(() => { const c = [...document.querySelectorAll('.batch-folder')].find(x => /B103026/.test(x.innerText)); return c ? c.innerText : ''; });
    if (!/2 trainees/.test(b1)) fail(`the batch folder still counts the offboarded VA: ${b1}`);
    page.once('dialog', d => d.accept());
    await page.click('button[data-id="cara-lim--b103026"]'); await page.waitForTimeout(1500);
    if ((await get('trainee:cara-lim--b103026')).approved !== true) fail('↩ Restore access didn\'t restore Cara');
    // 📦 archive B103026: Drive answered by the test (the test server has no service account)
    const sent = { files: null, trainees: [] };
    await page.route('**/api/batch/drive-folder', r => r.fulfill({ json: { ok: true, folder: { id: 'F1', link: 'https://drive.google.com/drive/folders/F1' }, records: { id: 'F2', link: 'x' } } }));
    await page.route('**/api/batch/backup-files', r => { sent.files = JSON.parse(r.request().postData()).files; r.fulfill({ json: { ok: true, files: sent.files.map(f => ({ name: f.name, link: 'l' })) } }); });
    await page.route('**/api/batch/backup-trainee', r => { sent.trainees.push(JSON.parse(r.request().postData()).id); r.fulfill({ json: { ok: true, file: { name: 'x.json', link: 'https://drive.google.com/file/d/X/view' }, keys: 3 } }); });
    await page.evaluate(() => confirmArchiveBatch('B103026')); await page.waitForTimeout(400);
    if (!(await page.$('.fba-ov #fbaFolder'))) fail('📦 Archive doesn\'t ask for the Drive folder');
    await page.fill('#fbaFolder', 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp');
    await page.click('.fba-ov [data-go]');
    await page.waitForFunction(() => !document.querySelector('.fba-ov'), null, { timeout: 30000 }).catch(() => {});
    if (await page.$('.fba-ov')) fail(`the archive didn't finish: ${await text('#fbaLog')}`);
    const names = (sent.files || []).map(f => f.name);
    for (const n of ['B103026 - Scorecard Summary.csv', 'B103026 - Mock Call & Demo Scorecards.csv', 'B103026 - Progress Matrix.csv', 'B103026 - Batch Summary.json']) if (!names.includes(n)) fail(`${n} wasn't saved`);
    const f = n => ((sent.files || []).find(x => x.name === n) || {}).text || '';
    if (!/"Ana Cruz"[^\n]*"80"/.test(f('B103026 - Scorecard Summary.csv'))) fail(`the Scorecard Summary lacks Ana's 80: ${f('B103026 - Scorecard Summary.csv').slice(0, 400)}`);
    if (!/"Ana Cruz","B103026","Reception Mock Call[^\n]*"Introduction of Law Firm and Name","4","Clear intro"/.test(f('B103026 - Mock Call & Demo Scorecards.csv'))) fail('the Mock Call & Demo Scorecards lack Ana\'s criteria');
    if (!/"Ben Diaz","B103026",[^\n]*"✓ 88%"/.test(f('B103026 - Progress Matrix.csv'))) fail('the Progress Matrix lacks a lesson\'s cell');
    if (sent.trainees.sort().join() !== 'ana-cruz--b103026,ben-diaz--b103026,cara-lim--b103026') fail(`each VA's records weren't saved: ${sent.trainees}`);
    const ana = await get('trainee:ana-cruz--b103026');
    if (!ana || !ana.purgedAt || !ana.archived || !ana.scorecard || !ana.scorecard.trainerActs['reception-live'] || ana.scorecard.trainerActs['reception-live'].score !== 80) fail(`Ana's record wasn't kept with the scorecard: ${JSON.stringify(ana)}`);
    if (await get('progress:ana-cruz--b103026')) fail('Ana\'s working records weren\'t cleared');
    if (!(await get('labreview:ana-cruz--b103026'))) fail('Ana\'s mock call scorecard was cleared (the Main Portal reads it)');
    if (!(await get('progress:old-one--b090126'))) fail('another batch was cleared');
    const bb = await get('batchbackup:B103026');
    if (!bb || bb.folder !== 'https://drive.google.com/drive/folders/F1' || bb.count !== 3 || !bb.cleared) fail(`the batch's backup isn't recorded: ${JSON.stringify(bb)}`);
    await page.evaluate(() => { state.adminTab = 'batches'; state.batchFolder = null; render(); }); await page.waitForTimeout(2000);
    shelf = await page.evaluate(() => document.querySelector('main') ? document.querySelector('main').innerText : document.body.innerText);
    if ([...await page.$$eval('.batch-folder', xs => xs.map(x => x.innerText))].some(t => /B103026/.test(t))) fail('the cleared batch is still in Batch Folders');
    if (!/Saved to Google Drive \(1\)[\s\S]*B103026[\s\S]*3 VAs/.test(shelf)) fail('the batch isn\'t under ☁ Saved to Google Drive');
    if (!/B090126/.test(shelf)) fail('the other batch left Batch Folders');
  } catch (err) { fail(`threw: ${err.stack || err}`); }
  await browser.close();
  if (failures.length) { console.log('✗ ' + failures.join('\n✗ ')); process.exit(1); }
  console.log('✓ the batch admin: mock call scorecards, offboarding, archive to Drive and the clear');
})();
