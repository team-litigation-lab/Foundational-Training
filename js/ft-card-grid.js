/* ============================================================
   Lesson cards (Foundational Training only): the cards show Start and ▶ Video Presentation, not the ☰ Topics button
   js/lsh-dashboard.js adds to every course's cards. The grid of buttons with lines and the thick rounded frame
   around every card are in js/lsh-card-frame.js (the same in every LSH course repo), loaded after this file.
   The Training Orientation and Rules card keeps its navy Start, edge to edge.
   ============================================================ */
(function(){
  if(typeof moduleCard !== "function" || moduleCard.__ftOnly) return;
  const __card = moduleCard;
  moduleCard = function(d){
    const html = __card.apply(this, arguments); if(html.indexOf("module-topics-btn") < 0) return html;
    const t = document.createElement("template"); t.innerHTML = html.trim();
    const card = t.content.firstElementChild; if(!card) return html;
    card.querySelectorAll(".module-topics-btn").forEach(n=>n.remove());
    return card.outerHTML;
  };
  moduleCard.__ftOnly = true;
  const st = document.createElement("style"); st.id = "ft-card-grid"; st.textContent = `
.dash-main .module-card.ftr-card > .module-start-btn{margin:auto 0 0 !important;width:auto !important;border:0 !important;border-top:1px solid #D3D7E2 !important;border-radius:0 !important;box-shadow:none !important;padding:12px 10px;font-size:15px;}
`; document.head.appendChild(st);
})();
