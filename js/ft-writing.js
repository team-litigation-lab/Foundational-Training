/* ============================================================
   ✍️ WRITING SKILLS CHECK (Admin → 🧑‍🏫 Trainer Inputs)
   ------------------------------------------------------------
   Every scorecard ends with ✍️ Writing: Grammar, Spelling & Format (js/ft-rubrics.js WRITING; the Transcription
   Activity's own "Grammar, Spelling & Professional Wording"). Under the scorecard, the trainer pastes the trainee's
   written work for the activity (the CMS notes, the recap, the email, the letter, the task report) and presses
   ✍️ Check the writing: the AI lists the grammar, spelling and format problems it finds, word for word, and suggests a
   score out of 5. ⤓ Use this score puts it in the Writing criterion (and the findings in its Remarks, where the
   scorecard has Remarks); the trainer can change it like any other score. Nothing is saved until the trainer saves.
   The Transcription Activity's minutes are on the platform (transcribe:<id>), so they are filled in for the trainer, and
   the Worker checks their writing when the trainee submits (trackerreview:<id>.transcribe[n].writing): that result is shown
   here with no paste and no click, on Trainer Inputs and on 🧑‍🏫 Graders (where ⤓ fills its scoresheet).
   Chained after js/ft-calrules.js's ftRubricAssist (the booking rule check), which keeps working.
   ============================================================ */
