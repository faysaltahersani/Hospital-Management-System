import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/session.dart';
import '../shared/account_security_screen.dart';
import '../shared/help_support_screen.dart';
import '../shared/notification_settings_screen.dart';
import '../shared/profile_widgets.dart';
import 'leave_requests_screen.dart';
import 'working_hours_screen.dart';

class DoctorProfileScreen extends StatelessWidget {
  const DoctorProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final user = session.user;

    final rows = <({IconData icon, String label, WidgetBuilder builder})>[
      (
        icon: Icons.schedule,
        label: 'Working hours & availability',
        builder: (_) => const WorkingHoursScreen(),
      ),
      (
        icon: Icons.calendar_today_outlined,
        label: 'Leave requests',
        builder: (_) => const LeaveRequestsScreen(),
      ),
      (
        icon: Icons.notifications_none,
        label: 'Notification settings',
        builder: (_) => NotificationSettingsScreen(
          load: session.doctors.notificationPrefs,
          save: session.doctors.saveNotificationPrefs,
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
      if (user?.identifier.isNotEmpty == true) 'Reg. no. ${user!.identifier}',
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
                  Icons.medical_services_outlined,
                  size: 26,
                  color: AppColors.mint,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                user?.name ?? 'Doctor',
                style: AppTextStyles.display(16, color: Colors.white),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle.isEmpty ? 'Consultant' : subtitle,
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
