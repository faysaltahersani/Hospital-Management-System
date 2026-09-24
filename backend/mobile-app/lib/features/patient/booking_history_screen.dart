import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

/// Every visit the patient has booked — upcoming first, then past ones with
/// how they ended.
class BookingHistoryScreen extends StatefulWidget {
  const BookingHistoryScreen({super.key});

  @override
  State<BookingHistoryScreen> createState() => _BookingHistoryScreenState();
}

class _BookingHistoryScreenState extends State<BookingHistoryScreen> {
  late final Future<List<Appointment>> _bookings =
      context.read<AppSession>().patients.bookingHistory();

  static TagTone _tone(AppointmentStatus status) {
    switch (status) {
      case AppointmentStatus.upcoming:
        return TagTone.amber;
      case AppointmentStatus.completed:
        return TagTone.mint;
      case AppointmentStatus.cancelled:
        return TagTone.coral;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'My booking history',
            subtitle: 'Every visit you have booked with us',
            onBack: () => Navigator.of(context).pop(),
          ),
          Expanded(
            child: FutureBuilder<List<Appointment>>(
              future: _bookings,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  );
                }

                final bookings = snapshot.data!;
                if (bookings.isEmpty) {
                  return const EmptyState(
                    'You have not booked an appointment yet.',
                  );
                }

                final upcoming = bookings
                    .where((b) => b.status == AppointmentStatus.upcoming)
                    .toList();
                final past = bookings
                    .where((b) => b.status != AppointmentStatus.upcoming)
                    .toList();

                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                  children: [
                    if (upcoming.isNotEmpty) ...[
                      const SectionLabel('Upcoming'),
                      const SizedBox(height: 12),
                      for (final booking in upcoming) ...[
                        _BookingCard(booking: booking, tone: _tone),
                        const SizedBox(height: 12),
                      ],
                      const SizedBox(height: 12),
                    ],
                    if (past.isNotEmpty) ...[
                      SectionLabel('Past visits · ${past.length}'),
                      const SizedBox(height: 12),
                      for (var i = 0; i < past.length; i++) ...[
                        _BookingCard(booking: past[i], tone: _tone),
                        if (i < past.length - 1) const SizedBox(height: 12),
                      ],
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking, required this.tone});

  final Appointment booking;
  final TagTone Function(AppointmentStatus) tone;

  @override
  Widget build(BuildContext context) {
    final cancelled = booking.status == AppointmentStatus.cancelled;

    return ShadowedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  booking.code,
                  style: AppTextStyles.label(10),
                ),
              ),
              AppTag(booking.status.label, tone: tone(booking.status)),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            booking.doctorName,
            style: AppTextStyles.display(
              15,
              color: cancelled ? AppColors.slate : AppColors.ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            [booking.department, booking.room]
                .where((p) => p.isNotEmpty)
                .join(' · '),
            style: AppTextStyles.body(12, color: AppColors.slate),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Detail(label: 'Date', value: booking.date),
              const SizedBox(width: 24),
              _Detail(label: 'Time', value: booking.time),
              if (booking.floor.isNotEmpty) ...[
                const SizedBox(width: 24),
                _Detail(label: 'Floor', value: booking.floor),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: AppTextStyles.label(9)),
        const SizedBox(height: 2),
        Text(value, style: AppTextStyles.body(13, weight: FontWeight.w600)),
      ],
    );
  }
}
