# LSH Standard Foundational Training

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
| 🏠 **Main Portal** | The program's home (the dashboard): the hub for every part of the training. |
| 📚 **Training Modules** | `#/modules`: the lessons in order (📌 Training Orientation and Rules first), each with its status and Knowledge Check score, then the training pages: ✍️ Process Questions, 📋 Task Tracker, 📒 Monitoring Sheet, 🗒 My Notes and 🎯 My Focus (admins: 🧭 Orientation). Those pages left the top bar; on them a bar of tabs under the top bar moves between them. Its badge adds up their badges (new focus items). |
| 🛠 **Practice Lab** | `#/simulators`: the trainee's real-time 🟢 Practice Sessions at their own 🏛 law firm (`#/firm`, `#/session`), the 🧑‍🏫 activities done live with the trainer, demo preparation and Skill Building (see *Practice Lab* below). |
| 🏅 **Scorecard** | `#/scorecard`: the trainee's grades, collected from every grading system on the platform. Admins get **Admin Master Control → 🏅 Scorecards**: every approved trainee's in one table (by batch; click a trainee for the details). |
| 🛡 **Admin Master Control** | The Admin screen (admins only, never in 👁 Trainee view). |

Blueprint, Training Directory, 👁 Trainee view, ⧉ and ⛶ stay at the end of the top bar. **The Admin screen's tabs are grouped the same way:** a row of sections (🛡 Admin Master Control: Trainee Audit, Batch Folders, Trainee Feedback, Attendance · 📚 Training Modules: Open Lessons, Curriculum, Task Trackers, Monitoring Sheets, Process Questions, Activities, Feedback Style · 🛠 Practice Lab: Calendar Scores · 🏅 Scorecard: Scorecards), then the open section's tabs. On a phone the sections are a 2 × 2 grid and the tabs wrap as buttons, so every one shows. The groups are `adminGroups` in `js/ft-program.js`; a tab that isn't listed goes under Admin Master Control. Between 961 and 1400 px wide, *Training Modules* and *Admin Master Control* shorten to *Modules* and *Admin* so the bar stays on one row.

**What a program puts in each section** is its own: `js/ft-program.js` (loaded just before `js/lsh-program.js`) sets `window.LSH_PROGRAM`: the Training Modules pages, the Practice Lab's pages, and the Scorecard's sources. This program's Scorecard collects:

- ✍️ **Knowledge Checks:** each lesson's best attempt, or the trainer's final score once they give one (`kcreview:<id>`; 70% passes).
- 🟢 **Practice Sessions:** each session's trainer score, until then its automated checks (`sessions:<id>`, `labreview:<id>`).
- 🧑‍🏫 **With your trainer:** the trainer-led activities' recorded results (`labreview:<id>`).
- 🧰 **Portal simulators:** the best result on each Training Portal simulator opened from this program, written by the Portal (`simresults:<id>`, the trainee reads it, only the Portal writes it).
- 📋 **Task Tracker & Monitoring Sheet:** the Drive files' checks, or the trainer's score where given (`trackerreview:<id>`).
- 🎯 **Graded calls:** the best graded call on each mock-call line (`callsim:<id>`).
- 📅 **Calendaring Simulators:** each week's trainer score once released, until then the best automated review; plus each connected simulator's best result (`calsim:<id>`).

A grading system's score is the average of its graded items; the overall score is the average of the grading systems that have a score, so each counts the same. A trainee's records are read in one get-many when the Scorecard opens. Since 🏠 Main Portal is now the program's home, the admins' link back to the LSH Training Portal (`js/portal-link.js`) reads **← Training Directory** here, like the trainees'.

**Back to the LSH Training Portal (admins):** while an admin is signed in, the top bar has **🏠 Main Portal** and the Admin screen has **← Back to Main Portal** (next to Log out); in this program `js/lsh-program.js` relabels them **← Training Directory** and **← Back to Training Directory** (🏠 Main Portal is the program's home section). Both open the LSH Training Portal's Training Directory (`https://cm-training-activity.pages.dev/programs.html`), where admins open each program. Trainees and the 👁 Trainee view don't show them. It's `js/portal-link.js`, the same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training, propertydamageclaimstraining, Foundational-Training); change it in all of them.

**🧭 The top bar, organized (every course):** buttons that do the same kind of thing share one menu, the way the Training Portal keeps everything else under ⚙ System Management. **📁 Case File** is one tab for the Case File (or Claim File), 📁 Documents and 🗂 Workspace, which share a row of tabs at the top of their pages; **📚 Guides ▾** holds Notes, Handouts, 🧭 Orientation, Facilitator Guide and the Platform Blueprint (whichever the page has); **📋 My Sheets ▾** holds the Task Tracker and Monitoring Sheet; **⛶ View ▾** holds ⧉ Open in a new tab and ⛶ Full screen. A menu is made only when two or more of its buttons are on the bar. It's `js/lsh-topbar.js`, loaded last, the same file in every LSH course repo; change it in all of them.

