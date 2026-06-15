

export type RequirementStatus = "PRESENT" | "MISSING" | "VAGUE";

export interface PolicyRequirement {
  /** Stable id — har flag isi se trace hota hai */
  id: string;
  /** Nurse-facing label — policy ke wording ke kareeb */
  label: string;
  /** Optional sub-parts; agar diya hai to AI har sub-part ko individually check karega */
  requireAll?: string[];
  /** AI ko VAGUE pakadne ke liye hint — policy ke specific rules */
  vagueHint?: string;
  /**
   * Conditional requirement — sirf tab applies jab precondition ho
   * (e.g. resident unstable, koi outstanding action, ya care-plan change).
   * Agar precondition apply nahi hota to PRESENT maano, flag mat karo.
   * (Reference expected output isi tarah behave karta hai.)
   */
  conditional?: boolean;
}

export interface DayChecklist {
  day: 1 | 2 | 3;
  title: string;
  /** Day 2/3 continuation notes ke liye context */
  noteType: "incident" | "continuation" | "closure";
  requirements: PolicyRequirement[];
}

/* ------------------------------------------------------------------ *
 * DAY 1 — Incident Report (same day as fall)  [Policy 5, Day 1: 12 items]
 * ------------------------------------------------------------------ */
const DAY_1: DayChecklist = {
  day: 1,
  title: "Day 1 — Incident Report (same day as fall)",
  noteType: "incident",
  requirements: [
    {
      id: "fall_datetime",
      label: "Date and time of fall",
      vagueHint: "Sirf date enough nahi — time bhi hona chahiye.",
    },
    {
      id: "fall_location",
      label: "Location of fall (room, area)",
      vagueHint: "'in the facility' vague hai — specific room/area chahiye.",
    },
    {
      id: "witnessed",
      label: "Whether the fall was witnessed",
      vagueHint: "Clearly state witnessed ya unwitnessed.",
    },
    {
      // Pain ko alag requirement rakha — reference output ise "Pain scale" ke roop
      // mein alag flag karta hai, isliye granularity match karti hai.
      id: "pain_scale",
      label: "Pain level documented using the 0–10 scale",
      vagueHint:
        "Numeric 0–10 rating zaroori hai. 'in pain' / 'right hip pain' bina number = flag (Missing/Vague).",
    },
    {
      id: "resident_condition",
      label:
        "Resident condition at discovery: consciousness, visible injury, ability to move limbs",
      vagueHint:
        "Consciousness, visible injury (ya explicitly 'none'), aur limb movement broadly address hone chahiye. Agar condition generally describe ki hai (e.g. 'alert and orientated, no visible injury') to PRESENT — har sub-part ko alag se nitpick mat karo.",
    },
    {
      id: "vital_signs",
      label: "Vital signs taken (BP, HR, RR, Temperature, SpO2)",
      requireAll: ["BP", "HR", "RR", "Temperature", "SpO2"],
      vagueHint:
        "'vitals stable' ya 'obs normal' = VAGUE. Actual values/readings chahiye, aur saare 5.",
    },
    {
      id: "immediate_actions",
      label: "Immediate actions taken",
      vagueHint: "Generic 'monitored resident' vague hai — actual actions likho.",
    },
    {
      id: "gp_notification",
      label: "GP name, time notified, and advice given",
      requireAll: ["GP name", "time GP was notified", "advice given by GP"],
      vagueHint: "'GP informed' without name/time/advice = incomplete.",
    },
    {
      id: "nok_notification",
      label: "NOK name, time notified, and their response",
      requireAll: ["NOK name", "time NOK was notified", "NOK response"],
      vagueHint: "'family told' without name/time/response = incomplete.",
    },
    {
      id: "conditional_actions",
      label:
        "Any conditional actions advised by GP (e.g. X-ray if pain worsens, hospital transfer threshold)",
      vagueHint:
        "Agar GP ne koi conditional instruction di hai to record honi chahiye; agar koi nahi to explicitly 'none advised'.",
    },
    {
      id: "risk_factors",
      label: "Risk factors identified (e.g. falls history, medications)",
      vagueHint:
        "Agar falls history aur/ya current medications mention hain to PRESENT maano. Mobility aid status optional hai — uske bina flag mat karo. Sirf tab flag karo jab risk factors bilkul address hi nahi kiye gaye.",
    },
    {
      id: "care_plan_reviewed",
      label: "Whether care plan has been reviewed and updated — Yes or No",
      vagueHint: "Explicit Yes/No chahiye, ambiguous statement nahi.",
    },
    {
      id: "falls_risk_score",
      label: "Falls risk score reassessed and recorded (Low / Medium / High)",
      vagueHint: "Actual score (Low/Medium/High) record hona chahiye.",
    },
  ],
};


