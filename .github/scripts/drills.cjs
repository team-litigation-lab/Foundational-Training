// 🏷 Naming & Reporting Drills (js/ft-drills.js): every question, many times over, accepts its own answer typed with
//   other dashes, spacing and capitals, and refuses one with a part missing; the guide's own samples pass against the
//   conventions (the LOR's four-digit year included); the fax number is exact. A trainee's round: the wrong answer
//   shown with the convention, the round saved in drills:<id>, the best round on 🏅 My Performance; the Practice
//   Lab's Drafting Tools card and the demo days' steps point to it.
// Usage: NODE_PATH=…/node_modules node .github/scripts/drills.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Dina', 'Drill', 'B102926');
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('drills:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // every question, 25 times: its own answer passes in other dress, a part missing fails
  const bad = await page.evaluate(() => {
    const out = [];
    FTDrills.sets.forEach(s => s.items.forEach((g, n) => { for (let k = 0; k < 25; k++) {
      const q = g();
      if (!q.ask || !q.answer || !q.rule || !q.facts.length) { out.push(`${s.id}#${n}: incomplete question`); continue; }
      if (!FTDrills.check(q, q.answer)) out.push(`${s.id}#${n}: its own answer fails: ${q.answer}`);
      if (!q.exact) {
        const dressed = '  ' + q.answer.replace(/ – /g, ' - ').replace(/ - /g, ' – ').toUpperCase().replace(/ /g, '  ') + ' ';
        if (!FTDrills.check(q, dressed)) out.push(`${s.id}#${n}: dashes/spacing/capitals not forgiven: ${dressed}`);
      }
      const cut = q.answer.replace(/\s*\([^()]*\)\s*$/, '') !== q.answer ? q.answer.replace(/\s*\([^()]*\)\s*$/, '') : q.answer.slice(0, -3);
      if (FTDrills.check(q, cut)) out.push(`${s.id}#${n}: an answer with a part missing passes: ${cut}`);
    } }));
    // the guide's own samples, against the conventions
    const samples = [
      [{ answer: 'INS – 1P State Farm – LOR 02.17.26 (Michelle)', yearEither: true }, 'INS – 1P State Farm – LOR 02.17.2026 (Michelle)'],
      [{ answer: 'INS – 3P Geico – LOR with Affidavit 02.17.26 (Michelle)', yearEither: true }, 'INS – 3P Geico – LOR with Affidavit 02.17.2026 (Michelle)'],
      [{ answer: 'MED - JML(Lyons Physical Therapy) - MedLOR with Unsworn COR and HIPAA 08.11.22 (John)' }, 'MED - JML(Lyons Physical Therapy) - MedLOR with Unsworn COR and HIPAA 08.11.22 (John)'],
      [{ answer: 'MED – RDG(NPIM Dr. Fabito) – Lien Balance Verification 08.17.2022 (jane)' }, 'MED - RDG(NPIM Dr. Fabito) - Lien Balance Verification 08.17.2022 (jane)'],
      [{ answer: 'Billing Reduction Request | DOE, JOHN' }, 'Billing Reduction Request | DOE, JOHN'],
      [{ answer: '+17029982171@metrofax.com', exact: true }, '+17029982171@metrofax.com']];
    samples.forEach(([q, s]) => { if (!FTDrills.check(q, s)) out.push(`the guide's sample fails: ${s}`); });
    if (FTDrills.check({ answer: 'MED - JML(Lyons Physical Therapy) - MedLOR with Unsworn COR and HIPAA 08.11.22 (John)' }, 'MED - JML(Lyons Physical Therapy) - MedLOR with Unsworn COR and HIPAA 08.11.2022 (John)')) out.push('a four-digit year passes where the convention asks for mm.dd.yy');
    if (FTDrills.check({ answer: '+17029982171@metrofax.com', exact: true }, '+1 702-998-2171@metrofax.com')) out.push('a fax address with dashes passes');
    return out;
  });
  bad.slice(0, 12).forEach(fail);

  // the Practice Lab card and the demo days
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);
  if (!(await page.$('text=Open the drills'))) fail('the Drafting Tools have no 🏷 Naming & Reporting Drills card');
  const steps = await page.evaluate(() => [8, 12, 14, 16, 17, 18].map(d => (FTDays.of(d).items || []).some(x => x.at === 'tool' && x.id === 'drills')));
  if (steps.some(x => !x)) fail(`not every demo day has its drill step: ${JSON.stringify(steps)}`);

  // a round of MedLOR: one wrong answer
  await page.click('text=Open the drills'); await page.waitForTimeout(800);
  await page.evaluate(() => FTDrills.start('medlor')); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) {
    const ans = await page.evaluate(() => FTDrills.round().qs[FTDrills.round().i].answer);
    await page.fill('#drAns', i === 0 ? ans + ' X' : ans);   // always wrong, whatever the question
    await page.press('#drAns', 'Enter'); await page.waitForTimeout(120);
    if (i === 0) {
      const fb = await page.evaluate(() => (document.querySelector('.dr-fb') || {}).innerText || '');
      if (!/Not quite/.test(fb) || !/The convention gives/.test(fb)) fail(`a wrong answer doesn't show the convention: ${fb}`);
    }
    await page.click('#drNext'); await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  if (!/9\s*of 10/.test(await page.evaluate(() => (document.querySelector('.dr-big') || {}).innerText || ''))) fail('the round doesn\'t end on 9 of 10');
  const rec = await get('drills:' + id);
  if (!rec || !rec.runs.some(r => r.set === 'medlor' && r.score === 9 && r.total === 10)) fail(`the round wasn't saved: ${JSON.stringify(rec)}`);
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!/Naming & Reporting Drills[\s\S]*MedLOR[\s\S]*90%/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the best MedLOR round');

  await put('drills:' + id, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Naming & Reporting Drills test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Naming & Reporting Drills test passed (every question accepts its own answer in other dashes, spacing and capitals and refuses one with a part missing; the guide\'s samples pass; mm.dd.yy and the fax address strict; the Drafting Tools card and the demo days\' steps; a round with the convention shown for a miss, saved, and on My Performance).');
})().catch(e => { console.error(e); process.exit(1); });