**🔐 Trainees sign in on the Main Portal only.** A trainee logs in once, on the LSH Training Portal, and opens this program from there: this site shows them no sign-in form. The Portal sends them here with a signed, short-lived ticket (`https://<this site>/?ticket=<ticket>`); `js/portal-gate.js` posts it to `/api/auth/portal`, the Worker checks it, and the trainee is registered, approved and resumed exactly as before (same `trainee:<id>` records, so every current registration, progress and approval is kept). Someone who opens this site's link directly sees a note with a **Go to the LSH Training Portal** button instead of a form, and the Worker refuses a name + batch typed here (`/api/auth/trainee` answers 403 `portal-required`), except to renew the session of a trainee already signed in on that device. **Admins always type the admin password here** (`MASTER_ADMIN_PASSWORD`, the Portal's master admin password): the Portal's launch step sends them to this site's *Admin Portal* tab (`?admin=1`), and an admin ticket never signs anyone in (the Worker answers 403 `admin-password`). Every future LSH program gets this by loading the same `js/portal-gate.js` and the same Worker endpoints; it is the same file in every course repo.
  - **Turning it on** needs the same secret on both sides: `wrangler secret put PORTAL_SSO_SECRET` here and on the Portal. Until it is set here, `/api/auth/status` reports `portalOnly: false` and the old name + batch form stays, so nothing locks anyone out before the Portal is ready.
  - **The ticket** (the Portal makes one when a trainee opens a program; good for 10 minutes at most, so a copied link is no use later): `payload = base64url(JSON.stringify({first, last, b: <batch>, exp: Date.now() + 5*60*1000}))`, `ticket = payload + "." + base64url(HMAC-SHA256(key = "portal-sso:" + PORTAL_SSO_SECRET, message = payload))`. `first`, `last` and `b` are the trainee's name and batch as registered on the Portal, which must be the same as their records here (the trainee id is made from them). The Portal must sign the ticket on its server, never in the browser, or the secret is public.
  - **Needs the Portal's side** (EA-PA / `cm-training-activity` repo, not this one): its program cards for trainees open this site with a fresh ticket. The *Go to the LSH Training Portal* button here opens `PORTAL_HOME` in `js/portal-gate.js`; change it if the trainees' portal page isn't the site's home page.
  - The Worker side is `portalOnly`, `readPortalTicket` and `/api/auth/portal` in `worker.js`; `build/build.py` patches the engine's sign-in screen, request and boot to call the gate.

**📚 Knowledge Base page (`kb.html`).** A separate page, `/kb.html`, for the LSH Knowledge Base (the `lsh-knowledge-base` repo: its own Worker with D1 and R2 storage; nothing from it is copied here). It shows the deployed Knowledge Base in a frame, with a link to open it in a new tab. Until it's deployed, `KB_URL` at the top of the page's script is empty and the page says so; set it to the Worker's `https://` address. The page isn't linked from the top bar yet.

**📖 Legal Glossary (`glossary.html`).** A standalone, searchable glossary of about 700 US legal terms and Latin phrases, with an area filter (civil procedure, evidence, contracts, torts and injury, criminal, property, family, estates, business, immigration, employment, insurance, Latin) and an A–Z jump bar. The terms are one `RAW` list at the top of the page's script (`Term | Area | Meaning`, one per line); add or edit terms there. It is linked from the header of `kb.html`.

Trainees see **the lessons**. Lessons 1–8 show their training deck page by page, each page an image rendered from the deck's PDF (`build/slides/image_lesson.py`). Lessons are named by their training title, not by day.

