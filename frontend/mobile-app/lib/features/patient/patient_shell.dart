import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/tab_shell.dart';
import 'doctor_list_screen.dart';
import 'patient_home_screen.dart';
import 'patient_pay_screen.dart';
import 'patient_profile_screen.dart';
import 'patient_reports_screen.dart';

/// Tab keys, also used by [TabShellScope.goToTab] from the home screen.
class PatientTabs {
  PatientTabs._();

  static const home = 'home';
  static const book = 'book';
  static const reports = 'reports';
  static const pay = 'pay';
  static const profile = 'profile';
}

class PatientShell extends StatelessWidget {
  const PatientShell({super.key});

  static const _items = <NavItem>[
    NavItem(key: PatientTabs.home, label: 'Home', icon: Icons.home_outlined),
    NavItem(
      key: PatientTabs.book,
      label: 'Book',
      icon: Icons.calendar_today_outlined,
    ),
    NavItem(
      key: PatientTabs.reports,
      label: 'Reports',
      icon: Icons.description_outlined,
    ),
    NavItem(key: PatientTabs.pay, label: 'Pay', icon: Icons.credit_card),
    NavItem(
      key: PatientTabs.profile,
      label: 'Profile',
      icon: Icons.person_outline,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return TabShell(
      items: _items,
      backgroundColor: AppColors.bg,
      rootBuilder: (context, tabKey) {
        switch (tabKey) {
          case PatientTabs.book:
            return const DoctorListScreen();
          case PatientTabs.reports:
            return const PatientReportsScreen();
          case PatientTabs.pay:
            return const PatientPayScreen();
          case PatientTabs.profile:
            return const PatientProfileScreen();
          case PatientTabs.home:
          default:
            return const PatientHomeScreen();
        }
      },
    );
  }
}
