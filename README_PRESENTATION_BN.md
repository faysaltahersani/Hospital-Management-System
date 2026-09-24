# Hospital Management System — বাংলা প্রেজেন্টেশন স্টাডি গাইড

> **এই ফাইলটি কাদের জন্য:** এটি কোম্পানিকে সরাসরি দেখানোর স্লাইড নয়। প্রেজেন্টেশনের আগে আপনি নিজে পুরো প্রজেক্টটি বোঝার, অনুশীলন করার এবং পরে নিজের ভাষায় কোম্পানিকে বুঝিয়ে বলার জন্য এই গাইডটি পড়বেন। এখানে কোড বা API নয়—শুধু ইন্টারফেস, হাসপাতালের বাস্তব কাজের ধাপ, টাকা-পয়সার হিসাব, ডেটাবেজে তথ্যের ধারাবাহিকতা এবং লাইভ ডেমোর নিয়ম বোঝানো হয়েছে।

---

## ১. এক মিনিটে পুরো প্রজেক্টের পরিচয়

এটি একটি পূর্ণাঙ্গ **Hospital Management System (HMS)**। একটি হাসপাতালের রোগী নিবন্ধন থেকে শুরু করে ডাক্তার অ্যাপয়েন্টমেন্ট, OPD, IPD ও বেড, প্যাথলজি, রেডিওলজি, ফার্মেসি, ব্লাড ব্যাংক, অ্যাম্বুলেন্স, রেফারেল, HR ও Payroll, আয়-ব্যয়, হিসাব এবং রিপোর্ট—সবকিছু একটি সিস্টেমের মধ্যে পরিচালনা করা যায়।

এই প্রজেক্টের মূল সুবিধা হলো, একই রোগীর তথ্য বারবার আলাদা করে লিখতে হয় না। রোগী একবার তৈরি হলে তার Patient ID ব্যবহার করে অ্যাপয়েন্টমেন্ট, ভর্তি, টেস্ট, ওষুধ, পেমেন্ট ও রিপোর্টকে একই ধারাবাহিকতায় রাখা যায়।

প্রেজেন্টেশনে সবচেয়ে গুরুত্বপূর্ণ কথাটি হবে:

> **“এই সিস্টেমে শুধু তথ্য লেখা হয় না; একটি বিভাগে করা কাজের ফল অন্য সংশ্লিষ্ট বিভাগ, ফাইন্যান্স, স্টক, বেড এবং রিপোর্টে প্রতিফলিত হয়।”**

---

## ২. সিস্টেমের মূল কাজের ধারা

```text
Login
  ↓
Patient Registration / Existing Patient নির্বাচন
  ↓
Service নির্বাচন
  ├─ Doctor Appointment
  ├─ OPD / IPD / Bed
  ├─ Pathology / Radiology
  ├─ Pharmacy / Medicine
  ├─ Blood Bank
  ├─ Ambulance
  └─ Referral
  ↓
Bill / Invoice তৈরি
  ↓
Payment গ্রহণ (পূর্ণ অথবা আংশিক)
  ↓
Patient Due + Account/Finance + সংশ্লিষ্ট Record আপডেট
  ↓
Dashboard ও Reports-এ ফলাফল দেখা
  ↓
Admin Menu → Log Out
```

### Entry, Record, Finance এবং Report—এই চারটি শব্দ মনে রাখুন

- **Entry:** নতুন কাজ তৈরি করা—যেমন নতুন রোগী, অ্যাপয়েন্টমেন্ট, বিল, খরচ বা ওষুধ ক্রয়।
- **Record/List:** আগে করা কাজ খোঁজা, দেখা, যাচাই বা প্রয়োজনমতো পরবর্তী ব্যবস্থা নেওয়া।
- **Finance:** টাকা কোথা থেকে এলো, কোথায় গেল, কোন অ্যাকাউন্টে গেল এবং কত বাকি আছে।
- **Report:** তারিখ, রোগী, সাপ্লায়ার, রেফারেল ব্যক্তি বা অ্যাকাউন্ট অনুযায়ী সংক্ষিপ্ত ও বিস্তারিত ফলাফল।

প্রতিটি মডিউল বোঝানোর সময় এই চারটির মধ্যে সেটি কোথায় পড়ে তা বললে শ্রোতা দ্রুত বুঝবে।

---

## ৩. লগইন এবং প্রথম পরিচিতি

### ডেমো লগইন

- **Username / Email:** `admin@hospital.local`
- **Password:** `HmsQaAdmin2026x`

> এগুলো ডেমো পরিবেশের তথ্য। কোম্পানিকে হস্তান্তরের আগে শক্তিশালী নতুন পাসওয়ার্ড এবং প্রয়োজন অনুযায়ী আলাদা User/Role তৈরি করতে হবে।

### লগইন করার পর কী বলবেন

“আমি এখন Admin হিসেবে লগইন করেছি। Admin সব মডিউল দেখতে এবং Settings পরিচালনা করতে পারে। বাস্তব ব্যবহারে Reception, Doctor, Lab, Pharmacy ও Accounts-এর জন্য আলাদা User এবং প্রয়োজন অনুযায়ী অনুমতি দেওয়া হবে।”

### উপরের Navigation Bar কী বোঝায়

Navigation Bar-এ দ্রুত কাজের জন্য Options ও Quick Options, সামগ্রিক অবস্থা দেখার জন্য Dashboard, সব মডিউলের এক জায়গার তালিকার জন্য Modules, তারপর বিভাগভিত্তিক মেনু এবং সর্বশেষে Admin user menu আছে।

---

## ৪. Dashboard — হাসপাতালের এক নজরের অবস্থা

Dashboard হলো সিস্টেমের Management Summary। এখানে ক্লিক করেই একটি প্রতিষ্ঠানের বর্তমান অবস্থা বোঝা যায়।

বর্তমান ডেমো ডেটায় দেখা গেছে:

- Cash balance: **৳17,100**
- Bank balance: **৳0**
- Total patients: নতুন ডেমো রোগীসহ **25**
- Total doctors: **12**
- Active admissions: **10**
- Available beds: **24**
- Low-stock medicines: **1**
- Blood bags status-এ Available: **2** (তবে দুটিই মেয়াদোত্তীর্ণ—Blood অংশের সতর্কতা দেখুন)

### Dashboard দেখানোর সময় কী বলবেন

