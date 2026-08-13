// src/App.jsx
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import ForgotPasswordPage from "./pages/Auth/forgot-password";
import ResetPasswordPage from "./pages/Auth/reset-password";
import MustChangePasswordPage from "./pages/Auth/MustChangePasswordPage";

// Attendance & HR Pages
import EmployeeDashboard from "./pages/Eac-attendance/attendance/employeeDashboard";
import SupervisorDashboard from "./pages/Eac-attendance/attendance/supervisorDashboard";
import PlannerDashboard from "./pages/Eac-attendance/attendance/plannerDashboard";
import HRDashboard from "./pages/Eac-attendance/attendance/HRDashboard";
import AttendanceDashboard from './pages/Eac-attendance/attendanceDashboard';
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
import SettingsPage from "./pages/Eac-attendance/attendance/settingspage";
import DailyAttendanceReport from "./pages/Eac-attendance/attendance/dailyAttendanceReport";
import LeaveRequestForm from "./pages/Eac-attendance/attendance/leaveRequestForm";
import LeaveStatus from "./pages/Eac-attendance/attendance/leave-status";
import Payslip from "./pages/Eac-attendance/attendance/payslip";
import PayslipCard from "./pages/Eac-attendance/attendance/PayslipCard";
import JobsManagement from "./pages/Eac-attendance/attendance/JobsManagement";
import JobDetailView from "./pages/Eac-attendance/attendance/JobDetailView"; // ADD THIS IMPORT
import GenerateInvoice from "./pages/Eac-attendance/attendance/GenerateInvoice";
import LeaveBalanceTracker from "./pages/Eac-attendance/attendance/LeaveBalanceTracker";
import QuotationMaster from "./pages/Eac-attendance/attendance/quotationMaster";
import EmployeeOvertimeRequest from "./pages/Eac-attendance/attendance/employeeOvertimeRequest";
import AttendanceRequests from "./pages/Eac-attendance/attendance/attendanceRequests";
import AttendanceRequestReview from "./pages/Eac-attendance/attendance/attendanceRequestReview";
import EmployeeLoanRequest from "./pages/Eac-attendance/attendance/employeeLoanRequest";
import LoanManagementDashboard from "./pages/Eac-attendance/attendance/loanManagementDashboard";
import ExcelComparator from "./pages/Eac-attendance/attendance/excel-comparator";
import AdminLeaveBalanceView from "./pages/Eac-attendance/attendance/AdminLeaveBalanceView";

// Inventory Pages
import InventoryDashboard from './pages/Eac-inventory/InventoryDashboard';
import Products from './pages/Eac-inventory/products';
import Received from './pages/Eac-inventory/received';
import Outgoing from './pages/Eac-inventory/outgoing';
import InventoryRequest from "./pages/Eac-inventory/InventoryRequest";
import StorekeeperRequests from "./pages/Eac-inventory/storekeeperRequests";
import History from "./pages/Eac-inventory/history";
import PPES from "./pages/Eac-inventory/ppe";
import ProcurementManagerReview from "./pages/Eac-inventory/procurementManagerReview";
import ProductRequestForm from "./pages/Eac-inventory/ProductRequestForm";
import StoreOfficerApproval from "./pages/Eac-inventory/StoreOfficerApproval";
import CostCenterManagement from "./pages/Eac-inventory/CostCenterManagement";
import ReportsDashboard from "./pages/Eac-inventory/ReportsDashboard";
import PlannerProductsReview from "./pages/Eac-inventory/plannerProductsReview";
import ProcurementPurchases from "./pages/Eac-inventory/procurementPurchases";

// Transport Pages
import AdminDashboard from "./pages/Transport/admindashboard";
import Drivers from "./pages/Transport/drivers";
import Fuel from "./pages/Transport/fuel";
import Maintenance from "./pages/Transport/maintenance";
import UsersManagement from "./pages/Transport/usersmanagement";
import Vehicles from "./pages/Transport/vehicles";
import TransportReports from "./pages/Transport/transportReports";

// Other Pages
import CentralizedDashboard from './pages/Central-Dashboard/centralizedDashboard';
import Home from './pages/Eac-attendance/home';
import Userpage from './pages/Userpage';
import PagePermissionManagement from "./pages/pagePermissionManagement";
import Search from "./components/search";
import MainSidebar from './pages/Eac-attendance/mainSidebar';
import Sidebar from "./pages/Transport/Sidebar";
import LeaveDetailsModal from "./pages/Eac-attendance/attendance/leaveDetailsModal";
import QuickApprove from "./pages/Eac-attendance/attendance/QuickApprove";
import QuickReject from "./pages/Eac-attendance/attendance/QuickReject";
import PayrollReports from "./pages/Eac-attendance/attendance/PayrollReports.jsx";
import ActivityLogs from "./pages/Eac-attendance/attendance/ActivityLogs.jsx";
import HospitalPublicForm from "./pages/Eac-attendance/hospital/HospitalPublicForm.jsx";
import HospitalManagement from "./pages/Eac-attendance/hospital/HospitalManagement.jsx";
import MedicalVisitReview from "./pages/Eac-attendance/hospital/MedicalVisitReview.jsx";
import MedicalVisitDetails from "./pages/Eac-attendance/hospital/MedicalVisitDetails.jsx";
import EmployeeMedicalHistory from "./pages/Eac-attendance/hospital/EmployeeMedicalHistory.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import DirectPurchase from "./pages/Eac-inventory/DirectPurchase.jsx";
import DirectPurchaseDetail from "./pages/Eac-inventory/DirectPurchaseDetail.jsx";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./context/ThemeContext";

