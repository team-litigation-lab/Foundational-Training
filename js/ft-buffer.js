/* ============================================================
   ✅ Buffer time, mock calls and demos: the trainee's Done, the trainer's live tracker
   Loaded after js/ft-day-decks.js. A buffer, mock call or demo slide of the Activity decks (ACTS below) carries, for a
   trainee, what to do while they wait and a ✅ Done button; for the trainer, the batch's live tracker in its place.
     • Buffer time: "Use this buffer to finish all your pending tasks. Hit Done when you are."
     • A mock call or a demo: Practice Buffer (practise on the Call Simulator, log in to the Ring Channel, wait on standby
       for the trainer's call); Done only after the 1-on-1 with the trainer, confirmed in a dialog. Done turns the slide
       into Screen 2, Debrief Prep: the activity's scorecard, which the trainer is filling in, while the others finish.
     • The trainer (Admin, not 👁 Trainee view) sees the tracker on the same slide: Completed X / N trainees, a progress
       bar, each trainee Waiting or Done (with the time), Mark done / Revert, and 📋 Score, which opens the trainee's
       scorecard in Admin → 🧑‍🏫 Trainer Inputs (the scores and comment go to the trainee's progress, as every Trainer
       Input does). Once every trainee is done, a banner says so and Start Group Debrief (Unlock the next activity, on
       a buffer) releases the batch: each trainee's slide moves on to the next activity by itself.
   buffer:<trainee id> = {acts: {"<day>:<slide id>": {done: ISO, by: "trainee"|"trainer"}}, released: {"<day>:<slide id>": ISO}}
     the trainee marks their own Done (worker.js stamps the server's time and keeps the rest); the trainer marks, reverts
     and releases. Where Activity Locks are in (js/ft-day-locks.js, settings:daysteps), the release also unlocks the
     batch's next step of the day.
   Polling, sparingly: a trainee who is done checks for the release every 20 s while the slide is on screen; the trainer's
   tracker reads the batch every 15 s while it is on screen. Nothing runs anywhere else.
   ============================================================ */
