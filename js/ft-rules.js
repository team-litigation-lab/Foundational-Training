/* ============================================================
   Setting of Training Expectations and Company Policies — a slide lesson of its own, beside
   Virtual Assistant Essentials (first in the lessons row).
   Loaded after js/ft-tracker.js. Each part below is one slide; the trainer can run
   it in Presenter view and the slides window like the other lessons.
     • It isn't one of the program's lessons: it's always open, and it doesn't count toward
       "Lessons finished", the certificate or the admin stats. It isn't in DAYS; DAYS.find and
       DAYS.some also look at it (by id, ORIENT_ID), so the lesson view, Presenter view, routes
       (#/day/12) and names find it, while DAYS.length, map and filter still count the 8 lessons.
     • A slide's html is built when it's shown (a getter), so a file name carries the trainee's own name
       and the Copy buttons work.
     • The parts, in the order the trainers run the orientation: 👋 Welcome to LSH!; Hubstaff (how-tos and why they
       matter, the To-Dos with 📋 Copy — no shadowing To-Do: the trainer gives that one on the day —, notes, and the
       Manual Time Adjustment Request); breaks and auxes; the camera; Discord (mindfulness and response rates); the 4 daily
       deliverables (an overview, the Daily Task Tracker part by part, the Training Monitoring Sheet embedded with the
       📁 Link My Task Tracker and Monitoring Sheet button (the My Drive links form, for the nightly check), and the EOD email with
       its template); the setting of expectations (what training is, General VAs, your work and the use of AI); and Free
       Upskill Training. Day 1's PI overview reading task is not here: it is an assessment the trainer posts in the
       training GC, with its own file, questions and naming convention, and it is scored on the Weekly Ranking.
     • Drawn like the Activity decks and the Case Management course's slides (the CSS below, fitOrient): a slide is
       scaled to fit its white sheet, to half size at the smallest, and only one that would need less is split into pages.
     • The Hubstaff picture is drawn after the trainer's screenshot (SVG): the Add Work Notes box.
   ============================================================ */
