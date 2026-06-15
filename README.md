# ProcessX - AI Policy Checker

This is a Next.js application designed to automate the auditing of nurse progress notes against the facility's Falls Management Policy using AI.

## Prerequisites

Before running the project, ensure you have the following installed on your system:
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Running locally or a MongoDB Atlas URI)

## Setup Instructions

Follow these steps to get the project running locally:

### 1. Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory of your project (same level as `package.json`). You need to add two essential environment variables:

```env
# Your MongoDB Connection String (Local or Atlas)
MONGO_URL=mongodb://localhost:27017/processx_db

# Your Groq API Key for the AI model
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Seed the Database
Before running the app, you must populate the database with the initial dummy data, including the Admin user, Nurse user, Patients, and the Policy itself.

Run the following command:
```bash
npm run seed
```
*Note: This command will wipe existing data in the database and insert fresh test data. You will see a "Database seeded successfully!" message upon completion.*

### 4. Run the Development Server
Once the database is seeded, start the Next.js development server:
```bash
npm run dev
```

The application will start running on [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is busy).

## Test Credentials

Use the following credentials to log in to the application and test the portals:

**Admin Portal:**
- **Username:** `admin`
- **Password:** `admin123`

**Nurse Portal:**
- **Username:** `nurse`
- **Password:** `nurse123`

## How it Works
1. Log in as a **Nurse** to submit a Progress Note.
2. Select a patient, a day (Day 1, 2, or 3), and type the note.
3. Upon submission, the AI (`checker.ts`) will evaluate the note strictly against the policy rules defined in `policy-checklist.ts`.
4. Any missing or vague information will be instantly flagged, allowing the nurse to correct it before final submission.
5. Log in as an **Admin** to view a dashboard of all daily reports, compliance stats, and policy management.
