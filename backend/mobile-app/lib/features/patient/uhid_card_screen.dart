import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/session.dart';

class UhidCardScreen extends StatelessWidget {
  const UhidCardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppSession>().user;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'UHID & ID card',
            subtitle: 'Show this at any hospital counter',
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: AppColors.heroGradient,
                    borderRadius: AppRadius.card,
                    boxShadow: AppShadows.raised,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'E-MEDICAL',
                            style: AppTextStyles.label(
                              11,
                              color: Colors.white,
                              weight: FontWeight.w700,
                              letterSpacing: 1.4,
                            ),
                          ),
                          const Icon(
                            Icons.verified_outlined,
                            size: 19,
                            color: AppColors.mint,
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      Text(
                        user?.name ?? 'Patient',
                        style: AppTextStyles.display(16, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.subtitle.isNotEmpty == true
                            ? user!.subtitle
                            : 'Registered patient',
                        style: AppTextStyles.body(
                          11,
                          color: AppColors.onNavyMuted,
                        ),
                      ),
                      const SizedBox(height: 22),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'UHID',
                                  style: AppTextStyles.label(
                                    9,
                                    color: AppColors.onNavyMuted,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  user?.identifier ?? '—',
                                  style: AppTextStyles.label(
                                    15,
                                    color: Colors.white,
                                    letterSpacing: 3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const _Barcode(),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                  label: 'Download ID card',
                  icon: Icons.file_download_outlined,
                  onPressed: () =>
                      AppToast.show(context, 'ID card downloaded'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// The striped block standing in for a scannable code.
class _Barcode extends StatelessWidget {
  const _Barcode();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.navySoft,
        borderRadius: BorderRadius.circular(6),
      ),
      child: CustomPaint(painter: _BarcodePainter(), child: const SizedBox()),
    );
  }
}

class _BarcodePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;
    const barWidth = 2.0;
    const gap = 2.0;

    var x = 0.0;
    while (x < size.width) {
      canvas.drawRect(
        Rect.fromLTWH(x, 0, barWidth, size.height),
        paint,
      );
      x += barWidth + gap;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
