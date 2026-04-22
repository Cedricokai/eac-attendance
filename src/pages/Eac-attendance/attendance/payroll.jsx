import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import * as XLSX from "xlsx";
import Header from "../../../components/Header";

function Payroll() {
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [newPeriod, setNewPeriod] = useState({ 
    name: "", 
    startDate: "", 
    endDate: "",
    category: "",
    convertExcessToOvertime: true 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState(null);
  const location = useLocation();
  const [creditAmounts, setCreditAmounts] = useState({});
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedEmployeesForCredit, setSelectedEmployeesForCredit] = useState([]);
  const [creditValue, setCreditValue] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [expandedMonths, setExpandedMonths] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // New state for TEMPORARY allowance management (not saved to employee profile)
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [temporaryAllowances, setTemporaryAllowances] = useState([
    { type: "housingAllowance", amount: "", description: "", enabled: false },
    { type: "tntAllowance", amount: "", description: "", enabled: false },
    { type: "clothsAllowances", amount: "", description: "", enabled: false },
    { type: "otherAllowances", amount: "", description: "", enabled: false },
    { type: "nssAllowance", amount: "", description: "", enabled: false },
  ]);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [noRecordsMessage, setNoRecordsMessage] = useState("");

  const [settings, setSettings] = useState({
    hourlyRate: 15.0,
    overtimeHourlyRate: 22.5,
    weekendRate: 1.0,
    holidayRate: 1.0,
    weekendDays: [0, 6],
    holidays: [],
    standardWorkHours: 8,
  });

  const [includeBasicSalary, setIncludeBasicSalary] = useState(false);
  const [payrollTemporaryAllowances, setPayrollTemporaryAllowances] = useState({});
  const [recordSearch, setRecordSearch] = useState("");
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(50);

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    console.log("🖥️ Current hostname:", hostname);
    console.log("🔌 Current port:", port);

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log("🏠 Using LOCALHOST API URL");
      return "http://localhost:8080";
    }

    if (hostname.startsWith("192.168.")) {
      console.log("🏠 Using LAN API URL");
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    if (hostname === "100.114.178.13") {
      console.log("🌐 Using PUBLIC API URL");
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    console.log("🌍 Using PUBLIC API URL (fallback)");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  
      // Add toggleSidebar function
    const toggleSidebar = () => {
      setSidebarOpen(!sidebarOpen);
    };
  
    // Add responsive sidebar handling
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth >= 768) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(false);
        }
      };
  
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
     useEffect(() => {
      const handleClickOutside = (event) => {
        if (sidebarOpen && window.innerWidth < 768) {
          const sidebar = document.querySelector('.sidebar-container');
          if (sidebar && !sidebar.contains(event.target) && !event.target.closest('.hamburger-button')) {
            setSidebarOpen(false);
          }
        }
      };
  
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [sidebarOpen]);
  
      useEffect(() => {
      const fetchUser = async () => {
        try {
          const token = localStorage.getItem("jwtToken");
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              "Authorization": `Bearer ${token}`
            },
            credentials: "include"
          });
          if (res.ok) {
            const data = await res.json();
            setUser({
              name: data.username,
              role: data.role.replace("ROLE_", "").toLowerCase(), 
              email: data.email
            });
          }
        } catch (err) {
          console.error("Failed to fetch user", err);
        }
      };
      fetchUser();
    }, []);
  
    const handleLogout = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
  
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userRole");
        window.location.href = "/";
      } catch (error) {
        console.error("Logout failed:", error);
      }
    };
  

  const [filters, setFilters] = useState({
    grade: "",
    workType: "",
    category: "",
  });

  const calculateWorkingDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const getToken = () => localStorage.getItem("jwtToken");

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    return (
      (!filters.grade || (emp.grade && emp.grade.toLowerCase().includes(filters.grade.toLowerCase()))) &&
      (!filters.workType || (emp.workType && emp.workType.toLowerCase().includes(filters.workType.toLowerCase()))) &&
      (!filters.category || (emp.category && emp.category.toLowerCase().includes(filters.category.toLowerCase())))
    );
  });

  const fetchPayrollPeriods = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch payroll periods");
      const data = await res.json();
      setPayrollPeriods(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const isHoliday = (date) => {
    if (!date) return false;
    const dateStr = new Date(date).toISOString().split("T")[0];
    return (
      settings.holidays?.some((holiday) => {
        if (holiday.recurring) {
          const holidayDate = new Date(holiday.date);
          const checkDate = new Date(date);
          return holidayDate.getMonth() === checkDate.getMonth() && holidayDate.getDate() === checkDate.getDate();
        }
        return holiday.date === dateStr;
      }) || false
    );
  };

  const isWeekend = (date) => {
    if (!date) return false;
    const day = new Date(date).getDay();
    return settings.weekendDays?.includes(day) || false;
  };

  const getDateMultiplier = (date) => {
    if (isHoliday(date)) {
      const dateStr = new Date(date).toISOString().split("T")[0];
      const holiday = settings.holidays?.find((h) => {
        if (h.recurring) {
          const holidayDate = new Date(h.date);
          const checkDate = new Date(date);
          return holidayDate.getMonth() === checkDate.getMonth() && holidayDate.getDate() === checkDate.getDate();
        }
        return h.date === dateStr;
      });
      return holiday?.payMultiplier || settings.holidayRate || 1.5;
    } else if (isWeekend(date)) {
      return settings.weekendRate || 1.25;
    }
    return 1;
  };

  const fetchPayrollRecords = async (periodId) => {
    try {
      setLoading(true);
      setError("");
      setNoRecordsMessage("");

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll?periodId=${periodId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          const errorData = await res.json();
          setNoRecordsMessage(errorData.message || "No payroll records found for this period");
          setPayrollRecords([]);
        } else {
          throw new Error("Failed to fetch payroll records");
        }
      } else {
        const data = await res.json();
        setPayrollRecords(data);
        if (data.length === 0) {
          setNoRecordsMessage("No payroll records found for this period");
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollSummary = async (periodId) => {
    if (!periodId) {
      setSummary(null);
      return;
    }
    
    try {
      const token = getToken();
      const selectedPeriodObj = payrollPeriods.find(p => p.id === periodId);
      
      if (selectedPeriodObj?.category) {
        const res = await fetch(`${API_BASE_URL}/api/payroll/summary/category/${selectedPeriodObj.category}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch payroll summary by category");
        const data = await res.json();
        setSummary(data);
      } else {
        const res = await fetch(`${API_BASE_URL}/api/payroll/period-summary/${periodId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch period summary");
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
      if (payrollRecords.length > 0) {
        calculateLocalSummary(payrollRecords);
      }
    }
  };

  const calculateLocalSummary = (records) => {
    const summary = {
      totalNetAmount: records.reduce((sum, r) => sum + (r.netSalary || 0), 0),
      totalTax: records.reduce((sum, r) => sum + (r.payeTax || 0), 0),
      totalSsnit: records.reduce((sum, r) => sum + (r.ssnitEmployee || 0) + (r.ssnitEmployer || 0), 0),
      employeeCount: records.length,
      totalLeaveDays: records.reduce((sum, r) => sum + (r.leaveDays || 0), 0),
      employeesOnLeave: records.filter(r => (r.leaveDays || 0) > 0).length,
      totalGrossSalary: records.reduce((sum, r) => sum + (r.grossSalary || 0), 0),
      totalBasicSalary: records.reduce((sum, r) => sum + (r.basicSalary || 0), 0),
      totalOvertimePay: records.reduce((sum, r) => sum + (r.overtimePay || 0), 0),
      totalAllowances: records.reduce((sum, r) => 
        sum + (r.rentAllowance || 0) + (r.transportAllowance || 0) + 
        (r.clothingAllowance || 0) + (r.otherAllowance || 0) + (r.nssAllowance || 0), 0),
      periodId: selectedPeriod,
      periodName: payrollPeriods.find(p => p.id === selectedPeriod)?.name
    };
    setSummary(summary);
  };

  const createPayrollPeriod = async () => {
    if (!newPeriod.category) {
      setError("Please select a category");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods/category`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newPeriod),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create payroll period");
      }
      const data = await res.json();
      setPayrollPeriods([...payrollPeriods, data]);
      setNewPeriod({ name: "", startDate: "", endDate: "", category: "", convertExcessToOvertime: true });
      setSuccess("Payroll period created successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const debugEmployee = async (employeeId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/debug/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("Employee Debug Data:", data);
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  useEffect(() => {
    console.log("Current settings:", {
      hourlyRate: settings.hourlyRate,
      overtimeRate: settings.overtimeHourlyRate,
      weekendRate: settings.weekendRate,
      holidayRate: settings.holidayRate,
      weekendDays: settings.weekendDays,
      holidays: settings.holidays,
    });
  }, [settings]);

  useEffect(() => {
    payrollRecords.forEach((record) => {
      if (record.basicSalary === 0 || record.basicSalary > 5000) {
        const employeeId = record.employee?.id || record.employeeId;
        console.log("Checking employee:", employeeId);
        debugEmployee(employeeId);
      }
    });
  }, [payrollRecords]);

  const generatePayroll = async (periodId) => {
    try {
      const token = getToken();

      const formattedTemporaryAllowances = {};
      Object.keys(payrollTemporaryAllowances).forEach((employeeId) => {
        formattedTemporaryAllowances[employeeId] = {
          housingAllowance: payrollTemporaryAllowances[employeeId].housingAllowance || 0,
          tntAllowance: payrollTemporaryAllowances[employeeId].tntAllowance || 0,
          clothsAllowances: payrollTemporaryAllowances[employeeId].clothsAllowances || 0,
          otherAllowances: payrollTemporaryAllowances[employeeId].otherAllowances || 0,
          nssAllowance: payrollTemporaryAllowances[employeeId].nssAllowance || 0,
        };
      });

      const payload = {
        periodId,
        temporaryAllowances: formattedTemporaryAllowances,
        creditAmounts: creditAmounts, 
        settings: {
          hourlyRate: settings.hourlyRate || 15.0,
          overtimeHourlyRate: settings.overtimeHourlyRate || 22.5,
          weekendRate: settings.weekendRate || 1.25,
          holidayRate: settings.holidayRate || 1.5,
          weekendDays: settings.weekendDays || [0, 6],
          holidays: settings.holidays || [],
          standardWorkHours: settings.standardWorkHours || 8,
        },
        includeBasicSalary, 
      };

      console.log("Sending payroll generation with temporary allowances:", payload);

      const res = await fetch(`${API_BASE_URL}/api/payroll/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate payroll");
      }

      setSuccess("Payroll generated successfully with temporary allowances");
      setTimeout(() => setSuccess(""), 3000);
      setCreditAmounts({});

      setTimeout(() => {
        fetchPayrollRecords(periodId);
        fetchPayrollSummary();
      }, 1000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const calculateLeaveDaysPerEmployee = (leaves, periodStart, periodEnd) => {
    const leaveDaysByEmployee = {};

    leaves.forEach((leave) => {
      if (leave.status === "Approved" && leave.employee?.id) {
        const employeeId = leave.employee.id;
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        const periodStartDate = new Date(periodStart);
        const periodEndDate = new Date(periodEnd);

        const overlapStart = leaveStart < periodStartDate ? periodStartDate : leaveStart;
        const overlapEnd = leaveEnd > periodEndDate ? periodEndDate : leaveEnd;

        if (overlapStart <= overlapEnd) {
          const overlapDays = calculateWorkingDaysInRange(overlapStart, overlapEnd);

          if (!leaveDaysByEmployee[employeeId]) {
            leaveDaysByEmployee[employeeId] = 0;
          }
          leaveDaysByEmployee[employeeId] += overlapDays;
        }
      }
    });

    return leaveDaysByEmployee;
  };

  const calculateWorkingDaysInRange = (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  const isLeaveInPeriod = (leave, periodStart, periodEnd) => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    const payrollStart = new Date(periodStart);
    const payrollEnd = new Date(periodEnd);

    return leaveStart <= payrollEnd && leaveEnd >= payrollStart;
  };

  const processPayroll = async (periodId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/process?periodId=${periodId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to process payroll");
      }
      setSuccess("Payroll processed successfully");
      setTimeout(() => setSuccess(""), 3000);
      fetchPayrollRecords(periodId);
      fetchPayrollSummary();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const addTemporaryAllowances = async () => {
    if (selectedEmployees.length === 0) {
      setError("Please select at least one employee");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const validAllowances = temporaryAllowances.filter(
      (allowance) => allowance.enabled && allowance.amount && !isNaN(parseFloat(allowance.amount))
    );

    if (validAllowances.length === 0) {
      setError("Please add at least one allowance with a valid amount");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const newTemporaryAllowances = { ...payrollTemporaryAllowances };

      selectedEmployees.forEach((employeeId) => {
        if (!newTemporaryAllowances[employeeId]) {
          newTemporaryAllowances[employeeId] = {};
        }

        validAllowances.forEach((allowance) => {
          newTemporaryAllowances[employeeId][allowance.type] = parseFloat(allowance.amount);
        });
      });

      setPayrollTemporaryAllowances(newTemporaryAllowances);

      setSuccess(`Temporary allowances added to ${selectedEmployees.length} employees for this payroll period`);
      setTimeout(() => setSuccess(""), 3000);
      setShowAllowanceModal(false);

      setTemporaryAllowances([
        { type: "housingAllowance", amount: "", description: "", enabled: false },
        { type: "tntAllowance", amount: "", description: "", enabled: false },
        { type: "clothsAllowances", amount: "", description: "", enabled: false },
        { type: "otherAllowances", amount: "", description: "", enabled: false },
        { type: "nssAllowance", amount: "", description: "", enabled: false },
      ]);
      setSelectedEmployees([]);

      if (selectedPeriod) {
        fetchPayrollRecords(selectedPeriod);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const exportBankSpreadsheet = () => {
    if (!payrollRecords || payrollRecords.length === 0) {
      setError("No payroll records available to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const rows = payrollRecords.map((record) => {
      const employee = record.employee || {};
      const accountName = employee.accountName || "";
      const bankName = employee.bank || "";
      const bankLocation = employee.bankBranch || "";
      const beneficiaryAccount = employee.accountNumber || "";
      const beneficiaryBank = bankName === "Ecobank Ghana Limited" ? "Ecobank Ghana Limited" : `${bankName} - ${bankLocation}`;

      return {
        "BENEFICIARY NAME": accountName,
        "BENEFICIARY BANK": beneficiaryBank,
        "BENEFICIARY ACCOUNT": beneficiaryAccount,
        AMOUNT: record.netSalary || 0,
        NARRATION: "",
        PURPOSE: "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    const fileName = `Payroll-Bank-Upload-${selectedPeriod || "period"}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportSsnitSpreadsheet = () => {
    if (!payrollRecords || payrollRecords.length === 0) {
      setError("No payroll records available to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const rows = payrollRecords.map((record) => {
      const employee = record.employee || {};
      const beneficiaryAccount = employee.ssnitNumber || "";
      const ssnitEmployee = record.ssnitEmployee || 0;
      const ssnitEmployer = record.ssnitEmployer || 0;
      const snnitName = employee.ssnitAccountName || "";
      const totalSsnitContribution = ssnitEmployee + ssnitEmployer;

      return {
        N: "N",
        "SSNIT NUMBER": beneficiaryAccount,
        "SSNIT NAME ACCOUNT": snnitName,
        AMMOUNT: totalSsnitContribution,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    const fileName = `Payroll-Ssnit-Upload-${selectedPeriod || "period"}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportPayrollRecords = (type = 'all') => {
    if (!payrollRecords || payrollRecords.length === 0) {
      setError("No payroll records available to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const recordsToExport = type === 'filtered' ? filteredPayrollRecords : payrollRecords;
    
    if (recordsToExport.length === 0) {
      setError("No records match the current search criteria");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const rows = recordsToExport.map((record) => {
      const employee = record.employee || {};
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      
      return {
        'Employee ID': employee.id || record.employeeId || '',
        'Employee Name': employeeName,
        'Department': employee.department || '',
        'Grade': employee.grade || '',
        'Work Type': employee.workType || '',
        'Category': employee.category || '',
        'Total Days in Period': record.totalDaysInPeriod || 0,
        'Leave Days': record.leaveDays || 0,
        'Holiday Days': record.holidayDays || 0,
        'Weekend Days': record.weekendDays || 0,
        'Physical Working Days': record.workingDays || 0,
        'Total Paid Days': (record.workingDays || 0) + (record.leaveDays || 0),
        'Total Hours': (record.totalHours || 0).toFixed(2),
        'Overtime Hours': (record.overtimeHours || 0).toFixed(2),
        'Basic Salary': (record.basicSalary || 0).toFixed(2),
        'Overtime Pay': (record.overtimePay || 0).toFixed(2),
        'Housing Allowance': (record.rentAllowance || 0).toFixed(2),
        'Transport Allowance': (record.transportAllowance || 0).toFixed(2),
        'Clothing Allowance': (record.clothingAllowance || 0).toFixed(2),
        'Other Allowances': (record.otherAllowance || 0).toFixed(2),
        'NSS Allowances': (record.nssAllowance || 0).toFixed(2),
        'Total Allowances': getTotalAllowance(record).toFixed(2),
        'Gross Salary': (record.grossSalary || 0).toFixed(2),
        'Taxable Type': record.useNonTaxableAllowances ? 'Non-Taxable' : 'Taxable',
        'Employee SSNIT': (record.ssnitEmployee || 0).toFixed(2),
        'Employer SSNIT': (record.ssnitEmployer || 0).toFixed(2),
        'Total SSNIT': ((record.ssnitEmployee || 0) + (record.ssnitEmployer || 0)).toFixed(2),
        'Taxable Income': (record.taxableIncome || 0).toFixed(2),
        'PAYE Tax': (record.payeTax || 0).toFixed(2),
        'Credit': (record.creditAmount || 0).toFixed(2),
        'Net Salary': (record.netSalary || 0).toFixed(2),
        'Employer Cost': ((record.grossSalary || 0) + (record.ssnitEmployer || 0)).toFixed(2),
        'Multiplier Bonus': (record.multiplierBonus || 0).toFixed(2),
        'Status': record.status || '',
        'Has Temporary Allowances': record.usesTemporaryAllowances ? 'Yes' : 'No',
        'Bank': employee.bank || '',
        'Bank Branch': employee.bankBranch || '',
        'Account Number': employee.accountNumber || '',
        'Account Name': employee.accountName || '',
        'SSNIT Number': employee.ssnitNumber || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Records");
    
    const periodName = selectedPeriod 
      ? payrollPeriods.find(p => p.id === selectedPeriod)?.name || 'period'
      : 'payroll';
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Payroll-Records-${periodName}-${date}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    setSuccess(`Exported ${recordsToExport.length} payroll records successfully`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const exportBasicPayrollRecords = () => {
    if (!payrollRecords || payrollRecords.length === 0) {
      setError("No payroll records available to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const rows = payrollRecords.map((record) => {
      const employee = record.employee || {};
      const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      
      return {
        'Employee Name': employeeName,
        'Basic Salary': (record.basicSalary || 0).toFixed(2),
        'Overtime Pay': (record.overtimePay || 0).toFixed(2),
        'Allowances': getTotalAllowance(record).toFixed(2),
        'Gross Salary': (record.grossSalary || 0).toFixed(2),
        'SSNIT (Employee)': (record.ssnitEmployee || 0).toFixed(2),
        'PAYE Tax': (record.payeTax || 0).toFixed(2),
        'Net Salary': (record.netSalary || 0).toFixed(2),
        'Status': record.status || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Summary");
    
    const periodName = selectedPeriod 
      ? payrollPeriods.find(p => p.id === selectedPeriod)?.name || 'period'
      : 'payroll';
    const fileName = `Payroll-Summary-${periodName}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    setSuccess("Payroll summary exported successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const removeTemporaryAllowances = (employeeId) => {
    const newTemporaryAllowances = { ...payrollTemporaryAllowances };
    delete newTemporaryAllowances[employeeId];
    setPayrollTemporaryAllowances(newTemporaryAllowances);

    if (selectedPeriod) {
      fetchPayrollRecords(selectedPeriod);
    }

    setSuccess("Temporary allowances removed");
    setTimeout(() => setSuccess(""), 3000);
  };

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return "0.00";
    return parseFloat(value).toFixed(decimals);
  };

  const getTotalAllowance = (record) => {
    return (record.rentAllowance || 0) + (record.transportAllowance || 0) + (record.clothingAllowance || 0) + (record.otherAllowance || 0) + (record.nssAllowance || 0) + (record.overtimePay || 0);
  };

  const hasEmployeeData = (record) => {
    return record && record.employee && record.employee.firstName;
  };

  const toggleEmployeeSelection = (employeeId) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter((id) => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((emp) => emp.id));
    }
  };

  const toggleAllowance = (index) => {
    const newAllowances = [...temporaryAllowances];
    newAllowances[index].enabled = !newAllowances[index].enabled;
    setTemporaryAllowances(newAllowances);
  };

  const updateAllowance = (index, field, value) => {
    const newAllowances = [...temporaryAllowances];
    newAllowances[index][field] = value;
    setTemporaryAllowances(newAllowances);
  };

  const addNewAllowanceField = () => {
    setTemporaryAllowances([...temporaryAllowances, { type: "otherAllowances", amount: "", description: "", enabled: true }]);
  };

  const removeAllowance = (index) => {
    if (temporaryAllowances.length <= 1) return;
    const newAllowances = [...temporaryAllowances];
    newAllowances.splice(index, 1);
    setTemporaryAllowances(newAllowances);
  };

  const fetchEmployeeCategories = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/settings/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const categoryNames = data.map(cat => cat.name);
        setCategories(categoryNames);
        console.log('Fetched categories:', categoryNames);
      } else {
        console.error('Failed to fetch categories:', res.status);
        if (employees.length > 0) {
          const uniqueCategories = [...new Set(employees.map(emp => emp.category).filter(Boolean))];
          setCategories(uniqueCategories);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      if (employees.length > 0) {
        const uniqueCategories = [...new Set(employees.map(emp => emp.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    }
  };

  useEffect(() => {
    fetchPayrollPeriods();
    fetchEmployees();
    fetchEmployeeCategories();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPayrollRecords(selectedPeriod);
      fetchPayrollSummary(selectedPeriod);
    } else {
      setSummary(null);
    }
  }, [selectedPeriod, payrollTemporaryAllowances]);

  useEffect(() => {
    setRecordsPage(1);
    setRecordSearch("");
  }, [selectedPeriod]);

  const formatCurrency = (amount) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount || 0);

  const getAllowanceLabel = (type) => {
    const labels = {
      housingAllowance: "Housing Allowance",
      tntAllowance: "Transport & Travel Allowance",
      clothsAllowances: "Clothing Allowance",
      otherAllowances: "Other Allowance",
      nssAllowances: "NSS Allowance",
    };
    return labels[type] || type;
  };

  const filteredPayrollRecords = useMemo(() => {
    const q = String(recordSearch || "").trim().toLowerCase();
    if (!q) return payrollRecords;

    const norm = (v) => String(v ?? "").toLowerCase();

    return (payrollRecords || []).filter((r) => {
      const emp = r?.employee ?? {};
      const employeeId = norm(emp.id) || norm(r.employeeId) || norm(r.employee_id);
      const firstName = norm(emp.firstName) || norm(emp.firstname);
      const lastName  = norm(emp.lastName)  || norm(emp.lastname);
      const employeeName = norm(r.employeeName) || norm(r.employee_name) || norm(`${firstName} ${lastName}`.trim());
      const department = norm(emp.department) || norm(emp.departmentName) || norm(r.department) || norm(r.departmentName);
      const bank = norm(emp.bank) || norm(emp.bankName) || norm(r.bank) || norm(r.bankName);
      const accountName = norm(emp.accountName) || norm(r.accountName) || norm(r.account_name);
      const status = norm(r.status);
      const net = norm(r.netSalary);
      const gross = norm(r.grossSalary);
      const overtimePay = norm(r.overtimePay);
      const basicSalary = norm(r.basicSalary);

      return (
        employeeName.includes(q) ||
        employeeId.includes(q) ||
        department.includes(q) ||
        bank.includes(q) ||
        accountName.includes(q) ||
        status.includes(q) ||
        net.includes(q) ||
        gross.includes(q) ||
        overtimePay.includes(q) ||
        basicSalary.includes(q)
      );
    });
  }, [payrollRecords, recordSearch]);

  const totalFilteredRecords = filteredPayrollRecords.length;

  const { paginatedPayrollRecords, totalRecordPages } = useMemo(() => {
    const size = Number(recordsPageSize);
    if (!size || size <= 0) {
      return { paginatedPayrollRecords: filteredPayrollRecords, totalRecordPages: 1 };
    }
    const pages = Math.max(1, Math.ceil(filteredPayrollRecords.length / size));
    const safePage = Math.min(Math.max(1, recordsPage), pages);
    const start = (safePage - 1) * size;
    const end = start + size;
    return {
      paginatedPayrollRecords: filteredPayrollRecords.slice(start, end),
      totalRecordPages: pages,
    };
  }, [filteredPayrollRecords, recordsPage, recordsPageSize]);

  useEffect(() => {
    setRecordsPage(1);
  }, [recordSearch, recordsPageSize]);

  const goToPrevPage = () => setRecordsPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setRecordsPage((p) => Math.min(totalRecordPages, p + 1));

  const openCreditModal = () => {
    setSelectedEmployeesForCredit([]);
    setCreditValue("");
    setCreditDescription("");
    setShowCreditModal(true);
  };

  const toggleEmployeeCreditSelection = (employeeId) => {
    if (selectedEmployeesForCredit.includes(employeeId)) {
      setSelectedEmployeesForCredit(selectedEmployeesForCredit.filter(id => id !== employeeId));
    } else {
      setSelectedEmployeesForCredit([...selectedEmployeesForCredit, employeeId]);
    }
  };

  const selectAllEmployeesForCredit = () => {
    if (selectedEmployeesForCredit.length === filteredEmployees.length) {
      setSelectedEmployeesForCredit([]);
    } else {
      setSelectedEmployeesForCredit(filteredEmployees.map(emp => emp.id));
    }
  };

  const applyCredits = async () => {
    if (selectedEmployeesForCredit.length === 0) {
      setError("Please select at least one employee");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!creditValue || isNaN(parseFloat(creditValue)) || parseFloat(creditValue) <= 0) {
      setError("Please enter a valid credit amount");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newCreditAmounts = { ...creditAmounts };
    selectedEmployeesForCredit.forEach(employeeId => {
      newCreditAmounts[employeeId] = parseFloat(creditValue);
    });

    setCreditAmounts(newCreditAmounts);
    setShowCreditModal(false);
    setSuccess(`Credit of GHS ${parseFloat(creditValue).toFixed(2)} applied to ${selectedEmployeesForCredit.length} employee(s)`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const removeCredit = (employeeId) => {
    const newCreditAmounts = { ...creditAmounts };
    delete newCreditAmounts[employeeId];
    setCreditAmounts(newCreditAmounts);
    setSuccess("Credit removed from employee");
    setTimeout(() => setSuccess(""), 3000);
  };

  const clearAllCredits = () => {
    setCreditAmounts({});
    setSuccess("All credits cleared");
    setTimeout(() => setSuccess(""), 3000);
  };

  // NEW: Function to group payroll periods by month and category
// NEW: Function to group payroll periods by month based on END DATE
const getGroupedPeriods = () => {
  const grouped = {};
  
  payrollPeriods.forEach(period => {
    if (!period.endDate) return;
    
    const date = new Date(period.endDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const monthKey = `${year}-${month}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = {
        year,
        month,
        monthName,
        periods: []
      };
    }
    
    grouped[monthKey].periods.push(period);
  });
  
  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(grouped).sort((a, b) => {
    const [yearA, monthA] = a.split('-').map(Number);
    const [yearB, monthB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearB - yearA;
    return monthB - monthA;
  });
  
  return { grouped, sortedMonths };
};

  // NEW: Toggle month expansion
  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // NEW: Expand all months
  const expandAllMonths = () => {
    const { grouped } = getGroupedPeriods();
    const allExpanded = {};
    Object.keys(grouped).forEach(key => {
      allExpanded[key] = true;
    });
    setExpandedMonths(allExpanded);
  };

  // NEW: Collapse all months
  const collapseAllMonths = () => {
    setExpandedMonths({});
  };

  const { grouped, sortedMonths } = getGroupedPeriods();

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">

      
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content with dynamic margin */}
      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        {/* Header Component - REPLACE the old header section */}
        <Header
          toggleSidebar={toggleSidebar}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 max-w-full px-2 md:px-4 py-6">
          {/* Page Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
              <p className="text-gray-600">Manage employee payroll and compensation</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAllowanceModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Temporary Allowances
              </button>
              <Link to="/payslip">
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  Payslip Generator
                </button>
              </Link>
            </div>
          </section>

          {/* Status Messages */}
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 mt-4 rounded-lg">{error}</div>}
          {success && <div className="bg-green-100 text-green-700 px-4 py-3 mt-4 rounded-lg">{success}</div>}

          {/* Temporary Allowances Summary */}
          {Object.keys(payrollTemporaryAllowances).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium text-yellow-800">Temporary allowances applied to {Object.keys(payrollTemporaryAllowances).length} employee(s)</span>
                </div>
                <button onClick={() => setPayrollTemporaryAllowances({})} className="text-yellow-700 hover:text-yellow-900 text-sm font-medium">
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Credits Summary */}
          {Object.keys(creditAmounts).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">
                    Credits applied to {Object.keys(creditAmounts).length} employee(s) - Total: GHS {Object.values(creditAmounts).reduce((sum, val) => sum + val, 0).toFixed(2)}
                  </span>
                </div>
                <button onClick={clearAllCredits} className="text-green-700 hover:text-green-900 text-sm font-medium">
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {selectedPeriod && (
              <>
                <button
                  onClick={() => fetchPayrollRecords(selectedPeriod)}
                  className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Refresh Data
                </button>
                <button
                  onClick={() => {
                    if (selectedPeriod) {
                      fetchPayrollSummary(selectedPeriod);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center"
                  disabled={!selectedPeriod}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                  Update Summary
                </button>
                <button
                  onClick={() => exportPayrollRecords('all')}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
                  title="Export all payroll records"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export All Excel
                </button>
                {filteredPayrollRecords.length < payrollRecords.length && (
                  <button
                    onClick={() => exportPayrollRecords('filtered')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-md flex items-center"
                    title="Export only filtered/search results"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Export Filtered ({filteredPayrollRecords.length})
                  </button>
                )}
                <button
                  onClick={exportBasicPayrollRecords}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
                  title="Export simplified summary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Export Summary
                </button>
                <button
                  onClick={openCreditModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md flex items-center"
                  title="Add credits to employees"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662c.722-.481 1.324-1.256 1.324-2.246 0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
                  </svg>
                  Add Credits
                </button>
                <button
                  onClick={exportBankSpreadsheet}
                  disabled={!selectedPeriod || payrollRecords.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md flex items-center"
                >
                  Export Bank
                </button>
                <button
                  onClick={exportSsnitSpreadsheet}
                  disabled={!selectedPeriod || payrollRecords.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md flex items-center"
                >
                  Export SSNIT
                </button>
              </>
            )}
          </div>

          {/* Payroll Summary */}
          {summary && (
            <div className="mt-6">
              <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {summary.periodName || 'Payroll Summary'}
                    </h2>
                    {summary.periodStart && summary.periodEnd && (
                      <p className="text-sm text-gray-500">
                        {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
                        {summary.periodCategory && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">{summary.periodCategory}</span>}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {summary.employeeCount} Employee{summary.employeeCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total Net Pay</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNetAmount)}</div>
                  <div className="text-xs text-gray-400 mt-1">After all deductions</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total Tax</div>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalTax)}</div>
                  <div className="text-xs text-gray-400 mt-1">PAYE Tax withheld</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total SSNIT</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalSsnit)}</div>
                  <div className="text-xs text-gray-400 mt-1">Employee + Employer</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total Gross</div>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.totalGrossSalary || 0)}</div>
                  <div className="text-xs text-gray-400 mt-1">Before deductions</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Total Leave Days</div>
                  <div className="text-2xl font-bold text-orange-600">{summary.totalLeaveDays || 0}</div>
                  <div className="text-xs text-gray-400 mt-1">Across {summary.employeesOnLeave || 0} employees</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500">Employer Cost</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {formatCurrency((summary.totalGrossSalary || 0) + (summary.totalSsnitEmployer || 0))}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Gross + Employer SSNIT</div>
                </div>
              </div>
            </div>
          )}

          {/* Create Payroll Period */}
          <div className="mt-6 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Payroll Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                placeholder="Period Name"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={newPeriod.startDate}
                onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={newPeriod.endDate}
                onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPeriod.category}
                onChange={(e) => setNewPeriod({ ...newPeriod, category: e.target.value })}
                className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="convertExcessToOvertime"
                checked={newPeriod.convertExcessToOvertime !== false}
                onChange={(e) => setNewPeriod({ ...newPeriod, convertExcessToOvertime: e.target.checked })}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              />
              <label htmlFor="convertExcessToOvertime" className="ml-2 text-sm text-gray-700">
                Convert excess days to overtime
              </label>
              <span className="ml-2 text-xs text-gray-500">
                (When unchecked, all days worked count as regular days)
              </span>
            </div>
            <button onClick={createPayrollPeriod} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 mt-4 rounded-md">
              Create Period
            </button>
          </div>

          {/* Include Basic Salary Toggle */}
          <div className="mb-3 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeBasicSalary}
                onChange={(e) => setIncludeBasicSalary(e.target.checked)}
              />
              <span className="font-medium">Use Monthly Basic Salary (Prorated by Paid Days)</span>
              <span className="text-xs text-gray-500">(applies when you click Generate)</span>
            </label>
          </div>

          {/* Payroll Periods - Grouped by Month */}
          <div className="overfl mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Payroll Periods by Month</h2>
              <div className="flex gap-2">
                <button
                  onClick={expandAllMonths}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllMonths}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  Collapse All
                </button>
              </div>
            </div>
            
            {sortedMonths.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No payroll periods created yet. Create your first period above.
              </div>
            ) : (
              sortedMonths.map(monthKey => {
                const monthData = grouped[monthKey];
                const isExpanded = expandedMonths[monthKey];
                const periodCount = monthData.periods.length;
                
                return (
                  <div key={monthKey} className="border-b border-gray-200 last:border-b-0">
                    {/* Month Header */}
                    <div
                      className="px-4 py-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                      onClick={() => toggleMonth(monthKey)}
                    >
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-5 w-5 mr-2 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-gray-800">
                          {monthData.monthName} {monthData.year}
                        </span>
                        <span className="ml-3 text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          {periodCount} period{periodCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                      </div>
                    </div>
                    
                    {/* Periods Table */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm text-gray-700">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-3 font-medium">Period Name</th>
                              <th className="px-4 py-3 font-medium">Category</th>
                              <th className="px-4 py-3 font-medium">Start Date</th>
                              <th className="px-4 py-3 font-medium">End Date</th>
                              <th className="px-4 py-3 font-medium">Excess → OT</th>
                              <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthData.periods.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50 border-t border-gray-200">
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                                    {p.category || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{p.startDate}</td>
                                <td className="px-4 py-3">{p.endDate}</td>
                                <td className="px-4 py-3">
                                  {p.convertExcessToOvertime ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Yes</span>
                                  ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 space-x-2">
                                  <button 
                                    onClick={() => setSelectedPeriod(p.id)} 
                                    className={`${selectedPeriod === p.id ? 'bg-blue-100 text-blue-800' : 'text-blue-600 hover:text-blue-800'} font-medium px-2 py-1 rounded`}
                                  >
                                    {selectedPeriod === p.id ? 'Selected' : 'View'}
                                  </button>
                                  <button 
                                    onClick={() => generatePayroll(p.id)} 
                                    className="text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded"
                                  >
                                    Generate
                                  </button>
                                  <button 
                                    onClick={() => processPayroll(p.id)} 
                                    className="text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded"
                                  >
                                    Process
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Payroll Records Table */}
          {selectedPeriod && (
            <div className="overflow-x-auto mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {!noRecordsMessage && (
                    <div className="p-4 border-b border-gray-200 bg-white">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Search Payroll Records</label>
                          <input
                            type="text"
                            value={recordSearch}
                            onChange={(e) => setRecordSearch(e.target.value)}
                            placeholder="Search by name, employee id, department, bank, account name, status, or amount..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Showing {paginatedPayrollRecords.length} of {totalFilteredRecords} record(s)
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rows per page</label>
                            <select
                              value={recordsPageSize}
                              onChange={(e) => setRecordsPageSize(Number(e.target.value))}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={250}>250</option>
                              <option value={0}>All</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={goToPrevPage}
                              disabled={recordsPage <= 1 || totalRecordPages <= 1}
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Prev
                            </button>
                            <div className="text-sm text-gray-700">
                              Page <span className="font-medium">{Math.min(recordsPage, totalRecordPages)}</span> of{" "}
                              <span className="font-medium">{totalRecordPages}</span>
                            </div>
                            <button
                              onClick={goToNextPage}
                              disabled={recordsPage >= totalRecordPages || totalRecordPages <= 1}
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {noRecordsMessage ? (
                    <div className="p-8 text-center">
                      <div className="text-yellow-600 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">{noRecordsMessage}</h3>
                      <p className="text-gray-600 mb-4">Please ensure attendance records are available for this period before generating payroll.</p>
                      <button onClick={() => generatePayroll(selectedPeriod)} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
                        Generate Payroll
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm text-gray-700">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 font-medium">Employee</th>
                            <th className="px-4 py-3 font-medium">Total Days</th>
                            <th className="px-4 py-3 font-medium">Leave Days</th>
                            <th className="px-4 py-3 font-medium">Holiday Days</th>
                            <th className="px-4 py-3 font-medium">Weekend Days</th>
                            <th className="px-4 py-3 font-medium">Physical Working Days</th>
                            <th className="px-4 py-3 font-medium">Total Paid Days</th>
                            <th className="px-4 py-3 font-medium">Total Hours</th>
                            <th className="px-4 py-3 font-medium">Overtime Hours</th>
                            <th className="px-4 py-3 font-medium">Basic Salary</th>
                            <th className="px-4 py-3 font-medium">Overtime Pay</th>
                            <th className="px-4 py-3 font-medium">Housing Allowance</th>
                            <th className="px-4 py-3 font-medium">TnT Allowance</th>
                            <th className="px-4 py-3 font-medium">Clothing Allowance</th>
                            <th className="px-4 py-3 font-medium">Other Allowances</th>
                            <th className="px-4 py-3 font-medium">NSS Allowance</th>
                            <th className="px-4 py-3 font-medium">Total Allowances</th>
                            <th className="px-4 py-3 font-medium">Gross Salary</th>
                            <th className="px-4 py-3 font-medium">Taxable</th>
                            <th className="px-4 py-3 font-medium">Employee SSNIT</th>
                            <th className="px-4 py-3 font-medium">Employer SSNIT</th>
                            <th className="px-4 py-3 font-medium">Total SSNIT</th>
                            <th className="px-4 py-3 font-medium">Taxable Income</th>
                            <th className="px-4 py-3 font-medium">Non-Taxable Income</th>
                            <th className="px-4 py-3 font-medium">Tax</th>
                            <th className="px-4 py-3 font-medium">Credit Amount</th>
                            <th className="px-4 py-3 font-medium">Net Salary</th>
                            <th className="px-4 py-3 font-medium">Employer Cost</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                          {paginatedPayrollRecords.map((r, idx) => {
                            const employeeId = r.employee?.id || r.employeeId;
                            const rowKey = r.id ?? `${employeeId}-${selectedPeriod}-${idx}`;
                            const hasTemporaryAllowances = r.usesTemporaryAllowances || payrollTemporaryAllowances[employeeId];
                            const hasLeaveDays = r.leaveDays && r.leaveDays > 0;
                            
                            return (
                              <tr key={rowKey} className="hover:bg-gray-50 border-t border-gray-200">
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    {r.employee?.firstName} {r.employee?.lastName}
                                    {hasTemporaryAllowances && (
                                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full" title="Temporary allowances applied">
                                        Temp
                                      </span>
                                    )}
                                    {hasLeaveDays && (
                                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full" title={`${r.leaveDays} leave days`}>
                                        Leave
                                      </span>
                                    )}
                                  </div>
                                 </td>
                                <td className="px-4 py-3">{r.totalDaysInPeriod || 'N/A'}</td>
                                <td className={`px-4 py-3 ${hasLeaveDays ? 'bg-blue-50 font-medium text-blue-700' : ''}`}>
                                  {r.leaveDays || 0}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {r.holidayDays > 0 ? (
                                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                      {r.holidayDays} days
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">0 days</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {r.weekendDays > 0 && (
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                                      {r.weekendDays} days
                                    </span>
                                  )}
                                </td>
                               
                                <td className="px-4 py-3">{r.workingDays}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">
                                  {(r.workingDays || 0) + (r.leaveDays || 0)}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                  Worked: {(r.totalHours - (r.leaveHours || 0))?.toFixed(2)} hrs<br/>
                                  Leave: {(r.leaveHours || 0)?.toFixed(2)} hrs<br/>
                                  <strong>Total: {r.totalHours?.toFixed(2)} hrs</strong>
                                </td>
                                <td className="px-4 py-3">{(r.overtimeHours)}hrs</td>
                                <td className="px-4 py-3">{formatCurrency(r.basicSalary)}</td>
                                <td className="px-4 py-3">{formatCurrency(r.overtimePay)}</td>
                                <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                                  {formatCurrency(r.rentAllowance || 0)}
                                  {hasTemporaryAllowances && (
                                    <span className="ml-1 text-xs text-yellow-600">(Temp)</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                                  {formatCurrency(r.transportAllowance || 0)}
                                  {hasTemporaryAllowances && (
                                    <span className="ml-1 text-xs text-yellow-600">(Temp)</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                                  {formatCurrency(r.clothingAllowance || 0)}
                                  {hasTemporaryAllowances && (
                                    <span className="ml-1 text-xs text-yellow-600">(Temp)</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                                  {formatCurrency(r.otherAllowance || 0)}
                                  {hasTemporaryAllowances && (
                                    <span className="ml-1 text-xs text-yellow-600">(Temp)</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 ${hasTemporaryAllowances ? 'bg-yellow-50 font-medium' : ''}`}>
                                  {formatCurrency(r.nssAllowance || 0)}
                                  {hasTemporaryAllowances && (
                                    <span className="ml-1 text-xs text-yellow-600">(Temp)</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-blue-600">
                                  {formatCurrency(getTotalAllowance(r))}
                                </td>
                                <td className="px-4 py-3">{formatCurrency(r.grossSalary)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    r.useNonTaxableAllowances ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {r.useNonTaxableAllowances ? 'Non-Taxable' : 'Taxable'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">{formatCurrency(r.ssnitEmployee)}</td>
                                <td className="px-4 py-3">{formatCurrency(r.ssnitEmployer)}</td>
                                <td className="px-4 py-3">
                                  {formatCurrency((r.ssnitEmployee || 0) + (r.ssnitEmployer || 0))}
                                </td>
                                <td className="px-4 py-3 font-medium text-orange-600">
                                  {formatCurrency(r.taxableIncome || ((r.grossSalary || 0) - (r.ssnitEmployee || 0)))}
                                </td>
                                <td className="px-4 py-3 font-medium text-purple-600">
                                  {formatCurrency(r.nonTaxableIncome || 0)}
                                  {r.useNonTaxableAllowances && (
                                    <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                      NSS Only
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">{formatCurrency(r.payeTax)}</td>
                                <td className="px-4 py-3 font-medium text-indigo-600">
                                  {r.creditAmount > 0 ? formatCurrency(r.creditAmount) : '-'}
                                  {r.creditAmount > 0 && (
                                    <button
                                      onClick={() => removeCredit(r.employee?.id || r.employeeId)}
                                      className="ml-2 text-red-600 hover:text-red-800 text-xs"
                                      title="Remove credit"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(r.netSalary)}</td>
                                <td className="px-4 py-3 font-medium text-green-500">
                                  {formatCurrency((r.grossSalary || 0) + (r.ssnitEmployer || 0))}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    r.status === 'Processed' ? 'bg-green-100 text-green-800' :
                                    r.status === 'Generated' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {hasTemporaryAllowances && (
                                    <button
                                      onClick={() => removeTemporaryAllowances(employeeId)}
                                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      title="Remove temporary allowances"
                                    >
                                      Remove Temp
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Allowance Modal */}
      {showAllowanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add Temporary Allowances</h2>
              <button 
                onClick={() => setShowAllowanceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Temporary Allowances Notice</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      These allowances are temporary and will only apply to the current payroll period. 
                      They will not affect the employee's permanent profile data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Allowance Details</h3>
                  <button
                    onClick={addNewAllowanceField}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Another Allowance
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {temporaryAllowances.map((allowance, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={allowance.enabled}
                            onChange={() => toggleAllowance(index)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Allowance {index + 1}
                          </span>
                        </div>
                        {temporaryAllowances.length > 1 && (
                          <button
                            onClick={() => removeAllowance(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {allowance.enabled && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={allowance.type}
                              onChange={e => updateAllowance(index, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="housingAllowance">Housing Allowance</option>
                              <option value="tntAllowance">Transport & Travel Allowance</option>
                              <option value="clothsAllowances">Clothing Allowance</option>
                              <option value="otherAllowances">Other Allowances</option>
                              <option value="nssAllowance">NSS Allowances</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                            <input
                              type="number"
                              value={allowance.amount}
                              onChange={e => updateAllowance(index, 'amount', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter amount"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <input
                              type="text"
                              value={allowance.description}
                              onChange={e => updateAllowance(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Description of allowance"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    placeholder="Enter grade"
                    value={filters.grade}
                    onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                  <input
                    type="text"
                    placeholder="Enter work type"
                    value={filters.workType}
                    onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Enter category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Select Employees</h3>
                  <button 
                    onClick={selectAllEmployees}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                  {filteredEmployees.length > 0 ? (
                    <div>
                      {filteredEmployees.map(employee => (
                        <div key={employee.id} className="flex items-center p-3 border-b border-gray-200 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={() => toggleEmployeeSelection(employee.id)}
                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="ml-3 text-gray-700">
                            {employee.firstName} {employee.lastName} - {employee.department || 'No Department'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No employees found</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowAllowanceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={addTemporaryAllowances}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={selectedEmployees.length === 0 || !temporaryAllowances.some(a => a.enabled && a.amount)}
              >
                Add Temporary to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Add Credits</h2>
              <button 
                onClick={() => setShowCreditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Credits Notice</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Credits are added to the employee's net salary AFTER all regular calculations and deductions.
                      This is useful for bonuses, adjustments, or special payments.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Amount (GHS)
                </label>
                <input
                  type="number"
                  value={creditValue}
                  onChange={(e) => setCreditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter amount to credit"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Reason for credit (e.g., Performance Bonus)"
                />
              </div>

              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    placeholder="Filter by grade"
                    value={filters.grade}
                    onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                  <input
                    type="text"
                    placeholder="Filter by work type"
                    value={filters.workType}
                    onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Filter by category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Select Employees</h3>
                  <button 
                    onClick={selectAllEmployeesForCredit}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    {selectedEmployeesForCredit.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden max-h-60 overflow-y-auto">
                  {filteredEmployees.length > 0 ? (
                    <div>
                      {filteredEmployees.map(employee => {
                        const hasExistingCredit = creditAmounts[employee.id];
                        return (
                          <div key={employee.id} className="flex items-center p-3 border-b border-gray-200 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={selectedEmployeesForCredit.includes(employee.id)}
                              onChange={() => toggleEmployeeCreditSelection(employee.id)}
                              className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="ml-3 text-gray-700 flex-1">
                              {employee.firstName} {employee.lastName} - {employee.department || 'No Department'}
                            </span>
                            {hasExistingCredit && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Current: GHS {creditAmounts[employee.id].toFixed(2)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">No employees found</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowCreditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={applyCredits}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                disabled={selectedEmployeesForCredit.length === 0 || !creditValue || parseFloat(creditValue) <= 0}
              >
                Apply Credit to {selectedEmployeesForCredit.length} Employee{selectedEmployeesForCredit.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payroll;