import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

/// The grid renders three visual classes rather than four statuses: cleaning
/// and maintenance share a colour because amber and coral are too close to be
/// told apart reliably (they fail the colour-separation check). Tapping a bed
/// shows which of the two it actually is, and the legend names the pairing.
enum _BedClass { available, occupied, unavailable }

_BedClass _classOf(BedStatus status) {
  switch (status) {
    case BedStatus.available:
      return _BedClass.available;
    case BedStatus.occupied:
      return _BedClass.occupied;
    case BedStatus.cleaning:
    case BedStatus.maintenance:
      return _BedClass.unavailable;
  }
}

({Color fill, Color ink}) _paletteOf(_BedClass value) {
  switch (value) {
    case _BedClass.available:
      return (fill: AppColors.mintSoft, ink: AppColors.mint);
    case _BedClass.occupied:
      return (fill: AppColors.navy, ink: Colors.white);
    case _BedClass.unavailable:
      return (fill: AppColors.amberSoft, ink: AppColors.amber);
  }
}

class WardDetailScreen extends StatefulWidget {
  const WardDetailScreen({super.key, required this.ward});

  final WardSummary ward;

  @override
  State<WardDetailScreen> createState() => _WardDetailScreenState();
}

class _WardDetailScreenState extends State<WardDetailScreen> {
  late final Future<List<BedRecord>> _beds =
      context.read<AppSession>().admins.beds(wardName: widget.ward.name);

  void _showBed(BedRecord bed) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.card),
        title: Text(
          'Bed ${bed.number}',
          style: AppTextStyles.display(16),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              bed.wardName,
              style: AppTextStyles.body(11, color: AppColors.slateLight),
            ),
            const SizedBox(height: 12),
            Text(
              'Status · ${bed.status.label}',
              style: AppTextStyles.body(12.5, weight: FontWeight.w600),
            ),
            if (bed.patientName != null) ...[
              const SizedBox(height: 6),
              Text(
                'Patient · ${bed.patientName}',
                style: AppTextStyles.body(12.5, color: AppColors.slate),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            style: TextButton.styleFrom(foregroundColor: AppColors.mint),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: ListView(
        padding: const EdgeInsets.only(bottom: 60),
        children: [
          ScreenHeader(
            title: widget.ward.name,
            subtitle: '${widget.ward.totalBeds} beds · '
                '${widget.ward.occupiedBeds} occupied',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          ContentSheet(
            minHeight: 500,
            child: FutureBuilder<List<BedRecord>>(
              future: _beds,
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  );
                }

                final beds = snapshot.data!;
                if (beds.isEmpty) {
                  return const EmptyState('No beds in this ward.');
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _Legend(),
                    const SizedBox(height: 20),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 5,
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 1,
                      ),
                      itemCount: beds.length,
                      itemBuilder: (context, index) => _BedCell(
                        bed: beds[index],
                        onTap: () => _showBed(beds[index]),
                      ),
                    ),
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

class _Legend extends StatelessWidget {
  const _Legend();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        for (final entry in const [
          (_BedClass.available, 'Available'),
          (_BedClass.occupied, 'Occupied'),
          (_BedClass.unavailable, 'Cleaning / maintenance'),
        ])
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: _paletteOf(entry.$1).fill,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                entry.$2,
                style: AppTextStyles.body(10.5, color: AppColors.slate),
              ),
            ],
          ),
      ],
    );
  }
}

class _BedCell extends StatelessWidget {
  const _BedCell({required this.bed, required this.onTap});

  final BedRecord bed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = _paletteOf(_classOf(bed.status));

    return Semantics(
      button: true,
      label: 'Bed ${bed.number}, ${bed.status.label}',
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: palette.fill,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            bed.number,
            style: AppTextStyles.body(
              12,
              color: palette.ink,
              weight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
