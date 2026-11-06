# CODEX MASTER PROMPT
## EAC Electrical Solutions Limited — Complete Vehicle & Transport Management System Upgrade

### 1. PROJECT OBJECTIVE

You are a senior full-stack software engineer, system architect, database engineer, and UI/UX designer.

Your assignment is to inspect, debug, modernize, and extend the **existing Vehicle and Transport Management System** within my current application.

**IMPORTANT: This is an existing working project, not a new application.**

The system already contains:

- Admin Dashboard
- Vehicle Management
- Drivers Management
- Maintenance Management
- Reports
- Analytics

Your responsibility is to improve these existing modules, fix bugs, implement missing functionality, and introduce additional modules without disrupting the existing application.

Do not unnecessarily rebuild the project, change its technology stack, or remove existing features.

### Core development rules

1. Inspect the frontend, backend, database schema, API endpoints, authentication, and existing transport modules before making changes.
2. Identify the project's existing coding patterns, components, styling conventions, permissions, and database relationships.
3. Reuse existing components, services, APIs, entities, and utilities where appropriate.
4. Preserve all existing vehicle, driver, maintenance, and reporting records.
5. Use backward-compatible database migrations.
6. Follow the existing application's authentication and authorization architecture.
7. Implement real functionality rather than mock interfaces or static demonstration data.
8. Ensure every form, button, filter, notification, report, and dashboard action works.
9. Use the existing File Management System as the primary UI/UX design reference.
10. Make the entire transport system fully responsive on desktop, tablet, and mobile devices.

---

# 2. EXISTING SYSTEM INSPECTION AND BUG FIXES

Before developing new functionality, audit the existing transport system.

Identify and fix:

- Broken vehicle registration or editing forms.
- Vehicle records not saving or updating correctly.
- DVLA expiry dates not displaying.
- Missing or incorrectly loaded vehicle information.
- Image upload issues.
- Incorrect maintenance calculations.
- Missing relationships between drivers and vehicles.
- Dashboard statistics that do not reflect actual database records.
- Incorrect or inconsistent mileage calculations.
- Broken filtering, sorting, searching, or pagination.
- Failed API calls.
- Frontend and backend data inconsistencies.
- Incorrect date handling and timezone conversions.
- Any existing bugs discovered during inspection.

Do not assume a bug's cause without inspecting the relevant code and database.

Document each discovered issue, its root cause, and the implemented fix.

---

# 3. COMPLETE SYSTEM NAVIGATION AND LAYOUT

Redesign the transport module using the visual style of my existing File Management System.

Create a modern enterprise-level interface with a professional sidebar, header, cards, tables, forms, and dashboards.

### Sidebar navigation

Organize the following modules logically:

1. Dashboard
2. Vehicle Management
3. Driver Management
4. Fuel Management
5. Maintenance Management
   - Preventive Maintenance
   - Corrective Maintenance
   - Routine Maintenance
   - Maintenance Schedule
   - Maintenance History
6. Fault & Repair Requests
7. Procurement Requests
8. Vehicle Inspections
9. Documents & Expiry Tracking
10. Notifications
11. Reports & Analytics
12. Administration & Settings

Only show menu items permitted by the signed-in user's role.

### Sidebar requirements

- Collapsible and expandable.
- Attractive icons for each module.
- Active menu highlighting.
- Smooth transitions.
- Organized nested navigation.
- Professional spacing and typography.
- Tooltips when collapsed.
- Responsive mobile drawer.
- Preserve navigation state where appropriate.

### Header requirements

Include:

- Current page title and breadcrumbs.
- Global search where appropriate.
- Notification bell with unread count.
- User profile avatar.
- User name and role.
- Account dropdown.
- Logout.
- Mobile sidebar toggle.

Follow the existing File Management UI styling, including colors, borders, card treatment, spacing, typography, and interaction patterns.

Do not introduce a completely different visual identity.

---

# 4. VEHICLE MANAGEMENT MODULE

Upgrade the existing vehicle registration and management module.

### Vehicle registration fields

Include:

- Vehicle registration number — required and unique.
- Vehicle make.
- Vehicle model.
- Manufacturing year.
- Vehicle category.
- Vehicle type.
- Chassis/VIN number.
- Engine number.
- Fuel type.
- Transmission type.
- Vehicle color.
- Vehicle acquisition date.
- Assigned department or project.
- Assigned driver.
- Vehicle ownership type.
- Vehicle status.
- Initial odometer reading — optional.
- Current odometer reading — optional.
- Notes and remarks.

### Critical requirement: Optional odometer reading

The odometer field must NOT be mandatory during vehicle registration or editing.

A vehicle must be successfully registered even if the odometer reading is blank.

Backend validation, database constraints, frontend forms, and API DTOs must all support nullable odometer values.

Never automatically save an unknown odometer reading as zero.

