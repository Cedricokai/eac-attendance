import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function EmployeeLoanRequest() {
  // ============================================
  // STATE DECLARATIONS
  // ============================================
  
  // Loan settings state
  const [settings, setSettings] = useState({
    defaultInterestRate: 5.0,
    maxLoanAmount: 0,
    minRepaymentPeriod: 1,
    maxRepaymentPeriod: 12,
    allowPartialRepayment: true
  });
  
  // Categories state for filtering
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // ============================================
  // NEW: Search state for employee filtering
  // ============================================
  const [searchTerm, setSearchTerm] = useState("");
  
  // Loan request form state
  const [loanRequest, setLoanRequest] = useState({
    employeeId: '',
    amount: '',
    purpose: '',
    repaymentPeriod: 1,
    monthlyPaymentAmount: 0,
    interestRate: 5.0,
    monthlyRepayment: 0,
    totalRepayment: 0,
    status: 'Pending',
    requestDate: new Date().toISOString().split('T')[0]
  });

  // Data states
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [existingLoans, setExistingLoans] = useState([]);
  
  // UI states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const navigate = useNavigate();

  // ============================================
  // API CONFIGURATION
  // ============================================
  
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8080";
    }
    if (hostname.startsWith("192.168.")) {
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  const getToken = () => {
    return localStorage.getItem('jwtToken');
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  // ============================================
  // DATA FETCHING FUNCTIONS
  // ============================================
  
  // Fetch current user
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
            id: data.id,
            name: data.username,
            role: data.role.replace("ROLE_", "").toLowerCase(),
            email: data.email,
            employeeId: data.employeeId
          });
          
          // If user is an employee, set their employee ID
          if (data.employeeId) {
            setLoanRequest(prev => ({
              ...prev,
              employeeId: data.employeeId
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch categories from settings
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Extract category names from the response
        const categoryNames = data.map(cat => cat.name);
        setCategories(categoryNames);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // ============================================
  // FILTERING LOGIC - Combines category and search
  // ============================================
  useEffect(() => {
    if (employees.length > 0) {
      const filtered = employees.filter(emp => {
        // First filter by category if selected
        if (selectedCategory && emp.category !== selectedCategory) {
          return false;
        }
        
        // Then filter by search term if provided
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
          const employeeId = emp.employeeId?.toLowerCase() || '';
          const email = emp.email?.toLowerCase() || '';
          
          return fullName.includes(term) || 
                 employeeId.includes(term) || 
                 email.includes(term);
        }
        
        return true;
      });
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees([]);
    }
  }, [selectedCategory, searchTerm, employees]);

  // Fetch existing loans for selected employee
  const fetchExistingLoans = async (employeeId) => {
    if (!employeeId) return;
    
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/loans/employee/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExistingLoans(data.filter(loan => 
          loan.status === 'Approved' && loan.balance > 0
        ));
      }
    } catch (err) {
      console.error('Error fetching existing loans:', err);
    }
  };

  // Fetch loan settings
  const fetchSettings = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/settings/loanSettings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const loanSettingsArray = await response.json();
        const loanSettings = loanSettingsArray.length > 0 ? loanSettingsArray[0] : {};
        
        setSettings(prev => ({
          ...prev,
          maxLoanAmount: loanSettings.maximumLoanLimit || 0,
          defaultInterestRate: loanSettings.defaultInterestRate || 5.0
        }));
        
        setLoanRequest(prev => ({
          ...prev,
          interestRate: loanSettings.defaultInterestRate || 5.0
        }));
      } else {
        console.error('Failed to fetch loan settings');
        setSettings(prev => ({
          ...prev,
          maxLoanAmount: 0
        }));
      }
    } catch (error) {
      console.error('Error loading loan settings:', error);
      setSettings(prev => ({
        ...prev,
        maxLoanAmount: 0
      }));
    }
  };

  // ============================================
  // EFFECT HOOKS
  // ============================================
  
  useEffect(() => {
    fetchSettings();
    fetchCategories(); // Fetch categories for filtering
    if (user?.role === 'admin' || user?.role === 'manager') {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (loanRequest.employeeId) {
      fetchExistingLoans(loanRequest.employeeId);
    }
  }, [loanRequest.employeeId]);

  // Calculate loan repayments
  useEffect(() => {
    if (loanRequest.amount && loanRequest.repaymentPeriod > 0) {
      calculateRepayments();
    }
  }, [loanRequest.amount, loanRequest.repaymentPeriod, loanRequest.interestRate]);

  // ============================================
  // CALCULATION FUNCTIONS
  // ============================================
  
  const calculateRepayments = () => {
    const principal = parseFloat(loanRequest.amount) || 0;
    const months = parseInt(loanRequest.repaymentPeriod) || 1;
    const annualRate = parseFloat(loanRequest.interestRate) || 0;
    
    if (principal <= 0 || months <= 0) return;
    
    const totalInterest = (principal * annualRate * months) / (12 * 100);
    const totalRepayment = principal + totalInterest;
    const monthlyRepayment = totalRepayment / months;
    
    setLoanRequest(prev => ({
      ...prev,
      totalRepayment: totalRepayment.toFixed(2),
      monthlyRepayment: monthlyRepayment.toFixed(2)
    }));
  };

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    setLoanRequest(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }));
    setError('');
  };

  const validateLoanRequest = () => {
    if (!loanRequest.employeeId) {
      setError('Please select an employee');
      return false;
    }
    
    if (!loanRequest.amount || loanRequest.amount <= 0) {
      setError('Please enter a valid loan amount');
      return false;
    }
    
    if (settings.maxLoanAmount > 0 && loanRequest.amount > settings.maxLoanAmount) {
      setError(`Loan amount cannot exceed ${formatCurrency(settings.maxLoanAmount)}`);
      return false;
    }
    
    if (!loanRequest.purpose || loanRequest.purpose.trim() === '') {
      setError('Please provide a purpose for the loan');
      return false;
    }
    
    if (loanRequest.purpose.length < 10) {
      setError('Please provide a more detailed purpose (minimum 10 characters)');
      return false;
    }
    
    if (loanRequest.repaymentPeriod < settings.minRepaymentPeriod || 
        loanRequest.repaymentPeriod > settings.maxRepaymentPeriod) {
      setError(`Repayment period must be between ${settings.minRepaymentPeriod} and ${settings.maxRepaymentPeriod} months`);
      return false;
    }
    
    if (existingLoans.length > 0) {
      const totalOutstanding = existingLoans.reduce((sum, loan) => sum + loan.balance, 0);
      if (totalOutstanding > 0) {
        setError(`Employee has existing loan balance of ${formatCurrency(totalOutstanding)}. Please clear existing loans first.`);
        return false;
      }
    }
    
    return true;
  };

  const submitLoanRequest = async () => {
    if (!validateLoanRequest()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const token = getToken();
      
      const loanData = {
        employeeId: loanRequest.employeeId,
        amount: parseFloat(loanRequest.amount),
        purpose: loanRequest.purpose.trim(),
        repaymentPeriod: parseInt(loanRequest.repaymentPeriod),
        interestRate: parseFloat(loanRequest.interestRate),
        requestedDate: loanRequest.requestDate,
        status: 'Pending'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(loanData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit loan request');
      }
      
      const result = await response.json();
      
      setSuccess('Loan request submitted successfully!');
      setShowConfirmation(true);
      
      // Reset form
      setLoanRequest({
        employeeId: user?.employeeId || '',
        amount: '',
        purpose: '',
        repaymentPeriod: 1,
        interestRate: settings.defaultInterestRate || 5.0,
        monthlyRepayment: 0,
        totalRepayment: 0,
        status: 'Pending',
        requestDate: new Date().toISOString().split('T')[0]
      });
      
      // Clear search when form is reset
      setSearchTerm("");
      
    } catch (err) {
      console.error('Error submitting loan request:', err);
      setError(err.message || 'Failed to submit loan request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ============================================
  // RENDER COMPONENT
  // ============================================
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-800">Loan Request</h1>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <div 
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white">
                    <span className="font-medium">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.name || 'User'}
                  </span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                      <p className="text-xs text-indigo-600 capitalize mt-1">{user?.role || 'employee'}</p>
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-lg font-semibold text-gray-800">Request a Loan</h2>
            <p className="text-sm text-gray-600 mt-1">Please fill in the details below to submit your loan request</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loan Request Submitted!</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Your loan request has been successfully submitted and is pending approval.
                    You will be notified once it's processed.
                  </p>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Employee Selection Section - Only for admins/managers */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div className="space-y-4">
                {/* Category Filter Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter by Category <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      // Reset employee selection when category changes
                      setLoanRequest(prev => ({ ...prev, employeeId: '' }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingCategories}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {loadingCategories && (
                    <p className="mt-1 text-xs text-gray-500">Loading categories...</p>
                  )}
                </div>

                {/* ============================================ */}
                {/* NEW: Search Input for Employees */}
                {/* ============================================ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Employee <span className="text-gray-400 text-xs">(Type name, ID, or email)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name, employee ID, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Employee Dropdown with Filtered Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="employeeId"
                    value={loanRequest.employeeId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={filteredEmployees.length > 0 && filteredEmployees.length <= 5 ? filteredEmployees.length : 1}
                  >
                    <option value="">
                      {filteredEmployees.length === 0 
                        ? "No employees match your search" 
                        : selectedCategory 
                          ? `Select employee from ${selectedCategory}` 
                          : 'Select Employee'}
                    </option>
                    {filteredEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} - {employee.employeeId} 
                        {employee.category && ` (${employee.category})`}
                        {employee.email && ` | ${employee.email}`}
                      </option>
                    ))}
                  </select>
                  
                  {/* Show search results summary */}
                  {filteredEmployees.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Found {filteredEmployees.length} matching employee{filteredEmployees.length !== 1 ? 's' : ''} 
                      {selectedCategory ? ` in ${selectedCategory}` : ''}
                      {searchTerm ? ` for "{searchTerm}"` : ''}
                    </p>
                  )}
                  
                  {/* Show message when no employees match search */}
                  {filteredEmployees.length === 0 && employees.length > 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No employees match your search criteria
                      {searchTerm && ` for "${searchTerm}"`}
                      {selectedCategory && ` in ${selectedCategory}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Existing Loans Warning */}
            {existingLoans.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Existing Active Loans</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This employee has {existingLoans.length} active loan(s) with total outstanding balance of {formatCurrency(existingLoans.reduce((sum, loan) => sum + loan.balance, 0))}.
                      New loan requests may be subject to approval based on existing obligations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Amount (GHS) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₵</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  value={loanRequest.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {settings.maxLoanAmount > 0 ? (
                <p className="mt-1 text-xs text-gray-500">
                  Maximum loan amount: {formatCurrency(settings.maxLoanAmount)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-yellow-600">
                  Loading loan settings...
                </p>
              )}
            </div>

            {/* Monthly Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
               Monthly Payment Amount (GHS) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₵</span>
                </div>
                <input
                  type="number"
                  name="monthlyPaymentAmount"
                  value={loanRequest.monthlyPaymentAmount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose of Loan <span className="text-red-500">*</span>
              </label>
              <textarea
                name="purpose"
                value={loanRequest.purpose}
                onChange={handleInputChange}
                rows="3"
                placeholder="Please provide a detailed explanation of why you need this loan..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum {10 - (loanRequest.purpose?.length || 0)} characters remaining
              </p>
            </div>

            {/* Repayment Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repayment Period (Months) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="repaymentPeriod"
                value={loanRequest.repaymentPeriod}
                onChange={handleInputChange}
                min={settings.minRepaymentPeriod}
                max={settings.maxRepaymentPeriod}
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum: {settings.minRepaymentPeriod} month(s) | Maximum: {settings.maxRepaymentPeriod} months
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Terms and Conditions</h4>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Loan approval is subject to company policy and management discretion</li>
                <li>Repayments will be deducted from monthly salary</li>
                <li>Early repayment is {settings.allowPartialRepayment ? 'allowed' : 'not allowed'} without penalty</li>
                <li>Defaulting on payments may affect future loan eligibility</li>
                <li>This request will be reviewed within 3-5 business days</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setLoanRequest({
                    employeeId: user?.employeeId || '',
                    amount: '',
                    purpose: '',
                    repaymentPeriod: 1,
                    interestRate: settings.defaultInterestRate || 5.0,
                    monthlyRepayment: 0,
                    totalRepayment: 0,
                    status: 'Pending',
                    requestDate: new Date().toISOString().split('T')[0]
                  });
                  setError('');
                  setSearchTerm(""); // Clear search when form is cleared
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                disabled={loading}
              >
                Clear Form
              </button>
              <button
                onClick={submitLoanRequest}
                disabled={loading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm hover:shadow flex items-center gap-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit Loan Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Need Help?</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Contact HR department for questions about loan eligibility</p>
            <p>• Loan processing typically takes 3-5 business days</p>
            <p>• You can track your loan status in the "My Loans" section</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EmployeeLoanRequest;