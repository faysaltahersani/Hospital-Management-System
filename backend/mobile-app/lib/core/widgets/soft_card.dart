import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// White rounded card with the mockup's soft shadow. On [dark] surfaces it
/// becomes a translucent white fill instead, matching `rgba(255,255,255,0.06)`.
class SoftCard extends StatelessWidget {
  const SoftCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.radius,
    this.dark = false,
    this.color,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final BorderRadius? radius;
  final bool dark;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final borderRadius = radius ?? AppRadius.card;
    final background = color ?? (dark ? AppColors.navyCard : AppColors.card);

    // No elevation here — Material's own shadow is tighter and darker than the
    // mockup's. ShadowedCard wraps this with the wide, soft AppShadows instead.
    return Material(
      color: background,
      borderRadius: borderRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: borderRadius,
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}

/// [SoftCard] with the drop shadow attached. Split out because Material's own
/// elevation renders a tighter, darker shadow than the mockup's CSS.
class ShadowedCard extends StatelessWidget {
  const ShadowedCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.radius,
    this.dark = false,
    this.color,
    this.shadow,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final BorderRadius? radius;
  final bool dark;
  final Color? color;
  final List<BoxShadow>? shadow;

  @override
  Widget build(BuildContext context) {
    final borderRadius = radius ?? AppRadius.card;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: dark ? null : (shadow ?? AppShadows.card),
      ),
      child: SoftCard(
        onTap: onTap,
        padding: padding,
        radius: borderRadius,
        dark: dark,
        color: color,
        child: child,
      ),
    );
  }
}

/// The circular tinted icon badge that fronts most list rows.
class IconChip extends StatelessWidget {
  const IconChip({
    super.key,
    required this.icon,
    this.background = AppColors.mintSoft,
    this.foreground = AppColors.mint,
    this.size = 40,
    this.iconSize = 17,
    this.rounded = false,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
  final double size;
  final double iconSize;

  /// Squircle instead of a circle — used by the reports list.
  final bool rounded;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: background,
        shape: rounded ? BoxShape.rectangle : BoxShape.circle,
        borderRadius: rounded ? BorderRadius.circular(12) : null,
      ),
      child: Icon(icon, size: iconSize, color: foreground),
    );
  }
}

/// Full-width mint action button, with the mockup's disabled treatment.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.dark = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final background = enabled
        ? AppColors.mint
        : (dark ? AppColors.navyHairline : AppColors.line);
    final foreground = enabled
        ? Colors.white
        : (dark ? AppColors.onNavyMuted : AppColors.slateLight);

    return Material(
      color: background,
      borderRadius: AppRadius.button,
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.button,
        child: Container(
          height: 46,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: foreground),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: AppTextStyles.body(
                  13,
                  color: foreground,
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

/// Secondary, tinted action ("Add member", "Mark as completed").
class SoftButton extends StatelessWidget {
  const SoftButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.mintSoft,
      borderRadius: AppRadius.row,
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.row,
        child: Container(
          height: 38,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: AppColors.mint),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: AppTextStyles.body(
                  12,
                  color: AppColors.mint,
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

/// Centred placeholder for empty search results and empty lists.
class EmptyState extends StatelessWidget {
  const EmptyState(this.message, {super.key, this.dark = false});

  final String message;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 28),
      child: Center(
        child: Text(
          message,
          textAlign: TextAlign.center,
          style: AppTextStyles.body(
            12,
            color: dark ? AppColors.onNavyMuted : AppColors.slateLight,
          ),
        ),
      ),
    );
  }
}

/// The light content sheet that lifts over the doctor app's navy background
/// (`rounded-t-[2rem]` in the mockup).
class ContentSheet extends StatelessWidget {
  const ContentSheet({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(20, 24, 20, 40),
    this.minHeight = 380,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double minHeight;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(minHeight: minHeight),
      decoration: const BoxDecoration(
        color: AppColors.bg,
        borderRadius: AppRadius.topSheet,
      ),
      padding: padding,
      child: child,
    );
  }
}
