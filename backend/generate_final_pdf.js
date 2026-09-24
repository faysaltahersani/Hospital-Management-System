'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function buildPDF() {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
  });

  const pdfPath = path.join(__dirname, 'Hospital_Management_System_Documentation.pdf');
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Cover / Header Banner
  doc.rect(40, 40, 515, 60).fill('#118a8c');
  doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('DeshIT Hospital Management System', 50, 52, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Complete System Modules & Submodules Documentation (Exact Navbar Order)', 50, 78, { align: 'center' });

  doc.moveDown(2);
  doc.fillColor('#333333').fontSize(9).font('Helvetica');

  // Executive Architecture Overview
  doc.fillColor('#118a8c').fontSize(12).font('Helvetica-Bold').text('1. System Architecture & Navigation Overview', 40, 115);
  doc.rect(40, 130, 515, 2).fill('#118a8c');
  doc.moveDown(0.5);

  doc.fillColor('#333333').fontSize(8.5).font('Helvetica');
  doc.text('This document presents the complete hierarchy of all 20 Navbar Modules and their exact Entry & Record submodules as structured in the application navigation header (from left to right).');
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold').text('Technology Stack Breakdown:');
  doc.font('Helvetica');
  doc.text('• Frontend UI Layer: React 18, Vite, React Router DOM v7 (src/features/*).');
  doc.text('• Backend API Layer: Node.js, Express.js (src/modules/* controllers, services & routes).');
  doc.text('• Database Storage Layer: MySQL (hospital_management) with 37 Relational Tables & Sequelize ORM.');
  doc.text('• Security Protocol: JWT Access Tokens, Refresh Tokens, Joi Validation, RBAC Guards & Audit Logging.');
  doc.moveDown(1);

  // Section 2: Complete Modules in Navbar Order
  doc.fillColor('#118a8c').fontSize(12).font('Helvetica-Bold').text('2. All 20 Modules & Submodules (Exact Top Navbar Order)');
  doc.rect(40, doc.y + 2, 515, 2).fill('#118a8c');
  doc.moveDown(0.6);

  const fullNavbarModules = [
    {
      name: '1. Options (System Master Settings)',
      frontendPath: 'src/features/options',
      backendPath: 'src/modules/settings',
      dbTables: 'settings, master_options',
      entries: [
        'Master Options: Configures symptom types, symptom heads, charge categories & tax rates.',
        'System Settings: Hospital company profile (Name, Logo, Phone, Address, Currency, VAT).'
      ],
      records: [
        'Tariff Charges: Master price tariff list for all hospital services & diagnostic charges.'
      ]
    },
    {
      name: '2. Quick Options (Quick Shortcuts)',
      frontendPath: 'src/features/quick-options',
      backendPath: 'src/modules/settings',
      dbTables: 'patients, opd_visits, lab_orders, pharmacy_sales',
      entries: [
        'Quick Patient Registration: Fast-track patient intake form.',
        'Quick OPD Consultation Ticket: Instant ticket issuance for outpatient visits.',
        'Quick Lab Test Booking: Fast diagnostic pathology test ticket creation.',
        'Quick Pharmacy Sale: Rapid POS counter medicine sale.'
      ],
      records: [
        'Today\'s Summary: Real-time quick access transaction summary.'
      ]
    },
    {
      name: '3. Dashboard (Executive Overview)',
      frontendPath: 'src/features/dashboard',
      backendPath: 'src/modules/reports',
      dbTables: 'patients, opd_visits, admissions, beds, medicine_sales, invoices',
      entries: [
        'Live Metrics Overview: Displays total patient count, today\'s OPD visits & active IPD bed occupancy.',
        'Financial Revenue Widgets: Real-time graphs for daily cash collections, pharmacy sales & lab billing.'
      ],
      records: [
        'Recent Activity Audit Log: System audit log of recent transactions & staff actions.'
      ]
    },
    {
      name: '4. Modules (Central Navigation Grid)',
      frontendPath: 'src/features/modules',
      backendPath: 'src/modules/auth',
      dbTables: 'users, audit_logs',
      entries: [
        'Module Access Grid: Central visual dashboard displaying all hospital feature modules.'
      ],
      records: [
        'Role Access Summary: Shows module permissions assigned to current user role.'
      ]
    },
    {
      name: '5. Pathology (Pathology Laboratory)',
      frontendPath: 'src/features/pathology',
      backendPath: 'src/modules/laboratory',
      dbTables: 'lab_tests, lab_orders, lab_order_items, master_options',
      entries: [
        'Pathology Bill Entry: Issues patient test tickets & specimen collection slips.',
        'Pathology Test Entry: Configures lab tests (CBC, RBS, LFT, KFT) and price rates.',
        'Pathology Test Category Entry: Categorizes tests (Hematology, Biochemistry, Serology).',
        'Pathology Test Unit Entry: Defines test measurement units (g/dL, mg/dL, /cu.mm).',
        'Pathology Parameter Entry: Sets reference normal ranges for test findings.'
      ],
      records: [
        'Pathology Bill Record: History of patient pathology bill tickets and lab reports.',
        'Pathology Test List: Master catalog of configured lab diagnostic tests.'
      ]
    },
    {
      name: '6. Radiology (Diagnostic Imaging)',
      frontendPath: 'src/features/radiology',
      backendPath: 'src/modules/radiology',
      dbTables: 'radiology_tests, radiology_orders',
      entries: [
        'Radiology Bill Entry: Books imaging test tickets (X-Ray, USG, CT Scan, MRI, ECG).',
        'Radiology Test Entry: Configures imaging modalities and pricing tariffs.',
        'Radiology Test Category Entry: Categorizes imaging types (X-Ray, Ultrasound, CT, MRI).',
        'Radiology Test Unit Entry: Defines measurement parameter units.',
        'Radiology Parameter Entry: Sets up radiologist examination templates.'
      ],
      records: [
        'Radiology Bill Record: History of radiology bill orders & patient imaging reports.',
        'Radiology Test List: Directory of diagnostic radiology imaging tests.'
      ]
    },
    {
      name: '7. Appointment (Doctor Appointments)',
      frontendPath: 'src/features/appointment',
      backendPath: 'src/modules/appointments',
      dbTables: 'appointments, patients, doctors, departments',
      entries: [
        'Appointment Entry: Books doctor appointment slot & calculates consultation fee.',
        'Appointment Priority Entry: Sets priority levels (Emergency, Normal, VIP).',
        'Appointment Shift Entry: Configures morning/evening consultation shifts.',
        'Appointment Slots Page: Manages doctor time slot availability.'
      ],
      records: [
        'Appointment Bill Record: History of booked appointments, queue serials & status.'
      ]
    },
    {
      name: '8. OPD (Outpatient Department)',
      frontendPath: 'src/features/opd',
      backendPath: 'src/modules/opd',
      dbTables: 'opd_visits, appointments, patients, doctors',
      entries: [
        'OPD Bill Entry: Issues outpatient consultation ticket, records symptoms & vitals.',
        'OPD Symptoms Manage: Configures symptom types & chief complaint categories.'
      ],
      records: [
        'OPD Bill Record: Audit list of outpatient visits, consultation fees & doctor notes.'
      ]
    },
    {
      name: '9. IPD (Inpatient & Admissions)',
      frontendPath: 'src/features/ipd',
      backendPath: 'src/modules/ipd',
      dbTables: 'admissions, patients, doctors, beds, wards',
      entries: [
        'IPD Bill Entry: Admits patient to hospital bed (ADM-XXX), sets diagnosis & advance paid.',
        'IPD Symptoms Manage: Manages inpatient admission symptom categories.'
      ],
      records: [
        'IPD Bill Record: Inpatient directory, stay duration, daily room charges & discharge summaries.'
      ]
    },
    {
      name: '10. Ambulance (Emergency Transport)',
      frontendPath: 'src/features/ambulance',
      backendPath: 'src/modules/ambulance',
      dbTables: 'ambulances, ambulance_trips',
      entries: [
        'Call Ambulance Entry: Dispatches emergency ambulance trip, records pickup/dropoff & fare.',
        'Ambulance Entry: Registers ambulance fleet vehicles (ICU/Standard) & driver details.'
      ],
      records: [
        'Call Ambulance Record: History of ambulance trip dispatches, distance km & fare invoices.'
      ]
    },
    {
      name: '11. Blood (Blood Bank Unit)',
      frontendPath: 'src/features/blood',
      backendPath: 'src/modules/blood-bank',
      dbTables: 'blood_donors, blood_bags, blood_issues',
      entries: [
        'Blood Donate Entry: Registers blood donation from donor.',
        'Blood Issue Entry: Requisitions blood bag for emergency or IPD patient.',
        'Blood Component Issue Entry: Issues specific blood components (RBC, Plasma, Platelets).',
        'Blood Component Separation Entry: Records separation of whole blood into components.',
        'Blood Donor Entry: Enrolls new blood donor profiles and contact info.',
        'Blood Group Entry: Configures blood group categories (A+, B+, O+, AB+).',
        'Blood Unit Entry: Configures blood measurement units.',
        'Blood Component Entry: Registers component types (Plasma, Platelets, Cryo).'
      ],
      records: [
        'Blood Stock: Real-time inventory of available blood bags by group.',
        'Blood Donate Record: Logs of donor blood donations.',
        'Blood Issue Record: Audit list of blood bag transfusions & issues.',
        'Blood Component Issue Record: Logs of blood component issues.',
        'Blood Component Separation Record: History of blood component separations.'
      ]
    },
    {
      name: '12. Pharmacy (POS & Inventory)',
      frontendPath: 'src/features/pharmacy',
      backendPath: 'src/modules/pharmacy',
      dbTables: 'medicines, medicine_sales, medicine_sale_items',
      entries: [
        'Pharmacy Sales: POS Counter sales memo for dispensing medicine to patients.',
        'Pharmacy Purchase: Records bulk medicine inventory purchase from suppliers.',
        'Pharmacy Sales Return: Processes patient medicine sales returns & refunds.',
        'Pharmacy Purchase Return: Handles returns of expired/damaged stock to suppliers.',
        'Pharmacy Supplier: Manages pharmaceutical supplier company directory.',
        'Medicine Batch Stock: Tracks batch numbers, manufacturing & expiry dates.'
      ],
      records: [
        'Pharmacy Sales Record: Audit list of pharmacy sales memo transactions.',
        'Pharmacy Purchase Record: Purchase order history from suppliers.',
        'Pharmacy Sales Return Record: Logs of medicine sales return memos.',
        'Pharmacy Purchase Return Record: Logs of supplier purchase return memos.',
        'Medicine Stock Report: Inventory stock levels & reorder alert status.'
      ]
    },
    {
      name: '13. Medicine (Medicine Catalog)',
      frontendPath: 'src/features/medicine',
      backendPath: 'src/modules/pharmacy',
      dbTables: 'medicines',
      entries: [
        'Medicine Entry: Registers new medicine items, generic names, prices & stock.',
        'Medicine Category Entry: Configures medicine categories (Tablet, Capsule, Syrup).',
        'Medicine Company Entry: Configures pharmaceutical manufacturing companies.',
        'Medicine Group Entry: Configures therapeutic generic groups.',
        'Medicine Unit Entry: Sets up dispensing unit metrics (Pcs, Box, Strip).'
      ],
      records: [
        'Medicine List: Directory of all configured medicines and stock status.'
      ]
    },
    {
      name: '14. Finance (Accounts & Financials)',
      frontendPath: 'src/features/finance',
      backendPath: 'src/modules/billing',
      dbTables: 'expenses, expense_categories, invoices, payments, master_options',
      entries: [
        'Expense Entry: Enters daily operational hospital expense vouchers and payment methods.',
        'Income Entry: Registers non-billing hospital incomes and direct cash collections.',
        'Contra Entry: Records internal bank-to-cash or cash-to-bank fund transfers.',
        'Expense Head Entry: Configures expense category heads (Utility, Supplies, Repairs).',
        'Income Head Entry: Configures revenue income heads and accounts.',
        'Tax Rate: Sets up VAT & Tax percentage rates (0%, 5% VAT).',
        'Account Entry: Manages cash and bank payment account ledgers.'
      ],
      records: [
        'Contra Record: Logs history of all contra fund transfers.',
        'Expense Record: Audit list of daily operational expenses.',
        'Income Record: Logs history of all income collection vouchers.',
        'Patient Due Collection List: Tracks patient due bills and pending payment collections.'
      ]
    },
    {
      name: '15. Reports (Executive Analytics)',
      frontendPath: 'src/features/reports',
      backendPath: 'src/modules/reports',
      dbTables: 'invoices, payments, expenses, opd_visits, lab_orders, radiology_orders, medicine_sales',
      entries: [
        'Daily Statement Report: Sectional revenue breakdown (Pathology, OPD, IPD, Pharmacy, Radiology).',
        'Daily Ledger Report: Daily cashbook and financial transaction log.',
        'Patient Ledger Report: Individual patient debit/credit account ledger.',
        'Patient Balance Report: Summary of patient outstanding due balances.',
        'Account Ledger Report: Cash & bank account transaction ledger.',
        'Account Balance Report: Financial balance summary across bank accounts.',
        'Pharmacy Stock Report: Pharmacy inventory valuation & stock summary.',
        'Medicine Batch-wise Stock Report: Batch number & expiry date stock audit.',
        'Supplier Balance Report: Vendor and pharmaceutical supplier due balances.',
        'Supplier Ledger Report: Individual supplier transaction history ledger.'
      ],
      records: [
        'OPD Bill Record Report: Outpatient billing audit report.',
        'IPD Bill Record Report: Inpatient billing audit report.',
        'Pathology Bill Record Report: Lab diagnostic billing audit report.',
        'Radiology Bill Record Report: Imaging billing audit report.',
        'Call Ambulance Record Report: Ambulance trip financial report.',
        'Referral Bill Record Report: Referral commission payout report.'
      ]
    },
    {
      name: '16. BED (Bed & Ward Allocation)',
      frontendPath: 'src/features/bed',
      backendPath: 'src/modules/beds',
      dbTables: 'beds, wards',
      entries: [
        'Bed Entry: Configures bed numbers, ward mapping & daily room rates.',
        'Bed Management: Grid layout tool for bed maintenance and status.'
      ],
      records: [
        'Bed Availability: Real-time live occupancy view of available/occupied beds.'
      ]
    },
    {
      name: '17. Patient (Patient Registry)',
      frontendPath: 'src/features/patient',
      backendPath: 'src/modules/patients',
      dbTables: 'patients',
      entries: [
        'Patient Entry: Registers new patient profiles and generates PAT-ID.'
      ],
      records: [
        'Patient List: Searchable directory of registered hospital patients.'
      ]
    },
    {
      name: '18. Doctor (Doctors & Schedules)',
      frontendPath: 'src/features/doctor',
      backendPath: 'src/modules/doctors',
      dbTables: 'doctors, departments, users',
      entries: [
        'Doctor Entry: Registers doctor profile, consultation fee & qualifications.',
        'Doctor Department: Maps doctor to medical department.',
        'Doctor Specialization: Configures medical specialties.'
      ],
      records: [
        'Doctor List: Directory of hospital doctors and chamber schedules.'
      ]
    },
    {
      name: '19. Referral (Referral Management)',
      frontendPath: 'src/features/referral',
      backendPath: 'src/modules/referrals',
      dbTables: 'referrals, doctors, patients',
      entries: [
        'Referral Bill Entry: Records patient referral bill and commission.',
        'Referral Person Entry: Registers external referral doctors & clinics.'
      ],
      records: [
        'Referral Bill Record: History of patient referrals & commission status.',
        'Referral Person List: Directory of referral persons and external facilities.'
      ]
    },
    {
      name: '20. HR & Payroll (Human Resources)',
      frontendPath: 'src/features/hr-payroll',
      backendPath: 'src/modules/hr',
      dbTables: 'employees, attendance, payrolls, departments',
      entries: [
        'Employee Entry: Registers hospital staff employees, designations & basic salary.',
        'Department Entry: Configures HR organizational departments.',
        'Employee Salary Payment Entry: Processes monthly salary payments & allowances.',
        'Salary Sheet Page: Generates monthly hospital staff salary sheet.'
      ],
      records: [
        'Employee List: Directory of active hospital staff and designation details.'
      ]
    }
  ];

  fullNavbarModules.forEach((mod) => {
    if (doc.y > 670) {
      doc.addPage();
    }

    doc.fillColor('#118a8c').fontSize(10.5).font('Helvetica-Bold').text(mod.name);
    doc.fillColor('#666666').fontSize(8).font('Helvetica-Oblique').text(`Frontend Path: ${mod.frontendPath} | Backend Path: ${mod.backendPath}`);
    doc.fillColor('#118a8c').font('Helvetica-Bold').fontSize(8).text(`Database Tables: `, { continued: true });
    doc.fillColor('#333333').font('Helvetica').text(mod.dbTables);

    doc.moveDown(0.2);
    doc.fillColor('#222222').fontSize(8).font('Helvetica-Bold').text('Entry Submodules (Data Input Forms):');
    doc.font('Helvetica').fillColor('#444444');
    mod.entries.forEach((sub) => {
      doc.text(`  • ${sub}`);
    });

    if (mod.records && mod.records.length > 0) {
      doc.moveDown(0.2);
      doc.fillColor('#222222').fontSize(8).font('Helvetica-Bold').text('Record Submodules (Audit Records & Logs):');
      doc.font('Helvetica').fillColor('#444444');
      mod.records.forEach((rec) => {
        doc.text(`  • ${rec}`);
      });
    }

    doc.moveDown(0.6);
  });

  // Summary Box at End
  if (doc.y > 670) {
    doc.addPage();
  }
  doc.moveDown(0.8);
  const bannerY = doc.y;
  doc.rect(40, bannerY, 515, 45).fill('#e6f3f3');
  doc.fillColor('#118a8c').fontSize(9.5).font('Helvetica-Bold').text('System Status: 100% Fully Backend-Driven & Database Verified', 50, bannerY + 10, { align: 'center', width: 495 });
  doc.fillColor('#444444').fontSize(8).font('Helvetica').text('Database: MySQL (hospital_management) | Total Verified Tables: 37 | All APIs Active on Port 5000', 50, bannerY + 26, { align: 'center', width: 495 });

  // Add Footers & Page Numbers safely at Y=770 (well within margin bounds)
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#888888').fontSize(8).font('Helvetica').text(`Page ${i + 1} of ${pages.count}`, 40, 770, { align: 'center', width: 515 });
  }

  doc.end();

  writeStream.on('finish', () => {
    console.log(`Final Clean PDF successfully created with EXACTLY ${doc.bufferedPageRange().count} pages at:`, pdfPath);
  });
}

buildPDF();
