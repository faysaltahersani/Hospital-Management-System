# Enterprise HMS Gap Analysis

**Audit date:** 24 September 2026  
**Target:** Existing React/Vite + Express/Sequelize + MySQL/MariaDB web application  
**Rule:** Existing modules and workflows are preserved. Mobile applications are outside the delivery scope.

## 1. Executive status

The repository is a functional hospital-management application, but it is not yet a complete enterprise Hospital Information System/ERP. The existing application already has real UI/API/database workflows for the core registration, diagnostic, dispensing, admission, billing, blood-bank, ambulance, referral, payroll, and reporting areas. The enterprise request adds a much larger operational and governance layer that does not yet exist.

Current measured inventory:

| Area | Current count |
|---|---:|
| Frontend route declarations | 156 |
| Frontend page components | 152 |
| Backend route files | 25 |
| Backend API declarations | 382 |
| Sequelize models | 65 |
| Database tables in clean schema | 68 |
| Database migrations | 29 functional migrations plus runner |
| Automated backend tests | 165 |
| Available system roles | 28 |

The counts show breadth, not enterprise readiness. A page or endpoint is only considered complete when its UI, API, database model, business rules, validation, authorization, audit trail, reporting, and cross-module workflow are connected and tested.

### Enterprise foundation delivered in this upgrade tranche

The following items are implemented end-to-end in the current working tree and live database:

- Relational Hospital Group → Hospital → Branch masters, hierarchy UI/API, scoped uniqueness, safe deletion rules, user assignment, and audit coverage.
- Granular per-user action permissions for read, create, update, delete, approve, reject, print, export, refund, and sensitive-data access, while retaining compatibility with older module-only permission profiles.
- An expanded 28-role catalogue with super-admin bypass and role-aware frontend routing. This is a compatibility foundation; normalized many-to-many role assignment remains a later phase.
- Successful and failed login history plus searchable/exportable security activity. Passwords and tokens are redacted from audit records.
- Centralized patient EMR tabs for allergies, problems/diagnoses, clinical history, vital signs with calculated BMI, and version-safe clinical notes.
- A real multi-step workflow and approval engine with organization scope, role/user approvers, ordered steps, approval thresholds, due hours, amount limits, self-approval protection, permanent action history, summary reporting, and request UI.
- Data-integrity reconciliation for legacy income/contra entries and expired blood-stock status.
- Live schema snapshot regenerated from the migrated MySQL database, with 68 database tables.
- Regression verification currently passes all 165 backend tests; the production frontend build is also part of final verification.

These changes complete only a foundation tranche. They do not turn the entire requested enterprise scope into a finished product in one release; the remaining gaps below are still active work.

## 2. Existing architecture

### Frontend

- React 18 with Vite.
- React Router protected application shell.
- Tailwind-based responsive interface.
- Feature folders for the current hospital modules.
- Shared API client, authentication storage, alerts, tables, filters, pagination, modal forms, loading states, and error feedback.
- Menu visibility based on the logged-in role and stored per-user module permissions.

### Backend

- Express API with module-oriented controller/service/repository/validation structure.
- Sequelize ORM and MySQL/MariaDB.
- JWT access and refresh tokens.
- Password policy and forced password rotation support.
- Role guards and dynamic module-permission middleware.
- Joi request validation.
- Audit middleware and audit-log API.
- Security headers, CORS, rate limiting, compression, structured logging, and centralized error handling.
- Sequelize transactions in several money, stock, bed, blood, and diagnostic workflows.

### Data model

- One patient master is used by appointments, OPD, IPD/admissions, prescriptions, laboratory, radiology, diagnostic history, pharmacy sales, billing, blood issues, ambulance trips, and referrals.
- Encounter/service records link to invoices where supported.
- Invoices contain line items and payments.
- Medicine batches and sale-item batch allocations support stock traceability.
- Diagnostic studies use versioned, permanent report and attachment records.

## 3. Existing modules

The following areas already have working frontend, backend, database, and API coverage. They require enterprise enhancement but must not be recreated as duplicate modules.

