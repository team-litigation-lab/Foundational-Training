/* ============================================================
   📅 Calendaring Simulators: drag-and-drop, Google Calendar style, with an automated review and trainer feedback.
   Loaded after js/ft-calsim-core.js (the weeks) and before js/ft-simulators.js. Route: #/calsim.
     • Two tracks (FTCalCore.TRACKS): 🎓 Standard Training (opens with Lesson 5) and 🗓 Attorney Calendar Management Activity
       (Day 5; opens with Day 5, like its 🛠 Practice Lab card). Open one directly: goto('calsim','attorney-activity') (a scenario
       or track id), FTCalSim.open('attorney-activity'), or the address #/calsim/attorney-activity. The last one opened is remembered.
     • The activity (FTCalCore.act) is the attorney's own Google Calendar in Pacific Time, two weeks from its anchor Monday
       (the activity is days 0–9, written for July 6–15, 2026; the days after are greyed): week view, midnight to midnight,
       15-minute steps, ‹ › for the two weeks and an
       All-day row. The trainee creates every event (drag, ＋ Create or ＋ Add event); the editor has Google Calendar's fields:
       date, start/end, All day, the event's own time zone (the Calendar Activity Check's list), location, guests (the four
       in the directory or any email), Google Meet, reminders (Notification or Email, minutes to weeks before), color and
       description. The left rail has the activity's instructions, its color legend in Google colors, the guests and the ten
       items. Read-only views (My submitted evaluation, the trainer's views) show the calendar as an agenda.
     • The activity is graded THROUGH the 📅 Calendar Activity Check (window.FTCalCheck, js/ft-calcheck.js, #/calcheck): each
       event is mapped to the Check's entry and checked field by field by the Check's own code (FTCalCore.act, review()), so the
       two agree; the review panel shows the Check's ✓/✗ for every field with its fix, plus the simulator's own checks (colour,
       overlaps, duplicates). The page links to the Check ("✅ Check with the Calendar Activity Check"), and the Check links back.
     • The week is a Monday to Friday grid in 15-minute steps (Eastern Time). The attorney's fixed events are locked. The brief lists
       the tasks to put on the calendar; the trainee builds their own calendar: drag on an empty part of the week to
       add an event, drag an event to move it, drag its bottom edge to resize it, double-click to rename it, ✕ to
       delete it. The event editor has Google Calendar's color picker: the attorney's rule (FTCalCore.COLOR_RULE) colors an
       event by its length (30 minutes Tangerine, 45 Blueberry, 1 hour Tomato); the trainee picks it and the review checks it.
       Events that clash, break a court's travel time or fall outside business hours show in red with ⚠.
     • At the bottom: 💾 Save changes (saves now), 🤖 Run automated review (FTCalCore.review: the attorney's rules, scored
       out of 100, with what to fix) and 📤 Submit calendar to my trainer. A trainer opens a submission in Admin → 📅
       Calendar Scores, sees the week and its automated review, and adds manual feedback: a score out of 100, an overall
       comment and a comment on each task, which the trainee sees on this page. Scores are kept per trainee.
     • After submitting, AI feedback is written on the spot from the rules and notes (callAIJson, "grading"): what was met,
       what was missed and how to fix it. The trainer opens the submission in 🖥 Live review (Admin → 📅 Calendar Scores) and
       talks it through as it shows on screen, step by step; adds what the AI missed, written insights, a score, then
       **releases the final feedback**. The trainee then sees it on this page and can download or print a copy.
     • The Standard weeks run on the Main Portal now (this page keeps the calendars saved before the move); the activity is done
       and graded here, from its 🛠 Practice Lab card (window.ftCalActivityCard, js/ft-simulators.js) and the Day 5 step.
     • The activity's dates: its anchor (FTCalCore.act, THE ANCHOR), the first Monday on or after the trainee's batch's Day 5, kept
       ONCE in the record as anchors["attorney-activity"] (load() gives a record without one its own and saves it; a record from
       before, an activity draft or submission and no anchor, keeps July 6, 2026). It is set before anything filters events by
       date (a July draft cleaned under a November anchor would be emptied, then autosaved). A trainer's preview shows the dates a
       batch starting this week would get (anchorNow) and saves nothing. Each submission keeps the anchor it was made at
       (sub.anchor); everything that shows or grades a stored submission runs at it (atSub: X.withAnchor), puts the page's back.
     • Saved in the trainee's `calsim:<id>` record: {v:2, anchors:{scenario:"YYYY-MM-DD"}, drafts:{scenario:[events]}, autos:[{scn, at, pct, score, max}], submissions:[{scn, at, anchor, events, auto}],
       reviews:{"<scn>|<at>": {score, comment (written insights), extra:[points the AI missed], tasks:{taskId: comment}, released, releasedAt, by, at}};
       a submission also has ai:{at, summary, items:[{id, status, feedback}], strengths, improve} or ai:{error}, external:[...]}. The Worker keeps `reviews` from being changed
       by the trainee.
     • Connected simulators: the Portal's Calendaring Simulator opens from here with program=FT, the trainee's name and
       batch. A simulator that finishes with postMessage({type:"lsh-sim-result", sim:"calendar", score, max, title})
       (from the Portal or the CMS) has the result added to the same record.
   ============================================================ */
(function(){
const C = window.FTCalCore;
if(!C) return;
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const LESSON = 5;                         // Calendaring & Appointment Setting Training
const TOP = 8 * 60, BOTTOM = 18 * 60, SH = 14;   // the grid shows 8:00 AM to 6:00 PM; one 15-minute slot is SH pixels
const px = min => (min - TOP) / C.STEP * SH;
const ASH = 12;                           // the activity's grid: midnight to midnight, one 15-minute slot is ASH pixels (48 an hour)
const isAct = C.isAct, X = C.act;
const apx = min => min / C.STEP * ASH, ACT_H = apx(1440);
const trackOf = () => C.trackOf(scn().track);
const e = v => esc(String(v == null ? "" : v));
// a value inside an onclick="…('…')" handler: a JS string literal, then HTML-escaped (esc alone lets ' through once decoded)
const js = v => e(JSON.stringify(String(v == null ? "" : v)));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
// The Standard weeks open with Lesson 5; the activity with Day 5, as its 🛠 Practice Lab card does (js/ft-simulators.js).
function actOpen(){
  const days = window.FTDays ? FTDays.forTool("calactivity") : [];
  const reached = typeof window.ftsReached === "function" ? window.ftsReached(days) : (typeof dayUnlocked === "function" ? dayUnlocked(LESSON) : true);
  return !!reached && (!window.FTDayLocks || FTDayLocks.labOpen(days));
}
const openFor = s => state.isAdmin || state.adminPreview || (isAct(s) ? actOpen() : (typeof dayUnlocked === "function" ? dayUnlocked(LESSON) : true));
const open = () => openFor(scn());
const hh = m => C.fmt(m);
const maxEv = () => isAct(scn()) ? X.MAXEV : C.MAXEV;
const tooMany = () => toast(isAct(scn()) ? `That’s the most events this calendar can hold (${X.MAXEV}).` : "That’s the most events a week can hold.");
// The week is shown with real dates, like Google Calendar: this week's Monday (next Monday on a weekend).
const WEEK = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); const w = d.getDay(); d.setDate(d.getDate() + (w === 0 ? 1 : w === 6 ? 2 : 1 - w)); return d; })();
const dayDate = i => { const d = new Date(WEEK); d.setDate(d.getDate() + i); return d; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const rangeLabel = () => { const a = dayDate(0), b = dayDate(4); return a.getMonth() === b.getMonth() ? `${MONTHS[a.getMonth()]} ${a.getFullYear()}` : `${MONTHS[a.getMonth()].slice(0, 3)} – ${MONTHS[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`; };

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["calsim"]);

const S = {guide:null, aiBusy:{}, id:null, data:null, loading:false, err:"", scn:0, events:[], result:null, timer:null, saved:null, drag:null, sel:null,
  week:0, caTop:null, picked:false, want:null,       // the activity: the week shown (0 or 1), the grid's scroll; picked: chosen on purpose
  anchor:null, noSave:false};                        // anchor: the trainee's record's (load()); noSave: the record couldn't be read
// The page's anchor: the trainee's record's once load() has read it (until then a guess for the display, from their Batch ID);
// a trainer's preview, the dates a batch starting this week would get. anchored(): the draft may be cleaned and saved.
const pageAnchor = () => isTrainee() ? (S.anchor || X.anchorForBatch(state.traineeBatch) || X.anchorNow()) : X.anchorNow();
const anchored = () => !isTrainee() || !!S.anchor;
const scn = () => C.SCENARIOS[S.scn];
const SCN_KEY = "ft-calsim-scn";                      // the scenario opened last (this browser)
// (the activity's draft is cleaned at the page's anchor, so only once the record's is known: before that, nothing is shown)
function setScn(i, soft){ S.scn = i; S.sel = null; S.result = null; S.week = 0; S.caTop = null; X.setAnchor(pageAnchor()); S.events = anchored() ? C.cleanFor(scn(), (S.data && S.data.drafts[scn().id]) || []) : [];
  if(!soft) try{ localStorage.setItem(SCN_KEY, scn().id); }catch(err){} }
try{ const i = C.SCENARIOS.findIndex(x => x.id === localStorage.getItem(SCN_KEY)); if(i >= 0) S.scn = i; }catch(err){}
// The remembered track is locked (and wasn't picked on purpose): show the first one that is open, and go back once it opens.
function autoPick(){
  if(S.picked) return;
  const want = S.want != null ? S.want : S.scn, i = openFor(C.SCENARIOS[want]) ? want : C.SCENARIOS.findIndex(openFor);
  if(i >= 0 && i !== S.scn){ S.want = want; setScn(i, true); }
}
function pickScn(i){ S.picked = true; S.want = null; if(i !== S.scn) setScn(i); else try{ localStorage.setItem(SCN_KEY, scn().id); }catch(err){} }
const scnIndex = id => { const i = C.SCENARIOS.findIndex(x => x.id === id); return i >= 0 ? i : C.SCENARIOS.findIndex(x => x.track === id); };
const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- the trainee's saved record ---------- */
const blank = () => ({v:2, anchors:{}, drafts:{}, autos:[], submissions:[], reviews:{}, external:[]});
// a stored submission's anchor: its own, else its record's (anchorOfRecord: July 2026 for one from before), kept per object by norm()
const SA = new WeakMap();
const subAnchor = z => z && X.okAnchor(z.anchor) ? z.anchor : SA.get(z) || X.BASE_FROM;
const atSub = (z, fn) => X.withAnchor(subAnchor(z), fn);
function norm(d){
  d = d || blank();
  d.drafts = d.drafts || {}; d.autos = d.autos || []; d.submissions = d.submissions || []; d.reviews = d.reviews || {}; d.external = d.external || [];
  // Records from the first version of the scheduler held placements, not events: they have nothing to show here.
  d.submissions = d.submissions.filter(x => Array.isArray(x.events));
  // a submission's time stamp and scenario id are the trainee's own writing: only real ones (they key reviews and the trainer's buttons)
  d.submissions = d.submissions.filter(x => typeof x.at === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,3})?Z$/.test(x.at) && typeof x.scn === "string" && /^[a-z0-9-]{1,40}$/.test(x.scn));
  Object.keys(d.drafts).forEach(k => { if(!Array.isArray(d.drafts[k])) delete d.drafts[k]; });
  // anchors: only Mondays the activity can take
  d.anchors = Object.fromEntries(Object.entries(d.anchors && typeof d.anchors === "object" && !Array.isArray(d.anchors) ? d.anchors : {}).filter(([k, v]) => X.okAnchor(v)));
  const ra = X.anchorOfRecord(d) || X.BASE_FROM; d.submissions.forEach(z => SA.set(z, ra));
  return d;
}
async function load(){
  // (whose page it is: a trainer after a trainee in the same tab starts empty, at this week's dates)
  if(!isTrainee()){ const was = S.who; S.who = ""; S.data = blank(); S.anchor = null; S.noSave = false; X.setAnchor(X.anchorNow());
    if(was !== ""){ S.events = []; S.result = null; S.sel = null; if(was != null && state.view === "calsim") render(); } return; }
  if(S.id !== state.traineeId) S.anchor = null;
  S.who = state.traineeId;
  S.loading = true; S.err = ""; S.id = state.traineeId;
  let d = null, made = false;
  // (strict: a failed read throws rather than looking like no record, so a blank is never saved over the trainee's work)
  try{ d = norm(await (typeof sharedGetStrict === "function" ? sharedGetStrict : sharedGet)("calsim:" + S.id)); }catch(err){}
  // the record's anchor FIRST (one without gets its own, saved below), and only then is its draft cleaned by date
  if(d){ let a = X.anchorOfRecord(d); if(!a){ a = X.ensureAnchor(d, state.traineeBatch).anchor; made = true; } S.anchor = a; S.noSave = false; }
  else{ d = blank(); S.anchor = X.anchorForBatch(state.traineeBatch) || X.anchorNow(); S.noSave = true; S.err = "Couldn’t load your saved work. You can still practice, but nothing is saved: check your connection and reload the page."; }
  S.data = d; X.setAnchor(S.anchor);
  S.loading = false;
  S.events = C.cleanFor(scn(), S.data.drafts[scn().id]);
  if(made) queueSave();
  S.caTop = null;     // the grid opens at the week's earliest saved event (a render while loading had none)
  if(state.view === "calsim" || state.view === "simulators") render();
}
function queueSave(){
  if(!isTrainee() || !S.data) return;
  S.data.updatedAt = new Date().toISOString();
  clearTimeout(S.timer); S.saved = "saving"; paintSave();
  S.timer = setTimeout(async () => { const ok = await saveRec(); S.saved = ok === "big" ? "big" : ok === false ? "fail" : "ok"; paintSave(); }, 800);
}
// The Worker refuses a record over 450 KB: say so plainly instead of failing as "not saved".
const LIMIT = 440000, ACT_SUBS = 8;
const fits = () => { try{ return JSON.stringify(S.data).length <= LIMIT; }catch(err){ return true; } };
// (never over a record that couldn't be read: it would be replaced by an empty one)
async function saveRec(){ if(S.noSave) return false; if(!fits()) return "big"; return sharedSet("calsim:" + S.id, S.data); }
const BIG = "⚠ Not saved: your calendar record is full. Delete events you don’t need, or ask your trainer to clear old submissions.";
function paintSave(){
  const el = document.getElementById("csSave"); if(!el) return;
  el.textContent = !isTrainee() ? "Trainer preview: nothing is saved." : S.saved === "saving" ? "Saving…" : S.saved === "big" ? BIG : S.saved === "fail" ? "⚠ Not saved. Check your connection." : S.saved === "ok" ? "All changes saved" : "";
}
async function saveNow(){
  changed();
  if(!isTrainee() || !S.data){ toast("Trainer preview: nothing is saved."); return; }
  clearTimeout(S.timer); S.saved = "saving"; paintSave();
  const ok = await saveRec(); S.saved = ok === "big" ? "big" : ok === false ? "fail" : "ok"; paintSave();
  toast(ok === "big" ? BIG : ok === false ? "Couldn’t save. Check your connection and try again." : "Changes saved.");
}
function changed(){
  S.result = null;
  if(S.data && anchored()){ S.data.drafts[scn().id] = JSON.parse(JSON.stringify(S.events)); queueSave(); }
}
const released = r => !!r && r.released !== false;
// A submission's automated review, worked out once per saved calendar (the trainer's list reviews every trainee's on each render).
// It is worked out at the submission's anchor (and cached with it).
const RV = new WeakMap();
function subReview(s, sub){ const at = subAnchor(sub), c = RV.get(sub); if(c && c.s === s && c.ev === sub.events && c.at === at) return c.g;
  const g = X.withAnchor(at, () => C.review(s, sub.events)); RV.set(sub, {s, ev:sub.events, at, g}); return g; }      // reviews saved before release existed count as released
const subs = id => S.data ? S.data.submissions.filter(x => x.scn === id) : [];
const subKey = x => x.scn + "|" + x.at;

