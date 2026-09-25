'use strict';

const sequelize = require('../config/database');

// Identity & access
const User = require('./User')(sequelize);
const RefreshToken = require('./RefreshToken')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// Organization
const Organization = require('./Organization')(sequelize);
const Hospital = require('./Hospital')(sequelize);
const Branch = require('./Branch')(sequelize);
const Department = require('./Department')(sequelize);

// Patients & doctors
const Patient = require('./Patient')(sequelize);
const Doctor = require('./Doctor')(sequelize);
const Appointment = require('./Appointment')(sequelize);
const PatientAllergy = require('./PatientAllergy')(sequelize);
const PatientProblem = require('./PatientProblem')(sequelize);
const PatientHistory = require('./PatientHistory')(sequelize);
const VitalSign = require('./VitalSign')(sequelize);
const ClinicalNote = require('./ClinicalNote')(sequelize);
const WorkflowDefinition = require('./WorkflowDefinition')(sequelize);
const WorkflowStep = require('./WorkflowStep')(sequelize);
const ApprovalRequest = require('./ApprovalRequest')(sequelize);
const ApprovalAction = require('./ApprovalAction')(sequelize);

// Emergency clinical operations
const EmergencyEncounter = require('./EmergencyEncounter')(sequelize);
const EmergencyTriage = require('./EmergencyTriage')(sequelize);
const EmergencyDoctorAssignment = require('./EmergencyDoctorAssignment')(sequelize);
const EmergencyAssessment = require('./EmergencyAssessment')(sequelize);
const EmergencyOrder = require('./EmergencyOrder')(sequelize);
const EmergencyProcedure = require('./EmergencyProcedure')(sequelize);
const EmergencyObservation = require('./EmergencyObservation')(sequelize);
const EmergencyDisposition = require('./EmergencyDisposition')(sequelize);

// OPD / IPD / beds
const Ward = require('./Ward')(sequelize);
const Bed = require('./Bed')(sequelize);
const Admission = require('./Admission')(sequelize);
const OpdVisit = require('./OpdVisit')(sequelize);
const AdmissionPayment = require('./AdmissionPayment')(sequelize);

// Pharmacy
const Medicine = require('./Medicine')(sequelize);
const MedicineSale = require('./MedicineSale')(sequelize);
const MedicineSaleItem = require('./MedicineSaleItem')(sequelize);
const MedicineBatch = require('./MedicineBatch')(sequelize);

// Prescription
const Prescription = require('./Prescription')(sequelize);
const PrescriptionItem = require('./PrescriptionItem')(sequelize);

// Pathology
const LabTest = require('./LabTest')(sequelize);
const LabOrder = require('./LabOrder')(sequelize);
const LabOrderItem = require('./LabOrderItem')(sequelize);
const PathologyParameter = require('./PathologyParameter')(sequelize);

// Radiology
const RadiologyTest = require('./RadiologyTest')(sequelize);
const RadiologyOrder = require('./RadiologyOrder')(sequelize);
const RadiologyParameter = require('./RadiologyParameter')(sequelize);

// Diagnostics — the clinical layer over pathology/radiology plus the categories
// that had no module of their own (cardiology, histopathology, microbiology,
// cytology, ophthalmology, ENT, dental, pulmonary, specialized).
const DiagnosticStudy = require('./DiagnosticStudy')(sequelize);
const DiagnosticResultParameter = require('./DiagnosticResultParameter')(sequelize);
const DiagnosticMeasurement = require('./DiagnosticMeasurement')(sequelize);
const DiagnosticFinding = require('./DiagnosticFinding')(sequelize);
const DiagnosticOrganism = require('./DiagnosticOrganism')(sequelize);
const DiagnosticSensitivity = require('./DiagnosticSensitivity')(sequelize);
const DiagnosticAttachment = require('./DiagnosticAttachment')(sequelize);
const DiagnosticReport = require('./DiagnosticReport')(sequelize);
const DiagnosticReportVersion = require('./DiagnosticReportVersion')(sequelize);
const DiagnosticImagingSeries = require('./DiagnosticImagingSeries')(sequelize);

