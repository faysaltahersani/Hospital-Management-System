import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/app_toggle.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class WorkingHoursScreen extends StatefulWidget {
  const WorkingHoursScreen({super.key});

  @override
  State<WorkingHoursScreen> createState() => _WorkingHoursScreenState();
}

class _WorkingHoursScreenState extends State<WorkingHoursScreen> {
  List<WorkingDay>? _days;

  @override
  void initState() {
    super.initState();
    context.read<AppSession>().doctors.workingHours().then((days) {
      if (mounted) setState(() => _days = days);
    });
  }

  void _toggle(int index) {
    final days = _days;
    if (days == null) return;

    final updated = [...days];
    updated[index] = updated[index].copyWith(enabled: !updated[index].enabled);
    setState(() => _days = updated);
  }

  Future<void> _save() async {
    final days = _days;
    if (days == null) return;

    await context.read<AppSession>().doctors.saveWorkingHours(days);
    if (!mounted) return;
    AppToast.show(context, 'Availability saved');
  }

  @override
  Widget build(BuildContext context) {
    final days = _days;

    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Working hours',
            subtitle: 'Set your weekly availability',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Expanded(
            child: days == null
                ? const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    children: [
                      for (var i = 0; i < days.length; i++) ...[
                        _DayRow(day: days[i], onToggle: () => _toggle(i)),
                        const SizedBox(height: 10),
                      ],
                      const SizedBox(height: 14),
                      PrimaryButton(
                        label: 'Save changes',
                        dark: true,
                        onPressed: _save,
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.day, required this.onToggle});

  final WorkingDay day;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navyCard,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  day.day,
                  style: AppTextStyles.body(
                    12.5,
                    color: Colors.white,
                    weight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  day.enabled ? day.hours : 'Unavailable',
                  style: AppTextStyles.body(
                    10.5,
                    color: day.enabled
                        ? AppColors.mint
                        : AppColors.onNavyMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          AppToggle(value: day.enabled, onChanged: (_) => onToggle()),
        ],
      ),
    );
  }
}
