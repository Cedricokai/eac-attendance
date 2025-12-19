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
import History from "./pages/Eac-inventory/history";
import PPES from "./pages/Eac-inventory/ppe";
import JobsManagement from "./pages/Eac-attendance/attendance/JobsManagement";
import ProcurementManagerReview from "./pages/Eac-inventory/procurementManagerReview";
import ProductRequestForm from "./pages/Eac-inventory/ProductRequestForm";
import StoreOfficerApproval from "./pages/Eac-inventory/StoreOfficerApproval";
import CostCenterManagement from "./pages/Eac-inventory/CostCenterManagement";
import ReportsDashboard from "./pages/Eac-inventory/ReportsDashboard";
import GenerateInvoice from "./pages/Eac-attendance/attendance/GenerateInvoice";
import PlannerProductsReview from "./pages/Eac-inventory/plannerProductsReview";
import Report from "./pages/Eac-attendance/attendance/reports";
import AdminDashboard from "./pages/Transport/admindashboard";
import Sidebar from "./pages/Transport/Sidebar";
import Drivers from "./pages/Transport/drivers";
import Fuel from "./pages/Transport/fuel";
import Maintenance from "./pages/Transport/maintenance";
import UsersManagement from "./pages/Transport/usersmanagement";
import Vehicles from "./pages/Transport/vehicles";
import TransportReports from "./pages/Transport/transportReports";
import EndpointPermissionManagement from "./pages/EndpointPermissionManagement";

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
            <Route path="/plannerProductsReview/*" element={<PlannerProductsReview />} />
      
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
      <Route path="/ppe" element={<PPES />} />
      <Route path="/JobsManagement" element={<JobsManagement />} />
         {/* Employee Product Request */}
        <Route path="/product-request-form" element={<ProductRequestForm />} />
           <Route path="/generateInvoice" element={<GenerateInvoice />} />
                    <Route path="/procurementManagerReview" element={<ProcurementManagerReview />} />
                        <Route path="/reports" element={<Report />} />
        
        {/* Procurement Manager Review */}
        
        {/* Store Officer Approval & Issuance */}
        <Route path="/StoreOfficerApproval" element={<StoreOfficerApproval />} />
        
        {/* Cost Center Management */}
        <Route path="/CostCenterManagement" element={<CostCenterManagement />} />
        
        {/* Reports Dashboard */}
        <Route path="/inventory-reports" element={<ReportsDashboard />} />
      <Route path="/ProcurementManagerReview" element={<ProcurementManagerReview />} />
      <Route path="/admindashboard" element={<AdminDashboard />} />
        <Route path="/Sidebar" element={<Sidebar />} />
        <Route path="/drivers" element={<Drivers />} />
         <Route path="/fuel" element={<Fuel />} />
          <Route path="/home" element={<Home />} />
           <Route path="/maintenance" element={<Maintenance />} />
             <Route path="/protectedroute" element={<Drivers />} />
              <Route path="/usersmanagement" element={<UsersManagement />} />
               <Route path="/vehicles" element={<Vehicles />} />
               <Route path="/transportReports" element={<TransportReports />} />
<Route path="/endpointPermissionManagement" element={<EndpointPermissionManagement />} />
    </Routes>
  );
}

export default App;