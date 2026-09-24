import '../models/models.dart';

/// Seed data lifted verbatim from the E-Medical prototype so the app is fully
/// explorable with no backend running.
class MockData {
  MockData._();

  // ---------------------------------------------------------------- accounts

  static const patientUser = AppUser(
    id: 'p-1',
    name: 'Rahim Ahmed',
    role: UserRole.patient,
    identifier: 'EM-208831',
    subtitle: 'Male · 34 yrs · Blood group O+',
    email: 'rahim.ahmed@example.com',
  );

  static const doctorUser = AppUser(
    id: 'd-1',
    name: 'Dr. Nabila Karim',
    role: UserRole.doctor,
    identifier: 'BMDC-44210',
    subtitle: 'Cardiology',
    email: 'nabila.karim@example.com',
  );

  // ----------------------------------------------------------------- doctors

  static const doctors = <Doctor>[
    Doctor(
      id: '1',
      name: 'Dr. Nabila Karim',
      department: 'Cardiology',
      note: '12 yrs experience · Room 204',
    ),
    Doctor(
      id: '2',
      name: 'Dr. Farhan Iqbal',
      department: 'Orthopedics',
      note: '9 yrs experience · Room 118',
    ),
    Doctor(
      id: '3',
      name: 'Dr. Shabnam Reza',
      department: 'Gynecology',
      note: '15 yrs experience · Room 310',
    ),
    Doctor(
      id: '4',
      name: 'Dr. Imran Talukder',
      department: 'ENT',
      note: '7 yrs experience · Room 221',
    ),
  ];

  static const departments = <String>[
    'All',
    'Cardiology',
    'Orthopedics',
    'ENT',
    'Gynecology',
  ];

  static const slots = <TimeSlot>[
    TimeSlot(label: '9:00 AM'),
    TimeSlot(label: '9:30 AM'),
    TimeSlot(label: '10:30 AM'),
    TimeSlot(label: '11:00 AM'),
    TimeSlot(label: '2:00 PM'),
    TimeSlot(label: '4:30 PM'),
  ];

  static const upcomingAppointment = Appointment(
    id: 'apt-3391',
    code: '#APT-3391',
    doctorName: 'Dr. Nabila Karim',
    department: 'Cardiology',
    room: 'Room 204',
    date: 'Aug 18',
    time: '10:30 AM',
    floor: '2nd',
  );

  /// Every visit the patient has booked, newest first. Booking again appends
  /// here rather than replacing what came before.
  static const bookingHistory = <Appointment>[
    upcomingAppointment,
    Appointment(
      id: 'apt-3390',
      code: '#APT-3390',
      doctorName: 'Dr. Nabila Karim',
      department: 'Cardiology',
      room: 'Room 204',
      date: 'Jul 28',
      time: '11:00 AM',
      floor: '2nd',
      status: AppointmentStatus.completed,
    ),
    Appointment(
      id: 'apt-3384',
      code: '#APT-3384',
      doctorName: 'Dr. Farhan Iqbal',
      department: 'Orthopedics',
      room: 'Room 118',
      date: 'Jul 12',
      time: '9:30 AM',
      floor: '1st',
      status: AppointmentStatus.completed,
    ),
    Appointment(
      id: 'apt-3372',
      code: '#APT-3372',
      doctorName: 'Dr. Imran Talukder',
      department: 'ENT',
      room: 'Room 221',
      date: 'Jun 30',
      time: '4:30 PM',
      floor: '2nd',
      status: AppointmentStatus.cancelled,
    ),
    Appointment(
      id: 'apt-3361',
      code: '#APT-3361',
      doctorName: 'Dr. Nabila Karim',
      department: 'Cardiology',
      room: 'Room 204',
      date: 'Jun 02',
      time: '10:00 AM',
      floor: '2nd',
      status: AppointmentStatus.completed,
    ),
  ];

  // ----------------------------------------------------------------- records

  static const patientUhid = 'EM-208831';
  static const spouseUhid = 'EM-208832';
  static const sonUhid = 'EM-208833';

