// 📖 The Glossary button is on the top bar a trainee, a trainer and a trainer's 👁 Trainee view see (on the bar itself, or
//   in its 📚 Guides menu, where js/lsh-topbar.js groups it), and it opens /glossary.html in a new tab.
//   js/eapa-updates.js draws the top bar the pages use (it replaces index.html's renderTopbar), so the button is drawn there.
// Usage: NODE_PATH=…/node_modules node .github/scripts/glossary-button.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
async function look(page, who) {
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const b = document.querySelector('.topbar .nav-glossary');
    if (!b) return { there: false };
    const grp = b.closest('.lsh-grp');
    if (grp && !grp.classList.contains('open')) grp.querySelector(':scope > button').click();
    const box = b.getBoundingClientRect();
    return { there: true, shown: box.width > 0 && box.height > 0 && getComputedStyle(b).visibility !== 'hidden', text: b.textContent, inMenu: !!grp };
  });
  if (!r.there) return fail(`${who}: no 📖 Glossary button on the top bar`);
  if (!r.shown) fail(`${who}: the 📖 Glossary button isn't visible (${JSON.stringify(r)})`);
  if (!/Glossary/.test(r.text)) fail(`${who}: the button reads "${r.text}"`);
  const opened = await page.evaluate(() => { let u = ''; const o = window.open; window.open = (x) => { u = x; return null; };
    try { document.querySelector('.topbar .nav-glossary').click(); } finally { window.open = o; } return u; });
  if (opened !== '/glossary.html') fail(`${who}: the button opens "${opened}", not /glossary.html`);
  await page.evaluate(() => document.body.click());
}
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  try {
    const g = await (await page.request.get(new URL('/glossary.html', BASE).href)).status();
    if (g !== 200) fail(`/glossary.html answers ${g}`);
    await page.goto(BASE, { waitUntil: 'load' });
    await signIn(page, 'Gina', 'Glossary', 'B110226');
    await page.evaluate(() => goto('dashboard'));
    await look(page, 'a trainee');
    // a trainer, and the trainer's 👁 Trainee view (the bar drawn without a trainee signed in)
    const p2 = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    p2.on('pageerror', e => fail(`page error: ${e.message}`));
    await p2.goto(BASE, { waitUntil: 'load' }); await p2.waitForFunction(() => typeof goto === 'function');
    await p2.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.adminToken = 'test'; goto('dashboard'); });
    await look(p2, 'a trainer');
    await p2.evaluate(() => { state.isAdmin = true; state.adminPreview = true; goto('dashboard'); });
    await look(p2, "a trainer's Trainee view");
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Glossary button FAILED:\n  - ' + failures.join('\n  - ')); process.exit(1); }
  console.log('Glossary button: on the top bar for a trainee, a trainer and the Trainee view, opening /glossary.html');
})();