Where mileage is unknown, display:

**Not Recorded**

Any mileage-dependent maintenance prediction must show an appropriate unavailable state until valid mileage information is entered.

### Vehicle image uploads

Add image upload functionality during vehicle registration and editing.

Requirements:

- Upload multiple vehicle images.
- Display an image preview before saving.
- Select a primary vehicle image.
- Support JPG, JPEG, PNG, and WebP.
- Validate file size and file content.
- Store images securely using the application's existing file storage infrastructure.
- Save image references in the database.
- Allow replacing and deleting images.
- Display a primary thumbnail in vehicle listings.
- Display an image gallery on the vehicle details page.
- Preserve existing images when unrelated vehicle information is edited.

Do not store image files directly as large database blobs unless the existing architecture specifically requires this.

### Vehicle profile page

Each vehicle must have a dedicated profile containing:

- Vehicle photo gallery.
- Registration details.
- Assigned driver.
- Current mileage.
- Fuel consumption history.
- Maintenance history.
- Upcoming maintenance.
- Document expiry status.
- Open faults.
- Pending procurement requests.
- Total operating and maintenance cost.
- Vehicle activity timeline.

---

# 5. DVLA AND VEHICLE DOCUMENT EXPIRY BUG FIX

The existing system has a problem where DVLA expiry information does not reflect correctly.

Inspect the complete flow from database storage to API serialization and frontend rendering.

Fix any underlying problems with:

- Incorrect database column mapping.
- Missing API fields.
- Incorrect DTO mapping.
- Date parsing.
- Date formatting.
- Timezone handling.
- Incorrect frontend state.
- Failed updates.
- Missing expiry calculations.

### Documents to support

- DVLA registration or renewal expiry.
- Roadworthy certificate.
- Vehicle insurance.
- Vehicle inspection certificate.
- Other custom vehicle documents.

Each document must support:

- Document type.
- Reference number.
- Issue date.
- Expiry date.
- Optional document attachment.
- Renewal status.
- Renewal history.
- Notes.

### Expiry indicators

Display:

- Valid
- Expiring Soon
- Expired
- Not Recorded

Use clear visual indicators.

Default notification thresholds:

- 30 days before expiry.
- 14 days before expiry.
- 7 days before expiry.
- On expiry date.

These thresholds must be configurable by the transport administrator.

Use the Ghana timezone, Africa/Accra, for business date interpretation and display.

A document should not be marked expired before its actual expiry date.

When a document is renewed, retain its previous history and update the active expiry information.

---

# 6. FUEL MANAGEMENT MODULE

Implement a complete fuel tracking module integrated with vehicles, drivers, and analytics.

### Fuel entry form

Fields:

- Vehicle — required.
- Fuel date — required.
- Fuel quantity in litres — required.
- Price per litre — optional if total cost is provided.
- Total fuel cost — required.
- Fuel type.
- Fuel station or supplier.
- Driver.
- Odometer reading — optional.
- Payment method.
- Fuel receipt upload — optional.
- Transaction reference.
- Remarks.

### Critical requirement: Optional fuel receipt

The user must be able to save a fuel transaction without uploading a receipt.

If a receipt is uploaded:

- Support PDF, JPG, PNG, and WebP.
- Validate file type and size.
- Store securely.
- Display a preview where supported.
- Allow authorized users to view or download it.
- Allow authorized replacement or removal.
- Preserve the receipt when editing unrelated fields.

### Fuel calculations

Calculate:

- Total litres purchased.
- Total fuel expenditure.
- Average fuel price per litre.
- Monthly fuel expenditure.
- Fuel expenditure per vehicle.
- Fuel expenditure per driver where attribution is available.
- Fuel consumption per 100 km.
- Kilometres per litre.
- Cost per kilometre.

Mileage-based consumption calculations must only run when sufficient valid odometer data exists.

Do not invent distance travelled or assume missing odometer readings equal zero.

### Fuel analytics

Provide:

- Fuel expenditure trends.
- Monthly fuel comparison.
- Fuel usage by vehicle.
- Highest fuel-consuming vehicles.
- Fuel cost per kilometre.
- Fuel efficiency trends.
- Unusual fuel usage alerts.

Use appropriate charts, tables, and summary cards.

---

# 7. VEHICLE COMPONENTS AND PART-SPECIFIC MAINTENANCE MILEAGE

Implement a component-based maintenance tracking system.

Each vehicle must have individual maintenance records for its components.

Examples include:

- Engine oil.
- Oil filter.
- Air filter.
- Fuel filter.
- Brake pads.
- Brake discs.
- Tyres.
- Battery.
- Transmission oil.
- Differential oil.
- Coolant.
- Timing belt.
- Suspension.
- Steering components.
- Wheel bearings.
- Other custom components.

### Component maintenance fields

Each component must support:

