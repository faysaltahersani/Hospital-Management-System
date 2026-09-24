import 'package:flutter/foundation.dart';

import '../models/models.dart';
import 'mock_data.dart';

/// Mutable in-memory state shared by every mock repository.
///
/// It is a singleton on purpose: the repositories are rebuilt on each sign-in,
/// but the data must not be. That keeps two things working —
///
///  * changes survive logging out and back in, and
///  * one role sees another's work. Submit a leave request as the doctor, sign
///    out, sign in as the admin, and it is sitting in the approval queue.
class MockStore {
  MockStore._();

  static final MockStore instance = MockStore._();

  // Patient
  final List<Invoice> invoices = List.of(MockData.invoices);
  final List<FamilyMember> family = List.of(MockData.familyMembers);
  List<NotificationPref> patientPrefs =
      List.of(MockData.patientNotificationPrefs);
  int appointmentSequence = 3391;

  /// Every booking the patient has made, newest first. Booking appends here.
  final List<Appointment> appointments = List.of(MockData.bookingHistory);

  /// Every report in the hospital, filed against a patient's UHID. Both the
  /// patient's Reports tab and the admin's print screen read this one list.
  final List<MedicalReport> reports = List.of(MockData.allReports);

  Appointment? get upcomingAppointment {
    for (final appointment in appointments) {
      if (appointment.status == AppointmentStatus.upcoming) return appointment;
    }
    return null;
  }

  /// Every notice raised for a patient, newest first.
  final List<AppNotification> notifications =
      List.of(MockData.patientNotifications);

  /// Files a new record against [uhid] — used when a doctor saves a
  /// prescription, so it lands in that patient's records straight away.
  void addReport(MedicalReport report) => reports.insert(0, report);

  List<MedicalReport> reportsFor(String uhid) =>
      reports.where((r) => r.patientUhid == uhid).toList();

  /// Doctor alerts are computed from the patient queue, so there is nothing to
  /// delete when one is cleared — the id is recorded here and filtered out
  /// instead, otherwise it would reappear on the next read.
  final Set<String> dismissedAlerts = <String>{};

  void addNotification(AppNotification notice) =>
      notifications.insert(0, notice);

  List<AppNotification> notificationsFor(String uhid) =>
      notifications.where((n) => n.patientUhid == uhid).toList();

  void removeNotification(String id) =>
      notifications.removeWhere((n) => n.id == id);

  void clearNotifications(String uhid) =>
      notifications.removeWhere((n) => n.patientUhid == uhid);

  /// Clears the unread badge for one patient, once they have opened the sheet.
  void markNotificationsRead(String uhid) {
    for (var i = 0; i < notifications.length; i++) {
      if (notifications[i].patientUhid == uhid && !notifications[i].read) {
        notifications[i] = notifications[i].copyWith(read: true);
      }
    }
  }

  // Doctor
  final List<OtBooking> otSchedule = List.of(MockData.otSchedule);
  final List<Prescription> prescriptions = List.of(MockData.prescriptions);
  List<WorkingDay> workingHours = List.of(MockData.workingHours);
  List<NotificationPref> doctorPrefs =
      List.of(MockData.doctorNotificationPrefs);
  int prescriptionSequence = 3;

  /// Written by the doctor app, read and resolved by the admin app.
  final List<LeaveRequest> leaveRequests = List.of(MockData.leaveRequests);

  // Admin
  final List<WardSummary> wards = List.of(MockData.wards);
  final List<BedRecord> beds = List.of(MockData.beds);
  final List<Admission> admissions = List.of(MockData.admissions);
  final List<Employee> employees = List.of(MockData.employees);
  final List<AttendanceRecord> attendance = List.of(MockData.attendance);
  final List<MedicineStock> medicineStock = List.of(MockData.medicineStock);
  final List<BloodStock> bloodStock = List.of(MockData.bloodStock);
  final List<AuditEntry> auditLog = List.of(MockData.auditLog);
  List<NotificationPref> adminPrefs = List.of(MockData.adminNotificationPrefs);

  /// Restores every collection to its seeded state.
  ///
  /// The app never calls this — it exists so each test starts from the same
  /// data instead of inheriting whatever the previous test changed.
  @visibleForTesting
  void reset() {
    invoices
      ..clear()
      ..addAll(MockData.invoices);
    family
      ..clear()
      ..addAll(MockData.familyMembers);
    patientPrefs = List.of(MockData.patientNotificationPrefs);
    appointmentSequence = 3391;
    appointments
      ..clear()
      ..addAll(MockData.bookingHistory);
    reports
      ..clear()
      ..addAll(MockData.allReports);
    notifications
      ..clear()
      ..addAll(MockData.patientNotifications);
    dismissedAlerts.clear();

    otSchedule
      ..clear()
      ..addAll(MockData.otSchedule);
    prescriptions
      ..clear()
      ..addAll(MockData.prescriptions);
    workingHours = List.of(MockData.workingHours);
    doctorPrefs = List.of(MockData.doctorNotificationPrefs);
    prescriptionSequence = 3;
    leaveRequests
      ..clear()
      ..addAll(MockData.leaveRequests);

    wards
      ..clear()
      ..addAll(MockData.wards);
    beds
      ..clear()
      ..addAll(MockData.beds);
    admissions
      ..clear()
      ..addAll(MockData.admissions);
    employees
      ..clear()
      ..addAll(MockData.employees);
    attendance
      ..clear()
      ..addAll(MockData.attendance);
    medicineStock
      ..clear()
      ..addAll(MockData.medicineStock);
    bloodStock
      ..clear()
      ..addAll(MockData.bloodStock);
    auditLog
      ..clear()
      ..addAll(MockData.auditLog);
    adminPrefs = List.of(MockData.adminNotificationPrefs);
  }

  /// Records an admin action so it shows up on the audit-log screen.
  void audit({
    required String action,
    required String target,
    String actor = 'Farhana Rahman',
  }) {
    auditLog.insert(
      0,
      AuditEntry(
        id: 'audit-${auditLog.length + 1}',
        action: action,
        actor: actor,
        target: target,
        at: 'Just now',
      ),
    );
  }

  /// Beds recomputed from [beds], so the ward cards and the bed grid can never
  /// disagree after a discharge.
  List<WardSummary> get wardSummaries {
    return wards.map((ward) {
      final wardBeds = beds.where((b) => b.wardName == ward.name).toList();
      if (wardBeds.isEmpty) return ward;
      final occupied =
          wardBeds.where((b) => b.status == BedStatus.occupied).length;
      return WardSummary(
        id: ward.id,
        name: ward.name,
        totalBeds: wardBeds.length,
        occupiedBeds: occupied,
      );
    }).toList();
  }

  int get totalBeds => beds.length;

  int get occupiedBeds =>
      beds.where((b) => b.status == BedStatus.occupied).length;
}
