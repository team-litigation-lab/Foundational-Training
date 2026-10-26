// Builds js/ft-day-decks-data.js — the 📋 Day decks, one per training day — from the curriculum's day files
// (build/days/day01.js … day18.js). Run: node build/day-decks.cjs   (from the repo root; no other build step needed)
// What a trainee gets, per day: one slide per part of the day (its instructions, and the videos, documents and
// decks they open, already embedded as viewer links), with:
//   • the trainer-slot placeholders kept: js/ft-updates.js fills them with the facilitator's notes for a trainer
//     in trainer view and leaves them empty for a trainee;
//   • no Process Questions: each list (and its naming convention) is replaced by a pointer to ✍️ Knowledge Check,
//     where the questions are answered — they live there only;
//   • a "link coming" box wherever PENDING below names material the guide calls for but has no link for yet;
//   • a last "To be added" slide, filled from EXTRA below when there is something to add (empty until then).
// Nothing facilitator-only reaches a deck: SKIP drops the parts written to the trainer, and the guard stops the
// build if an answer key or a facilitator section would still be in one.
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = path.resolve(__dirname, "..");
// parts of a day left out of its deck: Day 1's Setting of Expectations is written to the facilitator; Training
// Reminders are to be disregarded; the Hubstaff To-Do set-up is not a slide (the trainer sets the to-dos with the
// batch, and the orientation covers them); the Nitro Pro / Adobe Acrobat Pro how-to homework is off the deck; and so
// is the Training Monitoring Sheet set-up (the orientation and 📒 Monitoring Sheet cover it). Day 1's Reading Task
// (Personal Injury) and the Smart Advocate plug-ins installation are on it: the Day 1 card runs Reading Task →
// Discussion → Handouts / Video → Process Questions → Installation of SA. The reading task's questions stay off the
// slide (they come with the assessment file the trainer posts in the GC, see Q_NOTE).
const SKIP = {1: ["expectations", "reminders", "hubstaff", "homework", "monitoring"]};
// slide titles that named the Process Questions, which aren't on the slides
const RENAME = {1: {pm: "Installation of SA (Smart Advocate) Plug-ins", reading: "Reading Task: Personal Injury"}};
// a slide kept in part: Day 1's PM installs both Nitro Pro and the Smart Advocate plug-ins; the deck keeps only the
// Smart Advocate steps (the Nitro Pro installation and its Mac note are off the deck)
const SA_FROM = "<h3>How to install the Smart Advocate";
// Day 1's Reading Task: the Personal Injury overview's text is on the slide itself, in place of its Drive link (PI_FILE finds the link)
const PI_FILE = "1VAn-xmcozdHqr-7pzpnY0Rlsc4-4T43O";
// Day 1's reading, word for word: build/days/pi-overview.html is the Personal Injury overview PDF's text, unchanged
// (its charts are in ft/day1/img/pi/). It is dealt over PI_PARTS slides of about the same length, each starting at one
// of its headings, so it reads a slide at a time: the Reading Task slide holds part 1, "reading-2" … the rest.
const PI_PARTS = 8;
const PI_BESIDE = 130;   // the most words of text beside a chart
// sections of the reading that read together: one page, two cards side by side (the first heading, then the second)
const PI_PAIRS = [["Step 3", "Step 4"], ["How Does the Statute of Limitations Work", "The Standard Statute of Limitations in Personal Injury Cases"]];
// sections kept in the same part as the one before them: a pair's second card, and the statute of limitations section
// (its introduction, How Does It Work, the Standard Statute and the Discovery Rule) as one part
const PI_JOIN = [...PI_PAIRS.map(p => p[1]), "How Does the Statute of Limitations Work", 'The "Discovery Rule" Exception'];
const PI_PAIR = new RegExp(`^<h3>(${PI_JOIN.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PI_PAIR_ROW = new RegExp(PI_PAIRS.map(([a, b]) => `(?:(<h3>${esc(a)}\\b[\\s\\S]*?)(<h3>${esc(b)}\\b[\\s\\S]*?)(?=<h[23][ >]|$))`).join("|"), "g");
function piParts(){
  const src = fs.readFileSync(path.join(R, "build/days/pi-overview.html"), "utf8").trim();
  // a pair (PI_PAIRS) and the statute of limitations section (PI_JOIN) are one unit, never split between two parts
  const units = src.split(/(?=<h[23]>)/).map(x => x.trim()).filter(Boolean)
    .reduce((a, u) => { if(PI_PAIR.test(u) && a.length) a[a.length - 1] += "\n" + u; else a.push(u); return a; }, []);
  // a chart reads like ~60 words
  const size = u => u.replace(/<figure>[\s\S]*?<\/figure>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length + 60 * (u.match(/<figure>/g) || []).length;
  const w = units.map(size), n = units.length, k = Math.min(PI_PARTS, n);
  // contiguous groups with the smallest largest group (linear partition)
  const pre = [0]; w.forEach(x => pre.push(pre[pre.length - 1] + x));
  const best = Array.from({length: k + 1}, () => Array(n + 1).fill(Infinity)), cut = Array.from({length: k + 1}, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for(let g = 1; g <= k; g++) for(let i = 1; i <= n; i++) for(let j = g - 1; j < i; j++){
    const v = Math.max(best[g - 1][j], pre[i] - pre[j]); if(v < best[g][i]){ best[g][i] = v; cut[g][i] = j; }
  }
  const parts = []; let i = n;
  for(let g = k; g >= 1; g--){ const j = cut[g][i]; parts.unshift(units.slice(j, i).join("\n")); i = j; }
  if(parts.join("\n").replace(/\s+/g, " ") !== units.join("\n").replace(/\s+/g, " ")) throw new Error("Day 1's reading lost text when it was split");
  return parts;
}
const TRIM = {1: {reading: html => {
  const at = html.indexOf("</p>", html.indexOf(PI_FILE)); if(at < 0) throw new Error("Day 1's Reading Task no longer links the Personal Injury overview");
  // the group-chat answer note, its naming convention and the trainer-only Tettra credentials go: the answers are on ✍️ Knowledge Check
  html = html.replace(/<p><b>Note: Please send you answers[\s\S]*?<p>Thank you\.<\/p>\n?/, "").replace(/<hr class="stars">\n?<div class="trainer-slot" data-slot="1:tettra"><\/div>\n?/, "");
  if(/group chat|1:tettra/.test(html)) throw new Error("Day 1's Reading Task still has the group-chat note or the Tettra credentials");
  // the link line goes (the file is on the slide itself), and so does "go to this link"
  const from = html.lastIndexOf("<p", at); if(from < 0) throw new Error("Day 1's Reading Task link line isn't a paragraph");
  const lead = html.slice(0, from).replace("Go to this link and read on to get a good grasp", "Read the material below to get a good grasp");
  if(/Go to this link/.test(lead)) throw new Error("Day 1's Reading Task still says to go to the link");
  // the reading itself follows, word for word, split over this slide and the next ones (PI_PARTS below)
  return lead + "<!--pi-reading-->\n" + html.slice(at + 4).replace(/^\n/, "");
}, pm: html => {
  const i = html.indexOf(SA_FROM); if(i < 0) throw new Error("Day 1's Smart Advocate steps are no longer where the build looks for them");
  // the help line keeps the SA contact only (the Nitro Pro contact goes with its installation)
  const sa = html.slice(i).replace(/<p>For those who still have issues installing Nitro Pro[\s\S]*?<\/div>\n/, () =>
    `<p>If you have issues installing the SA plug-ins, reach out to Ivan on Discord. His shift starts at 8:00 AM PST.</p>\n<p><b>Ivan: kuchiq</b></p>\n` +
    `<div class="shots">\n  <figure><a href="/ft/day1/img/discord-ivan.png" target="_blank"><img src="/ft/day1/img/discord-ivan.png" alt="Ivan on Discord" loading="lazy"></a></figure>\n</div>\n`);
  if(/Nitro/i.test(sa)) throw new Error("Day 1's Installation of SA still mentions Nitro Pro");
  // its screenshots are drawn big (ftdd-big-shots: two or three to a row, in js/ft-day-decks.js)
  return `<p>Install the Smart Advocate (SA) plug-ins on your computer: follow the steps and the screenshots below, from the training curriculum. Ask in the training GC if a step doesn’t match what you see.</p>\n` + sa.replace(/<div class="shots">/g, '<div class="shots ftdd-big-shots">');
}},
// Day 5's Attorney Calendar Management Activity: four cards (the activity, the time zone, the whole calendar, the upload)
5: {s3: html => {
  const cut = (from, to) => { const i = html.indexOf(from), j = to ? html.indexOf(to, i) : html.length; if(i < 0 || j < 0) throw new Error("Day 5's Attorney Calendar Management Activity is no longer where the build looks for it: " + from); return html.slice(i, j); };
  const act = cut("<p>Please answer the Attorney Calendar", '<div class="trainer-slot" data-slot="5:s3-2">');
  const tz = cut("<p>REMINDER! Set the appropriate time zone", "<p>When taking a screenshot of the entire calendar");
  const whole = cut("<p>When taking a screenshot of the entire calendar", "<p>You should have a total of 19");
  const up = cut("<p>You should have a total of 19", "<p><b><i>*** Free Communication");
  const card = (ic, h, body) => `<div class="ftdd-card4"><p class="ftdd-card4-h">${ic} ${h}</p>${body}</div>`;
  return '<div class="trainer-slot" data-slot="5:s3-1"></div>\n<div class="trainer-slot" data-slot="5:s3-2"></div>\n<div class="ftdd-cards4">' +
    card("📝", "1. The activity", act) + card("🕒", "2. Set the time zone", tz) + card("📸", "3. The whole calendar", whole) + card("📤", "4. Upload your 19 screenshots", up) + "</div>\n" + cut("<p><b><i>*** Free Communication");
}},
// Day 2's Homework: the handouts' 2026 version only (the old version's folder goes), shown in the slide
2: {s4: html => {
  const out = html.replace(/<p>OLD VERSION<\/p>\n<p><a [^>]*1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y[^>]*>[^<]*<\/a> ?<\/p>\n?/, "")
    .replace(/<p>2026 VERSION<\/p>\n<p><a [^>]*(1-uB07Lu7nPeRpdDwOzvAKFMjZbXKQW-r)[^>]*>[^<]*<\/a> ?<\/p>/, (m, id) =>
      `<p><b>The handouts (2026 version)</b></p>\n<div class="ftdd-embed ftdd-embed-folder"><iframe src="https://drive.google.com/embeddedfolderview?id=${id}#grid" title="The handouts (2026 version)" loading="lazy"></iframe></div>`);
  if(/OLD VERSION|1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y/.test(out) || !/embeddedfolderview/.test(out)) throw new Error("Day 2's Homework handouts are no longer where the build looks for them");
  return out;
}}};
// material the guide names without a link yet: {day: [{after: sectionId, name, note?}]} — shown as a "link coming" box
// at the end of that slide until the link is added to the day file
const PENDING = {};
// the last slide of a day: [{h, html}] to show; empty = the "To be added" placeholder
const EXTRA = {};

const load = n => { const c = {}; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(R, "build/days", `day${String(n).padStart(2, "0")}.js`), "utf8") + `;this.d=DAY${n};`, c); return c.d; };
// (its button opens the day's lesson's own Knowledge Check sheet, where the questions are answered, and comes back to
// the classroom's next activity: FTDayDecks.toKC; never the trainers' all-trainees page)
const PQ_NOTE = `<div class="ftdd-pq">✍️ <b>Today’s Process Questions</b> are answered in the day’s Knowledge Check, after the day’s activities.<div class="ftdd-pq-go"><button type="button" class="btn btn-navy" onclick="FTDayDecks.toKC(FTDayDecks.dayLesson())">✍️ Knowledge Check →</button></div></div>\n`;
// a Process Questions list: from the element that says PROCESS QUESTIONS to the naming convention's value
// (the element after "Naming Convention:"), plus the divider after it
function stripPQ(html){
  let out = html, n = 0;
  for(;;){
    const i = out.indexOf("PROCESS QUESTIONS"); if(i < 0) break;
    const a = out.lastIndexOf("\n", i) + 1;
    const nm = out.search(/Naming [Cc]onvention/);
    if(nm < i) throw new Error("Process Questions with no naming convention after them");
    let b = out.indexOf("\n", nm) + 1;                     // the "Naming Convention:" line
    b = out.indexOf("\n", b) + 1 || out.length;            // its value
    const hr = out.slice(b).match(/^<hr class="stars">\n?/); if(hr) b += hr[0].length;
    out = out.slice(0, a) + PQ_NOTE + out.slice(b); n++;
  }
  return {html: out, n};
}
// (only Day 1's Reading Task has one: its questions are the Reading Task sheet of Lesson 1's ✍️ Knowledge Check, js/ft-process.js)
// (nothing on the slide: its ✍️ Knowledge Check is the slide's Next button, js/ft-day-decks.js)
const Q_NOTE = "";
// A question list on a slide — the reading task's "Answer the following questions:" and its numbered list —
// is an assessment, not slide content: a trainee answers it on the file their trainer posts, so the slide
// carries the note above instead of the questions themselves.
function stripQuestions(html){
  let out = html, n = 0;
  for(;;){
    const m = out.match(/<p[^>]*>(?:[A-Z]\.\s*)?Answer (?:the following|these) questions?[^<]*<\/p>\s*/i);
    if(!m) break;
    const a = m.index;
    let b = a + m[0].length;
    // the list that follows: a plain-list / numbered block, or the run of numbered paragraphs
    const list = out.slice(b).match(/^<(p|ol|ul|div)[^>]*>[\s\S]*?<\/\1>\s*/i);
    if(list && /(^|>|\s)1[.)]\s/.test(list[0])) b += list[0].length;
    else { for(;;){ const nx = out.slice(b).match(/^<p[^>]*>\s*\d+[.)][\s\S]*?<\/p>\s*/i); if(!nx) break; b += nx[0].length; } }
    out = out.slice(0, a) + Q_NOTE + out.slice(b); n++;
  }
  return {html: out, n};
}
// The lesson's own deck is not on a day slide: the classroom discussion is taught from the lesson (▶ Live discussion
// on 📚 Dashboard, 📘 Open the lesson on the slide), so a discussion slide drops its embedded lesson deck — the
// Canva frame and its ⛶ Full screen / Open in Canva row. An exercise's deck on the same slide stays.
const LESSON_DECK = /<div class="canva-frame" id="([^"]+)">\s*<iframe[^>]*title="(?![^"]*Exercise)[^"]*\(Canva\)"[\s\S]*?<\/iframe>\s*<\/div>\s*<div class="actions">[\s\S]*?data-fullscreen="\1"[\s\S]*?<\/div>\s*<\/div>\s*/;
const LESSON_NOTE = `<div class="ftdd-pq">📘 <b>Today’s lesson deck</b> opens from <b>▶ Start Training</b> on 📚 Dashboard, or the 📘 lesson button above — it is not on this slide.</div>\n`;
function stripLessonDeck(h, html){
  if(!/classroom discussion|discussion on/i.test(h) || !LESSON_DECK.test(html)) return {html, n: 0};
  return {html: html.replace(LESSON_DECK, LESSON_NOTE), n: 1};
}
const ph = (cls, icon, title, body) => `<div class="ftdd-ph ${cls}"><span class="ftdd-ph-ic">${icon}</span><div><b>${title}</b><p>${body}</p></div></div>`;
const decks = {}; let pqs = 0, qs = 0, decksOff = 0;
for(let n = 1; n <= 16; n++){
  const d = load(n), slides = [];
  for(const s of d.sections){
    if(s.trainerOnly || (SKIP[n] || []).includes(s.id)) continue;
    const r = stripPQ(s.html); pqs += r.n;
    const q = stripQuestions(r.html); qs += q.n;
    const ld = stripLessonDeck(s.h, q.html); decksOff += ld.n;
    let html = (TRIM[n] && TRIM[n][s.id]) ? TRIM[n][s.id](ld.html) : ld.html;
    for(const p of (PENDING[n] || []).filter(p => p.after === s.id))
      html += "\n" + ph("ftdd-ph-link", "🔗", `Link coming: ${p.name}`, p.note || "Your trainer adds the link here. Until then, ask in the training GC.");
    const h = ((RENAME[n] || {})[s.id] || s.h).replace(/[:.\s]+$/, "");
    if(html.includes("<!--pi-reading-->")){
      const parts = piParts(), of = i => `Reading Task: Personal Injury · Part ${i + 1} of ${parts.length}`, wrap = x => x.replace(/<h2>/g, '<h2 class="ftdd-pi-h">').split(/(?=<h[23][ >])/).map(sec => {
        // a section with a chart is one row of two cards: its text on the left, its chart(s) on the right
        const figs = sec.match(/<figure>[\s\S]*?<\/figure>/g); if(!figs) return sec;
        const text = sec.replace(/<figure>[\s\S]*?<\/figure>\s*/g, "").trim();
        // beside the chart: the heading and its first paragraphs, about a page's worth (PI_BESIDE words); the rest of the
        // section's text follows under the row, so a long section is read over pages instead of shrunk to fit
        const blocks = text.split(/\n(?=<(?:p|ul|ol|h[2-6])[ >])/), words = x => x.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        let n = 0, k = 0; while(k < blocks.length && (k < 2 || n + words(blocks[k]) <= PI_BESIDE)){ n += words(blocks[k]); k++; }
        const beside = blocks.slice(0, k).join("\n"), after = blocks.slice(k).join("\n");
        return `<div class="ftdd-pi-row"><div class="ftdd-pi-card">\n${beside}\n</div><div class="ftdd-pi-card ftdd-pi-chart">${figs.map(f => f.replace("<figure>", '<figure class="ftdd-pi-fig">').replace(' loading="lazy"', "")).join("")}</div></div>\n${after ? after + "\n" : ""}`;
      }).join("")
        // each pair: two cards side by side, in one row
        .replace(PI_PAIR_ROW, (m, ...g) => { const [a, b] = g.slice(0, PI_PAIRS.length * 2).filter(x => x !== undefined); return `<div class="ftdd-pi-row ftdd-pi-pair"><div class="ftdd-pi-card">\n${a.trim()}\n</div><div class="ftdd-pi-card">\n${b.trim()}\n</div></div>\n`; });
      slides.push({id: s.id, h: of(0), html: html.replace("<!--pi-reading-->", wrap(parts[0]))});
      parts.slice(1).forEach((x, i) => slides.push({id: `${s.id}-${i + 2}`, h: of(i + 1), html: wrap(x)}));
      continue;
    }
    slides.push({id: s.id, h, html});
  }
  const extra = EXTRA[n] || [];
  if(extra.length) extra.forEach((x, i) => slides.push({id: "extra-" + (i + 1), h: x.h, html: x.html}));
  else slides.push({id: "to-be-added", h: "To be added", placeholder: true,
    html: ph("ftdd-ph-blank", "📌", "More for Day " + n + " is on its way", "Your trainer will add the rest of today’s material here. Until then, follow the slides before this one and the training GC.")});
  for(const s of slides){
    if(/class=\\?"facilitator|Answer Key|Correct Answer|Ideal Answer|Facilitator[’']s (Note|Guide)/i.test(s.html)) throw new Error(`facilitator content in Day ${n} ${s.id}`);
    if(/PROCESS QUESTIONS/.test(s.html)) throw new Error(`Process Questions left in Day ${n} ${s.id}`);
    if(/Password|Username/.test(s.html)) throw new Error(`log-in details in Day ${n} ${s.id}`);
    if(/classroom discussion|discussion on/i.test(s.h) && LESSON_DECK.test(s.html)) throw new Error(`the lesson deck is still embedded on Day ${n} ${s.id}`);
  }
  decks[n] = {day: n, title: d.title, heading: d.heading, slides};
}
const out = "// Generated by build/day-decks.cjs from build/days/*.js — edit the day files or that script, not this file.\n"
  + "window.FT_DAY_DECKS = " + JSON.stringify(decks) + ";\n";
fs.writeFileSync(path.join(R, "js/ft-day-decks-data.js"), out);
console.log(`js/ft-day-decks-data.js: ${Object.keys(decks).length} day decks, ${Object.values(decks).reduce((a, d) => a + d.slides.length, 0)} slides, ${pqs} Process Questions lists replaced by the Knowledge Check pointer, ${qs} task question lists replaced by the assessment note, ${(out.length / 1024).toFixed(0)} KB`);
for(const d of Object.values(decks)) console.log(`  Day ${d.day} · ${d.title}: ${d.slides.map(s => s.h.slice(0, 40)).join(" | ")}`);
