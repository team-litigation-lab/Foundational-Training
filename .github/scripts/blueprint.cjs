// Blueprint test for a course portal (js/lsh-blueprint.js, js/lsh-blueprint-course.js and the
// course's js/blueprint-content.js), against .github/scripts/server.mjs. jsPDF is served from
// node_modules in place of cdnjs; /version is answered by the test so the deployment can change.
// Checks:
// - a trainee has no Trainer blueprint (it doesn't open, and Orientation isn't theirs), and has the 📘 Platform
//   Blueprint card (the Trainee blueprint PDF) on the dashboard;
// - a trainer's 🧭 Orientation has the Trainee / Trainer blueprint tabs; 🛠 Trainer blueprint opens the
//   trainer deck with both tabs, ◀ ▶ and the keys go through every slide, each fits on a laptop and on a
//   phone, Esc closes it, and the Trainee tab goes back to Orientation;
// - ⬇ Download PDF saves the Trainer blueprint: a page a slide, stamped with the build and the deployment;
// - the Trainee blueprint (/blueprint.pdf) is republished after every deploy: once for a new deployment
//   id, not again for the same one, and again when the deployment changes with APP_BUILD left as it was.
// Usage: node .github/scripts/blueprint.cjs [baseUrl]   (with server.mjs running; needs `npm i playwright jspdf@4.2.1`)
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const BASE = process.argv[2] || 'http://localhost:8787/';
const JSPDF = fs.readFileSync(path.join(path.dirname(require.resolve('jspdf')), 'jspdf.umd.min.js'));
const failures = []; const fail = (m) => failures.push(m);
function inspect(buf) {
    let raw = buf.toString('latin1'), at = 0; const parts = [raw];
    while ((at = raw.indexOf('stream', at)) >= 0) {
        const start = raw.indexOf('\n', at) + 1, end = raw.indexOf('endstream', start);
        if (start <= 0 || end < 0) break;
        try { parts.push(zlib.inflateSync(buf.subarray(start, end)).toString('latin1')); } catch (e) { /* not a Flate stream */ }
        at = end + 9;
    }
    raw = parts.join('\n');
    const text = (raw.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || []).map(s => s.replace(/\)\s*Tj$/, '').slice(1).replace(/\\(.)/g, '$1')).join('\n');
    return { pdf: parts[0].startsWith('%PDF'), pages: (raw.match(/\/Type \/Page\b(?!s)/g) || []).length, text };
}
let deployment = 'dep-aaaa1111-first';
async function open(browser, viewport, admin) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', e => fail(`${viewport.width}px: page error: ${e.message}`));
    await page.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/4\.2\.1\/jspdf\.umd\.min\.js/, r => r.fulfill({ contentType: 'text/javascript', body: JSPDF }));
    await page.route(/\/version$/, r => r.fulfill({ contentType: 'text/plain', body: `Portal build deployed: test\nDeployment: ${deployment}\n` }));
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await page.fill('#loginFirstInput', 'Blue'); await page.fill('#loginLastInput', admin ? 'Trainer' : 'Print'); await page.fill('#loginBatchInput', 'CIBP');
    await page.click('#loginSubmitBtn'); await page.waitForTimeout(1200);
    if (admin) await page.evaluate(() => { state.isAdmin = true; goto('orientation'); render(); });
    await page.waitForTimeout(300);
    return page;
}
async function walk(page, label) {
    return page.evaluate(async (label) => {
        const out = [];
        const total = Number(document.getElementById('lbp-count').textContent.split('/')[1]);
        for (let i = 0; i < total; i++) {
            LSHBlueprint.go(i, true); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const slide = document.getElementById('lbp-slide'), card = slide.firstElementChild;
            if (!card) { out.push(`${label} slide ${i + 1}: nothing drawn`); continue; }
            const over = [card, ...card.querySelectorAll('.lbp-main, .lbp-points, .lbp-side, .lbp-contents')].filter(e => e.scrollHeight - e.clientHeight > 2 || e.scrollWidth - e.clientWidth > 2);
            if (over.length) out.push(`${label} slide ${i + 1}: cut off (${over.map(e => e.className).join(', ')})`);
            const sr = slide.getBoundingClientRect(), stage = document.getElementById('lbp-stage').getBoundingClientRect();
            if (sr.left < stage.left - 1 || sr.right > stage.right + 1 || sr.top < stage.top - 1 || sr.bottom > stage.bottom + 1) out.push(`${label} slide ${i + 1}: bigger than the screen`);
            if ([...card.querySelectorAll('.lbp-foot, .lbp-points li:last-child, .lbp-tip')].some(e => e.getBoundingClientRect().bottom > sr.bottom + 1)) out.push(`${label} slide ${i + 1}: runs past the bottom of the slide`);
        }
        return { out, total };
    }, label);
}
(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

    // ---- a trainee ----
    let page = await open(browser, { width: 1366, height: 768 }, false);
    const t = await page.evaluate(() => ({ opened: LSHBlueprint.open('trainer'), isOpen: LSHBlueprint.isOpen(), tabs: !!document.querySelector('.lbp-or-tabs') }));
    if (t.opened || t.isOpen || t.tabs) fail(`a trainee could reach the Trainer blueprint: ${JSON.stringify(t)}`);
    // Foundational: Handouts isn't part of this program, so the dashboard has the 📘 Platform Blueprint card
    const card = await page.evaluate(() => { goto('dashboard'); render(); const b = [...document.querySelectorAll('.fts-banner')].find(x => /Platform Blueprint/.test(x.textContent)); return b ? b.getAttribute('onclick') : null; });
    if (!card || !card.includes('/blueprint.pdf')) fail(`a trainee's dashboard has no 📘 Platform Blueprint card opening /blueprint.pdf: ${card}`);
    await page.context().close();

    // ---- a trainer, on a laptop ----
    page = await open(browser, { width: 1366, height: 768 }, true);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.lbp-or-tabs button')].map(b => b.textContent.trim()));
    if (tabs.join('|') !== '🧭 Trainee blueprint|🛠 Trainer blueprint') fail(`Orientation's blueprint tabs: ${tabs.join('|')}`);
    await page.click('#lbp-or-trainer'); await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ open: LSHBlueprint.isOpen(), deck: document.getElementById('lbp-slide').dataset.deck, tabs: [...document.querySelectorAll('#lbp-tabs button')].filter(b => b.offsetParent).map(b => b.textContent.trim()), sub: document.getElementById('lbp-sub').textContent, build: APP_BUILD }));
    if (!a.open || a.deck !== 'trainer' || a.tabs.join() !== 'Trainer blueprint,Trainee blueprint') fail(`🛠 Trainer blueprint didn't open the trainer deck with both tabs: ${JSON.stringify(a)}`);
    if (!a.sub.includes(`build ${a.build}`) || !a.sub.includes('deploy dep-aaaa')) fail(`the Trainer blueprint's header doesn't show the build and deployment: ${a.sub}`);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    if (!(await page.textContent('#lbp-count')).startsWith('3 /')) fail('← → didn\'t move through the trainer deck');
    const w = await walk(page, 'trainer 1366px'); w.out.forEach(fail);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#lbp-pdf-btn')]);
    const pdf = inspect(fs.readFileSync(await dl.path()));
    if (!/_Blueprint_Trainer\.pdf$/.test(dl.suggestedFilename()) || !pdf.pdf || pdf.pages !== w.total) fail(`the Trainer blueprint PDF: ${dl.suggestedFilename()}, ${pdf.pages} pages for ${w.total} slides`);
    if (!pdf.text.includes(`build ${a.build}`) || !pdf.text.includes('deploy dep-aaaa')) fail('the Trainer blueprint PDF isn\'t stamped with the build and the deployment');
    const titles = await page.evaluate(() => LSHBlueprint.decks().trainer.slides.map(s => s.title.replace(/[^\x00-\xff]/g, '').trim()));
    const missing = titles.filter(x => !pdf.text.includes(x)); if (missing.length) fail(`the Trainer blueprint PDF is missing: ${missing.join(' | ')}`);
    if (/chartswap|casepeer/i.test(pdf.text)) fail('the Trainer blueprint names another product');
    await page.click('#lbp-tabs button[data-deck="trainee"]'); await page.waitForTimeout(300);
    const back = await page.evaluate(() => ({ open: LSHBlueprint.isOpen(), view: state.view }));
    if (back.open || back.view !== 'orientation') fail(`the Trainee blueprint tab should go back to Orientation: ${JSON.stringify(back)}`);
    await page.click('#lbp-or-trainer'); await page.keyboard.press('Escape');
    if (await page.evaluate(() => LSHBlueprint.isOpen())) fail('Esc didn\'t close the Trainer blueprint');

    // ---- the Trainee blueprint is republished after every deploy ----
    const pub = await page.evaluate(async () => {
        const sets = [];
        const realSet = window.sharedSet;
        window.sharedSet = async (k, v) => { if (k === 'blueprint:pdf') sets.push(v.deploy || ''); return realSet(k, v); };
        window.buildOrientationPdfDoc = async () => ({ output: () => 'data:application/pdf;base64,JVBERi0xLjQK' });
        const run = async () => { lshBlueprintDeployment.reset(); state.blueprintJob = false; await autoPublishBlueprint(); return sets.length; };
        const r = { first: await run(), same: await run() };
        return r;
    });
    if (pub.first !== 1 || pub.same !== 1) fail(`the blueprint should publish once for a deploy and not again: ${JSON.stringify(pub)}`);
    deployment = 'dep-bbbb2222-second';
    const pub2 = await page.evaluate(async () => { lshBlueprintDeployment.reset(); state.blueprintJob = false; await autoPublishBlueprint(); return (await sharedGet('blueprint:meta')) || {}; });
    if (pub2.deploy !== 'dep-bbbb2222-second') fail(`a new deploy (same APP_BUILD) didn't republish the blueprint: ${JSON.stringify(pub2)}`);
    const served = await page.evaluate(async () => { const r = await fetch('/blueprint.pdf'); return { status: r.status, type: r.headers.get('content-type') }; });
    if (served.status !== 200 || !/pdf/.test(served.type || '')) fail(`/blueprint.pdf after publishing: ${JSON.stringify(served)}`);
    await page.context().close();

    // ---- a trainer, on a phone ----
    page = await open(browser, { width: 390, height: 844 }, true);
    await page.evaluate(() => LSHBlueprint.open('trainer'));
    (await walk(page, 'trainer 390px')).out.forEach(fail);

    await browser.close();
    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log(`Blueprint test passed (Trainer blueprint: ${w.total} slides and its PDF, build and deployment stamped; trainees can't open it; the Trainee blueprint republished once per deploy).`);
})().catch(e => { console.error(e); process.exit(1); });
