/* ============================================================
   👥 SHADOWING LOG AND THE DAY'S HUBSTAFF TO-DO (Days 7, 11, 14–16, 18)
   ------------------------------------------------------------
   Two things the Training Guide asks of every trainee every day, which the trainer used to chase in the GC and
   check by screenshot:
     • the Hubstaff To-Do, set daily from the guide's templates ("To-Do: Classroom Discussion: Intake Training
       Day 1", and on a shadowing day "To-Do: Shadowing Intake Specialist Role (buddy's name)"). The platform now
       shows each day's exact text with 📋 Copy, in the 🛠 Practice Lab and on this page (#/shadowing), so there
       is nothing to remember or retype.
     • the recorded shadowing videos the guide provides for when no buddy is free: each one's title is the link.
     • the shadowing session itself: instead of a screenshot of the TAM, the trainee writes a short log — who they
       shadowed, what that person actually did, what they learned, what they asked, and what they will use. Checked
       for completeness, never for a right answer; the trainer reads it.
   The buddy's name is the trainer's to fill in (Admin → 🛠 Practice Lab → 👥 Shadowing & To-Do, settings:todo),
   never shipped in the code, and so is any change to a day's To-Do line or a note about the session's time.
   Records: shadow:<id> (the trainee's own) {logs:{<day>:{who, role, date, did, learned, asked, apply, at}}}.
   🏅 My Performance shows the shadowing sessions logged.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const len = v => String(v == null ? "" : v).trim().length;
const DAYS = () => (window.FTDays && FTDays.DAYS) || [];

// the guide's shadowing sessions: the day, and the role as its To-Do names it
const SHADOW = {7: "Intake Specialist", 11: "Insurance Communication", 14: "Provider Communication", 15: "Provider Communication", 16: "Provider Communication"};
// the guide's daily To-Do templates, as "[Session Type + Schedule Day]: [Program Name] — [Module Day]"
const PROGRAM = {"VA Essentials": "Virtual Assistant Essentials"};
function discussionLine(d){
  const days = DAYS().filter(x => x.role === d.role), n = days.findIndex(x => x.day === d.day) + 1;
  const name = PROGRAM[d.role] || d.role;
  if(days.length < 2) return `Classroom Discussion: ${name}`;
  return `Classroom Discussion: ${name}${PROGRAM[d.role] ? " - Day " : " Day "}${n}`;
}
// The guide's recorded shadowing videos, for when no buddy is free: the title is the link (Drive).
const DRIVE = id => `https://drive.google.com/file/d/${id}/view?usp=sharing`;
const VIDEOS = {
  7: [["Intake shadowing, part 1", DRIVE("1SC653puBU7dh4tYjQjXcr8KZ4yhYxsLV")], ["Intake shadowing, part 2", DRIVE("16DavSPhSUGF88UnltYxl932dsZsYkQtY")],
      ["Intake shadowing, part 3", DRIVE("1_dsswdnznMTWJAykRJkJKMCOoGg-c8pw")]]
};
// a day's videos: the guide's, plus the trainer's own ("Title | link" a line), which replace them when given
function videosFor(day){
  const own = String((((X.data || {}).days || {})[day] || {}).videos || "").split("\n")
    .map(l => { const [t, u] = l.split("|").map(x => (x || "").trim()); return [t, u]; })
    .filter(([t, u]) => has(t) && /^https?:\/\//.test(u || ""));
  return own.length ? own : (VIDEOS[day] || []);
}
const shadowLine = (day, buddy) => `Shadowing ${SHADOW[day]} Role (${has(buddy) ? String(buddy).trim() : "buddy’s name"})`;
// every line of a day's To-Do, the trainer's wording where they set one
function linesFor(day){
  const d = DAYS().find(x => x.day === day); if(!d) return [];
  const own = ((X.data || {}).days || {})[day] || {};
  const out = [has(own.todo) ? String(own.todo).trim() : discussionLine(d)];
  if(SHADOW[day]) out.push(has(own.shadow) ? String(own.shadow).trim() : shadowLine(day, own.buddy));
  return out;
}
const isShadowDay = day => !!SHADOW[day];
const noteFor = day => (((X.data || {}).days || {})[day] || {}).note || "";
// where the trainee stands in the guide, for the day the page and the dashboard open on
function today(){
  try{ const p = window.FTNextStep && FTNextStep.place(); if(p && p.day) return p.day.day; }catch(err){}
  return 1;
}

/* ---------- the trainer's To-Do wording ---------- */
const X = {data: null, at: 0, loading: null};
function loadTodo(force){
  if(X.loading) return X.loading;
  if(!force && X.data && Date.now() - X.at < 120000) return Promise.resolve(X.data);
  X.loading = sharedGet("settings:todo").then(v => { X.data = v && typeof v === "object" && v.days ? v : {days: {}}; X.at = Date.now(); })
    .catch(() => { if(!X.data) X.data = {days: {}}; })
    .then(() => { X.loading = null; if(["shadowing", "simulators"].includes(state.view) || (state.view === "admin" && state.adminTab === "shadowing")) render(); return X.data; });
  return X.loading;
}

