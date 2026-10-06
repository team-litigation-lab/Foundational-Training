/* ============================================================
   LSH course cards: the same file in every LSH course repo (Foundational-Training, EA-PA-TRAINING,
   Case-Management-Training, medsumanddemandtraining, propertydamageclaimstraining). Change it in all of them.
   - Day cards: the buttons as one full-width grid with thin lines, like a table. Start (or Review) fills the top row
     edge to edge; the small buttons (☰ Topics and ✓ Finish Training, ▶ Video Presentation, or 👁 Review Score and
     🔁 Retake) share the row under it, with a line between them.
   - Every card gets a thick rounded frame (8px, light grey), with the thin lines between the cells inside it: the day
     cards and every other card on a page (Simulators, Activities, Practice Lab, handouts, notes). Boxes nested inside
     a card or a lesson slide, the modals and the small progress tiles keep their own look.
   Loaded last, after js/lsh-dashboard.js (and a course's own card files, e.g. ft-card-grid.js).
   ============================================================ */
(function(){
  if(typeof moduleCard === "function" && !moduleCard.__grid){
    const __card = moduleCard;
    moduleCard = function(d){
      const html = __card.apply(this, arguments), t = document.createElement("template"); t.innerHTML = html.trim();
      const card = t.content.firstElementChild; if(!card) return html;
      const start = card.querySelector(":scope > .module-start-btn"); if(!start || card.querySelector(".mc-grid")) return html;
      const grid = document.createElement("div"); grid.className = "mc-grid";
      start.before(grid); grid.appendChild(start);
      [...card.querySelectorAll(":scope > .mc-row > button, :scope > .module-review-row > button, :scope > .module-finish-btn")].forEach(b=>grid.appendChild(b));
      card.querySelectorAll(":scope > .mc-row, :scope > .module-review-row").forEach(n=>n.remove());
      grid.classList.add("mc-n" + grid.querySelectorAll(":scope > button:not(.module-start-btn)").length);
      return card.outerHTML;
    };
    moduleCard.__grid = true;
  }
  const line = "#D3D7E2";   // the thin lines between a day card's cells
  const frame = "#D6DAE5";  // the thick rounded frame around every card
  const st = document.createElement("style"); st.id = "lsh-card-frame"; st.textContent = `
/* the frame: every card on a page (not a box inside a card or a slide, not a modal, not the small progress tiles) */
main .card:not(.card .card):not(.stat):not(.module-card):not(.topics-modal):not(.overlay *):not(.dash-side *):not(.lesson-stage *):not(.lesson-slide *):not(#lessonSlideWrap *),
.dash-main .module-card{border:8px solid ${frame} !important;border-radius:22px !important;}
main .card:not(.card .card):not(.stat):not(.module-card):not(.topics-modal):not(.overlay *):not(.dash-side *):not(.lesson-stage *):not(.lesson-slide *):not(#lessonSlideWrap *):hover,
.dash-main .module-card:hover{border-color:#CCD1DE !important;}
/* a day card: thin lines between the header, the middle and the button cells */
.dash-main .module-card .module-head{border-bottom:1px solid ${line} !important;}
.dash-main .module-card.mc-clean > .mc-grid{display:grid;grid-template-columns:repeat(2,1fr);margin:auto 0 0 !important;border-top:1px solid ${line};}
.dash-main .module-card.mc-clean .mc-grid > button{margin:0 !important;width:auto !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:1;flex:none;}
.dash-main .module-card.mc-clean .mc-grid > .module-start-btn{grid-column:span 2;padding:12px 10px;font-size:15px;background:#F3F4F8;color:var(--navy);font-weight:700;}
.dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn){grid-column:span 2;padding:9px 6px;font-size:12.5px;background:#fff;color:#4A5070;font-weight:600;border-top:1px solid ${line} !important;}
.dash-main .module-card.mc-clean .mc-grid.mc-n2 > button:not(.module-start-btn){grid-column:span 1;}
.dash-main .module-card.mc-clean .mc-grid.mc-n2 > button:not(.module-start-btn):not(:last-child){border-right:1px solid ${line} !important;}
.dash-main .module-card.mc-clean .mc-grid > .module-start-btn:not(:disabled):hover, .dash-main .module-card.mc-clean:hover .mc-grid > .module-start-btn:not(:disabled){background:#353B57;color:#fff;}
.dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn):not(:disabled):hover{background:#F3F4F8;color:var(--navy);}
.dash-main .module-card.mc-clean .mc-grid > button:disabled{background:#F7F8FB;color:#9AA0B4;cursor:not-allowed;}
.dash-main .module-card.mc-clean .mc-grid .module-topics-btn span{color:#6B7088;font-weight:700;margin-left:2px;}
@media(max-width:1600px){ .dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn){font-size:11.5px;padding:8px 4px;} }
`; document.head.appendChild(st);
})();