  /// Every report in the hospital, filed against the patient's UHID. The
  /// patient app filters this to the profile being viewed; the admin app groups
  /// it by patient. New reports (a doctor saving a prescription) append here.
  static const allReports = <MedicalReport>[
    MedicalReport(
      id: 'r-1',
      title: 'Chest X-Ray',
      source: 'PACS · Radiology',
      date: 'Aug 10',
      kind: ReportKind.radiology,
      patientUhid: patientUhid,
      patientName: 'Rahim Ahmed',
      body: [
        'Lung fields · Clear, no consolidation',
        'Cardiac silhouette · Normal size',
        'Costophrenic angles · Sharp',
        'Impression · No acute cardiopulmonary abnormality',
      ],
    ),
    MedicalReport(
      id: 'r-2',
      title: 'Lipid Profile',
      source: 'Lab Report',
      date: 'Aug 08',
      kind: ReportKind.lab,
      patientUhid: patientUhid,
      patientName: 'Rahim Ahmed',
      body: [
        'Total cholesterol · 214 mg/dL (high)',
        'LDL · 142 mg/dL (high)',
        'HDL · 41 mg/dL',
        'Triglycerides · 168 mg/dL',
      ],
    ),
    MedicalReport(
      id: 'r-3',
      title: 'Prescription — Dr. Karim',
      source: 'Digital Rx',
      date: 'Aug 08',
      kind: ReportKind.prescription,
      patientUhid: patientUhid,
      patientName: 'Rahim Ahmed',
      body: [
        'Atorvastatin 10mg · 1-0-1 · After meal',
        'Aspirin 75mg · 0-1-0 · After meal',
      ],
    ),
    MedicalReport(
      id: 'r-4',
      title: 'ECG Report',
      source: 'Cardiology',
      date: 'Jul 29',
      kind: ReportKind.cardiology,
      patientUhid: patientUhid,
      patientName: 'Rahim Ahmed',
      body: [
        'Rhythm · Sinus, 78 bpm',
        'Axis · Normal',
        'ST/T changes · None significant',
      ],
    ),
    MedicalReport(
      id: 'r-5',
      title: 'Antenatal Ultrasound',
      source: 'PACS · Radiology',
      date: 'Aug 05',
      kind: ReportKind.radiology,
      patientUhid: spouseUhid,
      patientName: 'Ayesha Ahmed',
      body: [
        'Gestational age · 22 weeks 3 days',
        'Foetal heart rate · 148 bpm',
        'Placenta · Anterior, grade I',
        'Impression · Single live intrauterine pregnancy',
      ],
    ),
    MedicalReport(
      id: 'r-6',
      title: 'Complete Blood Count',
      source: 'Lab Report',
      date: 'Jul 22',
      kind: ReportKind.lab,
      patientUhid: spouseUhid,
      patientName: 'Ayesha Ahmed',
      body: [
        'Haemoglobin · 11.2 g/dL (low)',
        'WBC · 8,400 /µL',
        'Platelets · 244,000 /µL',
      ],
    ),
    MedicalReport(
      id: 'r-7',
      title: 'Immunisation Record',
      source: 'Digital Rx',
      date: 'Jun 18',
      kind: ReportKind.prescription,
      patientUhid: sonUhid,
      patientName: 'Zayan Ahmed',
      body: [
        'MMR · 2nd dose administered',
        'Next due · Booster at 5 years',
      ],
    ),
  ];

  static const invoices = <Invoice>[
    Invoice(
      id: '4821',
      title: 'Radiology — Invoice #4821',
      amount: 2450,
      status: InvoiceStatus.due,
    ),
    Invoice(
      id: '4790',
      title: 'Pharmacy — Invoice #4790',
      amount: 2450,
      status: InvoiceStatus.due,
    ),
    Invoice(
      id: '4712',
      title: 'OPD Consultation — #4712',
      amount: 800,
      status: InvoiceStatus.paid,
    ),
  ];

  static const familyMembers = <FamilyMember>[
    FamilyMember(
      id: 'f-1',
      name: 'Ayesha Ahmed',
      relation: 'Spouse',
      uhid: spouseUhid,
    ),
    FamilyMember(
      id: 'f-2',
      name: 'Zayan Ahmed',
      relation: 'Son',
      uhid: sonUhid,
    ),
  ];

