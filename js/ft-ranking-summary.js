/* ============================================================
   📑 THE WEEKLY RANKING, SUMMARIZED FOR MANAGEMENT
   ------------------------------------------------------------
   📋 Batch Sheet → 📊 Weekly Ranking opens on this: each trainee's week as a scorecard of seven competencies, each scored out of
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
  ["attention", "🔎", "Attention to Detail"], ["compliance", "✅", "Compliance"], ["timely", "⏱", "Timely Submission (Time Management)"],
  ["communication", "💬", "Communication Proficiency"], ["english", "🔤", "English Proficiency"], ["call", "📞", "Call Handling"], ["tools", "🛠", "Tools Utilization"]];
const S = {key: "", data: null, loading: false, busy: false, edit: false, err: ""};
const keyOf = (b, w) => `rksum:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const ctx = () => (window.FTRanking && FTRanking.ctx) ? FTRanking.ctx() : null;
const redraw = () => { const c = ctx(); if(c && c.rerender) c.rerender(); else if(typeof render === "function") render(); };

/* ---------- the week's evidence for one trainee ---------- */
async function evidence(p, range){
  const [lab, proc, kcr, rv, fb, tfb, ses, sk] = await sharedGetMany(["labreview:", "process:", "kcreview:", "trackerreview:", "feedback:", "trainerfb:", "sessions:", "skills:"].map(k => k + p.id));
  const inW = at => !range || (String(at || "").slice(0, 10) >= range[0] && String(at || "").slice(0, 10) <= range[1]);
  const rub = (window.FT_RUBRICS && FT_RUBRICS.list) || {};
  // the scoresheets (mock calls and demos): every criterion's score and remark, the comment
  const sheets = Object.entries((lab && lab.acts) || {}).filter(([k, x]) => x && (x.rubric || x.score != null || has(x.comment))).map(([k, x]) => {
    const rb = x.rubric ? rub[x.rubric.key] : null;
    return {act: k, title: rb ? rb.title : k, mock: rb ? /mock call/i.test(rb.title) : /live|mock/i.test(k), at: x.at || x.date || "", status: x.status || "", score: x.score, avg5: x.rubric && x.rubric.avg != null ? Number(x.rubric.avg) : x.score != null ? Number(x.score) / 20 : null, comment: clip(x.comment, 500),
      crit: rb ? (rb.criteria || []).map((c, i) => ({n: c.n, s: (x.rubric.scores || [])[i], f: (x.rubric.feedback || [])[i] || ""})).filter(c => c.s != null && c.s !== "") : []}; });
  const week = sheets.filter(x => inW(x.at)), use = week.length ? week : sheets;   // (none this week: the latest ones)
  const kcs = Object.entries((proc && proc.kc) || {}).map(([l, x]) => x && x.last ? {l, pct: (kcr && kcr.lessons && kcr.lessons[l] && kcr.lessons[l].score != null) ? Number(kcr.lessons[l].score) : x.best, at: x.last.at, summary: clip(x.last.summary, 400),
    weak: (x.last.items || []).filter(q => q.score <= 6).map(q => clip(q.feedback, 160)).slice(0, 2)} : null).filter(Boolean);
  const comp = Object.entries((rv && rv.compliance) || {}).filter(([d]) => inW(d)).map(([d, c]) => ({d, pct: c.pct, parts: c.parts || {}, eod: c.eodCheck || null, tests: c.tests || {}}));
  const items = Object.values((rv && rv.items) || {}).filter(x => x && inW(x.at));
  const assess = Object.values((rv && rv.assess) || {}).filter(x => x && x.score != null);
  const days = Object.entries((fb && fb.days) || {}).filter(([l, x]) => x && x.status === "sent").map(([l, x]) => ({l, rating: x.rating || "", summary: clip(x.summary, 400), at: x.sentAt}));
  const sent = Object.values((tfb && tfb.items) || {}).filter(x => x && (has(x.comment) || x.score != null)).map(x => ({title: x.title, verdict: x.verdict || "", score: x.score, comment: clip(x.comment, 400), at: x.at}));
  const runs = Object.values((ses && ses.runs) || {}).filter(r => r && r.submittedAt && inW(r.submittedAt)).map(r => (r.auto || {}).pct).filter(v => typeof v === "number");
  const spell = ((sk && sk.spelling) || []).filter(x => inW(x.at || x.date) && x.total).map(x => 100 * (x.score || 0) / x.total);
  // the base scores, out of 5, from the evidence
  const critAvg = re => avg(use.flatMap(x => x.crit.filter(c => re.test(c.n)).map(c => Number(c.s))));
  const pct5 = v => v == null ? null : v / 20;
  const eodOn = comp.map(c => c.eod).filter(Boolean), timeRules = eodOn.map(x => (x.rules || []).find(r => r.id === "time")).filter(Boolean);
  const base = {
    attention: r1(avg([critAvg(/attention|detail|authenticat|comprehension|accura/i), pct5(avg(kcs.map(k => k.pct))), pct5(avg(assess.map(a => a.pct))), pct5(avg(comp.map(c => c.parts.tracker).filter(v => v != null)))])),
    compliance: r1(pct5(avg(comp.map(c => c.pct)))),
    timely: r1(avg([timeRules.length ? 5 * timeRules.filter(r => r.pass).length / timeRules.length : null, items.length ? 5 * items.filter(x => x.onTime).length / items.length : null, pct5(avg(comp.map(c => c.parts.outputs).filter(v => v != null)))])),
    communication: r1(avg([critAvg(/customer service|listening|assertive|tone|closing|introduction|transfer|resolution|rapport|empathy/i), pct5(avg(eodOn.map(x => x.pct)))])),
    english: r1(avg([critAvg(/grammar|spelling|writing|clarity of speech|articulation|dead air|filler/i), pct5(avg(spell)), pct5(avg(kcs.map(k => k.pct)))])),
    call: r1(avg(use.filter(x => x.mock).map(x => x.avg5))),
    tools: r1(avg([avg(use.filter(x => !x.mock).map(x => x.avg5)), pct5(avg(runs)), critAvg(/navigation|system|tool|cms|softphone/i)]))};
  return {p, base, sheets: use, kcs, comp, items: items.length, assess, days, sent, runs, spell};
}
// the evidence as the AI reads it
function brief(ev){
  const L = [];
  ev.sheets.forEach(x => L.push(`[${x.mock ? "Mock call" : "Demo"}] ${x.title}: ${x.avg5 != null ? x.avg5.toFixed(2) + "/5" : ""} ${x.status}${x.crit.length ? " · " + x.crit.map(c => `${c.n} ${c.s}/5${c.f ? " (" + clip(c.f, 120) + ")" : ""}`).join("; ") : ""}${x.comment ? " · Trainer: " + x.comment : ""}`));
  ev.kcs.forEach(k => L.push(`[Knowledge Check] lesson ${k.l}: ${k.pct}% · ${k.summary}${k.weak.length ? " · weaker answers: " + k.weak.join(" | ") : ""}`));
  ev.assess.forEach(a => L.push(`[Assessment] ${a.title}: ${a.score}/${a.max} (${a.pct}%)`));
  if(ev.comp.length) L.push(`[Daily compliance] ${ev.comp.map(c => `${c.d} ${c.pct}% (tracker ${c.parts.tracker ?? "–"}, monitor ${c.parts.monitor ?? "–"}, platform ${c.parts.platform ?? "–"}, tests ${c.parts.tests ?? "–"}, outputs ${c.parts.outputs ?? "–"}, EOD ${c.parts.eod ?? "–"}${c.eod ? "; EOD misses: " + (c.eod.rules || []).filter(r => !r.pass).map(r => r.label).join(", ") : ""})`).join(" | ")}`);
  if(ev.runs.length) L.push(`[Practice Sessions] ${ev.runs.map(v => v + "%").join(", ")}`);
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
  if(k === "tools") return `${sc} ${demos.length ? `Demos: ${demos.map(x => `${x.title} ${x.avg5 != null ? x.avg5.toFixed(2) : "–"}/5`).join(", ")}. ` : ""}${remarks(demos)}`.trim();
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
  const prev = S.data || {};
  // (what a trainer edited by hand stays)
  Object.entries(prev.rows || {}).forEach(([id, r]) => { if(rows[id] && r.edited){ rows[id] = Object.assign(rows[id], {scores: Object.assign(rows[id].scores, r.scoresEdited || {}), comments: Object.assign(rows[id].comments, r.commentsEdited || {}), trainer: r.trainerEdited || rows[id].trainer},
    {edited: true, scoresEdited: r.scoresEdited, commentsEdited: r.commentsEdited, trainerEdited: r.trainerEdited}); } });
  S.data = {batch: c.batch, week: c.week, range: c.range, rows, at: new Date().toISOString(), ai: ai > 0};
  if(await sharedSet(key, S.data) === false) toast("Couldn’t save the summary. Check your connection.");
  S.busy = false; if(S.again){ S.again = false; setTimeout(draft, 0); return; } toast(ai ? `📑 Week ${c.week}'s summary is ready: ${Object.keys(rows).length} trainees.` : "📑 The summary is ready from the platform's scores (the AI wasn't available for the comments)."); redraw();
}
const overall = r => r1(avg(COMP.map(([k]) => r.scores[k])));
function ranked(){ const rows = Object.entries((S.data || {}).rows || {}).map(([id, r]) => Object.assign({id}, r, {overall: overall(r)}));
  const o = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall); o.forEach((r, i) => { r.rank = i && o[i - 1].overall === r.overall ? o[i - 1].rank : i + 1; });
  return rows.sort((a, b) => (a.rank || 999) - (b.rank || 999) || String(a.name).localeCompare(String(b.name))); }
