import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/mock/mock_data.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class PrescriptionFormScreen extends StatefulWidget {
  const PrescriptionFormScreen({super.key, required this.patient});

  final PatientRecord patient;

  @override
  State<PrescriptionFormScreen> createState() =>
      _PrescriptionFormScreenState();
}

class _PrescriptionFormScreenState extends State<PrescriptionFormScreen> {
  final _name = TextEditingController();
  final _dosage = TextEditingController();

  final List<Medicine> _medicines = [MockData.draftMedicine];
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _dosage.dispose();
    super.dispose();
  }

  void _addMedicine() {
    final name = _name.text.trim();
    if (name.isEmpty) return;

    setState(() {
      _medicines.add(
        Medicine(
          name: name,
          dosage: _dosage.text.trim().isEmpty
              ? 'As directed'
              : _dosage.text.trim(),
        ),
      );
    });

    _name.clear();
    _dosage.clear();
    FocusScope.of(context).unfocus();
  }

  Future<void> _save() async {
    if (_saving || _medicines.isEmpty) return;
    setState(() => _saving = true);

    try {
      await context.read<AppSession>().doctors.savePrescription(
            patient: widget.patient,
            medicines: _medicines,
          );
      if (!mounted) return;
      // Toast first: it lives in the root overlay and outlives this route,
      // but reading the overlay from a popped context would throw.
      AppToast.show(context, 'Prescription saved & sent to patient');
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save prescription: $error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Write prescription',
            subtitle: widget.patient.name,
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
              children: [
                if (_medicines.isEmpty)
                  const EmptyState(
                    'No medicines added yet.',
                    dark: true,
                  ),
                for (var i = 0; i < _medicines.length; i++) ...[
                  _MedicineRow(
                    medicine: _medicines[i],
                    onRemove: () => setState(() => _medicines.removeAt(i)),
                  ),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 8),
                SoftCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Add medicine',
                        style: AppTextStyles.body(
                          11,
                          color: AppColors.slateLight,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      UnderlineField(
                        controller: _name,
                        hint: 'Medicine name',
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 12),
                      UnderlineField(
                        controller: _dosage,
                        hint: 'Dosage (e.g. 1-0-1, after meal)',
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _addMedicine(),
                      ),
                      const SizedBox(height: 18),
                      SoftButton(
                        label: 'Add to prescription',
                        icon: Icons.add,
                        onPressed: _addMedicine,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                PrimaryButton(
                  label:
                      _saving ? 'Saving…' : 'Save & send prescription',
                  dark: true,
                  onPressed: _saving || _medicines.isEmpty ? null : _save,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MedicineRow extends StatelessWidget {
  const _MedicineRow({required this.medicine, required this.onRemove});

  final Medicine medicine;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return SoftCard(
      radius: AppRadius.row,
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          const Icon(
            Icons.medication_outlined,
            size: 16,
            color: AppColors.mint,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  medicine.name,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  medicine.dosage,
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.delete_outline),
            iconSize: 16,
            color: AppColors.coral,
            tooltip: 'Remove ${medicine.name}',
          ),
        ],
      ),
    );
  }
}