  static const patientNotifications = <AppNotification>[
    AppNotification(
      id: 'n-1',
      title: 'Report ready',
      body: 'Your CBC report has been uploaded',
      kind: NoticeKind.reportReady,
      patientUhid: patientUhid,
      time: '2 hours ago',
    ),
    AppNotification(
      id: 'n-2',
      title: 'Payment reminder',
      body: 'Invoice #4821 (৳2,450) is due',
      kind: NoticeKind.payment,
      patientUhid: patientUhid,
      time: 'Yesterday',
    ),
  ];

  // ---------------------------------------------------------- doctor's world

  static const _sharedHistory = <String>[
    'Jul 12 — Routine checkup, prescribed Atorvastatin',
    'Jun 02 — ECG normal',
  ];

  static const patients = <PatientRecord>[
    PatientRecord(
      id: '1',
      name: 'Rahim Ahmed',
      uhid: 'EM-208831',
      time: '10:30 AM',
      note: 'Follow-up · Cardiology',
      status: 'Checked in',
      vitals: 'BP 128/84 · Pulse 78 · Temp 98.4°F',
      history: _sharedHistory,
    ),
    PatientRecord(
      id: '2',
      name: 'Meherun Nesa',
      uhid: 'EM-209044',
      time: '11:00 AM',
      note: 'New patient · Chest pain',
      status: 'Waiting',
      vitals: 'BP 140/92 · Pulse 91 · Temp 99.1°F',
      history: _sharedHistory,
      vitalsFlagged: true,
    ),
    PatientRecord(
      id: '3',
      name: 'Kabir Hossain',
      uhid: 'EM-207220',
      time: '11:30 AM',
      note: 'Report review',
      status: 'Scheduled',
      vitals: 'BP 118/76 · Pulse 72 · Temp 98.2°F',
      history: _sharedHistory,
    ),
    PatientRecord(
      id: '4',
      name: 'Nusrat Jahan',
      uhid: 'EM-210981',
      time: '1:00 PM',
      note: 'Post-op checkup',
      status: 'Scheduled',
      vitals: 'BP 122/80 · Pulse 75 · Temp 98.6°F',
      history: _sharedHistory,
    ),
  ];

  static const otSchedule = <OtBooking>[
    OtBooking(
      id: '1',
      patient: 'Nusrat Jahan',
      procedure: 'Appendectomy',
      time: '1:30 PM',
      room: 'OT-2',
      status: OtStatus.scheduled,
    ),
    OtBooking(
      id: '2',
      patient: 'Anwar Kabir',
      procedure: 'Knee replacement',
      time: '4:00 PM',
      room: 'OT-1',
      status: OtStatus.scheduled,
    ),
  ];

  static const prescriptions = <Prescription>[
    Prescription(
      id: '1',
      patientName: 'Rahim Ahmed',
      date: 'Aug 08',
      medicines: [
        Medicine(name: 'Atorvastatin 10mg', dosage: '1-0-1 · After meal'),
        Medicine(name: 'Aspirin 75mg', dosage: '0-1-0 · After meal'),
      ],
    ),
    Prescription(
      id: '2',
      patientName: 'Kabir Hossain',
      date: 'Jul 29',
      medicines: [
        Medicine(name: 'Metformin 500mg', dosage: '1-0-1 · After meal'),
        Medicine(name: 'Losartan 50mg', dosage: '1-0-0 · Before meal'),
        Medicine(name: 'Vitamin D3', dosage: 'Weekly · After meal'),
      ],
    ),
    Prescription(
      id: '3',
      patientName: 'Meherun Nesa',
      date: 'Jul 21',
      medicines: [
        Medicine(name: 'Omeprazole 20mg', dosage: '1-0-0 · Before meal'),
      ],
    ),
  ];

  /// Pre-filled row on the "Write prescription" form.
  static const draftMedicine =
      Medicine(name: 'Atorvastatin 10mg', dosage: '1-0-1 · After meal');

  static const pendingRxCount = 3;

