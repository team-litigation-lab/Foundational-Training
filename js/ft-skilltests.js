/* ============================================================
   🧪 THE DAILY TYPING AND SPELLING TESTS — taken on the platform, logged on their own
   ------------------------------------------------------------
   The Training Guide asks for a Typing Test twice a day (morning and before the end of the shift) and a
   Spelling Test once a day, each proven with a screenshot named "Typing Test [date][AM/PM]". Checking those
   screenshots — cropped, no timestamp, a missing entry — was most of the trainer's weekly compliance notes.
   Here the tests run on the page (#/skills), and every result is logged with its date and AM/PM slot:
     ⌨ Typing Test   — 60 seconds on a passage about the work; gross and net WPM, accuracy, errors. No pasting.
     🔤 Spelling Test — 15 words read aloud (the browser's own voice) in a sentence; type each one. Score and the
                        corrections. Words come from the course: legal, medical and everyday business words.
   A missed slot can be made up later, as the guide allows: the trainee picks the slot first, and the log says
   it was made up and when.

   The trainer (Admin → 🏅 Scorecard → 🧪 Typing & Spelling): every trainee of a batch, day by day — the AM and
   PM typing tests and the spelling test, done, made up or missing — with averages, and for any date range the
   compliance line in the facilitator's wording ("Typing Test – Complied; however, lacking 1 entry (10/2 PM)"),
   which the 📊 Weekly Ranking's Spelling & Typing column ⤓ fills itself.

   Storage: skills:<id> = {typing: [...], spelling: [...]} — the trainee's own, append-only: worker.js keeps the
   entries already there, takes only new ones (stamping the server's time on each) and caps the list.

   📷 Screenshots in Drive count too. Trainees who take the tests on TypingClub / SpellQuiz and save the screenshot in
   their Drive folder (the one linked in 📁 My Drive links) are monitored every day: the Worker's end-of-shift check
   (and 🔄 Check my Drive, and the trainer's 📷 Check Drive now) finds each "Typing Test [date][AM/PM]" / "Spelling Test
   [date]" file and writes the list into trackerreview:<id>.shots (worker.js checkShots, TR.parseTestShot). A screenshot
   fills its day's slot the way a test taken here does; one uploaded after its day counts as made up. The 📚 Dashboard's
   two tiles (today's tests, the compliance so far) and 🏅 My Performance's Daily compliance read both.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const TARGET = 60;                 // LSH's clients look for 60 WPM (js/ft-rules.js)
const SECS = 60;
const WORDS_PER_TEST = 15;

/* ---------- the passages: the work a Legal VA does, in plain sentences ---------- */
const PASSAGES = [
  "A Legal VA answers the phone with the firm's name and their own, then listens before speaking. When a caller asks about a case, the VA confirms the client's full name, date of birth and date of loss before sharing anything. A clear note goes into the case file the same day, so the attorney never has to ask twice.",
  "Before an appointment is booked, the VA checks the attorney's calendar for open slots, keeps the buffer before and after each meeting, and confirms the time zone with the caller. The event title names the meeting type and the client, and a reminder is set for the day before.",
  "An intake call starts with the basics: who was hurt, where and when it happened, and whether a police report was filed. The VA asks about injuries and treatment, writes down the insurance details exactly as given, and tells the caller what happens next and when someone will call back.",
  "A letter of representation tells an insurance company that the firm now represents the client. The VA fills in the claim number, the adjuster's name and the date of loss, removes every highlighted placeholder, and saves the final letter with the correct file name before it is sent.",
  "Medical records arrive by fax, email or portal. The VA saves each document under the right provider, names it with the date of service, and reports in the notes tab what was received and where it was saved. A clean file lets the demand writer find every bill in seconds.",
  "Protected health information is shared only with the people who need it. The VA never reads a client's records aloud in a public space, never forwards them to a personal email, and always double checks the recipient before pressing send. One careless message can cost the firm a client.",
  "When a lien holder asks for a balance verification, the VA confirms the amount owed, the dates of service and any payments already made. The request is saved with the provider's name and the date, and the reply is logged in the tasks tab so the negotiator can act on it quickly.",
  "A good daily tracker shows what was done, how long it took and what is still pending. The VA writes each entry in complete sentences, links the output, and flags anything that is blocked. At the end of the shift, a quick review catches the items that would otherwise slip to tomorrow.",
  "Clients often call when they are worried or in pain. The VA speaks calmly, uses the client's name, and avoids legal advice. If the question is for the attorney, the VA promises a callback, gives a realistic time frame, and makes sure the message reaches the right person before the day ends.",
  "Settlement work needs care with numbers. The net sheet lists the gross settlement, the attorney's fees, the case costs and every lien, and the client's share must match the closing statement exactly. The VA checks each figure twice before the documents go out for signature."
];

