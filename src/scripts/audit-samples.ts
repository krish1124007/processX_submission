/**
 * Audit: mera checker official Sample file ke EXACT notes pe chalao aur expected
 * output se compare karo.
 *   John Doe   -> 0 / 0 / 0 flags  (sanity check)
 *   Peter Parker -> 7 / 5 / 4 flags (expected)
 *
 *   npx tsx src/scripts/audit-samples.ts
 */
import "dotenv/config";
import * as XLSX from "xlsx";
import { runChecker } from "../lib/checker";

const SAMPLE =
  "C:/Users/Krish/Desktop/processx/Interview-AI/Sample_Input_Output.xlsx";

const EXPECTED: Record<string, [number, number, number]> = {
  "John Doe": [0, 0, 0],
  "Peter Parker": [7, 5, 4],
};

function notesFor(wb: XLSX.WorkBook, resident: string): string[] {
  const rows = XLSX.utils.sheet_to_json<any[]>(
    wb.Sheets[`${resident} - Input`],
    { header: 1, defval: "" },
  );
  return [1, 2, 3].map((d) =>
    String(rows.find((r) => String(r[0]).trim() === `Day ${d}`)?.[3] ?? ""),
  );
}

async function main() {
  const wb = XLSX.readFile(SAMPLE);
  for (const [resident, expected] of Object.entries(EXPECTED)) {
    console.log(`\n================ ${resident} (expected ${expected.join(" / ")}) ================`);
    const notes = notesFor(wb, resident);
    for (let i = 0; i < 3; i++) {
      const res = await runChecker(i + 1, notes[i]);
      const mark = res.flags.length === expected[i] ? "✓" : "✗ (expected " + expected[i] + ")";
      console.log(`\n--- Day ${i + 1} — ${res.flags.length} flags ${mark} ---`);
      res.flags.forEach((f) => console.log(`  [${f.status}] ${f.label}`));
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
