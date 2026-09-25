# Phase A — Audit and Implementation Plan

**Audit date:** 25 September 2026  
**Scope:** Service & Charge Catalogue + Enterprise Organization/Hospital/Branch/Department scoping only  
**Change gate:** This document records the read-only audit and the implementation plan before application code is changed.

## 1. Verified baseline

| Area | Verified state |
|---|---|
| Frontend | React/Vite/Tailwind/React Router; 152 page components and 156 route declarations |
| Backend | Express/Sequelize; 25 routed modules and 382 API declarations |
| Database | MySQL `hospital_management`; 68 tables; migrations 001–029 applied |
| Domain models | 65 Sequelize models |
| Tests | 165 backend tests previously passed; frontend production build passed |
| Runtime | Frontend `:3000`, API `:5000`, MySQL `:3306` currently healthy |

## 2. Internal implementation matrix

| Area | Existing | Needs enhancement | New in Phase A |
|---|---|---|---|
| Charge categories | Flat `master_options(type=charge_category)` CRUD | Relational ownership, codes, hierarchy and safe-use rules | `service_categories` |
| Service types | Implicit strings spread across modules | One governed list mapped to invoice item types | `service_types` |
| Services | Doctor/lab/radiology/bed/ambulance/medicine prices live in separate tables | Central code, category, department, unit, tax/discount flags and source mapping | `services`, `service_source_links` |
| Pricing | Hard-coded/current-row fee columns | Branch/payer/effective-date priority and immutable version history | `service_prices` |
| Discount/tax | Invoice-level values and flat tax master options | Rule scope, precedence, date range, payer and approval status | `pricing_rules` |
| Billing | Transaction-safe invoices/items/payments; exact decimal maths | Store catalogue and price-version references plus pricing snapshot | Add `service_id`, `service_price_id`, `pricing_snapshot` to `invoice_items` |
| Clinical charge integration | Lab, radiology, OPD, blood and ambulance can create real invoices | Resolve linked catalogue price before invoice creation; retain legacy fallback only for unmigrated/custom lines | Catalogue price resolver in `createEncounterInvoice` |
| Approval | Generic multi-step workflow engine exists | Link service-price/rule changes to approval requests; only approved versions resolve | Price/rule submit/approve/reject lifecycle using existing workflow foundation |
| Organization hierarchy | Group → Hospital → Branch and scoped users/workflows | Operational records are almost entirely unscoped | Scope migration plus backend tenant enforcement |
| Department scope | Doctor, appointment, OPD and employee have department IDs | Authenticated user and other encounter/financial roots lack department context | User/encounter/invoice department ownership |
| RBAC | Role guards plus action permissions | Register catalogue module and enforce create/update/delete/approve/export server-side | `service-catalog` permission mapping and role policy |
| Audit | CRUD/login audit middleware with prior state and redaction | Register catalogue entity models and sensitive price actions | Catalogue audit entities and approval audit |
| Reporting | Finance, ledger and departmental reports use real DB data | Service/category/branch/payer/effective-price reporting | Catalogue summary and price-history report APIs/UI |
| Tests | Billing, money, RBAC, organization, workflow and regression tests | Catalogue, effective pricing, scope isolation and invoice snapshot coverage | New Phase A integration tests |

## 3. Audit findings

### Pricing sources currently in use

- Doctor consultation: `doctors.consultation_fee`, copied into appointments/OPD.
- Laboratory: `lab_tests.price/base_charge/final_charge/tax_rate`.
- Radiology: `radiology_tests.price/base_charge/final_charge/tax_rate`.
- Bed: `beds.daily_rate` (the current live rows are zero-priced).
- Ambulance: `ambulances.base_fare/per_km_rate`, then `ambulance_trips.fare`.
- Blood: issue price is stored directly on `blood_issues.price`.
- Pharmacy: product/batch sale prices are inventory prices and remain the authoritative stock-sale input; a catalogue link will provide billing classification and snapshot traceability.
- IPD: `admissions.total_charges` is manually supplied/updated rather than derived from a service ledger.
- Existing invoice totals and payment status are server-computed and transaction-safe; these rules must be preserved.

### Current tenant coverage

- Only `users`, `workflow_definitions` and `approval_requests` directly carry organization/hospital/branch context.
- `hospitals` and `branches` carry their required parent keys.
- `doctors`, `appointments`, `opd_visits` and `employees` have department IDs, but departments themselves are global.
- Current user scope distribution is one organization, one hospital and two branches; active operational users are assigned to the main branch.
- Existing repositories do not consistently inject organization/branch predicates. Frontend filtering alone would not prevent direct cross-branch API access.
- The Patient master must remain one MRN per organization. A patient's registration branch is recorded, but demographic lookup is organization-scoped; branch scoping applies to encounters, orders, invoices, stock and other operations.

### Reusable infrastructure

