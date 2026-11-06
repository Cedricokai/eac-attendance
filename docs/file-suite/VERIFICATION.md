# File suite verification record

This is a development record. Features not listed as verified must not be described as completed.

## Verified stages

- Existing architecture inspected; users, employees, JWT, pages, email and activity services reused.
- Core explorer: production build, module lint, live login/routing, folder creation, immutable storage, file revisions, quotas, sharing inheritance, revocation, recycle-bin recovery and isolation tests.
- Document editor: live text/bold editing, autosave, close/reopen persistence; DOCX package text/formatting/table/page-size checks; native-content sanitization tests.
- Spreadsheet editor: live SUM and IF calculation and backend save, failed-save recovery, CSV quoting and formula-text safeguards, XLSX value/formula/basic-style/merge roundtrip tests. Univer provides the virtualized grid and formula engine; not all available grid features have individual regression tests yet.
- Image editor: live resize/rotate/crop/save. Downloaded current PNG is 40×50; preserved v1 is 200×120.
- PDF editor: live AcroForm text-field change and page rotation, autosave and binary reopen checks. Preserved v1 retains the original form and rotation. Other PDF tools still need additional workflow coverage.
- Presentation editor: live text/bold editing, duplicate/reorder slides and backend persistence. PPTX export package checks and browser reopen/import of the exported two-slide presentation passed.

## Latest recorded tests

- 44 backend file-suite tests passed (39 integration and five notification tests), including recursive folder copy, editor switches, immediate operation grants/revocation, retention safeguards, rejected-operation audit, CSV safety, notification commit/rollback, and storage-warning throttling.
- Existing `EacBackendProjectApplicationTests` passed with the core module.
- 19 format/sanitization/CRDT tests passed (`npm run test:files`), including separate-cell convergence, stable slide-object changes, concurrent slide additions, rich-text binary recovery, archive limits, and native-workbook bounds/network-formula rejection.
- `tests/files/verify-local-fixtures.mjs` passed against local MySQL-backed APIs for document, spreadsheet, PDF and image persistence and original preservation.
- Production build passed with all editor, sharing, collaboration, backup, and administration chunks. The output includes the updated per-object array model. Existing repository JSX/chunk-size warnings remain.
- New module ESLint checks passed. All four local PowerShell launchers passed syntax parsing.
- The full backend suite ran 350 tests: 346 passed, with three assertion failures and one error in unchanged attendance/report tests. H2 reserved-word configuration was corrected so inventory/payroll persistence contexts run successfully. Remaining failures: `AttendanceAutoMarkTest.mobileLateCheckInUpdatesExistingAbsenceImmediately`, two `HolidayAttendanceHoursTest` calculations, and `AttendanceReportExcelServiceTest.incompleteCheckInShowsPendingWithoutInventingWorkedHours`. Full suite output is in the backend's ignored `file-suite-full-tests.log`.
- Real local WebSocket/checkpoint verification is recorded separately after the services restart; CRDT unit tests alone are not proof of that runtime path.

## Compatibility boundaries

- EAC native formats store structured editable state (`.eacdoc`, `.eacsheet`, `.eacslides`). Imported Office files remain intact; explicit editable copies prevent overwriting originals with lossy conversions.
- Uploaded DOCX now uses original-package editing: docx-preview renders the original; existing paragraph text (including headers/footers) is patched in place while all other package entries remain. New native EAC documents retain the rich-text editor. Original DOCX mode does not add/remove structures or reformat drawings, and browser pagination can differ from Word. Signed documents are protected from editing.
- Uploaded XLSX uses original-package cell value/formula editing through the cell editor; chart/image/custom parts, styles and untouched worksheet XML remain. The grid is a simplified preview. Existing row/sheet structure is protected, shared/array formula edits are rejected, and formatting/structural changes require Excel. Native EAC XLSX exports still support basic values/formulas/styles/sizes/merges rather than full Office fidelity.
- PowerPoint creation and editing are removed from the workspace at the user’s request. Existing PPTX/EAC slide files remain stored and downloadable.
- PDF: overlays and supported page/AcroForm modifications, not rewriting existing text objects or cryptographic signing. Limits: 50 MB/200 pages.
- Image: raster canvas editing, up to 16 MP; non-native/animated formats need a PNG copy for editing.
- Ordinary saves use revisions to prevent stale overwrites. Internal live sessions use Yjs/Hocuspocus, backend authorization, leases, versioned checkpoints, and recovery state. Spreadsheet structural changes/sort/merge/local undo are restricted during live sessions; cell edits and charts remain available. Slides use stable identities and per-object positions; simultaneous edits to the same property resolve deterministically. External guest sessions use ordinary revision checks.
- Live SMTP delivery has not been configured or verified. Guest-code email tests use a mocked mailer, never live external recipients.

