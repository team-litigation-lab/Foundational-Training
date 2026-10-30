/* ============================================================
   🎧 Transcription Activity (#/transcribe) — Day 9, "Minutes of the Meeting Transcription Activity:
   Client-to-Attorney" in the Training Guide, as a generalist VA's real assignment from start to finish:
     1. 📨 the request   Atty. Magdalena's task e-mail: the minutes of her client interview
     2. 🎧 listen        the interview recording on the page, a stopwatch, and [mm:ss] timestamps (Alt+T)
     3. 📝 draft         a "Minutes of the Meeting" document, laid out like the Word file it becomes
     4. 🏷 name & file   the naming convention (Transcription - Recording N (first name)), ⬇ Word download,
                        filed in the Assessments/Activities folder and its Drive link pasted back
     5. 💬 report back   the reply to the attorney: done, where it is
     6. 📤 submit        the self-checks, an evaluation in the facilitator's feedback DNA, and the trainer's
                        score (🧑‍🏫 Trainer Inputs: transcription-1 / transcription-2, which reach the Scorecard)
   Two recordings, one assignment each. Record: transcribe:<id> = {v, r: {1: run, 2: run}}, the trainee's own
   (worker.js lets the trainee write it; admins read it). An admin, and 👁 Trainee view, work on a test copy
   that is never saved. Admins see every trainee's minutes on the same page.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const saves = () => isTrainee();
const ATTY = "Atty. Magdalena";
const DRIVE = id => `https://drive.google.com/file/d/${id}/view?usp=sharing`;
const RECS = {
  1: {id: "1N_cSvNZRWaamyBOwtOijyH-MnmOgRaIi", title: "Interview Recording 1"},
  2: {id: "1lCC6wYca8Pxgqdw2sos-Bo95JdKtUsT5", title: "Interview Recording 2"}
};
const SAMPLE = "1CAGSbA5_REY8UqvCAfn2khyDEL4QMR0m";
// the minutes, in the order the document runs
const FIELDS = [
  ["date", "Date of the meeting", "date"], ["time", "Time", "text", "e.g. 10:00 AM – 10:40 AM (PST)"],
  ["attendees", "Attendees", "text", `${ATTY}; the client (full name as said on the recording)`],
  ["purpose", "Purpose of the meeting", "text", "e.g. Initial consultation on the client’s car accident"],
  ["discussion", "Discussion — what was said, in order", "area", "Type what was discussed, in order. Put a [mm:ss] timestamp at each new point (Alt+T)."],
  ["concerns", "The client’s concerns and questions", "area", "What the client worried about or asked"],
  ["advice", "The attorney’s advice and answers", "area", "What the attorney explained or advised"],
  ["actions", "Action items and next steps (one per line: who does what, by when)", "area", "e.g. Client to send the police report by Friday"]
];
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
const fileWant = n => `Transcription - Recording ${n} (${firstName() || "VA’s first name"})`;
const words = s => (String(s || "").trim().match(/\S+/g) || []).length;
const stamps = s => (String(s || "").match(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g) || []).length;
const isDriveLink = u => /^https:\/\/(drive|docs)\.google\.com\//.test(String(u || "").trim());

/* ---------- the record ---------- */
const T = {id: null, rec: null, loading: null, saving: null, savedOk: true, n: 1, busy: false, sw: {acc: 0, at: 0, on: false}, tick: null, admin: null};
const blank = () => ({v: 1, r: {}});
function run(n){ const r = T.rec.r; return r[n] || (r[n] = {f: {}, file: "", link: "", report: "", startedAt: "", updatedAt: ""}); }
function load(){
  if(!saves()){ if(!T.rec || T.id !== "__copy"){ T.id = "__copy"; T.rec = blank(); } return null; }
  if(T.id === state.traineeId || T.loading) return T.loading;
  const id = state.traineeId;
  T.loading = sharedGet("transcribe:" + id).then(v => { T.id = id; T.rec = v && typeof v === "object" && v.r ? v : blank(); })
    .catch(() => { T.id = id; T.rec = blank(); }).then(() => { T.loading = null; if(state.view === "transcribe") render(); });
  return T.loading;
}
function save(){
  if(!saves()) return;
  T.rec.updatedAt = new Date().toISOString();
  clearTimeout(T.saving); paintSave("Saving…");
  T.saving = setTimeout(async () => { const ok = await sharedSet("transcribe:" + T.id, T.rec); T.savedOk = ok !== false; paintSave(T.savedOk ? "All changes saved" : "⚠ Not saved. Check your connection."); }, 900);
}
function paintSave(t){ const el = document.getElementById("trSave"); if(el) el.textContent = saves() ? t : "Test copy — nothing here is saved."; }

