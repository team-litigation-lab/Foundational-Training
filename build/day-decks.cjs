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
// is the Training Progress Monitoring Sheet set-up (the orientation and 📒 Monitoring Sheet cover it). Day 1's Reading Task
// (Personal Injury) and the Smart Advocate plug-ins installation are on it: the Day 1 card runs Reading Task →
// Discussion → Handouts / Video → Process Questions → Installation of SA. The reading task's questions stay off the
// slide (they come with the assessment file the trainer posts in the GC, see Q_NOTE).
const SKIP = {1: ["expectations", "reminders", "hubstaff", "homework", "monitoring", "discussion", "client-id"]};   // (Day 1's discussion slide and Client Identification Exercise: the lesson deck opens from its ▶ Start Training stop, the recorded lecture with the trainer's Handouts and Videos unlock)
// slide titles that named the Process Questions, which aren't on the slides
const RENAME = {1: {pm: "Installation of SA (Smart Advocate) Plug-ins", reading: "Reading Task: Personal Injury"},
  // (Day 3's homework heading names it; Day 8's afternoon is the demo: Atty. Sandy's video is on its morning's Topic 2)
  3: {s2: "FOR YOUR HOMEWORK: CRM/CMS Training Videos"}, 8: {s3: "PM: Saving the Intake Packet and Extracted Intake Documents to SA"}};
