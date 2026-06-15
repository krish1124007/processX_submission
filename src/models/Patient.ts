import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  contactNumber: string;
}

const PatientSchema: Schema = new Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
