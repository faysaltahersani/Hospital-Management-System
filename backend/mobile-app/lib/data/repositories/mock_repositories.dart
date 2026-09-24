import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/models.dart';
import 'repositories.dart';

/// Simulated latency so loading states behave the same as they will against
/// the live API.
Future<T> _delayed<T>(T value) =>
    Future.delayed(const Duration(milliseconds: 180), () => value);

MockStore get _store => MockStore.instance;

/// Accepts any credentials and hands back the matching demo profile.
class MockAuthRepository implements AuthRepository {
  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required UserRole role,
  }) {
    final user = switch (role) {
      UserRole.doctor => MockData.doctorUser,
      UserRole.admin => MockData.adminUser,
      UserRole.patient => MockData.patientUser,
    };
    return _delayed(AuthSession(user: user));
  }

  @override
  Future<void> signOut() => _delayed(null);

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) =>
      _delayed(null);
}

class MockPatientRepository implements PatientRepository {
  MockPatientRepository({AppUser? user})
      : user = user ?? MockData.patientUser;

  /// The signed-in patient — their UHID is what records are filed under.
  final AppUser user;

  @override
  Future<Appointment?> upcomingAppointment() =>
      _delayed(_store.upcomingAppointment);

  @override
  Future<List<Appointment>> bookingHistory() =>
      _delayed(List.of(_store.appointments));

  @override
  Future<List<CareProfile>> careProfiles() => _delayed([
        CareProfile.self(user),
        for (final member in _store.family)
          if (member.uhid.isNotEmpty) CareProfile.from(member),
      ]);

  @override
  Future<List<String>> departments() => _delayed(MockData.departments);

  @override
  Future<List<Doctor>> doctors({
    String query = '',
    String department = 'All',
  }) {
    final needle = query.trim().toLowerCase();
    final results = MockData.doctors.where((d) {
      final matchesDept = department == 'All' || d.department == department;
      final matchesQuery = needle.isEmpty ||
          d.name.toLowerCase().contains(needle) ||
          d.department.toLowerCase().contains(needle);
      return matchesDept && matchesQuery;
    }).toList();

    return _delayed(results);
  }

  @override
  Future<List<TimeSlot>> slots(String doctorId) => _delayed(MockData.slots);

  @override
  Future<Appointment> book({required Doctor doctor, required String slot}) {
    _store.appointmentSequence++;
    final booked = Appointment(
      id: 'apt-${_store.appointmentSequence}',
      code: '#APT-${_store.appointmentSequence}',
      doctorName: doctor.name,
      department: doctor.department,
      room: doctor.note.split('·').last.trim(),
      date: 'Today',
      time: slot,
      floor: '2nd',
    );
    // Prepend rather than replace, so the history keeps every visit.
    _store.appointments.insert(0, booked);
    return _delayed(booked);
  }

  @override
  Future<List<MedicalReport>> reports({String? uhid}) =>
      _delayed(_store.reportsFor(uhid ?? user.identifier));

  @override
  Future<List<Invoice>> invoices() => _delayed(List.of(_store.invoices));

  @override
  Future<List<Invoice>> payInvoice(String id) {
    final invoices = _store.invoices;
    for (var i = 0; i < invoices.length; i++) {
      if (invoices[i].id == id) {
        invoices[i] = invoices[i].copyWith(status: InvoiceStatus.paid);
      }
    }
    return _delayed(List.of(invoices));
  }

  @override
  Future<List<Invoice>> payAll() {
    final invoices = _store.invoices;
    for (var i = 0; i < invoices.length; i++) {
      invoices[i] = invoices[i].copyWith(status: InvoiceStatus.paid);
    }
    return _delayed(List.of(invoices));
  }

  @override
  Future<List<FamilyMember>> family() => _delayed(List.of(_store.family));

  @override
  Future<List<FamilyMember>> addFamilyMember({
    required String name,
    required String relation,
  }) {
    _store.family.add(
      FamilyMember(
        id: 'f-${_store.family.length + 1}-${name.hashCode}',
        name: name,
        relation: relation.isEmpty ? 'Family member' : relation,
      ),
    );
    return _delayed(List.of(_store.family));
  }

  @override
  Future<List<FamilyMember>> removeFamilyMember(String id) {
    _store.family.removeWhere((m) => m.id == id);
    return _delayed(List.of(_store.family));
  }

  @override
  Future<List<AppNotification>> notifications() =>
      _delayed(_store.notificationsFor(user.identifier));

  @override
  Future<void> markNotificationsRead() {
    _store.markNotificationsRead(user.identifier);
    return _delayed(null);
  }

  @override
  Future<void> dismissNotification(String id) {
    _store.removeNotification(id);
    return _delayed(null);
  }

  @override
  Future<void> clearNotifications() {
    _store.clearNotifications(user.identifier);
    return _delayed(null);
  }

  @override
  Future<List<NotificationPref>> notificationPrefs() =>
      _delayed(List.of(_store.patientPrefs));

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) {
    _store.patientPrefs = List.of(prefs);
    return _delayed(null);
  }
}

