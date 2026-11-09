/* ============================================================
   🎧 THE TRANSCRIPTION ACTIVITY'S RULES (the minutes of Atty. Magdalena's client interviews, js/ft-transcribe.js)
   ------------------------------------------------------------
   Shared by the page and the Worker (worker.js /api/transcribe/grade), so the checks a trainee sees while typing are the
   ones the automatic score is worked out from:
     checks(run, n, first)      the 7 checks, [{id, label, ok, detail}]
     autoScores(run, n, rows)   the scorecard's criteria these checks can score (js/ft-rubrics.js transcription, in its
                                order), each 0–5 in half points; null where the AI or the trainer scores it
   No imports: loaded as a plain script before js/ft-transcribe.js, and imported by the Worker.
   ============================================================ */
(function(root){
"use strict";
const ATTY = "Atty. Magdalena";
// the two recordings, with their length in seconds (the Time Management criterion: about 3× the recording is ideal)
const RECS = {1: {title: "Interview Recording 1", secs: 337}, 2: {title: "Interview Recording 2", secs: 282}};
// the minutes, in the order the document runs: [key, label, input type, placeholder]
const FIELDS = [
  ["date", "Date of the meeting", "date"], ["time", "Time", "text", "e.g. 10:00 AM – 10:40 AM (PST)"],
  ["attendees", "Attendees", "text", `${ATTY}; the client (full name as said on the recording)`],
  ["purpose", "Purpose of the meeting", "text", "e.g. Initial consultation on the client’s car accident"],
  ["discussion", "Discussion — what was said, in order", "area", "Type what was discussed, in order. Put a [mm:ss] timestamp at each new point (Alt+T)."],
  ["concerns", "The client’s concerns and questions", "area", "What the client worried about or asked"],
  ["advice", "The attorney’s advice and answers", "area", "What the attorney explained or advised"],
  ["actions", "Action items and next steps (one per line: who does what, by when)", "area", "e.g. Client to send the police report by Friday"]
];
const has = v => String(v == null ? "" : v).trim().length > 0;
const words = s => (String(s || "").trim().match(/\S+/g) || []).length;
const stamps = s => (String(s || "").match(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g) || []).length;
const isDriveLink = u => /^https:\/\/(drive|docs)\.google\.com\//.test(String(u || "").trim());
const fileWant = (n, first) => `Transcription - Recording ${n} (${first || "VA’s first name"})`;
// (the report back's four parts: a greeting, what is done, where it is, a thank-you)
const reportParts = rep => [/\b(hi|hello|good (morning|afternoon|day|evening)|dear)\b/i.test(rep), /minutes|transcri/i.test(rep),
  isDriveLink((rep.match(/https?:\/\/\S+/) || [""])[0]) || /assessments|folder|drive/i.test(rep), /thank|regards/i.test(rep)];

function checks(run, n, first){
  const r = run || {}, f = r.f || {};
  const filled = FIELDS.filter(([k]) => has(f[k])).length;
  const acts = String(f.actions || "").split("\n").filter(x => x.trim().length > 3).length;
  const fn = String(first || "").toLowerCase(), file = String(r.file || "").trim();
  const rp = reportParts(String(r.report || ""));
  return [
    {id: "filled", label: "Every part of the minutes filled in", ok: filled === FIELDS.length, detail: `${filled} of ${FIELDS.length}`, n: filled},
    {id: "words", label: "The discussion in detail (200 words or more)", ok: words(f.discussion) >= 200, detail: `${words(f.discussion)} words`, n: words(f.discussion)},
    {id: "stamps", label: "Timestamps at the points discussed (3 or more)", ok: stamps(f.discussion) >= 3, detail: `${stamps(f.discussion)} timestamps`, n: stamps(f.discussion)},
    {id: "actions", label: "Action items, one per line (2 or more)", ok: acts >= 2, detail: `${acts}`, n: acts},
    {id: "file", label: "The file named by the convention", ok: new RegExp(`^Transcription - Recording ${n} \\([^()]+\\)$`).test(file) && (!fn || file.toLowerCase().includes("(" + fn + ")")), detail: fileWant(n, first)},
    {id: "link", label: "Filed in your Assessments/Activities folder (its Drive link)", ok: isDriveLink(r.link), detail: ""},
    {id: "report", label: "Reported back to the attorney: greeting, what’s done, where it is, thanks", ok: rp.every(Boolean), detail: "", n: rp.filter(Boolean).length}
  ];
}

const half = v => Math.round(v * 2) / 2;
// the minutes it took, from ▶ start to 📤 submit (null before both)
const minutesOf = r => { const a = Date.parse((r || {}).startedAt), b = Date.parse((r || {}).submittedAt); return isFinite(a) && isFinite(b) && b >= a ? Math.max(1, Math.round((b - a) / 60000)) : null; };
function autoScores(run, n, rows){
  const r = run || {}, by = {}; (rows || checks(r, n, "")).forEach(x => { by[x.id] = x; });
  const s = Array(11).fill(null), notes = Array(11).fill("");
  s[3] = half(by.filled.n / FIELDS.length * 5); notes[3] = `${by.filled.detail} parts of the minutes filled in.`;
  s[4] = half(Math.min(1, by.stamps.n / 3) * 5); notes[4] = `${by.stamps.detail} in the discussion (3 or more expected).`;
  s[6] = by.actions.n >= 2 ? 5 : by.actions.n === 1 ? 2.5 : 0; notes[6] = `${by.actions.n} action item line${by.actions.n === 1 ? "" : "s"} (2 or more expected).`;
  s[8] = (by.file.ok ? 2.5 : 0) + (by.link.ok ? 2.5 : 0);
  notes[8] = `${by.file.ok ? "File named by the convention" : "File not named " + by.file.detail}; ${by.link.ok ? "its Drive link given" : "no Drive link to the Assessments/Activities folder"}.`;
  s[9] = [0, 1, 2.5, 4, 5][by.report.n]; notes[9] = `${by.report.n} of 4 parts of the report back (greeting, what is done, where it is, thanks).`;
  // (about 3× the recording is ideal: 4× 4, 5× 3, 6× 2, longer 1)
  const min = minutesOf(r), secs = (RECS[n] || {}).secs;
  if(min != null && secs){ const x = min * 60 / secs; s[10] = x <= 3 ? 5 : x <= 4 ? 4 : x <= 5 ? 3 : x <= 6 ? 2 : 1;
    notes[10] = `${min} min for a ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} recording (${Math.round(x * 10) / 10}× its length; about 3× is ideal).`; }
  return {scores: s, notes};
}
root.FTMinutesRules = {ATTY, RECS, FIELDS, words, stamps, isDriveLink, fileWant, checks, autoScores, minutesOf};
})(typeof globalThis !== "undefined" ? globalThis : this);
