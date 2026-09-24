import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class DoctorOtScreen extends StatefulWidget {
  const DoctorOtScreen({super.key});

  @override
  State<DoctorOtScreen> createState() => _DoctorOtScreenState();
}

class _DoctorOtScreenState extends State<DoctorOtScreen> {
  List<OtBooking>? _bookings;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    context.read<AppSession>().doctors.otSchedule().then((bookings) {
      if (mounted) setState(() => _bookings = bookings);
    });
  }

  Future<void> _complete(OtBooking booking) async {
    if (_busy) return;
    setState(() => _busy = true);

    try {
      final updated = await context
          .read<AppSession>()
          .doctors
          .completeOtBooking(booking.id);
      if (!mounted) return;
      setState(() => _bookings = updated);
      AppToast.show(context, 'Marked as completed');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not update: $error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookings = _bookings;

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'OT schedule',
          subtitle: "Today's operation theatre bookings",
          dark: true,
        ),
        ContentSheet(
          minHeight: 460,
          child: bookings == null
              ? const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : bookings.isEmpty
                  ? const EmptyState('No operations scheduled today.')
                  : Column(
                      children: [
                        for (var i = 0; i < bookings.length; i++) ...[
                          _OtCard(
                            booking: bookings[i],
                            onComplete: () => _complete(bookings[i]),
                          ),
                          if (i < bookings.length - 1)
                            const SizedBox(height: 12),
                        ],
                      ],
                    ),
        ),
      ],
    );
  }
}

class _OtCard extends StatelessWidget {
  const _OtCard({required this.booking, required this.onComplete});

  final OtBooking booking;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final done = booking.status == OtStatus.completed;

    return ShadowedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const IconChip(
                icon: Icons.content_cut,
                background: AppColors.amberSoft,
                foreground: AppColors.amber,
                iconSize: 16,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      booking.procedure,
                      style: AppTextStyles.body(13, weight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${booking.patient} · ${booking.room} · ${booking.time}',
                      style: AppTextStyles.body(11, color: AppColors.slate),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              AppTag(
                booking.status.label,
                tone: done ? TagTone.mint : TagTone.amber,
              ),
            ],
          ),
          if (!done) ...[
            const SizedBox(height: 14),
            SoftButton(label: 'Mark as completed', onPressed: onComplete),
          ],
        ],
      ),
    );
  }
}