// Finance
const Invoice = require('./Invoice')(sequelize);
const InvoiceItem = require('./InvoiceItem')(sequelize);
const Payment = require('./Payment')(sequelize);
const ExpenseCategory = require('./ExpenseCategory')(sequelize);
const Expense = require('./Expense')(sequelize);
const IncomeEntry = require('./IncomeEntry')(sequelize);
const ContraEntry = require('./ContraEntry')(sequelize);

// Ambulance
const Ambulance = require('./Ambulance')(sequelize);
const AmbulanceTrip = require('./AmbulanceTrip')(sequelize);

// Blood bank
const BloodDonor = require('./BloodDonor')(sequelize);
const BloodBag = require('./BloodBag')(sequelize);
const BloodIssue = require('./BloodIssue')(sequelize);

// Referral
const Referral = require('./Referral')(sequelize);

// HR & payroll
const Employee = require('./Employee')(sequelize);
const Attendance = require('./Attendance')(sequelize);
const Payroll = require('./Payroll')(sequelize);

// Settings / master data
const Setting = require('./Setting')(sequelize);
const MasterOption = require('./MasterOption')(sequelize);
const ServiceType = require('./ServiceType')(sequelize);
const ServiceCategory = require('./ServiceCategory')(sequelize);
const Service = require('./Service')(sequelize);
const ServicePrice = require('./ServicePrice')(sequelize);
const PricingRule = require('./PricingRule')(sequelize);
const ServiceSourceLink = require('./ServiceSourceLink')(sequelize);

/* ====== Associations ====== */

// Enterprise organization hierarchy
Organization.hasMany(Hospital, { foreignKey: 'organization_id', as: 'hospitals' });
Hospital.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Hospital.hasMany(Branch, { foreignKey: 'hospital_id', as: 'branches' });
Branch.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });

Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Hospital.hasMany(User, { foreignKey: 'hospital_id', as: 'users' });
User.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Users
User.hasOne(Patient, { foreignKey: 'user_id', as: 'patient_profile' });
Patient.belongsTo(User, { foreignKey: 'user_id', as: 'patient_user' });
User.hasMany(Patient, { foreignKey: 'created_by', as: 'created_patients' });
Patient.belongsTo(User, { foreignKey: 'created_by', as: 'user' });

User.hasOne(Doctor, { foreignKey: 'user_id', as: 'doctor_profile' });
Doctor.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'audit_logs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Patient.hasMany(PatientAllergy, { foreignKey: 'patient_id', as: 'allergies' });
PatientAllergy.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Patient.hasMany(PatientProblem, { foreignKey: 'patient_id', as: 'problems' });
PatientProblem.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Patient.hasMany(PatientHistory, { foreignKey: 'patient_id', as: 'medical_histories' });
PatientHistory.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Patient.hasMany(VitalSign, { foreignKey: 'patient_id', as: 'vital_signs' });
VitalSign.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Patient.hasMany(ClinicalNote, { foreignKey: 'patient_id', as: 'clinical_notes' });
ClinicalNote.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
PatientAllergy.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
PatientProblem.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
PatientHistory.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
VitalSign.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });
ClinicalNote.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// Configurable workflow and approval engine
Organization.hasMany(WorkflowDefinition, { foreignKey: 'organization_id', as: 'workflow_definitions' });
WorkflowDefinition.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
WorkflowDefinition.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
WorkflowDefinition.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
WorkflowDefinition.hasMany(WorkflowStep, { foreignKey: 'workflow_definition_id', as: 'steps' });
WorkflowStep.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'definition' });
WorkflowStep.belongsTo(User, { foreignKey: 'approver_user_id', as: 'approver_user' });
WorkflowDefinition.hasMany(ApprovalRequest, { foreignKey: 'workflow_definition_id', as: 'requests' });
ApprovalRequest.belongsTo(WorkflowDefinition, { foreignKey: 'workflow_definition_id', as: 'definition' });
ApprovalRequest.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
ApprovalRequest.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
ApprovalRequest.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
ApprovalRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });
ApprovalRequest.hasMany(ApprovalAction, { foreignKey: 'approval_request_id', as: 'actions' });
ApprovalAction.belongsTo(ApprovalRequest, { foreignKey: 'approval_request_id', as: 'request' });
ApprovalAction.belongsTo(WorkflowStep, { foreignKey: 'workflow_step_id', as: 'step' });
ApprovalAction.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });

// Department / doctor
Department.hasMany(Doctor, { foreignKey: 'department_id', as: 'doctors' });
Doctor.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Appointment
Patient.hasMany(Appointment, { foreignKey: 'patient_id', as: 'appointments' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

Doctor.hasMany(Appointment, { foreignKey: 'doctor_id', as: 'appointments' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

Department.hasMany(Appointment, { foreignKey: 'department_id', as: 'appointments' });
Appointment.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

User.hasMany(Appointment, { foreignKey: 'created_by', as: 'created_appointments' });
Appointment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// OPD
Patient.hasMany(OpdVisit, { foreignKey: 'patient_id', as: 'opd_visits' });
OpdVisit.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(OpdVisit, { foreignKey: 'doctor_id', as: 'opd_visits' });
OpdVisit.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
Department.hasMany(OpdVisit, { foreignKey: 'department_id', as: 'opd_visits' });
OpdVisit.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Appointment.hasOne(OpdVisit, { foreignKey: 'appointment_id', as: 'opd_visit' });
OpdVisit.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

// Wards & beds
Ward.hasMany(Bed, { foreignKey: 'ward_id', as: 'beds' });
Bed.belongsTo(Ward, { foreignKey: 'ward_id', as: 'ward' });

// Admission
Patient.hasMany(Admission, { foreignKey: 'patient_id', as: 'admissions' });
Admission.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(Admission, { foreignKey: 'doctor_id', as: 'admissions' });
Admission.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
Ward.hasMany(Admission, { foreignKey: 'ward_id', as: 'admissions' });
Admission.belongsTo(Ward, { foreignKey: 'ward_id', as: 'ward' });
Bed.hasMany(Admission, { foreignKey: 'bed_id', as: 'admissions' });
Admission.belongsTo(Bed, { foreignKey: 'bed_id', as: 'bed' });
User.hasMany(Admission, { foreignKey: 'created_by', as: 'created_admissions' });
Admission.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// IPD payments as first-class records (BUG-005)
Admission.hasMany(AdmissionPayment, { foreignKey: 'admission_id', as: 'payment_records' });
AdmissionPayment.belongsTo(Admission, { foreignKey: 'admission_id', as: 'admission' });
User.hasMany(AdmissionPayment, { foreignKey: 'received_by', as: 'admission_payments_received' });
AdmissionPayment.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });

// Medicine / sale
// Batch stock (BUG-012 / BUG-026)
Medicine.hasMany(MedicineBatch, { foreignKey: 'medicine_id', as: 'batches' });
MedicineBatch.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' });

Medicine.hasMany(MedicineSaleItem, { foreignKey: 'medicine_id', as: 'sale_items' });
MedicineSaleItem.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' });

MedicineSale.hasMany(MedicineSaleItem, { foreignKey: 'sale_id', as: 'items' });
MedicineSaleItem.belongsTo(MedicineSale, { foreignKey: 'sale_id', as: 'sale' });

Patient.hasMany(MedicineSale, { foreignKey: 'patient_id', as: 'medicine_sales' });
MedicineSale.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

User.hasMany(MedicineSale, { foreignKey: 'sold_by', as: 'medicine_sales_made' });
MedicineSale.belongsTo(User, { foreignKey: 'sold_by', as: 'cashier' });

// Prescription
Patient.hasMany(Prescription, { foreignKey: 'patient_id', as: 'prescriptions' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(Prescription, { foreignKey: 'doctor_id', as: 'prescriptions' });
Prescription.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
Appointment.hasMany(Prescription, { foreignKey: 'appointment_id', as: 'prescriptions' });
Prescription.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Prescription.hasMany(PrescriptionItem, { foreignKey: 'prescription_id', as: 'items' });
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });
Medicine.hasMany(PrescriptionItem, { foreignKey: 'medicine_id', as: 'prescription_items' });
PrescriptionItem.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' });

Prescription.hasMany(MedicineSale, { foreignKey: 'prescription_id', as: 'sales' });
MedicineSale.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' });

// Pathology
Patient.hasMany(LabOrder, { foreignKey: 'patient_id', as: 'lab_orders' });
LabOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(LabOrder, { foreignKey: 'doctor_id', as: 'lab_orders' });
LabOrder.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

LabOrder.hasMany(LabOrderItem, { foreignKey: 'order_id', as: 'items' });
LabOrderItem.belongsTo(LabOrder, { foreignKey: 'order_id', as: 'order' });
LabTest.hasMany(LabOrderItem, { foreignKey: 'test_id', as: 'order_items' });
LabOrderItem.belongsTo(LabTest, { foreignKey: 'test_id', as: 'test' });

// Radiology
Patient.hasMany(RadiologyOrder, { foreignKey: 'patient_id', as: 'radiology_orders' });
RadiologyOrder.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(RadiologyOrder, { foreignKey: 'doctor_id', as: 'radiology_orders' });
RadiologyOrder.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
RadiologyTest.hasMany(RadiologyOrder, { foreignKey: 'test_id', as: 'orders' });
RadiologyOrder.belongsTo(RadiologyTest, { foreignKey: 'test_id', as: 'test' });

// Diagnostics
Patient.hasMany(DiagnosticStudy, { foreignKey: 'patient_id', as: 'diagnostic_studies' });
DiagnosticStudy.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
DiagnosticStudy.belongsTo(Doctor, { foreignKey: 'referring_doctor_id', as: 'referring_doctor' });
DiagnosticStudy.belongsTo(Doctor, { foreignKey: 'performing_doctor_id', as: 'performing_doctor' });
DiagnosticStudy.belongsTo(User, { foreignKey: 'performing_user_id', as: 'performing_user' });
DiagnosticStudy.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });
DiagnosticStudy.belongsTo(User, { foreignKey: 'finalized_by', as: 'finalizer' });
DiagnosticStudy.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
DiagnosticStudy.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

