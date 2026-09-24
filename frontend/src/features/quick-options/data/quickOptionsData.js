export const quickEntryItems = [
  { label: "Pathology Bill Entry", icon: "pathology", tone: "green", path: "/pathology/bill-entry" },
  { label: "Radiology Bill Entry", icon: "radiology", tone: "red", path: "/radiology/bill-entry" },
  { label: "Appointment Bill", icon: "appointment", tone: "purple", path: "/appointment/entry" },
  { label: "Call Ambulance Entry", icon: "ambulance", tone: "orange", path: "/ambulance/call-entry" },
  { label: "OPD Bill Entry", icon: "opd", tone: "sky", path: "/opd/bill-entry" },
  { label: "IPD Bill Entry", icon: "ipd", tone: "violet", path: "/ipd/bill-entry" },
  { label: "Pharmacy Sales", icon: "pharmacy", tone: "purple", path: "/pharmacy/sales" },
  { label: "Blood Donate", icon: "blood", tone: "red", path: "/blood/donate" },
  { label: "Blood Bank Stock UI", icon: "blood", tone: "red", path: "/blood/stock" },
  { label: "Blood Issue", icon: "blood", tone: "rose", path: "/blood/issue" },
  { label: "Blood Component Issue", icon: "blood", tone: "pink", path: "/blood/component-issue" },
  { label: "Doctor", icon: "doctor", tone: "blue", path: "/doctor/entry" },
  { label: "Patient", icon: "patient", tone: "brown", path: "/patient/entry" },
  { label: "Bed Availability", icon: "bed", tone: "black", path: "/bed/availability" },
];

export const quickRecordItems = [
  { label: "Pathology Bill Record", icon: "pathology", tone: "green", path: "/pathology/bill-record" },
  { label: "Radiology Bill Record", icon: "radiology", tone: "red", path: "/radiology/bill-record" },
  { label: "Appointment List", icon: "appointment", tone: "purple", path: "/appointment" },
  { label: "Call Ambulance Record", icon: "ambulance", tone: "orange", path: "/ambulance/call-record" },
  { label: "OPD Bill Record", icon: "opd", tone: "sky", path: "/opd/bill-record" },
  { label: "IPD Bill Record", icon: "ipd", tone: "violet", path: "/ipd/bill-record" },
  { label: "Pharmacy Sales Record", icon: "pharmacy", tone: "purple", path: "/pharmacy/sales-record" },
  { label: "Blood Donate Record", icon: "blood", tone: "red", path: "/blood/donate-record" },
  { label: "Blood Issue Record", icon: "blood", tone: "rose", path: "/blood/issue-record" },
  { label: "Blood Component Issue record", icon: "blood", tone: "pink", path: "/blood/component-issue-record" },
];

export const quickOptionSections = [
  { title: "Quick Entry", items: quickEntryItems },
  { title: "Quick Record", items: quickRecordItems },
];

export const quickOptionItems = quickEntryItems;
