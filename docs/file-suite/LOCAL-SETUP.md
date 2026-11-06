# Run EAC locally

Requirements: Java 17, Node.js/npm, MySQL 8 running on localhost:3306, and the existing EAC database. Do not reset or recreate existing tables.

## Backend

In the backend repository, copy `.env.example` to `.env.local` and enter the local MySQL password and a long random JWT secret. This file is ignored by Git. The working local connection has already been configured on this workstation.

Run in PowerShell:

```powershell
cd C:\Users\albert\Desktop\eac-attendance-backend
.\run-local.ps1
```

For an already compiled backend, `.\run-local.ps1 -NoCompile` starts faster. After changing Java sources, run without `-NoCompile`.

Backend: http://localhost:8080. Port 8080 must be available. Stop only the application you intend to replace. Keep the terminal running; Ctrl+C stops the backend.

## Frontend

In a second PowerShell terminal:

```powershell
cd C:\Users\albert\Desktop\Eac_Attendance_Frontend\eac-attendance
npm install
npm run dev
```

Open http://localhost:5173 and sign in with an existing EAC account. File Management is available at http://localhost:5173/#/files. Administrators can assign this page to employees/roles using the existing Page Permissions screen. Internal shares require a linked, enabled employee account and File Management page access.

Local data persists in MySQL and `uploads/file-suite` in the backend repository. Every saved file version is immutable. Keep this directory with the matching database when backing up. `.env.local`, uploads and backups must never be committed.

SMTP is not configured by the local placeholder. Configure the existing EAC email settings with valid SMTP credentials before relying on email invitations. A successful login does not verify email delivery.

## Start all local services

On this workstation, the database and private local environment files are already configured. From the frontend folder run:

```powershell
.\start-eac-local.ps1
```

This starts hidden backend, frontend, and collaboration processes and writes launcher logs into their project directories. Occupied ports are reported and reused; check that an existing service is EAC before using it. The script does not stop unrelated applications. MySQL80 must already be running. Open `http://localhost:5173/#/`; `/#/login` is also supported. The existing local administrator login is `admin` / `admin123` on this development database.

For visible terminal logs and Ctrl+C shutdown, start `run-local.ps1` separately in each repository and `collaboration/run-local.ps1` in a third frontend terminal. Restart after Java source changes. The local backend launcher disables automatic DevTools restarts so test compilation does not interrupt login.

## Live collaboration

The frontend root `.env.collaboration.local` and backend `.env.local` must contain the same private `APP_FILES_COLLABORATION_KEY`. A matching random key has been configured locally. The sidecar listens on `127.0.0.1:1234`, uses the existing EAC JWT and file permissions, and saves checkpoints through the backend. Enable live collaboration in **Files → File settings**, open a native EAC document/workbook/presentation, and choose **Join live session**. An editor must start the session before viewers join. Existing external guest editing uses ordinary version/revision checks and does not grant access to internal live rooms.

Checkpoints create immutable versions every 10–30 seconds. Presence comes from authenticated accounts. Binary recovery snapshots are stored in `.collaboration-data`; keep this directory private and persistent. If saving or connectivity fails, keep the window open and download a recovery copy. A short lease prevents ordinary editor saves while a live session owns the file. Restore or a normal saved edit changes the room epoch so an old session cannot silently overwrite it.

Spreadsheet live sessions support cell edits and charts. Structural row/column/sheet changes, sort, merge, and local grid undo are blocked while live to keep coordinates stable. Make those changes in the ordinary editor after the session ends. Slide properties and additions synchronize by stable object identity; simultaneous moves of the same property resolve deterministically. Rich text uses the TipTap/Yjs CRDT and shared document layout fields.

## Backups and quotas

Administrators can create, verify, download, and recover file snapshots from **Backups & recovery**, choose filesystem or bounded database storage, and enable daily/weekly/30-day scheduling. Recovery creates private copies and counts against quotas. Scheduled backups start disabled. **File settings** provides global upload/storage limits and account/folder quota overrides. **Activity** supports search, action/date filters, and CSV export of up to 10,000 matching entries. **Storage** shows actual current/version/recycled bytes and totals by MIME type; administrators also see owner totals.

## Verification

```powershell
# Backend test database is in-memory H2, separate from local MySQL.
.\mvnw.cmd '-Dtest=FileSuiteIntegrationTest,EacBackendProjectApplicationTests' test

# Frontend
npm run build
npx eslint src/pages/Files
# Automated test sources were removed for this handoff at the owner’s request.
```

The repository already has warnings and security advisories outside the new module. Do not apply `npm audit fix --force` without reviewing compatibility changes.

If an automated sandbox reports `LocalRepositoryNotAccessibleException`, launch the backend from an ordinary PowerShell terminal using the command above. This is a Maven cache permission restriction in the automation environment, not a database reset requirement.

## Original Office files and sharing

Uploaded DOCX files open from their original package. Use Edit text for existing paragraphs, including headers and footers, and Save to version the same DOCX. Uploaded XLSX files use the cell address/value editor to update existing cells/formulas in the same XLSX while retaining unrelated package parts. Browser previews can differ from Microsoft Office; structural/advanced formatting changes require Word or Excel. Existing converted EAC copies cannot reconstruct content omitted by earlier conversions; use the uploaded original or its version history.

The share picker uses `/api/employee/file-sharing`, backed by existing employees and linked enabled EAC accounts. Inactive employees are excluded. An employee must have a linked login account to access a shared file. No sample recipients or files are created by startup.

Storage defaults to unlimited (quota value 0), within available server disk space. Admins use File settings for default account/organization limits and quota overrides for particular accounts/folders. Existing deployments retain their saved settings until an admin changes them; this workstation has been updated to unlimited. Admins can inspect the company recycle bin and permanently delete nonempty recycled folders in one action.

Use All data (table) in a workbook to access all worksheets and page through every row/column; Go to cell scrolls the grid directly. Uploaded Word documents expose numbered page buttons. Native EAC documents expose Pages / Back to editing. Large PDF files use the browser PDF viewer. Browser memory/archive limits remain explicit, and complex Office layout can differ while originals remain intact.
