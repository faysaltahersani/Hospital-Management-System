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
  AuditLog,
  RefreshToken,
} = require('../models');
const { hashPassword } = require('../utils/password');
const { ROLES, BLOOD_GROUPS, GENDERS } = require('../config/constants');

async function seed10EveryModule() {
  logger.info('========================================================================');
  logger.info('STARTING COMPREHENSIVE SEEDING: AT LEAST 10 RECORDS FOR ALL 37 MODULES');
  logger.info('========================================================================');

  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const defaultPasswordHash = await hashPassword('Admin@12345');

  // 1. DEPARTMENTS (10 Records)
  logger.info('1/37 Seeding Departments (10 items)...');
  const deptsData = [
    { name: 'General Medicine', code: 'GEN', description: 'Internal & general healthcare consultations' },
    { name: 'Cardiology', code: 'CARD', description: 'Heart, cardiovascular & vascular care' },
    { name: 'Pediatrics', code: 'PED', description: 'Child & neonatal healthcare' },
    { name: 'Orthopedics', code: 'ORTHO', description: 'Bones, joints, spine & trauma surgery' },
    { name: 'Gynecology & Obstetrics', code: 'GYN', description: "Women's reproductive health & maternity" },
    { name: 'Neurology', code: 'NEURO', description: 'Brain, nervous system & neuromuscular disorders' },
    { name: 'Pathology & Clinical Lab', code: 'PATH', description: 'Diagnostic blood & tissue testing' },
    { name: 'Radiology & Imaging', code: 'RAD', description: 'X-Ray, Ultrasound, CT Scan & MRI' },
    { name: 'Pharmacy', code: 'PHARM', description: 'Dispensing pharmaceutical medicines' },
    { name: 'Emergency & Casualty', code: 'EMERG', description: '24/7 Emergency trauma care' },
  ];
  const deptList = [];
  for (const d of deptsData) {
    const [dept] = await Department.findOrCreate({ where: { code: d.code }, defaults: d });
    deptList.push(dept);
  }

  // 2. SETTINGS (10 Records)
  logger.info('2/37 Seeding Settings (10 items)...');
  const settingsData = [
    { key: 'hospital_name', value: 'DeshIT International Hospital & Research Center' },
    { key: 'hospital_email', value: 'contact@deshit-hospital.org' },
    { key: 'hospital_phone', value: '+880 1711-000000' },
    { key: 'hospital_address', value: '789 Medical Highway, Gulshan, Dhaka 1212' },
    { key: 'currency', value: 'BDT' },
    { key: 'currency_symbol', value: '৳' },
    { key: 'tax_percentage', value: '5' },
    { key: 'emergency_hotline', value: '10616' },
    { key: 'website', value: 'https://hospital.deshitbd.com' },
    { key: 'timezone', value: 'Asia/Dhaka' },
  ];
  for (const s of settingsData) {
    await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
  }

  // 3. MASTER OPTIONS (20 Records)
  logger.info('3/37 Seeding MasterOptions (20 items)...');
  const masterData = [
    { type: 'symptom_type', code: 'ST-01', label: 'General Symptoms', sort_order: 1, description: 'Fever, fatigue, body ache' },
    { type: 'symptom_type', code: 'ST-02', label: 'Respiratory Symptoms', sort_order: 2, description: 'Cough, chest congestion, dyspnea' },
    { type: 'symptom_type', code: 'ST-03', label: 'Cardiovascular Symptoms', sort_order: 3, description: 'Palpitations, chest pressure, angina' },
    { type: 'symptom_type', code: 'ST-04', label: 'Gastrointestinal Symptoms', sort_order: 4, description: 'Nausea, abdominal pain, diarrhea' },
    { type: 'symptom_type', code: 'ST-05', label: 'Neurological Symptoms', sort_order: 5, description: 'Migraine, dizziness, numbness' },
    { type: 'symptom_head', code: 'SH-01', label: 'High Fever & Chills', sort_order: 1, description: 'Temperature over 101F' },
    { type: 'symptom_head', code: 'SH-02', label: 'Persistent Dry Cough', sort_order: 2, description: 'Coughing over 3 days' },
    { type: 'symptom_head', code: 'SH-03', label: 'Chest Pain & Tightness', sort_order: 3, description: 'Retrosternal pain' },
    { type: 'symptom_head', code: 'SH-04', label: 'Acute Abdominal Cramps', sort_order: 4, description: 'Lower stomach pain' },
    { type: 'symptom_head', code: 'SH-05', label: 'Severe Throbbing Headache', sort_order: 5, description: 'Frontal or temporal migraine' },
    { type: 'charge_category', code: 'CC-01', label: 'Consultation Fees', sort_order: 1, description: 'Outpatient consultation' },
    { type: 'charge_category', code: 'CC-02', label: 'Diagnostic Charges', sort_order: 2, description: 'Pathology and Radiology' },
    { type: 'charge_category', code: 'CC-03', label: 'Cabin & Bed Charges', sort_order: 3, description: 'Daily room stay' },
    { type: 'charge_category', code: 'CC-04', label: 'Surgical Procedure Fees', sort_order: 4, description: 'OT and Anesthesia' },
    { type: 'charge_category', code: 'CC-05', label: 'Ambulance Transport', sort_order: 5, description: 'Emergency transport' },
    { type: 'charge', code: 'CH-01', label: 'OPD Doctor Consultation Fee', sort_order: 1, description: 'Single consultation' },
    { type: 'charge', code: 'CH-02', label: 'Emergency Room Admission Fee', sort_order: 2, description: 'ER Registration' },
    { type: 'charge', code: 'CH-03', label: 'General Bed Stay Charge', sort_order: 3, description: 'Per 24 hours' },
    { type: 'tax_rate', code: 'TAX-00', label: '0% Exempt Tax', sort_order: 1, description: 'No tax' },
    { type: 'tax_rate', code: 'TAX-05', label: '5% Standard VAT', sort_order: 2, description: '5% Government VAT' },
  ];
  for (const m of masterData) {
    await MasterOption.findOrCreate({ where: { type: m.type, code: m.code }, defaults: m });
  }

  // 4. USERS (10 Records)
  logger.info('4/37 Seeding Users (10 items)...');
  const usersData = [
    { email: 'admin@hospital.local', full_name: 'Admin', role: ROLES.ADMIN },
    { email: 'dr.anisur@hospital.local', full_name: 'Dr. Anisur Rahman', role: ROLES.DOCTOR },
    { email: 'dr.fatema@hospital.local', full_name: 'Dr. Fatema Tuz Zahra', role: ROLES.DOCTOR },
    { email: 'dr.shahin@hospital.local', full_name: 'Dr. Md. Shahin Alam', role: ROLES.DOCTOR },
    { email: 'dr.nusrat@hospital.local', full_name: 'Dr. Nusrat Jahan', role: ROLES.DOCTOR },
    { email: 'dr.tanvir@hospital.local', full_name: 'Dr. Tanvir Hossain', role: ROLES.DOCTOR },
    { email: 'nurse.salma@hospital.local', full_name: 'Nurse Salma Begum', role: ROLES.NURSE },
    { email: 'reception.kabir@hospital.local', full_name: 'Kabir Hossain', role: ROLES.RECEPTIONIST },
    { email: 'accounts.tariq@hospital.local', full_name: 'Tariqul Islam', role: ROLES.ACCOUNTANT },
    { email: 'pharmacist.kamal@hospital.local', full_name: 'Kamal Uddin', role: ROLES.PHARMACIST },
  ];
  const userList = [];
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
    userList.push(user);
  }

  // 5. DOCTORS (10 Records)
  logger.info('5/37 Seeding Doctors (10 items)...');
  const doctorList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `DOC-${100 + i}`;
    let doc = await Doctor.findOne({ where: { doctor_code: code } });
    if (!doc) {
      let docUser = await User.findOne({ where: { email: `dr.specialist${i}@hospital.local` } });
      if (!docUser) {
        docUser = await User.create({
          email: `dr.specialist${i}@hospital.local`,
          password_hash: defaultPasswordHash,
          full_name: `Dr. Specialist ${i}`,
          role: ROLES.DOCTOR,
          is_active: true,
        });
      }
      const dIndex = (i - 1) % deptList.length;
      doc = await Doctor.create({
        user_id: docUser.id,
        department_id: deptList[dIndex].id,
        doctor_code: code,
        full_name: docUser.full_name,
        specialization: i % 2 === 0 ? 'Consultant Specialist' : 'Senior Specialist',
        qualification: 'MBBS, FCPS, MD',
        phone: `+880 1711-0000${10 + i}`,
        email: docUser.email,
        consultation_fee: 500 + i * 100,
        available_days: JSON.stringify(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']),
        is_active: true,
      });
    }
    doctorList.push(doc);
  }

  // 6. PATIENTS (10 Records)
  logger.info('6/37 Seeding Patients (10 items)...');
  const patientNames = [
    'Rahim Uddin', 'Sultana Begum', 'Abdul Karim', 'Sharmin Akter', 'Tariqul Islam',
    'Nusrat Parveen', 'Mustafizur Rahman', 'Rokeya Sultana', 'Kamrul Hasan', 'Fahmida Khan'
  ];
  const patientList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `PAT-${String(i).padStart(6, '0')}`;
    let pat = await Patient.findOne({ where: { patient_code: code } });
    if (!pat) {
      pat = await Patient.create({
        patient_code: code,
        full_name: patientNames[i - 1],
        gender: i % 2 === 0 ? GENDERS.FEMALE : GENDERS.MALE,
        age: 20 + i * 3,
        phone: `+880 1819-00000${i}`,
        email: `patient${i}@example.com`,
        blood_group: BLOOD_GROUPS[(i - 1) % BLOOD_GROUPS.length],
        address: `${i * 12} Mirpur Road, Dhaka`,
        is_active: true,
      });
    }
    patientList.push(pat);
  }

  // 7. WARDS (10 Records)
  logger.info('7/37 Seeding Wards (10 items)...');
  const wardNames = [
    { name: 'Male General Ward A', code: 'MGW-A', type: 'general' },
    { name: 'Female General Ward B', code: 'FGW-B', type: 'general' },
    { name: 'ICU Critical Care Ward', code: 'ICU-01', type: 'icu' },
    { name: 'CCU Cardiac Care Ward', code: 'CCU-01', type: 'ccu' },
    { name: 'Pediatric Care Ward', code: 'PED-01', type: 'pediatric' },
    { name: 'Maternity Labor Ward', code: 'MAT-01', type: 'maternity' },
    { name: 'VIP Deluxe Cabin Ward', code: 'CAB-VIP', type: 'private' },
    { name: 'HDU High Dependency Unit', code: 'HDU-01', type: 'hdu' },
    { name: 'Isolation Special Ward', code: 'ISO-01', type: 'isolation' },
    { name: 'Semi-Private Cabin Ward', code: 'CAB-SEMI', type: 'semi_private' },
  ];
  const wardList = [];
  for (const w of wardNames) {
    const [ward] = await Ward.findOrCreate({ where: { code: w.code }, defaults: w });
    wardList.push(ward);
  }

  // 8. BEDS (20 Records)
  logger.info('8/37 Seeding Beds (20 items)...');
  const bedList = [];
  for (let i = 1; i <= 20; i++) {
    const wIndex = (i - 1) % wardList.length;
    const ward = wardList[wIndex];
    const bNum = `BED-${ward.code}-${100 + i}`;
    let bed = await Bed.findOne({ where: { bed_number: bNum } });
    if (!bed) {
      bed = await Bed.create({
        ward_id: ward.id,
        bed_number: bNum,
        bed_type: ward.type,
        daily_charge: ward.type === 'icu' ? 5000 : (ward.type === 'private' ? 3500 : 1200),
        status: i % 3 === 0 ? 'occupied' : 'available',
      });
    }
    bedList.push(bed);
  }

  // 9. ADMISSIONS (10 Records)
  logger.info('9/37 Seeding Admissions (10 items)...');
  const admissionList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `ADM-${String(i).padStart(3, '0')}`;
    let adm = await Admission.findOne({ where: { admission_code: code } });
    if (!adm) {
      adm = await Admission.create({
        admission_code: code,
        patient_id: patientList[i - 1].id,
        doctor_id: doctorList[(i - 1) % doctorList.length].id,
        ward_id: bedList[i - 1].ward_id,
        bed_id: bedList[i - 1].id,
        admitted_at: new Date(Date.now() - i * 86400000),
        diagnosis: `Admitted for diagnosis ${i}: Severe Fever & Abdominal Pain`,
        status: i > 5 ? 'discharged' : 'admitted',
        total_charges: 3000 + i * 500,
        notes: 'Regular monitoring required',
      });
    }
    admissionList.push(adm);
  }

  // 10. APPOINTMENTS (10 Records)
  logger.info('10/37 Seeding Appointments (10 items)...');
  const appointmentList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `APT-${String(i).padStart(3, '0')}`;
    let app = await Appointment.findOne({ where: { appointment_code: code } });
    if (!app) {
      const doc = doctorList[(i - 1) % doctorList.length];
      app = await Appointment.create({
        appointment_code: code,
        patient_id: patientList[i - 1].id,
        doctor_id: doc.id,
        department_id: doc.department_id,
        appointment_date: new Date().toISOString().slice(0, 10),
        appointment_time: `${String(8 + i).padStart(2, '0')}:00:00`,
        consultation_fee: doc.consultation_fee,
        status: i % 2 === 0 ? 'completed' : 'scheduled',
        reason: 'Regular Health Consultation',
        created_by: userList[0].id,
      });
    }
    appointmentList.push(app);
  }

  // 11. OPD VISITS (10 Records)
  logger.info('11/37 Seeding OPD Visits (10 items)...');
  const opdVisitList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `OPD-${String(i).padStart(3, '0')}`;
    let visit = await OpdVisit.findOne({ where: { visit_code: code } });
    if (!visit) {
      const doc = doctorList[(i - 1) % doctorList.length];
      visit = await OpdVisit.create({
        visit_code: code,
        appointment_id: appointmentList[i - 1].id,
        patient_id: patientList[i - 1].id,
        doctor_id: doc.id,
        department_id: doc.department_id,
        visit_date: new Date(Date.now() - i * 3600000),
        chief_complaint: 'Seasonal fever, sore throat and malaise',
        diagnosis: 'Upper Respiratory Tract Infection',
        consultation_fee: doc.consultation_fee,
        status: 'completed',
        advice: 'Drink warm water and rest for 3 days',
      });
    }
    opdVisitList.push(visit);
  }

  // 12. MEDICINES (10 Records)
  logger.info('12/37 Seeding Medicines (10 items)...');
  const medsData = [
    { code: 'MED-001', name: 'Napa Extra 500mg', generic_name: 'Paracetamol + Caffeine', manufacturer: 'Beximco Pharma', category: 'Tablet', purchase_price: 2.0, sale_price: 2.5, stock_quantity: 500, reorder_level: 50 },
    { code: 'MED-002', name: 'Seclo 20mg', generic_name: 'Omeprazole', manufacturer: 'Square Pharmaceuticals', category: 'Capsule', purchase_price: 4.5, sale_price: 6.0, stock_quantity: 400, reorder_level: 40 },
    { code: 'MED-003', name: 'Maxpro 20mg', generic_name: 'Esomeprazole', manufacturer: 'Incepta Pharma', category: 'Capsule', purchase_price: 6.0, sale_price: 8.0, stock_quantity: 350, reorder_level: 30 },
    { code: 'MED-004', name: 'Azithrocin 500mg', generic_name: 'Azithromycin', manufacturer: 'Beximco Pharma', category: 'Tablet', purchase_price: 25.0, sale_price: 35.0, stock_quantity: 150, reorder_level: 20 },
    { code: 'MED-005', name: 'Ace 500mg', generic_name: 'Paracetamol', manufacturer: 'Square Pharmaceuticals', category: 'Tablet', purchase_price: 1.2, sale_price: 1.5, stock_quantity: 600, reorder_level: 100 },
    { code: 'MED-006', name: 'Ciprocin 500mg', generic_name: 'Ciprofloxacin', manufacturer: 'Square Pharmaceuticals', category: 'Tablet', purchase_price: 12.0, sale_price: 15.0, stock_quantity: 200, reorder_level: 30 },
    { code: 'MED-007', name: 'Sergel 20mg', generic_name: 'Esomeprazole', manufacturer: 'Healthcare Pharma', category: 'Capsule', purchase_price: 5.0, sale_price: 7.0, stock_quantity: 450, reorder_level: 40 },
    { code: 'MED-008', name: 'Monas 10mg', generic_name: 'Montelukast', manufacturer: 'Acme Laboratories', category: 'Tablet', purchase_price: 14.0, sale_price: 18.0, stock_quantity: 300, reorder_level: 25 },
    { code: 'MED-009', name: 'Fexo 120mg', generic_name: 'Fexofenadine', manufacturer: 'Square Pharmaceuticals', category: 'Tablet', purchase_price: 7.0, sale_price: 9.0, stock_quantity: 250, reorder_level: 30 },
    { code: 'MED-010', name: 'Altrum 50mg', generic_name: 'Tramadol HCl', manufacturer: 'Renata Limited', category: 'Tablet', purchase_price: 8.0, sale_price: 11.0, stock_quantity: 180, reorder_level: 20 },
  ];
  const medList = [];
  for (const m of medsData) {
    const [med] = await Medicine.findOrCreate({ where: { code: m.code }, defaults: m });
    medList.push(med);
  }

  // 13. PRESCRIPTIONS & 14. PRESCRIPTION ITEMS (10 Prescriptions, 20 Items)
  logger.info('13/37 & 14/37 Seeding Prescriptions & Items (10 Prescriptions, 20 Items)...');
  const prescriptionList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `RX-${String(i).padStart(3, '0')}`;
    let presc = await Prescription.findOne({ where: { prescription_code: code } });
    if (!presc) {
      presc = await Prescription.create({
        prescription_code: code,
        patient_id: patientList[i - 1].id,
        doctor_id: doctorList[(i - 1) % doctorList.length].id,
        appointment_id: appointmentList[i - 1].id,
        prescribed_at: new Date(),
        diagnosis: `Clinical Diagnosis ${i}: Viral Syndrome & Hyperacidity`,
        notes: 'Follow up after 5 days of medicine completion',
        status: 'finalized',
      });
      await PrescriptionItem.create({
        prescription_id: presc.id,
        medicine_id: medList[(i - 1) % medList.length].id,
        medicine_name: medList[(i - 1) % medList.length].name,
        dosage: '1+0+1',
        frequency: 'Twice daily',
        duration: '5 days',
        quantity: 10,
        instructions: 'After meal with water',
      });
      await PrescriptionItem.create({
        prescription_id: presc.id,
        medicine_id: medList[i % medList.length].id,
        medicine_name: medList[i % medList.length].name,
        dosage: '1+0+0',
        frequency: 'Once daily in morning',
        duration: '7 days',
        quantity: 7,
        instructions: 'Before meal 30 mins',
      });
    }
    prescriptionList.push(presc);
  }

  // 15. MEDICINE SALES & 16. MEDICINE SALE ITEMS (10 Sales, 20 Items)
  logger.info('15/37 & 16/37 Seeding Medicine Sales & Sale Items (10 Sales, 20 Items)...');
  const medicineSaleList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `PHARM-${String(i).padStart(3, '0')}`;
    let sale = await MedicineSale.findOne({ where: { sale_code: code } });
    if (!sale) {
      const med1 = medList[(i - 1) % medList.length];
      const med2 = medList[i % medList.length];
      const sub = Number(med1.sale_price) * 10 + Number(med2.sale_price) * 5;
      sale = await MedicineSale.create({
        sale_code: code,
        patient_id: patientList[i - 1].id,
        prescription_id: prescriptionList[i - 1].id,
        sold_by: userList[0].id,
        sold_at: new Date(),
        subtotal: sub,
        discount: 10,
        total: sub - 10,
        payment_method: 'cash',
        status: 'completed',
      });
      await MedicineSaleItem.create({
        sale_id: sale.id,
        medicine_id: med1.id,
        quantity: 10,
        unit_price: med1.sale_price,
        total_price: Number(med1.sale_price) * 10,
      });
      await MedicineSaleItem.create({
        sale_id: sale.id,
        medicine_id: med2.id,
        quantity: 5,
        unit_price: med2.sale_price,
        total_price: Number(med2.sale_price) * 5,
      });
    }
    medicineSaleList.push(sale);
  }

  // 17. LAB TESTS (10 Records)
  logger.info('17/37 Seeding Pathology Lab Tests (10 items)...');
  const labTestsData = [
    { code: 'LAB-001', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 400 },
    { code: 'LAB-002', name: 'Blood Sugar Random (RBS)', category: 'Biochemistry', price: 150 },
    { code: 'LAB-003', name: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', price: 150 },
    { code: 'LAB-004', name: 'Lipid Profile Complete', category: 'Biochemistry', price: 1000 },
    { code: 'LAB-005', name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 800 },
    { code: 'LAB-006', name: 'Kidney Function Test (KFT / Creatinine)', category: 'Biochemistry', price: 500 },
    { code: 'LAB-007', name: 'Serum Electrolytes (Na+, K+, Cl-)', category: 'Biochemistry', price: 700 },
    { code: 'LAB-008', name: 'Urine Routine Examination (R/E)', category: 'Clinical Pathology', price: 200 },
    { code: 'LAB-009', name: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrinology', price: 600 },
    { code: 'LAB-010', name: 'Dengue NS1 Antigen Test', category: 'Serology', price: 500 },
  ];
  const labTestList = [];
  for (const lt of labTestsData) {
    const [test] = await LabTest.findOrCreate({ where: { code: lt.code }, defaults: lt });
    labTestList.push(test);
  }

  // 18. LAB ORDERS & 19. LAB ORDER ITEMS (10 Orders, 20 Items)
  logger.info('18/37 & 19/37 Seeding Pathology Lab Orders & Items (10 Orders, 20 Items)...');
  const labOrderList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `LABORD-${String(i).padStart(3, '0')}`;
    let order = await LabOrder.findOne({ where: { order_code: code } });
    if (!order) {
      const test1 = labTestList[(i - 1) % labTestList.length];
      const test2 = labTestList[i % labTestList.length];
      order = await LabOrder.create({
        order_code: code,
        patient_id: patientList[i - 1].id,
        doctor_id: doctorList[(i - 1) % doctorList.length].id,
        ordered_at: new Date(),
        total: Number(test1.price) + Number(test2.price),
        status: 'completed',
        created_by: userList[0].id,
      });
      await LabOrderItem.create({
        order_id: order.id,
        test_id: test1.id,
        price: test1.price,
        status: 'completed',
        result_value: 'Normal Value (within range)',
        result_notes: `${test1.name} result processed cleanly.`,
      });
      await LabOrderItem.create({
        order_id: order.id,
        test_id: test2.id,
        price: test2.price,
        status: 'completed',
        result_value: 'Normal Range',
        result_notes: `${test2.name} within standard physiological limits.`,
      });
    }
    labOrderList.push(order);
  }

  // 20. RADIOLOGY TESTS (10 Records)
  logger.info('20/37 Seeding Radiology Tests (10 items)...');
  const radTestsData = [
    { code: 'RAD-001', name: 'Chest X-Ray PA View', category: 'xray', price: 500 },
    { code: 'RAD-002', name: 'USG Whole Abdomen', category: 'ultrasound', price: 1200 },
    { code: 'RAD-003', name: 'USG Lower Abdomen', category: 'ultrasound', price: 800 },
    { code: 'RAD-004', name: 'CT Scan Head (Brain)', category: 'ct', price: 4000 },
    { code: 'RAD-005', name: 'CT Scan Chest Contrast', category: 'ct', price: 5500 },
    { code: 'RAD-006', name: 'MRI Lumbar Spine', category: 'mri', price: 7000 },
    { code: 'RAD-007', name: 'MRI Brain Contrast', category: 'mri', price: 8500 },
    { code: 'RAD-008', name: 'X-Ray Knee Joint AP/LAT', category: 'xray', price: 600 },
    { code: 'RAD-009', name: 'ECG 12 Lead Diagnostic', category: 'other', price: 300 },
    { code: 'RAD-010', name: 'Echocardiogram 2D Color Doppler', category: 'ultrasound', price: 2000 },
  ];
  const radTestList = [];
  for (const rt of radTestsData) {
    const [rTest] = await RadiologyTest.findOrCreate({ where: { code: rt.code }, defaults: rt });
    radTestList.push(rTest);
  }

  // 21. RADIOLOGY ORDERS (10 Records)
  logger.info('21/37 Seeding Radiology Orders (10 items)...');
  const radOrderList = [];
  for (let i = 1; i <= 10; i++) {
    const code = `RADORD-${String(i).padStart(3, '0')}`;
    let rOrder = await RadiologyOrder.findOne({ where: { order_code: code } });
    if (!rOrder) {
      const rt = radTestList[(i - 1) % radTestList.length];
      rOrder = await RadiologyOrder.create({
        order_code: code,
        patient_id: patientList[i - 1].id,
        doctor_id: doctorList[(i - 1) % doctorList.length].id,
        test_id: rt.id,
        ordered_at: new Date(),
        price: rt.price,
        total: rt.price,
        status: 'completed',
        result_notes: `Findings for ${rt.name}: Normal radiological study with no acute abnormalities.`,
        created_by: userList[0].id,
      });
    }
    radOrderList.push(rOrder);
  }

  // 22. BLOOD DONORS (10 Records), 23. BLOOD BAGS (10 Bags), 24. BLOOD ISSUES (10 Issues)
  logger.info('22/37, 23/37 & 24/37 Seeding Blood Bank (10 Donors, 10 Bags, 10 Issues)...');
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A+', 'B+'];
  for (let i = 1; i <= 10; i++) {
    const dCode = `DONOR-${String(i).padStart(3, '0')}`;
    let donor = await BloodDonor.findOne({ where: { donor_code: dCode } });
    if (!donor) {
      donor = await BloodDonor.create({
        donor_code: dCode,
        full_name: `Donor ${i} (${patientNames[i - 1]})`,
        gender: i % 2 === 0 ? GENDERS.FEMALE : GENDERS.MALE,
        blood_group: bloodGroups[i - 1],
        phone: `+880 1712-88880${i}`,
        address: 'Dhaka Donor Center',
        last_donation_at: new Date(),
        total_donations: i,
      });
    }

    const bCode = `BAG-${bloodGroups[i - 1].replace('+', 'P').replace('-', 'N')}-${100 + i}`;
    let bag = await BloodBag.findOne({ where: { bag_code: bCode } });
    if (!bag) {
      bag = await BloodBag.create({
        donor_id: donor.id,
        bag_code: bCode,
        blood_group: bloodGroups[i - 1],
        component: 'whole_blood',
        volume_ml: 450,
        collected_at: new Date(),
        expires_at: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        status: i > 5 ? 'issued' : 'available',
        price: 1500,
      });
    }

    const issueCode = `BISSUE-${String(i).padStart(3, '0')}`;
    let issue = await BloodIssue.findOne({ where: { issue_code: issueCode } });
    if (!issue) {
      await BloodIssue.create({
        issue_code: issueCode,
        bag_id: bag.id,
        patient_id: patientList[i - 1].id,
        issued_at: new Date(),
        doctor_id: doctorList[(i - 1) % doctorList.length].id,
        price: 1500,
        notes: 'Emergency transfusion requirement fulfilled',
        created_by: userList[0].id,
      });
    }
  }

  // 25. AMBULANCES (10 Records) & 26. AMBULANCE TRIPS (10 Trips)
  logger.info('25/37 & 26/37 Seeding Ambulances & Trips (10 Vehicles, 10 Trips)...');
  for (let i = 1; i <= 10; i++) {
    const vNum = `DHAKA-METRO-CHA-${11 + i}-${2200 + i}`;
    let amb = await Ambulance.findOne({ where: { vehicle_number: vNum } });
    if (!amb) {
      amb = await Ambulance.create({
        vehicle_number: vNum,
        model: i % 2 === 0 ? 'Mercedes Benz ICU Ambulance' : 'Toyota HiAce Emergency Ambulance',
        type: i % 2 === 0 ? 'icu' : 'general',
        driver_name: `Driver Jamal ${i}`,
        driver_phone: `+880 1812-77770${i}`,
        status: 'available',
      });
    }

    const tCode = `TRIP-${String(i).padStart(3, '0')}`;
    let trip = await AmbulanceTrip.findOne({ where: { trip_code: tCode } });
    if (!trip) {
      await AmbulanceTrip.create({
        trip_code: tCode,
        ambulance_id: amb.id,
        patient_id: patientList[i - 1].id,
        requester_name: patientNames[i - 1],
        requester_phone: `+880 1819-00000${i}`,
        pickup_address: `Sector ${i}, Uttara, Dhaka`,
        dropoff_address: 'DeshIT Hospital Emergency Room',
        distance_km: 10 + i * 2,
        fare: 1000 + i * 200,
        dispatched_at: new Date(),
        completed_at: new Date(),
        status: 'completed',
        created_by: userList[0].id,
      });
    }
  }

  // 27. REFERRALS (10 Records)
  logger.info('27/37 Seeding Referrals (10 items)...');
  for (let i = 1; i <= 10; i++) {
    const refCode = `REF-${String(i).padStart(3, '0')}`;
    let ref = await Referral.findOne({ where: { referral_code: refCode } });
    if (!ref) {
      await Referral.create({
        referral_code: refCode,
        patient_id: patientList[i - 1].id,
        from_doctor_id: doctorList[(i - 1) % doctorList.length].id,
        to_doctor_id: doctorList[i % doctorList.length].id,
        external_doctor_name: `External Consultant ${i}`,
        external_facility: 'City Specialty Medical Center',
        external_phone: `+880 1911-33330${i}`,
        reason: 'Specialized Tertiary Care Referral & Second Opinion',
        notes: 'Patient advised to bring all diagnostic investigation reports.',
        referred_at: new Date(),
        status: i % 2 === 0 ? 'completed' : 'pending',
      });
    }
  }

  // 28. EMPLOYEES (10 Records), 29. ATTENDANCE (20 Records), 30. PAYROLL (10 Records)
  logger.info('28/37, 29/37 & 30/37 Seeding HR Employees, Attendance & Payroll (10 Employees, 20 Attendances, 10 Payrolls)...');
  const empDesignations = [
    'Senior Staff Nurse', 'Medical Technologist', 'Head Receptionist', 'Senior Accountant',
    'Hospital Pharmacist', 'ICU Charge Nurse', 'Lab Specialist', 'Billing Executive', 'HR Manager', 'Administrative Officer'
  ];
  for (let i = 1; i <= 10; i++) {
    const empCode = `EMP-${100 + i}`;
    let emp = await Employee.findOne({ where: { employee_code: empCode } });
    if (!emp) {
      let empUser = await User.findOne({ where: { email: `employee${i}@hospital.local` } });
      if (!empUser) {
        empUser = await User.create({
          email: `employee${i}@hospital.local`,
          password_hash: defaultPasswordHash,
          full_name: `Staff Member ${i}`,
          role: ROLES.NURSE,
          is_active: true,
        });
      }
      emp = await Employee.create({
        employee_code: empCode,
        user_id: empUser.id,
        department_id: deptList[(i - 1) % deptList.length].id,
        full_name: `Staff Member ${i} (${empDesignations[i - 1]})`,
        designation: empDesignations[i - 1],
        gender: i % 2 === 0 ? GENDERS.FEMALE : GENDERS.MALE,
        phone: `+880 1722-66660${i}`,
        email: empUser.email,
        address: 'Dhaka Staff Quarters',
        joining_date: '2023-01-15',
        basic_salary: 20000 + i * 2500,
        bank_account: `DBBL-120-150-${1000 + i}`,
        is_active: true,
      });
    }

    // Attendance (2 entries per employee)
    const attDate1 = new Date().toISOString().slice(0, 10);
    const attDate2 = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const existingAtt1 = await Attendance.findOne({ where: { employee_id: emp.id, attendance_date: attDate1 } });
    if (!existingAtt1) {
      await Attendance.create({
        employee_id: emp.id,
        attendance_date: attDate1,
        check_in: new Date(),
        check_out: new Date(),
        status: 'present',
        hours_worked: 8.0,
      });
    }
    const existingAtt2 = await Attendance.findOne({ where: { employee_id: emp.id, attendance_date: attDate2 } });
    if (!existingAtt2) {
      await Attendance.create({
        employee_id: emp.id,
        attendance_date: attDate2,
        check_in: new Date(Date.now() - 86400000),
        check_out: new Date(Date.now() - 86400000 + 28800000),
        status: 'present',
        hours_worked: 8.0,
      });
    }

    // Payroll
    const payCode = `PAYROLL-202607-${100 + i}`;
    let payroll = await Payroll.findOne({ where: { payroll_code: payCode } });
    if (!payroll) {
      const basic = Number(emp.basic_salary);
      const allow = 3000;
      const ded = 1000;
      await Payroll.create({
        payroll_code: payCode,
        employee_id: emp.id,
        period_month: 7,
        period_year: 2026,
        basic_salary: basic,
        allowances: allow,
        deductions: ded,
        tax: 500,
        net_pay: basic + allow - ded - 500,
        working_days: 26,
        present_days: 26,
        status: 'paid',
        paid_at: new Date(),
        paid_by: userList[0].id,
      });
    }
  }

  // 31. EXPENSE CATEGORIES (10 Records) & 32. EXPENSES (10 Records)
  logger.info('31/37 & 32/37 Seeding Expense Categories & Expenses (10 Categories, 10 Expenses)...');
  const expCategoriesData = [
    'Office & Medical Supplies', 'Utility Electricity & Water', 'Equipment Maintenance & Repair',
    'Staff Refreshments & Catering', 'Pharmaceutical Inventory Purchase', 'IT Systems & Software Maintenance',
    'Ambulance Fuel & Vehicle Service', 'Waste Management & Hygiene', 'Marketing & Public Relations', 'Security & Housekeeping'
  ];
  for (let i = 1; i <= 10; i++) {
    const catName = expCategoriesData[i - 1];
    let cat = await ExpenseCategory.findOne({ where: { name: catName } });
    if (!cat) {
      cat = await ExpenseCategory.create({
        name: catName,
        description: `Operational expense category: ${catName}`,
      });
    }

    const ref = `EXP-${String(i).padStart(3, '0')}`;
    let exp = await Expense.findOne({ where: { reference: ref } });
    if (!exp) {
      await Expense.create({
        category_id: cat.id,
        title: `${catName} Item Purchase #${i}`,
        description: `Approved expenditure for ${catName}`,
        amount: 2500 + i * 1500,
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        reference: ref,
        created_by: userList[0].id,
      });
    }
  }

  // 33. INVOICES (10 Invoices), 34. INVOICE ITEMS (20 Items), 35. PAYMENTS (10 Payments)
  logger.info('33/37, 34/37 & 35/37 Seeding Invoices, Items & Payments (10 Invoices, 20 Items, 10 Payments)...');
  for (let i = 1; i <= 10; i++) {
    const invCode = `INV-${String(i).padStart(3, '0')}`;
    let inv = await Invoice.findOne({ where: { invoice_code: invCode } });
    if (!inv) {
      inv = await Invoice.create({
        invoice_code: invCode,
        patient_id: patientList[i - 1].id,
        appointment_id: appointmentList[i - 1].id,
        issued_at: new Date(),
        subtotal: 2000,
        discount: 100,
        tax: 50,
        total: 1950,
        paid_amount: 1950,
        status: 'paid',
        created_by: userList[0].id,
      });
      await InvoiceItem.create({
        invoice_id: inv.id,
        item_type: 'consultation',
        description: 'OPD Doctor Consultation Charge',
        quantity: 1,
        unit_price: 1000,
        total_price: 1000,
      });
      await InvoiceItem.create({
        invoice_id: inv.id,
        item_type: 'lab_test',
        description: 'Complete Blood Count & Lab Investigation',
        quantity: 1,
        unit_price: 1000,
        total_price: 1000,
      });

      const payCode = `PAY-${String(i).padStart(3, '0')}`;
      let pay = await Payment.findOne({ where: { payment_code: payCode } });
      if (!pay) {
        await Payment.create({
          invoice_id: inv.id,
          payment_code: payCode,
          amount: 1950,
          method: 'cash',
          paid_at: new Date(),
          received_by: userList[0].id,
        });
      }
    }
  }

  // 36. AUDIT LOGS (10 Records)
  logger.info('36/37 Seeding Audit Logs (10 items)...');
  for (let i = 1; i <= 10; i++) {
    await AuditLog.create({
      user_id: userList[(i - 1) % userList.length].id,
      action: i % 2 === 0 ? 'update' : 'create',
      entity_type: i % 2 === 0 ? 'patient' : 'appointment',
      entity_id: String(i),
      changes: JSON.stringify({ note: `Audit record entry #${i}` }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });
  }

  // 37. REFRESH TOKENS (10 Records)
  logger.info('37/37 Seeding Refresh Tokens (10 items)...');
  for (let i = 1; i <= 10; i++) {
    const hash = `token_hash_sample_${i}_${Date.now()}`;
    await RefreshToken.create({
      user_id: userList[(i - 1) % userList.length].id,
      token_hash: hash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  logger.info('========================================================================');
  logger.info('SUCCESS: ALL 37 MODULES AND SUBMODULES POPULATED WITH 10+ RECORDS EACH!');
  logger.info('========================================================================');
}

if (require.main === module) {
  seed10EveryModule()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = seed10EveryModule;
