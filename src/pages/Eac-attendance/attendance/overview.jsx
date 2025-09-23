import { useState, useEffect, useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { SettingsContext } from "../context/SettingsContext";
import MainSidebar from "../mainSidebar";

function Overview() {
  const { settings } = useContext(SettingsContext);
  const [overviews, setOverviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [totalPayments, setTotalPayments] = useState({});
  const [groupedData, setGroupedData] = useState({});

  const location = useLocation();

  // Helper function to get JWT token
  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const groupByTimePeriods = (payments) => {
    const grouped = {};
    
    Object.keys(payments).forEach(date => {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      const month = dateObj.toLocaleString('default', { month: 'long' });
      const day = dateObj.getDate();
      
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      
      grouped[year][month].push({
        date,
        ...payments[date]
      });
    });
    
    return grouped;
  };

  // Calculate rates and payments
  useEffect(() => {
    if (overviews.length > 0) {
      const payments = {};
      
      overviews.forEach(overview => {
        if (!payments[overview.date]) {
          payments[overview.date] = {
            totalAmount: 0,
            totalHours: 0,
            employeeCount: 0,
            regularHours: 0,
            overtimeHours: 0,
            holidayHours: 0,
            weekendHours: 0
          };
        }
        
        const hours = parseFloat(overview.hoursWorked) || 0;
        const overtimeHours = parseFloat(overview.overtimeHours) || 0;
        const baseRate = (overview.employee && overview.employee.minimumRate) || settings.hourlyRate;
        let rate, rateType;
        
        if (overview.status === 'Overtime') {
          rate = overview.overtimeRate || settings.overtimeHourlyRate;
          rateType = 'overtime';
          payments[overview.date].overtimeHours += overtimeHours;
        } else if (overview.status === 'Holiday Present') {
          rate = settings.holidayRate || baseRate * 1.5;
          rateType = 'holiday';
          payments[overview.date].holidayHours += hours;
        } else if (overview.status === 'Weekend Present') {
          rate = settings.weekendRate || baseRate * 1.25;
          rateType = 'weekend';
          payments[overview.date].weekendHours += hours;
        } else {
          rate = baseRate;
          rateType = 'regular';
          payments[overview.date].regularHours += hours;
        }
        
        payments[overview.date].totalAmount += hours * rate;
        if (overtimeHours > 0) {
          payments[overview.date].totalAmount += overtimeHours * (overview.overtimeRate || settings.overtimeHourlyRate);
        }
        payments[overview.date].totalHours += hours + overtimeHours;
        payments[overview.date].employeeCount += 1;
      });
      
      setTotalPayments(payments);
      setGroupedData(groupByTimePeriods(payments));
    }
  }, [overviews, settings]);

  const toggleTableVisibility = (date) => {
    setSelectedDate(selectedDate === date ? null : date);
    setIsTableVisible(selectedDate !== date);
  };

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/employee', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      setEmployees(await response.json());
    } catch (err) {
      console.error("Failed to fetch employees:", err.message);
    }
  };

  const fetchOverviews = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      setOverviews(await response.json());
    } catch (err) {
      console.error("Failed to fetch overviews:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async () => {
    try {
      const token = getToken();
      const response = await fetch('http://localhost:8080/api/leave', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      setLeaves(await response.json());
    } catch (err) {
      console.error("Failed to fetch leaves:", err.message);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchOverviews();
    fetchLeaves();
  }, []);

  const isWeekend = (dateString) => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const calculateEmployeePayment = (overview) => {
    const baseRate = (overview.employee?.minimumRate) || settings.hourlyRate;
    let rate, hours, rateType;
    
    if (overview.status === 'Overtime') {
      rate = overview.overtimeRate || baseRate * 2;
      hours = parseFloat(overview.overtimeHours) || 0;
      rateType = 'Overtime';
    } else {
      hours = parseFloat(overview.hoursWorked) || 0;
      const isWeekendDay = isWeekend(overview.date);
      
      if (isWeekendDay) {
        rate = baseRate * (settings.weekendRate || 1.25);
        rateType = 'Weekend';
      } else if (overview.status === 'Holiday Present') {
        rate = baseRate * (settings.holidayRate || 1.5);
        rateType = 'Holiday';
      } else {
        rate = baseRate;
        rateType = 'Regular';
      }
    }
    
    return {
      hours,
      rate,
      amount: hours * rate,
      rateType,
      isWeekend: isWeekend(overview.date)
    };
  };

  const TimePeriodGroup = ({ title, data, level }) => {
    const [isExpanded, setIsExpanded] = useState(level === 'year');
    
    return (
      <div className={`mb-2 ${level === 'year' ? 'border-b pb-2' : ''}`}>
        <div 
          className={`flex items-center cursor-pointer p-2 rounded-lg transition-colors ${
            level === 'year' ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-lg' : 
            level === 'month' ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 font-semibold' : 
            'hover:bg-gray-50'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex items-center">
            <span className="mr-2 text-gray-500">
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
            <span>
              {title}
              {level === 'month' && (
                <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {data.length} {data.length === 1 ? 'day' : 'days'}
                </span>
              )}
            </span>
          </span>
        </div>
        
        {isExpanded && (
          <div className={`${level === 'year' ? 'ml-0' : level === 'month' ? 'ml-6' : 'ml-8'} mt-2 pl-2 border-l-2 border-gray-200`}>
            {level === 'month' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                {data.map((dayData) => (
                  <DayCard 
                    key={dayData.date}
                    dayData={dayData}
                    isSelected={selectedDate === dayData.date}
                    onClick={() => toggleTableVisibility(dayData.date)}
                  />
                ))}
              </div>
            ) : (
              Object.entries(data).map(([key, value]) => (
                <TimePeriodGroup
                  key={key}
                  title={level === 'year' ? `Year ${key}` : key}
                  data={value}
                  level={level === 'year' ? 'month' : 'day'}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  };
  
  const DayCard = ({ dayData, isSelected, onClick }) => {
    return (
      <div
        onClick={onClick}
        className={`bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{dayData.date}</h3>
              <p className="text-sm text-gray-500">
                {dayData.employeeCount || 0} employees
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {dayData.totalHours.toFixed(2)} hrs
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="text-sm">
              <p className="text-gray-500">Regular</p>
              <p>{dayData.regularHours.toFixed(2)} hrs</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-500">Overtime</p>
              <p>
                {overviews
                  .filter(o => o.date === dayData.date)
                  .reduce((total, o) => total + (parseFloat(o.overtimeHours) || 0), 0)
                  .toFixed(2)} hrs
              </p>
            </div>
            <div className="text-sm">
              <p className="text-gray-500">Holiday</p>
              <p>{dayData.holidayHours.toFixed(2)} hrs</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-500">Weekend</p>
              <p>{dayData.weekendHours.toFixed(2)} hrs</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Total Pay</span>
              <span className="text-lg font-semibold text-blue-600">
                GHS{dayData.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LeaveSection = () => {
    const approvedLeaves = leaves.filter(leave => leave.status === 'Approved');

    return (
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Leave Management</h2>
        </div>

        <div className="w-full">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-green-100 px-4 py-2 border-b border-green-200">
              <h3 className="font-medium text-green-800">Approved ({approvedLeaves.length})</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {approvedLeaves.length > 0 ? (
                approvedLeaves.map(leave => (
                  <div key={leave.id} className="p-3 hover:bg-gray-50">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {leave.employee?.firstName} {leave.employee?.lastName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{leave.leaveType}</p>
                    <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No approved leaves</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md z-30">
        <MainSidebar />
      </div>
      
      {/* Main content */}
      <main className="flex-1 ml-64 overflow-y-auto">
        <header className="flex justify-between items-center bg-white h-16 w-full px-6 shadow-md sticky top-0 z-10">
          <h1 className="text-lg font-semibold">Attendances Overview</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                fetchOverviews();
                fetchLeaves();
              }}
              className="p-2 hover:bg-gray-200 rounded-full"
              title="Refresh data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content container */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                {Object.entries(groupedData).map(([year, yearData]) => (
                  <TimePeriodGroup
                    key={year}
                    title={`Year ${year}`}
                    data={yearData}
                    level="year"
                  />
                ))}
              </div>

              <LeaveSection />

              {isTableVisible && selectedDate && (
                <div className="mt-8">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold">Details for {selectedDate}</h2>
                      <button
                        onClick={() => setIsTableVisible(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Hours</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {overviews
                            .filter((overview) => overview.date === selectedDate)
                            .map((overview) => {
                              const payment = calculateEmployeePayment(overview);
                              return (
                                <tr key={overview.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {(overview.attendance && overview.attendance.employee)
                                      ? `${overview.attendance.employee.firstName} ${overview.attendance.employee.lastName}`
                                      : (overview.employee)
                                      ? `${overview.employee.firstName} ${overview.employee.lastName}`
                                      : "Unknown"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {overview.shift || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      overview.status === 'Present' 
                                        ? 'bg-green-100 text-green-800'
                                        : overview.status === 'Overtime'
                                        ? 'bg-blue-100 text-blue-800'
                                        : overview.status.includes('Holiday')
                                        ? 'bg-purple-100 text-purple-800'
                                        : overview.status.includes('Weekend')
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {overview.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {payment.hours.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {payment.rateType}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    GHS{payment.rate.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {overview.overtimeHours || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {overview.overtimeRate ? `$${overview.overtimeRate}` : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    GHS{payment.amount.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {totalPayments[selectedDate] && (
                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <div className="flex justify-between">
                          <div className="text-sm font-medium text-gray-500">Total Employees</div>
                          <div className="text-sm font-medium text-gray-900">{totalPayments[selectedDate].employeeCount}</div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <div className="text-sm font-medium text-gray-500">Total Hours</div>
                          <div className="text-sm font-medium text-gray-900">{totalPayments[selectedDate].totalHours.toFixed(2)}</div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <div className="text-sm font-medium text-gray-500">Total Payment</div>
                          <div className="text-lg font-semibold text-blue-600">GHS{totalPayments[selectedDate].totalAmount.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Overview;