// Which browser tests a change needs: the Checks workflow's smoke job runs only these on a pull request (every one on a
// push to main, and when this can't tell). A test is affected by a changed file when the file defines something the test
// drives (a platform object such as FTDayDecks, a page it opens with goto('…')), or uses or patches something the test
// drives (js/ft-buffer.js and js/ft-day-locks.js patch FTDayDecks, so a Day decks test runs when they change). Found
// from the code itself, so a new test or a new file needs no list kept by hand.
// Usage: node .github/scripts/affected.mjs <base ref or sha>   → prints the test files, one per line, ALL or NONE
//        node .github/scripts/affected.mjs --why <base>        → the same, with the reason for each
//        node .github/scripts/affected.mjs --why --files a b … → for these files instead of a git comparison
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const S = '.github/scripts';
const args = process.argv.slice(2), why = args.includes('--why'), fi = args.indexOf('--files');
const given = fi >= 0 ? args.slice(fi + 1) : null, base = args.filter(a => !a.startsWith('--'))[0];
const read = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };

// the browser tests: the smoke job's (each takes the server's address)
const TESTS = fs.readdirSync(path.join(ROOT, S)).filter(f => f.endsWith('.cjs') && f !== 'sign-in.cjs' && /http:\/\/localhost:8787\//.test(read(`${S}/${f}`)))
  .map(f => `${S}/${f}`).sort();
// shared by every page or every test: a change to one runs every test
const CORE = [/^index\.html$/, /^worker\.js$/, /^calweek-api\.js$/, /^wrangler\.json$/, /^js\/eapa-updates\.js$/, /^js\/ft-updates\.js$/, /^js\/lsh-[^/]*\.js$/,
  /^js\/ft-program\.js$/, /^\.github\/scripts\/(server\.mjs|sign-in\.cjs|affected\.mjs|smoke\.mjs)$/, /^\.github\/workflows\/checks\.yml$/, /^build\/[^/]*\.py$/, /^trainer\//];
// no browser test reads them (the Checks workflow's first job still checks every file)
const NONE = [/\.md$/, /^docs\//, /^img\//, /^handouts\//, /^ft\//, /^favicon\.png$/, /^logo\.svg$/, /^\.github\/workflows\/r2-docs\.yml$/, /^\.gitignore$/, /^\.assetsignore$/,
  /^\.github\/scripts\/(check-site|batch-id|sso|gemini-keys|r2-docs|r2-sync|drive|calsim-activity)\.(m?js|cjs)$/];
// the build's sources stand for what they build
const BUILT = [[/^build\/(days|calls)\/|^build\/day-decks\.cjs$|^build\/ref-terms\.py$/, ['js/ft-day-decks.js']], [/^build\/lessons\//, ['index.html']]];

// what each script file defines: window./root./globalThis. names, and the pages (views) it draws
const JS = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`);
const defsOf = f => {
  const t = read(f), out = new Set();
  for (const m of t.matchAll(/\b(?:window|root|globalThis)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) out.add(m[1]);
  for (const m of t.matchAll(/state\.view\s*!?===?\s*["']([a-z0-9-]+)["']/gi)) out.add('view:' + m[1]);
  for (const m of t.matchAll(/EXTRA_ROUTE_VIEWS\s*\|\|\s*\[\]\)\.concat\(\[([^\]]*)\]/g)) for (const v of m[1].matchAll(/["']([a-z0-9-]+)["']/g)) out.add('view:' + v[1]);
  return out;
};
const DEFS = Object.fromEntries(JS.map(f => [f, defsOf(f)]));
// names every page has (the core's): matching on them would tie every file to every test
const coreNames = new Set();
for (const f of JS.filter(f => CORE.some(re => re.test(f)))) DEFS[f].forEach(n => coreNames.add(n));
for (const m of read('index.html').matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) coreNames.add(m[1]);
// (the names index.html itself defines are every page's: render, goto, state … a file that wraps one of those doesn't tie
// it to every test. A name only a core script defines, LSH_BLUEPRINT say, is still matched for the other file defining it)
const pageNames = new Set();
for (const m of read('index.html').matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) pageNames.add(m[1]);
for (const m of read('index.html').matchAll(/\b(?:window|root|globalThis)\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) pageNames.add(m[1]);
['render', 'goto', 'renderTopbar', 'state', 'afterRender', 'toast', 'esc'].forEach(n => pageNames.add(n));
const owner = new Map();
for (const f of JS) for (const n of DEFS[f]) if (!coreNames.has(n)) { if (!owner.has(n)) owner.set(n, new Set()); owner.get(n).add(f); }
const words = t => new Set(t.match(/[A-Za-z_$][\w$]*/g) || []);
// a file's reach: what it defines, and what of the other files it uses or patches; and what the files that read what it
// defines define themselves (one step: js/ft-lor-data.js's FT_LOR_TEMPLATES is read by js/ft-lor.js, whose Drafting
// Tools a test opens)
// (a page the core draws that many files check, view:admin say, stays every page's; one only a few check, as
// js/ft-my-pages.js does view:scorecard, is still matched for them)
const viewFiles = new Map();
for (const f of JS.filter(f => !CORE.some(re => re.test(f)))) for (const n of DEFS[f]) if (n.startsWith('view:')) viewFiles.set(n, (viewFiles.get(n) || 0) + 1);
const own = f => new Set([...DEFS[f] || []].filter(n => !pageNames.has(n) && !(n.startsWith('view:') && coreNames.has(n) && (viewFiles.get(n) || 0) > 3)));
// a data file: it defines nothing but data (FT_LOR_TEMPLATES, FT_REF_TERMS …), so what it changes is what its readers do
const isData = f => { const d = [...own(f)]; return d.length > 0 && d.every(n => /^[A-Z][A-Z0-9_]+$/.test(n)); };
const reach = f => {
  const t = read(f), w = words(t), out = own(f);
  for (const n of w) if (owner.has(n) && !owner.get(n).has(f)) out.add(n);
  const mine = own(f);
  if (isData(f)) for (const g of JS) if (g !== f && !CORE.some(re => re.test(g)) && [...mine].some(n => words(read(g)).has(n))) own(g).forEach(n => out.add(n));
  return out;
};
// the page parts a test looks for by CSS selector (#dayl-2, .ft-video-ask, .ftmp-focus …) that a file writes: a test that
// checks what a page draws runs when the file drawing it changes. Only distinctive ones (with a hyphen, or 6 letters or
// more) and none index.html has too; an id ending in a number (dayl-2) is matched by its stem (dayl-)
const pageHtml = read('index.html');
const sel = s => { const out = new Set();
  for (const q of s.matchAll(/(["'`])((?:(?!\1).){1,300})\1/g)) for (const m of q[2].matchAll(/(?:^|[\s>+~,(])[.#]([a-z][\w-]{2,})/gi)) {
    const k = m[1]; if ((k.includes('-') || k.length >= 6) && !pageHtml.includes(k) && !/^(github|scripts|js|html|cjs|mjs)$/.test(k)) out.add(k); }
  return out; };
const SELS = Object.fromEntries(TESTS.map(t => [t, sel(read(t))]));
const draws = (f, k) => { const t = read(f), stem = k.replace(/-\d+$/, '-'); return t.includes(k) || (stem !== k && t.includes(stem)); };
// and the words it puts on screen that a test looks for: its quoted text of 18 characters or more (a slide title, a
// button), so a test that checks a page by what it says runs when that page's file changes
const texts = f => new Set([...read(f).matchAll(/(["'`])([^"'`\n$<>{}]{18,120})\1/g)].map(m => m[2].trim()).filter(x => /[a-z] [a-z]/i.test(x)));
// what each test drives: the names it uses, and the pages it opens
const USES = Object.fromEntries(TESTS.map(t => { const s = read(t), w = words(s);
  for (const m of s.matchAll(/goto\(\s*['"]([a-z0-9-]+)['"]/gi)) w.add('view:' + m[1]);
  return [t, w]; }));

function changed() {
  if (given) return given;
  if (!base) return null;
  try { return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: ROOT, encoding: 'utf8' }).split('\n').map(s => s.trim()).filter(Boolean); }
  catch (e) { return null; }
}

const files = changed(), pick = new Map(), out = [];
let all = files == null ? 'the change could not be read (no base given, or git could not compare)' : '';
for (const f0 of files || []) {
  if (all) break;
  if (NONE.some(re => re.test(f0))) continue;
  if (CORE.some(re => re.test(f0))) { all = `${f0} is shared by every page`; break; }
  if (TESTS.includes(f0)) { pick.set(f0, (pick.get(f0) || []).concat(`${f0} itself changed`)); continue; }
  const stands = BUILT.find(([re]) => re.test(f0));
  const srcs = stands ? stands[1] : [f0];
  if (srcs.some(s => CORE.some(re => re.test(s)))) { all = `${f0} builds ${srcs.join(', ')}, shared by every page`; break; }
  for (const f of srcs) {
    if (!JS.includes(f)) { all = `${f0} isn't a file this can place`; break; }
    const r = reach(f), x = texts(f);
    if (!r.size && !x.size) { all = `${f0} defines nothing a test can be matched on`; break; }
    for (const t of TESTS) {
      const hit = [...r].filter(n => USES[t].has(n)), src = read(t), said = hit.length ? [] : [...x].filter(s => src.includes(s));
      const drawn = hit.length || said.length ? [] : [...SELS[t]].filter(k => draws(f, k));
      if (hit.length || said.length || drawn.length) pick.set(t, (pick.get(t) || []).concat(`${f0}: ${hit.length ? hit.slice(0, 4).join(', ') : said.length ? '"' + said[0] + '"' : drawn.slice(0, 3).map(k => '.' + k).join(', ')}`));
    }
  }
}
// (and always the server requests test: it opens the platform as a trainee and as a trainer and fails on any page
// error, so a script that breaks every page is caught whatever it is)
const BASE_TEST = `${S}/requests.cjs`;
if (!all && files && files.length && TESTS.includes(BASE_TEST) && ![...pick.keys()].includes(BASE_TEST) && files.some(f => !NONE.some(re => re.test(f)))) pick.set(BASE_TEST, ['always: the platform opens without a page error']);
if (all) { console.log(why ? `ALL (${all})` : 'ALL'); }
else if (why) { if (!pick.size) console.log('NONE (no browser test reads what changed)'); for (const [t, r] of pick) console.log(`${t}  ← ${[...new Set(r)].join('; ')}`); }
else if (!pick.size) console.log('NONE');
else for (const t of pick.keys()) console.log(t);