- Vehicle.
- Component name.
- Component category.
- Last service date.
- Last service mileage.
- Service interval in kilometres.
- Service interval in days or months.
- Next service mileage.
- Next service date.
- Replacement date.
- Replacement cost.
- Supplier.
- Technician.
- Maintenance status.
- Remarks.

### Example

Vehicle: Toyota Hilux

Component: Engine Oil

Last service mileage: 85,000 km

Service interval: 5,000 km

Next service mileage: 90,000 km

Current mileage: 89,500 km

Remaining distance: 500 km

Status: Service Due Soon

### Mileage calculation

Next service mileage = Last service mileage + Service interval.

Remaining mileage = Next service mileage - Current vehicle mileage.

### Alert thresholds

Default:

- 1,000 km remaining — upcoming.
- 500 km remaining — warning.
- 0 km or below — due or overdue.

Allow the transport administrator to customize these values per component or maintenance policy.

### Important logic

If the current vehicle mileage is unknown, the system must not display a fabricated remaining mileage.

Support both time-based and mileage-based service schedules.

Where both exist, maintenance becomes due when either applicable threshold is reached.

After maintenance is completed, update the component's next service schedule based on the actual completed work and configured interval.

Keep the complete historical record.

---

# 8. PREVENTIVE MAINTENANCE

Implement scheduled preventive maintenance.

Preventive maintenance should allow the transport administrator to define recurring service plans.

Examples:

- Engine oil replacement every 5,000 km.
- Brake inspection every 5,000 km.
- Tyre inspection every month.
- Battery inspection every 3 months.
- General mechanical inspection every 6 months.

All intervals must be configurable rather than hardcoded as universal manufacturer recommendations.

### Preventive maintenance workflow

1. Administrator creates a maintenance plan.
2. Administrator assigns the plan to one or more vehicles.
3. System calculates the next due date or mileage.
4. System monitors the maintenance schedule.
5. System generates advance alerts.
6. Driver receives a notification where applicable.
7. Administrator schedules the service.
8. Maintenance is performed.
9. Completion is recorded.
10. Next maintenance is calculated.

Support maintenance checklists, attachments, costs, assigned technicians, and completion verification.

---

# 9. CORRECTIVE MAINTENANCE

Implement corrective maintenance for faults, breakdowns, and repairs.

A driver must be able to report a fault from their own account.

### Fault reporting form

Include:

- Vehicle — automatically linked to the assigned vehicle where appropriate.
- Fault category.
- Fault description.
- Date and time reported.
- Current odometer — optional.
- Fault severity.
- Vehicle location or project site.
- Optional photos or supporting attachments.
- Whether the vehicle remains operational.
- Driver comments.

### Severity levels

- Low
- Medium
- High
- Critical

Critical safety-related faults must be visibly escalated and require an authorized assessment before a vehicle is marked fit for service.

### Corrective maintenance workflow

1. Driver submits a fault.
2. System generates a unique fault reference.
3. Transport administrator receives an email and in-app notification.
4. Administrator reviews and classifies the fault.
5. Administrator creates or links a corrective maintenance work order.
6. Required parts and labour are identified.
7. Procurement request is generated where needed.
8. Procurement receives the request.
9. Parts are purchased and received.
10. Technician performs the repair.
11. Maintenance cost and work completed are recorded.
12. Authorized administrator verifies completion.
13. Vehicle is released for service where safe.
14. Driver receives a status update.

Track the entire workflow with timestamps and audit records.

### Corrective maintenance statuses

- Submitted
- Under Review
- Approved
- Awaiting Parts
- Scheduled
- In Progress
- Completed
- Rejected
- Closed

Keep fault severity separate from workflow status.

---

# 10. ROUTINE MAINTENANCE AND VEHICLE INSPECTIONS

Create configurable routine inspection schedules.

Support:

- Daily inspections.
- Weekly inspections.
- Monthly inspections.
- Custom inspection schedules.

### Daily inspection examples

- Engine oil level.
- Coolant level.
- Brake condition.
- Tyres.
- Lights.
- Horn.
- Mirrors.
- Windscreen.
- Wipers.
- Fluid leaks.
- General vehicle condition.

### Weekly inspection examples

- Battery terminals.
- Tyre pressure.
- Brake fluid.
- Suspension condition.
- Vehicle cleanliness.
- Spare tyre and tools.

### Monthly inspection examples

- Comprehensive mechanical inspection.
- Electrical system inspection.
- Tyre wear assessment.
- Service schedule review.
- Vehicle document verification.

The administrator must be able to create, modify, and assign inspection templates.

Drivers should complete assigned inspections using mobile-friendly forms.

Inspection outcomes:

- Pass
- Attention Required
- Fail
- Not Applicable

A failed inspection should support automatic creation of a fault report or corrective maintenance request.

Store the inspector, inspection date, findings, attachments, and completion status.

---

