/* ============================================================
   📑 THE WEEKLY RANKING, SUMMARIZED FOR MANAGEMENT
   ------------------------------------------------------------
   📋 Batch Sheet → 📊 Weekly Ranking opens on this: each trainee's week as a scorecard of eight competencies, each scored out of
   5 with a summarized comment on their progress, and the trainer's feedback summarized — the report sent to management every
   week, laid out to be read as it is (⬇ Word, 🖨 Print), the trainees ranked by their overall.
     🔎 Attention to Detail    the rubric criteria on accuracy (Attention to Details, Authentication, Comprehension…), the
                               Knowledge Checks' and assessments' accuracy, the tracker's notes check
     ✅ Compliance             the end-of-shift check (📤 Daily outputs: the tracker, the Monitoring Sheet, the tests, the
                               outputs, the EOD)
     ⏱ Timely Submission       on time: the EOD before the end of the shift, the Monitoring Sheet updates, the day's outputs
     💬 Communication          the mock calls' communication criteria (Customer Service, Listening, Tone, Closing…), the EOD
     🔤 English Proficiency    the writing and speech criteria (Grammar, Spelling & Format, Clarity of Speech), the spelling
                               tests, the written answers' feedback
     📞 Call Handling          the mock calls' scoresheets, with the trainer's comments on the calls and the demos
     🛠 Tools Utilization       the demos' scoresheets and comments, the Practice Sessions and the tools' grades
     🧑‍🏫 Feedback from the trainer  the day-by-day feedback and every feedback the trainer sent, summarized
   Each score starts from the week's evidence (base), the AI writes the comments in the facilitator's DNA and may adjust a
   score the evidence clearly shows otherwise; without the AI, the base scores and comments built from the evidence stand.
   The trainer can ✎ edit any score or comment. Kept in rksum:<batch>:w<N> (a trainer's).
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const clip = (v, n) => { const t = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const avg = xs => { const v = xs.filter(x => typeof x === "number" && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
const COMP = [
  ["attention", "🔎", "Attention to Detail"], ["compliance", "✅", "Compliance"], ["instructions", "📏", "Following Instructions"], ["timely", "⏱", "Timely Submission (Time Management)"],
  ["communication", "💬", "Communication Proficiency"], ["english", "🔤", "English Proficiency"], ["call", "📞", "Call Handling"], ["tools", "🛠", "Tools Utilization"]];
const S = {key: "", data: null, loading: false, busy: false, edit: false, err: ""};
const keyOf = (b, w) => `rksum:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const ctx = () => (window.FTRanking && FTRanking.ctx) ? FTRanking.ctx() : null;
const redraw = () => { const c = ctx(); if(c && c.rerender) c.rerender(); else if(typeof render === "function") render(); };

/* ---------- the week's evidence for one trainee ---------- */
async function progOf(p, range){
  const out = {calls: null, written: null, callsN: 0, writtenN: 0};
  try{
    if(!window.lshProgram || typeof lshProgram.compute !== "function") return out;
    const P = window.LSH_PROGRAM || {}, S = (P.sources || []).filter(s => s.key), shared = P.shared || [];
    const vals = await sharedGetMany(S.map(s => s.key + p.id).concat(shared)), rec = {}, sh = {};
    S.forEach((s, i) => { rec[s.key] = vals[i] || null; }); shared.forEach((k, i) => { sh[k] = vals[S.length + i] || null; });
    // (reviewedOnly: an automatic score no trainer has reviewed yet stays out of the management summary, as out of the ranking)
    const sc = lshProgram.compute(Object.assign({id: p.id, progress: p.progress || {}, rec, shared: sh, since: p.since, reviewedOnly: true}, range ? {range} : {}));
    const row = id => (sc.rows || []).find(r => r.s.id === id), graded = it => (it || []).filter(x => typeof x.pct === "number" && isFinite(x.pct));
    const calls = graded(((row("calls") || {}).items || []).concat(((row("portalsims") || {}).items || []).filter(x => /call|recept|intake|phone|voice/i.test(x.name || ""))));
    const written = graded(((row("drive") || {}).items || []).filter(x => /^📄/.test(x.name || "")).concat((row("listening") || {}).items || [], (row("process") || {}).items || [], (row("transcribe") || {}).items || [], (row("lor") || {}).items || []));
    const mean = xs => xs.length ? xs.reduce((a, x) => a + x.pct, 0) / xs.length : null;
    return {calls: mean(calls), written: mean(written), callsN: calls.length, writtenN: written.length};
  }catch(err){ return out; }
}
async function evidence(p, range){
  const [lab, proc, kcr, rv, fb, tfb, ses, sk] = await sharedGetMany(["labreview:", "process:", "kcreview:", "trackerreview:", "feedback:", "trainerfb:", "sessions:", "skills:"].map(k => k + p.id));
  const inW = at => !range || (String(at || "").slice(0, 10) >= range[0] && String(at || "").slice(0, 10) <= range[1]);
  const rub = (window.FT_RUBRICS && FT_RUBRICS.list) || {};
  // the scoresheets (mock calls and demos): every criterion's score and remark, the comment
  const sheets = Object.entries((lab && lab.acts) || {}).filter(([k, x]) => x && (x.rubric || x.score != null || has(x.comment))).map(([k, x]) => {
    const rb = x.rubric ? rub[x.rubric.key] : null;
    return {act: k, title: rb ? rb.title : k, mock: rb ? /mock call/i.test(rb.title) : /live|mock/i.test(k), at: x.at || x.date || "", status: window.ftResult ? ftResult(x) : x.status || "", score: x.score, avg5: x.rubric && x.rubric.avg != null ? Number(x.rubric.avg) : x.score != null ? Number(x.score) / 20 : null, comment: clip(x.comment, 500),
      crit: rb ? (rb.criteria || []).map((c, i) => ({n: c.n, s: (x.rubric.scores || [])[i], f: (x.rubric.feedback || [])[i] || ""})).filter(c => c.s != null && c.s !== "") : []}; });
  const week = sheets.filter(x => inW(x.at)), use = week.length ? week : sheets;   // (none this week: the latest ones)
  const kcs = Object.entries((proc && proc.kc) || {}).map(([l, x]) => x && x.last ? {l, pct: (kcr && kcr.lessons && kcr.lessons[l] && kcr.lessons[l].score != null) ? Number(kcr.lessons[l].score) : x.best, at: x.last.at, summary: clip(x.last.summary, 400),
    weak: (x.last.items || []).filter(q => q.score <= 6).map(q => clip(q.feedback, 160)).slice(0, 2)} : null).filter(Boolean);
  const rvW = window.ftW1Override ? ftW1Override.comp(rv, p.batch) : rv;   // W1-OVERRIDE
  const comp = Object.entries((rvW && rvW.compliance) || {}).filter(([d]) => inW(d)).map(([d, c]) => ({d, pct: c.pct, parts: c.parts || {}, instr: c.instr || null, eod: c.eodCheck || null, tests: c.tests || {}}));
  const items = Object.values((rv && rv.items) || {}).filter(x => x && inW(x.at));
  const assess = Object.values((rv && rv.assess) || {}).filter(x => x && x.score != null);
  const days = Object.entries((fb && fb.days) || {}).filter(([l, x]) => x && x.status === "sent").map(([l, x]) => ({l, rating: x.rating || "", summary: clip(x.summary, 400), at: x.sentAt}));
  const sent = Object.values((tfb && tfb.items) || {}).filter(x => x && (has(x.comment) || x.score != null)).map(x => ({title: x.title, verdict: x.verdict || "", score: x.score, comment: clip(x.comment, 400), at: x.at}));
  const runs = Object.values((ses && ses.runs) || {}).filter(r => r && r.submittedAt && inW(r.submittedAt)).map(r => (r.auto || {}).pct).filter(v => typeof v === "number");
  const spell = ((sk && sk.spelling) || []).filter(x => inW(x.at || x.date) && x.total).map(x => 100 * (x.score || 0) / x.total);
  // the base scores, out of 5, from the evidence
  const critAvg = re => avg(use.flatMap(x => x.crit.filter(c => re.test(c.n)).map(c => Number(c.s))));
  const pct5 = v => v == null ? null : v / 20;
  // (the Scorecard's own grading systems for the week — js/ft-program.js through lshProgram.compute: the practice calls in the
  // simulators and the written output graded on the platform)
  const prog = await progOf(p, range);
  const eodOn = comp.map(c => c.eod).filter(Boolean), timeRules = eodOn.map(x => (x.rules || []).find(r => r.id === "time")).filter(Boolean);
  const base = {
    attention: r1(avg([critAvg(/attention|detail|authenticat|comprehension|accura/i), pct5(avg(kcs.map(k => k.pct))), pct5(avg(assess.map(a => a.pct))), pct5(avg(comp.map(c => c.parts.tracker).filter(v => v != null)))])),
    compliance: r1(pct5(avg(comp.map(c => c.pct)))),
    // 📏 strictly: each day's naming convention, saving route and folders, deliverables on time and Drive links (worker.js dailyCompliance instr)
    instructions: r1(pct5(avg(comp.map(c => c.parts.instructions).filter(v => v != null)))),
    timely: r1(avg([timeRules.length ? 5 * timeRules.filter(r => r.pass).length / timeRules.length : null, items.length ? 5 * items.filter(x => x.onTime).length / items.length : null, pct5(avg(comp.map(c => c.parts.outputs).filter(v => v != null)))])),
    // 💬 communication: the mock calls' and demos' communication criteria and their overall scores, the practice calls in the
    // simulators (🎯 graded calls, 🧰 the Portal's call simulators), the written output graded on the platform (the assessments and
    // answer sheets, the listening activity) and the EOD emails
    communication: r1(avg([critAvg(/customer service|listening|assertive|tone|closing|introduction|transfer|resolution|rapport|empathy/i),
      avg(use.map(x => x.avg5)), pct5(avg(eodOn.map(x => x.pct))), pct5(prog.calls), pct5(prog.written)])),
    english: r1(avg([critAvg(/grammar|spelling|writing|clarity of speech|articulation|dead air|filler/i), pct5(avg(spell)), pct5(avg(kcs.map(k => k.pct)))])),
    call: r1(avg(use.filter(x => x.mock).map(x => x.avg5))),
    // (and the tools on the platform day by day — the end-of-shift check's "platform" part: lessons finished, Knowledge Checks,
    // the Practice Lab's tools and simulators used, answer sheets submitted — so the week has a score before any demo)
    tools: r1(avg([avg(use.filter(x => !x.mock).map(x => x.avg5)), pct5(avg(runs)), critAvg(/navigation|system|tool|cms|softphone/i), pct5(avg(comp.map(c => c.parts.platform).filter(v => v != null)))]))};
  return {p, base, sheets: use, kcs, comp, items: items.length, assess, days, sent, runs, spell, prog};
}
// the evidence as the AI reads it
function brief(ev){
  const L = [];
  ev.sheets.forEach(x => L.push(`[${x.mock ? "Mock call" : "Demo"}] ${x.title}: ${x.avg5 != null ? x.avg5.toFixed(2) + "/5" : ""} ${x.status}${x.crit.length ? " · " + x.crit.map(c => `${c.n} ${c.s}/5${c.f ? " (" + clip(c.f, 120) + ")" : ""}`).join("; ") : ""}${x.comment ? " · Trainer: " + x.comment : ""}`));
  ev.kcs.forEach(k => L.push(`[Knowledge Check] lesson ${k.l}: ${k.pct}% · ${k.summary}${k.weak.length ? " · weaker answers: " + k.weak.join(" | ") : ""}`));
  ev.assess.forEach(a => L.push(`[Assessment] ${a.title}: ${a.score}/${a.max} (${a.pct}%)`));
  if(ev.comp.length) L.push(`[Daily compliance] ${ev.comp.map(c => `${c.d} ${c.pct}% (tracker ${c.parts.tracker ?? "–"}, monitor ${c.parts.monitor ?? "–"}, following instructions ${c.parts.instructions ?? "–"}${c.instr && (c.instr.issues || []).length ? " [not followed: " + c.instr.issues.map(x => x.k + ": " + clip(x.why, 60)).join("; ") + "]" : ""}, TAM (shadowing) ${c.parts.tam ?? "–"}, platform ${c.parts.platform ?? "–"}, tests ${c.parts.tests ?? "–"}, outputs ${c.parts.outputs ?? "–"}, EOD ${c.parts.eod ?? "–"}${c.eod ? "; EOD misses: " + (c.eod.rules || []).filter(r => !r.pass).map(r => r.label).join(", ") : ""})`).join(" | ")}`);
  if(ev.runs.length) L.push(`[Practice Sessions] ${ev.runs.map(v => v + "%").join(", ")}`);
  if(ev.prog && ev.prog.callsN) L.push(`[Practice calls in the simulators] ${ev.prog.callsN} graded, average ${Math.round(ev.prog.calls)}%`);
  if(ev.prog && ev.prog.writtenN) L.push(`[Written output graded on the platform] ${ev.prog.writtenN} graded, average ${Math.round(ev.prog.written)}%`);
  if(ev.spell.length) L.push(`[Spelling tests] ${ev.spell.map(v => Math.round(v) + "%").join(", ")}`);
  ev.days.forEach(d => L.push(`[Trainer's day-by-day feedback] lesson ${d.l}: ${d.rating} · ${d.summary}`));
  ev.sent.forEach(x => L.push(`[Trainer's feedback] ${x.title}: ${x.verdict}${x.score != null ? " " + x.score + "%" : ""} · ${x.comment}`));
  return L.join("\n").slice(0, 9000);
}
// without the AI: the comment built from the evidence
function plainComment(k, ev, s){
  const sc = s == null ? "Not enough evidence this week." : `${s.toFixed(1)}/5 from this week's work.`;
  const mocks = ev.sheets.filter(x => x.mock), demos = ev.sheets.filter(x => !x.mock);
  const remarks = xs => xs.map(x => x.comment).filter(has).slice(0, 2).join(" ");
  if(k === "call") return `${sc} ${mocks.length ? `Mock calls: ${mocks.map(x => `${x.title} ${x.avg5 != null ? x.avg5.toFixed(2) : "–"}/5`).join(", ")}. ` : ""}${remarks(mocks.concat(demos))}`.trim();
  if(k === "communication"){ const P = ev.prog || {}, bits = [];
    if(ev.sheets.length) bits.push(`${ev.sheets.length} mock call/demo scoresheet${ev.sheets.length === 1 ? "" : "s"}`);
    if(P.callsN) bits.push(`${P.callsN} practice call${P.callsN === 1 ? "" : "s"} in the simulators (${Math.round(P.calls)}%)`);
    if(P.writtenN) bits.push(`${P.writtenN} graded written output${P.writtenN === 1 ? "" : "s"} (${Math.round(P.written)}%)`);
    return `${sc} ${bits.length ? "From " + bits.join(", ") + "." : ""}`.trim(); }
  if(k === "tools"){ const pl = ev.comp.filter(c => c.parts.platform != null); return `${sc} ${pl.length ? `Worked on the platform's tools on ${pl.filter(c => c.parts.platform >= 100).length} of ${pl.length} days checked.` : ""} ${demos.length ? `Demos: ${demos.map(x => `${x.title} ${x.avg5 != null ? x.avg5.toFixed(2) : "–"}/5`).join(", ")}.` : ""}`.trim(); }
  if(k === "instructions"){ const bad = ev.comp.filter(c => c.instr && (c.instr.issues || []).length);
    return `${sc} ${bad.length ? `Not followed on ${bad.map(c => c.d.slice(5).replace("-", "/")).join(", ")}: ${[...new Set(bad.flatMap(c => c.instr.issues.map(x => x.why)))].slice(0, 3).join("; ")}.` : ev.comp.some(c => c.instr) ? "Naming, saving route and deliverables all as instructed." : ""}`.trim(); }
  if(k === "compliance") return `${sc} ${ev.comp.length ? `${ev.comp.length} day${ev.comp.length === 1 ? "" : "s"} checked at the end of the shift.` : ""}`.trim();
  return sc;
}
async function summarize(ev, voice){
  const base = ev.base, out = {scores: Object.assign({}, base), comments: {}, trainer: "", overallComment: "", ai: false};
  COMP.forEach(([k]) => { out.comments[k] = plainComment(k, ev, base[k]); });
  out.trainer = ev.days.concat(ev.sent).map(x => x.summary || x.comment).filter(has).slice(0, 2).join(" ") || "No feedback from the trainer this week.";
  if(typeof callAIJson !== "function") return out;
  const prompt = `You write the weekly progress report on a trainee Legal Virtual Assistant (${String(ev.p.name).split(/\s+/)[0]}) for Legal Support Help's management, in the facilitator's voice. From the week's evidence below, write a short summarized comment (2–3 sentences: what they did well, then what needs to improve, specific to the evidence) for each competency, and summarize the trainer's feedback. Call Handling must draw on the mock calls AND the trainer's comments on the demos; Tools Utilization must draw on the demos and their comments. Each competency has a base score out of 5 worked out from the evidence: keep it unless the evidence clearly shows otherwise (then adjust by at most 0.5); a competency with no base and no evidence gets null.

Competencies (key: name — base score):
${COMP.map(([k, , n]) => `${k}: ${n} — ${base[k] == null ? "none" : base[k]}`).join("\n")}

THE WEEK'S EVIDENCE:
${brief(ev) || "(nothing recorded this week)"}
${voice || ""}

Return ONLY JSON: {"scores":{${COMP.map(([k]) => `"${k}":<0-5 one decimal or null>`).join(",")}},"comments":{${COMP.map(([k]) => `"${k}":"..."`).join(",")}},"trainer":"the trainer's feedback, summarized in 2-3 sentences","overall":"the AI summary of their performance for the whole week: 2-4 sentences, opening with a verdict label (Excellent / Good / Good, with Improvements Needed / Needs Improvement), what they did well and what to improve, with the specifics"}`;
  try{
    const j = await callAIJson(prompt, 1800, undefined, "grading");
    if(j && j.comments){
      COMP.forEach(([k]) => { const c = j.comments[k]; if(has(c)) out.comments[k] = clip(c, 600);
        const v = j.scores && j.scores[k]; if(v != null && isFinite(Number(v))){ const n = Math.max(0, Math.min(5, Number(v))); out.scores[k] = base[k] == null ? r1(n) : r1(Math.max(base[k] - 0.5, Math.min(base[k] + 0.5, n))); } });
      if(has(j.trainer)) out.trainer = clip(j.trainer, 700); if(has(j.overall)) out.overallComment = clip(j.overall, 900); out.ai = true;
    }
  }catch(err){}
  return out;
}

/* ---------- loading, drafting and saving ---------- */
async function load(c){
  const key = keyOf(c.batch, c.week); if(S.key === key) return;   // (once a week: a week not summarized yet isn't read again)
  S.key = key; S.data = null; S.loading = true;
  let d = null; try{ d = (await sharedGet(key)) || null; }catch(err){ d = null; }
  if(S.key !== key) return; S.data = S.data || d; S.loading = false; redraw();
}
async function draft(){
  // (asked while one runs — the automatic one, say —: it runs again as soon as that one is done, with what is asked now)
  const c = ctx(); if(!c) return; if(S.busy){ S.again = true; return; } const key = keyOf(c.batch, c.week), ppl = c.people || [];
  if(!ppl.length){ toast("No approved trainee in this batch."); return; }
  S.busy = true; S.err = ""; redraw();
  const voice = typeof window.fbStyleBlock === "function" ? (window.fbStyleBlock() || "") : "";
  const rows = {}; let ai = 0;
  for(const p of ppl){ try{ const ev = await evidence(p, c.range); const sm = await summarize(ev, voice); if(sm.ai) ai++; rows[p.id] = Object.assign({name: p.name}, sm); }catch(err){} if(S.key !== key) break; }
  // (another week picked meanwhile: nothing is saved over this week's summary, nor shown as that week's)
  if(S.key !== key){ S.busy = false; if(S.again){ S.again = false; setTimeout(draft, 0); } redraw(); return; }
  const prev = S.data || {};
  // (what a trainer edited by hand stays)
  Object.entries(prev.rows || {}).forEach(([id, r]) => { if(rows[id] && r.edited){ rows[id] = Object.assign(rows[id], {scores: Object.assign(rows[id].scores, r.scoresEdited || {}), comments: Object.assign(rows[id].comments, r.commentsEdited || {}), trainer: r.trainerEdited || rows[id].trainer},
    {edited: true, scoresEdited: r.scoresEdited, commentsEdited: r.commentsEdited, trainerEdited: r.trainerEdited}); } });
  S.data = {batch: c.batch, week: c.week, range: c.range, rows, at: new Date().toISOString(), ai: ai > 0};
  if(prev.sharedAt){ S.data.sharedAt = prev.sharedAt; S.data.editedAt = S.data.at; }   // (📤 shared before: the trainees still see that copy until it is shared again)
  if(await sharedSet(key, S.data) === false) toast("Couldn’t save the summary. Check your connection.");
  S.busy = false; if(S.again){ S.again = false; setTimeout(draft, 0); return; } toast(ai ? `📑 Week ${c.week}'s summary is ready: ${Object.keys(rows).length} trainees.` : "📑 The summary is ready from the platform's scores (the AI wasn't available for the comments)."); redraw();
}
const overall = r => r1(avg(COMP.map(([k]) => r.scores[k])));
// (only the batch's trainees now: a trainee revoked, offboarded or archived after the week was summarized drops off the report and
// its ranking — the summary keeps their row, so restoring them brings it back)
function ranked(){ const c = ctx(), live = c && Array.isArray(c.people) && c.people.length ? new Set(c.people.map(p => p.id)) : null;
  const rows = Object.entries((S.data || {}).rows || {}).filter(([id]) => !live || live.has(id)).map(([id, r]) => Object.assign({id}, r, {overall: overall(r)}));
  const o = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall); o.forEach((r, i) => { r.rank = i && o[i - 1].overall === r.overall ? o[i - 1].rank : i + 1; });
  return rows.sort((a, b) => (a.rank || 999) - (b.rank || 999) || String(a.name).localeCompare(String(b.name))); }
