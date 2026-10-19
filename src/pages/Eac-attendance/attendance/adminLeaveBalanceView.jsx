import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const DEFAULT_PAGE_SIZE = 25;

const getCategoryName = (category) => {
  if (category === null || category === undefined || category === "") {
    return "Unassigned";
  }

  if (typeof category === "string" || typeof category === "number") {
    return String(category);
  }

  if (typeof category === "object") {
    return (
      category.name ??
      category.categoryName ??
      category.label ??
      "Unassigned"
    );
  }

  return "Unassigned";
};

const getEmployeeName = (record) => {
  if (!record) return "Unknown employee";

  const directName =
    record.employeeName ??
    record.fullName ??
    record.name;

  if (directName && typeof directName !== "object") {
    return String(directName).trim();
  }

  const employee = record.employee ?? record;
  const firstName = employee?.firstName ?? "";
  const lastName = employee?.lastName ?? "";

  return `${firstName} ${lastName}`.trim() || "Unknown employee";
};

const getEmployeeNumber = (record) => {
  const employee = record?.employee ?? record;

  return (
    record?.employeeNumber ??
    employee?.employeeId ??
    record?.employeeIdNumber ??
    "N/A"
  );
};

const getEmployeeDatabaseId = (record) => {
  return (
    record?.employee?.id ??
    record?.employeeId ??
    record?.id ??
    null
  );
};

const getRecordCategory = (record) => {
  return (
    record?.employee?.category ??
    record?.category ??
    record?.employeeCategory ??
    null
  );
};