# 11. PREDICTIVE MAINTENANCE ENGINE

Implement an intelligent maintenance forecasting system.

The first implementation should use reliable, explainable calculations based on actual vehicle data.

Do not introduce artificial intelligence dependencies unless they are justified by sufficient data and existing infrastructure.

### Prediction inputs

Use:

- Current odometer.
- Previous odometer records.
- Historical distance travelled.
- Maintenance history.
- Component service intervals.
- Previous service dates.
- Average daily or monthly mileage.
- Repeated faults.
- Vehicle usage patterns.

### Mileage-based prediction

Calculate average daily mileage using valid, chronologically ordered odometer readings.

Estimated days until maintenance = Remaining mileage / Average daily mileage.

Predicted service date = Latest valid mileage reading date + Estimated days.

Use date-based schedules independently where applicable.

### Example

Current mileage: 88,000 km

Next oil service: 90,000 km

Average daily travel: 100 km

Remaining mileage: 2,000 km

Estimated service due: approximately 20 days after the latest mileage reading.

### Prediction requirements

- Clearly show estimated dates.
- Explain the calculation.
- Show remaining mileage.
- Show data freshness.
- Display insufficient-data states.
- Recalculate when new mileage or maintenance data arrives.
- Never overwrite actual maintenance dates with predictions.
- Do not label deterministic interval calculations as machine-learning predictions.

### Maintenance forecast dashboard

Show:

- Due today.
- Due within 7 days.
- Due within 30 days.
- Overdue.
- Mileage approaching threshold.
- Upcoming component replacements.
- Vehicles with recurring faults.
- Vehicles requiring immediate attention.

---

# 12. DRIVER ACCOUNT MANAGEMENT

The transport administrator must be able to create and manage driver accounts.

### Driver registration fields

- Full name.
- Employee ID.
- Email address.
- Phone number.
- Driver's licence number.
- Licence class.
- Licence expiry date.
- Assigned vehicle.
- Department or project.
- Employment status.
- Account status.

### Driver account creation

The administrator must be able to:

- Create driver login accounts.
- Assign drivers to vehicles.
- Change vehicle assignments.
- Update driver email addresses.
- Activate or deactivate accounts.
- Reset access credentials.
- View driver activity.
- Manage permissions.

Integrate with the application's existing user account system.

Do not create a separate authentication database unnecessarily.

Use secure password setup or invitation flows. Do not send plaintext passwords through email.

### Driver portal

After login, a driver should see a simplified dashboard containing:

- Assigned vehicle.
- Vehicle information.
- Upcoming maintenance.
- Vehicle document expiry alerts.
- Driver's licence expiry alerts.
- Submit fault.
- Complete inspection.
- View submitted requests.
- View request status.
- Record fuel purchase, where permitted.
- Update odometer, where permitted.
- Notification history.

Drivers must not have unrestricted access to other drivers' vehicles or administrative settings.

---

# 13. ROLE-BASED ACCESS CONTROL

Implement or extend existing role-based access control.

### Transport Administrator

Can:

- Manage vehicles.
- Manage drivers.
- Create driver accounts.
- Assign vehicles.
- Configure maintenance schedules.
- Review faults.
- Manage work orders.
- Manage notifications.
- Configure email recipients.
- Review procurement requests.
- Access reports and analytics.
- Manage transport settings.

### Driver

Can:

- View assigned vehicle information.
- Submit fault reports.
- Complete assigned inspections.
- View maintenance notifications.
- Track submitted requests.
- Update permitted mileage and fuel records.

### Procurement Officer

Can:

- View assigned procurement requests.
- Review required parts.
- Update procurement progress.
- Record purchases.
- Attach invoices and receipts.
- Record delivery of parts.
- Notify transport administrators when parts arrive.

### System Administrator

Can manage the overall application, users, roles, and global settings according to existing application permissions.

Enforce authorization on backend endpoints, not only by hiding frontend buttons.

---

# 14. PROCUREMENT MANAGEMENT AND APPROVAL WORKFLOW

Create a procurement workflow integrated with maintenance.

### Procurement request fields

- Request reference.
- Related vehicle.
- Related fault or maintenance work order.
- Requested parts.
- Quantity.
- Unit of measurement.
- Estimated unit cost.
- Estimated total cost.
- Priority.
- Requested by.
- Request date.
- Required date.
- Justification.
- Supporting attachments.

### Workflow

1. Driver reports fault.
2. Transport administrator reviews the fault.
3. Administrator identifies required parts.
4. Procurement request is created.
5. Approval is obtained where required.
6. Procurement receives notification.
7. Procurement processes the request.
8. Purchase details are recorded.
9. Parts are received.
10. Transport administrator is notified.
11. Maintenance work proceeds.
12. Final expenditure is recorded.

Do not automatically authorize purchases merely because a driver submits a fault.