DiagnosticStudy.hasMany(DiagnosticResultParameter, { foreignKey: 'study_id', as: 'parameters' });
DiagnosticResultParameter.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });

DiagnosticStudy.hasMany(DiagnosticMeasurement, { foreignKey: 'study_id', as: 'measurements' });
DiagnosticMeasurement.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });

DiagnosticStudy.hasMany(DiagnosticFinding, { foreignKey: 'study_id', as: 'findings' });
DiagnosticFinding.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });

DiagnosticStudy.hasMany(DiagnosticOrganism, { foreignKey: 'study_id', as: 'organisms' });
DiagnosticOrganism.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
DiagnosticOrganism.hasMany(DiagnosticSensitivity, { foreignKey: 'organism_id', as: 'sensitivities' });
DiagnosticSensitivity.belongsTo(DiagnosticOrganism, { foreignKey: 'organism_id', as: 'organism' });

DiagnosticStudy.hasMany(DiagnosticAttachment, { foreignKey: 'study_id', as: 'attachments' });
DiagnosticAttachment.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
DiagnosticAttachment.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
DiagnosticAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
Patient.hasMany(DiagnosticAttachment, { foreignKey: 'patient_id', as: 'diagnostic_attachments' });

DiagnosticStudy.hasOne(DiagnosticReport, { foreignKey: 'study_id', as: 'report' });
DiagnosticReport.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
DiagnosticReport.belongsTo(DiagnosticAttachment, { foreignKey: 'pdf_attachment_id', as: 'pdf' });
DiagnosticReport.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });
DiagnosticReport.belongsTo(User, { foreignKey: 'generated_by', as: 'generator' });