const tone = v => v == null ? "na" : v >= 4.5 ? "ex" : v >= 3.5 ? "gd" : v >= 2.5 ? "ok" : "lo";
const LBL = {ex: "Excellent", gd: "Good", ok: "Developing", lo: "Needs improvement", na: "—"};
const fmtR = r => { if(!r) return ""; const f = d => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {month: "long", day: "numeric", year: "numeric", timeZone: "UTC"}); return `${f(r[0])} – ${f(r[1])}`; };

/* ---------- the report ---------- */
function reportHtml(forDoc){
  const c = ctx() || {}, d = S.data, rows = ranked(), ed = S.edit && !forDoc;
  const chip = v => `<span class="rks-chip rks-${tone(v)}">${v == null ? "—" : v.toFixed(1)}</span>`;
  const bar = v => `<span class="rks-bar"><i class="rks-${tone(v)}" style="width:${v == null ? 0 : Math.round(v / 5 * 100)}%"></i></span>`;
  return `<div class="rks${forDoc ? " rks-doc" : ""}">
    <div class="rks-head"><div><p class="rks-k">Legal Support Help · Foundational Training</p><h2>Weekly Progress Report</h2>
      <p class="rks-sub">Batch <b>${e(c.batch)}</b> · Week <b>${e(c.week)}</b>${d && d.range ? ` · ${e(fmtR(d.range))}` : ""}</p></div>
      <div class="rks-legend">${["ex", "gd", "ok", "lo"].map(t => `<span><i class="rks-${t}"></i>${LBL[t]}</span>`).join("")}<small>Scores out of 5</small></div></div>
    <table class="rks-tbl"><thead><tr><th>Rank</th><th class="rks-name">Trainee</th>${COMP.map(([k, ic, n]) => `<th title="${e(n)}">${ic}<br><small>${e(n.replace(/ \(.*\)$/, ""))}</small></th>`).join("")}<th>Overall</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td class="rks-rank">${r.rank || "—"}</td><td class="rks-name"><b>${e(r.name)}</b></td>${COMP.map(([k]) => `<td>${chip(r.scores[k])}</td>`).join("")}<td>${chip(r.overall)} <small class="rks-lbl">${LBL[tone(r.overall)]}</small></td></tr>`).join("")}</tbody></table>
    ${rows.map(r => `<section class="rks-card"><div class="rks-card-h"><span class="rks-rk">#${r.rank || "—"}</span><b>${e(r.name)}</b><span class="rks-ov">${chip(r.overall)} ${LBL[tone(r.overall)]}</span></div>
      ${r.overallComment ? `<p class="rks-ovc">${e(r.overallComment)}</p>` : ""}
      <div class="rks-grid">${COMP.map(([k, ic, n]) => `<div class="rks-comp"><div class="rks-comp-h"><span>${ic} ${e(n)}</span>${ed ? `<input type="number" min="0" max="5" step="0.1" value="${r.scores[k] == null ? "" : r.scores[k]}" onchange="FTRankSummary.set('${e(r.id)}','score','${k}',this.value)">` : chip(r.scores[k])}</div>${bar(r.scores[k])}
        ${ed ? `<textarea rows="3" onchange="FTRankSummary.set('${e(r.id)}','comment','${k}',this.value)">${e(r.comments[k] || "")}</textarea>` : `<p>${e(r.comments[k] || "")}</p>`}</div>`).join("")}</div>
      <div class="rks-fb"><b>🧑‍🏫 Feedback from the trainer</b>${ed ? `<textarea rows="3" onchange="FTRankSummary.set('${e(r.id)}','trainer','',this.value)">${e(r.trainer || "")}</textarea>` : `<p>${e(r.trainer || "")}</p>`}</div></section>`).join("")}
    ${d ? `<p class="rks-foot">Prepared ${e(new Date(d.at).toLocaleString())} from the platform's records of the week${d.ai ? ", summarized in the facilitator's voice" : ""}.</p>` : ""}</div>`;
}
const CSS = `.rks{font-family:'Inter',Arial,sans-serif;color:#1E2340;}
.rks-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#1E2340,#33406B);color:#fff;margin:0 0 12px;}
.rks .rks-head h2{margin:2px 0 !important;font:800 26px 'Fraunces',Georgia,serif !important;color:#fff !important;} .rks .rks-head .rks-k{margin:0 !important;font-size:12px !important;letter-spacing:.08em;text-transform:uppercase;color:#F6C08F !important;font-weight:800 !important;}
.rks .rks-head .rks-sub{margin:2px 0 0 !important;color:#E8ECF7 !important;font-size:15px !important;} .rks .rks-head .rks-sub b{color:#fff !important;} .rks .rks-head .rks-legend span{color:#fff !important;}
.rks-legend{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:12.5px;} .rks-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:4px;vertical-align:-1px;} .rks-legend small{color:#C9D1E8;}
.rks-tbl{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;} .rks-tbl th{background:#F1F3F9;color:#1E2340;font-weight:800;padding:8px 6px;text-align:center;border-bottom:2px solid #DB8437;font-size:16px;}
.rks-tbl th small{font-size:11px;font-weight:700;color:#5F6368;} .rks-tbl td{padding:7px 6px;text-align:center;border-bottom:1px solid #E7EAF1;} .rks-tbl .rks-name{text-align:left;} .rks-rank{font-weight:800;font-size:16px;color:#DB8437;}
.rks-chip{display:inline-block;min-width:38px;padding:3px 7px;border-radius:8px;font-weight:800;font-size:13.5px;} .rks-lbl{color:#5F6368;}
.rks-ex{background:#D7F0DE;color:#14532D;} .rks-gd{background:#E3EEFB;color:#1E3A8A;} .rks-ok{background:#FFF1D6;color:#8A4A00;} .rks-lo{background:#FDE2E1;color:#9B1C1C;} .rks-na{background:#F1F3F4;color:#80868B;}
.rks-legend .rks-ex,.rks-legend .rks-gd,.rks-legend .rks-ok,.rks-legend .rks-lo{border:1px solid #fff;}
.rks-card{border:1px solid #E1E5EE;border-radius:12px;padding:12px 14px;margin:0 0 12px;background:#fff;break-inside:avoid;}
.rks-card-h{display:flex;align-items:center;gap:10px;font-size:18px;margin:0 0 4px;} .rks-rk{font-weight:800;color:#DB8437;} .rks-ov{margin-left:auto;font-size:13.5px;color:#5F6368;}
.rks-ovc{margin:2px 0 8px;font-style:italic;color:#3C4043;}
.rks-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;} .rks-comp{background:#F8F9FC;border-radius:10px;padding:9px 11px;}
.rks-comp-h{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:14px;} .rks-comp p{margin:6px 0 0;font-size:14px;line-height:1.5;}
.rks-bar{display:block;height:6px;border-radius:4px;background:#E7EAF1;margin:6px 0 0;overflow:hidden;} .rks-bar i{display:block;height:100%;}
.rks-fb{margin:10px 0 0;padding:9px 11px;border-left:4px solid #DB8437;background:#FFF8EF;border-radius:8px;font-size:14px;} .rks-fb p{margin:4px 0 0;line-height:1.5;}
.rks textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13.5px;margin-top:6px;padding:6px 8px;border:1px solid #C9D1E0;border-radius:8px;} .rks input[type=number]{width:64px;font:inherit;padding:2px 4px;}
.rks-foot{color:#80868B;font-size:12px;margin:6px 0 0;}
.rks-bar-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px;} .rks-bar-acts .rks-note{color:#5F6368;font-size:13px;}`;

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
    return `<div class="rks-wrap"><div class="rks-bar-acts"><select aria-label="Week" onchange="FTRanking.week(this.value)">${[1, 2, 3, 4, 5, 6].map(w => `<option value="${w}" ${Number(w) === Number(c.week) ? "selected" : ""}>Week ${w}</option>`).join("")}</select><button class="btn btn-navy btn-sm" ${S.busy ? "disabled" : ""} onclick="FTRankSummary.draft()">${S.busy ? "📑 Summarizing the week…" : d ? "🔄 Update from the week's progress" : "📑 Summarize the week for management"}</button>
        ${d ? `<button class="btn btn-ghost btn-sm" onclick="FTRankSummary.toggleEdit()">${S.edit ? "✓ Done editing" : "✎ Edit"}</button><button class="btn btn-ghost btn-sm" onclick="FTRankSummary.word()">⬇ Word</button><button class="btn btn-ghost btn-sm" onclick="FTRankSummary.print()">🖨 Print</button>` : ""}
        <span class="rks-note">Each trainee's week: seven competencies scored out of 5 with a summarized comment, and the trainer's feedback.</span></div>
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
  async set(id, what, k, v){
    const r = ((S.data || {}).rows || {})[id]; if(!r) return; r.edited = true;
    if(what === "score"){ const n = v === "" ? null : Math.max(0, Math.min(5, Number(v))); r.scores[k] = n == null ? null : r1(n); r.scoresEdited = Object.assign({}, r.scoresEdited, {[k]: r.scores[k]}); }
    else if(what === "comment"){ r.comments[k] = String(v).trim(); r.commentsEdited = Object.assign({}, r.commentsEdited, {[k]: r.comments[k]}); }
    else { r.trainer = String(v).trim(); r.trainerEdited = r.trainer; }
    const c = ctx(); if(await sharedSet(keyOf(c.batch, c.week), S.data) === false) toast("Couldn’t save. Check your connection.");
  },
  doc(){ const c = ctx() || {}; return `<html><head><meta charset="utf-8"><title>Weekly Progress Report · ${e(c.batch)} · Week ${e(c.week)}</title><style>${CSS} body{margin:24px;} .rks-grid{grid-template-columns:1fr 1fr;}</style></head><body>${reportHtml(true)}</body></html>`; },
  word(){ const c = ctx() || {}, blob = new Blob(["﻿", FTRankSummary.doc()], {type: "application/msword"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Weekly Progress Report - ${c.batch} - Week ${c.week}.doc`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); },
  print(){ const w = window.open("", "_blank"); if(!w){ toast("Allow pop-ups to print."); return; } w.document.write(FTRankSummary.doc()); w.document.close(); w.focus(); setTimeout(() => w.print(), 400); },
  data: () => S.data, evidence, COMP
};
(function(){ const s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); })();
})();