/* ---------- the checks: what a careful VA hands in ---------- */
function checks(n){
  const r = run(n), f = r.f || {};
  const filled = FIELDS.filter(([k]) => has(f[k])).length;
  const acts = String(f.actions || "").split("\n").filter(x => x.trim().length > 3).length;
  const first = firstName().toLowerCase(), file = String(r.file || "").trim();
  const rep = String(r.report || "");
  return [
    ["Every part of the minutes filled in", filled === FIELDS.length, `${filled} of ${FIELDS.length}`],
    ["The discussion in detail (200 words or more)", words(f.discussion) >= 200, `${words(f.discussion)} words`],
    ["Timestamps at the points discussed (3 or more)", stamps(f.discussion) >= 3, `${stamps(f.discussion)} timestamps`],
    ["Action items, one per line (2 or more)", acts >= 2, `${acts}`],
    ["The file named by the convention", new RegExp(`^Transcription - Recording ${n} \\([^()]+\\)$`).test(file) && (!first || file.toLowerCase().includes("(" + first + ")")), fileWant(n)],
    ["Filed in your Assessments/Activities folder (its Drive link)", isDriveLink(r.link), ""],
    ["Reported back to the attorney: greeting, what’s done, where it is, thanks", /\b(hi|hello|good (morning|afternoon|day|evening)|dear)\b/i.test(rep) && /minutes|transcri/i.test(rep) && (isDriveLink((rep.match(/https?:\/\/\S+/) || [""])[0]) || /assessments|folder|drive/i.test(rep)) && /thank|regards/i.test(rep), ""]
  ];
}
const pctOf = cs => Math.round(cs.filter(c => c[1]).length / cs.length * 100);

// the steps and the checks follow the typing, without redrawing the fields being typed in
let liveT = null;
function live(){
  clearTimeout(liveT);
  liveT = setTimeout(() => {
    const n = T.n, cs = checks(n), pct = pctOf(cs), t = document.createElement("template");
    t.innerHTML = stepper(n); const st = document.querySelector(".tr-steps"); if(st && t.content.firstElementChild) st.replaceWith(t.content.firstElementChild);
    const ul = document.querySelector(".tr-checks ul"); if(ul) ul.innerHTML = cs.map(c => `<li class="${c[1] ? "ok" : "miss"}">${c[1] ? "✓" : "○"} ${e(c[0])}${c[2] ? `<small>${e(c[2])}</small>` : ""}</li>`).join("");
    const p = document.querySelector(".tr-checks .tr-pct"); if(p){ p.textContent = pct + "%"; p.className = "tr-pct " + (pct >= 80 ? "ok" : "mid"); }
  }, 350);
}

/* ---------- the stopwatch the trainee runs alongside the recording ---------- */
const swMs = () => T.sw.acc + (T.sw.on ? Date.now() - T.sw.at : 0);
const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function paintSw(){ const el = document.getElementById("trSw"); if(el) el.textContent = fmt(swMs()); const b = document.getElementById("trSwGo"); if(b) b.textContent = T.sw.on ? "⏸ Pause" : "▶ Start"; }
function insertStamp(){
  const ta = document.getElementById("tr-discussion"); if(!ta || ta.disabled) return;
  const s = `[${fmt(swMs())}] `, a = ta.selectionStart || 0, b = ta.selectionEnd || 0;
  const pre = ta.value.slice(0, a), lead = pre && !/\n$/.test(pre) ? "\n" : "";
  ta.value = pre + lead + s + ta.value.slice(b);
  const at = a + lead.length + s.length; ta.focus(); ta.setSelectionRange(at, at);
  window.FTTranscribe.set("discussion", ta.value);
}
document.addEventListener("keydown", ev => {
  if(state.view !== "transcribe") return;
  if(ev.altKey && (ev.key === "t" || ev.key === "T")){ ev.preventDefault(); insertStamp(); }
});

/* ---------- the Word file ---------- */
function docHtml(n){
  const r = run(n), f = r.f || {}, nl = s => e(s).replace(/\n/g, "<br>");
  const row = (k, v) => `<tr><td style="width:30%;border:1px solid #999;padding:6px;font-weight:bold;background:#F2F2F2">${k}</td><td style="border:1px solid #999;padding:6px">${nl(v)}</td></tr>`;
  const sec = (h, v) => `<h3 style="font-family:Calibri,Arial;color:#262B45;margin:16pt 0 4pt">${h}</h3><p style="font-family:Calibri,Arial;font-size:11pt;line-height:1.4">${nl(v)}</p>`;
  return `<html><head><meta charset="utf-8"><title>${e(r.file || fileWant(n))}</title></head><body style="font-family:Calibri,Arial">
    <h1 style="text-align:center;color:#262B45;font-size:18pt;margin:0 0 4pt">MINUTES OF THE MEETING</h1>
    <p style="text-align:center;margin:0 0 12pt;color:#555">Client-to-Attorney Interview · ${e(RECS[n].title)}</p>
    <table style="border-collapse:collapse;width:100%;font-size:11pt">${row("Date", f.date)}${row("Time", f.time)}${row("Attendees", f.attendees)}${row("Purpose", f.purpose)}</table>
    ${sec("Discussion", f.discussion)}${sec("The client’s concerns and questions", f.concerns)}${sec("The attorney’s advice and answers", f.advice)}${sec("Action items and next steps", f.actions)}
    <p style="margin-top:18pt;font-size:11pt">Prepared by: ${e(state.certName || state.traineeName || "")}</p></body></html>`;
}

