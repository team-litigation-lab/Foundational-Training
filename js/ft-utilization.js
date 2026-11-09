/* ============================================================
   📈 PRACTICE LAB UTILIZATION & EAGERNESS TO LEARN — Admin → 🛠 Practice Lab → 🟢 Practice Sessions (the card under 📡 Live now)
   ------------------------------------------------------------
   How much each trainee of the batch uses the Practice Lab and how eager they are to learn, worked out from what the
   platform already keeps — so it goes back to the day they registered (nothing to start or fill in):
     progress:<id>   the work log (the AI-graded practice tools, roleplays, random tasks), each lesson deck finished and
                     every Knowledge Check attempt
     skills:<id>     Typing & Spelling tests          simresults:<id>  the Portal simulators
     sessions:<id>   the Practice Sessions            callsim: calsim: drills: listening: calcheck: calrules: calweek:
                                                      the Practice Lab tools' own records (each timestamped attempt)
   Per trainee: 📈 Utilization (the tools used of all of them, and the training days they practiced on), 🔥 Eagerness
   (showing up every day, practicing more than the batch, going back to practice again, getting better), the active
   days, the attempts, a day-by-day strip back to the first day of the batch, and ▸ the full history on a click.
   Read-only: a trainer's own reviews (labreview:, kcreview:, …) are not counted as the trainee's activity.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const U = {key: "", data: null, loading: false, sel: ""};
window.addEventListener("ft-roster-changed", () => { U.key = ""; U.data = null; });

const TOOLS = [
  {id: "lab", label: "🤖 AI practice tools"}, {id: "roleplay", label: "🎭 Roleplays"}, {id: "task", label: "🎲 Random tasks"},
  {id: "skills", label: "🧪 Typing & Spelling"}, {id: "portalsims", label: "🧰 Portal simulators"}, {id: "sessions", label: "🟢 Practice Sessions"},
  {id: "callsim:", label: "🎯 Call Simulator"}, {id: "calsim:", label: "📅 Calendaring Simulator"}, {id: "drills:", label: "🏷 Naming & Reporting Drills"},
  {id: "listening:", label: "🎧 Call Listening"}, {id: "calcheck:", label: "📅 Calendar activity check"}, {id: "calrules:", label: "📅 Booking rules"},
  {id: "calweek:", label: "📅 Calendaring Activity"}];
const TOOL_KEYS = TOOLS.filter(x => /:$/.test(x.id)).map(x => x.id);
const OWN = ["trainee:", "progress:", "skills:", "simresults:", "sessions:"].concat(TOOL_KEYS);
// a trainer's part of a tool record: not the trainee's activity
const SKIP = new Set(["reviews", "review", "trainer", "trainerReview", "released", "comment", "feedback", "grade", "grades", "assess", "best", "latest", "last", "summary", "drafts", "events", "anchors", "anchor"]);
const TS = ["submittedAt", "completedAt", "startedAt", "at", "date", "savedAt"];

const t = v => { if(!v) return null; const d = new Date(v); return isNaN(d) ? null : d; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const md = k => { const d = new Date(k + "T12:00:00"); return d.toLocaleDateString(undefined, {month: "short", day: "numeric"}); };
const wk = d => d.getDay() !== 0 && d.getDay() !== 6;
const num = v => typeof v === "number" && isFinite(v) ? v : null;
const scoreOf = o => { const max = num(o.max) || num(o.total); if(num(o.pct) != null) return o.pct;
  if(num(o.score) != null) return max ? Math.round(100 * o.score / max) : o.score <= 100 ? o.score : null;
  if(o.auto && num(o.auto.pct) != null) return o.auto.pct; return null; };

/* a Practice Lab tool's record: every timestamped entry in it, each counted once (an entry's own parts are not walked) */
function crawl(v, out, path, depth){
  if(!v || typeof v !== "object" || depth > 6) return;
  if(Array.isArray(v)){ v.forEach((x, i) => crawl(x, out, path, depth + 1)); return; }
  // (a bare calendar date, "2026-07-06", is a scheduled day, not when the trainee did something: only a time counts)
  const f = TS.find(k => typeof v[k] === "string" && t(v[k]) && (k !== "date" || /T\d/.test(v[k])));
  if(f && path.length){ out.push({at: t(v[f]), item: String(v.scn || v.scenario || v.set || v.lesson || v.title || v.name || v.label || path[path.length - 1] || ""), score: scoreOf(v)}); return; }
  Object.keys(v).forEach(k => { if(!SKIP.has(k)) crawl(v[k], out, path.concat(k), depth + 1); });
}

