/* ============================================================
   📅 STANDARD TRAINING - CALENDARING ACTIVITY (#/calweek), a card in 🛠 Practice Lab → 🟢 Practice Sessions
   ------------------------------------------------------------
   The standalone clone of the Standard Training calendar set-up: Attorney Rivera's week (js/ft-calweek-core.js) on a
   real calendar. It opens on this work week (Monday to Friday, Eastern Time, from the server's clock: the current week
   resolver), and the trainee books every task on NEXT week, Monday of Week + 1 from today. Bookings are kept as offsets
   from the week (weekday, time, length), never as dates, so they always sit on the coming week however long ago they
   were made (the relative scheduling engine). It is linked to Day 5's Attorney Calendar Management Activity (the
   instructions and samples) and sits beside Standard Training - Appointment Setting Mock Calls (the Practice Session
   that was the Calendaring Practice Lab).
   Isolated from the core calendars: it reads and writes only through /api/calweek/* (calweek-api.js) and the record
   calweek:<id>; the Calendaring Simulators (calsim:<id>, js/ft-calendar.js), the Booking Rule Check (calrules:<id>)
   and the Main Portal's Google Calendar Simulator are not touched.
   Admin → 🛠 Practice Lab → 📅 Calendaring Activity lists every trainee's bookings and their check.
   🧪 STANDARD TRAINING - CALENDAR PRACTICE (VA PRACTICE ONLY) (#/calpractice), the card beside it: a second clone, built
   by the same make() on its own week (Week 2 · Attorney Chen, js/ft-calweek-core.js PRACTICE), route set
   (/api/calpractice/*) and record (calpractice:<id>). Practice only: checked on the spot, but never graded, never sent,
   no trainer tab, no webhook; ↺ Start over clears it. It is open any day (no day lists it, so no Activity Lock holds it).
   ============================================================ */
