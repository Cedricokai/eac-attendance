# Transport operations and local setup

## Local launch
Start MySQL, then double-click `Start-Backend.cmd` in the backend folder, or run `./run-local.ps1`. The backend uses port 8080 and the ignored `.env.local`; the launcher prefers installed Maven and otherwise uses the repository wrapper. IntelliJ can run `EacBackendProjectApplication` with the backend working directory; the existing `.env.local` selects the local profile automatically unless another profile was explicitly selected.

Run `./run-local.ps1` in the frontend folder for Vite on port 5173. Keep one instance of each server running. Open `http://localhost:5173/#/adminDashboard` after login. Do not commit `.env.local`, backups, tokens or uploaded originals.

## Navigation and access
The backend Transport context, not the displayed account name, is authoritative. ROLE_ADMIN and ROLE_TRANSPORT_ADMIN receive all Transport action permissions. Other accounts require their assigned Transport action grants, an existing authorized legacy entry page, or an active linked driver/procurement role as applicable. Settings includes reasoned, audited per-account/role Transport grant administration. Drivers see only assigned vehicles and their own allowed actions.

Pages: Fleet overview; Vehicles and vehicle profile; Drivers; My driver workspace; Fuel management; Maintenance history; Component plans; Work orders; Routine inspections; Fault reports; Parts procurement; Documents & expiry; Reports & analytics; Team directory; Notifications; Transport settings.

File Management permissions and individual file ACLs remain independently enforced. Granting Transport administration does not grant access to another person's private files. Optional driver file access is explicit and applies only to a newly created, owned driver login, with the grantor's File Management authority; globally disabled file-operation policies are not enabled by this option.

## Files, history and safety
Uploads preserve original bytes in the existing File Management repository. Transport removal unlinks/archives records instead of deleting originals. Document renewals retain previous versions and expiry history. File Management owners can still intentionally purge files through that module; Transport keeps domain history and original-file metadata with nullable links.

Unknown odometer readings stay unknown; zero is valid. Corrections require reasons and retain superseded dated readings. Forecasts describe stale or insufficient evidence and use either the time or mileage threshold. Ghana dates use Africa/Accra.

Critical/nonoperational faults force a vehicle out of service. Completion of repair alone does not release it: work verification and authorized safety assessment are required. Vehicle restoration retains restrictions; driver restoration does not silently enable its login. Historical procurement/fuel/service records remain linked after registration changes or archival.

## Email and notification operation
Transport reuses existing Spring SMTP credentials; configure them locally/deployment-side, never in the frontend. Enable email explicitly in Transport settings. Test mail is an explicit administrator action. Normal queued email pauses when email is disabled; an explicitly requested SMTP test can still run. Delivery retries are durable and deduplicated, with stable message identifiers. Current account status and preferences are rechecked before sending. Transport SMTP timeouts default to ten seconds and can be set with `transport.mail.timeout-ms` (1–60 seconds).

## Database migration and rollback
Before production deployment, back up the database and existing managed-file storage. Run the additive SQL scripts in backend `src/main/resources/db` in order: V10__transport_upgrade.sql, V11__transport_directory_preserve.sql, V12__transport_fuel_submission_keys.sql, V13__transport_request_category.sql. They require MySQL 8.0.13 or later and reference existing application tables. They are standalone scripts; verify your deployment migration runner includes them rather than assuming filenames alone cause execution.

V11 copies legacy fleet contacts from the original users table only when the legacy columns exist. It preserves all login rows, hashes and memberships, and reapplication retains edited contacts in transport_directory. Never rename the original users table.

Stop application writes before a schema change. Verify original table counts, document links and login afterward. Preserve the pre-update backup. Preferred rollback: stop writes, deploy the previous application only after checking schema compatibility, and retain additive Transport tables/history. A database restore is a maintenance operation: use the preserved database/file backups together and account for writes made since backup. Do not drop the new tables or copy old fleet directory rows over login records as a rollback shortcut.

The opt-in TransportMigrationVerificationTest creates a guarded random local schema and applies these scripts twice; it never targets the application schema. Enable only with TRANSPORT_VERIFY_MYSQL=true and run that single class separately from Spring H2 tests. Never pass the real datasource environment into the H2 integration suite.

## Report interpretation
Exports include all matching filtered rows, not just the displayed browser page. CSV neutralizes spreadsheet formulas; XLSX uses native numeric cells. Operating costs allocate fuel by purchase date, procurement by actual receipt date, and remaining service costs by service date without counting linked parts twice. Missing legacy associations remain visible as unallocated values.

PDF uses `app.transport.report-font` when set, otherwise an available Arial/DejaVu/Liberation system font. Install a font covering your required language on the deployment host. Unsupported characters cause an explicit error with CSV/XLSX alternatives rather than silently removing text. Large datasets have not been load-tested.
