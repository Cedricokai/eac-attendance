import { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation } from "react-router-dom";
import MainSidebar from "../mainSidebar";

function Payslip() {
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { settings } = useContext(SettingsContext);
  const location = useLocation();
  const payslipRef = useRef(null);

  const getToken = () => localStorage.getItem('jwtToken');

  const fetchPayrollPeriods = async () => {
    try {
      const token = getToken();
      const res = await fetch('http://localhost:8080/api/payroll/periods', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch payroll periods');
      const data = await res.json();
      setPayrollPeriods(data);
    } catch (err) { setError(err.message); }
  };

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const res = await fetch('http://localhost:8080/api/employee', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) { console.error(err.message); }
  };

  // Get complete employee details
  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8080/api/employee/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch employee details');
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error fetching employee details:', err);
      return null;
    }
  };

  const fetchEmployeePayslip = async () => {
    if (!selectedPeriod || !selectedEmployeeId) return;
    
    setLoading(true);
    try {
      const token = getToken();
      
      // Fetch payroll record
      const payrollRes = await fetch(`http://localhost:8080/api/payroll/employee-payslip?periodId=${selectedPeriod}&employeeId=${selectedEmployeeId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (!payrollRes.ok) {
        if (payrollRes.status === 404) {
          setPayrollRecord(null);
          setEmployeeDetails(null);
          setError('No payslip found for selected employee and period');
        } else {
          throw new Error('Failed to fetch payslip');
        }
      } else {
        const payrollData = await payrollRes.json();
        setPayrollRecord(payrollData);
        
        // Fetch complete employee details
        const employeeData = await fetchEmployeeDetails(selectedEmployeeId);
        setEmployeeDetails(employeeData);
        setError('');
      }
    } catch (err) { 
      setError(err.message); 
      setPayrollRecord(null);
      setEmployeeDetails(null);
    } finally { 
      setLoading(false); 
    }
  };

  const generatePayslipPDF = async () => {
    if (!payrollRecord || !employeeDetails) return;
    
    try {
      const token = getToken();
      const res = await fetch('http://localhost:8080/api/payroll/generate-payslip-pdf', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          periodId: selectedPeriod,
          employeeId: selectedEmployeeId
        })
      });
      
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `payslip-${employeeDetails.firstName}-${employeeDetails.lastName}-${payrollRecord.period?.name || 'period'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setSuccess('Payslip PDF generated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const printPayslip = () => {
    if (!payslipRef.current || !employeeDetails) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('Popup blocked! Please allow popups for this site to print.');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const payslipContent = payslipRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeDetails.firstName} ${employeeDetails.lastName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
              .payslip-container { 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                box-shadow: none !important;
                border: none !important;
              }
              .bg-blue-600 { background-color: #2563eb !important; -webkit-print-color-adjust: exact; }
              .text-white { color: white !important; -webkit-print-color-adjust: exact; }
              .text-blue-100 { color: #dbeafe !important; -webkit-print-color-adjust: exact; }
              .text-green-600 { color: #059669 !important; -webkit-print-color-adjust: exact; }
              .text-red-600 { color: #dc2626 !important; -webkit-print-color-adjust: exact; }
              .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
              .bg-blue-50 { background-color: #f0f9ff !important; -webkit-print-color-adjust: exact; }
              .border-green-200 { border-color: #bbf7d0 !important; }
              .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
              .company-footer { 
                background-color: #f8fafc !important; 
                -webkit-print-color-adjust: exact; 
                border-top: 2px solid #e2e8f0 !important;
              }
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 15px; 
              background: white;
              font-size: 12px;
            }
            .payslip-container { 
              max-width: 900px; 
              margin: 0 auto; 
              background: white;
            }
            .print-header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 2px solid #e5e7eb;
            }
            .print-header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .print-watermark {
              position: absolute;
              opacity: 0.05;
              font-size: 100px;
              transform: rotate(-45deg);
              pointer-events: none;
              z-index: -1;
              top: 30%;
              left: 10%;
            }
            .salary-structure-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin: 10px 0;
            }
            .rates-section, .deductions-section {
              border: 1px solid #d1d5db;
              padding: 10px;
              border-radius: 4px;
            }
            .section-title {
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 4px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .company-info {
              font-size: 10px;
              text-align: center;
              margin-top: 15px;
              line-height: 1.3;
            }
          </style>
        </head>
        <body>
          <div class="print-watermark">EAC ELECTRICAL</div>
          <div class="print-header">
            <h1>EAC ELECTRICAL SOLUTION LIMITED - PAYSLIP</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="payslip-container">
            ${payslipContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate additional fields using actual employee data
  const calculateAdditionalFields = (record, employee) => {
    if (!record || !employee) return null;
    
    const hourlyRate = employee.minimumRate || 0;
    const normalShiftHours = record.workingDays * 8; // Assuming 8 hours per day
    const overtimeHours = record.overtimeHours || 0;
    const totalHours = normalShiftHours + overtimeHours;
    
    const weekDayAmount = normalShiftHours * hourlyRate;
    const weekendOvertime = overtimeHours * hourlyRate * 1.5; // Overtime rate 1.5x
    const basicSalary = record.basicSalary || weekDayAmount;
    
    // Get actual allowances from employee record
    const rentAllowance = employee.housingAllowance || 0;
    const specialAllowance = 500; // Fixed amount
    const otherAllowances = employee.otherAllowances || 0;
    const tntAllowance = employee.tntAllowance || 0;
    const clothingAllowance = employee.clothingAllowance || 0;
    
    const totalAllowances = rentAllowance + specialAllowance + otherAllowances + tntAllowance + clothingAllowance;
    const grossIncome = basicSalary + weekendOvertime + totalAllowances;
    const tier2Deduction = record.ssnitEmployee || 0;
    const taxableIncome = grossIncome - tier2Deduction;
    const totalDeductions = tier2Deduction + (record.payeTax || 0);
    const netSalary = record.netSalary || (grossIncome - totalDeductions);

    return {
      hourlyRate,
      normalShiftHours,
      overtimeHours,
      totalHours,
      weekDayAmount,
      weekendOvertime,
      basicSalary,
      rentAllowance,
      specialAllowance,
      otherAllowances,
      tntAllowance,
      clothingAllowance,
      totalAllowances,
      grossIncome,
      tier2Deduction,
      taxableIncome,
      totalDeductions,
      netSalary
    };
  };

  useEffect(() => {
    fetchPayrollPeriods();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedPeriod && selectedEmployeeId) {
      fetchEmployeePayslip();
    }
  }, [selectedPeriod, selectedEmployeeId]);

  const additionalFields = calculateAdditionalFields(payrollRecord, employeeDetails);
  const selectedEmployee = employees.find(emp => emp.id == selectedEmployeeId);

  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-800 flex">
      <div className="fixed inset-y-0 left-0 w-64 bg-white z-30"><MainSidebar /></div>
      <div className="flex-1 ml-64">
        <main className="flex-1 max-w-full px-2 md:px-4 py-6">

          {/* Page Header */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Employee Payslip Generator</h1>
              <p className="text-gray-600">Generate individual payslips for employees</p>
            </div>
          </section>

          {/* Status Messages */}
          {error && <div className="bg-red-100 text-red-700 px-4 py-3 mt-4 rounded-lg no-print">{error}</div>}
          {success && <div className="bg-green-100 text-green-700 px-4 py-3 mt-4 rounded-lg no-print">{success}</div>}

          {/* Selection Section */}
          <div className="mt-6 mb-6 mx-2 md:mx-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200 no-print">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Employee and Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Period</label>
                <select 
                  value={selectedPeriod || ''}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a period</option>
                  {payrollPeriods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.name} ({formatDate(period.startDate)} - {formatDate(period.endDate)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select 
                  value={selectedEmployeeId || ''}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} - {employee.jobPosition || 'No Position'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              onClick={fetchEmployeePayslip}
              disabled={!selectedPeriod || !selectedEmployeeId || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 mt-4 rounded-md flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                'Generate Payslip'
              )}
            </button>
          </div>

          {/* Payslip Display */}
          {payrollRecord && employeeDetails && additionalFields && (
            <div className="mx-2 md:mx-4">
              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mb-4 no-print">
                <button 
                  onClick={generatePayslipPDF}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download PDF
                </button>
                <button 
                  onClick={printPayslip}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                  </svg>
                  Print Payslip
                </button>
              </div>

              {/* Payslip Content */}
              <div 
                ref={payslipRef}
                className="bg-white rounded-lg shadow-lg border border-gray-200 print:shadow-none print:border-0 print:bg-white"
              >
                {/* Header */}
                <div className="bg-blue-600 text-white p-4 rounded-t-lg print:bg-blue-600">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-xl font-bold">EMPLOYEE PAY SLIP</h1>
                      <div className="text-blue-100 text-sm mt-2">
                        <div>PERIOD: {payrollRecord.period?.name || 'N/A'}</div>
                        <div>DATE: {new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>EAC ELECTRICAL SOLUTION LIMITED</div>
                      <div className="text-blue-100">Payroll Management System</div>
                    </div>
                  </div>
                </div>

                {/* Employee Basic Information */}
                <div className="p-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-medium w-32">STAFF NO:</span>
                        <span>{employeeDetails.employeeId || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">SSNIT NO:</span>
                        <span>{employeeDetails.ssnitNumber || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">EMPLOYEE NAME:</span>
                        <span className="font-semibold">{employeeDetails.firstName} {employeeDetails.lastName}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-32">POSITION:</span>
                        <span>{employeeDetails.jobPosition || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex">
                        <span className="font-medium w-40">BANK:</span>
                        <span>{employeeDetails.bankName || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-40">ACCOUNT NO:</span>
                        <span>{employeeDetails.accountNumber || 'N/A'}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-40">NORMAL SHIFT HOUR:</span>
                        <span>{additionalFields.normalShiftHours.toFixed(1)}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-40">OVERTIME HOURS:</span>
                        <span>{additionalFields.overtimeHours.toFixed(1)}</span>
                      </div>
                      <div className="flex">
                        <span className="font-medium w-40">TOTAL HOURS:</span>
                        <span className="font-semibold">{additionalFields.totalHours.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Structure - Matching Excel Layout */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-3">SALARY STRUCTURE</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Rates Section */}
                    <div className="border border-gray-300 rounded p-3">
                      <div className="font-semibold mb-2 border-b pb-1">RATES</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>HOURLY RATE:</span>
                          <span className="font-medium">{formatCurrency(additionalFields.hourlyRate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WEEK DAY AMOUNT:</span>
                          <span className="font-medium">{formatCurrency(additionalFields.weekDayAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WEEKEND/HOLIDAYS OVERTIME:</span>
                          <span className="font-medium">{formatCurrency(additionalFields.weekendOvertime)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-semibold">BASIC SALARY:</span>
                          <span className="font-semibold">{formatCurrency(additionalFields.basicSalary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions Section */}
                    <div className="border border-gray-300 rounded p-3">
                      <div className="font-semibold mb-2 border-b pb-1">DEDUCTIONS</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>AMOUNT OWED COMPANY:</span>
                          <span className="font-medium">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>WELFARE DUES:</span>
                          <span className="font-medium">{formatCurrency(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>INCOME TAX (PAYE):</span>
                          <span className="font-medium text-red-600">{formatCurrency(payrollRecord.payeTax)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-semibold">TOTAL DEDUCTIONS:</span>
                          <span className="font-semibold text-red-600">{formatCurrency(additionalFields.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allowances Section */}
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-3">ALLOWANCES</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="font-medium">OVERTIME</div>
                      <div className="font-semibold">{formatCurrency(additionalFields.weekendOvertime)}</div>
                    </div>
                    <div>
                      <div className="font-medium">RENT</div>
                      <div className="font-semibold">{formatCurrency(additionalFields.rentAllowance)}</div>
                    </div>
                    <div>
                      <div className="font-medium">SPECIAL ALLOWANCE</div>
                      <div className="font-semibold">{formatCurrency(additionalFields.specialAllowance)}</div>
                    </div>
                    <div>
                      <div className="font-medium">TNT</div>
                      <div className="font-semibold">{formatCurrency(additionalFields.tntAllowance)}</div>
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="p-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <div className="flex justify-between font-semibold mb-2">
                        <span>GROSS INCOME:</span>
                        <span className="text-green-600">{formatCurrency(additionalFields.grossIncome)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>TIER 2 (5.5% OF BASIC SALARY):</span>
                        <span>{formatCurrency(additionalFields.tier2Deduction)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                        <span>TAXABLE INCOME (A):</span>
                        <span>{formatCurrency(additionalFields.taxableIncome)}</span>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="w-full">
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>TOTAL DEDUCTIONS (B):</span>
                          <span className="text-red-600">{formatCurrency(additionalFields.totalDeductions)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded">
                          <span>NET SALARY (A-B):</span>
                          <span className="text-green-600">{formatCurrency(additionalFields.netSalary)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Footer */}
                <div className="bg-gray-50 p-3 rounded-b-lg border-t border-gray-200 print:bg-gray-50 company-footer">
                  <div className="text-center text-gray-600 text-xs">
                    <div className="font-semibold">EAC ELECTRICAL SOLUTION LIMITED</div>
                    <div>P. O. Box AB 253 Abeka-Accra Ghana</div>
                    <div>Email: eac.electricalsolution.ltd@yahoo.com | eac.electricalsolution.ltd@gmail.com</div>
                    <div>Contact No.: +233 243 922 105 or +233 208 615 156</div>
                    <div className="mt-1 text-gray-500">This is a computer-generated payslip. No signature is required.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Record Message */}
          {!payrollRecord && selectedPeriod && selectedEmployee && !loading && (
            <div className="mx-2 md:mx-4 p-8 text-center bg-yellow-50 rounded-lg border border-yellow-200 no-print">
              <div className="text-yellow-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No Payslip Available</h3>
              <p className="text-gray-600">
                No payroll record found for the selected employee and period. 
                Please ensure payroll has been generated for this period.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default Payslip;