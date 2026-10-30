// 📚 Dashboard's Knowledge Base card: every Knowledge Base article, by role (js/ft-kb-articles.js, read by js/ft-kb-card.js).
// Made from the LSH-Knowledge-Base repo's bundled pages (public/seed: docs.json, tettra.json, training.json) and the articles
// written in the library that the course links (EXTRA, by their #/e/<id>). Run it again when the library's bundle changes:
//   node build/kb-articles.cjs <LSH-Knowledge-Base repo>
// A link is the library's own: a bundled document by #/doc/<file>, a training topic by #/topic/<id>, a Tettra page by
// #/go/<id> (the library adds a bundled page the first time its link is opened).
const fs = require("fs"), path = require("path");
const KB = process.argv[2];
if(!KB || !fs.existsSync(path.join(KB, "public/seed/docs.json"))) { console.error("Usage: node build/kb-articles.cjs <LSH-Knowledge-Base repo>"); process.exit(1); }
const seed = f => JSON.parse(fs.readFileSync(path.join(KB, "public/seed", f), "utf8"));

// the roles, in the order the card shows them: [key, the card's label, the window's title, the library collection (its 🔗 whole collection link)]
const ROLES = [
  ["va", "VA Basics", "Virtual Assistant Essentials & Law Firm Basics", "foundational"],
  ["reception", "Reception", "Reception", ""],
  ["calendar", "Calendar", "Calendaring & Appointment Setting", ""],
  ["intake", "Intake", "Intake Specialist", "intake"],
  ["claims", "Claims", "Claims Specialist & Insurance", "insurance"],
  ["records", "Med Records", "Medical Records Specialist", "provider"],
  ["liens", "Liens", "Liens & Subrogation", "lien"],
  ["demands", "Demands", "Demands & Medical Summaries", "demands"],
  ["practice", "Practice Areas", "Practice Areas", ""]
];
// a Foundational Training lesson's topics go to its role
const LESSON = {1: "va", 2: "va", 3: "va", 4: "reception", 5: "calendar", 6: "intake", 7: "claims", 8: "records"};
// a bundled document's collection → its role (Case Management's and Litigation's aren't on the card: "" leaves them out)
const COLLECTION = {intake: "intake", insurance: "claims", provider: "records", "case-management": "", lien: "liens", demands: "demands", litigation: ""};
// the Tettra pages, one by one (their categories don't follow the roles: "Administrative" holds intake, records and calendar pages)
const TETTRA = {
  829734: "intake", 829735: "intake", 829736: "intake", 829738: "intake", 918345: "intake",
  829763: "claims",
  972751: "records", 1024476: "records", 1024491: "records", 1031449: "records", 1031468: "records", 829767: "records",
  829739: "liens", 829740: "liens", 829741: "liens", 829754: "liens", 829756: "liens", 829759: "liens", 829770: "liens",
  848156: "demands", 848185: "demands",
  919505: "", 1083562: "", 1083564: "", 1085903: "",   // Litigation: not on the card
  918335: "calendar",
  958866: "reception", 972748: "reception",
  972753: "va", 1086475: "va"
};
// the articles written in the library (not bundled), by role and section
const EXTRA = {
  intake: [["Intake: the lesson's articles", [[96, "Intake Specialist: The Art and Science of Intake"], [99, "Unauthorized Practice of Law"],
      [100, "Understanding Attorney-Client Privilege and Confidentiality Practices"], [125, "Navigating Conflicts of Interest in Personal Injury Litigation"],
      [102, "SmartAdvocate Enterprise Workflow, Architecture & Customization Blueprint"]]],
    ["Case types", [[117, "Understanding Slip and Fall vs. Premises Liability Claims"], [118, "Standard Duty of Care and Visitor Classifications"],
      [119, "Processing Commercial Property Incident Reports & Evidence Intake"], [122, "Dog Bite Incident Management & Medical Protocol"],
      [123, "Medical Malpractice Intake & Investigation Protocol"]]]],
  claims: [["Insurance", [[98, "Common Insurance Companies in Personal Injury Cases"], [115, "Navigating Post-Accident Medical Coverage: PIP, MedPay, and Health Insurance"],
      [116, "Navigating Auto Insurance: At-Fault vs. No-Fault States, PIP, and Property Protection Explained"]]]],
  reception: [["Reception", [[121, "Receptionist Role Standard Operating Procedures"]]]]
};

const by = Object.fromEntries(ROLES.map(r => [r[0], new Map()]));   // role → section → [[title, link]]
const add = (role, section, title, link) => { const m = by[role]; if(!m.has(section)) m.set(section, []); m.get(section).push([title, link]); };
const lost = [];
for(const p of seed("training.json").pages) add(LESSON[p.lesson], `Foundational Training · Lesson ${p.lesson}: ${p.lessonTitle.replace(/ Training$/, "")}`, p.title, `#/topic/${p.id}`);
for(const r of Object.keys(EXTRA)) for(const [sec, list] of EXTRA[r]) for(const [id, t] of list) add(r, sec, t, `#/e/${id}`);
for(const d of seed("docs.json")){
  const role = COLLECTION[d.collection]; if(role === "") continue;
  if(!role){ lost.push(`doc ${d.file} (${d.collection})`); continue; }
  add(role, d.section || "Procedures & guides", d.title, `#/doc/${d.file}`);
}
for(const p of seed("tettra.json").pages){
  const role = /^IV\. Practice/.test(p.category) ? "practice" : TETTRA[p.id]; if(role === "") continue;
  if(!role){ lost.push(`Tettra ${p.id} ${p.title}`); continue; }
  add(role, role === "practice" ? "Practice areas" : "Guides & SOPs", p.title, `#/go/${p.id}`);
}
if(lost.length){ console.error("No role for:\n  " + lost.join("\n  ")); process.exit(1); }

const roles = ROLES.map(([key, label, title, collection]) => {
  // the lesson's topics first, then the sections in order
  const rank = h => /^Foundational Training/.test(h) ? 0 : 1;
  const groups = [...by[key]].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "en", {numeric: true}));
  return {key, label, title, collection, count: groups.reduce((n, g) => n + g[1].length, 0), groups};
});
const out = "// Generated by build/kb-articles.cjs from the LSH-Knowledge-Base repo's bundled pages: run it again, don't edit this file.\n"
  + "window.FT_KB_ROLES = " + JSON.stringify(roles) + ";\n";
fs.writeFileSync(path.join(__dirname, "../js/ft-kb-articles.js"), out);
console.log(roles.map(r => `${r.label}: ${r.count}`).join(" · ") + ` · ${roles.reduce((n, r) => n + r.count, 0)} in all`);
