#!/usr/bin/env python3
"""Builds a native lesson (one slide per deck page, the deck's exact wording) from its extracted
Canva pages.

    python3 build/slides/make_lesson.py claims

Input:  build/slides/<name>.json  (one entry per deck page: {"key", "boxes": [[paragraph, …], …], "notes"})
        made from the deck's one-page PPTX exports by build/slides/extract_pptx.py.
Output: build/lessons/lessonNN.js (the lesson's sections)

Each page's layout is written below as a small function that places the page's own text blocks
(b[i] = the i-th text box, a list of its paragraphs). Nothing is retyped, so the wording is the deck's.
The components are styled by js/ft-slides.js. Run build/build.py afterwards.
"""
import json, os, re, sys, html

B = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(B))

def esc(t): return html.escape(t, quote=False)
WORDS = {"TNC": "TNC", "TNCS": "TNCs", "UBER/LYFT": "Uber/Lyft"}  # mixed-case words an ALL-CAPS title loses
ACR = {"LOR","PIP","UM","UIM","BI","MVA","CSL","1P","3P","PR","SLP","CDW","VIN","CRM","UM/UIM","PIP/1P","3P/BI","LOA/LOD","MVC","ID"}
def title(t):
    """ALL-CAPS deck titles read as Title Case on the slide heading (acronyms stay as they are)."""
    if t.upper() != t: return t
    small = {"a","an","the","of","in","on","to","for","and","or","by","vs","with"}
    out = []
    for i, w in enumerate(t.split(" ")):
        core = re.sub(r"[^A-Za-z0-9/]", "", w)
        if core.upper() in WORDS: out.append(w.replace(core, WORDS[core.upper()])); continue
        if core.upper() in ACR or re.fullmatch(r"\(?[A-Z0-9/]{1,4}\)?[:,.]?", w) and core.upper() in ACR: out.append(w); continue
        lw = w.lower()
        out.append(lw if i and core.lower() in small else lw[:1].upper() + lw[1:] if lw[:1].isalpha() else lw[:1] + lw[1:2].upper() + lw[2:])
    return " ".join(out)

# ---------- components ----------
def label(t): return f'<div class="cs-label">{esc(t)}</div>'
def lead(t): return f'<p class="cs-lead">{t if t.startswith("<") else esc(t)}</p>'
def sub(t): return f'<div class="cs-sub">{esc(t)}</div>'
def ul(items, cls=""): return f'<ul class="cs-list {cls}">' + "".join(f"<li>{i if i.startswith('<') else esc(i)}</li>" for i in items) + "</ul>"
def card(ic, head, body=None, items=None, cls="", tag=None):
    h = f'<div class="cs-card {cls}">'
    if ic: h += f'<div class="cs-ic">{ic}</div>'
    if tag: h += f'<span class="cs-tag{" o" if "o" in (tag[1:] if isinstance(tag, tuple) else "") else ""}">{esc(tag[0] if isinstance(tag, tuple) else tag)}</span>'
    if head: h += f"<b>{esc(head)}</b>"
    if body: h += f"<p>{body if body.startswith('<') else esc(body)}</p>"
    if items: h += "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"
    return h + "</div>"
def grid(cards, cols=""): return f'<div class="cs-grid {cols}">' + "".join(cards) + "</div>"
def flow(steps): return '<ol class="cs-flow">' + "".join(f"<li>{esc(s[0]) if isinstance(s, tuple) else esc(s)}{f'<span>{esc(s[1])}</span>' if isinstance(s, tuple) else ''}</li>" for s in steps) + "</ol>"
def tip(t): return f'<div class="cs-tip"><div>{t if t.startswith("<") else esc(t)}</div></div>'
def warn(t): return f'<div class="cs-warn"><div>{t if t.startswith("<") else esc(t)}</div></div>'
def note(t): return f'<div class="cs-note"><div>{t if t.startswith("<") else esc(t)}</div></div>'
def do(head, items): return f'<div class="cs-do"><b>{esc(head)}</b><ul>' + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul></div>"
def dont(head, items): return f'<div class="cs-dont"><b>{esc(head)}</b><ul>' + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul></div>"
def split(*parts): return '<div class="cs-split">' + "".join(parts) + "</div>"
def div(*parts): return "<div>" + "".join(parts) + "</div>"
def table(head, rows): return '<div class="cs-tablewrap"><table class="cs-table"><tr>' + "".join(f"<th>{esc(h)}</th>" for h in head) + "</tr>" + "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in rows) + "</table></div>"
def fig(srcs, cap=None):
    imgs = "".join(f'<figure class="cs-fig"><img src="{s}" alt="{esc(cap or "")}" loading="lazy"></figure>' for s in srcs)
    return f'<div class="cs-figs">{imgs}</div>' + (f'<div class="cs-sub" style="text-align:center;text-transform:none;letter-spacing:0;font-weight:600;color:var(--ink-soft);">{esc(cap)}</div>' if cap else "")
def hero(lab, big, text=None): return f'<div class="cs-hero">{label(lab) if lab else ""}<div class="cs-big">{esc(big)}</div>{f"<p>{esc(text)}</p>" if text else ""}</div>'
def kv(t):
    """'Term – description' → bold term (the deck's own dash split)."""
    m = re.match(r"^(.+?)\s+[–-]\s+(.*)$", t)
    return f"<b>{esc(m.group(1))}</b> – {esc(m.group(2))}" if m else esc(t)
def headed(x, ic=None, cls="accent"):
    """A text box whose first line is its heading ('🔍 Key Points:') and the rest its points."""
    return card(ic, x[0], items=x[1:], cls=cls)
def tbl(x, n):
    """A table exported as one flat list of cells: n header cells, then the rows."""
    return table(x[:n], [x[i:i+n] for i in range(n, len(x) - len(x[n:]) % n, n)])
def tfig(srcs, cap=None):
    """Real documents with personal details: served from /trainer/ (trainers only, never public).
    They show in the trainer's own windows (Presenter view, the slides window); anyone else sees a note."""
    ph = "<div class=&quot;cs-note&quot;><div>🔒 A real document example: your trainer shows it during the session.</div></div>"
    imgs = "".join(f'<figure class="cs-fig"><img src="{s}" alt="{esc(cap or "")}" loading="lazy" onerror="this.closest(\'.cs-figs\').outerHTML=\'{ph}\'"></figure>' for s in srcs)
    return f'<div class="cs-figs">{imgs}</div>' + (f'<div class="cs-sub" style="text-align:center;text-transform:none;letter-spacing:0;font-weight:600;color:var(--ink-soft);">{esc(cap)}</div>' if cap else "")
def cover(lines, img, doc):
    """The deck's correspondence slides: its title on the photo (logo top left) beside the document in an
    orange frame. The document is a real one, so it goes through tfig (trainers only)."""
    big = "<br>".join(esc(l) for l in lines)
    return (f'<div class="cs-cover"><div class="cs-hero photo" style="--img:url({IMG}{img})">'
            f'<img class="cs-logo" src="{IMG}lsh-logo.png" alt="Legal Support Help"><div class="cs-big caps">{big}</div></div>'
            f'<div class="cs-doc">{tfig([doc], None)}</div></div>')
def S(h, *parts, lab=None): return {"h": h, "html": '<div class="cs">' + (label(lab) if lab else "") + "".join(parts) + "</div>"}

