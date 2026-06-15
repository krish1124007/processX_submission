/**
 * Audit: mera checker official sample (John Doe = clean, Peter Parker = flagged)
 * pe chala kar dekho ki expected output se kitna match karta hai.
 *   npx tsx src/scripts/audit-samples.ts
 */
import { runChecker } from "../lib/checker";

const NOTES: Record<string, [string, string, string]> = {
  "John Doe (expected: 0 flags all days)": [
    `Progress Note — Fall Incident. Resident: John Doe, Room 8B. Date: 10 June 2025, Time of fall: 07:15. Resident found on floor beside bed by carer during morning round. Fall not witnessed. Complaining of pain in left knee — rates 5/10. No visible laceration or bruising. Alert and orientated to time and place. Able to move all limbs on request. Immediate actions: Assisted back to bed. Comfort position. Call bell placed within reach. Vital signs taken: BP 148/86, HR 78, RR 16, Temp 36.5, SpO2 97%. GP (Dr Maria Santos) notified at 07:40. Advised to monitor pain and mobility. Stated X-ray to be arranged if pain does not settle or weight-bearing is affected by Day 2. NOK: Wife (Helen Doe) notified at 07:55. Acknowledged and will visit today. Risk factors identified: Two previous falls in the past six months. Prescribed Warfarin — bleeding risk noted and GP advised accordingly. Mobility aid (walking frame) was not within reach at time of fall. Care plan reviewed and updated: Yes. Walking frame placement added. Falls risk score reassessed and documented — HIGH.`,
    `Progress Note — Day 2 Post-Fall. Pain update: Left knee pain has improved since yesterday — resident rates 2/10 this morning. No new pain reported. Mobility: Resident able to full weight-bear on both legs without assistance. Walking to bathroom and back independently using walking frame. Gait appears steady. Vital signs: BP 142/84, HR 76, RR 15, Temp 36.6, SpO2 98%. No new symptoms since Day 1 — no new bruising, swelling, or behavioural changes observed. GP follow-up: Contacted Dr Santos at 09:30 to update on pain improvement and weight-bearing status. Dr Santos advised no X-ray required at this stage given improvement. Care plan: No changes required today. Walking frame placement confirmed in place.`,
    `Progress Note — Day 3 Post-Fall Closure. Pain outcome: Left knee pain fully resolved — resident rates 0/10. No pain on movement or weight-bearing. Clinically confirmed as resolved. Mobility: Returned to baseline. Resident mobilising independently with walking frame throughout the facility. Outstanding actions: X-ray was not required — GP confirmed on Day 2 that improvement made X-ray unnecessary. No outstanding clinical actions. Incident closure: Post-fall 72-hour monitoring period is now complete. Incident reviewed and formally closed. Falls prevention plan reviewed: Updated care plan discussed with resident and wife (Helen Doe) during her visit today. Resident and family verbally confirmed understanding. Falls risk score remains HIGH.`,
  ],
  "Peter Parker (expected: 7 / 5 / 4 flags)": [
    `Progress Note — Fall Incident. Resident: Peter Parker, Room 3D. Date: 10 June 2025, Time of fall: 14:30. Resident found on floor in corridor near nurses station. Witnessed by AIN Tom Baxter. Complaining of right hip pain. Alert and orientated. No visible injury. Immediate actions: Assisted back to wheelchair. Comfort measures applied. GP (Dr Kevin Park) notified. Advised to monitor. Family has been informed. Risk factors: History of falls. On blood pressure medication. Care plan: Will update.`,
    `Progress Note. Resident: Peter Parker, Room 3D. Date: 11 June 2025. Peter had a quiet night. Seems okay this morning. Ate breakfast.`,
    `Progress Note. Resident: Peter Parker, Room 3D. Date: 12 June 2025. Peter is doing much better. No further falls. Family visited.`,
  ],
};

async function main() {
  for (const [who, days] of Object.entries(NOTES)) {
    console.log(`\n================ ${who} ================`);
    for (let i = 0; i < 3; i++) {
      const res = await runChecker(i + 1, days[i]);
      console.log(`\n--- Day ${i + 1} — ${res.compliant ? "COMPLIANT (0 flags)" : res.flags.length + " flags"} ---`);
      res.flags.forEach((f) => console.log(`  [${f.status}] ${f.label}\n      → ${f.fixMessage}`));
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
