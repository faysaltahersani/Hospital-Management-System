'use strict';

const pad = (num, width) => String(num).padStart(width, '0');

const generateCode = (prefix, year, sequence, width = 6) => {
  return `${prefix}-${year}-${pad(sequence, width)}`;
};

module.exports = {
  generateCode,
  generatePatientCode: (y, n) => generateCode('P', y, n),
  generateDoctorCode: (y, n) => generateCode('D', y, n),
  generateAppointmentCode: (y, n) => generateCode('APT', y, n),
  generateInvoiceCode: (y, n) => generateCode('INV', y, n),
  generatePaymentCode: (y, n) => generateCode('PAY', y, n),
  generatePrescriptionCode: (y, n) => generateCode('RX', y, n),
  generateMedicineSaleCode: (y, n) => generateCode('MS', y, n),
  generateLabOrderCode: (y, n) => generateCode('LAB', y, n),
  generateRadiologyOrderCode: (y, n) => generateCode('RAD', y, n),
  generateAdmissionCode: (y, n) => generateCode('ADM', y, n),
  generateOpdVisitCode: (y, n) => generateCode('OPD', y, n),
  generateTripCode: (y, n) => generateCode('TRIP', y, n),
  generateBloodBagCode: (y, n) => generateCode('BB', y, n),
  generateBloodIssueCode: (y, n) => generateCode('BI', y, n),
  generateBloodDonorCode: (y, n) => generateCode('DN', y, n),
  generateReferralCode: (y, n) => generateCode('REF', y, n),
  generateEmployeeCode: (y, n) => generateCode('EMP', y, n),
  generatePayrollCode: (y, n) => generateCode('PR', y, n),
};
