import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/app_toggle.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';

class LeaveRequestsScreen extends StatefulWidget {
  const LeaveRequestsScreen({super.key});

  @override
  State<LeaveRequestsScreen> createState() => _LeaveRequestsScreenState();
}

class _LeaveRequestsScreenState extends State<LeaveRequestsScreen> {
  final _reason = TextEditingController();

  List<LeaveRequest>? _requests;

  late DateTime _fromDate;
  late DateTime _toDate;

  /// Whole days off by default; switch it off to take specific hours.
  bool _allDay = true;
  TimeOfDay _fromTime = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay _toTime = const TimeOfDay(hour: 17, minute: 0);

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _fromDate = DateTime(today.year, today.month, today.day);
    _toDate = _fromDate;

    context.read<AppSession>().doctors.leaveRequests().then((requests) {
      if (mounted) setState(() => _requests = requests);
    });
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  int get _dayCount => _toDate.difference(_fromDate).inDays + 1;

  static int _minutes(TimeOfDay time) => time.hour * 60 + time.minute;

  /// The Material pickers are light surfaces, so they get the patient palette
  /// even though this screen is navy.
  Widget _pickerTheme(BuildContext context, Widget? child) {
    return Theme(
      data: Theme.of(context).copyWith(
        colorScheme: const ColorScheme.light(
          primary: AppColors.mint,
          onPrimary: Colors.white,
          surface: AppColors.card,
          onSurface: AppColors.ink,
        ),
      ),
      child: child!,
    );
  }

  void _setAllDay(bool value) {
    setState(() {
      _allDay = value;
      _error = null;
    });
  }

  Future<void> _pickDate({required bool isFrom}) async {
    final today = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _fromDate : _toDate,
      firstDate: DateTime(today.year, today.month, today.day),
      lastDate: DateTime(today.year + 1, today.month, today.day),
      helpText: isFrom ? 'Leave starts on' : 'Leave ends on',
      builder: _pickerTheme,
    );
    if (picked == null) return;

