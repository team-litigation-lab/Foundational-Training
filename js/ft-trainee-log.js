/* ============================================================
   📜 A TRAINEE'S LOG: every evaluation on their account, every output they submitted, and the naming check
   ------------------------------------------------------------
   #/tlog — a trainer opens it for one trainee (👥 Trainees & Batches → 📜 Log), a trainee opens their own (📋 My Progress →
   📜 My Log). It reads what the platform already keeps, so nothing new has to be recorded:
     • 📜 Evaluations, newest first: each Knowledge Check graded (and the 📖 Reading Task), the trainer's reviews, the 📄
       assessments, the 📒 Monitoring Sheet item submits, the end-of-shift checks (Task Tracker, Monitoring Sheet, the day's
       compliance), the 🔗 link checks, the 🧪 test screenshots found, the mock call / demo scorecards, 📝 the trainer's
       feedback per activity and 💬 the day-by-day feedback sent. When, what, the result, and who gave it.
     • 📁 Submitted outputs: every file in the trainee's Assessment and Activities Folder (read through /api/drive/answers),
       with its link and date, each checked against the naming conventions; the day's output links; the PDFs saved from
       ✍️ Knowledge Check.
     • 🏷 The naming check: a file named exactly by a convention is ✓; one that is clearly that file but named another way is
       ✗, with the name it should have; anything else is "? not a known name". The conventions come from the pages that
       ask for the files (FTProcess, FTAssess, FTDayDecks.namings, the LOR templates); the test screenshots from
       FTTrackerRules.parseTestShot.
   It reads again every minute while it is open (and on ↻ Refresh), so a new grade or file shows up by itself.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const t = v => { const d = v ? new Date(v) : null; return d && isFinite(d) ? d : null; };
const when = v => { const d = t(v); return d ? d.toLocaleString(undefined, {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"}) : ""; };
const pct = v => typeof v === "number" && isFinite(v) ? Math.round(v) + "%" : "";
const tone = v => typeof v !== "number" ? "" : v >= 85 ? "ok" : v >= 70 ? "mid" : "low";
const lessonName = id => { try{ return ftName(Number(id)); }catch(err){ return "Lesson " + id; } };
const L = {id: null, name: "", data: null, files: null, filesErr: "", loading: false, at: 0, timer: null, tab: "log"};

/* ---------- 🏷 the naming conventions ---------- */
const norm = s => String(s || "").replace(/[‘’`´]/g, "'").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const bare = n => String(n || "").replace(/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|odt|png|jpe?g|gif|webp|heic)$/i, "");
const key = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
// the parts of a convention that are filled in: the VA's name, a date, the carrier, the medical provider, the batch
const PH = /\(\s*(?:VA'?s?\s*(?:first\s*|full\s*)?name|VA\s*first\s*name|your\s*(?:first\s*|full\s*)?name)\s*\)|\[\s*(?:your\s*(?:first\s*|full\s*)?name|VA'?s?\s*(?:first\s*)?name)\s*\]|mm\.dd\.yy(?:yy)?|\[\s*batch\s*\]|1P\/3P Insurance Provider|Lien Holder\s*\(Medical Provider\)/gi;
const esc_ = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function compile(conv){
  const n = norm(conv.name); let re = "", fixed = "", last = 0, m;
  PH.lastIndex = 0;
  while((m = PH.exec(n))){
    const lit = n.slice(last, m.index); re += esc_(lit); fixed += lit;
    const p = m[0].toLowerCase();
    re += /mm\.dd/.test(p) ? "\\d{2}\\.\\d{2}\\.\\d{2}(?:\\d{2})?" : p.startsWith("(") ? "\\(\\s*[^()]+?\\s*\\)" : p.startsWith("[") ? "[^\\[\\]]+?" : ".+?";
    last = m.index + m[0].length;
  }
  re += esc_(n.slice(last)); fixed += n.slice(last);
  return Object.assign({}, conv, {re: new RegExp("^" + re + "$"), fixed: key(fixed), words: words(fixed), tag: words(String(conv.what || "").replace(/^\W+/, "")).slice(0, 1)});
}
// the words of a name, for a near match: lower case, split at anything not a letter or digit, plural "s" off, 3 letters or more
const STOP = new Set(["the", "and", "with", "for", "your", "name", "first", "full", "pdf", "docx", "png", "jpg", "copy", "final"]);
const words = s => String(s || "").toLowerCase().split(/[^a-z0-9]+/).map(w => w.length > 4 ? w.replace(/s$/, "") : w).filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
let CONV = null;
function conventions(){
  if(CONV) return CONV;
  const list = [].concat(
    window.FTProcess && FTProcess.conventions ? FTProcess.conventions() : [],
    window.FTAssess && FTAssess.conventions ? FTAssess.conventions() : [],
    window.FTDayDecks && FTDayDecks.namings ? FTDayDecks.namings() : [],
    (window.FT_LOR_TEMPLATES || []).filter(x => x && x.naming).map(x => ({name: x.naming, what: "🧰 " + (x.title || "Letter")})));
  const seen = new Set();
  CONV = list.filter(c => c && c.name && !seen.has(norm(c.name)) && seen.add(norm(c.name))).map(compile).filter(c => c.fixed.length >= 4);
  return CONV;
}
// one file: {st: "ok" | "bad" | "test" | "testbad" | "unknown", conv, want}
function nameCheck(name, created){
  const b = norm(bare(name));
  const shot = window.FTTrackerRules && FTTrackerRules.parseTestShot ? FTTrackerRules.parseTestShot(name, created) : null;
  if(shot){ const am = /(?:^|[^a-z])(am|pm)(?![a-z])/i.test(b);
    return shot.named && am ? {st: "ok", what: shot.kind === "typing" ? "🧪 Typing Test screenshot" : "🧪 Spelling Test screenshot"}
      : {st: "bad", what: shot.kind === "typing" ? "🧪 Typing Test screenshot" : "🧪 Spelling Test screenshot", want: `${shot.kind === "typing" ? "Typing" : "Spelling"} Test [date taken][AM/PM], e.g. ${shot.kind === "typing" ? "Typing" : "Spelling"} Test 10.26.26AM`}; }
  const C = conventions(), k = key(b);
  const hit = C.find(c => c.re.test(b));
  if(hit) return {st: "ok", what: hit.what, conv: hit.name};
  // clearly that file, named another way: the convention's own words in it (whatever the spaces, underscores and capitals),
  // most of its words, or the word that names it (MedLOR, HIPAA …)
  const nw = new Set(words(b)), score = c => { const hit = c.words.filter(w => nw.has(w)).length;
    return k.includes(c.fixed) ? 2 : c.words.length && hit >= 2 && hit / c.words.length >= 0.6 ? hit / c.words.length : c.tag.length && c.tag[0].length >= 4 && nw.has(c.tag[0]) ? 0.55 : 0; };
  const near = C.map(c => ({c, v: score(c)})).filter(x => x.v > 0).sort((a, z) => z.v - a.v || z.c.fixed.length - a.c.fixed.length)[0];
  if(near) return {st: "bad", what: near.c.what, want: near.c.name};
  return {st: "unknown"};
}

/* ---------- reading ---------- */
const KEYS = ["trainee:", "process:", "kcreview:", "trackerreview:", "drive:", "labreview:", "trainerfb:", "feedback:"];
async function load(force){
  if(!L.id || L.loading || (!force && Date.now() - L.at < 15000)) return;
  L.loading = true; L.at = Date.now();
  try{
    const vals = await sharedGetMany(KEYS.map(k => k + L.id));
    L.data = {}; KEYS.forEach((k, i) => { L.data[k] = vals[i] || null; });
    L.name = ((L.data["trainee:"] || {}).name) || L.name || L.id;
  }catch(err){ L.data = L.data || {}; }
  try{
    const r = await authFetch("/api/drive/answers", isTrainee() ? {} : {id: L.id}), j = await r.json().catch(() => ({}));
    L.files = Array.isArray(j.files) ? j.files : L.files; L.filesErr = j.error || "";
  }catch(err){ L.filesErr = "offline"; }
  L.loading = false;
  if(state.view === "tlog") render();
}

/* ---------- 📜 the evaluations ---------- */
function events(){
  const D = L.data || {}, out = [], push = (at, icon, what, result, by, cls, link) => { if(t(at)) out.push({at: t(at), icon, what, result, by, cls, link}); };
  const P = D["process:"] || {}, KR = D["kcreview:"] || {}, TR = D["trackerreview:"] || {}, DV = D["drive:"] || {};
  Object.entries(P.kc || {}).forEach(([l, r]) => { const x = r && r.last; if(x) push(x.at, "✍️", `Knowledge Check · ${lessonName(l)}`, `${x.pct}% · best ${r.best}% · ${r.attempts} attempt${r.attempts === 1 ? "" : "s"}`, "AI grader", tone(x.pct)); });
  Object.entries(P.kcRead || {}).forEach(([l, r]) => { const x = r && r.last; if(x) push(x.at, "📖", `Reading Task · ${lessonName(l)}`, `${x.pct}% · best ${r.best}% · ${r.attempts} attempt${r.attempts === 1 ? "" : "s"}`, "AI grader", tone(x.pct)); });
  const title = sid => { for(const d of (typeof DAYS !== "undefined" ? DAYS : [])){ const st = (typeof ftKcQuestions === "function" ? ftKcQuestions(d.id) : []).map(q => q.set).find(st => st.id === sid); if(st) return st.title; } return sid; };
  Object.entries(P.sets || {}).forEach(([sid, x]) => {
    if(x && x.submittedAt) push(x.submittedAt, "📝", `Answer sheet submitted · ${title(sid)}`, "Submitted", "Trainee", "");
    if(x && x.drive && x.drive.at) push(x.drive.at, "📄", `Answer sheet PDF saved to the folder · ${title(sid)}`, "Saved", "Trainee", "ok", x.drive.link);
    if(x && x.file && x.file.at) push(x.file.at, "🏷", `Answer sheet found in the folder · ${x.file.name}`, `${x.file.nameOk ? "✓ named by the convention" : "✗ name doesn’t follow the convention"} · ${x.file.onTime ? "on time" : "late"}`, "System", x.file.nameOk && x.file.onTime ? "ok" : "mid", x.file.link);
  });
  Object.entries(KR.lessons || {}).forEach(([l, r]) => { if(r && r.at) push(r.at, "🧑‍🏫", `Trainer’s review · Knowledge Check · ${lessonName(l)}`, (r.score != null && r.score !== "" ? `Final score ${r.score}%` : "Comment") + (r.comment ? ` · “${String(r.comment).slice(0, 140)}”` : ""), "Trainer", tone(Number(r.score))); });
  Object.entries(KR.read || {}).forEach(([l, r]) => { if(r && r.at) push(r.at, "🧑‍🏫", `Trainer’s review · Reading Task · ${lessonName(l)}`, (r.score != null && r.score !== "" ? `Final score ${r.score}%` : "Comment") + (r.comment ? ` · “${String(r.comment).slice(0, 140)}”` : ""), "Trainer", tone(Number(r.score))); });
  Object.entries(TR.assess || {}).forEach(([doc, r]) => { if(r) push(r.at, "📄", `Assessment graded · ${r.title || doc}`, `${r.pct}%${r.pending ? " · essays to be graded by the trainer" : ""}`, r.ai ? "AI grader" : "System", tone(r.pct)); });
  Object.entries(TR.items || {}).forEach(([k, r]) => { if(r) push(r.at, "📒", `Monitoring Sheet items #${k.split("-").join(", #")}${r.activity ? " · " + r.activity : ""}`, `${r.result && r.result.score != null ? r.result.score + "% · " : ""}${r.onTime ? "on time" : "late"}`, r.ai ? "AI grader" : "System", tone(Number(r.result && r.result.score))); });
  Object.entries(TR.days || {}).forEach(([d, r]) => { if(r) push(r.checkedAt, "📋", `Task Tracker check · ${d}`, `${pct(r.pct)}${r.trainerScore != null ? ` · trainer ${r.trainerScore}%` : ""}${(r.rules || []).filter(x => !x.pass).length ? " · missed: " + (r.rules || []).filter(x => !x.pass).map(x => x.label).slice(0, 3).join("; ") : ""}`, "End-of-shift check", tone(r.pct)); });
  if(TR.monitor) push(TR.monitor.checkedAt, "📒", "Monitoring Sheet check", TR.monitor.error ? "✗ " + TR.monitor.error : `${pct(TR.monitor.pct)} · ${TR.monitor.found || 0} of ${TR.monitor.total || 0} discussions`, "End-of-shift check", TR.monitor.error ? "low" : tone(TR.monitor.pct));
  Object.entries(TR.compliance || {}).forEach(([d, r]) => { if(r) push(r.checkedAt, "📤", `Daily compliance · ${d}`, pct(r.pct), "End-of-shift check", tone(r.pct)); });
  Object.entries(TR.verify || {}).forEach(([k, r]) => { if(r) push(r.at, "🔗", `Link check · ${({folder: "Assessment and Activities Folder", tracker: "Daily Task Tracker", monitor: "Monitoring Sheet"})[k] || k}`, r.ok ? "✓ Opens" + (r.name ? ": " + r.name : "") : "✗ " + (r.error || "Can’t be opened"), "System", r.ok ? "ok" : "low", r.url); });
  if(TR.shots && TR.shots.checkedAt) push(TR.shots.checkedAt, "🧪", "Typing & Spelling test screenshots in the folder", TR.shots.error ? "✗ the folder can’t be read" : `${(TR.shots.files || []).length} found`, "System", TR.shots.error ? "low" : "");
  Object.entries(((D["labreview:"] || {}).acts) || {}).forEach(([a, r]) => { if(r) push(r.at || r.date, "🎙", `Mock call / demo scorecard · ${a}`, `${r.status || ""}${r.score != null ? " · " + r.score + "%" : ""}${r.rubric && r.rubric.avg != null ? " · rubric " + r.rubric.avg + "/5" : ""}`, "Trainer", tone(r.score)); });
  Object.entries(((D["trainerfb:"] || {}).items) || {}).forEach(([k, r]) => { if(r) push(r.at, "📝", `Trainer feedback · ${r.title || k}`, `${r.verdict || ""}${r.score != null && r.score !== "" ? " · " + r.score + "%" : ""}`, "Trainer", tone(Number(r.score))); });
  Object.entries(((D["feedback:"] || {}).days) || {}).forEach(([l, r]) => { if(r && r.status === "sent") push(r.sentAt, "💬", `Day-by-day feedback · ${lessonName(l)}`, `${r.rating || ""}${r.summary ? " · " + String(r.summary).slice(0, 140) : ""}`, r.sentBy || "Trainer", /Strong/i.test(r.rating || "") ? "ok" : /Needs/i.test(r.rating || "") ? "low" : "mid"); });
  (Object.entries(DV.days || {})).forEach(([d, x]) => { if(x && x.submittedAt) push(x.submittedAt, "🔗", `Day’s output links submitted · ${d}`, `${(x.links || []).length} link${(x.links || []).length === 1 ? "" : "s"}`, "Trainee", ""); });
  return out.sort((a, b) => b.at - a.at);
}

/* ---------- 📁 the outputs ---------- */
function outputsHtml(){
  const files = (L.files || []).slice().sort((a, b) => String(b.created || b.modified).localeCompare(String(a.created || a.modified)));
  const checked = files.map(f => Object.assign({f}, nameCheck(f.name, f.created || f.modified)));
  const n = s => checked.filter(x => x.st === s).length;
  const mark = x => x.st === "ok" ? `<span class="tl-pill ok">✓ named right</span>` : x.st === "bad" ? `<span class="tl-pill low">✗ should be: ${e(x.want)}</span>` : `<span class="tl-pill">? not a known name</span>`;
  const DV = (L.data || {})["drive:"] || {}, days = Object.entries(DV.days || {}).filter(([, x]) => x && (x.links || []).length).sort((a, b) => b[0].localeCompare(a[0]));
  return `<section class="tl-sec"><h3>📁 Files in the Assessment and Activities Folder <span>${files.length}</span></h3>
    ${!DV.folder ? `<p class="tl-note">No folder linked yet (📁 My Drive links).</p>` : L.filesErr ? `<p class="tl-note tl-err">The folder can’t be read right now (${e(L.filesErr)}). ${isTrainee() ? "Check your 📁 My Drive links." : "The 🔗 link check on the Batch Sheet says why."}</p>` : ""}
    ${files.length ? `<p class="tl-sum"><b class="ok">✓ ${n("ok")}</b> named right · <b class="low">✗ ${n("bad")}</b> named wrong · <b>? ${n("unknown")}</b> not a known name</p>
      <div class="tl-wrap"><table class="tl-tbl"><thead><tr><th>File</th><th>Added</th><th>What it is</th><th>Naming</th></tr></thead><tbody>
      ${checked.map(x => `<tr><td>${x.f.link ? `<a href="${e(x.f.link)}" target="_blank" rel="noopener noreferrer">${e(x.f.name)} ↗</a>` : e(x.f.name)}</td><td>${e(when(x.f.created || x.f.modified))}</td><td>${e(x.what || "")}</td><td>${mark(x)}</td></tr>`).join("")}</tbody></table></div>`
      : DV.folder && !L.filesErr ? `<p class="tl-note">${L.files ? "The folder is empty." : "Reading the folder…"}</p>` : ""}
  </section>
  <section class="tl-sec"><h3>🔗 The day’s output links <span>${days.length} day${days.length === 1 ? "" : "s"}</span></h3>
    ${days.length ? `<div class="tl-wrap"><table class="tl-tbl"><thead><tr><th>Day</th><th>Links</th><th>Submitted</th></tr></thead><tbody>
      ${days.map(([d, x]) => `<tr><td>${e(d)}</td><td>${(x.links || []).map(l => `<a href="${e(l.url)}" target="_blank" rel="noopener noreferrer">${e(l.label || "output")} ↗</a>`).join(" · ")}</td><td>${e(when(x.submittedAt))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="tl-note">None submitted yet.</p>`}
  </section>`;
}
function logHtml(){
  const ev = events();
  return `<section class="tl-sec"><h3>📜 Evaluations <span>${ev.length}</span></h3>
    ${ev.length ? `<div class="tl-wrap"><table class="tl-tbl"><thead><tr><th>When</th><th>What</th><th>Result</th><th>By</th></tr></thead><tbody>
      ${ev.map(x => `<tr><td class="tl-when">${e(when(x.at))}</td><td>${x.icon} ${x.link ? `<a href="${e(x.link)}" target="_blank" rel="noopener noreferrer">${e(x.what)} ↗</a>` : e(x.what)}</td><td><span class="tl-res ${x.cls || ""}">${e(x.result)}</span></td><td>${e(x.by)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="tl-note">Nothing evaluated yet.</p>`}
  </section>`;
}
function page(){
  if(!L.id) return `<div class="card" style="padding:28px;">Pick a trainee first (👥 Trainees & Batches → 📜 Log).</div>`;
  if(!L.data){ load(true); return `<div class="card" style="padding:28px;">Reading ${e(L.name || "the trainee")}’s log…</div>`; }
  const back = isTrainee() ? `<a class="back-link" onclick="goto('mysheet')">&larr; Back to 📋 My Progress</a>` : `<a class="back-link" onclick="state.adminTab='audit'; goto('admin')">&larr; Back to 📋 Batch Sheet · 👥 Trainees &amp; Batches</a>`;
  return `${back}<div class="card tl-card">
    <div class="tl-head"><div><p class="eyebrow">📜 ${isTrainee() ? "My log" : "Trainee log"}</p><h1>${e(L.name)}</h1>
      <p class="tl-note">Every evaluation on this account and every output submitted, read live (again every minute while this page is open). Updated ${e(new Date(L.at).toLocaleTimeString())}.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTTraineeLog.refresh()">${L.loading ? "Reading…" : "↻ Refresh"}</button></div>
    <div class="tl-tabs"><button type="button" class="${L.tab === "log" ? "on" : ""}" onclick="FTTraineeLog.tab('log')">📜 Evaluations</button><button type="button" class="${L.tab === "out" ? "on" : ""}" onclick="FTTraineeLog.tab('out')">📁 Submitted outputs &amp; naming</button></div>
    ${L.tab === "out" ? outputsHtml() : logHtml()}
  </div>`;
}

/* ---------- wiring ---------- */
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["tlog"]);
const __render = window.render;
window.render = function(){
  if(state.view !== "tlog") { if(L.timer){ clearInterval(L.timer); L.timer = null; } return __render.apply(this, arguments); }
  if(isTrainee()){ if(L.id !== state.traineeId){ L.id = state.traineeId; L.name = state.traineeName || ""; L.data = null; L.files = null; } }
  else if(!adminOn()){ state.view = "dashboard"; return __render.apply(this, arguments); }
  if(!L.timer) L.timer = setInterval(() => { if(state.view === "tlog" && document.visibilityState !== "hidden") load(true); }, 60000);
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-tlog">${page()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.FTTraineeLog = {
  open(id, name){ if(adminOn()){ L.id = String(id); L.name = name || ""; L.data = null; L.files = null; L.filesErr = ""; } goto("tlog"); window.scrollTo(0, 0); },
  refresh(){ load(true); render(); },
  tab(k){ L.tab = k; render(); },
  nameCheck, conventions: () => conventions().map(c => ({name: c.name, what: c.what}))
};

const st = document.createElement("style"); st.id = "ft-trainee-log"; st.textContent = `
.main-tlog{max-width:1240px;margin:0 auto;padding:18px 18px 40px;}
.tl-card{padding:18px 22px;} .tl-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;}
.tl-head h1{margin:2px 0 4px;color:var(--navy);} .tl-note{color:var(--ink-soft);font-size:13.5px;margin:4px 0 10px;} .tl-err{color:#B42318;font-weight:700;}
.tl-tabs{display:flex;gap:8px;margin:10px 0 14px;border-bottom:1px solid var(--line);} .tl-tabs button{border:0;background:none;padding:8px 12px;font:700 14px inherit;color:var(--ink-soft);cursor:pointer;border-bottom:3px solid transparent;}
.tl-tabs button.on{color:var(--navy);border-bottom-color:var(--orange);}
.tl-sec{margin:0 0 22px;} .tl-sec h3{margin:0 0 8px;color:var(--navy);} .tl-sec h3 span{font-size:13px;color:var(--ink-soft);font-weight:600;margin-left:6px;}
.tl-wrap{overflow-x:auto;border:1px solid #DCE0EA;border-radius:10px;} .tl-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
.tl-tbl th{background:#F4F6FB;text-align:left;padding:8px 10px;color:var(--navy);font-weight:800;white-space:nowrap;} .tl-tbl td{padding:7px 10px;border-top:1px solid #EEF0F5;vertical-align:top;}
.tl-tbl a{color:var(--navy);font-weight:700;word-break:break-word;} .tl-when{white-space:nowrap;color:var(--ink-soft);}
.tl-res.ok,.tl-sum .ok{color:#15703A;font-weight:700;} .tl-res.mid{color:#8A4A00;font-weight:700;} .tl-res.low,.tl-sum .low{color:#B42318;font-weight:700;}
.tl-pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#EEF0F6;font-size:12px;font-weight:700;color:#3A4058;} .tl-pill.ok{background:#E8F6EE;color:#15703A;} .tl-pill.low{background:#FDECEA;color:#B42318;}
.tl-sum{margin:0 0 8px;font-size:14px;}
@media (max-width:700px){ .main-tlog{padding:12px 16px 30px;} }
`;
document.head.appendChild(st);
})();
