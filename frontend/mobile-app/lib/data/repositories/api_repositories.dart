import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../mock/mock_data.dart';
import '../mock/mock_store.dart';
import '../models/models.dart';
import 'repositories.dart';

MockStore get _store => MockStore.instance;

/// Live implementations backed by the Hospital Management System REST API.
///
/// A few screens in the prototype (family members, working hours, leave
/// requests, notification preferences) have no dedicated backend module yet.
/// Those methods are marked `// TODO(backend)` and fall back to the seeded
/// values so the screens stay usable; everything else is wired to real
/// endpoints.
class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(this._client);

  final ApiClient _client;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required UserRole role,
  }) async {
    final result = await _client.post(
      Api.login,
      body: {'email': email, 'password': password},
    );

    final session = AuthSession.fromJson(result.asMap);
    _client.setTokens(
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    );
    return session;
  }

  @override
  Future<void> signOut() async {
    try {
      await _client.post(Api.logout);
    } finally {
      _client.clearTokens();
    }
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.post(
      Api.changePassword,
      body: {
        'current_password': currentPassword,
        'new_password': newPassword,
      },
    );
  }
}

class ApiPatientRepository implements PatientRepository {
  ApiPatientRepository(this._client, {required this.user});

  final ApiClient _client;

  /// The signed-in patient. Scopes list queries and supplies the UHID that
  /// records are filed under.
  final AppUser user;

  String get patientId => user.id;

  Map<String, dynamic> get _scope =>
      patientId.isEmpty ? const {} : {'patient_id': patientId};

  @override
  Future<Appointment?> upcomingAppointment() async {
    final result = await _client.get(
      Api.appointments,
      query: {..._scope, 'status': 'scheduled', 'limit': '1'},
    );
    final items = result.asList;
    return items.isEmpty ? null : Appointment.fromJson(items.first);
  }

  @override
  Future<List<String>> departments() async {
    final result = await _client.get(Api.departments, query: {'limit': '100'});
    final names = result.asList
        .map((e) => Json.str(e, ['name', 'department_name']))
        .where((name) => name.isNotEmpty)
        .toList();
    return ['All', ...names];
  }

  @override
  Future<List<Doctor>> doctors({
    String query = '',
    String department = 'All',
  }) async {
    final result = await _client.get(
      Api.doctors,
      query: {
        'limit': '50',
        if (query.trim().isNotEmpty) 'search': query.trim(),
        if (department != 'All') 'department': department,
      },
    );
    return result.asList.map(Doctor.fromJson).toList();
  }

  @override
  Future<List<TimeSlot>> slots(String doctorId) async {
    final result = await _client.get(Api.doctorSlots(doctorId));
    final slots = result.asList.map(TimeSlot.fromJson).toList();
    // Some deployments return a bare array of strings.
    if (slots.isEmpty && result.data is List) {
      return (result.data as List)
          .map((e) => TimeSlot(label: e.toString()))
          .toList();
    }
    return slots;
  }

  @override
  Future<Appointment> book({
    required Doctor doctor,
    required String slot,
  }) async {
    final result = await _client.post(
      Api.appointments,
      body: {
        'doctor_id': doctor.id,
        if (patientId.isNotEmpty) 'patient_id': patientId,
        'appointment_time': slot,
        'status': 'scheduled',
      },
    );
    return Appointment.fromJson(result.asMap);
  }

  @override
  Future<List<Appointment>> bookingHistory() async {
    final result = await _client.get(
      Api.appointments,
      query: {..._scope, 'limit': '50', 'sort': '-appointment_date'},
    );
    return result.asList.map(Appointment.fromJson).toList();
  }

  @override
  Future<List<CareProfile>> careProfiles() async => [
        CareProfile.self(user),
        for (final member in _store.family)
          if (member.uhid.isNotEmpty) CareProfile.from(member),
      ];

