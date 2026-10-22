/* ============================================================
   Every page fits one screen.

   The window never scrolls. The top bar and the footer line keep their place, and the page's
   body (<main>) takes exactly the height left between them. A page with more in it than fits
   — Case Documents, the Practice Lab, the Training Tools, a handout, the Facilitator Guide —
   scrolls inside that body, so the page itself is always one screen tall and the top bar and
   footer never move. The lesson pages don't scroll at all: the slide is sized to the room the
   page has left (the course's own slide fitting, in its *-updates.js), and the dashboard
   already fills the screen.

   Only on a window with room for it (at least 1001 x 480): a phone and a tiny window keep the
   ordinary page scroll, the way the lesson slides already do under 1000px wide — there the top
   bar alone wraps to three rows, and a one-screen body would leave almost nothing for the page.

   Because the window no longer scrolls, window.scrollTo() and window.scrollY would silently
   do nothing — the page's code uses both to send a page back to the top and to keep an admin
   table's place across a redraw. They are pointed at the page body here, so every caller keeps
   working and nothing else in the app has to change.

   A course that sizes its lesson slides itself (deckRescale or fitSlideFrame in its
   *-updates.js) keeps doing that, taking the page body's bottom as its floor. A course that
   doesn't gets the plain lesson fit at the end of this file: the lesson stage is capped to the
   room the page has left, so the slide and its Previous / Next bar stay on the screen and the
   slide scrolls inside its own card instead of pushing the buttons off the bottom.

   The same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training,
   propertydamageclaimstraining, medsumanddemandtraining, Foundational-Training); change it in
   Loaded last, after js/lsh-topbar.js.
   ============================================================ */
(function(){
const MIN_W = 1001, MIN_H = 480;   // under this the page scrolls as it always did

const st = document.createElement("style"); st.id = "lsh-one-screen"; st.textContent = `
body.one-screen{overflow:hidden;}
body.one-screen #app{height:100vh;height:100dvh;min-height:0;overflow:hidden;}
body.one-screen #app > .topbar, body.one-screen #app > .footer-note{flex:0 0 auto;}
body.one-screen #app > main{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;
  overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:18px;}
/* the footer line stays on the screen, so it is kept slim */
body.one-screen #app > .footer-note{padding:8px 24px 12px;}
`;
document.head.appendChild(st);

const on = ()=>document.body.classList.contains("one-screen");
const pageBody = ()=>document.querySelector("#app > main");
const apply = ()=>{ document.body.classList.toggle("one-screen", innerWidth >= MIN_W && innerHeight >= MIN_H); };
apply();
window.addEventListener("resize", apply);

/* The page body scrolls instead of the window, so the page's own scrollTo / scrollY work on it. */
const nativeScrollTo = window.scrollTo.bind(window);
window.scrollTo = function(a, b){
  const m = on() && pageBody();
  if(!m) return nativeScrollTo.apply(window, arguments);
  const o = (a && typeof a === "object") ? a : {top:Number(b) || 0, left:Number(a) || 0};
  try{ m.scrollTo({top:o.top || 0, left:o.left || 0, behavior:o.behavior || "auto"}); }
  catch(e){ m.scrollTop = o.top || 0; }
};
const native = Object.getOwnPropertyDescriptor(Window.prototype, "scrollY");
["scrollY", "pageYOffset"].forEach(k=>{
  try{
    Object.defineProperty(window, k, {configurable:true, get(){
      const m = on() && pageBody();
      return m ? m.scrollTop : (native && native.get ? native.get.call(window) : 0);
    }});
  }catch(e){}
});
})();

/* ---------- A lesson fits the screen, in a course with no slide sizing of its own ----------
   The stage is measured from where it starts down to the bottom of the page's body, so the top
   bar, the day header and whatever else the page puts above it are all accounted for; the slide
   takes the room that is left and scrolls inside its own card. A course that sizes its slides
   itself (deckRescale in EA-PA-TRAINING and Foundational-Training, fitSlideFrame in
   Case-Management-Training) does this its own way, so this part stands aside. */
(function(){
  if(typeof window.deckRescale === "function" || typeof window.fitSlideFrame === "function") return;

  const s = document.createElement("style"); s.id = "lsh-lesson-onescreen"; s.textContent = `
@media (min-width:1001px) and (min-height:620px){
  .lesson-stage:not(:fullscreen){display:flex;flex-direction:column;max-height:var(--ls-max,none);}
  .lesson-stage:not(:fullscreen) .stage-body{flex:1 1 auto;min-height:0;}
  .lesson-stage:not(:fullscreen) #lessonSlideWrap{min-height:0 !important;max-height:none !important;height:100%;overflow:auto;}
  .lesson-stage:not(:fullscreen) .slide-nav{flex:0 0 auto;}
}`;
  document.head.appendChild(s);

  const GAP = 16, LEAST = 360;
  let pending = 0;
  function fit(){
    pending = 0;
    const stage = document.getElementById("lessonStage");
    if(!stage) return;
    if(innerWidth < 1001 || innerHeight < 620 || document.fullscreenElement){
      stage.style.removeProperty("--ls-max"); return;
    }
    const page = stage.closest("main");
    const floor = (page && document.body.classList.contains("one-screen"))
      ? page.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(page).paddingBottom) || 0)
      : innerHeight;
    stage.style.setProperty("--ls-max", Math.max(LEAST, floor - stage.getBoundingClientRect().top - GAP) + "px");
  }
  function soon(){ if(!pending) pending = requestAnimationFrame(fit); }

  addEventListener("resize", soon);
  addEventListener("fullscreenchange", soon);
  document.addEventListener("DOMContentLoaded", soon);
  addEventListener("load", soon);
  // each slide is drawn into the same page, so re-measure when the app replaces it
  new MutationObserver(soon).observe(document.getElementById("app") || document.body, {childList:true, subtree:true});
})();