/* ---------- the trainee's shadowing log ---------- */
// [name, label, kind, placeholder, minimum characters, full width]
const FIELDS = [
  ["who", "Who you shadowed", "text", "The name they gave on the call", 2, false],
  ["date", "Date of the session", "date", "", 0, false],
  ["did", "What they actually did, step by step", "area", "The tools they opened, the order they worked in, what they said on a call", 60, true],
  ["learned", "What you learned that the training hadn’t shown you", "area", "One or two things you only saw by watching", 40, true],
  ["asked", "What you asked, and what they answered", "area", "Your question and their answer (or “nothing asked”, and why)", 25, true],
  ["apply", "What you will do differently in your own work", "text", "One thing you will use", 20, true]
];
const filled = (log, f) => f[2] === "date" ? /^\d{4}-\d\d-\d\d$/.test(log[f[0]] || "") : len(log[f[0]]) >= f[4];
const done = log => !!log && FIELDS.every(f => filled(log, f));
const R = {rec: null, recId: null, day: null, saving: false};
function load(force){
  const id = state.traineeId; if(!id) return Promise.resolve();
  if(!force && R.recId === id && R.rec) return Promise.resolve();
  R.recId = id;
  return sharedGet("shadow:" + id).then(v => { R.rec = v && typeof v === "object" && v.logs ? v : {logs: {}};
    if(state.view === "shadowing") render(); }).catch(() => { R.rec = R.rec || {logs: {}}; });
}
const logOf = day => ((R.rec || {logs: {}}).logs || {})[day] || {};
const countDone = rec => Object.keys(SHADOW).filter(d => done((((rec || {logs: {}}).logs) || {})[d])).length;
async function saveLog(day){
  const id = state.traineeId; if(!id) return;
  const out = {}; FIELDS.forEach(f => { const el = document.getElementById("sh_" + f[0]); out[f[0]] = el ? String(el.value || "").trim().slice(0, 2000) : ""; });
  out.role = SHADOW[day] || ""; out.at = new Date().toISOString();
  await load();
  R.rec.logs[day] = out; R.saving = true; render();
  const ok = await sharedSet("shadow:" + id, R.rec);
  R.saving = false;
  if(ok === false) toast("Couldn’t save your log. Check your connection.");
  else toast(done(out) ? `✓ Day ${day} shadowing logged.` : "Saved. It counts once every line is filled in.");
  render();
}