The curriculum (the Training Guide, with the day-by-day tasks, links and facilitator's notes) is for trainers and admins only, in **Admin → 📘 Curriculum**. It is not on the trainee pages.

## Lessons

| # | Lesson | On the platform |
|---|---|---|
| 📌 | Training Orientation and Rules | ✅ slides (`js/ft-rules.js`), always open, not counted |
| 1 | Virtual Assistant Essentials | ✅ the deck's pages as slides (29 of its 138, from its PDF) |
| 2 | Law Firm Communication | ✅ the deck's pages as slides (54, from its PDF) |
| 3 | Personal Injury Process Flow | ✅ the deck's pages as slides (25, from its PDF) |
| 4 | Receptionist Training | ✅ the deck's pages as slides (55, from its PDF) |
| 5 | Calendaring & Appointment Setting Training | ✅ the deck's pages as slides (44, from its PDF) |
| 6 | Intake Specialist Training | ✅ the deck's pages as slides (105, from its PDF in two parts) |
| 7 | Claims Specialist Training | ✅ the deck's pages as slides (77, from its PDF) |
| 8 | Medical Records Specialist Training | ✅ the deck's pages as slides (55, from its PDF) |

**Lien Negotiator Training** (id 9) is off the standard training: it becomes a separate training. Its file is `build/lessons/off/lesson09.js` (the Canva deck and Word Game 1, `ft/day17/word-game-1.html`); its Process Questions sheet and its Simulators demo (Reduction Request, Settlement Release Forms and Closing Statement) stay in `js/ft-process.js` and `js/ft-simulators.js`, which show only the items of lessons on the platform, so they come back with the lesson.

Onboarding and Setting of Expectations & Tech Set-up (ids 10 and 11) are off the platform: their files are in `build/lessons/off/` (with the Day 0 screenshots still in `ft/day0/img/` and the `d0:*` trainer notes), which the build skips. To bring one back, move its file into `build/lessons/` and rebuild; it keeps its id, so saved progress doesn't shift. `DAYS` follows the file order, and a lesson's `label` / `short` replace "Lesson N of 9" and the dashboard circle's number.

Each lesson card has **▶ Video Presentation** (the lesson's `video`: its AI Assisted Discussion video from the curriculum), which plays in the pop-out viewer. Lessons are finished from their last slide (✓ Finish lesson). **Videos stay locked** (🔒 Video Presentation) until a trainer unlocks them in **Admin → 📅 Open Lessons → 🎬 Unlock Videos**, for all batches or one batch (`settings:openvideos`, same shape as `settings:opendays`). Trainers and 👁 Trainee view always see them.

The card's buttons form **one full-width grid with lines** (`js/ft-card-grid.js`, loaded after `js/lsh-dashboard.js`): Start / Review fills the top row edge to edge and ▶ Video Presentation the row under it, separated by thin lines like a table (the same look as the EA/PA day cards). The Training Orientation and Rules card keeps its navy Start, also edge to edge.

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

One calendaring practice area for Lesson 5 (Calendaring & Appointment Setting), at `#/calsim`, shown on **🛠 Simulators** as **📅 Calendaring Simulators** with the lesson's Calendar Management Mock Calls beside it. It has one track (`TRACKS` in `js/ft-calsim-core.js`):
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

## Training Orientation and Rules

**Training Orientation and Rules** is a separate slide presentation, beside Virtual Assistant Essentials. Its card is first in the lessons row, marked 📌 Start here, and it opens as a lesson (`#/day/12`). The trainer can run it in 🖥 Presenter view and the slides window like the other lessons. It's all in `js/ft-rules.js`.

- **It isn't one of the program's 8 lessons.**
  - It's always open, for every trainee and batch.
  - It doesn't count toward "Lessons finished", the certificate or the admin stats.
  - It isn't in `DAYS`. `DAYS.find` and `DAYS.some` also look at it (by id, `ORIENT_ID` = 12), so the lesson view, Presenter view, routes and names find it, while `DAYS.length`, `map` and `filter` still see the 9 lessons.
- **The slides:**
  Every slide has the trainers' background (the content sits straight on it, no panel, clear of the orange waves at the sides; a slide's opening line repeats on each of its pages) (`ft/orientation/background.webp`, styled in `js/ft-rules.js` under `body.ft-orient`): navy, the LSH header band with the orange line, orange waves at the sides. The part label and title sit in the band, the content in a cream panel below it, sized with the slide's width so it lines up on any screen.
  The slides follow the trainers' Setting of Expectations:
  1. Setting expectations: training isn't the end goal, you need to pass (performance deliberated weekly; you can still be let go); training is hard on purpose; your trainers are your first clients (resilience, pressure, time management).
  2. You're a General VA: tagged General VAs but may be assigned to different roles; take initiative when tasks run low; stay placed when a firm restructures; a foundation, not mastery (mastery once a role is assigned, or in the Free Trial period).
  3. Rules: your schedule and breaks. Tracking 8:00 AM – 5:00 PM PST, no tracking beyond 5:00 PM; unfinished deliverables are finished unpaid unless the trainer approves tracking; log in up to 10 minutes early (tools, and a buffer for breaks beyond the hour); breaks 1 hour total maximum, split as the trainee likes.
  4. Rules: communication. Reply on Discord within 5 minutes; acknowledge every instruction and activity with a message or a reaction; all meetings are posted on their day, no need to ask; cameras on always (it tests internet speed and connectivity).
  5. Rules: your work and the use of AI. Naming conventions; don't rely on AI to draft or complete work (grammar and spelling only); protect client information; AI is a tool, not a replacement; some firms allow it, depending on the client.
  6. Rules: your Training Monitoring Sheet: download it and upload it to the trainee folder once the tasks are done, or fill it in on the platform; the sheet embedded, with 📒 Fill It In on the Platform.
  7. Free Upskill Training: right after the shift for an hour or so; communication, accent reduction, grammar, email writing, client interviews; unpaid, not mandatory but highly encouraged; missed sessions are caught up on the trainee's own initiative.
  8. Auxes: in #⏳-timestamps `!in`, `!brb - lunch`, `!out`, `!brb - power outage`, `!brb - internet outage` (check LSH BOT's notification), and the same without `!` in #batch-group-channel; no double stamping; the Discord profile status format.
  9. Check #training-reminders: the channel's screenshots (Deliverables and Important Reminders, the welcome post, the channel).
  10. Building your habits: Send Your EOD Email (a summary: everything completed, at least 3 specific learnings of at least 2 sentences each), with the Training Matrix link.
  11. Building your habits: Update Your Trackers (the rest of the learnings; the Training Monitoring Sheet), with the sample trackers and the Monitoring Sheet links.
  12. The EOD template: subject `Daily Report mm/dd/yy` or `EOD Report mm/dd/yy`, its three parts, and 📋 Copy the Template.
  13. The Daily Task Tracker, part 1: the status counts, the sections and every column.
  14. The Daily Task Tracker, part 2: the other tabs and the daily check.
  15. The Daily Task Tracker, part 3: the guide's filled-in sample (Sample updated trackers), embedded in full.
  16. Skill Building: Typing and Spelling Tests: why (clients look for at least 60 WPM), and a pointer, **🧪 Open the Practice Lab**, to **🛠 Simulators → 🧪 Practice Lab: Skill Building**, where the tests now live (the tools to use, when, file names and samples). The slide keeps its place, so saved slide positions don't shift.
  17. Hubstaff To-Dos, part 1: why they matter, the steps and the picture of the to-do list.
  18. Hubstaff To-Dos, part 2: the 19 To-Dos, each with 📋 Copy (the name without "To-Do:"), and the shadowing template.
  19. How to create notes in Hubstaff, with the Add Work Notes picture.
  20. Hubstaff How-To Lessons: links to this lesson's Hubstaff slides (To-Dos, notes, lost hours) and the LSH VA Guide; more can be added in `HOWTO_LESSONS`.
  21. The Manual Time Adjustment Request: subject, To and CC to copy.
  22. Day 1's Reading Task: the reading, the 6 questions and the file name with the trainee's name.
- **How the slides work:**
  - A slide's HTML is built when it's shown, so the file name has the trainee's name and the Copy buttons work.
  - The Hubstaff pictures are SVG, drawn after the trainer's screenshots.
  - The text lives in the constants at the top of `js/ft-rules.js` and in `SLIDES`. If the tracker's columns change in `js/ft-tracker.js`, update `TRACKER_PARTS`.

## 🧭 Platform Orientation and the Blueprint PDF

Admins have **🧭 Orientation** in the top bar (`#/orientation`), as on the EA/PA portal and the other LSH courses. It's a screen-shareable blueprint of the platform for the first session. It's not the 📌 Training Orientation and Rules lesson above.

- **The page:** 12 slides with ← → (or the arrow keys), **⛶ Present full screen**, **🖨 Print** and **⬇ Download PDF** (`LSH_FT_Platform_Orientation.pdf`). Nothing private is on it: no facilitator's notes, answers or trainee data. Trainees and 👁 Trainee view don't see it.
- **The slides** (`js/ft-orientation.js`): welcome; the roadmap (📌 and the lessons, read from `DAYS`); how a lesson works; classroom discussions; the dashboard; getting around (the trainee top bar); daily habits; the Practice Lab; activities and feedback; the certificate; ground rules; let's begin. If a trainee-facing feature changes, update its slide.
- **The Blueprint PDF** (`/blueprint.pdf`): the same slides as a PDF, for anyone to open or share. **The main landing page shows no Blueprint card** (nor a Simulators card): anyone signed in opens it from the **📘 Platform Blueprint** button in the top bar, before ⧉ and ⛶ (`js/blueprint-content.js`; on a laptop screen it reads "📘 Blueprint", and below 1330 px just 📘).
  - **It republishes itself after every deploy.** The published copy (`blueprint:pdf`, `blueprint:meta`) is matched against the build and the Worker's deployment id (`/version`, from `version_metadata` in `wrangler.json`). The first admin page open after a deploy rebuilds it in the background (`js/lsh-blueprint-course.js`).
- **🛠 Trainer blueprint** (admins only, never at a public address): a tab on 🧭 Orientation.
  - **The slides:** a cover and 11 slides covering signing in, trainees and the Trainee Audit, Open Lessons, the Curriculum, Presenter view, Activities, the facilitator's feedback style, Monitoring Sheets, Process Questions, Task Trackers, Attendance and Trainee view.
  - **⬇ Download PDF:** a landscape PDF, one page per slide, stamped with the build and the deployment.
  - **Numbering:** the cover is the Cover (★), then the slides are 1 to N everywhere: the contents buttons, the counter under the slide (`Cover · 11 slides`, then `1 / 11` to `11 / 11`), each slide's header and footer, and the PDF's page footers. The cover isn't counted, so nothing says 12.
  - **Files:** the slides are in `js/blueprint-content.js`. `js/lsh-blueprint.js` is the same file on every LSH platform, and `js/lsh-blueprint-course.js` is the same on every LSH course: change either in one, copy it to all. `build/build.py` adds the three after this program's scripts.
  - **Test:** `.github/scripts/blueprint.cjs`.

## Process Questions and the Knowledge Checks

Every lesson's process questions are its **Knowledge Check**, answered in writing on the platform and graded like the EA/PA Knowledge Checks. All seven answer sheets are in `PROCESS_SETS` (`js/ft-process.js`), with every question from the curriculum's full lists: 74 in all. The curriculum also has a shorter list after "If time is limited, use only five…"; that note is for the live classroom discussion, so the Knowledge Checks use the full lists.

| Lesson | Answer sheet | Knowledge Check |
|---|---|---|
| 1 Virtual Assistant Essentials | VA Essentials | 10 questions |
| 2 Law Firm Communication | Law Firm Communications Training | 12 |
| 3 Personal Injury Process Flow | PI Workflow and Reception Training, questions 1–3 | 3 |
| 4 Receptionist Training | the same sheet, questions 4–10 | 7 |
| 5 Calendaring & Appointment Setting | — | none: the lesson finishes as before |
| 6 Intake Specialist Training | Intake Specialist Training | 10 |
| 7 Claims Specialist Training | Claims Specialist Training | 10 |
| 8 Medical Records Specialist Training | Medical Records Specialist Training | 10 |

A sheet shared by two lessons lists which questions each one asks (`kc:{3:[0,1,2], 4:[3,4,5,6,7,8,9]}`).

**The process questions aren't in the slides any more**: they are the Knowledge Check. The lesson's **✓ Finish lesson** opens it, and so does **📝 Submit for Grading** on the lesson's sheet on the ✍️ Process Questions page.

**The Knowledge Check** (`#/kc`):
- **Opening it:** ✓ Finish lesson on the lesson's last slide, or 📝 Submit for Grading on the Process Questions page.
- **Answers:** trainees answer in complete sentences (at least five words each). The answers save as they type and are the same as the lesson's ✍️ Process Questions sheet.
- **Grading:** the AI scores each answer out of 10 for accuracy, depth and clarity. Its feedback, per answer and overall, is written in the **facilitator's feedback DNA** (`js/ft-facilitator-dna.js`, Michelle's evaluations): a verdict label, the strength with specifics, then "However, improvement is needed in …" naming exactly what was missed. The total is a percentage.
- **The trainer's review:** in **Admin → ✍️ Process Questions**, open a trainee and a lesson's Knowledge Check: the graded attempt (the answers, each answer's score and feedback, the overall evaluation), and the trainer's comment on each answer, an overall comment and a **final score**. Saved in `kcreview:<id>` (admins write it; the trainee reads it). The trainee sees *🧑‍🏫 Your trainer's review* on the Knowledge Check, and the trainer's notes under each answer. A trainer's score is final: it replaces the graded best (higher or lower) in their progress and on the Scorecard, and 70% or more finishes the lesson.
- **Passing:** 70% passes and finishes the lesson. A retake keeps the best score.
- **Where the score goes:** the score is saved in the trainee's progress (`state.progress`, so it reaches their record) and on the lesson card ("Finished · 76%", or "Knowledge Check · best 53%" before a pass). Each attempt's per-question scores and feedback are kept in `process:<id>` under `kc`.
- **Certificate:** it needs every lesson finished, so it needs every Knowledge Check passed.

**The ✍️ Process Questions page** (`#/process`) keeps every sheet in one place, for saving it with the proper name:
- **📄 Save to My Google Drive:** copies the answers and opens a new Google Doc already given the right name (e.g. `VA_Essentials_Process_Question_Answers (Jamie)`). It's created in the trainee's folder once they've saved its link (**📁 My Trainee Folder**). They paste the answers in with Ctrl+V.
- **⬇ Download as Word:** gives a .doc with that name, to upload to the trainee folder.
- **📝 Submit for Grading** (one button per lesson for a sheet shared by two lessons, with the best score so far) grades the sheet as that lesson's Knowledge Check. A sheet counts as submitted when a Knowledge Check is graded with all of its questions answered.

**Admin → ✍️ Process Questions** lists batch → trainee → each answer sheet:
- whether it's submitted, how many questions are answered, and the answers;
- the trainee's best Knowledge Check score per lesson (e.g. `L2 76%`), and **📝 Knowledge Checks: graded, then your review** (above);
- the line for the ranking report, in the facilitator's words, for example "Process Questions Responses: COMPLETE; however, Item #7 under the Virtual Assistant Essentials answer sheet was left unanswered."

## 📁 The Task Tracker and the Monitoring Sheet in the trainee's Google Drive

Trainees keep their **LSH Daily Task Tracker** (a Google Sheet) and their **Training Monitoring Sheet** (a Google Doc or Sheet) in their **VA Output folder**, not on the platform (`js/ft-drive.js`, which replaces the trainee pages of 📋 Task Tracker and 📒 Monitoring Sheet; the on-platform sheets below stay for admins and earlier records).

- **📁 My Drive links** (on both pages): the VA Output folder, the Task Tracker sheet and the Monitoring Sheet. Each file is shared as **"Anyone with the link can view"** so the system can read it. Saved in `drive:<id>` (the trainee's own).
- **Each training day** (📋 Task Tracker): the links to the day's outputs (typing and spelling test screenshots, documents …), **📤 Submit the day's links**.
- **Graded automatically:** every night on the Worker's cron and on **✅ Check now** (`/api/drive/check`; a trainee at most every 3 minutes, an admin for anyone), the Worker reads each file's export (a sheet as CSV, a doc as text) and checks:
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

Trainers take each day's attendance in **Admin → 🕘 Attendance** (`js/attendance.js`). Trainees don't see it. It's the same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training, propertydamageclaimstraining, Foundational-Training); change it in all of them. The LSH Training Portal's admin **🕘 Attendance** page shows and edits the same records, for every program.

- **By batch:** one section per batch (newest first, like the other admin tabs), listing its approved, active trainees. Each section shows its count of every status.
- **The day:** the date is today's in Eastern time (EST, or EDT in summer; attendance only, the Task Tracker keeps Pacific time). ◀ ▶ step through the training days, and the date picker opens any day. The batch's **Day N** counts its days already logged; the trainer can change it.
- **Each trainee's row:**
  - **Name**, from their trainee record.
  - **Training**: the batch's training for the day. It starts as the batch's latest open lesson (Admin → 📅 Open Lessons), or the orientation when none is open. It can be changed for the batch, or for one trainee (marked in orange). The list is the lessons, after the orientation and the first days that are off the platform (`ATTENDANCE_TRAININGS_BEFORE` in `js/ft-updates.js`).
  - **Time In / Time Out**, in Eastern time (EST, or EDT in summer): typed, or ⏱ Now. **Time In fills in on its own:** the first time a trainee opens the course each day, the Worker records it (`/api/checkin`). The tab shows it marked "auto" until a trainer sets one, and it's saved into the day's attendance when a trainer tags that trainee. Trainers always tag the status.
  - **Status**, tagged by the trainer from the attendance sheet's dropdown, in its colors: Present, Late, Late with Notif, Early Out - POC Approved, Undertime - POC Approved, Undertime - No Approval, NCNS, Sick Leave, RL, EOP, Absent with Notif. **✓ Mark the rest Present** tags everyone not yet tagged.
  - **Notes**.
- **Saving:** each change saves as you go. A save re-reads the day and writes only the rows changed on that screen, so two trainers can take one batch's attendance at the same time.
- **📊 Summary** (per batch): each trainee's count of every status over all the batch's logged days, with the last 10 days as colored squares.
- **⬇ CSV**, which opens in Excel or Google Sheets: **This day** (every batch) or **Download all days** (one batch, from its summary). The columns: Date, Day, Batch, Name, Training, Time In (EST), Time Out (EST), Status, Notes.
- **Google Sheet:** the LSH Training Portal keeps the attendance Google Sheet's **Platform Attendance** tab in step, both ways: everything here (automatic Time Ins included) goes to the sheet every 15 minutes, and edits made in the sheet to Training, Time In, Time Out, Status or Notes come back here straight away. See the Training Portal's README.
- **Storage:** `attendance:<batch key>:<YYYY-MM-DD>` (`_none` for trainees with no batch) = `{batch, date, day, training, rows:{<trainee id>:{name, training, timeIn, timeOut, status, note, at, by}}}`. `checkin:<YYYY-MM-DD>:<trainee id>` = `{timeIn, at, name, batch, training}` is the automatic Time In (each trainee's own key, so a room signing in at once never overwrites one another; its KV metadata carries the same for the portal; kept 40 days). The Worker lets only admins read and write these records. To change the statuses or their colors, edit `STATUSES`.

## 🛠 Practice Lab: real-time Practice Sessions at the trainee's own law firm

**🛠 Practice Lab** (a section of the top bar) opens `#/simulators` (`js/ft-simulators.js`). Instead of simulators, the trainee does the real work, live, for their own law firm and on their own cases. The page: 🏛 their firm, 🟢 Practice Sessions, 🧑‍🏫 With your trainer, 🖥 Demo preparation and 🧪 Skill Building. The separate simulator cards are gone (the Calendaring Simulators card, the mock-call cards and *All simulators*): the CMS Call Simulator and the Google Calendar Simulator are tools inside their sessions, and the **Calendar Management Mock Calls are part of the Calendaring Practice Lab**. The main landing page has no Practice Lab / Simulators card.

### 🏛 Law Firm Profiles and assignments (`js/ft-firms.js`)

- **Firm profiles** (`settings:firms`, admins write, everyone reads): name, location and state, time zone, hours, main line and greeting, attorneys and team, the firm's **rules by area** (general, reception and calls, calendar, intake, claims, medical records), its calendar **color rule** by length, statute of limitations (years), LOR deadline, records vendor (**ChartSwap**) and the record types it requests, records email, and its **caseload**: Training Library cases in the CMS. Until an admin saves them, three starting profiles are used: **LSH Training Law Group** (the CMS's own firm and rules, Georgia, MC-01–MC-20), **Harbor & Pine Injury Law** (Florida, PIP, MC-21–MC-36) and **Summit Trial Attorneys** (California, Pacific time, MC-37–MC-52). All fictional.
- **Assignments** (`assign:<id>`, admins write, the trainee reads): each trainee's firm and a case in each practice area: **PI Process Flow**, **Intake**, **Claims**, **Medical Records**.
- **Admin → 🏛 Law Firms:** edit, add or delete firms (↺ restores the starting ones); then each batch's trainees with their firm and cases (from the firm's caseload). *Assign this firm to all* and **🎲 Spread cases** (each trainee in the batch gets different cases, the ones that fit the area first) fill a batch at once; **💾 Save all changes**.
- **🏛 My Firm** (`#/firm`): the trainee's firm, its rules (✓ *I've read and understood my firm's rules*, saved in `sessions:<id>`) and their cases, each opening in the CMS.
- **The case facts** the sessions check against are `js/ft-cases-data.js`, generated from the CMS's Training Library: `node build/make_cases.cjs <CaseManagementTraining/mock-cases.js>` (run it again when the cases change).

### 🟢 Practice Sessions (`js/ft-sessions.js`)

| Session | Lesson | Done in | Recorded and checked |
|---|---|---|---|
| ☎️ Reception Mock Calls | Receptionist Training | the CMS Call Simulator's Reception line (graded or practice calls), the Front Desk Drill | the call note: the firm's greeting, a complete message, the case and need, routed to someone on the firm's team, the caller verified, initials |
| 📅 Calendaring Practice Lab | Calendaring & Appointment Setting | the Calendar Management mock call (CMS), then the Google Calendar Simulator | the appointment: caller and case, a weekday inside the firm's hours, on the 15-minute grid, the firm's color for its length, Meet and the reminder, a description |
| 📋 Intake Mock Calls | Intake Specialist | the CMS's Intake line, on the trainee's intake case (Intake tab) | the intake: name, DOB, DOL, case type, 3P carrier, the statute of limitations under the firm's state, injuries, the conflict check and a decision |
| ⚖️ PI Process Flow | Personal Injury Process Flow | the trainee's case in the CMS | its phase, attorney, case manager, DOL, SOL and the next steps with who does each |
| 🧾 Claims: LORs (1P & 3P) | Claims Specialist | the trainee's claims case (practice copy) | 3P carrier, claim, adjuster and limits, 1P coverage and claim, the follow-up date |
| 🩺 Medical Records: ChartSwap request | Medical Records Specialist | the trainee's records case | a ChartSwap-style request: requesting firm and records email, patient and DOB, a treating provider and its first date of service, the firm's record types, a legal purpose, the HIPAA authorization (hold the request when it isn't signed yet) and who signs (the guardian or POA when the file has one) |

- **Real time:** ▶ Start the session starts a clock and opens the tools (the CMS signed in: see *Training tools open signed in*); the trainee records their work on the session's form as they go and **📤 Submits for review**.
- **Then:** (1) the automated checks against the case file and the firm's rules, a % per session (80% passes); (2) the AI's evaluation in the facilitator's feedback DNA; (3) the trainer's review. The trainee can do a session again.
- **Admin → 🟢 Practice Sessions:** **📡 Live now** (sessions in progress, refreshed every 20 s while the tab is open and visible; it can be paused), then every trainee's sessions by batch: what they recorded, the checks, the AI's evaluation and the trainer's **score and comment** (final).
- **Graded calls** still count in their lesson: the Reception, Calendaring and Intake sessions show the lesson's best graded call from the CMS Call Simulator (`callsim:<id>`, below).
- **Records:** `sessions:<id>` (the trainee's runs, answers, checks and the AI's evaluation), `labreview:<id>` (the trainer's reviews and inputs; admins write it, the trainee reads it).

### 🧑‍🏫 Trainer Inputs: what can't be simulated

The trainee–trainer activities (the demos and the live mock calls with the trainer) are recorded by the trainer: **Admin → 🧑‍🏫 Trainer Inputs** is a grid of trainees × activities; a cell takes the result (Not yet, Passed, Redo), a score, the date and a comment. **✏️ Edit the activities** changes the list (`settings:trainer-acts`, one per line: `title | lesson | kind`; the starting list is the Training Guide's live mock calls and its demos, including the Saving Intake Packet and Extracted Intake Documents Demo). The trainee sees each result under *🧑‍🏫 With your trainer*, and it reaches the Scorecard.

### 🖥 Demo preparation and 🧪 Skill Building

**🖥 Demo preparation:** one card per demo in the Training Guide, with the training CMS's Training Library cases that fit it (`ACTIVITIES` in `js/ft-simulators.js`; a case opens with `?program=…&mock=MC-xx`, view only, and **Work on a practice copy** makes it editable). Each case's one-line description is taken from `mock-cases.js`.

**🧪 Skill Building** (`#fts-skills`): the daily Typing Test (twice a day) and Spelling Test (once a day), each with the tools to use (TypingClub or TypingTest.com; SpellQuiz or Spelling-Test.com), when to take it, the screenshot's file name and a sample. The tests are `TESTS` in `js/ft-rules.js` (shared as `window.FT_SKILL_TESTS`); the orientation slide only points here (`ftsGotoSkills()`).

**Graded calls count in their lesson.** The main Call Simulator is the CMS's: every link opens it directly (`?calls=1&program=FT&line=<line>`, `&mode=graded` for the line's graded calls), signed in with the trainee's ticket. A graded call taken there is reported by the CMS to the Training Portal (its `/api/call-results`), which keeps it in this program's store as `callsim:<trainee id>`; the Worker lets the trainee read it but never write it. Reception (lesson 4), Calendar Management (5) and Intake (6) then show their best graded call on the session card ("🎯 Graded calls: best 82% · 2 calls") and on the lesson card ("📞 82%"), and the dashboard band shows the three lessons' best graded calls averaged. It's read once a page load and again when the trainee comes back to the tab (at most every two minutes).

### 🔐 Training tools open signed in (no CMS log-in page)

Every link to the training CMS (cases, the Training Library, the Call Simulator, the Front Desk Drill) and to the Training Portal's simulator pages (the Google Calendar Simulator, Medical Records Requests, …) opens it already signed in. `js/lsh-tool-links.js` (the same file in every LSH course repo) adds a fresh ticket to the link on the way out (`?ticket=`: clicks, middle-clicks, New tab ↗, `window.open`, and the Open here frame through `LSHToolLinks.ticketed(url)`). The ticket is signed by this Worker (`/api/auth/tool-ticket`) with the Portal's `PORTAL_SSO_SECRET`, in the Portal's own format (`{first, last, b, exp}`, good for 5 minutes), so the CMS signs the trainee in through its existing Portal sign-in (`guest-access.js`, `/api/portal-login`). Trainees only: admins and 👁 Trainee view are left alone (an admin's ticket never signs anyone in), and without the secret the link opens as it was. The Portal signs the trainee in from the ticket before a simulator page is sent (its `functions/_middleware.js`, Training-Portal repo), and there a signed-in trainee always practices as their own account.

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

- **Lessons open when the trainer opens them.** In **Admin → 📅 Open Lessons**, a trainer ticks the lessons that are open, either for **All batches** or for one batch. Trainees only see open lessons. The setting is stored as `settings:opendays` (the engine calls lessons "days" internally).
- **No quizzes.** A lesson's last slide has **✓ Finish lesson**. When every lesson is finished, the certificate unlocks. The assessments will be added as built-in Practice Labs, with the same content as their documents.
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
| `build/days/dayNN.js` | The curriculum's days as HTML, kept for reference; not built into the trainee pages. |
| `ft/dayN/img/` | The curriculum's screenshots for day N. |
| `ft/day17/word-game-1.html` | Day 17's Word Game 1 from the Lien Negotiator Training deck, playable: the slide's grid, rules and 4-minute timer, with scoring, a Present mode for the room, and an answer key. It sits in the PM part, under Free Communication Upskill. |
| `trainer/notes.json` | The facilitator's notes, keyed `"<day>:<slot>"`. |
| `trainer/curriculum.json`, `trainer/img/` | The admin copy of the whole guide, and the facilitator-only screenshots. |
| `build/curriculum/` | Imports Days 2–18 from the guide's Word file. |
| `js/ft-process.js` | Process Questions and the Knowledge Checks: each lesson's answer sheet, answered on the platform and graded (70% passes the lesson), saved to Google Drive or Word with the proper name; Admin → ✍️ Process Questions. |
| `js/ft-monitoring.js` | The Training Monitoring Sheet: trainees fill it in (📒 Monitoring Sheet); Admin → 📒 Monitoring Sheets shows each entry with automated, rule-based feedback. |
| `js/ft-rules.js` | Training Orientation and Rules: a slide presentation beside Virtual Assistant Essentials (always open, not counted as a lesson). |
| `js/ft-orientation.js` | Admin → 🧭 Orientation: this program's platform orientation slides, which are also the Blueprint PDF (`/blueprint.pdf`). |
| `js/ft-simulators.js` | The 🛠 Practice Lab page (`#/simulators`): the firm banner, the sessions' cards, demo preparation and Skill Building. |
| `js/ft-firms.js` | 🏛 Law Firm Profiles, each trainee's firm and cases (Admin → 🏛 Law Firms), and 🏛 My Firm; `ftAdminTab()` for this program's admin tabs. |
| `js/ft-sessions.js` | 🟢 Practice Sessions (`#/session`) with their checks, the AI's evaluation and the trainer's review (Admin → 🟢 Practice Sessions), and 🧑‍🏫 Trainer Inputs. |
| `js/ft-cases-data.js`, `build/make_cases.cjs` | The Training Library's case facts the sessions check against, generated from the CMS's `mock-cases.js`. |
| `js/ft-drive.js` | The Task Tracker and the Monitoring Sheet in the trainee's Google Drive: the links, the checks, Admin → 📁 Drive Trackers. |
| `js/lsh-tool-links.js` | Training tools open signed in: a fresh ticket on every CMS link (the same file in every LSH course repo). |
| `js/lsh-program.js` | The program layout (the same file in every LSH course repo): the five sections in the top bar, 📚 Training Modules (`#/modules`) and its tabs, 🏅 Scorecard (`#/scorecard`) and Admin Master Control → 🏅 Scorecards. |
| `js/ft-program.js` | This program's setup for the layout: the Training Modules pages, the Practice Lab's pages and what the Scorecard collects. |
| `js/ft-activities.js` | Admin → 🗣 Feedback Style (the 📝 Activities page was taken off). |
| `js/ft-tracker.js`, `js/ft-tracker-rules.js` | The Daily Task Tracker (the on-platform sheet, Admin → 📋 Task Trackers) and its rules, which the Worker's daily check uses too, with the Drive sheet's reader (`fromSheetCsv`) and the Monitoring Sheet's check (`gradeMonitorText`). |
| `js/attendance.js` | Admin → 🕘 Attendance (the same file in every LSH course): each batch's daily attendance (name, training, day and date, time in and out, the trainer's status tag, notes), with a per-batch summary and CSV downloads. |
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
- adds `js/ft-updates.js`

Every edit checks that its anchor exists, so the build stops with an error if the EA/PA portal changed that part. Update the anchor in `build.py` and run it again. Rebuild when EA/PA ships new engine features.

## Adding a day

1. Create `build/days/dayNN.js` (e.g. `day02.js`) like `day01.js`: `id`, `title`, `heading` (as the curriculum writes it) and `sections`, one per curriculum section, each `{id, h, html}`.
   - Use the curriculum's wording as it is.
   - Put its screenshots in `ft/dayN/img/`.
   - Drive files: `<a class="viewer-link" data-kind="doc|video" data-title="…" href="…">`.
   - Canva: a `.canva-frame` embed with the design's `/view?embed` link.
2. Put facilitator-only content in `trainer/notes.json` under `"N:<slot>"`, and mark its place in the section with `<div class="trainer-slot" data-slot="N:<slot>"></div>`.
3. Run the build, then open the day for a batch in Admin → 📅 Open Days.

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

Every request to the Worker (everything under `/api/` and `/version`) counts toward the Cloudflare account's requests. The account is on Workers Paid: **10 million requests a month, shared by every LSH site** (the courses, the CMS, the Training Portal and the rest). Past that, Cloudflare charges for every extra million, so a page that asks too often costs money for every site. Static files (the page, `js/`, images) don't count.

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

Lists of records are read with `/api/storage/get-many` (1 to 100 keys, the same rules as `/api/storage/get` for each key, under the `ft:` prefix like every other key), not one request per record: the tasks for every lesson, the Trainee Audit, Rankings and Trainee Feedback, 🕘 Attendance, and the trainees' sheets in 📋 Task Trackers, 📒 Monitoring Sheets and ✍️ Process Questions (20 sheets to a request, since a sheet can be up to about 1 MB). A trainee is signed out as revoked only when the server answers that their record is gone or not approved: a server that doesn't answer (offline, or the request limit) no longer signs anyone out, and their open lessons stay open until it answers again.

The `index.html` part is the EA/PA portal's engine (the same change is in EA-PA-TRAINING), so a rebuild keeps it.

## Checks (GitHub Actions)

`.github/workflows/checks.yml` runs on every pull request and every push to `main`. A red **Checks** status means something is broken, and the log says what:

- **Syntax, files and build:** every `.js` file and inline script parses, every local file the pages load is in the repository, and every JSON file parses (`.github/scripts/check-site.mjs`, the EA/PA portal's); the Worker builds (`wrangler deploy --dry-run`).
- **The Drive trackers** (`.github/scripts/drive.cjs`, no browser): the Worker reads a tracker sheet and a Monitoring Sheet (Google's export answered by the test), checks them, keeps the trainer's input on a new check, makes a trainee wait 3 minutes between checks and explains a file that isn't shared.
- **Practice Sessions** (`.github/scripts/practice-sessions.cjs`): the starting firms, a firm and different cases for two trainees, My Firm, the six sessions (a ChartSwap request filled from the case passes, a wrong color misses), the trainer's review and inputs, the Knowledge Check's trainer score and the Scorecard. Also in the browser job: `graded-calls.cjs` and `blueprint.cjs` (no Blueprint or Simulators card on the landing page; the top bar's Blueprint button stays).
- **Server requests** (`.github/scripts/requests.cjs`): `get-many` gives a trainee only their own and public records and an Admin every one, reads this program's `ft:` records only, and refuses more than 100 keys. In a browser, with the checks sped up: a trainee's page reads the tasks for every open lesson in one request, their record about once per check, and the open lessons in one request; checks for a new version rarely; and asks nothing while the tab is in the background (catching up when it's back) or on a quick switch to another tab and back. A server that doesn't answer doesn't sign the trainee out or lock their lessons; a revoke does. The Trainee Audit reads every trainee in two requests, and Task Trackers, Monitoring Sheets and Process Questions read the trainees' sheets with get-many.

To run them locally (Node 22; the browser test needs Playwright: `npm install playwright` and `npx playwright install chromium`):

```
node .github/scripts/check-site.mjs
node .github/scripts/server.mjs 8787 &      # the site through worker.js, with an in-memory KV
node .github/scripts/requests.cjs http://localhost:8787/
```

`server.mjs` runs the Worker in open mode (no admin password) and with no AI keys, so nothing outside your computer is called. The requests test takes about a minute.
