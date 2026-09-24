'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.join(__dirname, '../../../Hospital_Management_System_Project_Documentation.pdf');

// Create Document
const doc = new PDFDocument({
  size: 'A4',
  margin: 40,
  bufferPages: true,
  autoFirstPage: true,
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Color Palette
const C_PRIMARY = '#0e8488';
const C_SECONDARY = '#0b6669';
const C_ACCENT = '#1976d2';
const C_TEXT = '#1f2c33';
const C_MUTED = '#51606d';
const C_BG_LIGHT = '#eaf4f4';
const C_BORDER = '#d0dfdf';
const C_BOX_BG = '#f4f9f9';

function checkPageSpace(requiredSpace = 80) {
  if (doc.y + requiredSpace > 750) {
    doc.addPage();
  }
}

function renderHeaderBanner() {
  doc.rect(40, 40, 515, 70).fill(C_PRIMARY);
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('HOSPITAL MANAGEMENT SYSTEM (HMS)', 55, 52);
  doc.fillColor('#E0F2F1').fontSize(11).font('Helvetica').text('Comprehensive Enterprise System Architecture & Feature Documentation', 55, 78);
  doc.fillColor('#B2DFDB').fontSize(9).font('Helvetica').text('DeshIT-BD Software Solutions  |  Version 2.0  |  August 2026', 55, 93);
  doc.y = 125;
}

function renderSectionHeader(numberStr, titleStr) {
  checkPageSpace(60);
  doc.moveDown(0.5);
  doc.rect(40, doc.y, 515, 24).fill(C_SECONDARY);
  doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold').text(`${numberStr}. ${titleStr.toUpperCase()}`, 48, doc.y + 6);
  doc.moveDown(0.8);
  doc.fillColor(C_TEXT);
}

function renderSubSection(titleStr) {
  checkPageSpace(50);
  doc.fillColor(C_ACCENT).fontSize(11).font('Helvetica-Bold').text(titleStr);
  doc.moveDown(0.3);
  doc.fillColor(C_TEXT);
}

function renderParagraph(textStr) {
  checkPageSpace(40);
  doc.font('Helvetica').fontSize(9.5).fillColor(C_TEXT).text(textStr, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.4);
}

function renderBullet(keyStr, valStr) {
  checkPageSpace(25);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C_PRIMARY).text(`•  ${keyStr}: `, { continued: true });
  doc.font('Helvetica').fontSize(9.5).fillColor(C_TEXT).text(valStr, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.3);
}

function renderFeatureBox(boxTitle, bulletPoints) {
  checkPageSpace( bulletPoints.length * 18 + 30 );
  const startY = doc.y;
  doc.rect(40, startY, 515, bulletPoints.length * 18 + 24).fillAndStroke(C_BOX_BG, C_BORDER);
  doc.fillColor(C_SECONDARY).fontSize(10).font('Helvetica-Bold').text(boxTitle, 50, startY + 6);
  let curY = startY + 22;
  bulletPoints.forEach((pt) => {
    doc.fillColor(C_PRIMARY).fontSize(9).font('Helvetica-Bold').text(`▪ `, 52, curY, { continued: true });
    doc.fillColor(C_TEXT).fontSize(9).font('Helvetica').text(`${pt.label}: `, { continued: true });
    doc.fillColor(C_MUTED).fontSize(9).font('Helvetica').text(pt.text);
    curY += 16;
  });
  doc.y = startY + bulletPoints.length * 18 + 30;
}

// -------------------------------------------------------------
// DOCUMENT CONTENT
// -------------------------------------------------------------

renderHeaderBanner();

// --- 1. EXECUTIVE SUMMARY ---
renderSectionHeader('1', 'Executive Summary & System Overview');

renderParagraph(
  'The Hospital Management System (HMS) is a full-featured, enterprise-grade digital healthcare platform engineered to handle end-to-end clinical, operational, financial, diagnostic, inventory, and administrative workflows. Built with a responsive, modern web interface and a robust modular backend, the system eliminates paper-based delays, enhances patient data accuracy, enforces role-based security, and delivers real-time operational analytics.'
);

renderFeatureBox('Core System Capabilities', [
  { label: 'Patient Lifecycle Engine', text: 'Centralized registry, digital medical history, and complete treatment timeline.' },
  { label: 'Clinical OPD & IPD Care', text: 'Outpatient consultations, inpatient admission, bed allocation, and partial billing.' },
  { label: 'Diagnostics & Imaging', text: 'Integrated Pathology Lab and Radiology scan orders, parameters, and PDF reports.' },
  { label: 'Pharmacy & Stock POS', text: 'Medicine inventory, Point-of-Sale billing, batch tracking, and expiry management.' },
  { label: 'Finance & HR Control', text: 'Vouchers, ledger accounting, referral commission tracking, and employee payroll.' },
]);

// --- 2. ARCHITECTURE ---
renderSectionHeader('2', 'Technology Stack & System Architecture');

renderParagraph(
  'The architecture follows a clean separation of concerns using a decoupled Client-Server model. The client application renders an interactive Single-Page Application (SPA), while the backend exposes a RESTful API powered by Node.js, Express, and Sequelize ORM connecting to a MySQL 8 database engine.'
);

renderSubSection('2.1 Frontend Architecture (Client Layer)');
renderBullet('UI Framework', 'React 18 SPA powered by Vite build system for instantaneous hot module replacement.');
renderBullet('Design & Theme System', 'Vanilla CSS & TailwindCSS utility framework with curated visual hierarchy, custom color tokens, glassmorphism containers, and micro-animations.');
renderBullet('Routing & Navigation', 'React Router v6 enforcing dynamic multi-tier navigation bars, top action menus, and breadcrumbs.');
renderBullet('Alerts & User Feedback', 'SweetAlert2 custom styled modals for confirmation dialogs (Delete, Edit, Print) and toast feedback.');

renderSubSection('2.2 Backend Architecture (Server Layer)');
renderBullet('Server Framework', 'Node.js runtime with Express.js organized in Domain-Driven modules (Controller, Service, Repository, Validation).');
renderBullet('Database & ORM', 'MySQL 8 relational database managed through Sequelize ORM with migrations, indexes, and full paranoid soft-deletes.');
renderBullet('Security Architecture', 'Stateless JWT (JSON Web Token) authentication, bcrypt password hashing, CORS protection, Rate-limiting, Helmet security headers, and Express async handler wrappers.');
renderBullet('Database Backup Engine', 'Dynamic MySQL SQL Dump generator constructing complete DDL (`CREATE TABLE`) and DML (`INSERT INTO`) scripts exported directly as `.sql` files.');

// --- 3. MODULE-BY-MODULE FUNCTIONAL DEEP DIVE ---
renderSectionHeader('3', 'Module-by-Module Functional Deep Dive');

// 3.1 Patient Management
renderSubSection('3.1 Patient Management & Medical Timeline');
renderParagraph(
  'Serves as the foundational registry for all hospital operations. Every individual receiving care is assigned a permanent, unique patient code (e.g., PAT-2026-0001).'
);
renderBullet('Patient Registration', 'Captures full name, gender, date of birth, age, blood group, contact phone, email, address, and emergency contact.');
renderBullet('Patient Search & Filter', 'Fast tabular listing with real-time search by name, code, or phone number, with date-range filters.');
renderBullet('Patient Timeline Dashboard', 'Aggregates all historical interactions across OPD visits, IPD admissions, lab orders, radiology scans, prescriptions, and billing invoices into a chronological feed.');

// 3.2 OPD
renderSubSection('3.2 OPD (Outpatient Department) Module');
renderParagraph(
  'Facilitates swift outpatient consultations, chief complaint recording, doctor assignment, consultation fee collection, and prescription creation.'
);
renderBullet('Visit Booking', 'Auto-generates OPD visit code (OPD-2026-0001), captures chief complaints, department, assigned doctor, and visit date.');
renderBullet('Payment Processing', 'Records consultation charges, discount, net total, and payment mode (Cash, Card, Mobile Banking).');
renderBullet('OPD Records & Filters', 'Tabular record view supporting date range filters, doctor filter, patient filter, and user/creator filter.');

// 3.3 IPD & Bed Management
renderSubSection('3.3 IPD (Inpatient Department) & Bed Management');
renderParagraph(
  'Manages patient admissions, ward/room allocation, daily bed rates, ongoing clinical notes, installment payment collections, and final discharge summaries.'
);
renderBullet('Admission Entry', 'Generates admission code (ADM-2026-0001), selects attending doctor, ward, room, and specific bed unit.');
renderBullet('Real-Time Bed Tracker', 'Visual grid displaying real-time bed statuses (Available, Occupied, Under Maintenance). Admitting a patient marks the bed Occupied; discharging releases it to Available.');
renderBullet('Payment Collection Modal', 'Allows recording multiple partial/installment payments against an IPD admission invoice before final discharge.');

// 3.4 Doctor & Appointment
renderSubSection('3.4 Doctor Directory & Appointment Scheduling');
renderParagraph(
  'Maintains comprehensive doctor profiles, department specializations, consultation fees, and appointment schedule slots.'
);
renderBullet('Doctor Management', 'Manages doctor code (DOC-2026-0001), specialization, license number, consultation fee, availability toggle, and login credentials.');
renderBullet('Appointment Booking', 'Books appointments (APP-2026-0001) checking doctor availability and preventing double-booking schedule conflicts.');
renderBullet('Status Lifecycle', 'Tracks appointment status progression: Scheduled -> Confirmed -> Completed / Cancelled / No Show.');

// 3.5 Pathology & Lab
renderSubSection('3.5 Pathology & Diagnostic Laboratory');
renderParagraph(
  'Manages diagnostic test catalogs, test categories, sub-parameters, unit measurements, lab order billing, sample collection, and PDF report printing.'
);
renderBullet('Test Catalog & Parameters', 'Defines lab tests, category, sample type (Blood, Urine, Tissue), normal reference ranges, parameters, and prices.');
renderBullet('Lab Order Billing', 'Generates lab bill (LAB-2026-0001), adds single/multiple test items, applies tax/discount, and calculates net payable.');
renderBullet('Results & PDF Reports', 'Lab technicians enter parameter values and notes, changing status to Completed and generating printable PDF diagnostic reports.');

// 3.6 Radiology
renderSubSection('3.6 Radiology & Diagnostic Imaging');
renderParagraph(
  'Handles imaging diagnostic requests including X-Rays, Ultrasonograms (USG), CT Scans, and MRI scans.'
);
renderBullet('Radiology Setup', 'Maintains radiology test list, body part/category, test parameters, and pricing structure.');
renderBullet('Order Billing & Reports', 'Creates radiology order (RAD-2026-0001), records findings/impression notes, attaches digital reports, and prints final report.');

// 3.7 Pharmacy POS & Stock
renderSubSection('3.7 Pharmacy Sales, Inventory & Expiry Management');
renderParagraph(
  'Complete Point-of-Sale (POS) and inventory control system tailored for hospital pharmacy counters.'
);
renderBullet('POS Counter Billing', 'Generates pharmacy sales invoice (SAL-2026-0001), barcode scan/select items, handles batch selection, and prints thermal/standard receipt.');
renderBullet('Inventory & Batch Stock', 'Tracks batch numbers, expiry dates, purchase cost, retail price, and stock adjustments (Add/Remove).');
renderBullet('Sales Return & Suppliers', 'Processes customer sales returns, adjusts stock, and manages pharmacy purchase suppliers and orders.');

// 3.8 Medicine Catalog
renderSubSection('3.8 Master Medicine Catalog');
renderParagraph(
  'Central repository of all drugs and medical consumables stocked by the hospital.'
);
renderBullet('Catalog Management', 'Tracks brand name, generic composition, manufacturer/company, medicine group, category, unit (Pill, Box, Bottle, Syrup), and reorder alert levels.');

// 3.9 Blood Bank
renderSubSection('3.9 Blood Bank Lifecycle & Donor Registry');
renderParagraph(
  'Tracks blood donors, blood collection, component separation, blood bag storage, and patient blood issue billing.'
);
renderBullet('Donor Management', 'Registers blood donors (DNR-2026-0001), tracks total donations, age, weight, hemoglobin level, and last donation date.');
renderBullet('Bag Inventory & Components', 'Logs collected blood bags (BAG-2026-0001), handles component separation (Whole Blood, Packed RBC, Platelets, Plasma, Cryo), and tracks expiration.');
renderBullet('Blood Issue Billing', 'Issues blood bags to patients (ISS-2026-0001), verifies compatibility, updates bag status to ISSUED, and processes payment.');

// 3.10 Ambulance
renderSubSection('3.10 Hospital Fleet & Ambulance Dispatch');
renderParagraph(
  'Manages hospital ambulance emergency fleet, drivers, trip requests, and transport billing.'
);
renderBullet('Fleet Entry', 'Tracks vehicle number, model, driver name, contact phone, and vehicle availability status.');
renderBullet('Call Dispatch', 'Logs ambulance emergency calls (AMB-2026-0001), pickup location, destination, driver assigned, and trip charges.');

// 3.11 Finance & Accounting
renderSubSection('3.11 Finance, Vouchers, Income & Expense Tracking');
renderParagraph(
  'Comprehensive financial management module tracking hospital revenue, operational costs, and petty cash vouchers.'
);
renderBullet('Income & Expense Heads', 'Configures income categories (Consultation, Pathology, Bed Charges) and expense heads (Utilities, Maintenance, Salaries, Supplies).');
renderBullet('Voucher Entries', 'Records income vouchers and expense vouchers with voucher numbers, reference numbers, payment mode, and description.');

// 3.12 HR & Payroll
renderSubSection('3.12 HR, Staff Directory & Payroll Management');
renderParagraph(
  'Manages hospital human resources, department allocations, staff designations, basic salaries, and monthly payroll dispatches.'
);
renderBullet('Employee Directory', 'Registers administrative staff, nurses, technicians, and support staff with employee codes, designation, and salary.');
renderBullet('Payroll Sheet & Payment', 'Generates monthly salary sheets, records deductions/allowances, and issues salary payment vouchers (PAY-2026-0001).');

// 3.13 Referral System
renderSubSection('3.13 Referral Partner Network & Commission Engine');
renderParagraph(
  'Automates tracking of external referral doctors, agents, and organizations with configurable commission rates.'
);
renderBullet('Referral Registry', 'Registers referral partners (REF-2026-0001) with contact details and customized commission percentages for OPD, IPD, Pathology, Radiology, and Pharmacy.');
renderBullet('Commission Calculation', 'Automatically calculates referral commission on generated bill amounts and tracks payout history.');

// 3.14 Reports & Analytics
renderSubSection('3.14 Business Intelligence & Analytics Engine');
renderParagraph(
  'Provides real-time financial and operational reports with customizable date range filters and export options.'
);
renderBullet('Report Catalog', 'Daily Ledger Report, Appointments Summary, Account Balance Report, Current Stock & Expiry Alert Report, and Blood Issue Audit Record.');

// 3.15 Settings & Access
renderSubSection('3.15 Enterprise Settings, Dynamic Access & SQL Backup');
renderParagraph(
  'System administration features for global configuration, dynamic user access control, and database maintenance.'
);
renderBullet('Branch & Charge Manage', 'Configures hospital branches and master charge categories.');
renderBullet('Company Profile', 'Sets hospital title, address, currency symbol (TK), barcode prefix, logo, pad print options, and tax calculation settings.');
renderBullet('Dynamic Access Control', 'Backend-driven user permissions saved in database (`MasterOption` table under `user_permission`) override role restrictions, granting granular access to modules and sub-menus.');
renderBullet('Database Backup & Restore', 'Full MySQL database backup engine creating standalone `.sql` files containing complete database schemas and data rows.');

// --- 4. DATABASE SCHEMA REFERENCE ---
renderSectionHeader('4', 'Database Schema Reference (39 Tables)');

renderParagraph(
  'The database schema is fully normalized and organized into 39 core relational tables in MySQL 8:'
);

renderFeatureBox('Core Relational Tables Overview', [
  { label: 'Core & Users', text: 'users, refresh_tokens, settings, master_options, company_profiles, branches' },
  { label: 'Patient & Clinical', text: 'patients, appointments, opd_visits, admissions, wards, beds, prescriptions' },
  { label: 'Diagnostics', text: 'lab_tests, lab_orders, lab_order_items, pathology_parameters, radiology_tests, radiology_orders, radiology_order_items, radiology_parameters' },
  { label: 'Pharmacy & Stock', text: 'medicines, medicine_sales, medicine_sale_items, medicine_batches, suppliers' },
  { label: 'Blood Bank', text: 'blood_donors, blood_bags, blood_issues' },
  { label: 'Fleet & HR', text: 'ambulances, ambulance_calls, departments, employees, payrolls' },
  { label: 'Billing & Finance', text: 'invoices, invoice_items, payments, expense_categories, expenses, referrals' },
]);

// --- 5. SYSTEM VERIFICATION & CONTROL ---
renderSectionHeader('5', 'System Verification & Document Sign-Off');

renderParagraph(
  'This document represents the complete, verified functional specification of the Hospital Management System (HMS). All modules detailed above have been implemented, tested, and verified for high performance, security compliance, and seamless operational flow.'
);

renderFeatureBox('Document Control & Compliance Metadata', [
  { label: 'Application Name', text: 'Hospital Management System (HMS)' },
  { label: 'System Build Version', text: 'v2.0.4 - Enterprise Edition' },
  { label: 'Backend Environment', text: 'Node.js v18+ / Express.js / Sequelize ORM / MySQL 8' },
  { label: 'Frontend Environment', text: 'React 18 / Vite / TailwindCSS / SPA Architecture' },
  { label: 'Backup Engine Status', text: 'MySQL .sql Dump Generation Verified (Content-Type: application/sql)' },
  { label: 'Permission Engine Status', text: 'Backend-Driven MasterOption User Access Control Verified' },
  { label: 'Date Filter Engine', text: 'Universal Inclusive Date Range Engine Verified Across All 14 Modules' },
]);

doc.moveDown(1);

// Sign-off Box at the end of content
checkPageSpace(80);
const boxY = doc.y;
doc.rect(40, boxY, 515, 60).fillAndStroke('#E0F2F1', C_PRIMARY);
doc.fillColor(C_SECONDARY).fontSize(11).font('Helvetica-Bold').text('OFFICIAL PROJECT SIGN-OFF', 55, boxY + 12);
doc.fillColor(C_TEXT).fontSize(9.5).font('Helvetica').text('Prepared & Certified by: DeshIT-BD Software Development Team', 55, boxY + 28);
doc.fillColor(C_MUTED).fontSize(9).font('Helvetica').text('Date of Certification: 09 August 2026  |  Status: Production Approved', 55, boxY + 42);

// --- FOOTER & PAGE NUMBERING ---
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(40, 805, 515, 1).fill(C_BORDER);
  doc.fillColor(C_MUTED).fontSize(8.5).font('Helvetica');
  doc.text('Hospital Management System (HMS) - Full Technical & Functional Manual', 40, 812, { align: 'left' });
  doc.text(`Page ${i + 1} of ${range.count}`, 40, 812, { align: 'right' });
}

doc.end();

writeStream.on('finish', () => {
  console.log(`PDF documentation successfully generated (${range.count} pages) at: ${outputPath}`);
});
