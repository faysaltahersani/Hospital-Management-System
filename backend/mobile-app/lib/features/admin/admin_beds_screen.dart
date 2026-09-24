import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'ward_detail_screen.dart';

class AdminBedsScreen extends StatefulWidget {
  const AdminBedsScreen({super.key});

  @override
  State<AdminBedsScreen> createState() => _AdminBedsScreenState();
}

class _AdminBedsScreenState extends State<AdminBedsScreen> {
  late Future<List<WardSummary>> _wards;
  late Future<List<Admission>> _admissions;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final repo = context.read<AppSession>().admins;
    _wards = repo.wards();
    _admissions = repo.admissions();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'Beds & wards',
          subtitle: 'Occupancy across the hospital',
          dark: true,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 22),
          child: FutureBuilder<List<WardSummary>>(
            future: _wards,
            builder: (context, snapshot) {
              final wards = snapshot.data ?? const <WardSummary>[];
              final total = wards.fold(0, (sum, w) => sum + w.totalBeds);
              final occupied =
                  wards.fold(0, (sum, w) => sum + w.occupiedBeds);
              return _OccupancyStrip(total: total, occupied: occupied);
            },
          ),
        ),
        ContentSheet(
          minHeight: 460,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionLabel('Wards'),
              const SizedBox(height: 12),
              FutureBuilder<List<WardSummary>>(
                future: _wards,
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }
                  final wards = snapshot.data!;
                  if (wards.isEmpty) {
                    return const EmptyState('No wards configured.');
                  }
                  return Column(
                    children: [
                      for (var i = 0; i < wards.length; i++) ...[
                        _WardCard(
                          ward: wards[i],
                          onTap: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) =>
                                    WardDetailScreen(ward: wards[i]),
                              ),
                            );
                            if (mounted) setState(_load);
                          },
                        ),
                        if (i < wards.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              const SectionLabel('Current admissions'),
              const SizedBox(height: 12),
              FutureBuilder<List<Admission>>(
                future: _admissions,
                builder: (context, snapshot) {
                  final admissions = snapshot.data ?? const <Admission>[];
                  if (admissions.isEmpty) {
                    return const EmptyState('No admissions recorded.');
                  }
                  return Column(
                    children: [
                      for (var i = 0; i < admissions.length; i++) ...[
                        _AdmissionRow(admission: admissions[i]),
                        if (i < admissions.length - 1)
                          const SizedBox(height: 12),
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

class _OccupancyStrip extends StatelessWidget {
  const _OccupancyStrip({required this.total, required this.occupied});

  final int total;
  final int occupied;

  @override
  Widget build(BuildContext context) {
    final available = total - occupied;
    final ratio = total == 0 ? 0.0 : occupied / total;
    final critical = ratio >= 0.85;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.navyField,
        borderRadius: AppRadius.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: _Figure(value: '$occupied', label: 'Occupied'),
              ),
              Expanded(
                child: _Figure(value: '$available', label: 'Available'),
              ),
              Expanded(child: _Figure(value: '$total', label: 'Total beds')),
            ],
          ),
          const SizedBox(height: 14),
          Meter(value: ratio, critical: critical, height: 8),
          const SizedBox(height: 8),
          Text(
            critical
                ? '${(ratio * 100).round()}% occupied · at capacity'
                : '${(ratio * 100).round()}% occupied',
            style: AppTextStyles.body(
              10.5,
              color: critical ? AppColors.coral : AppColors.onNavyMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: AppTextStyles.display(20, color: Colors.white)),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTextStyles.body(10, color: AppColors.onNavyMuted),
        ),
      ],
    );
  }
}

class _WardCard extends StatelessWidget {
  const _WardCard({required this.ward, required this.onTap});

  final WardSummary ward;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final critical = ward.occupancy >= 0.85;

    return ShadowedCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  ward.name,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
              ),
              Text(
                '${ward.occupiedBeds}/${ward.totalBeds}',
                style: AppTextStyles.body(12, weight: FontWeight.w600),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right,
                size: 16,
                color: AppColors.slateLight,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Meter(value: ward.occupancy, critical: critical),
          const SizedBox(height: 8),
          Text(
            '${(ward.occupancy * 100).round()}% occupied · '
            '${ward.availableBeds} free',
            style: AppTextStyles.body(
              10.5,
              color: critical ? AppColors.coral : AppColors.slate,
            ),
          ),
        ],
      ),
    );
  }
}

class _AdmissionRow extends StatelessWidget {
  const _AdmissionRow({required this.admission});

  final Admission admission;

  @override
  Widget build(BuildContext context) {
    final discharged = admission.status.toLowerCase() == 'discharged';

    return ShadowedCard(
      radius: AppRadius.row,
      shadow: AppShadows.row,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          const IconChip(
            icon: Icons.person_outline,
            size: 34,
            iconSize: 15,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  admission.patientName,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '${admission.ward} · Bed ${admission.bed} · '
                  '${admission.admittedOn}',
                  style: AppTextStyles.body(10.5, color: AppColors.slate),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          AppTag(
            admission.status,
            tone: discharged ? TagTone.mint : TagTone.amber,
          ),
        ],
      ),
    );
  }
}
