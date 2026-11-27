// 📖 The Glossary is off the training: no button on the top bar a trainee, a trainer or a trainer's 👁 Trainee view sees.
//   js/eapa-updates.js draws the top bar the pages use (it replaces index.html's renderTopbar), so the button is drawn there.
// Usage: NODE_PATH=…/node_modules node .github/scripts/glossary-button.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
async function look(page, who) {
  await page.waitForTimeout(700);
  // (📖 the Glossary is off the training: no button on the top bar, its menu included)
  if (await page.evaluate(() => !!document.querySelector('.topbar .nav-glossary'))) fail(`${who}: the 📖 Glossary button is still on the top bar`);
}
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  try {
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
  console.log('Glossary button: off the top bar for a trainee, a trainer and the Trainee view');
})();