### Procurement statuses

- Draft
- Pending Approval
- Approved
- Rejected
- Sent to Procurement
- Purchasing
- Partially Received
- Received
- Cancelled

Allow the administrator to configure approval permissions and notification recipients.

Prevent duplicate procurement requests caused by repeated submissions or retries.

---

# 15. EMAIL NOTIFICATION SYSTEM

Implement a complete automated email notification service.

Reuse the application's existing email infrastructure where possible.

### Events requiring notifications

- New driver account invitation.
- Driver account email changed.
- Vehicle assignment changed.
- New fault reported.
- Critical fault reported.
- Fault reviewed or approved.
- Maintenance scheduled.
- Maintenance approaching.
- Maintenance overdue.
- Required component replacement.
- DVLA expiry approaching.
- Insurance expiry approaching.
- Roadworthy expiry approaching.
- Driver's licence expiry approaching.
- Procurement request submitted.
- Procurement request approved.
- Procurement status updated.
- Parts received.
- Maintenance completed.

### Recipient routing

Notifications must be routed according to the event.

Examples:

**Driver submits a fault**

Send email to:

- Transport Administrator.
- Additional configured fault recipients.

**Procurement request approved**

Send email to:

- Procurement Officer or configured procurement mailbox.
- Additional configured procurement recipients.

**Vehicle maintenance approaching**

Send email to:

- Assigned Driver.
- Transport Administrator, if enabled.

**Vehicle document expiry approaching**

Send email to:

- Assigned Driver, if enabled.
- Transport Administrator.

### Email content

Emails should include:

- Company name.
- Notification subject.
- Vehicle registration.
- Relevant driver.
- Event type.
- Description.
- Due date or mileage.
- Priority.
- Reference number.
- Direct link to the relevant record.

Use clean, responsive HTML email templates.

Do not include sensitive authentication credentials.

---

# 16. ADMIN EMAIL SETTINGS AND NOTIFICATION CONFIGURATION

Add a complete Transport Notification Settings section to the administrator's interface.

### Driver email management

Allow the transport administrator to:

- View each driver's email.
- Add or update email addresses.
- Enable or disable email notifications per driver.
- View email verification or delivery status where supported.
- Save changes immediately through the backend.

### Administrative recipient settings

Allow administrators to configure:

- Primary transport administrator email.
- Additional transport recipient emails.
- Primary procurement email.
- Additional procurement recipient emails.
- Maintenance supervisor emails.
- Escalation recipient emails.

Use validated email address fields.

Support multiple recipients.

### Notification rules

Administrators must be able to configure:

- DVLA expiry alert thresholds.
- Insurance expiry alert thresholds.
- Roadworthy expiry alert thresholds.
- Driver's licence expiry thresholds.
- Maintenance mileage warning thresholds.
- Maintenance date warning thresholds.
- Critical fault escalation.
- Reminder frequency.
- Email enable/disable settings.
- In-app notification enable/disable settings.

### SMTP settings

Inspect the existing email configuration.

Where appropriate, provide secure administrator-only configuration for:

- SMTP host.
- SMTP port.
- Sender email.
- Sender name.
- TLS/SSL configuration.
- Authentication status.
- Test email functionality.

Do not expose SMTP credentials to the frontend or store secrets in plaintext.

Prefer the existing secure secrets-management approach.

### Notification reliability

Implement:

- Background processing.
- Scheduled alert evaluation.
- Retry handling.
- Delivery status tracking.
- Failure logging.
- Duplicate alert prevention.
- Notification history.
- Safe email template rendering.

A failed email must not cause a successfully submitted fault or maintenance request to disappear.

---

# 17. IN-APP NOTIFICATION CENTER

Add a notification bell to the header.

Features:

- Unread notification count.
- Notification dropdown.
- Notification details.
- Mark as read.
- Mark all as read.
- Filter by notification type.
- Notification history.
- Direct navigation to related records.

Notification categories:

- Maintenance.
- Faults.
- Documents.
- Procurement.
- Vehicle assignments.
- System alerts.

Use clear priority indicators.

Ensure notifications are scoped to authorized recipients.

---

# 18. TRANSPORT ADMIN DASHBOARD

Upgrade the existing dashboard rather than replacing its working functionality.

### Dashboard summary cards

Include:

- Total Vehicles.
- Active Vehicles.
- Vehicles Under Maintenance.
- Out-of-Service Vehicles.
- Total Drivers.
- Unassigned Vehicles.
- Open Fault Reports.
- Pending Maintenance.
- Overdue Maintenance.
- Expiring Documents.
- Pending Procurement Requests.
- Monthly Fuel Cost.
- Monthly Maintenance Cost.

### Dashboard charts

Include:

- Fuel expenditure by month.
- Maintenance expenditure by month.
- Preventive vs corrective maintenance.
- Vehicle availability.
- Maintenance status distribution.
- Fault trends.
- Procurement expenditure.
- Maintenance forecast.

