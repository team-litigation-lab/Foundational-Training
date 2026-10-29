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
  }
};