“এটি প্রশাসনের দ্রুত সিদ্ধান্ত নেওয়ার জায়গা। এখানে রোগী, ডাক্তার, ভর্তি, বেড, স্টক এবং আর্থিক অবস্থা এক নজরে দেখা যায়। বিস্তারিত যাচাই করার জন্য সংশ্লিষ্ট Module বা Report-এ যাওয়া যায়।”

### গুরুত্বপূর্ণ ভাষা

Dashboard-এর সংখ্যা হচ্ছে **summary**। বিস্তারিত প্রমাণ দেখানোর জন্য অবশ্যই সংশ্লিষ্ট Record বা Report খুলবেন। শুধু Dashboard-এর সংখ্যা দেখিয়ে থেমে যাবেন না।

---

## ৫. Options ও Quick Options

### Options

এখানে নিয়মিত ব্যবহৃত shortcut সংরক্ষিত থাকে। বর্তমান সিস্টেমে আছে:

- Pathology Bill Entry / Record
- Radiology Bill Entry / Record
- OPD Bill Entry / Record
- IPD Bill Entry / Record
- Blood Issue / Record
- Blood Component Issue / Record
- Blood Donate / Record
- Component Separation Entry / Record
- Pharmacy Sales / Purchase / Return এবং তাদের Record
- Call Ambulance Entry / Record
- Referral Bill Entry / Record
- Expense Entry / Record

**বোঝানোর ভাষা:** “অপারেটর যেন দীর্ঘ মেনু ঘুরে দৈনন্দিন কাজ খুঁজতে না হয়, তাই বেশি ব্যবহৃত Entry এবং Record-এর shortcut এখানে রাখা হয়েছে।”

### Quick Options

Quick Options দুই ধরনের shortcut দেয়:

#### Quick Entry

- Pathology Bill Entry
- Radiology Bill Entry
- Appointment Bill
- Call Ambulance Entry
- OPD Bill Entry
- IPD Bill Entry
- Pharmacy Sales
- Blood Donate
- Blood Bank Stock
- Blood Issue / Blood Component Issue
- Doctor / Patient
- Bed Availability

#### Quick Record

- Pathology, Radiology, Appointment, Ambulance, OPD, IPD
- Pharmacy Sales
- Blood Donate / Blood Issue / Component Issue-এর Record

**Options বনাম Quick Options:** Options হলো পছন্দের/saved shortcut তালিকা; Quick Options হলো সিস্টেম নির্ধারিত বহুল ব্যবহৃত Entry ও Record-এর দ্রুত দরজা।

---

## ৬. Modules পেজ

Modules পেজে বড় Tile আকারে প্রধান বিভাগগুলো পাওয়া যায়:

Appointment, Doctor, Pathology, Radiology, Blood, Pharmacy Sales, Medicine, Finance, Reports, Bed, Ambulance, OPD, IPD এবং Patient।

**কখন দেখাবেন:** Navigation-এর dropdown না খুলে একজন নতুন ব্যবহারকারীকে পুরো সিস্টেমের পরিধি বোঝানোর জন্য Modules পেজ খুব কার্যকর।

---

## ৭. Patient Module — সব কাজের কেন্দ্র

### Submenu

- Patient Entry
- Patient List
- Diagnostic History

### Patient Entry

নতুন রোগীর নাম, ফোন, বয়স/জন্মতারিখ, লিঙ্গ, রক্তের গ্রুপ, ঠিকানা, অভিভাবক, পরিচয়পত্র এবং প্রয়োজনীয় মন্তব্য সংরক্ষণ করা হয়। Save হলে রোগীর একটি আলাদা Patient Code তৈরি হয়।

### Patient List

সব রোগীর তালিকা থেকে নাম, ফোন বা Patient Code দিয়ে রোগী খুঁজে পাওয়া যায়। বর্তমান ডেমো রোগী:

- Patient Code: `P-2026-000022`
- Name: `Presentation Demo Patient`
- Phone: `01700009999`
- Age: 35
- Gender: Male
- Blood Group: O+

এই রোগীকে দেখিয়ে বলবেন, “এটি একবার Database-এ তৈরি হয়েছে। এখন একই রোগীকে Appointment, OPD, IPD, Test বা অন্যান্য সেবায় নির্বাচন করা যাবে; আবার নাম-ফোন লিখতে হবে না।”

### Diagnostic History

একজন রোগীর পূর্বের diagnostic কাজ বা পরীক্ষার ইতিহাস এক জায়গায় দেখা যায়। রোগীর চিকিৎসার ধারাবাহিকতা বোঝাতে এটি গুরুত্বপূর্ণ।

### ডেটাবেজে কী হয়

Patient save করার পর একটি স্থায়ী Patient ID/Code তৈরি হয়। পরবর্তী লেনদেনে সম্পূর্ণ রোগীর তথ্য কপি না করে সেই রোগীর reference ব্যবহার করা হয়। এ কারণেই একই রোগীর সব কাজ পরস্পরের সাথে যুক্ত থাকে।

---

## ৮. Doctor Module

### Submenu

- Doctor Entry
- Doctor Department
- Doctor Specialization

### কাজের ধারণা

- **Department:** Medicine, Surgery, Cardiology ইত্যাদি বড় বিভাগ।
- **Specialization:** একজন ডাক্তার কোন বিষয়ে বিশেষজ্ঞ।
- **Doctor Entry:** ডাক্তারকে বিভাগ, বিশেষায়ন ও অন্যান্য প্রয়োজনীয় তথ্যসহ তৈরি করা।

### অন্যান্য মডিউলের সাথে সম্পর্ক

Appointment, OPD বা প্রয়োজনীয় billing flow-তে Doctor নির্বাচন করা হলে সেই Doctor ID লেনদেনের সাথে যুক্ত হয়। পরে ডাক্তারভিত্তিক appointment বা patient activity দেখা যায়।

### বর্তমান ডেমো সতর্কতা

Appointment-এর Doctor dropdown-এ কিছু ডাক্তার নামের পরিবর্তে `DOC-101`-এর মতো Doctor Code দেখা যেতে পারে। কারণ বর্তমান sample data-তে ডাক্তার-সংযুক্ত কিছু user profile soft-deleted। লাইভ প্রেজেন্টেশনের আগে Doctor List-এ নাম ঠিক আছে কি না দেখে নিন এবং প্রয়োজনে একটি পরিষ্কার নতুন demo doctor তৈরি করুন।

