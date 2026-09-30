/* ============================================================
   LSH Standard Foundational Training — program layer
   Loaded last (after the EA/PA engine and js/eapa-updates.js). The engine
   gives sign-in and approvals, progress, admin, feedback, certificates,
   Presenter view and Trainee view; this file adapts it to the curriculum:
     1. Trainees see the lessons: each lesson is its Canva training deck,
        one slide per section, named by its title (no "Day N" labels). The
        engine still calls them days internally (DAYS, state.dayId…).
     2. Facilitator's notes are not in the page: /trainer/notes.json is
        sent only to a signed-in trainer (see worker.js). Trainers see them
        in Admin → 📘 Curriculum (the whole guide); never in Trainee view
        or in the slides window shared with the room.
     3. Lessons open when the trainer opens them for a batch (Admin → 📅 Open Lessons).
     4. No quizzes: a trainee marks a lesson finished; all finished = certificate.
     5. Dashboard, top bar and admin tabs trimmed to what this program uses.
     6. Drive files open in the draggable pop-out viewer.
   ============================================================ */
window.FT_LAYER = true;
// Admin → 🕘 Attendance (js/attendance.js): the program's first days, off the platform, come before the lessons.
window.ATTENDANCE_TRAININGS_BEFORE = ["Onboarding", "Setting of Expectations & Tech Set-up"];
const FT_TOTAL_DAYS = DAYS.length;
// eapa-updates.js adds EA/PA topics to some days; each day's topics are its curriculum sections only.
DAYS.forEach(d=>{ d.lessons = d.sections.map(x=>({h:x.h})); d.quiz = []; d.quickChecks = []; });

(function(){ const s = document.createElement("style"); s.id = "ft-layer"; s.textContent = `
/* curriculum section slides */
.ft-section h4{margin-bottom:14px;}
.ft-body{font-size:15.5px;line-height:1.6;color:var(--ink);text-align:left;}
.ft-body p{margin:8px 0;}
.ft-body ul, .ft-body ol{margin:8px 0;padding-left:22px;}
.ft-body li{margin:4px 0;}
.ft-body h3{margin:18px 0 8px;font-size:16px;color:var(--navy);}
.ft-body a{color:var(--orange-deep);overflow-wrap:anywhere;}
.ft-body a.btn{color:#fff;text-decoration:none;} .ft-body a.btn:hover{color:#fff;}
.ft-body .url-list{display:flex;flex-direction:column;gap:4px;overflow-wrap:anywhere;}
.ft-body .plain-list{line-height:1.8;}
.ft-body .naming{background:#F6F7FB;border:1px solid var(--line);border-radius:8px;padding:10px 14px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;color:var(--navy);margin:8px 0;overflow-wrap:anywhere;}
.ft-body .naming div + div{margin-top:4px;}
.ft-body hr.stars{border:none;text-align:center;margin:16px 0;color:var(--ink-soft);letter-spacing:.3em;}
.ft-body hr.stars::after{content:"***************";}
.ft-body .shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:10px 0;}
.ft-body .shots figure{margin:0;}
.ft-body .shots a{display:flex;align-items:center;justify-content:center;background:#F6F7FB;border:1px solid var(--line);border-radius:8px;padding:6px;height:160px;}
.ft-body .shots img{max-width:100%;max-height:100%;object-fit:contain;}
.ft-body .shots figcaption{font-size:13px;color:var(--ink-soft);margin-top:4px;text-align:center;}
.ft-body .canva-frame{position:relative;width:100%;height:0;padding-top:56.25%;overflow:hidden;border-radius:8px;background:#161829;margin-top:10px;}
.ft-body .canva-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
.ft-body .actions{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:14px;color:var(--ink-soft);}
.ft-body .btn-row{display:flex;gap:8px;flex-wrap:wrap;}
.ft-body .btn.ghost{background:transparent;color:var(--navy);border:1px solid var(--line);}
.ft-body .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin:10px 0;}
.ft-body .res-card{background:#fff;border:1px solid var(--line);border-left:6px solid #dc2626;border-radius:10px;padding:12px 14px;cursor:pointer;transition:box-shadow .15s, transform .15s;}
.ft-body .res-card:hover{box-shadow:0 12px 32px rgba(15,33,72,.12);transform:translateY(-2px);}
.ft-body .res-head{display:inline-block;padding:3px 9px;border-radius:6px;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;}
.ft-body .facilitator, .pv-cues .facilitator{background:#F3F5FA;border:1px dashed #9AA1BC;border-radius:8px;padding:12px 16px;margin:12px 0;}
.ft-body .facilitator::before{content:"🧑‍🏫 Trainer only";display:block;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--orange-deep);margin-bottom:6px;}
.ft-empty-day{padding:40px;text-align:center;}
/* deck slides: the deck fills the slide at 16:9, with its Full screen button, no scrolling */
.lesson-slide:has(> .ft-deck){overflow:hidden;}
.lesson-slide > .card.ft-deck{height:100%;box-sizing:border-box;display:flex;flex-direction:column;padding:12px 16px 16px;margin:0;}
.ft-deck .topic-separator{margin:0 0 8px;}
.ft-deck .ft-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;}
.ft-deck .ft-body .canva-frame{flex:1 1 auto;min-height:0;padding-top:0;height:auto;margin:0;container-type:size;background:transparent;overflow:visible;}
.ft-deck .ft-body .canva-frame iframe{position:absolute;inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100cqw, 100cqh * 16 / 9);height:min(100cqh, 100cqw * 9 / 16);border-radius:8px;background:#161829;}
.ft-deck .ft-body .actions{margin-top:8px;flex:0 0 auto;justify-content:center;}
.ft-deck .ft-body .actions > span:empty{display:none;}
.ft-deck .topic-separator{align-self:center;}
/* centred in the stage: a deck slide doesn't keep the presenter figure's column */
.stage-body:has(.ft-deck){grid-template-columns:minmax(0,1fr);}
.stage-body:has(.ft-deck) .stage-presenter{display:none;}
.stage-body:has(.ft-deck) #lessonSlideWrap{align-items:center;}
.ft-body p.li, .ftc-body p.li{display:flex;gap:.5em;margin:4px 0 4px calc(var(--lvl,0) * 24px);}
.ft-body p.li .lbl, .ftc-body p.li .lbl{flex:0 0 auto;min-width:1.4em;font-weight:700;color:var(--navy);}
.ft-body h5{margin:14px 0 6px;font-size:15px;color:var(--navy);}
/* the curriculum styles much of its body text as headings: keep them body-sized inside a slide */
.lesson-card .ft-body h3, .lesson-card .ft-body h4, .lesson-card .ft-body h5, .lesson-stage #lessonSlideWrap .lesson-card .ft-body h3, .lesson-stage #lessonSlideWrap .lesson-card .ft-body h4, .lesson-stage #lessonSlideWrap .lesson-card .ft-body h5, #audienceRoot .ft-body h3, #audienceRoot .ft-body h4, #audienceRoot .ft-body h5{font-family:'Inter',system-ui,sans-serif !important;font-size:16px !important;line-height:1.45 !important;text-align:left !important;margin:14px 0 6px !important;color:var(--navy) !important;font-weight:700 !important;letter-spacing:0 !important;text-transform:none !important;}
.lesson-card .ft-body h3, .lesson-stage #lessonSlideWrap .lesson-card .ft-body h3{font-size:17px !important;}
.lesson-card .ft-body p, .lesson-card .ft-body li, .lesson-card .ft-body td{text-align:left !important;}
.ft-body .lbl-h, .ftc-body .lbl-h{margin-right:.35em;}
.ft-body .tbl-wrap, .ftc-body .tbl-wrap{overflow-x:auto;margin:10px 0;}
.ft-body table.ft-table, .ftc-body table.ft-table{border-collapse:collapse;width:100%;font-size:14px;}
.ft-body table.ft-table td, .ftc-body table.ft-table td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;}
.ft-body table.ft-table td p, .ftc-body table.ft-table td p{margin:4px 0;}
.ft-body .redacted, .ftc-body .redacted{background:#FFF6EC;border:1px solid var(--orange-soft,#F0C08A);border-radius:8px;padding:8px 12px;font-weight:600;}
/* Admin → 📘 Curriculum */
.ftc{padding:18px 20px;}
.ftc-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 14px;}
.ftc-top select{font:inherit;padding:7px 10px;border-radius:8px;border:1px solid var(--line);max-width:100%;}
.ftc-body{font-size:15px;line-height:1.6;}
.ftc-body a{color:var(--orange-deep);overflow-wrap:anywhere;}
.ftc-body h3{font-size:17px;color:var(--navy);margin:18px 0 8px;} .ftc-body h4, .ftc-body h5{color:var(--navy);margin:14px 0 6px;}
.ftc-body hr.stars{border:none;text-align:center;margin:14px 0;color:var(--ink-soft);letter-spacing:.3em;} .ftc-body hr.stars::after{content:"***************";}
.ftc-body .shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:10px 0;}
.ftc-body .shots figure{margin:0;} .ftc-body .shots a{display:flex;align-items:center;justify-content:center;background:#F6F7FB;border:1px solid var(--line);border-radius:8px;padding:6px;height:160px;}
.ftc-body .shots img{max-width:100%;max-height:100%;object-fit:contain;} .ftc-body .shots figcaption{font-size:13px;color:var(--ink-soft);text-align:center;}
.ftc-body a.ft-lesson-link{display:inline-block;background:var(--navy);color:#fff;padding:8px 14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;}
.ftc-body a.ft-lesson-link:hover{background:var(--orange-deep);color:#fff;}
.ftc-body .canva-frame{position:relative;width:100%;height:0;padding-top:56.25%;overflow:hidden;border-radius:8px;background:#161829;}
.ftc-body .canva-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:none;}
/* dashboard: every lesson on one timeline row */
.step-timeline{flex-wrap:nowrap;}
.step-timeline .step-circle{width:38px;height:38px;font-size:14px;}
.step-timeline .step-dash{flex:1 1 8px;min-width:6px;width:auto;}
@media (max-width:900px){ .step-timeline{flex-wrap:wrap;row-gap:10px;} }
.ft-hero-title{font-family:'Fraunces',Georgia,serif;}
.ft-open-days{padding:18px 20px;margin-bottom:18px;}
.ft-open-days h3{margin:0 0 4px;color:var(--navy);}
.ft-open-days .ft-od-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0;}
.ft-open-days select{font:inherit;padding:7px 10px;border-radius:8px;border:1px solid var(--line);}
.ft-od-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
.ft-od-day{display:flex;gap:8px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:13px;background:#fff;cursor:pointer;}
.ft-od-day.on{border-color:var(--orange);background:#FFF6EC;}
.ft-od-day.nocontent{opacity:.55;}
.module-finish-btn.ft-video-locked{opacity:.6;cursor:not-allowed;}
.ft-od-day b{display:block;color:var(--navy);}
/* pop-out viewer (same as the LSH Training Portal's Recorded Lectures) */
#lecture-viewer-pane{position:fixed;right:24px;bottom:24px;width:380px;max-width:calc(100vw - 48px);height:250px;max-height:calc(100vh - 48px);background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 20px 50px rgba(0,0,0,.35);display:none;flex-direction:column;z-index:3000;overflow:hidden;}
#lecture-viewer-pane.open{display:flex;}
body.lv-dragging iframe{pointer-events:none;}
body.lv-dragging{user-select:none;}
#lecture-viewer-header{background:#161829;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;flex-shrink:0;border-bottom:2px solid #dc2626;}
#lecture-viewer-title{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:12px;}
#lecture-viewer-actions{display:flex;gap:6px;flex-shrink:0;align-items:center;}
#lecture-viewer-open-link, #lecture-viewer-fullscreen, #lecture-viewer-close{background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;font-size:12px;font-weight:700;font-family:inherit;border-radius:5px;padding:4px 8px;cursor:pointer;text-decoration:none;line-height:1.4;display:inline-block;}
#lecture-viewer-open-link:hover, #lecture-viewer-fullscreen:hover{background:rgba(255,255,255,.15);}
#lecture-viewer-close:hover{background:#dc2626;border-color:#dc2626;}
#lecture-viewer-body{flex:1;position:relative;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;}
#lecture-viewer-frame-holder{display:contents;}
#lecture-viewer-body iframe{width:100%;height:100%;border:none;background:#fff;}
#lecture-viewer-fallback{padding:40px 24px;text-align:center;font-size:12px;color:#94a3b8;}
#lecture-viewer-fallback a{color:#dc2626;font-weight:700;}
`; document.head.appendChild(s); })();

