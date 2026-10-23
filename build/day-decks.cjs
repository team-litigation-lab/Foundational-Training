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
// Reminders and the Nitro Pro 12 / Smart Advocate plug-ins installation are to be disregarded (the Nitro Pro and
// Adobe Acrobat Pro how-to homework stays); the Hubstaff To-Do set-up is not a slide — the trainer sets the
// to-dos with the batch, and the day cards already name each day's work; and neither is the PI overview reading
// task — it is an assessment the trainer posts in the training GC with its own file, questions and naming
// convention, and it is scored on the Weekly Ranking ("PI Reading Task", 40 points); and the Nitro Pro / Adobe Acrobat
// Pro how-to homework is taken off the deck as well; and so is the Training Monitoring Sheet set-up (the orientation
// and 📒 Monitoring Sheet cover it)
const SKIP = {1: ["expectations", "reminders", "pm", "hubstaff", "reading", "homework", "monitoring"]};
// slide titles that named the Process Questions, which aren't on the slides
const RENAME = {};
// material the guide names without a link yet: {day: [{after: sectionId, name, note?}]} — shown as a "link coming" box
// at the end of that slide until the link is added to the day file
const PENDING = {};
// the last slide of a day: [{h, html}] to show; empty = the "To be added" placeholder
const EXTRA = {};

const load = n => { const c = {}; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(R, "build/days", `day${String(n).padStart(2, "0")}.js`), "utf8") + `;this.d=DAY${n};`, c); return c.d; };
const PQ_NOTE = `<div class="ftdd-pq">✍️ <b>Today’s Process Questions</b> are answered in <a class="ftdd-link" onclick="goto('process')">✍️ Knowledge Check</a>, after the day’s activities — not here.</div>\n`;
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
const Q_NOTE = `<div class="ftdd-pq">📄 <b>The questions for this task</b> come with the assessment file your trainer posts in the training GC — they are not on the slide. Answer them there and upload your answers as the naming convention below says.</div>\n`;
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
const LESSON_NOTE = `<div class="ftdd-pq">📘 <b>Today’s lesson deck</b> opens from <b>▶ Live discussion</b> on 📚 Dashboard, or the 📘 lesson button above — it is not on this slide.</div>\n`;
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
    let html = ld.html;
    for(const p of (PENDING[n] || []).filter(p => p.after === s.id))
      html += "\n" + ph("ftdd-ph-link", "🔗", `Link coming: ${p.name}`, p.note || "Your trainer adds the link here. Until then, ask in the training GC.");
    slides.push({id: s.id, h: ((RENAME[n] || {})[s.id] || s.h).replace(/[:.\s]+$/, ""), html});
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