---

## ৯. Appointment Module

### Submenu

- Appointment
- Appointment Slots
- Appointment Shift
- Appointment Priority
- Appointment List

### কাজের ধাপ

1. Patient নির্বাচন করুন।
2. Doctor নির্বাচন করুন।
3. Date, shift/slot এবং priority দিন।
4. Consultation fee/charges নিশ্চিত করুন।
5. Payment পূর্ণ বা আংশিক দিন।
6. Save করলে Appointment Record তৈরি হবে।
7. Billing সক্রিয় থাকলে Invoice ও Payment সংশ্লিষ্ট হিসাবে যাবে; বাকি থাকলে Patient Due হিসেবে থাকবে।
8. Appointment List থেকে রেকর্ড যাচাই করুন।

### Appointment Shift, Slot ও Priority

- **Shift:** ডাক্তার কখন রোগী দেখবেন—যেমন Morning 09:00–13:00।
- **Slot:** ওই shift-এর নির্দিষ্ট সময়—যেমন 09:00, 09:30, 10:00।
- **Priority:** Normal, Urgent বা প্রতিষ্ঠানের নির্ধারিত অগ্রাধিকার।

### কীভাবে টাকা বোঝাবেন

ধরুন Consultation Fee ৳1,000:

- রোগী ৳1,000 দিলে: Paid ৳1,000, Due ৳0।
- রোগী ৳600 দিলে: Paid ৳600, Due ৳400।
- পরে ৳400 Due Collection করলে: মোট Paid ৳1,000, Due ৳0।

### বর্তমান ডেমো সতর্কতা

`1st shif` নামে বর্তমান একটি shift `22:55–00:55` কনফিগার করা আছে। এতে মধ্যরাত পার হওয়ার slot `24:25`, `25:25`-এর মতো ভুলভাবে দেখাতে পারে। প্রেজেন্টেশনের আগে Appointment Shift থেকে এটিকে `09:00–13:00`-এর মতো স্বাভাবিক সময় দিয়ে ঠিক করে একটি rehearsal করুন। Appointment-এর নতুন billing/payment flow-ও লাইভ ডেমোর আগে একবার সম্পূর্ণ Save → List → Finance/Report পর্যন্ত অনুশীলন করে নেবেন।

---

## ১০. OPD Module — ভর্তি ছাড়া বহির্বিভাগের চিকিৎসা

### Submenu

- OPD Bill Entry
- Symptoms Manage
- OPD Bill Record

### Scenario

একজন রোগী হাসপাতালে ডাক্তার দেখাবেন, কিন্তু ভর্তি হবেন না। Patient নির্বাচন করে symptoms, doctor/charge এবং প্রয়োজনীয় তথ্য দিয়ে OPD bill তৈরি করা হবে। Payment নেওয়া হলে Finance-এ collection যাবে; বাকি থাকলে Patient Due থাকবে।

### কী দেখাবেন

1. OPD Bill Entry-তে Patient নির্বাচন।
2. Symptoms এবং সেবা/charge যোগ করা।
3. Total, Paid ও Due দেখানো।
4. Save করার পর OPD Bill Record-এ একই bill খোঁজা।
5. প্রয়োজনে Patient Ledger বা Patient Balance Report-এ তার প্রভাব দেখানো।

### OPD বনাম Appointment

Appointment হলো ডাক্তার দেখানোর সময় বুক করা; OPD Bill হলো বহির্বিভাগের বাস্তব service/billing record। একটি হাসপাতালের নিয়ম অনুযায়ী দুটো একই workflow-এর অংশ হতে পারে, আবার আলাদাও পরিচালিত হতে পারে।

---

## ১১. IPD Module — ভর্তি রোগীর চিকিৎসা

### Submenu

- IPD Bill Entry
- Symptoms Manage
- IPD Bill Record

### Scenario

রোগীর দীর্ঘমেয়াদি চিকিৎসা বা পর্যবেক্ষণের প্রয়োজন হলে তাকে IPD-তে ভর্তি করা হয়। এর সাথে admission, bed allocation, service charge, payment এবং discharge জড়িত থাকে।

### দেখানোর ধাপ

1. রোগী নির্বাচন।
2. IPD/admission তথ্য ও symptoms দিন।
3. Available bed নির্বাচন করুন।
4. প্রাথমিক বিল বা deposit নিন।
5. Record থেকে admission দেখুন।
6. Bed Management/Availability-তে bed-এর অবস্থা দেখুন।
7. শেষে discharge হলে bed আবার Available হয় এবং চূড়ান্ত হিসাব সম্পন্ন হয়।

### মূল কথা

IPD শুধু একটি bill নয়। এটি রোগী, admission, bed, services, payment এবং discharge—এই পুরো lifecycle পরিচালনা করে।

---

## ১২. Bed Module — বেডের বাস্তব availability

### Submenu

- Bed Entry
- Bed Management
- Bed Availability

### প্রতিটি অংশের কাজ

- **Bed Entry:** Ward/Room অনুযায়ী নতুন bed তৈরি, bed number ও charge নির্ধারণ।
- **Bed Management:** কোন bed কার কাছে allocated, occupied বা release হবে তা পরিচালনা।
- **Bed Availability:** কোন bed Available/Occupied তা দ্রুত দেখা।

### প্রেজেন্টেশনের সবচেয়ে ভালো live scenario

বর্তমান baseline:

- Total beds: **34**
- Available: **24**
- Occupied: **10**

একজন নতুন রোগীকে একটি Available bed দিলে প্রত্যাশিত ফল:

```text
আগে: Available 24 | Occupied 10
ভর্তির পরে: Available 23 | Occupied 11
Discharge/Release-এর পরে: Available 24 | Occupied 10
```

### কোথায় প্রমাণ করবেন

- IPD/Admission Record-এ রোগী ও bed।
- Bed Availability-তে bed-এর নতুন status।
- Reports → Bed Occupancy-তে সামগ্রিক পরিবর্তন (যদি বর্তমান report menu/view-তে থাকে)।

### কী বলবেন

“একটি bed দুইজনকে দেওয়া ঠেকাতে allocation-এর সময় শুধু Available bed ব্যবহার করা হয়। ভর্তি হলে bed occupied এবং release/discharge হলে আবার available হয়।”

---

## ১৩. Pathology Module

### Submenu