const FT_IS_AUDIENCE = typeof PV_IS_AUDIENCE !== "undefined" && PV_IS_AUDIENCE;

/* ---------- 1. one slide per curriculum section ---------- */
/* Topic dividers, as in the EA/PA and CM courses: in a lesson rebuilt from its deck (one slide per deck
   page), each topic opens with a divider slide (the lesson · Topic N of M · the topic's title). A topic
   starts at the page with that id (page ids stay put when pages are added). A lesson that is one Canva
   deck has no dividers: the deck has its own title page. */
const FT_TOPICS = {
  1: [["v002", "Objective, Agenda & Introduction"], ["v020", "Kickstart Your Legal VA Career"], ["v021", "Legal Practice and Virtual Assistants"],
      ["v025", "Overview of Tasks and Roles"],
      ["v036", "Types of Law Firms"], ["v134", "Tips to Stand Out as a Legal VA"]],
  2: [["p02", "Objectives & Agenda"], ["p05", "Inbound Calls: Caller Roles"], ["p07", "Inbound Call Best Practices"],
      ["p25", "Common Outbound Calls"], ["p27", "Client Contact Calls"], ["p30", "Invoice Follow-up Calls"], ["p36", "Provider Calls"],
      ["p40", "Calls to Adjusters"], ["p45", "Court Calls"], ["p48", "Calls to Opposing Counsel"], ["p53", "Outbound Caller Best Practices"]],
  4: [["p02", "Introduction & Common Reception Tasks"], ["p08", "Handling Callers: Inquiries, Clients, Counsel, Providers, Courts & Insurers"],
      ["p28", "Receptionist Best Practices"], ["p39", "Payment Calls"], ["p42", "Routing Calls: Transfers & Conference Calls"]],
  7: [["n002", "The Role, Objective & Workflow"], ["n004", "Coverages & Opening a Claim"], ["n014", "Contacting Insurers & Filing Claims"],
      ["n022", "Letter of Representation"], ["n036", "Declaration Pages"], ["n043", "Coverages & Policy Limits"],
      ["n052", "Liability"], ["n075", "Rideshare (TNC) Claims"], ["n084", "Rental Car Claims"],
      ["n100", "Best Practices for Claims Specialists"], ["t151715.508", "Dropped Cases & Withdrawal Letters"], ["t151825.685", "No Contact Protocol"]]
};
// the day's topics that are in it: [{h, at: index of the topic's first page}]
function ftTopics(d){
  const ids = (d.sections||[]).map(x=>x.id);
  return (FT_TOPICS[d.id]||[]).map(([id, h])=>({h, at: ids.indexOf(id)})).filter(t=>t.at >= 0).sort((a, b)=>a.at - b.at);
}
window.buildDaySlides = function(d){
  const topics = ftTopics(d), out = [];
  (d.sections||[]).forEach((x, i)=>{
    const k = topics.findIndex(t=>t.at === i);
    if(k >= 0) out.push({type:"ftDivider", topic:k, before:i});
    out.push({type:"ftSection", index:i});
  });
  return out;
};
const __ftSlideTitle = window.daySlideTitle;
window.daySlideTitle = function(d, slide){
  if(slide && slide.type==="ftDivider") return `Topic ${slide.topic+1}: ${ftTopics(d)[slide.topic].h}`;
  return slide && slide.type==="ftSection" ? d.sections[slide.index].h : __ftSlideTitle(d, slide);
};
const __ftSlideContent = window.renderDaySlideContent;
window.renderDaySlideContent = function(d, slide, idx){
  if(slide && slide.type==="ftDivider"){
    const topics = ftTopics(d), t = topics[slide.topic];
    return `
    <div class="topic-divider">
      <div class="td-kicker">${esc(ftLabel(d))} &middot; ${esc(d.title)}</div>
      <div class="td-num">Topic ${slide.topic+1} of ${topics.length}</div>
      <h2 class="td-title">${esc(t.h)}</h2>
    </div>`;
  }
  if(!slide || slide.type!=="ftSection") return __ftSlideContent(d, slide, idx);
  const sec = d.sections[slide.index];
  const sep = `<div class="topic-separator">${esc(d.title)}${d.sections.length>1 ? ` &middot; PART ${slide.index+1} OF ${d.sections.length}` : ""}</div>`;
  // A deck page shown as its own image (build/slides/image_lesson.py) carries its own title: the page alone.
  if(/^\s*<div class="cs cs-pages"/.test(sec.html)) return `
    <div class="card lesson-card ft-section ft-page" data-part="1"><div class="ft-body">${sec.html}</div></div>`;
  // A deck (or the word game) is the whole slide: no big heading, and it's sized to fit the slide.
  if(/^\s*<div class="canva-frame"/.test(sec.html)) return `
    <div class="card lesson-card ft-section ft-deck" data-part="1">${sep}<div class="ft-body">${sec.html}</div></div>`;
  return `
    ${sep}
    <div class="card lesson-card ft-section" data-part="1">
      <h4><span class="lnum">${String(slide.index+1).padStart(2,"0")}</span>${esc(sec.h)}</h4>
      <div class="ft-body">${sec.html}</div>
    </div>`;
};
/* Saved places are slide positions, and before the dividers a slide was a page. So each trainee's
   "resume here" (lastSlide) and "furthest reached" (slideProgress) move once, per day, to the same page.
   Each of the two saved objects records which days it already holds in the new layout (its "_ftTopics"
   list), so the positions and that marker are always saved, synced and restored together (e.g. an older
   copy restored from the cloud is moved again, a moved one never twice). */