(function(){
const SHIFT = "8:00 AM – 5:00 PM PST";

// The camera: how you show up on it, in every meeting (the orientation's Camera slide).
const CAMERA = [
  {h:"🙂 Demeanor", rows:["Be at your desk and ready when the meeting starts, facing the camera.",
    "Look at the screen and stay attentive: no eating, no phone, no side tasks while you’re on camera.",
    "Stay muted when you’re not speaking, and keep your surroundings quiet."]},
  {h:"👔 Outfit", rows:["Dress as you would for the office: business casual.",
    "A collared shirt, a blouse or a plain, neat top.",
    "No sleepwear, sleeveless tops, tank tops, caps, or clothes with large prints, logos or slogans."]},
  {h:"🖼 Framing", rows:["Your camera at eye level, your head and shoulders in the middle of the frame.",
    "Light in front of you, not behind you, so your face is clearly seen.",
    "A plain, tidy background, or a professional virtual background."]}
];

// Auxes: where and what to type in Discord.
const AUX_CHANNELS = [
  {ch:"#⏳-timestamps", what:"The LSH BOT channel. Type the command for your status. LSH BOT replies with a notification: check it, so your log is recorded properly.",
   rows:[["Logging In", "!in"], ["Lunch Break", "!brb - lunch"], ["Logging Out", "!out"],
         ["Power Outage", "!brb - power outage"], ["Internet Outage", "!brb - internet outage"]], bot:true},
  {ch:"#trainingchannel", what:"Your batch’s channel. Post the same update here, at the same time, when you start your Hubstaff.",
   rows:[["Logging In", "in"], ["Lunch Break", "brb - lunch"], ["Logging Out", "out"],
         ["Power Outage", "brb - power outage"], ["Internet Outage", "brb - internet outage"]]}
];

// Daily habits. Links from the guide: Day 0 → Onboarding Orientation (Training Matrix, sample
// updated trackers).
const HABITS = [
  {icon:"📧", name:"Send Your EOD Email", lines:[
    "Email your EOD (end-of-day) report before the end of every shift, using the template on the next slide.",
    "Your EOD is a summary of your day. List everything you accomplished and completed.",
    "Include at least 3 specific learnings from the tasks you completed, with at least 2 sentences for each, so your trainers can gauge your understanding."],
   to:["martin@legalsupporthelp.com", "michelle.velarde@legalsupporthelp.com"],
   links:[],
   // embedded beside the card, not linked
   matrix:{url:"https://docs.google.com/document/d/1fJnSYHyCFBE2XZP1s43pBc6pE6GV44o_a1BKzO0z4Ys/edit?tab=t.0", note:"Your training flow, for your tasks on queue for tomorrow."}
   },
  {icon:"📋", name:"Update Your Trackers", tracker:true, lines:[
    "Update your LSH Daily Task Tracker every day, before the end of your shift. Every open task gets a Daily Note for the day.",
    "Your EOD is only a summary, so the rest of your learnings go in your tracker. Make it as comprehensive and detailed as possible, and keep it organized. Fill in every part (explained on the next slides). You can transfer your discussion notes for reference.",
    "Update your Training Monitoring Sheet in your trainee folder within the shift, as soon as a topic is fully covered. Add the date, and all 5 takeaways in complete, specific sentences."],
   example:["I learned about auto liability.", "Auto liability insurance covers damages and injuries caused to others in an accident where the policyholder is at fault, including both bodily injury and property damage."],
   links:[["Sample Updated Trackers", "https://docs.google.com/spreadsheets/d/1oaquY4HnuUh2Kqf1T1MKZiHMDChnDHMo/edit?gid=2024469516#gid=2024469516", "The LSH Daily Task Tracker, filled in."],
          ["Training Monitoring Sheet", "https://docs.google.com/document/d/1bCi0oCAR9Xc83--_SZzS0CIxxp3TGuL3/edit?usp=drive_link&ouid=118231985581105611442&rtpof=true&sd=true", "Make your copy in your VA Output folder, then save its link on the platform: 📒 Monitoring Sheet."]],
   }
];
// The EOD email (Setting of Expectations).
// The Training Matrix's cover picture, shown beside the embedded matrix (null until the picture is in the repository)
const TRAINING_MATRIX_IMG = null;
const EOD = {
  subject:"Daily Report mm/dd/yy", subjectAlt:"EOD Report mm/dd/yy",
  parts:[["Accomplishments/Completed Tasks:", "All the tasks you accomplished and completed for the day.", 4],
         ["These are the things I've learned that I can put into practice later on:", "At least 3 specific learnings from the tasks you accomplished, at least 2 sentences each.", 3],
         ["On queue for tomorrow:", "Your next tasks, from your Training Matrix.", 3]]
};
EOD.body = EOD.parts.map(p=>p[0] + "\n" + "-\n".repeat(p[2])).join("\n");

// The LSH Daily Task Tracker, part by part (the parts of js/ft-tracker.js's sheet).
const TRACKER_PARTS = {
  top:[["Status Counts (Rows 1–5)", "How many of your tasks are New, Pending for >3 days, Ongoing, Priority - Ongoing and Completed. They count themselves from each task’s Status."]],
  sections:[["⬇ FOR COMPLETION ⬇", "The tasks you’re working on. Add a row for each new task."],
            ["⬇ RECURRING ⬇", "Tasks you do every day, like your Typing Test and Spelling Test."],
            ["⬇ COMPLETED ⬇", "Finished tasks, with their Actual Completion Date."]],
  cols:[["Date Received", "The date you got the task."],
        ["Type of Task", "Pick the type from the list. Your training tasks are LSH-TRAINING."],
        ["Task Details / Specific Task", "What the task is, specifically, e.g. Classroom Discussion: Reception Training Day 1."],
        ["Accountable VA", "Your name, as the VA responsible for the task."],
        ["DAILY NOTES (Dated Significant Task Progress/Difficulties)", "One dated column for each training day. For every open task, write what you did that day, the result and the next step, and any difficulty with what you need to resolve it. Make it as detailed as possible. Never write just “done”, “ok” or “same”."],
        ["VA NOTES", "Your takeaways from the task, in complete sentences that show what you learned."],
        ["Deadline", "The date the task is due."],
        ["Status", "New, Pending for >3 days, Ongoing, Priority - Ongoing or Completed. Keep it up to date."],
        ["Actual Completion Date", "The date you finished the task."]],
  tabs:[["Client-VA Specific Tasks Index", "Each client’s tasks at a glance, with the client code, business name, state, time zone, field of law, type of task, specific task, period (Daily to Project-based), nature of task (how important and urgent), and deadline (ASAP, Anytime w/in the day, or Timebound, with the date, day or time)."],
        ["Links & Access", "The tools you have access to, with your username and remarks. Never write passwords here. They stay in the credentials document."],
        ["Directory", "Your contacts, with the contact person, business name, business address, phone no. (ext), fax number and email."],
        ["Time Zone", "The time zones you work with, for quick reference."]],
  check:"Every training day, the platform checks that every open task has a Daily Note for that day. A cell that needs fixing turns red, and your trainer can add a comment on your day."
};

// Day 0 → Onboarding Orientation.
const DISCORD_STATUS = {format:"LSH | [your team] | [time zone] [work days] [shift] RD [rest days]", example:"LSH | Support | EST Mon-Fri 8AM-5PM RD Sat-Sun", note:"RD = rest days."};
const TIME_ADJ = {
  subject:"Manual Time Adjustment Request",
  to:"nicson@legalsupporthelp.com",
  cc:[["Matt", "martin@legalsupporthelp.com"], ["Michelle", "michelle.velarde@legalsupporthelp.com"]],
  include:["That you lost hours on your tracker because of a system issue, and exactly what happened.",
           "Screenshots that show the work you did during the lost hours.",
           "The affected start and end time."]
};

// Hubstaff How-To Lessons: this lesson's Hubstaff slides (by id) and the guide. Add more as {title, desc, href}.
const HOWTO_LESSONS = [];


// Day 1 → Setting of Expectations: the tests' links, file names and sample screenshots.
const TESTS = [
  {icon:"⌨️", name:"Typing Test", when:"Twice a day: in the morning, during the 8:00 – 8:10 AM Typing & Spelling Activity (AM), and once in the afternoon (PM).",
   links:[["TypingClub", "https://www.typingclub.com/sportal/program-3.game"], ["Alternative: TypingTest.com", "https://www.typingtest.com/"]],
   file:"Typing Test [date taken][AM/PM]", sample:"/ft/day1/img/typing-test-sample.png"},
  {icon:"🔤", name:"Spelling Test", when:"Once a day, during the 8:00 – 8:10 AM Typing & Spelling Activity.",
   links:[["SpellQuiz (Grade 12)", "https://spellquiz.com/spelling-test/grade-12"], ["Alternative: Spelling-Test.com", "https://spelling-test.com/spelling-exercise#question_16"]],
   file:"Spelling Test [date taken][AM/PM]", sample:"/ft/day1/img/spelling-test-sample.png"}
];
window.FT_SKILL_TESTS = TESTS;   // shown in the Practice Lab (js/ft-simulators.js)

// Paste into Hubstaff one by one, as each session comes up (Day 1: Hubstaff To-Do Set-up).
const TODOS = [
  "Classroom Discussion: Virtual Assistant Essentials - Day 1",
  "Classroom Discussion: Virtual Assistant Essentials - Day 2",
  "Classroom Discussion: Reception Training Day 1",
  "Classroom Discussion: Reception Training Day 2",
  "Classroom Discussion: Reception Training Day 3",
  "Classroom Discussion: Calendar Management Training",
  "Classroom Discussion: Intake Training Day 1",
  "Classroom Discussion: Intake Training Day 2",
  "Classroom Discussion: Intake Training Day 3",
  "Classroom Discussion: Insurance Communication Training Day 1",
  "Classroom Discussion: Insurance Communication Training Day 2",
  "Classroom Discussion: Insurance Communication Training Day 3",
  "Classroom Discussion: Provider Communication Training Day 1",
  "Classroom Discussion: Provider Communication Training Day 2",
  "Classroom Discussion: Provider Communication Training Day 3",
  "Classroom Discussion: Provider Communication Training Day 4"
];
// Day 0 → Onboarding Orientation: LSH VA Guide | "Create a to-do" task list.
const TODO_GUIDE = "https://docs.google.com/spreadsheets/d/1Yfeuw9xGb2H68qF9nHf94whXVKmoL1PP8QocP_FN1Ys/edit#gid=0";

const NOTE_PARTS = [
  {h:"Start Tracking on Today’s To-Do", steps:[
    "Open the Hubstaff desktop app.",
    "Click your training project, e.g. LSH - SUPPORT (Training Jr). It turns blue.",
    "Under To-dos, find today’s to-do. Not there yet? Add it first (see the Your Hubstaff To-Dos slide).",
    "Click the button inside today’s to-do, at its left. The row turns blue and the timer at the top tracks that to-do."],
   tip:"You can only add a note while the timer is running."},
  {h:"Add the Note", fig:"note", steps:[
    "Click the notes button (the pencil icon) next to the timer.",
    "The Add Work Notes box opens. Type what you’re working on.",
    "Click Add Note."]},
  {h:"Where Your Note Goes", steps:[
    "The note is saved to the 10-minute block of time you’re tracking now.",
    "Your trainers see it with your tracked time and activity in Hubstaff."]}
];



/* ---------- the Hubstaff pictures (drawn after the trainer's screenshots) ---------- */
const OR = "#E8590C", HB = "#1c7ce0";
function arrow(d, m){
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${OR}" stroke-width="3" stroke-linecap="round" marker-end="url(#${m})"/>`;
}
function callout(x, y, w, lines){
  return `<rect x="${x}" y="${y}" width="${w}" height="${12 + lines.length*20}" rx="8" fill="${OR}"/>` +
    lines.map((t,i)=>`<text x="${x+12}" y="${y+22+i*20}" font-size="${i ? 14 : 16}" font-weight="${i ? 400 : 700}" fill="#fff">${esc(t)}</text>`).join("");
}
// The app window and its left side: the timer, the notes button, the project and the stop button.
function hsWindow(w, h, m){
  return `<defs><marker id="${m}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${OR}"/></marker></defs>
    <rect x="1" y="1" width="${w-2}" height="${h-2}" rx="8" fill="#fff" stroke="#5b6178" stroke-width="2"/>
    <path d="M1 28H${w-1}M250 28V${h-1}" stroke="#9aa0ab" stroke-width="1.5"/>
    <circle cx="16" cy="13.5" r="6" fill="#2b7de9"/><circle cx="16" cy="13.5" r="2.5" fill="#fff"/>
    <text x="28" y="19" font-size="14" font-weight="700" fill="#1B1E2E">Hubstaff</text>
    <rect x="40" y="40" width="146" height="34" fill="${HB}"/><text x="113" y="64" text-anchor="middle" font-size="21" font-weight="700" fill="#fff">07:33:42</text>
    <circle cx="210" cy="57" r="17" fill="#fff" stroke="#5b6178" stroke-width="1.5"/>
    <rect x="202" y="49" width="12" height="15" rx="2" fill="none" stroke="#1B1E2E" stroke-width="1.8"/><path d="M208 61l8-8 2.5 2.5-8 8H208z" fill="#1B1E2E"/>
    <text x="125" y="104" text-anchor="middle" font-size="16" font-weight="700" fill="#111">LSH - SUPPORT (Training Jr)</text>
    <text x="125" y="123" text-anchor="middle" font-size="12.5" fill="#222">Classroom Discussion: Recep…</text>
    <path d="M20 150H230M125 150V178" stroke="#9aa0ab" stroke-width="1.5"/>
    <circle cx="125" cy="148" r="18" fill="#fff" stroke="#5b6178" stroke-width="1.5"/><rect x="118" y="141" width="14" height="14" rx="2" fill="${HB}"/>
    <text x="64" y="178" text-anchor="middle" font-size="12" fill="#3d4357">No limits</text><text x="186" y="178" text-anchor="middle" font-size="12" fill="#3d4357">Today: 7:33</text>
    <rect x="14" y="190" width="222" height="26" fill="#fff" stroke="#5b6178" stroke-width="1.5"/><circle cx="26" cy="202" r="5" fill="none" stroke="#1B1E2E" stroke-width="1.5"/><path d="M30 206l4 4" stroke="#1B1E2E" stroke-width="1.5"/>
    <text x="40" y="208" font-size="13" fill="#1B1E2E">Search projects</text>`;
}
// The Add Work Notes box, opened from the notes button next to the timer.
function figNote(){
  const m = "ftrArrowNote";
  return `<svg viewBox="0 0 760 320" role="img" aria-label="The Hubstaff app: click the notes button next to the timer, type what you’re working on in Add Work Notes, then click Add Note.">
    ${hsWindow(760, 320, m)}
    <circle cx="210" cy="57" r="22" fill="none" stroke="${OR}" stroke-width="3"/>
    <rect x="310" y="88" width="400" height="184" rx="6" fill="#fff" stroke="#5b6178" stroke-width="2"/>
    <path d="M311 118H709" stroke="#9aa0ab" stroke-width="1.5"/><text x="324" y="109" font-size="14" font-weight="700" fill="#1B1E2E">Add Work Notes</text>
    <rect x="330" y="128" width="360" height="92" fill="#fff" stroke="#1c5fa8" stroke-width="2"/>
    <text x="344" y="152" font-size="16" font-weight="700" fill="#C2410C">② Type What You’re Working On</text>
    <rect x="330" y="232" width="80" height="28" rx="3" fill="#fff" stroke="#5b6178" stroke-width="1.5"/><text x="370" y="251" text-anchor="middle" font-size="13.5" fill="#1B1E2E">Cancel</text>
    <rect x="590" y="232" width="100" height="28" rx="3" fill="#eef0f4" stroke="#5b6178" stroke-width="1.5"/><text x="640" y="251" text-anchor="middle" font-size="13.5" font-weight="700" fill="#1B1E2E">Add Note</text>
    <rect x="584" y="226" width="112" height="40" rx="7" fill="none" stroke="${OR}" stroke-width="3"/>
    ${arrow("M270 57H240", m)}${callout(270, 41, 380, ["① Click the Notes Button Next to the Timer"])}
    ${arrow("M540 296C590 296 625 288 632 270", m)}${callout(380, 280, 160, ["③ Click Add Note"])}
  </svg>`;
}
// The to-do list: click the training project, paste the to-do in Create a to-do and click +, then the button inside it.
function figTodo(){
  const m = "ftrArrowTodo", sel = 2;
  const rows = [["Classroom Discussion: Reception Training Day 1", "09/25/2026 07:58 AM"],
                ["Classroom Discussion: Reception Training Day 2", "09/28/2026 07:57 AM"],
                ["Classroom Discussion: Reception Training Day 3", "09/29/2026 07:59 AM"]];
  const projects = [["LSH - CHECK-IN", "0:00"], ["LSH - FILLER", "0:00"], ["LSH - SUPPORT (Training Jr)", "7:33"]];
  return `<svg viewBox="0 0 760 420" role="img" aria-label="The Hubstaff app: click your training project, paste your to-do in Create a to-do and click +, then click the button inside today’s to-do to track time on it.">
    ${hsWindow(760, 420, m)}
    <rect x="2" y="226" width="247" height="30" fill="#dfe2ea"/><text x="14" y="246" font-size="13.5" font-weight="700" fill="#1B1E2E">Legal Support Help</text>
    ${projects.map((p,i)=>{ const y = 256 + i*34, on = i===2;
      return `${on ? `<rect x="2" y="${y}" width="247" height="34" fill="${HB}"/><circle cx="18" cy="${y+17}" r="7" fill="#fff"/><rect x="15" y="${y+14}" width="6" height="6" rx="1" fill="${HB}"/>` : `<path d="M2 ${y+34}H249" stroke="#b4bac6"/>`}
        <text x="34" y="${y+22}" font-size="12.5" font-weight="${on ? 700 : 400}" fill="${on ? "#fff" : "#1B1E2E"}">${p[0]}</text><text x="238" y="${y+22}" text-anchor="end" font-size="12.5" fill="${on ? "#fff" : "#1B1E2E"}">${p[1]}</text>`; }).join("")}
    <text x="266" y="52" font-size="18" font-weight="700" fill="#111">To-dos</text><text x="266" y="69" font-size="12" fill="#3d4357">LSH - SUPPORT (Training Jr)</text>
    <rect x="266" y="106" width="456" height="26" fill="#fff" stroke="#5b6178" stroke-width="1.5"/><text x="274" y="124" font-size="13" fill="#1B1E2E">Create a to-do</text>
    <rect x="262" y="102" width="464" height="34" rx="5" fill="none" stroke="${OR}" stroke-width="2.5" stroke-dasharray="6 3"/>
    <rect x="730" y="107" width="22" height="24" fill="#fff" stroke="#5b6178" stroke-width="1.5"/><text x="741" y="125" text-anchor="middle" font-size="17" font-weight="700" fill="#111">+</text>
    <rect x="725" y="102" width="32" height="34" rx="6" fill="none" stroke="${OR}" stroke-width="3"/>
    <text x="292" y="158" font-size="11" font-weight="700" fill="#3d4357">TO-DO</text><text x="590" y="158" font-size="11" font-weight="700" fill="#3d4357">CREATED</text>
    <path d="M251 168H759" stroke="#9aa0ab" stroke-width="1.5"/>
    ${rows.map((r,i)=>{ const y = 168 + i*38, on = i===sel;
      return `${on ? `<rect x="251" y="${y}" width="507" height="38" fill="${HB}"/><circle cx="272" cy="${y+19}" r="8" fill="#fff"/><rect x="268.5" y="${y+15.5}" width="7" height="7" rx="1" fill="${HB}"/><circle cx="272" cy="${y+19}" r="14" fill="none" stroke="${OR}" stroke-width="3.5"/>` : `<path d="M251 ${y+38}H759" stroke="#b4bac6"/>`}
        <text x="292" y="${y+24}" font-size="12.5" font-weight="${on ? 700 : 400}" fill="${on ? "#fff" : "#1B1E2E"}">${r[0]}</text><text x="590" y="${y+24}" font-size="12.5" fill="${on ? "#fff" : "#1B1E2E"}">${r[1]}</text>`; }).join("")}
    ${arrow("M125 382V362", m)}${callout(28, 380, 196, ["① Click Your Project"])}
    ${arrow("M741 86V100", m)}${callout(470, 34, 280, ["② Paste It in Create a To-Do", "Then click + (or press Enter)."])}
    ${arrow("M330 330C292 322 274 306 272 290", m)}${callout(318, 322, 432, ["③ Click the Button Inside Today’s To-Do", "This tracks your time on it, and the row turns blue."])}
  </svg>`;
}
const FIGS = {note: figNote, todo: figTodo};
// On a phone the picture keeps its size and scrolls sideways in its box.
const fig = svg => `<figure class="ftr-fig"><div class="ftr-fig-scroll">${svg}</div><figcaption class="ftr-swipe">↔ Swipe sideways to see the whole picture.</figcaption></figure>`;

/* ---------- the slides ---------- */
// A Drive file shown in full inside the slide (its /preview; a Google Doc, the Doc's own /preview), with a link to open it in its own tab.
const drivePreview = u => { const g = String(u).match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]{20,})/); if(g) return `https://docs.google.com/document/d/${g[1]}/preview`; const m = String(u).match(/\/d\/([a-zA-Z0-9_-]{20,})/); return m ? `https://drive.google.com/file/d/${m[1]}/preview` : u; };
const embed = (url, title, open)=>`<div class="ftr-embed"><iframe src="${esc(drivePreview(url))}" title="${esc(title)}" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
    <div class="ftr-embed-bar"><span>📄 ${esc(title)}</span>${open ? `<a class="btn btn-ghost btn-sm" href="${esc(open)}" target="_blank" rel="noopener noreferrer">Open or Download ↗</a>` : ""}</div>`;
const rule = (b, span)=>`<div class="ftr-rule"><b>${b}</b>${span ? `<span>${span}</span>` : ""}</div>`;
const tpart = (h, rows)=>`<div class="ftr-part"><div class="ftr-part-h">${esc(h)}</div>${rows.map(r=>`<div class="ftr-def"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}</div>`;
const copyRow = (label, text, sub)=>`<div class="ftr-aux"><span><b>${esc(label)}</b>${sub ? `<br><small>${esc(sub)}</small>` : ""}</span><span class="ftr-copyrow"><code class="ftr-code">${esc(text)}</code><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(text)}" data-toast="Copied." onclick="ftrCopy(this)">📋 Copy</button></span></div>`;

const habitCard = h=>`<div class="ftr-chan ftr-test">
      <div class="ftr-part-h">${h.icon} ${esc(h.name)}</div>
      <ul class="ftr-list">${h.lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
      ${h.to ? `<div class="ftr-to"><b>Send To</b>${h.to.map(a=>`<span>${esc(a)}</span>`).join("")}</div>` : ""}
      ${h.example ? `<div class="ftr-eg"><div>❌ <b>General:</b> “${esc(h.example[0])}”</div><div>✅ <b>Specific:</b> “${esc(h.example[1])}”</div></div>` : ""}
      ${h.links.map(l=>`<div class="ftr-aux"><span><b>${esc(l[0])}</b><br><small>${esc(l[2])}</small></span><a class="btn btn-ghost btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join("")}
    </div>`;

const SLIDES = [
  ["welcome", "Welcome to LSH!", ()=>`
    <div class="ftr-stakes"><b>👋 Welcome to Legal Support Help!</b>
      <p>You’re starting the Standard Foundational Training Program: the training that prepares you to work as a legal VA for U.S. law firms. Before your first lesson, this orientation walks you through how training runs and what’s expected of you every day.</p></div>
    <div class="ftr-lessons">${[["⏱", "Hubstaff", "How-Tos, your To-Dos, notes and lost hours"], ["☕", "Breaks and Auxes", "Your schedule, your hour of breaks, and reporting your status"],
      ["📷", "Camera", "On in every meeting"], ["💬", "Discord", "Mindfulness and response rates"], ["📦", "Your 4 Daily Deliverables", "Typing and spelling tests, Daily Task Tracker, Monitoring Sheet, EOD email"],
      ["🎯", "Setting of Expectations", "What training is, your role and the use of AI"], ["🌱", "Free Upskill", "After your shift"]].map(([i, t, d])=>`<div class="ftr-lesson"><b>${i} ${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>
    <p class="ftr-sub ftr-after">Your training shift: <b>${esc(SHIFT)}</b>.</p>`],
  // Hubstaff: how-tos and why they matter, the To-Dos, notes and lost hours
  ["howto", "Hubstaff: How-Tos and Why They Matter", ()=>{
    // this lesson's Hubstaff slides (a click goes to the slide) and the LSH VA Guide, then any added lessons
    const here = [["todos", "Your Hubstaff To-Dos", "How to add today’s To-Do, and the names to use, with 📋 Copy and 📋 Copy All."],
                  ["notes", "Create Notes in Hubstaff", "Add a work note to the time you’re tracking."],
                  ["time-adjustment", "Lost Hours", "The Manual Time Adjustment Request."]];
    const at = id=>ORIENT.sections.findIndex(x=>x.id===id);
    return `<div class="ftr-why"><b>Why it matters:</b> Hubstaff is where your training time is tracked. Your To-Dos and notes help the audit team review your work easily, and keep a clear record of what you completed each day. Set them every day, for the session you’re in. Don’t miss this routine.</div>
    <p class="ftr-sub">Everything you need to use Hubstaff during training. Click a lesson to open it.</p>
    <div class="ftr-lessons">${here.map(([id, t, d])=>`<a class="ftr-lesson" href="javascript:void 0" onclick="goToSlide(${at(id)})"><b>${esc(t)}</b><span>${esc(d)}</span></a>`).join("")}
      <a class="ftr-lesson" href="${esc(TODO_GUIDE)}" target="_blank" rel="noopener noreferrer"><b>LSH VA Guide: Create a To-Do ↗</b><span>The guide’s task list for creating to-dos.</span></a>
      ${HOWTO_LESSONS.map(l=>`<a class="ftr-lesson" href="${esc(l.href)}" target="_blank" rel="noopener"><b>${esc(l.title)}</b><span>${esc(l.desc||"")}</span></a>`).join("")}</div>`; }],
  // the Hubstaff To-Dos in one slide, on one page: how to add today's (the steps beside the Hubstaff picture) on top, the 16
  // To-Dos to copy in a grid below (📋 Copy each, 📋 Copy All puts every To-Do on the clipboard, one per line)
  ["todos", "Your Hubstaff To-Dos: How to Add Them", ()=>{
    const row = (t, n)=>`<div class="ftr-todo">
      <span class="ftr-todo-n">${n}</span>
      <span class="ftr-todo-tx"><em>To-Do:</em> ${esc(t)}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(t)}" onclick="ftrCopy(this)">📋 Copy</button></div>`;
    return `<div class="ftr-todos-all ftr-todos-one" data-ftr-max="1">
    <div class="ftr-todos-top"><div class="ftr-part">
      <div class="ftr-part-h">Add Today’s To-Do</div>
      <ol>
        <li>Click <b>📋 Copy</b> next to the session you’re in.</li>
        <li>In the Hubstaff app, click your training project.</li>
        <li>Click in <b>Create a to-do</b>, paste it (Ctrl+V), then click <b>+</b> or press Enter.</li>
        <li>Click the button inside that to-do, at its left, to track your time on it.</li>
      </ol>
      <p class="ftr-tip">More on To-Dos: <a href="${esc(TODO_GUIDE)}" target="_blank" rel="noopener noreferrer">LSH VA Guide | “Create a to-do” task list ↗</a></p></div>
      ${fig(FIGS.todo())}</div>
    <div class="ftr-part ftr-todos">
      <div class="ftr-part-h ftr-todos-h">Your ${TODOS.length} Hubstaff To-Dos <button class="btn btn-navy btn-sm" type="button" data-copy="${esc(TODOS.join("\n"))}" data-toast="Copied all ${TODOS.length} To-Dos, one per line." onclick="ftrCopy(this, '📋 Copy All')">📋 Copy All</button></div>
      <div class="ftr-todos-grid">${TODOS.map((t, i)=>row(t, i + 1)).join("")}</div></div></div>`; }],
  // the steps on the left, the picture (Part 2) big on the right
  ["notes", "How to Create Notes in Hubstaff", ()=>`<div class="ftr-notes"><div class="ftr-parts">${NOTE_PARTS.map((p,i)=>`<div class="ftr-part">
      <div class="ftr-part-h"><span>Part ${i+1}</span>${esc(p.h)}</div>
      <ol>${p.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>
      ${p.tip ? `<p class="ftr-tip">💡 ${esc(p.tip)}</p>` : ""}
    </div>`).join("")}</div>
    ${NOTE_PARTS.filter(p=>p.fig).map(p=>fig(FIGS[p.fig]())).join("")}</div>`],
  ["time-adjustment", "Lost Hours? Manual Time Adjustment Request", ()=>`
    <p class="ftr-sub">If you lose hours on your tracker because of a system issue, send this request by email. Keep it for future reference.</p>
    <div class="ftr-part">
      ${copyRow("Subject", TIME_ADJ.subject)}
      ${copyRow("Send To", TIME_ADJ.to)}
      ${TIME_ADJ.cc.map(c=>copyRow("CC", c[1], c[0])).join("")}
      <p class="ftr-when" style="margin-top:10px!important;"><b>In the Email:</b></p>
      <ul class="ftr-list">${TIME_ADJ.include.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
    </div>`],
  // Breaks and auxes
  ["schedule", "Breaks: Your Schedule and Your Hour of Breaks", ()=>
    rule(`⏰ Hubstaff Tracking Is Strict: ${esc(SHIFT)}`, "We follow a strict schedule. Log out no later than 5:00 PM. No tracking is allowed beyond it.") +
    rule("🕗 Managing Your Time Is Essential", "If you don’t finish a deliverable by the end of your shift, stop tracking and finish it unpaid, since you didn’t manage your time well. You may keep tracking only if you ask your trainer and they approve it.") +
    rule("🕖 Log In Up to 10 Minutes Early", "You may log in up to 10 minutes before your shift, no earlier. Use it to prepare your tools, and as a buffer for any break beyond your 1-hour total.") +
    rule("☕ Breaks: 1 Hour Total, Maximum", "The prescribed total break during training is 1 hour. How you split it is up to you, as long as you don’t go over 1 hour. Going over is your choice only if you accept not getting 8 hours for your shift, since tracking beyond 5:00 PM isn’t allowed.")],
  ["auxes", "Auxes: Reporting Your Status", ()=>`
    <p class="ftr-sub">Your aux is your status: logging in, taking a break, logging out, or an outage. Every time it changes, post the update in both channels during training:</p>
    <div class="ftr-grid">${AUX_CHANNELS.map(c=>`<div class="ftr-chan">
      <div class="ftr-chan-h">${esc(c.ch)}</div>
      <p>${esc(c.what)}</p>
      ${c.rows.map(r=>`<div class="ftr-aux"><span>${esc(r[0])}</span><code>${esc(r[1])}</code></div>`).join("")}
    </div>`).join("")}</div>
    <div class="ftr-rule ftr-rule-aux"><b>🚫 No Double Stamping</b><span>Post each aux once in each channel.</span></div>
    <div class="ftr-part ftr-status">
      <div class="ftr-part-h">💬 Your Discord Profile Status</div>
      <p class="ftr-when">Set your Discord status in this format: <code class="ftr-code">${esc(DISCORD_STATUS.format)}</code></p>
      <p class="ftr-when">For example: <code class="ftr-code">${esc(DISCORD_STATUS.example)}</code> ${esc(DISCORD_STATUS.note)}</p>
    </div>`],
  // Camera, then Discord
  ["camera", "Camera: On in Every Meeting", ()=>
    `<div class="ftr-goal"><b>📷 Your Camera Is Part of Showing Up</b><p>Training is a simulation of working with a client, and your trainers are your first clients: in every meeting and classroom discussion, they see you.</p></div>` +
    rule("📷 Cameras On, Always", "Keep your camera on during every meeting. It tests and gauges your internet speed and connectivity.") +
    `<div class="ftr-grid ftr-cam">${CAMERA.map(c=>`<div class="ftr-part"><div class="ftr-part-h">${c.h}</div><ul class="ftr-list">${c.rows.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div>`).join("")}</div>`],
  ["communication", "Discord: Mindfulness and Response Rates", ()=>
    rule("⏱ Be Mindful of Discord: Reply Within 5 Minutes", "Responsiveness is a key trait of an effective and efficient VA. You’re expected to be in front of your computer during your shift, so there’s no reason not to reply within 5 minutes of a message. Turn on your notifications so you never miss one.") +
    rule("✅ Respond With a Message or Acknowledge With a Reaction", "Acknowledge every instruction and activity posted in your channel, with a message or an emoji reaction, so we know everything was received correctly.") +
    rule("📅 All Meetings and Schedules Are Sent: No Need to Ask", "Every discussion meeting is posted on its day, so you don’t need to ask for it.")],
  // the Training Matrix on its own slide (11), after Discord: the matrix itself embedded on the left, its cover
  // (TRAINING_MATRIX_IMG, the picture in the document) on the right
  ["matrix", "Your Training Matrix", ()=>`
    <p class="ftr-sub">${esc(HABITS[0].matrix.note)} Use it for the <b>On queue for tomorrow</b> part of your EOD email.</p>
    <div class="ftr-matrix"><div class="ftr-keep">${embed(HABITS[0].matrix.url, "Training Matrix", HABITS[0].matrix.url)}</div>
      ${TRAINING_MATRIX_IMG ? `<figure class="ftr-matrix-img"><img src="${esc(TRAINING_MATRIX_IMG)}" alt="Virtual Assistant Training Matrix"></figure>` : ""}</div>`],
  // The 4 daily deliverables: an overview (the tests on the sites the training uses, TESTS), the Daily Task Tracker, the Monitoring Sheet and the EOD email
  ["deliverables", "Your 4 Daily Deliverables", ()=>`
    <p class="ftr-sub">Every training day, these four are yours to deliver. The next slides show your tracker, your Monitoring Sheet and your EOD email; the tests are on the sites below.</p>
    <div class="ftr-lessons ftr-two"><div class="ftr-lesson ftr-tests"><b>🧪 1. Typing and Spelling Tests</b>
      <span>Typing twice a day (in the morning and before the end of your shift), spelling once. Screenshot each result and save it in your VA Output folder as <b>Typing Test [date taken][AM/PM]</b> or <b>Spelling Test [date taken][AM/PM]</b>.</span>
      ${TESTS.map(t=>`<span class="ftr-test-links"><b>${t.icon} ${esc(t.name)}:</b> ${t.links.map(l=>`<a class="btn btn-ghost btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${esc(l[0].replace(/^Alternative:\s*/, ""))} ↗</a>`).join("")}</span>`).join("")}</div>
    ${[["📋", "2. Your Daily Task Tracker", "Before the end of your shift: a Daily Note for every open task, as detailed as you can make it."],
      ["📒", "3. Your Training Monitoring Sheet", "As soon as a discussion is fully covered: the date and 5 takeaways in complete, specific sentences."],
      ["📧", "4. Your EOD Email", "Before the end of every shift, with the template: your accomplishments, 3 learnings and tomorrow’s queue."]].map(([i, t, d])=>`<div class="ftr-lesson"><b>${i} ${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>`],
  ["habits-trackers", `Building Your Habits: ${HABITS[1].name}`, ()=>`
    <p class="ftr-sub">Every training day, before the end of your shift. These build your habits, so that once you start working with your clients it’s easier to adapt.</p>
    <div class="ftr-grid ftr-habit">${habitCard(HABITS[1])}</div>`],
  ["tracker", "Your Daily Task Tracker: The Sheet", ()=>`
    <p class="ftr-sub ftr-sub-big">Make your tracker as comprehensive as possible: fill in every part, for every task, every day.</p>
    <div class="ftr-cols2"><div class="ftr-parts">${tpart("The Top of the Sheet", TRACKER_PARTS.top)}${tpart("The Three Sections", TRACKER_PARTS.sections)}</div>
    <div class="ftr-parts">${tpart("The Columns, Left to Right", TRACKER_PARTS.cols)}</div></div>`],
  ["tracker-tabs", "Your Daily Task Tracker: The Other Tabs and the Daily Check", ()=>`
    <div class="ftr-parts">${tpart("The Other Tabs", TRACKER_PARTS.tabs)}</div>
    <div class="ftr-why" style="margin-top:14px;"><b>The Daily Check:</b> ${esc(TRACKER_PARTS.check)}</div>`],
  ["monitoring", "Rules: Your Training Monitoring Sheet", ()=>`<div class="ftr-keep">` +
    rule("📒 Your Training Monitoring Sheet", "As soon as you are done with all the tasks, make your copy of the monitoring sheet below in your VA Output folder and fill it in there. Share it as “Anyone with the link can view” and save its link on the platform: it’s checked automatically, and your trainer adds their comments.") +
    (window.FT_MONITOR_DOC ? embed(FT_MONITOR_DOC.view, "Training Monitoring Sheet", FT_MONITOR_DOC.open) : "") +
    (FT_AUDIENCE() ? "" : `<div class="ftr-links ftr-mon"><button class="btn btn-navy btn-sm" type="button" onclick="FTDrive.linkMine()">📁 Link My Task Tracker and Monitoring Sheet</button></div>`) + `</div>`],
  ["habits", `Building Your Habits: ${HABITS[0].name}`, ()=>`
    <p class="ftr-sub">Every training day, before the end of your shift. These build your habits, so that once you start working with your clients it’s easier to adapt.</p>
    <div class="ftr-grid ftr-habit">${habitCard(HABITS[0])}</div>`],
  ["eod", "Your EOD Email: The Template", ()=>`
    <div class="ftr-part ftr-eod">
      <div class="ftr-part-h">📧 Your EOD Email</div>
      ${copyRow("Subject", EOD.subject, "or: " + EOD.subjectAlt)}
      ${EOD.parts.map(p=>`<div class="ftr-def"><b>${esc(p[0]).replace(/\//g, "/<wbr>")}</b><span>${esc(p[1])}</span></div>`).join("")}
      <div class="ftr-links" style="margin-top:10px;"><button class="btn btn-navy btn-sm" type="button" data-copy="${esc(EOD.body)}" data-toast="Copied. Paste it in your EOD email." onclick="ftrCopy(this)">📋 Copy the Template</button></div>
    </div>
    <p class="ftr-sub ftr-after">Replace mm/dd/yy with today’s date. Fill in every part. Your detailed learnings go in your tracker.</p>`],
  // Setting of expectations
  ["why", "Setting Expectations: What Training Is", ()=>`
    <div class="ftr-stakes"><b>🎯 Training Is Not the End Goal: You Need to Pass</b>
      <p>Being in training doesn’t mean you can be complacent. Your performance is deliberated every week, and depending on the outcome you can still be let go and have your project ended.</p></div>
    ${rule("💪 Training Is Hard on Purpose, and You Can Overcome It", "The program is intentionally challenging. It prepares you for future client tasks and gives you a feel for the challenges VAs face working in a law firm.")}
    ${rule("🤝 Your Trainers Are Your First Clients", "Training is a simulation of working with a client. For all intents and purposes, your trainers are your first clients: they see if you can really thrive in the legal VA environment. It tests your resilience, how you handle pressure and how well you manage your time.")}
    <p class="ftr-sub">Next: your role as a General VA, the rules for your work and the use of AI, and Free Upskill Training.</p>`],
  ["generalist", "You’re a General VA, Ready for Any Role", ()=>`
    <div class="ftr-goal"><b>🧭 Tagged as General VAs, but You May Be Assigned to Different Roles</b>
      <p>This standard, foundational training gives you the general, basic knowledge of the roles clients most often ask for and what they do. When a client picks you, you can take on the role with ease.</p></div>
    ${rule("🙋 Take Initiative", "Knowing every role lets you take on other work when your tasks run low or what you’re assigned is limited.")}
    ${rule("🛡 Stay Placed", "When a firm restructures, you can move into a different role instead of being laid off.")}
    ${rule("🧱 A Foundation, Not Mastery", "This training gives you the foundation only. Mastery comes once a role is assigned to you: you get further training for it then, or during the Free Trial period, when you do actual client tasks.")}`],
  ["work", "Rules: Your Work and the Use of AI", ()=>
    rule("📛 Follow the Naming Conventions Strictly", "Name your Hubstaff To-Dos, test screenshots and files exactly as given.") +
    rule("🤖 Don’t Rely on AI to Draft or Complete Your Work", "As Legal VAs, you’re trained to draft legal documents from actual case information, instructions and established legal processes. Training develops your own legal reasoning, attention to detail, writing skills and understanding of the case lifecycle. If AI drafts for you, you may produce something that looks correct without understanding why it’s correct, or fail to spot its errors. You may use AI to improve your grammar, spelling and sentence structure.") +
    rule("🔒 Protect Client Information", "Every document we handle is sensitive. It’s protected by attorney-client privilege and confidentiality rules (HIPAA). Uploading case details or sensitive information to an unauthorized AI tool creates serious risks for the client and the law firm. Never paste client, case or medical information into one.") +
    rule("⚖️ AI Is a Tool, Not a Replacement", "It never replaces your understanding, judgment or responsibility as a Legal VA. Some law firms allow AI, depending on the client you’re assigned to.")],
  ["free-skills", "Free Upskill Training: After Your Shift", ()=>`
    <div class="ftr-goal"><b>🌱 Right After Your Shift, for an Hour or So</b>
      <p>These sessions develop important skills beyond the legal training: communication, accent reduction, grammar, email writing and client interviews. They directly affect your performance and professionalism in a law firm.</p></div>
    ${rule("🕔 Unpaid, and Not Mandatory, but Highly Encouraged", "Don’t track your time for them. Everyone is highly encouraged to attend.")}
    ${rule("🙋 Missed a Session? Take the Initiative to Catch Up", "Reach out to your trainers to find out what was covered, review the materials or exercises, and complete the practice on your own time. Missing a session doesn’t mean the lesson no longer applies to you.")}
    <div class="ftr-why"><b>Why It Matters:</b> Attendance isn’t mandatory, but taking initiative is part of being a professional. We provide the opportunity and the resources; you’re responsible for making the effort. Take advantage of these sessions while they’re available: they help you become more confident, capable and prepared when you start working with a law firm.</div>`],
];
// The page splitter (eapa-updates.js) measures each slide with its content at the top: centered, the room
// above it would count as heading and leave less for the content, so a short intro could end up alone on a page.
if(typeof window.paginateSlideUnits === "function" && !window.paginateSlideUnits.__ftr){
  const __pg = window.paginateSlideUnits;
  window.paginateSlideUnits = function(){
    const w = document.getElementById("lessonSlideWrap"), on = !!(w && document.body.classList.contains("ft-orient"));
    if(on) orientLastStep();
    if(on && fitOrient(w)) return;
    if(on){
      w.classList.add("ftr-measure", "ftr-paged");   // too long even at half size: the engine splits it into pages
    }
    try{ return __pg.apply(this, arguments); } finally { if(on) w.classList.remove("ftr-measure"); }
  };
  window.paginateSlideUnits.__ftr = true;
}
// One slide on one sheet, the way the Case Management course fits its slides (fitSlideZoom there): the sheet's content
// is scaled down until it fits, to half size at the smallest, and only a slide that would have to shrink further is
// split into pages by the engine. It also sets the progress line under the lesson's title (--ftr-prog).
// The orientation's last slide goes on to 🧰 Know Your Tools (it has no Activity deck), then the Reading Task: its
// 📋 Classroom Activity button and the banner under it say so (js/ft-day-decks.js sends the button there).
function orientLastStep(){
  const b = document.querySelector('.slide-nav button[onclick^="goToKnowledgeCheckWithInterstitial"]');
  if(b){ b.textContent = "🧰 Next: Know Your Tools →"; b.title = "The orientation is done: go on to Know Your Tools"; }
  const n = document.querySelector(".slide-done-banner");
  if(n) n.textContent = "🎉 That’s the whole orientation. Next: 🧰 Know Your Tools, then the Reading Task, What Is Personal Injury?";
}
function fitOrient(w){
  try{
    const d = DAYS.find(x=>x.id===ORIENT_ID), n = typeof buildDaySlides === "function" && d ? buildDaySlides(d).length : ORIENT.sections.length;
    w.style.setProperty("--ftr-prog", String(Math.min(1, ((state.lessonSlide||0) + 1) / Math.max(1, n))));
  }catch(e){}
  const card = w.querySelector(":scope > .card.lesson-card"), body = card && card.querySelector(":scope > .ft-body");
  w.classList.remove("ftr-paged");
  if(!card || !body || window.innerWidth <= 760) return false;
  w.querySelectorAll(".pg-hide").forEach(x=>x.classList.remove("pg-hide"));
  w.querySelectorAll(".pg-badge").forEach(x=>x.remove());
  w.classList.remove("pg-later", "pg-roomy");
  body.style.zoom = "";
  const over = ()=>card.scrollHeight > card.clientHeight;
  let z = 1;
  while(over() && z > 0.5){ z = Math.round((z - 0.05) * 100) / 100; body.style.zoom = String(z); }
  // a short slide is drawn bigger, so its cards fill the sheet instead of sitting small in the middle of it
  // (a slide can cap it with data-ftr-max: the To-Dos keep their small type)
  const maxEl = body.querySelector("[data-ftr-max]"), maxZ = maxEl ? (parseFloat(maxEl.dataset.ftrMax) || 1) : 1.6;
  if(z === 1 && !over()){
    while(z < maxZ){ const up = Math.round((z + 0.05) * 100) / 100; body.style.zoom = String(up); if(over()){ body.style.zoom = String(z); break; } z = up; }
  }
  if(over()){ body.style.zoom = ""; return false; }
  state.slidePages = 1; state.slidePage = 0;
  if(typeof updateSlidePageUi === "function") updateSlidePageUi();
  // the web fonts can still be arriving: fit again once they have, if the slide then runs over
  if(document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(()=>{ if(w.isConnected && over()) fitOrient(w); });
  setTimeout(()=>{ if(w.isConnected && card.isConnected && over()) fitOrient(w); }, 400);
  // a picture that hasn't loaded yet has no height: fit again once it has
  w.querySelectorAll("img").forEach(img=>{ if(!img.complete && !img.dataset.ftrFit){ img.dataset.ftrFit = "1"; img.addEventListener("load", ()=>{ if(w.isConnected) fitOrient(w); }, {once:true}); } });
  return true;
}
// The slides window shown to the room (Presenter view) has no Task Tracker to open.
function FT_AUDIENCE(){ return typeof PV_IS_AUDIENCE !== "undefined" && PV_IS_AUDIENCE; }

function copyText(t){
  if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
  return new Promise((ok, fail)=>{
    const a = document.createElement("textarea");
    a.value = t; a.setAttribute("readonly", ""); a.style.position = "fixed"; a.style.opacity = "0";
    document.body.appendChild(a); a.select();
    try{ document.execCommand("copy") ? ok() : fail(); }catch(e){ fail(e); }
    a.remove();
  });
}
window.ftrCopy = function(btn, label){
  const t = btn.getAttribute("data-copy"); if(!t) return;
  copyText(t).then(()=>{
    btn.textContent = "✓ Copied"; btn.classList.add("ftr-copied");
    setTimeout(()=>{ btn.textContent = label || "📋 Copy"; btn.classList.remove("ftr-copied"); }, 1600);
    toast(btn.getAttribute("data-toast") || "Copied. Paste it in your Hubstaff To-Do.");
  }).catch(()=>toast("Couldn’t copy. Select the text and copy it instead."));
};

/* ---------- the lesson, beside Virtual Assistant Essentials ---------- */
// A slide's opening line (an intro, a "Why?" box) is shown at the top of every page of its slide, like a
// heading (the page splitter repeats .fp-label), so a page is never just the intro, and every page has it.
function keepLead(html){
  const t = document.createElement("template"); t.innerHTML = html;
  const box = t.content.firstElementChild, first = box && box.firstElementChild;
  if(!first || !first.nextElementSibling || !first.matches(".ftr-sub, .ftr-why, p")) return html;
  first.classList.add("fp-label", "ftr-lead");
  t.content.insertBefore(first, box);   // beside the slide's content, where the splitter reads it as a heading
  return t.innerHTML;
}
const ORIENT_ID = 12;   // not used by any lesson (1–9, and 10–11 in build/lessons/off/)
const ORIENT = {id:ORIENT_ID, title:"Setting of Training Expectations and Company Policies", heading:"Setting of Training Expectations and Company Policies", label:"Day 1 · Orientation", short:"📌",
  sections: SLIDES.map(([id, h, fn])=>({id, h, get html(){ return keepLead(`<div class="ftr-slide">${fn()}</div>`); }})),
  quiz:[], quickChecks:[]};
ORIENT.lessons = ORIENT.sections.map(x=>({h:x.h}));
window.FT_ORIENTATION = ORIENT;
// Looked up by id like a lesson, but not counted as one (see the top of this file).
const __find = Array.prototype.find, __some = Array.prototype.some;
Object.defineProperty(DAYS, "find", {configurable:true, writable:true, value:function(fn, that){
  const r = __find.call(this, fn, that);
  return r !== undefined ? r : (fn.call(that, ORIENT, this.length, this) ? ORIENT : undefined);
}});
Object.defineProperty(DAYS, "some", {configurable:true, writable:true, value:function(fn, that){
  return __some.call(this, fn, that) || !!fn.call(that, ORIENT, this.length, this);
}});
// Always open, for every trainee and batch.
const __unlocked = window.dayUnlocked;
window.dayUnlocked = function(id){ return Number(id)===ORIENT_ID ? true : __unlocked.apply(this, arguments); };

// Dashboard: window.FT_ORIENTATION (set above) is shown pinned ahead of the lesson grid by
// js/lsh-program.js's renderModules(), the only landing-page format now.

(function(){ const s = document.createElement("style"); s.id = "ft-rules"; s.textContent = `
/* inside a slide (.ft-body): buttons and links keep their own colors */
.ftr-slide a.btn-ghost, .ft-body .ftr-slide a.btn-ghost{color:var(--navy);} .ftr-slide a.btn-ghost:hover{color:var(--navy);}
.ftr-slide p{margin:0;} .ftr-slide .ftr-sub{margin:0 0 12px;} .ftr-slide .ftr-after{margin-top:12px;}
.ftr-mon{margin:10px 0 0;} .ftr-mon a.btn{text-decoration:none;}
.ftr-embed{position:relative;width:100%;height:max(340px, 52vh);border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#F6F7FB;margin-top:10px;}
.ftr-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;}
.ftr-embed-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:14px;color:var(--ink-soft);} .ftr-embed-bar a.btn{text-decoration:none;}
/* Full screen and the slides window: the page fills the screen (no width cap, no presenter column) and scales up. */
.lesson-stage:fullscreen .stage-body:has(.ftr-slide), #audienceRoot .stage-body:has(.ftr-slide){grid-template-columns:minmax(0,1fr) !important;}
.lesson-stage:fullscreen .stage-body:has(.ftr-slide) .stage-presenter, #audienceRoot .stage-body:has(.ftr-slide) .stage-presenter{display:none !important;}
.lesson-stage:fullscreen #lessonSlideWrap:has(.ftr-slide), #audienceRoot #lessonSlideWrap:has(.ftr-slide){align-items:stretch !important;}
.lesson-stage:fullscreen #lessonSlideWrap:has(.ftr-slide) > *, #audienceRoot #lessonSlideWrap:has(.ftr-slide) > *{max-width:none !important;width:100% !important;}
.lesson-stage:fullscreen .lesson-card:has(.ftr-slide), #audienceRoot .lesson-card:has(.ftr-slide){max-width:none !important;width:100%;}
.lesson-stage:fullscreen .ftr-sub, #audienceRoot .ftr-sub{max-width:none;} .lesson-stage:fullscreen .ftr-why, #audienceRoot .ftr-why{max-width:none;}
@media (min-width:1500px){ .lesson-stage:fullscreen .ftr-slide, #audienceRoot .ftr-slide{zoom:1.15;} .lesson-stage:fullscreen .ftr-embed, #audienceRoot .ftr-embed{height:62vh;} }
@media (min-width:1900px){ .lesson-stage:fullscreen .ftr-slide, #audienceRoot .ftr-slide{zoom:1.35;} }
.ftr-card-sub{margin:0;font-size:14px;color:var(--ink-soft);font-weight:600;}
/* numbered lists on a slide: the numbers, without the slide's bullet dots */
.lesson-stage #lessonSlideWrap .lesson-card .ftr-slide li, .lesson-card .ftr-slide li{text-align:left;}
.lesson-card .ftr-slide ol{list-style:decimal;padding-left:24px;}
.lesson-stage #lessonSlideWrap .lesson-card .ftr-slide ol > li, .lesson-card .ftr-slide ol > li{padding-left:2px;}
.lesson-stage #lessonSlideWrap .lesson-card .ftr-slide ol > li::before, .lesson-card .ftr-slide ol > li::before{content:none;display:none;}
.ftr-sub{margin:0 0 14px;color:var(--ink-soft);font-size:15.5px;max-width:820px;} .ftr-sub b{color:var(--ink);}
.ftr-sub.ftr-sub-big{font-size:22px;font-weight:700;color:var(--ink);line-height:1.35;max-width:none;}
.ftr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px;}
.ftr-rule{background:var(--danger-bg);border:1px solid #E9C9C3;border-left:5px solid var(--danger);border-radius:12px;padding:12px 16px;margin-bottom:10px;}
.ftr-rule-aux{margin-top:14px;}
/* The Orientation slides, drawn like the Activity decks and the Case Management course's Case Flow slides: a
   glass navy card with line ornaments at three corners, the lesson's orange-outlined title with its progress
   line under it, the slide's title on a centred ribbon, and the content on a white sheet. A slide is scaled to
   fit its sheet (fitOrient below), not split into pages. The title and the ribbon are drawn by the slide itself
   (::before, ::after, the ribbon from data-title set by fitPages in ft-slides.js), so they keep their size when the
   content is scaled; the progress line is a background layer, its length from --ftr-prog. */
body.ft-orient #lessonSlideWrap{position:relative;container-type:inline-size;
  background-color:rgba(30,35,64,.92) !important;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' fill='none' stroke-linecap='round'%3E%3Cg transform='rotate(180 48 48)'%3E%3Cpath d='M12 14V84H82' stroke='%23DB8437' stroke-width='1.6'/%3E%3Cpath d='M6 30V66M30 90H66' stroke='%238E97C4' stroke-width='1.2'/%3E%3Ccircle cx='12' cy='14' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='82' cy='84' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='6' cy='30' r='1.6' fill='%238E97C4'/%3E%3Ccircle cx='66' cy='90' r='1.6' fill='%238E97C4'/%3E%3C/g%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' fill='none' stroke-linecap='round'%3E%3Cg transform='translate(0 0)'%3E%3Cpath d='M12 14V84H82' stroke='%23DB8437' stroke-width='1.6'/%3E%3Cpath d='M6 30V66M30 90H66' stroke='%238E97C4' stroke-width='1.2'/%3E%3Ccircle cx='12' cy='14' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='82' cy='84' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='6' cy='30' r='1.6' fill='%238E97C4'/%3E%3Ccircle cx='66' cy='90' r='1.6' fill='%238E97C4'/%3E%3C/g%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' fill='none' stroke-linecap='round'%3E%3Cg transform='matrix(-1 0 0 1 96 0)'%3E%3Cpath d='M12 14V84H82' stroke='%23DB8437' stroke-width='1.6'/%3E%3Cpath d='M6 30V66M30 90H66' stroke='%238E97C4' stroke-width='1.2'/%3E%3Ccircle cx='12' cy='14' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='82' cy='84' r='2.2' fill='%23DB8437'/%3E%3Ccircle cx='6' cy='30' r='1.6' fill='%238E97C4'/%3E%3Ccircle cx='66' cy='90' r='1.6' fill='%238E97C4'/%3E%3C/g%3E%3C/svg%3E"),linear-gradient(#E8913A,#E8913A),linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)) !important;
  background-position:right top,left bottom,right bottom,24px 60px,24px 60px !important;
  background-size:96px 96px,96px 96px,96px 96px,calc((100% - 144px) * var(--ftr-prog, 0)) 5px,calc(100% - 144px) 5px !important;
  background-repeat:no-repeat !important;
  border:1px solid rgba(255,255,255,.14) !important;border-radius:20px !important;box-shadow:0 18px 40px -22px rgba(20,24,48,.65) !important;
  padding:124px 20px 16px !important;justify-content:flex-start !important;align-items:stretch !important;}
body.ft-orient #lessonSlideWrap::before{content:"Setting of Training Expectations and Company Policies";position:absolute;top:14px;left:22px;right:120px;z-index:2;pointer-events:none;
  background:none;border:0;clip-path:none;padding:2px 0 2px 4px;width:auto;height:auto;bottom:auto;
  font:800 clamp(18px,1.8vw,28px)/1.15 'Poppins','Inter',sans-serif;color:#fff;letter-spacing:.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  -webkit-text-stroke:4px #DB8437;paint-order:stroke fill;text-shadow:0 4px 0 rgba(0,0,0,.18);}
body.ft-orient #lessonSlideWrap[data-title]::after{content:attr(data-title);position:absolute;top:74px;left:20px;right:20px;width:auto;height:auto;bottom:auto;z-index:2;pointer-events:none;clip-path:none;
  display:block;text-align:center;background:linear-gradient(90deg,#343C66 0%,#46508A 50%,#343C66 100%);border:0;border-bottom:3px solid #DB8437;border-radius:6px;
  color:#fff;font:800 clamp(13px,1.1vw,17px)/1.25 'Poppins','Inter',sans-serif;letter-spacing:.04em;text-transform:uppercase;padding:8px 24px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:none;}
/* (no ribbon text until fitPages sets data-title: the engine's own corner shapes are off either way) */
body.ft-orient #lessonSlideWrap:not([data-title])::after{display:none;}
/* the opening line, repeated on each page when a slide is split (a .fp-label for the page splitter), keeps its own look */
.lesson-stage #lessonSlideWrap .fp-label.ftr-lead{display:block;font-family:inherit;font-size:inherit;font-weight:inherit;letter-spacing:normal;text-transform:none;line-height:1.5;margin:0 0 12px;}
.lesson-stage #lessonSlideWrap .fp-label.ftr-sub.ftr-lead{color:var(--ink-soft);text-align:left;}
.lesson-stage #lessonSlideWrap .fp-label.ftr-why.ftr-lead{color:var(--ink);}
body.ft-orient #lessonSlideWrap.pg-later[data-title]::after{content:attr(data-title) "  · continued";}
/* the slide's own label and title stay in the page (Listen, page splitting) unseen */
body.ft-orient #lessonSlideWrap > .topic-separator, body.ft-orient #lessonSlideWrap > .card.lesson-card > h4{position:absolute !important;visibility:hidden;pointer-events:none;height:0;overflow:hidden;margin:0 !important;padding:0 !important;}
body.ft-orient #lessonSlideWrap > .pg-badge, body.ft-orient #lessonStage #lessonSlideWrap > .pg-badge{left:auto !important;width:auto !important;max-width:none !important;}
/* the white sheet: it takes the room under the ribbon, and what is on it sits in the middle of it */
body.ft-orient #lessonSlideWrap > .card.lesson-card{position:static;width:auto;align-self:stretch;margin:0 !important;flex:1 1 auto;min-height:0;overflow:hidden;
  display:flex !important;flex-direction:column;justify-content:safe center;
  background:#fff !important;border:1px solid rgba(255,255,255,.6) !important;border-radius:14px !important;box-shadow:0 8px 22px rgba(0,0,0,.18) !important;padding:18px 24px !important;}
body.ft-orient #lessonSlideWrap.ftr-measure > .card.lesson-card{justify-content:flex-start !important;}
/* a slide split into pages: its sheet holds the whole of each page (the engine measures what runs past the slide) */
body.ft-orient #lessonSlideWrap.ftr-paged > .card.lesson-card{flex:1 0 auto;overflow:visible;justify-content:flex-start !important;}
body.ft-orient #lessonSlideWrap > .card.lesson-card > .ft-body{width:100%;max-width:none;margin:0 auto !important;flex:0 0 auto;background:transparent;border-radius:0;padding:0 !important;box-shadow:none;}
/* full screen and the slides window too (their rules make the slide a block and its parts full width) */
body.ft-orient #lessonStage #lessonSlideWrap, body.ft-orient #audienceRoot #lessonSlideWrap{display:flex !important;flex-direction:column !important;}
body.ft-orient #lessonStage #lessonSlideWrap > .card.lesson-card, body.ft-orient #audienceRoot #lessonSlideWrap > .card.lesson-card{width:auto !important;max-width:none !important;min-height:0 !important;}
/* the type, as the Case Management slides set it: Inter 500 at 17px, bold at 700, headings in Poppins */
body.ft-orient #lessonSlideWrap .ftr-slide{font:500 18.5px/1.45 'Inter',system-ui,sans-serif;color:#1B1E2E;}
body.ft-orient #lessonSlideWrap .ftr-slide :is(b,strong){font-weight:700;}
body.ft-orient #lessonSlideWrap .ftr-slide :is(.ftr-part-h,.ftr-chan-h,.ftr-goal > b,.ftr-stakes > b,.ftr-rule > b,.ftr-lesson > b){font-family:'Poppins','Inter',sans-serif;font-weight:800;}
/* an embedded sheet (Monitoring Sheet, sample tracker) and the Hubstaff pictures fit the sheet */
body.ft-orient #lessonSlideWrap .ftr-embed{height:max(220px, min(34vh, 24cqw)) !important;}
body.ft-orient #lessonSlideWrap .ftr-fig svg{max-height:min(34vh, 25cqw);}
body.ft-orient #lessonSlideWrap .ftr-chan .ftr-aux{padding:5px 0;}
body.ft-orient #lessonSlideWrap .ftr-chan p{margin:4px 0 6px;}
body.ft-orient #lessonSlideWrap .ftr-lesson{cursor:pointer;}
/* bigger type on the sheet: the boxes, rules, lists and cards all at 18px, their headings at 21px (a slide too long for
   its sheet is still scaled down to fit, by fitOrient) */
body.ft-orient #lessonSlideWrap :is(.ftr-sub, .ftr-why, .ftr-goal p, .ftr-stakes p, .ftr-rule span, .ftr-lesson span, .ftr-list, .ftr-list li, .ftr-part ol, .ftr-part li, .ftr-def, .ftr-when, .ftr-aux, .ftr-tip, .ftr-chan p){font-size:18px !important;line-height:1.45 !important;}
/* the 16 To-Dos stay smaller, one line each */
body.ft-orient #lessonSlideWrap .ftr-todo-parts .ftr-todo-tx{font-size:14.5px !important;line-height:1.3 !important;}
body.ft-orient #lessonSlideWrap :is(.ftr-goal b, .ftr-stakes b, .ftr-rule b, .ftr-lesson b, .ftr-part-h, .ftr-chan-h){font-size:21px !important;}
/* the content takes the sheet's whole width (no narrow column in the middle of it) */
body.ft-orient #lessonSlideWrap :is(.ftr-sub, .ftr-why, .ftr-stakes p, .ftr-habit){max-width:none !important;}
body.ft-orient #lessonSlideWrap .ftr-lessons.ftr-two{grid-template-columns:repeat(2,minmax(0,1fr)) !important;}
body.ft-orient #lessonSlideWrap .ftr-tests span b{font-size:inherit !important;font-family:inherit !important;}
body.ft-orient #lessonSlideWrap .ftr-test-links{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px;}
body.ft-orient #lessonSlideWrap .ftr-test-links .btn{text-decoration:none;font-size:14px !important;padding:4px 10px !important;min-height:0 !important;}
body.ft-orient #lessonSlideWrap .ftr-cam{grid-template-columns:repeat(3,minmax(0,1fr)) !important;margin-top:4px;}
body.ft-orient #lessonSlideWrap .ftr-cam .ftr-part{padding:12px 14px;}
@media(max-width:900px){ body.ft-orient #lessonSlideWrap .ftr-cam{grid-template-columns:minmax(0,1fr) !important;} }
body.ft-orient #lessonSlideWrap div.ftr-lesson{cursor:default;}
/* How to Create Notes: the steps beside a big Hubstaff picture, framed in navy so it stands out on the white sheet */
body.ft-orient #lessonSlideWrap .ftr-notes{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:18px;align-items:center;}
body.ft-orient #lessonSlideWrap .ftr-notes .ftr-parts{gap:10px;}
/* Your Hubstaff To-Dos: how to add one (steps and picture) on the left, the To-Dos to copy on the right */
body.ft-orient #lessonSlideWrap .ftr-todos-one{display:flex;flex-direction:column;gap:12px;}
body.ft-orient #lessonSlideWrap .ftr-todos-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:16px;align-items:start;}
body.ft-orient #lessonSlideWrap .ftr-todos-top .ftr-fig{margin:0;}
body.ft-orient #lessonSlideWrap .ftr-todos-top .ftr-fig svg{min-width:0;max-height:min(34vh, 25cqw);}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todos{margin-top:0;}
body.ft-orient #lessonSlideWrap .ftr-todos-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:18px;}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todo{padding:3px 0;gap:8px;flex-wrap:nowrap;align-items:center;}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todo-tx{flex:1;min-width:0;font-size:13px !important;line-height:1.25 !important;}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todo-tx em{display:none;}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todo .btn{padding:2px 8px !important;font-size:11px !important;min-height:0 !important;white-space:nowrap;}
body.ft-orient #lessonSlideWrap .ftr-todos-one .ftr-todo-n{width:20px;height:20px;font-size:10px;flex:none;}
body.ft-orient #lessonSlideWrap .ftr-todos-h{display:flex;align-items:center;justify-content:space-between;gap:10px;}
@media(max-width:900px){ body.ft-orient #lessonSlideWrap .ftr-todos-top, body.ft-orient #lessonSlideWrap .ftr-todos-grid{grid-template-columns:minmax(0,1fr);} }
body.ft-orient #lessonSlideWrap .ftr-notes-wide{grid-template-columns:minmax(0,1fr) minmax(0,1.75fr);}
body.ft-orient #lessonSlideWrap .ftr-notes .ftr-part{padding:12px 16px;}
body.ft-orient #lessonSlideWrap .ftr-notes .ftr-fig{margin:0;}
body.ft-orient #lessonSlideWrap .ftr-fig .ftr-fig-scroll{background:#1E2340;padding:10px;box-shadow:0 6px 18px rgba(30,35,64,.28);}
body.ft-orient #lessonSlideWrap .ftr-notes .ftr-fig svg{min-width:0;max-height:none;border-radius:6px;}
/* every card in high contrast, like the tables: a navy border, a navy heading bar with an orange rule, darker text */
body.ft-orient #lessonSlideWrap :is(.ftr-part, .ftr-chan):not(:has(> .ftr-def)){background:#fff;border:2px solid #343C66;box-shadow:0 4px 14px rgba(30,35,64,.14);}
body.ft-orient #lessonSlideWrap :is(.ftr-part, .ftr-chan):has(> :is(.ftr-part-h, .ftr-chan-h):first-child):not(:has(> .ftr-def)){padding:0 18px 14px;overflow:hidden;}
body.ft-orient #lessonSlideWrap :is(.ftr-part, .ftr-chan):not(:has(> .ftr-def)) > :is(.ftr-part-h, .ftr-chan-h):first-child{background:#1E2340;color:#fff !important;margin:0 -18px 12px;padding:10px 18px;border-bottom:3px solid #E8590C;}
body.ft-orient #lessonSlideWrap .ftr-to{background:#1E2340;color:#fff;border-left:4px solid #E8590C;} body.ft-orient #lessonSlideWrap .ftr-to b{color:#F4B77A;}
body.ft-orient #lessonSlideWrap .ftr-eg{background:#EEF1F8;border-left:4px solid #343C66;color:#1B1E2E;}
body.ft-orient #lessonSlideWrap .ftr-lesson{border:1.5px solid #343C66;border-left:5px solid #E8590C;box-shadow:0 3px 10px rgba(30,35,64,.12);}
body.ft-orient #lessonSlideWrap .ftr-lesson b{color:#1E2340;} body.ft-orient #lessonSlideWrap .ftr-lesson span{color:#2B2F45;}
body.ft-orient #lessonSlideWrap .ftr-why{border:1.5px solid #E8590C;border-left:5px solid #E8590C;color:#1B1E2E;}
body.ft-orient #lessonSlideWrap .ftr-goal{border:1.5px solid #E8590C;border-left:5px solid #E8590C;}
body.ft-orient #lessonSlideWrap .ftr-rule{border:1.5px solid #C0392B;border-left:5px solid #C0392B;}
body.ft-orient #lessonSlideWrap :is(.ftr-chan p, .ftr-tip, .ftr-aux small, .ftr-sub){color:#2B2F45;}
/* Send Your EOD Email: the card beside the embedded Training Matrix */
/* Your Training Matrix: the matrix embedded on the left, its cover picture on the right */
body.ft-orient #lessonSlideWrap .ftr-matrix{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:start;}
body.ft-orient #lessonSlideWrap .ftr-matrix:has(.ftr-matrix-img){grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);}
body.ft-orient #lessonSlideWrap .ftr-matrix .ftr-embed{height:max(320px, min(56vh, 34cqw)) !important;}
body.ft-orient #lessonSlideWrap .ftr-matrix-img{margin:0;} body.ft-orient #lessonSlideWrap .ftr-matrix-img img{display:block;width:100%;height:auto;border:2px solid #343C66;border-radius:12px;box-shadow:0 4px 14px rgba(30,35,64,.14);}
@media(max-width:900px){ body.ft-orient #lessonSlideWrap .ftr-matrix{grid-template-columns:minmax(0,1fr);} }
/* The Sheet: two columns, so its three tables fill the width */
body.ft-orient #lessonSlideWrap .ftr-cols2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.45fr);gap:14px;align-items:start;}
body.ft-orient #lessonSlideWrap .ftr-cols2 .ftr-def{grid-template-columns:minmax(0,36%) minmax(0,1fr);}
@media(max-width:900px){ body.ft-orient #lessonSlideWrap :is(.ftr-notes, .ftr-cols2){grid-template-columns:minmax(0,1fr);} }
/* the term/definition tables in high contrast: a navy heading bar, the terms in a shaded column, darker row lines */
body.ft-orient #lessonSlideWrap .ftr-part:has(> .ftr-def){background:#fff;border:2px solid #343C66;padding:0;overflow:hidden;}
body.ft-orient #lessonSlideWrap .ftr-part:has(> .ftr-def) > .ftr-part-h{background:#1E2340;color:#fff !important;padding:10px 16px;margin:0;border-bottom:3px solid #E8590C;}
body.ft-orient #lessonSlideWrap .ftr-def{border-top:1px solid #AEB6CA;padding:0;margin:0;gap:0;align-items:stretch;}
body.ft-orient #lessonSlideWrap .ftr-def:first-of-type{border-top:0;margin-top:0;}
body.ft-orient #lessonSlideWrap .ftr-def b{background:#E1E7F5;color:#1E2340;font-weight:800;padding:9px 14px;border-right:2px solid #343C66;}
body.ft-orient #lessonSlideWrap .ftr-def span{color:#0F1222;padding:9px 14px;}
body.ft-orient #lessonSlideWrap .ftr-def:nth-of-type(odd) span{background:#F4F6FB;}
body.ft-orient #lessonSlideWrap .ftr-part:has(> .ftr-def) > :not(.ftr-def):not(.ftr-part-h){margin:10px 16px;}
body.ft-orient #lessonSlideWrap .ftr-part:has(> .ftr-def) > .ftr-aux{border-top:0;border-bottom:2px solid #343C66;margin:0 !important;padding:10px 16px !important;background:#fff;}
body.ft-orient #lessonSlideWrap .ftr-def b{overflow-wrap:normal;word-break:normal;}
body.ft-orient #lessonSlideWrap .ftr-eod .ftr-def{grid-template-columns:minmax(0,34%) minmax(0,1fr);}
/* in the middle of the sheet: narrower boxes and short rows of cards are centered */
body.ft-orient #lessonSlideWrap :is(.ft-body > *, .ftr-slide > *, .ftr-keep > *){margin-left:auto !important;margin-right:auto !important;}
body.ft-orient #lessonSlideWrap :is(.ftr-grid, .ftr-lessons){grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)) !important;}
.ftr-lessons{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px;margin-top:10px;}
.ftr-lesson{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border:1px solid var(--line);border-left:4px solid var(--orange);border-radius:10px;background:#fff;color:var(--ink);text-decoration:none;}
.ftr-lesson:hover{border-color:var(--orange);box-shadow:var(--shadow);}
.ftr-lesson b{font-size:16px;color:var(--navy);} .ftr-lesson span{font-size:14px;color:var(--ink-soft);}
.ftr-stakes{background:var(--navy);color:#fff;border-radius:var(--radius);padding:16px 20px;margin-bottom:16px;box-shadow:var(--shadow);}
.ftr-goal{background:#FBEBDD;border:1px solid var(--orange-soft);border-left:5px solid var(--orange);border-radius:var(--radius);padding:14px 18px;margin-bottom:16px;}
.ftr-goal b{display:block;font-size:17px;color:var(--orange-deep);} .ftr-goal p{margin:6px 0 0!important;font-size:15.5px;line-height:1.55;}
.ftr-rshots{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:14px;align-items:start;}
.ftr-rshots figure{margin:0;} .ftr-rshots a{display:flex;align-items:flex-start;justify-content:center;background:#313338;border:1px solid var(--line);border-radius:10px;padding:6px;box-shadow:var(--shadow);}
.ftr-rshots img{display:block;max-width:100%;height:auto;border-radius:6px;}
.ftr-rshots figcaption{margin-top:6px;font-size:14px;color:var(--ink-soft);text-align:center;}
@media (max-width:760px){ .ftr-rshots{grid-template-columns:1fr;} }
.ftr-stakes b{display:block;font-size:18px;color:var(--orange-soft);} .ftr-stakes p{margin:6px 0 0;font-size:15.5px;line-height:1.55;max-width:900px;}
.ftr-why{background:#FBEBDD;border:1px solid var(--orange-soft);border-radius:12px;padding:12px 16px;margin-bottom:14px;font-size:15.5px;max-width:900px;} .ftr-why b{color:var(--orange-deep);}
.ftr-test{display:flex;flex-direction:column;gap:8px;} .ftr-test .ftr-aux{border-top:0;padding:0;}
.ftr-when{margin:0!important;font-size:15px!important;color:var(--ink)!important;}
.ftr-links{display:flex;gap:8px;flex-wrap:wrap;} .ftr-links a.btn{text-decoration:none;}
.ftr-after{margin-top:14px;}
.ftr-list{margin:0;padding-left:20px;font-size:15px;line-height:1.5;} .ftr-list li{margin-bottom:4px;}
.ftr-aux small{font-size:14px;color:var(--ink-soft);} .ftr-aux a.btn{text-decoration:none;flex-shrink:0;}
.ftr-sub a{color:var(--orange-deep);font-weight:700;}
.ftr-eg{background:var(--bg);border-radius:10px;padding:10px 12px;font-size:14.5px;display:flex;flex-direction:column;gap:6px;}
.ftr-code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14.5px;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--ink);}
.ftr-def{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:4px 16px;border-top:1px solid var(--line);padding:9px 0;font-size:15px;} .ftr-def:first-of-type{margin-top:8px;}
.ftr-def b{color:var(--navy);} .ftr-def span{color:var(--ink);}
@media (max-width:620px){ .ftr-def{grid-template-columns:1fr;} }
.ftr-status{margin-top:14px;} .ftr-status .ftr-when{margin-top:6px!important;}
.ftr-copyrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;min-width:0;} .ftr-copyrow .ftr-code{overflow-wrap:anywhere;}
.ftr-to{background:var(--bg);border-radius:10px;padding:8px 12px;font-size:15px;display:flex;flex-direction:column;gap:2px;} .ftr-to b{font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);} .ftr-to span{overflow-wrap:anywhere;}
.ftr-rule b{display:block;font-size:17px;color:var(--danger);} .ftr-rule span{display:block;margin-top:4px;font-size:15px;color:var(--ink);}
.ftr-chan,.ftr-part{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;}
.ftr-chan-h{font-size:17px;color:#5865F2;font-weight:800;} .ftr-chan p{margin:6px 0 10px;font-size:15px;color:var(--ink-soft);}
.ftr-aux{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding:8px 0;font-size:15px;}
.ftr-aux code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;font-weight:800;background:var(--navy);color:#fff;border-radius:6px;padding:3px 10px;}
.ftr-todos{padding:6px 14px;margin-top:14px;}
.ftr-todos-top{display:flex;align-items:center;justify-content:space-between;gap:14px;}
.ftr-todos-top .ftr-sub{margin:0 !important;text-align:left;}
.ftr-todos-top .btn{flex:0 0 auto;}
/* one block, so the slide stays one page (scaled a little to fit a small screen, never split) */
.ftr-todos-all, .ftr-keep{display:flow-root;}
.ftr-habit{grid-template-columns:1fr !important;max-width:980px;margin:0 auto;}
.ftr-todo-parts{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;}
.ftr-todo-parts .ftr-todo .btn, .ftr-todos-top .btn{padding:4px 11px !important;font-size:12.5px !important;min-height:0 !important;line-height:1.3 !important;}
.ftr-todo-parts .ftr-todo-tx em{display:none;}   /* the parts' headers say To-Dos */
.ftr-todo-parts .ftr-todo-n{width:22px;height:22px;font-size:11.5px;}
.ftr-todo-parts .ftr-part-h{margin-bottom:2px;}
.ftr-todos-all .ftr-after{margin-top:8px !important;font-size:13.5px;}
.ftr-todo-parts .ftr-todos{margin-top:10px;}
.ftr-todo-parts .ftr-todo{padding:3px 0;gap:10px;flex-wrap:nowrap;}
.ftr-todo-parts .ftr-todo-tx{flex:1 1 auto;min-width:0;font-size:13.5px;line-height:1.3;}
@media(max-width:900px){ .ftr-todo-parts{grid-template-columns:1fr;} .ftr-todos-top{flex-direction:column;align-items:stretch;} }
.ftr-parts{display:flex;flex-direction:column;gap:14px;}
.ftr-fig{margin:12px 0 0;} .ftr-fig-scroll{overflow-x:auto;border-radius:10px;}
.ftr-swipe{display:none;margin-top:6px;font-size:13.5px;color:var(--ink-soft);}
.ftr-fig svg{display:block;width:100%;min-width:620px;height:auto;font-family:"Segoe UI",Arial,sans-serif;font-weight:400;}
.ftr-todo{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line);} .ftr-todo:first-child{border-top:0;}
.ftr-todo-n{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--bg);color:var(--ink-soft);font-size:13.5px;display:flex;align-items:center;justify-content:center;}
.ftr-todo-tx{flex:1;min-width:0;font-size:15px;overflow-wrap:anywhere;} .ftr-todo-tx em{font-style:normal;color:var(--orange-deep);font-size:13.5px;margin-right:4px;}
.ftr-todo .btn{flex-shrink:0;} .ftr-copied{color:var(--success)!important;border-color:var(--success)!important;}
.ftr-part-h{font-size:17px;color:var(--navy);font-weight:800;} .ftr-part-h span{display:inline-block;margin-right:8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:var(--orange-deep);border-radius:999px;padding:2px 9px;vertical-align:2px;}
.ftr-part ol{margin:10px 0 0;padding-left:20px;font-size:15.5px;line-height:1.5;} .ftr-part li{margin-bottom:4px;}
.ftr-tip{margin:8px 0 0;font-size:14.5px;color:var(--ink-soft);}
@media (max-width:520px){ .ftr-todo{flex-wrap:wrap;} .ftr-todo .btn{margin-left:38px;} }
`; document.head.appendChild(s); })();
})();
