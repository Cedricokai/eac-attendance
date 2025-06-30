import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import { SettingsContext } from "./context/SettingsContext";
import { 
  Users,
  Clock,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";

function Dashboard() {
  const { settings } = useContext(SettingsContext);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingApprovals: 0
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [payrollData, setPayrollData] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // In a real app, you might fetch all this with a single dashboard endpoint
        const [employeesRes, attendanceRes, payrollRes, activitiesRes] = await Promise.all([
          fetch('http://localhost:8080/api/employee'),
          fetch('http://localhost:8080/api/attendance/recent'),
          fetch('http://localhost:8080/api/payroll/summary'),
          fetch('http://localhost:8080/api/activities')
        ]);

        const employees = await employeesRes.json();
        const attendance = await attendanceRes.json();
        const payroll = await payrollRes.json();
        const activities = await activitiesRes.json();

        // Calculate employee stats
        const onLeave = employees.filter(e => 
          e.leaveStatus && e.leaveStatus !== 'Not on leave'
        ).length;

        setStats({
          totalEmployees: employees.length,
          activeEmployees: employees.length - onLeave,
          onLeave,
          pendingApprovals: attendance.filter(a => a.status === 'Pending').length
        });

        setAttendanceData(attendance);
        setPayrollData(payroll);
        setRecentActivities(activities);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate attendance rate
  const attendanceRate = attendanceData.length > 0 
    ? (attendanceData.filter(a => a.status === 'Present').length / attendanceData.length) * 100
    : 0;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* Top Bar */}
          <header className="flex justify-between items-center border border-white bg-white h-16 w-full rounded-r-2xl px-6 shadow-md">
            <button className="p-1 hover:bg-gray-100 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <div className="flex items-center gap-5">
              <div className="relative">
                <Link to="/settingspage" className="p-1 hover:bg-gray-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </Link>
              </div>

              <div className="border-l border-gray-300 h-8"></div>

              <button className="p-1 hover:bg-gray-200 rounded-full relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
                  />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
              </button>

              <div className="border-l border-gray-300 h-8"></div>

              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  A
                </div>
                <span className="font-medium">Adams</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </header>

          {/* Page Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-sm mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600">Overview of your employee management system</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </section>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {/* Total Employees */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Employees</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {loading ? '--' : stats.totalEmployees}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-4">
                <Link 
                  to="/employee" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all employees →
                </Link>
              </div>
            </div>

            {/* Active Employees */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Employees</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {loading ? '--' : stats.activeEmployees}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {stats.onLeave} on leave
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Activity size={20} />
                </div>
              </div>
              <div className="mt-4">
                <Link 
                  to="/attendance" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View attendance →
                </Link>
              </div>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {loading ? '--' : attendanceRate.toFixed(1)}%
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {stats.pendingApprovals} pending approvals
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <CalendarCheck size={20} />
                </div>
              </div>
              <div className="mt-4">
                <Link 
                  to="/timesheets" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View timesheets →
                </Link>
              </div>
            </div>

            {/* Payroll Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Payroll Summary</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {loading ? '--' : formatCurrency(payrollData.totalAmount)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {payrollData.employeeCount || '--'} employees paid
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="mt-4">
                <Link 
                  to="/payroll" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View payroll →
                </Link>
              </div>
            </div>
          </div>

          {/* Charts and Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Attendance Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg">
                    Week
                  </button>
                  <button className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg">
                    Month
                  </button>
                </div>
              </div>
              
              {/* Placeholder for chart */}
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <TrendingUp size={40} className="opacity-50" />
                <span className="ml-2">Attendance chart will be displayed here</span>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start">
                      <div className={`flex-shrink-0 mt-1 ${
                        activity.type === 'error' ? 'text-red-500' : 
                        activity.type === 'success' ? 'text-green-500' : 
                        'text-blue-500'
                      }`}>
                        {activity.type === 'error' ? <XCircle size={18} /> : 
                         activity.type === 'success' ? <CheckCircle size={18} /> : 
                         <AlertCircle size={18} />}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activities found
                </div>
              )}

              <div className="mt-6">
                <Link 
                  to="/activities" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all activities →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Attendance Records</h2>
              <Link 
                to="/attendance" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all →
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : attendanceData.length > 0 ? (
                    attendanceData.slice(0, 5).map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-700 font-medium">
                                {attendance.employee?.firstName?.charAt(0)}
                                {attendance.employee?.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {attendance.employee?.firstName} {attendance.employee?.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {attendance.employee?.employeeId || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(attendance.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.checkIn || '--:--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendance.checkOut || '--:--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            attendance.minimumHour >= 8 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {attendance.minimumHour || 0} hrs
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            attendance.status === 'Present' ? 'bg-green-100 text-green-800' :
                            attendance.status === 'Absent' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {attendance.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;