/* ============================================================
   ✨ The lesson decks in the LSH Training Portal's design
   (the LSH Academy Index, LSH Elev8 and LSH Atlas): design only. Not a word, picture, slide, link, video or saved
   place changes; the slides keep the size fitPages() (js/ft-slides.js) gives them.
     • the lesson panel (#lessonStage) wears the LSH frame: a thick rounded outline, navy along the top fading to gold
       at the bottom, around a deep-navy face (the American-flag photo kept faintly under it), with soft elevation;
     • each deck page sits on the panel with a fine gold hairline and a deep, soft shadow (no size change);
     • a topic divider is a deep-navy plate in the clean sans (no serif): its "Lesson N of 8 · …" line as a mono
       pill tag, "Topic N of M" as a mono tag, the title in heavy Inter with a short orange-to-gold rule under it;
     • the Previous / Next bar is a crisp white console: white outline buttons, one dark-navy primary (Next →,
       📋 Classroom Activity, ✅ End of Module) with an orange underline, a light "Next up" card with a mono tag,
       and the progress dots as slim rounded bars.
   Only the lessons drawn from deck pages (body.ft-fit); the Orientation's own design (body.ft-orient), the Activity
   decks (main.main-ftdd) and the slides window (#audienceRoot) are left as they are. Hover movement only when the
   viewer hasn't asked for reduced motion. Loaded after js/ft-theme.js, whose colours it paints over.
   ============================================================ */
