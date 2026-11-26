/* ============================================================
   The LSH logo in the hero card, and one slim top bar (every LSH course, and the Training Portal's
   theme.css .lsh-hero-logo: the same size).

   The logo leads the page's hero card (the dashboard's .dash-hero) instead of sitting in the top
   bar: one size everywhere (100px, 80px on a tablet, 64px on a phone; no plate behind it), to the left
   of the hero's ribbon and text. A page with no hero card keeps the logo in its bar. Every top bar
   is one slim height. The page re-renders often, so this puts the logo back after each render.

   The same file in every LSH course repo (Foundational-Training, Case-Management-Training,
   propertydamageclaimstraining); change it in all of them.
   ============================================================ */
(function(){
"use strict";
const st = document.createElement("style"); st.id = "lsh-hero-logo";
st.textContent = `
.lsh-hero-logo{display:block;height:100px;width:auto;justify-self:start;align-self:center;}
.dash-hero.has-lsh-logo{grid-template-columns:auto 140px minmax(0,1fr);}
.dash-hero.has-lsh-logo > .lsh-hero-logo{order:-2;}
@media(max-width:1000px){.lsh-hero-logo{height:80px;}}
@media(max-width:560px){.lsh-hero-logo{height:64px;}}
/* the bar: no logo where the hero carries it (nor the slate panel that lit it), and one slim height */
body.lsh-logo-in-hero .topbar .brand-mark{display:none;}
body.lsh-logo-in-hero .topbar .brand{gap:0;}
/* the one LSH logo is the one made for dark backgrounds, so the light panel that lit the old logo goes from every bar */
.topbar::before{display:none !important;}
.topbar-inner{padding-top:8px;padding-bottom:8px;min-height:60px;}
.topbar .brand-mark{height:42px;}
`;
document.head.appendChild(st);
function apply(){
  const hero = document.querySelector(".dash-hero");
  document.body.classList.toggle("lsh-logo-in-hero", !!hero);
  if(!hero || hero.querySelector(":scope > .lsh-hero-logo")) return;
  const img = document.createElement("img");
  img.className = "lsh-hero-logo"; img.alt = "Legal Support Help";
  img.src = "/lsh-logo-dark.png";   // the logo made for dark backgrounds: white outline and wordmark (the CMS sidebar's)
  hero.insertBefore(img, hero.firstChild);
  hero.classList.add("has-lsh-logo");
}
let queued = false;
const later = () => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; apply(); }); };
function start(){ apply(); new MutationObserver(later).observe(document.body, {childList: true, subtree: true}); }
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
