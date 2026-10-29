/* ============================================================
   📋 THE TRAINER-FACILITATED ACTIVITIES' SCORECARDS (rubrics)
   ------------------------------------------------------------
   From the Training Guide (v09.18.2026): each mock call and demo is scored on its own metrics, criterion by
   criterion, and the scorecard's WEIGHTED AVERAGE is the result (the mock calls also take a feedback note per
   criterion). Admin → 🧑‍🏫 Trainer Inputs fills these in (js/ft-sessions.js): each criterion 0–5, the weighted
   average out of 5, and the activity's score is that average as a percentage (4.25/5 = 85%), which reaches the
   trainee's Scorecard and ⤓ the 📊 Weekly Ranking. Every criterion weighs 1 unless a weight is set here (`w`).
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
    "Document Uploading & File Handling in SA", "Document Properties & Naming Convention Accuracy", "Email/Fax Sending Accuracy & SOP Compliance",
    "Attention to Detail", "Attention to Detail, Verification & Efficiency")},
  medlor: {title: "MedLOR Demonstration", acts: ["medlor-demo"], time: "The ideal time for the demo is 1 hour and 45 minutes; any time beyond it is a deduction under Time Management & Efficiency.", criteria: C(
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
// an activity's rubric: the one it names (`rubric` in Trainer Inputs' list), else the one listing its id, else by its title
const BY_TITLE = [[/reception.*mock|mock.*reception/i, "reception"], [/calendar.*mock|mock.*calendar/i, "calendar"], [/intake.*mock|mock.*intake/i, "intake"],
  [/intake packet/i, "intake-packet"], [/\bLOR\b.*(upload|send|saving)|saving LORs/i, "lor"], [/medlor/i, "medlor"], [/\bLV\b|lien verification/i, "lv"],
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
  (rubric.criteria || []).forEach((c, i) => { const v = parseFloat((scores || [])[i]); if(isFinite(v)){ sum += Math.max(0, Math.min(5, v)) * (c.w || 1); w += c.w || 1; } });
  return w ? sum / w : null;
}
root.FT_RUBRICS = {list: R, forAct, average, keys: () => Object.keys(R)};
})(typeof window !== "undefined" ? window : this);
