/* ============================================================
   Training Orientation and Rules
   Loaded after js/ft-tracker.js, before js/ft-simulators.js (so its dashboard
   card sits above the Simulators card). The dashboard card opens #/rules.
     • Rules: strict tracking 8 AM – 5 PM PST; breaks 15-30-15 or one full hour; cameras on in
       discussions; naming conventions followed strictly.
     • Auxes: reporting your status in the two Discord channels, no double stamping.
     • #training-reminders (Day 1 → Training Reminders), with its screenshots.
     • Daily habits: the EOD email and updating the trackers, from #training-reminders' Deliverables,
       with the guide's links (Day 0's Onboarding Orientation, Day 1's Training Monitoring Sheet).
       Templates: coming soon.
     • Typing and spelling tests (Day 1's Setting of Expectations): why (the client expects 60 WPM),
       when, the links, and saving each result in the trainee folder.
     • Your Hubstaff To-Dos: the guide's To-Do names, each with 📋 Copy (the name only,
       without the "To-Do:" label) to paste into the Hubstaff to-do list.
     • How to create notes in Hubstaff: part by part.
     • Two pictures of the Hubstaff app, drawn after the trainer's screenshots (SVG, so
       they stay sharp): the to-do list, with an arrow on the button inside the day's
       to-do, and the Add Work Notes box.
     • From Day 0's Onboarding Orientation: the Discord profile status format and the Manual Time
       Adjustment Request.
     • Day 1's Reading Task (Personal Injury Cases), with its file name to copy.
     • Hubstaff how-to lessons: HOWTO_LESSONS, empty until the lessons are provided.
   ============================================================ */
