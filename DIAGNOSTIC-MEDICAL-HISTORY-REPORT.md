# Permanent Diagnostic Medical History — Final Report

**System:** Hospital Management System (React + Vite · Node + Express · MariaDB)
**Date:** 12 August 2026
**Scope:** Making every finalised investigation a permanent, immutable part of the patient's medical history.

---

## 1. What was built

Nine pieces of work, all inside the existing HMS architecture. No parallel system was created.

| # | Deliverable | State |
|---|---|---|
| 1 | Database spine for diagnostics (migration 018) | Done, verified |
| 2 | Permanence layer: report versions + imaging series (migration 020) | Done, verified |
| 3 | Secure medical file storage and serving | Done, verified |
| 4 | Immutable report versions with controlled amendments | Done, verified |
| 5 | Legacy lab/radiology data migrated into history (migration 021) | Done, verified |
| 6 | Category-specific PDF report generation | Done, verified |
| 7 | Frontend: diagnostic history, report viewer, image viewer | Done, verified |
| 8 | Pictures embedded in the report PDF | Done, verified |
| 9 | Attach pictures to a study from the browser | Done, verified |

**Not built** — stated plainly in §11. The remaining gap is that **result entry, verification, finalisation and amendment have no user interface**; those flows exist only as API endpoints. Picture upload now does have one.

The diagnostics module extends the existing layered pattern (routes → controller → service → repository → validation), is mounted under the existing permission guard, and reuses the existing money, sequence, audit, print and settings utilities.

---

## 2. Schema

56 tables total, of which 10 are diagnostic, joined by 38 foreign keys.

**Migration 020** added the permanence layer:

- `diagnostic_report_versions` — an append-only chain per report. Holds `version_no`, `version_status` (`final` / `amended` / `cancelled`), a complete JSON `snapshot`, `amends_version_id`, `amendment_reason`, `changed_fields`, `superseded_at` / `superseded_by_id`, `verified_by/at`, `issued_by/at`, `pdf_attachment_id`. Unique on `(report_id, version_no)`. The model is deliberately **not** paranoid — a finalised medical record is not deletable through the application.
- `diagnostic_imaging_series` — the series layer between a study and its images (`series_uid` unique, `instance_count`).
- `diagnostic_attachments` gained `series_id`, `report_version_id`, `version`, `is_original`, `is_current`, `superseded_by_id`, `superseded_at`, `metadata`.
- `diagnostic_reports` gained `current_version_id`, `version_count`, `is_amended`.
- Added `ix_ds_patient_status_date` for history queries.

Reversible: `down()` was executed and re-applied during testing.

---

## 3. Permanence — the finalisation snapshot

When a study is finalised, its content is copied into `diagnostic_report_versions` as version 1, inside the same transaction that marks the study final. A report can never exist without its first version.

The snapshot is a **copy, not a set of foreign keys**. A report signed today must still read correctly in five years, after a doctor has been renamed, a test retired or a reference range revised — resolving those through live rows would silently rewrite history. Frozen into the snapshot:

