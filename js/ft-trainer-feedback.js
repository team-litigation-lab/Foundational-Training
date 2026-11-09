/* ============================================================
   📝 THE TRAINER'S FEEDBACK, SENT ON THE PLATFORM — per activity, per trainee
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📝 Send Feedback: every piece of work a trainee did on the platform's activities that had no
   trainer review of its own — 🎧 the Transcription Activity (each recording), 📘 the
   Process Guides (each guide), 🧰 the LOR Drafting Activity (each letter) — listed by batch, with what is still to be
   reviewed first. The trainer opens one: the work itself (and the AI's evaluation where there is one), then
   a verdict (the facilitator's own labels), a score in %, the comment (✨ drafts it in the facilitator's feedback
   DNA from the work), and 📤 Send. (The mock calls and demos are scored on their scorecards in 🧑‍🏫 Trainer Inputs;
   the Knowledge Checks, Practice Sessions and Calendaring Simulators keep their own review forms.)

   The trainee sees it:
     • on the activity's own page — "🧑‍🏫 Feedback from your trainer", with a NEW mark until they have seen it;
     • on 📬 My Feedback (📂 My Pages) — every feedback a trainer sent: these, the mock calls' and demos' scorecards,
       the Practice Sessions' reviews and the Knowledge Checks' reviews, newest first;
     • on 🏅 My Performance — the scores, as their own grading system ("📝 Trainer feedback", js/ft-program.js).

   Storage: trainerfb:<id> = {items: {"<activity>:<item>": {act, item, title, verdict, score, comment, at}}} — the
   trainee reads it, only admins write it (worker.js TRAINER_OWNED). "Seen" is kept in the trainee's browser.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const VERDICTS = ["Very strong performance.", "Good.", "Good, with Improvements Needed.", "Good, but Incomplete.", "Satisfactory.", "Generally satisfactory performance.",
  "Needs Improvement.", "Needs Significant Improvement.", "Significant Improvement Required.", "Incomplete Submission.", "NO SUBMISSION"];
const when = t => { try{ return t ? new Date(t).toLocaleDateString(undefined, {month: "short", day: "numeric"}) : ""; }catch(err){ return ""; } };
const paras = s => String(s || "").split("\n").filter(has).map(l => `<p>${e(l)}</p>`).join("");

/* ---------- the activities a trainer sends feedback on ---------- */
const tplTitle = t => ((window.FT_LOR_TEMPLATES || []).find(x => x.id === t) || {}).title || t;
const guides = () => (window.FTGuide && FTGuide.list) || [];
const ACTS = {
  transcribe: {icon: "🎧", label: "Transcription Activity", view: "transcribe",
    items: rec => [1, 2].filter(n => rec && rec.r && rec.r[n] && rec.r[n].startedAt).map(n => { const r = rec.r[n];
      return {item: String(n), title: `Interview Recording ${n}`, at: r.submittedAt || r.updatedAt || r.startedAt, done: !!r.submittedAt, auto: r.pct,
        ai: (r.ai || {}).summary || "", text: () => ((window.FTTranscribe && FTTranscribe.fields) || []).map(f => `${f[1]}: ${(r.f || {})[f[0]] || "(empty)"}`).concat([`File name: ${r.file || ""}`, `Drive link: ${r.link || ""}`, `Report to the attorney: ${r.report || ""}`]).join("\n")}; })},
  guide: {icon: "📘", label: "Process Guide", view: "guide", lazy: true,
    items: rec => Object.entries(rec || {}).filter(([g, v]) => v && has(v.html)).map(([g, v]) => ({item: g, title: (guides().find(x => x.id === g) || {}).title || g, at: v.submittedAt || v.updatedAt, done: !!v.submittedAt, html: v.html,
      text: () => { const t = document.createElement("div"); t.innerHTML = window.FTGuide ? FTGuide.clean(v.html) : ""; return `${t.innerText.slice(0, 6000)}\n(${v.imgs || 0} picture(s))`; }}))},
  lor: {icon: "🧰", label: "LOR Drafting Activity", view: "lor",
    items: rec => Object.entries((rec && rec.letters) || {}).filter(([t, l]) => l && Object.values(l.fields || {}).some(has)).map(([t, l]) => ({item: t, title: tplTitle(t), at: l.updatedAt, done: true,
      text: () => Object.entries(l.fields || {}).filter(([k, v]) => has(v)).map(([k, v]) => `${k}: ${v}`).join("\n")}))}
};

