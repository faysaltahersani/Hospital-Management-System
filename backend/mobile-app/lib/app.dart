import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'data/models/models.dart';
import 'data/session.dart';
import 'features/admin/admin_shell.dart';
import 'features/doctor/doctor_shell.dart';
import 'features/patient/patient_shell.dart';
import 'features/shared/logged_out_screen.dart';
import 'features/shared/sign_in_screen.dart';

class EMedicalApp extends StatelessWidget {
  const EMedicalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppSession(),
      child: MaterialApp(
        title: 'E-Medical',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.patient,
        home: const _RootRouter(),
      ),
    );
  }
}

/// Chooses the shell for the current session state and keeps the system status
/// bar legible against whichever background is showing.
class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    final Widget child;
    final bool darkBackground;

    if (session.showLoggedOutScreen) {
      // Staff apps keep their navy treatment on the way out.
      darkBackground = session.lastRole.isStaff;
      child = LoggedOutScreen(
        dark: darkBackground,
        onLoginAgain: session.returnToSignIn,
      );
    } else if (!session.isSignedIn) {
      darkBackground = false;
      child = const SignInScreen();
    } else {
      switch (session.role) {
        case UserRole.doctor:
          darkBackground = true;
          child = const DoctorShell();
        case UserRole.admin:
          darkBackground = true;
          child = const AdminShell();
        case UserRole.patient:
          darkBackground = false;
          child = const PatientShell();
      }
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: darkBackground
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark,
      child: Theme(
        data: darkBackground ? AppTheme.doctor : AppTheme.patient,
        child: child,
      ),
    );
  }
}
