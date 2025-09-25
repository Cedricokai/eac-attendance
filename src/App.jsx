import { Routes, Route } from "react-router-dom";
import { SettingsProvider } from './pages/Eac-attendance/context/SettingsContext';
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
import DailyAttendanceReport from "./pages/Eac-attendance/attendance/dailyAttendanceReport"; // ✅ import added
import LeaveRequestForm from "./pages/Eac-attendance/attendance/leaveRequestForm";
import SupervisorDashboard from "./pages/Eac-attendance/attendance/supervisorDashboard";
import PlannerDashboard from "./pages/Eac-attendance/attendance/plannerDashboard";
import HRDashboard from "./pages/Eac-attendance/attendance/HRDashboard";
import LeaveStatus from "./pages/Eac-attendance/attendance/leave-status";
import EmployeeDashboard from "./pages/Eac-attendance/attendance/employeeDashboard";
import Payslip from "./pages/Eac-attendance/attendance/payslip";

function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/employee" element={<Employee />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/overtime" element={<Overtime />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/mainsidebar" element={<MainSidebar />} />
        <Route path="/timesheets" element={<Timesheet />} />
        <Route path="/biometricAttendanceFeed" element={<BiometricAttendanceFeed />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/attendancedashboard" element={<AttendanceDashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/centralizedDashboard" element={<CentralizedDashboard />} />
        <Route path="/InventoryDashboard" element={<InventoryDashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/received" element={<Received />} />
        <Route path="/outgoing" element={<Outgoing />} />
        <Route path="/Userpage" element={<Userpage />} />
        <Route path="/settingspage" element={<SettingsPage />} />
        <Route path="/search" element={<Search />} />
        <Route path="/leaveRequestForm" element={<LeaveRequestForm />} />
           <Route path="/supervisorDashboard" element={<SupervisorDashboard />} />
              <Route path="/plannerDashboard" element={<PlannerDashboard />} />
               <Route path="/HRDashboard" element={<HRDashboard />} />
                   <Route path="/leave-status" element={<LeaveStatus />} />
                                     <Route path="/employeeDashboard" element={<EmployeeDashboard />} />
        <Route path="/dailyAttendanceReport" element={<DailyAttendanceReport />} /> {/* ✅ fixed */}
        <Route path="/payslip" element={<Payslip />} />
      </Routes>
    </SettingsProvider>
  );
}

export default App;
