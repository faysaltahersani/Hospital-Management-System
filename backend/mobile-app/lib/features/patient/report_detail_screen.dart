import 'package:flutter/material.dart';

import '../../core/print/report_pdf.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';

/// Reads a single record and prints it. Used by both the patient's Reports tab
/// and the admin's report browser.
class ReportDetailScreen extends StatelessWidget {
  const ReportDetailScreen({super.key, required this.report});

  final MedicalReport report;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: report.title,
            subtitle: [report.source, report.date]
                .where((p) => p.isNotEmpty)
                .join(' · '),
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              children: [
                ShadowedCard(
                  child: Row(
                    children: [
                      const IconChip(
                        icon: Icons.person_outline,
                        size: 38,
                        iconSize: 16,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              report.patientName.isEmpty
                                  ? 'Patient'
                                  : report.patientName,
                              style: AppTextStyles.body(
                                13,
                                weight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              report.patientUhid.isEmpty
                                  ? '—'
                                  : 'UHID ${report.patientUhid}',
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
                ),
                const SizedBox(height: 22),
                const SectionLabel('Findings'),
                const SizedBox(height: 12),
                ShadowedCard(
                  child: report.body.isEmpty
                      ? Text(
                          'No detail recorded for this document.',
                          style: AppTextStyles.body(
                            12,
                            color: AppColors.slateLight,
                          ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (var i = 0; i < report.body.length; i++) ...[
                              _Finding(text: report.body[i]),
                              if (i < report.body.length - 1)
                                const SizedBox(height: 10),
                            ],
                          ],
                        ),
                ),
                const SizedBox(height: 26),
                PrimaryButton(
                  label: 'Print / save as PDF',
                  icon: Icons.print_outlined,
                  onPressed: () => ReportPdf.printOne(report),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Finding extends StatelessWidget {
  const _Finding({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 5,
          height: 5,
          margin: const EdgeInsets.only(top: 7, right: 10),
          decoration: const BoxDecoration(
            color: AppColors.mint,
            shape: BoxShape.circle,
          ),
        ),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.body(12.5, height: 1.5),
          ),
        ),
      ],
    );
  }
}