### Action panels

Include:

- Vehicles requiring attention.
- Upcoming maintenance.
- Expiring DVLA documents.
- Open critical faults.
- Pending procurement approvals.
- Recent driver submissions.

All values must be calculated from actual backend data.

Cards should link to appropriately filtered module views.

---

# 19. REPORTS AND ANALYTICS

Extend the existing reporting system.

### Required reports

1. Vehicle Register.
2. Driver Assignment Report.
3. Fuel Consumption Report.
4. Fuel Expenditure Report.
5. Preventive Maintenance Report.
6. Corrective Maintenance Report.
7. Routine Inspection Report.
8. Maintenance Cost Report.
9. Vehicle Downtime Report.
10. Component Replacement History.
11. Vehicle Document Expiry Report.
12. Fault and Breakdown Report.
13. Procurement Report.
14. Maintenance Forecast Report.
15. Vehicle Operating Cost Report.

### Report filtering

Support:

- Date range.
- Vehicle.
- Driver.
- Department.
- Project.
- Maintenance type.
- Maintenance status.
- Vehicle status.

### Export options

Support:

- Excel.
- PDF.
- CSV where appropriate.

Reports should have professional EAC Electrical Solutions Limited headings.

Include relevant report generation dates, filters, and totals.

Ensure exported data matches filtered on-screen records.

---

# 20. MAINTENANCE HISTORY AND VEHICLE TIMELINE

Each vehicle must have a chronological activity timeline.

Display events such as:

- Vehicle registration.
- Driver assignment.
- Fuel purchases.
- Odometer updates.
- Fault reports.
- Inspections.
- Maintenance scheduling.
- Maintenance completion.
- Parts replacement.
- Procurement activity.
- Document renewal.

For every event, record:

- Event type.
- Date and time.
- Responsible user.
- Description.
- Related reference.
- Attachments where applicable.

Maintain a complete auditable history.

---

# 21. VEHICLE STATUS MANAGEMENT

Use clear vehicle operational statuses:

- Available.
- Assigned.
- Under Maintenance.
- Out of Service.
- Inactive.

Ensure operational status is not confused with maintenance work-order status.

A vehicle may have a maintenance record without necessarily being unavailable.

Critical safety defects must trigger a controlled out-of-service workflow.

Only authorized users should be able to release a vehicle following required verification.

---

# 22. ODOMETER RECORDING AND DATA INTEGRITY

Because odometer readings are optional, implement robust nullable mileage handling.

### Requirements

- Allow mileage to be blank on vehicle registration.
- Allow mileage to be blank on fuel entry.
- Allow mileage to be blank on fault reporting.
- Permit explicit odometer updates.
- Maintain mileage history.
- Record the date and user responsible for each reading.
- Prevent negative mileage.
- Detect readings lower than previously recorded mileage.
- Require authorized correction or documented odometer replacement when readings decrease.
- Avoid automatically overwriting newer mileage with older records.
- Handle mileage corrections without deleting audit history.

All mileage calculations must use valid readings.

Use kilometres as the default unit.

---

# 23. DATABASE DESIGN AND MIGRATION

Inspect the existing database entities and relationships before making changes.

Extend the schema as required to support:

- Vehicle images.
- Vehicle documents.
- Driver accounts and assignments.
- Odometer history.
- Fuel transactions.
- Fuel receipts.
- Vehicle components.
- Maintenance policies.
- Preventive schedules.
- Corrective maintenance work orders.
- Routine inspection templates.
- Inspection submissions.
- Fault reports.
- Procurement requests.
- Procurement request items.
- Notification preferences.
- Notification recipients.
- Notification delivery history.
- Vehicle activity history.

Use existing tables where appropriate rather than duplicating them.

### Database requirements

- Proper foreign keys.
- Appropriate indexes.
- Unique constraints.
- Nullable optional fields.
- Audit timestamps.
- Data integrity validation.
- Safe migrations.
- Transaction handling.
- Consistent deletion and archival rules.

Do not drop existing production tables or delete current records.

Provide migration scripts and a rollback strategy.

---

# 24. BACKEND DEVELOPMENT

Use the project's existing backend architecture.

If the current application uses Spring Boot, continue using its established structure and conventions.

Implement:

- REST API endpoints.
- Service-layer business logic.
- Request validation.
- DTO mapping.
- Role-based authorization.
- Secure file uploads.
- Scheduled background jobs.
- Notification services.
- Maintenance prediction services.
- Database migrations.
- Audit logging.
- Centralized exception handling.

Ensure that every frontend action is backed by a functioning API.

Avoid introducing duplicate controllers or conflicting routes.

Use transactions where workflows update multiple related records.

---

# 25. FRONTEND DEVELOPMENT

Use the existing frontend framework and project architecture.