class MockDoctorRepository implements DoctorRepository {
  @override
  Future<DoctorStats> stats() => _delayed(
        DoctorStats(
          patientsToday: MockData.patients.length,
          otSlots: _store.otSchedule.length,
          pendingRx: MockData.pendingRxCount,
        ),
      );

  @override
  Future<List<PatientRecord>> queue() =>
      _delayed(MockData.patients.take(3).toList());

  @override
  Future<List<PatientRecord>> patients({String query = ''}) {
    final needle = query.trim().toLowerCase();
    final results = MockData.patients
        .where((p) =>
            needle.isEmpty ||
            p.name.toLowerCase().contains(needle) ||
            p.uhid.toLowerCase().contains(needle))
        .toList();
    return _delayed(results);
  }

  /// Derived from the queue rather than hand-listed, so an alert always names a
  /// patient that exists — and carries their UHID, which is what lets tapping
  /// it open their record.
  @override
  Future<List<AppNotification>> alerts() => _delayed([
        for (final patient in MockData.patients)
          if (patient.vitalsFlagged &&
              !_store.dismissedAlerts.contains('alert-${patient.uhid}'))
            AppNotification(
              id: 'alert-${patient.uhid}',
              title: 'Vitals flagged',
              body: '${patient.name} — ${patient.vitals}',
              kind: NoticeKind.vitalsFlagged,
              patientUhid: patient.uhid,
              time: patient.time,
            ),
      ]);

  @override
  Future<void> dismissAlert(String id) {
    _store.dismissedAlerts.add(id);
    return _delayed(null);
  }

  @override
  Future<void> clearAlerts() async {
    for (final alert in await alerts()) {
      _store.dismissedAlerts.add(alert.id);
    }
  }

  @override
  Future<List<Prescription>> prescriptions() =>
      _delayed(List.of(_store.prescriptions));

  @override
  Future<Prescription> savePrescription({
    required PatientRecord patient,
    required List<Medicine> medicines,
  }) {
    _store.prescriptionSequence++;
    final saved = Prescription(
      id: '${_store.prescriptionSequence}',
      patientName: patient.name,
      date: 'Today',
      medicines: List.of(medicines),
    );
    _store.prescriptions.insert(0, saved);

    // File it into the patient's records too, so it shows up on their Reports
    // tab the moment the doctor sends it.
    final reportId = 'rx-${_store.prescriptionSequence}';
    _store.addReport(
      MedicalReport(
        id: reportId,
        title: 'Prescription — ${MockData.doctorUser.name}',
        source: 'Digital Rx',
        date: 'Today',
        kind: ReportKind.prescription,
        patientUhid: patient.uhid,
        patientName: patient.name,
        body: medicines.map((m) => '${m.name} · ${m.dosage}').toList(),
      ),
    );

    // …and tell them about it, so it is not something they have to go looking
    // for. This is what lights up the bell on their home screen.
    final count = medicines.length;
    _store.addNotification(
      AppNotification(
        id: 'n-$reportId',
        title: 'New prescription',
        body: '${MockData.doctorUser.name} prescribed $count '
            'medicine${count == 1 ? '' : 's'} — tap Reports to view',
        kind: NoticeKind.prescription,
        patientUhid: patient.uhid,
        time: 'Just now',
        // Tapping the notice opens this exact record, not just the tab.
        reportId: reportId,
      ),
    );

    return _delayed(saved);
  }

  @override
  Future<List<OtBooking>> otSchedule() => _delayed(List.of(_store.otSchedule));

  @override
  Future<List<OtBooking>> completeOtBooking(String id) {
    final bookings = _store.otSchedule;
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i].id == id) {
        bookings[i] = bookings[i].copyWith(status: OtStatus.completed);
      }
    }
    return _delayed(List.of(bookings));
  }

  @override
  Future<List<WorkingDay>> workingHours() =>
      _delayed(List.of(_store.workingHours));

  @override
  Future<void> saveWorkingHours(List<WorkingDay> days) {
    _store.workingHours = List.of(days);
    return _delayed(null);
  }

  @override
  Future<List<LeaveRequest>> leaveRequests() =>
      _delayed(List.of(_store.leaveRequests));

  @override
  Future<List<LeaveRequest>> submitLeave({
    required DateTime fromDate,
    required DateTime toDate,
    required String reason,
    String fromTime = '',
    String toTime = '',
  }) {
    _store.leaveRequests.insert(
      0,
      LeaveRequest(
        id: 'lv-${_store.leaveRequests.length + 1}-'
            '${fromDate.millisecondsSinceEpoch}',
        fromDate: fromDate,
        toDate: toDate,
        fromTime: fromTime,
        toTime: toTime,
        reason: reason.trim().isEmpty ? 'Not specified' : reason,
        status: LeaveStatus.pending,
      ),
    );
    return _delayed(List.of(_store.leaveRequests));
  }

  @override
  Future<List<NotificationPref>> notificationPrefs() =>
      _delayed(List.of(_store.doctorPrefs));

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) {
    _store.doctorPrefs = List.of(prefs);
    return _delayed(null);
  }
}