/* ---------- the page ---------- */
function todoCard(day, compact){
  const lines = linesFor(day), note = noteFor(day);
  return `<div class="card td-card ${compact ? "td-compact" : ""}"><div class="td-head"><b>📋 ${compact ? `Day ${day}: your Hubstaff To-Do` : "Your Hubstaff To-Do for this day"}</b>
      ${compact ? `<button class="btn btn-navy btn-sm" onclick="FTShadow.open(${day})">${isShadowDay(day) ? "Open the shadowing log" : `All ${DAYS().length} days & the shadowing log`}</button>` : ""}</div>
    ${lines.map((l, i) => `<div class="td-line"><code id="td_${day}_${i}">To-Do: ${e(l)}</code><button class="btn btn-ghost btn-sm" onclick="FTShadow.copy('td_${day}_${i}')">📋 Copy</button></div>`).join("")}
    ${note ? `<p class="td-note">${e(note)}</p>` : ""}
    ${!compact && isShadowDay(day) && videosFor(day).length ? `<div class="td-vids"><b>🎬 No buddy free? Watch these instead</b>
      <ul>${videosFor(day).map(([t, u]) => `<li><a href="${e(u)}" target="_blank" rel="noopener noreferrer">${e(t)} ↗</a></li>`).join("")}</ul></div>` : ""}
    ${lines.length > 1 && /buddy’s name/.test(lines[1]) ? `<p class="td-note">Your trainer posts the buddy’s name in the GC — put it in place of “buddy’s name”.</p>` : ""}</div>`;
}
function logForm(day){
  const log = logOf(day), ok = done(log), missing = FIELDS.filter(f => !filled(log, f)).map(f => f[1]);
  return `<div class="card td-form"><div class="td-head"><b>👥 Your shadowing log · Day ${day}: ${e(SHADOW[day])} Role</b>
      <span class="${ok ? "td-ok" : "td-part"}">${ok ? "✓ Logged" : log.at ? "Still to fill in: " + e(missing.join(", ")) : "Not logged yet"}</span></div>
    <p class="fss-muted">Write this straight after the session — it takes the place of the TAM screenshot. There is no right answer: your trainer reads what you saw.</p>
    <div class="td-grid">${FIELDS.map(f => `<label class="${f[5] ? "w" : ""}">${e(f[1])}
      ${f[2] === "area" ? `<textarea id="sh_${f[0]}" rows="3" placeholder="${e(f[3])}">${e(log[f[0]] || "")}</textarea>`
        : f[2] === "date" ? `<input type="date" id="sh_${f[0]}" value="${e(log[f[0]] || "")}">`
        : `<input id="sh_${f[0]}" value="${e(log[f[0]] || "")}" placeholder="${e(f[3])}" autocomplete="off">`}</label>`).join("")}
      <div class="w"><button class="btn btn-navy btn-sm" ${R.saving ? "disabled" : ""} onclick="FTShadow.save(${day})">${R.saving ? "Saving…" : "💾 Save this log"}</button></div></div></div>`;
}
/* THE DAY'S OWN WORK, AND ITS PROCESS QUESTIONS.
   The Training Guide gives every one of the 16 days its activities, and the day decks say what they are;
   this is the list a trainee works from, with the thing that opens each one. The Process Questions close
   the day: each day discusses a lesson, and that lesson's answer sheet is linked here, on every day, so
   they are never hunted for — the guide sits them on Days 1, 2, 3, 7, 10, 13 and 18, which the row says. */
