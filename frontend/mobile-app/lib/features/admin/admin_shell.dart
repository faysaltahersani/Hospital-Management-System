import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_bottom_nav.dart';
import '../../core/widgets/tab_shell.dart';
import 'admin_beds_screen.dart';
import 'admin_dashboard_screen.dart';
import 'admin_profile_screen.dart';
import 'admin_staff_screen.dart';
import 'admin_stock_screen.dart';

class AdminTabs {
  AdminTabs._();

  static const dashboard = 'dashboard';
  static const beds = 'beds';
  static const staff = 'staff';
  static const stock = 'stock';
  static const profile = 'profile';
}

class AdminShell extends StatelessWidget {
  const AdminShell({super.key});

  static const _items = <NavItem>[
    NavItem(
      key: AdminTabs.dashboard,
      label: 'Overview',
      icon: Icons.dashboard_outlined,
    ),
    NavItem(key: AdminTabs.beds, label: 'Beds', icon: Icons.bed_outlined),
    NavItem(key: AdminTabs.staff, label: 'Staff', icon: Icons.badge_outlined),
    NavItem(
      key: AdminTabs.stock,
      label: 'Stock',
      icon: Icons.inventory_2_outlined,
    ),
    NavItem(
      key: AdminTabs.profile,
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
          case AdminTabs.beds:
            return const AdminBedsScreen();
          case AdminTabs.staff:
            return const AdminStaffScreen();
          case AdminTabs.stock:
            return const AdminStockScreen();
          case AdminTabs.profile:
            return const AdminProfileScreen();
          case AdminTabs.dashboard:
          default:
            return const AdminDashboardScreen();
        }
      },
    );
  }
}