function App() {
  const { theme } = useTheme();

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />
      <ThemeToggle />
      
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/must-change-password" element={<MustChangePasswordPage />} />
        <Route path="/hospital/portal/:token" element={<HospitalPublicForm />} />

        {/* Protected routes - wrapped in MainLayout with sidebar and header */}
        <Route>
          
          {/* Admin Routes - Centralized Dashboard Access */}
          <Route path="/centralizedDashboard" element={
            <ProtectedRoute>
              <CentralizedDashboard />
            </ProtectedRoute>
          } />
          
          {/* Dashboard Routes */}
          <Route path="/employeeDashboard" element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/HRDashboard" element={
            <ProtectedRoute>
              <HRDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/plannerDashboard" element={
            <ProtectedRoute>
              <PlannerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/QuickApprove" element={
            <ProtectedRoute>
              <QuickApprove />
            </ProtectedRoute>
          } />

          <Route path="/QuickReject" element={
            <ProtectedRoute>
              <QuickReject />
            </ProtectedRoute>
          } />

             <Route path="/ActivityLogs" element={
            <ProtectedRoute>
              <ActivityLogs />
            </ProtectedRoute>
          } />

          <Route path="/PayrollReports" element={
            <ProtectedRoute>
              <PayrollReports/>
            </ProtectedRoute>
          } />

      <Route path="/DirectPurchase" element={<DirectPurchase />} />
