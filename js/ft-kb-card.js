/* ============================================================
   📚 Dashboard's Knowledge Base card: the Knowledge Base articles for the roles this course teaches (js/ft-kb-articles.js, made by
   build/kb-articles.cjs from the library's bundled pages). The card sits after the lesson cards, in the grid's free
   slot; a role's button opens a window with that role's articles, grouped by section, and 🔗 Open ↗ (the last button: the
   roles take the card's bottom row too, so they fit on a short screen) opens the library.
   A link opens signed in (js/lsh-tool-links.js).
   ============================================================ */
(function(){
const root = window;
const KB = "https://lsh-knowledge-base.legalsupporthelp.workers.dev/";
const roles = () => root.FT_KB_ROLES || [];
const e = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

function card(){
  const R = roles(); if(!R.length) return "";
  const n = R.reduce((t, r) => t + r.count, 0);
  const chips = R.map((r, k) => `<button type="button" class="ftkb-role ftkb-c${k % 6}" onclick="event.stopPropagation(); FTKBCard.open(${k})" title="${e(r.title)}: ${r.count} articles">${e(r.label)}</button>`).join("");
  return `<div class="module-card mc-clean ftkb" id="ftkb-card">
    <div class="module-head"><div class="mh-day">📚 ${n} articles · this course’s roles</div><div class="mh-title">Knowledge Base</div></div>
    <div class="module-body ftkb-body"><div class="ftkb-roles" role="group" aria-label="Knowledge Base articles by role">${chips}<button type="button" class="ftkb-role ftkb-open" onclick="event.stopPropagation(); window.open('${KB}', '_blank')" title="Open the LSH Knowledge Base in a new tab" aria-label="Open the Knowledge Base">🔗<span class="ftkb-ot"> Open ↗</span></button></div></div>
  </div>`;
}
// the card goes after the lesson cards (the grid's free slot), on 📚 Dashboard only
const __grid = root.LSH_HOME_GRID_LAYOUT;
if(typeof __grid === "function") root.LSH_HOME_GRID_LAYOUT = function(){
  const html = __grid.apply(this, arguments);
  return html ? html + card() : html;
};

function close(){ const o = document.getElementById("ftkbModal"); if(o) o.remove(); document.removeEventListener("keydown", key, true); }
function key(ev){ if(ev.key === "Escape"){ ev.stopPropagation(); close(); } }
function body(k){
  const R = roles(), r = R[k];
  return `<div class="ftkb-tabs" role="tablist" aria-label="Roles">${R.map((x, i) => `<button type="button" role="tab" aria-selected="${i === k}" class="ftkb-c${i % 6}${i === k ? " on" : ""}" onclick="FTKBCard.open(${i})">${e(x.label)}</button>`).join("")}</div>
    <h2 class="ftkb-h">📚 ${e(r.title)} <span>${r.count} articles</span></h2>
    ${r.groups.map(g => `<section class="ftkb-g"><p class="ftkb-gh">${e(g[0])}</p><ul>${g[1].map(a => `<li><a href="${e(KB + a[1])}" target="_blank" rel="noopener noreferrer">${e(a[0])} <span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>`).join("")}
    <p class="ftkb-all">${r.collection ? `<a class="btn btn-ghost btn-sm" href="${e(KB + "#/c/" + r.collection)}" target="_blank" rel="noopener noreferrer">The whole collection ↗</a>` : ""}<a class="btn btn-navy btn-sm" href="${KB}" target="_blank" rel="noopener noreferrer">🔗 Open the Knowledge Base ↗</a></p>`;
}
function open(k){
  const R = roles(); if(!R.length) return;
  k = Math.max(0, Math.min(R.length - 1, Number(k) || 0));
  let o = document.getElementById("ftkbModal");
  if(!o){
    o = document.createElement("div"); o.id = "ftkbModal"; o.className = "ftkb-modal"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Knowledge Base articles");
    o.innerHTML = `<div class="ftkb-box"><button type="button" class="ftkb-x" onclick="FTKBCard.close()" aria-label="Close">✕</button><div class="ftkb-in"></div></div>`;
    o.addEventListener("click", ev => { if(ev.target === o) close(); });
    document.body.appendChild(o); document.addEventListener("keydown", key, true);
  }
  const inn = o.querySelector(".ftkb-in"); inn.className = "ftkb-in ftkb-c" + (k % 6); inn.innerHTML = body(k);
  o.querySelector(".ftkb-box").scrollTop = 0;
}
root.FTKBCard = {open, close};

const st = document.createElement("style"); st.id = "ft-kb-card"; st.textContent = `
main.main-dash .module-grid > .ftkb{min-height:0;height:100%;overflow:hidden;display:flex;flex-direction:column;}
main.main-dash .module-grid > .ftkb .module-body{flex:1 1 auto;min-height:0;display:flex;align-items:center;}
main.main-dash .module-grid > .ftkb .mh-day{font-family:'Inter',sans-serif !important;}
.ftkb-roles{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:6px;padding:4px 6px;width:100%;max-height:100%;overflow:auto;}
/* each role its own colour, on the card's chips and the window's tabs and sections alike: a tinted fill
   with a soft sheen, a matching border, glow and dark text (every --c is AA on white and on its --bg) */
.ftkb-role{--c:#1E2340;--bg:#E6E9F5;--glow:rgba(15,20,40,.25);border:1.5px solid var(--c);border-radius:999px;color:var(--c);padding:5px 12px;
  background:linear-gradient(180deg,#fff -40%,var(--bg) 100%);
  font:800 13px/1.2 'Inter',sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 2px 6px -2px var(--glow),inset 0 1px 0 rgba(255,255,255,.8);
  transition:transform .14s ease,box-shadow .14s ease,background .14s ease,color .14s ease;}
.ftkb-c0{--c:#1E4FA8;--bg:#DCE7FB;--glow:rgba(30,79,168,.35);}
.ftkb-c1{--c:#0F6E5C;--bg:#D3F1E6;--glow:rgba(15,110,92,.35);}
.ftkb-c2{--c:#8A3A00;--bg:#FCE3CF;--glow:rgba(200,98,20,.38);}
.ftkb-c3{--c:#6B2A9E;--bg:#ECDDFA;--glow:rgba(107,42,158,.35);}
.ftkb-c4{--c:#A1173F;--bg:#FBDCE5;--glow:rgba(161,23,63,.35);}
.ftkb-c5{--c:#5C4A00;--bg:#F8EBB5;--glow:rgba(170,135,0,.40);}
.ftkb-role:hover,.ftkb-role:focus-visible{background:var(--c);border-color:var(--c);color:#fff;outline:none;transform:translateY(-1px);box-shadow:0 6px 12px -4px var(--glow);}
.ftkb-role.ftkb-open{--c:#1E2340;--glow:rgba(181,101,31,.45);background:linear-gradient(135deg,#1E2340 0%,#2C3358 100%);border-color:#1E2340;color:#fff;box-shadow:0 2px 6px -2px var(--glow),inset 0 -2px 0 #E58A3A;}
.ftkb-role.ftkb-open:hover,.ftkb-role.ftkb-open:focus-visible{background:#353B57;border-color:#353B57;box-shadow:0 6px 12px -4px var(--glow),inset 0 -2px 0 #E58A3A;}
@media(prefers-reduced-motion:reduce){ .ftkb-role{transition:none;} .ftkb-role:hover,.ftkb-role:focus-visible{transform:none;} }
/* (a short screen: the cards are shorter, so the roles are a little smaller) */
@media(max-height:820px){ main.main-dash .module-grid > .ftkb .module-body{padding:2px 4px !important;}
  .ftkb-roles{gap:4px;padding:0 4px;} .ftkb-role{font-size:12px;padding:3px 9px;} .ftkb-ot{display:none;} }
.ftkb-modal{position:fixed;inset:0;z-index:1000;background:rgba(15,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.ftkb-box{position:relative;width:min(760px,100%);max-height:90vh;overflow:auto;background:#F6F7FB;border-radius:18px;padding:20px 22px;box-shadow:0 24px 60px -20px rgba(15,20,40,.6);}
.ftkb-x{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#5b6178;padding:4px 8px;border-radius:8px;}
.ftkb-x:hover{background:#E4E7F0;}
.ftkb-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:0 32px 14px 0;}
.ftkb-tabs button{border:1.5px solid var(--c,#DDE1EC);border-radius:999px;background:var(--bg,#fff);padding:5px 12px;font:700 13px 'Inter',sans-serif;color:var(--c,#1E2340);cursor:pointer;}
.ftkb-tabs button:hover{box-shadow:0 3px 8px -3px var(--glow);}
.ftkb-tabs button.on{background:var(--c,#1E2340);border-color:var(--c,#1E2340);color:#fff;box-shadow:0 3px 8px -3px var(--glow);}
.ftkb-in .ftkb-h{border-left:5px solid var(--c);padding-left:10px;}
.ftkb-in .ftkb-g{border-top:3px solid var(--c);}
.ftkb-in .ftkb-gh{color:var(--c);}
.ftkb-h{margin:0 0 10px;font-size:20px;color:var(--navy,#1E2340);}
.ftkb-h span{font:600 13px 'Inter',sans-serif;color:#6B7190;margin-left:6px;}
.ftkb-g{background:#fff;border:1px solid #E1E4EE;border-radius:12px;padding:10px 14px;margin:0 0 10px;}
.ftkb-gh{margin:0 0 4px;font:800 12px 'Inter',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6B7190;}
.ftkb-g ul{margin:0;padding:0;list-style:none;}
.ftkb-g li{border-top:1px solid #EEF0F5;}
.ftkb-g li:first-child{border-top:0;}
.ftkb-g a{display:block;padding:7px 0;color:#1F5FBF;font-weight:600;text-decoration:none;line-height:1.35;}
.ftkb-g a:hover{text-decoration:underline;}
.ftkb-all{margin:12px 0 0;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;}
`;
document.head.appendChild(st);
})();
