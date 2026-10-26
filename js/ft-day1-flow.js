/* ============================================================
   🔓 Day 1 in order, one step at a time, each opened by the trainer
   Loaded after js/ft-my-pages.js. Day 1 runs in this order, and a trainee can only go as far as the trainer has
   unlocked for their batch:
     1 Setting of Training Expectations   2 Know Your Tools   3 Personal Injury Reading   4 Classroom Discussion
     5 Handouts and Videos   6 Process Questions   7 Installation of SA   8 Finish
   settings:day1steps = {all: n, batches: {"<batch key>": n}}: the last step unlocked (1 when nothing is set), read with
   the open lessons (js/ft-updates.js ftLoadOpenDays, the same request). The trainer unlocks the next step in
   Admin → 📅 Open Lessons → 🔓 Day 1 Steps. Until Finish is unlocked:
     • 📚 Dashboard opens the step the trainee is on (Setting of Training Expectations, first);
     • a later step's page, deck slide, video or answer sheet says it is locked and goes back to the current step.
   Only a trainee on Day 1 is held to it: an admin, the 👁 trainee view, a trainee who finished Lesson 1 and a batch
   already given a later lesson are not.
   ============================================================ */
(function(){
const STEPS = [
  {n: 1, label: "Setting of Training Expectations", go: "goto('day', 12)"},
  {n: 2, label: "Know Your Tools", go: "goto('knowtools')"},
  {n: 3, label: "Personal Injury Reading", go: "FTDayDecks.slide(1, 'reading')"},
  {n: 4, label: "Classroom Discussion", go: "goto('day', 1)"},
  {n: 5, label: "Handouts and Videos", go: "FTDayDecks.open(1, 0)"},   // the day card, its Handouts / Video row
  {n: 6, label: "Process Questions", go: "FTDayDecks.toKC(1)"},
  {n: 7, label: "Installation of SA", go: "FTDayDecks.slide(1, 'pm')"},
  {n: 8, label: "Finish", go: "goto('modules')"}
];
const FINISH = 8;
const key = b => typeof ftBatchKey === "function" ? ftBatchKey(b) : String(b || "").trim().toLowerCase();
// the last step unlocked for this batch
function stepsFor(batch){ const o = state.ftDay1Steps || {}; return Math.max(1, Number(o.all) || 0, Number((o.batches || {})[key(batch)]) || 0); }
function active(){
  if(!state.traineeId || state.isAdmin || state.adminPreview || !state.ftOpenDays) return false;   // (nothing decided before the open lessons load)
  const p = (state.progress || {})[1]; if(p && p.done) return false;
  const o = state.ftOpenDays || {}, open = [].concat(o.all || [], (o.batches || {})[key(state.traineeBatch)] || []).map(Number);
  if(open.some(id => id > 1 && id !== 12)) return false;   // the batch is past Day 1 already
  return stepsFor(state.traineeBatch) < FINISH;
}
const at = () => stepsFor(state.traineeBatch);
const step = n => STEPS[n - 1];
function blocked(n){
  if(!active() || n <= at()) return false;
  toast(`🔒 ${step(n).label} opens when your trainer unlocks it. You are on ${step(at()).label}.`);
  return true;
}
const goCurrent = () => { try{ (new Function(step(at()).go))(); }catch(err){ goto("day", 12); } };
window.FTDay1 = {STEPS, active, at, stepsFor, label: n => step(n).label,
  // a lesson 1 answer sheet: the Reading Task's opens with the reading, the Virtual Assistant Essentials one with Process Questions
  sheetLocked: set => active() && Number(set.lesson) === 1 && set.id !== "pi-overview" && at() < 6,
  goCurrent};

/* the pages: 📚 Dashboard opens the current step; Know Your Tools, Lesson 1 and its Knowledge Check wait for theirs */
const __goto = window.goto;
window.goto = function(view, arg){
  if(active()){
    if(view === "modules" || view === "dashboard"){ if(at() < FINISH){ goCurrent(); return; } }
    if(view === "knowtools" && blocked(2)) return;
    if(view === "day" && Number(arg) === 1 && blocked(4)) return;
    if((view === "kc" || view === "process") && (Number(arg) === 1 || (view === "kc" && Number(state.dayId) === 1)) && blocked(3)) return;
  }
  return __goto.apply(this, arguments);
};
// 🎬 the lesson's video (Handouts and Videos)
const __video = window.ftVideoOrAsk;
if(__video) window.ftVideoOrAsk = function(id){ if(Number(id) === 1 && blocked(5)) return; return __video.apply(this, arguments); };

/* Day 1's Activity deck: a slide of a later step shows its lock instead */
const SLIDE_STEP = id => /^reading/.test(id) ? 3 : (id === "discussion" || id === "client-id") ? 4 : id === "pm" ? 7 : 0;
function slideId(){
  const s = window.FTDayDecks && FTDayDecks.state ? FTDayDecks.state() : null, d = window.FT_DAY_DECKS && FT_DAY_DECKS[1];
  if(!s || Number(s.day) !== 1 || !d) return "";
  const hit = d.slides.find(x => FTDayDecks.at(1, x.id) === s.i); return hit ? hit.id : "";
}
const __render = window.render;
let loading = false;
window.render = function(){
  // a trainee just signed in: the open lessons and Day 1's steps are read now, not at the next check (3 minutes)
  if(state.traineeId && !state.isAdmin && !state.ftOpenDays && !loading && typeof ftLoadOpenDays === "function"){
    loading = true; ftLoadOpenDays().catch(() => {}).then(() => { loading = false; if(state.ftOpenDays) render(); });
  }
  // 📚 Dashboard on Day 1 is the step the trainee is on
  if((state.view === "modules" || state.view === "dashboard") && active() && at() < FINISH){ goCurrent(); return; }
  const r = __render.apply(this, arguments);
  if(state.view === "daydeck" && active()){
    const n = SLIDE_STEP(slideId()), box = document.querySelector("main.main-ftdd .ftdd-slides");
    if(n && n > at() && box) box.innerHTML = `<div class="ftd1-lock"><b>🔒 ${esc(step(n).label)}</b>
        <span>This step opens when your trainer unlocks it. Day 1 goes in order, one step at a time.</span>
        <button type="button" class="btn btn-navy" onclick="FTDay1.goCurrent()">Go to ${esc(step(at()).label)} →</button></div>`;
  }
  return r;
};

/* 🛡 Admin → 📅 Open Lessons: 🔓 Day 1 Steps, for all batches or one */
window.renderFtDay1Steps = function(){
  const sel = state.ftOdBatch || "__all", o = state.ftDay1Steps || {all: 0, batches: {}};
  const cur = sel === "__all" ? Math.max(1, Number(o.all) || 0) : Math.max(1, Number(o.all) || 0, Number((o.batches || {})[sel]) || 0);
  return `<div class="card ft-open-days ftd1-admin"><h3>🔓 Day 1 Steps</h3>
    <p style="margin:0 0 10px;color:var(--ink-soft);font-size:14px;">Day 1 goes in this order. Trainees can only go as far as you unlock, for the batch chosen above${sel === "__all" ? " (all batches)" : ""}.</p>
    <ol class="ftd1-steps">${STEPS.map(s => `<li class="${s.n <= cur ? "on" : ""}"><span>${s.n}. ${esc(s.label)}</span>
      ${s.n === 1 ? `<i>always open</i>` : s.n <= cur ? `<button type="button" class="btn btn-ghost btn-sm" onclick="ftSetDay1Step(${s.n - 1})">🔒 Lock from here</button>`
        : `<button type="button" class="btn btn-navy btn-sm" onclick="ftSetDay1Step(${s.n})">🔓 Unlock${s.n > cur + 1 ? " up to here" : ""}</button>`}</li>`).join("")}</ol></div>`;
};
window.ftSetDay1Step = async function(n){
  const sel = state.ftOdBatch || "__all";
  const cur = (await sharedGet("settings:day1steps")) || {}, next = {all: Number(cur.all) || 0, batches: Object.assign({}, cur.batches || {})};
  if(sel === "__all") next.all = n; else next.batches[sel] = n;
  const ok = await sharedSet("settings:day1steps", next);
  if(ok === false){ toast("Couldn’t save. Check your connection and try again."); return; }
  state.ftDay1Steps = next; toast(n >= FINISH ? "✓ Day 1 finished: the Dashboard opens as usual." : `✓ Unlocked up to ${step(Math.max(1, n)).label}.`); render();
};

const st = document.createElement("style"); st.id = "ft-day1-flow"; st.textContent = `
.ftd1-lock{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:320px;padding:28px;border-radius:14px;background:#fff;text-align:center;}
.ftd1-lock b{font:800 22px/1.3 'Poppins','Inter',sans-serif;color:#1E2340;} .ftd1-lock span{font-size:15px;color:var(--ink-soft);max-width:460px;}
.ftd1-steps{list-style:none;margin:0;padding:0;display:grid;gap:6px;}
.ftd1-steps li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;}
.ftd1-steps li.on{background:#EAF6EE;border-color:#B9E0C6;} .ftd1-steps li i{font-size:12.5px;color:var(--ink-soft);}
`;
document.head.appendChild(st);
})();