If the project uses React, Vite, and Tailwind CSS, preserve that stack.

### UI requirements

- Modern enterprise styling.
- Clean dashboard cards.
- Consistent tables.
- Attractive forms.
- Responsive dialogs.
- Clear status indicators.
- Professional icons.
- Loading skeletons.
- Empty states.
- Error states.
- Toast notifications.
- Confirmation dialogs.
- Form validation.
- Accessible controls.
- Smooth but restrained animations.

Avoid excessive gradients, oversized elements, or unnecessary visual effects.

Use the existing File Management System as the design reference.

### Responsive requirements

On mobile:

- Sidebar becomes a drawer.
- Tables support appropriate scrolling or card layouts.
- Forms use mobile-friendly layouts.
- Buttons have adequate touch targets.
- Charts resize correctly.
- Driver fault reporting remains easy to use.
- Uploads work from phone storage or camera where supported.

Do not allow horizontal overflow across the entire page.

---

# 26. CUSTOM BACKGROUND IMAGE AND ANIMATED SYSTEM LOADING SCREEN

I will provide an image to Codex.

Use that exact image as the visual background of the transport system's initial loading experience.

### Image requirements

- Use the supplied image rather than an unrelated stock image.
- Preserve its aspect ratio.
- Display it beautifully across desktop, tablet, and mobile.
- Use appropriate cropping and positioning.
- Add a subtle overlay only where needed for readability.
- Do not distort the image.
- Optimize image loading and resolution.

### Loading animation

When the transport system is initially opened, display a professional branded loading screen.

The loading screen should include:

- Supplied background image.
- EAC Electrical Solutions Limited branding.
- Elegant animated spinner.
- Optional subtle progress animation.
- Text such as "Loading Transport Management System..."

### Animation behavior

1. User opens the transport system.
2. Background image appears.
3. Loading spinner animates.
4. Application initializes authentication, permissions, and required data.
5. When initialization completes, the loading screen smoothly transitions into the transport dashboard.

Do not display a fake loading screen for an unnecessary fixed duration.

If initialization fails, display a proper retry or error state.

### Important

Do not use the supplied image as a permanent background behind every dashboard page unless it suits the existing File Management design.

Its primary purpose is the initial branded loading experience.

Respect reduced-motion accessibility preferences.

---

# 27. ADMIN SETTINGS PAGE

Create a professional settings interface with organized tabs.

### Tabs

**General Settings**
- Transport module preferences.
- Company display information.
- Date and currency formatting.
- Default measurement units.

**Vehicle Settings**
- Vehicle categories.
- Vehicle statuses.
- Document types.
- Default service intervals.

**Maintenance Settings**
- Preventive maintenance thresholds.
- Mileage warning thresholds.
- Maintenance schedules.
- Component categories.
- Prediction parameters.

**Driver Settings**
- Driver account management.
- Vehicle assignment rules.
- Driver email settings.
- Driver notification permissions.

**Notification Settings**
- Notification recipients.
- Email event routing.
- Alert thresholds.
- Reminder frequency.
- Notification templates.

**Procurement Settings**
- Procurement recipients.
- Approval permissions.
- Request categories.
- Priority settings.

**System Logs**
- Notification delivery logs.
- Important user activities.
- Maintenance audit history.

Only authorized administrators may modify these settings.

---

# 28. SECURITY AND RELIABILITY

Implement production-grade security practices.

Requirements:

- Enforce role-based permissions on backend APIs.
- Validate all incoming requests.
- Protect uploaded files.
- Prevent unauthorized document access.
- Sanitize user-controlled content.
- Protect email configuration secrets.
- Use secure authentication.
- Prevent duplicate submissions.
- Apply appropriate rate limiting.
- Log important administrative changes.
- Handle API errors gracefully.
- Preserve data consistency.
- Avoid exposing sensitive information in logs.
- Use the existing application's CSRF and session/token security approach.

Do not introduce hardcoded administrative credentials.

---

# 29. TESTING REQUIREMENTS

Implement automated tests and verify the actual workflows.

### Required test scenarios

**Vehicle registration**
- Register with mileage.
- Register without mileage.
- Upload vehicle images.
- Edit vehicle information.
- Replace an image.
- Confirm existing records remain intact.

**DVLA expiry**
- Save an expiry date.
- Reload and confirm correct display.
- Test expiry warning thresholds.
- Renew a document.
- Confirm renewal history remains available.

**Fuel**
- Save with receipt.
- Save without receipt.
- Save without odometer.
- Verify fuel cost calculations.
- Test invalid quantities and costs.

**Maintenance**
- Create component maintenance intervals.
- Verify next service mileage.
- Trigger mileage alerts.
- Trigger date alerts.
- Complete maintenance.
- Verify next schedule.
- Verify historical records remain intact.

