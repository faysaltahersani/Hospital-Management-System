import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/print/report_pdf.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/segmented_control.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'report_detail_screen.dart';

/// Records for the account holder and anyone they manage. Doubles as the
/// "My reports" screen when pushed from the profile tab — pass [onBack].
class PatientReportsScreen extends StatefulWidget {
  const PatientReportsScreen({super.key, this.onBack});

  final VoidCallback? onBack;

  @override
  State<PatientReportsScreen> createState() => _PatientReportsScreenState();
}

class _PatientReportsScreenState extends State<PatientReportsScreen> {
  late Future<List<CareProfile>> _profiles;
  Future<List<MedicalReport>>? _reports;

  List<CareProfile> _loaded = const [];
  int _selected = 0;

  @override
  void initState() {
    super.initState();
    _profiles = context.read<AppSession>().patients.careProfiles();
    _profiles.then((profiles) {
      if (!mounted || profiles.isEmpty) return;
      setState(() {
        _loaded = profiles;
        _reports = _fetch(profiles.first);
      });
    });
  }

  Future<List<MedicalReport>> _fetch(CareProfile profile) =>
      context.read<AppSession>().patients.reports(uhid: profile.uhid);

  void _selectProfile(int index) {
    if (index == _selected || index >= _loaded.length) return;
    setState(() {
      _selected = index;
      _reports = _fetch(_loaded[index]);
    });
  }

  Future<void> _refresh() async {
    if (_loaded.isEmpty) return;
    final future = _fetch(_loaded[_selected]);
    setState(() {
      _reports = future;
    });
    await future;
  }

  static ({IconData icon, Color background, Color foreground}) styleFor(
    ReportKind kind,
  ) {
    switch (kind) {
      case ReportKind.radiology:
        return (
          icon: Icons.document_scanner_outlined,
          background: AppColors.mintSoft,
          foreground: AppColors.mint,
        );
      case ReportKind.lab:
        return (
          icon: Icons.description_outlined,
          background: AppColors.amberSoft,
          foreground: AppColors.amber,
        );
      case ReportKind.prescription:
        return (
          icon: Icons.medication_outlined,
          background: AppColors.mintSoft,
          foreground: AppColors.mint,
        );
      case ReportKind.cardiology:
        return (
          icon: Icons.monitor_heart_outlined,
          background: AppColors.coralSoft,
          foreground: AppColors.coral,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = _loaded.isEmpty ? null : _loaded[_selected];

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ScreenHeader(
          title: widget.onBack == null ? 'Reports & records' : 'My reports',
          subtitle: profile == null
              ? 'Lab, radiology & prescriptions in one place'
              : '${profile.name} · ${profile.uhid}',
          onBack: widget.onBack,
        ),
        if (_loaded.length > 1)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
            child: SegmentedControl(
              segments: [for (final p in _loaded) p.shortLabel],
              selectedIndex: _selected,
              onChanged: _selectProfile,
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refresh,
            color: AppColors.mint,
            child: FutureBuilder<List<MedicalReport>>(
              future: _reports,
              builder: (context, snapshot) {
                if (_reports == null ||
                    snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  );
                }
                if (snapshot.hasError) {
                  return ListView(children: [EmptyState('${snapshot.error}')]);
                }

                final reports = snapshot.data ?? const <MedicalReport>[];
                if (reports.isEmpty) {
                  return ListView(
                    children: [
                      EmptyState(
                        'No records filed for '
                        '${profile?.name ?? 'this profile'} yet.',
                      ),
                    ],
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                  itemCount: reports.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) =>
                      ReportCard(report: reports[index]),
                );
              },
            ),
          ),
        ),
      ],
    );

    // Pushed from the profile tab, it needs its own surface; as a tab root the
    // shell already supplies one.
    return widget.onBack == null
        ? body
        : Scaffold(backgroundColor: AppColors.bg, body: body);
  }
}

/// A record row — tap to read it, or send it straight to the printer.
class ReportCard extends StatelessWidget {
  const ReportCard({super.key, required this.report, this.showPatient = false});

  final MedicalReport report;

  /// The admin list shows whose record it is; the patient's own list does not.
  final bool showPatient;

  @override
  Widget build(BuildContext context) {
    final style = _PatientReportsScreenState.styleFor(report.kind);

    return ShadowedCard(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ReportDetailScreen(report: report),
        ),
      ),
      child: Row(
        children: [
          IconChip(
            icon: style.icon,
            background: style.background,
            foreground: style.foreground,
            size: 44,
            iconSize: 18,
            rounded: true,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.title,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (showPatient) report.patientName,
                    report.source,
                    report.date,
                  ].where((p) => p.isNotEmpty).join(' · '),
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () async {
              AppToast.show(context, 'Preparing ${report.title}…');
              await ReportPdf.printOne(report);
            },
            icon: const Icon(Icons.print_outlined),
            iconSize: 18,
            color: AppColors.slateLight,
            tooltip: 'Print or save as PDF',
          ),
        ],
      ),
    );
  }
}