  @override
  Future<List<MedicalReport>> reports({String? uhid}) async {
    // Records belong to whichever profile is being viewed. The account
    // holder's queries scope by patient_id; a family member's by their UHID.
    final scope = uhid == null || uhid == user.identifier
        ? _scope
        : {'uhid': uhid};

    // Lab and radiology orders are separate modules; merge both feeds.
    final responses = await Future.wait([
      _client.get(Api.labOrders, query: {...scope, 'limit': '25'}),
      _client.get(Api.radiologyOrders, query: {...scope, 'limit': '25'}),
      _client.get(Api.prescriptions, query: {...scope, 'limit': '25'}),
    ]);

    return [
      ...responses[0].asList.map(
            (e) => MedicalReport.fromJson({...e, 'category': 'lab'}),
          ),
      ...responses[1].asList.map(
            (e) => MedicalReport.fromJson({...e, 'category': 'radiology'}),
          ),
      ...responses[2].asList.map(
            (e) => MedicalReport.fromJson({
              ...e,
              'category': 'prescription',
              'title': 'Prescription — ${Json.str(e, [
                    'doctor_name',
                    'doctorName'
                  ], fallback: 'Doctor')}',
            }),
          ),
    ];
  }

  @override
  Future<List<Invoice>> invoices() async {
    final result = await _client.get(
      Api.invoices,
      query: {..._scope, 'limit': '50'},
    );
    return result.asList.map(Invoice.fromJson).toList();
  }

  @override
  Future<List<Invoice>> payInvoice(String id) async {
    final target = (await invoices()).where((i) => i.id == id).firstOrNull;
    await _client.post(
      Api.payments,
      body: {
        'invoice_id': id,
        'amount': target?.amount ?? 0,
        'method': 'mobile',
      },
    );
    return invoices();
  }

  @override
  Future<List<Invoice>> payAll() async {
    final due =
        (await invoices()).where((i) => i.status == InvoiceStatus.due);
    for (final invoice in due) {
      await _client.post(
        Api.payments,
        body: {
          'invoice_id': invoice.id,
          'amount': invoice.amount,
          'method': 'mobile',
        },
      );
    }
    return invoices();
  }

  // TODO(backend): no family-members module yet — held in the shared store.
  @override
  Future<List<FamilyMember>> family() async => List.of(_store.family);

  @override
  Future<List<FamilyMember>> addFamilyMember({
    required String name,
    required String relation,
  }) async {
    _store.family.add(
      FamilyMember(
        id: 'f-${_store.family.length + 1}',
        name: name,
        relation: relation.isEmpty ? 'Family member' : relation,
      ),
    );
    return List.of(_store.family);
  }

  @override
  Future<List<FamilyMember>> removeFamilyMember(String id) async {
    _store.family.removeWhere((m) => m.id == id);
    return List.of(_store.family);
  }

  // TODO(backend): no notifications module, so these are derived from live
  // state; read and dismissed flags are held on the device for the session.
  bool _notificationsRead = false;
  final Set<String> _dismissed = <String>{};

  @override
  Future<void> markNotificationsRead() async => _notificationsRead = true;

  @override
  Future<void> dismissNotification(String id) async => _dismissed.add(id);

  @override
  Future<void> clearNotifications() async {
    for (final notice in await notifications()) {
      _dismissed.add(notice.id);
    }
  }

  @override
  Future<List<AppNotification>> notifications() async {
    final notices = <AppNotification>[];

    final unpaid =
        (await invoices()).where((i) => i.status == InvoiceStatus.due);
    for (final invoice in unpaid.take(2)) {
      notices.add(
        AppNotification(
          id: 'invoice-${invoice.id}',
          title: 'Payment reminder',
          body: '${invoice.title} (${invoice.formattedAmount}) is due',
          kind: NoticeKind.payment,
          patientUhid: user.identifier,
        ),
      );
    }

    final records = await reports();
    // A prescription is the one record a patient should be told about rather
    // than left to discover, so it leads the list.
    final latestRx = records
        .where((r) => r.kind == ReportKind.prescription)
        .firstOrNull;
    if (latestRx != null) {
      notices.insert(
        0,
        AppNotification(
          id: 'rx-${latestRx.id}',
          title: 'New prescription',
          body: '${latestRx.title} — tap to view',
          kind: NoticeKind.prescription,
          patientUhid: user.identifier,
          time: latestRx.date,
          reportId: latestRx.id,
        ),
      );
    }

    final latest = records.firstOrNull;
    if (latest != null && latest.kind != ReportKind.prescription) {
      notices.insert(
        0,
        AppNotification(
          id: 'report-${latest.id}',
          title: 'Report ready',
          body: '${latest.title} has been uploaded',
          kind: NoticeKind.reportReady,
          patientUhid: user.identifier,
          time: latest.date,
          reportId: latest.id,
        ),
      );
    }

    return [
      for (final notice in notices)
        if (!_dismissed.contains(notice.id))
          notice.copyWith(read: _notificationsRead),
    ];
  }

  // TODO(backend): notification preferences are device-local for now.
  @override
  Future<List<NotificationPref>> notificationPrefs() async =>
      List.of(_store.patientPrefs);

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) async {
    _store.patientPrefs = List.of(prefs);
  }
}

class ApiDoctorRepository implements DoctorRepository {
  ApiDoctorRepository(this._client, {this.doctorId});

  final ApiClient _client;
  final String? doctorId;

  Map<String, dynamic> get _scope =>
      doctorId == null ? const {} : {'doctor_id': doctorId};

  @override
  Future<DoctorStats> stats() async {
    final results = await Future.wait([
      _client.get(Api.appointments, query: {..._scope, 'limit': '100'}),
      _client.get(Api.prescriptions,
          query: {..._scope, 'status': 'pending', 'limit': '100'}),
    ]);

    return DoctorStats(
      patientsToday: results[0].asList.length,
      otSlots: (await otSchedule()).length,
      pendingRx: results[1].asList.length,
    );
  }