const parseLocalDate = (value) => {
  if (!value) return null;

  const [year, month, day] = String(value).split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const formatDate = (value) => {
  const date = parseLocalDate(value);

  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatNumber = (value, fractionDigits = 0) => {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) return "0";

  return number.toLocaleString("en-GH", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const normalizeLeaveType = (value) => {
  if (!value) return "Unspecified";

  return String(value).replace(/\s+Leave$/i, "").trim() || "Unspecified";
};

const isApproved = (leave) =>
  String(leave?.status ?? "").toLowerCase() === "approved";

const isPending = (leave) => {
  const status = String(leave?.status ?? "").toLowerCase();

  return (
    status === "pending" ||
    status === "supervisor_approved" ||
    status === "planner_approved"
  );
};

const calculateCalendarDays = (startDate, endDate) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (!start || !end || end < start) return 0;

  let total = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
};

const getReportedDays = (leave) => {
  const deductedDays = Number(leave?.deductedDays);

  if (Number.isFinite(deductedDays) && deductedDays > 0) {
    return deductedDays;
  }

  return calculateCalendarDays(leave?.startDate, leave?.endDate);
};

const csvEscape = (value) => {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename, rows) => {
  const csv = rows
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

const StatusBadge = ({ status }) => {
  const normalized = String(status ?? "Unknown").toLowerCase();

  const className =
    normalized === "approved"
      ? "bg-emerald-100 text-emerald-800"
      : normalized === "rejected"
        ? "bg-rose-100 text-rose-800"
        : normalized.includes("approved")
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status || "Unknown"}
    </span>
  );
};

const SummaryCard = ({ title, value, description, icon: Icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>

      {Icon && (
        <div className="rounded-lg bg-blue-50 p-3">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      )}
    </div>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <DocumentChartBarIcon className="h-12 w-12 text-slate-300" />
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
  </div>
);

const AdminLeaveBalanceView = ({ apiBaseUrl, getToken }) => {
  const [activeView, setActiveView] = useState("balances");

  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState("");

  const [balanceSearch, setBalanceSearch] = useState("");
  const [balanceCategory, setBalanceCategory] = useState("All");
  const [balancePage, setBalancePage] = useState(1);
  const [balancePageSize, setBalancePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [balanceSort, setBalanceSort] = useState({
    key: "employeeName",
    direction: "asc",
  });

  const currentYear = new Date().getFullYear();

  const [reportFilters, setReportFilters] = useState({
    leaveType: "All",
    status: "All",
    category: "All",
    employee: "",
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
  });

  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reportSort, setReportSort] = useState({
    key: "startDate",
    direction: "desc",
  });

  const token = typeof getToken === "function" ? getToken() : null;

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const loadBalances = async () => {
    setLoadingBalances(true);
    setError("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/leave/admin/employee-balances`,
        {
          headers: authHeaders,
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load leave balances");
      }

      const data = await response.json();
      setBalances(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Failed to load leave balances:", loadError);
      setError(loadError.message || "Failed to load leave balances");
      setBalances([]);
    } finally {
      setLoadingBalances(false);
    }
  };

  const loadLeaveReportData = async () => {
    setLoadingReports(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/leave`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load leave report data");
      }

      const data = await response.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Failed to load leave report data:", loadError);
      setError(loadError.message || "Failed to load leave report data");
      setLeaves([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, [apiBaseUrl]);

  useEffect(() => {
    if (activeView === "reports" && leaves.length === 0) {
      loadLeaveReportData();
    }
  }, [activeView]);

  const categories = useMemo(() => {
    const values = new Set();

    balances.forEach((balance) => {
      values.add(getCategoryName(balance.category));
    });

    leaves.forEach((leave) => {
      values.add(getCategoryName(getRecordCategory(leave)));
    });

    return [...values]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [balances, leaves]);

  const leaveTypes = useMemo(() => {
    return [
      ...new Set(
        leaves
          .map((leave) => normalizeLeaveType(leave.leaveType))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [leaves]);

  const balanceRows = useMemo(() => {
    const search = balanceSearch.trim().toLowerCase();

    const rows = balances.filter((balance) => {
      const employeeName = getEmployeeName(balance).toLowerCase();
      const employeeNumber = String(
        balance.employeeId ?? balance.employeeNumber ?? ""
      ).toLowerCase();
      const department = String(balance.department ?? "").toLowerCase();
      const categoryName = getCategoryName(balance.category);

      const matchesSearch =
        !search ||
        employeeName.includes(search) ||
        employeeNumber.includes(search) ||
        department.includes(search) ||
        categoryName.toLowerCase().includes(search);

      const matchesCategory =
        balanceCategory === "All" || categoryName === balanceCategory;

      return matchesSearch && matchesCategory;
    });

    const multiplier = balanceSort.direction === "asc" ? 1 : -1;

    return [...rows].sort((first, second) => {
      let firstValue;
      let secondValue;

      switch (balanceSort.key) {
        case "employeeName":
          firstValue = getEmployeeName(first);
          secondValue = getEmployeeName(second);
          break;
        case "category":
          firstValue = getCategoryName(first.category);
          secondValue = getCategoryName(second.category);
          break;
        case "annualBalance":
          firstValue = Number(first.annualLeaveBalance ?? first.annualBalance ?? 0);
          secondValue = Number(
            second.annualLeaveBalance ?? second.annualBalance ?? 0
          );
          break;
        case "usedDays":
          firstValue = Number(first.usedLeaveDays ?? first.usedDays ?? 0);
          secondValue = Number(second.usedLeaveDays ?? second.usedDays ?? 0);
          break;
        case "availableDays":
          firstValue = Number(first.availableLeaveDays ?? first.available ?? 0);
          secondValue = Number(
            second.availableLeaveDays ?? second.available ?? 0
          );
          break;
        default:
          firstValue = first[balanceSort.key] ?? "";
          secondValue = second[balanceSort.key] ?? "";
      }

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return (firstValue - secondValue) * multiplier;
      }

      return String(firstValue).localeCompare(String(secondValue)) * multiplier;
    });
  }, [balances, balanceSearch, balanceCategory, balanceSort]);

  const balanceTotals = useMemo(() => {
    return balanceRows.reduce(
      (summary, balance) => {
        summary.employees += 1;
        summary.annual += Number(
          balance.annualLeaveBalance ?? balance.annualBalance ?? 0
        );
        summary.used += Number(balance.usedLeaveDays ?? balance.usedDays ?? 0);
        summary.pending += Number(
          balance.pendingLeaveDays ?? balance.pendingDays ?? 0
        );
        summary.available += Number(
          balance.availableLeaveDays ?? balance.available ?? 0
        );

        return summary;
      },
      {
        employees: 0,
        annual: 0,
        used: 0,
        pending: 0,
        available: 0,
      }
    );
  }, [balanceRows]);

  const balanceTotalPages = Math.max(
    1,
    Math.ceil(balanceRows.length / balancePageSize)
  );

  const pagedBalanceRows = useMemo(() => {
    const safePage = Math.min(balancePage, balanceTotalPages);
    const start = (safePage - 1) * balancePageSize;

    return balanceRows.slice(start, start + balancePageSize);
  }, [balanceRows, balancePage, balancePageSize, balanceTotalPages]);

  useEffect(() => {
    if (balancePage > balanceTotalPages) {
      setBalancePage(balanceTotalPages);
    }
  }, [balancePage, balanceTotalPages]);

  const filteredReportRows = useMemo(() => {
    const employeeSearch = reportFilters.employee.trim().toLowerCase();
    const startFilter = parseLocalDate(reportFilters.startDate);
    const endFilter = parseLocalDate(reportFilters.endDate);

    const rows = leaves.filter((leave) => {
      const leaveType = normalizeLeaveType(leave.leaveType);
      const categoryName = getCategoryName(getRecordCategory(leave));
      const employeeName = getEmployeeName(leave).toLowerCase();
      const employeeNumber = String(getEmployeeNumber(leave)).toLowerCase();
      const leaveStart = parseLocalDate(leave.startDate);
      const leaveEnd = parseLocalDate(leave.endDate);

      const matchesType =
        reportFilters.leaveType === "All" ||
        leaveType === reportFilters.leaveType;

      const matchesStatus =
        reportFilters.status === "All" ||
        String(leave.status ?? "").toLowerCase() ===
          reportFilters.status.toLowerCase();

      const matchesCategory =
        reportFilters.category === "All" ||
        categoryName === reportFilters.category;

      const matchesEmployee =
        !employeeSearch ||
        employeeName.includes(employeeSearch) ||
        employeeNumber.includes(employeeSearch);

      const overlapsStart =
        !startFilter || !leaveEnd || leaveEnd >= startFilter;

      const overlapsEnd =
        !endFilter || !leaveStart || leaveStart <= endFilter;

      return (
        matchesType &&
        matchesStatus &&
        matchesCategory &&
        matchesEmployee &&
        overlapsStart &&
        overlapsEnd
      );
    });

    const multiplier = reportSort.direction === "asc" ? 1 : -1;

    return [...rows].sort((first, second) => {
      let firstValue;
      let secondValue;

      switch (reportSort.key) {
        case "employee":
          firstValue = getEmployeeName(first);
          secondValue = getEmployeeName(second);
          break;
        case "leaveType":
          firstValue = normalizeLeaveType(first.leaveType);
          secondValue = normalizeLeaveType(second.leaveType);
          break;
        case "category":
          firstValue = getCategoryName(getRecordCategory(first));
          secondValue = getCategoryName(getRecordCategory(second));
          break;
        case "days":
          firstValue = getReportedDays(first);
          secondValue = getReportedDays(second);
          break;
        default:
          firstValue = first[reportSort.key] ?? "";
          secondValue = second[reportSort.key] ?? "";
      }

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return (firstValue - secondValue) * multiplier;
      }

      return String(firstValue).localeCompare(String(secondValue)) * multiplier;
    });
  }, [leaves, reportFilters, reportSort]);

  const reportSummary = useMemo(() => {
    const employeeIds = new Set();
    const typeTotals = {};

    let totalDays = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    filteredReportRows.forEach((leave) => {
      const employeeKey =
        getEmployeeDatabaseId(leave) ??
        `${getEmployeeName(leave)}-${getEmployeeNumber(leave)}`;

      employeeIds.add(employeeKey);

      const type = normalizeLeaveType(leave.leaveType);
      const days = getReportedDays(leave);

      totalDays += days;
      typeTotals[type] = (typeTotals[type] ?? 0) + days;

      if (isApproved(leave)) {
        approvedCount += 1;
      } else if (isPending(leave)) {
        pendingCount += 1;
      } else if (
        String(leave.status ?? "").toLowerCase() === "rejected"
      ) {
        rejectedCount += 1;
      }
    });

    return {
      requests: filteredReportRows.length,
      employees: employeeIds.size,
      totalDays,
      approvedCount,
      pendingCount,
      rejectedCount,
      typeTotals,
    };
  }, [filteredReportRows]);

  const reportTotalPages = Math.max(
    1,
    Math.ceil(filteredReportRows.length / reportPageSize)
  );

  const pagedReportRows = useMemo(() => {
    const safePage = Math.min(reportPage, reportTotalPages);
    const start = (safePage - 1) * reportPageSize;

    return filteredReportRows.slice(start, start + reportPageSize);
  }, [filteredReportRows, reportPage, reportPageSize, reportTotalPages]);

  useEffect(() => {
    setReportPage(1);
  }, [reportFilters, reportPageSize]);

  const toggleBalanceSort = (key) => {
    setBalanceSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleReportSort = (key) => {
    setReportSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ active, direction }) => {
    if (!active) {
      return <ChevronUpIcon className="h-4 w-4 opacity-25" />;
    }

    return direction === "asc" ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    );
  };

  const exportBalanceCsv = () => {
    const rows = [
      [
        "Employee ID",
        "Employee",
        "Department",
        "Category",
        "Annual Leave",
        "Used Days",
        "Pending Days",
        "Available Days",
        "Usage %",
      ],
      ...balanceRows.map((balance) => [
        balance.employeeId ?? balance.employeeNumber ?? "N/A",
        getEmployeeName(balance),
        balance.department ?? "N/A",
        getCategoryName(balance.category),
        balance.annualLeaveBalance ?? balance.annualBalance ?? 0,
        balance.usedLeaveDays ?? balance.usedDays ?? 0,
        balance.pendingLeaveDays ?? balance.pendingDays ?? 0,
        balance.availableLeaveDays ?? balance.available ?? 0,
        balance.usagePercentage ?? balance.percentage ?? 0,
      ]),
    ];

    downloadCsv(
      `leave_balances_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  const exportLeaveTypeReportCsv = () => {
    const selectedType =
      reportFilters.leaveType === "All"
        ? "all_leave_types"
        : reportFilters.leaveType
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");

    const rows = [
      [
        "Employee ID",
        "Employee",
        "Category",
        "Leave Type",
        "Start Date",
        "End Date",
        "Days",
        "Status",
        "Reason",
        "Supervisor Status",
        "Planner Status",
        "HR Status",
      ],
      ...filteredReportRows.map((leave) => [
        getEmployeeNumber(leave),
        getEmployeeName(leave),
        getCategoryName(getRecordCategory(leave)),
        normalizeLeaveType(leave.leaveType),
        leave.startDate ?? "",
        leave.endDate ?? "",
        getReportedDays(leave),
        leave.status ?? "",
        leave.reason ?? "",
        leave.supervisorStatus ?? "",
        leave.plannerStatus ?? "",
        leave.hrStatus ?? "",
      ]),
    ];

    downloadCsv(
      `leave_report_${selectedType}_${reportFilters.startDate}_${reportFilters.endDate}.csv`,
      rows
    );
  };

  const printLeaveTypeReport = () => {
    const rows = filteredReportRows
      .map(
        (leave) => `
          <tr>
            <td>${getEmployeeNumber(leave)}</td>
            <td>${getEmployeeName(leave)}</td>
            <td>${getCategoryName(getRecordCategory(leave))}</td>
            <td>${normalizeLeaveType(leave.leaveType)}</td>
            <td>${formatDate(leave.startDate)}</td>
            <td>${formatDate(leave.endDate)}</td>
            <td>${getReportedDays(leave)}</td>
            <td>${leave.status ?? "Unknown"}</td>
          </tr>
        `
      )
      .join("");

    const reportType =
      reportFilters.leaveType === "All"
        ? "All Leave Types"
        : `${reportFilters.leaveType} Leave`;

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      setError("Pop-up blocked. Allow pop-ups to print the report.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 28px;
            }
            h1 { margin-bottom: 6px; }
            .meta {
              color: #475569;
              margin-bottom: 20px;
              font-size: 13px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }
            .summary div {
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px;
            }
            .summary strong {
              display: block;
              font-size: 20px;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 7px;
              text-align: left;
            }
            th { background: #f1f5f9; }
            @media print {
              body { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h1>${reportType} Report</h1>
          <div class="meta">
            Period: ${formatDate(reportFilters.startDate)} to
            ${formatDate(reportFilters.endDate)} |
            Generated: ${new Date().toLocaleString()}
          </div>

          <div class="summary">
            <div>Requests<strong>${reportSummary.requests}</strong></div>
            <div>Employees<strong>${reportSummary.employees}</strong></div>
            <div>Total days<strong>${reportSummary.totalDays}</strong></div>
            <div>Approved<strong>${reportSummary.approvedCount}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Leave Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const resetReportFilters = () => {
    setReportFilters({
      leaveType: "All",
      status: "All",
      category: "All",
      employee: "",
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
    });
  };

  const refreshCurrentView = () => {
    if (activeView === "balances") {
      loadBalances();
    } else {
      loadLeaveReportData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Leave Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review employee balances or generate reports for individual
              leave types.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView("balances")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeView === "balances"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <UserGroupIcon className="h-5 w-5" />
              Leave Balances
            </button>

            <button
              type="button"
              onClick={() => setActiveView("reports")}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeView === "reports"
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <DocumentChartBarIcon className="h-5 w-5" />
              Leave Type Reports
            </button>

            <button
              type="button"
              onClick={refreshCurrentView}
              disabled={loadingBalances || loadingReports}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${
                  loadingBalances || loadingReports ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />
            <p className="text-sm font-medium">{error}</p>
          </div>

          <button type="button" onClick={() => setError("")}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {activeView === "balances" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Employees"
              value={formatNumber(balanceTotals.employees)}
              description="Matching current filters"
              icon={UserGroupIcon}
            />
            <SummaryCard
              title="Annual Allocation"
              value={formatNumber(balanceTotals.annual)}
              description="Total allocated days"
              icon={CalendarDaysIcon}
            />
            <SummaryCard
              title="Used Days"
              value={formatNumber(balanceTotals.used)}
              description="Approved deductible leave"
              icon={ChartBarIcon}
            />
            <SummaryCard
              title="Pending Days"
              value={formatNumber(balanceTotals.pending)}
              description="Awaiting final approval"
              icon={DocumentChartBarIcon}
            />
            <SummaryCard
              title="Available Days"
              value={formatNumber(balanceTotals.available)}
              description="Remaining employee balance"
              icon={CalendarDaysIcon}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input
                      type="search"
                      value={balanceSearch}
                      onChange={(event) => {
                        setBalanceSearch(event.target.value);
                        setBalancePage(1);
                      }}
                      placeholder="Search employee, ID, department or category"
                      className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <select
                    value={balanceCategory}
                    onChange={(event) => {
                      setBalanceCategory(event.target.value);
                      setBalancePage(1);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={exportBalanceCsv}
                  disabled={balanceRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Export balances
                </button>
              </div>
            </div>

            {loadingBalances ? (
              <div className="flex items-center justify-center py-20">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : balanceRows.length === 0 ? (
              <EmptyState
                title="No leave balances found"
                description="No employee balance records match the selected filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          ["employeeName", "Employee"],
                          ["category", "Category"],
                          ["annualBalance", "Annual"],
                          ["usedDays", "Used"],
                          ["pendingDays", "Pending"],
                          ["availableDays", "Available"],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                          >
                            <button
                              type="button"
                              onClick={() => toggleBalanceSort(key)}
                              className="inline-flex items-center gap-1"
                            >
                              {label}
                              <SortIcon
                                active={balanceSort.key === key}
                                direction={balanceSort.direction}
                              />
                            </button>
                          </th>
                        ))}

                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Department
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Usage
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Leave-type breakdown
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pagedBalanceRows.map((balance) => {
                        const annual = Number(
                          balance.annualLeaveBalance ??
                            balance.annualBalance ??
                            0
                        );
                        const used = Number(
                          balance.usedLeaveDays ?? balance.usedDays ?? 0
                        );
                        const pending = Number(
                          balance.pendingLeaveDays ??
                            balance.pendingDays ??
                            0
                        );
                        const available = Number(
                          balance.availableLeaveDays ??
                            balance.available ??
                            0
                        );

                        const percentage =
                          Number(
                            balance.usagePercentage ??
                              balance.percentage ??
                              (annual > 0 ? (used * 100) / annual : 0)
                          ) || 0;

                        const breakdown =
                          balance.leaveTypeBreakdown &&
                          typeof balance.leaveTypeBreakdown === "object"
                            ? Object.entries(balance.leaveTypeBreakdown)
                            : [];

                        return (
                          <tr
                            key={
                              balance.employeeDatabaseId ??
                              balance.id ??
                              `${balance.employeeId}-${getEmployeeName(balance)}`
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-4 py-4">
                              <div className="font-semibold text-slate-900">
                                {getEmployeeName(balance)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {balance.employeeId ??
                                  balance.employeeNumber ??
                                  "N/A"}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                              {getCategoryName(balance.category)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                              {formatNumber(annual)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                              {formatNumber(used)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-amber-700">
                              {formatNumber(pending)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-emerald-700">
                              {formatNumber(available)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                              {balance.department || "N/A"}
                            </td>

                            <td className="min-w-44 px-4 py-4">
                              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{formatNumber(percentage, 1)}%</span>
                                <span>
                                  {formatNumber(used)}/{formatNumber(annual)}
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(0, percentage)
                                    )}%`,
                                  }}
                                />
                              </div>
                            </td>

                            <td className="min-w-64 px-4 py-4">
                              {breakdown.length === 0 ? (
                                <span className="text-sm text-slate-400">
                                  No approved leave
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {breakdown.map(([type, days]) => (
                                    <button
                                      type="button"
                                      key={type}
                                      onClick={() => {
                                        setReportFilters((current) => ({
                                          ...current,
                                          leaveType: normalizeLeaveType(type),
                                          employee:
                                            balance.employeeId ??
                                            getEmployeeName(balance),
                                        }));
                                        setActiveView("reports");
                                      }}
                                      className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                      title={`Run ${type} report for this employee`}
                                    >
                                      {type}: {days}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="text-sm text-slate-500">
                    Showing{" "}
                    {balanceRows.length === 0
                      ? 0
                      : (balancePage - 1) * balancePageSize + 1}
                    –{Math.min(balancePage * balancePageSize, balanceRows.length)}{" "}
                    of {balanceRows.length}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={balancePageSize}
                      onChange={(event) => {
                        setBalancePageSize(Number(event.target.value));
                        setBalancePage(1);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size} rows
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={balancePage <= 1}
                      onClick={() =>
                        setBalancePage((current) => Math.max(1, current - 1))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="px-2 text-sm text-slate-600">
                      Page {balancePage} of {balanceTotalPages}
                    </span>

                    <button
                      type="button"
                      disabled={balancePage >= balanceTotalPages}
                      onClick={() =>
                        setBalancePage((current) =>
                          Math.min(balanceTotalPages, current + 1)
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">
                Individual Leave Type Report
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Leave type
                </label>
                <select
                  value={reportFilters.leaveType}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      leaveType: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="All">All leave types</option>
                  {leaveTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  value={reportFilters.status}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Supervisor_Approved">
                    Supervisor approved
                  </option>
                  <option value="Planner_Approved">Planner approved</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </label>
                <select
                  value={reportFilters.category}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="All">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Start date
                </label>
                <input
                  type="date"
                  value={reportFilters.startDate}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  End date
                </label>
                <input
                  type="date"
                  value={reportFilters.endDate}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </label>
                <input
                  type="search"
                  value={reportFilters.employee}
                  onChange={(event) =>
                    setReportFilters((current) => ({
                      ...current,
                      employee: event.target.value,
                    }))
                  }
                  placeholder="Name or ID"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetReportFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <XMarkIcon className="h-5 w-5" />
                Reset filters
              </button>

              <button
                type="button"
                onClick={exportLeaveTypeReportCsv}
                disabled={filteredReportRows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={printLeaveTypeReport}
                disabled={filteredReportRows.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PrinterIcon className="h-5 w-5" />
                Print / PDF
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              title="Requests"
              value={formatNumber(reportSummary.requests)}
              description={
                reportFilters.leaveType === "All"
                  ? "All matching leave types"
                  : `${reportFilters.leaveType} requests`
              }
              icon={DocumentChartBarIcon}
            />
            <SummaryCard
              title="Employees"
              value={formatNumber(reportSummary.employees)}
              description="Unique employees"
              icon={UserGroupIcon}
            />
            <SummaryCard
              title="Leave Days"
              value={formatNumber(reportSummary.totalDays)}
              description="Deducted days where available"
              icon={CalendarDaysIcon}
            />
            <SummaryCard
              title="Approved"
              value={formatNumber(reportSummary.approvedCount)}
              description="Final approvals"
              icon={ChartBarIcon}
            />
            <SummaryCard
              title="Pending"
              value={formatNumber(reportSummary.pendingCount)}
              description="Still in workflow"
              icon={DocumentChartBarIcon}
            />
            <SummaryCard
              title="Rejected"
              value={formatNumber(reportSummary.rejectedCount)}
              description="Rejected requests"
              icon={ExclamationTriangleIcon}
            />
          </div>

          {reportFilters.leaveType === "All" &&
            Object.keys(reportSummary.typeTotals).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">
                  Leave days by type
                </h3>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(reportSummary.typeTotals)
                    .sort((first, second) => second[1] - first[1])
                    .map(([type, days]) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() =>
                          setReportFilters((current) => ({
                            ...current,
                            leaveType: type,
                          }))
                        }
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        {type}: {days} day{Number(days) === 1 ? "" : "s"}
                      </button>
                    ))}
                </div>
              </div>
            )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {loadingReports ? (
              <div className="flex items-center justify-center py-20">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredReportRows.length === 0 ? (
              <EmptyState
                title="No leave requests found"
                description="No leave requests match the selected leave type, status, employee, category and date period."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          ["employee", "Employee"],
                          ["category", "Category"],
                          ["leaveType", "Leave Type"],
                          ["startDate", "Start"],
                          ["endDate", "End"],
                          ["days", "Days"],
                          ["status", "Status"],
                        ].map(([key, label]) => (
                          <th
                            key={key}
                            className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                          >
                            <button
                              type="button"
                              onClick={() => toggleReportSort(key)}
                              className="inline-flex items-center gap-1"
                            >
                              {label}
                              <SortIcon
                                active={reportSort.key === key}
                                direction={reportSort.direction}
                              />
                            </button>
                          </th>
                        ))}

                        <th className="min-w-64 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Reason
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Workflow
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pagedReportRows.map((leave) => (
                        <tr key={leave.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="font-semibold text-slate-900">
                              {getEmployeeName(leave)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {getEmployeeNumber(leave)}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                            {getCategoryName(getRecordCategory(leave))}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                            {normalizeLeaveType(leave.leaveType)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                            {formatDate(leave.startDate)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                            {formatDate(leave.endDate)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                            {formatNumber(getReportedDays(leave))}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">
                            <StatusBadge status={leave.status} />
                          </td>

                          <td className="max-w-sm px-4 py-4 text-sm text-slate-600">
                            <div className="line-clamp-2">
                              {leave.reason || "No reason supplied"}
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">
                            <div>Supervisor: {leave.supervisorStatus || "N/A"}</div>
                            <div>Planner: {leave.plannerStatus || "N/A"}</div>
                            <div>HR: {leave.hrStatus || "N/A"}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="text-sm text-slate-500">
                    Showing{" "}
                    {(reportPage - 1) * reportPageSize + 1}–
                    {Math.min(
                      reportPage * reportPageSize,
                      filteredReportRows.length
                    )}{" "}
                    of {filteredReportRows.length}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={reportPageSize}
                      onChange={(event) =>
                        setReportPageSize(Number(event.target.value))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size} rows
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={reportPage <= 1}
                      onClick={() =>
                        setReportPage((current) => Math.max(1, current - 1))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="px-2 text-sm text-slate-600">
                      Page {reportPage} of {reportTotalPages}
                    </span>

                    <button
                      type="button"
                      disabled={reportPage >= reportTotalPages}
                      onClick={() =>
                        setReportPage((current) =>
                          Math.min(reportTotalPages, current + 1)
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLeaveBalanceView;
