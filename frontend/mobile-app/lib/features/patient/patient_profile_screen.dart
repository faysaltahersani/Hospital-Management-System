import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../data/session.dart';
import '../shared/help_support_screen.dart';
import '../shared/notification_settings_screen.dart';
import '../shared/profile_widgets.dart';
import 'booking_history_screen.dart';
import 'family_members_screen.dart';
import 'language_screen.dart';
import 'patient_reports_screen.dart';
import 'uhid_card_screen.dart';

class PatientProfileScreen extends StatelessWidget {
  const PatientProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final user = session.user;

    final rows = <({IconData icon, String label, WidgetBuilder builder})>[
      (
        icon: Icons.event_note_outlined,
        label: 'My booking history',
        builder: (_) => const BookingHistoryScreen(),
      ),
      (
        icon: Icons.folder_outlined,
        label: 'My reports',
        builder: (context) => PatientReportsScreen(
          onBack: () => Navigator.of(context).pop(),
        ),
      ),
      (
        icon: Icons.people_outline,
        label: 'Family members',
        builder: (_) => const FamilyMembersScreen(),
      ),
      (
        icon: Icons.notifications_none,
        label: 'Notification settings',
        builder: (_) => NotificationSettingsScreen(
          load: session.patients.notificationPrefs,
          save: session.patients.saveNotificationPrefs,
        ),
      ),
      (
        icon: Icons.verified_outlined,
        label: 'UHID & ID card',
        builder: (_) => const UhidCardScreen(),
      ),
      (
        icon: Icons.language,
        label: 'Language',
        builder: (_) => const LanguageScreen(),
      ),
      (
        icon: Icons.help_outline,
        label: 'Help & support',
        builder: (_) => const HelpSupportScreen(),
      ),
    ];

    return ListView(
      padding: EdgeInsets.only(
        top: MediaQuery.paddingOf(context).top + 24,
        bottom: 100,
      ),
      children: [
        Column(
          children: [
            Container(
              width: 66,
              height: 66,
              decoration: const BoxDecoration(
                color: AppColors.mintSoft,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.person_outline,
                size: 26,
                color: AppColors.mint,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              user?.name ?? 'Patient',
              style: AppTextStyles.display(16),
            ),
            const SizedBox(height: 3),
            Text(
              'UHID: ${user?.identifier ?? '—'}',
              style: AppTextStyles.body(11, color: AppColors.slateLight),
            ),
          ],
        ),
        const SizedBox(height: 28),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
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
