/* ============================================================
   LSH Daily Task Tracker — shared rules
   Used by the platform page (js/ft-tracker.js: live flags while the
   trainee types) and by worker.js (the automatic daily check). Keep it
   plain JavaScript with no imports so both can load it.
   Add a rule to RULES to extend the daily check; each rule returns
   {pass, pct, detail, flags:[{row, col, msg}]} (or null when it doesn't apply).
   The trainee's tracker is a Google Sheet in their main Google Drive (js/ft-drive.js): fromSheetCsv turns the
   sheet (its CSV export) into the same workbook, so the same rules check it; gradeMonitorText checks the
   Training Progress Monitoring Sheet's text the same way (rule-based, no AI).
   ============================================================ */
(function(root){
  const TZ = "America/Los_Angeles";      // training days follow the firm's time zone
  const STATUSES = ["New", "Pending for >3 days", "Ongoing", "Priority - Ongoing", "Completed"];
  const TASK_TYPES = ["ADMIN", "CALLER", "PB-MEDSUM", "PB-MEDCHRON", "PB-DEMAND", "PB-SUBRO", "PB-LITIGATION", "PB-DOCGEN",
    "PB-AUTOMATION", "LSH-POC", "LSH-HR/LEAD", "LSH-HR/VA", "LSH-HR/CLIENT", "LSH-TRAINING", "LSH-TETTRA", "LSH-FINANCE", "LSH-IT", "LSH-MARKETING"];
  const PERIODS = ["Daily", "Weekly", "Monthly", "Quarterly", "Annually", "Project-based"];
  const NATURES = ["Important and urgent", "Important but not urgent", "Not important but urgent", "Not important and not urgent"];
  const DEADLINES = ["ASAP", "Anytime w/in the day", "Timebound"];
  const SECTIONS = [["completion", "⬇ FOR COMPLETION ⬇"], ["recurring", "⬇ RECURRING ⬇"], ["completed", "⬇ COMPLETED ⬇"]];
  const DEFAULT_CRITERIA =
    "Daily Notes are dated and specific: what was done, the result, and the next step.\n" +
    "Difficulties are named, with what is needed to resolve them.\n" +
    "VA Notes (takeaways) are in complete sentences and show what was learned.\n" +
    "No vague entries such as \"done\", \"ok\" or \"same\".";

  function ptDate(d){
    const p = new Intl.DateTimeFormat("en-CA", {timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(d || new Date());
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    return `${g("year")}-${g("month")}-${g("day")}`;
  }
  function isWeekday(iso){ const d = new Date(iso + "T12:00:00Z").getUTCDay(); return d >= 1 && d <= 5; }
  function fmtDate(iso){
    if(typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";   // (a trainee can write anything into a date cell)
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
  }
  let seq = 0;
  function rid(){ return "r" + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6); }
  function taskRow(section, o){
    return Object.assign({id: rid(), section, dateReceived: "", type: "", details: "", va: "", notes: {}, vaNotes: "", deadline: "", status: "", completedOn: ""}, o || {});
  }

  /* a new trainee's workbook: the sample's tabs, headers and recurring rows */
  function template(firstName, today){
    const va = firstName || "";
    return {
      v: 1,
      createdAt: new Date().toISOString(),
      startDate: today || ptDate(),
      tracker: {
        noteDates: today && isWeekday(today) ? [today] : [],
        rows: [
          taskRow("recurring", {type: "LSH-TRAINING", details: "Typing Test", va, status: "Ongoing"}),
          taskRow("recurring", {type: "LSH-TRAINING", details: "Spelling Test", va, status: "Ongoing"})
        ]
      },
      index: {rows: [
        ["VLF", "Van Law Firm", "NV", "PST", "Personal Injury", "CALLER", "Reception", "Daily", "Important but not urgent", "Anytime w/in the day", ""],
        ["", "", "", "", "Personal Injury", "CALLER", "Intake Specialist", "Daily", "Important and urgent", "ASAP", ""],
        ["", "", "", "", "Personal Injury", "ADMIN", "Client Case Audit", "Monthly", "Important but not urgent", "Timebound", "10 client cases on/before end of month"]
      ]},
      links: {rows: ["WORK CREDENTIALS", "Task Tracker", "CMS / CRM", "Soft Phone", "Communication (Messaging)", "Scheduling",
        "Document/Image Editor", "Storage Medium", "Marketing", "Accounting / Finance", "Records Request", "Mailroom", "E-Signature / Mailing"].map((a) => [a, "", ""])},
      directory: {rows: [
        ["MAIN LINE", "https://legalsupporthelp.com/", "1290 S. Jones Blvd., Las Vegas, NV 89146", "702-690-4044", "N/A", "info@legalsupporthelp.com"],
        ["MAIN LINE", "https://vanlawfirm.com/", "1290 S. Jones Blvd., Las Vegas, NV 89146", "725-900-9000", "702-800-4662", "filing@vanlawfirm.com"],
        ["MAIN LINE", "https://vanlawfirm.com/washington-personal-injury-attorney/", "1615 4th Ave E Olympia, WA 98506", "360-200-0000", "360-208-0248", "filing@vanlawfirm.com"]
      ]},
      timezone: {rows: [["", "", ""]]}
    };
  }

  const has = (v) => String(v == null ? "" : v).trim().length > 0;
  function isTask(r){ return r && (has(r.details) || has(r.type) || has(r.dateReceived)); }
  /* was this task open on day D? (recurring tasks always are) */
  function openOn(r, D){
    if(!isTask(r)) return false;
    if(r.section === "recurring") return true;
    if(has(r.dateReceived) && r.dateReceived > D) return false;
    if(r.section === "completed" || r.status === "Completed"){
      if(!has(r.completedOn)) return false;
      return r.completedOn >= D;
    }
    return true;
  }

  // A tracker whose Daily Notes headings are all far from the day (e.g. December 14, 2022 on a 2026 batch): the template's own
  // sample dates, never changed to the trainee's days. Gives the sentence to tell them, or "".
  function staleDates(cols, D){
    const t = Date.parse(D + "T12:00:00Z"); if(!cols || !cols.length || isNaN(t)) return "";
    if(cols.some((c) => Math.abs(Date.parse(c + "T12:00:00Z") - t) < 183 * 864e5)) return "";
    const s = cols.slice().sort();
    return `Its Daily Notes headings are dated ${fmtDate(s[0])}${s.length > 1 ? " to " + fmtDate(s[s.length - 1]) : ""}: the template's own dates, never changed. Change them to your training days (e.g. ${fmtDate(D)}).`;
  }
  /* 🗂 THE TRACKER CHECKED AS THE TRAINER'S SAMPLE EVALUATION DOES IT: each task in its right section (⬇ FOR COMPLETION ⬇
     genuinely pending or ongoing, ⬇ RECURRING ⬇ the Typing and Spelling Tests and other continuing requirements, ⬇ COMPLETED ⬇
     finished with accurate dates and statuses), every completed task's Actual Completion Date, the Completed section's fields,
     the template's own sample row (dated 11/16/2022, a caller's follow-up on medical records) taken out, the recurring tests
     recorded for the day, and a Type of Task (LSH-TRAINING) on every row. Each rule names the rows it found. */
  const DONE_RE = /^(completed?|done|finished)$/i, TEST_RE = /typing|spelling/i;
  const isDone = (r) => DONE_RE.test(String(r.status || "").trim());
  const apart = (a, b) => Math.abs(Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5;
  // (the template's own sample row: dated far before the training — its 11/16/2022 — never one of the trainee's tasks)
  const isSample = (r, D) => isTask(r) && has(r.dateReceived) && r.dateReceived < D && apart(r.dateReceived, D) > 183;
  // (the tracker as it stood on day D: a row received later isn't held against an earlier day)
  // (finished by day D: a task completed later was still open that day — a past day checked again with today's sheet isn't
  // marked down for a task the trainee only finished afterwards)
  const doneOn = (r, D) => isDone(r) && (!has(r.completedOn) || !D || r.completedOn <= D);
  const rowsOn = (t, D) => ((t && t.tracker && t.tracker.rows) || []).filter((r) => isTask(r) && (!has(r.dateReceived) || r.dateReceived <= D));
  const rowName = (r) => `"${String(r.details || r.type || "(no details)").replace(/\s+/g, " ").trim().slice(0, 60)}"${r.dateReceived ? " (" + fmtDate(r.dateReceived) + ")" : ""}`;
  const listRows = (rs, n) => { n = n || 4; return rs.slice(0, n).map(rowName).join(", ") + (rs.length > n ? ` and ${rs.length - n} more` : ""); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const pctOf = (ok, of) => of ? Math.round(100 * ok / of) : 100;
  const RULES = [
    {id: "daily-notes", label: "Daily Notes filled in for every open task",
     run(t, D){
       const rows = ((t && t.tracker && t.tracker.rows) || []).filter((r) => openOn(r, D));
       const hasCol = ((t && t.tracker && t.tracker.noteDates) || []).includes(D);
       // (a tracker kept as a log — the day's tasks entered as rows dated that day, no Daily Notes column for it — is updated that day)
       const dated = ((t && t.tracker && t.tracker.rows) || []).filter((r) => isTask(r) && (r.dateReceived === D || r.completedOn === D));
       if(!hasCol && dated.length) return {pass: true, pct: 100, detail: `${dated.length} task${dated.length === 1 ? "" : "s"} entered for ${fmtDate(D)}.`, flags: []};
       if(!rows.length) return {pass: true, pct: 100, detail: "No open tasks on this day.", flags: []};
       const missing = rows.filter((r) => !has(r.notes && r.notes[D]));
       const flags = missing.map((r) => ({row: r.id, col: "note:" + D, msg: `No Daily Note for ${fmtDate(D)}`}));
       const pct = Math.round(100 * (rows.length - missing.length) / rows.length);
       const detail = !hasCol ? `No ${fmtDate(D)} column in Daily Notes yet.${staleDates(t.tracker.noteDates, D) ? " " + staleDates(t.tracker.noteDates, D) : ""}`
         : missing.length ? `${missing.length} of ${rows.length} open task${rows.length === 1 ? "" : "s"} ha${missing.length === 1 ? "s" : "ve"} no note for ${fmtDate(D)}.`
         : `All ${rows.length} open task${rows.length === 1 ? "" : "s"} have a note for ${fmtDate(D)}.`;
       return {pass: missing.length === 0, pct, detail, flags};
     }},
    {id: "output-links", label: "The day's output links submitted (Assessment and Activities Folder)",
     run(t, D){
       if(!t || !t.drive) return null;   // only for a tracker kept in Google Drive (js/ft-drive.js)
       const links = (((t.drive.days || {})[D] || {}).links || []).filter((l) => /^https:\/\/(drive|docs)\.google\.com\//.test(String(l.url || "")));
       return links.length ? {pass: true, pct: 100, detail: `${links.length} output link${links.length === 1 ? "" : "s"} submitted for ${fmtDate(D)}.`, flags: []}
         : {pass: false, pct: 0, detail: `No output links submitted for ${fmtDate(D)}.`, flags: []};
     }},
    // 🗂 the trainer's sample evaluation's own checks (the tracker as it stood on the day: sections, dates, fields, the sample row,
    // the recurring tests, the Type of Task) — each names the rows it found, so the trainee knows which to fix
    {id: "section-placement", label: "Each task under its right section (⬇ FOR COMPLETION ⬇ pending or ongoing, ⬇ RECURRING ⬇ the daily tests, ⬇ COMPLETED ⬇ finished)",
     run(t, D){
       const rs = rowsOn(t, D).filter((r) => !isSample(r, D)); if(!rs.length) return null;
       const done = rs.filter((r) => r.section === "completion" && doneOn(r, D)), open = rs.filter((r) => r.section === "completed" && has(r.status) && !isDone(r));
       // (the Typing and Spelling Tests are continuing requirements: ⬇ RECURRING ⬇, not a row a day elsewhere)
       const tests = rs.filter((r) => r.section !== "recurring" && TEST_RE.test(r.details) && !done.includes(r) && !open.includes(r));
       const bad = done.length + open.length + tests.length;
       const detail = !bad ? `All ${plural(rs.length, "task")} are under the right section.` : [
         done.length ? `${plural(done.length, "task")} marked Completed but still under ⬇ FOR COMPLETION ⬇: ${listRows(done)}. Move ${done.length === 1 ? "it" : "them"} to ⬇ COMPLETED ⬇.` : "",
         open.length ? `${plural(open.length, "task")} under ⬇ COMPLETED ⬇ but not Completed: ${listRows(open)}. Keep unfinished work under ⬇ FOR COMPLETION ⬇.` : "",
         tests.length ? `${listRows(tests)} belong${tests.length === 1 ? "s" : ""} under ⬇ RECURRING ⬇ (the Typing and Spelling Tests continue every day).` : ""].filter(Boolean).join(" ");
       const flags = done.map((r) => ({row: r.id, col: "status", msg: "Completed, but still under ⬇ FOR COMPLETION ⬇: move it to ⬇ COMPLETED ⬇"}))
         .concat(open.map((r) => ({row: r.id, col: "status", msg: "Under ⬇ COMPLETED ⬇ but not Completed"})), tests.map((r) => ({row: r.id, col: "details", msg: "A recurring test: keep it under ⬇ RECURRING ⬇"})));
       return {pass: !bad, pct: pctOf(rs.length - bad, rs.length), detail, flags};
     }},
    {id: "completion-date", label: "Every completed task has its Actual Completion Date",
     run(t, D){
       const rs = rowsOn(t, D).filter((r) => !isSample(r, D) && (r.section === "completed" || doneOn(r, D))); if(!rs.length) return null;
       const miss = rs.filter((r) => !has(r.completedOn));
       return {pass: !miss.length, pct: pctOf(rs.length - miss.length, rs.length),
         detail: miss.length ? `${miss.length} of ${plural(rs.length, "completed task")} ha${miss.length === 1 ? "s" : "ve"} no Actual Completion Date: ${listRows(miss)}. Enter the day each was actually finished (e.g. ${fmtDate(miss[0].dateReceived || D)}).`
           : `All ${plural(rs.length, "completed task")} have an Actual Completion Date.`,
         flags: miss.map((r) => ({row: r.id, col: "completedOn", msg: "No Actual Completion Date"}))};
     }},
    {id: "completed-fields", label: "Rows under ⬇ COMPLETED ⬇ have their Date Received, Type of Task and Status",
     run(t, D){
       const rs = rowsOn(t, D).filter((r) => !isSample(r, D) && r.section === "completed"); if(!rs.length) return null;
       const gaps = rs.map((r) => [r, [!has(r.dateReceived) && "Date Received", !has(r.type) && "Type of Task", !has(r.status) && "Status"].filter(Boolean)]).filter(([, g]) => g.length);
       return {pass: !gaps.length, pct: pctOf(rs.length - gaps.length, rs.length),
         detail: gaps.length ? `${plural(gaps.length, "row")} under ⬇ COMPLETED ⬇ ${gaps.length === 1 ? "is" : "are"} missing fields: ${gaps.slice(0, 4).map(([r, g]) => `${rowName(r)} — no ${g.join(", ")}`).join("; ")}${gaps.length > 4 ? ` and ${gaps.length - 4} more` : ""}.`
           : `All ${plural(rs.length, "row")} under ⬇ COMPLETED ⬇ have their fields.`,
         flags: gaps.map(([r, g]) => ({row: r.id, col: !has(r.dateReceived) ? "dateReceived" : !has(r.type) ? "type" : "status", msg: "Missing: " + g.join(", ")}))};
     }},
    {id: "sample-row", label: "The template's sample row (dated 11/16/2022) taken out",
     run(t, D){
       const all = rowsOn(t, D); if(!all.length) return null;
       const old = all.filter((r) => isSample(r, D));
       return {pass: !old.length, pct: old.length ? 0 : 100,
         detail: old.length ? `The template's sample ${old.length === 1 ? "row" : "rows"} ${listRows(old)} ${old.length === 1 ? "is" : "are"} still in your tracker: unrelated to your training, delete ${old.length === 1 ? "it" : "them"}.` : "No sample row left in.",
         flags: old.map((r) => ({row: r.id, col: "dateReceived", msg: "The template's sample row: delete it"}))};
     }},
    {id: "recurring-tests", label: "The recurring Typing Test (AM and PM) and Spelling Test recorded for the day",
     run(t, D){
       const all = rowsOn(t, D), typ = all.filter((r) => /typing/i.test(r.details)), sp = all.filter((r) => /spell/i.test(r.details));
       // (what was written for the day: the test row's Daily Note for it, or a row for the test dated that day)
       const said = (rs) => rs.map((r) => [has(r.notes && r.notes[D]) ? r.notes[D] : "", r.dateReceived === D || r.completedOn === D ? (r.details + " " + (r.vaNotes || "")) : ""].join(" ")).join(" ").trim();
       const ty = said(typ), st = said(sp), am = /\bam\b|morning/i.test(ty), pm = /\bpm\b|afternoon|end of (the )?shift/i.test(ty);
       // (a note that names neither slot counts for both; one that names a single slot is missing the other)
       const tScore = !ty ? 0 : am === pm ? 1 : 0.5, sScore = st ? 1 : 0;
       const miss = [!typ.length ? "no Typing Test row" : !ty ? `no Typing Test recorded for ${fmtDate(D)}` : tScore < 1 ? `the ${am ? "PM" : "AM"} Typing Test isn't recorded for ${fmtDate(D)}` : "",
         !sp.length ? "no Spelling Test row" : !st ? `no Spelling Test recorded for ${fmtDate(D)}` : ""].filter(Boolean);
       const away = typ.concat(sp).some((r) => r.section !== "recurring");
       return {pass: !miss.length, pct: Math.round(50 * (tScore + sScore)),
         detail: miss.length ? `${miss.join("; ").replace(/^./, (c) => c.toUpperCase())}. Record both tests under ⬇ RECURRING ⬇ every training day (Typing AM and PM, Spelling once).`
           : `Typing (AM and PM) and Spelling recorded for ${fmtDate(D)}${away ? ", though not under ⬇ RECURRING ⬇" : ""}.`,
         flags: typ.concat(sp).filter((r) => !has(r.notes && r.notes[D]) && (t.tracker.noteDates || []).includes(D)).map((r) => ({row: r.id, col: "note:" + D, msg: `Not recorded for ${fmtDate(D)}`}))};
     }},
    {id: "task-type", label: "Every task has a Type of Task from the list (LSH-TRAINING for the training)",
     run(t, D){
       const rs = rowsOn(t, D).filter((r) => !isSample(r, D)); if(!rs.length) return null;
       const bad = rs.filter((r) => !TASK_TYPES.includes(String(r.type || "").trim().toUpperCase()));
       return {pass: !bad.length, pct: pctOf(rs.length - bad.length, rs.length),
         detail: bad.length ? `${plural(bad.length, "task")} without a Type of Task from the list: ${listRows(bad)}. Training tasks are LSH-TRAINING.` : `Every task has its Type of Task.`,
         flags: bad.map((r) => ({row: r.id, col: "type", msg: has(r.type) ? `"${r.type}" isn't on the list (LSH-TRAINING for the training)` : "No Type of Task (LSH-TRAINING for the training)"}))};
     }}
  ];

  /* the first day the tracker counts (days before it aren't checked) */
  function startDate(t){ return (t && (t.startDate || (t.createdAt && ptDate(new Date(t.createdAt))))) || ""; }

  /* the daily check: one result per rule, the overall %, and every flagged cell */
  function checkDay(t, D){
    const st = startDate(t);
    if(st && D < st) return {date: D, na: true, pass: true, pct: null, rules: [], flags: []};
    const rules = RULES.map((rule) => { const x = rule.run(t, D); return x && Object.assign({id: rule.id, label: rule.label}, x); }).filter(Boolean);
    const pct = rules.length ? Math.round(rules.reduce((a, r) => a + r.pct, 0) / rules.length) : 100;
    return {date: D, pass: rules.every((r) => r.pass), pct, rules, flags: [].concat(...rules.map((r) => r.flags))};
  }

  /* 📋 the day's own input on the tracker, as text (for the AI grade of the day, worker.js aiDayGrade): every task dated that
     day, completed that day or with a Daily Note for it — its type, details, status, the note and the VA Notes. "" when the
     tracker has nothing for the day. */
  function dayExcerpt(t, D){
    const rows = ((t && t.tracker && t.tracker.rows) || []).filter((r) => isTask(r) && (r.dateReceived === D || r.completedOn === D || has(r.notes && r.notes[D])));
    // (🗂 with the section each row is under, so the grade can judge its placement)
    return rows.slice(0, 40).map((r) => `- ${r.type || "(no type)"} | ${String(r.details || "(no details)").slice(0, 300)} | status: ${r.status || "(none)"}` +
      (r.dateReceived ? ` | received ${fmtDate(r.dateReceived)}` : "") + (r.completedOn ? ` | completed ${fmtDate(r.completedOn)}` : "") + ` | under ${SECTION_OF[r.section] || r.section || "?"}` +
      (has(r.notes && r.notes[D]) ? `\n  Daily Note: ${String(r.notes[D]).slice(0, 600)}` : "") + (has(r.vaNotes) ? `\n  VA Notes: ${String(r.vaNotes).slice(0, 400)}` : "")).join("\n").slice(0, 6000);
  }
  const SECTION_OF = Object.fromEntries(SECTIONS);

  /* 🗂 THE TRAINER'S SEVEN METRICS for the Daily Task Tracker (the sample Daily Task Tracker Evaluation): each rated out of 5,
     with a specific comment; the overall rating is their average. worker.js grades a day's rows (aiDayGrade, kind "tracker")
     and each training week (trackerWeekEval) on them; js/ft-batch-sheet.js labels them. [key, label, what it asks] */
  const TRACKER_METRICS = [
    ["organization", "Tracker Organization & Correct Section Placement", "each task under its right section — ⬇ FOR COMPLETION ⬇ genuinely pending or ongoing, ⬇ RECURRING ⬇ the Typing and Spelling Tests and other continuing requirements, ⬇ COMPLETED ⬇ finished with accurate dates and statuses — and no template sample row left in"],
    ["status", "Completion & Status Accuracy", "every training date represented, each status true to where the task stands, the Actual Completion Date on every completed task, and the day's expected activities identifiable as completed or pending (an unfinished one names what remains)"],
    ["accuracy", "Accuracy & Attention to Detail", "every field filled in (Date Received, Type of Task LSH-TRAINING, Status, Actual Completion Date) and every statement correct — qualified where the training's rule is more specific than the note says"],
    ["takeaways", "Quality & Specificity of Takeaways/Reflections", "firsthand observations, the actual mistakes, the trainer's feedback and the corrections from the practical exercises, not general lesson summaries"],
    ["application", "Future Application / Practical Use", "how the learning applies to Legal VA work, with the specific actions or procedures to follow on actual assignments"],
    ["memory", "Memory-Bank Value", "a personal procedural reference to come back to: the specific rules, steps and details from mock calls, assessments and hands-on activities preserved, not a lesson summary"],
    ["instructions", "Overall Compliance with Tracker Instructions", "the tracker kept as instructed: the required dates covered, LSH-TRAINING used, the recurring activities recorded, the sections and fields as the template asks"]];
  // the standards the sample evaluation applies (given to the AI with every tracker grade)
  const TRACKER_STANDARDS = [
    "⬇ FOR COMPLETION ⬇ holds only tasks genuinely pending or ongoing; ⬇ RECURRING ⬇ holds the Typing Test, the Spelling Test and other continuing requirements; ⬇ COMPLETED ⬇ holds finished training activities with accurate dates and statuses. A task marked Completed but left under For Completion is misplaced.",
    "Every completed task has its Date Received, Type of Task (LSH-TRAINING for the training), Status and Actual Completion Date: the day it was actually finished, especially when it carried over to another day. A blank Actual Completion Date on a completed task is a significant documentation issue.",
    "The template's original sample row (dated 11/16/2022, a caller's follow-up on medical records) is deleted: it is unrelated to the training and clutters an active tracker.",
    "The recurring Typing Test (AM and PM) and Spelling Test are recorded for each training date, and every training date is represented.",
    "Each day's expected activities (the deliverables the Training Guide and the slides give for the day: Hubstaff To-Dos, reading questions, breakout and process questions, software installs, assessments, mock calls, calendar activities, and Monitoring Sheet items only on a day the slides instruct them, after the topic is covered) are identifiable as completed or pending. They don't each need a row of their own; consolidated daily entries are fine when the completion of each deliverable can be told. Never mark an activity completed that wasn't finished.",
    "Hands-on activities and mock calls are documented as Activity → What I Did → What I Learned → Mistakes/Feedback → Correct Procedure → Future Application: the caller scenario, what was obtained or missed, the difficulties, the feedback received and the correct procedure for next time. Discussion-based activities document what was learned and how it applies to Legal VA work.",
    "Notes are a personal procedural reference (the specific rules discussed, e.g. appointment-duration limits, buffers, time zones, event naming, reminders), not generic lesson summaries; statements that are inaccurate or need qualifying against the training materials are named."];
  const EVAL_LABELS = [[4.5, "Excellent"], [4, "Very Good"], [3.5, "Good, with Improvements Needed"], [2.5, "Fair, with Significant Improvements Needed"], [0, "Needs Major Improvement"]];
  const evalLabel = (x) => (EVAL_LABELS.find(([m]) => Number(x) >= m) || EVAL_LABELS[EVAL_LABELS.length - 1])[1];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // "November 2–6, 2026" / "October 30 – November 3, 2026" — the sample's Coverage line
  function coverage(a, b){
    if(!a) return ""; b = b || a; const [ya, ma, da] = a.split("-").map(Number), [yb, mb, db] = b.split("-").map(Number);
    if(a === b) return `${MONTH_NAMES[ma - 1]} ${da}, ${ya}`;
    return ya === yb && ma === mb ? `${MONTH_NAMES[ma - 1]} ${da}–${db}, ${ya}` : `${MONTH_NAMES[ma - 1]} ${da}${ya !== yb ? ", " + ya : ""} – ${MONTH_NAMES[mb - 1]} ${db}, ${yb}`;
  }
  const dayName = (D) => { const [, m, d] = D.split("-").map(Number); return `${MONTH_NAMES[m - 1]} ${d}`; };
  const dayList = (ds) => ds.length <= 2 ? ds.map(dayName).join(" and ") : ds.slice(0, -1).map(dayName).join(", ") + " and " + dayName(ds[ds.length - 1]);

  /* 🗂 the week's tracker as text, for the weekly evaluation (worker.js trackerWeekEval): every task row with its section, dates,
     type, status, the Daily Notes written for the week's days and the VA Notes */
  function weekExcerpt(t, days){
    // (the week's rows only: none received after its last day — the next week's rows, added before a just-ended week is evaluated
    // again, aren't credited or criticised in its report)
    const ds = (days || []).slice().sort(), end = ds[ds.length - 1] || "", rows = ((t && t.tracker && t.tracker.rows) || []).filter((r) => isTask(r) && (!end || !has(r.dateReceived) || r.dateReceived <= end));
    return SECTIONS.map(([k, lab]) => { const rs = rows.filter((r) => r.section === k); if(!rs.length) return "";
      return lab + "\n" + rs.slice(0, 60).map((r) => `- Date Received: ${r.dateReceived ? fmtDate(r.dateReceived) : "(blank)"} | Type: ${r.type || "(blank)"} | ${String(r.details || "(no details)").slice(0, 300)} | Status: ${r.status || "(blank)"} | Actual Completion Date: ${r.completedOn ? fmtDate(r.completedOn) : "(blank)"}` +
        ds.filter((D) => has(r.notes && r.notes[D])).map((D) => `\n  Daily Note ${fmtDate(D)}: ${String(r.notes[D]).slice(0, 900)}`).join("") + (has(r.vaNotes) ? `\n  VA Notes: ${String(r.vaNotes).slice(0, 1500)}` : "")).join("\n"); })
      .filter(Boolean).join("\n\n").slice(0, 18000);
  }

  /* 🗂 THE WEEKLY DAILY TASK TRACKER EVALUATION, from the rules alone (no AI): the seven metrics rated from what the checks found,
     the Feedback Summary, Strengths, Areas Requiring Correction, Recommendations and Final Assessment in the sample's layout.
     worker.js keeps it when there is no AI, and gives its findings to the AI otherwise. t: the workbook; days: the week's training
     days (YYYY-MM-DD); o: {expected: {<day>: [activity titles]}, range}. The writing-quality metrics (4–6) are derived from the
     notes' length and wording, so they are marked as such. */
  function weekEval(t, days, o){
    o = o || {}; const ds = (days || []).filter(Boolean).slice().sort(), last = ds[ds.length - 1];
    if(!last || !t || !t.tracker) return null;
    const run = (id, D) => { const rule = RULES.find((r) => r.id === id); return (rule && rule.run(t, D)) || null; };
    // (the whole tracker's checks as it stands at the week's end; the recurring tests and the dates day by day)
    const place = run("section-placement", last), cdate = run("completion-date", last), fields = run("completed-fields", last), sample = run("sample-row", last), ttype = run("task-type", last);
    const rec = ds.map((D) => [D, run("recurring-tests", D)]);
    const rows = t.tracker.rows.filter(isTask), dated = (D) => rows.filter((r) => r.dateReceived === D || r.completedOn === D || has(r.notes && r.notes[D]));
    const missingDays = ds.filter((D) => !dated(D).filter((r) => !TEST_RE.test(r.details)).length), recMiss = rec.filter(([, x]) => x && !x.pass);
    // the week's own writing: each day's notes, and the VA Notes of the rows worked on that week
    const texts = []; rows.forEach((r) => { if(TEST_RE.test(r.details)) return; ds.forEach((D) => { if(has(r.notes && r.notes[D])) texts.push([D, String(r.notes[D])]); });
      if(has(r.vaNotes) && (ds.includes(r.dateReceived) || ds.includes(r.completedOn) || ds.some((D) => has(r.notes && r.notes[D])))) texts.push([r.dateReceived || r.completedOn || last, String(r.vaNotes)]); });
    const words = (s) => s.split(/\s+/).filter(Boolean).length, share = (f) => texts.length ? texts.filter(([, s]) => f(s)).length / texts.length : 0;
    const specific = share((s) => words(s) >= 25), applied = share((s) => /\b(will|next time|going forward|in the future|apply|applies|when i|i should|moving forward|on actual)\b/i.test(s));
    const hands = share((s) => /\b(mistakes?|feedback|corrected|correct procedure|i did|i missed|i forgot|trainer (said|noted|told)|caller|scenario)\b/i.test(s));
    const proc = share((s) => /\b(step|procedure|always|never|must|verify|rule|before|after|first|then)\b/i.test(s));
    const p = (x) => x ? x.pct / 100 : 1, avg = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 1, r5 = (v) => Math.max(0, Math.min(5, Math.round(v * 10) / 2));
    const recPct = avg(rec.map(([, x]) => p(x))), dayPct = ds.length ? (ds.length - missingDays.length) / ds.length : 1, cov = coverage(ds[0], last);
    // (📅 the day's expected activities that the week's entries don't seem to name — a word match, so only a pointer)
    const STOP = /^(the|and|for|with|your|from|into|session|activity|activities|training|discussion|classroom|time|day|carryover|platform|group|logged|each|done|there|graded|through)$/i;
    const said = (D) => dated(D).map((r) => [r.details, r.vaNotes, (r.notes || {})[D]].filter(Boolean).join(" ")).join(" ").toLowerCase();
    const notNamed = ds.map((D) => [D, ((o.expected || {})[D] || []).filter((a) => !TEST_RE.test(a) && !/^(buffer|free communication)/i.test(a)).filter((a) => { const ws = String(a).replace(/\([^)]*\)/g, " ").toLowerCase().match(/[a-z]{4,}/g) || [];
      const keys = ws.filter((w) => !STOP.test(w)); if(!keys.length) return false; const txt = said(D), hit = keys.filter((w) => txt.includes(w.slice(0, 6))).length; return hit < Math.min(2, keys.length); })]).filter(([, a]) => a.length);
    const met = (k, rating, comment) => [k, {rating, comment}];
    const derived = texts.length ? "" : " No notes were written for the week's tasks.";
    const fix = [sample && !sample.pass ? "the retained sample entry" : "", place && !place.pass ? "incorrect section placement" : "", cdate && !cdate.pass ? "missing Actual Completion Dates" : "",
      ttype && !ttype.pass ? "missing Types of Task" : "", notNamed.length ? "incomplete documentation of several expected activities" : ""].filter(Boolean);
    const metrics = Object.fromEntries([
      met("organization", r5(avg([p(place), p(fields), p(sample)])), [place && !place.pass ? place.detail : "Your tasks are under the right sections.", fields && !fields.pass ? fields.detail : "", sample && !sample.pass ? sample.detail : ""].filter(Boolean).join(" ")),
      met("status", r5(avg([p(cdate), dayPct])), [missingDays.length ? `${dayList(missingDays)} ${missingDays.length === 1 ? "is" : "are"} not represented in your tracker.` : `You represented all ${plural(ds.length, "training date")} (${cov}).`, cdate ? cdate.detail : "No task is marked completed yet."].join(" ")),
      met("accuracy", r5(avg([p(fields), p(ttype), p(sample), p(cdate)])), [ttype && !ttype.pass ? ttype.detail : "Every task has its Type of Task.", fields && !fields.pass ? "Some rows under ⬇ COMPLETED ⬇ are missing fields." : "", cdate && !cdate.pass ? "Missing completion dates affect the record's reliability." : ""].filter(Boolean).join(" ")),
      met("takeaways", texts.length ? r5(0.3 + 0.35 * specific + 0.35 * hands) : 0, texts.length ? `${Math.round(100 * specific)}% of your notes are detailed (25 words or more) and ${Math.round(100 * hands)}% record what actually happened (mistakes, feedback, corrections). Add firsthand observations, the trainer's feedback and the corrections from the practical exercises.` : derived.trim()),
      met("application", texts.length ? r5(0.3 + 0.7 * applied) : 0, texts.length ? `${Math.round(100 * applied)}% of your notes say how you will apply the learning. Name the specific actions or procedures you will follow during actual assignments.` : derived.trim()),
      met("memory", texts.length ? r5(0.3 + 0.35 * specific + 0.35 * proc) : 0, texts.length ? `${Math.round(100 * proc)}% of your notes keep a rule, step or procedure to come back to. Preserve the specific details from mock calls, assessments and hands-on activities, not general lesson summaries.` : derived.trim()),
      met("instructions", r5(avg([p(place), p(cdate), p(sample), p(ttype), recPct, dayPct])), [recMiss.length ? `The recurring tests aren't recorded for ${dayList(recMiss.map(([D]) => D))}.` : "You recorded the recurring Typing and Spelling Tests for every day.",
        fix.length ? `However, ${fix.join(", ")} require correction.` : ""].filter(Boolean).join(" "))]);
    const strengths = [], corrections = [];
    if(!recMiss.length) strengths.push({title: "Consistent Recurring Task Documentation", points: [`Your Typing Test (AM and PM) and Spelling Test are recorded for every training day, ${cov}.`, "This is a good practice that you should continue maintaining."]});
    if(!missingDays.length) strengths.push({title: "Every Training Date Represented", points: [`Each of the ${plural(ds.length, "training day")} of the week has an entry in your tracker.`]});
    if(ttype && ttype.pass) strengths.push({title: "Correct Type of Task", points: ["Every task carries its Type of Task, LSH-TRAINING for the training."]});
    if(cdate && cdate.pass) strengths.push({title: "Completion Dates Recorded", points: ["Every completed task has its Actual Completion Date."]});
    if(place && place.pass && (!sample || sample.pass)) strengths.push({title: "A Well-Organized Tracker", points: ["Your tasks are under the right sections and no sample entry is left in."]});
    const long = texts.filter(([, s]) => words(s) >= 25);
    if(long.length) strengths.push({title: "Detailed Notes", points: [`Your notes for ${dayList([...new Set(long.map(([D]) => D))].sort().slice(0, 5))} are detailed enough to come back to later.`]});
    if(sample && !sample.pass) corrections.push({title: "Remove the Original Sample Entry", points: [sample.detail, "Keeping sample entries in an active tracker creates unnecessary clutter and may cause confusion in an actual client environment."]});
    if(place && !place.pass) corrections.push({title: "Move Completed Tasks to the Correct Section", points: [place.detail, "Please organize the tracker as follows:", "For Completion: Tasks that are genuinely pending or ongoing.", "Recurring: Typing Tests, Spelling Tests, and other continuing training requirements.", "Completed: Finished training activities with accurate dates and statuses."]});
    if(fields && !fields.pass) corrections.push({title: "Complete the Fields in the Completed Section", points: [fields.detail, "Every completed entry needs its Date Received, Type of Task, Status and Actual Completion Date."]});
    if(cdate && !cdate.pass){ const r0 = rows.find((r) => (r.section === "completed" || isDone(r)) && !has(r.completedOn) && !isSample(r, last)) || {}, d0 = r0.dateReceived || ds[0];
      corrections.push({title: "Complete the Actual Completion Date Column", points: [cdate.detail, "This is a significant documentation issue.", `For example, if your ${dayName(d0)} activity was completed that day, the entry should reflect:`], after: ["Use the actual completion date for each activity, especially when an assignment carries over to another day."],
        example: `Date Received: ${fmtDate(d0)}\nType of Task: LSH-TRAINING\nStatus: Completed\nActual Completion Date: ${fmtDate(d0)}`}); }
    if(ttype && !ttype.pass) corrections.push({title: "Use the Correct Type of Task", points: [ttype.detail]});
    if(missingDays.length) corrections.push({title: "Represent Every Training Date", points: [`Your tracker has no entry for ${dayList(missingDays)}. Record each training day's activities and their status.`]});
    if(recMiss.length) corrections.push({title: "Record the Recurring Tests Every Day", points: recMiss.map(([, x]) => x.detail)});
    if(notNamed.length) corrections.push({title: "Make Each Day's Expected Activities Identifiable", points: notNamed.slice(0, 5).map(([D, a]) => `For ${dayName(D)}, these include: ${a.slice(0, 6).join("; ")}.`)
      .concat(["You do not need separate rows for each activity. However, the completion of the actual deliverables should be identifiable. Do not mark an activity completed unless it was actually finished."])});
    if(texts.length && hands < 0.3) corrections.push({title: "Document Your Hands-On Experience", points: ["Your notes describe the topics, but rarely what actually happened in the practical activities and mock calls.", "Record the scenario you practiced, the information you obtained or missed, any difficulties, the feedback you received and the correct procedure to follow next time."]});
    const keys = TRACKER_METRICS.map(([k]) => k), overall = Math.round(10 * keys.reduce((a, k) => a + metrics[k].rating, 0) / keys.length) / 10;
    const findings = [place, cdate, fields, sample, ttype].filter(Boolean).map((x, i) => `${x.pass ? "PASS" : "MISS"} ${["Section placement", "Actual Completion Dates", "Completed-section fields", "Sample row", "Type of Task"][i]}: ${x.detail}`)
      .concat(rec.map(([D, x]) => x ? `${x.pass ? "PASS" : "MISS"} Recurring tests ${fmtDate(D)}: ${x.detail}` : ""), missingDays.length ? [`MISS Dates represented: no entry for ${missingDays.map(fmtDate).join(", ")}`] : [`PASS Dates represented: all ${ds.length}`],
        notNamed.map(([D, a]) => `UNCLEAR ${fmtDate(D)} expected activities not named in the entries: ${a.join("; ")}`)).filter(Boolean);
    return {v: 1, ai: false, days: ds, range: o.range || [ds[0], last], coverage: cov, metrics, overall, label: evalLabel(overall), findings,
      summary: [`Your Daily Task Tracker for ${cov} was checked against the tracker instructions: the section placement, the required fields and dates, the recurring tests and each day's expected activities.`,
        corrections.length ? `It needs correction in ${plural(corrections.length, "area")}, listed below${sample && !sample.pass ? ", starting with the sample entry still in it" : ""}. The tracker must show accurately which tasks are pending, which have been completed, and when they were completed.` : "It meets the tracker instructions this week: keep maintaining it the same way."],
      strengths: strengths.length ? strengths : [{title: "A Tracker Kept for the Week", points: ["You kept a tracker for the week's training; the corrections below will make it a reliable record."]}],
      corrections, recommendations: ["You do not need to rewrite everything or create separate rows for every training activity. Focus on improving the existing entries by adding the specific task accomplishments, procedures, personal observations and corrections that are missing.",
        "For discussion-based activities, continue documenting what you learned and how it applies to Legal VA work.", "For hands-on activities and mock calls, use this structure:", "Activity → What I Did → What I Learned → Mistakes/Feedback → Correct Procedure → Future Application",
        "Also, complete all required tracker fields, keep the section placement clean, and maintain your recurring activities every day."],
      final: [corrections.length ? `Your tracker needs corrections in its structure and administrative accuracy: ${corrections.slice(0, 4).map((c) => c.title.toLowerCase()).join("; ")}.` : "Your tracker is well maintained this week.",
        "A Legal VA's tracker should serve both as a reliable work record and a practical reference for completing similar assignments in the future."]};
  }
  // (✍ the writing metrics, 4–6, when the evaluation came from the rules alone: derived from the notes' length and wording)
  const DERIVED = ["takeaways", "application", "memory"];

  /* 🗂 the evaluation as the sample lays it out: the Trainee and Coverage lines, the metric table (Metric | Rating | Comments),
     Feedback Summary, Strengths and Areas Requiring Correction (numbered, each a heading and its points), Recommendations,
     Final Assessment and the Overall Performance Rating — as HTML (the page, ⬇ Download as .doc) or as text (📋 Copy). */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const num = (x) => (Math.round(Number(x) * 10) / 10).toFixed(1);
  function evalHtml(ev, o){
    if(!ev) return ""; o = o || {}; const M = ev.metrics || {};
    const pts = (xs) => (xs || []).map((x) => `<p>${esc(x)}</p>`).join("");
    const list = (xs) => (xs || []).map((x, i) => `<h4>${i + 1}. ${esc(x.title)}</h4>${pts(x.points)}${x.example ? `<p class="ft-ev-ex">${String(x.example).split("\n").map(esc).join("<br>")}</p>` : ""}${pts(x.after)}`).join("");
    return `<div class="ft-ev">${o.name ? `<p><b>Trainee:</b> ${esc(o.name)}</p>` : ""}<h3>Daily Task Tracker Evaluation</h3><p><b>Coverage:</b> ${esc(ev.coverage || coverage((ev.days || [])[0], (ev.days || []).slice(-1)[0]))}</p>
      ${ev.ai ? "" : `<p class="ft-ev-note"><i>From the tracker's automatic checks (no AI review): metrics 1–3 and 7 are rated from the rule results; metrics 4–6 are derived from your notes' length and wording. Your trainer may revise them.</i></p>`}
      <table class="ft-ev-t" border="1" cellpadding="6" style="border-collapse:collapse"><thead><tr><th>Evaluation Metric</th><th>Rating</th><th>Comments</th></tr></thead><tbody>
      ${TRACKER_METRICS.map(([k, lab], i) => { const m = M[k] || {}; return `<tr><td>${i + 1}. ${esc(lab)}</td><td>${m.rating == null ? "—" : num(m.rating) + "/5"}</td><td>${esc(m.comment || "")}</td></tr>`; }).join("")}</tbody></table>
      <h4>Feedback Summary</h4>${pts(ev.summary)}<h3>Strengths</h3>${list(ev.strengths)}<h3>Areas Requiring Correction</h3>${(ev.corrections || []).length ? list(ev.corrections) : "<p>None this week.</p>"}
      <h4>Recommendations:</h4>${pts(ev.recommendations)}<h4>Final Assessment:</h4>${pts(ev.final)}
      <p class="ft-ev-overall"><b>Overall Performance Rating: ${num(ev.overall)} / 5 – ${esc(ev.label || evalLabel(ev.overall))}</b></p></div>`;
  }
  function evalText(ev, o){
    if(!ev) return ""; o = o || {}; const M = ev.metrics || {}, out = [];
    const list = (xs) => (xs || []).forEach((x, i) => { out.push(`${i + 1}. ${x.title}`); (x.points || []).forEach((p) => out.push(p)); if(x.example) out.push(x.example); (x.after || []).forEach((p) => out.push(p)); out.push(""); });
    if(o.name) out.push(`Trainee: ${o.name}`);
    out.push("Daily Task Tracker Evaluation", `Coverage: ${ev.coverage || coverage((ev.days || [])[0], (ev.days || []).slice(-1)[0])}`, "");
    if(!ev.ai) out.push("(From the tracker's automatic checks, no AI review: metrics 4–6 are derived from the notes' length and wording.)", "");
    out.push("Evaluation Metric | Rating | Comments");
    TRACKER_METRICS.forEach(([k, lab], i) => { const m = M[k] || {}; out.push(`${i + 1}. ${lab} | ${m.rating == null ? "—" : num(m.rating) + "/5"} | ${m.comment || ""}`); });
    out.push("", "Feedback Summary", ...(ev.summary || []), "", "Strengths"); list(ev.strengths);
    out.push("Areas Requiring Correction"); if((ev.corrections || []).length) list(ev.corrections); else out.push("None this week.", "");
    out.push("Recommendations:", ...(ev.recommendations || []), "", "Final Assessment:", ...(ev.final || []), "", `Overall Performance Rating: ${num(ev.overall)} / 5 – ${ev.label || evalLabel(ev.overall)}`);
    return out.join("\n");
  }

  /* the notes review: the day's notes and takeaways, judged against the trainer's criteria */
  function reviewPrompt(t, D, criteria, name){
    const rows = ((t && t.tracker && t.tracker.rows) || []).filter(isTask);
    const lines = rows.filter((r) => openOn(r, D) || r.completedOn === D).map((r) => {
      const note = (r.notes && r.notes[D]) || "";
      return `- Task: ${r.details || "(no details)"} [${r.type || "no type"}; status: ${r.status || "none"}]\n  Daily Note for ${fmtDate(D)}: ${note ? JSON.stringify(note) : "(empty)"}` +
        (has(r.vaNotes) ? `\n  VA Notes: ${JSON.stringify(r.vaNotes)}` : "");
    });
    return {
      system: "You are a training supervisor at Legal Support Help (LSH) reviewing a trainee virtual assistant's Daily Task Tracker. " +
        "Write as the supervisor, in plain professional English. Never mention that you are an AI, a model or automated.",
      prompt: `Trainee: ${name || "Trainee"}\nDay: ${fmtDate(D)}\n\nCriteria for good notes:\n${criteria || DEFAULT_CRITERIA}\n\n` +
        `The tracker's tasks for this day:\n${lines.join("\n") || "(no tasks)"}\n\n` +
        "Review the notes against the criteria. Reply with at most 5 short bullet points: first what is missing or needs fixing " +
        "(name the task), then one line on what was done well. Under 120 words. No greeting, no sign-off."
    };
  }

  /* ---------- the tracker and the Monitoring Sheet kept in Google Drive ---------- */
  // A Google Sheets / Docs link → its id and tab (gid), and the export address the Worker reads.
  function googleFile(url){
    const u = String(url || ""), id = (u.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || u.match(/[?&]id=([a-zA-Z0-9_-]{20,})/) || [])[1] || "";
    const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1] || "0";
    const kind = /docs\.google\.com\/spreadsheets/.test(u) ? "sheet" : /docs\.google\.com\/document/.test(u) ? "doc" : /drive\.google\.com\/drive\/(u\/\d+\/)?folders/.test(u) ? "folder" : id ? "file" : "";
    return {id, gid, kind,
      exportUrl: kind === "sheet" ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}` : kind === "doc" ? `https://docs.google.com/document/d/${id}/export?format=txt` : ""};
  }
  function parseCsv(text){
    const rows = []; let row = [], cell = "", q = false;
    const s = String(text || "").replace(/^\uFEFF/, "");
    for(let i = 0; i < s.length; i++){
      const c = s[i];
      if(q){ if(c === '"'){ if(s[i + 1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if(c === '"') q = true; else if(c === ",") { row.push(cell); cell = ""; } else if(c === "\n" || c === "\r"){ if(c === "\r" && s[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
    }
    if(cell || row.length){ row.push(cell); rows.push(row); }
    return rows;
  }
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  // "10/8/2026", "10/08", "2026-10-08", "Oct 8, 2026", "October 8" → "2026-10-08" (a date without a year takes `year`)
  function isoDate(v, year){
    // (a weekday in front, a weekday or note in brackets after, and "." or "-" between the numbers are forgiven:
    // "Fri, 10/30/2026", "10/30/26 (Fri)", "10.30.26", "10-30-2026", "30-Oct", "Oct-30-26")
    let t = String(v || "").trim().replace(/\s*[(\[][^)\]]*[)\]]\s*$/, "").replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+(?=\d)/i, "").trim(), m;
    if((m = t.match(/^(\d{1,2})[.\-](\d{1,2})(?:[.\-](\d{2,4}))?$/))) t = `${m[1]}/${m[2]}${m[3] ? "/" + m[3] : ""}`;
    if((m = t.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})\.?(?:[\s\-,]+(\d{2,4}))?$/)) && MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) >= 0) t = `${m[2]} ${m[1]}${m[3] ? ", " + (m[3].length === 2 ? "20" + m[3] : m[3]) : ""}`;
    if((m = t.match(/^([A-Za-z]{3,9})\.?-(\d{1,2})(?:-(\d{2,4}))?$/))) t = `${m[1]} ${m[2]}${m[3] ? ", " + (m[3].length === 2 ? "20" + m[3] : m[3]) : ""}`;
    const out = (y, mo, d) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) ? `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
    if((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return out(m[1], +m[2], +m[3]);
    if((m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))) return out(m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : year, +m[1], +m[2]);
    if((m = t.match(/^(?:[A-Za-z]+,?\s+)?([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/)) && MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) >= 0) return out(m[3] || year, MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
    return "";
  }
  // 📅 a date anywhere in a cell or a column's heading, whatever is around it — "Mon 11/2", "11/02/2026 (Monday)", "2-Nov-2026",
  // "Monday – November 2nd", "Date: 10/30/26" — so a day's inputs are read for that day; "" when there is none
  function findDate(v, year){
    const t = String(v || "").replace(/\s+/g, " ").trim(); if(!t) return "";
    const whole = isoDate(t, year); if(whole) return whole;
    const out = (y, mo, d) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) ? `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
    const yr = (x) => !x ? year : x.length === 2 ? "20" + x : x, mon = (x) => MONTHS.indexOf(String(x || "").slice(0, 3).toLowerCase()) + 1;
    let m;
    if((m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) return out(m[1], +m[2], +m[3]);
    if((m = t.match(/(?:^|[^\d])(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?(?![\d\/])/))) return out(yr(m[3]), +m[1], +m[2]);
    if((m = t.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/)) && mon(m[1]) > 0) return out(yr(m[3]), mon(m[1]), +m[2]);
    if((m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?[-\s]([A-Za-z]{3,9})\.?(?:[-\s,]+(\d{2,4}))?\b/)) && mon(m[2]) > 0) return out(yr(m[3]), mon(m[2]), +m[1]);
    return "";
  }
  /* 🧪 A daily Typing or Spelling Test screenshot in the trainee's Drive folder, by its file name: the guide's
     "Typing Test [date taken][AM/PM]" (e.g. "Typing Test 10/30/2026 AM.png", "Spelling Test [Oct 30][AM]",
     "typing_test_2026-10-30_pm.jpg"). Returns {kind: "typing"|"spelling", date, slot: "AM"|"PM", up, named} or null:
     a part the name leaves out comes from when the file was uploaded (Eastern time, the shift's), and up is the
     upload's own day, so a screenshot uploaded after the day it is for counts as made up. */
  const SHOT_TZ = "America/New_York";
  function etParts(iso){
    const d = new Date(iso); if(isNaN(d)) return null;
    const p = new Intl.DateTimeFormat("en-CA", {timeZone: SHOT_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"}).formatToParts(d);
    const g = (t) => (p.find((x) => x.type === t) || {}).value;
    return {date: `${g("year")}-${g("month")}-${g("day")}`, hour: +g("hour")};
  }
  function parseTestShot(name, created){
    const raw = String(name || ""), low = raw.toLowerCase();
    const typing = /typing|wpm/.test(low), spelling = /spell/.test(low);
    if(typing === spelling) return null;
    if(/\bsample\b|\btemplate\b/.test(low)) return null;
    const up = etParts(created), year = (up ? up.date : ptDate()).slice(0, 4);
    // the name without its extension and the test's own words, so their letters and digits aren't read as a date
    const rest = low.replace(/\.(png|jpe?g|gif|webp|heic|bmp|tiff?|pdf)$/, "").replace(/typing|spelling|spell|test|wpm|screenshot|screen shot/g, " ");
    const ok = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
    const yr = y => !y ? year : y.length === 2 ? "20" + y : y;
    let m, date = "";
    if((m = rest.match(/(\d{4})[-_.\/ ](\d{1,2})[-_.\/ ](\d{1,2})(?!\d)/))) date = ok(m[1], +m[2], +m[3]);
    // month/day with a / - . or _ between, else with spaces ("Typing Test 10 30 AM"); the guide's dates are month/day, and a
    // first number over 12 can only be a day
    for(const sep of ["[-_.\\/]", "[-_.\\/ ]"]){
      if(date || !(m = rest.match(new RegExp(`(?:^|\\D)(\\d{1,2})${sep}(\\d{1,2})(?:${sep}(\\d{4}|\\d{2}))?(?!\\d)`)))) continue;
      date = +m[1] > 12 && +m[2] <= 12 ? ok(yr(m[3]), +m[2], +m[1]) : ok(yr(m[3]), +m[1], +m[2]);
    }
    if(!date && (m = rest.match(/(?:^|\D)(\d{2})(\d{2})(\d{4}|\d{2})(?!\d)/))) date = ok(yr(m[3]), +m[1], +m[2]);
    if(!date && (m = rest.match(/([a-z]{3,9})\.?[\s_-]*(\d{1,2})(?:st|nd|rd|th)?(?:,?[\s_-]*(\d{4}))?(?!\d)/)) && MONTHS.indexOf(m[1].slice(0, 3)) >= 0) date = ok(yr(m[3]), MONTHS.indexOf(m[1].slice(0, 3)) + 1, +m[2]);
    if(!date && (m = rest.match(/(?:^|\D)(\d{1,2})(?:st|nd|rd|th)?[\s_-]*([a-z]{3,9})\.?(?:,?[\s_-]*(\d{4}))?/)) && MONTHS.indexOf(m[2].slice(0, 3)) >= 0) date = ok(yr(m[3]), MONTHS.indexOf(m[2].slice(0, 3)) + 1, +m[1]);
    const s = rest.match(/(?:^|[^a-z])(am|pm)(?![a-z])/) || rest.match(/(morning)|(afternoon|end of shift|eod)/);
    const slot = s ? (/^(am|morning)$/.test(s[1] || "") ? "AM" : "PM") : up ? (up.hour < 12 ? "AM" : "PM") : "";
    if(!date && !up) return null;
    return {kind: typing ? "typing" : "spelling", date: date || up.date, slot: slot || "AM", up: up ? up.date : "", named: !!date};
  }
  // The trainee's Daily Task Tracker sheet (the LSH sample's layout) → the workbook the rules check.
  // The header row is the one with "Task Details"; the Daily Notes columns are the dated headers between
  // "Accountable VA" and "VA Notes"; "⬇ FOR COMPLETION ⬇" / "RECURRING" / "COMPLETED" rows start the sections.
  function fromSheetCsv(csv, opts){
    const o = opts || {}, rows = parseCsv(csv), year = (o.today || ptDate()).slice(0, 4);
    const hi = rows.findIndex((r) => r.some((c) => /task\s*details/i.test(c)));
    if(hi < 0) return null;
    const head = rows[hi].map((c) => String(c || "").trim()), find = (re) => head.findIndex((c) => re.test(c));
    const col = {dateReceived: find(/date\s*received/i), type: find(/type\s*of\s*task/i), details: find(/task\s*details/i), va: find(/accountable/i),
      vaNotes: find(/va\s*notes/i), deadline: find(/deadline/i), status: find(/^status/i), completedOn: find(/completion/i)};
    const from = col.va >= 0 ? col.va + 1 : col.details + 1, to = col.vaNotes > from ? col.vaNotes : head.length;
    const dateCols = [];
    // (the Daily Notes' dates: in the heading row itself, the row above it, or the row under it — a merged DAILY NOTES heading
    // with the days beneath — in any form, findDate)
    let under = false;
    for(let i = from; i < to; i++){ let d = findDate(head[i], year) || findDate((rows[hi - 1] || [])[i], year);
      if(!d){ d = findDate((rows[hi + 1] || [])[i], year); if(d) under = true; }
      if(d && !dateCols.some(x => x[1] === d)) dateCols.push([i, d]); }
    let section = "completion"; const out = [];
    rows.slice(hi + (under ? 2 : 1)).forEach((r) => {
      const line = r.join(" ");
      if(/for\s*completion/i.test(line) && !has(r[col.details])){ section = "completion"; return; }
      if(/recurring/i.test(line) && !has(r[col.details])){ section = "recurring"; return; }
      if(/completed/i.test(line) && !has(r[col.details]) && !has(r[col.type])){ section = "completed"; return; }
      const get = (k) => col[k] >= 0 ? String(r[col[k]] || "").trim() : "";
      const row = taskRow(section, {dateReceived: findDate(get("dateReceived"), year), type: get("type"), details: get("details"), va: get("va"),
        vaNotes: get("vaNotes"), deadline: get("deadline"), status: get("status"), completedOn: findDate(get("completedOn"), year), notes: {}});
      dateCols.forEach(([i, d]) => { if(has(r[i])) row.notes[d] = String(r[i]).trim(); });
      if(isTask(row)) out.push(row);
    });
    return {v: 1, source: "drive", startDate: o.startDate || "", tracker: {noteDates: dateCols.map((x) => x[1]), rows: out}};
  }
  // The Training Progress Monitoring Sheet's text (a Google Doc's text, or a sheet's CSV joined into lines), checked per discussion:
  // its title found, a date, 5 takeaways (lines of 4+ words), questions, and the understanding rated.
  // The classroom discussions (the Hubstaff To-Dos), until a trainer sets the list (settings:monitor). js/ft-monitoring.js uses it too.
  // One entry per classroom discussion, in the order the Training Guide runs them: all 18 days of
  // the Revised 18-Day Foundational Training Program (js/ft-day-activities.js maps the days).
  // The Lien Negotiator days close the programme, so their discussions are monitored like the rest.
  const MONITOR_TOPICS = ["Virtual Assistant Essentials - Day 1", "Virtual Assistant Essentials - Day 2",
    "Reception Training Day 1", "Reception Training Day 2", "Reception Training Day 3", "Calendar Management Training",
    "Intake Training Day 1", "Intake Training Day 2", "Intake Training Day 3",
    "Insurance Communication Training Day 1", "Insurance Communication Training Day 2", "Insurance Communication Training Day 3",
    "Provider Communication Training Day 1", "Provider Communication Training Day 2", "Provider Communication Training Day 3", "Provider Communication Training Day 4",
    "Lien Negotiator Training Day 1", "Lien Negotiator Training Day 2"];
  // Days 17–18 (Lien Negotiator Training) run only when the training hours permit: their discussions stay on the list,
  // grayed out, and count toward the total only once the trainee has written them (so a full sheet reads 16 of 16)
  const OPTIONAL_MONITOR_TOPICS = ["Lien Negotiator Training Day 1", "Lien Negotiator Training Day 2"];
  const optionalTopic = (t) => !!(t && t.optional) || OPTIONAL_MONITOR_TOPICS.includes(String((t && t.title) || t));
  /* 📒 WHEN the Monitoring Sheet is due: only on a training day whose slides explicitly say to update it, and only once that
     day's topic has been covered (the trainers: "not expected to be checked daily; updated when explicitly instructed on the
     slides and after the topic has been covered"). Training day number → {topic: the discussion whose entry is due (by the
     Training Guide's order, MONITOR_TOPICS), on: the day that topic is covered, items: the sheet's numbered items the slides
     name ([] for a plain "Update your Training Progress Monitoring Sheet"), what: the instruction, as the trainee is told it,
     where: the slides that say it}. A day not listed asks for no update: its Monitoring Sheet isn't expected, not counted
     (worker.js dailyCompliance parts.monitor = null; js/ft-batch-sheet.js dayActs "Not expected today"). Read from
     grep -i "monitoring" js/ build/days/ (the decks, js/ft-day-decks-data.js, are built from build/days by build/day-decks.cjs):
       • the end of every day's deck (js/ft-day-decks.js dividerSlide) only repeats a listed day's instruction;
       • Day 5's opening card (js/ft-buffer.js ACTS["5:s1"]) is Day 4's items #10–11 again, under Day 4's key (a make-up of
         Day 4's update, done once), so it isn't a new due day;
       • Day 8's item #14 (build/days/day08.js s2, the Demo Tutorial) is off the deck (build/day-decks.cjs SKIP[8]). */
  // (the Breakout Sessions' handouts no longer ask for an update — the trainer: "score only every after the particular training
  // is done unless explicitly instructed on the deck" — so Days 7 and 10, mid-topic, ask for none)
  const MONITOR_SCHEDULE = {
    1: {topic: MONITOR_TOPICS[0], on: 1, items: [1, 2, 3, 4], what: "items #1–4",
      where: "build/days/day01.js “monitoring” (upload the sheet, then update items #1-4; taught on the orientation's 📒 Monitoring Sheet slide, js/ft-rules.js) · js/ft-day-decks.js HANDOUTS[1] (“Update your Training Progress Monitoring Sheet”)"},
    2: {topic: MONITOR_TOPICS[1], on: 2, items: [5, 6, 7, 8, 9], what: "items #5–7 and #8–9",
      where: "js/ft-buffer.js ACTS[\"2:s2l\"] (#5–7, 📤 Submit) and ACTS[\"2:s4\"] (#8–9) · js/ft-day-decks.js LESSON_CARDS[2] (“Update items #5–7 on your Monitoring Sheet”) · build/days/day02.js (Task 3 lines) · HANDOUTS[2]"},
    3: {topic: MONITOR_TOPICS[2], on: 3, items: [12], what: "item #12 (the CRM/CMS training videos)",
      where: "js/ft-day-activities.js OFFLINE[3] (“The CRM/CMS training videos, then update item #12 on your Monitoring Sheet”) · build/days/day03.js homework"},
    4: {topic: MONITOR_TOPICS[3], on: 4, items: [10, 11], what: "items #10–11 (Reception Training with Julio)",
      where: "js/ft-buffer.js ACTS[\"4:s2b\"] (📤 Submit) · js/ft-day-activities.js OFFLINE[4] · js/ft-day-decks.js LESSON_CARDS[3] (Reception mock calls) · build/days/day04.js (Task 2)"},
    8: {topic: MONITOR_TOPICS[7], on: 8, items: [15, 16], what: "items #15–16 (the Intake Process videos and Intake Documents)",
      where: "build/days/day08.js s1 (“Update item #15”) and s1b (“Update #16 (Intake Documents)”) · js/ft-day-decks.js LESSON_CARDS[6] (“Intake Video … update your Monitoring Sheet”)"},
    // 📚 and after each topic has been covered (the trainer: "and also every after the topic have been covered"): the topic's
    // last training day (one discussion a day, MONITOR_TOPICS), its entry due that day
    5: {topic: MONITOR_TOPICS[4], on: 5, items: [], after: true, what: "Reception Training, now covered (Days 3–5)", where: "the trainer's rule: an update after each topic is covered"},
    6: {topic: MONITOR_TOPICS[5], on: 6, items: [], after: true, what: "Calendar Management Training, now covered", where: "the trainer's rule: an update after each topic is covered"},
    9: {topic: MONITOR_TOPICS[8], on: 9, items: [], after: true, what: "Intake Training, now covered (Days 7–9)", where: "the trainer's rule: an update after each topic is covered"},
    12: {topic: MONITOR_TOPICS[11], on: 12, items: [], after: true, what: "Insurance Communication Training, now covered (Days 10–12)", where: "the trainer's rule: an update after each topic is covered"},
    16: {topic: MONITOR_TOPICS[15], on: 16, items: [], after: true, what: "Provider Communication Training, now covered (Days 13–16)", where: "the trainer's rule: an update after each topic is covered"},
    18: {topic: MONITOR_TOPICS[17], on: 18, items: [], after: true, optional: true, what: "Lien Negotiator Training, now covered (when the training hours permit it)", where: "the trainer's rule: an update after each topic is covered"}
  };
  // training day n's update, or null when the slides ask for none that day (or its topic isn't covered yet)
  const monitorDue = (n) => { const x = MONITOR_SCHEDULE[Number(n)]; return x && x.on <= Number(n) ? x : null; };
  // a date's training day number from the batch's first day (YYYY-MM-DD): its count of weekdays, 0 before it or with no start
  function trainingDay(start, D){
    if(!start || !D || D < start) return 0;
    let n = 0; for(let t = Date.parse(start + "T12:00:00Z"); t <= Date.parse(D + "T12:00:00Z") && n < 40; t += 864e5) if(isWeekday(new Date(t).toISOString().slice(0, 10))) n++;
    return n;
  }
  const monitorDueOn = (start, D) => monitorDue(trainingDay(start, D));
  const RATING_HINTS = ["really don", "on my own but", "confident that i can", "can teach this"];
  // a discussion's other title, also found on sheets (Day 2's To-Do is "Virtual Assistant Essentials - Day 2"; its lesson is Law Firm Communication)
  const TOPIC_ALIASES = {"Virtual Assistant Essentials - Day 2": ["Law Firm Communication"]};
  function gradeMonitorText(text, topics){
    const lines = String(text || "").split(/\r?\n/).map((l) => l.replace(/^[\s,]+|[\s,]+$/g, "")).filter(Boolean);
    const low = lines.map((l) => l.toLowerCase());
    const names = (t) => [String(t.title || t)].concat(TOPIC_ALIASES[String(t.title || t)] || []).map((x) => x.toLowerCase());
    const starts = (topics || []).map((t) => ({t, at: low.findIndex((l) => names(t).some((n) => l.includes(n)))})).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at);
    const entries = starts.map((x, k) => {
      const seg = lines.slice(x.at + 1, k + 1 < starts.length ? starts[k + 1].at : lines.length), segLow = seg.map((l) => l.toLowerCase());
      const qi = segLow.findIndex((l) => /question/.test(l)), ri = segLow.findIndex((l) => /rate your understanding|understanding/.test(l));
      const ti = segLow.findIndex((l) => /takeaway/.test(l));
      const words = (l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").split(/\s+/).filter(Boolean).length;
      const take = seg.slice(ti >= 0 ? ti + 1 : 0, qi > ti ? qi : (ri > ti ? ri : seg.length)).filter((l) => words(l) >= 4);
      const qs = qi >= 0 ? seg.slice(qi + 1, ri > qi ? ri : seg.length).filter((l) => words(l) >= 2) : [];
      const rated = segLow.some((l) => RATING_HINTS.some((h) => l.includes(h)) && /[x✓✔☑☒■●▣]|\bselected\b|\(x\)|\[x\]/i.test(l)) || segLow.some((l) => /^rating\s*[:\-]\s*[1-4]/.test(l));
      // (📅 the entry's own date — its "Date: 10/30/2026" line — so each day's score is read from the entry dated that day)
      const dl = seg.find((l) => /^date\b/i.test(l)) || seg.find((l) => /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(l)) || "";
      // (#624 strips its longer "Date of the discussion:" prefix; main reads the date in any form, findDate)
      const date = findDate(dl.replace(/^date\s*(of\s+(the\s+)?(discussion|session|entry))?\s*[:\-]?\s*/i, ""), ptDate().slice(0, 4));
      const checks = [["Date", seg.some((l) => isoDate(l.replace(/^date\s*[:\-]?\s*/i, ""), "2000") || /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/.test(l))],
        ["5 takeaways", take.length >= 5], ["Questions", qs.length >= 1], ["Understanding rated", rated]];
      return {topic: x.t.title || x.t, date, text: seg.join("\n").slice(0, 3000), takeaways: take.length, questions: qs.length, checks: checks.map(([label, ok]) => ({label, ok})), pct: Math.round(100 * checks.filter((c) => c[1]).length / checks.length)};
    });
    entries.forEach((x) => { if(optionalTopic(x.topic)) x.optional = true; });
    const pct = entries.length ? Math.round(entries.reduce((a, x) => a + x.pct, 0) / entries.length) : 0;
    const opt = (topics || []).filter(optionalTopic).map((t) => String(t.title || t));
    const pending = opt.filter((t) => !entries.some((x) => x.topic === t));
    return {pct, found: entries.length, total: (topics || []).length - pending.length, entries, optional: pending};
  }

  /* 📧 THE EOD EMAIL, checked against its template (Setting of Expectations, js/ft-rules.js EOD): the subject "Daily Report
     mm/dd/yy" or "EOD Report mm/dd/yy" with the day's date; "Accomplishments/Completed Tasks:" with what was done; "These are
     the things I've learned that I can put into practice later on:" with at least 3 learnings of at least 2 sentences each;
     "On queue for tomorrow:" with the next tasks; sent before the end of the shift (5:00 PM ET). D: the training day
     (YYYY-MM-DD); at: when it was sent (or pasted). Returns {pct, pass, rules: [{id, label, pass, detail}]}. */
  function checkEod(text, subject, D, at){
    const t = String(text || "").replace(/\r/g, ""), subj = String(subject || "").trim();
    // (the plain text of an email written with bold or italic headings carries them as *…* or _…_: taken off, so
    // "*On queue for tomorrow:*" reads as its heading)
    const lines = t.split("\n").map((l) => l.replace(/[*_]{1,3}/g, "").trim());
    // the subject: the email's own, else the first line ("Subject: …", or the subject typed as the first line)
    const sub = subj || ((lines.find((l) => has(l)) || "").replace(/^subject\s*:\s*/i, ""));
    const sm = /\b(daily|eod)\s+report\b[^0-9]*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i.exec(sub);
    const sDate = sm ? `${sm[4].length === 2 ? "20" + sm[4] : sm[4]}-${String(sm[2]).padStart(2, "0")}-${String(sm[3]).padStart(2, "0")}` : "";
    // a part: the lines after its heading, up to the next heading
    const H = [["acc", /accomplishments?|completed tasks/i], ["learn", /things i.?ve learned|learned that i can|learnings?/i], ["queue", /on queue|queue for tomorrow|tomorrow/i]];
    // (a heading: the line with its colon, or a short line of its own with no bullet — "Accomplishments/Completed Tasks")
    const heading = (l) => /:\s*(\(|$)|:\s*$|:\s/.test(l + " ") || (l.length <= 80 && !/^[-•*\d]/.test(l) && !/[.!?]$/.test(l));
    const at_ = {}; lines.forEach((l, i) => { H.forEach(([k, re]) => { if(at_[k] == null && re.test(l) && heading(l)) at_[k] = i; }); });
    const part = (k) => { if(at_[k] == null) return null; const next = Object.values(at_).filter((v) => v > at_[k]).sort((a, b) => a - b)[0];
      return lines.slice(at_[k] + 1, next == null ? lines.length : next).map((l) => l.replace(/^[-•*•\d.)\s]+/, "").trim()).filter((l) => l.length > 2 && !/^(regards|thank you|thanks|best)[,!.]?$/i.test(l)); };
    const acc = part("acc"), learn = part("learn"), queue = part("queue");
    const sentences = (l) => (String(l).match(/[^.!?]+[.!?]+/g) || []).filter((x) => x.trim().split(/\s+/).length >= 3).length || (String(l).trim().split(/\s+/).length >= 8 ? 1 : 0);
    // (a learning: 2 sentences or more, or one full sentence of 12 words or more — the standard EOD's one-line learnings)
    const goodLearn = (learn || []).filter((l) => sentences(l) >= 2 || String(l).trim().split(/\s+/).length >= 12);
    const etHour = (() => { if(!at) return null; try{ return +new Intl.DateTimeFormat("en-US", {timeZone: "America/New_York", hour: "numeric", hour12: false}).format(new Date(at)); }catch(e){ return null; } })();
    const etDate = (() => { if(!at) return ""; try{ const p = new Intl.DateTimeFormat("en-CA", {timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date(at)); return p; }catch(e){ return ""; } })();
    const rules = [
      {id: "subject", label: "The subject: Daily Report mm/dd/yy (or EOD Report mm/dd/yy)", pass: !!sm && (!D || sDate === D),
        detail: !sm ? `It reads "${sub.slice(0, 80) || "(none)"}": write Daily Report ${D ? D.slice(5, 7) + "/" + D.slice(8) + "/" + D.slice(2, 4) : "mm/dd/yy"}` : D && sDate !== D ? `Its date (${sDate}) isn't the day's (${D})` : ""},
      {id: "acc", label: "Accomplishments/Completed Tasks: what was done", pass: !!(acc && acc.length), detail: acc ? (acc.length ? `${acc.length} listed` : "The part is there, but empty") : "The part is missing"},
      {id: "learn", label: "At least 3 learnings, each 2 sentences or a full sentence (12 words or more)", pass: goodLearn.length >= 3, part: Math.min(goodLearn.length, 3) / 3,
        detail: learn ? `${goodLearn.length} of ${learn.length} learning${learn.length === 1 ? "" : "s"} written out in full (3 needed)` : "The part (These are the things I've learned…) is missing"},
      {id: "queue", label: "On queue for tomorrow: the next tasks", pass: !!(queue && queue.length), detail: queue ? (queue.length ? `${queue.length} listed` : "The part is there, but empty") : "The part is missing"},
      {id: "time", label: "Sent before the end of the shift (5:00 PM ET)", pass: etHour == null ? true : (!D || etDate <= D) && (etDate < D || etHour < 17),
        detail: etHour == null ? "" : `Sent ${etDate} at ${etHour}:00 ET`}];
    // (each check counts the same; the learnings in part: each of the 3 a third of its share)
    const pct = Math.round(100 * rules.reduce((a, r) => a + (r.pass ? 1 : typeof r.part === "number" ? r.part : 0), 0) / rules.length);
    return {pct, pass: rules.every((r) => r.pass), rules, subject: sub.slice(0, 200), learnings: goodLearn.length};
  }

  /* 📦 DAY 8'S INTAKE PACKET, checked for accuracy and completeness (js/ft-intake.js, worker.js checkIntakePacket), on the
     Saving Intake Packet and Extracted Intake Documents rubric (js/ft-rubrics.js "intake-packet": Document Handling —
     Extraction, Renaming & Organization; Document Properties Accuracy; Attention to Detail) and the Day 8 steps: the packet
     downloaded, renamed "INTAKE - Packet (VA's Name)", uploaded with every document extracted from it into a subfolder of
     the Assessments/Activities folder named after the assigned client, each extracted document named under the Document
     Naming Convention, "INTAKE - <Document> (VA's Name)", and the Intake Worksheet kept outside that subfolder.
     o: {file: {ok, error, name, mime, modified} — the packet the trainee linked; folder: {ok, error, name, files: [{name,
     modified}]} — the client subfolder; client: the assigned client's name; va: the trainee's name; assignedAt; docs: the
     documents the AI found in the packet (canonical names, or null when the packet couldn't be read)}.
     Returns {pct, pass, rules: [{id, label, pass, detail}], extracted, missing, wrong, misnamed}. */
  const PACKET_DOCS = ["Intake Packet", "Internal Intake Form", "Clients Info Sheet", "Clients Need List", "CM Notes", "1P Drivers License",
    "3P Drivers License", "DMV", "3P DMV", "Conflict of Interest Waiver", "Consent For Disclosure of Information", "Internet and Surveillance Ack",
    "Limited Power of Attorney", "General Release", "MVA Questionnaire", "Premise Questionnaire", "Attorney's Lien", "NPIM Referral Form",
    "PD Claims", "HITECH", "HIPAA", "Signed Medicare Form", "Signed Contingency Fee Agreement", "ISO Claim Search", "Front Passport Card",
    "Back Passport Card", "Client Communication Disclosure", "Signature Certificate", "Police Report", "Traffic Accident Report",
    "Traffic Ticket", "Insurance vs Lien Disclaimer", "Affidavit of Communication", "Notice and Waiver of Potential Conflict of Interest"];
  const pkNorm = (v) => " " + String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2018\u2019\u02bc`\u00b4\u2032]/g, "'").replace(/\.(pdf|docx?|jpe?g|png)$/i, "")
    .replace(/driver'?s?\s*licen[cs]e/g, "dl").replace(/traffic accident report|\btar\b/g, "tar").replace(/acknowledg(e)?ment/g, "ack")
    .replace(/\bclient(?:'?s'?)?\b/g, "clients").replace(/attorney'?s/g, "attorneys").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  const pkWords = (v) => pkNorm(v).trim().split(" ").filter((w) => w && !["of", "and", "the", "for", "a", "form", "signed"].includes(w)).map((w) => w.length > 3 ? w.replace(/s$/, "") : w);
  // (words that tell two documents apart: a front and a back, the 1P's and the 3P's, a notice and a waiver)
  const PK_QUAL = [["front", "back"], ["1p", "3p"], ["notice", "waiver"]];
  // (a document title and a document name the same document: one's words inside the other's, or most of them shared)
  function sameDoc(a, b){
    const A = pkNorm(a), B = pkNorm(b), wa = pkWords(a), wb = pkWords(b);
    if(!wa.length || !wb.length) return false;
    if(A === B) return true;
    if(PK_QUAL.some((g) => { const qa = g.filter((q) => wa.includes(q)), qb = g.filter((q) => wb.includes(q)); return qa.join() !== qb.join(); })) return false;
    if(A.includes(B) || B.includes(A)) return true;
    const hit = wa.filter((w) => wb.includes(w)).length; return hit / Math.max(wa.length, wb.length) > 0.6;
  }
  // (each extracted file stands for one document of the packet at most: exact names first, then the closest)
  function matchDocs(docs, titles){
    const used = new Set(), got = new Map();
    const pass = (test) => docs.forEach((d, i) => { if(got.has(i)) return; const k = titles.findIndex((t, j) => !used.has(j) && test(t, d)); if(k >= 0){ used.add(k); got.set(i, k); } });
    pass((t, d) => pkNorm(t) === pkNorm(d)); pass(sameDoc);
    return {missing: docs.filter((d, i) => !got.has(i)), wrong: titles.filter((t, j) => !used.has(j))};
  }
  // "INTAKE - Police Report (lory).pdf" → {title: "Police Report", who: "lory"}; null when it isn't in the convention
  function intakeName(n){
    const m = /^\s*intake\s*[-–—]\s*(.+?)\s*\(([^)]+)\)\s*(\.[a-z0-9]{2,5})?\s*$/i.exec(String(n || ""));
    return m ? {title: m[1].trim(), who: m[2].trim()} : null;
  }
  function checkPacket(o){
    o = o || {}; const file = o.file || {}, folder = o.folder || {}, files = (folder.files || []).filter((f) => f && f.name);
    const va = String(o.va || "").trim(), vaWords = pkWords(va), client = String(o.client || "").trim();
    const isVa = (w) => { const x = pkWords(w); return !!x.length && x.some((p) => vaWords.includes(p)); };
    const isPacket = (n) => /\bpacket\b/i.test(String(n || ""));
    const isSheet = (n) => /worksheet/i.test(String(n || ""));
    const pn = intakeName(file.name);
    const extracted = files.filter((f) => !isPacket(f.name) && !isSheet(f.name));
    const misnamed = extracted.filter((f) => { const x = intakeName(f.name); return !x || !isVa(x.who); }).map((f) => f.name);
    const titles = extracted.map((f) => (intakeName(f.name) || {title: f.name}).title);
    const docs = Array.isArray(o.docs) ? o.docs.filter((d) => d && !/^intake packet$/i.test(String(d).trim())) : null;
    const M = docs ? matchDocs(docs, titles) : {missing: [], wrong: []}, missing = M.missing, wrong = M.wrong;
    const folderName = String(folder.name || ""), fw = pkWords(folderName), cw = pkWords(client);
    const folderOk = !!folderName && (cw.length ? cw.filter((w) => w.length > 1).every((w) => fw.includes(w)) : !/assessments?|activities/i.test(folderName));
    const changed = file.modified && o.assignedAt ? Date.parse(file.modified) >= Date.parse(o.assignedAt) : null;
    const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
    const rules = [
      {id: "link", label: "Your corrected packet is linked and opens", pass: !!file.ok,
        detail: file.ok ? (file.name ? `“${file.name}”` : "") : (file.error || "The link is missing or the file can't be opened: share it with the platform (Anyone with the link can view).")},
      {id: "rename", label: "The packet renamed: INTAKE - Packet (Your Name)", pass: !!(pn && /packet/i.test(pn.title) && isVa(pn.who)),
        detail: !file.name ? "" : !pn ? `It reads “${file.name}”: name it INTAKE - Packet (${va || "Your Name"})` : !isVa(pn.who) ? `“(${pn.who})” isn't your name` : !/packet/i.test(pn.title) ? `“${pn.title}” should read Packet` : ""},
      {id: "corrected", label: "Your corrected copy, uploaded after the packet was assigned", pass: changed !== false,
        detail: changed === false ? "The file is older than your assignment: upload the copy you edited" : changed == null ? "" : `Uploaded ${String(file.modified).slice(0, 10)}`},
      {id: "folder", label: `Saved in a subfolder named after your client${client ? ` (${client})` : ""}`, pass: !!folder.ok && folderOk,
        detail: !folder.ok ? (folder.error || "Link the client subfolder you saved the packet and its documents in") : folderOk ? `“${folderName}”` : `The subfolder is “${folderName}”${client ? `: name it after ${client}` : ""}`},
      {id: "packet-in", label: "The renamed packet is in the subfolder with its documents", pass: !!folder.ok && files.some((f) => isPacket(f.name)),
        detail: folder.ok && !files.some((f) => isPacket(f.name)) ? "No packet found in the subfolder" : ""},
      {id: "complete", label: "Every document in the packet extracted", pass: !docs && folder.ok && extracted.length ? null : !!folder.ok && extracted.length > 0 && !missing.length,
        detail: !folder.ok ? "" : !extracted.length ? "No extracted document in the subfolder" : !docs ? `${plural(extracted.length, "document")} extracted (pending: the packet’s own pages couldn’t be read to compare)`
          : missing.length ? `${plural(missing.length, "document")} missing: ${missing.join(", ")}` : `All ${plural(docs.length, "document")} of the packet extracted`},
      {id: "identified", label: "Each document correctly identified", pass: !docs && folder.ok && extracted.length ? null : !!folder.ok && extracted.length > 0 && !wrong.length,
        detail: !docs && folder.ok && extracted.length ? "Pending: the packet’s own pages couldn’t be read to compare (check again, or your trainer reviews it)" : wrong.length ? `Not in the packet (check what each document is): ${wrong.join(", ")}` : ""},
      {id: "naming", label: "Each document named INTAKE - Document (Your Name)", pass: !!folder.ok && extracted.length > 0 && !misnamed.length,
        detail: misnamed.length ? `${plural(misnamed.length, "file")} to rename: ${misnamed.slice(0, 8).join(", ")}${misnamed.length > 8 ? "…" : ""}` : ""},
      {id: "worksheet", label: "The Intake Worksheet kept outside the client subfolder", pass: !files.some((f) => isSheet(f.name)),
        detail: files.some((f) => isSheet(f.name)) ? "Move the worksheet to your Assessments/Activities folder" : ""}];
    // (a point pending — the packet's pages unread — counts neither way, and the check isn't passed until it's read)
    const scored = rules.filter((r) => r.pass !== null), pct = Math.round(100 * scored.filter((r) => r.pass).length / scored.length);
    return {pct, pass: rules.every((r) => r.pass === true), pending: rules.some((r) => r.pass === null), rules, extracted: extracted.length, missing, wrong, misnamed, docsRead: !!docs};
  }

  root.FTTrackerRules = {MONITOR_TOPICS, OPTIONAL_MONITOR_TOPICS, optionalTopic, MONITOR_SCHEDULE, monitorDue, monitorDueOn, trainingDay, googleFile, parseCsv, isoDate, findDate, fromSheetCsv, gradeMonitorText, parseTestShot, TZ, STATUSES, TASK_TYPES, PERIODS, NATURES, DEADLINES, SECTIONS, DEFAULT_CRITERIA,
    ptDate, isWeekday, fmtDate, rid, taskRow, template, isTask, openOn, RULES, startDate, staleDates, checkDay, dayExcerpt, reviewPrompt,
    TRACKER_METRICS, TRACKER_STANDARDS, evalLabel, coverage, weekExcerpt, weekEval, evalHtml, evalText, isSample, checkEod, checkPacket, PACKET_DOCS, intakeName};
})(typeof globalThis !== "undefined" ? globalThis : this);
