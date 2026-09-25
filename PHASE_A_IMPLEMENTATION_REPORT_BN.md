# HMS Phase A — বাস্তবায়ন ও যাচাই রিপোর্ট

**তারিখ:** ২৫ সেপ্টেম্বর ২০২৬  
**Scope:** Service & Charge Catalogue এবং Enterprise Organization/Hospital/Branch/Department scoping  
**অবস্থা:** Phase A বাস্তবায়িত; Phase B বা পরের phase এই রিপোর্টে সম্পন্ন বলে দাবি করা হয়নি।

## ১. কী তৈরি হয়েছে

পুরোনো doctor, laboratory, radiology, bed, ambulance, pharmacy এবং blood-bank charge source না ভেঙে একটি central catalogue যোগ হয়েছে। এখন একটি service-এর:

- স্থায়ী code, type, category ও billing unit থাকে;
- organization, hospital বা branch অনুযায়ী আলাদা price version রাখা যায়;
- self, corporate, insurance বা government payer অনুযায়ী price নির্ধারণ করা যায়;
- effective date, tax, discount/surcharge rule এবং approval status থাকে;
- approved price-ই live billing resolver ব্যবহার করে;
- invoice item-এ ব্যবহৃত service, price-version এবং immutable pricing snapshot সংরক্ষিত হয়।

## ২. নতুন frontend page

**Settings → Service Catalogue**  
URL: `http://localhost:3000/settings/service-catalog`

এই page-এর সব visible data live API/database থেকে আসে। Tabs:

1. **Summary** — catalogue count, approved price value এবং service-type charge summary।
2. **Service Types** — Consultation, Laboratory, Radiology ইত্যাদি group।
3. **Categories** — type-এর অধীনে service category।
4. **Services** — billable service, code, unit ও scope।
5. **Price Versions** — amount, currency, tax, payer, scope, effective dates ও approval।
6. **Pricing Rules** — percentage discount, flat discount, surcharge ও tax override।
7. **Branch Pricing** — approved branch-specific price-এর read-only report।
8. **History & Export** — immutable price history এবং CSV export।

Approved/retired price বা rule UI থেকে edit/delete করা যায় না; নতুন version করতে হয়। Search Enter key এবং Refresh—দুটিই বাস্তব request চালায়।

## ৩. নতুন database structure

Phase A-তে ছয়টি catalogue table যোগ হয়েছে:

| Table | কাজ |
|---|---|
| `service_types` | প্রধান service group |
| `service_categories` | type-এর অধীন category |
| `services` | central billable service master |
| `service_prices` | scoped/effective/versioned price |
| `pricing_rules` | approved discount, surcharge ও tax rule |
| `service_source_links` | legacy doctor/test/bed/medicine ইত্যাদির সঙ্গে service mapping |

`invoice_items`-এ `service_id`, `service_price_id` এবং `pricing_snapshot` যোগ হয়েছে। Organization/branch security-এর জন্য ৩৭টি operational/root table-এ প্রয়োজনীয় organization, hospital, branch এবং প্রযোজ্য ক্ষেত্রে department ownership যোগ ও backfill করা হয়েছে।

Migration:

- `030-enterprise-service-charge-catalogue.js`
- `031-enterprise-operational-scope.js`
- `032-catalogue-backfill-price-reconciliation.js`
- `033-service-price-version-uniqueness.js`

বর্তমান live database-এ migration `001–033` applied এবং মোট ৭৪টি table আছে। Catalogue-এ ৮ type, ৮ category, ১৩৭ service, ১৩৭ price-version এবং ১৩৭ source-link আছে। কোনো fake pricing rule seed করা হয়নি; তাই rule count বর্তমানে ০ এবং authorized manager UI থেকে বাস্তব rule তৈরি করবে।

## ৪. নতুন API

Base path: `/api/v1/service-catalog`

| Method/path | কাজ |
|---|---|
| `GET /meta` | dropdown এবং summary metadata |
| `GET /resolve` | scope/payer/date অনুযায়ী approved price resolve |
| `GET /reports/service-summary` | service-wise charge summary |
| `GET /reports/branch-pricing` | branch-wise approved pricing |
| `GET /reports/price-history` | immutable price history |
| `GET/POST /types` | service type list/create |
| `GET/POST /categories` | category list/create |
| `GET/POST /services` | service list/create |
| `GET/POST /prices` | price version list/create |
| `GET/POST /rules` | pricing rule list/create |
| `GET/PATCH/DELETE /:entity/:id` | detail/update/delete, policy সাপেক্ষে |
| `POST /prices/:id/submit|approve|reject` | price approval lifecycle |
| `POST /rules/:id/submit|approve|reject` | rule approval lifecycle |

সব route authenticated। Read access non-patient staff-এর জন্য; create/update/delete managers-এর জন্য; approve/reject privileged approvers-এর জন্য। Super Admin, Admin, Hospital Admin, Branch Admin ও Finance Manager approve করতে পারে। Accountant create/manage করতে পারে, কিন্তু approve করতে পারে না। প্রতিটি write/decision audit trail-এ যায়।

## ৫. Price resolution কীভাবে কাজ করে

একটি bill তৈরির সময় resolver নিচের order অনুসরণ করে:

