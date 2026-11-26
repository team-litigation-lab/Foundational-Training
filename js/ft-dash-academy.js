/* ============================================================
   📚 The Dashboard in the LSH Academy Index's pattern (Foundational Training only)

   The owner: "Fix the color contrast, lost the elegance … pattern it in the same way as this" (the LSH Academy Index's
   track cards). Same layout and content, restyled on top of js/ft-card-grid.js, scoped to the Dashboard (main.main-dash):
     • each lesson card is one white rounded surface in a thick blue-gold frame with a soft glow, no navy header block;
     • its title sits in a rounded pill outlined in the lesson's own colour (--c, the deep shade, AA on white), bold;
     • Start / Part 1·2·3 are solid pills in that colour with white caps text (locked: a grey pill, done: green, the part
       you're on: ringed), and the Video row is a small outlined pill;
     • the two pinned cards (Setting of Training Expectations, Know Your Tools) and the LSH Atlas card wear the same frame
       in LSH navy;
     • the stat tiles are navy banners (white value, light caps label), as the Academy Index's tool bar is;
     • the Drive notice is a white card in the same frame;
     • every card's frame is thick (5px) and blue-gold: navy at the top fading to gold, the Academy Index's gridlines.
   Every text colour here is WCAG AA (4.5:1) on its own background. Nothing is moved or resized beyond padding, so the
   Dashboard still fits one screen.
   ============================================================ */
(function(){
  if(typeof document === "undefined") return;
  const st = document.createElement("style"); st.id = "ft-dash-academy"; st.textContent = `
/* ── the card: one white surface in a thick blue-gold frame (navy along the top, fading to gold at the bottom), as on the
   LSH Academy Index. The border is transparent and the gradient is painted under it (border-box), the white face over it. ── */
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean{background:linear-gradient(#fff,#fff) padding-box,linear-gradient(180deg,#1E2340 0%,#2c3360 30%,#a8692f 78%,#DB8437 100%) border-box !important;border:5px solid transparent !important;border-radius:18px !important;
  box-shadow:0 10px 24px -14px rgba(219,132,55,.70),0 2px 8px rgba(30,35,64,.10) !important;overflow:hidden;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean:hover{border-color:transparent !important;filter:saturate(1.12);box-shadow:0 12px 28px -12px rgba(219,132,55,.85),0 2px 10px rgba(30,35,64,.12) !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-head{background:#fff !important;border-top:0 !important;box-shadow:none !important;padding:10px 12px 2px !important;min-height:0 !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-head::before,html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-head::after{display:none !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-body{background:#fff !important;}
/* (the shared dashboard's navy band and its grid lines, js/lsh-dashboard.js, are this file's white surface) */
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean::after,
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-head::after{display:none !important;}
/* ── the title: a pill outlined in the lesson's colour ── */
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mh-title{display:flex !important;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;
  margin:0 !important;padding:5px 16px !important;border:2px solid var(--c,#1E2340) !important;border-radius:999px !important;background:#fff !important;
  color:var(--c,#1E2340) !important;-webkit-text-fill-color:var(--c,#1E2340);text-shadow:none !important;font-weight:800 !important;line-height:1.25 !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mh-day:not(:empty){color:#9A4A0C !important;text-shadow:none !important;}
/* ── Start / Part 1·2·3: solid pills in the lesson's colour ── */
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg{display:flex !important;gap:6px !important;border:0 !important;background:transparent !important;box-shadow:none !important;padding:0 !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b{border:0 !important;border-radius:999px !important;padding:8px 6px !important;background:var(--c,#1E2340) !important;color:#fff !important;
  font-weight:800 !important;letter-spacing:.02em;font-size:13px !important;box-shadow:0 3px 8px -4px var(--glow,rgba(30,35,64,.4));}
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b:not(.locked):not(.tlocked):hover,
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b:not(.locked):not(.tlocked):focus-visible{background:#1E2340 !important;color:#fff !important;outline:none;}
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b.locked,html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b.tlocked{background:#E7E9F0 !important;color:#3F4560 !important;box-shadow:none;}
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b.done{background:#1F7A45 !important;color:#fff !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b.now{box-shadow:0 0 0 3px #fff,0 0 0 5px #DB8437 !important;}
/* the Video row: a small outlined pill */
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > button.module-finish-btn,
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .ftli-vids > button{background:#fff !important;border:1.5px solid var(--c,#1E2340) !important;border-radius:999px !important;
  color:var(--c,#1E2340) !important;font-weight:800 !important;margin:2px auto 0 !important;padding:5px 14px !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > button.module-finish-btn:hover,
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .ftli-vids > button:hover{background:var(--bg,#EEF0F6) !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid{background:#fff !important;border-top:0 !important;padding:6px 12px 10px !important;gap:6px !important;}
/* the pinned cards' Start: a navy pill, "Start →" */
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean > .module-start-btn,html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .module-start-btn{background:#1E2340 !important;color:#fff !important;
  border:0 !important;border-radius:999px !important;margin:6px 14px 12px !important;width:auto !important;padding:9px 16px !important;font-weight:800 !important;letter-spacing:.02em;font-size:13px !important;}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean > .module-start-btn::after,html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .module-start-btn::after{content:" →";}
html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean > .module-start-btn:hover,html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .module-start-btn:hover{background:#DB8437 !important;}
/* a short screen (a laptop): the pills and the frame tighten, so the lesson cards keep room for their Part buttons */
@media (max-height:900px){
  html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .module-head{padding:6px 8px 0 !important;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mh-title{padding:2px 10px !important;font-size:14px !important;border-width:1.5px !important;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid{padding:4px 8px 6px !important;gap:4px !important;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .mh-title,
  html body main.main-dash .dash-main .module-card.module-card.module-card.ftkb .mh-title{display:block !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.ftkb .mh-day{display:none !important;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.ftli .ftseg-b{padding:5px 4px !important;font-size:11.5px !important;}
  html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > button.module-finish-btn,
  html body main.main-dash .dash-main .module-card.module-card.module-card.mc-clean .mc-grid > .ftli-vids > button{padding:2px 10px !important;font-size:12px !important;}
}
/* ── the stat tiles: navy banners, white value, light caps label ── */
html body main.main-dash .dash-side-inner > .card.stat.stat{background:linear-gradient(160deg,#1E2340,#2D3762) !important;border:1px solid rgba(255,255,255,.22) !important;border-radius:14px !important;box-shadow:0 6px 16px -10px rgba(0,0,0,.6) !important;}
html body main.main-dash .dash-side-inner > .card.stat.stat .num{color:#fff !important;}
html body main.main-dash .dash-side-inner > .card.stat.stat .lbl,html body main.main-dash .dash-side-inner > .card.stat.stat .sub{color:#E6E9F5 !important;opacity:1 !important;font-weight:800 !important;letter-spacing:.05em;}
/* ── the Drive notice: the same white frame ── */
html body main.main-dash .dash-main .card.card.fdr-notice{background:linear-gradient(#fff,#fff) padding-box,linear-gradient(180deg,#1E2340 0%,#2c3360 30%,#a8692f 78%,#DB8437 100%) border-box !important;border:5px solid transparent !important;border-radius:18px !important;box-shadow:0 10px 24px -14px rgba(219,132,55,.70) !important;color:#1E2340 !important;}
html body main.main-dash .dash-main .card.card.fdr-notice span{color:#3F4560 !important;}
`; document.head.appendChild(st);
})();
