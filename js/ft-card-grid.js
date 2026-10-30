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
/* Each lesson card wears a hint of its own colour, the same one its role has on the Knowledge Base card: the
   rule above the title, the Start / Part buttons and the Video row. Text stays the dark shade (AA on white and
   on the tint); done (green), locked (grey) and the part you're on keep their own look. */
#dayl-1{--c:#1E4FA8;--bg:#DCE7FB;--glow:rgba(30,79,168,.30);}
#dayl-2{--c:#0B5F7A;--bg:#D3EDF6;--glow:rgba(11,95,122,.30);}
#dayl-3{--c:#0F6E5C;--bg:#D3F1E6;--glow:rgba(15,110,92,.30);}
#dayl-5{--c:#8A3A00;--bg:#FCE3CF;--glow:rgba(200,98,20,.32);}
#dayl-6{--c:#6B2A9E;--bg:#ECDDFA;--glow:rgba(107,42,158,.30);}
#dayl-7{--c:#A1173F;--bg:#FBDCE5;--glow:rgba(161,23,63,.30);}
#dayl-8{--c:#5C4A00;--bg:#F8EBB5;--glow:rgba(170,135,0,.34);}
.dash-main .module-card.mc-clean.ftli .module-head{border-top-color:var(--c,#4A5277) !important;}
.dash-main .module-card.ftli .ftseg{border-color:var(--c,#9CA3B8);background:linear-gradient(180deg,#fff -30%,var(--bg,#fff) 100%);box-shadow:0 2px 6px -2px var(--glow,rgba(38,43,69,.10));}
.dash-main .module-card.ftli .ftseg-b{border-left-color:var(--c,#9CA3B8);}
.dash-main .module-card.ftli .ftseg-b:not(.done):not(.locked):not(.tlocked):not(.now){color:var(--c,#1E2340);}
.dash-main .module-card.ftli .ftseg-b:not(.done):not(.locked):not(.tlocked):hover,
.dash-main .module-card.ftli .ftseg-b:not(.done):not(.locked):not(.tlocked):focus-visible,
.dash-main .module-card.ftli .ftseg-b.now:not(.done){background:var(--c,#1E2340);color:#fff;}
.dash-main .module-card.mc-clean.ftli .mc-grid > button:not(.module-start-btn):not(:disabled){background:linear-gradient(180deg,rgba(255,255,255,.85) 0%,var(--bg,#fff) 160%);color:var(--c,#353B57);}
.dash-main .module-card.mc-clean.ftli .mc-grid > button:not(.module-start-btn):not(:disabled):hover{background:var(--bg,#F3F4F8);color:var(--c,#1E2340);}
`; document.head.appendChild(st);
})();