/* ---------- the spelling words, each in a sentence the voice reads ---------- */
const WORDS = [
  ["attorney", "The attorney will call you back this afternoon."], ["liability", "The other driver accepted liability for the crash."],
  ["negligence", "The claim is based on the driver's negligence."], ["plaintiff", "Our client is the plaintiff in this case."],
  ["defendant", "The defendant's insurer sent a letter today."], ["settlement", "The settlement check arrived this morning."],
  ["disbursement", "The disbursement goes out after every lien is paid."], ["deposition", "Her deposition is scheduled for Friday."],
  ["interrogatories", "Please answer the interrogatories by next week."], ["subpoena", "The records were requested with a subpoena."],
  ["affidavit", "The witness signed an affidavit."], ["jurisdiction", "The court has jurisdiction over this matter."],
  ["litigation", "The case may go to litigation if the offer is low."], ["statute", "The statute of limitations is two years."],
  ["subrogation", "The health plan asserted a subrogation claim."], ["indemnity", "The contract includes an indemnity clause."],
  ["privilege", "Attorney-client privilege protects these notes."], ["confidential", "This information is confidential."],
  ["correspondence", "Save all correspondence in the documents tab."], ["acknowledgment", "We sent an acknowledgment of the claim."],
  ["adjuster", "The adjuster asked for the police report."], ["premises", "She slipped on the store's premises."],
  ["malpractice", "This is a medical malpractice case."], ["chiropractor", "He sees a chiropractor twice a week."],
  ["rehabilitation", "Her rehabilitation will take three months."], ["orthopedic", "The orthopedic surgeon reviewed the X-rays."],
  ["radiology", "The radiology report is attached."], ["diagnosis", "The diagnosis was a fractured wrist."],
  ["prognosis", "The doctor gave a good prognosis."], ["laceration", "The laceration needed six stitches."],
  ["contusion", "He has a contusion on his left knee."], ["concussion", "She was treated for a concussion."],
  ["vertebrae", "Two vertebrae were injured in the fall."], ["ambulance", "The ambulance arrived within minutes."],
  ["prescription", "Keep the receipt for every prescription."], ["physician", "The physician signed the records."],
  ["receipt", "Please confirm receipt of the documents."], ["necessary", "Only share what is necessary."],
  ["accommodate", "We can accommodate a morning meeting."], ["occurrence", "Describe the occurrence in your own words."],
  ["conscientious", "A conscientious VA double checks every name."], ["embarrass", "Never embarrass a client on a call."],
  ["harass", "We do not harass callers for payment."], ["liaison", "The VA acts as a liaison with the provider."],
  ["maintenance", "The building's maintenance log was requested."], ["miscellaneous", "File it under miscellaneous expenses."],
  ["questionnaire", "Send the client the intake questionnaire."], ["separate", "Keep each document in a separate file."],
  ["supersede", "The new policy will supersede the old one."], ["threshold", "The claim exceeds the policy threshold."],
  ["guarantee", "We cannot guarantee the outcome of a case."], ["independent", "An independent medical exam was ordered."],
  ["judgment", "The judgment was entered last month."], ["license", "Please send a copy of your driver's license."],
  ["noticeable", "There was a noticeable dent in the bumper."], ["occasionally", "The client occasionally misses calls."],
  ["possession", "The insurer has possession of the vehicle."], ["proceed", "You may proceed with the request."],
  ["precede", "A short call will precede the meeting."], ["recommend", "We recommend that you keep a pain journal."],
  ["referred", "She was referred to a specialist."], ["schedule", "Let me check the attorney's schedule."],
  ["sincerely", "End the letter with sincerely."], ["surveillance", "The store's surveillance video was requested."],
  ["thorough", "Be thorough when you review the file."], ["unanimous", "The decision was unanimous."],
  ["unnecessary", "Avoid unnecessary details in the notes."], ["accessible", "Keep the files accessible to the team."],
  ["beneficiary", "Name the beneficiary on the form."], ["calendar", "Add the hearing to the calendar."],
  ["colleague", "Ask a colleague to review your draft."], ["deductible", "The deductible is five hundred dollars."],
  ["emergency", "He went to the emergency room that night."], ["facsimile", "Send it by facsimile or by email."],
  ["immediately", "Report the error immediately."], ["insurance", "Write down the insurance policy number."],
  ["mortgage", "She worried about her mortgage payment."], ["pharmacy", "The pharmacy records were received."],
  ["questionable", "The second bill looks questionable."], ["representative", "A representative will contact you."],
  ["accident", "The accident happened on the highway."], ["appointment", "Your appointment is at ten o'clock."],
  ["compensation", "The client is asking about compensation."], ["occurred", "The fall occurred on a wet floor."]
];

