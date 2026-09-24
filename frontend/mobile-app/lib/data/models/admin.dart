import 'json_utils.dart';

/// Headline counters on the admin dashboard.
class DashboardStats {
  const DashboardStats({
    required this.appointmentsToday,
    required this.admissionsToday,
    required this.revenueToday,
    required this.occupiedBeds,
    required this.totalBeds,
    this.revenueDeltaPercent = 0,
    this.appointmentsDeltaPercent = 0,
  });

  final int appointmentsToday;
  final int admissionsToday;
  final int revenueToday;
  final int occupiedBeds;
  final int totalBeds;

  /// Change vs. the previous day, signed. Drives the stat-tile delta.
  final double revenueDeltaPercent;
  final double appointmentsDeltaPercent;

  double get occupancy => totalBeds == 0 ? 0.0 : occupiedBeds / totalBeds;

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(
        appointmentsToday:
            Json.intVal(json, ['appointments_today', 'appointmentsToday']),
        admissionsToday:
            Json.intVal(json, ['admissions_today', 'admissionsToday']),
        revenueToday:
            Json.dbl(json, ['revenue_today', 'revenueToday']).round(),
        occupiedBeds: Json.intVal(json, ['occupied_beds', 'occupiedBeds']),
        totalBeds: Json.intVal(json, ['total_beds', 'totalBeds']),
        revenueDeltaPercent:
            Json.dbl(json, ['revenue_delta', 'revenueDelta']),
        appointmentsDeltaPercent:
            Json.dbl(json, ['appointments_delta', 'appointmentsDelta']),
      );
}

/// One column of the revenue chart / one bar of the department chart.
class ChartPoint {
  const ChartPoint({required this.label, required this.value});

  final String label;
  final num value;

  factory ChartPoint.fromJson(Map<String, dynamic> json) => ChartPoint(
        label: Json.str(json, ['label', 'day', 'name', 'department_name']),
        value: Json.dbl(json, ['value', 'total', 'count', 'amount']),
      );
}

class WardSummary {
  const WardSummary({
    required this.id,
    required this.name,
    required this.totalBeds,
    required this.occupiedBeds,
  });

  final String id;
  final String name;
  final int totalBeds;
  final int occupiedBeds;

  int get availableBeds => totalBeds - occupiedBeds;
  double get occupancy => totalBeds == 0 ? 0.0 : occupiedBeds / totalBeds;

  factory WardSummary.fromJson(Map<String, dynamic> json) => WardSummary(
        id: Json.str(json, ['id', 'ward_id']),
        name: Json.str(json, ['name', 'ward_name'], fallback: 'Ward'),
        totalBeds: Json.intVal(json, ['total_beds', 'totalBeds', 'total']),
        occupiedBeds:
            Json.intVal(json, ['occupied_beds', 'occupiedBeds', 'occupied']),
      );
}

enum BedStatus { available, occupied, cleaning, maintenance }

extension BedStatusX on BedStatus {
  String get label {
    switch (this) {
      case BedStatus.available:
        return 'Available';
      case BedStatus.occupied:
        return 'Occupied';
      case BedStatus.cleaning:
        return 'Cleaning';
      case BedStatus.maintenance:
        return 'Maintenance';
    }
  }

  static BedStatus fromApi(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'occupied':
      case 'in_use':
        return BedStatus.occupied;
      case 'cleaning':
        return BedStatus.cleaning;
      case 'maintenance':
      case 'out_of_service':
        return BedStatus.maintenance;
      default:
        return BedStatus.available;
    }
  }
}

class BedRecord {
  const BedRecord({
    required this.id,
    required this.number,
    required this.wardName,
    required this.status,
    this.patientName,
  });

  final String id;
  final String number;
  final String wardName;
  final BedStatus status;
  final String? patientName;

  factory BedRecord.fromJson(Map<String, dynamic> json) => BedRecord(
        id: Json.str(json, ['id']),
        number: Json.str(json, ['bed_no', 'bedNo', 'number'], fallback: '—'),
        wardName: Json.str(json, ['ward_name', 'wardName'], fallback: ''),
        status: BedStatusX.fromApi(Json.strOrNull(json, ['status'])),
        patientName: Json.strOrNull(json, ['patient_name', 'patientName']),
      );
}

class Admission {
  const Admission({
    required this.id,
    required this.patientName,
    required this.ward,
    required this.bed,
    required this.admittedOn,
    required this.status,
  });

  final String id;
  final String patientName;
  final String ward;
  final String bed;
  final String admittedOn;

  /// "Admitted" | "Discharged"
  final String status;

  factory Admission.fromJson(Map<String, dynamic> json) => Admission(
        id: Json.str(json, ['id']),
        patientName:
            Json.str(json, ['patient_name', 'patientName'], fallback: '—'),
        ward: Json.str(json, ['ward_name', 'wardName'], fallback: ''),
        bed: Json.str(json, ['bed_no', 'bedNo'], fallback: ''),
        admittedOn:
            Json.str(json, ['admitted_at', 'admittedAt', 'admission_date']),
        status: Json.str(json, ['status'], fallback: 'Admitted'),
      );
}

class Employee {
  const Employee({
    required this.id,
    required this.name,
    required this.role,
    required this.department,
    required this.phone,
    this.onDuty = true,
  });

