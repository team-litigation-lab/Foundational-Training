/* ============================================================
   Lesson cards (Foundational Training only): sizes the lesson icon to fill the room between
   the title and the buttons, the way the other LSH courses' theme line does. Buttons
   themselves (Start / Topics / Finish Training / Video) are left as js/lsh-dashboard.js and
   js/lsh-card-frame.js (the same in every LSH course repo) build them.
   ============================================================ */
(function(){
  const st = document.createElement("style"); st.id = "ft-card-grid"; st.textContent = `
/* The lesson's icon fills the room between the title and the buttons. js/lsh-dashboard.js
   sizes it for a card that also carries a theme line; these cards show the icon alone,
   so it is larger here, and still steps down in a short card the way that file sets out. */
.dash-main .module-card .module-body{display:flex;flex-direction:column;align-items:center;justify-content:center;}
.dash-main .module-card.mc-clean .module-icon{font-size:46px;margin:0;}
@container (max-height:120px){ .dash-main .module-card.mc-clean .module-icon{font-size:30px;} }
@container (max-height:40px){ .dash-main .module-card.mc-clean .module-icon{font-size:20px;} }
@container (max-height:26px){ .dash-main .module-card.mc-clean .module-icon{display:none;} }
.dash-main .module-card.ftr-card > .module-start-btn{margin:auto 0 0 !important;width:auto !important;border:0 !important;border-top:1px solid #D3D7E2 !important;border-radius:0 !important;box-shadow:none !important;padding:12px 10px;font-size:15px;}
`; document.head.appendChild(st);
})();