class MockAdminRepository implements AdminRepository {
  @override
  Future<DashboardStats> dashboard() {
    const seed = MockData.dashboardStats;
    // Bed figures come from the live bed list so the dashboard and the beds
    // tab always agree, even after a discharge.
    return _delayed(
      DashboardStats(
        appointmentsToday: seed.appointmentsToday,
        admissionsToday: seed.admissionsToday,
        revenueToday: seed.revenueToday,
        occupiedBeds: _store.occupiedBeds,
        totalBeds: _store.totalBeds,
        revenueDeltaPercent: seed.revenueDeltaPercent,
        appointmentsDeltaPercent: seed.appointmentsDeltaPercent,
      ),
    );
  }

  @override
  Future<List<ChartPoint>> revenueTrend() => _delayed(MockData.revenueTrend);

  @override
  Future<List<ChartPoint>> departmentLoad() =>
      _delayed(MockData.departmentLoad);

  @override
  Future<List<WardSummary>> wards() => _delayed(_store.wardSummaries);

  @override
  Future<List<BedRecord>> beds({String? wardName}) {
    final beds = wardName == null
        ? List.of(_store.beds)
        : _store.beds.where((b) => b.wardName == wardName).toList();
    return _delayed(beds);
  }

  @override
  Future<List<Admission>> admissions() => _delayed(List.of(_store.admissions));

  @override
  Future<List<Employee>> employees({String query = ''}) {
    final needle = query.trim().toLowerCase();
    final results = _store.employees
        .where((e) =>
            needle.isEmpty ||
            e.name.toLowerCase().contains(needle) ||
            e.role.toLowerCase().contains(needle) ||
            e.department.toLowerCase().contains(needle))
        .toList();
    return _delayed(results);
  }

  @override
  Future<List<AttendanceRecord>> attendance() =>
      _delayed(List.of(_store.attendance));

  @override
  Future<List<LeaveRequest>> pendingLeave() =>
      _delayed(List.of(_store.leaveRequests));

  @override
  Future<List<LeaveRequest>> resolveLeave(
    String id, {
    required bool approve,
  }) {
    final requests = _store.leaveRequests;
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id != id) continue;

      final request = requests[i];
      requests[i] = request.copyWith(
        status: approve ? LeaveStatus.approved : LeaveStatus.rejected,
      );
      _store.audit(
        action: approve ? 'Approved leave request' : 'Rejected leave request',
        target: '${request.summary} · ${request.reason}',
      );
    }
    return _delayed(List.of(requests));
  }

  @override
  Future<List<MedicineStock>> medicineStock() =>
      _delayed(List.of(_store.medicineStock));

  @override
  Future<List<BloodStock>> bloodStock() => _delayed(List.of(_store.bloodStock));

  @override
  Future<List<AuditEntry>> auditLog() => _delayed(List.of(_store.auditLog));

  @override
  Future<List<HospitalSetting>> hospitalSettings() =>
      _delayed(MockData.hospitalSettings);

  @override
  Future<List<ReportSummary>> reportSummaries() {
    final byPatient = <String, List<MedicalReport>>{};
    for (final report in _store.reports) {
      byPatient.putIfAbsent(report.patientUhid, () => []).add(report);
    }

    final summaries = byPatient.entries
        .map(
          (entry) => ReportSummary(
            uhid: entry.key,
            patientName: entry.value.first.patientName,
            reportCount: entry.value.length,
            latestDate: entry.value.first.date,
          ),
        )
        .toList()
      ..sort((a, b) => b.reportCount.compareTo(a.reportCount));

    return _delayed(summaries);
  }

  @override
  Future<List<MedicalReport>> reportsFor(String uhid) =>
      _delayed(_store.reportsFor(uhid));

  @override
  Future<List<AppNotification>> alerts() {
    final notices = <AppNotification>[];

    final lowMedicines = _store.medicineStock.where((m) => m.isLow).length;
    if (lowMedicines > 0) {
      notices.add(
        AppNotification(
          id: 'admin-low-stock',
          title: 'Low stock',
          body: '$lowMedicines medicines are below their reorder level',
          kind: NoticeKind.vitalsFlagged,
        ),
      );
    }

    final lowBlood = _store.bloodStock.where((b) => b.isLow).toList();
    if (lowBlood.isNotEmpty) {
      notices.add(
        AppNotification(
          id: 'admin-blood-low',
          title: 'Blood bank low',
          body: '${lowBlood.map((b) => b.group).join(', ')} below minimum',
          kind: NoticeKind.vitalsFlagged,
        ),
      );
    }

    final pending = _store.leaveRequests
        .where((r) => r.status == LeaveStatus.pending)
        .length;
    if (pending > 0) {
      notices.add(
        AppNotification(
          id: 'admin-leave-pending',
          title: 'Leave approvals',
          body: '$pending request(s) waiting on you',
          kind: NoticeKind.appointment,
        ),
      );
    }

    return _delayed(notices);
  }

  @override
  Future<List<NotificationPref>> notificationPrefs() =>
      _delayed(List.of(_store.adminPrefs));

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) {
    _store.adminPrefs = List.of(prefs);
    return _delayed(null);
  }
}
