/* ============================================================
   The LSH logo in the hero card, and one slim top bar (every LSH course, and the Training Portal's
   theme.css .lsh-hero-logo: the same size and placement).

   The logo leads the page's hero card (the dashboard's .dash-hero) instead of sitting in the top
   bar: one size everywhere (100px, 80px on a tablet, 64px on a phone; no plate behind it). It is
   pinned to the hero's left edge, centred top to bottom, and the hero's own content (its ribbon and
   title, in whatever grid the course gives them) moves over by the logo's width, so nothing inside
   the hero is rearranged. On a phone it sits above the hero's text. A page with no hero card keeps
   the logo in its bar. Every top bar is one slim height, with the logo bare (no tile or panel).
   The page re-renders often, so this puts the logo back after each render.

   The same file in every LSH course repo (Foundational-Training, EA-PA-TRAINING,
   Case-Management-Training, propertydamageclaimstraining, medsumanddemandtraining,
   LienNegotiatorTraining, closingspecialisttraining); change it in all of them.
   ============================================================ */
(function(){
"use strict";
const st = document.createElement("style"); st.id = "lsh-hero-logo";
st.textContent = `
html body .dash-hero.has-lsh-logo{position:relative !important;padding-left:200px !important;min-height:124px;}
html body .dash-hero.has-lsh-logo > .lsh-hero-logo{position:absolute;left:28px;top:50%;transform:translateY(-50%);
  display:block;height:100px;width:auto;margin:0;z-index:2;grid-column:auto;grid-row:auto;}
@media(max-width:1000px){
  html body .dash-hero.has-lsh-logo{padding-left:168px !important;min-height:104px;}
  html body .dash-hero.has-lsh-logo > .lsh-hero-logo{height:80px;left:22px;}
}
@media(max-width:560px){
  /* still beside the hero's text on a phone, level with the title, never above it */
  html body .dash-hero.has-lsh-logo{padding-left:118px !important;min-height:84px;}
  html body .dash-hero.has-lsh-logo > .lsh-hero-logo{height:56px;left:14px;top:20px;transform:none;}
}
/* the bar: no logo where the hero carries it, the bar's logo bare (no tile or light panel) elsewhere, one slim height */
html body.lsh-logo-in-hero .topbar .brand-mark{display:none !important;}
html body.lsh-logo-in-hero .topbar .brand{gap:0 !important;}
.topbar::before{display:none !important;}
html body .topbar .brand .brand-mark, html body .topbar .brand .brand-mark.brand-logo{height:42px !important;background:none !important;
  padding:0 !important;box-shadow:none !important;border-radius:0 !important;}
.topbar-inner{padding-top:8px;padding-bottom:8px;min-height:60px;}
`;
document.head.appendChild(st);
function apply(){
  const hero = document.querySelector(".dash-hero");
  document.body.classList.toggle("lsh-logo-in-hero", !!hero);
  if(!hero || hero.querySelector(":scope > .lsh-hero-logo")) return;
  const img = document.createElement("img");
  img.className = "lsh-hero-logo"; img.alt = "Legal Support Help";
  // the logo made for dark backgrounds (white outline and wordmark): at the site's root, or in js/ where a course keeps it
  img.onerror = function(){ if(!/\/js\//.test(img.src)) { img.onerror = null; img.src = "/js/lsh-logo-dark.png"; } };
  img.src = "/lsh-logo-dark.png";
  hero.insertBefore(img, hero.firstChild);
  hero.classList.add("has-lsh-logo");
}
let queued = false;
const later = () => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
function start(){ apply(); new MutationObserver(later).observe(document.body, {childList: true, subtree: true}); }
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
