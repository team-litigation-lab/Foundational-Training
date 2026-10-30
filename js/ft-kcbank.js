/* ============================================================
   🎮 THE KNOWLEDGE CHECK GAMES' QUESTION BANK — a starting set per lesson
   ------------------------------------------------------------
   Written from the lessons' own topics (their slide headings) and the Training Guide's rules: the call
   handling, the PI stages, the intake packet, the LOR and Dec page, PHI and requests, liens and closing.
   Trainers add their own questions and hide any of these in Admin → 📚 Dashboard → 🎮 Knowledge Games
   (settings:kcgames); the games (js/ft-kcgames.js) play this bank plus theirs.

     mc:   [category, value 100–500, question, [four choices], index of the right one, why]
     list: [question, [[answer, points, [other ways to say it]], …]]   — the top answers, for the Feud board
     term: [term, definition]                                            — for Rapid Fire
   docs: mock documents for the Blur / Zoom reveal, drawn on the page (no real names or data).
   ============================================================ */
(function(root){
"use strict";
const B = {};

B[1] = {title: "Virtual Assistant Essentials",
  mc: [
    ["Law firms", 100, "A Legal VA who answers calls, files documents, schedules and follows up on billing for one attorney most likely works for a…", ["Solo or small law firm", "Large law firm", "Court clerk’s office", "Insurance company"], 0, "Solo and small firms need one person to cover many kinds of tasks."],
    ["Law firms", 200, "A VA who only retrieves medical records all day for one department is doing which kind of work?", ["Departmentalized", "All-around", "Client-centric", "Transactional"], 0, "Large firms split work into departments, so a VA may handle one function."],
    ["Law firms", 300, "Why might a large firm move a VA from intake to medical records?", ["Workload and staffing shift between departments", "The VA failed intake", "Intake is closed on weekends", "Records work pays less"], 0, "Big firms restructure by workload; flexibility is what they look for."],
    ["Law firms", 400, "One firm lets VAs follow up with clients, another forbids it. What should a VA take from this?", ["Every firm has its own SOPs; follow the client firm’s rules", "Always contact clients anyway", "Never contact anyone", "Use the stricter firm’s rule everywhere"], 0, "Never assume procedures are the same across firms."],
    ["Tasks", 100, "Sending a settlement breakdown today and organizing records tomorrow is an example of…", ["Transactional tasks", "Departmentalized tasks", "Litigation tasks", "Personal tasks"], 0, "Varied, one-off tasks as they come are transactional."],
    ["Tasks", 200, "Which is a typical Legal VA task?", ["Updating case notes in the CMS", "Giving legal advice to a client", "Signing pleadings for the attorney", "Setting the attorney’s fee"], 0, "VAs support the case; legal advice and signatures belong to the attorney."],
    ["Tasks", 300, "A VA should NEVER…", ["Give legal advice", "Take a detailed message", "Confirm a callback number", "Save a document with the right name"], 0, "Only the attorney gives legal advice."],
    ["Mindset", 100, "Which habit best helps a Legal VA stand out?", ["Double-checking work before submitting", "Waiting to be told every step", "Skipping notes to save time", "Answering only easy calls"], 0, "Accuracy and ownership are what clients notice."],
    ["Mindset", 200, "A task is unclear. The best first move is to…", ["Ask a clear question early", "Guess and hope", "Wait until the deadline", "Skip it"], 0, "Clarifying early prevents rework."],
    ["Mindset", 300, "Why do firms value VAs who learn their CMS quickly?", ["They work faster with fewer errors", "It replaces the attorney", "It removes the need for notes", "It shortens calls by law"], 0, "Knowing the system well means speed and accuracy."],
    ["U.S. context", 200, "A client in California calls a firm in Nevada at 9:00 AM Pacific. What time is it in Nevada?", ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"], 0, "Nevada and California are both on Pacific time."],
    ["U.S. context", 300, "It is 1:00 PM Eastern. What time is it Pacific?", ["10:00 AM", "11:00 AM", "12:00 PM", "4:00 PM"], 0, "Pacific is three hours behind Eastern."],
    ["U.S. context", 400, "Which communication style do U.S. attorneys usually expect from a VA?", ["Direct, concise and on time", "Indirect and lengthy", "Very casual with slang", "Only by text message"], 0, "Directness and punctuality are valued in U.S. professional settings."],
    ["U.S. context", 500, "A personal injury case is usually handled first as a claim with an insurer, and goes to court…", ["Only if it can’t be settled (litigation)", "Always on day one", "Never", "Only when the client asks"], 0, "Most PI cases settle; litigation is the fallback."]
  ],
  list: [
    ["Name a type of law firm by size", [["Solo", 35, ["solo practice", "solo law firm", "sole practitioner"]], ["Small", 28, ["small firm", "small law firm"]], ["Medium", 20, ["mid-size", "midsize", "medium firm"]], ["Large", 17, ["big", "large firm", "big law"]]]],
    ["Name a quality that makes a Legal VA stand out", [["Attention to detail", 30, ["detail oriented", "accuracy", "accurate"]], ["Communication", 24, ["clear communication", "communicating"]], ["Reliability", 18, ["dependable", "reliable", "punctual", "on time"]], ["Flexibility", 15, ["adaptability", "adaptable", "flexible"]], ["Initiative", 13, ["proactive", "ownership", "resourceful"]]]],
    ["Name a typical Legal VA task", [["Answer calls", 24, ["calls", "phones", "answering calls"]], ["Schedule appointments", 21, ["scheduling", "calendar", "calendaring"]], ["File documents", 20, ["filing", "save documents", "saving documents"]], ["Update case notes", 19, ["case notes", "notes", "cms notes"]], ["Follow up on billing", 16, ["billing", "billing follow up"]]]]
  ],
  term: [["Legal VA", "A remote assistant who supports a law firm’s staff and cases"], ["SOP", "A firm’s written standard operating procedure"], ["CMS", "The case management system where case files, notes and tasks live"], ["Solo firm", "A law practice run by one attorney"], ["Personal injury (PI)", "Law covering harm to a person caused by someone else’s negligence"], ["Client-centric work", "Tasks built around one client’s needs and communication"], ["Departmentalized work", "One function done all day inside a firm’s department"]]
};

B[2] = {title: "Law Firm Communication",
  mc: [
    ["Inbound calls", 100, "When answering, a VA should first state…", ["The firm’s name and their own name", "The attorney’s schedule", "The client’s case number", "Nothing until the caller speaks"], 0, "A professional greeting names the firm and the VA."],
    ["Inbound calls", 200, "A caller must wait. Good hold practice is to…", ["Ask permission and check back regularly", "Put them on hold without a word", "Leave them on hold until the attorney is free", "Hang up and call back later"], 0, "Managing hold time keeps the caller valued."],
    ["Inbound calls", 300, "What does ‘stay in control’ of a call mean?", ["Guide the conversation to its purpose politely", "Talk over the caller", "End calls quickly", "Refuse to answer questions"], 0, "You steer the call, calmly and courteously."],
    ["Inbound calls", 400, "After every call, a VA should…", ["Document it in the case notes", "Delete the call log", "Email the client a summary of legal advice", "Do nothing unless asked"], 0, "Proper documentation is part of the call."],
    ["Outbound calls", 100, "Which is a common outbound call?", ["Following up with a provider for records", "Answering the main line", "Receiving a fax", "Taking a walk-in client"], 0, "Provider, adjuster, client and court calls are outbound calls."],
    ["Outbound calls", 200, "Calling an adjuster, a VA should have ready…", ["The claim number and client details", "The attorney’s personal phone", "The settlement amount offered", "Nothing; the adjuster has it all"], 0, "Be ready: claim number, names, date of loss."],
    ["Outbound calls", 300, "When calling opposing counsel, the right tone is…", ["Professional and neutral", "Friendly and chatty", "Aggressive", "Casual"], 0, "Keep it professional; share nothing beyond the purpose."],
    ["Privilege", 200, "Attorney-client privilege protects…", ["Confidential communications between the client and the attorney", "Every document in the firm", "The firm’s billing rates", "Public court records"], 0, "Privilege covers confidential lawyer–client communications."],
    ["Privilege", 300, "Confidential vs privileged: which is true?", ["Privileged communications are a narrower, protected part of confidential information", "They are the same thing", "Confidential means public", "Privilege applies to insurers"], 0, "All privileged material is confidential, not the other way round."],
    ["Privilege", 400, "A VA could break privilege by…", ["Discussing a client’s case where others can hear", "Saving notes in the CMS", "Calling the client back", "Using the firm’s softphone"], 0, "Conversations overheard by third parties put privilege at risk."],
    ["Softphones", 100, "A softphone is…", ["Phone software that runs on a computer", "A phone with a soft case", "A landline", "A pager"], 0, "Softphones let remote VAs handle calls from a computer."],
    ["Softphones", 300, "A risk of softphones in a confidential setting is…", ["Calls overheard or devices not secured", "They can’t transfer calls", "They only work in the office", "They record nothing"], 0, "Secure the device and the space you work in."],
    ["Callers", 200, "Which caller should a VA be most careful sharing case details with?", ["Someone claiming to be the client’s relative", "The client after verifying identity", "The attorney", "Your supervisor"], 0, "Verify identity and authorization before sharing anything."],
    ["Callers", 500, "Who decides what can be disclosed to court staff, adjusters or opposing counsel?", ["The firm’s policy and the attorney", "The VA’s judgment alone", "The caller", "The client’s family"], 0, "Follow the firm’s rules; ask the attorney when unsure."]
  ],
  list: [
    ["Name a best practice for inbound calls", [["Answer quickly", 26, ["answer fast", "answer promptly"]], ["Set a positive tone", 22, ["positive tone", "be friendly", "friendly greeting"]], ["Manage hold time", 19, ["hold time", "check back on hold"]], ["Stay in control", 17, ["control the call", "stay in control of the call"]], ["Document the call", 16, ["take notes", "documentation", "proper documentation"]]]],
    ["Name a common outbound call a Legal VA makes", [["Client contact", 25, ["client calls", "calling clients", "client follow up"]], ["Provider calls", 22, ["medical provider", "provider", "records follow up"]], ["Adjuster calls", 20, ["insurance adjuster", "adjuster", "insurance calls"]], ["Court calls", 17, ["court", "court staff"]], ["Opposing counsel", 16, ["defense counsel", "opposing attorney"]]]],
    ["Name a way to keep a call professional", [["Clear greeting", 24, ["greeting", "introduce yourself", "introduction"]], ["Active listening", 22, ["listening", "listen"]], ["Avoid dead air", 19, ["no dead air", "dead air"]], ["Proper hold etiquette", 18, ["hold etiquette", "ask before hold", "check back on hold"]], ["Confirm next steps", 17, ["next steps", "recap", "summarize"]]]]
  ],
  term: [["Inbound call", "A call that comes in to the firm"], ["Outbound call", "A call the VA makes for the firm"], ["Hold time", "How long a caller waits on hold"], ["Attorney-client privilege", "Protection of confidential lawyer–client communications"], ["Opposing counsel", "The lawyer on the other side of the case"], ["Adjuster", "The insurance company’s person who handles a claim"], ["Softphone", "Calling software on a computer"]]
};

B[3] = {title: "Personal Injury Process Flow",
  mc: [
    ["Stages", 100, "What is the first stage of a personal injury case?", ["Legal intake", "Settlement", "Disbursement", "Litigation"], 0, "Every case starts with intake and consultation."],
    ["Stages", 200, "After intake, the firm investigates and…", ["Opens claims with the insurers", "Disburses the settlement", "Files the closing statement", "Ends the case"], 0, "Investigation and opening claims come early."],
    ["Stages", 300, "A demand is sent…", ["After treatment, with the bills and records", "Before the client is signed", "On the day of the accident", "After disbursement"], 0, "The demand packages treatment, bills and records."],
    ["Stages", 400, "Which comes last in a settled case?", ["Disbursement", "Negotiation", "Demand", "Treatment"], 0, "Money is disbursed after settlement and liens are resolved."],
    ["Stages", 500, "When settlement talks fail, the case may go to…", ["Litigation", "Intake", "Treatment", "Disbursement"], 0, "Litigation is the court path when there is no settlement."],
    ["Claims", 100, "Liability determination answers which question?", ["Who is at fault", "How much treatment costs", "Who the client’s doctor is", "When the client was born"], 0, "Liability is about fault."],
    ["Claims", 200, "Policy limits tell the firm…", ["The most the insurer will pay under the policy", "The attorney’s fee", "The client’s deductible only", "The court’s deadline"], 0, "Limits cap what a policy pays."],
    ["Claims", 300, "Why do medical bills and records matter so much?", ["They prove the injuries and damages in the demand", "They replace the police report", "They set the attorney’s fee", "They close the case"], 0, "Records and bills are the evidence of damages."],
    ["Roles", 100, "Who books consultations and keeps the attorney’s calendar?", ["Calendar management / appointment setter", "Lien negotiator", "Claims specialist", "Medical records specialist"], 0, "Scheduling is the calendar role."],
    ["Roles", 200, "Who opens claims and sends LORs to insurers?", ["Claims specialist", "Receptionist", "Lien negotiator", "Scheduler"], 0, "The claims specialist handles insurance claims."],
    ["Roles", 300, "Who requests medical bills and records from providers?", ["Medical records specialist", "Receptionist", "Intake specialist", "Opposing counsel"], 0, "Records requests are the medical records role."],
    ["Roles", 400, "Who negotiates medical bill reductions after settlement?", ["Lien negotiator", "Receptionist", "Intake specialist", "Adjuster"], 0, "Reductions and lien resolution come before disbursement."],
    ["Roles", 500, "Who keeps the client updated while they treat?", ["Client communication specialist", "Court staff", "The adjuster", "Opposing counsel"], 0, "Regular client updates prevent worry and missed treatment."],
    ["Evidence", 200, "Which document mainly proves the injuries in a PI demand?", ["Medical records", "The retainer agreement", "The LOR", "The closing statement"], 0, "Records show the injuries and the care."],
    ["Evidence", 400, "Photos of the vehicles and injuries mostly help…", ["Show what happened and how serious it was", "Set the attorney’s fee", "Book the consultation", "Release PHI"], 0, "Photos support both liability and damages."]
  ],
  list: [
    ["Name a stage of a personal injury case", [["Intake", 22, ["legal intake", "consultation"]], ["Investigation", 18, ["investigate"]], ["Treatment", 17, ["medical treatment"]], ["Demand", 16, ["demand letter"]], ["Settlement", 15, ["negotiation", "negotiations", "settle"]], ["Disbursement", 12, ["disburse", "closing"]]]],
    ["Name a role in a PI firm’s workflow", [["Receptionist", 20, ["reception", "front desk"]], ["Intake specialist", 19, ["intake"]], ["Claims specialist", 18, ["claims", "insurance communication"]], ["Medical records specialist", 17, ["records", "medical records", "provider communication"]], ["Lien negotiator", 14, ["lien", "negotiator"]], ["Scheduler", 12, ["calendar", "appointment setter", "calendar management"]]]],
    ["Name a document that proves damages", [["Medical bills", 26, ["bills", "itemized bills"]], ["Medical records", 24, ["records", "treatment records"]], ["Lost wage documentation", 18, ["lost wages", "wage loss", "pay stubs"]], ["Photos of injuries", 17, ["photos", "pictures"]], ["Property damage estimate", 15, ["repair estimate", "pd estimate", "vehicle damage"]]]]
  ],
  term: [["Intake", "The first conversation that gathers the facts of a possible case"], ["Liability", "Legal responsibility for the accident"], ["Policy limit", "The most an insurance policy will pay"], ["Demand", "The letter asking the insurer to pay, with the evidence"], ["Settlement", "The agreed amount that resolves the claim"], ["Disbursement", "Paying out the settlement to everyone owed"], ["Litigation", "Taking the case to court"]]
};

B[4] = {title: "Receptionist Training",
  mc: [
    ["Callers", 100, "An existing client calls about their case. Before sharing details you must…", ["Verify their identity", "Transfer to the attorney", "Ask for payment", "Read them the file"], 0, "Authenticate first: name, DOL, DOB, claim or case number."],
    ["Callers", 200, "Which details authenticate a caller in the guide’s Reception scorecard?", ["Name, DOL, DOB, claim no. and case no.", "Favourite color and pet’s name", "Only their phone number", "Their attorney’s name"], 0, "These are the authentication items scored on the mock call."],
    ["Callers", 300, "A caller says they are from an insurer and wants the client’s medical history. You…", ["Share nothing without authorization; route per firm policy", "Read the records to them", "Email the file", "Give it if they sound official"], 0, "Authorization comes before disclosure."],
    ["Callers", 400, "A ‘sales’ caller presses for the attorney’s direct line and staff names. This may be…", ["Social engineering", "A new client", "Court staff", "A provider"], 0, "Don’t give out internal details to unknown callers."],
    ["Routing", 100, "A cold transfer means…", ["Sending the call without introducing it", "Introducing the caller first", "Adding a third person", "Ending the call"], 0, "Cold = straight through; warm = introduce first."],
    ["Routing", 200, "A warm transfer means…", ["You introduce the caller before connecting", "You hang up first", "The caller holds for an hour", "You transfer to voicemail"], 0, "Warm transfers give context to the person receiving the call."],
    ["Routing", 300, "Bringing the client, attorney and adjuster onto one call is a…", ["Conference call", "Cold transfer", "Voicemail", "Call park"], 0, "Conference calls join several parties."],
    ["Disclosure", 200, "‘Authorization vs information disclosure’ means…", ["Confirm someone is authorized before sharing information", "Share first, verify later", "Disclose only to family", "Never answer questions"], 0, "Check authorization, then decide what you may share."],
    ["Disclosure", 300, "A relative calls about a client’s case without authorization on file. You…", ["Take a message; share no case details", "Tell them the settlement amount", "Give the adjuster’s number and claim no.", "Read the notes"], 0, "Without authorization, take a message only."],
    ["Disclosure", 400, "Court staff call about a hearing. A receptionist should…", ["Take the details accurately and route to the case team", "Reschedule the hearing", "Ignore it", "Give legal advice"], 0, "Accurate messages to the right person."],
    ["Tasks", 100, "A fax arrives for a client. The receptionist should…", ["Save it to the right case with the right name", "Leave it in the inbox", "Forward it to their personal email", "Delete it"], 0, "Saving documents and faxes is a core reception task."],
    ["Tasks", 200, "The Reception scorecard’s last items include…", ["Closing spiel, time management, dead air, clarity, tone", "Lien balances", "Net sheet math", "Dec page limits"], 0, "Call quality items close the scorecard."],
    ["Tasks", 300, "A mass tort client calls for an update. The receptionist should…", ["Give the general status the firm allows and log the call", "Promise a settlement date", "Say nothing at all", "Transfer to opposing counsel"], 0, "Long-duration cases need patient, consistent updates within policy."],
    ["Tasks", 500, "A caller wants to pay a bill by phone. You should…", ["Follow the firm’s payment-call process", "Take card details on a sticky note", "Refuse all payments", "Send them to an adjuster"], 0, "Payment calls follow a set decision tree."]
  ],
  list: [
    ["Name a caller a receptionist handles", [["Existing client", 22, ["client", "current client"]], ["Potential client", 19, ["new client", "lead", "prospective client"]], ["Insurance company", 17, ["adjuster", "insurer", "insurance"]], ["Medical provider", 16, ["provider", "doctor", "clinic"]], ["Opposing counsel", 14, ["defense attorney", "opposing attorney"]], ["Court staff", 12, ["court", "clerk"]]]],
    ["Name an item on the Reception mock call scorecard", [["Introduction", 18, ["introduction of law firm and name", "greeting"]], ["Authentication", 17, ["verify identity", "verification"]], ["Customer service", 15, ["service"]], ["Listening skills", 14, ["listening", "active listening"]], ["Closing spiel", 12, ["closing"]], ["Tone of voice", 12, ["tone"]], ["Transfer procedure", 12, ["transfer", "call transfer"]]]],
    ["Name a way to route a call", [["Warm transfer", 26, ["warm"]], ["Cold transfer", 22, ["cold", "blind transfer"]], ["Take a message", 20, ["message", "take message"]], ["Conference call", 17, ["conference", "three way call"]], ["Voicemail", 15, ["send to voicemail"]]]]
  ],
  term: [["Cold transfer", "Passing a call on without introducing it"], ["Warm transfer", "Introducing the caller before connecting them"], ["Conference call", "A call joining three or more people"], ["Authentication", "Verifying a caller is who they say they are"], ["Social engineering", "Tricking staff into giving out private information"], ["Dead air", "Silence on the line while the caller waits"], ["Closing spiel", "The standard way a call is ended"]]
};

B[5] = {title: "Calendaring & Appointment Setting",
  mc: [
    ["Rules", 100, "In the guide’s mock-call rules, new client consults are scheduled on…", ["Tuesdays and Thursdays", "Mondays only", "Any weekday", "Weekends"], 0, "New consults: Tuesdays and Thursdays."],
    ["Rules", 200, "How much buffer does the attorney need before and after every meeting?", ["15 minutes", "5 minutes", "30 minutes", "None"], 0, "A 15-minute buffer before and after."],
    ["Rules", 200, "The calendar should be kept in which time zone?", ["EST", "PST", "The caller’s", "UTC"], 0, "The guide’s rule: EST."],
    ["Rules", 300, "Phone consults only happen between…", ["9:30 AM and 3:00 PM", "8:00 AM and 5:00 PM", "Noon and 6:00 PM", "Any time"], 0, "Phone consults 9:30 AM – 3:00 PM; the attorney calls the client."],
    ["Rules", 300, "How many new client consults per day, at most?", ["3", "1", "5", "No limit"], 0, "Max three a day."],
    ["Rules", 400, "A requested slot is taken. You should…", ["Offer 2–3 alternative times", "Double-book it", "Tell them to call back next week", "Book the lunch hour"], 0, "Offer two or three alternatives."],
    ["Rules", 400, "Preparation, strategy and settlement meetings last at most…", ["45 minutes", "30 minutes", "1 hour", "2 hours"], 0, "45 minutes max; conferences 1 hour; others 30."],
    ["Rules", 500, "A same-day booking needs…", ["The attorney’s approval", "Nothing special", "The client’s deposit", "A court order"], 0, "Same-day bookings require attorney approval."],
    ["Habits", 100, "When should the attorney get a reminder?", ["An email reminder the day before", "None", "Only after the meeting", "A week later"], 0, "Set an email reminder a day before."],
    ["Practice", 200, "A good event title names…", ["The meeting type and the client", "Only ‘Meeting’", "The VA’s name", "The time zone"], 0, "e.g. Client Consultation Meeting – [Client Name]."],
    ["Practice", 300, "What must the VA confirm for a phone consult?", ["The client’s callback number", "The client’s bank details", "The adjuster’s email", "Nothing"], 0, "The attorney calls the client, so confirm the number."],
    ["Habits", 300, "The two-minute rule says…", ["If a task takes under two minutes, do it now", "Every call lasts two minutes", "Wait two minutes before answering", "Reminders go two minutes early"], 0, "Small tasks done at once keep the list short."],
    ["Practice", 400, "Follow-up calls are not scheduled…", ["In the mornings", "In the afternoons", "On Tuesdays", "Before 5 PM"], 0, "The guide’s rule: no follow-ups in the morning."],
    ["Practice", 500, "Which minimum information must you collect from a caller?", ["Name, callback number, DOB and DOL", "Only their name", "Their insurance limits", "Their employer"], 0, "The guide’s minimum: name, callback number, DOB, DOL."],
    ["Events", 200, "A conference (such as a mediation) is blocked for at most…", ["1 hour", "15 minutes", "30 minutes", "3 hours"], 0, "Conferences 1 hour; preparation, strategy and settlement meetings 45 minutes; others 30."],
    ["Events", 300, "A routine follow-up call is blocked for…", ["30 minutes", "45 minutes", "1 hour", "2 hours"], 0, "Meetings other than conferences and prep/strategy/settlement are 30 minutes."]
  ],
  list: [
    ["Name a type of meeting the attorney’s calendar holds", [["Client consultation", 22, ["consultation", "consult", "new client consult"]], ["Case strategy meeting", 17, ["strategy meeting", "strategy"]], ["Deposition preparation", 16, ["deposition prep", "depo prep"]], ["Document signing", 15, ["signing", "settlement signing"]], ["Mediation preparation", 15, ["mediation"]], ["Follow-up call", 15, ["follow up", "status update"]]]],
    ["Name a scheduling rule from the guide", [["15-minute buffer", 22, ["buffer", "15 minute buffer"]], ["Consults on Tuesdays and Thursdays", 20, ["tuesday and thursday", "tuesdays", "thursdays"]], ["Max 3 consults a day", 18, ["three consults", "max three"]], ["Offer 2–3 alternatives", 15, ["alternative times", "offer alternatives"]], ["EST time zone", 13, ["est", "eastern"]], ["Reminder the day before", 12, ["email reminder", "reminder"]]]],
    ["Name a detail to put in a calendar event", [["Client name", 24, ["name", "client"]], ["Meeting type", 20, ["type", "event type", "title"]], ["Date and time", 20, ["date", "time"]], ["Time zone", 13, ["est", "timezone"]], ["Callback number", 12, ["phone number", "phone", "number"]], ["Reminder", 11, ["email reminder", "alert"]]]]
  ],
  term: [["Buffer", "Free time kept before and after a meeting"], ["Time zone", "The region’s clock the event is set in"], ["Reminder", "An alert sent before the event"], ["Recurring event", "An event that repeats on a schedule"], ["Double-booking", "Two events in the same slot"], ["Two-minute rule", "Do any task under two minutes right away"], ["Same-day booking", "An appointment set for the day it is asked for"]]
};

B[6] = {title: "Intake Specialist Training",
  mc: [
    ["Intake call", 100, "An intake call starts by finding out…", ["What happened, when and where", "The settlement value", "The attorney’s fee", "The adjuster’s email"], 0, "Facts of the incident come first."],
    ["Intake call", 200, "Which document helps show who was at fault in a car accident?", ["The police report", "The retainer agreement", "The HIPAA form", "The closing statement"], 0, "Police and traffic accident reports support liability."],
    ["Intake call", 300, "Before booking a consultation, the intake specialist should screen for…", ["Conflicts of interest", "The client’s favourite doctor", "The opposing lawyer’s hobbies", "Nothing"], 0, "Conflict checks protect the firm and the client."],
    ["Intake call", 400, "Two people from the same accident want the firm. This is a possible…", ["Conflict between multiple claimants", "Double fee", "Court requirement", "Insurance fraud"], 0, "Multiple claimants from one incident can conflict."],
    ["Intake call", 500, "A caller says another firm already represents them. You should…", ["Flag a prior-representation conflict for the attorney", "Sign them anyway", "Tell them to fire the other firm", "Hang up"], 0, "Existing representation is a red flag to raise."],
    ["Intake packet", 100, "The agreement that hires the firm is the…", ["Retainer / agreement for representation", "Police report", "Dec page", "Lien"], 0, "The representation agreement starts the relationship."],
    ["Intake packet", 200, "The HIPAA authorization lets the firm…", ["Request the client’s medical records", "Sign checks", "Talk to the defendant", "Skip the demand"], 0, "HIPAA authorization releases protected health information."],
    ["Intake packet", 300, "Personal injury firms usually charge…", ["A contingency fee: a share of the recovery", "An hourly fee up front", "A flat monthly fee", "Nothing ever"], 0, "Contingency: paid only if there is a recovery."],
    ["Intake packet", 300, "The ISO Claim Search disclosure helps find…", ["Other claims the client has made", "The client’s credit score", "The court date", "The doctor’s address"], 0, "ISO searches show prior claims."],
    ["Intake packet", 400, "The 3rd Party Insurance Affidavit is sent with…", ["The 3P LOR", "The closing statement", "The HIPAA form", "The net sheet"], 0, "The guide’s convention: ‘3P … LOR with Affidavit’."],
    ["Intake packet", 400, "Consent to release Medicare/Medicaid information matters because…", ["Government payers may have a lien on the settlement", "It speeds up treatment", "It replaces HIPAA", "It sets the fee"], 0, "Government liens must be identified and paid."],
    ["SA upload", 200, "The Notes tab entry for the uploaded Intake Packet starts with…", ["Received [file name without your name]…", "Sent LORs…", "mm/dd/yyyy Sent LV request…", "Billing Reduction Request…"], 0, "Received … Saved in Docs Tab. Thank you. (VA’s Name)"],
    ["SA upload", 300, "Uploading the wrong file or a duplicate is a no-no because…", ["VAs can’t delete documents in SA", "It costs money", "It emails the client", "It closes the case"], 0, "The guide: VAs do not have permission to delete documents."],
    ["SA upload", 500, "Which scorecard criterion covers renaming the extracted documents?", ["Document Handling (Extraction, Renaming & Organization)", "Tone of Voice", "Alternative Time Offering", "Calculation & Excel Proficiency"], 0, "From the Intake Packet demo scorecard."],
    ["Screening", 200, "Why get the date of the accident early on an intake call?", ["The time limit to bring the claim runs from it", "It sets the fee", "It picks the doctor", "It books the adjuster"], 0, "The statute of limitations runs from the date of loss."],
    ["Screening", 400, "A caller’s facts are unclear and they have no insurance details. You should…", ["Gather what you can and pass it to the attorney to decide", "Turn them away yourself", "Promise a settlement", "Give legal advice"], 0, "The attorney decides whether to take a case; the VA gathers the facts."]
  ],
  list: [
    ["Name a document in the intake packet", [["Agreement for representation", 18, ["retainer", "retainer agreement", "representation agreement", "contract"]], ["HIPAA authorization", 17, ["hipaa", "hipaa form"]], ["Client information sheet", 15, ["client info sheet", "information sheet"]], ["Statement of client's rights", 13, ["client rights", "statement of rights"]], ["ISO claim search disclosure", 13, ["iso", "iso claim search"]], ["3rd party insurance affidavit", 12, ["affidavit", "third party affidavit"]], ["Police report consent", 12, ["police report", "affidavit of consent to release police report"]]]],
    ["Name a conflict to watch for at intake", [["Prior representation", 22, ["existing representation", "already has a lawyer", "another firm"]], ["Multiple claimants", 19, ["same incident", "two claimants"]], ["Former client", 17, ["former client conflict"]], ["Insurance carrier", 15, ["insurer conflict", "insurance carrier conflict"]], ["Government entity", 14, ["public entity", "government"]], ["Medical provider / lien", 13, ["provider conflict", "lien conflict"]]]],
    ["Name a fact to get on an intake call", [["Date of the accident", 22, ["date of loss", "dol", "accident date", "date"]], ["What happened", 20, ["facts", "how it happened", "accident description"]], ["Injuries", 19, ["injury", "treatment"]], ["Where it happened", 15, ["location", "place"]], ["Insurance information", 13, ["insurance", "insurer"]], ["Police report", 11, ["police report number", "report number"]]]]
  ],
  term: [["Intake", "Gathering a new caller’s facts and documents"], ["Contingency fee", "A fee paid as a share of what is recovered"], ["Retainer agreement", "The contract that hires the firm"], ["HIPAA authorization", "The client’s permission to release medical records"], ["Conflict of interest", "A clash that could stop the firm taking the case"], ["ISO claim search", "A search of a person’s prior insurance claims"], ["DOL", "Date of loss: the day of the accident"], ["Police report", "The officer’s report of the accident"]]
};

B[7] = {title: "Claims Specialist Training",
  mc: [
    ["LOR", 100, "A Letter of Representation tells the insurer…", ["The firm now represents the client", "The case is settled", "The client is suing the firm", "The bill is paid"], 0, "From then on, contact goes through the firm."],
    ["LOR", 200, "The 1P LOR goes to…", ["The client’s own insurer", "The at-fault driver’s insurer", "The court", "The doctor"], 0, "1P = first party, the client’s carrier."],
    ["LOR", 200, "The 3P LOR goes to…", ["The at-fault party’s insurer", "The client’s insurer", "The client", "The hospital"], 0, "3P = third party, the defendant’s carrier."],
    ["LOR", 300, "Before saving the final LOR, there must be…", ["No highlighted text left", "A signature from the client", "A settlement figure", "Two copies"], 0, "The guide: no highlighted texts in the final output."],
    ["LOR", 400, "‘F/E’ in the LOR template stands for…", ["Fax or Email", "File Exhibit", "Final Edition", "Form Entry"], 0, "Keep only the method used and fill in the number or address."],
    ["Sharing", 200, "Opening a claim with the 3P insurer, which may you share?", ["Client’s first and last name and the license plate", "Client’s SSN", "Client’s date of birth", "Client’s VIN and email"], 0, "Name and vehicle plate are fine; never DOB, SSN, VIN or email."],
    ["Sharing", 300, "Which must you NOT share with the 3P adjuster?", ["The client’s Social Security Number", "The client’s first name", "The law firm’s phone number", "The city and state"], 0, "SSN, DOB, VIN and email stay private."],
    ["Sharing", 400, "Why may the client’s name and plate be shared?", ["They are typically in the police report the adjuster has", "Adjusters can see everything anyway", "The client asked", "It speeds payment"], 0, "The guide’s note: the adjuster likely has the police report."],
    ["Policies", 100, "The Declarations (Dec) page shows…", ["The policy’s coverages and limits", "The client’s medical history", "The attorney’s fee", "The court date"], 0, "Dec pages summarize the policy."],
    ["Policies", 200, "‘25/50/25’ on a policy usually means…", ["Per-person BI, per-accident BI, property damage limits (in thousands)", "Three deductibles", "Payment dates", "Claim numbers"], 0, "Bodily injury per person / per accident / property damage."],
    ["Policies", 300, "UM/UIM coverage helps when…", ["The at-fault driver has no or too little insurance", "The client is at fault", "The car is stolen", "The client moves"], 0, "Uninsured/underinsured motorist coverage."],
    ["Policies", 400, "MedPay / PIP coverage pays…", ["The client’s medical bills regardless of fault, up to a limit", "The attorney’s fee", "Property damage only", "The defendant’s bills"], 0, "First-party medical coverage."],
    ["Policies", 500, "Liability vs coverage: which is true?", ["Liability is who is at fault; coverage is what the policy pays for", "They mean the same", "Coverage decides fault", "Liability is the deductible"], 0, "Both are needed for a claim to pay."],
    ["Claims", 300, "After sending the LOR, the claims specialist watches for…", ["The insurer’s acknowledgment and claim details", "The client’s birthday", "The court verdict", "Nothing"], 0, "The LOR acknowledgment confirms the claim and adjuster."]
  ],
  list: [
    ["Name a coverage on an auto policy", [["Bodily injury liability", 22, ["bodily injury", "bi", "liability"]], ["Property damage", 18, ["pd", "property damage liability"]], ["UM/UIM", 17, ["uninsured motorist", "underinsured motorist", "um", "uim"]], ["MedPay", 15, ["med pay", "medical payments", "pip", "personal injury protection"]], ["Collision", 14, ["collision coverage"]], ["Comprehensive", 14, ["comp", "comprehensive coverage"]]]],
    ["Name something you must NOT share with a 3P adjuster", [["Date of birth", 26, ["dob", "birthday"]], ["Social Security Number", 26, ["ssn", "social security"]], ["VIN", 24, ["vehicle identification number"]], ["Email address", 24, ["email"]]]],
    ["Name a party in an insurance claim", [["Client", 24, ["claimant", "our client", "injured person"]], ["Adjuster", 22, ["claims adjuster", "insurance adjuster"]], ["Insurance company", 20, ["insurer", "carrier", "insurance"]], ["At-fault driver", 19, ["defendant", "insured", "other driver"]], ["Law firm", 15, ["attorney", "lawyer", "firm"]]]]
  ],
  term: [["LOR", "Letter of Representation: notice that the firm represents the client"], ["1P", "First party: the client’s own insurer"], ["3P", "Third party: the at-fault party’s insurer"], ["Dec page", "The page listing a policy’s coverages and limits"], ["UM/UIM", "Coverage when the at-fault driver has no or too little insurance"], ["MedPay", "Medical payments coverage, regardless of fault"], ["Adjuster", "The insurer’s person who handles the claim"], ["Claim number", "The insurer’s reference for the claim"]]
};

B[8] = {title: "Medical Records Specialist Training",
  mc: [
    ["PHI", 100, "PHI stands for…", ["Protected Health Information", "Personal Home Insurance", "Primary Hospital Invoice", "Private Health Index"], 0, "Health information protected by HIPAA."],
    ["PHI", 200, "Mishandling PHI can lead to…", ["Legal, ethical and financial consequences for the firm", "A faster settlement", "Nothing at all", "A bigger fee"], 0, "PHI breaches are serious."],
    ["PHI", 300, "Which is a safe way to handle PHI?", ["Share only with those who need it, via firm systems", "Forward to a personal email", "Read it aloud in public", "Post it in a group chat"], 0, "Minimum necessary, inside firm systems."],
    ["Requests", 100, "To request records, the provider usually needs…", ["The client’s signed HIPAA authorization", "The settlement amount", "The police report only", "Nothing"], 0, "The MedLOR goes with the HIPAA form."],
    ["Requests", 200, "In the MedLOR, the VA ticks…", ["Bills, records, or both, as the request needs", "The client’s blood type", "The court", "The adjuster’s name"], 0, "The guide: tick the boxes for bills & records."],
    ["Requests", 300, "The MedLOR file name ends with…", ["MedLOR with Unsworn COR and HIPAA mm.dd.yy (va’s first name)", "LOR mm.dd.yy", "Reduction Request", "Closing Statement"], 0, "MED - Lien Holder(Provider) - MedLOR with Unsworn COR and HIPAA mm.dd.yy (name)."],
    ["Requests", 400, "For an NPIM doctor, the file name must also include…", ["The doctor’s name after the provider", "The client’s DOB", "The fax number", "The claim number"], 0, "e.g. JML(Fabito Anesthesia Pain Center Dr. Fabito)."],
    ["Requests", 500, "A fax to 702-998-2171 is sent to which address?", ["+17029982171@metrofax.com", "702-998-2171@metrofax.com", "17029982171@gmail.com", "+1 702 998 2171"], 0, "No dashes, +1 in front, @metrofax.com at the end."],
    ["Follow-up", 200, "After sending a records request, the VA should…", ["Follow up on a schedule and log each attempt", "Wait indefinitely", "Call the client daily", "Send it to the adjuster"], 0, "Follow-up and documentation keep requests moving."],
    ["Follow-up", 300, "After sending a fax, check back in…", ["5–10 minutes for the transmission confirmation", "A week", "Never", "One minute and resend"], 0, "The guide: return 5–10 minutes later to confirm."],
    ["Liens", 200, "A medical lien means…", ["The provider is owed from the settlement", "The client owes the firm", "The insurer denied the claim", "The case is closed"], 0, "Providers who treat on a lien get paid from the settlement."],
    ["Liens", 300, "Lien vs letter of protection: which is true?", ["Both promise the provider payment from the settlement; a lien may be a legal claim", "They are unrelated", "A lien is a police record", "LOPs are for insurers"], 0, "Both affect what the client nets."],
    ["Liens", 400, "Why verify a lien balance before settlement?", ["So the net to the client is accurate", "To increase the fee", "To close the claim", "To change providers"], 0, "Accurate balances avoid disputes at disbursement."],
    ["Documents", 300, "Which document lists treatment charges line by line?", ["Itemized bill", "Discharge summary", "Police report", "Dec page"], 0, "Bills show the charges; records show the care."]
  ],
  list: [
    ["Name a document a medical records specialist requests", [["Medical records", 24, ["records", "treatment records"]], ["Itemized bills", 22, ["bills", "billing", "medical bills"]], ["Diagnostic reports", 16, ["imaging", "x-ray", "mri", "radiology"]], ["Discharge summary", 14, ["discharge"]], ["Lien balance", 12, ["lien verification", "lien"]], ["Certificate of records", 12, ["cor", "certification"]]]],
    ["Name a way to keep PHI safe", [["Share only with those who need it", 24, ["minimum necessary", "need to know"]], ["Use firm systems only", 22, ["no personal email", "firm email"]], ["Check the recipient before sending", 20, ["double check recipient", "verify recipient"]], ["Don’t discuss it in public", 18, ["private space", "no public"]], ["Lock your screen", 16, ["lock computer", "secure device"]]]],
    ["Name a step in a medical records request", [["Prepare the MedLOR", 20, ["medlor", "draft the medlor", "prepare request"]], ["Attach the HIPAA", 18, ["hipaa", "hipaa authorization"]], ["Send by fax or email", 18, ["fax", "send", "email"]], ["Confirm transmission", 16, ["fax confirmation", "confirmation", "confirm"]], ["Follow up", 15, ["follow-up", "call the provider"]], ["Log it in the notes", 13, ["notes", "document it", "log it"]]]]
  ],
  term: [["PHI", "Protected Health Information"], ["HIPAA", "The U.S. law protecting health information"], ["MedLOR", "The medical letter of representation sent to a provider"], ["COR", "Certificate of records: the provider’s certification of the records"], ["Lien", "A provider’s claim to be paid from the settlement"], ["HCFA", "The health insurance claim form used for bills"], ["DOS", "Date of service: when the treatment happened"], ["LV", "Lien balance verification request"]]
};

B[9] = {title: "Lien Negotiator Training",
  mc: [
    ["Liens", 100, "A lien negotiator mainly…", ["Asks providers and lienholders to reduce what’s owed", "Sets the attorney’s fee", "Opens claims", "Answers the main line"], 0, "Reductions put more money in the client’s pocket."],
    ["Liens", 200, "Which is a statutory lien?", ["A lien created by law, such as Medicare", "A provider’s handshake deal", "The attorney’s fee", "A parking ticket"], 0, "Statutory liens come from statute; Medicare is the classic one."],
    ["Liens", 300, "An ERISA plan lien comes from…", ["An employer-sponsored health plan", "The police", "The court clerk", "The defendant"], 0, "ERISA governs employer health plans."],
    ["Liens", 400, "Providers consider a reduction based on…", ["Settlement amount, client hardship and the bill", "The VA’s tone only", "The weather", "The adjuster’s mood"], 0, "Persuasive documentation drives outcomes."],
    ["Closing", 100, "The closing statement shows…", ["The full financial breakdown of the settlement", "The police report", "The intake form", "The LOR"], 0, "Gross, fees, costs, liens and the client’s net."],
    ["Closing", 200, "The net sheet summarizes…", ["What the client receives after deductions", "The doctor’s notes", "The policy limits", "The court date"], 0, "It must match the closing statement exactly."],
    ["Closing", 300, "The settlement release, once signed…", ["Ends the client’s right to pursue that claim further", "Can be undone any time", "Is only a draft", "Pays the doctor"], 0, "A release is binding; review it with the client."],
    ["Closing", 400, "Why review the release terms with the client?", ["So they understand what rights they give up", "To increase the fee", "To delay the case", "It isn’t needed"], 0, "Misunderstanding a release causes disputes."],
    ["Math", 200, "Settlement $30,000, fee 1/3, costs $1,000, liens $6,000. The client nets…", ["$13,000", "$20,000", "$14,000", "$23,000"], 0, "30,000 − 10,000 − 1,000 − 6,000 = 13,000."],
    ["Math", 300, "A $4,000 bill reduced by 25% becomes…", ["$3,000", "$3,750", "$1,000", "$2,500"], 0, "4,000 × 0.75 = 3,000."],
    ["Math", 400, "Settlement $50,000 with a 40% fee. The fee is…", ["$20,000", "$12,500", "$16,500", "$25,000"], 0, "50,000 × 0.40 = 20,000."],
    ["Naming", 200, "The reduction request’s subject line is…", ["Billing Reduction Request | LAST NAME, FIRST NAME", "Reduction – client", "Please reduce", "LOR – client"], 0, "Type of Request | LAST NAME, FIRST NAME of the client."],
    ["Naming", 300, "The closing statement file is named…", ["Client’s Name – Closing Statement (VA’s name)", "MED – Closing", "INS – 1P – Closing", "Net Sheet Final"], 0, "From the Day 18 conventions."],
    ["Ethics", 500, "Pressuring a client to accept a settlement is…", ["Not appropriate: the decision is the client’s", "Always fine", "Required by law", "The VA’s job"], 0, "Inform, don’t pressure."]
  ],
  list: [
    ["Name a line on a closing statement", [["Gross settlement", 24, ["settlement amount", "gross"]], ["Attorney’s fee", 22, ["fee", "attorney fees", "contingency fee"]], ["Case costs", 18, ["costs", "expenses"]], ["Medical liens", 18, ["liens", "medical bills", "provider bills"]], ["Client’s net", 18, ["net to client", "client net", "net"]]]],
    ["Name a type of lien", [["Medical provider lien", 26, ["provider lien", "medical lien"]], ["Medicare", 20, ["medicare lien"]], ["Medicaid", 18, ["medicaid lien"]], ["ERISA plan", 18, ["erisa", "health plan"]], ["Child support", 18, ["child support lien"]]]],
    ["Name something that lowers the client’s net", [["Attorney’s fee", 30, ["fee", "attorney fees", "attorneys fee"]], ["Medical liens", 28, ["liens", "medical bills", "provider liens"]], ["Case costs", 24, ["costs", "expenses"]], ["Health plan reimbursement", 18, ["subrogation", "health insurance", "erisa"]]]]
  ],
  term: [["Reduction", "Lowering what a provider or lienholder is paid"], ["Closing statement", "The full breakdown of where the settlement goes"], ["Net sheet", "What the client receives after deductions"], ["Settlement release", "The signed agreement ending the claim"], ["ERISA", "The law over employer health plans and their liens"], ["Statutory lien", "A lien created by law, like Medicare’s"], ["Disbursement", "Paying out the settlement"]]
};

/* ---------- mock documents for the Blur / Zoom reveal (made-up names and numbers) ---------- */
const docs = [
  {id: "police", lesson: [3, 6], answer: "Traffic Collision (Police) Report", choices: ["Traffic Collision (Police) Report", "Declarations Page", "HIPAA Authorization", "Closing Statement"],
   html: `<h3>STATE OF NEVADA · TRAFFIC COLLISION REPORT</h3><p class="dk-row"><b>Report No.</b> 26-004417 <b>Date of collision</b> 03/02/2026 <b>Time</b> 17:40</p><table><tr><th>Party 1 (Driver)</th><th>Party 2 (Driver)</th></tr><tr><td>DOE, JOHN TEST<br>Plate 8XYZ221 · Toyota Camry</td><td>SAMPLE, ALEX<br>Plate 7ABC904 · Ford F-150</td></tr></table><p><b>Primary collision factor:</b> Unsafe lane change (Party 2)</p><p class="dk-sketch">[ intersection diagram ]</p><p><b>Officer:</b> Badge 3381 · Las Vegas Metro</p>`},
  {id: "decpage", lesson: [7], answer: "Declarations (Dec) Page", choices: ["Declarations (Dec) Page", "Letter of Representation", "Medical Lien", "Police Report"],
   html: `<h3>AUTO POLICY DECLARATIONS</h3><p class="dk-row"><b>Policy No.</b> NV-88-1203 <b>Policy period</b> 01/15/2026 – 07/15/2026</p><table><tr><th>Coverage</th><th>Limits</th><th>Premium</th></tr><tr><td>Bodily Injury Liability</td><td>$25,000 / $50,000</td><td>$212</td></tr><tr><td>Property Damage</td><td>$20,000</td><td>$96</td></tr><tr><td>Uninsured Motorist</td><td>$25,000 / $50,000</td><td>$54</td></tr><tr><td>Medical Payments</td><td>$5,000</td><td>$18</td></tr></table><p><b>Named insured:</b> DOE, JOHN TEST</p>`},
  {id: "hipaa", lesson: [6, 8], answer: "HIPAA Authorization", choices: ["HIPAA Authorization", "Retainer Agreement", "Net Sheet", "ISO Claim Search Disclosure"],
   html: `<h3>AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION</h3><p>I, <b>John Test Doe</b>, DOB 01/01/1980, authorize any health care provider to release my medical records and billing to <b>Sample Law Firm</b>.</p><p><b>Relationship to patient:</b> Self</p><p><b>This authorization is valid until:</b> one year from the date signed</p><p class="dk-sign">Signature ______________________ Date 03/05/2026</p>`},
  {id: "lor", lesson: [7], answer: "Letter of Representation (LOR)", choices: ["Letter of Representation (LOR)", "Settlement Release", "Medical Records Request", "Traffic Ticket"],
   html: `<p class="dk-head">SAMPLE LAW FIRM · 100 Main St, Las Vegas NV</p><p>SENT VIA E-MAIL</p><p>Empire Fire and Marine Insurance Company<br>Attn: Claims Department</p><p><b>RE:</b> Our client: John Test Doe · Your insured: Alex Sample · Claim No.: 26-77812 · Date of loss: 03/02/2026</p><p>Please be advised that this office represents the above-named client for injuries sustained in the above accident. Please direct all further communication to this office…</p>`},
  {id: "medlor", lesson: [8], answer: "MedLOR (records & bills request)", choices: ["MedLOR (records & bills request)", "Dec Page", "Closing Statement", "Police Report"],
   html: `<p class="dk-head">SAMPLE LAW FIRM</p><p>Lyons Physical Therapy · Medical Records Department</p><p><b>RE:</b> Patient: John Test Doe · DOB 01/01/1980 · DOL 03/02/2026</p><p>This office represents the above patient. Please provide:</p><p>☑ Itemized billing &nbsp; ☑ Complete medical records &nbsp; for dates of service from 03/02/2026 to present.</p><p>Enclosed: HIPAA authorization and Unsworn Certificate of Records.</p>`},
  {id: "bill", lesson: [8, 9], answer: "Itemized medical bill", choices: ["Itemized medical bill", "Declarations Page", "Retainer Agreement", "Police Report"],
   html: `<h3>STATEMENT OF ACCOUNT · SOUTHWEST ORTHOPEDICS</h3><p class="dk-row"><b>Patient</b> John Test Doe <b>Account</b> 55-1029</p><table><tr><th>DOS</th><th>CPT</th><th>Description</th><th>Charge</th></tr><tr><td>03/09/2026</td><td>99204</td><td>New patient visit</td><td>$350.00</td></tr><tr><td>03/09/2026</td><td>72100</td><td>X-ray lumbar spine</td><td>$185.00</td></tr><tr><td>03/23/2026</td><td>97110</td><td>Therapeutic exercise</td><td>$120.00</td></tr></table><p><b>Balance due:</b> $655.00</p>`},
  {id: "closing", lesson: [9], answer: "Closing Statement", choices: ["Closing Statement", "Itemized bill", "LOR", "HIPAA Authorization"],
   html: `<h3>SETTLEMENT CLOSING STATEMENT</h3><p class="dk-row"><b>Client</b> DOE, JOHN TEST <b>Case</b> Auto – 03/02/2026</p><table><tr><td>Gross settlement</td><td>$30,000.00</td></tr><tr><td>Attorney’s fee (33⅓%)</td><td>– $10,000.00</td></tr><tr><td>Case costs</td><td>– $1,000.00</td></tr><tr><td>Medical liens (reduced)</td><td>– $6,000.00</td></tr><tr><th>Net to client</th><th>$13,000.00</th></tr></table><p class="dk-sign">Client signature ______________ Date ________</p>`},
  {id: "retainer", lesson: [6], answer: "Agreement for Representation (retainer)", choices: ["Agreement for Representation (retainer)", "Settlement Release", "Dec Page", "ISO Claim Search"],
   html: `<h3>AGREEMENT FOR REPRESENTATION</h3><p>The client, <b>John Test Doe</b>, retains Sample Law Firm to represent them in their claim arising from the accident of 03/02/2026.</p><p><b>Fees.</b> The attorney’s fee is contingent on recovery: 33⅓% of any amount recovered before litigation…</p><p><b>Costs.</b> Case costs are advanced by the firm and repaid from the recovery…</p><p class="dk-sign">Client ______________ Attorney ______________</p>`},
  {id: "release", lesson: [9], answer: "Settlement Release", choices: ["Settlement Release", "Letter of Representation", "Police Report", "Medical Lien"],
   html: `<h3>RELEASE OF ALL CLAIMS</h3><p>For the sole consideration of <b>$30,000.00</b>, the undersigned, <b>John Test Doe</b>, releases and forever discharges <b>Alex Sample</b> and their insurer from any and all claims arising from the accident of 03/02/2026…</p><p>The undersigned has read this release and understands its terms.</p><p class="dk-sign">Releasor ______________ Witness ______________</p>`},
  {id: "lien", lesson: [8, 9], answer: "Medical lien", choices: ["Medical lien", "Net sheet", "Dec page", "Retainer agreement"],
   html: `<h3>NOTICE OF MEDICAL LIEN</h3><p><b>Desert Spine Center</b> claims a lien on any settlement, judgment or recovery obtained by <b>John Test Doe</b> for treatment rendered from 03/04/2026 to 05/30/2026.</p><p><b>Lien amount:</b> $8,240.00</p><p>The patient’s attorney agrees to protect this lien and pay it from the proceeds…</p>`}
];

root.FT_KC_BANK = {lessons: B, docs};
})(typeof window !== "undefined" ? window : this);