(function(){
  if(document.getElementById("ft-deck-elite")) return;
  const S = "body.ft-fit:not(.ft-orient) #lessonStage";
  const FRAME = "linear-gradient(180deg,#1E2340 0%,#2c3360 30%,#a8692f 78%,#DB8437 100%)";
  const css = document.createElement("style"); css.id = "ft-deck-elite";
  css.textContent = `
/* the panel: the LSH frame around a deep-navy face */
${S}.lesson-stage:not(:fullscreen){
  border:4px solid transparent !important;border-radius:24px !important;
  background:
    radial-gradient(110% 70% at 100% 100%, rgba(219,132,55,.16) 0%, transparent 55%) padding-box,
    radial-gradient(90% 60% at 0% 0%, rgba(92,104,170,.22) 0%, transparent 60%) padding-box,
    linear-gradient(180deg, rgba(20,24,46,.93) 0%, rgba(30,35,64,.90) 100%) padding-box,
    url("/img/bg-flag-law.webp") center / cover no-repeat padding-box,
    ${FRAME} border-box !important;
  box-shadow:0 34px 64px -34px rgba(12,15,34,.8), 0 10px 22px -12px rgba(12,15,34,.45), inset 0 1px 0 rgba(255,255,255,.06) !important;}
/* (the frame's 4px taken back from the panel's padding, so the slides keep their size) */
@media (min-width:761px){ ${S}.lesson-stage:not(:fullscreen){padding:11px 12px 11px !important;} }
@media (max-width:760px){ ${S}.lesson-stage:not(:fullscreen){padding:10px 8px !important;} }
${S}.lesson-stage:fullscreen{
  background:
    radial-gradient(110% 70% at 100% 100%, rgba(219,132,55,.14) 0%, transparent 55%),
    radial-gradient(90% 60% at 0% 0%, rgba(92,104,170,.22) 0%, transparent 60%),
    linear-gradient(180deg, #141830 0%, #1E2340 100%) !important;}
/* the deck page: a fine gold hairline and soft elevation, at the size it already has */
${S} .cs-page img{border-radius:14px !important;
  box-shadow:0 0 0 1px rgba(240,192,138,.38), 0 0 0 5px rgba(255,255,255,.04), 0 28px 54px -26px rgba(0,0,0,.75), 0 8px 16px -10px rgba(0,0,0,.45) !important;}

/* a topic divider: deep navy, the clean sans, mono tags */
${S} .topic-divider{
  background:
    radial-gradient(80% 90% at 100% 100%, rgba(219,132,55,.22) 0%, transparent 60%),
    radial-gradient(70% 70% at 0% 0%, rgba(92,104,170,.32) 0%, transparent 60%),
    linear-gradient(160deg, #232850 0%, #1E2340 55%, #161a33 100%) !important;
  border:1px solid rgba(240,192,138,.30);border-radius:18px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 28px 54px -26px rgba(0,0,0,.75), 0 8px 16px -10px rgba(0,0,0,.45);}
${S} .topic-divider::before{height:4px !important;background:linear-gradient(90deg, transparent 0%, #DB8437 22%, #F0C08A 50%, #DB8437 78%, transparent 100%) !important;}
${S} .topic-divider .td-kicker{display:inline-block;align-self:center;max-width:100%;font:700 13px/1.35 'IBM Plex Mono',monospace;letter-spacing:.14em;
  color:#F4C68F;background:rgba(240,192,138,.08);border:1px solid rgba(240,192,138,.45);border-radius:999px;padding:6px 16px;}
${S} .topic-divider .td-num{font:700 13.5px/1.2 'IBM Plex Mono',monospace;letter-spacing:.18em;color:rgba(255,255,255,.74);margin:22px 0 12px;}
${S} .topic-divider h2.td-title{font-family:'Inter',system-ui,sans-serif !important;font-weight:800 !important;letter-spacing:-.022em;line-height:1.1;color:#fff;}
${S} .topic-divider h2.td-title::after{content:"";display:block;width:72px;height:4px;margin:20px auto 0;border-radius:4px;background:linear-gradient(90deg,#DB8437,#F0C08A);}

/* the Previous / Next bar: a crisp white console */
${S}:not(:fullscreen) > .slide-nav{
  background:linear-gradient(180deg,#ffffff 0%,#f5f7fb 100%) !important;backdrop-filter:none !important;
  border:1px solid rgba(30,35,64,.10) !important;border-radius:16px !important;
  box-shadow:inset 0 1px 0 #fff, 0 18px 32px -22px rgba(6,8,22,.75), 0 3px 8px -4px rgba(6,8,22,.35) !important;}
${S} > .slide-nav .btn{font-family:'Inter',system-ui,sans-serif;font-weight:700;letter-spacing:.005em;border-radius:10px !important;}
${S} > .slide-nav .btn-ghost, ${S} > .slide-nav > .nav-tools .btn-navy{
  background:#fff !important;color:#1E2340 !important;border:1px solid #D3D9E6 !important;
  box-shadow:inset 0 1px 0 #fff, 0 1px 2px rgba(30,35,64,.08) !important;}
${S} > .slide-nav .btn-ghost:hover, ${S} > .slide-nav > .nav-tools .btn-navy:hover{background:#F3F5FA !important;border-color:#1E2340 !important;}
${S} > .slide-nav > .nav-tools #narrBtn.on{background:#1E2340 !important;color:#fff !important;border-color:#1E2340 !important;}
${S} > .slide-nav .btn-primary{
  background:linear-gradient(180deg,#2a3058 0%,#1E2340 100%) !important;color:#fff !important;border:1px solid #151a33 !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12), inset 0 -2px 0 #DB8437, 0 10px 18px -10px rgba(30,35,64,.85) !important;}
${S} > .slide-nav .btn-primary:hover{background:linear-gradient(180deg,#343b6b 0%,#262c52 100%) !important;}
${S} > .slide-nav .btn:focus-visible{outline:3px solid #DB8437;outline-offset:2px;}
${S} > .slide-nav > .nav-tools .audio-rate{border:1px solid #D3D9E6 !important;border-radius:10px !important;font:700 13px 'Inter',system-ui,sans-serif !important;color:#1E2340 !important;background:#fff !important;}
/* "Next up": a light card with a mono tag */
${S} > .slide-nav > .ftr-nextup{
  background:linear-gradient(180deg,#F7F8FC 0%,#EEF1F8 100%) !important;color:#1E2340 !important;
  border:1px solid #D3D9E6 !important;border-radius:12px !important;box-shadow:inset 0 1px 0 #fff !important;}
${S} > .slide-nav > .ftr-nextup b{font:700 10.5px/1.1 'IBM Plex Mono',monospace !important;letter-spacing:.16em;color:#A4561A !important;}
${S} > .slide-nav > .ftr-nextup .ftr-nextup-t{color:#1E2340 !important;font-weight:800;}
/* the progress dots: slim rounded bars */
${S} .slide-dots-nav .slide-dot{height:6px !important;border-radius:999px !important;background:#D9DEE9 !important;}
${S} .slide-dots-nav .slide-dot.visited{background:#6B74A8 !important;}
${S} .slide-dots-nav .slide-dot.active{background:linear-gradient(90deg,#DB8437,#F0B070) !important;box-shadow:0 0 0 2px rgba(219,132,55,.22);}
/* full screen: the bar sits on the navy, so its outline buttons stay white */
${S}:fullscreen > .slide-nav > .ftr-nextup{background:rgba(255,255,255,.96) !important;}
${S}:fullscreen > .slide-nav .btn-primary{box-shadow:0 0 0 1px rgba(255,255,255,.32), inset 0 -2px 0 #DB8437, 0 10px 18px -10px rgba(0,0,0,.7) !important;}

@media (max-width:760px){
  ${S}.lesson-stage:not(:fullscreen){border-width:3px !important;border-radius:18px !important;}
  ${S} .cs-page img{border-radius:10px !important;}
  ${S} .topic-divider .td-kicker{font-size:11.5px;letter-spacing:.1em;padding:5px 12px;border-radius:12px;}
}
@media (prefers-reduced-motion:no-preference){
  ${S} > .slide-nav .btn{transition:background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .15s ease;}
  ${S} > .slide-nav .btn:not([disabled]):hover{transform:translateY(-1px);}
}
@media (prefers-reduced-motion:reduce){
  ${S} > .slide-nav .btn, ${S} .slide-dot{transition:none !important;}
}`;
  document.head.appendChild(css);
})();