/* ---------- 📘 the PI equivalent sample guide and the metrics (js/ft-intake.js fills .ftis-consult) ---------- */
function guide(){
  const rb = window.FT_RUBRICS && FT_RUBRICS.forAct({id: "transcription-" + T.n});
  return `<details class="card tr-guide"><summary>📘 Sample guide first: a PI consultation with ${ATTY} (A = Attorney, C = Client), its transcript and the sample minutes</summary>
      <p class="tr-muted">Listen, read the A / C transcript, then compare the sample minutes with what you would have written. Your own minutes are scored the same way.</p>
      ${window.FTIntake ? `<div class="ftis-consult"></div>` : ""}
      <details class="tr-sample" open><summary>📄 The firm’s Sample Minutes of the Meeting, the format to follow</summary>
        <div class="tr-sample-f"><iframe src="https://drive.google.com/file/d/${SAMPLE}/preview" title="Sample Minutes of the Meeting" loading="lazy"></iframe></div></details>
      ${rb ? `<div class="tr-metrics"><b>📋 How your minutes are scored</b> <span class="tr-muted">each criterion 0–5 · accuracy and completeness count double · the weighted average is your score</span>
        <ol>${rb.criteria.map(c => `<li>${e(c.n)}</li>`).join("")}</ol>${rb.time ? `<p class="tr-muted">⏱ ${e(rb.time)}</p>` : ""}</div>` : ""}</details>`;
}

