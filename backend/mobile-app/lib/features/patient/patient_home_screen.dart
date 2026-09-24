import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/tab_shell.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'notifications_sheet.dart';
import 'patient_shell.dart';
import 'report_detail_screen.dart';

class PatientHomeScreen extends StatefulWidget {
  const PatientHomeScreen({super.key});

  @override
  State<PatientHomeScreen> createState() => _PatientHomeScreenState();
}

class _PatientHomeScreenState extends State<PatientHomeScreen> {
  late Future<Appointment?> _appointment;
  List<AppNotification> _notifications = const [];

  int get _unread => _notifications.where((n) => !n.read).length;

  @override
  void initState() {
    super.initState();
    _appointment = context.read<AppSession>().patients.upcomingAppointment();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    final items = await context.read<AppSession>().patients.notifications();
    if (mounted) setState(() => _notifications = items);
  }

  Future<void> _openNotifications() async {
    final repo = context.read<AppSession>().patients;
    final tapped = await showNotificationsSheet(
      context,
      title: 'Notifications',
      items: _notifications,
      onDismiss: (notice) => repo.dismissNotification(notice.id),
      onClearAll: repo.clearNotifications,
    );

    // Clear the badge only once they have actually seen the sheet, then reload
    // so anything raised while it was open still shows as new.
    if (!mounted) return;
    await context.read<AppSession>().patients.markNotificationsRead();
    if (!mounted) return;
    await _loadNotifications();

    if (mounted && tapped != null) await _openNotice(tapped);
  }

  /// Sends the patient where the notice points: the record itself when it names
  /// one, otherwise the tab that deals with it.
  Future<void> _openNotice(AppNotification notice) async {
    final scope = TabShellScope.of(context);

    if (notice.reportId.isNotEmpty) {
      final records = await context.read<AppSession>().patients.reports();
      if (!mounted) return;

      for (final record in records) {
        if (record.id != notice.reportId) continue;
        scope.openInTab(
          PatientTabs.reports,
          (_) => ReportDetailScreen(report: record),
        );
        return;
      }
      // Record has gone; fall through to the tab rather than dead-ending.
    }

    scope.goToTab(switch (notice.kind) {
      NoticeKind.payment => PatientTabs.pay,
      NoticeKind.appointment => PatientTabs.book,
      NoticeKind.reportReady ||
      NoticeKind.prescription ||
      NoticeKind.vitalsFlagged =>
        PatientTabs.reports,
    });
  }

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppSession>().user;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // The hero is navy, so the status bar needs light icons on this tab.
      value: SystemUiOverlayStyle.light,
      child: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          _Hero(
            greeting: _greeting,
            name: user?.name ?? 'Patient',
            unread: _unread,
            onBellTap: _openNotifications,
            onSearchTap: () =>
                TabShellScope.of(context).goToTab(PatientTabs.book),
          ),
          Transform.translate(
            offset: const Offset(0, -26),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: FutureBuilder<Appointment?>(
                    future: _appointment,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const _AppointmentPlaceholder();
                      }
                      final appointment = snapshot.data;
                      if (appointment == null) {
                        return const _NoAppointmentCard();
                      }
                      return _AppointmentCard(
                        appointment: appointment,
                        onCheckIn: () => AppToast.show(
                          context,
                          'Checked in for your appointment',
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 26),
                const _QuickActions(),
                const SizedBox(height: 28),
                const _RecentActivity(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.greeting,
    required this.name,
    required this.unread,
    required this.onBellTap,
    required this.onSearchTap,
  });

  final String greeting;
  final String name;
  final int unread;
  final VoidCallback onBellTap;
  final VoidCallback onSearchTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.paddingOf(context).top + 20,
        24,
        52,
      ),
      decoration: const BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: AppTextStyles.body(
                        11,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      name,
                      style: AppTextStyles.display(19, color: Colors.white),
                    ),
                  ],
                ),
              ),
              _BellButton(unread: unread, onTap: onBellTap),
            ],
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: onSearchTap,
            behavior: HitTestBehavior.opaque,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.navyField,
                borderRadius: AppRadius.card,
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.search,
                    size: 16,
                    color: AppColors.onNavyMuted,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Search doctors, tests, reports…',
                    style: AppTextStyles.body(
                      13,
                      color: AppColors.onNavyMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BellButton extends StatelessWidget {
  const _BellButton({required this.unread, required this.onTap});

  final int unread;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: unread > 0 ? '$unread unread notifications' : 'Notifications',
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
                  color: AppColors.navyChipStrong,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.notifications_none,
                  size: 18,
                  color: Colors.white,
                ),
              ),
              if (unread > 0)
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
                      '$unread',
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

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({
    required this.appointment,
    required this.onCheckIn,
  });

  final Appointment appointment;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: AppRadius.card,
        boxShadow: AppShadows.raised,
      ),
      child: Material(
        color: AppColors.card,
        borderRadius: AppRadius.card,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onCheckIn,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            AppTag(appointment.status.label),
                            const Spacer(),
                            Text(
                              appointment.code,
                              style: AppTextStyles.label(10),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          appointment.doctorName,
                          style: AppTextStyles.display(15),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          [appointment.department, appointment.room]
                              .where((p) => p.isNotEmpty)
                              .join(' · '),
                          style: AppTextStyles.body(
                            12,
                            color: AppColors.slate,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            _Detail(label: 'Date', value: appointment.date),
                            const SizedBox(width: 20),
                            _Detail(label: 'Time', value: appointment.time),
                            if (appointment.floor.isNotEmpty) ...[
                              const SizedBox(width: 20),
                              _Detail(
                                label: 'Floor',
                                value: appointment.floor,
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const _DashedEdge(),
                Container(
                  width: 58,
                  color: AppColors.mint,
                  alignment: Alignment.center,
                  child: RotatedBox(
                    quarterTurns: 1,
                    child: Text(
                      'CHECK-IN',
                      style: AppTextStyles.label(
                        11,
                        color: Colors.white,
                        weight: FontWeight.w700,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: AppTextStyles.label(9)),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.body(13, weight: FontWeight.w600),
        ),
      ],
    );
  }
}

/// The `border-left: 2px dashed` seam on the check-in ticket.
class _DashedEdge extends StatelessWidget {
  const _DashedEdge();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 2,
      child: CustomPaint(painter: _DashedEdgePainter(), child: const SizedBox()),
    );
  }
}

class _DashedEdgePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.bg
      ..strokeWidth = 2;

    const dash = 5.0;
    const gap = 4.0;
    var y = 0.0;
    while (y < size.height) {
      final end = y + dash > size.height ? size.height : y + dash;
      canvas.drawLine(Offset(1, y), Offset(1, end), paint);
      y += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _AppointmentPlaceholder extends StatelessWidget {
  const _AppointmentPlaceholder();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: AppRadius.card,
        boxShadow: AppShadows.raised,
      ),
      child: Container(
        height: 148,
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: AppRadius.card,
        ),
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    );
  }
}

