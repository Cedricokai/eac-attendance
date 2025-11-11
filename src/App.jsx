import { Routes, Route } from "react-router-dom";
import LoginPage from './pages/Auth/LoginPage';
import Home from './pages/Eac-attendance/home';
import Attendance from './pages/Eac-attendance/attendance/attendance';
import Employee from './pages/Eac-attendance/employee/employee';
import Overview from './pages/Eac-attendance/attendance/overview';
import Profile from './pages/Eac-attendance/employee/profile';
import Overtime from './pages/Eac-attendance/attendance/overtime';
import Leave from './pages/Eac-attendance/attendance/leave';
import Timesheet from './pages/Eac-attendance/attendance/timesheets';
import BiometricAttendanceFeed from './pages/Eac-attendance/attendance/BiometricAttendanceFeed';
import Payroll from './pages/Eac-attendance/attendance/payroll';
import Reports from './pages/Eac-attendance/attendance/reports';
import CentralizedDashboard from './pages/Central-Dashboard/centralizedDashboard';
import AttendanceDashboard from './pages/Eac-attendance/attendanceDashboard';
import MainSidebar from './pages/Eac-attendance/mainSidebar';
import InventoryDashboard from './pages/Eac-inventory/InventoryDashboard';
import Products from './pages/Eac-inventory/products';
import SignupPage from './pages/Auth/SignupPage';
import Userpage from './pages/Userpage';
import Received from './pages/Eac-inventory/received';
import Outgoing from './pages/Eac-inventory/outgoing';
import SettingsPage from "./pages/Eac-attendance/attendance/settingspage";
import Search from "./compnents/search";
import DailyAttendanceReport from "./pages/Eac-attendance/attendance/dailyAttendanceReport";
import LeaveRequestForm from "./pages/Eac-attendance/attendance/leaveRequestForm";
import SupervisorDashboard from "./pages/Eac-attendance/attendance/supervisorDashboard";
import PlannerDashboard from "./pages/Eac-attendance/attendance/plannerDashboard";
import HRDashboard from "./pages/Eac-attendance/attendance/HRDashboard";
import LeaveStatus from "./pages/Eac-attendance/attendance/leave-status";
import EmployeeDashboard from "./pages/Eac-attendance/attendance/employeeDashboard";
import Payslip from "./pages/Eac-attendance/attendance/payslip";
import InventoryRequest from "./pages/Eac-inventory/InventoryRequest";
import StorekeeperRequests from "./pages/Eac-inventory/storekeeperRequests";
import CostCenter from "./pages/Eac-inventory/costCenter";
import History from "./pages/Eac-inventory/history";
import PPES from "./pages/Eac-inventory/ppe";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Parent routes that likely contain nested navigation - add wildcard */}
      <Route path="/home/*" element={<Home />} />
      <Route path="/attendance/*" element={<Attendance />} />
      <Route path="/employee/*" element={<Employee />} />
      <Route path="/overview/*" element={<Overview />} />
      <Route path="/overtime/*" element={<Overtime />} />
      <Route path="/leave/*" element={<Leave />} />
      <Route path="/timesheets/*" element={<Timesheet />} />
      <Route path="/payroll/*" element={<Payroll />} />
      <Route path="/reports/*" element={<Reports />} />
      <Route path="/centralizedDashboard/*" element={<CentralizedDashboard />} />
      <Route path="/attendancedashboard/*" element={<AttendanceDashboard />} />
      <Route path="/InventoryDashboard/*" element={<InventoryDashboard />} />
      <Route path="/products/*" element={<Products />} />
      <Route path="/received/*" element={<Received />} />
      <Route path="/outgoing/*" element={<Outgoing />} />
      <Route path="/Userpage/*" element={<Userpage />} />
      <Route path="/settingspage/*" element={<SettingsPage />} />
      <Route path="/supervisorDashboard/*" element={<SupervisorDashboard />} />
      <Route path="/plannerDashboard/*" element={<PlannerDashboard />} />
      <Route path="/HRDashboard/*" element={<HRDashboard />} />
      <Route path="/employeeDashboard/*" element={<EmployeeDashboard />} />
      
      {/* Routes that don't need wildcards (simple pages without nested routes) */}
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/mainsidebar" element={<MainSidebar />} />
      <Route path="/biometricAttendanceFeed" element={<BiometricAttendanceFeed />} />
      <Route path="/search" element={<Search />} />
      <Route path="/leaveRequestForm" element={<LeaveRequestForm />} />
      <Route path="/leave-status" element={<LeaveStatus />} />
      <Route path="/dailyAttendanceReport" element={<DailyAttendanceReport />} />
      <Route path="/payslip" element={<Payslip />} />
      <Route path="/history" element={<History />} />
      <Route path="/InventoryRequest" element={<InventoryRequest />} /> 
      <Route path="/storeKeeperRequests" element={<StorekeeperRequests />} /> 
      <Route path="/costCenter" element={<CostCenter />} />
      <Route path="/ppe" element={<PPES />} />
    </Routes>
  );
}

export default App;