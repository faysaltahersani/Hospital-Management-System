'use strict';

const { Op } = require('sequelize');
const { dateTimeRange } = require('../../utils/dateUtils');
const {
  EmergencyEncounter, EmergencyTriage, EmergencyDoctorAssignment, EmergencyAssessment,
  EmergencyOrder, EmergencyProcedure, EmergencyObservation, EmergencyDisposition,
  Patient, Doctor, User, Department, Bed, Ward, Admission, VitalSign, ClinicalNote,
  Service, ServicePrice, Invoice, InvoiceItem, Payment, LabOrder, RadiologyOrder,
  Prescription, Referral,
} = require('../../models');

const doctorInclude = (as, required = false) => ({
  model: Doctor,
  as,
  required,
  attributes: ['id', 'doctor_code', 'specialization', 'is_available'],
  include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'], required: false }],
});

const listIncludes = [
  { model: Patient, as: 'patient', attributes: ['id', 'patient_code', 'full_name', 'age', 'gender', 'blood_group', 'phone'] },
  doctorInclude('assigned_doctor'),
  { model: Bed, as: 'current_bed', attributes: ['id', 'bed_number', 'status'], required: false,
    include: [{ model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'type'], required: false }] },
];

const detailIncludes = [
  ...listIncludes,
  { model: Department, as: 'department', attributes: ['id', 'code', 'name'], required: false },
  { model: Admission, as: 'admission', attributes: ['id', 'admission_code', 'status', 'admitted_at'], required: false },
  { model: EmergencyTriage, as: 'triages', separate: true, order: [['version_no', 'DESC']],
    include: [
      { model: VitalSign, as: 'vital_sign', required: false },
      { model: User, as: 'triage_nurse', attributes: ['id', 'full_name', 'role'] },
    ] },
  { model: EmergencyDoctorAssignment, as: 'doctor_assignments', separate: true, order: [['assigned_at', 'DESC']],
    include: [doctorInclude('doctor'), { model: User, as: 'assigner', attributes: ['id', 'full_name'] }] },
  { model: EmergencyAssessment, as: 'assessments', separate: true, order: [['version_no', 'DESC']],
    include: [
      { model: User, as: 'assessor', attributes: ['id', 'full_name', 'role'] },
      { model: ClinicalNote, as: 'clinical_note', required: false },
    ] },
  { model: EmergencyOrder, as: 'emergency_orders', separate: true, order: [['requested_at', 'DESC']],
    include: [{ model: User, as: 'requester', attributes: ['id', 'full_name', 'role'] }] },
  { model: EmergencyProcedure, as: 'procedures', separate: true, order: [['created_at', 'DESC']],
    include: [
      { model: Service, as: 'service', attributes: ['id', 'code', 'name', 'billing_unit'] },
      { model: ServicePrice, as: 'service_price', required: false },
      { model: Invoice, as: 'invoice', attributes: ['id', 'invoice_code', 'total', 'paid_amount', 'status'], required: false },
    ] },
  { model: EmergencyObservation, as: 'observations', separate: true, order: [['started_at', 'DESC']],
    include: [{ model: Bed, as: 'bed', include: [{ model: Ward, as: 'ward', attributes: ['id', 'name', 'code', 'type'] }] }] },
  { model: EmergencyDisposition, as: 'dispositions', separate: true, order: [['disposed_at', 'DESC']],
    include: [
      { model: Admission, as: 'admission', attributes: ['id', 'admission_code', 'status'], required: false },
      { model: Referral, as: 'referral', attributes: ['id', 'referral_code', 'status'], required: false },
    ] },
  { model: LabOrder, as: 'lab_orders', separate: true, order: [['ordered_at', 'DESC']] },
  { model: RadiologyOrder, as: 'radiology_orders', separate: true, order: [['ordered_at', 'DESC']] },
  { model: Prescription, as: 'prescriptions', separate: true, order: [['prescribed_at', 'DESC']] },
  { model: Invoice, as: 'invoices', separate: true, order: [['issued_at', 'DESC']],
    include: [
      { model: InvoiceItem, as: 'items', include: [{ model: Service, as: 'service', required: false }] },
      { model: Payment, as: 'payments' },
    ] },
];

const findAndCount = ({ filters = {}, dateRange, search, limit, offset }) => {
  const where = { ...filters };
  const range = dateTimeRange(dateRange);
  if (range) where.arrival_at = range;
  if (search) where[Op.or] = [
    { encounter_code: { [Op.like]: `%${search}%` } },
    { chief_complaint: { [Op.like]: `%${search}%` } },
    { '$patient.full_name$': { [Op.like]: `%${search}%` } },
    { '$patient.patient_code$': { [Op.like]: `%${search}%` } },
  ];
  return EmergencyEncounter.findAndCountAll({
    where, include: listIncludes, limit, offset, order: [['arrival_at', 'DESC']], distinct: true, subQuery: false,
  });
};

const findById = (id, options = {}) => EmergencyEncounter.findByPk(id, { include: detailIncludes, ...options });
const findBasicById = (id, options = {}) => EmergencyEncounter.findByPk(id, options);

module.exports = { findAndCount, findById, findBasicById, listIncludes, detailIncludes };

