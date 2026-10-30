/* ============================================================
   🎧 CALL LISTENING LOG (Days 3, 7, 11, 13)
   ------------------------------------------------------------
   The Training Guide's Call Listening sessions — the ten sample reception recordings on Day 3, then the intake,
   insurance communication and provider communication recordings on Days 7, 11 and 13. Trainees listened and the
   trainer had no record of what was heard. Now each recording gets a short log here (#/listening):
     • who called, and what they wanted;
     • how the VA handled it, step by step;
     • one phrase worth reusing, in the VA's own words;
     • what the trainee would do differently.
   A recording counts as logged when all five are filled in (each has its own minimum), so the log is checked for
   completeness, never for a "right answer": the trainer reads it, and sees at a glance who listened to what.
   The recordings themselves stay in the guide's Drive folders. A trainer can replace a set's folder, change how many
   recordings it has, and give each recording its own title and link (Admin → 🛠 Practice Lab → 🎧 Call Listening,
   settings:listening). Records: listening:<id> (the trainee's own) {logs:{<set>:{<n>:{who, purpose, handled, phrase,
   better, at}}}}. 🏅 My Performance shows the share of each set logged.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const len = v => String(v == null ? "" : v).trim().length;

// the guide's Call Listening sessions, in day order
const SETS = [
  {id:"reception", icon:"☎️", title:"Reception calls", day:3, lesson:4, n:10,
    folder:"https://drive.google.com/drive/folders/1l8_cBDRXnt-h8QvDZJWaZMO194DWtdSU?usp=sharing",
    about:"The ten sample call recordings from Day 3’s Reception Training discussion."},
  // (titles: each recording's name in the log, until a trainer renames it; Day 7's are on the platform, ft/day7/audio)
  {id:"intake", icon:"📋", title:"Intake calls", day:7, lesson:6, n:4,
    titles:["Intake Call: MVA", "Intake Call: Premise Liability", "Intake Call: Dog Bite", "Intake Call: Medical Malpractice"],
    folder:"https://drive.google.com/drive/folders/16o9xsbY9dRIl8-fSBN2B3fNWuEXmo52q?usp=sharing",
    about:"The sample intake audio recordings from Day 7’s Intake Training discussion."},
  {id:"claims", icon:"📣", title:"Insurance communication calls", day:11, lesson:7, n:5,
    folder:"https://drive.google.com/drive/folders/14jCcagQ9mGag2DyRxFPCN-bWds5tl_bU?usp=sharing",
    about:"The VA recordings from Day 11’s Insurance Communication discussion."},
  {id:"records", icon:"🩺", title:"Provider communication calls", day:13, lesson:8, n:5,
    folder:"https://drive.google.com/drive/folders/17_v7RMsD93ebLoq9mu7srIqkcxEL-Egk?usp=drive_link",
    about:"The sample recordings from Day 13’s Medical Records Specialist discussion."},
  // 📝 Day 3's Reception Listening Activity answers: the five Harbor & Pine practice calls (build/calls/pi-reception-activity.json,
  // played here: audio), each logged with its 5 data points and its challenge (fields: ACT_FIELDS); the deck's stop after the
  // calls opens it, and its ✅ End of training goes on to the day's end. Not in the Practice Lab's Call Listening list (activity)
  {id:"recact", icon:"📝", title:"Reception Listening Activity: answers", day:3, lesson:4, n:5, activity:true,
    titles:["Call 1: The Missing Email", "Call 2: Third Time Calling", "Call 3: Which Office?", "Call 4: Just Confirming", "Call 5: No Ride Tomorrow"],
    audio:[1, 2, 3, 4, 5].map(n => `/ft/day3/audio/pi-activity-${n}.mp3`),
    about:"Play each of the five Harbor & Pine practice calls, then log its 5 data points and its challenge: the obstacle, and how the VA handled it."}
];
const setOf = id => SETS.find(s => s.id === id);
const WHO = ["Existing client", "Potential client", "Authorized person on the file", "Medical provider", "Insurance adjuster", "Opposing counsel", "Court staff", "Other"];
// each field, with what makes it filled in: [name, label, kind, placeholder, minimum characters, full width]
const FIELDS = [
  ["who", "Who called", "select", "", 0, false],
  ["purpose", "What they wanted", "text", "In one line: the reason for the call", 15, false],
  ["handled", "How the VA handled it, step by step", "area", "The greeting, how they verified the caller, what they did about the request, how they closed", 60, true],
  ["phrase", "One phrase worth reusing, in the VA’s words", "text", "“…”", 12, true],
  ["better", "What you would do differently", "area", "One thing you would change, and why", 25, true]
];
// the Reception Listening Activity's answers: the 5 data points of the call, then its challenge
const ACT_FIELDS = [
  ["caller", "1. Caller: their name, and who they are", "text", "e.g. Jane Doe, existing client", 5, false],
  ["callback", "2. Callback number", "text", "With the extension or best time, if given", 7, false],
  ["verified", "3. Verified? How, or why nothing could be shared", "text", "Name, DOB, date of the accident …", 5, true],
  ["reason", "4. Reason for the call", "text", "The case and what they need", 10, true],
  ["action", "5. Action taken", "text", "Who it went to, and how (message, transfer, callback)", 10, true],
  ["obstacle", "🚧 The obstacle: what made the call difficult", "area", "Emotional distress, missing details, a language barrier …", 20, true],
  ["response", "🤝 The VA’s response: how they handled it", "area", "Active listening, de-escalation, boundary setting, clarifying questions …", 20, true]
];
const fieldsOf = s => (s && s.id === "recact") ? ACT_FIELDS : FIELDS;
const filled = (log, f) => f[2] === "select" ? WHO.includes(log[f[0]]) : len(log[f[0]]) >= f[4];
const done = (log, s) => !!log && fieldsOf(s).every(f => filled(log, f));

/* ---------- the trainer's version of the sets ---------- */
const X = {data: null, at: 0, loading: null};
function loadSets(force){
  if(X.loading) return X.loading;
  if(!force && X.data && Date.now() - X.at < 120000) return Promise.resolve(X.data);
  X.loading = sharedGet("settings:listening").then(v => { X.data = v && typeof v === "object" && v.sets ? v : {sets: {}}; X.at = Date.now(); })
    .catch(() => { if(!X.data) X.data = {sets: {}}; })
    .then(() => { X.loading = null; if(state.view === "listening" || (state.view === "admin" && state.adminTab === "listening")) render(); return X.data; });
  return X.loading;
}
// a set as the trainee sees it: the guide's, with the trainer's changes over it
function setLive(id){
  const s = setOf(id), own = ((X.data || {}).sets || {})[id] || {};
  const n = Math.max(1, Math.min(30, Number(own.n) || s.n)), folder = has(own.folder) ? own.folder : s.folder;
  const recs = []; for(let i = 1; i <= n; i++){ const r = (own.recs || [])[i - 1] || {}; recs.push({n: i, title: has(r.title) ? r.title : (s.titles || [])[i - 1] || `Recording ${i}`, url: has(r.url) ? r.url : "", audio: (s.audio || [])[i - 1] || ""}); }
  return Object.assign({}, s, {n, folder, recs});
}

