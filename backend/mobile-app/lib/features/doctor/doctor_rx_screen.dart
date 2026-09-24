import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'prescription_form_screen.dart';

class DoctorRxScreen extends StatefulWidget {
  const DoctorRxScreen({super.key});

  @override
  State<DoctorRxScreen> createState() => _DoctorRxScreenState();
}

class _DoctorRxScreenState extends State<DoctorRxScreen> {
  late Future<List<Prescription>> _prescriptions =
      context.read<AppSession>().doctors.prescriptions();

  void _reload() {
    setState(() {
      _prescriptions = context.read<AppSession>().doctors.prescriptions();
    });
  }

  Future<void> _newPrescription() async {
    final patients = await context.read<AppSession>().doctors.patients();
    if (!mounted || patients.isEmpty) return;

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PrescriptionFormScreen(patient: patients.first),
      ),
    );
    if (mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'Prescriptions',
          subtitle: 'Recent Rx history',
          dark: true,
        ),
        ContentSheet(
          minHeight: 460,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FutureBuilder<List<Prescription>>(
                future: _prescriptions,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }

                  final items = snapshot.data ?? const <Prescription>[];
                  if (items.isEmpty) {
                    return const EmptyState('No prescriptions written yet.');
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        _RxCard(prescription: items[i]),
                        if (i < items.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  );
                },
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'New prescription',
                icon: Icons.add,
                onPressed: _newPrescription,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RxCard extends StatelessWidget {
  const _RxCard({required this.prescription});

  final Prescription prescription;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: () => showDialog<void>(
        context: context,
        builder: (context) => _RxDetailDialog(prescription: prescription),
      ),
      child: Row(
        children: [
          const IconChip(icon: Icons.assignment_outlined, iconSize: 16),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prescription.patientName,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '${prescription.medicineCount} medicine(s) · '
                  '${prescription.date}',
                  style: AppTextStyles.body(11, color: AppColors.slate),
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

class _RxDetailDialog extends StatelessWidget {
  const _RxDetailDialog({required this.prescription});

  final Prescription prescription;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.card,
      shape: RoundedRectangleBorder(borderRadius: AppRadius.card),
      title: Text(prescription.patientName, style: AppTextStyles.display(16)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            prescription.date,
            style: AppTextStyles.body(11, color: AppColors.slateLight),
          ),
          const SizedBox(height: 14),
          for (final medicine in prescription.medicines) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(
                    Icons.medication_outlined,
                    size: 14,
                    color: AppColors.mint,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        medicine.name,
                        style: AppTextStyles.body(
                          12.5,
                          weight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        medicine.dosage,
                        style: AppTextStyles.body(
                          11,
                          color: AppColors.slate,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(foregroundColor: AppColors.mint),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