(function(){
const SHIFT = "8:00 AM – 5:00 PM PST";

// Auxes: where and what to type in Discord.
const AUX_CHANNELS = [
  {ch:"#⏳-timestamps", what:"The LSH BOT channel. Type the command for your status; LSH BOT replies to confirm it.",
   rows:[["Start of your shift", "!in"], ["Back from a break", "!back"]], bot:true},
  {ch:"#batch-group-channel", what:"Your batch’s channel. Type In at exactly 8:00 AM PST, when you start your Hubstaff.",
   rows:[["Start of your shift", "In"]]}
];

// Daily habits. Links from the guide: Day 0 → Onboarding Orientation (Training Matrix, sample
// updated trackers) and Day 1 → Training Monitoring Sheet. soon: until the templates are provided.
const HABITS = [
  {icon:"📧", name:"Send your EOD email", lines:[
    "Email your EOD (end-of-day) report before the end of every shift.",
    "Make it as comprehensive as possible: at least 2 sentences for each item, ideally more.",
    "Include at least 3 key learnings from the tasks you completed that day."],
   to:["martin@legalsupporthelp.com", "michelle.velarde@legalsupporthelp.com"],
   links:[["Training Matrix", "https://docs.google.com/document/d/1fJnSYHyCFBE2XZP1s43pBc6pE6GV44o_a1BKzO0z4Ys/edit?tab=t.0", "your training flow, for your tasks on queue for tomorrow"]],
   soon:"The EOD template will be added here soon."},
  {icon:"📋", name:"Update your trackers", tracker:true, lines:[
    "Update your LSH Daily Task Tracker every day, before the end of your shift: every open task gets a Daily Note for the day.",
    "Make your tracker as comprehensive and detailed as possible, and keep it organized: fill in every part (explained below). You can transfer your discussion notes for reference.",
    "Update your Training Monitoring Sheet in your trainee folder within the shift, as soon as a topic is fully covered: the date, and all 5 takeaways in complete, specific sentences."],
   example:["I learned about auto liability.", "Auto liability insurance covers damages and injuries caused to others in an accident where the policyholder is at fault, including both bodily injury and property damage."],
   links:[["Sample updated trackers", "https://docs.google.com/spreadsheets/d/1oaquY4HnuUh2Kqf1T1MKZiHMDChnDHMo/edit?gid=2024469516#gid=2024469516", "the LSH Daily Task Tracker, filled in"],
          ["Training Monitoring Sheet", "https://docs.google.com/document/d/1Ty9HXeWRCxqM78quiiEHqFYxZwGeT9Uh/edit?usp=sharing&ouid=107426275770887856664&rtpof=true&sd=true", "download it, then upload it to your trainee folder"]],
   soon:"The tracker templates will be added here soon."}
];

// The LSH Daily Task Tracker, part by part (the parts of js/ft-tracker.js's sheet).
const TRACKER_PARTS = {
  top:[["Status counts (rows 1–5)", "How many of your tasks are New, Pending for >3 days, Ongoing, Priority - Ongoing and Completed. They count themselves from each task’s Status."]],
  sections:[["⬇ FOR COMPLETION ⬇", "The tasks you’re working on. Add a row for each new task."],
            ["⬇ RECURRING ⬇", "Tasks you do every day, like your Typing Test and Spelling Test."],
            ["⬇ COMPLETED ⬇", "Finished tasks, with their Actual Completion Date."]],
  cols:[["Date Received", "The date you got the task."],
        ["Type of Task", "Pick the type from the list. Your training tasks are LSH-TRAINING."],
        ["Task Details / Specific Task", "What the task is, specifically, e.g. Classroom Discussion: Reception Training Day 1."],
        ["Accountable VA", "Your name: the VA responsible for the task."],
        ["DAILY NOTES (Dated Significant Task Progress/Difficulties)", "One dated column for each training day. For every open task, write what you did that day, the result and the next step, and any difficulty with what you need to resolve it. As detailed as possible: never just “done”, “ok” or “same”."],
        ["VA NOTES", "Your takeaways from the task, in complete sentences that show what you learned."],
        ["Deadline", "The date the task is due."],
        ["Status", "New, Pending for >3 days, Ongoing, Priority - Ongoing or Completed. Keep it up to date."],
        ["Actual Completion Date", "The date you finished the task."]],
  tabs:[["Client-VA Specific Tasks Index", "Each client’s tasks at a glance: client code, business name, state, time zone, field of law, type of task, specific task, period (Daily to Project-based), nature of task (how important and urgent), and deadline (ASAP, Anytime w/in the day, or Timebound, with the date, day or time)."],
        ["Links & Access", "The tools you have access to, with your username and remarks. Never write passwords here: they stay in the credentials document."],
        ["Directory", "Your contacts: contact person, business name, business address, phone no. (ext), fax number and email."],
        ["Time Zone", "The time zones you work with, for quick reference."]],
  check:"Every training day, the platform checks that every open task has a Daily Note for that day. A cell that needs fixing turns red, and your trainer can add a comment on your day."
};

// Day 0 → Onboarding Orientation.
const DISCORD_STATUS = {format:"LSH | [your time zone] | Trainee", example:"LSH | EST | Trainee"};
const TIME_ADJ = {
  subject:"Manual Time Adjustment Request",
  to:"nicson@legalsupporthelp.com",
  cc:[["Matt", "martin@legalsupporthelp.com"], ["Michelle", "michelle.velarde@legalsupporthelp.com"]],
  include:["That you lost hours on your tracker because of a system issue, and exactly what happened.",
           "Screenshots that show the work you did during the lost hours.",
           "The affected start and end time."]
};
// Day 1 → Training Reminders: the #training-reminders channel.
const REMINDER_SHOTS = [
  ["/ft/day1/img/training-reminders-channel.png", "#training-reminders"],
  ["/ft/day1/img/training-reminders-welcome.png", "Welcome to #training-reminders"],
  ["/ft/day1/img/training-reminders-deliverables.png", "#training-reminders: deliverables and important reminders"]
];

// Day 1 → Reading Task. The file name gets the trainee's name.
const READING = {
  title:"Personal Injury Cases (Overview: What is personal injury?)",
  when:"Day 1: complete it within the 2nd – 3rd hour of the training day.",
  url:"https://drive.google.com/file/d/1VAn-xmcozdHqr-7pzpnY0Rlsc4-4T43O/view?usp=sharing",
  questions:[
    "What is personal injury and what are its types?",
    "Can you enumerate the stages of a personal injury claim on your own understanding?",
    "How much is the common compensation for a personal injury claim?",
    "How long does it take for a personal injury case to resolve?",
    "What are the common factors that affect a personal injury case?",
    "What do you think are the advantages and disadvantages of pushing for a case to litigation (going to court)?"],
  file: name => `PI Overview_Answers (${name || "VA’s name"})`
};

// Day 1 → Setting of Expectations: the tests' links, file names and sample screenshots.
const TESTS = [
  {icon:"⌨️", name:"Typing test", when:"Twice a day: in the morning, 8:00 – 8:10 AM (AM), and before the end of your shift (PM).",
   links:[["TypingClub", "https://www.typingclub.com/sportal/program-3.game"], ["Alternative: TypingTest.com", "https://www.typingtest.com/"]],
   file:"Typing Test [date taken][AM/PM]", sample:"/ft/day1/img/typing-test-sample.png"},
  {icon:"🔤", name:"Spelling test", when:"Once a day, at your own pace: in the morning or in the afternoon.",
   links:[["SpellQuiz (Grade 12)", "https://spellquiz.com/spelling-test/grade-12"], ["Alternative: Spelling-Test.com", "https://spelling-test.com/spelling-exercise#question_16"]],
   file:"Spelling Test [date taken][AM/PM]", sample:"/ft/day1/img/spelling-test-sample.png"}
];

// Paste into Hubstaff one by one, as each session comes up (Day 1: Hubstaff To-Do Set-up).
const TODOS = [
  "Classroom Discussion: Virtual Assistant Essentials - Day 1",
  "Classroom Discussion: Virtual Assistant Essentials - Day 2",
  "Classroom Discussion: Reception Training Day 1",
  "Classroom Discussion: Reception Training Day 2",
  "Classroom Discussion: Reception Training Day 3",
  "Classroom Discussion: Calendar Management Training",
  "Classroom Discussion: Intake Training Day 1",
  "Shadowing Intake Specialist Role (Arlene)",
  "Classroom Discussion: Intake Training Day 2",
  "Classroom Discussion: Intake Training Day 3",
  "Classroom Discussion: Insurance Communication Training Day 1",
  "Classroom Discussion: Insurance Communication Training Day 2",
  "Shadowing Insurance Communication Role (Edward)",
  "Classroom Discussion: Insurance Communication Training Day 3",
  "Classroom Discussion: Provider Communication Training Day 1",
  "Classroom Discussion: Provider Communication Training Day 2",
  "Classroom Discussion: Provider Communication Training Day 3",
  "Shadowing Provider Communication Role (Vince)",
  "Classroom Discussion: Provider Communication Training Day 4",
  "Shadowing Provider Communication Role (Allesa)",
  "Classroom Discussion: Lien Negotiator Training Day 1",
  "Classroom Discussion: Lien Negotiator Training Day 2"
];
// Day 0 → Onboarding Orientation: LSH VA Guide | "Create a to-do" task list.
const TODO_GUIDE = "https://docs.google.com/spreadsheets/d/1Yfeuw9xGb2H68qF9nHf94whXVKmoL1PP8QocP_FN1Ys/edit#gid=0";

const NOTE_PARTS = [
  {h:"Start tracking on today’s to-do", steps:[
    "Open the Hubstaff desktop app.",
    "Click your training project, e.g. LSH - SUPPORT (Training Jr). It turns blue.",
    "Under To-dos, find today’s to-do. Not there yet? Add it first (Your Hubstaff To-Dos, above).",
    "Click the button inside today’s to-do, at its left. The row turns blue and the timer at the top tracks that to-do."],
   tip:"You can only add a note while the timer is running."},
  {h:"Add the note", fig:"note", steps:[
    "Click the notes button (the pencil icon) next to the timer.",
    "The Add Work Notes box opens. Type what you’re working on.",
    "Click Add Note."]},
  {h:"Where your note goes", steps:[
    "The note is saved to the 10-minute block of time you’re tracking now.",
    "Your trainers see it with your tracked time and activity in Hubstaff."]}
];

// The Hubstaff how-to lessons, when they're provided: {title, desc, href}.
const HOWTO_LESSONS = [];

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["rules"]);

/* ---------- the Hubstaff pictures (drawn after the trainer's screenshots) ---------- */
const OR = "#E8590C", HB = "#1c7ce0";
function arrow(d, m){
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${OR}" stroke-width="3" stroke-linecap="round" marker-end="url(#${m})"/>`;
}
function callout(x, y, w, lines){
  return `<rect x="${x}" y="${y}" width="${w}" height="${10 + lines.length*17}" rx="8" fill="${OR}"/>` +
    lines.map((t,i)=>`<text x="${x+12}" y="${y+19+i*17}" font-size="${i ? 11.5 : 13}" font-weight="${i ? 400 : 700}" fill="#fff">${esc(t)}</text>`).join("");
}
// The app window and its left side: the timer, the notes button, the project and the stop button.
function hsWindow(w, h, m){
  return `<defs><marker id="${m}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${OR}"/></marker></defs>
    <rect x=".5" y=".5" width="${w-1}" height="${h-1}" rx="8" fill="#fff" stroke="#cfd4dc"/>
    <path d="M1 26H${w-1}M250 26V${h-1}" stroke="#e1e4ea"/>
    <circle cx="16" cy="13.5" r="6" fill="#2b7de9"/><circle cx="16" cy="13.5" r="2.5" fill="#fff"/>
    <text x="28" y="17.5" font-size="11" fill="#333">Hubstaff</text>
    <rect x="50" y="42" width="130" height="30" fill="${HB}"/><text x="115" y="63" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">07:33:42</text>
    <circle cx="210" cy="57" r="17" fill="#fff" stroke="#c9ced6"/>
    <rect x="202" y="49" width="12" height="15" rx="2" fill="none" stroke="#5b6178" stroke-width="1.6"/><path d="M208 61l8-8 2.5 2.5-8 8H208z" fill="#5b6178"/>
    <text x="125" y="102" text-anchor="middle" font-size="14" font-weight="700" fill="#222">LSH - SUPPORT (Training Jr)</text>
    <text x="125" y="118" text-anchor="middle" font-size="10.5" fill="#444">Classroom Discussion: Reception Tr…</text>
    <path d="M20 150H230M125 150V178" stroke="#d5d8de"/>
    <circle cx="125" cy="148" r="18" fill="#fff" stroke="#d5d8de"/><rect x="118" y="141" width="14" height="14" rx="2" fill="${HB}"/>
    <text x="70" y="176" text-anchor="middle" font-size="9" fill="#8a90a0">No limits</text><text x="182" y="176" text-anchor="middle" font-size="9" fill="#8a90a0">Today: 7:33</text>
    <rect x="14" y="188" width="222" height="20" fill="#fff" stroke="#9aa0ab"/><circle cx="24" cy="197" r="4" fill="none" stroke="#555"/><path d="M27 200l3 3" stroke="#555"/>
    <text x="34" y="202" font-size="10.5" fill="#333">Search projects</text>`;
}
// The to-do list, with an arrow on the button inside the day's to-do.
function figTodo(){
  const m = "ftrArrowTodo", sel = 2;
  const rows = [["Classroom Discussion: Reception Training Day 1", "09/25/2026 07:58 AM"],
                ["Classroom Discussion: Reception Training Day 2", "09/28/2026 07:57 AM"],
                ["Classroom Discussion: Reception Training Day 3", "09/29/2026 07:59 AM"]];
  const projects = [["LSH - CHECK-IN", "0:00"], ["LSH - FILLER", "0:00"], ["LSH - SUPPORT (Training Jr)", "7:33"]];
  return `<svg viewBox="0 0 760 410" role="img" aria-label="The Hubstaff app: click your training project, paste your to-do in Create a to-do and click +, then click the button inside today’s to-do to track time on it.">
    ${hsWindow(760, 410, m)}
    <rect x="1" y="216" width="249" height="30" fill="#e9eaee"/><text x="14" y="236" font-size="12" font-weight="700" fill="#333">Legal Support Help</text>
    ${projects.map((p,i)=>{ const y = 246 + i*32, on = i===2;
      return `${on ? `<rect x="1" y="${y}" width="249" height="32" fill="${HB}"/><circle cx="18" cy="${y+16}" r="7" fill="#fff"/><rect x="15" y="${y+13}" width="6" height="6" rx="1" fill="${HB}"/>` : `<path d="M1 ${y+32}H250" stroke="#eceef2"/>`}
        <text x="36" y="${y+20}" font-size="11" fill="${on ? "#fff" : "#333"}">${p[0]}</text><text x="236" y="${y+20}" text-anchor="end" font-size="11" fill="${on ? "#fff" : "#333"}">${p[1]}</text>`; }).join("")}
    <text x="268" y="50" font-size="16" font-weight="700" fill="#222">To-dos</text><text x="268" y="65" font-size="10" fill="#444">LSH - SUPPORT (Training Jr)</text>
    <rect x="268" y="78" width="104" height="20" fill="#fff" stroke="#9aa0ab"/><text x="274" y="92" font-size="10.5" fill="#222">All to-dos</text><path d="M356 86l4 4 4-4" fill="none" stroke="#555"/>
    <rect x="382" y="78" width="104" height="20" fill="#f4f4f4" stroke="#cfd4dc"/>
    <rect x="496" y="83" width="10" height="10" fill="#fff" stroke="#777"/><text x="511" y="92" font-size="10.5" fill="#222">Show completed</text>
    <rect x="636" y="78" width="84" height="20" fill="#fff" stroke="#9aa0ab"/><circle cx="645" cy="87" r="3.5" fill="none" stroke="#555"/><path d="M647.5 89.5l2.5 2.5" stroke="#555"/><text x="654" y="92" font-size="10" fill="#333">Search to-dos</text>
    <rect x="268" y="106" width="458" height="22" fill="#fff" stroke="#9aa0ab"/><text x="274" y="121" font-size="11" fill="#333">Create a to-do</text>
    <rect x="265" y="103" width="464" height="28" rx="4" fill="none" stroke="${OR}" stroke-width="2" stroke-dasharray="5 3"/>
    <rect x="732" y="107" width="18" height="20" fill="#fff" stroke="#9aa0ab"/><text x="741" y="122" text-anchor="middle" font-size="14" font-weight="700" fill="#333">+</text>
    <rect x="728" y="103" width="26" height="28" rx="5" fill="none" stroke="${OR}" stroke-width="2.5"/>
    <text x="292" y="150" font-size="9" fill="#777">TO-DO</text><path d="M585 140V156" stroke="#e1e4ea"/><text x="597" y="150" font-size="9" fill="#777">CREATED</text>
    <path d="M251 160H759" stroke="#e1e4ea"/>
    ${rows.map((r,i)=>{ const y = 160 + i*34, on = i===sel;
      return `${on ? `<rect x="251" y="${y}" width="508" height="34" fill="${HB}"/><circle cx="272" cy="${y+17}" r="8" fill="#fff"/><rect x="268.5" y="${y+13.5}" width="7" height="7" rx="1" fill="${HB}"/><circle cx="272" cy="${y+17}" r="13" fill="none" stroke="${OR}" stroke-width="3"/>` : `<path d="M251 ${y+34}H759" stroke="#eceef2"/>`}
        <text x="292" y="${y+21}" font-size="10.5" fill="${on ? "#fff" : "#333"}">${r[0]}</text><text x="597" y="${y+21}" font-size="10.5" fill="${on ? "#fff" : "#333"}">${r[1]}</text>`; }).join("")}
    ${arrow("M125 372V350", m)}${callout(14, 372, 222, ["① Click your training project"])}
    ${arrow("M741 57V99", m)}${callout(430, 30, 320, ["② Paste it in Create a to-do, then click +"])}
    ${arrow("M345 318C300 308 276 292 273 266", m)}${callout(330, 318, 410, ["③ Click the button inside today’s to-do", "to track your time on it. The row turns blue."])}
  </svg>`;
}
// The Add Work Notes box, opened from the notes button next to the timer.
function figNote(){
  const m = "ftrArrowNote";
  return `<svg viewBox="0 0 760 320" role="img" aria-label="The Hubstaff app: click the notes button next to the timer, type what you’re working on in Add Work Notes, then click Add Note.">
    ${hsWindow(760, 320, m)}
    <circle cx="210" cy="57" r="22" fill="none" stroke="${OR}" stroke-width="3"/>
    <rect x="330" y="92" width="360" height="176" rx="6" fill="#fff" stroke="#b9bec8"/>
    <path d="M331 118H689" stroke="#e1e4ea"/><text x="342" y="109" font-size="11" fill="#222">Add Work Notes</text>
    <rect x="350" y="128" width="320" height="92" fill="#fff" stroke="#1c5fa8" stroke-width="1.5"/>
    <text x="362" y="148" font-size="12.5" font-weight="700" fill="${OR}">② Type what you’re working on</text>
    <rect x="350" y="234" width="66" height="22" rx="3" fill="#fff" stroke="#9aa0ab"/><text x="383" y="249" text-anchor="middle" font-size="11" fill="#222">Cancel</text>
    <rect x="590" y="234" width="80" height="22" rx="3" fill="#f4f4f4" stroke="#b9bec8"/><text x="630" y="249" text-anchor="middle" font-size="11" fill="#222">Add Note</text>
    <rect x="585" y="229" width="90" height="32" rx="6" fill="none" stroke="${OR}" stroke-width="2.5"/>
    ${arrow("M270 54H240", m)}${callout(270, 40, 320, ["① Click the notes button next to the timer"])}
    ${arrow("M550 295C590 295 620 285 626 268", m)}${callout(400, 282, 150, ["③ Click Add Note"])}
  </svg>`;
}
const FIGS = {note: figNote};
// On a phone the picture keeps its size and scrolls sideways in its box.
const fig = svg => `<figure class="ftr-fig"><div class="ftr-fig-scroll">${svg}</div><figcaption class="ftr-swipe">↔ Swipe sideways to see the whole picture.</figcaption></figure>`;

function renderRules(){
  const aux = AUX_CHANNELS.map(c=>`<div class="ftr-chan">
      <div class="ftr-chan-h">${esc(c.ch)}</div>
      <p>${esc(c.what)}</p>
      ${c.rows.map(r=>`<div class="ftr-aux"><span>${esc(r[0])}</span><code>${esc(r[1])}</code></div>`).join("")}
      ${c.bot ? `<div class="ftr-chat" aria-label="Example"><div><b>You</b> !back</div><div><b>LSH BOT</b><i>APP</i> <span class="ftr-at">@You</span> is back</div></div>` : ""}
    </div>`).join("");
  const habits = HABITS.map(h=>`<div class="ftr-chan ftr-test">
      <div class="ftr-part-h">${h.icon} ${esc(h.name)}</div>
      <ul class="ftr-list">${h.lines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
      ${h.to ? `<div class="ftr-to"><b>Send to</b>${h.to.map(a=>`<span>${esc(a)}</span>`).join("")}</div>` : ""}
      ${h.example ? `<div class="ftr-eg"><div>❌ <b>General:</b> “${esc(h.example[0])}”</div><div>✅ <b>Specific:</b> “${esc(h.example[1])}”</div></div>` : ""}
      ${h.tracker ? `<div class="ftr-links"><button class="btn btn-navy btn-sm" type="button" onclick="goto('tracker')">📋 Open my Task Tracker</button></div>` : ""}
      ${h.links.map(l=>`<div class="ftr-aux"><span><b>${esc(l[0])}</b><br><small>${esc(l[2])}</small></span><a class="btn btn-ghost btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join("")}
      <p class="ftr-soon">🕓 ${esc(h.soon)}</p>
    </div>`).join("");
  const tests = TESTS.map(t=>`<div class="ftr-chan ftr-test">
      <div class="ftr-part-h">${t.icon} ${esc(t.name)}</div>
      <p class="ftr-when"><b>When:</b> ${esc(t.when)}</p>
      <div class="ftr-links">${t.links.map((l,i)=>`<a class="btn ${i ? "btn-ghost" : "btn-navy"} btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${esc(l[0])} ↗</a>`).join("")}</div>
      <p class="ftr-when"><b>Save it</b> in your trainee folder, named exactly:</p>
      <div class="ftr-aux"><code>${esc(t.file)}</code></div>
      <figure class="ftr-sample"><a href="${esc(t.sample)}" target="_blank"><img src="${esc(t.sample)}" alt="Sample ${esc(t.name.toLowerCase())} screenshot" loading="lazy"></a><figcaption>Sample: the whole screen, with the date and time showing.</figcaption></figure>
    </div>`).join("");
  const todos = TODOS.map((t,i)=>`<div class="ftr-todo">
      <span class="ftr-todo-n">${i+1}</span>
      <span class="ftr-todo-tx"><em>To-Do:</em> ${esc(t)}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(t)}" onclick="ftrCopy(this)">📋 Copy</button></div>`).join("");
  const readFile = READING.file(state.certName || state.traineeName);
  const tpart = (h, rows)=>`<div class="ftr-part"><div class="ftr-part-h">${esc(h)}</div>${rows.map(r=>`<div class="ftr-def"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join("")}</div>`;
  const copyRow = (label, text, sub)=>`<div class="ftr-aux"><span><b>${esc(label)}</b>${sub ? `<br><small>${esc(sub)}</small>` : ""}</span><span class="ftr-copyrow"><code class="ftr-code">${esc(text)}</code><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(text)}" data-toast="Copied." onclick="ftrCopy(this)">📋 Copy</button></span></div>`;
  const parts = NOTE_PARTS.map((p,i)=>`<div class="ftr-part">
      <div class="ftr-part-h"><span>Part ${i+1}</span>${esc(p.h)}</div>
      <ol>${p.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>
      ${p.tip ? `<p class="ftr-tip">💡 ${esc(p.tip)}</p>` : ""}
      ${p.fig ? fig(FIGS[p.fig]()) : ""}
    </div>`).join("");
  const lessons = HOWTO_LESSONS.length
    ? HOWTO_LESSONS.map(l=>`<a class="ftr-lesson" href="${esc(l.href)}" target="_blank" rel="noopener"><b>${esc(l.title)}</b><span>${esc(l.desc||"")}</span></a>`).join("")
    : `<p class="ftr-soon">Coming soon: the Hubstaff how-to lessons will be added here.</p>`;
  return `<div class="ftr-hero"><h1>📌 Training Orientation and Rules</h1>
      <p>The rules for every training day, how to report your status, your daily habits (EOD email, trackers, typing and spelling tests), your Hubstaff To-Dos and notes, time adjustments, and Day 1’s Reading Task.</p></div>
    <section class="ftr-sec ftr-rules">
      <h2>⏰ Rules for every training day</h2>
      <div class="ftr-rule"><b>Hubstaff tracking is strict: ${esc(SHIFT)}.</b></div>
      <div class="ftr-rule"><b>Breaks: strictly 15 – 30 – 15, or one full 1-hour break.</b>
        <span>Take a 15-minute break, a 30-minute break and another 15-minute break, or one full hour. No other split.</span></div>
      <div class="ftr-rule"><b>📷 Cameras on during classroom discussions.</b>
        <span>Every trainee’s camera stays on for the whole discussion.</span></div>
      <div class="ftr-rule"><b>📛 Follow the naming conventions strictly.</b>
        <span>Name your Hubstaff To-Dos, test screenshots and files exactly as given.</span></div>
    </section>
    <section class="ftr-sec">
      <h2>🟢 Auxes: reporting your status</h2>
      <p class="ftr-sub">Your aux is your status: in for your shift, on a break, back from a break. Report it in Discord every time it changes, in these 2 channels:</p>
      <div class="ftr-grid">${aux}</div>
      <div class="ftr-rule ftr-rule-aux"><b>🚫 No double stamping.</b><span>Post each timestamp once.</span></div>
      <div class="ftr-part ftr-status">
        <div class="ftr-part-h">💬 Your Discord profile status</div>
        <p class="ftr-when">Set your Discord status in this format: <code class="ftr-code">${esc(DISCORD_STATUS.format)}</code></p>
        <p class="ftr-when">For example: <code class="ftr-code">${esc(DISCORD_STATUS.example)}</code></p>
      </div>
    </section>
    <section class="ftr-sec">
      <h2>📣 Check #training-reminders</h2>
      <p class="ftr-sub">Check #training-reminders on Discord regularly, so you’re always guided on the right things to do for your HS To-Do, your deliverables and other important reminders throughout the training.</p>
      <div class="shots ftr-shots">${REMINDER_SHOTS.map(x=>`<figure><a href="${esc(x[0])}" target="_blank"><img src="${esc(x[0])}" alt="${esc(x[1])}" loading="lazy"></a></figure>`).join("")}</div>
    </section>
    <section class="ftr-sec">
      <h2>🔁 Building your daily habits</h2>
      <p class="ftr-sub">Every training day, before the end of your shift:</p>
      <div class="ftr-grid">${habits}</div>
    </section>
    <section class="ftr-sec">
      <h2>📋 Your Daily Task Tracker, part by part</h2>
      <p class="ftr-sub">Make your tracker as comprehensive as possible: fill in every part, for every task, every day. <a onclick="goto('tracker')" style="cursor:pointer;">Open my Task Tracker →</a></p>
      <div class="ftr-parts">
        ${tpart("The top of the sheet", TRACKER_PARTS.top)}
        ${tpart("The three sections", TRACKER_PARTS.sections)}
        ${tpart("The columns, left to right", TRACKER_PARTS.cols)}
        ${tpart("The other tabs", TRACKER_PARTS.tabs)}
      </div>
      <div class="ftr-why" style="margin-top:14px;"><b>The daily check:</b> ${esc(TRACKER_PARTS.check)}</div>
    </section>
    <section class="ftr-sec">
      <h2>⌨️ Typing and spelling tests</h2>
      <div class="ftr-why"><b>Why?</b> The client expects a typing speed of 60 WPM (words per minute). The daily tests build your speed and your spelling, and the results you save show your progress through the training.</div>
      <div class="ftr-grid">${tests}</div>
      <p class="ftr-sub ftr-after">Take a screenshot of each result and save it in your trainee folder, named exactly as above. Missed a test? Make it up during your idle time. You may also take extra rounds during your idle time or after your shift.</p>
    </section>
    <section class="ftr-sec">
      <h2>✅ Your Hubstaff To-Dos</h2>
      <p class="ftr-sub">Set your Hubstaff To-Do every day, for the session you’re in, named exactly as below. More on to-dos: <a href="${esc(TODO_GUIDE)}" target="_blank" rel="noopener noreferrer">LSH VA Guide | “Create a to-do” task list ↗</a></p>
      <div class="ftr-why"><b>Why?</b> Your To-Dos help the audit team review your work easily, and keep a clear record of what you completed each day. Don’t miss this routine.</div>
      <div class="ftr-part">
        <ol>
          <li>Click <b>📋 Copy</b> next to the session you’re in (below).</li>
          <li>In the Hubstaff app, click your training project.</li>
          <li>Click in <b>Create a to-do</b>, paste it (Ctrl+V), then click <b>+</b> or press Enter.</li>
          <li>Click the button inside that to-do, at its left, to track your time on it.</li>
        </ol>
        ${fig(figTodo())}
      </div>
      <div class="card ftr-todos">${todos}</div>
      <p class="ftr-sub ftr-after"><b>Shadowing session?</b> Use <code class="ftr-code">Shadowing [Type of role or process you’re shadowing] (VA’s Name)</code>. Your trainer tells you exactly what to enter each time a shadowing session is scheduled.</p>
    </section>
    <section class="ftr-sec">
      <h2>📝 How to create notes in Hubstaff</h2>
      <div class="ftr-parts">${parts}</div>
    </section>
    <section class="ftr-sec">
      <h2>⏱ Lost hours? Manual Time Adjustment Request</h2>
      <p class="ftr-sub">If you lose hours on your tracker because of a system issue, send this request by email. Keep it for future reference.</p>
      <div class="ftr-part">
        ${copyRow("Subject", TIME_ADJ.subject)}
        ${copyRow("Send to", TIME_ADJ.to)}
        ${TIME_ADJ.cc.map(c=>copyRow("CC", c[1], c[0])).join("")}
        <p class="ftr-when" style="margin-top:10px!important;"><b>In the email:</b></p>
        <ul class="ftr-list">${TIME_ADJ.include.map(l=>`<li>${esc(l)}</li>`).join("")}</ul>
      </div>
    </section>
    <section class="ftr-sec">
      <h2>📖 Day 1 Reading Task: Personal Injury Cases</h2>
      <p class="ftr-sub">${esc(READING.when)}</p>
      <div class="ftr-part">
        <div class="ftr-part-h"><span>A</span>Read</div>
        <p class="ftr-when">Read this to get a good grasp of what we do here in the firm.</p>
        <div class="ftr-links" style="margin-top:8px;"><a class="btn btn-navy btn-sm viewer-link" data-kind="doc" data-title="${esc(READING.title)}" href="${esc(READING.url)}">📄 ${esc(READING.title)}</a></div>
      </div>
      <div class="ftr-part" style="margin-top:14px;">
        <div class="ftr-part-h"><span>B</span>Answer the following questions</div>
        <ol>${READING.questions.map(q=>`<li>${esc(q)}</li>`).join("")}</ol>
        <p class="ftr-tip">Write your answers in a Word document or Notepad, then send them in our group chat so we know you’re done. Name the file exactly:</p>
        <div class="ftr-todo"><span class="ftr-todo-tx"><code class="ftr-code">${esc(readFile)}</code></span><button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(readFile)}" data-toast="Copied. Use it as your file name." onclick="ftrCopy(this)">📋 Copy</button></div>
      </div>
    </section>
    <section class="ftr-sec">
      <h2>🎓 Hubstaff how-to lessons</h2>
      <div class="card ftr-lessons">${lessons}</div>
    </section>`;
}

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
window.ftrCopy = function(btn){
  const t = btn.getAttribute("data-copy"); if(!t) return;
  copyText(t).then(()=>{
    btn.textContent = "✓ Copied"; btn.classList.add("ftr-copied");
    setTimeout(()=>{ btn.textContent = "📋 Copy"; btn.classList.remove("ftr-copied"); }, 1600);
    toast(btn.getAttribute("data-toast") || "Copied. Paste it in your Hubstaff To-Do.");
  }).catch(()=>toast("Couldn’t copy. Select the text and copy it instead."));
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="rules") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-rules">${renderRules()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
// Dashboard: the Training Orientation and Rules card, first above the lessons.
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  const html = __dash.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin) return html;
  const card = `<div class="ftr-banner" role="link" tabindex="0" onclick="goto('rules')" onkeydown="if(event.key==='Enter') goto('rules')">
      <span class="ftr-banner-ic">📌</span>
      <span class="ftr-banner-tx"><b>Training Orientation and Rules</b><span>Tracking ${esc(SHIFT)} · Breaks 15 – 30 – 15 or one full hour · Cameras on · Auxes (no double stamping) · #training-reminders · EOD email and trackers · Typing and spelling tests · Your Hubstaff To-Dos and notes · Time adjustments</span></span>
      <span class="ftr-banner-go">Open →</span></div>`;
  return html.replace('<div class="module-grid">', card + '<div class="module-grid">');
};

