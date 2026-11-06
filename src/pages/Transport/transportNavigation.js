export function canSeeTransportPage(item, context) {
  if (!context) return false;
  if (context.admin) return true;
  const grants = context.grants || [];
  if (item.driver) return Boolean(context.driverId);
  if (item.grant) return grants.includes(item.grant);
  if (item.path === "/usersmanagement") return grants.includes("TRANSPORT_SETTINGS");
  if (item.path === "/transportReports") return grants.includes("TRANSPORT_REPORTS");
  if (item.path === "/transport/procurement") return Boolean(context.procurement || grants.some(g => ["TRANSPORT_MANAGE_MAINTENANCE", "TRANSPORT_APPROVE_PROCUREMENT"].includes(g)));
  if (item.path === "/drivers") return Boolean(context.driverId || grants.some(g => ["TRANSPORT_MANAGE_DRIVERS", "TRANSPORT_MANAGE_VEHICLES"].includes(g)));
  if (["/transport/notifications", "/adminDashboard"].includes(item.path)) return true;
  return Boolean(context.driverId || grants.some(g => ["TRANSPORT_VIEW", "TRANSPORT_MANAGE_VEHICLES", "TRANSPORT_MANAGE_FUEL", "TRANSPORT_MANAGE_MAINTENANCE", "TRANSPORT_REVIEW_FAULTS", "TRANSPORT_REPORTS"].includes(g)));
}