function ftMoveToDividers(){
  let changed = false;
  for(const [key, field] of [["last-slide", "lastSlide"], ["slide-progress", "slideProgress"]]){
    const obj = state[field] = (state[field] && typeof state[field]==="object") ? state[field] : {};
    const done = Array.isArray(obj._ftTopics) ? obj._ftTopics : [];
    let mine = false;
    for(const d of DAYS){
      if(!ftTopics(d).length || done.includes(d.id)) continue;
      const at = obj[d.id];
      if(typeof at==="number" && at > 0){
        const i = buildDaySlides(d).findIndex(x=>x.type==="ftSection" && x.index===at);
        if(i >= 0) obj[d.id] = i;
      }
      done.push(d.id); mine = true;
    }
    if(mine){ obj._ftTopics = done; storeSet(key, obj); changed = true; }
  }
  return changed;
}
// Saved progress is loaded (and migrateDayOrder runs) when the page starts, which can be before this file
// loads, and again after signing in or a cloud restore: move it now if it's loaded, and after every load.
const __ftMigrateDayOrder = window.migrateDayOrder;
window.migrateDayOrder = async function(){
  if(typeof __ftMigrateDayOrder === "function") await __ftMigrateDayOrder.apply(this, arguments);
  ftMoveToDividers();
};
if(state.dayOrderMigrated !== undefined) ftMoveToDividers();
// "Before you start": the day's sections as the curriculum lists them (no objectives, quiz or timing).
window.renderDayIntro = function(d){
  return `
    <div class="lesson-stage day-intro">
      <div class="lesson-slide"><div class="card lesson-card">
        <div class="di-kicker">${ftLabel(d)} · Before you start</div>
        <h2>${esc(d.heading || d.title)}</h2>
        <div class="di-grid" style="grid-template-columns:1fr;">
          <div class="di-box"><b>🗺 What this lesson covers</b><ol class="di-topics">${(ftTopics(d).length ? ftTopics(d) : d.sections).map(x=>`<li>${esc(x.h)}</li>`).join("")}</ol></div>
        </div>
      </div></div>
      <div class="slide-nav"><button class="btn btn-ghost" onclick="goto('dashboard')">← Dashboard</button><span class="slide-counter">${ftTopics(d).length ? `${ftTopics(d).length} topics · ${d.sections.length} pages` : `${d.sections.length} parts`}</span><button class="btn btn-primary" onclick="startDayFromIntro(${d.id})">Start lesson →</button></div>
    </div>`;
};
const __ftRenderDay = window.renderDay;
window.renderDay = function(id){
  const d = DAYS.find(x=>x.id===id);
  if(!d) return __ftRenderDay(id);
  const head = `<a class="back-link" onclick="goto('dashboard')">&larr; Back to roadmap</a>`;
  if(!dayUnlocked(id)){
    return `${head}
      <div class="card ft-empty-day">
        <div style="font-size:34px;margin-bottom:10px;">🔒</div>
        <h2 style="color:var(--navy);margin:0 0 8px;">${esc(ftName(id))} is locked</h2>
        <p style="color:var(--ink-soft);font-size:14px;">${esc(dayLockReason(id))}</p>
        <button class="btn btn-primary" style="margin-top:14px;" onclick="goto('dashboard')">Back to the roadmap</button>
      </div>`;
  }
  if(!d.sections.length){
    return `${head}
      <div class="card ft-empty-day">
        <div style="font-size:34px;margin-bottom:10px;">🗂</div>
        <h2 style="color:var(--navy);margin:0 0 8px;">${esc(d.heading)}</h2>
        <p style="color:var(--ink-soft);font-size:14px;">This lesson's deck hasn't been added to the platform yet.</p>
      </div>`;
  }
  return __ftRenderDay(id);
};

/* ---------- 2. facilitator's notes (trainer only) ---------- */
const FT = {notes:null, loading:null, tried:false, cookie:null};
function ftTrainerView(){ return !!state.isAdmin && !state.adminPreview && !FT_IS_AUDIENCE; }
function ftLoadNotes(){
  if(FT.notes) return Promise.resolve(FT.notes);
  if(FT.loading) return FT.loading;
  FT.tried = true;
  FT.loading = fetch("/trainer/notes.json", {cache:"no-store", headers: state.adminToken ? {Authorization: "Bearer " + state.adminToken} : {}})
    .then(r=>r.ok ? r.json() : null)
    .then(j=>{ FT.notes = j ? (j.slots || {}) : null; FT.loading = null; return FT.notes; })
    .catch(()=>{ FT.loading = null; return null; });
  return FT.loading;
}
// Trainer-only screenshots load as <img>, which can't send the token: keep it in a cookie scoped to /trainer.
function ftSyncTrainerCookie(){
  const want = state.isAdmin && state.adminToken ? state.adminToken : "";
  if(FT.cookie === want) return;
  FT.cookie = want;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = want ? `ft_admin=${encodeURIComponent(want)}; path=/trainer; max-age=43200; SameSite=Strict${secure}` : `ft_admin=; path=/trainer; max-age=0; SameSite=Strict${secure}`;
}
function ftFillSlots(){
  ftSyncTrainerCookie();
  const on = ftTrainerView();
  if(on && !FT.notes && !FT.tried){ ftLoadNotes().then(n=>{ if(n) ftFillSlots(); }); }
  document.querySelectorAll(".trainer-slot").forEach(el=>{
    const html = on && FT.notes ? (FT.notes[el.getAttribute("data-slot")] || "") : "";
    if(el.innerHTML !== html) el.innerHTML = html;
  });
}
const __ftAfterRender = window.afterRender;
window.afterRender = function(){
  const r = __ftAfterRender.apply(this, arguments);
  try{ ftFillSlots(); }catch(e){}
  // The open days are needed as soon as someone is signed in (the first check can run before sign-in).
  if(!state.ftOpenDays && !FT.odLoading && (state.traineeId || state.isAdmin) && !FT_IS_AUDIENCE){
    FT.odLoading = true;
    ftLoadOpenDays().then(()=>{ FT.odLoading = false; if(["dashboard","day"].includes(state.view)) render(); });
  }
  return r;
};
const __ftAdminLogout = window.adminLogout;
if(typeof __ftAdminLogout === "function") window.adminLogout = function(){ FT.notes = null; FT.tried = false; FTS_SCRIPT.data = null; FTS_SCRIPT.tried = false; FTC.data = null; FTC.failed = false; return __ftAdminLogout.apply(this, arguments); };
const __ftOpenAdmin = window.openAdmin;
if(typeof __ftOpenAdmin === "function") window.openAdmin = function(){ FT.tried = false; FTS_SCRIPT.tried = false; return __ftOpenAdmin.apply(this, arguments); };
/* Presenter view: the deck's page-by-page script, in the EA/PA format.
   trainer/scripts.json (trainer-only, like the notes) = {"<lesson id>": {"pages": [
     {"title": "…", "on": "what is on this page", "why": "① the why", "talk": "② talk it through",
      "walk": ["③ step", …], "ask": "④ ask the room / your turn", "scenario": "🎬 (optional)"}, …]}}
   The deck is one Canva embed, so the trainer steps through its pages here (← Page / Page →)
   alongside the deck. The facilitator's notes for the part follow as the Trainer note. */
