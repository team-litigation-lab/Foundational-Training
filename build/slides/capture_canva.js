#!/usr/bin/env node
/* Screenshots every page of a lesson's Canva deck, for lessons shown as page images.

     node build/slides/capture_canva.js <lesson id> [<lesson id> …]      (all decks when none are given)

   For each lesson it opens the deck's Canva view link (from build/lessons/lessonNN.js) at 1920×1080,
   hides Canva's controls, and saves each page once it has finished drawing:
     build/slides/shots/lNN/pNNN.png   (converted to ft/decks/lNN/pNNN.webp by make_deck_shots.py)
     build/slides/shots/lNN/pages.json {url, pages, text:[each page's text, for the image's alt text]}
   Needs Playwright (npm i -g playwright) and network access to canva.com.
   Known limit: Canva refuses its signed media.canva.com images to an automated browser
   ("Signature invalid"), so pictures and backgrounds come out as grey boxes. Until that changes,
   use the decks' own downloads (Canva → Share → Download → PDF or PNG) for the page images. */
const fs = require("fs"), path = require("path");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const B = __dirname, ROOT = path.resolve(B, "..", "..");

function deckUrl(id){
  const f = path.join(ROOT, "build", "lessons", `lesson${String(id).padStart(2, "0")}.js`);
  const m = fs.readFileSync(f, "utf8").match(/https:\/\/www\.canva\.com\/design\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/view/);
  if(!m) throw new Error(`No Canva view link in ${f}`);
  return m[0] + "?embed";
}
async function capture(browser, id){
  const url = deckUrl(id), dir = path.join(B, "shots", `l${String(id).padStart(2, "0")}`);
  fs.mkdirSync(dir, {recursive:true});
  const ctx = await browser.newContext({viewport:{width:1920, height:1080}, locale:"en-US",
    userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"});
  const p = await ctx.newPage();
  await p.goto(url, {waitUntil:"domcontentloaded", timeout:90000});
  await p.waitForSelector('[aria-label="Next page"]', {timeout:90000});
  await p.waitForTimeout(6000);
  // Canva's controls are a footer over the page: hidden, so only the page is in the picture.
  await p.addStyleTag({content:"footer{visibility:hidden !important;}"});
  const count = () => p.evaluate(()=>{ const f = document.querySelector("footer"); const m = f && f.textContent.replace(/\s+/g, " ").match(/(\d+)\s*\/\s*(\d+)/); return m ? [+m[1], +m[2]] : null; });
  const first = await count(); if(!first) throw new Error(`Lesson ${id}: couldn't read the page count`);
  const total = +process.env.LIMIT ? Math.min(+process.env.LIMIT, first[1]) : first[1], text = [];   // LIMIT=n: only the first n pages (a test run)
  for(let n = 1; n <= total; n++){
    for(let t = 0; t < 40; t++){ const c = await count(); if(c && c[0] === n) break; await p.waitForTimeout(250); }
    // wait for the page's images, then until two screenshots in a row match (entry animations finished)
    await p.waitForFunction(()=>[...document.images].every(i=>i.complete), null, {timeout:20000}).catch(()=>{});
    await p.waitForTimeout(1200);
    let shot = await p.screenshot({type:"png"});
    for(let k = 0; k < 6; k++){ await p.waitForTimeout(500); const again = await p.screenshot({type:"png"}); if(again.equals(shot)) break; shot = again; }
    fs.writeFileSync(path.join(dir, `p${String(n).padStart(3, "0")}.png`), shot);
    text.push(await p.evaluate(()=>document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 400)));   // the hidden footer isn't in innerText
    if(n < total) await p.evaluate(()=>document.querySelector('[aria-label="Next page"]').click());
    if(n % 10 === 0) console.log(`lesson ${id}: ${n}/${total}`);
  }
  fs.writeFileSync(path.join(dir, "pages.json"), JSON.stringify({url, pages:total, capturedAt:new Date().toISOString(), text}, null, 1));
  await ctx.close();
  console.log(`lesson ${id}: done, ${total} pages`);
}
(async()=>{
  const ids = process.argv.slice(2).map(Number).filter(Boolean);
  const all = ids.length ? ids : fs.readdirSync(path.join(ROOT, "build", "lessons")).map(f=>(f.match(/^lesson(\d\d)\.js$/)||[])[1]).filter(Boolean).map(Number);
  const browser = await chromium.launch({args:["--disable-blink-features=AutomationControlled"]});
  const queue = all.slice(), running = [];
  const worker = async ()=>{ while(queue.length){ const id = queue.shift(); try{ await capture(browser, id); }catch(err){ console.log(`lesson ${id}: FAILED ${err.message}`); } } };
  for(let i = 0; i < Math.min(3, all.length); i++) running.push(worker());
  await Promise.all(running);
  await browser.close();
})();
