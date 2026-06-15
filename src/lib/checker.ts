/**
 * Falls Policy Checker — AI core.
 *
 * Yahan AI ka role narrow hai: ek progress note ko us din ke policy checklist ke
 * against classify karna. Decision logic (flag banana) deterministic code mein hai.
 *
 * Flow:
 *   getChecklistForDay(day)  ->  buildPrompt()  ->  Groq generateObject (Zod schema)
 *       ->  verdicts[]  ->  aggregate  ->  flags[]
 */

import "dotenv/config";
import Groq from "groq-sdk";
import { z } from "zod";
import {
  getChecklistForDay,
  type DayChecklist,
  type PolicyRequirement,
  type RequirementStatus,
} from "./policy-checklist";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/** Groq model — fast aur instruction-following ke liye accha. */
const MODEL = "llama-3.3-70b-versatile";

/* ----------------------------- Output schema ----------------------------- */
/** LLM ko ye exact shape return karna FORCE hai. */
const VerdictSchema = z.object({
  verdicts: z.array(
    z.object({
      id: z
        .string()
        .describe("Requirement id, exactly as given in the checklist"),
      status: z
        .enum(["PRESENT", "MISSING", "VAGUE"])
        .describe(
          "PRESENT = fully and specifically documented; MISSING = not mentioned at all; VAGUE = mentioned but not specific enough to meet the policy",
        ),
      evidence: z
        .string()
        .describe(
          "Direct quote from the note that this verdict is based on. Empty string if MISSING.",
        ),
      fixMessage: z
        .string()
        .describe(
          "One plain-English sentence telling the nurse exactly what to add or clarify. Empty string if PRESENT.",
        ),
    }),
  ),
});

type Verdict = z.infer<typeof VerdictSchema>["verdicts"][number];

/* ------------------------------ Public types ------------------------------ */
export interface Flag {
  id: string;
  label: string;
  status: Exclude<RequirementStatus, "PRESENT">;
  evidence: string;
  fixMessage: string;
}

export interface CheckResult {
  day: number;
  title: string;
  compliant: boolean;
  flags: Flag[];
  /** Saare requirements ke verdicts (audit/explainability ke liye) */
  verdicts: { id: string; label: string; status: RequirementStatus }[];
}

/* ------------------------------ Prompt build ------------------------------ */
function renderRequirements(reqs: PolicyRequirement[]): string {
  return reqs
    .map((r, i) => {
      const parts = [`${i + 1}. [id: ${r.id}] ${r.label}`];
      if (r.requireAll?.length) {
        parts.push(
          `   - Must include ALL of: ${r.requireAll.join("; ")}. If any sub-part is missing, mark VAGUE and name the missing sub-part in fixMessage.`,
        );
      }
      if (r.vagueHint) {
        parts.push(`   - Guidance: ${r.vagueHint}`);
      }
      if (r.conditional) {
        parts.push(
          `   - CONDITIONAL: This only applies when its precondition is actually present. If it does not apply (e.g. the resident is stable/resolved, there is no outstanding action, or no care-plan change was needed), mark this PRESENT — do NOT flag it.`,
        );
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

function buildSystemPrompt(checklist: DayChecklist): string {
  const continuationRule =
    checklist.noteType === "continuation"
      ? `\nIMPORTANT — This is a Day 2 CONTINUATION note, not a repeat of Day 1. Do NOT flag the absence of the incident description, who was notified on Day 1, or the original risk factors. Only judge the update fields listed below.`
      : "";

  return `You are a clinical documentation auditor for an aged-care facility. You check a nurse's daily progress note against a Falls Management Policy and report ONLY whether each required item is documented.

Your job is to JUDGE, not to invent. Rules:
- Judge ONLY against the numbered requirements given. Do not add requirements of your own.
- PRESENT = the requirement is documented specifically and completely.
- VAGUE = the topic is mentioned but not specific enough to satisfy the policy (e.g. "in pain" with no 0-10 number, "vitals stable" with no readings, "moving around" instead of weight-bearing status).
- MISSING = the requirement is not addressed at all.
- Never guess clinical facts that are not written in the note. If it is not written, it is not PRESENT.
- Quote the exact words from the note as evidence. For MISSING, evidence is an empty string.
- fixMessage must be specific and actionable so the nurse knows exactly what to add. Empty string when PRESENT.
- Some requirements are marked CONDITIONAL. Only flag them when their precondition is clearly present in the note. If the precondition does not apply (resident stable/resolved, no outstanding action, no care-plan change needed), mark them PRESENT — never flag a conditional item by default.
- Return exactly one verdict per requirement id, using the ids verbatim.${continuationRule}

You MUST output your response ONLY as a JSON object containing a "verdicts" array. The array must contain objects with "id", "status", "evidence", and "fixMessage" keys exactly as specified in the rules. Do not include any other text in your response.`;
}

function buildUserPrompt(checklist: DayChecklist, note: string): string {
  return `${checklist.title}

REQUIREMENTS:
${renderRequirements(checklist.requirements)}

NURSE'S PROGRESS NOTE:
"""
${note.trim()}
"""

Classify each requirement above as PRESENT, MISSING, or VAGUE and return a valid JSON object.`;
}

/* -------------------------------- Runner --------------------------------- */
export async function runChecker(
  day: number,
  note: string,
): Promise<CheckResult> {
  const checklist = getChecklistForDay(day);

  if (!note?.trim()) {
    // Empty note => sab kuch missing, AI call ki zarurat nahi.
    const flags: Flag[] = checklist.requirements.map((r) => ({
      id: r.id,
      label: r.label,
      status: "MISSING",
      evidence: "",
      fixMessage: `Document: ${r.label}.`,
    }));
    return {
      day,
      title: checklist.title,
      compliant: false,
      flags,
      verdicts: checklist.requirements.map((r) => ({
        id: r.id,
        label: r.label,
        status: "MISSING",
      })),
    };
  }

  // Use the native groq-sdk to bypass the AI SDK json_schema issues
  const chatCompletion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(checklist) },
      { role: "user", content: buildUserPrompt(checklist, note) },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const messageContent = chatCompletion.choices[0]?.message?.content || "{}";
  let parsedJson;
  try {
    parsedJson = JSON.parse(messageContent);
  } catch (e) {
    console.error("Failed to parse Groq response as JSON:", messageContent);
    parsedJson = { verdicts: [] };
  }

  // Fallback to empty array if parsing fails or schema doesn't match perfectly
  const object = VerdictSchema.safeParse(parsedJson).success 
    ? (parsedJson as { verdicts: Verdict[] }) 
    : { verdicts: [] };

  // AI ke verdicts ko id se index karo, phir checklist ke against reconcile.
  const byId = new Map<string, Verdict>(object.verdicts.map((v) => [v.id, v]));

  const flags: Flag[] = [];
  const verdicts: CheckResult["verdicts"] = [];

  for (const req of checklist.requirements) {
    const v = byId.get(req.id);
    // Agar AI kisi id ko skip kar de, fail-safe: MISSING maano.
    const status: RequirementStatus = v?.status ?? "MISSING";
    verdicts.push({ id: req.id, label: req.label, status });

    if (status !== "PRESENT") {
      flags.push({
        id: req.id,
        label: req.label,
        status,
        evidence: v?.evidence ?? "",
        fixMessage:
          v?.fixMessage?.trim() || `Document: ${req.label}.`,
      });
    }
  }

  return {
    day,
    title: checklist.title,
    compliant: flags.length === 0,
    flags,
    verdicts,
  };
}