- Pathology Bill Entry
- Pathology Test
- Pathology Test Category Entry
- Pathology Parameter Entry
- Pathology Test Unit
- Pathology Bill Record
- Pathology Test List

### Master setup বনাম Transaction

- Test Category, Parameter ও Unit হচ্ছে setup/master data।
- Pathology Test-এ পরীক্ষার নাম, মূল্য এবং প্রয়োজনীয় parameter সাজানো হয়।
- Pathology Bill Entry হচ্ছে রোগীর বাস্তব transaction।
- Bill Record/List হচ্ছে সংরক্ষিত কাজের প্রমাণ।

### Scenario

রোগী CBC করাবেন:

1. Patient নির্বাচন।
2. CBC Test নির্বাচন—দাম স্বয়ংক্রিয়ভাবে bill-এ আসে।
3. Discount/Tax থাকলে দিন।
4. Payment নিন।
5. Bill Save করুন।
6. Pathology Bill Record-এ bill দেখান।
7. Patient Diagnostic History-তে রোগীর সাথে সংযোগ দেখান।
8. Finance/Patient Ledger-এ অর্থের প্রভাব দেখান।

### কী বলবেন

“Test master একবার তৈরি করলে operator শুধু test নির্বাচন করে। এতে নাম, দাম, unit ও parameter বারবার লিখতে হয় না এবং ভুল কমে।”

---

## ১৪. Radiology Module

### Submenu

- Radiology Bill Entry
- Radiology Test
- Radiology Test Category Entry
- Radiology Parameter Entry
- Radiology Test Unit
- Radiology Bill Record
- Radiology Test List

### Scenario

X-Ray, Ultrasound, CT Scan বা অন্যান্য imaging test রোগীর নামে bill করা হয়। Process Pathology-এর মতো হলেও এটি আলাদা বিভাগ হিসেবে record এবং report রাখে।

### Demo flow

Patient → Radiology Test → Bill amount → Payment → Radiology Bill Record → Patient Ledger/Finance।

### Pathology বনাম Radiology

- Pathology: sample/lab ভিত্তিক পরীক্ষা।
- Radiology: image/scanning ভিত্তিক পরীক্ষা।
- হিসাবের কাঠামো একই হলেও operational record আলাদা।

---

## ১৫. Medicine Module — ওষুধের master catalogue

### Submenu

- Medicine Entry
- Medicine Unit
- Medicine Group
- Medicine Category
- Medicine Company
- Medicine List

### ধারণা

Medicine Module-এ ওষুধের পরিচয় ও শ্রেণিবিন্যাস তৈরি হয়। এখানে সরাসরি বিক্রির চেয়ে master data বেশি গুরুত্বপূর্ণ।

- Unit: Tablet, Capsule, Bottle ইত্যাদি।
- Group/Category: ওষুধের শ্রেণি।
- Company: প্রস্তুতকারক প্রতিষ্ঠান।
- Medicine Entry/List: ওষুধ তৈরি ও দেখা।

এই master data পরবর্তীতে Pharmacy Purchase/Sales-এ ব্যবহার হয়।

---

## ১৬. Pharmacy Module — ক্রয়, বিক্রয়, ফেরত এবং স্টক

### Submenu

- Pharmacy Sales
- Pharmacy Purchase
- Pharmacy Sales Return
- Pharmacy Purchase Return
- Pharmacy Supplier
- Medicine Batch Wise Stock
- Medicine Stock Report
- Pharmacy Sales Record
- Pharmacy Purchase Record
- Pharmacy Sales Return Record
- Pharmacy Purchase Return Record

### Purchase flow

Supplier থেকে ওষুধ কিনলে:

1. Supplier নির্বাচন।
2. Medicine, batch, expiry, quantity ও purchase price দিন।
3. Purchase save হলে stock বাড়ে।
4. Supplier payable/accounting record প্রয়োজন অনুযায়ী তৈরি হয়।

### Sales flow

রোগী/ক্রেতাকে ওষুধ বিক্রি করলে:

1. Medicine ও batch নির্বাচন।
2. Quantity এবং sale price নিশ্চিত করুন।
3. Payment নিন।
4. Sales save হলে stock কমে এবং collection Finance-এ যায়।

### Return flow

- Sales Return হলে বিক্রি ফেরত নেওয়ার কারণে সংশ্লিষ্ট stock বাড়তে পারে এবং টাকার adjustment হয়।
- Purchase Return হলে supplier-কে ওষুধ ফেরত দেওয়ার কারণে stock কমে এবং payable/হিসাব adjust হয়।

### Quantity দিয়ে প্রমাণ

```text
শুরুর stock: 100 tablet
Purchase: +50  → stock 150
Sales: -10     → stock 140
Sales Return: +2 → stock 142
Purchase Return: -5 → stock 137
```

### Expiry ও Low Stock

Batch Wise Stock দিয়ে batch-ভিত্তিক quantity ও expiry দেখা যায়। Current Stock Expiry report দিয়ে কোন batch মেয়াদ শেষ হওয়ার কাছাকাছি তা দেখা যায়। Low-stock summary পুনরায় purchase করার সিদ্ধান্ত নিতে সাহায্য করে।

---

## ১৭. Blood Module

### Submenu

- Blood Bank Stock UI
- Blood Issue
- Blood Component Issue
- Blood Donate
- Component Separation Entry
- Blood Donor
- Blood Group
- Blood Unit
- Component Entry
- Blood Issue Record
- Blood Component Issue Record
- Blood Donate Record
- Component Separation Record

### সম্পূর্ণ lifecycle

```text
Donor তৈরি
  ↓
Blood Donate
  ↓
Screening / Blood Group / Expiry তথ্য
  ↓
Blood Bank Stock
  ↓
প্রয়োজনে Component Separation
  ↓
Patient-এর জন্য Blood Issue / Component Issue
  ↓
Issue Record + Stock কমে যাওয়া + Bill/Payment
```

### Safety logic

- Compatible blood group যাচাই দরকার।
- Expired bag issue করা যাবে না।
- Available status থাকলেও expiry date অতিক্রম করলে bag ব্যবহারযোগ্য নয়।
- Issue হলে একই bag পুনরায় Available থাকা উচিত নয়।

### বর্তমান ডেমো সতর্কতা—খুব গুরুত্বপূর্ণ

