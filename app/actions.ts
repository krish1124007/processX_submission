"use server";

import connectDB from '../src/db';
import Patient from '../src/models/Patient';
import FallCase from '../src/models/FallCase';
import User from '../src/models/User';
import { runChecker } from '../src/lib/checker';

export async function getPatients() {
  await connectDB();
  const patients = await Patient.find({}).sort({ createdAt: -1 }).lean();
  // Stringify the ids to pass to client component safely
  return patients.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    contactNumber: p.contactNumber
  }));
}

export async function createPatient(name: string, contactNumber: string) {
  await connectDB();
  const newPatient = await Patient.create({ name, contactNumber });
  return {
    _id: newPatient._id.toString(),
    name: newPatient.name,
    contactNumber: newPatient.contactNumber
  };
}

export async function createFallCase(
  patientId: string,
  progressNotes: string,
  startNewCase = false,
) {
  await connectDB();
  // We mock the nurseId for now since we don't have real JWT session auth in this task yet
  const nurse = await User.findOne({ role: 'nurse' });

  if (!nurse) {
    throw new Error("No nurse found in database. Please run the seed script.");
  }

  // Current cycle nikaalo (sabse latest cycle). Har cycle = ek fall incident (Day 1->3).
  const lastCase = await FallCase.findOne({ patientId }).sort({ cycle: -1, createdAt: -1 });
  let cycle = lastCase?.cycle || 1;
  let notesInCycle = await FallCase.countDocuments({ patientId, cycle });

  if (startNewCase) {
    // Naya fall case shuru karo — cycle aage badhao, Day 1 se.
    cycle = (lastCase?.cycle || 0) + 1;
    notesInCycle = 0;
  }

  // CAP: ek cycle mein max 3 din. Day 3 ke baad Day 4 nahi khulega.
  if (notesInCycle >= 3) {
    return {
      success: false,
      saved: false,
      cycleComplete: true,
      caseId: null as string | null,
      cycle,
      dayNumber: 3,
      compliant: false,
      flags: [],
      message: "3-day monitoring already complete for this fall case. Start a new fall case to log again.",
    };
  }

  const dayNumber = notesInCycle + 1; // hamesha 1..3

  // AI policy checker chalao — flags isi din ke checklist ke against bante hain.
  const result = await runChecker(dayNumber, progressNotes);

  // POLICY GATE: non-compliant note SAVE MAT karo. Nurse ko force karo poora likhe.
  if (!result.compliant) {
    return {
      success: false,
      saved: false,
      cycleComplete: false,
      caseId: null as string | null,
      cycle,
      dayNumber,
      compliant: false,
      flags: result.flags,
    };
  }

  const fallCase = await FallCase.create({
    patientId,
    nurseId: nurse._id,
    progressNotes,
    cycle,
    dayNumber,
    flags: result.flags,
    compliant: result.compliant,
  });

  return {
    success: true,
    saved: true,
    cycleComplete: false,
    caseId: fallCase._id.toString(),
    cycle,
    dayNumber,
    compliant: result.compliant,
    flags: result.flags,
  };
}

// Existing log edit karo — AI dobara chalega aur compliance gate lagega.
export async function updateFallCase(caseId: string, progressNotes: string) {
  await connectDB();
  const existing = await FallCase.findById(caseId);
  if (!existing) {
    throw new Error("Fall case not found.");
  }

  // Usi din ke checklist ke against re-check karo.
  const result = await runChecker(existing.dayNumber, progressNotes);

  if (!result.compliant) {
    // Edit accept nahi — purana saved note waisa hi rehta hai.
    return {
      success: false,
      saved: false,
      caseId,
      cycle: existing.cycle,
      dayNumber: existing.dayNumber,
      compliant: false,
      flags: result.flags,
    };
  }

  existing.progressNotes = progressNotes;
  existing.flags = result.flags;
  existing.compliant = true;
  await existing.save();

  return {
    success: true,
    saved: true,
    caseId,
    cycle: existing.cycle,
    dayNumber: existing.dayNumber,
    compliant: true,
    flags: result.flags,
  };
}

export async function getPatientHistory(patientId: string) {
  await connectDB();
  const cases = await FallCase.find({ patientId }).sort({ createdAt: 1 }).lean();

  return cases.map((c, index) => ({
    _id: c._id.toString(),
    cycle: c.cycle || 1,
    dayNumber: c.dayNumber || index + 1,
    progressNotes: c.progressNotes,
    flags: (c.flags || []).map((f: any) => ({
      id: f.id,
      label: f.label,
      status: f.status,
      evidence: f.evidence || '',
      fixMessage: f.fixMessage || '',
    })),
    compliant: c.compliant ?? false,
    createdAt: c.createdAt?.toISOString() || new Date().toISOString()
  }));
}