/* ---------- the page ---------- */
function blockHTML(ev, mine, why, ro){
  const k = ev.kind || "", len = (ev.end || ev.start + ev.dur) - ev.start;
  const style = `top:${px(ev.start)}px;height:${Math.max(px(ev.start + len) - px(ev.start), 12)}px;`;
  const pad = ev.buffer ? `<div class="cs-buf" style="top:${px(ev.start - ev.buffer)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div><div class="cs-buf" style="top:${px(ev.end)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div>` : "";
  const icons = (ev.meet ? " 📹" : "") + (ev.remind ? " 🔔" : ""), warn = mine && why ? "⚠ " : "";
  const label = len <= 30 ? `<b>${warn}${e(ev.title || "(no title)")}<em>, ${hh(ev.start)}${icons}</em></b>` : `<b>${warn}${e(ev.title || "(no title)")}</b><span>${hh(ev.start)} – ${hh(ev.start + len)}${icons}</span>`;
  if(!mine) return pad + `<div class="cs-ev cs-fixed cs-${k}" style="${style}" title="${e(ev.note || ev.title)}">${label}</div>`;
  // The trainee's chosen color (a problem shows red instead, with ⚠); no color is the calendar's default blue.
  const col = !why && C.colorOf(ev.color), paint = col ? `background:${col.hex};border-left-color:${col.edge};` : "";
  const cls = `cs-ev cs-req ${why ? "cs-bad" : ""} ${S.sel === ev.id ? "cs-sel" : ""}`;
  if(ro) return `<div class="cs-ev cs-ro ${why ? "cs-bad" : ""} ${ev.hl ? "cs-hl" : ""}" style="${style}${paint}" title="${e(why ? why.join("; ") : col ? col.name : "")}">${label}</div>`;
  return `<div class="${cls}" data-ev="${e(ev.id)}" tabindex="0" role="button" title="${e(why ? why.join("; ") : (col ? col.name + ". " : "") + "Drag to move, drag the bottom edge to resize, double-click to edit")}" aria-label="${e(ev.title)}, ${C.DAYS[ev.day]} ${hh(ev.start)}${col ? ", " + e(col.name) : ""}. Arrow keys move it, Shift plus arrow resizes, Enter edits, Delete removes it." style="${style}${paint}">${label}<button class="cs-x" data-del="${e(ev.id)}" aria-label="Delete ${e(ev.title)}" tabindex="-1">✕</button><i class="cs-rs" data-rs="${e(ev.id)}"></i></div>`;
}
function gridHTML(s, events, ro, hl){
  s = s || scn(); events = events || S.events;
  if(isAct(s)) return ro ? actAgendaHTML(s, events, hl) : actGridHTML(s, events);
  const fl = C.flags(s, events), now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const times = []; for(let m = TOP + 60; m < BOTTOM; m += 60) times.push(`<div class="cs-time" style="top:${px(m) - 7}px">${hh(m)}</div>`);
  const cols = C.DAYS.map((name, d) => {
    const dt = dayDate(d), today = sameDay(dt, now);
    const blocks = s.fixed.filter(f => f.day === d).map(f => blockHTML(f, false)).join("")
      + events.filter(x => x.day === d).map(x => blockHTML({id:x.id, title:x.title, day:d, start:x.start, end:x.start + x.dur, meet:x.meet, remind:x.remind, color:x.color, hl:hl === x.id}, true, fl[x.id], ro)).join("")
      + (today && !ro && nowMin >= TOP && nowMin < BOTTOM ? `<div class="gc-now" style="top:${px(nowMin)}px"></div>` : "");
    return `<div class="cs-colwrap"><div class="cs-dayhd" title="${e(name)}"><span class="${today ? "gc-todayname" : ""}">${name.slice(0, 3).toUpperCase()}</span><b class="${today ? "gc-today" : ""}">${dt.getDate()}</b></div><div class="cs-col" data-day="${d}" style="height:${px(BOTTOM)}px">${blocks}</div></div>`;
  }).join("");
  return `<div class="cs-grid"><div class="cs-times"><div class="cs-dayhd cs-et" title="Eastern Time">ET</div><div class="cs-timecol" style="height:${px(BOTTOM)}px">${times.join("")}</div></div>${cols}</div>`;
}
// The toolbar above the week and the left rail (Create, a month, then the tasks), as in Google Calendar.
function toolbarHTML(){
  return `<div class="gc-bar"><span class="gc-logo">📅</span><span class="gc-brand">Calendar</span><span class="gc-range">${e(rangeLabel())}</span><span class="gc-view">Week</span><span class="gc-tz">Eastern Time</span></div>`;
}
function miniMonthHTML(){
  const m0 = dayDate(0), first = new Date(m0.getFullYear(), m0.getMonth(), 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const head = ["M","T","W","T","F","S","S"].map(x => `<i>${x}</i>`).join(""), now = new Date(); let cells = "";
  for(let r = 0; r < 6; r++){ const row = []; for(let c = 0; c < 7; c++){ const d = new Date(start); d.setDate(start.getDate() + r * 7 + c);
    const inWeek = d >= dayDate(0) && d <= dayDate(4), cls = [d.getMonth() !== m0.getMonth() ? "out" : "", sameDay(d, now) ? "today" : "", inWeek ? "wk" : ""].join(" ");
    row.push(`<span class="${cls}">${d.getDate()}</span>`); } cells += `<div class="gc-mrow">${row.join("")}</div>`; if(r >= 3 && new Date(start.getTime() + (r + 1) * 7 * 864e5).getMonth() !== m0.getMonth()) break; }
  return `<div class="gc-mini"><div class="gc-mini-hd">${MONTHS[m0.getMonth()]} ${m0.getFullYear()}</div><div class="gc-mrow gc-mdow">${head}</div>${cells}</div>`;
}
function tasksHTML(){
  const s = scn();
  return `<div class="cs-tray" id="csTray"><button class="gc-create" onclick="FTCalSim.add()"><svg width="24" height="24" viewBox="0 0 36 36" aria-hidden="true"><path fill="#34A853" d="M16 16v14h4V20z"/><path fill="#4285F4" d="M30 16H20l-4 4h14z"/><path fill="#FBBC05" d="M6 16v4h10l4-4z"/><path fill="#EA4335" d="M20 16V6h-4v14z"/></svg>Create</button>${miniMonthHTML()}<h3>📋 Your tasks <span class="cs-count">${s.tasks.length} to schedule</span></h3>
    <p class="cs-hint">Put each of these on the week as an event, named after the task, with a description. Drag on an empty part of the calendar to add one.</p>
    <p class="cs-hint cs-rule">🎨 <b>Attorney’s color rule:</b> ${e(C.COLOR_RULE_TEXT)}</p>
    ${s.tasks.map(r => `<div class="cs-task"><b>${e(r.title)}</b><span class="cs-dur">${r.dur} min</span>${(r.needs || {}).meet ? '<span class="cs-dur cs-chip">📹 Google Meet</span>' : ""}${(r.needs || {}).remind ? '<span class="cs-dur cs-chip">🔔 Reminder</span>' : ""}<p>${e(r.note)}</p></div>`).join("")}</div>`;
}

/* ---------- 🗓 the Attorney Calendar Management Activity: the attorney's Google Calendar, two weeks in Pacific Time ---------- */
const CREATE_SVG = `<svg width="24" height="24" viewBox="0 0 36 36" aria-hidden="true"><path fill="#34A853" d="M16 16v14h4V20z"/><path fill="#4285F4" d="M30 16H20l-4 4h14z"/><path fill="#FBBC05" d="M6 16v4h10l4-4z"/><path fill="#EA4335" d="M20 16V6h-4v14z"/></svg>`;
const gmt = abs => { const o = X.offAt(X.CAL_TZ, abs), a = Math.abs(o); return `GMT${o < 0 ? "-" : "+"}${String(Math.floor(a / 60)).padStart(2, "0")}${a % 60 ? ":" + String(a % 60).padStart(2, "0") : ""}`; };
const dayParts = d => X.dLabel(d).split(" ");          // ["Mon", "Jul", "6"], at the page's anchor
const weekOf = day => day >= 7 ? 1 : 0;
// "November 2 – 8, 2026", "Nov 30 – Dec 6, 2026", "Dec 28, 2026 – Jan 3, 2027"
const rangeText = (a, b) => { const p = dayParts(a), q = dayParts(b), ya = X.dYear(a), yb = X.dYear(b);
  return ya !== yb ? `${p[1]} ${p[2]}, ${ya} – ${q[1]} ${q[2]}, ${yb}` : p[1] === q[1] ? `${MONTHS[MONTHS.findIndex(m => m.startsWith(p[1]))]} ${p[2]} – ${q[2]}, ${yb}` : `${p[1]} ${p[2]} – ${q[1]} ${q[2]}, ${yb}`; };
// The trainee's color, or the calendar's default (no color chosen: a pale blue, so it never passes for Peacock).
const paintOf = x => { const c = C.colorOf(x.color); return c ? `background:${c.hex};border-left-color:${c.edge};${c.id === "banana" ? "color:#202124;" : ""}` : ""; };
const ACT_HINT = "Pacific Time: the attorney is in Seattle. Drag on an empty spot to add an event · drag to move · drag the bottom edge to resize · double-click (or Enter) to edit its details: date and time, time zone, location, guests, reminders, color, notes · ✕ deletes. Use All day for the overnight stay. ⚠ with a red ring: it overlaps another event.";
function actToolbarHTML(){
  const a = S.week * 7, b = Math.min(a + 6, X.NDAYS - 1);
  return `<div class="gc-bar ca-bar"><span class="gc-logo">📅</span><span class="gc-brand">Calendar</span><button type="button" class="ca-tbtn" onclick="FTCalSim.week(0, true)" title="Back to the first week">${e(dayParts(0).slice(1).join(" "))}</button>
    <button type="button" class="ca-nav" onclick="FTCalSim.week(-1)" ${S.week ? "" : "disabled"} aria-label="Previous week" title="Previous week">‹</button><button type="button" class="ca-nav" onclick="FTCalSim.week(1)" ${S.week ? "disabled" : ""} aria-label="Next week" title="Next week">›</button>
    <span class="gc-range">${e(rangeText(a, b))}</span><span class="gc-view">Week</span><span class="gc-tz">${e(gmt(X.absAt(X.dIso(a), 720, X.CAL_TZ)))} Pacific Time – Los Angeles</span></div>`;
}
// the month of the shown week (its Monday's), Monday first, as the Standard track's miniMonthHTML; the calendar's days are buttons
function actMiniMonthHTML(){
  const head = ["M","T","W","T","F","S","S"].map(x => `<i>${x}</i>`).join(""), w0 = X.dIso(S.week * 7), y = +w0.slice(0, 4), mo = +w0.slice(5, 7) - 1;
  const first = Date.UTC(y, mo, 1), start = first - ((new Date(first).getUTCDay() + 6) % 7) * 864e5; let cells = "";
  for(let r = 0; r < 6; r++){ if(r && new Date(start + r * 7 * 864e5).getUTCMonth() !== mo) break;
    const row = []; for(let c = 0; c < 7; c++){ const t = new Date(start + (r * 7 + c) * 864e5), i = X.dIdx(t.toISOString().slice(0, 10)), inGrid = i >= 0 && i < X.NDAYS;
    const cls = [t.getUTCMonth() !== mo ? "out" : "", i >= 0 && i <= X.LAST ? "ca-in" : "", inGrid && weekOf(i) === S.week ? "wk" : ""].join(" ");
    row.push(inGrid ? `<button type="button" class="${cls}" onclick="FTCalSim.week(${weekOf(i)}, true)" title="${e(X.dLabel(i))}">${t.getUTCDate()}</button>` : `<span class="${cls}">${t.getUTCDate()}</span>`); }
    cells += `<div class="gc-mrow">${row.join("")}</div>`; }
  return `<div class="gc-mini ca-mini"><div class="gc-mini-hd">${MONTHS[mo]} ${y}</div><div class="gc-mrow gc-mdow">${head}</div>${cells}</div>`;
}
function actTrayHTML(){
  const s = scn();
  const ins = s.instructions.map(x => `<li>${e(x.t)}${x.sub ? `<ul>${x.sub.map(y => `<li>${e(y)}</li>`).join("")}</ul>` : ""}</li>`).join("");
  const legend = Object.keys(s.cats).map(k => { const c = s.cats[k], c0 = C.colorOf(c.colors[0]);
    return `<div class="ca-lg"><i style="background:${c0.hex}"></i><span><b>${e(c.legend)}</b> – ${e(c.what)}</span><em>${e(c.colors.map(id => C.colorOf(id).name).join(" / "))}</em></div>`; }).join("");
  const people = s.people.map(p => `<div class="ca-pp"><b>${e(p.name)}</b><span>${e(p.email)}</span></div>`).join("");
  const line = l => `<span class="ca-l${/^➢/.test(l) ? 1 : /^▪/.test(l) ? 2 : 3}">${e(l)}</span>`;
  const items = s.itemsNow.map(it => `<div class="cs-task ca-item" role="button" tabindex="0" onclick="FTCalSim.week(${weekOf(X.dIdx(it.date))}, true)" onkeydown="if(event.key==='Enter')this.click()" title="Show its week"><b><span class="ca-n">${it.n}</span>${e(it.title)}</b>
    ${it.lines.map(([k, v]) => `<p><em>${e(k)}:</em> ${Array.isArray(v) ? `<span class="ca-sub">${v.map(line).join("")}</span>` : e(v)}</p>`).join("")}</div>`).join("");
  return `<div class="cs-tray ca-tray" id="csTray"><button class="gc-create" onclick="FTCalSim.add()">${CREATE_SVG}Create</button>${actMiniMonthHTML()}
    <details class="ca-box" open><summary>📋 Instructions</summary><p class="ca-intro">${e(s.intro)}</p><p class="ca-stand">${e(s.standIn)}</p><ol class="ca-ol">${ins}</ol></details>
    <details class="ca-box" open><summary>🎨 Color legend <span class="cs-count">in Google colors</span></summary>${legend}<p class="cs-hint">The first color is the legend’s; the shade after it is accepted too.</p></details>
    <details class="ca-box"><summary>👥 Guests</summary>${people}</details>
    <h3>🗂 Activity items <span class="cs-count">${s.items.length} items</span></h3><p class="cs-hint">Each item is an event, and its travel blocks are events of their own. Click an item to show its week.</p>${items}</div>`;
}
// Events that overlap sit side by side, as in Google Calendar: each gets a lane within its group of overlapping events.
function lanesOf(list){
  const out = new Map(), sorted = list.slice().sort((a, b) => a.p.start - b.p.start || b.p.end - a.p.end);
  let group = [], ends = [], end = -1;
  const flush = () => { group.forEach(o => { out.get(o.x.id).n = ends.length; }); group = []; ends = []; };
  sorted.forEach(o => { if(group.length && o.p.start >= end) flush();
    let l = ends.findIndex(t => t <= o.p.start); if(l < 0){ l = ends.length; ends.push(0); } ends[l] = o.p.end;
    out.set(o.x.id, {lane:l, n:1}); group.push(o); end = group.length === 1 ? o.p.end : Math.max(end, o.p.end); });
  flush();
  return out;
}
function actBlockHTML(x, p, why, ln){
  const end = Math.min(p.end, 1440), len = end - p.start, z = X.tzOf(x.tz), col = C.colorOf(x.color);
  const tag = x.tz !== X.CAL_TZ ? ` <i class="ca-zt" title="${e(z.name)}">${e(X.abbr(z, X.evAbs(x).s))}</i>` : "";
  const icons = (x.meet ? " 📹" : "") + (x.reminders.length ? " 🔔" : "") + (x.guests.length ? " 👥" : ""), warn = why ? "⚠ " : "", t = e(x.title || "(no title)");
  const label = len <= 30 ? `<b>${warn}${t}<em>, ${hh(p.start)}${icons}</em>${tag}</b>` : `<b>${warn}${t}</b><span>${hh(p.start)} – ${X.fmtE(end)}${icons}${tag}</span>${len >= 90 && x.loc ? `<span>${e(x.loc)}</span>` : ""}`;
  const tip = why ? why.join("; ") : `${col ? col.name : "No color yet"}${x.tz !== X.CAL_TZ ? `. Event zone: ${X.zoneText(x)}` : ""}. Drag to move, drag the bottom edge to resize, double-click to edit`;
  return `<div class="cs-ev cs-req ca-ev ${len <= 20 ? "ca-tiny" : len <= 30 ? "ca-short" : ""} ${col ? "" : "ca-nocol"} ${why ? "ca-bad" : ""} ${S.sel === x.id ? "cs-sel" : ""}" data-ev="${e(x.id)}" tabindex="0" role="button" title="${e(tip)}" aria-label="${e(x.title)}, ${e(X.whenOf(x))} Pacific${col ? ", " + e(col.name) : ""}. Arrow keys move it, Shift plus arrow resizes, Enter edits, Delete removes it." style="top:${apx(p.start)}px;height:${Math.max(apx(end) - apx(p.start) - 1, 11)}px;${ln && ln.n > 1 ? `left:calc(${ln.lane * 100 / ln.n}% + 2px);right:calc(${(ln.n - ln.lane - 1) * 100 / ln.n}% + 2px);` : ""}${paintOf(x)}">${label}<button class="cs-x" data-del="${e(x.id)}" aria-label="Delete ${e(x.title)}" tabindex="-1">✕</button><i class="cs-rs" data-rs="${e(x.id)}"></i></div>`;
}
function actGridHTML(s, events){
  const fl = C.flags(s, events), w0 = S.week * 7, days = [0, 1, 2, 3, 4, 5, 6].map(i => w0 + i), off = d => d > X.LAST;
  const pacs = events.map(x => ({x, p:X.pacOf(x)}));
  const hd = d => { const p = dayParts(d); return `<div class="ca-dh ${off(d) ? "ca-off" : ""}" ${off(d) ? `title="After the activity (${e(X.spanText(X.LAST))})"` : ""}><span>${p[0].toUpperCase()}</span><b>${p[2]}</b></div>`; };
  const chip = x => { const col = C.colorOf(x.color), why = fl[x.id];
    return `<div class="ca-adev ${col ? "" : "ca-nocol"} ${why ? "ca-bad" : ""} ${S.sel === x.id ? "cs-sel" : ""}" data-adev="${e(x.id)}" tabindex="0" role="button" title="${e(why ? why.join("; ") : (col ? col.name : "No color yet") + ". Click to edit")}" style="${paintOf(x)}">${why ? "⚠ " : ""}${e(x.title || "(no title)")}</div>`; };
  const ad = d => pacs.filter(o => o.p.allDay && d >= o.p.day && d < o.p.day + o.p.span).map(o => chip(o.x)).join("");
  const times = []; for(let m = 60; m < 1440; m += 60) times.push(`<div class="cs-time" style="top:${apx(m) - 7}px">${hh(m)}</div>`);
  const cols = days.map(d => `<div class="cs-col ca-col ${off(d) ? "ca-off" : ""}" data-day="${d}" style="height:${ACT_H}px">${(list => { const ln = lanesOf(list); return list.map(o => actBlockHTML(o.x, o.p, fl[o.x.id], ln.get(o.x.id))).join(""); })(pacs.filter(o => !o.p.allDay && o.p.day === d))}</div>`).join("");
  // the greyed days after the activity get narrow columns, so the activity's days keep the width
  const tpl = days.some(off) ? ` style="grid-template-columns:56px ${days.map(d => off(d) ? "minmax(34px,.3fr)" : "minmax(92px,1fr)").join(" ")};min-width:${56 + days.reduce((n, d) => n + (off(d) ? 34 : 92), 0)}px"` : "";
  return `<div class="ca-cal" id="caScroll"><div class="ca-sticky"><div class="ca-row"${tpl}><div class="ca-gmt">${e(gmt(X.absAt(X.dIso(w0), 720, X.CAL_TZ)))}</div>${days.map(hd).join("")}</div>
      <div class="ca-row ca-adrow"${tpl}><div class="ca-adl">All day</div>${days.map(d => `<div class="ca-ad ${off(d) ? "ca-off" : ""}">${ad(d)}</div>`).join("")}</div></div>
    <div class="ca-row ca-body"${tpl}><div class="cs-timecol" style="height:${ACT_H}px">${times.join("")}</div>${cols}</div></div>`;
}
// Read-only (a submission, the trainer's views): the calendar as Google's Schedule view, a row per event, by date.
function actAgendaHTML(s, events, hl){
  const fl = C.flags(s, events), rows = events.map(x => ({x, p:X.pacOf(x), a:X.evAbs(x)})).sort((a, b) => a.p.day - b.p.day || (b.x.allDay - a.x.allDay) || a.a.s - b.a.s);
  if(!rows.length) return `<div class="ca-agenda"><p class="cs-hint" style="padding:10px 14px;">No events.</p></div>`;
  let last = null;
  return `<div class="ca-agenda">${rows.map(({x, p}) => { const d = dayParts(p.day), col = C.colorOf(x.color), why = fl[x.id], zt = X.zoneText(x), first = p.day !== last; last = p.day;
    return `<div class="ca-ar ${first ? "ca-first" : ""} ${why && why.some(w => /^Overlaps/.test(w)) ? "ca-rbad" : ""} ${hl === x.id ? "ca-hl" : ""}" data-row="${e(x.id)}">
      <div class="ca-ad1">${first ? `<b>${d[2]}</b><span>${d[1].toUpperCase()}, ${d[0].toUpperCase()}</span>` : ""}</div>
      <div class="ca-at">${p.allDay ? (p.span > 1 ? `All day, to ${X.dLabel(p.day + p.span - 1)}` : "All day") : `${hh(p.start)} – ${X.fmtE(Math.min(p.end, 1440))}`}</div>
      <div><i class="ca-adot ${col ? "" : "ca-nocol"}" style="${col ? "background:" + col.hex : ""}" title="${e(col ? col.name : "No color")}"></i></div>
      <div class="ca-ax"><b>${why ? "⚠ " : ""}${e(x.title || "(no title)")}</b>${col ? ` <span class="ca-cn">${e(col.name)}</span>` : ' <span class="ca-cn">no color</span>'}
        <div class="ca-ameta">${[x.loc ? "📍 " + e(x.loc) : "", x.meet ? "📹 Google Meet" : "", x.guests.length ? "👥 " + e(x.guests.join(", ")) : "", x.reminders.length ? "🔔 " + e(x.reminders.map(X.remText).join(", ")) : ""].filter(Boolean).join(" · ")}</div>
        ${zt ? `<div class="ca-az">🌐 event zone: ${e(zt)}</div>` : ""}${x.desc ? `<div class="ca-adesc">${e(x.desc)}</div>` : ""}${why ? `<div class="ca-aw">${e(why.join("; "))}</div>` : ""}</div></div>`; }).join("")}</div>`;
}
const STATUS = {met:["✅", "Met"], partial:["◐", "Partly met"], missed:["✗", "Missed"]};
function aiBlock(ai, busy){
  if(busy) return `<div class="cs-ai"><b>🤖 AI feedback</b><p class="cs-hint">Checking your calendar against the rules and notes…</p></div>`;
  if(!ai) return "";
  if(ai.error) return `<div class="cs-ai"><b>🤖 AI feedback</b><p class="cs-hint">The AI check wasn’t available (${e(ai.error)}). The rule-by-rule review below is still accurate; your trainer will go through it with you.</p></div>`;
  return `<div class="cs-ai"><b>🤖 AI feedback</b>${ai.summary ? `<p>${e(ai.summary)}</p>` : ""}
    ${(ai.strengths || []).length ? `<div class="cs-lab">What’s working</div><ul class="cs-ul ok">${ai.strengths.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : ""}
    ${(ai.improve || []).length ? `<div class="cs-lab">Work on next</div><ul class="cs-ul">${ai.improve.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : ""}</div>`;
}
// Per-task lines: the AI's feedback and the trainer's own note on the task.
function taskFeedback(s, ai, r){
  const by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  return `<div class="cs-fbt">${s.tasks.map(t => { const a = by[t.id], n = r && r.tasks && r.tasks[t.id], st = a && STATUS[a.status];
    return `<div class="cs-fbi"><div class="cs-fbi-hd">${st ? st[0] : "•"} <b>${e(t.title)}</b>${st ? `<span class="cs-chip2 ${e(a.status)}">${st[1]}</span>` : ""}</div>${a && a.feedback ? `<p>🤖 ${e(a.feedback)}</p>` : ""}${n ? `<p class="cs-tn">👤 ${e(n)}</p>` : ""}</div>`; }).join("")}</div>`;
}
// What the trainee sees for a submission: the AI feedback at once, then the trainer's final feedback once released.
function feedbackPanel(s, sub, r){
  const busy = !!S.aiBusy[subKey(sub)] && !sub.ai, fin = released(r);
  return `<div class="cs-fb"><div class="cs-fb-hd"><h3>Feedback on your ${e(s.short)} submission</h3><span class="cs-pill ${fin ? "ok" : "warn"}">${fin ? "Final feedback" : "Waiting for your trainer"}</span></div>
    ${aiBlock(sub.ai, busy)}${sub.ai && !sub.ai.error && !fin ? taskFeedback(s, sub.ai, null) : ""}
    ${fin ? finalHTML(s, r, sub) + `<div class="cs-fb-btns"><button class="btn btn-navy btn-sm" onclick="FTCalSim.download(${js(s.id)})">⬇ Download my feedback</button><button class="btn btn-ghost btn-sm" onclick="FTCalSim.print(${js(s.id)})">🖨 Print / save as PDF</button></div>`
      : `<p class="cs-hint">Your trainer will go through this feedback with you, add anything the AI missed and their own notes. The finalized feedback report, with a copy you can download, appears here when they finish.</p>`}</div>`;
}
// The finalized report's three parts, from the facts of the rules plus the AI's wording: done correctly, needs improvement, missed.
function reportSections(s, sub, r){
  const ai = sub.ai && !sub.ai.error ? sub.ai : null, by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  const g = subReview(s, sub), out = {correct:[], improve:[], missed:[]};
  s.tasks.forEach(t => { const a = by[t.id], gi = g.items.find(z => z.id === t.id);
    const bucket = !gi.found ? "missed" : gi.perfect ? "correct" : "improve";
    out[bucket].push({title:t.title, text:(a && a.feedback) || (gi.perfect ? "Every rule is met." : gi.checks.filter(c => !c.ok).map(c => c.why).join(" ")), note:r && r.tasks && r.tasks[t.id] || ""}); });
  ((r && r.extra) || []).filter(Boolean).forEach(x => out.missed.push({title:"Added by your trainer", text:x, note:""}));
  return out;
}
const SECTION = [["correct", "✅", "Done correctly"], ["improve", "🔧", "Needs improvement"], ["missed", "❗", "Missed requirements"]];
function reportHTML(s, sub, r){
  const sec = reportSections(s, sub, r);
  return SECTION.map(([k, ic, title]) => `<div class="cs-rep ${k}"><div class="cs-rep-hd">${ic} ${title} <span class="cs-count">${sec[k].length}</span></div>${sec[k].length ? sec[k].map(x => `<div class="cs-fbi"><div class="cs-fbi-hd"><b>${e(x.title)}</b></div><p>${e(x.text)}</p>${x.note ? `<p class="cs-tn">👤 ${e(x.note)}</p>` : ""}</div>`).join("") : '<p class="cs-hint">Nothing here.</p>'}</div>`).join("");
}
function finalHTML(s, r, sub){
  return `<div class="cs-final"><div class="cs-final-hd">📄 Final feedback report${r.score != null ? ` · trainer score <b>${e(r.score)} / 100</b>` : ""}${r.releasedAt ? ` · ${e(new Date(r.releasedAt).toLocaleDateString())}` : ""}</div>
    ${reportHTML(s, sub, r)}
    ${r.comment ? `<div class="cs-rep insight"><div class="cs-rep-hd">👤 Trainer’s insights</div><p>${e(r.comment).replace(/\n/g, "<br>")}</p></div>` : ""}</div>`;
}
// The automated review's panel (also used on the trainer's screen). `notes`: the trainer's comment on each task, if any.
function reviewHTML(g, notes){
  notes = notes || {};
  if(g.kind === "activity") return actReviewHTML(g, notes);
  const act = g.kind === "activity", info = g.extras.filter(x => !x.why.length && x.info);
  return `<div class="cs-result ${g.passed ? "ok" : "bad"}"><div class="cs-score"><b>${g.pct}%</b><span>${g.passed ? (act ? "✅ Passes" : "✅ Meets the attorney’s rules") : "Not yet"} · ${C.PASS}% passes · ${g.done} of ${g.items.length} ${act ? "events perfect" : "tasks perfect"}</span></div>
    ${g.items.map(i => `<div class="cs-item ${i.perfect ? "ok" : "bad"}"><div class="cs-item-hd">${i.perfect ? "✓" : "✗"} <b>${e(i.title)}</b> <span>${i.pts} / ${i.weight}</span></div>
      ${i.perfect ? "" : `<ul>${i.checks.filter(c => !c.ok).map(c => `<li><b>${e(c.label)}:</b> ${e(c.why)}</li>`).join("")}</ul>`}${(i.info || []).map(t => `<div class="cs-tinfo">ℹ ${e(t)}</div>`).join("")}${notes[i.id] ? `<div class="cs-tnote">👤 ${e(notes[i.id])}</div>` : ""}</div>`).join("")}
    ${g.extras.filter(x => x.why.length).length ? `<div class="cs-item bad"><div class="cs-item-hd">⚠ <b>Other events with problems</b></div><ul>${g.extras.filter(x => x.why.length).map(x => `<li><b>${e(x.title)}</b> (${x.when ? e(x.when) : C.DAYS[x.day].slice(0, 3) + " " + hh(x.start)}): ${e(x.why.join("; "))}</li>`).join("")}</ul></div>` : ""}${info.length ? `<div class="cs-item"><div class="cs-item-hd">ℹ <b>Other events</b></div><ul class="cs-tinfo-ul">${info.map(x => `<li><b>${e(x.title || "(no title)")}</b> (${e(x.when)}): ${e(x.info)}</li>`).join("")}</ul></div>` : ""}</div>`;
}
// The activity's panel: the Calendar Activity Check's verdict on every field of each event (✓, or ✗ with the Check's fix), the
// simulator's own checks (🎨 the colour; the whole calendar's overlaps and duplicates), and the ℹ lines that aren't scored.
// ← Back: to the deck's slide the page was opened from, else the Simulators page
const backBtn = () => S.from ? `<button class="btn btn-ghost btn-sm" onclick="FTCalSim.back()">← Back to the slides</button>` : `<button class="btn btn-ghost btn-sm" onclick="goto('simulators')">← Simulators</button>`;
const CHECK_LINK = () => window.FTCalCheck ? `<button type="button" class="btn btn-ghost btn-sm ca-cklink" onclick="FTCalSim.toCheck()" title="Copies this calendar’s events into your Calendar Activity Check, then opens it: each field is checked there">✅ Check this calendar in the Calendar Activity Check</button>` : "";
// ✅ the Calendar Activity Check (#/calcheck) verifies what is done here: this calendar's events, as the Check's entries (the review's
// own mapping), go into the trainee's Check draft (asked first when the draft holds other entries), then the Check opens. Its
// submissions stay. A trainer's preview, or an empty calendar, only opens it.
async function toCheck(){
  const K = window.FTCalCheck, s = scn();
  if(!K || !isAct(s) || !isTrainee() || !S.events.length){ goto("calcheck"); return; }
  const g = C.review(s, S.events);
  if(g.error || !g.entries){ goto("calcheck"); return; }
  try{ await K.reload(); }catch(err){}
  const R = K.state();
  if(!R || !R.rec || R.failed){ toast("Couldn’t read your Calendar Activity Check, so nothing was copied. Check your connection."); goto("calcheck"); return; }
  const typed = Object.values(R.rec.entries || {}).some(v => Object.entries(v || {}).some(([f, x]) => f !== "runit" && x !== "" && x !== false && x != null));
  if(typed && JSON.stringify(R.rec.entries) !== JSON.stringify(g.entries) && !confirm("Copy this calendar into your Calendar Activity Check?\n\nIts events replace the ones typed there now. Your submissions stay.")){ goto("calcheck"); return; }
  R.rec.entries = JSON.parse(JSON.stringify(g.entries)); R.rec.anchor = X.anchor();      // the dates they were copied at
  const ok = await K.save();
  toast(ok === false ? "Couldn’t save to the Calendar Activity Check. Check your connection." : `📋 ${Object.keys(g.entries).length} events copied into your Calendar Activity Check: each field is checked there.`);
  goto("calcheck");
}
function actReviewHTML(g, notes){
  if(g.error) return `<div class="cs-err">${e(g.error)}</div>`;
  const info = g.extras.filter(x => !x.why.length && x.info), bad = g.extras.filter(x => x.why.length);
  const field = c => c.ok ? `<li class="ok">✓ ${e(c.label)}${c.sim ? " 🎨" : ""}</li>` : `<li class="no">✗ <b>${e(c.label)}${c.sim ? " 🎨" : ""}</b><span>${e(c.why)}</span></li>`;
  return `<div class="cs-result ca-result ${g.passed ? "ok" : "bad"}"><div class="cs-score"><b>${g.pct}%</b><span>${g.passed ? "✅ Passes" : "Not yet"} · ${C.PASS}% passes · ${g.done} of ${g.items.length} events perfect · ${g.score} of ${g.max} fields right</span></div>
    <div class="ca-ckline">📅 <b>Calendar Activity Check:</b> ${g.check.met} of ${g.check.total} fields right (${g.check.pct}%) · 🎨 <b>Simulator checks</b> (color, guests’ emails, travel routes and reminders, overlaps, duplicates): ${g.sim.met} of ${g.sim.total} ${CHECK_LINK()}</div>
    ${g.items.map(i => `<div class="cs-item ${i.perfect ? "ok" : "bad"}"><div class="cs-item-hd">${i.perfect ? "✓" : "✗"} <b>${e(i.title)}</b>${i.event ? `<em class="ca-as">“${e(i.event.title || "(no title)")}”</em>` : ""} <span>${i.pts} / ${i.weight}</span></div>
      <ul class="ca-fields">${i.checks.filter(c => c.ok).map(field).join("")}${i.checks.filter(c => !c.ok).map(field).join("")}</ul>${(i.info || []).map(t => `<div class="cs-tinfo">ℹ ${e(t)}</div>`).join("")}${notes[i.id] ? `<div class="cs-tnote">👤 ${e(notes[i.id])}</div>` : ""}</div>`).join("")}
    ${bad.length ? `<div class="cs-item bad"><div class="cs-item-hd">⚠ <b>Other events with problems</b></div><ul>${bad.map(x => `<li><b>${e(x.title)}</b> (${e(x.when)}): ${e(x.why.join("; "))}</li>`).join("")}</ul></div>` : ""}${info.length ? `<div class="cs-item"><div class="cs-item-hd">ℹ <b>Other events</b></div><ul class="cs-tinfo-ul">${info.map(x => `<li><b>${e(x.title || "(no title)")}</b> (${e(x.when)}): ${e(x.info)}</li>`).join("")}</ul></div>` : ""}
    <p class="cs-hint">✓/✗ without 🎨 are the 📅 Calendar Activity Check’s own verdicts (the same check, field by field); 🎨 are this calendar’s (what the Check can’t see or doesn’t ask: colors, email addresses, a travel block’s route and reminder, the whole calendar). Every field counts one.</p></div>`;
}
function resultHTML(){ return S.result ? reviewHTML(S.result) + `<p class="cs-hint">Fix what’s marked, then run the review again. Submit when you’re happy with it.</p>` : ""; }
const bestAuto = id => (S.data ? S.data.autos : []).filter(a => a.scn === id).reduce((m, a) => Math.max(m, a.pct), -1);
function historyHTML(){
  if(!S.data) return "";
  const pv = S.previewAI && S.previewAI.scn === scn().id ? `<div class="cs-hist-row"><span class="cs-pill warn">Trainer preview (not saved)</span>${aiBlock(S.previewAI.ai)}${S.previewAI.ai.error ? "" : taskFeedback(scn(), S.previewAI.ai, null)}</div>` : (S.aiBusy.preview ? `<div class="cs-hist-row">${aiBlock(null, true)}</div>` : "");
  const rows = C.SCENARIOS.map(s => {
    const list = subs(s.id), last = list[list.length - 1];
    const ba = bestAuto(s.id), autoPill = ba >= 0 ? `<span class="cs-pill ${ba >= C.PASS ? "ok" : ""}">🤖 ${e(s.short)} automated review: best ${ba}%</span>` : "";
    if(!last) return `<div class="cs-hist-row"><span class="cs-pill">${e(s.short)}: not submitted</span>${autoPill}</div>`;
    const r = S.data.reviews[subKey(last)], au = subReview(s, last);
    return atSub(last, () => `<div class="cs-hist-row"><span class="cs-pill ok">📤 ${e(s.short)} submitted ${e(new Date(last.at).toLocaleString())}</span><span class="cs-pill ${au.passed ? "ok" : ""}">🤖 Automated: ${au.pct}%</span>${autoPill}${released(r) ? "" : `<span class="cs-pill">Waiting for your trainer’s feedback</span>`}${feedbackPanel(s, last, r)}</div>`);
  }).join("");
  const ext = S.data.external.slice(-3).reverse().map(x => `<span class="cs-pill">${e(x.title || "Simulator")}: ${Math.round(x.score)}/${Math.round(x.max)}</span>`).join("");
  return `<div class="cs-hist">${evalHTML()}${pv}${rows}${ext}</div>`;
}
// The trainee's own space for this week: the calendar as submitted, the automated review, and the AI review set up by the trainer's rules.
function evalHTML(){
  const s = scn(), list = subs(s.id), last = list[list.length - 1];
  const head = `<div class="cs-eval-hd"><h2>📋 My submitted evaluation · ${e(s.short)}</h2></div>`;
  if(!last) return `<div class="card cs-eval">${head}<p class="cs-hint">Nothing submitted for ${e(s.short)} yet. Build the week, then press <b>📤 Submit to my trainer</b>: your submitted calendar and the AI review appear here.</p></div>`;
  // (at the submission's anchor: its dates, and the events its dates keep)
  return atSub(last, () => { const au = subReview(s, last), key = subKey(last), busy = !!S.aiBusy[key] && !last.ai, r = S.data.reviews[key];
  const evs = C.cleanFor(s, last.events);
  return `<div class="card cs-eval">${head}
    <div class="cs-hist-row"><span class="cs-pill ok">📤 Submitted ${e(new Date(last.at).toLocaleString())}</span><span class="cs-pill ${au.passed ? "ok" : ""}">🤖 Automated: ${au.pct}%</span><span class="cs-pill">${isAct(s) ? `${evs.length} event${evs.length === 1 ? "" : "s"} · ${s.key.length} expected` : `${evs.length} of ${s.tasks.length} tasks scheduled`}</span>${list.length > 1 ? `<span class="cs-pill">Submission ${list.length} of ${list.length}</span>` : ""}${released(r) ? `<span class="cs-pill ok">👤 Trainer ${e(r.score)}/100</span>` : ""}</div>
    <div class="cs-eval-cols"><div><h3>Calendar as submitted</h3><div class="gc-shell"><div class="cs-gridwrap">${gridHTML(s, evs, true)}</div></div></div>
      <div><h3>🤖 AI review</h3>${aiBlock(last.ai, busy) || `<p class="cs-hint">No AI review for this submission.</p>`}${last.ai && !last.ai.error ? taskFeedback(s, last.ai, null) : ""}
        <h3>Rule-by-rule review</h3>${reviewHTML(au)}</div></div></div>`; });
}
function renderPage(){
  autoPick();
  const s = scn();
  const tk = trackOf();
  const tracks = C.TRACKS.map(x => `<button class="cs-tab ${x.id === tk.id ? "active" : ""}" onclick="FTCalSim.open('${x.id}')">${x.icon} ${e(x.title)} <i>${e(x.where)}</i></button>`).join("");
  const weeks = C.SCENARIOS.filter(x => x.track === tk.id).length > 1 ? C.SCENARIOS.map((x, i) => x.track === tk.id ? `<button class="cs-tab cs-wk ${i === S.scn ? "active" : ""}" onclick="FTCalSim.pick(${i})">${e(x.title)} <i>${e(x.level)}</i></button>` : "").join("") : "";
  const tabs = tracks + `</div>` + (weeks ? `<div class="cs-tabs cs-weeks">` + weeks : "<div hidden>");      // used as <div class="cs-tabs">${tabs}</div>
  // locked: the tabs stay, so a track that is open can still be picked
  if(!open()) return `<div class="cs-wrap"><h1>📅 Calendaring Simulators</h1><div class="cs-tabs">${tabs}</div><div class="card" style="padding:20px;">🔒 ${isAct(s) ? "The Attorney Calendar Management Activity opens on Day 5, when your trainer opens it." : `This simulator opens with Lesson ${LESSON}, Calendaring &amp; Appointment Setting.`}</div></div>`;
  if(isAct(s)) return `<div class="cs-wrap cs-act"><div class="cs-top"><h1>📅 Calendaring Simulators</h1><div class="cs-tabs">${tracks}</div>
      <div class="ca-back">${backBtn()}</div></div>
    ${weeks ? `<div class="cs-tabs cs-weeks">${weeks}</div>` : ""}<p class="cs-blurb">${e(tk.blurb)} ${CHECK_LINK()}</p>
    ${S.err ? `<div class="cs-err">${e(S.err)}</div>` : ""}
    <div class="cs-main">${actTrayHTML()}<div class="gc-shell">${actToolbarHTML()}<div class="cs-gridwrap">${gridHTML()}</div><p class="cs-hint cs-legend">${e(ACT_HINT)}</p></div></div>
    <div class="cs-actions"><button class="btn btn-navy" onclick="FTCalSim.save()">💾 Save changes</button>
      <button class="btn btn-navy" onclick="FTCalSim.review()">🤖 Run automated review</button>
      <button class="btn btn-primary" onclick="FTCalSim.submit()">📤 Submit to my trainer</button>
      <button class="btn btn-ghost" onclick="FTCalSim.add()">＋ Add event</button>
      <button class="btn btn-ghost" onclick="FTCalSim.reset()">↺ Clear my events</button><span class="cs-save" id="csSave"></span></div>
    <p class="cs-hint">The automated review is the 📅 Calendar Activity Check’s: every item and travel block, field by field (title, dates and times in the event’s own time zone, the zone, location, guests, reminder, notes), with this calendar’s own checks on top (the color, no overlaps, no duplicates). Every field counts one (${C.PASS}% passes), and it tells you what to fix. Your trainer then adds their own feedback to what you submit.</p>
    <div id="csResultBox">${resultHTML()}</div>
    ${historyHTML()}</div>`;
  return `<div class="cs-wrap"><div class="cs-top"><div><h1>📅 Calendaring Simulators</h1>
      <p class="cs-lead">${tk.icon} <b>${e(tk.title)}</b> · ${e(tk.where)}. Build the week in a Google Calendar style, run the automated review, then submit it to your trainer.</p></div>
      <div>${backBtn()}</div></div>
    <div class="cs-tabs">${tabs}</div>
    <p class="cs-blurb">${e(tk.blurb)}</p>
    <div class="card cs-brief">${e(s.brief)} ${e(C.COLOR_RULE_TEXT)}</div>
    ${S.err ? `<div class="cs-err">${e(S.err)}</div>` : ""}
    <div class="cs-main">${tasksHTML()}<div class="gc-shell">${toolbarHTML()}<div class="cs-gridwrap">${gridHTML()}</div><p class="cs-hint cs-legend">Eastern Time. Drag on an empty spot to add an event · drag to move · drag the bottom edge to resize · double-click to edit its details (title, time, guests, Google Meet, reminder, color, description) · ✕ deletes. Red with ⚠ means a clash, missing travel time or outside 9 to 5.</p></div></div>
    <div class="cs-actions"><button class="btn btn-navy" onclick="FTCalSim.save()">💾 Save changes</button>
      <button class="btn btn-navy" onclick="FTCalSim.review()">🤖 Run automated review</button>
      <button class="btn btn-primary" onclick="FTCalSim.submit()">📤 Submit to my trainer</button>
      <button class="btn btn-ghost" onclick="FTCalSim.add()">＋ Add event</button>
      <button class="btn btn-ghost" onclick="FTCalSim.reset()">↺ Clear my events</button><span class="cs-save" id="csSave"></span></div>
    <p class="cs-hint">The automated review checks your calendar against the attorney’s rules (conflicts, travel time, business hours, each task’s days and times, the color for its length) and tells you what to fix. Your trainer then adds their own feedback to what you submit.</p>
    <div id="csResultBox">${resultHTML()}</div>
    ${historyHTML()}
    <div class="card cs-more"><b>🔗 Also graded for your trainer</b><p>The Portal’s Calendaring Simulator is another week of scheduling conflicts. It opens in its own tab with your name and batch, so its score is saved for your trainer too.</p>
      <a class="btn btn-ghost btn-sm" href="${e(portalHref())}" target="_blank" rel="noopener">Open the Portal’s Calendaring Simulator ↗</a></div></div>`;
}
function portalHref(){
  const q = new URLSearchParams({program:"FT"});
  if(isTrainee()){ const n = state.certName || state.traineeName; if(n) q.set("name", n); if(state.traineeBatch) q.set("batch", state.traineeBatch); }
  return PORTAL + "calendar.html?" + q;
}
// The activity's grid keeps its scroll across repaints (6 AM, or the week's earliest event, the first time).
function restoreTop(){
  const el = document.getElementById("caScroll"); if(!el) return;
  if(S.caTop == null){ const w0 = S.week * 7, first = S.events.map(x => X.pacOf(x)).filter(p => !p.allDay && p.day >= w0 && p.day < w0 + 7).reduce((m, p) => Math.min(m, p.start), 6 * 60);
    S.caTop = Math.max(0, apx(first) - (first < 6 * 60 ? 24 : 10)); }
  el.scrollTop = S.caTop;
}
function repaint(){
  const gw = document.querySelector(".cs-gridwrap"); if(!gw){ render(); return; }
  X.setAnchor(pageAnchor());
  gw.innerHTML = gridHTML(); restoreTop();
  const h = document.querySelector(".cs-hist"); if(h) h.outerHTML = historyHTML();
  const box = document.getElementById("csResultBox"); if(box) box.innerHTML = resultHTML();
  paintSave();
}

/* ---------- dragging (pointer events: mouse, pen and touch) ---------- */
// mode: "new" (drag on empty space), "move", "resize"
// The grid's geometry: the Standard week (8 AM to 6 PM, SH px a slot) or the activity's day (midnight to midnight, ASH px a slot).
const geo = s => isAct(s) ? {top:0, bottom:1440, sh:ASH} : {top:TOP, bottom:BOTTOM, sh:SH};
function colAt(x, y, g){
  g = g || geo(scn());
  for(const c of document.querySelectorAll(".cs-col")){
    if(c.classList.contains("ca-off")) continue;      // the days after the activity: nothing goes there
    const r = c.getBoundingClientRect();
    if(x >= r.left && x <= r.right && y >= r.top - g.sh && y <= r.bottom + g.sh) return {col:c, day:+c.dataset.day, rect:r};
  }
  return null;
}
const snap = (y, top, g) => { g = g || geo(scn()); return g.top + Math.round((y - top) / g.sh) * C.STEP; };
const clampStart = (st, dur, g) => { g = g || geo(scn()); return Math.max(g.top, Math.min(g.bottom - dur, st)); };
// The activity: an event in the trainee's own time zone can't run past its own midnight (nor past midnight Pacific).
const actMaxEnd = (x, day) => Math.min(1440, X.absAt(x.date, 1440, x.tz) - X.absAt(X.dIso(day), 0, X.CAL_TZ));
const actClash = (a, b) => !a.allDay && !b.allDay && a.id !== b.id && (p => p.a.s < p.b.e && p.b.s < p.a.e)({a:X.evAbs(a), b:X.evAbs(b)});
// What a drag would make of the event (the activity), in its own zone.
function actCand(d, cur){
  if(d.mode === "new") return {id:"_new", title:"", date:X.dIso(cur.day), allDay:false, start:cur.start, dur:cur.dur, tz:X.CAL_TZ};
  if(d.mode === "resize") return Object.assign({}, d.x, {dur:cur.dur});
  const f = X.fromPac(cur.day, cur.start, d.x.tz); return Object.assign({}, d.x, {date:f.date, start:f.start});
}
function startDrag(ev, mode, id){
  const s = scn(), g = geo(s), act = isAct(s);
  const col = ev.target.closest(".cs-col"); if(mode === "new" && (!col || col.classList.contains("ca-off"))) return;
  const x = S.events.find(q => q.id === id); if(mode !== "new" && !x) return;
  const el = id ? document.querySelector(`.cs-req[data-ev="${CSS.escape(id)}"]`) : null, rect = el && el.getBoundingClientRect();
  const r0 = col && col.getBoundingClientRect();
  S.drag = {mode, id, sx:ev.clientX, sy:ev.clientY, pid:ev.pointerId, moved:false, x, g, act, p:x ? (act ? X.pacOf(x) : {day:x.day, start:x.start}) : null, grab:rect ? ev.clientY - rect.top : 0, w:rect ? rect.width : 0,
    stay:act ? (X.match(s, S.events)[X.STAY] || {}).id : null,
    anchor:mode === "new" ? {day:+col.dataset.day, start:Math.max(g.top, Math.min(g.bottom - C.STEP, g.top + Math.floor((ev.clientY - r0.top) / g.sh) * C.STEP))} : null, prev:null, ghost:null, cur:null};
  window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
}
function onMove(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  const g = d.g;
  if(!d.moved){ if(Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 5) return; d.moved = true; document.body.classList.add("cs-dragging");
    d.prev = document.createElement("div"); d.prev.className = "cs-prev";
    if(d.mode === "move"){ d.ghost = document.createElement("div"); d.ghost.className = "cs-ghost"; d.ghost.style.cssText = `width:${d.w}px;height:${Math.max(d.x.dur / C.STEP * g.sh, 24)}px;`; d.ghost.innerHTML = `<b>${e(d.x.title)}</b>`; document.body.appendChild(d.ghost);
      const own = document.querySelector(`.cs-req[data-ev="${CSS.escape(d.id)}"]`); if(own) own.classList.add("cs-lifted"); } }
  ev.preventDefault();
  // the activity's grid scrolls inside its box: near its top or bottom edge, a drag scrolls it
  const box = d.act && document.getElementById("caScroll");
  if(box){ const r = box.getBoundingClientRect(), hd = (box.querySelector(".ca-sticky") || {}).offsetHeight || 0;
    if(ev.clientY < r.top + hd + 24) box.scrollTop -= 14; else if(ev.clientY > r.bottom - 24) box.scrollTop += 14; }
  let cur = null;
  if(d.mode === "move"){
    d.ghost.style.left = (ev.clientX - d.w / 2) + "px"; d.ghost.style.top = (ev.clientY - d.grab) + "px";
    const h = colAt(ev.clientX, ev.clientY, g);
    if(h) cur = {day:h.day, start:clampStart(snap(ev.clientY - d.grab, h.rect.top, g), d.x.dur, g), dur:d.x.dur, col:h.col};
  }else if(d.mode === "resize"){
    const c = document.querySelector(`.cs-col[data-day="${d.p.day}"]`), r = c.getBoundingClientRect();
    const end = Math.max(d.p.start + C.STEP, Math.min(d.act ? actMaxEnd(d.x, d.p.day) : g.bottom, snap(ev.clientY, r.top, g)));
    cur = {day:d.p.day, start:d.p.start, dur:end - d.p.start, col:c};
  }else{
    const a = d.anchor, c = document.querySelector(`.cs-col[data-day="${a.day}"]`), r = c.getBoundingClientRect();
    const end = Math.max(a.start + C.STEP, Math.min(g.bottom, g.top + Math.ceil((ev.clientY - r.top) / g.sh) * C.STEP));
    cur = {day:a.day, start:a.start, dur:end - a.start, col:c};
  }
  d.cur = cur;
  if(cur){
    cur.col.appendChild(d.prev);
    let bad;
    if(d.act){ const cand = actCand(d, cur); bad = !!X.valid(cand) || (cand.id !== d.stay && S.events.some(o => o.id !== cand.id && o.id !== d.stay && actClash(cand, o))); }
    else{
      const me = {id:d.id || "_new", day:cur.day, start:cur.start, end:cur.start + cur.dur};
      const evs = C.all(scn(), S.events.filter(q => q.id !== d.id));
      bad = evs.some(o => C.overlap(me, o, o.buffer || 0)) || me.start < C.OPEN || me.end > C.CLOSE;
    }
    d.prev.className = "cs-prev " + (bad ? "bad" : "ok");
    d.prev.style.cssText = `top:${(cur.start - g.top) / C.STEP * g.sh}px;height:${cur.dur / C.STEP * g.sh}px;`;
    d.prev.textContent = hh(cur.start) + " – " + (d.act ? X.fmtE(cur.start + cur.dur) : hh(cur.start + cur.dur));
  }else if(d.prev.parentNode) d.prev.remove();
}
function endDrag(){
  const d = S.drag; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
  document.body.classList.remove("cs-dragging"); S.drag = null;
  if(d && d.ghost) d.ghost.remove(); if(d && d.prev) d.prev.remove();
  return d;
}
// The event editor, as in Google Calendar: title, when, guests, Google Meet, an email reminder and a description.
function closeModal(){ const m = document.getElementById("csModal"); if(m) m.remove(); }
function editor(x, isNew, done){
  closeModal();
  const opts = (from, to, sel, f) => { let o = ""; for(let m = from; m <= to; m += C.STEP) o += `<option value="${m}" ${m === sel ? "selected" : ""}>${f(m)}</option>`; return o; };
  const m = document.createElement("div"); m.id = "csModal"; m.className = "cs-modal";
  m.innerHTML = `<div class="cs-dlg" role="dialog" aria-modal="true" aria-label="Event details">
    <div class="cs-m-hd"><span class="cs-m-grip"></span><button class="cs-m-x" data-m="no" aria-label="Close">✕</button></div>
    <input id="csmTitle" class="cs-m-title" maxlength="80" placeholder="Add title" value="${e(x.title)}">
    <div class="cs-m-tabs"><span class="on">Event</span></div>
    <div class="cs-m-row"><i class="cs-m-ic">🕘</i><select id="csmDay">${C.DAYS.map((n, i) => `<option value="${i}" ${i === x.day ? "selected" : ""}>${n.slice(0, 3)}, ${MONTHS[dayDate(i).getMonth()].slice(0, 3)} ${dayDate(i).getDate()}</option>`).join("")}</select>
      <select id="csmStart">${opts(TOP, BOTTOM - C.STEP, x.start, hh)}</select><span>–</span><select id="csmEnd">${opts(TOP + C.STEP, BOTTOM, x.start + x.dur, hh)}</select></div>
    <div class="cs-m-sub">Eastern Time · Does not repeat</div>
    <label class="cs-m-row"><i class="cs-m-ic">👥</i><input id="csmGuests" maxlength="200" placeholder="Add guests (email addresses)" value="${e(x.guests)}"></label>
    <div class="cs-m-row"><i class="cs-m-ic">📹</i><button type="button" id="csmMeetBtn" class="cs-meet ${x.meet ? "on" : ""}">${x.meet ? "Join with Google Meet" : "Add Google Meet video conferencing"}</button><button type="button" id="csmMeetOff" class="cs-m-link" ${x.meet ? "" : "hidden"}>Remove</button><input type="checkbox" id="csmMeet" hidden ${x.meet ? "checked" : ""}></div>
    <label class="cs-m-row"><i class="cs-m-ic">🔔</i><input type="checkbox" id="csmRemind" ${x.remind ? "checked" : ""}> Email notification · 1 day before</label>
    <div class="cs-m-row"><i class="cs-m-ic">🎨</i><div class="cs-colors" role="radiogroup" aria-label="Event color"><button type="button" class="cs-sw cs-sw-def ${x.color ? "" : "on"}" data-c="" role="radio" aria-checked="${x.color ? "false" : "true"}" title="Default color" aria-label="Default color"></button>${C.COLORS.map(c => `<button type="button" class="cs-sw ${x.color === c.id ? "on" : ""}" data-c="${c.id}" role="radio" aria-checked="${x.color === c.id ? "true" : "false"}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join("")}</div><span class="cs-m-cname" id="csmColorName">${e((C.colorOf(x.color) || {}).name || "Default color")}</span><input type="hidden" id="csmColor" value="${e(x.color || "")}"></div>
    <label class="cs-m-row cs-m-top"><i class="cs-m-ic">≡</i><textarea id="csmDesc" rows="4" maxlength="300" placeholder="Add description">${e(x.desc)}</textarea></label>
    <div class="cs-m-btns">${isNew ? "" : `<button class="cs-gbtn" data-m="del">🗑 Delete</button>`}<span></span><button class="cs-gbtn cs-gblue" data-m="ok">Save</button></div></div>`;
  document.body.appendChild(m);
  const q = sel => m.querySelector(sel), title = q("#csmTitle"), st = q("#csmStart"), en = q("#csmEnd");
  const setMeet = on => { q("#csmMeet").checked = on; const b = q("#csmMeetBtn"); b.classList.toggle("on", on); b.textContent = on ? "Join with Google Meet" : "Add Google Meet video conferencing"; q("#csmMeetOff").hidden = !on; };
  q("#csmMeetBtn").onclick = () => setMeet(true); q("#csmMeetOff").onclick = () => setMeet(false);
  m.querySelectorAll(".cs-sw").forEach(b => { b.onclick = () => { const id = b.dataset.c; q("#csmColor").value = id;
    m.querySelectorAll(".cs-sw").forEach(o => { o.classList.toggle("on", o === b); o.setAttribute("aria-checked", o === b ? "true" : "false"); });
    q("#csmColorName").textContent = (C.colorOf(id) || {}).name || "Default color"; }; });
  st.onchange = () => { if(+en.value <= +st.value) en.value = String(Math.min(BOTTOM, +st.value + C.STEP)); };
  const save = () => { const t = title.value.trim(); if(!t){ toast("Add a title."); title.focus(); return; }
    if(+en.value <= +st.value){ toast("The event has to end after it starts."); return; }
    const v = {title:t.slice(0, 80), day:+q("#csmDay").value, start:+st.value, dur:+en.value - +st.value, guests:q("#csmGuests").value.trim().slice(0, 200), meet:q("#csmMeet").checked, remind:q("#csmRemind").checked, color:C.colorOf(q("#csmColor").value) ? q("#csmColor").value : "", desc:q("#csmDesc").value.trim().slice(0, 300)}; closeModal(); done(v); };
  m.addEventListener("click", ev => { const b = ev.target.closest("[data-m]"); if(b){ const k = b.dataset.m; if(k === "ok") save(); else if(k === "del"){ closeModal(); done(null, true); } else{ closeModal(); done(null); } } else if(ev.target === m){ closeModal(); done(null); } });
  m.addEventListener("keydown", ev => { if(ev.key === "Escape"){ ev.stopPropagation(); closeModal(); done(null); } else if(ev.key === "Enter" && ev.target === title){ ev.preventDefault(); save(); } });
  title.focus();
}
/* ---------- 🗓 the activity's event editor, like Google Calendar's: title, date and time, all day, the event's own time zone,
   location, guests, Google Meet, reminders, color and description ---------- */
const durText = d => d < 60 ? `${d} min` : `${+(d / 60).toFixed(2)} hr${d === 60 ? "" : "s"}`;
function actEditor(x, isNew, done){
  closeModal();
  const STEPM = C.STEP, G = x.guests.slice(), R = x.reminders.map(r => Object.assign({}, r));
  const dateOpts = sel => { const ids = []; for(let i = 0; i <= X.LAST; i++) ids.push(i); const si = X.dIdx(sel); if(!isNaN(si) && !ids.includes(si)) ids.push(si);
    return ids.sort((a, b) => a - b).map(i => `<option value="${X.dIso(i)}" ${X.dIso(i) === sel ? "selected" : ""}>${e(X.dLabel(i))}, ${X.dYear(i)}</option>`).join(""); };
  const startOpts = sel => { let o = ""; for(let m = 0; m < 1440; m += STEPM) o += `<option value="${m}" ${m === sel ? "selected" : ""}>${hh(m)}</option>`; return o; };
  const endOpts = (st, sel) => { let o = ""; for(let m = st + STEPM; m <= 1440; m += STEPM) o += `<option value="${m}" ${m === sel ? "selected" : ""}>${X.fmtE(m)} (${durText(m - st)})</option>`; return o; };
  const untilOpts = (date, span) => { const d0 = X.dIdx(date); let o = ""; for(let k = 1; k <= 7 && d0 + k - 1 <= X.NDAYS - 1; k++) o += `<option value="${k}" ${k === span ? "selected" : ""}>${e(X.dLabel(d0 + k - 1))}</option>`; return o; };
  const tzOpts = (sel, date) => X.TZS.map(z => `<option value="${z.id}" ${z.id === sel ? "selected" : ""}>${e(X.tzLabel(z, X.absAt(date, 720, z.id)))}</option>`).join("");
  const people = X.PEOPLE.map(p => `<option value="${e(p.name)} <${e(p.email)}>"></option>`).join("");
  const m = document.createElement("div"); m.id = "csModal"; m.className = "cs-modal";
  m.innerHTML = `<div class="cs-dlg ca-dlg" role="dialog" aria-modal="true" aria-label="Event details">
    <div class="cs-m-hd"><span class="cs-m-grip"></span><button class="cs-m-x" data-m="no" aria-label="Close">✕</button></div>
    <input id="camTitle" class="cs-m-title" maxlength="100" placeholder="Add title" value="${e(x.title)}">
    <div class="cs-m-tabs"><span class="on">Event</span></div>
    <div class="cs-m-row ca-when"><i class="cs-m-ic">🕘</i><select id="camDate" aria-label="Date">${dateOpts(x.date)}</select>
      <span id="camTimes" class="ca-times"><select id="camStart" aria-label="Start time">${startOpts(x.allDay ? 9 * 60 : x.start)}</select><span>–</span><select id="camEnd" aria-label="End time">${endOpts(x.allDay ? 9 * 60 : x.start, x.allDay ? 10 * 60 : x.start + x.dur)}</select></span>
      <span id="camUntilW" class="ca-times" hidden><span>to</span><select id="camUntil" aria-label="Last day">${untilOpts(x.date, x.span || 1)}</select></span></div>
    <div class="cs-m-row ca-sub2"><i class="cs-m-ic"></i><label class="ca-chk"><input type="checkbox" id="camAll" ${x.allDay ? "checked" : ""}> All day</label><span class="ca-dnr">Does not repeat</span></div>
    <div class="cs-m-row" id="camTzRow"><i class="cs-m-ic" title="Event time zone">🌐</i><select id="camTz" aria-label="Event time zone">${tzOpts(x.tz, x.date)}</select></div>
    <div class="ca-pac" id="camPac" aria-live="polite"></div>
    <label class="cs-m-row"><i class="cs-m-ic">📍</i><input id="camLoc" maxlength="200" placeholder="Add location" value="${e(x.loc)}"></label>
    <div class="cs-m-row cs-m-top"><i class="cs-m-ic">👥</i><div class="ca-gw"><input id="camGuest" list="camPeople" maxlength="120" placeholder="Add guests: a name or email, then Enter" autocomplete="off"><datalist id="camPeople">${people}</datalist><div class="ca-chips" id="camChips"></div></div></div>
    <div class="cs-m-row"><i class="cs-m-ic">📹</i><button type="button" id="camMeetBtn" class="cs-meet ${x.meet ? "on" : ""}">${x.meet ? "Join with Google Meet" : "Add Google Meet video conferencing"}</button><button type="button" id="camMeetOff" class="cs-m-link" ${x.meet ? "" : "hidden"}>Remove</button></div>
    <div class="cs-m-row cs-m-top"><i class="cs-m-ic">🔔</i><div class="ca-rems"><div id="camRems"></div><button type="button" class="cs-m-link" id="camAddRem">Add notification</button></div></div>
    <div class="cs-m-row"><i class="cs-m-ic">🎨</i><div class="cs-colors" role="radiogroup" aria-label="Event color"><button type="button" class="cs-sw ca-sw-def ${x.color ? "" : "on"}" data-c="" role="radio" aria-checked="${x.color ? "false" : "true"}" title="No color (the calendar’s default)" aria-label="No color"></button>${C.COLORS.map(c => `<button type="button" class="cs-sw ${x.color === c.id ? "on" : ""}" data-c="${c.id}" role="radio" aria-checked="${x.color === c.id ? "true" : "false"}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join("")}</div><span class="cs-m-cname" id="camColorName">${e((C.colorOf(x.color) || {}).name || "No color")}</span><input type="hidden" id="camColor" value="${e(x.color || "")}"></div>
    <label class="cs-m-row cs-m-top"><i class="cs-m-ic">≡</i><textarea id="camDesc" rows="4" maxlength="600" placeholder="Add description">${e(x.desc)}</textarea></label>
    <div class="cs-m-btns">${isNew ? "" : `<button class="cs-gbtn" data-m="del">🗑 Delete</button>`}<span></span><button class="cs-gbtn cs-gblue" data-m="ok">Save</button></div></div>`;
  document.body.appendChild(m);
  const q = sel => m.querySelector(sel), title = q("#camTitle"), dt = q("#camDate"), st = q("#camStart"), en = q("#camEnd"), all = q("#camAll"), tz = q("#camTz"), gi = q("#camGuest");
  let meet = !!x.meet;
  const setMeet = on => { meet = on; const b = q("#camMeetBtn"); b.classList.toggle("on", on); b.textContent = on ? "Join with Google Meet" : "Add Google Meet video conferencing"; q("#camMeetOff").hidden = !on; };
  q("#camMeetBtn").onclick = () => setMeet(true); q("#camMeetOff").onclick = () => setMeet(false);
  m.querySelectorAll(".cs-sw").forEach(b => { b.onclick = () => { const id = b.dataset.c; q("#camColor").value = id;
    m.querySelectorAll(".cs-sw").forEach(o => { o.classList.toggle("on", o === b); o.setAttribute("aria-checked", o === b ? "true" : "false"); });
    q("#camColorName").textContent = (C.colorOf(id) || {}).name || "No color"; }; });
  // what the form holds now
  const val = () => all.checked ? {date:dt.value, allDay:true, span:+q("#camUntil").value || 1, start:0, dur:1440, tz:X.CAL_TZ}
    : {date:dt.value, allDay:false, span:1, start:+st.value, dur:+en.value - +st.value, tz:tz.value};
  const paintPac = () => { const v = Object.assign({id:x.id}, val()), bad = v.dur > 0 ? X.valid(v) : "The event has to end after it starts.", el = q("#camPac");
    el.className = "ca-pac" + (bad ? " bad" : "");
    el.textContent = bad ? "⚠ " + bad : v.allDay ? `On the attorney’s calendar: ${X.whenOf(v)}.` : `On the attorney’s calendar (Pacific): ${X.whenOf(v)}${v.tz === X.CAL_TZ ? "" : ` · in its own zone: ${X.zoneText(v)}`}`; };
  const paintAll = () => { q("#camTimes").hidden = all.checked; q("#camTzRow").hidden = all.checked; q("#camUntilW").hidden = !all.checked; paintPac(); };
  st.onchange = () => { const d = Math.max(C.STEP, +en.value - +st.dataset.was || 60), s0 = +st.value; st.dataset.was = s0; en.innerHTML = endOpts(s0, Math.min(1440, s0 + d)); paintPac(); };
  st.dataset.was = st.value;
  en.onchange = paintPac; tz.onchange = paintPac;
  dt.onchange = () => { q("#camUntil").innerHTML = untilOpts(dt.value, +q("#camUntil").value || 1); const sel = tz.value; tz.innerHTML = tzOpts(sel, dt.value); paintPac(); };
  q("#camUntil").onchange = paintPac; all.onchange = paintAll;
  // guests: one of the four by name, "Name <email>" (the list), or any email address
  const chips = () => { q("#camChips").innerHTML = G.map(g => `<span class="ca-chip" title="${e(g)}">${e(X.who(g) === g ? g : X.who(g) + " · " + g)}<button type="button" data-g="${e(g)}" aria-label="Remove ${e(g)}">✕</button></span>`).join(""); };
  const addGuest = raw => { raw = String(raw || "").trim().replace(/[,;]+$/, "").trim(); if(!raw) return true;
    const low = raw.toLowerCase(), ang = (raw.match(/<([^>]+)>/) || [])[1];
    const p = X.PEOPLE.find(p => p.name.toLowerCase() === low || p.email === low || (ang && p.email === ang.trim().toLowerCase()));
    const em = p ? p.email : (ang || raw).trim().toLowerCase();
    if(!/^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i.test(em)){ toast(`“${raw}” isn’t an email address or one of the four guests.`); return false; }
    if(!G.includes(em)){ if(G.length >= 10){ toast("Ten guests at most."); return false; } G.push(em); chips(); }
    return true; };
  gi.addEventListener("keydown", ev => { if(ev.key === "Enter" || ev.key === ","){ ev.preventDefault(); ev.stopPropagation(); if(addGuest(gi.value)) gi.value = ""; } });
  gi.addEventListener("change", () => { if(gi.value && (/[<@]/.test(gi.value) || X.PEOPLE.some(p => p.name.toLowerCase() === gi.value.trim().toLowerCase())) && addGuest(gi.value)) gi.value = ""; });
  q("#camChips").addEventListener("click", ev => { const b = ev.target.closest("[data-g]"); if(b){ G.splice(G.indexOf(b.dataset.g), 1); chips(); } });
  // reminders: Notification or Email, a number and its unit, up to five
  const rems = () => { q("#camRems").innerHTML = R.map((r, i) => `<div class="ca-rem"><select data-rt="${i}" aria-label="Reminder type"><option value="notification" ${r.type === "notification" ? "selected" : ""}>Notification</option><option value="email" ${r.type === "email" ? "selected" : ""}>Email</option></select>
      <input type="number" min="0" max="40320" step="1" data-rn="${i}" value="${r.n}" aria-label="How long before"><select data-ru="${i}" aria-label="Unit">${Object.keys(X.REM_UNITS).map(u => `<option value="${u}" ${r.unit === u ? "selected" : ""}>${u}</option>`).join("")}</select><span class="ca-bef">before</span><button type="button" class="cs-m-x" data-rx="${i}" aria-label="Remove this reminder">✕</button></div>`).join("");
    q("#camAddRem").hidden = R.length >= 5; };
  q("#camRems").addEventListener("change", ev => { const t = ev.target, i = +(t.dataset.rt || t.dataset.rn || t.dataset.ru);
    if(t.dataset.rt != null) R[i].type = t.value; else if(t.dataset.ru != null) R[i].unit = t.value; else if(t.dataset.rn != null) R[i].n = Math.max(0, Math.round(+t.value || 0)); });
  q("#camRems").addEventListener("click", ev => { const b = ev.target.closest("[data-rx]"); if(b){ R.splice(+b.dataset.rx, 1); rems(); } });
  q("#camAddRem").onclick = () => { if(R.length < 5){ R.push({type:"notification", n:30, unit:"minutes"}); rems(); } };
  chips(); rems(); paintAll();
  const save = () => {
    const t = title.value.trim(); if(!t){ toast("Add a title."); title.focus(); return; }
    if(!addGuest(gi.value)){ gi.focus(); return; } gi.value = "";
    q("#camRems").querySelectorAll("[data-rn]").forEach(inp => { R[+inp.dataset.rn].n = Math.max(0, Math.round(+inp.value || 0)); });
    if(R.some(r => r.n * X.REM_UNITS[r.unit] > 40320)){ toast("A reminder can be at most 4 weeks before."); return; }
    const w = val(); if(!w.allDay && w.dur <= 0){ toast("The event has to end after it starts."); return; }
    const bad = X.valid(Object.assign({id:x.id}, w)); if(bad){ toast(bad); return; }
    const v = Object.assign(w, {title:t.slice(0, 100), loc:q("#camLoc").value.trim().slice(0, 200), guests:G.slice(0, 10), meet, reminders:R.map(r => ({type:r.type, n:r.n, unit:r.unit})),
      color:C.colorOf(q("#camColor").value) ? q("#camColor").value : "", desc:q("#camDesc").value.trim().slice(0, 600)});
    closeModal(); done(v); };
  m.addEventListener("click", ev => { const b = ev.target.closest("[data-m]"); if(b){ const k = b.dataset.m; if(k === "ok") save(); else if(k === "del"){ closeModal(); done(null, true); } else{ closeModal(); done(null); } } else if(ev.target === m){ closeModal(); done(null); } });
  m.addEventListener("keydown", ev => { if(ev.key === "Escape"){ ev.stopPropagation(); closeModal(); done(null); } else if(ev.key === "Enter" && ev.target === title){ ev.preventDefault(); save(); } });
  title.focus();
}
const openEditor = (x, isNew, done) => isAct(scn()) ? actEditor(x, isNew, done) : editor(x, isNew, done);
const newAct = (day, start, dur) => ({id:uid(), title:"", date:X.dIso(day), allDay:false, span:1, start, dur, tz:X.CAL_TZ, loc:"", guests:[], desc:"", meet:false, color:"", reminders:[]});
// After an activity event is saved: show its week, and scroll to it if it's out of view.
function actShow(x){
  const p = X.pacOf(x), w = weekOf(p.day), el = document.getElementById("caScroll");
  S.sel = x.id; changed();
  if(!p.allDay){ const top = apx(p.start), hd = el ? ((el.querySelector(".ca-sticky") || {}).offsetHeight || 0) : 0;
    if(w !== S.week || !el || top < el.scrollTop || top + apx(Math.min(p.end, 1440) - p.start) > el.scrollTop + el.clientHeight - hd) S.caTop = Math.max(0, top - 60); }
  if(w !== S.week){ S.week = w; render(); } else repaint();
}
function onUp(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  const cur = d.cur; endDrag();
  if(!d.moved && d.mode === "new" && d.anchor){
    if(S.events.length >= maxEv()){ tooMany(); return; }
    if(d.act){ const base = newAct(d.anchor.day, Math.min(d.anchor.start, 1440 - 60), 60); actEditor(base, true, v => { if(!v) return; S.events.push(Object.assign(base, v)); actShow(base); }); return; }
    const base = {id:uid(), title:"", day:d.anchor.day, start:Math.min(d.anchor.start, BOTTOM - 60), dur:60, desc:"", guests:"", meet:false, remind:false, color:""};
    editor(base, true, v => { if(!v) return; S.events.push(Object.assign(base, v)); S.sel = base.id; changed(); repaint(); });
    return;
  }
  if(!d.moved){ if(d.mode !== "new" && d.id) select(d.id); return; }
  if(!cur){ repaint(); return; }
  if(d.mode === "new"){
    if(S.events.length >= maxEv()){ tooMany(); return; }
    if(d.act){ const base = newAct(cur.day, cur.start, cur.dur); repaint(); actEditor(base, true, v => { if(!v) return; S.events.push(Object.assign(base, v)); actShow(base); }); return; }
    const base = {id:uid(), title:"", day:cur.day, start:cur.start, dur:cur.dur, desc:"", guests:"", meet:false, remind:false, color:""};
    repaint();
    editor(base, true, v => { if(!v) return; S.events.push(Object.assign(base, v)); S.sel = base.id; changed(); repaint(); });
    return;
  }else if(d.act){
    const c = actCand(d, cur), bad = X.valid(c);
    if(bad){ toast(bad); repaint(); return; }
    Object.assign(d.x, {date:c.date, start:c.start, dur:c.dur}); S.sel = d.id;
  }else{ Object.assign(d.x, {day:cur.day, start:cur.start, dur:cur.dur}); S.sel = d.id; }
  changed(); repaint();
}
// A click selects an event without repainting the grid, so the same element gets the second click of a double-click (the editor).
function select(id){
  S.sel = id;
  document.querySelectorAll(".cs-sel").forEach(n => n.classList.remove("cs-sel"));
  document.querySelectorAll(`.cs-req[data-ev="${CSS.escape(id)}"], .ca-adev[data-adev="${CSS.escape(id)}"]`).forEach(n => n.classList.add("cs-sel"));
  const el = document.querySelector(`.cs-req[data-ev="${CSS.escape(id)}"]`); if(el) el.focus({preventScroll:true});
}
function onCancel(){ endDrag(); repaint(); }
const evOf = id => S.events.find(x => x.id === id);
function rename(id){ const x = evOf(id); if(!x) return; openEditor(x, false, (v, del) => { if(del){ remove(id); return; } if(!v) return; Object.assign(x, v); if(isAct(scn())){ actShow(x); return; } changed(); repaint(); }); }
function remove(id){ S.events = S.events.filter(x => x.id !== id); if(S.sel === id) S.sel = null; changed(); repaint(); }
// The activity's keyboard: ↑ ↓ move the start 15 minutes (in the event's own zone), Shift resizes, ← → move it a day (within the activity's days, 0 to X.LAST).
function actKey(x, ev){
  const k = ev.key, y = Object.assign({}, x);
  if(ev.shiftKey && k === "ArrowDown") y.dur = x.dur + C.STEP;
  else if(ev.shiftKey && k === "ArrowUp") y.dur = Math.max(C.STEP, x.dur - C.STEP);
  else if(k === "ArrowUp") y.start = x.start - C.STEP;
  else if(k === "ArrowDown") y.start = x.start + C.STEP;
  else if(k === "ArrowLeft" || k === "ArrowRight"){ const n = X.dIdx(x.date) + (k === "ArrowLeft" ? -1 : 1); if(n < 0 || n > X.LAST){ ev.preventDefault(); return; } y.date = X.dIso(n); }
  else return;
  ev.preventDefault();
  const bad = X.valid(y); if(bad){ toast(bad); return; }
  Object.assign(x, y); S.sel = x.id; changed();
  const w = weekOf(X.pacOf(x).day); if(w !== S.week){ S.week = w; render(); } else repaint();
  const again = document.querySelector(`.cs-req[data-ev="${CSS.escape(x.id)}"]`); if(again) again.focus();
}
function wire(){
  const app = document.getElementById("app"); if(!app || app.dataset.csWired) return;
  app.dataset.csWired = "1";
  app.addEventListener("pointerdown", ev => {
    if(state.view !== "calsim" || !open() || ev.button > 0) return;
    const t = ev.target;
    if(t.closest("[data-del]")) return;
    if(t.closest("[data-rs]")){ ev.preventDefault(); startDrag(ev, "resize", t.closest("[data-rs]").dataset.rs); return; }
    const own = t.closest(".cs-req"); if(own && app.contains(own)){ startDrag(ev, "move", own.dataset.ev); return; }
    if(t.closest(".cs-ev")) return;      // a fixed event
    if(t.closest(".cs-col")){ ev.preventDefault(); startDrag(ev, "new"); }
  });
  app.addEventListener("click", ev => { if(state.view !== "calsim") return; const b = ev.target.closest("[data-del]"); if(b){ remove(b.dataset.del); return; }
    const chip = ev.target.closest("[data-adev]"); if(chip && open()) rename(chip.dataset.adev); });
  app.addEventListener("dblclick", ev => { if(state.view !== "calsim") return; const el = ev.target.closest(".cs-req"); if(el) rename(el.dataset.ev); });
  app.addEventListener("scroll", ev => { if(ev.target && ev.target.id === "caScroll") S.caTop = ev.target.scrollTop; }, true);
  app.addEventListener("keydown", ev => {
    if(state.view !== "calsim") return;
    const chip = ev.target.closest && ev.target.closest("[data-adev]");
    if(chip){ if(ev.key === "Enter"){ ev.preventDefault(); rename(chip.dataset.adev); } else if(ev.key === "Delete" || ev.key === "Backspace"){ ev.preventDefault(); remove(chip.dataset.adev); } return; }
    const el = ev.target.closest && ev.target.closest(".cs-req"); if(!el) return;
    const x = evOf(el.dataset.ev); if(!x) return;
    const k = ev.key; let ok = true;
    if(k === "Delete" || k === "Backspace"){ ev.preventDefault(); remove(x.id); return; }
    if(k === "Enter"){ ev.preventDefault(); rename(x.id); return; }
    if(isAct(scn())){ actKey(x, ev); return; }
    if(ev.shiftKey && k === "ArrowDown") x.dur = Math.min(BOTTOM - x.start, x.dur + C.STEP);
    else if(ev.shiftKey && k === "ArrowUp") x.dur = Math.max(C.STEP, x.dur - C.STEP);
    else if(k === "ArrowUp") x.start = Math.max(TOP, x.start - C.STEP);
    else if(k === "ArrowDown") x.start = Math.min(BOTTOM - x.dur, x.start + C.STEP);
    else if(k === "ArrowLeft") x.day = Math.max(0, x.day - 1);
    else if(k === "ArrowRight") x.day = Math.min(4, x.day + 1);
    else ok = false;
    if(!ok) return;
    ev.preventDefault(); S.sel = x.id; changed(); repaint();
    const again = document.querySelector(`.cs-req[data-ev="${CSS.escape(x.id)}"]`); if(again) again.focus();
  });
}

/* ---------- AI feedback ---------- */
// The trainer's own rules, guidelines and notes for the AI review (Admin → 📅 Calendar Scores → 📘): for every week, and per week.
async function loadGuide(){ try{ S.guide = (await sharedGet("settings:calsim-guidelines")) || {}; }catch(err){ S.guide = S.guide || {}; } return S.guide; }
function guideText(s, guide){ guide = guide || {}; return [guide.all, guide[s.id]].map(x => String(x || "").trim()).filter(Boolean).join("\n"); }
function aiPrompt(s, events, g, guide){
  const fixed = s.fixed.filter(f => f.kind !== "lunch").map(f => `- ${f.title}: ${C.DAYS[f.day]} ${hh(f.start)}–${hh(f.end)}${f.buffer ? ` (keep ${f.buffer} minutes free before and after for travel)` : ""}`).join("\n");
  const rules = s.tasks.map(k => `- [${k.id}] ${k.title} (${k.dur} min): ${k.note}`).join("\n");
  const cal = events.length ? events.map(x => `- "${x.title}": ${C.DAYS[x.day]} ${hh(x.start)}–${hh(x.start + x.dur)}${x.meet ? ", Google Meet added" : ""}${x.remind ? ", email reminder 1 day before" : ""}, color: ${(C.colorOf(x.color) || {}).name || "default (none chosen)"}${x.desc ? `, description: "${x.desc}"` : ", NO description"}${x.guests ? `, guests: ${x.guests}` : ""}`).join("\n") : "(no events)";
  const facts = g.items.map(i => `- [${i.id}] ${i.title}: ${i.found ? `matched the event "${i.event.title}"` : "NOT FOUND on the calendar"}; ${i.perfect ? "every check passes" : "problems: " + i.checks.filter(c => !c.ok).map(c => c.why).join(" ")}`).join("\n");
  return `You are a legal-support trainer giving feedback on a trainee's calendar exercise (${s.title}; track: ${C.trackOf(s.track).title}). The trainee put each task on the attorney's calendar. Judge ONLY against the rules, notes and guidelines below. Do not invent rules, and never give legal advice.

GENERAL RULES: Eastern Time; business hours 9:00 AM to 5:00 PM; leave ${s.gap} minutes between events (lunch excluded); every event needs a title and a description; add Google Meet to video calls; set an email reminder 1 day before external appointments when the task says so; the attorney's color rule: ${C.COLOR_RULE_TEXT} (other lengths have no color rule).

FIXED EVENTS ON THE CALENDAR:
${fixed}

TASKS AND THEIR NOTES (the rules):
${rules}

${guideText(s, guide) ? `TRAINER'S OWN RULES, GUIDELINES AND NOTES (set by the trainer for this exercise: treat them as rules and judge the calendar against them too):\n${guideText(s, guide)}\n\n` : ""}THE TRAINEE'S CALENDAR:
${cal}

AUTOMATED CHECK RESULTS (facts: trust them over your own reading):
${facts}

For each task write one or two sentences of feedback in a growth voice ("not yet", "add ...", "move it to ..."): say what is right, and what is missing and exactly how to fix it, using this trainee's own event. If a task is fully met, say what they did well. Then give 2 to 3 strengths and 2 to 3 things to work on next across the whole calendar.

Return ONLY a JSON object, no other text:
{"summary":"two or three sentences on the calendar overall","items":[{"id":"<task id>","status":"met|partial|missed","feedback":"..."} ... one per task, in order],"strengths":["..."],"improve":["..."]}`;
}
// The activity's prompt: the activity itself (instructions, legend, items), this simulator's rules, the expected events and the facts.
function actAiPrompt(s, events, g, guide){
  const ins = s.instructions.map((x, i) => `${i + 1}. ${x.t}${x.sub ? "\n" + x.sub.map(y => "   - " + y).join("\n") : ""}`).join("\n");
  const legend = Object.keys(s.cats).map(k => { const c = s.cats[k]; return `- ${c.legend} – ${c.what}: ${c.colors.map(id => C.colorOf(id).name).join(" (") + (c.colors.length > 1 ? " accepted)" : "")}`; }).join("\n");
  const items = s.itemsNow.map(it => `${it.n}. ${it.title}\n` + it.lines.map(([k, v]) => `   • ${k}: ${Array.isArray(v) ? "\n" + v.map(l => "      " + l).join("\n") : v}`).join("\n")).join("\n");
  const exp = s.tasks.map(t => `- [${t.id}] ${t.title}: ${t.note}`).join("\n");
  // the overnight stay's dates, at the page's anchor (the key's all-day event; else the activity's days 7 and 8)
  const stay = s.key.find(k => k.allDay), sd = stay ? X.dIdx(stay.date) : 7, se = stay ? X.dIdx(stay.endDate) : 8;
  const alts = s.key.filter(k => k.altWhy).map(k => `   - ${k.title}: ${k.altWhy}`).join("\n");
  const cal = events.length ? events.slice().sort((a, b) => X.evAbs(a).s - X.evAbs(b).s).map(x => `- "${x.title}": ${X.whenOf(x)} Pacific${X.zoneText(x) ? ` (entered in its own zone: ${X.zoneText(x)})` : ""}; color: ${(C.colorOf(x.color) || {}).name || "none chosen (the calendar's default)"}; location: ${x.loc || "(none)"}${x.meet ? "; Google Meet added" : ""}; guests: ${x.guests.join(", ") || "none"}; reminders: ${x.reminders.map(X.remText).join(", ") || "none"}; description: ${x.desc ? `"${x.desc}"` : "NONE"}`).join("\n") : "(no events)";
  const facts = g.items.map(i => `- [${i.id}] ${i.title}: ${i.id === "calendar" ? "" : i.found ? (i.via ? `covered by a note on the event "${i.event.title}"; ` : `matched the event "${i.event.title}"; `) : "NOT FOUND on the calendar; "}${i.perfect ? "every check passes" : "problems: " + i.checks.filter(c => !c.ok).map(c => c.why).join(" ")}${(i.info || []).length ? ` (notes: ${i.info.join(" ")})` : ""}`).join("\n");
  return `You are a legal-support trainer giving feedback on a trainee's ${s.title} (track: ${C.trackOf(s.track).title}). The trainee put the activity's appointments and travel blocks on the attorney's Google Calendar. Judge ONLY against the activity, the rules and the guidelines below. Do not invent rules, and never give legal advice.

THE ACTIVITY'S INSTRUCTIONS:
${ins}

THE COLOR LEGEND IN GOOGLE CALENDAR'S COLORS (the first color is the legend's; one in brackets is accepted too):
${legend}

THE ACTIVITY ITEMS:
${items}

RULES OF THIS SIMULATOR:
- The attorney is in Seattle: the calendar shows Pacific Time. PST, MST, CST and EST in the items name the US region (Pacific, Mountain, Central and Eastern Time), not the season: an item's time is that region's wall-clock time on the event's own date, standard or daylight time as that date has it. As on the Calendar Activity Check, each event is entered either in the item's own time zone with the item's clock time (e.g. 3:00 PM with the event's time zone set to Mountain Time - Denver), or in Pacific Time at the same moment (2:00 PM Pacific): both are right. The item's clock time typed in Pacific (3:00 PM Pacific) is the wrong zone: the meeting would be an hour off.
- Hours far from the office are expected: the gym session (6:30 AM EST) is 3:30 AM on the attorney's Pacific calendar. That is not a mistake.
- Travel blocks and sub-blocks are their own events. The activity asks for "departure → destination" as their location (the automated check grades it), and a practical reminder (${X.leadText(X.TRAVEL_MIN)} to ${X.leadText(X.TRAVEL_MAX)} before: graded on the court travel blocks, which the activity gives no reminder; the flights' blocks have the trip's 1-day email, and a reminder of their own beside it is only a suggestion). The trainer confirms the attorney's preferred lead time: don't call a lead time in that range wrong.
- Guests are invited by their directory email addresses (instruction 9), and only the item's guests. The trip's 1-day email and notes may sit on either event of its travel block.
- The activity gives 8:30–9:00 AM for the ride to SEA, right before the 9:00 AM flight: the given times are expected. You may suggest talking through a more realistic airport buffer with the trainer, but don't mark the times wrong.
- The overnight stay in San Francisco is an all-day event on ${X.dLabel(sd)}, ${X.dYear(sd)} (it may end on ${X.dLabel(sd)} or ${X.dLabel(se)}).
- Accepted color alternatives:
${alts}

THE EXPECTED EVENTS (one per id; "calendar" is the whole-calendar check):
${exp}

${guideText(s, guide) ? `TRAINER'S OWN RULES, GUIDELINES AND NOTES (set by the trainer for this activity: treat them as rules and judge the calendar against them too):\n${guideText(s, guide)}\n\n` : ""}THE TRAINEE'S CALENDAR:
${cal}

AUTOMATED CHECK RESULTS (facts: trust them over your own reading):
${facts}

For each id write one or two sentences of feedback in a growth voice ("not yet", "add ...", "set ..."): say what is right, and what is missing and exactly how to fix it, using this trainee's own event. If an id is fully met, say what they did well. Then give 2 to 3 strengths and 2 to 3 things to work on next across the whole calendar.

Return ONLY a JSON object, no other text:
{"summary":"two or three sentences on the calendar overall","items":[{"id":"<id>","status":"met|partial|missed","feedback":"..."} ... one per id, in order],"strengths":["..."],"improve":["..."]}`;
}
// `anchor`: the submission's (the review, the items' dates and the prompt are worked out at it, before the AI is awaited)
async function generateAI(s, events, feature, anchor){
  const at = new Date().toISOString(), guide = await loadGuide();
  const {g, prompt} = X.withAnchor(anchor || X.anchor(), () => { const g = C.review(s, events); return {g, prompt:(isAct(s) ? actAiPrompt : aiPrompt)(s, events, g, guide)}; });
  try{
    const raw = await callAIJson(prompt, isAct(s) ? 3600 : 2400, 120000, feature || "grading");
    const got = Array.isArray(raw && raw.items) ? raw.items : [];
    if(!got.length) throw new Error("it returned no feedback");
    const items = s.tasks.map((t, k) => { const it = got.find(z => z && z.id === t.id) || got[k] || {}, gi = g.items.find(z => z.id === t.id);
      const st = ["met", "partial", "missed"].includes(it.status) ? it.status : (gi.perfect ? "met" : gi.found ? "partial" : "missed");
      return {id:t.id, status:st, feedback:String(it.feedback || "").slice(0, 500)}; });
    const list = v => (Array.isArray(v) ? v : []).map(x => String(x).slice(0, 300)).filter(Boolean).slice(0, 4);
    return {at, summary:String((raw && raw.summary) || "").slice(0, 600), items, strengths:list(raw && raw.strengths), improve:list(raw && raw.improve)};
  }catch(err){ return {at, error:String((err && err.message) || "try again").slice(0, 140)}; }
}

/* ---------- actions ---------- */
async function submit(){
  const s = scn();
  if(!S.events.length){ toast("Add your events to the calendar before submitting."); return; }
  const flagged = Object.keys(C.flags(s, S.events)).length;
  const ask = isAct(s) ? `Submit your ${s.title} to your trainer?` + (S.events.length < s.key.length ? `\n\nYou have ${S.events.length} event${S.events.length === 1 ? "" : "s"}; the activity has 10 items with their travel blocks (${s.key.length} events).` : "") + (flagged ? `\n\n${flagged} event${flagged === 1 ? " is" : "s are"} marked ⚠ (overlapping events or outside the activity’s dates).` : "") + (subs(s.id).length ? "\n\nThis replaces your earlier submission (your trainer keeps both)." : "") + "\n\nAn AI check against the activity runs as soon as you submit."
    : null;
  if(!confirm(ask || `Submit this calendar for ${s.short} to your trainer?` + (S.events.length < s.tasks.length ? `\n\nYou have ${S.events.length} event${S.events.length === 1 ? "" : "s"} for ${s.tasks.length} tasks.` : "") + (flagged ? `\n\n${flagged} event${flagged === 1 ? " is" : "s are"} marked red (a clash, missing travel time or outside business hours).` : "") + (subs(s.id).length ? "\n\nThis replaces your earlier submission (your trainer keeps both)." : "") + "\n\nAn AI check against the rules and notes runs as soon as you submit.")) return;
  S.result = null;
  if(!(S.data && isTrainee())){
    // A trainer's preview: show what the AI says, save nothing.
    S.aiBusy.preview = true; toast("Trainer preview: nothing is submitted. Running the AI check…"); repaint();
    const ai = await generateAI(s, S.events, null, X.anchor()); S.aiBusy.preview = false; S.previewAI = {scn:s.id, ai}; repaint();
    return;
  }
  const au = C.review(s, S.events), sub = {scn:s.id, at:new Date().toISOString(), anchor:X.anchor(), events:JSON.parse(JSON.stringify(S.events)), auto:{pct:au.pct, score:au.score, max:au.max}, aiPending:true};
  const before = S.data.submissions.slice();
  S.data.submissions.push(sub);
  if(S.data.submissions.length > 20) S.data.submissions = S.data.submissions.slice(-20);
  // the activity's calendars are bigger: its last ACT_SUBS submissions are kept (the trainer's reviews of older ones stay)
  // (the oldest unreviewed ones go first; one the trainer has reviewed stays, so Calendar Scores can still open it)
  if(isAct(s)){ const mine = S.data.submissions.filter(x => x.scn === s.id && x !== sub), over = mine.length + 1 - ACT_SUBS;
    const drop = new Set(over > 0 ? mine.filter(x => !S.data.reviews[subKey(x)]).slice(0, over) : []); if(drop.size) S.data.submissions = S.data.submissions.filter(x => !drop.has(x)); }
  if(!fits()){ S.data.submissions = before; toast(BIG); return; }
  const key = subKey(sub); S.aiBusy[key] = true;
  clearTimeout(S.timer); repaint(); toast("Calendar submitted. The AI is checking it against the rules…");
  await saveRec();                                                  // the submission is safe before the AI answers
  const ai = await generateAI(s, sub.events, null, sub.anchor);
  sub.ai = ai; delete sub.aiPending; delete S.aiBusy[key];
  S.saved = "saving"; paintSave(); repaint();
  const ok = await saveRec(); S.saved = ok === "big" ? "big" : ok === false ? "fail" : "ok"; paintSave();
  toast(ai.error ? "Submitted. The AI check wasn’t available; your trainer will review it." : "AI feedback is ready below. Your trainer will go through it with you.");
}
function runReview(){
  const s = scn();
  if(!S.events.length){ toast("Add your events to the calendar first."); return; }
  const g = C.review(s, S.events); S.result = g;
  if(S.data && isTrainee()){
    S.data.autos.push({scn:s.id, at:new Date().toISOString(), pct:g.pct, score:g.score, max:g.max});
    if(S.data.autos.length > 30) S.data.autos = S.data.autos.slice(-30);
    queueSave();
  }
  repaint();
  const box = document.getElementById("csResultBox"); if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth", block:"nearest"});
  toast(g.passed ? `Automated review: ${g.pct}%. ${isAct(s) ? "It passes." : "It meets the attorney’s rules."}` : `Automated review: ${g.pct}%. See what to fix below.`);
}
// The activity's calendar in the report: when (Pacific, and the event's own zone), the event, and its details.
const actRows = events => events.map(x => { const col = C.colorOf(x.color), zt = X.zoneText(x);
  return `<tr><td>${e(X.whenOf(x))}${zt ? `<br><small>event zone: ${e(zt)}</small>` : ""}</td><td><b>${e(x.title)}</b></td><td>${col ? "🎨 " + e(col.name) + "<br>" : "🎨 No color<br>"}${x.loc ? "📍 " + e(x.loc) + "<br>" : ""}${x.meet ? "📹 Google Meet<br>" : ""}${x.guests.length ? "👥 " + e(x.guests.join(", ")) + "<br>" : ""}${x.reminders.length ? "🔔 " + e(x.reminders.map(X.remText).join(", ")) + "<br>" : ""}${e(x.desc)}</td></tr>`; }).join("") || "<tr><td colspan=3>No events.</td></tr>";
// The final feedback as a page of its own: it is what the trainee downloads or prints.
// (at the submission's anchor)
const feedbackDoc = (s, sub, r, name) => atSub(sub, () => feedbackDocAt(s, sub, r, name));
function feedbackDocAt(s, sub, r, name){
  const ai = sub.ai && !sub.ai.error ? sub.ai : null, by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  const act = isAct(s), g = subReview(s, sub), events = C.cleanFor(s, sub.events).sort(act ? (a, b) => X.evAbs(a).s - X.evAbs(b).s : (a, b) => a.day - b.day || a.start - b.start);
  const li = a => (a || []).filter(Boolean).map(x => `<li>${e(x)}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Calendar feedback: ${e(s.short)}${name ? " · " + e(name) : ""}</title>
<style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:28px auto;padding:0 18px;} h1{font-size:22px;color:#0b1730;margin:0 0 4px;} h2{font-size:16px;color:#0b1730;border-bottom:2px solid #f97316;padding-bottom:3px;margin:22px 0 8px;}
.meta{color:#4b5563;font-size:13.5px;margin-bottom:10px;} .score{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0;} .score div{background:#f1f5f9;border-radius:10px;padding:8px 14px;} .score b{font-size:22px;display:block;color:#0b1730;}
table{border-collapse:collapse;width:100%;font-size:14px;} th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top;} th{background:#f8fafc;} .met{color:#166534;font-weight:700;} .partial{color:#92400e;font-weight:700;} .missed{color:#991b1b;font-weight:700;}
.tn{color:#14532d;} ul{margin:4px 0 4px 20px;padding:0;} @media print{body{margin:0;} h2{break-after:avoid;} tr{break-inside:avoid;}}</style></head><body>
<h1>Final feedback report: ${e(s.title)}</h1><div class="meta">${name ? "Trainee: <b>" + e(name) + "</b> · " : ""}${e(C.trackOf(s.track).title)} · submitted ${e(new Date(sub.at).toLocaleString())}${r && r.at ? " · final feedback " + e(new Date(r.at).toLocaleDateString()) : ""}</div>
<div class="score"><div>Automated review<b>${g.pct}%</b></div>${r && r.score != null ? `<div>Trainer score<b>${e(r.score)} / 100</b></div>` : ""}</div>
${ai && ai.summary ? `<h2>Overview</h2><p>${e(ai.summary)}</p>` : ""}
${ai && ai.strengths.length ? `<h2>What’s working</h2><ul>${li(ai.strengths)}</ul>` : ""}${ai && ai.improve.length ? `<h2>Work on next</h2><ul>${li(ai.improve)}</ul>` : ""}
${(() => { const sec = reportSections(s, sub, r); return SECTION.map(([k, ic, title]) => `<h2>${ic} ${title} (${sec[k].length})</h2>` + (sec[k].length ? sec[k].map(x => `<p><b>${e(x.title)}</b><br>${e(x.text)}${x.note ? `<br><span class="tn">Trainer: ${e(x.note)}</span>` : ""}</p>`).join("") : "<p>Nothing here.</p>")).join(""); })()}
${r && r.comment ? `<h2>Trainer’s insights</h2><p>${e(r.comment).replace(/\n/g, "<br>")}</p>` : ""}
<h2>The calendar you submitted</h2><table><tr><th>When</th><th>Event</th><th>Details</th></tr>${act ? actRows(events) : events.map(x => `<tr><td>${C.DAYS[x.day]}<br>${hh(x.start)} – ${hh(x.start + x.dur)}</td><td><b>${e(x.title)}</b></td><td>${x.meet ? "📹 Google Meet<br>" : ""}${x.remind ? "🔔 Email reminder 1 day before<br>" : ""}${C.colorOf(x.color) ? "🎨 " + e(C.colorOf(x.color).name) + "<br>" : ""}${x.guests ? "Guests: " + e(x.guests) + "<br>" : ""}${e(x.desc)}</td></tr>`).join("") || "<tr><td colspan=3>No events.</td></tr>"}</table>
<p class="meta">${act ? "Pacific Time (the attorney’s calendar)" : "Eastern Time"} · LSH Foundational Training · Calendar Management</p></body></html>`;
}
function finalOf(scnId){
  const s = C.SCENARIOS.find(x => x.id === scnId), sub = s && subs(scnId).pop(), r = sub && S.data.reviews[subKey(sub)];
  return s && sub && released(r) ? {s, sub, r, name:state.certName || state.traineeName || ""} : null;
}
window.FTCalSim = {
  back(){ const f = S.from; S.from = null; if(f && window.FTDayDecks) FTDayDecks.open(f.day, f.i); else goto('simulators'); },
  submit, toCheck,
  download(id){ const f = finalOf(id); if(!f){ toast("Your final feedback isn’t released yet."); return; }
    const blob = new Blob([feedbackDoc(f.s, f.sub, f.r, f.name)], {type:"text/html"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Calendar feedback - ${f.s.short} - ${f.name || "trainee"}.html`.replace(/[\\/:*?"<>|]+/g, "");
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
  print(id){ const f = finalOf(id); if(!f){ toast("Your final feedback isn’t released yet."); return; }
    const w = window.open("", "_blank"); if(!w){ toast("Allow pop-ups to print, or use Download."); return; }
    w.document.open(); w.document.write(feedbackDoc(f.s, f.sub, f.r, f.name)); w.document.close(); w.focus(); setTimeout(() => { try{ w.print(); }catch(err){} }, 400); }, save:saveNow, review:runReview,
  add(){
    if(S.events.length >= maxEv()){ tooMany(); return; }
    // the activity: a new event on the shown week's first day, 9 AM Pacific
    if(isAct(scn())){ const x = newAct(S.week * 7, 9 * 60, 60); actEditor(x, true, v => { if(!v) return; S.events.push(Object.assign(x, v)); actShow(x); }); return; }
    const x = {id:uid(), title:"", day:0, start:C.OPEN, dur:60, desc:"", guests:"", meet:false, remind:false, color:""};
    editor(x, true, v => { if(!v) return; S.events.push(Object.assign(x, v)); S.sel = x.id; changed(); repaint(); });
  },
  reset(){ if(S.events.length && !confirm(isAct(scn()) ? "Remove all of your events from this calendar?" : "Remove all of your events from this week?")) return; S.events = []; S.sel = null; changed(); repaint(); },
  pick(i){ pickScn(i); render(); },
  // open the page on a scenario ("attorney-activity") or a track ("standard": its first week), or where it was
  open(id){ if(id){ const i = scnIndex(id); if(i >= 0) pickScn(i); } if(state.view === "calsim") render(); else goto("calsim"); },
  // the activity's two weeks: ‹ › (or a week, with abs)
  week(n, abs){ const w = Math.max(0, Math.min(1, abs ? n : S.week + n)); if(w === S.week) return; S.week = w; S.caTop = null; render(); },
  state: () => S
};
// goto('calsim', '<scenario or track id>') opens the page on it (also the address #/calsim/<id>, e.g. a link from a Day 5 slide:
// the address then reads #/calsim, the page's own, so the browser's Back button leaves the page as usual).
const __gotoCal = window.goto;
window.goto = function(view, id){
  if(view === "calsim"){
    // (opened from a deck's slide: ← Back takes the trainee to that slide, not the Simulators page)
    if(state.view === "daydeck" && window.FTDayDecks){ const d = FTDayDecks.state(); S.from = {day: d.day, i: d.i}; }
    else if(state.view !== "calsim") S.from = null;
    let want = id;
    const m = String(location.hash || "").match(/^#\/calsim\/([^/?#]+)/);
    if(m){ if(want == null) want = decodeURIComponent(m[1]); try{ history.replaceState(history.state, "", location.pathname + location.search + "#/calsim"); }catch(err){} }
    const i = want ? scnIndex(String(want)) : -1; if(i >= 0) pickScn(i);
  }
  return __gotoCal.apply(this, arguments);
};
// 🛠 the Practice Lab's card for the activity (js/ft-simulators.js: shown from Day 5), with a link to the Portal's
// Calendar Management Activity track (ftsCalsim('activity'), in its own tab)
window.ftCalActivityCard = () => `<div class="card fts-card"><div class="fts-kicker">Day 5 · Calendar Management</div><h3>🗓 Attorney Calendar Management Activity</h3>
    <p class="fts-note">Manage the attorney’s Google Calendar in Pacific Time: the ten appointments and their travel blocks, each with its time zone, color, location, guests, reminders and notes. Checked on the spot by the 📅 Calendar Activity Check, then submitted to your trainer.</p>
    <div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="goto('calsim','attorney-activity')">Open the activity</button> <button class="btn btn-ghost btn-sm" type="button" title="Opens on the Main Portal’s Google Calendar Simulator, in its own tab" onclick="window.ftsCalsim ? ftsCalsim('activity') : 0">📅 Standard Training - Calendar Management Activity ↗</button></div></div>`;

/* ---------- results from the connected simulators (Portal, CMS) ---------- */
window.addEventListener("message", ev => {
  const d = ev.data;
  if(!d || d.type !== "lsh-sim-result" || d.sim !== "calendar" || !isTrainee()) return;
  if(ev.origin !== new URL(PORTAL).origin && ev.origin !== new URL(CMS).origin) return;
  const score = Number(d.score), max = Number(d.max);
  if(!isFinite(score) || !isFinite(max) || max <= 0 || score < 0 || score > max) return;
  const add = () => { S.data.external.push({title:String(d.title || "Calendaring Simulator").slice(0, 80), source:ev.origin, score, max, at:new Date().toISOString()});
    if(S.data.external.length > 30) S.data.external = S.data.external.slice(-30); queueSave(); if(state.view === "calsim") repaint(); };
  if(S.data) add(); else load().then(add);
});

/* ---------- admin: every trainee's submitted calendars, and the trainer's review ---------- */
const A = {guide:null, auto:true, sig:"", tick:0, timer:null, stale:false, rows:null, loading:false, open:{}, closed:{}, view:{}};
async function loadAdmin(){
  A.loading = true; if(!A.guide) A.guide = (await sharedGet("settings:calsim-guidelines").catch(() => null)) || {};
  try{
    const keys = (await sharedList("calsim:")) || [], ids = keys.map(k => String(k).replace(/^calsim:/, ""));
    const people = await sharedGetMany(ids.map(id => "trainee:" + id));
    const rows = ids.map((id, i) => { const r = people[i]; return {id, name:(r && r.name) || id, batch:(r && r.batch) || "", archived:!!(r && r.archived)}; }).filter(x => !x.archived);
    const recs = await ftGetMany(rows.map(x => "calsim:" + x.id));
    rows.forEach((x, i) => { x.d = norm(recs[i]); });
    A.rows = rows.sort((a, b) => (a.name || "").localeCompare(b.name || "")); A.sig = sigOf(A.rows);
  }catch(err){ A.rows = []; }
  A.loading = false;
  if(state.view === "admin" && state.adminTab === "calscores") render();
}
// One trainee's scores, per week: the automated review of their latest submission and the trainer's score for it.
function scoresOf(x){
  return C.SCENARIOS.map(s => {
    const last = x.d.submissions.filter(z => z.scn === s.id).pop(); if(!last) return "";
    const au = subReview(s, last).pct, r = x.d.reviews[subKey(last)];
    return `<span class="cs-pill">${e(s.short)}: 🤖 ${au}%${released(r) && r.score != null ? ` · 👤 ${e(r.score)}/100` : ""}</span>`;
  }).join("");
}
const unreviewed = x => x.d.submissions.filter(z => !released(x.d.reviews[subKey(z)])).length;
function renderAdminScores(){
  if(!A.rows && !A.loading) loadAdmin();
  if(!A.rows) return `<div class="card" style="padding:24px;">Loading the calendars…</div>`;
  const groups = {}; A.rows.forEach(x => { (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a, b) => (a === "") - (b === "") || b.localeCompare(a, undefined, {numeric:true}));
  startPoll();
  return `<div class="card cs-admin"><h3>📅 Calendar Scores</h3>
    <p class="cs-hint"><b>🗓 The Attorney Calendar Management Activity (Day 5) is done and graded here.</b> Its submissions are listed below with the automated review and the AI feedback: open one (🖥 Live review or 👁 View) to add your feedback and finalize the report. The rules box below has a place for the activity’s own guidelines.</p>
    <p class="cs-hint"><b>The Standard Training weeks now run on the Main Portal.</b> <button class="btn btn-navy btn-sm" onclick="ftsEvaluations()">📋 Open Trainee Evaluations on the Portal ↗</button> <button class="btn btn-ghost btn-sm" onclick="ftsCalsim('standard', true)">Open Standard Training - Mock Call scores on the Portal ↗</button> <button class="btn btn-ghost btn-sm" onclick="ftsCalsim('activity', true)">Open Standard Training - Calendar Management Activity scores on the Portal ↗</button> Trainee Evaluations has each trainee's submitted calendar with its AI review, your own feedback and the report you send to them; grade and give feedback there; the scores also show on the Portal’s Progress page under this program. The older Standard calendars saved here are listed below too.</p>
    ${feedHTML()}${guideHTML()}
    <p class="cs-hint">Each trainee’s calendars, with scores per trainee. Open a submission to see exactly what they built, the automated review against the attorney’s rules, and add your own feedback: a score out of 100, an overall comment and a comment on each task. They see your feedback on their Calendar Scheduler page. Scores from the Portal’s Calendaring Simulator are saved on the Portal under program FT; any result it posts back shows here too.</p>
    ${A.rows.length ? keys.map(b => `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTCalAdmin.batch(${e(JSON.stringify(b))})">${A.closed[b] ? "▸" : "▾"} <b>📁 ${e(b ? "Batch " + b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length === 1 ? "" : "s"}</span></div>
      ${A.closed[b] ? "" : groups[b].map(x => { const n = x.d.submissions.length, u = unreviewed(x); return `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTCalAdmin.row(${js(x.id)})">${A.open[x.id] ? "▾" : "▸"} <b>${e(x.name)}</b>
        ${n ? `<span class="cs-pill ok">📤 ${n} submitted</span>` : `<span class="cs-pill">Not submitted</span>`}${scoresOf(x)}${u ? `<span class="cs-pill warn">${u} to review</span>` : n ? `<span class="cs-pill ok">All reviewed</span>` : ""}</div>
        ${A.open[x.id] ? detailHTML(x) : ""}</div>`; }).join("")}</section>`).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has used the Calendar Scheduler yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.refresh()">Refresh</button></div></div>`;
}
// 📡 Live feed: new submissions and their AI feedback show up here on their own, so the trainer can open them while the trainee waits.
const sigOf = rows => rows.map(r => r.id + ":" + r.d.submissions.map(z => z.at + (z.ai ? (z.ai.error ? "e" : "a") : z.aiPending ? "p" : "n") + (r.d.reviews[subKey(z)] ? (released(r.d.reviews[subKey(z)]) ? "R" : "D") : "")).join(",")).join("|");
const aiState = z => z.ai ? (z.ai.error ? ["warn", "AI check failed"] : ["ok", "AI feedback ready"]) : (z.aiPending && Date.now() - new Date(z.at).getTime() < 180000 ? ["warn", "🤖 AI checking…"] : ["warn", "No AI feedback"]);
function feedHTML(){
  const all = []; A.rows.forEach(x => x.d.submissions.forEach(z => all.push({x, z})));
  all.sort((a, b) => b.z.at.localeCompare(a.z.at));
  return `<div class="cs-feed"><div class="cs-feed-hd"><b>📡 Live submissions</b><label class="cs-feed-auto"><input type="checkbox" ${A.auto ? "checked" : ""} onchange="FTCalAdmin.auto(this.checked)"> update on its own</label>${A.stale ? '<button class="btn btn-primary btn-sm" onclick="FTCalAdmin.refresh()">New activity: refresh</button>' : ""}</div>
    ${all.length ? all.slice(0, 5).map(({x, z}) => { const s = C.SCENARIOS.find(q => q.id === z.scn), st = aiState(z), r = x.d.reviews[subKey(z)];
      return `<div class="cs-feed-row"><span><b>${e(x.name)}</b> · ${e(s ? s.short : z.scn)} · ${e(new Date(z.at).toLocaleTimeString())}</span><span class="cs-pill ${st[0]}">${st[1]}</span>${released(r) ? '<span class="cs-pill ok">Report finalized</span>' : ""}<button class="btn btn-navy btn-sm" onclick="FTCalAdmin.live(${js(x.id)},${js(subKey(z))})">🖥 Open live review</button></div>`; }).join("") : '<p class="cs-hint">Nothing submitted yet. New submissions and their AI feedback appear here as they happen.</p>'}</div>`;
}
const GUIDE_KEYS = [["all", "All weeks"]];
function guideHTML(){
  const g = A.guide || {};
  return `<details class="cs-guide"><summary>📘 Rules, guidelines and notes for the AI review</summary>
    <p class="cs-hint">Write the rules, guidelines or notes the AI should hold the trainees to, beyond each task’s built-in rules (what a good appointment looks like, wording for titles and descriptions, what to always set, common mistakes). The AI applies them when it reviews a submission.</p>
    ${GUIDE_KEYS.concat(C.SCENARIOS.map(q => [q.id, q.title])).map(([k, name]) => `<label class="cs-rv-t">${e(name)}<textarea id="csg_${e(k)}" rows="3" maxlength="3000" class="cs-rv-ta">${e(g[k] || "")}</textarea></label>`).join("")}
    <button class="btn btn-navy btn-sm" onclick="FTCalAdmin.saveGuide()">💾 Save rules and notes</button></details>`;
}
function startPoll(){ if(!A.timer) A.timer = setInterval(pollAdmin, 10000); }
async function pollAdmin(){
  if(document.hidden || !A.auto || state.view !== "admin" || state.adminTab !== "calscores" || !A.rows || A.loading) return;
  try{
    // Two requests a poll: the list of trainees with a record, and their records in one batch (names only for a trainee not seen yet).
    const keys = (await sharedList("calsim:")) || [], ids = keys.map(k => String(k).replace(/^calsim:/, ""));
    const known = Object.fromEntries(A.rows.map(r => [r.id, r])), fresh = ids.filter(id => !known[id]);
    const people = fresh.length ? await sharedGetMany(fresh.map(id => "trainee:" + id)) : [], recs = await ftGetMany(ids.map(id => "calsim:" + id));
    const rows = ids.map((id, i) => { const old = known[id], p = old ? null : people[fresh.indexOf(id)]; return {id, name:old ? old.name : ((p && p.name) || id), batch:old ? old.batch : ((p && p.batch) || ""), archived:!old && !!(p && p.archived), d:norm(recs[i])}; }).filter(x => !x.archived);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const sig = sigOf(rows); if(sig === A.sig) return;
    rows.forEach(r => { const o = known[r.id], n = r.d.submissions; if(!o){ if(n.length) toast(`${r.name} submitted a calendar.`); return; }
      if(n.length > o.d.submissions.length) toast(`${r.name} just submitted a calendar.`);
      n.forEach(z => { const oz = o.d.submissions.find(q => q.at === z.at); if(oz && !oz.ai && z.ai && !z.ai.error) toast(`AI feedback is ready for ${r.name}.`); }); });
    A.rows = rows; A.sig = sig;
    const f = document.activeElement;
    if(f && /^(TEXTAREA|INPUT)$/.test(f.tagName) && f.closest(".cs-admin")){ A.stale = true; const hd = document.querySelector(".cs-feed-hd"); if(hd && !hd.querySelector(".btn")) hd.insertAdjacentHTML("beforeend", '<button class="btn btn-primary btn-sm" onclick="FTCalAdmin.refresh()">New activity: refresh</button>'); return; }
    A.stale = false; if(!L) render();
  }catch(err){}
}

function detailHTML(x){
  const list = x.d.submissions.slice().reverse().map((z, i) => {
    const s = C.SCENARIOS.find(q => q.id === z.scn); if(!s) return "";
    return atSub(z, () => {      // this trainee's submission, at its own anchor
    const events = C.cleanFor(s, z.events), k = subKey(z), key = x.id + "|" + k, shown = !!A.view[key], r = x.d.reviews[k], g = subReview(s, z), rel = released(r);
    const tk = s.tasks.map(t => `<label class="cs-rv-t">${e(t.title)} <input type="text" maxlength="400" id="csrt_${e(key)}_${e(t.id)}" value="${r && r.tasks ? e(r.tasks[t.id] || "") : ""}" placeholder="Your comment on this task (optional)"></label>`).join("");
    return `<div class="cs-sub"><div class="cs-sub-hd">📤 <b>${e(s.title)}</b> · submitted ${e(new Date(z.at).toLocaleString())} · ${events.length} event${events.length === 1 ? "" : "s"} for ${isAct(s) ? s.key.length + " expected events" : s.tasks.length + " tasks"} · <span class="cs-pill ${g.passed ? "ok" : ""}">🤖 Automated: ${g.pct}%</span>
      <span class="cs-pill ${aiState(z)[0]}">${aiState(z)[1]}</span>
      ${i === 0 ? '<span class="cs-pill ok">latest</span>' : ""}${rel ? `<span class="cs-pill ok">Released${r.score != null ? ": " + e(r.score) + "/100" : ""}</span>` : r ? '<span class="cs-pill warn">Draft saved</span>' : '<span class="cs-pill warn">To review</span>'}
      <button class="btn btn-navy btn-sm" onclick="FTCalAdmin.live(${js(x.id)},${js(k)})">🖥 Live review</button>
      <button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.view(${js(key)})">${shown ? "Hide details" : "👁 View calendar and feedback"}</button></div>
      ${shown ? `<div class="cs-gridwrap">${gridHTML(s, events, true)}</div>
        <div class="cs-lab">🤖 AI feedback <button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.regen(${js(x.id)},${js(k)})">↻ ${z.ai ? "Regenerate" : "Generate"}</button></div>${z.ai ? aiBlock(z.ai) + (z.ai.error ? "" : taskFeedback(s, z.ai, r)) : '<p class="cs-hint">The AI check runs when the trainee submits. Generate it here if it’s missing.</p>'}
        <div class="cs-lab">🤖 Automated review (the attorney’s rules)</div>${reviewHTML(g, r && r.tasks)}
        <div class="cs-lab">👤 Your feedback</div>
        <div class="cs-rv"><label>Score (0–100) <input type="number" min="0" max="100" id="csrs_${e(key)}" value="${r && r.score != null ? e(r.score) : ""}"></label>
          <label class="cs-rv-c">Written insights for the trainee <textarea id="csrc_${e(key)}" rows="3">${r ? e(r.comment) : ""}</textarea></label></div>
        <label class="cs-rv-t">Also missed: points the AI left out (one per line)<textarea id="csrx_${e(key)}" rows="3" class="cs-rv-ta">${r ? e((r.extra || []).join("\n")) : ""}</textarea></label>
        <div class="cs-rv-ts">${tk}</div>
        <div class="cs-m-btns"><button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.review(${js(x.id)},${js(k)},${js(key)},false)">💾 Save draft</button>
          <button class="btn btn-navy btn-sm" onclick="FTCalAdmin.review(${js(x.id)},${js(k)},${js(key)},true)">${rel ? "📄 Update the final report" : "📄 Finalize and generate the report"}</button>${rel ? `<button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.withdraw(${js(x.id)},${js(k)})">↩ Withdraw (back to draft)</button>` : ""}</div>
        <p class="cs-hint">The trainee sees the AI feedback as soon as they submit. When you finalize, they get the finalized report (done correctly, needs improvement, missed requirements, your additions and insights) to review and download.</p>` : ""}</div>`; });
  }).join("");
  const ext = x.d.external.slice().reverse().map(z => `<div class="cs-att-ext">🔗 ${e(new Date(z.at).toLocaleString())} · ${e(z.title)} · <b>${Math.round(z.score)}/${Math.round(z.max)}</b></div>`).join("");
  const runs = x.d.autos.length ? `<div class="cs-att-ext">🤖 ${x.d.autos.length} automated review run${x.d.autos.length === 1 ? "" : "s"} while practicing: ${C.SCENARIOS.map(q => { const b = x.d.autos.filter(a => a.scn === q.id).reduce((m, a) => Math.max(m, a.pct), -1); return b < 0 ? "" : `${e(q.short)} best ${b}%`; }).filter(Boolean).join(", ")}</div>` : "";
  return `<div class="cs-atts">${list || '<div class="fp-muted">Nothing submitted yet.</div>'}${runs}${ext}</div>`;
}
// Save the trainer's side of one submission (a fresh read first: the trainee may have saved since this screen loaded).
async function persist(id, mutate){
  const row = A.rows.find(r => r.id === id); if(!row) throw new Error("trainee");
  const fresh = norm(await sharedGet("calsim:" + id)); mutate(fresh);
  if(await sharedSet("calsim:" + id, fresh) === false) throw new Error("save");
  row.d = fresh; return fresh;
}
const lines = v => String(v || "").split("\n").map(x => x.trim().slice(0, 300)).filter(Boolean).slice(0, 12);
function reviewPatch(id, k, release, src){
  const s = C.SCENARIOS.find(q => q.id === k.split("|")[0]);
  const sc = src.score === "" || src.score == null ? null : Number(src.score);
  if(sc != null && (!isFinite(sc) || sc < 0 || sc > 100)) throw new Error("Enter a score from 0 to 100.");
  if(release && sc == null) throw new Error("Enter a score from 0 to 100 before releasing.");
  const tasks = Object.fromEntries(s.tasks.map(t => [t.id, String(src.tasks[t.id] || "").trim().slice(0, 400)]).filter(p => p[1]));
  return {score:sc == null ? null : Math.round(sc), comment:String(src.comment || "").trim().slice(0, 2000), extra:lines(src.extra), tasks};
}
async function saveReview(id, k, patch, release){
  await persist(id, d => { const old = d.reviews[k] || {}; d.reviews[k] = Object.assign({}, old, patch, {by:state.adminName || "Trainer", at:new Date().toISOString(),
    released:release ? true : (old.released === true && release !== false ? true : false), releasedAt:release ? new Date().toISOString() : old.releasedAt}); });
}
window.FTCalAdmin = {
  row(id){ A.open[id] = !A.open[id]; render(); },
  batch(b){ A.closed[b] = !A.closed[b]; render(); },
  view(k){ A.view[k] = !A.view[k]; render(); },
  refresh(){ A.rows = null; A.stale = false; render(); },
  auto(on){ A.auto = !!on; },
  async saveGuide(){
    const g = {}; GUIDE_KEYS.concat(C.SCENARIOS.map(q => [q.id])).forEach(([k]) => { const v = String((document.getElementById("csg_" + k) || {}).value || "").trim().slice(0, 3000); if(v) g[k] = v; });
    try{ if(await sharedSet("settings:calsim-guidelines", g) === false) throw new Error("save"); A.guide = g; S.guide = g; toast("Rules and notes saved: the AI uses them from the next submission."); }catch(err){ toast("Couldn’t save. Check your connection."); }
  },
  async review(id, k, key, release){
    const g = n => (document.getElementById(n) || {}).value;
    const s = C.SCENARIOS.find(q => q.id === k.split("|")[0]);
    try{
      const patch = reviewPatch(id, k, release, {score:g("csrs_" + key), comment:g("csrc_" + key), extra:g("csrx_" + key), tasks:Object.fromEntries(s.tasks.map(t => [t.id, g("csrt_" + key + "_" + t.id)]))});
      await saveReview(id, k, patch, release ? true : null);
      toast(release ? "Final report generated: the trainee can review it and download a copy." : "Draft saved."); render();
    }catch(err){ toast(err && /score/i.test(err.message) ? err.message : "Couldn’t save. Check your connection."); }
  },
  async withdraw(id, k){ try{ await persist(id, d => { if(d.reviews[k]) d.reviews[k].released = false; }); toast("Back to draft: the trainee no longer sees your feedback."); render(); }catch(err){ toast("Couldn’t save. Check your connection."); } },
  async regen(id, k){
    const row = A.rows.find(r => r.id === id), z = row && row.d.submissions.find(q => subKey(q) === k), s = z && C.SCENARIOS.find(q => q.id === z.scn); if(!z) return;
    toast("Asking the AI…"); const ai = await generateAI(s, atSub(z, () => C.cleanFor(s, z.events)), "trainer", subAnchor(z));
    try{ await persist(id, d => { const t = d.submissions.find(q => subKey(q) === k); if(t) t.ai = ai; }); toast(ai.error ? "The AI check wasn’t available." : "AI feedback updated."); render(); }catch(err){ toast("Couldn’t save. Check your connection."); }
  },

  /* ----- 🖥 Live review: the trainer talks the feedback through as it shows on screen, step by step ----- */
  live(id, k){
    const row = A.rows.find(r => r.id === id), z = row && row.d.submissions.find(q => subKey(q) === k), s = z && C.SCENARIOS.find(q => q.id === z.scn); if(!z) return;
    const r = row.d.reviews[k] || {};
    L = {id, k, step:0, name:row.name, s, z, anchor:subAnchor(z), events:atSub(z, () => C.cleanFor(s, z.events)), g:subReview(s, z), tasks:Object.assign({}, r.tasks || {}), extra:(r.extra || []).join("\n"), comment:r.comment || "", score:r.score != null ? r.score : "", released:released(r)};
    paintLive(); document.body.classList.add("cs-live-open"); startLivePoll();
  },
  liveGo(n){ liveSync(); L.step = Math.max(0, Math.min(L.s.tasks.length + 1, n)); paintLive(); },
  liveClose(){ liveSync(); clearInterval(L && L.timer); const m = document.getElementById("csLive"); if(m) m.remove(); document.body.classList.remove("cs-live-open"); L = null; render(); },
  async liveSave(release){
    liveSync();
    try{
      const patch = reviewPatch(L.id, L.k, release, {score:L.score, comment:L.comment, extra:L.extra, tasks:L.tasks});
      await saveReview(L.id, L.k, patch, release ? true : null);
      L.released = L.released || !!release; toast(release ? "Final report generated: the trainee can review it and download a copy." : "Draft saved."); paintLive();
    }catch(err){ toast(err && /score/i.test(err.message) ? err.message : "Couldn’t save. Check your connection."); }
  }
};
let L = null;
const aiPendingNow = () => !!L && !L.z.ai && aiState(L.z)[1].indexOf("checking") >= 0;
// While the AI is still writing, the open live review picks its feedback up as soon as the trainee's browser has saved it.
function startLivePoll(){
  if(!aiPendingNow()) return;
  L.timer = setInterval(async () => {
    if(!L || document.hidden) return;
    try{
      const d = norm(await sharedGet("calsim:" + L.id)), z = d.submissions.find(q => subKey(q) === L.k); if(!z) return;
      const row = A.rows.find(r => r.id === L.id); if(row) row.d = d;
      if(z.ai || !aiPendingNow()){ liveSync(); L.z = z; clearInterval(L.timer); A.sig = row ? sigOf(A.rows) : A.sig; paintLive(); toast(z.ai && !z.ai.error ? "The AI feedback has arrived." : "The AI check didn’t finish."); }
    }catch(err){}
  }, 4000);
}
function liveSync(){
  if(!L) return; const q = id => document.getElementById(id);
  const t = L.s.tasks[L.step - 1];
  if(t && q("cslNote")){ const v = q("cslNote").value.trim(); if(v) L.tasks[t.id] = v; else delete L.tasks[t.id]; }
  if(L.step === L.s.tasks.length + 1 && q("cslExtra")){ L.extra = q("cslExtra").value; L.comment = q("cslComment").value; L.score = q("cslScore").value; }
}
// (at the submission's anchor, L.anchor: its dates, the tasks' notes, whenText)
const paintLive = () => X.withAnchor(L.anchor, paintLiveAt);
function paintLiveAt(){
  let m = document.getElementById("csLive"); if(!m){ m = document.createElement("div"); m.id = "csLive"; m.className = "cs-liveov"; document.body.appendChild(m); }
  const s = L.s, n = s.tasks.length, st = L.step, ai = L.z.ai && !L.z.ai.error ? L.z.ai : null, by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  const t = s.tasks[st - 1], gi = t && L.g.items.find(x => x.id === t.id), a = t && by[t.id];
  const steps = ["Overview"].concat(s.tasks.map((x, i) => isAct(s) ? x.title : (i + 1) + ". " + x.title), ["Anything missed?"]);   // (the activity's titles carry their item numbers)
  let body;
  if(st === 0){
    body = `<h2>${e(L.name)} · ${e(s.title)}</h2>
      <div class="cs-live-score"><b>${L.g.pct}%</b><span>automated review · ${L.g.done} of ${n} ${isAct(s) ? "events perfect" : "tasks perfect"}</span></div>
      ${ai ? aiBlock(ai) : aiPendingNow() ? `<div class="cs-ai"><b>🤖 AI feedback</b><p class="cs-hint cs-pulse">The AI is checking the calendar against the rules and notes… it will appear here as soon as it’s ready. The rule results below are already in.</p></div>` : `<p class="cs-hint">${L.z.ai ? "The AI check wasn’t available. Go through the rule results task by task." : "No AI feedback was saved for this submission. Go through the rule results task by task, or generate it from the list."}</p>`}
      <div class="cs-live-sum">${["correct", "improve", "missed"].map((k, i) => { const n = reportSections(s, L.z, null)[k].length; return `<span class="cs-chip2 ${["met", "partial", "missed"][i]}">${["✅ Done correctly", "🔧 Needs improvement", "❗ Missed"][i]}: ${n}</span>`; }).join(" ")}</div>`;
  }else if(t){
    const stt = a && STATUS[a.status] || (gi.perfect ? STATUS.met : gi.found ? STATUS.partial : STATUS.missed);
    body = `<div class="cs-live-k">${isAct(s) ? `${t.item ? "Item " + t.item + " · " : ""}${st} of ${n}` : `Task ${st} of ${n}`}</div><h2>${e(t.title)} <span class="cs-chip2 ${a ? e(a.status) : (gi.perfect ? "met" : gi.found ? "partial" : "missed")}">${stt[0]} ${stt[1]}</span></h2>
      <div class="cs-live-rule"><b>${isAct(s) ? "Expected" : "The rule"}:</b> ${e(t.note)}</div>
      ${gi.event ? `<div class="cs-live-ev">On the calendar: <b>${e(gi.event.title)}</b> · ${e(whenText(s, gi.event))}${gi.via ? " (as a note on this event)" : ""}</div>` : gi.found ? "" : `<div class="cs-live-ev bad">Not found on the calendar.</div>`}
      <ul class="cs-live-checks">${gi.checks.map(c => `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} <b>${e(c.label)}</b>${c.ok ? "" : ": " + e(c.why)}</li>`).join("")}${(gi.info || []).map(x => `<li class="info">ℹ ${e(x)}</li>`).join("")}</ul>
      ${a && a.feedback ? `<div class="cs-live-ai">🤖 ${e(a.feedback)}</div>` : (aiPendingNow() ? `<div class="cs-live-ai cs-pulse">🤖 The AI is still writing its feedback on this task…</div>` : "")}
      <label class="cs-rv-t">👤 Your note on this task (the trainee sees it when you release)<textarea id="cslNote" rows="3" class="cs-rv-ta">${e(L.tasks[t.id] || "")}</textarea></label>`;
  }else{
    const bad = L.g.items.filter(x => !x.perfect).length;
    body = `<h2>Anything the AI missed?</h2><p class="cs-hint">${bad ? bad + (isAct(s) ? " step" : " task") + (bad === 1 ? "" : "s") + " still ha" + (bad === 1 ? "s" : "ve") + " something to fix. " : (isAct(s) ? "Every check passed. " : "Every task passed its rules. ")}Add anything else you want the trainee to take away.</p>
      <label class="cs-rv-t">Also missed: one point per line<textarea id="cslExtra" rows="4" class="cs-rv-ta">${e(L.extra)}</textarea></label>
      <label class="cs-rv-t">Your written insights<textarea id="cslComment" rows="4" class="cs-rv-ta">${e(L.comment)}</textarea></label>
      <div class="cs-rv"><label>Score (0–100) <input type="number" min="0" max="100" id="cslScore" value="${e(L.score)}" placeholder="${L.g.pct}"></label></div>
      <div class="cs-m-btns"><button class="btn btn-ghost" onclick="FTCalAdmin.liveSave(false)">💾 Save draft</button><button class="btn btn-primary" onclick="FTCalAdmin.liveSave(true)">📄 ${L.released ? "Update the final report" : "Finalize and generate the report"}</button></div>
      ${L.released ? '<p class="cs-hint">Released: the trainee can see this and download a copy.</p>' : ""}`;
  }
  m.innerHTML = `<div class="cs-live-bar"><b>🖥 Live review · ${e(L.name)} · ${e(s.short)}</b><button class="btn btn-navy btn-sm" onclick="FTCalAdmin.liveClose()">✕ Close</button></div>
    <div class="cs-live-body"><div class="cs-live-cal"><div class="cs-gridwrap">${gridHTML(s, L.events, true, gi && gi.event ? gi.event.id : null)}</div></div>
      <div class="cs-live-side"><div class="cs-live-steps">${steps.map((x, i) => `<button class="cs-live-step ${i === st ? "on" : ""} ${i > 0 && i <= n ? (L.g.items[i - 1].perfect ? "ok" : "bad") : ""}" onclick="FTCalAdmin.liveGo(${i})">${e(x)}</button>`).join("")}</div>
        <div class="cs-live-panel">${body}</div>
        <div class="cs-live-nav"><button class="btn btn-ghost" ${st === 0 ? "disabled" : ""} onclick="FTCalAdmin.liveGo(${st - 1})">← Back</button><button class="btn btn-navy" ${st === n + 1 ? "disabled" : ""} onclick="FTCalAdmin.liveGo(${st + 1})">Next →</button></div></div></div>`;
  const row = m.querySelector(".ca-hl"); if(row && row.scrollIntoView) row.scrollIntoView({block:"center"});     // the activity's agenda: the event talked about
}
// An event's time in words: the Standard week's day and hours, or the activity's Pacific time and the event's own zone.
const whenText = (s, ev) => isAct(s) ? `${X.whenOf(ev)} Pacific${X.zoneText(ev) ? " · event zone: " + X.zoneText(ev) : ""}` : `${C.DAYS[ev.day]} ${hh(ev.start)} – ${hh(ev.start + ev.dur)}`;

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "calsim"){ S.entered = false; return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  X.setAnchor(pageAnchor());      // the page's anchor (another page, e.g. a trainer's slides, may have set its own)
  const page = renderPage();
  app.innerHTML = renderTopbar() + `<main class="main-calsim${isAct(scn()) && open() ? " ca-wide" : ""}">${page}</main>` + renderFooter();
  wire(); paintSave(); restoreTop();
  try{ afterRender(); }catch(err){}
  if(!S.loading && (!S.data || !S.entered || S.who !== (isTrainee() ? state.traineeId : ""))){ S.entered = true; load(); }   // read the record afresh each time the page opens (a trainer may have reviewed since)
  if(isTrainee() && !state.ftOpenDays && typeof ftLoadOpenDays === "function") ftLoadOpenDays().then(() => { if(state.view === "calsim") render(); }).catch(() => {});
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "calscores" ? "active" : ""}" onclick="setAdminTab('calscores')">📅 Calendar Scores</button>`;
  if(state.adminTab === "calscores"){
    state.adminTab = "opendays";
    const out = __admin.apply(this, arguments);
    state.adminTab = "calscores";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    return out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>" + renderAdminScores();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};

(function(){ const st = document.createElement("style"); st.id = "ft-calendar"; st.textContent = `
main.main-calsim{max-width:1180px;margin:0 auto;padding:22px 16px 40px;}
.cs-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;} .cs-top h1{margin:0 0 4px;color:var(--navy);font-size:28px;}
.cs-lead{margin:0 0 14px;color:var(--ink-soft);font-size:15px;}
.cs-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.cs-tab{border:1px solid var(--line,#e5e7eb);background:var(--card,#fff);color:var(--navy);border-radius:999px;padding:8px 16px;font-weight:700;font-size:13.5px;cursor:pointer;}
.cs-tab i{font-style:normal;font-weight:600;color:var(--ink-soft);margin-left:6px;font-size:12px;} .cs-tab.active{background:var(--navy);color:#fff;border-color:var(--navy);} .cs-tab.active i{color:#fdba74;}
.cs-brief{padding:12px 16px;margin-bottom:14px;font-size:14px;color:var(--ink-soft);} .cs-err{color:#b91c1c;font-size:13px;margin-bottom:8px;}
.cs-main{display:grid;grid-template-columns:290px minmax(0,1fr);gap:14px;align-items:start;}
.cs-tray{background:var(--card,#fff);border:1px solid var(--line,#d1d5db);border-radius:14px;padding:12px;position:sticky;top:8px;max-height:calc(100vh - 16px);overflow:auto;}
.cs-tray h3{margin:0 0 4px;font-size:15px;color:var(--navy);} .cs-count{font-size:12px;font-weight:700;color:var(--orange-deep);margin-left:4px;}
.cs-hint{margin:0 0 10px;font-size:12.5px;color:var(--ink-soft);} .cs-legend{margin:8px 2px 0;}
.cs-task{background:#fff;border:1px solid var(--line,#e5e7eb);border-left:4px solid #f97316;border-radius:10px;padding:9px 11px;margin-bottom:8px;}
.cs-task b{font-size:13.5px;color:var(--navy);line-height:1.25;display:block;}
.cs-task p{margin:4px 0 0;font-size:12px;color:var(--ink-soft);line-height:1.35;} .cs-dur{display:inline-block;margin-top:3px;font-size:11px;font-weight:800;background:#ffedd5;color:#9a3412;border-radius:999px;padding:1px 8px;}
.cs-gridwrap{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:8px;overflow-x:auto;}
.cs-grid{display:grid;grid-template-columns:54px repeat(5,minmax(112px,1fr));min-width:660px;}
.cs-dayhd{height:28px;line-height:28px;text-align:center;font-weight:800;font-size:13px;color:var(--navy);}
.cs-timecol{position:relative;} .cs-time{position:absolute;right:6px;font-size:10.5px;color:var(--ink-soft);}
.cs-col{position:relative;cursor:cell;touch-action:pan-y;border-left:1px solid #dadce0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${SH * 4 - 1}px,#dadce0 ${SH * 4 - 1}px,#dadce0 ${SH * 4}px);}
.cs-col::before,.cs-col::after{content:"";position:absolute;left:0;right:0;background:rgba(100,116,139,.12);pointer-events:none;} .cs-col::before{top:0;height:${SH * 4}px;} .cs-col::after{top:${px(17 * 60)}px;bottom:0;}
.cs-ev{position:absolute;left:3px;right:3px;border-radius:7px;padding:2px 6px;overflow:hidden;font-size:11.5px;line-height:1.2;box-sizing:border-box;z-index:2;}
.cs-ev b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cs-ev span{display:block;font-size:10.5px;opacity:.85;white-space:nowrap;}
.cs-fixed{background:#e8eaed;color:#3c4043;border:1px solid #dadce0;cursor:not-allowed;} .cs-court{background:#3f51b5;color:#fff;border-color:#3f51b5;}
.cs-lunch{background:repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px);color:#64748b;}
.cs-buf{position:absolute;left:3px;right:3px;background:repeating-linear-gradient(135deg,rgba(30,58,138,.14),rgba(30,58,138,.14) 4px,transparent 4px,transparent 8px);border-radius:6px;z-index:1;pointer-events:none;}
.cs-req{background:#039be5;color:#fff;border:1px solid #0288d1;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;z-index:3;box-shadow:0 1px 3px rgba(0,0,0,.2);padding-right:18px;}
.cs-req:focus-visible{outline:3px solid #fdba74;outline-offset:1px;} .cs-req.cs-sel{box-shadow:0 0 0 2px var(--navy);} .cs-req.cs-bad,.cs-ro.cs-bad{background:#d93025;border-color:#b3261e;color:#fff;} .cs-req.cs-lifted{opacity:.35;}
.cs-x{position:absolute;top:1px;right:2px;width:16px;height:16px;border:0;border-radius:4px;background:rgba(0,0,0,.12);color:#111;font-size:10px;line-height:16px;padding:0;cursor:pointer;} .cs-x:hover{background:rgba(0,0,0,.3);color:#fff;}
.cs-rs{position:absolute;left:0;right:0;bottom:0;height:8px;cursor:ns-resize;touch-action:none;background:linear-gradient(transparent,rgba(0,0,0,.18));}
.cs-prev{position:absolute;left:3px;right:3px;border-radius:7px;z-index:5;pointer-events:none;font-size:10.5px;font-weight:700;padding:2px 6px;box-sizing:border-box;}
.cs-prev.ok{background:rgba(34,197,94,.3);border:2px solid #16a34a;color:#14532d;} .cs-prev.bad{background:rgba(239,68,68,.28);border:2px solid #dc2626;color:#7f1d1d;}
.cs-ghost{position:fixed;z-index:9500;pointer-events:none;background:#f97316;color:#111827;border-radius:8px;padding:4px 8px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,.3);opacity:.92;overflow:hidden;box-sizing:border-box;}
body.cs-dragging,body.cs-dragging *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important;}
.cs-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;} .cs-save{font-size:12.5px;color:var(--ink-soft);}
.cs-eval{padding:14px 16px;} .cs-eval-hd h2{margin:0 0 8px;font-size:18px;color:var(--navy);} .cs-eval h3{font-size:15px;margin:10px 0 6px;color:var(--navy);} .cs-eval-cols{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;margin-top:8px;} @media(max-width:900px){.cs-eval-cols{grid-template-columns:1fr;}}
.cs-hist{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;} .cs-hist-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.cs-pill{display:inline-block;background:#eef2ff;color:#1e3a8a;border-radius:999px;padding:3px 11px;font-size:12px;font-weight:700;margin:0 4px 0 6px;} .cs-hist .cs-pill{margin:0;} .cs-pill.ok{background:#dcfce7;color:#166534;} .cs-pill.warn{background:#fef3c7;color:#92400e;}
.cs-more{padding:14px 18px;} .cs-more p{margin:4px 0 10px;font-size:13.5px;color:var(--ink-soft);} .cs-more a{text-decoration:none;}
.cs-admin{padding:16px 18px;} .cs-atts{margin:6px 0 10px 18px;} .cs-att-ext{font-size:13px;margin:4px 0;}
.cs-sub,.cs-sub *{text-transform:none;letter-spacing:normal;} .cs-sub{border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:8px 12px;margin:6px 0;} .cs-sub-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;} .cs-sub .cs-gridwrap{margin:8px 0;}
.cs-ro{background:#039be5;color:#fff;border:1px solid #0288d1;z-index:3;} .cs-result{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-left:6px solid #f97316;border-radius:12px;padding:14px 16px;margin:0 0 14px;} .cs-result.ok{border-left-color:#16a34a;}
.cs-score{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px;} .cs-score b{font-size:32px;color:var(--navy);} .cs-score span{font-weight:700;color:var(--ink-soft);}
.cs-item{border-top:1px solid var(--line,#e5e7eb);padding:8px 0;font-size:13.5px;} .cs-item-hd{display:flex;gap:6px;align-items:baseline;} .cs-item-hd span{margin-left:auto;font-weight:700;color:var(--ink-soft);white-space:nowrap;}
.cs-item.ok .cs-item-hd{color:#166534;} .cs-item.bad .cs-item-hd{color:#991b1b;} .cs-item ul{margin:4px 0 0 22px;padding:0;color:#7f1d1d;font-size:13px;} .cs-tnote{margin-top:4px;font-size:13px;color:#14532d;background:#f0fdf4;border-radius:6px;padding:4px 8px;}
.cs-rv-ts{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px;} .cs-rv-t{display:flex;flex-direction:column;gap:2px;font-size:12px;font-weight:700;color:var(--ink-soft);} .cs-rv-t input{padding:6px 8px;font:inherit;font-weight:400;}
.cs-rv{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin:8px 0 4px;} .cs-rv label{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:var(--ink-soft);} .cs-rv input{width:90px;padding:6px 8px;} .cs-rv-c{flex:1 1 280px;} .cs-rv textarea{width:100%;padding:6px 8px;font:inherit;}
.cs-blurb{margin:0 0 12px;font-size:13.5px;color:var(--ink-soft);max-width:820px;} .cs-weeks{margin-top:-4px;} .cs-wk{font-size:12.5px;padding:6px 14px;} .cs-et{font-size:11px;color:var(--ink-soft);} .cs-chip{background:#e0f2fe;color:#075985;margin-left:4px;}
.cs-modal{position:fixed;inset:0;z-index:9800;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;}
.cs-dlg{width:min(460px,100%);background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 24px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px;}
.cs-m-title{border:0;border-bottom:2px solid #1a73e8;font-size:21px;padding:4px 2px 6px;outline:none;color:#202124;width:100%;}
.cs-m-row{display:flex;gap:8px;align-items:center;font-size:13.5px;color:#3c4043;} .cs-colors{display:flex;gap:6px;flex-wrap:wrap;} .cs-sw{width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #dadce0;cursor:pointer;padding:0;} .cs-sw.on{box-shadow:0 0 0 2px #1a73e8;} .cs-sw:focus-visible{outline:2px solid #1a73e8;outline-offset:2px;} .cs-sw-def{background:#039be5;} .cs-m-cname{font-size:12.5px;color:#5f6368;} .cs-rule{background:#fff7ed;border-left:3px solid #f4511e;border-radius:6px;padding:6px 8px;} .cs-rule b{color:#9a3412;} .cs-req.cs-bad,.cs-ro.cs-bad{outline:2px dashed #fde68a;outline-offset:-3px;} .cs-m-row input[type=text],.cs-m-row input:not([type]){flex:1;border:0;border-bottom:1px solid #dadce0;padding:5px 2px;font:inherit;outline:none;} .cs-m-top{align-items:flex-start;} .cs-m-row textarea{flex:1;border:1px solid #dadce0;border-radius:8px;padding:6px 8px;font:inherit;resize:vertical;}
.cs-m-btns{display:flex;gap:8px;align-items:center;} .cs-m-btns span{flex:1;}
.cs-ai,.cs-fb{background:#f8fafc;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:12px 14px;margin:8px 0;flex-basis:100%;} .cs-ai p{margin:4px 0;font-size:14px;} .cs-fb{background:#fff;border-left:5px solid #039be5;} .cs-fb-hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;} .cs-fb-hd h3{margin:0;font-size:16px;color:var(--navy);}
.cs-ul{margin:4px 0 6px 20px;padding:0;font-size:13.5px;} .cs-ul.ok{color:#166534;} .cs-fbt{margin-top:6px;} .cs-fbi{border-top:1px solid var(--line,#e5e7eb);padding:6px 0;font-size:13.5px;} .cs-fbi-hd{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;} .cs-fbi p{margin:3px 0 0 20px;} .cs-tn{color:#14532d;}
.cs-chip2{font-size:11px;font-weight:800;border-radius:999px;padding:1px 9px;} .cs-chip2.met{background:#dcfce7;color:#166534;} .cs-chip2.partial{background:#fef3c7;color:#92400e;} .cs-chip2.missed{background:#fee2e2;color:#991b1b;}
.cs-final{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin:10px 0;} .cs-final-hd{font-size:14.5px;color:#14532d;} .cs-final p{margin:4px 0;font-size:14px;} .cs-fb-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;} .cs-rv-ta{width:100%;padding:6px 8px;font:inherit;font-weight:400;}
.cs-hl{box-shadow:0 0 0 3px #fbbc04,0 0 18px 4px rgba(251,188,4,.7)!important;z-index:6!important;}
.cs-liveov{position:fixed;inset:0;z-index:9600;background:var(--bg,#f8fafc);display:flex;flex-direction:column;} body.cs-live-open{overflow:hidden;}
.cs-live-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 18px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e5e7eb);font-size:16px;color:var(--navy);}
.cs-live-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,1fr);gap:16px;padding:14px 18px;overflow:auto;} .cs-live-cal{min-width:0;overflow:auto;}
.cs-live-side{display:flex;flex-direction:column;gap:10px;min-width:0;} .cs-live-steps{display:flex;gap:6px;flex-wrap:wrap;} .cs-live-step{border:1px solid var(--line,#d1d5db);background:#fff;border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;color:var(--navy);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .cs-live-step.ok{border-color:#16a34a;} .cs-live-step.bad{border-color:#dc2626;} .cs-live-step.on{background:var(--navy);color:#fff;border-color:var(--navy);}
.cs-live-panel{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:14px 18px;font-size:16px;line-height:1.5;flex:1;overflow:auto;} .cs-live-panel h2{margin:2px 0 8px;font-size:22px;color:var(--navy);} .cs-live-k{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--orange-deep);}
.cs-live-score{display:flex;gap:12px;align-items:baseline;} .cs-live-score b{font-size:40px;color:var(--navy);} .cs-live-rule{background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:8px 12px;margin:8px 0;} .cs-live-ev{margin:6px 0;font-size:15px;} .cs-live-ev.bad{color:#991b1b;font-weight:700;}
.cs-live-checks{list-style:none;margin:6px 0;padding:0;font-size:15px;} .cs-live-checks li{padding:2px 0;} .cs-live-checks .ok{color:#166534;} .cs-live-checks .bad{color:#991b1b;} .cs-live-ai{background:#eff6ff;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:16.5px;}
.cs-live-nav{display:flex;justify-content:space-between;gap:10px;} .cs-live-nav .btn{min-width:120px;font-size:15px;}
@media (max-width:980px){ .cs-live-body{grid-template-columns:1fr;} }
.cs-rep{border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:8px 12px;margin:8px 0;background:#fff;} .cs-rep-hd{font-weight:800;font-size:14.5px;color:var(--navy);} .cs-rep.correct{border-left:5px solid #16a34a;} .cs-rep.improve{border-left:5px solid #f59e0b;} .cs-rep.missed{border-left:5px solid #dc2626;} .cs-rep.insight{border-left:5px solid #039be5;} .cs-rep p{margin:3px 0;font-size:14px;}
.cs-feed{background:#f8fafc;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:10px 14px;margin:8px 0 12px;} .cs-feed-hd{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:6px;} .cs-feed-auto{font-size:12.5px;color:var(--ink-soft);cursor:pointer;} .cs-feed-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:5px 0;border-top:1px solid var(--line,#e5e7eb);font-size:13.5px;}
.cs-guide{border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:8px 14px;margin:0 0 12px;} .cs-guide summary{cursor:pointer;font-weight:700;color:var(--navy);} .cs-live-sum{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;} .cs-pulse{animation:cspulse 1.4s ease-in-out infinite;} @keyframes cspulse{50%{opacity:.45;}}
@media (max-width:820px){ .cs-main{grid-template-columns:1fr;} .cs-tray{position:static;max-height:none;} }
/* ---- Google Calendar look ---- */
.cs-wrap{font-family:"Google Sans",Roboto,"Segoe UI",Arial,sans-serif;}
/* the page on a solid panel: on the photo background its heading, line and mini calendar were hard to read */
.cs-wrap.cs-act{background:#fff;border-radius:16px;padding:16px 20px 20px;box-shadow:0 8px 28px rgba(15,23,42,.18);color:#1f2937;}
.cs-act .cs-blurb{color:#1f2937;} .cs-act .ca-cklink{background:#fff;color:#0b1633;border-color:#94a3b8;}
.cs-main{grid-template-columns:256px minmax(0,1fr);gap:16px;}
.cs-tray{border:0;border-radius:0;background:transparent;padding:0 4px 0 0;}
.gc-create{display:flex;align-items:center;gap:12px;border:0;background:#fff;border-radius:24px;padding:0 24px 0 16px;height:48px;font:500 14px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;cursor:pointer;box-shadow:0 1px 2px rgba(60,64,67,.3),0 1px 3px 1px rgba(60,64,67,.15);margin:0 0 14px;} .gc-create:hover{background:#f1f3f4;box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15);}
.gc-mini{margin:0 0 14px;padding:0 4px;font-size:11px;color:#3c4043;} .gc-mini-hd{font:500 14px "Google Sans",Roboto,Arial,sans-serif;margin:0 0 6px;}
.gc-mrow{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:1px;} .gc-mrow span,.gc-mrow i{font-style:normal;line-height:24px;height:24px;} .gc-mdow i{font-size:10px;color:#70757a;}
.gc-mrow span.out{color:#9aa0a6;} .gc-mrow span.wk{background:#e8f0fe;} .gc-mrow span.wk:nth-child(1){border-radius:12px 0 0 12px;} .gc-mrow span.today{background:#1a73e8;color:#fff;border-radius:50%;width:24px;justify-self:center;font-weight:700;}
.cs-tray h3{font:500 14px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;margin:10px 0 4px;}
.cs-task{border:1px solid #dadce0;border-left:4px solid #1a73e8;border-radius:8px;} .cs-task b{color:#202124;font-weight:500;} .cs-dur{background:#e8f0fe;color:#1967d2;} .cs-chip{background:#e6f4ea;color:#137333;}
.gc-shell{background:#fff;border:1px solid #dadce0;border-radius:8px;padding:0 0 4px;min-width:0;} .gc-shell .cs-legend{padding:0 14px;}
.gc-bar{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid #dadce0;flex-wrap:wrap;} .gc-logo{font-size:22px;} .gc-brand{font:400 20px "Google Sans",Roboto,Arial,sans-serif;color:#5f6368;margin-right:12px;} .gc-range{font:400 20px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;}
.gc-view{margin-left:auto;border:1px solid #dadce0;border-radius:4px;padding:6px 14px;font:500 14px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;} .gc-tz{font-size:12px;color:#70757a;}
.cs-gridwrap{border:0;border-radius:0;padding:0;background:#fff;} .cs-sub .cs-gridwrap{border:1px solid #dadce0;}
.cs-grid{grid-template-columns:56px repeat(5,minmax(112px,1fr));}
.cs-dayhd{height:62px;line-height:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-bottom:1px solid #dadce0;border-left:1px solid #dadce0;font-weight:500;color:#70757a;} .cs-dayhd span{font-size:11px;letter-spacing:.8px;font-weight:500;} .cs-dayhd b{font:400 26px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;width:46px;height:46px;display:flex;align-items:center;justify-content:center;border-radius:50%;}
.cs-dayhd b.gc-today{background:#1a73e8;color:#fff;} .gc-todayname{color:#1a73e8;}
.cs-dayhd.cs-et{border-left:0;font-size:10px;color:#70757a;justify-content:flex-end;padding-bottom:6px;}
.cs-times{border-right:0;} .cs-time{font-size:10px;color:#70757a;text-transform:uppercase;right:8px;}
.cs-col{border-left:1px solid #dadce0;cursor:pointer;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${SH * 4 - 1}px,#dadce0 ${SH * 4 - 1}px,#dadce0 ${SH * 4}px);}
.cs-col::before,.cs-col::after{background:rgba(60,64,67,.06);}
.cs-ev{border-radius:4px;left:2px;right:6px;padding:2px 8px;font-size:12px;font-weight:500;line-height:1.25;box-shadow:none;}
.cs-ev b{font-weight:500;} .cs-ev b em{font-style:normal;font-weight:400;opacity:.9;} .cs-ev span{font-weight:400;font-size:11px;}
.cs-fixed{background:#f1f3f4;color:#3c4043;border:1px solid #fff;border-left:4px solid #9aa0a6;cursor:default;} .cs-court{background:#3f51b5;color:#fff;border:1px solid #fff;border-left:4px solid #283593;}
.cs-lunch{background:repeating-linear-gradient(45deg,#f8f9fa,#f8f9fa 6px,#eceff1 6px,#eceff1 12px);color:#5f6368;border-left-color:#bdc1c6;}
.cs-req{background:#039be5;border:1px solid #fff;border-left:4px solid #0277bd;box-shadow:0 1px 2px rgba(60,64,67,.3);} .cs-req:hover{box-shadow:0 1px 3px rgba(60,64,67,.4),0 2px 6px 2px rgba(60,64,67,.15);}
.cs-req.cs-bad,.cs-ro.cs-bad{background:#d50000;border-left-color:#9b0000;} .cs-ro{background:#039be5;border:1px solid #fff;border-left:4px solid #0277bd;}
.cs-x{background:rgba(255,255,255,.25);color:#fff;border-radius:50%;} .cs-x:hover{background:rgba(255,255,255,.5);color:#fff;}
.cs-rs{height:8px;background:none;} .cs-req:hover .cs-rs::after{content:"";display:block;width:24px;height:2px;border-radius:2px;background:rgba(255,255,255,.8);margin:4px auto 0;}
.gc-now{position:absolute;left:-6px;right:0;height:2px;background:#ea4335;z-index:6;pointer-events:none;} .gc-now::before{content:"";position:absolute;left:0;top:-5px;width:12px;height:12px;border-radius:50%;background:#ea4335;}
.cs-prev.ok{background:rgba(26,115,232,.25);border:2px solid #1a73e8;color:#174ea6;}
/* the event editor, like Google Calendar's */
.cs-modal{background:rgba(32,33,36,.35);}
.cs-dlg{width:min(448px,100%);border-radius:8px;padding:0 24px 16px;gap:14px;box-shadow:0 24px 38px 3px rgba(0,0,0,.14),0 9px 46px 8px rgba(0,0,0,.12),0 11px 15px -7px rgba(0,0,0,.2);font-family:"Google Sans",Roboto,Arial,sans-serif;}
.cs-m-hd{display:flex;justify-content:space-between;align-items:center;margin:0 -24px;padding:8px 8px 0;background:#f1f3f4;border-radius:8px 8px 0 0;height:36px;box-sizing:border-box;} .cs-m-grip{width:20px;height:6px;margin-left:12px;background:radial-gradient(circle,#9aa0a6 1.5px,transparent 2px) 0 0/6px 6px;}
.cs-m-x{border:0;background:none;font-size:16px;color:#5f6368;cursor:pointer;width:32px;height:32px;border-radius:50%;} .cs-m-x:hover{background:#e0e3e6;}
.cs-m-title{margin:6px 0 0 36px;width:calc(100% - 36px);font:400 22px "Google Sans",Roboto,Arial,sans-serif;border-bottom:2px solid #1a73e8;}
.cs-m-tabs{margin-left:36px;} .cs-m-tabs span{display:inline-block;background:#e8f0fe;color:#1967d2;border-radius:4px;padding:5px 12px;font:500 13px "Google Sans",Roboto,Arial,sans-serif;}
.cs-m-row{gap:12px;} .cs-m-ic{width:24px;text-align:center;font-style:normal;color:#5f6368;} .cs-m-row select{border:0;background:#f1f3f4;border-radius:4px;padding:7px 8px;font:inherit;color:#3c4043;cursor:pointer;} .cs-m-row select:hover{background:#e8eaed;}
.cs-m-sub{margin:-8px 0 0 36px;font-size:12px;color:#70757a;}
.cs-meet{border:0;background:#1a73e8;color:#fff;border-radius:4px;padding:8px 16px;font:500 14px "Google Sans",Roboto,Arial,sans-serif;cursor:pointer;} .cs-meet:hover{background:#1765cc;} .cs-meet.on{background:#188038;} .cs-m-link{border:0;background:none;color:#1a73e8;font:500 13px "Google Sans",Roboto,Arial,sans-serif;cursor:pointer;}
.cs-m-row textarea{border:0;background:#f1f3f4;border-radius:4px;} .cs-m-row input:not([type=checkbox]){background:#f1f3f4;border:0;border-radius:4px;padding:8px;border-bottom:0;}
.cs-gbtn{border:0;background:none;color:#5f6368;border-radius:4px;padding:9px 18px;font:500 14px "Google Sans",Roboto,Arial,sans-serif;cursor:pointer;} .cs-gbtn:hover{background:#f1f3f4;} .cs-gblue{background:#1a73e8;color:#fff;border-radius:18px;padding:9px 24px;} .cs-gblue:hover{background:#1765cc;}
@media (max-width:820px){ .cs-main{grid-template-columns:1fr;} .gc-view,.gc-tz{margin-left:0;} }
/* ---- 🗓 the Attorney Calendar Management Activity ---- */
main.main-calsim.ca-wide{max-width:1560px;}
.cs-act .cs-top{align-items:center;margin-bottom:6px;flex-wrap:nowrap;} .cs-act .cs-top h1{margin:0;white-space:nowrap;font-size:24px;} .cs-act .cs-top .cs-tabs{margin:0;flex:1;min-width:0;} .cs-act .ca-back{margin-left:auto;flex:none;}
@media (max-width:1100px){ .cs-act .cs-top{flex-wrap:wrap;} }
.cs-act .cs-blurb{max-width:none;margin:2px 0 10px;}
.cs-act .cs-main{grid-template-columns:300px minmax(0,1fr);gap:14px;}
.ca-tray{max-height:calc(100vh - 16px);} .ca-tray h3{margin:12px 0 2px;}
.ca-box{background:#fff;border:1px solid #dadce0;border-radius:8px;padding:6px 10px;margin:0 0 8px;font-size:12.5px;color:#3c4043;} .ca-box summary{cursor:pointer;font:500 14px "Google Sans",Roboto,Arial,sans-serif;color:#202124;padding:2px 0;}
.ca-intro{margin:6px 0 4px;font-size:12.5px;color:#202124;} .ca-stand{margin:0 0 6px;font-size:12px;color:#137333;background:#e6f4ea;border-radius:6px;padding:4px 8px;}
.ca-ol{margin:4px 0 4px 18px;padding:0;} .ca-ol li{margin:0 0 4px;line-height:1.35;} .ca-ol ul{margin:2px 0 2px 14px;padding:0;list-style:circle;} .ca-ol ul li{margin:0;}
.ca-lg{display:grid;grid-template-columns:14px 1fr auto;gap:8px;align-items:center;padding:3px 0;border-top:1px solid #f1f3f4;} .ca-lg:first-of-type{border-top:0;} .ca-lg i{width:14px;height:14px;border-radius:50%;} .ca-lg em{font-style:normal;font-size:11.5px;color:#5f6368;}
.ca-pp{padding:3px 0;border-top:1px solid #f1f3f4;} .ca-pp b{display:block;font-weight:500;color:#202124;} .ca-pp span{font-size:11.5px;color:#5f6368;word-break:break-all;}
.ca-item{cursor:pointer;} .ca-item:hover{background:#f8fafd;} .ca-item b{display:flex;gap:6px;align-items:center;} .ca-n{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:50%;background:#e8f0fe;color:#1967d2;font-size:11px;font-weight:700;}
.ca-item p{margin:3px 0 0;} .ca-item p em{font-style:normal;font-weight:600;color:#3c4043;} .ca-sub{display:block;margin-top:2px;} .ca-sub span{display:block;line-height:1.35;} .ca-l1{font-weight:600;color:#3c4043;margin-top:3px;} .ca-l2{padding-left:10px;} .ca-l3{padding-left:20px;}
.ca-mini .gc-mrow button{border:0;background:none;font:inherit;color:inherit;line-height:24px;height:24px;padding:0;cursor:pointer;border-radius:12px;} .ca-mini .gc-mrow button:hover{background:#e8eaed;}
.ca-mini .gc-mrow .ca-in{font-weight:700;color:#1967d2;} .ca-mini .gc-mrow .wk{background:#e8f0fe;border-radius:0;} .ca-mini .gc-mrow .wk:first-child{border-radius:12px 0 0 12px;} .ca-mini .gc-mrow .wk:last-child{border-radius:0 12px 12px 0;}
.ca-bar{gap:10px;} .ca-tbtn{border:1px solid #dadce0;background:#fff;border-radius:4px;padding:6px 12px;font:500 14px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;cursor:pointer;} .ca-tbtn:hover{background:#f1f3f4;}
.ca-nav{border:0;background:none;width:32px;height:32px;border-radius:50%;font-size:22px;line-height:28px;color:#5f6368;cursor:pointer;} .ca-nav:hover:not([disabled]){background:#f1f3f4;} .ca-nav[disabled]{opacity:.3;cursor:default;}
.ca-cal{height:max(340px,calc(100vh - 300px));overflow:auto;position:relative;overscroll-behavior:contain;}
.ca-row{display:grid;grid-template-columns:56px repeat(7,minmax(92px,1fr));min-width:700px;}
.ca-sticky{position:sticky;top:0;z-index:8;background:#fff;box-shadow:0 1px 0 #dadce0;}
.ca-dh{height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-left:1px solid #dadce0;color:#70757a;} .ca-dh span{font-size:11px;letter-spacing:.8px;font-weight:500;} .ca-dh b{font:400 24px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;}
.ca-gmt{font-size:10px;color:#70757a;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 8px 4px 0;}
.ca-adrow{border-top:1px solid #dadce0;} .ca-adl{font-size:10px;color:#70757a;text-align:right;padding:4px 8px 0 0;} .ca-ad{border-left:1px solid #dadce0;min-height:24px;padding:2px 3px;display:flex;flex-direction:column;gap:2px;}
.ca-adev{background:#e8f0fe;color:#1967d2;border-radius:4px;padding:1px 6px;font-size:11.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;color:#fff;border-left:4px solid transparent;} .ca-adev.ca-nocol{color:#1967d2;border-left-color:#1a73e8;}
.ca-adev:focus-visible{outline:3px solid #fdba74;}
.ca-off{background:repeating-linear-gradient(135deg,#f8f9fa,#f8f9fa 6px,#f1f3f4 6px,#f1f3f4 12px);} .ca-dh.ca-off b,.ca-dh.ca-off span{color:#bdc1c6;} .ca-col.ca-off{cursor:not-allowed;}
.ca-body .cs-timecol{position:relative;}
.cs-col.ca-col{cursor:pointer;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${ASH * 4 - 1}px,#e8eaed ${ASH * 4 - 1}px,#e8eaed ${ASH * 4}px);}
.cs-col.ca-col.ca-off{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${ASH * 4 - 1}px,#e8eaed ${ASH * 4 - 1}px,#e8eaed ${ASH * 4}px),repeating-linear-gradient(135deg,#f8f9fa,#f8f9fa 6px,#f1f3f4 6px,#f1f3f4 12px);}
.cs-col.ca-col::before,.cs-col.ca-col::after{content:none;}
.ca-ev{padding:1px 6px;font-size:11.5px;line-height:1.2;} .ca-ev b{font-size:11.5px;} .ca-ev span{font-size:10.5px;}
.ca-ev.ca-short{padding-top:0;padding-bottom:0;} .ca-ev.ca-short b{line-height:20px;}
.ca-ev.ca-tiny{padding:0 6px;} .ca-ev.ca-tiny b{font-size:10px;line-height:10px;} .ca-ev.ca-tiny .ca-zt{font-size:8.5px;line-height:9px;}
.ca-ev .cs-x{opacity:0;} .ca-ev:hover .cs-x,.ca-ev.cs-sel .cs-x,.ca-ev:focus-within .cs-x{opacity:1;} .ca-ev.ca-tiny .cs-x{height:10px;line-height:10px;top:0;}
.ca-ev:not(.ca-short):not(.ca-tiny) span{white-space:normal;overflow:hidden;}
.ca-ev.ca-nocol,.cs-req.ca-nocol{background:#e8f0fe;color:#1967d2;border-left-color:#1a73e8;} .ca-ev.ca-nocol .cs-x{color:#1967d2;background:rgba(26,115,232,.12);}
.ca-zt{font-style:normal;font-size:9.5px;font-weight:700;background:rgba(255,255,255,.3);border-radius:3px;padding:0 3px;margin-left:3px;} .ca-nocol .ca-zt{background:#d2e3fc;}
.cs-req.ca-bad,.ca-adev.ca-bad{box-shadow:0 0 0 2px #d93025,0 0 0 4px rgba(217,48,37,.25)!important;outline:none;}
.ca-dlg{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;gap:10px;padding-bottom:14px;}
.ca-dlg > .cs-m-btns{position:sticky;bottom:-14px;z-index:3;background:inherit;background-color:#fff;margin:0 -2px -14px;padding:10px 2px 14px;border-top:1px solid #f1f3f4;} .ca-dlg .cs-m-title{margin-top:4px;}
.ca-when{flex-wrap:wrap;} .ca-times{display:inline-flex;gap:6px;align-items:center;} .ca-times[hidden]{display:none;} .cs-m-row[hidden]{display:none;}
.ca-sub2{margin-top:-4px;} .ca-chk{display:inline-flex;gap:6px;align-items:center;cursor:pointer;} .ca-dnr{font-size:12px;color:#70757a;}
.ca-pac{margin:-4px 0 0 36px;font-size:12.5px;color:#137333;background:#e6f4ea;border-radius:6px;padding:5px 10px;} .ca-pac.bad{color:#a50e0e;background:#fce8e6;}
#camTz{max-width:100%;}
.ca-gw{flex:1;display:flex;flex-direction:column;gap:6px;} .ca-gw input{width:100%;box-sizing:border-box;} .ca-chips{display:flex;flex-wrap:wrap;gap:6px;}
.ca-chip{display:inline-flex;align-items:center;gap:4px;background:#e8f0fe;color:#174ea6;border-radius:14px;padding:3px 4px 3px 10px;font-size:12.5px;} .ca-chip button{border:0;background:none;color:#5f6368;cursor:pointer;border-radius:50%;width:20px;height:20px;padding:0;} .ca-chip button:hover{background:#d2e3fc;}
.ca-rems{flex:1;display:flex;flex-direction:column;gap:6px;align-items:flex-start;} .ca-rem{display:flex;gap:6px;align-items:center;flex-wrap:wrap;} .ca-rem input[type=number]{width:64px;flex:none!important;} .ca-rem .cs-m-x{width:28px;height:28px;font-size:13px;} .ca-bef{font-size:12.5px;color:#5f6368;}
.cs-m-link[hidden]{display:none;}
.ca-sw-def{background:#e8f0fe;box-shadow:0 0 0 1px #1a73e8;}
.ca-agenda{font-size:13px;color:#3c4043;max-height:none;} .ca-ar{display:grid;grid-template-columns:78px 128px 18px minmax(0,1fr);gap:8px;align-items:start;padding:7px 12px;border-top:1px solid #f1f3f4;} .ca-ar.ca-first{border-top:1px solid #dadce0;}
.ca-ad1 b{font:400 22px "Google Sans",Roboto,Arial,sans-serif;color:#3c4043;margin-right:6px;} .ca-ad1 span{font-size:10.5px;color:#70757a;letter-spacing:.5px;}
.ca-at{white-space:nowrap;color:#3c4043;padding-top:2px;} .ca-adot{display:block;width:12px;height:12px;border-radius:50%;margin-top:4px;} .ca-adot.ca-nocol{background:#e8f0fe;box-shadow:0 0 0 1px #1a73e8;}
.ca-ax b{font-weight:500;color:#202124;} .ca-cn{font-size:11px;color:#70757a;} .ca-ameta,.ca-az,.ca-adesc{font-size:12px;color:#5f6368;margin-top:2px;overflow-wrap:anywhere;} .ca-az{color:#1967d2;} .ca-aw{font-size:12px;color:#b3261e;margin-top:2px;}
.ca-ar.ca-rbad{background:#fce8e6;} .ca-ar.ca-hl{background:#fef7e0;box-shadow:inset 4px 0 0 #fbbc04;}
.ca-ckline{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:13px;color:var(--ink-soft);margin:6px 0 4px;} .ca-ckline b{color:var(--ink);}
.ca-fields{list-style:none;margin:6px 0 0 !important;padding:0 !important;display:flex;flex-wrap:wrap;gap:4px 6px;color:inherit !important;}
.ca-fields li{font-size:12.5px;border-radius:999px;padding:2px 9px;} .ca-fields li.ok{background:#ecfdf3;color:#166534;}
.ca-fields li.no{flex:1 1 100%;border-radius:8px;background:#fef2f2;color:#7f1d1d;padding:4px 9px;} .ca-fields li.no span{display:block;font-size:12.5px;color:#7f1d1d;opacity:.9;}
.ca-as{font-style:normal;font-size:12.5px;color:var(--ink-soft);font-weight:400;} .ca-cklink{white-space:nowrap;}
.cs-tinfo{font-size:12.5px;color:#1e40af;background:#eff6ff;border-radius:6px;padding:3px 8px;margin-top:4px;} .cs-tinfo-ul{margin:4px 0 0 22px;padding:0;font-size:13px;color:#1e3a8a;}
.cs-live-checks li.info{color:#1e40af;font-size:14px;}
.cs-live-cal .ca-agenda{background:#fff;}
@media (max-width:1100px){ .cs-act .cs-main{grid-template-columns:1fr;} .ca-tray{position:static;max-height:none;} }
@media (max-width:640px){ .ca-ar{grid-template-columns:60px 1fr;} .ca-ar > div:nth-child(3){display:none;} .ca-ar .ca-ax{grid-column:1 / -1;} }
`; document.head.appendChild(st); })();
})();