  @override
  Future<List<PatientRecord>> queue() async {
    final all = await patients();
    return all.take(3).toList();
  }

  @override
  Future<List<PatientRecord>> patients({String query = ''}) async {
    final result = await _client.get(
      Api.appointments,
      query: {
        ..._scope,
        'limit': '50',
        if (query.trim().isNotEmpty) 'search': query.trim(),
      },
    );
    return result.asList.map(PatientRecord.fromJson).toList();
  }

  // TODO(backend): dismissals are device-local until there is an alerts module.
  final Set<String> _dismissedAlerts = <String>{};

  @override
  Future<List<AppNotification>> alerts() async {
    final flagged = (await patients()).where((p) => p.vitalsFlagged);
    return [
      for (final p in flagged)
        if (!_dismissedAlerts.contains('alert-${p.uhid}'))
          AppNotification(
            id: 'alert-${p.uhid}',
            title: 'Vitals flagged',
            body: '${p.name} — ${p.vitals}',
            kind: NoticeKind.vitalsFlagged,
            patientUhid: p.uhid,
            time: p.time,
          ),
    ];
  }

  @override
  Future<void> dismissAlert(String id) async => _dismissedAlerts.add(id);

  @override
  Future<void> clearAlerts() async {
    for (final alert in await alerts()) {
      _dismissedAlerts.add(alert.id);
    }
  }

  @override
  Future<List<Prescription>> prescriptions() async {
    final result = await _client.get(
      Api.prescriptions,
      query: {..._scope, 'limit': '50'},
    );
    return result.asList.map(Prescription.fromJson).toList();
  }

  @override
  Future<Prescription> savePrescription({
    required PatientRecord patient,
    required List<Medicine> medicines,
  }) async {
    final result = await _client.post(
      Api.prescriptions,
      body: {
        'patient_id': patient.id,
        if (doctorId != null) 'doctor_id': doctorId,
        'items': medicines.map((m) => m.toJson()).toList(),
      },
    );
    return Prescription.fromJson(result.asMap);
  }

  @override
  Future<List<OtBooking>> otSchedule() async {
    // OT bookings live under the IPD module in this backend.
    final result = await _client.get('/ipd', query: {..._scope, 'limit': '25'});
    return result.asList.map(OtBooking.fromJson).toList();
  }

  @override
  Future<List<OtBooking>> completeOtBooking(String id) async {
    await _client.patch('/ipd/$id', body: {'status': 'completed'});
    return otSchedule();
  }

  // TODO(backend): duty roster is not exposed as an endpoint yet.
  @override
  Future<List<WorkingDay>> workingHours() async =>
      List.of(_store.workingHours);

  @override
  Future<void> saveWorkingHours(List<WorkingDay> days) async {
    _store.workingHours = List.of(days);
  }

  // TODO(backend): map onto /hr/attendance once leave types are modelled.
  // Held in the shared store so the admin app still sees what a doctor files.
  @override
  Future<List<LeaveRequest>> leaveRequests() async =>
      List.of(_store.leaveRequests);

  @override
  Future<List<LeaveRequest>> submitLeave({
    required DateTime fromDate,
    required DateTime toDate,
    required String reason,
    String fromTime = '',
    String toTime = '',
  }) async {
    _store.leaveRequests.insert(
      0,
      LeaveRequest(
        id: 'lv-${_store.leaveRequests.length + 1}',
        fromDate: fromDate,
        toDate: toDate,
        fromTime: fromTime,
        toTime: toTime,
        reason: reason.trim().isEmpty ? 'Not specified' : reason,
        status: LeaveStatus.pending,
      ),
    );
    return List.of(_store.leaveRequests);
  }

  @override
  Future<List<NotificationPref>> notificationPrefs() async =>
      List.of(_store.doctorPrefs);

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) async {
    _store.doctorPrefs = List.of(prefs);
  }
}

class ApiAdminRepository implements AdminRepository {
  ApiAdminRepository(this._client);

  final ApiClient _client;

  @override
  Future<DashboardStats> dashboard() async {
    final result = await _client.get(Api.dashboardReport);
    return DashboardStats.fromJson(result.asMap);
  }

  @override
  Future<List<ChartPoint>> revenueTrend() async {
    final result = await _client.get(
      Api.financeReport,
      query: {'group_by': 'day', 'days': '7'},
    );
    return result.asList.map(ChartPoint.fromJson).toList();
  }

  @override
  Future<List<ChartPoint>> departmentLoad() async {
    final result = await _client.get(
      Api.appointmentsReport,
      query: {'group_by': 'department'},
    );
    final points = result.asList.map(ChartPoint.fromJson).toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return points;
  }

