/* ============================================================
   LSH EA/PA portal — update pack "z" (2026-09-26)
   Loaded by index.html right after the main script. Everything here
   replaces or extends functions in the main script, so the big
   index.html only needs one extra <script> line.
     1. Lesson slides: one standard size, content centred, and slides that
        don't fit continue on balanced extra pages (Next/Prev step pages first).
     2. Admin ↔ Trainee view switch (top bar) without signing out.
     3. SOP Reference: readable layout + a "Present" mode for live discussion.
     4. Presenter view: share only the slides in Meet, see trainer cues yourself.
     5. All lesson content centred; Orientation deck + Blueprint refreshed.
     6. Email Outreach: capstone Day 4 topic + Email Outreach Simulator (Day 4 lab, Part 4).
     7. Inbox Triage + Inbox Zero merged into one Gmail inbox with labels & sub-labels (Day 2 lab).
     8. Day 3 "Proactive EA Tasks" is now a written, graded exercise.
     9. Practice Lab pages in the platform page style (hero, activity headings, cards, buttons).
    10. SOP: Program flow page + a timed run of show for every day.
    11. Trainee feedback: open any page in a new tab (right-click, Ctrl/⌘-click,
        middle-click), "Lessons in a new tab" on every lab, Gmail inbox labels stay on screen.
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
/* ================= SOP Reference: readable reference + live Present mode ================= */
.sopx-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;}
.sopx-days{display:flex;gap:6px;flex-wrap:wrap;}
.sopx-mode{display:inline-flex;background:#EEF0F6;border-radius:999px;padding:4px;}
.sopx-mode button{font:inherit;font-size:13.5px;font-weight:700;border:none;background:none;color:var(--navy);padding:7px 16px;border-radius:999px;cursor:pointer;}
.sopx-mode button.on{background:var(--navy);color:#fff;}
.sopx-hero{padding:26px 30px;margin-bottom:16px;border-top:6px solid var(--navy);}
.sopx-kicker, .sopx-s-kicker{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep);}
.sopx-hero h2{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:30px;margin:4px 0 12px;}
.sopx-quote{margin:0 0 14px;padding:12px 16px;border-left:4px solid var(--orange);background:#FFF8EF;border-radius:0 10px 10px 0;font-size:15px;font-style:italic;color:#37394A;}
.sopx-meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;} .sopx-meta.center{justify-content:center;margin-top:18px;}
.sopx-meta span{background:#F3F4F9;border-radius:999px;padding:6px 12px;font-size:13px;color:var(--ink);} .sopx-meta b{color:var(--navy);margin-right:2px;}
.sopx-cols{display:grid;grid-template-columns:1.2fr 1fr;gap:22px;}
.sopx-sub{font-size:13px;font-weight:800;color:var(--navy);margin:0 0 10px;}
.sopx-obj{margin:0;padding-left:22px;} .sopx-obj li{font-size:15px;line-height:1.55;margin-bottom:8px;}
.sopx-chips{display:flex;flex-wrap:wrap;gap:8px;} .sopx-chips span{background:#fff;border:1px solid var(--line);border-left:4px solid var(--orange);border-radius:10px;padding:8px 12px;font-size:14px;line-height:1.35;color:var(--ink);}
.sopx-toc{position:sticky;top:64px;z-index:5;display:flex;gap:6px;overflow-x:auto;background:var(--bg,#F6F4EF);padding:8px 0 10px;margin-bottom:6px;scrollbar-width:thin;}
.sopx-toc b{font-size:12px;color:var(--ink-soft);align-self:center;white-space:nowrap;margin-right:4px;}
.sopx-toc a{white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--navy);background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 11px;text-decoration:none;}
.sopx-toc a:hover{border-color:var(--orange);color:var(--orange-deep);}
.sopx-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start;}
.sopx-sec{padding:18px 22px;margin:0;scroll-margin-top:120px;} .sopx-sec.wide{grid-column:1 / -1;}
.sopx-sec h3{display:flex;align-items:baseline;gap:10px;font-family:'Fraunces',Georgia,serif;font-size:19px;color:var(--navy);margin:0 0 12px;line-height:1.25;}
.sopx-n{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:700;color:#fff;background:var(--navy);border-radius:6px;padding:2px 7px;flex-shrink:0;}
.sopx-list{margin:0;padding:0;list-style:none;} .sopx-list li{position:relative;padding:7px 0 7px 20px;font-size:15px;line-height:1.55;border-bottom:1px dashed #E8E4DC;}
.sopx-list li:last-child{border-bottom:none;} .sopx-list li::before{content:"";position:absolute;left:3px;top:15px;width:7px;height:7px;border-radius:50%;background:var(--orange);}
.sopx-sec.wide .sopx-list{columns:2;column-gap:28px;} .sopx-sec.wide .sopx-list li{break-inside:avoid;}
.sopx-lbl{color:var(--navy);}
.sopx-p{font-size:15px;line-height:1.7;margin:0;max-width:85ch;}
.sopx-table td{font-size:14px;line-height:1.5;vertical-align:top;} .sopx-table th{font-size:12.5px;} .sopx-table tbody tr:nth-child(even) td{background:#FAFAFC;}
@media(max-width:860px){.sopx-cols, .sopx-grid{grid-template-columns:1fr;} .sopx-sec.wide .sopx-list{columns:1;} .sopx-toc{top:0;}}
/* Present mode */
.sopx-stage{background:linear-gradient(135deg,#1F2440 0%,#2B3158 60%,#353C68 100%);border-radius:20px;padding:16px 20px;}
.sopx-s-top{display:flex;align-items:center;gap:10px;margin-bottom:12px;} .sopx-s-top .btn{margin-left:auto;}
.sopx-jump{font:inherit;font-size:13px;max-width:60%;border-radius:8px;border:none;padding:6px 8px;background:#fff;color:var(--navy);}
.sopx-s-top .btn-ghost{background:#fff;}
.sopx-lbl.blk{display:block;margin-bottom:4px;} .sopx-pt{display:block;font-size:.8em;line-height:1.45;color:var(--ink-soft);font-weight:400;}
.sopx-s-note{font-size:12px;color:#9EA3C2;margin-left:auto;} .sopx-s-note + .btn{margin-left:0;}
@media(max-width:760px){.sopx-s-note{display:none;}}
.sopx-s-count{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#C9CDE3;}
.sopx-slide{background:#FFFDF8;border-radius:16px;height:clamp(420px,64vh,700px);overflow:auto;padding:40px 56px;display:flex;flex-direction:column;justify-content:safe center;align-items:center;text-align:center;position:relative;}
.sopx-slide::before{content:"";position:absolute;inset:0 0 auto 0;height:6px;border-radius:16px 16px 0 0;background:linear-gradient(90deg,var(--navy),var(--orange));}
.sopx-slide > .sopx-fit{max-width:1100px;width:100%;}
.sopx-s-big{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:clamp(34px,4vw,58px);line-height:1.1;margin:10px 0 18px;}
.sopx-s-quote{font-size:clamp(17px,1.6vw,22px);font-style:italic;color:#37394A;line-height:1.5;margin:0 auto;max-width:60ch;}
.sopx-s-title{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:clamp(26px,2.8vw,42px);line-height:1.15;margin:8px 0 22px;}
.sopx-s-part{font-family:'IBM Plex Mono',monospace;font-size:.4em;color:var(--orange-deep);background:#FFF1E2;border-radius:999px;padding:3px 10px;vertical-align:middle;}
.sopx-s-sub{font-size:clamp(15px,1.3vw,18px);color:var(--ink-soft);margin:-10px 0 18px;}
.sopx-s-list{list-style:none;margin:0;padding:0;display:grid;gap:14px;text-align:left;counter-reset:sx;}
.sopx-s-list.two{grid-template-columns:repeat(2,minmax(0,1fr));}
.sopx-s-list li{counter-increment:sx;position:relative;background:#fff;border:1px solid var(--line);border-left:5px solid var(--navy);border-radius:12px;padding:16px 18px 16px 20px;font-size:clamp(16px,1.45vw,21px);line-height:1.45;color:var(--ink);}
.sopx-s-list li:nth-child(even){border-left-color:var(--orange);}
ol.sopx-s-list li{padding-left:58px;} ol.sopx-s-list li::before{content:counter(sx);position:absolute;left:16px;top:15px;width:28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.sopx-s-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;}
.sopx-s-chips span{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 18px;font-size:clamp(16px,1.4vw,20px);color:var(--ink);text-align:left;}
.sopx-s-chips b{background:var(--orange);color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.sopx-s-para{font-size:clamp(18px,1.7vw,24px);line-height:1.6;color:var(--ink);max-width:62ch;margin:0 auto;text-align:left;}
.sopx-s-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.sopx-s-table th{background:var(--navy);color:#fff;font-size:clamp(13px,1.1vw,15px);padding:12px 14px;}
.sopx-s-table td{font-size:clamp(15px,1.3vw,18px);line-height:1.45;padding:12px 14px;border-top:1px solid var(--line);vertical-align:top;}
.sopx-s-bar{height:4px;background:rgba(255,255,255,.15);border-radius:4px;margin:12px 0 0;overflow:hidden;} .sopx-s-bar i{display:block;height:100%;background:#F0C08A;transition:width .3s;}
.sopx-s-nav{display:flex;justify-content:space-between;align-items:center;margin-top:12px;} .sopx-s-nav span{font-size:12px;color:#C9CDE3;} .sopx-s-nav .btn-ghost{background:#fff;}
.sopx-stage:fullscreen{border-radius:0;padding:2.5vh 3vw;display:flex;flex-direction:column;}
.sopx-stage:fullscreen .sopx-slide{flex:1;height:auto;font-size:1.15em;}
.sopx-stage:fullscreen .sopx-s-list li, .sopx-stage:fullscreen .sopx-s-para{font-size:clamp(20px,1.8vw,28px);}
@media(max-width:760px){.sopx-slide{height:auto;min-height:60vh;padding:26px 18px;} .sopx-s-list.two{grid-template-columns:1fr;} .sopx-jump{max-width:48%;}}
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
function goToKnowledgeCheckWithInterstitial(){
  if((state.slidePages||1) > 1 && (state.slidePage||0) < state.slidePages-1){ showSlidePage((state.slidePage||0)+1); return; }
  state.dayViewMode = "knowledgeCheck";
  render();
  window.scrollTo({top:0, behavior:"smooth"});
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
const __eapaDayUnlocked = window.dayUnlocked;
window.dayUnlocked = function(id){ return state.adminPreview ? true : __eapaDayUnlocked(id); };
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

/* ---------- 3. SOP Reference + Present mode ---------- */
const __eapaSopLive = window.sopLiveSections;
window.sopLiveSections = function(d){
  const tags = {"Session plan":"plan", "Topics covered":"topics", "Practice Lab":"lab", "After the session":"after"};
  return __eapaSopLive(d).map(s=>{ const k = Object.keys(tags).find(t=>String(s.h).startsWith(t)); return k ? Object.assign({}, s, {live:tags[k]}) : s; });
};
/* ---------- SOP Reference ----------
   Two ways to use it:
   • Reference — a scannable page: day summary up top, a jump list, then each
     section as a numbered card with larger type ("Label: detail" lines get a bold label).
   • Present — for live discussion: one short slide at a time, big type, long
     sections split into balanced parts, ← → keys and full screen. */
function renderAdminSOP(){
  const day = state.sopDay==null ? 0 : state.sopDay;
  const d = day ? sopForDay(day) : null;
  const availableDays = DAYS.map(x=>x.id);
  const mode = state.sopMode || "read";
  return `
    <p class="eyebrow">Admin — Reference</p>
    <h1 style="color:var(--navy);font-size:26px;margin:6px 0 4px;">SOP Reference</h1>
    <p style="color:var(--ink-soft);font-size:13px;max-width:70ch;margin:0 0 20px;">How to facilitate this training. Start with <b>🧭 Program flow</b>, then each day's <b>Run of show</b> — a timed, step-by-step plan built from that day's content — followed by the detailed script. Use <b>Present</b> to show a day's content to the room.</p>
    <div class="sopx-bar">
      <div class="sopx-days">
        <button class="btn btn-sm ${day===0?'btn-navy':'btn-ghost'}" onclick="setSopDay(0)">🧭 Program flow</button>
        ${Array.from({length:10},(_,i)=>i+1).map(n=>{
          const has = availableDays.includes(n);
          return `<button class="btn btn-sm ${n===day?'btn-navy':'btn-ghost'}" ${has?'':'disabled title="Not yet added"'} onclick="setSopDay(${n})">${ftName(n)}${has?'':' (soon)'}</button>`;
        }).join("")}
      </div>
      <div class="sopx-mode" role="tablist" style="${day===0?"display:none":""}">
        <button class="${mode==="read"?"on":""}" onclick="setSopMode('read')">📖 Reference</button>
        <button class="${mode==="present"?"on":""}" onclick="setSopMode('present')">🎤 Present</button>
      </div>
    </div>
    ${day===0 ? sopProgramFlow() : !d ? `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">${ftName(day)}'s SOP content hasn't been added yet.</div>`
      : mode==="present" ? renderSopPresent(d) : renderSopDayContent(d)}
  `;
}
/* "Mindset: Strategic Partner" → bold label + detail */
function sopItemHtml(t){
  if(t && typeof t==="object") return `<b class="sopx-lbl blk">${esc(t.label)}</b>${t.text ? `<span class="sopx-pt">${esc(t.text)}</span>` : ""}`;
  const s = String(t||""); const m = s.match(/^([^:.!?]{2,42}):\s+(.+)$/);
  return m ? `<b class="sopx-lbl">${esc(m[1])}:</b> ${esc(m[2])}` : esc(s);
}
function renderSopDayContent(d){
  const info = d.discussionInfo || {};
  const meta = [["⏱","Duration",info.duration],["🖥","PPT",info.ppt],["🎨","Canva",info.canvaLabel],["🎬","Video",info.video]].filter(x=>x[2]);
  return `
    <div class="card sopx-hero">
      <div class="sopx-kicker">${ftName(d.id)} · Trainer SOP</div>
      <h2>${esc(d.title)}</h2>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 12px;"><button class="btn btn-navy btn-sm" onclick="downloadDayScriptsPdf(${d.id})">⬇ ${ftName(d.id)} Speaker Notes (PDF)</button><span style="font-size:12.5px;color:var(--ink-soft);">The same notes are in 🖥 Presenter view, slide by slide.</span></div>
      ${d.introduction ? `<blockquote class="sopx-quote">“${esc(d.introduction)}”</blockquote>` : ""}
      ${meta.length ? `<div class="sopx-meta">${meta.map(([i,k,v])=>`<span>${i} <b>${k}</b> ${esc(v)}</span>`).join("")}</div>` : ""}
      <div class="sopx-cols">
        <div><div class="sopx-sub">🎯 Objectives — participants will be able to</div>
          <ol class="sopx-obj">${(d.objectives||[]).map(o=>`<li>${esc(o)}</li>`).join("")}</ol></div>
        <div><div class="sopx-sub">🗂 Today we will discuss</div>
          <div class="sopx-chips">${(d.topics||[]).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div>
      </div>
    </div>
    ${sopRunOfShow(d)}
    ${d.handWritten ? "" : `<div class="empty-note" style="margin-bottom:12px;">This day's SOP is generated from the live portal content, so it always matches what trainees see. Add a hand-written script for it any time and it will appear above the auto-built plan.</div>`}
    <nav class="sopx-toc"><b>Jump to</b>${d.sections.map((s,i)=>`<a href="#sopsec-${i}" onclick="event.preventDefault();document.getElementById('sopsec-${i}').scrollIntoView({behavior:'smooth',block:'start'})">${i+1}. ${esc(s.h)}</a>`).join("")}</nav>
    <div class="sopx-grid">${d.sections.map(renderSopSection).join("")}</div>
  `;
}
function renderSopSection(s, i){
  let body = "", wide = false;
  if(s.type==="bullets"){
    body = `<ul class="sopx-list">${s.items.map(x=>`<li>${sopItemHtml(x)}</li>`).join("")}</ul>`;
    wide = s.items.length > 7 || s.items.join(" ").length > 700;
  }else if(s.type==="paragraph"){
    body = `<p class="sopx-p">${esc(s.text)}</p>`;
    wide = String(s.text||"").length > 500;
  }else if(s.type==="table"){
    body = `<div style="overflow-x:auto;"><table class="log-table sopx-table"><thead><tr>${s.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    wide = true;
  }
  return `
    <section class="card sopx-sec ${wide?"wide":""}" id="sopsec-${i}">
      <h3><span class="sopx-n">${String(i+1).padStart(2,"0")}</span>${esc(s.h)}</h3>
      ${body}
    </section>`;
}
/* ---- Present mode ---- */
function sopChunk(items, weight, budget, maxN){
  // Split into the fewest parts that respect the budget, then even them out.
  const total = items.reduce((a,x)=>a+weight(x),0);
  const parts = Math.max(Math.ceil(total/budget), Math.ceil(items.length/maxN), 1);
  const target = total/parts, out = [[]]; let acc = 0;
  items.forEach(x=>{
    const w = weight(x);
    if(out[out.length-1].length && (acc + w/2 > target*out.length) && out.length < parts){ out.push([]); }
    out[out.length-1].push(x); acc += w;
  });
  return out;
}
function sopPresentSlides(d){
  const info = d.discussionInfo || {};
  const slides = [{kind:"title", d, info}];
  if((d.objectives||[]).length) slides.push({kind:"list", h:"Objectives", sub:"By the end of this session, participants will be able to:", items:d.objectives, ordered:true});
  if((d.topics||[]).length) slides.push({kind:"chips", h:"Today we will discuss", items:d.topics});
  // Trainer-only planning sections (session plan, lab admin notes, after-session
  // checklist) stay in Reference; the auto-built topic table becomes simple
  // "topic — key point" slides (trainer cues are never shown on a shared screen).
  const shown = d.sections.filter(s=>!["plan","lab","after"].includes(s.live));
  shown.forEach((s0,si)=>{
    const s = s0.live==="topics" ? {h:"Topics we'll cover", type:"bullets", items:s0.rows.map(r=>({label:r[1], text:r[2]}))} : s0;
    let parts = [];
    if(s.type==="bullets") parts = sopChunk(s.items, x=>typeof x==="object" ? 30+(x.label+" "+x.text).length*0.35 : 60+String(x).length, 520, 6).map(items=>({kind:"list", items}));
    else if(s.type==="paragraph"){
      const sentences = String(s.text||"").match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [s.text];
      parts = sopChunk(sentences, x=>x.length, 420, 99).map(ss=>({kind:"para", text:ss.join("").trim()}));
    }else if(s.type==="table") parts = sopChunk(s.rows, r=>80+r.join(" ").length, 700, 5).map(rows=>({kind:"table", headers:s.headers, rows}));
    parts.forEach((p,pi)=>slides.push(Object.assign(p, {h:s.h, num:si+1, of:shown.length, part:pi+1, parts:parts.length})));
  });
  return slides;
}
function renderSopSlide(sl, d){
  const head = (k)=>`<div class="sopx-s-kicker">${k}</div><h2 class="sopx-s-title">${esc(sl.h)}${sl.parts>1?` <span class="sopx-s-part">${sl.part} / ${sl.parts}</span>`:""}</h2>`;
  const kick = sl.num && sl.of > 1 ? `${ftName(d.id)} · Section ${sl.num} of ${sl.of}` : `${ftName(d.id)}`;
  if(sl.kind==="title"){
    const i = sl.info;
    return `<div class="sopx-s-kicker">${ftName(d.id)} · Upskill Training</div>
      <h1 class="sopx-s-big">${esc(d.title)}</h1>
      ${d.introduction ? `<p class="sopx-s-quote">“${esc(d.introduction)}”</p>` : ""}
      <div class="sopx-meta center">${[["⏱",i.duration],["🖥",i.ppt],["🎬",i.video]].filter(x=>x[1]).map(([e,v])=>`<span>${e} ${esc(v)}</span>`).join("")}</div>`;
  }
  if(sl.kind==="chips") return head(kick) + `<div class="sopx-s-chips">${sl.items.map((t,k)=>`<span><b>${k+1}</b>${esc(t)}</span>`).join("")}</div>`;
  if(sl.kind==="list"){
    const tag = sl.ordered ? "ol" : "ul";
    return head(kick) + (sl.sub?`<p class="sopx-s-sub">${esc(sl.sub)}</p>`:"") + `<${tag} class="sopx-s-list ${sl.items.length>3?"two":""}">${sl.items.map(x=>`<li>${sopItemHtml(x)}</li>`).join("")}</${tag}>`;
  }
  if(sl.kind==="para") return head(kick) + `<p class="sopx-s-para">${esc(sl.text)}</p>`;
  if(sl.kind==="table") return head(kick) + `<table class="sopx-s-table"><thead><tr>${sl.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${sl.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return "";
}
function renderSopPresent(d){
  const slides = sopPresentSlides(d);
  const idx = Math.max(0, Math.min(state.sopSlide||0, slides.length-1)); state.sopSlide = idx;
  const sl = slides[idx];
  const outline = [];
  slides.forEach((s,k)=>{ if(s.part===1 || !s.part) outline.push({k, label: s.kind==="title" ? "Welcome" : s.h}); });
  return `
    <div class="sopx-stage" id="sopStage">
      <div class="sopx-s-top">
        <select class="sopx-jump" onchange="sopGo(+this.value, true)" title="Jump to a section">${outline.map(o=>`<option value="${o.k}" ${slides[idx].h===slides[o.k].h && (slides[idx].kind==="title")===(slides[o.k].kind==="title")?"selected":""}>${esc(o.label)}</option>`).join("")}</select>
        <span class="sopx-s-count">${idx+1} / ${slides.length}</span>
        <span class="sopx-s-note">Trainer-only planning notes stay in Reference</span>
        <button class="btn btn-sm btn-ghost" onclick="sopFullscreen()">⛶ Full screen</button>
      </div>
      <div class="sopx-slide" id="sopSlide"><div class="sopx-fit">${renderSopSlide(sl, d)}</div></div>
      <div class="sopx-s-bar"><i style="width:${Math.round((idx+1)/slides.length*100)}%"></i></div>
      <div class="sopx-s-nav">
        <button class="btn btn-ghost" onclick="sopGo(-1)" ${idx===0?"disabled":""}>← Previous</button>
        <span>Use ← → keys</span>
        <button class="btn btn-primary" onclick="sopGo(1)" ${idx===slides.length-1?"disabled":""}>Next →</button>
      </div>
    </div>`;
}
function sopGo(v, absolute){
  const d = sopForDay(state.sopDay||1); if(!d) return;
  const n = sopPresentSlides(d).length;
  state.sopSlide = Math.max(0, Math.min(absolute ? v : (state.sopSlide||0)+v, n-1));
  const stage = document.getElementById("sopStage");
  if(stage){ const tmp = document.createElement("div"); tmp.innerHTML = renderSopPresent(d); stage.innerHTML = tmp.querySelector("#sopStage").innerHTML; fitSopSlide(); }
  else render();
}
/* shrink a slide's content just enough to fit the fixed slide box (never below 70%) */
function fitSopSlide(){
  const box = document.getElementById("sopSlide"); const fit = box && box.querySelector(".sopx-fit"); if(!fit) return;
  let z = 1; fit.style.zoom = "1";
  while(box.scrollHeight > box.clientHeight + 1 && z > 0.7){ z -= 0.05; fit.style.zoom = String(z); }
}
window.addEventListener("resize", ()=>{ if(document.getElementById("sopSlide")) fitSopSlide(); });
document.addEventListener("fullscreenchange", ()=>setTimeout(()=>{ if(document.getElementById("sopSlide")) fitSopSlide(); }, 120));
function sopFullscreen(){
  const el = document.getElementById("sopStage");
  if(!document.fullscreenElement && el && el.requestFullscreen) el.requestFullscreen().catch(()=>toast("Your browser blocked full screen — press F11 instead."));
  else if(document.exitFullscreen) document.exitFullscreen();
}
function setSopMode(m){ state.sopMode = m; state.sopSlide = 0; render(); }
document.addEventListener("keydown", (e)=>{
  if(state.view!=="admin" || (state.adminTab||"audit")!=="sop" || state.sopMode!=="present" || (typeof isTyping==="function" && isTyping()) || document.querySelector(".overlay")) return;
  if(e.key==="ArrowRight" || e.key==="PageDown"){ e.preventDefault(); sopGo(1); }
  else if(e.key==="ArrowLeft" || e.key==="PageUp"){ e.preventDefault(); sopGo(-1); }
});
Object.assign(window, {sopGo, sopFullscreen, setSopMode});
function setSopDay(d){ state.sopDay=d; state.sopSlide=0; render(); }
const __eapaAfterRender = window.afterRender;
window.afterRender = function(){ if(document.getElementById("sopSlide")) fitSopSlide(); return __eapaAfterRender.apply(this, arguments); };


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
function presenterCues(d, slide){
  const out = [];
  if(slide.type==="topic"){
    const l = d.lessons[slide.lessonIndex];
    out.push(`<h3>${esc(l.h)}${l.singleSlide ? "" : ` <small style="font-size:12px;color:var(--ink-soft);">Part ${slide.part} of 2</small>`}</h3>`);
    const pageInfo = state.presentSecsFor === (state.lessonSlide||0);
    out.push(renderPresenterNote(d, l, slide.part, pageInfo ? state.presentSecs : null, pageInfo ? state.presentAllSecs : null,
      pageInfo ? {page: state.presentPage||0, pages: state.presentPages||1, secsByPage: state.presentSecsByPage} : null));   // scripts: js/days/dayN/scripts.js
  }else if(slide.type==="block"){
    const b = dayBlock(d, slide.lessonIndex), first = b.lessons[0].num, last = b.lessons[b.lessons.length-1].num;
    out.push(`<h3>Part ${b.n} of ${b.of}: ${esc(b.title)}</h3><p>Topics ${first}–${last}${b.sections.length > 1 ? `, in ${b.sections.length} sections` : ""}. Tell the room what this part of the day covers and why it matters, then move on to Topic ${first}.</p>`);
  }else if(slide.type==="divider"){
    const l = d.lessons[slide.lessonIndex];
    out.push(`<h3>Topic ${slide.lessonIndex+1} of ${d.lessons.length}: ${esc(l.h)}</h3><p>${l.section ? `Section: ${esc(l.section)}. ` : ""}Name the topic, then move on to its first slide.</p>`);
  }else if(slide.type==="quickCheck"){
    out.push(`<h3>Quick Check</h3><p>Let the room answer first — then reveal and use the rationale.</p>`);
    (d.quickChecks||[]).filter(c=>c.afterIndex===slide.lessonIndex).forEach(c=>{
      out.push(`<p><b>${esc(c.q)}</b></p><div class="pv-ans">✓ ${esc((c.opts||[])[c.a] || "")}</div>${c.r ? `<p>${esc(c.r)}</p>` : ""}`);
    });
  }else if(slide.type==="meetClient"){
    out.push(`<h3>Meet Elias Thorne — Live Q&amp;A</h3>` + renderMeetClientTrainerGuide());
  }else if(slide.type==="discussion"){
    out.push(`<h3>Trainer Checkpoint</h3><p><b>Say:</b> "Before we close ${ftName(d.id)}, let's step back and talk about this together."</p><p><b>Ask:</b> ${esc(d.discussionQuestion||"")}</p><p>Take 2–3 answers, connect each one to a lesson from today, then move on to the Knowledge Check.</p>`);
  }else if(slide.type==="practiceLab"){
    out.push(`<h3>Practice Lab</h3><p>Trainees complete the exercise now. Once it's finished, pause for a live debrief — have them walk through what they did, why, and where their judgment differed from the model answer.</p>`);
  }else if(slide.type==="video"){
    out.push(`<h3>Video Recap</h3><p>Play the recap video (or summarise the day's three biggest ideas if it isn't ready yet), then move to the Practice Lab.</p>`);
  }else if(slide.type==="taskOverview"){
    out.push(`<h3>Task Overview</h3><p>Walk the room through today's real-world task before the lessons start — ask who has done something like it before.</p>`);
  }
  return out.join("") || `<p class="pv-empty">No trainer cue for this slide.</p>`;
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

/* ---------- 10. SOP: how to facilitate — program flow + a run of show per day ----------
   Trainer-only. The run of show is built from each day's live content (topics,
   Quick Checks, Practice Lab activities, discussion question, Knowledge Check),
   so it always matches what trainees see. Clock times follow a start time the
   trainer picks. Never shown in Present mode. */
const SOP_LAB_ACTIVITIES = {
  dossier1:["Client Dossier","Preference Trackers","ACT Email","Gatekeeping Practice"],
  forcemultiplier2:["Anticipate the Real Need","Prompt Engineering","The Full Scenario","Inbox Triage"],
  calendar:["Calendar Conflict Resolver","Daily Briefing Prompt","Proactive EA Tasks","Travel Management"],
  coldcalling4:["Prioritize the Day","Prospect Call Log","Lead Generation Practice","Live Intake Call Simulator","Email Outreach Simulator"],
  insurance5:["Classify the Risk","Match the Strategy","Home Binder","Crisis Roleplay"],
  projectcompliance6:["Compliance Risk","Operational Warning Signs","Recovery Memo","Crisis Roleplay","Compliance Audit Simulation"],
  financial:["Trust Ledger Reconciliation","Invoice & Bill Audit","Invoice Follow-Up","Attention to Detail Test"],
  accessincident8:["Least-Privilege Access Audit","Verify Before You Disclose","Contain the Leak"],
  compliance9:["Event Invite & Registration Form","Event Follow-Up","Meeting Notes & Action Items","CLE Compliance Dashboard","Negative Review Response","Awards Tracker","Crisis Roleplay"],
  socialmedia10:["Engagement Rate","Version Matching","Campaign Math","Brand Kit","Marketing Plan"]
};
(function(){ const s = document.createElement("style"); s.id = "eapa-sop-flow"; s.textContent = `
.sopf{padding:22px 26px;margin-bottom:16px;border-top:6px solid var(--orange);}
.sopf-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px;}
.sopf-head h2{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:24px;margin:2px 0 0;}
.sopf-meta{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px;} .sopf-meta span{background:#F3F4F9;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:700;color:var(--navy);}
.sopf-start{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink-soft);} .sopf-start input{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:5px 8px;}
.sopf-steps{list-style:none;margin:0;padding:0;counter-reset:sf;}
.sopf-steps > li{display:grid;grid-template-columns:118px minmax(0,1fr);gap:16px;padding:14px 0;border-top:1px dashed #E3DDD2;}
.sopf-time{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:700;color:var(--orange-deep);line-height:1.5;}
.sopf-time small{display:block;color:var(--ink-soft);font-weight:600;}
.sopf-step h4{margin:0 0 6px;font-size:16px;color:var(--navy);display:flex;align-items:center;gap:8px;}
.sopf-step h4 .n{counter-increment:sf;} .sopf-step h4 .n::before{content:counter(sf);display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;font-size:12px;}
.sopf-rows{display:grid;gap:5px;font-size:14px;line-height:1.55;}
.sopf-rows div{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;}
.sopf-rows > div > b{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);padding-top:3px;} .sopf-rows li b{color:var(--navy);}
.sopf-rows ul{margin:0;padding-left:18px;}
.sopf-step.brk h4{color:#3F7D58;} .sopf-step.brk h4 .n::before{background:#3F7D58;}
.sopf-step.opt h4::after{content:"Optional";font-size:11px;font-weight:700;color:#B06000;background:#FFF1E2;border-radius:999px;padding:2px 8px;}
.sopf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
.sopf-card{padding:18px 20px;} .sopf-card h3{font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:19px;margin:0 0 10px;}
.sopf-card ol, .sopf-card ul{margin:0;padding-left:20px;font-size:14px;line-height:1.6;} .sopf-card li{margin-bottom:6px;}
.sopf-map td, .sopf-map th{font-size:13.5px;vertical-align:top;}
@media(max-width:760px){.sopf-steps > li{grid-template-columns:1fr;gap:6px;} .sopf-rows div{grid-template-columns:1fr;}}
@media print{.topbar, .admin-tabs, .sopx-bar, .page-hero, .footer-note, .sopx-toc, .sopf-start{display:none !important;} .sopf{box-shadow:none;border:1px solid #ccc;}}
`; document.head.appendChild(s); })();

function sopClock(startMin, off){ const t = startMin + off; const h = Math.floor(t/60)%24, m = t%60; return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`; }
function sopStartMin(){ const v = state.sopStart || "09:00"; const [h,m] = v.split(":").map(Number); return (h||9)*60 + (m||0); }
function setSopStart(v){ state.sopStart = v; try{ localStorage.setItem("lsh_sop_start", v); }catch(e){} render(); }
try{ state.sopStart = state.sopStart || localStorage.getItem("lsh_sop_start") || "09:00"; }catch(e){}
function sopRunOfShow(dRaw){
  const d = DAYS.find(x=>x.id===dRaw.id); if(!d) return "";
  const tools = relatedTools(d.id), lab = tools[0];
  const acts = lab ? (SOP_LAB_ACTIVITIES[lab.id] || []) : [];
  const n = d.lessons.length, qcs = (d.quickChecks||[]).slice().sort((a,b)=>a.afterIndex-b.afterIndex);
  const kc = (d.quiz||[]).length;
  const steps = []; let t = 0;
  const add = (mins, s)=>{ steps.push(Object.assign({from:t, to:t+mins}, s)); t += mins; };
  add(15, {pre:true, title:"Before trainees join", do:[
    `Admin → <b>Trainee Audit</b>: approve anyone new; check everyone has ${ftName(d.id)} unlocked (the previous day's Practice Lab submitted).`,
    `Presenter view (below) shows each slide's notes, script and scenario; the day's Speaker Notes PDF is in Admin → SOP Reference.`,
    `Open ${ftName(d.id)} → slides → <b>🖥 Presenter view</b>. Allow pop-ups. In Google Meet: <b>Present now → A window</b> → “LSH Slides — share this window”.`,
    `Pick your random-task moment (step marked below) and how long trainees get (15–30 min).`]});
  add(5, {title:"Welcome, recap & today's objectives", do:[
    `Show the <b>📋 Objectives</b> page (button above the slides) — it lists what trainees will be able to do by the end of today.`,
    `Recap yesterday in one minute: the 1–2 things most people found hard (check Rankings / Knowledge Check scores).`],
    say:`“By the end of today you'll be able to ${esc(String(d.objective||d.title).replace(/\.$/,"").replace(/^[A-Z](?=[a-z])/, c=>c.toLowerCase()))}.”`,
    watch:"Anyone who hasn't opened today's day yet — ask them to open it now so they can follow along."});
  if(d.id===1) add(8, {title:"Meet Elias Thorne — live roleplay", do:[`Step into the role of Elias for 5–8 minutes. The full in-character guide (opening line, tone, sample answers) is in your notes on this slide.`, `Drop character explicitly at the end: “Okay, that's Elias — now let's build the real dossier.”`], watch:"Trainees asking vague questions — prompt them to ask what would lose his trust fastest."});
  // teaching blocks of ~45 minutes, with the Quick Checks where they fall and breaks in between
  const perTopic = 2.5, blockTopics = Math.max(8, Math.round(45/perTopic));
  let i = 0, block = 1; const blocks = Math.ceil(n/blockTopics);
  const midBlock = Math.max(1, Math.ceil(blocks/2));
  const taskStep = {opt:true, title:"Send today's random task", do:[`Admin → <b>🎲 Random Tasks</b>: choose <b>${ftName(d.id)}</b>, set 15–30 minutes, <b>Write &amp; send</b>. Keep teaching — trainees handle it in 🎲 Tasks alongside the session.`, `Anyone who doesn't submit before the timer ends gets it logged as Missed (0).`]};
  while(i < n){
    const j = Math.min(n, i+blockTopics);
    if(block===midBlock+1) add(0, taskStep);   // right after the break, as teaching resumes
    const inBlock = qcs.filter(q=>q.afterIndex>=i && q.afterIndex<j);
    add(Math.round((j-i)*perTopic + inBlock.length*1.5), {title:`Teach topics ${i+1}–${j} of ${n}`, do:[
      `Present each topic's two parts (principles & steps, then best practices & pitfalls). Longer topics continue on a second page — press Next.`,
      `Use each slide's notes in Presenter view: On this slide, the script (Say / Ask) and the scenario for the room. Take one or two answers per topic, not a round-robin.`,
      inBlock.length ? `Quick Check${inBlock.length>1?"s":""} after topic${inBlock.length>1?"s":""} ${inBlock.map(q=>q.afterIndex+1).join(", ")}: let the room answer first, then reveal (the answer and rationale are in your notes).` : "",
      `Topics: ${d.lessons.slice(i,j).map((l,k)=>`${i+k+1}. ${esc(l.h)}`).join(" · ")}`].filter(Boolean),
      watch:"Silence usually means the example is too abstract — use the Applied Discussion Case from your notes."});
    i = j; block++;
    if(i >= n && blocks===1) add(0, taskStep);
    if(i < n) add(10, {brk:true, title:"Break", do:["10 minutes. Tell the room the exact time you'll restart."]});
  }
  add(5, {title:"Video recap", do:["Play the day's recap video on the Video slide (or, until it's added, summarise the three biggest ideas in one minute each)."]});
  if(lab){
    const labMins = Math.max(20, acts.length*10);
    add(labMins, {title:`Practice Lab — ${esc(lab.title)}`, do:[
      `Trainees open it from the Practice Lab slide (or 🧪 Practice Lab). They work in their own portal; stop presenting or leave the Practice Lab slide up.`,
      acts.length ? `Activities (≈10 min each): ${acts.map((a,k)=>`<b>${k+1}. ${esc(a)}</b>`).join(" · ")}.` : "",
      acts.some(a=>/Roleplay/i.test(a)) ? `The Crisis Roleplay can be run live by you, or trainees rehearse solo first.` : "",
      `First submission of each exercise is free; repeats use one of the 3 attempts for that day's Practice Lab (reset in Trainee Audit if someone is blocked by a technical issue).`].filter(Boolean),
      watch:"Anyone stuck on the same activity for more than 10 minutes — nudge them to submit and move on; the debrief is where the learning lands."});
    add(10, {title:"Practice Lab debrief", do:[`Ask 2–3 trainees to walk through what they did and why, and where their judgment differed from the model answer.`, `Point to the Evaluation Report's “Not this way — what to change” section: it's the next step, not a verdict.`]});
  }
  if(d.discussionQuestion) add(8, {title:"End-of-day discussion", say:`“Before we close ${ftName(d.id)}, let's step back and talk about this together: ${esc(d.discussionQuestion)}”`, do:[`Take 2–3 answers, connect each one to a lesson from today, then move on.`]});
  add(10, {title:`Knowledge Check (${kc} questions)`, do:[`Trainees click <b>Continue to Knowledge Check</b> on the last slide. 70% marks the day complete ✓.`, `Below 70% is a “not yet”: they can still move on and retake it any time; their best score counts.`], watch:"Stop presenting while they answer, so no one reads answers off the shared screen."});
  add(5, {title:"Close", do:[`Ask everyone to send quick feedback with the 💬 Feedback button.`, `Up next: Lesson ${d.id+1<=DAYS.length ? `${d.id+1} — ${esc((DAYS.find(x=>x.id===d.id+1)||{}).title||"")}` : "certificates and wrap-up"}.`, `Click <b>■ End</b> in Presenter view.`]});
  add(20, {pre:true, title:"After the session", do:[
    `<b>Trainee Audit → View Detail → Day-by-Day Feedback</b>: review each trainee's ${ftName(d.id)} feedback, edit and <b>Send</b>.`,
    `Add a <b>🎯 Focus</b> item for anyone who needs one specific next step.`,
    `Check <b>Rankings</b> and the Knowledge Check column; schedule retakes for anyone under 70%.`,
    `Read <b>Trainee Feedback</b> for today and note one thing to change tomorrow.`]});
  const start = sopStartMin(), live = steps.filter(s=>!s.pre), liveMins = live.reduce((a,s)=>a+(s.to-s.from),0);
  const rows = steps.map(s=>{
    const from = s.pre && s.title==="Before trainees join" ? -15 : s.from - 15;
    const to = from + (s.to-s.from);
    const when = s.pre && s.title==="After the session" ? `After<small>≈20 min</small>` : (s.to===s.from ? `${sopClock(start, from)}<small>as teaching resumes</small>` : `${sopClock(start, from)}<small>${s.to-s.from} min</small>`);
    const cls = s.brk ? "brk" : (s.opt ? "opt" : "");
    return `<li><div class="sopf-time">${when}</div><div class="sopf-step ${cls}"><h4><span class="n"></span>${s.title}</h4><div class="sopf-rows">
      ${s.do && s.do.length ? `<div><b>Do</b><ul>${s.do.map(x=>`<li>${x}</li>`).join("")}</ul></div>` : ""}
      ${s.say ? `<div><b>Say</b><span>${s.say}</span></div>` : ""}
      ${s.watch ? `<div><b>Watch for</b><span>${esc(s.watch)}</span></div>` : ""}
    </div></div></li>`;
  }).join("");
  const endClock = sopClock(start, liveMins);
  return `<section class="card sopf">
    <div class="sopf-head"><div><div class="sopx-kicker">${ftName(d.id)} · How to run this session</div><h2>Run of show</h2></div>
      <label class="sopf-start">Session starts at <input type="time" value="${esc(state.sopStart||"09:00")}" onchange="setSopStart(this.value)"> <button class="btn btn-ghost btn-sm" onclick="window.print()">🖨 Print</button></label></div>
    <div class="sopf-meta"><span>⏱ About ${Math.round(liveMins/60*10)/10} hours live · ends ≈ ${endClock}</span><span>📚 ${n} topics</span><span>✔ ${qcs.length} Quick Checks</span>${lab?`<span>🧪 ${esc(lab.title)}</span>`:""}<span>📝 ${kc}-question Knowledge Check</span></div>
    <ol class="sopf-steps">${rows}</ol>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:12px 0 0;">Timings assume about 2½ minutes per topic. Built from the live portal content, so it updates automatically when topics are added in Content Studio. The detailed script for each day follows below.</p>
  </section>`;
}
function sopProgramFlow(){
  const days = DAYS.map(d=>{ const lab = relatedTools(d.id)[0]; return `<tr><td><b>${ftName(d.id)}</b></td><td>${esc(d.title)}</td><td>${d.lessons.length}</td><td>${lab?esc(lab.title):"—"}</td><td><button class="btn btn-ghost btn-sm" onclick="setSopDay(${d.id})">Run of show →</button></td></tr>`; }).join("");
  return `
    <section class="card sopf"><div class="sopx-kicker">Trainer reference · The whole program</div><h2 style="font-family:'Fraunces',Georgia,serif;color:var(--navy);font-size:26px;margin:4px 0 8px;">How to facilitate the LSH EA / PA Upskill Program</h2>
      <p style="font-size:14.5px;line-height:1.6;margin:0;max-width:85ch;">Ten live sessions, one realistic client (Elias Thorne), one rhythm every day: <b>teach → check → practice → debrief → assess → follow up</b>. This page is the big picture; open any day for its minute-by-minute run of show.</p></section>
    <div class="sopf-grid">
      <section class="card sopf-card"><h3>1 · Before the program</h3><ol>
        <li>Open <b>/version</b> on the portal: it should show the current build and <b>AI provider: Google Gemini</b>. If not, add <code>GEMINI_API_KEY</code> in Cloudflare.</li>
        <li>Sign in to <b>🛡 Admin</b>. In Trainee Audit set the certificate signatories and the daily-review setting.</li>
        <li>Send trainees the portal link. They register with name + batch code; <b>approve them in Trainee Audit</b>.</li>
        <li>Rehearse once: open Day 1 → <b>🖥 Presenter view</b>, share the slides window in a test Meet, step through a few slides.</li>
        <li>Try <b>👁 Switch View</b> (top bar) to see exactly what trainees see, then switch back.</li></ol></section>
      <section class="card sopf-card"><h3>2 · Kick-off (≈20 min, before Day 1)</h3><ol>
        <li>Admin → <b>🧭 Orientation</b> → <b>Present full screen</b>. It covers the roadmap, how a day works, live sessions, the dashboard, grading and ground rules.</li>
        <li>Share the <b>Blueprint PDF</b> (link on the Orientation page) as the take-home version.</li>
        <li>Everyone reads the <b>Client Profile</b> before Day 1 — it's graded against all program long.</li></ol></section>
      <section class="card sopf-card"><h3>3 · Every day, the same rhythm</h3><ol>
        <li><b>Before:</b> approvals, unlocks, open Presenter view (≈15 min early).</li>
        <li><b>Open:</b> recap + today's objectives (5 min).</li>
        <li><b>Teach:</b> topics in ~45-minute blocks with breaks; Quick Checks where they fall; one random task mid-way.</li>
        <li><b>Practice:</b> the day's Practice Lab, then a live debrief.</li>
        <li><b>Discuss:</b> the end-of-day question.</li>
        <li><b>Assess:</b> Knowledge Check (70% = day complete).</li>
        <li><b>Close:</b> feedback button, point trainees to the day\'s <b>📖 Lesson Notes</b> in Handouts (the full text behind the slides), preview tomorrow.</li></ol></section>
      <section class="card sopf-card"><h3>4 · Between sessions</h3><ul>
        <li>Send each trainee's <b>Day-by-Day Feedback</b> (Trainee Audit → View Detail).</li>
        <li>Set <b>🎯 Focus</b> items for anyone who needs a specific next step.</li>
        <li>Check <b>Rankings</b>, Knowledge Check scores and Missed tasks; schedule retakes under 70%.</li>
        <li>Reset <b>Practice Lab attempts</b> only for technical problems.</li>
        <li>Read <b>Trainee Feedback</b> and adjust the next session.</li></ul></section>
      <section class="card sopf-card"><h3>5 · Program close</h3><ul>
        <li>Certificates unlock when all 10 Knowledge Checks are passed (70%+); “With Distinction” at a 90%+ average.</li>
        <li>Check names in Trainee Audit — the certificate uses the registered name exactly.</li>
        <li>Generate each trainee's review (Rankings → AI review) and send final feedback.</li>
        <li>Export Trainee Feedback (CSV) for the program retrospective.</li></ul></section>
    </div>
    <section class="card sopf-card" style="margin-top:14px;"><h3>I want to… → go here</h3>
      <table class="log-table sopx-table sopf-map"><thead><tr><th>I want to…</th><th>Where</th></tr></thead><tbody>
        <tr><td>Share only the slides while I see my notes</td><td>Day → slides → <b>🖥 Presenter view</b></td></tr>
        <tr><td>See the notes, scripts and scenarios for each slide</td><td>Day → slides → <b>🖥 Presenter view</b> (PDF: Admin → SOP Reference)</td></tr>
        <tr><td>Show the day's plan to the room</td><td>Admin → SOP Reference → <b>🎤 Present</b></td></tr>
        <tr><td>Drop an unannounced task on trainees</td><td>Admin → <b>🎲 Random Tasks</b></td></tr>
        <tr><td>Approve, reset attempts, write feedback, set focus</td><td>Admin → <b>Trainee Audit</b> → View Detail</td></tr>
        <tr><td>See who is ahead or behind</td><td>Admin → <b>Rankings</b></td></tr>
        <tr><td>Add or improve lesson content</td><td>Admin → <b>Content Studio</b></td></tr>
        <tr><td>Read what trainees think of the program</td><td>Admin → <b>Trainee Feedback</b></td></tr>
        <tr><td>See the portal as a trainee does</td><td>Top bar → <b>👁 Trainee view</b></td></tr>
      </tbody></table></section>
    <section class="card sopf-card" style="margin-top:14px;"><h3>The 10 days</h3>
      <table class="log-table sopx-table sopf-map"><thead><tr><th>Day</th><th>Title</th><th>Topics</th><th>Practice Lab</th><th></th></tr></thead><tbody>${days}</tbody></table></section>`;
}
window.setSopStart = setSopStart;

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
  const kq = esc(k).replace(/'/g, "&#39;");
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
  const kq = esc(k).replace(/'/g, "&#39;");
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

/* ================= Dashboard day cards: clean cards, topics in a pop-up card =================
   A day card shows its day and title, Start and short buttons (as in the Foundational course). Its topics
   open in a pop-up card from "☰ Topics" (showDayTopics), grouped by section. */
(function(){
  if(typeof moduleCard !== "function" || moduleCard.__clean) return;
  const __card = moduleCard;
  moduleCard = function(d){
    const html = __card(d), t = document.createElement("template"); t.innerHTML = html.trim();
    const card = t.content.firstElementChild; if(!card) return html;
    card.querySelectorAll(".module-topic-list, .module-more").forEach(n=>n.remove());
    const body = card.querySelector(".module-body");   // the day's icon and what it covers fill the card
    if(body && d.theme) body.insertAdjacentHTML("beforeend", `<div class="module-theme">${esc(d.theme)}</div>`);
    const n = (d.lessons||[]).length, start = card.querySelector(".module-start-btn");
    if(n && start) start.insertAdjacentHTML("afterend", `<button type="button" class="btn btn-ghost btn-sm module-finish-btn module-topics-btn" onclick="event.stopPropagation(); showDayTopics(${d.id})">☰ Topics <span>· ${n}</span></button>`);
    // Topics and Finish sit side by side under Start, as two quiet buttons
    const small = [...card.querySelectorAll(".module-finish-btn")];
    if(small.length > 1){ const row = document.createElement("div"); row.className = "mc-row"; small[0].before(row); small.forEach(x=>row.appendChild(x)); }
    card.classList.add("mc-clean");
    return card.outerHTML;
  };
  moduleCard.__clean = true;
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

/* ================= Lesson slides: the key line on the slide, the full text in the Handouts =================
   A slide shows each point's key line (slideBrief: its first sentence, without asides in brackets, cut at a
   dash or colon when still long); Go Deeper moves off the slide. The full text of every topic, as written in
   js/days/dayN/lessons.js (principles, steps, best practices and pitfalls, Go Deeper), is each day's
   📖 Lesson Notes in Handouts (Preview and PDF). "📖 Full notes" on a slide opens that topic there. */
(function(){
  function slideBrief(t){
    let x = String(t || "").replace(/\s+/g, " ").trim();
    const words = s => s.split(" ").filter(Boolean).length;
    const end = s => /[.!?]["”’']?$/.test(s) ? s : s.replace(/[,;:\s—–-]+$/, "") + ".";
    x = x.replace(/\s*\((?:[^()"]{3,})\)(?=[\s.,;:!?]|$)/g, "").replace(/\s+([.,;:!?])/g, "$1");
    const re = /[.!?](?=["”’']?\s+[A-Z0-9"“'‘])/g; let m;
    while((m = re.exec(x))){
      const head = x.slice(0, m.index + 1);
      if(head.length < 25 || /\b(e\.g|i\.e|vs|etc|Mr|Mrs|Ms|Dr|No|St|Inc|approx)\.$/i.test(head)) continue;
      x = head; break;
    }
    if(words(x) > 16){ const k = x.search(/\s[—–]\s/); if(k > 0 && words(x.slice(0, k)) >= 4) x = end(x.slice(0, k)); }
    if(words(x) > 18){ const k = x.indexOf(": "); if(k > 0 && words(x.slice(0, k)) >= 4) x = end(x.slice(0, k)); }
    if(words(x) > 18){ const k = x.indexOf("; "); if(k > 0 && words(x.slice(0, k)) >= 5) x = end(x.slice(0, k)); }
    return end(x);
  }
  window.slideBrief = slideBrief;
  const briefs = a => Array.isArray(a) ? a.map(x => typeof x === "string" ? slideBrief(x) : x) : a;

  if(typeof renderLessonCard === "function" && !renderLessonCard.__brief){
    const __card = renderLessonCard;
    renderLessonCard = function(l, i, d, u, part){
      if(!l || l.__preview || !d) return __card.apply(this, arguments);
      const s = Object.assign({}, l);
      // "This connects directly to …" lines point elsewhere in the program: they stay in the notes, off the slide
      const own = a => { const k = Array.isArray(a) ? a.filter(x => typeof x !== "string" || !/^This (connects|builds|links|ties) (directly |back )?(to|on)\b/i.test(x.trim())) : a; return k && k.length ? k : a; };
      if(l.fourPart) s.fourPart = Object.assign({}, l.fourPart, {corePrinciples: briefs(own(l.fourPart.corePrinciples)), howTo: briefs(l.fourPart.howTo), bestPractices: briefs(l.fourPart.bestPractices)});
      else{
        s.b = briefs(l.b); s.howTo = briefs(l.howTo);
        if(Array.isArray(l.processSteps)) s.processSteps = l.processSteps.map(p => Object.assign({}, p, p && typeof p.desc === "string" ? {desc: slideBrief(p.desc)} : {}));
      }
      const key = d.id + "::" + l.h, extra = LESSON_EXTRA_LEARNING[key];   // Go Deeper lives in the Lesson Notes
      if(extra) delete LESSON_EXTRA_LEARNING[key];
      let html; try{ html = __card.call(this, s, i, d, u, part); } finally { if(extra) LESSON_EXTRA_LEARNING[key] = extra; }
      return html + `<div class="ln-more"><button type="button" onclick="openLessonNotes(${d.id}, ${esc(JSON.stringify(l.h))})">📖 Full notes for this topic</button><span>${ftName(d.id)} Lesson Notes · Handouts</span></div>`;
    };
    renderLessonCard.__brief = true;
  }

  /* ---------- 📖 Lesson Notes: the full text, per day ---------- */
  const strs = a => (Array.isArray(a) ? a : []).filter(x => typeof x === "string" && x.trim());
  function topicNotes(d, l){
    const fp = l.fourPart || {};
    const extra = LESSON_EXTRA_LEARNING[d.id + "::" + l.h];
    const steps = strs(fp.howTo).length ? strs(fp.howTo) : strs(l.howTo).length ? strs(l.howTo)
      : (Array.isArray(l.processSteps) ? l.processSteps.map(p => p && [p.label, p.desc].filter(Boolean).join(": ")).filter(Boolean) : []);
    return {
      h: l.h, section: l.section || "",
      principles: strs(fp.corePrinciples).length ? strs(fp.corePrinciples) : strs(l.b),
      steps,
      practices: strs(fp.bestPractices),
      callout: l.callout && l.callout.text ? String(l.callout.text) : "",
      deeper: extra ? {t: extra.t, p: strs(extra.p)} : null
    };
  }
  const dayNotes = d => (d.lessons || []).filter(l => !l.__extra).map(l => topicNotes(d, l));
  const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function notesHtml(d){
    let sec = null;
    return dayNotes(d).map((t, k) => {
      const head = t.section && t.section !== sec ? `<div class="ln-sec">${esc(sec = t.section)}</div>` : "";
      const list = (label, a, ol) => a.length ? `<div class="ln-part"><b>${label}</b><${ol ? "ol" : "ul"}>${a.map(x => `<li>${esc(x)}</li>`).join("")}</${ol ? "ol" : "ul"}></div>` : "";
      return `${head}<div class="ln-topic" id="ln-${slug(t.h)}"><h4><span>${k + 1}</span>${esc(t.h)}</h4>
        ${list("Core principles", t.principles)}${list("Step by step", t.steps, true)}${list("Best practices & pitfalls", t.practices)}
        ${t.callout ? `<p class="ln-callout">${esc(t.callout)}</p>` : ""}
        ${t.deeper ? list("Go deeper — " + esc(t.deeper.t), t.deeper.p) : ""}</div>`;
    }).join("");
  }
  function previewLessonNotes(day, topic){
    const d = DAYS.find(x => x.id === day); if(!d) return;
    document.querySelectorAll(".overlay.ln-overlay").forEach(o => o.remove());
    const overlay = document.createElement("div"); overlay.className = "overlay topics-overlay ln-overlay";
    overlay.innerHTML = `<div class="card topics-modal ho-modal"><div class="module-head topics-modal-head"><div class="mh-day">${ftName(day)} · Lesson Notes · ${(d.lessons || []).length} topics</div><div class="mh-title">📖 ${esc(d.title)}</div>
      <button type="button" class="topics-close" onclick="this.closest('.overlay').remove()">✕</button></div>
      <div class="ho-body ln-body"><p class="ho-intro">The full text of every topic on ${ftName(day)}. The slides show the key lines; this is the complete version to read, study and keep.</p>${notesHtml(d)}</div>
      <div class="topics-modal-foot"><button class="btn btn-ghost btn-sm" onclick="this.closest('.overlay').remove()">Close</button>
        <button class="btn btn-primary btn-sm" onclick="downloadLessonNotesPdf(${day})">⬇ Download PDF</button></div></div>`;
    overlay.addEventListener("click", e => { if(e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    if(topic){ const el = overlay.querySelector("#ln-" + slug(topic)); if(el){ el.classList.add("ln-hit"); setTimeout(() => el.scrollIntoView({block:"start"}), 30); } }
  }
  // From a slide: the notes open over the lesson, at that topic.
  function openLessonNotes(day, topic){ previewLessonNotes(day, topic); }
  async function downloadLessonNotesPdf(day){
    const d = DAYS.find(x => x.id === day); if(!d) return;
    if(!(await ensureJsPdf())){ toast("Couldn't load the PDF tools — try again."); return; }
    const { jsPDF } = window.jspdf;
    const doc = safeDoc(new jsPDF({unit:"pt", format:"letter"}));
    drawPdfHeader(doc, `${ftName(day)} Lesson Notes`, d.title);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), X = 54;
    let y = 118, sec = null;
    const need = h => { if(y + h > H - 50){ doc.addPage(); y = 60; } };
    const para = (t, o = {}) => {
      doc.setFont("helvetica", o.bold ? "bold" : "normal"); doc.setFontSize(o.size || 10); doc.setTextColor(...(o.color || [27,30,46]));
      const ind = o.indent || 0, lines = doc.splitTextToSize(t, W - X * 2 - ind);
      lines.forEach((w, n) => { need(14); if(n === 0 && o.bullet) doc.text(o.bullet, X + ind - 12, y); doc.text(w, X + ind, y); y += (o.lh || 13.5); });
    };
    dayNotes(d).forEach((t, k) => {
      if(t.section && t.section !== sec){ sec = t.section; need(34); y += 6; para(sec.toUpperCase(), {bold:true, size:9.5, color:[181,101,31]}); y += 2; }
      need(40); y += 4; para(`${k + 1}. ${t.h}`, {bold:true, size:12, color:[38,43,69], lh:16});
      const part = (label, a, ol) => { if(!a.length) return; need(28); para(label, {bold:true, size:9.5, color:[91,97,120]}); a.forEach((x, n) => para(x, {indent:16, bullet: ol ? (n + 1) + "." : "•"})); y += 3; };
      part("Core principles", t.principles); part("Step by step", t.steps, true); part("Best practices & pitfalls", t.practices);
      if(t.callout) para(t.callout, {indent:16, color:[91,97,120]});
      if(t.deeper) part("Go deeper — " + t.deeper.t, t.deeper.p);
      y += 6;
    });
    const pages = doc.getNumberOfPages();
    for(let p = 1; p <= pages; p++){ doc.setPage(p); doc.setFontSize(8); doc.setTextColor(110,116,140); doc.text(`LSH EA / PA Upskill Program · ${ftName(day)} Lesson Notes · page ${p} of ${pages}`, X, H - 28); }
    doc.save(`LSH_Day${day}_Lesson_Notes.pdf`);
    toast("Lesson Notes downloaded.");
  }
  Object.assign(window, {previewLessonNotes, openLessonNotes, downloadLessonNotesPdf});

  // Handouts: the Lesson Notes for every day, above the templates.
  if(typeof renderHandouts === "function" && !renderHandouts.__notes){
    const __rh = renderHandouts;
    renderHandouts = function(){
      const html = __rh.apply(this, arguments);
      const q = (state.hoQuery || "").toLowerCase();
      const days = DAYS.filter(d => !q || ("lesson notes " + d.title).toLowerCase().includes(q) || String(d.id) === q);
      const cur = state.traineeId && typeof nextDayId === "function" ? nextDayId() : 1;
      const block = days.length ? `<h2 class="ln-h">📖 Lesson Notes <span>The full text of every topic, day by day. The slides show the key lines; read the complete version here.</span></h2>
        <div class="ho-grid ln-grid">${days.map(d => `<div class="card ho-card ln-card ${d.id === cur ? "current" : ""}">
          <div class="ho-top"><div class="ho-icon">📖</div><div><div class="ho-day">${ftName(d.id)}${d.id === cur ? " · you're here" : ""}</div><h4>${esc(d.title)}</h4><span>Lesson Notes · ${(d.lessons || []).length} topics</span></div></div>
          <div class="ho-actions"><button class="btn btn-primary btn-sm" onclick="previewLessonNotes(${d.id})">Read</button><button class="btn btn-ghost btn-sm" onclick="downloadLessonNotesPdf(${d.id})">⬇ PDF</button></div>
        </div>`).join("")}</div>
        <h2 class="ln-h">🧰 Templates &amp; Checklists</h2>` : "";
      return html.replace('<div class="ho-grid">', block + '<div class="ho-grid">');
    };
    renderHandouts.__notes = true;
  }

  const st = document.createElement("style"); st.id = "lesson-notes"; st.textContent = `
.ln-more{display:flex;align-items:center;justify-content:center;gap:10px;margin:8px 0 0;font-size:12px;color:var(--ink-soft);}
.ln-more button{border:1px solid #E3E6EE;background:#fff;color:var(--navy);font-weight:700;font-size:12.5px;border-radius:999px;padding:5px 14px;cursor:pointer;}
.ln-more button:hover{background:#F3F4F8;}
.ln-h{color:var(--navy);font-size:17px;margin:18px 0 10px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}
.ln-h span{font-size:13px;font-weight:500;color:var(--ink-soft);}
.ln-grid{margin-bottom:6px;}
.ln-card .ho-actions{margin-top:10px;}
.ln-body .ln-sec{margin:18px 0 4px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--orange-deep);}
.ln-topic{border-top:1px solid #ECEEF4;padding:10px 0 4px;scroll-margin-top:12px;}
.ln-topic.ln-hit{background:#FFF7EF;border-radius:10px;padding:10px 12px 4px;margin:0 -12px;}
.ln-topic h4{margin:4px 0 6px !important;display:flex;gap:8px;align-items:baseline;font-size:16.5px !important;}
.ln-topic h4 span{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--orange-deep);}
.ln-part{margin:6px 0;} .ln-part b{display:block;font-size:12px;color:#5B6178;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
.ln-part ul,.ln-part ol{margin:2px 0 6px 20px;padding:0;} .ln-part li{font-size:13.5px;line-height:1.5;margin:3px 0;color:#2A2E40;}
.ln-callout{font-size:13px;color:#5B6178;font-style:italic;margin:4px 0 8px;}
@media(max-width:760px){ .ln-more span{display:none;} }
`; document.head.appendChild(st);
  if(typeof render === "function" && typeof state !== "undefined" && (state.view === "day" || state.view === "handouts")){ try{ render(); }catch(e){} }
})();

/* ================= Orientation / Blueprint, SOP Reference and handouts follow today's platform =================
   • Orientation (and the Blueprint PDF built from it): how slides show key lines with 📖 Full notes, the dashboard
     as it is now (day cards filling the screen, the scores band under them), Handouts with the Lesson Notes.
   • Admin → SOP Reference: each day's session plan ends with the take-home Lesson Notes.
   • Handouts & Templates: Days 1–4 follow the days' topics now (gatekeeping and the Three C's on Day 1, inbox
     triage and AI on Day 2, travel and court deadlines on Day 3, prioritizing the day on Day 4). */
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

  if(typeof sopLiveSections === "function" && !sopLiveSections.__notes){
    const __s = sopLiveSections;
    sopLiveSections = function(d){
      const sec = __s.apply(this, arguments);
      const plan = sec.find(x => x.type === "table" && /^Session plan/.test(x.h));
      if(plan && d) plan.rows.push(["Take-home reading", "—", `Handouts → 📖 ${ftName(d.id)} Lesson Notes: the full text of every topic (the slides show the key lines). Trainees read it after the session or download the PDF.`]);
      return sec;
    };
    sopLiveSections.__notes = true;
  }

  if(typeof HANDOUT_CONTENT === "object" && !HANDOUT_CONTENT.__now){
    const H = HANDOUT_CONTENT, old2 = H[2], old3 = H[3];
    const pick = (h, re) => ((h && h.blocks) || []).filter(b => re.test(b.h));
    H[1] = Object.assign({}, H[1], {title:"Command Hierarchy, Gatekeeping & BLUF Checklist", kind:"Checklist + scripts",
      intro:"Day 1 at your desk: who decides what, how to screen and redirect without alienating anyone, and how to write so the bottom line comes first.",
      blocks: H[1].blocks.concat(pick(old3, /./), pick(old2, /Three C/))});
    H[2] = {title:"Inbox Triage & Safe AI Use Card", icon:"📥", kind:"Printable card",
      intro:"Run the inbox as a control system: tier every item, brief the executive once a morning, and clear every AI use against the firm's rules first.",
      blocks:[
        {type:"table", h:"The Priority Matrix", headers:["Tier","What lands here","Your move"], rows:[
          ["1 · Immediate","Legal deadlines, high-value clients, media, financial approvals, crisis comms","Tell the executive now — no exceptions"],
          ["2 · Strategic","Revenue opportunities, partnerships, board comms, vendor negotiations","Draft a response within 2–4 hours"],
          ["3 · Routine","Newsletters, internal FYIs, non-urgent scheduling","Batch into one daily block"],
          ["4 · Archive / delegate","Promotions, automated notices, requests another team owns","File or forward — no executive time"]], blank:0},
        {type:"checklist", h:"Tiering rules", items:["Classify every new item before acting on it","Not sure? Treat it as Tier 1 until you confirm otherwise","Re-tier when the facts change (a vendor email that mentions a missed payment is now Tier 1)"]},
        {type:"template", h:"Morning briefing (same time every day)", lines:["Needs you today: ______________________________ by ______","Needs you today: ______________________________ by ______","Handled / in progress: ______________________________","Handled / in progress: ______________________________","Heads-up (this week): ______________________________"]},
        {type:"checklist", h:"Before any AI use", items:["I know this attorney's and this matter's AI preference","The task doesn't decide legal judgment, case strategy or client representation","Nothing privileged or confidential goes into the tool without approval","I'll review every word of the output before it's used","Unsure? I ask first"]}]};
    H[3] = {title:"Travel & Court-Deadline Checklist", icon:"🧳", kind:"Checklist",
      intro:"Write it once, reuse it every trip — and count every court deadline from the source, with a second person checking it.",
      blocks:[
        {type:"checklist", h:"Documents (check first)", items:["Passport valid 6+ months beyond the travel dates","Visa / entry requirements checked for this trip, not a past one","Copies of passport and IDs stored securely"]},
        {type:"checklist", h:"Bookings & logistics", items:["Flights, hotel and ground transport line up at every leg","Car pickup confirmed: time, place, driver contact","Buffer between connections","Loyalty numbers applied to every booking","One-page itinerary sent (not scattered confirmations)"]},
        {type:"checklist", h:"Contingency", items:["Backup flight / route identified for the key leg","The trip's hard deadline (hearing, closing) noted","Contingency contact at the destination","Health & safety prep for this destination"]},
        {type:"template", h:"Court deadline count", lines:["Trigger event & date (with source): ______________________________","Rule & kind of days (calendar / court): ______________________________","Count starts the day after the trigger → last day: __________","Weekend / court holiday? Moved to: __________   Service by mail +3? ____","Docketed with the rule cited · reminders at 14 / 7 / 2 days: [ ]","Second-person check by: __________"]}]};
    const sched = pick(old2, /top 3|Hour by hour/);
    H[4] = Object.assign({}, H[4], {title:"Prioritize the Day & Client Data Cleanup", kind:"Worksheet + spreadsheet template",
      intro:"Plan the day's top three and protect the time for them, then clean contact data in order: de-duplicate → standardize → filter → sort.",
      blocks: sched.concat(H[4].blocks)});
    Object.defineProperty(H, "__now", {value:true});
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