// a slide kept in part: Day 1's PM installs both Nitro Pro and the Smart Advocate plug-ins; the deck keeps only the
// Smart Advocate steps (the Nitro Pro installation and its Mac note are off the deck)
const SA_FROM = "<h3>How to install the Smart Advocate";
// Day 1's Reading Task: the Personal Injury overview's text is on the slide itself, in place of its Drive link (PI_FILE finds the link)
const PI_FILE = "1VAn-xmcozdHqr-7pzpnY0Rlsc4-4T43O";
// Day 1's reading: build/days/pi-overview.html is the Personal Injury overview PDF's text (one sentence of the discovery rule
// joined up so it doesn't trail after its list)
// (its charts are in ft/day1/img/pi/). It is dealt over PI_PARTS slides of about the same length, each starting at one
// of its headings, so it reads a slide at a time: the Reading Task slide holds part 1, "reading-2" … the rest.
const PI_PARTS = 8;
const PI_BESIDE = 130;   // the most words of text beside a chart
// sections of the reading that read together: one page, two cards side by side (the first heading, then the second)
const PI_PAIRS = [["Step 2", "Step 3"], ["Step 4", "Step 5"], ["Step 6", "Step 7"], ["Step 8", "Jury Selection in a Car Accident Trial"], ["The Defendant’s Presentation of Evidence", "Closing Arguments"], ["How Does the Statute of Limitations Work", "The Standard Statute of Limitations in Personal Injury Cases"]];
// a section read beside another one that isn't next to it in the overview: moved up to sit right after it
const PI_MOVE = {"Jury Selection in a Car Accident Trial": "Step 8"};
// sections kept in the same part as the one before them: a pair's second card, and the statute of limitations section
// (its introduction, How Does It Work, the Standard Statute and the Discovery Rule) as one part
// (and Negotiating Settlement Offers, so the end of The Advantage of Legal Representation, under its row, shares its page;
// and Opening Statements, read with When a Car Accident Case Goes to Trial rather than alone at the top of the next part)
const PI_JOIN = [...PI_PAIRS.flatMap(p => p.slice(1)), "How Does the Statute of Limitations Work", 'The "Discovery Rule" Exception', "Negotiating Settlement Offers", "Opening Statements"];
const PI_PAIR = new RegExp(`^<h3>(${PI_JOIN.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// a group's sections (PI_PAIRS) as one row of cards side by side; the rest of the reading as it is
function piRows(html){
  const secs = html.split(/(?=<h[23][ >])/), out = [];
  for(let i = 0; i < secs.length; i++){
    const g = PI_PAIRS.find(p => p.every((h, j) => secs[i + j] && secs[i + j].startsWith(`<h3>${h}`) && !/<\/?div/.test(secs[i + j])));
    if(!g){ out.push(secs[i]); continue; }
    out.push(`<div class="ftdd-pi-row ftdd-pi-pair ftdd-pi-n${g.length}">${secs.slice(i, i + g.length).map(x => `<div class="ftdd-pi-card">\n${x.trim()}\n</div>`).join("")}</div>\n`);
    i += g.length - 1;
  }
  return out.join("");
}
function piParts(){
  const src = fs.readFileSync(path.join(R, "build/days/pi-overview.html"), "utf8").trim();
  // a pair (PI_PAIRS) and the statute of limitations section (PI_JOIN) are one unit, never split between two parts
  const units = Object.entries(PI_MOVE).reduce((us, [sec, after]) => {
      const i = us.findIndex(u => u.startsWith(`<h3>${sec}`)); if(i < 0) throw new Error(`Day 1's reading has no "${sec}" to move`);
      const [u] = us.splice(i, 1), j = us.findIndex(x => x.startsWith(`<h3>${after}`)); if(j < 0) throw new Error(`Day 1's reading has no "${after}"`);
      us.splice(j + 1, 0, u); return us;
    }, src.split(/(?=<h[23]>)/).map(x => x.trim()).filter(Boolean))
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
  // the Smart Advocate steps laid out as the curriculum's own pages: each step's instruction across the top (its link
  // beside it), then its screenshots in one row under it, numbered 1, 2, 3 … under each; then the help line in its
  // rounded box beside Sanders' and Ivan's Discord profiles, and the heads-up beside the installed apps; the links are the curriculum's own
  const i = html.indexOf(SA_FROM); if(i < 0) throw new Error("Day 1's Smart Advocate steps are no longer where the build looks for them");
  const src = html.slice(i);
  const tag = re => { const m = src.match(re); if(!m) throw new Error("Day 1's Installation of SA lost a link: " + re); return m[0]; };
  // the link with its own words: "Link: SA Document Handler/Launcher", and the knowledge base pages written out
  const handler = `<p class="ftdd-sa-link">Link: ${tag(/<a [^>]*19eFGdoQNXJo2iE46M2G8s2bMJNEIeO8k[^>]*>/)}SA Document Handler/Launcher</a></p>\n`;
  const url = re => `<p class="url-list">${tag(new RegExp(`<a [^>]*${re}[^>]*>[^<]*<\\/a>`))}</p>\n`;
  const win = url("71237633"), mac = url("876020096");
  const img = (f, alt, cap) => { if(!fs.existsSync(path.join(R, "ft/day1/img", f))) throw new Error("Day 1's Installation of SA is missing " + f);
    // (?v: the screenshots were redrawn 3× sharper, the address changes so browsers fetch them anew)
    const u = `/ft/day1/img/${f}${/^sa-/.test(f) ? "?v=3x" : ""}`;
    return `  <figure><a href="${u}" target="_blank"><img src="${u}" alt="${alt}" loading="lazy"></a>${cap != null ? `<figcaption>${cap}</figcaption>` : ""}</figure>\n`; };
  const sa = n => `sa-${String(n).padStart(2, "0")}.png`;
  // a row of a step's screenshots, numbered from `first` under each (no number: `first` null)
  const strip = (from, n, first = 1) => `<div class="shots ftdd-sa-strip ftdd-sa-n${n}">\n${Array.from({length: n}, (_, k) => img(sa(from + k), "Screenshot " + (first == null ? from + k : first + k), first == null ? null : first + k)).join("")}</div>\n`;
  const step = (...units) => `<div class="ftdd-sa-step">\n${units.join("")}</div>\n`;
  // an instruction and its own screenshots, one block, so a step too long for one page is turned at a block's edge,
  // never between an instruction and its screenshots
  const unit = body => `<div class="ftdd-sa-unit">\n${body}</div>\n`;
  // text on one side, a picture (or pictures) on the other, in one block so a page never splits them
  const pair = (left, right, cls = "") => `<div class="ftdd-sa-pair${cls}">\n<div class="ftdd-sa-text">\n${left}</div>\n<div class="ftdd-sa-side">\n${right}</div>\n</div>\n`;
  // (step 1's instruction and its files on the left, its first screenshot, a tall one, drawn tall beside them)
  return step(unit(`<h3>How to install the Smart Advocate/SA plug-ins:</h3>\n` + pair(`<p>1. Install the SA Document Handler/Launcher. Unzip its folder first, then right-click on the zipped file and select "Extract Here." Proceed with the installation.</p>\n` +
      `<div class="ftdd-sa-file">\n${img(sa(0), "SADocumentHandler_2023")}${img(sa(1), "SADocumentHandler_2023.rar")}${handler}</div>\n`, strip(2, 1), " ftdd-sa-pair-first")),
      // (its screenshots 2–5 follow two to a page, so every screenshot is drawn big)
      unit(strip(3, 2, 2)), unit(strip(5, 2, 4))) +
    step(unit(`<p>2. For Windows Users, access the link and download the 2nd hyperlink to install Microsoft Word, Excel, and Outlook plugins on your desktop. Follow steps 2-7 as indicated below the list of hyperlinks on this page:</p>\n${win}` + strip(7, 2, null)),
      unit(`<p>For Mac Users, access the link and download plugin on your desktop. Follow the steps indicated below the link on this page:</p>\n${mac}` + strip(9, 2, null))) +
    step(unit(pair(`<p>3. Once you have downloaded the Microsoft Word, Excel, and Outlook plugins, double-click the "Set Up" application to install.</p>\n` + strip(11, 1, null),
        `<p class="ftdd-sa-note"><b>Note: This process may take a little longer to complete the download and installation.</b></p>\n`, " ftdd-sa-pair-wide")),
      // (its screenshots 3–7: three, then two, to a page)
      unit(strip(12, 3, 3)), unit(strip(15, 2, 6))) +
    step(unit(`<p>4. Lastly, double click the Registry to install.</p>\n` + strip(17, 3)),
      unit(pair(`<p><b>Just a heads-up, for the SA plug-ins, for now, there is no way for us to check whether they have successfully installed. We will only know if the installation was successful when we start using the firm’s CMS (SA) which is scheduled for around the 8th or 9th of your classroom training.</b></p>\n<p><b>As long as you have this in your list of installed apps then you're good for now.</b></p>\n`,
        `<div class="shots ftdd-sa-strip ftdd-sa-n1">\n${img("sa-20.png", "Installed apps: SADocumentHandler_2023 and WordSADocumentMergeAddIn")}</div>\n`))) +
    // the help line in its rounded box, beside Sanders' and Ivan's Discord IDs, each name under its own profile
    step(pair(`<p class="ftdd-sa-help">For those who still have issues installing Nitro Pro despite carefully following the correct process, you may seek technical assistance from Sanders. For the SA plugins issue, you may reach out to Ivan. Message them at 8AM PST.</p>\n`,
      `<p class="ftdd-sa-banner">Here are the Discord IDs of Sanders and Ivan. Please be reminded once again that their shift starts at 8:00 AM PST.</p>\n` +
      `<div class="ftdd-sa-contacts">\n` +
      `  <div><div class="shots">\n${img("discord-sanders.png", "Sanders on Discord")}</div><p><b>Sanders: sndrrsss9920</b></p></div>\n` +
      `  <div><div class="shots">\n${img("discord-ivan.png", "Ivan on Discord")}</div><p><b>Ivan: kuchiq</b></p></div>\n</div>\n`, " ftdd-sa-pair-help"));
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
/* 📋 EVERY DAY IN DAY 1'S SHAPE (Days 2–16): each row of a day's card (js/ft-day-decks.js LESSON_CARDS) leads to a slide
   of its own, in the card's order, the way Day 1's Reading Task, its stops and its Installation of SA do. Where the guide
   writes several of a card's activities under one heading, that section is cut here into one slide per activity.
   ROWS[day][section] = [{id, h?, parts: [[from, to] …], pre?, post?, fix?: [[from, to, count?] | fn …], read?, to?}]
     • from / to: literal text in the section (as it reads after the steps above: the Process Questions pointer, the
       lesson-deck note and TRIM / EDIT below); null is the section's start or end. Each must occur exactly once, and the
       parts of all the fragments must cover the section exactly, once each, or the build stops (as Day 1's TRIMs do);
     • the first fragment keeps the section's id; a new one gets a new id (s2b, s1c …), never "<id>-…", which means "a
       continuation of <id>" to the deck; a trainer-slot stays with the fragment it is in, and the build checks each
       lands in exactly one;
     • to: a fragment that belongs to a later section of the same day is added to the end of it instead;
     • read: the fragment is read like Day 1's reading (one size, page by page);
     • each fragment drops a divider left at its edges (the stars rule, a "-----" line). */
