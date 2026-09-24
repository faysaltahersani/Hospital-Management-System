import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import 'prescription_form_screen.dart';

class DoctorPatientDetailScreen extends StatelessWidget {
  const DoctorPatientDetailScreen({super.key, required this.patient});

  final PatientRecord patient;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 100),
        children: [
          ScreenHeader(
            title: patient.name,
            subtitle: '${patient.uhid} · ${patient.note}',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          ContentSheet(
            minHeight: 460,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SectionLabel('Vitals · today'),
                const SizedBox(height: 12),
                ShadowedCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          patient.vitals,
                          style: AppTextStyles.body(12.5, height: 1.5),
                        ),
                      ),
                      if (patient.vitalsFlagged) ...[
                        const SizedBox(width: 12),
                        const Icon(
                          Icons.warning_amber_rounded,
                          size: 18,
                          color: AppColors.coral,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                const SectionLabel('History'),
                const SizedBox(height: 12),
                ShadowedCard(
                  child: patient.history.isEmpty
                      ? Text(
                          'No recorded history yet.',
                          style: AppTextStyles.body(
                            12,
                            color: AppColors.slateLight,
                          ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (var i = 0;
                                i < patient.history.length;
                                i++) ...[
                              Text(
                                patient.history[i],
                                style: AppTextStyles.body(
                                  12,
                                  color: AppColors.slate,
                                  height: 1.5,
                                ),
                              ),
                              if (i < patient.history.length - 1)
                                const SizedBox(height: 8),
                            ],
                          ],
                        ),
                ),
                const SizedBox(height: 26),
                PrimaryButton(
                  label: 'Write prescription',
                  icon: Icons.add,
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => PrescriptionFormScreen(patient: patient),
                    ),
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
