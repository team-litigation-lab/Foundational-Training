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
const RENAME = {1: {pm: "Installation of SA (Smart Advocate) Plug-ins", reading: "Reading Task: Personal Injury"}};
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
// slides that hold several topics, split at each topic's own line (one slide per topic)
const SPLIT = {8: {s1: /(?=<p><b>Topic \d+:|<h4>Additional Instruction|<p><b>Added on )/}};
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
// Day 3: VA Oscar's Reception Activity is now the PI Reception Activity on a slide of its own (AFTER), so its lines come
// off this slide; Oscar's activity recordings are listed with his other recordings, as supplementary material
3: {s1: html => {
  const from = html.indexOf('<p class="li" style="--lvl:0"><span class="lbl">3.</span><span>Reception Activity on VA OSCAR');
  const shot = '<div class="shots"><figure><a href="/ft/day3/img/image14.png"', to = html.indexOf("</div>", html.indexOf(shot)) + 6;
  const oscar = html.match(/<p><a [^>]*1hRO-cnY1nabG8btm1U9OnZxvqYmiwLyn[^>]*>[^<]*<\/a><\/p>/);
  if(from < 0 || to < 6 || !oscar) throw new Error("Day 3's Reception Activity on VA Oscar's recordings is no longer where the build looks for it");
  const out = html.slice(0, from) + html.slice(to).replace(/^\n/, "");
  const sup = "<p>Oscar’s Reception Recordings</p>\n";
  if(!out.includes(sup)) throw new Error("Day 3's supplementary recordings are no longer where the build looks for them");
  return out.replace(sup, sup + oscar[0].replace(/data-title="[^"]*"/, 'data-title="Oscar’s Reception Activity recordings"') + "\n");
}},
4: {s1: html => html + "\n" + PI_WARMUP},
// Day 2's Homework: the handouts' 2026 version only (the old version's folder goes), shown in the slide
2: {s4: html => {
  const out = html.replace(/<p>OLD VERSION<\/p>\n<p><a [^>]*1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y[^>]*>[^<]*<\/a> ?<\/p>\n?/, "")
    .replace(/<p>2026 VERSION<\/p>\n<p><a [^>]*(1-uB07Lu7nPeRpdDwOzvAKFMjZbXKQW-r)[^>]*>[^<]*<\/a> ?<\/p>/, (m, id) =>
      `<p><b>The handouts (2026 version)</b></p>\n<div class="ftdd-embed ftdd-embed-folder"><iframe src="https://drive.google.com/embeddedfolderview?id=${id}#grid" title="The handouts (2026 version)" loading="lazy"></iframe></div>`);
  if(/OLD VERSION|1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y/.test(out) || !/embeddedfolderview/.test(out)) throw new Error("Day 2's Homework handouts are no longer where the build looks for them");
  return out;
}}};
// 🎧 The PI Reception Activity (Day 3; replayed on Day 4 before the mock calls): six practice calls at the Practice Lab's
// Harbor & Pine Injury Law, each with a challenge (background noise, a line that breaks up, a Spanish-speaking caller, a
// speakerphone echo, a fast-talking adjuster, an upset family member not on the file), played on the slide. The calls,
// their audio (ft/day3/audio/) and the trainer's key come from build/calls/pi_reception_calls.py, which writes
// build/calls/pi-reception-calls.json; this build turns that into the slides and the key's trainer-only slot (3:pi-calls).
const PI_CALLS = JSON.parse(fs.readFileSync(path.join(R, "build/calls/pi-reception-calls.json"), "utf8"));
const hx = x => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const CH_ICON = [[/connection/i, "📶"], [/language/i, "🌐"], [/audio quality|echo/i, "🎚️"], [/fast/i, "⏩"], [/not on the file|unauthori/i, "🔒"], [/upset/i, "😟"], [/noise/i, "🔊"]];
const chIcon = t => (CH_ICON.find(([re]) => re.test(t)) || [0, "👤"])[1];
const mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
// the calls, three cards to a row (each row is one block, so a page never splits a card)
function piCallRows(compact){
  const card = c => `<div class="ftdd-pic${compact ? " ftdd-pic-sm" : ""}"><p class="ftdd-pic-h"><span class="ftdd-pic-n">${c.id}</span><span>${hx(c.title)}</span><span class="ftdd-pic-len">${mmss(c.secs)} · VA ${hx(c.va)}</span></p>` +
    `<p class="ftdd-pic-tags">${(compact ? [c.challenge] : c.tags).map(t => `<span class="ftdd-pic-tag${/client|provider|adjuster/i.test(t) && !/not on/i.test(t) ? " ftdd-pic-who" : ""}">${chIcon(t)} ${hx(t)}</span>`).join("")}</p>` +
    (compact ? "" : `<p class="ftdd-pic-about">${hx(c.about)}</p>`) +
    `<audio class="ftdd-pic-audio" controls preload="none" src="${c.file}" title="Call ${c.id}: ${hx(c.title)}"></audio></div>`;
  const rows = [];
  for(let i = 0; i < PI_CALLS.calls.length; i += 3) rows.push(`<div class="ftdd-pic-row">${PI_CALLS.calls.slice(i, i + 3).map(card).join("")}</div>`);
  return rows.join("\n") + "\n";
}
const PI_WORKSHEET = "/handouts/LSH_Day3_PI_Reception_Activity_Worksheet.docx";
const PI_SLIDE = {id: "s1-pi", h: "AM: PI Reception Activity: 6 Practice Calls", html:
  `<p><b>Six calls to ${hx(PI_CALLS.firm)}</b>, a personal injury firm in Tampa, Florida. Each call has a challenge a receptionist meets on the line. Listen to each one (replay it as often as you need) and extract its <b>5 data points</b> into your worksheet.</p>\n` +
  `<div class="ftdd-pic-points"><p class="ftdd-pic-points-h">📋 The 5 data points of every call</p><ol>` +
  `<li><b>Caller</b>: their name, and who they are (client, potential client, provider, adjuster, family …)</li>` +
  `<li><b>Callback number</b>: with the extension or best time, if given</li>` +
  `<li><b>Verified?</b>: how the VA verified the caller (name, DOB, date of the accident), or why nothing could be shared</li>` +
  `<li><b>Reason for the call</b>: the case and what they need</li>` +
  `<li><b>Action taken</b>: who it went to, and how (message, transfer, callback)</li></ol>` +
  `<p class="ftdd-pic-plus">➕ And the call’s <b>challenge</b>: what made the call hard, and what the VA did about it.</p></div>\n` +
  piCallRows(false) +
  `<div class="trainer-slot" data-slot="3:pi-calls"></div>\n` +
  `<div class="ftdd-tiles"><a class="ftdd-tile k-doc" href="${PI_WORKSHEET}" target="_blank" rel="noopener noreferrer"><span class="ftdd-tile-ic">📝</span><span class="ftdd-tile-t"><b>PI Reception Activity worksheet</b><small>Download the Word file</small></span></a></div>\n` +
  `<p><b>Naming Convention:</b> PI_Reception_Activity (VA’s first name). Upload the completed worksheet to your Assessment and Activities Folder and work directly from there to finalize it.</p>\n`};