  static const workingHours = <WorkingDay>[
    WorkingDay(day: 'Saturday', enabled: true, hours: '9:00 AM – 5:00 PM'),
    WorkingDay(day: 'Sunday', enabled: true, hours: '9:00 AM – 5:00 PM'),
    WorkingDay(day: 'Monday', enabled: true, hours: '9:00 AM – 5:00 PM'),
    WorkingDay(day: 'Tuesday', enabled: true, hours: '9:00 AM – 5:00 PM'),
    WorkingDay(day: 'Wednesday', enabled: true, hours: '9:00 AM – 1:00 PM'),
    WorkingDay(day: 'Thursday', enabled: true, hours: '9:00 AM – 5:00 PM'),
    WorkingDay(day: 'Friday', enabled: false, hours: 'Off'),
  ];

  static final leaveRequests = <LeaveRequest>[
    // Multi-day, whole days off.
    LeaveRequest(
      id: '1',
      fromDate: DateTime(2026, 8, 22),
      toDate: DateTime(2026, 8, 24),
      reason: 'Conference',
      status: LeaveStatus.approved,
    ),
    // Single day, afternoon only — the hours case.
    LeaveRequest(
      id: '2',
      fromDate: DateTime(2026, 9, 5),
      toDate: DateTime(2026, 9, 5),
      fromTime: '2:00 PM',
      toTime: '5:00 PM',
      reason: 'Personal',
      status: LeaveStatus.pending,
    ),
  ];

  // ------------------------------------------------------------- preferences

  static const patientNotificationPrefs = <NotificationPref>[
    NotificationPref(
      label: 'Appointment reminders',
      description: 'Get notified before upcoming visits',
      enabled: true,
    ),
    NotificationPref(
      label: 'Report ready alerts',
      description: 'Know the moment a report is uploaded',
      enabled: true,
    ),
    NotificationPref(
      label: 'Payment reminders',
      description: 'Nudges for pending invoices',
      enabled: true,
    ),
    NotificationPref(
      label: 'Offers & updates',
      description: 'Hospital news and promotions',
      enabled: false,
    ),
  ];

  static const doctorNotificationPrefs = <NotificationPref>[
    NotificationPref(
      label: 'New appointment alerts',
      description: 'When a patient books your slot',
      enabled: true,
    ),
    NotificationPref(
      label: 'Vitals flagged alerts',
      description: 'Critical patient vitals',
      enabled: true,
    ),
    NotificationPref(
      label: 'OT schedule reminders',
      description: 'Upcoming operation theatre bookings',
      enabled: true,
    ),
    NotificationPref(
      label: 'Leave request updates',
      description: 'Approvals and rejections',
      enabled: true,
    ),
  ];

  static const languages = <String>['English', 'বাংলা'];

  static const faqs = <String>[
    'How do I reschedule an appointment?',
    'How do I download my lab report?',
    'How do I pay a pending invoice?',
  ];

  static const faqAnswer =
      'Go to the relevant tab, tap the item, and follow the on-screen steps. '
      'Need more help — use call or chat support above.';

  // ============================================================ ADMIN =======

  static const hospitalName = 'E-Medical General Hospital';

  static const adminUser = AppUser(
    id: 'a-1',
    name: 'Farhana Rahman',
    role: UserRole.admin,
    identifier: 'ADM-1002',
    subtitle: 'Administrator',
    email: 'farhana.rahman@example.com',
  );

  /// Revenue for the last seven days, ending today. Single series — one hue,
  /// no legend; the section title says what is plotted.
  static const revenueTrend = <ChartPoint>[
    ChartPoint(label: 'Sat', value: 386000),
    ChartPoint(label: 'Sun', value: 412000),
    ChartPoint(label: 'Mon', value: 458000),
    ChartPoint(label: 'Tue', value: 501000),
    ChartPoint(label: 'Wed', value: 472000),
    ChartPoint(label: 'Thu', value: 528000),
    ChartPoint(label: 'Today', value: 486000),
  ];

