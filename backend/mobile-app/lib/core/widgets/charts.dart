import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Charts here follow a few fixed rules, so they read as one system:
///
///  * **One series, one hue.** Every column and bar is mint — length already
///    encodes magnitude, so tinting by value would double-encode it. A single
///    series needs no legend; the section title says what is plotted.
///  * **Text never wears the data colour.** Labels and values use the ink/slate
///    text tokens; identity comes from the mark beside them.
///  * **Direct labels before gridlines.** Both charts label values on the marks
///    instead of drawing a value axis — an axis with head-room above the peak
///    would put its top tick at a height that misstates the scale. Only the
///    baseline the columns grow from is drawn.
///  * **Thin marks.** Columns cap at 22px, bars are 10px, both with a 4px
///    rounded data-end and a square baseline. Leftover band space stays as air.

/// A datum for [ColumnChart] and [RankedBarChart].
class ChartDatum {
  const ChartDatum({
    required this.label,
    required this.value,
    required this.display,
  });

  final String label;
  final num value;

  /// Pre-formatted value, e.g. `৳4.8L` or `32`.
  final String display;
}

/// Vertical columns over a time axis. The peak is labelled by default; tapping
/// any column labels it and mirrors the value into the header, so every value
/// is reachable without a hover surface the phone does not have.
class ColumnChart extends StatefulWidget {
  const ColumnChart({
    super.key,
    required this.data,
    required this.title,
    this.plotHeight = 124,
  });

  final List<ChartDatum> data;
  final String title;
  final double plotHeight;

  @override
  State<ColumnChart> createState() => _ColumnChartState();
}

class _ColumnChartState extends State<ColumnChart> {
  int? _selected;

  int get _peakIndex {
    var peak = 0;
    for (var i = 1; i < widget.data.length; i++) {
      if (widget.data[i].value > widget.data[peak].value) peak = i;
    }
    return peak;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.data.isEmpty) return const SizedBox.shrink();

    final peak = _peakIndex;
    final active = _selected ?? peak;
    final maxValue = widget.data[peak].value;

    // Head-room so a label above the tallest column has somewhere to sit.
    const labelBand = 18.0;
    final barSpace = widget.plotHeight - labelBand;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Expanded(child: SectionLabelText(widget.title)),
            Text(
              '${widget.data[active].label} · ${widget.data[active].display}',
              style: AppTextStyles.body(11.5, weight: FontWeight.w600),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: widget.plotHeight,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (var i = 0; i < widget.data.length; i++)
                Expanded(
                  child: _Column(
                    datum: widget.data[i],
                    fraction: maxValue == 0
                        ? 0.0
                        : widget.data[i].value / maxValue,
                    barSpace: barSpace,
                    selected: i == active,
                    // Only the peak carries a standing label; the rest appear
                    // when tapped.
                    labelled: i == peak,
                    onTap: () => setState(() => _selected = i),
                  ),
                ),
            ],
          ),
        ),
        // The baseline the columns grow from.
        const Divider(height: 1, thickness: 1, color: AppColors.line),
        const SizedBox(height: 8),
        Row(
          children: [
            for (final datum in widget.data)
              Expanded(
                child: Text(
                  datum.label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.body(9.5, color: AppColors.slateLight),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _Column extends StatelessWidget {
  const _Column({
    required this.datum,
    required this.fraction,
    required this.barSpace,
    required this.selected,
    required this.labelled,
    required this.onTap,
  });

  final ChartDatum datum;
  final double fraction;
  final double barSpace;
  final bool selected;
  final bool labelled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // `barSpace` first: `double * num` is a double, but `num * double` is a
    // num, which would not satisfy Container.height.
    final height = barSpace * fraction.clamp(0.0, 1.0);

    return Semantics(
      button: true,
      selected: selected,
      label: '${datum.label}, ${datum.display}',
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            // Selection affordance — a backdrop behind the column, never a
            // change to the column's own colour, so the series stays one hue.
            if (selected)
              Positioned.fill(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 30),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.mintSoft,
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                  ),
                ),
              ),
            Align(
              alignment: Alignment.bottomCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 22),
                child: Container(
                  height: height,
                  decoration: const BoxDecoration(
                    color: AppColors.mint,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(4),
                    ),
                  ),
                ),
              ),
            ),
            if (labelled || selected)
              Positioned(
                bottom: height + 3,
                child: Text(
                  datum.display,
                  maxLines: 1,
                  style: AppTextStyles.body(9, weight: FontWeight.w600),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Horizontal ranked bars — label, bar, value at the tip. Every value is
/// labelled, so this form needs no axis at all.
class RankedBarChart extends StatelessWidget {
  const RankedBarChart({super.key, required this.data, required this.title});

  final List<ChartDatum> data;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (data.isEmpty) return const SizedBox.shrink();

    final maxValue = data.map((d) => d.value).reduce((a, b) => a >= b ? a : b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionLabelText(title),
        const SizedBox(height: 16),
        for (var i = 0; i < data.length; i++) ...[
          _RankedBar(
            datum: data[i],
            fraction: maxValue == 0 ? 0.0 : data[i].value / maxValue,
          ),
          if (i < data.length - 1) const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _RankedBar extends StatelessWidget {
  const _RankedBar({required this.datum, required this.fraction});

  final ChartDatum datum;
  final double fraction;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${datum.label}, ${datum.display}',
      child: Row(
        children: [
          SizedBox(
            width: 74,
            child: Text(
              datum.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.body(11, color: AppColors.slate),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: SizedBox(
              height: 10,
              child: FractionallySizedBox(
                // A floor so a near-zero value still shows a visible stub.
                widthFactor: fraction.clamp(0.04, 1.0).toDouble(),
                alignment: Alignment.centerLeft,
                child: const DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppColors.mint,
                    borderRadius: BorderRadius.horizontal(
                      right: Radius.circular(4),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 32,
            child: Text(
              datum.display,
              textAlign: TextAlign.right,
              style: AppTextStyles.body(11, weight: FontWeight.w600).copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Progress meter for occupancy and stock levels. The fill carries severity and
/// the track is a lighter step of the same ramp, so state reads across the whole
/// bar. Severity is always paired with a text label at the call site — mint and
/// coral must never be the only thing separating two states.
class Meter extends StatelessWidget {
  const Meter({
    super.key,
    required this.value,
    this.critical = false,
    this.height = 8,
  });

  /// 0..1
  final double value;
  final bool critical;
  final double height;

  @override
  Widget build(BuildContext context) {
    // FractionallySizedBox rather than LayoutBuilder: LayoutBuilder cannot
    // report intrinsic dimensions, which breaks any ancestor that asks for
    // them — IntrinsicHeight around the dashboard's stat tiles, for one.
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: SizedBox(
        height: height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: critical ? AppColors.coralSoft : AppColors.mintSoft,
            ),
            FractionallySizedBox(
              widthFactor: value.clamp(0.0, 1.0).toDouble(),
              alignment: Alignment.centerLeft,
              child: ColoredBox(
                color: critical ? AppColors.coral : AppColors.mint,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Uppercase section label, kept local so `charts.dart` does not depend on the
/// screen-header library.
class SectionLabelText extends StatelessWidget {
  const SectionLabelText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: AppTextStyles.label(11, letterSpacing: 0.9),
    );
  }
}
