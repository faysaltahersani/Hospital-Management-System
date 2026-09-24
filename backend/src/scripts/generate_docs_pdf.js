'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.join(__dirname, '../../../Hospital_Management_System_Project_Documentation.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
  bufferPages: true,
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Primary Theme Colors
const PRIMARY = '#0e8488';
const SECONDARY = '#0b6669';
const DARK_TEXT = '#1f2c33';
const MUTED_TEXT = '#51606d';
const ACCENT = '#1976d2';
const BG_LIGHT = '#f4f8f9';
const BORDER_COLOR = '#d9e1e5';

// Helper for Section Headers
function addHeader(title, subtitle) {
  doc.rect(40, 40, 515, 65).fill(PRIMARY);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text(title, 55, 52);
  doc.fillColor('#E0F2F1').fontSize(11).font('Helvetica').text(subtitle, 55, 80);
  doc.y = 120;
}

// Helper for Category Section Titles
function addSectionTitle(text) {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.5);
  doc.rect(40, doc.y, 515, 26).fill('#E0F2F1');
  doc.fillColor(SECONDARY).fontSize(14).font('Helvetica-Bold').text(text, 48, doc.y + 6);
  doc.moveDown(1);
  doc.fillColor(DARK_TEXT);
}

// Helper for Subheadings
function addSubheading(text) {
  if (doc.y > 720) doc.addPage();
  doc.fillColor(ACCENT).fontSize(12).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
  doc.fillColor(DARK_TEXT);
}

// Helper for Bullet Points
function addBullet(title, description) {
  if (doc.y > 730) doc.addPage();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY).text(`•  ${title}: `, { continued: true });
  doc.font('Helvetica').fontSize(10).fillColor(DARK_TEXT).text(description);
  doc.moveDown(0.3);
}

// Helper for Paragraphs
function addParagraph(text) {
  if (doc.y > 730) doc.addPage();
  doc.font('Helvetica').fontSize(10).fillColor(DARK_TEXT).text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.5);
}

// --- COVER & HEADER ---
addHeader('Hospital Management System (HMS)', 'Full Project Architecture & Functional Documentation Manual');

addParagraph('This comprehensive document provides an end-to-end technical overview and detailed feature specification of the Hospital Management System (HMS). The application is designed to digitize and streamline hospital operations across all departments including Patient Care, OPD, IPD, Diagnostics, Pharmacy, Blood Bank, Billing, HR, and System Administration.');

// --- 1. SYSTEM ARCHITECTURE & TECH STACK ---
addSectionTitle('1. System Architecture & Technology Stack');

addSubheading('Frontend Architecture');
addBullet('Framework & Tooling', 'React 18 with Vite for ultra-fast bundling and modern component execution.');
addBullet('Styling System', 'Vanilla CSS & TailwindCSS utilities paired with custom responsive UI layout components.');
addBullet('Routing & Navigation', 'React Router v6 handling multi-tier dynamic navigation bars, breadcrumbs, and role-protected routes.');
addBullet('HTTP & Storage', 'Fetch API wrapper (apiRequest) with automatic JWT token attachment and local state persistence.');

addSubheading('Backend Architecture');
addBullet('Runtime & Server', 'Node.js with Express.js RESTful API architecture structured in modular Domain-Driven layers.');
addBullet('Database & ORM', 'MySQL 8 relational database managed through Sequelize ORM with migrations and model relationships.');
addBullet('Authentication & Security', 'JWT (JSON Web Tokens) with refresh token rotation, bcrypt password hashing, Rate Limiting, CORS, and Helmet headers.');
addBullet('Backup Engine', 'Dynamic MySQL SQL Dump generator creating full `.sql` database export files.');

// --- 2. CORE MODULES DESCRIPTION ---
addSectionTitle('2. Comprehensive Modules Description');

addSubheading('2.1 Patient Management');
addParagraph('Centralized patient record management system tracking demographics, contact information, blood group, medical history, and complete timeline.');
addBullet('Features', 'Patient registration with unique codes (PAT-YYYY-XXXX), search & filter by date/code/phone, edit demographics, and patient timeline dashboard aggregating appointments, OPD visits, IPD admissions, lab tests, prescriptions, and invoices.');

addSubheading('2.2 OPD (Outpatient Department)');
addParagraph('Handles outpatient visits, doctor consultations, chief complaints, symptoms, diagnosis, and consultation fee billing.');
addBullet('Features', 'OPD visit entry with auto-generated visit code, consultation fee billing, payment method tracking (Cash/Card/Mobile Banking), prescription linkage, and OPD bill record list with search & date filtering.');

addSubheading('2.3 IPD (Inpatient Department) & Bed Management');
addParagraph('Comprehensive inpatient management system tracking hospital admissions, ward/room/bed allocation, daily charges, treatment notes, and discharge billing.');
addBullet('Features', 'Admission entry (ADM-YYYY-XXXX), bed assignment & real-time occupancy status (Available/Occupied/Maintenance), partial payment collection modal, total billing calculation, discharge status tracking, and IPD bill record management.');

