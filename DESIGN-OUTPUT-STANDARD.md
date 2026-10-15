# LSH Standard: Design Output Structure

Every **Web / structural design, slide, page, or Portal View** produced for the
*Revised 18-Day Foundational Training Program* is written in the same five
sections, in this order. No section is optional; an empty section is written as
`N/A — <reason>`, never dropped.

---

## 1. Slide / Page Title & Topic Header

A structured banner, always three lines:

```
╔══════════════════════════════════════════════════════════════╗
║  PHASE <n> · <PHASE NAME>                                    ║
║  DAY <n> — <Day heading from trainer/curriculum.json>        ║
║  TOPIC: <Topic name>                    View: 🖥 / 👁        ║
╚══════════════════════════════════════════════════════════════╝
```

- **Phase** — the program phase (Orientation · Training Proper · Specialization · Assessment).
- **Day** — must match the `heading` of the matching entry in `trainer/curriculum.json`.
- **Topic** — the lesson/training title, never "Lesson N" (lessons are named by title, not by day).
- **View** — 🖥 Presenter view or 👁 Trainee view, when the output differs between them.

## 2. Visual Layout Description

Precise specifications, not prose. Cover, in order:

| Item | What to state |
|---|---|
| Geometry | Grid/columns, max width, gutters, breakpoints (961px, 1400px are the program's) |
| Palette | Every colour as a hex code with its role |
| Typography | Family, weight, size scale for H1/H2/body/caption |
| Icons | The exact emoji/glyph per component — reuse the program's set (📚 🛠 ✍️ 👤 🛡 🏠) |
| Components | Named blocks in render order, with their states (default/locked/complete) |
| Responsive | What collapses, wraps, or renames at each breakpoint |

**Program palette (default unless a brief overrides it):**

| Role | Hex |
|---|---|
| Navy (primary / Start) | `#0B2447` |
| Portal blue (links, active tab) | `#1D5DAB` |
| Accent gold (milestones) | `#C9A227` |
| Pass green | `#1B7F4C` |
| Attention red | `#B3261E` |
| Surface | `#FFFFFF` |
| Panel | `#F4F6FA` |
| Rule / border | `#D7DDE8` |
| Body text | `#1A1C1F` |
| Muted text | `#5A6372` |

## 3. Diagram / Visual Representation

An ASCII/Unicode map of the layout, workflow, or decision tree. Boxes for
components, `│ ├ └ →` for flow, labels on every branch. Example shape:

```
┌──────────────── TOP BAR ────────────────────────────────────┐
│ 🏠 Main Portal │ 📚 Modules │ ✍️ Process │ 🛠 Lab │ 👤 ▾ │ 🛡 │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
   ┌─ 📚 Modules (landing) ──────────────┐
   │  Lesson card                        │
   │   ├─ ▶ Start / Review   (full row)  │
   │   └─ 🎬 Video           (full row)  │
   └─────────────────────────────────────┘
        │  finish lesson
        ▼
   ✍️ Process Questions ──► #/kc (graded) ──► 🏅 Scorecard

Decision:  video unlocked?
   ├─ yes ─► ▶ Video Presentation
   └─ no  ─► 🔒 Video Presentation (trainer unlocks in Admin → 📅 Open Lessons)
```

## 4. Scannable Key Takeaways

Three to seven lines, each one rule, each starting with a bold imperative.

- **One home.** Every entry point opens `#/modules`; no second landing page.
- **Name by title.** Lessons carry their training title, not a day number.
- **State the hex.** No colour ships as a name; every colour is a code.
- **Trainees sign in on the Portal only.** This site shows them no form.
- **Full-width button grid.** Card actions span edge to edge, separated by thin rules.

## 5. Assessment Criteria (AI + Trainer Rubric)

| # | Criterion | AI automated check | Trainer score | Weight | Pass mark |
|---|---|---|---|---|---|
| 1 | Banner completeness | Phase, Day, Topic all present; Day matches `curriculum.json` | — | 10% | 100% present |
| 2 | Layout specification | Geometry, palette (hex), typography, icons, components, responsive all stated | Judgement on visual balance | 20% | 70% |
| 3 | Palette compliance | Every colour is a hex code and in the program palette or declared as an override | Brand fit | 15% | 70% |
| 4 | Diagram validity | ASCII block present; every branch labelled; flow terminates | Clarity for a live class | 20% | 70% |
| 5 | Takeaways | 3–7 bullets, each a single bold rule | Instructional value | 15% | 70% |
| 6 | Rubric present | This table reproduced and filled for the topic | Alignment to program rubric | 10% | 100% present |
| 7 | Accessibility | Body text ≥ 4.5:1 contrast on its surface; no colour-only meaning | Readability on the projector | 10% | 70% |

- **AI checks** are structural and mechanical — presence, format, contrast ratio, cross-reference to `trainer/curriculum.json`. They are pass/fail per row.
- **Trainer scoring** is 0–5 per row on instructional quality, converted to a percentage.
- **Overall** = weighted average of the rows that have a score, so each criterion counts as weighted. **70% passes**, matching the program's Knowledge Check threshold.
