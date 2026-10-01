#!/usr/bin/env python3
"""Builds a lesson whose slides are its deck's own pages, rendered from the Canva PDF.

    pip install pymupdf pillow
    python3 build/slides/image_lesson.py vae "<deck.pdf>"     (Lesson 1)
    python3 build/slides/image_lesson.py lfc "<deck.pdf>"     (Lesson 2)
    python3 build/slides/image_lesson.py piw "<deck.pdf>"     (Lesson 3)
    python3 build/slides/image_lesson.py rec "<deck.pdf>"     (Lesson 4)
    python3 build/slides/image_lesson.py cal "<deck.pdf>"     (Lesson 5)
    python3 build/slides/image_lesson.py isr "<part1.pdf>" "<part2.pdf>"     (Lesson 6)
    python3 build/slides/image_lesson.py csr "<deck.pdf>"     (Lesson 7)
    python3 build/slides/image_lesson.py mrs "<deck.pdf>"     (Lesson 8)

For a deck whose design is the content (Virtual Assistant Essentials): each PDF page becomes one slide,
an image in ft/<deck>/slides/NNN.webp. Render from Canva's PDF, not from a PPTX: the PDF carries the
deck's fonts, so nothing reflows (a PPTX rendered without Canva's fonts spills its text out of its boxes).
Each slide's heading (for the slide list and Presenter view) is the page's largest text; its alt text is
the page's words. Its spoken script (data-say, read by ▶ Listen and Audio mode) is the page's text in reading
order, a sentence per line, with the logo and repeated text left out. Only a deck's "keep" pages go in the lesson. A deck sent in parts takes each part's PDF in
order: its pages are numbered straight through (Part 2's first page follows Part 1's last).
Output: the images and build/lessons/lessonNN.js. Run build/build.py afterwards.
"""
import html, io, json, os, re, sys
import pymupdf
from PIL import Image
pymupdf.TOOLS.mupdf_display_errors(False)   # a compressed PDF can drop a pattern or two: it still renders

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
            # Kickstart Your Legal VA Career (20), Legal Practice and Virtual Assistants with its Benefits
            # (21-24), Overview of Tasks and Roles (25-35), Types of Law Firms (36-39), Tips to Stand Out as a
            # Legal VA (134-137) and the Thank You page (138)
            "keep": {*range(1, 5), *range(20, 40), *range(134, 139)}},
    "lfc": {"id": 2, "var": "DAY2", "file": "lesson02.js", "title": "Law Firm Communication",
            "video": "https://drive.google.com/file/d/1o3LYojKAhid10ovts_umxhbWxb2j5i6l/view",
            "pdf": "LAW_FIRM_COMMUNICATION_compressed.pdf (sent in chat)",
            "about": 'the "Law Firm Communication" deck (Canva design DAGnZlfVDg0), all 54 pages',
            "headings": {**{i: 'Invoice Follow-Up Calls' for i in range(30, 36)}, 54: 'Thank You'}},
    "piw": {"id": 3, "var": "DAY3", "file": "lesson03.js", "title": "Personal Injury Process Flow",
            "video": "https://drive.google.com/file/d/1hRbuwwsTpccy0DCy7Rn90HZy_h8t4tbo/view",
            "pdf": "Personal_Injury_Workflow.pdf (sent in chat)",
            "about": 'the "Personal Injury Workflow" deck (Canva design DAHWU4bkV0I), all 25 pages',
            # each page's own title (its largest text is the role label, e.g. "Role: Intake Specialist")
            "headings": {2: 'Introduction', 3: 'Personal Injury Case Stages', 4: 'Legal Intake', 5: 'Legal Intake and Consultation', 6: 'Investigation', 7: 'Opening Claims', 8: 'Claims Set Up and Liability Determination', 9: 'Policy Limits and Coverages', 10: 'Client Communication Specialist', 11: 'Treatment', 12: 'Collecting Medical Bills and Records', 13: 'Collecting Medical Bills and Records', 14: 'Demands', 15: 'Demands', 16: 'Demands', 17: 'Settlement', 18: 'Negotiations', 19: 'Disbursement', 20: 'Litigation', 21: 'Receptionist', 22: 'Calendar Management', 23: 'Appointment Setter', 24: 'Scheduler', 25: 'Thank You'}},
    "rec": {"id": 4, "var": "DAY4", "file": "lesson04.js", "title": "Receptionist Training",
            "video": "https://drive.google.com/file/d/1W7vkDcf6FpPSDEOWcEmTylJdKNyss-1M/view",
            "pdf": "The_Receptionist_Role.pdf (sent in chat)",
            "about": 'the "The Receptionist Role" deck (Canva design DAHWU0f4UhU), all 55 pages',
            "headings": {28: 'Handling Mass Tort & Long-Duration Case Calls', 29: 'Handling Mass Tort & Long-Duration Case Calls', 51: 'Routing Calls: Cold Transfers', 52: 'Routing Calls: Warm Transfers', 53: 'Routing Calls: Conference Calls', 55: 'Thank You'}},
    "cal": {"id": 5, "var": "DAY5", "file": "lesson05.js", "title": "Calendaring & Appointment Setting Training",
            "video": "https://drive.google.com/file/d/184V9IXnd_FFSp63pSCPu3gDx_SzIusz5/view",
            "pdf": "Calendar_Management_Training_compressed.pdf (sent in chat)",
            "about": 'the "Calendar Management Training" deck (Canva design DAGnaz2Or2U), all 44 pages',
            "headings": {10: 'Step-by-Step Guide', 33: 'Time Management Strategies: The Two-Minute Rule', 35: 'Troubleshooting Common Calendar Management Challenges', 44: 'Thank You'}},
    "isr": {"id": 6, "var": "DAY6", "file": "lesson06.js", "title": "Intake Specialist Training",
            "video": "https://drive.google.com/file/d/1FPA2qhvFOe56b6A2Mcp-OFExqiaO-ZDH/view",
            "pdf": "THE_INTAKE_SPECIALIST_ROLE_Part1.pdf and _Part2.pdf (sent in chat)",
            "about": 'the "The Intake Specialist Role" deck (Canva design DAGnZhT1ZE0), Parts 1 and 2, all 105 pages',
            # Part 1 is pages 1-53, Part 2 pages 54-105
            "headings": {54: 'Key Intake Red Flags VAs Must Ask About', 55: 'Important Training Note for Legal VAs',
                         72: 'HIPAA Authorization', 75: 'HITECH Medical Records Request',
                         79: 'Consent to Release Medicare/Medicaid Information',
                         84: 'Joint Acceptance of Common Legal Representation & Waiver of Conflict of Interest',
                         94: 'ISO Claim Search Disclosure Request', 96: '3rd Party Insurance Affidavit', 105: 'Thank You'}},
    "csr": {"id": 7, "var": "DAY7", "file": "lesson07.js", "title": "Claims Specialist Training",
            "video": "https://drive.google.com/file/d/1uRyK-iR-Ja4pqmk_Nw6-Z--6hkxhR48J/view",
            "pdf": "V_Claims_Specialist_compressed.pdf (sent in chat)",
            "about": 'the "V. Claims Specialist" deck (Canva design DAHWU-Wq2mQ), all 77 pages',
            "headings": {24: 'LOR Recipients', 25: 'Case Specifics', 26: 'Case Specifics',
                         76: 'Role Flexibility Based on Client Needs', 77: 'Thank You'}},
    "mrs": {"id": 8, "var": "DAY8", "file": "lesson08.js", "title": "Medical Records Specialist Training",
            "video": "https://drive.google.com/file/d/1Wdq-wNfxvAK1J7ovjbn_ON9CrkjAKCjd/view",
            "pdf": "VI_Medical_Records_Specialist_compressed.pdf (sent in chat)",
            "about": 'the "VI. Medical Records Specialist" deck (Canva design DAGnZudb92w), all 55 pages',
            "headings": {**{i: 'Legal Compliance: Protecting Sensitive Information' for i in range(7, 20)},
                         28: 'Checklist for Requesting Bills and Records', 54: 'Remember!', 55: 'Thank You'}},
}
WORDS = {"Va": "VA", "Us": "US", "U.s.": "U.S.", "Pi": "PI", "(Dst)": "(DST)", "(Pst)": "(PST)", "(Mst)": "(MST)",
         "(Cst)": "(CST)", "(Est)": "(EST)", "(Ast)": "(AST)", "(Hst)": "(HST)", "Hawaii-aleutian": "Hawaii-Aleutian",
         "Summaries/demand": "Summaries/Demand",
         "Hipaa": "HIPAA", "Hitech": "HITECH", "Hipaa/hitech": "HIPAA/HITECH", "Iso": "ISO", "Vas": "VAs", "Phi": "PHI",
         "Lop": "LOP", "Lops": "LOPs", "Pip": "PIP", "Medlor": "MedLOR", "Dol": "DOL", "E-portal": "E-Portal"}
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