addSubheading('2.4 Doctor & Appointment Management');
addParagraph('Manages doctor profiles, department specializations, consultation fees, weekly schedules, and patient appointment bookings.');
addBullet('Features', 'Doctor entry & list, specialization mapping, conflict-free appointment booking (APP-YYYY-XXXX), status transitions (Scheduled -> Confirmed -> Completed / Cancelled), appointment priority, and shift entry.');

addSubheading('2.5 Pathology & Laboratory Module');
addParagraph('Complete diagnostic test management system covering test catalog, category/parameter entry, lab order generation, sample collection, test results entry, and PDF report printing.');
addBullet('Features', 'Pathology test entry with category, parameters, and unit definitions; Pathology bill entry (LAB-YYYY-XXXX); result entry; and test result records with date range filtering.');

addSubheading('2.6 Radiology Module');
addParagraph('Imaging & scan diagnostic management system tracking X-Ray, Ultrasonogram, CT Scan, and MRI test bookings.');
addBullet('Features', 'Radiology test catalog entry, test category & parameter setup, radiology bill entry (RAD-YYYY-XXXX), report generation, and bill record search & date filtering.');

addSubheading('2.7 Pharmacy Sales & Stock Management');
addParagraph('Point of Sale (POS) and inventory control system for hospital pharmacy.');
addBullet('Features', 'Pharmacy Sales billing (SAL-YYYY-XXXX), POS invoice print, sales return, purchase entry, supplier manage, batch-wise medicine stock tracking, and stock expiry alert reports.');

addSubheading('2.8 Medicine Management');
addParagraph('Medicine master catalog tracking generic names, brand names, manufacturers, categories, units, and stock quantities.');
addBullet('Features', 'Medicine entry, category/group/company management, batch stock updates, medicine list, and search filter.');

addSubheading('2.9 Blood Bank & Donor Management');
addParagraph('Full blood bank lifecycle management from donor registration to blood bag collection, component separation, and patient issue.');
addBullet('Features', 'Donor entry (DNR-YYYY-XXXX), blood bag stock tracking (BAG-YYYY-XXXX), component separation (Platelets/Plasma/RBC), blood issue billing (ISS-YYYY-XXXX), and stock status summary (Available/Issued/Expired).');

addSubheading('2.10 Ambulance Management');
addParagraph('Tracks hospital ambulance fleet, driver assignments, trip bookings, call logs, and billing.');
addBullet('Features', 'Ambulance vehicle entry, driver details, call ambulance entry (AMB-YYYY-XXXX), trip status (Active/Completed), and call ambulance records.');

addSubheading('2.11 Finance, Income & Expense Management');
addParagraph('Complete accounting module for hospital revenue and operational expenditures.');
addBullet('Features', 'Income head entry, expense head entry, income/expense entry with voucher codes, payment mode breakdown, and account ledger reports.');

addSubheading('2.12 HR & Payroll Management');
addParagraph('Manages hospital staff, department assignments, salaries, and monthly payroll processing.');
addBullet('Features', 'Employee registration, department entry, salary sheet generation, salary payment entry (PAY-YYYY-XXXX), and payment records.');

addSubheading('2.13 Referral System & Commission Tracking');
addParagraph('Tracks external referral agents/doctors and calculates referral commissions for OPD, IPD, Pathology, Radiology, and Pharmacy.');
addBullet('Features', 'Referral person entry, commission percentage configuration, referral bill entry (REF-YYYY-XXXX), referral commission records, and payout tracking.');

addSubheading('2.14 Reports & Analytics');
addParagraph('Multi-dimensional reporting system providing decision-support analytics for hospital administration.');
addBullet('Reports Included', 'Daily Ledger Report, Appointments Report, Account Balance Report, Current Stock & Expiry Report, Blood Issue Record, and Custom Date Range Filters.');

// --- 3. SYSTEM ADMINISTRATION & ACCESS CONTROL ---
addSectionTitle('3. System Administration & Access Control');

addSubheading('3.1 User Management & Roles');
addParagraph('Supports multi-role user accounts including Admin, Doctor, Nurse, Receptionist, Accountant, Pharmacist, Lab Technician, and Patient.');

addSubheading('3.2 Dynamic Backend-Driven User Access (Permissions)');
addParagraph('Allows Admin to grant granular module permissions per user. Permission state is stored in the database (`MasterOption` table under `user_permission`) and strictly enforced on frontend navigation, sidebar, modules dashboard, and backend endpoints.');

addSubheading('3.3 Database Backup & Restore');
addParagraph('Provides a full SQL database backup feature. Clicking "Download Backup" generates a complete `.sql` MySQL dump containing all table schemas and data rows.');

addSubheading('3.4 Settings & Master Options');
addParagraph('Configurable master options for Branch Manage, Charge Manage, Company Profile details (logo, pad print, tax calculation), Master Options, Import CSV Data, and Custom Automated Tasks.');

// --- FOOTER & PAGE NUMBERING ---
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(40, 800, 515, 1).fill(BORDER_COLOR);
  doc.fillColor(MUTED_TEXT).fontSize(9).font('Helvetica');
  doc.text('Hospital Management System - Technical Manual', 40, 808, { align: 'left' });
  doc.text(`Page ${i + 1} of ${range.count}`, 40, 808, { align: 'right' });
}

doc.end();

writeStream.on('finish', () => {
  console.log('PDF documentation successfully generated at:', outputPath);
});