## Library sources

- TipTap OSS MIT: https://tiptap.dev/docs/editor/getting-started/overview
- Univer core/presets Apache-2.0: https://github.com/dream-num/univer
- ExcelJS MIT: https://github.com/exceljs/exceljs
- PDF.js Apache-2.0: https://github.com/mozilla/pdf.js/blob/master/LICENSE
- pdf-lib MIT: https://github.com/Hopding/pdf-lib
- PptxGenJS MIT: https://github.com/gitbrent/PptxGenJS/blob/master/LICENSE

Versions are pinned in package.json/package-lock.json. Paid editor templates, office-hosting services and proprietary Univer add-ons are not used. The repository has existing dependency advisories, including its older SheetJS and html-docx-js dependencies; the new spreadsheet importer uses ExcelJS. Mammoth's CLI dependency has an advisory that should be reviewed separately from the bundled browser importer. Do not run automatic breaking dependency upgrades as part of this feature.

## Scope boundaries

This is a functional native-editor file suite, not complete Microsoft Office parity. Recursive folder copy, individual editor switches, configurable recycling/version/audit retention, and existing-account per-operation `FILE_*` grants are implemented and covered by tests. Broader mobile/accessibility/PDF workflow coverage remains. Automatic email notifications start disabled and reuse the existing SMTP service; transaction rollback suppresses delivery. The default retains saved versions and recycled files until an authorized user explicitly removes them. Existing attendance/report test failures also remain unresolved. These limits must remain visible in delivery claims.

File snapshots recover new private copies, not old account permissions or active guest sessions. They are not a replacement for a complete application database backup. NAS deployment assets are provided for review, but no remote deployment or container-restart verification has been performed here.

## Final local verification — 2026-10-21

- Final production build passed (6,475 modules); module ESLint and all 17 frontend tests passed.
- MySQL backend started on 8080, frontend on 5173, and collaboration on 1234. The all-service launcher correctly reused these running services.
- Real two-client workbook and presentation WebSocket tests passed: independent edits converged, immutable checkpoints persisted, and original versions were preserved (local verification files 28 and 29). Document live/offline recovery and filesystem backup verification/download SHA/recovery also passed earlier in this run.
- Existing administrator browser login reached the dashboard successfully.
- Browser regression found and corrected stale formula caches after remote checkpoints: initial workbook loading now forces formula computation, and remote mutations request recalculation. Reopening the live workbook displays SUM(A1:A2) = 20 for saved inputs 12 and 8.
- Final build after the formula correction passed (1m49s). The private collaboration bridge key is absent from production browser assets. Local administration endpoints for operations, analytics, audit, backups and storage all returned successfully.

## Original document preservation update

- Deep-yellow folders, red PDF, green Excel and blue/white Word icons; white Word and green Excel title bars.
- Original DOCX and XLSX saves retain the same file identity and extension, with immutable original version history. Uploaded bytes are checked against the initial downloaded bytes. No conversion is required to edit original text/cell values.
- Added package-preservation regressions: DOCX checks all unrelated ZIP entry bytes, headers/footers, drawing and run formatting; XLSX checks chart/image/custom parts, untouched sheet XML, styles and formulas. All 19 frontend tests pass.
- Original DOCX browser edit and save verified on local fixture 30; header/footer preview remains visible and version 2 saves on the same DOCX file.