(function(){ const s = document.createElement("style"); s.id = "ft-rules"; s.textContent = `
main.main-rules{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.ftr-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;}
.ftr-hero p{margin:0 0 20px;color:var(--ink-soft);font-size:15px;max-width:760px;}
.ftr-sec{margin-bottom:28px;} .ftr-sec h2{margin:0 0 8px;color:var(--navy);font-size:21px;}
.ftr-sub{margin:0 0 14px;color:var(--ink-soft);font-size:14px;max-width:820px;} .ftr-sub b{color:var(--ink);}
.ftr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px;}
.ftr-rule{background:var(--danger-bg);border:1px solid #E9C9C3;border-left:5px solid var(--danger);border-radius:12px;padding:12px 16px;margin-bottom:10px;}
.ftr-rule-aux{margin-top:14px;}
.ftr-why{background:#FBEBDD;border:1px solid var(--orange-soft);border-radius:12px;padding:12px 16px;margin-bottom:14px;font-size:14px;max-width:900px;} .ftr-why b{color:var(--orange-deep);}
.ftr-test{display:flex;flex-direction:column;gap:8px;} .ftr-test .ftr-aux{border-top:0;padding:0;}
.ftr-when{margin:0!important;font-size:14px!important;color:var(--ink)!important;}
.ftr-links{display:flex;gap:8px;flex-wrap:wrap;} .ftr-links a.btn{text-decoration:none;}
.ftr-sample{margin:4px 0 0;} .ftr-sample img{display:block;width:100%;border:1px solid var(--line);border-radius:8px;}
.ftr-sample figcaption{margin-top:4px;font-size:12px;color:var(--ink-soft);}
.ftr-after{margin-top:14px;}
.ftr-list{margin:0;padding-left:20px;font-size:14px;line-height:1.5;} .ftr-list li{margin-bottom:4px;}
.ftr-aux small{font-size:12px;color:var(--ink-soft);} .ftr-aux a.btn{text-decoration:none;flex-shrink:0;}
.ftr-sub a{color:var(--orange-deep);font-weight:700;}
.ftr-eg{background:var(--bg);border-radius:10px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:6px;}
.ftr-code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--ink);}
.ftr-def{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:4px 16px;border-top:1px solid var(--line);padding:9px 0;font-size:14px;} .ftr-def:first-of-type{margin-top:8px;}
.ftr-def b{color:var(--navy);} .ftr-def span{color:var(--ink);}
@media (max-width:620px){ .ftr-def{grid-template-columns:1fr;} }
.ftr-status{margin-top:14px;} .ftr-status .ftr-when{margin-top:6px!important;}
.ftr-copyrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;min-width:0;} .ftr-copyrow .ftr-code{overflow-wrap:anywhere;}
.ftr-shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:12px;}
.ftr-to{background:var(--bg);border-radius:10px;padding:8px 12px;font-size:13.5px;display:flex;flex-direction:column;gap:2px;} .ftr-to b{font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);} .ftr-to span{overflow-wrap:anywhere;}
.ftr-shots figure{margin:0;} .ftr-shots a{display:flex;align-items:center;justify-content:center;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:6px;height:280px;box-shadow:var(--shadow);}
.ftr-shots img{max-width:100%;max-height:100%;object-fit:contain;}
.ftr-rule b{display:block;font-size:16px;color:var(--danger);} .ftr-rule span{display:block;margin-top:4px;font-size:13.5px;color:var(--ink);}
.ftr-chan,.ftr-part{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;}
.ftr-chan-h{font-size:16px;color:#5865F2;font-weight:800;} .ftr-chan p{margin:6px 0 10px;font-size:13.5px;color:var(--ink-soft);}
.ftr-aux{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding:8px 0;font-size:14px;}
.ftr-aux code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;font-weight:800;background:var(--navy);color:#fff;border-radius:6px;padding:3px 10px;}
.ftr-chat{margin-top:10px;background:#313338;color:#dbdee1;border-radius:10px;padding:10px 12px;font-size:13px;display:flex;flex-direction:column;gap:6px;}
.ftr-chat b{color:#f2f3f5;margin-right:6px;} .ftr-chat i{font-style:normal;font-size:10px;font-weight:800;background:#5865F2;color:#fff;border-radius:3px;padding:1px 4px;margin-right:6px;}
.ftr-at{background:rgba(88,101,242,.3);color:#c9cdfb;border-radius:3px;padding:0 2px;}
.ftr-todos{padding:6px 14px;margin-top:14px;}
.ftr-parts{display:flex;flex-direction:column;gap:14px;}
.ftr-fig{margin:12px 0 0;} .ftr-fig-scroll{overflow-x:auto;border-radius:10px;}
.ftr-swipe{display:none;margin-top:6px;font-size:12px;color:var(--ink-soft);}
.ftr-fig svg{display:block;width:100%;min-width:620px;height:auto;font-family:"Segoe UI",Arial,sans-serif;font-weight:400;}
.ftr-todo{display:flex;align-items:center;gap:12px;padding:8px 0;border-top:1px solid var(--line);} .ftr-todo:first-child{border-top:0;}
.ftr-todo-n{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--bg);color:var(--ink-soft);font-size:12px;display:flex;align-items:center;justify-content:center;}
.ftr-todo-tx{flex:1;min-width:0;font-size:14px;overflow-wrap:anywhere;} .ftr-todo-tx em{font-style:normal;color:var(--orange-deep);font-size:12px;margin-right:4px;}
.ftr-todo .btn{flex-shrink:0;} .ftr-copied{color:var(--success)!important;border-color:var(--success)!important;}
.ftr-part-h{font-size:16px;color:var(--navy);font-weight:800;} .ftr-part-h span{display:inline-block;margin-right:8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#fff;background:var(--orange-deep);border-radius:999px;padding:2px 9px;vertical-align:2px;}
.ftr-part ol{margin:10px 0 0;padding-left:20px;font-size:14px;line-height:1.5;} .ftr-part li{margin-bottom:4px;}
.ftr-tip{margin:8px 0 0;font-size:13px;color:var(--ink-soft);}
.ftr-lessons{padding:16px 18px;display:flex;flex-direction:column;gap:10px;}
.ftr-soon{margin:0;color:var(--ink-soft);font-size:14px;}
.ftr-lesson{display:block;text-decoration:none;color:var(--ink);} .ftr-lesson b{display:block;color:var(--navy);} .ftr-lesson span{font-size:13px;color:var(--ink-soft);}
.ftr-banner{display:flex;align-items:center;gap:16px;background:var(--paper);color:var(--ink);border:1px solid var(--line);border-left:5px solid var(--orange);border-radius:18px;padding:16px 22px;margin-bottom:14px;cursor:pointer;box-shadow:var(--shadow);transition:transform .15s;}
.ftr-banner:hover{transform:translateY(-2px);} .ftr-banner:focus-visible{outline:3px solid var(--orange-soft);outline-offset:2px;}
.ftr-banner-ic{width:48px;height:48px;border-radius:14px;background:#FBEBDD;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
.ftr-banner-tx{flex:1;min-width:0;} .ftr-banner-tx b{display:block;font-size:16px;color:var(--navy);} .ftr-banner-tx span{font-size:13px;color:var(--ink-soft);}
.ftr-banner-go{background:var(--navy);color:#fff;font-weight:800;font-size:12px;border-radius:999px;padding:8px 16px;white-space:nowrap;}
@media (max-width:660px){ .ftr-swipe{display:block;} }
@media (max-width:520px){ .ftr-banner{flex-wrap:wrap;} .ftr-banner-go{margin-left:64px;} .ftr-todo{flex-wrap:wrap;} .ftr-todo .btn{margin-left:38px;} }
`; document.head.appendChild(s); })();
})();
