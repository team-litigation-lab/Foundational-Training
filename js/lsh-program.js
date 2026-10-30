/* ============================================================
   The LSH program layout: the main setup for every LSH program. The same file in every LSH course repo
   (Foundational-Training, EA-PA-TRAINING, Case-Management-Training, medsumanddemandtraining,
   propertydamageclaimstraining); change it in all of them. A program is organised in sections, and the top bar
   shows exactly those sections, named and ordered as the platform spec sets them out:

     📚 Dashboard              #/modules: the program's landing page — every way into the platform opens it, in
                               the trainer view and the trainee view alike. Any arrival with no address of its
                               own lands here: a Portal ticket, the admin password, a saved session coming back,
                               the brand mark, a Back button, an old #/dashboard link. No automatic resume jumps
                               a viewer into the middle of a lesson; the page's own ▶ Resume where you left off
                               does that when they ask. A real address (#/day/3, #/tool/<id>, a duplicated tab)
                               still opens that page: it is a link, not a landing. The page fits one screen, with
                               no page scroll (js/lsh-dashboard.js).
                               The modules (its lessons), and the program's training pages (Task Tracker,
                               Monitoring Sheet, My Notes, My Performance), which share a bar of tabs under
                               the top bar. ✍️ Knowledge Check is not one of them: it is its own feature
     📁 Client Profile         the program's own case material (caseProfile below): the client, firm and case
                               files the trainee works on
     🛠 Practice Lab           the Practice Lab Sessions, connected with the simulators (#/simulators)
     ✍️ Knowledge Check        #/process: each module's answer sheet, graded out of 100 (70% passes); an admin
                               sees every trainee's
     🎯 Focus                  a trainee's focus panel: their trainer's feedback and what to work on next
     🏅 Scorecards             an admin's: every trainee's scorecard in one table. A trainee's own grades are
                               🏅 My Performance (#/scorecard), a page under 📚 Dashboard
     👁 Switch View            an admin sees the program exactly as a trainee does, and switches back
     🛡 Admin                  the Admin screen (admins only, never in the trainee view)
     🏠 Main Portal            the LSH Training Portal: it signs everyone in, and it holds the log out

   So a trainee's bar is 📚 Dashboard · 📁 Client Profile · 🛠 Practice Lab · ✍️ Knowledge Check · 🎯 Focus ·
   🏠 Main Portal, and a trainer's is 📚 Dashboard · 📁 Client Profile · 🛠 Practice Lab · ✍️ Knowledge Check ·
   🏅 Scorecards · 👁 Switch View · 🛡 Admin · 🏠 Main Portal. Nothing else belongs in the bar: no search box,
   no full screen, no log out.
   What sits in each section is the program's own: it sets window.LSH_PROGRAM before this file loads
   (js/ft-program.js here):
     { modules: [{view | run, icon, label, about, who?: "trainee" | "admin", badge?()}], moduleViews: [...],
       labViews: [...], caseProfile: {view, views: [...], title} | null (📁 Client Profile),
       pinned?(): [lessons shown first], shared: ["public key", …],
       sources: [{id, icon, label, about, key?, items(ctx)}] }
   A scorecard source with a key (e.g. "callsim:") has the trainee's record key + id read for it; items(ctx) gets
   ctx = {id, progress, rec: {<key>: that record}, shared: {<public key>: record}, since: the day they registered} and returns
   [{name, pct: 0–100 (null when not graded yet), note}]. A source's score is the average of its graded items;
   the overall score is the average of the sources that have a score, so each grading system counts the same.
   A trainee's records come in one get-many when the Scorecard opens (again after a minute, or coming back to the
   tab after two); the admin tab reads every trainee's with get-many (up to 100 keys a request).
   Loaded last, after js/lsh-dashboard.js and the card files.
   ============================================================ */