  @override
  Future<List<WardSummary>> wards() async {
    final result = await _client.get(Api.wards, query: {'limit': '50'});
    return result.asList.map(WardSummary.fromJson).toList();
  }

  @override
  Future<List<BedRecord>> beds({String? wardName}) async {
    final result = await _client.get(
      Api.beds,
      query: {
        'limit': '200',
        if (wardName != null) 'ward': wardName,
      },
    );
    return result.asList.map(BedRecord.fromJson).toList();
  }

  @override
  Future<List<Admission>> admissions() async {
    final result = await _client.get(Api.ipd, query: {'limit': '50'});
    return result.asList.map(Admission.fromJson).toList();
  }

  @override
  Future<List<Employee>> employees({String query = ''}) async {
    final result = await _client.get(
      Api.employees,
      query: {
        'limit': '100',
        if (query.trim().isNotEmpty) 'search': query.trim(),
      },
    );
    return result.asList.map(Employee.fromJson).toList();
  }

  @override
  Future<List<AttendanceRecord>> attendance() async {
    final result = await _client.get(Api.attendance, query: {'limit': '100'});
    return result.asList.map(AttendanceRecord.fromJson).toList();
  }

  // TODO(backend): no leave module — shared store, so the doctor → admin
  // approval loop still works end to end.
  @override
  Future<List<LeaveRequest>> pendingLeave() async =>
      List.of(_store.leaveRequests);

  @override
  Future<List<LeaveRequest>> resolveLeave(
    String id, {
    required bool approve,
  }) async {
    final requests = _store.leaveRequests;
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id != id) continue;
      requests[i] = requests[i].copyWith(
        status: approve ? LeaveStatus.approved : LeaveStatus.rejected,
      );
    }
    return List.of(requests);
  }

  @override
  Future<List<MedicineStock>> medicineStock() async {
    final result = await _client.get(
      Api.pharmacyStockReport,
      query: {'limit': '100'},
    );
    final items = result.asList.map(MedicineStock.fromJson).toList()
      ..sort((a, b) => a.stock.compareTo(b.stock));
    return items;
  }

  @override
  Future<List<BloodStock>> bloodStock() async {
    final result = await _client.get(Api.bloodStockReport);
    final items = result.asList.map(BloodStock.fromJson).toList()
      ..sort((a, b) => b.units.compareTo(a.units));
    return items;
  }

  @override
  Future<List<AuditEntry>> auditLog() async {
    final result = await _client.get(Api.auditLogs, query: {'limit': '50'});
    return result.asList.map(AuditEntry.fromJson).toList();
  }

  @override
  Future<List<HospitalSetting>> hospitalSettings() async {
    final result = await _client.get(Api.publicSettings);
    final data = result.asMap;
    if (data.isEmpty) return MockData.hospitalSettings;
    return data.entries
        .map(
          (e) => HospitalSetting(label: e.key, value: '${e.value}'),
        )
        .toList();
  }

  /// Lab + radiology + prescriptions across every patient, merged into one
  /// record list the admin can browse and print.
  Future<List<MedicalReport>> _allReports({String? uhid}) async {
    final scope = <String, dynamic>{
      'limit': '100',
      if (uhid != null) 'uhid': uhid,
    };

    final responses = await Future.wait([
      _client.get(Api.labOrders, query: scope),
      _client.get(Api.radiologyOrders, query: scope),
      _client.get(Api.prescriptions, query: scope),
    ]);

    return [
      ...responses[0].asList.map(
            (e) => MedicalReport.fromJson({...e, 'category': 'lab'}),
          ),
      ...responses[1].asList.map(
            (e) => MedicalReport.fromJson({...e, 'category': 'radiology'}),
          ),
      ...responses[2].asList.map(
            (e) => MedicalReport.fromJson({...e, 'category': 'prescription'}),
          ),
    ];
  }

  @override
  Future<List<ReportSummary>> reportSummaries() async {
    final byPatient = <String, List<MedicalReport>>{};
    for (final report in await _allReports()) {
      byPatient.putIfAbsent(report.patientUhid, () => []).add(report);
    }

    return byPatient.entries
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
  }

  @override
  Future<List<MedicalReport>> reportsFor(String uhid) =>
      _allReports(uhid: uhid);

  @override
  Future<List<AppNotification>> alerts() async {
    final notices = <AppNotification>[];

    final lowMedicines = (await medicineStock()).where((m) => m.isLow).length;
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

    final lowBlood = (await bloodStock()).where((b) => b.isLow).toList();
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

    return notices;
  }

  @override
  Future<List<NotificationPref>> notificationPrefs() async =>
      List.of(_store.adminPrefs);

  @override
  Future<void> saveNotificationPrefs(List<NotificationPref> prefs) async {
    _store.adminPrefs = List.of(prefs);
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
