# Falls Checker — Test Notes & Expected Output

AI ko test karne ke liye ready notes. Har note ke neeche **expected output** likha hai —
yaani checker ko kya flag karna chahiye. Yeh interview prep ke liye bhi hai
("predict what it will flag before you run it").

> ⚠️ Note: temperature 0 hai par LLM thoda vary kar sakta hai. Status (MISSING vs VAGUE)
> kabhi-kabhi swap ho sakta hai, lekin **kaun-kaun se requirements flag honge** wo consistent rehna chahiye.
> Yaad rahe: **sirf fully-compliant note save hota hai** — koi bhi flag = note save nahi hoga.

---

## DAY 1 — Incident Report

### ✅ 1A. Day 1 — COMPLIANT (saare 12 items present)

```
    Fall occurred on 10 June 2025 at 14:30 in Room 12B (resident's bedroom). The fall was
    unwitnessed; staff found the resident on the floor. On discovery the resident reported
    pain 4/10 in the right hip, was alert and orientated to time and place, had no visible
    laceration or bruising, and was able to move all four limbs. Vital signs taken: BP 138/82,
    HR 88, RR 18, Temp 36.7C, SpO2 97% on room air. Immediate actions: resident was not moved
    until clinical assessment was complete, then assisted to bed and a cold pack applied to the
    hip. GP Dr Sarah Lim notified at 14:50; she advised to monitor and arrange an X-ray if pain
    worsens or weight-bearing becomes difficult. NOK (daughter) Mary Jones notified at 15:05;
    she acknowledged and will visit this evening. Conditional actions advised by GP: X-ray if
    pain worsens, transfer to hospital if unable to weight-bear by tomorrow. Risk factors:
    two prior falls in the past 6 months, on Warfarin and antihypertensives, walking frame was
    not within reach at the time of the fall. Care plan reviewed and updated: Yes. Falls risk
    score reassessed: High.
```

**Expected output:** `compliant: true`, **0 flags → SAVED** ✅

---

### ❌ 1B. Day 1 — VERY INCOMPLETE (almost everything missing/vague)

```
Resident found on the floor in the afternoon. Seemed to be in a bit of pain but otherwise
okay. Helped her back to bed. Vitals stable. Informed the doctor and the family. Will keep
an eye on her.
```

**Expected output:** `compliant: false`, **NOT SAVED** ❌ — flags:

| id | status | Why |
|---|---|---|
| `fall_datetime` | VAGUE | "in the afternoon" — no exact date/time |
| `fall_location` | MISSING | no room/area given |
| `witnessed` | MISSING | witnessed/unwitnessed not stated |
| `resident_condition` | VAGUE | "bit of pain" — no 0–10 score, no consciousness/injury/limb check |
| `vital_signs` | VAGUE | "vitals stable" — no actual BP/HR/RR/Temp/SpO2 readings |
| `gp_notification` | VAGUE | "informed the doctor" — no GP name, time, or advice |
| `nok_notification` | VAGUE | "the family" — no name, time, or response |
| `conditional_actions` | MISSING | no conditional GP instruction recorded |
| `risk_factors` | MISSING | no falls history / meds / mobility aid status |
| `care_plan_reviewed` | MISSING | no Yes/No on care plan review |
| `falls_risk_score` | MISSING | no Low/Medium/High score |

*(`immediate_actions` is borderline PRESENT — "Helped her back to bed" is an action stated.)*

---

### ❌ 1C. Day 1 — MOSTLY GOOD but a few precise gaps

```
Fall on 11 June 2025 at 09:15 in the dining room, witnessed by a carer. Resident in pain,
alert and orientated, no visible injury, moving all limbs. BP 142/86, HR 90, RR 17,
Temp 36.5, SpO2 98%. Resident not moved until assessed, then assisted to a chair. GP
Dr Lim called at 09:30, advised paracetamol and to observe. NOK son Robert called, he
acknowledged. Risk factors: prior fall last month, on sedatives, no mobility aid in use.
Care plan updated: Yes. Falls risk: Medium.
```

**Expected output:** `compliant: false`, **NOT SAVED** ❌ — flags:

