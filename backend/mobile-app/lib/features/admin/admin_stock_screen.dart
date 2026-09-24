import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/charts.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/segmented_control.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class AdminStockScreen extends StatefulWidget {
  const AdminStockScreen({super.key});

  @override
  State<AdminStockScreen> createState() => _AdminStockScreenState();
}

class _AdminStockScreenState extends State<AdminStockScreen> {
  int _segment = 0;
  late Future<List<MedicineStock>> _medicines;
  late Future<List<BloodStock>> _blood;

  @override
  void initState() {
    super.initState();
    final repo = context.read<AppSession>().admins;
    _medicines = repo.medicineStock();
    _blood = repo.bloodStock();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'Inventory',
          subtitle: 'Pharmacy and blood bank stock',
          dark: true,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 22),
          child: SegmentedControl(
            segments: const ['Pharmacy', 'Blood bank'],
            selectedIndex: _segment,
            dark: true,
            onChanged: (index) => setState(() => _segment = index),
          ),
        ),
        ContentSheet(
          minHeight: 460,
          child: _segment == 0
              ? _PharmacyView(future: _medicines)
              : _BloodBankView(future: _blood),
        ),
      ],
    );
  }
}

/// Banner naming how many items need reordering. Severity is carried by the
/// count and the wording, not by colour alone.
class _LowStockBanner extends StatelessWidget {
  const _LowStockBanner({required this.count, required this.noun});

  final int count;
  final String noun;

  @override
  Widget build(BuildContext context) {
    final clear = count == 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: clear ? AppColors.mintSoft : AppColors.coralSoft,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        children: [
          Icon(
            clear ? Icons.check_circle_outline : Icons.warning_amber_rounded,
            size: 17,
            color: clear ? AppColors.mint : AppColors.coral,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              clear
                  ? 'All $noun are above their minimum.'
                  : '$count $noun below the minimum — reorder soon.',
              style: AppTextStyles.body(11.5, weight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _PharmacyView extends StatelessWidget {
  const _PharmacyView({required this.future});

  final Future<List<MedicineStock>> future;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<MedicineStock>>(
      future: future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        final items = snapshot.data!;
        if (items.isEmpty) {
          return const EmptyState('No medicines in the catalogue.');
        }

        final low = items.where((m) => m.isLow).length;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _LowStockBanner(count: low, noun: 'medicines'),
            const SizedBox(height: 18),
            for (var i = 0; i < items.length; i++) ...[
              _MedicineRow(item: items[i]),
              if (i < items.length - 1) const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _MedicineRow extends StatelessWidget {
  const _MedicineRow({required this.item});

  final MedicineStock item;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: AppTextStyles.body(13, weight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.category,
                      style: AppTextStyles.body(11, color: AppColors.slate),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // The word carries the state; the colour only reinforces it.
              if (item.isLow) const AppTag('Low', tone: TagTone.coral),
            ],
          ),
          const SizedBox(height: 12),
          Meter(value: item.level, critical: item.isLow),
          const SizedBox(height: 8),
          Text(
            '${item.stock} in stock · reorder at ${item.reorderLevel}',
            style: AppTextStyles.body(
              10.5,
              color: item.isLow ? AppColors.coral : AppColors.slate,
            ),
          ),
        ],
      ),
    );
  }
}

class _BloodBankView extends StatelessWidget {
  const _BloodBankView({required this.future});

  final Future<List<BloodStock>> future;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<BloodStock>>(
      future: future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        final groups = snapshot.data!;
        if (groups.isEmpty) {
          return const EmptyState('No blood bank records.');
        }

        final low = groups.where((g) => g.isLow).length;
        final total = groups.fold(0, (sum, g) => sum + g.units);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _LowStockBanner(count: low, noun: 'blood groups'),
            const SizedBox(height: 18),
            Text(
              '$total units in store across ${groups.length} groups',
              style: AppTextStyles.body(11.5, color: AppColors.slate),
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                mainAxisExtent: 104,
              ),
              itemCount: groups.length,
              itemBuilder: (context, index) =>
                  _BloodCard(stock: groups[index]),
            ),
          ],
        );
      },
    );
  }
}

class _BloodCard extends StatelessWidget {
  const _BloodCard({required this.stock});

  final BloodStock stock;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  stock.group,
                  style: AppTextStyles.display(18),
                ),
              ),
              if (stock.isLow) const AppTag('Low', tone: TagTone.coral),
            ],
          ),
          const Spacer(),
          Text(
            '${stock.units} units',
            style: AppTextStyles.body(12.5, weight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Meter(
            value: stock.units / (stock.minimumUnits * 4),
            critical: stock.isLow,
            height: 6,
          ),
        ],
      ),
    );
  }
}
