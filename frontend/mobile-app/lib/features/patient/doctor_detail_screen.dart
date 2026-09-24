import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'booking_success_screen.dart';

class DoctorDetailScreen extends StatefulWidget {
  const DoctorDetailScreen({super.key, required this.doctor});

  final Doctor doctor;

  @override
  State<DoctorDetailScreen> createState() => _DoctorDetailScreenState();
}

class _DoctorDetailScreenState extends State<DoctorDetailScreen> {
  late final Future<List<TimeSlot>> _slots =
      context.read<AppSession>().patients.slots(widget.doctor.id);

  String? _selected;
  bool _booking = false;

  Future<void> _confirm() async {
    final slot = _selected;
    if (slot == null || _booking) return;

    setState(() => _booking = true);
    try {
      final appointment = await context
          .read<AppSession>()
          .patients
          .book(doctor: widget.doctor, slot: slot);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => BookingSuccessScreen(appointment: appointment),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _booking = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not book: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: widget.doctor.name,
            subtitle: widget.doctor.department,
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
              children: [
                ShadowedCard(
                  child: Text(
                    widget.doctor.note,
                    style: AppTextStyles.body(12, color: AppColors.slate),
                  ),
                ),
                const SizedBox(height: 22),
                const SectionLabel('Available today'),
                const SizedBox(height: 12),
                FutureBuilder<List<TimeSlot>>(
                  future: _slots,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      );
                    }

                    final slots = snapshot.data ?? const <TimeSlot>[];
                    if (slots.isEmpty) {
                      return const EmptyState(
                        'No slots left today. Try another day.',
                      );
                    }

                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        mainAxisExtent: 42,
                      ),
                      itemCount: slots.length,
                      itemBuilder: (context, index) {
                        final slot = slots[index];
                        return _SlotChip(
                          label: slot.label,
                          selected: _selected == slot.label,
                          enabled: slot.available,
                          onTap: () =>
                              setState(() => _selected = slot.label),
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: 26),
                PrimaryButton(
                  label: _booking
                      ? 'Confirming…'
                      : _selected == null
                          ? 'Select a time slot'
                          : 'Confirm $_selected',
                  onPressed: _selected == null || _booking ? null : _confirm,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SlotChip extends StatelessWidget {
  const _SlotChip({
    required this.label,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final background = selected
        ? AppColors.mint
        : enabled
            ? AppColors.card
            : AppColors.line;
    final foreground = selected
        ? Colors.white
        : enabled
            ? AppColors.ink
            : AppColors.slateLight;

    return Semantics(
      selected: selected,
      button: true,
      enabled: enabled,
      child: GestureDetector(
        onTap: enabled ? onTap : null,
        behavior: HitTestBehavior.opaque,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: AppRadius.row,
            boxShadow: selected || !enabled ? null : AppShadows.row,
          ),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: background,
              borderRadius: AppRadius.row,
            ),
            child: Text(
              label,
              style: AppTextStyles.body(
                11.5,
                color: foreground,
                weight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
