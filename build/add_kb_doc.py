#!/usr/bin/env python3
"""Add a document to the Knowledge Base page (kb.html).

  python3 build/add_kb_doc.py <file> --title "Title" --summary "One or two sentences" \
      --section "Demand Phase" --tags "demand,liens,audit"

Copies the file to kb/files/ and adds (or updates) its entry in kb/docs.json.
Re-running with the same file name updates the entry instead of duplicating it.
"""
import argparse, datetime, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = os.path.join(ROOT, "kb", "files")
MANIFEST = os.path.join(ROOT, "kb", "docs.json")

ap = argparse.ArgumentParser()
ap.add_argument("file")
ap.add_argument("--title", required=True)
ap.add_argument("--summary", default="")
ap.add_argument("--section", default="General")
ap.add_argument("--tags", default="")
a = ap.parse_args()

name = re.sub(r"[^a-z0-9.]+", "-", os.path.basename(a.file).lower()).strip("-")
os.makedirs(FILES, exist_ok=True)
dest = os.path.join(FILES, name)
if os.path.abspath(a.file) != dest:
    shutil.copyfile(a.file, dest)

docs = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else []
entry = {"file": "kb/files/" + name, "title": a.title, "summary": a.summary, "section": a.section,
         "tags": [t.strip() for t in a.tags.split(",") if t.strip()],
         "added": datetime.date.today().isoformat()}
docs = [d for d in docs if d["file"] != entry["file"]] + [entry]
json.dump(docs, open(MANIFEST, "w"), indent=2, ensure_ascii=False)
open(MANIFEST, "a").write("\n")
print("Added", entry["title"], "->", entry["file"], f"({len(docs)} documents)")
