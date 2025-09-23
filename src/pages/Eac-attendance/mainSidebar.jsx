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
  Plus
} from "lucide-react";

function MainSidebar() {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState({
    employees: false,
    attendance: false,
    payroll: false,
    departments: false
  });

  // Update dropdown states when location changes
  useEffect(() => {
    setOpenDropdowns({
      employees: location.pathname.startsWith("/employees"),
      attendance: location.pathname.startsWith("/attendance"),
      payroll: location.pathname.startsWith("/payroll"),
      departments: location.pathname.startsWith("/departments")
    });
  }, [location.pathname]);

  const toggleDropdown = (dropdown) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdown]: !prev[dropdown]
    }));
  };

  // Improved active link detection
  const isActive = (path) => location.pathname === path;
  const isActiveParent = (paths) => paths.some(path => location.pathname.startsWith(path));

  return (
    <aside className="fixed h-full w-64 bg-gray-800 text-gray-100 p-4 flex flex-col z-10">
      {/* Logo/Header */}
      <div className="mb-8 mt-4 px-2">
        <h1 className="text-xl font-bold text-white">EAC Electrical</h1>
        <p className="text-xs text-gray-400">Employee Management</p>
      </div>

      <div className="border-t border-gray-700 mb-4"></div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1">
        {/* Dashboard */}
        <Link 
          to="/attendanceDashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/attendanceDashboard") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
        >
          <Home size={18} />
          Dashboard
        </Link>

        {/* Employees Section */}
        <div>
          <button
            onClick={() => toggleDropdown("employees")}
            className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-colors ${isActiveParent(["/employees", "/employee"]) ? "bg-gray-700" : "hover:bg-gray-700"}`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              Employees
            </div>
            {openDropdowns.employees ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openDropdowns.employees && (
            <div className="ml-8 mt-1 space-y-1">
              <Link 
                to="/employee"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/employee") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <User size={16} />
                Employee List
              </Link>
              <Link 
                to="/employees/add"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/employees/add") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <Plus size={16} />
                Add Employee
              </Link>
            </div>
          )}
        </div>

        {/* Attendance Section */}
        <div>
          <button
            onClick={() => toggleDropdown("attendance")}
            className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-colors ${isActiveParent(["/attendance"]) ? "bg-gray-700" : "hover:bg-gray-700"}`}
          >
            <div className="flex items-center gap-3">
              <CalendarCheck size={18} />
              Attendance
            </div>
            {openDropdowns.attendance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openDropdowns.attendance && (
            <div className="ml-8 mt-1 space-y-1">
              <Link 
                to="/attendance"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/attendance") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <ClipboardList size={16} />
                Daily Log
              </Link>
              <Link 
                to="/overview"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/overview") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <BarChart size={16} />
                Overview
              </Link>
              <Link 
                to="/timesheets"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/timesheets") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <Clock size={16} />
                Timesheets
              </Link>
            </div>
          )}
        </div>

        {/* Payroll Section */}
        <div>
          <button
            onClick={() => toggleDropdown("payroll")}
            className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-colors ${isActiveParent(["/payroll"]) ? "bg-gray-700" : "hover:bg-gray-700"}`}
          >
            <div className="flex items-center gap-3">
              <DollarSign size={18} />
              Payroll
            </div>
            {openDropdowns.payroll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openDropdowns.payroll && (
            <div className="ml-8 mt-1 space-y-1">
              <Link 
                to="/payroll"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/payroll") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <FileText size={16} />
                Payroll Processing
              </Link>
              <Link 
                to="/reports"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${isActive("/reports") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
              >
                <BarChart size={16} />
                Reports
              </Link>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link 
          to="/settingspage"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive("/settingspage") ? "bg-blue-600 text-white" : "hover:bg-gray-700"}`}
        >
          <Settings size={18} />
          Settings
        </Link>
      </nav>

      {/* Footer/User Info */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
            <User size={16} />
          </div>
          <div>
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default MainSidebar;