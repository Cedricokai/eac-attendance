# Existing employee driver access

Drivers use their normal EAC username and password. Transport creates a driver profile and links an existing active employee account; it does not create a second login, reset passwords or replace the employee's main role.

1. As an administrator with Manage Drivers permission, open Transport → Drivers → Add driver.
2. Select the existing employee and their existing EAC account. A single active account is selected automatically. Enter licence details and save.
3. The active driver's account receives the Driver workspace page. Page & User Permissions shows this page under Transport. Additional transport management actions remain controlled through Transport Settings → Action permissions; linking a driver does not grant fleet-wide management.
4. Assign vehicles to the driver. The employee signs in normally and opens My driver workspace to work with their assigned vehicles, faults and inspections. Fuel entry remains subject to the existing driver-fuel setting.

If the employee has no active account, create or activate it in the main system first. Accounts belonging to another employee and duplicate links to another driver are rejected. Existing transport-created accounts are retained for normal EAC sign-in; no new setup invitation is required. Deactivating or archiving a driver changes their driver profile/assignments, not the EAC account's enabled state, password or role. Existing photo handling and history are retained.

Local verification: link an employee with an existing ordinary role, confirm their username/password/role and account count are unchanged, confirm the workspace page appears, then deactivate/archive the profile and verify normal EAC login remains enabled. Verify an unrelated employee account cannot be linked and a driver cannot manage other drivers without an explicit management permission.