/* everything a trainee did, as {at, tool, kind: "practice"|"learn", what, item, score} */
function eventsOf(rec){
  const out = [], push = (at, tool, kind, what, item, score) => { const d = t(at); if(d) out.push({at: d, tool, kind, what, item: item || what, score: num(score)}); };
  const p = rec["progress:"] || {}, data = p.data || {}, dp = data["day-progress"] || {};
  (Array.isArray(data["work-log"]) ? data["work-log"] : []).forEach(w => {
    if(!w || w.kind === "quiz" || /\(missed\)/.test(w.label || "")) return;   // (a missed random task is not practice)
    const tool = w.kind === "lab" || w.kind === "roleplay" || w.kind === "task" ? w.kind : "lab";
    push(w.at, tool, "practice", w.label || "Practice", (w.toolId || "") + "|" + (w.label || ""), w.score);
  });
  const DY = typeof DAYS !== "undefined" && Array.isArray(DAYS) ? DAYS : [];
  const nm = id => { const d = DY.find(x => String(x.id) === String(id)); return d ? d.title : "Lesson " + id; };
  Object.entries(dp).forEach(([id, x]) => { if(!x) return;
    if(x.studiedAt) push(x.studiedAt, "deck", "learn", `Finished the lesson deck: ${nm(id)}`, "deck" + id);
    const h = Array.isArray(x.history) ? x.history : [];
    h.forEach(y => push(y.date || y.at, "kc", "learn", `Knowledge Check: ${nm(id)}`, "kc" + id, y.score));
    if(!h.length && x.date && num(x.score) != null) push(x.date, "kc", "learn", `Knowledge Check: ${nm(id)}`, "kc" + id, x.score); });
  const sk = rec["skills:"] || {};
  (sk.typing || []).forEach(x => push(x.at, "skills", "practice", `Typing test · ${x.net || x.gross || 0} WPM`, "typing", null));
  (sk.spelling || []).forEach(x => push(x.at, "skills", "practice", `Spelling test · ${x.score || 0}/${x.total || 0}`, "spelling", x.total ? Math.round(100 * (x.score || 0) / x.total) : null));
  ((rec["simresults:"] || {}).results || []).forEach(x => push(x.at, "portalsims", "practice", `Portal simulator: ${x.simulator || ""}`, x.simulator || "", x.score));
  Object.entries(((rec["sessions:"] || {}).runs) || {}).forEach(([k, r]) => { if(r && r.startedAt)
    push(r.submittedAt || r.startedAt, "sessions", "practice", `Practice Session ${r.submittedAt ? "submitted" : "started"}: ${k.split("|")[0]}`, k, r.auto && r.auto.pct); });
  TOOL_KEYS.forEach(k => { const got = [], seen = new Set(), lab = TOOLS.find(x => x.id === k).label.replace(/^\S+\s/, "");
    crawl(rec[k], got, [], 0);
    // (a record that is one attempt itself, 📅 Calendaring Activity's {events, savedAt, submittedAt, pct}: its own time)
    const top = rec[k] && (rec[k].submittedAt || rec[k].completedAt || rec[k].savedAt);
    if(!got.length && t(top)) got.push({at: t(top), item: "", score: num(rec[k].pct)});
    got.forEach(g => { const s = +g.at + "|" + g.item; if(seen.has(s)) return; seen.add(s); out.push({at: g.at, tool: k, kind: "practice", what: `${lab}${g.item && !/^\d+$/.test(g.item) ? ": " + g.item : ""}`, item: k + g.item, score: num(g.score)}); }); });
  return out.filter(x => +x.at <= Date.now() + 60000).sort((a, b) => b.at - a.at);
}

