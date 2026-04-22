import { useState } from 'react';
import { Download, Printer, Eye, ChevronDown, ChevronUp, FileText, DollarSign, CreditCard } from 'lucide-react';

const PayslipCard = ({ payslip }) => {
  const [expanded, setExpanded] = useState(false);

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
      month: 'short', 
      day: 'numeric' 
    });
  };

  const toNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Parse loan details if available
  const loanInfo = (() => {
    if (!payslip?.loanDetails) return null;
    try {
      const parsed = JSON.parse(payslip.loanDetails);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.error("Failed to parse loan details:", e);
      return null;
    }
  })();

  // Check if employee has loans
  const hasLoanInfo = payslip && (payslip.hasActiveLoans || payslip.loanDeduction > 0);

  // Calculate statutory deductions
  const statutoryDeductions = toNumber(payslip.ssnitEmployee) + toNumber(payslip.payeTax);
  
  // Calculate net before loan
  const netBeforeLoan = toNumber(payslip.grossSalary) - statutoryDeductions;
  
  // Final net salary (already includes loan deduction if any)
  const finalNetSalary = toNumber(payslip.netSalary);
  
  // Loan deduction amount
  const loanDeduction = toNumber(payslip.loanDeduction);

  // Calculate loan summary
  const loanSummary = (() => {
    if (!loanInfo || loanInfo.length === 0) {
      return {
        totalMonthlyRepayment: 0,
        totalOutstanding: 0,
        totalOriginalAmount: 0,
        loans: []
      };
    }

    const totalMonthlyRepayment = loanInfo.reduce((sum, loan) => 
      sum + (loan.monthlyPayment || 0), 0
    );

    const totalOutstanding = loanInfo.reduce((sum, loan) => 
      sum + (loan.remaining || 0), 0
    );

    const totalOriginalAmount = loanInfo.reduce((sum, loan) => 
      sum + (loan.originalAmount || 0), 0
    );

    return {
      totalMonthlyRepayment,
      totalOutstanding,
      totalOriginalAmount,
      loans: loanInfo
    };
  })();

  const downloadPayslipPDF = (payslipData) => {
    // Implement PDF download logic
    console.log("Download PDF for payslip:", payslipData.id);
  };

  const printPayslip = (payslipData) => {
    // Implement print logic
    console.log("Print payslip:", payslipData.id);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-5 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {formatDate(payslip.payrollPeriodStartDate)} - {formatDate(payslip.payrollPeriodEndDate)}
              </h3>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">Paid: {formatDate(payslip.paymentDate)}</span>
                <span className="text-sm text-gray-500">Net: {formatCurrency(finalNetSalary)}</span>
                {hasLoanInfo && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Loan Active
                  </span>
                )}
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Paid
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={expanded ? "Show less" : "Show more"}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={() => window.open(`/employee/payslip/${payslip.id}`, '_blank')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Full Payslip"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={() => downloadPayslipPDF(payslip)}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Download PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => printPayslip(payslip)}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* Earnings and Deductions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings Section */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Earnings
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Basic Salary:</span>
                    <span className="font-medium">{formatCurrency(payslip.basicSalary)}</span>
                  </div>
                  {payslip.overtimePay > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overtime:</span>
                      <span>{formatCurrency(payslip.overtimePay)}</span>
                    </div>
                  )}
                  {payslip.rentAllowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rent Allowance:</span>
                      <span>{formatCurrency(payslip.rentAllowance)}</span>
                    </div>
                  )}
                  {payslip.transportAllowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transport Allowance:</span>
                      <span>{formatCurrency(payslip.transportAllowance)}</span>
                    </div>
                  )}
                  {payslip.clothingAllowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Clothing Allowance:</span>
                      <span>{formatCurrency(payslip.clothingAllowance)}</span>
                    </div>
                  )}
                  {payslip.otherAllowance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Other Allowance:</span>
                      <span>{formatCurrency(payslip.otherAllowance)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex justify-between font-medium">
                      <span className="text-green-800">Gross Salary:</span>
                      <span className="text-green-700">{formatCurrency(payslip.grossSalary)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Deductions
                </h4>
                <div className="space-y-2">
                  {payslip.ssnitEmployee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SSNIT Tier 2 (5.5%):</span>
                      <span>{formatCurrency(payslip.ssnitEmployee)}</span>
                    </div>
                  )}
                  {payslip.payeTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">PAYE Tax:</span>
                      <span>{formatCurrency(payslip.payeTax)}</span>
                    </div>
                  )}
                  
                  {/* Loan Repayment Section */}
                  {hasLoanInfo && loanDeduction > 0 && (
                    <div className="border-t border-red-200 my-2 pt-2">
                      <div className="flex justify-between text-sm font-medium text-purple-800">
                        <span>Loan Repayment:</span>
                        <span>{formatCurrency(loanDeduction)}</span>
                      </div>
                      
                      {/* Loan Details */}
                      {loanInfo && loanInfo.length > 0 && (
                        <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                          <p className="font-medium mb-1 text-purple-700">Active Loans:</p>
                          {loanInfo.map((loan, idx) => (
                            <div key={idx} className="mb-2 pb-1 border-b border-gray-200 last:border-0">
                              <div className="flex justify-between text-gray-700">
                                <span>Loan #{loan.id}</span>
                                <span className="text-purple-600">{formatCurrency(loan.monthlyPayment)}/month</span>
                              </div>
                              <div className="flex justify-between text-gray-500 text-[10px] mt-1">
                                <span>Requested: {formatCurrency(loan.originalAmount || 0)}</span>
                                <span>Paid this month: {formatCurrency(loan.deducted || 0)}</span>
                              </div>
                              <div className="flex justify-between text-gray-500 text-[10px]">
                                <span>Remaining: {formatCurrency(loan.remaining || 0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-red-200">
                    <div className="flex justify-between font-medium">
                      <span className="text-red-800">Total Deductions:</span>
                      <span className="text-red-700">
                        {formatCurrency(statutoryDeductions + loanDeduction)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Net Salary Calculation Section - Option 3 Style */}
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Net Salary Calculation
              </h4>
              
              <div className="space-y-3">
                {/* Gross */}
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-700">Gross Salary:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(payslip.grossSalary)}</span>
                </div>

                {/* Statutory Deductions Breakdown */}
                <div className="ml-4 space-y-1 border-l-2 border-blue-200 pl-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SSNIT Tier 2 (5.5%):</span>
                    <span className="text-red-600">- {formatCurrency(payslip.ssnitEmployee || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PAYE Tax:</span>
                    <span className="text-red-600">- {formatCurrency(payslip.payeTax || 0)}</span>
                  </div>
                </div>

                {/* Net Before Loan */}
                <div className="flex justify-between items-center py-2 border-t border-blue-200">
                  <span className="font-medium text-blue-700">Net After Statutory Deductions:</span>
                  <span className="font-bold text-blue-700">
                    {formatCurrency(netBeforeLoan)}
                  </span>
                </div>

                {/* Loan Deduction (if any) */}
                {hasLoanInfo && loanDeduction > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-700">Less: Loan Repayment:</span>
                    <span className="text-purple-600 font-medium">- {formatCurrency(loanDeduction)}</span>
                  </div>
                )}

                {/* Final Net */}
                <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-blue-300 bg-white bg-opacity-60 p-3 rounded-lg">
                  <div>
                    <span className="font-bold text-lg text-blue-800">FINAL NET SALARY</span>
                    {hasLoanInfo && loanDeduction > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        (After all deductions including loans)
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-blue-800">{formatCurrency(finalNetSalary)}</span>
                </div>

                {/* Before/After Comparison Card */}
                {hasLoanInfo && loanDeduction > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg text-center">
                      <div className="text-xs text-blue-800 mb-1">BEFORE LOAN</div>
                      <div className="font-bold text-blue-800 text-lg">
                        {formatCurrency(netBeforeLoan)}
                      </div>
                      <div className="text-[10px] text-blue-600 mt-1">
                        Gross - Statutory
                      </div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-lg text-center">
                      <div className="text-xs text-purple-800 mb-1">AFTER LOAN</div>
                      <div className="font-bold text-purple-800 text-lg">
                        {formatCurrency(finalNetSalary)}
                      </div>
                      <div className="text-[10px] text-purple-600 mt-1">
                        Final Net Salary
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Summary (if multiple loans) */}
                {loanInfo && loanInfo.length > 1 && (
                  <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg border border-purple-200">
                    <div className="flex justify-between text-xs text-purple-800">
                      <span>Total Loans:</span>
                      <span className="font-medium">{formatCurrency(loanSummary.totalOriginalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-purple-800 mt-1">
                      <span>Total Monthly Repayment:</span>
                      <span className="font-medium">{formatCurrency(loanSummary.totalMonthlyRepayment)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-purple-800 mt-1">
                      <span>Total Outstanding:</span>
                      <span className="font-medium">{formatCurrency(loanSummary.totalOutstanding)}</span>
                    </div>
                  </div>
                )}

                {/* Bank Info */}
                <div className="mt-4 text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-4 h-4" />
                    <span>
                      Payment to {payslip.bankName || 'N/A'} • Account: {payslip.accountNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Hours Summary (if available) */}
            {(payslip.totalHours > 0 || payslip.workingDays > 0) && (
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                {payslip.workingDays > 0 && (
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <span className="text-gray-500 text-xs">Working Days</span>
                    <p className="font-medium">{payslip.workingDays}</p>
                  </div>
                )}
                {payslip.totalHours > 0 && (
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <span className="text-gray-500 text-xs">Total Hours</span>
                    <p className="font-medium">{payslip.totalHours.toFixed(2)}</p>
                  </div>
                )}
                {payslip.overtimeHours > 0 && (
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <span className="text-gray-500 text-xs">Overtime Hours</span>
                    <p className="font-medium">{payslip.overtimeHours.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipCard;