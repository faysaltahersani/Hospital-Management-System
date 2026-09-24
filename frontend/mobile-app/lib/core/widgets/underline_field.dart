import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// The borderless, underlined input used by every form in the mockup.
class UnderlineField extends StatelessWidget {
  const UnderlineField({
    super.key,
    required this.controller,
    required this.hint,
    this.label,
    this.dark = false,
    this.obscure = false,
    this.suffix,
    this.keyboardType,
    this.textInputAction,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;
  final String? label;
  final bool dark;
  final bool obscure;
  final Widget? suffix;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final ink = dark ? Colors.white : AppColors.ink;
    final hintColor = dark ? AppColors.onNavyMuted : AppColors.slateLight;
    final lineColor = dark ? AppColors.navyHairline : AppColors.line;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!.toUpperCase(),
            style: AppTextStyles.label(10.5, color: hintColor),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: controller,
          obscureText: obscure,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          onSubmitted: onSubmitted,
          cursorColor: AppColors.mint,
          style: AppTextStyles.body(13, color: ink),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTextStyles.body(13, color: hintColor),
            isDense: true,
            contentPadding: const EdgeInsets.only(bottom: 8),
            suffixIcon: suffix,
            suffixIconConstraints: const BoxConstraints(minWidth: 28),
            enabledBorder: UnderlineInputBorder(
              borderSide: BorderSide(color: lineColor),
            ),
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.mint),
            ),
          ),
        ),
      ],
    );
  }
}

/// Rounded search box (patient app: white card; doctor app: translucent navy).
class SearchBox extends StatelessWidget {
  const SearchBox({
    super.key,
    required this.controller,
    required this.hint,
    required this.onChanged,
    this.dark = false,
  });

  final TextEditingController controller;
  final String hint;
  final ValueChanged<String> onChanged;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final hintColor = dark ? AppColors.onNavyMuted : AppColors.slateLight;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: AppRadius.card,
        boxShadow: dark ? null : AppShadows.card,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: dark ? AppColors.navyField : AppColors.card,
          borderRadius: AppRadius.card,
        ),
        child: Row(
          children: [
            Icon(Icons.search, size: 17, color: hintColor),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: controller,
                onChanged: onChanged,
                cursorColor: AppColors.mint,
                textInputAction: TextInputAction.search,
                style: AppTextStyles.body(
                  13,
                  color: dark ? Colors.white : AppColors.ink,
                ),
                decoration: InputDecoration(
                  hintText: hint,
                  hintStyle: AppTextStyles.body(13, color: hintColor),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