- Exact integer-minor-unit money helpers.
- Transactional `createEncounterInvoice` used by several clinical modules.
- Role middleware and granular action permission middleware.
- Generic audit middleware with dynamic entity mapping and prior-state capture.
- Generic workflow/approval engine with organization scope, ordered steps, self-approval protection and immutable actions.
- Shared pagination, API response/error contracts, validation and existing settings table/form visual language.

## 4. Database plan

### Migration 030 — Service and Charge Catalogue

Create six real tables:

1. `service_types`
2. `service_categories`
3. `services`
4. `service_prices`
5. `pricing_rules`
6. `service_source_links`

Modify `invoice_items` with nullable foreign keys to `services` and `service_prices`, plus an immutable JSON pricing snapshot.

Backfill approved catalogue services/prices/source links for current doctors, lab tests, radiology tests, beds, ambulances and medicines. Existing price columns remain as compatibility mirrors; they are not deleted or renamed.

### Migration 031 — Operational Scope

Add organization/hospital/branch ownership, indexes and foreign keys to aggregate roots that are queried or mutated independently:

- Clinical/identity: `patients`, `patient_allergies`, `patient_problems`, `patient_histories`, `vital_signs`, `clinical_notes`, `doctors`, `appointments`, `opd_visits`, `admissions`, `prescriptions`, `diagnostic_studies`.
- Facility: `departments`, `wards`, `beds`.
- Lab/radiology: `lab_tests`, `lab_orders`, `radiology_tests`, `radiology_orders`.
- Pharmacy: `medicines`, `medicine_batches`, `medicine_sales`.
- Billing/finance: `invoices`, `payments`, `expense_categories`, `expenses`, `income_entries`, `contra_entries`.
- Blood/ambulance/referral: `blood_donors`, `blood_bags`, `blood_issues`, `ambulances`, `ambulance_trips`, `referrals`.
- HR: `employees`, `attendance`, `payrolls`.

Add `department_id` to `users`, `admissions`, `lab_orders`, `radiology_orders`, `diagnostic_studies` and `invoices` where it is meaningful. Child/item tables continue inheriting security from their protected aggregate root instead of duplicating tenant keys indiscriminately.

Existing rows are backfilled to the verified default hierarchy. No operational row is deleted.

## 5. Backend plan

1. Add request-local tenant context based on the authenticated user.
2. Apply reusable Sequelize scope guards to every scoped aggregate model:
   - super admin and legacy admin: explicit global administration;
   - CEO/management: organization scope;
   - hospital admin: hospital scope;
   - branch admin and branch staff: branch scope;
   - department-bound staff: department predicate where the record supports it.
3. Reject create/update payloads that attempt to override the caller's permitted scope.
4. Scope list, detail, count, aggregate, update and delete operations—not only frontend results.
5. Preserve organization-wide patient/MRN access while keeping each encounter/order/invoice branch-owned.
6. Add the service-catalog repository/service/controller/validation/routes module.
7. Implement effective price resolution priority:
   - exact branch before hospital before organization;
   - exact corporate/insurance payer before self-pay default;
   - approved, active and date-effective versions only;
   - most specific scope, then latest version.
8. Apply approved discount/tax rules deterministically by priority and store the final rule/price snapshot on the invoice line.
9. Reuse the workflow engine for governed price/rule changes and provide system-admin emergency approval with full audit.
10. Extend billing without changing existing invoice/payment maths or response contracts.

## 6. Frontend plan

Add one real enterprise screen at `Settings → Service Catalogue` with API-backed tabs:

- Dashboard/summary
- Service Types
- Categories
- Services
- Price Versions
- Discount & Tax Rules
- Price History report/export

Keep the existing `/settings/charge-manage` route and legacy category page intact for compatibility. Add `/settings/service-catalog` rather than replacing the old route.

All tabs will have real loading/empty/error states, validation, filters, pagination, scope selectors and create/edit actions. Approval status and effective dates will be visible; non-approved prices will never be presented as billable prices.

## 7. API plan

Mount `/api/v1/service-catalog` with:

- metadata and summary
- CRUD for types, categories and services
- CRUD/version history for prices
- effective-price resolution
- price submit/approve/reject actions
- CRUD and approval actions for pricing rules
- source-link inspection/synchronization
- catalogue and price-history reporting/export data

All endpoints use authentication, module/action permission, role policy, tenant scope, validation and audit.

## 8. Test and verification plan

Add tests for:

- migration/model relationships and legacy-source backfill;
- service/category CRUD validation;
- effective-date, payer and branch priority;
- overlapping/invalid price periods;
- approval enforcement and audit;
- invoice item service/price snapshot and exact totals;
- organization-wide MRN access plus cross-branch operational denial;
- hospital/branch/department role boundaries;
- permission denial for create/update/approve/export;
- regression of legacy billing when no catalogue mapping exists.

Completion gate for Phase A:

1. New tests pass.
2. All existing backend tests pass.
3. Frontend production build passes.
4. Browser smoke test passes against live API.
5. No pending migrations.
6. Live schema dump regenerated.
7. No claim is made that Phase B or later modules are implemented.
