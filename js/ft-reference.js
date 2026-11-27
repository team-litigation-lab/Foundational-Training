/* ============================================================
   📎 ADDITIONAL REFERENCE: what the Training Guide grades, and what it doesn't
   ------------------------------------------------------------
   Everything follows the Training Guide (trainer/curriculum.json). It grades only:
     · the Day 2 assessments (Common Terms Used, Auto Liability Insurance) and Day 11's Policy Disclosure, Claim & Liability
       Evaluation, each against its answer key;
     · the trainer's mock-call and demo scorecards (Reception, Calendar Management, Intake mock calls; Intake Packet, LOR,
       MedLOR, MedLOR recorded, LV and Settlement demos), on the guide's metrics only (js/ft-rubrics.js).
   Everything else the platform shows — the Knowledge Checks and Reading Task, the breakout worksheets, the typing and
   spelling tests, the Monitoring Sheet and Task Tracker, daily compliance, the practice tools and simulators, the Intake
   Worksheet and Attorney Calendar activity, PD&P, Eagerness to Learn, Practice Lab Utilization, the Weekly Ranking weeks,
   the overall, overrides and added points — is 📎 Additional Reference: still shown, with its feedback, but with no score
   and counted in no average, overall, ranking or gate. Nothing saved is changed: this only decides what is counted.
   ============================================================ */
(function(root){
"use strict";
const LABEL = "📎 Not scored";
// the trainer's scorecards the guide scores, by scorecard (not activity), so a renamed or added activity follows its scorecard
const SCORED_RUBRICS = ["reception", "calendar", "intake", "intake-packet", "lor", "medlor", "medlor-recorded", "lv", "settlement"];
// the assessments the guide scores (js/ft-assess.js): Common Terms Used, Auto Liability Insurance, Policy Disclosure
const SCORED_ASSESS = ["14sz5f3HTQKmryc7Upvlc6qua008rPnmw", "11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C", "policy-disclosure", "intakews"];
// (and, as the training team asked, two activities the trainer grades with no scorecard: Day 5's Attorney Calendar Management
// Activity — the Portal's Calendaring Activity score, wired into 🧑‍🏫 Graders — and Day 8's Intake Worksheet)
const SCORED_ACTS = ["atty-calendar-activity", "intake-worksheet"];
const RUB = () => root.FT_RUBRICS || null;
const actsList = () => (root.FTSessions && typeof FTSessions.acts === "function" ? FTSessions.acts() : null) || [];
function actScored(a){
  if(!a) return false;
  if(typeof a === "string") a = actsList().find(x => x.id === a) || {id: a};
  if(SCORED_ACTS.includes(a.id)) return true;
  const rb = RUB() ? RUB().forAct(a) : null;
  return !!(rb && SCORED_RUBRICS.includes(rb.key));
}
const assessScored = doc => SCORED_ASSESS.includes(String(doc || ""));
// a Scorecard item (js/lsh-program.js compute): scored only when the guide scores it
function scored(it, s){
  const ref = String((it && it.ref) || ""), sid = s && s.id;
  if(!it || it.auto) return false;
  if(sid === "trainer" && /^act:/.test(ref)) return SCORED_ACTS.includes(ref.slice(4)) || (it.rubric ? SCORED_RUBRICS.includes(it.rubric) : actScored(ref.slice(4)));
  if(sid === "drive" && /^assess:/.test(ref)) return assessScored(ref.slice(7));
  return false;
}
// a lesson is finished once its Knowledge Check is submitted or graded, whatever its mark (no 70% gate: the guide grades none)
const lessonDone = p => !!p && (p.done === true || typeof p.score === "number" || typeof p.trainerScore === "number" || !!p.submittedAt);
// a Weekly Ranking column (js/ft-ranking.js): scored only when it reads a scored scorecard or assessment
// (a column the trainer types in, with no platform source, is the trainer's own score: counted)
function refCol(c){
  const src = String((c && c.src) || "");
  if(!src) return false;
  if(/^trainer:/.test(src) || src === "drive:") return false;
  if(/^drive:/.test(src)) return !/common terms|auto liability|policy disclosure|claim (and|&) liability/i.test(src);
  return true;
}
root.ftReference = {LABEL, SCORED_RUBRICS, SCORED_ASSESS, SCORED_ACTS, actScored, assessScored, scored, lessonDone, refCol,
  pill: () => `<span class="ft-ref-pill">${LABEL}</span>`};
if(typeof document !== "undefined" && !document.getElementById("ft-reference")){ const st = document.createElement("style"); st.id = "ft-reference";
  st.textContent = `.ft-ref-pill{display:inline-block;padding:2px 9px;border-radius:999px;background:#eef1f7;color:#3c4268;font-weight:800;font-size:12px;white-space:nowrap;}`;
  (document.head || document.documentElement).appendChild(st); }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