  /// Today's appointments by department — sums to [dashboardStats].
  static const departmentLoad = <ChartPoint>[
    ChartPoint(label: 'Cardiology', value: 32),
    ChartPoint(label: 'Orthopedics', value: 26),
    ChartPoint(label: 'Gynecology', value: 21),
    ChartPoint(label: 'ENT', value: 15),
    ChartPoint(label: 'Paediatrics', value: 12),
  ];

  static const dashboardStats = DashboardStats(
    appointmentsToday: 106,
    admissionsToday: 14,
    revenueToday: 486000,
    occupiedBeds: 67,
    totalBeds: 90,
    revenueDeltaPercent: -8.0,
    appointmentsDeltaPercent: 6.4,
  );

  static const wards = <WardSummary>[
    WardSummary(id: 'w-1', name: 'ICU', totalBeds: 12, occupiedBeds: 10),
    WardSummary(
      id: 'w-2',
      name: 'General Ward A',
      totalBeds: 24,
      occupiedBeds: 19,
    ),
    WardSummary(
      id: 'w-3',
      name: 'General Ward B',
      totalBeds: 24,
      occupiedBeds: 16,
    ),
    WardSummary(id: 'w-4', name: 'Maternity', totalBeds: 16, occupiedBeds: 13),
    WardSummary(
      id: 'w-5',
      name: 'Paediatrics',
      totalBeds: 14,
      occupiedBeds: 9,
    ),
  ];

  static const _occupants = <String>[
    'Rahim Ahmed', 'Meherun Nesa', 'Kabir Hossain', 'Nusrat Jahan',
    'Anwar Kabir', 'Salma Khatun', 'Jahangir Alam', 'Ruma Begum',
    'Tanvir Ahmed', 'Shefali Akter', 'Mizanur Rahman', 'Parvin Sultana',
    'Habibur Rahman', 'Nasrin Akhter', 'Sohel Rana', 'Ayesha Siddika',
  ];

  /// Built from [wards] rather than hand-listed, so the 90 beds can never drift
  /// out of step with the ward occupancy figures.
  static List<BedRecord> get beds {
    final result = <BedRecord>[];
    var occupantIndex = 0;

    for (final ward in wards) {
      for (var i = 1; i <= ward.totalBeds; i++) {
        final BedStatus status;
        String? occupant;

        if (i <= ward.occupiedBeds) {
          status = BedStatus.occupied;
          occupant = _occupants[occupantIndex % _occupants.length];
          occupantIndex++;
        } else if (i == ward.occupiedBeds + 1) {
          status = BedStatus.cleaning;
        } else if (i == ward.totalBeds && ward.name == 'General Ward B') {
          status = BedStatus.maintenance;
        } else {
          status = BedStatus.available;
        }

        result.add(
          BedRecord(
            id: '${ward.id}-$i',
            number: i.toString().padLeft(2, '0'),
            wardName: ward.name,
            status: status,
            patientName: occupant,
          ),
        );
      }
    }
    return result;
  }

  static const admissions = <Admission>[
    Admission(
      id: 'ipd-1',
      patientName: 'Nusrat Jahan',
      ward: 'Maternity',
      bed: '07',
      admittedOn: 'Aug 12',
      status: 'Admitted',
    ),
    Admission(
      id: 'ipd-2',
      patientName: 'Anwar Kabir',
      ward: 'General Ward A',
      bed: '14',
      admittedOn: 'Aug 11',
      status: 'Admitted',
    ),
    Admission(
      id: 'ipd-3',
      patientName: 'Meherun Nesa',
      ward: 'ICU',
      bed: '03',
      admittedOn: 'Aug 13',
      status: 'Admitted',
    ),
    Admission(
      id: 'ipd-4',
      patientName: 'Jahangir Alam',
      ward: 'General Ward B',
      bed: '09',
      admittedOn: 'Aug 09',
      status: 'Discharged',
    ),
  ];

