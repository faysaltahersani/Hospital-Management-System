import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Title + optional subtitle + optional back button.
///
/// [dark] switches the palette for the doctor app's navy surfaces.
class ScreenHeader extends StatelessWidget {
  const ScreenHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.onBack,
    this.dark = false,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final VoidCallback? onBack;
  final bool dark;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final ink = dark ? Colors.white : AppColors.ink;
    final sub = dark ? AppColors.onNavyMuted : AppColors.slate;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.paddingOf(context).top + 18,
        24,
        16,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (onBack != null) ...[
            _BackButton(onTap: onBack!, dark: dark),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTextStyles.display(19, color: ink)),
                if (subtitle != null) ...[
                  const SizedBox(height: 4),
                  Text(subtitle!, style: AppTextStyles.body(12, color: sub)),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap, required this.dark});

  final VoidCallback onTap;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Back',
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: Container(
          margin: const EdgeInsets.only(top: 2),
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: dark ? AppColors.navyChip : AppColors.card,
            shape: BoxShape.circle,
            boxShadow: dark ? null : AppShadows.row,
          ),
          child: Icon(
            Icons.arrow_back,
            size: 16,
            color: dark ? Colors.white : AppColors.ink,
          ),
        ),
      ),
    );
  }
}

/// The uppercase, letter-spaced section label ("Recent activity", "Vitals").
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.dark = false});

  final String text;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: AppTextStyles.label(
        12,
        color: dark ? AppColors.onNavyMuted : AppColors.slateLight,
        letterSpacing: 0.9,
      ),
    );
  }
}
