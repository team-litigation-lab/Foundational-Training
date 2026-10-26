/* ============================================================
   📐 The platform at the screen's own size
   Loaded last, after js/lsh-one-screen.js. The slides (lessons, orientation, Activity decks) and the 📚 Dashboard already
   size themselves to the room they have. Everything else was drawn at one fixed size: small on a large monitor, with half
   the screen empty, and spilling over on a laptop. Here the rest follows the screen too, in proportion to a 1440 × 860
   screen (the size the pages are laid out for):
     • the top bar and the footer line, on every page;
     • the ordinary pages (🛠 Practice Lab, ✍️ Knowledge Check, 📂 My Pages, 🎯 Focus …): their content, inside the page body.
   The scale is --ft-s, between 0.85 and 1.45 (an ordinary page a little taller than the screen a little less: fitPage), set again whenever the window changes size. CSS zoom keeps each page's own
   layout: nothing moves, it is only larger or smaller. Pages that fit themselves (the slides, the Dashboard, the
   calendar simulator, the Knowledge Games) are left to do so. A phone or a small window (under 1001 px wide, where the
   page scrolls as usual) keeps 1.
   ============================================================ */
(function(){
const BASE_W = 1440, BASE_H = 860, MIN = 0.85, MAX = 1.45;
const st = document.createElement("style"); st.id = "ft-screen-fit"; st.textContent = `
#app > .topbar, #app > .footer-note{zoom:var(--ft-s,1);}
#app > main:not(.main-dash):not(.main-ftdd):not(.main-calsim):not(.main-kg):not(:has(#lessonStage, #lessonSlideWrap, .lesson-stage)) > *{zoom:var(--ft-page-s,var(--ft-s,1));}
`;
document.head.appendChild(st);
function fit(){
  const s = innerWidth < 1001 ? 1 : Math.max(MIN, Math.min(MAX, innerWidth / BASE_W, innerHeight / BASE_H));
  const v = s.toFixed(3);
  if(document.documentElement.style.getPropertyValue("--ft-s") !== v){
    document.documentElement.style.setProperty("--ft-s", v);
    // the slides and the Dashboard measure the room left under the top bar: let them measure again
    requestAnimationFrame(() => dispatchEvent(new Event("resize")));
  }
}
/* An ordinary page a little taller than the screen is drawn a little smaller, so it fits without scrolling (down to 0.8);
   a long one (✍️ Knowledge Check's questions) keeps the screen's scale and scrolls in the page body as before. */
const FLOW = "#app > main:not(.main-dash):not(.main-ftdd):not(.main-calsim):not(.main-kg):not(:has(#lessonStage, #lessonSlideWrap, .lesson-stage))";
function fitPage(){
  const m = document.querySelector(FLOW); if(!m) return;
  m.style.removeProperty("--ft-page-s");
  if(innerWidth < 1001) return;
  const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ft-s")) || 1;
  const pad = (parseFloat(getComputedStyle(m).paddingTop) || 0) + (parseFloat(getComputedStyle(m).paddingBottom) || 0);
  const room = m.clientHeight - pad, need = m.scrollHeight - pad;
  // 🛠 the Practice Lab is made to fit one screen (down to 0.66); other pages only when a little taller (down to 0.8)
  const lab = m.classList.contains("main-sims");
  if(need <= room + 1 || (!lab && need > room * 1.35)) return;
  m.style.setProperty("--ft-page-s", Math.max(lab ? 0.66 : 0.8, s * room / need * 0.99).toFixed(3));
}
let pageT = 0;
new MutationObserver(() => { cancelAnimationFrame(pageT); pageT = requestAnimationFrame(fitPage); }).observe(document.getElementById("app") || document.body, {childList: true});
addEventListener("resize", () => { cancelAnimationFrame(pageT); pageT = requestAnimationFrame(fitPage); });
let pending = 0;
addEventListener("resize", () => { if(!pending) pending = requestAnimationFrame(() => { pending = 0; fit(); }); });
fit();
})();
