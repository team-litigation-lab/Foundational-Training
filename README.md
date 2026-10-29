# LSH Standard Foundational Training

**🖥 One screen fits all, no scrolling.** The window never scrolls: the top bar and the footer line keep their place, the page's body takes the height left between them, and a page with more in it than fits scrolls inside that body. A lesson's slide is sized to the room the page has left, so the slide and its Previous / Next bar stay above the footer line. Phones and tiny windows (under 1001 x 480) keep the ordinary page scroll. It's `js/lsh-one-screen.js`, loaded last, the same file in every LSH course repo; change it in all of them. (Everyone already lands on the modules screen here — `js/portal-gate.js` — which is the same rule.)

The training platform for the *Revised 18-Day Foundational Training Program* (Training Guide for LSH Trainees). It runs on the same engine as the EA/PA portal and the CM course:

- sign-in and approvals
- lesson slideshows
- progress saved to the trainee's account
- the admin Trainee Audit and trainer feedback
- trainee feedback and certificates
- 🖥 Presenter view and 👁 Trainee view

## 🧭 Program layout: the five sections (the main setup for every LSH program)

Every LSH program is organised in the same five sections, and the top bar shows exactly those five (`js/lsh-program.js`, the same file in every LSH course repo; change it in all of them):

| Section | What it holds |
|---|---|
| 🏠 **Main Portal** | The LSH Training Portal (`https://cm-training-activity.pages.dev/`). It replaces the Portal link (← Training Directory) that `js/portal-link.js` adds, which is hidden here. |
| 📚 **Dashboard** | `#/modules`: **the landing page.** Every way into the platform opens it — the Standard Foundational Training, its lessons in order, your progress, ▶ Resume where you left off, your certificate and the training pages. |
| ✍️ **Process Questions** | `#/process`: each lesson's answer sheet. Its **own feature**, with its own button in the top bar — not a page of 📚 Dashboard and not a tab of 🛡 Admin Master Control. Admins open the same button and get every trainee's sheets. The questions aren't a slide in the lessons. A lesson day runs **Lesson → Activities → Process Questions**: finishing a lesson unlocks its sheet and goes to 📚 Dashboard for the day's activities, and the sheet comes after them. Its graded view (`#/kc`) also saves the answer sheet with its proper name (Google Drive, Word, the trainee folder). |
| 🛠 **Practice Lab** | `#/simulators`: the trainee's real-time 🟢 Practice Sessions at their own 🏛 law firm (`#/firm`, `#/session`), the 🧑‍🏫 activities done live with the trainer (see *Practice Lab* below; the Typing & Spelling Tests and the Shadowing & To-Do log have their own pages, no longer sections of it). |
| 👤 **My Dashboard ▾** | A trainee's own pages: 🎯 My Focus, 🏅 My Performance (`#/scorecard`, the trainee's grades from every grading system), 🗒 My Notes, 📋 Task Tracker and 📒 Monitoring Sheet. Admins get **🏅 Scorecards** here instead: Admin → Scorecards, every approved trainee's in one table. |
| 🛡 **Admin Master Control** | The Admin screen (admins only, never in 👁 Trainee view). |

**📚 Dashboard is the landing page, and this is the standard global set-up — every LSH program, trainer view and trainee view alike.** `#/modules` is the one home, named 📚 Dashboard in the top bar on every LSH platform. Every arrival that carries no address of its own opens it: a ticket from the LSH Training Portal, a trainer typing the admin password on the gate's **Admin Portal** tab, a trainee or trainer coming back to a saved session, the brand mark, a ← Back button, ← Back to Dashboard on a lesson, an old `#/dashboard` link and any page this program has turned off. One home, one button name, no second half-empty home page beside it — and no role gets a different landing page. The engine's own dashboard and the pages this program doesn't use are aliases of it — `window.LSH_HOME_ALIASES` (`js/ft-updates.js`), which `js/lsh-program.js` sends to `#/modules` in both `goto()` and `render()`.

**No viewer lands in the middle of a lesson.** Signing in, or reopening a saved session, used to jump straight back into the last lesson or activity. The Dashboard carries **▶ Resume where you left off**, so the viewer takes that jump when they want it: `js/lsh-program.js` sends an *automatic* resume (the one the engine starts on sign-in and on boot) to 📚 Dashboard, and leaves the button's own resume alone. A real address — `#/day/3`, `#/tool/<id>`, a duplicated tab, ⧉ Open in a new tab — still opens that page directly: it is a link, not a landing.

