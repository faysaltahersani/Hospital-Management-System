import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/sheet_panel.dart';
import '../../core/widgets/soft_card.dart';
import '../../data/models/models.dart';

/// Maps a notification kind onto its icon and tint.
({IconData icon, Color background, Color foreground}) noticeStyle(
  NoticeKind kind,
) {
  switch (kind) {
    case NoticeKind.payment:
      return (
        icon: Icons.account_balance_wallet_outlined,
        background: AppColors.coralSoft,
        foreground: AppColors.coral,
      );
    case NoticeKind.appointment:
      return (
        icon: Icons.calendar_today_outlined,
        background: AppColors.amberSoft,
        foreground: AppColors.amber,
      );
    case NoticeKind.vitalsFlagged:
      return (
        icon: Icons.warning_amber_rounded,
        background: AppColors.coralSoft,
        foreground: AppColors.coral,
      );
    case NoticeKind.prescription:
      return (
        icon: Icons.medication_outlined,
        background: AppColors.mintSoft,
        foreground: AppColors.mint,
      );
    case NoticeKind.reportReady:
      return (
        icon: Icons.check_circle_outline,
        background: AppColors.mintSoft,
        foreground: AppColors.mint,
      );
  }
}

/// Opens the notification sheet.
///
/// Resolves to the notice the user tapped, or null if they simply dismissed
/// the sheet — the caller decides where that notice leads. Set [tappable] to
/// false where there is nowhere to go, so rows do not offer an affordance that
/// does nothing.
Future<AppNotification?> showNotificationsSheet(
  BuildContext context, {
  required String title,
  required List<AppNotification> items,
  bool tappable = true,
  bool showUnread = true,
  Future<void> Function(AppNotification notice)? onDismiss,
  Future<void> Function()? onClearAll,
}) {
  return showSheetPanel<AppNotification>(
    context: context,
    title: title,
    builder: (context) => NotificationList(
      items: items,
      tappable: tappable,
      showUnread: showUnread,
      onDismiss: onDismiss,
      onClearAll: onClearAll,
    ),
  );
}

class NotificationList extends StatefulWidget {
  const NotificationList({
    super.key,
    required this.items,
    this.tappable = true,
    this.showUnread = true,
    this.onDismiss,
    this.onClearAll,
  });

  final List<AppNotification> items;
  final bool tappable;

  /// Off where read state is not tracked — the doctor's alerts are always
  /// outstanding, so a "New" pill on every row would say nothing.
  final bool showUnread;

  /// Supplied when notices can be cleared. Both are persisted by the caller;
  /// the list keeps its own copy so the sheet updates without reopening.
  final Future<void> Function(AppNotification notice)? onDismiss;
  final Future<void> Function()? onClearAll;

  @override
  State<NotificationList> createState() => _NotificationListState();
}

class _NotificationListState extends State<NotificationList> {
  late final List<AppNotification> _items = List.of(widget.items);

  bool get _clearable => widget.onDismiss != null && widget.onClearAll != null;

  Future<void> _dismiss(AppNotification notice) async {
    setState(() => _items.removeWhere((n) => n.id == notice.id));
    await widget.onDismiss?.call(notice);
  }

  Future<void> _clearAll() async {
    setState(_items.clear);
    await widget.onClearAll?.call();
  }

  @override
  Widget build(BuildContext context) {
    if (_items.isEmpty) {
      return const EmptyState('Nothing new right now.');
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < _items.length; i++) ...[
          if (_clearable)
            Dismissible(
              key: ValueKey(_items[i].id),
              direction: DismissDirection.endToStart,
              onDismissed: (_) => _dismiss(_items[i]),
              background: const _DismissBackground(),
              child: _NoticeRow(
                notice: _items[i],
                tappable: widget.tappable,
                showUnread: widget.showUnread,
              ),
            )
          else
            _NoticeRow(
              notice: _items[i],
              tappable: widget.tappable,
              showUnread: widget.showUnread,
            ),
          if (i < _items.length - 1) const SizedBox(height: 10),
        ],
        if (_clearable) ...[
          const SizedBox(height: 14),
          _ClearAllButton(count: _items.length, onPressed: _clearAll),
        ],
      ],
    );
  }
}

/// Revealed as a notice is swiped away.
class _DismissBackground extends StatelessWidget {
  const _DismissBackground();

  @override
  Widget build(BuildContext context) {
    return Container(
      alignment: Alignment.centerRight,
      padding: const EdgeInsets.only(right: 20),
      decoration: BoxDecoration(
        color: AppColors.coralSoft,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.delete_outline, size: 16, color: AppColors.coral),
          const SizedBox(width: 6),
          Text(
            'Clear',
            style: AppTextStyles.body(
              11.5,
              color: AppColors.coral,
              weight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _ClearAllButton extends StatelessWidget {
  const _ClearAllButton({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.coralSoft,
      borderRadius: AppRadius.row,
      child: InkWell(
        onTap: onPressed,
        borderRadius: AppRadius.row,
        child: Container(
          height: 42,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.delete_sweep_outlined,
                size: 16,
                color: AppColors.coral,
              ),
              const SizedBox(width: 8),
              Text(
                count == 1 ? 'Clear notification' : 'Clear all ($count)',
                style: AppTextStyles.body(
                  12.5,
                  color: AppColors.coral,
                  weight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoticeRow extends StatelessWidget {
  const _NoticeRow({
    required this.notice,
    required this.tappable,
    required this.showUnread,
  });

  final AppNotification notice;
  final bool tappable;
  final bool showUnread;

  @override
  Widget build(BuildContext context) {
    final style = noticeStyle(notice.kind);

    final row = Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.bg,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IconChip(
            icon: style.icon,
            background: style.background,
            foreground: style.foreground,
            size: 36,
            iconSize: 15,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        notice.title,
                        style: AppTextStyles.body(
                          12.5,
                          weight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (showUnread && !notice.read) ...[
                      const SizedBox(width: 8),
                      // Unread marker: a dot plus the word, so it never rests
                      // on colour alone.
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: AppColors.mint,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'New',
                        style: AppTextStyles.label(
                          9,
                          color: AppColors.mint,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  notice.body,
                  style: AppTextStyles.body(
                    11,
                    color: AppColors.slate,
                    height: 1.4,
                  ),
                ),
                if (notice.time.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    notice.time,
                    style: AppTextStyles.body(
                      10,
                      color: AppColors.slateLight,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (tappable) ...[
            const SizedBox(width: 6),
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Icon(
                Icons.chevron_right,
                size: 16,
                color: AppColors.slateLight,
              ),
            ),
          ],
        ],
      ),
    );

    if (!tappable) return row;

    // Closes the sheet and hands the notice back, so the screen that opened it
    // can decide where it leads.
    return Semantics(
      button: true,
      label: '${notice.title}. ${notice.body}',
      child: InkWell(
        onTap: () => Navigator.of(context).pop(notice),
        borderRadius: AppRadius.row,
        child: row,
      ),
    );
  }
}
