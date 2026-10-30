// 🔑 The answer keys of the assessments trainees answer on the platform (js/ft-assess.js): read by worker.js only
// (/api/assess/grade), never sent to a page (.assetsignore keeps this file out of the site). Each item: its points, the
// answer (a matching item's letter; else what a right answer says, for the AI's check), and for an answer checked without
// the AI, `accept`: a pattern a right answer matches. An essay (`essay`) is scored out of its points by the AI, against
// `answer` as the model answer; without the AI it waits for the trainer.
// The keys follow the assessments' own answer keys (the Facilitator's Notes of Day 2); a trainer corrects them here.
export const ASSESS_KEYS = {
  // 📄 Common Terms Used – Assessment: 20 matching items and 7 short answers, 27 points
  "14sz5f3HTQKmryc7Upvlc6qua008rPnmw": {
    title: "Common Terms Used – Assessment",
    items: {
      m1: { pts: 1, answer: "I" }, m2: { pts: 1, answer: "A" }, m3: { pts: 1, answer: "M" }, m4: { pts: 1, answer: "S" },
      m5: { pts: 1, answer: "P" }, m6: { pts: 1, answer: "B" }, m7: { pts: 1, answer: "G" }, m8: { pts: 1, answer: "C" },
      m9: { pts: 1, answer: "Q" }, m10: { pts: 1, answer: "D" }, m11: { pts: 1, answer: "L" }, m12: { pts: 1, answer: "H" },
      m13: { pts: 1, answer: "O" }, m14: { pts: 1, answer: "J" }, m15: { pts: 1, answer: "E" }, m16: { pts: 1, answer: "K" },
      m17: { pts: 1, answer: "T" }, m18: { pts: 1, answer: "N" }, m19: { pts: 1, answer: "F" }, m20: { pts: 1, answer: "R" },
      s1: { pts: 1, answer: "Mr. Sam Martin, the driver of the speeding car that ran the red light", accept: "sam|martin" },
      s2: { pts: 1, answer: "Jordan (our client; his girlfriend is a client too)", accept: "jordan" },
      s3: { pts: 1, answer: "Jordan, the driver", accept: "jordan" },
      s4: { pts: 1, answer: "Yes: Jordan's girlfriend, the passenger", accept: "girlfriend|passenger" },
      s5: { pts: 1, answer: "June 16, 2021", accept: "june\\s*16|6/16|06/16" },
      s6: { pts: 1, answer: "June 16, 2023: Nevada's statute of limitations for personal injury is 2 years", accept: "2023" },
      s7: { pts: 1, answer: "June 16, 2024: Washington's statute of limitations for personal injury is 3 years", accept: "2024" }
    }
  },
  // 📄 Auto Liability Insurance – Assessment: 15 identification items (1 point each) and 6 short essays (5 points each), 45 points
  "11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C": {
    title: "Auto Liability Insurance – Assessment",
    items: {
      i1: { pts: 1, answer: "Policy limit", accept: "policy\\s*limit" },
      i2: { pts: 1, answer: "25/50/20: $25,000 bodily injury per person, $50,000 bodily injury per accident, $20,000 property damage", accept: "25.*50.*20" },
      i3: { pts: 1, answer: "Bodily Injury coverage pays for the injuries (medical expenses) of other people the insured hurts in an accident; Property Damage coverage pays for the damage the insured causes to other people's property, such as their car", accept: "(injur|medical).*(property|car|vehicle)|(property|car|vehicle).*(injur|medical)" },
      i4: { pts: 1, answer: "Declarations page (Dec page)", accept: "declaration|dec\\s*page" },
      i5: { pts: 1, answer: "Bodily injury liability per person: $50,000 for each injured person", accept: "per\\s*person|each\\s*person" },
      i6: { pts: 1, answer: "Bodily injury liability per accident: $100,000 for all injured people in one accident", accept: "per\\s*accident|each\\s*accident|per\\s*occurrence" },
      i7: { pts: 1, answer: "Comprehensive coverage", accept: "comprehensive" },
      i8: { pts: 1, answer: "Deductible", accept: "deductible" },
      i9: { pts: 1, answer: "An at-fault (tort) state", accept: "at[\\s-]*fault|tort" },
      i10: { pts: 1, answer: "Uninsured/Underinsured Motorist coverage (UM/UIM)", accept: "uninsured|underinsured|um\\s*/?\\s*uim" },
      i11: { pts: 1, answer: "Comprehensive coverage", accept: "comprehensive" },
      i12: { pts: 1, answer: "Liability insurance (auto liability coverage)", accept: "liability" },
      i13: { pts: 1, answer: "Medical Payments coverage (MedPay)", accept: "med\\s*pay|medical\\s*payment" },
      i14: { pts: 1, answer: "Rental reimbursement coverage", accept: "rental" },
      i15: { pts: 1, answer: "A commercial (rideshare) policy limit: the company's commercial auto policy, usually $1,000,000", accept: "commercial|rideshare|ride\\s*share" },
      e1: { pts: 5, essay: true, answer: "The 3P's policy pays at most $25,000 for the bodily injuries of any one person, and at most $50,000 in total for everyone injured in that one accident, however many people are hurt." },
      e2: { pts: 5, essay: true, answer: "Having rejected UM/UIM, the insured has no coverage of their own if the at-fault driver has no insurance or too little: their own injuries beyond the tortfeasor's limits are not covered by their policy. Example: hit by an uninsured driver, with $20,000 in medical bills, they can claim nothing under UM/UIM and must look to the driver personally or their own health coverage." },
      e3: { pts: 5, essay: true, answer: "Each of the three people (the driver, his wife and his daughter) can recover up to the per-person limit, but all three together cannot recover more than the per-accident limit: the per-accident amount is shared among them, so if their claims add up to more than it, the total is capped and divided." },
      e4: { pts: 5, essay: true, answer: "Explain that a deductible is the amount he pays first, out of pocket, before the insurer pays: once he shows the repair costs he has paid reach his collision deductible, the insurance pays the rest of the covered repair costs, up to its limit." },
      e5: { pts: 5, essay: true, answer: "Treatment ($27,000) is over the 3P's $25,000 per-person limit, so the 3P's coverage won't pay it all: the CM would have the VA confirm the 3P's policy limits, open or notify the claim on the 1P's own UIM (and MedPay/PIP where there is any), and track the bills against the limits, so that the client's losses beyond the 3P's limit can be recovered from the 1P's own coverage." },
      e6: { pts: 5, essay: true, answer: "Compare each person's bills with the 3P's per-person bodily injury limit and the three together ($111,000) with the per-accident limit on the Dec Page: whatever is over a person's limit, or over the per-accident total, isn't covered by the 3P, so the coverage doesn't fully suit these expenses and the excess must come from other coverage (the 1P's UIM, MedPay) or the client." }
    }
  },
  // 📝 Day 3's Reception Listening Activity: the five Harbor & Pine practice calls (build/calls/pi-reception-activity.json),
  // each logged on the platform (js/ft-listening.js "recact"): its 5 data points (1 point each), the obstacle (1 point) and
  // the VA's response (an essay, 2 points); 40 points. source: the answers are the trainee's Call Listening log
  // (listening:<id>.logs.recact[n][field]), item c<n>_<field>
  "recact": {
    title: "Reception Listening Activity: Harbor & Pine Calls",
    source: "listening",
    context: "a reception listening activity: the trainee listened to five practice calls to a personal injury law firm's front desk and logged each call's data points and its challenge",
    items: {
      // Call 1: The Missing Email
      c1_caller: { pts: 1, answer: "Gloria Benton, existing client" },
      c1_callback: { pts: 1, answer: "(555) 019-2047 (home)" },
      c1_verified: { pts: 1, answer: "Yes: full name, DOB 07/05/1960 (she said 1950 first; the VA asked again), DOL 09/03/2026" },
      c1_reason: { pts: 1, answer: "Never got the confirmation email for her appointment with Dr. Herrera, Bayview Orthopedics, Thu 11/12/2026 at 1:00 PM; the email on file was missing a dot" },
      c1_action: { pts: 1, answer: "Gave her the clinic's address and phone; corrected email (g.benton60@mail.com) noted on the file; message to Mara Quintero (Case Manager) to resend the confirmation today" },
      c1_obstacle: { pts: 1, answer: "Mixed-up details: An older client never got the email about the doctor's appointment her case manager set up, and gives the wrong birth year at first." },
      c1_response: { pts: 2, essay: true, answer: "Didn't accept a birth year that didn't match: asked again instead of guessing, then found why the email never arrived and gave her the address on the call." },
      // Call 2: Third Time Calling
      c2_caller: { pts: 1, answer: "Andre Wallace, existing client" },
      c2_callback: { pts: 1, answer: "(555) 012-5583, any time" },
      c2_verified: { pts: 1, answer: "Yes: full name, DOB 02/15/1985 (read back, as he said it fast), DOL 07/22/2026" },
      c2_reason: { pts: 1, answer: "His third call about the Letter of Protection for Gulf Coast Pain Center, which won't book his injection without it; the request is with Devin Shaw, due tomorrow" },
      c2_action: { pts: 1, answer: "Tried a warm transfer to Devin Shaw (Records Coordinator, on another call); urgent message for a callback today; the repeat calls noted on the file" },
      c2_obstacle: { pts: 1, answer: "A frustrated repeat caller: A client in pain calls again about the letter his pain clinic needs before it will book his injection." },
      c2_response: { pts: 2, essay: true, answer: "Apologized once and acted: checked the file at once, tried to reach the person handling it, and passed on an urgent message with the whole story." },
      // Call 3: Which Office?
      c3_caller: { pts: 1, answer: "Kayla Jensen, front desk, Sun City Imaging (a medical provider)" },
      c3_callback: { pts: 1, answer: "(555) 011-6630; the firm's fax confirmed: (555) 010-4410" },
      c3_verified: { pts: 1, answer: "A provider, not the client: the patient named as Tomas Reyes; nothing about a file confirmed" },
      c3_reason: { pts: 1, answer: "Faxing an MRI report; asked for the Brandon office's number (all offices' calls come to reception and all faxes go to the records department)" },
      c3_action: { pts: 1, answer: "Confirmed the fax number; told her to fax it attention Devin Shaw (Records Coordinator) with the patient's name and DOB on the cover sheet; Devin told to watch for it" },
      c3_obstacle: { pts: 1, answer: "An unclear request: An imaging centre's front desk wants a fax number for the firm's other office and doesn't say who the records are for." },
      c3_response: { pts: 2, essay: true, answer: "Asked who was calling and what the fax was about before routing it, confirmed the number she had, and confirmed nothing about the patient." },
      // Call 4: Just Confirming
      c4_caller: { pts: 1, answer: "Nicole Avery, existing client" },
      c4_callback: { pts: 1, answer: "(555) 013-9126 (confirmed as still current)" },
      c4_verified: { pts: 1, answer: "Yes: full name, DOB 05/28/1983, DOL 04/09/2026" },
      c4_reason: { pts: 1, answer: "To confirm her meeting with Atty. Celeste Harbor tomorrow, Thu 10/29/2026 at 4:00 PM, at the office" },
      c4_action: { pts: 1, answer: "Confirmed the meeting from the calendar; the call noted on the file" },
      c4_obstacle: { pts: 1, answer: "A short call: A client calls to confirm tomorrow's meeting with her attorney: a quick call where it's easy to skip a step." },
      c4_response: { pts: 2, essay: true, answer: "Kept it quick without cutting corners: verified her before reading out the appointment, and checked the callback number on file." },
      // Call 5: No Ride Tomorrow
      c5_caller: { pts: 1, answer: "Darnell Pryce, existing client" },
      c5_callback: { pts: 1, answer: "(555) 014-7751, taken before the transfer" },
      c5_verified: { pts: 1, answer: "Yes: full name, DOB 03/13/1994, DOL 05/30/2026" },
      c5_reason: { pts: 1, answer: "His veterans' shuttle can't take him to tomorrow's follow-up with Dr. Herrera, Bayview Orthopedics (10/29/2026, 10:30 AM), and he has no car; wants to reschedule" },
      c5_action: { pts: 1, answer: "Warm transfer to Mara Quintero (Case Manager, ext. 610), briefed on the internal line: the verification, the appointment, the reason and the callback number" },
      c5_obstacle: { pts: 1, answer: "Rescheduling and a warm transfer: A client whose usual ride fell through can't get to tomorrow's doctor's appointment and asks to reschedule." },
      c5_response: { pts: 2, essay: true, answer: "Took the callback number before the hold, and briefed Mara fully so the client didn't have to tell his story twice." }
    }
  }
};
