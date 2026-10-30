/* ============================================================
   ✅ Buffer time, mock calls and demos: the trainee's Done
   Loaded after js/ft-day-decks.js. A buffer, mock call or demo slide of the Activity decks (ACTS below) carries, for a
   trainee, what to do and a ✅ Done button. The trainer's slide is the slide's own content: no panel, no tracker.
     • Buffer time: "Use this buffer to finish all your pending tasks. Hit Done when you are."
     • A mock call or a demo: Done only after the 1-on-1 with the trainer, confirmed in a dialog.
     • Once Done, the trainee goes on to the next activity (Go to the next activity →); where Activity Locks are in
       (js/ft-day-locks.js), the trainer opens the next step from the slide's 🔓 Segment lock or Admin → 📅 Open Lessons.
   buffer:<trainee id> = {acts: {"<day>:<slide id>": {done: ISO, by: "trainee"|"trainer"}}, released: {…}}
     the trainee marks their own Done (worker.js stamps the server's time and keeps the rest). (released: the trainer's
     old Start Group Debrief, from when the slide had a tracker; no longer written or read.)
   ============================================================ */
(function(){
const root = window;
// the slides that get a screen, by "<day>:<slide id>" (js/ft-day-decks-data.js); act: the activity in 🧑‍🏫 Trainer Inputs
const ACTS = {
  // a set of tasks that ends on Done, as a buffer does, on the slide's own content
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
  // Day 5 opens on the same update, in place of its Buffer Time for Reception Mock Calls: under Day 4's key, so a trainee
  // who submitted on Day 4 is done here too (the card's next stop is the lesson deck)
  "5:s1": {kind: "buffer", task: true, gate: true, key: "4:s2m", title: "📒 Update items #10–11 in your Monitoring Sheet", lead: "Once done, hit Submit.",
    submit: {items: [10, 11], activity: "Reception Training with Julio"}},
  // Day 5's Attorney Calendar Management Activity: "signify done" is its Done, at the end of its slides (s3, its text; s3b)
  // (its panel as Day 2's: what to do, "Once done, hit Submit." and 📤 Submit, which counts as the Done; label: the button)
  "5:s3b": {kind: "buffer", task: true, key: "5:s3", title: "📅 Attorney Calendar Management Activity", lead: "Once done, hit Submit.", label: "📤 Submit"},
  // (Day 9's Buffer Time is off the deck: build/day-decks.cjs SKIP[9])
  "13:s1": {kind: "buffer"},
  // (simple: the trainee sees only "Mock Calls Ongoing", "Hit Done when you are done with your Mock Call." and Done)
  "4:s3": {kind: "mock", name: "Reception", line: "Reception Mock Calls", act: "reception-live", when: "this afternoon", simple: true},
  // (key: where a day's guide section was cut into one slide per card row, build/day-decks.cjs ROWS, the activity moved to
  // its own slide; its records keep the key they were saved under)
  // (Day 6's as Day 4's: the mock calls on a slide of their own after the instructions, s1b, simple)
  // (what: the trainee's name for it, on the panel and the confirmation: Day 6 is the Calendaring Activity, done on the
  // Calendar Simulator; the trainer's scorecard keeps the mock call's)
  "6:s1b-2": {kind: "mock", name: "Calendar Management", line: "Calendar Management Mock Calls", act: "calendar-live", when: "today", key: "6:s1", simple: true, what: "Calendaring Activity"},
  // (Days 8–16 as Day 4: the instructions and metrics on the preparation slide before, build/day-decks.cjs PREP; here, simple)
  "9:s3b": {kind: "mock", name: "Intake", line: "Intake Mock Calls", act: "intake-live", when: "this afternoon", key: "9:s3", simple: true},
  "8:s3": {kind: "demo", name: "Saving the Intake Packet and Extracted Intake Documents", act: "intake-packet-demo", simple: true},
  "12:s1d": {kind: "demo", name: "Uploading and Sending 1P & 3P LORs", act: "lor-demo", rec: true, key: "12:s1", simple: true},
  "14:s1e": {kind: "demo", name: "Sending MedLOR and Requesting Medical Bills & Records", act: "medlor-demo", rec: true, key: "14:s1", simple: true},
  "15:s1b": {kind: "demo", name: "Sending MedLOR and Requesting Medical Bills & Records", act: "medlor-demo", rec: true, key: "15:s1", simple: true},
  "16:s2": {kind: "demo", name: "LV (Lien Verification) Request", act: "lv-demo", simple: true}
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
const M = {rec: null, at: 0, loading: false, asked: null};
async function loadMine(){
  if(!state.traineeId || M.loading) return M.rec;
  M.loading = true;
  try{ M.rec = (await sharedGet("buffer:" + state.traineeId)) || {acts: {}, released: {}}; M.at = Date.now(); }catch(err){}
  // (and a Submit's result, to show under its panel: graded)
  if(Object.values(ACTS).some(a => a.submit)) await loadReview();
  M.loading = false; return M.rec;
}
const mine = k => ((M.rec || {}).acts || {})[k] || null;
function scorecard(a){
  const rb = a.act && root.FT_RUBRICS ? FT_RUBRICS.forAct({id: a.act, title: a.name || ""}) : null; if(!rb) return "";
  return `<div class="ftbf-card"><p class="ftbf-card-h">📋 How your ${what(a)} is scored: ${e(rb.title)}</p>${rb.time ? `<p class="ftbf-muted">⏱ ${e(rb.time)}</p>` : ""}
    <ol>${rb.criteria.map(c => `<li>${e(c.n)}</li>`).join("")}</ol>
    <p class="ftbf-muted">Your trainer scores each criterion 0–5 and adds comments; you’ll see them on your 🛠 Practice Lab page and your scorecard.</p></div>`;
}
function traineePanel(h){
  const a = h.a, d = mine(h.k);
  // (the day's last slide, as Day 4's mock calls are: there is no next slide to go to)
  const more = h.i < (FTDayDecks.list(h.day) || []).length - 1;
  // (simple: no scorecard, the Done and the way on, in the middle of the slide)
  if(d) return `<div class="ftbf ftbf-go">${graded(a)}<p class="ftbf-h">✅ Done</p>
    ${a.kind === "buffer" || a.simple ? "" : scorecard(a)}
    ${more ? `<div class="ftbf-foot"><button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.next()">Go to the next activity →</button></div>`
      : `<p>That’s the day’s last activity.</p>`}</div>`;
  if(a.kind === "buffer") return `<div class="ftbf"><p class="ftbf-h">${e(a.title || (a.task ? "✅ Finished the tasks above?" : "⏳ Buffer Time"))}</p>
    <p class="ftbf-lead">${e(a.lead || (a.task ? "Hit Done when you are." : "Use this buffer to finish all your pending tasks. Hit Done when you are."))}</p>
    <div class="ftbf-foot">${a.submit ? `<button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.submit()">📤 Submit</button>` : `<button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.done()">${e(a.label || "Done")}</button>`}</div></div>`;
  // (Day 2's Submit panel, in the middle of the slide: its heading, one line and the big button)
  if(a.simple) return `<div class="ftbf"><p class="ftbf-h">${a.what ? e(a.what) + " Ongoing" : a.kind === "mock" ? "Mock Calls Ongoing" : "Demos Ongoing"}</p>
    <p class="ftbf-lead">Hit Done when you are done with your ${a.what ? e(a.what) : a.kind === "mock" ? "Mock Call" : "Demo"}.</p>
    ${a.act === "intake-live" ? `<div class="ftis-mockcall"></div>` : ""}
    <div class="ftbf-foot"><button type="button" class="btn btn-primary ftbf-done" onclick="FTBuffer.ask()">Done</button></div></div>`;
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
  const a = h.a, q = a.what ? `Have you completed your 1-on-1 ${a.what} with the trainer?` : a.kind === "mock" ? "Have you completed your 1-on-1 mock call with the trainer?"
    : a.rec ? "Have you finished and submitted your recorded demonstration?" : "Have you completed your 1-on-1 demo with the trainer?";
  const m = document.createElement("div"); m.className = "ftbf-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
  m.innerHTML = `<div class="ftbf-modal-box"><p>${e(q)}</p><div class="ftbf-modal-acts"><button type="button" class="btn btn-ghost" onclick="FTBuffer.cancel()">Cancel</button>
    <button type="button" class="btn btn-primary" onclick="FTBuffer.done()">Yes, I’m Done</button></div></div>`;
  m.addEventListener("click", ev => { if(ev.target === m) FTBuffer.cancel(); });
  document.body.appendChild(m); const b = m.querySelector(".btn-primary"); if(b) b.focus();
}
function advance(h){
  const now = here(); if(!now || now.k !== h.k) return;
  if(h.i < (FTDayDecks.list(h.day) || []).length - 1) FTDayDecks.to(h.i + 1);
}

/* ---------- drawn on the slide ---------- */
// js/ft-day-decks.js draws the slide, then calls afterRender() before it fits the slide to the screen and deals it
// into pages: the panel goes in there, so it is fitted and paged with the rest (the trainee's at the foot, after the
// slide's own instructions). It takes the place of the slide's ⏳ "While you wait" box. The trainer's slide has none.
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
  const h = here(); if(!h) return;
  const sheet = document.querySelector(`main.main-ftdd .ftdd-deck[data-slide="${h.i}"] .ftdd-sheet`) || document.querySelector("main.main-ftdd .ftdd-sheet");
  if(!sheet || sheet.querySelector(".ftbf")) return;
  sheet.querySelectorAll(".ftdd-wait").forEach(x => x.remove());
  if(isAdminView()) return;
  const box = document.createElement("div"); box.className = "ftbf-slot";
  // (a gate's panel heads the slide: its content, below, is read once the Done is in)
  box.innerHTML = traineePanel(h); if(h.a.gate) sheet.insertBefore(box, sheet.firstChild); else sheet.appendChild(box);
  // a buffer slide shows the trainee only its panel: ⏳ Buffer Time and Done, centred on the sheet (the slide's own lines,
  // the carryover note and the next item's name, are the trainer's); a gate, until its Done is in
  if((h.a.kind === "buffer" && (!h.a.task || (h.a.gate && !mine(h.k)))) || h.a.simple){ sheet.classList.add("ftbf-only");
    // (one page: the hidden content's page breaks go)
    if(h.a.gate) sheet.querySelectorAll(":scope > .ftdd-pgbreak").forEach(x => x.remove()); }
  const was = !!mine(h.k);
  if(trainee() && (!M.rec || Date.now() - M.at > 20000)) loadMine().then(() => {
    const n = here(); if(n && n.k === h.k && !!mine(h.k) !== was) render();
  });
}

root.FTBuffer = {
  ACTS,
  // is slide i of day n shut until a task's Done (ACTS[…].opens)? Only a trainee is held, and only once their record is read
  holds(n, i){
    if(!trainee() || !root.FTDayDecks) return false;
    const s = (FTDayDecks.list(n) || [])[i]; if(!s) return false;
    const by = Object.keys(ACTS).find(k => ACTS[k].opens === s.id && k.split(":")[0] === String(n)); if(!by) return false;
    const k = ACTS[by].key || by;
    if(!M.rec){ loadMine().then(() => { if(mine(k)) render(); }); toast("One moment: checking your Done…"); return true; }
    if(mine(k)) return false;
    // say why Next doesn't move, and where the Done is (the slide carrying the task, by its step number)
    const list = FTDayDecks.list(n) || [], at = list.findIndex(x => x.id === by.split(":")[1]);
    toast(`🔒 ${s.h || "The next slide"} opens once you ${ACTS[by].submit ? "📤 Submit" : "mark Done"} “${ACTS[by].title.replace(/^\W+\s*/, "")}”${at >= 0 ? ` (Step ${at + 1})` : ""}.`);
    return true;
  },
  ask(){ const h = here(); if(h) confirmBox(h); },
  cancel(){ document.querySelectorAll(".ftbf-modal").forEach(x => x.remove()); },
  async done(){
    FTBuffer.cancel(); const h = here(); if(!h) return;
    if(!trainee()){ toast("Only a trainee’s Done is saved."); return; }
    try{
      const cur = (await sharedGet("buffer:" + state.traineeId)) || {acts: {}, released: {}};
      cur.acts = cur.acts || {}; cur.released = cur.released || {};
      if(!(cur.acts[h.k] && cur.acts[h.k].done)) cur.acts[h.k] = {done: new Date().toISOString(), by: "trainee"};
      if(await sharedSet("buffer:" + state.traineeId, cur) === false) throw new Error("save");
      M.rec = null; await loadMine();
      toast("✅ Done.");
    }catch(err){ toast("Couldn’t save. Check your connection and try again."); }
    render();
  },
  next(){ const h = here(); if(h) advance(h); },
  // 📤 Submit (ACTS[…].submit): the platform checks and grades the items first, then it counts as the task's Done
  async submit(){
    const h = here(); if(!h || !h.a.submit || M.sending) return;
    if(!trainee()){ toast("Only a trainee’s Submit is sent."); return; }
    M.sending = true; const btn = document.querySelector(".ftbf-done"); if(btn){ btn.disabled = true; btn.textContent = "Checking your Monitoring Sheet…"; }
    let j = {};
    try{ const r = await authFetch("/api/monitor/items", {id: state.traineeId, items: h.a.submit.items, activity: h.a.submit.activity}); j = await r.json().catch(() => ({})); if(!r.ok) throw new Error(j.error || "send"); }
    catch(err){ M.sending = false; toast(err.message && err.message !== "send" ? err.message : "Couldn’t submit. Check your connection and try again."); render(); return; }
    M.sending = false; await loadReview();
    await FTBuffer.done();
  }
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
.ftbf-go{border-color:#E8590C;}
.ftbf-card{border:1.5px solid #D6DAE6;border-radius:12px;padding:12px 16px;margin:6px 0 12px;background:#F7F8FC;}
.ftbf-card .ftbf-card-h{font-size:17px;margin-bottom:6px;}
.ftbf-card ol{margin:0 0 8px;padding-left:24px;}
.ftbf-card li{font:600 15.5px/1.45 'Inter',sans-serif;color:#1E2340;}
/* the confirmation */
.ftbf-modal{position:fixed;inset:0;z-index:300;background:rgba(17,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.ftbf-modal-box{background:#fff;border-radius:14px;border-top:5px solid #E8590C;max-width:440px;width:100%;padding:22px 24px;box-shadow:0 20px 50px rgba(0,0,0,.3);}
.ftbf-modal-box p{font:800 19px/1.4 'Poppins','Inter',sans-serif;color:#1E2340;margin:0 0 18px;}
.ftbf-modal-acts{display:flex;justify-content:flex-end;gap:10px;}
`;
document.head.appendChild(st);
})();
