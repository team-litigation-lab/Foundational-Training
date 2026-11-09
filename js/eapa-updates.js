/* ============================================================
   LSH EA/PA portal — update pack "z" (2026-09-26)
   Loaded by index.html right after the main script. Everything here
   replaces or extends functions in the main script, so the big
   index.html only needs one extra <script> line.
     1. Lesson slides: one standard size, content centred, and slides that
        don't fit continue on balanced extra pages (Next/Prev step pages first).
     2. Admin ↔ Trainee view switch (top bar) without signing out.
     4. Presenter view: share only the slides in Meet, see trainer cues yourself.
     5. All lesson content centred; Orientation deck + Blueprint refreshed.
    11. Trainee feedback: open any page in a new tab (right-click, Ctrl/⌘-click,
        middle-click).
    12. Batch Folders: an Archive shelf, restore, search, and records downloads for later use.
   ============================================================ */
window.EAPA_UPDATE_PACK = "z";
(function(){ const s = document.createElement("style"); s.id = "eapa-update-p"; s.textContent = `
.nav .nav-viewswitch{background:rgba(240,192,138,.16) !important;color:#F0C08A !important;border:1px solid rgba(240,192,138,.45) !important;font-weight:700;}
.nav .nav-viewswitch:hover{background:rgba(240,192,138,.28) !important;}
.view-mode-strip{background:#F0C08A;color:#1F2440;font-size:13px;text-align:center;padding:7px 14px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
.view-mode-strip button{font:inherit;font-weight:700;background:#1F2440;color:#fff;border:none;border-radius:999px;padding:4px 12px;cursor:pointer;}
/* Top bar on laptops and desktops: nothing overlaps. The page header — the mark and the page's name —
   is what the bar is for, so it keeps its width and the nav wraps its last buttons onto a second line
   instead. On a narrower screen the name hides altogether (below), leaving the mark. */
@media(min-width:1181px){
  .topbar .brand{flex:0 1 370px;min-width:40px;container-type:inline-size}
  .topbar-right{min-width:auto}
  .topbar .nav{flex:0 1 auto;min-width:0;flex-wrap:wrap;column-gap:0;row-gap:4px}
  .topbar .nav>*+*{margin-left:2px}  /* margins, not column-gap: Chrome leaves the gap out of a wrapping row's width */
}
@container (max-width:170px){.topbar .brand-text{display:none !important}}
/* ================= Standard-size, centred slides =================
   Every slide is the same size. Content sits in a centred column; anything
   that doesn't fit continues on a balanced next page (see paginateLessonSlide). */
.lesson-stage #lessonSlideWrap{height:clamp(440px,66vh,720px);min-height:0;max-height:none;display:flex;flex-direction:column;justify-content:safe center;align-items:center;overflow-y:auto;}
.lesson-stage #lessonSlideWrap > *{width:100%;max-width:1080px;flex-shrink:0;}
.lesson-stage #lessonSlideWrap .topic-separator, .lesson-stage #lessonSlideWrap .lesson-card h4, .lesson-stage #lessonSlideWrap .meet-client-card h3, .lesson-stage #lessonSlideWrap .mc-tag, .lesson-stage #lessonSlideWrap .qc-tag{text-align:center;}
.lesson-stage #lessonSlideWrap .fp-section:first-of-type p, .lesson-stage #lessonSlideWrap .fp-section:first-of-type > div > p{margin-left:auto;margin-right:auto;}
.lesson-stage:fullscreen .stage-body > #lessonSlideWrap.lesson-slide{display:flex;flex-direction:column;justify-content:safe center;align-items:center;height:100%;}
.lesson-stage:fullscreen #lessonSlideWrap > *{max-width:1400px;}
.pg-hide{display:none !important;}
.lesson-stage #lessonSlideWrap.pg-roomy .fp-body > p, .lesson-stage #lessonSlideWrap.pg-roomy .fp-body > ul > li, .lesson-stage #lessonSlideWrap.pg-roomy .fp-section:first-of-type p{font-size:clamp(19px,1.7vw,24px) !important;line-height:1.55;}
.lesson-stage #lessonSlideWrap > .card::before{display:none;}
.lesson-stage #lessonSlideWrap ol.fp-howto-list, .lesson-stage #lessonSlideWrap .fp-section ol{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));}
.lesson-stage #lessonSlideWrap .svg-diagram-card svg{display:block;width:auto;max-width:100%;max-height:calc(clamp(440px,66vh,720px) - 200px);margin:0 auto;}
.lesson-stage:fullscreen #lessonSlideWrap .svg-diagram-card svg{max-height:calc(100vh - 320px);}
.lesson-stage #lessonSlideWrap.pg-anim > *{animation:pgFade .35s ease both;}
@keyframes pgFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
.lesson-stage #lessonSlideWrap .pg-badge{position:absolute;right:16px;bottom:12px;width:auto;max-width:none;font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:.08em;color:var(--orange-deep);background:#FFF1E2;border-radius:999px;padding:4px 10px;}
.lesson-stage #lessonSlideWrap.pg-later .lesson-card h4::after{content:" · continued";font-family:'IBM Plex Mono',monospace;font-size:.4em;font-weight:700;letter-spacing:.08em;color:var(--ink-soft);vertical-align:middle;}
@media(max-width:760px){.lesson-stage #lessonSlideWrap{height:auto;display:block;overflow:visible;} .lesson-stage #lessonSlideWrap .pg-badge{display:none;}}
/* Dashboard progress stats: one small band UNDER the day cards, so the day cards get the full width
   (the numbers, then the Feedback and Ranking cards, in one row on a laptop or desktop). */
@media(min-width:761px){
  .dash-layout{grid-template-columns:minmax(0,1fr) !important;gap:12px;}
  .dash-side{padding:6px 10px;}
  .dash-side-inner{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) repeat(2,minmax(0,1.7fr));gap:8px;align-items:stretch;position:static;}
  .dash-side-inner > *{margin:0 !important;}
  .dash-side-inner > .card.stat{grid-column:auto;padding:5px 10px;display:flex;flex-direction:column;justify-content:center;}
  .dash-side .stat .num{font-size:15px;line-height:1.1;}
  .dash-side .stat .lbl{font-size:8.5px;letter-spacing:.05em;line-height:1.25;margin-top:2px;}
  .dash-side .stat .lbl span{font-size:8.5px;text-transform:none;letter-spacing:0;margin-top:2px !important;}
  .dash-side .tfb-dash, .dash-side .rank-card, .dash-side .cert-dash, .dash-side .comp-card{padding:5px 10px;}
  .dash-side .tfb-dash .sub, .dash-side .rank-card .sub, .dash-side .comp-card .sub, .dash-side .cert-dash .sub{font-size:10px;line-height:1.3;margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dash-side .tfb-dash .btn, .dash-side .cert-dash .btn{padding:2px 9px;font-size:10.5px;}
  .dash-side .rank-list{margin:3px 0 0;}
  .dash-side .rank-list li{padding:1px 6px;font-size:10.5px;}
  .dash-side .rank-card .num{font-size:13px;}
  .dash-side .rank-card .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0 0;}
  .dash-side .tfb-dash .sub{margin:1px 0 3px !important;}
  .dash-side .tfb-dash-stars{margin-bottom:2px !important;}
  .dash-side .tfb-dash-stars button{font-size:14px;}
  .dash-side .tfb-dash h4, .dash-side .rank-card h4, .dash-side .comp-card h4, .dash-side .cert-dash h4, .dash-side .card h3{font-size:9.5px;margin:0;}
  .dash-main > .dash-side{margin-top:10px;}
}
/* The dashboard fills the screen: the two rows of day cards grow into the height that's left, so there's no
   empty space under the page (laptops and desktops). */
@media(min-width:1001px){
  main.main-dash{display:flex;flex-direction:column;padding-bottom:14px !important;}
  main.main-dash > .dash-layout{flex:1 1 auto;display:flex !important;flex-direction:column;}
  main.main-dash .dash-main{flex:1 1 auto;display:flex;flex-direction:column;}
  main.main-dash .module-grid{flex:1 1 0;grid-auto-rows:1fr;align-items:stretch;}
  .dash-main .module-card.mc-clean .module-head{padding:10px 10px;min-height:58px;justify-content:center;}
  .dash-main .module-card.mc-clean .mh-day{font-size:11px;}
  .dash-main .module-card.mc-clean .mh-title{font-size:14px;line-height:1.25;}
  .dash-main .module-card.mc-clean .module-body{flex:1 1 0;min-height:0;overflow:hidden;container-type:size;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:8px 16px 6px;}
  .dash-main .module-card.mc-clean .module-icon{font-size:30px;line-height:1;margin:0;}
  .dash-main .module-card.mc-clean .module-start-btn{margin:0 14px 8px;width:calc(100% - 28px);padding:10px;font-size:15px;}
  .dash-main .module-card.mc-clean .module-finish-btn{margin:0 14px 8px;width:calc(100% - 28px);padding:6px;font-size:12.5px;}
  .dash-main .module-card.mc-clean > :last-child{margin-bottom:10px;}
  body:has(main.main-dash) .footer-note{padding:6px 24px 8px;}
}
/* the middle of a day card shows as much as fits: icon and theme, then the icon alone (smaller), then nothing */
@container (max-height:96px){ .module-card.mc-clean .module-theme{display:none;} }
@container (max-height:40px){ .module-card.mc-clean .module-icon{font-size:20px;} }
@container (max-height:26px){ .module-card.mc-clean .module-icon{display:none;} }
.module-theme{font-size:12.5px;color:var(--ink-soft);line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
@media(min-width:761px) and (max-width:1100px){
  .dash-side-inner{grid-template-columns:repeat(4,minmax(0,1fr));}
  .dash-side-inner > .tfb-dash, .dash-side-inner > .rank-card, .dash-side-inner > .cert-dash, .dash-side-inner > .comp-card{grid-column:span 2;}
}
/* Lesson view: the slide uses the width of the screen, with small margins on the sides */
@media(min-width:761px){
  main:has(.lesson-stage){max-width:1880px;padding-left:24px;padding-right:24px;}
  .lesson-stage{padding:14px 16px;}
  .lesson-stage #lessonSlideWrap{padding-left:24px;padding-right:24px;}
  .lesson-stage #lessonSlideWrap > *, .lesson-stage:fullscreen #lessonSlideWrap > *{max-width:1600px;}
}
/* Lesson page: the slide and its Previous / Next bar fit on one screen. On a desktop the lesson's controls
   (back links, title, Listen, Objectives, Present full screen, Presenter view) sit in a column to the right of
   the slide, and fitSlideFrame() sizes the slide to the height that's left. (Foundational's deck-page lessons,
   body.ft-fit, have their own layout in js/ft-slides.js.) */
@media(min-width:1000px){
  body:not(.ft-fit) main:has(> #lessonStage){display:grid;grid-template-columns:minmax(0,1fr) 200px;column-gap:16px;align-items:start;padding-top:12px;}
  body:not(.ft-fit) main:has(> #lessonStage) > *{grid-column:2;margin:0 0 10px;}
  body:not(.ft-fit) main:has(> #lessonStage) > #lessonStage{grid-column:1;grid-row:1 / span 40;margin:0;}
  body:not(.ft-fit) main:has(> #lessonStage) > #navBackSlot:empty{display:none;}
  body:not(.ft-fit) main:has(> #lessonStage) .day-head-compact{display:flex;flex-direction:column;gap:4px;border:0;padding:0;}
  body:not(.ft-fit) main:has(> #lessonStage) .day-head-compact .dhc-title{white-space:normal;font-size:17px;line-height:1.3;}
  body:not(.ft-fit) main:has(> #lessonStage) .ls-top{display:flex;flex-direction:column;align-items:stretch;gap:8px;}
  body:not(.ft-fit) main:has(> #lessonStage) .ls-top > *, body:not(.ft-fit) main:has(> #lessonStage) .ls-top .btn{width:100%;margin:0 !important;justify-content:center;}
  body:not(.ft-fit) main:has(> #lessonStage) .ls-top .audio-bar{display:grid;grid-template-columns:1fr auto;gap:6px;}
  body:not(.ft-fit) main:has(> #lessonStage) .ls-top .audio-bar #audioModeBtn{grid-column:1 / -1;}
  body:not(.ft-fit) main:has(> #lessonStage) .ls-top .or-tip{font-size:12px;line-height:1.4;order:9;white-space:normal;}
}
/* ---- Presenter view (trainer console) ---- */
.pv{background:linear-gradient(135deg,#1F2440 0%,#2B3158 60%,#353C68 100%);border-radius:20px;padding:16px 18px 18px;color:#fff;}
.pv-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;}
.pv-title{font-size:14px;} .pv-title b{color:#F0C08A;}
.pv-meta{display:flex;gap:10px;align-items:center;margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#C9CDE3;}
.pv-meta .pv-timer{background:rgba(255,255,255,.1);border-radius:8px;padding:4px 9px;color:#fff;font-weight:700;}
.pv-aud{border-radius:999px;padding:4px 10px;font-weight:700;} .pv-aud.on{background:rgba(88,190,130,.2);color:#8FE0AE;} .pv-aud.off{background:rgba(240,120,90,.2);color:#FFB39E;}
.pv-actions{display:flex;gap:8px;} .pv-actions .btn-ghost{background:#fff;}
.pv-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,1fr);gap:16px;align-items:start;}
.pv-label{font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#F0C08A;margin:0 0 8px;}
.pv-mirror{position:relative;width:100%;aspect-ratio:16/9;background:#141833;border-radius:12px;overflow:hidden;box-shadow:0 0 0 2px rgba(240,192,138,.45);}
.pv-frame{position:absolute;top:0;left:0;width:1280px;height:720px;border:0;transform-origin:0 0;pointer-events:none;background:#1F2440;}
.pv-nav{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;} .pv-nav .btn-ghost{background:#fff;}
.pv-nav select{font:inherit;font-size:13px;border-radius:8px;border:none;padding:7px 8px;max-width:52%;color:var(--navy);}
.pv-next{margin-top:10px;font-size:13px;color:#C9CDE3;} .pv-next b{color:#fff;}
.pv-cues{background:#FFFDF8;color:var(--ink);border-radius:14px;padding:16px 18px;max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:80px;}
.pv-cues .pv-label{color:var(--orange-deep);}
.pv-cues h3{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:19px;margin:0 0 10px;line-height:1.25;}
.pv-cues p, .pv-cues li{font-size:14.5px;line-height:1.55;}
.pv-cues .tc-tag, .pv-cues .cue-sub{display:block;margin:12px 0 4px;font-size:12px;font-weight:800;color:var(--navy);}
.pv-cues .pv-empty{color:var(--ink-soft);font-size:14px;}
.pv-ans{background:#EAF6EF;border-left:4px solid #3F7D58;border-radius:8px;padding:8px 12px;margin:6px 0 10px;}
.pv-tip{margin:12px 0 0;font-size:12.5px;color:#C9CDE3;} .pv-tip b{color:#fff;}
@media(max-width:1000px){.pv-grid{grid-template-columns:1fr;} .pv-cues{position:static;max-height:none;}}
/* ---- Audience window (shared in Google Meet) ---- */
body.audience-mode{overflow:hidden;background:#1F2440;}
body.audience-mode > *:not(#audienceRoot):not(.aud-hint){display:none !important;}
#audienceRoot{position:fixed;inset:0;}
#audienceRoot .lesson-stage{height:100vh;border-radius:0;display:flex;flex-direction:column;padding:2.5vh 2.5vw;box-sizing:border-box;}
#audienceRoot .stage-body{flex:1;min-height:0;align-items:stretch;grid-template-rows:minmax(0,1fr);}
#audienceRoot .stage-presenter{align-self:end;}
#audienceRoot #lessonSlideWrap{height:100% !important;font-size:1.08em;}
#audienceRoot .slide-nav .btn, #audienceRoot .slide-done-banner{visibility:hidden;}
#audienceRoot .slide-dot{pointer-events:none;}
/* The shared window cuts straight to the next slide or page: no slide-in or fade (in a Meet share
   the empty first frames of an entrance animation read as a flicker). */
#audienceRoot .lesson-slide, #audienceRoot #lessonSlideWrap > *, #audienceRoot .slide-interstitial{animation:none !important;}
.aud-wait{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;font-size:18px;text-align:center;padding:20px;}
.aud-wait b{font-family:'Fraunces',Georgia,serif;font-size:30px;color:#F0C08A;}
.aud-deck-note{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;background:#161829;border-radius:8px;color:#fff;font-size:30px;line-height:1.4;text-align:center;}
.aud-deck-note b{font-family:'Fraunces',Georgia,serif;font-size:44px;color:#F0C08A;}
.aud-hint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:999px;padding:8px 16px;font-size:13px;z-index:5;transition:opacity .6s;}
.aud-hint.gone{opacity:0;pointer-events:none;}

`; document.head.appendChild(s); })();