| Existing area | Current capability | Enterprise action |
|---|---|---|
| Authentication | Login, refresh, logout, password change, current user | Enhance security and session controls |
| User administration | User CRUD, activation, permissions | Replace module-only permission model with granular actions |
| Dashboard | Live patient, doctor, bed, stock, blood, billing, account, and monthly statistics | Expand to CEO/branch/department analytics |
| Patient | Registration, search/list, demographics, identifiers, guardian/emergency fields | Enhance into complete patient profile and portal |
| Doctor | Profile, department, specialization, fee | Enhance credentials, roster, portal, performance |
| Appointment | Entry, records, priorities, shifts, slots, payment linkage | Enhance queues, reminders, transfers, online booking |
| OPD | Visit/bill entry, records, symptoms | Enhance triage and complete clinical workflow |
| IPD | Admission/billing, bed linkage, payments, symptoms | Enhance daily care, transfer, clearance, discharge planning |
| Bed | Building/floor/ward/room/bed management and occupancy | Add organization hierarchy and controlled transfer history |
| Pathology/Laboratory | Tests, parameters, orders, billing, diagnostic reporting | Enhance full LIS workflow, QC, TAT, analyzer interface |
| Radiology | Tests, parameters, orders, billing, diagnostic reporting | Enhance RIS/PACS/DICOM worklist and modality workflows |
| Diagnostics | Unified permanent history, structured findings, files, versioned reports | Connect all new clinical encounters to centralized EMR |
| Pharmacy/Medicine | POS sales, purchases, returns, suppliers, batches, stock reports | Enhance controlled medicines, FEFO, transfers, interaction checks |
| Blood bank | Donors, bags, screening, donation, issue, component separation, stock | Enhance request/cross-match/transfusion/reaction/quarantine workflow |
| Billing | Multi-service invoices, items, payments, due collection | Expand into complete revenue-cycle management |
| Finance | Income, expense, contra, accounts, ledgers, summaries | Expand to double-entry accounting and statutory statements |
| Ambulance | Vehicles, calls/trips, billing, records | Enhance dispatch, driver, fuel, maintenance |
| Referral | Referral people/cases, bills, balances, ledgers | Enhance commission approval and settlement |
| HR & payroll | Employee, attendance, payroll/salary payment | Enhance recruitment-to-exit HR lifecycle |
| Reports | 37 report pages plus report APIs | Add BI, custom reports, PDF/Excel exports and branch dimensions |
| Settings | Company profile, branches-as-options, charges, users/access, import/backup | Replace flat branch options with organization master data |
| Audit | CRUD/login audit records and searchable API | Expand sensitive-access and export audit coverage |

## 4. Existing items that must be enhanced

### Central patient and EMR

- Keep `patients.patient_code` as the canonical MRN basis.
- Add duplicate-detection rules using normalized phone, government identifier, name/date-of-birth, and explicit merge history.
- Add allergies, chronic diseases, family history, immunizations, surgical history, clinical problems, observations/vitals, notes, procedures, care plans, discharge summaries, and timeline events.
- Connect appointment, OPD, IPD, Emergency, ICU, OT, lab, radiology, pharmacy, nursing, billing, and insurance records to the same patient ID.

### Billing and finance

- Preserve existing invoices, invoice items, payments, income, expenses, and contra entries.
- Introduce a service catalogue and charge rules so every billable clinical event posts an invoice item once and only once.
- Add advance, refund, cancellation/void approval, package billing, cashier shift, receivables, payables, journals, chart of accounts, fiscal periods, reconciliation, budgets, tax/VAT, closing, trial balance, profit/loss, balance sheet, and cash flow.
- Use database transactions and immutable posting references for all financial postings.

### Security and RBAC

- Preserve JWT authentication and existing role behavior during migration.
- Replace the current eight-value role enum and module-level per-user permission profile with normalized roles, permissions, role-permissions, and optional user overrides.
- Required action permissions: view, create, edit, delete, approve, reject, print, export, refund, and sensitive-data access.
- Add login history, sessions/devices, failed-login monitoring, MFA, password-policy configuration, IP restrictions, and sensitive access/export logs.

### Multi-hospital and multi-branch

- Replace flat `branch` master options with relational organization, hospital, branch, building, floor, department, ward, and bed masters.
- Add hospital/branch ownership to all operational and financial records.
- Scope every query and uniqueness rule to the authenticated organization context, with explicit cross-branch permissions for group administrators.
- Existing unscoped rows need a controlled migration into a default organization/hospital/branch.

### UI/UX

- Preserve the current visual language.
- Add role-based workspaces, organization/branch selector, consistent enterprise tables, filter drawers, status badges, validation, empty/loading/error states, confirmation dialogs, print layouts, and responsive tablet support.
- Remove no-op controls only by connecting them to real behavior; do not replace them with dummy UI.