(function(){
const root = window;
// the slides that get a screen, by "<day>:<slide id>" (js/ft-day-decks-data.js); act: the activity in 🧑‍🏫 Trainer Inputs
const ACTS = {
  // a set of tasks that ends on Done, as a buffer does (the trainer's tracker and release the same), on the slide's own content
  // (Day 2's Common Terms tasks end on the Personal Injury Readings, s2b, after the Auto Liability Insurance – Assessment,
  // which the Auto Liability video's Next opens: their Done is there, under the key it was saved under when the tasks were
  // one slide. submit: the Done is 📤 Submit, which has the platform check and grade the Monitoring Sheet's items #5–7
  // first, /api/monitor/items: Timely Completion, the context of the progress, red flags and things to improve. gate: the
  // trainee sees only the panel until then, and reads the slide's own content, the readings, while the batch finishes.
  // opens: a slide that stays shut for a trainee until this Done is in, the Softphones and PPTs)
  "2:s2b": {kind: "buffer", task: true, gate: true, key: "2:s2", title: "📒 Update items #5–7 in your Monitoring Sheet", lead: "Once done, hit Submit.",
    submit: {items: [5, 6, 7], activity: "Common Terms Used & Auto Liability Insurance"}, opens: "s4"},
  // Day 4's Monitoring Sheet update after Julio's video: Day 2's panel and 📤 Submit, on a slide of its own (items #10–11)
  "4:s2m": {kind: "buffer", task: true, gate: true, title: "📒 Update items #10–11 in your Monitoring Sheet", lead: "Once done, hit Submit.",
    submit: {items: [10, 11], activity: "Reception Training with Julio"}},
  // (show: the trainee reads the slide's own content above the panel, here the Reception mock calls' preparation for whoever
  // still has their one-on-one to do; a plain buffer shows the trainee only its panel)
  "5:s1": {kind: "buffer", show: true},
  // Day 5's Attorney Calendar Management Activity: "signify done" is its Done, at the end of its slides (s3, its text; s3b)
  // (its panel as Day 2's: what to do, "Once done, hit Submit." and 📤 Submit, which counts as the Done; label: the button)
  "5:s3b": {kind: "buffer", task: true, key: "5:s3", title: "📸 Upload your 19 screenshots", lead: "Once done, hit Submit.", label: "📤 Submit"},
  "9:s1": {kind: "buffer"},
  "13:s1": {kind: "buffer"},
  // (wait: while the mock calls run, the trainee's screen is only ⏳ Buffer Time and Done, as a buffer's is; after Done, the
  // mock call's Debrief Prep as any other's)
  "4:s3": {kind: "mock", name: "Reception", line: "Reception Mock Calls", act: "reception-live", when: "this afternoon", wait: true},
  // (key: where a day's guide section was cut into one slide per card row, build/day-decks.cjs ROWS, the activity moved to
  // its own slide; its records keep the key they were saved under)
  "6:s1b": {kind: "mock", name: "Calendar Management", line: "Calendar Management Mock Calls", act: "calendar-live", when: "today", key: "6:s1"},
  "9:s3b": {kind: "mock", name: "Intake", line: "Intake Mock Calls", act: "intake-live", when: "this afternoon", key: "9:s3"},
  "8:s3": {kind: "demo", name: "Saving the Intake Packet and Extracted Intake Documents", act: "intake-packet-demo"},
  "12:s1d": {kind: "demo", name: "Uploading and Sending 1P & 3P LORs", act: "lor-demo", rec: true, key: "12:s1"},
  "14:s1e": {kind: "demo", name: "Sending MedLOR and Requesting Medical Bills & Records", act: "medlor-demo", rec: true, key: "14:s1"},
  "15:s1b": {kind: "demo", name: "Sending MedLOR and Requesting Medical Bills & Records", act: "medlor-demo", rec: true, key: "15:s1"},
  "16:s2": {kind: "demo", name: "LV (Lien Verification) Request", act: "lv-demo"}
};
const SIM = "https://cm-training-activity.pages.dev/simulators/call.html?";
const RING = SIM + "program=FT";
const callSim = line => SIM + new URLSearchParams({program: "FT", line});
const e = v => esc(String(v == null ? "" : v));
const isAdminView = () => !!state.isAdmin && !state.adminPreview;
const trainee = () => !!state.traineeId && !state.isAdmin && !state.adminPreview;
const what = a => a.kind === "mock" ? "mock call" : a.kind === "demo" ? "demo" : "buffer";
const tm = iso => { const d = new Date(iso); return isFinite(d) ? d.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"}) : ""; };

// the activity on screen: {day, id, k, a, i} or null
function here(){
  if(state.view !== "daydeck" || !root.FTDayDecks) return null;
  const st = FTDayDecks.state(), s = (FTDayDecks.list(st.day) || [])[st.i]; if(!s) return null;
  const sk = `${st.day}:${s.id}`; return ACTS[sk] ? {day: Number(st.day), id: s.id, k: ACTS[sk].key || sk, a: ACTS[sk], i: st.i} : null;
}

/* ---------- the trainee ---------- */
const M = {rec: null, at: 0, loading: false, timer: null, asked: null};
async function loadMine(){
  if(!state.traineeId || M.loading) return M.rec;
  M.loading = true;
  try{ M.rec = (await sharedGet("buffer:" + state.traineeId)) || {acts: {}, released: {}}; M.at = Date.now(); }catch(err){}
  // (and a Submit's result, to show under its panel: graded)
  if(Object.values(ACTS).some(a => a.submit)) await loadReview();
  M.loading = false; return M.rec;
}
const mine = k => ((M.rec || {}).acts || {})[k] || null;
const released = k => ((M.rec || {}).released || {})[k] || null;
function scorecard(a){
  const rb = a.act && root.FT_RUBRICS ? FT_RUBRICS.forAct({id: a.act, title: a.name || ""}) : null; if(!rb) return "";
  return `<div class="ftbf-card"><p class="ftbf-card-h">📋 How your ${what(a)} is scored: ${e(rb.title)}</p>${rb.time ? `<p class="ftbf-muted">⏱ ${e(rb.time)}</p>` : ""}
    <ol>${rb.criteria.map(c => `<li>${e(c.n)}</li>`).join("")}</ol>
    <p class="ftbf-muted">Your trainer scores each criterion 0–5 and adds comments; you’ll see them on your 🛠 Practice Lab page and your scorecard.</p></div>`;
}
function traineePanel(h){
  const a = h.a, d = mine(h.k), rel = released(h.k), w = what(a);
  // (the day's last slide, as Day 4's mock calls are: there is no next slide to go to, the debrief is the trainer's)
  const more = h.i < (FTDayDecks.list(h.day) || []).length - 1;
  if(d && rel) return `<div class="ftbf ftbf-go">${graded(a)}<p class="ftbf-h">${a.kind === "buffer" ? "🔓 The next activity is open" : "▶ The group debrief has started"}</p>
    <p>${a.kind === "buffer" ? "Your trainer has unlocked the next activity for your batch." : more ? "Your trainer has started the debrief. Follow along." : "Your trainer has started the debrief: follow your trainer’s screen."}</p>
    ${more ? `<div class="ftbf-foot"><button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.next()">Go to the next activity →</button></div>` : ""}</div>`;
  if(d) return `<div class="ftbf ftbf-wait">${graded(a)}<p class="ftbf-h">✅ Done${a.kind === "buffer" ? "" : " · Debrief Prep"}</p>
    <p>${a.kind === "buffer" ? "Thank you. Your trainer unlocks the next activity once everyone in your batch is done." : `Great work. While the rest of your batch finishes, review how your ${w} is scored: your trainer is entering your scorecard.`}</p>
    ${a.kind === "buffer" ? "" : scorecard(a)}
    <p class="ftbf-status"><span class="ftbf-dot"></span>${a.kind === "buffer" ? "Waiting for your trainer to unlock the next activity…" : "Waiting for the group debrief to start…"}</p></div>`;
  // (a mock call's wait: its Done asks first, as the mock call's own does)
  if(a.wait) return `<div class="ftbf"><p class="ftbf-h">⏳ Buffer Time</p>
    <p class="ftbf-lead">Use this buffer to finish all your pending tasks. Hit Done when you are.</p>
    <div class="ftbf-foot"><button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.ask()">Done</button></div></div>`;
  if(a.kind === "buffer") return `<div class="ftbf"><p class="ftbf-h">${e(a.title || (a.task ? "✅ Finished the tasks above?" : "⏳ Buffer Time"))}</p>
    <p class="ftbf-lead">${e(a.lead || (a.task ? "Hit Done when you are." : "Use this buffer to finish all your pending tasks. Hit Done when you are."))}</p>
    <div class="ftbf-foot">${a.submit ? `<button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.submit()">📤 Submit</button>` : `<button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.done()">${e(a.label || "Done")}</button>`}</div></div>`;
  const live = !a.rec;
  const steps = a.kind === "mock" ? [
      `While waiting for your turn, practice using the <a href="${e(callSim(a.line))}" target="_blank" rel="noopener">${e(a.name)} Call Simulator</a>.`,
      `Log in to the <a href="${e(RING)}" target="_blank" rel="noopener">Ring Channel</a> while on standby.`,
      "Watch the pre-brief demonstration and review the additional instructions in the Ring Channel.",
      "Wait on standby—the trainer will call you individually for your session."]
    : live ? [
      "Go over the tutorial video and your process guide (your notes on each step).",
      "Rehearse the steps in SA on the training accounts.",
      "Wait on standby—the trainer will call you individually for your demo."]
    : [
      "Watch the tutorial video and build your process guide as you go.",
      "Record your demonstration, following your process guide.",
      "Submit it as the instructions above say, then hit Done."];
  const warn = a.kind === "mock" ? "Only click ‘Done’ after you have completely finished your 1-on-1 mock call with the trainer."
    : live ? "Only click ‘Done’ after you have completely finished your 1-on-1 demo with the trainer."
    : "Only click ‘Done’ after you have finished and submitted your recorded demonstration.";
  return `<div class="ftbf"><p class="ftbf-h">Practice Buffer: ${a.kind === "mock" ? "Mock Call Preparation" : "Demo Preparation"}</p>
    <p class="ftbf-lead">${a.kind === "mock" ? `Use the remaining time to practice for your mock calls. Mock calls will be conducted ${e(a.when || "today")}.`
      : live ? "Use the remaining time to prepare for your demo. Demos are conducted one by one with your trainer." : "Use the time to prepare and record your demonstration."}</p>
    <ol class="ftbf-steps">${steps.map(x => `<li>${x}</li>`).join("")}</ol>
    <div class="ftbf-foot"><p class="ftbf-warn">⚠️ ${e(warn)}</p><button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.ask()">Done</button></div></div>`;
}
// 📤 a Submit's result (ACTS[…].submit): the items checked and graded (/api/monitor/items, kept in trackerreview:<id>)
const subKey = a => (a.submit.items || []).join("-");
function graded(a){
  if(!a.submit) return "";
  const r = ((M.review || {}).items || {})[subKey(a)]; if(!r) return "";
  const g = r.result, li = xs => (xs || []).length ? `<ul>${xs.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : "";
  // (no score here: it is on 🏅 My Performance, js/ft-drive.js ftDriveItems)
  return `<div class="ftbf-card ftbf-graded"><p class="ftbf-card-h">📒 Items #${e((a.submit.items || []).join(", #"))}: checked ${e(r.when || tm(r.at))}</p>
    <p><b>⏱ Timely Completion:</b> ${r.onTime ? "On time (before 5:00 PM ET)." : "Late: after 5:00 PM ET."}</p>
    ${g ? `${(g.items || []).length ? `<p><b>📋 The items:</b> ${g.items.map(x => `#${Number(x.n) || "?"} ${e(x.title || "")} ${x.found ? "✓" : "✗ missing"}`).join(" · ")}</p>` : ""}
      ${g.context ? `<p><b>📈 Context of your progress:</b> ${e(g.context)}</p>` : ""}
      <p><b>🚩 Red flags:</b> ${(g.redFlags || []).length ? "" : "None."}</p>${li(g.redFlags)}
      ${(g.improve || []).length ? `<p><b>🔧 Things to improve:</b></p>${li(g.improve)}` : ""}`
    : `<p class="ftbf-muted">Your update is in: your trainer reviews it.</p>`}
    ${g ? `<p class="ftbf-muted">Your score is on 🏅 My Performance.</p>` : ""}</div>`;
}
async function loadReview(){
  if(!state.traineeId) return;
  try{ M.review = (await sharedGet("trackerreview:" + state.traineeId)) || {}; }catch(err){}
}
function confirmBox(h){
  const a = h.a, q = a.kind === "mock" ? "Have you completed your 1-on-1 mock call with the trainer?"
    : a.rec ? "Have you finished and submitted your recorded demonstration?" : "Have you completed your 1-on-1 demo with the trainer?";
  const m = document.createElement("div"); m.className = "ftbf-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="ftbf-modal-box"><p>${e(q)}</p><div class="ftbf-modal-acts"><button type="button" class="btn btn-ghost" onclick="FTBuffer.cancel()">Cancel</button>
    <button type="button" class="btn btn-primary" onclick="FTBuffer.done()">Yes, I’m Done</button></div></div>`;
  m.addEventListener("click", ev => { if(ev.target === m) FTBuffer.cancel(); });
  document.body.appendChild(m); const b = m.querySelector(".btn-primary"); if(b) b.focus();
}
// a trainee who is done checks for the release while the slide is on screen, and moves on once it comes
function watchRelease(){
  clearTimeout(M.timer);
  const h = here(); if(!h || !trainee() || !mine(h.k) || released(h.k)) return;
  M.timer = setTimeout(async () => {
    const h2 = here(); if(!h2 || h2.k !== h.k || document.hidden){ if(h2 && h2.k === h.k) watchRelease(); return; }
    await loadMine();
    if(released(h.k)) await advance(h); else watchRelease();
  }, 20000);
}
async function advance(h){
  // the release may have unlocked the next step too: read the trainer's settings first, then move on
  try{ if(typeof ftLoadOpenDays === "function") await ftLoadOpenDays(); }catch(err){}
  const now = here(); if(!now || now.k !== h.k) return;
  const n = (FTDayDecks.list(h.day) || []).length;
  if(h.i < n - 1) FTDayDecks.to(h.i + 1); else render();   // (the day's last slide: it shows the debrief has started)
}

/* ---------- the trainer ---------- */
const T = {rows: null, at: 0, loading: false, batch: "", k: "", timer: null, all: {}, busy: false};
async function people(){
  let ps = state.adminData;
  if(!ps){ const keys = await sharedList("trainee:"); ps = []; for(let i = 0; i < keys.length; i += 99) ps.push(...(await sharedGetMany(keys.slice(i, i + 99))).filter(Boolean)); }
  return ps.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
}
async function loadRoster(){
  if(T.loading) return; T.loading = true;
  try{
    const ps = await people(), keys = ps.map(r => "buffer:" + r.id), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    T.rows = ps.map((r, i) => ({id: r.id, name: r.name || r.id, batch: r.batch || "", rec: vals[i] || {acts: {}, released: {}}}))
      .sort((x, y) => x.batch.localeCompare(y.batch) || x.name.localeCompare(y.name));
    const bs = batches(); if(!T.batch || !bs.includes(T.batch)) T.batch = (state.ftOdBatch && bs.find(b => ftKey(b) === state.ftOdBatch)) || bs[bs.length - 1] || "";
    T.at = Date.now();
  }catch(err){ if(!T.rows) T.rows = []; }
  T.loading = false;
}
const ftKey = b => typeof ftBatchKey === "function" ? ftBatchKey(b) : String(b || "").trim().toLowerCase();
const batches = () => [...new Set((T.rows || []).map(r => r.batch).filter(Boolean))].sort();
const inBatch = () => (T.rows || []).filter(r => r.batch === T.batch);
function trackerHtml(h){
  const a = h.a, w = what(a);
  if(!T.rows) return `<div class="ftbf ftbf-tr"><p class="ftbf-h">Live Session: ${trTitle(a)}</p><p class="ftbf-muted">Loading the batch…</p></div>`;
  const rows = inBatch(), total = rows.length, done = rows.filter(r => (r.rec.acts || {})[h.k] && r.rec.acts[h.k].done).length;
  const rel = rows.length && rows.every(r => (r.rec.released || {})[h.k]) ? rows.map(r => r.rec.released[h.k]).sort().pop() : null;
  const all = total > 0 && done === total, pct = total ? Math.round(done / total * 100) : 0;
  const go = a.kind === "buffer" ? "🔓 Unlock the next activity" : "Start Group Debrief";
  const plural = a.kind === "buffer" ? "finish their pending tasks" : `complete their ${w}s`;
  return `<div class="ftbf ftbf-tr" data-k="${e(h.k)}"><div class="ftbf-tr-top"><p class="ftbf-h">Live Session: ${trTitle(a)}</p>
      <label class="ftbf-batch">Batch <select onchange="FTBuffer.batch(this.value)">${batches().map(b => `<option ${b === T.batch ? "selected" : ""}>${e(b)}</option>`).join("") || "<option>No batch</option>"}</select></label></div>
    <div class="ftbf-sum"><p class="ftbf-count">Completed: <b>${done} / ${total}</b> Trainees</p><div class="ftbf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><span style="width:${pct}%"></span></div></div>
    ${all && !rel ? `<p class="ftbf-banner">🎉 ${a.kind === "buffer" ? "All trainees are done! You can unlock the next activity." : `All trainees have completed their ${w}s! You are ready to begin the debrief.`}</p>` : ""}
    ${rel ? `<p class="ftbf-banner ftbf-banner-ok">✓ Released at ${e(tm(rel))}: every trainee’s slide has moved on to the next activity.</p>` : ""}
    ${total ? `<table class="ftbf-tbl"><thead><tr><th>Trainee Name</th><th>Status</th><th>Time Completed</th><th></th></tr></thead><tbody>
      ${rows.map(r => { const d = (r.rec.acts || {})[h.k]; const ok = d && d.done;
        return `<tr><td>${e(r.name)}</td><td>${ok ? `<span class="ftbf-badge ok">✓ Done</span>` : `<span class="ftbf-badge">Waiting</span>`}</td>
          <td>${ok ? e(tm(d.done)) + (d.by === "trainer" ? ` <span class="ftbf-muted">(by you)</span>` : "") : "—"}</td>
          <td class="ftbf-acts">${ok ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTBuffer.mark('${e(r.id)}', false)">↩︎ Revert</button>` : `<button type="button" class="btn btn-ghost btn-sm" onclick="FTBuffer.mark('${e(r.id)}', true)">Mark done</button>`}
            ${a.act ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTBuffer.score('${e(r.id)}')">📋 Score</button>` : ""}</td></tr>`; }).join("")}</tbody></table>`
      : `<p class="ftbf-muted">No approved trainees in this batch.</p>`}
    <div class="ftbf-foot"><button type="button" class="btn btn-primary ftbf-done" ${all && !T.busy ? "" : "disabled"} onclick="FTBuffer.release()">${rel ? "↻ Release again" : go}</button>
      ${all ? "" : `<p class="ftbf-muted">Waiting for all trainees to ${plural}...</p>`}</div></div>`;
}
const trTitle = a => a.kind === "mock" ? "Mock Call Progress Tracker" : a.kind === "demo" ? "Demo Progress Tracker" : a.task ? "Task Progress Tracker" : "Buffer Progress Tracker";
// the tracker reads the batch again every 15 s while it is on screen, and is redrawn in place (no page turn)
function watchRoster(){
  clearTimeout(T.timer);
  T.timer = setTimeout(async () => {
    const h = here(); if(!h || !isAdminView()) return;
    if(!document.hidden && !T.busy) { await loadRoster(); paintTracker(h); }
    watchRoster();
  }, 15000);
}
function paintTracker(h){
  const box = document.querySelector(`.ftbf-tr[data-k="${h.k}"]`) || document.querySelector(".ftbf-tr"); if(!box) return;
  const was = box.querySelector(".ftbf-banner:not(.ftbf-banner-ok)");
  const tmp = document.createElement("div"); tmp.innerHTML = trackerHtml(h); const next = tmp.firstElementChild;
  box.replaceWith(next);
  // 🎉 everyone is done: say it once, loud enough to notice from another tab
  const rows = inBatch(), k = T.batch + "|" + h.k;
  const all = rows.length && rows.every(r => (r.rec.acts || {})[h.k] && r.rec.acts[h.k].done);
  if(all && !T.all[k] && !was){ T.all[k] = true; toast("🎉 Every trainee in " + T.batch + " is done."); try{ if(root.Notification && Notification.permission === "granted") new Notification("All trainees are done", {body: T.batch}); }catch(err){} }
  if(!all) T.all[k] = false;
}
async function writeRec(id, mut){
  const cur = (await sharedGet("buffer:" + id)) || {acts: {}, released: {}};
  cur.acts = cur.acts || {}; cur.released = cur.released || {}; mut(cur);
  if(await sharedSet("buffer:" + id, cur) === false) throw new Error("save");
  const row = (T.rows || []).find(r => r.id === id); if(row) row.rec = cur;
}
// where Activity Locks are in (js/ft-day-locks.js), the batch's next step of the day opens with the release
async function unlockNext(h){
  if(!root.FTDayLocks || typeof FTDayLocks.steps !== "function" || h.day < 2) return;
  const list = FTDayDecks.list(h.day) || [], nx = h.i + 1; if(nx >= list.length) return;
  const st = FTDayLocks.steps(h.day).find(s => nx >= s.from && nx <= s.to); if(!st) return;
  // (the record's counts read, and written, as card-row steps: FTDayLocks.migrate flags them so)
  const cur = (await sharedGet("settings:daysteps")) || {}, b = ftKey(T.batch);
  if(typeof FTDayLocks.migrate === "function") FTDayLocks.migrate(cur);
  cur.batches = cur.batches || {}; cur.batches[b] = cur.batches[b] || {};
  if((Number(cur.batches[b][h.day]) || 0) >= st.n) return;
  cur.batches[b][h.day] = st.n;
  if(typeof FTDayLocks.migrate === "function") FTDayLocks.migrate(cur, true);
  if(await sharedSet("settings:daysteps", cur) !== false) state.ftDaySteps = cur;
}

/* ---------- drawn on the slide ---------- */
// js/ft-day-decks.js draws the slide, then calls afterRender() before it fits the slide to the screen and deals it
// into pages: the panel goes in there, so it is fitted and paged with the rest (the trainee's at the foot, after the
// slide's own instructions; the trainer's tracker at the top). It takes the place of the slide's ⏳ "While you wait" box.
const __after = root.afterRender;
root.afterRender = function(){
  const out = __after ? __after.apply(this, arguments) : undefined;
  // (a trainee's Done record is read as soon as a deck opens, not on the first slide that needs it: a slide that waits
  // for a Done, FTBuffer.holds, is then shut or open from the first Next)
  try{ if(trainee() && state.view === "daydeck" && !M.rec && !M.loading) loadMine().then(() => { if(state.view === "daydeck") render(); }); }catch(err){}
  try{ paint(); }catch(err){}
  return out;
};
function paint(){
  const h = here(); clearTimeout(M.timer); if(!h){ clearTimeout(T.timer); return; }
  const sheet = document.querySelector(`main.main-ftdd .ftdd-deck[data-slide="${h.i}"] .ftdd-sheet`) || document.querySelector("main.main-ftdd .ftdd-sheet");
  if(!sheet || sheet.querySelector(".ftbf")) return;
  sheet.querySelectorAll(".ftdd-wait").forEach(x => x.remove());
  const box = document.createElement("div"); box.className = "ftbf-slot";
  if(isAdminView()){
    if(T.k !== h.k){ T.k = h.k; }
    box.innerHTML = trackerHtml(h); sheet.insertBefore(box, sheet.firstChild);
    if(!T.rows || Date.now() - T.at > 15000) loadRoster().then(() => { const n = here(); if(n && n.k === h.k) paintTracker(n); });
    watchRoster(); return;
  }
  // (a gate's panel heads the slide: its content, below, is read once the Done is in)
  box.innerHTML = traineePanel(h); if(h.a.gate) sheet.insertBefore(box, sheet.firstChild); else sheet.appendChild(box);
  // a buffer slide shows the trainee only its panel: ⏳ Buffer Time and Done, centred on the sheet (the slide's own lines,
  // the carryover note and the next item's name, are the trainer's); a gate, until its Done is in
  if((h.a.kind === "buffer" && ((!h.a.task && !h.a.show) || (h.a.gate && !mine(h.k)))) || (h.a.wait && !mine(h.k))){ sheet.classList.add("ftbf-only");
    // (one page: the hidden content's page breaks go)
    if(h.a.gate) sheet.querySelectorAll(":scope > .ftdd-pgbreak").forEach(x => x.remove()); }
  const sig = () => `${!!mine(h.k)}|${!!released(h.k)}`, was = sig();
  if(trainee() && (!M.rec || Date.now() - M.at > 20000)) loadMine().then(() => {
    const n = here(); if(!n || n.k !== h.k) return;
    if(mine(h.k) && released(h.k)) return advance(h);
    if(sig() !== was) render(); else watchRelease();
  });
  else watchRelease();
}

root.FTBuffer = {
  ACTS,
  // is slide i of day n shut until a task's Done (ACTS[…].opens)? Only a trainee is held, and only once their record is read
  holds(n, i){
    if(!trainee() || !root.FTDayDecks) return false;
    const s = (FTDayDecks.list(n) || [])[i]; if(!s) return false;
    const by = Object.keys(ACTS).find(k => ACTS[k].opens === s.id && k.split(":")[0] === String(n)); if(!by) return false;
    const k = ACTS[by].key || by;
    if(!M.rec){ loadMine().then(() => { if(mine(k)) render(); }); return true; }
    return !mine(k);
  },
  ask(){ const h = here(); if(h) confirmBox(h); },
  cancel(){ document.querySelectorAll(".ftbf-modal").forEach(x => x.remove()); },
  async done(){
    FTBuffer.cancel(); const h = here(); if(!h) return;
    if(!trainee()){ toast("In 👁 Trainee view, Done isn’t saved."); return; }
    try{
      const cur = (await sharedGet("buffer:" + state.traineeId)) || {acts: {}, released: {}};
      cur.acts = cur.acts || {}; cur.released = cur.released || {};
      if(!(cur.acts[h.k] && cur.acts[h.k].done)) cur.acts[h.k] = {done: new Date().toISOString(), by: "trainee"};
      if(await sharedSet("buffer:" + state.traineeId, cur) === false) throw new Error("save");
      M.rec = null; await loadMine();
      toast("✅ Done. Your trainer can see it.");
    }catch(err){ toast("Couldn’t save. Check your connection and try again."); }
    render();
  },
  next(){ const h = here(); if(h) advance(h); },
  // 📤 Submit (ACTS[…].submit): the platform checks and grades the items first, then it counts as the task's Done
  async submit(){
    const h = here(); if(!h || !h.a.submit || M.sending) return;
    if(!trainee()){ toast("In 👁 Trainee view, Submit isn’t sent."); return; }
    M.sending = true; const btn = document.querySelector(".ftbf-done"); if(btn){ btn.disabled = true; btn.textContent = "Checking your Monitoring Sheet…"; }
    let j = {};
    try{ const r = await authFetch("/api/monitor/items", {id: state.traineeId, items: h.a.submit.items, activity: h.a.submit.activity}); j = await r.json().catch(() => ({})); if(!r.ok) throw new Error(j.error || "send"); }
    catch(err){ M.sending = false; toast(err.message && err.message !== "send" ? err.message : "Couldn’t submit. Check your connection and try again."); render(); return; }
    M.sending = false; await loadReview();
    await FTBuffer.done();
  },
  // the trainer
  batch(b){ T.batch = b; const h = here(); if(h) paintTracker(h); },
  async mark(id, on){
    const h = here(); if(!h || !isAdminView()) return;
    try{ await writeRec(id, cur => { if(on) cur.acts[h.k] = {done: new Date().toISOString(), by: "trainer"}; else { delete cur.acts[h.k]; delete cur.released[h.k]; } }); }
    catch(err){ toast("Couldn’t save. Check your connection."); }
    paintTracker(h);
  },
  async release(){
    const h = here(); if(!h || !isAdminView() || T.busy) return;
    const rows = inBatch(); if(!rows.length) return;
    T.busy = true; paintTracker(h);
    try{
      await unlockNext(h);
      const at = new Date().toISOString();
      for(const r of rows) await writeRec(r.id, cur => { cur.released[h.k] = at; });
      toast(h.a.kind === "buffer" ? `🔓 Next activity unlocked for ${T.batch}.` : `▶ Group debrief started for ${T.batch}: every trainee’s slide moves on.`);
    }catch(err){ toast("Couldn’t release everyone. Check your connection and try again."); }
    T.busy = false; paintTracker(h);
  },
  // 📋 the trainee's scorecard for this activity, in Admin → 🧑‍🏫 Trainer Inputs (↩︎ back to the tracker from there)
  score(id){
    const h = here(); if(!h || !h.a.act || !root.FTInputs) return;
    state.ftbfBack = {day: h.day, i: h.i};
    state.adminTab = "trainerinputs"; state.view = "admin";
    if(root.FTSessionsAdmin) FTSessionsAdmin.batch(T.batch);
    FTInputs.cell(id, h.a.act);
  },
  back(){ const b = state.ftbfBack; state.ftbfBack = null; if(b) FTDayDecks.open(b.day, b.i); }
};
// ↩︎ back to the live session, from the scorecard the tracker opened
const __after2 = root.afterRender;
root.afterRender = function(){
  const out = __after2 ? __after2.apply(this, arguments) : undefined;
  try{
    if(state.ftbfBack && state.view === "admin" && state.adminTab === "trainerinputs"){
      const card = document.querySelector(".fss-cellform") || document.querySelector(".fss-admin");
      if(card && !card.querySelector(".ftbf-back")){ const b = document.createElement("button"); b.type = "button"; b.className = "btn btn-navy btn-sm ftbf-back"; b.textContent = "↩︎ Back to the live session"; b.onclick = () => FTBuffer.back(); card.insertBefore(b, card.firstChild); }
    } else if(state.view !== "admin") state.ftbfBack = null;
  }catch(err){}
  return out;
};

const st = document.createElement("style"); st.id = "ft-buffer"; st.textContent = `
/* ✅ the buffer / mock call / demo panel, in Day 1's look: a navy heading bar with the orange edge, big bold text */
.ftdd-sheet .ftbf-slot{margin:18px 0 0;}
.ftdd-sheet .ftbf-slot:first-child{margin:0 0 18px;}
.ftbf{border:2px solid #1E2340;border-radius:14px;padding:18px 22px;background:#fff;}
/* a trainee's buffer slide: the panel alone, centred, gray with an orange frame */
main.main-ftdd .ftdd-sheet.ftbf-only > :not(.ftbf-slot){display:none !important;}
main.main-ftdd .ftdd-sheet.ftbf-only{justify-content:center;align-items:center;}
main.main-ftdd .ftdd-sheet.ftbf-only > .ftbf-slot{margin:0 auto !important;width:min(760px,100%);}
.ftbf-only .ftbf{background:#EEF0F4;border:3px solid #E8590C;border-radius:18px;padding:34px 40px;text-align:center;box-shadow:0 6px 18px rgba(30,35,64,.12);}
.ftbf-only .ftbf .ftbf-h{font-size:24px !important;margin-bottom:18px !important;}
.ftbf-only .ftbf p{font-size:20px;}
.ftbf .ftbf-h{display:inline-block;margin:0 0 12px !important;padding:9px 16px !important;background:#1E2340;color:#fff !important;border-left:5px solid #E8590C;border-radius:8px;font:800 20px/1.3 'Poppins','Inter',sans-serif !important;}
.ftbf p{font:700 18px/1.45 'Inter',sans-serif;color:#1E2340;margin:0 0 10px;}
.ftbf .ftbf-lead{font-size:19px;}
.ftbf .ftbf-muted{font:500 14px/1.4 'Inter',sans-serif;color:#5B6178;}
.ftbf-steps{margin:0 0 6px;padding-left:26px;}
.ftbf-steps li{font:700 18px/1.5 'Inter',sans-serif;color:#1E2340;margin:0 0 6px;}
.ftbf-steps a, .ftbf p a{color:#E8590C;text-decoration:underline;font-weight:800;}
.ftbf-foot{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:14px;text-align:center;}
.ftbf .ftbf-warn{font:700 15.5px/1.4 'Inter',sans-serif;color:#9A3412;background:#FFF4E5;border:1px solid #F4B77A;border-radius:10px;padding:8px 14px;margin:0;}
.btn.ftbf-done{display:inline-flex;align-items:center;justify-content:center;text-align:center;align-self:center;margin:0 auto;min-width:200px;padding:12px 30px;font-size:18px;font-weight:800;background:#E8590C;border-color:#E8590C;color:#fff;box-shadow:0 4px 0 #A33F07;}
.btn.ftbf-done:hover:not(:disabled){background:#C94C08;}
.btn.ftbf-done:disabled{background:#C9CCD6;border-color:#C9CCD6;color:#5B6178;box-shadow:none;cursor:not-allowed;opacity:1;}
.ftbf-wait{border-color:#2F855A;}
.ftbf-go{border-color:#E8590C;}
.ftbf-status{display:flex;align-items:center;gap:10px;font-size:16px !important;color:#2F855A !important;}
.ftbf-dot{width:10px;height:10px;border-radius:50%;background:#2F855A;animation:ftbfPulse 1.4s ease-in-out infinite;}
@keyframes ftbfPulse{0%,100%{opacity:1}50%{opacity:.25}}
.ftbf-card{border:1.5px solid #D6DAE6;border-radius:12px;padding:12px 16px;margin:6px 0 12px;background:#F7F8FC;}
.ftbf-card .ftbf-card-h{font-size:17px;margin-bottom:6px;}
.ftbf-card ol{margin:0 0 8px;padding-left:24px;}
.ftbf-card li{font:600 15.5px/1.45 'Inter',sans-serif;color:#1E2340;}
/* the trainer's live tracker */
.ftbf-tr-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.ftbf-batch{font:700 14px 'Inter',sans-serif;color:#1E2340;display:flex;align-items:center;gap:8px;}
.ftbf-batch select{font:600 14px 'Inter',sans-serif;padding:5px 8px;border:1px solid #C9CFDD;border-radius:8px;}
.ftbf-sum{display:flex;align-items:center;gap:16px;margin:4px 0 12px;}
.ftbf .ftbf-count{margin:0;white-space:nowrap;font-size:19px;}
.ftbf-bar{flex:1 1 auto;height:14px;border-radius:8px;background:#E6E8F0;overflow:hidden;}
.ftbf-bar span{display:block;height:100%;background:linear-gradient(90deg,#2F855A,#38A169);border-radius:8px;transition:width .4s;}
.ftbf .ftbf-banner{background:#E8F7EE;border:1.5px solid #2F855A;border-radius:10px;padding:10px 14px;color:#1C5B3A;font-size:17px;}
.ftbf .ftbf-banner-ok{background:#EEF1FA;border-color:#1E2340;color:#1E2340;}
.ftbf-tbl{width:100%;border-collapse:collapse;margin:4px 0;font:600 15px 'Inter',sans-serif;color:#1E2340;}
.ftdd-sheet .ftbf-tbl th{text-align:left;font:800 12.5px 'Inter',sans-serif !important;letter-spacing:.05em;text-transform:uppercase;color:#5B6178 !important;padding:6px 8px !important;border-bottom:2px solid #1E2340;background:none !important;}
.ftdd-sheet .ftbf-tbl td{padding:7px 8px !important;border-bottom:1px solid #E6E8F0;vertical-align:middle;font:600 16px 'Inter',sans-serif !important;color:#1E2340 !important;}
.ftbf-acts{white-space:nowrap;text-align:right;}
.ftbf-badge{display:inline-block;padding:3px 10px;border-radius:999px;background:#ECEDF2;color:#5B6178;font:700 13px 'Inter',sans-serif;}
.ftbf-badge.ok{background:#E3F4EA;color:#1C7A47;}
/* the confirmation */
.ftbf-modal{position:fixed;inset:0;z-index:300;background:rgba(17,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.ftbf-modal-box{background:#fff;border-radius:14px;border-top:5px solid #E8590C;max-width:440px;width:100%;padding:22px 24px;box-shadow:0 20px 50px rgba(0,0,0,.3);}
.ftbf-modal-box p{font:800 19px/1.4 'Poppins','Inter',sans-serif;color:#1E2340;margin:0 0 18px;}
.ftbf-modal-acts{display:flex;justify-content:flex-end;gap:10px;}
.ftbf-back{margin:0 0 10px;}
@media(max-width:760px){ .ftbf-sum{flex-direction:column;align-items:stretch;} .ftbf-tbl th:nth-child(3), .ftbf-tbl td:nth-child(3){display:none;} .ftbf-acts{white-space:normal;} }
`;
document.head.appendChild(st);
})();
