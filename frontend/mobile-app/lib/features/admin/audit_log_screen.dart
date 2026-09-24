import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});

  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  late final Future<List<AuditEntry>> _entries =
      context.read<AppSession>().admins.auditLog();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Audit log',
            subtitle: 'Who changed what, and when',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Expanded(
            child: FutureBuilder<List<AuditEntry>>(
              future: _entries,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  );
                }

                final entries = snapshot.data!;
                if (entries.isEmpty) {
                  return const EmptyState('Nothing recorded yet.', dark: true);
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  itemCount: entries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _AuditRow(entry: entries[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.entry});

  final AuditEntry entry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navyCard,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.action,
                  style: AppTextStyles.body(
                    12.5,
                    color: Colors.white,
                    weight: FontWeight.w600,
                  ),
                ),
                if (entry.target.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    entry.target,
                    style: AppTextStyles.body(
                      11,
                      color: AppColors.onNavyMuted,
                    ),
                  ),
                ],
                const SizedBox(height: 5),
                Text(
                  entry.actor,
                  style: AppTextStyles.body(10, color: AppColors.mint),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            entry.at,
            style: AppTextStyles.body(10, color: AppColors.onNavyMuted),
          ),
        ],
      ),
    );
  }
}
