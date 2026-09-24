import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/mock/mock_data.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import '../patient/notifications_sheet.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  late Future<DashboardStats> _stats;
  late Future<List<ChartPoint>> _revenue;
  late Future<List<ChartPoint>> _departments;
  late Future<List<AppNotification>> _alerts;

  @override
  void initState() {
    super.initState();
    final repo = context.read<AppSession>().admins;
    _stats = repo.dashboard();
    _revenue = repo.revenueTrend();
    _departments = repo.departmentLoad();
    _alerts = repo.alerts();
  }

  Future<void> _openAlerts() async {
    final alerts = await _alerts;
    if (!mounted) return;
    await showNotificationsSheet(
      context,
      title: 'Needs attention',
      items: alerts,
      tappable: false,
    );
  }

  static const _weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  static const _months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  String get _today {
    final now = DateTime.now();
    return '${_weekdays[now.weekday - 1]}, ${now.day} ${_months[now.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
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
                      _today,
                      style: AppTextStyles.body(
                        11,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      MockData.hospitalName,
                      style: AppTextStyles.display(20, color: Colors.white),
                    ),
                  ],
                ),
              ),
              FutureBuilder<List<AppNotification>>(
                future: _alerts,
                builder: (context, snapshot) => _AlertBell(
                  count: snapshot.data?.length ?? 0,
                  onTap: _openAlerts,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: FutureBuilder<DashboardStats>(
            future: _stats,
            builder: (context, snapshot) => _KpiGrid(stats: snapshot.data),
          ),
        ),
        const SizedBox(height: 26),
        ContentSheet(
          minHeight: 460,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ShadowedCard(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
                child: FutureBuilder<List<ChartPoint>>(
                  future: _revenue,
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const _ChartPlaceholder();
                    return ColumnChart(
                      title: 'Revenue · last 7 days',
                      data: snapshot.data!
                          .map(
                            (p) => ChartDatum(
                              label: p.label,
                              value: p.value,
                              display: formatTakaCompact(p.value),
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
              ),
              const SizedBox(height: 14),
              ShadowedCard(
                padding: const EdgeInsets.all(16),
                child: FutureBuilder<List<ChartPoint>>(
                  future: _departments,
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) return const _ChartPlaceholder();
                    return RankedBarChart(
                      title: 'Appointments by department',
                      data: snapshot.data!
                          .map(
                            (p) => ChartDatum(
                              label: p.label,
                              value: p.value,
                              display: '${p.value.round()}',
                            ),
                          )
                          .toList(),
                    );
                  },
                ),
              ),
              const SizedBox(height: 22),
              const SectionLabelText('Needs attention'),
              const SizedBox(height: 12),
              FutureBuilder<List<AppNotification>>(
                future: _alerts,
                builder: (context, snapshot) {
                  final alerts = snapshot.data ?? const <AppNotification>[];
                  if (alerts.isEmpty) {
                    return const EmptyState('Nothing needs your attention.');
                  }
                  return Column(
                    children: [
                      for (var i = 0; i < alerts.length; i++) ...[
                        _AlertRow(notice: alerts[i]),
                        if (i < alerts.length - 1) const SizedBox(height: 10),
                      ],
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.stats});

  final DashboardStats? stats;

  @override
  Widget build(BuildContext context) {
    final occupancyPercent =
        stats == null ? null : (stats!.occupancy * 100).round();

    // IntrinsicHeight so paired tiles match height. `stretch` alone would ask
    // the Row to fill an unbounded height inside the ListView and assert.
    return Column(
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _StatTile(
                  label: 'Appointments today',
                  value: stats?.appointmentsToday.toString(),
                  delta: stats?.appointmentsDeltaPercent,
                  upIsGood: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatTile(
                  label: 'Admissions today',
                  value: stats?.admissionsToday.toString(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _StatTile(
                  label: 'Revenue today',
                  value: stats == null
                      ? null
                      : formatTakaCompact(stats!.revenueToday),
                  delta: stats?.revenueDeltaPercent,
                  upIsGood: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _StatTile(
                  label: 'Bed occupancy',
                  value:
                      occupancyPercent == null ? null : '$occupancyPercent%',
                  meter: stats?.occupancy,
                  // Above 85% the hospital is effectively full.
                  meterCritical: (stats?.occupancy ?? 0) >= 0.85,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    this.delta,
    this.upIsGood = true,
    this.meter,
    this.meterCritical = false,
  });

  final String label;
  final String? value;

  /// Signed percentage change vs. yesterday.
  final double? delta;
  final bool upIsGood;
  final double? meter;
  final bool meterCritical;

  @override
  Widget build(BuildContext context) {
    final change = delta;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: AppColors.navyField,
        borderRadius: AppRadius.row,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.body(10.5, color: AppColors.onNavyMuted),
          ),
          const SizedBox(height: 6),
          Text(
            value ?? '—',
            style: AppTextStyles.display(22, color: Colors.white),
          ),
          if (change != null && change != 0) ...[
            const SizedBox(height: 4),
            _Delta(percent: change, upIsGood: upIsGood),
          ],
          if (meter != null) ...[
            const SizedBox(height: 8),
            Meter(value: meter!, critical: meterCritical, height: 6),
          ],
        ],
      ),
    );
  }
}

/// Signed, arrow-prefixed and labelled with its comparison period, so the
/// direction never depends on colour alone.
class _Delta extends StatelessWidget {
  const _Delta({required this.percent, required this.upIsGood});

  final double percent;
  final bool upIsGood;

  @override
  Widget build(BuildContext context) {
    final up = percent > 0;
    final good = up == upIsGood;
    final color = good ? AppColors.mint : AppColors.coral;

    return Row(
      children: [
        Icon(
          up ? Icons.arrow_upward : Icons.arrow_downward,
          size: 11,
          color: color,
        ),
        const SizedBox(width: 2),
        Flexible(
          child: Text(
            '${percent.abs().toStringAsFixed(1)}% vs yesterday',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTextStyles.body(9.5, color: color),
          ),
        ),
      ],
    );
  }
}

class _AlertBell extends StatelessWidget {
  const _AlertBell({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: count > 0 ? '$count items need attention' : 'Alerts',
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

class _AlertRow extends StatelessWidget {
  const _AlertRow({required this.notice});

  final AppNotification notice;

  @override
  Widget build(BuildContext context) {
    final style = noticeStyle(notice.kind);

    return ShadowedCard(
      radius: AppRadius.row,
      shadow: AppShadows.row,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          IconChip(
            icon: style.icon,
            background: style.background,
            foreground: style.foreground,
            size: 34,
            iconSize: 15,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notice.title,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  notice.body,
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartPlaceholder extends StatelessWidget {
  const _ChartPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 180,
      child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
    );
  }
}
