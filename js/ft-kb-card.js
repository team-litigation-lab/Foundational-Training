/* ============================================================
   📚 Dashboard's Knowledge Base card: the Knowledge Base links that are off the Intake decks for now
   (noKB in build/day-decks.cjs), in one place. The card sits after the lesson cards, in the grid's free slot; its
   Part 1 · Part 2 · Part 3 open a window with that Intake part's articles, grouped as the slides had them, and
   🔗 Open the Knowledge Base opens the library itself. A link opens signed in (js/lsh-tool-links.js).
   ============================================================ */
(function(){
const root = window;
const KB = "https://lsh-knowledge-base.legalsupporthelp.workers.dev/";
// [part, its groups: [heading, [[title, path], …]]] — the articles each Intake slide linked (build/days/day07–09.js)
const PARTS = [
  ["Intake Specialist · Part 1", [
    ["The lesson", [["Documents to Support the Claim", "#/topic/L6-T5"], ["Intake Specialist Best Practices", "#/topic/L6-T8"],
      ["Fee Arrangements: retainer vs. contingency", "#/topic/L6-T10"], ["Intake Specialist: The Art and Science of Intake", "#/e/96"],
      ["Unauthorized Practice of Law", "#/e/99"], ["Understanding Attorney-Client Privilege and Confidentiality Practices", "#/e/100"]]],
    ["Insurance Providers", [["Common Insurance Companies in Personal Injury Cases", "#/e/98"],
      ["Navigating Post-Accident Medical Coverage: PIP, MedPay, and Health Insurance", "#/e/115"],
      ["Navigating Auto Insurance: At-Fault vs. No-Fault States, PIP, and Property Protection Explained", "#/e/116"]]],
    ["Case types & sample intakes", [["Intake scripts (sample)", "#/go/829736"],
      ["Understanding Slip and Fall vs. Premises Liability Claims", "#/e/117"], ["Standard Duty of Care and Visitor Classifications", "#/e/118"],
      ["Processing Commercial Property Incident Reports & Evidence Intake", "#/e/119"], ["Dog Bite Incident Management & Medical Protocol", "#/e/122"],
      ["Medical Malpractice Intake & Investigation Protocol", "#/e/123"]]],
    ["Shadowing", [["Intake specialist job duties and description", "#/go/829735"], ["Receptionist Work Guide", "#/go/958866"],
      ["Receptionist Role Standard Operating Procedures", "#/e/121"]]]]],
  ["Intake Specialist · Part 2", [
    ["Topic 1: Intake Process", [["Client Intake Process", "#/go/918345"], ["First Stage Procedures: Intake", "#/doc/procedure-first-stage-intake"],
      ["Saving documents overview", "#/go/829738"]]],
    ["Topic 2: Intake Documents", [["Naming Documents and Case Folders", "#/doc/lesson-06-naming-documents-and-folders"], ["The Intake Packet", "#/topic/L6-T9"],
      ["Conflict Awareness During Intake", "#/topic/L6-T6"], ["Navigating Conflicts of Interest in Personal Injury Litigation", "#/e/125"],
      ["Sample PI Onboarding Packet: Contract, HIPAA Authorization and Power of Attorney", "#/doc/lesson-14-sample-onboarding-packet"],
      ["SmartAdvocate Enterprise Workflow, Architecture & Customization Blueprint", "#/e/102"]]]]],
  ["Intake Specialist · Part 3", [
    ["Mock call preparation", [["Lead Call Flow & Required Information", "#/topic/L6-T3"]]]]]
];
const e = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const count = PARTS.reduce((n, p) => n + p[1].reduce((m, g) => m + g[1].length, 0), 0);

function card(){
  const segs = PARTS.map((p, k) => `<button type="button" class="ftseg-b" onclick="event.stopPropagation(); FTKBCard.open(${k})" title="${e(p[0])}: its Knowledge Base articles">Part ${k + 1}</button>`).join("");
  return `<div class="module-card mc-clean ftkb" id="ftkb-card">
    <div class="module-head"><div class="mh-day">Intake · ${count} articles</div><div class="mh-title">Knowledge Base</div></div>
    <div class="module-body ftkb-body" role="button" tabindex="0" title="📚 The Intake articles in the Knowledge Base" onclick="FTKBCard.open(0)"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();FTKBCard.open(0);}"><div class="module-icon">📚</div></div>
    <div class="mc-grid mc-n1"><div class="ftseg ftseg-n${PARTS.length}" role="group" aria-label="Knowledge Base articles by Intake part">${segs}</div>
    <button type="button" class="btn btn-ghost btn-sm module-finish-btn" onclick="event.stopPropagation(); window.open('${KB}', '_blank')" title="Open the LSH Knowledge Base in a new tab">🔗 Open ↗</button></div>
  </div>`;
}
// the card goes after the lesson cards (the grid's eighth slot), on 📚 Dashboard only
const __grid = root.LSH_HOME_GRID_LAYOUT;
if(typeof __grid === "function") root.LSH_HOME_GRID_LAYOUT = function(){
  const html = __grid.apply(this, arguments);
  return html ? html + card() : html;
};

function close(){ const o = document.getElementById("ftkbModal"); if(o) o.remove(); document.removeEventListener("keydown", key, true); }
function key(ev){ if(ev.key === "Escape"){ ev.stopPropagation(); close(); } }
function body(k){
  const p = PARTS[k];
  return `<div class="ftkb-tabs" role="tablist">${PARTS.map((x, i) => `<button type="button" role="tab" aria-selected="${i === k}" class="${i === k ? "on" : ""}" onclick="FTKBCard.open(${i})">Part ${i + 1}</button>`).join("")}</div>
    <h2 class="ftkb-h">📚 ${e(p[0])}</h2>
    ${p[1].map(g => `<section class="ftkb-g"><p class="ftkb-gh">${e(g[0])}</p><ul>${g[1].map(a => `<li><a href="${e(KB + a[1])}" target="_blank" rel="noopener noreferrer">${e(a[0])} <span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>`).join("")}
    <p class="ftkb-all"><a class="btn btn-navy btn-sm" href="${KB}" target="_blank" rel="noopener noreferrer">🔗 Open the Knowledge Base ↗</a></p>`;
}
function open(k){
  k = Math.max(0, Math.min(PARTS.length - 1, Number(k) || 0));
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
root.FTKBCard = {open, close, parts: () => PARTS.map(p => ({part: p[0], links: p[1].flatMap(g => g[1].map(a => KB + a[1]))}))};

const st = document.createElement("style"); st.id = "ft-kb-card"; st.textContent = `
main.main-dash .module-grid > .ftkb{min-height:0;height:100%;overflow:hidden;display:flex;flex-direction:column;}
main.main-dash .module-grid > .ftkb .module-body{flex:1 1 auto;min-height:0;cursor:pointer;}
main.main-dash .module-grid > .ftkb .mh-day{font-family:'Inter',sans-serif !important;}
main.main-dash .module-grid > .ftkb .mc-grid{grid-template-columns:minmax(0,1fr) !important;}
main.main-dash .module-grid > .ftkb .module-body:hover .module-icon,main.main-dash .module-grid > .ftkb .module-body:focus-visible .module-icon{transform:scale(1.12);}
.ftkb-modal{position:fixed;inset:0;z-index:1000;background:rgba(15,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.ftkb-box{position:relative;width:min(720px,100%);max-height:90vh;overflow:auto;background:#F6F7FB;border-radius:18px;padding:20px 22px;box-shadow:0 24px 60px -20px rgba(15,20,40,.6);}
.ftkb-x{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#5b6178;padding:4px 8px;border-radius:8px;}
.ftkb-x:hover{background:#E4E7F0;}
.ftkb-tabs{display:inline-flex;border:1px solid #DDE1EC;border-radius:10px;overflow:hidden;background:#fff;margin:0 0 12px;}
.ftkb-tabs button{border:0;border-left:1px solid #DDE1EC;background:transparent;padding:7px 16px;font:700 13.5px 'Inter',sans-serif;color:var(--navy,#1E2340);cursor:pointer;}
.ftkb-tabs button:first-child{border-left:0;}
.ftkb-tabs button.on{background:#1E2340;color:#fff;}
.ftkb-h{margin:0 0 10px;font-size:20px;color:var(--navy,#1E2340);}
.ftkb-g{background:#fff;border:1px solid #E1E4EE;border-radius:12px;padding:10px 14px;margin:0 0 10px;}
.ftkb-gh{margin:0 0 4px;font:800 12px 'Inter',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6B7190;}
.ftkb-g ul{margin:0;padding:0;list-style:none;}
.ftkb-g li{border-top:1px solid #EEF0F5;}
.ftkb-g li:first-child{border-top:0;}
.ftkb-g a{display:block;padding:7px 0;color:#1F5FBF;font-weight:600;text-decoration:none;line-height:1.35;}
.ftkb-g a:hover{text-decoration:underline;}
.ftkb-all{margin:12px 0 0;text-align:right;}
`;
document.head.appendChild(st);
})();
