import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, 
  ChevronUp, 
  Users, 
  User, 
  CalendarCheck, 
  ClipboardList, 
  BarChart,
  Home,
  Settings,
  FileText,
  DollarSign,
  Briefcase,
  Clock,
  Plus,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Shield,
  AlertCircle,
  Building,
  Wrench,
  Layers,
  BookOpen,
  CreditCard,
  FolderOpen,
  Database,
  Upload,
  UserCog,
  ListChecks,
  Calendar,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  Key,
  UserPlus,
  UserMinus,
  Archive,
  ArchiveX,
  Funnel,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  Users as UsersIcon,
  FileCheck,
  Cog,
  Phone,
  Mail,
  Lock,
  Home as HomeIcon,
  UserCircle
} from "lucide-react";

function MainSidebar({ isCollapsed = false }) {
  const location = useLocation();
  const [accessiblePages, setAccessiblePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [openDropdowns, setOpenDropdowns] = useState({
    employees: false,
    attendance: false,
    payroll: false,
    departments: false,
    inventory: false,
    procurement: false,
    transport: false,
    hr: false,
    admin: false
  });

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }
    if (hostname === "100.114.178.13") {
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Update dropdown states when location changes
  useEffect(() => {
    setOpenDropdowns({
      employees: location.pathname.startsWith("/employee") || location.pathname === "/employee",
      attendance: location.pathname.startsWith("/attendance") || location.pathname === "/attendance" || location.pathname === "/timesheets" || location.pathname === "/overtime" || location.pathname === "/overview",
      payroll: location.pathname.startsWith("/payroll") || location.pathname === "/payroll" || location.pathname === "/payslip",
      departments: location.pathname.startsWith("/departments"),
      inventory: location.pathname.startsWith("/inventory") || location.pathname === "/inventoryRequest" || location.pathname === "/inventoryRequestStatus",
      procurement: location.pathname.startsWith("/procurement"),
      transport: location.pathname.startsWith("/transport"),
      hr: location.pathname.startsWith("/hr") || location.pathname === "/leave" || location.pathname === "/leaveRequestForm",
      admin: location.pathname.startsWith("/userpage") || location.pathname === "/pagePermissionManagement" || location.pathname === "/centralizedDashboard" || location.pathname === "/settingspage"
    });
  }, [location.pathname]);

  const toggleDropdown = (dropdown) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  // Fetch current user and accessible pages
  const fetchCurrentUserAndPages = async () => {
    try {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch current user info
      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const role = userData.roles?.[0] || userData.role || "ROLE_CUSTOMER";
        setUserRole(role.replace("ROLE_", "").toLowerCase());
        setUserName(userData.username || userData.email);
      }

      // Fetch accessible pages
      const pagesResponse = await fetch(`${API_BASE_URL}/api/pages/my-pages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (pagesResponse.ok) {
        const pages = await pagesResponse.json();
        
        // Filter out unwanted pages (login, signin, etc.)
        const filteredPages = pages.filter(page => 
          !page.path.includes("/login") &&
          !page.path.includes("/signin") &&
          !page.path.includes("/signup") &&
          !page.path.includes("/register") &&
          page.name &&
          !page.name.toLowerCase().includes("signin") &&
          !page.name.toLowerCase().includes("signup") &&
          !page.name.toLowerCase().includes("login")
        );
        
        setAccessiblePages(filteredPages);
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUserAndPages();
  }, []);

  // Helper function to check if user has access to a specific page path
  const hasPageAccess = (path) => {
    // Admin role sees everything
    if (userRole === "admin") return true;
    
    return accessiblePages.some(page => page.path === path);
  };

  // Helper function to check if user has access to any page in a module
  const hasModuleAccess = (moduleName) => {
    if (userRole === "admin") return true;
    
    return accessiblePages.some(page => page.module === moduleName);
  };

  // Helper function to get pages by module
  const getPagesByModule = (moduleName) => {
    return accessiblePages.filter(page => page.module === moduleName);
  };

  // Get icon component based on icon name or path
  const getIconForPage = (page) => {
    const path = page.path;
    const name = page.name?.toLowerCase() || "";
    
    if (path === "/attendance" || name.includes("attendance")) return <ClipboardList size={16} />;
    if (path === "/timesheets" || name.includes("timesheet")) return <Clock size={16} />;
    if (path === "/overtime" || name.includes("overtime")) return <Clock size={16} />;
    if (path === "/overview" || name.includes("overview")) return <BarChart size={16} />;
    if (path === "/employee" || path === "/employees" || name.includes("employee")) return <User size={16} />;
    if (path === "/payroll" || name.includes("payroll")) return <FileText size={16} />;
    if (path === "/payslip" || name.includes("payslip")) return <FileText size={16} />;
    if (path === "/inventoryRequest" || name.includes("inventory")) return <Package size={16} />;
    if (path === "/leave" || path === "/leaveRequestForm" || name.includes("leave")) return <Calendar size={16} />;
    if (path === "/userpage" || name.includes("user")) return <UserCog size={16} />;
    if (path === "/pagePermissionManagement" || name.includes("permission")) return <Shield size={16} />;
    if (path === "/settingspage" || name.includes("setting")) return <Settings size={16} />;
    if (path === "/centralizedDashboard" || path === "/attendanceDashboard" || name.includes("dashboard")) return <Home size={16} />;
    if (path === "/loanManagementDashboard" || name.includes("loan")) return <DollarSign size={16} />;
    
    return <FileText size={16} />;
  };

  // Define menu structure based on accessible pages
  const getMenuStructure = () => {
    const menuItems = [];
    
    // Dashboard - always show if accessible
    if (hasPageAccess("/attendanceDashboard") || hasPageAccess("/centralizedDashboard") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: userRole === "admin" ? "/centralizedDashboard" : "/attendanceDashboard",
        icon: <Home size={18} />,
        label: "Dashboard"
      });
    }
    
    // Employees Section
    if (hasModuleAccess("HR") || hasPageAccess("/employee") || userRole === "admin") {
      const employeePages = getPagesByModule("HR").filter(p => p.path === "/employee" || p.name?.toLowerCase().includes("employee"));
      menuItems.push({
        type: "dropdown",
        id: "employees",
        icon: <Users size={18} />,
        label: "Employees",
        items: employeePages.length > 0 ? employeePages.map(page => ({
          to: page.path,
          icon: getIconForPage(page),
          label: page.name
        })) : [
          { to: "/employee", icon: <User size={16} />, label: "Employee List" }
        ]
      });
    }
    
    // Attendance Section
    if (hasModuleAccess("ATTENDANCE") || hasPageAccess("/attendance") || hasPageAccess("/timesheets") || hasPageAccess("/overtime") || userRole === "admin") {
      const attendancePages = getPagesByModule("ATTENDANCE");
      menuItems.push({
        type: "dropdown",
        id: "attendance",
        icon: <CalendarCheck size={18} />,
        label: "Attendance",
        items: attendancePages.length > 0 ? attendancePages.map(page => ({
          to: page.path,
          icon: getIconForPage(page),
          label: page.name
        })) : [
          { to: "/attendance", icon: <ClipboardList size={16} />, label: "Daily Log" },
          { to: "/timesheets", icon: <Clock size={16} />, label: "Timesheets" },
          { to: "/overtime", icon: <Clock size={16} />, label: "Overtime" }
        ]
      });
    }
    
    // Leave Section
    if (hasModuleAccess("LEAVE") || hasPageAccess("/leave") || hasPageAccess("/leaveRequestForm") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: "/leave",
        icon: <Calendar size={18} />,
        label: "Leave Management"
      });
    }


    
    // Payroll Section
    if (hasModuleAccess("PAYROLL") || hasPageAccess("/payroll") || hasPageAccess("/payslip") || userRole === "admin") {
      const payrollPages = getPagesByModule("PAYROLL");
      menuItems.push({
        type: "dropdown",
        id: "payroll",
        icon: <DollarSign size={18} />,
        label: "Payroll",
        items: payrollPages.length > 0 ? payrollPages.map(page => ({
          to: page.path,
          icon: getIconForPage(page),
          label: page.name
        })) : [
          { to: "/payroll", icon: <FileText size={16} />, label: "Payroll Processing" },
          { to: "/payslip", icon: <FileText size={16} />, label: "Payslip Generator" }
        ]
      });
    }
    
    // Inventory Section
    if (hasModuleAccess("INVENTORY") || hasPageAccess("/InventoryDashboard") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: "/InventoryDashboard",
        icon: <Package size={18} />,
        label: "Inventory"
      });
    }
    
    // Loan Management
    if (hasPageAccess("/loanManagementDashboard") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: "/loanManagementDashboard",
        icon: <DollarSign size={18} />,
        label: "Loan Management"
      });
    }
    
    // Admin Section - only for admin users
    if (userRole === "admin") {
      menuItems.push({
        type: "dropdown",
        id: "admin",
        icon: <Shield size={18} />,
        label: "Administration",
        items: [
          { to: "/userpage", icon: <UserCog size={16} />, label: "User Management" },
          { to: "/pagePermissionManagement", icon: <Shield size={16} />, label: "Page Permissions" },
          { to: "/settingspage", icon: <Settings size={16} />, label: "Settings" }
        ]
      });
    }

    if (hasModuleAccess("Transport") || hasPageAccess("/adminDashboard") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: "/adminDashboard",
        icon: <Calendar size={18} />,
        label: "Transport Management"
      });
    }

    if (hasModuleAccess("Attendance Settings") || hasPageAccess("/settingspage") || userRole === "admin") {
      menuItems.push({
        type: "link",
        to: "/settingspage",
        icon: <Calendar size={18} />,
        label: "System Settings"
      });
    }
    
    return menuItems;
  };

  const menuItems = getMenuStructure();

  // Loading state
  if (loading) {
    return (
      <aside className={`fixed h-full ${isCollapsed ? 'w-16' : 'w-64'} bg-gray-800 text-gray-100 p-2 flex flex-col z-10 transition-all duration-300`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </aside>
    );
  }

  // If sidebar is collapsed, show only icons
  if (isCollapsed) {
    return (
      <aside className="fixed h-full w-16 bg-gray-800 text-gray-100 p-2 flex flex-col z-10">
        {/* Logo/Header */}
        <div className="mb-6 mt-4 flex justify-center">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
        </div>

        <div className="border-t border-gray-700 mb-4"></div>

        {/* Main Navigation - Icons Only */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item, index) => {
            if (item.type === "link") {
              return (
                <Link 
                  key={index}
                  to={item.to}
                  className={`flex items-center justify-center p-3 rounded-lg transition-colors ${location.pathname === item.to ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
                  title={item.label}
                >
                  {item.icon}
                </Link>
              );
            } else if (item.type === "dropdown") {
              const hasActiveChild = item.items.some(subItem => location.pathname === subItem.to);
              return (
                <div key={index} className="relative">
                  <button
                    onClick={() => toggleDropdown(item.id)}
                    className={`flex items-center justify-center w-full p-3 rounded-lg transition-colors ${hasActiveChild ? "bg-gray-700" : "hover:bg-gray-700"}`}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                </div>
              );
            }
            return null;
          })}
        </nav>

        {/* Footer/User Info */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center" title={userName || "User"}>
              <User size={16} />
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Full sidebar view
  return (
    <aside className="fixed h-full w-64 bg-gray-800 text-gray-100 p-4 flex flex-col z-10">
      {/* Logo/Header */}
      <div className="mb-8 mt-4 px-2">
        <h1 className="text-xl font-bold text-white">EAC Electrical</h1>
        <p className="text-xs text-gray-400">Employee Management</p>
      </div>

      <div className="border-t border-gray-700 mb-4"></div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          if (item.type === "link") {
            return (
              <Link 
                key={index}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.to ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          } else if (item.type === "dropdown") {
            const isOpen = openDropdowns[item.id];
            const hasActiveChild = item.items.some(subItem => location.pathname === subItem.to);
            
            return (
              <div key={index}>
                <button
                  onClick={() => toggleDropdown(item.id)}
                  className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-colors ${hasActiveChild ? "bg-gray-700" : "hover:bg-gray-700"}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {item.label}
                  </div>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.items.map((subItem, subIndex) => (
                      <Link 
                        key={subIndex}
                        to={subItem.to}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${location.pathname === subItem.to ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
                      >
                        {subItem.icon}
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </nav>

      {/* Footer/User Info */}
      <div className="border-t border-gray-700 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <User size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName || "User"}</p>
            <p className="text-xs text-gray-400 truncate">{userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : "Employee"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default MainSidebar;