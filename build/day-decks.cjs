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
const SKIP = {1: ["expectations", "reminders", "hubstaff", "homework", "monitoring", "discussion", "client-id"],
  // (Day 2's Buffer Time is off the deck: the day starts on its Common Terms tasks. Its Classroom Activity slide and its
  // Escalation Handling Exercise are off too: after the 🎬 Handouts / Video stop comes ✍️ Process Questions)
  2: ["s1", "s3"],   // (Day 1's discussion slide and Client Identification Exercise: the lesson deck opens from its ▶ Start Training stop, the recorded lecture with the trainer's Handouts and Videos unlock)
  // (Day 7's Scheduled Shadowing, its TAM questions and the intake shadowing videos are off the training: Part 1 ends
  // on the 🎧 Call Listening Activity)
  7: ["s2"],
  4: ["s1"],   // (Day 4's one-line introduction joins the slide it introduces: TRIM[4].s2)
  // (Days 5 and 13: the classroom discussion's slide only said that the lesson deck opens from ▶ Start Training, which is the
  // card's own 💬 Classroom Discussion stop, as Day 1's is; its trainer slot was the same deck's link. Day 13's 🎧 Call
  // Listening slide is placed by its card row instead, js/ft-day-decks.js slidesOf)
  // (Day 5's Monitoring Sheet slide too: items #10–11 close Reception Part 2, Day 4's s2m, js/ft-day-decks.js LESSON_CARDS[3])
  5: ["s1", "s2"], 13: ["s2"],
  // (Day 8's Demo Tutorial Viewing and Demo Preparation: its video plays on the SA demonstration's slide, ROWS[8].s1e)
  // (and Atty. Sandy's MVC intake-call video, cut from the afternoon's section by ROWS[8].s3)
  8: ["s2", "s3b"],
  // (Day 9's Buffer Time for the Intake demo is off the deck: Part 3 opens on the Intake Mock Calls)
  9: ["s1"]};
// slide titles that named the Process Questions, which aren't on the slides
const RENAME = {1: {pm: "Installation of SA (Smart Advocate) Plug-ins", reading: "Reading Task: Personal Injury"},
  // (Day 8's afternoon is the demo; Atty. Sandy's video is off the deck: ROWS[8].s3)
  // (Day 2's Softphones and PPTs are a classroom activity, not homework: js/ft-day-decks.js LESSON_CARDS[2])
  2: {s2: "Common Terms Used & Auto Liability Insurance", s4: "Softphones and PPTs on Documents & Spreadsheets, Keyboard Shortcuts, and Shadowing Etiquette"},
  // (Day 3's first slide: the sample recordings and SOP, its card's 🎧 Call Listening Sessions row; "Call Listening" in its
  // name brings the 🎧 Call Listening log button, js/ft-day-decks.js slideActions)
  3: {s1: "Frontline Management: Operations, Logistics, and Escalations Protocols", s2: "CRM/CMS Training Videos"},
  4: {s2: "Training Video Viewing", s3: "PM: Reception Mock Calls (One-on-One)"}, 5: {s1: "Update Your Monitoring Sheet"},
  7: {insurance: "AM: Common Insurance Providers"},
  8: {s3: "PM: Saving the Intake Packet and Extracted Intake Documents to SA"}};
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
/* 📅 Day 5's Attorney Calendar Management Activity, its own words on the slide: its Instructions (1–9, the colour legend,
   the guests' e-mails) and its ten Activity Items, from build/days/attorney-calendar-activity.txt (word for word as the
   trainer gave them), as sixteen cards (calItems). Each card is one block, so a page turns between cards, never inside one. */
const CAL_TEXT = path.join(R, "build/days/attorney-calendar-activity.txt");
// (Google Calendar's own colours for the legend's names)
const CAL_COLORS = {Green: "#0B8043", Blue: "#039BE5", Red: "#D50000", Purple: "#8E24AA", Yellow: "#F6BF26", Orange: "#F4511E", Pink: "#E67C73"};
// Day 5's Activity Items as ten cards, an item a card with all of its own on it (6's two travel blocks; 8's four parts of
// the trip side by side on it, each under its ➢ heading), on four slides (ROWS[5].s3 cuts them at each group's head: CAL_HEAD). Each slide opens on the link to the Calendar Simulator's Attorney's Calendar, where the activity is done
// (the link and the cards one block, ftdd-cal-set, so they share a page). CAL_CARDS: the cards' labels, in the items' order
const CAL_CARDS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
// (8, with its four parts of the trip, on a slide of its own)
const CAL_GROUPS = [[0, 4], [4, 7], [7, 8], [8, 10]];
const calRange = ([a, b]) => b - a === 1 ? CAL_CARDS[a] : `${CAL_CARDS[a]}–${CAL_CARDS[b - 1]}`;
const CALSIM_ACTIVITY = {label: "📅 Open the Calendar Simulator: the Attorney’s Calendar", href: "#/calsim/attorney-activity"};
// beside it, the same activity on the Main Portal's Google Calendar Simulator: its Calendaring Simulators' Standard Training -
// Calendar Management Activity track (calsim.html?program=FT&track=activity, js/ft-simulators.js ftsCalsim), in its own tab;
// where ftsCalsim isn't loaded, the Practice Lab
const CALSIM_PORTAL = {label: "📅 Standard Training - Calendaring Activity", track: "activity"};
const calsimPortal = cls => `<button type="button" class="${cls}" title="Opens on the Main Portal’s Google Calendar Simulator, in its own tab" onclick="window.ftsCalsim ? ftsCalsim('${CALSIM_PORTAL.track}') : goto('simulators')">${hx(CALSIM_PORTAL.label)}</button>`;
// (the activity's one link is on its Instructions slide: the items' slides carry none, so no one picks the wrong calendar)
const CAL_HEAD = ([a, b]) => `<div class="ftdd-cal-set" data-items="${CAL_CARDS[a]}-${CAL_CARDS[b - 1]}">\n`;
// 6's travel blocks: the guide's own lines under "Travel Blocks:" (each on 6's card, under it)
const CAL_BLOCKS = [[/for travel to court\.$/, "Travel Block: to court"], [/for return travel\.$/, "Travel Block: return"]];
// "July 06, 2026": the activity's date, marked with its day so the slide shows it moved to the trainee's own weeks
// (js/ft-day-decks.js calDates; FTCalCore.act: its dates are the ones written for Mon July 6, 2026)
const CAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const calDate = t => t.replace(/\b([A-Z][a-z]+) (\d{2}), (\d{4})\b/g, (all, mo, d, y) => { const i = CAL_MONTHS.indexOf(mo); if(i < 0) return all;
  return `<span class="ftdd-cal-date" data-cal-date="${y}-${String(i + 1).padStart(2, "0")}-${d}">${all}</span>`; });

