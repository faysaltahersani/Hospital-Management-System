import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'doctor_schedule_screen.dart' show QueueCard;

class DoctorPatientsScreen extends StatefulWidget {
  const DoctorPatientsScreen({super.key});

  @override
  State<DoctorPatientsScreen> createState() => _DoctorPatientsScreenState();
}

class _DoctorPatientsScreenState extends State<DoctorPatientsScreen> {
  final _search = TextEditingController();

  late Future<List<PatientRecord>> _patients =
      context.read<AppSession>().doctors.patients();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    setState(() {
      _patients = context.read<AppSession>().doctors.patients(query: value);
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'Patients',
          subtitle: 'Search and open patient records',
          dark: true,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 22),
          child: SearchBox(
            controller: _search,
            hint: 'Search patient name…',
            onChanged: _onSearch,
            dark: true,
          ),
        ),
        ContentSheet(
          minHeight: 460,
          child: FutureBuilder<List<PatientRecord>>(
            future: _patients,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                );
              }
              if (snapshot.hasError) {
                return EmptyState('${snapshot.error}');
              }

              final patients = snapshot.data ?? const <PatientRecord>[];
              if (patients.isEmpty) {
                return const EmptyState('No patients found.');
              }

              return Column(
                children: [
                  for (var i = 0; i < patients.length; i++) ...[
                    QueueCard(patient: patients[i], showTime: false),
                    if (i < patients.length - 1) const SizedBox(height: 12),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}
