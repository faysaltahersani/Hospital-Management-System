import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/app_toggle.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/session.dart';

class AccountSecurityScreen extends StatefulWidget {
  const AccountSecurityScreen({super.key});

  @override
  State<AccountSecurityScreen> createState() => _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends State<AccountSecurityScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();

  bool _show = false;
  bool _twoFactor = true;
  bool _saving = false;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;

    if (_current.text.isEmpty || _next.text.isEmpty) {
      AppToast.show(context, 'Enter both password fields');
      return;
    }

    setState(() => _saving = true);
    try {
      await context.read<AppSession>().changePassword(
            currentPassword: _current.text,
            newPassword: _next.text,
          );
      if (!mounted) return;
      _current.clear();
      _next.clear();
      FocusScope.of(context).unfocus();
      AppToast.show(context, 'Password updated');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not update password: $error')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Account & security',
            subtitle: 'Update password and login protection',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.navyCard,
                    borderRadius: AppRadius.card,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Change password',
                        style: AppTextStyles.body(
                          11,
                          color: Colors.white,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 14),
                      UnderlineField(
                        controller: _current,
                        hint: 'Current password',
                        dark: true,
                        obscure: !_show,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 12),
                      UnderlineField(
                        controller: _next,
                        hint: 'New password',
                        dark: true,
                        obscure: !_show,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _save(),
                        suffix: IconButton(
                          onPressed: () => setState(() => _show = !_show),
                          icon: Icon(
                            _show
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            size: 15,
                            color: AppColors.onNavyMuted,
                          ),
                          tooltip: _show ? 'Hide password' : 'Show password',
                        ),
                      ),
                      const SizedBox(height: 20),
                      PrimaryButton(
                        label: _saving ? 'Updating…' : 'Update password',
                        dark: true,
                        onPressed: _saving ? null : _save,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                SettingsRow(
                  label: 'Two-factor authentication',
                  description: 'Extra OTP verification at login',
                  value: _twoFactor,
                  dark: true,
                  onChanged: (value) {
                    setState(() => _twoFactor = value);
                    AppToast.show(
                      context,
                      'Two-factor authentication '
                      '${value ? 'enabled' : 'disabled'}',
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
