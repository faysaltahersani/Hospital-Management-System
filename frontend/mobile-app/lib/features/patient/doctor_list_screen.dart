import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'doctor_detail_screen.dart';

class DoctorListScreen extends StatefulWidget {
  const DoctorListScreen({super.key});

  @override
  State<DoctorListScreen> createState() => _DoctorListScreenState();
}

class _DoctorListScreenState extends State<DoctorListScreen> {
  final _search = TextEditingController();

  late Future<List<String>> _departments;
  late Future<List<Doctor>> _doctors;

  String _query = '';
  String _department = 'All';

  @override
  void initState() {
    super.initState();
    final repo = context.read<AppSession>().patients;
    _departments = repo.departments();
    _doctors = repo.doctors();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _refresh() {
    setState(() {
      _doctors = context
          .read<AppSession>()
          .patients
          .doctors(query: _query, department: _department);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const ScreenHeader(
          title: 'Book appointment',
          subtitle: 'Find a doctor by department or name',
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: SearchBox(
            controller: _search,
            hint: 'Search doctor or department…',
            onChanged: (value) {
              _query = value;
              _refresh();
            },
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 32,
          child: FutureBuilder<List<String>>(
            future: _departments,
            builder: (context, snapshot) {
              final departments = snapshot.data ?? const ['All'];
              return ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: departments.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final name = departments[index];
                  return _FilterChip(
                    label: name,
                    selected: name == _department,
                    onTap: () {
                      _department = name;
                      _refresh();
                    },
                  );
                },
              );
            },
          ),
        ),
        const SizedBox(height: 14),
        Expanded(
          child: FutureBuilder<List<Doctor>>(
            future: _doctors,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                );
              }
              if (snapshot.hasError) {
                return EmptyState('${snapshot.error}');
              }

              final doctors = snapshot.data ?? const <Doctor>[];
              if (doctors.isEmpty) {
                return const EmptyState('No doctors match your search.');
              }

              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                itemCount: doctors.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) => _DoctorCard(
                  doctor: doctors[index],
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          DoctorDetailScreen(doctor: doctors[index]),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.mint : AppColors.card,
            borderRadius: AppRadius.pill,
            boxShadow: selected ? null : AppShadows.row,
          ),
          child: Text(
            label,
            style: AppTextStyles.body(
              11.5,
              color: selected ? Colors.white : AppColors.slate,
              weight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _DoctorCard extends StatelessWidget {
  const _DoctorCard({required this.doctor, required this.onTap});

  final Doctor doctor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: onTap,
      child: Row(
        children: [
          const IconChip(
            icon: Icons.medical_services_outlined,
            size: 44,
            iconSize: 18,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  doctor.name,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  doctor.department,
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
                const SizedBox(height: 2),
                Text(
                  doctor.note,
                  style: AppTextStyles.body(10, color: AppColors.mint),
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
