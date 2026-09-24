import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/print/report_pdf.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/repositories/repositories.dart' show ReportSummary;
import '../../data/session.dart';
import '../patient/patient_reports_screen.dart' show ReportCard;

/// Index of every patient with records on file. Admin picks a patient, then
/// reads or prints their documents.
class AdminReportsScreen extends StatefulWidget {
  const AdminReportsScreen({super.key});

  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  final _search = TextEditingController();

  late final Future<List<ReportSummary>> _summaries =
      context.read<AppSession>().admins.reportSummaries();

  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Patient reports',
            subtitle: 'Browse and print any record on file',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
            child: SearchBox(
              controller: _search,
              hint: 'Search patient or UHID…',
              onChanged: (value) => setState(() => _query = value),
              dark: true,
            ),
          ),
          Expanded(
            child: FutureBuilder<List<ReportSummary>>(
              future: _summaries,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  );
                }

                final needle = _query.trim().toLowerCase();
                final summaries = snapshot.data!
                    .where((s) =>
                        needle.isEmpty ||
                        s.patientName.toLowerCase().contains(needle) ||
                        s.uhid.toLowerCase().contains(needle))
                    .toList();

                if (summaries.isEmpty) {
                  return const EmptyState(
                    'No patient records match your search.',
                    dark: true,
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  itemCount: summaries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _PatientFileRow(summary: summaries[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _PatientFileRow extends StatelessWidget {
  const _PatientFileRow({required this.summary});

  final ReportSummary summary;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.navyCard,
      borderRadius: AppRadius.row,
      child: InkWell(
        borderRadius: AppRadius.row,
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => PatientFileScreen(summary: summary),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              const IconChip(
                icon: Icons.folder_outlined,
                size: 38,
                iconSize: 16,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summary.patientName.isEmpty
                          ? 'Unnamed patient'
                          : summary.patientName,
                      style: AppTextStyles.body(
                        13,
                        color: Colors.white,
                        weight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${summary.uhid} · ${summary.reportCount} document'
                      '${summary.reportCount == 1 ? '' : 's'} · '
                      'latest ${summary.latestDate}',
                      style: AppTextStyles.body(
                        10.5,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right,
                size: 16,
                color: AppColors.onNavyMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One patient's documents, with print-all at the top.
class PatientFileScreen extends StatefulWidget {
  const PatientFileScreen({super.key, required this.summary});

  final ReportSummary summary;

  @override
  State<PatientFileScreen> createState() => _PatientFileScreenState();
}

class _PatientFileScreenState extends State<PatientFileScreen> {
  late final Future<List<MedicalReport>> _reports =
      context.read<AppSession>().admins.reportsFor(widget.summary.uhid);

  Future<void> _printAll() async {
    final reports = await _reports;
    if (!mounted || reports.isEmpty) return;

    AppToast.show(context, 'Preparing ${reports.length} documents…');
    await ReportPdf.printFile(
      patientName: widget.summary.patientName,
      uhid: widget.summary.uhid,
      reports: reports,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          ScreenHeader(
            title: widget.summary.patientName,
            subtitle: 'UHID ${widget.summary.uhid}',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          ContentSheet(
            minHeight: 480,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PrimaryButton(
                  label: 'Print full file',
                  icon: Icons.print_outlined,
                  onPressed: _printAll,
                ),
                const SizedBox(height: 24),
                const SectionLabel('Documents'),
                const SizedBox(height: 12),
                FutureBuilder<List<MedicalReport>>(
                  future: _reports,
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 40),
                        child: Center(
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      );
                    }

                    final reports = snapshot.data!;
                    if (reports.isEmpty) {
                      return const EmptyState('No documents on file.');
                    }

                    return Column(
                      children: [
                        for (var i = 0; i < reports.length; i++) ...[
                          ReportCard(report: reports[i]),
                          if (i < reports.length - 1)
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
      ),
    );
  }
}
