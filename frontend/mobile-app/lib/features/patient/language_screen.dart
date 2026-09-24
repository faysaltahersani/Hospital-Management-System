import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/mock/mock_data.dart';

class LanguageScreen extends StatefulWidget {
  const LanguageScreen({super.key});

  @override
  State<LanguageScreen> createState() => _LanguageScreenState();
}

class _LanguageScreenState extends State<LanguageScreen> {
  String _selected = MockData.languages.first;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Language',
            subtitle: 'Choose your app language',
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              itemCount: MockData.languages.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final language = MockData.languages[index];
                final selected = language == _selected;

                return ShadowedCard(
                  radius: AppRadius.row,
                  shadow: AppShadows.row,
                  padding: const EdgeInsets.all(14),
                  onTap: () {
                    setState(() => _selected = language);
                    AppToast.show(context, 'Language set to $language');
                  },
                  child: Row(
                    children: [
                      const Icon(
                        Icons.language,
                        size: 17,
                        color: AppColors.mint,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          language,
                          style: AppTextStyles.body(
                            13,
                            weight: FontWeight.w500,
                          ),
                        ),
                      ),
                      _RadioDot(selected: selected),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RadioDot extends StatelessWidget {
  const _RadioDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? AppColors.mint : Colors.transparent,
        border: Border.all(
          color: selected ? AppColors.mint : AppColors.line,
          width: 2,
        ),
      ),
      child: selected
          ? const Icon(Icons.check, size: 11, color: Colors.white)
          : null,
    );
  }
}