# ---------- Claims Specialist Training (lesson 7) ----------
IMG = "/ft/claims/img/"
def claims_pages():
    P = {}
    P["n002"] = lambda b: S(title(b[0][0]), hero(b[0][0], b[1][0]))
    P["n003"] = lambda b: S(title(b[1][0]), flow([b[6][0], b[0][0], b[2][0], " ".join(b[3]), b[4][0], b[5][0]]))
    def p4(b):
        def c(t):
            tag, rest = re.match(r"^(\S+ ?\([^)]*\))\s*-\s*(.*)$", t).groups()
            cov, who = [x.strip() for x in re.split(r"-\s*", rest, maxsplit=1)]
            return card("🛡" if tag.startswith("3P") else "👤", cov, who, tag=(tag, "o" if tag.startswith("1P") else ""))
        return S(title(b[1][0]), lead(b[2][0]), sub(b[3][0]), grid([c(b[i][0]) for i in (4, 5, 6, 7, 8)] + [card("🏢", None, b[9][0], cls="soft")], "c3"), lab=b[0][0])
    P["n004"] = p4
    P["n005"] = lambda b: S(title(b[0][0]), lead(b[1][0]), sub(b[2][0]), grid([card(ic, None, t) for ic, t in zip("📞🏢🔎🚗", b[2][1:])]), lab=b[3][0])
    P["n007"] = lambda b: S(title(b[0][0]), lead(b[1][0]), tip("<b>Tip:</b> " + esc(b[2][0][len("Tip: "):]) if b[2][0].startswith("Tip: ") else b[2][0]), lab=b[3][0])
    P["n008"] = lambda b: S(title(b[0][0]), sub(b[1][0]), grid([card("🗂", b[2][0], items=b[2][1:], cls="accent"), card("🚗", b[3][0], items=b[3][1:], cls="accent")], "c2"), lab=b[4][0])
    P["n009"] = lambda b: S(title(b[0][0]), sub(b[1][0]), grid([card("🩺", b[2][0], items=b[2][1:], cls="accent"), card("📄", b[3][0], items=b[3][1:], cls="accent"), card("📍", b[4][0], items=b[4][1:], cls="accent")], "c3"), lab=b[5][0])
    def p10(b):
        first = b[1][0]
        first = "The facts of loss refer to what" + first[len("THE FACTS OF LOSS REFER TO WHat"):] if first.startswith("THE FACTS OF LOSS REFER TO WHat") else first
        second = b[2][0]
        second = "However" + second[len("HOWEVER"):] if second.startswith("HOWEVER") else second
        return S(title(b[3][0]), lead(first), sub(second), grid([card(ic, None, t, cls="soft") for ic, t in zip(["🗣", "🎥", "📸", "🌦", "🏢"], b[2][1:])], "c3"), lab=b[4][0] + " · " + b[0][0])
    P["n010"] = p10
    P["n011"] = lambda b: S(title(b[1][0]), lead(b[2][0]), note(f"<b>{esc(b[3][0])}</b><br>{esc(b[3][1])}"), lab=b[4][0] + " · " + b[0][0])
    def p13(b):
        groups = [("Client and Insurance Information", "#E3F2E7", ["3P Insurance Policy:", "1P Insurance Policy:", "Claimant Name:"]),
                  ("Accident Details (Facts of Loss)", "#FBEDE2", ["Date of Loss:", "Time of Loss:", "# of Vehicles:", "# of Passengers in Client's Vehicle (Cite Minors):", "# of Passengers in Defendant's Vehicle (Cite Minors):", "Cross Street and State:"]),
                  ("Police Report and Witnesses", "#FFF4D6", ["Police Report (Y/N):", "Police Department:", "Incident Number:", "Accident Details (What Happened?):", "Witnesses (Y/N):"]),
                  ("Injuries and Medical Treatment", "#E3F1FA", ["Ambulance Transporation (Y/N):", "Hospital Destination:", "Currently Treating? (Y/N):", "Providers providing treatment:", "Injuries:"]),
                  ("Vehicle Information", "#EAF5DD", ["Client's Vehicle (Year, Make and Model):", "Vehicle Drivable?:", "Indicate the Damages on the Vehicle:", "Defendant's Name, Vehicle Year, Make and Model:"])]
        rows = "".join(f'<tr><td colspan="2" style="background:{c};color:var(--navy);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;">{esc(g)}</td></tr>' + "".join(f'<tr><td style="background:#fff;">{esc(f)}</td><td style="background:#fff;color:#B6BCCB;">…</td></tr>' for f in fields) for g, c, fields in groups)
        return S(title(b[1][0]), f'<div class="cs-tablewrap"><table class="cs-table"><tr><th colspan="2">MVA QUESTIONNAIRE</th></tr>{rows}</table></div>', lab=b[2][0] + " · " + b[0][0])
    P["n013"] = p13
    P["n014"] = lambda b: S(title(b[1][0]), lead(b[0][0]), note(b[0][1]), tip(b[0][2]), lab=b[2][0])
    P["n015"] = lambda b: S(title(b[1][0]), grid([card("1", b[2][0], b[0][0], cls="accent"), card("2", b[3][0], b[4][0], cls="accent"), card("3", b[5][0], b[6][0], items=b[6][1:], cls="accent")], "c3"), lab=b[7][0])
    P["n016"] = lambda b: S(title(b[1][0]), lead(b[2][0]), grid([card("4", b[0][0], b[3][0], items=b[3][1:], cls="accent"), card("5", b[4][0], b[5][0], items=b[5][1:], cls="accent")], "c2"), note(b[6][0]), lab=b[7][0])
    P["n017"] = lambda b: S(title(b[0][0]), grid([card("⏰", None, b[1][0]), card("🔁", None, b[2][0]), card("🚫", None, b[3][0], cls="dark"), card("✅", None, b[4][0]), card("💲", None, b[5][0])], "c3"), lab=b[6][0])
    def p18(b):
        x = b[1]; k = x.index("Additionally:")
        return S(title(b[0][0]), lead(x[0]), split(div(ul(x[1:k])), div(sub(x[k]), ul(x[k+1:], "dot"))), lab=b[2][0])
    P["n018"] = p18
    def p19(b):
        x = b[2]
        return S(title(b[0][0]), lead(b[1][0]), split(do(x[0], [x[1]]), dont(x[2], [x[3], x[4]])), note(x[5]), lab=b[3][0])
    P["n019"] = p19
    def p20(b):
        x = b[1]
        return S(title(b[2][0]), lead(b[0][0]), sub(x[0].lstrip("🔹 ")), f"<p>{esc(x[1])}</p>",
                 grid([card("⚖️", x[2], x[3], cls="accent"), card("🕊", x[4], x[5], cls="accent")], "c2"), do(x[6], [x[7]]), lab=b[3][0])
    P["n020"] = p20
    def p21(b):
        x = b[0]
        return S(title(b[1][0]), sub(x[0].lstrip("🔹 ")), f"<p>{esc(x[1])}</p>",
                 grid([card(ic, t) for ic, t in zip(["💼", "🤝", "🕯"], x[2:5])], "c3"), do(x[5], [x[6]]), lab=b[2][0])
    P["n021"] = p21
    P["n022"] = lambda b: S(title(b[2][0]), grid([card("📨", None, b[0][0], cls="dark"), card("📝", None, b[1][0], cls="soft")], "c2"))
    P["n023"] = lambda b: S(title(b[2][0]), lead(b[0][0]), note(b[1][0]))
    P["n024"] = lambda b: S(title(b[0][0]), grid([card(ic, b[i][0]) for ic, i in zip(["🛡", "⚖️", "🏥", "🏢", "🚙", "🏦", "👮", "🚚", "🔄"], range(1, 10))], "c3"), lab=b[10][0])
    P["n026"] = lambda b: S(title(b[3][0]), grid([card("🐕", None, b[0][0], cls="accent"), card("🏛", None, b[1][0], cls="accent")], "c2"), ul(b[4], "dot"), lab=b[2][0])
    P["n027"] = lambda b: S(title(b[0][0]), sub("🔹 Notice of Claim Requirements by State (Examples)"), table(["State", "Statute / Form Name", "Filing Deadline", "Filed With", "Notes"], [
        ["California", "Government Claim Form (Gov. Code § 910)", "6 months", "State/local entity involved", "Must use specific form; claim must be denied before filing suit"],
        ["New York", "Notice of Claim (General Municipal Law § 50-e)", "90 days", "Local entity (e.g., city, county)", "Required for claims against municipalities and school districts"],
        ["Texas", "Texas Tort Claims Act – Notice of Claim (Civ. Prac. & Rem. Code § 101.101)", "6 months (some cities have shorter limits like 45-90 days)", "Relevant agency or city", "Strict deadlines; some municipalities have their own notice rules"],
        ["Arizona", "Notice of Claim (A.R.S. § 12-821.01)", "180 days", "Appropriate public entity", "Must include specific settlement amount and supporting facts"],
        ["Illinois", "Court of Claims Act (705 ILCS 505/22)", "1 year", "Illinois Court of Claims", "Must file with both Court and Attorney General"],
        ["Colorado", "Colorado Governmental Immunity Act (C.R.S. § 24-10-109)", "182 days (about 6 months)", "Governing body of the public entity", "Must include nature and location of injury and damages sought"],
        ["Georgia", "Georgia Tort Claims Act (O.C.G.A. § 50-21-26)", "1 year", "Risk Management Division", "Applies to state (not local) claims; local governments may have different rules"],
        ["Oregon", "Oregon Tort Claims Act Notice (ORS § 30.275)", "180 days", "Appropriate public agency", "Formal written notice required"],
        ["Washington", "Standard Tort Claim Form (RCW § 4.92.100 & § 4.96.020)", "3 years (but must file form first)", "State Office of Risk Management or local agency", "Mandatory use of state-provided forms"],
        ["Nevada", "NRS Chapter 41 (Notice of Claim)", "2 years", "State/local agency", "Informal notice allowed, but formal claim helps preserve rights"]]))
    P["n028"] = lambda b: S(title(b[1][0]), flow([b[2][0], b[3][0], b[4][0]]), split(do("Adjuster known", [b[5][0]]), note(f"<b>{esc(b[6][0])}</b> {esc(b[6][1])}")), lab=b[0][0])
    P["n029"] = lambda b: S(title(b[2][0]), grid([card("1", None, items=b[0], cls="accent"), card("2", None, b[1][0], cls="accent"), card("3", None, b[4][0], cls="accent"), card("4", None, b[5][0], cls="accent")]), lab=b[3][0])
    P["n030"] = lambda b: S(title(b[2][0]), grid([card("5", None, b[0][0], cls="accent"), card("6", None, b[1][0], cls="accent"), card("7", None, b[4][0], cls="accent")], "c3"), lab=b[3][0])
    P["n031"] = lambda b: S(title(b[1][0]), lead(b[0][0]), ul(b[2]))
    P["n032"] = lambda b: S(title(b[1][0]), lead(b[0][0]), tip(b[2][0]))
    P["n033"] = lambda b: S(title(b[1][0]), sub(b[0][0]), grid([card(ic, t, cls="accent") for ic, t in zip(["📑", "🛡", "💲"], b[0][1:])], "c3"))
    P["n034"] = lambda b: S(title(b[1][0]), lead(b[0][0]), grid([card(ic, t, cls="soft") for ic, t in zip(["🚓", "🩺", "✍️"], b[0][1:])], "c3"))
    P["n035"] = lambda b: S(title(b[1][0]), hero(None, title(b[1][0]), b[0][0]))
    P["n036"] = lambda b: S(title(b[1][0]), lead(kv(b[0][0])), sub(b[0][1]), ul(b[0][2:], "num two"))
    P["n037"] = lambda b: S(title(b[0][0]), fig([IMG + "decpage-1a.png", IMG + "decpage-1b.png"], "Here is an example of the Dec pages"))
    P["n038"] = lambda b: S(title(b[0][0]), fig([IMG + "decpage-2a.png", IMG + "decpage-2b.png"], "Here's the rest of the document - notice that the page contains the policy limits"))
    P["n039"] = lambda b: S(title(b[0][0]), sub(b[1][0].capitalize()), ul([kv(b[2][0]) + "<br>" + esc(b[2][1]), kv(b[3][0]), kv(b[4][0])]), lab=b[5][0])
    P["n041"] = lambda b: S(title(b[1][0]), ul([kv(t) for t in b[0]]))
    P["n042"] = lambda b: S(title(b[6][0]), grid([card("💵", b[1][0], b[4][0], cls="accent"), card("🧑‍🤝‍🧑", b[2][0], b[5][0], cls="accent"), card("➕", b[3][0], b[0][0], cls="accent")], "c3"))
    P["n043"] = lambda b: S(title(b[0][0]), grid([card("🤕", b[4][0], b[1][0], cls="dark"), card("🚗", b[5][0], b[2][0], cls="dark"), card("🩺", " ".join(b[6]), b[3][0], cls="dark")], "c3"))
    P["n044"] = lambda b: S(title(b[4][0]), grid([card("🌩", b[2][0], b[0][0], cls="dark"), card("💥", b[3][0], b[1][0], cls="dark")], "c2"))
    P["n045"] = lambda b: S(title(b[3][0]), grid([card("👤", b[1][0], b[0][0], cls="accent"), card("🛡", b[2][0], items=[b[4][0], b[5][0]], cls="accent")], "c2"))
    P["n046"] = lambda b: S(title(b[1][0]), lead(b[0][0]), f"<p>{esc(b[0][1])}</p>", sub(b[2][0]),
                           grid([card("👤", b[3][0], b[5][0], cls="dark"), card("🚗", b[4][0], b[7][0], cls="dark"), card("📅", b[6][0], b[8][0], cls="dark"), card("🧮", b[9][0], b[10][0], cls="dark")]), lab=b[11][0])
    def p47(b):
        t = b[0]; x = b[1]
        return S(title(" ".join(b[2])), table([t[0], t[1]], [[t[2], t[3]], [t[4], t[5]], [t[6], t[7]]]), note(x[0]),
                 f'<div class="cs-stat"><span><small>{esc(x[1])}</small>{esc(x[2])}</span></div><p style="color:var(--ink-soft);font-size:14px;">{esc(x[3])}</p>', lab=b[3][0])
    P["n047"] = p47
    P["n001"] = lambda b: S(title(b[0][0]), hero("LSH Foundational Training", title(b[0][0]), title(b[1][0])))
    P["n025"] = lambda b: S(title(b[0][0]), lead(b[1][0]), grid([card("🏬", None, b[1][1], cls="accent"), card("📋", None, b[1][2], cls="accent")], "c2"), lab=b[2][0])
    P["n048"] = lambda b: S(title(" ".join(b[0])), lead(b[2][0]), f'<div class="cs-stat"><span><small>🧩 Example</small>{esc(b[3][0].split(": ",1)[1])}</span></div>', ul(b[4]), lab=b[1][0])
    P["n049"] = lambda b: S("CSL vs Per Person / Per Accident", split(div(sub(b[0][0]), fig([IMG + "csl-example.png"])), div(sub(b[1][0]), fig([IMG + "split-limits-example.png"]))), lab=b[2][0])
    P["n050"] = lambda b: S(title(b[2][0]), lead(b[1][0]), table(["Limit Type", "Amount", "What It Means:"], [["Per occurrence", "$1,000,000", "Max for one incident (e.g., customer slips and falls)"], ["Aggregate limit", "$2,000,000", "Max for all claims combined during policy year"]]), headed(b[3], cls="soft"), lab=b[4][0])
    def p51(b):
        x = b[2]; k = x.index("You recover:")
        return S(title(b[1][0]), lead(b[0][0]), split(headed(x[:k], cls="soft"), card("💰", x[k], items=x[k+1:-1], cls="dark")), tip(x[-1]), lab=b[3][0])
    P["n051"] = p51
    P["n052"] = lambda b: S(b[1][0], headed(b[3], "🔍", "soft"), tip(f"<b>{esc(b[4][0])}</b> {esc(' '.join(b[4][1:]))}"), lab=b[0][0])
    P["n053"] = lambda b: S(b[2][0].replace("🧠 ", ""), lead(b[1][0]), sub(b[3][0]), ul(b[3][1:], "num"), lab=b[0][0])
    P["n054"] = lambda b: S(b[2][0], card("🎯", b[1][0], b[1][1], cls="dark"), card("🔍", b[3][0], b[3][1], items=b[3][2:], cls="accent"), lab=b[0][0])
    P["n055"] = lambda b: S(b[2][0], tbl(b[0], 2), lab=b[1][0])
    P["n056"] = lambda b: S(b[2][0], headed(b[0], None, "soft"), flow([b[3][0], b[4][0], b[5][0]]), lab=b[1][0])
    P["n057"] = lambda b: S(b[2][0], card(None, b[0][0], b[0][1], items=b[0][2:], cls="accent"), lab=b[1][0])
    P["n058"] = lambda b: S(b[2][0], card(None, b[0][0], b[0][1], items=b[0][2:], cls="accent"), lab=b[1][0])
    P["n059"] = lambda b: S(b[2][0], headed(b[0], None, "dark"), lab=b[1][0])
    P["n060"] = lambda b: S(b[1][0], card("📝", None, b[2][0], items=b[2][1:], cls="accent"), tip(f"<b>{esc(b[3][0].replace('🧠 ', ''))}</b> {esc(' '.join(b[3][1:]))}"), lab=b[0][0])
    P["n061"] = lambda b: S(b[1][0], lead(b[2][0]), f"<p>{esc(b[3][0])}</p>", grid([card("⚖️", b[4][0], b[5][0], cls="dark"), card("📐", b[6][0], b[7][0], cls="dark")], "c2"), lab=b[0][0])
    P["n062"] = lambda b: S(b[1][0], split(do("✅ " + b[2][0], b[2][1:]), dont("⚠️ " + b[3][0], b[3][1:])), lab=b[0][0])
    P["n063"] = lambda b: S(b[1][0], warn(b[3][0]), sub(b[4][0].replace("⚠️ ", "")), ul([f"<b>{esc(t.split(': ',1)[0])}:</b> {esc(t.split(': ',1)[1])}" for t in b[4][1:]]), lab=b[0][0])
    P["n064"] = lambda b: S(b[2][0].replace("🔍 ", ""), tbl(b[0], 2), lab=b[1][0])
    P["n065"] = lambda b: S(b[1][0], tip(b[2][0]), headed(b[3], None, "soft"), lab=b[0][0])
    P["n066"] = lambda b: S(b[1][0], split(card("🚫", b[3][0].replace("🚫 ", ""), b[3][1], items=b[3][2:], cls="accent"), card("🧠", b[4][0].replace("🧠 ", ""), b[4][1], items=b[4][2:], cls="dark")), lab=b[0][0])
    P["n067"] = lambda b: S(b[1][0], sub(b[3][0].replace("🔍 ", "")), flow([(b[4][i], b[4][i+1]) for i in range(0, len(b[4]), 2)]), lab=b[0][0])
    P["n068"] = lambda b: S(b[2][0], warn(b[4][0]), tbl(b[0], 2), lab=b[1][0])
    def p69(b):
        x = b[3]
        # the deck numbers steps 2–4 and not the first; each step's heading is followed by its points
        heads = [i for i, t in enumerate(x) if i == 1 or re.match(r"^\d\.\s*\S", t)]
        cards_ = []
        for n, i in enumerate(heads):
            j = heads[n+1] if n + 1 < len(heads) else len(x)
            h = re.sub(r"^\d\.\s*", "", x[i])
            body = x[i+1:j]
            cards_.append(card(str(n+1), h, items=body, cls="accent"))
        return S(b[1][0], sub(x[0].replace("🔧 ", "")), grid(cards_), lab=b[0][0])
    P["n069"] = p69
    P["n070"] = lambda b: S(b[1][0], lead(b[3][0].replace("🎯 ", "")), headed(b[4], "🧠", "soft"), *[headed(x, None, "accent") for x in b[5:]], lab=b[0][0])
    def p71(b):
        x = b[3]
        g = lambda a, z: x[x.index(a)+1:x.index(z)] if z else x[x.index(a)+1:]
        return S(b[1][0], sub(x[0]), card("🎯", x[1].rstrip(":"), x[2], cls="dark"), sub(x[3]),
                 grid([card("🔁", x[4], items=x[5:7], cls="accent"), card("✍️", x[9], items=x[10:12], cls="accent")], "c2"),
                 tip(f"<b>{esc(x[7])}</b> {esc(x[8])}"), note(f"<b>{esc(x[12])}</b> {esc(x[13])}"), lab=b[0][0])
    P["n071"] = p71
    P["n072"] = lambda b: S(b[1][0], warn(f"<b>{esc(b[3][0].replace('⚠️ ', ''))}</b> {esc(b[3][1])}"), ul(b[3][2:], "num"), lab=b[0][0])
    P["n073"] = lambda b: S(title(b[0][0]), sub(b[1][0].replace("🔍", "🔍 ")), grid([card(ic, t.split(" – ")[0], t.split(" – ")[1], cls=c) for ic, t, c in zip(["✅", "❌", "🛡", "🚫"], b[2], ["dark", "soft", "dark", "soft"])], "c2"))
    P["n074"] = lambda b: S(title(b[0][0]), sub(b[1][0].replace("🔍", "🔍 ")), grid([card("❌", b[2][0], b[2][1], cls="accent"), card("🚫", b[3][0], b[3][1], cls="accent")], "c2"), card("⚠️", title(b[4][0]), items=b[4][1:], cls="soft"))
    P["n075"] = lambda b: S(title(b[2][0]), card("🚗", b[1][0], b[1][1], cls="dark"), lab=b[0][0])
    P["n076"] = lambda b: S(title(b[1][0]), grid([card(None, b[0][0].replace("🕒 ", "🕒 "), items=b[2], cls="soft"), card(None, b[3][0], items=b[4], cls="accent")], "c2"), lab=b[5][0])
    P["n077"] = lambda b: S(title(b[1][0]), grid([card(None, b[0][0], items=b[2], cls="accent"), card(None, b[3][0], items=b[4], cls="dark")], "c2"), lab=b[5][0])
    P["n078"] = lambda b: S(title(b[0][0]), ul(b[1]), lab=b[2][0])
    P["n079"] = lambda b: S(title(b[1][0]), card("🛡", b[0][0], items=[t.lstrip("•") for t in b[0][1:3]], cls="dark"), note(b[0][3]), lab=b[2][0])
    P["n080"] = lambda b: S(title(b[1][0]), grid([card("🚗", b[0][0], b[0][1].lstrip("•"), cls="accent"), card("❓", b[0][2], b[0][3].lstrip("•"), cls="accent")], "c2"), note(b[0][4]), lab=b[2][0])
    def p81(b):
        steps = sorted([b[i][0] for i in (1, 2, 3, 4)], key=lambda t: int(t.split(".")[0]))
        return S(title(b[0][0]), flow([re.sub(r"^\d\.\s*", "", t) for t in steps]))
    P["n081"] = p81
    P["n082"] = lambda b: S(title(b[2][0]), sub(b[1][0]), ul(b[0], "two"))
    P["n083"] = lambda b: S(title(b[0][0]), flow([b[i][0] for i in range(1, 6)]))
    P["n084"] = lambda b: S(title(b[0][0]), sub(b[1][0]), grid([card(ic, b[i][0], b[i][1], cls="accent") for ic, i in zip(["👤", "🏢", "⚖️", "➕"], range(2, 6))]))
    P["n085"] = lambda b: S(b[0][0], sub(b[1][0]), grid([card("🏢", b[2][0], items=b[2][1:], cls="soft"), card("👤", b[4][0], items=b[3], cls="accent")], "c2"), note(b[5][0]))
    def statute(b, state, pairs, lab):
        return S(title(state), grid([card(ic, h, t, cls="accent") for ic, (h, t) in zip(["🩺", "🥇", "🏢"], pairs)], "c3"), lab=lab)
    P["n086"] = lambda b: statute(b, b[0][0], [(b[2][0], " ".join(b[3])), (b[4][0], b[5][0]), (b[6][0], b[7][0])], b[1][0])
    P["n087"] = lambda b: statute(b, b[7][0], [(b[0][0], b[1][0]), (b[2][0], b[3][0]), (b[4][0], b[5][0])], b[6][0])
    P["n088"] = lambda b: statute(b, b[7][0], [(b[0][0], b[1][0]), (b[2][0], b[3][0]), (b[4][0], b[5][0])], b[6][0])
    P["n089"] = lambda b: statute(b, b[0][0], [(b[1][0], b[2][0]), (b[3][0], b[4][0]), (b[5][0], b[6][0])], b[7][0])
    P["n090"] = lambda b: S(title(b[0][0]), lead(b[1][0]), split(card("🧾", title(b[3][0]), items=b[4], cls="dark"), card("💡", b[5][0], b[5][1], cls="soft")), lab=b[2][0])
    P["n092"] = lambda b: S(title(b[0][0]), grid([card("📍", title(b[i][0]), items=b[j], cls="dark") for i, j in ((4, 1), (5, 2), (6, 3))], "c3"))
    P["n093"] = lambda b: S(title(b[0][0]), lead(b[1][0]), f"<p>{esc(b[1][1])}</p>", sub(b[1][2]), flow([tuple(t.split(": ", 1)) for t in b[1][3:]]), lab=b[2][0])
    P["n094"] = lambda b: S(title(b[0][0]), lead(b[1][0]), f"<p>{esc(b[1][1])}</p>", sub(b[1][2]), flow([tuple(b[1][3].split(": ", 1))]), lab=b[2][0])
    P["n095"] = lambda b: S(title(b[2][0]), card("🩺", b[0][0], items=b[0][1:3], cls="accent"), card("🏢", b[0][3], items=b[0][4:6], cls="soft"), lab=b[1][0])
    P["n096"] = lambda b: S(title(b[2][0]), card("🔄", b[0][0], b[0][1], cls="dark"), lab=b[1][0])
    P["n097"] = lambda b: S(title(b[0][0]), cover(b[0], "rental-keys.jpg", "/trainer/img/claims/rental-claims-letter.png"))
    P["n098"] = lambda b: S(title(" ".join(b[0])), tfig(["/trainer/img/claims/rental-agreement-1.png"], "Here is an example of Enterprise Rental Agreement"))
    P["n099"] = lambda b: S(title(" ".join(b[0])), tfig(["/trainer/img/claims/rental-agreement-2.png"], "Here is an example of Enterprise Rental Agreement"))
    def practice(b, text_i, head_i, lab_i):
        x = b[text_i]
        return S(title(b[head_i][0].split(" ", 1)[1]), card(b[head_i][0].split(" ", 1)[0], None, x[0], items=x[1:], cls="dark"), lab=b[lab_i][0] + " · Claims Specialist")
    P["n100"] = lambda b: practice(b, 0, 2, 1)
    P["t151649.387"] = lambda b: practice(b, 0, 3, 1)
    P["t151655.924"] = lambda b: practice(b, 0, 2, 1)
    P["t151702.080"] = lambda b: practice(b, 0, 2, 1)
    P["t151710.938"] = lambda b: practice(b, 0, 2, 1)
    P["t151715.508"] = lambda b: S(title(b[1][0]), hero(None, title(b[1][0]), b[0][0]))
    P["t151722.466"] = lambda b: S(title(b[1][0]), sub(b[0][0].replace("⚠️ ", "")), grid([card(ic, None, t, cls="accent") for ic, t in zip(["📵", "⚖️", "🛡", "🩺", "🔎"], b[0][1:])], "c3"))
    P["t151730.614"] = lambda b: S(title(b[3][0]), lead(b[0][0]), note(b[1][0]), lab=b[2][0])
    P["t151738.994"] = lambda b: S(title(b[3][0]) + " – " + title(b[2][0]), grid([card("1", None, b[1][0], cls="accent"), card("2", None, b[0][0], cls="accent")], "c2"), lab=b[2][0])
    P["t151750.011"] = lambda b: S(title(b[3][0]) + " – " + title(b[2][0]), grid([card("3", None, b[1][0], cls="accent"), card("4", None, b[0][0], cls="accent")], "c2"), lab=b[2][0])
    P["t151755.399"] = lambda b: S(title(b[3][0]) + " – " + title(b[2][0]), grid([card("📬", None, b[1][0], cls="accent"), card("🗂", None, b[0][0], cls="dark")], "c2"), lab=b[2][0])
    P["t151800.445"] = lambda b: S(title(b[1][0]) + " – " + b[3][0], grid([card("1", None, b[2][0], cls="accent"), card("📠", None, b[0][0], cls="soft")], "c2"), lab=b[3][0])
    P["t151811.506"] = lambda b: S(title(b[1][0]) + " – " + b[3][0], grid([card("2", None, b[2][0], cls="accent"), card("3", None, b[0][0], cls="accent")], "c2"), lab=b[3][0])
    P["t151817.916"] = lambda b: S(title(b[1][0]) + " – " + b[3][0], grid([card("4", None, b[0][0], cls="dark"), card("🗂", None, b[2][0], cls="soft")], "c2"), lab=b[3][0])
    P["t151825.685"] = lambda b: S(title(b[2][0]), lead(b[0][0]), headed(b[1], None, "dark"))
    P["t151833.149"] = lambda b: S(title(b[0][0]), sub(b[1][0].replace("🔄 ", "")), grid([card("1", title(b[2][0]), items=b[3], cls="accent"), card("2", title(b[4][0]), items=b[5], cls="accent"), card("3", title(b[6][0]), items=b[7], cls="accent")], "c3"))
    P["t151849.806"] = lambda b: S(title(b[7][0]), sub(b[0][0].replace("🔄 ", "")), grid([card("4", title(b[1][0]), items=b[2], cls="accent"), card("5", title(b[3][0]), b[4][0], cls="accent"), card("6", title(b[5][0]), items=b[6], cls="dark")], "c3"))
    P["t151859.661"] = lambda b: S(title(b[0][0]) + " – " + b[1][0], fig([IMG + "withdrawal-email-1.png", IMG + "withdrawal-email-2.png"], b[1][0]))
    P["t151905.516"] = lambda b: S(title(b[0][0]) + " – " + b[1][0], fig([IMG + "withdrawal-text.png"], b[1][0]))
    P["t151913.179"] = lambda b: S(title(b[0][0]) + " – " + b[1][0], fig([IMG + "withdrawal-insurance.png"], b[1][0]))
    P["t151930.834"] = lambda b: S(title(b[0][0]) + " – " + b[1][0], fig([IMG + "withdrawal-unresponsive.png"], b[1][0]))
    P["t151942.423"] = lambda b: S(title(b[0][0]) + " – " + b[1][0], fig([IMG + "withdrawal-unpaid-fees.png"], b[1][0]))
    P["t152002.391"] = lambda b: S(b[0][0].replace("🎯 ", ""), lead(b[0][1]), card("🎯", None, b[0][2], cls="accent"), card("✅", b[1][0].replace("✅ ", ""), b[1][1], cls="dark"))
    P["t152011.392"] = lambda b: S("Thank You", hero("Claims Specialist Training", "Thank you."))
    return P