## 5. Enterprise modules still requiring delivery or expansion

The first four foundations below now have working UI, API, database, rules, permissions/audit, and tests. Their noted expansion work—and all later modules—must still meet the complete definition of done:

1. Hospital group and organization hierarchy — foundation delivered; ownership/scoping must be propagated to every operational and financial table.
2. Enterprise roles and granular permissions — action controls delivered; normalized role/permission assignment, session controls, and MFA remain.
3. Workflow and approval engine — reusable core delivered; individual procurement, refund, discount, discharge, payroll, and insurance processes still need to adopt it.
4. EMR/EHR longitudinal record — allergies, problems, history, vitals, and notes delivered; immunization, procedures, care plans, timeline, merge history, and all future encounters remain.
5. Doctor workspace/portal.
6. Patient web portal.
7. Emergency department.
8. ICU/critical care.
9. Nursing management and medication administration record.
10. Operation theatre/surgery.
11. Central inventory and stores.
12. Procurement and supplier lifecycle.
13. Insurance/TPA/corporate billing.
14. Full general-ledger accounting.
15. Asset and medical-equipment management.
16. Facility maintenance.
17. Housekeeping.
18. Laundry and linen.
19. Dietary and nutrition.
20. Enterprise notification center.
21. CEO/management dashboard and cross-branch BI.
22. Integration registry/jobs/webhooks for external systems.

## 6. Major readiness gaps and risks

| Priority | Gap | Why it blocks enterprise readiness |
|---|---|---|
| Critical | Organization hierarchy exists, but legacy operational rows are not all branch-owned | Records cannot yet be safely isolated or compared across every hospital workflow |
| Critical | Action permissions exist, but roles remain enum-based and sessions/MFA are incomplete | Enterprise identity governance and device/session control are not yet complete |
| Critical | Workflow engine exists, but legacy business modules have not all adopted it | Procurement, refund, discount, payroll, discharge, and insurance approvals are not yet uniformly controlled |
| Critical | Core EMR profile exists, but the full longitudinal clinical model is incomplete | Timeline, immunization, procedures, care plans, merge history, and future encounter modules remain fragmented |
| Critical | Finance is not a complete double-entry ledger | Enterprise financial statements and controlled closing are not supported |
| High | Emergency, ICU, OT, and nursing workflows absent | Major hospital clinical operations are missing |
| High | Procurement and central inventory absent | Store consumption and purchase-to-pay cannot be audited end-to-end |
| High | Insurance/TPA absent | Coverage, authorization, claims, and receivables are unsupported |
| High | Patient/doctor portals absent | Self-service and clinician workspace objectives are unmet |
| High | Login/session/MFA/device controls incomplete | Required enterprise security controls are missing |
| Medium | Export is mainly CSV and print | Required governed PDF/Excel outputs are incomplete |
| Medium | No notification delivery orchestration | Reminders and clinical/financial notifications are not reliable workflows |

## 7. Safe implementation order

The system should be upgraded in dependency order rather than by creating disconnected screens.

### Phase 1 — Enterprise foundation

1. Organization/hospital/branch hierarchy and request context.
2. Normalized roles, action permissions, user assignments, and compatibility migration.
3. Login/session/security history.
4. Workflow/approval engine.
5. Master data and service/charge catalogue.

### Phase 2 — Central clinical platform

1. Patient deduplication and MRN safeguards.
2. EMR clinical profile, problems, allergies, observations, notes, documents, and timeline.
3. Doctor workspace.
4. Nursing and medication-administration foundations.

### Phase 3 — Acute-care operations

1. Emergency.
2. ICU.
3. OT/surgery and recovery.
4. IPD transfer, daily care, discharge clearance, and summary.

### Phase 4 — Supply chain and revenue cycle

1. Central inventory/store.
2. Procurement.
3. Service billing automation.
4. Insurance/TPA/corporate billing.
5. Accounting/GL and closing.

### Phase 5 — Support services

1. Asset/equipment.
2. Facility maintenance.
3. Housekeeping.
4. Laundry/linen.
5. Dietary/nutrition.
6. Expanded ambulance and referral settlement.

### Phase 6 — Portals, analytics, and integrations

