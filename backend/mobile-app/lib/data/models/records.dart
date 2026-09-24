import 'json_utils.dart';

/// Decides the icon and tint used in the reports list.
enum ReportKind { radiology, lab, prescription, cardiology }

class MedicalReport {
  const MedicalReport({
    required this.id,
    required this.title,
    required this.source,
    required this.date,
    required this.kind,
    this.patientUhid = '',
    this.patientName = '',
    this.body = const [],
  });

  final String id;
  final String title;

  /// "PACS · Radiology", "Lab Report", "Digital Rx"
  final String source;
  final String date;
  final ReportKind kind;

  /// Who the report belongs to. Records are filed against the hospital ID, so
  /// one list serves both the patient's own view and the admin's.
  final String patientUhid;
  final String patientName;

  /// Line items shown on the printed report — "Haemoglobin · 13.4 g/dL".
  final List<String> body;

  factory MedicalReport.fromJson(Map<String, dynamic> json) {
    final category =
        Json.str(json, ['category', 'type', 'module']).toLowerCase();
    final kind = switch (category) {
      final c when c.contains('radiolog') || c.contains('pacs') =>
        ReportKind.radiology,
      final c when c.contains('prescription') || c.contains('rx') =>
        ReportKind.prescription,
      final c when c.contains('cardio') || c.contains('ecg') =>
        ReportKind.cardiology,
      _ => ReportKind.lab,
    };

    return MedicalReport(
      id: Json.str(json, ['id']),
      title: Json.str(json, ['title', 'test_name', 'name'],
          fallback: 'Report'),
      source: Json.str(json, ['source', 'category', 'department_name'],
          fallback: 'Report'),
      date: Json.str(json, ['created_at', 'createdAt', 'date']),
      kind: kind,
      patientUhid: Json.str(json, ['uhid', 'patient_code', 'patientCode']),
      patientName: Json.str(json, ['patient_name', 'patientName']),
      body: Json.list(json, ['items', 'results'])
          .map((e) {
            final label = Json.str(e, ['name', 'parameter', 'test_name']);
            final value = Json.str(e, ['result', 'value']);
            final unit = Json.str(e, ['unit']);
            if (label.isEmpty) return '';
            return [label, [value, unit].where((p) => p.isNotEmpty).join(' ')]
                .where((p) => p.isNotEmpty)
                .join(' · ');
          })
          .where((line) => line.isNotEmpty)
          .toList(),
    );
  }
}

class Medicine {
  const Medicine({required this.name, required this.dosage});

  final String name;

  /// "1-0-1 · After meal"
  final String dosage;

  factory Medicine.fromJson(Map<String, dynamic> json) => Medicine(
        name: Json.str(json, ['medicine_name', 'medicineName', 'name']),
        dosage: Json.str(
          json,
          ['dosage', 'instruction', 'instructions'],
          fallback: 'As directed',
        ),
      );

  Map<String, dynamic> toJson() => {
        'medicine_name': name,
        'dosage': dosage,
      };
}

class Prescription {
  const Prescription({
    required this.id,
    required this.patientName,
    required this.date,
    required this.medicines,
  });

  final String id;
  final String patientName;
  final String date;
  final List<Medicine> medicines;

  int get medicineCount => medicines.length;

  factory Prescription.fromJson(Map<String, dynamic> json) => Prescription(
        id: Json.str(json, ['id']),
        patientName:
            Json.str(json, ['patient_name', 'patientName'], fallback: '—'),
        date: Json.str(json, ['created_at', 'createdAt', 'date']),
        medicines: Json.list(json, ['items', 'medicines'])
            .map(Medicine.fromJson)
            .toList(),
      );
}

enum InvoiceStatus { due, paid }

extension InvoiceStatusX on InvoiceStatus {
  String get label => this == InvoiceStatus.due ? 'Due' : 'Paid';

  static InvoiceStatus fromApi(String? value) {
    final text = (value ?? '').toLowerCase();
    return text == 'paid' || text == 'settled'
        ? InvoiceStatus.paid
        : InvoiceStatus.due;
  }
}

class Invoice {
  const Invoice({
    required this.id,
    required this.title,
    required this.amount,
    required this.status,
  });

  final String id;

  /// "Radiology — Invoice #4821"
  final String title;
  final int amount;
  final InvoiceStatus status;

  String get formattedAmount => formatTaka(amount);

  Invoice copyWith({InvoiceStatus? status}) => Invoice(
        id: id,
        title: title,
        amount: amount,
        status: status ?? this.status,
      );

  factory Invoice.fromJson(Map<String, dynamic> json) {
    final number = Json.str(json, ['invoice_no', 'invoiceNo', 'id']);
    final department = Json.str(json, ['department_name', 'category', 'type']);
    final title = department.isEmpty
        ? 'Invoice #$number'
        : '$department — Invoice #$number';

    final total = Json.dbl(json, ['total', 'grand_total', 'grandTotal']);
    final paid = Json.dbl(json, ['paid_amount', 'paidAmount']);
    final due = Json.dbl(json, ['due_amount', 'dueAmount'],
        fallback: total - paid);

    return Invoice(
      id: Json.str(json, ['id']),
      title: title,
      amount: (due > 0 ? due : total).round(),
      status: due > 0
          ? InvoiceStatus.due
          : InvoiceStatusX.fromApi(Json.strOrNull(json, ['status'])),
    );
  }
}
