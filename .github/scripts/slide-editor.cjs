// ✏️ The trainer edits the slides (js/ft-slide-editor.js): a trainer opens any day slide in the editor, types,
//   formats, links, pastes a picture, resizes it and saves — and that is the slide every trainee then opens
//   (settings:dayslides, trainer-write / everyone-read). A trainee has no editor at all. Whatever is typed is
//   cleaned: no script, no handler, no javascript: link and no embed from anywhere but the curriculum's own hosts.
//   ↩︎ Undo my edits puts the built slide back.
// Usage: NODE_PATH=…/node_modules node .github/scripts/slide-editor.cjs http://localhost:8787/
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
    LSH_KV: { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const set = (v, tok) => call('/api/storage/set', { key: 'settings:dayslides', value: JSON.stringify(v) }, tok);
  if ((await set({ v: 1, days: { 1: { discussion: { html: '<p>mine</p>' } } } }, t)).status === 200) fail('a trainee rewrote a slide');
  if ((await set({ v: 1, days: { 1: { discussion: { html: '<p>from the trainer</p>' } } } }, at)).status !== 200) fail('the trainer can\'t save an edited slide');
  const read = await call('/api/storage/get', { key: 'settings:dayslides' }, t);
  if (!/from the trainer/.test(((read.body || {}).value) || '')) fail('a trainee can\'t read the edited slides');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept('https://drive.google.com/x'));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await put('settings:dayslides', { v: 1, days: {} });
  await signIn(page, 'Sam', 'Slide', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2200);

  // a trainee has no editor: no ✏️ button on the deck, and the editor refuses to open
  await page.evaluate(() => FTDayDecks.open(3)); await page.waitForTimeout(1500);
  if (await page.$('text=✏️ Edit this slide')) fail('a trainee is offered the slide editor');
  await page.evaluate(() => FTSlideEdit.open(3, (window.FT_DAY_DECKS[3].slides[0] || {}).id)); await page.waitForTimeout(500);
  if (await page.evaluate(() => document.body.classList.contains('ftse-open'))) fail('the editor opened for a trainee');

  // the trainer opens the slide in the editor from the deck's rail, on the first of the guide's own slides: the day card
  // and the Training Agenda before it are drawn by the platform, and nobody edits them.
  await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; render(); }); await page.waitForTimeout(700);
  if (await page.$('text=✏️ Edit this slide')) fail('the Training Agenda, which the platform draws, is offered for editing');
  await page.evaluate(() => FTDayDecks.to(FTDayDecks.first(FTDayDecks.state().day))); await page.waitForTimeout(900);
  const sid = await page.evaluate(() => { const b = [...document.querySelectorAll('.ftdd-rail button')].find(x => /Edit this slide/.test(x.textContent));
    const m = b && /FTSlideEdit\.open\(\d+,\s*'([^']+)'/.exec(b.getAttribute('onclick') || ''); return m ? m[1] : ''; });
  if (!sid) fail('the trainer has no ✏️ Edit this slide on the deck');
  await page.click('text=✏️ Edit this slide'); await page.waitForTimeout(1200);
  const opened = await page.evaluate(() => ({ open: document.body.classList.contains('ftse-open'), body: !!document.getElementById('ftseBody') }));
  if (!opened.open || !opened.body) fail(`the editor didn't open for the trainer: ${JSON.stringify(opened)}`);
  const built = await page.evaluate(sid => (window.FT_DAY_DECKS[3].slides.find(s => s.id === sid) || {}).html, sid);
  const inEditor = await page.evaluate(() => document.getElementById('ftseBody').innerHTML);
  if (!built || inEditor.length < 20) fail('the editor opened empty, not on the built slide');

  // the tools: a heading, bold, a colour, bullets, a link, a box, and a picture resized
  await page.evaluate(() => {
    const b = document.getElementById('ftseBody');
    b.innerHTML = '<p id="t1">Trainer wrote this line</p>';
    const r = document.createRange(); r.selectNodeContents(document.getElementById('t1'));
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  });
  await page.evaluate(() => FTSlideEdit.cmd('bold')); await page.waitForTimeout(120);
  await page.evaluate(() => { const b = document.getElementById('ftseBody'); const r = document.createRange();
    r.selectNodeContents(b.firstElementChild); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.evaluate(() => FTSlideEdit.colour('#C2410C')); await page.waitForTimeout(120);
  await page.evaluate(() => FTSlideEdit.cmd('insertUnorderedList')); await page.waitForTimeout(120);
  await page.evaluate(() => FTSlideEdit.box('0')); await page.waitForTimeout(150);
  await page.evaluate(() => FTSlideEdit.box('table')); await page.waitForTimeout(150);
  // a picture, as a paste of a file
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mP8z8BQz0AEYBxVSF+FABJrA/3rJ1Z/AAAAAElFTkSuQmCC';
  await page.evaluate(async (b64) => {
    const bin = atob(b64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const file = new File([arr], 'shot.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(file);
    const body = document.getElementById('ftseBody'); body.focus();
    const r = document.createRange(); r.selectNodeContents(body); r.collapse(false);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, PNG);
  await page.waitForTimeout(1200);
  const pic = await page.evaluate(() => { const i = document.querySelector('#ftseBody img'); return i ? { src: i.getAttribute('src').slice(0, 24), w: i.style.width } : null; });
  if (!pic || !/^data:image\//.test(pic.src)) fail(`a pasted picture didn't land on the slide: ${JSON.stringify(pic)}`);
  // resize it: click it, then ½
  await page.click('#ftseBody img'); await page.waitForTimeout(200);
  if (!await page.$('.ftse-grip')) fail('a selected picture has no corner to drag');
  await page.evaluate(() => FTSlideEdit.width('50%')); await page.waitForTimeout(150);
  if (await page.evaluate(() => (document.querySelector('#ftseBody img') || {}).style.width) !== '50%') fail('½ did not resize the picture');
  // and a link
  await page.evaluate(() => { const b = document.getElementById('ftseBody'); const p = document.createElement('p');
    p.id = 'lk'; p.textContent = 'the firm folder'; b.appendChild(p);
    const r = document.createRange(); r.selectNodeContents(p); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.evaluate(() => FTSlideEdit.link()); await page.waitForTimeout(300);

  // what a trainer must not be able to put on a slide, however they type it
  await page.evaluate(() => { const b = document.getElementById('ftseBody');
    b.insertAdjacentHTML('beforeend', '<p><a href="javascript:alert(1)" onclick="alert(2)">tap</a><script>alert(3)<\/script><iframe src="https://evil.example.com/x"></iframe><img src="x" onerror="alert(4)"></p>'); });
  await page.evaluate(() => FTSlideEdit.save()); await page.waitForTimeout(1800);

  const saved = await get('settings:dayslides');
  const html = (((saved || {}).days || {})['3'] || {})[sid] && saved.days['3'][sid].html || '';
  if (!html) fail(`the slide wasn't saved: ${JSON.stringify(saved).slice(0, 200)}`);
  const bad = [/<script/i, /onclick=/i, /onerror=/i, /javascript:/i, /evil\.example\.com/i].filter(re => re.test(html));
  if (bad.length) fail(`the saved slide kept something it shouldn't: ${bad.join(', ')}`);
  if (!/<b>|<strong>|font-weight/i.test(html)) fail('bold wasn\'t saved');
  if (!/<ul|<li/i.test(html)) fail('the bullet list wasn\'t saved');
  if (!/color\s*:/i.test(html)) fail('the colour wasn\'t saved');
  if (!/<table/i.test(html)) fail('the table wasn\'t saved');
  if (!/ftdd-ph/.test(html)) fail('the inserted card wasn\'t saved');
  if (!/<img[^>]+src="data:image\//i.test(html)) fail('the pasted picture wasn\'t saved');
  if (!/width:\s*50%/i.test(html)) fail('the picture\'s new size wasn\'t saved');
  if (!/drive\.google\.com/.test(html)) fail('the link wasn\'t saved');
  if (!/target="_blank"/.test(html)) fail('a link on a slide should open in a new tab');
  if (!await page.evaluate(() => !document.body.classList.contains('ftse-open'))) fail('the editor stayed open after saving');

  // the deck now shows the edited slide — to the trainer, and to the trainee
  await page.waitForTimeout(600);
  if (!/Trainer wrote this line/.test(await page.evaluate(() => (document.querySelector('.ftdd-sheet') || {}).innerText || ''))) fail('the deck still shows the built slide to the trainer');
  await page.evaluate((tid) => { state.isAdmin = false; state.traineeId = tid; }, id);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2200);
  await page.evaluate(() => FTDayDecks.open(3)); await page.waitForTimeout(1800);
  const seen = await page.evaluate(() => { const n = document.querySelectorAll('.ftdd-dot').length;
    for (let i = 0; i < n; i++) { FTDayDecks.to(i); const t = (document.querySelector('.ftdd-sheet') || {}).innerText || '';
      if (/Trainer wrote this line/.test(t)) return { found: true, img: !!document.querySelector('.ftdd-sheet img[src^="data:image/"]') }; } return { found: false }; });
  if (!seen.found) fail('a trainee does not see the slide the trainer edited');
  else if (!seen.img) fail('a trainee does not see the picture the trainer pasted');
  if (await page.$('text=✏️ Edit this slide')) fail('a trainee is offered the slide editor after an edit');

  // ↩︎ Undo my edits puts the built slide back
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; render(); }); await page.waitForTimeout(800);
  await page.evaluate(sid => FTSlideEdit.reset(3, sid), sid); await page.waitForTimeout(1600);
  const after = await get('settings:dayslides');
  if (((((after || {}).days || {})['3'] || {})[sid])) fail('↩︎ Undo my edits left the edit in place');
  if (/Trainer wrote this line/.test(await page.evaluate(() => (document.querySelector('.ftdd-sheet') || {}).innerText || ''))) fail('the built slide didn\'t come back');

  await put('settings:dayslides', { v: 1, days: {} });
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Slide editor test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Slide editor test passed (a trainee has no editor and the editor refuses to open for one; the trainer edits a day slide from the deck — bold, colour, bullets, a card, a table, a pasted picture resized to ½ and a link — and saves it; scripts, handlers, javascript: links and foreign embeds are cleaned out; the trainee opens the edited slide, picture and all; ↩︎ Undo my edits puts the built slide back).');
})().catch(e => { console.error(e); process.exit(1); });
