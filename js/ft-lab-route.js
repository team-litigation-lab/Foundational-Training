/* ============================================================
   🛠 THE PRACTICE LAB IS WHERE ACTIVITIES ARE DONE; THE DECKS ARE FOR THE LESSONS
   (the owner: "realign the Practice Lab strictly based on the curriculum … routed on the Practice Lab when it's time to do
   the activity, so the decks are solely for the lessons; no faulty links, seamless back and forth navigation")
     • A deck's activity button (the LOR tool, the Email Sim, a Practice Session, Call Listening, the calendaring activity, a
       drill, a Process Guide, the transcription, the Portal's drafting) no longer opens the activity from inside the deck: it
       opens 🛠 Practice Lab on that day, scrolled to the activity's card and lit up, with a bar ← Back to the lesson that
       returns to the very slide. ROUTES says which button is which activity (the card's data-key, js/ft-simulators.js).
     • The card's own button opens the activity; the activity's ← Back to the Practice Lab returns to the lab, still on that
       day, and the bar still offers the way back to the slide. Lessons, videos, Knowledge Checks, assessments, the trainee's
       sheets (Task Tracker, Monitoring Sheet) and the handouts stay on the deck.
     • The page itself, in the LSH elite design: the full width of the screen, the navy hero, each day a navy band with its
       lesson card and Part, the cards in the LSH frame (navy fading to gold).
   Loaded after js/ft-simulators.js and js/ft-day-decks.js.
   ============================================================ */