    setState(() {
      _error = null;
      if (isFrom) {
        _fromDate = picked;
        // Keep the range valid rather than rejecting it later.
        if (_toDate.isBefore(picked)) _toDate = picked;
      } else {
        _toDate = picked.isBefore(_fromDate) ? _fromDate : picked;
      }
    });
  }

  Future<void> _pickTime({required bool isFrom}) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isFrom ? _fromTime : _toTime,
      helpText: isFrom ? 'Hours start at' : 'Hours end at',
      builder: _pickerTheme,
    );
    if (picked == null) return;

    setState(() {
      _error = null;
      if (isFrom) {
        _fromTime = picked;
      } else {
        _toTime = picked;
      }
    });
  }

  Future<void> _submit() async {
    if (_submitting) return;

    if (!_allDay && _minutes(_toTime) <= _minutes(_fromTime)) {
      setState(() => _error = 'The end time must be after the start time.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final requests = await context.read<AppSession>().doctors.submitLeave(
            fromDate: _fromDate,
            toDate: _toDate,
            reason: _reason.text.trim(),
            fromTime: _allDay ? '' : _fromTime.format(context),
            toTime: _allDay ? '' : _toTime.format(context),
          );
      if (!mounted) return;

      _reason.clear();
      FocusScope.of(context).unfocus();
      setState(() => _requests = requests);
      AppToast.show(context, 'Leave request submitted');
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not submit: $error');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  static TagTone _tone(LeaveStatus status) {
    switch (status) {
      case LeaveStatus.approved:
        return TagTone.mint;
      case LeaveStatus.rejected:
        return TagTone.coral;
      case LeaveStatus.pending:
        return TagTone.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    final requests = _requests;

    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ScreenHeader(
            title: 'Leave requests',
            subtitle: 'Apply for leave and track approvals',
            onBack: () => Navigator.of(context).pop(),
            dark: true,
          ),
          Expanded(
            child: requests == null
                ? const Center(
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                    children: [
                      if (requests.isEmpty)
                        const EmptyState('No leave requests yet.', dark: true),
                      for (final request in requests) ...[
                        _RequestRow(
                          request: request,
                          tone: _tone(request.status),
                        ),
                        const SizedBox(height: 10),
                      ],
                      const SizedBox(height: 14),
                      _NewRequestForm(state: this),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _NewRequestForm extends StatelessWidget {
  const _NewRequestForm({required this.state});

  final _LeaveRequestsScreenState state;

  @override
  Widget build(BuildContext context) {
    final days = state._dayCount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.navyCard,
        borderRadius: AppRadius.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'New leave request',
            style: AppTextStyles.body(
              11,
              color: AppColors.onNavyMuted,
              weight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          _PickerRow(
            icon: Icons.calendar_today_outlined,
            label: 'From',
            value: formatFullDate(state._fromDate),
            onTap: () => state._pickDate(isFrom: true),
          ),
          const SizedBox(height: 10),
          _PickerRow(
            icon: Icons.event_outlined,
            label: 'To',
            value: formatFullDate(state._toDate),
            onTap: () => state._pickDate(isFrom: false),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'All day',
                      style: AppTextStyles.body(
                        12.5,
                        color: Colors.white,
                        weight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      state._allDay
                          ? 'Whole working day off'
                          : 'Choose the hours below',
                      style: AppTextStyles.body(
                        10.5,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              AppToggle(
                value: state._allDay,
                onChanged: state._setAllDay,
              ),
            ],
          ),
          if (!state._allDay) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _PickerRow(
                    icon: Icons.schedule,
                    label: 'Start',
                    value: state._fromTime.format(context),
                    onTap: () => state._pickTime(isFrom: true),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _PickerRow(
                    icon: Icons.schedule,
                    label: 'End',
                    value: state._toTime.format(context),
                    onTap: () => state._pickTime(isFrom: false),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          UnderlineField(
            controller: state._reason,
            hint: 'Reason',
            dark: true,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => state._submit(),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.navyField,
              borderRadius: AppRadius.row,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.info_outline,
                  size: 15,
                  color: AppColors.mint,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '$days day${days == 1 ? '' : 's'} · '
                    '${state._allDay ? 'All day' : '${state._fromTime.format(context)} – ${state._toTime.format(context)}'}',
                    style: AppTextStyles.body(
                      11,
                      color: Colors.white,
                      weight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (state._error != null) ...[
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  size: 15,
                  color: AppColors.coral,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state._error!,
                    style: AppTextStyles.body(11, color: AppColors.coral),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 18),
          PrimaryButton(
            label: state._submitting ? 'Submitting…' : 'Submit request',
            dark: true,
            onPressed: state._submitting ? null : state._submit,
          ),
        ],
      ),
    );
  }
}

/// A tappable field that opens a date or time picker.
class _PickerRow extends StatelessWidget {
  const _PickerRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: '$label, $value',
      child: Material(
        color: AppColors.navyField,
        borderRadius: AppRadius.row,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.row,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Icon(icon, size: 15, color: AppColors.mint),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label.toUpperCase(),
                        style: AppTextStyles.label(
                          9,
                          color: AppColors.onNavyMuted,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        value,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.body(
                          12,
                          color: Colors.white,
                          weight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.expand_more,
                  size: 16,
                  color: AppColors.onNavyMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RequestRow extends StatelessWidget {
  const _RequestRow({required this.request, required this.tone});

  final LeaveRequest request;
  final TagTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.navyCard,
        borderRadius: AppRadius.row,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.dateRange,
                  style: AppTextStyles.body(
                    12.5,
                    color: Colors.white,
                    weight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Icon(
                      request.isAllDay ? Icons.event_available : Icons.schedule,
                      size: 12,
                      color: AppColors.mint,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      request.timeRange,
                      style: AppTextStyles.body(10.5, color: AppColors.mint),
                    ),
                    Text(
                      '  ·  ${request.reason}',
                      style: AppTextStyles.body(
                        10.5,
                        color: AppColors.onNavyMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          AppTag(request.status.label, tone: tone),
        ],
      ),
    );
  }
}