/* ---------- the record ---------- */
const S = {id: null, rec: null, shots: null, loading: null, run: null, tick: null, admin: null, voice: null, busy: false};
const blank = () => ({typing: [], spelling: []});
const pad = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const slotOf = d => d.getHours() < 12 ? "AM" : "PM";
const md = k => { const [y, m, d] = String(k).split("-"); return `${Number(m)}/${Number(d)}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function load(force){
  const id = state.traineeId; if(!id) return Promise.resolve(null);
  if(S.loading) return S.loading;
  if(!force && S.id === id && S.rec) return Promise.resolve(S.rec);
  S.loading = Promise.all([sharedGet("skills:" + id), sharedGet("trackerreview:" + id).catch(() => null)])
    .then(([v, rv]) => { S.id = id; S.rec = v && typeof v === "object" ? Object.assign(blank(), v) : blank(); S.shots = (rv && rv.shots) || null; })
    .catch(() => { if(!S.rec) S.rec = blank(); }).then(() => { S.loading = null; if(state.view === "skills" || state.view === "modules") render(); return S.rec; });
  return S.loading;
}
async function addEntry(kind, entry){
  const id = state.traineeId; if(!id){ toast("Sign in to save your result."); return false; }
  await load();
  const now = new Date();
  entry = Object.assign({id: uid(), at: now.toISOString(), date: dayKey(now), slot: slotOf(now), tz: -now.getTimezoneOffset()}, entry);
  S.rec[kind] = (S.rec[kind] || []).concat([entry]);
  const ok = await sharedSet("skills:" + id, S.rec);
  if(ok === false){ toast("Couldn’t save your result. Check your connection and take it again."); return false; }
  load(true);
  return true;
}

// the test log with the Drive screenshots found (trackerreview:<id>.shots), as the compliance counts it; addEntry saves S.rec alone
const withShots = (rec, shots) => Object.assign(blank(), rec || {}, {shots: (shots && Array.isArray(shots.files) ? shots.files : [])});
const full = () => withShots(S.rec, S.shots);

/* ---------- compliance: which slots a day needs, and which ones are done ---------- */
// A training day is a weekday from the trainee's first test (or the day they registered) to today.
function trainingDays(rec, from, to){
  const out = [], d = new Date(from + "T12:00:00"), end = new Date(to + "T12:00:00");
  for(let i = 0; d <= end && i < 400; i++, d.setDate(d.getDate() + 1)) if(d.getDay() !== 0 && d.getDay() !== 6) out.push(dayKey(d));
  return out;
}
// what each day has: AM and PM typing, the spelling test; a make-up fills the slot it was taken for
function ledger(rec){
  const L = {};
  const put = (k, slot, x) => { (L[k] = L[k] || {})[slot] = L[k][slot] || x; };
  (rec.typing || []).forEach(t => { if(t.makeup) put(t.makeup.split(" ")[0], t.makeup.split(" ")[1], Object.assign({made: t.date}, t)); else put(t.date, t.slot, t); });
  (rec.spelling || []).forEach(s => { if(s.makeup) put(s.makeup.split(" ")[0], "SP", Object.assign({made: s.date}, s)); else put(s.date, "SP", s); });
  // 📷 a screenshot in Drive fills a slot nothing taken here filled; uploaded on a later day, it was made up
  (rec.shots || []).forEach(f => { if(!f || !f.date) return; put(f.date, f.kind === "spelling" ? "SP" : f.slot === "PM" ? "PM" : "AM", Object.assign({shot: true}, f, f.up && f.up > f.date ? {made: f.up} : {})); });
  return L;
}
// today isn't over: its slots only count as missing from tomorrow on
function missing(rec, from, to){
  const L = ledger(rec), out = [], today = dayKey(new Date());
  trainingDays(rec, from, to).filter(k => k < today).forEach(k => { const x = L[k] || {};
    ["AM", "PM"].forEach(s => { if(!x[s]) out.push({kind: "typing", date: k, slot: s}); });
    if(!x.SP) out.push({kind: "spelling", date: k, slot: "SP"}); });
  return out;
}
// the facilitator's wording, as in her weekly ranking report. A trainee's days start at the earlier of the day they
// registered (since) and their first test, never before the range asked for.
function startOf(rec, from, since){ const s = [since, firstDay(rec)].filter(Boolean).sort()[0]; return s && s > from ? s : from; }
function complianceText(rec, from, to, since){
  from = startOf(rec, from, since);
  const miss = missing(rec, from, to), L = ledger(rec);
  const made = Object.entries(L).filter(([k]) => k >= from && k <= to).flatMap(([k, x]) => Object.entries(x).filter(([s, v]) => v.made).map(([s, v]) => ({k, s})));
  const line = (name, list, mk) => {
    if(!list.length) return `${name} – Complete${mk.length ? ` (${mk.length} made up)` : ""}`;
    const items = list.map(m => m.slot === "SP" ? md(m.date) : `${md(m.date)} ${m.slot}`);
    return `${name} – Complied; however, lacking ${list.length} entr${list.length === 1 ? "y" : "ies"} (${items.join(", ")})`;
  };
  const sp = miss.filter(m => m.kind === "spelling"), ty = miss.filter(m => m.kind === "typing");
  if(!(rec.typing || []).length && !(rec.spelling || []).length && !(rec.shots || []).length) return "NO SUBMISSION";
  return [line("Spelling Test", sp, made.filter(x => x.s === "SP")), line("Typing Test", ty, made.filter(x => x.s !== "SP"))].join("\n");
}
function averages(rec, n){
  const t = (rec.typing || []).slice(-(n || 10)), s = (rec.spelling || []).slice(-(n || 10));
  const avg = (a, f) => a.length ? Math.round(a.reduce((x, y) => x + (Number(f(y)) || 0), 0) / a.length) : null;
  return {net: avg(t, x => x.net), acc: avg(t, x => x.acc), spell: avg(s, x => x.total ? x.score / x.total * 100 : 0), nt: t.length, ns: s.length};
}
const firstDay = rec => { const ds = (rec.typing || []).concat(rec.spelling || [], rec.shots || []).map(x => x.date).filter(Boolean).sort(); return ds[0] || dayKey(new Date()); };
// the share of the slots due (3 a weekday: Typing AM and PM, Spelling) that were done, made up or not, from the trainee's
// first day to yesterday (today isn't over), plus today's own three
function compliance(rec, since){
  const today = dayKey(new Date()), from = startOf(rec, "", since), L = ledger(rec);
  const due = trainingDays(rec, from, today).filter(k => k < today);
  let done = 0, made = 0; due.forEach(k => ["AM", "PM", "SP"].forEach(s => { const x = (L[k] || {})[s]; if(x){ done++; if(x.made) made++; } }));
  const need = due.length * 3, t = L[today] || {};
  return {need, done, made, lacking: need - done, pct: need ? Math.round(done / need * 100) : null, today: {AM: t.AM || null, PM: t.PM || null, SP: t.SP || null}, from};
}

/* ---------- ⌨ the typing test ---------- */
function startTyping(makeup){
  const p = PASSAGES[Math.floor(Math.random() * PASSAGES.length)];
  S.run = {kind: "typing", passage: p, typed: "", started: 0, left: SECS, done: null, makeup: makeup || ""};
  render();
  setTimeout(() => { const t = document.getElementById("stType"); if(t) t.focus(); }, 30);
}
function typingStats(r, secs){
  const typed = r.typed, p = r.passage, mins = Math.max(secs, 1) / 60;
  let correct = 0; for(let i = 0; i < typed.length; i++) if(typed[i] === p[i]) correct++;
  const errors = typed.length - correct, gross = Math.round(typed.length / 5 / mins);
  return {gross, net: Math.max(0, Math.round((typed.length / 5 - errors) / mins)), acc: typed.length ? Math.round(correct / typed.length * 100) : 0, errors, chars: typed.length, secs: Math.round(secs)};
}
function paintTyping(){
  const r = S.run; if(!r || r.kind !== "typing") return;
  const box = document.getElementById("stPassage"); if(!box) return;
  const t = r.typed, p = r.passage;
  let html = ""; for(let i = 0; i < p.length; i++){ const c = p[i] === " " ? " " : e(p[i]);
    html += i < t.length ? `<span class="${t[i] === p[i] ? "ok" : "bad"}">${c}</span>` : i === t.length ? `<span class="cur">${c}</span>` : c; }
  box.innerHTML = html;
  const secs = r.started ? (Date.now() - r.started) / 1000 : 0, st = typingStats(r, secs);
  const clock = document.getElementById("stClock"); if(clock) clock.textContent = r.started ? `${Math.max(0, Math.ceil(SECS - secs))}s` : `${SECS}s`;
  const live = document.getElementById("stLive"); if(live) live.textContent = r.started ? `${st.net} WPM · ${st.acc}% accuracy` : "The clock starts with your first key.";
}
async function finishTyping(){
  const r = S.run; if(!r || r.done) return;
  clearInterval(S.tick); S.tick = null;
  const secs = Math.min(SECS, (Date.now() - r.started) / 1000), st = typingStats(r, secs);
  r.done = st; render();
  if(st.chars < 20){ toast("Too short to count: type for the whole minute."); return; }
  const ok = await addEntry("typing", Object.assign({passage: PASSAGES.indexOf(r.passage)}, st, r.makeup ? {makeup: r.makeup} : {}));
  if(ok) toast(`⌨ Saved: ${st.net} WPM, ${st.acc}% accuracy.`);
}

/* ---------- 🔤 the spelling test ---------- */
const canSpeak = () => typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
function pickVoice(){
  if(!canSpeak()) return null;
  const vs = speechSynthesis.getVoices() || [];
  return vs.find(v => /en[-_]US/i.test(v.lang) && /female|samantha|aria|jenny|google us/i.test(v.name)) || vs.find(v => /en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
function say(text, slow){
  if(!canSpeak()) return;
  try{ speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); const v = S.voice || (S.voice = pickVoice()); if(v) u.voice = v; u.lang = "en-US"; u.rate = slow ? 0.65 : 0.85; speechSynthesis.speak(u); }catch(err){}
}
function startSpelling(makeup){
  const pool = WORDS.slice(); for(let i = pool.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  S.run = {kind: "spelling", words: pool.slice(0, WORDS_PER_TEST), i: 0, answers: [], done: null, makeup: makeup || "", text: !canSpeak()};
  render(); sayCurrent();
}
function sayCurrent(slow){ const r = S.run; if(!r || r.kind !== "spelling" || r.done) return; const [w, s] = r.words[r.i]; say(`${w}. ${s} ${w}.`, slow); setTimeout(() => { const i = document.getElementById("stSpell"); if(i) i.focus(); }, 30); }
const masked = (w, s) => s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "_".repeat(w.length));
async function nextWord(){
  const r = S.run; if(!r || r.kind !== "spelling" || r.done) return;
  const inp = document.getElementById("stSpell"); const v = String(inp ? inp.value : "").trim();
  if(!v){ toast("Type the word first (or ▶ hear it again)."); return; }
  r.answers.push(v); r.i++;
  if(r.i < r.words.length){ render(); sayCurrent(); return; }
  const missed = r.words.map(([w], i) => ({word: w, typed: r.answers[i]})).filter(x => x.typed.toLowerCase() !== x.word.toLowerCase());
  r.done = {score: r.words.length - missed.length, total: r.words.length, missed};
  render();
  const ok = await addEntry("spelling", Object.assign({score: r.done.score, total: r.done.total, missed: missed.slice(0, 30), words: r.words.map(x => x[0])}, r.text ? {mode: "text"} : {}, r.makeup ? {makeup: r.makeup} : {}));
  if(ok) toast(`🔤 Saved: ${r.done.score} of ${r.done.total}.`);
}

/* ---------- the trainee's page ---------- */
function todayCard(rec){
  const k = dayKey(new Date()), L = ledger(rec)[k] || {};
  const cell = (label, x, fmt) => `<div class="st-slot ${x ? "done" : ""}"><b>${label}</b><span>${!x ? "Not yet" : x.shot ? `<a href="${e(x.link)}" target="_blank" rel="noopener noreferrer" title="${e(x.name)}">📷 Screenshot in Drive</a>` : fmt(x)}</span></div>`;
  return `<div class="st-today">${cell("⌨ Typing · AM", L.AM, x => `${x.net} WPM · ${x.acc}%`)}${cell("⌨ Typing · PM", L.PM, x => `${x.net} WPM · ${x.acc}%`)}${cell("🔤 Spelling", L.SP, x => `${x.score} / ${x.total}`)}</div>`;
}
function runHtml(){
  const r = S.run;
  if(r.kind === "typing"){
    if(r.done) return `<div class="card st-run"><h2>⌨ Your result</h2><div class="st-big"><b>${r.done.net}</b><span>net WPM</span></div>
      <p class="st-res">${r.done.gross} gross WPM · ${r.done.acc}% accuracy · ${r.done.errors} error${r.done.errors === 1 ? "" : "s"} · ${r.done.secs}s${r.makeup ? ` · make-up for ${e(md(r.makeup.split(" ")[0]))} ${e(r.makeup.split(" ")[1])}` : ""}</p>
      <p class="st-note">${r.done.net >= TARGET ? "At or above the 60 WPM clients look for. Keep it there." : `Clients look for ${TARGET} WPM: ${TARGET - r.done.net} to go. Accuracy first, then speed.`}</p>
      <div class="st-acts"><button class="btn btn-ghost btn-sm" onclick="FTSkills.close()">Done</button></div></div>`;
    return `<div class="card st-run"><div class="st-runh"><h2>⌨ Typing Test</h2><span class="st-clock" id="stClock">${SECS}s</span></div>
      <p class="st-note">Type the passage exactly, capitals and punctuation included. The clock starts with your first key and stops at ${SECS} seconds. Pasting is off.</p>
      <div class="st-passage" id="stPassage" aria-hidden="true"></div>
      <textarea id="stType" class="st-type" rows="4" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" aria-label="Type the passage here"
        oninput="FTSkills.type(this)" onpaste="event.preventDefault();toast('Pasting is off for the test.')" ondrop="event.preventDefault()"></textarea>
      <div class="st-acts"><span class="st-live" id="stLive"></span><button class="btn btn-ghost btn-sm" onclick="FTSkills.close()">Cancel</button></div></div>`;
  }
  if(r.done) return `<div class="card st-run"><h2>🔤 Your result</h2><div class="st-big"><b>${r.done.score}</b><span>of ${r.done.total}</span></div>
      ${r.done.missed.length ? `<table class="st-miss"><thead><tr><th>You typed</th><th>Correct spelling</th></tr></thead><tbody>${r.done.missed.map(m => `<tr><td class="bad">${e(m.typed)}</td><td class="ok">${e(m.word)}</td></tr>`).join("")}</tbody></table>
        <p class="st-note">Add the words you missed to your notes, and practise them in your idle time.</p>` : `<p class="st-note">Every word right. Well done.</p>`}
      <div class="st-acts"><button class="btn btn-ghost btn-sm" onclick="FTSkills.close()">Done</button></div></div>`;
  const [w, s] = r.words[r.i];
  return `<div class="card st-run"><div class="st-runh"><h2>🔤 Spelling Test</h2><span class="st-clock">${r.i + 1} / ${r.words.length}</span></div>
      ${r.text ? `<p class="st-note">This browser can’t read words aloud, so each word is shown as a blank in its sentence. For the real test, use Chrome or Edge.</p><p class="st-sent">${e(masked(w, s))}</p>`
        : `<p class="st-note">Listen to the word in its sentence, then type it. Press Enter for the next word.</p>
           <div class="st-acts"><button class="btn btn-navy btn-sm" onclick="FTSkills.say()">▶ Hear it again</button><button class="btn btn-ghost btn-sm" onclick="FTSkills.say(true)">🐢 Slower</button></div>`}
      <input id="stSpell" class="st-spell" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Type the word" onkeydown="if(event.key==='Enter'){event.preventDefault();FTSkills.next();}" onpaste="event.preventDefault()">
      <div class="st-acts"><button class="btn btn-navy btn-sm" onclick="FTSkills.next()">${r.i + 1 < r.words.length ? "Next word →" : "Finish"}</button><button class="btn btn-ghost btn-sm" onclick="FTSkills.close()">Cancel</button></div></div>`;
}
function renderTrainee(){
  if(!state.traineeId) return `<div class="card" style="padding:24px;">Sign in to take your tests.</div>`;
  if(!S.rec || S.id !== state.traineeId){ load(); return `<div class="card" style="padding:24px;text-align:center;color:var(--ink-soft);">Opening your test log…</div>`; }
  if(S.run) return runHtml();
  const rec = full(), today = dayKey(new Date()), from = firstDay(rec), miss = missing(rec, from, today).filter(m => m.date < today).slice(-12), av = averages(rec);
  const hist = (rec.typing || []).map(x => Object.assign({k: "t"}, x)).concat((rec.spelling || []).map(x => Object.assign({k: "s"}, x))).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 14);
  return `<div class="st-hero"><p class="lp-eyebrow">🛠 Practice Lab · Skill Building</p><h1>🧪 Typing &amp; Spelling Tests</h1>
      <p>Twice a day for typing (morning, and before the end of your shift), once a day for spelling. They are a daily deliverable, and your compliance is on your scorecard. Take them here (each result is saved with its date and time), or on the training’s sites with the screenshot saved in your Drive folder.</p></div>
    ${todayCard(rec)}
    ${shotsCard(rec)}
    <div class="st-start">
      <div class="card st-card"><h3>⌨ Typing Test</h3><p>${SECS} seconds on a passage about the work. Clients look for <b>${TARGET} WPM</b>.</p><button class="btn btn-navy" onclick="FTSkills.typing()">Start the typing test</button></div>
      <div class="card st-card"><h3>🔤 Spelling Test</h3><p>${WORDS_PER_TEST} words read aloud in a sentence: legal, medical and business words from the course.</p><button class="btn btn-navy" onclick="FTSkills.spelling()">Start the spelling test</button></div>
    </div>
    ${miss.length ? `<div class="card st-makeup"><h3>Missed tests to make up</h3><p class="st-note">The guide asks you to make up a missed test in your idle time. Pick the one you are making up, then take it.</p>
      <div class="st-chips">${miss.map(m => `<button class="btn btn-ghost btn-sm" onclick="FTSkills.makeup('${m.kind}','${m.date} ${m.slot === "SP" ? "SP" : m.slot}')">${m.kind === "typing" ? "⌨ Typing" : "🔤 Spelling"} · ${e(md(m.date))}${m.slot === "SP" ? "" : " " + m.slot}</button>`).join("")}</div></div>` : ""}
    <div class="card st-hist"><div class="st-histh"><h3>Your log</h3><span>${av.net != null ? `Typing: <b>${av.net} WPM</b> net, ${av.acc}% accuracy (last ${av.nt})` : "No typing test yet"} · ${av.spell != null ? `Spelling: <b>${av.spell}%</b> (last ${av.ns})` : "No spelling test yet"}</span></div>
      ${hist.length ? `<table class="st-tbl"><thead><tr><th>When</th><th>Test</th><th>Result</th><th></th></tr></thead><tbody>${hist.map(x => `<tr><td>${e(md(x.date))} · ${e(x.slot)}</td><td>${x.k === "t" ? "⌨ Typing" : "🔤 Spelling"}</td>
        <td>${x.k === "t" ? `${e(x.net)} WPM · ${e(x.acc)}%` : `${e(x.score)} / ${e(x.total)}`}</td><td>${x.makeup ? `<span class="st-tag">make-up for ${e(md(x.makeup.split(" ")[0]))}${x.makeup.split(" ")[1] !== "SP" ? " " + e(x.makeup.split(" ")[1]) : ""}</span>` : ""}</td></tr>`).join("")}</tbody></table>`
        : `<p class="st-note">Your results show here as you take the tests.</p>`}</div>`;
}

// 📷 the screenshots found in the trainee's Drive folder: how to name them, the last check, and 🔄 Check my Drive
function shotsCard(rec){
  const sh = S.shots, files = (rec.shots || []).slice().reverse().slice(0, 8), c = compliance(rec, String(state.traineeRegisteredAt || "").slice(0, 10));
  const err = sh && sh.error ? (sh.error === "no-folder" ? "Link your Drive folder first: 📁 My Drive links, on your Task Tracker page." : "The system couldn’t open your Drive folder. Share it as “Anyone with the link” → Viewer.") : "";
  const when = sh && sh.checkedAt ? new Date(sh.checkedAt).toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) : "";
  return `<div class="card st-shots"><div class="st-histh"><h3>📷 Screenshots in your Drive</h3>
      <span>${c.pct != null ? `Compliance so far: <b>${c.pct}%</b>${c.lacking ? ` · ${c.lacking} lacking` : ""}` : "Your compliance starts with your first training day."}</span></div>
    <p class="st-note">Took a test on TypingClub, TypingTest.com, SpellQuiz or Spelling-Test.com? Save the screenshot in your Drive folder (the one in 📁 My Drive links) named <b>Typing Test ${e(md(dayKey(new Date())))} AM</b>, <b>Typing Test ${e(md(dayKey(new Date())))} PM</b> or <b>Spelling Test ${e(md(dayKey(new Date())))}</b>. It is checked at the end of every shift, and counts as the test for that day and slot.</p>
    ${err ? `<p class="st-note st-err">${e(err)}</p>` : ""}
    ${files.length ? `<ul class="st-files">${files.map(f => `<li><a href="${e(f.link)}" target="_blank" rel="noopener noreferrer">${e(f.name)}</a><span>${f.kind === "typing" ? "⌨ Typing" : "🔤 Spelling"} · ${e(md(f.date))}${f.kind === "typing" ? " " + e(f.slot) : ""}${f.up && f.up > f.date ? ` · <span class="st-tag">uploaded ${e(md(f.up))}</span>` : ""}${f.named ? "" : ` · <span class="st-tag">date from the upload</span>`}</span></li>`).join("")}</ul>` : ""}
    <div class="st-acts"><button class="btn btn-ghost btn-sm" ${S.busy ? "disabled" : ""} onclick="FTSkills.checkDrive()">${S.busy ? "Checking…" : "🔄 Check my Drive"}</button>${when ? `<span class="st-live">Last checked ${e(when)}${sh && !sh.error ? ` · ${(sh.files || []).length} screenshot${(sh.files || []).length === 1 ? "" : "s"} found` : ""}</span>` : ""}</div></div>`;
}

/* ---------- the trainer: a batch, day by day ---------- */
const AD = {people: null, recs: {}, shots: {}, loading: false, batch: "", from: "", to: "", busy: false};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
async function loadAdmin(){
  AD.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    AD.people = list.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected).map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", since: String(r.registeredAt || "").slice(0, 10)})).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!AD.batch){ const bs = [...new Set(AD.people.map(p => bLabel(p.batch)).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
    const ppl = AD.people, vals = [];
    const keys = ppl.flatMap(p => ["skills:" + p.id, "trackerreview:" + p.id]);
    for(let i = 0; i < keys.length; i += 96) vals.push(...await sharedGetMany(keys.slice(i, i + 96)));
    AD.recs = {}; AD.shots = {};
    ppl.forEach((p, i) => { const v = vals[i * 2], rv = vals[i * 2 + 1]; AD.shots[p.id] = (rv && rv.shots) || null; AD.recs[p.id] = withShots(v && typeof v === "object" ? v : blank(), AD.shots[p.id]); });
  }catch(err){ AD.people = []; }
  AD.loading = false; if((state.view === "admin" && state.adminTab === "skilltests") || state.view === "modules") render();
}
function renderAdmin(){
  if(!AD.people){ if(!AD.loading) loadAdmin(); return `<div class="card" style="padding:24px;text-align:center;color:var(--ink-soft);">Collecting the test logs…</div>`; }
  const bs = [...new Set(AD.people.map(p => bLabel(p.batch)).filter(Boolean))].sort();
  const ppl = AD.people.filter(p => bLabel(p.batch) === AD.batch);
  const today = dayKey(new Date());
  const to = AD.to || today, from = AD.from || (() => { const d = new Date(); d.setDate(d.getDate() - 9); return dayKey(d); })();
  const days = trainingDays(null, from, to);
  // today at a glance: who has all three, who has some, who has none yet
  const tday = ppl.map(p => { const x = ledger(AD.recs[p.id] || blank())[today] || {}; return ["AM", "PM", "SP"].filter(s => x[s]).length; });
  const last = ppl.map(p => AD.shots[p.id] && AD.shots[p.id].checkedAt).filter(Boolean).sort().pop();
  const noFolder = ppl.filter(p => !AD.shots[p.id] || AD.shots[p.id].error).length;
  return `<div class="card st-admin"><div class="ff-bar"><div><h3>🧪 Typing &amp; Spelling</h3><p class="fss-muted">Every trainee’s daily tests, taken on the platform or saved as a screenshot in their Drive folder (📷, checked at the end of every shift): ✓ done, ↺ made up later, ✗ missing. The compliance line is the facilitator’s wording for the dates shown; the 📊 Weekly Ranking fills its Spelling &amp; Typing column from it.</p></div>
      <span class="st-filters"><select onchange="FTSkills.batch(this.value)">${bs.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("") || "<option>No batches</option>"}</select>
        <label>From <input type="date" value="${e(from)}" onchange="FTSkills.range('from', this.value)"></label><label>To <input type="date" value="${e(to)}" onchange="FTSkills.range('to', this.value)"></label>
        <button class="btn btn-ghost btn-sm" onclick="FTSkills.reload()">↻</button>
        <button class="btn btn-navy btn-sm" ${AD.busy || !ppl.length ? "disabled" : ""} onclick="FTSkills.checkBatch()">${AD.busy ? "Checking…" : "📷 Check Drive now"}</button></span></div>
    ${ppl.length ? `<div class="st-glance"><span><b>Today ${e(md(today))}</b></span><span class="ok">✓ All 3 done: <b>${tday.filter(n => n === 3).length}</b></span><span class="mk">Partly: <b>${tday.filter(n => n && n < 3).length}</b></span><span class="no">None yet: <b>${tday.filter(n => !n).length}</b></span>
      <span class="fss-muted">${last ? `Drive last checked ${e(new Date(last).toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}))}` : "Drive not checked yet"}${noFolder ? ` · ${noFolder} without a readable Drive folder` : ""}</span></div>` : ""}
    ${ppl.length ? `<div class="ff-scroll"><table class="ff-tbl st-grid"><thead><tr><th>Trainee</th><th>Typing (last 10)</th><th>Spelling</th>${days.map(k => `<th>${e(md(k))}</th>`).join("")}<th>Compliance (${e(md(from))} to ${e(md(to))})</th></tr></thead><tbody>
      ${ppl.map(p => { const rec = AD.recs[p.id] || blank(), L = ledger(rec), av = averages(rec);
        const start = startOf(rec, from, p.since);
        const mark = (x, k) => { if(!x) return k < start || k >= today ? `<i class="na">·</i>` : `<i class="no">✗</i>`;
          const m = x.made ? `<i class="mk" title="made up ${e(md(x.made))}${x.shot ? " · 📷 " + e(x.name) : ""}">↺</i>` : `<i class="ok" title="${x.shot ? "📷 " + e(x.name) : "Taken on the platform"}">✓</i>`;
          return x.shot && x.link ? `<a class="st-shot" href="${e(x.link)}" target="_blank" rel="noopener noreferrer">${m}</a>` : m; };
        const sh = AD.shots[p.id];
        return `<tr><td><b>${e(p.name)}</b>${sh && sh.error ? `<br><span class="st-tag" title="${sh.error === "no-folder" ? "No Drive folder linked" : "The Drive folder can't be opened: not shared"}">📷 ${sh.error === "no-folder" ? "no folder linked" : "folder not shared"}</span>` : ""}</td><td>${av.net != null ? `${av.net} WPM · ${av.acc}%` : "—"}</td><td>${av.spell != null ? av.spell + "%" : "—"}</td>
          ${days.map(k => { const x = L[k] || {}; return `<td class="st-day"><span title="Typing AM">${mark(x.AM, k)}</span><span title="Typing PM">${mark(x.PM, k)}</span><span title="Spelling">${mark(x.SP, k)}</span></td>`; }).join("")}
          <td class="st-comp">${e(complianceText(rec, from, to, p.since)).replace(/\n/g, "<br>")}</td></tr>`; }).join("")}
    </tbody></table></div><p class="fss-muted">Each day shows three marks: Typing AM · Typing PM · Spelling. An underlined mark is a 📷 screenshot in the trainee’s Drive: click it to open the file. · means the day doesn’t count yet: before the trainee started, or today. Weekends are left out.</p>` : `<p class="fss-muted">No approved trainees in ${e(AD.batch || "this batch")}.</p>`}</div>`;
}

/* ---------- the page and the API ---------- */
window.FTSkills = {
  typing(){ startTyping(""); }, spelling(){ startSpelling(""); },
  makeup(kind, slot){ if(kind === "typing") startTyping(slot); else startSpelling(slot.replace(/ SP$/, " SP")); },
  type(t){
    const r = S.run; if(!r || r.kind !== "typing" || r.done) return;
    if(!r.started && t.value){ r.started = Date.now(); clearInterval(S.tick); S.tick = setInterval(() => { if(!S.run || S.run.done){ clearInterval(S.tick); return; } paintTyping(); if((Date.now() - S.run.started) / 1000 >= SECS) finishTyping(); }, 200); }
    r.typed = t.value.slice(0, r.passage.length);
    if(t.value.length > r.passage.length) t.value = r.typed;
    paintTyping();
    if(r.typed.length >= r.passage.length) finishTyping();
  },
  say(slow){ sayCurrent(!!slow); }, next: nextWord,
  close(){ clearInterval(S.tick); S.tick = null; S.run = null; try{ if(canSpeak()) speechSynthesis.cancel(); }catch(err){} render(); },
  batch(b){ AD.batch = b; render(); }, range(k, v){ AD[k] = v; render(); }, reload(){ AD.people = null; render(); },
  // 🔄 the trainee's own Drive folder, looked at now
  async checkDrive(){
    if(S.busy || !state.traineeId) return; S.busy = true; render();
    try{ const r = await authFetch("/api/drive/shots", {id: state.traineeId}), j = await r.json().catch(() => ({}));
      if(!r.ok) toast(j.error || "Couldn’t check right now.");
      else { if(j.shots) S.shots = j.shots; const x = (j.results || [])[0] || {};
        toast(x.error === "no-folder" ? "Link your Drive folder first (📁 My Drive links)." : x.error ? "Couldn’t open your Drive folder: share it as “Anyone with the link” → Viewer." : `✓ Checked: ${x.shots || 0} test screenshot${x.shots === 1 ? "" : "s"} found.`); }
    }catch(err){ toast("Couldn’t check right now. Check your connection."); }
    S.busy = false; render();
  },
  // 📷 the trainer: every trainee of the batch shown, looked at now
  async checkBatch(){
    const ids = (AD.people || []).filter(p => bLabel(p.batch) === AD.batch).map(p => p.id);
    if(AD.busy || !ids.length) return; AD.busy = true; render();
    try{ const r = await authFetch("/api/drive/shots", {ids}), j = await r.json().catch(() => ({}));
      if(!r.ok) toast(j.error || "Couldn’t check right now.");
      else { const res = j.results || []; toast(`📷 Checked ${res.length} trainee${res.length === 1 ? "" : "s"}: ${res.reduce((a, x) => a + (x.shots || 0), 0)} screenshots found${res.filter(x => x.error).length ? `, ${res.filter(x => x.error).length} without a readable folder` : ""}.`); }
    }catch(err){ toast("Couldn’t check right now. Check your connection."); }
    AD.busy = false; await loadAdmin(); render();
  },
  // for the 📊 Weekly Ranking (⤓ its Spelling & Typing column) and the checks
  complianceText, missing, ledger, averages, compliance, withShots, passages: PASSAGES, words: WORDS, record: () => S.rec ? full() : null, run: () => S.run
};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["skills"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {skills: "Typing & Spelling Tests"});
const __render = window.render;
window.render = function(){
  if(state.view !== "skills") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  if(state.isAdmin && !state.adminPreview && !state.traineeId){ state.adminTab = "skilltests"; state.view = "admin"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-st"><a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>${renderTrainee()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  if(S.run && S.run.kind === "typing" && !S.run.done){ paintTyping(); const t = document.getElementById("stType"); if(t){ t.value = S.run.typed; t.focus(); } }
};
ftAdminTab("skilltests", "🧪 Typing & Spelling", renderAdmin);
// the Practice Lab's card and the day map's daily step open the tests here
window.ftsGotoSkills = function(){ goto("skills"); };
// 🏅 My Performance (js/ft-program.js lists this source)
window.ftSkillItems = ctx => {
  const rec = withShots(ctx.rec["skills:"], (ctx.rec["trackerreview:"] || {}).shots), out = [];
  if(!rec.typing.length && !rec.spelling.length && !rec.shots.length) return [];
  const av = averages(rec), c = compliance(rec, ctx.since);
  // 📅 the daily deliverable: every slot due so far, taken here or saved as a screenshot in Drive
  if(c.pct != null) out.push({name: "📅 Daily test compliance", pct: c.pct, note: `${c.done} of ${c.need} tests done since ${md(c.from)}${c.made ? ` (${c.made} made up)` : ""}${c.lacking ? ` · ${c.lacking} lacking` : ""}`});
  if(av.net != null) out.push({name: "⌨ Typing Test", pct: Math.min(100, Math.round(av.net / TARGET * 100)), note: `${av.net} net WPM · ${av.acc}% accuracy · last ${av.nt} · target ${TARGET} WPM`});
  if(av.spell != null) out.push({name: "🔤 Spelling Test", pct: av.spell, note: `average of the last ${av.ns}`});
  return out;
};
// 📚 Dashboard: the daily deliverable beside the Task Tracker and Monitoring Sheet tiles: today's three tests (taken here
// or a 📷 screenshot in Drive) and the compliance so far, the share of the tests due that were done. Both open the tests.
(window.LSH_HOME_STATS = window.LSH_HOME_STATS || []).push(function(){
  if(state.isAdmin && !state.adminPreview && !state.traineeId) return adminTile();
  if(!state.traineeId || state.isAdmin) return "";
  if(!S.rec || S.id !== state.traineeId){ load(); return ""; }
  const c = compliance(full(), String(state.traineeRegisteredAt || "").slice(0, 10)), t = c.today, n = ["AM", "PM", "SP"].filter(s => t[s]).length;
  const tone = p => p == null ? "" : p >= 100 ? "ok" : p >= 80 ? "mid" : "bad";
  const mk = (s, label) => `${label} ${t[s] ? "✓" : "·"}`;
  const card = (num, cls, lbl, title) => `<div class="card stat st-dash" onclick="goto('skills')" style="cursor:pointer;" title="${e(title)}"><div class="num ${cls}">${num}</div><div class="lbl">${lbl}</div></div>`;
  return card(`${n} / 3`, n === 3 ? "ok" : n ? "mid" : "", `🧪 Tests today · ${mk("AM", "AM")} ${mk("PM", "PM")} ${mk("SP", "Spell")}`, "Today’s Typing (AM and PM) and Spelling Tests, taken in the Practice Lab or saved as a screenshot in your Drive")
    + card(c.pct == null ? "—" : c.pct + "%", tone(c.pct), c.pct == null ? "📅 Test compliance · starts tomorrow" : `📅 Test compliance · ${c.lacking ? c.lacking + " lacking" : "all done"}`, "Your daily tests so far: the share of the tests due that were done (it is on your scorecard)");
});
// the trainer's 📚 Dashboard: today's tests across the newest batch (the grid's batch), opening Admin → 🧪 Typing & Spelling
function adminTile(){
  if(!AD.people){ if(!AD.loading) loadAdmin(); return ""; }
  const ppl = AD.people.filter(p => bLabel(p.batch) === AD.batch); if(!ppl.length) return "";
  const today = dayKey(new Date()), n = ppl.filter(p => { const x = ledger(AD.recs[p.id] || blank())[today] || {}; return x.AM && x.PM && x.SP; }).length;
  return `<div class="card stat st-dash st-dash-a" onclick="state.adminTab='skilltests';goto('admin')" style="cursor:pointer;" title="Today’s Typing and Spelling Tests in ${e(AD.batch)}: taken on the platform or saved as a screenshot in Drive"><div class="num ${n === ppl.length ? "ok" : n ? "mid" : ""}">${n} / ${ppl.length}</div><div class="lbl">🧪 Tests today · ${e(AD.batch)} all 3 done</div></div>`;
}
// the tiles take a fifth column on this program's dashboard, so the two rows stay two rows (js/lsh-program.js lays out four)
(function(){ const st = document.createElement("style"); st.textContent = `@media (min-width:1001px) and (min-height:640px){
  main.main-dash .dash-pair-now .dash-side-inner:has(> .st-dash){grid-template-columns:repeat(5,minmax(0,1fr)) !important;}
  /* the trainer's one row: the feedback tile's button keeps its words */
  main.main-dash .dash-pair-now .dash-side-inner:has(> .st-dash-a){grid-template-columns:minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) !important;} }
