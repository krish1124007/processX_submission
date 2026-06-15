import mongoose, { Schema, Document } from 'mongoose';
import { IPatient } from './Patient';
import { IUser } from './User';

export interface IFlag {
  id: string;
  label: string;
  status: 'MISSING' | 'VAGUE';
  evidence: string;
  fixMessage: string;
}

export interface IFallCase extends Document {
  patientId: IPatient['_id'];
  nurseId: IUser['_id'];
  progressNotes: string;
  /** Which fall incident this belongs to. Each cycle = one Day 1→3 monitoring window. */
  cycle: number;
  /** Which day in the 3-day post-fall window this note covers (1, 2, or 3) */
  dayNumber: number;
  /** Checker output: requirements that are missing or vague */
  flags: IFlag[];
  /** No flags => note meets the policy for that day */
  compliant: boolean;
}

const FlagSchema = new Schema<IFlag>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  status: { type: String, enum: ['MISSING', 'VAGUE'], required: true },
  evidence: { type: String, default: '' },
  fixMessage: { type: String, default: '' },
}, { _id: false });

const FallCaseSchema: Schema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  nurseId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  progressNotes: { type: String, required: true },
  cycle: { type: Number, required: true, default: 1 },
  dayNumber: { type: Number, required: true, default: 1 },
  flags: { type: [FlagSchema], default: [] },
  compliant: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.FallCase || mongoose.model<IFallCase>('FallCase', FallCaseSchema);
