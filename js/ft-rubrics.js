/* ============================================================
   📋 THE TRAINER-FACILITATED ACTIVITIES' SCORECARDS (rubrics)
   ------------------------------------------------------------
   From the Training Guide (v09.18.2026): each mock call and demo is scored on its own metrics, criterion by
   criterion, and the scorecard's WEIGHTED AVERAGE is the result (the mock calls also take a feedback note per
   criterion). Admin → 🧑‍🏫 Trainer Inputs fills these in (js/ft-sessions.js): each criterion 0–5, the weighted
   average out of 5, and the activity's score is that average as a percentage (4.25/5 = 85%), which reaches the
   trainee's Scorecard and ⤓ the 📊 Weekly Ranking. Every criterion weighs 1 unless a weight is set here (`w`).
   Every scorecard ends with 🛠 Tools Utilization (WRITING, below).
   ============================================================ */
(function(root){
"use strict";
const C = (...names) => names.map(n => typeof n === "string" ? {n, w: 1} : n);
const R = {
  reception: {title: "Reception Mock Call", acts: ["reception-live"], feedback: true, criteria: C(
    "Introduction of Law Firm and Name", "Authentication (Name, DOL, DOB, Claim No, Case No.)", "Customer Service", "Assertiveness",
    "Listening Skills", "Comprehension", "Attention to Details", "Resolution", "Transfer Procedure", "Closing Spiel", "Time Management",
    "Dead Air/Fillers", "Clarity of Speech (Articulation, Volume, Enunciation)", "Tone of Voice")},
  calendar: {title: "Calendar Management Mock Call", acts: ["calendar-live"], feedback: true, criteria: C(
    "Professional Introduction & Call Control", "Client Comprehension & Flow Control", "Information Verification & Accuracy",
    "Slot Identification & Scheduling Rule Compliance", "Alternative Time Offering", "Calendar Creation & Attorney Reminder Setup", "Notes, Recap & Call Closing")},
  intake: {title: "Intake Mock Call", acts: ["intake-live"], feedback: true, criteria: C(
    "Introduction of Law Firm and Name", "Authentication (Name, DOL, DOB, Claim No, Case No.)", "Customer Service", "Assertiveness",
    "Listening Skills", "Comprehension", "Attention to Details", "Setting Proper Expectations", "Explaining the Process", "Answering Client's Inquiries",
    "Commitment", "Closing Spiel", "Time Management", "Dead Air/Fillers", "Clarity of Speech (Articulation, Volume, Enunciation)", "Tone of Voice")},
  "intake-packet": {title: "Saving Intake Packet and Extracted Intake Documents to SA", acts: ["intake-packet-demo"], criteria: C(
    "Task Preparation & Familiarity", "Smart Advocate Navigation", "Document Handling (Extraction, Renaming & Organization)", "Document Properties Accuracy",
    "Uploading Files to SA", "Task Reporting & Notes Documentation", "Attention to Detail", "Time Management & Efficiency")},
  lor: {title: "Saving LORs to SA and Sending to 1P & 3P Insurance Companies", acts: ["lor-demo"], criteria: C(
    "Task Preparation & Familiarity", "Smart Advocate Navigation", "Insurance Review, Adjuster Information & Claim/Policy Number Accuracy",
    "Document Uploading & File Handling in SA", "Document Properties & Naming Convention Accuracy",
    // (the guide's 6th metric, restored in its place: the scorecards saved without it are moved over one row as they are read — upgrade, below)
    "Task Reporting, Hyperlinking & Task Attachment", "Email/Fax Sending Accuracy & SOP Compliance",
    // (the guide's "Attention to Detail" row is merged into "Attention to Detail, Verification & Efficiency": it keeps its place,
    // retired, so the scores saved before keep their rows — a retired criterion is not shown, scored or averaged)
    {n: "Attention to Detail", w: 1, retired: true}, "Attention to Detail, Verification & Efficiency")},
  medlor: {title: "MedLOR Demonstration", acts: ["medlor-demo"], time: "The ideal time for the demo is 1 hour and 45 minutes; any time beyond it is a deduction under Time Management & Efficiency.", criteria: C(
    "Task Preparation & Familiarity", "Contact Card Navigation", "Document Drafting & Editing", "Uploading Files to SA", "Task Reporting & Notes Documentation",
    "Email Drafting", "Time Management & Efficiency")},
  // Day 15's recorded demonstration: scored on its own scorecard, so it doesn't overwrite Day 14's MedLOR Demo (the same criteria)
  "medlor-recorded": {title: "MedLOR Recorded Demonstration", acts: ["medlor-recorded-demo"], time: "The ideal time for the demo is 1 hour and 45 minutes; any time beyond it is a deduction under Time Management & Efficiency.", criteria: C(
    "Task Preparation & Familiarity", "Contact Card Navigation", "Document Drafting & Editing", "Uploading Files to SA", "Task Reporting & Notes Documentation",
    "Email Drafting", "Time Management & Efficiency")},
  lv: {title: "LV Demonstration", acts: ["lv-demo"], time: "The ideal completion time is 45 minutes; going beyond it is a significant deduction under Time Management & Efficiency.", criteria: C(
    "Task Preparation & Familiarity", "Contact Card Navigation", "Document Drafting & Editing", "Uploading Files to SA", "Task Reporting & Notes Documentation",
    "Email Drafting", "Time Management & Efficiency")},
  // Day 9's Transcription Activity (js/ft-transcribe.js): the minutes of Atty. Magdalena's client interviews, scored against
  // the PI sample guide's minutes (js/ft-intake-samples.js); accuracy and completeness weigh double
  transcription: {title: "Transcription Activity (Minutes of the Meeting)", acts: ["transcription-1", "transcription-2"],
    time: "The ideal time is about three times the recording's length; going far beyond it is a deduction under Time Management", criteria: C(
    {n: "Accuracy (names, dates, amounts, places exactly as said)", w: 2}, {n: "Completeness (every point discussed, in order)", w: 2},
    "Speaker Attribution (A for Attorney, C for Client)", "Minutes Format (date, time, attendees, purpose, discussion)", "Timestamps at Each New Point",
    "Client's Concerns & Attorney's Advice Captured", "Action Items & Next Steps (who does what, by when)", "Grammar, Spelling & Professional Wording",
    "Naming Convention & Filing (Assessments/Activities)", "Report-Back to the Attorney", "Time Management")},
  settlement: {title: "Reduction / Closing & Settlement Demo", acts: ["settlement-demo"], criteria: C(
    "Task Preparation, Independence & Process Understanding", "Calculation & Excel Proficiency", "Analytical & Decision-Making Skills",
    "Attention to Detail & Accuracy", "Adherence to Instructions", "Independent Execution & Organization", "Communication & Process Explanation",
    "Drafting (Reduction Letter, Closing Statement & Email)")}
};
// 🛠 Tools Utilization was the last criterion of every scorecard (the Transcription Activity keeps its own "Grammar, Spelling &
// Professional Wording" instead). No Training Guide metrics table has it, so it is retired: its slot stays (the scores saved
// before keep their rows), but it is not shown, scored or averaged.
const WRITING = "Tools Utilization";
Object.keys(R).forEach(k => { if(!R[k].criteria.some(c => /grammar|spelling/i.test(c.n))) R[k].criteria.push({n: WRITING, w: 1, retired: true}); });
const writingIndex = rb => (rb && rb.criteria || []).findIndex(c => /grammar|spelling/i.test(c.n));
// an activity's rubric: the one it names (`rubric` in Trainer Inputs' list), else the one listing its id, else by its title
const BY_TITLE = [[/reception.*mock|mock.*reception/i, "reception"], [/calendar.*mock|mock.*calendar/i, "calendar"], [/intake.*mock|mock.*intake/i, "intake"],
  [/intake packet/i, "intake-packet"], [/\bLOR\b.*(upload|send|saving)|saving LORs/i, "lor"], [/medlor.*recorded|recorded.*medlor/i, "medlor-recorded"], [/medlor/i, "medlor"], [/\bLV\b|lien verification/i, "lv"],
  [/reduction|closing statement|settlement/i, "settlement"], [/transcription/i, "transcription"]];
function forAct(a){
  if(!a) return null;
  if(a.rubric) return R[a.rubric] ? Object.assign({key: a.rubric}, R[a.rubric]) : null;
  let k = Object.keys(R).find(x => R[x].acts.includes(a.id));
  if(!k){ const m = BY_TITLE.find(([re]) => re.test(String(a.title || ""))); k = m && m[1]; }
  return k ? Object.assign({key: k}, R[k]) : null;
}
// the weighted average out of 5 of the criteria scored (null when none is)
function average(rubric, scores){
  let sum = 0, w = 0;
  (rubric.criteria || []).forEach((c, i) => { const v = parseFloat((scores || [])[i]); if(!c.retired && isFinite(v)){ sum += Math.max(0, Math.min(5, v)) * (c.w || 1); w += c.w || 1; } });
  return w ? sum / w : null;
}
/* ✅ a mock call's or demo's result, from its record (labreview:<id>.acts[<activity>]): Passed at 3/5 (60%) or more, Failed
   below — worked out from the score, so it counts on the scorecards as soon as it is graded — unless the trainer asked for a
   Redo (redo: true), which keeps it off the scorecards until it is done again. "Not yet" before any score. (A record saved
   before Redo became the trainer's own choice, with "Redo" set by a low score, reads as Failed.) */
const PASS_PCT = 60;
function result(c){
  if(!c) return "Not yet";
  if(c.redo === true) return "Redo";
  const n = c.score == null || c.score === "" ? NaN : Number(c.score);
  if(isFinite(n)) return n >= PASS_PCT ? "Passed" : "Failed";
  return c.status === "Passed" ? "Passed" : "Not yet";
}
/* ↪ a scorecard saved before a criterion was put back in the middle of it (the Saving LORs scorecard's 6th metric, "Task Reporting,
   Hyperlinking & Task Attachment", at row 5): its scores and feedback are by row, so the ones from that row on move down one,
   leaving the new row empty. A card is from before when it has fewer rows than the scorecard has now (Tools Utilization, last,
   is always saved). Moved once (rows marks it); applied to every labreview: record as it is read (index.html sharedGet*) and to any act here. */
const INSERTED = {lor: {at: 5, slots: 10}};
function upgradeAct(c){
  const r = c && c.rubric, ins = r && INSERTED[r.key];
  if(!ins || !Array.isArray(r.scores) || r.scores.length >= ins.slots || r.scores.length <= ins.at || r.rows === ins.slots) return c;
  r.scores.splice(ins.at, 0, null);
  if(Array.isArray(r.feedback) && r.feedback.length > ins.at) r.feedback.splice(ins.at, 0, "");
  r.rows = ins.slots;   // (moved: never again, even for a card shorter than the scorecard by more than one row)
  return c;
}
function upgrade(rec){
  if(rec && typeof rec === "object") ["acts", "sessions"].forEach(k => { const m = rec[k]; if(m && typeof m === "object") Object.values(m).forEach(upgradeAct); });
  return rec;
}
// a saved scorecard's score, worked out again from its criteria (retired ones left out: Tools Utilization), so a card saved with
// them reads as the guide scores it; a score the trainer typed (scoreEdited) or one with no criteria stays as it was saved
function rubricOf(r){ upgradeAct(r); const k = r && r.rubric && r.rubric.key; return k && R[k] && Array.isArray(r.rubric.scores) && !r.scoreEdited ? R[k] : null; }
function avg5Of(r){ const rb = rubricOf(r); if(!rb) return r && r.rubric && r.rubric.avg != null ? Number(r.rubric.avg) : null; const a = average(rb, r.rubric.scores); return a == null ? null : Math.round(a * 100) / 100; }
function scoreOf(r){ if(!r) return null; const a = rubricOf(r) ? avg5Of(r) : null;
  if(a != null) return Math.round(a / 5 * 100);
  return r.score == null || r.score === "" || !isFinite(Number(r.score)) ? null : Number(r.score); }
root.ftResult = c => c && rubricOf(c) ? result(Object.assign({}, c, {score: scoreOf(c)})) : result(c);
root.FT_RUBRICS = {list: R, forAct, average, writingIndex, WRITING, result: root.ftResult, PASS_PCT, scoreOf, avg5Of, upgrade, upgradeAct, keys: () => Object.keys(R)};
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this));
