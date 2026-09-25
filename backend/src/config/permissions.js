'use strict';

// BUG-001 — permission group catalogue.
//
// The frontend builds permission keys as `<group>_<item>`, lower-snake-cased
// from the group title and menu label in UserAccessPage (e.g. the "OPD" group
// plus "OPD Bill Entry" yields `opd_opd_bill_entry`). Those keys are stored in
// `master_options` (type `user_permission`, code `PERM-<userId>`).
//
// This table maps each API module onto the group prefix(es) that authorise it,
// so the backend can enforce the same policy the UI displays. A module listing
// several groups is satisfied by any one of them (departments, for example,
// are reachable from both the Doctor and HR & Payroll menus).
//
// Modules deliberately absent from the map (auth, prescriptions) carry no
// menu-level permission in the UI and remain governed by role checks alone.

const MODULE_GROUPS = Object.freeze({
  ambulance: ['ambulance'],
  appointments: ['appointment'],
  'audit-logs': ['settings'],
  beds: ['bed'],
  billing: ['finance', 'account_manage'],
  'blood-bank': ['blood'],
  departments: ['doctor', 'hr_and_payroll'],
  doctors: ['doctor'],
  emr: ['patient', 'opd', 'ipd'],
  emergency: ['emergency'],
  hr: ['hr_and_payroll'],
  ipd: ['ipd'],
  laboratory: ['pathology'],
  organization: ['settings'],
  // Diagnostics spans both diagnostic departments, so holding either menu
  // permission grants it. A user who can reach Pathology or Radiology in the UI
  // can reach the investigation records behind them, and no one else can.
  diagnostics: ['pathology', 'radiology'],
  opd: ['opd'],
  patients: ['patient'],
  pharmacy: ['pharmacy', 'medicine'],
  radiology: ['radiology'],
  referrals: ['referral'],
  reports: ['reports'],
  settings: ['settings'],
  users: ['settings'],
  workflows: ['settings'],
  'service-catalog': ['settings', 'finance'],
});

const groupsForModule = (moduleName) => MODULE_GROUPS[moduleName] || null;

// A stored key belongs to a group when it is the group itself or is prefixed
// by it. Both `_` and `.` separators are accepted because historical records
// used either form.
const keyMatchesGroup = (key, group) => {
  const k = String(key || '').toLowerCase();
  const g = String(group || '').toLowerCase();
  if (!k || !g) return false;
  return k === g || k.startsWith(`${g}_`) || k.startsWith(`${g}.`);
};

module.exports = { MODULE_GROUPS, groupsForModule, keyMatchesGroup };
