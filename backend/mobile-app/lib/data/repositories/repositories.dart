import '../models/models.dart';

/// Headline counters on the doctor's schedule tab.
class DoctorStats {
  const DoctorStats({
    required this.patientsToday,
    required this.otSlots,
    required this.pendingRx,
  });

  final int patientsToday;
  final int otSlots;
  final int pendingRx;
}

abstract class AuthRepository {
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required UserRole role,
  });

  Future<void> signOut();

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}

abstract class PatientRepository {
  Future<Appointment?> upcomingAppointment();

  Future<List<String>> departments();

  /// [department] of `'All'` means no filter.
  Future<List<Doctor>> doctors({String query, String department});

  Future<List<TimeSlot>> slots(String doctorId);

  Future<Appointment> book({required Doctor doctor, required String slot});

  /// Every visit the patient has booked, newest first — upcoming and past.
  Future<List<Appointment>> bookingHistory();

  /// Whose records the patient can view: themselves plus any family members.
  Future<List<CareProfile>> careProfiles();

  /// Records for [uhid]; the signed-in patient's own when omitted.
  Future<List<MedicalReport>> reports({String? uhid});

  Future<List<Invoice>> invoices();

  /// Returns the full, updated invoice list so the UI can rebuild in one pass.
  Future<List<Invoice>> payInvoice(String id);

  Future<List<Invoice>> payAll();

  Future<List<FamilyMember>> family();

  Future<List<FamilyMember>> addFamilyMember({
    required String name,
    required String relation,
  });

  Future<List<FamilyMember>> removeFamilyMember(String id);

  Future<List<AppNotification>> notifications();

  /// Clears the unread badge once the patient has opened the sheet.
  Future<void> markNotificationsRead();

  /// Removes a single notice for good.
  Future<void> dismissNotification(String id);

  /// Removes every notice for the signed-in patient.
  Future<void> clearNotifications();

  Future<List<NotificationPref>> notificationPrefs();

  Future<void> saveNotificationPrefs(List<NotificationPref> prefs);
}

/// One patient's file as the admin sees it in the report index.
class ReportSummary {
  const ReportSummary({
    required this.uhid,
    required this.patientName,
    required this.reportCount,
    required this.latestDate,
  });

  final String uhid;
  final String patientName;
  final int reportCount;
  final String latestDate;
}

abstract class AdminRepository {
  Future<DashboardStats> dashboard();

  /// Revenue for the last seven days — single series.
  Future<List<ChartPoint>> revenueTrend();

  /// Today's appointments per department, highest first.
  Future<List<ChartPoint>> departmentLoad();

  Future<List<WardSummary>> wards();

  Future<List<BedRecord>> beds({String? wardName});

  Future<List<Admission>> admissions();

  Future<List<Employee>> employees({String query});

  Future<List<AttendanceRecord>> attendance();

  /// Leave requests awaiting a decision — the ones doctors submitted.
  Future<List<LeaveRequest>> pendingLeave();

  /// Approves or rejects [id], returning the refreshed queue.
  Future<List<LeaveRequest>> resolveLeave(String id, {required bool approve});

  Future<List<MedicineStock>> medicineStock();

  Future<List<BloodStock>> bloodStock();

  Future<List<AuditEntry>> auditLog();

  Future<List<HospitalSetting>> hospitalSettings();

  /// Patients who have records on file, with a count each — the index of the
  /// admin's report-printing screen.
  Future<List<ReportSummary>> reportSummaries();

  /// Every record filed against [uhid].
  Future<List<MedicalReport>> reportsFor(String uhid);

  Future<List<AppNotification>> alerts();

  Future<List<NotificationPref>> notificationPrefs();

  Future<void> saveNotificationPrefs(List<NotificationPref> prefs);
}

abstract class DoctorRepository {
  Future<DoctorStats> stats();

  /// The first few entries of today's queue.
  Future<List<PatientRecord>> queue();

  Future<List<PatientRecord>> patients({String query});

  Future<List<AppNotification>> alerts();

  /// Dismisses one alert. Alerts are derived from the queue, so this records
  /// the dismissal rather than deleting anything.
  Future<void> dismissAlert(String id);

  /// Dismisses every alert currently showing.
  Future<void> clearAlerts();

  Future<List<Prescription>> prescriptions();

  Future<Prescription> savePrescription({
    required PatientRecord patient,
    required List<Medicine> medicines,
  });

  Future<List<OtBooking>> otSchedule();

  Future<List<OtBooking>> completeOtBooking(String id);

  Future<List<WorkingDay>> workingHours();

  Future<void> saveWorkingHours(List<WorkingDay> days);

  Future<List<LeaveRequest>> leaveRequests();

  /// [fromTime]/[toTime] are display strings like `2:00 PM`; leaving both empty
  /// means the whole day (or days) is being taken off.
  Future<List<LeaveRequest>> submitLeave({
    required DateTime fromDate,
    required DateTime toDate,
    required String reason,
    String fromTime,
    String toTime,
  });

  Future<List<NotificationPref>> notificationPrefs();

  Future<void> saveNotificationPrefs(List<NotificationPref> prefs);
}