const DAY_2: DayChecklist = {
  day: 2,
  title: "Day 2 — Continuation Note (24 hours post-fall)",
  noteType: "continuation",
  requirements: [
    {
      id: "pain_status_update",
      label:
        "Current pain status — improved, worsened, or resolved? (0–10 scale)",
      vagueHint:
        "Trend (improved/worsened/resolved) + 0–10 number chahiye. Sirf 'comfortable' = VAGUE.",
    },
    {
      id: "mobility_status",
      label:
        "Mobility status — can resident full weight-bear without pain? State clearly.",
      vagueHint:
        "Policy explicitly bolti hai: 'moving around' VAGUE hai — full weight-bear without pain clearly state karo.",
    },
    {
      id: "new_symptoms",
      label:
        "Any new symptoms since Day 1 (new bruising, swelling, confusion, behaviour change)",
      vagueHint:
        "Agar naye symptoms hain to likho; agar nahi to explicitly 'no new symptoms'.",
    },
    {
      id: "vitals_one_set",
      label: "Vital signs — at least one full set of observations",
      requireAll: ["BP", "HR", "RR", "Temperature", "SpO2"],
      vagueHint: "Kam se kam ek poora set — 'vitals fine' VAGUE hai.",
    },
    {
      id: "gp_followup",
      label:
        "GP follow-up — has any conditional action from Day 1 been actioned? (e.g. X-ray arranged, GP reviewed)",
      vagueHint:
        "Day 1 ke conditional/outstanding actions ka status hona chahiye.",
    },
    {
      id: "care_plan_changes",
      label: "Any changes to the care plan since Day 1",
      vagueHint: "Agar changes hue to likho; agar nahi to 'no changes'.",
      conditional: true, // koi change na ho to flag mat karo
    },
  ],
};


const DAY_3: DayChecklist = {
  day: 3,
  title: "Day 3 — Closure or Escalation Note (48 hours post-fall)",
  noteType: "closure",
  requirements: [
    {
      id: "pain_outcome",
      label:
        "Pain outcome — confirmed resolved, OR documented as ongoing with escalation plan",
      vagueHint:
        "Ya to 'resolved' confirm karo, ya 'ongoing' + escalation plan. Bina plan ke 'still some pain' = VAGUE.",
    },
    {
      id: "mobility_outcome",
      label:
        "Mobility — confirmed returned to baseline, OR documented as reduced with follow-up plan",
      vagueHint:
        "Baseline pe wapas confirm, ya reduced + follow-up plan. Bina plan ke reduced = VAGUE.",
    },
    {
      id: "outstanding_resolution",
      label:
        "Resolution of any outstanding actions from Day 1 or Day 2 (e.g. X-ray result, GP review outcome)",
      vagueHint:
        "Pichle dino ke pending actions ka final result/outcome hona chahiye.",
      conditional: true, // koi outstanding action establish na hua ho to flag mat karo
    },
    {
      id: "formal_closure",
      label:
        "Formal incident closure — state that the post-fall monitoring period is complete",
      vagueHint:
        "Explicit closure statement chahiye (72h monitoring complete).",
    },
    {
      id: "prevention_plan_reviewed",
      label:
        "Falls prevention plan reviewed — confirm updated care plan discussed with resident and/or family",
      vagueHint:
        "Discussion with resident/family confirm karo, sirf 'plan updated' kaafi nahi.",
    },
    {
      id: "escalation_if_unstable",
      label:
        "If resident NOT stabilised by Day 3 — escalate to care manager and document escalation",
      vagueHint:
        "Sirf tab flag karo jab note clearly bata raha hai resident unstable/ongoing hai par escalation document nahi hua. Agar resident stable/resolved hai to PRESENT maano.",
      conditional: true, // resident stable ho to applicable nahi
    },
  ],
};

export const FALLS_POLICY_CHECKLIST: Record<1 | 2 | 3, DayChecklist> = {
  1: DAY_1,
  2: DAY_2,
  3: DAY_3,
};

export function getChecklistForDay(day: number): DayChecklist {
  if (day !== 1 && day !== 2 && day !== 3) {
    throw new Error(`Invalid day: ${day}. Falls policy covers Day 1–3 only.`);
  }
  return FALLS_POLICY_CHECKLIST[day as 1 | 2 | 3];
}
