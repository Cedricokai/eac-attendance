import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Employee from "./pages/employee/employee";
import Attendance from "./pages/attendance/attendance";
import Login from "./pages/authentication/login";
import Overview from "./pages/attendance/overview";
import Profile from "./pages/employee/profile";
import Signup from "./pages/authentication/signup";
import Home from "./pages/home";
import Overtime from './pages/attendance/overtime';
import Leave from './pages/attendance/leave';
import Sidebar from './pages/Sidebar';
import { SettingsContext, SettingsProvider } from './pages/context/SettingsContext';
import Timesheet from './pages/attendance/timesheets';
import BiometricAttendanceFeed from './pages/attendance/BiometricAttendanceFeed';
import Payroll from './pages/attendance/payroll';
import Dashboard from './pages/dashboard';
import Reports from './pages/attendance/reports';


function App() {
  return (
    <SettingsProvider>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance" element={<Attendance />} />
          <Route path="/eac-attendance" element={<Attendance />} /> {/* Add this */}
      <Route path="/employee" element={<Employee />} />
      <Route path="/overview" element={<Overview />} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/overtime" element={<Overtime />} />
      <Route path="/leave" element={<Leave />} />
      <Route path="/sidebar" element={<Sidebar />} />
      <Route path="/timesheets" element={<Timesheet/>} />
 <Route path="/biometricAttendanceFeed" element={<BiometricAttendanceFeed/>} />
<Route path="/payroll" element={< Payroll/>} />
<Route path="/dashboard" element={< Dashboard/>} />
<Route path="/reports" element={< Reports/>} />
    </Routes>
    </SettingsProvider>
  );
}

export default App;
