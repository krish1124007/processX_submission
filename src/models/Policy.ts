import mongoose, { Schema, Document } from 'mongoose';

export interface IPolicy extends Document {
  title: string;
  content: string;
}

const PolicySchema: Schema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

export default mongoose.models.Policy || mongoose.model<IPolicy>('Policy', PolicySchema);