## Employee API and workspace cleanup

- Internal sharing now requests `/api/employee/file-sharing?q=...`, a minimal projection of existing employees linked to enabled EAC accounts. It returns directory names, employee IDs, email and category only; inactive employees are excluded and cannot receive new shares. File page and FILE_SHARE checks still apply. No demo recipients are supplied.
- Known implementation verification files and recovered test-copy folders were removed from the active workspace and permanently purged through the file APIs. User uploads and unrelated recycled items were excluded. No fixture scripts run during normal startup.
- Real browser edits on original DOCX and XLSX files were downloaded and checked: only selected document/sheet XML and required recalculation settings changed; all unrelated ZIP entries and original version 1 matched.

- Final employee API regression and file-suite notification/integration tests passed: 44 tests, zero failures/errors. Module ESLint and all 19 frontend tests passed. The live MySQL-backed employee projection and cleaned workspace returned successfully; browser login and share dialog were verified. Currently no active employees have linked EAC login accounts, so the share picker accurately shows no eligible internal recipients.
- Final production build passed in 2m50s. Bundle inspection confirmed the final package-preserving calculation fix and absence of the private collaboration bridge key.

## Storage, recycle and complete viewing — 2026-10-22

- Unlimited storage uses zero quota bytes, with no 5 GB default. New account/organization defaults are unlimited; the current local database settings were explicitly updated to zero. Admins can set finite default/account/folder quotas. Upload-size and physical-disk limits remain separate. Storage warnings skip unlimited quotas.
- Recycle-bin permanent deletion validates and removes the entire deleted subtree, child versions, comments, access grants, invitations and live state transactionally. Content files are removed after commit. Admins see the organization recycle bin; other users see their own. Admin settings and backup permissions remain enforced on the server.
- All 47 backend file-suite tests passed, including nested folder purge, unlimited/finite quota behavior, admin settings/backups/company recycle access and unauthorized access checks.
- All 20 frontend format/CRDT tests and module ESLint passed. The new import test retains 52 worksheets and a cell at row 20,001/column 701. Excel dimensions now support 1,048,576 rows and 16,384 columns; browser safety limits remain explicit (2 million populated cells, bounded Office archives), with no silent partial imports. Cached uploaded formula results are preserved rather than recomputed on opening; external formulas are never executed.
- The actual uploaded employee workbook was inspected by counts only: both worksheets and all 6,554 populated/style cells reached the preview. Added All data (table), independent row/column paging, every-sheet selection and direct grid Go to cell navigation. Verified its full original 159 rows/50 columns, the final row block and grid navigation to AX159 without editing the workbook. Original-package saves now use only explicit cell edits, excluding grid normalization.
- Original DOCX pages have clickable page numbers and per-page labels. Browser layout flow preserves all blocks when cached Word page-break markers are absent. Verified a two-page document with repeated headers/footers and page-2 navigation, plus all 120 paragraphs across three automatically generated pages. Native EAC documents have a Pages view: all 120 paragraphs remained across five numbered pages, with Back to editing preserving the editor state. Complex oversized blocks remain intact; pagination can differ from Word.
- Large PDFs open in the complete browser PDF viewer instead of being rejected by the 50 MB/200-page editing ceiling. Smaller PDFs retain the existing numbered thumbnail editor.
- Pagination fixtures were kept in the ignored local QA folder and never uploaded into File Management. Local admin login, zero-quota storage, backup policy, organization recycle and settings UI all verified.
- Final production build passed in 1m34s. Bundle checks confirmed full worksheet navigation, native numbered page view and absence of the private collaboration bridge key.

## Loading screen and workspace palette — 2026-10-22

Files module ESLint passed. Production Vite build passed (2m32s); existing attendance duplicate-key warning remains outside this change. Browser verification observed the actual /files startup status and the loaded workspace; the reference loader was also inspected independently. Screenshots: .codex-tmp/eac-files-loading.png and .codex-tmp/eac-files-orange-workspace.png. The temporary preview entry was removed after verification; no uploaded documents were changed by this UI work.