export async function getNurseDashboardStats() {
  await connectDB();
  
  // Calculate start of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 1. Count reports generated today
  const todayReportsCount = await FallCase.countDocuments({
    createdAt: { $gte: startOfToday }
  });

  // 2. Calculate pending follow-ups
  // Find patients with 1 or 2 total reports, where the LAST report was NOT created today.
  // A simpler approach: Fetch all patients, and manually check their cases.
  // Since this is a demo/take-home, this is perfectly efficient.
  const patients = await Patient.find({}).lean();
  const cases = await FallCase.find({}).sort({ createdAt: 1 }).lean();

  const pendingFollowUps = [];

  for (const patient of patients) {
    const patientCases = cases.filter(c => c.patientId.toString() === patient._id.toString());
    const caseCount = patientCases.length;

    // Only care if they have 1 or 2 cases (Day 1 or Day 2 done, still need next day)
    if (caseCount > 0 && caseCount < 3) {
      const lastCase = patientCases[patientCases.length - 1];
      const lastCaseDate = new Date(lastCase.createdAt || new Date());
      
      // If the last case was NOT created today, they are pending a follow-up today
      if (lastCaseDate < startOfToday) {
        pendingFollowUps.push({
          patientId: patient._id.toString(),
          patientName: patient.name,
          dueDay: caseCount + 1, // e.g. if 1 case exists, Day 2 is due
          lastReportDate: lastCaseDate.toISOString()
        });
      }
    }
  }

  return {
    todayReportsCount,
    pendingFollowUps
  };
}

export async function getAdminStats() {
  await connectDB();
  
  const totalPatients = await Patient.countDocuments({});
  const totalFallCases = await FallCase.countDocuments({});
  const totalNurses = await User.countDocuments({ role: 'nurse' });

  return {
    totalPatients,
    totalFallCases,
    totalNurses
  };
}

import Policy from '../src/models/Policy';

export async function getPolicy() {
  await connectDB();
  const policy = await Policy.findOne({});
  if (policy) {
    return { title: policy.title, content: policy.content };
  }
  return { title: '', content: '' };
}

export async function updatePolicy(title: string, content: string) {
  await connectDB();
  const policy = await Policy.findOne({});
  if (policy) {
    policy.title = title;
    policy.content = content;
    await policy.save();
  } else {
    await Policy.create({ title, content });
  }
  return { success: true };
}

export async function getTodayReports() {
  await connectDB();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const cases = await FallCase.find({
    createdAt: { $gte: startOfToday }
  }).sort({ createdAt: -1 }).populate('patientId', 'name').populate('nurseId', 'name').lean();

  return cases.map(c => ({
    _id: c._id.toString(),
    patientName: (c.patientId as any)?.name || 'Unknown Patient',
    nurseName: (c.nurseId as any)?.name || 'Unknown Nurse',
    progressNotes: c.progressNotes,
    createdAt: c.createdAt?.toISOString() || new Date().toISOString()
  }));
}

export async function getAllPolicies() {
  await connectDB();
  const policies = await Policy.find({}).sort({ createdAt: -1 }).lean();
  return policies.map(p => ({
    _id: p._id.toString(),
    title: p.title,
    content: p.content,
    createdAt: p.createdAt?.toISOString() || new Date().toISOString()
  }));
}

export async function createNewPolicy(title: string, content: string) {
  await connectDB();
  const newPolicy = await Policy.create({ title, content });
  return { success: true, policyId: newPolicy._id.toString() };
}

export async function getAllHistory() {
  await connectDB();
  const cases = await FallCase.find({}).sort({ createdAt: -1 }).populate('patientId', 'name').populate('nurseId', 'name').lean();
  return cases.map(c => ({
    _id: c._id.toString(),
    patientName: (c.patientId as any)?.name || 'Unknown Patient',
    nurseName: (c.nurseId as any)?.name || 'Unknown Nurse',
    cycle: c.cycle || 1,
    dayNumber: c.dayNumber || 1,
    compliant: c.compliant ?? false,
    flags: (c.flags || []).map((f: any) => ({
      id: f.id,
      label: f.label,
      status: f.status,
      evidence: f.evidence || '',
      fixMessage: f.fixMessage || '',
    })),
    progressNotes: c.progressNotes,
    createdAt: c.createdAt?.toISOString() || new Date().toISOString()
  }));
}

