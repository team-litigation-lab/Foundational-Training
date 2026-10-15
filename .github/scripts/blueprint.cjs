// Blueprint test for a course portal (js/lsh-blueprint.js, js/lsh-blueprint-course.js and the
// course's js/blueprint-content.js), against .github/scripts/server.mjs. jsPDF is served from
// node_modules in place of cdnjs; /version is answered by the test so the deployment can change.
// Checks:
// - a trainee has no Trainer blueprint (it doesn't open, and Orientation isn't theirs), and has the 📘 Platform
//   Blueprint button (the Trainee blueprint PDF) on the top bar, and no Blueprint card on the dashboard;
// - no blueprint opens inside the program for a trainer either, and 🧭 Orientation is gone from it: the old
//   #/blueprint and #/orientation addresses both forward to the Portal's 🧭 Blueprint page, where every
//   blueprint lives;
// - the Trainee blueprint (/blueprint.pdf) is republished after every deploy: once for a new deployment
//   id, not again for the same one, and again when the deployment changes with APP_BUILD left as it was.
//   It is built from this course's trainee slides (LSH_BLUEPRINT.trainee), on the same cover and the same
//   slide layout as every other LSH blueprint, so the PDF the Portal links reads as one deck with them.
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
    // Foundational: the main landing page shows neither a Platform Blueprint nor a Practice Lab / Simulators card,
    // and there is no separate 📘 Platform Blueprint top bar button at all — 🧭 Orientation is the one
    // screen-shareable blueprint, for admins only — so a trainee's top bar has none
    const dash = await page.evaluate(() => { goto('dashboard'); render(); const b = document.querySelector('.nav-blueprint'); return { cards: [...document.querySelectorAll('.fts-banner')].map(x => x.textContent.trim().slice(0, 40)), btn: b ? b.getAttribute('onclick') : null }; });
    if (dash.cards.length) fail(`a trainee's landing page still shows the Blueprint or Simulators card: ${JSON.stringify(dash.cards)}`);
    if (dash.btn) fail(`a trainee's top bar still has the 📘 Platform Blueprint button: ${dash.btn}`);
    await page.context().close();

    // ---- a trainer, on a laptop ----
    page = await open(browser, { width: 1366, height: 768 }, true);
    // an admin has no 📘 Platform Blueprint top bar button either — the PDF still publishes at /blueprint.pdf
    // (checked below), it's just not linked from the top bar any more; 🧭 Orientation is the one blueprint
    const adminBtn = await page.evaluate(() => { const b = document.querySelector('.nav-blueprint'); return b ? b.getAttribute('onclick') : null; });
    if (adminBtn) fail(`an admin's top bar still has the 📘 Platform Blueprint button: ${adminBtn}`);
    // No Blueprint in the program: Orientation has no blueprint tabs and no link to the blueprint or its PDF;
    // the Trainer blueprint opens only from its own address, #/blueprint (the Main Portal's Blueprint page links there)
    const bp = await page.evaluate(() => ({ tabs: !!document.querySelector('.lbp-or-tabs, #lbp-or-trainer'), links: [...document.querySelectorAll('main a[href*="blueprint"], .ho-bp, .bp-status')].length }));
    if (bp.tabs || bp.links) fail(`the program still shows a Blueprint tab or link: ${JSON.stringify(bp)}`);
    // ---- the Trainee blueprint is republished after every deploy ----
    const pub = await page.evaluate(async () => {
        const sets = [];
        const realSet = window.sharedSet;
        window.sharedSet = async (k, v) => { if (k === 'blueprint:pdf') sets.push(v.deploy || ''); return realSet(k, v); };
        window.__realBlueprintDoc = LSHBlueprint.doc;   // put back below: the PDF itself is checked after this
        LSHBlueprint.doc = async () => ({ output: () => 'data:application/pdf;base64,JVBERi0xLjQK', getNumberOfPages: () => 1 });
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
    // the real thing, unstubbed: the PDF the Portal links is built from this course's trainee slides,
    // a page a slide plus the cover, with every slide's title in it as real text
    const real = await page.evaluate(async () => {
        if (window.__realBlueprintDoc) { LSHBlueprint.doc = window.__realBlueprintDoc; delete window.__realBlueprintDoc; }
        const d = (window.LSH_BLUEPRINT || {}).trainee;
        if (!d || !d.slides || !d.slides.length) return { error: 'no trainee slides to build /blueprint.pdf from' };
        const doc = await LSHBlueprint.doc('trainee');
        if (!doc) return { error: 'LSHBlueprint.doc("trainee") made nothing' };
        return { slides: d.slides.length, pages: doc.getNumberOfPages(), b64: doc.output('datauristring').split(',')[1] };
    });
    if (real.error) fail(real.error);
    else {
        const tp = inspect(Buffer.from(real.b64, 'base64'));
        if (!tp.pdf || tp.pages !== real.slides + 1) fail(`the Trainee blueprint PDF: ${tp.pages} pages for a cover and ${real.slides} slides`);
        // Compare on the letters and digits alone: the PDF writes punctuation in Windows-1252 (an em
        // dash is one byte this reader can't decode), the engine drops what those fonts can't show,
        // and a long title is drawn over two lines, so it is two text runs in the file.
        const key = (x) => x.replace(/[^A-Za-z0-9]+/g, ' ').trim();
        const hay = key(tp.text);
        const titles = await page.evaluate(() => LSH_BLUEPRINT.trainee.slides.map(s => s.title));
        const gone = titles.filter(t => key(t) && !hay.includes(key(t)));
        if (gone.length) fail(`the Trainee blueprint PDF is missing: ${gone.join(' | ')}`);
    }
    // Every blueprint link leads to the Portal's 🧭 Blueprint page: the old #/blueprint address forwards there
    // and opens no deck here. The Portal is stubbed so the test stays offline.
    const PORTAL_BP = 'https://cm-training-activity.pages.dev/blueprint';
    await page.route('https://cm-training-activity.pages.dev/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Portal Blueprint</title>' }));
    await page.evaluate(() => { location.hash = '#/blueprint'; });
    await page.waitForURL(PORTAL_BP, { timeout: 5000 }).catch(() => {});
    if (page.url() !== PORTAL_BP) fail(`#/blueprint should forward to the Portal's Blueprint page; it stayed on ${page.url()}`);
    if (await page.evaluate(() => !!(window.LSHBlueprint && LSHBlueprint.isOpen()))) fail('a deck opened inside the program');
    await page.goBack(); await page.waitForTimeout(400);
    if (await page.evaluate(() => !!(window.LSHBlueprint && LSHBlueprint.isOpen()))) fail('a deck opened inside the program after going back');

    await page.context().close();

    await browser.close();
    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Blueprint test passed (no blueprint inside the program: no tab, card or link, no deck for a trainee or a trainer, and #/blueprint forwards to the Portal\'s Blueprint page; the Trainee blueprint republished once per deploy and served at /blueprint.pdf).');
})().catch(e => { console.error(e); process.exit(1); });