function workCard(day){
  const NS = window.FTNextStep, D = window.FTDays && FTDays.of ? FTDays.of(day) : null;
  if(!NS || !D) return "";
  const daily = x => (x.at === "tool" && x.id === "skills") || x.kind === "Upskill";
  const items = (NS.ordered ? NS.ordered(D) : (D.items || [])).filter(x => !NS.isPQ(x) && !daily(x));
  const pq = NS.pqFor ? NS.pqFor(day) : [];
  if(!items.length && !pq.length) return "";
  return `<div class="card td-work"><div class="td-head"><b>🗂 Day ${day}: the day’s activities, in the guide’s order</b>
      <span class="fss-muted">${items.length} ${items.length === 1 ? "activity" : "activities"}</span></div>
    <ul class="td-steps">${items.map(x => { const go = NS.goFor(x), note = NS.noteFor(x);
      return `<li class="td-step${go ? " on" : ""}"><span class="td-what"><b>${e(x.t)}</b><span>${e(x.kind)} · ${e(note)}</span></span>
        ${go ? `<button class="btn btn-ghost btn-sm" type="button" onclick="${go}">Open →</button>` : ""}</li>`; }).join("")}
      ${pq.map(p => `<li class="td-step td-pq${p.has ? " on" : ""}"><span class="td-what"><b>✍️ Process Questions: ${e(p.title)}</b>
        <span>${p.has ? (p.onToday ? "Process questions · the guide runs them today, after the activities" : "Process questions · today’s lesson — answer them when the lesson is finished") : "Process questions · the guide has no sheet for this lesson"}</span></span>
        ${p.has ? `<button class="btn btn-ghost btn-sm" type="button" onclick="${p.go}">Answer →</button>` : ""}</li>`).join("")}</ul></div>`;
}
function renderPage(){
  if(!R.rec || !X.data){ load(); loadTodo(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const days = DAYS(), day = R.day && days.some(d => d.day === R.day) ? R.day : today();
  R.day = day;
  const d = days.find(x => x.day === day) || {role: ""};
  const k = countDone(R.rec), n = Object.keys(SHADOW).length;
  return `<div class="td-hero"><p class="lp-eyebrow">Daily routine · shadowing on Days ${Object.keys(SHADOW).join(", ")}</p><h1>👥 Shadowing &amp; the day’s To-Do</h1>
      <p>Your Hubstaff To-Do for each day, in the guide’s exact wording, and your log of each shadowing session. ${k} of ${n} sessions logged.</p>
      <div class="td-days">${days.map(x => `<button class="td-day ${x.day === day ? "on" : ""} ${isShadowDay(x.day) ? "sh" : ""}" title="${e(x.role)}" onclick="FTShadow.day(${x.day})">${x.day}${done(logOf(x.day)) ? " ✓" : ""}</button>`).join("")}</div></div>
    <p class="td-which">Day ${day} · ${e(d.role)}${isShadowDay(day) ? ` · 👥 ${e(SHADOW[day])} Role shadowing` : ""}</p>
    ${todoCard(day)}
    ${workCard(day)}
    ${isShadowDay(day) ? logForm(day) : `<div class="card td-none">No shadowing session on this day. The sessions are on Days ${Object.keys(SHADOW).join(", ")} — pick one above to write up.</div>`}`;
}
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["shadowing"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {shadowing: "Shadowing & To-Do"});
const __render = window.render;
window.render = function(){
  if(state.view !== "shadowing") return __render.apply(this, arguments);
  if(!state.traineeId){ state.view = "dashboard"; return __render.apply(this, arguments); }
  load(); loadTodo();
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-td"><a class="back-link" onclick="goto('dashboard')">&larr; Back to the Dashboard</a>${renderPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.FTShadow = {
  save: saveLog, shadowDays: SHADOW, lines: linesFor, videos: videosFor, done, state: () => R,
  open(day){ if(day) R.day = Number(day); goto("shadowing"); },
  day(n){ R.day = Number(n); render(); },
  copy(id){
    const el = document.getElementById(id); if(!el) return;
    const text = el.innerText || el.textContent || "";
    const ok = () => toast("📋 Copied — paste it into your Hubstaff To-Do.");
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok).catch(() => fallback(text, ok));
    else fallback(text, ok);
  },
  reload: () => { X.at = 0; return Promise.all([load(true), loadTodo(true)]); }
};
function fallback(text, ok){
  try{ const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); ok();
  }catch(err){ toast("Couldn’t copy on this browser — select the line and copy it."); }
}
// 🏅 My Performance: the shadowing sessions logged
window.ftShadowItems = ctx => { const rec = ctx.rec["shadow:"]; if(!rec || !rec.logs) return [];
  const days = Object.keys(SHADOW).map(Number).filter(d => Object.keys(((rec.logs || {})[d]) || {}).length);
  if(!days.length) return [];
  const k = countDone(rec), n = Object.keys(SHADOW).length;
  return [{name: "👥 Shadowing sessions logged", pct: Math.round(k / n * 100), note: `${k} of ${n} sessions written up (Days ${days.join(", ")} started)`}]; };