বর্তমান database-এ status অনুযায়ী **2টি bag Available**, কিন্তু দুটির expiry date **30 August 2026**, আর বর্তমান তারিখ **23 September 2026**। অর্থাৎ usable non-expired available bag বাস্তবে **0**। সিস্টেম expired bag issue হতে বাধা দিচ্ছে—এটি safety feature কাজ করার প্রমাণ। কিন্তু Dashboard status-only count দিয়ে 2 দেখাচ্ছে, তাই এই সংখ্যা usable stock হিসেবে দাবি করবেন না।

প্রেজেন্টেশনের আগে:

1. একটি নতুন valid demo donation তৈরি করুন; অথবা
2. expired bag-গুলোর operational status ঠিকভাবে Expired করুন; এবং
3. Dashboard-এর Available Blood count যেন expiry-ও বিবেচনা করে—এটি future improvement হিসেবে উল্লেখ করুন।

---

## ১৮. Ambulance Module

### Submenu

- Call Ambulance Entry
- Ambulance Entry
- Call Ambulance Record

### কাজ

- Ambulance Entry-তে গাড়ি, driver, contact এবং charge সম্পর্কিত master information রাখা হয়।
- Call Ambulance Entry-তে রোগী/গ্রাহকের pickup, destination, ambulance এবং charge দিয়ে booking তৈরি করা হয়।
- Call Ambulance Record-এ পূর্বের call/booking দেখা যায়।

### Transaction flow

Ambulance নির্বাচন → Call details → Charge → Payment/Due → Record → Finance/Report।

---

## ১৯. Referral Module

### Submenu

- Referral Bill Entry
- Referral Person Entry
- Referral Bill Record
- Referral Person List

### ধারণা

যে ব্যক্তি বা প্রতিষ্ঠান রোগী refer করেন, তাদের তথ্য এবং প্রযোজ্য commission/লেনদেন track করা হয়।

### Scenario

1. Referral Person তৈরি।
2. রোগীর service/bill-এর সাথে referral person যুক্ত।
3. Referral Bill তৈরি।
4. Referral Person Balance এবং Ledger-এ payable/paid history দেখা।

এটি মুখে বলার সময় পরিষ্কার করবেন: referral হিসাব রোগীর treatment charge থেকে আলাদা একটি business payable/commission relationship।

---

## ২০. HR & Payroll Module

### Submenu

- Employee Salary Payment Entry
- Salary Sheet
- Employee Entry
- Department Entry
- Employee Salary Payment Record

### কাজের ধারাবাহিকতা

Department → Employee → Salary Sheet → Salary Payment → Payment Record।

### Finance-এর সাথে সম্পর্ক

Employee salary একটি cash outflow/expense প্রকৃতির লেনদেন। Salary Payment Record দিয়ে কাকে, কোন সময়ের জন্য এবং কত টাকা দেওয়া হয়েছে তা যাচাই করা যায়।

### কী বলবেন

“Hospital operation-এর clinical অংশের পাশাপাশি staff management এবং salary payment-ও একই system-এ রাখা যায়।”

---

## ২১. Finance Module — টাকা-পয়সার মূল কেন্দ্র

### Submenu

- Expense Entry
- Income Entry
- Contra Entry
- Expense Head Entry
- Income Head Entry
- Tax Rate
- Account Entry
- Contra Record
- Expense Record
- Income Record
- Patient Due Collection List

### চার ধরনের আর্থিক ঘটনা

#### ১. Service Revenue / Patient Payment

Appointment, OPD, IPD, Pathology, Radiology, Pharmacy, Blood বা Ambulance bill-এর বিপরীতে রোগীর কাছ থেকে টাকা আসে। এটি service invoice ও payment-এর মাধ্যমে track হয়।

#### ২. Income Entry

Patient service-এর বাইরে অন্য আয়—যেমন rent income, donation, miscellaneous income—এখানে লেখা যায়। বর্তমান design-এ Finance Summary-এর “Revenue Collected” card মূলত invoice payment দেখায়; manual Income Entry আলাদা Income Record/Ledger-এ থাকে। তাই দুইটিকে এক মনে করবেন না।

#### ৩. Expense Entry

বিদ্যুৎ বিল, maintenance, AC servicing বা office expense-এর মতো টাকা বের হওয়ার record। Expense Head দিয়ে খরচের ধরন সাজানো হয়।

#### ৪. Contra Entry

নিজের এক account থেকে অন্য account-এ টাকা স্থানান্তর—যেমন Cash থেকে Bank। এতে প্রতিষ্ঠানের মোট অর্থ বা revenue বাড়ে না; শুধু অর্থের অবস্থান বদলায়।

### Invoice-এর মূল সূত্র

```text
Net Total = Subtotal - Discount + Tax
Due = Net Total - Total Paid
```

### বর্তমান verified demo হিসাব

```text
Subtotal                         ৳1,300
(-) Discount                     ৳100
(+) Tax                           ৳30
--------------------------------------
Net Invoice Total              ৳1,230

Cash Payment                     ৳500
Mobile Banking Payment           ৳730
--------------------------------------
Total Paid                     ৳1,230
Due                                ৳0
Status                           Paid

Expense                          ৳700
--------------------------------------
Net Income (Collected - Expense) ৳530
```

Invoice Code: `INV-2026-000448`

বর্তমান মাসের Finance Summary-তে এই demo transaction অনুযায়ী দেখা গেছে:

- Billed: **৳1,230**
- Revenue Collected: **৳1,230**
- Expenses: **৳700**
- Net Income: **৳530**
- Outstanding: **৳0**
- Cash payment: **৳500**
- Mobile Banking payment: **৳730**

### কেন এই উদাহরণটি প্রেজেন্টেশনে শক্তিশালী

এখানে একসাথে discount, tax, split payment, zero due, expense এবং net income প্রমাণ করা যায়। ক্যালকুলেটরে দেখিয়ে দিন:

`1300 - 100 + 30 = 1230`, `500 + 730 = 1230`, `1230 - 700 = 530`।

### Partial payment ও Due Collection

যদি ৳1,230 bill-এর প্রথমে ৳500 দেওয়া হয়:

- Paid = ৳500
- Due = ৳730
- Status = Partial/Due

পরে Patient Due Collection List থেকে ৳730 নিলে:

- মোট Paid = ৳1,230
- Due = ৳0
- Status = Paid

### Payment method

