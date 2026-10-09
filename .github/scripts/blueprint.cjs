// Blueprint test for a course portal (js/lsh-blueprint.js, js/lsh-blueprint-course.js and the
// course's js/blueprint-content.js), against .github/scripts/server.mjs. jsPDF is served from
// node_modules in place of cdnjs; /version is answered by the test so the deployment can change.
// Checks:
// - a trainee has no Trainer blueprint (it doesn't open, and Orientation isn't theirs), and has the 📘 Platform
//   Blueprint button (the Trainee blueprint PDF) on the top bar, and no Blueprint card on the dashboard;
// - a trainer's 🧭 Orientation has the Trainee / Trainer blueprint tabs; 🛠 Trainer blueprint opens the
//   trainer deck with both tabs, ◀ ▶ and the keys go through every slide, each fits on a laptop and on a
//   phone, Esc closes it, and the Trainee tab goes back to Orientation;
// - the slide numbers match everywhere: the cover is the Cover (the counter reads "Cover · N slides"), then
//   slides 1 to N on the contents buttons, the counter, each slide's header and footer, and the PDF's page
//   footers ("Cover", then "1 / N" to "N / N"); nothing ever shows N + 1 (a 15-slide deck used to say "16 / 16");
// - ⬇ Download PDF saves the Trainer blueprint: a page a slide, stamped with the build and the deployment;
// - the Trainee blueprint (/blueprint.pdf) is republished after every deploy: once for a new deployment
//   id, not again for the same one, and again when the deployment changes with APP_BUILD left as it was.
// Usage: node .github/scripts/blueprint.cjs [baseUrl]   (with server.mjs running; needs `npm i playwright jspdf@4.2.1`)
const { chromium } = require('playwright');
// The sign-in form is gone (trainees arrive from the Portal with a ticket, which the Portal's gate turns into these three hidden
// fields and a submitLogin() call). This local server has no Portal secret, so do the same step by hand.
const signIn = (page, first, last, batch) => page.evaluate(([f, l, b]) => {
    ['loginFirstInput', f, 'loginLastInput', l, 'loginBatchInput', b].forEach((v, i, a) => { if (i % 2) return; const el = document.createElement('input'); el.type = 'hidden'; el.id = v; el.value = a[i + 1]; document.body.appendChild(el); });
    return window.submitLogin();
}, [first, last, batch]);
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
    await signIn(page, 'Blue', admin ? 'Trainer' : 'Print', 'B100926'); await page.waitForTimeout(1200);
    if (admin) await page.evaluate(() => { state.isAdmin = true; goto('orientation'); render(); });
    await page.waitForTimeout(300);
    return page;
}
async function walk(page, label) {
    return page.evaluate(async (label) => {
        const out = [];
        // the cover and the slides (not from the counter: on the cover it reads "Cover · N slides", with no '/')
        const total = LSHBlueprint.decks()[LSHBlueprint.current().deck].slides.length + 1, n = total - 1;
        const nums = (s) => (s.match(/\d+/g) || []).map(Number);
        for (let i = 0; i < total; i++) {
            LSHBlueprint.go(i, true); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const slide = document.getElementById('lbp-slide'), card = slide.firstElementChild;
            const name = i === 0 ? `${label} cover` : `${label} slide ${i}`;
            if (!card) { out.push(`${name}: nothing drawn`); continue; }
            const over = [card, ...card.querySelectorAll('.lbp-main, .lbp-points, .lbp-side, .lbp-contents')].filter(e => e.scrollHeight - e.clientHeight > 2 || e.scrollWidth - e.clientWidth > 2);
            if (over.length) out.push(`${name}: cut off (${over.map(e => e.className).join(', ')})`);
            const sr = slide.getBoundingClientRect(), stage = document.getElementById('lbp-stage').getBoundingClientRect();
            if (sr.left < stage.left - 1 || sr.right > stage.right + 1 || sr.top < stage.top - 1 || sr.bottom > stage.bottom + 1) out.push(`${name}: bigger than the screen`);
            if ([...card.querySelectorAll('.lbp-foot, .lbp-points li:last-child, .lbp-tip')].some(e => e.getBoundingClientRect().bottom > sr.bottom + 1)) out.push(`${name}: runs past the bottom of the slide`);
            // the numbers: the Cover (★), then 1 to n on the counter, the highlighted contents button, the slide's header and footer
            const count = document.getElementById('lbp-count').textContent.trim();
            const on = (document.querySelector('#lbp-toc button.on') || {}).textContent || '';
            const foot = card.querySelector('.lbp-foot span:last-child'), kicker = card.querySelector('.lbp-head .lbp-kicker');
            const shown = { counter: count, footer: foot ? foot.textContent.trim() : '', header: kicker ? kicker.textContent.trim() : '' };
            if (i === 0) {
                if (count !== `Cover · ${n} slides`) out.push(`${name}: the counter reads "${count}", not "Cover · ${n} slides"`);
                if (on.trim() !== '★') out.push(`${name}: the highlighted contents button is "${on}", not ★`);
            } else {
                if (count !== `${i} / ${n}`) out.push(`${name}: the counter reads "${count}", not "${i} / ${n}"`);
                if (on.trim() !== String(i)) out.push(`${name}: the highlighted contents button is "${on}", not ${i}`);
                if (shown.footer !== `${i} / ${n}`) out.push(`${name}: the footer reads "${shown.footer}", not "${i} / ${n}"`);
                if (!shown.header.endsWith(`· ${i} of ${n}`)) out.push(`${name}: the header reads "${shown.header}", not "… · ${i} of ${n}"`);
            }
            Object.entries(shown).forEach(([where, text]) => { if (nums(text).some(x => x > n)) out.push(`${name}: the ${where} shows a number past the last slide (${n}): "${text}"`); });
            if (i === n) {
                const last = [...document.querySelectorAll('#lbp-toc button')].pop();
                if (!last || count !== `${last.textContent.trim()} / ${n}`) out.push(`${name} (the last): the counter "${count}" doesn't match the last contents button "${last ? last.textContent.trim() : ''}"`);
            }
        }
        return { out, total, n };
    }, label);
}
(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

    // ---- a trainee ----
    let page = await open(browser, { width: 1366, height: 768 }, false);
    const t = await page.evaluate(() => ({ opened: LSHBlueprint.open('trainer'), isOpen: LSHBlueprint.isOpen(), tabs: !!document.querySelector('.lbp-or-tabs') }));
    if (t.opened || t.isOpen || t.tabs) fail(`a trainee could reach the Trainer blueprint: ${JSON.stringify(t)}`);
    // Foundational: the main landing page shows neither a Platform Blueprint nor a Practice Lab / Simulators card;
    // the 📘 Platform Blueprint button stays in the top bar, opening /blueprint.pdf
    const dash = await page.evaluate(() => { goto('dashboard'); render(); const b = document.querySelector('.nav-blueprint'); return { cards: [...document.querySelectorAll('.fts-banner')].map(x => x.textContent.trim().slice(0, 40)), btn: b ? b.getAttribute('onclick') : null }; });
    if (dash.cards.length) fail(`a trainee's landing page still shows the Blueprint or Simulators card: ${JSON.stringify(dash.cards)}`);
    if (!dash.btn || !dash.btn.includes('/blueprint.pdf')) fail(`a trainee's top bar has no 📘 Platform Blueprint button opening /blueprint.pdf: ${dash.btn}`);
    await page.context().close();

    // ---- a trainer, on a laptop ----
    page = await open(browser, { width: 1366, height: 768 }, true);
    const tabs = await page.evaluate(() => [...document.querySelectorAll('.lbp-or-tabs button')].map(b => b.textContent.trim()));
    if (tabs.join('|') !== '🧭 Trainee blueprint|🛠 Trainer blueprint') fail(`Orientation's blueprint tabs: ${tabs.join('|')}`);
    await page.click('#lbp-or-trainer'); await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ open: LSHBlueprint.isOpen(), deck: document.getElementById('lbp-slide').dataset.deck, tabs: [...document.querySelectorAll('#lbp-tabs button')].filter(b => b.offsetParent).map(b => b.textContent.trim()), sub: document.getElementById('lbp-sub').textContent, build: APP_BUILD, n: (LSHBlueprint.decks().trainer || { slides: [] }).slides.length, count: document.getElementById('lbp-count').textContent.trim() }));
    if (!a.open || a.deck !== 'trainer' || a.tabs.join() !== 'Trainer blueprint,Trainee blueprint') fail(`🛠 Trainer blueprint didn't open the trainer deck with both tabs: ${JSON.stringify(a)}`);
    if (!a.sub.includes(`build ${a.build}`) || !a.sub.includes('deploy dep-aaaa')) fail(`the Trainer blueprint's header doesn't show the build and deployment: ${a.sub}`);
    // the cover isn't counted: it's the Cover, then the slides are 1 to n (a 15-slide deck says 15, never 16)
    if (a.count !== `Cover · ${a.n} slides`) fail(`the Trainer blueprint opened with the counter reading "${a.count}", not "Cover · ${a.n} slides"`);
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    const two = (await page.textContent('#lbp-count')).trim();
    if (two !== `2 / ${a.n}`) fail(`← → didn't move through the trainer deck: after → → the counter reads "${two}", not "2 / ${a.n}"`);
    // the last contents button goes to the last slide, numbered the same: "n / n" on the counter and the footer; → goes no further
    await page.click('#lbp-toc button:last-child'); await page.keyboard.press('ArrowRight');
    const end = await page.evaluate(() => ({ button: [...document.querySelectorAll('#lbp-toc button')].pop().textContent.trim(), counter: document.getElementById('lbp-count').textContent.trim(), footer: (document.querySelector('#lbp-slide .lbp-foot span:last-child') || {}).textContent }));
    if (end.button !== String(a.n) || end.counter !== `${a.n} / ${a.n}` || end.footer !== `${a.n} / ${a.n}`) fail(`the last slide should read "${a.n} / ${a.n}", like its contents button ${a.n}: ${JSON.stringify(end)}`);
    const w = await walk(page, 'trainer 1366px'); w.out.forEach(fail);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#lbp-pdf-btn')]);
    const pdf = inspect(fs.readFileSync(await dl.path()));
    if (!/_Blueprint_Trainer\.pdf$/.test(dl.suggestedFilename()) || !pdf.pdf || pdf.pages !== w.total) fail(`the Trainer blueprint PDF: ${dl.suggestedFilename()}, ${pdf.pages} pages for a cover and ${w.n} slides`);
    // its page footers: "Cover", then "1 / n" to "n / n", in order (never "n+1 / n+1")
    const lines = pdf.text.split('\n').map(x => x.trim()), feet = lines.filter(x => /^\d+ \/ \d+$/.test(x));
    const want = Array.from({ length: w.n }, (_, k) => `${k + 1} / ${w.n}`);
    if (!lines.includes('Cover') || feet.join(', ') !== want.join(', ')) fail(`the Trainer blueprint PDF's page footers should be Cover, then 1 / ${w.n} to ${w.n} / ${w.n}; they are: ${lines.includes('Cover') ? 'Cover' : '(no Cover)'}, ${feet.join(', ')}`);
    if (!pdf.text.includes(`${w.n} / ${w.n}`) || pdf.text.includes(`${w.n + 1} / ${w.n + 1}`)) fail(`the Trainer blueprint PDF's last page should say ${w.n} / ${w.n}, and no page ${w.n + 1} / ${w.n + 1}`);
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
    console.log(`Blueprint test passed (Trainer blueprint: a cover and ${w.n} slides, numbered Cover then 1 / ${w.n} to ${w.n} / ${w.n} on screen and in its PDF, build and deployment stamped; trainees can't open it; the Trainee blueprint republished once per deploy).`);
})().catch(e => { console.error(e); process.exit(1); });