/* ---------- 🧑‍🏫 Admin → 🛠 Practice Lab → 👥 Shadowing & To-Do ---------- */
const AD = {rows: null, loading: false, batch: "", open: {}, day: 7};
async function loadAdmin(){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.map(r => "shadow:" + r.id), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    AD.rows = people.map((r, i) => ({id: r.id, name: r.name || r.id, batch: r.batch || "", rec: vals[i] && vals[i].logs ? vals[i] : {logs: {}}}))
      .sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!AD.batch){ const bs = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
  }catch(err){ AD.rows = AD.rows || []; }
  AD.loading = false; if(state.view === "admin" && state.adminTab === "shadowing") render();
}
function adminHtml(){
  if(!AD.rows || !X.data){ if(!AD.loading) loadAdmin(); loadTodo(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  const sd = Object.keys(SHADOW).map(Number), day = AD.day, own = (X.data.days || {})[day] || {}, d = DAYS().find(x => x.day === day) || {role: ""};
  return `<div class="card td-admin"><div class="ff-bar"><div><h3>👥 Shadowing &amp; To-Do</h3><p class="fss-muted">The trainees’ shadowing write-ups, in place of the TAM screenshot, and the exact To-Do text they copy each day. Set the buddy’s name for a shadowing day here rather than only in the GC; trainees see it within two minutes.</p></div>
      <span><select onchange="FTShadowAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></span></div>
    <div class="td-aedit"><label>Day <select onchange="FTShadowAdmin.day(this.value)">${DAYS().map(x => `<option value="${x.day}" ${x.day === day ? "selected" : ""}>Day ${x.day}${isShadowDay(x.day) ? " · shadowing" : ""} — ${e(x.role)}</option>`).join("")}</select></label>
      <label>The day’s To-Do line <input id="tdaTodo" value="${e(own.todo || "")}" placeholder="${e(discussionLine(d))}"></label>
      ${isShadowDay(day) ? `<label>Buddy’s name <input id="tdaBuddy" value="${e(own.buddy || "")}" placeholder="the person they shadow"></label>
      <label>The shadowing line <input id="tdaShadow" value="${e(own.shadow || "")}" placeholder="${e(shadowLine(day, own.buddy))}"></label>` : ""}
      <label class="w">A note for the day (the session’s time, for instance) <input id="tdaNote" value="${e(own.note || "")}"></label>
      ${isShadowDay(day) ? `<label class="w">The recorded videos for when no buddy is free — one a line, <code>Title | link</code>; the title is what the trainee clicks (leave it empty to keep the guide’s ${videosFor(day).length} video${videosFor(day).length === 1 ? "" : "s"})
        <textarea id="tdaVideos" rows="3" placeholder="${e((VIDEOS[day] || []).map(([t, u]) => `${t} | ${u}`).join("\n"))}">${e(own.videos || "")}</textarea></label>` : ""}
      <div class="w"><button class="btn btn-navy btn-sm" onclick="FTShadowAdmin.save()">💾 Save Day ${day}</button>
        <span class="fss-muted">Trainees copy: <code>To-Do: ${e(linesFor(day).join("</code>, <code>To-Do: "))}</code></span></div></div>
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl td-atbl"><thead><tr><th>Trainee</th>${sd.map(x => `<th>Day ${x}</th>`).join("")}<th>Read</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td>
        ${sd.map(x => { const g = (r.rec.logs || {})[x]; return `<td class="${done(g) ? "ok" : g && Object.keys(g).length ? "mid" : ""}">${done(g) ? "✓" : g && Object.keys(g).length ? "part" : "—"}</td>`; }).join("")}
        <td><button class="btn btn-ghost btn-sm" onclick="FTShadowAdmin.open('${e(r.id)}')">${AD.open[r.id] ? "Hide ▾" : "Read ▸"}</button></td></tr>
        ${AD.open[r.id] ? `<tr class="td-aopen"><td colspan="${sd.length + 2}">${sd.map(x => { const g = (r.rec.logs || {})[x]; if(!g || !Object.keys(g).length) return "";
          return `<div class="td-alog"><b>Day ${x} · ${e(g.role || SHADOW[x])} Role</b>${done(g) ? `<span class="td-ok">✓ complete</span>` : `<span class="td-part">partly filled in</span>`}
            ${FIELDS.map(f => has(g[f[0]]) ? `<p><em>${e(f[1])}:</em> ${e(g[f[0]])}</p>` : "").join("")}</div>`; }).join("") || `<p class="fss-muted">Nothing logged yet.</p>`}</td></tr>` : ""}`).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTShadowAdmin = {
  batch(b){ AD.batch = b; render(); }, day(n){ AD.day = Number(n); render(); }, open(id){ AD.open[id] = !AD.open[id]; render(); }, reload: () => loadAdmin(),
  async save(){
    // read the form first: loading the saved wording re-renders the page and the form with it
    const v = id => String((document.getElementById(id) || {}).value || "").trim();
    const day = AD.day, next = {todo: v("tdaTodo"), buddy: v("tdaBuddy"), shadow: v("tdaShadow"), note: v("tdaNote"), videos: v("tdaVideos")};
    await loadTodo(true);
    X.data.days = X.data.days || {}; X.data.days[day] = next;
    const ok = await sharedSet("settings:todo", X.data);
    toast(ok === false ? "Couldn’t save. Check your connection." : `✓ Day ${day} saved — trainees see it within two minutes.`);
    X.at = Date.now(); render();
  }
};
ftAdminTab("shadowing", "👥 Shadowing & To-Do", adminHtml);

(function(){ const st = document.createElement("style"); st.id = "ft-todo"; st.textContent = `
main.main-td{max-width:980px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:12px;}
.td-hero h1{margin:0 0 4px;} .td-hero p{margin:0;color:var(--ink-soft);max-width:76ch;}
.td-days{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;}
.td-day{min-width:38px;border:1px solid var(--line,#d6d9e0);background:var(--card,#fff);color:var(--ink);border-radius:8px;padding:6px 8px;font:700 13px inherit;cursor:pointer;}
.td-day.sh{border-color:var(--orange-deep,#B5651D);color:var(--orange-deep,#B5651D);} .td-day.on{background:var(--navy,#1F2A44);color:#fff;border-color:var(--navy,#1F2A44);}
.td-which{margin:0;color:var(--ink-soft);font-weight:600;}
.td-card,.td-form,.td-none{padding:14px 16px;} .td-head{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;}
.td-line{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;}
.td-line code{flex:1 1 320px;min-width:0;padding:8px 10px;border-radius:8px;background:#F3F5F9;color:#1F2A44;font:600 13.5px ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word;}
.td-note{margin:8px 0 0;color:var(--ink-soft);font-size:13px;}
/* the day's activities, and the Process Questions that close it */
.td-work{padding:14px 16px;}
.td-steps{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;}
.td-step{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:7px 0;border-top:1px solid #EEE9E0;}
.td-step:first-child{border-top:0;}
.td-what{display:flex;flex-direction:column;min-width:0;}
.td-what b{font-size:14.5px;line-height:1.35;}
.td-what span{font-size:12.5px;color:var(--ink-soft);}
.td-step.on .td-what b{color:#1F5B39;}
.td-pq{border-top:2px solid #E3D9CB;margin-top:4px;padding-top:9px;}
.td-vids{margin-top:10px;padding:10px 12px;border-radius:8px;background:#F3F5F9;} .td-vids b{font-size:13.5px;}
.td-vids ul{margin:6px 0 0;padding-left:20px;display:grid;gap:3px;} .td-vids a{font-weight:600;}
.td-compact code{background:#EEF3FF;}
.td-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;margin-top:10px;}
.td-grid label{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:13px;font-weight:600;color:var(--ink-soft);} .td-grid label.w,.td-grid .w{grid-column:1/-1;}
.td-grid input,.td-grid textarea{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;background:var(--card,#fff);color:var(--ink);}
.td-ok{color:#1E6B40;font-weight:700;} .td-part{color:#8A5A00;font-weight:700;}
.td-admin .ff-bar span{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.td-aedit{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;padding:10px 0 14px;}
.td-aedit label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink-soft);} .td-aedit .w{grid-column:1/-1;}
.td-aedit input,.td-aedit select,.td-aedit textarea{box-sizing:border-box;width:100%;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;}
.td-aedit code{font:600 12.5px ui-monospace,SFMono-Regular,Menlo,monospace;}
.td-atbl td.ok{color:#1E6B40;font-weight:700;} .td-atbl td.mid{color:#8A5A00;font-weight:700;}
.td-alog{padding:8px 0;border-top:1px solid var(--line,#eceef2);} .td-alog p{margin:3px 0;} .td-alog em{color:var(--ink-soft);font-style:normal;}
@media (max-width:720px){ .td-grid,.td-aedit{grid-template-columns:1fr;} }
`; document.head.appendChild(st); })();
})();
