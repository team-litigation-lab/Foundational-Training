// 🚪 A shared computer (index.html clearTraineeDevice): one trainee signs out — 🚪 Log out, or their access is revoked
// (forceRevokedLogout) — and the next trainee who signs in on the same browser starts clean: none of the first one's
// progress, notes, saved-at stamp, sign-in or writes still waiting to be sent (lsh_unsent:) is left on the device, and a
// write kept for one trainee is never read back or sent again under another's sign-in.
// Usage: NODE_PATH=…/node_modules node .github/scripts/shared-browser.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B020325';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage();
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const leftovers = () => page.evaluate(() => { const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
      return { unsent: ks.filter(k => k.startsWith('lsh_unsent:')), stamp: localStorage.getItem('lsh_progress-saved-at'), id: state.traineeId, name: state.traineeName,
        progress: Object.keys(state.progress || {}).length, notes: (state.notes || []).length, view: state.view }; });

    for (const how of ['logout', 'revoked']) {
      // the first trainee: progress, a note, a saved-at stamp, and a write that didn't reach the server
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
      await signIn(page, 'Una', how === 'logout' ? 'First' : 'Revoked', BATCH);
      const una = await page.evaluate(() => state.traineeId);
      if (!una) { fail(`${how}: the first trainee didn't sign in`); continue; }
      await page.evaluate(id => { state.progress = { 1: { done: true, score: 88 } }; state.notes = [{ id: 'n1', text: 'mine' }];
        localStorage.setItem('lsh_progress-saved-at', String(Date.now())); keepUnsent('progress:' + id, { secret: 'Una' }, Date.now()); }, una);
      // (sending the waiting write fails, as when the connection is down: it must not be left for the next trainee)
      await page.route('**/api/storage/set', r => r.abort());
      if (how === 'logout') await page.evaluate(() => logout()); else await page.evaluate(() => forceRevokedLogout('revoked'));
      await page.waitForTimeout(600); await page.unroute('**/api/storage/set');
      const left = await leftovers();
      if (left.unsent.length) fail(`${how}: the first trainee's unsent writes are still on the device: ${left.unsent}`);
      if (left.stamp) fail(`${how}: the first trainee's saved-at stamp is still on the device`);
      if (left.id || left.name || left.progress || left.notes) fail(`${how}: the first trainee is still in the page: ${JSON.stringify(left)}`);
      if (left.view !== 'login') fail(`${how}: not back on the sign-in page: ${left.view}`);
      if (await page.evaluate(() => typeof getTraineeToken === 'function' ? !!getTraineeToken() : false)) fail(`${how}: the first trainee's sign-in is still on the device`);
    }

    // a write kept for one trainee is read back and sent again only under their own sign-in
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await signIn(page, 'Vic', 'Second', BATCH);
    const kept = await page.evaluate(() => { localStorage.setItem('lsh_unsent:notes:someone-else--b1', JSON.stringify({ at: Date.now(), val: { x: 1 }, by: 'someone-else--b1' }));
      return readUnsent('notes:someone-else--b1'); });
    if (kept) fail('another trainee\'s waiting write is read back under this sign-in');
  } catch (err) { fail('the test crashed: ' + (err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Shared browser test FAILED:\n' + failures.map(f => ' - ' + f).join('\n')); process.exit(1); }
  console.log('Shared browser test passed (🚪 Log out and a revoked access each leave nothing of the trainee on the device: progress, notes, saved-at stamp, sign-in, writes waiting to be sent; a waiting write is never read back under another trainee\'s sign-in)');
})();