**Driver**
- Create account.
- Assign vehicle.
- Change driver email.
- Log in with driver permissions.
- Submit fault.
- Verify unauthorized vehicle access is blocked.

**Procurement**
- Generate request from fault.
- Approve request.
- Notify procurement.
- Update purchase status.
- Record received parts.
- Complete linked maintenance.

**Notifications**
- Send test email.
- Trigger expiry notification.
- Trigger maintenance warning.
- Trigger fault notification.
- Test invalid SMTP configuration.
- Verify failed messages are logged.
- Verify retries do not create duplicate emails.

**Responsive UI**
- Test desktop.
- Test tablet.
- Test mobile.
- Test sidebar.
- Test forms.
- Test image uploads.
- Test notification dropdown.
- Test loading screen.

---

# 30. IMPLEMENTATION ORDER

Implement the work in controlled phases.

### Phase 1 — Inspection and Bug Fixes

- Audit existing code.
- Identify dependencies.
- Fix DVLA expiry.
- Make odometer optional.
- Resolve existing vehicle form bugs.
- Confirm baseline functionality.

### Phase 2 — Vehicle and Fuel Enhancements

- Vehicle image upload.
- Vehicle profile improvements.
- Fuel management.
- Optional fuel receipts.
- Odometer history.

### Phase 3 — Maintenance System

- Component maintenance tracking.
- Preventive maintenance.
- Corrective maintenance.
- Routine inspections.
- Maintenance scheduling.
- Predictive maintenance calculations.

### Phase 4 — Driver and Procurement Workflows

- Driver account creation.
- Driver portal.
- Fault reporting.
- Work orders.
- Procurement requests.
- Approval and purchase workflow.

### Phase 5 — Notifications and Settings

- Administrator email settings.
- Driver email configuration.
- Automated expiry notifications.
- Maintenance alerts.
- Fault and procurement notifications.
- Notification center.
- Email logs and retries.

### Phase 6 — UI/UX and Analytics

- Professional sidebar.
- Modern header.
- Responsive redesign.
- Dashboard improvements.
- Reports and analytics.
- Branded loading screen using the supplied image.

### Phase 7 — Testing and Final Validation

- Automated tests.
- Integration testing.
- Permission testing.
- Database migration verification.
- Responsive testing.
- Production build verification.
- Regression testing.

---

# 31. FINAL ACCEPTANCE CRITERIA

The project is only complete when:

1. Existing vehicle management features continue working.
2. Odometer readings are optional everywhere specified.
3. Vehicle image upload works during registration and editing.
4. Fuel entries work with or without receipts.
5. DVLA expiry dates display and update correctly.
6. Vehicle documents trigger configurable expiry alerts.
7. Each vehicle component has independently tracked service intervals.
8. Maintenance predictions are calculated from valid data.
9. Preventive, corrective, and routine maintenance are operational.
10. Drivers can log in and view their assigned vehicles.
11. Drivers can submit fault reports.
12. Transport administrators receive configured notifications.
13. Procurement receives approved requests through configured recipients.
14. Driver email addresses can be updated from the admin interface.
15. Maintenance alerts are sent automatically when thresholds are reached.
16. Dashboard metrics reflect actual records.
17. Reports can be filtered and exported.
18. The sidebar and header match the existing File Management design.
19. The entire interface works properly on mobile devices.
20. The supplied image appears in the initial loading screen with an elegant spinner.
21. Existing database records remain intact.
22. All critical workflows have been tested.
23. There are no unresolved critical build errors or runtime failures.

---

# 32. FINAL INSTRUCTIONS TO CODEX

Do not simply generate a new frontend design.

Do not stop after creating database entities or API placeholders.

Do not implement static dashboards disconnected from backend data.

Do not replace existing working modules unnecessarily.

Do not remove or overwrite existing vehicle, driver, maintenance, or reporting data.

**Inspect the existing codebase first, then implement and integrate the requested changes into the actual working system.**

Before modifying code, provide a concise implementation plan identifying existing modules, dependencies, and likely migration requirements.

Then proceed through the implementation phases, validating each completed feature.

If an architectural decision cannot be determined from the codebase, explain the issue and select the safest compatible approach. Ask for clarification only when the decision could materially affect production data, security, or established business workflows.

At completion, provide:

- Summary of bugs fixed.
- Summary of features implemented.
- Files created or modified.
- Database migrations.
- New or updated API endpoints.
- New environment variables.
- Notification configuration instructions.
- Test results.
- Any remaining limitations.
- Deployment instructions.

The final system must be a complete, integrated, secure, professional, and mobile-responsive Vehicle and Transport Management System suitable for daily company operations.

**Company: EAC ELECTRICAL SOLUTIONS LIMITED**

**Design reference: Existing File Management System**

**Implementation target: Existing application and database**

**Primary objective: Fix current bugs and deliver a fully integrated transport management workflow.**