# ---------- Receptionist Training (lesson 4), from the deck's PDF ----------
# A PDF gives each text block as its wrapped lines: J() joins a block back into its sentence,
# items() into its list items (a line that starts in lower case continues the item before it).
RIMG = "/ft/receptionist/img/"
FOOT = "RECEPTIONIST ROLE"
def J(lines): return " ".join(l for l in lines if l != FOOT)
def items(lines):
    out = []
    for l in lines:
        if l == FOOT: continue
        if out and (l[:1].islower() or l[:1] in "(0123456789"): out[-1] += " " + l
        else: out.append(l)
    return out
def pt(n, body, head=None, its=None, cls=""):
    """A numbered point, numbered as on the deck page."""
    inner = (f"<b>{esc(head)}</b>" if head else "") + \
            (body if body and body.startswith("<div") else f"<p>{body if body.startswith('<') else esc(body)}</p>" if body else "") + \
            ("<ul>" + "".join(f"<li>{esc(i)}</li>" for i in its) + "</ul>" if its else "")
    return f'<div class="cs-card num {cls}"><div class="cs-ic">{n}</div><div>{inner}</div></div>'
def media(img, *parts): return f'<div class="cs-media"><div class="cs-stack">{"".join(parts)}</div><img src="{RIMG}{img}.jpg" alt="" loading="lazy"></div>'
def hero_photo(lab, big, img): return f'<div class="cs-hero photo" style="--img:url({RIMG}{img}.jpg)">{label(lab)}<div class="cs-big">{esc(big)}</div></div>'
def emph(text, *parts):
    """The deck's underlined words, bold and underlined (the words themselves are unchanged)."""
    h = esc(text)
    for x in parts: h = h.replace(esc(x), f"<b><u>{esc(x)}</u></b>")
    return f"<span>{h}</span>"

