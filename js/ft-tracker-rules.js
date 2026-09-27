/* ============================================================
   LSH Daily Task Tracker — shared rules
   Used by the platform page (js/ft-tracker.js: live flags while the
   trainee types) and by worker.js (the automatic daily check). Keep it
   plain JavaScript with no imports so both can load it.
   Add a rule to RULES to extend the daily check; each rule returns
   {pass, pct, detail, flags:[{row, col, msg}]}.
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
    if(!iso) return "";
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

  const RULES = [
    {id: "daily-notes", label: "Daily Notes filled in for every open task",
     run(t, D){
       const rows = ((t && t.tracker && t.tracker.rows) || []).filter((r) => openOn(r, D));
       const hasCol = ((t && t.tracker && t.tracker.noteDates) || []).includes(D);
       if(!rows.length) return {pass: true, pct: 100, detail: "No open tasks on this day.", flags: []};
       const missing = rows.filter((r) => !has(r.notes && r.notes[D]));
       const flags = missing.map((r) => ({row: r.id, col: "note:" + D, msg: `No Daily Note for ${fmtDate(D)}`}));
       const pct = Math.round(100 * (rows.length - missing.length) / rows.length);
       const detail = !hasCol ? `No ${fmtDate(D)} column in Daily Notes yet.`
         : missing.length ? `${missing.length} of ${rows.length} open task${rows.length === 1 ? "" : "s"} ha${missing.length === 1 ? "s" : "ve"} no note for ${fmtDate(D)}.`
         : `All ${rows.length} open task${rows.length === 1 ? "" : "s"} have a note for ${fmtDate(D)}.`;
       return {pass: missing.length === 0, pct, detail, flags};
     }}
  ];

  /* the first day the tracker counts (days before it aren't checked) */
  function startDate(t){ return (t && (t.startDate || (t.createdAt && ptDate(new Date(t.createdAt))))) || ""; }

  /* the daily check: one result per rule, the overall %, and every flagged cell */
  function checkDay(t, D){
    const st = startDate(t);
    if(st && D < st) return {date: D, na: true, pass: true, pct: null, rules: [], flags: []};
    const rules = RULES.map((rule) => Object.assign({id: rule.id, label: rule.label}, rule.run(t, D)));
    const pct = rules.length ? Math.round(rules.reduce((a, r) => a + r.pct, 0) / rules.length) : 100;
    return {date: D, pass: rules.every((r) => r.pass), pct, rules, flags: [].concat(...rules.map((r) => r.flags))};
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

  root.FTTrackerRules = {TZ, STATUSES, TASK_TYPES, PERIODS, NATURES, DEADLINES, SECTIONS, DEFAULT_CRITERIA,
    ptDate, isWeekday, fmtDate, rid, taskRow, template, isTask, openOn, RULES, startDate, checkDay, reviewPrompt};
})(typeof globalThis !== "undefined" ? globalThis : this);
