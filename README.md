# LSH Standard Foundational Training

The training platform for the *Revised 18-Day Foundational Training Program* (Training Guide for LSH Trainees). It runs on the same engine as the EA/PA portal and the CM course:

- sign-in and approvals
- lesson slideshows
- progress saved to the trainee's account
- the admin Trainee Audit and trainer feedback
- trainee feedback and certificates
- 🖥 Presenter view and 👁 Trainee view

**🏠 Main Portal (admins):** while an admin is signed in, the top bar has **🏠 Main Portal** and the Admin screen has **← Back to Main Portal** (next to Log out). Both open the LSH Training Portal's Training Directory (`https://cm-training-activity.pages.dev/programs.html`), where admins open each program. Trainees and the 👁 Trainee view don't show them. It's `js/portal-link.js`, the same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training, propertydamageclaimstraining, Foundational-Training); change it in all of them.

Trainees see **the lessons**. Each lesson is its Canva training deck, shown full width in the platform (with Full screen). Lessons are named by their training title, not by day.

The curriculum (the Training Guide, with the day-by-day tasks, links and facilitator's notes) is for trainers and admins only, in **Admin → 📘 Curriculum**. It is not on the trainee pages.

## Lessons

| # | Lesson | On the platform |
|---|---|---|
| 1 | Virtual Assistant Essentials | ✅ deck (Open in Canva ↗) |
| 2 | Law Firm Communication | ✅ deck |
| 3 | Personal Injury Process Flow | ✅ deck |
| 4 | Receptionist Training | ✅ deck |
| 5 | Calendaring & Appointment Setting Training | ✅ deck |
| 6 | Intake Specialist Training | ✅ deck |
| 7 | Claims Specialist Training | coming (deck view link needed) |
| 8 | Medical Records Specialist Training | ✅ deck |
| 9 | Lien Negotiator Training | ✅ deck, then Word Game 1 (playable) |

Onboarding and Setting of Expectations & Tech Set-up (ids 10 and 11) are off the platform: their files are in `build/lessons/off/` (with the Day 0 screenshots still in `ft/day0/img/` and the `d0:*` trainer notes), which the build skips. To bring one back, move its file into `build/lessons/` and rebuild; it keeps its id, so saved progress doesn't shift. `DAYS` follows the file order, and a lesson's `label` / `short` replace "Lesson N of 9" and the dashboard circle's number.

Each lesson card has **▶ Video Presentation** (the lesson's `video`: its AI Assisted Discussion video from the curriculum), which plays in the pop-out viewer once the lesson is open. Lessons are finished from their last slide (✓ Finish lesson).

A lesson without its deck shows on the dashboard as *Coming soon* and can't be opened by trainees. To add one, put its Canva view link in `build/lessons/lessonNN.js` (same shape as the others) and rebuild.

## Daily Task Tracker

Each trainee has an **LSH Daily Task Tracker** on the platform (📋 Task Tracker in the top bar), laid out like the Google Sheets sample: the status counts, Date Received, Type of Task, Task Details, Accountable VA, the dated **Daily Notes** columns, VA Notes, Deadline, Status and Actual Completion Date, with the For Completion / Recurring / Completed sections and the Client-VA Specific Tasks Index, Links & Access (no passwords), Directory and Time Zone tabs. It saves to the trainee's account as they type (`tracker:<id>`).

- **The daily check** runs on the Worker's cron (`wrangler.json`, 02:00 UTC: 7 PM Pacific daylight time, 6 PM in winter) for every approved trainee, and live on the page while the trainee types. The result is a ✅/❌ per rule, the day's %, and every flagged cell (red on the sheet). Rule for now: every open task has a Daily Note for the day. Rules live in `js/ft-tracker-rules.js`, shared by the page and the Worker; add one to `RULES` to extend the check.
- **Notes review:** the Worker also writes a short review of the day's notes against the criteria in **Admin → 📋 Task Trackers** (`settings:trackercriteria`). It uses the Gemini key pool (`GEMINI_API_KEY5` … `GEMINI_API_KEY9`); trainees see it as "Notes review".
- **Trainer's comment:** in Admin → 📋 Task Trackers, open a trainee's day, write a comment, and the trainee sees it under the check. Results and comments are in `trackerreview:<id>`, which trainees can read but not change.
- **Admin → 📋 Task Trackers** is laid out batch → trainee → record: a collapsible 📁 section per batch (today's average and how many need attention), one compact row per trainee (open and completed tasks, the last five training days, 5-day average), and, when you click a trainee, every daily record on file (the check %, flags and your comment, each opening that day). Archived trainees are listed under **📦 Archived batches**; only active trainees' trackers are loaded, and an archived trainee's records load when you open them.

## Simulators

**🛠 Simulators** (top bar, and the **Simulators** card on the dashboard, like the Training Portal's) opens `#/simulators` (`js/ft-simulators.js`).

**Mock calls and demos.** There is one card for each mock call and demo in the Training Guide, using the guide's name for it. Each card's examples are the training CMS's **Training Library** cases: MC-01 … MC-20, the fictional PI files in `CaseManagementTraining/mock-cases.js`. A case opens in the CMS with `?program=…&mock=MC-xx`, view only; **Work on a practice copy** makes it editable.

| Activity | Lesson | Example cases | Also |
|---|---|---|---|
| Reception Mock Calls | Receptionist Training | MC-01, MC-06, MC-10, MC-16 | Front Desk Drill (scored calls on these cases), Training Library, Call Simulator (7 reception calls) |
| Calendar Management Mock Calls | Calendaring & Appointment Setting | MC-01, MC-05, MC-08 | Calendaring, Call Simulator (4 calendar calls) |
| Intake Mock Calls | Intake Specialist | MC-02, MC-13, MC-12, MC-19 | Call Simulator (3 intake calls) |
| Saving Intake Packet and Extracted Intake Documents Demo | Intake Specialist | MC-02, MC-13 | Training Library |
| LOR Uploading and Sending Demo (1P & 3P) | Claims Specialist | MC-01, MC-02, MC-12 | Training Library |
| Sending MedLOR and Requesting Medical Bills & Records Demo | Medical Records Specialist | MC-01, MC-15, MC-08 | Training Library |
| LV (Lien Verification) Request Demo | Medical Records Specialist | MC-09, MC-15, MC-05 | Training Library |
| Reduction Request, Settlement Release Forms and Closing Statement Demo | Lien Negotiator | MC-11, MC-06 | Training Library |

Each case's one-line description is taken from `mock-cases.js`. If a case changes there, update its line in `ACTIVITIES`.

**All simulators.** Every live simulator on the LSH Training Portal: Call, Calendaring, Email Workspace, Email Replies, Docket System, Medical Records Requests and Court E-Filing. These are open any time, and the section links to the portal's Simulators hub.

**How the tools open**
- **Open here** runs the tool in a full-window panel (✕ Close or Esc returns to the page). **New tab ↗** opens it in its own tab.
- For trainees, a mock call or demo card opens with its lesson (Admin → 📅 Open Lessons). Trainers see every card.
- Portal simulators get `program=FT` with the trainee's name and batch, so scores are saved for the trainer.
- The **Call Simulator** has a Foundational pack of 14 calls on the same CMS cases (Training Portal, `simulators/call-pack-ft.js`). Each mock call card opens it on that card's calls (`&line=Reception Mock Calls`, etc.). A call's brief shows the case file with a link to open it in the CMS, and after the call the trainee writes the note it requires.

## Activities and the facilitator's feedback style

`js/ft-activities.js` (wired in like the Tracker and Simulators, no edits to the generated page):

- **📝 Activities** (top bar): trainers add activities for each program day (**Admin → 📝 Activities → Set activities**, Day 0 to Day 18). Each activity has:
  - a title and instructions (paste from your document; `**bold**`, `- ` bullets and links work);
  - attached files (up to 4 MB each);
  - how trainees answer (written, file upload or both);
  - private notes on what a strong answer includes;
  - **Visible to trainees** and an optional **Batch** (empty = all batches).

  Trainees see the visible activities for their batch, newest day first, answer (drafts autosave), attach a file and submit.
- **Review submissions:** ✨ Draft with AI writes a review from the private notes; the trainer edits it and sends it. The trainee gets a badge on 📝 Activities and reads it on the activity page. Resubmitting keeps the earlier feedback and waits for a new review.
- **Scored rubrics** (optional, per activity, private): in the activity form, open **📊 Scored rubric** and paste the rubric table from Word/Docs (or upload it as .txt/.tsv): one row per criterion, then what earns 5, 4, 3, 2 and 1 points. Add one **graded example**, an evaluation you wrote (Criteria · Score · Evaluation), with the trainee's name removed. From then on, ✨ Draft with AI scores every submission for that activity criterion by criterion, the way the example does: a score out of 5 and a 2–4 sentence evaluation in the facilitator's style (specific facts from the answer, exact omissions, quoted typos). The review shows each criterion's score and evaluation to edit, with the **Total Score** and **Final Rating** (total ÷ number of criteria) recalculated; the trainee sees the same table. Stored in `actadmin:scoring` (trainer-only).
- **Admin → 🗣 Feedback Style** learns how the facilitator writes feedback:
  - **Import** takes the reviews the trainer wrote or edited (trainer reviews and activity reviews); more examples can be pasted or uploaded (.txt).
  - **Learn the style** makes a style guide plus generic voice examples, which can be edited or switched off.
  - While it's on, AI feedback is written in that voice: activity drafts, trainer review drafts, graded exercises, and the Worker's nightly **Task Tracker notes review** (`facilitatorVoice` in `worker.js`). Ratings, scores and the tracker check itself don't change.

Storage (`ft:` prefix, rules in `worker.js`):
- Trainers publish, everyone reads: `activities:dayN`, `actfile:*`, `settings:feedback-style`.
- Each trainee's own: `actsub:<trainee>` and `actup:<trainee>:*`. Trainees can't write the trainer's feedback.
- Trainer-only: `actadmin:rubrics`, `admin:fbstyle-samples`.

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
| `build/lessons/lessonNN.js` | Each lesson: its Canva deck (one slide per section). This is what trainees see. |
| `build/days/dayNN.js` | The curriculum's days as HTML, kept for reference; not built into the trainee pages. |
| `ft/dayN/img/` | The curriculum's screenshots for day N. |
| `ft/day17/word-game-1.html` | Day 17's Word Game 1 from the Lien Negotiator Training deck, playable: the slide's grid, rules and 4-minute timer, with scoring, a Present mode for the room, and an answer key. It sits in the PM part, under Free Communication Upskill. |
| `trainer/notes.json` | The facilitator's notes, keyed `"<day>:<slot>"`. |
| `trainer/curriculum.json`, `trainer/img/` | The admin copy of the whole guide, and the facilitator-only screenshots. |
| `build/curriculum/` | Imports Days 2–18 from the guide's Word file. |
| `js/ft-simulators.js` | The 🛠 Simulators page: the guide's mock calls and demos, with their practice tools. |
| `js/ft-activities.js` | 📝 Activities (trainee tab, Admin → 📝 Activities) and Admin → 🗣 Feedback Style. |
| `js/ft-tracker.js`, `js/ft-tracker-rules.js` | The Daily Task Tracker (the sheet, the check panel, Admin → 📋 Task Trackers) and its rules, which the Worker's daily check uses too. |
| `worker.js` | Cloudflare Worker: the EA/PA/CM Worker with an `ft:` storage prefix, plus the `/trainer/` gate. |

## Build

The platform is rebuilt from the EA/PA portal (the `EA-PA-TRAINING` repository), like the CM course:

```
python3 build/build.py ../EA-PA-TRAINING
```

The script:
- swaps the EA/PA days for this program's 18 days from `build/days/`
- drops the EA/PA-only heavy content
- applies the branding
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
  - `ADMIN_PASSPHRASE`: trainer sign-in. It turns on secure mode, which the trainer-only notes need.
  - `SESSION_SECRET` (optional)
  - `GEMINI_API_KEY5` … `GEMINI_API_KEY9`: the Gemini key pool behind every AI feature (live chat, grading, the tracker's notes review, trainer tools). Each request starts on the next key in turn, so the load is spread across all of them; a key that hits its limit rests (a minute for a per-minute limit, an hour for a daily one) and the next key takes over. Create each key in its **own** Google Cloud project: keys in the same project share one quota. `/version` shows which pool keys are set.
  - `GEMINI_API_KEY`, `GEMINI_API_KEY1`, `GEMINI_API_KEY2` (optional): used only after every pool key.
