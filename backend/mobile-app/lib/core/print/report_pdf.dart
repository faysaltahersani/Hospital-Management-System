import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../data/mock/mock_data.dart';
import '../../data/models/models.dart';

/// Builds and prints hospital reports.
///
/// [Printing.layoutPdf] hands the document to Android's own print service, so
/// the user gets the system dialog — a real printer, or "Save as PDF" to a
/// file. Nothing here is a mock.
///
/// The PDF deliberately sticks to Latin text: the bundled Helvetica has no
/// Bengali glyphs, so a taka sign or Bangla name would print as blank boxes.
class ReportPdf {
  ReportPdf._();

  static const _navy = PdfColor.fromInt(0xFF0E2A38);
  static const _mint = PdfColor.fromInt(0xFF1BA98C);
  static const _slate = PdfColor.fromInt(0xFF5E7480);
  static const _line = PdfColor.fromInt(0xFFE4EAEA);

  /// Prints one record.
  static Future<void> printOne(MedicalReport report) {
    return Printing.layoutPdf(
      name: '${report.patientName} — ${report.title}',
      onLayout: (format) => build(
        title: report.title,
        patientName: report.patientName,
        uhid: report.patientUhid,
        reports: [report],
        format: format,
      ),
    );
  }

  /// Prints a patient's whole file as a single document.
  static Future<void> printFile({
    required String patientName,
    required String uhid,
    required List<MedicalReport> reports,
  }) {
    return Printing.layoutPdf(
      name: '$patientName — medical records',
      onLayout: (format) => build(
        title: 'Medical records',
        patientName: patientName,
        uhid: uhid,
        reports: reports,
        format: format,
      ),
    );
  }

  static Future<Uint8List> build({
    required String title,
    required String patientName,
    required String uhid,
    required List<MedicalReport> reports,
    required PdfPageFormat format,
  }) async {
    final doc = pw.Document(title: '$patientName — $title');

    doc.addPage(
      pw.MultiPage(
        pageFormat: format,
        margin: const pw.EdgeInsets.fromLTRB(36, 36, 36, 42),
        header: (context) =>
            context.pageNumber == 1 ? _letterhead() : pw.SizedBox(),
        footer: _footer,
        build: (context) => [
          _patientBlock(patientName: patientName, uhid: uhid, title: title),
          pw.SizedBox(height: 20),
          for (final report in reports) _reportBlock(report),
        ],
      ),
    );

    return doc.save();
  }

  static pw.Widget _letterhead() {
    return pw.Container(
      padding: const pw.EdgeInsets.only(bottom: 12),
      margin: const pw.EdgeInsets.only(bottom: 18),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: _navy, width: 2)),
      ),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.end,
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                MockData.hospitalName,
                style: const pw.TextStyle(
                  fontSize: 17,
                  fontWeight: pw.FontWeight.bold,
                  color: _navy,
                ),
              ),
              pw.SizedBox(height: 3),
              pw.Text(
                '42 Shantinagar, Dhaka 1217  |  +880 2 8391 4460',
                style: const pw.TextStyle(fontSize: 8.5, color: _slate),
              ),
            ],
          ),
          pw.Text(
            'PATIENT REPORT',
            style: const pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
              color: _mint,
              letterSpacing: 1.4,
            ),
          ),
        ],
      ),
    );
  }

  static pw.Widget _patientBlock({
    required String patientName,
    required String uhid,
    required String title,
  }) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(12),
      decoration: pw.BoxDecoration(
        color: const PdfColor.fromInt(0xFFF4F7F6),
        borderRadius: pw.BorderRadius.circular(6),
      ),
      child: pw.Row(
        children: [
          _field('Patient', patientName),
          _field('UHID', uhid.isEmpty ? '—' : uhid),
          _field('Document', title),
        ],
      ),
    );
  }

  static pw.Widget _field(String label, String value) {
    return pw.Expanded(
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            label.toUpperCase(),
            style: const pw.TextStyle(fontSize: 7, color: _slate),
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            value,
            style: const pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }

  static pw.Widget _reportBlock(MedicalReport report) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 18),
      padding: const pw.EdgeInsets.only(bottom: 14),
      decoration: const pw.BoxDecoration(
        border: pw.Border(bottom: pw.BorderSide(color: _line)),
      ),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Expanded(
                child: pw.Text(
                  report.title,
                  style: const pw.TextStyle(
                    fontSize: 13,
                    fontWeight: pw.FontWeight.bold,
                    color: _navy,
                  ),
                ),
              ),
              pw.Text(
                report.date,
                style: const pw.TextStyle(fontSize: 9, color: _slate),
              ),
            ],
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            report.source,
            style: const pw.TextStyle(fontSize: 9, color: _mint),
          ),
          if (report.body.isNotEmpty) ...[
            pw.SizedBox(height: 10),
            for (final line in report.body)
              pw.Padding(
                padding: const pw.EdgeInsets.only(bottom: 4),
                child: pw.Row(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Container(
                      width: 3,
                      height: 3,
                      margin: const pw.EdgeInsets.only(top: 4, right: 7),
                      decoration: const pw.BoxDecoration(
                        color: _mint,
                        shape: pw.BoxShape.circle,
                      ),
                    ),
                    pw.Expanded(
                      child: pw.Text(
                        line,
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ),
          ] else ...[
            pw.SizedBox(height: 8),
            pw.Text(
              'No detail recorded for this document.',
              style: const pw.TextStyle(fontSize: 9.5, color: _slate),
            ),
          ],
        ],
      ),
    );
  }

  static pw.Widget _footer(pw.Context context) {
    return pw.Container(
      padding: const pw.EdgeInsets.only(top: 10),
      decoration: const pw.BoxDecoration(
        border: pw.Border(top: pw.BorderSide(color: _line)),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(
            'Computer generated. Not valid without the hospital seal.',
            style: const pw.TextStyle(fontSize: 7.5, color: _slate),
          ),
          pw.Text(
            'Page ${context.pageNumber} of ${context.pagesCount}',
            style: const pw.TextStyle(fontSize: 7.5, color: _slate),
          ),
        ],
      ),
    );
  }
}