(function(){
"use strict";
const C = window.FTCalWeekCore; if(!C) return;
const e = v => esc(String(v == null ? "" : v));
const ATTORNEY_ACTIVITY = "https://drive.google.com/file/d/1VNgbFDn3PgkPwkE6g0PwXYxo-7DmU3MP/view?usp=sharing";   // Day 5, slide s3 (build/days/day05.js)
const ATTORNEY_SAMPLES = "https://drive.google.com/drive/folders/1lLquhtY5XQd85X5IEXJcRCkpV39UA8wW?usp=sharing";
// One calendar page per cfg: {view, api, week, global, card, icon, kicker, note, practice}. Each keeps its own state,
// route, record (through its own /api/ route set) and week; nothing passes between them.
function make(cfg){
  const W = cfg.week, G = cfg.global;
  const R = {data: null, loading: false, err: "", skew: 0, week: "current", edit: null, saving: false, who: ""};
  // the server's clock, as last read (Date.now() until it answers)
  const now = () => Date.now() + R.skew;

  async function call(path, body){
    const res = await authFetch(cfg.api + path, Object.assign({id: state.traineeId || ""}, body || {}));
    const j = await res.json().catch(() => ({}));
    if(!res.ok) throw new Error(j.error || ("HTTP " + res.status));
    if(typeof j.now === "number") R.skew = j.now - Date.now();
    return j;
  }
  async function load(force){
    if(R.loading || (R.data && !force && R.who === state.traineeId)) return;
    R.loading = true; R.err = ""; R.who = state.traineeId;
    try{ R.data = await call("get"); }
    catch(err){ R.err = String(err.message || err); R.data = R.data || offline(); }
    R.loading = false; if(state.view === cfg.view) render();
  }
  // the page still works on the browser's clock when the server can't be reached (nothing saved)
  const offline = () => ({now: Date.now(), current: C.currentWeek(Date.now()), next: C.nextWeek(Date.now()), record: null, placed: [], review: C.review([], W)});
  const events = () => (R.data && R.data.record && Array.isArray(R.data.record.events)) ? R.data.record.events.slice() : [];

  async function save(list, submit){
    if(R.saving) return; R.saving = true; render();
    try{ R.data = await call("save", {events: list, submit: !!submit}); R.edit = null;
      toast(submit ? "📤 Sent to your trainer." : cfg.practice ? "💾 Saved to your practice calendar (never graded)." : "💾 Saved: it’s on next week’s calendar."); }
    catch(err){ toast("Couldn’t save: " + (err.message || err)); }
    R.saving = false; render();
  }
  function readForm(){
    const v = id => { const el = document.getElementById(id); return el ? (el.type === "checkbox" ? el.checked : el.value) : ""; };
    return {task: R.edit, title: (C.taskOf(R.edit, W) || {}).title, d: Number(v("cwDay")), m: Number(v("cwStart")), dur: Number(v("cwLen")),
      color: v("cwColor"), desc: v("cwDesc"), meet: !!v("cwMeet"), remind: !!v("cwRemind")};
  }

  /* ---------- the week grid ---------- */
  const TOP = 8 * 60, BOT = 18 * 60, PX = 0.9;   // 8:00 AM to 6:00 PM, px per minute
  function grid(wk, mine){
    const z = C.zoned(now(), C.TZ), hours = []; for(let h = TOP; h < BOT; h += 60) hours.push(h);
    const box = (x, cls, title, sub, style) => `<div class="cw-ev ${cls}" style="top:${(x.start - TOP) * PX}px;height:${Math.max(16, (x.end - x.start) * PX - 2)}px;${style || ""}" title="${e(title)}"><b>${e(title)}</b><small>${e(sub)}</small></div>`;
    const cols = wk.days.map((iso, d) => {
      const fixed = W.fixed.filter(f => f.d === d).map(f => box(f, "cw-" + f.kind, f.title, `${C.fmt(f.start)} – ${C.fmt(f.end)}`));
      const own = mine.filter(x => x.d === d).map(x => { const c = C.colorOf(x.color);
        return box({start: x.m, end: x.m + x.dur}, "cw-mine", x.title, `${C.fmt(x.m)} · ${x.dur} min`, c ? `background:${c.hex};border-color:${c.hex};` : ""); });
      const line = iso === z.iso && z.min >= TOP && z.min < BOT ? `<div class="cw-now" style="top:${(z.min - TOP) * PX}px"></div>` : "";
      return `<div class="cw-col ${iso === z.iso ? "today" : ""}"><div class="cw-dh">${e(C.DAYS[d].slice(0, 3))} <b>${e(Number(iso.slice(8)))}</b></div><div class="cw-body" style="height:${(BOT - TOP) * PX}px">${hours.map(h => `<i style="top:${(h - TOP) * PX}px"></i>`).join("")}${fixed.join("")}${own.join("")}${line}</div></div>`;
    }).join("");
    return `<div class="cw-grid"><div class="cw-hours"><div class="cw-dh"></div><div style="position:relative;height:${(BOT - TOP) * PX}px">${hours.map(h => `<span style="top:${(h - TOP) * PX}px">${e(C.fmt(h))}</span>`).join("")}</div></div>${cols}</div>`;
  }

  /* ---------- the booking form (one task) ---------- */
  function formHtml(k, x, wk){
    x = x || {d: 0, m: C.OPEN, dur: k.dur, color: "", desc: "", meet: false, remind: false};
    const times = []; for(let m = 8 * 60; m < 18 * 60; m += C.STEP) times.push(m);
    const lens = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180];
    return `<div class="cw-form"><div class="cw-fgrid">
        <label>Day (next week)<select id="cwDay">${wk.days.map((iso, d) => `<option value="${d}" ${d === x.d ? "selected" : ""}>${e(C.DAYS[d])}, ${e(iso.slice(5).replace("-", "/"))}</option>`).join("")}</select></label>
        <label>Start (${e(C.TZ_LABEL)})<select id="cwStart">${times.map(m => `<option value="${m}" ${m === x.m ? "selected" : ""}>${e(C.fmt(m))}</option>`).join("")}</select></label>
        <label>Length<select id="cwLen">${lens.map(n => `<option value="${n}" ${n === x.dur ? "selected" : ""}>${n} min</option>`).join("")}</select></label>
        <label>Color<select id="cwColor"><option value="">Calendar default</option>${C.COLORS.map(c => `<option value="${c.id}" ${c.id === x.color ? "selected" : ""}>${e(c.name)}</option>`).join("")}</select></label>
        <label class="w">Description<textarea id="cwDesc" rows="2" placeholder="What it is for, who is involved">${e(x.desc)}</textarea></label>
        <label class="ck"><input type="checkbox" id="cwMeet" ${x.meet ? "checked" : ""}> Add Google Meet</label>
        <label class="ck"><input type="checkbox" id="cwRemind" ${x.remind ? "checked" : ""}> Email reminder 1 day before</label></div>
      <div class="cw-fact"><button class="btn btn-navy btn-sm" type="button" ${R.saving ? "disabled" : ""} onclick="${G}.book()">💾 Save on next week’s calendar</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="${G}.edit('')">Cancel</button></div></div>`;
  }
  function taskRow(k, rv, x, wk){
    const it = (rv.items || []).find(i => i.task === k.id) || {checks: []}, at = x ? C.resolve(x, now()) : null;
    const miss = it.checks.filter(c => !c.ok && c.why);
    return `<div class="card cw-task ${it.perfect ? "ok" : x ? "bad" : ""}"><div class="cw-thead"><div><b>${e(k.title)}</b> <span class="fss-muted">${k.dur} min</span>
        <small>${e(k.note)}</small>${at ? `<small class="cw-at">📅 ${e(at.label)} · ${x.dur} min${it.perfect ? " · ✓ every rule met" : ""}</small>` : ""}</div>
        <span class="cw-tact">${x ? `<button class="btn btn-ghost btn-sm" type="button" onclick="${G}.edit('${k.id}')">✎ Edit</button><button class="btn btn-ghost btn-sm" type="button" onclick="${G}.remove('${k.id}')">✕</button>` : `<button class="btn btn-navy btn-sm" type="button" onclick="${G}.edit('${k.id}')">＋ Book it</button>`}</span></div>
      ${x && miss.length ? `<ul class="cw-miss">${miss.map(c => `<li><b>${e(c.label)}:</b> ${e(c.why)}</li>`).join("")}</ul>` : ""}
      ${R.edit === k.id ? formHtml(k, x, wk) : ""}</div>`;
  }

  function renderPage(){
    if(!R.data){ load(); return `<div class="card" style="padding:24px;">Loading next week’s calendar…</div>`; }
    const d = R.data, cur = d.current, nxt = d.next, mine = events(), rv = d.review || C.review(mine, W), rec = d.record;
    const showNext = R.week === "next", wk = showNext ? nxt : cur;
    return `<div class="cw-hero"><h1>${cfg.icon} ${e(W.title)}</h1>
        ${cfg.practice ? `<p class="cw-practice">🧪 <b>VA Practice Only.</b> Your trainer doesn’t grade or see this calendar, and it counts nowhere. Practise as often as you like, then do the graded ${window.FTCalWeek && (!window.ftsToolOn || ftsToolOn("calweek")) ? `<a onclick="FTCalWeek.open()">Standard Training - Calendaring Activity</a>` : "Standard Training - Calendaring Activity"}.</p>` : ""}
        <p>${e(W.brief)}</p>
        <p class="cw-links">${cfg.practice ? "" : `${window.FTCalPractice ? `<button class="btn btn-ghost btn-sm" type="button" onclick="FTCalPractice.open()">🧪 Practise first (VA Practice Only)</button>` : ""}`}<button class="btn btn-ghost btn-sm" type="button" onclick="${G}.attorneyActivity()">📎 Attorney Calendar Management Activity (Day 5)</button>
          <a class="btn btn-ghost btn-sm" href="${ATTORNEY_ACTIVITY}" target="_blank" rel="noopener">The activity sheet ↗</a>
          <a class="btn btn-ghost btn-sm" href="${ATTORNEY_SAMPLES}" target="_blank" rel="noopener">Samples ↗</a>
          ${window.FTSessions ? `<button class="btn btn-ghost btn-sm" type="button" onclick="FTSessions.open('calendaring')">☎ Standard Training - Appointment Setting Mock Calls</button>` : ""}</p></div>
      ${R.err ? `<p class="cw-warn">⚠ The server didn’t answer (${e(R.err)}): the calendar uses this computer’s clock and nothing can be saved until it’s back. <button class="btn btn-ghost btn-sm" onclick="${G}.reload()">↻ Try again</button></p>` : ""}
      <div class="card cw-cal"><div class="cw-bar">
          <span class="cw-tabs"><button class="btn btn-sm ${showNext ? "btn-ghost" : "btn-navy"}" type="button" onclick="${G}.week('current')">This week</button><button class="btn btn-sm ${showNext ? "btn-navy" : "btn-ghost"}" type="button" onclick="${G}.week('next')">Next week · your bookings</button></span>
          <b>${e(wk.label)}</b><span class="fss-muted">${e(C.TZ_LABEL)}</span></div>
        ${showNext ? "" : `<p class="cw-note">This is the attorney’s week as it stands. Everything you book goes on <b>next week, ${e(nxt.label)}</b>: it moves on with the calendar, so it is always the coming week.</p>`}
        ${grid(wk, showNext ? mine : [])}</div>
      <div class="cw-score card"><b class="cw-pct ${rv.passed ? "ok" : rv.pct >= 50 ? "mid" : "low"}">${rv.pct}%</b>
        <span>${rv.done} of ${W.tasks.length} tasks booked with every rule met · ${cfg.practice ? "practice only, never graded" : `${C.PASS}% passes`}.${rec && rec.submittedAt ? ` Sent to your trainer ${e(new Date(rec.submittedAt).toLocaleString())}.` : ""}</span>
        ${cfg.practice ? `<button class="btn btn-ghost btn-sm" type="button" ${R.saving || !mine.length || R.err ? "disabled" : ""} onclick="${G}.reset()">↺ Start over</button>`
          : `<button class="btn btn-navy btn-sm" type="button" ${R.saving || !mine.length || R.err ? "disabled" : ""} onclick="${G}.submit()">📤 Submit to your trainer</button>`}</div>
      <h2 class="cw-h2">The tasks to book <span class="fss-muted">· ${e(C.COLOR_RULE_TEXT)}</span></h2>
      ${W.tasks.map(k => taskRow(k, rv, mine.find(x => x.task === k.id), nxt)).join("")}`;
  }

  window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat([cfg.view]);
  window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {[cfg.view]: W.title});
  const __render = window.render;
  window.render = function(){
    if(state.view !== cfg.view) return __render.apply(this, arguments);
    if(!state.traineeId){ state.view = "dashboard"; return __render.apply(this, arguments); }
    const app = document.getElementById("app");
    app.innerHTML = renderTopbar() + `<main class="main-cw"><a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>${renderPage()}</main>` + renderFooter();
    try{ afterRender(); }catch(err){}
  };
  window[G] = {
    open(){ goto(cfg.view); },
    week(w){ R.week = w === "next" ? "next" : "current"; render(); },
    edit(id){ R.edit = id || null; if(id) R.week = "next"; render(); },
    book(){ if(!R.edit) return; const x = readForm(), list = events().filter(y => y.task !== x.task).concat([x]); save(list); },
    remove(id){ save(events().filter(y => y.task !== id)); },
    submit(){ if(!cfg.practice) save(events(), true); },
    async reset(){ if(!cfg.practice || R.saving || !confirm("Start your practice calendar over? Every practice booking is cleared.")) return;
      R.saving = true; render();
      try{ R.data = await call("reset"); R.edit = null; toast("↺ Your practice calendar is clear."); }catch(err){ toast("Couldn’t start over: " + (err.message || err)); }
      R.saving = false; render(); },
    reload: () => load(true),
    attorneyActivity(){ if(window.FTDayDecks && FTDayDecks.slide) FTDayDecks.slide(5, "s3", "modules"); else window.open(ATTORNEY_ACTIVITY, "_blank", "noopener"); },
    state: () => R, now, api: call
  };
  window[cfg.card] = () => `<div class="card fts-card"><div class="fts-kicker">${e(cfg.kicker)}</div><h3>${cfg.icon} ${e(W.title)}</h3>
      <p class="fts-note">${e(cfg.note)}</p>
      <div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="goto('${cfg.view}')">Open the calendar</button></div></div>`;
  return window[G];
}
make({view: "calweek", api: "/api/calweek/", week: C.WEEK, global: "FTCalWeek", card: "ftCalWeekCard", icon: "📅",
  kicker: "Days 5–6 · next week’s calendar", note: `Book ${C.WEEK.tasks.length} tasks on ${C.WEEK.attorney}’s calendar for next week, under the attorney’s rules. It follows the Attorney Calendar Management Activity (Day 5).`});
