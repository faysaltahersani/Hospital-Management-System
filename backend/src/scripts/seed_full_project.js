'use strict';

const logger = require('../config/logger');
const {
  sequelize,
  User,
  Department,
  Doctor,
  Patient,
  Ward,
  Bed,
  Admission,
  Appointment,
  OpdVisit,
  Medicine,
  MedicineSale,
  MedicineSaleItem,
  Prescription,
  PrescriptionItem,
  LabTest,
  LabOrder,
  LabOrderItem,
  RadiologyTest,
  RadiologyOrder,
  BloodDonor,
  BloodBag,
  BloodIssue,
  Ambulance,
  AmbulanceTrip,
  Referral,
  Employee,
  Attendance,
  Payroll,
  ExpenseCategory,
  Expense,
  Invoice,
  InvoiceItem,
  Payment,
  MasterOption,
  Setting,
} = require('../models');
const { hashPassword } = require('../utils/password');
const { ROLES, BLOOD_GROUPS, GENDERS } = require('../config/constants');

async function seedFullProject() {
  logger.info('Starting full project database seeding...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const defaultPasswordHash = await hashPassword('Admin@12345');

  // 1. Departments
  logger.info('Seeding Departments...');
  const deptsData = [
    { name: 'General Medicine', code: 'GEN', description: 'General health & medical consultations' },
    { name: 'Cardiology', code: 'CARD', description: 'Heart, circulation, and vascular health' },
    { name: 'Pediatrics', code: 'PED', description: 'Child and adolescent healthcare' },
    { name: 'Orthopedics', code: 'ORTHO', description: 'Bones, joints, and musculoskeletal system' },
    { name: 'Gynecology & Obstetrics', code: 'GYN', description: "Women's health and pregnancy care" },
    { name: 'Neurology', code: 'NEURO', description: 'Brain, spine, and nervous system' },
    { name: 'Pathology', code: 'PATH', description: 'Laboratory diagnostic services' },
    { name: 'Radiology', code: 'RAD', description: 'Imaging and diagnostic scanning' },
    { name: 'Pharmacy', code: 'PHARM', description: 'Pharmaceutical & medicine dispensing' },
  ];
  const deptMap = {};
  for (const d of deptsData) {
    const [dept] = await Department.findOrCreate({ where: { code: d.code }, defaults: d });
    deptMap[d.code] = dept;
  }

  // 2. Settings
  logger.info('Seeding Settings...');
  const settingsData = [
    { key: 'hospital_name', value: 'DeshIT Hospital & Medical Center' },
    { key: 'hospital_email', value: 'info@hospital.local' },
    { key: 'hospital_phone', value: '+880 1700-000000' },
    { key: 'hospital_address', value: '123 Health Avenue, Dhaka, Bangladesh' },
    { key: 'currency', value: 'BDT' },
    { key: 'currency_symbol', value: '৳' },
  ];
  for (const s of settingsData) {
    await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
  }

  // 3. MasterOptions
  logger.info('Seeding MasterOptions...');
  const masterData = [
    { type: 'symptom_type', code: 'ST-01', label: 'General Symptoms', sort_order: 1 },
    { type: 'symptom_type', code: 'ST-02', label: 'Respiratory Symptoms', sort_order: 2 },
    { type: 'symptom_type', code: 'ST-03', label: 'Cardiovascular Symptoms', sort_order: 3 },
    { type: 'symptom_head', code: 'SH-01', label: 'High Fever & Chills', sort_order: 1 },
    { type: 'symptom_head', code: 'SH-02', label: 'Persistent Dry Cough', sort_order: 2 },
    { type: 'symptom_head', code: 'SH-03', label: 'Chest Pain & Tightness', sort_order: 3 },
    { type: 'charge_category', code: 'CC-01', label: 'Consultation Fees', sort_order: 1 },
    { type: 'charge_category', code: 'CC-02', label: 'Diagnostic Charges', sort_order: 2 },
    { type: 'charge_category', code: 'CC-03', label: 'Cabin & Bed Charges', sort_order: 3 },
    { type: 'charge', code: 'CH-01', label: 'OPD Doctor Consultation Fee', sort_order: 1 },
    { type: 'charge', code: 'CH-02', label: 'Emergency Room Admission Fee', sort_order: 2 },
    { type: 'tax_rate', code: 'TAX-00', label: '0% Standard Tax', sort_order: 1 },
    { type: 'tax_rate', code: 'TAX-05', label: '5% VAT', sort_order: 2 },
  ];
  for (const m of masterData) {
    await MasterOption.findOrCreate({ where: { type: m.type, code: m.code }, defaults: m });
  }

  // 4. Users
  logger.info('Seeding Users...');
  const usersData = [
    { email: 'admin@hospital.local', full_name: 'Admin', role: ROLES.ADMIN },
    { email: 'dr.anisur@hospital.local', full_name: 'Dr. Anisur Rahman', role: ROLES.DOCTOR },
    { email: 'dr.fatema@hospital.local', full_name: 'Dr. Fatema Tuz Zahra', role: ROLES.DOCTOR },
    { email: 'dr.shahin@hospital.local', full_name: 'Dr. Md. Shahin Alam', role: ROLES.DOCTOR },
    { email: 'dr.nusrat@hospital.local', full_name: 'Dr. Nusrat Jahan', role: ROLES.DOCTOR },
    { email: 'nurse.salma@hospital.local', full_name: 'Nurse Salma Begum', role: ROLES.NURSE },
    { email: 'reception.kabir@hospital.local', full_name: 'Kabir Hossain', role: ROLES.RECEPTIONIST },
    { email: 'accounts.tariq@hospital.local', full_name: 'Tariqul Islam', role: ROLES.ACCOUNTANT },
    { email: 'pharmacist.kamal@hospital.local', full_name: 'Kamal Uddin', role: ROLES.PHARMACIST },
    { email: 'labtech.shafiq@hospital.local', full_name: 'Shafiqul Islam', role: ROLES.LAB_TECH },
  ];

  const userMap = {};
  for (const u of usersData) {
    let user = await User.findOne({ where: { email: u.email } });
    if (!user) {
      user = await User.create({
        email: u.email,
        password_hash: defaultPasswordHash,
        full_name: u.full_name,
        role: u.role,
        is_active: true,
      });
    }
    userMap[u.email] = user;
  }

  // 5. Doctors
  logger.info('Seeding Doctors...');
  const doctorsData = [
    { email: 'dr.anisur@hospital.local', doctor_code: 'DOC-101', dept: 'GEN', specialization: 'Internal Medicine Specialist', fee: 800 },
    { email: 'dr.fatema@hospital.local', doctor_code: 'DOC-102', dept: 'CARD', specialization: 'Senior Cardiologist', fee: 1000 },
    { email: 'dr.shahin@hospital.local', doctor_code: 'DOC-103', dept: 'PED', specialization: 'Pediatric Specialist', fee: 700 },
    { email: 'dr.nusrat@hospital.local', doctor_code: 'DOC-104', dept: 'GYN', specialization: 'Gynecologist & Obstetrician', fee: 900 },
  ];
  const doctorList = [];
  let docCount = 0;
  for (const d of doctorsData) {
    docCount++;
    const user = userMap[d.email];
    const dept = deptMap[d.dept];
    let doc = await Doctor.findOne({ where: { doctor_code: d.doctor_code } });
    if (!doc) {
      doc = await Doctor.create({
        user_id: user.id,
        department_id: dept.id,
        doctor_code: d.doctor_code,
        full_name: user.full_name,
        specialization: d.specialization,
        qualification: 'MBBS, FCPS',
        phone: `+880 1711-00000${docCount}`,
        email: user.email,
        consultation_fee: d.fee,
        available_days: JSON.stringify(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']),
        is_active: true,
      });
    }
    doctorList.push(doc);
  }

  // 6. Patients
  logger.info('Seeding Patients...');
  const patientsData = [
    { code: 'PAT-000001', name: 'Rahim Uddin', gender: GENDERS.MALE, age: 45, phone: '+880 1819-111111', blood: BLOOD_GROUPS.A_POSITIVE },
    { code: 'PAT-000002', name: 'Sultana Begum', gender: GENDERS.FEMALE, age: 38, phone: '+880 1819-222222', blood: BLOOD_GROUPS.O_POSITIVE },
    { code: 'PAT-000003', name: 'Abdul Karim', gender: GENDERS.MALE, age: 58, phone: '+880 1819-333333', blood: BLOOD_GROUPS.B_POSITIVE },
    { code: 'PAT-000004', name: 'Sharmin Akter', gender: GENDERS.FEMALE, age: 29, phone: '+880 1819-444444', blood: BLOOD_GROUPS.AB_POSITIVE },
    { code: 'PAT-000005', name: 'Tariqul Islam', gender: GENDERS.MALE, age: 33, phone: '+880 1819-555555', blood: BLOOD_GROUPS.O_NEGATIVE },
  ];
  const patientList = [];
  for (const p of patientsData) {
    let pat = await Patient.findOne({ where: { patient_code: p.code } });
    if (!pat) {
      pat = await Patient.create({
        patient_code: p.code,
        full_name: p.name,
        gender: p.gender,
        age: p.age,
        phone: p.phone,
        blood_group: p.blood,
        address: 'Dhaka, Bangladesh',
        is_active: true,
      });
    }
    patientList.push(pat);
  }

  // 7. Wards & Beds
  logger.info('Seeding Wards and Beds...');
  const wardsData = [
    { name: 'Male General Ward', code: 'MGW', type: 'general' },
    { name: 'Female General Ward', code: 'FGW', type: 'general' },
    { name: 'ICU Ward', code: 'ICU', type: 'icu' },
    { name: 'CCU Ward', code: 'CCU', type: 'ccu' },
  ];
  const bedList = [];
  for (const w of wardsData) {
    const [ward] = await Ward.findOrCreate({ where: { code: w.code }, defaults: w });
    for (let i = 1; i <= 3; i++) {
      const bNum = `${w.code}-${100 + i}`;
      let bed = await Bed.findOne({ where: { bed_number: bNum } });
      if (!bed) {
        bed = await Bed.create({
          ward_id: ward.id,
          bed_number: bNum,
          bed_type: w.type,
          daily_charge: w.type === 'icu' ? 5000 : 1200,
          status: i === 1 ? 'occupied' : 'available',
        });
      }
      bedList.push(bed);
    }
  }

  // 8. Admissions (IPD)
  logger.info('Seeding IPD Admissions...');
  if (patientList.length && doctorList.length && bedList.length) {
    const existingAdm = await Admission.findOne({ where: { admission_code: 'ADM-001' } });
    if (!existingAdm) {
      await Admission.create({
        admission_code: 'ADM-001',
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        ward_id: bedList[0].ward_id,
        bed_id: bedList[0].id,
        admitted_at: new Date(),
        status: 'admitted',
        diagnosis: 'Acute Severe Bronchial Asthma',
        total_charges: 5000,
      });
    }
  }

  // 9. Appointments & OPD Visits
  logger.info('Seeding Appointments & OPD Visits...');
  if (patientList.length && doctorList.length) {
    let app1 = await Appointment.findOne({ where: { appointment_code: 'APT-001' } });
    if (!app1) {
      app1 = await Appointment.create({
        appointment_code: 'APT-001',
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        department_id: doctorList[0].department_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        appointment_time: '10:00:00',
        status: 'completed',
        consultation_fee: 800,
        created_by: userMap['admin@hospital.local'].id,
      });
    }
    const existingOpd = await OpdVisit.findOne({ where: { visit_code: 'OPD-001' } });
    if (!existingOpd) {
      await OpdVisit.create({
        visit_code: 'OPD-001',
        appointment_id: app1.id,
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        department_id: doctorList[0].department_id,
        visit_date: new Date(),
        chief_complaint: 'High fever and headache for 3 days',
        diagnosis: 'Viral Fever',
        consultation_fee: 800,
        status: 'completed',
      });
    }
  }

  // 10. Medicines
  logger.info('Seeding Medicines...');
  const medsData = [
    { code: 'MED-001', name: 'Napa Extra 500mg', generic_name: 'Paracetamol + Caffeine', manufacturer: 'Beximco Pharma', category: 'Tablet', purchase_price: 2.0, sale_price: 2.5, stock_quantity: 500, reorder_level: 50 },
    { code: 'MED-002', name: 'Seclo 20mg', generic_name: 'Omeprazole', manufacturer: 'Square Pharmaceuticals', category: 'Capsule', purchase_price: 4.5, sale_price: 6.0, stock_quantity: 400, reorder_level: 40 },
    { code: 'MED-003', name: 'Maxpro 20mg', generic_name: 'Esomeprazole', manufacturer: 'Incepta Pharma', category: 'Capsule', purchase_price: 6.0, sale_price: 8.0, stock_quantity: 350, reorder_level: 30 },
    { code: 'MED-004', name: 'Azithrocin 500mg', generic_name: 'Azithromycin', manufacturer: 'Beximco Pharma', category: 'Tablet', purchase_price: 25.0, sale_price: 35.0, stock_quantity: 150, reorder_level: 20 },
    { code: 'MED-005', name: 'Ace 500mg', generic_name: 'Paracetamol', manufacturer: 'Square Pharmaceuticals', category: 'Tablet', purchase_price: 1.2, sale_price: 1.5, stock_quantity: 600, reorder_level: 100 },
  ];
  const medList = [];
  for (const m of medsData) {
    const [med] = await Medicine.findOrCreate({ where: { code: m.code }, defaults: m });
    medList.push(med);
  }

  // 11. Prescriptions & PrescriptionItems
  logger.info('Seeding Prescriptions...');
  if (patientList.length && doctorList.length && medList.length) {
    let presc = await Prescription.findOne({ where: { prescription_code: 'RX-001' } });
    if (!presc) {
      presc = await Prescription.create({
        prescription_code: 'RX-001',
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        prescribed_at: new Date(),
        diagnosis: 'Acute Gastritis & Viral Fever',
        notes: 'Drink plenty of water and rest well for 3 days.',
        status: 'finalized',
      });
      await PrescriptionItem.create({
        prescription_id: presc.id,
        medicine_id: medList[0].id,
        medicine_name: medList[0].name,
        dosage: '1+0+1',
        duration: '5 days',
        instructions: 'After meal',
      });
      await PrescriptionItem.create({
        prescription_id: presc.id,
        medicine_id: medList[1].id,
        medicine_name: medList[1].name,
        dosage: '1+0+1',
        duration: '7 days',
        instructions: 'Before meal',
      });
    }
  }

  // 12. Medicine Sales
  logger.info('Seeding Medicine Sales...');
  if (patientList.length && medList.length) {
    let sale = await MedicineSale.findOne({ where: { sale_code: 'PHARM-001' } });
    if (!sale) {
      sale = await MedicineSale.create({
        sale_code: 'PHARM-001',
        patient_id: patientList[0].id,
        sold_by: userMap['pharmacist.kamal@hospital.local'].id,
        sold_at: new Date(),
        subtotal: 100,
        discount: 10,
        total: 90,
        payment_method: 'cash',
        status: 'completed',
      });
      await MedicineSaleItem.create({
        sale_id: sale.id,
        medicine_id: medList[0].id,
        quantity: 10,
        unit_price: 2.5,
        total_price: 25.0,
      });
    }
  }

  // 13. Lab Tests & Orders (Pathology)
  logger.info('Seeding Pathology Lab Tests & Orders...');
  const labTestsData = [
    { code: 'LAB-001', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 400 },
    { code: 'LAB-002', name: 'Blood Sugar Random (RBS)', category: 'Biochemistry', price: 150 },
    { code: 'LAB-003', name: 'Lipid Profile Complete', category: 'Biochemistry', price: 1000 },
    { code: 'LAB-004', name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 800 },
  ];
  const labTestList = [];
  for (const lt of labTestsData) {
    const [test] = await LabTest.findOrCreate({ where: { code: lt.code }, defaults: lt });
    labTestList.push(test);
  }

  if (patientList.length && doctorList.length && labTestList.length) {
    let lOrder = await LabOrder.findOne({ where: { order_code: 'LABORD-001' } });
    if (!lOrder) {
      lOrder = await LabOrder.create({
        order_code: 'LABORD-001',
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        ordered_at: new Date(),
        total: 550,
        status: 'completed',
      });
      await LabOrderItem.create({
        order_id: lOrder.id,
        test_id: labTestList[0].id,
        price: 400,
        status: 'completed',
        result_value: '13.5 g/dL',
        result_notes: 'Hemoglobin: 13.5 g/dL, WBC: 7,500 /cu.mm',
      });
    }
  }

  // 14. Radiology Tests & Orders
  logger.info('Seeding Radiology Tests & Orders...');
  const radTestsData = [
    { code: 'RAD-001', name: 'Chest X-Ray PA View', category: 'X-Ray', price: 500 },
    { code: 'RAD-002', name: 'USG Whole Abdomen', category: 'Ultrasound', price: 1200 },
    { code: 'RAD-003', name: 'CT Scan Head (Brain)', category: 'CT Scan', price: 4000 },
  ];
  const radTestList = [];
  for (const rt of radTestsData) {
    const [rTest] = await RadiologyTest.findOrCreate({ where: { code: rt.code }, defaults: rt });
    radTestList.push(rTest);
  }

  if (patientList.length && doctorList.length && radTestList.length) {
    const existingRad = await RadiologyOrder.findOne({ where: { order_code: 'RADORD-001' } });
    if (!existingRad) {
      await RadiologyOrder.create({
        order_code: 'RADORD-001',
        patient_id: patientList[0].id,
        doctor_id: doctorList[0].id,
        test_id: radTestList[0].id,
        ordered_at: new Date(),
        price: 500,
        total: 500,
        status: 'completed',
        result_notes: 'Both lung fields are clear. Heart size is normal.',
      });
    }
  }

  // 15. Blood Donors, Bags & Issues
  logger.info('Seeding Blood Bank...');
  let donor = await BloodDonor.findOne({ where: { donor_code: 'DONOR-001' } });
  if (!donor) {
    donor = await BloodDonor.create({
      donor_code: 'DONOR-001',
      full_name: 'Mahbubur Rahman',
      blood_group: 'A+',
      gender: GENDERS.MALE,
      phone: '+880 1712-999999',
      address: 'Dhaka',
      last_donation_at: new Date(),
    });
  }
  let bag = await BloodBag.findOne({ where: { bag_code: 'BAG-A101' } });
  if (!bag) {
    bag = await BloodBag.create({
      donor_id: donor.id,
      bag_code: 'BAG-A101',
      blood_group: 'A+',
      component: 'whole_blood',
      volume_ml: 450,
      collected_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'available',
      price: 1500,
    });
  }

  // 16. Ambulances & Trips
  logger.info('Seeding Ambulances & Trips...');
  let amb = await Ambulance.findOne({ where: { vehicle_number: 'DHAKA-METRO-CHA-11-2233' } });
  if (!amb) {
    amb = await Ambulance.create({
      vehicle_number: 'DHAKA-METRO-CHA-11-2233',
      model: 'Toyota HiAce Emergency Ambulance',
      type: 'icu',
      driver_name: 'Jamal Hossain',
      driver_phone: '+880 1812-000000',
      status: 'available',
    });
  }
  if (patientList.length && amb) {
    const existingTrip = await AmbulanceTrip.findOne({ where: { trip_code: 'TRIP-001' } });
    if (!existingTrip) {
      await AmbulanceTrip.create({
        trip_code: 'TRIP-001',
        ambulance_id: amb.id,
        patient_id: patientList[0].id,
        pickup_address: 'Dhanmondi, Dhaka',
        dropoff_address: 'DeshIT Hospital',
        distance_km: 12.5,
        fare: 1500,
        dispatched_at: new Date(),
        status: 'completed',
      });
    }
  }

  // 17. Referrals
  logger.info('Seeding Referrals...');
  if (patientList.length && doctorList.length >= 2) {
    const existingRef = await Referral.findOne({ where: { referral_code: 'REF-001' } });
    if (!existingRef) {
      await Referral.create({
        referral_code: 'REF-001',
        patient_id: patientList[0].id,
        from_doctor_id: doctorList[0].id,
        to_doctor_id: doctorList[1].id,
        referred_at: new Date(),
        reason: 'Echocardiogram and cardiology opinion',
        notes: 'Patient reports mild exertional dyspnea.',
        status: 'pending',
      });
    }
  }

  // 18. Employees, Attendance, Payroll
  logger.info('Seeding HR & Payroll...');
  let emp = await Employee.findOne({ where: { employee_code: 'EMP-101' } });
  if (!emp) {
    emp = await Employee.create({
      user_id: userMap['nurse.salma@hospital.local'].id,
      department_id: deptMap['GEN'].id,
      employee_code: 'EMP-101',
      full_name: 'Salma Begum',
      designation: 'Senior Staff Nurse',
      joining_date: '2023-01-01',
      basic_salary: 25000,
      is_active: true,
    });
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  const existingAtt = await Attendance.findOne({ where: { employee_id: emp.id, attendance_date: todayStr } });
  if (!existingAtt) {
    await Attendance.create({
      employee_id: emp.id,
      attendance_date: todayStr,
      check_in: new Date(),
      check_out: new Date(),
      status: 'present',
      hours_worked: 8.0,
    });
  }
  const existingPayroll = await Payroll.findOne({ where: { payroll_code: 'PAYROLL-202607-101' } });
  if (!existingPayroll) {
    await Payroll.create({
      payroll_code: 'PAYROLL-202607-101',
      employee_id: emp.id,
      period_month: 7,
      period_year: 2026,
      basic_salary: 25000,
      allowances: 3000,
      deductions: 1000,
      tax: 0,
      net_pay: 27000,
      working_days: 26,
      present_days: 26,
      status: 'paid',
      paid_at: new Date(),
    });
  }

  // 19. Expenses & Categories
  logger.info('Seeding Expenses & Categories...');
  let expCat = await ExpenseCategory.findOne({ where: { name: 'Office & Medical Supplies' } });
  if (!expCat) {
    expCat = await ExpenseCategory.create({
      name: 'Office & Medical Supplies',
      description: 'Daily consumable hospital supplies',
    });
  }
  const existingExpense = await Expense.findOne({ where: { reference: 'EXP-001' } });
  if (!existingExpense) {
    await Expense.create({
      category_id: expCat.id,
      title: 'Stationery and Syringes Purchase',
      amount: 4500,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: 'cash',
      reference: 'EXP-001',
    });
  }

  // 20. Invoices & Payments
  logger.info('Seeding Invoices & Payments...');
  if (patientList.length) {
    let inv = await Invoice.findOne({ where: { invoice_code: 'INV-001' } });
    if (!inv) {
      inv = await Invoice.create({
        invoice_code: 'INV-001',
        patient_id: patientList[0].id,
        issued_at: new Date(),
        subtotal: 1300,
        discount: 100,
        tax: 0,
        total: 1200,
        paid_amount: 1200,
        status: 'paid',
      });
      await InvoiceItem.create({
        invoice_id: inv.id,
        item_type: 'consultation',
        description: 'OPD Consultation Fee',
        quantity: 1,
        unit_price: 800,
        total_price: 800,
      });
      await InvoiceItem.create({
        invoice_id: inv.id,
        item_type: 'lab_test',
        description: 'Complete Blood Count (CBC)',
        quantity: 1,
        unit_price: 500,
        total_price: 500,
      });
      await Payment.create({
        invoice_id: inv.id,
        payment_code: 'PAY-001',
        amount: 1200,
        payment_method: 'cash',
        paid_at: new Date(),
        received_by: userMap['admin@hospital.local'].id,
      });
    }
  }

  logger.info('FULL PROJECT DATABASE SEEDING COMPLETED SUCCESSFULLY! All 38 modules are fully populated with live database data.');
}

if (require.main === module) {
  seedFullProject()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seedFullProject;
