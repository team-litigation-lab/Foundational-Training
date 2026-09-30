#!/usr/bin/env python3
"""Builds a lesson whose slides are its deck's own pages, rendered from the Canva PDF.

    pip install pymupdf pillow
    python3 build/slides/image_lesson.py vae "<deck.pdf>"

For a deck whose design is the content (Virtual Assistant Essentials): each PDF page becomes one slide,
an image in ft/<deck>/slides/NNN.webp. Render from Canva's PDF, not from a PPTX: the PDF carries the
deck's fonts, so nothing reflows (a PPTX rendered without Canva's fonts spills its text out of its boxes).
Each slide's heading (for the slide list and Presenter view) is the page's largest text; its alt text is
the page's words. Only a deck's "keep" pages go in the lesson.
Output: the images and build/lessons/lessonNN.js. Run build/build.py afterwards.
"""
import html, io, json, os, re, sys
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from make_lesson import title

DECKS = {
    "vae": {"id": 1, "var": "DAY1", "file": "lesson01.js", "title": "Virtual Assistant Essentials",
            "video": "https://drive.google.com/file/d/1aMGZdIwGh3uY4TdsHFomNzkgK4kRdiNr/view",
            "pdf": "https://drive.google.com/file/d/1Gq1eF0nA0wRreiMOS9VGphw721JHH3rz/view",
            "about": 'the "I. Virtual Assistant Essentials" deck (Canva design DAGtQfkdZeg)',
            # a heading the largest-text rule gets wrong (the page's section label sits at the same size)
            "headings": {46: "Specific VA Tasks in PI Firms"},
            # the deck's pages in the lesson: the title, Objective, Training Agenda and Introduction (1-4),
            # Kickstart Your Legal VA Career (20), Overview of Tasks and Roles (25-35), Types of Law Firms
            # (36-39), Tips to Stand Out as a Legal VA (134-137) and the Thank You page (138)
            "keep": {*range(1, 5), 20, *range(25, 40), *range(134, 139)}},
}
WORDS = {"Va": "VA", "Us": "US", "U.s.": "U.S.", "Pi": "PI", "(Dst)": "(DST)", "(Pst)": "(PST)", "(Mst)": "(MST)",
         "(Cst)": "(CST)", "(Est)": "(EST)", "(Ast)": "(AST)", "(Hst)": "(HST)", "Hawaii-aleutian": "Hawaii-Aleutian",
         "Summaries/demand": "Summaries/Demand"}
WIDTH = 1920

def heading(p):
    spans = [(s["size"], s["bbox"][1], s["bbox"][0], s["text"].strip())
             for b in p.get_text("dict")["blocks"] if b["type"] == 0
             for l in b["lines"] for s in l["spans"] if re.search(r"[A-Za-z]", s["text"])]
    if not spans: return ""
    m = max(x[0] for x in spans)
    parts = []
    for x in sorted((x for x in spans if x[0] >= m * 0.9), key=lambda x: (round(x[1] / 10), x[2])):
        if x[3] not in parts: parts.append(x[3])   # Canva draws some text twice
    t = title(re.sub(r"\s+", " ", " ".join(parts)).upper())
    return " ".join(WORDS.get(w, w) for w in t.split(" "))

def main(name, pdf):
    D = DECKS[name]
    out_dir = os.path.join(ROOT, "ft", name, "slides")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir): os.remove(os.path.join(out_dir, f))
    doc = pymupdf.open(pdf)
    z = WIDTH / doc[0].rect.width
    sections = []
    for i, p in enumerate(doc, 1):
        if "keep" in D and i not in D["keep"]: continue
        f = f"{i:03d}.webp"
        pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
        Image.open(io.BytesIO(pix.tobytes("png"))).save(os.path.join(out_dir, f), "WEBP", quality=82, method=6)
        h = D["headings"].get(i) or heading(p) or f"Slide {i}"
        words = re.sub(r"\s+", " ", p.get_text()).strip()[:900]
        img = (f'<figure class="cs-page"><img src="/ft/{name}/slides/{f}" alt="{html.escape(words)}" '
               f'width="{pix.width}" height="{pix.height}" loading="{"eager" if i <= 2 else "lazy"}"></figure>')
        sections.append({"id": f"v{i:03d}", "h": h, "html": f'<div class="cs cs-pages">{img}</div>'})
    js = (f"// Slides: {D['about']}, one image per page, rendered from its PDF by build/slides/image_lesson.py.\n"
          f"// PDF: {D['pdf']}\n"
          f"const {D['var']} = {{\n  id: {D['id']},\n  title: {json.dumps(D['title'])},\n  video: {json.dumps(D['video'])},\n"
          f"  deck: {json.dumps(D['pdf'])},\n  heading: {json.dumps(D['title'])},\n"
          f"  sections: {json.dumps(sections, ensure_ascii=False, indent=2)}\n}};\n")
    open(os.path.join(ROOT, "build", "lessons", D["file"]), "w", encoding="utf8").write(js)
    print(f"{D['file']}: {len(sections)} slides, images in ft/{name}/slides/")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
