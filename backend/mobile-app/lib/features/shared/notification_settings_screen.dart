import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/app_toggle.dart';
import '../../core/widgets/screen_header.dart';
import '../../data/models/models.dart';

/// Shared by both apps — the patient list is light, the doctor list is dark.
class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({
    super.key,
    required this.load,
    required this.save,
    this.dark = false,
  });

  final Future<List<NotificationPref>> Function() load;
  final Future<void> Function(List<NotificationPref>) save;
  final bool dark;

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends State<NotificationSettingsScreen> {
  List<NotificationPref>? _prefs;

  @override
  void initState() {
    super.initState();
    widget.load().then((prefs) {
      if (mounted) setState(() => _prefs = prefs);
    });
  }

  void _toggle(int index) {
    final prefs = _prefs;
    if (prefs == null) return;

    final updated = [...prefs];
    final next = !updated[index].enabled;
    updated[index] = updated[index].copyWith(enabled: next);

    setState(() => _prefs = updated);
    widget.save(updated);
    AppToast.show(
      context,
      '${updated[index].label} ${next ? 'enabled' : 'disabled'}',
    );
  }

  @override
  Widget build(BuildContext context) {
    final prefs = _prefs;

    return Scaffold(
      backgroundColor: widget.dark ? AppColors.navy : AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Notification settings',
            subtitle: 'Choose what you get notified about',
            onBack: () => Navigator.of(context).pop(),
            dark: widget.dark,
          ),
          Expanded(
            child: prefs == null
                ? const Center(child: CircularProgressIndicator())
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    itemCount: prefs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) => SettingsRow(
                      label: prefs[index].label,
                      description: prefs[index].description,
                      value: prefs[index].enabled,
                      onChanged: (_) => _toggle(index),
                      dark: widget.dark,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