/* ---------- the page ---------- */
const STEPS = [["📨", "The request"], ["🎧", "Listen"], ["📝", "Draft the minutes"], ["🏷", "Name & file it"], ["💬", "Report back"], ["📤", "Submit"]];
function stepper(n){
  const r = run(n), f = r.f || {}, cs = checks(n);
  const doneAt = [true, !!r.startedAt, cs[0][1] && cs[1][1], cs[4][1] && cs[5][1], cs[6][1], !!r.submittedAt];
  return `<ol class="tr-steps">${STEPS.map(([ic, t], i) => `<li class="${doneAt[i] ? "done" : ""}"><span class="tr-step-ic">${doneAt[i] ? "✓" : ic}</span><span>${t}</span></li>`).join("")}</ol>`;
}
function field([k, label, type, ph], f, ro){
  const v = f[k] || "", dis = ro ? "disabled" : "";
  if(type === "area") return `<label class="tr-f tr-wide"><span>${e(label)}</span><textarea id="tr-${k}" rows="${k === "discussion" ? 10 : 3}" placeholder="${e(ph || "")}" ${dis} oninput="FTTranscribe.set('${k}', this.value)">${e(v)}</textarea>
    ${k === "discussion" ? `<small class="tr-count">${words(v)} words · ${stamps(v)} timestamps</small>` : ""}</label>`;
  return `<label class="tr-f"><span>${e(label)}</span><input id="tr-${k}" type="${type}" value="${e(v)}" placeholder="${e(ph || "")}" ${dis} oninput="FTTranscribe.set('${k}', this.value)"></label>`;
}
function renderTrainee(){
  if(saves()){ load(); if(!T.rec || T.id !== state.traineeId) return `<div class="card" style="padding:24px;">Loading your Transcription Activity…</div>`; }
  else load();
  const n = T.n, r = run(n), f = r.f || {}, ro = !!r.submittedAt, cs = checks(n), pct = pctOf(cs);
  const first = firstName() || "there";
  const tabs = [1, 2].map(k => { const x = T.rec.r[k] || {}; const st = x.submittedAt ? "✓ Submitted" : x.startedAt ? "In progress" : "Not started";
    return `<button type="button" class="tr-tab${k === n ? " on" : ""}" onclick="FTTranscribe.tab(${k})">🎧 Recording ${k}<small>${st}</small></button>`; }).join("");
  return `${!saves() ? `<div class="card tr-copy">👁 ${state.adminPreview ? "Trainee view" : "Test copy"} — this is the page as a trainee sees it. Nothing you type here is saved.</div>` : ""}
    <div class="tr-hero"><p class="tr-eyebrow">🧰 Drafting Tools · Day 9 · Intake Training</p><h1>🎧 Transcription Activity</h1>
      <p>A generalist VA’s everyday assignment, done the way it happens on the job: the attorney asks, you listen, you write the minutes, you name and file them, and you report back.</p>
      <div class="tr-tabs">${tabs}</div></div>
    ${stepper(n)}
    <div class="tr-mail card"><div class="tr-mail-h"><span class="tr-av">M</span><div><b>${ATTY}</b><small>to you · Minutes for my client interview (Recording ${n})</small></div><span class="tr-due">Today</span></div>
      <p>Hi ${e(first)},</p>
      <p>Please prepare the <b>minutes of my meeting with the client</b> from the attached recording (<b>${e(RECS[n].title)}</b>). Capture the discussion as thoroughly as you can — what the client told me, their concerns, what I advised, and the next steps — so I can rely on them without listening again.</p>
      <p>Save the minutes as a Word document named <b>${e(fileWant(n))}</b> in your <b>Assessments/Activities</b> folder, and let me know once they are there.</p>
      <p>Thank you!<br>${ATTY}</p>
      <div class="tr-attach"><span>📎</span><b>${e(RECS[n].title)}</b><small>Recording · Google Drive</small></div></div>
    ${guide()}
    <div class="tr-work">
      <aside class="card tr-side"><h3>🎧 Listen</h3>
        ${r.startedAt ? `<div class="tr-player"><iframe src="https://drive.google.com/file/d/${RECS[n].id}/preview" allow="autoplay" title="${e(RECS[n].title)}"></iframe></div>
          <a class="tr-open" href="${DRIVE(RECS[n].id)}" target="_blank" rel="noopener noreferrer">Open the recording in a new tab ↗</a>
          <div class="tr-sw"><span class="tr-sw-l">⏱ Your stopwatch, kept with the recording</span><b id="trSw">${fmt(swMs())}</b>
            <div class="tr-sw-b"><button type="button" class="btn btn-navy btn-sm" id="trSwGo" onclick="FTTranscribe.sw()">${T.sw.on ? "⏸ Pause" : "▶ Start"}</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="FTTranscribe.swReset()">↺ Reset</button>
              <button type="button" class="btn btn-ghost btn-sm" ${ro ? "disabled" : ""} onclick="FTTranscribe.stamp()">⌨ Insert [m:ss]</button></div>
            <small>Start it when you press play and pause it with the recording. <b>Alt+T</b> puts the time in the discussion.</small></div>`
          : `<div class="tr-start"><p>When you’re ready, open the recording. The time you take is part of the activity: speed and accuracy both count.</p>
             <button type="button" class="btn btn-navy" onclick="FTTranscribe.start()">▶ Open the recording and start</button></div>`}
        <h3>📄 Reference</h3>
        <a class="viewer-link tr-ref" data-kind="doc" data-title="Sample Minutes of the Meeting" href="${DRIVE(SAMPLE)}">📄 Sample Minutes of the Meeting</a>
        <ul class="tr-tips"><li>Listen once through first, then again to type.</li><li>Names, dates, amounts and places exactly as said — replay to be sure.</li><li>Write it so the attorney never has to listen again.</li></ul></aside>
      <section class="card tr-doc"><div class="tr-page"><p class="tr-page-h">MINUTES OF THE MEETING</p><p class="tr-page-sub">Client-to-Attorney Interview · ${e(RECS[n].title)}</p>
        <div class="tr-grid">${FIELDS.map(x => field(x, f, ro || !r.startedAt)).join("")}</div>
        <p class="tr-prep">Prepared by: <b>${e(state.certName || state.traineeName || "you")}</b></p></div></section>
    </div>
    <div class="tr-finish">
      <section class="card tr-box"><h3>🏷 Name &amp; file it</h3>
        <label class="tr-f"><span>File name</span><input id="tr-file" value="${e(r.file || "")}" placeholder="${e(fileWant(n))}" ${ro ? "disabled" : ""} oninput="FTTranscribe.setRun('file', this.value)"></label>
        <button type="button" class="btn btn-ghost btn-sm" onclick="FTTranscribe.download()">⬇ Download as Word</button>
        <label class="tr-f"><span>The file’s link in your Assessments/Activities folder</span><input id="tr-link" value="${e(r.link || "")}" placeholder="https://docs.google.com/document/d/…" ${ro ? "disabled" : ""} oninput="FTTranscribe.setRun('link', this.value)"></label></section>
      <section class="card tr-box"><h3>💬 Report back to ${ATTY}</h3>
        <textarea id="tr-report" rows="5" placeholder="Hi Atty. Magdalena, …" ${ro ? "disabled" : ""} oninput="FTTranscribe.setRun('report', this.value)">${e(r.report || "")}</textarea>
        <small class="tr-muted">As you would in the GC or by e-mail: what is done, where it is (the link), and a thank-you.</small></section>
      <section class="card tr-box tr-checks"><h3>✅ Before you submit <span class="tr-pct ${pct >= 80 ? "ok" : "mid"}">${pct}%</span></h3>
        <ul>${cs.map(c => `<li class="${c[1] ? "ok" : "miss"}">${c[1] ? "✓" : "○"} ${e(c[0])}${c[2] ? `<small>${e(c[2])}</small>` : ""}</li>`).join("")}</ul>
        ${r.submittedAt ? `<p class="tr-sub">📤 Submitted ${e(new Date(r.submittedAt).toLocaleString())} · ${r.minutes || 1} min</p>${r.ai ? `<div class="tr-ai"><b>🤖 Facilitator-style evaluation</b><p>${r.ai.pending ? "Writing your evaluation…" : e(r.ai.summary || r.ai.error || "")}</p></div>` : ""}
            <button type="button" class="btn btn-ghost btn-sm" onclick="FTTranscribe.redo()">🔁 Revise and resubmit</button>`
          : `<button type="button" class="btn btn-navy" id="trSubmit" ${r.startedAt ? "" : "disabled"} onclick="FTTranscribe.submit()">📤 Submit to your trainer</button>`}
        <p class="tr-muted" id="trSave">${saves() ? (r.updatedAt ? "All changes saved" : "") : "Test copy — nothing here is saved."}</p></section>
    </div>`;
}