// the trainer's key (trainer view only): each call's 5 data points, what the VA did with the challenge, and the transcript
const PI_KEY = `<div class="facilitator"><h4>Facilitator’s Note: PI Reception Activity: the 5 data points of each call</h4>\n` +
  PI_CALLS.calls.map(c => `<p><b>Call ${c.id}: ${hx(c.title)}</b> (${hx(c.challenge)})</p>\n<ol>${c.key.map(x => `<li><b>${hx(x.k)}:</b> ${hx(x.v)}</li>`).join("")}</ol>\n` +
    `<p><i>The challenge:</i> ${hx(c.handled)}</p>\n<details><summary>Transcript</summary>${c.transcript.map(t => `<p>${t.who ? `<b>${hx(t.who)}:</b> ` : ""}${hx(t.text)}</p>`).join("")}</details>`).join("\n") + "</div>";
// Day 4: the same calls, small, to replay while waiting for the mock call
const PI_WARMUP = `<hr class="stars">\n<p><b>🎧 Warm-up before your mock call: the PI practice calls</b></p>\n<p>Replay one or two of Day 3’s practice calls. Listen for how the VA verifies the caller, reads numbers back, and handles the noise, the dropped line or the language barrier: you’ll need the same on your own call.</p>\n` + piCallRows(true);
// slides added after a day's slide: {day: {after: [slide, …]}}
const AFTER = {3: {s1: [PI_SLIDE]}};
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
    // a slide that holds several topics (Day 8's Intake Process / Intake Documents) is one slide per topic, so each reads
    // in a page or two and the deck walks through them in order; the topic's name joins the slide's title
    const split = (SPLIT[n] || {})[s.id];
    if(split){
      const parts = html.split(split).filter(x => x.replace(/<[^>]+>/g, "").trim());
      if(parts.length < 2) throw new Error(`Day ${n} ${s.id} no longer splits at its topics`);
      // the lead-in before the first topic stays with it
      const first = split.test(parts[0]) ? 0 : 1, lead = first ? parts[0] : "";
      let topic = "";
      parts.slice(first).forEach((x, i) => {
        // a topic's own line names the slide; a section of it (Additional Instruction, a dated addition) follows its topic's name
        const own = ((x.match(/^\s*<p><b>(Topic \d+:[^<]*)<\/b>/) || [])[1] || "").trim(), sub = ((x.match(/^\s*<(?:h4|p><b)>([^<]*)</) || [])[1] || "").replace(/[:\s]+$/, "").trim();
        if(own) topic = own;
        const t = own || [topic, sub].filter(Boolean).join(" · ");
        const when = (h.match(/^(AM|PM|Entire Day)\s*:/i) || [""])[0];
        slides.push({id: i ? `${s.id}-${i + 1}` : s.id, h: t ? `${when ? when + " " : ""}${t}` : h, html: (i ? "" : lead) + x}); });
      continue;
    }
    slides.push({id: s.id, h, html});
    for(const x of ((AFTER[n] || {})[s.id] || [])) slides.push(Object.assign({}, x));
  }
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
// the PI Reception Activity's key, in the trainer-only notes (kept there by build/curriculum/convert.py)
const NOTES = path.join(R, "trainer/notes.json"), notes = JSON.parse(fs.readFileSync(NOTES, "utf8"));
if(notes.slots["3:pi-calls"] !== PI_KEY){ notes.slots["3:pi-calls"] = PI_KEY; fs.writeFileSync(NOTES, JSON.stringify(notes, null, 1)); }
console.log(`js/ft-day-decks-data.js: ${Object.keys(decks).length} day decks, ${Object.values(decks).reduce((a, d) => a + d.slides.length, 0)} slides, ${pqs} Process Questions lists replaced by the Knowledge Check pointer, ${qs} task question lists replaced by the assessment note, ${(out.length / 1024).toFixed(0)} KB`);
for(const d of Object.values(decks)) console.log(`  Day ${d.day} · ${d.title}: ${d.slides.map(s => s.h.slice(0, 40)).join(" | ")}`);