// ✍️ manual feedback, on any activity of the training (Admin → 📝 Send Feedback, the activity picked from every one): kept as
// trainerfb:<id>.items["manual:<activity>"] = {act: "manual", item, title, group, verdict, score, comment, at}
ACTS.manual = {icon: "✍️", label: "Trainer's feedback", items: () => []};
const actInfo = a => ACTS[a] || {icon: "📝", label: String(a || "")};
// every activity a trainer can give feedback on: the Knowledge Checks, the Practice Lab, the mock calls and demos, the side
// activities, and each day's classroom activities and outputs (js/ft-day-activities.js, the Training Guide's own list)
function catalogue(){
  const out = [], seen = new Set(), add = (group, id, title) => { if(seen.has(id)) return; seen.add(id); out.push({group, id, title}); };
  (typeof DAYS !== "undefined" && Array.isArray(DAYS) ? DAYS : window.DAYS || []).forEach(d => add("✍️ Knowledge Checks", "kc-" + d.id, `Knowledge Check: ${d.title}`));
  add("✍️ Knowledge Checks", "reading-1", "📖 Reading Task: Personal Injury Overview");
  const D = (window.FTDays && FTDays.DAYS) || [];
  const grp = it => it.at === "trainer" || /Mock call|Demo/i.test(it.kind || "") ? "🎙 Mock calls & demos" : it.at === "session" || it.at === "tool" ? "🛠 Practice Lab" : "🏫 Classroom & outputs";
  D.forEach(d => (d.items || []).forEach(it => { if(/^(Typing Test \(morning|Spelling Test \(once a day\)|Free Communication Upskill)/.test(it.t)) return;
    const id = (it.at === "trainer" || it.at === "session" || it.at === "tool") && it.id ? `${it.at}-${it.id}` : `d${d.day}-${String(it.t).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`;
    add(grp(it), id, `${it.at === "trainer" || it.at === "session" || it.at === "tool" ? "" : `Day ${d.day} · `}${it.t}`); }));
  [["typing", "🧪 Typing & Spelling Tests"], ["monitor", "📒 Training Monitoring Sheet"], ["tracker", "📋 Daily Task Tracker"], ["tam", "📘 Task Assessment Manual (TAM)"],
   ["outputs", "📤 Daily outputs & EOD email"], ["links", "📁 Drive links & folders"], ["general", "💬 General feedback"]].forEach(([id, t]) => add("🧩 Side activities", "side-" + id, t));
  return out;
}
/* ---------- the trainee: their trainer's feedback ---------- */
const F = {id: null, rec: null, at: 0, loading: null};
function loadMine(force){
  const id = state.traineeId; if(!id || state.isAdmin) return Promise.resolve(null);
  if(F.loading) return F.loading;
  if(!force && F.id === id && Date.now() - F.at < 120000) return Promise.resolve(F.rec);
  F.loading = sharedGet("trainerfb:" + id).then(v => { F.id = id; F.rec = v && v.items ? v : {items: {}}; F.at = Date.now(); }).catch(() => {}).then(() => { F.loading = null; return F.rec; });
  return F.loading;
}
const SEEN = "ft_fb_seen";
const seen = () => { try{ return JSON.parse(localStorage.getItem(SEEN) || "{}"); }catch(err){ return {}; } };
function markSeen(keys){ try{ const s = seen(); keys.forEach(k => { s[k] = Date.now(); }); localStorage.setItem(SEEN, JSON.stringify(s)); }catch(err){} }
// (a feedback shown as NEW stays NEW while the trainee is on that page, which redraws after it is marked seen; leaving the page
// ends it: back on it later, it is seen)
const SHOWN = {view: null, keys: new Set()};
const shownNow = () => { if(SHOWN.view !== (typeof state === "object" ? state.view : null)){ SHOWN.view = typeof state === "object" ? state.view : null; SHOWN.keys = new Set(); } return SHOWN.keys; };
const isNew = (k, it) => { if(shownNow().has(k + "|" + it.at)) return true; const s = seen()[k]; return !s || s < new Date(it.at).getTime(); };
function markSeenShown(keys, items){ const set = shownNow(); keys.forEach(k => { const it = items[k]; if(it && isNew(k, it)) set.add(k + "|" + it.at); }); markSeen(keys); }
function fbCard(it, k){
  return `<div class="tfb-item${isNew(k, it) ? " tfb-new" : ""}"><div class="tfb-item-h"><b>${e(it.title)}</b>${isNew(k, it) ? `<span class="tfb-badge">NEW</span>` : ""}
      ${it.score != null && it.score !== "" ? `<span class="tfb-score">${e(it.score)}%</span>` : ""}<span class="tfb-when">${e(when(it.at))}</span></div>
    ${it.verdict ? `<p class="tfb-verdict">${e(it.verdict)}</p>` : ""}${it.facilitator ? `<p class="tfb-fac">🧑‍🏫 Facilitated by <b>${e(it.facilitator)}</b></p>` : ""}${paras(it.comment)}</div>`;
}
// "🧑‍🏫 Feedback from your trainer" at the top of the activity's page
function pageCard(act){
  const items = Object.entries((F.rec && F.rec.items) || {}).filter(([k, it]) => it.act === act).sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)));
  if(!items.length) return "";
  return `<section class="card tfb-page" id="tfbPage"><h3>🧑‍🏫 Feedback from your trainer</h3>${items.map(([k, it]) => fbCard(it, k)).join("")}</section>`;
}
const __after = window.afterRender;
window.afterRender = function(){
  const out = __after ? __after.apply(this, arguments) : undefined;
  try{ shownNow(); }catch(err){}   // (a page left: what was NEW on it is seen when back)
  try{
    const act = Object.keys(ACTS).find(a => ACTS[a].view === state.view);
    if(act && state.traineeId && !state.isAdmin){
      const put = () => {
        if(state.view !== ACTS[act].view || document.getElementById("tfbPage")) return;
        const html = pageCard(act); if(!html) return;
        const main = document.querySelector("main"); if(!main) return;
        const back = main.querySelector(":scope > .back-link");
        (back || main.firstElementChild || main).insertAdjacentHTML(back ? "afterend" : "beforebegin", html);
        markSeenShown(Object.keys(F.rec.items).filter(k => F.rec.items[k].act === act), F.rec.items);
      };
      if(F.rec && F.id === state.traineeId) put(); else loadMine().then(put);
    }
  }catch(err){}
  return out;
};

