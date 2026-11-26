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
  // 🏅 My Performance and 📦 Intake Packets are made to fit one screen (down to 0.66); other pages only when a little taller
  // (down to 0.8)
  // (the Practice Lab goes by the day now and scrolls like any page: it is no longer squeezed onto one screen)
  const lab = !!m.querySelector(".ftmp-focus, .ftis-admin");   // 🏅 My Performance, 📦 Intake Packets
  if(need <= room + 1 || (!lab && need > room * 1.35)) return;
  const set = v => m.style.setProperty("--ft-page-s", v.toFixed(3)), fits = () => m.scrollHeight - pad <= room + 1;
  let lo = Math.max(lab ? 0.66 : 0.8, s * room / need * 0.99), hi = s;
  set(lo);
  // (a page drawn smaller often gets shorter than its scale alone says, its lines reflowing into the wider room, so the
  // first guess leaves the bottom of the screen empty: the largest scale that still fits is found in a few steps)
  if(fits()) for(let i = 0; i < 5 && hi - lo > 0.01; i++){ const mid = (lo + hi) / 2; set(mid); if(fits()) lo = mid; else hi = mid; }
  set(lo);
}
let pageT = 0;
new MutationObserver(() => { cancelAnimationFrame(pageT); pageT = requestAnimationFrame(fitPage); }).observe(document.getElementById("app") || document.body, {childList: true});
addEventListener("resize", () => { cancelAnimationFrame(pageT); pageT = requestAnimationFrame(fitPage); });
let pending = 0;
addEventListener("resize", () => { if(!pending) pending = requestAnimationFrame(() => { pending = 0; fit(); }); });
fit();
})();

/* ============================================================
   📱 Phones: the safety net
   The pages already have their own narrow-screen rules (index.html's @media(max-width:760px) block, where a wide table
   also scrolls sideways in its own box); this only catches what they miss, so on a phone (760 px wide or less) nothing
   runs off the right edge where it can't be reached (the app's page bodies clip what overflows). Every rule is wrapped
   in :where() (no specificity), so any page's own rule still wins, and none of it applies on a wider screen: the
   desktop layout is untouched.
     • text is never inflated by the phone's own font boost when it turns sideways;
     • pictures, video and embedded frames shrink to the screen instead of pushing past it;
     • a select, input or text box is never wider than the box it sits in (a select is as wide as its longest
       option: 📝 Send Feedback's activity list ran 900 px past the screen, 🎧 Listening's batch list 45 px), and the
       box a select sits in may shrink with it;
     • a long unbroken word (an email address, a link, a case number) breaks rather than running off the edge.
   (The same net as the LSH Training Portal's theme.css.)
   ============================================================ */
(function(){
const st = document.createElement("style"); st.id = "ft-phone-net"; st.textContent = `
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}
@media (max-width:760px){
  :where(body){overflow-wrap:break-word;}
  :where(img, video, iframe, embed, object){max-width:100%;}
  :where(img:not([height]), video){height:auto;}
  :where(pre){white-space:pre-wrap;}
  :where(input, select, textarea){max-width:100%;}
  :where(:has(> select)){min-width:0;}
}
`;
document.head.appendChild(st);
})();
