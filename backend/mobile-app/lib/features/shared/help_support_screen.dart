import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/mock/mock_data.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key, this.dark = false});

  final bool dark;

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  int? _openFaq;

  @override
  Widget build(BuildContext context) {
    final dark = widget.dark;

    return Scaffold(
      backgroundColor: dark ? AppColors.navy : AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Help & support',
            subtitle: 'We usually reply within 2 hours',
            onBack: () => Navigator.of(context).pop(),
            dark: dark,
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _ContactTile(
                        icon: Icons.phone_outlined,
                        label: 'Call support',
                        dark: dark,
                        onTap: () => AppToast.show(
                          context,
                          'Connecting you to support…',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ContactTile(
                        icon: Icons.chat_bubble_outline,
                        label: 'Live chat',
                        dark: dark,
                        onTap: () =>
                            AppToast.show(context, 'Opening live chat…'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SectionLabel('FAQs', dark: dark),
                const SizedBox(height: 10),
                for (var i = 0; i < MockData.faqs.length; i++) ...[
                  _FaqTile(
                    question: MockData.faqs[i],
                    expanded: _openFaq == i,
                    dark: dark,
                    onTap: () => setState(
                      () => _openFaq = _openFaq == i ? null : i,
                    ),
                  ),
                  if (i < MockData.faqs.length - 1) const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  const _ContactTile({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.dark,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: onTap,
      dark: dark,
      padding: const EdgeInsets.symmetric(vertical: 18),
      child: Column(
        children: [
          Icon(icon, size: 18, color: AppColors.mint),
          const SizedBox(height: 8),
          Text(
            label,
            style: AppTextStyles.body(
              11.5,
              color: dark ? Colors.white : AppColors.ink,
              weight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  const _FaqTile({
    required this.question,
    required this.expanded,
    required this.onTap,
    required this.dark,
  });

  final String question;
  final bool expanded;
  final VoidCallback onTap;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: onTap,
      dark: dark,
      radius: AppRadius.row,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  question,
                  style: AppTextStyles.body(
                    12,
                    color: dark ? Colors.white : AppColors.ink,
                    weight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              AnimatedRotation(
                turns: expanded ? 0.25 : 0,
                duration: const Duration(milliseconds: 150),
                child: Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: dark ? AppColors.onNavyMuted : AppColors.slateLight,
                ),
              ),
            ],
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: Padding(
              padding: const EdgeInsets.only(top: 10, right: 16),
              child: Text(
                MockData.faqAnswer,
                style: AppTextStyles.body(
                  11.5,
                  color: dark ? AppColors.onNavyMuted : AppColors.slate,
                  height: 1.5,
                ),
              ),
            ),
            crossFadeState: expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 160),
          ),
        ],
      ),
    );
  }
}
