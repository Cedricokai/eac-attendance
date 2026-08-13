// components/Breadcrumbs.jsx
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, LayoutDashboard, Users, Calendar, Clock, FileText, Settings, Package, Truck, CreditCard } from "lucide-react";

// Complete breadcrumb mapping for ALL your pages
const breadcrumbMap = {
  // Dashboard Routes
  "/centralizedDashboard": { label: "Centralized Dashboard", icon: LayoutDashboard, isRoot: true },
  "/employeeDashboard": { label: "Employee Dashboard", icon: LayoutDashboard, isRoot: true },
  "/HRDashboard": { label: "HR Dashboard", icon: Users },
  "/plannerDashboard": { label: "Planner Dashboard", icon: Package },
  "/supervisorDashboard": { label: "Supervisor Dashboard", icon: Users },
  "/InventoryDashboard": { label: "Inventory Dashboard", icon: Package },
  "/admindashboard": { label: "Admin Dashboard", icon: LayoutDashboard },
  "/attendancedashboard": { label: "Attendance Dashboard", icon: Calendar },
  
  // Attendance & HR Routes
  "/attendance": { label: "Attendance Management", icon: Calendar },
  "/overview": { label: "Overview", icon: LayoutDashboard },
  "/employee": { label: "Employees", icon: Users },
  "/reports": { label: "Reports", icon: FileText },
  "/timesheets": { label: "Timesheets", icon: Clock },
  "/overtime": { label: "Overtime", icon: Clock },
  "/leave": { label: "Leave Management", icon: Calendar },
  "/leave-status": { label: "Leave Status", icon: Calendar },
  "/leaveRequestForm": { label: "Leave Request", icon: Calendar },
  "/payroll": { label: "Payroll", icon: CreditCard },
  "/payslip": { label: "Payslip", icon: FileText },
  "/PayslipCard": { label: "Payslip Card", icon: FileText },
  "/JobsManagement": { label: "Jobs Management", icon: Settings },
  "/generateInvoice": { label: "Generate Invoice", icon: FileText },
  "/dailyAttendanceReport": { label: "Daily Attendance Report", icon: Calendar },
  "/biometricAttendanceFeed": { label: "Biometric Feed", icon: Clock },
  "/LeaveBalanceTracker": { label: "Leave Balance Tracker", icon: Calendar },
  "/adminLeaveBalanceView": { label: "Admin Leave Balance", icon: Users },
  "/loanManagementDashboard": { label: "Loan Management", icon: CreditCard },
  "/employeeOvertimeRequest": { label: "Overtime Request", icon: Clock },
  "/attendanceRequests": { label: "Attendance Requests", icon: Calendar },
  "/attendanceRequestReview": { label: "Verify Attendance Requests", icon: Calendar },
  "/employeeLoanRequest": { label: "Loan Request", icon: CreditCard },
  "/excel-comparator": { label: "Excel Comparator", icon: FileText },
  "/quotationMaster": { label: "Quotation Master", icon: FileText },
  "/CostCenterManagement": { label: "Cost Center Management", icon: Settings },
  
  // Employee Profile (dynamic)
  "/profile": { label: "Employee Profile", icon: Users },
  
  // Settings & Admin
  "/settingspage": { label: "Settings", icon: Settings },
  "/Userpage": { label: "Users Management", icon: Users },
  "/pagePermissionManagement": { label: "Page Permissions", icon: Settings },
  "/usersmanagement": { label: "Transport Users", icon: Users },
  
  // Inventory Routes
  "/InventoryRequest": { label: "Inventory Request", icon: Package },
  "/products": { label: "Products", icon: Package },
  "/received": { label: "Received Items", icon: Package },
  "/outgoing": { label: "Outgoing Items", icon: Package },
  "/history": { label: "Transaction History", icon: FileText },
  "/ppe": { label: "PPE Management", icon: Package },
  "/ReportsDashboard": { label: "Inventory Reports", icon: FileText },
  "/procurementPurchases": { label: "Procurement Purchases", icon: Package },
  "/procurementManagerReview": { label: "Procurement Review", icon: Users },
  "/plannerProductsReview": { label: "Planner Products Review", icon: Package },
  "/storeKeeperRequests": { label: "Storekeeper Requests", icon: Package },
  "/product-request-form": { label: "Product Request", icon: Package },
  "/StoreOfficerApproval": { label: "Store Officer Approval", icon: Users },
  
  // Transport Routes
  "/drivers": { label: "Drivers Management", icon: Users },
  "/fuel": { label: "Fuel Management", icon: Truck },
  "/maintenance": { label: "Maintenance", icon: Settings },
  "/vehicles": { label: "Vehicles", icon: Truck },
  "/transportReports": { label: "Transport Reports", icon: FileText },
  
  // Search
  "/search": { label: "Search Results", icon: FileText },
};

function prettifySegment(seg) {
  return decodeURIComponent(seg)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  
  // Get user role from localStorage
  const getUserRole = () => {
    try {
      const userData = localStorage.getItem("userData");
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed?.role?.replace("ROLE_", "").toLowerCase() || "employee";
      }
      const userRole = localStorage.getItem("userRole");
      if (userRole) {
        return userRole.replace("ROLE_", "").toLowerCase();
      }
    } catch (e) {
      console.error("Error getting user role:", e);
    }
    return "employee";
  };
  
  const userRole = getUserRole();
  const isAdmin = userRole === "admin";
  
  // Determine root based on user role
  const rootPath = isAdmin ? "/centralizedDashboard" : "/employeeDashboard";
  const rootLabel = isAdmin ? "Centralized Dashboard" : "Employee Dashboard";
  
  // Build breadcrumb segments from current path
  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";
  
  const crumbs = [];
  
  // Always start with the root dashboard based on role
  crumbs.push({ 
    to: rootPath, 
    label: rootLabel, 
    isLast: false,
    icon: breadcrumbMap[rootPath]?.icon || LayoutDashboard,
    isRoot: true
  });
  
  // Build path crumbs (skip if it's just the root)
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += `/${seg}`;
    const isLast = i === segments.length - 1;
    
    // Skip if this is the root path (already added)
    if (currentPath === rootPath) continue;
    
    // Check if this is a dynamic ID route (numeric)
    const isId = /^[0-9]+$/.test(seg);
    
    // Special handling for profile routes
    let label;
    let Icon = null;
    
    if (currentPath.includes("/profile/") && isId) {
      label = `Employee #${seg}`;
    } 
    // Use mapped label or prettified segment
    else {
      const mapped = breadcrumbMap[currentPath];
      label = mapped?.label || prettifySegment(seg);
      Icon = mapped?.icon;
    }
    
    crumbs.push({ 
      to: currentPath, 
      label, 
      isLast,
      icon: Icon
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, idx) => (
          <li key={crumb.to} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight size={14} className="text-gray-400" />}
            
            {crumb.isLast ? (
              <div className="flex items-center gap-2">
                {crumb.icon && <crumb.icon size={16} className="text-gray-500" />}
                <span className="text-gray-900 font-semibold" aria-current="page">
                  {crumb.label}
                </span>
              </div>
            ) : (
              <Link 
                to={crumb.to} 
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {crumb.icon && <crumb.icon size={14} className="text-gray-400" />}
                <span>{crumb.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