// 🧪 VA Practice Only: the clone for practice (Week 2 · Attorney Chen), never graded or seen by the trainer
make({view: "calpractice", api: "/api/calpractice/", week: C.PRACTICE, global: "FTCalPractice", card: "ftCalPracticeCard", icon: "🧪", practice: true,
  kicker: "Any time · VA Practice Only", note: `Practise booking ${C.PRACTICE.tasks.length} tasks on ${C.PRACTICE.attorney}’s calendar for next week. Nothing here is graded or sent to your trainer, and you can start over any time.`});

/* ---------- Admin → 🛠 Practice Lab → 📅 Calendaring Activity (the graded activity only: practice has no trainer view) ---------- */
const W = C.WEEK, call = (p, b) => FTCalWeek.api(p, b), now = () => FTCalWeek.now();
const AD = {rows: null, loading: false, batch: "", open: {}, next: null};
async function loadAdmin(){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const got = {};
    for(let i = 0; i < people.length; i += 300){ const j = await call("list", {ids: people.slice(i, i + 300).map(r => r.id)}); AD.next = j.next; (j.rows || []).forEach(r => { got[r.id] = r; }); }
    AD.rows = people.map(r => Object.assign({name: r.name || r.id, batch: r.batch || ""}, got[r.id] || {id: r.id})).sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!AD.batch){ const bs = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
  }catch(err){ AD.rows = AD.rows || []; toast("Couldn’t load the Calendaring Activity: " + (err.message || err)); }
  AD.loading = false; if(state.view === "admin" && state.adminTab === "calweek") render();
}
function adminHtml(){
  if(!AD.rows){ if(!AD.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  return `<div class="card cr-admin"><div class="ff-bar"><div><h3>📅 ${e(W.title)}</h3><p class="fss-muted">Each trainee’s bookings on ${e(W.attorney)}’s calendar for next week${AD.next ? ` (${e(AD.next.label)})` : ""}, checked against the attorney’s rules. Bookings are kept relative to the week, so they always show on the coming week.</p></div>
      <span><select onchange="FTCalWeekAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="FTCalWeekAdmin.reload()">↻ Refresh</button></span></div>
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl"><thead><tr><th>Trainee</th><th>Booked</th><th>Check</th><th>Saved</th><th>Sent</th></tr></thead><tbody>
      ${rows.map(r => { const rec = r.record, rv = r.review, n = rec && Array.isArray(rec.events) ? rec.events.length : 0;
        return `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td><td>${n ? `<button class="btn btn-ghost btn-sm" onclick="FTCalWeekAdmin.open('${e(r.id)}')">${n} of ${W.tasks.length} ${AD.open[r.id] ? "▾" : "▸"}</button>` : "—"}</td>
          <td>${rv ? `${rv.pct}% · ${rv.done} perfect` : "—"}</td><td>${rec ? e(new Date(rec.savedAt).toLocaleString()) : "—"}</td><td>${rec && rec.submittedAt ? e(new Date(rec.submittedAt).toLocaleString()) : "—"}</td></tr>
          ${AD.open[r.id] && rv ? `<tr class="cr-aopen"><td colspan="5">${rv.items.map(it => { const x = rec.events.find(y => y.task === it.task), at = x ? C.resolve(x, now()) : null;
            return `<div class="cr-abook"><b>${e(it.title)}</b> · ${at ? `${e(at.label)} · ${x.dur} min` : "not booked"} · <b>${it.pts}/${it.weight}</b>${it.checks.filter(c => !c.ok).map(c => `<br><span class="cr-no">✗</span> ${e(c.label)}${c.why ? `: ${e(c.why)}` : ""}`).join("")}</div>`; }).join("")}</td></tr>` : ""}`; }).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTCalWeekAdmin = {batch(b){ AD.batch = b; render(); }, open(id){ AD.open[id] = !AD.open[id]; render(); }, reload: () => loadAdmin()};
if(typeof window.ftAdminTab === "function") ftAdminTab("calweek", "📅 Calendaring Activity", adminHtml);

(function(){ const st = document.createElement("style"); st.id = "ft-calweek"; st.textContent = `
main.main-cw{max-width:1100px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
main.main-cw>*{flex-shrink:0;}
.cw-hero h1{margin:0 0 4px;} .cw-practice{padding:8px 12px;border-radius:8px;background:#E3F4EA;color:#1E6B40 !important;} .cw-practice a{cursor:pointer;text-decoration:underline;font-weight:700;} .cw-hero p{margin:0 0 6px;color:var(--ink-soft);max-width:86ch;}
.cw-links{display:flex;flex-wrap:wrap;gap:6px;} .cw-warn{margin:0;padding:8px 12px;border-radius:8px;background:#FFF4D6;color:#8A5A00;}
.cw-cal{padding:12px 14px;overflow-x:auto;} .cw-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:8px;} .cw-tabs{display:flex;gap:4px;}
.cw-note{margin:0 0 8px;padding:8px 12px;border-radius:8px;background:#EEF3FF;color:#1F2A44;font-size:13px;}
.cw-grid{display:grid;grid-template-columns:64px repeat(5,minmax(120px,1fr));min-width:680px;}
.cw-hours span{position:absolute;right:6px;font-size:11px;color:var(--ink-soft);transform:translateY(-6px);}
.cw-dh{height:30px;display:flex;align-items:center;justify-content:center;gap:4px;font-size:13px;color:var(--ink-soft);} .cw-col.today .cw-dh b{background:#1a73e8;color:#fff;border-radius:50%;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;}
.cw-body{position:relative;border-left:1px solid var(--line,#e3e5ea);} .cw-body i{position:absolute;left:0;right:0;border-top:1px solid var(--line,#eceef2);}
.cw-ev{position:absolute;left:3px;right:3px;padding:2px 6px;border-radius:6px;font-size:11.5px;line-height:1.25;overflow:hidden;background:#E8EAED;color:#3c4043;border-left:3px solid #9aa0a6;box-sizing:border-box;}
.cw-ev b{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cw-ev small{display:block;opacity:.85;}
.cw-court{background:#FDE7E5;border-color:#B42318;} .cw-lunch{background:#F1F3F4;color:#80868b;border-color:#dadce0;} .cw-mine{background:#039be5;color:#fff;border-color:#0277bd;}
.cw-now{position:absolute;left:0;right:0;border-top:2px solid #ea4335;z-index:2;}
.cw-score{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 16px;} .cw-pct{font-size:20px;padding:4px 12px;border-radius:8px;} .cw-pct.ok{background:#E3F4EA;color:#1E6B40;} .cw-pct.mid{background:#FFF4D6;color:#8A5A00;} .cw-pct.low{background:#FDE7E5;color:#B42318;}
.cw-h2{margin:6px 0 0;font-size:18px;} .cw-h2 .fss-muted{font-size:13px;font-weight:400;}
.cw-task{padding:12px 16px;} .cw-task.ok{box-shadow:inset 3px 0 0 #2E7D4F;} .cw-task.bad{box-shadow:inset 3px 0 0 #B42318;}
.cw-thead{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;} .cw-thead small{display:block;color:var(--ink-soft);margin-top:2px;} .cw-thead small.cw-at{color:var(--ink);font-weight:600;}
.cw-tact{display:flex;gap:4px;flex-shrink:0;} .cw-miss{margin:8px 0 0;padding-left:20px;font-size:13px;color:#B42318;display:grid;gap:2px;}
.cw-form{margin-top:10px;padding-top:10px;border-top:1px solid var(--line,#eceef2);}
.cw-fgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px;} .cw-fgrid label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink-soft);min-width:0;}
.cw-fgrid label.w{grid-column:1/-1;} .cw-fgrid label.ck{flex-direction:row;align-items:center;gap:8px;grid-column:span 2;font-weight:500;color:var(--ink);}
.cw-fgrid select,.cw-fgrid textarea{box-sizing:border-box;width:100%;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;background:var(--card,#fff);color:var(--ink);}
.cw-fact{margin-top:10px;display:flex;gap:6px;}
@media (max-width:720px){ .cw-fgrid{grid-template-columns:repeat(2,minmax(0,1fr));} .cw-fgrid label.ck{grid-column:1/-1;} .cw-thead{flex-direction:column;} }
`; document.head.appendChild(st); })();
})();
