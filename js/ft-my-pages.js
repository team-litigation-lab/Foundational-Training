/* ============================================================
   🗒 Notes and 🏅 My Performance in the top bar, and My Performance as the trainee's one page about how they're doing
   Loaded after js/lsh-program.js (whose top bar and 🏅 My Performance it adjusts, for this program only).
     • The top bar: no 📂 My Pages menu and no 🎯 Focus button for a trainee. Two buttons instead: 🗒 Notes and
       🏅 My Performance. (The Task Tracker, the Monitoring Sheet, Video Notes and Tasks are no longer listed; the
       Task Tracker and Monitoring Sheet tiles on 📚 Dashboard still open their pages.) An admin's bar is as it was.
     • 🏅 My Performance holds what was three places, on one screen: 🎯 Focus (what to work on next, the trainer's focus items and
       their feedback by day) on top, the scorecard, then 📬 My Feedback (everything the trainer sent, newest first).
     • 🎲 Random Tasks are abolished: no Tasks page, no looking for a task (the admin tab is gone too: js/ft-admin-ops.js).
   ============================================================ */
(function(){
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const GONE = ["tracker", "monitoring", "learn", "tasks", "myfeedback", "notes", "scorecard"];
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!isTrainee()) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const nav = t.content.querySelector(".topbar .nav"); if(!nav) return html;
  const onc = b => b.getAttribute("onclick") || "";
  [...nav.querySelectorAll(":scope > .lsh-grp")].filter(g => /My Pages/.test(g.textContent)).forEach(g => g.remove());
  [...nav.children].forEach(b => { const v = (onc(b).match(/goto\('([a-z]+)'\)/) || [])[1];
    if(b.classList.contains("lp-focus") || b.classList.contains("nav-focus") || /openFocusPanel/.test(onc(b)) || (v && GONE.includes(v))) b.remove(); });
  const btn = (v, label, title) => `<button type="button" class="lp-sec${state.view === v ? " active" : ""}" onclick="goto('${v}')" title="${title}">${label}</button>`;
  const mine = btn("notes", "🗒 Notes", "Your own notes from the lessons") + btn("scorecard", "🏅 My Performance", "Your focus, your trainer’s feedback and your grades");
  // these are their own buttons now, so 📚 Dashboard isn't lit on them
  if(["notes", "scorecard"].includes(state.view)) [...nav.children].forEach(b => { if(/goto\('modules'\)/.test(onc(b))) b.classList.remove("active"); });
  const portal = nav.querySelector(".lp-portal");
  if(portal) portal.insertAdjacentHTML("beforebegin", mine); else nav.insertAdjacentHTML("beforeend", mine);
  return t.innerHTML;
};
// 🎲 Random Tasks are abolished in this program: no trainee page for them and no looking for one in the background
window.checkSurpriseTask = async function(){ state.activeSurpriseTask = null; };
const __render = window.render;
window.render = function(){
  if(state.view === "tasks"){ state.view = "modules"; return window.render.apply(this, arguments); }
  const r = __render.apply(this, arguments);
  if(state.view !== "scorecard" || !isTrainee()) return r;
  const main = document.querySelector("#app > main.main-lp"); if(!main || main.querySelector(".ftmp-focus")) return r;
  let focus = "";
  try{ focus = (typeof renderWorkOnNextPanel === "function" && renderWorkOnNextPanel()) || ""; }catch(err){}
  if(!state.feedbackLoadedAt && typeof loadMyFeedback === "function"){ state.feedbackLoadedAt = Date.now(); loadMyFeedback(); }
  main.insertAdjacentHTML("afterbegin", `<section class="ftmp-focus">${focus || `<section class="won-panel"><div class="won-head"><h3>🎯 My Focus</h3></div><p class="ftmp-none">Nothing flagged yet. When your trainer sets a focus or reviews your work, it shows here.</p></section>`}</section>`);
  if(window.FTMyFeedback) main.insertAdjacentHTML("beforeend", `<section class="ftmp-fb"><h2>📬 My Feedback</h2>${FTMyFeedback.html()}</section>`);
  try{ if(typeof markFocusSeen === "function") markFocusSeen(); }catch(err){}
  return r;
};
const st = document.createElement("style"); st.id = "ft-my-pages"; st.textContent = `
main.main-lp .ftmp-focus{margin-bottom:16px;} main.main-lp .ftmp-none{font-size:13.5px;color:var(--ink-soft);margin:0;}
main.main-lp .ftmp-fb{margin-top:22px;} main.main-lp .ftmp-fb > h2{margin:0 0 10px;color:var(--navy);font-size:21px;}
/* on one screen: the header a slim bar; 🎯 Focus and 📬 Feedback side by side, each scrolling in its own box; the grading
   systems five to a row, each its score and its list (the list scrolls inside the card); the page shrinks the rest of
   the way to fit (js/ft-screen-fit.js) */
@media(min-width:1001px){
  main.main-lp:has(.ftmp-focus){max-width:none;padding:12px 18px 16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 12px;align-content:start;}
  main.main-lp:has(.ftmp-focus) > .sc-hero{grid-column:1 / -1;grid-row:1;margin:0;padding:10px 16px;gap:14px;}
  main.main-lp:has(.ftmp-focus) > .ftmp-focus{grid-column:1;grid-row:2;margin:0;max-height:170px;overflow:auto;}
  main.main-lp:has(.ftmp-focus) > .ftmp-fb{grid-column:2;grid-row:2;margin:0;max-height:170px;overflow:auto;background:#fff;border-radius:14px;padding:10px 14px;box-shadow:0 2px 10px rgba(16,19,36,.08);}
  main.main-lp:has(.ftmp-focus) > .ftmp-fb > h2{font-size:16px;margin:0 0 6px;}
  main.main-lp:has(.ftmp-focus) > .ftmp-fb .card{padding:8px 10px !important;margin-bottom:6px;font-size:13px;}
  main.main-lp:has(.ftmp-focus) > .ftmp-focus .won-panel{margin:0;padding:10px 14px;}
  main.main-lp:has(.ftmp-focus) > .sc-grid{grid-column:1 / -1;grid-row:3;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;}
  main.main-lp:has(.ftmp-focus) > .sc-how{display:none;}
  main.main-lp:has(.ftmp-focus) .sc-ring{width:64px;height:64px;} main.main-lp:has(.ftmp-focus) .sc-ring span{font-size:17px;} main.main-lp:has(.ftmp-focus) .sc-ring small{font-size:8px;}
  main.main-lp:has(.ftmp-focus) .sc-hero-t h1{font-size:20px;margin:0 0 2px;} main.main-lp:has(.ftmp-focus) .sc-hero-t .lp-eyebrow, main.main-lp:has(.ftmp-focus) .sc-hero-t > p{display:none;}
  main.main-lp:has(.ftmp-focus) .sc-facts{margin-top:4px;}
  main.main-lp:has(.ftmp-focus) .sc-src{padding:8px 10px;gap:4px;}
  main.main-lp:has(.ftmp-focus) .sc-src-h b{font-size:13.5px;} main.main-lp:has(.ftmp-focus) .sc-pill{font-size:13.5px;}
  main.main-lp:has(.ftmp-focus) .sc-about{display:none;}
  main.main-lp:has(.ftmp-focus) .sc-tbl{font-size:12px;display:block;max-height:112px;overflow:auto;}
  main.main-lp:has(.ftmp-focus) .sc-tbl td{padding:4px 6px;} main.main-lp:has(.ftmp-focus) .sc-tbl td span{font-size:11px;}
}
`;
document.head.appendChild(st);
})();