  final String id;
  final String name;
  final String role;
  final String department;
  final String phone;
  final bool onDuty;

  factory Employee.fromJson(Map<String, dynamic> json) {
    final first = Json.str(json, ['first_name', 'firstName']);
    final last = Json.str(json, ['last_name', 'lastName']);
    final combined = [first, last].where((p) => p.isNotEmpty).join(' ');

    return Employee(
      id: Json.str(json, ['id', 'employee_id']),
      name: combined.isNotEmpty
          ? combined
          : Json.str(json, ['name', 'full_name'], fallback: 'Employee'),
      role: Json.str(json, ['designation', 'role'], fallback: 'Staff'),
      department: Json.str(json, ['department_name', 'departmentName'],
          fallback: ''),
      phone: Json.str(json, ['phone', 'contact_no', 'mobile']),
      onDuty: Json.boolVal(json, ['on_duty', 'onDuty', 'is_active'],
          fallback: true),
    );
  }
}

enum AttendanceStatus { present, late, absent, onLeave }

extension AttendanceStatusX on AttendanceStatus {
  String get label {
    switch (this) {
      case AttendanceStatus.present:
        return 'Present';
      case AttendanceStatus.late:
        return 'Late';
      case AttendanceStatus.absent:
        return 'Absent';
      case AttendanceStatus.onLeave:
        return 'On leave';
    }
  }

  static AttendanceStatus fromApi(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'late':
        return AttendanceStatus.late;
      case 'absent':
        return AttendanceStatus.absent;
      case 'leave':
      case 'on_leave':
        return AttendanceStatus.onLeave;
      default:
        return AttendanceStatus.present;
    }
  }
}

class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.name,
    required this.role,
    required this.checkIn,
    required this.status,
  });

  final String id;
  final String name;
  final String role;

  /// "8:52 AM", or empty when absent.
  final String checkIn;
  final AttendanceStatus status;

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) =>
      AttendanceRecord(
        id: Json.str(json, ['id']),
        name: Json.str(json, ['employee_name', 'employeeName', 'name'],
            fallback: '—'),
        role: Json.str(json, ['designation', 'role'], fallback: 'Staff'),
        checkIn: Json.str(json, ['check_in', 'checkIn']),
        status: AttendanceStatusX.fromApi(Json.strOrNull(json, ['status'])),
      );
}

class MedicineStock {
  const MedicineStock({
    required this.id,
    required this.name,
    required this.category,
    required this.stock,
    required this.reorderLevel,
  });

  final String id;
  final String name;
  final String category;
  final int stock;
  final int reorderLevel;

  bool get isLow => stock <= reorderLevel;

  /// Fill fraction for the stock meter, capped so a well-stocked item does not
  /// overflow the track.
  double get level {
    if (reorderLevel <= 0) return 1;
    final ratio = stock / (reorderLevel * 3);
    return ratio > 1 ? 1.0 : ratio;
  }

  factory MedicineStock.fromJson(Map<String, dynamic> json) => MedicineStock(
        id: Json.str(json, ['id']),
        name: Json.str(json, ['name', 'medicine_name'], fallback: 'Medicine'),
        category: Json.str(json, ['category', 'generic_name'], fallback: ''),
        stock: Json.intVal(json, ['stock', 'quantity', 'available_qty']),
        reorderLevel: Json.intVal(
          json,
          ['reorder_level', 'reorderLevel', 'min_qty'],
          fallback: 20,
        ),
      );
}

class BloodStock {
  const BloodStock({
    required this.group,
    required this.units,
    this.minimumUnits = 5,
  });

  /// "O+", "AB-", …
  final String group;
  final int units;
  final int minimumUnits;

  bool get isLow => units < minimumUnits;

  factory BloodStock.fromJson(Map<String, dynamic> json) => BloodStock(
        group: Json.str(json, ['blood_group', 'bloodGroup', 'group'],
            fallback: '—'),
        units: Json.intVal(json, ['units', 'available_units', 'count']),
        minimumUnits: Json.intVal(
          json,
          ['minimum_units', 'minimumUnits'],
          fallback: 5,
        ),
      );
}

class AuditEntry {
  const AuditEntry({
    required this.id,
    required this.action,
    required this.actor,
    required this.target,
    required this.at,
  });

  final String id;

  /// "Updated invoice", "Discharged patient"
  final String action;
  final String actor;
  final String target;
  final String at;

  factory AuditEntry.fromJson(Map<String, dynamic> json) => AuditEntry(
        id: Json.str(json, ['id']),
        action: Json.str(json, ['action', 'event'], fallback: 'Action'),
        actor: Json.str(json, ['user_name', 'userName', 'actor'],
            fallback: 'System'),
        target: Json.str(json, ['entity', 'module', 'target']),
        at: Json.str(json, ['created_at', 'createdAt', 'at']),
      );
}

class HospitalSetting {
  const HospitalSetting({required this.label, required this.value});

  final String label;
  final String value;

  factory HospitalSetting.fromJson(Map<String, dynamic> json) =>
      HospitalSetting(
        label: Json.str(json, ['key', 'label', 'name']),
        value: Json.str(json, ['value']),
      );
}