async function load(rows, key){
  U.loading = true;
  try{
    const want = []; rows.forEach(r => OWN.forEach(k => want.push(k + r.id)));
    const vals = []; for(let i = 0; i < want.length; i += 99) vals.push(...await sharedGetMany(want.slice(i, i + 99)));
    const per = {};
    rows.forEach((r, i) => { const rec = {}; OWN.forEach((k, j) => { rec[k] = vals[i * OWN.length + j] || null; });
      if(!rec["sessions:"] && r.s) rec["sessions:"] = r.s;
      per[r.id] = {rec, ev: eventsOf(rec)}; });
    if(U.key === key) U.data = per;
  }catch(err){ if(U.key === key) U.data = {}; }
  U.loading = false;
  if(state.view === "admin" && state.adminTab === "sessions") render();
}

/* the measures, one trainee at a time: the same on this card and on the trainee's 🏅 Scorecard (js/ft-program.js 🛠 Practice Lab)
   rec: their records (OWN), ev: eventsOf(rec), regAt: the day they registered (else their first activity) */
// 🔥 practice volume is held to a steady 3 attempts a training day (not the batch's busiest trainee), so a trainee's score
// is their own: the same on this card, their Scorecard and the Weekly Ranking, whoever else is in the batch
const PER_DAY = 3;
function measureOne(r, rec, ev, regAt){
  const today = ymd(new Date()), tr = rec["trainee:"] || {};
  {
    const reg = t(regAt) || t(tr.registeredAt) || (ev.length ? ev[ev.length - 1].at : null);
    // the training days since they registered (weekdays, the 16 of the training at most)
    const days = []; if(reg){ const c = new Date(reg); c.setHours(12, 0, 0, 0); while(ymd(c) <= today && days.length < 16){ if(wk(c)) days.push(ymd(c)); c.setDate(c.getDate() + 1); } }
    const pr = ev.filter(x => x.kind === "practice"), byDay = {};
    ev.forEach(x => { const k = ymd(x.at); (byDay[k] = byDay[k] || {p: 0, l: 0})[x.kind === "practice" ? "p" : "l"]++; });
    const active = days.filter(k => byDay[k]).length, extra = Object.keys(byDay).filter(k => !wk(new Date(k + "T12:00:00"))).length;
    const consistency = days.length ? active / days.length : 0;
    const used = new Set(pr.map(x => x.tool)).size, items = new Set(pr.map(x => x.item)).size, again = pr.length - items;
    // getting better: on each item tried more than once with a score, the latest score less the first
    const g = {}; pr.slice().reverse().forEach(x => { if(x.score != null) (g[x.item] = g[x.item] || []).push(x.score); });
    const deltas = Object.values(g).filter(a => a.length > 1).map(a => a[a.length - 1] - a[0]);
    const imp = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;
    const kcTries = ev.filter(x => x.tool === "kc").length, decks = ev.filter(x => x.tool === "deck").length;
    const last = [ev[0] && ev[0].at, t(tr.lastActive)].filter(Boolean).sort((a, b) => b - a)[0] || null;
    const m = {r, ev, pr, days, byDay, active, extra, consistency, used, items, again, imp, kcTries, decks, last, reg};
    const top = Math.max(1, PER_DAY * days.length);
    m.util = Math.round(100 * (0.5 * m.used / TOOLS.length + 0.5 * m.consistency));
    const vol = Math.min(1, m.pr.length / top), pers = m.items ? Math.min(1, m.again / m.items) : 0, better = m.imp == null ? (m.again ? 0.5 : 0) : Math.max(0, Math.min(1, (m.imp + 20) / 40));
    m.eager = m.ev.length ? Math.round(100 * (0.35 * m.consistency + 0.25 * vol + 0.2 * pers + 0.2 * better) + Math.min(5, m.extra * 2.5)) : 0;
    m.eager = Math.min(100, m.eager);
    m.why = [`showed up on ${m.active} of ${m.days.length} training day${m.days.length === 1 ? "" : "s"} (${Math.round(100 * m.consistency)}%)`,
      `${m.pr.length} practice attempt${m.pr.length === 1 ? "" : "s"} (${PER_DAY} a training day is full marks: ${top})`,
      `went back to practice again ${m.again} time${m.again === 1 ? "" : "s"}`,
      m.imp == null ? "no repeated scored practice yet to see improvement" : `scores ${m.imp >= 0 ? "up" : "down"} ${Math.abs(m.imp)} points from first try to latest`]
      .concat(m.extra ? [`practiced on ${m.extra} weekend day${m.extra === 1 ? "" : "s"} too`] : []);
    return m;
  }
}
/* the measures, for the batch */
function measure(rows){
  return rows.map(r => { const d = (U.data || {})[r.id] || {rec: {}, ev: []}; return measureOne(r, d.rec, d.ev); });
}
// 🏅 the trainee's Scorecard (js/ft-program.js 🛠 Practice Lab): the Utilization, the Eagerness, and the scores of the AI
// practice tools, roleplays and random tasks (the work log: each one's latest score, what the other grading systems don't
// already count), from the records the Scorecard reads (ctx.rec) and the day they registered (ctx.since)
function scoreItems(ctx){
  const rec = ctx.rec || {}; if(!Object.keys(rec).some(k => rec[k])) return [];
  // (ctx.since is the bare date they registered: read at midday, so it is that day wherever the trainer is)
  const since = /^\d{4}-\d{2}-\d{2}$/.test(String(ctx.since || "")) ? ctx.since + "T12:00:00" : ctx.since || null;
  const ev = eventsOf(rec), m = measureOne({id: ctx.id, name: ""}, rec, ev, since);
  if(!m.reg) return [];
  // (no practice at all yet: shown, not graded, as every grading system shows work not done yet, so it doesn't pull the overall to 0)
  if(!m.pr.length) return [{name: "📈 Practice Lab Utilization", pct: null, note: "No practice yet"}, {name: "🔥 Eagerness to Learn", pct: null, note: "No practice yet"}];
  const last = ev[0] ? ev[0].at.toISOString() : "";
  const out = [
    {name: "📈 Practice Lab Utilization", pct: m.util, note: `${m.used} of ${TOOLS.length} tools used · active ${m.active} of ${m.days.length} training day${m.days.length === 1 ? "" : "s"}`, at: last},
    {name: "🔥 Eagerness to Learn", pct: m.eager, note: `${level(m.eager)[0]} · ${m.pr.length} practice attempt${m.pr.length === 1 ? "" : "s"}, ${m.again} again${m.imp == null ? "" : ` · scores ${m.imp >= 0 ? "+" : ""}${m.imp} from first try`}`, at: last}];
  const lab = {};   // the work log's scored practice: each item's latest score (ev is newest first)
  ev.filter(x => (x.tool === "lab" || x.tool === "roleplay" || x.tool === "task") && x.score != null).forEach(x => {
    const k = x.item; if(!lab[k]) lab[k] = {name: `${x.tool === "roleplay" ? "🎭" : x.tool === "task" ? "🎲" : "🤖"} ${x.what}`, pct: Math.max(0, Math.min(100, Math.round(x.score))), n: 0, at: x.at.toISOString()};
    lab[k].n++; });
  Object.values(lab).forEach(x => out.push({name: x.name, pct: x.pct, note: `Latest of ${x.n} attempt${x.n === 1 ? "" : "s"}`, at: x.at}));
  return out;
}
const level = v => v >= 75 ? ["🔥 Very eager", "ut-hi"] : v >= 50 ? ["👍 Engaged", "ut-mid"] : v >= 25 ? ["⚠ Needs a nudge", "ut-lo"] : ["🛑 Inactive", "ut-no"];
const uLevel = v => v >= 70 ? "ut-hi" : v >= 40 ? "ut-mid" : v > 0 ? "ut-lo" : "ut-no";
const when = d => d ? d.toLocaleString(undefined, {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) : "";
const ago = d => { if(!d) return ""; const m = Math.round((Date.now() - d) / 60000); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

function card(rows, batches, batch){
  const key = (batch || "*") + "|" + rows.map(r => r.id).join(",");
  if(U.key !== key){ U.key = key; U.data = null; load(rows, key); }
  const head = `<div class="ff-bar"><div><h3>📈 Practice Lab Utilization & Eagerness to Learn</h3><p class="fss-muted">How much each trainee uses the Practice Lab and how eager they are to learn, from the day they registered. It is worked out from everything the platform already keeps (every tool, test, simulator, Practice Session, lesson deck and Knowledge Check), so past activity counts too. Click a trainee for their full history.</p></div>
    <span><select onchange="FTSessionsAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></span></div>`;
  if(!U.data) return `<div class="card fss-admin ut-card">${head}<p class="fss-muted">Going through each trainee's history…</p></div>`;
  if(!rows.length) return `<div class="card fss-admin ut-card">${head}<p class="fss-muted">No approved trainees${batch ? " in this batch" : ""}.</p></div>`;
  const ms = measure(rows).sort((a, b) => b.eager - a.eager || b.util - a.util || a.r.name.localeCompare(b.r.name));
  // the strip: every training day of the batch, from its first registration to today
  const first = ms.map(m => m.reg).filter(Boolean).sort((a, b) => a - b)[0], strip = [];
  if(first){ const c = new Date(first); c.setHours(12, 0, 0, 0); const today = ymd(new Date()); while(ymd(c) <= today){ if(wk(c)) strip.push(ymd(c)); c.setDate(c.getDate() + 1); } }
  const cols = strip.slice(-20);
  const avg = k => Math.round(ms.reduce((a, m) => a + m[k], 0) / ms.length);
  const nudge = ms.filter(m => m.eager < 50);
  const sum = `<div class="ut-sum"><div><b>${avg("util")}%</b><span>batch utilization</span></div><div><b>${avg("eager")}</b><span>batch eagerness (of 100)</span></div>
    <div><b>${ms.reduce((a, m) => a + m.pr.length, 0)}</b><span>practice attempts in all</span></div><div><b>${ms.filter(m => m.last && Date.now() - m.last < 86400000).length} / ${ms.length}</b><span>active in the last 24 h</span></div>
    ${nudge.length ? `<p class="ut-nudge">⚠ Check in with: ${nudge.map(m => `<b>${e(m.r.name)}</b>${m.last ? ` (last active ${e(ago(m.last))})` : " (no activity yet)"}`).join(", ")}</p>` : ""}</div>`;
  const row = m => { const [lv, cls] = level(m.eager), open = U.sel === m.r.id;
    return `<tr class="ut-row${open ? " ut-on" : ""}" onclick="FTUtil.open('${e(m.r.id)}')" title="${e("Eagerness: " + m.why.join("; "))}"><td class="ut-name">${open ? "▾" : "▸"} <b>${e(m.r.name)}</b></td>
      <td><span class="ut-bar ${uLevel(m.util)}"><i style="width:${m.util}%"></i></span><b>${m.util}%</b></td>
      <td><span class="ut-pill ${cls}">${lv} · ${m.eager}</span></td>
      <td class="ut-n">${m.active} / ${m.days.length}</td><td class="ut-n">${m.used} / ${TOOLS.length}</td><td class="ut-n"><b>${m.pr.length}</b></td><td class="ut-n">${m.again}</td>
      <td class="ut-n ${m.imp == null ? "" : m.imp >= 0 ? "ut-up" : "ut-down"}">${m.imp == null ? "—" : (m.imp >= 0 ? "▲ +" : "▼ ") + m.imp}</td>
      <td class="ut-n">${m.decks} · ${m.kcTries}</td>
      <td class="${m.last && Date.now() - m.last < 2 * 86400000 ? "" : "ut-stale"}">${m.last ? `${e(when(m.last))}<br><small>${e(ago(m.last))}</small>` : "Not yet"}</td>
      ${cols.map(k => { const x = m.byDay[k], n = x ? x.p + x.l : 0, before = m.reg && k < ymd(m.reg);
        return `<td class="ut-day ${before ? "ut-pre" : n === 0 ? "ut-d0" : n < 3 ? "ut-d1" : n < 8 ? "ut-d2" : "ut-d3"}" title="${e(md(k))}: ${before ? "before they registered" : x ? `${x.p} practice, ${x.l} lesson / Knowledge Check` : "nothing"}">${n || ""}</td>`; }).join("")}</tr>
`; };
  return `<div class="card fss-admin ut-card">${head}${sum}
    <div class="ff-scroll"><table class="ut-tbl"><thead><tr><th>Trainee</th><th title="The Practice Lab tools used (of ${TOOLS.length}) and the training days they practiced on, half each">📈 Utilization</th><th title="Showing up every day, practicing more, going back to practice again and getting better">🔥 Eagerness</th>
      <th title="Training days with any activity, of the training days since they registered">Active days</th><th title="Practice Lab tools used">Tools used</th><th>Practice attempts</th><th title="Attempts on something they had already practiced">Practiced again</th><th title="Latest score less the first, on what they practiced more than once">Getting better</th><th title="Lesson decks finished · Knowledge Check attempts">Decks · KC tries</th><th>Last active</th>
      ${cols.map(k => `<th class="ut-dayh">${e(md(k))}</th>`).join("")}</tr></thead><tbody>${ms.map(row).join("")}</tbody></table></div>
    ${(() => { const m = ms.find(x => x.r.id === U.sel); return m ? `<div class="ut-hist"><div class="ut-hist-h"><b>🕘 ${e(m.r.name)}: everything since they registered${m.reg ? " (" + e(m.reg.toLocaleDateString()) + ")" : ""}</b><button class="btn btn-ghost btn-sm" onclick="FTUtil.open('${e(m.r.id)}')">Close</button></div>${hist(m)}</div>` : ""; })()}
    <details class="ut-how"><summary>How it's measured</summary><ul>
      <li><b>📈 Utilization</b>: half the Practice Lab tools used (of ${TOOLS.length}: ${TOOLS.map(x => x.label).join(", ")}), half the training days since they registered with any activity.</li>
      <li><b>🔥 Eagerness</b> (of 100): showing up every training day 35%, practice attempts against a steady 3 a training day 25%, going back to practice something again 20%, scores getting better from first try to latest 20%; a few points more for weekend practice. 75+ 🔥 Very eager · 50+ 👍 Engaged · 25+ ⚠ Needs a nudge · below 🛑 Inactive.</li>
      <li><b>The day strip</b>: one square per training day (weekdays, the last 20), the number of things done that day; grey before they registered.</li>
      <li>Nothing is entered here: it is all read from the trainee's own records, back to the day they registered. A trainer's reviews are not counted as the trainee's activity.</li></ul></details></div>`;
}
function hist(m){
  if(!m.ev.length) return `<p class="fss-muted">No activity recorded since they registered${m.reg ? " (" + e(m.reg.toLocaleDateString()) + ")" : ""}.</p>`;
  const by = {}; m.ev.forEach(x => (by[ymd(x.at)] = by[ymd(x.at)] || []).push(x));
  return `<div class="ut-why"><b>🔥 Eagerness ${m.eager}:</b> ${e(m.why.join("; "))}.</div><div class="ut-days">${Object.keys(by).sort().reverse().map(k => `<details${k === Object.keys(by).sort().reverse()[0] ? " open" : ""}><summary><b>${e(new Date(k + "T12:00:00").toLocaleDateString(undefined, {weekday: "short", month: "short", day: "numeric"}))}</b> · ${by[k].length} thing${by[k].length === 1 ? "" : "s"}</summary>
    <ul>${by[k].map(x => `<li><span>${e(x.at.toLocaleTimeString(undefined, {hour: "numeric", minute: "2-digit"}))}</span> ${x.kind === "learn" ? "📚" : "🛠"} ${e(x.what)}${x.score != null ? ` <b>${Math.round(x.score)}%</b>` : ""}</li>`).join("")}</ul></details>`).join("")}</div>`;
}
window.FTUtil = {card, eventsOf, scoreItems, open(id){ U.sel = U.sel === id ? "" : id; render(); }, refresh(){ U.key = ""; U.data = null; render(); }};

const st = document.createElement("style");
st.textContent = `
.ut-card .ff-scroll{overflow-x:auto;}
.ut-sum{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 14px;}
.ut-sum > div{background:#F6F7FB;border:1px solid #DDE1EC;border-radius:12px;padding:10px 16px;min-width:150px;}
.ut-sum > div > b{display:block;font-size:22px;color:var(--navy);} .ut-sum > div > span{font-size:12.5px;color:var(--ink-soft);}
.ut-nudge{flex-basis:100%;margin:0;font-size:13.5px;background:#FFF7E8;border:1px solid #F3D9A4;border-radius:10px;padding:8px 12px;}
.ut-tbl{border-collapse:collapse;font-size:13.5px;min-width:100%;}
.ut-tbl th{background:#F1F3F8;color:var(--navy);font-weight:700;text-align:left;padding:8px;border:1px solid #DDE1EC;white-space:nowrap;position:sticky;top:0;}
.ut-tbl td{padding:7px 8px;border:1px solid #E6E9F1;vertical-align:middle;white-space:nowrap;}
.ut-row{cursor:pointer;} .ut-row:hover td{background:#FAFBFE;}
.ut-name{min-width:170px;} .ut-n{text-align:center;} .ut-stale{color:#B4462F;} .ut-tbl small{color:var(--ink-soft);}
.ut-bar{display:inline-block;width:70px;height:8px;border-radius:6px;background:#E8EBF2;margin-right:8px;vertical-align:middle;overflow:hidden;}
.ut-bar i{display:block;height:100%;background:#2E7D5B;} .ut-bar.ut-mid i{background:#C98A12;} .ut-bar.ut-lo i, .ut-bar.ut-no i{background:#C0462F;}
.ut-pill{display:inline-block;border-radius:999px;padding:3px 10px;font-weight:700;font-size:12.5px;}
.ut-pill.ut-hi{background:#E3F4EA;color:#1F6B47;} .ut-pill.ut-mid{background:#EAF0FB;color:#24467F;} .ut-pill.ut-lo{background:#FFF1DC;color:#8A5A00;} .ut-pill.ut-no{background:#FBE6E1;color:#9B2F1C;}
.ut-up{color:#1F6B47;font-weight:700;} .ut-down{color:#9B2F1C;font-weight:700;}
.ut-dayh{font-size:11px;padding:6px 4px !important;text-align:center !important;}
.ut-day{text-align:center;font-size:12px;font-weight:700;min-width:34px;padding:6px 2px !important;}
.ut-d0{background:#FBEDEA;} .ut-d1{background:#D7EEDF;} .ut-d2{background:#9ED3B2;} .ut-d3{background:#4FA97A;color:#fff;} .ut-pre{background:#F1F2F5;}
.ut-row.ut-on td{background:#EEF3FC;}
.ut-hist{margin-top:12px;border:1px solid #DDE1EC;border-radius:12px;background:#FBFCFE;padding:12px 14px;}
.ut-hist-h{display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--navy);margin-bottom:4px;}
.ut-why{font-size:13.5px;margin:4px 0 10px;}
.ut-days details{border:1px solid #E6E9F1;border-radius:10px;padding:6px 12px;margin:6px 0;background:#fff;}
.ut-days summary{cursor:pointer;font-size:13.5px;} .ut-days ul{margin:6px 0 2px;padding-left:4px;list-style:none;}
.ut-days li{font-size:13px;padding:3px 0;border-bottom:1px dashed #EEF0F5;} .ut-days li span{display:inline-block;min-width:70px;color:var(--ink-soft);}
.ut-how{margin-top:12px;font-size:13px;} .ut-how summary{cursor:pointer;font-weight:700;color:var(--navy);} .ut-how li{margin:4px 0;}`;
document.head.appendChild(st);
})();