Cash, Bank Transfer, Mobile Banking বা Card—যে method-এ টাকা নেওয়া হয়, summary/ledger-এ সেটি আলাদাভাবে বোঝা যায়। এতে cash reconciliation সহজ হয়।

---

## ২২. Reports Module — সব দাবির প্রমাণ

### Account ও Daily Reports

- Account Balance
- Account Ledger
- Daily Ledger
- Daily Statement

### Party-wise Reports

- Patient Balance
- Patient Ledger
- Supplier Balance
- Supplier Ledger
- Referral Person Balance
- Referral Person Ledger

### Stock Reports

- Medicine Batch Wise Stock
- Medicine Stock Report
- Current Stock Expiry

### Department/Transaction Reports

- Pathology Bill Record
- Radiology Bill Record
- OPD Bill Record
- IPD Bill Record
- Blood Issue Record
- Blood Component Issue Record
- Blood Donate Record
- Component Separation Record
- Pharmacy Sales/Purchase/Return Records
- Call Ambulance Record
- Contra Record
- Expense Record
- Income Record
- Employee Salary Payment Record
- Referral Bill Record

### কোন প্রশ্নের জন্য কোন Report

| প্রশ্ন | Report |
|---|---|
| হাতে/ব্যাংকে কত আছে? | Account Balance |
| একটি account-এ টাকা কখন এলো/গেল? | Account Ledger |
| আজকের সব debit-credit কী? | Daily Ledger |
| দিনের মোট business summary কী? | Daily Statement |
| কোন রোগীর কত বাকি? | Patient Balance |
| রোগীর bill/payment history কী? | Patient Ledger |
| supplier-কে কত দিতে হবে? | Supplier Balance/Ledger |
| referral person-এর হিসাব কী? | Referral Person Balance/Ledger |
| কোন batch-এর stock/expiry কী? | Batch Wise Stock / Current Stock Expiry |

### Report দেখানোর সঠিক নিয়ম

1. প্রথমে date range ঠিক করুন।
2. সম্ভব হলে নির্দিষ্ট Patient/Account নির্বাচন করুন।
3. Entry/Record-এর code বা amount-এর সাথে Report-এর amount মিলিয়ে দেখান।
4. শুধু total নয়—detail row-ও দেখান।

---

## ২৩. Settings Module

### Submenu

- Modules
- Branch Manage
- Charge Manage
- Company Profile
- User Manage
- Backup
- Import Data

### প্রতিটি অংশের উদ্দেশ্য

- **Modules:** কোন module ব্যবহার/প্রদর্শন হবে তা পরিচালনা।
- **Branch Manage:** একাধিক branch থাকলে branch information।
- **Charge Manage:** বিভিন্ন service/charge setup।
- **Company Profile:** হাসপাতালের নাম, ঠিকানা, যোগাযোগ ও branding তথ্য।
- **User Manage:** Login user, role/permission এবং access management।
- **Backup:** Database-এর নিরাপদ backup।
- **Import Data:** প্রয়োজনীয় master/legacy data system-এ আনা।

### কী বলবেন

“Settings প্রতিদিনের transaction করার জায়গা নয়; এটি system administrator-এর control area। ভুল user-এর হাতে এই access দেওয়া উচিত নয়।”

---

## ২৪. Admin User Menu এবং Sign Out

ডান পাশের Admin user menu-তে সাধারণত:

- Settings
- Log Out

প্রেজেন্টেশনের শেষে Log Out করে দেখাবেন। বলবেন:

“কাজ শেষে logout করলে session বন্ধ হয় এবং অননুমোদিত ব্যক্তি আগের user-এর permission ব্যবহার করতে পারে না।”

---

## ২৫. Database কীভাবে সবকিছু একসাথে রাখে—কোড ছাড়া সহজ ব্যাখ্যা

Database-কে একটি বড় ডিজিটাল রেজিস্টার ভাবুন, তবে এখানে আলাদা আলাদা register পরস্পরের সাথে যুক্ত।

### উদাহরণ: একজন রোগীর সম্পূর্ণ যাত্রা

```text
Patient Code P-2026-000022
  ├─ Appointment #A...
  ├─ OPD Bill #O...
  ├─ Pathology Bill #P...
  ├─ Radiology Bill #R...
  ├─ IPD Admission + Bed #...
  ├─ Pharmacy Sale #...
  └─ Invoice/Payment/Due/Ledger
```

Patient-এর নাম প্রতিটি জায়গায় স্বাধীনভাবে লিখে রাখলে spelling mismatch হতে পারত। এই সিস্টেম Patient ID দিয়ে সম্পর্ক তৈরি করে। ফলে Patient List, Diagnostic History, Bill Record, Finance এবং Report একই মূল রোগীকে নির্দেশ করে।

### বর্তমান database অবস্থা

- Database service চলছে এবং **54/54 table integrity check OK** পাওয়া গেছে।
- নতুন demo patient Database-এ save হয়েছে এবং Patient List-এর প্রথম row-তে দেখা গেছে।
- Finance demo amount UI summary এবং Database হিসাবের সাথে মিলেছে।

প্রেজেন্টেশনে “Database” বললে আপনাকে table বা SQL দেখাতে হবে না। Entry করার পরে List/Record/Report-এ একই তথ্য দেখানোই database persistence-এর সবচেয়ে সহজ দৃশ্যমান প্রমাণ।

---

## ২৬. ১৫ মিনিটের Live Presentation Script

### মিনিট ০–১: Login ও Project Summary

বলবেন:

“এটি একটি integrated Hospital Management System। Clinical service, inventory, bed, finance, HR এবং report একই platform-এ পরিচালিত হয়।”

Admin login করুন।

### মিনিট ১–৩: Dashboard ও Modules

Dashboard-এর patient, doctor, admission, bed, stock ও financial cards দেখান। তারপর Modules page খুলে পুরো system scope দেখান।

### মিনিট ৩–৫: Patient ও Appointment

Patient List থেকে `Presentation Demo Patient` খুঁজুন। তারপর Appointment form খুলে Patient, Doctor, Date, Slot, Charge ও Payment field ব্যাখ্যা করুন। Shift ঠিক না করা পর্যন্ত live Save করবেন না; rehearsal-এর পরে save demo করুন।

### মিনিট ৫–৭: OPD/IPD ও Bed

OPD মানে ভর্তি ছাড়া service, IPD মানে admission lifecycle বোঝান। Bed Availability খুলে বর্তমান **24 available / 10 occupied** দেখান। Rehearsal করা demo থাকলে allocation-এর আগে ও পরে count দেখান।

