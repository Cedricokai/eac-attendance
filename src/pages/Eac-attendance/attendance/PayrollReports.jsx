// PayrollReports.jsx (full version with requested changes)
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";
import * as XLSX from "xlsx";

function PayrollReports() {
  const [reportData, setReportData] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Credits tab state
  const [activeTab, setActiveTab] = useState("reports");
  const [pendingCredits, setPendingCredits] = useState([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditStatusFilter, setCreditStatusFilter] = useState("ALL");
  
  // Refresh key for manual refresh
  const [refreshKey, setRefreshKey] = useState(0);

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
  const getToken = () => localStorage.getItem("jwtToken");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` },
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
      const token = getToken();
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
      });
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ---------- Credits ----------
  const fetchPendingCredits = async () => {
    setCreditsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required. Please log in again.");
        setCreditsLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/payroll/pending-credits/all`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include"
      });
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setCreditsLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch pending credits: ${res.status}`);
      const data = await res.json();
      setPendingCredits(data.pendingCredits || []);
    } catch (err) {
      console.error("Error fetching pending credits:", err);
      setError(err.message);
    } finally {
      setCreditsLoading(false);
    }
  };

  // ---------- Refresh functions ----------
  const refreshReportData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/payroll/reports/all`;
      console.log("Manually refreshing report data from:", url);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include"
      });
      
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", res.status, errorText);
        throw new Error(`Failed to fetch report data: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Report data refreshed:", data);
      
      setReportData(data);
      setAvailableMonths(data.availableMonths || []);
      setAvailableCategories(data.availableCategories || []);
      
      if (data.availableMonths?.length > 0 && !selectedMonth) {
        setSelectedMonth(data.availableMonths[0]);
      }
      
      // Show success toast
      const successMsg = document.createElement('div');
      successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-500';
      successMsg.textContent = 'Data refreshed successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        successMsg.style.opacity = '0';
        setTimeout(() => successMsg.remove(), 500);
      }, 2000);
      
    } catch (err) {
      console.error("Refresh error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCreditsData = async () => {
    await fetchPendingCredits();
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-500';
    successMsg.textContent = 'Credits data refreshed successfully!';
    document.body.appendChild(successMsg);
    setTimeout(() => {
      successMsg.style.opacity = '0';
      setTimeout(() => successMsg.remove(), 500);
    }, 2000);
  };

  // ---------- Fetch report data ----------
  const fetchReportData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) {
        setError("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/payroll/reports/all`;
      console.log("Fetching report data from:", url);
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include"
      });
      
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", res.status, errorText);
        throw new Error(`Failed to fetch report data: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Report data received:", data);
      
      setReportData(data);
      setAvailableMonths(data.availableMonths || []);
      setAvailableCategories(data.availableCategories || []);
      
      if (data.availableMonths?.length > 0 && !selectedMonth) {
        setSelectedMonth(data.availableMonths[0]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [refreshKey]);

  useEffect(() => {
    if (activeTab === "credits") {
      fetchPendingCredits();
    }
  }, [activeTab]);

  // ---------- Helpers ----------
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-GH", { 
      style: "currency", 
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const formatMonthDisplay = (yearMonth) => {
    if (!yearMonth) return "-";
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Filter data by selected month
  const filteredReportData = useMemo(() => {
    if (!reportData?.reportData) return reportData;
    if (!selectedMonth) return reportData;
    
    const filtered = {};
    for (const [category, monthsData] of Object.entries(reportData.reportData)) {
      if (monthsData[selectedMonth]) {
        filtered[category] = { [selectedMonth]: monthsData[selectedMonth] };
      }
    }
    return { ...reportData, reportData: filtered };
  }, [reportData, selectedMonth]);

  // Category expand/collapse
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const expandAllCategories = () => {
    const allExpanded = {};
    availableCategories.forEach(cat => {
      allExpanded[cat] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAllCategories = () => {
    setExpandedCategories({});
  };

  // ---------- Export functions ----------
  const exportToExcel = () => {
    if (!reportData?.reportData) return;

    const rows = [];
    // Updated headers with split SSNIT and dual net
    rows.push(["Category", "Month", "Period Name", "Employee Count", "Gross Salary (GHS)", 
               "Net (Base - No Credits/Loans) (GHS)", "Net (Final - with Credits/Loans) (GHS)", 
               "PAYE Tax (GHS)", "Employee SSNIT (GHS)", "Employer SSNIT (GHS)"]);

    for (const [category, monthsData] of Object.entries(reportData.reportData)) {
      for (const [month, totals] of Object.entries(monthsData)) {
        const netBase = totals.totalGrossSalary - totals.totalSsnitEmployee - totals.totalTax;
        rows.push([
          category,
          formatMonthDisplay(month),
          totals.periodName || "-",
          totals.employeeCount,
          totals.totalGrossSalary?.toFixed(2) || "0.00",
          netBase.toFixed(2),
          totals.totalNetSalary?.toFixed(2) || "0.00",
          totals.totalTax?.toFixed(2) || "0.00",
          totals.totalSsnitEmployee?.toFixed(2) || "0.00",
          totals.totalSsnitEmployer?.toFixed(2) || "0.00"
        ]);
      }
    }

    if (reportData.grandTotals) {
      const grandNetBase = reportData.grandTotals.totalGrossSalary - reportData.grandTotals.totalSsnitEmployee - reportData.grandTotals.totalTax;
      rows.push(["", "", "", "", "", "", "", "", "", ""]);
      rows.push([
        "GRAND TOTAL", "", "", Math.round(reportData.grandTotals.totalEmployees || 0),
        reportData.grandTotals.totalGrossSalary?.toFixed(2) || "0.00",
        grandNetBase.toFixed(2),
        reportData.grandTotals.totalNetSalary?.toFixed(2) || "0.00",
        reportData.grandTotals.totalTax?.toFixed(2) || "0.00",
        reportData.grandTotals.totalSsnitEmployee?.toFixed(2) || "0.00",
        reportData.grandTotals.totalSsnitEmployer?.toFixed(2) || "0.00"
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{wch:20},{wch:15},{wch:20},{wch:12},{wch:18},{wch:18},{wch:18},{wch:15},{wch:18},{wch:18}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll Report");
    XLSX.writeFile(workbook, `Payroll-Report-${selectedMonth || "All"}.xlsx`);
  };

  const exportCreditsToExcel = () => {
    const filteredCredits = creditStatusFilter === "ALL" ? pendingCredits : pendingCredits.filter(c => c.status === creditStatusFilter);
    if (filteredCredits.length === 0) return;

    const rows = [["ID", "Employee Name", "Amount (GHS)", "Reason", "Status", "Created Date", "Created By", "Applied To Period", "Applied Date"]];
    filteredCredits.forEach(credit => {
      rows.push([
        credit.id, credit.employeeName, credit.amount.toFixed(2), credit.reason || "-", credit.status,
        formatDate(credit.createdDate), credit.createdBy || "System",
        credit.appliedToPeriodName || "-", credit.appliedDate ? formatDate(credit.appliedDate) : "-"
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = [{wch:8},{wch:25},{wch:15},{wch:30},{wch:12},{wch:20},{wch:15},{wch:15},{wch:20}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pending Credits");
    XLSX.writeFile(workbook, `Pending-Credits-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPLIED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredCredits = () => {
    if (creditStatusFilter === "ALL") return pendingCredits;
    return pendingCredits.filter(credit => credit.status === creditStatusFilter);
  };

  const getStatusCounts = () => ({
    ALL: pendingCredits.length,
    PENDING: pendingCredits.filter(c => c.status === 'PENDING').length,
    APPLIED: pendingCredits.filter(c => c.status === 'APPLIED').length,
    CANCELLED: pendingCredits.filter(c => c.status === 'CANCELLED').length
  });

  const statusCounts = getStatusCounts();

  // ---------- Summary data for selected month ----------
  const comparisonData = useMemo(() => {
    if (!filteredReportData?.reportData || !selectedMonth) return [];
    
    const data = [];
    for (const [category, monthsData] of Object.entries(filteredReportData.reportData)) {
      const monthData = monthsData[selectedMonth];
      if (monthData) {
        data.push({ category, ...monthData, monthKey: selectedMonth });
      }
    }
    return data.sort((a, b) => b.totalNetSalary - a.totalNetSalary);
  }, [filteredReportData, selectedMonth]);

  const totalForSelectedMonth = useMemo(() => {
    if (!comparisonData.length) return null;
    return {
      totalNetSalary: comparisonData.reduce((sum, d) => sum + d.totalNetSalary, 0),
      totalTax: comparisonData.reduce((sum, d) => sum + d.totalTax, 0),
      totalSsnitEmployee: comparisonData.reduce((sum, d) => sum + d.totalSsnitEmployee, 0),
      totalSsnitEmployer: comparisonData.reduce((sum, d) => sum + d.totalSsnitEmployer, 0),
      totalGrossSalary: comparisonData.reduce((sum, d) => sum + d.totalGrossSalary, 0),
      employeeCount: comparisonData.reduce((sum, d) => sum + d.employeeCount, 0)
    };
  }, [comparisonData]);

  // ---------- JSX ----------
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div 
        className={`fixed inset-y-0 left-0 bg-white shadow-md z-30 transition-all duration-300 sidebar-container ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <MainSidebar isCollapsed={!sidebarOpen} />
      </div>

      {sidebarOpen && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'}`}>
        <Header toggleSidebar={toggleSidebar} user={user} onLogout={handleLogout} />
        
        <main className="flex-1 max-w-full px-2 md:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payroll Reports</h1>
              <p className="text-gray-600">View payroll summaries by category and month</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  if (activeTab === "reports") {
                    refreshReportData();
                  } else {
                    refreshCreditsData();
                  }
                }}
                disabled={loading || creditsLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                title="Refresh data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${(loading || creditsLoading) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {(loading || creditsLoading) ? 'Refreshing...' : 'Refresh'}
              </button>
              <Link to="/payroll">
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Payroll
                </button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === "reports" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
                Payroll Reports
              </button>
              <button
                onClick={() => setActiveTab("credits")}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === "credits" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Credits
                {statusCounts.PENDING > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{statusCounts.PENDING}</span>
                )}
              </button>
            </nav>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ---------- REPORTS TAB ---------- */}
          {activeTab === "reports" && (
            <>
              {availableMonths.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                      >
                        {availableMonths.map(month => (
                          <option key={month} value={month}>{formatMonthDisplay(month)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={expandAllCategories} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                        Expand All
                      </button>
                      <button onClick={collapseAllCategories} className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                        Collapse All
                      </button>
                      <button onClick={exportToExcel} disabled={!reportData} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md flex items-center gap-1 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* Summary Table */}
              {!loading && comparisonData.length > 0 && totalForSelectedMonth && (
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg p-4">
                    <h2 className="text-xl font-bold text-white">Summary for {formatMonthDisplay(selectedMonth)}</h2>
                    <p className="text-blue-100 text-sm">Comparison across all categories</p>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-b-lg shadow-sm border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Employees</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Gross Salary</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Net (Base)</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Net (Final)</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">PAYE Tax</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-700">Employee SSNIT</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonData.map((item, idx) => {
                          const netBase = item.totalGrossSalary - item.totalSsnitEmployee - item.totalTax;
                          return (
                            <tr key={item.category} className={`border-t border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3 font-medium text-gray-800">{item.category}</td>
                              <td className="px-4 py-3 text-right">{item.employeeCount}</td>
                              <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(item.totalGrossSalary)}</td>
                              <td className="px-4 py-3 text-right text-blue-600 font-semibold">{formatCurrency(netBase)}</td>
                              <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(item.totalNetSalary)}</td>
                              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(item.totalTax)}</td>
                              <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(item.totalSsnitEmployee)}</td>
                              <td className="px-4 py-3 text-center text-xs text-gray-500">{item.periodName || '-'}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                          <td className="px-4 py-3 text-gray-800">TOTAL</td>
                          <td className="px-4 py-3 text-right">{totalForSelectedMonth.employeeCount}</td>
                          <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(totalForSelectedMonth.totalGrossSalary)}</td>
                          <td className="px-4 py-3 text-right text-blue-700">
                            {formatCurrency(totalForSelectedMonth.totalGrossSalary - totalForSelectedMonth.totalSsnitEmployee - totalForSelectedMonth.totalTax)}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totalForSelectedMonth.totalNetSalary)}</td>
                          <td className="px-4 py-3 text-right text-red-700">{formatCurrency(totalForSelectedMonth.totalTax)}</td>
                          <td className="px-4 py-3 text-right text-orange-700">{formatCurrency(totalForSelectedMonth.totalSsnitEmployee)}</td>
                          <td className="px-4 py-3 text-center"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Category View */}
              {!loading && filteredReportData?.reportData && Object.keys(filteredReportData.reportData).length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Detailed View by Category</h2>
                  {Object.entries(filteredReportData.reportData).map(([category, monthsData]) => {
                    const isExpanded = expandedCategories[category];
                    const categoryTotals = Object.values(monthsData).reduce((sum, data) => ({
                      totalNetSalary: sum.totalNetSalary + data.totalNetSalary,
                      totalTax: sum.totalTax + data.totalTax,
                      totalSsnitEmployee: sum.totalSsnitEmployee + data.totalSsnitEmployee,
                      totalSsnitEmployer: sum.totalSsnitEmployer + data.totalSsnitEmployer,
                      totalGrossSalary: sum.totalGrossSalary + data.totalGrossSalary,
                      employeeCount: sum.employeeCount + data.employeeCount
                    }), { totalNetSalary: 0, totalTax: 0, totalSsnitEmployee: 0, totalSsnitEmployer: 0, totalGrossSalary: 0, employeeCount: 0 });
                    
                    return (
                      <div key={category} className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <div className="px-4 py-3 bg-gray-100 hover:bg-gray-200 cursor-pointer flex justify-between items-center transition-colors" onClick={() => toggleCategory(category)}>
                          <div className="flex items-center gap-3">
                            <svg className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold text-gray-800">{category}</span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">{Object.keys(monthsData).length} months</span>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <span className="text-green-600">Net (Final): {formatCurrency(categoryTotals.totalNetSalary)}</span>
                            <span className="text-red-600">Tax: {formatCurrency(categoryTotals.totalTax)}</span>
                            <span className="text-orange-600">SSNIT (Emp): {formatCurrency(categoryTotals.totalSsnitEmployee)}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-4 py-2 text-left font-medium">Month</th>
                                  <th className="px-4 py-2 text-right font-medium">Employees</th>
                                  <th className="px-4 py-2 text-right font-medium">Gross Salary</th>
                                  <th className="px-4 py-2 text-right font-medium">Net (Base)</th>
                                  <th className="px-4 py-2 text-right font-medium">Net (Final)</th>
                                  <th className="px-4 py-2 text-right font-medium">PAYE Tax</th>
                                  <th className="px-4 py-2 text-right font-medium">SSNIT (Emp)</th>
                                  <th className="px-4 py-2 text-right font-medium">SSNIT (Empl)</th>
                                  <th className="px-4 py-2 text-left font-medium">Period</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(monthsData).map(([month, data]) => {
                                  const netBase = data.totalGrossSalary - data.totalSsnitEmployee - data.totalTax;
                                  return (
                                    <tr key={month} className="border-t border-gray-200 hover:bg-gray-50">
                                      <td className="px-4 py-2 font-medium">{formatMonthDisplay(month)}</td>
                                      <td className="px-4 py-2 text-right">{data.employeeCount}</td>
                                      <td className="px-4 py-2 text-right text-purple-600">{formatCurrency(data.totalGrossSalary)}</td>
                                      <td className="px-4 py-2 text-right text-blue-600 font-semibold">{formatCurrency(netBase)}</td>
                                      <td className="px-4 py-2 text-right text-green-600 font-semibold">{formatCurrency(data.totalNetSalary)}</td>
                                      <td className="px-4 py-2 text-right text-red-600">{formatCurrency(data.totalTax)}</td>
                                      <td className="px-4 py-2 text-right">{formatCurrency(data.totalSsnitEmployee)}</td>
                                      <td className="px-4 py-2 text-right">{formatCurrency(data.totalSsnitEmployer)}</td>
                                      <td className="px-4 py-2 text-xs text-gray-500">{data.periodName || '-'}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="bg-gray-100 font-semibold border-t border-gray-300">
                                  <td className="px-4 py-2">SUBTOTAL</td>
                                  <td className="px-4 py-2 text-right">{categoryTotals.employeeCount}</td>
                                  <td className="px-4 py-2 text-right text-purple-700">{formatCurrency(categoryTotals.totalGrossSalary)}</td>
                                  <td className="px-4 py-2 text-right text-blue-700">
                                    {formatCurrency(categoryTotals.totalGrossSalary - categoryTotals.totalSsnitEmployee - categoryTotals.totalTax)}
                                  </td>
                                  <td className="px-4 py-2 text-right text-green-700">{formatCurrency(categoryTotals.totalNetSalary)}</td>
                                  <td className="px-4 py-2 text-right text-red-700">{formatCurrency(categoryTotals.totalTax)}</td>
                                  <td className="px-4 py-2 text-right">{formatCurrency(categoryTotals.totalSsnitEmployee)}</td>
                                  <td className="px-4 py-2 text-right">{formatCurrency(categoryTotals.totalSsnitEmployer)}</td>
                                  <td className="px-4 py-2"> </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && !reportData && !error && (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-800">No payroll data available</h3>
                  <p className="mt-1 text-gray-500">Generate payroll records to see reports here.</p>
                  <Link to="/payroll">
                    <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">Go to Payroll</button>
                  </Link>
                </div>
              )}

              {/* Grand Totals */}
              {reportData?.grandTotals && (
                <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4">Overall Grand Totals (All Time)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div><p className="text-gray-400 text-sm">Total Employees</p><p className="text-2xl font-bold">{Math.round(reportData.grandTotals.totalEmployees || 0)}</p></div>
                    <div><p className="text-gray-400 text-sm">Total Gross Salary</p><p className="text-2xl font-bold text-purple-300">{formatCurrency(reportData.grandTotals.totalGrossSalary)}</p></div>
                    <div><p className="text-gray-400 text-sm">Total Net (Base)</p><p className="text-2xl font-bold text-blue-300">{formatCurrency(reportData.grandTotals.totalGrossSalary - reportData.grandTotals.totalSsnitEmployee - reportData.grandTotals.totalTax)}</p></div>
                    <div><p className="text-gray-400 text-sm">Total Net (Final)</p><p className="text-2xl font-bold text-green-300">{formatCurrency(reportData.grandTotals.totalNetSalary)}</p></div>
                    <div><p className="text-gray-400 text-sm">Total PAYE Tax</p><p className="text-2xl font-bold text-red-300">{formatCurrency(reportData.grandTotals.totalTax)}</p></div>
                    <div><p className="text-gray-400 text-sm">Total Employee SSNIT</p><p className="text-2xl font-bold text-orange-300">{formatCurrency(reportData.grandTotals.totalSsnitEmployee)}</p></div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------- CREDITS TAB ---------- */}
          {activeTab === "credits" && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      Pending Credits Management
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Track and manage employee credits applied to payroll periods</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={exportCreditsToExcel} disabled={pendingCredits.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Export to Excel
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => setCreditStatusFilter("ALL")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${creditStatusFilter === "ALL" ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>All ({statusCounts.ALL})</button>
                  <button onClick={() => setCreditStatusFilter("PENDING")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${creditStatusFilter === "PENDING" ? "bg-yellow-500 text-white" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}>Pending ({statusCounts.PENDING})</button>
                  <button onClick={() => setCreditStatusFilter("APPLIED")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${creditStatusFilter === "APPLIED" ? "bg-green-500 text-white" : "bg-green-100 text-green-800 hover:bg-green-200"}`}>Applied ({statusCounts.APPLIED})</button>
                  <button onClick={() => setCreditStatusFilter("CANCELLED")} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${creditStatusFilter === "CANCELLED" ? "bg-red-500 text-white" : "bg-red-100 text-red-800 hover:bg-red-200"}`}>Cancelled ({statusCounts.CANCELLED})</button>
                </div>
              </div>

              {creditsLoading ? (
                <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
              ) : getFilteredCredits().length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-800">No {creditStatusFilter !== "ALL" ? creditStatusFilter.toLowerCase() : ""} credits found</h3>
                  <p className="mt-1 text-gray-500">No credit records found in the system.</p>
                  <Link to="/payroll"><button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">Go to Payroll to Add Credits</button></Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th><th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th><th className="px-4 py-3 text-left font-medium text-gray-700">Reason</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th><th className="px-4 py-3 text-left font-medium text-gray-700">Created Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Created By</th><th className="px-4 py-3 text-left font-medium text-gray-700">Applied To Period</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Applied Date</th>
                    </tr></thead>
                    <tbody>
                      {getFilteredCredits().map((credit, idx) => (
                        <tr key={credit.id} className={`border-t border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 text-gray-600">#{credit.id}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{credit.employeeName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(credit.amount)}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={credit.reason || ""}>{credit.reason || "-"}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(credit.status)}`}>{credit.status}</span></td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(credit.createdDate)}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{credit.createdBy || "System"}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{credit.appliedToPeriodName || "-"}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(credit.appliedDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!creditsLoading && pendingCredits.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex gap-6">
                      <div><span className="text-sm text-gray-500">Total Credits:</span><span className="ml-2 font-semibold">{pendingCredits.length}</span></div>
                      <div><span className="text-sm text-gray-500">Total Amount:</span><span className="ml-2 font-semibold text-green-600">{formatCurrency(pendingCredits.reduce((sum, c) => sum + c.amount, 0))}</span></div>
                      <div><span className="text-sm text-gray-500">Pending Amount:</span><span className="ml-2 font-semibold text-yellow-600">{formatCurrency(pendingCredits.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0))}</span></div>
                    </div>
                    <div className="text-xs text-gray-400">Last updated: {new Date().toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PayrollReports;