/* ── report versions: the permanent record ─────────────────────────────────── */
// Ordered oldest-first so a version list reads as a history.
DiagnosticReport.hasMany(DiagnosticReportVersion, { foreignKey: 'report_id', as: 'versions' });
DiagnosticReportVersion.belongsTo(DiagnosticReport, { foreignKey: 'report_id', as: 'report' });
DiagnosticReport.belongsTo(DiagnosticReportVersion, { foreignKey: 'current_version_id', as: 'current_version' });
DiagnosticStudy.hasMany(DiagnosticReportVersion, { foreignKey: 'study_id', as: 'report_versions' });
DiagnosticReportVersion.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
// The patient owns the history permanently, independent of study or encounter.
Patient.hasMany(DiagnosticReportVersion, { foreignKey: 'patient_id', as: 'diagnostic_report_versions' });
DiagnosticReportVersion.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
DiagnosticReportVersion.belongsTo(DiagnosticAttachment, { foreignKey: 'pdf_attachment_id', as: 'pdf' });
DiagnosticReportVersion.belongsTo(User, { foreignKey: 'issued_by', as: 'issuer' });
DiagnosticReportVersion.belongsTo(User, { foreignKey: 'verified_by', as: 'verifier' });
// Self-references form the amendment chain in both directions.
DiagnosticReportVersion.belongsTo(DiagnosticReportVersion, { foreignKey: 'amends_version_id', as: 'amends' });
DiagnosticReportVersion.belongsTo(DiagnosticReportVersion, { foreignKey: 'superseded_by_id', as: 'superseded_by' });