const SLOT = (n, k) => `<div class="trainer-slot" data-slot="${n}:${k}"></div>`;
const UPSKILL = "<p><b><i>*** Free Communication Upskill for 1 or 1 ½ hours</i></b></p>";
// a shadowing slide's own line on how the session runs on the platform
const SHADOW_HOWTO = "<p>Join your shadow buddy at the time your trainer posts in the training GC, and log the session with 👥 Shadowing log on this slide.</p>\n";
// an exact edit: `from` must occur `count` times (the build stops if the guide has changed under it)
function rep(html, from, to, count = 1, where = ""){
  const k = html.split(from).length - 1;
  if(k !== count) throw new Error(`${where}: "${from.slice(0, 70)}" occurs ${k} times, not ${count}`);
  return html.split(from).join(to);
}
// the same, one replacement per occurrence, in order
function seq(html, from, tos, where = ""){
  const bits = html.split(from);
  if(bits.length - 1 !== tos.length) throw new Error(`${where}: "${from.slice(0, 70)}" occurs ${bits.length - 1} times, not ${tos.length}`);
  return bits.reduce((a, b, i) => a + tos[i - 1] + b);
}
// another day's section, from one marker to the next (the guide repeats a day's reminders on the next one)
function borrow(n, sid, from, to){
  const s = load(n).sections.find(x => x.id === sid); if(!s) throw new Error(`Day ${n} has no ${sid} to borrow from`);
  const i = s.html.indexOf(from), j = to ? s.html.indexOf(to, i) : s.html.length;
  if(i < 0 || j < 0 || s.html.indexOf(from, i + 1) >= 0) throw new Error(`Day ${n} ${sid} no longer has "${from.slice(0, 60)}" (once) before "${String(to).slice(0, 60)}"`);
  return s.html.slice(i, j);
}
const edges = x => { let y = x, was; const rule = /^\s*(?:<hr class="stars">|<p><b>-{5,}<\/b><\/p>)\s*|\s*(?:<hr class="stars">|<p><b>-{5,}<\/b><\/p>)\s*$/;
  do { was = y; y = y.replace(rule, ""); } while(y !== was); return y.trim() + "\n"; };
