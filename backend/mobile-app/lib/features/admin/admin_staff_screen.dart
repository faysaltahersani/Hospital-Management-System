import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/app_tag.dart';
import '../../core/widgets/app_toast.dart';
import '../../core/widgets/screen_header.dart';
import '../../core/widgets/segmented_control.dart';
import '../../core/widgets/soft_card.dart';
import '../../core/widgets/underline_field.dart';
import '../../data/models/models.dart';
import '../../data/session.dart';
import 'employee_detail_screen.dart';

class AdminStaffScreen extends StatefulWidget {
  const AdminStaffScreen({super.key});

  @override
  State<AdminStaffScreen> createState() => _AdminStaffScreenState();
}

class _AdminStaffScreenState extends State<AdminStaffScreen> {
  final _search = TextEditingController();

  int _segment = 0;
  late Future<List<Employee>> _employees;
  late Future<List<AttendanceRecord>> _attendance;
  late Future<List<LeaveRequest>> _leave;

  @override
  void initState() {
    super.initState();
    final repo = context.read<AppSession>().admins;
    _employees = repo.employees();
    _attendance = repo.attendance();
    _leave = repo.pendingLeave();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    setState(() {
      _employees =
          context.read<AppSession>().admins.employees(query: value);
    });
  }

  Future<void> _resolve(LeaveRequest request, {required bool approve}) async {
    final updated = await context
        .read<AppSession>()
        .admins
        .resolveLeave(request.id, approve: approve);
    if (!mounted) return;
    // Block body, not an arrow: `_leave = ...` evaluates to the assigned
    // Future, and setState asserts its callback never returns one.
    setState(() {
      _leave = Future.value(updated);
    });
    AppToast.show(
      context,
      approve ? 'Leave approved' : 'Leave rejected',
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        const ScreenHeader(
          title: 'Staff',
          subtitle: 'Directory, attendance and leave',
          dark: true,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 22),
          child: SegmentedControl(
            segments: const ['Directory', 'Attendance', 'Leave'],
            selectedIndex: _segment,
            dark: true,
            onChanged: (index) => setState(() => _segment = index),
          ),
        ),
        ContentSheet(
          minHeight: 460,
          child: switch (_segment) {
            1 => _AttendanceView(future: _attendance),
            2 => _LeaveView(future: _leave, onResolve: _resolve),
            _ => _DirectoryView(
                future: _employees,
                controller: _search,
                onSearch: _onSearch,
              ),
          },
        ),
      ],
    );
  }
}

class _DirectoryView extends StatelessWidget {
  const _DirectoryView({
    required this.future,
    required this.controller,
    required this.onSearch,
  });

  final Future<List<Employee>> future;
  final TextEditingController controller;
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SearchBox(
          controller: controller,
          hint: 'Search name, role or department…',
          onChanged: onSearch,
        ),
        const SizedBox(height: 18),
        FutureBuilder<List<Employee>>(
          future: future,
          builder: (context, snapshot) {
            if (!snapshot.hasData) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              );
            }
            final employees = snapshot.data!;
            if (employees.isEmpty) {
              return const EmptyState('No staff match your search.');
            }
            return Column(
              children: [
                for (var i = 0; i < employees.length; i++) ...[
                  _EmployeeRow(employee: employees[i]),
                  if (i < employees.length - 1) const SizedBox(height: 12),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}

class _EmployeeRow extends StatelessWidget {
  const _EmployeeRow({required this.employee});

  final Employee employee;

  @override
  Widget build(BuildContext context) {
    return ShadowedCard(
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => EmployeeDetailScreen(employee: employee),
        ),
      ),
      child: Row(
        children: [
          const IconChip(icon: Icons.badge_outlined, iconSize: 16),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.name,
                  style: AppTextStyles.body(13, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  [employee.role, employee.department]
                      .where((p) => p.isNotEmpty)
                      .join(' · '),
                  style: AppTextStyles.body(11, color: AppColors.slate),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (!employee.onDuty)
            Text(
              'Off duty',
              style: AppTextStyles.body(10, color: AppColors.slateLight),
            )
          else
            const Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.slateLight,
            ),
        ],
      ),
    );
  }
}

class _AttendanceView extends StatelessWidget {
  const _AttendanceView({required this.future});

  final Future<List<AttendanceRecord>> future;

