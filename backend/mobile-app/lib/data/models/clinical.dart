import 'json_utils.dart';

class Doctor {
  const Doctor({
    required this.id,
    required this.name,
    required this.department,
    required this.note,
  });

  final String id;
  final String name;
  final String department;

  /// "12 yrs experience · Room 204"
  final String note;

  factory Doctor.fromJson(Map<String, dynamic> json) {
    final first = Json.str(json, ['first_name', 'firstName']);
    final last = Json.str(json, ['last_name', 'lastName']);
    final combined = [first, last].where((p) => p.isNotEmpty).join(' ');
    final name = combined.isNotEmpty
        ? combined
        : Json.str(json, ['name', 'full_name'], fallback: 'Doctor');

    final years = Json.intVal(json, ['experience_years', 'experienceYears']);
    final room = Json.strOrNull(json, ['room_no', 'roomNo', 'room']);
    final parts = <String>[
      if (years > 0) '$years yrs experience',
      if (room != null && room.isNotEmpty) 'Room $room',
    ];

    return Doctor(
      id: Json.str(json, ['id', 'doctor_id']),
      name: name.startsWith('Dr.') ? name : 'Dr. $name',
      department: Json.str(
        json,
        ['department_name', 'departmentName', 'specialization', 'department'],
        fallback: 'General',
      ),
      note: parts.isEmpty ? 'Available today' : parts.join(' · '),
    );
  }
}

class TimeSlot {
  const TimeSlot({required this.label, this.available = true});

  final String label;
  final bool available;

  factory TimeSlot.fromJson(Map<String, dynamic> json) => TimeSlot(
        label: Json.str(json, ['label', 'slot', 'start_time', 'startTime']),
        available: Json.boolVal(
          json,
          ['available', 'is_available', 'isAvailable'],
          fallback: true,
        ),
      );
}

enum AppointmentStatus { upcoming, completed, cancelled }

extension AppointmentStatusX on AppointmentStatus {
  String get label {
    switch (this) {
      case AppointmentStatus.upcoming:
        return 'Upcoming';
      case AppointmentStatus.completed:
        return 'Completed';
      case AppointmentStatus.cancelled:
        return 'Cancelled';
    }
  }

  static AppointmentStatus fromApi(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'completed':
      case 'done':
        return AppointmentStatus.completed;
      case 'cancelled':
      case 'canceled':
        return AppointmentStatus.cancelled;
      default:
        return AppointmentStatus.upcoming;
    }
  }
}

class Appointment {
  const Appointment({
    required this.id,
    required this.code,
    required this.doctorName,
    required this.department,
    required this.room,
    required this.date,
    required this.time,
    required this.floor,
    this.status = AppointmentStatus.upcoming,
  });

  final String id;

  /// "#APT-3391"
  final String code;
  final String doctorName;
  final String department;
  final String room;
  final String date;
  final String time;
  final String floor;
  final AppointmentStatus status;

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: Json.str(json, ['id']),
        code: Json.str(json, ['code', 'appointment_no', 'appointmentNo'],
            fallback: '—'),
        doctorName: Json.str(json, ['doctor_name', 'doctorName'],
            fallback: 'Doctor'),
        department: Json.str(json, ['department_name', 'departmentName'],
            fallback: ''),
        room: Json.str(json, ['room_no', 'roomNo', 'room']),
        date: Json.str(json, ['appointment_date', 'appointmentDate', 'date']),
        time: Json.str(json, ['appointment_time', 'appointmentTime', 'time']),
        floor: Json.str(json, ['floor']),
        status: AppointmentStatusX.fromApi(Json.strOrNull(json, ['status'])),
      );
}

/// A patient as the doctor app sees them — queue entry plus EMR snapshot.
class PatientRecord {
  const PatientRecord({
    required this.id,
    required this.name,
    required this.uhid,
    required this.time,
    required this.note,
    required this.status,
    required this.vitals,
    this.history = const [],
    this.vitalsFlagged = false,
  });

  final String id;
  final String name;
  final String uhid;

  /// Appointment time, e.g. "10:30 AM".
  final String time;

  /// "Follow-up · Cardiology"
  final String note;

  /// "Checked in" | "Waiting" | "Scheduled"
  final String status;

  /// "BP 128/84 · Pulse 78 · Temp 98.4°F"
  final String vitals;
  final List<String> history;

  /// Drives the coral alert badge on the doctor's schedule tab.
  final bool vitalsFlagged;

  factory PatientRecord.fromJson(Map<String, dynamic> json) {
    final first = Json.str(json, ['first_name', 'firstName']);
    final last = Json.str(json, ['last_name', 'lastName']);
    final combined = [first, last].where((p) => p.isNotEmpty).join(' ');

    return PatientRecord(
      id: Json.str(json, ['id', 'patient_id']),
      name: combined.isNotEmpty
          ? combined
          : Json.str(json, ['name', 'patient_name'], fallback: 'Patient'),
      uhid: Json.str(json, ['uhid', 'patient_code', 'patientCode']),
      time: Json.str(json, ['appointment_time', 'appointmentTime', 'time']),
      note: Json.str(json, ['reason', 'note', 'complaint'], fallback: 'Visit'),
      status: Json.str(json, ['status'], fallback: 'Scheduled'),
      vitals: Json.str(json, ['vitals'], fallback: 'No vitals recorded'),
      history: Json.list(json, ['history', 'timeline'])
          .map((e) => Json.str(e, ['summary', 'note', 'description']))
          .where((e) => e.isNotEmpty)
          .toList(),
      vitalsFlagged: Json.boolVal(json, ['vitals_flagged', 'vitalsFlagged']),
    );
  }
}
