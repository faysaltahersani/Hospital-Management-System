import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';

/// A tappable row on any of the three profile tabs.
class ProfileRow extends StatelessWidget {
  const ProfileRow({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: onTap,
      radius: AppRadius.row,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      shadow: AppShadows.row,
      child: Row(
        children: [
          Icon(icon, size: 17, color: AppColors.mint),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: AppTextStyles.body(13))),
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

class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.coralSoft,
      borderRadius: AppRadius.row,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.row,
        child: Container(
          height: 50,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.logout, size: 16, color: AppColors.coral),
              const SizedBox(width: 8),
              Text(
                'Log out',
                style: AppTextStyles.body(
                  13,
                  color: AppColors.coral,
                  weight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
