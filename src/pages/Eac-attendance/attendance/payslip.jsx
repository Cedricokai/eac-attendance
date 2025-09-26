import { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from '../context/SettingsContext';
import { Link, useLocation } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import companyLogo from "../../../assets/companyLogo.jpg";

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

  const companyName = "EAC ELECTRICAL SOLUTION LIMITED";

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

  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8080/api/employee/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch employee details');
      return await res.json();
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
          <meta charset="UTF-8">
          <style>
            /* Reset and base styles */
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', 'Arial', sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 15px;
            }
            
            /* Print-specific styles */
            @media print {
              @page { 
                margin: 0.5in;
                size: A4 portrait;
              }
              
              body { 
                font-size: 11px;
                padding: 0;
              }
              
              .no-print { 
                display: none !important; 
              }
              
              .payslip-container { 
                width: 100% !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                box-shadow: none !important;
                border: none !important;
                page-break-inside: avoid;
              }
              
              .print-header { 
                border-bottom: 3px double #333 !important;
                padding-bottom: 10px !important;
                margin-bottom: 15px !important;
                background: white !important;
                color: black !important;
              }
              
              .company-logo { 
                max-height: 60px !important;
                filter: none !important;
              }
              
              .salary-section { 
                border: 1px solid #ccc !important; 
                background: #fafafa !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .summary-section { 
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .text-primary { color: #000 !important; font-weight: bold; }
              .text-success { color: #000 !important; }
              .text-danger { color: #000 !important; }
              .bg-light { background-color: #f8fafc !important; }
              
              .break-before { page-break-before: always; }
              .break-after { page-break-after: always; }
              .break-inside-avoid { page-break-inside: avoid; }
              
              /* Ensure proper contrast for printing */
              .bg-gradient-to-r { background: #f0f0f0 !important; }
              .from-blue-800 { background: #e0e0e0 !important; }
              .to-blue-900 { background: #e0e0e0 !important; }
              .text-white { color: #000 !important; }
              
              /* Table-like structures */
              .grid-2-col, .grid-cols-1, .grid-cols-2 {
                display: table !important;
                width: 100% !important;
              }
              
              .flex { display: table-row !important; }
              .flex > * { display: table-cell !important; padding: 2px 4px; }
            }
            
            /* Enhanced print layout */
            .payslip-container { 
              max-width: 100%;
              margin: 0 auto;
              background: white;
              border: 1px solid #ccc;
            }
            
            .print-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 15px;
              background: #f0f0f0;
              border-bottom: 2px solid #ccc;
            }
            
            .company-info {
              text-align: right;
              font-size: 10px;
            }
            
            .company-info h1 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .company-info .subtitle {
              font-size: 9px;
              opacity: 0.8;
            }
            
            .employee-info {
              background: #f8f8f8;
              padding: 10px;
              border-left: 3px solid #333;
              margin: 10px 0;
              font-size: 10px;
            }
            
            .section-title {
              font-weight: bold;
              color: #000;
              border-bottom: 1px solid #ccc;
              padding-bottom: 3px;
              margin-bottom: 8px;
              font-size: 11px;
              text-transform: uppercase;
            }
            
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 10px;
            }
            
            .amount {
              font-weight: bold;
            }
            
            .total-row {
              border-top: 2px solid #000;
              font-weight: bold;
              font-size: 11px;
              padding-top: 3px;
              margin-top: 3px;
            }
            
            .net-salary {
              background: #e8f5e8;
              border: 2px solid #000;
              padding: 10px;
              margin: 10px 0;
              text-align: center;
              font-weight: bold;
            }
            
            .footer {
              text-align: center;
              padding: 8px;
              background: #f0f0f0;
              border-top: 1px solid #ccc;
              font-size: 9px;
              color: #666;
              margin-top: 15px;
            }
            
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 60px;
              color: rgba(0,0,0,0.05);
              pointer-events: none;
              z-index: -1;
              font-weight: bold;
              opacity: 0.3;
            }
            
            /* Table styles for better print layout */
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
              font-size: 10px;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #ccc;
              padding: 4px 6px;
              text-align: left;
            }
            
            .print-table th {
              background: #f0f0f0;
              font-weight: bold;
            }
            
            .print-table .total-row {
              background: #e0e0e0;
              font-weight: bold;
            }
            
            /* Compact layout for print */
            .compact-section {
              margin: 5px 0;
              padding: 5px;
            }
            
            .compact-row {
              display: flex;
              justify-content: space-between;
              margin: 1px 0;
            }
            
            /* Signature lines */
            .signature-area {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #ccc;
            }
            
            .signature-line {
              width: 200px;
              border-bottom: 1px solid #000;
              margin: 15px 0 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="watermark">${companyName}</div>
          <div class="payslip-container">
            ${payslipContent}
            
            <!-- Additional print-only content -->
            <div class="signature-area">
              <table width="100%" style="font-size: 9px; margin-top: 20px;">
                <tr>
                  <td width="33%" align="center">
                    <div class="signature-line"></div>
                    <div>Employee's Signature</div>
                    <div style="font-size: 8px;">Date: ________________</div>
                  </td>
                  <td width="34%" align="center">
                    <div class="signature-line"></div>
                    <div>Manager's Signature</div>
                    <div style="font-size: 8px;">Date: ________________</div>
                  </td>
                  <td width="33%" align="center">
                    <div class="signature-line"></div>
                    <div>HR Department</div>
                    <div style="font-size: 8px;">Date: ________________</div>
                  </td>
                </tr>
              </table>
            </div>
            
            <div class="footer">
              <div><strong>${companyName}</strong></div>
              <div>P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com</div>
              <div style="margin-top: 3px; font-size: 8px;">
                This is a computer-generated payslip. No signature is required for digital copies.
              </div>
              <div style="font-size: 8px; margin-top: 2px;">
                Generated on ${new Date().toLocaleDateString('en-GH', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              // Add slight delay to ensure all content is rendered
              setTimeout(function() {
                window.print();
                // Close window after printing
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 100);
            };
            
            // Fallback in case print dialog is cancelled
            window.onafterprint = function() {
              setTimeout(function() {
                window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-GH', { 
    style: 'currency', 
    currency: 'GHS',
    minimumFractionDigits: 2
  }).format(amount || 0);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateAdditionalFields = (record, employee) => {
    if (!record || !employee) return null;

    const hourlyRate = employee.minimumRate || 0;
    const normalShiftHours = (record.workingDays || 0) * 8;
    const overtimeHours = record.overtimeHours || 0;
    const totalHours = normalShiftHours + overtimeHours;

    const weekDayAmount = normalShiftHours * hourlyRate;
    const overtimePay = record.overtimePay || 0;
    const basicSalary = record.basicSalary || weekDayAmount;

    // Use the same allowance fields as payroll.jsx
    const rentAllowance = record.rentAllowance || 0;
    const transportAllowance = record.transportAllowance || 0;
    const clothingAllowance = record.clothingAllowance || 0;
    const otherAllowance = record.otherAllowance || 0;

    const totalAllowances = rentAllowance + transportAllowance + clothingAllowance + otherAllowance + overtimePay;
    const grossIncome = basicSalary + totalAllowances;

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
      overtimePay,
      basicSalary,
      rentAllowance,
      transportAllowance,
      clothingAllowance,
      otherAllowance,
      totalAllowances,
      grossIncome,
      tier2Deduction,
      taxableIncome,
      totalDeductions,
      netSalary
    };
  };

  // Function to check if an allowance has a non-zero value
  const hasNonZeroAllowance = (allowanceValue) => {
    return allowanceValue && allowanceValue > 0;
  };

  // Function to get non-zero allowances for display
  const getNonZeroAllowances = (additionalFields) => {
    if (!additionalFields) return [];
    
    const allowances = [];
    
    if (hasNonZeroAllowance(additionalFields.rentAllowance)) {
      allowances.push({ name: 'Rent Allowance', value: additionalFields.rentAllowance });
    }
    
    if (hasNonZeroAllowance(additionalFields.transportAllowance)) {
      allowances.push({ name: 'Transport Allowance', value: additionalFields.transportAllowance });
    }
    
    if (hasNonZeroAllowance(additionalFields.clothingAllowance)) {
      allowances.push({ name: 'Clothing Allowance', value: additionalFields.clothingAllowance });
    }
    
    if (hasNonZeroAllowance(additionalFields.otherAllowance)) {
      allowances.push({ name: 'Other Allowance', value: additionalFields.otherAllowance });
    }
    
    if (hasNonZeroAllowance(additionalFields.overtimePay)) {
      allowances.push({ name: 'Overtime', value: additionalFields.overtimePay });
    }
    
    return allowances;
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
  const nonZeroAllowances = getNonZeroAllowances(additionalFields);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="w-64 bg-white shadow-lg">
          <MainSidebar />
        </div>
        
        <div className="flex-1 ml-64 p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Employee Payslip</h1>
            <p className="text-gray-600">Generate and manage employee payslips</p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* Selection Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Employee & Period</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Period</label>
                <select 
                  value={selectedPeriod || ''}
                  onChange={e => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.jobPosition || 'No Position'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              onClick={fetchEmployeePayslip}
              disabled={!selectedPeriod || !selectedEmployeeId || loading}
              className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition duration-200 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Payslip...
                </>
              ) : (
                'Generate Payslip'
              )}
            </button>
          </div>

          {/* Payslip Display */}
          {payrollRecord && employeeDetails && additionalFields && (
            <div>
              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mb-6 no-print">
                <button 
                  onClick={generatePayslipPDF}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-medium flex items-center transition duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                <button 
                  onClick={printPayslip}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-medium flex items-center transition duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Payslip
                </button>
              </div>

              {/* Payslip Content */}
              <div 
                ref={payslipRef}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
              >
                {/* Header with Logo */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 print-header">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      {/* Company Logo */}
                      <div className="bg-white p-2 rounded-lg">
                        <img 
                          src={companyLogo} 
                          alt="Company Logo" 
                          className="h-12 w-auto company-logo"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="hidden bg-blue-100 text-blue-800 font-bold text-lg px-3 py-2 rounded">
                          EAC
                        </div>
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">{companyName}</h1>
                        <p className="text-blue-200">Payroll Management System</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">PAYSLIP</div>
                      <div className="text-blue-200 text-sm">
                        Period: {payrollRecord.period?.name || 'N/A'}
                      </div>
                      <div className="text-blue-200 text-sm">
                        Date: {new Date().toLocaleDateString('en-GH')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Information */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3 section-title">Employee Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Staff No:</span>
                          <span className="font-medium">{employeeDetails.employeeId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">SSNIT No:</span>
                          <span className="font-medium">{employeeDetails.ssnitNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-semibold text-lg">{employeeDetails.firstName} {employeeDetails.lastName}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Position:</span>
                          <span className="font-medium">{employeeDetails.jobPosition || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3 section-title">Bank & Hours</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Bank:</span>
                          <span className="font-medium">{employeeDetails.bankName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Account No:</span>
                          <span className="font-medium">{employeeDetails.accountNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Normal Hours:</span>
                          <span>{additionalFields.normalShiftHours.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Overtime Hours:</span>
                          <span>{additionalFields.overtimeHours.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between detail-row total-row">
                          <span>Total Hours:</span>
                          <span className="text-blue-600">{additionalFields.totalHours.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Salary Structure */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 mb-4 text-lg section-title">Salary Breakdown</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200 salary-section">
                      <h4 className="font-semibold text-green-800 mb-3 section-title">EARNINGS</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between detail-row">
                          <span>Basic Salary:</span>
                          <span className="font-semibold">{formatCurrency(additionalFields.basicSalary)}</span>
                        </div>
                        
                        {/* Only show overtime if it has value */}
                        {hasNonZeroAllowance(additionalFields.overtimePay) && (
                          <div className="flex justify-between detail-row">
                            <span>Overtime:</span>
                            <span className="font-semibold">{formatCurrency(additionalFields.overtimePay)}</span>
                          </div>
                        )}
                        
                        {/* Only show allowances that have non-zero values */}
                        {nonZeroAllowances.map((allowance, index) => (
                          <div key={index} className="flex justify-between detail-row">
                            <span>{allowance.name}:</span>
                            <span>{formatCurrency(allowance.value)}</span>
                          </div>
                        ))}
                        
                        <div className="flex justify-between detail-row total-row">
                          <span>Total Earnings:</span>
                          <span className="font-semibold text-green-800">{formatCurrency(additionalFields.grossIncome)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200 salary-section">
                      <h4 className="font-semibold text-red-800 mb-3 section-title">DEDUCTIONS</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between detail-row">
                          <span>SSNIT Tier 2 (5.5%):</span>
                          <span>{formatCurrency(additionalFields.tier2Deduction)}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span>Income Tax (PAYE):</span>
                          <span>{formatCurrency(payrollRecord.payeTax)}</span>
                        </div>
                        <div className="flex justify-between detail-row total-row">
                          <span>Total Deductions:</span>
                          <span className="font-semibold text-red-800">{formatCurrency(additionalFields.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 net-salary">
                  <div className="text-center text-white">
                    <div className="text-sm opacity-90">NET SALARY</div>
                    <div className="text-3xl font-bold">{formatCurrency(additionalFields.netSalary)}</div>
                    <div className="text-sm opacity-90 mt-2">Paid to {employeeDetails.bankName} • Account: {employeeDetails.accountNumber}</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center text-gray-600 text-sm footer">
                  <div className="font-semibold">{companyName}</div>
                  <div>P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com</div>
                  <div className="text-xs mt-1 text-gray-500">
                    This is a computer-generated payslip. No signature is required.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!payrollRecord && selectedPeriod && selectedEmployee && !loading && (
            <div className="text-center py-12 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="text-yellow-500 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Payslip Available</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                No payroll record found for the selected employee and period. 
                Please ensure payroll has been processed for this period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Payslip;