1. শুধু `approved` price নেয়;
2. service date `effective_from/effective_to` range-এর মধ্যে থাকতে হয়;
3. exact branch price থাকলে সেটি আগে;
4. না থাকলে hospital price;
5. না থাকলে organization-wide price;
6. exact payer match `all` payer-এর আগে;
7. একই scope-এ সর্বশেষ version নেয়;
8. approved pricing rule priority অনুযায়ী প্রয়োগ করে;
9. final amount, base amount, tax, rule adjustments ও price-version invoice line snapshot-এ রাখে।

Overlapping price period backend reject করে। Approved record immutable, তাই historical invoice পরে catalogue বদলালেও আগের calculation হারায় না।

## ৬. কোন billing flow যুক্ত হয়েছে

- Doctor consultation / OPD
- Laboratory order
- Radiology order
- Ambulance trip
- Blood issue
- Manual invoice item
- Pharmacy/medicine classification ও source mapping
- Bed charge classification ও source mapping

Catalogue-এ approved mapped price থাকলে সেটি ব্যবহার হয়। পুরোনো/custom data-তে mapping না থাকলে compatibility বজায় রাখতে existing legacy price fallback থাকে। Existing invoice/payment total calculation এবং exact minor-unit money logic অপরিবর্তিত রাখা হয়েছে।

## ৭. Organization ও branch isolation

- `super_admin` ও legacy `admin`: global administrative visibility।
- `ceo` / `management`: নিজ organization।
- `hospital_admin`: নিজ hospital।
- `branch_admin` এবং branch staff: নিজ branch।
- department-bound staff: supported record-এ department restriction।
- Patient master: একটি organization-এর মধ্যে এক MRN; কিন্তু encounter, order, invoice ও operation branch-owned।

Backend request context read, count, aggregate, create, update ও delete-এ scope inject করে। Client payload দিয়ে অন্য branch/organization ownership বসানোর চেষ্টা reject হয়।

## ৮. Approval ও audit workflow

Price/rule lifecycle:

`Draft → Submit/Pending → Approve অথবা Reject`

Matching workflow definition configured থাকলে existing multi-step approval engine-এর request তৈরি হয়। অনুমোদিত workflow শেষ না হওয়া পর্যন্ত সাধারণ approver catalogue row approve করতে পারে না। System Admin emergency approval করতে পারলেও action audit log-এ থাকে।

Audit entity:

- `service_type`
- `service_category`
- `service`
- `service_price`
- `pricing_rule`

## ৯. Verification result

| Check | Result |
|---|---|
| Backend automated tests | **168/168 passed** |
| Phase A catalogue/tenant tests | Backfill, CRUD, overlap, approval, resolver, invoice snapshot এবং cross-branch isolation passed |
| Frontend production build | Passed; ২৬৪ modules transformed |
| Migration status | `001–033` applied; কোনো pending migration নেই |
| Manual API CRUD | Type/category/service/price create, approve, resolve এবং cleanup passed |
| Report API smoke | Service summary, branch pricing এবং history response passed |
| Schema snapshot | `database/schema.sql` regenerated |

## ১০. Presentation/demo flow

1. Admin দিয়ে login করুন।
2. **Settings → Service Catalogue → Summary** খুলে live counts দেখান।
3. **Services** tab-এ existing doctor/lab/radiology/bed/ambulance/medicine services দেখান।
4. **Price Versions**-এ একটি draft price বানান; payer, branch ও date দেখান।
5. Draft submit করে approver account থেকে approve দেখান।
6. **Summary → Live Price Resolver** দিয়ে একই service resolve করে final price দেখান।
7. সংশ্লিষ্ট OPD/lab/radiology/ambulance/blood/manual billing flow চালিয়ে invoice তৈরি করুন।
8. Invoice item-এ catalogue price ব্যবহৃত হয়েছে এবং finance/payment flow-তে total গেছে—এটি দেখান।
9. **Branch Pricing**-এ branch-specific approved amount দেখান।
10. **History & Export**-এ version history এবং CSV export দেখান।
11. অন্য branch user দিয়ে login করে cross-branch operational data দেখা যাচ্ছে না—এটি দেখান।
12. Audit/Security Activity page-এ catalogue write/approval action দেখান।

## ১১. সীমাবদ্ধতা ও পরের phase

- Phase A শুধু catalogue ও enterprise scoping foundation; পরে চাওয়া Inventory/Procurement, Insurance/TPA, OT, CSSD, LIS/RIS/PACS enhancement, Payroll automation ইত্যাদি এখনো Phase A completion-এর অংশ নয়।
- Existing live rows-এর কিছু bed/ambulance base price শূন্য ছিল; ভুল zero amount bill না করার জন্য সেগুলো draft/fallback-safe রাখা হয়েছে। Manager বাস্তব rate দিয়ে নতুন approved version করবে।
- Frontend build সফল, তবে Vite একটি non-blocking large bundle warning দেয়; code splitting পরের performance hardening task।
- Catalogue-এ fake discount/tax rule দেয়া হয়নি। Business-approved rule না পাওয়া পর্যন্ত rule count শূন্য থাকাই সঠিক।
- Legacy charge columns compatibility-এর জন্য রাখা হয়েছে; data validation শেষে future migration-এ read-only mirror করা যেতে পারে।

