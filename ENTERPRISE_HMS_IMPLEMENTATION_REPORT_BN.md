# Enterprise HMS — বাংলা Implementation ও Demo Report

**তারিখ:** ২৪ সেপ্টেম্বর ২০২৬  
**অ্যাপ:** React/Vite frontend + Express/Sequelize backend + MySQL database  
**বর্তমান সিদ্ধান্ত:** মূল departmental HMS চালু ও ব্যবহারযোগ্য; enterprise foundation-এর প্রথম বড় ধাপ সম্পন্ন; পূর্ণ enterprise scope এখনো সম্পন্ন নয়।

## ১. সিস্টেম এখন কোথায় চলছে

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api/v1`
- Health check: `http://localhost:5000/api/v1/health`
- Database: MySQL, `127.0.0.1:3306`, database `hospital_management`
- Root launcher: `L:\Hospital Management System\start-all.bat`
- Canonical combined code: `L:\Hospital Management System\github-release-20260924`

## ২. Project scenario সহজ ভাষায়

এই HMS-এর মূল flow হচ্ছে:

1. Patient Registration থেকে একজন রোগী একবার register হলে একটি unique MRN/patient code পায়।
2. একই patient ID appointment, OPD, IPD, bed, pathology, radiology, pharmacy, blood, ambulance, referral, invoice ও payment-এ ব্যবহার হয়।
3. কোনো billable service নিলে সংশ্লিষ্ট invoice তৈরি হয়; payment হলে invoice-এর paid/due status database থেকে হিসাব হয়।
4. IPD admission হলে selected bed occupied হয়; discharge/transfer ছাড়া সেই bed available করা যায় না।
5. Pharmacy sale হলে non-expired batch থেকে FEFO নিয়মে stock কমে; refund হলে যে batch থেকে stock গিয়েছিল সেই batch-এই ফেরত যায়।
6. Blood issue-এর আগে screening, expiry এবং donor-recipient compatibility যাচাই হয়।
7. Lab/radiology order billing-এর সাথে যুক্ত হয়; result ছাড়া completed করা যায় না এবং final diagnostic history স্থায়ীভাবে সংরক্ষিত থাকে।
8. নতুন Centralized EMR-এ একই patient-এর allergy, problem/diagnosis, clinical history, vital signs এবং clinical notes দেখা ও manage করা যায়।
9. Finance report invoice, payment, income, expense ও contra-এর database data থেকে ledger/balance হিসাব করে।
10. প্রতিটি গুরুত্বপূর্ণ create/update/delete/login action audit trail-এ যায়।

## ৩. এই upgrade-এ নতুন যা হয়েছে

### Organization hierarchy

`Hospital Group → Hospital → Branch` এখন real relational database structure। Organization & Branch Management screen থেকে group, hospital এবং branch create/edit করা যায়। Duplicate scoped code, inactive parent, main branch এবং child/assigned-user থাকা অবস্থায় unsafe delete backend থেকে আটকানো হয়।

### Centralized EMR

Patient List-এর প্রতিটি patient-এর পাশে **Centralized EMR** action আছে। EMR screen-এ:

- Allergy
- Problem & Diagnosis
- Clinical History
- Vital Signs
- Clinical Notes

সবকিছু real API ও database-এ সংরক্ষিত হয়। Vital entry-তে অন্তত একটি measurement বাধ্যতামূলক; height/weight থাকলে BMI হিসাব হয়; final/amended clinical note silently edit/delete করা যায় না।

### Workflow & Approval Center

Settings → Workflow & Approvals-এ reusable multi-step approval engine আছে। এখানে:

- Workflow definition এবং ordered steps
- Role-based বা নির্দিষ্ট user approver
- Minimum approval count
- Amount range
- Due hours
- Draft → In Review → Approved/Rejected/Cancelled lifecycle
- Self-approval protection
- Duplicate approval protection
- Rejection reason বাধ্যতামূলক
- Permanent action timeline
- Summary report এবং CSV export

কাজ করে। Procurement/refund/payroll-এর মতো ভবিষ্যৎ module এই engine ব্যবহার করবে; ঐ business module-গুলো এখনো সব যুক্ত হয়নি।

### Granular permission matrix

Settings → User Manage → Access screen-এ প্রতিটি module/screen-এর জন্য নিচের permission আলাদাভাবে দেয়া যায়:

| Permission | কাজ |
|---|---|
| View | list/detail দেখা |
| Create | নতুন record তৈরি |
| Edit | record update |
| Delete | record delete |
| Approve | approval দেয়া |
| Reject | reject করা |
| Print | print action |
| Export | CSV/PDF/Excel export action |
| Refund | refund/reversal action |
| Sensitive | EMR/patient timeline/diagnostic sensitive data দেখা |

Permission save করার পর নতুন login ছাড়াই backend enforcement বদলে যায়। শুধু menu hide নয়—API-তেও access control হয়।

### Security Activity

