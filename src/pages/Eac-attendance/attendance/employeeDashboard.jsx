import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import LeaveBalanceTracker from "./LeaveBalanceTracker";
import InventoryRequestStatusTracker from "./InventoryRequestStatusTracker";
import html2pdf from "html2pdf.js";
import companyLogo from "../../../assets/companyLogo.jpg";
import {
  CalendarCheck,
  Users,
  FileText,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ListChecks,
  UserCog,
  BarChart3,
  Settings,
  Home,
  Building,
  Truck,
  ShoppingCart,
  Wrench,
  Layers,
  BookOpen,
  Shield,
  AlertCircle,
  Briefcase,
  FolderOpen,
  Database,
  Upload,
  ChevronRight,
  ChevronDown,
  Calendar,
  Download,
  Printer,
  FileText as FileTextIcon,
  CreditCard,
  User,
  Filter,
  Search,
  X,
} from "lucide-react";

const EmployeeDashboard = () => {
  const [accessiblePages, setAccessiblePages] = useState([]);
  const [filteredPages, setFilteredPages] = useState([]);
  const [pageSearchQuery, setPageSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({ username: "", roles: [], email: "" });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [showInventoryStatus, setShowInventoryStatus] = useState(false);
  const [showLeaveBalance, setShowLeaveBalance] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    inProgress: 0,
    issued: 0,
  });
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPayslip, setShowPayslip] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState("");
  const payslipRef = useRef(null);
  const pdfRef = useRef(null);

  const companyName = "EAC ELECTRICAL SOLUTION LIMITED";

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
  const getToken = () => localStorage.getItem("jwtToken");

  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatHours = (v) => `${toNumber(v).toFixed(2)} hrs`;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
    }).format(toNumber(amount));

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchCurrentUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch user info");
      const data = await response.json();

      setUserInfo({
        username: data.username,
        email: data.email,
        roles: data.roles || [data.role].filter(Boolean),
      });

      const empResponse = await fetch(`${API_BASE_URL}/api/employee/email/${data.email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (empResponse.ok) {
        const empData = await empResponse.json();
        setEmployeeInfo(empData);
        setEmployeeDetails(empData);
      }

      return data;
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchPayrollPeriods = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/periods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPayrollPeriods(data);

        if (data.length > 0) {
          const years = [...new Set(data.map((period) => new Date(period.startDate).getFullYear()))];
          const currentYear = new Date().getFullYear();
          setYearFilter(years.includes(currentYear) ? currentYear : Math.max(...years));
        }
      }
    } catch (err) {
      console.error("Error fetching payroll periods:", err);
    }
  };

  const fetchEmployeePayslip = async () => {
    if (!selectedPeriod || !employeeInfo?.id) return;

    setLoadingPayslip(true);
    setError("");
    try {
      const token = getToken();
      const payrollRes = await fetch(
        `${API_BASE_URL}/api/payroll/employee-payslip?periodId=${selectedPeriod}&employeeId=${employeeInfo.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!payrollRes.ok) {
        if (payrollRes.status === 404) {
          setPayrollRecord(null);
          setError("No payslip found for selected period");
        } else {
          throw new Error("Failed to fetch payslip");
        }
      } else {
        const payrollData = await payrollRes.json();
        setPayrollRecord(payrollData);
        setError("");
        setShowPayslip(true);
      }
    } catch (err) {
      setError(err.message);
      setPayrollRecord(null);
    } finally {
      setLoadingPayslip(false);
    }
  };

  // Parse loan details from payroll record
  const loanInfo = useMemo(() => {
    if (!payrollRecord?.loanDetails) return null;
    
    try {
      const parsed = JSON.parse(payrollRecord.loanDetails);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.error("Failed to parse loan details:", e);
      return null;
    }
  }, [payrollRecord]);

  // Calculate loan summary
  const loanSummary = useMemo(() => {
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
  }, [loanInfo]);

  const hasLoanInfo = payrollRecord && (payrollRecord.hasActiveLoans || payrollRecord.loanDeduction > 0);

  const calculateAdditionalFields = (record, employee) => {
    if (!record || !employee) return null;

    const hourlyRate = toNumber(employee.minimumRate);
    const normalShiftHours = toNumber(record.workingDays) * 8;
    const overtimeHours = toNumber(record.overtimeHours);
    const totalHours = normalShiftHours + overtimeHours;

    const weekDayAmount = normalShiftHours * hourlyRate;
    const overtimePay = toNumber(record.overtimePay);
    const basicSalary = toNumber(record.basicSalary) || weekDayAmount;

    const rentAllowance = toNumber(record.rentAllowance);
    const transportAllowance = toNumber(record.transportAllowance);
    const clothingAllowance = toNumber(record.clothingAllowance);
    const otherAllowance = toNumber(record.otherAllowance);

    const totalAllowances = rentAllowance + transportAllowance + clothingAllowance + otherAllowance + overtimePay;
    const grossIncome = basicSalary + totalAllowances;

    const tier2Deduction = toNumber(record.ssnitEmployee);
    const taxableIncome = grossIncome - tier2Deduction;
    const totalDeductions = tier2Deduction + toNumber(record.payeTax);
    
    // Loan repayment deduction
    const loanRepayment = record?.loanDeduction ? toNumber(record.loanDeduction) : 0;
    
    // Net before loan deduction
    const netBeforeLoan = grossIncome - totalDeductions;
    
    // Net after all deductions
    const netSalary = toNumber(record.netSalary) || netBeforeLoan - loanRepayment;

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
      loanRepayment,
      netBeforeLoan,
      netSalary,
      remainingLoanBalance: record?.remainingLoanBalance ? toNumber(record.remainingLoanBalance) : 0,
      hasLoans: record?.hasActiveLoans || false,
      loanSummary
    };
  };

  const hasNonZeroAllowance = (allowanceValue) => {
    return allowanceValue && allowanceValue > 0;
  };

  const getNonZeroAllowances = (additionalFields) => {
    if (!additionalFields) return [];

    const allowances = [];

    if (hasNonZeroAllowance(additionalFields.rentAllowance)) {
      allowances.push({ name: "Rent Allowance", value: additionalFields.rentAllowance });
    }

    if (hasNonZeroAllowance(additionalFields.transportAllowance)) {
      allowances.push({ name: "Transport Allowance", value: additionalFields.transportAllowance });
    }

    if (hasNonZeroAllowance(additionalFields.clothingAllowance)) {
      allowances.push({ name: "Clothing Allowance", value: additionalFields.clothingAllowance });
    }

    if (hasNonZeroAllowance(additionalFields.otherAllowance)) {
      allowances.push({ name: "Other Allowance", value: additionalFields.otherAllowance });
    }

    if (hasNonZeroAllowance(additionalFields.overtimePay)) {
      allowances.push({ name: "Overtime", value: additionalFields.overtimePay });
    }

    return allowances;
  };

  const generatePayslipPDFViaApi = async () => {
    if (!payrollRecord || !employeeInfo) return;

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/payroll/generate-payslip-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodId: selectedPeriod,
          employeeId: employeeInfo.id,
        }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("PDF generation service not available");
        }
        throw new Error("Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      const periodName = payrollRecord.period?.name?.replace(/\s+/g, "-") || "period";
      const employeeName = `${employeeInfo.firstName}-${employeeInfo.lastName}`;

      a.download = `payslip-${employeeName}-${periodName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess("Payslip PDF downloaded successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(""), 5000);
    }
  };

  const generatePayslipPDF = () => {
    if (!pdfRef.current || !employeeDetails || !payrollRecord || !additionalFields) {
      generatePayslipPDFViaApi();
      return;
    }

    setError("");
    setSuccess("");

    const periodName = payrollRecord?.period?.name || "period";
    const first = employeeDetails?.firstName || "employee";
    const last = employeeDetails?.lastName || "";

    const fileName =
      `payslip-${first}-${last}-${periodName}`.replace(/\s+/g, "_").replace(/[\/\\?%*:|"<>]/g, "-") + ".pdf";

    const element = pdfRef.current;

    const options = {
      margin: [8, 8, 8, 8],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        setSuccess("Payslip PDF downloaded successfully");
        setTimeout(() => setSuccess(""), 3000);
      })
      .catch(() => {
        setError("Failed to generate PDF");
        setTimeout(() => setError(""), 5000);
      });
  };

  const printPayslip = () => {
    if (!payslipRef.current || !employeeInfo) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Popup blocked! Please allow popups for this site to print.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    const payslipContent = payslipRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeInfo.firstName} ${employeeInfo.lastName}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', 'Arial', sans-serif; font-size: 12px; line-height: 1.4; color: #000; background: #fff; margin: 0; padding: 15px; }
            @media print { @page { margin: 0.5in; size: A4 portrait; } }
            .print-header { background: linear-gradient(to right, #1e40af, #1e3a8a); color: white; padding: 24px; }
            .company-logo { height: 48px; width: auto; }
            .section-title { font-weight: 600; margin-bottom: 12px; color: #374151; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .total-row { font-weight: 600; border-bottom: 2px solid #000; }
            .salary-section { border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .net-salary { padding: 24px; text-align: center; }
            .footer { background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }
            .signature-line { border-top: 1px solid #000; width: 100px; height: 1px; margin: 20px auto 5px; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,0.1); z-index: -1; }
          </style>
        </head>
        <body>
          <div class="watermark">${companyName}</div>
          <div class="payslip-container">
            ${payslipContent}
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
                Generated on ${new Date().toLocaleDateString("en-GH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 100);
            };

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

  const filteredPeriods = payrollPeriods.filter((period) => {
    const periodYear = new Date(period.startDate).getFullYear();
    const periodMonth = new Date(period.startDate).getMonth();

    if (yearFilter && periodYear !== parseInt(yearFilter)) return false;
    if (monthFilter && periodMonth !== parseInt(monthFilter)) return false;

    return true;
  });

  const months = [
    { value: "", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  const availableYears = [...new Set(payrollPeriods.map((period) => new Date(period.startDate).getFullYear()))].sort(
    (a, b) => b - a
  );

  const handleGeneratePayslip = () => {
    if (!selectedPeriod) {
      setError("Please select a payroll period");
      setTimeout(() => setError(""), 3000);
      return;
    }
    fetchEmployeePayslip();
  };

  const fetchAccessiblePages = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/pages/my-pages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const pages = await response.json();

        const filteredPages = pages.filter(
          (page) =>
            !page.path.includes("/login") &&
            !page.path.includes("/signin") &&
            !page.path.includes("/signup") &&
            !page.path.includes("/register") &&
            !page.name.toLowerCase().includes("signin") &&
            !page.name.toLowerCase().includes("signup") &&
            !page.name.toLowerCase().includes("login") &&
            !page.name.toLowerCase().includes("register")
        );

        const transformedPages = filteredPages.map((page) => ({
          id: page.id,
          to: page.path,
          icon: getIconComponent(page.iconName),
          title: page.name,
          description: page.description || "Access this page",
          module: page.module || "GENERAL",
          isPublic: page.isPublic || false,
          displayOrder: page.displayOrder || 0,
          requiresAuth: page.requiresAuth !== false,
        }));

        transformedPages.sort((a, b) => a.displayOrder - b.displayOrder);
        setAccessiblePages(transformedPages);
        setFilteredPages(transformedPages);
      } else {
        loadFallbackPages();
      }
    } catch (error) {
      console.error("Error fetching accessible pages:", error);
      loadFallbackPages();
    }
  };

  const loadFallbackPages = () => {
    const fallbackPages = [
      {
        to: "/leaveRequestForm",
        icon: <CalendarCheck className="w-6 h-6 text-blue-600" />,
        title: "Leave Request",
        description: "Apply for a new leave request",
        module: "LEAVE",
        isPublic: false,
      },
      {
        to: "/attendance",
        icon: <Clock className="w-6 h-6 text-green-600" />,
        title: "Attendance",
        description: "Manage and track attendance",
        module: "ATTENDANCE",
        isPublic: false,
      },
    ];

    setAccessiblePages(fallbackPages);
    setFilteredPages(fallbackPages);
  };

  const getIconComponent = (iconName) => {
    const iconMap = {
      CalendarCheck: <CalendarCheck className="w-6 h-6 text-blue-600" />,
      Users: <Users className="w-6 h-6 text-purple-600" />,
      Clock: <Clock className="w-6 h-6 text-green-600" />,
      Package: <Package className="w-6 h-6 text-orange-600" />,
      DollarSign: <DollarSign className="w-6 h-6 text-yellow-600" />,
      UserCog: <UserCog className="w-6 h-6 text-orange-600" />,
      ListChecks: <ListChecks className="w-6 h-6 text-indigo-600" />,
      Settings: <Settings className="w-6 h-6 text-gray-600" />,
      BarChart3: <BarChart3 className="w-6 h-6 text-teal-600" />,
      Home: <Home className="w-6 h-6 text-blue-500" />,
      Building: <Building className="w-6 h-6 text-gray-500" />,
      Truck: <Truck className="w-6 h-6 text-red-500" />,
      ShoppingCart: <ShoppingCart className="w-6 h-6 text-green-500" />,
      Wrench: <Wrench className="w-6 h-6 text-yellow-500" />,
      Layers: <Layers className="w-6 h-6 text-purple-500" />,
      BookOpen: <BookOpen className="w-6 h-6 text-blue-400" />,
      Shield: <Shield className="w-6 h-6 text-red-400" />,
      AlertCircle: <AlertCircle className="w-6 h-6 text-orange-400" />,
      Briefcase: <Briefcase className="w-6 h-6 text-gray-400" />,
      FolderOpen: <FolderOpen className="w-6 h-6 text-green-400" />,
      Database: <Database className="w-6 h-6 text-indigo-400" />,
      Upload: <Upload className="w-6 h-6 text-teal-400" />,
      FileText: <FileTextIcon className="w-6 h-6 text-blue-400" />,
      CreditCard: <CreditCard className="w-6 h-6 text-green-400" />,
      User: <User className="w-6 h-6 text-purple-400" />,
      default: <Home className="w-6 h-6 text-gray-400" />,
    };

    return iconMap[iconName] || iconMap.default;
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/leave/my-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
        setFilteredRequests(data);

        setStats({
          total: data.length,
          pending: data.filter((r) => r.status === "Pending").length,
          approved: data.filter((r) => r.status === "Approved").length,
          rejected: data.filter((r) => r.status === "Rejected").length,
        });
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userResponse.ok) return;
      const userData = await userResponse.json();
      const username = userData.username || userData.email;

      const response = await fetch(`${API_BASE_URL}/api/inventory-requests/user/${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const inProgressStatuses = [
          "PROCUREMENT_PENDING",
          "PROCURED",
          "STORE_REVIEW",
          "APPROVED_BY_STORE",
          "RECEIVED_IN_STORE",
        ];

        setInventoryStats({
          total: data.length,
          inProgress: data.filter((r) => inProgressStatuses.includes(r.status)).length,
          issued: data.filter((r) => r.status === "ISSUED").length,
        });
      }
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    }
  };

  const fetchEmailNotifications = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/leave/email-notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmailNotifications(data);
        setUnreadEmails(data.filter((email) => !email.read).length);
      }
    } catch (error) {
      console.error("Error fetching email notifications:", error);
    }
  };

  const additionalFields = calculateAdditionalFields(payrollRecord, employeeInfo);
  const nonZeroAllowances = getNonZeroAllowances(additionalFields);

  const Row = ({ label, value }) => (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "center", marginBottom: "8px" }}>
      <div style={{ color: "#333" }}>{label} :</div>
      <div style={{ borderBottom: "1px solid #bbb", padding: "2px 0 3px 0" }}>{value || "N/A"}</div>
    </div>
  );

  const SectionTitle = ({ title }) => <div style={{ fontWeight: 700, marginBottom: "6px", color: "#222" }}>{title}</div>;

  const AmountTable = ({ rows, footerLabel, footerValue }) => {
    const filtered = rows.filter(([_, val]) => toNumber(val) > 0);

    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc" }}>
            <th style={{ textAlign: "left", padding: "6px 0", fontWeight: 700 }}>ITEM</th>
            <th style={{ textAlign: "right", padding: "6px 0", fontWeight: 700 }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(([label, val], idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 0" }}>{label}</td>
              <td style={{ padding: "6px 0", textAlign: "right" }}>{formatCurrency(val)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ padding: "8px 0", fontWeight: 700 }}>{footerLabel}</td>
            <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 700 }}>{formatCurrency(footerValue)}</td>
          </tr>
        </tbody>
      </table>
    );
  };

  // Filter pages based on search query
  useEffect(() => {
    if (!pageSearchQuery.trim()) {
      setFilteredPages(accessiblePages);
    } else {
      const query = pageSearchQuery.toLowerCase().trim();
      const filtered = accessiblePages.filter(page => 
        page.title.toLowerCase().includes(query) ||
        page.description.toLowerCase().includes(query) ||
        page.module?.toLowerCase().includes(query)
      );
      setFilteredPages(filtered);
    }
  }, [pageSearchQuery, accessiblePages]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCurrentUser();
      await Promise.all([
        fetchAccessiblePages(),
        fetchLeaveRequests(),
        fetchInventoryStats(),
        fetchEmailNotifications(),
        fetchPayrollPeriods(),
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (statusFilter === "All") {
      setFilteredRequests(leaveRequests);
    } else {
      setFilteredRequests(leaveRequests.filter((req) => req.status === statusFilter));
    }
  }, [statusFilter, leaveRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-white shadow-sm border-b rounded-lg mb-6">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userInfo.username}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {userInfo.roles.map((role, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                  {role.replace("ROLE_", "")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <CalendarCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Leave Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg mr-4">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inventory Requests</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryStats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <FileTextIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Payslips</p>
                <p className="text-2xl font-bold text-gray-900">{payrollPeriods.filter((p) => payrollRecord).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <AlertCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{unreadEmails}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/leaveRequestForm"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Apply for Leave</h3>
                  <p className="text-sm text-gray-600">Submit leave request</p>
                </div>
              </Link>

              <Link
                to="/inventoryRequest"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-orange-100 rounded-lg mr-3">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Request Inventory</h3>
                  <p className="text-sm text-gray-600">Request items/PPE</p>
                </div>
              </Link>

              <button
                onClick={() => setShowLeaveBalance(!showLeaveBalance)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Leave Balance</h3>
                  <p className="text-sm text-gray-600">View available leave</p>
                </div>
              </button>

              <button
                onClick={() => setShowPayslip(!showPayslip)}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <FileTextIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Payslip</h3>
                  <p className="text-sm text-gray-600">Check your payslip</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPayslip && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">My Payslip</h2>
              <button onClick={() => setShowPayslip(false)} className="text-gray-500 hover:text-gray-700">
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Year</label>
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Month</label>
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Payroll Period</label>
                    <select
                      value={selectedPeriod || ""}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingPayslip || filteredPeriods.length === 0}
                    >
                      <option value="">Select a period</option>
                      {filteredPeriods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.name} ({formatDate(period.startDate)} - {formatDate(period.endDate)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleGeneratePayslip}
                    disabled={!selectedPeriod || loadingPayslip}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-8 rounded-lg font-medium transition duration-200 flex items-center"
                  >
                    {loadingPayslip ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Payslip...
                      </>
                    ) : (
                      <>
                        <FileTextIcon className="w-5 h-5 mr-2" />
                        Generate Payslip
                      </>
                    )}
                  </button>
                </div>
              </div>

              {loadingPayslip && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}

              {error && !loadingPayslip && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">{error}</div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">{success}</div>
              )}

              {payrollRecord && employeeInfo && additionalFields && !loadingPayslip && (
                <div>
                  <div className="flex justify-end gap-2 mb-6">
                    <button
                      onClick={generatePayslipPDF}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                    <button
                      onClick={printPayslip}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </button>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <div className="bg-white p-2 rounded-lg">
                            <div className="w-12 h-12 bg-blue-100 flex items-center justify-center rounded">
                              <span className="font-bold text-xl text-blue-800">EAC</span>
                            </div>
                          </div>
                          <div>
                            <h1 className="text-2xl font-bold">{companyName}</h1>
                            <p className="text-blue-200">Payroll Management System</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">PAYSLIP</div>
                          <div className="text-blue-200 text-sm">Period: {payrollRecord.period?.name || "N/A"}</div>
                          <div className="text-blue-200 text-sm">Date: {new Date().toLocaleDateString("en-GH")}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-b border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="font-semibold text-gray-700 mb-3">Employee Details</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Staff No:</span>
                              <span className="font-medium">{employeeInfo.employeeId || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">SSNIT No:</span>
                              <span className="font-medium">{employeeInfo.ssnitNumber || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Name:</span>
                              <span className="font-semibold text-lg">
                                {employeeInfo.firstName} {employeeInfo.lastName}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Position:</span>
                              <span className="font-medium">{employeeInfo.jobPosition || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Employee Rate:</span>
                              <span className="font-medium">
                                {employeeInfo?.minimumRate !== undefined && employeeInfo?.minimumRate !== null
                                  ? `${employeeInfo.minimumRate} GHS / Hrs`
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-700 mb-3">Bank & Hours</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Bank:</span>
                              <span className="font-medium">{employeeInfo.bankName || employeeInfo.bank || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Account No:</span>
                              <span className="font-medium">{employeeInfo.accountNumber || "N/A"}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Normal Hours:</span>
                              <span>{toNumber(additionalFields.normalShiftHours).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                              <span className="text-gray-600">Overtime Hours:</span>
                              <span>{toNumber(additionalFields.overtimeHours).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-semibold">
                              <span>Total Hours:</span>
                              <span className="text-blue-600">{toNumber(additionalFields.totalHours).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-700 mb-4 text-lg">Salary Breakdown</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-3">EARNINGS</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-green-100">
                              <span>Basic Salary:</span>
                              <span className="font-semibold">{formatCurrency(additionalFields.basicSalary)}</span>
                            </div>

                            {hasNonZeroAllowance(additionalFields.overtimePay) && (
                              <div className="flex justify-between py-2 border-b border-green-100">
                                <span>Overtime:</span>
                                <span className="font-semibold">{formatCurrency(additionalFields.overtimePay)}</span>
                              </div>
                            )}

                            {nonZeroAllowances.map((allowance, index) => (
                              <div key={index} className="flex justify-between py-2 border-b border-green-100">
                                <span>{allowance.name}:</span>
                                <span>{formatCurrency(allowance.value)}</span>
                              </div>
                            ))}

                            <div className="flex justify-between py-2 pt-4 font-semibold text-green-800 border-t-2 border-green-300">
                              <span>Total Earnings:</span>
                              <span>{formatCurrency(additionalFields.grossIncome)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                          <h4 className="font-semibold text-red-800 mb-3">DEDUCTIONS</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-red-100">
                              <span>SSNIT Tier 2 (5.5%):</span>
                              <span>{formatCurrency(additionalFields.tier2Deduction)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-red-100">
                              <span>Income Tax (PAYE):</span>
                              <span>{formatCurrency(payrollRecord.payeTax)}</span>
                            </div>
                            
                            {/* Loan Repayment Section */}
                            {hasLoanInfo && (
                              <>
                                <div className="border-t border-red-200 my-2 pt-2">
                                  <div className="flex justify-between py-2 font-medium text-purple-800">
                                    <span>Loan Repayment:</span>
                                    <span>{formatCurrency(payrollRecord.loanDeduction || 0)}</span>
                                  </div>
                                  
                                  {/* Loan Details Subsection */}
                                  {loanInfo && loanInfo.length > 0 && (
                                    <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                                      <p className="font-medium mb-1 text-purple-700">Active Loans Details:</p>
                                      {loanInfo.map((loan, idx) => (
                                        <div key={idx} className="mb-2 pb-1 border-b border-gray-200 last:border-0">
                                          <div className="flex justify-between text-gray-700 font-medium">
                                            <span>Loan #{loan.id}</span>
                                            <span className="text-purple-600">{formatCurrency(loan.monthlyPayment)}/month</span>
                                          </div>
                                          <div className="flex justify-between text-gray-600 text-[10px] mt-1">
                                            <span>Requested: {formatCurrency(loan.originalAmount || 0)}</span>
                                            <span>Paid this month: {formatCurrency(loan.deducted || 0)}</span>
                                          </div>
                                          <div className="flex justify-between text-gray-600 text-[10px]">
                                            <span>Outstanding: {formatCurrency(loan.remaining || 0)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            <div className="flex justify-between py-2 pt-4 font-semibold text-red-800 border-t-2 border-red-300">
                              <span>Total Deductions:</span>
                              <span>{formatCurrency(additionalFields.totalDeductions + (payrollRecord.loanDeduction || 0))}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Net Salary Calculation Section */}
                      <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Net Salary Calculation
                        </h4>
                        
                        <div className="space-y-3">
                          {/* Gross */}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-700">Gross Salary:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(additionalFields.grossIncome)}</span>
                          </div>

                          {/* Statutory Deductions Breakdown */}
                          <div className="ml-4 space-y-1 border-l-2 border-blue-200 pl-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">SSNIT Tier 2 (5.5%):</span>
                              <span className="text-red-600">- {formatCurrency(additionalFields.tier2Deduction)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Income Tax (PAYE):</span>
                              <span className="text-red-600">- {formatCurrency(payrollRecord.payeTax)}</span>
                            </div>
                          </div>

                          {/* Net Before Loan */}
                          <div className="flex justify-between items-center py-2 border-t border-blue-200">
                            <span className="font-medium text-blue-700">Net After Statutory Deductions:</span>
                            <span className="font-bold text-blue-700">
                              {formatCurrency(additionalFields.netBeforeLoan)}
                            </span>
                          </div>

                          {/* Loan Deduction (if any) */}
                          {payrollRecord.loanDeduction > 0 && (
                            <>
                              <div className="flex justify-between items-center py-1">
                                <span className="text-gray-700">Less: Loan Repayment:</span>
                                <span className="text-purple-600 font-medium">- {formatCurrency(payrollRecord.loanDeduction)}</span>
                              </div>
                            </>
                          )}

                          {/* Final Net */}
                          <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-blue-300 bg-white bg-opacity-60 p-3 rounded-lg">
                            <div>
                              <span className="font-bold text-lg text-blue-800">FINAL NET SALARY</span>
                              {payrollRecord.loanDeduction > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  (After all deductions including loans)
                                </div>
                              )}
                            </div>
                            <span className="text-2xl font-bold text-blue-800">{formatCurrency(additionalFields.netSalary)}</span>
                          </div>

                          {/* Before/After Comparison Card */}
                          {payrollRecord.loanDeduction > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div className="bg-blue-100 p-3 rounded-lg text-center">
                                <div className="text-xs text-blue-800 mb-1">BEFORE LOAN</div>
                                <div className="font-bold text-blue-800 text-lg">
                                  {formatCurrency(additionalFields.netBeforeLoan)}
                                </div>
                                <div className="text-[10px] text-blue-600 mt-1">
                                  Gross - Statutory
                                </div>
                              </div>
                              <div className="bg-purple-100 p-3 rounded-lg text-center">
                                <div className="text-xs text-purple-800 mb-1">AFTER LOAN</div>
                                <div className="font-bold text-purple-800 text-lg">
                                  {formatCurrency(additionalFields.netSalary)}
                                </div>
                                <div className="text-[10px] text-purple-600 mt-1">
                                  Final Net Salary
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-green-500 to-green-600">
                      <div className="text-center text-white">
                        <div className="text-sm opacity-90">NET SALARY</div>
                        <div className="text-3xl font-bold">{formatCurrency(additionalFields.netSalary)}</div>
                        <div className="text-sm opacity-90 mt-2">
                          Paid to {employeeInfo.bankName || employeeInfo.bank || "N/A"} • Account:{" "}
                          {employeeInfo.accountNumber || "N/A"}
                        </div>
                        {payrollRecord.remainingLoanBalance > 0 && (
                          <div className="text-xs opacity-80 mt-1">
                            Remaining Loan Balance: {formatCurrency(payrollRecord.remainingLoanBalance)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 text-center text-gray-600 text-sm">
                      <div className="font-semibold">{companyName}</div>
                      <div>P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com</div>
                      <div className="text-xs mt-1 text-gray-500">
                        This is a computer-generated payslip. No signature is required.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leave Requests</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="p-6">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No leave requests found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-lg ${
                          req.status === "Approved"
                            ? "bg-green-100"
                            : req.status === "Rejected"
                            ? "bg-red-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        {req.status === "Approved" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : req.status === "Rejected" ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{req.leaveType}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          req.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : req.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {emailNotifications.slice(0, 5).map((email, index) => (
                <div key={index} className={`p-3 rounded-lg ${!email.read ? "bg-blue-50" : "bg-gray-50"}`}>
                  <div className="flex items-start space-x-3">
                    <AlertCircle className={`w-5 h-5 mt-0.5 ${!email.read ? "text-blue-600" : "text-gray-400"}`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{email.subject}</h4>
                      <p className="text-sm text-gray-600 truncate">{email.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              {emailNotifications.length === 0 && <p className="text-gray-500 text-center py-4">No notifications</p>}
            </div>
          </div>
        </div>
      </div>

      {payrollRecord && employeeInfo && additionalFields && (
        <div className="hidden">
          <div ref={payslipRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 print-header">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="bg-white p-2 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 flex items-center justify-center rounded">
                      <span className="font-bold text-xl text-blue-800">EAC</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{companyName}</h1>
                    <p className="text-blue-200">Payroll Management System</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">PAYSLIP</div>
                  <div className="text-blue-200 text-sm">Period: {payrollRecord.period?.name || "N/A"}</div>
                  <div className="text-blue-200 text-sm">Date: {new Date().toLocaleDateString("en-GH")}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 section-title">Employee Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Staff No:</span>
                      <span className="font-medium">{employeeInfo.employeeId || "N/A"}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">SSNIT No:</span>
                      <span className="font-medium">{employeeInfo.ssnitNumber || "N/A"}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold text-lg">
                        {employeeInfo.firstName} {employeeInfo.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Position:</span>
                      <span className="font-medium">{employeeInfo.jobPosition || "N/A"}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Employee Rate:</span>
                      <span className="font-medium">
                        {employeeInfo?.minimumRate !== undefined && employeeInfo?.minimumRate !== null
                          ? `${employeeInfo.minimumRate} GHS / Hrs`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3 section-title">Bank & Hours</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Bank:</span>
                      <span className="font-medium">{employeeInfo.bankName || employeeInfo.bank || "N/A"}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Account No:</span>
                      <span className="font-medium">{employeeInfo.accountNumber || "N/A"}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Normal Hours:</span>
                      <span>{toNumber(additionalFields.normalShiftHours).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between detail-row">
                      <span className="text-gray-600">Overtime Hours:</span>
                      <span>{toNumber(additionalFields.overtimeHours).toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between detail-row total-row">
                      <span>Total Hours:</span>
                      <span className="text-blue-600">{toNumber(additionalFields.totalHours).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4 text-lg section-title">Salary Breakdown</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-200 salary-section">
                  <h4 className="font-semibold text-green-800 mb-3 section-title">EARNINGS</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between detail-row">
                      <span>Basic Salary:</span>
                      <span className="font-semibold">{formatCurrency(additionalFields.basicSalary)}</span>
                    </div>

                    {hasNonZeroAllowance(additionalFields.overtimePay) && (
                      <div className="flex justify-between detail-row">
                        <span>Overtime:</span>
                        <span className="font-semibold">{formatCurrency(additionalFields.overtimePay)}</span>
                      </div>
                    )}

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
                    
                    {/* Loan Repayment Section */}
                    {hasLoanInfo && (
                      <>
                        <div className="border-t border-red-200 my-2 pt-2">
                          <div className="flex justify-between detail-row font-medium text-purple-800">
                            <span>Loan Repayment:</span>
                            <span>{formatCurrency(payrollRecord.loanDeduction || 0)}</span>
                          </div>
                          
                          {/* Loan Details Subsection */}
                          {loanInfo && loanInfo.length > 0 && (
                            <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                              <p className="font-medium mb-1 text-purple-700">Active Loans Details:</p>
                              {loanInfo.map((loan, idx) => (
                                <div key={idx} className="mb-2 pb-1 border-b border-gray-200 last:border-0">
                                  <div className="flex justify-between text-gray-700 font-medium">
                                    <span>Loan #{loan.id}</span>
                                    <span className="text-purple-600">{formatCurrency(loan.monthlyPayment)}/month</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600 text-[10px] mt-1">
                                    <span>Requested: {formatCurrency(loan.originalAmount || 0)}</span>
                                    <span>Paid this month: {formatCurrency(loan.deducted || 0)}</span>
                                  </div>
                                  <div className="flex justify-between text-gray-600 text-[10px]">
                                    <span>Outstanding: {formatCurrency(loan.remaining || 0)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-between detail-row total-row">
                      <span>Total Deductions:</span>
                      <span className="font-semibold text-red-800">
                        {formatCurrency(additionalFields.totalDeductions + (payrollRecord.loanDeduction || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 net-salary">
              <div className="text-center text-white">
                <div className="text-sm opacity-90">NET SALARY</div>
                <div className="text-3xl font-bold">{formatCurrency(additionalFields.netSalary)}</div>
                <div className="text-sm opacity-90 mt-2">
                  Paid to {employeeInfo.bankName || employeeInfo.bank || "N/A"} • Account: {employeeInfo.accountNumber || "N/A"}
                </div>
                {payrollRecord.remainingLoanBalance > 0 && (
                  <div className="text-xs opacity-80 mt-1">
                    Remaining Loan Balance: {formatCurrency(payrollRecord.remainingLoanBalance)}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 text-center text-gray-600 text-sm footer">
              <div className="font-semibold">{companyName}</div>
              <div>P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com</div>
              <div className="text-xs mt-1 text-gray-500">This is a computer-generated payslip. No signature is required.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div
          ref={pdfRef}
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "14mm",
            background: "#fff",
            color: "#111",
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>{companyName}</div>
              <div style={{ fontSize: "10px", color: "#666" }}>P. O. Box AB 253 Abeka-Accra Ghana</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <img
                src={companyLogo}
                alt="Logo"
                style={{ width: "70px", height: "auto", objectFit: "contain" }}
                crossOrigin="anonymous"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <div style={{ marginTop: "6px", fontSize: "10px", color: "#666" }}>PAYSLIP</div>
            </div>
          </div>

          <div style={{ height: "8px", background: "#3bb54a", margin: "10px 0 14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <Row
                label="Employee Name"
                value={`${employeeDetails?.firstName || ""} ${employeeDetails?.lastName || ""}`.trim() || "N/A"}
              />
              <Row label="Employee ID" value={employeeDetails?.employeeId || "N/A"} />
              <Row label="SSNIT No" value={employeeDetails?.ssnitNumber || "N/A"} />
              <Row label="Contact No" value={employeeDetails?.phone || "N/A"} />
            </div>

            <div>
              <Row label="E-mail" value={employeeDetails?.email || "N/A"} />
              <Row
                label="Employee Rate"
                value={
                  employeeDetails?.minimumRate !== undefined && employeeDetails?.minimumRate !== null
                    ? `${employeeDetails.minimumRate} GHS / Hrs`
                    : "N/A"
                }
              />
              <Row label="Designation" value={employeeDetails?.jobPosition || "N/A"} />
              <Row label="Pay Period" value={payrollRecord?.period?.name || "N/A"} />
            </div>
          </div>

          <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
            <div>
              <Row label="Normal Hours" value={formatHours(additionalFields?.normalShiftHours || 0)} />
            </div>
            <div>
              <Row label="Overtime Hours" value={formatHours(additionalFields?.overtimeHours || 0)} />
              <Row label="Total Hours" value={formatHours(additionalFields?.totalHours || 0)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginTop: "16px" }}>
            <div>
              <SectionTitle title="EARNINGS" />
              <AmountTable
                rows={[
                  ["Basic Salary", additionalFields?.basicSalary || 0],
                  ["Overtime", additionalFields?.overtimePay || 0],
                  ["Rent Allowance", additionalFields?.rentAllowance || 0],
                  ["Transport Allowance", additionalFields?.transportAllowance || 0],
                  ["Clothing Allowance", additionalFields?.clothingAllowance || 0],
                  ["Other Allowance", additionalFields?.otherAllowance || 0],
                ]}
                footerLabel="Total Earnings"
                footerValue={additionalFields?.grossIncome || 0}
              />
            </div>

            <div>
              <SectionTitle title="DEDUCTIONS" />
              <AmountTable
                rows={[
                  ["SSNIT Tier 2 (5.5%)", additionalFields?.tier2Deduction || 0],
                  ["Income Tax (PAYE)", payrollRecord?.payeTax || 0],
                  ...(payrollRecord?.loanDeduction > 0 ? [["Loan Repayment", payrollRecord?.loanDeduction]] : []),
                ]}
                footerLabel="Total Deductions"
                footerValue={(additionalFields?.totalDeductions || 0) + (payrollRecord?.loanDeduction || 0)}
              />
            </div>
          </div>

          <div style={{ marginTop: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <div>NET SALARY</div>
              <div>{formatCurrency(additionalFields?.netSalary || 0)}</div>
            </div>
            <div style={{ borderTop: "1px solid #ddd", marginTop: "8px", paddingTop: "8px", fontSize: "10px", color: "#666" }}>
              Paid to {employeeDetails?.bank || employeeDetails?.bankName || "N/A"} • Account: {employeeDetails?.accountNumber || "N/A"}
            </div>
            {payrollRecord?.remainingLoanBalance > 0 && (
              <div style={{ marginTop: "4px", fontSize: "9px", color: "#purple" }}>
                Remaining Loan Balance: {formatCurrency(payrollRecord.remainingLoanBalance)}
              </div>
            )}
          </div>

          <div style={{ position: "absolute", bottom: "14mm", left: "14mm", right: "14mm", fontSize: "9px", color: "#666" }}>
            This is a computer-generated payslip. No signature is required.
          </div>
        </div>
      </div>

      {showLeaveBalance && employeeInfo && (
        <div className="mb-8 bg-white rounded-lg shadow">
          <LeaveBalanceTracker employeeId={employeeInfo.id} />
        </div>
      )}

      {showInventoryStatus && employeeInfo && (
        <div className="mb-8 bg-white rounded-lg shadow">
          <InventoryRequestStatusTracker employeeId={employeeInfo.id} />
        </div>
      )}

      {/* All Applications Section with Search */}
      {accessiblePages.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Applications</h2>
            
            {/* Search Input for Pages */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search applications by name, description, or module..."
                value={pageSearchQuery}
                onChange={(e) => setPageSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              {pageSearchQuery && (
                <button
                  onClick={() => setPageSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Search Results Count */}
          {pageSearchQuery && (
            <div className="mb-3 text-sm text-gray-500">
              Found {filteredPages.length} {filteredPages.length === 1 ? "application" : "applications"} matching "{pageSearchQuery}"
            </div>
          )}
          
          {/* Applications Grid */}
          {filteredPages.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No applications found</h3>
                <p className="text-gray-500 text-sm">
                  {pageSearchQuery 
                    ? `No results matching "${pageSearchQuery}". Try a different search term.`
                    : "No applications available for your role."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredPages.map((page) => (
                <Link
                  key={page.id || page.to}
                  to={page.to}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow group"
                >
                  <div className="mb-3 group-hover:scale-110 transition-transform duration-200">
                    {page.icon}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{page.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{page.description}</p>
                  
                  {/* Module Badge */}
                  {page.module && page.module !== "GENERAL" && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mb-2">
                      {page.module}
                    </span>
                  )}
                  
                  <div className="flex items-center text-blue-600 text-sm group-hover:text-blue-700">
                    <span>Open</span>
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;