### মিনিট ৭–৯: Pathology, Radiology ও Patient History

একটি test নির্বাচন করলে master price আসে, bill হয়, payment হয় এবং record/history-তে যায়—এই ধারাটি দেখান। Pathology ও Radiology আলাদা operational বিভাগ হলেও patient ও finance-এর সাথে যুক্ত—এটি বলুন।

### মিনিট ৯–১১: Pharmacy ও Blood

Pharmacy-তে Purchase বাড়ায় stock, Sales কমায় stock, Return adjust করে—Batch/Expiry report দেখান। Blood module-এ donation থেকে issue lifecycle ব্যাখ্যা করুন; current expired sample bag issue করবেন না।

### মিনিট ১১–১৩: Finance ও Reports

Finance Summary-তে demo range দিয়ে **৳1,230 collected, ৳700 expense, ৳530 net** দেখান। Payment method breakdown দেখান। তারপর Account/Patient Ledger দিয়ে detailed proof দেখান।

### মিনিট ১৩–১৪: HR, Referral ও Settings

Employee/Salary, Referral payable, User/Branch/Charge/Backup সংক্ষেপে দেখান।

### মিনিট ১৪–১৫: Closing ও Logout

বলবেন:

“একটি patient/service transaction একই সাথে operational record, payment, due, account এবং report-এ trace করা যায়। তাই management দ্রুত অবস্থা দেখে এবং detail record দিয়ে যাচাই করতে পারে।”

তারপর Log Out করুন।

---

## ২৭. সবচেয়ে শক্তিশালী End-to-End Demo Plan

Live demo-তে বেশি record তৈরি না করে একটি পরিষ্কার scenario অনুসরণ করুন:

### Scenario A: Patient → Appointment → Payment

1. নতুন/বিদ্যমান demo patient নির্বাচন।
2. Doctor ও valid slot নির্বাচন।
3. Fee দিন।
4. অংশ Cash, অংশ Mobile Banking দিন।
5. Save।
6. Appointment List-এ record।
7. Finance/Patient Ledger-এ payment ও due।

### Scenario B: Patient → IPD → Bed

1. Available bed count লিখে রাখুন।
2. রোগীকে একটি Available bed দিন।
3. Bed Availability-তে count এক কমেছে দেখান।
4. Admission record দেখান।
5. Demo শেষে discharge/release করে bed আবার Available করুন।

### Scenario C: Pharmacy stock

1. একটি medicine batch-এর starting quantity লিখে রাখুন।
2. ছোট quantity sale করুন।
3. Sales Record দেখান।
4. Stock report-এ quantity কমেছে দেখান।

### Scenario D: হিসাব

1. Invoice total।
2. Payment method breakdown।
3. Due।
4. Finance Summary।
5. Patient Ledger/Account Ledger।

এই চারটি scenario দেখাতে পারলে database, transaction, inventory, capacity এবং finance—পুরো system-এর সবচেয়ে গুরুত্বপূর্ণ সক্ষমতা প্রমাণ হয়।

---

## ২৮. কোম্পানি সম্ভাব্য যে প্রশ্নগুলো করতে পারে

### “একই রোগীর সব তথ্য কীভাবে পাওয়া যায়?”

Patient Code/ID দিয়ে Appointment, OPD/IPD, Diagnostic, Bill ও Payment record যুক্ত থাকে। Patient List, Diagnostic History ও Patient Ledger দিয়ে ধারাবাহিকতা দেখা যায়।

### “আংশিক payment নেওয়া যায়?”

হ্যাঁ। Bill total থেকে যত টাকা পাওয়া যায় তা Paid, বাকিটা Due। পরে Patient Due Collection থেকে বাকি টাকা নিলে ledger এবং balance আপডেট হয়।

### “একাধিক payment method নেওয়া যায়?”

বর্তমান demo invoice-এ Cash ৳500 এবং Mobile Banking ৳730—দুই method-এ মোট ৳1,230 নেওয়ার উদাহরণ আছে।

### “বেড double-book হবে না তো?”

Bed Availability/Management status দিয়ে available bed নির্বাচন করা হয়। Allocation-এর পর status occupied হওয়া এবং discharge-এর পর available হওয়া live count দিয়ে যাচাই করা যায়।

### “ওষুধের expiry ও stock বোঝা যায়?”

Batch Wise Stock, Medicine Stock এবং Current Stock Expiry report আছে। Purchase, Sales ও Return stock quantity adjust করে।

### “মেয়াদোত্তীর্ণ blood issue হবে?”

বর্তমান safety validation expired bag issue হতে বাধা দেয়। তবে Dashboard-এর status-only count-কে expiry-aware করার improvement দরকার।

### “কোন টাকা কোথায় গেল বুঝব কীভাবে?”

Invoice/Payment Record থেকে উৎস, Account Ledger থেকে account movement, Daily Statement থেকে দিনের summary এবং Patient Ledger থেকে রোগীভিত্তিক history দেখা যায়।

### “Cash থেকে Bank-এ নিলে income বাড়বে?”

না। সেটি Contra transfer—এক account কমবে, অন্যটি বাড়বে; মোট অর্থ ও revenue অপরিবর্তিত থাকবে।

### “সব user কি সবকিছু দেখতে পাবে?”

Admin User Manage থেকে role/permission অনুযায়ী access সীমিত করা উচিত। Reception, Lab, Pharmacy ও Accounts-এর দায়িত্ব অনুযায়ী আলাদা user হবে।

### “Backup আছে?”

Settings-এ Backup option আছে। বাস্তব deployment-এ নিয়মিত automated backup, off-site copy এবং restore rehearsal রাখা উচিত।

### “একাধিক branch support করা যাবে?”

Settings-এ Branch Manage আছে। Handover-এর সময় branch-wise user, data separation এবং consolidated report-এর business rule নিশ্চিত করতে হবে।

---

## ২৯. আগামীকালের আগে অবশ্যই যা ঠিক/যাচাই করবেন

### জরুরি