def receptionist_pages():
    P = {}
    T = lambda b: title(J(b[0]))
    P["p01"] = lambda b: S("The Receptionist Role", hero_photo("LSH Foundational Training", title(J(b[0])), "title"))
    P["p02"] = lambda b: S(T(b), media("intro", pt("1", J(b[1]))))
    P["p03"] = lambda b: S(T(b), media("intro", pt("2", J(b[1])), pt("3", J(b[2]))))
    P["p04"] = lambda b: S(T(b), media("intro", pt("4", J(b[1])), pt("5", J(b[2]))))
    task = lambda n, ic, t, its=None: pt(str(n), None, t, its)
    P["p05"] = lambda b: S(T(b), media("tasks", task(1, "💼", J(b[1] + b[4])), task(2, "👤", J(b[2] + b[5])), task(3, "📣", J(b[3]))))
    P["p06"] = lambda b: S(T(b), media("tasks", task(4, "⚖️", J(b[1] + b[4])), task(5, "🩺", J(b[2] + b[5])), task(6, "🏛", J(b[3] + b[6]))))
    P["p07"] = lambda b: S(T(b), media("tasks", task(7, "🛡", J(b[2])), task(8, "👥", J(b[3] + b[4] + b[5] + b[6])),
                                       task(9, "📠", None, [b[1][0], J(b[1][1:])])))
    two = lambda img, n: (lambda b: S(T(b), media(img, pt(str(n), J(b[1])), pt(str(n + 1), J(b[2]))), lab=FOOT))
    P["p08"] = two("inquiries", 1); P["p09"] = two("inquiries", 3)
    P["p10"] = two("existing-client", 1); P["p11"] = two("existing-client", 3)
    P["p12"] = two("sales", 1)
    P["p13"] = lambda b: S(T(b), media("sales", pt("3", None, J(b[1]), items(b[2]), "soft"), pt("4", None, J(b[3]), items(b[4]), "dark")), lab=FOOT)
    P["p14"] = two("opposing-counsel", 1); P["p15"] = two("opposing-counsel", 3)
    P["p16"] = two("opposing-counsel", 5); P["p17"] = two("opposing-counsel", 7)
    P["p18"] = two("medical", 1)
    P["p19"] = two("court", 1)
    P["p20"] = lambda b: S(T(b), media("court", pt("3", J(b[1])), pt("4", None, J(b[2]), items(b[3]))), lab=FOOT)
    P["p21"] = lambda b: S(T(b), media("insurance", pt("1", emph(J(b[1]), "ALWAYS ASK for a CLAIM NUMBER and DOL")),
                                       pt("2", emph(J(b[2]), "WE DO NOT GIVE THAT INFORMATION EVER!"), cls="dark")), lab=FOOT)
    P["p22"] = two("insurance", 3); P["p23"] = two("insurance", 5)
    P["p24"] = two("other-parties", 1)
    P["p25"] = lambda b: S(T(b), media("other-parties", pt("3", J(b[1])), pt("4", None, J(b[2]), items(b[3]))), lab=FOOT)
    P["p27"] = lambda b: S(T(b), media("other-parties", pt("7", J(b[1]))), lab=FOOT)
    P["p26"] = lambda b: S(T(b), media("other-parties", pt("5", None, J(b[1]), items(b[2])), pt("6", None, J(b[3]), items(b[4]), "dark")), lab=FOOT)

    # Receptionist Best Practices: each practice (its name is the page's badge) numbers its own points.
    def practice(b):
        """Splits a Best Practices page: the practice's name (the all-caps badge lines), the page's opening
        statement ("A good RECEPTIONIST is …", when it has one) and its text, as paragraphs."""
        rest = [x for x in b[1:]]
        badge = [x for x in rest if all(l == l.upper() for l in x)]
        body = [x for x in rest if x not in badge]
        head = None
        if body and body[0][0].startswith("A good RECEPTIONIST"):
            head = J(body[0] + body[1]); body = body[2:]
        paras, cur = [], []
        for x in body:                                   # a new paragraph where the deck leaves a blank line
            if cur and x[0].startswith("A good receptionist"): paras.append(J(cur)); cur = []
            cur += x
        if cur: paras.append(J(cur))
        return J(sum(badge, [])), head, paras
    def bp(img, n):
        def f(b):
            name, head, paras = practice(b)
            body = "".join(f"<p>{esc(t)}</p>" for t in paras)
            return S(title(J(b[0])), media(img, pt(str(n), f'<div class="cs-paras">{body}</div>' if len(paras) > 1 else (paras[0] if paras else None), head)), lab=name)
        return f
    P["p28"] = bp("welcoming", 4)
    P["p29"] = bp("confirm", 1)
    P["p30"] = bp("expert", 1)
    def p31(b):
        name = J(b[5] + b[6]); q = b[2][:2] + [J(b[2][2:] + b[3] + b[4][:1])]
        return S(title(J(b[0])), media("expert", pt("2", None, b[1][0], q), pt("💡", J(b[4][1:] + b[7]), cls="dark")), lab=name)
    P["p31"] = p31
    P["p32"] = bp("paraphrase", 1); P["p33"] = bp("paraphrase", 2)
    P["p34"] = bp("attention", 1); P["p35"] = bp("attention", 2)
    P["p36"] = bp("adapt", 1); P["p37"] = bp("adapt", 2); P["p38"] = bp("adapt", 3)
    P["p39"] = lambda b: S(title(J(b[1])), media("payment",
        card("💬", b[2][0], J(b[0]), cls="accent"),
        card("🧾", J([b[4][0], b[6][0]]), J(b[3]), cls="accent"),
        card("💳", J([b[9][0], b[10][0]]), J(b[7]), cls="accent")))
    P["p40"] = lambda b: S(title(J(b[1])), media("payment",
        card("🔐", J([b[2][0], b[4][0]]), J(b[0]), cls="accent"),
        card("🔎", J([b[7][0], b[8][0]]), J(b[5]), cls="accent"),
        card("🗂", b[10][0], J(b[9]), cls="accent")))
    def p41(b):
        box = lambda ic, head, text, cls="": card(ic, head, text, cls=cls)
        arrow = '<div class="cs-arrow">↓</div>'
        yes = f'<div class="cs-col"><div class="cs-sub">{esc(b[7][0])}</div>' + \
              f'<div class="cs-warn"><div><b>{esc(b[3][0])}</b> {esc(J(b[4] + b[5]))}</div></div>' + arrow + \
              box("🛡", b[8][0], J(b[8][1:] + b[10]), "dark") + "</div>"
        no = f'<div class="cs-col"><div class="cs-sub">{esc(b[11][0])}</div>' + \
             box("ℹ️", b[13][0], J(b[15] + b[18])) + box("📝", b[14][0], J(b[14][1:] + b[17])) + arrow + \
             box("📨", b[12][0], J(b[12][1:] + b[16]), "accent") + "</div>"
        return S(title(b[0][0]), f'<div class="cs-tip"><div><b>{esc(b[1][0])}</b></div></div>', arrow,
                 box("🪪", b[2][0], b[2][1], "accent"), arrow,
                 box("❓", b[6][0], J(b[6][1:] + b[9]), "dark"),
                 f'<div class="cs-split">{yes}{no}</div>')
    P["p41"] = p41
    P["p42"] = lambda b: S(title(J(b[0])), media("conference", pt("1", J(b[1])), warn(J(b[2])), tip(J(b[3]))), lab=J(b[4]))
    P["p43"] = lambda b: S(title(J(b[0])), media("conference", pt("1", J(b[1])), tip(J(b[2]))), lab=J(b[3]))
    P["p44"] = lambda b: S(title(J(b[0] + b[1])), media("conference", pt("1", J(b[2])), pt("2", J(b[3]))), lab=J(b[4]))
    P["p45"] = lambda b: S(title(b[0][0]), hero_photo(b[0][0], J(b[1]), "remember"))
    P["p46"] = lambda b: S(title(b[0][0]), hero_photo("Receptionist Training", b[0][0], "thanks"))
    return P

