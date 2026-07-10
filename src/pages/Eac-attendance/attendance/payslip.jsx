import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import MainSidebar from "../mainSidebar";
import Header from "../../../components/Header";
import companyLogo from "../../../assets/companyLogo.jpg";
import html2pdf from "html2pdf.js";
import JSZip from "jszip";

function Payslip() {
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [payrollRecord, setPayrollRecord] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // New state for bulk printing
  const [bulkSelectedEmployees, setBulkSelectedEmployees] = useState([]);
  const [bulkPayrollRecords, setBulkPayrollRecords] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [selectAll, setSelectAll] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  
  // Search state for both single and bulk modes
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [singleEmployeeSearch, setSingleEmployeeSearch] = useState("");

  const location = useLocation();
  const payslipRef = useRef(null);
  const pdfRef = useRef(null);
  const bulkPayslipsRef = useRef(null);

  const companyName = "EAC ELECTRICAL SOLUTION LIMITED";

  const getToken = () => localStorage.getItem("jwtToken");

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
    if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
    if (hostname === "100.114.178.13") return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  };

  const API_BASE_URL = getApiBaseUrl();

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Responsive sidebar handling
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

  // Fetch user
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
    return date.toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
  };

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
      setError(err.message || "Failed to fetch payroll periods");
      setTimeout(() => setError(""), 5000);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (err) {}
  };

  const fetchEmployeeDetails = async (employeeId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to fetch employee details");
      return await res.json();
    } catch (err) {
      return null;
    }
  };

  // Filter employees for bulk mode
  const filteredEmployeesForBulk = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    
    const searchTerm = employeeSearch.toLowerCase().trim();
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm)) ||
      (emp.jobPosition && emp.jobPosition.toLowerCase().includes(searchTerm)) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm))
    );
  }, [employees, employeeSearch]);

  // Filter employees for single mode
  const filteredEmployeesForSingle = useMemo(() => {
    if (!singleEmployeeSearch.trim()) return employees;
    
    const searchTerm = singleEmployeeSearch.toLowerCase().trim();
    return employees.filter(emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchTerm)) ||
      (emp.jobPosition && emp.jobPosition.toLowerCase().includes(searchTerm)) ||
      (emp.department && emp.department.toLowerCase().includes(searchTerm))
    );
  }, [employees, singleEmployeeSearch]);

  const fetchEmployeePayslip = async () => {
    if (!selectedPeriod || !selectedEmployeeId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = getToken();
      const payrollRes = await fetch(
        `${API_BASE_URL}/api/payroll/employee-payslip?periodId=${selectedPeriod}&employeeId=${selectedEmployeeId}`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );

      if (!payrollRes.ok) {
        if (payrollRes.status === 404) {
          setPayrollRecord(null);
          setEmployeeDetails(null);
          setError("No payslip found for selected employee and period");
        } else {
          throw new Error("Failed to fetch payslip");
        }
      } else {
        const payrollData = await payrollRes.json();
        setPayrollRecord(payrollData);

        const employeeData = await fetchEmployeeDetails(selectedEmployeeId);
        setEmployeeDetails(employeeData);

        setError("");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch payslip");
      setPayrollRecord(null);
      setEmployeeDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkPayslips = async () => {
    if (!selectedPeriod || bulkSelectedEmployees.length === 0) {
      setError("Please select a period and at least one employee");
      return;
    }

    setBulkLoading(true);
    setBulkProgress({ current: 0, total: bulkSelectedEmployees.length });
    setError("");
    
    const records = [];
    
    for (let i = 0; i < bulkSelectedEmployees.length; i++) {
      const empId = bulkSelectedEmployees[i];
      setBulkProgress({ current: i + 1, total: bulkSelectedEmployees.length });
      
      try {
        const token = getToken();
        const payrollRes = await fetch(
          `${API_BASE_URL}/api/payroll/employee-payslip?periodId=${selectedPeriod}&employeeId=${empId}`,
          {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }
        );

        if (payrollRes.ok) {
          const payrollData = await payrollRes.json();
          const employeeData = await fetchEmployeeDetails(empId);
          
          if (employeeData) {
            records.push({
              payrollRecord: payrollData,
              employeeDetails: employeeData
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch payslip for employee ${empId}:`, err);
      }
    }
    
    setBulkPayrollRecords(records);
    setBulkLoading(false);
    setBulkProgress({ current: 0, total: 0 });
    
    if (records.length === 0) {
      setError("No payslips found for the selected employees");
    } else {
      setSuccess(`Successfully loaded ${records.length} payslips`);
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setBulkSelectedEmployees([]);
    } else {
      setBulkSelectedEmployees(filteredEmployeesForBulk.map(emp => emp.id));
    }
    setSelectAll(!selectAll);
  };

  const handleEmployeeSelect = (employeeId) => {
    if (bulkSelectedEmployees.includes(employeeId)) {
      setBulkSelectedEmployees(bulkSelectedEmployees.filter(id => id !== employeeId));
      setSelectAll(false);
    } else {
      setBulkSelectedEmployees([...bulkSelectedEmployees, employeeId]);
    }
  };

  const generateBulkPDF = () => {
    if (bulkPayrollRecords.length === 0) {
      setError("No payslips to generate");
      return;
    }

    setError("");
    setSuccess("");

    const periodName = payrollPeriods.find(p => p.id === selectedPeriod)?.name || "period";
    const fileName = `bulk-payslips-${periodName}-${new Date().toISOString().split('T')[0]}.pdf`;

    const container = document.createElement('div');
    container.style.width = '210mm';
    container.style.backgroundColor = '#fff';
    
    bulkPayrollRecords.forEach((record, index) => {
      const payslipHtml = generatePayslipHTML(record.employeeDetails, record.payrollRecord);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = payslipHtml;
      
      if (index < bulkPayrollRecords.length - 1) {
        wrapper.style.pageBreakAfter = 'always';
        wrapper.style.marginBottom = '20px';
      }
      
      container.appendChild(wrapper);
    });

    document.body.appendChild(container);

    const options = {
      margin: [8, 8, 8, 8],
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    html2pdf()
      .set(options)
      .from(container)
      .save()
      .then(() => {
        setSuccess(`Successfully generated PDF with ${bulkPayrollRecords.length} payslips`);
        document.body.removeChild(container);
        setTimeout(() => setSuccess(""), 3000);
      })
      .catch((err) => {
        setError("Failed to generate PDF");
        document.body.removeChild(container);
        setTimeout(() => setError(""), 5000);
      });
  };

  // Generate individual PDFs and package them in a ZIP file
  const generateBulkZipPDF = async () => {
    if (bulkPayrollRecords.length === 0) {
      setError("No payslips to download");
      return;
    }

    setBulkLoading(true);
    setError("");
    setSuccess("");

    const zip = new JSZip();
    const periodName = payrollPeriods.find(p => p.id === selectedPeriod)?.name || "period";
    const sanitizedPeriodName = periodName.replace(/[^a-z0-9]/gi, '_');
    const folder = zip.folder(`payslips-${sanitizedPeriodName}-${new Date().toISOString().split('T')[0]}`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < bulkPayrollRecords.length; i++) {
      const record = bulkPayrollRecords[i];
      const employee = record.employeeDetails;
      const payroll = record.payrollRecord;
      
      const firstName = (employee?.firstName || "employee").replace(/[^a-z0-9]/gi, '_');
      const lastName = (employee?.lastName || "").replace(/[^a-z0-9]/gi, '_');
      const fileName = `payslip_${firstName}_${lastName}_${sanitizedPeriodName}.pdf`;
      
      setBulkProgress({ current: i + 1, total: bulkPayrollRecords.length });
      
      try {
        // Generate the payslip HTML content using the updated function
        const htmlContent = generatePayslipHTML(employee, payroll);
        
        // Create a complete HTML document as a string with minimal styling
        const fullHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Payslip - ${employee?.firstName || ''} ${employee?.lastName || ''}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: Arial, sans-serif; 
                  font-size: 11px; 
                  line-height: 1.4; 
                  color: #111; 
                  background: #fff; 
                  margin: 0; 
                  padding: 14mm;
                }
                @media print {
                  @page {
                    margin: 0.5in;
                    size: A4 portrait;
                  }
                }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `;
        
        // Create a blob from the HTML string
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Create an iframe to render the HTML properly
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        document.body.appendChild(iframe);
        
        // Load the HTML into the iframe
        iframe.src = url;
        
        // Wait for iframe to load and render
        await new Promise((resolve) => {
          iframe.onload = () => {
            setTimeout(resolve, 200);
          };
        });
        
        // Now generate PDF from the iframe's content
        const options = {
          margin: [8, 8, 8, 8],
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };
        
        const pdfBlob = await html2pdf()
          .set(options)
          .from(iframe.contentDocument.body)
          .output('blob');
        
        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(iframe);
        
        folder.file(fileName, pdfBlob);
        successCount++;
        
      } catch (err) {
        console.error(`Failed to generate PDF for ${employee?.firstName} ${employee?.lastName}:`, err);
        failCount++;
      }
    }
    
    // Generate and download ZIP
    try {
      const content = await zip.generateAsync({ type: "blob" });
      const zipFileName = `bulk-payslips-${sanitizedPeriodName}-${new Date().toISOString().split('T')[0]}.zip`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setSuccess(`Successfully downloaded ${successCount} payslips as ZIP file${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    } catch (err) {
      console.error("Failed to create ZIP file:", err);
      setError("Failed to create ZIP file");
    } finally {
      setBulkLoading(false);
      setBulkProgress({ current: 0, total: 0 });
      setTimeout(() => setSuccess(""), 5000);
      setTimeout(() => setError(""), 5000);
    }
  };

  const printBulkPayslips = () => {
    if (bulkPayrollRecords.length === 0) {
      setError("No payslips to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Popup blocked! Please allow popups for this site to print.");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk Payslips</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px; 
              line-height: 1.4; 
              color: #111; 
              background: #fff; 
              margin: 0; 
              padding: 10mm;
            }
            @media print { 
              @page { 
                margin: 0.5in; 
                size: A4 portrait; 
              } 
              .page-break {
                page-break-after: always;
              }
            }
            .payslip-container {
              margin-bottom: 20mm;
            }
          </style>
        </head>
        <body>
    `;

    bulkPayrollRecords.forEach((record, index) => {
      const html = generatePayslipHTML(record.employeeDetails, record.payrollRecord);
      htmlContent += `<div class="payslip-container">${html}</div>`;
      if (index < bulkPayrollRecords.length - 1) {
        htmlContent += `<div class="page-break"></div>`;
      }
    });

    htmlContent += `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 100);
            };
            window.onafterprint = function() {
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // UPDATED: This function now matches the single download layout exactly
  const generatePayslipHTML = (employee, payroll) => {
    const normalHours = toNumber(payroll.totalHours) - toNumber(payroll.overtimeHours);
    const overtimeHours = toNumber(payroll.overtimeHours);
    
    const basicSalary = toNumber(payroll.basicSalary);
    const overtimePay = toNumber(payroll.overtimePay);
    const rentAllowance = toNumber(payroll.rentAllowance);
    const transportAllowance = toNumber(payroll.transportAllowance);
    const clothingAllowance = toNumber(payroll.clothingAllowance);
    const otherAllowance = toNumber(payroll.otherAllowance);
    const totalEarnings = toNumber(payroll.grossSalary);
    
    const ssnitDeduction = toNumber(payroll.ssnitEmployee);
    const payeTax = toNumber(payroll.payeTax);
    const loanDeduction = toNumber(payroll.loanDeduction);
    const totalDeductions = ssnitDeduction + payeTax + loanDeduction;
    const netSalary = toNumber(payroll.netSalary);
    
    return `
      <div style="width: 100%; font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff;">
        
        <!-- Header with company name and logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #1e3a8a;">${companyName}</div>
            <div style="font-size: 9px; color: #666;">P. O. Box AB 253 Abeka-Accra Ghana</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: bold; color: #1e3a8a;">PAYSLIP</div>
          </div>
        </div>

        <!-- Employee Information Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px;">
          <tr>
            <td style="padding: 4px 0; width: 50%;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Employee Name:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.firstName || ''} ${employee?.lastName || ''}</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Employee ID:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.employeeId || 'N/A'}</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>SSNIT No:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.ssnitNumber || 'N/A'}</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Contact No:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.phone || 'N/A'}</td></tr>
              </table>
            </td>
            <td style="padding: 4px 0; width: 50%;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 3px 0; width: 100px;"><strong>E-mail:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.email || 'N/A'}</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Employee Rate:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.minimumRate || 'N/A'} GHS / Hrs</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Designation:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${employee?.jobPosition || 'N/A'}</td></tr>
                <tr><td style="padding: 3px 0; width: 100px;"><strong>Pay Period:</strong></td><td style="border-bottom: 1px solid #ccc; padding: 3px 5px;">${payroll.period?.name || 'N/A'}</td></tr>
              </tr>
            </td>
          </tr>
        </table>

        <!-- Hours Row -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
          <tr>
            <td style="width: 50%;"><strong>Normal Hours:</strong> ${formatHours(normalHours)}</td>
            <td style="width: 50%;"><strong>Overtime Hours:</strong> ${formatHours(overtimeHours)}</td>
          </tr>
        </table>

        <!-- Earnings and Deductions Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="text-align: left; padding: 8px; border: 1px solid #ddd; width: 35%;">EARNINGS</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd; width: 15%;">AMOUNT</th>
              <th style="text-align: left; padding: 8px; border: 1px solid #ddd; width: 35%;">DEDUCTIONS</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd; width: 15%;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Basic Salary</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(basicSalary)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">SSNIT Tier 2 (5.5%)</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(ssnitDeduction)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Overtime</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${overtimePay > 0 ? formatCurrency(overtimePay) : 'GH¢0.00'}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Income Tax (PAYE)</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(payeTax)}</td>
            </tr>
            ${rentAllowance > 0 ? `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Rent Allowance</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(rentAllowance)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;"></td>
            </tr>
            ` : ''}
            ${transportAllowance > 0 ? `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Transport Allowance</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(transportAllowance)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;"></td>
            </tr>
            ` : ''}
            ${clothingAllowance > 0 ? `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Clothing Allowance</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(clothingAllowance)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;"></td>
            </tr>
            ` : ''}
            ${otherAllowance > 0 ? `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Other Allowance</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(otherAllowance)}</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;"></td>
            </tr>
            ` : ''}
            ${loanDeduction > 0 ? `
            <tr>
              <td style="padding: 6px 8px; border: 1px solid #ddd;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;"></td>
              <td style="padding: 6px 8px; border: 1px solid #ddd;">Loan Repayment</td>
              <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(loanDeduction)}</td>
            </tr>
            ` : ''}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td style="padding: 8px; border: 1px solid #ddd;">Total Earnings</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(totalEarnings)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">Total Deductions</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Net Salary Box -->
        <div style="border: 2px solid #1e3a8a; background-color: #f0f8ff; padding: 12px; margin: 15px 0; text-align: center;">
          <div style="font-size: 14px; font-weight: bold; color: #1e3a8a;">NET SALARY</div>
          <div style="font-size: 18px; font-weight: bold; color: #1e3a8a;">${formatCurrency(netSalary)}</div>
        </div>

        <!-- Bank Details -->
        <div style="font-size: 9px; color: #666; text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          Paid to ${employee?.bank || employee?.bankName || 'N/A'} • Account: ${employee?.accountNumber || 'N/A'}
        </div>

        <!-- Footer -->
        <div style="font-size: 8px; color: #999; text-align: center; margin-top: 15px; padding-top: 10px;">
          ${companyName} • P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com
          <br>This is a computer-generated payslip. No signature is required for digital copies.
        </div>
      </div>
    `;
  };

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

  const normalHoursFromPayroll = useMemo(() => {
    if (!payrollRecord) return 0;
    const total = toNumber(payrollRecord.totalHours);
    const overtime = toNumber(payrollRecord.overtimeHours);
    return total > 0 ? total : Math.max(0, total - overtime);
  }, [payrollRecord]);

  const overtimeHoursFromPayroll = useMemo(() => toNumber(payrollRecord?.overtimeHours), [payrollRecord]);
  const totalHours = normalHoursFromPayroll + overtimeHoursFromPayroll;

  const loanSummary = useMemo(() => {
    if (!loanInfo || loanInfo.length === 0) {
      return {
        totalMonthlyRepayment: 0,
        totalOutstanding: 0,
        totalOriginalAmount: 0,
        loans: []
      };
    }

    const totalMonthlyRepayment = loanInfo.reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0);
    const totalOutstanding = loanInfo.reduce((sum, loan) => sum + (loan.remaining || 0), 0);
    const totalOriginalAmount = loanInfo.reduce((sum, loan) => sum + (loan.originalAmount || 0), 0);

    return {
      totalMonthlyRepayment,
      totalOutstanding,
      totalOriginalAmount,
      loans: loanInfo
    };
  }, [loanInfo]);

  const additionalFields = useMemo(() => {
    if (!payrollRecord || !employeeDetails) return null;

    const hourlyRate = toNumber(employeeDetails.minimumRate);
    const overtimePay = toNumber(payrollRecord.overtimePay);
    const basicSalary = toNumber(payrollRecord.basicSalary);

    const rentAllowance = toNumber(payrollRecord.rentAllowance);
    const transportAllowance = toNumber(payrollRecord.transportAllowance);
    const clothingAllowance = toNumber(payrollRecord.clothingAllowance);
    const otherAllowance = toNumber(payrollRecord.otherAllowance);

    const totalAllowances = rentAllowance + transportAllowance + clothingAllowance + otherAllowance + overtimePay;
    const grossIncome = basicSalary + totalAllowances;

    const tier2Deduction = toNumber(payrollRecord.ssnitEmployee);
    const taxableIncome = grossIncome - tier2Deduction;

    const payeTax = toNumber(payrollRecord.payeTax);
    const statutoryDeductions = tier2Deduction + payeTax;
    
    const loanRepayment = payrollRecord?.loanDeduction ? toNumber(payrollRecord.loanDeduction) : 0;
    const netSalary = toNumber(payrollRecord.netSalary);
    const netBeforeLoan = grossIncome - statutoryDeductions;

    return {
      hourlyRate,
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
      payeTax,
      statutoryDeductions,
      loanRepayment,
      netSalary,
      netBeforeLoan,
      loanSummary,
      remainingLoanBalance: payrollRecord?.remainingLoanBalance ? toNumber(payrollRecord.remainingLoanBalance) : 0
    };
  }, [payrollRecord, employeeDetails, loanSummary]);

  const hasNonZeroAllowance = (v) => toNumber(v) > 0;

  const nonZeroAllowances = useMemo(() => {
    if (!additionalFields) return [];
    const a = [];
    if (hasNonZeroAllowance(additionalFields.rentAllowance)) a.push({ name: "Rent Allowance", value: additionalFields.rentAllowance });
    if (hasNonZeroAllowance(additionalFields.transportAllowance)) a.push({ name: "Transport Allowance", value: additionalFields.transportAllowance });
    if (hasNonZeroAllowance(additionalFields.clothingAllowance)) a.push({ name: "Clothing Allowance", value: additionalFields.clothingAllowance });
    if (hasNonZeroAllowance(additionalFields.otherAllowance)) a.push({ name: "Other Allowance", value: additionalFields.otherAllowance });
    if (hasNonZeroAllowance(additionalFields.overtimePay)) a.push({ name: "Overtime", value: additionalFields.overtimePay });
    return a;
  }, [additionalFields]);

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

  const generatePayslipPDF = () => {
    if (!pdfRef.current || !employeeDetails || !payrollRecord || !additionalFields) {
      setError("Payslip not ready for download");
      setTimeout(() => setError(""), 4000);
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
    if (!payslipRef.current || !employeeDetails) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Popup blocked! Please allow popups for this site to print.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    const pdfDesign = pdfRef.current?.innerHTML || payslipRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employeeDetails.firstName || ""} ${employeeDetails.lastName || ""}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px; 
              line-height: 1.4; 
              color: #111; 
              background: #fff; 
              margin: 0; 
              padding: 14mm;
            }
            @media print { 
              @page { 
                margin: 0.5in; 
                size: A4 portrait; 
              } 
            }
            
            .payslip-pdf-container {
              width: 210mm;
              min-height: 297mm;
              padding: 14mm;
              background: #fff;
              color: #111;
              font-family: Arial, sans-serif;
              font-size: 11px;
              position: relative;
            }
            
            .company-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            
            .company-name {
              font-size: 14px;
              font-weight: 700;
            }
            
            .company-address {
              font-size: 10px;
              color: #666;
            }
            
            .green-bar {
              height: 8px;
              background: #3bb54a;
              margin: 10px 0 14px 0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 18px;
            }
            
            .row {
              display: grid;
              grid-template-columns: 110px 1fr;
              align-items: center;
              margin-bottom: 8px;
            }
            
            .row-label {
              color: #333;
            }
            
            .row-value {
              border-bottom: 1px solid #bbb;
              padding: 2px 0 3px 0;
            }
            
            .section-title {
              font-weight: 700;
              margin-bottom: 6px;
              color: #222;
            }
            
            .amount-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            
            .amount-table th {
              text-align: left;
              padding: 6px 0;
              font-weight: 700;
              border-bottom: 1px solid #ccc;
            }
            
            .amount-table td {
              padding: 6px 0;
              border-bottom: 1px solid #eee;
            }
            
            .amount-table td:last-child {
              text-align: right;
            }
            
            .amount-table .footer-row td {
              padding: 8px 0;
              font-weight: 700;
            }
            
            .loan-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin-top: 8px;
            }
            
            .loan-table th {
              text-align: left;
              padding: 4px 0;
              border-bottom: 1px solid #ccc;
            }
            
            .loan-table td {
              padding: 4px 0;
              border-bottom: 1px solid #eee;
            }
            
            .loan-table td:last-child,
            .loan-table th:last-child {
              text-align: right;
            }
            
            .net-salary-container {
              margin-top: 18px;
            }
            
            .net-salary-row {
              display: flex;
              justify-content: space-between;
              font-weight: 700;
            }
            
            .bank-info {
              border-top: 1px solid #ddd;
              margin-top: 8px;
              padding-top: 8px;
              font-size: 10px;
              color: #666;
            }
            
            .footer-note {
              position: absolute;
              bottom: 14mm;
              left: 14mm;
              right: 14mm;
              font-size: 9px;
              color: #666;
            }
            
            .signature-table {
              width: 100%;
              font-size: 9px;
              margin-top: 20px;
            }
            
            .signature-line {
              border-top: 1px solid #333;
              width: 80%;
              margin: 0 auto 6px auto;
              height: 1px;
            }
            
            .print-footer {
              margin-top: 16px;
              text-align: center;
              font-size: 10px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="payslip-pdf-container">
            ${pdfDesign}
            <div style="margin-top: 16px;">
              <table class="signature-table">
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
            <div class="print-footer">
              <div><strong>${companyName}</strong></div>
              <div>P. O. Box AB 253 Abeka-Accra Ghana • Email: eac.electricalsolution.ltd@yahoo.com</div>
              <div style="margin-top: 3px; font-size: 8px;">This is a computer-generated payslip. No signature is required.</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 100);
            };
            window.onafterprint = function() {
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  useEffect(() => {
    fetchPayrollPeriods();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedPeriod && selectedEmployeeId) fetchEmployeePayslip();
  }, [selectedPeriod, selectedEmployeeId]);

  const selectedEmployee = useMemo(() => employees.find((emp) => emp.id == selectedEmployeeId), [employees, selectedEmployeeId]);

  const hasLoanInfo = payrollRecord && (payrollRecord.hasActiveLoans || payrollRecord.loanDeduction > 0);

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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'
        }`}
      >
        <Header
          toggleSidebar={toggleSidebar}
          user={user}
          onLogout={handleLogout}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header with 3 Pins */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-gray-400">Payslip Generator</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Employee Payslip</h1>
            <p className="text-gray-600">Generate and manage employee payslips</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">{success}</div>}

          {/* Mode Toggle */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setBulkMode(false)}
                className={`py-2 px-6 rounded-lg font-medium transition duration-200 ${
                  !bulkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Single Payslip
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`py-2 px-6 rounded-lg font-medium transition duration-200 ${
                  bulkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bulk Print Payslips
              </button>
            </div>
          </div>

          {/* Period Selection (Common for both modes) */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Payroll Period</h2>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Period</label>
              <select
                value={selectedPeriod ?? ""}
                onChange={(e) => setSelectedPeriod(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a period</option>
                {payrollPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({formatDate(period.startDate)} - {formatDate(period.endDate)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Single Employee Mode with Search */}
          {!bulkMode && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Employee</h2>

              {/* Search Bar for Single Mode */}
              <div className="mb-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, employee ID, position, or department..."
                    value={singleEmployeeSearch}
                    onChange={(e) => setSingleEmployeeSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {singleEmployeeSearch && (
                    <button
                      onClick={() => setSingleEmployeeSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {singleEmployeeSearch ? `Found ${filteredEmployeesForSingle.length} employees matching "${singleEmployeeSearch}"` : `${filteredEmployeesForSingle.length} total employees`}
                </div>
              </div>

              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={selectedEmployeeId ?? ""}
                  onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an employee</option>
                  {filteredEmployeesForSingle.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} ({employee.jobPosition || "No Position"})
                    </option>
                  ))}
                </select>
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
                  "Generate Payslip"
                )}
              </button>
            </div>
          )}

          {/* Bulk Mode - Employee Selection with Search */}
          {bulkMode && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Select Employees for Bulk Print</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Select All Filtered</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {bulkSelectedEmployees.length} of {filteredEmployeesForBulk.length} selected
                  </span>
                </div>
              </div>

              {/* Search Bar for Bulk Mode */}
              <div className="mb-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, employee ID, position, or department..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {employeeSearch && (
                    <button
                      onClick={() => setEmployeeSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {employeeSearch ? `Found ${filteredEmployeesForBulk.length} employees matching "${employeeSearch}"` : `${filteredEmployeesForBulk.length} total employees`}
                </div>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        Select
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployeesForBulk.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                          No employees found matching "{employeeSearch}"
                        </td>
                      </tr>
                    ) : (
                      filteredEmployeesForBulk.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={bulkSelectedEmployees.includes(employee.id)}
                              onChange={() => handleEmployeeSelect(employee.id)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{employee.employeeId || 'N/A'}</td>
                          <td className="px-4 py-3 text-gray-600">{employee.jobPosition || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bulk Action Buttons */}
              <div className="mt-6 space-y-4">
                <button
                  onClick={fetchBulkPayslips}
                  disabled={!selectedPeriod || bulkSelectedEmployees.length === 0 || bulkLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition duration-200 flex items-center justify-center"
                >
                  {bulkLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading Payslips... ({bulkProgress.current}/{bulkProgress.total})
                    </>
                  ) : (
                    "Load Selected Payslips"
                  )}
                </button>

                {bulkPayrollRecords.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-green-800">
                          {bulkPayrollRecords.length} Payslips Ready
                        </h3>
                        <p className="text-sm text-green-600">
                          Period: {payrollPeriods.find(p => p.id === selectedPeriod)?.name}
                        </p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={generateBulkPDF}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download Single PDF
                        </button>
                        <button
                          onClick={generateBulkZipPDF}
                          disabled={bulkLoading}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium flex items-center gap-2"
                        >
                          {bulkLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Creating ZIP... ({bulkProgress.current}/{bulkProgress.total})
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                              </svg>
                              Download as ZIP (Individual PDFs)
                            </>
                          )}
                        </button>
                        <button
                          onClick={printBulkPayslips}
                          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Print All
                        </button>
                      </div>
                    </div>

                    {/* Preview of selected employees */}
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Employees:</p>
                      <div className="flex flex-wrap gap-2">
                        {bulkPayrollRecords.map((record, index) => (
                          <span
                            key={index}
                            className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200"
                          >
                            {record.employeeDetails.firstName} {record.employeeDetails.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hidden PDF Template - KEPT EXACTLY AS YOU HAD IT */}
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
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                minHeight: "80px",
                marginBottom: "10px",
                marginRight: "20px",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>{companyName}</div>
                  <div style={{ fontSize: "10px", color: "#666" }}>P. O. Box AB 253 Abeka-Accra Ghana</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "15px" }}>
                  <img
                    src={companyLogo}
                    alt="Logo"
                    style={{ width: "65px", height: "auto", objectFit: "contain", display: "block", marginLeft: "auto" }}
                    crossOrigin="anonymous"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "bold", color: "#1e3a8a" }}>PAYSLIP</div>
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
                  <Row label="Normal Hours" value={formatHours(normalHoursFromPayroll)} />
                </div>
                <div>
                  <Row label="Overtime Hours" value={formatHours(overtimeHoursFromPayroll)} />
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
                      ["Income Tax (PAYE)", additionalFields?.payeTax || 0],
                      ...(additionalFields?.loanRepayment > 0 ? [["Loan Repayment", additionalFields?.loanRepayment]] : []),
                    ]}
                    footerLabel="Total Deductions"
                    footerValue={(additionalFields?.statutoryDeductions || 0) + (additionalFields?.loanRepayment || 0)}
                  />

                  {loanInfo && loanInfo.length > 0 && (
                    <div style={{ marginTop: "12px", fontSize: "9px", color: "#666" }}>
                      <div style={{ fontWeight: 700, marginBottom: "4px" }}>Active Loans:</div>
                      {loanInfo.map((loan, idx) => (
                        <div key={idx} style={{ marginBottom: "8px", borderBottom: "1px dotted #ccc", paddingBottom: "4px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                            <span style={{ fontWeight: 500 }}>Loan #{loan.id}:</span>
                            <span style={{ color: "#2563eb", fontWeight: 600 }}>{formatCurrency(loan.monthlyPayment)}/month</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#444" }}>
                            <span>Requested: {formatCurrency(loan.originalAmount || 0)}</span>
                            <span>Paid this month: {formatCurrency(loan.deducted || 0)}</span>
                            <span>Remaining: {formatCurrency(loan.remaining || 0)}</span>
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontWeight: 600, borderTop: "1px solid #aaa", paddingTop: "4px" }}>
                        <span>Total Loans:</span>
                        <span>{formatCurrency(loanSummary?.totalOriginalAmount || 0)}</span>
                      </div>
                    </div>
                  )}
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
              </div>

              <div style={{ position: "absolute", bottom: "14mm", left: "14mm", right: "14mm", fontSize: "9px", color: "#666" }}>
                This is a computer-generated payslip. No signature is required.
              </div>
            </div>
          </div>

          {/* Single Payslip Display - KEPT EXACTLY AS YOU HAD IT */}
          {!bulkMode && payrollRecord && employeeDetails && additionalFields && (
            <div>
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

              <div ref={payslipRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white p-6 print-header">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white p-2 rounded-lg">
                        <img
                          src={companyLogo}
                          alt="Company Logo"
                          className="h-12 w-auto company-logo"
                          onError={(e) => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) e.target.nextSibling.style.display = "block";
                          }}
                        />
                        <div className="hidden bg-blue-100 text-blue-800 font-bold text-lg px-3 py-2 rounded">EAC</div>
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
                          <span className="font-medium">{employeeDetails.employeeId || "N/A"}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">SSNIT No:</span>
                          <span className="font-medium">{employeeDetails.ssnitNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-semibold text-lg">
                            {employeeDetails.firstName} {employeeDetails.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Position:</span>
                          <span className="font-medium">{employeeDetails.jobPosition || "N/A"}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Employee Rate:</span>
                          <span className="font-medium">{employeeDetails.minimumRate || "N/A"}GHS/hr</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3 section-title">Bank & Hours</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Bank:</span>
                          <span className="font-medium">{employeeDetails.bank || employeeDetails.bankName || "N/A"}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Account No:</span>
                          <span className="font-medium">{employeeDetails.accountNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Normal Hours:</span>
                          <span className="font-medium">{formatHours(normalHoursFromPayroll)}</span>
                        </div>
                        <div className="flex justify-between detail-row">
                          <span className="text-gray-600">Overtime Hours:</span>
                          <span className="font-medium">{formatHours(overtimeHoursFromPayroll)}</span>
                        </div>
                        <div className="flex justify-between detail-row total-row">
                          <span>Total Hours:</span>
                          <span className="text-blue-600 font-semibold">
                            {formatHours(totalHours)}
                          </span>
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
                          <span>{formatCurrency(additionalFields.payeTax)}</span>
                        </div>
                        
                        {hasLoanInfo && (
                          <>
                            <div className="border-t border-red-200 my-2 pt-2">
                              <div className="flex justify-between detail-row font-medium text-purple-800">
                                <span>Loan Repayment:</span>
                                <span>{formatCurrency(payrollRecord.loanDeduction || 0)}</span>
                              </div>
                              
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
                            {formatCurrency(additionalFields.statutoryDeductions + (payrollRecord.loanDeduction || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Net Salary Calculation
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-700">Gross Salary:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(additionalFields.grossIncome)}</span>
                      </div>

                      <div className="ml-4 space-y-1 border-l-2 border-blue-200 pl-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">SSNIT Tier 2 (5.5%):</span>
                          <span className="text-red-600">- {formatCurrency(additionalFields.tier2Deduction)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Income Tax (PAYE):</span>
                          <span className="text-red-600">- {formatCurrency(additionalFields.payeTax)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 border-t border-blue-200">
                        <span className="font-medium text-blue-700">Net After Statutory Deductions:</span>
                        <span className="font-bold text-blue-700">
                          {formatCurrency(additionalFields.netBeforeLoan)}
                        </span>
                      </div>

                      {payrollRecord.loanDeduction > 0 && (
                        <>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-700">Less: Loan Repayment:</span>
                            <span className="text-purple-600 font-medium">- {formatCurrency(payrollRecord.loanDeduction)}</span>
                          </div>
                        </>
                      )}

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

                      <div className="mt-4 text-xs text-gray-500 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>
                            Payment will be made to {employeeDetails.bank || employeeDetails.bankName || "N/A"} • 
                            Account: {employeeDetails.accountNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
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

          {!bulkMode && !payrollRecord && selectedPeriod && selectedEmployee && !loading && (
            <div className="text-center py-12 bg-yellow-50 rounded-xl border border-yellow-200">
              <div className="text-yellow-500 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Payslip Available</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                No payroll record found for the selected employee and period. Please ensure payroll has been processed for this period.
              </p>
            </div>
          )}

          {!selectedPeriod && !selectedEmployeeId && !bulkMode && (
            <div className="mt-8 text-sm text-gray-600">
              <Link to="/payroll" className="text-blue-600 hover:text-blue-800 font-medium">
                Back to Payroll
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Payslip;