/* ── imaging series: Patient -> Study -> Series -> Image ───────────────────── */
DiagnosticStudy.hasMany(DiagnosticImagingSeries, { foreignKey: 'study_id', as: 'series' });
DiagnosticImagingSeries.belongsTo(DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
DiagnosticImagingSeries.hasMany(DiagnosticAttachment, { foreignKey: 'series_id', as: 'images' });
DiagnosticAttachment.belongsTo(DiagnosticImagingSeries, { foreignKey: 'series_id', as: 'series' });
DiagnosticImagingSeries.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

/* ── attachment lineage ────────────────────────────────────────────────────── */
DiagnosticAttachment.belongsTo(DiagnosticAttachment, { foreignKey: 'superseded_by_id', as: 'replacement' });
DiagnosticAttachment.belongsTo(DiagnosticReportVersion, { foreignKey: 'report_version_id', as: 'report_version' });
DiagnosticReport.belongsTo(User, { foreignKey: 'last_printed_by', as: 'printer' });

// The link to the ordering module is (source_type, source_id) rather than a pair
// of nullable foreign keys, so adding a future source needs no schema change.
// These helpers keep that lookup in one place.
DiagnosticStudy.prototype.sourceRef = function sourceRef() {
  return this.source_id ? { type: this.source_type, id: Number(this.source_id) } : null;
};

// Invoice / payment
Patient.hasMany(Invoice, { foreignKey: 'patient_id', as: 'invoices' });
Invoice.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
// Encounter -> invoice links (BUG-004 / BUG-042): OPD and IPD revenue must land
// in invoices/payments rather than being derived or fabricated.
OpdVisit.hasOne(Invoice, { foreignKey: 'opd_visit_id', as: 'invoice' });
Invoice.belongsTo(OpdVisit, { foreignKey: 'opd_visit_id', as: 'opd_visit' });
Admission.hasMany(Invoice, { foreignKey: 'admission_id', as: 'invoices' });
Invoice.belongsTo(Admission, { foreignKey: 'admission_id', as: 'admission' });

LabOrder.hasOne(Invoice, { foreignKey: 'lab_order_id', as: 'invoice' });
Invoice.belongsTo(LabOrder, { foreignKey: 'lab_order_id', as: 'lab_order' });
RadiologyOrder.hasOne(Invoice, { foreignKey: 'radiology_order_id', as: 'invoice' });
Invoice.belongsTo(RadiologyOrder, { foreignKey: 'radiology_order_id', as: 'radiology_order' });
BloodIssue.hasOne(Invoice, { foreignKey: 'blood_issue_id', as: 'invoice' });
Invoice.belongsTo(BloodIssue, { foreignKey: 'blood_issue_id', as: 'blood_issue' });
AmbulanceTrip.hasOne(Invoice, { foreignKey: 'ambulance_trip_id', as: 'invoice' });
Invoice.belongsTo(AmbulanceTrip, { foreignKey: 'ambulance_trip_id', as: 'ambulance_trip' });

Appointment.hasMany(Invoice, { foreignKey: 'appointment_id', as: 'invoices' });
Invoice.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

// Enterprise service and charge catalogue. Source links preserve compatibility
// with existing clinical masters while every invoice line keeps its price evidence.
Organization.hasMany(ServiceType, { foreignKey: 'organization_id', as: 'service_types' });
ServiceType.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
ServiceType.hasMany(ServiceCategory, { foreignKey: 'service_type_id', as: 'categories' });
ServiceCategory.belongsTo(ServiceType, { foreignKey: 'service_type_id', as: 'type' });
ServiceCategory.hasMany(Service, { foreignKey: 'service_category_id', as: 'services' });
Service.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'category' });
Service.belongsTo(ServiceType, { foreignKey: 'service_type_id', as: 'type' });
Service.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Service.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
Service.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Service.hasMany(ServicePrice, { foreignKey: 'service_id', as: 'prices' });
ServicePrice.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
ServicePrice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
ServicePrice.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
ServicePrice.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Service.hasMany(PricingRule, { foreignKey: 'service_id', as: 'pricing_rules' });
PricingRule.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
PricingRule.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
PricingRule.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' });
PricingRule.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
ServiceCategory.hasMany(PricingRule, { foreignKey: 'service_category_id', as: 'pricing_rules' });
PricingRule.belongsTo(ServiceCategory, { foreignKey: 'service_category_id', as: 'category' });
Service.hasMany(ServiceSourceLink, { foreignKey: 'service_id', as: 'source_links' });
ServiceSourceLink.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
InvoiceItem.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
InvoiceItem.belongsTo(ServicePrice, { foreignKey: 'service_price_id', as: 'service_price' });

Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
User.hasMany(Payment, { foreignKey: 'received_by', as: 'payments_received' });
Payment.belongsTo(User, { foreignKey: 'received_by', as: 'receiver' });

ExpenseCategory.hasMany(Expense, { foreignKey: 'category_id', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'category_id', as: 'category' });

// Ambulance
Ambulance.hasMany(AmbulanceTrip, { foreignKey: 'ambulance_id', as: 'trips' });
AmbulanceTrip.belongsTo(Ambulance, { foreignKey: 'ambulance_id', as: 'ambulance' });
Patient.hasMany(AmbulanceTrip, { foreignKey: 'patient_id', as: 'ambulance_trips' });
AmbulanceTrip.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Blood bank
BloodDonor.hasMany(BloodBag, { foreignKey: 'donor_id', as: 'bags' });
BloodBag.belongsTo(BloodDonor, { foreignKey: 'donor_id', as: 'donor' });
BloodBag.hasMany(BloodIssue, { foreignKey: 'bag_id', as: 'issues' });
BloodIssue.belongsTo(BloodBag, { foreignKey: 'bag_id', as: 'bag' });
Patient.hasMany(BloodIssue, { foreignKey: 'patient_id', as: 'blood_issues' });
BloodIssue.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });

// Referral
Patient.hasMany(Referral, { foreignKey: 'patient_id', as: 'referrals' });
Referral.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Doctor.hasMany(Referral, { foreignKey: 'from_doctor_id', as: 'referrals_made' });
Referral.belongsTo(Doctor, { foreignKey: 'from_doctor_id', as: 'from_doctor' });
Doctor.hasMany(Referral, { foreignKey: 'to_doctor_id', as: 'referrals_received' });
Referral.belongsTo(Doctor, { foreignKey: 'to_doctor_id', as: 'to_doctor' });

// Emergency clinical operations. The encounter is the single owner of the
// Emergency timeline; linked modules remain the source of truth for their own
// records (investigations, prescriptions, invoices, beds and admissions).
Patient.hasMany(EmergencyEncounter, { foreignKey: 'patient_id', as: 'emergency_encounters' });
EmergencyEncounter.belongsTo(Patient, { foreignKey: 'patient_id', as: 'patient' });
Department.hasMany(EmergencyEncounter, { foreignKey: 'department_id', as: 'emergency_encounters' });
EmergencyEncounter.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Doctor.hasMany(EmergencyEncounter, { foreignKey: 'assigned_doctor_id', as: 'assigned_emergency_encounters' });
EmergencyEncounter.belongsTo(Doctor, { foreignKey: 'assigned_doctor_id', as: 'assigned_doctor' });
Bed.hasMany(EmergencyEncounter, { foreignKey: 'current_bed_id', as: 'current_emergency_encounters' });
EmergencyEncounter.belongsTo(Bed, { foreignKey: 'current_bed_id', as: 'current_bed' });
Admission.hasOne(EmergencyEncounter, { foreignKey: 'admission_id', as: 'emergency_encounter' });
EmergencyEncounter.belongsTo(Admission, { foreignKey: 'admission_id', as: 'admission' });
EmergencyEncounter.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
EmergencyEncounter.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

EmergencyEncounter.hasMany(EmergencyTriage, { foreignKey: 'emergency_encounter_id', as: 'triages' });
EmergencyTriage.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyTriage.belongsTo(User, { foreignKey: 'triage_nurse_id', as: 'triage_nurse' });
EmergencyTriage.belongsTo(VitalSign, { foreignKey: 'vital_sign_id', as: 'vital_sign' });

EmergencyEncounter.hasMany(EmergencyDoctorAssignment, { foreignKey: 'emergency_encounter_id', as: 'doctor_assignments' });
EmergencyDoctorAssignment.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyDoctorAssignment.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });
EmergencyDoctorAssignment.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });

EmergencyEncounter.hasMany(EmergencyAssessment, { foreignKey: 'emergency_encounter_id', as: 'assessments' });
EmergencyAssessment.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyAssessment.belongsTo(User, { foreignKey: 'assessed_by', as: 'assessor' });
EmergencyAssessment.belongsTo(ClinicalNote, { foreignKey: 'clinical_note_id', as: 'clinical_note' });

EmergencyEncounter.hasMany(EmergencyOrder, { foreignKey: 'emergency_encounter_id', as: 'emergency_orders' });
EmergencyOrder.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyOrder.belongsTo(User, { foreignKey: 'requested_by', as: 'requester' });

EmergencyEncounter.hasMany(EmergencyProcedure, { foreignKey: 'emergency_encounter_id', as: 'procedures' });
EmergencyProcedure.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyProcedure.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
EmergencyProcedure.belongsTo(ServicePrice, { foreignKey: 'service_price_id', as: 'service_price' });
EmergencyProcedure.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
EmergencyProcedure.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });
EmergencyProcedure.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

EmergencyEncounter.hasMany(EmergencyObservation, { foreignKey: 'emergency_encounter_id', as: 'observations' });
EmergencyObservation.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyObservation.belongsTo(Bed, { foreignKey: 'bed_id', as: 'bed' });
EmergencyObservation.belongsTo(User, { foreignKey: 'assigned_by', as: 'assigner' });
EmergencyObservation.belongsTo(User, { foreignKey: 'ended_by', as: 'ender' });

