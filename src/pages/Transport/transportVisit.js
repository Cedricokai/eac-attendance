const legacyRoutes = new Set(["/admindashboard", "/vehicles", "/drivers", "/fuel", "/maintenance", "/usersmanagement", "/transportreports", "/sidebar"]);
export const isTransportPath = path => path.toLowerCase().startsWith("/transport/") || legacyRoutes.has(path.toLowerCase());

export function createTransportVisit() {
  let deadline = null;
  return {
    enter(now = Date.now()) { if (deadline === null) deadline = now + 3000; return Math.max(0, deadline - now); },
    leave() { deadline = null; },
  };
}
export const transportVisit = createTransportVisit();
