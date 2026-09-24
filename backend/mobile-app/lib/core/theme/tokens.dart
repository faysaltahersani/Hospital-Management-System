import 'package:flutter/material.dart';

/// Colour tokens ported 1:1 from the `TOKENS` map in the E-Medical mockup.
class AppColors {
  AppColors._();

  static const navy = Color(0xFF0E2A38);
  static const navySoft = Color(0xFF163B4D);
  static const mint = Color(0xFF1BA98C);
  static const mintSoft = Color(0xFFE4F5F1);
  static const coral = Color(0xFFFF6B57);
  static const coralSoft = Color(0xFFFFEAE6);
  static const amber = Color(0xFFE8A33D);
  static const amberSoft = Color(0xFFFBF0DD);
  static const bg = Color(0xFFF4F7F6);
  static const card = Color(0xFFFFFFFF);
  static const ink = Color(0xFF0E2A38);
  static const slate = Color(0xFF5E7480);
  static const slateLight = Color(0xFF96A8AF);
  static const line = Color(0xFFE4EAEA);

  /// Muted subtitle text on the doctor app's navy surfaces.
  static const onNavyMuted = Color(0xFF8FB0BC);

  /// Inactive bottom-nav items on navy.
  static const onNavyFaint = Color(0xFF6E8794);

  /// `rgba(255,255,255,0.06)` — card fill on navy.
  static const navyCard = Color(0x0FFFFFFF);

  /// `rgba(255,255,255,0.08)` — field / stat-tile fill on navy.
  static const navyField = Color(0x14FFFFFF);

  /// `rgba(255,255,255,0.10)` — icon chip fill on navy.
  static const navyChip = Color(0x1AFFFFFF);

  /// `rgba(255,255,255,0.12)` — bell button fill on the patient hero.
  static const navyChipStrong = Color(0x1FFFFFFF);

  /// `rgba(255,255,255,0.15)` — hairline / disabled fill on navy.
  static const navyHairline = Color(0x26FFFFFF);

  /// Scrim behind the notification / alert bottom sheets.
  static const scrim = Color(0x8C0E2A38);

  /// `rgba(255,255,255,0.92)` — frosted bottom nav, patient app.
  static const navFrostLight = Color(0xEBFFFFFF);

  /// `rgba(14,42,56,0.92)` — frosted bottom nav, doctor app.
  static const navFrostDark = Color(0xEB0E2A38);

  /// `rgba(255,107,87,0.16)` — the doctor app's alert button fill.
  static const coralChip = Color(0x29FF6B57);

  /// The hero gradient used on the patient header, UHID card and dues card.
  static const heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [navy, navySoft],
  );
}

/// Elevation tokens matching the mockup's `box-shadow` values.
class AppShadows {
  AppShadows._();

  /// `0 2px 10px rgba(14,42,56,0.05)` — standard card.
  static const card = <BoxShadow>[
    BoxShadow(color: Color(0x0D0E2A38), blurRadius: 10, offset: Offset(0, 2)),
  ];

  /// `0 2px 8px rgba(14,42,56,0.04)` — list rows and settings rows.
  static const row = <BoxShadow>[
    BoxShadow(color: Color(0x0A0E2A38), blurRadius: 8, offset: Offset(0, 2)),
  ];

  /// Raised card that overlaps the hero header.
  static const raised = <BoxShadow>[
    BoxShadow(color: Color(0x1A0E2A38), blurRadius: 20, offset: Offset(0, 6)),
  ];

  /// The floating toast pill.
  static const toast = <BoxShadow>[
    BoxShadow(color: Color(0x330E2A38), blurRadius: 16, offset: Offset(0, 4)),
  ];
}

/// Corner radii used across the app.
class AppRadius {
  AppRadius._();

  static const lg = Radius.circular(20);
  static const sheet = Radius.circular(28);

  static final card = BorderRadius.circular(16);
  static final row = BorderRadius.circular(12);
  static final button = BorderRadius.circular(12);
  static final pill = BorderRadius.circular(999);

  /// The `rounded-t-[2rem]` sheet that lifts the doctor app's light content
  /// area over the navy background.
  static const topSheet = BorderRadius.vertical(top: Radius.circular(28));
}