/* ---------- 🧑‍🏫 the trainer: every trainee's minutes ---------- */
async function loadAdmin(){
  T.admin = {rows: null};
  try{
    const ids = ((await sharedList("trainee:")) || []).map(k => String(k).replace(/^trainee:/, ""));
    const get = window.ftGetMany || sharedGetMany;
    const people = await get(ids.map(id => "trainee:" + id));
    const rows = ids.map((id, i) => ({id, p: people[i] || {}})).filter(x => x.p.approved && !x.p.archived);
    const recs = await get(rows.map(x => "transcribe:" + x.id));
    rows.forEach((x, i) => { x.t = recs[i] || null; });
    T.admin.rows = rows.sort((a, b) => String(a.p.name || "").localeCompare(String(b.p.name || "")));
  }catch(err){ T.admin.rows = []; }
  if(state.view === "transcribe") render();
}
function renderAdmin(){
  if(!T.admin) loadAdmin();
  const rows = (T.admin && T.admin.rows) || null;
  const cell = (x, n) => { const r = x.t && x.t.r && x.t.r[n]; if(!r || !r.startedAt) return `<td class="tr-muted">—</td>`;
    return `<td>${r.submittedAt ? "📤 " : "✏️ "}${words((r.f || {}).discussion)} words${r.submittedAt ? ` · ${r.minutes || 1} min` : ""}
      <details><summary>Read</summary><div class="tr-read">${FIELDS.map(([k, l]) => `<p><b>${e(l)}</b><br>${e((r.f || {})[k] || "—").replace(/\n/g, "<br>")}</p>`).join("")}
      <p><b>File</b><br>${e(r.file || "—")}${isDriveLink(r.link) ? ` · <a href="${e(r.link)}" target="_blank" rel="noopener noreferrer">open ↗</a>` : ""}</p><p><b>Report</b><br>${e(r.report || "—").replace(/\n/g, "<br>")}</p>
      ${r.ai && r.ai.summary ? `<p><b>🤖 Evaluation</b><br>${e(r.ai.summary)}</p>` : ""}</div></details></td>`; };
  return `<section class="card tr-admin"><h2>🧑‍🏫 Trainees’ minutes</h2>
      <p class="tr-muted">Read each trainee’s minutes and report here; record the score in Admin → 🧑‍🏫 Trainer Inputs (<i>Minutes Transcription: Recording 1 / 2</i>), which reaches the Scorecard.</p>
      ${!rows ? `<p>Loading…</p>` : !rows.length ? `<p class="tr-muted">No approved trainees yet.</p>` : `<table class="tr-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Recording 1</th><th>Recording 2</th></tr></thead>
      <tbody>${rows.map(x => `<tr><td>${e(x.p.name || x.id)}</td><td>${e(x.p.batch || "")}</td>${cell(x, 1)}${cell(x, 2)}</tr>`).join("")}</tbody></table>`}
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTTranscribe.reloadAdmin()">↻ Refresh</button></section>
    <h2 class="tr-copy-h">Your test copy</h2>`;
}

