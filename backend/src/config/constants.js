'use strict';

const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HOSPITAL_ADMIN: 'hospital_admin',
  BRANCH_ADMIN: 'branch_admin',
  CEO: 'ceo',
  MANAGEMENT: 'management',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist',
  CASHIER: 'cashier',
  ACCOUNTANT: 'accountant',
  FINANCE_MANAGER: 'finance_manager',
  PHARMACIST: 'pharmacist',
  LAB_TECH: 'lab_tech',
  PATHOLOGIST: 'pathologist',
  RADIOLOGIST: 'radiologist',
  OT_STAFF: 'ot_staff',
  ANESTHETIST: 'anesthetist',
  ICU_STAFF: 'icu_staff',
  BLOOD_BANK_STAFF: 'blood_bank_staff',
  PROCUREMENT_OFFICER: 'procurement_officer',
  STORE_MANAGER: 'store_manager',
  HR_MANAGER: 'hr_manager',
  HOUSEKEEPING: 'housekeeping',
  DIETICIAN: 'dietician',
  AMBULANCE_STAFF: 'ambulance_staff',
  INSURANCE_OFFICER: 'insurance_officer',
  PATIENT: 'patient',
});
const ROLE_VALUES = Object.values(ROLES);

const GENDERS = Object.freeze({ MALE: 'male', FEMALE: 'female', OTHER: 'other' });
const GENDER_VALUES = Object.values(GENDERS);

const APPOINTMENT_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
});
const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);

const BLOOD_GROUPS = Object.freeze([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown',
]);

const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REFRESH: 'refresh',
});

const PRESCRIPTION_STATUS = Object.freeze({
  DRAFT: 'draft',
  FINALIZED: 'finalized',
  DISPENSED: 'dispensed',
});
const PRESCRIPTION_STATUS_VALUES = Object.values(PRESCRIPTION_STATUS);

const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  VOID: 'void',
  OVERDUE: 'overdue',
});
const INVOICE_STATUS_VALUES = Object.values(INVOICE_STATUS);

const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  MOBILE_BANKING: 'mobile_banking',
  INSURANCE: 'insurance',
  CHEQUE: 'cheque',
});
const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHODS);

const INVOICE_ITEM_TYPES = Object.freeze({
  CONSULTATION: 'consultation',
  MEDICINE: 'medicine',
  LAB_TEST: 'lab_test',
  RADIOLOGY: 'radiology',
  BED: 'bed',
  PROCEDURE: 'procedure',
  AMBULANCE: 'ambulance',
  OTHER: 'other',
});
const INVOICE_ITEM_TYPE_VALUES = Object.values(INVOICE_ITEM_TYPES);

const LAB_ORDER_STATUS = Object.freeze({
  ORDERED: 'ordered',
  SAMPLE_COLLECTED: 'sample_collected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const LAB_ORDER_STATUS_VALUES = Object.values(LAB_ORDER_STATUS);

const RADIOLOGY_ORDER_STATUS = Object.freeze({
  ORDERED: 'ordered',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const RADIOLOGY_ORDER_STATUS_VALUES = Object.values(RADIOLOGY_ORDER_STATUS);

const RADIOLOGY_CATEGORIES = Object.freeze([
  'xray', 'ct', 'mri', 'ultrasound', 'mammography', 'fluoroscopy', 'other',
]);

const WARD_TYPES = Object.freeze([
  'general', 'private', 'semi_private', 'icu', 'hdu', 'maternity', 'pediatric', 'isolation', 'emergency',
]);

const EMERGENCY_STATUS = Object.freeze({
  REGISTERED: 'registered',
  TRIAGED: 'triaged',
  UNDER_ASSESSMENT: 'under_assessment',
  TREATMENT: 'treatment',
  OBSERVATION: 'observation',
  DISCHARGED: 'discharged',
  ADMITTED: 'admitted',
  TRANSFERRED: 'transferred',
});
const EMERGENCY_STATUS_VALUES = Object.values(EMERGENCY_STATUS);
const TRIAGE_LEVELS = Object.freeze(['resuscitation', 'emergent', 'urgent', 'less_urgent', 'non_urgent']);

const BED_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
});
const BED_STATUS_VALUES = Object.values(BED_STATUS);

const ADMISSION_STATUS = Object.freeze({
  ADMITTED: 'admitted',
  DISCHARGED: 'discharged',
  TRANSFERRED: 'transferred',
});
const ADMISSION_STATUS_VALUES = Object.values(ADMISSION_STATUS);

const OPD_VISIT_STATUS = Object.freeze({
  IN_CONSULTATION: 'in_consultation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const OPD_VISIT_STATUS_VALUES = Object.values(OPD_VISIT_STATUS);

const AMBULANCE_STATUS = Object.freeze({
  AVAILABLE: 'available',
  ON_TRIP: 'on_trip',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
});
const AMBULANCE_STATUS_VALUES = Object.values(AMBULANCE_STATUS);

const TRIP_STATUS = Object.freeze({
  DISPATCHED: 'dispatched',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const TRIP_STATUS_VALUES = Object.values(TRIP_STATUS);

const BLOOD_BAG_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  ISSUED: 'issued',
  EXPIRED: 'expired',
  DISCARDED: 'discarded',
});
const BLOOD_BAG_STATUS_VALUES = Object.values(BLOOD_BAG_STATUS);

const REFERRAL_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});
const REFERRAL_STATUS_VALUES = Object.values(REFERRAL_STATUS);

const PAYROLL_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  CANCELLED: 'cancelled',
});
const PAYROLL_STATUS_VALUES = Object.values(PAYROLL_STATUS);

const SALE_STATUS = Object.freeze({
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
});
const SALE_STATUS_VALUES = Object.values(SALE_STATUS);

module.exports = {
  ROLES, ROLE_VALUES,
  GENDERS, GENDER_VALUES,
  APPOINTMENT_STATUS, APPOINTMENT_STATUS_VALUES,
  BLOOD_GROUPS,
  AUDIT_ACTIONS,
  PRESCRIPTION_STATUS, PRESCRIPTION_STATUS_VALUES,
  INVOICE_STATUS, INVOICE_STATUS_VALUES,
  PAYMENT_METHODS, PAYMENT_METHOD_VALUES,
  INVOICE_ITEM_TYPES, INVOICE_ITEM_TYPE_VALUES,
  LAB_ORDER_STATUS, LAB_ORDER_STATUS_VALUES,
  RADIOLOGY_ORDER_STATUS, RADIOLOGY_ORDER_STATUS_VALUES,
  RADIOLOGY_CATEGORIES,
  WARD_TYPES,
  EMERGENCY_STATUS, EMERGENCY_STATUS_VALUES, TRIAGE_LEVELS,
  BED_STATUS, BED_STATUS_VALUES,
  ADMISSION_STATUS, ADMISSION_STATUS_VALUES,
  OPD_VISIT_STATUS, OPD_VISIT_STATUS_VALUES,
  AMBULANCE_STATUS, AMBULANCE_STATUS_VALUES,
  TRIP_STATUS, TRIP_STATUS_VALUES,
  BLOOD_BAG_STATUS, BLOOD_BAG_STATUS_VALUES,
  REFERRAL_STATUS, REFERRAL_STATUS_VALUES,
  PAYROLL_STATUS, PAYROLL_STATUS_VALUES,
  SALE_STATUS, SALE_STATUS_VALUES,
};
