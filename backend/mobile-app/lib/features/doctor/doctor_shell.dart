import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/tab_shell.dart';
import 'doctor_ot_screen.dart';
import 'doctor_patients_screen.dart';
import 'doctor_profile_screen.dart';
import 'doctor_rx_screen.dart';
import 'doctor_schedule_screen.dart';

class DoctorTabs {
  DoctorTabs._();

  static const schedule = 'schedule';
  static const patients = 'patients';
  static const rx = 'rx';
  static const ot = 'ot';
  static const profile = 'profile';
}

class DoctorShell extends StatelessWidget {
  const DoctorShell({super.key});

  static const _items = <NavItem>[
    NavItem(
      key: DoctorTabs.schedule,
      label: 'Schedule',
      icon: Icons.home_outlined,
    ),
    NavItem(
      key: DoctorTabs.patients,
      label: 'Patients',
      icon: Icons.people_outline,
    ),
    NavItem(key: DoctorTabs.rx, label: 'Rx', icon: Icons.assignment_outlined),
    NavItem(key: DoctorTabs.ot, label: 'OT', icon: Icons.content_cut),
    NavItem(
      key: DoctorTabs.profile,
      label: 'Profile',
      icon: Icons.person_outline,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return TabShell(
      items: _items,
      dark: true,
      backgroundColor: AppColors.navy,
      rootBuilder: (context, tabKey) {
        switch (tabKey) {
          case DoctorTabs.patients:
            return const DoctorPatientsScreen();
          case DoctorTabs.rx:
            return const DoctorRxScreen();
          case DoctorTabs.ot:
            return const DoctorOtScreen();
          case DoctorTabs.profile:
            return const DoctorProfileScreen();
          case DoctorTabs.schedule:
          default:
            return const DoctorScheduleScreen();
        }
      },
    );
  }
}
