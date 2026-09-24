import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

enum TagTone { mint, coral, amber }

/// The small uppercase pill used for statuses ("Upcoming", "Due", "Paid").
class AppTag extends StatelessWidget {
  const AppTag(this.label, {super.key, this.tone = TagTone.mint});

  final String label;
  final TagTone tone;

  static (Color background, Color foreground) _palette(TagTone tone) {
    switch (tone) {
      case TagTone.mint:
        return (AppColors.mintSoft, AppColors.mint);
      case TagTone.coral:
        return (AppColors.coralSoft, AppColors.coral);
      case TagTone.amber:
        return (AppColors.amberSoft, AppColors.amber);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = _palette(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: AppRadius.pill,
      ),
      child: Text(
        label.toUpperCase(),
        style: AppTextStyles.label(10, color: foreground, letterSpacing: 0.8),
      ),
    );
  }
}
