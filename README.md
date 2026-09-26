# LSH 18-Day Foundational Training Program

The training platform for the *Revised 18-Day Foundational Training Program* (Training Guide for LSH Trainees). It runs on the same engine as the EA/PA portal and the CM course:

- sign-in and approvals
- day-by-day slideshows
- progress saved to the trainee's account
- the admin Trainee Audit and trainer feedback
- trainee feedback and certificates
- 🖥 Presenter view and 👁 Trainee view

Each day's content is its section of the curriculum, **as written**:

- the same wording, order and screenshots
- Canva decks and Google Drive videos, handouts and readings embedded unchanged
- nothing added that isn't in the curriculum

## Days

| Day | Title | On the platform |
|---|---|---|
| 1 | VA Essentials | ✅ 9 parts |
| 2 | VA Essentials | coming |
| 3–5 | Reception Training | coming |
| 6 | Calendar Management Training | coming |
| 7–9 | Intake Training | coming |
| 10–12 | Insurance Communication Training | coming |
| 13–16 | Provider Communication Training | coming |
| 17–18 | Lien Negotiator Training | coming |

A day without content shows on the dashboard as *Coming soon* and can't be opened by trainees.

## How the program works

- **Days open when the trainer opens them.** In **Admin → 📅 Open Days**, a trainer ticks the days that are open, either for **All batches** or for one batch. Trainees only see open days. The setting is stored as `settings:opendays`.
- **No quizzes.** The day's last slide has **✓ Finish Day N**. When all 18 days are finished, the certificate unlocks. The offline activities will be added when they're uploaded.
- **Facilitator's notes are trainer-only.** They're not in the page:
  - They live in `trainer/notes.json`, which `worker.js` sends only with a trainer (admin) token.
  - Signed-in trainers see them in a dashed "Trainer only" box where the curriculum has them.
  - In Presenter view they're the cues for the part on screen.
  - They never show in 👁 Trainee view or in the slides window shared with the room.
- **Drive files** open in a draggable pop-out viewer, the same one as the LSH Training Portal's Recorded Lectures. Videos ask "Do you want to watch…?" first.

## Files

| Path | What it is |
|---|---|
| `index.html` | **Generated** by `build/build.py` from the EA/PA portal. Don't edit it by hand. |
| `js/eapa-updates.js` | **Generated**: the EA/PA update pack (Presenter view, Trainee view, slide layout), rebranded. |
| `js/ft-updates.js` | This program's layer: section slides, trainer-only notes, open days, Finish Day, dashboard, pop-out viewer. |
| `build/build.py` | The build (see below). |
| `build/days/dayNN.js` | Each day's content: its curriculum sections as HTML. |
| `ft/dayN/img/` | The curriculum's screenshots for day N. |
| `trainer/notes.json` | The facilitator's notes, keyed `"<day>:<slot>"`. |
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