# ---------- Law Firm Communication (lesson 2) ----------
def lfc_pages():
    P = {}
    j = lambda b, *ix: " ".join(l for i in ix for l in b[i])            # boxes ix joined into one paragraph
    rest = lambda b, a: " ".join(l for x in b[a:] for l in x)           # every box from a on
    def one(h, a=1):                                                    # a one-paragraph practice page
        return lambda b: S(h, lead(rest(b, a)), lab="Inbound call best practices")
    P["p01"] = lambda b: S("Law Firm Communication", hero("LSH Foundational Training", "Law Firm Communication"))
    P["p02"] = lambda b: S("Objectives", grid([card(str(i + 1), None, j(b, i + 1), cls="accent") for i in range(3)], "c3"))
    P["p03"] = lambda b: S("Training Agenda", flow([j(b, i) for i in range(1, 6)]))
    P["p05"] = lambda b: S("Inbound Caller Roles", grid([card(ic, None, j(b, i)) for ic, i in zip("💼👤📅💳", range(2, 6))]))
    def p06(b):
        rec = ["Welcoming", "Addresses any call inquiries", "Determine leads and endorse to intake."]
        sales = ["Consultation", "Attorney", "Leading the prospect to choosing the firm", "Selling the firm’s services", "Retaining the firm"]
        return S("Inbound Caller Roles", grid([card("💼", "Reception", items=rec, cls="accent"), card("👤", "Intake", items=b[3], cls="accent"),
                                               card("🤝", "Sales", items=sales, cls="accent"), card("⚖️", "Legal", items=b[7], cls="accent")], "c2"))
    P["p06"] = p06
    for k, h, a in [("p07", "Answer Quickly", 1), ("p08", "Answer Quickly", 1), ("p09", "Be Ready", 1), ("p10", "Set a Positive Tone", 1),
                    ("p11", "Set a Positive Tone", 3), ("p12", "Manage Your Hold Time", 1), ("p13", "Manage Your Hold Time", 1),
                    ("p14", "Make Every Caller Feel Valued", 3), ("p15", "Make Every Caller Feel Valued", 3), ("p16", "Be Consistent", 1),
                    ("p17", "Be Consistent", 1), ("p18", "Stay in Control", 1), ("p19", "Stay in Control", 1), ("p20", "Recap", 1),
                    ("p21", "Recap", 1), ("p22", "Proper Documentation", 2), ("p23", "Proper Documentation", 2)]:
        P[k] = one(h, a)
    P["p25"] = lambda b: S("Common Outbound Calls", grid([
        card("📞", "Follow up", j(b, 2, 3), cls="accent"), card("📎", "Request for additional information or documents", j(b, 5), cls="accent"),
        card("💳", "Payment reminders", j(b, 7), cls="accent"), card("📅", "Coordinate appointments", j(b, 9), cls="accent")], "c2"))
    P["p26"] = lambda b: S("Common Outbound Calls", grid([
        card("🩺", "Appointment reminders", j(b, 2, 3), cls="accent"), card("🏛", "Court process inquiries", j(b, 5), cls="accent"),
        card("⏰", "Reminders and scheduling", j(b, 7), cls="accent"), card("🗂", "Personal assistant related calls", j(b, 9), cls="accent"),
        card("📋", "Any other calls requested by the office", j(b, 11), cls="accent")], "c3"))
    def steps(h, lab, spec, drop=None):      # drop: a stray word of the next block the PDF put at the end of a box
        return lambda b: S(h, grid([card(str(n), t, j(b, *ix).removesuffix(drop) .strip() if drop else j(b, *ix), cls="accent") for n, t, ix in spec], "c2"), lab=lab)
    CT = "Outbound call type"
    P["p27"] = steps("Client Contact Calls", CT, [(1, "Introduction", (2,)), (2, "Authenticate", (4,))], drop="OUTBOUND")
    P["p28"] = steps("Client Contact Calls", CT, [(3, "Purpose", (2,)), (4, "Closing the call", (4,))])
    P["p29"] = steps("Client Contact Calls", CT, [(5, "Engagement appreciation", (2,)), (6, "Leave voicemail if necessary", (4, 5))])
    IF = "Invoice follow-up"
    P["p30"] = lambda b: S("Invoice Follow-up Calls", grid([card("1", "Introduction", " ".join(b[1][1:]), cls="accent"),
                           card("2", "Confirm that you are speaking with the client", j(b, 3), cls="accent")], "c2"), lab=IF)
    P["p31"] = lambda b: S("Invoice Follow-up Calls", lead(j(b, 1)), ul([j(b, 2), j(b, 3), j(b, 4)]), lab=IF)
    P["p32"] = lambda b: S("Invoice Follow-up Calls", sub("Sample script"), lead(j(b, 2)), note(f"<b>Note:</b> {esc(' '.join(b[3][1:] + b[4]))}"), lab=IF)
    P["p33"] = lambda b: S("Invoice Follow-up Calls", sub("Sample script"), grid([card("1", "If it is not the client", j(b, 2), cls="soft"), card("2", "If it is the client", j(b, 3), cls="soft")], "c2"), lab=IF)
    P["p34"] = lambda b: S("Invoice Follow-up Calls", sub("Document all calls on CRM"), grid([
        card("1", "Scenario 1", " ".join(b[3]), cls="accent"), card("2", "Scenario 2", j(b, 5), cls="accent")], "c2"), tip(f"<b>Example:</b> {esc(j(b, 7))}"), lab=IF)
    P["p35"] = lambda b: S("Invoice Follow-up Calls", sub("Email template"), lead(j(b, 2)),
        f'<div class="cs-card soft"><p><b>{esc(b[3][0])}</b><br><b>{esc(b[4][0])}</b><br><br>{esc(j(b, 5))}<br><br>{esc(j(b, 6))}<br><br>{esc(j(b, 7))}<br><br>{esc(j(b, 8))}</p></div>', lab=IF)
    P["p36"] = lambda b: S("Provider Calls", grid([card("1", "Introduction", j(b, 2), cls="accent"),
                           card("2", "Confirm that you are speaking with the right contact person", j(b, 4, 5), cls="accent")], "c2"), lab=CT)
    P["p37"] = lambda b: S("Provider Calls", sub("Proceed in completing the call"), grid([card("🔓", None, j(b, 2), cls="accent"), card("🪪", None, j(b, 3), cls="accent")], "c2"), warn(f"<b>{esc(j(b, 4))}</b>"), lab=CT)
    P["p38"] = lambda b: S("Provider Calls", sub("Sample script"), grid([card("1", "Speaking with someone", j(b, 2), cls="soft"), card("2", "Leaving a voicemail", j(b, 3), cls="soft")], "c2"), lab=CT)
    P["p39"] = lambda b: S("Provider Calls", grid([card("🙏", "Show appreciation for their time", j(b, 2), cls="accent"),
                           card("📞", "Leave voicemail if necessary", j(b, 4), cls="accent")], "c2"), warn(f"<b>{esc(b[5][0])}</b> {esc(b[5][1])}"), lab=CT)
    P["p40"] = lambda b: S("Calls to Adjusters", grid([card("1", "Introduction", " ".join(b[3][1:]), cls="accent"),
                           card("2", "Confirm that you are speaking with the right person", j(b, 6), cls="accent")], "c2"), lab=CT)
    P["p41"] = lambda b: S("Calls to Adjusters", sub("Complete the call"), lead(j(b, 4)), grid([card("🔢", None, b[5][0], cls="accent"), card("🚫", None, j(b, 6), cls="dark")], "c2"), warn(f"<b>{esc(j(b, 9))}</b>"), lab=CT)
    P["p42"] = lambda b: S("Calls to Adjusters", sub("Complete the call"), lead(j(b, 4)), sub("Show appreciation for their time"), f"<p>{esc(j(b, 8))}</p>", lab=CT)
    P["p43"] = lambda b: S("Calls to Adjusters", sub("Leave voicemail if necessary"), lead(j(b, 3)), grid([card("🔒", None, b[5][0], cls="dark"), card("✉️", None, b[7][0], cls="accent")], "c2"), lab=CT)
    P["p44"] = lambda b: S("Calls to Adjusters", sub("Sample script"), lead(j(b, 3)), lab=CT)
    P["p45"] = lambda b: S("Court Calls", grid([card("1", "Introduction", j(b, 2), cls="accent"),
                           card("2", "Confirm that you are speaking with the court department or clerk", j(b, 4), cls="accent")], "c2"), lab=CT)
    P["p46"] = lambda b: S("Court Calls", sub("Proceed in completing the call"), lead(j(b, 2)), grid([card("🙏", "Show appreciation for their time", j(b, 4), cls="accent"), card("📞", "Leave voicemail if necessary", j(b, 6), cls="accent")], "c2"), lab=CT)
    P["p47"] = lambda b: S("Court Calls", sub("Sample script"), lead(j(b, 2)), lab=CT)
    def p48(b):
        pts = [x.strip() for x in j(b, 6).split("•") if x.strip()]
        return S("Calls to Opposing Counsel", grid([card("1", "Introduction", " ".join(b[2][1:]), cls="accent"),
                 card("2", "Confirm that you are speaking with opposing counsel or their staff", items=pts, cls="accent")], "c2"), lab=CT)
    P["p48"] = p48
    P["p49"] = lambda b: S("Calls to Opposing Counsel", sub("Complete the call"), lead(j(b, 2)), grid([card("🔢", None, b[3][0], cls="accent"), card("🚫", None, j(b, 4), cls="dark")], "c2"),
                           card("🙏", "Show appreciation for their time", j(b, 6), cls="soft"), lab=CT)
    P["p50"] = lambda b: S("Calls to Opposing Counsel", sub("Leave voicemail if necessary"), lead(j(b, 2)), grid([card("🔒", None, b[3][0], cls="dark"), card("✉️", None, b[4][0], cls="accent")], "c2"), lab=CT)
    P["p51"] = lambda b: S("Calls to Opposing Counsel", sub("Sample script"), lead(j(b, 2)), lab=CT)
    P["p52"] = lambda b: S("Calls to Opposing Counsel", sub("Sample script: voicemail"), lead(j(b, 2)), lab=CT)
    P["p53"] = lambda b: S("Outbound Caller Best Practices", grid([
        card("1", "Preparation is key", j(b, 3), cls="accent"), card("2", "Proper introduction", j(b, 6), cls="accent"), card("3", "Be direct", j(b, 7), cls="accent"),
        card("4", "Call within office hours", j(b, 10), cls="accent"), card("5", "Value their time", j(b, 12), cls="accent")], "c3"))
    P["p54"] = lambda b: S("Thank You", hero("Law Firm Communication", "Thank You"))
    return P