(function(){
  "use strict";
  if(typeof document === "undefined") return;
  // [the button's onclick, the activity's card key ($1: the id in it)]
  const ROUTES = [
    [/lshOpenPortalDrafting\('(medlor|lienbv)'\)/, m => m[1]],
    [/lshOpenPortalDrafting\(\s*\)|goto\('lor'\)/, () => "lor"],
    [/FTListen\.pop\('recact'\)/, () => "recact"],
    [/FTListen\.(?:open|pop)\('([\w-]+)'\)/, m => "listening:" + m[1]],
    [/goto\('listening'\)/, () => "listening"],
    [/ftsCalsim\('activity'\)|goto\('calsim'|goto\('calcheck'\)|goto\('calweek'\)/, () => "calendar"],
    [/goto\('calrules'\)/, () => "session:calendaring"],
    [/FTClaimsMail\.fromDeck\(\)|goto\('claimsmail'\)/, () => "claimsmail"],
    [/goto\('transcribe'\)/, () => "transcribe"],
    [/FTSessions\.open\('([\w-]+)'\)/, m => "session:" + m[1]],
    [/FTDrills\.start\('([\w-]+)'\)/, m => "drills:" + m[1]],
    [/goto\('drills'\)/, () => "drills"],
    [/FTGuide\.open\('([\w-]+)'\)/, m => "guide:" + m[1]],
    [/goto\('simulators'\)/, () => ""]
  ];
  const keyOf = on => { for(const [re, f] of ROUTES){ const m = re.exec(on || ""); if(m) return f(m); } return null; };
  const deckPlace = () => { const d = window.FTDayDecks && FTDayDecks.state && FTDayDecks.state(); return d && d.day != null ? {day: Number(d.day), i: Number(d.i) || 0} : null; };
  const slideTitle = (day, i) => { try{ const l = FTDayDecks.list ? FTDayDecks.list(day) : null; return l && l[i] ? String(l[i].h || "").replace(/^(AM|PM|Entire Day)\s*:\s*/i, "") : ""; }catch(e){ return ""; } };

  const LR = window.FTLabRoute = {
    // open the Practice Lab on a day, on one activity's card; from a deck, remember the slide to come back to
    go(day, key, from){
      state.ftLabFrom = from || (state.view === "daydeck" ? deckPlace() : state.ftLabFrom || null);
      state.ftLabFocus = {day: Number(day) || null, key: key || ""};
      state.ftsFilter = "all";
      if(day){ state.ftsDayOpen = state.ftsDayOpen || {}; state.ftsDayOpen[day] = true; }
      goto("simulators");
    },
    back(){ const f = state.ftLabFrom; state.ftLabFrom = null; state.ftLabFocus = null;
      if(f && window.FTDayDecks) FTDayDecks.open(f.day, f.i); else goto("dashboard"); },
    clear(){ state.ftLabFrom = null; render(); },
    keyOf
  };

  // 🔀 a deck's activity button → the Practice Lab (capture: before the button's own onclick runs)
  document.addEventListener("click", ev => {
    if(state.view !== "daydeck") return;
    const b = ev.target.closest && ev.target.closest("[onclick]"); if(!b || !b.closest("main.main-ftdd")) return;
    const key = keyOf(b.getAttribute("onclick")); if(key === null) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    const here = deckPlace();
    LR.go(here ? here.day : null, key, here);
  }, true);

  // the Practice Lab: the bar back to the lesson, and the activity's card lit up and in view
  const __render = window.render;
  window.render = function(){
    // (the way back to a slide holds while the trainee is in the lab and its activities; going to the Dashboard ends it)
    if(state.view === "dashboard" || state.view === "modules") state.ftLabFrom = null;
    const out = __render.apply(this, arguments);
    if(state.view !== "simulators") return out;
    const main = document.querySelector("main.main-sims"); if(!main) return out;
    const f = state.ftLabFrom;
    if(f && !main.querySelector(".ftlr-back")){
      const t = slideTitle(f.day, f.i), lp = window.ftsLessonPart ? ftsLessonPart(f.day) : null;
      main.insertAdjacentHTML("afterbegin", `<div class="ftlr-back" role="navigation" aria-label="Back to the lesson">
        <button type="button" class="btn ftlr-back-btn" onclick="FTLabRoute.back()">← Back to the lesson</button>
        <span>Day ${f.day}${lp ? ` · ${esc(lp.title)}${lp.part ? " " + esc(lp.part) : ""}` : ""}${t ? ` · <b>${esc(t)}</b>` : ""}</span>
        <button type="button" class="ftlr-x" title="Stay in the Practice Lab" aria-label="Dismiss" onclick="FTLabRoute.clear()">✕</button></div>`);
    }
    const fc = state.ftLabFocus;
    if(fc){
      state.ftLabFocus = null;
      requestAnimationFrame(() => {
        const sec = fc.day ? document.getElementById("fts-day-" + fc.day) : null;
        if(sec) sec.open = true;
        const pick = fc.key ? (sec && (sec.querySelector(`.fts-card[data-key="${fc.key}"]`) || sec.querySelector(`.fts-card[data-key^="${fc.key}"]`)))
          || document.querySelector(`.fts-card[data-key="${fc.key}"]`) || document.querySelector(`.fts-card[data-key^="${fc.key.split(":")[0]}"]`) : null;
        const to = pick || sec;
        if(to) to.scrollIntoView({behavior: "smooth", block: "center"});
        if(pick){ pick.classList.add("ftlr-focus"); setTimeout(() => pick.classList.remove("ftlr-focus"), 4000); }
      });
    }
    return out;
  };

  const st = document.createElement("style"); st.id = "ft-lab-route"; st.textContent = `
/* ✨ the Practice Lab, the LSH elite design, the full width of the screen */
main.main-sims{max-width:none !important;width:100%;box-sizing:border-box;padding:18px clamp(16px,2.2vw,40px) 44px !important;}
main.main-sims .fts-bar{border-radius:14px;border:1px solid #DDE1EC;box-shadow:0 8px 20px -14px rgba(30,35,64,.4);background:rgba(255,255,255,.96);}
main.main-sims .fts-jump{font-size:13.5px;padding:5px 12px;background:#F3F5FB;border-color:#D9DEEC;}
/* each day: a navy band with its lesson card and Part, the day's cards under it */
main.main-sims .fts-day{border:0 !important;background:rgba(255,255,255,.72) !important;border-radius:18px !important;padding:0 !important;overflow:hidden;
  box-shadow:0 12px 30px -20px rgba(20,24,48,.55);margin:0 0 16px !important;backdrop-filter:saturate(118%) blur(6px);}
main.main-sims .fts-day > summary{padding:12px 20px !important;background:linear-gradient(135deg,#1F2440 0%,#2B3158 60%,#353C68 100%);color:#fff;}
main.main-sims .fts-day > summary::before{color:#E9CC7E !important;}
main.main-sims .fts-day-n{color:#fff !important;font-size:20px !important;font-weight:900;}
.fts-day-lp{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fts-day-lp b{color:#E9CC7E;font-size:16px;font-weight:800;}
.fts-day-lp i{font-style:normal;font-weight:800;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:#1E2340;background:#E9CC7E;border-radius:999px;padding:3px 11px;}
main.main-sims .fts-day-role{color:#D9DEEC !important;}
main.main-sims .fts-day-count{background:rgba(255,255,255,.14) !important;color:#fff !important;}
main.main-sims .fts-day-count.ok{background:#1F7A45 !important;}
main.main-sims .fts-day[open] > .fts-grid{padding:16px 20px 20px !important;}
.fts-day-none{margin:0;padding:14px 20px 16px;font-size:15px;font-weight:600;color:#3F4560;}
main.main-sims .fts-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)) !important;gap:16px !important;}
/* the cards in the LSH frame */
main.main-sims .fts-card{border:4px solid transparent !important;border-radius:16px !important;
  background:linear-gradient(#fff,#fff) padding-box,linear-gradient(180deg,#2A3050 0%,#3A4168 35%,#B98E66 80%,#C9A27A 100%) border-box !important;
  box-shadow:0 10px 22px -16px rgba(30,35,64,.5) !important;transition:transform .15s ease, box-shadow .15s ease;}
main.main-sims .fts-card:hover{transform:translateY(-2px);box-shadow:0 16px 30px -16px rgba(30,35,64,.55) !important;}
main.main-sims .fts-card h3{font-size:17px !important;font-weight:800;}
main.main-sims .fts-note{font-size:14.5px !important;font-weight:600;color:#2E3450 !important;}
main.main-sims .fts-kicker{font-size:12.5px !important;font-weight:800 !important;}
main.main-sims .fts-type{font-size:12.5px !important;font-weight:800;opacity:1 !important;}
main.main-sims .fts-card.fts-cont{opacity:.92;}
.fts-conts{display:flex;flex-direction:column;gap:8px;padding:14px 20px 0;}
.fts-cont-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;text-align:left;width:100%;border:1px dashed #C9A27A;border-radius:12px;background:#FFF8F0;padding:10px 14px;cursor:pointer;font:600 15px/1.35 Inter,Arial,sans-serif;color:#1E2340;}
.fts-cont-row span{color:#B5651F;font-weight:900;} .fts-cont-row b{font-weight:800;} .fts-cont-row i{font-style:normal;color:#7A3F12;}
.fts-cont-row em{margin-left:auto;font-style:normal;font-weight:800;color:#1E2340;}
.fts-cont-row:hover,.fts-cont-row:focus-visible{background:#FFEFD9;outline:none;}
main.main-sims .fts-card.fts-st-done{background:linear-gradient(#fff,#fff) padding-box,linear-gradient(180deg,#1F7A45,#6CC08B) border-box !important;}
/* 🔦 the activity a deck sent the trainee to */
main.main-sims .fts-card.ftlr-focus{animation:ftlrGlow 1.2s ease-in-out 3;box-shadow:0 0 0 4px #E9CC7E,0 18px 34px -14px rgba(30,35,64,.6) !important;}
@keyframes ftlrGlow{50%{box-shadow:0 0 0 8px rgba(233,204,126,.55),0 18px 34px -14px rgba(30,35,64,.6);}}
@media (prefers-reduced-motion: reduce){ main.main-sims .fts-card.ftlr-focus{animation:none;} }
/* ← back to the lesson */
.ftlr-back{position:sticky;top:0;z-index:7;display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;padding:10px 16px;border-radius:14px;
  background:#1E2340;color:#E3E7F5;font-size:15px;font-weight:600;box-shadow:0 10px 24px -14px rgba(0,0,0,.6);}
.ftlr-back b{color:#fff;}
.ftlr-back-btn{background:#E9CC7E !important;color:#1E2340 !important;border:0 !important;font-weight:800 !important;font-size:15px !important;}
.ftlr-back-btn:hover{background:#fff !important;}
.ftlr-x{margin-left:auto;background:none;border:0;color:#C9CFE6;font-size:16px;cursor:pointer;}
`; document.head.appendChild(st);
})();