Settings → Security Activity-তে successful/failed login history এবং audit trail দেখা, search ও CSV export করা যায়। Password/token audit record-এ `[REDACTED]` হয়। Browser QA-তে পাওয়া timestamp display bug-ও ঠিক করা হয়েছে।

### Enterprise roles

বর্তমানে ২৮টি role value আছে:

Super Admin, Admin, Hospital Admin, Branch Admin, CEO, Management, Doctor, Nurse, Receptionist, Cashier, Accountant, Finance Manager, Pharmacist, Lab Technician, Pathologist, Radiologist, OT Staff, Anesthetist, ICU Staff, Blood Bank Staff, Procurement Officer, Store Manager, HR Manager, Housekeeping, Dietician, Ambulance Staff, Insurance Officer এবং Patient।

এটি compatibility foundation। পূর্ণ normalized role assignment, MFA, device/session policy এবং field-level permission এখনো বাকি।

## ৪. Frontend demo sequence

Presentation/demo-তে এই order অনুসরণ করলে flow পরিষ্কার হবে:

1. Dashboard খুলে live summary cards দেখান।
2. Settings → Organization & Branch Management থেকে Hospital Group → Hospital → Branch hierarchy দেখান।
3. Settings → User Manage থেকে একটি user-এর role, branch এবং action permission matrix দেখান।
4. Patient → Patient List থেকে একটি patient-এর Centralized EMR খুলুন।
5. Allergy বা Vital Sign save করে দেখান; tab count update এবং database-backed history দেখান।
6. Appointment/OPD/IPD flow দেখান এবং সংশ্লিষ্ট invoice/payment status দেখান।
7. Bed Availability-তে occupied/available হিসাব দেখান; active admission থাকা bed manually available করা যায় না—এই protection ব্যাখ্যা করুন।
8. Pathology/Radiology order → bill → result → completion flow দেখান।
9. Pharmacy purchase/batch stock → sale → stock reduction → return flow দেখান।
10. Blood stock/issue-তে screening, expiry ও compatibility validation ব্যাখ্যা করুন।
11. Finance → income/expense/contra এবং Reports → ledger/account balance দেখান।
12. Settings → Workflow & Approvals-এ multi-step approval lifecycle দেখান।
13. Settings → Security Activity-তে login/audit trail দেখিয়ে accountability বোঝান।
14. User menu থেকে Sign out করে demo শেষ করুন।

## ৫. Measured system inventory

| Item | Count |
|---|---:|
| Backend routed modules | 25 |
| Frontend page components | 152 |
| Frontend route declarations | 156 |
| Backend API declarations | 382 |
| Sequelize domain models | 65 |
| Live database tables | 68 |
| Functional migrations | 29 |
| Automated backend tests | 165 |

## ৬. QA result

- Backend test: **165 passed, 0 failed**।
- Frontend production build: **passed**।
- Browser smoke test: Organization, EMR, Workflow & Approval এবং Security Activity real API dataসহ load হয়েছে।
- Database migration: **No pending migrations**।
- Frontend `3000`, backend `5000`, MySQL `3306`: final health check-এ তিনটিই running ছিল।
- Live schema snapshot: 68 table।
- Vite build-এ বড় JavaScript bundle warning আছে; feature-route code splitting production optimization হিসেবে বাকি।

## ৭. এখনো যেগুলো complete নয়

নিচের অংশগুলোকে এই release-এ complete বলা যাবে না:

- Emergency Department
- ICU / Critical Care
- Nursing ও Medication Administration Record
- Operation Theatre / Surgery
- Central Inventory & Store
- Procurement lifecycle
- Insurance / TPA / Corporate Billing
- Full double-entry General Ledger ও financial closing
- Asset, equipment ও preventive maintenance
- Facility maintenance
- Housekeeping
- Laundry/Linen
- Dietary/Nutrition
- Patient web portal
- Complete doctor workspace/portal
- CEO cross-branch BI dashboard
- Notification orchestration
- External gateway/LIS/RIS/PACS/DICOM/biometric/insurance integrations
- সব পুরনো operational table-এ organization/hospital/branch scoping
- সব clinical event-এর centralized EMR timeline integration
- সব service-এর service catalogue-based automatic charge posting

## ৮. Production-readiness verdict

সিস্টেমের existing departmental workflow এবং এই tranche-এর enterprise foundation বাস্তব, database-backed ও tested। কিন্তু উপরের remaining module-গুলো UI + API + database + business rules + RBAC + validation + audit + reporting + integration testসহ শেষ না হওয়া পর্যন্ত পুরো product-কে **complete enterprise HMS** বা **fully production-ready enterprise ERP** বলা সঠিক হবে না।

পরবর্তী implementation priority হওয়া উচিত:

1. Service/charge catalogue এবং সব clinical billing integration
2. সব legacy table-এ branch ownership/scoping
3. Normalized roles, sessions, MFA ও field-level security
4. Emergency → Nursing → ICU → OT clinical chain
5. Inventory → Procurement → AP/GL financial chain
6. Insurance, portals, BI, notifications এবং integrations