- [ ] Frontend `http://localhost:3000` খুলছে।
- [ ] Backend এবং Database service চলছে।
- [ ] Admin login কাজ করছে।
- [ ] Appointment Shift-এর `1st shif` valid daytime range-এ ঠিক করা।
- [ ] Appointment Save → List → Payment/Finance flow একবার rehearsal করা।
- [ ] Doctor dropdown-এ পরিষ্কার নাম/কোড দেখা যাচ্ছে।
- [ ] Blood demo-র জন্য valid, non-expired sample unit প্রস্তুত; expired bag ব্যবহার নয়।
- [ ] Finance Summary date range `2026-09-01` থেকে `2026-09-23` দিয়ে demo সংখ্যাগুলো দেখা যাচ্ছে।
- [ ] Bed baseline ও demo allocation-এর আগে/পরে সংখ্যা লিখে রাখা।
- [ ] Pharmacy demo medicine-এর starting stock লিখে রাখা।

### Presentation safety

- [ ] Real patient data ব্যবহার করবেন না; শুধু demo data।
- [ ] Live demo-তে বড় amount বা অনেক record তৈরি করবেন না।
- [ ] কোন action reversal দরকার তা আগে ঠিক করুন—যেমন demo bed শেষে release।
- [ ] Blood safety rule bypass করার চেষ্টা করবেন না।
- [ ] Browser zoom 90–100%, internet/localhost, charger ও backup screenshot প্রস্তুত।
- [ ] শেষে Log Out করবেন।

### Backup plan

Live Save ব্যর্থ হলে panic করবেন না। আগে থেকে তৈরি Patient List, Appointment List, Bed Availability, Finance Summary এবং Report দেখিয়ে একই workflow ব্যাখ্যা করুন।

---

## ৩০. বর্তমান যাচাইয়ের ফলাফল

নিম্নলিখিত representative UI screen খোলা হয়েছে এবং crash ছাড়াই render করেছে:

Patient, Doctor, Appointment, OPD, IPD, Bed, Pathology, Radiology, Medicine, Pharmacy, Blood Bank, Ambulance, Referral, HR & Payroll, Finance, Reports এবং Settings।

### যেগুলো ভালোভাবে প্রমাণিত

- Database চলছে এবং 54টি table integrity check-এ ঠিক ছিল।
- Demo patient save হয়ে Patient List-এ দেখা গেছে।
- Finance demo-র subtotal, discount, tax, split payment, expense এবং net income পরস্পরের সাথে মিলেছে।
- Expired blood bag issue করতে system বাধা দিয়েছে।

### যেগুলো presentation-এর আগে rehearsal/সংশোধন দরকার

- Appointment-এর overnight shift slot formatting।
- Appointment থেকে billing/payment-এর পূর্ণ live journey।
- Doctor profile নামের sample data linkage।
- Blood Dashboard count-এ expiry বিবেচনা।

অর্থাৎ system-এর বড় অংশ demonstrable, তবে উপরোক্ত চারটি বিষয় ঠিক/অনুশীলন না করে “সবকিছু শতভাগ perfect” দাবি করবেন না। সৎভাবে বলবেন—মূল workflow কাজ করছে, আর sample data/configuration-এর চিহ্নিত বিষয়গুলো presentation-এর আগে পরিষ্কার করা হচ্ছে।

---

## ৩১. মুখস্থ না করে বোঝার জন্য ছোট সূত্র

প্রতিটি module-এর জন্য এই পাঁচটি প্রশ্নের উত্তর দিন:

1. **কে কাজটি করছে?** Reception, Lab, Pharmacy, Accounts নাকি Admin?
2. **কোন Patient/Party নির্বাচন হচ্ছে?**
3. **কী Entry হচ্ছে?** Appointment, Bill, Stock, Bed, Income/Expense?
4. **কী পরিবর্তন হচ্ছে?** টাকা, Due, Stock, Bed status নাকি Record?
5. **কোথায় প্রমাণ দেখা যাবে?** List/Record, Dashboard, Ledger নাকি Report?

উদাহরণ—Pharmacy Sales:

```text
কে? Pharmacy operator
কার জন্য? Patient/Customer
Entry কী? Medicine sale
পরিবর্তন কী? Stock কমে, payment বাড়ে, due হতে পারে
প্রমাণ কোথায়? Sales Record + Stock Report + Finance/Patient Ledger
```

---

## ৩২. আপনার নিজের Practice Test

গাইডটি পড়ার পর আমাকে নিজের ভাষায় নিচের বিষয়গুলো বুঝিয়ে বলবেন:

1. Patient তৈরি থেকে Appointment Payment পর্যন্ত কী হয়?
2. OPD এবং IPD-এর পার্থক্য কী?
3. একজন রোগী bed নিলে Available/Occupied count কীভাবে বদলাবে?
4. Pathology bill-এর টাকা কোথায় দেখা যাবে?
5. Pharmacy Purchase, Sales এবং Return stock-এ কী প্রভাব ফেলে?
6. Invoice ৳1,300, discount ৳100, tax ৳30, payment ৳500 হলে total ও due কত?
7. Income, Expense এবং Contra-এর পার্থক্য কী?
8. Patient Ledger, Account Ledger এবং Daily Statement কখন ব্যবহার করবেন?
9. Expired blood bag নিয়ে system-এর সঠিক আচরণ কী হওয়া উচিত?
10. Presentation শেষে নিরাপদে session কীভাবে বন্ধ করবেন?

আপনি উত্তর দিলে আমি আপনার ব্যাখ্যার কোন অংশ ঠিক আছে, কোথায় ভুল আছে এবং কোম্পানির সামনে আরও সুন্দরভাবে কীভাবে বলা যায়—সেটা feedback দেব।

---

## ৩৩. শেষ করার জন্য প্রস্তুত বক্তব্য

> “এই Hospital Management System-এ রোগী একবার নিবন্ধিত হওয়ার পর Appointment, OPD/IPD, Bed, Diagnostic, Pharmacy, Blood, Ambulance এবং Billing একই patient identity-এর সাথে যুক্ত থাকে। Service-এর bill থেকে payment, due, account এবং report পর্যন্ত trace করা যায়। Purchase/Sales stock পরিবর্তন করে, admission/discharge bed availability পরিবর্তন করে এবং সব গুরুত্বপূর্ণ ফল Dashboard ও Reports-এ যাচাই করা যায়। Role-based user, settings এবং backup দিয়ে system administration পরিচালনা করা হয়। তাই এটি শুধু data-entry software নয়—এটি হাসপাতালের clinical operation, inventory ও financial control-এর একটি integrated platform।”

এরপর Admin menu থেকে **Log Out** করুন।
