/**
 * Your_Output_File.xlsx auto-fill (styled, via exceljs).
 *
 * Har resident ke "- Input" sheet se 3 din ke notes padho, checker chalao, aur matching
 * "- Your Output" sheet ko bharo with clean fields + colour-coded rows:
 *     Day | Flag Type | Field | Explanation
 *
 * Run:
 *   npm run fill-output
 *   npx tsx src/scripts/fill-output.ts "C:/path/to/Your_Output_File.xlsx"
 */
import "dotenv/config";
import * as path from "path";
import ExcelJS from "exceljs";
import { runChecker } from "../lib/checker";

const DEFAULT_FILE =
  "C:/Users/Krish/Desktop/processx/Interview-AI/Your_Output_File.xlsx";
const FILE = process.argv[2] || DEFAULT_FILE;

/** Requirement id -> short, readable field name (sample-style). */
const FIELD: Record<string, string> = {
  fall_datetime: "Date/time of fall",
  fall_location: "Location of fall",
  witnessed: "Witnessed status",
  pain_scale: "Pain scale (0–10)",
  resident_condition: "Resident condition",
  vital_signs: "Vital signs",
  immediate_actions: "Immediate actions",
  gp_notification: "GP notification",
  nok_notification: "NOK notification",
  conditional_actions: "GP conditional actions",
  risk_factors: "Risk factors",
  care_plan_reviewed: "Care plan review",
  falls_risk_score: "Falls risk score",
  pain_status_update: "Pain status update",
  mobility_status: "Mobility status",
  new_symptoms: "New symptoms",
  vitals_one_set: "Vital signs",
  gp_followup: "GP follow-up",
  care_plan_changes: "Care plan changes",
  pain_outcome: "Pain outcome",
  mobility_outcome: "Mobility outcome",
  outstanding_resolution: "Outstanding actions",
  formal_closure: "Incident closure",
  prevention_plan_reviewed: "Falls prevention plan",
  escalation_if_unstable: "Escalation",
};

// Colours (ARGB)
const C = {
  headerBg: "FF1E3A5F",
  headerFont: "FFFFFFFF",
  titleFont: "FF1E3A5F",
  missingBg: "FFFDE7E7",
  missingFont: "FFB91C1C",
  vagueBg: "FFFEF6E0",
  vagueFont: "FFB45309",
  completeBg: "FFE7F6EC",
  completeFont: "FF15803D",
  border: "FFE2E8F0",
};

function thinBorder() {
  const s = { style: "thin" as const, color: { argb: C.border } };
  return { top: s, left: s, bottom: s, right: s };
}

async function main() {
  console.log(`Reading: ${FILE}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const inputSheets = wb.worksheets.filter((ws) => ws.name.endsWith("- Input"));
  if (inputSheets.length === 0) throw new Error("No '- Input' sheets found.");

  for (const inWs of inputSheets) {
    const resident = inWs.name.replace(/\s*-\s*Input$/, "").trim();
    const outWs = wb.getWorksheet(`${resident} - Your Output`);
    if (!outWs) {
      console.warn(`  ! No output sheet for "${resident}" — skipping`);
      continue;
    }

    // Input notes parse karo (col A = "Day N", col D = note).
    const notes: { day: number; note: string }[] = [];
    inWs.eachRow((row) => {
      const c0 = String(row.getCell(1).text ?? "").trim();
      const m = c0.match(/^Day\s*(\d)/i);
      if (m) {
        const note = String(row.getCell(4).text ?? "").trim();
        if (note) notes.push({ day: Number(m[1]), note });
      }
    });

    console.log(`\n=== ${resident} (${notes.length} days) ===`);

    // Output sheet clear karo (existing rows hata do).
    outWs.spliceRows(1, outWs.rowCount);

    // Title + instruction + header.
    outWs.mergeCells("A1:D1");
    const title = outWs.getCell("A1");
    title.value = `Your Output — ${resident}`;
    title.font = { bold: true, size: 14, color: { argb: C.titleFont } };
    outWs.mergeCells("A2:D2");
    outWs.getCell("A2").value = "Flags produced by the Falls Documentation Checker (vs Falls Management Policy POL-FAL-001).";
    outWs.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF64748B" } };

    const header = outWs.getRow(3);
    header.values = ["Day", "Flag Type", "Field", "Explanation"];
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: C.headerFont }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
      cell.alignment = { vertical: "middle" };
      cell.border = thinBorder();
    });
    header.height = 22;

    // Data rows.
    let r = 4;
    let totalFlags = 0;
    for (const { day, note } of notes) {
      const result = await runChecker(day, note);
      const rows: [string, string, string, string][] = result.compliant
        ? [[`Day ${day}`, "✅ Complete", "All fields present", `Day ${day} note meets all required documentation criteria. No flags raised.`]]
        : result.flags.map((f) => [
            `Day ${day}`,
            f.status === "MISSING" ? "❌ Missing" : "⚠ Vague",
            FIELD[f.id] || f.label,
            f.fixMessage,
          ]);

      for (const vals of rows) {
        const row = outWs.getRow(r++);
        row.values = vals;
        const kind = vals[1].includes("Complete") ? "complete" : vals[1].includes("Missing") ? "missing" : "vague";
        const bg = kind === "complete" ? C.completeBg : kind === "missing" ? C.missingBg : C.vagueBg;
        const fg = kind === "complete" ? C.completeFont : kind === "missing" ? C.missingFont : C.vagueFont;
        row.eachCell((cell, col) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.border = thinBorder();
          cell.alignment = { wrapText: true, vertical: "top" };
          if (col === 1) cell.font = { bold: true, color: { argb: "FF334155" } };
          else if (col === 2) cell.font = { bold: true, color: { argb: fg } };
          else if (col === 3) cell.font = { bold: true, color: { argb: "FF1E293B" } };
          else cell.font = { color: { argb: "FF334155" }, size: 10 };
        });
      }
      if (!result.compliant) totalFlags += result.flags.length;
      console.log(`  Day ${day}: ${result.compliant ? "✅ compliant" : result.flags.length + " flag(s)"}`);
    }

    outWs.columns = [{ width: 9 }, { width: 13 }, { width: 24 }, { width: 78 }];
    console.log(`  -> ${totalFlags} flag row(s) written to "${resident} - Your Output"`);
  }

  await wb.xlsx.writeFile(FILE);
  console.log(`\n✓ Saved: ${path.resolve(FILE)}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e?.error?.error?.message || e?.message || e);
    process.exit(1);
  });
