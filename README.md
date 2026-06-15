# Falls Documentation Checker — ProcessX Take-Home

An AI-assisted checker that reads a nurse's **daily progress note** after a resident fall and
flags whether it meets the documentation requirements in the **Falls Management Policy
(POL-FAL-001)**. Each day (Day 1 → 3) is submitted separately; the checker reports, in plain
English, exactly what is **missing** or **vague** so a nurse knows what to fix.

The policy is the source of truth. The checker's flags are specific and trace back to a
single policy requirement.

---

## How it works (the AI flow)

```
Progress note + day number
   → getChecklistForDay(day)        # policy ko per-day atomic checklist banaya (code)
   → Groq LLM (single call, temp 0) # classify each requirement: PRESENT / MISSING / VAGUE
        · forced JSON via response_format + Zod validation
   → reconcile verdicts by id       # deterministic (code)
   → flags[]  (only MISSING / VAGUE)
```

The AI does **one narrow job**: judge each requirement against the note. All decision logic
(which day, what counts as a flag, the compliance gate) is deterministic code — so every flag
is explainable. No LangChain / LangGraph / vector DB — the policy is small and fixed.

**Key files**
| File | Role |
|---|---|
| `src/lib/policy-checklist.ts` | Policy Section 5 → structured Day 1/2/3 checklist (the policy as AI input) |
| `src/lib/checker.ts` | The AI core — Groq call, prompts, Zod schema, flag aggregation |
| `app/actions.ts` | Server actions — runs the checker, compliance gate, persistence |
| `app/nurse/page.tsx` | Nurse portal — log notes per fall case, view/edit, live AI feedback |
| `app/admin/page.tsx` | Admin — stats, policy management, report history |
| `src/scripts/fill-output.ts` | Fills `Your_Output_File.xlsx` by running the checker on each resident |
| `src/scripts/audit-samples.ts` | Runs the checker on the official John Doe / Peter Parker samples |

---

## Setup

### Prerequisites
- Node.js 18+
- A running **MongoDB** (local: `mongodb://localhost:27017`)
- A **Groq API key** (free: https://console.groq.com)

### 1. Install
```bash
npm install
```

### 2. Environment
Create `.env` in the project root:
```bash
MONGO_URL=mongodb://localhost:27017/processx_db
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Seed (creates a nurse + admin user)
```bash
npm run seed
```

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000 → go to the **Nurse** portal, add a patient, and start a fall report.

---

## Using the checker

### In the app
Nurse portal → pick/create a patient → **New Fall Report** → log Day 1, then Day 2, then Day 3.
- A note is **only saved when it is fully compliant**. If anything is missing/vague, the note is
  rejected and the flags are shown so the nurse can fix and resubmit.
- A completed case (3 days) is archived; any saved note can be edited (the AI re-checks on edit).

### Scripts
```bash
# Sanity-check against the provided samples (expect John Doe = 0 flags, Peter Parker = flagged)
npx tsx src/scripts/audit-samples.ts

# Fill the deliverable spreadsheet for all four residents
npx tsx src/scripts/fill-output.ts
# or with an explicit path:
npx tsx src/scripts/fill-output.ts "C:/path/to/Your_Output_File.xlsx"
```

---

## Tech
Next.js (App Router) · TypeScript · MongoDB/Mongoose · Groq (`llama-3.3-70b-versatile`) ·
Vercel-style structured output via `groq-sdk` + `zod` · Tailwind · `sonner` toasts · `xlsx`.

See [`DECISIONS.md`](./DECISIONS.md) for the design decision log.
