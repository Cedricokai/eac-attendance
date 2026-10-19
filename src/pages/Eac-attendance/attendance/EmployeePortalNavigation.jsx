import { Link, useLocation } from "react-router-dom";
import { Calendar, CalendarCheck, Clock, CreditCard, Home, Layers, Package, User } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const EmployeePortalNavigation = ({ employeeName, jobPosition }) => {
  const { settings } = useSettings();
  const location = useLocation();
  const isActive = (path) => location.pathname.toLowerCase() === path.toLowerCase();
  const itemClass = (active = false) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white/10 font-semibold text-white" : "font-medium text-slate-300 hover:bg-white/5 hover:text-white"}`;

  return (
    <aside className="fixed inset-y-4 left-4 z-30 hidden w-64 flex-col overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl shadow-slate-300/50 lg:flex">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-950/30"><User className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{employeeName || "Employee"}</p>
            <p className="truncate text-xs text-slate-400">{jobPosition || "Employee workspace"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
        <nav className="space-y-1">
          <Link to="/employeeDashboard" className={itemClass(isActive("/employeeDashboard"))}><Home className="h-4 w-4 text-blue-400" /> Overview</Link>
          <Link to="/employeeDashboard#applications-launcher" className={itemClass()}><Layers className="h-4 w-4" /> Applications</Link>
          <Link to="/employeeDashboard#recent-activity" className={itemClass()}><Clock className="h-4 w-4" /> Recent activity</Link>
        </nav>

        <p className="mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Quick actions</p>
        <nav className="space-y-1">
          <Link to="/leaveRequestForm" className={itemClass(isActive("/leaveRequestForm"))}><CalendarCheck className="h-4 w-4" /> Apply for leave</Link>
          <Link to="/InventoryRequest" className={itemClass(isActive("/InventoryRequest"))}><Package className="h-4 w-4" /> Request inventory</Link>
          <Link to="/employeeDashboard" className={itemClass()}><Calendar className="h-4 w-4" /> Leave balance</Link>
          <Link to="/employeeDashboard" className={itemClass()}><CreditCard className="h-4 w-4" /> View payslip</Link>
        </nav>
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <p className="truncate text-xs font-semibold text-slate-200">
            {settings.companyName || "EAC Employee Portal"}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Secure access based on your assigned role.</p>
        </div>
      </div>
    </aside>
  );
};

export default EmployeePortalNavigation;