(function(){
if(typeof window.renderTopbar !== "function" || window.lshProgram) return;
const CFG = Object.assign({modules:[], moduleViews:[], labViews:["simulators"], caseProfile:null, pinned:() => [], shared:[], sources:[]}, window.LSH_PROGRAM || {});
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one: no 🏅 Scorecards, no 🛡 Admin
const lessons = () => DAYS.filter(d => d && d.sections && d.sections.length);
const doneIn = p => lessons().filter(d => p && p[d.id] && p[d.id].done).length;
const tier = pct => pct == null ? "none" : pct >= 85 ? "top" : pct >= 70 ? "ok" : "low";
const pctTxt = pct => pct == null ? "—" : Math.round(pct) + "%";
const batchLabel = id => {
  const v = String(id == null ? "" : id).trim();
  const m = /^B(\d{2})(\d{2})(\d{2})?(\d{2})(?:-?LSH[A-Z]*-?\d+)?$/i.exec(v.replace(/\s+/g, ""));
  return m ? "B" + m[1] + m[2] + m[4] : v;
};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["modules", "scorecard"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {modules:"Dashboard", scorecard:"My Performance"});

/* ---------- 📚 Dashboard is the landing page: every way in opens it ---------- */
// One home, one name for it. Signing in (from the Portal or on this platform), coming back to a saved
// session, the brand mark, a Back button and an old #/dashboard link all open 📚 Dashboard, instead of a
// second, half-empty home page beside it. A program names the views it used as a home before this in
// window.LSH_HOME_ALIASES (js/ft-updates.js lists the pages this program has turned off); the engine's
// own dashboard is always one.
const HOME = "modules";
const atHome = v => ["dashboard", "home"].concat(window.LSH_HOME_ALIASES || []).includes(v);
const signedIn = () => !!(state.traineeId || state.isAdmin || state.adminPreview);
const __goto = window.goto;
window.goto = function(view){ if(atHome(view)) arguments[0] = HOME; return __goto.apply(this, arguments); };

/* A trainee coming back (the next day, a new tab, from the Portal) is taken straight back to where they left off,
   automatically: the engine's own resume, to the lesson slide, the Activity deck slide or the Practice Lab tool they
   were on. 📚 Dashboard keeps its "▶ Resume where you left off" button too. */

/* ---------- the sections ---------- */
// The 📚 Dashboard pages this viewer has (an admin's own pages, or a trainee's; the trainee view sees the trainee's).
const pages = () => CFG.modules.filter(m => !m.who || m.who === (adminOn() ? "admin" : "trainee"));
const moduleViews = () => ["modules"].concat(CFG.moduleViews, pages().map(m => m.view).filter(Boolean));
const CASE = CFG.caseProfile && CFG.caseProfile.view ? CFG.caseProfile : null;
const caseViews = () => (CASE && CASE.views) || (CASE ? [CASE.view] : []);
function section(){
  const v = state.view;
  if(v === "admin" && state.adminTab === "scorecards") return "scorecard";
  if(v === "scorecard") return adminOn() ? "scorecard" : "modules";   // a trainee's 🏅 My Performance is a 📚 Dashboard page
  if(v === "admin") return "admin";
  if(caseViews().includes(v)) return "case";
  if(CFG.labViews.includes(v)) return "lab";
  if(moduleViews().includes(v)) return "modules";
  return v === "dashboard" ? "home" : "";
}
// The top bar, in the order the spec sets: 📚 Dashboard · 📁 Client Profile · 🛠 Practice Lab · ✍️ Knowledge Check ·
// then 🎯 Focus for a trainee, or 🏅 Scorecards (every trainee's) · 👁 Switch View · 🛡 Admin for a trainer, and
// 🏠 Main Portal last. A trainee's own pages (My Performance, My Notes, Task Tracker, Monitoring Sheet) are
// 📚 Dashboard pages, so the bar stays the six buttons the spec lists.
const PORTAL_HOME = "https://cm-training-activity.pages.dev/";
function barSection(){
  const v = state.view, sec = section();
  if(v === "process" || v === "kc") return "process";
  if(sec === "home" || sec === "modules") return "modules";
  return sec;
}
// 🎯 Focus: the trainee's own button in the bar, with the count of what their trainer has not seen them act on.
function focusBtn(){
  const n = typeof window.focusNewCount === "function" ? Number(window.focusNewCount()) || 0 : 0;
  return `<button type="button" class="lp-sec lp-focus" onclick="openFocusPanel()" title="Your trainer’s feedback and what to work on next">🎯 Focus${n ? `<span class="nav-badge">${n}</span>` : ""}</button>`;
}
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const bar = t.content.querySelector(".topbar"), nav = t.content.querySelector(".topbar .nav");
  if(!bar || !nav) return html;
  const sec = barSection(), onc = b => b.getAttribute("onclick") || "";
  const viewOf = b => (onc(b).match(/^goto\('([a-z]+)'\)$/) || [])[1];
  // the training pages' own buttons move into the sections: the bar holds the spec's buttons and nothing else,
  // so an admin's 🧭 Orientation is a 📚 Dashboard page like the rest (orientation is centralised on the Portal)
  const moved = new Set(CFG.modules.map(m => m.view).filter(Boolean).concat(CFG.labViews, caseViews(), ["modules"])), runs = new Set(CFG.modules.map(m => m.run).filter(Boolean));
  [...nav.children].forEach(b => { const v = viewOf(b); if((v && moved.has(v)) || runs.has(onc(b))) b.remove(); });
  const btn = (id, label, onclick, title) => `<button type="button" class="lp-sec${sec === id ? " active" : ""}" onclick="${onclick}"${title ? ` title="${title}"` : ""}>${label}</button>`;
  const processGo = "goto('process')";   // one feature, one page: an admin sees every trainee's sheets there
  const secs = btn("modules", "📚 Dashboard", "goto('modules')", "The Standard Foundational Training: its modules")
    + (CASE ? btn("case", "📁 Client Profile", `goto('${CASE.view}')`, CASE.title || "") : "")
    + btn("lab", "🛠 Practice Lab", "goto('simulators')")
    + btn("process", "✍️ Knowledge Check", processGo, adminOn() ? "Every trainee's answer sheets" : "Each module's answer sheet, graded out of 100")
    + pagesMenu()
    + (adminOn() ? btn("scorecard", "🏅 Scorecards", "lshProgram.scorecard()", "Every trainee's scorecard") : focusBtn());
  const portal = `<button type="button" class="lp-sec lp-portal" onclick="location.href='${PORTAL_HOME}'" title="The LSH Training Portal — it holds the log out">🏠 Main Portal</button>`;
  const home = [...nav.children].find(b => viewOf(b) === "dashboard");
  if(home) home.insertAdjacentHTML("beforebegin", secs), home.remove();
  else nav.insertAdjacentHTML("afterbegin", secs);
  const adm = [...nav.children].find(b => onc(b) === "openAdmin()");
  if(adm){ adm.innerHTML = "🛡 Admin"; adm.title = "Admin Master Control"; adm.classList.add("lp-sec"); adm.classList.toggle("active", sec === "admin"); }
  // the spec's order ends the bar 👁 Switch View · 🛡 Admin · 🏠 Main Portal
  const sw = [...nav.children].find(b => b.classList.contains("nav-viewswitch"));
  if(sw && adm) nav.insertBefore(sw, adm);
  nav.insertAdjacentHTML("beforeend", portal);
  return t.innerHTML;
};

/* ---------- 📚 Dashboard (#/modules): the modules, then the training pages ---------- */
// What the program adds to the landing page. A file that used to hang something on the dashboard (a stat
// card, a badge on a lesson card) registers it here instead: window.LSH_HOME_STATS holds () => HTML for the
// row of stat cards under the progress bar, window.LSH_HOME_LESSON_TAGS holds (lesson) => HTML for a tag
// beside that lesson's Knowledge Check score, and window.LSH_HOME_NOTICES holds () => HTML for anything
// that needs the trainee's eye the moment they open the page (a live 🎲 task). js/ft-simulators.js
// registers the graded calls in the first two; js/ft-admin-ops.js registers the task card.
// window.LSH_HOME_CARD_EXTRA holds (lesson) => HTML for a button beside a lesson card's Start,
// window.LSH_HOME_GRID_CARDS holds () => [{after: lesson id, html}] — cards of the program's own placed in the
// lesson grid right after a lesson (in the order they run), and window.LSH_HOME_BELOW_LESSONS holds () => HTML
// for a row under the lesson cards (wrap it in .lsh-below).
const hooks = (name, arg) => (window[name] || []).map(f => { try{ return f(arg) || ""; }catch(err){ return ""; } }).join("");
const lessonTags = d => hooks("LSH_HOME_LESSON_TAGS", d);

// 📚 Dashboard's own pages (CFG.modules, this viewer's — Task Tracker, Monitoring Sheet, My Notes, Tasks,
// My Performance; an admin's Orientation): one 📂 My Pages ▾ menu in the top bar, so the dashboard itself
// keeps its height for the lesson cards. 🎯 Focus is already its own button in the bar, so it isn't repeated.
// The menu uses js/lsh-topbar.js's .lsh-grp markup and styles (its outside-click close included).
function pagesMenu(){
  const items = pages().filter(m => (m.view || m.run) && m.run !== "openFocusPanel()");
  if(!items.length) return "";
  let total = 0, on = false;
  const rows = items.map(m => {
    const n = typeof m.badge === "function" ? (Number(m.badge()) || 0) : 0;
    const act = !!(m.view && state.view === m.view);
    total += n; on = on || act;
    const go = (m.run ? m.run : `goto('${m.view}')`) + ";if(window.lshCloseTopMenus)lshCloseTopMenus()";
    return `<button type="button" role="menuitem"${act ? ` class="active"` : ""} onclick="${go}" title="${e(m.about || "")}">${e(m.icon || "")} ${e(m.label || "")}${n ? `<span class="nav-badge">${n}</span>` : ""}</button>`;
  }).join("");
  const toggle = "event.stopPropagation();var g=this.parentNode,o=!g.classList.contains('open');if(window.lshCloseTopMenus)lshCloseTopMenus();if(o){g.classList.add('open');this.setAttribute('aria-expanded','true');}";
  return `<div class="lsh-grp lp-pages-menu" data-grp="mypages"><button type="button" class="lp-sec${on ? " active" : ""}" aria-haspopup="true" aria-expanded="false" title="Your own pages" onclick="${toggle}">📂<span class="lsh-grp-word"> My Pages</span> ▾${total ? `<span class="nav-badge">${total}</span>` : ""}</button><div class="lsh-grp-menu" role="menu">${rows}</div></div>`;
}

// Resume, the certificate and the feedback card: the landing page carries them, so nothing a trainee
// needs is left on a home page they no longer open.
function homeActions(done, total){
  const resume = typeof window.resumeLabel === "function" ? resumeLabel() : "";
  const cert = (typeof window.certData === "function" && state.traineeId) ? certData() : null;
  const html = (resume ? `<button class="btn btn-primary resume-btn" onclick="resumeWhereLeftOff()">▶ Resume where you left off <span>${e(resume)}</span></button>` : "")
    + (cert ? (cert.eligible
      ? `<button class="btn cert-hero-btn" onclick="downloadCertificatePdf(null)">🎓 Download my Certificate</button><button class="btn btn-ghost cert-hero-view" onclick="openCertificate()">View</button>`
      : `<span class="cert-hero-locked" title="Finish the lessons to unlock your certificate (${done}/${total} lessons finished)">🎓 Certificate · ${done}/${total}</span>`) : "");
  return html ? `<div class="lp-home-acts">${html}</div>` : "";
}
// The compact stat band the sibling courses show under their lessons (their dashboard's dash-side-inner):
// program %, best/avg competency, average quiz score, days completed, the feedback card and the ranking
// card, plus whatever else a file registers in window.LSH_HOME_STATS (e.g. js/ft-simulators.js's graded-calls tile).
function statsBand(done, total){
  const pct = total ? Math.round(done / total * 100) : 0;
  const ocs = typeof overallCompetencyScore === "function" ? overallCompetencyScore() : { score: 0, tier: null };
  const avgC = typeof averageCompetencyScore === "function" ? averageCompetencyScore().score : 0;
  const quiz = typeof avgScore === "function" ? avgScore() : 0;
  const fb = typeof window.renderFeedbackDashCard === "function" ? renderFeedbackDashCard() : "";
  const rank = typeof window.renderRankingCard === "function" ? renderRankingCard() : "";
  return `<div class="lp-home-stats">
    <div class="card stat"><div class="num">${pct}%</div><div class="lbl">Program complete</div></div>
    <div class="card stat"><div class="num">${ocs.score}%</div><div class="lbl">${ocs.tier ? `Best Competency — ${e(displayTier(ocs.tier))}` : "Best Competency Score"}<span style="display:block;font-weight:400;margin-top:2px;">Avg across all attempts: ${avgC}%</span></div></div>
    <div class="card stat"><div class="num">${quiz}%</div><div class="lbl">Average quiz score</div></div>
    <div class="card stat"><div class="num">${done} / ${total}</div><div class="lbl">Lessons completed</div></div>
    ${fb}${rank}${hooks("LSH_HOME_STATS")}
  </div>`;
}
// The step-timeline (a circle per lesson, under the hero) is gone: the lesson cards sit right below it and say
// the same thing, and the row it took is the room the day cards needed on one screen.
// The pinned 📌 Training Orientation and Rules card (first, on the left) and what needs the eye next (the
// next-step band, a live task) share one compact row, side by side, so the lesson cards keep the height for the one-screen rule. Either one
// alone takes the whole row; phones and narrow windows stack them.
const topRow = (notices, pins, scores) => (notices || scores) && pins
  ? `<div class="dash-pair"><div class="dash-pair-pin">${pins}</div><div class="dash-pair-now">${notices}${scores}</div></div>`
  : notices + pins + scores;
// 📚 Dashboard's lesson cards, compact: the lesson's icon sits beside its Start button instead of on a band of its
// own, so a card is about half as tall and many more fit on one screen (only here: other pages keep the full card).
function gridCards(all){
  const extra = []; (window.LSH_HOME_GRID_CARDS || []).forEach(f => { try{ extra.push(...(f() || [])); }catch(err){} });
  const cards = {}; all.forEach(d => { cards[d.id] = compactCard(moduleCard(d), d); });
  // A course can lay the grid out itself (window.LSH_HOME_GRID_LAYOUT): it is handed every lesson's card, the
  // cards its own hook made and tags(lesson) for the badges LSH_HOME_LESSON_TAGS registers (the graded call of
  // a mock-call lesson), and returns the whole grid. Foundational Training lays it out by day.
  if(typeof window.LSH_HOME_GRID_LAYOUT === "function"){
    try{ const out = window.LSH_HOME_GRID_LAYOUT({lessons: all, cards, extra, tags: lessonTags}); if(out) return out; }catch(err){}
  }
  return all.map(d => cards[d.id] + extra.filter(x => Number(x.after) === Number(d.id)).map(x => x.html).join("")).join("");
}
function compactCard(html, d){
  const t = document.createElement("template"); t.innerHTML = String(html).trim();
  const card = t.content.firstElementChild; if(!card) return html;
  const icon = card.querySelector(".module-body .module-icon"), start = card.querySelector(".module-start-btn");
  if(!start) return html;
  const row = document.createElement("div"); row.className = "mc-startrow";
  if(icon) row.appendChild(icon);
  row.appendChild(start);
  // a program's own button beside Start (window.LSH_HOME_CARD_EXTRA: (lesson) => HTML), e.g. the day's instructions deck
  const extra = d ? hooks("LSH_HOME_CARD_EXTRA", d) : "";
  if(extra) row.insertAdjacentHTML("beforeend", extra);
  const grid = card.querySelector(".mc-grid");
  (grid || card.lastElementChild).before(row);
  const body = card.querySelector(".module-body");
  if(body && !body.textContent.trim() && !body.querySelector("img, svg")) body.remove();
  // the small buttons in one line: a short label, the full one on hover
  card.querySelectorAll(".mc-grid > button").forEach(b => {
    const full = b.textContent.trim(), short = full.replace(/Finish Training/, "Finish").replace(/Video Presentation/, "Video");
    if(short !== full){ b.title = b.title || full; b.setAttribute("aria-label", full); [...b.childNodes].forEach(n => { if(n.nodeType === 3) n.nodeValue = n.nodeValue.replace(/Finish Training/, "Finish").replace(/Video Presentation/, "Video"); }); }
  });
  card.classList.add("mc-compact");
  return card.outerHTML;
}
function renderModules(){
  const all = lessons(), done = doneIn(state.progress), pinned = (CFG.pinned() || []).filter(Boolean);
  const viewer = isTrainee() || !!state.adminPreview;
  const pct = all.length ? Math.round(done / all.length * 100) : 0;
  // Hero + step-timeline, then one top row: the pinned orientation card and, beside it, the scores (.dash-side,
  // drawn as tiles; a live notice such as a trainer's task goes above them), then the lesson cards (moduleCard(),
  // with js/lsh-dashboard.js's Start / Topics / Finish Training row) across the full width, with whatever
  // LSH_HOME_GRID_CARDS places between them (the no-discussion days' instruction decks, in day order).
  return `<div class="dash-top">
      <div class="dash-hero">
        <div class="dash-hero-text">
          <h1><span class="hl"><svg class="hero-spark hero-spark-lead" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 L24.5 15.5 L38 20 L24.5 24.5 L20 38 L15.5 24.5 L2 20 L15.5 15.5 Z" fill="#F0C08A"/><path d="M33 3 L34.6 7.4 L39 9 L34.6 10.6 L33 15 L31.4 10.6 L27 9 L31.4 7.4 Z" fill="#fff"/><circle cx="6" cy="33" r="2.4" fill="#B5651F"/></svg>Legal VA Foundations Workshop<svg class="hero-spark" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 L24.5 15.5 L38 20 L24.5 24.5 L20 38 L15.5 24.5 L2 20 L15.5 15.5 Z" fill="#F0C08A"/><path d="M33 3 L34.6 7.4 L39 9 L34.6 10.6 L33 15 L31.4 10.6 L27 9 L31.4 7.4 Z" fill="#fff"/><circle cx="6" cy="33" r="2.4" fill="#B5651F"/></svg></span></h1>
          <p>Build the foundation every legal VA needs: how U.S. law firms work, the roles in a case, and how to communicate like a pro.</p>
        </div>
        ${viewer ? `<div class="dash-hero-ribbon">${completionRibbonSvg(pct, done)}</div>` : ""}
      </div>
    </div>
    <div class="dash-main">
      ${topRow(hooks("LSH_HOME_NOTICES"), pinned.map(d => moduleCard(d)).join(""), `<div class="dash-side"><div class="dash-side-inner">
        <div class="card stat"><div class="num">${pct}%</div><div class="lbl">Program complete</div></div>
        <div class="card stat"><div class="num">${done} / ${all.length}</div><div class="lbl">Lessons finished</div></div>
        ${typeof renderFeedbackDashCard === "function" ? renderFeedbackDashCard() : ""}
        ${typeof renderRankingCard === "function" ? renderRankingCard() : ""}
        ${hooks("LSH_HOME_STATS")}
        ${homeActions(done, all.length)}
      </div></div>`)}
      <div class="module-grid">${gridCards(all)}</div>
      ${hooks("LSH_HOME_BELOW_LESSONS")}
    </div>`;
}
// Exposed globally so a direct, non-routed call (e.g. js/ft-updates.js's FT_OFF_VIEWS fallbacks, which call
// renderDashboard() by name instead of going through render()) still reaches this page, not the raw engine's.
window.renderModules = renderModules;

/* ---------- 🏅 the Scorecard: every grading system's items, its average, and the overall ---------- */
function compute(ctx){
  const rows = CFG.sources.map(s => {
    let items = [];
    try{ items = (s.items(ctx) || []).filter(Boolean); }catch(err){ items = []; }
    const g = items.filter(x => typeof x.pct === "number" && isFinite(x.pct));
    return {s, items, graded:g.length, avg:g.length ? Math.round(g.reduce((n, x) => n + x.pct, 0) / g.length) : null};
  });
  // (a source marked noOverall is shown with its own average but left out of the overall: its scores come from the others)
  const have = rows.filter(r => r.avg != null && !r.s.noOverall);
  return {rows, overall:have.length ? Math.round(have.reduce((n, r) => n + r.avg, 0) / have.length) : null,
    graded:have.reduce((n, r) => n + r.graded, 0), systems:have.length, done:doneIn(ctx.progress), total:lessons().length};
}
const keyed = () => CFG.sources.filter(s => s.key);
// the trainee's own records
const SC = {id:null, rec:{}, shared:{}, sharedIn:false, at:0, loading:null};
function loadMine(force){
  if(!isTrainee() || SC.loading) return SC.loading;
  if(!force && SC.id === state.traineeId && Date.now() - SC.at < 120000) return null;
  const id = state.traineeId, mine = keyed().map(s => s.key + id), pub = SC.sharedIn ? [] : CFG.shared.slice();
  SC.at = Date.now();
  SC.loading = sharedGetMany(mine.concat(pub)).then(vals => {
    if(state.traineeId !== id) return;
    SC.id = id; SC.rec = {};
    keyed().forEach((s, i) => { SC.rec[s.key] = vals[i] || null; });
    pub.forEach((k, i) => { SC.shared[k] = vals[mine.length + i] || null; });
    if(pub.length) SC.sharedIn = true;
  }).catch(() => {}).then(() => { SC.loading = null; if(state.view === "scorecard") render(); });
  return SC.loading;
}
const mineCtx = () => ({id:state.traineeId, progress:state.progress || {}, rec:SC.id === state.traineeId ? SC.rec : {}, shared:SC.shared, since:String(state.traineeRegisteredAt || "").slice(0, 10)});
window.addEventListener("focus", () => { if(isTrainee() && SC.id && state.view === "scorecard") loadMine(); });
function detail(sc){
  return `<div class="sc-grid">${sc.rows.map(r => `<div class="card sc-src">
      <div class="sc-src-h"><span class="sc-src-ic">${r.s.icon}</span><b>${e(r.s.label)}</b><span class="sc-pill t-${tier(r.avg)}">${pctTxt(r.avg)}</span></div>
      ${r.s.about ? `<p class="sc-about">${e(r.s.about)}</p>` : ""}
      ${r.items.length ? `<table class="sc-tbl"><tbody>${r.items.map(x => `<tr><td>${e(x.name)}${x.note ? `<span>${e(x.note)}</span>` : ""}</td><td class="sc-n t-${tier(x.pct)}">${pctTxt(x.pct)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="sc-empty">Nothing graded here yet.</p>`}
    </div>`).join("")}</div>`;
}
function ring(pct){
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return `<div class="sc-ring t-${tier(pct)}" style="--p:${p}"><span>${pctTxt(pct)}</span><small>overall</small></div>`;
}
const HOW = "Each grading system’s score is the average of its graded items; the overall score is the average of the grading systems that have a score, so each one counts the same." +
  (CFG.sources.some(s => s.noOverall) ? ` (${CFG.sources.filter(s => s.noOverall).map(s => s.label).join(", ")}: shown, but not counted again in the overall, as its marks come from the other systems.)` : "");
function renderScorecard(){
  const sc = compute(mineCtx()), loaded = !isTrainee() || SC.id === state.traineeId;
  return `<div class="card sc-hero">
      ${ring(loaded ? sc.overall : null)}
      <div class="sc-hero-t"><p class="lp-eyebrow">📚 Dashboard · My Performance</p><h1>🏅 My Performance</h1>
        <p>Every grade the platform gives you, collected from all of its grading systems: ${CFG.sources.map(s => e(s.label)).join(", ")}.</p>
        <div class="sc-facts"><span><b>${sc.done} / ${sc.total}</b> lessons finished</span><span><b>${sc.graded}</b> graded item${sc.graded === 1 ? "" : "s"}</span><span><b>${sc.systems} / ${CFG.sources.length}</b> grading systems with a score</span></div></div>
      <div class="sc-hero-acts"><button class="btn btn-ghost btn-sm" onclick="window.print()">🖨 Print</button></div>
    </div>
    ${loaded ? detail(sc) : `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting your grades…</div>`}
    <p class="sc-how">${HOW}</p>`;
}

/* ---------- the pages ---------- */
const __render = window.render;
window.render = function(){
  // Anything that still sets a home view directly (the engine's sign-in, a resume, a page this program
  // has turned off) lands on 📚 Dashboard, so there is one landing page however the trainee got here — signed
  // in or not (renderModules() already has its own "not signed in" note instead of a personal progress bar).
  if(atHome(state.view)){ state.view = HOME; try{ if(typeof syncRouteHash === "function") syncRouteHash(); }catch(err){} }
  const v = state.view;
  if(v !== "scorecard" && v !== "modules") return __render.apply(this, arguments);
  if(v === "scorecard" && adminOn()){ state.adminTab = "scorecards"; state.view = "admin"; return __render.apply(this, arguments); }
  // 📚 Dashboard is the landing page for every viewer, signed in or not (renderModules() already has its own
  // "not signed in" note instead of a personal progress bar) — only 🏅 My Performance still needs an identity
  // to compute, so that one alone falls back to the old dashboard/login flow when there isn't one.
  if(v === "scorecard" && !state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + (v === "modules" ? `<main class="main-dash">${renderModules()}</main>` : `<main class="main-lp">${renderScorecard()}</main>`) + renderFooter();
  try{ afterRender(); }catch(err){}
  if(v === "scorecard" && isTrainee()) loadMine(SC.id !== state.traineeId || Date.now() - SC.at > 60000);
};

/* ---------- 🛡 Admin Master Control → 🏅 Scorecards: every trainee's, in one table ---------- */
const AS = {rows:null, loading:false, fresh:false, batch:"", open:{}};
async function loadAdmin(){
  AS.loading = true;
  try{
    if(AS.fresh && typeof loadAdminLedgerQuiet === "function"){ AS.fresh = false; await loadAdminLedgerQuiet(); }   // ↻ Refresh: the trainees again too
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const ks = keyed(), want = [];
    people.forEach(r => ks.forEach(s => want.push(s.key + r.id)));
    const vals = await sharedGetMany(want.concat(CFG.shared)), shared = {};
    CFG.shared.forEach((k, i) => { shared[k] = vals[want.length + i] || null; });
    AS.rows = people.map((r, i) => {
      const rec = {}; ks.forEach((s, j) => { rec[s.key] = vals[i * ks.length + j] || null; });
      return {id:r.id, name:r.name || r.id, batch:r.batch || "", sc:compute({id:r.id, progress:r.dayProgress || {}, rec, shared, since:String(r.registeredAt || "").slice(0, 10)})};
    }).sort((a, b) => (a.batch || "").localeCompare(b.batch || "") || (a.name || "").localeCompare(b.name || ""));
  }catch(err){ AS.rows = []; }
  AS.loading = false;
  if(state.view === "admin" && state.adminTab === "scorecards") render();
}
function renderAdminScores(){
  if(!AS.rows){ if(!AS.loading) loadAdmin(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting every trainee’s grades…</div>`; }
  const batches = [...new Set(AS.rows.map(r => batchLabel(r.batch)).filter(Boolean))].sort();
  const rows = AS.rows.filter(r => !AS.batch || batchLabel(r.batch) === AS.batch);
  const cell = pct => `<td class="sc-n t-${tier(pct)}">${pctTxt(pct)}</td>`;
  return `<div class="card sc-admin">
    <div class="sc-admin-bar"><div><h2>🏅 Scorecards</h2><p class="sc-about">Each trainee’s grades, collected from all of the platform’s grading systems. Click a trainee for the details.</p></div>
      <span><select onchange="lshProgram.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AS.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="lshProgram.refresh()">↻ Refresh</button></span></div>
    ${rows.length ? `<div class="sc-scroll"><table class="sc-tbl sc-admin-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Lessons</th>${CFG.sources.map(s => `<th>${s.icon} ${e(s.label)}</th>`).join("")}<th>Overall</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="sc-row" onclick="lshProgram.toggle('${e(r.id)}')"><td class="sc-who"><b>${e(r.name)}</b></td><td class="sc-batch" title="${e(r.batch)}">${e(batchLabel(r.batch))}</td><td>${r.sc.done} / ${r.sc.total}</td>${r.sc.rows.map(x => cell(x.avg)).join("")}${cell(r.sc.overall)}</tr>
        ${AS.open[r.id] ? `<tr class="sc-open"><td colspan="${CFG.sources.length + 4}">${detail(r.sc)}</td></tr>` : ""}`).join("")}
    </tbody></table></div>` : `<p class="sc-empty">No approved trainees${AS.batch ? " in this batch" : ""} yet.</p>`}
    <p class="sc-how">${HOW}</p></div>`;
}
// The Admin screen's tabs, grouped in the same sections: a row of sections, then the open section's tabs (one row each,
// scrolling sideways on a phone) instead of every tab in one long bar. A tab not in LSH_PROGRAM.adminGroups goes to
// Admin Master Control, so a new tab is never lost.
const GROUPS = [
  {id:"admin", label:"🛡 Admin Master Control"}, {id:"modules", label:"📚 Dashboard"},
  {id:"lab", label:"🛠 Practice Lab"}, {id:"scorecard", label:"🏅 Scorecard"}
];
const groupOf = tab => { const g = CFG.adminGroups || {}; return Object.keys(g).find(k => (g[k] || []).includes(tab)) || "admin"; };
function groupTabs(out){
  const a = out.indexOf('<div class="admin-tabs"'); if(a < 0) return out;
  const b = out.indexOf("</div>", a) + 6;
  const t = document.createElement("template"); t.innerHTML = out.slice(a, b);
  const tabs = [...t.content.querySelectorAll(".admin-tab-btn")].map(x => ({id:((x.getAttribute("onclick") || "").match(/setAdminTab\('([^']+)'\)/) || [])[1], html:x.outerHTML})).filter(x => x.id);
  if(!tabs.length) return out;
  const cur = groupOf(state.adminTab || "audit");
  const secs = GROUPS.map(g => ({g, tabs:tabs.filter(x => groupOf(x.id) === g.id)})).filter(x => x.tabs.length);
  const bar = `<div class="admin-tabs lp-admin-tabs"><div class="lp-admin-secs">${secs.map(x => `<button type="button" class="lp-admin-sec${x.g.id === cur ? " active" : ""}" onclick="setAdminTab('${x.tabs[0].id}')">${x.g.label}<span>${x.tabs.length}</span></button>`).join("")}</div>
    <div class="lp-admin-row">${(secs.find(x => x.g.id === cur) || secs[0]).tabs.map(x => x.html).join("")}</div></div>`;
  return out.slice(0, a) + bar + out.slice(b);
}
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "scorecards" ? "active" : ""}" onclick="setAdminTab('scorecards')">🏅 Scorecards</button>`;
  if(state.isAdmin && state.adminTab === "scorecards"){
    state.adminTab = "opendays";                   // borrow the tab bar…
    const out = __admin.apply(this, arguments);
    state.adminTab = "scorecards";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    return groupTabs(out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>" + renderAdminScores());
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return groupTabs(end > 0 ? out.slice(0, end) + tab + out.slice(end) : out);
};

window.lshProgram = {
  compute, section, mine:() => compute(mineCtx()),
  scorecard(){ if(adminOn()){ state.adminTab = "scorecards"; goto("admin"); } else goto("scorecard"); },
  batch(b){ AS.batch = b; render(); },
  refresh(){ AS.rows = null; AS.fresh = true; render(); },
  toggle(id){ AS.open[id] = !AS.open[id]; render(); }
};

const st = document.createElement("style"); st.id = "lsh-program"; st.textContent = `
/* the sections in the top bar */
.topbar .nav button.lp-sec{font-weight:700;}
/* 🏠 Main Portal ends the bar, so js/portal-link.js's own ← Training Directory button isn't shown */
.topbar .nav .nav-portal{display:none !important;}
/* the Admin screen's tabs, grouped: the sections, then the open section's tabs */
.admin-tabs.lp-admin-tabs{display:block !important;border-bottom:1px solid var(--line);margin-bottom:20px;white-space:normal;overflow:visible;}
.lp-admin-secs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.lp-admin-sec{font:inherit;font-size:13.5px;font-weight:700;border:1px solid #DDE1EC;background:#fff;color:var(--navy);border-radius:999px;padding:6px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;}
.lp-admin-sec span{font-size:11px;font-weight:800;background:#ECEEF5;color:#4A5070;border-radius:999px;padding:1px 7px;}
.lp-admin-sec:hover{border-color:#353B57;} .lp-admin-sec.active{background:var(--navy);border-color:var(--navy);color:#fff;} .lp-admin-sec.active span{background:rgba(255,255,255,.2);color:#fff;}
.lp-admin-row{display:flex;gap:8px;flex-wrap:wrap;}
@media(max-width:760px){
  /* a phone: the four sections in a 2 × 2 grid, the open section's tabs as buttons that wrap, so all of them show */
  .lp-admin-secs{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .lp-admin-sec{font-size:12.5px;padding:7px 8px;justify-content:center;white-space:normal;text-align:center;line-height:1.2;}
  .lp-admin-row{gap:6px;padding:4px 0 10px;}
  .lp-admin-row .admin-tab-btn{font-size:13px;padding:6px 11px;border:1px solid #DDE1EC !important;border-radius:999px;background:#fff;}
  .lp-admin-row .admin-tab-btn.active{background:#FFF3E6;border-color:var(--orange) !important;color:var(--navy);}
}
/* the Dashboard and Scorecard pages */
main.main-lp{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.lp-eyebrow{font-size:11px !important;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep) !important;margin:0 0 4px !important;}
/* .dash-hero-ribbon has order:-1 to sit in the grid's narrow first column (140px); without it (a plain admin,
   not previewing, gets no completion ribbon) the lone .dash-hero-text falls into that 140px column instead
   and wraps one word per line. Pin it to the wide column explicitly, ribbon or not — on both the Scorecard's
   main-lp and the Dashboard page's main-dash. */
main.main-lp .dash-hero-text,main.main-dash .dash-hero-text{grid-column:2;}
/* compact lesson cards (compactCard): the title, then the icon beside Start, then the small buttons on one row
   that wrap their words rather than cut them off */
main.main-dash .module-grid:has(.mc-compact){grid-auto-rows:minmax(0,1fr) !important;align-content:stretch !important;gap:12px !important;}
@media(min-width:1001px){main.main-dash .module-grid:has(> :nth-child(11)):not(:has(> .ftdd-daycell)){grid-template-columns:repeat(6,minmax(0,1fr)) !important;}}
main.main-dash .module-card.mc-compact{display:flex;flex-direction:column;height:100% !important;min-height:0 !important;}
main.main-dash .module-card.mc-compact > .module-head{padding:6px 8px 5px !important;min-height:0 !important;flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;overflow:hidden;}
main.main-dash .module-card.mc-compact .mh-title{font-size:14px !important;line-height:1.2 !important;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
main.main-dash .module-card.mc-compact .mh-day{font-size:10px !important;line-height:1.15 !important;margin:0 0 1px !important;}
main.main-dash .module-card.mc-compact .mh-day:empty, main.main-dash .module-card.mc-compact .mh-day:not(:has(*)):is(:empty){display:none;}
main.main-dash .module-card.mc-compact > .mc-startrow{display:flex;align-items:stretch;gap:0;border-top:1px solid #9CA3B8;}
main.main-dash .module-card.mc-compact > .mc-startrow > .module-icon{flex:0 0 auto;width:46px;display:grid;place-items:center;font-size:22px !important;margin:0 !important;background:#F6F7FB;border-right:1px solid #9CA3B8;}
main.main-dash .module-card.mc-compact > .mc-startrow > .module-start-btn{flex:1 1 auto;min-height:0 !important;padding:5px 10px !important;font-size:14px !important;border-radius:0 !important;margin:0 !important;}
main.main-dash .module-card.mc-compact > .mc-grid{display:flex !important;grid-template-columns:none !important;border-top:1px solid #9CA3B8;margin-top:0 !important;}
main.main-dash .module-card.mc-compact > .mc-grid > button{flex:1 1 0;min-width:0;white-space:normal !important;line-height:1.2 !important;padding:5px 4px !important;font-size:12px !important;min-height:0 !important;overflow:visible !important;text-overflow:clip !important;grid-column:auto !important;}
main.main-dash .module-card.mc-compact > .mc-grid > button:not(:last-child){border-right:1px solid #9CA3B8 !important;}
/* 📚 Dashboard's top row, kept short: the pinned orientation card first, the next-step band (and any live task) beside it */
.dash-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:12px;align-items:stretch;margin-bottom:10px;flex:0 0 auto;}
.dash-pair > div{min-width:0;display:flex;flex-direction:column;gap:8px;}
.dash-pair > div > *{margin:0 !important;}
.dash-pair > div > :last-child{flex:1 1 auto;}
.dash-pair-pin .module-card{width:100%;height:100%;display:flex;flex-direction:column;}
/* …and it takes the look of the stat tiles beside it, rather than reading as a white card on the navy band
   (js/lsh-dashboard.js paints .dash-main .module-card.mc-clean light, so these match its weight) */
.dash-main .dash-pair-pin .module-card.mc-clean{background:linear-gradient(135deg, var(--navy) 0%, var(--navy-soft) 100%) !important;border:1px solid rgba(255,255,255,.14) !important;box-shadow:var(--shadow) !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;color:#fff;}
.dash-main .dash-pair-pin .module-card.mc-clean .module-head{background:none !important;color:#fff !important;border-top:0 !important;border-bottom:1px solid rgba(255,255,255,.12) !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .mh-title,.dash-main .dash-pair-pin .module-card.mc-clean .mh-day{color:#fff !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .module-start-btn{background:#D9DCE5 !important;border-color:#D9DCE5 !important;color:#1E2340 !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .module-start-btn:hover{background:#B9BECC !important;border-color:#B9BECC !important;color:#1E2340 !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .mc-grid,.dash-main .dash-pair-pin .module-card.mc-clean .mc-row{border-top:1px solid rgba(255,255,255,.12) !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .mc-grid a,.dash-main .dash-pair-pin .module-card.mc-clean .mc-grid button:not(.module-start-btn),
.dash-main .dash-pair-pin .module-card.mc-clean .mc-row .module-finish-btn,.dash-main .dash-pair-pin .module-card.mc-clean .module-finish-btn{background:transparent !important;border-color:rgba(255,255,255,.18) !important;color:#E7EAF4 !important;}
.dash-main .dash-pair-pin .module-card.mc-clean .mc-grid a:hover,.dash-main .dash-pair-pin .module-card.mc-clean .mc-grid button:not(.module-start-btn):hover,
.dash-main .dash-pair-pin .module-card.mc-clean .mc-row .module-finish-btn:hover{background:rgba(255,255,255,.12) !important;color:#fff !important;}
.dash-pair .ftn{padding:9px 14px;}
.dash-pair .ftn-head{margin-bottom:4px;}
.dash-pair .ftn h3{font-size:16px;}
.dash-pair .ftn-now{padding:6px 10px;margin-bottom:4px;}
.dash-pair .ftn-now .btn{padding:4px 12px;font-size:12.5px;}
.dash-pair .ftn-then{margin:-2px 0 4px;}
.dash-pair .ftn-more > summary{padding:2px 0;font-size:12px;}
.dash-pair .ftn-after{margin-top:2px;font-size:12.5px;}
@media(max-width:1000px){.dash-pair{grid-template-columns:minmax(0,1fr);}}
/* the pinned orientation card sits beside the numbered lessons as a sidebar, not inside their grid */
.dash-main.lp-lessons-row{display:flex;flex-direction:row;gap:16px;align-items:stretch;}
.lp-lessons-row .module-grid{flex:1;min-width:0;}
/* 8 lessons read as a balanced 4x2 block beside the orientation card, not 5+3 (narrower screens keep the
   existing responsive auto-fill/stacked behavior below — this only applies once there's room for it) */
@media(min-width:1001px){.lp-lessons-row .module-grid{grid-template-columns:repeat(4,minmax(0,1fr)) !important;}}
.lp-orient{flex:0 0 220px;display:flex;}
.lp-orient .module-card{width:100%;}
@media(max-width:820px){.lp-lessons-row{flex-direction:column;} .lp-orient{flex-basis:auto;}}
/* 8 lessons read as a balanced 4x2 block, not the shared five-across default (js/lsh-dashboard.js) — narrower
   screens keep its existing responsive auto-fill/stacked behavior. */
@media(min-width:1001px){main.main-dash .module-grid{grid-template-columns:repeat(4,minmax(0,1fr)) !important;}}
/* 9 or 10 lessons (Lesson 9 is the Days 17–18 deck) take two rows of five, so none drops to a third row below the fold */
@media(min-width:1001px){main.main-dash .module-grid:has(> :nth-child(9)):not(:has(> :nth-child(11))){grid-template-columns:repeat(5,minmax(0,1fr)) !important;}}
/* The scores band is one slim row under the lesson cards — the cards are the page's focus, so the band
   takes as little of the screen's height as it can: every box on one line, number + label only (the
   feedback stars, the "Rate <lesson>" button and the ranking's list and formula stay off the band). */
@media(min-width:1001px){
  main.main-dash .dash-main > .dash-side{padding:6px 8px !important;margin-top:8px !important;}
  main.main-dash .dash-side-inner{display:flex !important;flex-wrap:nowrap !important;gap:6px !important;align-items:stretch !important;}
  main.main-dash .dash-side-inner > *{flex:1 1 0 !important;min-width:0 !important;margin:0 !important;padding:6px 10px !important;display:flex !important;flex-direction:column !important;justify-content:center !important;overflow:hidden !important;}
  main.main-dash .dash-side-inner .num{font-size:15px !important;line-height:1.15 !important;}
  main.main-dash .dash-side-inner .lbl{font-size:9px !important;line-height:1.3 !important;margin-top:2px !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  main.main-dash .dash-side-inner .tfb-dash-stars, main.main-dash .dash-side-inner .tfb-dash .sub, main.main-dash .dash-side-inner .tfb-dash .btn-ghost,
  main.main-dash .dash-side-inner .rank-list, main.main-dash .dash-side-inner .rank-card .sub{display:none !important;}
  main.main-dash .dash-side-inner .tfb-dash-actions{margin-top:3px;}
  main.main-dash .dash-side-inner .tfb-dash .btn{padding:2px 9px !important;font-size:10.5px !important;white-space:nowrap;}
  /* Resume and the certificate ride in the band as its last box, not on a line of their own under it */
  main.main-dash .dash-side-inner > .lp-home-acts{flex-direction:row !important;align-items:center !important;gap:6px;padding:4px 6px !important;}
  main.main-dash .dash-side-inner > .lp-home-acts > *{min-width:0;max-width:100%;flex:0 1 auto;padding:4px 9px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  /* ▶ Resume where you left off carries the lesson's name: in the band it has to give way, so the name is cut
     with an ellipsis inside the button rather than running past the tile it sits in */
  main.main-dash .dash-side-inner > .lp-home-acts > .resume-btn{display:inline-flex;align-items:center;gap:6px;overflow:hidden;}
  main.main-dash .dash-side-inner > .lp-home-acts > .resume-btn > span{min-width:0;flex:0 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  /* An open lesson's card has three small buttons (☰ Topics, ✓ Finish Training, ▶ Video Presentation): one row
     of three under Start, not three stacked rows, so both rows of lessons fit on the screen with the band */
  main.main-dash .dash-main .module-card.mc-clean > .mc-grid.mc-n3{grid-template-columns:auto 1fr 1fr;}
  main.main-dash .dash-main .module-card.mc-clean > .mc-grid.mc-n3 > .module-start-btn{grid-column:1 / -1;}
  main.main-dash .dash-main .module-card.mc-clean > .mc-grid.mc-n3 > button:not(.module-start-btn){grid-column:span 1;padding-left:10px;padding-right:10px;}
  main.main-dash .dash-main .module-card.mc-clean > .mc-grid.mc-n3 > button:not(.module-start-btn):not(:last-child){border-right:1px solid #9CA3B8 !important;}
}
/* …and on a laptop or desktop the scores sit in the top row, beside the orientation card (where the next-step
   band was): a block of tiles, two rows of four, so the lesson cards below get the whole width and height. */
@media(min-width:1001px){
  main.main-dash .dash-main{display:grid !important;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;align-items:stretch;}
  main.main-dash .dash-main > .module-grid{grid-row:2;min-height:0;}
  main.main-dash .dash-main > .lsh-below{grid-row:3;min-width:0;}
  main.main-dash .dash-pair-now > .dash-side{margin:0 !important;padding:6px !important;min-height:0;}
  main.main-dash .dash-pair-now .dash-side-inner{display:grid !important;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:6px !important;height:100%;}
  main.main-dash .dash-pair-now .dash-side-inner > *{min-height:0;}
  main.main-dash .dash-pair-now .dash-side-inner .num{font-size:17px !important;}
  main.main-dash .dash-pair-now .dash-side-inner .lbl{font-size:9.5px !important;}
  main.main-dash .dash-pair-now .dash-side-inner > .lp-home-acts{flex-direction:column !important;align-items:stretch !important;justify-content:center !important;}
  main.main-dash .dash-pair-now .dash-side-inner > .lp-home-acts > *{text-align:center;justify-content:center;}
}
/* a laptop-height screen: the banner gives up some height so the lesson cards keep theirs */
@media(min-width:1001px) and (max-height:820px){
  main.main-dash .dash-top{padding-top:10px !important;padding-bottom:6px !important;}
  main.main-dash .dash-hero{margin-bottom:2px !important;}
  main.main-dash .dash-hero-ribbon svg{max-height:66px;width:auto;}
  main.main-dash .dash-hero-ribbon{max-height:66px;}
  main.main-dash .step-timeline{padding-top:4px !important;padding-bottom:0 !important;}
  main.main-dash .module-grid:has(> :nth-child(11)){gap:8px !important;}
  main.main-dash .module-grid:has(> :nth-child(11)) > .module-card.mc-compact > .module-head{padding:3px 8px 2px !important;}
  main.main-dash .module-grid:has(> :nth-child(11)) > .module-card.mc-compact .mh-title{font-size:12.5px !important;}
  main.main-dash .module-grid:has(> :nth-child(11)) > .module-card.mc-compact > .mc-startrow > .module-start-btn{padding:3px 8px !important;}
  main.main-dash .module-grid:has(> :nth-child(11)) > .module-card.mc-compact > .mc-grid > button{padding:2px 4px !important;}
}
.lp-home-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:16px 0 0;}
.dash-side-inner > .lp-home-acts{margin:0;}
/* 📚 Dashboard's own pages (Task Tracker, Monitoring Sheet, My Notes, My Performance; an admin's Orientation) */
.lp-pages{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:22px 0 0;}
.lp-pages .lp-page{display:inline-flex;align-items:center;gap:7px;}
.lp-pages .lp-page.active{border-color:var(--orange);color:var(--navy);background:#FFF3E6;}
/* the compact stat band under the lessons (the sibling courses' dashboard side band, here a plain row of
   cards instead of its own dark panel — see statsBand() in js/lsh-program.js) */
.lp-home-stats{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 0;}
.lp-home-stats .card.stat{flex:1 1 128px;padding:10px 12px;min-width:0;}
.lp-home-stats .card.stat .num{font-size:21px;font-weight:800;color:var(--navy);line-height:1.1;}
.lp-home-stats .card.stat .lbl{font-size:11.5px;color:var(--ink-soft);}
.lp-home-stats .tfb-dash, .lp-home-stats .rank-card{flex:1.6 1 190px;}
/* the feedback and ranking cards were built for the dashboard's dark side band: here they sit on white cards */
.lp-home-stats .tfb-dash .lbl{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep);}
.lp-home-stats .tfb-dash .sub{font-size:13.5px;color:var(--ink-soft);line-height:1.45;}
.lp-home-stats .tfb-dash-stars button{color:#D9DEEA;}
.lp-home-stats .tfb-dash-stars:hover button{color:#E3A35F;}
.lp-home-stats .tfb-dash-stars button:hover ~ button{color:#D9DEEA;}
.lp-home-stats .rank-card .lbl{color:var(--navy);font-weight:700;}
.lp-home-stats .rank-card .num span{font-size:13px;color:var(--ink-soft);font-family:inherit;font-weight:400;}
.lp-home-stats .rank-card .sub{font-size:11px;color:var(--ink-soft);margin-top:6px;}
.lp-home-stats .rank-list li{color:var(--ink);}
.lp-home-stats .rank-list li .sc{color:var(--orange-deep);}
.lp-home-stats .rank-list li.me{background:#FFF3E6;color:var(--navy);}
.lp-home-stats .rank-list li.gap{color:var(--ink-soft);}
.lp-lessons{margin-bottom:22px;}
/* the Lessons grid: the same clean module-card look as the EA/PA course's dashboard (see js/lsh-dashboard.js).
   js/lsh-dashboard.js sizes that card to fill a fixed-height hero row (container-type:size, overflow:hidden) —
   here the card grows to fit its own content instead, so every lesson's activities stay visible. */
.lp-lessons .module-card, .lp-orient .module-card{height:auto;}
/* every card in a row matches the tallest one, and every header reserves room for a 3-line title, so a short
   title ("Receptionist Training") and a long one ("Calendaring & Appointment Setting Training") still line up:
   the icon sits at the same height across the row and the Start button sits flush with the card bottom. */
.lp-lessons .module-grid{align-items:stretch;}
.lp-lessons .module-card.mc-clean .module-head, .lp-orient .module-card.mc-clean .module-head{min-height:92px;}
.lp-lessons .module-card.mc-clean .module-start-btn, .lp-orient .module-card.mc-clean .module-start-btn{margin-top:auto;}
.lp-lessons .module-card.mc-clean .module-body, .lp-orient .module-card.mc-clean .module-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:16px 16px 10px;flex:0 1 auto;min-height:0;overflow:visible;container-type:normal;}
/* the dashboard's module-theme is line-clamped to fit a fixed-height hero card (display:-webkit-box + overflow:hidden,
   which collapses to 0 height without that fixed height) — here it's plain wrapping text, same specificity so it wins */
.lp-lessons .module-card.mc-clean .module-theme, .lp-orient .module-card.mc-clean .module-theme{display:block;-webkit-line-clamp:unset;overflow:visible;max-width:none;}
.lp-lessons .module-icon, .lp-orient .module-icon{font-size:30px;line-height:1;}
.lp-lessons .module-theme, .lp-orient .module-theme{font-size:12.5px;color:var(--ink-soft);}
.lp-kc{font-weight:700;}
.sc-src-ic{width:32px;height:32px;border-radius:10px;background:#FFF3E6;border:1px solid #F7DEC6;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
/* score colours: 85% and up, 70% (passing) and up, under 70%, nothing yet */
.t-top{color:#1E7F4F !important;} .t-ok{color:#2F5BA8 !important;} .t-low{color:#B5531A !important;} .t-none{color:#8A90A6 !important;}
.sc-hero{display:flex;gap:22px;align-items:center;padding:20px 24px;margin-bottom:18px;flex-wrap:wrap;}
.sc-hero-t{flex:1 1 320px;min-width:0;} .sc-hero-t h1{margin:0 0 6px;color:var(--navy);font-size:27px;} .sc-hero-t p{margin:0;color:var(--ink-soft);font-size:14px;}
.sc-facts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;} .sc-facts span{font-size:12.5px;background:#F3F4F8;border-radius:999px;padding:4px 11px;color:#4A5070;} .sc-facts b{color:var(--navy);}
.sc-hero-acts{display:flex;gap:8px;flex-wrap:wrap;}
.sc-ring{--p:0;width:118px;height:118px;border-radius:50%;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(closest-side,#fff 78%,transparent 79%),conic-gradient(currentColor calc(var(--p)*1%),#ECEEF5 0);}
.sc-ring span{font-size:28px;font-weight:800;line-height:1;} .sc-ring small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8A90A6;margin-top:3px;}
.sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px;}
.sc-src{padding:16px 18px;display:flex;flex-direction:column;gap:8px;}
.sc-src-h{display:flex;align-items:center;gap:9px;} .sc-src-h b{flex:1;color:var(--navy);font-size:16px;}
.sc-pill{font-weight:800;font-size:15px;}
.sc-about{margin:0;font-size:13px;color:var(--ink-soft);line-height:1.45;}
.sc-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
.sc-tbl td, .sc-tbl th{padding:7px 8px;border-top:1px solid #ECEEF4;text-align:left;vertical-align:top;}
.sc-tbl td span{display:block;font-size:12px;color:#8A90A6;margin-top:1px;}
.sc-tbl .sc-n{text-align:right;font-weight:800;white-space:nowrap;}
.sc-empty{margin:0;font-size:13px;color:#8A90A6;}
.sc-how{margin:16px 2px 0;font-size:12.5px;color:#8A90A6;}
.sc-admin{padding:18px 20px;} .sc-admin-bar{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;}
.sc-admin-bar h2{margin:0 0 4px;color:var(--navy);font-size:20px;} .sc-admin-bar > span{display:flex;gap:8px;align-items:center;}
.sc-admin-bar select{font:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid #DDE1EC;}
.sc-scroll{overflow-x:auto;}
.sc-admin-tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7088;background:#F7F8FB;white-space:nowrap;}
.sc-admin-tbl th:nth-child(n+3){text-align:right;} .sc-admin-tbl td:nth-child(3){text-align:right;white-space:nowrap;}
.sc-row{cursor:pointer;} .sc-row:hover td{background:#F7F8FB;}
/* 🏅 Scorecards is a wide table: give its page the window, not the 1180px the reading pages use. */
body:has(.sc-admin) main{max-width:min(1800px, calc(100vw - 32px)) !important;}
.sc-admin-tbl .sc-who, .sc-admin-tbl .sc-batch{white-space:nowrap;}
.sc-admin-tbl .sc-batch{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;color:#4A5070;}
.sc-admin-tbl th:first-child, .sc-admin-tbl th:nth-child(2){white-space:nowrap;}
.sc-scroll{overflow-x:auto;}
.sc-open > td{background:#FBFBFD;padding:14px;}
@media print{ .topbar, .footer-note, .sc-hero-acts{display:none !important;} main.main-lp{padding:0;} .sc-src{break-inside:avoid;} }
`; document.head.appendChild(st);
if(typeof render === "function" && typeof state !== "undefined" && state.view && state.view !== "login"){ try{ render(); }catch(err){} }
})();
