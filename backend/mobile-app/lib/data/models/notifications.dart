import 'json_utils.dart';

/// Decides the icon and tint of a notification row. Kept UI-agnostic here —
/// the mapping to icons lives in the widgets.
enum NoticeKind {
  reportReady,
  payment,
  appointment,
  vitalsFlagged,
  prescription,
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.kind,
    this.patientUhid = '',
    this.time = '',
    this.read = false,
    this.reportId = '',
  });

  /// Stable handle for dismissing a single notice.
  final String id;

  final String title;
  final String body;
  final NoticeKind kind;

  /// Who the notice is for. Notices are addressed by hospital ID, the same way
  /// records are, so one list serves every profile.
  final String patientUhid;

  /// Relative label shown on the row — "Just now", "2 hours ago".
  final String time;

  /// Drives the unread badge on the home screen's bell.
  final bool read;

  /// The record this notice is about, when there is one. Tapping the notice
  /// opens it; without an id the tap falls back to the relevant tab.
  final String reportId;

  AppNotification copyWith({bool? read}) => AppNotification(
        id: id,
        title: title,
        body: body,
        kind: kind,
        patientUhid: patientUhid,
        time: time,
        read: read ?? this.read,
        reportId: reportId,
      );

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    final type = Json.str(json, ['type', 'category']).toLowerCase();
    final kind = switch (type) {
      final t when t.contains('pay') || t.contains('invoice') =>
        NoticeKind.payment,
      final t when t.contains('prescription') || t.contains('rx') =>
        NoticeKind.prescription,
      final t when t.contains('appointment') => NoticeKind.appointment,
      final t when t.contains('vital') || t.contains('critical') =>
        NoticeKind.vitalsFlagged,
      _ => NoticeKind.reportReady,
    };

    return AppNotification(
      id: Json.str(json, ['id']),
      title: Json.str(json, ['title'], fallback: 'Notification'),
      body: Json.str(json, ['body', 'message', 'description']),
      kind: kind,
      patientUhid: Json.str(json, ['uhid', 'patient_code']),
      time: Json.str(json, ['created_at', 'createdAt', 'time']),
      read: Json.boolVal(json, ['read', 'is_read']),
      reportId: Json.str(json, ['report_id', 'reportId']),
    );
  }
}

/// A single toggle on the notification-settings screen.
class NotificationPref {
  const NotificationPref({
    required this.label,
    required this.description,
    required this.enabled,
  });

  final String label;
  final String description;
  final bool enabled;

  NotificationPref copyWith({bool? enabled}) => NotificationPref(
        label: label,
        description: description,
        enabled: enabled ?? this.enabled,
      );

  factory NotificationPref.fromJson(Map<String, dynamic> json) =>
      NotificationPref(
        label: Json.str(json, ['label', 'name']),
        description: Json.str(json, ['description', 'desc']),
        enabled: Json.boolVal(json, ['enabled', 'on'], fallback: true),
      );
}