EmergencyEncounter.hasMany(EmergencyDisposition, { foreignKey: 'emergency_encounter_id', as: 'dispositions' });
EmergencyDisposition.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'encounter' });
EmergencyDisposition.belongsTo(Admission, { foreignKey: 'admission_id', as: 'admission' });
EmergencyDisposition.belongsTo(Referral, { foreignKey: 'referral_id', as: 'referral' });
EmergencyDisposition.belongsTo(ApprovalRequest, { foreignKey: 'workflow_request_id', as: 'workflow_request' });
EmergencyDisposition.belongsTo(User, { foreignKey: 'disposed_by', as: 'disposer' });

EmergencyEncounter.hasMany(LabOrder, { foreignKey: 'emergency_encounter_id', as: 'lab_orders' });
LabOrder.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'emergency_encounter' });
EmergencyEncounter.hasMany(RadiologyOrder, { foreignKey: 'emergency_encounter_id', as: 'radiology_orders' });
RadiologyOrder.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'emergency_encounter' });
EmergencyEncounter.hasMany(Prescription, { foreignKey: 'emergency_encounter_id', as: 'prescriptions' });
Prescription.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'emergency_encounter' });
EmergencyEncounter.hasMany(Invoice, { foreignKey: 'emergency_encounter_id', as: 'invoices' });
Invoice.belongsTo(EmergencyEncounter, { foreignKey: 'emergency_encounter_id', as: 'emergency_encounter' });

// HR
User.hasOne(Employee, { foreignKey: 'user_id', as: 'employee_profile' });
Employee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Department.hasMany(Employee, { foreignKey: 'department_id', as: 'employees' });
Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Employee.hasMany(Attendance, { foreignKey: 'employee_id', as: 'attendance' });
Attendance.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Employee.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
Payroll.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

PathologyParameter.belongsTo(MasterOption, { foreignKey: 'unit_option_id', as: 'unit_option' });
RadiologyParameter.belongsTo(MasterOption, { foreignKey: 'unit_option_id', as: 'unit_option' });

module.exports = {
  sequelize,

  User,
  RefreshToken,
  AuditLog,

  Organization,
  Hospital,
  Branch,
  Department,

  Patient,
  Doctor,
  Appointment,
  PatientAllergy,
  PatientProblem,
  PatientHistory,
  VitalSign,
  ClinicalNote,
  WorkflowDefinition,
  WorkflowStep,
  ApprovalRequest,
  ApprovalAction,

  EmergencyEncounter,
  EmergencyTriage,
  EmergencyDoctorAssignment,
  EmergencyAssessment,
  EmergencyOrder,
  EmergencyProcedure,
  EmergencyObservation,
  EmergencyDisposition,

  Ward,
  Bed,
  Admission,
  AdmissionPayment,
  OpdVisit,

  Medicine,
  MedicineSale,
  MedicineSaleItem,
  MedicineBatch,

  Prescription,
  PrescriptionItem,

  LabTest,
  LabOrder,
  LabOrderItem,
  PathologyParameter,

  RadiologyTest,
  RadiologyOrder,
  RadiologyParameter,

  DiagnosticStudy,
  DiagnosticResultParameter,
  DiagnosticMeasurement,
  DiagnosticFinding,
  DiagnosticOrganism,
  DiagnosticSensitivity,
  DiagnosticAttachment,
  DiagnosticReport,
  DiagnosticReportVersion,
  DiagnosticImagingSeries,

  Invoice,
  InvoiceItem,
  Payment,
  ExpenseCategory,
  Expense,
  IncomeEntry,
  ContraEntry,

  Ambulance,
  AmbulanceTrip,

  BloodDonor,
  BloodBag,
  BloodIssue,

  Referral,

  Employee,
  Attendance,
  Payroll,

  Setting,
  MasterOption,
  ServiceType,
  ServiceCategory,
  Service,
  ServicePrice,
  PricingRule,
  ServiceSourceLink,
};
