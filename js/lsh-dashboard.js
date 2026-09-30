/* ============================================================
   LSH course dashboard layout: the same file in every LSH course repo
   (Case-Management-Training, medsumanddemandtraining, propertydamageclaimstraining,
   Foundational-Training; EA-PA-TRAINING has the same layout built in). Change it in all of them.
   - Compact banner (smaller ribbon, heading and day circles), with the heading and tagline auto-fitted.
   - Day cards: five across, Start / Topics / Finish Training, with the day's icon and theme in the middle.
     On a laptop or desktop they grow into the height that's left, so the dashboard fills the screen
     with no empty space under it.
   - Progress stats: one small band right under the day cards (not a side column, not above the days).
   - Top bar: the Legal Support Help logo for dark backgrounds.
   Loaded last, after the course's own update files.
   ============================================================ */
(function(){
  /* 1. Day cards: Start, Topics (the pop-up list) and Finish Training, like the EA/PA course. */
  if(typeof moduleCard === "function" && !moduleCard.__clean){
    const __card = moduleCard;
    moduleCard = function(d){
      const html = __card(d), t = document.createElement("template"); t.innerHTML = html.trim();
      const card = t.content.firstElementChild; if(!card) return html;
      card.querySelectorAll(".module-topic-list, .module-more").forEach(n=>n.remove());
      const n = (d.lessons||[]).length, start = card.querySelector(".module-start-btn");
      if(n && start && typeof showDayTopics === "function") start.insertAdjacentHTML("afterend", `<button type="button" class="btn btn-ghost btn-sm module-finish-btn module-topics-btn" onclick="event.stopPropagation(); showDayTopics(${d.id})">☰ Topics <span>· ${n}</span></button>`);
      card.classList.add("mc-clean");
      return card.outerHTML;
    };
    moduleCard.__clean = true;
  }
  /* 2. The day's icon and theme fill the middle of the card. */
  if(typeof moduleCard === "function" && !moduleCard.__theme){
    const __card2 = moduleCard;
    moduleCard = function(d){
      const html = __card2(d); if(html.indexOf("module-theme") >= 0 || !d.theme) return html;
      const t = document.createElement("template"); t.innerHTML = html.trim();
      const card = t.content.firstElementChild; if(!card) return html;
      let body = card.querySelector(".module-body");
      if(!body){ const head = card.querySelector(".module-head"); if(!head) return html; head.insertAdjacentHTML("afterend", `<div class="module-body"></div>`); body = card.querySelector(".module-body"); }
      if(!body.querySelector(".module-icon") && typeof DAY_ICONS !== "undefined" && DAY_ICONS[d.id]) body.insertAdjacentHTML("afterbegin", `<div class="module-icon">${DAY_ICONS[d.id]}</div>`);
      body.insertAdjacentHTML("beforeend", `<div class="module-theme">${esc(d.theme)}</div>`);
      return card.outerHTML;
    };
    moduleCard.__clean = true; moduleCard.__theme = true;
  }
  /* 3. The progress stats sit in one small band right under the day cards. */
  if(typeof renderDashboard === "function" && !renderDashboard.__band){
    const __dash = renderDashboard;
    renderDashboard = function(){
      const html = __dash.apply(this, arguments);
      const t = document.createElement("template"); t.innerHTML = html;
      const side = t.content.querySelector(".dash-side"), grid = t.content.querySelector(".dash-main .module-grid");
      if(!side || !grid) return html;
      grid.after(side);
      /* an action row with nothing in it (no Resume or Certificate yet) isn't drawn as an empty box */
      t.content.querySelectorAll(".dash-main .bottom-actions").forEach(el => { if(!el.children.length) el.remove(); });
      return t.innerHTML;
    };
    renderDashboard.__band = true;
  }
  /* 4. Top bar: the Legal Support Help logo (the course's full logo). */
  if(typeof brandMark === "function" && typeof LOGO_FULL_SRC !== "undefined"){
    brandMark = function(){ return `<img class="brand-mark brand-logo" src="${LOGO_FULL_SRC}" alt="Legal Support Help">`; };
  }
  /* 5. The banner heading and tagline each fit on one line at the compact sizes. */
  if(typeof fitHeroText === "function"){
    fitHeroText = function(){
      const hs = [document.querySelector(".dash-hero h1"), document.querySelector(".dash-hero p:not(.eyebrow)")];
      if(window.innerWidth < 1200){ hs.forEach(el=>{ if(el){ el.style.removeProperty("font-size"); el.style.removeProperty("white-space"); } }); return; }
      const fit = (el, max, min)=>{
        if(!el) return;
        el.style.whiteSpace = "nowrap"; el.style.setProperty("font-size", max+"px", "important");
        let size = max;
        while(el.scrollWidth > el.clientWidth + 1 && size > min){ size -= 0.5; el.style.setProperty("font-size", size+"px", "important"); }
        if(el.scrollWidth > el.clientWidth + 1){ el.style.setProperty("font-size", max+"px", "important"); el.style.whiteSpace = "normal"; }
      };
      fit(hs[0], 29, 16); fit(hs[1], 14, 11);
    };
  }
  const st = document.createElement("style"); st.id = "lsh-dashboard"; st.textContent = `
/* Compact dashboard banner, so Days 1–5 fit on one screen under it (laptops and up; phones keep the layout above). */
@media(min-width:761px){
  main.main-dash{padding-top:12px;}
  .dash-top{padding:16px 26px 10px !important;margin-bottom:8px !important;border-radius:16px;}
  .dash-hero{grid-template-columns:66px minmax(0,1fr) !important;gap:18px !important;margin-bottom:8px !important;}
  .dash-hero-ribbon svg{max-width:66px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.3));}
  .dash-top .eyebrow{font-size:11px !important;padding:3px 10px !important;margin:0 0 6px !important;letter-spacing:.14em;}
  .dash-hero h1{font-size:clamp(20px, 1.8vw, 29px) !important;line-height:1.2 !important;margin:0 0 5px !important;}
  .dash-hero p{font-size:13.5px !important;line-height:1.45 !important;max-width:none;}
  .dash-top .step-timeline{padding:9px 0 2px !important;}
  .dash-top .step-circle{width:32px;height:32px;font-size:13.5px;border-width:2px;}
  .dash-top .step-dash{width:24px;margin:0 3px;}
  /* Days 1–5 in one row, compact cards */
  .dash-layout{gap:14px;}
  .dash-main .module-grid{grid-template-columns:repeat(5,minmax(0,1fr)) !important;gap:12px;}
  .dash-main .module-head{min-height:0;padding:7px 8px 8px;}
  .dash-main .mh-day{font-size:9.5px;margin-bottom:1px;}
  .dash-main .mh-title{font-size:11.5px;line-height:1.2;}
  .dash-main .module-body{padding:8px 12px 4px;}
  .dash-main .module-icon{font-size:18px;margin:0 0 6px;}
  .dash-main .module-topic-list li{font-size:12px;line-height:1.35;margin-bottom:3px;}
  .dash-main .module-topic-list li::before{top:5px;}
  .dash-main .module-more{font-size:11.5px;margin:2px 0 0;padding:2px 0;}
  .dash-main .module-start-btn{margin:0 12px 8px;width:calc(100% - 24px);padding:7px;}
  .dash-main .module-finish-btn,.dash-main .module-review-row{margin:0 12px 10px;}
  .dash-main .module-finish-btn{width:calc(100% - 24px);padding:4px;font-size:11px;}
}
@media(min-width:761px) and (max-width:1100px){
  .dash-main .module-grid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr)) !important;}
}
/* Dashboard progress stats: one small band UNDER the day cards, so the day cards get the full width
   (the numbers, then the Feedback and Ranking cards, in one row on a laptop or desktop). */
@media(min-width:761px){
  .dash-layout{grid-template-columns:minmax(0,1fr) !important;gap:12px;}
  .dash-side{padding:6px 10px;}
  .dash-side-inner{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) repeat(2,minmax(0,1.7fr));gap:8px;align-items:stretch;position:static;}
  .dash-side-inner > *{margin:0 !important;}
  .dash-side-inner > .card.stat{grid-column:auto;padding:5px 10px;display:flex;flex-direction:column;justify-content:center;}
  .dash-side .stat .num{font-size:15px;line-height:1.1;}
  .dash-side .stat .lbl{font-size:8.5px;letter-spacing:.05em;line-height:1.25;margin-top:2px;}
  .dash-side .stat .lbl span{font-size:8.5px;text-transform:none;letter-spacing:0;margin-top:2px !important;}
  .dash-side .tfb-dash, .dash-side .rank-card, .dash-side .cert-dash, .dash-side .comp-card{padding:5px 10px;}
  .dash-side .tfb-dash .sub, .dash-side .rank-card .sub, .dash-side .comp-card .sub, .dash-side .cert-dash .sub{font-size:10px;line-height:1.3;margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .dash-side .tfb-dash .btn, .dash-side .cert-dash .btn{padding:2px 9px;font-size:10.5px;}
  .dash-side .rank-list{margin:3px 0 0;}
  .dash-side .rank-list li{padding:1px 6px;font-size:10.5px;}
  .dash-side .rank-card .num{font-size:13px;}
  .dash-side .rank-card .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:2px 0 0;}
  .dash-side .tfb-dash .sub{margin:1px 0 3px !important;}
  .dash-side .tfb-dash-stars{margin-bottom:2px !important;}
  .dash-side .tfb-dash-stars button{font-size:14px;}
  .dash-main > .dash-side{margin-top:10px;}
}
/* The dashboard fills the screen: the two rows of day cards grow into the height that's left, so there's no
   empty space under the page (laptops and desktops). */
@media(min-width:1001px){
  main.main-dash{display:flex;flex-direction:column;padding-bottom:14px !important;}
  main.main-dash > .dash-layout{flex:1 1 auto;display:flex !important;flex-direction:column;}
  main.main-dash .dash-main{flex:1 1 auto;display:flex;flex-direction:column;}
  main.main-dash .module-grid{flex:1 1 0;grid-auto-rows:1fr;align-items:stretch;}
  .dash-main .module-card.mc-clean .module-head{padding:10px 10px;min-height:58px;justify-content:center;}
  .dash-main .module-card.mc-clean .mh-day{font-size:11px;}
  .dash-main .module-card.mc-clean .mh-title{font-size:14px;line-height:1.25;}
  .dash-main .module-card.mc-clean .module-body{flex:1 1 0;min-height:0;overflow:hidden;container-type:size;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:8px 16px 6px;}
  .dash-main .module-card.mc-clean .module-icon{font-size:30px;line-height:1;margin:0;}
  .dash-main .module-card.mc-clean .module-start-btn{margin:0 14px 8px;width:calc(100% - 28px);padding:10px;font-size:15px;}
  .dash-main .module-card.mc-clean .module-finish-btn{margin:0 14px 8px;width:calc(100% - 28px);padding:6px;font-size:12.5px;}
  .dash-main .module-card.mc-clean > :last-child{margin-bottom:10px;}
  body:has(main.main-dash) .footer-note{padding:6px 24px 8px;}
}
/* the middle of a day card shows as much as fits: icon and theme, then the icon alone (smaller), then nothing */
@container (max-height:96px){ .module-card.mc-clean .module-theme{display:none;} }
@media(min-width:1200px){
  .dash-hero h1{white-space:nowrap;font-size:29px !important;}
  .dash-hero p{white-space:nowrap;max-width:none !important;font-size:14px !important;}
}
/* the Legal Support Help logo (navy background) sits straight on the navy top bar */
.brand-mark.brand-logo{width:auto;height:46px;aspect-ratio:250/156;background:none;padding:0;border-radius:6px;box-shadow:none;}
@media(max-width:760px){.brand-mark.brand-logo{width:auto;height:38px;}}
img[alt="Legal Support Help"]{border-radius:8px;}

.module-card.mc-clean .module-body{flex:1 1 auto;min-height:12px;}
/* a narrow search box keeps its text inside it (it ran under the Dashboard tab when the top bar was full) */
.topbar-search input{min-width:0 !important;max-width:100%;box-sizing:border-box;text-overflow:ellipsis;}
/* a band with fewer boxes (e.g. no ranking) still spans the width */
@media(min-width:1101px){
  .dash-side-inner:not(:has(> :nth-child(6))){display:flex !important;}
  .dash-side-inner:not(:has(> :nth-child(6))) > *{flex:1 1 0;min-width:0;}
  .dash-side-inner:not(:has(> :nth-child(6))) > .tfb-dash, .dash-side-inner:not(:has(> :nth-child(6))) > .rank-card, .dash-side-inner:not(:has(> :nth-child(6))) > .cert-dash, .dash-side-inner:not(:has(> :nth-child(6))) > .comp-card{flex-grow:1.7;}
}
/* the scores band always sits under the day cards (some portals pinned it on top) */
.dash-main > .dash-side{order:0 !important;}
/* notes and banners above the cards stay slim, so the cards fit the screen */
@media(min-width:1001px){
  .dash-main > .card[style*="margin-bottom:14px"]{padding:7px 14px !important;margin-bottom:8px !important;font-size:13px !important;}
  .dash-main > .fts-banner{padding:8px 16px;margin-bottom:10px;border-radius:14px;gap:12px;}
  .dash-main > .fts-banner .fts-banner-ic{width:34px;height:34px;border-radius:10px;font-size:18px;}
  .dash-main > .fts-banner .fts-banner-tx b{display:inline;font-size:14px;margin-right:8px;}
  .dash-main > .fts-banner .fts-banner-tx span{font-size:12px;}
  .dash-main > .fts-banner .fts-banner-go{padding:5px 12px;font-size:11.5px;}
}
/* tall day cards (one row of days) get a bigger icon and theme */
@container (min-height:260px){ .module-card.mc-clean .module-icon{font-size:52px !important;} .dash-main .module-card.mc-clean .module-theme{font-size:14.5px !important;-webkit-line-clamp:5;max-width:320px;} }
/* the day's theme under the icon: small grey text, up to three lines */
.dash-main .module-card.mc-clean .module-theme{font-size:12.5px !important;font-weight:500 !important;line-height:1.45 !important;color:var(--ink-soft) !important;text-transform:none !important;letter-spacing:0 !important;font-family:inherit;margin:0 !important;max-width:100%;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.module-card.mc-clean .module-topics-btn span{color:var(--ink-soft);font-weight:700;margin-left:2px;}
`;
  document.head.appendChild(st);
  /* the portal may have drawn the dashboard before this file loaded */
  if(typeof render === "function" && typeof state !== "undefined" && state.view === "dashboard"){ try{ render(); }catch(e){} }
})();