  static ({TagTone tone, IconData icon}) _style(AttendanceStatus status) {
    switch (status) {
      case AttendanceStatus.present:
        return (tone: TagTone.mint, icon: Icons.check_circle_outline);
      case AttendanceStatus.late:
        return (tone: TagTone.amber, icon: Icons.schedule);
      case AttendanceStatus.absent:
        return (tone: TagTone.coral, icon: Icons.cancel_outlined);
      case AttendanceStatus.onLeave:
        return (tone: TagTone.amber, icon: Icons.event_busy_outlined);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AttendanceRecord>>(
      future: future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        final records = snapshot.data!;
        if (records.isEmpty) {
          return const EmptyState('No attendance recorded today.');
        }

        int countOf(AttendanceStatus status) =>
            records.where((r) => r.status == status).length;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: _Count(
                    value: countOf(AttendanceStatus.present),
                    label: 'Present',
                  ),
                ),
                Expanded(
                  child: _Count(
                    value: countOf(AttendanceStatus.late),
                    label: 'Late',
                  ),
                ),
                Expanded(
                  child: _Count(
                    value: countOf(AttendanceStatus.absent),
                    label: 'Absent',
                  ),
                ),
                Expanded(
                  child: _Count(
                    value: countOf(AttendanceStatus.onLeave),
                    label: 'On leave',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            for (var i = 0; i < records.length; i++) ...[
              _AttendanceRow(record: records[i], style: _style),
              if (i < records.length - 1) const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.value, required this.label});

  final int value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$value', style: AppTextStyles.display(20)),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTextStyles.body(10, color: AppColors.slateLight),
        ),
      ],
    );
  }
}

class _AttendanceRow extends StatelessWidget {
  const _AttendanceRow({required this.record, required this.style});

  final AttendanceRecord record;
  final ({TagTone tone, IconData icon}) Function(AttendanceStatus) style;

  @override
  Widget build(BuildContext context) {
    final visual = style(record.status);

    return ShadowedCard(
      radius: AppRadius.row,
      shadow: AppShadows.row,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  record.name,
                  style: AppTextStyles.body(12.5, weight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  record.checkIn.isEmpty
                      ? record.role
                      : '${record.role} · in at ${record.checkIn}',
                  style: AppTextStyles.body(10.5, color: AppColors.slate),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          AppTag(record.status.label, tone: visual.tone),
        ],
      ),
    );
  }
}

class _LeaveView extends StatelessWidget {
  const _LeaveView({required this.future, required this.onResolve});

  final Future<List<LeaveRequest>> future;
  final Future<void> Function(LeaveRequest, {required bool approve}) onResolve;

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
    return FutureBuilder<List<LeaveRequest>>(
      future: future,
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        }

        final requests = snapshot.data!;
        if (requests.isEmpty) {
          return const EmptyState('No leave requests.');
        }

        final pending =
            requests.where((r) => r.status == LeaveStatus.pending).length;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              pending == 0
                  ? 'Nothing waiting on you.'
                  : '$pending request(s) awaiting your decision.',
              style: AppTextStyles.body(11.5, color: AppColors.slate),
            ),
            const SizedBox(height: 16),
            for (var i = 0; i < requests.length; i++) ...[
              _LeaveCard(
                request: requests[i],
                tone: _tone(requests[i].status),
                onApprove: () => onResolve(requests[i], approve: true),
                onReject: () => onResolve(requests[i], approve: false),
              ),
              if (i < requests.length - 1) const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}

class _LeaveCard extends StatelessWidget {
  const _LeaveCard({
    required this.request,
    required this.tone,
    required this.onApprove,
    required this.onReject,
  });

  final LeaveRequest request;
  final TagTone tone;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final pending = request.status == LeaveStatus.pending;

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
                      request.dateRange,
                      style: AppTextStyles.body(13, weight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          request.isAllDay
                              ? Icons.event_available
                              : Icons.schedule,
                          size: 12,
                          color: AppColors.mint,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          request.timeRange,
                          style: AppTextStyles.body(
                            11,
                            color: AppColors.mint,
                          ),
                        ),
                        Text(
                          '  ·  ${request.dayCount} day'
                          '${request.dayCount == 1 ? '' : 's'}',
                          style: AppTextStyles.body(
                            11,
                            color: AppColors.slateLight,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      request.reason,
                      style: AppTextStyles.body(11, color: AppColors.slate),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              AppTag(request.status.label, tone: tone),
            ],
          ),
          if (pending) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: SoftButton(
                    label: 'Approve',
                    icon: Icons.check,
                    onPressed: onApprove,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(child: _RejectButton(onPressed: onReject)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _RejectButton extends StatelessWidget {
  const _RejectButton({required this.onPressed});

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
          height: 38,
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.close, size: 14, color: AppColors.coral),
              const SizedBox(width: 6),
              Text(
                'Reject',
                style: AppTextStyles.body(
                  12,
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
