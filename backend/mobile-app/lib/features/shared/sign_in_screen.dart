import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

/// Entry point of the app. Replaces the prototype's "Patient App / Doctor App"
/// toggle with a real sign-in that keeps the same role picker.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController(text: AppConfig.demoPatientEmail);
  final _password = TextEditingController(text: AppConfig.demoPassword);

  UserRole _role = AppConfig.enabledRoles.first;
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  static const _demoEmails = <UserRole, String>{
    UserRole.patient: AppConfig.demoPatientEmail,
    UserRole.doctor: AppConfig.demoDoctorEmail,
    UserRole.admin: AppConfig.demoAdminEmail,
  };

  void _selectRole(UserRole role) {
    if (role == _role) return;
    setState(() {
      _role = role;
      // Keep the demo credentials in step with the picker, but never clobber
      // an address the user typed themselves.
      final current = _email.text.trim();
      if (current.isEmpty || _demoEmails.containsValue(current)) {
        _email.text = _demoEmails[role]!;
      }
    });
  }

  Future<void> _submit() async {
    final session = context.read<AppSession>();
    if (session.busy) return;

    FocusScope.of(context).unfocus();
    await session.signIn(
      email: _email.text.trim(),
      password: _password.text,
      role: _role,
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Hero(topInset: MediaQuery.paddingOf(context).top),
            Transform.translate(
              offset: const Offset(0, -28),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: ShadowedCard(
                  padding: const EdgeInsets.all(20),
                  shadow: AppShadows.raised,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _RolePicker(role: _role, onChanged: _selectRole),
                      const SizedBox(height: 22),
                      UnderlineField(
                        controller: _email,
                        label: 'Email',
                        hint: 'you@example.com',
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                      ),
                      const SizedBox(height: 18),
                      UnderlineField(
                        controller: _password,
                        label: 'Password',
                        hint: 'Your password',
                        obscure: _obscure,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _submit(),
                        suffix: IconButton(
                          onPressed: () =>
                              setState(() => _obscure = !_obscure),
                          icon: Icon(
                            _obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            size: 16,
                            color: AppColors.slateLight,
                          ),
                          tooltip: _obscure ? 'Show password' : 'Hide password',
                        ),
                      ),
                      if (session.error != null) ...[
                        const SizedBox(height: 16),
                        _ErrorNote(message: session.error!),
                      ],
                      const SizedBox(height: 24),
                      PrimaryButton(
                        label: session.busy
                            ? 'Signing in…'
                            : 'Continue as ${_role.label}',
                        onPressed: session.busy ? null : _submit,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(36, 0, 36, 32),
              child: Text(
                AppConfig.isMock
                    ? 'Demo mode — any credentials work. Data is seeded '
                        'locally, so no backend is needed.'
                    : 'Connected to ${AppConfig.apiBaseUrl}',
                textAlign: TextAlign.center,
                style: AppTextStyles.body(
                  10.5,
                  color: AppColors.slateLight,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.topInset});

  final double topInset;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(28, topInset + 56, 28, 56),
      decoration: const BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'E-MEDICAL · MOBILE',
            style: AppTextStyles.label(
              11,
              color: AppColors.mint,
              letterSpacing: 2.2,
              weight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Health, carried\nin your pocket',
            style: AppTextStyles.display(
              28,
              color: Colors.white,
              height: 1.22,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Appointments, reports and bills — one app for patients and '
            'doctors.',
            style: AppTextStyles.body(
              12.5,
              color: AppColors.onNavyMuted,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _RolePicker extends StatelessWidget {
  const _RolePicker({required this.role, required this.onChanged});

  final UserRole role;
  final ValueChanged<UserRole> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: AppRadius.pill,
      ),
      child: Row(
        children: [
          for (final option in AppConfig.enabledRoles)
            Expanded(
              child: _RoleChip(
                label: option.label,
                selected: option == role,
                onTap: () => onChanged(option),
              ),
            ),
        ],
      ),
    );
  }
}

class _RoleChip extends StatelessWidget {
  const _RoleChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: selected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          height: 38,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? AppColors.navy : Colors.transparent,
            borderRadius: AppRadius.pill,
          ),
          child: Text(
            label,
            style: AppTextStyles.label(
              12,
              color: selected ? Colors.white : AppColors.slate,
              letterSpacing: 0.2,
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorNote extends StatelessWidget {
  const _ErrorNote({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.coralSoft,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 16,
            color: AppColors.coral,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.body(
                11.5,
                color: AppColors.ink,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
