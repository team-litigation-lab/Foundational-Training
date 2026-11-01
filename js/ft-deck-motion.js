/* ============================================================
   🎞 Deck motion: the lesson decks and the Day decks animate as you move through them, instead of the next slide
   simply replacing the one shown.
     • a lesson's deck page (an image, .cs-page) glides in from the side you are moving toward;
     • a native slide's parts (.cs), and a Day deck slide's blocks (.ftdd-sheet), come in one after another;
     • a Day deck's progress line grows (or shrinks) from where it was to where it is now;
     • turning a page of a long Day deck slide brings that page's blocks in the same way (FTDayDecks.go calls page()).
   It runs only when the slide itself changes (the deck, the slide or its page), never on a re-render of the same
   slide, so a slide does not blink when something else on the page is redrawn: that blink is why the lesson pages'
   own CSS slide-in is off in js/ft-slides.js (body.ft-fit / body.ft-orient). The motion uses the Web Animations
   API, so those animation:none rules don't stop it, and it only scales elements down and fades them in, so it
   never makes a slide overflow (js/ft-day-decks.js measures the sheets to fit them).
   Off for anyone whose system asks for reduced motion. Loaded after js/ft-day-decks.js.
   ============================================================ */
(function(root){
"use strict";
if(!root.Element || !Element.prototype.animate) return;
const reduce = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : {matches: false};
const EASE = "cubic-bezier(.22,1,.36,1)";
const last = {lessonEl: null, lessonKey: null, deckEl: null, deckKey: null, prog: null};
const st = () => (typeof state !== "undefined" ? state : (root.state || {}));
const shown = el => el && el.nodeType === 1 && el.style.display !== "none" && !el.hidden && el.getClientRects().length > 0
  && !el.matches("script, style, template, .trainer-slot:empty");

function play(el, frames, opts){
  try{ return el.animate(frames, Object.assign({duration: 460, easing: EASE, fill: "backwards"}, opts)); }catch(err){ return null; }
}
// a slide's blocks, one after another (at most 9 of them move; the rest come in with the 9th)
function stagger(list, base){
  list.filter(shown).forEach((el, k) => {
    play(el, [{opacity: 0, transform: "scale(.965)", transformOrigin: "50% 0"}, {opacity: 1, transform: "none", transformOrigin: "50% 0"}],
      {duration: 420, delay: (base || 0) + Math.min(k, 8) * 70});
  });
}
// the blocks to bring in, inside a container: one level down, or the cards of a grid / the steps of a flow
function blocks(box){
  if(!box) return [];
  const kids = [...box.children].filter(shown);
  if(kids.length === 1 && kids[0].children.length > 1 && !kids[0].matches("img, figure, table, iframe, .cs-page")) return blocks(kids[0]);
  const out = [];
  kids.forEach(k => {
    const inner = k.matches(".cs-grid, .cs-flow, .cs-list, .ftdd-pi-row") ? [...k.children].filter(shown) : null;
    if(inner && inner.length > 1 && inner.length <= 8) out.push(...inner); else out.push(k);
  });
  return out;
}

/* 📚 a lesson slide (#lessonSlideWrap) */
function lessonKey(){
  const s = st();
  return [s.view, s.dayId, s.lessonSlide || 0, s.slidePage || 0, s.slideInterstitial ? "i" : "", s.dayViewMode || ""].join(":");
}
function animateLesson(el){
  // a lesson whose own CSS slide-in is still on (dir-next / dir-prev) keeps it: no second animation on top
  try{ if(getComputedStyle(el).animationName !== "none") return; }catch(err){ return; }
  const dir = st().slideDir === "prev" ? -1 : 1;
  const img = el.querySelector(".cs-page img");
  if(img){
    play(img, [{opacity: 0, transform: `translateX(${dir * 18}px) scale(.96)`}, {opacity: 1, transform: "none"}], {duration: 520});
    return;
  }
  const box = el.querySelector(".cs") || el.querySelector(".ft-body") || el.querySelector(".lesson-card") || el;
  stagger(blocks(box));
}

/* 📋 a Day deck slide (main.main-ftdd .ftdd-deck) */
function deckKey(el){
  const t = el.querySelector(".ftdd-dtitle");
  return (t ? t.getAttribute("data-day") || t.textContent : "") + ":" + el.getAttribute("data-slide");
}
function animateProg(el){
  const bar = el.querySelector(".ftdd-prog > span"); if(!bar) return;
  const to = bar.style.width || "0%", from = last.prog;
  last.prog = to;
  if(from == null || from === to) return;
  play(bar, [{width: from}, {width: to}], {duration: 600});
}
function sheetBlocks(sheet){
  // the blocks on the page being shown (a long slide is read in pages: the others are display:none)
  return blocks(sheet).filter(shown);
}
function animateDeck(el, dir){
  const sheet = el.querySelector(".ftdd-sheet");
  const body = sheet || el.querySelector(".ftdd-onnavy") || null;
  if(body) stagger(sheet ? sheetBlocks(sheet) : blocks(body), 40);
  const ribbon = el.querySelector(".ftdd-ribbon > span");
  if(ribbon) play(ribbon, [{opacity: 0, transform: `translateX(${dir * -14}px)`, clipPath: "inset(0 100% 0 0)"}, {opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)"}], {duration: 520});
}

let queued = false, lastDeckSlide = null;
function check(){
  queued = false;
  if(reduce.matches) return;
  const w = document.getElementById("lessonSlideWrap");
  if(w && w !== last.lessonEl){
    const k = lessonKey();
    last.lessonEl = w;
    if(k !== last.lessonKey){ last.lessonKey = k; animateLesson(w); }
  }
  const d = document.querySelector("main.main-ftdd .ftdd-slides > .ftdd-deck[data-slide]");
  if(d && d !== last.deckEl){
    const k = deckKey(d), n = Number(d.getAttribute("data-slide"));
    last.deckEl = d;
    animateProg(d);
    if(k !== last.deckKey){
      const dir = lastDeckSlide != null && n < lastDeckSlide ? -1 : 1;
      last.deckKey = k; lastDeckSlide = n;
      // (after js/ft-day-decks.js has dealt the slide into pages, so only the page shown comes in)
      requestAnimationFrame(() => { if(d.isConnected) animateDeck(d, dir); });
    }
  }
  if(!d){ last.deckEl = null; }
}
const mo = new MutationObserver(() => { if(!queued){ queued = true; requestAnimationFrame(check); } });
function start(){ mo.observe(document.body, {childList: true, subtree: true}); check(); }
if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);

root.FTDeckMotion = {
  // a page of a long Day deck slide was turned (FTDayDecks.go): bring that page's blocks in
  page(step){
    if(reduce.matches) return;
    const sheet = document.querySelector("main.main-ftdd .ftdd-slides > .ftdd-deck .ftdd-sheet");
    if(sheet) stagger(sheetBlocks(sheet), 0);
  }
};
})(window);