function calItems(html){
  const items = html.split('<div class="ftdd-cal-item').slice(1).map(x => '<div class="ftdd-cal-item' + x), lbls = items.map(x => (x.match(/^<div class="ftdd-cal-item[^"]*" data-card="([^"]+)">/) || [])[1]);
  if(lbls.join() !== CAL_CARDS.join() || html.indexOf('<div class="ftdd-cal-item') !== 0) throw new Error(`Day 5's Activity Items are no longer the ten cards the build expects: ${lbls.join()}`);
  return CAL_GROUPS.map(([a, b]) => CAL_HEAD([a, b]) + `<div class="ftdd-cal-grid" style="--n:${b - a}">\n` + items.slice(a, b).join("") + "</div></div>\n").join("");
}
function calActivity(){
  const lines = fs.readFileSync(CAL_TEXT, "utf8").split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const li = (lvl, lbl, html) => `<p class="li" style="--lvl:${lvl}"><span class="lbl">${lbl}</span><span>${html}</span></p>\n`;
  // "Date: July 06, 2026": its label in bold (and its date marked: calDate)
  const lab = t => { const m = t.match(/^([A-Z][A-Za-z’' -]{0,50}):\s*(.*)$/); return m ? `<b>${hx(m[1])}:</b>${m[2] ? " " + (m[1] === "Date" ? calDate(hx(m[2])) : hx(m[2])) : ""}` : hx(t); };
  // a card: an item, with its travel blocks and the parts of its trip on it
  let part = "", out = "", card = null, it = null, lvl = 0, steps = 0, items = 0, blocks = false, m;
  const close = () => { if(card == null) return;
    if(card.part) card.body += "</div></div>\n";   // (the last part's box, and the parts' row)
    out += `<div class="ftdd-cal-item${card.part ? " ftdd-cal-trip" : ""}" data-card="${card.lbl}">\n<p class="ftdd-cal-h"><b>${hx(card.h)}</b></p>\n` + card.body + "</div>\n"; card = null; };
  for(const l of lines){
    if(l === "Instructions:"){ part = "ins"; out += "<h3>Instructions</h3>\n"; continue; }
    if(l === "Activity Items:"){ part = "items"; out += "<h3>Activity Items</h3>\n"; continue; }
    if(part === "ins"){
      if((m = l.match(/^(\d+)\.\s+(.*)$/))){ steps++; out += li(0, m[1] + ".", hx(m[2])); continue; }
      if((m = l.match(/^o\s+(\w+)\s+–\s+(.*)$/))){
        if(!CAL_COLORS[m[1]]) throw new Error(`Day 5's activity names a colour the build doesn't know: ${m[1]}`);
        out += li(1, `<span class="ftdd-sw" style="background:${CAL_COLORS[m[1]]}"></span>`, `<b>${hx(m[1])}</b> – ${hx(m[2])}`); continue;
      }
      if((m = l.match(/^(.+?) - (\S+@\S+)$/))){ out += li(1, "•", `<b>${hx(m[1])}</b> - ${hx(m[2])}`); continue; }
      out += li(1, "", hx(l)); continue;   // (the example under 8)
    }
    if(part !== "items") throw new Error(`Day 5's activity text has a line before its Instructions: ${l}`);
    if((m = l.match(/^(\d+)\.\s+(.*)$/))){ close(); items++; lvl = 0; blocks = false; it = {n: m[1], title: m[2], date: "", tz: ""};
      card = {lbl: m[1], h: `${m[1]}. ${m[2]}`, part: false, body: ""}; continue; }
    if(card == null) throw new Error(`Day 5's activity has a line before its first item: ${l}`);
    // • a detail; ➢ a part of the trip (a card of its own); ▪ its date, time or note; - a time under the line before
    // (under 6's "Travel Blocks:", each - is a travel block, on 6's card: its name, then its time; a ➢ part of 8's trip is a
    // heading on 8's card, its ▪ lines under it)
    if((m = l.match(/^•\s*(.*)$/)) && !card.part){ lvl = 0; blocks = m[1] === "Travel Blocks:";
      if((m = m[1].match(/^Date:\s*(.*)$/))) it.date = m[1];
      const tm = l.match(/^•\s*Time:.*\s(PST|MST|CST|EST)$/); if(tm) it.tz = tm[1];
      card.body += li(0, "•", lab(l.replace(/^•\s*/, ""))); continue; }
    if((m = l.match(/^➢\s*(.*?):?$/))){ blocks = false; card.body += (card.part ? "</div>\n" : '<div class="ftdd-cal-parts">\n') + `<div class="ftdd-cal-partbox">\n<p class="ftdd-cal-part"><b>➢ ${hx(m[1])}</b></p>\n`;
      card.part = true; lvl = 1; continue; }
    if((m = l.match(/^▪\s*(.*)$/)) && card.part){ lvl = 1; card.body += li(1, "▪", lab(m[1])); continue; }
    if((m = l.match(/^-\s*(.*)$/))){
      if(blocks){ const b = CAL_BLOCKS.find(([re]) => re.test(m[1])); if(!b) throw new Error(`Day 5's activity has a travel block the build doesn't name: ${l}`);
        card.body += li(1, "-", hx(m[1])); continue; }
      card.body += li(lvl + 1, "-", hx(m[1])); continue; }
    throw new Error(`Day 5's activity has a line the build doesn't read: ${l}`);
  }
  close();
  if(steps !== 9 || items !== 10) throw new Error(`Day 5's activity has ${steps} instructions and ${items} items, not 9 and 10`);
  return out;
}
// 🌳 Day 3's call-handling decision trees, drawn on the slide (Frontline Management): the guide's two (its screenshots,
// ft/day3/img/image12.png and image17.png: Authorization, Payment Calls) and the PI firm's other frontline calls. Each:
// what starts it, its steps (a question with what to do on YES and on NO, or a step to take), and its protocol
const TREES = [
  {h: "Authorization Decision Tree", tag: "Information Security Protocol", start: "Caller requests Information", steps: [
    {q: "Is the caller listed as authorized in the CRM?", yes: ["Proceed per SOP"], no: ["Take a message", "Route to the attorney/paralegal", "Do NOT disclose information"]}]},
  {h: "Payment Calls Decision Tree", tag: "Settlement & Payment Protocol", start: "Caller asks about Payment/ Settlement", steps: [
    {do: "Authenticate name + case"},
    {q: "Is the caller requesting numbers or timelines?", yes: ["Do NOT answer", "Route to the legal team"], no: ["General inquiry", "Take a message", "Route"]}]},
  {h: "New Caller Decision Tree", tag: "Intake Protocol", start: "A new caller reports an accident or injury", steps: [
    {q: "Is it a personal injury matter (MVA, slip & fall, dog bite, premises)?", yes: ["Go on to the next question"], no: ["Take a message", "Route to the attorney for review (referral per firm policy)"]},
    {q: "Is the date of loss within the statute of limitations (Nevada: 2 years)?", yes: ["Take the intake basics: name, callback number, DOB, DOL, injuries", "Schedule the intake / transfer to the Intake Specialist"], no: ["Take the details", "Route to the attorney now: do not promise representation"]}]},
  {h: "Medical Provider Call Decision Tree", tag: "HIPAA Protocol", start: "A provider calls about a client’s bills, records or lien", steps: [
    {do: "Verify the provider, and the client: name, DOB, DOL"},
    {q: "Is the client’s signed HIPAA authorization on file?", yes: ["Take the request (bills, records, lien balance)", "Route to the Medical Records Specialist"], no: ["Do NOT share PHI", "Take a message", "Route to the case manager to get the HIPAA authorization"]}]},
  {h: "Insurance Adjuster Call Decision Tree", tag: "Claims Communication Protocol", start: "An adjuster calls about a claim", steps: [
    {q: "Is our Letter of Representation on file and the claim number known?", yes: ["Never give a recorded statement or settlement figures", "Take the message", "Route to the case manager on the claim"], no: ["Take the adjuster’s name, company, claim no. and callback", "Confirm nothing about the case", "Route to the case manager"]}]},
  {h: "Urgent / Distressed Caller Decision Tree", tag: "Escalation Protocol", start: "The caller is upset or reports an emergency", steps: [
    {q: "Is anyone in immediate danger or in a medical emergency?", yes: ["Tell them to call 911 now", "Note the call", "Escalate to the attorney right away"], no: ["Stay calm, listen and empathize", "Take a detailed message", "Escalate the same day to the attorney/case manager"]}]}
];
const esc_ = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// (a row of two to a grid, kept on one page (ftdd-keep): New Caller beside Medical Provider Call, never split over two pages)
const treeHtml = t => `<div class="ftdt"><div class="ftdt-h"><b>🌳 ${esc_(t.h)}</b><button type="button" class="ftdt-big" onclick="FTDayDecks.treeFull(this)" title="Show this tree bigger">⛶ Bigger</button></div>` +
  `<div class="ftdt-body"><div class="ftdt-start">${esc_(t.start)}</div>` +
  t.steps.map(s => s.do ? `<div class="ftdt-arrow">↓</div><div class="ftdt-do">${esc_(s.do)}</div>`
    : `<div class="ftdt-arrow">↓</div><div class="ftdt-q">${esc_(s.q)}</div><div class="ftdt-br"><div class="ftdt-yes"><span>YES</span>${s.yes.map(x => `<i>${esc_(x)}</i>`).join("")}</div><div class="ftdt-no"><span>NO</span>${s.no.map(x => `<i>${esc_(x)}</i>`).join("")}</div></div>`).join("") +
  `<p class="ftdt-tag">🛡 ${esc_(t.tag)}</p></div></div>`;
const TREES_HTML = [0, 2, 4].map(i => `<div class="ftdt-grid ftdd-keep">${TREES.slice(i, i + 2).map(treeHtml).join("\n")}</div>\n`).join("");
// 📅 Day 5's sample, a finished event (the guide's Deposition Meeting screenshot), drawn as Day 6's sample event: the title and
// the date, time and time zone boxed in red, the time zone highlighted; then its location, email reminder, calendar, guests and notes
const DEPOSITION_EV = '<div class="ftdd-ev ftdd-ev-dep" role="img" aria-label="Sample: a finished event, Deposition Meeting, Feb 4, 2025, 11:00am to 1:00pm, (GMT-05:00) Eastern Standard Time - Panama; location Attorney’s Office or Zoom for Remote Attendees; email reminder 1 day before; Michelle Bernardino’s calendar, red; guests Michelle Bernardino (organizer), Martin Anthony Gan and Michelle Velarde; the Zoom link and the notes in the description">' +
  '<div class="ftdd-ev-top"><span class="ftdd-ev-x">✕</span><span class="ftdd-ev-title"><span class="ftdd-ev-mark">Deposition Meeting</span></span><span class="ftdd-ev-note">◀ Specific title</span><span class="ftdd-ev-save">Save</span></div>' +
  '<div class="ftdd-ev-when"><span class="ftdd-ev-f">Feb 4, 2025</span><span class="ftdd-ev-f">11:00am</span><span>to</span><span class="ftdd-ev-f">1:00pm</span><span class="ftdd-ev-f">Feb 4, 2025</span><span>(GMT-05:00) <span class="ftdd-ev-hl">Eastern Standard Time - Panama</span></span><span class="ftdd-ev-link">Time zone</span></div>' +
  '<div class="ftdd-ev-sub"><span><span class="ftdd-ev-box"></span> All day</span> <span class="ftdd-ev-f">Does not repeat ▾</span></div>' +
  '<div class="ftdd-ev-body"><div class="ftdd-ev-main"><div class="ftdd-ev-tabs"><b>Event details</b><span>Find a time</span></div>' +
  '<div class="ftdd-ev-line">🎥 <span class="ftdd-ev-link">Add Google Meet video conferencing</span></div>' +
  '<div class="ftdd-ev-line">📍 <span class="ftdd-ev-f wide">Attorney’s Office or Zoom for Remote Attendees</span></div>' +
  '<div class="ftdd-ev-line">🔔 <span class="ftdd-ev-f">Email ▾</span><span class="ftdd-ev-f">1</span><span class="ftdd-ev-f">days ▾</span></div>' +
  '<div class="ftdd-ev-line">📅 <span class="ftdd-ev-f">Michelle Bernardino ▾</span><span class="ftdd-ev-f"><span class="ftdd-ev-dot" style="background:#D50000"></span> ▾</span></div>' +
  '<div class="ftdd-ev-line">💼 <span class="ftdd-ev-f">Busy ▾</span><span class="ftdd-ev-f">Default visibility ▾</span></div>' +
  '<div class="ftdd-ev-desc"><p><span class="ftdd-ev-link">Zoom Link</span> for remote attendees: <span class="ftdd-ev-link">zoom.us/deposition-meeting-02-04-25</span></p><p>Deposition preparation with another attorney.</p></div></div>' +
  '<div class="ftdd-ev-side"><div class="ftdd-ev-tabs"><b>Guests</b><span>Suggested times</span></div><div class="ftdd-ev-f wide">Add guests</div>' +
  '<p class="ftdd-ev-perm">3 guests <small>· 1 yes, 2 awaiting</small></p>' +
  '<div class="ftdd-ev-guest"><span class="ftdd-ev-av">M</span><span><b>Michelle Bernardino</b><small>Organizer</small></span></div><div class="ftdd-ev-guest"><span class="ftdd-ev-av" style="background:#12A4AF">M</span><span><b>Martin Anthony Gan</b></span></div><div class="ftdd-ev-guest"><span class="ftdd-ev-av" style="background:#5B3CC4">M</span><span><b>Michelle Velarde</b></span></div>' +
  '<p class="ftdd-ev-perm">Guest permissions</p><div><span class="ftdd-ev-box"></span> Modify event</div><div><span class="ftdd-ev-box on">✓</span> Invite others</div><div><span class="ftdd-ev-box on">✓</span> See guest list</div></div></div></div>\n';
const TRIM = {1: {reading: html => {
  const at = html.indexOf("</p>", html.indexOf(PI_FILE)); if(at < 0) throw new Error("Day 1's Reading Task no longer links the Personal Injury overview");
  // the group-chat answer note and its naming convention go: the answers are on ✍️ Knowledge Check
  html = html.replace(/<p><b>Note: Please send you answers[\s\S]*?<p>Thank you\.<\/p>\n?/, "");
  if(/group chat|Tettra/i.test(html)) throw new Error("Day 1's Reading Task still has the group-chat note or a Tettra reference (the Knowledge Base replaced Tettra)");
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
  // (the Knowledge Base links under their screenshots, big and blue: .ftdd-sa-kb)
  const url = re => `<p class="url-list ftdd-sa-kb">${tag(new RegExp(`<a [^>]*${re}[^>]*>[^<]*<\\/a>`))}</p>\n`;
  const win = url("71237633"), mac = url("876020096");
  const img = (f, alt, cap) => { if(!fs.existsSync(path.join(R, "ft/day1/img", f))) throw new Error("Day 1's Installation of SA is missing " + f);
    // (?v: the screenshots were redrawn 3× sharper, the address changes so browsers fetch them anew; 15 and 16, the two
    // installer dialogs, redrawn sharp again (?v=4x); 7 redrawn sharp and 8 shot from the knowledge base page itself (?v=5))
    const u = `/ft/day1/img/${f}${/^sa-(07|08)\./.test(f) ? "?v=5" : /^sa-(15|16)\./.test(f) ? "?v=4x" : /^sa-/.test(f) ? "?v=3x" : ""}`;
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
    step(unit(`<p>2. For Windows Users, access the link and download the 2nd hyperlink to install Microsoft Word, Excel, and Outlook plugins on your desktop. Follow steps 2-7 as indicated below the list of hyperlinks on this page:</p>\n` + strip(7, 2, null) + win),
      unit(`<p>For Mac Users, access the link and download plugin on your desktop. Follow the steps indicated below the link on this page:</p>\n` + strip(9, 2, null) + mac)) +
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
// Day 5 opens on the Monitoring Sheet's items #10–11, the same panel and 📤 Submit as Day 4's (js/ft-buffer.js "5:s1"), in
// place of the Buffer Time for Reception Mock Calls and its mock call preparation; the card's next stop is the lesson deck
5: {s1: html => {
  const line = "<p>Carryover period for completing any pending tasks from the last session. </p>";
  if(html.trim() !== line) throw new Error("Day 5's Buffer Time is no longer the one line the build expects");
  return "";
},
// Day 5's Attorney Calendar Management Activity: the activity's own text, its Instructions as two cards and its ten
// Activity Items as ten cards (calItems), under each Calendar Simulator's link (CAL_HEAD); then the samples, the time zone card
// and the 📅 Calendar Activity Check (no screenshots are taken or uploaded: the guide's whole-calendar screenshot and
// 19-screenshot upload are off the slide), ending on its Time Zone & Submit slide (the activity is submitted on the Main Portal's Calendaring Activity calendar).
// ROWS[5].s3 cuts it into s3 (the Instructions), s3i–s3l (the cards 1–4, 5–7, 8 alone, 9–10) and s3b (from the second trainer slot).
s3: html => {
  const cut = (from, to) => { const i = html.indexOf(from), j = to ? html.indexOf(to, i) : html.length; if(i < 0 || j < 0) throw new Error("Day 5's Attorney Calendar Management Activity is no longer where the build looks for it: " + from); return html.slice(i, j); };
  // the activity itself and its samples folder show in the slide (data-embed, js/ft-day-decks.js visual), under the instruction
  const act = [["1VNgbFDn3PgkPwkE6g0PwXYxo-7DmU3MP", "The Attorney Calendar Management Activity"], ["1lLquhtY5XQd85X5IEXJcRCkpV39UA8wW", "Samples"]]
    .reduce((h, [id, t]) => { const re = new RegExp(`<a class="viewer-link"([^>]*?) data-title="[^"]*"(?=[^>]*${id})`); if(!re.test(h)) throw new Error(`Day 5's activity lost the link ${id}`);
      return h.replace(re, `<a class="viewer-link" data-embed$1 data-title="${t}"`); }, cut("<p>Please answer the Attorney Calendar", '<div class="trainer-slot" data-slot="5:s3-2">'))
    // (the activity's own file is not on the slide: its items are the cards before it, s3i–s3l)
    .replace(/<p><a class="viewer-link" data-embed[^>]*1VNgbFDn3PgkPwkE6g0PwXYxo-7DmU3MP[^\n]*?<\/p>\n?/, "")
    // (the Samples: a finished event, Deposition Meeting, drawn on the slide itself as Day 6's sample event is (DEPOSITION_EV),
    // under its heading; not the Drive folder, which asks a trainee for access)
    // (the heading and the drawn event are one block, ftdd-keep: one page, scaled to fit a short screen)
    .replace(/<p>Samples<\/p>\n?/, "")
    .replace(/<p><a class="viewer-link" data-embed[^>]*1lLquhtY5XQd85X5IEXJcRCkpV39UA8wW[^\n]*?<\/p>/, '<div class="ftdd-keep"><p><b>Sample: a finished event should follow this structure:</b></p>\n' + DEPOSITION_EV + "</div>");
  if(!act.includes("ftdd-ev-dep") || !act.includes("Sample: a finished event")) throw new Error("Day 5's Samples are no longer where the build looks for them");
  const tz = cut("<p>REMINDER! Set the appropriate time zone", "<p>When taking a screenshot of the entire calendar");
  const card = (ic, h, body) => `<div class="ftdd-card4"><p class="ftdd-card4-h">${ic} ${h}</p>${body}</div>`;
  // the guide's two pictures, drawn as the slide's own (sharp at any size, readable): the event editor with its time zone
  // boxed (image28) and the 19 screenshots in their order (image40)
  const shot = f => new RegExp(`<div class="shots"><figure><a href="/ft/day5/img/${f}"[\\s\\S]*?</figure></div>\\n?`);
  if(!shot("image28.png").test(tz)) throw new Error("Day 5's sample pictures are no longer where the build looks for them");
  // (drawn as Day 6's sample event: the date, time and time zone boxed in red, the time zone highlighted)
  const editor = '<div class="ftdd-ev" role="img" aria-label="Sample: the event editor, Recorded Statement Meeting, Feb 6, 2025, 2:00pm to 3:00pm, time zone (GMT-05:00) Central Time - Chicago">' +
    '<div class="ftdd-ev-top"><span class="ftdd-ev-x">✕</span><span class="ftdd-ev-title">Recorded Statement Meeting</span><span class="ftdd-ev-save">Save</span></div>' +
    '<div class="ftdd-ev-when"><span class="ftdd-ev-f">Feb 6, 2025</span><span class="ftdd-ev-f">2:00pm</span><span>to</span><span class="ftdd-ev-f">3:00pm</span><span class="ftdd-ev-f">Feb 6, 2025</span>' +
    '<span>(GMT-05:00) <span class="ftdd-ev-hl">Central Time - Chicago</span></span><span class="ftdd-ev-link">Time zone</span></div></div>\n' +
    '<p class="ftdd-gcal-cap">The time zone, boxed in red: set it before you save.</p>\n';
  // 📅 the Calendar Activity Check (js/ft-calcheck.js): the trainee enters what each event holds and
  // it is checked against the activity's answer key; the tile does nothing where that module isn't loaded
  // (and beside it, the activity on the Main Portal's Google Calendar Simulator: CALSIM_PORTAL)
  const check = '<div class="ftdd-tiles"><button type="button" class="ftdd-tile k-interactive" onclick="window.FTCalCheck ? goto(\'calcheck\') : 0"><span class="ftdd-tile-ic">📅</span>' +
    '<span class="ftdd-tile-t"><b>Calendar Activity Check</b><small>Check each event against the activity before you submit →</small></span></button>' +
    `<button type="button" class="ftdd-tile ftdd-simbtn k-video" title="Opens on the Main Portal’s Google Calendar Simulator, in its own tab" onclick="window.ftsCalsim ? ftsCalsim('${CALSIM_PORTAL.track}') : goto('simulators')"><span class="ftdd-tile-ic">📅</span>` +
    `<span class="ftdd-tile-t"><b>${hx(CALSIM_PORTAL.label.replace(/^📅 /, ""))}</b><small>The activity on the Main Portal’s Google Calendar Simulator ↗</small></span></button></div>\n`;
  // after the items: the activity and the samples themselves, full size, then the time zone card and the Check one under the other (not a
  // grid), so a long one turns the page cleanly
  const lead = act.match(/^<p>[\s\S]*?<\/p>\n?/)[0];
  // (the activity's Instructions on one slide, as two cards side by side, in bold: 1–5 and 6–9, so the two end level; its ten Activity Items on the next
  // four, sixteen cards: calItems. The "1. The activity" card is off: Done is at the end of the slides)
  const text = calActivity(), at = text.indexOf("<h3>Activity Items</h3>\n"), six = text.indexOf('<p class="li" style="--lvl:0"><span class="lbl">6.</span>');
  if(at < 0 || six < 0 || six > at) throw new Error("Day 5's activity text is no longer cut where the build expects");
  return '<div class="trainer-slot" data-slot="5:s3-1"></div>\n' +
    '<div class="ftdd-cards2 ftdd-cards2-b">' + card("📋", "Instructions 1–5", text.slice(0, six).replace("<h3>Instructions</h3>\n", "")) + card("📋", "Instructions 6–9", text.slice(six, at)) + "</div>\n" +
    // (under the Instructions, the link to the activity's simulator: the Main Portal's Calendaring Activity calendar, in its own tab)
    `<div class="ftdd-calsim ftdd-calsim-ins" data-calsim-activity="5:s3-ins">${calsimPortal("btn btn-navy")}</div>\n` +
    calItems(text.slice(at + "<h3>Activity Items</h3>\n".length)) +
    '<div class="trainer-slot" data-slot="5:s3-2"></div>\n' + act.slice(lead.length) + card("🕒", "2. Set the time zone", tz.replace(shot("image28.png"), editor)
      .replace(/ BEFORE saving each appointment, make sure to take a screenshot to capture the correct time zone, as shown in the sample below\./, " Check it BEFORE saving each appointment, as shown in the sample below.")) + "\n" +
    cut("<p><b><i>*** Free Communication");
}},
// Day 3, in the guide's two parts. Part 1: the Call Listening Sessions, the sample recordings and SOP as links (a new tab,
// not the viewer). The discussion itself is the lesson deck, opened from the card's 💬 Classroom Discussion stop (▶ Start
// Training, as on Days 1 and 2), whose Next is ✍️ the Process Questions (named by the convention beside 📄 Save PDF to my
// Folder), so neither the Process Questions note nor its naming convention is on the slide. The Confidentiality exercise
// is off the deck, and so are Carlos's recordings (the Harbor & Pine practice calls replace them): the Reception
// Listening Activity (the PI practice calls) is on two slides of its own (s1c, s1d), then the optional Listening Activity (s1b). (ROWS[3].s1 places them as their card rows' slides)
3: {s1: html => {
  const cut = (from, to) => { const i = html.indexOf(from), j = to ? html.indexOf(to, i + 1) : html.length; if(i < 0 || j < 0) throw new Error(`Day 3's slide no longer has "${from}"`); return html.slice(i, j); };
  const shots = cut('<div class="shots"><figure><a href="/ft/day3/img/image12.png"', '<p class="li" style="--lvl:0"><span class="lbl">3.</span>');
  // (the Confidentiality exercise and Carlos's recordings are off the deck)
  // (Frontline Management: the call-handling decision trees drawn on the slide, two to a row, in place of the guide's two
  // screenshots (the Authorization and Payment Calls trees), with the PI firm's other frontline calls beside them (TREES);
  // then the Sample SOP's four pages as screenshots (ft/day3/img/sample-sop-N.png, each opening bigger in the slide's
  // picture viewer: js/ft-day-decks.js ftdd-sop), with one big link to the document and a ⬇ Download of it (as Word). The sample
  // call recordings are the 🎧 Call Listening slide's, a card each: js/ft-day-decks.js LISTEN_CARDS)
  if(!/image12\.png/.test(shots) || !/image17\.png/.test(shots)) throw new Error("Day 3's decision tree screenshots are no longer where the build looks for them");
  const SOP_ID = "1zgK-4uKhdJkUvfOkb9A1Jp73C2wu_UOm", SOP = `https://docs.google.com/document/d/${SOP_ID}/edit?usp=drive_link`;
  const sopShots = [1, 2, 3, 4].map(n => `<figure><a href="/ft/day3/img/sample-sop-${n}.png" target="_blank" title="Page ${n}: click to see it bigger">` +
    `<img src="/ft/day3/img/sample-sop-${n}.png" alt="Sample SOP, page ${n}" loading="lazy"></a><figcaption>Page ${n}</figcaption></figure>`).join("");
  return '<div class="trainer-slot" data-slot="3:s1-1"></div>\n<div class="trainer-slot" data-slot="3:s1-2"></div>\n<div class="trainer-slot" data-slot="3:s1-3"></div>\n' +
    '<div class="trainer-slot" data-slot="3:s1-4"></div>\n' + TREES_HTML +
    // (the SOP is a slide of its own, ROWS[3]: SOP_AT)
    `<div class="ftdd-sop"><div class="ftdd-sop-shots">${sopShots}</div>\n` +
    `<div class="ftdd-tiles ftdd-sop-links"><a class="viewer-link ftdd-sop-open" data-kind="doc" data-title="Sample SOP" href="${SOP}"><span>📄</span><b>Sample SOP</b></a>` +
    `<a class="ftdd-sop-dl" href="https://docs.google.com/document/d/${SOP_ID}/export?format=docx" target="_blank" rel="noopener noreferrer" download>⬇ Download</a></div></div>\n`;
},
// Day 3's homework: the five CRM/CMS videos on one slide, each named for its CMS, as small cards with the video's preview
// (data-card: js/ft-day-decks.js visual), a click playing it in the pop-up viewer: the trainee chooses one to watch now and
// watches the rest in idle time
s2: html => {
  // (in the curriculum's order: the first video is Captora's, as its preview shows)
  const NAMES = ["Captora", "Clio Grow", "Clio", "Filevine", "Smart Advocate"];
  let k = 0;
  const out = html.replace(/<p><a class="viewer-link" data-kind="video" data-title="[^"]*"/g, () => `<p><a class="viewer-link" data-card data-kind="video" data-title="${NAMES[k++] || "CRM/CMS Training Video " + k}"`);
  if(k !== 5) throw new Error(`Day 3's homework has ${k} CRM/CMS videos, not 5`);
  // (a comma after a link reads as part of its address when copied: build/days/day03.js has none)
  if(/<\/a>\s*,/.test(out)) throw new Error("Day 3's CRM/CMS video links are followed by a comma again");
  // (its opening line, watch the videos and update item #12, goes: the slide's pill says Watch & Do)
  const mon = /<p>Please watch the CRM\/CMS training videos and then update item #12 in your Monitoring Sheet\. Thank you\.<\/p>\n?/;
  if(!mon.test(out)) throw new Error("Day 3's homework monitoring sheet line is no longer where the build looks for it");
  return out.replace(mon, "")
    .replace(/^/, "<p class=\"ftdd-pick-note\"><b>Choose one video and watch it now.</b> Watch the rest during your idle time.</p>\n")
    .replace(/(<p><b><i>\*\*\* Free Communication)/, "<p class=\"ftdd-pick-foot\"><b>Note:</b> If not finished during the workshift, you may go back to it later during your idle time.</p>\n$1");
}},
// Day 4 (Receptionist Training, Part 2): Julio's video in the slide (the Monitoring Sheet update is its own slide, ROWS[4].s2); the mock call
// preparation with direct links to the Call Simulator, the Ring Channel and the CMS, and how to use them; how the
// one-on-one mock calls run and are scored (the metrics); then the mock calls themselves (s3, with Done: js/ft-buffer.js)
// (ROWS[4].s2 cuts it into its card rows' slides: s2 and the Monitoring Sheet's s2m, then s2b, read in pages)
// Day 7: its classroom discussion's slide is off (it held only the trainer's notes and the Knowledge Base list, noKB): the
// section starts at the Intake Scenario Exercise, which goes too (no exercises on the decks), so Day 7 has no s1
7: {s1: html => { const i = html.indexOf("<p><b>Intake Scenario Exercise</b></p>"); if(i < 0) throw new Error("Day 7's Intake Scenario Exercise is no longer where the build looks for it"); return html.slice(i); }},
4: {s2: html => {
  if(!/1G5o0O1fTWjUzxrxIBH1ikbbmh4ywFt5C/.test(html)) throw new Error("Day 4 lost Julio's video");
  return '<p><a class="viewer-link" data-embed data-kind="video" data-title="Reception Training with Julio [1:49:49]" href="https://drive.google.com/file/d/1G5o0O1fTWjUzxrxIBH1ikbbmh4ywFt5C/view?usp=sharing">https://drive.google.com/file/d/1G5o0O1fTWjUzxrxIBH1ikbbmh4ywFt5C/view?usp=sharing</a></p>\n' +
    '<hr class="stars">\n<div class="trainer-slot" data-slot="4:s2-1"></div>\n' +
    mockPrep("<p>Get ready for this afternoon’s one-on-one mock call: practise on the Call Simulator, then take the call on the Ring Channel with the case files in the CMS.</p>\n") + MOCK_RUN;
},
// Day 4's mock calls: the metrics are on the slide before (how the calls run and are scored); the slide is only the
// trainee's "Hit Done when you are done with your Mock Call" and Done (js/ft-buffer.js ACTS["4:s3"], simple)
s3: html => {
  const out = html.replace(/<p><b>Reception Mock Calls Metrics<\/b><\/p>\n?<div class="shots"><figure><a href="\/ft\/day4\/img\/image7\.png"[\s\S]*?<\/div>\n?/, "");
  if(out === html) throw new Error("Day 4's mock call metrics are no longer where the build looks for them");
  return out;
}},
// Day 6 (Calendaring, Part 2): s2, the Mock Call Scenarios, is the guide's wording as text and lists (it came through as a
// heading per line), with what the trainee should do and the guide's Possible Scenarios / Nature of Request (each title and its notes). s1: the three training videos play in the slide; the Loom references stay links; the guide's
// sample event (image33) is drawn as the slide's own: "An optimized calendar schedule should follow this structure"
6: {s1: html => {
  let out = html.replace("<p>While waiting for your turn to perform, kindly watch the following training videos. Thank you.</p>", "<p>While waiting for your turn to perform, watch the following training videos.</p>");
  [["16zrBv2IsafvW0CphoJHf41JgvZZxcGa5", "Part 1", "Calendar Management Training: Part 1"], ["1jzhsqPS3pFS_PWK-c9m63wVs--OjtY7o", "Part 2", "Calendar Management Training: Part 2"],
   ["1X9l-70zK3G4JjL_JSBTfHiDVcwzjOUmX", "Calendaring 101", "Calendaring 101"]].forEach(([id, label, t]) => {
    const re = new RegExp(`<p><b>${label}\\s*</b></p>\\n<p><a class="viewer-link" data-kind="doc" data-title="[^"]*"(?=[^>]*${id})`);
    if(!re.test(out)) throw new Error(`Day 6 lost the video ${label}`);
    out = out.replace(re, `<p><a class="viewer-link" data-embed data-kind="video" data-title="${t}"`);
  });
  // (the first video beside the line that introduces it: the line on the left, the video bigger on the right, ftdd-lead2)
  const lead2 = /(<p>While waiting for your turn to perform, watch the following training videos\.<\/p>)\n(<p><a class="viewer-link" data-embed data-kind="video" data-title="Calendar Management Training: Part 1"[^\n]*<\/p>)\n/;
  if(!lead2.test(out)) throw new Error("Day 6's videos no longer open on the line the build looks for");
  out = out.replace(lead2, '<div class="ftdd-lead2">$1\n$2\n</div>\n');
  // (Part 2 and Calendaring 101 side by side, as big as the page lets them be: ftdd-vid2)
  const two = /(<p><a class="viewer-link" data-embed data-kind="video" data-title="Calendar Management Training: Part 2"[^\n]*<\/p>)\n(<p><a class="viewer-link" data-embed data-kind="video" data-title="Calendaring 101"[^\n]*<\/p>)\n/;
  if(!two.test(out)) throw new Error("Day 6's Part 2 and Calendaring 101 are no longer where the build looks for them");
  out = out.replace(two, '<div class="ftdd-vid2">$1\n$2\n</div>\n');
  // (the Loom references: no row of stars or "Refer to these video links" line; each is "📚 Additional Video Reference" on the
  // left and the video, bigger, on the right, as Part 1 is)
  const refs = /<hr class="stars">\n<p>Refer to these video links as well for your additional reference\. <\/p>\n<p><b>Scheduling Appointment and Calendar Management <\/b><\/p>\n(<p><a class="viewer-link" data-kind="video" data-title="Scheduling Appointment and Calendar Management"[^\n]*<\/p>)\n<p><b>Resource for Scheduling Appointment and Calendar Management <\/b><\/p>\n(<p><a class="viewer-link" data-kind="video" data-title="Resource for Scheduling Appointment and Calendar Management"[^\n]*<\/p>)\n/;
  if(!refs.test(out)) throw new Error("Day 6's Loom references are no longer where the build looks for them");
  // (the label is a div, not a line: a short line just before a link would name the video, js/ft-day-decks.js visual)
  const ref = v => `<div class="ftdd-lead2"><div class="ftdd-lead2-l">📚 Additional Video Reference</div>\n${v}\n</div>\n`;
  out = out.replace(refs, (m, a, b) => ref(a) + ref(b));
  const sample = /<p><b>For example: Client Consultation Meeting – \[Client Name\]<\/b><\/p>\n<p>Please see the sample below for your reference\. Please be guided\. Thank you\.<\/p>\n<div class="shots"><figure><a href="\/ft\/day6\/img\/image33\.png"[\s\S]*?<\/figure><\/div>\n?/;
  if(!sample.test(out)) throw new Error("Day 6's sample event is no longer where the build looks for it");
  const chk = on => `<span class="ftdd-ev-box${on ? " on" : ""}">${on ? "✓" : ""}</span>`;
  const ev = '<div class="ftdd-ev" role="img" aria-label="Sample event: Client Consultation Meeting - Martin Anthony Gan, Aug 11, 2026, 3:00pm to 4:00pm, (GMT-07:00) Pacific Time - Los Angeles; Google Meet; notification 15 minutes before; Client Meetings calendar; guests Michelle Velarde (organizer) and Martin Anthony Gan; notes in the description">' +
    '<div class="ftdd-ev-top"><span class="ftdd-ev-x">✕</span><span class="ftdd-ev-title">Client Consultation Meeting - <span class="ftdd-ev-mark">Martin Anthony Gan</span></span><span class="ftdd-ev-note">◀ Client’s Name</span><span class="ftdd-ev-save">Save</span></div>' +
    '<div class="ftdd-ev-when"><span class="ftdd-ev-f">Aug 11, 2026</span><span class="ftdd-ev-f">3:00pm</span><span>to</span><span class="ftdd-ev-f">4:00pm</span><span class="ftdd-ev-f">Aug 11, 2026</span><span>(GMT-07:00) <span class="ftdd-ev-hl">Pacific Time - Los Angeles</span></span><span class="ftdd-ev-link">Time zone</span></div>' +
    `<div class="ftdd-ev-sub">${chk(false)} All day <span class="ftdd-ev-f">Does not repeat ▾</span></div>` +
    '<div class="ftdd-ev-body"><div class="ftdd-ev-main"><div class="ftdd-ev-tabs"><b>Event details</b><span>Find a time</span></div>' +
    '<div class="ftdd-ev-line">🎥 <span class="ftdd-ev-link">Join with Google Meet</span> <small>meet.google.com/dyt-voan-kta</small></div>' +
    '<div class="ftdd-ev-line">📍 <span class="ftdd-ev-f wide">meet.google.com/dyt-voan-kta</span></div>' +
    '<div class="ftdd-ev-line">🔔 <span class="ftdd-ev-f">Notification ▾</span><span class="ftdd-ev-f">15</span><span class="ftdd-ev-f">minutes ▾</span></div>' +
    '<div class="ftdd-ev-line">📅 <span class="ftdd-ev-f">Michelle Velarde ▾</span><span class="ftdd-ev-f"><span class="ftdd-ev-dot"></span> Client Meetings ▾</span></div>' +
    '<div class="ftdd-ev-line">💼 <span class="ftdd-ev-f">Busy ▾</span><span class="ftdd-ev-f">Default visibility ▾</span></div>' +
    '<div class="ftdd-ev-desc"><ol><li>Review contract documents prior to the consultation.</li><li>Review the client’s observations, concerns, and instructions regarding the contract.</li><li>Be prepared to discuss the contract and address the client’s questions or concerns during the GMeet consultation.</li></ol></div></div>' +
    '<div class="ftdd-ev-side"><div class="ftdd-ev-tabs"><b>Guests</b><span>Suggested times</span></div><div class="ftdd-ev-f wide">Add guests</div>' +
    '<div class="ftdd-ev-guest"><span class="ftdd-ev-av">M</span><span><b>Michelle Velarde</b><small>Organizer</small></span></div><div class="ftdd-ev-guest"><span class="ftdd-ev-av">M</span><span><b>Martin Anthony Gan</b></span></div>' +
    `<p class="ftdd-ev-perm">Guest permissions</p><div>${chk(false)} Modify event</div><div>${chk(true)} Invite others</div><div>${chk(true)} See guest list</div></div></div></div>\n`;
  // ☎ the mock calls: how to reach the Call Simulator (the Ring Channel) and practise on the Calendaring Tool, before the reminders
  // (the three links are buttons in one row, ftdd-linkbtns: a new tab each; the six steps two to a row, ftdd-steps2, so the
  // links, the steps and the reminders are one page; the sample event is the next: ftdd-pgbreak)
  const sim = "https://cm-training-activity.pages.dev/simulators/", lnk = (label, url) => `<a class="ftdd-linkbtn" href="${url}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
  // (the heading, the buttons, the steps and the reminders are one block, ftdd-one: one page, scaled to fit a short screen)
  const mock = '<div class="ftdd-one"><p><b>☎ Mock Calls: how to access the Call Simulator (Ring Channel) and practise on the Calendaring Tool</b></p>\n' +
    '<div class="ftdd-linkbtns">' + lnk("📞 Practice a caller: the Call Simulator’s Calendar Management line (an AI caller)", sim + "call.html?program=FT&line=Calendar+Management+Mock+Calls") +
    lnk("☎ The Ring Channel: the training phone your mock call rings on", sim + "call.html?program=FT") +
    // (no link to the mock calls' calendar on the deck: the trainer runs the mock calls)
    "</div>\n" +
    '<div class="ftdd-steps2">\n' +
    "<p>Step 1 - Open the Call Simulator’s Calendar Management line and put your headset on. Take practice calls from the AI caller as often as you like: practice calls are not graded.</p>\n" +
    "<p>Step 2 - On each call, collect the minimum information: the caller’s name, callback number, date of birth (DOB) and date of loss (DOL).</p>\n" +
    "<p>Step 3 - Clarify the meeting type (phone, video or in-person) and check the attorney’s rules (the Mock Call Scenarios slide) before you offer a time; offer 2–3 alternatives when the requested slot is unavailable.</p>\n" +
    "<p>Step 4 - Book the appointment on the Calendaring Tool (the Google Calendar Simulator), in the EST time zone, with a specific title (e.g. Client Consultation Meeting – [Client Name]), the notes, and an email reminder a day before.</p>\n" +
    "<p>Step 5 - Run the Calendaring Tool’s automated review and fix what it flags.</p>\n" +
    "<p>Step 6 - When it’s your turn, log in to the Ring Channel and stay on standby: your trainer calls you for your one-on-one mock call, scored on the metrics on the next slide.</p>\n</div>\n";
  out = out.replace(/(<p>Reminders:<\/p>)/, mock + "$1");
  if(!out.includes("☎ Mock Calls: how to access")) throw new Error("Day 6's reminders are no longer where the build looks for them");
  // (the reminders' two screenshot bullets are off: the mock calls are booked on the Google Calendar Simulator, so there is
  // no screenshot to take, number or upload. "Make sure to be specific with your event titles." stays)
  const shotsRe = /<p class="li" style="--lvl:0"><span class="lbl">•<\/span><span>No need to submit a separate screenshot for your time zone\.[^<]*<\/span><\/p>\n<p class="li" style="--lvl:0"><span class="lbl">•<\/span><span>Please follow the proper screenshot numbering[^<]*<\/span><\/p>\n/;
  if(!shotsRe.test(out)) throw new Error("Day 6's screenshot reminders are no longer where the build looks for them");
  out = out.replace(shotsRe, "");
  return out.replace(/<p>@everyone\s*<\/p>\n?/, "").replace(sample, '</div>\n<div class="ftdd-pgbreak"></div>\n<div class="ftdd-one ftdd-one-ev"><p><b>An optimized calendar schedule should follow this structure:</b></p>\n' + ev + "</div>\n");
},
s2: html => {
  if(!/data-slot="6:s2-1"/.test(html) || !/data-slot="6:s2-2"/.test(html) || !/Free Communication Upskill/.test(html)) throw new Error("Day 6's Mock Call Scenarios are no longer where the build looks for them");
  const ul = xs => "<ul>" + xs.map(x => `<li>${x}</li>`).join("") + "</ul>\n";
  // (the slide in cards: Trainee should and the Minimum Information side by side, then the Scheduling Rules and the Additional
  // Notes. The guide's Possible Scenarios / Nature of Request are the trainer's guide for the mock calls: off the slide, in a
  // sheet the trainer opens over it (template.ftdd-tsheet: js/ft-day-decks.js shows its button on the trainer's deck only))
  const card = (ic, h, body) => `<div class="ftdd-card4"><p class="ftdd-card4-h">${ic} ${h}</p>${body}</div>`;
  const scenarios = [
      ["Client Consultation: New PI Case", "New PI case; (instructions provided by client)"],
      ["Document Review Follow-Up", "Review contract documents; Zoom meeting; (observations and instructions)"],
      ["Case Strategy Meeting", "Litigation planning; (observations and instructions)"],
      ["New Intake Consultation", "New intake consultation"],
      ["Deposition Preparation", "Preparation for deposition"],
      ["Medical Records Review", "Review new PT notes"],
      ["Attorney Phone Consultation", "Clarification regarding demand"],
      ["Document Signing", "Settlement documents; in-office meeting"],
      ["Case Review Consultation", "Possible wrongful termination"],
      ["Post-Settlement Meeting", "Ensure full breakdown is available"],
      ["Discovery Conference", "Review interrogatories &amp; RFPs"],
      ["Follow-Up Call (Existing Client)", "Existing PI client; follow-up on insurance update"],
      ["Missed Call Consultation", "Contract dispute"],
      ["Case Status Update", "Insurance update ready for review"],
      ["Urgent Meeting Request", "Urgent litigation update"],
      ["Mediation Preparation Call", "Review mediation materials"]];
  return '<div class="trainer-slot" data-slot="6:s2-1"></div>\n' +
    "<p>This activity reinforces proper calendar management through mock calls based on common scheduling scenarios handled by the firm. Trainees will respond to simulated inbound calls involving consultations, follow-ups, case meetings, document signings, and urgent attorney requests.</p>\n" +
    '<div class="ftdd-cards2">' + card("🎯", "Trainee should:", ul(["Accurately schedule appointments by confirming availability, meeting type, duration, and format (phone, video, or in-office).",
      "Create complete and accurate calendar entries, including appropriate titles and detailed notes reflecting case context and caller demeanor.",
      "Follow proper call flow and maintain professionalism, adapting to different caller tones (easy, anxious, irritated, impatient, or emotional).",
      "Set reminders accordingly for the attorney to be reminded."])) +
    card("📋", "Minimum Information to Collect from Caller", "<p>Please take note of the following guidelines. VA must obtain:</p>\n" + ul(["Name", "Callback Number", "Date of Birth (DOB)", "Date of Loss (DOL)"])) + "</div>\n" +
    '<template class="ftdd-tsheet" data-title="📌 Possible Scenarios / Nature of Request (to be calendared)">' +
      scenarios.map(([t, n]) => `<div class="ftdd-tsheet-card"><b>${t} – (Client Name)</b><span>Notes: ${n}</span></div>`).join("") + "</template>\n" +
    '<div class="ftdd-cards2">' + card("✅", "Scheduling Rules", ul(["Identify available slots only", "Avoid lunch, buffer time, and blocked events", "Offer 2–3 alternative times when a requested slot is unavailable",
      "Clarify meeting type (phone, video, or in-person)", "Plot the appointment in the attorney’s calendar.", "Calendar should be in EST time zone.", "Set an email reminder a day before the event."])) +
    card("📌", "Additional Notes", ul(["The attorney does not take new client consults after 5:00 PM.", "New client consults are only scheduled on Tuesdays and Thursdays.",
      "The attorney accepts max 3 new client consults per day.", "Phone consults, status updates, follow up calls, review, regular and urgent meetings, and signing meetings are max 30 minutes.",
      "Follow-ups are not scheduled during mornings.", "All consultation meetings are phone consults only.",
      "Phone consults only between 9:30 AM – 3:00 PM; Attorney will call the client - VA must confirm callback number.", "Preparation, strategy, and settlement meetings are max 45 minutes.",
      "Conference meetings are max 1 hour.", "Attorney requires 15-minute buffer before and after every meeting.", "Same-day bookings require attorney approval."])) + "</div>\n" +
    '<div class="trainer-slot" data-slot="6:s2-2"></div>\n<p><b><i>*** Free Communication Upskill for 1 or 1 ½ hours</i></b></p>\n';
}},
// Day 8's PM is a 🧑‍🏫 Trainer Facilitated Demo: the guide's Facilitator's Notes (the tasks posted for both SA training
// accounts, the sample task, the files checked first, the 10–15 minutes in SA) came through as slide text; they go to the
// trainer's own slot (8:dd-demo, DEMO_NOTE), and the slide says, in the trainee's words, how the demo runs, what to have
// ready and the guide's Additional Reminder for Trainees, before its Facilitator's Guide (8:s3-1) and the Demo Metrics
// Day 8's Topic 1 (Intake Process): the guide's lines as three numbered steps; its two videos as cards side by side (their
// preview, a click playing it bigger in the pop-up viewer: data-card, js/ft-day-decks.js visual); the item #15 update
// opening the trainee's own Monitoring Sheet; then the Knowledge Base articles in a card of their own (off the decks for now,
// as every Knowledge Base box is). Topic 2's naming-convention reference sits between its steps 3 and 4
8: {s1: html => {
  const lead = /<p>After completing your spelling &amp; typing tests, kindly proceed right away to work on these sets of tasks for today’s training session\.\s*Thank you\.<\/p>\n/;
  const task1 = /<p>Task 1 - Please watch these two videos:<\/p>\n<p>A\. Intake Process Overview<\/p>\n(<p><a class="viewer-link" data-kind="video"[^\n]*<\/p>)\n<p>B\. Saving intake documents and updating fields in the Intake Tab<\/p>\n(<p><a class="viewer-link" data-kind="video"[^\n]*<\/p>)\n<p>Task 2 - Update item #15 in your monitoring sheet\.<\/p>\n/;
  const kb = /<h4>📚 In the Knowledge Base<\/h4>\n([^]*?)(?=<p><b>Topic 2:|$)/;
  // (the naming-convention reference, under step 2 in the day file, goes between steps 3 and 4; the line over it is dropped)
  const naming = /(<p>Please don’t forget to rename each extracted document[^\n]*<\/p>)\n(<p><a class="viewer-link" data-embed data-fit data-kind="doc" data-title="Naming convention reference \(PDF\)"[^\n]*<\/p>)\n(<div class="ftdd-step"><span class="ftdd-step-n">3<\/span>[^\n]*\n<p>Note: For your completed Intake Worksheet[^\n]*<\/p>)\n(<div class="ftdd-step ftdd-step-check"><span class="ftdd-step-n">4<\/span>)/;
  if(!lead.test(html) || !task1.test(html) || !kb.test(html) || !naming.test(html)) throw new Error("Day 8's Topic 1 and 2 are no longer where the build looks for them");
  const cardOf = v => v.replace('<a class="viewer-link" data-kind="video"', '<a class="viewer-link" data-card data-kind="video"');
  const mon = `<a href="#/monitoring" class="ftdd-monlink" onclick="window.FTDrive ? FTDrive.openMonitor() : goto('monitoring'); return false;">📒 Monitoring Sheet</a>`;
  return html.replace(lead, "").replace(task1, (m, a, b) =>
      // (no numbered instructions over the videos: the two videos, then the Monitoring Sheet's item)
      `${cardOf(a)}\n${cardOf(b)}\n` +
      `<p>Update item #15 in your ${mon}.</p>\n`)
    .replace(kb, (m, links) => `<div class="ftdd-card4"><p class="ftdd-card4-h">📚 In the Knowledge Base</p>\n${links}</div>\n`)
    // (without the "Please don’t forget to rename…" line: the reference itself is what the trainee needs there)
    // (under step 3's note, the box the trainee submits their completed worksheet's link in: js/ft-intake.js .ftis-wsub)
    // (and the naming convention reference read on the slide, page by page, in place of its PDF embed: pdocHtml)
    .replace(naming, (m, line, link, step3, step4) => `${step3}\n<div class="ftis-wsub"></div>\n${pdocHtml(NAMING_DOC)}${step4}`);
},
s3: html => {
  const from = html.indexOf('<p class="li" style="--lvl:0"><span class="lbl">•</span><span>Since there are 2 training accounts used in SA');
  const to = html.indexOf('<div class="trainer-slot" data-slot="8:s3-1"></div>');
  if(from !== 0 || to < 0 || !/Give each trainee 10-15 minutes/.test(html.slice(from, to)) || !html.includes("Demo Metrics</b></p>")) throw new Error("Day 8's demo slide is no longer where the build looks for it");
  return DEMO_SLIDE + `<div class="trainer-slot" data-slot="8:dd-demo"></div>\n` + html.slice(to);
}},
// Day 2's first set of tasks: both videos and the reference sheet play in the slide (data-embed, js/ft-day-decks.js visual),
// and the note ends on ✅ Done (js/ft-buffer.js) instead of typing "done" in the GC; the assessments are split off after it
// Day 2's Buffer Time: its one line, for the pending Day 1 tasks (the guide's stray heading of the next task and its
// "proceed right away" go; the buffer's own instruction and ✅ Done are js/ft-buffer.js's)
2: {s1: html => {
  if(!/^<p>Carryover period for completing any pending tasks from the last session\.<\/p>/.test(html) || !/Kindly proceed right away/.test(html) || /trainer-slot/.test(html)) throw new Error("Day 2's Buffer Time is no longer where the build looks for it");
  return "<p>Carryover period for completing any pending Day 1 tasks.</p>\n";
},
s2: html => {
  const ids = [["1eErVAp_HkPPCnpQNJ63S3icIWMCbHi_D", "Common Terms Used"], ["1tmV26rq_1z1mpq1C5hUweLytfyJUtkai", "Common Terms Used: the reference sheet"],
    ["1K9AXO0XZJjGFXHPugLAbjeVgcC3fIZuE", "How Auto Liability Insurance Works"]];
  let out = html;
  // (the two videos without the name bar over them, data-bare: the slide's ribbon names them, so they play larger)
  ids.forEach(([id, t]) => { const re = new RegExp(`<a class="viewer-link"([^>]*?) data-title="[^"]*"(?=[^>]*${id})`); if(!re.test(out)) throw new Error(`Day 2's Common Terms slide lost the link ${id}`);
    out = out.replace(re, `<a class="viewer-link" data-embed${/1tmV26/.test(id) ? "" : " data-bare"}$1 data-title="${t}"`); });
  const note = /<p><b>Note:<\/b> As soon as you are done watching the videos, please type done here in our GC\.\s*Thank you\.<\/p>/;
  if(!note.test(out)) throw new Error("Day 2's Common Terms note is no longer where the build looks for it");
  out = out.replace(note, "<p><b>Note:</b> Hit ✅ Done below when you are.</p>").replace(/<hr class="stars">\n?(?=<div class="trainer-slot" data-slot="2:s2-1">)/, "");
  // the reference sheet shows only its columns TERM … LEARN MORE (data-crop: their width in the sheet's own pixels; its
  // REMARKS column and the blank space right of it are cut off), drawn the slide's full width and the page's full height,
  // on a page of its own: Task 2 starts the next page (ftdd-pgbreak, js/ft-day-decks.js sheetPages)
  const sheet = /<a class="viewer-link" data-embed(?=[^>]*1tmV26rq_1z1mpq1C5hUweLytfyJUtkai)/, task2 = /<p>Task 2 - Watch this video presentation about how auto liability insurance works/;
  if(!sheet.test(out) || !task2.test(out)) throw new Error("Day 2's reference sheet or its Task 2 is no longer where the build looks for it");
  out = out.replace(sheet, '<a class="viewer-link" data-embed data-crop="1272"').replace(task2, m => '<!--cut:al-->\n' + m);
  // the assessments are not on the slides: each video's Next opens its own, on a Knowledge Check page of its own
  // (js/ft-day-decks.js ASSESS_NEXT), whose way back goes on: Common Terms video → its assessment → the reference sheet
  // → the Auto Liability video → its assessment → the Assessments slide (s2b), which keeps the homework line and the
  // readings (its upload and next-day checking lines go). ROWS[2].s2 cuts the three slides at <!--cut:ref--> and
  // <!--cut:al-->: the Common Terms video, the reference sheet, the Auto Liability video
  const doc = (label, id) => { const re = new RegExp(`<p>${label}</p>\\n<p><a class="viewer-link" data-kind="doc" data-title="AS YOUR HOMEWORK"(?=[^>]*${id})[^]*?</p>\\n`);
    const m = out.match(re); if(!m) throw new Error(`Day 2's ${label} is no longer where the build looks for it`);
    out = out.replace(m[0], ""); };
  doc("Common Terms Used – Assessment", "14sz5f3HTQKmryc7Upvlc6qua008rPnmw"); doc("Auto Liability Insurance – Assessment", "11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C");
  const ctv = new RegExp(`<p><a class="viewer-link" data-embed data-bare data-kind="video"(?=[^>]*1eErVAp_HkPPCnpQNJ63S3icIWMCbHi_D)[^]*?</p>\\n`), m = out.match(ctv);
  if(!m) throw new Error("Day 2's Common Terms video is no longer where the build looks for it");
  out = out.replace(m[0], m[0] + "<!--cut:ref-->\n");
  const kindly = "kindly accomplish the following:", two = /<p class="li" style="--lvl:0"><span class="lbl">2\.<\/span><span>Please upload your completed assessments[^]*?<\/p>\n<p class="li" style="--lvl:0"><span class="lbl">3\.<\/span><span>Checking and feedback[^]*?<\/p>\n/;
  if(!out.includes(kindly) || !two.test(out) || !out.includes('<span class="lbl">4.</span>')) throw new Error("Day 2's assessment instructions are no longer where the build looks for them");
  out = out.replace(kindly, "kindly accomplish the <b>Common Terms Used – Assessment</b> and the <b>Auto Liability Insurance – Assessment</b>: each follows its video on the slide before, and both are on ✍️ Knowledge Check.")
    .replace(two, "").replace('<span class="lbl">4.</span>', '<span class="lbl">2.</span>');
  // the two videos play on the slide without the guide's lines that sent the trainee to them (the slide's pill says
  // Watch & Do: js/ft-day-decks.js kindOf)
  const intro = [/<p>Task 1 - Please go to this link to watch the video presentation on Common Terms Used<\/p>\n/,
    /<p>Task 2 - Watch this video presentation about how auto liability insurance works[^<]*<\/p>\n/];
  intro.forEach(re => { if(!re.test(out)) throw new Error("Day 2's Common Terms task lines are no longer where the build looks for them"); out = out.replace(re, ""); });
  // the monitoring sheet's update and its note go: the readings' panel says it, after the Auto Liability Insurance –
  // Assessment, in plain words, with 📤 Submit, which has the platform check and grade items #5–7 (js/ft-buffer.js ACTS["2:s2b"])
  const check = /<p>Task \d+ - Update items #5 -7 in your monitoring sheet\.<\/p>\n?/, done = /<p><b>Note:<\/b> Hit ✅ Done below when you are\.<\/p>\n?/;
  if(!check.test(out) || !done.test(out)) throw new Error("Day 2's monitoring sheet step or its note is no longer where the build looks for it");
  out = out.replace(check, "").replace(done, "");
  return out;
},
// Day 2's Homework: the handouts' 2026 version only (the old version's folder goes), shown in the slide large (its own
// name line goes: the task above names them); the Softphones video plays in the slide; the monitoring sheet's update is
// a line, not a numbered step, that opens 📒 Monitoring Sheet
s4: html => {
  if(!/<a class="viewer-link"(?=[^>]*15aa9GSp3DtOFCG2nQD4CgDPsljA1usQ2)/.test(html)) throw new Error("Day 2's Homework lost the Softphones video");
  html = html.replace(/<a class="viewer-link"([^>]*?) data-title="[^"]*"(?=[^>]*15aa9GSp3DtOFCG2nQD4CgDPsljA1usQ2)/, '<a class="viewer-link" data-embed data-bare$1 data-title="Softphones: the instructional video"');
  const out = html.replace(/<p>OLD VERSION<\/p>\n<p><a [^>]*1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y[^>]*>[^<]*<\/a> ?<\/p>\n?/, "")
    .replace(/<p>2026 VERSION<\/p>\n<p><a [^>]*(1-uB07Lu7nPeRpdDwOzvAKFMjZbXKQW-r)[^>]*>[^<]*<\/a> ?<\/p>/, (m, id) =>
      `<div class="ftdd-embed ftdd-embed-folder ftdd-embed-folder-strip"><iframe src="https://drive.google.com/embeddedfolderview?id=${id}#grid" title="The handouts (2026 version)" loading="lazy" scrolling="no"></iframe></div>`)
    // Task 2 and the three decks as one block, on one page (the decks a row of large thumbnails, no scrolling); the topic's
    // own line (Documents & Spreadsheets, Keyboard Shortcuts, and Shadowing Etiquette) goes: the slide's ribbon names them
    .replace(/<p><b>Topic: Documents &amp; Spreadsheets[^]*?<\/p>\n(<p>Task 2 – [^]*?<\/p>\n<div class="ftdd-embed ftdd-embed-folder[^]*?<\/iframe><\/div>)/, '<div class="ftdd-keep ftdd-hw-ppts">\n$1\n</div>');
  if(/OLD VERSION|1sR8tjpMXPGWJo9cldpNWFdPhtMgq4n-y/.test(out) || !/embeddedfolderview/.test(out) || !/ftdd-hw-ppts/.test(out)) throw new Error("Day 2's Homework handouts are no longer where the build looks for them");
  const mon = /<p>Task 3 - Update items #8-9 in your monitoring sheet\.<\/p>/;
  if(!mon.test(out)) throw new Error("Day 2's Homework monitoring sheet line is no longer where the build looks for it");
  // the Softphones video alone (no Task line over it, no name bar: data-bare), its Action in bold with a 📒 Monitoring Sheet
  // button and its Note at the video's lower right; no "outside training hours": it is a classroom activity
  const pin = /<p>📌To be accomplished outside training hours\. 📌<\/p>\n/, soft = /<p><b>Topic: Softphones<\/b><\/p>\n<p>Task 1 – Please follow this link to view the instructional video on Softphones\.[^<]*<\/p>\n(<p><a class="viewer-link"[^]*?<\/p>\n)/;
  if(!pin.test(out) || !soft.test(out)) throw new Error("Day 2's Softphones task is no longer where the build looks for it");
  // (the video on the left, the Action and its Note at its lower right: ftdd-soft, one block on one page)
  return out.replace(pin, "").replace(soft, (m, video) => `<div class="ftdd-soft ftdd-keep">\n` + video + `<div class="ftdd-soft-side">\n` +
      `<p><b>Action: Log your takeaways on your</b> <a class="btn btn-navy ftdd-mon-btn" href="#/monitoring" onclick="goto('monitoring'); return false;">📒 Monitoring Sheet</a></p>\n` +
      "<p><b>Note:</b> Finish the rest during your idle time for future client reference.</p>\n</div>\n</div>\n")
    .replace(mon, `<p>Update items #8–9 in your <a href="#/monitoring" onclick="goto('monitoring'); return false;">📒 Monitoring Sheet</a>.</p>`);
}}};
// 🎧 Reception Listening Activity, the PI practice calls (Day 3; replayed on Day 4 before the mock calls): five practice calls at the Practice Lab's
// Harbor & Pine Injury Law, each with a challenge on the line (road noise, a line that breaks up and drops, a Spanish-speaking
// caller, a speakerphone echo, a fast-talking adjuster in a loud call centre), played on the slide. The calls,
// their audio (ft/day3/audio/) and the trainer's key come from build/calls/pi_reception_calls.py, which writes
// build/calls/pi-reception-calls.json; this build turns that into the slides and the key's trainer-only slot (3:pi-calls).
const PI_CALLS = JSON.parse(fs.readFileSync(path.join(R, "build/calls/pi-reception-calls.json"), "utf8"));
// the activity's own calls (s1d, the trainer's key, the Word worksheet): the newer Harbor & Pine set, VA Oscar's five
// reception recordings redone as personal injury calls (a wrong birth year, a frustrated repeat caller, an unclear request,
// a short call, a ride that fell through), kept as made in build/calls/pi_reception_calls.py at d499bf1, audio
// ft/day3/audio/pi-activity-N.mp3. The calls with a challenge on the line (PI_CALLS) are the optional Listening Activity.
const ACT_CALLS = JSON.parse(fs.readFileSync(path.join(R, "build/calls/pi-reception-activity.json"), "utf8"));
const hx = x => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// a "link coming" or placeholder box
const ph = (cls, icon, title, body) => `<div class="ftdd-ph ${cls}"><span class="ftdd-ph-ic">${icon}</span><div><b>${title}</b><p>${body}</p></div></div>`;
const mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
// the calls, three cards to a row (each row is one block, so a page never splits a card)
function piCallRows(extra){
  const card = c => `<div class="ftdd-pic"><p class="ftdd-pic-h"><span class="ftdd-pic-n">${c.id}</span><span>${hx(c.title)}</span><span class="ftdd-pic-len">${mmss(c.secs)} · VA ${hx(c.va)}</span></p>` +
    // (no tags and no summary, as who called and the call's challenge are what the trainee works out and the answer sheet grades)
    `<audio class="ftdd-pic-audio" controls preload="none" src="${c.file}" title="Call ${c.id}: ${hx(c.title)}"></audio></div>`;
  const rows = [];
  // (extra: a last card after the calls, in the last row's free place: Day 3's 📝 Answer Sheet)
  const cards = ACT_CALLS.calls.map(card).concat(extra ? [extra] : []);
  for(let i = 0; i < cards.length; i += 3) rows.push(`<div class="ftdd-pic-row">${cards.slice(i, i + 3).join("")}</div>`);
  return rows.join("\n") + "\n";
}
/* 🎧 Day 3's supplementary reception recordings, optional (Carlos's are off it: the Harbor & Pine calls replace them): one card per recording, played in the
   slide (Drive's player). A recording is [its title, its Drive file id]; a group with no recordings listed yet shows its
   Drive folders instead, each a card with the folder's recordings to play. Add the recordings' links here as they come. */
const REF_RECS = [
  // (audio: recordings kept on the platform, ft/day3/audio, each a card that plays in a pop-up player: js/ft-day-decks.js
  // ftdd-acard; [title, file, length])
  // the PI Reception Activity's five calls (Harbor & Pine Injury Law, build/calls/pi_reception_calls.py): the same cards,
  // each with its challenge (piAudio: read from build/calls/pi-reception-calls.json once it is loaded, below)
  {h: "PI Reception Calls: Harbor & Pine Injury Law", folders: [], recs: [], pi: true},
  // (no recordings of VA Oscar's on the deck)
  ];
function REF_RECS_HTML(){
  const card = (h, src, link) => `<div class="ftdd-rec"><p class="ftdd-rec-h">${hx(h)}</p><div class="ftdd-rec-play"><iframe loading="lazy" title="${hx(h)}" src="${src}" allow="autoplay"></iframe></div>` +
    `<p class="ftdd-rec-go"><a href="${link}" target="_blank" rel="noopener noreferrer">Open in Drive ↗</a></p></div>`;
  // (a recording whose file id is in, recs: [title, id], is a card that plays it in the pop-up viewer when clicked, as Day 3's
  // CRM/CMS videos are, data-card: js/ft-day-decks.js visual; until then its folder plays in the slide)
  const rec = ([t, id]) => `<p><a class="viewer-link" data-card data-kind="video" data-title="${hx(t)}" href="https://drive.google.com/file/d/${id}/view">https://drive.google.com/file/d/${id}/view</a></p>\n`;
  const note = '<p class="ftdd-recs-note">These audio recordings are optional reference materials. Feel free to listen to them during your downtime or at your own pace—completing the entire series is not required.</p>\n';
  const acard = ([t, f, len, tag]) => `<button type="button" class="ftdd-acard" data-audio="${f.startsWith("/") ? f : "/ft/day3/audio/" + f}" data-title="${hx(t)}">` +
    `<span class="ftdd-acard-ic">🎧</span><b>${hx(t)}</b>${tag ? `<span class="ftdd-acard-tag">${hx(tag)}</span>` : ""}<small>${len} · ▶ Play</small></button>`;
  const mmss = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
  REF_RECS.filter(g => g.pi).forEach(g => { g.audio = PI_CALLS.calls.map(c => [c.title, c.file, mmss(c.secs), `${c.challenge} · VA ${c.va}`]); });
  // (a group's heading and its cards are one block, which the deck never splits over two pages)
  return REF_RECS.filter(g => !g.hide).map(g => (g.audio || []).length ? `<div class="ftdd-recgroup">\n<p><b>${hx(g.h)}</b></p>\n<div class="ftdd-acards">${g.audio.map(acard).join("")}</div>\n</div>\n` : `<p><b>${hx(g.h)}</b></p>\n` + (g.recs.length ? g.recs.map(rec).join("")
      : `<div class="ftdd-recs">` + g.folders.map((id, i) => card(`📁 ${g.h}${g.folders.length > 1 ? ` (folder ${i + 1})` : ""}`, `https://drive.google.com/embeddedfolderview?id=${id}#list`, `https://drive.google.com/drive/folders/${id}`)).join("") + "</div>\n")).join("") +
    note;
}
// the activity: Day 3's Reception Listening Activity row (ROWS[3].s1), on two slides:
// s1c, the task in cards (Listen, Analyze, Extract; the 5 data points; the call's challenge; the worksheet), then s1d,
// the five calls together, whose Next is the slide after them
const PI_H = "AM: Reception Listening Activity";
const PI_CALLS_H = "AM: Reception Listening Activity: the 5 Practice Calls";
const piStep = (n, ic, t, body) => `<div class="ftdd-cix"><p class="ftdd-cix-h"><span class="ftdd-pic-n">${n}</span><span>${ic} ${t}</span></p><p>${body}</p></div>`;
const PI_HTML =
  `<p class="ftdd-cix-lead">In this simulation exercise, you will listen to five fictional inbound phone calls to <b>${hx(ACT_CALLS.firm.replace(/\s*\(fictional\)$/, ""))}</b>, a personal injury law firm located in Tampa, Florida. Each scenario demonstrates a distinct challenge front-desk staff frequently encounter on the line, ranging from upset or injured callers to incomplete caller information.</p>\n` +
  `<div class="ftdd-cix-row">` +
  piStep(1, "🎧", "Listen", "Play each audio track carefully. You may pause, rewind, and replay each recording as many times as necessary.") +
  piStep(2, "🔍", "Analyze", "Identify the specific reception challenge and caller scenario presented in each recording.") +
  piStep(3, "📝", "Extract", "Capture the <b>5 required data points</b> for each caller and log them directly into your designated worksheet.") +
  `</div>\n` +
  `<div class="ftdd-cix-grid"><div class="ftdd-pic-points"><p class="ftdd-pic-points-h">📋 The 5 data points of every call</p><ol>` +
  `<li><b>Caller</b>: their name, and who they are (client, potential client, provider, adjuster, family …)</li>` +
  `<li><b>Callback number</b>: with the extension or best time, if given</li>` +
  `<li><b>Verified?</b>: how the VA verified the caller (name, DOB, date of the accident), or why nothing could be shared</li>` +
  `<li><b>Reason for the call</b>: the case and what they need</li>` +
  `<li><b>Action taken</b>: who it went to, and how (message, transfer, callback)</li></ol></div>` +
  `<div class="ftdd-pic-points"><p class="ftdd-pic-points-h">💭 Analyze the call’s challenge</p><p class="ftdd-cix-note">In the reflection section for each call, document:</p>` +
  `<div class="ftdd-cix-two"><div><b>🚧 The Obstacle</b>What made the call difficult? (e.g., emotional distress, missing details, language barriers, aggressive demeanor, or emergency legal deadlines)</div>` +
  `<div><b>🤝 The VA’s Response</b>How did the receptionist handle it? (e.g., active listening, de-escalation techniques, boundary setting, clarifying questions)</div></div></div></div>\n` +
  // the answers are logged on the activity's 📝 Answer Sheet, a pop-up over the deck (js/ft-listening.js "recact")
  `<div class="ftdd-tiles"><button type="button" class="ftdd-tile k-doc" onclick="FTListen.pop('recact')"><span class="ftdd-tile-ic">📝</span><span class="ftdd-tile-t"><b>Reception Listening Activity: Answer Sheet</b><small>Log each call’s 5 data points and its challenge →</small></span></button></div>\n`;
// the five calls on one slide (the trainer's key with them), and in the last row's free place the 📝 Answer Sheet, a pop-up
// over the deck to log each call and 📝 Submit for Grading (js/ft-listening.js FTListen.pop)
const PI_SHEET_CARD = `<button type="button" class="ftdd-pic ftdd-pic-sheet" onclick="FTListen.pop('recact')"><span class="ftdd-pic-sheet-ic">📝</span>` +
  `<b>Answer Sheet</b><small>Log each call’s 5 data points and its challenge, then 📝 Submit for Grading</small><span class="ftdd-pic-sheet-go">Open the answer sheet →</span></button>`;
const PI_CALLS_HTML =
  `<p>Play each call, then log its <b>5 data points</b> and its <b>challenge</b> (the obstacle and the VA’s response) in your 📝 Answer Sheet.</p>\n` +
  piCallRows(PI_SHEET_CARD) +
  `<div class="trainer-slot" data-slot="3:pi-calls"></div>\n`;
// the trainer's key (trainer view only): each call's 5 data points, what the VA did with the challenge, and the transcript
const PI_KEY = `<div class="facilitator"><h4>Facilitator’s Note: Reception Listening Activity: the 5 data points of each call</h4>\n` +
  ACT_CALLS.calls.map(c => `<p><b>Call ${c.id}: ${hx(c.title)}</b> (${hx(c.challenge)})</p>\n<ol>${c.key.map(x => `<li><b>${hx(x.k)}:</b> ${hx(x.v)}</li>`).join("")}</ol>\n` +
    `<p><i>The challenge:</i> ${hx(c.handled)}</p>\n<details><summary>Transcript</summary>${c.transcript.map(t => `<p>${t.who ? `<b>${hx(t.who)}:</b> ` : ""}${hx(t.text)}</p>`).join("")}</details>`).join("\n") + "</div>";
// Day 8's afternoon: the SA demonstration's and the Intake Mock Call Activity's instructions on one slide (DAY8_INS: the video, the
// sample forms and the tools' links are taken out of it), the video on a slide of its own, then Practice Intake Calls
const DAY8_VIDEO = '<p><a class="viewer-link" data-embed data-fit data-nowait data-kind="video" data-title="How to Save the Intake Packet and Extracted Intake Documents in SA" href="https://drive.google.com/file/d/19nLaPeT0PLq2fBSqtC6S2dVYfUYek3pK/view?usp=sharing">https://drive.google.com/file/d/19nLaPeT0PLq2fBSqtC6S2dVYfUYek3pK/view?usp=sharing</a></p>\n';
function DAY8_INS(x){
  const out = [DAY8_VIDEO.trim(), /<div class="ftis-forms"[^\n]*<\/div>\n?/, /<p>Prototype CMS: Intake \(a blank intake to fill in as you ask\)<\/p>\n<p><a [^\n]*<\/a><\/p>\n?/,
    /<p>Intake Call Simulator \(the Intake Line on LSH Ring Channel\)<\/p>\n<p><a [^\n]*<\/a><\/p>\n?/];
  for(const m of out){ const y = typeof m === "string" ? x.replace(m, "") : x.replace(m, ""); if(y === x) throw new Error(`Day 8's instructions no longer hold ${String(m).slice(0, 60)}`); x = y; }
  return x.replace("please use your idle time to practice handling intake calls through the Call Simulator.", "please use your idle time to practice handling intake calls: see <b>Practice Intake Calls</b>, after the video.");
}
const DAY8_PRACTICE = '<p><b>☎ Practice Intake Calls</b></p>\n' +
  '<p>While waiting for your scheduled turn for the Intake Mock Call Activity, practise intake calls with these tools. Each opens in a new tab.</p>\n' +
  '<div class="ftdd-calsim ftdd-practice"><a class="btn btn-navy" href="https://lshcasemanagementtraining-trainingcrm.pages.dev/?program=intake&amp;from=standard" target="_blank" rel="noopener noreferrer">🗂 Prototype CMS: Intake</a>' +
  '<a class="btn btn-navy" href="https://cm-training-activity.pages.dev/simulators/call.html?program=FT&amp;track=intake" target="_blank" rel="noopener noreferrer">☎ Ring Channel: Intake Calls</a></div>\n' +
  '<p>On Ring Channel, take the calls on the <b>Intake Line</b>: answer, ask the intake questions, and enter what the caller tells you in the Prototype CMS, as in the mock call.</p>\n';
// Day 8's Trainer Facilitated Demo (TRIM[8].s3): what the trainee reads, and the facilitator's notes for the trainer's slot
const DEMO_SLIDE = `<p><b>🧑‍🏫 Trainer Facilitated Demo</b></p>\n` +
  `<p>Your demonstration of saving your assigned Intake Packet and its extracted intake documents in SA (Smart Advocate) is run by your trainer, one trainee at a time. If your shadow buddy confirms a shadowing session, the demo runs at the same time: your trainer pulls you from the session for your turn. Without live shadowing, you watch a recorded shadowing session while you wait.</p>\n` +
  `<p><b>Before your turn</b></p>\n<ul>` +
  `<li>Every intake document is extracted from your assigned Intake Packet, and every file, the Intake Packet itself included, is renamed under the firm’s naming convention. These are the exact files you upload and report on SA, so this is done before the demo.</li>` +
  `<li>Your task is posted in SA’s Tasks tab: <i>Intake Packet and Intake Documents Saving Tasks</i>, naming the Intake Packets to save.</li>` +
  `<li>SA lets only one user in at a time: your trainer gives you access for your turn, with 10–15 minutes first to explore it.</li></ul>\n` +
  // (the Additional Reminder on the first page, with Before your turn; the metrics open the next page on their own)
  `<p><b>Additional Reminder</b></p>\n<p>The same process should be repeated for all extracted intake documents until all available files are uploaded and verified.</p>\n<div class="ftdd-pgbreak"></div>\n`;
const DEMO_NOTE = `<div class="facilitator"><h4>Facilitator’s Notes: Trainer Facilitated Demo, Saving the Intake Packet and Extracted Intake Documents to SA</h4>\n` +
  `<ul><li>The demo runs at the same time as the shadowing when a shadow buddy confirms a session: pull the trainees from it one by one for their individual demonstration. Without live shadowing, provide a recorded shadowing session.</li>` +
  `<li>Provide the SA credentials, the <b>2nd</b> one listed. Change it back to the 1st one at the end of each shift, and to the 2nd again whenever trainees need the CMS: this keeps the active cases in the CMS safe from unsupervised exploring, and follows the firm’s policy, as directed by the Operations Manager, that VAs are not permitted to alter it.</li>` +
  `<li>There are 2 training accounts in SA (Jane Doe &amp; John Doe / DOCGEN Dummy Account): post the tasks in the SA Tasks tab for BOTH accounts.</li></ul>\n` +
  `<div class="shots"><figure><a href="/ft/day8/img/image21.png" target="_blank"><img src="/ft/day8/img/image21.png" alt="" loading="lazy"></a></figure></div>\n` +
  `<p><b>Sample task in the DESCRIPTION box:</b></p>\n<p>***** Intake Packet and Intake Documents Saving Tasks: Batch <span class="ft-live-batch">B022026</span> ***<br><span class="ft-live-date">03/06/2025</span> Please save the client’s Intake Packet and extract intake documents in the client’s project.<br>Documents to save:<br>1. INTAKE - Packet (Martin)<br>2. INTAKE - Packet (Michelle)<br>3. INTAKE - Packet (Mikee)<br>Thank you!</p>\n` +
  `<ul><li>Check before the demo that every intake document has been extracted from the assigned Intake Packet, and that every file, the Intake Packet included, is renamed under the firm’s naming convention: these are the exact files uploaded and reported on SA.</li>` +
  `<li>Give each trainee 10–15 minutes to explore SA first: it doesn’t allow more than one user at the same time.</li></ul></div>`;
// the slots this build writes into the trainer-only notes (kept there by build/curriculum/convert.py)
const DECK_NOTES = {"3:pi-calls": () => PI_KEY, "8:dd-demo": () => DEMO_NOTE};
/* ☎ THE RECEPTION MOCK CALLS' PREPARATION, built once and read on two days, so they can't drift: Day 4's Mock Call
   Preparation and Instructions for Mock Calls & Metrics (TRIM[4].s2, cut by ROWS[4].s2). mockPrep: the PI practice calls'
   warm-up, then the seven steps; MOCK_RUN: how the one-on-one mock calls run, the buttons to the Call Simulator's
   Reception line, the Ring Channel and the CMS (MOCK_BTNS), and the Reception metrics. */
const CALL_SIM = "https://cm-training-activity.pages.dev/simulators/call.html?program=FT", CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
// (read in pages, ftdd-pgbreak, each page one block, ftdd-mockpage, that the deck keeps whole and scales to fit, so a
// heading never parts from what it heads: the warm-up; the seven steps under Instructions on Your Mock Call; how the
// one-on-one runs, with the tools' buttons under it (MOCK_BTNS); the metrics)
const PGBREAK = '<div class="ftdd-pgbreak"></div>\n';
const mockPage = (cls, html) => `<div class="ftdd-mockpage ${cls}">\n${html}</div>\n`;
// (where Day 4's Mock Call Preparation slide starts: ROWS[4].s2)
const MOCK_WARM_AT = '<div class="ftdd-mockpage ftdd-mock-warm">';
const tabBtn = (label, url) => `<a class="ftdd-mock-btn" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
const MOCK_BTNS = `<div class="ftdd-mock-btns">${tabBtn("📞 Call Simulator in CMS", CALL_SIM + "&line=Reception+Mock+Calls")}` +
  `${tabBtn("☎ The Ring Channel", CALL_SIM)}${tabBtn("🗂 CMS Case Files", CMS)}</div>\n`;
// Day 4: before the mock call, the Ring Channel and the CMS's case files (not Day 3's practice calls again)
const PI_WARMUP = `<p><b>☎ Before your mock call: the Call Simulator, the Ring Channel and the CMS</b></p>\n<p class="ftdd-warm-lead">Practise on the Call Simulator, log in to the Ring Channel, where your mock call rings, and open the CMS with its case files: look up a client, open their file and find the case details you’ll verify and update on your own call.</p>\n` +
  MOCK_BTNS;
// lead: the line that opens the warm-up's page (each day's own)
const mockPrep = lead => mockPage("ftdd-mock-warm", lead + PI_WARMUP + "\n") + PGBREAK +
  mockPage("ftdd-steps7", "<p><b>Instructions on Your Mock Call</b></p>\n" +
  "<p>Step 1 - Open the Call Simulator’s Reception line and put your headset on. Take practice calls from the AI caller as many times as you like: practice calls are not graded.</p>\n" +
  "<p>Step 2 - Answer within 3 rings and greet with the firm’s name and your name.</p>\n" +
  "<p>Step 3 - Authenticate before you discuss anything: the caller’s name, date of loss (DOL), date of birth (DOB), claim number and case number.</p>\n" +
  "<p>Step 4 - Find the file in 🔎 Case lookup (in the CMS, search by the client’s name with Ctrl / Cmd + K; when names match, it asks for the date of the accident and the date of birth).</p>\n" +
  "<p>Step 5 - Handle the call by the firm’s rules (📘 Rules, 📇 Directory): answer what you may, or use Hold and Transfer to the right person, screening the call and taking notes before you transfer.</p>\n" +
  "<p>Step 6 - Fill in the 📝 message slip or case note during the call: who called, their role, the callback number and best time, the case and what they need.</p>\n" +
  "<p>Step 7 - Close with the closing spiel. Then run the Front Desk Drill in the CMS to practise the same flow on the case files.</p>\n" +
  "") + PGBREAK;
// Day 6's mock calls slide: the trainer's line over the tracker (a trainee sees Mock Calls Ongoing and Done: ROWS[6].s1)
// where Day 6's metrics start: the Instructions end there and the Metrics slide begins (ROWS[6].s1)
const MOCK_METRICS_CAL = '<hr class="stars">\n<p><b>Calendar Management Mock Calls Metrics</b></p>';
const MOCK_RUN = mockPage("ftdd-mock-run",
  "<p><b>How the mock calls run (one-on-one)</b></p>\n" +
  "<p>Step 1 - While waiting for your turn, keep practising on the Call Simulator’s Reception line.</p>\n" +
  "<p>Step 2 - Log in to the Ring Channel and stay on standby: your trainer calls each trainee individually.</p>\n" +
  "<p>Step 3 - Take the call live with your headset on, from the greeting to the closing spiel; your trainer sees your message slip as you fill it in.</p>\n" +
  "<p>Step 4 - Once your one-on-one is over, your trainer marks your mock call done; stay on the mock call slide until the group debrief.</p>\n" +
  MOCK_BTNS) + PGBREAK + mockPage("ftdd-mock-metrics",
  "<p><b>Reception Mock Calls Metrics</b></p>\n" +
  '<div class="shots"><figure><a href="/ft/day4/img/image7.png" target="_blank"><img src="/ft/day4/img/image7.png" alt="Reception Mock Calls Metrics" loading="lazy"></a></figure></div>\n' +
  "<p>Each criterion is scored 0–5; your result is the WEIGHTED AVERAGE of the fourteen, which reaches your Scorecard.</p>\n");
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
// (Day 10's sample-documents line, where its opening-claims slide is cut: ROWS[10].s1)
const SAMPLE_DOCS_10 = "<p>Sample Insurance Communication-Related Documents and VA Recordings</p>";
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
// (without its Objective, which only restates the slide's title, and with Activities 1 (1P) and 2 (3P) as one set of
// instructions, a card each, four to a row (ftdd-lor-cards): the two lists are the same but for 1P's Claims to be Opened
// and the file names, which the cards mark 1P / 3P)
const LOR_GUIDE = () => {
  const src = fs.readFileSync(path.join(R, "build/days/lor-drafting.html"), "utf8");
  const lists = [...src.matchAll(/<ol>\n([^]*?)<\/ol>/g)].map(m => [...m[1].matchAll(/<li><b>([^<]+?):?<\/b><ul>([^]*?)<\/ul><\/li>/g)].map(x => ({h: x[1], lis: x[2].match(/<li>[^]*?<\/li>/g)})));
  if(lists.length !== 2 || lists.some(l => l.length < 6)) throw new Error("The LOR guidelines are no longer two lists of instructions the build can lay out as cards");
  const [p1, p3] = lists, tag = (t, li) => li.replace("<li>", `<li><span class="ftdd-lor-tag">${t}</span> `);
  const cards = p1.map(a => {
    const b = p3.find(x => x.h === a.h);
    const lis = !b ? a.lis.map(li => tag("1P only", li)) : a.lis.flatMap((li, k) => li === b.lis[k] ? [li] : [tag("1P", li), tag("3P", b.lis[k])]);
    return {h: a.h, lis};
  });
  if(p3.some(b => !p1.find(a => a.h === b.h))) throw new Error("Activity 2's LOR instructions have a step Activity 1's don't: lay them out anew");
  // (the templates are in the platform's LOR Drafting tool, not the training GC: the first card opens it)
  const use = cards.find(c => c.h === "Use the Template");
  if(!use || use.lis.join("") !== "<li>Open the LOR template provided in the training GC.</li>") throw new Error("The LOR guidelines' Use the Template step has changed: point it at the LOR Drafting tool anew");
  use.lis = ["<li>Open the 1P or 3P LOR template in the platform’s LOR Drafting tool.</li>"];
  use.post = `<div class="ftdd-pq-go"><button type="button" class="btn btn-navy" onclick="goto('lor')">🧰 Open the LOR Drafting tool →</button></div>`;
  return '<h3>Activities 1 &amp; 2: Drafting the 1P and 3P LORs</h3>\n<div class="ftdd-lor-cards">\n' +
    cards.map((c, k) => `<div class="ftdd-card4"><p class="ftdd-card4-h">${k + 1}. ${c.h}</p><ul>${c.lis.join("")}</ul>${c.post || ""}</div>\n`).join("") + "</div>\n";
};
// the platform's LOR Drafting tool, where Day 11's 1P and 3P letters are drafted
const LOR_TOOL = `<div class="ftdd-pq">🧰 <b>Draft your 1P and 3P letters</b> in the platform’s LOR Drafting tool.<div class="ftdd-pq-go"><button type="button" class="btn btn-navy" onclick="goto('lor')">🧰 Open the LOR Drafting tool →</button></div></div>\n`;
// Day 12's updated SA steps (1P and 3P insurance) and its tools and naming convention, in cards on one slide: the guide's
// wording, each heading a card; the build stops if the guide's text changes under it
function D12_CARDS(x){
  for(const t of ["For BOTH 1P and 3P insurance entries", "Plaintiff Insurance Owner Field", "Defendant Insurance Owner field", "OWNER, FAKE",
    "Driver’s name, if different from the owner", "Nitro Pro (pdf editing tool)", "LOR with Affidavit mm.dd.yy", "INS – 3P Geico – LOR with Affidavit 02.17.26 (Michelle)"])
    if(!x.includes(t)) throw new Error(`Day 12's insurance steps or naming convention changed: "${t}" is missing`);
  const card = (ic, h, body) => `<div class="ftdd-card4"><p class="ftdd-card4-h">${ic} ${h}</p>${body}</div>`;
  const ul = xs => "<ul>" + xs.map(i => `<li>${i}</li>`).join("") + "</ul>";
  const noAdj = "If no adjuster has been assigned yet, indicate: <b><i>“No adjuster assigned yet.”</i></b>";
  // (one block, ftdd-one: one page, scaled to fit)
  return '<div class="ftdd-one">' + "<p>When creating your process guide for your Saving LORs to SA and Sending to 3P &amp; 1P Ins Companies Demo, please incorporate these additional and updated steps, as they are already available in SA, particularly when entering insurance information for both 1P and 3P.</p>\n" +
    '<div class="ftdd-cards3">' +
    card("🔢", "Both 1P and 3P entries", "<p>Make sure to complete the following fields:</p>" + ul(["Policy Number", "Claim Number"])) +
    card("🟦", "Adding the 1P insurance information", "<p>In the <b>Plaintiff Insurance Owner Field</b>, select: <b>Plaintiff&#x27;s Training Acct</b></p><p><b>In the Comments section, include:</b></p>" +
      ul(["Actual insurance name of the owner", "Assigned adjuster details", noAdj, "Still add all other available insurance information even if no adjuster has been assigned."])) +
    card("🟥", "Adding the 3P insurance information", "<p>In the <b>Defendant Insurance Owner field</b>, select: <b>OWNER, FAKE</b></p><p><b>In the Comments section, include:</b></p>" +
      ul(["Actual insurance name of the owner", "Driver’s name, if different from the owner", "Assigned adjuster details", noAdj, "Still add all other available 3P insurance information even if no adjuster has been assigned."])) +
    "</div>\n" + '<div class="ftdd-cards2">' +
    card("🧰", "Tools", ul(["CMS: Smart Advocate", "Notepad", "Nitro Pro (pdf editing tool)"])) +
    card("🏷", "Complete Naming Convention", ul(["INS – 1P/3P Insurance Provider - LOR mm.dd.yy (VA&#x27;s name)", "3P LOR with an affidavit: INS – 3P Insurance Provider - LOR with Affidavit mm.dd.yy (VA&#x27;s name)"]) +
      "<p><b>Samples:</b></p>" + ul(["INS – 1P State Farm – LOR 02.17.26 (Michelle)", "INS – 3P Geico – LOR with Affidavit 02.17.26 (Michelle)"])) +
    "</div></div>\n";
}
// edits to a section before it is cut into its rows' slides
const EDIT = {
  // Day 10's afternoon videos (the guide: "go over these videos and the job aid"): marked as videos, so they play in the
  // slide; the 3P Zurich sample and the VLF SOP stay documents
  // One page, Watch This Video: the four videos two by two, with the 3P Zurich sample and VLF's SOP embedded down the
  // right (ftdd-three: one block, never split over two pages); the guide's "Kindly go over this job aid" line and its
  // divider go
  10: {s2: h => {
    const x = ["OPENING CLAIMS &amp; SENDING LOR", "TOOLS OVERVIEW BY CYREL ALEGADO", "FAMILIARIZING INTAKE DOCUMENTS", "OBTAINING COVERAGE INFORMATION"]
      .reduce((x, t) => rep(x, `<a class="viewer-link" data-kind="doc" data-title="${t} `, `<a class="viewer-link" data-kind="video" data-title="${t} `, 1, "Day 10 s2"), h);
    const block = re => { const m = x.match(re); if(!m) throw new Error(`Day 10 s2: ${re} is no longer where the build looks for it`); return m[0]; };
    const intro = block(/<p>For your tasks this afternoon[^\n]*<\/p>\n/), oc = block(/<p><b>OPENING CLAIMS &amp; SENDING LOR<\/b><\/p>\n<p><a [^\n]*<\/p>\n/),
      zu = block(/<p><b>SAMPLE OPENING A CLAIM W\/ 3P ZURICH<\/b><\/p>\n<p><a [^\n]*<\/p>\n/), to = block(/<p><b>TOOLS OVERVIEW BY CYREL ALEGADO <\/b><\/p>\n<p><a [^\n]*<\/p>\n/),
      fa = block(/<p><b>FAMILIARIZING INTAKE DOCUMENTS <\/b><\/p>\n<p><a [^\n]*<\/p>\n/), co = block(/<p><b>OBTAINING COVERAGE INFORMATION<\/b><\/p>\n<p><a [^\n]*<\/p>\n/),
      aid = block(/<hr class="stars">\n<p>Kindly go over this job aid[^\n]*<\/p>\n/), sop = block(/<p><b>HOW TO OPEN A 3P AUTO INSURANCE CLAIM[^\n]*<\/p>\n<p><a [^\n]*<\/p>\n/);
    // (embedded, the card's title is the title alone: the guide's data-title carries the start of the link after it)
    const embed = b => b.replace('<a class="viewer-link" ', '<a class="viewer-link" data-embed ').replace(/(data-title="[^"]*?)\s*https?:[^"]*"/, '$1"');
    const col = (b, cls) => `<div${cls ? ` class="${cls}"` : ""}>\n` + b + "</div>";
    return [oc, to, zu, fa, co, aid, sop].reduce((y, b) => y.replace(b, ""), x.replace(intro, "\u0000"))
      .replace("\u0000", '<div class="ftdd-three"><div class="ftdd-three-h">\n<p><b>Watch This Video</b></p>\n</div>' + col(oc) + col(to) + col(embed(zu), "ftdd-three-side") + col(fa) + col(co) + col(embed(sop), "ftdd-three-side") + "</div>\n");
  }},
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
    // the shadowing slide opens on the recorded shadowing given in lieu of a buddy: not the guide's first note (the same
    // thing, said again) or its "@everyone … update your TAM" line and screenshot
    s2: h => rep(h, '<p><b>Note: </b>If no shadowing buddy is available, recorded shadowing video/s will be provided to trainees instead.</p>\n<hr class="stars">\n<p><b>@everyone</b> Kindly update this section of your TAM after the session. Thanks.</p>\n<div class="shots"><figure><a href="/ft/day11/img/image32.png" target="_blank"><img src="/ft/day11/img/image32.png" alt="" loading="lazy"></a></figure></div>\n<hr class="stars">\n', "", 1, "Day 11 s2")},
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
  // (the recorded demos are SmartAdvocate's only: the Training Guide's Filevine demos are not on the platform)
  // (the topic and the video's label as one heading, as Day 12's tutorial; no note-taking reminder)
  16: {s1: h => rep(rep(rep(h, "<p><b>Topic: Lien Balance Verification Request</b></p>\n<p>Tutorial Video: </p>", "<p><b><i>Tutorial Video: Lien Balance Verification Request</i></b></p>", 1, "Day 16 s1"),
      'data-title="Tutorial Video: https://drive.google.com/file/d/1wRXRh8TySsosyxurXzhtCYwbXDJyN9A9/view?usp"', 'data-title="Tutorial Video: Lien Balance Verification Request"', 1, "Day 16 s1"),
      "<p>NOTE: Please don&#x27;t forget to take down notes for your guide later.</p>\n", "", 1, "Day 16 s1"),
    // (the demo's preparation: the recorded demo only, none of the chat reminders around it, and no ⏳ While you wait box: data-nowait)
    s2: h => ["<p>Please be reminded to type &#x27;done&#x27; here as soon as you are done watching the video and have finalized your process guide. Thank you.</p>\n",
      "<p>While waiting for your turn to perform, you may watch the following recorded demos below. Thank you.</p>\n",
      "<p>Sending Lien Balance Verification request using SA.     </p>\n",
      // (and the 45-minute notice to @everyone after the Demo Metrics)
      "<p>@everyone</p>\n<p>Please be informed that for the last metric of your LV Demo, Time Management &amp; Efficiency, the ideal completion time is 45 minutes. Going beyond the allotted time will result in a significant deduction under this metric. Please be guided and manage your time accordingly.</p>\n"]
      .reduce((x, from) => rep(x, from, "", 1, "Day 16 s2"), rep(h, 'class="viewer-link" data-kind="doc"', 'class="viewer-link" data-nowait data-kind="video"', 1, "Day 16 s2"))}
};
// what a slide holds as one block, read on one page (js/ft-day-decks.js pages: an .ftdd-keep is never dealt out)
const KEEP = ['<div class="ftdd-keep">\n', "\n</div>"];
// 📄 a document read on the slide, page by page: its pages side by side (images in ft/day7/forms or dir, made from the PDFs:
// read on the platform, not downloaded, as the fillable forms are in the CMS). A page opens bigger on the slide
// (js/ft-day-decks.js pageViewer), and the whole document opens in a tab of its own (ft/day7/forms/<slug>.html)
const PDOC_DIR = "/ft/day7/forms";
const pdocHtml = ([slug, title, n, dir = PDOC_DIR]) => `<div class="ftdd-pdoc" data-pages="${n}"><div class="ftdd-pdoc-h"><b>📄 ${title}</b>` +
  `<span>${n} pages · click a page to view it bigger</span><a class="ftdd-pdoc-tab" href="${dir}/${slug}.html" target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a></div>` +
  `<div class="ftdd-pdoc-pages" style="--n:${n}">${Array.from({length: n}, (_, i) => `<a class="ftdd-pdoc-pg" href="${dir}/${slug}-${i + 1}.webp" target="_blank" rel="noopener noreferrer">` +
  `<img src="${dir}/${slug}-${i + 1}.webp" alt="${title}, page ${i + 1}" loading="lazy"><span>Page ${i + 1}</span></a>`).join("")}</div></div>\n`;
// Day 8's naming convention reference (Topic 2, between steps 3 and 4)
const NAMING_DOC = ["naming-convention", "Document Naming Convention (reference)", 6, "/ft/day8/docs"];
// Day 7's blank PI intake forms, a page of the slide each, and the other intake documents
const INTAKE_FORMS = [["personal-injury-sheet", "Blank Personal Injury Intake Sheet (MVC / MVA)", 6], ["dog-bite", "Blank Intake Form: Dog Bite", 4],
  ["medical-malpractice", "Blank Intake Form: Medical Malpractice", 9], ["premises-liability", "Blank Intake Form: Premises Liability", 4],
  ["slip-and-fall", "Blank Intake Form: Slip and Fall", 5]];
const INTAKE_DOCS = [["affidavit-additional-insurance", "3P Insurance Affidavit (additional insurance): blank", 2]];
const ROWS = {
  2: {
    // the Common Terms tasks, three slides (TRIM[2].s2): the video, the reference sheet, the Auto Liability video
    s2: [{id: "s2", h: "Common Terms Used", parts: [[null, "<!--cut:ref-->"]]},
      {id: "s2r", h: "Common Terms Used: the reference sheet", parts: [["<!--cut:ref-->", "<!--cut:al-->"]], fix: [["<!--cut:ref-->\n", ""]]},
      {id: "s2l", h: "Auto Liability Insurance", parts: [["<!--cut:al-->", SLOT(2, "s2-1")]], fix: [["<!--cut:al-->\n", ""]]},
      // the Personal Injury readings, read once the Common Terms tasks' 📤 Submit, at their head, is in (js/ft-buffer.js ACTS["2:s2b"]):
      // the two readings read in the slide, a page each, with no name bar over them (data-bare); its 📌, the guide's "While
      // waiting for your teammates…" line and the assessments' homework line go (each assessment follows its video's Next:
      // js/ft-day-decks.js ASSESS_NEXT)
      {id: "s2b", h: "Personal Injury Readings", parts: [[SLOT(2, "s2-1"), null]], fix: [
        ['data-title="https://drive.google.com/file/d/1ZOVrwOTPEz9WuwDRbBsBCNuHqf8wb8h4/view?usp=sharing"', 'data-title="Personal Injury reading 1"'],
        ['data-title="https://drive.google.com/file/d/1ni4Yg-dublrci2drQhlMVaqxo53xtfP1/view?usp=sharing"', 'data-title="Personal Injury reading 2"'],
        x => {
          const pin = /<p>\s*📌<\/p>\n/, hw = /<p class="li" style="--lvl:0"><span class="lbl">1\.<\/span><span><b>AS YOUR HOMEWORK<\/b>[^]*?<\/p>\n/,
            wait = /<p class="li" style="--lvl:0"><span class="lbl">2\.<\/span><span>(While waiting for your teammates to complete their tasks, please read through the articles below on Personal Injury\. Thanks\.)\s*<\/span><\/p>/;
          if(!pin.test(x) || !hw.test(x) || !wait.test(x)) throw new Error("Day 2's Personal Injury readings slide is no longer what the build looks for");
          x = x.replace(pin, "").replace(hw, "").replace(wait, "");
          ["1ZOVrwOTPEz9WuwDRbBsBCNuHqf8wb8h4", "1ni4Yg-dublrci2drQhlMVaqxo53xtfP1"].forEach((id, k) => {
            const re = new RegExp(`<p><a class="viewer-link" data-kind="doc"(?=[^>]*${id})`);
            if(!re.test(x)) throw new Error(`Day 2's Personal Injury reading ${k + 1} is no longer where the build looks for it`);
            x = x.replace(re, (k ? '<div class="ftdd-pgbreak"></div>\n' : "") + '<p><a class="viewer-link" data-embed data-full data-bare data-kind="doc"');
          });
          return x;
        }]}],
  },
  3: {
    // Part 1 (TRIM[3].s1): the Call Listening Sessions, the
    // sample recordings and SOP; then Reception Listening Activity (the PI practice calls, in place of Carlos's recordings),
    // then the Listening Activity (the same calls, optional: REF_RECS)
    // (the decision trees, then the sample SOP on a slide of its own)
    s1: [{id: "s1", h: "Authorization Decision Tree", parts: [[null, '<div class="ftdd-sop">']]},
      {id: "sop", h: "Sample SOP", parts: [['<div class="ftdd-sop">', null]]},
      // (none of the guide's section: the five practice calls are the activity now, its task in cards, then the calls)
      {id: "s1c", h: PI_H, pre: PI_HTML, parts: []},
      {id: "s1d", h: PI_CALLS_H, pre: PI_CALLS_HTML, parts: []},
      // (the Listening Activity: the PI practice calls again, optional, one card per recording, after the activity, on its
      // step; Carlos's recordings are off it)
      {id: "s1b", h: "Listening Activity", pre: REF_RECS_HTML(), parts: []}]
  },
  4: {
    // Julio's video; the mock call preparation with its tools; how the one-on-one mock calls run and are scored (TRIM[4].s2)
    s2: [{id: "s2", parts: [[null, MOCK_WARM_AT]]},
      // (the Monitoring Sheet's items #10–11 are no longer a slide of their own: their card and 📤 Submit sit at the lower right of
      // the metrics page, s2b's last, js/ft-buffer.js ACTS["4:s2b"])
      // (one slide, in pages: the warm-up; the seven steps; how the one-on-one runs with the tools' buttons; the metrics)
      {id: "s2b", h: "Mock Call Preparation: the Call Simulator, Ring Channel and CMS", parts: [[MOCK_WARM_AT, null]]}]
  },
  5: {
    // the activity's own words; then its files, the time zone, the 📅 Calendar Activity Check and ✅ Done
    // (the Instructions as two cards, then the Activity Items as sixteen cards, four to a slide, each slide with the link to
    // the Calendar Simulator's Attorney's Calendar: CAL_HEAD)
    s3: [{id: "s3", h: "Attorney Calendar Management Activity: Instructions", parts: [[null, CAL_HEAD(CAL_GROUPS[0])]]},
      ...["s3i", "s3j", "s3k", "s3l"].map((id, i) => ({id, h: "Attorney Calendar Management Activity: Activity Item" + (CAL_GROUPS[i][1] - CAL_GROUPS[i][0] === 1 ? " " : "s ") + calRange(CAL_GROUPS[i]),
        parts: [[CAL_HEAD(CAL_GROUPS[i]), i + 1 < CAL_GROUPS.length ? CAL_HEAD(CAL_GROUPS[i + 1]) : SLOT(5, "s3-2")]]})),
      {id: "s3b", h: "Attorney Calendar Management Activity: Time Zone & Submit", parts: [[SLOT(5, "s3-2"), null]]}]
  },
  6: {
    // Part 2's flow: the Calendaring Mock Calls Instructions, their Metrics, then the videos (the One-on-One slide is off the deck)
    // (where the guide's "@everyone" was: TRIM[6].s1 takes it off)
    // (the instructions open on how to reach the Call Simulator and practise, #322's six steps: TRIM[6].s1)
    s1: [{id: "s1", h: "Entire Day: Calendaring Mock Calls Instructions", parts: [['<div class="ftdd-one">', MOCK_METRICS_CAL]]},
      {id: "s1m", h: "Entire Day: Calendar Management Mock Calls Metrics", parts: [[MOCK_METRICS_CAL, null]]},
      // the Calendar Management Training Videos after the mock calls (the card puts them last, after the Mock Call Scenarios)
      {id: "s1v", h: "Entire Day: Calendar Management Training Videos", parts: [[null, '<div class="ftdd-one">']]}]
  },
  7: {
    // (the classroom discussion's own slide is off, TRIM[7]: what is left of s1 is the Intake Scenario Exercise, off the decks)
    s1: [{id: "s1", h: "AM: Intake Scenario Exercise", parts: [[null, null]]}],
    // the reference set, one thing to a slide, in the trainers' order for Part 1: the checklist and the blank forms (a
    // picture of each that opens it in a new tab), the mock intake (played on the slide), the four sample calls made for
    // the platform two to a slide (js/ft-intake.js data-calls; "formse-2" continues "formse"), then the Other
    // Intake-Related Documents folder. The Sample Intake Audio Recordings folder is not on a slide:
    // its four recordings are the 🎧 Call Listening Activity, the day's last AM stop (js/ft-day-decks.js LISTEN_CARDS[7])
    // (KEEP: a slide's picture or calls stay on one page with the lines over them, scaled to fit)
    forms: [{id: "forms", pre: KEEP[0], post: KEEP[1], h: "AM: Reference: Accident or Injury Claim Documents and Evidence Checklist", parts: [[null, "<h4>📄 Blank PI Intake Forms"]]},
      {id: "formsb", h: "AM: Reference: Blank PI Intake Forms", parts: [["<h4>📄 Blank PI Intake Forms", "<p>Mock Intake (non-VLF) recording</p>"]], fix: [x => {
        // (the folder's Drive preview gives way to the five forms read on the slide, a page of the slide each)
        const shot = /<a class="ftdd-shot"[^\n]*1sdpjU_vYPuuvP1U07uHuHYiBcy2uG3kF[^\n]*<\/a>\n/;
        if(!shot.test(x)) throw new Error("Day 7's Blank PI Intake Forms are no longer where the build looks for them");
        return x.replace(shot, () => '<p>Read each form here: the fillable forms are in the CMS.</p>\n' + INTAKE_FORMS.map(pdocHtml).join('<div class="ftdd-pgbreak"></div>\n'));
      }]},
      {id: "formsc", h: "AM: Reference: Mock Intake (non-VLF) Recording", parts: [["<p>Mock Intake (non-VLF) recording</p>", '<div class="ftdd-two">']]},
      {id: "formse", pre: KEEP[0], post: KEEP[1], h: "AM: Sample Intake Calls: Work Premises Accident & Demanding Slip and Fall Client", parts: [["<h4>More sample intake calls</h4>", '<div class="ftis-calls" data-calls="3,4">']],
        fix: [["<h4>More sample intake calls</h4>\n<p>Four more practice recordings,", "<h4>Sample intake calls</h4>\n<p>Four practice recordings,"]]},
      {id: "formse-2", h: "AM: Sample Intake Calls: Agitated Dog Bite (1P) & Medical Malpractice Fees", parts: [['<div class="ftis-calls" data-calls="3,4">', null]]},
      {id: "formsd", h: "AM: Other Intake-Related Documents", parts: [['<div class="ftdd-two">', "<h4>More sample intake calls</h4>"]], fix: [x => {
        const two = /<div class="ftdd-two"><div>\n<p>Sample Intake Audio Recordings<\/p>\n<p>[^\n]*<\/p>\n<\/div><div>\n(<p>Other Intake-Related Documents<\/p>\n<p>[^\n]*<\/p>)\n<\/div><\/div>\n?/;
        if(!two.test(x)) throw new Error("Day 7's two folders are no longer what the build looks for");
        // (the Other Intake-Related Documents folder: its documents read on the slide, the folder linked under them)
        return x.replace(two, () => '<h4>📁 Other Intake-Related Documents</h4>\n' + INTAKE_DOCS.map(pdocHtml).join('<div class="ftdd-pgbreak"></div>\n') +
          '<p class="ftdd-pdoc-more">The rest of the folder: <a href="https://drive.google.com/drive/folders/1UrLBiX0ntxzvyxvRkHBhdTevtoP2jLzX?usp=sharing" target="_blank" rel="noopener noreferrer">Other Intake-Related Documents ↗</a></p>\n');
      }]}]
  },
  8: {
    // the trainer's text (#323): Topic 1, Topic 2 with the trainee's assigned packet (js/ft-intake.js), the naming
    // convention and the additional documents, the Live Session Instructions, then this afternoon's activities over three
    // slides: the SA demonstration with its video in the slide, the Intake Mock Call Activity with the sample intake forms,
    // and the Prototype CMS and the Call Simulator. (The demo tutorial's own section, s2, is off the deck: SKIP[8])
    s1: [{id: "s1", h: "AM: Topic 1: Intake Process", parts: [[null, "<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>"]]},
      // (the naming convention and its reference are on Topic 2's slide, between its steps 3 and 4: TRIM[8].s1; the additional
      // intake documents are a slide of their own)
      {id: "s1b", h: "AM: Topic 2: Intake Documents (MVA Cases)", parts: [["<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>", SLOT(8, "s1-2")]], fix: [
        // (no 🏷 topic label: the slide's ribbon names the topic) the video named for its cases, played on the left and large,
        // with its instruction beside it (ftdd-vside)
        ["<p><b>Topic 2: Intake Documents (MVA Cases)</b></p>\n", ""],
        x => { const re = /(<p>Watch this video presentation about the Intake Packet and the Intake Documents\.<\/p>)\n(<p><a class="viewer-link" data-kind="video" data-title=")The Intake Packet and the Intake Documents("[^\n]*<\/p>)\n/;
          if(!re.test(x)) throw new Error("Day 8's Intake Packet video is no longer where the build looks for it");
          return x.replace(re, '<div class="ftdd-vside">\n$2The Intake Packet and the Intake Documents (MVA Cases)$3\n$1\n</div>\n'); }]},
      {id: "s1c", h: "AM: Other Intake Documents", parts: [[SLOT(8, "s1-2"), "<p><b>1. CMS Demonstration</b></p>"]],
        // (the day file's page break before the documents was Topic 2's: here they open the slide)
        fix: [['<div class="ftdd-pgbreak"></div>\n<div class="ftis-docs"', '<div class="ftis-docs"']]},
      {id: "s1d", h: "AM: Additional Instruction: Live Session Instructions", parts: [["<p><b>1. CMS Demonstration</b></p>", "<p><b>1. Smart Advocate (SA) Demonstration"]]},
      // (the afternoon's instructions on one slide, the SA video on a slide of its own, then Practice Intake Calls with its tools;
      // no Sample Intake Forms here, they are on the slides before, and no mock-call cases box)
      {id: "s1e", h: "AM: Smart Advocate (SA) Demonstration & Intake Mock Call: Instructions", parts: [["<p><b>1. Smart Advocate (SA) Demonstration", null]], fix: [DAY8_INS]},
      {id: "s1v", h: "AM: Video: How to Save the Intake Packet and Extracted Intake Documents in SA", parts: [], pre: DAY8_VIDEO},
      {id: "s1g", h: "AM: Practice Intake Calls", parts: [], pre: DAY8_PRACTICE}],
    // the demo (TRIM[8].s3); Atty. Sandy Van's MVC intake-call video after it, s3b, is off the deck (SKIP[8])
    s3: [{id: "s3", parts: [[null, "<p><b>Atty. Sandy’s Video: Intake Calling (MVC)</b></p>"]]},
      {id: "s3b", h: "PM: Atty. Sandy’s Video: Intake Calling (MVC)", parts: [["<p><b>Atty. Sandy’s Video: Intake Calling (MVC)</b></p>", null]]}]
  },
  9: {
    s3: [{id: "s3", h: "PM: Transcription Activity: Minutes of the Meeting", parts: [[null, "<h5>3.2. Mock Calls</h5>"]]},
      {id: "s3b", h: "PM: Intake Mock Calls", parts: [["<h5>3.2. Mock Calls</h5>", null]]}]
  },
  10: {
    s1: [{id: "s1", parts: [[null, "<p> Claims Terminology Exercise</p>"]]},
      {id: "s1b", h: "AM: Claims Terminology Exercise", parts: [["<p> Claims Terminology Exercise</p>", SLOT(10, "s1-3")]]},
      // (the opening-claims slide in two, each a card row of its own: what to share, then the VA call recordings with the
      // sample documents' folder under them, js/ft-day-decks.js LESSON_CARDS[7])
      {id: "s1c", h: "AM: Additional Information: What to Share", parts: [[SLOT(10, "s1-3"), SAMPLE_DOCS_10]]},
      {id: "s1e", h: "AM: Sample Recordings & Documents: Opening Claims", parts: [["<p><b>VA Call Recordings", null], [SAMPLE_DOCS_10, "<p><b>VA Call Recordings"]],
        fix: [[SAMPLE_DOCS_10, "<p><b>Sample Insurance Communication-Related Documents</b></p>"]]}]
  },
  11: {
    // the LOR Drafting Activity on one slide: its instructions, its reminders and the platform's LOR Drafting tool
    // (the evaluation's introduction is one block, read on one page, without the guide's opening line; it ends on the
    // LOR drafting that follows Activities 1 & 2, pointed at the platform's LOR Drafting tool, not the guide's screenshot
    // of the Word files)
    s1: [{id: "s1", pre: KEEP[0], post: LOR_TOOL + KEEP[1], h: "AM: Policy Disclosure, Claim & Liability Evaluation", parts: [[null, SLOT(11, "s1-3")]],
        fix: [["<p>Proceed to the assessment activity designed to evaluate your understanding of key responsibilities as an Insurance Claim Specialist.</p>\n", ""],
          ['<hr class="stars">\n', ""],
          ['<div class="shots"><figure><a href="/ft/day11/img/image26.png" target="_blank"><img src="/ft/day11/img/image26.png" alt="" loading="lazy"></a></figure></div>\n', ""]]},
      // (one slide: the instructions on its first page, its first card opening the LOR Drafting tool, which holds the
      // templates and the case notes, so the guide's links to them are not on it; the reminders on "F/E" on the second)
      {id: "s1b", h: "AM: LOR Drafting Activity", parts: [[SLOT(11, "s1-3"), null]], fix: [h => {
        // (and only the reminders on "F/E": not the before-saving checklist or the final-draft list)
        const i = h.indexOf("<p>1P LOR Template</p>"), j = h.indexOf("<p><b>Additional Reminders for Drafting Your LOR:</b></p>\n"),
          k = h.indexOf("<p> <b>Before saving your LOR in your Assessments folder:</b></p>"), end = h.indexOf(SLOT(11, "s1-5"));
        if(i < 0 || j < i || k < j || end < k) throw new Error("Day 11's LOR templates and reminders are no longer where the build looks for them");
        // (the instructions, with the trainer's slot before them, are one block: the slot never makes a page of its own)
        return '<div class="ftdd-lor-set">\n' + h.slice(0, i) + '</div>\n<div class="ftdd-pgbreak"></div>\n<div class="ftdd-card4 ftdd-lor-rem"><p class="ftdd-card4-h">📝 Additional Reminders for Drafting Your LOR</p>\n' +
          h.slice(j, k).replace("<p><b>Additional Reminders for Drafting Your LOR:</b></p>\n", "") + "</div>\n" + h.slice(end);
      }]}]
  },
  12: {
    s1: [{id: "s1", h: "AM: Tutorial Video: Saving LORs to SA and Sending to 1P & 3P Insurance Companies", parts: [[null, '<hr class="stars">\n<p>@everyone </p>']]},
      // (the updated SA steps and the tools and naming convention, one slide in cards: D12_CARDS)
      {id: "s1b", h: "AM: Adding 1P and 3P Insurance Information, Tools & Naming Convention", parts: [['<hr class="stars">\n<p>@everyone </p>', SLOT(12, "s1-1")]], fix: [D12_CARDS]},
      {id: "s1d", parts: [[SLOT(12, "s1-1"), null]]}]
  },
  13: {
    // the breakout's exercise this afternoon; the HIPAA series is the homework (the timing note stays with the afternoon)
    // (the breakout itself is the Call Listening slide's, "Call Listening Session / Breakout Session": its own slide held only the
    // reference files, now off it, so the section is the homework's slide, with the facilitators' notes)
    s3: [{id: "s3", h: "HOMEWORK: HIPAA Training 101", parts: [[null, null]], fix: [[UPSKILL, ""],
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
      {id: "s1b", h: "AM: Notes for Your Guide", parts: [["<h4>Please add these in your notes. </h4>", null]],
        // (the templates kept together on one page; no Sending request section)
        fix: [["<h4>Please add these in your notes. </h4>\n", ""], ["<p><b>Templates </b></p>\n", KEEP[0] + "<p><b>Templates </b></p>\n"],
          ["<p><b>-----------------</b></p>\n<p><b>Sending request: E-mail/E-filing</b></p>\n<p>Subject Line:  </p>\n<p>Name of the client - Name of the lien holder(medical provider) - Request for Lien Verification</p>", KEEP[1].trimStart()]]}],
    s2: [{id: "s2", parts: [[null, SLOT(16, "s2-3")]]},
      {id: "s2b", h: "PM: Before Your Demo: Rules, Metrics & Time Limit", parts: [[SLOT(16, "s2-3"), null]],
        // (the e-mail's subject line from the Notes for Your Guide, ahead of the rules; no ⏳ While you wait box: data-nowait)
        fix: [["<h3>5. All trainees must be fully prepared", KEEP[0].replace('"ftdd-keep"', '"ftdd-keep" data-nowait') + "<p><b>Sending request: E-mail/E-filing</b></p>\n<p>Subject Line:  </p>\n<p>Name of the client - Name of the lien holder(medical provider) - Request for Lien Verification</p>" + KEEP[1] + "\n<h3>All trainees must be fully prepared"], ["<h4>6. Demo Metrics</h4>", "<h4>Demo Metrics</h4>"]]}]
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
// (nothing on the slide, as on Days 1–5: the day's card has its own ✍️ Process Questions: Submit stop, js/ft-day-decks.js
// standardRows, which opens the lesson's sheet; the day keeps its pq flag, so the stop is still there)
const PQ_NOTE = "";
// a Process Questions list: from the element that says PROCESS QUESTIONS to the naming convention's value
// (the element after "Naming Convention:"), plus the divider after it
// (Day 7 has no pointer boxes on its slides: its ✍️ Knowledge Check is the card's Process Questions stop after the
// shadowing, and its lesson the slide's 📘 button, as on the days before)
const NO_POINTER = [7];
function stripPQ(html, note = PQ_NOTE){
  let out = html, n = 0;
  for(;;){
    const i = out.indexOf("PROCESS QUESTIONS"); if(i < 0) break;
    const a = out.lastIndexOf("\n", i) + 1;
    const nm = out.search(/Naming [Cc]onvention/);
    if(nm < i) throw new Error("Process Questions with no naming convention after them");
    let b = out.indexOf("\n", nm) + 1;                     // the "Naming Convention:" line
    b = out.indexOf("\n", b) + 1 || out.length;            // its value
    const hr = out.slice(b).match(/^<hr class="stars">\n?/); if(hr) b += hr[0].length;
    out = out.slice(0, a) + note + out.slice(b); n++;
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
// (nothing on the slide, as on Days 1–5: the card's 💬 Classroom Discussion stop is ▶ Start Training)
const LESSON_NOTE = "";
function stripLessonDeck(h, html, note = LESSON_NOTE){
  if(!/classroom discussion|discussion on/i.test(h) || !LESSON_DECK.test(html)) return {html, n: 0};
  return {html: html.replace(LESSON_DECK, note), n: 1};
}
// an exercise's deck on a slide: "<p><b>… Exercise</b></p>", its Canva frame and that frame's actions row
const EXERCISE = /<p>(?:<b>)?\s*[^<]*Exercise\s*(?:<\/b>)?<\/p>\n<div class="canva-frame" id="([^"]+)">[\s\S]*?<\/iframe><\/div><div class="actions">[\s\S]*?data-fullscreen="\1"[\s\S]*?<\/div><\/div>\n?/g;
// a slide that keeps more than its exercise: its new name (and a fix to what it keeps)
const EX_RENAME = {
  // (Day 13: the breakout's section keeps only the HIPAA homework: the breakout is the Call Listening slide's)
  13: {s3: {h: "HOMEWORK: HIPAA Training 101"}}};
// the mock calls and demos laid out as Day 4's: the preparation slide's id (the activity's + "p") and title
// what an activity slide emptied by PREP still carries: Day 9's Intake Mock Calls, every intake case for the trainer
// (js/ft-intake.js .ftis-mockcall; a trainee sees their own in the slide's mock-call panel, js/ft-buffer.js), no longer on
// Day 8's slides or Day 9's metrics slide
const PREP_KEEP = {9: {s3b: '<div class="ftis-mockcall"></div>\n'}};
const PREP = {
  8: {s3: "PM: Demo Preparation: Saving the Intake Packet and Extracted Intake Documents to SA"},
  // (Day 9: no preparation slide of its own; its metrics are the Intake Mock Calls Metrics slide before, s2)
  9: {s3b: null},
  12: {s1d: "Entire Day: Demo Preparation: Uploading and Sending 1P & 3P LORs"},
  14: {s1e: "PM: Demo Preparation: Sending MedLOR and Requesting Medical Bills & Records"},
  15: {s1b: "Entire Day: Demo Preparation: Sending MedLOR and Requesting Medical Bills & Records"},
  16: {s2: "PM: Demo Preparation: Lien Balance Verification Request"}};
const decks = {}; let pqs = 0, qs = 0, decksOff = 0, exOff = 0;
for(let n = 1; n <= 16; n++){
  const d = load(n), slides = [], carry = {}, cut = new Set(), noted = new Set();
  // (a day whose Process Questions were on a slide that is off the deck, Day 2's Classroom Activity, still has them: pq)
  const pqDay = d.sections.some(s => !s.trainerOnly && s.html.includes("PROCESS QUESTIONS"));
  for(const s of d.sections){
    if(s.trainerOnly || (SKIP[n] || []).includes(s.id)) continue;
    const bare = NO_POINTER.includes(n), r = stripPQ(s.html, bare ? "" : PQ_NOTE); pqs += r.n;
    const q = stripQuestions(r.html); qs += q.n;
    const ld = stripLessonDeck(s.h, q.html, bare ? "" : LESSON_NOTE); decksOff += ld.n;
    if(r.n || ld.n) noted.add(s.id);
    let html = (TRIM[n] && TRIM[n][s.id]) ? TRIM[n][s.id](ld.html) : ld.html;
    if(EDIT[n] && EDIT[n][s.id]) html = EDIT[n][s.id](html);
    // a fragment of an earlier section that is read with this one (ROWS: to)
    if(carry[s.id]){ html = html.replace(/\s*$/, "\n") + carry[s.id]; delete carry[s.id]; }
    for(const p of (PENDING[n] || []).filter(p => p.after === s.id))
      html += "\n" + ph("ftdd-ph-link", "🔗", `Link coming: ${p.name}`, p.note || "Your trainer adds the link here. Until then, ask in the training GC.");
    // (a Buffer Time's "(1–2 hrs)" is not part of its name)
    const h = ((RENAME[n] || {})[s.id] || s.h).replace(/\s*\(1–2 hrs\)/, "").replace(/[:.\s]+$/, "");
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
    if(rows){ cut.add(s.id); slides.push(...cutRows(n, s.id, h, html, rows, carry).filter(x => !(SKIP[n] || []).includes(x.id))); continue; }
    slides.push({id: s.id, h, html});
  }
  if(Object.keys(carry).length) throw new Error(`Day ${n}: a fragment was meant for ${Object.keys(carry).join(", ")}, which the day doesn't have after it`);
  Object.keys(ROWS[n] || {}).forEach(sid => { if(!cut.has(sid)) throw new Error(`Day ${n} has no section ${sid} to cut into its rows' slides`); });
  // 🧩 no exercises on the decks: an exercise's deck (its name line, the Canva frame and its ⛶ Full screen / Open in Canva
  // row) goes; a slide left with nothing else goes with it (its card row too, js/ft-day-decks.js LESSON_CARDS), and one
  // that keeps more is renamed for what it keeps (EX_RENAME)
  for(let i = slides.length - 1; i >= 0; i--){
    const x = slides[i], m = x.html.match(EXERCISE); if(!m) continue;
    x.html = x.html.replace(EXERCISE, ""); exOff += m.length;
    if(!x.html.replace(/<div class="trainer-slot"[^>]*><\/div>/g, "").trim()) { slides.splice(i, 1); continue; }
    const nm = (EX_RENAME[n] || {})[x.id];
    if(!nm) throw new Error(`Day ${n} ${x.id}: its exercise is off the slide, and the slide needs a new name (EX_RENAME)`);
    x.h = nm.h; if(nm.fix) x.html = nm.fix(x.html);
  }
  // 📋 a slide that only pointed to the lesson deck or the Process Questions (Days 7 and 10's classroom discussion) goes, as
  // Days 5 and 13's did (SKIP): the card's 💬 Classroom Discussion and ✍️ Process Questions: Submit stops are those
  for(let i = slides.length - 1; i >= 0; i--){
    const x = slides[i];
    if(!noted.has(x.of || x.id)) continue;
    if(!x.html.replace(/<div class="trainer-slot"[^>]*><\/div>|<hr class="stars">/g, "").trim()){ slides.splice(i, 1); continue; }
    // (and the ✱✱✱ divider that followed the pointer no longer opens the slide: Day 13's Breakout Session)
    x.html = x.html.replace(/^((?:\s*<div class="trainer-slot"[^>]*><\/div>)*\s*)<hr class="stars">\n?/, "$1");
  }
  // ☎ / 🧑‍🏫 a mock call or demo in Day 4's format (PREP): its instructions, rules and metrics on a preparation slide of their
  // own, then the activity's slide, where a trainee sees only "Mock Calls Ongoing" / "Demos Ongoing" and Done
  // (js/ft-buffer.js ACTS, simple); the activity slide keeps its id, so the records saved under it stand
  for(const [id, h] of Object.entries(PREP[n] || {})){
    const i = slides.findIndex(x => x.id === id); if(i < 0) throw new Error(`Day ${n} has no ${id} for its mock call or demo preparation`);
    const x = slides[i];
    slides.splice(i, 1, ...(h ? [Object.assign({}, x, {id: id + "p", h})] : []), {id, h: x.h, of: x.of, html: (PREP_KEEP[n] || {})[id] || ""});
  }
  if(new Set(slides.map(x => x.id)).size !== slides.length) throw new Error(`Day ${n}: two slides share an id`);
  const extra = EXTRA[n] || [];
  if(extra.length) extra.forEach((x, i) => slides.push({id: "extra-" + (i + 1), h: x.h, html: x.html}));
  else slides.push({id: "to-be-added", h: "To be added", placeholder: true,
    html: ph("ftdd-ph-blank", "📌", "More is on its way", "Your trainer will add the rest of today’s material here. Until then, follow the slides before this one and the training GC.")});
  // 📚 no Knowledge Base links on the decks for now: each box (its heading and its links), each "Knowledge Base: …" label and
  // its link, and any other line that links the Knowledge Base, are taken off every slide (the day files keep them, so they
  // come back by deleting this)
  for(const s of slides) s.html = noKB(s.html);
  for(const s of slides){
    if(/lsh-knowledge-base|In the Knowledge Base/.test(s.html)) throw new Error(`a Knowledge Base link is still on Day ${n} ${s.id}`);
    if(/class=\\?"facilitator|Answer Key|Correct Answer|Ideal Answer|Facilitator[’']s (Note|Guide)/i.test(s.html)) throw new Error(`facilitator content in Day ${n} ${s.id}`);
    if(/PROCESS QUESTIONS/.test(s.html)) throw new Error(`Process Questions left in Day ${n} ${s.id}`);
    if(/Password|Username/.test(s.html)) throw new Error(`log-in details in Day ${n} ${s.id}`);
    if(/classroom discussion|discussion on/i.test(s.h) && LESSON_DECK.test(s.html)) throw new Error(`the lesson deck is still embedded on Day ${n} ${s.id}`);
  }
  decks[n] = Object.assign({day: n, title: d.title, heading: d.heading}, pqDay ? {pq: true} : {}, {slides});
}
function noKB(html){
  return String(html || "")
    .replace(/<p>Knowledge Base:[^<]*<\/p>\n?<p><a [^>]*lsh-knowledge-base[^>]*>[^<]*<\/a><\/p>\n?/g, "")
    .replace(/<p>[^\n]*?lsh-knowledge-base[^\n]*?<\/p>\n?/g, "")
    .replace(/<div class="ftdd-card4"><p class="ftdd-card4-h">📚 In the Knowledge Base<\/p>\s*<\/div>\n?/g, "")
    .replace(/<h4>📚 In the Knowledge Base<\/h4>\n?/g, "")
    // (a page break left with nothing after it)
    .replace(/(?:<div class="ftdd-pgbreak"><\/div>\s*)+$/, "");
}
const out = "// Generated by build/day-decks.cjs from build/days/*.js — edit the day files or that script, not this file.\n"
  + "window.FT_DAY_DECKS = " + JSON.stringify(decks) + ";\n";
// (written whole, then put in place: test servers started side by side each build it, .github/scripts/smoke.mjs, and none
// may serve a half-written file)
const DATA = path.join(R, "js/ft-day-decks-data.js"), tmp = `${DATA}.${process.pid}.tmp`;
fs.writeFileSync(tmp, out); fs.renameSync(tmp, DATA);
// the slots in DECK_NOTES, in the trainer-only notes
const NOTES = path.join(R, "trainer/notes.json"), notes = JSON.parse(fs.readFileSync(NOTES, "utf8"));
let notesChanged = false;
for(const [k, f] of Object.entries(DECK_NOTES)){ const v = f(); if(notes.slots[k] !== v){ notes.slots[k] = v; notesChanged = true; } }
if(notesChanged) fs.writeFileSync(NOTES, JSON.stringify(notes, null, 1));
console.log(`js/ft-day-decks-data.js: ${Object.keys(decks).length} day decks, ${Object.values(decks).reduce((a, d) => a + d.slides.length, 0)} slides, ${pqs} Process Questions lists taken off (the card's ✍️ Process Questions: Submit stop), ${qs} task question lists replaced by the assessment note, ${(out.length / 1024).toFixed(0)} KB`);
for(const d of Object.values(decks)) console.log(`  Day ${d.day} · ${d.title}: ${d.slides.map(s => s.h.slice(0, 40)).join(" | ")}`);
