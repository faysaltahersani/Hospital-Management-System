import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/tab_shell.dart';
import '../../data/models/models.dart';
import 'patient_shell.dart';

class BookingSuccessScreen extends StatelessWidget {
  const BookingSuccessScreen({super.key, required this.appointment});

  final Appointment appointment;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: AppColors.mintSoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline,
                  size: 30,
                  color: AppColors.mint,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Appointment confirmed',
                style: AppTextStyles.display(17),
              ),
              const SizedBox(height: 10),
              Text(
                '${appointment.doctorName} · ${appointment.department}\n'
                '${appointment.date} · ${appointment.time}',
                textAlign: TextAlign.center,
                style: AppTextStyles.body(
                  12.5,
                  color: AppColors.slate,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                appointment.code,
                style: AppTextStyles.label(11, color: AppColors.mint),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: 170,
                child: PrimaryButton(
                  label: 'Back to home',
                  onPressed: () =>
                      TabShellScope.of(context).goToTab(PatientTabs.home),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