| id | status | Why |
|---|---|---|
| `resident_condition` | VAGUE | "in pain" — pain mentioned but **no 0–10 number** (other sub-parts OK) |
| `nok_notification` | VAGUE | name + response present but **time of call missing** |
| `conditional_actions` | MISSING/VAGUE | "observe" given but no conditional threshold (X-ray if worsens, transfer point) |

*Everything else (date/time, location, witnessed, vitals, actions, GP, risk factors, care plan, risk score) is PRESENT.*

---

## DAY 2 — Continuation Note

### ✅ 2A. Day 2 — COMPLIANT

```
Day 2 follow-up. Pain has improved from 4/10 to 2/10 in the right hip. Resident is able to
full weight-bear and walked to the bathroom with her frame without pain. No new symptoms —
no new bruising, swelling, or confusion noted. Observations: BP 132/80, HR 82, RR 16,
Temp 36.6, SpO2 98%. GP follow-up: X-ray was arranged for this afternoon as advised on
Day 1. Care plan updated to include hourly rounding; change documented.
```

**Expected output:** `compliant: true`, **0 flags → SAVED** ✅

---

### ❌ 2B. Day 2 — TOO VAGUE

```
Resident comfortable today and moving around well. Obs fine. Family updated.
```

**Expected output:** `compliant: false`, **NOT SAVED** ❌ — flags:

| id | status | Why |
|---|---|---|
| `pain_status_update` | VAGUE | "comfortable" — no 0–10 score, no improved/worsened/resolved trend |
| `mobility_status` | VAGUE | "moving around well" — policy explicitly wants **full weight-bear without pain**, not "moving around" |
| `new_symptoms` | MISSING | not addressed (no "no new symptoms" statement) |
| `vitals_one_set` | VAGUE | "obs fine" — no actual readings |
| `gp_followup` | MISSING | Day 1 conditional action (X-ray) status not mentioned |
| `care_plan_changes` | MISSING | "family updated" is not a care-plan change |

> Note: Day 2 is a continuation note, so the checker should **NOT** flag the missing incident
> description, who was notified on Day 1, or the original risk factors.

---

## DAY 3 — Closure / Escalation Note

### ✅ 3A. Day 3 — COMPLIANT (clean closure)

```
Day 3 closure note. Pain confirmed fully resolved, now 0/10. Mobility has returned to
baseline — resident is independently mobile with her frame as she was before the fall.
Outstanding action resolved: X-ray result reviewed by GP Dr Lim — no fracture. The 72-hour
post-fall monitoring period is now complete and the incident is formally closed. Falls
prevention plan reviewed and discussed with the resident and her daughter; the frame is to
be kept within reach at all times. Resident is stable, no escalation required.
```

**Expected output:** `compliant: true`, **0 flags → SAVED** ✅

---

### ❌ 3B. Day 3 — RESIDENT NOT STABLE, no escalation (escalation case)

```
Resident still has some pain and isn't moving as well as before the fall. Still waiting on
the X-ray. Will continue monitoring.
```

**Expected output:** `compliant: false`, **NOT SAVED** ❌ — flags:

| id | status | Why |
|---|---|---|
| `pain_outcome` | VAGUE | "some pain" — not confirmed resolved, and no escalation plan documented |
| `mobility_outcome` | VAGUE | "isn't moving as well" — reduced, but no follow-up plan |
| `outstanding_resolution` | MISSING/VAGUE | "waiting on the X-ray" — outstanding action not resolved |
| `formal_closure` | MISSING | no statement that monitoring period is complete |
| `prevention_plan_reviewed` | MISSING | no falls-prevention discussion with resident/family |
| `escalation_if_unstable` | **MISSING** | resident clearly **not stabilised** but no escalation to care manager documented — this is the key Day 3 flag |

---

## Quick reference — kya test karta hai

- **1A / 2A / 3A** → green path. Note save hona chahiye, koi flag nahi.
- **1B** → "lazy note" — har cheez vague/missing. Maximum flags.
- **1C** → precision test — sirf pain-scale, NOK-time, aur conditional-action pakadne chahiye, baaki PRESENT.
- **2B** → continuation rule test — "moving around" VAGUE pakde, par Day 1 cheezein flag na kare.
- **3B** → escalation logic test — unstable resident pe `escalation_if_unstable` flag aaye.