window.FTTranscribe = {
  tab(n){ T.n = Number(n) === 2 ? 2 : 1; render(); },
  // from Day 9's deck: straight to that recording's assignment (and back to the deck's next slide)
  openRec(n){ T.n = Number(n) === 2 ? 2 : 1; FTTranscribe.fromDeck(); },
  // opened from a deck slide (Day 9's Sample Transcription Guide, a recording's tile): the activity, then ← back to the
  // deck on the slide after that one
  fromDeck(){
    const d = window.FTDayDecks && FTDayDecks.state && FTDayDecks.state();
    const i = (Number(d && d.i) || 0) + 1, nx = d && d.day != null && FTDayDecks.list ? (FTDayDecks.list(d.day) || [])[i] : null;
    T.ret = d && d.day != null && state.view === "daydeck" ? {day: d.day, i, h: nx ? String(nx.h || "").replace(/^(AM|PM|Entire Day):\s*/, "") : ""} : null;
    goto("transcribe");
  },
  toDeck(){ const r = T.ret; T.ret = null; if(r && window.FTDayDecks) FTDayDecks.open(r.day, r.i); else goto("simulators"); },
  start(){ const r = run(T.n); if(!r.startedAt){ r.startedAt = new Date().toISOString(); save(); } render(); },
  set(k, v){ const r = run(T.n); if(r.submittedAt) return; r.f[k] = v; r.updatedAt = new Date().toISOString(); save();
    if(k === "discussion"){ const c = document.querySelector("#tr-discussion + .tr-count"); if(c) c.textContent = `${words(v)} words · ${stamps(v)} timestamps`; }
    live(); },
  setRun(k, v){ const r = run(T.n); if(r.submittedAt) return; r[k] = v; r.updatedAt = new Date().toISOString(); save(); live(); },
  sw(){ if(T.sw.on){ T.sw.acc += Date.now() - T.sw.at; T.sw.on = false; } else { T.sw.at = Date.now(); T.sw.on = true; } paintSw(); },
  swReset(){ T.sw = {acc: 0, at: 0, on: false}; paintSw(); },
  stamp: insertStamp,
  download(){
    const n = T.n, r = run(n), name = String(r.file || fileWant(n)).replace(/[\\/:*?"<>|]/g, "").trim() || fileWant(n);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿", docHtml(n)], {type: "application/msword"}));
    a.download = name + ".doc"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  redo(){ const r = run(T.n); delete r.submittedAt; delete r.ai; save(); render(); },
  async submit(){
    if(T.busy) return;
    const n = T.n, r = run(n), cs = checks(n), pct = pctOf(cs);
    if(!r.startedAt){ toast("Open the recording and start first."); return; }
    if(pct < 50 && !confirm(`Only ${pct}% of the checks pass. Submit anyway?`)) return;
    T.busy = true;
    r.submittedAt = new Date().toISOString();
    r.minutes = Math.max(1, Math.round((new Date(r.submittedAt) - new Date(r.startedAt)) / 60000));
    r.checks = cs.map(c => ({label: c[0], ok: !!c[1]})); r.pct = pct; r.ai = {pending: true};
    save(); render();
    try{
      const f = r.f || {};
      const prompt = `You are the training facilitator of Legal Support Help evaluating a trainee Legal VA's Transcription Activity: the minutes of a client-to-attorney interview (${RECS[n].title}) for ${ATTY}, then filing them and reporting back. They took ${r.minutes} minutes. You have not heard the recording: judge only what the minutes show — structure, completeness, clarity, professional wording, timestamps, usable action items — and the file name and report-back.
THE MINUTES:
${FIELDS.map(([k, l]) => `${l}: ${String(f[k] || "(empty)").slice(0, 2500)}`).join("\n")}
File name: ${r.file || "(none)"} (the convention: ${fileWant(n)})
Report to the attorney: ${r.report || "(none)"}
The automated checks (${pct}%): ${cs.map(c => `${c[1] ? "PASS" : "MISS"} ${c[0]}`).join("; ")}

The minutes are scored on these metrics: ${((window.FT_RUBRICS && FT_RUBRICS.forAct({id: "transcription-" + n})) || {criteria: []}).criteria.map(c => c.n).join("; ")}. Name the weakest of them.

Write the evaluation the way the facilitator writes it (her feedback DNA, below): a verdict label, then "Demonstrated … understanding of …" naming what was done well, then "However, improvement is needed in …" naming each gap, then the habit that prevents it. 3-5 sentences, third person.

FACILITATOR'S FEEDBACK DNA:
${String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"summary":"..."}`;
      const out = await callAIJson(prompt, 900, undefined, "grading");
      r.ai = {summary: String((out && out.summary) || "").slice(0, 2000), at: new Date().toISOString()};
    }catch(err){ r.ai = {error: "The AI evaluation isn’t available right now. Your checks and your trainer’s review still count."}; }
    T.busy = false; save(); render();
    toast(`📤 Submitted to your trainer · ${pct}% on the checks`);
  },
  reloadAdmin(){ T.admin = null; render(); },
  checks, docHtml, fields: FIELDS
};

