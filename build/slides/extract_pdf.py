"""Extracts a Canva deck downloaded as PDF into build/slides/<deck>.json, like extract_pptx.py does for PPTX.

    pip install pymupdf
    python3 build/slides/extract_pdf.py <deck.pdf> <deck>

Each page becomes {"key": "pNN", "boxes": [[line, …], …], "notes": ""}: one box per text block, in
reading order, with the block's lines as they wrap on the slide (the layouts in make_lesson.py join
them back into sentences and list items). Canva draws some text twice (shadows and outlines); those
copies are dropped. A PDF carries no speaker notes, so "notes" is empty.
"""
import json, os, re, sys
import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))

def page(p):
    seen, boxes = set(), []
    for b in p.get_text("dict")["blocks"]:
        if b["type"] != 0: continue
        lines = [re.sub(r"\s+", " ", "".join(s["text"] for s in l["spans"])).strip() for l in b["lines"]]
        lines = [t for t in lines if t]
        key = ("|".join(lines), round(b["bbox"][0] / 8), round(b["bbox"][1] / 8))
        if not lines or key in seen: continue
        seen.add(key)
        boxes.append((round(b["bbox"][1]), round(b["bbox"][0]), lines))
    return [l for y, x, l in sorted(boxes)]

def main(pdf, deck):
    d = pymupdf.open(pdf)
    out = [{"key": f"p{i + 1:02d}", "boxes": page(p), "notes": ""} for i, p in enumerate(d)]
    json.dump(out, open(os.path.join(HERE, deck + ".json"), "w"), ensure_ascii=False, indent=1)
    print(f"{deck}.json: {len(out)} pages")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