const FTS_SCRIPT = {data:null, loading:null, tried:false, page:{}};
function ftLoadScripts(){
  if(FTS_SCRIPT.data) return Promise.resolve(FTS_SCRIPT.data);
  if(FTS_SCRIPT.loading) return FTS_SCRIPT.loading;
  FTS_SCRIPT.tried = true;
  FTS_SCRIPT.loading = fetch("/trainer/scripts.json", {cache:"no-store", headers: state.adminToken ? {Authorization: "Bearer " + state.adminToken} : {}})
    .then(r=>r.ok ? r.json() : null)
    .then(j=>{ FTS_SCRIPT.data = j || null; FTS_SCRIPT.loading = null; return FTS_SCRIPT.data; })
    .catch(()=>{ FTS_SCRIPT.loading = null; return null; });
  return FTS_SCRIPT.loading;
}
// A lesson rebuilt from its deck (build/slides/make_scripts.py) has one script per slide:
// {"sections": {"<section id>": {on, why, talk, walk, ask, scenario}}}. Headings in the notes (lines
// ending in ":") are shown in bold, the other walk-through lines as bullets.
function ftScriptLines(lines, bullets){
  return (lines || []).filter(Boolean).map(t=>/:\s*$|[–-] Speaker[’']s Notes$/.test(t) && t.length <= 90
    ? `<span class="fts-h">${esc(t)}</span>` : bullets ? `<span class="fts-li">${esc(t)}</span>` : `<span class="fts-p">${esc(t)}</span>`).join("");
}
function ftSectionScript(d, sec, sc){
  const i = d.sections.indexOf(sec), last = i === d.sections.length - 1;
  const row = (k, v)=> v ? `<div class="script-row"><b>${k}</b><p>${esc(v)}</p></div>` : "";
  const talk = (sc.talk || "").split("\n"), walk = sc.walk || [];
  return `<div class="pn">
      ${sc.on ? `<div class="pn-on"><b>On this page</b><p>${esc(sc.on)}</p></div>` : ""}
      <div class="script-block"><div class="script-head"><span>🎙 Script — read aloud</span></div>
        ${row("① The why", sc.why)}
        ${talk.filter(Boolean).length ? `<div class="script-row"><b>② Talk it through</b><div class="fts">${ftScriptLines(talk, false)}</div></div>` : ""}
        ${walk.length ? `<div class="script-row"><b>③ Walk through it</b><div class="fts">${ftScriptLines(walk, true)}</div></div>` : ""}
        ${row(last ? "④ Your turn" : "④ Ask the room", sc.ask)}
      </div>
      ${sc.scenario ? `<div class="pn-scen"><b>🎬 Scenario</b><p>${esc(sc.scenario)}</p></div>` : ""}
    </div>`;
}
function ftScriptHtml(d, sec){
  const deck = (FTS_SCRIPT.data || {})[String(d.id)];
  const sc = deck && deck.sections && deck.sections[sec.id];
  if(sc) return ftSectionScript(d, sec, sc);
  if(FTS_SCRIPT.loading && /^<div class="cs"/.test(sec.html)) return `<p class="pv-empty">Loading the script…</p>`;
  const pages = deck && sec.id === "deck" ? (deck.pages || []) : [];
  if(!pages.length){
    if(sec.id !== "deck") return "";
    return `<p class="pv-empty">${FTS_SCRIPT.data || FTS_SCRIPT.tried ? "The page-by-page script for this deck isn’t written yet." : "Loading the script…"}</p>`;
  }
  const i = Math.max(0, Math.min(FTS_SCRIPT.page[d.id] || 0, pages.length - 1)), pg = pages[i], last = i === pages.length - 1;
  const row = (k, v)=> v ? `<div class="script-row"><b>${k}</b><p>${esc(v)}</p></div>` : "";
  const walk = (pg.walk || []).filter(Boolean);
  return `<div class="ft-pg-nav"><button class="btn btn-ghost btn-sm" onclick="ftScriptPage(${d.id},-1)" ${i===0?"disabled":""}>← Page</button>
      <b>Page ${i+1} of ${pages.length}${pg.title ? ` · ${esc(pg.title)}` : ""}</b>
      <button class="btn btn-ghost btn-sm" onclick="ftScriptPage(${d.id},1)" ${last?"disabled":""}>Page →</button></div>
    <div class="pn">
      ${pg.on ? `<div class="pn-on"><b>On this page</b><p>${esc(pg.on)}</p></div>` : ""}
      <div class="script-block"><div class="script-head"><span>🎙 Script — read aloud · page ${i+1} of ${pages.length}</span></div>
        ${row("① The why", pg.why)}
        ${row("② Talk it through", pg.talk)}
        ${walk.length ? `<div class="script-row"><b>③ Walk through it</b><p>${walk.map(esc).join("<br>")}</p></div>` : ""}
        ${row(last ? "④ Your turn" : "④ Ask the room", pg.ask)}
      </div>
      ${pg.scenario ? `<div class="pn-scen"><b>🎬 Scenario</b><p>${esc(pg.scenario)}</p></div>` : ""}
    </div>`;
}
window.ftScriptPage = function(id, delta){
  const deck = (FTS_SCRIPT.data || {})[String(id)], n = deck && deck.pages ? deck.pages.length : 0;
  FTS_SCRIPT.page[id] = Math.max(0, Math.min((FTS_SCRIPT.page[id] || 0) + delta, n - 1));
  const d = DAYS.find(x=>x.id===id), cu = document.getElementById("pvCues");
  if(!d || !cu) return;
  const slides = buildDaySlides(d), slide = slides[state.lessonSlide || 0];
  cu.innerHTML = presenterCues(d, slide); cu.parentElement.scrollTop = 0;
};
const __ftCues = window.presenterCues;
window.presenterCues = function(d, slide){
  if(slide && slide.type==="ftDivider"){
    const topics = ftTopics(d), t = topics[slide.topic], end = topics[slide.topic+1] ? topics[slide.topic+1].at : d.sections.length;
    return `<h3>Topic ${slide.topic+1} of ${topics.length}: ${esc(t.h)}</h3><p>Name the topic, then move on to its first page (${end - t.at} page${end - t.at === 1 ? "" : "s"}, from “${esc(d.sections[t.at].h)}”).</p>`;
  }
  if(!slide || slide.type!=="ftSection") return __ftCues(d, slide);
  const sec = d.sections[slide.index];
  const keys = [...sec.html.matchAll(/data-slot="([^"]+)"/g)].map(m=>m[1]);
  const refresh = ()=>{ const cu = document.getElementById("pvCues"); if(cu && state.presenting){ cu.innerHTML = presenterCues(d, slide); } };
  if(!FT.notes && !FT.tried){ ftLoadNotes().then(n=>{ if(n) refresh(); }); }
  if(!FTS_SCRIPT.data && !FTS_SCRIPT.tried){ ftLoadScripts().then(j=>{ if(j) refresh(); }); }
  const notes = keys.map(k=>(FT.notes && FT.notes[k]) || "").join("");
  const script = ftScriptHtml(d, sec);
  const trainer = notes ? `<div class="pn-on ft-tnote"><b>Trainer note</b>${notes}</div>` : "";
  const empty = FT.notes || FT.tried ? "No facilitator’s notes for this part." : "Loading the facilitator’s notes…";
  return `<h3>${esc(sec.h)}</h3>` + (script || trainer ? script + trainer : `<p class="pv-empty">${empty}</p>`);
};
(function(){ const st = document.createElement("style"); st.textContent = `
.ft-pg-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;padding:8px 10px;background:#F3F5FA;border-radius:10px;}
.ft-pg-nav b{font-size:13px;color:var(--navy);text-align:center;flex:1;min-width:0;}
.ft-tnote{margin-top:12px;} .ft-tnote p, .ft-tnote li{font-size:13.5px;}
.fts{font-size:13px;line-height:1.5;} .fts span{display:block;margin:2px 0;}
.fts .fts-h{font-weight:700;color:var(--navy);margin-top:6px;} .fts .fts-h:first-child{margin-top:0;}
.fts .fts-li{position:relative;padding-left:14px;} .fts .fts-li::before{content:"•";position:absolute;left:2px;color:var(--orange-deep);}`; document.head.appendChild(st); })();

/* Presenter view console: on a Canva deck step, the preview area becomes a button that brings the
   slides window to the front. The preview itself is a locked copy (clicks there can't reach the room),
   and Canva doesn't let another page turn its deck, so the deck is turned in the slides window. */
function ftDeckConsole(){
  const box = document.getElementById("pvMirror");
  if(!box || !state.presenting) return;
  const d = DAYS.find(x=>x.id===state.dayId), slides = d ? buildDaySlides(d) : [], slide = slides[state.lessonSlide||0];
  const sec = slide && slide.type==="ftSection" ? d.sections[slide.index] : null;
  const isDeck = !!(sec && /class="canva-frame"/.test(sec.html));
  let btn = document.getElementById("ftDeckGo");
  if(!isDeck){ if(btn) btn.remove(); return; }
  const canva = /canva\.com\/design\//.test(sec.html), kind = canva ? "deck" : "game";
  if(btn && btn.dataset.kind === kind) return;
  if(btn) btn.remove();
  btn = document.createElement("button");
  btn.type = "button"; btn.id = "ftDeckGo"; btn.className = "ft-deck-go"; btn.dataset.kind = kind;
  btn.innerHTML = canva
    ? `<b>🎞 Turn the deck’s pages</b><span>Click here to bring the slides window to the front, then click the deck and use ← → (or Canva’s arrows).</span>`
    : `<b>🎮 Run it in the slides window</b><span>Click here to bring the slides window to the front, then click inside it to play.</span>`;
  btn.onclick = ftFocusSlides;
  box.appendChild(btn);
}
window.ftFocusSlides = function(){
  // window.focus() on another window is often ignored by the browser. Opening the window by its name
  // from this click (with no address, so the deck doesn't reload) is what brings it to the front.
  let w = null;
  try{ if(typeof PV !== "undefined" && PV.win && !PV.win.closed){ w = window.open("", "lshAudience"); } }catch(e){}
  if(w){ try{ w.focus(); }catch(e){} if(typeof PV !== "undefined") PV.win = w; setTimeout(ftFocusCheck, 400); return; }
  if(typeof presenterReopen === "function") presenterReopen();
};
// If this tab still has focus, the browser kept the slides window behind: say how to get there.
function ftFocusCheck(){
  const btn = document.getElementById("ftDeckGo");
  if(!btn || !document.hasFocus()) return;
  const sp = btn.querySelector("span");
  if(sp) sp.innerHTML = "Your browser kept this tab in front. Switch to the <b>LSH Slides</b> window yourself (<b>Alt+Tab</b>, or <b>Cmd+`</b> on a Mac), click the deck, then use ← →.";
}
const __ftPvRefresh = window.presenterRefresh;
if(typeof __ftPvRefresh === "function") window.presenterRefresh = function(){ const r = __ftPvRefresh.apply(this, arguments); try{ ftDeckConsole(); }catch(e){} return r; };
const __ftAfterRender2 = window.afterRender;
window.afterRender = function(){ const r = __ftAfterRender2.apply(this, arguments); try{ ftDeckConsole(); }catch(e){} return r; };
(function(){ const st = document.createElement("style"); st.textContent = `
.ft-deck-go{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;border:0;border-radius:12px;background:#141833;color:#fff;font:inherit;text-align:center;cursor:pointer;}
.ft-deck-go b{font-family:'Fraunces',Georgia,serif;font-size:22px;color:#F0C08A;}
.ft-deck-go span{font-size:14px;line-height:1.5;max-width:420px;opacity:.9;}
.ft-deck-go:hover{background:#1F2440;} .ft-deck-go:hover b{text-decoration:underline;}
.ft-deck-go:focus-visible{outline:3px solid #F0C08A;outline-offset:-3px;}`; document.head.appendChild(st); })();

/* ---------- 3. days open when the trainer opens them ----------
   settings:opendays = {all:[day ids], batches:{"<batch key>":[day ids]}} */
state.ftOpenDays = null;
function ftBatchKey(b){ return String(b||"").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function ftOpenFor(batch){
  const o = state.ftOpenDays || {};
  return new Set([].concat(o.all || [], (o.batches || {})[ftBatchKey(batch)] || []).map(Number));
}
async function ftLoadOpenDays(){
  const [v, vv] = await Promise.all([sharedGet("settings:opendays").catch(()=>null), sharedGet("settings:openvideos").catch(()=>null)]);
  const shape = x => (x && typeof x === "object") ? {all: x.all || [], batches: x.batches || {}} : {all: [], batches: {}};
  const next = shape(v), nextV = shape(vv);
  const changed = JSON.stringify(next) !== JSON.stringify(state.ftOpenDays) || JSON.stringify(nextV) !== JSON.stringify(state.ftOpenVideos);
  state.ftOpenDays = next; state.ftOpenVideos = nextV;
  return changed;
}
/* A lesson's ▶ Video Presentation stays locked until a trainer unlocks it (Admin → 📅 Open Lessons → 🎬 Unlock Videos),
   for all batches or one batch: settings:openvideos = {all:[lesson ids], batches:{"<batch key>":[lesson ids]}}. */
state.ftOpenVideos = null;
function ftVideoUnlocked(id){
  if(state.isAdmin || state.adminPreview) return true;
  const o = state.ftOpenVideos || {};
  return new Set([].concat(o.all || [], (o.batches || {})[ftBatchKey(state.traineeBatch)] || []).map(Number)).has(Number(id));
}
window.dayUnlocked = function(id){
  const d = DAYS.find(x=>x.id===id); if(!d) return false;
  if(state.isAdmin || state.adminPreview) return true;
  if(!d.sections.length) return false;
  const own = state.progress && state.progress[id];
  if(own && own.done) return true;
  return ftOpenFor(state.traineeBatch).has(id);
};
// A lesson address in a new or duplicated tab (#/day/3): the open lessons load a moment after start-up,
// so wait for them before deciding whether that lesson is locked.
const __ftOpenRoute = window.openRouteFromHash;
window.openRouteFromHash = function(){
  const r = typeof parseRouteHash === "function" ? parseRouteHash() : null;
  if(r && r.view === "day" && !state.isAdmin && !state.ftOpenDays){
    ftLoadOpenDays().then(()=>{ if(!__ftOpenRoute()) goto("dashboard"); }).catch(()=>goto("dashboard"));
    return true;
  }
  return __ftOpenRoute.apply(this, arguments);
};
window.dayLockReason = function(id){
  const d = DAYS.find(x=>x.id===id);
  if(d && !d.sections.length) return `${ftName(id)} hasn't been added to the platform yet.`;
  return `Your trainer opens this lesson when your batch starts it.`;
};
function ftRefreshOpenDays(){
  if(FT_IS_AUDIENCE || !(state.traineeId || state.isAdmin)) return;
  ftLoadOpenDays().then(changed=>{ if(changed && ["dashboard","day"].includes(state.view)) render(); });
}
setTimeout(ftRefreshOpenDays, 300);
setInterval(ftRefreshOpenDays, 60000);
const __ftGoto = window.goto;
window.goto = function(view){ const r = __ftGoto.apply(this, arguments); if(view==="dashboard") ftRefreshOpenDays(); return r; };

/* Admin → 📅 Open Days */
function ftKnownBatches(){
  const set = new Map();
  (state.adminData || []).forEach(r=>{ const b = String(r.batch||"").trim(); if(b && !set.has(ftBatchKey(b))) set.set(ftBatchKey(b), b); });
  Object.keys((state.ftOpenDays||{}).batches || {}).forEach(k=>{ if(!set.has(k)) set.set(k, k); });
  return [...set.entries()].sort((a,b)=>a[1].localeCompare(b[1]));
}
function renderFtOpenDays(){
  const batches = ftKnownBatches();
  const sel = state.ftOdBatch || "__all";
  const o = state.ftOpenDays || {all:[], batches:{}};
  const open = new Set((sel==="__all" ? o.all : (o.batches||{})[sel] || []).map(Number));
  const everyone = new Set((o.all||[]).map(Number));
  return `
    <div class="card ft-open-days">
      <h3>📅 Open Lessons</h3>
      <p style="margin:0;color:var(--ink-soft);font-size:14px;">Trainees only see a lesson once it's open for them. Open each lesson when the batch starts it. A lesson opened for <b>All batches</b> is open for everyone.</p>
      <div class="ft-od-row">
        <label for="ftOdBatch"><b>Batch</b></label>
        <select id="ftOdBatch" onchange="ftSetOdBatch(this.value)">
          <option value="__all" ${sel==="__all"?"selected":""}>All batches</option>
          ${batches.map(([k, label])=>`<option value="${esc(k)}" ${sel===k?"selected":""}>${esc(label)}</option>`).join("")}
        </select>
        ${state.adminData ? "" : `<span style="font-size:13px;color:var(--ink-soft);">Loading batches…</span>`}
      </div>
      <div class="ft-od-days">
        ${DAYS.map(d=>{
          const on = open.has(d.id), viaAll = sel!=="__all" && everyone.has(d.id);
          return `<label class="ft-od-day ${on||viaAll?"on":""} ${d.sections.length?"":"nocontent"}">
            <input type="checkbox" ${on||viaAll?"checked":""} ${viaAll||!d.sections.length?"disabled":""} onchange="ftToggleOpenDay(${d.id}, this.checked)">
            <span><b>${esc(d.title)}</b>${viaAll?`<br><i>open for all batches</i>`:""}${d.sections.length?"":`<br><i>no content yet</i>`}</span>
          </label>`;
        }).join("")}
      </div>
    </div>`;
}
function renderFtOpenVideos(){
  const sel = state.ftOdBatch || "__all";
  const o = state.ftOpenVideos || {all:[], batches:{}};
  const open = new Set((sel==="__all" ? o.all : (o.batches||{})[sel] || []).map(Number));
  const everyone = new Set((o.all||[]).map(Number));
  const withVideo = DAYS.filter(d=>d.video);
  return `
    <div class="card ft-open-days">
      <h3>🎬 Unlock Videos</h3>
      <p style="margin:0;color:var(--ink-soft);font-size:14px;">A lesson’s ▶ Video Presentation stays locked for trainees (🔒) until you unlock it here, for ${sel==="__all" ? "<b>All batches</b>" : "batch <b>" + esc(sel) + "</b>"} (the batch chosen above). A video unlocked for All batches is unlocked for everyone.</p>
      <div class="ft-od-days" style="margin-top:10px;">
        ${withVideo.map(d=>{
          const on = open.has(d.id), viaAll = sel!=="__all" && everyone.has(d.id);
          return `<label class="ft-od-day ${on||viaAll?"on":""}">
            <input type="checkbox" ${on||viaAll?"checked":""} ${viaAll?"disabled":""} onchange="ftToggleOpenVideo(${d.id}, this.checked)">
            <span><b>${esc(d.title)}</b>${viaAll?`<br><i>unlocked for all batches</i>`:""}</span>
          </label>`;
        }).join("")}
      </div>
    </div>`;
}
window.ftToggleOpenVideo = async function(id, on){
  await ftLoadOpenDays();
  const o = state.ftOpenVideos;
  const sel = state.ftOdBatch || "__all";
  const list = new Set((sel==="__all" ? o.all : (o.batches[sel] = o.batches[sel] || [])).map(Number));
  on ? list.add(id) : list.delete(id);
  const arr = [...list].sort((a,b)=>a-b);
  if(sel==="__all") o.all = arr; else o.batches[sel] = arr;
  const ok = await sharedSet("settings:openvideos", o);
  toast(ok ? `${ftName(id)} video ${on ? "unlocked" : "locked"} for ${sel==="__all" ? "all batches" : "batch " + sel}.` : "Couldn't save — check your connection and try again.");
  render();
};
window.ftSetOdBatch = function(v){ state.ftOdBatch = v; render(); };
window.ftToggleOpenDay = async function(id, on){
  await ftLoadOpenDays();
  const o = state.ftOpenDays;
  const sel = state.ftOdBatch || "__all";
  const list = new Set((sel==="__all" ? o.all : (o.batches[sel] = o.batches[sel] || [])).map(Number));
  on ? list.add(id) : list.delete(id);
  const arr = [...list].sort((a,b)=>a-b);
  if(sel==="__all") o.all = arr; else o.batches[sel] = arr;
  const ok = await sharedSet("settings:opendays", o);
  toast(ok ? `${ftName(id)} ${on ? "opened" : "closed"} for ${sel==="__all" ? "all batches" : "batch " + sel}.` : "Couldn't save — check your connection and try again.");
  render();
};
/* Admin → 📘 Curriculum: the whole Training Guide (facilitator content included) from
   /trainer/curriculum.json, which the Worker sends only to a signed-in trainer.
   Log-in credentials are not in it: they point to the credentials document. */
const FTC = {data:null, loading:false, failed:false};
function ftLoadCurriculum(){
  if(FTC.data || FTC.loading) return;
  FTC.loading = true;
  fetch("/trainer/curriculum.json", {cache:"no-store", headers: state.adminToken ? {Authorization: "Bearer " + state.adminToken} : {}})
    .then(r=>r.ok ? r.json() : null)
    .then(j=>{ FTC.data = j; FTC.failed = !j; FTC.loading = false; if(state.view==="admin" && state.adminTab==="curriculum") render(); })
    .catch(()=>{ FTC.failed = true; FTC.loading = false; if(state.view==="admin") render(); });
}
function renderFtCurriculum(){
  if(!FTC.data){
    ftLoadCurriculum();
    return `<div class="card ftc">${FTC.failed ? "Couldn’t load the curriculum — sign in again as Admin and retry." : "Loading the curriculum…"}</div>`;
  }
  const sel = state.ftcDay == null ? (FTC.data.days[0] || {}).id : state.ftcDay;
  const day = FTC.data.days.find(d=>d.id===sel) || FTC.data.days[0];
  return `<div class="card ftc">
    <h3 style="margin:0;color:var(--navy);">📘 Training Guide for LSH Trainees</h3>
    <p style="margin:4px 0 0;color:var(--ink-soft);font-size:14px;">The full curriculum, facilitator's notes included. Trainer only — trainees never see this tab. Log-in credentials aren’t stored here; they link to the credentials document.</p>
    <div class="ftc-top">
      <label for="ftcDay"><b>Day</b></label>
      <select id="ftcDay" onchange="state.ftcDay = +this.value; render();">
        ${FTC.data.days.map(d=>`<option value="${d.id}" ${d.id===day.id?"selected":""}>${esc(d.heading)}</option>`).join("")}
      </select>
    </div>
    <div class="ftc-body"><h3 style="font-family:'Fraunces',Georgia,serif;font-size:22px;">${esc(day.heading)}</h3>${day.html}</div>
  </div>`;
}
const __ftRenderAdmin = window.renderAdmin;
window.renderAdmin = function(){
  if(["rankings","sop","cues","studio"].includes(state.adminTab)) state.adminTab = "audit";
  const odTab = `<button class="admin-tab-btn ${state.adminTab==="opendays"?"active":""}" onclick="setAdminTab('opendays')">📅 Open Lessons</button>`;
  const curTab = `<button class="admin-tab-btn ${state.adminTab==="curriculum"?"active":""}" onclick="setAdminTab('curriculum')">📘 Curriculum</button>`;
  if(state.adminTab==="curriculum"){
    state.adminTab = "tfeedback";
    let out = __ftRenderAdmin();
    state.adminTab = "curriculum";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + "</div>";
    return ftTrimAdminTabs(bar, odTab + curTab) + renderFtCurriculum();
  }
  if(state.adminTab==="opendays"){
    state.adminTab = "tfeedback";                    // borrow the tab bar from the engine…
    let out = __ftRenderAdmin();
    state.adminTab = "opendays";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + "</div>";
    if(!state.adminData && typeof loadAdminData === "function" && !state.adminLoading) loadAdminData();
    if(!state.ftOpenVideos) ftLoadOpenDays().then(()=>{ if(state.adminTab==="opendays") render(); });
    return ftTrimAdminTabs(bar, odTab + curTab) + renderFtOpenDays() + renderFtOpenVideos();
  }
  return ftTrimAdminTabs(__ftRenderAdmin(), odTab + curTab);
};
function ftTrimAdminTabs(html, odTab){
  html = html.replace(/<button class="admin-tab-btn[^"]*" onclick="setAdminTab\('(rankings|sop|cues|studio)'\)">[^<]*<\/button>/g, "");
  return html.replace(/(<button class="admin-tab-btn[^"]*" onclick="setAdminTab\('audit'\)">[^<]*<\/button>)/, "$1" + odTab);
}

/* ---------- 4. finishing a day (no quizzes) ---------- */
async function ftFinishDay(id){
  const d = DAYS.find(x=>x.id===id); if(!d) return;
  if(state.isAdmin && !state.traineeId){ toast("Trainees mark their own lessons finished."); return; }
  if(!confirm(`Mark ${d.heading} as finished?`)) return;
  state.progress[id] = Object.assign({}, state.progress[id], {done:true, date:new Date().toISOString()});
  await storeSet("day-progress", state.progress);
  try{ syncToLedger(); }catch(e){}
  toast(`✓ ${ftName(id)} finished.`);
  goto("dashboard");
}
window.finishTrainingForDay = ftFinishDay;
window.goToKnowledgeCheckWithInterstitial = function(){ ftFinishDay(state.dayId); };

/* ---------- 5. dashboard, day cards, top bar ---------- */
// A lesson card shows its title only (no list of its slides).
window.moduleCard = function(d){
  const prog = state.progress[d.id];
  const unlocked = dayUnlocked(d.id);
  const status = prog && prog.done ? "done" : (unlocked && d.sections.length ? "open" : "locked");
  const label = status==="done" ? " &middot; Finished" : (!d.sections.length ? " &middot; Coming soon" : (status==="locked" ? " &middot; 🔒 Locked" : ""));
  return `
  <div class="module-card mc-${status}" id="module-${d.id}">
    <div class="module-head">
      <div class="mh-day">${label.replace(/^ &middot; /,"") || "&nbsp;"}</div>
      <div class="mh-title">${esc(d.title)}</div>
    </div>
    <div class="module-body">
      ${typeof feedbackButton==="function" ? feedbackButton(d.id) : ""}
    </div>
    <button class="btn module-start-btn ${status==="locked"?"btn-ghost":"btn-navy"}" ${status==="locked"&&!(state.isAdmin&&d.sections.length)?"disabled":""} onclick="goto('day',${d.id})">${status==="done"?"Review":(state.isAdmin&&status==="locked"&&d.sections.length?"Open":"Start")}</button>
    ${d.video ? (ftVideoUnlocked(d.id)
      ? `<button class="btn btn-ghost btn-sm module-finish-btn" onclick="event.stopPropagation(); ftOpenVideo(${d.id})">▶ Video Presentation</button>`
      : `<button class="btn btn-ghost btn-sm module-finish-btn ft-video-locked" disabled title="Your trainer unlocks this video">🔒 Video Presentation</button>`) : ""}
  </div>`;
};
window.renderDashboard = function(){
  const done = DAYS.filter(d=>state.progress[d.id] && state.progress[d.id].done).length;
  const pct = Math.round(done / FT_TOTAL_DAYS * 100);
  const cert = state.traineeId ? certData() : null;
  return `
  <div class="dash-top">
    <div class="dash-hero">
      <div class="dash-hero-text">
        <p class="eyebrow">LSH TRAINING PROGRAM</p>
        <h1 class="ft-hero-title">Standard Foundational Training</h1>
      </div>
      <div class="dash-hero-ribbon">${completionRibbonSvg(pct, done)}</div>
    </div>
    <div class="step-timeline">
      ${DAYS.map((d,i)=>{
        const prog = state.progress[d.id], unlocked = dayUnlocked(d.id) && d.sections.length;
        const st = (prog&&prog.done ? "st-done" : (unlocked ? "st-open" : "st-locked"));
        return `<div class="step-node">
          <div class="step-circle ${st}" onclick="${unlocked?`scrollToModule(${d.id})`:""}" title="${esc(d.title)}">${prog&&prog.done?"✓":(d.short||d.id)}</div>
          ${i<DAYS.length-1?`<div class="step-dash ${prog&&prog.done?"filled":""}"></div>`:""}
        </div>`;
      }).join("")}
    </div>
  </div>
  <div class="dash-layout">
    <div class="dash-main">
      ${state.isAdmin && !state.adminPreview ? `<div class="card" style="padding:14px 18px;margin-bottom:14px;font-size:14px;">📅 Open lessons for a batch in <a style="cursor:pointer;color:var(--orange-deep);font-weight:700;" onclick="state.adminTab='opendays'; goto('admin')">Admin → Open Lessons</a>.</div>` : ""}
      <div class="module-grid">${DAYS.map(d=>moduleCard(d)).join("")}</div>
      <div class="hero-actions bottom-actions">
        ${resumeLabel() ? `<button class="btn btn-primary resume-btn" onclick="resumeWhereLeftOff()">▶ Resume where you left off <span>${esc(resumeLabel())}</span></button>` : ""}
        ${cert ? (done === FT_TOTAL_DAYS
          ? `<button class="btn cert-hero-btn" onclick="downloadCertificatePdf(null)">🎓 Download my Certificate</button><button class="btn btn-ghost cert-hero-view" onclick="openCertificate()">View</button>`
          : `<span class="cert-hero-locked" title="Finish all ${FT_TOTAL_DAYS} lessons to unlock">🎓 Certificate · ${done}/${FT_TOTAL_DAYS} lessons finished</span>`) : ""}
      </div>
    </div>
    <aside class="dash-side"><div class="dash-side-inner">
      <div class="card stat"><div class="num">${pct}%</div><div class="lbl">Program complete</div></div>
      <div class="card stat"><div class="num">${done} / ${FT_TOTAL_DAYS}</div><div class="lbl">Lessons finished</div></div>
      ${typeof renderFeedbackDashCard==="function" ? renderFeedbackDashCard() : ""}
    </div></aside>
  </div>`;
};
const __ftCertData = window.certData;
window.certData = function(src){
  const c = __ftCertData.apply(this, arguments);
  c.eligible = c.passed === FT_TOTAL_DAYS;   // every day finished (no Knowledge Checks in this program)
  return c;
};
// EA/PA-only screens (client profile, practice labs, roleplays, handouts, random tasks,
// facilitator guide) aren't part of this program: they open the dashboard.
// (🧭 Orientation stays, with this program's slides: js/ft-orientation.js.)
const FT_OFF_VIEWS = {clientprofile:"renderClientProfile", practice:"renderPracticeHub", tool:"renderTool", handouts:"renderHandouts",
  crisisroleplay:"renderCrisisRoleplayHub", openroleplay:"renderOpenRoleplay", tasks:"renderTasksPage", facilitatorguide:"renderFacilitatorGuide"};
Object.keys(FT_OFF_VIEWS).forEach(v=>{ window[FT_OFF_VIEWS[v]] = function(){ state.view = "dashboard"; return renderDashboard(); }; });
const __ftGotoOff = window.goto;
window.goto = function(view){ if(FT_OFF_VIEWS[view]) arguments[0] = "dashboard"; return __ftGotoOff.apply(this, arguments); };
const __ftTopbar = window.renderTopbar;
window.renderTopbar = function(){
  return __ftTopbar.apply(this, arguments)
    .replace(/<button class="[^"]*" onclick="goto\('(clientprofile|practice|crisisroleplay|handouts|tasks|facilitatorguide)'\)">[\s\S]*?<\/button>/g, "")
    .replace('placeholder="Search days, topics, tools…"', 'placeholder="Search lessons…"');
};

/* ---------- 6. Drive files open in the pop-out viewer ---------- */
(function(){
  if(document.getElementById("lecture-viewer-pane")) return;
  const pane = document.createElement("div");
  pane.id = "lecture-viewer-pane";
  pane.innerHTML = `<div id="lecture-viewer-header"><span id="lecture-viewer-title">Recorded Lecture</span><div id="lecture-viewer-actions">
      <a id="lecture-viewer-open-link" href="#" target="_blank" rel="noopener noreferrer" title="Open the original link in a new tab">↗</a>
      <button id="lecture-viewer-fullscreen" type="button" title="Full Screen">⛶</button>
      <button id="lecture-viewer-close" type="button" title="Close">✕</button></div></div>
    <div id="lecture-viewer-body"><div id="lecture-viewer-frame-holder"></div></div>`;
  document.body.appendChild(pane);
})();
const LV = {kind:"video"};
function lvSrc(raw){ const s = String(raw||""); if(!/<iframe[\s>]/i.test(s)) return s; const m = s.match(/\bsrc=["']([^"']+)["']/i); return m ? m[1] : s; }
function lvEmbedUrl(raw){
  const url = lvSrc(raw).trim(); if(!url) return null;
  if(/youtube(-nocookie)?\.com\/embed\//i.test(url) || /drive\.google\.com\/.*\/preview/i.test(url) || /drive\.google\.com\/embeddedfolderview/i.test(url)) return url;
  let m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i); if(m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i); if(m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/i); if(m) return `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid`;
  m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/); if(m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i); if(m) return `https://www.youtube.com/embed/${m[1]}`;
  return null;
}
function lvFit(){
  const body = document.getElementById("lecture-viewer-body"), f = body && body.querySelector("iframe");
  if(!f) return;
  let w = body.clientWidth, h = body.clientHeight; if(w<=0 || h<=0) return;
  if(LV.kind !== "doc"){ const hh = w/(16/9); if(hh > h){ w = h*(16/9); } else { h = hh; } }
  f.style.width = Math.round(w) + "px"; f.style.height = Math.round(h) + "px";
}
if(window.ResizeObserver) new ResizeObserver(lvFit).observe(document.getElementById("lecture-viewer-body"));
function lvReset(){
  const p = document.getElementById("lecture-viewer-pane"), doc = LV.kind === "doc";
  Object.assign(p.style, {top:"", left:"", transform:"", right:"24px", bottom:"24px", width: doc ? "820px" : "380px", height: doc ? "600px" : "250px", maxWidth:"", maxHeight:""});
}
// A lesson's video presentation (its AI Assisted Discussion video) plays in the pop-out viewer.
// Lessons are finished from their last slide ("✓ Finish lesson").
window.ftOpenVideo = function(id){
  const d = DAYS.find(x=>x.id===id);
  if(d && d.video && !ftVideoUnlocked(id)){ toast("🔒 This video opens when your trainer unlocks it."); return; }
  if(d && d.video) lvOpen({kind:"video", title:`${d.title} — Video Presentation`, url:d.video});
};
function lvOpen(item){
  if(item.kind !== "doc" && !confirm(`Do you want to watch this ${item.kind==="lecture"?"lecture":"video"}?\n\n"${item.title}"`)) return;
  LV.kind = item.kind === "doc" ? "doc" : "video";
  const p = document.getElementById("lecture-viewer-pane"), holder = document.getElementById("lecture-viewer-frame-holder"), link = document.getElementById("lecture-viewer-open-link");
  document.getElementById("lecture-viewer-title").textContent = item.title || "Recorded Lecture";
  const clean = lvSrc(item.url).trim();
  if(clean){ link.href = clean; link.style.display = "inline-block"; } else link.style.display = "none";
  const src = lvEmbedUrl(item.url);
  holder.innerHTML = src
    ? `<iframe src="${esc(src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    : `<div id="lecture-viewer-fallback">This link can't be previewed inline.<br><a href="${esc(clean)}" target="_blank" rel="noopener noreferrer">Open in a new tab &rarr;</a></div>`;
  p.classList.remove("maximized");
  const fs = document.getElementById("lecture-viewer-fullscreen"); fs.textContent = "⛶"; fs.title = "Full Screen";
  lvReset(); p.classList.add("open"); lvFit();
}
function lvClose(){ const p = document.getElementById("lecture-viewer-pane"); p.classList.remove("open", "maximized"); document.getElementById("lecture-viewer-frame-holder").innerHTML = ""; }
function lvToggleMax(){
  const p = document.getElementById("lecture-viewer-pane"), b = document.getElementById("lecture-viewer-fullscreen");
  if(!p.classList.contains("maximized")){
    p.classList.add("maximized");
    Object.assign(p.style, {top:"0", left:"0", right:"0", bottom:"0", width:"auto", height:"auto", maxWidth:"none", maxHeight:"none", transform:"none"});
    b.textContent = "⤢"; b.title = "Exit Full Screen";
  } else { p.classList.remove("maximized"); lvReset(); b.textContent = "⛶"; b.title = "Full Screen"; }
  lvFit();
}
document.getElementById("lecture-viewer-fullscreen").addEventListener("click", lvToggleMax);
document.getElementById("lecture-viewer-close").addEventListener("click", lvClose);
(function(){
  const p = document.getElementById("lecture-viewer-pane"), h = document.getElementById("lecture-viewer-header");
  const skip = ["lecture-viewer-close", "lecture-viewer-fullscreen", "lecture-viewer-open-link"];
  let drag = false, ox = 0, oy = 0;
  const can = t=>skip.indexOf(t.id) === -1 && !p.classList.contains("maximized");
  const start = (x, y)=>{ const r = p.getBoundingClientRect(); Object.assign(p.style, {transform:"none", right:"", bottom:"", left:r.left+"px", top:r.top+"px"}); ox = x-r.left; oy = y-r.top; drag = true; document.body.classList.add("lv-dragging"); };
  const move = (x, y)=>{ if(!drag) return; p.style.left = Math.max(-p.offsetWidth+120, Math.min(x-ox, innerWidth-60)) + "px"; p.style.top = Math.max(0, Math.min(y-oy, innerHeight-40)) + "px"; };
  const end = ()=>{ drag = false; document.body.classList.remove("lv-dragging"); };
  h.addEventListener("mousedown", e=>{ if(!can(e.target)) return; start(e.clientX, e.clientY); e.preventDefault(); });
  document.addEventListener("mousemove", e=>move(e.clientX, e.clientY));
  document.addEventListener("mouseup", end);
  h.addEventListener("touchstart", e=>{ if(!can(e.target)) return; start(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  document.addEventListener("touchmove", e=>{ if(drag) move(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  document.addEventListener("touchend", end);
})();
// Links and cards inside section slides (the slides are re-rendered, so listen on the document)
document.addEventListener("click", function(e){
  const a = e.target.closest && e.target.closest("a.viewer-link");
  if(a && !(e.ctrlKey || e.metaKey || e.shiftKey)){
    e.preventDefault();
    lvOpen({kind: a.getAttribute("data-kind"), title: a.getAttribute("data-title"), url: a.getAttribute("href")});
    return;
  }
  const card = e.target.closest && e.target.closest(".res-card[data-url]");
  if(card){ lvOpen({kind: card.getAttribute("data-kind"), title: card.getAttribute("data-title"), url: card.getAttribute("data-url")}); return; }
  const fsb = e.target.closest && e.target.closest("[data-fullscreen]");
  if(fsb){ const el = document.getElementById(fsb.getAttribute("data-fullscreen")); const req = el && (el.requestFullscreen || el.webkitRequestFullscreen); if(req) req.call(el); }
});
document.addEventListener("keydown", function(e){
  const card = e.target.closest && e.target.closest(".res-card[data-url]");
  if(card && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); card.click(); }
});

if(typeof render === "function") render();