<Route path="/DirectPurchase/:id" element={<DirectPurchaseDetail />} />

          <Route path="/NotificationsPage" element={
            <ProtectedRoute>
              <NotificationsPage/>
            </ProtectedRoute>
          } />


          <Route path="/supervisorDashboard" element={
            <ProtectedRoute>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/InventoryDashboard" element={
            <ProtectedRoute>
              <InventoryDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/attendancedashboard" element={
            <ProtectedRoute>
              <AttendanceDashboard />
            </ProtectedRoute>
          } />

          <Route path="/leaveDetailsModal" element={
            <ProtectedRoute>
              <LeaveDetailsModal />
            </ProtectedRoute>
          } />
          
          <Route path="/admindashboard" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Attendance & HR Routes */}
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />
          
          <Route path="/overview" element={
            <ProtectedRoute>
              <Overview />
            </ProtectedRoute>
          } />
          
          <Route path="/employee" element={
            <ProtectedRoute>
              <Employee />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/:id" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/overtime" element={
            <ProtectedRoute>
              <Overtime />
            </ProtectedRoute>
          } />
          
          <Route path="/leave" element={
            <ProtectedRoute>
              <Leave />
            </ProtectedRoute>
          } />
          
          <Route path="/timesheets" element={
            <ProtectedRoute>
              <Timesheet />
            </ProtectedRoute>
          } />
          
          <Route path="/biometricAttendanceFeed" element={
            <ProtectedRoute>
              <BiometricAttendanceFeed />
            </ProtectedRoute>
          } />
          
          <Route path="/payroll" element={
            <ProtectedRoute>
              <Payroll />
            </ProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          
          <Route path="/settingspage" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/dailyAttendanceReport" element={
            <ProtectedRoute>
              <DailyAttendanceReport />
            </ProtectedRoute>
          } />
          
          <Route path="/leaveRequestForm" element={
            <ProtectedRoute>
              <LeaveRequestForm />
            </ProtectedRoute>
          } />
          
          <Route path="/leave-status" element={
            <ProtectedRoute>
              <LeaveStatus />
            </ProtectedRoute>
          } />
          
          <Route path="/payslip" element={
            <ProtectedRoute>
              <Payslip />
            </ProtectedRoute>
          } />
          
          <Route path="/PayslipCard" element={
            <ProtectedRoute>
              <PayslipCard />
            </ProtectedRoute>
          } />
          
          {/* Job Routes - ADD THESE TWO */}
          <Route path="/JobsManagement" element={
            <ProtectedRoute>
              <JobsManagement />
            </ProtectedRoute>
          } />
          
          {/* NEW: Direct job view route - opens specific job */}
          <Route path="/jobs/:jobId" element={
            <ProtectedRoute>
              <JobDetailView />
            </ProtectedRoute>
          } />
          
          <Route path="/generateInvoice" element={
            <ProtectedRoute>
              <GenerateInvoice />
            </ProtectedRoute>
          } />
          
          <Route path="/LeaveBalanceTracker" element={
            <ProtectedRoute>
              <LeaveBalanceTracker />
            </ProtectedRoute>
          } />
          
          <Route path="/quotationMaster" element={
            <ProtectedRoute>
              <QuotationMaster />
            </ProtectedRoute>
          } />
          
          <Route path="/employeeOvertimeRequest" element={
            <ProtectedRoute>
              <EmployeeOvertimeRequest />
            </ProtectedRoute>
          } />
          
          <Route path="/employeeLoanRequest" element={
            <ProtectedRoute>
              <EmployeeLoanRequest />
            </ProtectedRoute>
          } />
          
          <Route path="/loanManagementDashboard" element={
            <ProtectedRoute>
              <LoanManagementDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/excel-comparator" element={
            <ProtectedRoute>
              <ExcelComparator />
            </ProtectedRoute>
          } />
          
          <Route path="/adminLeaveBalanceView" element={
            <ProtectedRoute>
              <AdminLeaveBalanceView />
            </ProtectedRoute>
          } />

          <Route path="/attendanceRequests" element={
            <ProtectedRoute>
              <AttendanceRequests />
            </ProtectedRoute>
          } />

          <Route path="/attendanceRequestReview" element={
            <ProtectedRoute>
              <AttendanceRequestReview />
            </ProtectedRoute>
          } />
          <Route path="/hospitals" element={<ProtectedRoute><HospitalManagement /></ProtectedRoute>} />
          <Route path="/medical-visits" element={<ProtectedRoute><MedicalVisitReview /></ProtectedRoute>} />
          <Route path="/medical-visits/:id" element={<ProtectedRoute><MedicalVisitDetails /></ProtectedRoute>} />
          <Route path="/my-medical-visits" element={<ProtectedRoute><EmployeeMedicalHistory /></ProtectedRoute>} />
          
          {/* Inventory Routes */}
          <Route path="/InventoryRequest" element={
            <ProtectedRoute>
              <InventoryRequest />
            </ProtectedRoute>
          } />
          
          <Route path="/products" element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } />
          
          <Route path="/received" element={
            <ProtectedRoute>
              <Received />
            </ProtectedRoute>
          } />
          
          <Route path="/outgoing" element={
            <ProtectedRoute>
              <Outgoing />
            </ProtectedRoute>
          } />
          
          <Route path="/storeKeeperRequests" element={
            <ProtectedRoute>
              <StorekeeperRequests />
            </ProtectedRoute>
          } />
          
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          
          <Route path="/ppe" element={
            <ProtectedRoute>
              <PPES />
            </ProtectedRoute>
          } />
          
          <Route path="/procurementManagerReview" element={
            <ProtectedRoute>
              <ProcurementManagerReview />
            </ProtectedRoute>
          } />
          
          <Route path="/product-request-form" element={
            <ProtectedRoute>
              <ProductRequestForm />
            </ProtectedRoute>
          } />
          
          <Route path="/StoreOfficerApproval" element={
            <ProtectedRoute>
              <StoreOfficerApproval />
            </ProtectedRoute>
          } />
          
          <Route path="/CostCenterManagement" element={
            <ProtectedRoute>
              <CostCenterManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/ReportsDashboard" element={
            <ProtectedRoute>
              <ReportsDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/plannerProductsReview" element={
            <ProtectedRoute>
              <PlannerProductsReview />
            </ProtectedRoute>
          } />
          
          <Route path="/procurementPurchases" element={
            <ProtectedRoute>
              <ProcurementPurchases />
            </ProtectedRoute>
          } />
          
          {/* Transport Routes */}
          <Route path="/drivers" element={
            <ProtectedRoute>
              <Drivers />
            </ProtectedRoute>
          } />
          
          <Route path="/fuel" element={
            <ProtectedRoute>
              <Fuel />
            </ProtectedRoute>
          } />
          
          <Route path="/maintenance" element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          } />
          
          <Route path="/usersmanagement" element={
            <ProtectedRoute>
              <UsersManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/vehicles" element={
            <ProtectedRoute>
              <Vehicles />
            </ProtectedRoute>
          } />
          
          <Route path="/transportReports" element={
            <ProtectedRoute>
              <TransportReports />
            </ProtectedRoute>
          } />
          
          {/* Admin & Management Routes */}
          <Route path="/Userpage" element={
            <ProtectedRoute>
              <Userpage />
            </ProtectedRoute>
          } />
          
          <Route path="/pagePermissionManagement" element={
            <ProtectedRoute>
              <PagePermissionManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/search" element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          } />
          
          <Route path="/mainsidebar" element={
            <ProtectedRoute>
              <MainSidebar />
            </ProtectedRoute>
          } />
          
          <Route path="/Sidebar" element={
            <ProtectedRoute>
              <Sidebar />
            </ProtectedRoute>
          } />
          
        </Route>
      </Routes>
    </>
  );
}

export default App;
