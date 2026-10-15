#!/usr/bin/env python3
"""One-off repair: re-key trainer/scripts.json onto the lessons' current slide ids.

    python3 build/slides/rekey_scripts.py            (check only)
    python3 build/slides/rekey_scripts.py --write

The presenter scripts for Lessons 2, 4 and 7 were written when those lessons were built from their
decks' native slides (section ids p01…, n001…). The lessons were later rebuilt from the decks' PDF
pages by build/slides/image_lesson.py, whose section id is the page's number in the deck (v001 = page 1),
so none of the stored script keys matched a slide any more and the Presenter drawer showed every page of
those decks as "the page-by-page script for this deck isn't written yet".

Both id styles carry the same page number, so each script is moved to v<page>. A script whose page is not
one of the lesson's kept pages has no slide to sit behind: it is kept under the deck's "unused" key rather
than thrown away, so the writing survives if that page is ever added back. "on" ("Slide n of N") is
renumbered against the lesson. make_scripts.py already keys by the lesson's own section ids, so a
regenerated script needs no repair.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def lesson_ids(lesson):
    """The slide ids of lesson <n>, in order, from the built page (index.html)."""
    s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    m = re.search(r"const DAY%s = \{" % lesson, s)
    if not m: return []
    end = s.find("\nconst DAY", m.start() + 10)
    return re.findall(r'"id": "([^"]+)"', s[m.start(): end if end > 0 else len(s)])

def main(write):
    path = os.path.join(ROOT, "trainer", "scripts.json")
    data = json.load(open(path, encoding="utf-8"))
    for lesson, deck in sorted(data.items(), key=lambda kv: int(kv[0])):
        ids = lesson_ids(lesson)
        secs = deck.get("sections") or {}
        if not ids or not secs: continue
        order = {k: i for i, k in enumerate(ids)}
        out, dropped = {}, {}
        for key, sc in secs.items():
            page = re.sub(r"\D", "", key.split(".")[0])
            new = "v%03d" % int(page) if page.isdigit() else key
            if new not in order: dropped[new] = sc; continue
            sc = dict(sc)
            sc["on"] = re.sub(r"^Slide \d+ of \d+", "Slide %d of %d" % (order[new] + 1, len(ids)), sc.get("on", ""))
            out[new] = sc
        deck["sections"] = {k: out[k] for k in ids if k in out}
        if dropped: deck["unused"] = {k: dropped[k] for k in sorted(dropped)}
        print(f"lesson {lesson}: {len(out)}/{len(ids)} slides scripted"
              f" ({len(ids) - len(out)} still to write)" + (f", {len(dropped)} script(s) for pages this lesson leaves out kept under \"unused\"" if dropped else ""))
    if write:
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("trainer/scripts.json written")
    else:
        print("check only — pass --write to save")

if __name__ == "__main__":
    main("--write" in sys.argv)
