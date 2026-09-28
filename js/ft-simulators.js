/* ============================================================
   Simulators — the curriculum's mock calls and demos
   Loaded after js/ft-updates.js. 🛠 Simulators in the top bar (#/simulators).
     • One card per mock call and demo in the Training Guide, under its lesson.
       Each card opens the practice tools for it: the LSH Training Portal's
       shared simulators and the training CMS (a practice case management
       system with mock PI cases).
     • Open here: the tool fills the window (✕ Close comes back). New tab ↗: its own tab.
     • Trainees: a card opens with its lesson (Admin → 📅 Open Lessons).
       The portal simulators get the trainee's name and batch, so their
       scores are saved for the trainer (program FT).
   ============================================================ */
(function(){
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";

const TOOLS = {
  call:     {icon:"📞", name:"Call Simulator", page:"call.html", desc:"A caller phones in; you answer by voice or typing, then get a scored debrief."},
  calendar: {icon:"📅", name:"Calendaring Simulator", page:"calendar.html", desc:"A week of scheduling requests to put on the calendar, checked for conflicts and details."},
  records:  {icon:"🏥", name:"Medical Records Requests", page:"records.html", desc:"Send records requests on a practice case: authorization, providers, follow-ups, invoices."},
  email:    {icon:"✉️", name:"Email Workspace", page:"email.html", desc:"A practice inbox for writing and sending the emails a task needs."},
  drill:    {icon:"☎️", name:"Front Desk Drill (CMS)", cms:"program=reception&drill=1", desc:"Scored front-desk calls in the training CMS: identify the caller, take the message, route it."},
  intake:   {icon:"🗂", name:"CMS — Intake", cms:"program=intake", desc:"The training CMS's intake screens: open a mock case and enter or save the intake."},
  cms:      {icon:"🗂", name:"CMS — Case file", cms:"program=cm", desc:"The training CMS with mock PI cases: upload documents, record insurance, liens and notes."}
};

// The Training Guide's mock calls and demos (its own names), with the lesson each belongs to.
const ACTIVITIES = [
  {kind:"call", lesson:4, title:"Reception Mock Calls", tools:["drill","call"]},
  {kind:"call", lesson:5, title:"Calendar Management Mock Calls", tools:["calendar","call"]},
  {kind:"call", lesson:6, title:"Intake Mock Calls", note:"Take the call while working in the CMS's intake screens.", tools:["call","intake"]},
  {kind:"demo", lesson:6, title:"Saving Intake Packet and Extracted Intake Documents Demo", tools:["intake"]},
  {kind:"demo", lesson:7, title:"LOR Uploading and Sending Demo (1P & 3P)", tools:["cms","email"]},
  {kind:"demo", lesson:8, title:"Sending MedLOR and Requesting Medical Bills & Records Demo", tools:["records","cms"]},
  {kind:"demo", lesson:8, title:"LV (Lien Verification) Request Demo", tools:["cms","email"]},
  {kind:"demo", lesson:9, title:"Reduction Request, Settlement Release Forms and Closing Statement Demo", tools:["cms","email"]}
];

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["simulators"]);

const isTrainee = ()=> !!state.traineeId && !state.isAdmin;
function toolHref(id){
  const t = TOOLS[id];
  if(t.cms) return CMS + "?" + t.cms;
  const q = new URLSearchParams({program:"FT"});
  if(isTrainee()){
    const name = state.certName || state.traineeName;
    if(name) q.set("name", name);
    if(state.traineeBatch) q.set("batch", state.traineeBatch);
  }
  return PORTAL + t.page + "?" + q;
}
function lessonTitle(id){ const d = DAYS.find(x=>x.id===id); return d ? d.title : ""; }
function activityOpen(a){ return state.isAdmin || state.adminPreview || window.dayUnlocked(a.lesson); }

function renderCard(a, i){
  const open = activityOpen(a);
  const tools = a.tools.map(id=>{
    const t = TOOLS[id];
    return `<div class="fts-tool">
      <div class="fts-tool-txt"><b>${t.icon} ${esc(t.name)}</b><span>${esc(t.desc)}</span></div>
      <div class="fts-tool-act">${open
        ? `<button class="btn btn-navy btn-sm" onclick="ftsOpen(${i},'${id}')">Open here</button><a class="btn btn-ghost btn-sm" href="${esc(toolHref(id))}" target="_blank" rel="noopener">New tab ↗</a>`
        : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
  }).join("");
  return `<div class="card fts-card ${open?"":"fts-locked"}">
    <div class="fts-kicker">${esc(lessonTitle(a.lesson))}${open ? "" : " · opens with this lesson"}</div>
    <h3>${esc(a.title)}</h3>
    ${a.note ? `<p class="fts-note">${esc(a.note)}</p>` : ""}
    ${tools}
  </div>`;
}
function renderSimulators(){
  const group = (kind, h, sub)=>{
    const cards = ACTIVITIES.map((a,i)=>a.kind===kind ? renderCard(a,i) : "").join("");
    return `<section class="fts-group"><h2>${h}</h2><p class="fts-sub">${sub}</p><div class="fts-grid">${cards}</div></section>`;
  };
  return `<div class="fts-hero"><h1>🛠 Simulators</h1>
      <p>Practice for the mock calls and demos in your training. Each one opens with its lesson.${isTrainee() ? " Your name and batch go with your scores so your trainer can see them." : ""}</p></div>
    ${group("call", "📞 Mock calls", "Practice the calls before your mock call with the trainer.")}
    ${group("demo", "🖥 Demos", "Walk through the demo's steps on a practice case before your demonstration.")}`;
}

// Open here: the tool fills the window in its own panel, outside the page, so the page
// re-rendering underneath (menu, lessons opening) never reloads a simulator mid-call.
function ftsPanel(){
  let p = document.getElementById("fts-panel");
  if(p) return p;
  p = document.createElement("div");
  p.id = "fts-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true");
  p.innerHTML = `<div class="fts-panel-bar"><b id="fts-panel-title"></b><span>
      <a class="btn btn-ghost btn-sm" id="fts-panel-link" href="#" target="_blank" rel="noopener">New tab ↗</a>
      <button class="btn btn-ghost btn-sm" type="button" onclick="ftsFullscreen()">⛶ Full screen</button>
      <button class="btn btn-navy btn-sm" type="button" onclick="ftsClose()">✕ Close</button></span></div>
    <div class="fts-panel-body"></div>`;
  document.body.appendChild(p);
  return p;
}
window.ftsOpen = function(i, id){
  const a = ACTIVITIES[i]; if(!a || !activityOpen(a)) return;
  const url = toolHref(id), name = `${TOOLS[id].name} — ${a.title}`, p = ftsPanel();
  p.querySelector("#fts-panel-title").textContent = name;
  p.querySelector("#fts-panel-link").href = url;
  p.querySelector(".fts-panel-body").innerHTML = `<iframe id="ftsIframe" src="${esc(url)}" title="${esc(name)}" allow="microphone; clipboard-read; clipboard-write; fullscreen" allowfullscreen></iframe>`;
  p.classList.add("open"); document.body.classList.add("fts-panel-open");
};
window.ftsClose = function(){
  const p = document.getElementById("fts-panel"); if(!p) return;
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  p.classList.remove("open"); p.querySelector(".fts-panel-body").innerHTML = ""; document.body.classList.remove("fts-panel-open");
};
window.ftsFullscreen = function(){ const f = document.getElementById("ftsIframe"); if(f && f.requestFullscreen) f.requestFullscreen().catch(()=>{}); };
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !document.fullscreenElement && document.body.classList.contains("fts-panel-open")) ftsClose(); });

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="simulators"){ ftsClose(); return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-sims">${renderSimulators()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  if(!isTrainee() || state.ftOpenDays) return;
  ftLoadOpenDays().then(()=>{ if(state.view==="simulators") render(); }).catch(()=>{});
};
const __topbar = window.renderTopbar;
window.renderTopbar = function(){
  const html = __topbar.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin) return html;
  const btn = `<button class="${state.view==="simulators"?"active":""}" onclick="goto('simulators')">🛠 Simulators</button>`;
  return html.replace(/(<button[^>]*onclick="goto\('dashboard'\)"[^>]*>[^<]*<\/button>)/, "$1" + btn);
};

(function(){ const s = document.createElement("style"); s.id = "ft-simulators"; s.textContent = `
main.main-sims{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.fts-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;}
.fts-hero p{margin:0 0 20px;color:var(--ink-soft);font-size:15px;max-width:760px;}
.fts-group{margin-bottom:28px;} .fts-group h2{margin:0 0 4px;color:var(--navy);font-size:21px;}
.fts-sub{margin:0 0 14px;color:var(--ink-soft);font-size:14px;}
.fts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:14px;}
.fts-card{padding:16px 18px;display:flex;flex-direction:column;gap:10px;}
.fts-card h3{margin:0;color:var(--navy);font-size:17px;line-height:1.3;}
.fts-kicker{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--orange-deep);}
.fts-note{margin:0;font-size:13.5px;color:var(--ink-soft);}
.fts-locked{opacity:.65;}
.fts-tool{display:flex;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid var(--line,#e5e7eb);padding-top:10px;flex-wrap:wrap;}
.fts-tool-txt{flex:1 1 200px;min-width:0;} .fts-tool-txt b{display:block;font-size:14.5px;color:var(--ink,#111827);}
.fts-tool-txt span{display:block;font-size:13px;color:var(--ink-soft);margin-top:2px;}
.fts-tool-act{display:flex;gap:8px;flex-wrap:wrap;}
.fts-tool-act a.btn{text-decoration:none;}
#fts-panel{display:none;position:fixed;inset:0;z-index:9000;background:var(--bg,#f8fafc);flex-direction:column;}
#fts-panel.open{display:flex;} body.fts-panel-open{overflow:hidden;}
.fts-panel-bar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 16px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e5e7eb);}
.fts-panel-bar b{color:var(--navy);font-size:14.5px;min-width:0;overflow-wrap:anywhere;} .fts-panel-bar span{display:flex;gap:8px;flex-wrap:wrap;}
.fts-panel-bar a.btn{text-decoration:none;}
.fts-panel-body{flex:1;min-height:0;} .fts-panel-body iframe{display:block;width:100%;height:100%;border:0;background:#fff;}
`; document.head.appendChild(s); })();
})();