1. Patient web portal.
2. Doctor portal refinements.
3. CEO dashboard and business intelligence.
4. Notification center.
5. Payment/SMS/email/LIS/RIS/PACS/DICOM/biometric/insurance integration adapters.

## 8. Definition of done for every module

A module is complete only when all of these are delivered and tested:

- Database migration, constraints, indexes, foreign keys, and organization/branch ownership.
- Sequelize models and relationships.
- Validated service/repository business logic.
- Transaction boundaries for money, stock, allocation, approval, and clinical finalization.
- Versioned API contract and predictable errors.
- Granular permission checks and organization scoping.
- Audit logging, including sensitive read/export events where applicable.
- Responsive UI with loading, empty, validation, success, error, and confirmation states.
- Reporting/export support.
- Unit/integration tests and regression checks for affected existing modules.
- User-visible workflow connected to upstream and downstream modules.

## 9. Current production-readiness verdict

**Current status: functional departmental HMS; not enterprise-ready.**

The existing core can be preserved and extended, but enterprise readiness must not be claimed until the cross-cutting foundation and all required clinical, operational, financial, security, multi-branch, workflow, portal, reporting, and integration modules meet the definition of done above.

## 10. Delivery inventory and QA status

### Measured delivery totals

| Measure | Total |
|---|---:|
| Routed backend modules | 25 |
| Frontend page components | 152 |
| Frontend route declarations | 156 |
| Backend API declarations | 382 |
| Sequelize domain models | 65 |
| Live database tables | 68 |
| Functional migrations | 29 |
| Automated backend tests | 165 passed / 0 failed |

### Role catalogue

Super Admin, Admin (legacy compatibility), Hospital Admin, Branch Admin, CEO, Management, Doctor, Nurse, Receptionist, Cashier, Accountant, Finance Manager, Pharmacist, Lab Technician, Pathologist, Radiologist, OT Staff, Anesthetist, ICU Staff, Blood Bank Staff, Procurement Officer, Store Manager, HR Manager, Housekeeping, Dietician, Ambulance Staff, Insurance Officer, and Patient.

### Permission matrix semantics

| Permission | Server-enforced meaning |
|---|---|
| View | Read/list/detail API access |
| Create | POST/create operations |
| Edit | PUT/PATCH update operations |
| Delete | DELETE operations |
| Approve | Approval decisions |
| Reject | Rejection decisions |
| Print | Print/report rendering actions |
| Export | CSV/PDF/Excel export actions |
| Refund | Refund/reversal actions |
| Sensitive | EMR, patient timeline, and diagnostic-sensitive access |

The current matrix is stored as per-user module/screen action profiles and enforced in API middleware. A normalized role-permission schema, field-level permission model, and cross-branch grants remain future work.

### Enhanced in this tranche

- Authentication/audit: successful and failed sign-in history, redacted request capture, and timestamped security activity UI.
- Patient/clinical: centralized EMR clinical profile and protected sensitive reads.
- User/security: 28-role compatibility catalogue, action-level access matrix, and immediate permission-cache invalidation.
- Settings/organization: real organization, hospital, and branch hierarchy replacing flat branch-only administration.
- Finance/blood data integrity: legacy income/contra reconciliation and automatic expired-bag correction.
- Deployment: canonical combined repository is used by the root launcher and both web services.

### New in this tranche

- Organization, Hospital, and Branch relational models and APIs.
- Allergy, Problem, Clinical History, Vital Sign, and Clinical Note models and APIs.
- Workflow Definition, Workflow Step, Approval Request, and immutable Approval Action models and APIs.
- Organization management, centralized EMR, workflow/approval center, security activity, and action-permission matrix screens.

### QA findings

- Backend regression suite: 165/165 passed, including authentication, permissions, audit, backup/restore, patient, OPD, IPD/bed, diagnostics, pharmacy FEFO, blood compatibility, billing/finance, organization, EMR, and workflow tests.
- Frontend production build: passed. The generated JavaScript bundle is approximately 1.64 MB and Vite reports a chunk-size optimization warning; route-level code splitting is recommended before high-scale deployment.
- Browser smoke test: Organization hierarchy, centralized EMR, Workflow & Approval Center, and Security Activity loaded against the live API. A missing audit timestamp mapping found during this test was corrected and reverified.
- Live services: frontend, backend API, and MySQL were healthy during final verification.
- No claim is made that the missing enterprise modules in Sections 5–6 have passed validation; they are not yet delivered.