/* ---------- 📬 My Feedback: everything a trainer sent, newest first ---------- */
const MF = {list: null, loading: false};
async function loadAll(){
  const id = state.traineeId; if(!id) return;
  MF.loading = true;
  try{
    const [fb, lab, kc, rk] = await sharedGetMany(["trainerfb:" + id, "labreview:" + id, "kcreview:" + id, "rankshare:" + id]);
    F.id = id; F.rec = fb && fb.items ? fb : {items: {}}; F.at = Date.now();
    const out = Object.entries(F.rec.items).map(([k, it]) => Object.assign({k, icon: (ACTS[it.act] || {}).icon || "📝", what: it.act === "manual" ? `Trainer's feedback${it.group ? " · " + it.group.replace(/^\S+\s/, "") : ""}` : (ACTS[it.act] || {}).label || it.act}, it));
    const acts = (window.FTSessions && FTSessions.trainerActs) ? FTSessions.trainerActs() : [];
    Object.entries((lab && lab.acts) || {}).forEach(([aid, r]) => { if(!r || !(r.status || has(r.comment) || r.score != null)) return;
      const a = acts.find(x => x.id === aid) || {title: aid};
      out.push({k: "act:" + aid, icon: "🧑‍🏫", what: a.kind || "With your trainer", title: a.title, at: r.at || r.date, score: r.score, verdict: r.status && r.status !== "Not yet" ? r.status : "",
        comment: r.comment, facilitator: r.facilitator || "", rubric: r.rubric && window.FT_RUBRICS ? {rb: FT_RUBRICS.list[r.rubric.key], r: r.rubric} : null}); });
    Object.entries((lab && lab.sessions) || {}).forEach(([key, r]) => { if(!r || !(has(r.comment) || r.score != null)) return;
      out.push({k: "ses:" + key, icon: "🟢", what: "Practice Session", title: window.FTSessions && FTSessions.sessionTitle ? FTSessions.sessionTitle(key.split("|")[0]) : key.split("|")[0], at: r.at, score: r.score, comment: r.comment}); });
    Object.entries((kc && kc.lessons) || {}).forEach(([l, r]) => { if(!r || !(has(r.comment) || r.score != null)) return;
      const d = (window.DAYS || []).find(x => String(x.id) === String(l));
      out.push({k: "kc:" + l, icon: "✍️", what: "Knowledge Check", title: d ? d.title : "Lesson " + l, at: r.at, score: r.score, comment: r.comment}); });
    // 📊 the Weekly Ranking rows the trainer shared: this trainee's marks, notes, average and rank
    Object.entries((rk && rk.weeks) || {}).forEach(([k, w]) => { if(!w) return;
      out.push({k: "rank:" + k + ":" + w.sharedAt, icon: "📊", what: "Weekly Ranking", title: `Week ${w.week}${w.rank ? ` · rank ${w.rank} of ${w.of}` : ""}`, at: w.sharedAt,
        verdict: w.avg == null ? "" : `Week ${w.week} final average: ${Number(w.avg).toFixed(2)}/5`, comment: w.notes, week: w}); });
    MF.list = out.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }catch(err){ MF.list = []; }
  MF.loading = false; if(state.view === "myfeedback" || state.view === "scorecard") render();
}
function renderMine(){
  if(!state.traineeId) return `<div class="card" style="padding:28px;">Sign in to see your trainer’s feedback.</div>`;
  if(!MF.list){ if(!MF.loading) loadAll(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting your trainer’s feedback…</div>`; }
  const html = MF.list.length ? MF.list.map(it => `<div class="card tfb-row${isNew(it.k, it) ? " tfb-new" : ""}"><div class="tfb-kicker">${it.icon} ${e(it.what)}</div>${fbCard(it, it.k)}
      ${it.rubric && it.rubric.rb ? `<details class="tfb-rub"><summary>📋 The scorecard · weighted average <b>${e((Math.round((it.rubric.r.avg || 0) * 100) / 100).toFixed(2))}/5</b></summary><table>${it.rubric.rb.criteria.map((c, i) =>
        `<tr><td>${e(c.n)}</td><td><b>${it.rubric.r.scores[i] == null ? "—" : e(it.rubric.r.scores[i]) + "/5"}</b></td>${it.rubric.rb.feedback ? `<td>${e((it.rubric.r.feedback || [])[i] || "")}</td>` : ""}</tr>`).join("")}</table></details>` : ""}
      ${it.week ? `<details class="tfb-rub" open><summary>📊 Your row of ${e(it.week.title)}</summary><table>${it.week.cols.map(c => `<tr><td>${e(c.label)}${c.sub ? ` <small>${e(c.sub)}</small>` : ""}</td>
        <td><b>${c.type === "notes" ? "" : c.raw === "" ? "—" : c.max === 5 ? e(c.raw) + "/5" : `${e(c.raw)}/${e(c.max)} → ${c.mark == null ? "—" : Number(c.mark).toFixed(2) + "/5"}`}</b></td><td>${e(c.note)}</td></tr>`).join("")}</table></details>` : ""}</div>`).join("")
    : `<div class="card" style="padding:24px;">No feedback yet. When your trainer reviews your work (the transcriptions, your video notes, your process guides, your letters, the mock calls and demos), it shows here.</div>`;
  markSeenShown(MF.list.map(x => x.k), Object.fromEntries(MF.list.map(x => [x.k, x])));
  return `<div class="tfb-hero"><p class="lp-eyebrow">📂 My Pages</p><h1>📬 My Feedback</h1><p>Everything your trainer sent you about your work, newest first. Your scores are on 🏅 My Performance too.</p></div>${html}`;
}
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["myfeedback"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {myfeedback: "My Feedback"});
// 📬 My Feedback is part of 🏅 My Performance now (js/ft-my-pages.js): its list, without its own page header
window.FTMyFeedback = {html: () => renderMine().replace(/^<div class="tfb-hero">[\s\S]*?<\/div>/, "")};
const __render = window.render;
window.render = function(){
  if(state.view === "myfeedback"){ state.view = "scorecard"; return window.render.apply(this, arguments); }
  return __render.apply(this, arguments);
};

/* ---------- Admin → 📝 Send Feedback ---------- */
const A = {people: null, loading: false, batch: "", act: "", status: "todo", rows: null, open: null, drafting: false, guideKeys: null, who: ""};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
async function loadAdmin(){
  A.loading = true; A.rows = null; render();
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    A.people = list.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected && (!window.ftActiveTrainee || ftActiveTrainee(r))).map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || ""})).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!A.batch){ const bs = batchesOf(); A.batch = bs[bs.length - 1] || ""; }
    const ppl = A.people.filter(p => bLabel(p.batch) === A.batch), keys = [];
    ppl.forEach(p => keys.push("transcribe:" + p.id, "lor:" + p.id, "trainerfb:" + p.id));
    const vals = []; for(let i = 0; i < keys.length; i += 96) vals.push(...await sharedGetMany(keys.slice(i, i + 96)));
    const gk = await sharedList("guide:").catch(() => []);
    const rows = [];
    for(const [i, p] of ppl.entries()){
      const [tr, lr, fb] = vals.slice(i * 3, i * 3 + 3), sent = (fb && fb.items) || {};
      const add = (act, its) => its.forEach(it => rows.push(Object.assign({p, act, sent: sent[act + ":" + it.item] || null}, it)));
      add("transcribe", ACTS.transcribe.items(tr)); add("lor", ACTS.lor.items(lr));
      // the guides: listed from their keys; the guide itself (it carries pictures) is read when it is opened
      gk.filter(k => k.startsWith(`guide:${p.id}:`)).forEach(k => { const g = k.slice(`guide:${p.id}:`.length);
        rows.push({p, act: "guide", item: g, title: (guides().find(x => x.id === g) || {}).title || g, lazyKey: k, sent: sent["guide:" + g] || null}); });
    }
    // (✍️ a manual activity picked: every trainee of the batch, to write their feedback on it)
    A.sentBy = {}; ppl.forEach((p, i) => { A.sentBy[p.id] = ((vals[i * 3 + 2] || {}).items) || {}; });
    A.ppl = ppl;
    A.rows = rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }catch(err){ A.rows = []; }
  A.loading = false; if(state.view === "admin" && state.adminTab === "sendfeedback") render();
}
const batchesOf = () => [...new Set((A.people || []).map(p => bLabel(p.batch)).filter(Boolean))].sort();
/* 📊 a manual activity (a Knowledge Check, a day's activity, a side activity) has no work of its own in this list: what the
   platform already recorded for the trainee — every grading system's items (lshProgram.compute, the same as 🏅 My Performance)
   — is read when the row is opened, shown under "Their work" and given to ✨ Draft, so the draft scores what was detected
   instead of calling it NO SUBMISSION. */
const EV = {};
async function evidenceOf(p){
  if(EV[p.id] && Date.now() - EV[p.id].at < 120000) return EV[p.id].sc;
  const CFG = window.LSH_PROGRAM || {}, ks = (CFG.sources || []).filter(x => x.key), shared = CFG.shared || [];
  if(!window.lshProgram || !lshProgram.compute || !ks.length) return null;
  const tr = ((typeof state === "object" && state.adminData) || []).find(x => x && x.id === p.id) || await sharedGet("trainee:" + p.id).catch(() => null) || {};
  const vals = await sharedGetMany(ks.map(x => x.key + p.id).concat(shared)), rec = {}, sh = {};
  ks.forEach((x, i) => { rec[x.key] = vals[i] || null; }); shared.forEach((k, i) => { sh[k] = vals[ks.length + i] || null; });
  const sc = lshProgram.compute({id: p.id, progress: tr.dayProgress || {}, rec, shared: sh, since: String(tr.registeredAt || "").slice(0, 10)});
  EV[p.id] = {sc, at: Date.now()}; return sc;
}
const norm = v => String(v || "").toLowerCase().replace(/^(day \d+ · |knowledge check: )/, "").replace(/[^a-z0-9]+/g, " ").trim();
// the recorded items that are this activity
function matchOf(r, sc){
  if(!sc) return [];
  const all = sc.rows.filter(x => !x.s.hidden).flatMap(x => x.items.map(it => Object.assign({src: x.s}, it)));
  const id = String(r.item || ""), t = norm(r.title);
  const bySrc = {"side-typing": "skills", "side-monitor": "drive", "side-tracker": "drive", "side-links": "drive"}[id];
  if(bySrc) return all.filter(it => it.src.id === bySrc);
  if(/^kc-/.test(id)){ const d = (window.DAYS || (typeof DAYS !== "undefined" ? DAYS : [])).find(x => "kc-" + x.id === id); return all.filter(it => it.src.id === "kc" && d && norm(it.name) === norm(d.title)); }
  if(/^reading-/.test(id)) return all.filter(it => it.src.id === "kc" && /reading/i.test(it.name));
  return t ? all.filter(it => { const n = norm(it.name); return n && (n === t || n.includes(t) || t.includes(n)); }) : [];
}
const evLine = it => `${it.src.icon} ${it.src.label} · ${it.name}: ${typeof it.pct === "number" ? it.pct + "%" : "not scored"}${it.note ? " (" + it.note + ")" : ""}`;
async function openRow(i){
  const r = A.rows[i]; if(!r) return;
  A.open = i; A.drafting = false;
  if(r.lazyKey && !r.loaded){
    render();
    try{ const v = await sharedGet(r.lazyKey); const it = ACTS.guide.items({[r.item]: v})[0]; if(it) Object.assign(r, it); }catch(err){}
    r.loaded = true;
  }
  if(r.manual && !r.ev){ render(); try{ const sc = await evidenceOf(r.p); r.ev = {all: sc, hit: matchOf(r, sc)}; }catch(err){ r.ev = {all: null, hit: []}; } }
  render();
  const el = document.getElementById("tfbForm"); if(el) el.scrollIntoView({block: "nearest"});
}
function workHtml(r){
  if(r.manual){
    const ev = r.ev, hit = ev ? ev.hit : null;
    return `${!ev ? `<p class="fss-muted">Reading what the platform recorded…</p>` : hit.length
        ? `<p class="tfb-sub">📊 What the platform recorded</p><ul class="tfb-ev">${hit.map(it => `<li><b>${e(it.name)}</b> <span class="fss-pill ${typeof it.pct === "number" ? (it.pct >= 70 ? "ok" : "mid") : ""}">${typeof it.pct === "number" ? e(it.pct) + "%" : "not scored"}</span>${it.note ? `<small>${e(it.note)}</small>` : ""}<small>${it.src.icon} ${e(it.src.label)}</small></li>`).join("")}</ul>`
        : `<p class="fss-muted">📊 Nothing the platform scores matches this activity: ✨ Draft works from the trainee's other recorded scores.</p>`}
      <p class="fss-muted">✍️ Your own feedback on this activity: write what they did well, what to improve and why. The trainee gets a notification as soon as you send it, and it stays in their 📬 My Feedback.</p>`;
  }
  if(r.lazyKey && !r.loaded) return `<p class="fss-muted">Opening the guide…</p>`;
  if(r.act === "guide") return r.html ? `<div class="tfb-guide">${window.FTGuide ? FTGuide.clean(r.html) : ""}</div>` : `<p class="fss-muted">The guide is empty.</p>`;
  return `<div class="tfb-work">${String(r.text ? r.text() : "").split("\n").map(l => { const m = /^([^:]{2,60}):\s?(.*)$/.exec(l); return m ? `<p><b>${e(m[1])}:</b> ${e(m[2])}</p>` : `<p>${e(l)}</p>`; }).join("")}</div>`;
}
// (a manual activity's rows: each trainee of the batch, with the feedback already sent on it)
function manualRows(){
  const a = catalogue().find(x => "m|" + x.id === A.act); if(!a) return [];
  return (A.ppl || []).map(p => { const k = "manual:" + a.id, ex = A.rows.find(r => r.p.id === p.id && r.act === "manual" && r.item === a.id);
    if(ex) return ex; const r = {p, act: "manual", item: a.id, title: a.title, group: a.group, manual: true, sent: (A.sentBy[p.id] || {})[k] || null}; A.rows.push(r); return r; });
}
// (inline: in a trainee's own table on 📋 Batch Sheet — js/ft-batch-sheet.js —, their work alone, the Batch Sheet's batch)
function renderAdmin(opts){
  const inl = !!(opts && opts.inline);
  if(!A.rows){ if(!A.loading) loadAdmin(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting the trainees’ work…</div>`; }
  if(String(A.act).startsWith("m|")) manualRows();
  const bs = batchesOf();
  const mAct = String(A.act).startsWith("m|") ? A.act.slice(2) : null;
  const rows = A.rows.map((r, i) => Object.assign({i}, r)).filter(r => mAct ? r.act === "manual" && r.item === mAct && (A.status === "all" || A.status === "todo" ? true : !!r.sent)
    : (!A.act || r.act === A.act) && !r.manual && (A.status === "all" || (A.status === "todo" ? !r.sent : !!r.sent))).filter(r => !inl || r.p.id === A.who);
  const todo = A.rows.filter(r => !r.sent && !r.manual && (!inl || r.p.id === A.who)).length;
  const cat = catalogue(), groups = [...new Set(cat.map(x => x.group))];
  const cur = A.open != null ? A.rows[A.open] : null, s = cur && cur.sent || {};
  const whoName = inl ? ((A.ppl || []).find(p => p.id === A.who) || {}).name || "" : "";
  return `<div class="card tfb-admin${inl ? " tfb-inline" : ""}"><div class="ff-bar"><div><h3>📝 Send Feedback${inl && whoName ? " · " + e(whoName) : ""}</h3><p class="fss-muted">The trainees’ work on the platform’s activities, by batch: open one, read it, and send your verdict, score and comment. The trainee sees it on that activity’s page, on 📬 My Feedback and in their scores. (Mock calls and demos: their scorecards in 🧑‍🏫 Trainer Inputs.)</p></div>
      <span class="tfb-filters">${inl ? "" : `<select onchange="FTFeedback.batch(this.value)">${bs.map(b => `<option ${b === A.batch ? "selected" : ""}>${e(b)}</option>`).join("") || "<option>No batches</option>"}</select>`}
        <select onchange="FTFeedback.act(this.value)" aria-label="Activity"><option value="">Every activity (the work to review)</option><optgroup label="📝 The work to review">${Object.keys(ACTS).filter(k => k !== "manual").map(k => `<option value="${k}" ${A.act === k ? "selected" : ""}>${ACTS[k].icon} ${e(ACTS[k].label)}</option>`).join("")}</optgroup>
          ${groups.map(g => `<optgroup label="✍️ ${e(g.replace(/^\S+\s/, ""))}">${cat.filter(x => x.group === g).map(x => `<option value="m|${e(x.id)}" ${A.act === "m|" + x.id ? "selected" : ""}>${e(x.title)}</option>`).join("")}</optgroup>`).join("")}</select>
        <select onchange="FTFeedback.status(this.value)"><option value="todo" ${A.status === "todo" ? "selected" : ""}>To review (${todo})</option><option value="sent" ${A.status === "sent" ? "selected" : ""}>Sent</option><option value="all" ${A.status === "all" ? "selected" : ""}>All</option></select>
        <button class="btn btn-ghost btn-sm" onclick="FTFeedback.refresh()">↻</button></span></div>
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl tfb-tbl"><thead><tr><th>Trainee</th><th>Activity</th><th>Work</th><th>Last worked on</th><th>Checks</th><th>Your feedback</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${A.open === r.i ? "tfb-on" : ""}" onclick="FTFeedback.open(${r.i})"><td><b>${e(r.p.name)}</b></td><td>${actInfo(r.act).icon} ${e(r.manual ? r.group || actInfo(r.act).label : actInfo(r.act).label)}</td><td>${e(r.title)}${r.done === false ? ` <span class="fss-pill">in progress</span>` : ""}</td>
        <td>${e(when(r.at)) || "—"}</td><td>${r.auto != null ? e(r.auto) + "%" : "—"}</td>
        <td>${r.sent ? `<span class="fss-pill ok">✓ Sent ${e(when(r.sent.at))}</span> ${r.sent.score != null && r.sent.score !== "" ? e(r.sent.score) + "%" : ""}` : `<span class="fss-pill mid">${r.manual ? "✍️ Write feedback" : "To review"}</span>`}</td></tr>`).join("")}
    </tbody></table></div>` : `<p class="fss-muted">${A.status === "todo" ? "Nothing waiting for your feedback" : "Nothing here"}${A.act && !mAct ? " in " + e(actInfo(A.act).label) : ""} for ${e(A.batch || "this batch")}.</p>`}
    ${cur ? `<div class="tfb-panel" id="tfbForm"><div class="tfb-panel-h"><b>${actInfo(cur.act).icon} ${e(cur.p.name)} · ${e(cur.manual ? cur.group || "" : actInfo(cur.act).label)} · ${e(cur.title)}</b><button class="btn btn-ghost btn-sm" onclick="FTFeedback.close()">Close</button></div>
      <div class="tfb-cols"><div><p class="tfb-sub">Their work</p>${workHtml(cur)}${cur.ai ? `<p class="tfb-sub">🤖 The AI’s evaluation</p><div class="tfb-work">${paras(cur.ai)}</div>` : ""}</div>
        <div class="tfb-form"><p class="tfb-sub">Your feedback</p>
          <label>Verdict<select data-verdict><option value="">—</option>${VERDICTS.map(v => `<option ${s.verdict === v ? "selected" : ""}>${e(v)}</option>`).join("")}</select></label>
          <label>Score <span><input type="number" min="0" max="100" data-score value="${s.score == null ? "" : e(s.score)}"> %</span></label>
          <label class="tfb-wide">Comment<textarea rows="8" data-comment placeholder="What was done well, what to improve and why (the trainee reads this)">${e(s.comment || "")}</textarea></label>
          <div class="fp-actions"><button class="btn btn-ghost btn-sm" ${A.drafting ? "disabled" : ""} onclick="FTFeedback.draft(this)">${A.drafting ? "Writing…" : "✨ Draft in the facilitator’s voice"}</button>
            <button class="btn btn-navy btn-sm" onclick="FTFeedback.send(this)">📤 ${cur.sent ? "Send the update" : "Send to the trainee"}</button></div>
          ${cur.sent ? `<p class="fss-muted">Sent ${e(new Date(cur.sent.at).toLocaleString())}. Sending again replaces it.</p>` : ""}</div></div></div>` : ""}</div>`;
}
window.addEventListener("ft-roster-changed", () => { A.rows = null; A.people = null; A.open = null; });
window.FTFeedback = {
  // 📋 Batch Sheet → a trainee's table → 📝 Send Feedback: the tool for that trainee alone, in the Batch Sheet's batch
  inline(id, batch){
    if(batch && batch !== A.batch){ A.batch = batch; A.rows = null; A.open = null; }
    if(A.who !== id){ A.who = id; A.open = null; }
    return renderAdmin({inline: true});
  },
  batch(b){ A.batch = b; A.open = null; loadAdmin(); },
  act(a){ A.act = a; A.open = null; if(String(a).startsWith("m|")) A.status = "all"; render(); },
  status(s){ A.status = s; A.open = null; render(); },
  refresh(){ A.open = null; loadAdmin(); },
  open: openRow, close(){ A.open = null; render(); },
  async draft(btn){
    const r = A.rows[A.open]; if(!r) return; const box = btn.closest(".tfb-form");
    A.drafting = true; btn.disabled = true; btn.textContent = "Writing…";
    try{
      if(r.manual && !r.ev){ try{ const sc = await evidenceOf(r.p); r.ev = {all: sc, hit: matchOf(r, sc)}; }catch(err){ r.ev = {all: null, hit: []}; } }
      const hit = (r.ev && r.ev.hit) || [], rest = r.ev && r.ev.all ? r.ev.all.rows.flatMap(x => x.items.filter(it => typeof it.pct === "number").map(it => Object.assign({src: x.s}, it))).filter(it => !hit.some(h => h.name === it.name && h.src.id === it.src.id)) : [];
      const work = r.manual ? (hit.length ? `What the platform recorded for this activity (the trainee DID this work; never call it NO SUBMISSION when a score or a completion is recorded here):\n${hit.map(evLine).join("\n")}`
          : "The platform has no score of its own for this activity.") + (rest.length ? `\n\nThe trainee's other recorded scores, for context:\n${rest.slice(0, 40).map(evLine).join("\n")}` : "")
        : String(r.text ? r.text() : "").slice(0, 7000);
      const scored = hit.filter(it => typeof it.pct === "number");
      const prompt = `You are the training facilitator of Legal Support Help writing your feedback on a trainee Legal VA's work in the ${r.manual ? r.group.replace(/^\S+\s/, "") : actInfo(r.act).label}: ${r.title}.
Trainee's first name: ${String(r.p.name).split(/\s+/)[0]}
THEIR WORK:
${work}
${scored.length ? `Use the recorded score (${Math.round(scored.reduce((n, it) => n + it.pct, 0) / scored.length)}%) as the score, and pick the verdict that fits it.` : ""}
${r.manual && !hit.length ? `Only use "NO SUBMISSION" if nothing at all is recorded for this activity; otherwise base the feedback on what is recorded.` : ""}
${r.auto != null ? `The automated checks: ${r.auto}%` : ""}
${r.ai ? `The AI's earlier evaluation: ${r.ai}` : ""}

Write your feedback in your feedback DNA (below). Return a verdict label from your list, a score from 0 to 100, and the comment (2–4 sentences: the strengths named specifically, then "However, improvement is needed in …" naming exactly what to fix, tied to its purpose).

FACILITATOR'S FEEDBACK DNA:
${window.ftDnaGuide ? ftDnaGuide() : String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"verdict":"...","score":0,"comment":"..."}`;
      const out = await callAIJson(prompt, 900, undefined, "grading");
      if(out && out.comment){
        box.querySelector("[data-comment]").value = String(out.comment).slice(0, 4000);
        if(out.verdict){ const v = VERDICTS.find(x => x.toLowerCase().replace(/\W/g, "") === String(out.verdict).toLowerCase().replace(/\W/g, "")); if(v) box.querySelector("[data-verdict]").value = v; }
        if(scored.length) box.querySelector("[data-score]").value = Math.round(scored.reduce((n, it) => n + it.pct, 0) / scored.length);
        if(isFinite(Number(out.score)) && !box.querySelector("[data-score]").value) box.querySelector("[data-score]").value = Math.max(0, Math.min(100, Math.round(Number(out.score))));
      } else toast("The AI returned nothing. Try again.");
    }catch(err){ toast("The AI isn’t available right now. Write it yourself."); }
    A.drafting = false; btn.disabled = false; btn.textContent = "✨ Draft in the facilitator’s voice";
  },
  async send(btn){
    const r = A.rows[A.open]; if(!r) return; const box = btn.closest(".tfb-form");
    const sv = String(box.querySelector("[data-score]").value || "").trim(), comment = String(box.querySelector("[data-comment]").value || "").trim(), verdict = box.querySelector("[data-verdict]").value;
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The score is a number from 0 to 100."); return; }
    if(!comment && !verdict && sv === ""){ toast("Write the comment, or give a verdict or a score."); return; }
    btn.disabled = true;
    try{
      const cur = (await sharedGet("trainerfb:" + r.p.id)) || {}; cur.items = cur.items || {};
      const it = Object.assign({act: r.act, item: r.item, title: r.title, verdict, score: sv === "" ? null : Math.round(Number(sv)), comment: comment.slice(0, 4000), at: new Date().toISOString()}, r.manual ? {group: r.group} : {});
      cur.items[r.act + ":" + r.item] = it; cur.updatedAt = it.at;
      if(await sharedSet("trainerfb:" + r.p.id, cur) === false) throw new Error("save");
      r.sent = it; toast(`📤 Sent to ${String(r.p.name).split(/\s+/)[0]}.`);
    }catch(err){ toast("Couldn’t send. Check your connection."); }
    btn.disabled = false; render();
  },
  // for the checks and 🏅 the Scorecard
  acts: ACTS, mine: () => loadMine(true)
};
ftAdminTab("sendfeedback", "📝 Send Feedback", renderAdmin);

/* 🔔 THE TRAINEE'S NOTIFICATION: new feedback from their trainer (anything in trainerfb:<id> newer than they have seen) pops up
   over the page as soon as it is read — on signing in, and about once a minute while they use the platform — with each new
   one (its title, verdict, score and comment) and the way to 📬 My Feedback. Shown once a feedback: ✓ Got it marks them seen. */
const POPPED = new Set();
function fbPopup(){
  if(!state.traineeId || state.isAdmin || state.adminPreview || document.getElementById("tfbPop")) return;
  const items = Object.entries((F.rec && F.rec.items) || {}).filter(([k, it]) => it && it.at && isNew(k, it) && !POPPED.has(k + "|" + it.at))
    .sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)));
  if(!items.length) return;
  items.forEach(([k, it]) => POPPED.add(k + "|" + it.at));
  const m = document.createElement("div"); m.id = "tfbPop"; m.className = "tfb-pop"; m.setAttribute("role", "dialog"); m.setAttribute("aria-label", "New feedback from your trainer");
  m.innerHTML = `<div class="tfb-pop-box"><div class="tfb-pop-h">🔔 New feedback from your trainer${items.length > 1 ? ` (${items.length})` : ""}</div>
    <div class="tfb-pop-b">${items.slice(0, 3).map(([k, it]) => `<div class="tfb-pop-it"><p class="tfb-pop-k">${actInfo(it.act).icon} ${e(it.act === "manual" ? (it.group || "").replace(/^\S+\s/, "") || "Trainer's feedback" : actInfo(it.act).label)}</p>${fbCard(it, k)}</div>`).join("")}
      ${items.length > 3 ? `<p class="fss-muted">and ${items.length - 3} more in 📬 My Feedback.</p>` : ""}</div>
    <div class="tfb-pop-f"><button type="button" class="btn btn-ghost btn-sm" onclick="FTFeedback.popClose(true)">✓ Got it</button><button type="button" class="btn btn-navy btn-sm" onclick="FTFeedback.popClose(true); goto('myfeedback')">📬 Open My Feedback</button></div></div>`;
  m.dataset.keys = JSON.stringify(items.map(([k]) => k));
  document.body.appendChild(m);
}
FTFeedback.popClose = function(seenToo){ const m = document.getElementById("tfbPop"); if(!m) return; if(seenToo){ try{ markSeen(JSON.parse(m.dataset.keys || "[]")); }catch(err){} } m.remove(); };
FTFeedback.checkNew = function(){ if(!state.traineeId || state.isAdmin || state.adminPreview) return; loadMine(true).then(fbPopup).catch(() => {}); };
setTimeout(() => FTFeedback.checkNew(), 2500);
setInterval(() => { if(!document.hidden) FTFeedback.checkNew(); }, 60000);

// 🏅 My Performance: the scores the trainer sent (js/ft-program.js lists this source)
window.ftTrainerFeedbackItems = ctx => Object.values(((ctx.rec["trainerfb:"] || {}).items) || {}).filter(it => it && it.score != null && it.score !== "")
  .map(it => ({name: `${(ACTS[it.act] || {}).icon || "📝"} ${(ACTS[it.act] || {}).label || it.act} · ${it.title}`, pct: Number(it.score), note: it.verdict || "Trainer’s score"}));

(function(){ const st = document.createElement("style"); st.id = "ft-trainer-feedback"; st.textContent = `
.tfb-hero h1{margin:0 0 4px;} .tfb-hero p{margin:0;color:var(--ink-soft);}
.tfb-page{padding:14px 18px;border-left:5px solid #DB8437;}
.tfb-page h3{margin:0 0 8px;color:var(--navy);}
.tfb-item{border-top:1px solid #F0F1F5;padding:8px 0;} .tfb-item:first-of-type{border-top:0;}
.tfb-pop{position:fixed;inset:0;z-index:10060;background:rgba(15,18,40,.5);display:flex;align-items:center;justify-content:center;padding:14px;}
.tfb-pop-box{background:#fff;border-radius:14px;width:min(560px,100%);max-height:calc(100vh - 28px);display:flex;flex-direction:column;box-shadow:0 18px 50px rgba(0,0,0,.35);overflow:hidden;animation:tfbPopIn .25s ease-out;}
.tfb-pop-h{background:#1E2340;color:#fff;font-weight:800;font-size:17px;padding:12px 16px;border-bottom:3px solid #DB8437;}
.tfb-pop-b{padding:10px 16px;overflow:auto;} .tfb-pop-k{margin:6px 0 0;font-size:12px;font-weight:800;color:#8A4A00;text-transform:uppercase;letter-spacing:.04em;}
.tfb-pop-f{display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid #EEF0F5;}
@keyframes tfbPopIn{from{transform:translateY(12px);opacity:0;}to{transform:none;opacity:1;}}
.tfb-item-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.tfb-item p{margin:4px 0 0;font-size:14px;line-height:1.5;}
.tfb-fac{margin:4px 0;font-size:13.5px;color:#4A5070;}
.tfb-verdict{font-weight:800;color:#1F2A44;}
.tfb-badge{background:#DB8437;color:#fff;border-radius:999px;font-size:10.5px;font-weight:800;padding:1px 7px;}
.tfb-score{font-weight:800;color:#1E7F4F;background:#E7F5EE;border-radius:999px;padding:1px 8px;font-size:12.5px;}
.tfb-when{margin-left:auto;color:var(--ink-soft);font-size:12px;}
/* (.card.tfb-row: the engine's Trainee Feedback form has rows of stars named tfb-row too, which keep their own layout) */
.card.tfb-row{padding:12px 16px;display:flex !important;flex-direction:column !important;align-items:stretch !important;gap:4px;}
.card.tfb-row > *{width:100%;} .card.tfb-row.tfb-new{border-left:5px solid #DB8437;}
.tfb-kicker{font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#B5651F;}
.tfb-rub{margin-top:6px;font-size:13px;} .tfb-rub summary{cursor:pointer;color:var(--navy);font-weight:700;}
.tfb-rub table{border-collapse:collapse;margin-top:6px;width:100%;} .tfb-rub td{border:1px solid #E3E7F0;padding:3px 8px;}
.tfb-admin{padding:18px 20px;}
.tfb-filters{display:flex;gap:6px;flex-wrap:wrap;}
.tfb-filters select{padding:6px 10px;border:1px solid var(--line);border-radius:8px;font:inherit;}
.tfb-tbl tbody tr{cursor:pointer;} .tfb-tbl tbody tr:hover td{background:#F7F8FB;} .tfb-tbl tr.tfb-on td{background:#FFF4E6;}
.tfb-panel{margin-top:14px;border:1px solid #E3E7F0;border-radius:12px;padding:14px;background:#FBFBFD;}
.tfb-panel-h{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;}
.tfb-cols{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,1fr);gap:16px;}
@media(max-width:900px){.tfb-cols{grid-template-columns:1fr;}}
.tfb-ev{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:6px;} .tfb-ev li{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;padding:8px 10px;border:1px solid var(--line,#E1E3E1);border-radius:8px;} .tfb-ev small{color:var(--ink-soft);font-size:11.5px;}
.tfb-sub{margin:0 0 6px;font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);}
.tfb-work,.tfb-guide{background:#fff;border:1px solid #E3E7F0;border-radius:10px;padding:10px 12px;max-height:46vh;overflow:auto;font-size:13.5px;margin-bottom:10px;}
.tfb-work p{margin:0 0 5px;white-space:pre-wrap;} .tfb-guide img{max-width:100%;}
.tfb-form{display:flex;flex-direction:column;gap:8px;font-size:13.5px;font-weight:700;color:var(--navy);}
.tfb-form label{display:flex;flex-direction:column;gap:4px;}
.tfb-form select,.tfb-form input,.tfb-form textarea{font:inherit;font-weight:500;font-size:14px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;}
.tfb-form input[type=number]{width:90px;}
`; document.head.appendChild(st); })();
})();