class _NoAppointmentCard extends StatelessWidget {
  const _NoAppointmentCard();

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      shadow: AppShadows.raised,
      onTap: () => TabShellScope.of(context).goToTab(PatientTabs.book),
      child: Row(
        children: [
          const IconChip(icon: Icons.calendar_today_outlined),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'No upcoming appointment',
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  'Tap to book a doctor',
                  style: AppTextStyles.body(11, color: AppColors.slateLight),
                ),
              ],
            ),
          ),
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

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    const actions = <({IconData icon, String label, String tab})>[
      (
        icon: Icons.calendar_today_outlined,
        label: 'Book',
        tab: PatientTabs.book
      ),
      (
        icon: Icons.description_outlined,
        label: 'Reports',
        tab: PatientTabs.reports
      ),
      (
        icon: Icons.account_balance_wallet_outlined,
        label: 'Pay Bill',
        tab: PatientTabs.pay
      ),
      (
        icon: Icons.medication_outlined,
        label: 'Rx',
        tab: PatientTabs.reports
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          for (final action in actions)
            Expanded(
              child: _QuickAction(
                icon: action.icon,
                label: action.label,
                onTap: () => TabShellScope.of(context).goToTab(action.tab),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: AppRadius.card,
              boxShadow: AppShadows.card,
            ),
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: AppRadius.card,
              ),
              child: Icon(icon, size: 19, color: AppColors.mint),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppTextStyles.body(
              10,
              color: AppColors.slate,
              weight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentActivity extends StatelessWidget {
  const _RecentActivity();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SectionLabel('Recent activity'),
          const SizedBox(height: 12),
          ShadowedCard(
            onTap: () => AppToast.show(context, 'Downloading CBC report…'),
            child: Row(
              children: [
                const IconChip(icon: Icons.check_circle_outline),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CBC Report ready',
                        style: AppTextStyles.body(13, weight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Lab · 2 hours ago',
                        style: AppTextStyles.body(
                          11,
                          color: AppColors.slateLight,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.file_download_outlined,
                  size: 16,
                  color: AppColors.slate,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ShadowedCard(
            onTap: () => TabShellScope.of(context).goToTab(PatientTabs.pay),
            child: Row(
              children: [
                const IconChip(
                  icon: Icons.account_balance_wallet_outlined,
                  background: AppColors.amberSoft,
                  foreground: AppColors.amber,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Invoice #4821 due',
                        style: AppTextStyles.body(13, weight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '৳2,450 · Radiology',
                        style: AppTextStyles.body(
                          11,
                          color: AppColors.slateLight,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: AppColors.slate,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
