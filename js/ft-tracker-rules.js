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
    return rows.slice(0, 40).map((r) => `- ${r.type || "(no type)"} | ${String(r.details || "(no details)").slice(0, 300)} | status: ${r.status || "(none)"}` +
      (r.dateReceived ? ` | received ${fmtDate(r.dateReceived)}` : "") + (r.completedOn ? ` | completed ${fmtDate(r.completedOn)}` : "") +
      (has(r.notes && r.notes[D]) ? `\n  Daily Note: ${String(r.notes[D]).slice(0, 600)}` : "") + (has(r.vaNotes) ? `\n  VA Notes: ${String(r.vaNotes).slice(0, 400)}` : "")).join("\n").slice(0, 6000);
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
    const lines = t.split("\n").map((l) => l.trim());
    // the subject: the email's own, else the first line ("Subject: …", or the subject typed as the first line)
    const sub = subj || ((lines.find((l) => has(l)) || "").replace(/^subject\s*:\s*/i, ""));
    const sm = /\b(daily|eod)\s+report\b[^0-9]*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/i.exec(sub);
    const sDate = sm ? `${sm[4].length === 2 ? "20" + sm[4] : sm[4]}-${String(sm[2]).padStart(2, "0")}-${String(sm[3]).padStart(2, "0")}` : "";
    // a part: the lines after its heading, up to the next heading
    const H = [["acc", /accomplishments?|completed tasks/i], ["learn", /things i.?ve learned|learned that i can|learnings?/i], ["queue", /on queue|queue for tomorrow|tomorrow/i]];
    const at_ = {}; lines.forEach((l, i) => { H.forEach(([k, re]) => { if(at_[k] == null && re.test(l) && /:\s*(\(|$)|:\s*$|:\s/.test(l + " ")) at_[k] = i; }); });
    const part = (k) => { if(at_[k] == null) return null; const next = Object.values(at_).filter((v) => v > at_[k]).sort((a, b) => a - b)[0];
      return lines.slice(at_[k] + 1, next == null ? lines.length : next).map((l) => l.replace(/^[-•*•\d.)\s]+/, "").trim()).filter((l) => l.length > 2 && !/^(regards|thank you|thanks|best)[,!.]?$/i.test(l)); };
    const acc = part("acc"), learn = part("learn"), queue = part("queue");
    const sentences = (l) => (String(l).match(/[^.!?]+[.!?]+/g) || []).filter((x) => x.trim().split(/\s+/).length >= 3).length || (String(l).trim().split(/\s+/).length >= 8 ? 1 : 0);
    const goodLearn = (learn || []).filter((l) => sentences(l) >= 2);
    const etHour = (() => { if(!at) return null; try{ return +new Intl.DateTimeFormat("en-US", {timeZone: "America/New_York", hour: "numeric", hour12: false}).format(new Date(at)); }catch(e){ return null; } })();
    const etDate = (() => { if(!at) return ""; try{ const p = new Intl.DateTimeFormat("en-CA", {timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date(at)); return p; }catch(e){ return ""; } })();
    const rules = [
      {id: "subject", label: "The subject: Daily Report mm/dd/yy (or EOD Report mm/dd/yy)", pass: !!sm && (!D || sDate === D),
        detail: !sm ? `It reads "${sub.slice(0, 80) || "(none)"}": write Daily Report ${D ? D.slice(5, 7) + "/" + D.slice(8) + "/" + D.slice(2, 4) : "mm/dd/yy"}` : D && sDate !== D ? `Its date (${sDate}) isn't the day's (${D})` : ""},
      {id: "acc", label: "Accomplishments/Completed Tasks: what was done", pass: !!(acc && acc.length), detail: acc ? (acc.length ? `${acc.length} listed` : "The part is there, but empty") : "The part is missing"},
      {id: "learn", label: "At least 3 learnings, 2 sentences or more each", pass: goodLearn.length >= 3,
        detail: learn ? `${goodLearn.length} of ${learn.length} learning${learn.length === 1 ? "" : "s"} with 2 sentences or more (3 needed)` : "The part (These are the things I've learned…) is missing"},
      {id: "queue", label: "On queue for tomorrow: the next tasks", pass: !!(queue && queue.length), detail: queue ? (queue.length ? `${queue.length} listed` : "The part is there, but empty") : "The part is missing"},
      {id: "time", label: "Sent before the end of the shift (5:00 PM ET)", pass: etHour == null ? true : (!D || etDate <= D) && (etDate < D || etHour < 17),
        detail: etHour == null ? "" : `Sent ${etDate} at ${etHour}:00 ET`}];
    const pct = Math.round(100 * rules.filter((r) => r.pass).length / rules.length);
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

  root.FTTrackerRules = {MONITOR_TOPICS, OPTIONAL_MONITOR_TOPICS, optionalTopic, googleFile, parseCsv, isoDate, findDate, fromSheetCsv, gradeMonitorText, parseTestShot, TZ, STATUSES, TASK_TYPES, PERIODS, NATURES, DEADLINES, SECTIONS, DEFAULT_CRITERIA,
    ptDate, isWeekday, fmtDate, rid, taskRow, template, isTask, openOn, RULES, startDate, staleDates, checkDay, dayExcerpt, reviewPrompt, checkEod, checkPacket, PACKET_DOCS, intakeName};
})(typeof globalThis !== "undefined" ? globalThis : this);
