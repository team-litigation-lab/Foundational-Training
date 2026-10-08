/* ============================================================
   🧭 Platform Orientation and the Blueprint PDF (admin)
   Loaded last. The EA/PA engine gives admins 🧭 Orientation (#/orientation):
   a screen-shareable blueprint of the platform for the first session, with
   ⛶ Present full screen, 🖨 Print and ⬇ Download PDF. The same slides are the
   Blueprint PDF at /blueprint.pdf: when the build changes, the first admin
   to open the portal rebuilds it and publishes it (blueprint:pdf / blueprint:meta,
   served by worker.js), so the link always has the latest.
   Both come from orientSlides(); this file gives it this program's slides in
   place of the EA/PA ones: the lessons, how a lesson works, classroom
   discussions, the dashboard, the top bar, the daily habits, the simulators,
   feedback, the certificate, the ground rules and how to start.
   Trainee-safe: no facilitator's notes, answers or trainee data. The page is
   for admins only; 👁 Trainee view doesn't show it.
   ============================================================ */
(function(){
const e = (s)=>esc(String(s));
const pill = (i,t,d)=>`<div class="or-pill"><div>${i}</div><b>${t}</b><span>${d}</span></div>`;
const step = (n,icon,t,d)=>`<div class="or-step"><div class="or-step-n">${n}</div><div class="or-step-i">${icon}</div><b>${t}</b><span>${d}</span></div>`;
const box = (n,t,d,cls)=>`<div class="or-box${cls?" "+cls:""}"><span class="or-num">${n}</span><b>${t}</b><em>${d}</em></div>`;
// A deck lesson is its "deck" slide (plus any extras, like Word Game 1); a lesson rebuilt as
// native slides has one slide per deck page. The Process Questions slide (ft-process.js) isn't counted.
function kindOf(d){
  const secs = (d.sections||[]).filter(x=>x.id!=="process-questions");
  if(!secs.length) return "Coming soon";
  if(!secs.some(x=>x.id==="deck")) return `${secs.length} slides`;
  const extra = secs.filter(x=>x.id!=="deck").map(x=>e(x.h));
  return "Training deck" + (extra.length ? " + " + extra.join(", ") : "");
}
function tile(d){
  return `<div class="or-day"><span>Lesson ${e(d.short || d.id)}</span><b>${e(d.title)}</b><em>${kindOf(d)}${d.video ? " · ▶ Video" : ""}</em></div>`;
}
function orientTile(){
  const o = window.FT_ORIENTATION; if(!o) return "";
  return `<div class="or-day"><span>📌 Start here</span><b>${e(o.title)}</b><em>${o.sections.length} slides · always open</em></div>`;
}

window.orientSlides = function(){
  const N = DAYS.length, first = DAYS[0] ? DAYS[0].title : "Lesson 1", last = DAYS[N-1] ? DAYS[N-1].title : "";
  return [
   {k:"Welcome", h:"Welcome to the LSH Standard Foundational Training", body:`
     <p class="or-lead">The 18-day program that makes you a <b>Generalist Legal VA</b>: familiar with every role on a personal injury legal team, from ${e(first)} to ${e(last)}.</p>
     <div class="or-3">${pill("📚","Learn",`${N} lessons, each with its training deck and video presentation`)}${pill("🛠","Practice","Mock calls, demos and the LSH simulators, on realistic case files")}${pill("✅","Prove","Your daily trackers and your trainer's feedback — and a certificate at the end")}</div>
     <div class="or-note"><b>You'll need:</b> Chrome or Edge on a computer, a headset with a microphone, your camera for classroom discussions, and a stable connection. Your progress saves to your account automatically.</div>`},
   {k:"Roadmap", h:`Your ${N}-lesson roadmap`, body:`<div class="or-days">${orientTile()}${DAYS.map(tile).join("")}</div>
     <p class="or-foot">Start with 📌 Training Orientation and Rules. Your trainer opens each lesson for your batch; a 🔒 lesson opens when it's time.</p>`},
   {k:"A lesson", h:"How every lesson works", body:`
     <div class="or-flow">${step(1,"🖥","Lesson slides","The training deck, full width. ⛶ Full screen any time; your place is saved.")}<i>→</i>${step(2,"▶","Video Presentation","The lesson's AI Assisted Discussion video. 🔒 until your trainer unlocks it.")}<i>→</i>${step(3,"📝","Knowledge Check","Answer the lesson's process questions on the platform, then save them with the proper name.")}<i>→</i>${step(4,"✓","Finish lesson","On the last slide. The lesson's circle on your dashboard turns ✓.")}<i>→</i>${step(5,"🔓","Next lesson","Opens when your trainer opens it for your batch.")}</div>
     <div class="or-note">There are <b>no quizzes</b>: you finish each lesson from its last slide. Missed something? Every open lesson stays on your dashboard — press <b>Review</b> to go back to it any time.</div>`},
   {k:"Discussions", h:"Classroom discussions with your trainer", body:`
     <div class="or-3">${pill("🖥","Follow the shared slides","Your trainer presents each lesson live. They're the same slides you have on the platform — nothing extra to install.")}${pill("📷","Cameras on","Your camera stays on for the whole discussion. Meeting schedules are sent on the discussion's date and time — keep your notifications on.")}${pill("📒","Then your Monitoring Sheet","After each discussion: the date, 5 major takeaways, 3 questions you still have, and how well you understood it.")}</div>
     <div class="or-note"><b>Free Upskill Training</b> runs right after your shift, for an hour or so: communication, accent reduction, grammar, email writing and client interviews. Unpaid and not mandatory, but highly encouraged. Missed one? Ask your trainers what was covered, review the materials and do the practice on your own time.</div>`},
   {k:"Dashboard", h:"Your dashboard at a glance", body:`
     <div class="or-bp">
       <div class="or-bp-main">
         ${box(1,"Progress track",`📌 and Lessons 1–${N} · ✓ = finished`,"or-hero")}
         ${box(2,"Lesson cards","Start / Review · ▶ Video Presentation · 💬 trainer feedback","or-cards")}
         ${box(3,"Resume &amp; certificate","Jump back to where you left off · download your certificate when earned")}
       </div>
       <div class="or-bp-side">
         ${box(4,"📒 Monitoring Sheet","How many entries you've filled in","dark")}
         ${box(5,"📋 Task Tracker today","Today's check and what to fix","dark")}
         ${box(6,"Your progress","Program complete · lessons finished · graded calls","dark")}
         ${box(7,"💬 Your feedback","Tell us about the platform, lessons &amp; trainer","dark")}
       </div>
     </div>`},
   {k:"Navigation", h:"Getting around", body:`
     <div class="or-nav">
       ${[["Dashboard","Your home: your lessons, progress and certificate."],
          ["🛠 Simulators","Mock calls and demos on the CMS's mock case files, plus every LSH simulator."],
          ["📋 Task Tracker","Your LSH Daily Task Tracker. Every open task gets a Daily Note each day."],
          ["📒 Monitoring Sheet","One entry per classroom discussion: takeaways, questions, your understanding."],
          ["📝 Knowledge Check","A lesson's process questions, graded. Open it from the lesson's last slide."],
          ["My Notes","Your private notes — download them as a PDF."],
          ["🎯 Focus","Your trainer's feedback and what to work on next."]].map(([t,d])=>`<div><b>${t}</b><span>${d}</span></div>`).join("")}
     </div>
     <p class="or-foot">On a phone, everything is under <b>☰ Menu</b>. Search (top bar) finds any lesson.</p>`},
   {k:"Daily habits", h:"Your daily habits", body:`
     <div class="or-3">${pill("📋","Daily Task Tracker","Update it before the end of every shift. Every open task gets a Daily Note for the day. It's checked as you type and again every evening; cells to fix show in red.")}${pill("📧","EOD email","Before the end of every shift: at least 2 sentences for each item, and 3 key learnings from the day's tasks.")}${pill("⏳","Auxes &amp; Hubstaff","<code>!in</code> and <code>!back</code> in #⏳-timestamps, <code>In</code> in #batch-group-channel. Your Hubstaff To-Dos are named exactly as given.")}</div>
     <div class="or-note">Every rule and routine is in <b>📌 Training Orientation and Rules</b>, first on your dashboard. Open it before Lesson 1.</div>`},
   {k:"Simulators", h:"Simulators: practise the real tasks", body:`
     <div class="or-3">${pill("📞","Mock calls","Reception, Calendar Management and Intake mock calls, each on its CMS example cases.")}${pill("🗂","Demos","Intake packets, LORs, MedLORs, LV requests and reductions. Open the case, then “Work on a practice copy”.")}${pill("🧰","All simulators","Call, Calendaring, Email, Docket, Medical Records Requests and Court E-Filing — open any time.")}</div>
     <div class="or-note">A mock call or demo card opens with its lesson. <b>Open here</b> runs the tool in the page (✕ or Esc closes it); <b>New tab ↗</b> opens it on its own. Your scores are saved for your trainer.</div>`},
   {k:"Feedback", h:"Feedback & your growth", body:`
     <div class="or-3">${pill("🏅","Scorecard","Every grade in one place: your Knowledge Checks, graded calls and calendaring, with your trainer's scores.")}${pill("💬","Trainer feedback","Your Practice Lab work comes back with your trainer's feedback. A lesson's 💬 Trainer feedback shows on its card.")}${pill("🎯","Focus","Your trainer's priorities for you and what to work on next. Tick items off as you go.")}</div>`},
   {k:"Certificate", h:"Earning your certificate", body:`
     <div class="or-cert"><div class="or-ribbon">🏅</div><div>
       <p class="or-lead" style="margin-top:0">Finish all <b>${N} lessons</b> and your <b>Certificate of Completion</b> unlocks — download it as a PDF from your dashboard.</p>
       <ul class="or-list"><li>It shows your name <b>exactly as you registered it</b> — check your spelling.</li><li>Your dashboard counts your finished lessons as you go.</li><li>📌 Training Orientation and Rules is where you start. It's always open, and it isn't one of the ${N} lessons.</li></ul></div></div>`},
   {k:"Ground rules", h:"Ground rules", body:`
     <ul class="or-list big"><li>🔒 <b>Confidentiality first</b> — every document is protected by attorney-client privilege. Never paste client, case or medical information into any tool.</li><li>🤖 <b>AI for grammar and spelling only</b> — use your own reasoning and discretion.</li><li>⏱ <b>The 5-minute rule</b> — reply within 5 minutes, and acknowledge every Discord message from your trainer.</li><li>🕗 <b>On time</b> — Hubstaff tracks 8:00 AM – 5:00 PM PST. Breaks: 15 – 30 – 15, or one full hour.</li><li>📛 <b>Naming conventions, strictly</b> — To-Dos, screenshots and files exactly as given.</li></ul>`},
   {k:"Start", h:"Let's begin", body:`
     <div class="or-flow start">${step(1,"👤","Sign in","Last name, first name(s) and your batch code. Your trainer approves your registration.")}<i>→</i>${step(2,"📌","Start here","Open Training Orientation and Rules: the rules and your daily routine.")}<i>→</i>${step(3,"🚀",`Lesson 1`,`Open ${e(first)} from your dashboard and press Start.`)}</div>
     <p class="or-lead" style="text-align:center;margin-top:26px">Questions before we start?</p>`}
  ];
};
})();