LESSONS = {"claims": {"id": 7, "var": "DAY7", "title": "Claims Specialist Training", "file": "lesson07.js",
                      "video": "https://drive.google.com/file/d/1uRyK-iR-Ja4pqmk_Nw6-Z--6hkxhR48J/view",
                      "canva": "https://www.canva.com/design/DAHWU-Wq2mQ/Nh3SycOXOAg7kl5EOQ-Z6Q/view",
                      "pages": claims_pages,
                      # pages that repeat the page before them in the deck (kept once)
                      "repeats": {"n006", "n012", "n040"}},
           "lfc": {"id": 2, "var": "DAY2", "title": "Law Firm Communication", "file": "lesson02.js",
                      "video": "https://drive.google.com/file/d/1o3LYojKAhid10ovts_umxhbWxb2j5i6l/view",
                      "canva": "https://www.canva.com/design/DAGnZlfVDg0/-8llTBcfj8N_Xk35hYyarQ/view",
                      "pages": lfc_pages,
                      # the deck's two section title pages: the topic dividers take their place
                      "repeats": {"p04", "p24"}},
           "receptionist": {"id": 4, "var": "DAY4", "title": "Receptionist Training", "file": "lesson04.js",
                      "video": "https://drive.google.com/file/d/1W7vkDcf6FpPSDEOWcEmTylJdKNyss-1M/view",
                      "pages": receptionist_pages, "repeats": set()}}

