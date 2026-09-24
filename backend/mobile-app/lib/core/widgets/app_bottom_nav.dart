import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

class NavItem {
  const NavItem({required this.key, required this.label, required this.icon});

  final String key;
  final String label;
  final IconData icon;
}

/// Frosted bottom navigation bar, mint for the active tab.
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.items,
    required this.activeKey,
    required this.onChanged,
    this.dark = false,
  });

  final List<NavItem> items;
  final String activeKey;
  final ValueChanged<String> onChanged;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: EdgeInsets.only(top: 8, bottom: 10 + bottomInset),
          decoration: BoxDecoration(
            color: dark ? AppColors.navFrostDark : AppColors.navFrostLight,
            border: Border(
              top: BorderSide(
                color: dark ? AppColors.navyChip : AppColors.line,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              for (final item in items)
                _NavButton(
                  item: item,
                  active: item.key == activeKey,
                  dark: dark,
                  onTap: () => onChanged(item.key),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.item,
    required this.active,
    required this.dark,
    required this.onTap,
  });

  final NavItem item;
  final bool active;
  final bool dark;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = active
        ? AppColors.mint
        : (dark ? AppColors.onNavyFaint : AppColors.slateLight);

    return Expanded(
      child: Semantics(
        selected: active,
        button: true,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(item.icon, size: 20, color: color),
                const SizedBox(height: 4),
                Text(
                  item.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.body(
                    9.5,
                    color: color,
                    weight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