/* ---------- the trainee's record ---------- */
const R = {rec: null, recId: null, set: null, open: {}, saving: {}};
function load(force){
  const id = state.traineeId; if(!id) return Promise.resolve();
  if(!force && R.recId === id && R.rec) return Promise.resolve();
  R.recId = id;
  return sharedGet("listening:" + id).then(v => { R.rec = v && typeof v === "object" && v.logs ? v : {logs: {}};
    if(state.view === "listening") render(); }).catch(() => { R.rec = R.rec || {logs: {}}; });
}
const logOf = (sid, n) => ((R.rec || {logs: {}}).logs[sid] || {})[n] || {};
const countDone = (rec, s) => { const l = ((rec || {logs: {}}).logs || {})[s.id] || {}; let k = 0; for(let i = 1; i <= s.n; i++) if(done(l[i], s)) k++; return k; };
function readRec(sid, n){
  const out = {};
  fieldsOf(setOf(sid)).forEach(f => { const el = document.getElementById(`ln_${sid}_${n}_${f[0]}`); out[f[0]] = el ? String(el.value || "").trim().slice(0, 1500) : ""; });
  return out;
}
async function saveRec(sid, n){
  const id = state.traineeId; if(!id) return;
  await load();
  const log = Object.assign(readRec(sid, n), {at: new Date().toISOString()});
  (R.rec.logs[sid] = R.rec.logs[sid] || {})[n] = log;
  R.saving[`${sid}|${n}`] = true; render();
  const ok = await sharedSet("listening:" + id, R.rec);
  R.saving[`${sid}|${n}`] = false;
  if(ok === false) toast("Couldn’t save the log. Check your connection.");
  else { const ok_ = done(log, setOf(sid)); R.open[`${sid}|${n}`] = !ok_; toast(ok_ ? `✓ ${setOf(sid).title}: call ${n} logged.` : "Saved. It counts once every line is filled in."); }
  render();
}

