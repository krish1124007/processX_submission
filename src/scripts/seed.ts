import mongoose from 'mongoose';
import User from '../models/User';
import Patient from '../models/Patient';
import Policy from '../models/Policy';
import FallCase from '../models/FallCase';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/processx_db';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('Connected to MongoDB successfully.');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Policy.deleteMany({});
    await FallCase.deleteMany({});

    // Seed Users
    console.log('Seeding users...');
    await User.create([
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'nurse', password: 'nurse123', role: 'nurse' },
    ]);

    // Seed Patients
    console.log('Seeding patients...');
    await Patient.create([
      { name: 'John Doe', contactNumber: '123-456-7890' },
      { name: 'Peter Parker', contactNumber: '987-654-3210' },
    ]);

    // Seed Policy
    console.log('Seeding policy...');
    await Policy.create({
      title: 'Falls Management Policy',
      content: 'This is the mock ProcessX Falls Management Policy. In production, the full policy text should be loaded here so the AI can evaluate the nurses daily progress notes against it. (Section 5 includes requirements for neurological observations post-fall).',
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
