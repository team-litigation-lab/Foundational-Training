/* ============================================================
   Lesson cards: the buttons as one full-width grid with lines (like the EA/PA day cards).
   Start (or Review) fills the top row edge to edge; ▶ Video Presentation fills the row under it.
   Thin lines separate the cells, like a table, instead of separate rounded buttons with gaps.
   The Training Orientation and Rules card keeps its navy Start, also edge to edge.
   Loaded after js/lsh-dashboard.js, so it wraps the finished card.
   ============================================================ */
(function(){
  if(typeof moduleCard !== "function" || moduleCard.__grid) return;
  const __card = moduleCard;
  moduleCard = function(d){
    const html = __card.apply(this, arguments), t = document.createElement("template"); t.innerHTML = html.trim();
    const card = t.content.firstElementChild; if(!card) return html;
    const start = card.querySelector(".module-start-btn"); if(!start) return html;
    card.querySelectorAll(".module-topics-btn").forEach(n=>n.remove());   // FT cards show Start and Video only
    const grid = document.createElement("div"); grid.className = "mc-grid";
    start.before(grid); grid.appendChild(start);
    [...card.querySelectorAll(":scope > .mc-row > button, :scope > .module-finish-btn")].forEach(b=>grid.appendChild(b));
    card.querySelectorAll(":scope > .mc-row").forEach(n=>n.remove());
    grid.classList.add("mc-n" + grid.querySelectorAll(":scope > button:not(.module-start-btn)").length);
    return card.outerHTML;
  };
  moduleCard.__grid = true;
  const line = "#D3D7E2", thick = "1px";   // the gridlines between the cells: thin lines, visible on the white card
  const frame = "#D6DAE5";                  // the thick rounded frame around the card (like the EA/PA day cards)
  const st = document.createElement("style"); st.id = "ft-card-grid"; st.textContent = `
/* gridlines: a thick rounded frame around the card and a thin line between every cell (header | middle | Start | bottom row) */
.dash-main .module-card.mc-clean, .dash-main .module-card.ftr-card{border:8px solid ${frame} !important;border-radius:22px !important;}
.dash-main .module-card.mc-clean:hover, .dash-main .module-card.ftr-card:hover{border-color:#CCD1DE !important;}
.dash-main .module-card.mc-clean .module-head, .dash-main .module-card.ftr-card .module-head{border-bottom:${thick} solid ${line} !important;}
.dash-main .module-card.mc-clean > .mc-grid{display:grid;grid-template-columns:repeat(2,1fr);margin:auto 0 0 !important;border-top:${thick} solid ${line};}
.dash-main .module-card.mc-clean .mc-grid > button{margin:0 !important;width:auto !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:1;}
.dash-main .module-card.mc-clean .mc-grid > .module-start-btn{grid-column:span 2;padding:12px 10px;font-size:15px;background:#F3F4F8;color:var(--navy);font-weight:700;}
.dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn){grid-column:span 2;padding:9px 6px;font-size:12.5px;background:#fff;color:#4A5070;font-weight:600;border-top:${thick} solid ${line} !important;}
.dash-main .module-card.mc-clean .mc-grid.mc-n2 > button:not(.module-start-btn){grid-column:span 1;}
.dash-main .module-card.mc-clean .mc-grid.mc-n2 > button:not(.module-start-btn):not(:last-child){border-right:${thick} solid ${line} !important;}
.dash-main .module-card.mc-clean .mc-grid > .module-start-btn:not(:disabled):hover, .dash-main .module-card.mc-clean:hover .mc-grid > .module-start-btn:not(:disabled){background:#353B57;color:#fff;}
.dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn):not(:disabled):hover{background:#F3F4F8;color:var(--navy);}
.dash-main .module-card.mc-clean .mc-grid > button:disabled{background:#F7F8FB;color:#9AA0B4;cursor:not-allowed;}
.dash-main .module-card.ftr-card > .module-start-btn{margin:auto 0 0 !important;width:auto !important;border:0 !important;border-top:${thick} solid ${line} !important;border-radius:0 !important;box-shadow:none !important;padding:12px 10px;font-size:15px;}
@media(max-width:1600px){ .dash-main .module-card.mc-clean .mc-grid > button:not(.module-start-btn){font-size:11.5px;padding:8px 4px;} }
`; document.head.appendChild(st);
})();
