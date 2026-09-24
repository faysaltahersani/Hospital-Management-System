'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generatePDF() {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const outputPath = path.join(__dirname, 'Hospital_Management_System_Documentation.pdf');
  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Title Banner
  doc
    .rect(40, 40, 515, 60)
    .fill('#118a8c');

  doc
    .fillColor('#FFFFFF')
    .fontSize(20)
    .text('DeshIT Hospital Management System', 50, 52, { align: 'center' });
  doc
    .fontSize(12)
    .text('Complete System Architecture, Workflows & Module Documentation', 50, 78, { align: 'center' });

  doc.moveDown(2);

  // Section 1: System Overview
  doc.fillColor('#118a8c').fontSize(14).text('1. System Architecture & Tech Stack', 40, 120);
  doc.rect(40, 137, 515, 2).fill('#118a8c');
  doc.moveDown(0.5);

  doc.fillColor('#333333').fontSize(10);
  doc.text('• Frontend Stack: React 18, Vite, React Router DOM v7, CSS3 Design Token System, Dynamic Micro-animations.');
  doc.text('• Backend Stack: Node.js, Express.js (Modular Architecture), Sequelize ORM, MySQL Database (hospital_management).');
  doc.text('• Authentication & Security: JWT Access + Refresh Tokens, Role-Based Access Control (RBAC), Helmet, Rate Limiter, Joi Schemas.');
  doc.text('• Database Integrity: 37 Relational Tables, Soft Deletes (paranoid), Foreign Key Constraints, and Audit Logging.');

  doc.moveDown(1.5);

  // Section 2: Core Modules & Submodules
  doc.fillColor('#118a8c').fontSize(14).text('2. Complete Modules & Submodules Breakdown');
  doc.rect(40, doc.y + 2, 515, 2).fill('#118a8c');
  doc.moveDown(0.8);

  const modules = [
    {
      title: 'A. User Authentication & Access Control (ব্যবহারকারী ও সিকিউরিটি)',
      desc: 'Manages multi-role user access (Admin, Doctor, Nurse, Receptionist, Accountant, Pharmacist, Lab Tech, Patient) with JWT token refresh and action audit logs.'
    },
    {
      title: 'B. OPD - Outpatient Department (আউটডোর রোগী বিভাগ)',
      desc: 'Handles ticket generation, patient consultation queues, symptom recording, doctor fee billing, and consultation diagnosis history.'
    },
    {
      title: 'C. IPD - Inpatient & Ward Management (ইনডোর ও ওয়ার্ড ইউনিট)',
      desc: 'Controls bed admissions, ward allocations (ICU, CCU, General, Cabin), daily bed charges, patient treatment logs, and discharge billing.'
    },
    {
      title: 'D. Doctor & Consultation Management (ডাক্তার মডিউল)',
      desc: 'Doctor directory, department mapping, consultation fee structures, weekly duty availability schedules, and patient referral logs.'
    },
    {
      title: 'E. Patient Management (রোগী রেজিস্টার)',
      desc: 'Universal Patient ID generation (PAT-XXXXXX), demographic data, medical history, emergency contacts, and complete lifetime treatment history.'
    },
    {
      title: 'F. Appointment Scheduling (অ্যাপয়েন্টমেন্ট সিস্টেম)',
      desc: 'Online & counter appointment booking, serial queue tracking, status workflow (Scheduled -> Confirmed -> Completed), and OPD visit creation.'
    },
    {
      title: 'G. E-Prescription Management (প্রেসক্রিপশন মডিউল)',
      desc: 'Electronic prescriptions with diagnosis, dosage frequency (1+0+1), duration, special instructions, and integrated lab/radiology test orders.'
    },
    {
      title: 'H. Pharmacy & Inventory Management (ফার্মেসি ও স্টক)',
      desc: 'Medicine catalog, purchase/sale pricing, reorder level alerts, stock quantity management, and POS sale invoice memo generation.'
    },
    {
      title: 'I. Pathology Laboratory (প্যাথলজি ল্যাব ডায়াগনস্টিক)',
      desc: 'Lab test directory (CBC, RBS, LFT, KFT, Lipid Profile), test order creation, sample collection tracking, and test result entry.'
    },
    {
      title: 'J. Radiology & Imaging (রেডিওলজি ও ইমেজিং)',
      desc: 'Radiology test catalog (X-Ray, USG, CT Scan, MRI, ECG), order dispatch, diagnostic imaging findings notes, and technician reports.'
    },
    {
      title: 'K. Blood Bank Management (ব্লাড ব্যাংক মডিউল)',
      desc: 'Donor database, blood group inventory (A+, B+, O+, AB+), blood bag expiration tracking, and emergency blood issue records.'
    },
    {
      title: 'L. Ambulance & Emergency Transport (অ্যাম্বুলেন্স সেবা)',
      desc: 'Ambulance vehicle fleet (Standard & ICU), driver details, emergency trip booking, distance/fare calculation, and dispatch tracking.'
    },
    {
      title: 'M. Referral Management (রেফারেল সার্ভিস)',
      desc: 'Internal doctor-to-doctor referrals and external hospital/clinic referral tracking with commission and ledger reporting.'
    },
    {
      title: 'N. Accounts, Invoicing & Billing (অর্থ ও ইনভয়েস বিভাগ)',
      desc: 'Combined patient billing (OPD, IPD, Lab, Radiology, Medicine), cash/card/bKash payment collection, daily cashbook, and financial ledgers.'
    },
    {
      title: 'O. Expense Management (হাসপাতাল ব্যয় বিবরণী)',
      desc: 'Expense category setup, daily voucher entries, payment method tracking, and financial expense reporting.'
    },
    {
      title: 'P. HR & Payroll Management (এইচআর ও পে-রোল)',
      desc: 'Staff directory, daily attendance check-in/check-out logs, monthly payroll calculation (Basic + Allowances - Deductions - Tax), and pay slips.'
    },
    {
      title: 'Q. Executive Reports & Analytics (রিপোর্টস ও অ্যানালিটিক্স)',
      desc: 'Daily Statement Report (Sectional Pathology, OPD, IPD, Pharmacy, Radiology), Patient/Supplier/Account Ledgers, and revenue dashboards.'
    },
    {
      title: 'R. System Settings & Master Options (সিস্টেম সেটিংস)',
      desc: 'Hospital company profile, currency/tax settings, symptom types, symptom heads, charge categories, and master tariff charges.'
    }
  ];

  modules.forEach((mod) => {
    if (doc.y > 700) {
      doc.addPage();
    }
    doc.fillColor('#118a8c').fontSize(11).text(mod.title);
    doc.fillColor('#444444').fontSize(9).text(mod.desc);
    doc.moveDown(0.6);
  });

  // Footer / Conclusion
  if (doc.y > 700) doc.addPage();
  doc.moveDown(1);
  doc.rect(40, doc.y, 515, 40).fill('#f4f6f8');
  doc.fillColor('#118a8c').fontSize(10).text('System Status: 100% Fully Backend-Driven | Database: MySQL (hospital_management)', 50, doc.y - 30, { align: 'center' });

  doc.end();

  writeStream.on('finish', () => {
    console.log('PDF Generated successfully at:', outputPath);
  });
}

generatePDF();