def speech(p, h):
    """The page's text as Listen reads it: its blocks top to bottom, one sentence or item per line."""
    caps = lambda t: bool(re.search(r"[A-Z]", t)) and t.upper() == t
    lines, seen, kept = [], set(), []
    def dup(sp):   # Canva draws some text twice (a shadow or outline copy a few points off): keep one copy
        t, (x0, y0, x1, y1) = sp["text"].strip(), sp["bbox"]
        for u, (a0, b0, a1, b1) in kept:
            if u == t and abs(x0 - a0) < max(6, (y1 - y0) * .6) and abs(y0 - b0) < max(6, (y1 - y0) * .6): return True
        kept.append((t, sp["bbox"])); return False
    blocks = sorted((b for b in p.get_text("dict")["blocks"] if b["type"] == 0), key=lambda b: (round(b["bbox"][1]), b["bbox"][0]))
    for b in blocks:
        text = "\n".join("".join(sp["text"] for sp in l["spans"] if sp["text"].strip() and not dup(sp)) for l in b["lines"])
        key = re.sub(r"\W+", "", text).lower()
        if not key or key in seen or key == "legalsupporthelp": continue   # a whole block drawn twice
        seen.add(key)
        cur = ""
        for l in (x.strip() for x in text.split("\n")):
            if not l: continue
            if cur and not re.search(r"[.!?:;]$", cur) and (l[:1].islower() or cur.endswith((",", "-", "–", "&"))
                                                                or caps(cur) and caps(l)): cur += ("" if re.search(r"\w-$", cur) else " ") + l   # a wrapped line, or an ALL-CAPS title over two lines
            else:
                if cur: lines.append(cur)
                cur = l
        if cur: lines.append(cur)
    joined = []
    for l in lines:
        if joined and not re.search(r"[.!?:;]$", joined[-1]) and l[:1].islower(): joined[-1] += " " + l
        else: joined.append(l)
    out = []
    for l in joined:
        if re.search(r"[A-Za-z]", l) and l.upper() == l: l = " ".join(WORDS.get(w, w) for w in title(re.sub(r"\s+", " ", l)).split(" "))
        if not out or out[-1].lower() != l.lower(): out.append(l)
    norm = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())
    acc = ""
    for k, l in enumerate(out):   # a title set in pieces (THE / MEDICAL RECORDS SPECIALIST / ROLE) reads as the whole title
        acc += norm(l)
        if not norm(h).startswith(acc): break
        if acc == norm(h): out = [h] + out[k + 1:]; break
    return "\n".join(out) or h

def main(name, *pdfs):
    D = DECKS[name]
    out_dir = os.path.join(ROOT, "ft", name, "slides")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir): os.remove(os.path.join(out_dir, f))
    pages = [p for pdf in pdfs for p in pymupdf.open(pdf)]
    z = WIDTH / pages[0].rect.width
    sections = []
    for i, p in enumerate(pages, 1):
        if "keep" in D and i not in D["keep"]: continue
        f = f"{i:03d}.webp"
        pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), alpha=False)
        Image.open(io.BytesIO(pix.tobytes("png"))).save(os.path.join(out_dir, f), "WEBP", quality=82, method=6)
        h = D["headings"].get(i) or heading(p) or f"Slide {i}"
        words = re.sub(r"\s+", " ", p.get_text()).strip()[:900] or h   # a page drawn as a picture has no words
        img = (f'<figure class="cs-page" data-say="{html.escape(speech(p, h))}"><img src="/ft/{name}/slides/{f}" alt="{html.escape(words)}" '
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
    main(sys.argv[1], *sys.argv[2:])