// 🧰 Drafting Tools in the Practice Lab
window.ftTranscribeCard = function(){
  const open = state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(6) : true);
  const dayT = window.FTDays ? FTDays.label(FTDays.forTool("transcribe")) : "Day 9";
  return `<div class="card fts-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">${e(dayT)} · Intake Training${open ? "" : " · opens with this lesson"}</div>
    <h3>🎧 Transcription Activity</h3>
    <p class="fts-note">A generalist VA’s real assignment: ${ATTY} asks for the minutes of her client interview. Listen to the recording, write the minutes, name and file them, and report back.</p>
    <div class="fts-label">In this tool</div><ul class="fts-tpl"><li>Interview Recording 1</li><li>Interview Recording 2</li></ul>
    <div class="fts-tool-act">${open ? `<button class="btn btn-navy btn-sm" type="button" onclick="goto('transcribe')">Open the activity</button>` : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
};

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["transcribe"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {transcribe: "Transcription Activity"});
const __render = window.render;
window.render = function(){
  if(state.view !== "transcribe") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  // (opened from a deck, FTTranscribe.fromDeck: back to that deck, on the slide after the one it was opened from)
  const back = T.ret ? `<a class="back-link" onclick="FTTranscribe.toDeck()">&larr; Back to the deck${T.ret.h ? ": " + e(T.ret.h) : ""}</a>`
    : `<a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>`;
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-tr">${back}${adminOn() ? renderAdmin() : ""}${renderTrainee()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  clearInterval(T.tick); T.tick = setInterval(() => { if(state.view !== "transcribe"){ clearInterval(T.tick); T.tick = null; return; } if(T.sw.on) paintSw(); }, 500);
};

(function(){ const s = document.createElement("style"); s.id = "ft-transcribe"; s.textContent = `
main.main-tr{max-width:1240px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.tr-copy{padding:10px 14px;background:#FFF8EF;border:1px dashed #DB8437;font-size:14px;}
.tr-hero{background:#262B45;color:#fff;border-radius:18px;padding:18px 24px;position:relative;overflow:hidden;}
.tr-hero::after{content:"";position:absolute;top:0;right:0;width:min(260px,28%);height:70px;border-radius:0 18px 0 100%;background:#DB8437;}
.tr-hero > *{position:relative;z-index:1;}
.tr-eyebrow{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#F4B77A;}
.tr-hero h1{margin:0 0 6px;font:800 28px/1.15 'Poppins','Inter',sans-serif;color:#fff;}
.tr-hero p{margin:0;color:#DDE2EE;max-width:80ch;}
.tr-tabs{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.tr-tab{display:flex;flex-direction:column;align-items:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:12px;padding:8px 16px;cursor:pointer;font:700 14.5px 'Inter',sans-serif;}
.tr-tab small{font-weight:500;font-size:12px;color:#C9CFDD;}
.tr-tab.on{background:#DB8437;border-color:#DB8437;} .tr-tab.on small{color:#fff;}
.tr-steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;}
.tr-steps li{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:8px 10px;font-size:13px;font-weight:700;color:#262B45;}
.tr-step-ic{flex:0 0 auto;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#FBF1E6;font-size:15px;}
.tr-steps li.done{border-color:#BFE3CE;background:#F3FAF6;} .tr-steps li.done .tr-step-ic{background:#2E7D4F;color:#fff;font-weight:800;}
.tr-mail{padding:16px 20px;border-left:5px solid #DB8437;}
.tr-mail-h{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.tr-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#262B45;color:#fff;font-weight:800;}
.tr-mail-h b{display:block;color:#262B45;} .tr-mail-h small{color:var(--ink-soft);}
.tr-due{margin-left:auto;background:#FFF1E2;color:#B5651F;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:800;}
.tr-mail p{margin:6px 0;font-size:15px;line-height:1.55;}
.tr-attach{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;border:1px solid var(--line,#e5e7eb);border-radius:10px;background:#F6F7FB;}
.tr-attach small{color:var(--ink-soft);}
.tr-work{display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:14px;align-items:start;}
.tr-side{padding:14px 16px;position:sticky;top:12px;}
.tr-side h3, .tr-box h3{margin:0 0 8px;color:#262B45;font-size:16px;display:flex;align-items:center;gap:8px;}
.tr-side h3 + *{margin-top:0;} .tr-side h3:not(:first-child){margin-top:14px;}
.tr-player{position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#161829;}
.tr-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.tr-open{display:inline-block;margin:6px 0 0;font-size:12.5px;color:#B5651F;}
.tr-sw{margin-top:10px;padding:10px 12px;border-radius:12px;background:#F6F7FB;display:flex;flex-direction:column;gap:6px;}
.tr-sw-l{font-size:12px;font-weight:700;color:var(--ink-soft);}
#trSw{font:800 26px/1 'IBM Plex Mono',ui-monospace,monospace;color:#262B45;}
.tr-sw small b{font-weight:800;color:#262B45;}
.tr-sw-b{display:flex;gap:6px;flex-wrap:wrap;} .tr-sw small{color:var(--ink-soft);font-size:12px;}
.tr-start{padding:14px;border:2px dashed #DB8437;border-radius:12px;background:#FFF8EF;text-align:center;}
.tr-start p{margin:0 0 10px;font-size:14px;}
a.tr-ref{display:block;padding:10px 12px;border-radius:10px;background:#EAF1FF;color:#262B45;font-weight:700;text-decoration:none;}
.tr-tips{margin:10px 0 0;padding-left:18px;font-size:13px;color:var(--ink-soft);}
.tr-doc{padding:16px;background:#E9ECF2;}
.tr-page{background:#fff;border-radius:6px;box-shadow:0 2px 10px rgba(22,24,41,.12);padding:28px 34px;max-width:860px;margin:0 auto;}
.tr-page-h{margin:0;text-align:center;font:800 20px 'Poppins','Inter',sans-serif;color:#262B45;letter-spacing:.04em;}
.tr-page-sub{margin:2px 0 16px;text-align:center;color:var(--ink-soft);font-size:13px;}
.tr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;}
.tr-f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:#262B45;}
.tr-f.tr-wide{grid-column:1 / -1;}
.tr-f input, .tr-f textarea, .tr-box textarea{font:400 14.5px/1.5 'Inter',sans-serif;border:1px solid #CBD2DF;border-radius:8px;padding:8px 10px;background:#fff;width:100%;box-sizing:border-box;}
.tr-f textarea{resize:vertical;}
.tr-f input:focus, .tr-f textarea:focus, .tr-box textarea:focus{outline:2px solid #F4B77A;border-color:#DB8437;}
.tr-count{font-weight:600;color:var(--ink-soft);}
.tr-prep{margin:16px 0 0;font-size:13.5px;color:var(--ink-soft);}
.tr-finish{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start;}
.tr-box{padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
.tr-muted{color:var(--ink-soft);font-size:12.5px;margin:0;}
.tr-checks ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;}
.tr-checks li{font-size:13.5px;padding:6px 10px;border-radius:8px;background:#F6F7FB;}
.tr-checks li.ok{background:#EEF8F2;color:#1F5B39;} .tr-checks li small{display:block;color:var(--ink-soft);font-size:12px;margin-left:18px;}
.tr-pct{margin-left:auto;border-radius:999px;padding:2px 10px;font-size:13px;} .tr-pct.ok{background:#EEF8F2;color:#1F5B39;} .tr-pct.mid{background:#FFF1E2;color:#B5651F;}
.tr-sub{margin:0;font-weight:700;color:#1F5B39;font-size:13.5px;}
.tr-ai{background:#F6F7FB;border-radius:10px;padding:10px 12px;font-size:13.5px;} .tr-ai p{margin:4px 0 0;}
.tr-admin{padding:16px 18px;} .tr-admin h2{margin:0 0 4px;color:#262B45;}
.tr-tbl{width:100%;border-collapse:collapse;margin:10px 0;font-size:13.5px;} .tr-tbl th, .tr-tbl td{border-bottom:1px solid var(--line,#e5e7eb);padding:8px;text-align:left;vertical-align:top;}
.tr-read{max-height:320px;overflow:auto;background:#F6F7FB;border-radius:8px;padding:8px 10px;margin-top:6px;} .tr-read p{margin:0 0 8px;}
.tr-copy-h{margin:8px 0 0;color:#262B45;font-size:18px;}
.tr-guide{padding:12px 18px;} .tr-sample{margin-top:10px;} .tr-sample > summary{cursor:pointer;font-weight:700;color:#262B45;font-size:14px;}
.tr-sample-f{height:min(70vh,640px);margin-top:6px;border:1px solid #CBD2DF;border-radius:10px;overflow:hidden;background:#F6F7FB;} .tr-sample-f iframe{width:100%;height:100%;border:0;background:#fff;} .tr-guide > summary{cursor:pointer;font-weight:800;color:#262B45;font-size:15px;} .tr-guide[open] > summary{margin-bottom:8px;}
.tr-metrics{margin-top:10px;padding:10px 14px;background:#F6F7FB;border-radius:10px;font-size:14px;} .tr-metrics ol{margin:6px 0 0;padding-left:20px;columns:2;column-gap:28px;}
@media(max-width:700px){.tr-metrics ol{columns:1;}}
@media(max-width:1000px){.tr-work, .tr-finish{grid-template-columns:minmax(0,1fr);} .tr-side{position:static;} .tr-steps{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media(max-width:600px){.tr-grid{grid-template-columns:minmax(0,1fr);} .tr-page{padding:18px;} .tr-steps{grid-template-columns:repeat(2,minmax(0,1fr));}}
`; document.head.appendChild(s); })();
})();
