# EAC File Management Suite

## Inspection and integration decisions

- React 18/Vite, HashRouter, Tailwind and Lucide. Existing modules use `jwtToken`, `userData`, `userRole`; the new module uses Fetch and the existing API URL helper.
- Spring Boot 3.2.3/Java 17/JPA/MySQL. Reuse `users`, `employee`, roles, `pages`, `user_pages`, `page_roles`, JWT filter, `PageService`, `EmailService` and `ActivityLogService`.
- Register `/files` with the existing page seeder. Check active page assignments on every file API request as well as file/folder access. Administrators retain company access.
- Store immutable file versions on a configurable persistent filesystem, with metadata and optimistic revisions in MySQL. Originals are never overwritten. A mounted NAS directory uses the same storage adapter. S3 requires a separate adapter.
- Existing deployment uses Hibernate schema updates and explicitly disables Liquibase. Additive entities follow that working configuration; migration scripts are provided for controlled deployments, never automatically reset existing tables.
- Existing employee uploads and inventory documents remain separate business records, untouched by this suite.
- Existing STOMP topics do not yet provide the authenticated per-document CRDT protocol required for safe collaboration; do not broadcast file contents onto those topics.
- SMTP credentials were not configured during local startup. Invitations must report delivery failures honestly.

## Ordered delivery and verification

1. Inspection: architecture, authentication, employee linkage, permissions, deployment, storage, audit, email.
2. Core: file explorer, folders, immutable uploads, secure downloads, move/copy/rename, recycle bin, stars, search, pagination, inherited permissions, storage totals and integration tests.
3. Document editor: TipTap OSS rich text, structured saves, import/export, original preservation, autosave and revision conflicts.
4. Spreadsheet editor: licensed grid/calculation engine, multiple sheets, XLSX/CSV processing, compatibility warnings and tested formula behavior.
5. PDF/image editors: PDF.js/pdf-lib and browser canvas; supported page operations, overlays and image transformations.
6. PowerPoint editing/creation removed at the user’s request; existing files remain downloadable.
7. Sharing: employee-linked accounts, guest invitations, expiry/revocation and existing email service.
8. Collaboration: authenticated per-document CRDT state, reconnect and revocation tests. Revision conflict detection alone is not real-time collaboration.
9. Backup/recovery: consistent metadata/content manifests, checksums, verification, restore, scheduling, bounded database backups.
10. Administration: backend limits, quotas, settings, storage analytics and audit.
11. Security/regression: cross-account isolation, upload validation, revoked access, stale saves, login and existing module smoke checks.
12. Deployment/documentation: persistent NAS volumes, backup volumes, limits and supported-feature matrix.

## Library assessment sources

Only OSS editor engines are eligible; hosted office editors are excluded. Check installed package licenses before use. TipTap OSS is MIT (https://tiptap.dev/docs/editor/getting-started/overview); its paid templates/extensions are excluded. Univer core is Apache-2.0 (https://github.com/dream-num/univer), but commercial import/export/collaboration add-ons cannot be assumed free. `react-spreadsheet` is MIT (https://github.com/iddan/react-spreadsheet) but does not satisfy the complete virtualized workbook requirements by itself. Library selection remains a stage gate, with fidelity limitations documented before exposing imports.

## Delivery status

The integrated native file suite is implemented and runs locally with the existing MySQL database, authentication, users and permissions. See VERIFICATION.md for tested workflows and the supported-feature matrix. Advanced Office fidelity, live SMTP delivery and remote NAS deployment are outside the verified delivery; those boundaries remain explicit.

## File Management loading and palette (2026-10-22)

The /files route uses a lightweight, eagerly styled FileLoadingScreen while its lazy module loads. The same screen remains during the initial workspace request, then yields on success or error; subsequent searches and folder navigation retain the existing inline loading state. No simulated progress is used. At the user’s request, the initial screen stays visible for at least two seconds (and until the initial request settles); later folder navigation remains inline. The orange-and-white SVG ring rotates with CSS and respects prefers-reduced-motion. The supplied image reference informed the charcoal navigation, orange actions and warm white surfaces, scoped to File Management. Native file icon colors and Word/Excel heading colors remain intact.
