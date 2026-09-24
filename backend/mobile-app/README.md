# E-Medical — Flutter mobile app

Flutter port of the E-Medical mobile prototype
(`L:\emedical_mobile_app_mockup\emedical_mobile_app_mockup.jsx`), built as the
mobile companion to the Hospital Management System backend.

Two apps behind one sign-in — pick a role on the sign-in screen. A third, the
admin app, is fully built but **not offered as a login**; see
[Re-enabling the admin app](#re-enabling-the-admin-app).

| Patient app | Doctor app | Admin app |
| --- | --- | --- |
| **Home** — greeting, notifications, upcoming appointment with check-in ticket, quick actions, recent activity | **Schedule** — today's queue, stat tiles, vitals alerts | **Overview** — KPI tiles, revenue trend, appointments by department, what needs attention |
| **Book** — doctor search, department filters, slot picker, booking confirmation | **Patients** — searchable list, EMR detail with vitals and history | **Beds** — hospital occupancy, per-ward meters, bed grid, current admissions |
| **Reports** — records per profile, switch between yourself and family | **Rx** — prescription history, write and send new | **Staff** — directory, today's attendance, leave approvals |
| **Pay** — total dues, pay one or pay all, invoice history | **OT** — operation theatre bookings, mark completed | **Stock** — pharmacy levels with low-stock alerts, blood bank by group |
| **Profile** — booking history, my reports, family members, UHID card, language, notifications, help | **Profile** — working hours, leave requests, security, help | **Profile** — patient reports & printing, hospital settings, audit log, notifications, security, help |

The apps are connected, not parallel demos. Write a prescription as the doctor
and it lands in that patient's file straight away: it appears on their Reports
tab where they can print it, **and** raises an unread notification on their home
screen so it is not something they have to go looking for. Notices are addressed
by UHID, so they only ever reach the patient they belong to.

### Re-enabling the admin app

The admin app (overview, beds, staff, stock, patient reports and printing) is
still in `lib/features/admin/`, still compiled, and still covered by tests at
the repository level. It is only hidden from the sign-in screen. To bring it
back, add one entry in
[`lib/core/config/app_config.dart`](lib/core/config/app_config.dart):

```dart
static const List<UserRole> enabledRoles = [
  UserRole.patient,
  UserRole.doctor,
  UserRole.admin,
];
```

Nothing else needs changing — the router already handles the role. Note that in
live mode the backend's `users.role` still decides what a signed-in account
sees; this list only controls which roles the picker offers.

### Records, history and printing

**Booking history.** Booking an appointment appends to the patient's history
rather than replacing the upcoming one, so every visit stays on file with how
it ended — upcoming, completed or cancelled. Patient profile → *My booking
history*.

**Records are per profile.** Reports are filed against a UHID, not against the
account, so a patient sees their own records and can switch to a family
member's. Family members carry their own UHID for exactly this reason.

**Notifications.** The bell on the patient's home screen badges with the number
of unread notices and clears once the sheet has been opened. Unread rows carry a
dot *and* the word "New", so the state never rests on colour alone.

Rows are tappable and go where they point: a prescription or report notice opens
**that record's own screen** (it carries the report id, not just a category),
a payment notice switches to Pay, an appointment notice to Book. The record
opens *inside* the Reports tab via `TabShellScope.openInTab`, so the bottom bar
stays and back returns to the tab rather than to the home screen.

The doctor's alerts work the same way. They are derived from the queue rather
than hand-listed, so each one names a patient that actually exists and carries
their UHID — tapping a flagged-vitals alert opens that patient's record in the
Patients tab. Alerts have no read state (they stand until the vitals are dealt
with), so the sheet is passed `showUnread: false`; a "New" pill on every row
would say nothing. The admin's dashboard alerts remain `tappable: false` — they
are summaries with no single destination.

**Clearing.** Both the patient's notifications and the doctor's alerts can be
cleared: swipe a row left to dismiss it, or use *Clear all* at the foot of the
sheet. The sheet updates in place and the bell's badge follows once it closes.
Patient notices are deleted from the store and clearing is scoped by UHID, so
one patient's clear never touches another's. Doctor alerts are *computed* from
the flagged patients on every read, so there is nothing to delete — the id goes
into a dismissed set and is filtered out, otherwise the alert would reappear a
moment later.

**Leave requests carry dates and hours.** The doctor's form uses real date
pickers for the range and an *All day* switch; turning it off reveals start and
end time pickers, so a half-day (`Sep 05 · 2:00 PM – 5:00 PM`) is expressible.
The form validates that the end time is after the start and keeps the date range
valid as you pick. The admin's approval queue shows the date range, the hours and
the day count.

**Printing is real.** The `printing` package hands a generated PDF to Android's
own print service, so the user gets the system dialog — a real printer, or
*Save as PDF*. Admin profile → *Patient reports & printing* browses every
patient file and prints one document or the whole file; patients can print
their own from the Reports tab or a report's detail screen.

The PDF sticks to Latin text on purpose: the bundled Helvetica has no Bengali
glyphs, so a taka sign or Bangla name would print as empty boxes. Bundle a
Unicode font with `pw.Font.ttf()` in
[`lib/core/print/report_pdf.dart`](lib/core/print/report_pdf.dart) before
putting Bangla on a printed report.

---

## Requirements

- **Flutter 3.22 or newer** (Dart 3.4+) — the tab shells use
  `PopScope.onPopInvokedWithResult`
- **Android Studio** (already installed at
  `C:\Program Files\Android\Android Studio`, 2026.1.1) with the **Flutter** and
  **Dart** plugins — both already installed
- **JDK 21** — bundled with Android Studio as JBR
- Android SDK levels are taken from your installed Flutter SDK, not pinned here

Flutter itself is **not** installed yet — step 1 covers it.

---

## 1. Install the Flutter SDK

1. Download the Windows SDK zip from <https://docs.flutter.dev/get-started/install/windows>
2. Extract it to a path with **no spaces**, e.g. `C:\src\flutter`
   (do *not* use `C:\Program Files` — the space breaks Gradle)
3. Add `C:\src\flutter\bin` to your **Path** environment variable

Everything after this can be done inside Android Studio.

## 2. Point Android Studio at it

1. **File → Open** → select `L:\emedical_app`

   Open the **project root** — the folder containing `pubspec.yaml`. Opening
   `L:\emedical_app\android` instead is the usual mistake: the IDE then treats it
   as a plain Android project and none of the Dart tooling appears.

2. **File → Settings → Languages & Frameworks → Flutter** → set *Flutter SDK
   path* to `C:\src\flutter`, then **Apply**.
3. Android Studio shows a *Pub get* banner across the top — click it. (Same as
   `flutter pub get`.)

## 3. Fill in the Gradle wrapper

This project ships hand-written Gradle and manifest files but not the binary
`gradle-wrapper.jar` / `gradlew` scripts. Flutter's build injects them
automatically on the first run, so usually you need do nothing.

If the build complains about a missing wrapper, open Android Studio's built-in
terminal (**View → Tool Windows → Terminal**, or Alt+F12) and run:

```bash
flutter create --platforms=android .
```

It only writes files that are missing and leaves `lib/` alone. If it ever does
replace `lib/main.dart`, restore these five lines:

```dart
import 'package:flutter/material.dart';

import 'app.dart';

void main() {
  runApp(const EMedicalApp());
}
```

## 4. Check the analyzer first

This codebase was written without a compiler ever seeing it, so **read the
analyzer before running**. Open **View → Tool Windows → Dart Analysis** (bottom
of the window). It lists every error live, and double-clicking one jumps to the
line.

Work the red **errors** to zero. Grey infos and warnings (unused imports,
missing `const`) will not stop the build.

## 5. Run it

1. Pick **Medium_Phone** in the device dropdown on the toolbar — it is already
   created. **Tools → Device Manager** starts it if it is not running.
2. Press **Run** (Shift+F10).

First build pulls the Gradle distribution and takes a few minutes; later runs
are fast. Once it is up, the lightning-bolt button (or Ctrl+\\) hot-reloads
changes in about a second — you do not need to restart for UI edits.

To run the tests: right-click `test/widget_test.dart` → **Run 'tests in
widget_test.dart'**.

The app opens on the sign-in screen. In demo mode **any credentials work** —
pick *Patient*, *Doctor* or *Admin* and press Continue. The email field
pre-fills with that role's demo account.

---

## Mock data vs. the live backend

The app ships in **mock mode**: every screen is driven by seeded data that
matches the prototype, so it runs standalone with no server, no database and no
network. All the interactions are real — paying an invoice, adding a family
member, completing an OT booking and saving a prescription all mutate state that
persists for the session.

To point it at the real HMS API, edit
[`lib/core/config/app_config.dart`](lib/core/config/app_config.dart):

```dart
static const DataSource dataSource = DataSource.live;
static const String apiBaseUrl = 'http://10.0.2.2:5000/api/v1';
```

Then start the backend:

```bash
cd /d "L:\Hospital Management System\Hospital-Managment-System-Back-End" && npm run dev
```

**Host addresses**, because `localhost` on a device is the device itself:

| Target | `apiBaseUrl` |
| --- | --- |
| Android emulator | `http://10.0.2.2:5000/api/v1` |
| Genymotion | `http://10.0.3.2:5000/api/v1` |
| Physical device on the same Wi-Fi | `http://<your-PC-LAN-IP>:5000/api/v1` |
| Desktop / web build | `http://localhost:5000/api/v1` |

Nothing above the repository layer changes — the screens are identical in both
modes.

### What the live mode covers

Wired to real endpoints: auth (login / refresh / logout / change password),
departments, doctors, available slots, appointments, lab + radiology orders,
prescriptions, invoices and payments, IPD/OT bookings, beds and wards, HR
employees and attendance, audit logs, hospital settings, and the five
`/reports/*` feeds behind the admin dashboard.

Served from seed data because the backend has no module for them yet — each is
marked `// TODO(backend)` in
[`lib/data/repositories/api_repositories.dart`](lib/data/repositories/api_repositories.dart):

- Family members
- Doctor working hours / duty roster
- Leave requests, including admin approval (could map onto `/hr/attendance`)
- Notification preferences (device-local)

In live mode the role comes from the backend's `users.role` column, not from the
picker — the picker only chooses which demo account to pre-fill.

---

## Project structure

```
lib/
  main.dart                     entry point
  app.dart                      MaterialApp + session router
  core/
    config/app_config.dart      mock ⇄ live switch, API base URL
    theme/tokens.dart           colours, shadows, radii from the mockup
    theme/app_theme.dart        typography + light/navy themes
    widgets/                    tag, header, cards, toggle, toast, charts, shell…
  data/
    models/                     domain models + tolerant JSON parsing
    mock/mock_data.dart         seeded prototype data
    mock/mock_store.dart        shared mutable state across roles
    api/api_client.dart         bearer auth, envelope unwrap, error mapping
    api/api_endpoints.dart      HMS endpoint paths
    repositories/               interfaces + mock and live implementations
    session.dart                signed-in user, hands out repositories
  features/
    shared/                     sign-in, logged out, notifications, security, help
    patient/                    5 tabs + profile detail screens
    doctor/                     5 tabs + profile detail screens
    admin/                      5 tabs + ward, employee, audit, settings screens
```

Each tab owns a nested `Navigator`, so pushing a detail screen keeps the bottom
bar visible — the way the prototype behaved.

`mock_store.dart` is a singleton holding the mutable demo data. Repositories are
rebuilt on every sign-in but the data is not, which is what lets one role see
another's work and what makes changes survive a logout.

### A note on the dashboard charts

Both charts are single-series, so they use one hue and carry no legend — the
section title names what is plotted. Values are direct-labelled on the marks
rather than read off a value axis: with head-room above the tallest column an
axis tick would sit at a height that misstates the scale. Tapping a column
reveals its exact figure.

Status colours are deliberately limited. Amber and coral are too close to tell
apart reliably — they fail a colour-separation check, and badly so under
red-green colour blindness — so nothing depends on distinguishing them. Every
status ships with its word beside it, and the ward bed grid collapses "cleaning"
and "maintenance" into one class, naming the exact one when a bed is tapped.

---

## Bundling the display fonts

The mockup uses **Fraunces** (headings), **Space Grotesk** (labels) and
**Inter** (body). The app runs without them and falls back to the platform
serif/sans-serif, so layout and weights are already correct.

For the exact look:

1. Download the families from [Google Fonts](https://fonts.google.com)
2. Put the TTFs in `assets/fonts/`
3. Uncomment the `fonts:` block at the bottom of `pubspec.yaml`
4. `flutter pub get` and hot restart

---

## Tests

Right-click `test/widget_test.dart` → **Run**, or from the terminal:

```bash
flutter test
```

26 tests covering sign-in and tab rendering, paying an invoice, approving a
leave request, booking history accumulating, reports scoped per profile, a
doctor's prescription landing in the patient's records *and* raising an unread
notification addressed only to them, tapping a notice opening the right screen,
dismissing and clearing notices (including that a cleared doctor alert stays
cleared, and that clearing is scoped by patient), leave requests keeping their
date and hour ranges, and the doctor → admin handoff through the shared store.

Two traps worth knowing if you add widget tests here: a bare
`await someRepository.method()` in a `testWidgets` body hangs forever, because
the repositories await `Future.delayed` and the test clock only advances while
pumping — wrap it in `tester.runAsync`. And `pumpAndSettle(Duration(seconds: 3))`
sets the *pump interval*, not the timeout; the timeout is the third positional
argument and defaults to ten minutes.

---

## Troubleshooting

**App installs but closes immediately on launch**
Check the crash buffer first — this one has a specific signature:

```bash
adb logcat -b crash -d -t 60
```

If it says `Failed to extract 'classes.dex' … Inconsistent information`, followed
by `ClassNotFoundException: androidx.startup.InitializationProvider`, the APK on
the device is corrupt — not the build. It happens when the emulator drops
connection part-way through `adb install`, leaving a truncated dex that no class
can load from. Reinstalling over the top does not fix it; the bad copy has to go
first:

```bash
adb uninstall com.emedical.emedical_app
```

Then install again. To confirm the local build is not at fault, check that
`build/app/outputs/flutter-apk/app-debug.apk` opens as a zip and contains a
`classes.dex` of a few MB.

**No Dart/Flutter tooling, project looks like plain Android**
You opened `L:\emedical_app\android` instead of `L:\emedical_app`. Close and
reopen the root folder — the one with `pubspec.yaml` in it.

**`gradle-wrapper.jar` not found / `gradlew` missing**
Run `flutter create --platforms=android .` in the Android Studio terminal.

**`flutter.sdk not set in local.properties`**
The first build writes `android/local.properties` itself. To do it by hand,
create that file containing `flutter.sdk=C:\\src\\flutter`.

**Gradle or AGP version complaints**
`android/settings.gradle` pins AGP 8.7.3 / Kotlin 2.1.0 and the wrapper pins
Gradle 8.12. If your Flutter wants something newer, the error message names the
version — edit those two files. As a last resort, delete the whole `android/`
folder, run `flutter create --platforms=android .` to regenerate it, then
re-add two lines to `android/app/src/main/AndroidManifest.xml`:
`<uses-permission android:name="android.permission.INTERNET" />` and
`android:usesCleartextTraffic="true"` on `<application>`. Live mode needs both.

**Build fails on Java version**
Point Flutter at the JDK Android Studio ships with:

```bash
flutter config --jdk-dir "C:\Program Files\Android\Android Studio\jbr"
```

**"Could not reach the server" in live mode**
Check the base URL table above — `localhost` from the emulator *is* the
emulator. Confirm the backend answers on the host with
`curl http://localhost:5000/api/v1/health`.

**App icon is a plain vector placeholder**
`android/app/src/main/res/drawable/app_icon.xml`. Replace with generated PNG
densities (Android Studio: **right-click `res` → New → Image Asset**) before
release.