def main(name):
    L = LESSONS[name]
    pages = json.load(open(os.path.join(B, name + ".json"), encoding="utf8"))
    P = L["pages"]()
    sections, missing = [], []
    order = [p["key"] for p in pages]
    byk = {p["key"]: p for p in pages}
    for k in order:
        if k in L["repeats"]: continue
        f = P.get(k)
        if not f: missing.append(k); continue
        s = f(byk[k]["boxes"] if k in byk else [])
        sections.append({"id": k, "h": s["h"], "html": s["html"]})
    if L.get("tail"): sections += json.load(open(os.path.join(B, L["tail"]), encoding="utf8"))
    js = (f"const {L['var']} = {{\n  id: {L['id']},\n  title: {json.dumps(L['title'])},\n  video: {json.dumps(L['video'])},\n" +
          (f"  canva: {json.dumps(L['canva'])},\n" if L.get("canva") else "") + f"  heading: {json.dumps(L['title'])},\n  sections: " + json.dumps(sections, ensure_ascii=False, indent=2) + "\n};\n")
    open(os.path.join(ROOT, "build", "lessons", L["file"]), "w", encoding="utf8").write(js)
    print(f"{L['file']}: {len(sections)} slides" + (f"; no layout yet for {', '.join(missing)}" if missing else ""))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "claims")
