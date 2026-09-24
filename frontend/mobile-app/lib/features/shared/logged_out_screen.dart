import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';

class LoggedOutScreen extends StatelessWidget {
  const LoggedOutScreen({
    super.key,
    required this.onLoginAgain,
    this.dark = false,
  });

  final VoidCallback onLoginAgain;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: dark ? AppColors.navy : AppColors.bg,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: dark ? AppColors.navyField : AppColors.mintSoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.logout,
                  size: 26,
                  color: AppColors.mint,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                "You're logged out",
                style: AppTextStyles.display(
                  17,
                  color: dark ? Colors.white : AppColors.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Come back soon to manage your care.',
                textAlign: TextAlign.center,
                style: AppTextStyles.body(
                  12.5,
                  color: dark ? AppColors.onNavyMuted : AppColors.slate,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: 160,
                child: PrimaryButton(
                  label: 'Log in again',
                  onPressed: onLoginAgain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
