# LSH Standard Foundational Training

The training platform for the *Revised 18-Day Foundational Training Program* (Training Guide for LSH Trainees). It runs on the same engine as the EA/PA portal and the CM course:

- sign-in and approvals
- lesson slideshows
- progress saved to the trainee's account
- the admin Trainee Audit and trainer feedback
- trainee feedback and certificates
- 🖥 Presenter view and 👁 Trainee view

Trainees see **the lessons**. Each lesson is its Canva training deck, shown full width in the platform (with Full screen). Lessons are named by their training title, not by day.

The curriculum (the Training Guide, with the day-by-day tasks, links and facilitator's notes) is for trainers and admins only, in **Admin → 📘 Curriculum**. It is not on the trainee pages.

## Lessons

| # | Lesson | On the platform |
|---|---|---|
| 1 | Virtual Assistant Essentials | ✅ deck |
| 2 | Law Firm Communication | ✅ deck |
| 3 | Personal Injury Process Flow | coming (deck view link needed) |
| 4 | Receptionist Training | coming (deck view link needed) |
| 5 | Calendaring & Appointment Setting Training | ✅ deck |
| 6 | Intake Specialist Training | ✅ deck |
| 7 | Claims Specialist Training | coming (deck view link needed) |
| 8 | Medical Records Specialist Training | ✅ deck |
| 9 | Lien Negotiator Training | ✅ deck, then Word Game 1 (playable) |

A lesson without its deck shows on the dashboard as *Coming soon* and can't be opened by trainees. To add one, put its Canva view link in `build/lessons/lessonNN.js` (same shape as the others) and rebuild.

## How the program works

- **Lessons open when the trainer opens them.** In **Admin → 📅 Open Lessons**, a trainer ticks the lessons that are open, either for **All batches** or for one batch. Trainees only see open lessons. The setting is stored as `settings:opendays` (the engine calls lessons "days" internally).
- **No quizzes.** A lesson's last slide has **✓ Finish lesson**. When every lesson is finished, the certificate unlocks. The assessments will be added as built-in Practice Labs, with the same content as their documents.
- **Facilitator's notes are trainer-only.** They're not in the page:
  - They live in `trainer/notes.json`, which `worker.js` sends only with a trainer (admin) token.
  - Trainers see them in Admin → 📘 Curriculum, where the guide has them. (The lessons don't carry any.)
  - They never show in 👁 Trainee view or in the slides window shared with the room.
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
- `.assetsignore` keeps the Worker, config, build files and Markdown out of the served files.
- Secrets:
  - `ADMIN_PASSPHRASE`: trainer sign-in. It turns on secure mode, which the trainer-only notes need.
  - `SESSION_SECRET` (optional)
  - `GEMINI_API_KEY` (optional: AI drafts for trainer feedback)