**📚 Dashboard fits one screen.** On a laptop or desktop (from 1001 px wide and 640 px tall) the banner, the lesson cards, the scores, the page links and the actions all sit inside one viewport height and the page itself does not scroll (`js/lsh-dashboard.js`). The rule keys off the page (`main.main-dash`), never off the role, so a trainee, a trainer and a trainer in 👁 Trainee view all get the same fit. Only this page is locked: lessons, ✍️ Knowledge Check and 🛡 Admin Master Control scroll as before, and phones and short windows keep the normal scrolling layout. A program with more lesson cards than the height holds scrolls them inside the card grid, so nothing is ever cut off the bottom. To leave the cards that height, the top row is shared and kept short: the pinned **📌 Setting of Training Expectations and Company Policies** card first, with **the scores beside it** as two rows of four tiles (program complete, lessons finished, feedback, ranking, graded calls, Task Tracker, Monitoring Sheet, certificate; `js/lsh-program.js`, `.dash-pair`; stacked below 1001 px). The lesson grid then takes the full width: the 9 lessons as **compact cards** (the lesson's icon beside its Start button, and ☰ Topics · ✓ Finish · ▶ Video on one row, their full names on hover) with the no-discussion days' instruction cards between them in day order, five to a row (see 📋 Day decks). The whole dashboard fits with nothing scrolling on a full-HD screen and on a 1366×768 laptop; on anything smaller the lesson grid scrolls inside itself, and the page still doesn't. There is no next-step band on the dashboard any more: each day's instructions are on its 📋 Day deck, and the "what's next" line still shows under a passed ✍️ Knowledge Check.

👁 Trainee view and ⛶ View ▾ stay at the end of the top bar (no Blueprint or 🧭 Orientation button: the blueprints are on the Main Portal). **The Admin screen's tabs are grouped the same way:** a row of sections (🛡 Admin Master Control: Trainee Audit, Batch Folders, Trainee Feedback · 📚 Dashboard: Open Lessons, Curriculum, Task Trackers, Monitoring Sheets, Process Questions, Activities, Feedback Style · 🛠 Practice Lab: Calendar Scores · 🏅 Scorecard: Scorecards), then the open section's tabs. On a phone the sections are a 2 × 2 grid and the tabs wrap as buttons, so every one shows. The groups are `adminGroups` in `js/ft-program.js`; a tab that isn't listed goes under Admin Master Control. Between 961 and 1400 px wide, *Admin Master Control* shortens to *Admin* so the bar stays on one row.

**What a program puts in each section** is its own: `js/ft-program.js` (loaded just before `js/lsh-program.js`) sets `window.LSH_PROGRAM`: the Dashboard pages, the Practice Lab's pages, and the Scorecard's sources. This program's Scorecard collects:

- ✍️ **Knowledge Checks:** each lesson's best attempt, or the trainer's final score once they give one (`kcreview:<id>`; 70% passes).
- 🟢 **Practice Sessions:** each session's trainer score, until then its automated checks (`sessions:<id>`, `labreview:<id>`).
- 🧑‍🏫 **With your trainer:** the trainer-led activities' recorded results (`labreview:<id>`).
- 🧰 **Portal simulators:** the best result on each Training Portal simulator opened from this program, written by the Portal (`simresults:<id>`, the trainee reads it, only the Portal writes it).
- 📋 **Task Tracker & Monitoring Sheet:** the Drive files' checks, or the trainer's score where given (`trackerreview:<id>`).
- 🎯 **Graded calls:** the best graded call on each mock-call line (`callsim:<id>`).
- 📅 **Calendaring Simulators:** each week's trainer score once released, until then the best automated review; plus each connected simulator's best result (`calsim:<id>`).

A grading system's score is the average of its graded items; the overall score is the average of the grading systems that have a score, so each counts the same. A trainee's records are read in one get-many when the Scorecard opens.

**📊 Weekly Ranking Report** (`js/ft-ranking.js`, Admin → 🏅 Scorecard → 📊 Weekly Ranking): the facilitator's weekly progress report and ranking, in her report's format, per batch and week ("<BATCH> RANKING REPORT WEEK <N>"). Only the format is built in: no trainee, score or note comes with it.
- **The columns:** a compliance column (Spelling & Typing Tests: what was complete and what was lacking, with dates), then score columns. A score is typed out of the activity's own points (e.g. PI Reading Task out of 40) and shown as a mark out of 5 (score ÷ points × 5); a column out of 5 (Monitoring Sheet, Tracker, Mock Calls) is already a mark. Each score can carry a note under it ("Initial feedback implemented.", the usual compliance wording is offered). Then **W<N> Final Average** (the average of the row's marks; empty cells don't count), the **rank**, and **Additional Notes**.
- **Starting a week:** 📋 the Week 1 columns, only the trackers, or ↻ last week's columns. ✎ Columns renames, adds (score or notes), moves or removes a column, sets its points and its date range.
- **⤓ Fill from the platform** fills the empty score cells of a column that has a source (the Daily Task Tracker, the Training Monitoring Sheet, a mock-call line, or any Scorecard grading system's average) from what the platform already graded; it never writes over a typed score, and a filled cell is marked ⤓.
- **✨ Draft in the facilitator's voice** writes a trainee's Additional Notes from their week in the feedback DNA (`js/ft-facilitator-dna.js`), added to what the trainer wrote.
- **⬇ Word** (landscape, ranked), **📋 Copy** (paste into a Google Doc) and **🖨 Print** give the report in the same layout.
- **The sheet looks like Excel:** column letters, row numbers and gridlines, the header row and the names frozen, a score out of its points beside its grey **÷ 5** cell, a **formula bar** (a grey cell's formula, or the note under the selected score: a red corner marks a cell with a note), Tab / → and Enter / ↓ to move, ↕ by name or by rank. **⬇ Excel** is a real .xlsx (written in the page, no library) with the formulas live (`=IF(E3="","",E3/40*5)`, `=IFERROR(AVERAGE(…),"")`, `=RANK(…)`), the header row and names frozen, landscape; the notes under the scores go in a "Notes on the scores" column.
- **📤 Share with the trainees** gives each trainee only their own row (`rankshare:<id>`: their marks, notes, average and rank "of" the batch): it shows on their 📬 My Feedback and as 📊 Weekly Ranking on 🏅 My Performance.
- Saved in `ranking:<batch>:w<N>`, admins only.

**📋 The mock calls' and demos' scorecards** (`js/ft-rubrics.js`, from the Training Guide's metrics): Reception, Calendar Management and Intake Mock Calls (with a feedback note per criterion), and the Intake Packet, LOR, MedLOR, LV and Reduction / Closing & Settlement demos (with the guide's time rule, e.g. the LV demo's 45 minutes). In **🧑‍🏫 Trainer Inputs** a trainer scores each criterion 0–5; the weighted average (every criterion weighs 1 unless a weight is set) becomes the activity's score in %; ✨ drafts the comment in the facilitator's voice from the scores. Saved with the result in `labreview:<id>` (`rubric: {key, scores, feedback, avg}`); the trainee sees the scorecard on their card, on 📬 My Feedback and in 🏅 My Performance; ⤓ Fill takes it into the Weekly Ranking. A trainer-added activity takes a scorecard by name in the list (`title | lesson | kind | scorecard`) or by its title.

**🧪 Typing & Spelling Tests** (`js/ft-skilltests.js`, 🛠 Practice Lab → 🧪 Skill Building, `#/skills`): the daily tests the guide asks for, taken on the platform instead of an outside site plus a screenshot.
- **⌨ Typing Test:** 60 seconds on a passage about a Legal VA's work. Gross and net WPM, accuracy and errors, against the 60 WPM clients look for. Pasting is off.
- **🔤 Spelling Test:** 15 words from the course (legal, medical and business), each read aloud in a sentence by the browser's own voice. The corrections are shown at the end. A browser without a voice shows the sentence with a blank instead, and the log marks it.
- **Logged on its own:** each result is saved with its date and AM/PM slot. Today's card shows the morning and afternoon typing tests and the spelling test. A missed slot is offered as a make-up (the guide's idle-time rule), and the log says when it was made up. Today never counts as missed before it's over.
- **The record can't be rewritten:** `skills:<id>` is the trainee's own, but worker.js keeps it append-only. Results already logged stay as they are, new ones get the server's time and are kept in range, and nothing can be deleted.
- **The trainer** (Admin → 🏅 Scorecard → 🧪 Typing & Spelling): a batch day by day (✓ done, ↺ made up, ✗ missing, · not counted yet), the averages, and for any dates the compliance line in the facilitator's wording ("Spelling Test – Complete", "Typing Test – Complied; however, lacking 1 entry (10/2 PM)"). A trainee's days start when they registered or took their first test.
- **The 📊 Weekly Ranking's** Spelling & Typing Tests column ⤓ fills from it for the dates written in the column; **🏅 My Performance** shows the averages ("🧪 Typing & Spelling").

**🏷 Naming & Reporting Drills** (`js/ft-drills.js`, 🛠 Practice Lab → 🧰 Drafting Tools, `#/drills`): every demo scorecard grades file names, Notes/Tasks entries and email subjects, and until now the conventions were only read in the guide. Each drill question builds a made-up case (client, provider, lien holder, insurer, dates, amounts, new every time) and asks the trainee to type the file name, report entry, subject line or fax address, with their own first name. It's checked against the guide's convention on the spot, with the differing part pointed out, 10 questions a round.
- **Sets:** Intake Packet (Day 8), LORs (Day 12), MedLOR with the NPIM doctor rule and the fax format (Day 14), Lien Balance Verification (Day 16), Bills & Records (Day 17), Reduction & Closing (Day 18), the answer files, and a mixed round. Each demo day's steps carry its drill.
- **Checking:** dashes (– or -), spacing and capitals are forgiven, since the guide itself mixes "Docs Tab" and "Docs tab". The LOR's date takes two or four digits, as the guide's samples do. Everything else must match, and the fax address must be exact.
- **Saved** in `drills:<id>` (the trainee's own); the best round per set shows on 🏅 My Performance.

**👥 Shadowing log and the day's Hubstaff To-Do** (`js/ft-todo.js`, `#/shadowing`, a 👥 section in 🛠 Practice Lab, and the shadowing step on Days 7, 11, 14, 15, 16 and 18): the two things the guide asks of every trainee daily, which the trainer used to chase in the GC and check by screenshot.
- **The To-Do:** each day's exact text in the guide's wording (`To-Do: Classroom Discussion: Intake Training Day 1`, and on a shadowing day `To-Do: Shadowing Intake Specialist Role (buddy's name)`), with 📋 Copy — today's in the Practice Lab, and any of the 18 days on the page. (It stays off 📚 Dashboard, whose lesson grid is sized to one screen.)
- **The shadowing log,** in place of the TAM screenshot: who they shadowed, the date, what that person actually did step by step, what the trainee learned that the training hadn't shown them, what they asked and what they were told, and what they will do differently. Checked for completeness only, and the card says what is still missing.
- **The trainer** (Admin → 🛠 Practice Lab → 👥 Shadowing & To-Do): the buddy's name for a shadowing day, any change to a day's To-Do wording and a note for the day (the session's time, or the recorded videos when no buddy is free) — kept in `settings:todo`, never in the code — and every trainee's write-ups, read in full, with the six sessions at a glance.
- **Saved** in `shadow:<id>` (the trainee's own); 🏅 My Performance shows the sessions written up.

**🎧 Call Listening Log** (`js/ft-listening.js`, `#/listening`, a 🎧 Call Listening section in 🛠 Practice Lab, and the Call Listening step on Days 3, 7, 11 and 13): the guide's Call Listening sessions — the ten sample reception recordings, then the intake, insurance communication and provider communication recordings. Trainees listened and nothing was recorded; now each recording gets a short log: who called, what they wanted, how the VA handled it step by step, one phrase worth reusing in the VA's own words, and what the trainee would do differently.
- **Checked for completeness, never for a right answer:** a recording counts as logged once all five lines are filled in (each has its own minimum length), and the card says what is still missing. Only the next recording to log is open; the rest stay collapsed.
- **The trainer** (Admin → 🛠 Practice Lab → 🎧 Call Listening): a batch's four sets at a glance (3/10, 5/5 …), any trainee's logs read in full, and the sets themselves — a set's folder, how many recordings it has, and each recording's title and link (`settings:listening`, trainees see it within two minutes).
- **Saved** in `listening:<id>` (the trainee's own); 🏅 My Performance shows the share of each set logged.

**🎧 PI Reception Activity: 6 Practice Calls** (Day 3's slide `s1d`, the card's Reception Activity row and its step, after the Confidentiality & Call Response Exercise; a 🎧 Listen & Do slide, its card row *PI Reception Activity*): VA Oscar's Reception Activity redone for a personal injury firm. Six reception calls to **Harbor & Pine Injury Law** (the Practice Lab's fictional Tampa firm, `js/ft-firms.js`), played on the slide, each with a challenge on the line: road noise (an existing client at a tow yard), a mobile line that breaks up and drops (a potential new client, called back), a Spanish-speaking client (offered Spanish under the firm's rule, warm-transferred to the bilingual case manager), a speakerphone echo (a provider's billing office about a Letter of Protection), a fast-talking adjuster in a loud call centre (nothing confirmed, a message for the attorney) and a noisy house with an upset mother who isn't on the file (nothing shared, an urgent message for the case manager). The trainee extracts each call's **5 data points** (caller, callback number, verified?, reason, action taken) and its challenge into the Word worksheet (`handouts/LSH_Day3_PI_Reception_Activity_Worksheet.docx`, *PI_Reception_Activity (VA's first name)*). Oscar's original activity recordings stay on the Day 3 slide with his other recordings, as supplementary material. Day 4's *Mock Call Preparation* slide has the same six calls, small, as a warm-up before the mock call.
- **The trainer** sees the key in trainer view, under the calls (the `3:pi-calls` slot of `trainer/notes.json`): each call's five data points, what the VA did about the challenge, and its transcript.
- **Made by** `build/calls/pi_reception_calls.py` (the scripts, voices and key; `pip install edge-tts numpy python-docx`, ffmpeg): neural text-to-speech for each line, the caller's side through a phone line, and the challenge made there (traffic, a car, a call centre's chatter and keyboards, a TV, children and a dog; packet loss and a dropped call with the redial; a speakerphone's echo; the hold tone and the internal line). It writes `ft/day3/audio/pi-call-1.mp3` … `6.mp3`, the worksheet and `build/calls/pi-reception-calls.json`; then `node build/day-decks.cjs` builds the slides and the trainer's key from it. A changed call: edit its script, re-run both (`python3 build/calls/pi_reception_calls.py 3` re-records only call 3). All names, numbers and claims are fictional (555-01xx numbers).

**📅 Booking Rule Check** (`js/ft-calrules.js`, `#/calrules`, a card in 🛠 Practice Lab → 🟢 Practice Sessions, Day 6's "Calendar Management — Mock Call Scenarios" step): after each calendar mock call, the trainee records the booking (the guide's 16 scenario types, the caller's name, callback number, DOB and DOL, the format, date, time, length, title, notes, the caller's tone, EST, the reminder, same-day approval, the alternatives offered) and it's checked on the spot against the guide's scheduling rules:
- **The rules:** a weekday; new client consults on Tuesdays and Thursdays only, at most 3 a day, never after 5:00 PM; phone consults 9:30 AM – 3:00 PM; follow-ups never in the morning; length limits (30 minutes; 45 for preparation, strategy and settlement meetings; 1 hour for conferences); a 15-minute buffer around lunch and the other bookings that day; same-day bookings only with the attorney's approval; EST; 2–3 alternatives when the slot was taken; the title "Meeting type – Client Name"; consultations by phone only; notes with the case context and the caller's demeanor; an email reminder a day before. A rule that doesn't apply to a booking isn't counted.
- **The trainer** scores only the call: in 🧑‍🏫 Trainer Inputs, the Calendar Management Mock Call's scorecard shows the latest booking check and ⤓ fills its Information, Slot & rules, Alternatives and Calendar entry criteria from it (never over a typed score). Admin → 🛠 Practice Lab → 📅 Booking Rules lists each trainee's bookings and most-missed rules, and sets the attorney's lunch hour (`settings:calrules`, default 12:00–1:00 PM).
- **Saved** in `calrules:<id>` (the trainee's own); 🏅 My Performance shows the average, practice calls and mock calls with the trainer apart.

**📅 Standard Training - Calendaring Activity** (`js/ft-calweek-core.js`, `js/ft-calweek.js`, `calweek-api.js`; `#/calweek`, a card in 🛠 Practice Lab → 🟢 Practice Sessions beside **Standard Training - Appointment Setting Mock Calls**, which is the Practice Session once named *Calendaring Practice Lab*, id `calendaring`, its records unchanged). A standalone clone of the Standard Training calendar set-up: Attorney Rivera's week and its eight tasks, copied into its own core and frozen, so it runs apart from the core calendars (the Calendaring Simulators' `calsim:<id>`, the Booking Rule Check's `calrules:<id>`, the Main Portal's Google Calendar Simulator), and none of them changes it.
- **Current week resolver** (`weekOf`, `currentWeek`): the Monday–Friday of the week an instant falls in, worked out in Eastern Time (the attorney's calendar is EST) from the server's UTC clock (`/api/calweek/now`; the page falls back to its own `new Date()` when the server can't be reached, and saves nothing then). It is the page's default view. A Saturday or Sunday shows the coming week. Daylight-saving changes are handled (each Eastern midnight is resolved to its own UTC instant).
- **Relative scheduling engine** (`resolve`, `relativize`, `snap`): a booking is never a date. It is an offset `{w, d, m, dur}` — weeks ahead (always 1, the next work week), the weekday (0 Mon … 4 Fri), minutes from midnight Eastern, the length — snapped to the 15-minute grid. Every read places the offsets on Monday of Week + 1 from `Date.now()`, so a calendar saved weeks ago is on the coming week when it is opened again, with no job to re-date it. `anchor` in the record (the Monday it resolved to when saved) is history only.
- **The check** (`review`): the cloned rules — no conflicts, 15 minutes between events, travel buffers, business hours, the length, the color for the length (30 Tangerine, 45 Blueberry, 1 hour Tomato), a description, Google Meet and the reminder where asked, each task's days, hours and before-the-event rule. 80% passes.
- **Its own controller** (`calweek-api.js`, called from `worker.js` once the caller is signed in): `POST /api/calweek/now`, `/get`, `/save` (`{events, submit}`; the server cleans, snaps and reviews the bookings) and `/list` (admins, `{ids}`). A trainee reads and writes only their own record; `calweek:<id>` is not a trainee storage key, so `/api/storage` refuses it and only the controller writes it. Record: `{v, activity, events, anchor, savedAt, submittedAt, pct, done}`.
- **Webhook (optional, isolated):** with `CALWEEK_WEBHOOK_URL` set, every save POSTs `{type: "calweek.saved" | "calweek.submitted", trainee, at, anchor, pct, done}` there in the background, signed `X-LSH-Signature: sha256=<HMAC of the body with CALWEEK_WEBHOOK_SECRET>`. A failing webhook never fails the save.
- **Linked to Day 5's Attorney Calendar Management Activity:** the page's 📎 button opens that slide of the Day 5 deck (with the activity sheet and the samples beside it), the slide carries a 📅 Standard Training - Calendaring Activity button back, and Day 5's activities list it (`js/ft-day-activities.js`, `id: "calweek"`), which also opens its Practice Lab card with Day 5.
- **The trainer:** Admin → 🛠 Practice Lab → 📅 Calendaring Activity: each trainee's bookings, their check, when they saved and sent it.
- Test: `.github/scripts/calweek.cjs`.

**🎮 Knowledge Games — off for now.** `GAMES_ON` at the top of `js/ft-kcgames.js` is `false`: trainees get no games page, no 🎮 buttons on the decks, lesson cards or ✍️ Knowledge Check and no promo, and `#/kcgames` goes to ✍️ Knowledge Check. The trainers' question bank and its Admin tab stay. Set it to `true` to bring them back as described below (`.github/scripts/kcgames.cjs` turns them on for itself, so the engine stays tested meanwhile).

**🎮 Knowledge Games** (`js/ft-kcgames.js`, questions in `js/ft-kcbank.js`, `#/kcgames`, a card on each lesson's ✍️ Process Questions page): a lesson's review played as a game show before the trainee answers its Process Questions. The Process Questions stay the graded Knowledge Check (70% passes the lesson); the games don't change the grade.
- **Eight games:** 💰 Millionaire (a 10-step ladder, 30 s a question, 50:50, Ask the Audience, walk away, safe havens at 2,000 and 100,000), 💣 Countdown Bomb (a 12 s fuse), 📋 Survey Says (type the top answers; typos and other wordings count; three strikes), 🟦 Jeopardy (four categories, 100–500, a Daily Double; a miss costs the clue's value), ⚡ Rapid Fire (a definition, four terms, 3 s, streak multiplier), 🎡 Spin the Wheel (the wheel picks the category and the multiplier), 🚪 Mystery Doors (a question, a double or a bonus), 🔍 Blur & Zoom (name a mock document, made-up names only, before it comes into focus). Every game ends on what was missed and why. Sound cues can be muted.
- **Questions:** a starting bank for all nine lessons (multiple choice with a why, survey boards, terms, ten mock documents). The trainer (Admin → 📚 Dashboard → 🎮 Knowledge Games) adds their own questions, boards and terms per lesson and hides any built-in one (`settings:kcgames`). A trainee sees the lessons they've reached.
- **Saved** in `kcgames:<id>` (the trainee's own, a `plays` list); the best game per lesson shows on 🏅 My Performance (🎮 Knowledge Games).
- **Linked from the days with Process Questions** (Days 1, 2, 3, 7, 10 and 13: the days whose Activity deck carries the ✍️ Today’s Process Questions note, `dayHasPQ` in `js/ft-day-decks.js`): the day's Classroom Activity card shows *✍️ Today's Process Questions* with ✍️ Answer on Knowledge Check and 🎮 Review with the Knowledge Games for the lesson the day discusses; the slide with the questions note and the agenda carry the same two; a lesson's ✍️ Process Questions page has 🎮 Review with the Knowledge Games at the top. Days without Process Questions show neither.

**📝 Send Feedback** (`js/ft-trainer-feedback.js`, Admin → 🏅 Scorecard → 📝 Send Feedback): the trainees' work on the activities that had no trainer review — 🎧 each transcription, 🎬 each video's notes, 📘 each Process Guide, 🧰 each LOR letter — by batch, "To review" first. Open one: the work (a guide is read when opened and cleaned like the trainer's other views), the AI's evaluation where there is one, then the verdict (the facilitator's own labels), a score in % and the comment (✨ drafts all three in the facilitator's DNA), and 📤 Send. Saved in `trainerfb:<id>` (the trainee reads it, only admins write it). The trainee sees it at the top of that activity's page (NEW until seen), on **📬 My Feedback** (📂 My Pages: every feedback a trainer sent — these, the scorecards, the sessions' and Knowledge Checks' reviews, the shared Weekly Ranking rows — newest first) and on 🏅 My Performance (📝 Trainer feedback).

**Back to the LSH Training Portal:** 🏠 **Main Portal**, first in the top bar for trainees and admins, opens the LSH Training Portal. The Admin screen also has **← Back to Main Portal** (next to Log out), which opens the Portal's Training Directory. `js/portal-link.js` (the same file in every LSH course repo) adds both; its own top bar button is hidden in this program.

**🧭 The top bar, organized (every course):** buttons that do the same kind of thing share one menu, the way the Training Portal keeps everything else under ⚙ System Management. **📁 Case File** is one tab for the Case File (or Claim File), 📁 Documents and 🗂 Workspace, which share a row of tabs at the top of their pages; **📚 Guides ▾** holds Notes, Handouts and the Facilitator Guide (whichever the page has; the blueprints are on the Main Portal); **📋 My Sheets ▾** holds the Task Tracker and Monitoring Sheet; **⛶ View ▾** holds ⧉ Open in a new tab and ⛶ Full screen. A menu is made only when two or more of its buttons are on the bar. It's `js/lsh-topbar.js`, loaded last, the same file in every LSH course repo; change it in all of them.

**🔐 Trainees sign in on the Main Portal only.** A trainee logs in once, on the LSH Training Portal, and opens this program from there: this site shows them no sign-in form. The Portal sends them here with a signed, short-lived ticket (`https://<this site>/?ticket=<ticket>`); `js/portal-gate.js` posts it to `/api/auth/portal`, the Worker checks it, and the trainee is registered, approved and resumed exactly as before (same `trainee:<id>` records, so every current registration, progress and approval is kept). Someone who opens this site's link directly sees a note with a **Go to the LSH Training Portal** button instead of a form, and the Worker refuses a name + batch typed here (`/api/auth/trainee` answers 403 `portal-required`), except to renew the session of a trainee already signed in on that device. **Admins always type the admin password here** (`MASTER_ADMIN_PASSWORD`, the Portal's master admin password): the Portal's launch step sends them to this site's *Admin Portal* tab (`?admin=1`), and an admin ticket never signs anyone in (the Worker answers 403 `admin-password`). Every future LSH program gets this by loading the same `js/portal-gate.js` and the same Worker endpoints; it is the same file in every course repo.
  - **Turning it on** needs the same secret on both sides: `wrangler secret put PORTAL_SSO_SECRET` here and on the Portal. Until it is set here, `/api/auth/status` reports `portalOnly: false` and the old name + batch form stays, so nothing locks anyone out before the Portal is ready.
  - **The ticket** (the Portal makes one when a trainee opens a program; good for 10 minutes at most, so a copied link is no use later): `payload = base64url(JSON.stringify({first, last, b: <batch>, exp: Date.now() + 5*60*1000}))`, `ticket = payload + "." + base64url(HMAC-SHA256(key = "portal-sso:" + PORTAL_SSO_SECRET, message = payload))`. `first`, `last` and `b` are the trainee's name and batch as registered on the Portal, which must be the same as their records here (the trainee id is made from them). The Portal must sign the ticket on its server, never in the browser, or the secret is public.
  - **Needs the Portal's side** (EA-PA / `cm-training-activity` repo, not this one): its program cards for trainees open this site with a fresh ticket. The *Go to the LSH Training Portal* button here opens `PORTAL_HOME` in `js/portal-gate.js`; change it if the trainees' portal page isn't the site's home page.
  - The Worker side is `portalOnly`, `readPortalTicket` and `/api/auth/portal` in `worker.js`; `build/build.py` patches the engine's sign-in screen, request and boot to call the gate.

**📚 Knowledge Base page (`kb.html`).** A separate page, `/kb.html`, for the LSH Knowledge Base (the `lsh-knowledge-base` repo: its own Worker with D1 and R2 storage; nothing from it is copied here). It shows the deployed Knowledge Base in a frame, with a link to open it in a new tab. `KB_URL` at the top of the page's script is the Worker's address (`https://lsh-knowledge-base.legalsupporthelp.workers.dev/`); empty, the page says the Knowledge Base isn't connected. The 🛠 Practice Lab's 📚 Knowledge Base section and Know Your Tools' 📚 LSH Knowledge Base (one of its eight tools) open the Knowledge Base itself, signed in: `js/lsh-tool-links.js` adds the trainee's Portal ticket (`?ticket=`, which the Knowledge Base checks with the Portal's `/api/verify-ticket`), and `?admin=1` for an admin (its Admin Portal tab). Behind the page is the law-office photo `img/kb-bg.webp`, fixed and covering the window at 35% opacity (`body::before` in the page's styles); swap the file to change the picture.

**📖 Legal Glossary (`glossary.html`).** A standalone, searchable glossary of about 700 US legal terms and Latin phrases, with an area filter (civil procedure, evidence, contracts, torts and injury, criminal, property, family, estates, business, immigration, employment, insurance, Latin) and an A–Z jump bar. The terms are one `RAW` list at the top of the page's script (`Term | Area | Meaning`, one per line); add or edit terms there. It is linked from the header of `kb.html`.

Trainees see **the lessons**. Lessons 1–8 show their training deck page by page, each page an image rendered from the deck's PDF (`build/slides/image_lesson.py`); Lesson 9 is the Days 17–18 instructions deck (below). Lessons are named by their training title, not by day.

The curriculum (the Training Guide, with the day-by-day tasks, links and facilitator's notes) is for trainers and admins only, in **Admin → 📘 Curriculum**. It is not on the trainee pages.

## Lessons

| # | Lesson | On the platform |
|---|---|---|
| 📌 | Setting of Training Expectations and Company Policies | ✅ slides (`js/ft-rules.js`), always open, not counted |
| 1 | Virtual Assistant Essentials | ✅ the deck's pages as slides (29 of its 138, from its PDF) |
| 2 | Law Firm Communication | ✅ the deck's pages as slides (54, from its PDF) |
| 3 | Personal Injury Process Flow | ✅ the deck's pages as slides (25, from its PDF) |
| 4 | Receptionist Training | ✅ the deck's pages as slides (55, from its PDF) |
| 5 | Calendaring & Appointment Setting Training | ✅ the deck's pages as slides (44, from its PDF) |
| 6 | Intake Specialist Training | ✅ the deck's pages as slides (105, from its PDF in two parts) |
| 7 | Claims Specialist Training | ✅ the deck's pages as slides (77, from its PDF) |
| 8 | Medical Records Specialist Training | ✅ the deck's pages as slides (55, from its PDF) |
| 9 | Lien Negotiator Training | ✅ Days 17–18's instructions as slides (9), with the Canva training deck and Word Game 1 in them |

**Lien Negotiator Training** (id 9, `build/lessons/lesson09.js`) is back on the standard training, as the lesson for **Days 17–18**. It had been taken off to become a separate training, which left those two days with no lesson — so nothing on the platform could record them as done, and a trainee could never reach the end of the programme. Its slides are everything the Training Guide asks of the trainee on those two days, in the order they run: Day 17's carryover, Saving Medical Bills & Records and the PM discussion, the Lien Negotiator **Canva deck** at that discussion, **Word Game 1** (`ft/day17/word-game-1.html`), then Day 18's exercise and materials, live demo, shadowing and the instructions for requesting a new role. Like every lesson deck it carries **no process questions** — the Day 18 list was taken off its slide; they are answered in ✍️ Process Questions after the day's activities. They come from the trainee-facing day files (`build/days/day17.js`, `day18.js`), so no facilitator content is in them — only the trainer-slot placeholders, which a trainer in trainer view sees filled with the Day 17–18 facilitator notes. Its **Process Questions** (the `lien-negotiator` set, 12 questions, `js/ft-process.js`) were already written and come back with it. Like every lesson day it runs Lesson → Activities → Process Questions; when those pass, the programme is complete and 📚 Dashboard shows 🎓.

Onboarding and Setting of Expectations & Tech Set-up (ids 10 and 11) are off the platform: their files are in `build/lessons/off/` (with the Day 0 screenshots still in `ft/day0/img/` and the `d0:*` trainer notes), which the build skips. To bring one back, move its file into `build/lessons/` and rebuild; it keeps its id, so saved progress doesn't shift. `DAYS` follows the file order, and a lesson's `label` / `short` replace "Lesson N of 9" and the dashboard circle's number.

Each lesson card has **▶ Video Presentation** (the lesson's `video`: its AI Assisted Discussion video from the curriculum), which plays in the pop-out viewer. Lessons are finished from their last slide (📋 Classroom Activity, which opens the lesson's Activity deck). **Videos stay locked** (🔒 Video Presentation) until a trainer unlocks them in **Admin → 📅 Open Lessons → 🎬 Unlock Videos**, for all batches or one batch (`settings:openvideos`, same shape as `settings:opendays`). Trainers and 👁 Trainee view always see them.

The card's buttons form **one full-width grid with lines** (`js/ft-card-grid.js`, loaded after `js/lsh-dashboard.js`): Start / Review fills the top row edge to edge and ▶ Video Presentation the row under it, separated by thin lines like a table (the same look as the EA/PA day cards). The Setting of Training Expectations and Company Policies card keeps its navy Start, also edge to edge.

### Virtual Assistant Essentials: the deck's own pages

Lesson 1 shows the "I. Virtual Assistant Essentials" deck page by page: each page is one slide, an image in `ft/vae/slides/` rendered from the Canva PDF (the image alone: no heading above it), with the page's largest text as the slide's name in the slide list and Presenter view and its words as the alt text. Only 29 of the deck's 138 pages are in the lesson (`keep` in `image_lesson.py`): the title, Objective, Training Agenda and Introduction (1–4), Kickstart Your Legal VA Career (20), Legal Practice and Virtual Assistants with its Benefits (21–24), Overview of Tasks and Roles (25–35), Types of Law Firms (36–39), Tips to Stand Out as a Legal VA (134–137) and Thank You (138). Its topic dividers (`FT_TOPICS` in `js/ft-updates.js`) follow those sections. Lesson 2 (Law Firm Communication) is the "Law Firm Communication" PDF (`python3 build/slides/image_lesson.py lfc <deck.pdf>`): all 54 pages, in `ft/lfc/slides/`, under eleven topics. It replaces the native rebuild. Lesson 3 (Personal Injury Process Flow) is built the same way from its PDF (`python3 build/slides/image_lesson.py piw <deck.pdf>`): all 25 pages, in `ft/piw/slides/`, with one topic per role in the case (Intake, Claims, Client Communication, Medical Records, Demand Drafter, Lien Negotiator, Litigation, and the front-office roles). Each slide is named by its page's own title, since the largest text on these pages is the role label. Lesson 4 (Receptionist Training) is built the same way from the full "The Receptionist Role" PDF (`python3 build/slides/image_lesson.py rec <deck.pdf>`): all 55 pages, in `ft/rec/slides/`, under six topics. It replaces the earlier native rebuild (`make_lesson.py receptionist`), whose Presenter scripts were keyed to the old slides. Lesson 5 (Calendaring & Appointment Setting) is the "Calendar Management Training" PDF (`python3 build/slides/image_lesson.py cal <deck.pdf>`): all 44 pages, in `ft/cal/slides/`, under nine topics. Lesson 6 (Intake Specialist Training) is "The Intake Specialist Role" PDF, sent in two parts (`python3 build/slides/image_lesson.py isr <part1.pdf> <part2.pdf>`): all 105 pages, in `ft/isr/slides/`, under eleven topics. It replaces the embedded Canva deck. Lesson 7 (Claims Specialist Training) is the "V. Claims Specialist" PDF (`python3 build/slides/image_lesson.py csr <deck.pdf>`): all 77 pages, in `ft/csr/slides/`, under nine topics. It replaces the native rebuild (`make_lesson.py claims`, images in `ft/claims/`), whose Rideshare, Rental Car, Best Practices, Dropped Cases and No Contact Protocol slides aren't in the deck's PDF. Lesson 8 (Medical Records Specialist Training) is the "VI. Medical Records Specialist" PDF (`python3 build/slides/image_lesson.py mrs <deck.pdf>`): all 55 pages, in `ft/mrs/slides/`, under seven topics. The whole slide fits on one screen: on a desktop the lesson's controls (Back to roadmap, the title, Listen, Objectives, Present full screen, Presenter view) sit in a column to the right of the slide, and `fitPages()` in `js/ft-slides.js` sizes the slide frame and the page: on the lesson page the whole page fits the screen with no scrolling (the slide, its Previous / Next bar and, about an inch below, the footer line); in full screen and the slides window the page fills the room above the bar. It runs after each render and again once the slide has slid in. To update it, download the deck from Canva as PDF and run `python3 build/slides/image_lesson.py vae <deck.pdf>` (needs `pip install pymupdf pillow`), then rebuild. Render from the PDF, not the PPTX: the PDF carries the deck's fonts, while a PPTX rendered without them spills its text out of its boxes.

**▶ Listen and 🎧 Audio mode** read every lesson aloud (`ftSayText` in `js/ft-slides.js`). A page shown as an image reads its spoken script: `image_lesson.py` writes the page's text into the page's `data-say`, top to bottom and a sentence or item per line, keeping one copy of text Canva draws twice and leaving out the Legal Support Help logo. A native slide reads its text one box at a time, with a pause after each heading, card, list item and table cell. Emoji, arrows, bullets, buttons and links aren't read out, and a title shown twice is read once. Audio mode moves on from a slide with nothing to read (the embedded Canva deck in Lesson 9) instead of stopping there.

### Native slides (rebuilt from a deck)

**Topic dividers.** Lessons 1, 2, 4 and 7, the lessons rebuilt page by page, open each topic with a divider slide, as in the EA/PA and CM courses. It shows *Lesson N of 8 · the lesson*, *Topic N of M* and the topic's title. The day intro lists the topics, and Presenter view's cue names the topic and how many pages it has.
- **Where topics start:** `FT_TOPICS` in `js/ft-updates.js`, with each topic's first page by page id. Lesson 1 has 10 topics, Lesson 2 has 11, Lesson 4 has 5 and Lesson 7 has 12.
- **Adding pages:** new pages don't move the dividers. To start a topic somewhere else, change its page id there.
- **Canva lessons:** a lesson that is one Canva deck has no dividers, because the deck has its own title page.
- **Saved places:** these are slide positions, so each trainee's "resume here" and "furthest reached" moved once to the same page when the dividers arrived. The saved objects record which lessons were moved (`_ftTopics`).

**Native slides (retired).** Earlier versions of Lessons 2, 4 and 7 were rebuilt as native slides with the pipeline below; every lesson now shows its deck's pages as images instead. The pipeline is kept for a deck that should be rebuilt as native slides, and the Presenter scripts it wrote (`trainer/scripts.json`, lessons 2, 4 and 7) match those old slides only, so the Presenter view shows no script for the image lessons. How it worked (Lesson 2 came as a PDF like Lesson 4: `extract_pdf.py <deck.pdf> lfc`, `make_lesson.py lfc`, `make_scripts.py lfc`; its beats are in `build/slides/lfc_script.py`, and the deck's two section title pages, p04 and p24, are replaced by the topic dividers): each deck page is its own slide in the platform, with the deck's exact wording in this program's own design (`js/ft-slides.js`: cards, numbered steps, check lists, do / don't boxes, tips, tables and zoomable document images). The deck's link is kept as the lesson's `canva` field.

1. Download the deck from Canva as `.pptx` (speaker notes included) and extract it: `build/slides/extract_pptx.py` writes `build/slides/<deck>.json` (each page's text boxes and notes). A deck downloaded as PDF works too: `build/slides/extract_pdf.py <deck.pdf> [<part 2.pdf> …] <deck>` (needs `pip install pymupdf`; a deck downloaded in parts is given in order). A PDF has no speaker notes, so its scripts' talk-through is written in `build/slides/<deck>_script.py` and the walk-through is the slide's own points.
2. `python3 build/slides/make_lesson.py <deck>` writes `build/lessons/lessonNN.js`. Each page's layout is set in `make_lesson.py`; exact repeats of a page are kept once.
3. `python3 build/slides/make_scripts.py <deck>` writes that lesson's Presenter view scripts into `trainer/scripts.json` (see *How the program works*). The beats the notes don't have (the why, the question for the room, scenarios) are in `build/slides/<deck>_script.py`.
4. Rebuild.

Document images are in `ft/claims/img/`, the Receptionist deck's photos in `ft/receptionist/img/`. The Rental Claims Services slide follows the revised deck page (`Claims_Specialist (8).pptx`, slide 1): the title on the rental-keys photo with the LSH logo, beside the letter in an orange frame (`cover()` in `make_lesson.py`, `.cs-cover` in `js/ft-slides.js`; the photo and logo are `ft/claims/img/rental-keys.jpg` and `lsh-logo.png`). Real client documents (the rental claims letter and rental agreement) are in `trainer/img/claims/`, which only a signed-in trainer can load; trainees see "🔒 A real document example: your trainer shows it during the session." in their place.

A lesson without its deck shows on the dashboard as *Coming soon* and can't be opened by trainees. To add one, put its Canva view link in `build/lessons/lessonNN.js` (same shape as the others) and rebuild.

> **The Calendaring Simulator runs on the Main Portal, built on the Google Calendar Simulator** (Training-Portal repo: `simulators/gcal.html`, `gcal-data.js`, `gcal.js`; branch `claude/gcal-tracks`). This program shows only 🎓 Standard Training, the original Google Calendar Simulator, unchanged (no task list); the Litigation Week (Case Management) and Executive Week (EA / PA) tracks belong to those programs and aren't shown here. The cards here (`ftsCalsim`) open them through `calsim.html?track=…`, which launches the simulator. The in-repo scheduler described below (`js/ft-calendar.js`) is the earlier version. **Evaluations are on the Portal too:** trainers open **📋 Trainee Evaluations** (Admin → 📅 Calendar Scores, `ftsEvaluations()`) on the Portal's `gcal-review.html` (each trainee's submitted calendar with its AI review, the trainer's feedback and the report sent to the trainee, and the trainees' calendars to score), and trainees open **📋 My Evaluations** on their calendar cards (`my-evaluations.html`). The in-repo scheduler's own AI review and evaluations table were not carried over.

## 📅 Calendaring Simulators (drag-and-drop, Google Calendar style)

One calendaring practice area for Lesson 5 (Calendaring & Appointment Setting), at `#/calsim`. The Calendaring Simulators themselves now run on the Main Portal, so 🛠 Practice Lab no longer shows a card for this page: it is reached from **Admin → 📅 Calendar Scores** and from the links a trainee already has, and it keeps the calendars saved here before the move. It has one track (`TRACKS` in `js/ft-calsim-core.js`):
- **🎓 Standard Training** (Foundational · Calendar Management): two weeks, Attorney Rivera (core) and Attorney Chen (trial week).

The Litigation Week (Case Management) and Executive Week (EA / PA) calendars were removed from here: they belong to those programs, not Standard Training.

- **Google Calendar look:** real dates for the week, a Calendar toolbar, a Create button and month on the left, a red "now" line, Google-style events, and a Google-style event editor (title, day and times, guests, Add Google Meet, email notification, description). Click an empty slot (or drag) to add an event.
- **Files:** `js/ft-calsim-core.js` (tracks, weeks, the attorney's rules, `review()`; no page code, so `node` can test it) and `js/ft-calendar.js` (the page and the admin tab). Both load before `js/ft-simulators.js`. Every week is checked to have a perfect answer. Add a week or a track by adding to `SCENARIOS` / `TRACKS`.
- **Google Calendar set-up:** Eastern Time, a 15-minute grid, a 15-minute gap between events (`gap`), and an event editor like Google's (double-click or drag out a new event): title, guests, **Google Meet**, an **email reminder 1 day before**, the **event color** (Google Calendar's eleven colors, or the default) and a description.
- **The attorney's color rule** (`COLOR_RULE` in `js/ft-calsim-core.js`, on every track and week): an event is colored by how long it is: **30 minutes Tangerine, 45 minutes Blueberry, 1 hour Tomato** (no rule for other lengths). The trainee picks the color in the editor; nothing colors an event for them. The rule is shown with the week's brief and above the task list, the automated review checks it (**Right color for its length**, by the event's length as booked, or the task's when the booked length has no rule) and the AI's prompt carries it. The calendar paints each event in its chosen color; an event with a problem (clash, travel time, outside 9 to 5) shows red with ⚠ instead. The week lists the tasks to schedule; the trainee builds their own calendar: drag on an empty spot to add, drag to move, drag the bottom edge to resize, ✕ deletes (keyboard: arrows move, Shift+arrows resize, Enter edits, Delete removes). Events that clash, break a court's travel time, break the 15-minute gap or fall outside 9 to 5 show red.
- **At the bottom of the calendar:** **💾 Save changes** (saves now; it also autosaves), **🤖 Run automated review**, **📤 Submit to my trainer**.
- **Automated review (the attorney's rules):** `FTCalCore.review()` matches each event to a task by its name (60% of the task's words), then checks each task: on the calendar, no conflict, the gap and travel buffer, business hours, long enough, the right color for its length, a description, Google Meet and the reminder where the task calls for them, and its own rules (days, time window, finish before / start after an event, travel buffer). Each task is worth its weight; the week is scored out of 100 and 80% passes.
- **Manual feedback from the trainer:** **Admin → 📅 Calendar Scores** lists trainees by batch. Open a submission to see the calendar as submitted, its automated review, and the feedback form: a score out of 100, an overall comment and a comment on each task. The trainee sees it on their page. `worker.js` lets a trainee write their drafts, review runs and submissions but always keeps the trainer's `reviews` as they were.
- **Submit → AI feedback → live review → finalized report (with download):**
  1. **Trainer's rules for the AI.** In **Admin → 📅 Calendar Scores → 📘 Rules, guidelines and notes for the AI review** the trainer writes the rules, guidelines and notes the AI holds trainees to, for all weeks and per week (`settings:calsim-guidelines`, readable by trainees because their browser makes the AI call). They are added to each task's built-in rules and notes in the AI's prompt.
  2. **Submit.** The trainee presses **📤 Submit to my trainer**. The submission is saved first (marked `aiPending`), then the AI (`callAIJson`, feature `grading`) checks the calendar against the week's rules, the task notes and the trainer's guidelines: what was done correctly, what needs improvement, what was missed, with how to fix it, strengths and what to work on. The result is saved with the submission (`ai`) and the trainee sees it at once. If the AI is unavailable, the page says so and the rule-by-rule review still works.
  3. **Real time on the trainer's screen.** The admin tab has **📡 Live submissions**: it checks every 10 seconds (two requests; tick off *update on its own* to stop it, and it pauses in a background tab), so a new submission shows with *🤖 AI checking…* and then *AI feedback ready*, with a toast. **🖥 Open live review** opens the submission full screen: the trainee's calendar on the left with the task's event highlighted, and step by step on the right (overview, each task with the rule, what the checks found and the AI's feedback, then **Anything missed?**). If the AI is still writing when it is opened, the feedback appears in the open review by itself.
  4. **The trainer adds their own.** On each task a written note; at the end *also missed* points (one per line), written insights and a score.
  5. **📄 Finalize and generate the report** builds the finalized feedback report from the rule results, the AI's wording and the trainer's additions: **✅ Done correctly**, **🔧 Needs improvement**, **❗ Missed requirements** (including the trainer's extra points), the trainer's insights and score. The trainee's page then shows it with **⬇ Download my feedback** (a self-contained `.html`, with the calendar as submitted) and **🖨 Print / save as PDF**. A draft stays private; **↩ Withdraw** takes a finalized report back.
  The same fields are on the submission's detail in the admin tab (**↻ Regenerate** the AI feedback there). A trainee writes their own record, so the AI text is stored by their browser; the automated score is always worked out again from the saved calendar, and `worker.js` keeps the trainer's `reviews` out of the trainee's reach.
- **📋 My submitted evaluation (trainee's own space):** under the calendar, `evalHTML()` shows the selected week's latest submission: the calendar as submitted (read-only grid), the automated review, the AI review (summary, strengths, what to work on, per-task status) and the trainer's score once released. It updates by itself when the AI finishes.
- **Scores per trainee:** all in the trainee's own `calsim:<id>` record (`drafts`, `autos`, `submissions` with their automated score, `reviews`). The admin tab shows, per trainee and week, the automated % of their latest submission and the trainer's score; the automated score is always worked out again from the saved calendar.
- **The Portal's own calendar simulators** (its hub cards "Calendaring" and "Google Calendar Simulator") live in the Portal repo, not here: **🧰 All simulators** shows them as one **Calendaring Simulators (Portal)** link, opened with `program=FT`, the trainee's name and batch. Any simulator (Portal or CMS) that sends this page `postMessage({type:"lsh-sim-result", sim:"calendar", score, max, title})` has the result added to the same record. Results saved on the Portal's simulators now also reach the trainee's record here directly: see *Portal simulators* on the Scorecard (`simresults:<id>`).

## Setting of Training Expectations and Company Policies

**Setting of Training Expectations and Company Policies** is a separate slide presentation, beside Virtual Assistant Essentials. Its card is first in the lessons row, marked 📌 Day 1 · Start here (it, 🧰 Know Your Tools and the Virtual Assistant Essentials discussion are all Day 1), and it opens as a lesson (`#/day/12`). The trainer can run it in 🖥 Presenter view and the slides window like the other lessons. It's all in `js/ft-rules.js`.

- **It isn't one of the program's 9 lessons.**
  - It's always open, for every trainee and batch.
  - It doesn't count toward "Lessons finished", the certificate or the admin stats.
  - It isn't in `DAYS`. `DAYS.find` and `DAYS.some` also look at it (by id, `ORIENT_ID` = 12), so the lesson view, Presenter view, routes and names find it, while `DAYS.length`, `map` and `filter` still see the 9 lessons.
- **The slides** are drawn like the Activity decks and the Case Management course's Case Flow slides (`body.ft-orient` in `js/ft-rules.js`): a glass navy card with line ornaments at three corners, the lesson's orange-outlined title with its progress line, the slide's title on a centred uppercase ribbon, and the content on a white sheet in the CM type (Inter 500, Poppins headings). Each slide is scaled to fit its sheet (`fitOrient`, to half size at the smallest); only a slide that would need less is split into pages (on a laptop: the Hubstaff notes and the Task Tracker sheet). In the order the trainers run the orientation:
  1. 👋 Welcome to LSH!: the program, what the orientation covers, and the training shift.
  2. Hubstaff: how-tos and why they matter (the audit team's record of your day), with links to the lesson's Hubstaff slides and the LSH VA Guide.
  3. Your Hubstaff To-Dos: how to add today's (the steps and the Hubstaff to-do picture, `figTodo`) on the left, the 16 To-Dos on the right, each with 📋 Copy and 📋 Copy All, in smaller type (not scaled up: `data-ftr-max`). No shadowing To-Do: the trainer gives that one on the day.
  4. How to create notes in Hubstaff: the steps beside the Add Work Notes picture.
  5. Lost hours: the Manual Time Adjustment Request (subject, To and CC to copy).
  6. Breaks: your schedule and your hour of breaks.
  7. Auxes: the commands in #⏳-timestamps and #trainingchannel, no double stamping, the Discord profile status.
  8. Camera: on in every meeting and classroom discussion, with the rules for your demeanor, outfit and framing (`CAMERA`).
  9. Discord: mindfulness and response rates (reply within 5 minutes, acknowledge every instruction, meetings are posted on their day).
  10. Your Training Matrix: the training flow as cards, one per day (Day 1 → Day 16), each with the day's role and its main activities, from the day map (`js/ft-day-activities.js`); the tests and the upskill that run every day are said once above them.
  11. Your 4 daily deliverables: the typing and spelling tests, with the links to the sites the training uses (`TESTS`: TypingClub or TypingTest.com, SpellQuiz or Spelling-Test.com) and the screenshot's file name, the Daily Task Tracker, the Training Monitoring Sheet and the EOD email.
  12. Building your habits: Update Your Trackers.
  13–14. The Daily Task Tracker: the sheet (two columns), the other tabs and the daily check, in high-contrast tables.
  15. Your Training Monitoring Sheet, embedded, with 📁 Link My Task Tracker and Monitoring Sheet.
  16. Building your habits: Send Your EOD Email.
  17. The EOD template, with 📋 Copy the Template.
  18. Setting expectations: training isn't the end goal, it's hard on purpose, your trainers are your first clients.
  19. You're a General VA, ready for any role.
  20. Your work and the use of AI.
  21. Free Upskill Training, after your shift.
- **How the slides work:**
  - A slide's HTML is built when it's shown, so the file name has the trainee's name and the Copy buttons work.
  - The Hubstaff picture is SVG, drawn after the trainer's screenshot.
  - The text lives in the constants at the top of `js/ft-rules.js` and in `SLIDES`. If the tracker's columns change in `js/ft-tracker.js`, update `TRACKER_PARTS`.

## 🧭 The Blueprint PDF (the blueprints live on the Main Portal)

No blueprint opens inside this program — no tab, no button, no card, for trainees or for trainers. Every blueprint is read on the **Main Portal's 🧭 Blueprint page**; the old `#/blueprint` and `#/orientation` addresses forward there, so older links and bookmarks still land in the right place. 🧭 Orientation is gone from the top bar.

- **The Trainee blueprint PDF** (`/blueprint.pdf`): built from this course's trainee slides (`trainee` in `js/blueprint-content.js`) by the shared engine (`LSHBlueprint.doc('trainee')`), on the same navy cover band, numbered contents and points / where to find it / tip layout as every other LSH blueprint — as real text, not page images. The Portal's Blueprint page links to it.
  - **It republishes itself after every deploy.** The published copy (`blueprint:pdf`, `blueprint:meta`) is matched against the build and the Worker's deployment id (`/version`, from `version_metadata` in `wrangler.json`). The first admin page open after a deploy rebuilds it in the background (`js/lsh-blueprint-course.js`).
- **Changing the wording:** the trainee slides are in `js/blueprint-content.js`, beside the trainer slides the Portal shows. `js/lsh-blueprint.js` is the same file on every LSH platform and `js/lsh-blueprint-course.js` the same on every LSH course: change either in one, copy it to all.
- **Test:** `.github/scripts/blueprint.cjs`.

## Process Questions and the Knowledge Checks

Every lesson's process questions are its **Knowledge Check**, answered in writing on the platform and graded like the EA/PA Knowledge Checks. The answer sheets are in `PROCESS_SETS` (`js/ft-process.js`), with the questions from the curriculum's lists, ten at most to a sheet (below). The curriculum also has a shorter list after "If time is limited, use only five…"; that note is for the live classroom discussion, so the Knowledge Checks use the full lists.

| Lesson | Answer sheet | Knowledge Check |
|---|---|---|
| 1 Virtual Assistant Essentials | VA Essentials, and the Reading Task: Personal Injury Overview sheet | 10 questions, and the Reading Task's 6 |
| 2 Law Firm Communication | Law Firm Communications Training | 10 |
| 3 Personal Injury Process Flow | PI Workflow | 3 |
| 4 Receptionist Training | Receptionist Training | 7 |
| 5 Calendaring & Appointment Setting | — | none: the lesson finishes as before |
| 6 Intake Specialist Training | Intake Specialist Training | 10 |
| 7 Claims Specialist Training | Claims Specialist Training | 10 |
| 8 Medical Records Specialist Training | Medical Records Specialist Training | 10 |

**Ten process questions at most on every answer sheet** (`KC_MAX` in `js/ft-process.js`): a sheet keeps its first ten. Law Firm Communication and Lien Negotiator Training had twelve and now ask ten; the answers already saved are kept by the question's place on the sheet, so cutting from the end keeps each answer with its question.

**The process questions aren't in the slides any more**: they are the Knowledge Check, and they live in their own feature. A lesson day runs in a fixed order — **the Lesson, then the day's Activities, then its Process Questions** — and only then on through the curriculum. So the last slide's **📋 Classroom Activity** does not jump to the questions: it marks the lesson *studied* (which unlocks its answer sheet) and opens the 📋 Day deck of the lesson's discussion day (its Activity deck, `js/ft-day-decks.js`), which holds the day's activities; **✍️ Process Questions** come after them, where **📝 Submit for Grading** grades it. Passing finishes the lesson, and the line under the passed check (`js/ft-next-step.js`) names the next step. A lesson with no process questions (Calendaring) is finished outright and offers none.

**The Knowledge Check** (`#/kc`):
- **Opening it:** from ✍️ Knowledge Check in the top bar once the day's activities are done (📋 Classroom Activity on the lesson's last slide unlocks it).
- **Answers:** trainees answer in complete sentences (at least five words each). The answers save as they type and are the same as the lesson's ✍️ Process Questions sheet.
- **Grading:** the AI scores each answer out of 10 for accuracy, depth and clarity. Its feedback, per answer and overall, is written in the **facilitator's feedback DNA** (`js/ft-facilitator-dna.js`, Michelle's evaluations): a verdict label, the strength with specifics, then "However, improvement is needed in …" naming exactly what was missed. The total is a percentage.
- **The trainer's review:** in **✍️ Process Questions** (the top bar, as an admin), open a trainee and a lesson's Knowledge Check: the graded attempt (the answers, each answer's score and feedback, the overall evaluation), and the trainer's comment on each answer, an overall comment and a **final score**. Saved in `kcreview:<id>` (admins write it; the trainee reads it). The trainee sees *🧑‍🏫 Your trainer's review* on the Knowledge Check, and the trainer's notes under each answer. A trainer's score is final: it replaces the graded best (higher or lower) in their progress and on the Scorecard, and 70% or more finishes the lesson.
- **Passing:** 70% passes and finishes the lesson. A retake keeps the best score.
- **Where the score goes:** the score is saved in the trainee's progress (`state.progress`, so it reaches their record) and on the lesson card ("Finished · 76%", or "Knowledge Check · best 53%" before a pass). Each attempt's per-question scores and feedback are kept in `process:<id>` under `kc`.
- **Certificate:** it needs every lesson finished, so it needs every Knowledge Check passed.

**Saving the answer sheet with its proper name** is on the Knowledge Check page, under the questions (📄 Save your answer sheet). The ✍️ Process Questions page (`#/process`) has the same tools for every sheet. Both belong to the ✍️ Process Questions feature — its own button in the top bar, with no page under 📚 Dashboard and no tab in 🛡 Admin Master Control.
- **📄 Save to My Google Drive:** copies the answers and opens a new Google Doc already given the right name (e.g. `VA_Essentials_Process_Question_Answers (Jamie)`). It's created in the trainee's folder once they've saved its link (**📁 My Trainee Folder**). They paste the answers in with Ctrl+V.
- **⬇ Download as Word:** gives a .doc with that name, to upload to the trainee folder.
- **📝 Submit for Grading** (one button per lesson for a sheet shared by two lessons, with the best score so far) grades the sheet as that lesson's Knowledge Check. A sheet counts as submitted when a Knowledge Check is graded with all of its questions answered.

**✍️ Process Questions, opened as an admin,** lists batch → trainee → each answer sheet:
- whether it's submitted, how many questions are answered, and the answers;
- the trainee's best Knowledge Check score per lesson (e.g. `L2 76%`), and **📝 Knowledge Checks: graded, then your review** (above);
- the line for the ranking report, in the facilitator's words, for example "Process Questions Responses: COMPLETE; however, Item #7 under the Virtual Assistant Essentials answer sheet was left unanswered."

## 📁 The Task Tracker and the Monitoring Sheet in the trainee's Google Drive

Trainees keep their **LSH Daily Task Tracker** (a Google Sheet) and their **Training Monitoring Sheet** (a Google Doc or Sheet) in their **VA Output folder**, not on the platform (`js/ft-drive.js`, which replaces the trainee pages of 📋 Task Tracker and 📒 Monitoring Sheet; the on-platform sheets below stay for admins and earlier records).

- **📁 My Drive links** (on both pages): the VA Output folder, the Task Tracker sheet and the Monitoring Sheet. Each file is shared as **"Anyone with the link can view"** so the system can read it. Saved in `drive:<id>` (the trainee's own). Above the links, numbered steps: ① download the templates (⬇ Download / Open ↗ for the Daily Task Tracker, `window.FT_TRACKER_TEMPLATE` or the sample tracker, and the Monitoring Sheet, `FT_MONITOR_DOC`), ② save them in the VA Output folder as Google files (File → Save as Google Sheets / Docs), ③ share the folder and both files as "Anyone with the link" → Viewer, ④ paste the links and save; then a note on the automated monitoring (the nightly and ✅ Check now checks with their AI review).
- **Each training day** (📋 Task Tracker): the links to the day's outputs (typing and spelling test screenshots, documents …), **📤 Submit the day's links**.
- **Graded automatically:** at the end of every shift, on the Worker's cron (`5 22 * * *`: 5:05 PM EST, just after the 8 AM – 5 PM EST shift; 6:05 PM in Eastern daylight time), and on an admin's **✅ Check now** in Admin → 📁 Drive Trackers (`/api/drive/check`; trainees have no Check now button), the Worker reads each file's export (a sheet as CSV, a doc as text) and checks:
  - **the tracker** with the same rules as before (`fromSheetCsv` in `js/ft-tracker-rules.js` turns the sheet into the workbook: the header row with *Task Details*, the dated Daily Notes columns between *Accountable VA* and *VA Notes*, the ⬇ FOR COMPLETION / RECURRING / COMPLETED sections): every open task has its Daily Note for the day, and the day's output links are in (`output-links`). Plus the notes review, in the facilitator's voice.
  - **the Monitoring Sheet**, per discussion (`gradeMonitorText`): its title found, a date, 5 takeaways, questions, the understanding rated (a marked statement, e.g. `[x] I am confident…`). Plus a short review in the facilitator's voice.
  - A file it can't read (not shared, or not a Sheets/Docs link) gets a check that says how to share it.
- **The trainer's input:** **Admin → 📁 Drive Trackers**: batch → trainee → their links, each day's output links and check, and the Monitoring Sheet's check, each with the trainer's **score and comment** (the trainee sees them under the check). Everything is in `trackerreview:<id>` (`days[<date>]`, `monitor`); a new check keeps the trainer's score and comment.
- **Dashboard and Scorecard:** the dashboard's cards show today's tracker check and the Monitoring Sheet's entries found; the Scorecard's *Task Tracker & Monitoring Sheet* averages the tracker days (the trainer's score where given) and the Monitoring Sheet.
- **Test:** `.github/scripts/drive.cjs`.

## Training Monitoring Sheet (on the platform: earlier records)

Trainees used to fill in their **Training Monitoring Sheet** on the platform: **📒 Monitoring Sheet** (`#/monitoring`, `js/ft-monitoring.js`). It now lives in their Drive (above); this is the admin tab and the earlier records.

- **Like the Word sheet**, which is embedded in full at the top of the page (Drive preview, with Download ↗): one entry per classroom discussion, each with:
  - the date;
  - 5 Major Takeaways From This Discussion;
  - 3 Questions That You Still Have;
  - Rate Your Understanding (the sheet's 4 statements).
- **Saving and status:** it saves to the trainee's account as they type (`monitor:<id>`, the trainee's own). An entry is *Filled* when the date, all 5 takeaways and the rating are in. The dashboard shows how many are filled.
- **Admin → 📒 Monitoring Sheets** shows batch → trainee → discussion, with the **automated feedback**:
  - It comes from the **📏 Feedback Rubric**, not AI. The starting metrics: the date filled in; all 5 takeaways; complete sentences; specific, not general (not "I learned about …"); based on the discussion (the takeaways mention a set share of the discussion's key points, 50% to start); and the understanding rating.
  - Each discussion shows its checks, a score, the feedback to copy, and what the trainee wrote. "Needs extra help" marks the entries rated "I really don't get this".
  - **📏 Feedback Rubric:** trainers keep improving the metrics.
    - Switch a metric on or off, and change its settings, its weight in the score and its feedback line (`{which}`, `{count}`, `{min}`, `{missing}`, `{found}` and `{sentences}` are filled in).
    - Add metrics: avoid these words, mention at least one of these, a minimum number of words per takeaway, or questions filled in.
    - Each save is a new version, and every review uses it from then on ("rubric vN" shows on each review). The last 30 versions are kept and can be restored.
    - Stored in `monadmin:rubric` (trainers only); the metric types are `MON_TYPES` in `js/ft-monitoring.js`.
- **Discussions and Key Points** (in the same tab): one discussion per line, with its key points after a "|".
  - Stored in `settings:monitor`, which everyone reads and trainers write.
  - Until it's set, the list is the 18 classroom discussions from the Hubstaff To-Dos.

## Daily Task Tracker (on the platform: earlier records)

Trainees now keep their tracker in their Drive (above). Before that, each trainee had an **LSH Daily Task Tracker** on the platform (📋 Task Tracker in the top bar), laid out like the Google Sheets sample: the status counts, Date Received, Type of Task, Task Details, Accountable VA, the dated **Daily Notes** columns, VA Notes, Deadline, Status and Actual Completion Date, with the For Completion / Recurring / Completed sections and the Client-VA Specific Tasks Index, Links & Access (no passwords), Directory and Time Zone tabs. It saves to the trainee's account as they type (`tracker:<id>`).

- **The daily check** runs on the Worker's cron (`wrangler.json`, 02:00 UTC: 7 PM Pacific daylight time, 6 PM in winter) for every approved trainee, and live on the page while the trainee types. The result is a ✅/❌ per rule, the day's %, and every flagged cell (red on the sheet). Rule for now: every open task has a Daily Note for the day. Rules live in `js/ft-tracker-rules.js`, shared by the page and the Worker; add one to `RULES` to extend the check.
- **Notes review:** the Worker also writes a short review of the day's notes against the criteria in **Admin → 📋 Task Trackers** (`settings:trackercriteria`). It uses the Gemini key pool (`GEMINI_API_KEY5` … `GEMINI_API_KEY9`); trainees see it as "Notes review".
- **Trainer's comment:** in Admin → 📋 Task Trackers, open a trainee's day, write a comment, and the trainee sees it under the check. Results and comments are in `trackerreview:<id>`, which trainees can read but not change.
- **Admin → 📋 Task Trackers** is laid out batch → trainee → record: a collapsible 📁 section per batch (today's average and how many need attention), one compact row per trainee (open and completed tasks, the last five training days, 5-day average), and, when you click a trainee, every daily record on file (the check %, flags and your comment, each opening that day). Archived trainees are listed under **📦 Archived batches**; only active trainees' trackers are loaded, and an archived trainee's records load when you open them.

## Attendance

**Attendance is not taken in this course.** It is centralized on the LSH Training Portal: **Master
Control → 🕘 Attendance** (`/attendance.html`), which takes and reviews attendance for every program,
per program per batch. This course has no Admin → 🕘 Attendance tab (`js/attendance.js` is gone), so
there is no second place to take it and no copy of that file to keep in step.

What this course still does for attendance:

- **Automatic Time In.** The Worker's `/api/checkin` records a trainee's first visit each day (Eastern
  time) as `checkin:<YYYY-MM-DD>:<trainee id>` = `{timeIn, at, name, batch, training}` — each trainee
  their own key, so a room signing in at once never overwrites one another; the same values are in the
  key's KV metadata for the portal; kept 40 days. The portal's page shows it marked "auto" until a
  trainer sets a Time In.
- **The records live in this course's KV**, under the Worker's `ft:` prefix: `attendance:<batch key>:<YYYY-MM-DD>` (`_none` for
  no batch) = `{batch, date, day, training, rows:{<trainee id>:{name, training, timeIn, timeOut,
  status, note, at, by}}}`. The portal reads and writes them directly, and keeps the attendance
  Google Sheet's **Platform Attendance** tab in step both ways. Only admins can read or write them.

The statuses, the per-batch summaries, the CSV downloads and the Google Sheet sync are all documented
in the Training Portal's README.
## 📅 The 18 days and their activities (`js/ft-day-activities.js`)

The program runs on **18 classroom days**; the platform serves **9 lesson decks, named by their training title, not by day**. The two are deliberately different shapes — one lesson covers several days (Receptionist Training is Days 3–5; Lien Negotiator Training, Lesson 9, is Days 17–18). `js/ft-day-activities.js` is the one place that says **which activity belongs to which day**, read off the Training Guide (`trainer/curriculum.json`, Admin → 📘 Curriculum) in the guide's own wording.

Each day is `{day, role, lessons, items}`; each activity is `{t, kind, at, id}`, where `at` says where it is done — `session` (a 🟢 Practice Session), `trainer` (🧑‍🏫 With your trainer), `tool` (a platform tool: `lor`, `skills`, `process`, `calsim`, `callsim`), `drive` (uploaded to the trainee's Assessments/Activities folder), `gc` (run in the training GC) or `room` (live in the classroom, nothing to submit) — and `id` is the platform record it maps to. The daily Typing and Spelling Tests and the Free Communication Upskill are listed once and added to all 18 days, as the guide repeats them.

| Day | Role block | Lesson deck(s) | The day's platform activities |
|---|---|---|---|
| 1 | VA Essentials | 1 | 🧪 the tests set up and named · ✍️ Process Questions |
| 2 | VA Essentials | 1, 2 | ✍️ Process Questions (two assessments go to Drive) |
| 3 | Reception Training | 3, 4 | ✍️ Process Questions (Day 3 is a classroom discussion: no Practice Session) |
| 4 | Reception Training | 4 | 🟢 **Reception Mock Calls** · 🧑‍🏫 Reception Mock Call with the trainer |
| 5 | Reception Training | 4, 5 | 🟢 Reception Mock Calls (the 1–2 hr buffer) |
| 6 | Calendar Management Training | 5 | 🟢 **Standard Training - Appointment Setting Mock Calls** · 📅 Standard Training - Calendaring Activity · 🧑‍🏫 Calendar Management Mock Call · 📅 Google Calendar Simulator |
| 7 | Intake Training | 6 | ✍️ Process Questions |
| 8 | Intake Training | 6 | 🟢 **Intake Mock Calls** (Prototype CMS) · ☎ Call Simulator while waiting · 🧑‍🏫 Intake Packet Demo |
| 9 | Intake Training | 6 | 🧑‍🏫 **Intake Mock Call with the trainer** · the Intake Demo buffer |
| 10 | Insurance Communication Training | 7 | ✍️ Process Questions |
| 11 | Insurance Communication Training | 7 | 🧰 **LOR Drafting Activity** (1P and 3P) |
| 12 | Insurance Communication Training | 7 | 🧑‍🏫 **LOR Uploading and Sending Demo** |
| 13 | Provider Communication Training | 8 | the LOR Drafting Demo buffer · ✍️ Process Questions |
| 14 | Provider Communication Training | 8 | 🧑‍🏫 **MedLOR Demo** · 🟢 **Medical Records: MedLOR and Request for Bills & Records** |
| 15 | Provider Communication Training | 8 | 🧑‍🏫 MedLOR recorded demonstration (entire day) · Shadowing |
| 16 | Provider Communication Training | 8 | 🧑‍🏫 **LV (Lien Verification) Request Demo** |
| 17 | Lien Negotiator Training | 9 | the LV demo buffer · Saving Medical Bills & Records (in the Lesson 9 deck) |
| 18 | Lien Negotiator Training | 9 | ✍️ Process Questions (the net sheet, reduction request and closing statement are done live) |

**What reads it.** The 🟢 Practice Sessions and 🧑‍🏫 With your trainer cards carry their day in the kicker — *Days 4–5 · Receptionist Training*, *Days 14–15 · Demo · Medical Records Specialist Training* — as do the 🧰 LOR Drafting Activity card (*Day 11*) and the 🧪 Skill Building cards (*Days 1–18*). `FTSessions.forDay(n)` lists a day's platform activities, next to the existing `FTSessions.forLesson(l)`. The helpers are `FTDays.of(n)`, `FTDays.items(n)`, `FTDays.forSession(id)`, `FTDays.forAct(id)`, `FTDays.forTool(id)`, `FTDays.forLesson(l)` and `FTDays.label(days)` (which writes *Day 4*, *Days 14–15* or *Days 4, 6 and 9*).

**The day gates too** (🔓 Activity Locks, below): a session, tool, trainer activity or recording set shows in the 🛠 Practice Lab once its lesson is open *and* the trainer has opened one of its days. Nothing about progress, scoring or storage moves.

**The monitoring sheet covers all 18 days.** `MONITOR_TOPICS` (`js/ft-tracker-rules.js`, imported by `worker.js` too, so the page and the Worker grade against the same list) now carries **18** classroom discussions: the Lien Negotiator days close the programme and are monitored like the rest. A trainer who has already saved their own list in Admin → 📒 Monitoring Sheets → *Discussions and key points* (`settings:monitor`) keeps it — the 18 are the default, not an overwrite.

## 📋 Day decks (`js/ft-day-decks.js`)

Every training day has its own deck: **Days 1–18**, one slide per part of the day, with the day's instructions and the videos, documents and Canva decks the trainee opens (embedded viewer links, so they open on the platform). Each lesson's card on 📚 Dashboard opens them.

**📚 Dashboard is the eight lessons, on one screen** (`LSH_HOME_GRID_LAYOUT` in `js/ft-day-decks.js`): the portal's own lesson card for each, four across and two down, its buttons in the order the session runs — on top, **one segment per part of the lesson** in place of a single ▶ Start Training (**Start** for a one-part lesson, else *Part 1 · Part 2 …*, with no "Day" on the card; `js/ft-day-locks.js`). A part is one of the lesson's days, except where the Training Guide splits it otherwise (`PARTS`): Receptionist's Part 1 is Day 3's classroom session (the PI Workflow and Reception Training discussion, shared with Personal Injury Process Flow) and Part 2 is Day 4; Medical Records' Part 1 is MedLOR (Days 13–15, opening on the day the trainee is on) and Part 2 is Lien Balance Verification (Day 16). Each segment opens its day's Activity deck at the step the trainee is on, 🔒 until the trainer opens the day and ✓ once the trainee has been through it; then **🎬 Video** (the lesson's AI discussion video: a trainee asks for it with 🔒 Request Video, it reads ⏳ Requested, and it opens once the trainer approves it in 📅 Open Lessons → 🎬 Unlock Videos → Requests, or unlocks it for the batch) and **🏠 Classroom** (the offline activity: the lesson's homework, else its last activity). The lesson's icon opens its day card (the day deck). A lesson's card holds its discussion day and the days after it until the next lesson: Lesson 1 Day 1, Lesson 2 Day 2, Lesson 3 Day 3, Lesson 4 Day 4, Lesson 5 Days 5–6, Lesson 6 Days 7–9, Lesson 7 Days 10–12, Lesson 8 Days 13–16.

**🧰 Know Your Tools (its own card on 📚 Dashboard, beside 📌 Setting of Training Expectations and Company Policies, and its own page `#/knowtools`, drawn like a deck slide).** It introduces every tool the training uses, one at a time. The tools are listed on the left of the sheet. The picked tool shows a real screenshot (click it for full size), *What it's for*, *Where* to find it, its *Features* and a button that opens it, with *Next tool →*. The eight tools are the 📋 Activity Deck, 🗂 the LSH Case Management System (CMS), ☎ LSH Ring Channel (the Call Simulator), 🟢 Practice Sessions (in the 🛠 Practice Lab), 📅 the Google Calendar Simulator, 🧰 the Drafting Tools, 📚 the LSH Knowledge Base (`/kb.html`) and ✍️ Knowledge Check (Skill Building, the Training Monitoring Sheet and Shadowing & To-Do are no longer on it). Its card's **Start** opens the page; ← / → step through the tools. Its last tool, like the last slide of 📌 Setting of Training Expectations, ends with **✅ End of Module**, which takes the trainee back to 📚 Dashboard (no Next up card beside it on the orientation). So does every day's Activity deck: its last slide's button is **✅ End of Module**, back to 📚 Dashboard, with no Next up card; a deck never runs on into the next day's, even where the lesson continues (the trainee opens that day from 📚 Dashboard). It is no longer a Day 1 slide, and Day 1's deck no longer has the Training Monitoring Sheet set-up either (the orientation and 📒 Monitoring Sheet cover it).
- **Where it is:** `TOOLS` and `toolsSlide()` in `js/ft-day-decks.js` (`renderToolsPage()` draws the page; `window.FT_TOOLS_PIN` puts the card in the pinned row, listed by `pinned()` in `js/ft-program.js`). Change a tool's text there.
- **The screenshots** are in `ft/day1/img/tools/` (WebP, 1200 px wide), each shown in the same 16:10 frame from its top:
  - the platform's own pages, taken in a browser as a trainee;
  - the CMS: its 🧭 Blueprint picture of a case file (CaseManagementTraining, `blueprint/trainee-case-file.jpg`);
  - LSH Ring Channel: its tests' picture of an incoming call (lshringchannel, `tests/03-trainee-ringing.png`);
  - the Drafting Tools: the Training Portal's `simulators/drafting.html`.
  
  Retake a screenshot when its screen changes.
- **One screen:** the page is one panel, never split into pages. On a short screen it is scaled down (to half size at the smallest) so the picked tool always shows whole.

**🗺 Map: the training roadmap** (`mapOpen` in `js/ft-day-decks.js`). The **🗺 Map** button on the Activity deck's bar, beside ← Previous (like the Case Management course's 🗺 Slide Map), opens the whole programme in one window: the eight lessons in order, each with its days and each day with its slides (*7.3 · Call Listening on the sample recordings*). The day you are on reads *You are here*, the slide you are on is marked, and the days before your place are ticked. Tap a day or a slide to go there. ✕, Escape or a click outside closes it.

**The slides' type, as the Case Management course sets it:** body text in Inter 500 at 17px with bold at 700 (the engine had 700 and 900 everywhere), a slide's opening line as a Fraunces 600 lead at 21px, and section headings in Poppins 800. A homework slide keeps its bigger centred type.

**Day 1's card runs the trainers' order:** 1 Reading Task: Personal Injury (the overview's text, word for word with its charts, over 8 slides of about the same length, each titled *Reading Task: Personal Injury* (no *Part N of 8*), each read in pages of big, bold text that start at the top of the sheet (a page more rather than smaller text) (`build/days/pi-overview.html`, split by `piParts()` in `build/day-decks.cjs` at its headings; charts in `ft/day1/img/pi/`; no Google sign-in). Part 8's Next, on its last page, is ✍️ the Reading Task questions: locked for a trainee until every part has been read to its last page (remembered in that browser; trainers are never locked). The sheet then shows *Back to the classroom · Next: …*, to the deck's next activity; its six questions are the *Reading Task: Personal Injury Overview* sheet of Lesson 1's ✍️ Knowledge Check, `pi-overview` in `js/ft-process.js`) → 2 Classroom Discussion (▶ Start Training) → 3 Handouts / Video (the handouts in the GC; the AI discussion video, or 🔒 Request Video) → 4 Process Questions: Submit (✍️ Knowledge Check) → 5 Installation of SA (Smart Advocate) Plug-ins (the curriculum's steps; the deck keeps only the SA part of Day 1's PM, `TRIM` in `build/day-decks.cjs`). A row can run a platform action of its own (`run`).

**Every day deck opens on its day card** (in place of the Training Agenda): the day that opens a lesson on the lesson's Classroom Activity card, with its Process Questions' key takeaways and file name; a day after it (Days 6, 8–9, 11–12, 14–16) on a *Day N* card of that day's own rows and focus (`DAY_TITLES`, `DAY_FOCUS`), with **📋 Day N** buttons between the lesson's days:
- **The header:** *Classroom Activity: [lesson]*, its days, **▶ Start Training** (the lesson) and **Classroom** (the offline activity).
- **Activity & task sequence (left):** numbered rows in the order the guide runs them, each with a pill for its kind (Classroom, Read & Do, Interactive activity, Watch & do, Assessment, Mock calls, Demo, Shadowing, Buffer, Call listening, Homework). A row opens its own slide in that day's deck (`{d, s}`: the day and the slide id in `build/days/`) or the platform page it names (`{go}`). Once the trainer has added something to a no-discussion day, a **📌 From your trainer · Day N** row opens it. A multi-day lesson's card has **📋 Day N** buttons for each day's slides.
- **Today's focus (right):** the focus line, *Outside training hours*, *Activity instructions & tools*, the Process Questions' key takeaways, and the file name and where it goes, with **✍️ Answer on Knowledge Check →**.

The rows and the focus are written in `LESSON_CARDS` from the Training Guide; change a lesson's card there. The deck page (`#/daydeck`) fits one screen with nothing scrolling: the slide and Previous / Next (also ← / →), with a button to that day's lesson. Every slide fits the way the Case Management course's slides do (`fitSlideZoom` in its `js/cm-updates.js`): the slide's header, ribbon and bar keep their size and only the content of its card is scaled down until it fits, to half size at the smallest (`zoomToFit`, `fitSheets`). Only a slide still too long at half size is read in pages (*Slide 2 of 5 · Page 1 of 3*), and Next turns its pages first. On a short screen (900 px high or less, e.g. a 1366 × 768 laptop) the slide's header is drawn smaller so the card gets the room, and the slide's buttons (📘 Open the lesson, 📝 What I learned) sit on the pill row. The day card's *Classroom discussion* label reads **Classroom Activity** (the pill, the ribbon, the card's header and the lesson card's kicker).

- **Drawn like the Case Management course's Case Flow slides** (`js/cm-case-flow.js` in Case-Management-Training: the same card, title, ribbon, chips and Previous / Next bar), and made for visual learners: a glass navy card with orange and lavender line ornaments at three corners; no logo on the slide (it is in the top bar); the orange-outlined title with the deck's progress line under it; the part of the day on a centred, uppercase ribbon with an orange underline; one row with a pill for the kind of slide (🎬 Watch & do, 💬 Classroom Activity, 📞 Mock calls, 🎥 Demo, 👀 Shadowing, 📝 Read & do), the slide's number as a mono chip (*8.2 · Slide 2 of 5*), a time chip (🌅 Morning, 🌇 Afternoon, 📅 Entire day, 🏠 Homework, ⏳ Buffer) and the slide's buttons at the right; the content on a white sheet; Previous, *Step N of M* and Next on a white bar under the card; and the side column headed by the day (*Activity Deck · Day N of 16*, its title in Fraunces). A page that holds more than the screen is scaled to fit, up to a third more per page, so a split slide has fuller pages and fewer of them. **Each day opens on its Training Agenda**: the day's slides as numbered rows (click one to jump there), and a side card with the day's lesson and what the slides hold (videos, folders, decks). In the content, every video, document, sheet, folder and Canva link is a **picture tile** (🎬 ▶ Watch, 📄 Open, 📁 Open the folder…), each *Task N* is a **numbered step** (the Monitoring Sheet updates in green), *Topic* lines are chips, naming conventions are a 🏷 box to copy, and notes and reminders are 💡 callouts. All of it is drawn by `js/ft-day-decks.js` from the same slide data, so the generator and its checks are unchanged.
- **Who opens which day:** a trainee opens a day once the trainer has opened its lesson (📅 Open Lessons) and its first step (🔓 Activity Locks, below), and only as far as the steps unlocked. A day they have been through stays open to review. An admin opens any day.
- **No "Day" on a slide:** the ribbon reads *Classroom Activity* or *Activity card*, a day's last slide reads *End of today’s training*, a time chip reads 🌅 Morning, 🌇 Afternoon or 📅 AM & PM, and a link to the next day names what it holds (*Intake Process & the Intake Packet Demo*). The days are numbered only on the Dashboard's segments, the 🗺 Map and the trainer's pages. The Hubstaff To-Do names and the Monitoring Sheet topics on the Setting of Expectations slides keep their *Reception Training Day 1* wording: they are the names trainees type, and the Worker grades the sheet against them.
- **Every day ends as Day 1 does,** on its own end slide (✅ Finish → 📚 Dashboard), or, when its lesson goes on the next day, on the divider into it.
- **No Process Questions on a slide:** they are answered in ✍️ Knowledge Check only. Each list (and its naming convention) is replaced by a pointer there.
- **Placeholders:**
  - the **trainer-slot** boxes stay: a trainer in trainer view sees the facilitator's notes there, and a trainee sees nothing;
  - **"Link coming"** boxes wherever the guide names material it has no link for yet (`PENDING` in `build/day-decks.cjs`). Checked against the v09.18.2026 guide, there are none on the trainee parts today;
  - a lesson day's last slide is **🎲 Today's Task** (`taskSlide` in `js/ft-day-decks.js`): the unannounced task a trainer sends from Admin → 🎲 Random Tasks (`surprise-task-day<lesson>`, written from the lesson's own material) lands there, with its time left and 🎲 Answer it in Tasks; until one is sent, the slide says a task can arrive any time. A trainer sees where to send it from.
- **📌 From your trainer — the no-discussion days' activities and instructions.** On Days 4, 6, 8, 9, 11, 12, 14, 15, 16 and 18 the last slide is *From your trainer* instead of "To be added". A trainer (admin view) adds to it right on the slide: a kind (📝 Instruction, ☎ Practice on a simulator, 🎬 Video, 📄 Document, ✅ Activity, 🧩 Exercise, 📋 Assessment), a title, the instructions and an optional `https://` link (a Drive or Docs link opens in the platform's viewer), then ↑ to reorder or 🗑 to remove. **Mock-call day? One click** adds the instruction to practise on the simulators while waiting for a turn: ☎ Reception, ☎ Intake or ☎ Calendar calls (the Call Simulator on that line), 📅 the Google Calendar Simulator, or 🛠 the Practice Lab. It is saved in `settings:dayextras` (`{days: {N: [{kind, title, text, url, sim}]}}`; admins write it, everyone reads it) and every trainee sees it, as text only, on that day's deck.
- **Left out:** facilitator-only parts, and on Day 1 the Setting of Expectations (written to the trainer), the Training Reminders and the Nitro Pro 12 / Smart Advocate plug-ins installation. The Nitro Pro and Adobe Acrobat Pro how-to homework is left out too.

The slides are `js/ft-day-decks-data.js`, generated from the day files (`build/days/`): after changing a day file, run `node build/day-decks.cjs`. It refuses to write a deck with an answer key, a facilitator section, log-in details or a Process Questions list in it, and the **Day decks** check fails when the data file is out of date. The data file loads the first time a deck is opened, not with the dashboard.

## 🔓 Activity Locks: every day in Day 1's order, each step opened by the trainer (`js/ft-day-locks.js`)

Day 1 goes one step at a time, each unlocked by the trainer (`js/ft-day1-flow.js`, 🔓 Day 1 Steps). **Days 2–16 run the same way.** A day's steps are its Activity deck in the order the day runs, the order of its card, as on Day 1: the day card, the opening task (a buffer, the checking of assignments), 💬 the Classroom Discussion and 🎬 Handouts / Video on a lesson's first day, the day's activities, ✍️ Process Questions, the homework. A step is a slide and the slides that continue it (a topic's parts, a recording set's log).

- **Trainer unlock:** Admin → 📅 Open Lessons → **🔓 Activity Locks**, for all batches or the batch picked above it. Each day lists its steps under its time blocks: 🔓 Unlock (or *up to here*), 🔒 Lock from here, 🔓 Open the AM session / PM breakout / Outside hours, 🔓 Open the whole day, 🔒 Lock the day.
- **Locked by default:** a day is locked until the trainer opens it, and a later step until it is unlocked. Unlocking a step opens every step before it, so nothing can be skipped.
- **Batches already under way stay open:** the first time an admin opens the platform with the locks, the lessons open at that moment are recorded (`legacy` in `settings:daysteps`), read straight from the server (a read that fails writes nothing and is tried again at the next check). The days of those lessons are never held for the batches they were open for: a lesson opened for one batch, for that batch; a lesson opened for *All batches*, for every batch whose code (B + MMDDYY, its start date) is not after that day, so a batch that starts later is locked step by step from its first lesson. Only lessons opened after that are locked step by step. Until the record is written nothing is held, so a lock never lands on a trainee mid-programme. 🔒 *Lock these too* applies the locks to them as well, for all batches or for the one chosen (`legacy.except`).
- **A batch's own setting stands in for *All batches*:** once the trainer unlocks, locks or schedules a day for one batch, that batch follows its own setting, so it can be held back behind the rest or taken off a schedule they share (*Clear* for a batch saves "no schedule for this batch").
- **Where the trainee left off:** a day's segment opens the slide the trainee reached (this browser), never past what is unlocked; the first time, the day's card.
- **Never on a guess:** until the day decks have loaded, a locked lesson, video, Knowledge Check or tool doesn't open; it opens (or says it is locked) once they have. A server that doesn't answer leaves the last settings read in place, rather than locking the days or switching the locks off.
- **What waits:** for a trainee:
  - a locked step's slide shows its lock (*Go to the step you are on →*), and Next, the dots and the 🗺 Map don't go there;
  - the deck goes one slide at a time, as Day 1's does;
  - the lesson deck, its 🎬 video and its ✍️ Knowledge Check wait for their step;
  - 🎧 Call Listening, 🧰 the LOR Drafting Activity and the Transcription Activity wait for the step that opens them;
  - the 🛠 Practice Lab's sessions, simulators, tools, trainer activities and recording sets wait until one of their days is opened.
- **⏰ Timed slots:** each step is in a time block, read off its slide (*AM:*, *PM:*, *Entire Day:*, *HOMEWORK*; a slide with none is in the block before it): 🌅 AM session, 🌇 PM breakout, 🏠 outside hours / idle time. The trainer sets the blocks' start times once (*Save times*), then puts a day on a date (*⏰ Run on … Schedule*). Each block's steps unlock by themselves when it starts. The instants are saved as UTC, from the trainer's own time zone, so every trainee reads them alike. A page left open picks up a block's start within half a minute, with no request to the server. Day 1 can run on a schedule too: its Process Questions open with the AM session, the Installation of SA with the PM, Finish after hours.
- **Who is held:** trainees only. An admin and the 👁 trainee view see everything, and a day the trainee has been through (read to its last slide) stays open to review.
- **Stored in** `settings:daysteps` = `{all: {"<day>": n}, batches: {"<batch key>": {"<day>": n}}, sched: {all: {"<day>": {am, pm, out}}, batches: {…}}, times: {am, pm, out}, legacy: {all: [lesson ids], batches: {"<batch key>": [lesson ids]}, at}}`: the last step unlocked (0 locked, 999 the whole day). It is read with the open lessons in the same request (`ftLoadOpenDays`), so it costs no extra requests. Admins write it; trainees read it (`PUBLIC_READ` in `worker.js`, with `settings:day1steps`, which trainees couldn't read before in secure mode).
- **Checks:** `.github/scripts/day-locks.cjs`. The test server opens every day to its end (`server.mjs`; `FT_DAYS_LOCKED=1` starts them locked), so the other tests run as before.

## 🔗 Resource links open on the platform, not in a new tab

Everything the guide hands the trainees — the activity instructions, the videos and the resource sheets — opens in the **pop-out viewer** (the draggable, resizable pane with ⛶ Full screen and *Open in a new tab ↗*), so a trainee never loses the page they were on. A link becomes a viewer link by carrying `class="viewer-link"` with `data-kind="doc|video"` and `data-title`; `lvEmbedUrl` (`js/ft-updates.js`) turns the address into its embed form:

| Link | Embedded as |
|---|---|
| Drive file (`/file/d/<id>/view`, `open?id=`, `uc?id=`) | `/file/d/<id>/preview` |
| Drive folder | `embeddedfolderview?id=<id>#grid` |
| Google Doc / Sheet | `/preview` |
| Google Slides | `/embed` |
| Canva design | `/view?embed` |
| Loom recording | `loom.com/embed/<id>` |
| YouTube | `youtube.com/embed/<id>` |

A Doc, Sheet, Slides deck or Canva deck is always `data-kind="doc"` — it is read, not watched, so the viewer opens it at document proportions and without the *"do you want to watch this video?"* prompt. Loom and YouTube are `video`.

**What deliberately stays an ordinary new-tab link:**

- **Third-party tools the trainee has to go and use** — the typing and spelling tests (TypingClub, SpellQuiz, TypingTest, Spelling-Test), iLovePDF, the WinRAR download, the NPI registries (npidb.org, npino.com), the free HIPAA course and the Smart Advocate knowledge base. They are not resources of ours, and most of them refuse to be framed.
- **The credentials document.** It is never embedded, so log-in details never render inside the platform. `convert.py` keeps replacing credential lines with 🔒 *Log-in credentials aren’t stored on the platform* and a plain link out to that document, and the import still fails rather than write a credential.

`link_html` in `build/curriculum/convert.py` applies this on import (its `EMBEDDABLE` list and `lvEmbedUrl` are the two halves — keep them in step). The files generated before it learned to were migrated in place.

## 🛠 Practice Lab: real-time Practice Sessions at the trainee's own law firm

**🛠 Practice Lab** (a section of the top bar) opens `#/simulators` (`js/ft-simulators.js`). Instead of simulators, the trainee does the real work, live, for their own law firm and on their own cases. The page: 🏛 their firm, 🟢 Practice Sessions, 🧰 Drafting Tools, 🧑‍🏫 With your trainer and 🧪 Skill Building. The separate simulator cards are gone (the Calendaring Simulators card, the mock-call cards and *All simulators*): the Call Simulator (on ☎ LSH Ring Channel) and the Google Calendar Simulator are tools inside their sessions, and the **Calendar Management Mock Calls are part of Standard Training - Appointment Setting Mock Calls**. The main landing page has no Practice Lab / Simulators card.

### 🏛 Law Firm Profiles and assignments (`js/ft-firms.js`)

- **Firm profiles** (`settings:firms`, admins write, everyone reads): name, location and state, time zone, hours, main line and greeting, attorneys and team, the firm's **rules by area** (general, reception and calls, calendar, intake, claims, medical records), its calendar **color rule** by length, statute of limitations (years), LOR deadline, records vendor (**ChartSwap**) and the record types it requests, records email, and its **caseload**: Training Library cases in the CMS. Until an admin saves them, three starting profiles are used: **LSH Training Law Group** (the CMS's own firm and rules, Georgia, MC-01–MC-20), **Harbor & Pine Injury Law** (Florida, PIP, MC-21–MC-36) and **Summit Trial Attorneys** (California, Pacific time, MC-37–MC-52). All fictional.
- **Nobody is assigned a firm.** Every trainee works for the **first profile in the list**, from their first page load. There is no per-trainee assignment: the firm and case pickers, *Assign this firm to all* and **🎲 Spread cases** are gone, and nothing writes `assign:<id>` any more. A trainee is never left waiting on a trainer before they can practise, and a trainer has nothing to set up.
- **Cases are not handed out on the platform.** `FTFirms.myCases()` returns none while a new plan for them is written. The Practice Sessions follow the Training Guide and need none (see *Practice Sessions* below). Old `assign:<id>` records are simply left unread.
- **Admin → 🏛 Law Firms:** edit, add or delete firms (↺ restores the starting ones). The screen is the profiles only; editing the first one changes what every trainee works for.
- **🏛 My Firm** (`#/firm`): the trainee's firm, its rules (✓ *I've read and understood my firm's rules*, saved in `sessions:<id>`) and their cases, each opening in the CMS.
- **The case facts** the sessions check against are `js/ft-cases-data.js`, generated from the CMS's Training Library: `node build/make_cases.cjs <CaseManagementTraining/mock-cases.js>` (run it again when the cases change).

### 🟢 Practice Sessions (`js/ft-sessions.js`)

| Session | Day | Lesson | Done in | Recorded and checked |
|---|---|---|---|---|
| ☎️ Reception Mock Calls | Days 4–5 | Receptionist Training | the Call Simulator's Main Line on ☎ LSH Ring Channel (graded or practice calls), the CMS Front Desk Drill | the call note: the firm's greeting, a complete message, the case and need, routed to someone on the firm's team, the caller verified, initials |
| 📅 Standard Training - Appointment Setting Mock Calls (once the Calendaring Practice Lab) | Day 6 | Calendaring & Appointment Setting | the Calendar Management mock call (CMS), then the Google Calendar Simulator | the appointment: caller and case, a weekday inside the firm's hours, on the 15-minute grid, the firm's color for its length, Meet and the reminder, a description |
| 📋 Intake Mock Calls | Days 8–9 | Intake Specialist | the Call Simulator's Intake Line on ☎ LSH Ring Channel, the details entered straight into the **Prototype CMS**'s fields (the Training Guide's *Intake Mock Call Activity – Training Platform*); no case is handed out — the caller is the lead | the intake: first and last name, a 10-digit callback number, a DOB before the accident, a DOL not in the future, the case type, injuries and treatment, the 3P carrier (or Unknown), the statute of limitations under the firm's rule, entered in the Prototype CMS, the conflict check and a decision |
| 🩺 Medical Records: MedLOR and Request for Bills & Records | Day 14 | Medical Records Specialist | the Day 14 tutorial, before the recorded MedLOR demo with the trainer; the provider the trainer gave for the demo, client John Test Doe — no case handed out | the file name (*MED - Lien Holder(Provider) - MedLOR with Unsworn COR and HIPAA mm.dd.yy (name)*, naming the provider, and the doctor for NPIM), the HIPAA date the client signed and *Self*, both boxes on the MedLOR, then the e-mail subject line (*client - provider - Request for Medical Bills and Records*) or, by fax, `+1…@metrofax.com` and the name, *General Virtual Assistant*, work email and phone below the closing |

- **No case is handed out, and no session needs one.** The sessions follow the Training Guide: Reception and Calendaring as before, the Intake Mock Calls on the Prototype CMS (the caller is the lead), and the Medical Records session as the Day 14 MedLOR request. **PI Process Flow is not a Practice Session** — Day 3 is a classroom discussion with no case work. The LOR Drafting Activity is unaffected — its case comes from `lorassign:<id>`.
- **Real time:** ▶ Start the session starts a clock and opens the tools (the CMS signed in: see *Training tools open signed in*); the trainee records their work on the session's form as they go and **📤 Submits for review**.
- **Then:** (1) the automated checks against the Training Guide's rules and the firm's, a % per session (80% passes); (2) the AI's evaluation in the facilitator's feedback DNA; (3) the trainer's review. The trainee can do a session again.
- **Admin → 🟢 Practice Sessions:** **📡 Live now** (sessions in progress, refreshed every 20 s while the tab is open and visible; it can be paused), then every trainee's sessions by batch: what they recorded, the checks, the AI's evaluation and the trainer's **score and comment** (final).
- **Graded calls** still count in their lesson: the Reception, Calendaring and Intake sessions show the lesson's best graded call from the Call Simulator (`callsim:<id>`, below).
- **Records:** `sessions:<id>` (the trainee's runs, answers, checks and the AI's evaluation), `labreview:<id>` (the trainer's reviews and inputs; admins write it, the trainee reads it).

### 🧰 Drafting Tools → LOR Drafting Activity

**The Claims Specialist Practice Session is gone.** The Claims Specialist work is now the **LOR Drafting Activity** (`#/lor`, `js/ft-lor.js`), under 🧰 **Drafting Tools** in the Practice Lab. It is a **tool** — template-driven, so every template in `js/ft-lor-data.js` gets its own tab, fields and file name — and a **standalone activity**: it never becomes a case file, and the page says so at the top, for trainees and trainers alike — *do not create a case file in the CMS for this activity, and do not link it to any case file*. The trainee drafts the letters here and uploads the files they download into the Smart Advocate demo by hand. **It opens on the Training Portal's shared Drafting tool** (`lshOpenPortalDrafting`), where each letter shows as the firm's original and the trainee edits it on their own computer — ✎ Edit in Word for Word or any word processor, ✎ Edit in PDF for any PDF editor — and uploads it back to be checked and scored to their progress; a MedLOR shows the client's signed HIPAA under the letter.

- **The trainer assigns the case.** `#/lor` as an admin lists every approved trainee by batch with a case picker (one of the 18 cases of *Case Notes For Drafting Activity (SA Demo)*). Saved in `lorassign:<id>` — admins write it, the trainee reads it. Changing a trainee's case keeps whatever they have already drafted. Until a case is assigned the trainee is told to ask their trainer for one.
- **The case notes** are on the page, the 1P set beside the 3P set, with **⬇ Download my case notes (PDF)**.
- **The trainer can draft a test copy.** Under the assigning panel, `#/lor` as an admin carries the whole activity, working: pick any of the 18 cases in *Draft as*, read its notes, fill the highlighted fields, tick the boxes and download both letters — the same page a trainee gets, so the set-up can be checked before the cases go out. It is a **test copy**: it is never written to storage, no trainee ever sees it, the save line says so, and **Clear what I typed** empties it. (👁 Trainee view still shows the page as an *unassigned* trainee sees it.)
- **Two editors**, one per activity: *Activity 1 — LOR Drafting for 1P* and *Activity 2 — LOR Drafting for 3P* (with its Affidavit of Insurance Coverage). Each shows the firm's template exactly as the `.docx` has it. **Only what the firm highlighted in yellow is editable**; everything else is fixed text.
  - **The date is auto-generated** and is always the current date — the day the letter is drafted — as a CMS template editor does it.
  - **"SENT VIA FACSIMILE AND E-MAIL" is typed by hand**, not offered as a placeholder: it carries the template's own wording and the trainee edits it to match how the letter actually goes out.
  - A highlighted run longer than a line (the 3P letter's property-damage paragraph) is a textarea.
  - **The 1P letter's three tick boxes work**, and a tick comes out as `[X]` in the download. For this activity every type of claim is ticked.
  - Answers save as the trainee types, in `lor:<id>` (their own record).
- **⬇ Download** gives the edited letter as a **PDF** (or a **Word** file). **The file name is editable.** It starts as the trainers' own convention for that template, taken from the activity sheet and filled in — `INS – <carrier> - LOR mm.dd.yyyy (VA's name)` for 1P, `… - LOR with Affidavit …` for 3P — with the carrier from the assigned case and the date from today. The trainee can type a different name in the box; what is in the box is what the file is called, it saves with their draft (`letters.<id>.file`), and **↺ Reset to the convention** puts the generated name back. A template added later is named from its own `naming` string the same way, with no code to change.
- **The templates are generated, not typed.** `build/lor/make_lor_data.py` reads the three files the trainers sent (kept in `build/lor/source/`, which `build` keeps out of the deployed site) and writes `js/ft-lor-data.js`. When the trainers send new templates or new case notes, run it again rather than editing the output:

  ```
  python3 build/lor/make_lor_data.py build/lor/source/Case_Notes_For_Drafting_Activity_SA_Demo.docx \
      build/lor/source/1P_LOR.docx build/lor/source/3P_LOR_with_Affidavit.docx
  ```

  It fails rather than writing a template with no highlighted fields, so a file that lost its yellow never reaches trainees silently.

### 🎧 Transcription Activity (`#/transcribe`, `js/ft-transcribe.js`)

Day 9's *Minutes of the Meeting Transcription Activity: Client-to-Attorney*, as a generalist VA's real assignment in a realistic setting, under 🧰 **Drafting Tools** in the Practice Lab (and Day 9's step on 📚 Dashboard). One assignment per interview recording (Recording 1 and 2), run as six steps the page ticks off as they're done:

1. **📨 The request:** Atty. Magdalena's task e-mail — the minutes of her client interview, the file name she expects (*Transcription - Recording N (first name)*) and where to save it, with the recording attached.
2. **🎧 Listen:** ▶ *Open the recording and start* plays the Drive recording on the page (and in a new tab) and starts the time on task. A stopwatch kept with the recording; **Alt+T** (or ⌨ Insert) puts its `[m:ss]` into the discussion.
3. **📝 Draft:** a *Minutes of the Meeting* page laid out like the Word file: date, time, attendees, purpose, the discussion in order with timestamps, the client's concerns, the attorney's advice, and the action items (who does what, by when). The 📄 Sample Minutes of the Meeting opens beside it.
4. **🏷 Name & file it:** the file name, ⬇ *Download as Word* (named by it), and the file's link in the trainee's Assessments/Activities folder.
5. **💬 Report back:** the reply to the attorney, as in the GC or by e-mail.
6. **📤 Submit:** the checks, live as the trainee types — every part filled, the discussion in detail (200+ words), 3+ timestamps, 2+ action items, the file name by the convention, a Drive link, and a report-back with a greeting, what's done, where it is and thanks — then an evaluation in the facilitator's feedback DNA. A submitted transcription is read-only until *🔁 Revise and resubmit*.

- **Saved in** `transcribe:<id>` (the trainee writes it; `worker.js` allows it). An admin and 👁 Trainee view work on a test copy that is never saved.
- **The trainer** sees every trainee's minutes, file name, link, report and evaluation at the top of the same page, and records the score in **🧑‍🏫 Trainer Inputs** (*Minutes Transcription: Recording 1 / 2*, lesson 6), which reaches the Scorecard. (If the trainer-led activities list was edited in Admin, add the two rows there.)

### 📘 Process Guide (`#/guide`, `js/ft-process-guide.js`)

Before each recorded demo the Training Guide has the trainee watch the tutorial and *create their own notes or work guide*. Here they build it under 🧰 **Drafting Tools**, on a page that works like Word, with the tutorial playing beside it. There is one guide per demo, and each is a step on its day:

| Day | Guide |
|---|---|
| 8 | Saving the Intake Packet and Extracted Intake Documents in SA |
| 12 | Saving LORs to SA and sending them to the 1P & 3P insurance companies |
| 14 | Sending the MedLOR and requesting medical bills & records |
| 16 | The Lien Balance Verification request |
| 17 | Saving Medical Bills & Records |
| 18 | The Reduction Request and Closing Statement |

- **The editor:** styles (Normal, Heading 1–3, Quote), bold / italic / underline / strikethrough, highlight and font colour, bullets and numbering, indent, alignment, hyperlinks (Ctrl+K), tables, a horizontal line, undo / redo, and clear formatting.
- **Screenshots:** pasted with Ctrl+V, dropped onto the page or inserted from a file. They are shrunk to 1400 px JPEG on the way in. Click one to set it Small / Medium / Large / Full width, or remove it.
- **📐 Start from the outline:** the title, tools, naming convention, the steps, the reporting templates and the reminders.
- **The checks, live:** a title, 8+ numbered steps, 2+ screenshots, a hyperlink, the naming convention, and 300+ words.
- **⬇ Download as Word:** an MHTML `.doc` that carries the pictures, named *Process Guide - <demo> (first name)*. **📋 Copy for Google Docs** copies the formatted guide. **📤 Submit** makes it read-only until it is revised.
- **Saved in** `guide:<id>:<guide id>`, up to 5 MB each. Everything shown is cleaned first (only formatting, links and pictures survive), so a guide can never run code on the trainer's page. An admin reads any trainee's guides at the top of the page. The demo itself is scored in 🧑‍🏫 Trainer Inputs.

### 🎬 Video Notes (`#/learn`, `js/ft-video-notes.js`)

Watching a training video is an activity, not a link. Every video in the 📋 Day decks carries **📝 What I learned**, which opens a short form:
- **What it asks for:** three key takeaways in the trainee's own words, the new terms they met, one question for their trainer, and how they'll use it on the job.
- **Checks and copy:** the form has its checks, plus **📋 Copy for my Monitoring Sheet**, because the guide asks trainees to update it after the videos.
- **Progress:** the button turns ✓ once the notes are complete.
- **The page:** **🎬 Video Notes** (📂 My Pages) lists every video of the days the trainee has reached, by day, with a progress bar. An admin sees every trainee's notes there.
- **Saved in:** `learn:<id>`.

### 🧑‍🏫 Trainer Inputs: what can't be simulated

The trainee–trainer activities (the demos and the live mock calls with the trainer) are recorded by the trainer: **Admin → 🧑‍🏫 Trainer Inputs** is a grid of trainees × activities; a cell takes the result (Not yet, Passed, Redo), a score, the date and a comment. **✏️ Edit the activities** changes the list (`settings:trainer-acts`, one per line: `title | lesson | kind`; the starting list is the Training Guide's live mock calls and its demos, including the Saving Intake Packet and Extracted Intake Documents Demo). The trainee sees each result under *🧑‍🏫 With your trainer*, and it reaches the Scorecard.

### ✅ Buffer time, mock calls and demos: Done, and the trainer's live tracker (`js/ft-buffer.js`)

The buffer, mock call and demo slides of the Activity decks carry a screen of their own (`ACTS` in `js/ft-buffer.js`: Days 2, 5, 9 and 13's Buffer Time; the Reception, Calendar Management and Intake mock calls on Days 4, 6 and 9; the demos on Days 8, 12, 14, 15 and 16), drawn at the foot of the slide in place of its ⏳ *While you wait* box:
- **Buffer time:** *Use this buffer to finish all your pending tasks. Hit Done when you are.* and a **Done** button.
- **A mock call:** *Practice Buffer: Mock Call Preparation*: practise on the lesson's Call Simulator line, log in to the Ring Channel, watch the pre-brief, wait on standby for the trainer's call; *⚠️ Only click 'Done' after you have completely finished your 1-on-1 mock call with the trainer.* over **Done**, which asks *Have you completed your 1-on-1 mock call with the trainer?* (**Cancel** / **Yes, I'm Done**). A demo gets the same, worded for the demo (a recorded demonstration: Done once it is submitted).
- **Screen 2, Debrief Prep:** once done, the activity's scorecard (`js/ft-rubrics.js`) to review while the others finish, and *Waiting for the group debrief to start…*
- **The trainer** (Admin, not 👁 Trainee view) sees, on the same slide, **Live Session: Mock Call Progress Tracker** (Demo / Buffer): the batch, *Completed: X / N Trainees* with a progress bar, each trainee *Waiting* or *✓ Done* with the time, **Mark done** / **↩︎ Revert**, and **📋 Score**, which opens that trainee's scorecard in 🧑‍🏫 Trainer Inputs (the scores and comment go to the trainee's progress; **↩︎ Back to the live session** returns). **Start Group Debrief** (**🔓 Unlock the next activity** on a buffer) stays locked, *Waiting for all trainees to complete their mock calls...*, until every trainee is done; then a 🎉 banner (and a toast) says so, and the button releases the batch: each trainee's slide moves on to the next activity by itself (on a day's last slide, it says the debrief has started). Where Activity Locks run (`settings:daysteps`), the release also unlocks the batch's next step of the day.
- **Storage:** `buffer:<trainee id>` = `{acts: {"<day>:<slide id>": {done, by}}, released: {...}}`. A trainee marks only their own Done (the worker stamps the server's time and ignores the rest); reverting and releasing are the trainer's. A trainee who is done checks for the release every 20 s while the slide is on screen, and the tracker reads its batch every 15 s while it is on screen; nothing polls anywhere else. Test: `.github/scripts/buffer.cjs`.

### 🧪 Skill Building

The 🖥 Demo preparation cards are gone: every demo is done live with the trainer under 🧑‍🏫 **With your trainer**, so a card per demo only repeated them.

**🧪 Skill Building** (`#fts-skills`): the daily Typing Test (twice a day) and Spelling Test (once a day), each with the tools to use (TypingClub or TypingTest.com; SpellQuiz or Spelling-Test.com), when to take it, the screenshot's file name and a sample. The tests are `TESTS` in `js/ft-rules.js` (shared as `window.FT_SKILL_TESTS`); the orientation slide only points here (`ftsGotoSkills()`).

**Graded calls count in their lesson.** The Call Simulator is **☎ LSH Ring Channel's** — the training phone itself (the lshringchannel repo): a caller rings the trainee's phone on the line the session is about (Reception and Calendar Management on the Main Line, Intake on the Intake Line), they answer with a headset and use the phone's own keys (mute, hold, transfer) and 🔎 Case lookup, and the call is graded on that line's Mock Calls Metrics. Every link goes through the Main Portal, which opens Ring Channel signed in: `https://cm-training-activity.pages.dev/simulators/call.html?program=FT&line=<line>` (`&mode=graded` for the line's graded call, a caller unknown until the debrief) → `/api/launch?tool=ringchannel&to=calls` → the phone's 🎧 Practice, in its own tab. A graded call taken there is reported by Ring Channel to the Training Portal (its `/api/call-results`), which keeps it in this program's store as `callsim:<trainee id>`; the Worker lets the trainee read it but never write it. Reception (lesson 4), Calendar Management (5) and Intake (6) then show their best graded call on the session card ("🎯 Graded calls: best 82% · 2 calls") and on the lesson card ("📞 82%"), and the dashboard band shows the three lessons' best graded calls averaged. It's read once a page load and again when the trainee comes back to the tab (at most every two minutes).

### 🔐 Training tools open signed in (no CMS log-in page)

Every link to the training CMS (cases, the Training Library, the Front Desk Drill) and to the Training Portal's simulator pages (the Google Calendar Simulator, Medical Records Requests, …) opens it already signed in. `js/lsh-tool-links.js` (the same file in every LSH course repo) adds a fresh ticket to the link on the way out (`?ticket=`: clicks, middle-clicks, New tab ↗, `window.open`, and the Open here frame through `LSHToolLinks.ticketed(url)`). The ticket is signed by this Worker (`/api/auth/tool-ticket`) with the Portal's `PORTAL_SSO_SECRET`, in the Portal's own format (`{first, last, b, exp}`, good for 5 minutes), so the CMS signs the trainee in through its existing Portal sign-in (`guest-access.js`, `/api/portal-login`). Trainees only: admins and 👁 Trainee view are left alone (an admin's ticket never signs anyone in), and without the secret the link opens as it was. The Portal signs the trainee in from the ticket before a simulator page is sent (its `functions/_middleware.js`, Training-Portal repo), and there a signed-in trainee always practices as their own account.

## The facilitator's feedback style

`js/ft-activities.js` (wired in like the Tracker and Simulators, no edits to the generated page). It used to hold **📝 Activities** too: daily activities by program day (Day 0 to Day 18) that trainees answered and trainers reviewed, with scored rubrics. That page, its Admin tab and its Scorecard row were taken off, because the 🛠 Practice Lab and the ✍️ Knowledge Checks cover that work. What trainees sent and the feedback on it stay stored (`activities:dayN`, `actsub:<trainee>`), and the feedback already sent is still offered to 🗣 Feedback Style as examples.

- **The facilitator's DNA** (`js/ft-facilitator-dna.js`) is the default voice of every AI reviewer: trainer review drafts, graded exercises, and the Worker's nightly Task Tracker notes review.
  - It was written from the facilitator's own evaluations (the B082826 Week 1–3 ranking reports and a Scheduling Activity Review).
  - Its main rules: open with a verdict label ("Good, with Improvements Needed.", "Needs Improvement."…); give the strength with exact counts, items, dates and times; then "However, improvement is needed in …" with the specific components; grade the severity; and tie the fix to its purpose.
  - It keeps no trainee names; its examples are generic.
  - It's used until a trainer saves another voice in 🗣 Feedback Style (saved with `v2`: edited, learned, restored or switched off). **🧬 Go back to the facilitator's DNA** restores it. The page (`fbEffective`) and the Worker (`facilitatorVoice`) resolve the voice the same way.
- **Admin → 🗣 Feedback Style** learns how the facilitator writes feedback:
  - **Import** takes the reviews the trainer wrote or edited (trainer reviews, and the feedback sent on the old activities). More examples can be pasted, or uploaded as .docx / .xlsx reports or .txt files. Each feedback passage in a Word table or Excel cell becomes an example; JSZip from cdnjs opens the files.
  - **Learn the style** makes a style guide plus generic voice examples, which can be edited or switched off.
  - While it's on, AI feedback is written in that voice: trainer review drafts, graded exercises, and the Worker's nightly **Task Tracker notes review** (`facilitatorVoice` in `worker.js`). Ratings, scores and the tracker check itself don't change.

Storage (`ft:` prefix, rules in `worker.js`):
- Trainers publish, everyone reads: `settings:feedback-style` (and the old `activities:dayN`, `actfile:*`).
- Each trainee's own: the old `actsub:<trainee>` and `actup:<trainee>:*`. The Monitoring Sheet: `monitor:<trainee>`; its discussions: `settings:monitor` (trainers write, everyone reads). Trainees can't write the trainer's feedback.
- Trainer-only: `admin:fbstyle-samples` (and the old `actadmin:rubrics`, `actadmin:scoring`).

## How the program works

- **Lessons and their days open when the trainer opens them** (the days' steps: 🔓 Activity Locks, above). In **Admin → 📅 Open Lessons**, a trainer ticks the lessons that are open, either for **All batches** or for one batch. Trainees only see open lessons. The setting is stored as `settings:opendays` (the engine calls lessons "days" internally).
- **No quizzes.** A lesson's last slide has **📋 Classroom Activity**, which opens its Activity deck. When every lesson is finished, the certificate unlocks. The assessments will be added as built-in Practice Labs, with the same content as their documents.
- **Facilitator's notes are trainer-only.** They're not in the page:
  - They live in `trainer/notes.json`, which `worker.js` sends only with a trainer (admin) token.
  - Trainers see them in Admin → 📘 Curriculum, where the guide has them. (The lessons don't carry any.)
  - They never show in 👁 Trainee view or in the slides window shared with the room.
- **Presenter view scripts** follow the EA/PA format. Each lesson's deck gets a page-by-page script in the notes panel:
  - **← Page / Page →** step through the deck's pages alongside it.
  - Each page has *On this page* and a **🎙 Script — read aloud** in four beats: ① The why, ② Talk it through, ③ Walk through it, ④ Ask the room (④ Your turn on the last page).
  - The last page adds a 🎬 Scenario, and the part's facilitator's notes follow as the *Trainer note*.
  - Scripts live in `trainer/scripts.json`, which is trainer-only like the notes: `{"<lesson id>": {"pages": [{"title", "on", "why", "talk", "walk": [...], "ask", "scenario"}]}}`.
  - A deck without a script shows "The page-by-page script for this deck isn't written yet."
  - A lesson with native slides has one script per slide instead, under `"sections"`: `{"<lesson id>": {"sections": {"<section id>": {"on", "why", "talk", "walk": [...], "ask", "scenario"}}}}`. ② and ③ are the deck's speaker notes word for word (headings in bold, points as bullets); they're generated by `build/slides/make_scripts.py`.
- **The deck stays live in the slides window.** Resizing it, full screen (Canva's own button, ⛶ Full screen or a double-click) and a reconnecting presenter don't reload the deck or send it back to page 1, and ← → pressed in the slides window turn the deck's pages. The console's live copy shows a note instead of a second deck, since it can't follow the room's page. These engine edits are in `build/ft_engine_patches.py`, which the build applies to `js/eapa-updates.js`.
- **Admin → 📘 Curriculum** shows the whole Training Guide (Day 0 to Day 18), facilitator content included. It comes from `trainer/curriculum.json`, which is trainer-only like the notes. Screenshots that belong to facilitator content are in `trainer/img/` and are trainer-only too. Images can't send the sign-in header, so the page also keeps the trainer's token in a cookie limited to `/trainer`.
- **Log-in credentials are never on the platform.** Wherever the guide lists a username or password, trainers get a link to the credentials document instead. The import stops if any credential would be written.
- **Drive files** open in a draggable pop-out viewer, the same one as the LSH Training Portal's Recorded Lectures. Videos ask "Do you want to watch…?" first.

## 🎨 Colours and backgrounds

Every flat brand colour on the platform is painted as a **gradient**, and the pages that used to be a flat cream sheet now carry a **courtroom photograph** behind them. Both live in `js/ft-theme.js`, which the build loads last so it comes after every stylesheet it paints over.

- **The gradients.** The palette tokens in `index.html` (`--navy`, `--orange`, `--success`, …) keep their flat values, because they are also used for text, borders and shadows, where a gradient is not a legal value. `ft-theme.js` adds a parallel set of `--grad-*` tokens and hands them to the surfaces as a `background-image`, which sits on top of each rule's own `background-color`. Each gradient keeps the colour it replaces as its **middle stop**, so nothing gets lighter or darker overall and the text on it keeps the contrast it had. A surface the file doesn't name still looks the way it always did, since the flat colour underneath is the fallback.
  - The file lists the surfaces by the token they were painted with, so changing the palette changes the gradients with it in one place. The lists came from every rule in `index.html` and `js/*.js` that paints a surface in a brand colour.
  - `!important` is applied **per selector**, never to a whole list: a token's list is split into a plain rule and, only where one is needed, a forced one. A blanket `!important` would also beat the rules that repaint a surface somewhere else — the lesson card's Start button, which `js/lsh-card-frame.js` turns from navy into a pale strip with navy text, is the case that catches it.
  - The one-off warm and cool tints are too many and too varied to name a gradient for each, so they get a **sheen** instead: a wash that lightens the top-left and deepens the bottom-right of whatever colour is already there.
- **The photographs** (`img/bg-courtroom.webp`, `bg-flag-law.webp` (now the U.S. flag beside a law library and a desk, the page background behind every page; its address carries `?v=` so browsers fetch the new picture), `bg-chamber.webp`, `bg-scales.webp`, `bg-gavel-book.webp`) sit under a cream wash on the pages that were a flat `#FFFDF8` sheet. Three of them are pages you can actually open here: a lesson's opening page (and its native slides, if a lesson ever ships with them instead of a deck), the Platform Orientation slides — which are also the Trainee Blueprint, so the photo carries into `/blueprint.pdf` — and the certificate, which keeps the faintest wash of the three so the sheet a trainee downloads and prints stays clean. A lesson's photo is picked from its number, so every page of a lesson shows the same one and neighbouring lessons differ. The white boxes sitting straight on a cream page are let through a little, so the photograph reads as the page's background instead of a border around a slab.
  - `.sopx-slide`, the EA/PA engine's SOP Reference present mode, is covered too, but this program's admin tabs don't surface it (`ftAdminTab()` in `js/ft-firms.js` replaces the engine's tab bar, and SOP Reference isn't one of the five), so nothing shows it today. It's there so it matches if the tab ever comes back — the same reason `.tool-card .tool-open-btn` is in the gradient lists.
- **The slides that already have a background of their own are untouched**: the Canva decks (`body.ft-fit`) and the Orientation deck with the trainers' design (`body.ft-orient`) both set their own background with `!important` on a more specific selector, so they win over everything in this file. That is by design — don't "fix" it.
- **The standalone pages** carry the same palette in their own `<style>`, since they don't load the platform's scripts: `glossary.html` (with `bg-flag-law.webp` behind it), `kb.html` (which already had `kb-bg.webp`) and `ft/day17/word-game-1.html`, whose warm paper palette gets its own gradients and `bg-gavel-book.webp` behind the grain.

## 🔤 Typography (every LSH page, this program and the next)

One UI font stack across the platform and its satellite pages, written once as a token and used everywhere:

```
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

- **Inter first** — it was drawn for screens and UI dashboards, so labels, numbers and dense tables stay sharp.
- **Then the native OS stack** — San Francisco, Segoe UI, Roboto. A page whose visitor doesn't have Inter renders instantly in the system's own font, with no web-font download and no flash of unstyled text, which is why the satellite pages below load no font file at all.

Where the token lives:

```
          index.html  ──  :root { --font-ui }  ──  body, .brand-text b, buttons …
                              │   (the same declaration, page by page,
                              │    because these pages load none of the
                              ▼    platform's scripts or stylesheets)
   glossary.html ·  kb.html  ──  :root { --font-ui }  ──  body, header b
```

- `index.html` (the platform) declares `--font-ui` in `:root` and `body` inherits it; the display face (`h1`–`h4`, `.display`) stays Fraunces and `.mono` stays IBM Plex Mono — this token is the **UI** font, not the whole type scale.
- `glossary.html` and `kb.html` declare the same token in their own `:root` and use it for `body` and the brand mark. Nothing else about them changes: the sizes, line heights and layouts are exactly as they were.
- `ft/day17/word-game-1.html` keeps its own typeset design (Gloock, Marcellus, Zilla Slab on warm paper) on purpose — it is a game board, not a UI surface.

**A new page gets the token, not a new font choice.** Copy the `--font-ui` declaration into its `:root` and point `body` at it; don't add a Google Fonts link for a UI face.

## Files

| Path | What it is |
|---|---|
| `index.html` | **Generated** by `build/build.py` from the EA/PA portal. Don't edit it by hand. |
| `js/eapa-updates.js` | **Generated**: the EA/PA update pack (Presenter view, Trainee view, slide layout), rebranded. |
| `js/ft-updates.js` | This program's layer: section slides, trainer-only notes, open days, Finish Day, dashboard, pop-out viewer. |
| `build/build.py` | The build (see below). |
| `build/ft_engine_patches.py` | This program's edits to the EA/PA engine (`js/eapa-updates.js`): the Canva deck in the slides window. |
| `build/lessons/lessonNN.js` | Each lesson: its Canva deck (one slide per section). This is what trainees see. |
| `js/ft-slides.js`, `build/slides/` | The design for native slides, and the tools that rebuild a deck as native slides with its scripts. In full screen and the slides window, a native slide (and an orientation slide) fills the screen: no width cap, no presenter column, and the text scales with the screen. |
| `build/days/dayNN.js` | The curriculum's days as HTML. Not built into the lessons; `build/day-decks.cjs` turns them into the 📋 Day decks (`js/ft-day-decks-data.js`). |
| `ft/dayN/img/` | The curriculum's screenshots for day N. |
| `ft/day17/word-game-1.html` | Day 17's Word Game 1 from the Lien Negotiator Training deck, playable: the slide's grid, rules and 4-minute timer, with scoring, a Present mode for the room, and an answer key. It sits in the PM part, under Free Communication Upskill. |
| `js/ft-day-locks.js` | 🔓 Activity Locks: Days 2–16 in Day 1's order, each step unlocked by the trainer, by hand or on a schedule; the lesson cards' Start / Part 1 · Part 2 … segments; Admin → 📅 Open Lessons → 🔓 Activity Locks. |
| `js/ft-day-activities.js` | **The 18 days and their activities**: which activity belongs to which classroom day, and where it is done (a Practice Session, a trainer-led demo, a platform tool, Drive, the training GC or the room). Read off `trainer/curriculum.json`. |
| `trainer/notes.json` | The facilitator's notes, keyed `"<day>:<slot>"`. |
| `trainer/curriculum.json`, `trainer/img/` | The admin copy of the whole guide, and the facilitator-only screenshots. |
| `build/curriculum/` | Imports Days 2–18 from the guide's Word file. |
| `js/ft-process.js` | Process Questions and the Knowledge Checks: its own feature (its own top-bar button; no Dashboard page, no Admin tab). Each lesson's answer sheet, answered on the platform and graded (70% passes the lesson), saved to Google Drive or Word with the proper name; admins see every trainee's sheets on the same page. |
| `js/ft-monitoring.js` | The Training Monitoring Sheet: trainees fill it in (📒 Monitoring Sheet); Admin → 📒 Monitoring Sheets shows each entry with automated, rule-based feedback. |
| `js/ft-rules.js` | Setting of Training Expectations and Company Policies: a slide presentation beside Virtual Assistant Essentials (always open, not counted as a lesson). |
| `js/ft-simulators.js` | The 🛠 Practice Lab page (`#/simulators`): the firm banner, the sessions' cards, 🧰 Drafting Tools and Skill Building. |
| `js/ft-firms.js` | 🏛 Law Firm Profiles, each trainee's firm and cases (Admin → 🏛 Law Firms), and 🏛 My Firm; `ftAdminTab()` for this program's admin tabs. |
| `js/ft-sessions.js` | 🟢 Practice Sessions (`#/session`) with their checks, the AI's evaluation and the trainer's review (Admin → 🟢 Practice Sessions), and 🧑‍🏫 Trainer Inputs. |
| `js/ft-lor.js` | 🧰 Drafting Tools → the LOR Drafting Activity (`#/lor`): the assigned case, the letter templates, the downloads and their editable file names, and the trainer's case assignment. |
| `js/ft-lor-data.js` | Generated by `build/lor/make_lor_data.py`: the 18 cases and the two templates, exactly as the trainers' files have them. Never hand-edited. |
| `js/ft-cases-data.js`, `build/make_cases.cjs` | The Training Library's case facts the sessions check against, generated from the CMS's `mock-cases.js`. |
| `js/ft-drive.js` | The Task Tracker and the Monitoring Sheet in the trainee's Google Drive: the links, the checks, Admin → 📁 Drive Trackers. |
| `js/lsh-tool-links.js` | Training tools open signed in: a fresh ticket on every CMS link (the same file in every LSH course repo). |
| `js/lsh-program.js` | The program layout (the same file in every LSH course repo): the sections in the top bar, 📚 Dashboard (`#/modules`, the landing page every way in opens) and its tabs, 🏅 Scorecard (`#/scorecard`) and Admin Master Control → 🏅 Scorecards. |
| `js/ft-program.js` | This program's setup for the layout: the Dashboard pages, the Practice Lab's pages and what the Scorecard collects. |
| `js/ft-activities.js` | Admin → 🗣 Feedback Style (the 📝 Activities page was taken off). |
| `js/ft-theme.js` | The gradient theme and the photographs behind the cream pages (see *Colours and backgrounds*). Loads last, after every stylesheet it paints over. |
| `js/ft-tracker.js`, `js/ft-tracker-rules.js` | The Daily Task Tracker (the on-platform sheet, Admin → 📋 Task Trackers) and its rules, which the Worker's daily check uses too, with the Drive sheet's reader (`fromSheetCsv`) and the Monitoring Sheet's check (`gradeMonitorText`). |
| `worker.js` | Cloudflare Worker: the EA/PA/CM Worker with an `ft:` storage prefix, plus the `/trainer/` gate. |
| `.github/workflows/checks.yml`, `.github/scripts/` | The checks on every pull request (see *Checks*): `check-site.mjs` (syntax, files, JSON), `server.mjs` (the site through `worker.js` with an in-memory KV, for local runs) and `requests.cjs` (how often a page asks the server). |

## Build

The platform is rebuilt from the EA/PA portal (the `EA-PA-TRAINING` repository), like the CM course:

```
python3 build/build.py ../EA-PA-TRAINING
```

The script:
- swaps the EA/PA days for this program's lessons from `build/lessons/`: it drops the EA/PA day files (`js/days/dayN/lessons.js`, `notes.js`, `scripts.js`) and puts the lessons where the EA/PA page builds `DAYS`
- switches off what only fits the EA/PA days: the divider slide before each topic (`noDividers`), and the saved-place migrations keyed to EA/PA topic titles (`DAY_LAYOUTS`, `QC_OPTION_MOVES` are left empty)
- drops the EA/PA-only heavy content, and EA/PA's lesson slide background (the navy LSH template in its `eapa-updates.js`): the lessons here are deck pages, and the Orientation has its own background
- applies the branding
- loads `js/portal-gate.js` and `js/portal-link.js` once each, stamped with this build's version
- adds `js/ft-updates.js`, and `js/ft-theme.js` last of all (the gradient theme has to come after every stylesheet it paints over)

Every edit checks that its anchor exists, so the build stops with an error if the EA/PA portal changed that part. Update the anchor in `build.py` and run it again. Rebuild when EA/PA ships new engine features.

### ⚡ First-load speed (`build/ft_perf_patches.py`)

Opening a program from the Training Directory used to sit on a blank cover for several seconds. The engine-level reasons were: jsPDF (~90 KB) and the Google Fonts sheet both blocking the first paint from the page head, `loadAll()` reading 28 storage keys one `await` at a time, and boot fetching `trainee:<id>` twice in a row over the network. `build/ft_perf_patches.py` fixes all four, and `build.py` applies it. First paint on a 1.6 Mbps / 150 ms connection: 1432 ms → 904 ms (headless Chromium, gzipped, median of 7).

Two things to know:

- **These are engine changes, so they belong in `EA-PA-TRAINING`'s own `index.html`.** Every LSH platform is built from that engine, so every course is slow in the same way until it is fixed there. Each patch is skipped when the engine already carries it (the same `if … not in s` idiom as the portal-gate block), so once EA/PA ships them this file becomes a no-op and can go.
- **Don't add `<link rel="preload">` for the scripts at the end of `index.html`.** It was tried and measured: preloading all 32 makes those downloads compete with the document, which is what produces the first paint, and first paint got *worse* (1908 ms; `fetchpriority="low"` gave 1184 ms; none at all, 904 ms).

`js/lsh-blueprint.js` loads its own jsPDF 4.2.1 and now deletes `window.jspdf` afterwards when the page had none, instead of only restoring a previous value. With jsPDF no longer pre-loaded in the head, leaving 4.2.1 behind would make `ensureJsPdf()` hand the engine's certificates and handouts the wrong version. It's the same file on every LSH platform, so copy it across.

## Adding a day

1. Create `build/days/dayNN.js` (e.g. `day02.js`) like `day01.js`: `id`, `title`, `heading` (as the curriculum writes it) and `sections`, one per curriculum section, each `{id, h, html}`.
   - Use the curriculum's wording as it is.
   - Put its screenshots in `ft/dayN/img/`.
   - Drive files: `<a class="viewer-link" data-kind="doc|video" data-title="…" href="…">`.
   - Canva: a `.canva-frame` embed with the design's `/view?embed` link.
2. Put facilitator-only content in `trainer/notes.json` under `"N:<slot>"`, and mark its place in the section with `<div class="trainer-slot" data-slot="N:<slot>"></div>`.
3. Add the day's activities to `js/ft-day-activities.js` — one `{t, kind, at, id}` per activity the curriculum calls for, in the order it runs them, with `at`/`id` pointing at the Practice Session, trainer-led activity or platform tool where it is done (see *The 18 days and their activities*). The daily tests and the upskill hour are added for you.
4. Run `node build/day-decks.cjs` (the day's 📋 Day deck), then the build, then open the day for a batch in Admin → 📅 Open Days.

## Deploy

- Cloudflare Worker with static assets (`wrangler.json`), using the shared `LSH_KV` namespace. Records are stored under the `ft:` prefix, so they don't mix with the EA/PA (no prefix) or CM (`cm:`) records.
- **PR previews** (Cloudflare runs `wrangler preview` for non-production branches) use their own KV namespace, `LSH_KV2` (`previews` in `wrangler.json`), so testing a PR never touches live trainee data. Cron triggers don't run on previews.
- `.assetsignore` keeps the Worker, config, build files and Markdown out of the served files.
- Secrets:
  - `MASTER_ADMIN_PASSWORD`: admin sign-in (the LSH Training Portal's master admin password: one password on every platform); setting it switches on secure mode. Set it as a Secret.
  - `AI_GATEWAY_SECRET`: optional (a Secret; the same value as on the Portal). When set, every AI call goes to the Main Portal's shared AI gateway (`/api/ai-gateway`): one master key pool and one shared budget for every call flow, counted per program. Without it this Worker uses its own `GEMINI_API_KEY` pool.
  - `SESSION_SECRET` (optional)
  - `GEMINI_API_KEY5` … `GEMINI_API_KEY9`: the Gemini key pool behind every AI feature (live chat, grading, the tracker's notes review, trainer tools). Each request starts on the next key in turn, so the load is spread across all of them; a key that hits its limit rests (a minute for a per-minute limit, an hour for a daily one) and the next key takes over. A key that is out of credits or has billing off (a 402, a 429 about prepaid credits, a 400 or 403 about billing) rests an hour on every model, and a rejected key 10 minutes; a busy key or one that can't be reached hands over too, so a request fails only when every key has (the answer then says why). Checked by `.github/scripts/gemini-keys.mjs`. Create each key in its **own** Google Cloud project: keys in the same project share one quota. `/version` shows which pool keys are set.
  - `GEMINI_API_KEY`, `GEMINI_API_KEY1`, `GEMINI_API_KEY2` (optional): used only after every pool key.

## 📉 Staying under Cloudflare's monthly request limit

Every request to the Worker (everything under `/api/` and `/version`) counts toward the Cloudflare account's requests. The account is on Workers Paid: **10 million requests a month, shared by every LSH site** (the courses, the CMS, the Training Portal and the rest). Past that, Cloudflare charges for every extra million, so a page that asks too often costs money for every site. Static files (the page, `js/`) don't count. `ft/` and `trainer/` now come from R2 through the Worker, so each of those files a browser loads (or re-checks) counts too: see *Documents in R2*.

So an open page asks the server sparingly (`POLL` in `index.html`; the open lessons in `js/ft-updates.js`), and not at all while its tab is in the background. When the tab is back, whatever came due runs then; a quick look at another tab (Google Meet) asks nothing:

| What | How often | Before |
|---|---|---|
| A trainee's access and new tasks (`startApprovalPolling`) | every minute: their record, and the tasks for every open lesson in one request | every 45 s: their record twice and one request per lesson (up to 9), also in the background |
| A Practice Lab attempt reset, or lessons a trainer unlocked for them (`liveTick`) | every minute (the minute check above counts) | about every 15 s |
| Trainer feedback and Focus items | every 2 minutes | about every 45 s |
| Waiting for approval | every 15 s | every 8 s |
| The open lessons and videos (`ftRefreshOpenDays`) | every 3 minutes, both settings in one request; going back to the dashboard re-reads them at most once a minute | every minute, one request per setting, also in the background, and on every visit to the dashboard |
| The facilitator's feedback style (`fbEnsureStyle`) | every 10 minutes | every 10 minutes, also in the background |
| Admin: Trainee Audit, Rankings, Trainee Feedback | every minute, every trainee in one request | about every 30 s, one request per trainee |
| A new version (`/version`) | every 3 minutes | every 45 s, also in the background |

A trainee's page in view now sends about 4 requests a minute (before: about 24, and about 18 in a background tab, now none). An admin on the Trainee Audit sends about 3 a minute for up to 100 trainees (before: about 2 a minute per trainee, so about 60 for 30 trainees).

Lists of records are read with `/api/storage/get-many` (1 to 100 keys, the same rules as `/api/storage/get` for each key, under the `ft:` prefix like every other key), not one request per record: the tasks for every lesson, the Trainee Audit, Rankings and Trainee Feedback, and the trainees' sheets in 📋 Task Trackers, 📒 Monitoring Sheets and ✍️ Process Questions (20 sheets to a request, since a sheet can be up to about 1 MB). A trainee is signed out as revoked only when the server answers that their record is gone or not approved: a server that doesn't answer (offline, or the request limit) no longer signs anyone out, and their open lessons stay open until it answers again.

The `index.html` part is the EA/PA portal's engine (the same change is in EA-PA-TRAINING), so a rebuild keeps it.

## 🗄 Documents in R2

The document-heavy folders (`ft/`, `trainer/`) are kept in **Cloudflare R2**, the `DOCUMENTS` binding (bucket `lshtraining`, the same bucket the EA/PA course and the CMS use), under `courses/ft/` (e.g. `courses/ft/ft/...`). `wrangler.json`'s `assets.run_worker_first` sends those paths to `worker.js`, and `docFromR2` answers from R2, with byte ranges (PDF viewers) and 304s for a file the browser already has.

- **Uploading:** `.github/workflows/r2-docs.yml` runs on every push to `main` that changes those folders: it uploads the files that changed and removes deleted ones (`.github/scripts/r2-sync.mjs`). **Actions → R2 documents → Run workflow** uploads every file (do this once, after setting the secret). It needs the repository secret `CLOUDFLARE_API_TOKEN` (a Cloudflare API token with *Workers R2 Storage: Edit*); until it's set, the run only prints a notice.
- **Fallback:** a file that isn't in R2 yet (the upload still running, or the token not set) comes from the Worker's static assets as before, and so does everything if the binding is missing or R2 fails. The files stay in the repository and in the deploy, so nothing breaks while R2 fills; once R2 has them all, the folders can be added to `.assetsignore` to leave them out of the deploy.
- **Requests:** these files now go through the Worker, so each one a browser loads or re-checks counts toward the account's 10 million Worker requests a month (and is one R2 read; 10 million a month are free). A class of 30 opening a few hundred slide images a day is roughly 100–200 thousand a month.
- `trainer/` (facilitator notes, curriculum, real client documents) is in the list too, so the Worker's trainer gate always runs. Before, the static assets answered `/trainer/...` themselves and the gate never ran: `trainer/notes.json` was open to anyone with the link.
- **Checks:** `.github/scripts/r2-docs.mjs` (in *Checks*) serves a document from an in-memory R2: from R2 when it's there, byte ranges, 304s, HEAD, the static assets when it's missing or R2 fails, nothing else read from R2, and the `run_worker_first` list matching the folders.

## Checks (GitHub Actions)

`.github/workflows/checks.yml` runs on every pull request and every push to `main`. A red **Checks** status means something is broken, and the log says what:

- **Syntax, files and build:** every `.js` file and inline script parses, every local file the pages load is in the repository, and every JSON file parses (`.github/scripts/check-site.mjs`, the EA/PA portal's); the Worker builds (`wrangler deploy --dry-run`).
- **The Drive trackers** (`.github/scripts/drive.cjs`, no browser): the Worker reads a tracker sheet and a Monitoring Sheet (Google's export answered by the test), checks them, keeps the trainer's input on a new check, makes a trainee wait 3 minutes between checks and explains a file that isn't shared.
- **Transcription Activity** (`.github/scripts/transcribe.cjs`): the Drafting Tools card and Day 9's step; the attorney's request; ▶ start opens the recording; Alt+T timestamps; complete minutes pass every check and a wrong file name misses; the Word file named by the convention; submitted, saved and read-only; Recording 2 its own; the trainer sees the minutes and both recordings in Trainer Inputs.
- **Video Notes and Process Guide** (`.github/scripts/guide-notes.cjs`): 📝 What I learned on a deck video, its checks, saved, ✓ on the button and listed on 🎬 Video Notes; the Day 14 guide with the tutorial beside it, the outline, steps, a link and two pictures passing every check, saved, the Word file carrying the pictures, read-only once submitted, read by the trainer, and a guide stored with code in it cleaned before it shows (nothing runs).
- **Practice Sessions** (`.github/scripts/practice-sessions.cjs`): the starting firms, a firm and different cases for two trainees, My Firm, the four sessions (no PI Process Flow, none waiting for a case; a MedLOR request done to the Day 14 rules passes, one with the wrong file name, relationship and fax address misses; an intake call recorded completely passes; a wrong color misses), the trainer's review and inputs, the Knowledge Check's trainer score and the Scorecard. Also in the browser job: `shadowing.cjs` (👥 every day's To-Do in the guide's wording and the six shadowing lines, the Dashboard strip, a part-filled log not counted and a full one counted, the trainer's buddy name and reading, the worker's rules), `listening.cjs` (🎧 the four sets and the day map's steps, a part-filled log saved but not counted and a full one counted, saved and on My Performance, the trainer reading a log and changing a set's recordings, the worker's rules), `calrules.cjs` (📅 every scheduling rule on crafted bookings, a booking recorded, checked, saved and on My Performance, the trainer's tab and the scorecard's rule criteria filled, never over a typed score, the worker's rules), `kcgames.cjs` (🎮 the bank enough and well formed for all nine lessons, Survey Says' matching, the Process Questions page's card, all eight games played to the end with what was missed, saved and on My Performance, the trainer's question added and a built-in one hidden, `kcgames:` the trainee's own and `settings:kcgames` admin-written), `drills.cjs` (🏷 every question accepts its own answer in other dashes, spacing and capitals and refuses one with a part missing; the guide's samples pass; a round saved and on My Performance), `skilltests.cjs` (🧪 the log append-only with the server's time; typing with pasting off and spelling with the corrections, saved with the date and slot; a missed slot made up; the trainer's grid and the compliance line; the Weekly Ranking's column filled from it; My Performance), `feedback.cjs` (📝 Send Feedback: the work to review by batch, sent and saved, the trainee's card on the activity page NEW until seen and as text, 📬 My Feedback with a mock call's scorecard and a shared Weekly Ranking row, 🏅 My Performance; `trainerfb` and `rankshare` trainer-owned), `ranking.cjs` (📊 Weekly Ranking: the Week 1 columns with no scores in them, points turned into marks out of 5 as they are typed, the final average and the ranking, an unscored trainee unranked, saved, ⬇ Word in the report's format and ranked, ⤓ Fill never over a typed score, Week 2 from Week 1's columns), `graded-calls.cjs` and `blueprint.cjs` (no Blueprint or Simulators card on the landing page; the top bar's Blueprint button stays).
- **Day decks** (`.github/scripts/day-decks.cjs`): `js/ft-day-decks-data.js` is what `build/day-decks.cjs` writes today; 18 decks with no facilitator content, log-in details or Process Questions on a slide, each ending on its "To be added" slide; Lesson 1's 📋 Day 1 opens Day 1 for a new trainee on its Training Agenda, the ten no-discussion days sit in the lesson grid in day order (locked until reached), no next-step band and the scores beside the orientation card, the dashboard fits the screen, a trainer's Day 4 simulator preset and instruction are saved in `settings:dayextras` and a trainee sees them as text, drawn like the LSH decks, with its links as tiles, later days stay locked until reached, an admin opens all 18, ← / → turn the slides, and the page doesn't scroll.
- **Server requests** (`.github/scripts/requests.cjs`): `get-many` gives a trainee only their own and public records and an Admin every one, reads this program's `ft:` records only, and refuses more than 100 keys. In a browser, with the checks sped up: a trainee's page reads the tasks for every open lesson in one request, their record about once per check, and the open lessons in one request; checks for a new version rarely; and asks nothing while the tab is in the background (catching up when it's back) or on a quick switch to another tab and back. A server that doesn't answer doesn't sign the trainee out or lock their lessons; a revoke does. The Trainee Audit reads every trainee in two requests, and Task Trackers, Monitoring Sheets and Process Questions read the trainees' sheets with get-many.

To run them locally (Node 22; the browser test needs Playwright: `npm install playwright` and `npx playwright install chromium`):

```
node .github/scripts/check-site.mjs
node .github/scripts/server.mjs 8787 &      # the site through worker.js, with an in-memory KV
node .github/scripts/requests.cjs http://localhost:8787/
```

`server.mjs` runs the Worker in open mode (no admin password) and with no AI keys, so nothing outside your computer is called. The requests test takes about a minute.
