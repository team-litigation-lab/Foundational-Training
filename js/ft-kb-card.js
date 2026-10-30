/* ============================================================
   📚 Dashboard's Knowledge Base card: every Knowledge Base article, by role (js/ft-kb-articles.js, made by
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
  const chips = R.map((r, k) => `<button type="button" class="ftkb-role" onclick="event.stopPropagation(); FTKBCard.open(${k})" title="${e(r.title)}: ${r.count} articles">${e(r.label)}</button>`).join("");
  return `<div class="module-card mc-clean ftkb" id="ftkb-card">
    <div class="module-head"><div class="mh-day">📚 ${n} articles · every role</div><div class="mh-title">Knowledge Base</div></div>
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
  return `<div class="ftkb-tabs" role="tablist" aria-label="Roles">${R.map((x, i) => `<button type="button" role="tab" aria-selected="${i === k}" class="${i === k ? "on" : ""}" onclick="FTKBCard.open(${i})">${e(x.label)}</button>`).join("")}</div>
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
  o.querySelector(".ftkb-in").innerHTML = body(k);
  o.querySelector(".ftkb-box").scrollTop = 0;
}
root.FTKBCard = {open, close};

const st = document.createElement("style"); st.id = "ft-kb-card"; st.textContent = `
main.main-dash .module-grid > .ftkb{min-height:0;height:100%;overflow:hidden;display:flex;flex-direction:column;}
main.main-dash .module-grid > .ftkb .module-body{flex:1 1 auto;min-height:0;display:flex;align-items:center;}
main.main-dash .module-grid > .ftkb .mh-day{font-family:'Inter',sans-serif !important;}
.ftkb-roles{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;gap:4px;padding:4px 8px;width:100%;max-height:100%;overflow:auto;}
.ftkb-role{border:1px solid #DDE1EC;border-radius:999px;background:rgba(255,255,255,.75);color:var(--navy,#1E2340);padding:3px 8px;
  font:700 11.5px/1.2 'Inter',sans-serif;cursor:pointer;white-space:nowrap;}
.ftkb-role:hover,.ftkb-role:focus-visible{background:#353B57;border-color:#353B57;color:#fff;outline:none;}
.ftkb-role.ftkb-open{background:#1E2340;border-color:#1E2340;color:#fff;}
/* (a short screen: the cards are shorter, so the roles are smaller, three rows) */
@media(max-height:820px){ main.main-dash .module-grid > .ftkb .module-body{padding:2px 4px !important;}
  .ftkb-roles{gap:3px;padding:0 4px;} .ftkb-role{font-size:10.5px;padding:2px 6px;} .ftkb-ot{display:none;} }
.ftkb-modal{position:fixed;inset:0;z-index:1000;background:rgba(15,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.ftkb-box{position:relative;width:min(760px,100%);max-height:90vh;overflow:auto;background:#F6F7FB;border-radius:18px;padding:20px 22px;box-shadow:0 24px 60px -20px rgba(15,20,40,.6);}
.ftkb-x{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#5b6178;padding:4px 8px;border-radius:8px;}
.ftkb-x:hover{background:#E4E7F0;}
.ftkb-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:0 32px 14px 0;}
.ftkb-tabs button{border:1px solid #DDE1EC;border-radius:999px;background:#fff;padding:5px 12px;font:700 13px 'Inter',sans-serif;color:var(--navy,#1E2340);cursor:pointer;}
.ftkb-tabs button:hover{border-color:#353B57;}
.ftkb-tabs button.on{background:#1E2340;border-color:#1E2340;color:#fff;}
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
