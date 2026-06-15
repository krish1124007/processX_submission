# Decision Log

## 1. How I structured the policy as input to the AI

I did **not** dump the whole policy document into the prompt and ask "what's missing." That
produces vague, non-deterministic flags that can't be traced back to a rule.

Instead I converted **Section 5** of the Falls Management Policy into a **per-day, atomic
checklist** (`src/lib/policy-checklist.ts`). Each requirement is one object:

```ts
{ id, label, requireAll?, vagueHint?, conditional? }
```

- `id` — every flag traces to exactly one requirement → fully explainable.
- `requireAll` — multi-part items (e.g. vitals = BP/HR/RR/Temp/SpO2) so the AI can name the
  *specific* missing sub-part.
- `vagueHint` — encodes the policy's own language ("use the 0–10 scale", "state clearly, not
  just 'moving around'") so the AI can tell `VAGUE` from `PRESENT`.
- `conditional` — for requirements that only apply when a precondition exists (see #2).

The AI receives **only that day's checklist** plus the note, and returns a `PRESENT / MISSING /
VAGUE` verdict per `id` (forced into a Zod-validated JSON shape). The AI judges; deterministic
code decides what becomes a flag. This keeps the LLM in a narrow, auditable role — no
LangChain/LangGraph needed.

## 2. One thing the AI suggested that I changed / rejected

When I first listed every Section 5 requirement as an equal, always-checked item, the AI
(reasonably, from its point of view) **flagged every requirement that the note didn't explicitly
mention** — including the Day 3 *"escalate to care manager if the resident has not stabilised"*
requirement.

That broke the **John Doe sanity check**: John Doe is stable and his Day 3 note is a clean
closure, yet the checker raised a false "escalation missing" flag (the README requires **zero**
flags for John Doe).

I rejected the "treat all requirements identically" approach and introduced a `conditional`
flag for requirements whose precondition may not apply (escalation-if-unstable, "any changes to
the care plan", "resolution of any outstanding actions"). The prompt now tells the model to mark
these **PRESENT** when the precondition clearly doesn't apply. After this change John Doe went
from 1 flag → **0 flags** on Day 3, and Peter Parker still flags correctly across all 3 days.

*(Related: the structured-output call originally used a JSON-schema mode that Groq didn't handle
well; I switched to `groq-sdk` with `response_format: json_object` + manual Zod validation, which
is more reliable.)*

## 3. One decision the AI could not make for me

**Whether to reason across days.** The checker evaluates each day's note in isolation. So on
Day 3 it cannot *know* whether an "outstanding action" was actually opened on Day 1/2 — it only
sees Day 3. For **Robert Singh**, the X-ray was ordered on Day 1 and resolved on Day 2, but his
Day 3 note doesn't restate it, so the checker flags "outstanding actions not resolved." That is
arguably a false positive.

The AI can't decide this for me — it's an architecture choice about how much context to feed.
I resolved it deliberately: keep each day **independent** (simpler, predictable, and a missing
closure statement *is* a real documentation gap), mark such items `conditional` to reduce
noise, and treat a Day-3-in-isolation flag as a **prompt to confirm** rather than a hard error.
The clean fix — feeding prior days as context on Day 3 — is noted as future work.

### Could the checker produce a wrong flag? How I catch it.
Yes — being LLM-based, it can occasionally under-flag (e.g. it let Alice Day 1's missing **NOK
notification time** pass) or over-flag a conditional item. Two guards:
1. **Evidence quotes** — every flag includes the exact words it's based on, so a reviewer can
   instantly see whether the flag is justified.
2. **The John Doe baseline** — a fully-compliant note that must always produce zero flags; if it
   ever flags, the checklist/prompt has drifted. `npx tsx src/scripts/audit-samples.ts` runs this
   check on demand.