.dash-side .stat.st-dash .num.ok{color:#6EE7A0 !important;} .dash-side .stat.st-dash .num.mid{color:#FDBA74 !important;} .dash-side .stat.st-dash .num.bad{color:#FCA5A5 !important;}`; document.head.appendChild(st); })();
if(canSpeak()){ try{ speechSynthesis.onvoiceschanged = () => { S.voice = pickVoice(); }; }catch(err){} }

(function(){ const st = document.createElement("style"); st.id = "ft-skilltests"; st.textContent = `
main.main-st{max-width:980px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.st-hero h1{margin:0 0 4px;} .st-hero p{margin:0;color:var(--ink-soft);max-width:70ch;}
.st-today{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;}
.st-slot{background:#fff;border:1px solid var(--line,#E3E7F0);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px;}
.st-slot b{font-size:13px;color:var(--navy);} .st-slot span{font-size:13px;color:var(--ink-soft);}
.st-slot.done{border-color:#9ED3B5;background:#F2FBF6;} .st-slot.done span{color:#1E7F4F;font-weight:700;}
.st-start{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
@media(max-width:720px){.st-start,.st-today{grid-template-columns:1fr;}}
.st-card{padding:16px 18px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;} .st-card h3{margin:0;} .st-card p{margin:0;color:var(--ink-soft);}
.st-makeup,.st-hist{padding:14px 18px;} .st-makeup h3,.st-hist h3{margin:0 0 6px;}
.st-chips{display:flex;flex-wrap:wrap;gap:6px;}
.st-histh{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;} .st-histh span{font-size:13px;color:var(--ink-soft);}
.st-tbl{width:100%;border-collapse:collapse;font-size:13.5px;} .st-tbl th{text-align:left;font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;padding:6px 8px;border-bottom:1px solid var(--line,#E3E7F0);}
.st-tbl td{padding:6px 8px;border-bottom:1px solid #F1F2F6;font-variant-numeric:tabular-nums;}
.st-tag{font-size:11.5px;background:#FEF7C3;color:#7a5d00;border-radius:999px;padding:1px 8px;}
.st-note{margin:0;color:var(--ink-soft);font-size:13.5px;}
.st-run{padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
.st-runh{display:flex;justify-content:space-between;align-items:center;} .st-runh h2{margin:0;}
.st-clock{font:700 22px/1 ui-monospace,Menlo,monospace;color:var(--navy);background:#F3F4F8;border-radius:10px;padding:6px 12px;font-variant-numeric:tabular-nums;}
.st-passage{font:17px/1.7 Georgia,"Times New Roman",serif;background:#FBFBFD;border:1px solid var(--line,#E3E7F0);border-radius:12px;padding:14px 16px;color:#7A8094;user-select:none;}
.st-passage .ok{color:#1F2A44;} .st-passage .bad{color:#B42318;background:#FDE7E5;border-radius:2px;} .st-passage .cur{border-left:2px solid #DB8437;}
.st-type,.st-spell{font:16px/1.5 ui-monospace,Menlo,monospace;border:2px solid var(--line,#D5DAE5);border-radius:10px;padding:10px 12px;width:100%;resize:none;}
.st-type:focus,.st-spell:focus{outline:none;border-color:#DB8437;}
.st-spell{max-width:420px;font-size:20px;}
.st-sent{font-size:17px;margin:0;}
.st-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;} .st-live{margin-right:auto;color:var(--ink-soft);font-size:13.5px;font-variant-numeric:tabular-nums;}
.st-big{display:flex;align-items:baseline;gap:8px;} .st-big b{font-size:52px;line-height:1;color:var(--navy);font-variant-numeric:tabular-nums;} .st-big span{color:var(--ink-soft);}
.st-res{margin:0;font-weight:600;}
.st-miss{border-collapse:collapse;font-size:14px;} .st-miss th,.st-miss td{padding:4px 12px;border-bottom:1px solid #F1F2F6;text-align:left;} .st-miss .bad{color:#B42318;text-decoration:line-through;} .st-miss .ok{color:#1E7F4F;font-weight:700;}
.st-admin{padding:18px 20px;}
.st-filters{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px;}
.st-filters select,.st-filters input{padding:5px 8px;border:1px solid var(--line);border-radius:8px;font:inherit;}
.st-grid td,.st-grid th{white-space:nowrap;} .st-day span{display:inline-block;width:14px;text-align:center;}
.st-day i{font-style:normal;font-weight:800;} .st-day i.na{color:#B8BDCB;} .st-day i.ok{color:#1E7F4F;} .st-day i.no{color:#B42318;} .st-day i.mk{color:#B5651F;}
.st-comp{white-space:normal !important;min-width:280px;font-size:12.5px;}
.st-shots{padding:14px 18px;display:flex;flex-direction:column;gap:8px;} .st-shots h3{margin:0;}
.st-err{color:#B42318;font-weight:600;}
.st-files{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:13.5px;}
.st-files li{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid #F1F2F6;padding:3px 0;} .st-files li > span{color:var(--ink-soft);font-size:12.5px;}
.st-slot a{color:#1E7F4F;font-weight:700;}
.st-glance{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:4px 0 10px;padding:8px 12px;background:#F6F7FB;border-radius:10px;font-size:13px;}
.st-glance .ok b{color:#1E7F4F;} .st-glance .mk b{color:#B5651F;} .st-glance .no b{color:#B42318;}
.st-day a.st-shot{text-decoration:none;border-bottom:1.5px solid currentColor;} .st-day a.st-shot i{cursor:pointer;}
`; document.head.appendChild(st); })();
})();
