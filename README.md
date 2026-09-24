# Hospital Management System

Complete Hospital Management System source code, organised as a single repository.

## Repository structure

```text
frontend/   React + Vite web application (port 3000)
backend/    Express + Sequelize API (port 5000)
database/   MariaDB/MySQL schema and restore instructions
```

The project covers dashboard, appointments, OPD, IPD, beds, pathology, radiology,
pharmacy/medicine, blood bank, ambulance, finance, reports, referrals, HR/payroll,
patients, doctors, settings and administration.

## Requirements

- Node.js 18 or newer
- npm
- MySQL or MariaDB

## 1. Create the database

Create an empty database named `hospital_management`, then either import
[`database/schema.sql`](database/schema.sql) or let Sequelize create the tables
during the seed step.

```sql
CREATE DATABASE hospital_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
```

## 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env
```

Update the database values and replace both JWT placeholder secrets in `.env`, then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

The seed command creates `admin@hospital.local` and prints a one-time password in
the terminal. The password must be changed at first login.

Backend URL: `http://localhost:5000/api/v1`

## 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:3000`

## Verification

```bash
cd frontend
npm run build

cd ../backend
npm test
```

## Database privacy

The repository intentionally contains schema, migrations and safe seed logic,
but no live database dump. Patient records, phone numbers, email addresses,
password hashes and uploaded medical files must never be committed to Git.

For the Bangla project walkthrough, see
[`README_PRESENTATION_BN.md`](README_PRESENTATION_BN.md).