/* ---------- the page ---------- */
function recHtml(s, r, next){
  const key = `${s.id}|${r.n}`, log = logOf(s.id, r.n), ok = done(log, s), open = R.open[key] !== undefined ? R.open[key] : r.n === next;
  const FL = fieldsOf(s), missing = FL.filter(f => !filled(log, f)).map(f => f[1].replace(/^\d\.\s*|^\S+\s/, ""));
  return `<div class="card ln-rec ${ok ? "ok" : ""}"><button class="ln-head" onclick="FTListen.toggle('${e(key)}')">
      <span class="ln-mark">${ok ? "✓" : r.n}</span>
      <span><b>${e(r.title)}</b>${log.at ? `<small>Logged ${e(new Date(log.at).toLocaleDateString())}${ok ? "" : ` · still to fill in: ${e(missing.join(", "))}`}</small>` : `<small>Not logged yet</small>`}</span>
      ${r.url ? `<a class="btn btn-ghost btn-sm" href="${e(r.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">🎧 Listen ↗</a>` : ""}
      <span>${open ? "▾" : "▸"}</span></button>
    ${open ? `<div class="ln-form">${r.audio ? `<audio class="w ln-audio" controls preload="none" src="${e(r.audio)}" title="${e(r.title)}"></audio>` : ""}${FL.map(f => `<label class="${f[5] ? "w" : ""}">${e(f[1])}
        ${f[2] === "select" ? `<select id="ln_${e(s.id)}_${r.n}_${f[0]}">${["<option value=\"\">Pick…</option>"].concat(WHO.map(w => `<option ${w === log[f[0]] ? "selected" : ""}>${e(w)}</option>`)).join("")}</select>`
          : f[2] === "area" ? `<textarea id="ln_${e(s.id)}_${r.n}_${f[0]}" rows="3" placeholder="${e(f[3])}">${e(log[f[0]] || "")}</textarea>`
          : `<input id="ln_${e(s.id)}_${r.n}_${f[0]}" value="${e(log[f[0]] || "")}" placeholder="${e(f[3])}" autocomplete="off">`}</label>`).join("")}
      <div class="w ln-act"><button class="btn btn-navy btn-sm" ${R.saving[key] ? "disabled" : ""} onclick="FTListen.save('${e(s.id)}',${r.n})">${R.saving[key] ? "Saving…" : "💾 Save this log"}</button></div></div>` : ""}</div>`;
}
function renderPage(){
  if(!R.rec || !X.data){ load(); loadSets(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  // a set opens with its day: 🔓 once the trainer has opened the day (js/ft-day-locks.js); a trainee catches up on any set opened
  const open = R.set === "recact" ? SETS.filter(s => s.id === "recact") : SETS.filter(s => setOpen(s) && !s.activity);
  if(!open.length) return `<div class="card" style="padding:24px;"><h2 style="margin:0 0 6px;">🔒 Call Listening</h2><p style="margin:0;">The recordings open when your trainer unlocks the Call Listening step of the day.</p></div>`;
  const cur = setLive(R.set && open.some(s => s.id === R.set) ? R.set : open[0].id); R.set = cur.id;
  const k = countDone(R.rec, cur);
  // 📝 the Reception Listening Activity's answers: a page of its own, its five calls only
  if(cur.activity) return `<div class="ln-hero"><p class="lp-eyebrow">Day ${cur.day} · Reception Listening Activity</p><h1>📝 Reception Listening Activity: Answers</h1>
      <p>For each of the five Harbor &amp; Pine practice calls: play it, then log its <b>5 data points</b> and its <b>challenge</b> (the obstacle, and how the VA handled it). Save each call as you go.</p></div>
    <div class="card ln-about"><div><b>Harbor &amp; Pine Injury Law · 5 practice calls</b><p>Your trainer reads your answers.</p></div>
      <div><span class="ln-count">${k} of ${cur.n} logged</span><div class="ln-bar"><span style="width:${Math.round(k / cur.n * 100)}%"></span></div></div></div>
    ${(() => { const next = (cur.recs.find(r => !done(logOf(cur.id, r.n), cur)) || {}).n;
      return cur.recs.map(r => recHtml(cur, r, next)).join(""); })()}
    ${window.FTDayDecks ? `<div class="ln-end"><button class="btn btn-navy" onclick="FTDayDecks.slide(3, 'end-day')">✅ End of training →</button></div>` : ""}`;
  return `<div class="ln-hero"><p class="lp-eyebrow">Call Listening · Days ${open.map(s => s.day).join(", ")}</p><h1>🎧 Call Listening Log</h1>
      <p>Listen to each recording, then write down what happened on the call. There’s no right answer to find: the log is what your trainer reads, and it saves you writing it up anywhere else.</p>
      <div class="ln-pills">${open.map(s => { const l = setLive(s.id), c = countDone(R.rec, l);
        return `<button class="ln-pill ${s.id === cur.id ? "on" : ""}" onclick="FTListen.set('${e(s.id)}')">${s.icon} ${e(s.title)} <em>${c}/${l.n}</em></button>`; }).join("")}</div></div>
    <div class="card ln-about"><div><b>${cur.icon} ${e(cur.title)}</b><p>${e(cur.about)}</p></div>
      <div><span class="ln-count">${k} of ${cur.n} logged</span><div class="ln-bar"><span style="width:${Math.round(k / cur.n * 100)}%"></span></div>
      ${cur.folder ? `<a class="btn btn-ghost btn-sm" href="${e(cur.folder)}" target="_blank" rel="noopener noreferrer">📂 The recordings ↗</a>` : ""}</div></div>
    ${(() => { const next = (cur.recs.find(r => !done(logOf(cur.id, r.n), cur)) || {}).n;   // only the next one to log is open
      return cur.recs.map(r => recHtml(cur, r, next)).join(""); })()}`;
}
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["listening"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {listening: "Call Listening Log"});
const __render = window.render;
window.render = function(){
  if(state.view !== "listening") return __render.apply(this, arguments);
  if(!state.traineeId){ state.view = "dashboard"; return __render.apply(this, arguments); }
  load(); loadSets();
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-ln">${R.set === "recact" && window.FTDayDecks ? `<a class="back-link" onclick="FTDayDecks.slide(3, 's1d')">&larr; Back to the 5 practice calls</a>` : `<a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>`}${renderPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.FTListen = {
  save: saveRec, sets: SETS, setLive, done,
  // the trainer's titles and links, for the Activity deck's Call Listening slide (js/ft-day-decks.js listenSlide)
  loadSets, ready: () => !!X.data,
  open(sid){ if(sid) R.set = sid; goto("listening"); },
  set(sid){ R.set = sid; render(); },
  toggle(key){ const el = document.querySelector(`.ln-rec [id^="ln_${key.replace("|", "_")}_"]`); R.open[key] = !el; render(); },
  state: () => R, reload: () => { X.at = 0; return Promise.all([load(true), loadSets(true)]); }
};
// a set opens with its day's 🎧 Call Listening step (js/ft-day-locks.js), not just with its day
const setOpen = s => !window.FTDayLocks || FTDayLocks.toolOpen("listening", s.day);
// 🛠 the Practice Lab's section
window.ftListenSection = () => `<section class="fts-group"><h2>🎧 Call Listening</h2>
    <p class="fts-sub">The sample recordings from the Call Listening sessions. Log each call as you listen — who called, what they wanted, how the VA handled it, a phrase worth reusing — and your trainer can see what you heard without a write-up anywhere else.</p>
    <div class="fts-grid">${SETS.filter(s => setOpen(s) && !s.activity).map(s => { const l = setLive(s.id);
      return `<div class="card fts-card"><div class="fts-kicker">Day ${s.day} · ${l.n} recordings</div><h3>${s.icon} ${e(s.title)}</h3>
        <p class="fts-note">${e(s.about)}</p>
        <div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="FTListen.open('${e(s.id)}')">Open the log</button></div></div>`; }).join("")}</div></section>`;

// 🏅 My Performance: the share of each set logged
// (the sets as the trainer set them come with the Scorecard's read, ctx.shared, so the share is the same on every page,
// whether or not 🎧 Call Listening has been opened first)
window.ftListenItems = ctx => { const rec = ctx.rec["listening:"]; if(!rec || !rec.logs) return [];
  const sv = ctx.shared && ctx.shared["settings:listening"];
  // (X.at stays 0: the copy only stands in until the sets are read fresh, which this never holds back)
  if(sv && typeof sv === "object" && sv.sets && !X.loading && (!X.data || !X.at)) X.data = sv;
  return SETS.map(s => { const l = setLive(s.id), c = countDone(rec, l); if(!c && !((rec.logs || {})[s.id])) return null;
    return {name: `${s.icon} ${s.title}`, pct: Math.round(c / l.n * 100), note: `${c} of ${l.n} recordings logged`}; }).filter(Boolean); };

/* ---------- 🧑‍🏫 Admin → 🛠 Practice Lab → 🎧 Call Listening ---------- */
const AD = {rows: null, loading: false, batch: "", open: {}, set: SETS[0].id, edit: false};
async function loadAdmin(){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.map(r => "listening:" + r.id), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    AD.rows = people.map((r, i) => ({id: r.id, name: r.name || r.id, batch: r.batch || "", rec: vals[i] && vals[i].logs ? vals[i] : {logs: {}}}))
      .sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!AD.batch){ const bs = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
  }catch(err){ AD.rows = AD.rows || []; }
  AD.loading = false; if(state.view === "admin" && state.adminTab === "listening") render();
}
function adminLogs(r, s){
  const l = (r.rec.logs || {})[s.id] || {};
  return `<div class="ln-alogs">${s.recs.map(x => { const g = l[x.n]; if(!g || !Object.keys(g).length) return "";
    return `<div class="ln-alog"><b>${e(x.title)}</b>${done(g, s) ? `<span class="ln-ok">✓ complete</span>` : `<span class="ln-part">partly filled in</span>`}
      ${fieldsOf(s).map(f => has(g[f[0]]) ? `<p><em>${e(f[1])}:</em> ${e(g[f[0]])}</p>` : "").join("")}</div>`; }).join("") || `<p class="fss-muted">Nothing logged in this set yet.</p>`}</div>`;
}
function adminHtml(){
  if(!AD.rows || !X.data){ if(!AD.loading) loadAdmin(); loadSets(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  const s = setLive(AD.set), own = (X.data.sets || {})[AD.set] || {};
  return `<div class="card ln-admin"><div class="ff-bar"><div><h3>🎧 Call Listening</h3><p class="fss-muted">What each trainee heard on the Call Listening recordings, in their own words. The log is checked for completeness only — you read it. Change a set’s recordings below; trainees see it within two minutes.</p></div>
      <span><select onchange="FTListenAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <select onchange="FTListenAdmin.set(this.value)">${SETS.map(x => `<option value="${e(x.id)}" ${x.id === AD.set ? "selected" : ""}>Day ${x.day}: ${e(x.title)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="FTListenAdmin.edit()">${AD.edit ? "Close the recordings" : "✏️ Edit the recordings"}</button></span></div>
    ${AD.edit ? `<div class="ln-aedit"><p class="fss-muted">The set’s folder and how many recordings it has, then one recording per line: <code>title | link</code> (the link is optional; leave a line empty to keep its number only).</p>
      <label>Folder <input id="lnaFolder" value="${e(own.folder || s.folder || "")}"></label>
      <label>How many <input type="number" id="lnaN" min="1" max="30" value="${s.n}"></label>
      <label class="w">Recordings<textarea id="lnaRecs" rows="${Math.min(12, s.n + 1)}">${e(s.recs.map(r => [r.title, r.url].filter(Boolean).join(" | ")).join("\n"))}</textarea></label>
      <div class="w"><button class="btn btn-navy btn-sm" onclick="FTListenAdmin.saveSet()">💾 Save this set</button></div></div>` : ""}
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl ln-atbl"><thead><tr><th>Trainee</th>${SETS.map(x => `<th>Day ${x.day}</th>`).join("")}<th>${e(s.title)}</th></tr></thead><tbody>
      ${rows.map(r => { const cells = SETS.map(x => { const l = setLive(x.id), c = countDone(r.rec, l);
          return `<td class="${c >= l.n ? "ok" : c ? "mid" : ""}">${c}/${l.n}</td>`; }).join("");
        return `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td>${cells}
          <td><button class="btn btn-ghost btn-sm" onclick="FTListenAdmin.open('${e(r.id)}')">${AD.open[r.id] ? "Hide" : "Read"} ${AD.open[r.id] ? "▾" : "▸"}</button></td></tr>
          ${AD.open[r.id] ? `<tr class="ln-aopen"><td colspan="${SETS.length + 2}">${adminLogs(r, s)}</td></tr>` : ""}`; }).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTListenAdmin = {
  batch(b){ AD.batch = b; render(); }, set(id){ AD.set = id; render(); }, open(id){ AD.open[id] = !AD.open[id]; render(); },
  edit(){ AD.edit = !AD.edit; render(); }, reload: () => loadAdmin(),
  async saveSet(){
    // read the form first: loading the saved sets re-renders the page and the form with it
    const v = id => String((document.getElementById(id) || {}).value || "").trim();
    const set = AD.set, folder = v("lnaFolder"), n = Math.max(1, Math.min(30, Number(v("lnaN")) || setOf(set).n));
    const recs = v("lnaRecs").split("\n").map(line => { const [title, url] = line.split("|").map(x => (x || "").trim()); return {title: title || "", url: url || ""}; });
    await loadSets(true);
    X.data.sets = X.data.sets || {};
    X.data.sets[set] = {n, folder, recs};
    const ok = await sharedSet("settings:listening", X.data);
    toast(ok === false ? "Couldn’t save. Check your connection." : "✓ Saved — trainees see it within two minutes.");
    X.at = Date.now(); render();
  }
};
ftAdminTab("listening", "🎧 Call Listening", adminHtml);

(function(){ const st = document.createElement("style"); st.id = "ft-listening"; st.textContent = `
main.main-ln{max-width:980px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:12px;}
main.main-ln > *{flex-shrink:0;}   /* (a card hides its overflow, so a shrunk one lost its contents) */
.ln-hero h1{margin:0 0 4px;} .ln-hero p{margin:0;color:var(--ink-soft);max-width:76ch;}
.ln-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.ln-pill{border:1px solid var(--line,#d6d9e0);background:var(--card,#fff);color:var(--ink);border-radius:999px;padding:7px 14px;font:600 13px inherit;cursor:pointer;}
.ln-pill.on{background:var(--navy,#1F2A44);color:#fff;border-color:var(--navy,#1F2A44);} .ln-pill em{font-style:normal;opacity:.75;margin-left:4px;}
.ln-about{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;padding:14px 16px;}
.ln-about p{margin:4px 0 0;color:var(--ink-soft);max-width:60ch;} .ln-about > div:last-child{display:flex;flex-direction:column;gap:6px;align-items:flex-end;}
.ln-count{font-weight:700;} .ln-bar{width:180px;height:8px;border-radius:999px;background:#E8EBF2;overflow:hidden;} .ln-bar span{display:block;height:100%;background:#2E7D4F;}
.ln-rec{padding:0;overflow:hidden;} .ln-rec.ok .ln-mark{background:#E3F4EA;color:#1E6B40;}
.ln-head{display:grid;grid-template-columns:34px 1fr auto 18px;gap:12px;align-items:center;width:100%;padding:11px 16px;border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:var(--ink);}
.ln-head small{display:block;color:var(--ink-soft);font-size:12.5px;margin-top:2px;}
.ln-mark{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#EEF1F6;color:var(--ink-soft);font-weight:800;}
.ln-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;padding:0 16px 14px;}
.ln-form label{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:13px;font-weight:600;color:var(--ink-soft);} .ln-form label.w,.ln-form .w{grid-column:1/-1;}
.ln-form input,.ln-form select,.ln-form textarea{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;background:var(--card,#fff);color:var(--ink);}
.ln-act{display:flex;gap:8px;}
.ln-audio{width:100%;margin:2px 0 4px;} .ln-end{display:flex;justify-content:flex-end;}
.ln-admin .ff-bar span{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.ln-aedit{display:grid;grid-template-columns:2fr 1fr;gap:10px 12px;padding:12px 0;} .ln-aedit label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink-soft);}
.ln-aedit .w{grid-column:1/-1;} .ln-aedit input,.ln-aedit textarea{box-sizing:border-box;width:100%;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;}
.ln-atbl td.ok{color:#1E6B40;font-weight:700;} .ln-atbl td.mid{color:#8A5A00;font-weight:700;}
.ln-alog{padding:8px 0;border-top:1px solid var(--line,#eceef2);} .ln-alog p{margin:3px 0;} .ln-alog em{color:var(--ink-soft);font-style:normal;}
.ln-ok{color:#1E6B40;font-weight:700;margin-left:8px;} .ln-part{color:#8A5A00;font-weight:700;margin-left:8px;}
@media (max-width:720px){ .ln-form{grid-template-columns:1fr;} .ln-head{grid-template-columns:30px 1fr 18px;} .ln-head .btn{grid-column:1/-1;justify-self:start;} .ln-aedit{grid-template-columns:1fr;} }
`; document.head.appendChild(st); })();
})();
