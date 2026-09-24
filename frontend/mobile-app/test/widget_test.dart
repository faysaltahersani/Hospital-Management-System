import 'package:emedical_app/app.dart';
import 'package:emedical_app/core/config/app_config.dart';
import 'package:emedical_app/core/widgets/app_bottom_nav.dart';
import 'package:emedical_app/core/widgets/app_toast.dart';
import 'package:emedical_app/data/mock/mock_data.dart';
import 'package:emedical_app/data/mock/mock_store.dart';
import 'package:emedical_app/data/models/models.dart';
import 'package:emedical_app/data/repositories/mock_repositories.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Signs in through the real sign-in screen so each test exercises the router
/// the same way the app does.
Future<void> signInAs(WidgetTester tester, String role) async {
  await tester.pumpWidget(const EMedicalApp());
  await tester.pumpAndSettle();

  if (role != 'Patient') {
    await tester.tap(find.text(role));
    await tester.pump();
  }
  await tester.tap(find.text('Continue as $role'));
  await tester.pumpAndSettle();
}

/// Taps a bottom-nav tab by label.
///
/// Scoped to [AppBottomNav] on purpose: every tab is built at once inside the
/// IndexedStack, so a bare `find.text('Reports')` also matches the home
/// screen's quick action.
Future<void> tapTab(WidgetTester tester, String label) async {
  await tester.tap(
    find.descendant(of: find.byType(AppBottomNav), matching: find.text(label)),
  );
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => MockStore.instance.reset());
  tearDown(AppToast.clear);

  group('sign-in', () {
    testWidgets('offers exactly the enabled roles', (tester) async {
      await tester.pumpWidget(const EMedicalApp());
      await tester.pumpAndSettle();

      for (final role in AppConfig.enabledRoles) {
        expect(find.text(role.label), findsOneWidget);
      }
      // Admin is built but deliberately not offered as a login.
      expect(AppConfig.enabledRoles.contains(UserRole.admin), isFalse);
      expect(find.text('Admin'), findsNothing);
      expect(find.text('Continue as Patient'), findsOneWidget);
    });

    testWidgets('picking a role swaps the demo email', (tester) async {
      await tester.pumpWidget(const EMedicalApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Doctor'));
      await tester.pumpAndSettle();

      expect(find.text('Continue as Doctor'), findsOneWidget);
      expect(find.text('nabila.karim@example.com'), findsOneWidget);
    });
  });

  group('patient app', () {
    testWidgets('opens on the home tab', (tester) async {
      await signInAs(tester, 'Patient');

      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
      expect(find.text('Rahim Ahmed'), findsWidgets);
    });

    testWidgets('paying an invoice clears its due state', (tester) async {
      await signInAs(tester, 'Patient');

      await tapTab(tester, 'Pay');

      // Two of the three seeded invoices start out due.
      expect(find.text('DUE'), findsNWidgets(2));

      await tester.tap(find.text('Radiology — Invoice #4821'));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      expect(find.text('DUE'), findsOneWidget);
      expect(find.text('PAID'), findsNWidgets(2));
    });
  });

  group('doctor app', () {
    testWidgets('opens on the schedule tab', (tester) async {
      await signInAs(tester, 'Doctor');

      expect(find.text('Schedule'), findsOneWidget);
      expect(find.text('OT'), findsOneWidget);
      expect(find.text("Today's schedule"), findsOneWidget);
    });

    test('a vitals alert names the flagged patient and their UHID', () async {
      final alerts = await MockDoctorRepository().alerts();

      // Only Meherun Nesa is flagged in the seeded queue.
      expect(alerts.length, 1);
      expect(alerts.first.kind, NoticeKind.vitalsFlagged);
      expect(alerts.first.body, contains('Meherun Nesa'));
      expect(alerts.first.patientUhid, 'EM-209044');
    });

    test('a cleared alert stays cleared', () async {
      final doctor = MockDoctorRepository();

      final before = await doctor.alerts();
      expect(before, isNotEmpty);

      await doctor.dismissAlert(before.first.id);

      // Alerts are recomputed from the queue on every read, so this only holds
      // if the dismissal was recorded.
      expect(await doctor.alerts(), isEmpty);
    });

    testWidgets('tapping a vitals alert opens that patient', (tester) async {
      await signInAs(tester, 'Doctor');

      await tester.tap(find.byIcon(Icons.warning_amber_rounded));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );
      expect(find.text('Vitals flagged'), findsOneWidget);

      await tester.tap(find.text('Vitals flagged'));
      // The handler looks the patient up before navigating — advance past it.
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );

      // Landed on her record, inside the Patients tab.
      expect(find.text('EM-209044 · New patient · Chest pain'), findsOneWidget);
      expect(find.text('Write prescription'), findsOneWidget);
      expect(find.byType(AppBottomNav), findsOneWidget);
    });
  });

  // The admin app is still built, but it is no longer offered as a login
  // (see AppConfig.enabledRoles), so its screens are unreachable through the
  // sign-in flow. Its data layer is covered directly instead — that keeps the
  // code honest if the role is ever switched back on.
  group('admin data layer', () {
    test('dashboard bed figures track the ward list', () async {
      final admin = MockAdminRepository();

      final stats = await admin.dashboard();
      final wards = await admin.wards();

      expect(stats.totalBeds, 90);
      expect(stats.occupiedBeds, 67);
      expect(wards.fold(0, (sum, w) => sum + w.totalBeds), stats.totalBeds);
      expect(wards.fold(0, (sum, w) => sum + w.occupiedBeds), 67);
    });

    test('three medicines sit below their reorder level', () async {
      final admin = MockAdminRepository();

      final low = (await admin.medicineStock()).where((m) => m.isLow);
      expect(low.length, 3);
    });

    test('approving a leave request updates its status', () async {
      final admin = MockAdminRepository();

      final pending = (await admin.pendingLeave())
          .firstWhere((r) => r.status == LeaveStatus.pending);
      final after = await admin.resolveLeave(pending.id, approve: true);

      expect(after.any((r) => r.status == LeaveStatus.pending), isFalse);
      expect(
        after.where((r) => r.status == LeaveStatus.approved).length,
        2,
      );
    });
  });

  group('booking history', () {
    testWidgets('lists past visits and keeps a new booking', (tester) async {
      await signInAs(tester, 'Patient');

      await tapTab(tester, 'Profile');
      await tester.tap(find.text('My booking history'));
      await tester.pumpAndSettle();

      expect(find.text('My booking history'), findsOneWidget);
      // Seeded: one upcoming plus four past visits. SectionLabel uppercases.
      // Only the headings are asserted here — cards further down the list are
      // not mounted at the test viewport height, so the statuses are covered
      // by the repository test below instead.
      expect(find.text('PAST VISITS · 4'), findsOneWidget);
    });

    test('booking appends rather than replacing', () async {
      final patients = MockPatientRepository();

      final before = (await patients.bookingHistory()).length;
      await patients.book(
        doctor: MockData.doctors.first,
        slot: '4:30 PM',
      );
      final after = await patients.bookingHistory();

      expect(after.length, before + 1);
      expect(after.first.time, '4:30 PM');
      // The earlier upcoming visit is still on file.
      expect(after.any((a) => a.code == '#APT-3391'), isTrue);
      // …as is the cancelled ENT visit, with its status intact.
      final cancelled = after.where(
        (a) => a.status == AppointmentStatus.cancelled,
      );
      expect(cancelled.length, 1);
      expect(cancelled.first.code, '#APT-3372');
    });
  });

  group('reports', () {
    testWidgets('are scoped to the selected profile', (tester) async {
      await signInAs(tester, 'Patient');

      await tapTab(tester, 'Reports');

      // Own records.
      expect(find.text('Chest X-Ray'), findsOneWidget);
      expect(find.text('Antenatal Ultrasound'), findsNothing);

      // Switch to the spouse's profile.
      await tester.tap(find.text('Ayesha'));
      await tester.pumpAndSettle();

      expect(find.text('Antenatal Ultrasound'), findsOneWidget);
      expect(find.text('Chest X-Ray'), findsNothing);
    });

    test("a doctor's prescription is filed into the patient's records",
        () async {
      final doctor = MockDoctorRepository();
      final patients = MockPatientRepository();

      final before = (await patients.reports()).length;

      await doctor.savePrescription(
        patient: MockData.patients.first, // Rahim Ahmed
        medicines: const [
          Medicine(name: 'Ramipril 5mg', dosage: '1-0-0 · Before meal'),
        ],
      );

      final after = await patients.reports();
      expect(after.length, before + 1);
      expect(after.first.kind, ReportKind.prescription);
      expect(after.first.patientUhid, MockData.patientUhid);
      expect(after.first.body.first, contains('Ramipril 5mg'));
    });

    test('prescribing raises an unread notification for that patient',
        () async {
      final doctor = MockDoctorRepository();
      final patients = MockPatientRepository();

      final before = await patients.notifications();
      expect(before.where((n) => !n.read).length, 2); // seeded, both unread

      await doctor.savePrescription(
        patient: MockData.patients.first, // Rahim Ahmed
        medicines: const [
          Medicine(name: 'Ramipril 5mg', dosage: '1-0-0 · Before meal'),
        ],
      );

      final after = await patients.notifications();
      expect(after.length, before.length + 1);
      expect(after.first.kind, NoticeKind.prescription);
      expect(after.first.title, 'New prescription');
      expect(after.first.read, isFalse);
      expect(after.first.body, contains('1 medicine'));

      // Opening the sheet clears the badge.
      await patients.markNotificationsRead();
      final read = await patients.notifications();
      expect(read.every((n) => n.read), isTrue);
    });

    test('a prescription notice points at the record it created', () async {
      final doctor = MockDoctorRepository();
      final patients = MockPatientRepository();

      await doctor.savePrescription(
        patient: MockData.patients.first,
        medicines: const [Medicine(name: 'Ramipril 5mg', dosage: '1-0-0')],
      );

      final notice = (await patients.notifications()).first;
      final records = await patients.reports();

      expect(notice.reportId, isNotEmpty);
      expect(records.any((r) => r.id == notice.reportId), isTrue);
    });

    testWidgets('tapping a prescription notice opens that record',
        (tester) async {
      // Raise a real notice first, so the tap has a record to land on.
      // runAsync because the repositories await Future.delayed, and the test
      // clock only advances while pumping — a bare await would hang.
      await tester.runAsync(() async {
        await MockDoctorRepository().savePrescription(
          patient: MockData.patients.first, // Rahim Ahmed
          medicines: const [
            Medicine(name: 'Ramipril 5mg', dosage: '1-0-0 · Before meal'),
          ],
        );
      });

      await signInAs(tester, 'Patient');

      await tester.tap(find.byIcon(Icons.notifications_none));
      // Short timeout: a hang here should fail fast, not sit for 10 minutes.
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );
      expect(find.text('New prescription'), findsOneWidget);

      await tester.tap(find.text('New prescription'));
      // The handler looks the record up before navigating. A pending timer
      // schedules no frames, so pumpAndSettle alone would return before the
      // lookup resolves — pump the clock past it first.
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );

      // Landed on the report's own screen, not just the Reports tab.
      expect(find.text('Print / save as PDF'), findsOneWidget);
      expect(find.text('Ramipril 5mg · 1-0-0 · Before meal'), findsOneWidget);
      // The bottom bar survives, so it opened inside the tab.
      expect(find.byType(AppBottomNav), findsOneWidget);
    });

    testWidgets('tapping a payment notice switches to the Pay tab',
        (tester) async {
      await signInAs(tester, 'Patient');

      await tester.tap(find.byIcon(Icons.notifications_none));
      // Short timeout: a hang here should fail fast, not sit for 10 minutes.
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );

      await tester.tap(find.text('Payment reminder'));
      await tester.pumpAndSettle(const Duration(seconds: 3));

      expect(find.text('Total due'), findsOneWidget);
    });

    test('a patient can dismiss one notice or clear the lot', () async {
      final patients = MockPatientRepository();

      final before = await patients.notifications();
      expect(before.length, 2);

      await patients.dismissNotification(before.first.id);
      final afterOne = await patients.notifications();
      expect(afterOne.length, 1);
      expect(afterOne.any((n) => n.id == before.first.id), isFalse);

      await patients.clearNotifications();
      expect(await patients.notifications(), isEmpty);
    });

    test("clearing one patient's notices leaves another's alone", () async {
      final doctor = MockDoctorRepository();
      final patients = MockPatientRepository();

      // A notice addressed to someone else.
      await doctor.savePrescription(
        patient: MockData.patients[1], // Meherun Nesa
        medicines: const [Medicine(name: 'Omeprazole 20mg', dosage: '1-0-0')],
      );

      await patients.clearNotifications();

      expect(await patients.notifications(), isEmpty);
      // Meherun's notice survives — clearing is scoped by UHID.
      expect(
        MockStore.instance.notificationsFor('EM-209044'),
        isNotEmpty,
      );
    });

    testWidgets('Clear all empties the sheet', (tester) async {
      await signInAs(tester, 'Patient');

      await tester.tap(find.byIcon(Icons.notifications_none));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );

      expect(find.text('Report ready'), findsOneWidget);
      await tester.tap(find.text('Clear all (2)'));
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 20),
      );

      expect(find.text('Report ready'), findsNothing);
      expect(find.text('Nothing new right now.'), findsOneWidget);
    });

    test('a notification only reaches the patient it is addressed to',
        () async {
      final doctor = MockDoctorRepository();
      final patients = MockPatientRepository();

      // Meherun Nesa, not the signed-in account holder.
      await doctor.savePrescription(
        patient: MockData.patients[1],
        medicines: const [Medicine(name: 'Omeprazole 20mg', dosage: '1-0-0')],
      );

      final mine = await patients.notifications();
      expect(mine.any((n) => n.kind == NoticeKind.prescription), isFalse);
      expect(mine.every((n) => n.patientUhid == MockData.patientUhid), isTrue);
    });

    test('admin sees every patient file, grouped', () async {
      final admin = MockAdminRepository();

      final summaries = await admin.reportSummaries();
      expect(summaries.length, 3); // Rahim, Ayesha, Zayan

      final rahim =
          summaries.firstWhere((s) => s.uhid == MockData.patientUhid);
      expect(rahim.reportCount, 4);

      final own = await admin.reportsFor(MockData.spouseUhid);
      expect(own.length, 2);
      expect(own.every((r) => r.patientName == 'Ayesha Ahmed'), isTrue);
    });
  });

  group('shared mock store', () {
    test("a doctor's leave request reaches the admin queue", () async {
      final doctor = MockDoctorRepository();
      final admin = MockAdminRepository();

      final before = (await admin.pendingLeave()).length;

      await doctor.submitLeave(
        fromDate: DateTime(2026, 9, 18),
        toDate: DateTime(2026, 9, 20),
        reason: 'Training',
      );

      final after = await admin.pendingLeave();
      expect(after.length, before + 1);
      expect(after.first.reason, 'Training');
      expect(after.first.dateRange, 'Sep 18 – Sep 20');
      expect(after.first.dayCount, 3);
      // No hours given, so it is a whole-day request.
      expect(after.first.isAllDay, isTrue);
      expect(after.first.timeRange, 'All day');
    });

    test('an hours-only leave request keeps its time range', () async {
      final doctor = MockDoctorRepository();

      final after = await doctor.submitLeave(
        fromDate: DateTime(2026, 9, 18),
        toDate: DateTime(2026, 9, 18),
        reason: 'Dental appointment',
        fromTime: '2:00 PM',
        toTime: '5:00 PM',
      );

      expect(after.first.isAllDay, isFalse);
      expect(after.first.dayCount, 1);
      expect(after.first.dateRange, 'Sep 18');
      expect(after.first.timeRange, '2:00 PM – 5:00 PM');
    });
  });
}