(function(){
"use strict";
const e = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const W = {text: {}, out: {}, busy: false, minutes: {}};
const keyOf = (r, a) => r.id + "|" + a.id;

// the Transcription Activity's minutes, as the trainee typed them (transcribe:<id>, recording 1 or 2)
const LABELS = [["date", "Date"], ["time", "Time"], ["attendees", "Attendees"], ["purpose", "Purpose"], ["discussion", "Discussion"],
  ["concerns", "Client's concerns"], ["advice", "Attorney's advice"], ["actions", "Action items"]];
function minutesOf(r, a){
  const m = /transcription-(\d)/.exec(String(a.id || "")); if(!m) return null;
  const k = r.id + "|" + m[1];
  if(W.minutes[k] === undefined){
    W.minutes[k] = null;
    sharedGet("transcribe:" + r.id).then(v => {
      const run = v && v.r && v.r[m[1]], f = (run && run.f) || {};
      const body = LABELS.filter(([id]) => String(f[id] || "").trim()).map(([id, l]) => `${l}: ${String(f[id]).trim()}`).join("\n\n");
      W.minutes[k] = [body, run && run.report ? `Report to the attorney: ${String(run.report).trim()}` : ""].filter(Boolean).join("\n\n");
      if(!W.text[keyOf(r, a)] && W.minutes[k]){ W.text[keyOf(r, a)] = W.minutes[k]; if(state.view === "admin") render(); }
    }).catch(() => { W.minutes[k] = ""; });
  }
  return W.minutes[k];
}

// 🎧 the Transcription Activity's writing check, done by the Worker when the trainee submitted (worker.js gradeTranscription:
// trackerreview:<id>.transcribe[n].writing): Trainer Inputs' row has it (r.tr), 🧑‍🏫 Graders its own (FTMockScores.autoOf)
function storedOf(r, a){
  const m = /^transcription-([12])$/.exec(String(a.id || "")); if(!m) return null;
  const g = (((r.tr || {}).transcribe) || {})[m[1]] || (window.FTMockScores && FTMockScores.autoOf ? FTMockScores.autoOf(r.id, a.id) : null);
  return g && g.writing && g.writing.score != null ? Object.assign({stored: g.at}, g.writing) : null;
}
function assist(r, a){
  const rb = window.FT_RUBRICS && FT_RUBRICS.forAct(a); if(!rb) return "";
  const wi = FT_RUBRICS.writingIndex(rb); if(wi < 0) return "";
  const k = keyOf(r, a); minutesOf(r, a);
  if(!W.out[k]){ const st = storedOf(r, a); if(st) W.out[k] = st; }
  const out = W.out[k];
  const list = (h, xs) => xs && xs.length ? `<div class="wr-list"><b>${h}</b><ul>${xs.map(x => `<li>${e(x)}</li>`).join("")}</ul></div>` : "";
  return `<div class="fss-wide wr-assist" data-wr-key="${e(k)}" data-wr-crit="${wi}">
    <b>✍️ Writing skills: ${e(rb.criteria[wi].n)}</b>
    <p class="fss-muted">Paste what the trainee wrote for this activity (the CMS notes, the recap, the email, the letter, the task report)${/transcription/.test(rb.key) ? " — their minutes are filled in from the Transcription Activity" : ""}. The check finds grammar, spelling and format problems and suggests a score; you decide the score.</p>
    <textarea rows="5" class="wr-text" placeholder="The trainee’s written work" oninput="FTWriting.keep(this)">${e(W.text[k] || "")}</textarea>
    <div class="wr-act"><button class="btn btn-ghost btn-sm" type="button" onclick="FTWriting.check(this)" ${W.busy ? "disabled" : ""}>${W.busy ? "Checking…" : "✍️ Check the writing"}</button></div>
    ${out ? `<div class="wr-out"><p><b>Suggested: ${e(out.score)}/5</b>${out.summary ? ` · ${e(out.summary)}` : ""}</p>
      ${out.stored ? `<p class="fss-muted">🤖 Checked automatically when the trainee submitted (${e(new Date(out.stored).toLocaleString())}).</p>` : ""}
      ${list("Grammar", out.grammar)}${list("Spelling", out.spelling)}${list("Format", out.format)}
      ${!(out.grammar || []).length && !(out.spelling || []).length && !(out.format || []).length ? `<p class="fss-muted">No problems found.</p>` : ""}
      <button class="btn btn-navy btn-sm" type="button" onclick="FTWriting.use(this)">⤓ Use this score (${e(out.score)}/5)</button></div>` : ""}
  </div>`;
}

const clamp = v => { const n = Math.round(Number(v) * 2) / 2; return isFinite(n) ? Math.max(0, Math.min(5, n)) : null; };
const strs = x => (Array.isArray(x) ? x : []).map(s => String(s || "").trim()).filter(Boolean).slice(0, 12).map(s => s.slice(0, 240));

window.FTWriting = {
  keep(ta){ const box = ta.closest(".wr-assist"); W.text[box.getAttribute("data-wr-key")] = ta.value; },
  async check(btn){
    const box = btn.closest(".wr-assist"), k = box.getAttribute("data-wr-key"), text = String(box.querySelector(".wr-text").value || "").trim();
    W.text[k] = text;
    if(text.split(/\s+/).length < 5){ toast("Paste the trainee’s written work first (a few sentences at least)."); return; }
    const [, aid] = k.split("|"), form = btn.closest(".fss-cellform"), title = form ? (form.querySelector("b") || {}).textContent || "" : "";
    W.busy = true; btn.disabled = true; btn.textContent = "Checking…";
    try{
      const prompt = `You check the writing of a trainee Legal Virtual Assistant at a US personal injury law firm. The text below is what the trainee wrote for a training activity (${title.split("·").pop().trim() || aid}): notes in the case management system, a call recap, an email, a letter, a task report or meeting minutes.

Check three things and list each problem you find, quoting the trainee's words and giving the correction ("teh client" → "the client"):
1. GRAMMAR: agreement, tense, sentence fragments and run-ons, punctuation, capitalization.
2. SPELLING: misspelled words and legal or insurance terms (e.g. "HIPPA" → "HIPAA", "retainer", "adjuster", "subrogation"). US spelling.
3. FORMAT: the layout a law firm expects for this kind of writing: a greeting, body and sign-off for an email or letter; date, time, attendees, purpose and discussion for minutes; short, clear, dated notes; consistent dates (MM/DD/YYYY), times, names and capitals; no slang, text-speak or emojis; professional tone.
Do not invent problems. Shorthand that is standard in case notes (DOL, DOB, PI, MVA, LOR, 1P, 3P, SA) is fine.

Score the writing out of 5, in half points: 5 = no errors, professional; 4 = one or two minor slips; 3 = several errors but clear; 2 = frequent errors or poor format that a client or adjuster would notice; 1 = hard to read; 0 = nothing usable.

TRAINEE'S TEXT:
"""
${text.slice(0, 8000)}
"""

Return ONLY JSON: {"score": number, "grammar": ["..."], "spelling": ["..."], "format": ["..."], "summary": "one sentence"}`;
      const out = await callAIJson(prompt, 1200, undefined, "grading");
      const sc = clamp(out && out.score);
      if(sc == null) throw new Error("no score");
      W.out[k] = {score: sc, grammar: strs(out.grammar), spelling: strs(out.spelling), format: strs(out.format), summary: String((out && out.summary) || "").trim().slice(0, 300)};
    }catch(err){ toast("The writing check isn’t available right now. Score the Writing criterion yourself."); }
    W.busy = false;
    if(state.view === "admin") render();
  },
  // the suggested score into the Writing criterion (and the findings into its Remarks): the trainer can still change both
  use(btn){
    const box = btn.closest(".wr-assist"), k = box.getAttribute("data-wr-key"), i = box.getAttribute("data-wr-crit"), out = W.out[k];
    const n = out ? out.grammar.length + out.spelling.length + out.format.length : 0;
    const note = out ? (n ? `${n} writing issue${n === 1 ? "" : "s"}: ` + [...out.spelling, ...out.grammar, ...out.format].slice(0, 3).join("; ") : "Clean, professional writing").slice(0, 600) : "";
    // (🧑‍🏫 Graders: into its scoresheet, where the criterion is still empty)
    if(out && btn.closest(".fms") && window.FTMockScores && FTMockScores.fillCrit){
      const got = FTMockScores.fillCrit({[i]: out.score}, {[i]: note});
      toast(got ? `⤓ Writing scored ${out.score}/5. Change it if you see it differently, then Save.` : "The writing criterion already has a score: change it in the scoresheet.");
      return;
    }
    const form = btn.closest(".fss-cellform"), inp = form && form.querySelector(`[data-rubric] [data-crit="${i}"]`);
    if(!out || !inp) return;
    inp.value = out.score;
    const fb = form.querySelector(`[data-rubric] [data-fb="${i}"]`);
    if(fb) fb.value = note;
    if(window.FTInputs) FTInputs.calc(inp);
    toast(`⤓ Writing scored ${out.score}/5. Change it if you see it differently, then Save.`);
  },
  state: () => W
};

const prev = window.ftRubricAssist;
window.ftRubricAssist = (r, a) => (typeof prev === "function" ? prev(r, a) : "") + assist(r, a);

(function(){ const s = document.createElement("style"); s.id = "ft-writing"; s.textContent = `
.wr-assist{margin:6px 0 10px;padding:12px 14px;border:1.5px solid #9CA3BD;border-radius:10px;background:#F7F8FC;color:#141A2E;}
.wr-assist .wr-text{width:100%;box-sizing:border-box;margin:6px 0;font:500 14px/1.45 'Inter',system-ui,sans-serif;padding:8px 10px;border:1.5px solid #9CA3BD;border-radius:8px;}
.wr-assist .wr-out{margin-top:8px;padding:10px 12px;background:#fff;border-radius:8px;border:1px solid #DCE0EC;}
.wr-assist .wr-list ul{margin:4px 0 8px 18px;padding:0;} .wr-assist .wr-list li{margin:2px 0;font-size:14px;}
`; document.head.appendChild(s); })();
})();
