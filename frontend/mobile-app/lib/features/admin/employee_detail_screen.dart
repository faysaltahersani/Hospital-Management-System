import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';

class EmployeeDetailScreen extends StatelessWidget {
  const EmployeeDetailScreen({super.key, required this.employee});

  final Employee employee;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 60),
        children: [
          ScreenHeader(
            title: employee.name,
            subtitle: [employee.role, employee.department]
                .where((p) => p.isNotEmpty)
                .join(' · '),
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          ContentSheet(
            minHeight: 420,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ShadowedCard(
                  child: Row(
                    children: [
                      const IconChip(
                        icon: Icons.badge_outlined,
                        size: 44,
                        iconSize: 18,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Employee ID',
                              style: AppTextStyles.body(
                                10.5,
                                color: AppColors.slateLight,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              employee.id.toUpperCase(),
                              style: AppTextStyles.label(
                                13,
                                color: AppColors.ink,
                                letterSpacing: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                      AppTag(
                        employee.onDuty ? 'On duty' : 'Off duty',
                        tone: employee.onDuty ? TagTone.mint : TagTone.amber,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const SectionLabel('Contact'),
                const SizedBox(height: 12),
                ShadowedCard(
                  onTap: () => AppToast.show(
                    context,
                    'Calling ${employee.name}…',
                  ),
                  child: Row(
                    children: [
                      const IconChip(
                        icon: Icons.phone_outlined,
                        size: 38,
                        iconSize: 16,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          employee.phone.isEmpty
                              ? 'No number on file'
                              : employee.phone,
                          style: AppTextStyles.body(
                            12.5,
                            weight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        size: 16,
                        color: AppColors.slateLight,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const SectionLabel('Posting'),
                const SizedBox(height: 12),
                ShadowedCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Detail(label: 'Designation', value: employee.role),
                      const SizedBox(height: 10),
                      _Detail(
                        label: 'Department',
                        value: employee.department.isEmpty
                            ? '—'
                            : employee.department,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
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
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 96,
          child: Text(
            label,
            style: AppTextStyles.body(11.5, color: AppColors.slateLight),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AppTextStyles.body(12.5, weight: FontWeight.w500),
          ),
        ),
      ],
    );
  }
}
