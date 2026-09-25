# Phase B — Enterprise Clinical Operations Audit & Plan

**Audit date:** 25 September 2026  
**Current implementation gate:** Emergency Department only  
**Protected baseline:** Phase A migrations 001–033, Service Catalogue, tenant scoping, billing snapshots, EMR, RBAC, audit and workflows

## Verified reusable foundation

| Area | Existing reusable implementation | Emergency enhancement |
|---|---|---|
| Patient / MRN | `patients`, organization-level patient visibility, permanent clinical/financial dependants | Emergency registration links an existing MRN or creates one patient inside the registration transaction |
| Encounters | Appointment, OPD Visit and Admission are separate aggregate roots | Add `emergency_encounters`; do not replace or merge existing encounter models |
| EMR | Allergy, Problem, History, Vital Sign and Clinical Note; polymorphic `encounter_type`/`encounter_id`; final notes immutable | Triage creates EMR vitals; assessment/discharge create linked clinical notes; patient timeline includes Emergency events |
| Diagnostics | Existing Lab/Radiology order, result and billing services | Add nullable Emergency encounter ownership and allow their services to participate in a caller transaction |
| Medication | Prescription/Prescription Item and Pharmacy modules | Link Emergency prescriptions through an Emergency order; no parallel medication master |
| Bed/IPD | Ward/Bed master, row-locked allocation, transactional IPD admission/transfer/discharge | Observation allocation reuses `beds`; admit/ICU disposition reuses admission logic |
| Billing | Invoice/Invoice Item/Payment, exact minor-unit maths, catalogue resolver and immutable pricing snapshot | Add Emergency encounter invoice link and use the same `createEncounterInvoice` path for every Emergency charge |
| Service Catalogue | Types, categories, services, scoped price versions, rules and approved price resolver | Emergency Billing selects an active catalogue service; no hard-coded production rate |
| Organization scope | Organization → Hospital → Branch, request-local tenant hooks | All Emergency aggregate tables carry organization/hospital/branch/department ownership |
| RBAC | Enterprise roles, module permissions and action flags | Add Emergency module plus exact screen/action permission checks using the same permission profile |
| Audit | Create/update/delete/decision audit, previous-state capture and redaction | Register Emergency entities and audit registration, triage, assignment, assessment, procedure, observation and disposition |
| Workflow | Configurable definitions, ordered steps and immutable approval actions | Optional workflow request reference for governed Emergency transfer/exception scenarios |
| Frontend | React Router, enterprise navbar, section menus, API client, SweetAlert and table/form conventions | Add Emergency primary navigation and 20 real routes backed by the Emergency API |

## Phase B implementation matrix

| Module | Existing | Enhance | New | Dependencies |
|---|---|---|---|---|
| Emergency | Patient, EMR, IPD, Bed, Lab, Radiology, Prescription, Billing, Referral | Encounter linkage, shared transactions, timeline, catalogue billing | Encounter, Triage, Assignment, Assessment, Order index, Procedure, Observation, Disposition, Reports | Phase A catalogue and tenant scope |
| Nursing | Admission, Ward/Bed, Vitals, Notes, Prescription | Assignment and ward-level access | MAR, intake/output, care plan, tasks, immutable handover | Emergency must be stable first |
| ICU | ICU/HDU wards, Beds, Admission | Bed statuses and transfer invariants | ICU stay, critical monitoring, ventilator record | Nursing must be stable first |
| OT/Surgery | Users/Employees, Workflow, Catalogue, Medicine batches | Team assignment, approval and stock integration | OT room, surgery, checklist, anesthesia, recovery, consumables, implants | ICU stable; generic inventory ledger enhancement |

## Emergency implementation scope

1. Migrations and tenant-owned models for encounter, triage, assignments, assessments, unified order references, procedures, observations and dispositions.
2. Strict Emergency status machine: `registered → triaged → under_assessment → treatment → observation → discharged/admitted/transferred`.
3. Triage finalization and assessment finalization are immutable; amendments use new records/clinical notes.
4. Doctor assignment history and current assigned doctor on the encounter.
5. Existing Lab/Radiology/Prescription modules create and link Emergency orders.
6. Observation bed allocation and release use row locks and existing bed status.
7. Discharge, IPD/ICU admission and external transfer/referral are transactional dispositions.
8. Emergency procedure/billing uses approved Service Catalogue prices and immutable invoice snapshots.
9. Real DB reports: daily visits, triage distribution, disposition, doctor activity and Emergency revenue.
10. Twenty frontend routes use shared, API-backed Emergency workspace components.

## Known later-phase constraints

- The current system has medicine batches but not a general non-pharmacy inventory/stock-ledger aggregate. OT consumables must enhance that foundation later rather than invent a disconnected stock table.
- There are ICU/HDU wards and beds, but no ICU stay/ventilator model yet; those belong to the ICU step after Nursing.
- There are no active `icu_staff`, `ot_staff` or `anesthetist` accounts in the live data. The roles exist and can be assigned through user management; no fake staff accounts will be seeded.

