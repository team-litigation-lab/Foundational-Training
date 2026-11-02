/* ============================================================
   📈 OVERALL PERFORMANCE — folded into the 📋 Batch Sheet (js/ft-batch-sheet.js)
   ------------------------------------------------------------
   It was its own tab (Admin → 🏅 Scorecard → 📈 Overall Performance): each trainee's daily compliance, each week's final
   average, the Scorecard overall and the Overall %, ranked. The 📋 Batch Sheet shows all of it now — 🏅 Scores carries the
   Daily compliance, the weeks' average, the Overall % and the rank, and 📤 Daily outputs each day's compliance — so there is
   one page for a batch, not two. What stays here: the Google-Sheets look both pages use (.gs-*), FTOverall.open() for an
   old link, which opens the Batch Sheet, and the trainer's dashboard card, which opens it too. An admin on the old tab
   (a saved adminTab "overall") lands on the Batch Sheet.
   ============================================================ */
(function(){
"use strict";
const openSheet = () => { state.adminTab = "batchsheet"; goto("admin"); };
window.FTOverall = { open: openSheet };
const __render = window.render;
window.render = function(){
  if(state.view === "admin" && state.adminTab === "overall") state.adminTab = "batchsheet";
  return __render.apply(this, arguments);
};

// 📋 on a trainer's dashboard (never a trainee's, nor 👁 Trainee view): the batch, on one sheet
(window.LSH_HOME_STATS = window.LSH_HOME_STATS || []).push(function(){
  if(!state.isAdmin || state.adminPreview || state.traineeId) return "";
  return `<div class="card stat gs-dash" onclick="FTOverall.open()" style="cursor:pointer;" title="Every trainee of the batch on one sheet: Drive links, lessons, day by day, Practice Lab, scores, daily outputs and recent progress">
    <div class="num">📋</div><div class="lbl">Batch Sheet<span style="display:block;font-weight:400;margin-top:2px;">Progress · scores · daily outputs · rank</span></div></div>`;
});

(function(){ const s = document.createElement("style"); s.id = "ft-overall"; s.textContent = `
/* Google Sheets' look: Arial, grey headers, light gridlines, a blue selection, the sheet tabs at the foot */
.gs-card{padding:0;overflow:hidden;font-family:Arial,'Roboto',sans-serif;}
.gs-top{display:flex;align-items:center;gap:12px;padding:10px 14px 6px;background:#F9FBFD;}
.gs-logo{font-size:26px;}
.gs-file{display:flex;flex-direction:column;gap:2px;} .gs-file b{font:400 18px Arial,sans-serif;color:#1F1F1F;}
.gs-menu{display:flex;gap:2px;} .gs-menu button{border:0;background:none;font:14px Arial,sans-serif;color:#1F1F1F;padding:3px 7px;border-radius:4px;cursor:pointer;} .gs-menu button:hover{background:#E8EAED;}
.gs-batch{margin-left:auto;font:13px Arial,sans-serif;color:#444746;display:flex;align-items:center;gap:6px;}
.gs-batch select{font:14px Arial,sans-serif;padding:5px 8px;border:1px solid #C4C7C5;border-radius:4px;background:#fff;}
.gs-fbar{display:flex;align-items:stretch;border-top:1px solid #E1E3E1;border-bottom:1px solid #E1E3E1;background:#fff;font:13px Arial,sans-serif;}
.gs-ref{min-width:70px;padding:6px 10px;border-right:1px solid #E1E3E1;color:#1F1F1F;}
.gs-fx{padding:6px 10px;color:#80868B;font-style:italic;border-right:1px solid #E1E3E1;}
#gsBar{flex:1 1 auto;border:0;padding:6px 10px;font:inherit;color:#1F1F1F;background:#fff;outline:none;min-width:0;}
.gs-wrap{overflow:auto;max-height:62vh;background:#fff;}
.gs{border-collapse:separate;border-spacing:0;font:13px Arial,sans-serif;color:#1F1F1F;}
.gs th,.gs td{border-right:1px solid #E2E3E3;border-bottom:1px solid #E2E3E3;padding:4px 8px;white-space:nowrap;height:21px;}
.gs-letters th{position:sticky;top:0;z-index:3;background:#F8F9FA;color:#5F6368;font-weight:400;font-size:12px;text-align:center;min-width:90px;}
.gs-head th{position:sticky;top:30px;z-index:3;background:#F8F9FA;font-weight:700;text-align:center;white-space:normal;min-width:90px;max-width:160px;line-height:1.25;}
.gs-corner,.gs-rn{position:sticky;left:0;z-index:4;background:#F8F9FA !important;color:#5F6368;font-weight:400 !important;font-size:12px;text-align:center;width:40px;min-width:40px !important;}
.gs-corner{top:0;z-index:5;}
.gs .gs-frz{position:sticky;left:41px;z-index:2;background:#fff;box-shadow:2px 0 0 #C4C7C5;}
.gs-letters .gs-frz,.gs-head .gs-frz{z-index:4;background:#F8F9FA;}
.gs-name{font-weight:700;min-width:190px;}
.gs-num{text-align:right;} .gs-rank{text-align:center;font-weight:700;color:#B5651F;}
.gs-calc{background:#F1F3F4;} .gs-bold{font-weight:700;}
.gs-hi{color:#137333;} .gs-mid{color:#B06000;} .gs-lo{color:#C5221F;}
.gs-txt{white-space:normal !important;min-width:240px;max-width:380px;}
.gs td{cursor:cell;outline:none;} .gs td.gs-sel{box-shadow:inset 0 0 0 2px #1A73E8;}
.gs-empty td{background:#fff;}
.gs-tabs{display:flex;gap:2px;padding:4px 8px;background:#F8F9FA;border-top:1px solid #E1E3E1;overflow-x:auto;}
.gs-tabs button{border:0;background:none;padding:7px 16px;font:500 13px Arial,sans-serif;color:#444746;border-radius:6px 6px 0 0;cursor:pointer;white-space:nowrap;}
.gs-tabs button.on{background:#fff;color:#188038;box-shadow:inset 0 -3px 0 #188038;font-weight:700;}
.gs-tabs button.off{color:#9AA0A6;}
.gs-none{margin:16px;padding:14px;border:1px dashed #C4C7C5;border-radius:8px;background:#F8F9FA;display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
.gs-draft{margin:8px 14px 0;font-size:13px;background:#FFF7ED;border:1px solid #F4B77A;border-radius:6px;padding:6px 10px;}
.gs-card .sc-how,.gs-card .sc-empty{margin:10px 14px;}
`; document.head.appendChild(s); })();
})();