  static const employees = <Employee>[
    Employee(
      id: 'e-1',
      name: 'Dr. Nabila Karim',
      role: 'Consultant',
      department: 'Cardiology',
      phone: '+880 1711 204 881',
    ),
    Employee(
      id: 'e-2',
      name: 'Dr. Farhan Iqbal',
      role: 'Consultant',
      department: 'Orthopedics',
      phone: '+880 1711 204 118',
      onDuty: false,
    ),
    Employee(
      id: 'e-3',
      name: 'Dr. Shabnam Reza',
      role: 'Consultant',
      department: 'Gynecology',
      phone: '+880 1711 204 310',
    ),
    Employee(
      id: 'e-4',
      name: 'Dr. Imran Talukder',
      role: 'Consultant',
      department: 'ENT',
      phone: '+880 1711 204 221',
    ),
    Employee(
      id: 'e-5',
      name: 'Sultana Begum',
      role: 'Head Nurse',
      department: 'ICU',
      phone: '+880 1911 663 402',
    ),
    Employee(
      id: 'e-6',
      name: 'Rased Khan',
      role: 'Staff Nurse',
      department: 'General Ward A',
      phone: '+880 1911 663 517',
    ),
    Employee(
      id: 'e-7',
      name: 'Nazma Akter',
      role: 'Pharmacist',
      department: 'Pharmacy',
      phone: '+880 1811 552 090',
    ),
    Employee(
      id: 'e-8',
      name: 'Tanvir Hasan',
      role: 'Lab Technologist',
      department: 'Laboratory',
      phone: '+880 1811 552 174',
      onDuty: false,
    ),
    Employee(
      id: 'e-9',
      name: 'Jamal Uddin',
      role: 'Radiographer',
      department: 'Radiology',
      phone: '+880 1811 552 236',
    ),
    Employee(
      id: 'e-10',
      name: 'Shirin Sultana',
      role: 'Accounts Officer',
      department: 'Billing',
      phone: '+880 1611 447 725',
    ),
    Employee(
      id: 'e-11',
      name: 'Abdul Karim',
      role: 'Ambulance Driver',
      department: 'Transport',
      phone: '+880 1611 447 831',
    ),
  ];

  static const attendance = <AttendanceRecord>[
    AttendanceRecord(
      id: 'at-1',
      name: 'Sultana Begum',
      role: 'Head Nurse',
      checkIn: '7:05 AM',
      status: AttendanceStatus.present,
    ),
    AttendanceRecord(
      id: 'at-2',
      name: 'Jamal Uddin',
      role: 'Radiographer',
      checkIn: '8:20 AM',
      status: AttendanceStatus.present,
    ),
    AttendanceRecord(
      id: 'at-3',
      name: 'Dr. Nabila Karim',
      role: 'Consultant',
      checkIn: '8:42 AM',
      status: AttendanceStatus.present,
    ),
    AttendanceRecord(
      id: 'at-4',
      name: 'Nazma Akter',
      role: 'Pharmacist',
      checkIn: '8:58 AM',
      status: AttendanceStatus.present,
    ),
    AttendanceRecord(
      id: 'at-5',
      name: 'Shirin Sultana',
      role: 'Accounts Officer',
      checkIn: '9:02 AM',
      status: AttendanceStatus.present,
    ),
    AttendanceRecord(
      id: 'at-6',
      name: 'Rased Khan',
      role: 'Staff Nurse',
      checkIn: '9:35 AM',
      status: AttendanceStatus.late,
    ),
    AttendanceRecord(
      id: 'at-7',
      name: 'Dr. Farhan Iqbal',
      role: 'Consultant',
      checkIn: '',
      status: AttendanceStatus.onLeave,
    ),
    AttendanceRecord(
      id: 'at-8',
      name: 'Tanvir Hasan',
      role: 'Lab Technologist',
      checkIn: '',
      status: AttendanceStatus.absent,
    ),
  ];

