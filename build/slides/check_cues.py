#!/usr/bin/env python3
"""Checks trainer/cues.json against the lessons on the built page.

    python3 build/slides/check_cues.py

Every cue key must be a slide of that lesson (a cue behind no slide is never shown), and reports how
many of each lesson's slides carry a cue card and how many set a graded deliverable.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

def slides(lesson):
    m = re.search(r"const DAY%s = \{" % lesson, page)
    if not m: return []
    end = page.find("\nconst DAY", m.start() + 10)
    return re.findall(r'"id": "([^"]+)"', page[m.start(): end if end > 0 else len(page)])

cues = json.load(open(os.path.join(ROOT, "trainer", "cues.json"), encoding="utf-8"))
bad = 0
for lesson, L in sorted(cues.items(), key=lambda kv: int(kv[0])):
    ids, secs = slides(lesson), L.get("sections") or {}
    orphan = [k for k in secs if k not in ids]
    graded = [k for k, v in secs.items() if v.get("grade")]
    print(f"lesson {lesson:>2} {L.get('lesson','')[:34]:34} {len(secs):>3}/{len(ids):>3} slides cued, {len(graded)} graded"
          + (f"  ORPHANED: {orphan}" if orphan else ""))
    bad += len(orphan)
    for k, v in secs.items():
        for field, want in (("talk", list), ("gc", list), ("keys", list), ("pitfalls", list), ("time", str), ("objective", str)):
            if field in v and not isinstance(v[field], want):
                print(f"  {k}: {field} should be {want.__name__}"); bad += 1
        for g in v.get("gc") or []:
            if not g.get("text"): print(f"  {k}: a GC block has no text"); bad += 1
print("OK" if not bad else f"{bad} problem(s)")
sys.exit(1 if bad else 0)
