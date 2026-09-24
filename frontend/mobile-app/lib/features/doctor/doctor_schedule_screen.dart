import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/tab_shell.dart';
import '../../data/models/models.dart';
import '../../data/repositories/repositories.dart' show DoctorStats;
import '../../data/session.dart';
import '../patient/notifications_sheet.dart';
import 'doctor_patient_detail_screen.dart';
import 'doctor_shell.dart';
import 'prescription_form_screen.dart';

class DoctorScheduleScreen extends StatefulWidget {
  const DoctorScheduleScreen({super.key});

  @override
  State<DoctorScheduleScreen> createState() => _DoctorScheduleScreenState();
}

class _DoctorScheduleScreenState extends State<DoctorScheduleScreen> {
  late Future<DoctorStats> _stats;
  late Future<List<PatientRecord>> _queue;
  late Future<List<AppNotification>> _alerts;

  @override
  void initState() {
    super.initState();
    final repo = context.read<AppSession>().doctors;
    _stats = repo.stats();
    _queue = repo.queue();
    _alerts = repo.alerts();
  }

  Future<void> _openAlerts() async {
    final alerts = await _alerts;
    if (!mounted) return;
    // No read tracking on alerts — they stand until the vitals are dealt with,
    // so the unread pill would be on every row and mean nothing.
    final repo = context.read<AppSession>().doctors;
    final tapped = await showNotificationsSheet(
      context,
      title: 'Alerts',
      items: alerts,
      showUnread: false,
      onDismiss: (notice) => repo.dismissAlert(notice.id),
      onClearAll: repo.clearAlerts,
    );

    if (!mounted) return;
    // Refresh so the badge reflects anything that was cleared. Block body, not
    // an arrow: the assignment evaluates to the Future and setState rejects it.
    setState(() {
      _alerts = repo.alerts();
    });

    if (tapped != null) await _openAlert(tapped);
  }

  /// An alert names a patient, so it opens their record — in the Patients tab,
  /// which is where the doctor would go looking for it anyway.
  Future<void> _openAlert(AppNotification notice) async {
    if (notice.patientUhid.isEmpty) return;

    final patients = await context.read<AppSession>().doctors.patients();
    if (!mounted) return;

    for (final patient in patients) {
      if (patient.uhid != notice.patientUhid) continue;
      TabShellScope.of(context).openInTab(
        DoctorTabs.patients,
        (_) => DoctorPatientDetailScreen(patient: patient),
      );
      return;
    }

    // The patient is no longer in the queue; fall back to the list.
    TabShellScope.of(context).goToTab(DoctorTabs.patients);
  }

  Future<void> _writePrescription() async {
    final queue = await _queue;
    if (!mounted || queue.isEmpty) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PrescriptionFormScreen(patient: queue.first),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppSession>().user;

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            24,
            MediaQuery.paddingOf(context).top + 20,
            24,
            22,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Today's schedule",
                      style: AppTextStyles.body(
                        11,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      user?.name ?? 'Doctor',
                      style: AppTextStyles.display(20, color: Colors.white),
                    ),
                  ],
                ),
              ),
              FutureBuilder<List<AppNotification>>(
                future: _alerts,
                builder: (context, snapshot) => _AlertButton(
                  count: snapshot.data?.length ?? 0,
                  onTap: _openAlerts,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: FutureBuilder<DoctorStats>(
            future: _stats,
            builder: (context, snapshot) {
              final stats = snapshot.data;
              return Row(
                children: [
                  Expanded(
                    child: _StatTile(
                      value: stats?.patientsToday,
                      label: 'Patients today',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatTile(
                      value: stats?.otSlots,
                      label: 'OT slots',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatTile(
                      value: stats?.pendingRx,
                      label: 'Pending Rx',
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 26),
        ContentSheet(
          minHeight: 420,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionLabel('Patient queue'),
              const SizedBox(height: 12),
              FutureBuilder<List<PatientRecord>>(
                future: _queue,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }

                  final queue = snapshot.data ?? const <PatientRecord>[];
                  if (queue.isEmpty) {
                    return const EmptyState('No patients queued today.');
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < queue.length; i++) ...[
                        QueueCard(patient: queue[i]),
                        if (i < queue.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Write prescription',
                icon: Icons.add,
                onPressed: _writePrescription,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AlertButton extends StatelessWidget {
  const _AlertButton({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: count > 0 ? '$count alerts' : 'Alerts',
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(
                  color: AppColors.coralChip,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  size: 17,
                  color: AppColors.coral,
                ),
              ),
              if (count > 0)
                Positioned(
                  top: 2,
                  right: 2,
                  child: Container(
                    width: 17,
                    height: 17,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.coral,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$count',
                      style: AppTextStyles.body(
                        9,
                        color: Colors.white,
                        weight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.value, required this.label});

  final int? value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.navyField,
        borderRadius: AppRadius.row,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value?.toString() ?? '—',
            style: AppTextStyles.display(18, color: Colors.white),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.body(10, color: AppColors.onNavyMuted),
          ),
        ],
      ),
    );
  }
}

/// Patient row used by both the schedule queue and the patients list.
class QueueCard extends StatelessWidget {
  const QueueCard({
    super.key,
    required this.patient,
    this.showTime = true,
  });

  final PatientRecord patient;
  final bool showTime;

  @override
  Widget build(BuildContext context) {
    final waiting = patient.status.toLowerCase() == 'waiting';

    return ShadowedCard(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DoctorPatientDetailScreen(patient: patient),
        ),
      ),
      child: Row(
        children: [
          const IconChip(icon: Icons.person_outline, iconSize: 16),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.name,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  showTime
                      ? patient.note
                      : '${patient.uhid} · ${patient.note}',
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (showTime)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  patient.time,
                  style: AppTextStyles.body(11, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  patient.status,
                  style: AppTextStyles.body(
                    9,
                    color: waiting ? AppColors.coral : AppColors.mint,
                  ),
                ),
              ],
            )
          else
            const Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.slateLight,
            ),
        ],
      ),
    );
  }
}