  static const medicineStock = <MedicineStock>[
    MedicineStock(
      id: 'm-1',
      name: 'Ceftriaxone 1g inj.',
      category: 'Antibiotic',
      stock: 9,
      reorderLevel: 15,
    ),
    MedicineStock(
      id: 'm-2',
      name: 'Omeprazole 20mg',
      category: 'Gastro',
      stock: 12,
      reorderLevel: 30,
    ),
    MedicineStock(
      id: 'm-3',
      name: 'Atorvastatin 10mg',
      category: 'Cardiac',
      stock: 18,
      reorderLevel: 25,
    ),
    MedicineStock(
      id: 'm-4',
      name: 'Insulin Glargine',
      category: 'Endocrine',
      stock: 26,
      reorderLevel: 20,
    ),
    MedicineStock(
      id: 'm-5',
      name: 'Salbutamol inhaler',
      category: 'Respiratory',
      stock: 54,
      reorderLevel: 25,
    ),
    MedicineStock(
      id: 'm-6',
      name: 'Amoxicillin 250mg',
      category: 'Antibiotic',
      stock: 82,
      reorderLevel: 60,
    ),
    MedicineStock(
      id: 'm-7',
      name: 'Metformin 500mg',
      category: 'Endocrine',
      stock: 410,
      reorderLevel: 80,
    ),
    MedicineStock(
      id: 'm-8',
      name: 'Paracetamol 500mg',
      category: 'Analgesic',
      stock: 640,
      reorderLevel: 100,
    ),
  ];

  static const bloodStock = <BloodStock>[
    BloodStock(group: 'O+', units: 24),
    BloodStock(group: 'B+', units: 21),
    BloodStock(group: 'A+', units: 18),
    BloodStock(group: 'AB+', units: 7),
    BloodStock(group: 'A-', units: 6),
    BloodStock(group: 'O-', units: 4),
    BloodStock(group: 'B-', units: 3),
    BloodStock(group: 'AB-', units: 2),
  ];

  static const auditLog = <AuditEntry>[
    AuditEntry(
      id: 'audit-1',
      action: 'Approved leave request',
      actor: 'Farhana Rahman',
      target: 'Dr. Nabila Karim · Aug 22 – Aug 24',
      at: '10:24 AM',
    ),
    AuditEntry(
      id: 'audit-2',
      action: 'Updated bed status',
      actor: 'Sultana Begum',
      target: 'ICU · Bed 04',
      at: '9:58 AM',
    ),
    AuditEntry(
      id: 'audit-3',
      action: 'Created invoice',
      actor: 'Shirin Sultana',
      target: 'Invoice #4821',
      at: '9:31 AM',
    ),
    AuditEntry(
      id: 'audit-4',
      action: 'Discharged patient',
      actor: 'Dr. Farhan Iqbal',
      target: 'Jahangir Alam',
      at: '9:12 AM',
    ),
    AuditEntry(
      id: 'audit-5',
      action: 'Adjusted stock',
      actor: 'Nazma Akter',
      target: 'Ceftriaxone 1g inj. · −6 units',
      at: '8:47 AM',
    ),
    AuditEntry(
      id: 'audit-6',
      action: 'Added employee',
      actor: 'Farhana Rahman',
      target: 'Abdul Karim · Transport',
      at: 'Yesterday',
    ),
  ];

  static const hospitalSettings = <HospitalSetting>[
    HospitalSetting(label: 'Hospital name', value: hospitalName),
    HospitalSetting(label: 'Address', value: '42 Shantinagar, Dhaka 1217'),
    HospitalSetting(label: 'Contact', value: '+880 2 8391 4460'),
    HospitalSetting(label: 'Emergency hotline', value: '10666'),
    HospitalSetting(label: 'Currency', value: 'BDT (৳)'),
    HospitalSetting(label: 'Time zone', value: 'Asia/Dhaka (UTC+6)'),
    HospitalSetting(label: 'Invoice prefix', value: 'EM-INV'),
    HospitalSetting(label: 'Financial year', value: 'July – June'),
  ];

  static const adminNotificationPrefs = <NotificationPref>[
    NotificationPref(
      label: 'Low stock alerts',
      description: 'Medicines below their reorder level',
      enabled: true,
    ),
    NotificationPref(
      label: 'Bed capacity warnings',
      description: 'When occupancy passes 85%',
      enabled: true,
    ),
    NotificationPref(
      label: 'Leave approvals',
      description: 'New staff leave requests',
      enabled: true,
    ),
    NotificationPref(
      label: 'Daily revenue summary',
      description: 'End-of-day finance digest',
      enabled: false,
    ),
  ];
}
