/* ============================================================
   👥 TRAINEES & BATCHES: Trainee Audit and 📁 Batch Folders as one tab, in 🏅 Scorecard
   ------------------------------------------------------------
   The 📋 Batch Sheet (js/ft-batch-sheet.js) already shows every trainee's progress, lessons, Knowledge Checks, Practice
   Lab, scores and recent activity, so this tab keeps only what the sheet doesn't have, the things a trainer DOES:
     • ⏳ Pending Approvals (approve / reject);
     • each trainee's actions: View Detail (day-by-day feedback, certificate details, unlocks), ✍ Feedback, 🎓 Certificate,
       ↺ Reset Attempts, 🚫 Offboard; under the row only 🎲 Random tasks and the feedback Review (sent, drafts, to write,
       🎯 Focus) — the lessons, days, Knowledge Checks and Practice Labs are the Batch Sheet's;
     • the batches: 📦 Archive and ⬇ Records per batch, the 📦 Archive shelf (restore), 🚫 Offboarded VAs (restore access)
       and ☁ Saved to Google Drive. A batch's card filters the trainee list to that batch: its old Registry, Rankings,
       Feedback and Activities sub-tabs are the Batch Sheet, 📊 Weekly Ranking and 💬 Trainee Feedback;
     • ⚙ the certificate signatories and the feedback-draft setting, folded.
   Gone: the stat tiles, each row's days / average / runs / last-active readouts and ⬇ Download Cohort Report (the Batch
   Sheet's ⬇ Download). The 📁 Batch Folders tab ('batches') opens this one.
   Loaded after js/ft-batch-admin.js and js/ft-admin-tidy.js (it reshapes what they draw).
   ============================================================ */
(function(){
"use strict";
if(typeof window.renderAdmin !== "function") return;
const TITLE = "👥 Trainees & Batches";
const frag = html => { const t = document.createElement("template"); t.innerHTML = html; return t; };

// one trainee's row: the name and the actions; under it, Random tasks and the Review only
const __row = window.renderAdminRow;
if(typeof __row === "function") window.renderAdminRow = function(){
  const t = frag(__row.apply(this, arguments));
  const grid = t.content.querySelector(".admin-row-grid");
  if(grid){
    const kids = [...grid.children];
    kids.slice(1, -1).forEach(k => k.remove());   // days, avg, runs, last active
    grid.style.gridTemplateColumns = "minmax(180px,1fr) auto";
  }
  t.content.querySelectorAll(".audit-strip .as-block").forEach(b => {
    const h = ((b.querySelector("b") || {}).textContent || "").trim();
    if(!/^(Random tasks|Review)$/i.test(h)) b.remove();
  });
  return t.innerHTML;
};

// a batch's card (and an archived batch on the shelf): the trainee list, filtered to that batch
const listTo = (k, archived) => {
  state.adminTab = "audit"; state.batchFolder = null; state.adminBatchFilter = k;
  if(archived) state.adminShowArchived = true;
  render();
  setTimeout(() => { const el = document.getElementById("adminRowsWrap"); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); }, 50);
};
window.openBatchFolder = function(k){
  const all = (state.adminData || []).filter(r => (typeof batchKey === "function" ? batchKey(r) : r.batch) === k);
  listTo(k, all.length > 0 && all.every(r => r.archived));
};

const __admin = window.renderAdmin;
window.renderAdmin = function(){
  if(state.adminTab === "batches") state.adminTab = "audit";
  const html = __admin.apply(this, arguments);
  if(state.adminTab !== "audit" || !state.isAdmin || state.traineeId || !state.adminData || state.adminLoading) return html;
  const t = frag(html), c = t.content;
  // the tab's name and what it holds
  c.querySelectorAll(".admin-tab-btn").forEach(b => { if(/Trainee Audit/.test(b.textContent)) b.textContent = TITLE; if(/Batch Folders/.test(b.textContent)) b.remove(); });
  const h1 = [...c.querySelectorAll("h1")].find(h => /Trainee Audit/.test(h.textContent));
  const head = h1 && h1.closest(".audit-page-head");
  if(h1){
    h1.textContent = TITLE;
    const p = head && head.nextElementSibling;
    if(p && p.tagName === "P") p.innerHTML = "Approve new trainees, act on each one (feedback, certificate, attempts, offboarding) and archive or restore batches. Their progress and scores are on the <b>📋 Batch Sheet</b>.";
  }
  // no ⬇ Download Cohort Report and no stat tiles: the Batch Sheet's
  c.querySelectorAll('[onclick="downloadCohortPdf()"]').forEach(b => b.remove());
  c.querySelectorAll(".stat-row").forEach(x => x.remove());
  // ⚙ the settings, folded
  const cert = c.querySelector(".cert-settings"), fb = c.querySelector(".fb-settings");
  if(cert || fb){
    const d = document.createElement("details"); d.className = "card tt-settings";
    d.innerHTML = `<summary>⚙ Certificate signatories &amp; feedback drafts</summary>`;
    (cert || fb).before(d);
    [cert, fb].filter(Boolean).forEach(x => d.appendChild(x));
  }
  // 📁 the batches, under the list: their cards (a card filters the list), the Archive shelf, the offboarded VAs, Drive
  let bf = "";
  if(typeof window.renderAdminBatchFolders === "function"){
    const keep = state.batchFolder; state.batchFolder = null;
    try{ bf = window.renderAdminBatchFolders(); }catch(err){ bf = ""; }
    state.batchFolder = keep;
  }
  if(bf){
    const b = frag(bf).content;
    b.querySelectorAll(".eyebrow").forEach(x => x.remove());
    const bh = [...b.querySelectorAll("h1")].find(h => /Batch Folders/.test(h.textContent));
    if(bh){ const p = bh.nextElementSibling; if(p && p.tagName === "P") p.textContent = "Each batch: open its card to list only its trainees above. Archive a batch when it finishes; its records stay on the Archive shelf."; const h2 = document.createElement("h2"); h2.className = "tt-h"; h2.textContent = "📁 Batches"; bh.replaceWith(h2); }
    const box = document.createElement("section"); box.className = "tt-batches"; box.appendChild(b);
    const root = c.querySelector(".ft-admin-screen") || c;
    root.appendChild(box);
  }
  return t.innerHTML;
};
// the 📁 Batches part redraws when its Drive backups come in (js/ft-batch-admin.js loads them while 'batches' is open)
const __tab = window.setAdminTab;
if(typeof __tab === "function") window.setAdminTab = function(tab){ return __tab.call(this, tab === "batches" ? "audit" : tab); };

const st = document.createElement("style"); st.id = "ft-trainees-tab"; st.textContent = `
.tt-settings{padding:10px 16px;margin:0 0 14px;} .tt-settings > summary{cursor:pointer;font-weight:800;color:var(--navy);}
.tt-settings[open] > summary{margin-bottom:8px;} .tt-settings .card{box-shadow:none;margin:8px 0 0;}
.tt-batches{margin-top:26px;padding-top:6px;border-top:2px solid #E3E6EF;} .tt-h{margin:10px 0 4px;color:var(--navy);font-size:22px;}
`;
document.head.appendChild(st);
})();