const tone = v => v == null ? "na" : v >= 4.5 ? "ex" : v >= 3.5 ? "gd" : v >= 2.5 ? "ok" : "lo";
const LBL = {ex: "Excellent", gd: "Good", ok: "Developing", lo: "Needs improvement", na: "—"};
const fmtR = r => { if(!r) return ""; const f = d => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {month: "long", day: "numeric", year: "numeric", timeZone: "UTC"}); return `${f(r[0])} – ${f(r[1])}`; };

/* ---------- the report ---------- */
// V: a trainee's own copy (📋 My Progress, FTRankSummary.mine): {c: {batch, week}, d: {range, at, ai}, rows: [their own row]} —
// the same report, read-only, with no one else in it
function reportHtml(forDoc, V){
  const c = V ? V.c : (ctx() || {}), d = V ? V.d : S.data, rows = V ? V.rows : ranked(), ed = S.edit && !forDoc && !V;
  // (📊 the trainer's page is one table: each trainee's scores, a score's comment on a hover, the summary and the trainer's feedback;
  //  ✎ Edit opens every trainee's competencies to change them, and the trainee's own report keeps its card)
  const one = !forDoc && !V && !ed;
  const fk = r => V ? `me:${c.batch}|${c.week}` : r.id;   // which card a fold is kept for
  const chip = v => `<span class="rks-chip rks-${tone(v)}">${v == null ? "—" : v.toFixed(1)}</span>`;
  const bar = v => `<span class="rks-bar"><i class="rks-${tone(v)}" style="width:${v == null ? 0 : Math.round(v / 5 * 100)}%"></i></span>`;
  return `<div class="rks${forDoc ? " rks-doc" : ""}">
    <div class="rks-head"><div><p class="rks-k">Legal Support Help · Foundational Training</p><h2>${V ? "My Weekly Progress Report" : "Weekly Progress Report"}</h2>
      <p class="rks-sub">Batch <b>${e(c.batch)}</b> · Week <b>${e(c.week)}</b>${d && d.range ? ` · ${e(fmtR(d.range))}` : ""}</p></div>
      <div class="rks-legend">${["ex", "gd", "ok", "lo"].map(t => `<span><i class="rks-${t}"></i>${LBL[t]}</span>`).join("")}<small>Scores out of 5</small></div>${!forDoc && !V && S.acts ? `<div class="rks-head-acts">${S.acts}</div>` : ""}</div>
    <table class="rks-tbl"><thead><tr><th>Rank</th><th class="rks-name">Trainee</th>${COMP.map(([k, ic, n]) => `<th title="${e(n)}">${ic}<br><small>${e(n.replace(/ \(.*\)$/, ""))}</small></th>`).join("")}<th>Overall</th>${one ? `<th class="rks-sumh">Summary & trainer’s feedback</th>` : ""}</tr></thead>
      <tbody>${rows.map(r => `<tr><td class="rks-rank">${r.rank || "—"}</td><td class="rks-name"><b>${e(r.name)}</b></td>${COMP.map(([k]) => `<td${one && r.comments[k] ? ` title="${e(r.comments[k])}"` : ""}>${chip(r.scores[k])}</td>`).join("")}<td>${chip(r.overall)} <small class="rks-lbl">${LBL[tone(r.overall)]}</small></td>${one ? `<td class="rks-sum">${r.overallComment ? `<p>${e(r.overallComment)}</p>` : ""}${r.trainer ? `<p class="rks-sum-fb"><b>🧑‍🏫</b> ${e(r.trainer)}</p>` : ""}</td>` : ""}</tr>`).join("")}</tbody></table>
    ${one ? "" : rows.map(r => {
      // ▸/▾ on the page each trainee's card folds to its heading (rank, name, the eight scores and the overall); ✎ Edit opens them
      // all, and the Word and Print copies are always open. Which are open is kept while the page is (S.open).
      const head = `<span class="rks-rk">#${r.rank || "—"}${V && r.rank && r.of ? `<small> of ${r.of}</small>` : ""}</span><b>${e(r.name)}</b>${forDoc ? "" : `<span class="rks-mini">${COMP.map(([k, ic, n]) => `<span title="${e(n)}">${ic}${chip(r.scores[k])}</span>`).join("")}</span>`}<span class="rks-ov">${chip(r.overall)} ${LBL[tone(r.overall)]}</span>`;
      const was = (S.open || {})[fk(r)], open = forDoc || ed || (V ? was !== false : was);   // (a trainee's own card starts open)
      return `${forDoc ? `<section class="rks-card"><div class="rks-card-h">${head}</div>` : `<details class="rks-card" data-id="${e(fk(r))}" ontoggle="FTRankSummary.fold(this)"${open ? " open" : ""}><summary class="rks-card-h"><span class="rks-caret" aria-hidden="true">▸</span>${head}</summary>`}
      ${r.overallComment ? `<p class="rks-ovc">${e(r.overallComment)}</p>` : ""}
      <div class="rks-grid">${COMP.map(([k, ic, n]) => `<div class="rks-comp"><div class="rks-comp-h"><span>${ic} ${e(n)}</span>${ed ? `<input type="number" min="0" max="5" step="0.1" value="${r.scores[k] == null ? "" : r.scores[k]}" onchange="FTRankSummary.set('${e(r.id)}','score','${k}',this.value)">` : chip(r.scores[k])}</div>${bar(r.scores[k])}
        ${ed ? `<textarea rows="3" onchange="FTRankSummary.set('${e(r.id)}','comment','${k}',this.value)">${e(r.comments[k] || "")}</textarea>` : `<p>${e(r.comments[k] || "")}</p>`}</div>`).join("")}</div>
      <div class="rks-fb"><b>🧑‍🏫 Feedback from the trainer</b>${ed ? `<textarea rows="3" onchange="FTRankSummary.set('${e(r.id)}','trainer','',this.value)">${e(r.trainer || "")}</textarea>` : `<p>${e(r.trainer || "")}</p>`}</div>${forDoc ? "</section>" : "</details>"}`; }).join("")}
    ${d && (V || forDoc) ? `<p class="rks-foot">${V ? "Shared with you" : "Prepared"} ${e(new Date(d.at).toLocaleString())} from the platform's records of the week${d.ai ? ", summarized in the facilitator's voice" : ""}.</p>` : ""}</div>`;
}
const CSS = `.rks{font-family:'Inter',Arial,sans-serif;color:#1E2340;}
.rks-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#1E2340,#33406B);color:#fff;margin:0 0 12px;}
.rks .rks-head h2{margin:2px 0 !important;font:800 26px 'Fraunces',Georgia,serif !important;color:#fff !important;} .rks .rks-head .rks-k{margin:0 !important;font-size:12px !important;letter-spacing:.08em;text-transform:uppercase;color:#F6C08F !important;font-weight:800 !important;}
.rks .rks-head .rks-sub{margin:2px 0 0 !important;color:#E8ECF7 !important;font-size:15px !important;} .rks .rks-head .rks-sub b{color:#fff !important;} .rks .rks-head .rks-legend span{color:#fff !important;}
.rks-legend{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12.5px;} .rks-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px;vertical-align:-1px;} .rks-legend small{color:#C9D1E8;}
.rks-tbl{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:18px;font-weight:800;} .rks-tbl th{background:#F1F3F9;color:#1E2340;font-weight:800;padding:8px 6px;text-align:center;border-bottom:2px solid #DB8437;font-size:16px;}
.rks-tbl th small{font-size:14px;font-weight:900;color:#1E2340;}
/* (a heading breaks between words, never inside one: "Rank", "Compliance" stay whole) */
.rks-tbl th,.rks-tbl th small{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;} .rks-tbl thead th:first-child{white-space:nowrap;} .rks-tbl td{padding:7px 6px;text-align:center;border-bottom:1px solid #E7EAF1;} .rks-tbl .rks-name{text-align:left;} .rks-rank{font-weight:900;font-size:19px;color:#DB8437;} .rks-tbl .rks-name b{font-size:18.5px;font-weight:900;}
.rks-tbl .rks-sumh{text-align:left;min-width:480px;width:40%;} .rks-tbl .rks-sum{text-align:left;font-size:14.5px;font-weight:600;line-height:1.45;color:#2B3040;min-width:480px;} .rks-sum p{margin:0 0 4px;} .rks-sum-fb{color:#14532D;}
.rks-tbl td[title]{cursor:help;}
.rks-chip{display:inline-block;min-width:36px;padding:3px 6px;border-radius:8px;font-weight:900;font-size:15px;} .rks-lbl{color:#5F6368;}
/* (the Weekly Ranking's colours: 🔵 high, 🟢 good, 🟡 critical, 🔴 fail) */
.rks-ex{background:#CFE0FF;color:#0A3A9E;} .rks-gd{background:#CDEFD8;color:#0F5A2A;} .rks-ok{background:#FFE9A3;color:#6B4A00;} .rks-lo{background:#FBCFCB;color:#A0150C;} .rks-na{background:#ECEEF2;color:#5F6368;}
.rks-legend .rks-ex,.rks-legend .rks-gd,.rks-legend .rks-ok,.rks-legend .rks-lo{border:1px solid #fff;}
.rks-card{border:1px solid #E1E5EE;border-radius:12px;padding:12px 14px;margin:0 0 12px;background:#fff;break-inside:avoid;}
.rks-card-h{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:18px;margin:0 0 4px;}
details.rks-card>summary{list-style:none;cursor:pointer;margin:0;} details.rks-card>summary::-webkit-details-marker{display:none;} details.rks-card[open]>summary{margin:0 0 6px;}
details.rks-card>summary:focus-visible{outline:3px solid #DB8437;outline-offset:3px;border-radius:8px;}
.rks-caret{display:inline-block;color:#1E2340;font-size:14px;transition:transform .15s ease;} details.rks-card[open]>summary .rks-caret{transform:rotate(90deg);}
.rks-mini{display:flex;flex-wrap:wrap;gap:6px;font-size:13px;} .rks-mini>span{display:inline-flex;align-items:center;gap:3px;} .rks-mini .rks-chip{min-width:40px;font-size:16px;padding:4px 8px;}
details.rks-card[open] .rks-mini{display:none;} .rks-rk{font-weight:800;color:#DB8437;} .rks-ov{margin-left:auto;font-size:13.5px;color:#5F6368;}
.rks-ovc{margin:2px 0 8px;font-style:italic;color:#3C4043;}
.rks-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;} .rks-comp{background:#F8F9FC;border-radius:10px;padding:9px 11px;}
.rks-comp-h{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:14px;} .rks-comp p{margin:6px 0 0;font-size:14px;line-height:1.5;}
.rks-bar{display:block;height:6px;border-radius:4px;background:#E7EAF1;margin:6px 0 0;overflow:hidden;} .rks-bar i{display:block;height:100%;}
.rks-fb{margin:10px 0 0;padding:9px 11px;border-left:4px solid #DB8437;background:#FFF8EF;border-radius:8px;font-size:14px;} .rks-fb p{margin:4px 0 0;line-height:1.5;}
.rks textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;margin-top:6px;padding:6px 8px;border:1px solid #C9D1E0;border-radius:8px;} .rks input[type=number]{width:64px;font:inherit;padding:2px 4px;}
.rks-foot{color:#80868B;font-size:12px;margin:6px 0 0;}
.rks-head-acts{flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;}
.rks-head-acts .btn-ghost{background:rgba(255,255,255,.12) !important;border:1px solid rgba(255,255,255,.45) !important;color:#fff !important;}
.rks-head-acts .btn-navy{background:#DB8437 !important;border-color:#DB8437 !important;color:#fff !important;} .rks-head-acts select{font-weight:800;}
.rks-bar-acts select{font-weight:700;} .rks-bar-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px;} .rks-bar-acts .rks-note{color:#5F6368;font-size:13px;}`;

/* ---------- on the page: above the marks sheet, in 📊 Weekly Ranking ---------- */
window.FTRankSummary = {
  html(){
    const c = ctx(); if(!c || !c.batch) return "";
    load(c);
    // 🤖 a week already under way with no summary yet: summarized by itself, once a session (kept: rksum:<batch>:w<N>)
    const k = keyOf(c.batch, c.week);
    if(!S.loading && S.key === k && !S.data && !S.busy && !(S.tried || {})[k] && (c.people || []).length && c.range && c.range[0] <= new Date().toISOString().slice(0, 10)){
      (S.tried = S.tried || {})[k] = 1; setTimeout(() => { if(S.key === k && !S.data) draft(); }, 0); }
    const d = S.data;
    // (the week and the report's buttons sit in its blue banner once there is a report; before it, on their own line)
    const acts = `<select aria-label="Week" onchange="FTRanking.week(this.value)">${[1, 2, 3, 4, 5, 6].map(w => `<option value="${w}" ${Number(w) === Number(c.week) ? "selected" : ""}>Week ${w}</option>`).join("")}</select><button class="btn btn-navy btn-sm" ${S.busy ? "disabled" : ""} onclick="FTRankSummary.draft()">${S.busy ? "📑 Summarizing the week…" : d ? "🔄 Update from the week's progress" : "📑 Summarize the week for management"}</button>
        ${d ? `<button class="btn btn-ghost btn-sm" onclick="FTRankSummary.toggleEdit()">${S.edit ? "✓ Done editing" : "✎ Edit"}</button><button class="btn btn-ghost btn-sm" ${S.sharing ? "disabled" : ""} onclick="FTRankSummary.share()" title="Each trainee sees only their own card: their scores, comments and the trainer's feedback, and their rank">${S.sharing ? "📤 Sharing…" : d.sharedAt ? "📤 Share again" : "📤 Share with the trainees"}</button><button class="btn btn-navy btn-sm" onclick="FTRankSummary.excel()">⬇ Excel</button>` : ""}${window.FTBatchSheet && typeof FTBatchSheet.weeklyActs === "function" ? FTBatchSheet.weeklyActs() : ""}`;
    S.acts = d && !S.loading ? acts : "";
    return `<div class="rks-wrap">${S.acts ? "" : `<div class="rks-bar-acts">${acts}</div>`}
      ${S.loading ? `<p class="sc-empty">Opening the summary…</p>` : d ? reportHtml(false) : `<p class="sc-empty">Not summarized yet for Week ${e(c.week)}. 📑 Summarize the week: every trainee's scorecard from the platform's records of the week.</p>`}</div>`;
  },
  // the AI summary of a trainee's whole week (📊 the marks sheet's column): the summary's own, else its scores in a line
  weekSummary(id){
    const r = ((S.data || {}).rows || {})[id]; if(!r) return {text: "", state: S.busy ? "busy" : S.data ? "none" : "wait"};
    if(has(r.overallComment)) return {text: r.overallComment, ai: true};
    const sc = COMP.filter(([k]) => r.scores[k] != null), best = sc.slice().sort((a, b) => r.scores[b[0]] - r.scores[a[0]])[0], low = sc.slice().sort((a, b) => r.scores[a[0]] - r.scores[b[0]])[0], o = overall(r);
    return {text: o == null ? "" : `${LBL[tone(o)]} (${o.toFixed(1)}/5).${best ? ` Strongest: ${best[2]} (${r.scores[best[0]].toFixed(1)}).` : ""}${low && low !== best ? ` To improve: ${low[2]} (${r.scores[low[0]].toFixed(1)}).` : ""}`, ai: false};
  },
  busy: () => !!S.busy,
  draft, toggleEdit(){ S.edit = !S.edit; redraw(); },
  // 📤 each trainee gets their own card of this week in rankshare:<id> (reports), which only they and the trainers read
  // (worker.js canRead; a trainee can't write it): their scores, comments and the trainer's feedback, their rank and how many
  // were ranked — no one else's name or scores
  async share(){
    const d = S.data; if(!d || S.sharing) return;
    const rows = ranked(), of = rows.filter(r => r.rank).length;
    if(!rows.length){ toast("No trainee in this summary."); return; }
    if(!confirm(`Share Week ${d.week}'s Weekly Progress Report with the ${rows.length} trainee${rows.length === 1 ? "" : "s"} of ${d.batch}?\n\nEach sees only their own card: their scores, comments and your feedback, and their rank.`)) return;
    S.sharing = true; redraw(); let bad = 0; const at = new Date().toISOString();
    for(const r of rows){
      const mine = {batch: d.batch, week: d.week, range: d.range || null, ai: !!d.ai, sharedAt: at, name: r.name, rank: r.rank || null, of, overall: r.overall,
        scores: Object.assign({}, r.scores), comments: Object.assign({}, r.comments), trainer: r.trainer || "", overallComment: r.overallComment || ""};
      try{ const cur = (await sharedGet("rankshare:" + r.id)) || {}; cur.reports = cur.reports || {}; cur.reports[`${d.batch}|${d.week}`] = mine;
        if(await sharedSet("rankshare:" + r.id, cur) === false) bad++; }catch(err){ bad++; }
    }
    if(!bad){ d.sharedAt = at; await sharedSet(keyOf(d.batch, d.week), d); }
    S.sharing = false; toast(bad ? `Couldn’t share with ${bad} trainee(s). Try again.` : "📤 Shared: each trainee sees their own card in 📋 My Progress."); redraw();
  },
  // 🔒 a trainee's own reports (📋 My Progress): read from their rankshare:<id> only
  mine(me){
    if(!me || !me.id) return "";
    if(S.meFor !== me.id){ S.meFor = me.id; S.mine = null;
      Promise.resolve(typeof sharedGet === "function" ? sharedGet("rankshare:" + me.id) : null).then(v => { S.mine = v || {}; }, () => { S.mine = {}; }).then(() => { if(typeof render === "function") render(); }); }
    if(S.mine == null) return `<p class="sc-empty">Opening your Weekly Progress Report…</p>`;
    const reps = Object.values(S.mine.reports || {}).filter(r => r && r.scores).sort((a, b) => Number(b.week) - Number(a.week) || String(b.sharedAt).localeCompare(String(a.sharedAt)));
    if(!reps.length) return `<p class="sc-empty">Your trainer hasn’t shared a Weekly Progress Report with you yet. It shows up here once they do.</p>`;
    return reps.map(r => reportHtml(false, {c: {batch: r.batch, week: r.week}, d: {range: r.range, at: r.sharedAt, ai: r.ai},
      rows: [{id: me.id, name: r.name || me.name, rank: r.rank, of: r.of, overall: r.overall, scores: r.scores || {}, comments: r.comments || {}, trainer: r.trainer, overallComment: r.overallComment}]})).join("");
  },
  fold(el){ (S.open = S.open || {})[el.dataset.id] = el.open; },
  foldAll(open){ S.open = {}; Object.keys((S.data || {}).rows || {}).forEach(id => { S.open[id] = open; });
    document.querySelectorAll("details.rks-card").forEach(d => { d.open = open; }); },
  async set(id, what, k, v){
    const r = ((S.data || {}).rows || {})[id]; if(!r) return; r.edited = true; S.data.editedAt = new Date().toISOString();
    if(what === "score"){ const n = v === "" ? null : Math.max(0, Math.min(5, Number(v))); r.scores[k] = n == null ? null : r1(n); r.scoresEdited = Object.assign({}, r.scoresEdited, {[k]: r.scores[k]}); }
    else if(what === "comment"){ r.comments[k] = String(v).trim(); r.commentsEdited = Object.assign({}, r.commentsEdited, {[k]: r.comments[k]}); }
    else { r.trainer = String(v).trim(); r.trainerEdited = r.trainer; }
    const c = ctx(); if(await sharedSet(keyOf(c.batch, c.week), S.data) === false) toast("Couldn’t save. Check your connection.");
  },
  doc(){ const c = ctx() || {}; return `<html><head><meta charset="utf-8"><title>Weekly Progress Report · ${e(c.batch)} · Week ${e(c.week)}</title><style>${CSS} body{margin:24px;} .rks-grid{grid-template-columns:1fr 1fr;}</style></head><body>${reportHtml(true)}</body></html>`; },
  word(){ const c = ctx() || {}, blob = new Blob(["﻿", FTRankSummary.doc()], {type: "application/msword"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Weekly Progress Report - ${c.batch} - Week ${c.week}.doc`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); },
  // ⬇ Excel: the report as a sheet — rank, trainee, the eight scores out of 5, the overall, each score's comment and the trainer's feedback
  excel(){
    const c = ctx() || {}, rows = ranked(); if(!window.FTRanking || typeof FTRanking.xlsxOf !== "function"){ toast("The Excel download isn't ready yet. Reload the page."); return; }
    const n = (v) => typeof v === "number" && isFinite(v) ? Math.round(v * 10) / 10 : "";
    const head = ["Rank", "Trainee"].concat(COMP.map(([k, ic, nm]) => nm), ["Overall"], COMP.map(([k, ic, nm]) => nm + " · comment"), ["Trainer's feedback"]);
    const body = rows.map(r => [r.rank || "", r.name].concat(COMP.map(([k]) => n((r.scores || {})[k])), [n(r.overall)], COMP.map(([k]) => (r.comments || {})[k] || ""), [r.trainer || ""]));
    const blob = FTRanking.xlsxOf(`Week ${c.week}`, [[`Weekly Progress Report · ${c.batch} · Week ${c.week}`], head].concat(body)), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Weekly Progress Report - ${c.batch} - Week ${c.week}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); },
  print(){ const w = window.open("", "_blank"); if(!w){ toast("Allow pop-ups to print."); return; } w.document.write(FTRankSummary.doc()); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); }
};
(function(){ const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); })();
})();