// the LOR Drafting Activity's guidelines (build/lor/source/LOR_DRAFTING_ACTIVITIES - version 2.18.2026.pdf), in place of
// their Drive link on Day 11, as Day 1's reading is (its header and the "Name of VA / Date Taken" fields are the form's, not the text)
const LOR_FILE = "11N15MFcvSedCvByQ4GqHqt9BKZqlSxVu";
const LOR_GUIDE = () => fs.readFileSync(path.join(R, "build/days/lor-drafting.html"), "utf8").trim() + "\n";
// edits to a section before it is cut into its rows' slides
const EDIT = {
  // the buffer slide's stray heading of the next task (the Common Terms slide has its own)
  2: {s1: h => rep(h, '<p class="li" style="--lvl:0"><span class="lbl">2.</span><span><b>AM:</b><b><i> Common Terms Used &amp; Auto Liability Insurance</i></b></span></p>\n', "", 1, "Day 2 s1")},
  // the CRM/CMS videos, each named (the guide titles all five with its instruction line)
  3: {s2: h => seq(rep(rep(h, "</a>, </p>", "</a></p>", 3, "Day 3 s2"), "<p> <a", "<p><a", 1, "Day 3 s2"),
    'data-title="Please watch the CRM/CMS training videos and then update item #12 in your Monitoring Sheet"', [1, 2, 3, 4, 5].map(k => `data-title="CRM/CMS Training Video ${k}"`), "Day 3 s2")},
  4: {
    // while they wait for this afternoon's mock calls: the Call Simulator's Reception line (the card's tools name it)
    s1: h => rep(h, "<p>For those who have already completed the tasks, please watch these videos on Reception Training", "<p>For those who have already completed the tasks, please watch these videos on Reception Training", 1, "Day 4 s1") +
      `<p><b>Mock Call Preparation</b></p>\n<p>While you wait for your turn in this afternoon’s Reception Mock Calls, practise reception calls on the Call Simulator: the Reception line on ☎ LSH Ring Channel. Take as many practice callers as you like: they are not scored.</p>\n<p>Call Simulator: Reception line</p>\n<p><a href="https://cm-training-activity.pages.dev/simulators/call.html?program=FT&amp;line=Reception+Mock+Calls" target="_blank" rel="noopener noreferrer">https://cm-training-activity.pages.dev/simulators/call.html?program=FT&amp;line=Reception+Mock+Calls</a></p>\n<p>The Reception Training with Julio video is on the next slide.</p>\n`,
    s2: h => rep(h, 'data-kind="doc" data-title="RECEPTION TRAINING WITH JULIO', 'data-kind="video" data-title="RECEPTION TRAINING WITH JULIO', 1, "Day 4 s2")},
  // the guide's line to the trainer, in the trainee's words
  9: {s3: h => rep(h, "<p>Once each transcription is completed, they must save the file in their Assessments/Activities folder.</p>", "<p>Once each transcription is completed, save the file in your Assessments/Activities folder.</p>", 1, "Day 9 s3")},
  11: {
    s1: h => {
      // the guidelines' text in place of their link, and the templates' addresses without the guide's doubled-up query
      const out = rep(h, '<p>LOR Drafting Activity (Guidelines and Instructions):</p>\n<p><a class="viewer-link" data-kind="doc" data-title="LOR Drafting Activity (Guidelines and Instructions): https://drive.google.com/file/d/11N15" href="https://drive.google.com/file/d/11N15MFcvSedCvByQ4GqHqt9BKZqlSxVu/view?usp=sharing">https://drive.google.com/file/d/11N15MFcvSedCvByQ4GqHqt9BKZqlSxVu/view?usp=sharing</a> </p>\n', LOR_GUIDE(), 1, "Day 11 s1");
      if(out.includes(LOR_FILE)) throw new Error("Day 11's LOR Drafting guidelines still link their Drive file");
      const re = /(https:\/\/docs\.google\.com\/document\/d\/[\w-]+\/edit\?usp=sharing)&amp;amp;amp;[^"]*/g;
      if((out.match(re) || []).length !== 3) throw new Error("Day 11's LOR templates and case notes are no longer where the build looks for them");
      return out.replace(re, "$1");
    },
    // (the same document, a second time, under a name the guide's export gave it)
    s2: h => rep(h, '<p><a class="viewer-link" data-kind="doc" data-title="ve_link" href="https://drive.google.com/file/d/1fbrRvkeisnNF7EfVxCKTGtEodR7MY0A8/view?usp=drive_link">ve_link</a></p>\n', "", 1, "Day 11 s2")},
  14: {s2: h => rep(h, SLOT(14, "s2-1") + "\n", SLOT(14, "s2-1") + "\n" + SHADOW_HOWTO, 1, "Day 14 s2")},
  15: {
    // the demonstration day opens on what Day 14 set for it: the tutorial video, the gentle reminders and the rules
    // (all of it the trainee's own Day 14 text), then the metrics
    s1: h => {
      const tut = borrow(14, "s1", "<p>Tutorial Video:</p>", "<p>NOTE:  While watching");
      const gentle = edges(borrow(14, "s1", "<p><b>Gentle Reminders:</b></p>", "<p>@everyone</p>"));
      const rules = edges(rep(borrow(14, "s1", "<h3>6. All trainees must be fully prepared", null), "<h3>6. ", "<h3>", 1, "Day 15 s1"));
      return "<p>Today is your recorded demonstration of sending the MedLOR and requesting medical bills &amp; records. Go over the tutorial video and your process guide before you record.</p>\n" +
        tut + gentle + rules + rep(h, "<h3>Demo Metrics</h3>", "<h3>Demo Metrics</h3>", 1, "Day 15 s1");
    },
    // (its only line, the facilitator's timing note, is not shown: the shadowing slide had nothing on it)
    s2: h => borrow(14, "s2", "<p><b>Note: </b>If no shadowing buddy is available, recorded shadowing video/s will be provided to trainees instead.</p>", null).split("\n")[0] + "\n" + SHADOW_HOWTO + h},
  16: {s2: h => rep(rep(h, "<p>Sending Lien Balance Verification request using Filevine: <a ", "<p>Sending Lien Balance Verification request using Filevine:</p>\n<p><a ", 1, "Day 16 s2"),
    'data-kind="doc"', 'data-kind="video"', 6, "Day 16 s2")}
};
const ROWS = {
  2: {
    s2: [{id: "s2", parts: [[null, SLOT(2, "s2-1")]]},
      {id: "s2b", h: "Common Terms Used & Auto Liability Insurance Assessments", parts: [[SLOT(2, "s2-1"), null]], fix: [
        h => seq(h, 'data-title="AS YOUR HOMEWORK"', ['data-title="Common Terms Used – Assessment"', 'data-title="Auto Liability Insurance – Assessment"'], "Day 2 s2b"),
        ['data-title="https://drive.google.com/file/d/1ZOVrwOTPEz9WuwDRbBsBCNuHqf8wb8h4/view?usp=sharing"', 'data-title="Personal Injury reading 1"'],
        ['data-title="https://drive.google.com/file/d/1ni4Yg-dublrci2drQhlMVaqxo53xtfP1/view?usp=sharing"', 'data-title="Personal Injury reading 2"']]}],
    // the discussion's own part (its lesson note, its trainer notes, the Process Questions pointer) goes with the
    // card's Classroom Discussion stop; the exercise is a slide of its own
    s3: [{id: "s3", parts: [[null, "<p><b>Escalation Handling Exercise</b></p>"]]},
      {id: "s3b", h: "PM: Escalation Handling Exercise", parts: [["<p><b>Escalation Handling Exercise</b></p>", null]]}]
  },
  3: {
    s1: [{id: "s1", h: "AM: Checking of Assignments", parts: [[null, "<p><b>Confidentiality &amp; Call Response Exercise</b></p>"]],
        // (the two assessments the trainees uploaded on Day 2, as Day 2 set them: "Checking and feedback … will be done tomorrow")
        pre: `<p>Your trainer checks the two assessments you uploaded to your Assessments/Activities subfolder in the last session, with feedback, item clarifications and enrichment.</p>\n<p>Common Terms Used – Assessment</p>\n<p><a class="viewer-link" data-kind="doc" data-title="Common Terms Used – Assessment" href="https://docs.google.com/document/d/14sz5f3HTQKmryc7Upvlc6qua008rPnmw/edit?usp=drive_link">https://docs.google.com/document/d/14sz5f3HTQKmryc7Upvlc6qua008rPnmw/edit?usp=drive_link</a></p>\n<p>Auto Liability Insurance – Assessment</p>\n<p><a class="viewer-link" data-kind="doc" data-title="Auto Liability Insurance – Assessment" href="https://docs.google.com/document/d/11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C/edit?usp=drive_link">https://docs.google.com/document/d/11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C/edit?usp=drive_link</a></p>\n`},
      // (its heading names Call Listening, so the recordings' log follows it: js/ft-day-decks.js listenSlide)
      {id: "s1b", h: "AM: Call Listening on 10 Sample Recordings", parts: [[SLOT(3, "s1-4"), '<p class="li" style="--lvl:0"><span class="lbl">2.</span><span>Sample SOP</span></p>']],
        fix: [['<p class="li" style="--lvl:0"><span class="lbl">1.</span><span>Sample Call Recordings</span></p>', "<p>Sample Call Recordings</p>"]]},
      {id: "s1c", h: "AM: Confidentiality & Call Response Exercise", parts: [["<p><b>Confidentiality &amp; Call Response Exercise</b></p>", SLOT(3, "s1-4")],
        ['<p class="li" style="--lvl:0"><span class="lbl">2.</span><span>Sample SOP</span></p>', '<p class="li" style="--lvl:0"><span class="lbl">3.</span><span>Reception Activity on VA OSCAR’s recordings</span></p>']],
        fix: [['<p class="li" style="--lvl:0"><span class="lbl">2.</span><span>Sample SOP</span></p>', "<p>Sample SOP</p>"]]},
      {id: "s1d", h: "AM: Reception Activity on VA Oscar’s Recordings", parts: [['<p class="li" style="--lvl:0"><span class="lbl">3.</span><span>Reception Activity on VA OSCAR’s recordings</span></p>', null]],
        fix: [['<p class="li" style="--lvl:0"><span class="lbl">3.</span><span>Reception Activity on VA OSCAR’s recordings</span></p>', ""], ["<p>4. Carlos &amp;", "<p>Carlos &amp;"]]}]
  },
  6: {
    // the card lists the mock calls first, then the videos to watch while waiting for a turn
    s1: [{id: "s1", h: "Entire Day: Calendar Management Training Videos", parts: [[null, "<p>@everyone </p>"]]},
      {id: "s1b", h: "Entire Day: Calendar Management Mock Calls", parts: [["<p>@everyone </p>", null]], fix: [["<p>@everyone </p>\n", ""]]}]
  },
  7: {
    s1: [{id: "s1", parts: [[null, "<p><b>Intake Scenario Exercise</b></p>"]]},
      {id: "s1b", h: "AM: Intake Scenario Exercise", parts: [["<p><b>Intake Scenario Exercise</b></p>", null]]}]
  },
  8: {
    s1: [{id: "s1", h: "AM: Topic 1: Intake Process", parts: [[null, "<p>Topic 2: Intake Calling (MVC) </p>"]]},
      {id: "s1b", h: "AM: Topic 2: Intake Calling (MVC)", parts: [["<p>Topic 2: Intake Calling (MVC) </p>", "<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>"]]},
      // (the guide numbers both Topic 2; its own "To ensure clarity" calls the documents Topic 3)
      {id: "s1c", h: "AM: Topic 3: Intake Documents (MVA Cases)", parts: [["<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>", "<h4>Additional Instruction:</h4>"]],
        fix: [["<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>", "<p><b>Topic 3: Intake Documents (MVA Cases)</b></p>"]]},
      {id: "s1d", h: "AM: Additional Instruction: Naming Convention & Additional Intake Documents", parts: [["<h4>Additional Instruction:</h4>", '<div class="tbl-wrap"><table class="ft-table"><tr><td><p>@everyone </p>']]},
      // the demo's preparation (and the fillable-forms video added for it) is read with the demo tutorial
      {to: "s2", parts: [['<div class="tbl-wrap"><table class="ft-table"><tr><td><p>@everyone </p>', null]], fix: [h => {
        const out = h.replace(/\*{2,3}(?=<b>)|(?<=<\/b>)\*{2,3}/g, ""); if(/\*\*/.test(out)) throw new Error("Day 8's demo preparation still has raw asterisks"); return out; }]}]
  },
  9: {
    s3: [{id: "s3", h: "PM: Transcription Activity: Minutes of the Meeting", parts: [[null, "<h5>3.2. Mock Calls</h5>"]]},
      {id: "s3b", h: "PM: Intake Mock Calls", parts: [["<h5>3.2. Mock Calls</h5>", null]]}]
  },
  10: {
    s1: [{id: "s1", parts: [[null, "<p> Claims Terminology Exercise</p>"]]},
      {id: "s1b", h: "AM: Claims Terminology Exercise", parts: [["<p> Claims Terminology Exercise</p>", SLOT(10, "s1-3")]]},
      {id: "s1c", h: "AM: Opening Claims: What to Share & VA Call Recordings", parts: [[SLOT(10, "s1-3"), null]]}]
  },
  11: {
    // the LOR Drafting Activity: its guidelines read over two slides (Activity 1: 1P, Activity 2: 3P), then the templates,
    // the case notes and the reminders, with the platform's LOR Drafting tool
    s1: [{id: "s1", h: "AM: Policy Disclosure, Claim & Liability Evaluation", parts: [[null, '<hr class="stars">\n<p>As soon as you’re done with Activities 1 &amp; 2']]},
      {id: "s1b", h: "AM: LOR Drafting Activity", read: true, parts: [['<hr class="stars">\n<p>As soon as you’re done with Activities 1 &amp; 2', "<h3>Activity 2: "]]},
      {id: "s1b-2", h: "AM: LOR Drafting Activity", read: true, parts: [["<h3>Activity 2: ", "<p>1P LOR Template</p>"]]},
      {id: "s1b-3", h: "AM: LOR Drafting Activity: Templates, Case Notes & Reminders", parts: [["<p>1P LOR Template</p>", null]],
        post: `<div class="ftdd-pq">🧰 <b>Draft your 1P and 3P letters</b> in the platform’s LOR Drafting tool.<div class="ftdd-pq-go"><button type="button" class="btn btn-navy" onclick="goto('lor')">🧰 Open the LOR Drafting tool →</button></div></div>\n`}]
  },
  12: {
    s1: [{id: "s1", h: "AM: Tutorial Video: Saving LORs to SA and Sending to 1P & 3P Insurance Companies", parts: [[null, '<hr class="stars">\n<p>@everyone </p>']]},
      {id: "s1b", h: "AM: Adding 1P and 3P Insurance Information", parts: [['<hr class="stars">\n<p>@everyone </p>', "<p><b>Tools:</b></p>"]], fix: [["<p>@everyone </p>\n", ""]]},
      {id: "s1c", h: "AM: Tools & Naming Convention", parts: [["<p><b>Tools:</b></p>", SLOT(12, "s1-1")]]},
      {id: "s1d", parts: [[SLOT(12, "s1-1"), null]]}]
  },
  13: {
    // the breakout's exercise this afternoon; the HIPAA series is the homework (the timing note stays with the afternoon)
    s3: [{id: "s3", h: "PM: Breakout Session & Document Detectives Exercise", parts: [[null, "<p><b>HIPAA Certificate Task</b></p>"]], post: UPSKILL + "\n"},
      {id: "s3b", h: "HOMEWORK: HIPAA Training 101", parts: [["<p><b>HIPAA Certificate Task</b></p>", null]], fix: [[UPSKILL, ""],
        ['<p><b>Naming Convention:  </b>HIPAA Certificate_[Your Name]</p>\n<p><a href="https://compliancy-group.com/free-hipaa-training/hipaa-introduction/" target="_blank" rel="noopener noreferrer">https://compliancy-group.com/free-hipaa-training/hipaa-introduction/</a> </p>\n',
          '<p>HIPAA Training 101 series</p>\n<p><a href="https://compliancy-group.com/free-hipaa-training/hipaa-introduction/" target="_blank" rel="noopener noreferrer">https://compliancy-group.com/free-hipaa-training/hipaa-introduction/</a> </p>\n<p><b>Naming Convention:  </b>HIPAA Certificate_[Your Name]</p>\n']]}]
  },
  14: {
    s1: [{id: "s1", parts: [[null, "<h4>Please take note and include these reminders"]]},
      {id: "s1b", h: "AM: Notes for Your Work Guide", parts: [["<h4>Please take note and include these reminders", "<p><b>Here are the first 5 steps of the process guide as your sample"]]},
      {id: "s1c", h: "AM: Sample Process Guide: the First 5 Steps", parts: [["<p><b>Here are the first 5 steps of the process guide as your sample", "<p><b>Gentle Reminders:</b></p>"]]},
      {id: "s1d", h: "AM: Gentle Reminders & SA Updates", parts: [["<p><b>Gentle Reminders:</b></p>", '<p class="li" style="--lvl:0"><span class="lbl">1.</span><span><b>PM: </b>']], fix: [["<p>@everyone</p>\n", ""]]},
      {id: "s1e", h: "PM: Recorded Demonstration - Sending MedLOR (Medical Letter of Representation) and Requesting for Medical Bills & Records",
        parts: [['<p class="li" style="--lvl:0"><span class="lbl">1.</span><span><b>PM: </b>', null]], fix: [
          ['<p class="li" style="--lvl:0"><span class="lbl">1.</span><span><b>PM: </b><b><i>Demo and Shadowing</i></b></span></p>\n', ""],
          ["<p><b><i>Recorded Demonstration - Sending MedLOR (Medical Letter of Representation) and Requesting for Medical Bills &amp; Records</i></b></p>\n", ""],
          ["<h3>6. All trainees must be fully prepared", "<h3>All trainees must be fully prepared"]]}]
  },
  15: {
    s1: [{id: "s1", h: "AM: Before Your Recorded Demonstration", parts: [[null, "<h3>Demo Metrics</h3>"]]},
      {id: "s1b", parts: [["<h3>Demo Metrics</h3>", null]]}]
  },
  16: {
    s1: [{id: "s1", parts: [[null, "<h4>Please add these in your notes. </h4>"]]},
      {id: "s1b", h: "AM: Notes for Your Guide", parts: [["<h4>Please add these in your notes. </h4>", null]]}],
    s2: [{id: "s2", parts: [[null, SLOT(16, "s2-3")]]},
      {id: "s2b", h: "PM: Before Your Demo: Rules, Metrics & Time Limit", parts: [[SLOT(16, "s2-3"), null]],
        fix: [["<h3>5. All trainees must be fully prepared", "<h3>All trainees must be fully prepared"], ["<h4>6. Demo Metrics</h4>", "<h4>Demo Metrics</h4>"]]}]
  }
};
// a section cut into its rows' slides (ROWS above); carry holds the fragments that go to a later section
function cutRows(n, sid, h, html, spec, carry){
  const where = `Day ${n} ${sid}`;
  const at = m => { if(m == null) return null; const i = html.indexOf(m); if(i < 0 || html.indexOf(m, i + 1) >= 0) throw new Error(`${where}: "${m.slice(0, 70)}" must occur exactly once (${i < 0 ? "missing" : "repeated"})`); return i; };
  const spans = [];
  spec.forEach((f, fi) => f.parts.forEach(([a, b]) => { const i = a == null ? 0 : at(a), j = b == null ? html.length : at(b);
    if(j <= i) throw new Error(`${where}: a part of fragment ${f.id || f.to} ends before it starts`); spans.push({fi, i, j}); }));
  // the parts cover the section exactly: no gap, no overlap
  const sorted = spans.slice().sort((x, y) => x.i - y.i); let end = 0;
  sorted.forEach(s => { if(s.i !== end) throw new Error(`${where}: the fragments ${s.i > end ? "leave out" : "overlap at"} "${html.slice(Math.min(s.i, end), Math.min(s.i, end) + 70)}"`); end = s.j; });
  if(end !== html.length) throw new Error(`${where}: the fragments leave out its end`);
  if(spec[0].id !== sid) throw new Error(`${where}: its first fragment must keep the id ${sid}`);
  const out = [];
  spec.forEach((f, fi) => {
    if(f.id && f.id !== sid && f.id.startsWith(sid + "-")) throw new Error(`${where}: ${f.id} would read as a continuation of ${sid}`);
    let x = spans.filter(s => s.fi === fi).map(s => html.slice(s.i, s.j)).join("\n");
    for(const fx of f.fix || []) x = typeof fx === "function" ? fx(x) : rep(x, fx[0], fx[1], fx[2] || 1, `${where} ${f.id || "→ " + f.to}`);
    x = edges((f.pre || "") + edges(x) + (f.post || ""));
    if(f.to){ carry[f.to] = (carry[f.to] || "") + x; return; }
    out.push(Object.assign({id: f.id, h: (f.h || h).replace(/[:.\s]+$/, ""), of: sid}, f.read ? {read: true} : {}, {html: x}));
  });
  // every trainer note lands in exactly one fragment
  const slots = html.match(/data-slot="[^"]+"/g) || [], all = out.map(s => s.html).join("\n") + Object.values(carry).join("\n");
  slots.forEach(sl => { if(all.split(sl).length - 1 !== 1) throw new Error(`${where}: trainer slot ${sl} isn't in exactly one fragment`); });
  return out;
}
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
  const d = load(n), slides = [], carry = {}, cut = new Set();
  for(const s of d.sections){
    if(s.trainerOnly || (SKIP[n] || []).includes(s.id)) continue;
    const r = stripPQ(s.html); pqs += r.n;
    const q = stripQuestions(r.html); qs += q.n;
    const ld = stripLessonDeck(s.h, q.html); decksOff += ld.n;
    let html = (TRIM[n] && TRIM[n][s.id]) ? TRIM[n][s.id](ld.html) : ld.html;
    if(EDIT[n] && EDIT[n][s.id]) html = EDIT[n][s.id](html);
    // a fragment of an earlier section that is read with this one (ROWS: to)
    if(carry[s.id]){ html = html.replace(/\s*$/, "\n") + carry[s.id]; delete carry[s.id]; }
    for(const p of (PENDING[n] || []).filter(p => p.after === s.id))
      html += "\n" + ph("ftdd-ph-link", "🔗", `Link coming: ${p.name}`, p.note || "Your trainer adds the link here. Until then, ask in the training GC.");
    const h = ((RENAME[n] || {})[s.id] || s.h).replace(/[:.\s]+$/, "");
    if(html.includes("<!--pi-reading-->")){
      const parts = piParts(), of = "Reading Task: Personal Injury", wrap = x => piRows(x.replace(/<h2>/g, '<h2 class="ftdd-pi-h">').split(/(?=<h[23][ >])/).map(sec => {
        // a section with a chart is one row of two cards: its text on the left, its chart(s) on the right
        const figs = sec.match(/<figure>[\s\S]*?<\/figure>/g); if(!figs) return sec;
        const text = sec.replace(/<figure>[\s\S]*?<\/figure>\s*/g, "").trim();
        // beside the chart: the heading and its first paragraphs, about a page's worth (PI_BESIDE words); the rest of the
        // section's text follows under the row, so a long section is read over pages instead of shrunk to fit
        const blocks = text.split(/\n(?=<(?:p|ul|ol|h[2-6])[ >])/), words = x => x.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
        let n = 0, k = 0; while(k < blocks.length && (k < 2 || n + words(blocks[k]) <= PI_BESIDE)){ n += words(blocks[k]); k++; }
        const beside = blocks.slice(0, k).join("\n"), after = blocks.slice(k).join("\n");
        return `<div class="ftdd-pi-row"><div class="ftdd-pi-card">\n${beside}\n</div><div class="ftdd-pi-card ftdd-pi-chart">${figs.map(f => f.replace("<figure>", '<figure class="ftdd-pi-fig">').replace(' loading="lazy"', "")).join("")}</div></div>\n${after ? after + "\n" : ""}`;
      }).join(""));   // and each group (PI_PAIRS): its cards side by side, in one row
      slides.push({id: s.id, h: of, html: html.replace("<!--pi-reading-->", wrap(parts[0]))});
      parts.slice(1).forEach((x, i) => slides.push({id: `${s.id}-${i + 2}`, h: of, html: wrap(x)}));
      continue;
    }
    // one slide per card row (ROWS above)
    const rows = (ROWS[n] || {})[s.id];
    if(rows){ cut.add(s.id); slides.push(...cutRows(n, s.id, h, html, rows, carry)); continue; }
    slides.push({id: s.id, h, html});
  }
  if(Object.keys(carry).length) throw new Error(`Day ${n}: a fragment was meant for ${Object.keys(carry).join(", ")}, which the day doesn't have after it`);
  Object.keys(ROWS[n] || {}).forEach(sid => { if(!cut.has(sid)) throw new Error(`Day ${n} has no section ${sid} to cut into its rows' slides`); });
  if(new Set(slides.map(x => x.id)).size !== slides.length) throw new Error(`Day ${n}: two slides share an id`);
  const extra = EXTRA[n] || [];
  if(extra.length) extra.forEach((x, i) => slides.push({id: "extra-" + (i + 1), h: x.h, html: x.html}));
  else slides.push({id: "to-be-added", h: "To be added", placeholder: true,
    html: ph("ftdd-ph-blank", "📌", "More is on its way", "Your trainer will add the rest of today’s material here. Until then, follow the slides before this one and the training GC.")});
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
