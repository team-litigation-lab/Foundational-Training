#!/usr/bin/env python3
"""Builds the FT_MEDLOR_CASES half of js/ft-medlor-data.js from the provider folders the trainers
sent ("Letter Templates for Training Demos"): one sub-folder per medical provider (or, under
"Nevada Personal Injury Management", one per doctor), each holding that provider's own filled-in
"MedLOR with Unsworn COR" and "Lien BV v2" letters.

Unlike the insurer cases (build/lor/make_lor_data.py), these letters are not blank templates —
each is a real demo copy already filled in for one provider and one client, which is why this
script reads the provider's name, address, attention line, phone, fax and email, and the client's
name, date of birth, SS no. and date of loss straight out of each pair of letters, the same way a
trainee reads their case notes today. The two LETTER TEMPLATES themselves (js/ft-medlor.js) are
hand-authored from this same material, once, the usual fixed-text-vs-highlighted-field split the
firm uses everywhere else; this script only ever produces the per-provider case data.

Usage:
  python3 build/medlor/make_medlor_cases.py "build/medlor/source/Letter Templates for Training Demos"

Re-run whenever the trainers send new provider folders; never hand-edit the output.
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def paras(path):
    """Every paragraph's text, with Word's own line breaks (<w:br/>) kept as \n so a multi-line
       address block (the office's street, city and phone, all one Word paragraph) reads as the
       separate lines it is, not one run-on line."""
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    out = []
    for p in root.find(W + "body").iter(W + "p"):
        line = ""
        for node in p.iter():
            tag = node.tag.replace(W, "")
            if tag == "t":
                line += node.text or ""
            elif tag == "br":
                line += "\n"
            elif tag == "tab":
                line += "\t"
        out.append(line)
    return out


def clean(s):
    return re.sub(r"[ \t]+", " ", s).strip()


def address_block(lines):
    """Everything in the recipient block that isn't the provider's name, the attention line, or a
       labelled phone/fax/email — i.e. the street address, city, state and zip, each its own line."""
    out = []
    for l in lines:
        l = clean(l)
        if not l or l.startswith(("E:", "P:", "F:")):
            continue
        out.append(l)
    return out


def labelled(lines, label):
    for l in lines:
        m = re.match(r"^\s*" + re.escape(label) + r"\s*(.*)$", l)
        if m:
            return clean(m.group(1))
    return ""


def medlor_case(folder):
    f = next(folder.glob("MedLOR*.docx"), None)
    if not f:
        return None
    lines = [clean(l) for l in paras(f) for l in l.split("\n")]
    # paragraph 3 (and sometimes 4, for a lienholder-of-record line + the doctor's own name) is the
    # recipient's own name — everything up to "ATTENTION:" — one line normally, two for NPIM's doctors.
    name_lines = []
    i = 0
    while i < len(lines) and not lines[i].upper().startswith("ATTENTION"):
        if lines[i] and not lines[i].upper().startswith("SENT VIA") and not re.match(r"^\w+ \d{1,2}, \d{4}$", lines[i]):
            name_lines.append(lines[i])
        i += 1
    provider = " / ".join(dict.fromkeys(name_lines))   # dedupe, keep order
    # the rest of the header block: street/city lines, and the labelled phone/fax/email
    rest = lines[i:i + 10]
    addr_start = next((k for k, l in enumerate(rest) if l.upper().startswith("ATTENTION")), 0) + 1
    header_tail = rest[addr_start:]
    addr_end = next((k for k, l in enumerate(header_tail) if l.lower().startswith(("re:", "our client"))), len(header_tail))
    address = address_block(header_tail[:addr_end])
    phone = labelled(header_tail, "P:")
    fax = labelled(header_tail, "F:")
    email = labelled(header_tail, "E:")
    full = "\n".join(lines)
    client = re.search(r"Our Client:\s*([^\n]+?)(?:\s*Date of Birth|$)", full)
    dob = re.search(r"Date of Birth:\s*([^\n]*?)(?:\s*SS No\.|\s*Date of Loss|$)", full)
    ssn = re.search(r"SS No\.:\s*([^\n]*?)(?:\s*Date of Loss|$)", full)
    dol = re.search(r"Date of Loss:\s*([^\n]*?)(?:\s*Dates Requested|$)", full)
    return {
        "Provider / Facility": provider,
        "Address": "\n".join(address),
        "Phone": phone,
        "Fax": fax,
        "Email": email,
        "Client’s Name": clean(client.group(1)) if client and client.group(1).strip() else "",
        "Date of Birth": clean(dob.group(1)) if dob and dob.group(1).strip() else "",
        "SS No.": clean(ssn.group(1)) if ssn and ssn.group(1).strip() else "",
        "Date of Loss": clean(dol.group(1)) if dol and dol.group(1).strip() else "",
    }


def main(root, dest="js/ft-medlor-data.js"):
    root = Path(root)
    folders = sorted([p for p in root.iterdir() if p.is_dir() and p.name != "Nevada Personal Injury Management"],
                      key=lambda p: p.name)
    npim = root / "Nevada Personal Injury Management"
    if npim.is_dir():
        folders += sorted([p for p in npim.iterdir() if p.is_dir()], key=lambda p: p.name)
    cases = []
    for folder in folders:
        c = medlor_case(folder)
        if not c:
            print("  skipped (no MedLOR file):", folder.name)
            continue
        label = folder.name if folder.parent.name != "Nevada Personal Injury Management" \
            else "Nevada Personal Injury Management — " + folder.name.replace("Dr. ", "")
        cases.append({"label": label, "notes": c})
    head = ("/* ============================================================\n"
            "   \U0001f9f0 Drafting Tools — Medical Provider LOR Drafting Activity: the provider cases\n"
            "   GENERATED by build/medlor/make_medlor_cases.py from the provider folders the trainers sent\n"
            "   (“Letter Templates for Training Demos”). Do not hand-edit: run the script again with the new\n"
            "   folders, so the cases stay exactly as the firm's own sample letters have them.\n"
            "     • FT_MEDLOR_CASES   one case per medical provider (one per doctor, under Nevada Personal\n"
            "                         Injury Management), each with the recipient's name, address and contact\n"
            "                         details and the client's own identifying details, read straight out of\n"
            "                         the firm's own filled-in demo letters for that provider.\n"
            "   The two letter templates themselves (\U0001f9f0 MedLOR with Unsworn COR, \U0001f9f0 Lien Balance Verification)\n"
            "   are in js/ft-medlor.js, not generated: the source letters mix the firm's filled-in demo values\n"
            "   with its usual yellow-highlighted blanks in the same run, so the fixed-text-vs-field split is\n"
            "   authored by hand once, the same split the firm's own 1P/3P templates use.\n"
            "   ============================================================ */\n")
    js = head + "window.FT_MEDLOR_CASES = " + json.dumps(cases, ensure_ascii=False, separators=(",", ":")) + ";\n"
    Path(dest).write_text(js, encoding="utf8")
    print("%s: %d cases" % (dest, len(cases)))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], *sys.argv[2:])
