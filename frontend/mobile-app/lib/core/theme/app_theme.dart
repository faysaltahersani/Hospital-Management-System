import 'package:flutter/material.dart';

import 'tokens.dart';

/// Font families from the mockup.
///
/// The app deliberately does **not** hard-require these assets. If the TTFs are
/// not bundled (see `pubspec.yaml`), Flutter silently falls back to the
/// `fontFamilyFallback` generic family, so layout and weight stay correct and
/// only the typeface changes. Drop the fonts in to get the exact mockup look.
class AppFonts {
  AppFonts._();

  static const display = 'Fraunces';
  static const label = 'Space Grotesk';
  static const body = 'Inter';

  static const displayFallback = <String>['serif'];
  static const sansFallback = <String>['sans-serif'];
}

/// Text styles keyed to the exact sizes used in the mockup.
class AppTextStyles {
  AppTextStyles._();

  /// Fraunces — screen titles, patient/doctor names, big numbers.
  static TextStyle display(
    double size, {
    Color color = AppColors.ink,
    FontWeight weight = FontWeight.w600,
    double? height,
  }) {
    return TextStyle(
      fontFamily: AppFonts.display,
      fontFamilyFallback: AppFonts.displayFallback,
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: height,
    );
  }

  /// Space Grotesk — uppercase section labels, ticket numbers, tags.
  static TextStyle label(
    double size, {
    Color color = AppColors.slateLight,
    FontWeight weight = FontWeight.w600,
    double letterSpacing = 0.6,
  }) {
    return TextStyle(
      fontFamily: AppFonts.label,
      fontFamilyFallback: AppFonts.sansFallback,
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }

  /// Inter — everything else.
  static TextStyle body(
    double size, {
    Color color = AppColors.ink,
    FontWeight weight = FontWeight.w400,
    double? height,
  }) {
    return TextStyle(
      fontFamily: AppFonts.body,
      fontFamilyFallback: AppFonts.sansFallback,
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: height,
    );
  }
}

class AppTheme {
  AppTheme._();

  /// The patient app — light, mint-on-off-white.
  static ThemeData get patient => _base(
        brightness: Brightness.light,
        scaffoldBackground: AppColors.bg,
        onSurface: AppColors.ink,
      );

  /// The doctor app — navy chrome with light content sheets.
  static ThemeData get doctor => _base(
        brightness: Brightness.light,
        scaffoldBackground: AppColors.navy,
        onSurface: AppColors.ink,
      );

  static ThemeData _base({
    required Brightness brightness,
    required Color scaffoldBackground,
    required Color onSurface,
  }) {
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.mint,
      brightness: brightness,
    ).copyWith(
      primary: AppColors.mint,
      onPrimary: Colors.white,
      surface: AppColors.card,
      onSurface: onSurface,
      error: AppColors.coral,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scaffoldBackground,
      fontFamily: AppFonts.body,
      fontFamilyFallback: AppFonts.sansFallback,
      splashFactory: InkRipple.splashFactory,
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: AppColors.mint,
        selectionHandleColor: AppColors.mint,
      ),
      // The mockup has no Material app bars — every screen draws its own header.
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.line,
        thickness: 1,
        space: 1,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.mint,
      ),
    );
  }
}
