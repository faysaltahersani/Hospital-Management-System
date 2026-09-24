import 'json_utils.dart';

enum OtStatus { scheduled, completed }

extension OtStatusX on OtStatus {
  String get label => this == OtStatus.completed ? 'Completed' : 'Scheduled';

  static OtStatus fromApi(String? value) =>
      (value ?? '').toLowerCase() == 'completed'
          ? OtStatus.completed
          : OtStatus.scheduled;
}

/// An operation-theatre booking on the doctor's OT tab.
class OtBooking {
  const OtBooking({
    required this.id,
    required this.patient,
    required this.procedure,
    required this.time,
    required this.room,
    required this.status,
  });

  final String id;
  final String patient;
  final String procedure;
  final String time;
  final String room;
  final OtStatus status;

  OtBooking copyWith({OtStatus? status}) => OtBooking(
        id: id,
        patient: patient,
        procedure: procedure,
        time: time,
        room: room,
        status: status ?? this.status,
      );

  factory OtBooking.fromJson(Map<String, dynamic> json) => OtBooking(
        id: Json.str(json, ['id']),
        patient:
            Json.str(json, ['patient_name', 'patientName'], fallback: '—'),
        procedure: Json.str(json, ['procedure', 'operation', 'title'],
            fallback: 'Procedure'),
        time: Json.str(json, ['scheduled_time', 'scheduledTime', 'time']),
        room: Json.str(json, ['ot_room', 'otRoom', 'room'], fallback: 'OT'),
        status: OtStatusX.fromApi(Json.strOrNull(json, ['status'])),
      );
}

/// One row of the doctor's weekly availability.
class WorkingDay {
  const WorkingDay({
    required this.day,
    required this.enabled,
    required this.hours,
  });

  final String day;
  final bool enabled;

  /// "9:00 AM – 5:00 PM"
  final String hours;

  WorkingDay copyWith({bool? enabled}) => WorkingDay(
        day: day,
        enabled: enabled ?? this.enabled,
        hours: hours,
      );

  factory WorkingDay.fromJson(Map<String, dynamic> json) => WorkingDay(
        day: Json.str(json, ['day', 'weekday']),
        enabled: Json.boolVal(json, ['enabled', 'is_active', 'isActive'],
            fallback: true),
        hours: Json.str(json, ['hours', 'shift'], fallback: 'Off'),
      );
}

enum LeaveStatus { pending, approved, rejected }

extension LeaveStatusX on LeaveStatus {
  String get label {
    switch (this) {
      case LeaveStatus.pending:
        return 'Pending';
      case LeaveStatus.approved:
        return 'Approved';
      case LeaveStatus.rejected:
        return 'Rejected';
    }
  }

  static LeaveStatus fromApi(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'approved':
        return LeaveStatus.approved;
      case 'rejected':
      case 'declined':
        return LeaveStatus.rejected;
      default:
        return LeaveStatus.pending;
    }
  }
}

class LeaveRequest {
  const LeaveRequest({
    required this.id,
    required this.fromDate,
    required this.toDate,
    required this.reason,
    required this.status,
    this.fromTime = '',
    this.toTime = '',
  });

  final String id;
  final DateTime fromDate;
  final DateTime toDate;

  /// Start and end of the working hours being taken off, e.g. `2:00 PM`. Both
  /// empty means the whole day (or days) is off.
  final String fromTime;
  final String toTime;

  final String reason;
  final LeaveStatus status;

  bool get isAllDay => fromTime.isEmpty || toTime.isEmpty;

  /// Inclusive, so a single-day request counts as 1.
  int get dayCount =>
      DateTime(toDate.year, toDate.month, toDate.day)
          .difference(DateTime(fromDate.year, fromDate.month, fromDate.day))
          .inDays +
      1;

  bool get isSameDay => dayCount == 1;

  /// "Aug 22 – Aug 24", or just "Sep 05" for a single day.
  String get dateRange => isSameDay
      ? formatDayMonth(fromDate)
      : '${formatDayMonth(fromDate)} – ${formatDayMonth(toDate)}';

  /// "All day" or "2:00 PM – 5:00 PM".
  String get timeRange => isAllDay ? 'All day' : '$fromTime – $toTime';

  /// One-line summary for list rows and the audit trail.
  String get summary => '$dateRange · $timeRange';

  LeaveRequest copyWith({LeaveStatus? status}) => LeaveRequest(
        id: id,
        fromDate: fromDate,
        toDate: toDate,
        fromTime: fromTime,
        toTime: toTime,
        reason: reason,
        status: status ?? this.status,
      );

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    final from = parseDate(
      Json.strOrNull(json, ['from_date', 'fromDate', 'start_date']),
    );
    final to = parseDate(
      Json.strOrNull(json, ['to_date', 'toDate', 'end_date']),
    );

    return LeaveRequest(
      id: Json.str(json, ['id']),
      fromDate: from ?? to ?? DateTime(2000),
      toDate: to ?? from ?? DateTime(2000),
      fromTime: Json.str(json, ['from_time', 'fromTime']),
      toTime: Json.str(json, ['to_time', 'toTime']),
      reason: Json.str(json, ['reason'], fallback: 'Not specified'),
      status: LeaveStatusX.fromApi(Json.strOrNull(json, ['status'])),
    );
  }
}
