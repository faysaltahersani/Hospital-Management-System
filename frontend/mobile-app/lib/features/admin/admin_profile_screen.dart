import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/mock/mock_data.dart';
import '../../data/session.dart';
import '../shared/account_security_screen.dart';
import '../shared/help_support_screen.dart';
import '../shared/notification_settings_screen.dart';
import '../shared/profile_widgets.dart';
import 'admin_reports_screen.dart';
import 'audit_log_screen.dart';
import 'hospital_settings_screen.dart';

class AdminProfileScreen extends StatelessWidget {
  const AdminProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final user = session.user;

    final rows = <({IconData icon, String label, WidgetBuilder builder})>[
      (
        icon: Icons.folder_outlined,
        label: 'Patient reports & printing',
        builder: (_) => const AdminReportsScreen(),
      ),
      (
        icon: Icons.local_hospital_outlined,
        label: 'Hospital settings',
        builder: (_) => const HospitalSettingsScreen(),
      ),
      (
        icon: Icons.history,
        label: 'Audit log',
        builder: (_) => const AuditLogScreen(),
      ),
      (
        icon: Icons.notifications_none,
        label: 'Notification settings',
        builder: (_) => NotificationSettingsScreen(
          load: session.admins.notificationPrefs,
          save: session.admins.saveNotificationPrefs,
          dark: true,
        ),
      ),
      (
        icon: Icons.verified_user_outlined,
        label: 'Account & security',
        builder: (_) => const AccountSecurityScreen(),
      ),
      (
        icon: Icons.help_outline,
        label: 'Help & support',
        builder: (_) => const HelpSupportScreen(dark: true),
      ),
    ];

    final subtitle = [
      if (user?.subtitle.isNotEmpty == true) user!.subtitle,
      MockData.hospitalName,
    ].join(' · ');

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        Padding(
          padding: EdgeInsets.only(
            top: MediaQuery.paddingOf(context).top + 24,
            bottom: 28,
          ),
          child: Column(
            children: [
              Container(
                width: 66,
                height: 66,
                decoration: const BoxDecoration(
                  color: AppColors.navyChip,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.admin_panel_settings_outlined,
                  size: 26,
                  color: AppColors.mint,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                user?.name ?? 'Administrator',
                style: AppTextStyles.display(16, color: Colors.white),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: AppTextStyles.body(11, color: AppColors.onNavyMuted),
              ),
            ],
          ),
        ),
        ContentSheet(
          minHeight: 420,
          child: Column(
            children: [
              for (final row in rows) ...[
                ProfileRow(
                  icon: row.icon,
                  label: row.label,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: row.builder),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 2),
              LogoutButton(onTap: session.signOut),
            ],
          ),
        ),
      ],
    );
  }
}