patient identity and UHID · **age at the time of the study** (computed, not today's age) · sex · blood group · study and result timestamps · category · modality · test name · body part · laterality · views · contrast and agent · specimen · sample type · collection method · adequacy · clinical history · procedure note · source order and invoice · referring and reporting doctor (by name **and** code) · every parameter with its value, unit, reference range, flag, method and comments · measurements · findings · organisms and sensitivities · interpretation · impression · conclusion · recommendation · verifier and issuer with timestamps · report number and template · attachment metadata with SHA-256 checksums.

`storage_key` never enters a snapshot. Files are recorded by id and checksum only.

---

## 4. Immutability and controlled amendments

A stored version row is written once. The only field ever changed afterwards is its supersession marker.

`POST /diagnostics/:id/amend` corrects a finalised report:

- Requires the study to be `final` and a report to exist.
- Requires a reason of at least 10 characters — "why" is part of the medical record, so a one-word entry is rejected.
- Applies the correction through **the same writer the normal result path uses**, so a corrected value is validated and its flag derived exactly like an original one.
- Computes which sections differ and stores that list, **at the time of amendment**, so the answer cannot drift if the diff logic is later refined.
- Refuses an amendment that changes nothing — a trail of empty revisions hides the real ones.
- Marks the previous version `superseded_at` / `superseded_by_id` and leaves it fully readable.
- Restricted to the roles that could have signed the report; reading the chain is open to anyone who can read the report.

Proved by test, not by inspection: **version 1's snapshot is byte-for-byte identical after two successive amendments**, the chain reads 1 → 2 → 3, all three snapshots remain distinct and readable, and the study stays `final` rather than being reopened.

There is no API path that deletes a version, and a finalised study cannot be deleted while versions exist (409).

---

## 5. Medical file storage

Bytes live on disk under `<backend>/storage/medical` (override with `MEDICAL_FILE_ROOT`), addressed by SHA-256. Only metadata and a relative key go in the database — no image is stored in a relational column.

- **Never overwritten.** Files are written with open flag `'wx'`, which fails rather than truncating.
- **Patient-scoped paths** (`patients/<id>/<yyyy>/<mm>/<random>.<ext>`) resolved through a check that refuses to escape the root. Traversal attempts are rejected; `safeDisplayName('../../.env')` yields `.env`.
- **Allow-list MIME validation** with an extension fallback, so a `.dcm` sent as `application/octet-stream` still resolves. SVG is refused because it executes script. `.exe` is refused.
- **Validated before written.** Multer uses memory storage, so type and checksum are checked before anything touches the disk.
- **Removal archives, never unlinks.** There is no automatic deletion of finalised medical files anywhere in the system.
- 64 MB per-file limit.

**Serving:** the storage directory is not web-served. Files leave only through an authenticated endpoint that re-checks, on every request, that the attachment belongs to the study and the study to the patient — answering **404 rather than 403** so ids cannot be probed. Responses set `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. Every file read is written to the audit log.

The `DiagnosticAttachment` model carries a `defaultScope` that excludes `storage_key`, so no ordinary query can leak a path into a response; the two finders that genuinely need it opt in explicitly with `.unscoped()`.

**Replacement preserves the original:** a corrected image becomes version 2 while version 1 stays on disk, marked superseded, still downloadable with its exact bytes, and still flagged `is_original`.

---

## 6. Report PDFs

`GET /diagnostics/:id/versions/:versionNo/pdf` (accepts `current`).

- Rendered **from the stored snapshot**, never from live rows — the same version rendered today and in five years is the same document.
- **Idempotent per version.** The file is stored as its own `generated_report` attachment linked to the version; asking twice returns the same bytes rather than writing a second copy of a signed document. An amended report therefore has one PDF per version.
- **Original uploads survive generation** — verified explicitly: they keep `is_original = 1`, stay current, and still download byte-identically.
- An amended PDF opens with a banner naming the version, the reason and the issue date. Version 1's PDF is byte-identical before and after the amendment.
- **The pictures are on the report.** Images are resolved by attachment id from the snapshot and each is checked against the checksum recorded at signing time. If a file has since been replaced, corrupted or tampered with, the mismatch is printed and the image withheld — a different picture must never appear under the same report number. Verified by overwriting stored bytes behind the report's back: the untampered image still printed, the altered one did not, and the report said so.
- pdfkit decodes JPEG and PNG. TIFF, WebP, DICOM and video are named in an *"images not reproduced here"* section with the reason. A placeholder standing in for an unrendered scan would be worse than saying plainly that the image exists and must be opened in the viewer. Aspect ratio is preserved — a distorted medical image is a misleading one — and the plate is labelled as reduced-size for reference.
- Layout follows the report's `template_key`; 15 template keys, each rendering only the sections the snapshot actually contains. An empty heading on a medical report invites the reader to assume something was missed.
- Letterhead comes from Settings → Company Profile through the existing settings service. An unconfigured profile means **no letterhead** — never a substituted name.

---

## 7. Legacy data

Migration 021 brought existing results into the history. Without it, "Diagnostic History" would have been empty for every patient who existed before this feature.

**19** laboratory results and **9** radiology reports across **10** patients, linked to their source rows by `source_type` / `source_id`.

The source tables were not touched — `lab_order_items` and `radiology_orders` remain the system of record for ordering and billing. Their content was fingerprinted before and after and is **byte-identical**.

What the migration refused to invent:

- **No status upgrades.** None of the legacy rows carries a verification, so all 28 arrive as `result_entered` — results on record that were never signed off. Marking them `final` would have fabricated a signature and a report number.
- **No reference ranges, units or methods.** The referenced `lab_tests` rows hold NULL for all three, so a migrated parameter shows its value with no range beside it.
- **No numeric parsing.** `"13.5 g/dL"` is stored as recorded rather than split into a number and a unit, because a wrong split would change a clinical value.
- **No invented modality.** `modality` is `NOT NULL`, and the radiology catalogue has no modality column — only an inconsistent free-text category. The modality is read from the recorded test name first and the category second; both are data already on file. Where the name and the filing disagree the name wins, which correctly reclassified an ECG and an echocardiogram from radiology to cardiology. A row whose modality cannot be read from either source is skipped and named in the output.

Re-running migrates 0. `down()` removes only what it created and deliberately keeps any migrated study that has since been finalised.

**Consequence to be aware of:** because none of the 28 legacy studies is `final`, none has a report version or a PDF. They appear in history as results on record, correctly labelled, and are not treated as signed reports.

---

## 8. Frontend

Reached from **Patient → Diagnostic History**, or the clock icon on any Patient List row, which opens straight into that patient's history.

**History list** — every investigation, newest first, grouped by year. Filters: category/department, test/modality, status, referring doctor, reporting doctor, date range, test name. Paged for long histories.

**Lazy loading, verified empirically:** a fresh page load for a patient who has imaging issues exactly two requests — `/diagnostics/meta` and the history query — and nothing touching `/files` or `/download`. Images are fetched only when a specific study's viewer is opened, then one at a time as they are shown, cached per attachment and revoked when the viewer closes.

**Report viewer** — renders a finalised report from its stored snapshot, because that is the document that was signed. A study that is not final has no snapshot, so its working content is shown behind an explicit *"working result, not a finalised report"* banner; a provisional value must not read like an issued one. An amended report opens at the correction with the reason, the changed sections and the issue date, with earlier versions one click away. Print and Report PDF buttons; the PDF button is disabled when there is no issued PDF.

**Upload** — the image viewer carries an "Add pictures" control: several files at once, an optional caption, and the list re-read from the server afterwards. The server stays the authority on what is acceptable and its own message is shown verbatim; an SVG is refused with the reason, because *"not an accepted medical file type"* is useful where *"upload failed"* is not. The control disappears once a study is verified or final, replaced by a line explaining that the files are part of the signed record and a correction goes through an amendment. Both paths verified in the browser.

**Image viewer** — thumbnails, prev/next with an *n/m* counter, zoom, rotate, reset, full screen, download, keyboard shortcuts. Verified against real uploads: 420×280 images decode, zoom reaches 150%, rotate 90°, reset returns to 1×/0°, and paging back re-shows a cached image without re-downloading.

Medical files are not web-served, so an `<img src>` cannot reach them — the browser would send no token. A new `apiBlob` helper fetches bytes with the Authorization header and the same refresh-and-retry as `apiRequest`, so an expired token does not present itself as a broken image.

---

## 9. Test evidence

Nothing below is claimed on the basis of an HTTP 200.

| Suite | Result |
|---|---|
| Unit tests (`node:test`) | **152 / 152** |
| Diagnostics module probe | **24 / 24** |
| Medical file layer probe | **23 / 23** |
| Report versioning probe | **60 / 60** |
| Report PDF probe | **41 / 41** |
| Pictures in reports probe | **19 / 19** |
| GET endpoint sweep | 164 endpoints, **0 × 5xx** |
| Database integrity | 26 / 28 — see §12 |
| Frontend production build | clean |
| Browser verification | history, filters, report viewer, version switching, image viewer controls, lazy-load, PDF button |

**167 behavioural checks** across the five probes. Every probe restores the database to its exact baseline and the file store to its archive-only state; both were confirmed after each run.

Selected checks worth naming:

- Version 1's snapshot byte-identical after two amendments.
- Cross-patient file access blocked (404, not 403).
- Unauthenticated file and PDF reads → 401.
- Upload, replace and remove refused once a study is verified or final (409) — including from the real browser client.
- Integrity re-check of stored bytes against recorded checksums: 4/4.
- A lab technician can record a result but cannot sign one off (403) while still reading the version chain (200).
- Per-category PDF layouts distinguished by inflating the PDF content streams and reading the rendered text, not by trusting the code path.
- Two real PNGs embedded as image XObjects, growing the report from 3 KB to 103 KB; a study with no pictures produces no image section at all.

---

## 10. Defects found and fixed during this work

Found by testing against real data, not by reading code:

1. **Snapshot dropped the file size and upload time.** `buildSnapshot` read `size_bytes` and `created_at`; the columns are `file_size` and `uploaded_at`. Every snapshot was written with the attachment size missing from the JSON entirely and the upload time null. A permanent record must not silently drop fields it claims to preserve. No stored snapshot was rewritten — the only ones predating the fix were created by test probes and were removed.
2. **Four imaging template keys had no PDF layout.** `TEMPLATES` was keyed as though `template_key` were the category, but the modality catalogue issues its own key per imaging type, so **CT, MRI, ultrasound, doppler and mammography** fell through to the generic layout and silently lost the technique block — the part of an imaging report that records how the study was performed. Fixed, plus `sectionsFor` now logs instead of falling back silently, and `missingTemplates()` reports any catalogue key without a layout (currently none).
3. **An invalid enum write was silently corrupting a column.** The amendment path also set `diagnostic_reports.status = 'amended'`, which is not a member of the shared lifecycle enum. This MariaDB runs without `STRICT_TRANS_TABLES`, so instead of failing it stored an empty string, blanking a valid status. The write was redundant — `is_amended` and the version chain already carry it — so `status` now stays `final` and there is one source of truth.
4. **The history list could never show the amended badge**, because the summary query did not select `is_amended`.
5. **Referring doctor displayed as "—" when information was on file.** Some doctor rows have no linked user, so `user.full_name` is null while `doctor_code` is present. Both the list and the viewer now fall back to the code.
6. **DECIMAL values printed as `8.200000`**, which on a clinical report reads as a data error. Trailing zeros are trimmed; the value is never rounded.
7. **A study whose only picture was a TIFF produced no image section at all** — neither the picture nor any mention of it — because the loader filtered to embeddable types before building the list. Every image is considered now, and the undrawable ones still reach the page.
8. **`storage_key` invisible to its own service.** The leak-prevention `defaultScope` also hid the path from the code that needs it to serve a file, breaking downloads. Fixed with explicit `.unscoped()` finders, keeping the scope as defence in depth.

---

## 11. Not implemented — stated explicitly

These are gaps, not oversights hidden in prose.

1. **No user interface for result entry, verification, finalisation or amendment.** All exist and are tested as API endpoints (22 routes on `/diagnostics`), and the history, viewers and picture upload are complete, but a clinician cannot yet record a result or sign one off from the browser. This is the largest remaining piece of work.
2. **Imaging series has no endpoints.** `diagnostic_imaging_series` exists and `series_id` is accepted on upload, but there is no route to create or list a series, so it cannot be used yet.
3. **No DICOM parsing, no MWL, no PACS, no HL7, no analyser interface.** A `.dcm` file can be stored and downloaded as an opaque file, and DICOM UID columns exist, but nothing reads DICOM tags. **No fake PACS was built** — as instructed. Presenting one would have been worse than its absence.
4. **Company Profile is unconfigured**, so PDFs and receipts print without hospital identity. This is a data-entry step in Settings, not a code change.
5. **Legacy studies have no PDFs or versions**, because none was ever finalised (§7).
6. **STRICT_TRANS_TABLES is off** on this MariaDB. Defect 3 above shows the consequence: an invalid write silently corrupts instead of failing. Enabling it is a one-line server change with a wide blast radius across existing code paths, so it is **recommended, not applied** — that decision is yours.

---

## 12. Pre-existing issues, reported and untouched

Found earlier in this engagement, still present, deliberately not changed:

- Invoice INV-001 has a subtotal of 1300.00 with no line items (integrity check 1 of 2 failing).
- 10 blood bags were issued before the screening gate existed (integrity check 2 of 2 failing).
- Ambulance 16 has two `dispatched` trips while reading `available`.
- Blood bag 2 was issued twice.
- Four wards are named with digits only.
- Some doctor records have no linked user account (see defect 5).

The two failing integrity checks are the same two that were failing before this work began. All other 26 pass.

---

## 13. Recommended next steps, in order

1. **Build the result-entry UI** — record a result, verify, finalise, amend. Picture upload is done; this is the rest of it. The API and its guards are complete and tested, and this is the piece that makes the feature usable by staff.
2. **Fill Settings → Company Profile** so reports and receipts carry hospital identity.
3. **Add imaging series endpoints** so multi-instance scans group properly.
4. **Decide on `STRICT_TRANS_TABLES`.** If you want it on, it should be enabled and then the full regression re-run — I can do that on request.
5. **Consider DICOM tag parsing** as the first real step toward imaging interoperability, ahead of any PACS work.

---

## Commits

**Backend** (branch `sajib`)
- `08f1a29` permanent medical-history spine and secure file storage
- `d1f81f1` immutable report versions with controlled amendments
- `ffeeba8` bring existing lab and radiology results into history (021)
- `3a8191d` snapshot the real file size and upload time; expose `is_amended`
- `5b49184` category-specific PDF reports, one per version
- `d9253a0` put the pictures in the report

**Frontend** (branch `main`)
- `e2093e9` patient diagnostic history, report viewer and image viewer
- `b0770f9` open the issued report PDF from the report viewer
- `2032598` attach pictures to a study from the browser

All pushed.
