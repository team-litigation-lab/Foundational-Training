/* ============================================================
   ⭐ SCORES IN POINTS (1–5) — every score on the scorecards is shown out of 5: the percentage ÷ 20 (100% = 5.0, 80% = 4.0,
   60% = 3.0, the passing mark; 5 is the highest). The scores themselves are kept as they are (percentages, in the records and
   the CSV downloads); only what is on screen is shown in points.
   Each score has a pop-up (hover, or tap on a phone): how it was worked out (the cell's own explanation), its percentage, and
   either what to improve (the row's details) or a congratulatory word when it is in good standing.
   Where: the 📋 Batch Sheet / 🏅 Scorecard (every table, the trainee's page and its week figures), 🏅 Scorecards, and a
   trainee's own 📋 My Progress & Performance. A cell whose whole text is a percentage ("84%", "✓ 84%") is a score.
   ============================================================ */
(function(){
"use strict";
const SCOPE = ".bs-card, #bs-scorecard, .sc-admin, .sc-tbl, .bs-pt-t, .bs-sum, .main-dash, .bs-kdw, .bs-pt-head";
const RE = /^(✓\s*)?(\d{1,3}(?:\.\d+)?)\s*%$/;
const PASS = 3;
const pts = pct => Math.max(0, Math.min(5, pct / 20));
const fmt = p => (Math.round(p * 10) / 10).toFixed(1);
const clip = (t, n) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
// 🗒 what the score is about: the row's own words (its details cell), for "what to improve"
function rowWhy(el){
  const tr = el.closest("tr"); if(!tr) return "";
  const cells = [...tr.children].filter(c => c !== el && !c.contains(el));
  const last = cells[cells.length - 1];
  const t = last && last !== cells[0] ? clip(last.textContent, 260) : "";
  return RE.test(t) ? "" : t;
}
function insight(p, why){
  if(p >= 4.5) return "🎉 Excellent: keep doing exactly this.";
  if(p >= 4) return "👏 Great standing: keep it up." + (why ? ` To make it perfect: ${why}` : "");
  if(p >= PASS) return "✓ Passing (3 is the pass mark)." + (why ? ` To move up: ${why}` : " Aim for 4 or more.");
  return "⚠ Below the pass mark of 3: this needs work." + (why ? ` Focus on: ${why}` : "");
}
function convert(root){
  (root || document).querySelectorAll(SCOPE).forEach(box => {
    box.querySelectorAll("td, th, span, b, em, strong, div, small").forEach(el => {
      if(el.dataset.ftPts || el.children.length || el.closest("input, textarea, select, button.btn")) return;
      const m = RE.exec(el.textContent.trim()); if(!m) return;
      const pct = Number(m[2]); if(!isFinite(pct) || pct > 100) return;
      const p = pts(pct), how = el.getAttribute("title") || (el.parentElement && el.parentElement.children.length === 1 && el.parentElement.getAttribute("title")) || "";
      el.dataset.ftPts = String(pct);
      el.textContent = (m[1] || "") + fmt(p) + "/5";
      el.title = [how ? "How it was worked out: " + how.replace(/\n+/g, " ") : "How it was worked out: the average of the scores counted here.",
        `${Math.round(pct)}% = ${fmt(p)} out of 5 (the percentage ÷ 20; 3 is passing, 5 the highest).`, insight(p, rowWhy(el))].join("\n");
      el.classList.add("ft-pts", p >= 4 ? "ft-pts-hi" : p >= PASS ? "ft-pts-ok" : "ft-pts-lo");
    });
  });
}
let queued = false;
const run = () => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; try{ convert(document); }catch(err){} }); };
const was = window.afterRender;
window.afterRender = function(){ const out = typeof was === "function" ? was.apply(this, arguments) : undefined; run(); return out; };
// (parts drawn after the page — a trainee picked, a table loaded — are converted too)
try{ new MutationObserver(run).observe(document.body || document.documentElement, {childList: true, subtree: true}); }catch(err){}
window.FTPoints = {convert, pts, fmt, insight};
const st = document.createElement("style"); st.id = "ft-points"; st.textContent = `.ft-pts{cursor:help;white-space:nowrap;} .ft-pts:hover{text-decoration:underline dotted;}`;
document.head.appendChild(st);
})();