/* ---------- 1. standard-size slides ---------- */
function goToSlide(i){   // any slide can be opened — nothing is locked
  state.slideDir = i>(state.lessonSlide||0) ? "next" : "prev";
  state.lessonSlide = i; state.slidePage = 0;
  if(i > (state.maxSlideReached||0)){ state.maxSlideReached = i; state.slideProgress = state.slideProgress || {}; state.slideProgress[state.dayId] = i; storeSet("slide-progress", state.slideProgress); }
  refreshLessonSlide();
}
function nextSlide(){
  if((state.slidePages||1) > 1 && (state.slidePage||0) < state.slidePages-1){ showSlidePage((state.slidePage||0)+1); return; }
  const d = DAYS.find(x=>x.id===state.dayId);
  const slides = buildDaySlides(d);
  const nextIdx = (state.lessonSlide||0)+1;
  if(nextIdx <= slides.length-1){
    state.slideDir = "next";
    state.maxSlideReached = Math.max(state.maxSlideReached||0, nextIdx);
    state.slideProgress = state.slideProgress || {};
    state.slideProgress[state.dayId] = state.maxSlideReached;
    storeSet("slide-progress", state.slideProgress);
    state.lessonSlide = nextIdx; state.slidePage = 0;
    refreshLessonSlide();
  }
}
function prevSlide(){
  if((state.slidePages||1) > 1 && (state.slidePage||0) > 0){ showSlidePage(state.slidePage-1); return; }
  if((state.lessonSlide||0) > 0){
    state.slideDir = "prev";
    state.lessonSlide = (state.lessonSlide||0)-1;
    state.slidePage = -1;   // land on the last page of the previous slide
    refreshLessonSlide();
  }
}
function narratorAfterRender(pageOnly){
  if(state.view!=="day"){ if(Narrator.playing) Narrator.stop(true); __lastNarrKey = ""; return; }
  if(!pageOnly){ decorateCallouts(); paginateLessonSlide(); }
  const key = state.dayId+":"+(state.lessonSlide||0)+":"+(state.slidePage||0)+":"+state.dayViewMode;
  if(key!==__lastNarrKey){ __lastNarrKey = key; Narrator.afterSlideChange(); } else Narrator.paint();
}
function renderTopbar(){
  let views = [["dashboard","📚 Dashboard"],["tasks","🎲 Tasks"],["clientprofile","Client Profile"],["practice","Practice Lab"],["crisisroleplay","🔥 Live Roleplay"],["notes","My Notes"],["handouts","Handouts"]];
  if(state.isAdmin){
    // Admin is a trainer monitoring dashboard, not a trainee workspace — hide
    // the trainee-facing-only views that have no role here.
    views = views.filter(([id]) => !["crisisroleplay","notes","handouts","tasks"].includes(id));
    views.push(["orientation","🧭 Orientation"]);
    views.push(["facilitatorguide","Facilitator Guide"]);
  }
  return `
  ${state.adminPreview ? `<div class="view-mode-strip">👁 <b>Trainee view</b> — you're seeing the portal as a trainee sees it (every day unlocked for preview). <button type="button" onclick="setAdminViewMode('admin')">Switch back to Admin view</button></div>` : ""}
  <div class="topbar ${state.mobileNavOpen?'nav-open':''}">
    <div class="topbar-inner">
      <div class="brand" onclick="goto('dashboard')">
        ${brandMark()}
        <div class="brand-text"><b>STANDARD FOUNDATIONAL TRAINING</b></div>
      </div>
      <button type="button" class="mobile-menu-btn" aria-label="Menu" aria-expanded="${state.mobileNavOpen?'true':'false'}" onclick="toggleMobileNav()">${state.mobileNavOpen?'✕':'☰'}<span>Menu</span></button>
      <div class="topbar-right">
        <div class="nav">
          ${views.map(([id,label])=>`<button class="${state.view===id?'active':''}" onclick="goto('${id}')">${label}${id==="tasks" && openTasksCount() ? `<span class="nav-badge">${openTasksCount()}</span>` : ""}</button>`).join("")}
          ${(state.traineeId && !state.isAdmin) ? `<button type="button" class="nav-focus" onclick="openFocusPanel()" title="My Focus — trainer feedback and what to work on next">🎯 Focus${focusNewCount()?`<span class="nav-badge">${focusNewCount()}</span>`:""}</button>` : ""}
          ${state.traineeId ? "" : state.adminPreview
            ? `<button type="button" class="nav-viewswitch" onclick="setAdminViewMode('admin')" title="Switch back to the admin (trainer) view">👁 Switch View</button>`
            : ((state.portalOnly && !state.isAdmin) ? "" : `<button class="${state.view==='admin'?'active':''}" onclick="openAdmin()">🛡 Admin</button>`)}
          ${state.isAdmin && !state.traineeId ? `<button type="button" class="nav-viewswitch" onclick="setAdminViewMode('trainee')" title="Switch to the trainee view — the program exactly as a trainee sees it, with no trainer tools or admin pages">👁 Switch View</button>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}
function authHeaders(){
  const t = ((state.isAdmin || state.adminPreview) && state.adminToken) || state.authToken;
  return Object.assign({"Content-Type":"application/json"}, t ? {"Authorization":"Bearer "+t} : {});
}
async function authFetch(url, payload){
  const doFetch = ()=>fetch(url, {method:"POST", headers:authHeaders(), body: JSON.stringify(payload)});
  let res = await doFetch();
  if(res.status===401 && !state.isAdmin && await reauthTrainee()) res = await doFetch();
  if(res.status===401 && (state.isAdmin || state.adminPreview)){ setAdminToken(""); state.isAdmin = false; state.adminPreview = false; try{ sessionStorage.removeItem("lsh_admin_preview"); }catch(e){} toast("Your admin session expired — click 🛡 Admin and sign in again."); }
  return res;
}
Narrator.slideText = function(){
    const card = document.querySelector("#lessonSlideWrap"); if(!card) return "";
    const clone = card.cloneNode(true);
    clone.querySelectorAll(".pg-hide, .pg-badge, svg, .svg-diagram-card, .vis-flow, .vis-chips, .vis-label, .topic-separator, .fp-num, .lnum, .vis-badge, .vis-card-i, .qc-actions, .quiz-rationale:not(.show), button, .lx-panel:not([open])").forEach(n=>n.remove());
    return clone.innerText.replace(/\s*\n+\s*/g, ". ").replace(/(\.\s*){2,}/g, ". ").replace(/[→➜]/g, ", then ").replace(/\s+/g," ").trim();
  };
/* ---------- Standard-size slides: content that doesn't fit continues on the next page ----------
   The slide box has a fixed size. After each render we measure the content blocks
   and, if they overflow, split them into the fewest pages possible and then
   rebalance so every page carries a similar amount (no crammed page + near-empty
   page). Next / Previous (and the arrow keys) step through pages before slides.
   Headings (kicker, title, section labels) repeat on every page of their block. */
const SLIDE_PG_BLOCKS = ".card, .lesson-card, .meet-client-card, .qcheck-card, .fp-section, .fp-body, .trainer-checkpoint, .ft-body, .cs, .cs-tablewrap, .cs-tablewrap > table, .cs-tablewrap > table > tbody, .svg-diagram-card";
const SLIDE_PG_HEADS = "h2, h3, h4, .topic-separator, .fp-label, .mc-tag, .tc-tag, .qc-tag, .discussion-tag, .vis-label";
let __slidePg = null;
function collectSlideUnits(root, bigH){
  const units = [];
  const walk = (el)=>{
    for(const c of el.children){
      if(c.matches(SLIDE_PG_HEADS) || c.classList.contains("pg-badge")) continue;
      if(c.matches(SLIDE_PG_BLOCKS)){ walk(c); continue; }
      // a tall wrapper around one thing (e.g. a diagram's frame): look inside it for places to break
      if(c.children.length === 1 && c.getBoundingClientRect().height > bigH && !c.matches("svg, img, picture, figure, table") &&
         [...c.childNodes].every(n=>n.nodeType !== 3 || !n.textContent.trim())){ walk(c); continue; }
      // lists and card grids may break between items — but only when they're tall;
      // short ones (e.g. a row of 3 step cards) always stay together
      if(c.children.length > 1 && c.getBoundingClientRect().height > bigH){
        const cs = getComputedStyle(c);
        if(c.matches("ul, ol") || cs.display.includes("grid") || cs.display === "block" || (cs.display.includes("flex") && (cs.flexWrap==="wrap" || cs.flexDirection==="column"))){ units.push(...c.children); continue; }
      }
      units.push(c);
    }
  };
  walk(root);
  return units.filter(u=>u.getClientRects().length);
}
// Every slide fits on one screen: the frame is sized to the room left on the lesson page (fitSlideFrame),
// what doesn't fit continues on the next page (paginateSlideUnits), and a block too big for one page is
// scaled down a little (fitSlideZoom), so the frame never scrolls.
function paginateLessonSlide(){
  const wrap = document.getElementById("lessonSlideWrap");
  fitSlideFrame(wrap);
  paginateSlideUnits();
  fitSlideZoom(wrap);
  // something above the slide can still change height once the page is drawn (e.g. the top bar gains a
  // button and wraps): fit again if the slide has moved
  if(wrap && wrap.dataset.fitTop) requestAnimationFrame(()=>{
    if(wrap.isConnected && Math.abs(wrap.getBoundingClientRect().top + window.scrollY - Number(wrap.dataset.fitTop)) > 1) paginateLessonSlide();
  });
}
function fitSlideFrame(wrap){
  if(!wrap) return;
  slideZoomParts(wrap).forEach(n=>n.style.zoom = "");
  if(document.body.classList.contains("ft-fit")) return;   // Foundational's deck-page lessons size themselves (fitPages in js/ft-slides.js)
  const stage = wrap.closest(".lesson-stage");
  // full screen and the shared slides window already fill their window; phones scroll
  if(!stage || stage.id !== "lessonStage" || wrap.closest("#audienceRoot") || document.fullscreenElement || window.innerWidth <= 760){ wrap.style.height = ""; delete wrap.dataset.fitTop; return; }
  const r = wrap.getBoundingClientRect(), below = stage.getBoundingClientRect().bottom - r.bottom;
  wrap.dataset.fitTop = String(r.top + window.scrollY);
  // the top bar can gain a button (and wrap to a second row) after the page is drawn: fit again when it does
  const bar = document.querySelector(".topbar");
  if(bar && window.__fitBar !== bar && typeof ResizeObserver === "function"){
    if(window.__fitBarRO) window.__fitBarRO.disconnect();
    let h0 = bar.offsetHeight; window.__fitBar = bar;
    window.__fitBarRO = new ResizeObserver(()=>{ const h = bar.offsetHeight; if(h !== h0){ h0 = h; if(state.view==="day" && document.getElementById("lessonSlideWrap")) paginateLessonSlide(); } });   // before the next paint: no jump
    window.__fitBarRO.observe(bar);
  }
  // Where the slide has to end. On a window the whole page fits on (js/lsh-one-screen.js) that is
  // the bottom of the page's body, so the slide and its Previous / Next bar stay above the footer
  // line and the lesson page never scrolls; on a narrow or short window, which scrolls as it
  // always did, it is the window's.
  const page = stage.closest("main");
  if(page && document.body.classList.contains("one-screen")){
    // All measured from the top of the window, so the height can't depend on how far the page body
    // happens to be scrolled — window.scrollY is the body's scrollTop here, and mixing it in made
    // the slide a different size from one slide to the next.
    const floor = page.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(page).paddingBottom) || 0);
    wrap.style.height = Math.max(320, Math.floor(floor - r.top - below - 12)) + "px";
  } else {
    wrap.style.height = Math.max(320, Math.floor(window.innerHeight - (r.top + window.scrollY) - below - 12)) + "px";
  }
}
function slideZoomParts(wrap){ return [...wrap.children].filter(n=>!n.classList.contains("pg-badge")); }
function fitSlideZoom(wrap){
  if(!wrap || !wrap.isConnected || window.innerWidth <= 760 || wrap.querySelector(".cs-page")) return;   // deck pages size themselves
  // a picture that hasn't loaded yet has no height: lay the slide out again once it has
  wrap.querySelectorAll("img").forEach(img=>{ if(!img.complete && !img.dataset.fitWait){ img.dataset.fitWait = "1"; img.addEventListener("load", repaginateSoon, {once:true}); } });
  const parts = slideZoomParts(wrap); let z = 1;
  parts.forEach(n=>n.style.zoom = "");
  while(wrap.scrollHeight > wrap.clientHeight + 2 && z > 0.6){ z = Math.round((z - 0.05)*100)/100; parts.forEach(n=>n.style.zoom = String(z)); }
}
function paginateSlideUnits(){
  const wrap = document.getElementById("lessonSlideWrap");
  __slidePg = null; state.slidePages = 1;
  if(!wrap) return;
  const key = state.dayId+":"+(state.lessonSlide||0);
  if(state.slidePageKey !== key){ state.slidePageKey = key; if(state.slidePage !== -1) state.slidePage = 0; }
  wrap.querySelectorAll(".pg-hide").forEach(n=>n.classList.remove("pg-hide"));
  wrap.querySelectorAll(".pg-badge").forEach(n=>n.remove());
  wrap.querySelectorAll("ol[data-pg-start]").forEach(ol=>{ ol.removeAttribute("start"); ol.style.counterReset = ""; ol.removeAttribute("data-pg-start"); });
  wrap.classList.remove("pg-later", "pg-roomy");
  if(window.innerWidth <= 760){ state.slidePage = 0; updateSlidePageUi(); return; }   // phones: the page scrolls instead
  const cs = getComputedStyle(wrap);
  const padT = parseFloat(cs.paddingTop)||0, padB = parseFloat(cs.paddingBottom)||0;
  const avail = wrap.clientHeight - padT - padB;
  const units = collectSlideUnits(wrap, avail*0.4);
  const base = wrap.getBoundingClientRect().top - wrap.scrollTop;
  const box = units.map(u=>{ const r = u.getBoundingClientRect(); return {top:r.top-base, bottom:r.bottom-base}; });
  if(units.length < 2 || wrap.scrollHeight <= wrap.clientHeight + 2){ state.slidePage = 0; updateSlidePageUi(); return; }
  const headH = Math.max(0, box[0].top - padT);   // kicker + title, repeated on every page
  const room = Math.max(160, avail - headH - 56);   // 56px: section labels repeated on continued pages
  // never break between cards sitting on the same row of a grid
  const canBreak = box.map((b,i)=>i>0 && Math.abs(b.top - box[i-1].top) > 2);
  const pack = (limit)=>{
    const out = []; let s = 0, maxB = box[0].bottom, brk = -1;
    for(let i=1;i<box.length;i++){
      if(canBreak[i]) brk = i;
      maxB = Math.max(maxB, box[i].bottom);
      if(maxB - box[s].top > limit && brk > s){
        out.push([s,brk-1]); s = brk; brk = -1;
        maxB = 0; for(let k=s;k<=i;k++) maxB = Math.max(maxB, box[k].bottom);
      }
    }
    out.push([s,box.length-1]); return out;
  };
  let pages = pack(room);
  if(pages.length > 1){   // balance: the smallest page height that still needs no extra pages
    let lo = 0, hi = room;
    for(let k=0;k<16;k++){ const mid = (lo+hi)/2; if(pack(mid).length <= pages.length) hi = mid; else lo = mid; }
    pages = pack(hi);
  }
  if(pages.length < 2){ state.slidePage = 0; updateSlidePageUi(); return; }
  const heights = pages.map(([a,b])=>Math.max(...box.slice(a,b+1).map(x=>x.bottom)) - box[a].top);
  __slidePg = {wrap, units, pages, heights, room};
  state.slidePages = pages.length;
  if(state.slidePage === -1 || (state.slidePage||0) >= pages.length) state.slidePage = pages.length-1;
  applySlidePage();
}
function applySlidePage(){
  const pg = __slidePg; if(!pg) return;
  const p = state.slidePage||0, [a,b] = pg.pages[p];
  pg.units.forEach((u,i)=>u.classList.toggle("pg-hide", i<a || i>b));
  // hide blocks (and their headings) with nothing left to show on this page
  pg.wrap.querySelectorAll(SLIDE_PG_BLOCKS).forEach(bl=>{
    const mine = pg.units.filter(u=>bl.contains(u));
    if(mine.length) bl.classList.toggle("pg-hide", mine.every(u=>u.classList.contains("pg-hide")));
  });
  // numbered lists split across pages keep counting (4, 5, 6… not 1, 2, 3)
  pg.wrap.querySelectorAll("ol").forEach(ol=>{
    const items = [...ol.children]; const first = items.findIndex(li=>!li.classList.contains("pg-hide"));
    if(first > 0){ ol.setAttribute("start", String(first+1)); ol.style.counterReset = "st "+first; ol.setAttribute("data-pg-start","1"); }
    else if(ol.hasAttribute("data-pg-start")){ ol.removeAttribute("start"); ol.style.counterReset = ""; ol.removeAttribute("data-pg-start"); }
  });
  pg.wrap.classList.toggle("pg-later", p > 0);
  pg.wrap.classList.toggle("pg-roomy", pg.heights[p] < pg.room*0.4);   // a light page gets larger type so it doesn't look empty
  pg.wrap.querySelectorAll(".pg-badge").forEach(n=>n.remove());
  pg.wrap.insertAdjacentHTML("beforeend", `<div class="pg-badge">PAGE ${p+1} / ${pg.pages.length}${p < pg.pages.length-1 ? " · CONTINUES →" : ""}</div>`);
  pg.wrap.scrollTop = 0;
  fitSlideZoom(pg.wrap);
  updateSlidePageUi();
}
function updateSlidePageUi(){
  const stage = document.getElementById("lessonStage") || document;
  const counter = stage.querySelector(".slide-nav .slide-counter");
  if(counter){
    const base = counter.dataset.base || counter.textContent; counter.dataset.base = base;
    counter.textContent = (state.slidePages||1) > 1 ? `${base} · Page ${(state.slidePage||0)+1} of ${state.slidePages}` : base;
  }
  const next = stage.querySelector(".slide-nav .btn-primary");
  if(next){
    const label = next.dataset.base || next.innerHTML; next.dataset.base = label;
    const baseOnclick = next.dataset.baseOnclick || next.getAttribute("onclick") || ""; next.dataset.baseOnclick = baseOnclick;
    const morePages = (state.slidePages||1) > 1 && (state.slidePage||0) < state.slidePages-1;
    next.innerHTML = morePages ? "Next page &rarr;" : label;
    // On the slide's last page the button does whatever it was rendered to do (Next slide, or on the
    // lesson's last slide, ✓ Finish lesson); on an earlier page it only turns the page, so a paginated
    // last slide doesn't skip its remaining pages straight to Finish lesson / Process Questions.
    next.setAttribute("onclick", morePages ? `showSlidePage(${(state.slidePage||0)+1})` : baseOnclick);
  }
  const prev = stage.querySelector(".slide-nav .btn-ghost");
  if(prev && (state.lessonSlide||0) === 0) prev.disabled = !((state.slidePage||0) > 0);
}
function showSlidePage(p){
  state.slidePage = Math.max(0, Math.min(p, (state.slidePages||1)-1));
  applySlidePage();
  const w = document.getElementById("lessonSlideWrap");
  if(w){ w.classList.remove("pg-anim"); void w.offsetWidth; w.classList.add("pg-anim"); }
  narratorAfterRender(true);
}
window.showSlidePage = showSlidePage;
let __pgResizeT = null;
function repaginateSoon(){ clearTimeout(__pgResizeT); __pgResizeT = setTimeout(()=>{ if(state.view==="day" && document.getElementById("lessonSlideWrap")) paginateLessonSlide(); }, 180); }
window.addEventListener("resize", repaginateSoon);
document.addEventListener("fullscreenchange", repaginateSoon);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(repaginateSoon);

/* ---------- 2. admin ↔ trainee view ---------- */
/* Admin ↔ Trainee view: an admin can flip the whole portal into the trainee
   experience (trainee nav, no trainer tools/admin pages) and back, without
   signing out. Their admin session stays active underneath. */
function setAdminViewMode(mode){
  if(mode==="trainee"){
    if(!state.isAdmin) return;
    state.isAdmin = false; state.adminPreview = true;
    try{ sessionStorage.setItem("lsh_admin_preview","1"); }catch(e){}
    const back = ["admin","orientation","facilitatorguide"].includes(state.view) ? "dashboard" : state.view;
    if(state.view==="day") render(); else goto(back);
    toast("👁 Trainee view — this is what trainees see. 👁 Switch View takes you back.");
  }else{
    if(!state.adminPreview) return;
    state.adminPreview = false; state.isAdmin = true;
    try{ sessionStorage.removeItem("lsh_admin_preview"); }catch(e){}
    if(state.view==="day"){ state.maxSlideReached = 9999; render(); } else goto(state.view==="dashboard" ? "admin" : state.view);
    toast("🛡 Back in Admin view.");
  }
}
window.setAdminViewMode = setAdminViewMode;
const __eapaGoto = window.goto;
window.goto = function(view, id){ __eapaGoto(view, id); if(view==="day" && state.adminPreview && state.maxSlideReached !== 9999){ state.maxSlideReached = 9999; render(); } };
const __eapaOpenAdmin = window.openAdmin;
window.openAdmin = function(){ if(state.adminPreview){ setAdminViewMode("admin"); return; } return __eapaOpenAdmin(); };
const __eapaAdminLogout = window.adminLogout;
window.adminLogout = function(){ state.adminPreview = false; try{ sessionStorage.removeItem("lsh_admin_preview"); }catch(e){} return __eapaAdminLogout(); };
const __eapaLogout = window.logout;
window.logout = function(){ state.adminPreview = false; return __eapaLogout.apply(this, arguments); };
const __eapaForceLogout = window.forceRevokedLogout;
window.forceRevokedLogout = function(){ state.adminPreview = false; return __eapaForceLogout.apply(this, arguments); };


/* ---------- 4. Presenter view (like Canva's) ----------
   The trainer clicks "🖥 Presenter view" on a lesson. A second window opens
   showing ONLY the slides — that's the window you share in Google Meet. This
   tab turns into the presenter console: a live mirror of what the room sees
   (a small copy of the slides window, rendered at its exact size), the trainer
   cues / discussion script for the current slide, what's next, a timer and the
   controls. The windows talk over a BroadcastChannel.
     ?audience=1       the slides window you share
     ?audience=mirror  the small live copy inside the presenter console */
const PV_CHANNEL = "lsh-present-v1";
const PV_MODE = new URLSearchParams(location.search).get("audience") || "";
const PV_IS_AUDIENCE = PV_MODE === "1" || PV_MODE === "mirror";
const PV = {ch:null, win:null, size:null, startedAt:0, tick:null};
function pvChannel(){ if(!PV.ch && "BroadcastChannel" in window) PV.ch = new BroadcastChannel(PV_CHANNEL); return PV.ch; }

/* ----- presenter side ----- */
function pvOpenSlidesWindow(){
  PV.win = window.open(`/?audience=1&day=${state.dayId}`, "lshAudience", "popup=yes,width=1280,height=760");
  return !!PV.win;
}
function presenterStart(){
  if(!state.isAdmin){ toast("Presenter view is for trainers — sign in to Admin first."); return; }
  if(!pvChannel()){ toast("This browser can't run Presenter view — use Chrome or Edge."); return; }
  const d = DAYS.find(x=>x.id===state.dayId); if(!d) return;
  if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
  if(!pvOpenSlidesWindow()){ toast("Your browser blocked the slides window — allow pop-ups for this site, then click Presenter view again."); return; }
  state.presenting = true; state.dayViewMode = "slides"; state.maxSlideReached = 9999;
  state.presentPage = 0; state.presentPages = 1; PV.startedAt = Date.now();
  if(typeof Narrator!=="undefined" && Narrator.playing) Narrator.stop(true);
  clearInterval(PV.tick); PV.tick = setInterval(presenterTick, 1000);
  render(); presenterSend();
}
function presenterSend(){ const ch = pvChannel(); if(ch) ch.postMessage({type:"show", dayId:state.dayId, slide:state.lessonSlide||0, page:state.presentPage||0}); }
function presenterStep(dir){
  const d = DAYS.find(x=>x.id===state.dayId); if(!d) return;
  const total = buildDaySlides(d).length, slide = state.lessonSlide||0, page = state.presentPage||0, pages = state.presentPages||1;
  if(dir > 0){
    if(page < pages-1){ state.presentPage = page+1; }
    else if(slide < total-1){ state.lessonSlide = slide+1; state.presentPage = 0; state.presentPages = 1; }
    else return;
  }else{
    if(page > 0){ state.presentPage = page-1; }
    else if(slide > 0){ state.lessonSlide = slide-1; state.presentPage = -1; state.presentPages = 1; }
    else return;
  }
  presenterSend(); presenterRefresh();
}
function presenterJump(i){ state.lessonSlide = +i; state.presentPage = 0; state.presentPages = 1; presenterSend(); presenterRefresh(); }
function presenterReopen(){
  if(!pvOpenSlidesWindow()) toast("Your browser blocked the slides window — allow pop-ups for this site.");
  setTimeout(presenterSend, 600);
}
function presenterEnd(silent){
  state.presenting = false; clearInterval(PV.tick);
  const ch = pvChannel(); if(ch) ch.postMessage({type:"end"});
  try{ if(PV.win && !PV.win.closed) PV.win.close(); }catch(e){}
  PV.win = null;
  if(!silent){ render(); toast("Presentation ended."); }
}
function presenterTick(){
  const t = document.getElementById("pvTimer"); if(t){ const s = Math.floor((Date.now()-PV.startedAt)/1000); t.textContent = `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
  const a = document.getElementById("pvAud"); if(a){ const live = !!(PV.win && !PV.win.closed); a.className = "pv-aud " + (live?"on":"off"); a.textContent = live ? "● Slides window open" : "● Slides window closed"; }
}
function presenterCountText(d){
  const total = buildDaySlides(d).length, pages = state.presentPages||1;
  return `Step ${(state.lessonSlide||0)+1} of ${total}` + (pages > 1 ? ` · Page ${Math.max(0,state.presentPage||0)+1} of ${pages}` : "");
}
// The cues for this program's slides (ftDivider, ftSection) come from js/ft-updates.js, which passes
// anything else on to here; buildDaySlides makes no other kind, so only a missing slide arrives (and,
// as before, reading its type throws).
function presenterCues(d, slide){
  void slide.type;
  return `<p class="pv-empty">No trainer cue for this slide.</p>`;
}
function presenterNextText(d){
  const slides = buildDaySlides(d), idx = state.lessonSlide||0;
  if((state.presentPages||1) > 1 && (state.presentPage||0) < state.presentPages-1) return `${esc(daySlideTitle(d, slides[idx]))} — page ${(state.presentPage||0)+2}`;
  return slides[idx+1] ? esc(daySlideTitle(d, slides[idx+1])) : "End of today's slides — Knowledge Check";
}
function renderPresenterConsole(d){
  const slides = buildDaySlides(d);
  const idx = Math.min(state.lessonSlide||0, slides.length-1); state.lessonSlide = idx;
  return `
    <div class="pv">
      <div class="pv-head">
        <div class="pv-title"><b>🖥 Presenter view</b> · ${ftName(d.id)} — ${esc(d.title)}</div>
        <div class="pv-meta"><span id="pvCount">${presenterCountText(d)}</span><span class="pv-timer" id="pvTimer">00:00</span><span class="pv-aud on" id="pvAud">● Slides window open</span></div>
        <div class="pv-actions"><button class="btn btn-ghost btn-sm" onclick="presenterReopen()">↗ Re-open slides window</button><button class="btn btn-primary btn-sm" onclick="presenterEnd()">■ End</button></div>
      </div>
      <div class="pv-grid">
        <section>
          <div class="pv-label">Now showing to the room</div>
          <div class="pv-mirror" id="pvMirror"><iframe class="pv-frame" id="pvFrame" src="/?audience=mirror&day=${d.id}" tabindex="-1" inert title="Live copy of the slides window"></iframe></div>
          <div class="pv-nav">
            <button class="btn btn-ghost" onclick="presenterStep(-1)">← Previous</button>
            <button class="btn btn-ghost btn-sm" onclick="presenterJump(0)" title="Go back to the first slide">⏮ Slide 1</button>
            <select id="pvJump" onchange="presenterJump(this.value)" title="Jump to a slide">${slides.map((s,i)=>`<option value="${i}" ${i===idx?"selected":""}>${i+1}. ${esc(daySlideTitle(d,s))}</option>`).join("")}</select>
            <button class="btn btn-primary" onclick="presenterStep(1)">Next →</button>
          </div>
          <div class="pv-next"><b>Up next:</b> <span id="pvNext">${presenterNextText(d)}</span></div>
          <p class="pv-tip">In Google Meet: <b>Present now → A window</b> → pick <b>“LSH Slides — share this window”</b>. Keep this tab for yourself; use ← → keys here to move the slides.</p>
        </section>
        <aside class="pv-cues"><div class="pv-label">Your notes — only you can see these</div><div id="pvCues">${presenterCues(d, slides[idx])}</div></aside>
      </div>
    </div>`;
}
/* update the console in place (re-rendering would reload the live copy) */
function presenterRefresh(){
  const d = DAYS.find(x=>x.id===state.dayId); if(!d || !state.presenting) return;
  const slides = buildDaySlides(d), idx = state.lessonSlide||0;
  const c = document.getElementById("pvCount"); if(c) c.textContent = presenterCountText(d);
  const n = document.getElementById("pvNext"); if(n) n.innerHTML = presenterNextText(d);
  const j = document.getElementById("pvJump"); if(j) j.value = String(idx);
  const cueKey = idx + "|" + (state.presentSecsFor===idx ? (state.presentSecs||[]).join(",") + "|" + (state.presentPage||0) + "/" + (state.presentPages||1) : "");
  const cu = document.getElementById("pvCues"); if(cu && cu.dataset.slide !== cueKey){ cu.dataset.slide = cueKey; cu.innerHTML = presenterCues(d, slides[idx]); cu.parentElement.scrollTop = 0; }
}
function presenterFitMirror(){
  const box = document.getElementById("pvMirror"), f = document.getElementById("pvFrame"); if(!box || !f) return;
  const w = (PV.size && PV.size.w) || 1280, h = (PV.size && PV.size.h) || 720;
  box.style.aspectRatio = `${w} / ${h}`;
  f.style.width = w+"px"; f.style.height = h+"px";
  f.style.transform = `scale(${box.clientWidth / w})`;
}
Object.assign(window, {presenterStart, presenterStep, presenterJump, presenterReopen, presenterEnd});

/* hook the existing slide controls so arrows / buttons drive the presentation */
const __pvNextSlide = window.nextSlide, __pvPrevSlide = window.prevSlide, __pvGoToSlide = window.goToSlide;
window.nextSlide = function(){ if(state.presenting) return presenterStep(1); return __pvNextSlide(); };
window.prevSlide = function(){ if(state.presenting) return presenterStep(-1); return __pvPrevSlide(); };
window.goToSlide = function(i){ if(state.presenting) return presenterJump(i); return __pvGoToSlide(i); };
const __pvRenderDaySlideshow = window.renderDaySlideshow;
window.renderDaySlideshow = function(d){ if(state.presenting && !state.stageInnerOnly && !PV_IS_AUDIENCE) return renderPresenterConsole(d); return __pvRenderDaySlideshow(d); };
const __pvNarrAfter = window.narratorAfterRender;
window.narratorAfterRender = function(pageOnly){ if(state.presenting && state.view==="day"){ presenterFitMirror(); presenterRefresh(); return; } return __pvNarrAfter(pageOnly); };
const __pvPaginate = window.paginateLessonSlide;
window.paginateLessonSlide = function(){ if(state.presenting && !PV_IS_AUDIENCE) return; return __pvPaginate(); };
const __pvGoto2 = window.goto;
window.goto = function(view, id){ if(state.presenting && (view!=="day" || id!==state.dayId)) presenterEnd(true); return __pvGoto2(view, id); };
const __pvAfterRender2 = window.afterRender;
window.afterRender = function(){
  const r = __pvAfterRender2.apply(this, arguments);
  // the "Presenter view" button sits next to "Present full screen" (trainers only)
  const top = document.querySelector(".ls-top");
  if(top && state.isAdmin && !state.presenting && !top.querySelector(".pv-open")){
    top.insertAdjacentHTML("beforeend", `<button class="btn btn-primary btn-sm pv-open" onclick="presenterStart()" title="Share only the slides in Google Meet while you see the trainer cues here">🖥 Presenter view</button>`);
  }
  return r;
};
window.addEventListener("resize", ()=>{ if(state.presenting) presenterFitMirror(); });
if(pvChannel() && !PV_IS_AUDIENCE){
  PV.ch.addEventListener("message", (e)=>{
    const m = e.data || {}; if(!state.presenting) return;
    if(m.type==="hello") presenterSend();
    if(m.type==="key") presenterStep(m.dir);
    if(m.type==="rendered" && m.dayId===state.dayId && m.slide===(state.lessonSlide||0)){
      state.presentSecs = m.secs || null; state.presentAllSecs = m.allSecs || null; state.presentSecsFor = m.slide;
      state.presentPage = m.page; state.presentPages = m.pages; state.presentSecsByPage = m.secsByPage || null;
      if(!PV.size || PV.size.w!==m.w || PV.size.h!==m.h){ PV.size = {w:m.w, h:m.h}; presenterFitMirror(); }
      presenterRefresh();
    }
  });
  window.addEventListener("beforeunload", ()=>{ if(state.presenting && PV.ch) PV.ch.postMessage({type:"end"}); });
}

/* ----- the slides window (and its live copy) ----- */
if(PV_IS_AUDIENCE){
  const isMain = PV_MODE === "1";
  if(isMain) document.title = "LSH Slides — share this window";
  document.body.classList.add("audience-mode");
  window.render = function(){};                          // the normal portal never draws here
  window.autoPublishBlueprint = async function(){};       // leave background jobs to the trainer's own tab
  window.updateIsSafe = function(){ return false; };      // never reload itself for an update mid-class (the console offers Update now)
  const app = document.getElementById("app"); if(app) app.innerHTML = "";
  const root = document.createElement("div"); root.id = "audienceRoot";
  root.innerHTML = `<div class="aud-wait"><b>LSH Foundational Training</b>Waiting for the presenter…</div>`;
  document.body.appendChild(root);
  // arrow keys pressed in the slides window (or while the live copy holds focus) drive the presentation
  document.addEventListener("keydown", (e)=>{
    const dir = ["ArrowRight","PageDown"," "].includes(e.key) ? 1 : (["ArrowLeft","PageUp"].includes(e.key) ? -1 : 0);
    if(!dir) return;
    // On a Canva deck the keys turn the deck's pages: they go to the deck (the console's Next → moves on).
    const deck = isMain && root.querySelector(".canva-frame iframe");
    if(deck){ e.preventDefault(); deck.focus(); return; }
    if(pvChannel()){ e.preventDefault(); PV.ch.postMessage({type:"key", dir}); }
  });
  if(isMain){
    const hint = document.createElement("div"); hint.className = "aud-hint"; hint.textContent = "Share this window in Google Meet · double-click for full screen";
    document.body.appendChild(hint); setTimeout(()=>hint.classList.add("gone"), 7000);
    document.addEventListener("dblclick", ()=>{ if(document.fullscreenElement) document.exitFullscreen(); else if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(()=>{}); });
  }
  let last = null;
  // tell the console what is on screen: the page, and which numbered sections (① Core Principles …
  // ④ Go Deeper) are on this page and on every page, so the presenter's script follows the page
  const report = (d, slide)=>{
    if(!isMain) return;
    const secNum = (s)=>+((s.querySelector(".fp-num")||{}).textContent||0);
    const allSecs = [...root.querySelectorAll(".fp-section")].map(secNum).filter(Boolean);
    const secs = [...root.querySelectorAll(".fp-section")].filter(s=>!s.closest(".pg-hide")).map(secNum).filter(Boolean);
    const secsByPage = __slidePg ? __slidePg.pages.map(([a,b])=>[...new Set(__slidePg.units.slice(a,b+1).map(u=>{ const s = u.closest(".fp-section"); return s ? secNum(s) : 0; }).filter(Boolean))]) : [allSecs];
    pvChannel().postMessage({type:"rendered", dayId:d.id, slide, page:state.slidePage||0, pages:state.slidePages||1, w:root.clientWidth, h:root.clientHeight, secs, allSecs, secsByPage});
  };
  // `force`: the window changed size, so lay the slide out again
  const show = (m, force)=>{
    const d = DAYS.find(x=>x.id===m.dayId); if(!d) return;
    const same = !!(last && last.dayId===m.dayId && last.slide===m.slide && root.querySelector("#lessonStage"));
    last = m;
    // A Canva deck is a live embed: drawing the step again would reload it at page 1 and drop Canva's own
    // full screen. Keep it when the same step comes again (a resize, full screen, the presenter reconnecting).
    if(same && root.querySelector(".canva-frame")){ if(isMain) pvChannel().postMessage({type:"rendered", dayId:d.id, slide:m.slide, page:0, pages:1, w:root.clientWidth, h:root.clientHeight}); return; }
    // The slide on screen is never drawn again for the same step (the console re-drawing, its live
    // copy reconnecting): in the shared window a redraw is a visible flash. A page change within
    // the slide happens in place.
    if(same && !force){
      if(__slidePg){
        const n = __slidePg.pages.length, want = m.page === -1 ? n-1 : Math.max(0, Math.min(m.page||0, n-1));
        if(want !== (state.slidePage||0)){ state.slidePage = want; applySlidePage(); }
      }
      return report(d, m.slide);
    }
    // view is "audience", not "day", so the portal's own arrow-key handler stays out of it
    state.view = "audience"; state.dayId = d.id; state.lessonSlide = m.slide; state.maxSlideReached = 9999;
    state.slidePage = m.page; state.slidePageKey = d.id+":"+m.slide; state.slideDir = "next";
    state.stageInnerOnly = true;
    root.innerHTML = `<div class="lesson-stage" id="lessonStage">${renderDaySlideshow(d)}</div>`;
    state.stageInnerOnly = false;
    decorateCallouts(root);
    paginateLessonSlide();
    // The live copy in the console doesn't load a second deck: it can't follow the room's page.
    if(!isMain) root.querySelectorAll(".canva-frame").forEach(f=>{ f.innerHTML = `<div class="aud-deck-note"><b>🎞 Canva deck</b>It's live in your slides window. Turn its pages there: click the deck, or press ← →.</div>`; });
    report(d, m.slide);
  };
  if(pvChannel()){
    PV.ch.addEventListener("message", (e)=>{
      const m = e.data || {};
      if(m.type==="show") show(m);
      if(m.type==="end") root.innerHTML = `<div class="aud-wait"><b>Thanks for joining</b>The presentation has ended.</div>`;
    });
    PV.ch.postMessage({type:"hello"});
  }
  let rt = null;
  const reshow = ()=>{ clearTimeout(rt); rt = setTimeout(()=>{ if(last) show(last, true); }, 200); };
  window.addEventListener("resize", reshow);
  document.addEventListener("fullscreenchange", reshow);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(reshow);
}

/* ---------- 5. Lessons fully centred · Orientation + Blueprint refresh ---------- */
(function(){ const s = document.createElement("style"); s.id = "eapa-update-centre"; s.textContent = `
.lesson-stage #lessonSlideWrap .lesson-card, .lesson-stage #lessonSlideWrap .meet-client-card, .lesson-stage #lessonSlideWrap > .card, .lesson-stage #lessonSlideWrap .qcheck-card, .lesson-stage #lessonSlideWrap .video-placeholder, .lesson-stage #lessonSlideWrap .discussion-card{text-align:center;}
.lesson-stage #lessonSlideWrap .fp-label{justify-content:center;}
.lesson-stage #lessonSlideWrap .fp-label::before{content:"";flex:1;height:1px;background:#EADFD2;}
.lesson-stage #lessonSlideWrap p{margin-left:auto;margin-right:auto;}
.lesson-stage #lessonSlideWrap .fp-body > p, .lesson-stage #lessonSlideWrap .fp-body > div > p{max-width:80ch;}
.lesson-stage #lessonSlideWrap .lesson-card li, .lesson-stage #lessonSlideWrap .meet-client-card li{padding-left:0;text-align:center;}
.lesson-stage #lessonSlideWrap .lesson-card ul > li::before, .lesson-stage #lessonSlideWrap .meet-client-card ul > li::before{position:static;display:inline-block;width:9px;height:9px;margin:0 10px 2px 0;vertical-align:middle;}
.lesson-stage #lessonSlideWrap .meet-client-card ul{list-style:none;padding:0;}
.lesson-stage #lessonSlideWrap ol.fp-howto-list > li, .lesson-stage #lessonSlideWrap .fp-section ol > li{text-align:center;padding-top:20px;}
.lesson-stage #lessonSlideWrap ol.fp-howto-list > li::before, .lesson-stage #lessonSlideWrap .fp-section ol > li::before{left:50%;transform:translateX(-50%);}
.lesson-stage #lessonSlideWrap .vis-card{text-align:center;} .lesson-stage #lessonSlideWrap .vis-card-top{justify-content:center;gap:10px;}
.lesson-stage #lessonSlideWrap .callout, .lesson-stage #lessonSlideWrap [class*="callout"]{text-align:center;}
.lesson-stage #lessonSlideWrap table{margin-left:auto;margin-right:auto;text-align:left;}
.lesson-stage #lessonSlideWrap .quiz-opt{text-align:center;justify-content:center;align-items:center;}
.lesson-stage #lessonSlideWrap .qcheck-card .qc-tag{justify-content:center;}
.lesson-stage #lessonSlideWrap .lx-panel, .lesson-stage #lessonSlideWrap details{text-align:center;}
.build-tag .eapa-ok{color:#3F7D58;font-weight:700;}
`; document.head.appendChild(s); })();

/* Orientation deck (and the Blueprint PDF, which is built from it and republishes
   itself when the build changes): explain split pages and live sessions. */
const __eapaOrientSlides = window.orientSlides;
window.orientSlides = function(){
  const slides = __eapaOrientSlides();
  const i = slides.findIndex(x=>x.k==="A day");
  if(i >= 0){
    slides[i] = Object.assign({}, slides[i], {body: slides[i].body.replace("One topic at a time. Next / Previous at the bottom; your place is saved.", "One topic at a time, every slide the same size. Longer topics continue on a second page — watch for the PAGE 1 / 2 badge. Your place is saved.")});
    const pill = (ic,t,d)=>`<div class="or-pill"><div>${ic}</div><b>${t}</b><span>${d}</span></div>`;
    slides.splice(i+1, 0, {k:"Live sessions", h:"Live sessions with your trainer", body:`
     <div class="or-3">${pill("🖥","Follow the shared slides","Your trainer presents the day's slides in Google Meet. They're the same slides you have in the portal — nothing extra to install.")}${pill("💬","Talk it through","At each checkpoint your trainer pauses for discussion. Answer out loud — a first answer is never wrong, it's where the learning starts.")}${pill("📄","Pages & pace","Longer topics have a second page (PAGE 1 / 2). On your own, use Next or the ← → keys, 🔊 Listen, or ⛶ Full screen.")}</div>
     <div class="or-note"><b>Missed something live?</b> Every slide stays in your portal — reopen the day any time and pick up exactly where you left off.</div>`});
  }
  return slides;
};

/* footer: shows at a glance that this update pack is running */
const __eapaAfterRender3 = window.afterRender;
window.afterRender = function(){
  const r = __eapaAfterRender3.apply(this, arguments);
  const tag = document.querySelector(".build-tag");
  if(tag && !tag.querySelector(".eapa-ok")) tag.insertAdjacentHTML("beforeend", ` · <span class="eapa-ok">updates ✓</span>`);
  return r;
};

/* The Day 4 Practice Lab's name and summary. The lab itself isn't part of this program, but the
   engine still names a day's lab in places (relatedTools, the trainee detail, the AI review). */
(function(){
  const t = PRACTICE_TOOLS.find(x=>x.id==="coldcalling4");
  if(t){ t.title = "Prioritization, Cold-Calling & Email Outreach"; t.desc = "Sort a real Monday's tasks with the time-management tools and push back on an impossible deadline, then make five simulated calls to prospective clients (a busy referral, a wary web lead, a not-ready prospect, a voicemail and a gatekeeper) and log each one, source and build a lead list for a new practice and write the plan, handle a live intake call and run an email outreach sequence."; }
})();

/* Printing a page leaves out the top bar, the admin tabs, the page banner and the footer */
(function(){ const s = document.createElement("style"); s.id = "eapa-print"; s.textContent = `
@media print{.topbar, .admin-tabs, .page-hero, .footer-note{display:none !important;}}
`; document.head.appendChild(s); })();

/* ---------- 11. Trainee feedback (2026-09-28) ----------
   a) Open any page in a new tab. Menu items, day cards and activity cards are buttons,
      so the browser offers no "Open link in new tab". Right-click on anything that opens
      a portal page shows that option; Ctrl/⌘-click and middle-click open it directly. */
(function(){ const s = document.createElement("style"); s.id = "eapa-update-11"; s.textContent = `
.nt-menu{position:fixed;z-index:9999;background:#fff;border:1px solid #dadce0;border-radius:10px;box-shadow:0 10px 30px -8px rgba(31,36,64,.35);padding:6px;min-width:200px;font-size:13.5px;}
.nt-menu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;font:inherit;background:none;border:none;border-radius:7px;padding:8px 10px;color:#1F2440;cursor:pointer;}
.nt-menu button:hover{background:#F2F4FA;}
.nt-menu small{display:block;color:#6B7089;font-size:11.5px;padding:4px 10px 2px;}
`; document.head.appendChild(s); })();

// The portal page a click would open ("#/day/3", "#/tool/dossier1", "#/notes" …), or "".
function ntRouteOf(el){
  const node = el && el.closest && el.closest("[onclick]"); if(!node) return "";
  const js = node.getAttribute("onclick") || "";
  let m = js.match(/\bgoto\(\s*['"]([a-z]+)['"]\s*(?:,\s*['"]?([^'")\s]+)['"]?\s*)?\)/i), h = "";
  if(m) h = "#/" + m[1] + (m[2] ? "/" + encodeURIComponent(m[2]) : "");
  else if((m = js.match(/\b(?:returnToLessonCard|goToNextDay)\(\s*(\d+)\s*\)/))) h = "#/day/" + m[1];
  else if((m = js.match(/\bopenRouteInNewTab\(/))) return "";
  if(!h) return "";
  const r = h.match(/^#\/([a-z]+)(?:\/(.+))?$/i), view = r[1], id = r[2] ? decodeURIComponent(r[2]) : null;
  if(view==="day") return DAYS.some(d=>String(d.id)===String(id)) ? h : "";
  if(view==="tool") return PRACTICE_TOOLS.some(t=>t.id===id) ? h : "";
  return (typeof routeViews==="function" && routeViews().includes(view)) ? h : "";
}
function ntSignedIn(){ return !!(state.traineeId || state.isAdmin) && !["login","pendingApproval","registrationDenied"].includes(state.view); }
function ntClose(){ const m = document.getElementById("ntMenu"); if(m) m.remove(); }
document.addEventListener("click", (e)=>{
  if(!(e.ctrlKey || e.metaKey || e.shiftKey) || !ntSignedIn()) return;
  const h = ntRouteOf(e.target); if(!h) return;
  e.preventDefault(); e.stopImmediatePropagation(); openRouteInNewTab(h);
}, true);
document.addEventListener("mousedown", (e)=>{ if(e.button===1 && ntSignedIn() && ntRouteOf(e.target)) e.preventDefault(); }, true); // no autoscroll
document.addEventListener("auxclick", (e)=>{
  if(e.button!==1 || !ntSignedIn()) return;
  const h = ntRouteOf(e.target); if(!h) return;
  e.preventDefault(); openRouteInNewTab(h);
}, true);
document.addEventListener("contextmenu", (e)=>{
  ntClose();
  if(!ntSignedIn() || e.target.closest("input, textarea, [contenteditable]")) return;
  const node = e.target.closest("[onclick]"), h = ntRouteOf(e.target); if(!h) return;
  e.preventDefault();
  const label = (typeof routeLabel==="function" && routeLabel(h)) || "this page";
  const m = document.createElement("div"); m.className = "nt-menu"; m.id = "ntMenu";
  m.innerHTML = `<small>${esc(label)}</small>
    <button type="button" data-nt="tab">⧉ Open in new tab</button>
    <button type="button" data-nt="here">↪ Open here</button>`;
  document.body.appendChild(m);
  const w = m.offsetWidth, hgt = m.offsetHeight;
  m.style.left = Math.min(e.clientX, innerWidth - w - 8) + "px"; m.style.top = Math.min(e.clientY, innerHeight - hgt - 8) + "px";
  m.addEventListener("click", (ev)=>{ const b = ev.target.closest("[data-nt]"); if(!b) return; ntClose();
    if(b.dataset.nt==="tab") openRouteInNewTab(h); else if(node) node.click(); });
}, true);
document.addEventListener("mousedown", (e)=>{ if(!e.target.closest("#ntMenu")) ntClose(); });
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") ntClose(); });
window.addEventListener("scroll", ntClose, true);
window.addEventListener("blur", ntClose);

/* ---------- 12. Batch Folders: Archive shelf + re-access records (2026-09-28) ----------
   Archiving a batch moves its folder to the 📦 Archive shelf instead of leaving an empty
   "0 trainees" folder. Every record is kept: open an archived folder to see its registry,
   rankings, feedback and activity as they were, download the records (CSV for a sheet,
   JSON for a full backup), or restore the batch. A search box finds a batch or a trainee
   in active and archived batches alike. */
(function(){ const s = document.createElement("style"); s.id = "eapa-update-12"; s.textContent = `
.bf-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 16px;}
.bf-search{flex:1 1 260px;max-width:420px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 14px;}
.bf-search input{border:none;outline:none;font:inherit;font-size:13.5px;width:100%;background:transparent;color:var(--ink);}
.bf-count{font-size:12.5px;color:var(--ink-soft);}
.batch-folder{position:relative;}
.batch-folder .bf-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}
.batch-folder .bf-actions button{font:inherit;font-size:11.5px;font-weight:700;padding:5px 10px;border-radius:999px;border:1px solid var(--line);background:#F6F7FB;color:var(--navy);cursor:pointer;}
.batch-folder .bf-actions button:hover{border-color:var(--orange,#DB8437);}
.batch-folder .bf-actions .bf-arch{color:#8A5A1E;}
.batch-folder .bf-hit{font-size:11.5px;color:#0b57d0;font-weight:600;}
.bf-shelf{margin-top:30px;padding:18px;border-radius:16px;background:#EEF0F6;border:1px dashed #C9CEDD;}
.bf-shelf h2{margin:0 0 4px;font-size:16px;color:var(--navy);}
.bf-shelf > p{margin:0 0 14px;font-size:12.5px;color:var(--ink-soft);}
.batch-folder.is-archived{background:#FAFAFC;}
.batch-folder.is-archived .bf-icon{filter:grayscale(1);opacity:.75;}
.batch-folder.is-archived .bf-name::after{content:"Archived";margin-left:8px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#5B6178;background:#E4E6EE;padding:2px 7px;border-radius:999px;vertical-align:middle;}
.bf-archived-banner{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#EEF0F6;border:1px solid #C9CEDD;border-radius:12px;padding:12px 16px;margin:10px 0 4px;font-size:13px;color:var(--ink);}
.bf-archived-banner b{color:var(--navy);}
.bf-archived-banner .grow{flex:1 1 260px;}
`; document.head.appendChild(s); })();

// a batch's records: archived ones stay (the 📦 Archive shelf); a revoked, rejected or offboarded trainee drops off (js/ft-roster.js)
function bfLive(r){ return r && (r.archived || !window.ftActiveTrainee || ftActiveTrainee(r, {pending:true})); }
function bfAll(k){ return (state.adminData||[]).filter(r=>bfLive(r) && batchKey(r)===k); }
function bfIsArchived(k){ const all = bfAll(k); return all.length>0 && all.every(r=>r.archived); }
function bfArchivedAt(k){ return bfAll(k).map(r=>r.archivedAt).filter(Boolean).sort().pop() || null; }
// An archived batch shows all of its records; an active one hides archived trainees unless asked.
function batchMembers(k){ const all = bfAll(k), arch = all.length>0 && all.every(r=>r.archived); return all.filter(r=>arch || state.batchShowArchived || !r.archived); }
function bfKeys(){
  return Array.from(new Set((state.adminData||[]).filter(bfLive).map(batchKey))).sort((a,b)=> a===NO_BATCH ? 1 : b===NO_BATCH ? -1 : a.localeCompare(b, undefined, {numeric:true}));
}
function bfMatches(k){
  const q = String(state.bfSearch||"").trim().toLowerCase(); if(!q) return {ok:true, names:[]};
  const names = bfAll(k).map(r=>cleanName(r.name)||"").filter(n=>n.toLowerCase().includes(q));
  return {ok: folderLabel(k).toLowerCase().includes(q) || names.length>0, names};
}
function bfCard(k){
  const all = bfAll(k), arch = bfIsArchived(k), m = bfMatches(k);
  const shown = arch ? all : all.filter(r=>!r.archived);
  const done = shown.length ? Math.round(shown.reduce((a,r)=>a+adminDayStats(r).done,0)/shown.length/DAYS.length*100) : 0;
  const fb = batchFeedback(k).length, fbTxt = state.tfbAdmin && !state.tfbAdmin.loading ? `${fb} feedback` : "feedback…";
  const extraArch = !arch && all.length>shown.length ? ` · ${all.length-shown.length} archived` : "";
  const at = arch ? bfArchivedAt(k) : null;
  const kq = esc(k);
  return `<div class="batch-folder ${arch?"is-archived":""}" role="button" tabindex="0" onclick="openBatchFolder('${kq}','registry')" onkeydown="if(event.key==='Enter'){openBatchFolder('${kq}','registry')}">
    <span class="bf-icon">${arch?"🗄":"📁"}</span>
    <span class="bf-name">${esc(folderLabel(k))}</span>
    <span class="bf-meta">${shown.length} trainee${shown.length===1?"":"s"}${extraArch}</span>
    <span class="bf-meta">${done}% avg completion · ${fbTxt}</span>
    ${arch ? `<span class="bf-meta">${at ? "Archived " + esc(fmtDate(at)) : "Archived"}</span>` : ""}
    ${m.names.length ? `<span class="bf-hit">Found: ${m.names.slice(0,3).map(esc).join(", ")}${m.names.length>3?` +${m.names.length-3}`:""}</span>` : ""}
    <div class="bf-actions">
      ${arch
        ? `<button type="button" onclick="event.stopPropagation();openBatchFolder('${kq}','registry')">📂 Open records</button><button type="button" onclick="event.stopPropagation();confirmUnarchiveBatch('${kq}')">↩ Restore</button>`
        : (k!==NO_BATCH ? `<button type="button" class="bf-arch" onclick="event.stopPropagation();confirmArchiveBatch('${kq}')">📦 Archive</button>` : "")}
      <button type="button" onclick="event.stopPropagation();bfExportCsv('${kq}')" title="Download this batch's records as a spreadsheet (CSV)">⬇ Records</button>
    </div>
  </div>`;
}
function bfGridHtml(){
  const keys = bfKeys(), shown = keys.filter(k=>bfMatches(k).ok);
  const active = shown.filter(k=>!bfIsArchived(k)), archived = shown.filter(k=>bfIsArchived(k));
  const allArch = keys.filter(k=>bfIsArchived(k)).length;
  const q = String(state.bfSearch||"").trim();
  const open = q || state.bfShelfOpen;
  return `
    ${active.length ? `<div class="batch-folder-grid">${active.map(bfCard).join("")}</div>`
      : `<div class="empty-note">${q ? `No active batch matches “${esc(q)}”.` : "No active batches. Archived batches are on the shelf below."}</div>`}
    <div class="bf-shelf">
      <h2>📦 Archive <span class="bf-count">(${allArch} batch${allArch===1?"":"es"})</span></h2>
      <p>Archived batches keep every record: registry, rankings, feedback and activity. Open one to look back, download its records, or restore it.</p>
      ${!allArch ? `<div class="empty-note" style="margin:0;">Nothing archived yet. Use 📦 Archive on a batch when its training is finished.</div>`
        : archived.length ? (open || archived.length<=8
            ? `<div class="batch-folder-grid">${archived.map(bfCard).join("")}</div>`
            : `<button class="btn btn-ghost btn-sm" onclick="state.bfShelfOpen=true;bfRedraw()">Show ${archived.length} archived batches</button>`)
        : `<div class="empty-note" style="margin:0;">No archived batch matches “${esc(q)}”.</div>`}
    </div>`;
}
function bfRedraw(){ const g = document.getElementById("bfGrid"); if(g) g.innerHTML = bfGridHtml(); else render(); }
function bfSearch(v){ state.bfSearch = v; bfRedraw(); }

function renderAdminBatchFolders(){
  if(state.adminLoading || !state.adminData){
    return `<div class="card" style="padding:40px;text-align:center;color:var(--ink-soft);">Loading trainee ledger…</div>`;
  }
  if(!state.tfbAdmin) setTimeout(()=>loadTraineeFeedbackAdmin(), 0);
  const keys = bfKeys();
  if(state.batchFolder && !keys.includes(state.batchFolder)) state.batchFolder = null;
  if(state.batchFolder) return renderBatchFolder(state.batchFolder);
  const head = `
    <p class="eyebrow">Admin Dashboard</p>
    <h1 style="color:var(--navy);font-size:26px;margin:6px 0 4px;">Batch Folders</h1>
    <p style="color:var(--ink-soft);font-size:13px;max-width:72ch;margin:0 0 18px;">Each batch has its own folder: the trainees registered in it, their rankings, the feedback they sent and their latest activity — kept apart from every other batch. Archive a batch when it finishes; its records stay available on the Archive shelf.</p>`;
  if(!keys.length) return head + `<div class="empty-note">No trainees yet — a folder appears for each batch as trainees register.</div>`;
  const nArch = keys.filter(k=>bfIsArchived(k)).length;
  return head + `
    <div class="bf-toolbar">
      <label class="bf-search"><span>🔍</span><input type="search" placeholder="Find a batch or trainee (active and archived)" value="${esc(state.bfSearch||"")}" oninput="bfSearch(this.value)"></label>
      <span class="bf-count">${keys.length-nArch} active · ${nArch} archived</span>
      <button class="btn btn-ghost btn-sm" onclick="refreshAdminData();loadTraineeFeedbackAdmin()">🔄 Refresh</button>
    </div>
    <div id="bfGrid">${bfGridHtml()}</div>`;
}

const __bfRenderFolder12 = window.renderBatchFolder;
window.renderBatchFolder = function(k){
  let html = __bfRenderFolder12(k);
  const kq = esc(k);
  const dl = `<button class="btn btn-ghost btn-sm" onclick="bfExportCsv('${kq}')" title="Spreadsheet of every trainee's progress and scores">⬇ Records (CSV)</button>
        <button class="btn btn-ghost btn-sm" onclick="bfExportJson('${kq}')" title="Complete backup of this batch's records and feedback">⬇ Full backup (JSON)</button>`;
  html = html.replace(/(<button class="btn btn-ghost btn-sm" onclick="refreshAdminData\(\);loadTraineeFeedbackAdmin\(\)">)/, dl + "\n        $1");
  if(bfIsArchived(k)){
    const at = bfArchivedAt(k), n = bfAll(k).length;
    const banner = `<div class="bf-archived-banner"><span style="font-size:22px;">🗄</span>
      <div class="grow"><b>Archived batch</b>${at ? ` · archived ${esc(fmtDate(at))}` : ""}. All ${n} trainee record${n===1?"":"s"} are kept below: registry, rankings, feedback and activity, as they were.</div>
      <button class="btn btn-primary btn-sm" onclick="confirmUnarchiveBatch('${kq}')">↩ Restore batch</button></div>`;
    html = html.replace(/(<div class="bf-tabs">)/, banner + "\n    $1")
               .replace(/<label style="display:flex;align-items:center;gap:5px;font-size:12.5px;color:var\(--ink-soft\);cursor:pointer;"><input type="checkbox"[^>]*> Include archived<\/label>/, "");
  }
  return html;
};

// Archive / restore: same as before, plus the archive date, and the folder moves to (or off) the shelf.
window.confirmArchiveBatch = async function(batch){
  const members = (state.adminData||[]).filter(r=>batchKey(r)===batch && !r.archived);
  if(!members.length){ toast("Nothing to archive in this batch."); return; }
  if(!confirm(`Archive batch "${batchLabel(batch)}" (${members.length} trainee${members.length===1?"":"s"})?\n\nThe folder moves to the 📦 Archive shelf and the trainees leave Rankings and Trainee Audit. Nothing is deleted: open the archived folder any time to see or download the records, or restore the batch.`)) return;
  const at = new Date().toISOString();
  for(const rec of members){ rec.archived = true; rec.archivedAt = at; await sharedSet("trainee:"+rec.id, rec); }
  toast(`Batch "${batchLabel(batch)}" archived — find it on the 📦 Archive shelf.`);
  if(state.batchFolder===batch) state.batchFolder = null;
  await loadAdminLedger();
};
window.confirmUnarchiveBatch = async function(batch){
  const members = (state.adminData||[]).filter(r=>batchKey(r)===batch && r.archived);
  if(!members.length){ toast("Nothing to restore in this batch."); return; }
  if(!confirm(`Restore batch "${batchLabel(batch)}" (${members.length} trainee${members.length===1?"":"s"})? They'll show up again in Batch Folders, Rankings and Trainee Audit.`)) return;
  for(const rec of members){ rec.archived = false; delete rec.archivedAt; await sharedSet("trainee:"+rec.id, rec); }
  toast(`Batch "${batchLabel(batch)}" restored (${members.length} trainee${members.length===1?"":"s"}).`);
  await loadAdminLedger();
};

// Records downloads, for keeping or re-using a batch's results later.
function bfFileName(k, ext){ return `LSH_EAPA_${(k===NO_BATCH?"No_batch":"Batch_"+k).replace(/[^A-Za-z0-9_-]+/g,"_")}_records_${new Date().toISOString().slice(0,10)}.${ext}`; }
function bfExportCsv(k){
  const recs = bfAll(k).slice().sort((a,b)=>(cleanName(a.name)||"").localeCompare(cleanName(b.name)||""));
  if(!recs.length){ toast("No records in this batch."); return; }
  const q = (v)=>`"${String(v??"").replace(/"/g,'""')}"`;
  const head = ["Name","First name","Last name","Batch","Status","Approved","Registered","Last active","Archived on",
    "Days completed","Knowledge Check avg %", ...DAYS.map(d=>`${ftName(d.id)} KC %`), "Practice Lab runs","Practice Lab avg %","Submissions","Feedback sent"];
  const fbBy = {}; batchFeedback(k).forEach(x=>{ const n = (cleanName(x.name)||"").toLowerCase(); fbBy[n] = (fbBy[n]||0)+1; });
  const d8 = (v)=> v ? String(v).slice(0,10) : "";
  const rows = recs.map(r=>{ const ds = adminDayStats(r), ps = adminPracticeStats(r), dp = r.dayProgress||{};
    return [cleanName(r.name)||"", r.firstName||"", r.lastName||"", batchLabel(k), r.archived?"Archived":"Active", r.approved===true?"Yes":r.approved===false?"No":"",
      d8(r.registeredAt), d8(r.lastActive), d8(r.archivedAt), `${ds.done}/${ds.total}`, ds.avg,
      ...DAYS.map(d=>{ const p = dp[d.id]; return p && typeof p.score==="number" ? p.score : ""; }),
      ps.runs, ps.avg, (r.submissions||[]).length, fbBy[(cleanName(r.name)||"").toLowerCase()]||0].map(q).join(","); });
  saveBlob(new Blob(["﻿" + [head.map(q).join(","), ...rows].join("\n")], {type:"text/csv;charset=utf-8"}), bfFileName(k, "csv"));
  toast(`Downloaded ${recs.length} record${recs.length===1?"":"s"} for ${folderLabel(k)}.`);
}
function bfExportJson(k){
  const recs = bfAll(k); if(!recs.length){ toast("No records in this batch."); return; }
  const data = {exportedAt:new Date().toISOString(), program:"LSH EA/PA Upskill Program", batch:batchLabel(k), archived:bfIsArchived(k), archivedAt:bfArchivedAt(k),
    trainees:recs, feedback:batchFeedback(k)};
  saveBlob(new Blob([JSON.stringify(data, null, 2)], {type:"application/json"}), bfFileName(k, "json"));
  toast(`Full backup of ${folderLabel(k)} downloaded.`);
}
Object.assign(window, {bfSearch, bfRedraw, bfExportCsv, bfExportJson});

/* ================= Dashboard day cards: the ☰ Topics pop-up card's styles =================
   (js/ft-updates.js draws the day cards themselves, and js/lsh-dashboard.js gives them the clean look.) */
(function(){
  const st = document.createElement("style"); st.id = "clean-day-cards"; st.textContent = `
.module-card.mc-clean .module-body{flex:1 1 auto;min-height:12px;padding:10px 16px 4px;}
.module-card.mc-clean .module-body:empty{padding:0;}
.module-card.mc-clean .module-topics-btn span{color:var(--ink-soft);font-weight:700;margin-left:2px;}
.topics-modal{overflow-y:auto;}
.topics-modal-head{position:sticky;top:0;z-index:1;flex-shrink:0;}
.topics-modal-foot{position:sticky;bottom:0;flex-shrink:0;}
.topics-modal-sec{padding:14px 22px 2px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--orange-deep);}
.topics-modal-list{flex:none;overflow:visible;padding:4px 22px 6px 42px;}
.topics-modal-sec ~ .topics-modal-list{padding-top:2px;}
.topics-modal-list li{list-style:disc;}
.topics-modal-list li::marker{color:var(--orange);}
.topics-modal-list li:last-child{border-bottom:none;}
`; document.head.appendChild(st);
})();

/* ================= Bullet lists on a slide: every bullet starts on the same line =================
   The list sits centred as a block, and its items are left-aligned with the bullet hanging on the left, so
   the bullets line up one under the other (they used to follow each centred line). */
(function(){
  const L = ".lesson-stage #lessonSlideWrap ul:not([class]), .lesson-stage #lessonSlideWrap .lesson-card ul, .lesson-stage #lessonSlideWrap .meet-client-card ul";
  const LI = ".lesson-stage #lessonSlideWrap .lesson-card ul > li, .lesson-stage #lessonSlideWrap .meet-client-card ul > li";
  const B = ".lesson-stage #lessonSlideWrap .lesson-card ul > li::before, .lesson-stage #lessonSlideWrap .meet-client-card ul > li::before";
  const st = document.createElement("style"); st.id = "slide-bullets"; st.textContent = `
${L}{width:fit-content;max-width:100%;margin-left:auto;margin-right:auto;text-align:left;}
.lesson-stage #lessonSlideWrap ul:not([class]) > li{text-align:left;}
${LI}{text-align:left;padding-left:22px;position:relative;}
${B}{position:absolute;left:1px;top:.6em;margin:0;}
.lesson-stage #lessonSlideWrap .meet-client-card ul{list-style:disc;padding-left:22px;}
.lesson-stage #lessonSlideWrap .meet-client-card ul > li{padding-left:4px;}
.lesson-stage #lessonSlideWrap .meet-client-card ul > li::marker{color:var(--orange);}
`; document.head.appendChild(st);
})();

/* ================= The ☰ Topics pop-up fits on one screen =================
   A long list gets a wider card with its sections side by side in columns; if it still doesn't fit the
   window, the type steps down a little, so nothing in the card scrolls. (fitTopicsModal runs on each
   topics card as it opens, and again on resize.) */
function fitTopicsModal(overlay){
  const modal = overlay && overlay.querySelector(".topics-modal"); if(!modal) return;
  let cols = modal.querySelector(".topics-cols");
  if(!cols){
    const head = modal.querySelector(".topics-modal-head"), foot = modal.querySelector(".topics-modal-foot");
    cols = document.createElement("div"); cols.className = "topics-cols";
    let group = null;
    [...modal.children].filter(n=>n !== head && n !== foot).forEach(n=>{
      if(n.classList.contains("topics-modal-sec")){ group = document.createElement("div"); group.className = "tm-group"; cols.appendChild(group); group.appendChild(n); }
      else if(group && n.classList.contains("topics-modal-list")){ group.appendChild(n); group = null; }
      else { cols.appendChild(n); group = null; }
    });
    if(foot) modal.insertBefore(cols, foot); else modal.appendChild(cols);
  }
  const head = modal.querySelector(".topics-modal-head"), foot = modal.querySelector(".topics-modal-foot");
  let fs = 13.5; cols.style.fontSize = "";
  const fit = ()=>{
    // the room the list has: the window's height, less the card's title and buttons
    const room = Math.min(window.innerHeight*0.92, 900) - (head ? head.offsetHeight : 0) - (foot ? foot.offsetHeight : 0);
    cols.style.height = "";
    if(cols.scrollHeight > room) cols.style.height = Math.floor(room) + "px";   // columns fill this height, then overflow sideways
    return cols.scrollHeight <= cols.clientHeight + 1 && cols.scrollWidth <= cols.clientWidth + 1;
  };
  // one column while the list fits; a wider card with columns when it doesn't; smaller type as a last resort
  modal.classList.remove("tm-wide");
  if(!fit()) modal.classList.add("tm-wide");
  while(!fit() && fs > 9.5){ fs -= 0.5; cols.style.fontSize = fs + "px"; }
}
window.fitTopicsModal = fitTopicsModal;
(function(){
  if(typeof showDayTopics === "function" && !showDayTopics.__fit){
    const __show = showDayTopics;
    showDayTopics = function(id){ const r = __show(id); fitTopicsModal(document.querySelector(".overlay.topics-overlay:last-of-type")); return r; };
    showDayTopics.__fit = true; window.showDayTopics = showDayTopics;
  }
  window.addEventListener("resize", ()=>{ const o = document.querySelector(".overlay.topics-overlay"); if(o) fitTopicsModal(o); });
  const st = document.createElement("style"); st.id = "topics-fit"; st.textContent = `
.overlay .card.topics-modal{max-height:min(92vh,900px);overflow:hidden;}
.overlay .card.topics-modal.tm-wide{width:min(1100px,94vw);max-width:none;}
.topics-cols{flex:1 1 auto;min-height:0;overflow:hidden;padding:14px 24px 10px;font-size:13.5px;}
.tm-wide .topics-cols{column-width:240px;column-gap:28px;}
.topics-cols .tm-group{break-inside:avoid;margin:0 0 10px;}
.topics-cols .topics-modal-sec{padding:0 0 3px;margin:0;font-size:.82em;}
.topics-cols .topics-modal-list{padding:0 0 0 18px;margin:0;}
.topics-cols .topics-modal-list li{font-size:1em;line-height:1.35;padding:3px 0;border-bottom:none;break-inside:avoid;}
.topics-cols .tm-pages{font-size:.82em;}
`; document.head.appendChild(st);
})();

/* ================= Toasts stay clear of the controls =================
   A toast used to sit top right, on "← Back to roadmap" and the lesson controls. On a desktop it now shows
   top centre, just under the top bar (measured, so a top bar that wraps to two rows is respected); on a
   phone it shows over the top bar (the bottom has the Previous / Next bar). It still disappears on its own and never takes a click. */
(function(){
  if(typeof toast !== "function" || toast.__placed) return;
  const __toast = toast;
  toast = function(msg){
    const r = __toast.apply(this, arguments);
    const t = document.getElementById("toast"), bar = document.querySelector(".topbar");
    if(t) t.style.top = window.innerWidth > 760 && bar ? Math.max(8, Math.round(bar.getBoundingClientRect().bottom) + 10) + "px" : "";
    return r;
  };
  toast.__placed = true; window.toast = toast;
  const st = document.createElement("style"); st.id = "toast-place"; st.textContent = `
.toast{left:50%;right:auto;max-width:min(420px, calc(100vw - 40px));transform:translate(-50%,-6px);text-align:center;}
.toast.show{transform:translate(-50%,0);}
@media(max-width:760px){
  .toast{top:8px !important;bottom:auto;left:10px;right:10px;max-width:none;transform:translateY(-6px);}
  .toast.show{transform:none;}
}
`; document.head.appendChild(st);
})();

/* if the portal already drew itself before this file loaded, redraw with the updates */
if(document.querySelector(".topbar")) render();

/* ================= A calm dashboard (easy on the eyes) =================
   Light day-card headers with a thin colour stripe instead of solid navy/orange blocks, titles in normal case,
   one softer Start button with Topics and Finish side by side as quiet buttons, and a light scores band. */
(function(){
  const st = document.createElement("style"); st.id = "calm-dashboard"; st.textContent = `
/* The see-through standard: these four surfaces each painted a flat sheet over
   the page's backdrop, and two of them with !important, so the cards read as
   solid however thin the layer under them was. The card and the rail take the
   glass; the head and the stat tiles inside them go nearly clear, so a card is
   ONE sheet of glass rather than three stacked. */
.dash-main .module-card.mc-clean{background:var(--surface-glass,rgba(255,255,255,.60));backdrop-filter:var(--surface-blur,saturate(118%) blur(10px));-webkit-backdrop-filter:var(--surface-blur,saturate(118%) blur(10px));border:1px solid #E3E6EE;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(38,43,69,.04),0 8px 20px -16px rgba(38,43,69,.25);}
.dash-main .module-card.mc-clean:hover{border-color:#D3D7E3;box-shadow:0 1px 2px rgba(38,43,69,.05),0 10px 24px -14px rgba(38,43,69,.28);}
.dash-main .module-card.mc-clean .module-head,
.dash-main .module-card.mc-clean:nth-child(3n+2) .module-head,
.dash-main .module-card.mc-clean:nth-child(3n+3) .module-head{background:rgba(247,248,251,.34) !important;color:var(--navy);border-top:4px solid #4A5277;border-bottom:1px solid #ECEEF4;}
.dash-main .module-card.mc-clean:nth-child(3n+2) .module-head{border-top-color:var(--orange);}
.dash-main .module-card.mc-clean .mh-day{color:var(--orange-deep);opacity:1;font-weight:700;letter-spacing:.1em;}
.dash-main .module-card.mc-clean .mh-title{text-transform:none;letter-spacing:0;font-weight:700;color:var(--navy);}
.dash-main .module-card.mc-clean .module-start-btn{background:rgba(236,238,245,.62);border:1px solid #DDE1EC;color:var(--navy);border-radius:10px;box-shadow:none;font-weight:700;letter-spacing:.01em;}
.dash-main .module-card.mc-clean .module-start-btn:hover, .dash-main .module-card.mc-clean:hover .module-start-btn{background:#353B57;border-color:#353B57;color:#fff;}
.dash-main .module-card.mc-clean .mc-row{display:flex;gap:8px;margin:0 14px 12px;}
.dash-main .module-card.mc-clean .mc-row .module-finish-btn{flex:1 1 0;min-width:0;width:auto !important;margin:0 !important;background:rgba(243,244,248,.55);border:1px solid #F3F4F8;color:#4A5070;font-weight:600;border-radius:9px;box-shadow:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
@media(min-width:1001px) and (max-width:1340px){ .dash-main .module-card.mc-clean .mc-row{flex-direction:column;gap:5px;} .dash-main .module-card.mc-clean .mc-row .module-finish-btn{flex:0 0 auto !important;padding-top:5px;padding-bottom:5px;} }
@media(max-width:1600px){ .dash-main .module-card.mc-clean .mc-row{gap:6px;margin:0 10px 10px;} .dash-main .module-card.mc-clean .mc-row .module-finish-btn{font-size:11.5px;padding-left:4px;padding-right:4px;} .dash-main .module-card.mc-clean .mc-row .module-topics-btn{flex:0 1 auto;padding-left:8px;padding-right:8px;} }
.dash-main .module-card.mc-clean .mc-row .module-finish-btn:hover{background:#E9EBF2;border-color:#E9EBF2;color:var(--navy);}
.dash-main .module-card.mc-clean > :last-child{margin-bottom:12px;}
.dash-main .module-card.mc-clean .module-theme{color:#6B7088;}
/* the scores band: light, so it doesn't compete with the lessons */
.dash-main > .dash-side{background:var(--surface-glass,rgba(255,255,255,.60)) !important;backdrop-filter:var(--surface-blur,saturate(118%) blur(10px));-webkit-backdrop-filter:var(--surface-blur,saturate(118%) blur(10px));border:1px solid #E3E6EE !important;box-shadow:none !important;}
.dash-main > .dash-side .card{background:rgba(255,255,255,.30) !important;border:1px solid #EDEFF5 !important;box-shadow:none !important;color:var(--navy) !important;}
.dash-main > .dash-side .card *{color:inherit;}
.dash-main > .dash-side .stat .num{color:var(--navy) !important;}
.dash-main > .dash-side .stat .lbl, .dash-main > .dash-side .card .sub, .dash-main > .dash-side .stat .lbl span{color:#6B7088 !important;}
.dash-main > .dash-side .tfb-dash{background:rgba(255,247,239,.55) !important;border-color:#F7DEC6 !important;}
/* The primary button here is a solid orange; a white label on it is 3.6:1,
   so only the ghost button (transparent, on the navy rail) stays white. */
.dash-main > .dash-side .tfb-dash .btn-ghost{color:#fff !important;}
.dash-main > .dash-side .tfb-dash .btn-primary{color:#241304 !important;}
.dash-main > .dash-side .tfb-dash-stars button{color:#D5D8E3 !important;}
.dash-main > .dash-side .tfb-dash-stars button.on, .dash-main > .dash-side .tfb-dash-stars button.lit{color:var(--orange) !important;}
/* "Resume where you left off": a compact button, not a full-width bar */
.dash-main .bottom-actions{background:none !important;border:none !important;padding:0 !important;margin:8px 0 0 !important;box-shadow:none !important;}
.dash-main .bottom-actions .resume-btn{padding:7px 16px;font-size:13.5px;border-radius:999px;}
`; document.head.appendChild(st);
  if(typeof render === "function" && typeof state !== "undefined" && state.view === "dashboard"){ try{ render(); }catch(e){} }
})();

/* ================= Orientation / Blueprint follow today's platform =================
   • Orientation (and the Blueprint PDF built from it): how slides show key lines with 📖 Full notes, the dashboard
     as it is now (day cards filling the screen, the scores band under them), Handouts with the Lesson Notes. */
(function(){
  if(typeof window.orientSlides === "function" && !window.orientSlides.__now){
    const __o = window.orientSlides;
    const card = (n, cls)=>`<div class="or-d2-card ${cls||""}"><span>${ftName(n)}</span><i>Start</i><u>☰ Topics · ✓ Finish</u></div>`;
    const DASH = `
     <div class="or-dash2">
       <div class="or-box or-hero"><span class="or-num">1</span><b>Banner &amp; progress track</b><em>Days 1–10 · ✓ = passed · click a circle to jump to that day</em></div>
       <div class="or-box or-cards"><span class="or-num">2</span><b>Day cards fill the screen</b><em>Start a day · ☰ Topics lists its topics · ✓ Finish Training · 💬 trainer feedback appears on the card</em>
         <div class="or-d2-row">${[1,2,3,4,5].map(n=>card(n, n%3===2 ? "or" : "")).join("")}</div></div>
       <div class="or-box or-band"><span class="or-num">3</span><b>Scores band, under the lessons</b><em>Program complete · best competency score · quiz average · days done · 💬 your feedback · ranking</em></div>
       <div class="or-box"><span class="or-num">4</span><b>Resume &amp; certificate</b><em>▶ Resume where you left off · download your certificate when earned</em></div>
     </div>`;
    window.orientSlides = function(){
      const slides = __o.apply(this, arguments);
      const at = k => slides.findIndex(x => x.k === k);
      let i = at("A day");
      if(i >= 0) slides[i] = Object.assign({}, slides[i], {body: slides[i].body.replace(/One topic at a time, every slide the same size\.[\s\S]*?Your place is saved\./, "One topic at a time, the key points on each slide. 📖 Full notes opens the complete text, which is also in Handouts → Lesson Notes. Your place is saved.")});
      i = at("Dashboard");
      if(i >= 0) slides[i] = Object.assign({}, slides[i], {body: DASH});
      i = at("Navigation");
      if(i >= 0) slides[i] = Object.assign({}, slides[i], {body: slides[i].body.replace("Printable checklists and Excel templates for each day.", "📖 Lesson Notes (the full text of every topic) and printable templates for each day.")});
      return slides;
    };
    window.orientSlides.__now = true;
  }

  const st = document.createElement("style"); st.id = "orient-now"; st.textContent = `
.or-dash2{display:flex;flex-direction:column;gap:10px;}
.or-d2-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px;}
.or-d2-card{background:#fff;border:1px solid #E3E6EE;border-top:4px solid #4A5277;border-radius:10px;padding:8px 8px 9px;display:flex;flex-direction:column;align-items:center;gap:5px;font-size:11px;color:var(--navy);}
.or-d2-card.or{border-top-color:var(--orange);}
.or-d2-card span{font-weight:800;letter-spacing:.06em;color:var(--orange-deep);font-size:10.5px;text-transform:uppercase;}
.or-d2-card i{font-style:normal;font-weight:700;background:#ECEEF5;border-radius:7px;width:100%;text-align:center;padding:4px 0;}
.or-d2-card u{text-decoration:none;color:#5B6178;font-size:10px;}
.or-box.or-band{background:#F7F8FB;border:1px solid #E3E6EE;border-style:solid;}
`; document.head.appendChild(st);
})();

/* ===== Calmer auto-update + lab notes card =====
   A new deploy used to reload any page where nobody was typing, so a trainee choosing from
   dropdowns or reading a lab saw the page flash and reload within seconds. Now the reload waits
   until the page has been left alone (no clicks, keys or scrolling) for 2 minutes; until then the
   banner's Update now button is there. */
(function(){
  const UPDATE_IDLE_MS = 2*60*1000;
  let lastActivityAt = Date.now();
  ["keydown","pointerdown","wheel","touchstart","input","change"].forEach(ev=>
    document.addEventListener(ev, ()=>{ lastActivityAt = Date.now(); }, {capture:true, passive:true}));
  if(typeof updateIsSafe === "function"){
    const __uis = updateIsSafe;
    updateIsSafe = function(){ return Date.now()-lastActivityAt >= UPDATE_IDLE_MS && __uis.apply(this, arguments); };
  }
  if(typeof showUpdateBanner === "function"){
    const __sub = showUpdateBanner;
    showUpdateBanner = function(){
      __sub.apply(this, arguments);
      const span = document.querySelector("#updateBanner span");
      if(span && !state.presenting) span.textContent = "✨ A new version of the portal is ready. It updates on its own once you've paused for a couple of minutes, and your work is saved. Or click Update now.";
    };
  }
  const st = document.createElement("style"); st.id = "lab-notes-card"; st.textContent = `
.card.lab-notes-card{padding:14px 16px;margin:16px 0 4px;background:#FBFAF6;border:1px solid #E7E1D2;border-left:4px solid var(--navy);}
.lab-notes-card label{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 8px;}
.lab-notes-card label span{font-size:13.5px;font-weight:700;color:var(--navy);}
.lab-notes-card label small{font-size:11.5px;color:var(--ink-soft);}
.lab-notes-card textarea{width:100%;min-height:110px;padding:10px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;font-size:13px;font-family:inherit;line-height:1.5;resize:vertical;box-sizing:border-box;}
`; document.head.appendChild(st);
})();

