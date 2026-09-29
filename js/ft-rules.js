/* ============================================================
   Training Orientation and Rules
   Loaded after js/ft-tracker.js, before js/ft-simulators.js (so its dashboard
   card sits above the Simulators card). The dashboard card opens #/rules.
     • Rules: strict tracking 8 AM – 5 PM PST; breaks 15-30-15 or one full hour; cameras on in discussions.
     • Auxes: reporting your status in the two Discord channels, no double stamping.
     • Typing and spelling tests (Day 1's Setting of Expectations): why (the client expects 60 WPM),
       when, the links, and saving each result in the trainee folder.
     • Your Hubstaff To-Dos: the guide's To-Do names, each with 📋 Copy (the name only,
       without the "To-Do:" label) to paste into the Hubstaff to-do list.
     • How to create notes in Hubstaff: part by part.
     • Two pictures of the Hubstaff app, drawn after the trainer's screenshots (SVG, so
       they stay sharp): the to-do list, with an arrow on the button inside the day's
       to-do, and the Add Work Notes box.
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

// Day 1 → Setting of Expectations: the tests' links, file names and sample screenshots.
const TESTS = [
  {icon:"⌨️", name:"Typing test", when:"Twice a day: in the morning (AM) and before the end of your shift (PM).",
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
  "Classroom Discussion: Provider Communication Training Day 1"
];

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
  const tests = TESTS.map(t=>`<div class="ftr-chan ftr-test">
      <div class="ftr-part-h">${t.icon} ${esc(t.name)}</div>
      <p class="ftr-when"><b>When:</b> ${esc(t.when)}</p>
      <div class="ftr-links">${t.links.map((l,i)=>`<a class="btn ${i ? "btn-ghost" : "btn-navy"} btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${esc(l[0])} ↗</a>`).join("")}</div>
      <p class="ftr-when"><b>Save it</b> in your trainee folder as:</p>
      <div class="ftr-aux"><code>${esc(t.file)}</code></div>
      <figure class="ftr-sample"><a href="${esc(t.sample)}" target="_blank"><img src="${esc(t.sample)}" alt="Sample ${esc(t.name.toLowerCase())} screenshot" loading="lazy"></a><figcaption>Sample: the whole screen, with the date and time showing.</figcaption></figure>
    </div>`).join("");
  const todos = TODOS.map((t,i)=>`<div class="ftr-todo">
      <span class="ftr-todo-n">${i+1}</span>
      <span class="ftr-todo-tx"><em>To-Do:</em> ${esc(t)}</span>
      <button class="btn btn-ghost btn-sm" type="button" onclick="ftrCopy(${i}, this)">📋 Copy</button></div>`).join("");
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
      <p>The rules for every training day, how to report your status, your daily typing and spelling tests, and your Hubstaff To-Dos and notes.</p></div>
    <section class="ftr-sec ftr-rules">
      <h2>⏰ Rules for every training day</h2>
      <div class="ftr-rule"><b>Hubstaff tracking is strict: ${esc(SHIFT)}.</b></div>
      <div class="ftr-rule"><b>Breaks: strictly 15 – 30 – 15, or one full 1-hour break.</b>
        <span>Take a 15-minute break, a 30-minute break and another 15-minute break, or one full hour. No other split.</span></div>
      <div class="ftr-rule"><b>📷 Cameras on during classroom discussions.</b>
        <span>Every trainee’s camera stays on for the whole discussion.</span></div>
    </section>
    <section class="ftr-sec">
      <h2>🟢 Auxes: reporting your status</h2>
      <p class="ftr-sub">Your aux is your status: in for your shift, on a break, back from a break. Report it in Discord every time it changes, in these 2 channels:</p>
      <div class="ftr-grid">${aux}</div>
      <div class="ftr-rule ftr-rule-aux"><b>🚫 No double stamping.</b><span>Post each timestamp once.</span></div>
    </section>
    <section class="ftr-sec">
      <h2>⌨️ Typing and spelling tests</h2>
      <div class="ftr-why"><b>Why?</b> The client expects a typing speed of 60 WPM (words per minute). The daily tests build your speed and your spelling, and the results you save show your progress through the training.</div>
      <div class="ftr-grid">${tests}</div>
      <p class="ftr-sub ftr-after">Take a screenshot of each result and save it in your trainee folder, named as above. Missed a test? Make it up during your idle time. You may also take extra rounds during your idle time or after your shift.</p>
    </section>
    <section class="ftr-sec">
      <h2>✅ Your Hubstaff To-Dos</h2>
      <p class="ftr-sub">Set your Hubstaff To-Do every day, for the session you’re in:</p>
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
    </section>
    <section class="ftr-sec">
      <h2>📝 How to create notes in Hubstaff</h2>
      <div class="ftr-parts">${parts}</div>
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
window.ftrCopy = function(i, btn){
  const t = TODOS[i]; if(!t) return;
  copyText(t).then(()=>{
    btn.textContent = "✓ Copied"; btn.classList.add("ftr-copied");
    setTimeout(()=>{ btn.textContent = "📋 Copy"; btn.classList.remove("ftr-copied"); }, 1600);
    toast("Copied. Paste it in your Hubstaff To-Do.");
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
      <span class="ftr-banner-tx"><b>Training Orientation and Rules</b><span>Tracking ${esc(SHIFT)} · Breaks 15 – 30 – 15 or one full hour · Cameras on · Auxes (no double stamping) · Typing and spelling tests · Your Hubstaff To-Dos and notes</span></span>
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
