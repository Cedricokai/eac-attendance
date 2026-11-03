import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Laptop,
  Monitor,
  Printer,
  HardDrive,
  Smartphone,
  Wifi,
  Cpu,
  Package,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Globe,
  User,
  Users,
  Calendar,
  Pencil,
  Trash2,
  X,
  Check,
  RotateCcw,
  ChevronDown,
  SlidersHorizontal,
  Building2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import MainSidebar from "../Eac-attendance/mainSidebar";

const ASSET_CATEGORIES = [
  { value: "LAPTOP", label: "Laptop", icon: Laptop, color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "MONITOR", label: "Monitor", icon: Monitor, color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "PRINTER", label: "Printer", icon: Printer, color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "DESKTOP", label: "Desktop / Workstation", icon: HardDrive, color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "PHONE_TABLET", label: "Phone / Tablet", icon: Smartphone, color: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "NETWORKING", label: "Router / Networking", icon: Wifi, color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "ACCESSORY", label: "IT Accessory / Peripheral", icon: Cpu, color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "OTHER", label: "Other IT Equipment", icon: Package, color: "bg-gray-100 text-gray-800 border-gray-200" },
];

const nowLocalDateTimeInput = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toDateTimeInputValue = (isoString) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return String(isoString).slice(0, 16);
    const offsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
  } catch {
    return String(isoString).slice(0, 16);
  }
};

const formatDateTimeDisplay = (isoString) => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return isoString;
  }
};

const formatDurationHeld = (takenAt, returnedAt, isReturned) => {
  if (!takenAt) return "";
  try {
    const start = new Date(takenAt);
    const end = isReturned && returnedAt ? new Date(returnedAt) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    if (days === 0) {
      return hours <= 1 ? "Less than 1 hr" : `${hours} hrs`;
    }
    return `${days} day${days === 1 ? "" : "s"}${hours > 0 ? `, ${hours}h` : ""}`;
  } catch {
    return "";
  }
};

const blankForm = () => ({
  assetName: "",
  assetTag: "",
  category: "LAPTOP",
  specifications: "",
  isPublic: false,
  location: "",
  employeeId: "",
  takenAt: nowLocalDateTimeInput(),
  returned: false,
  returnedAt: "",
  conditionNotes: "",
  issuedBy: "",
});

export default function AssetManagementPage() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters & Views
  const [activeTab, setActiveTab] = useState("ALL_ASSETS"); // ALL_ASSETS | BY_EMPLOYEE
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | UNRETURNED | RETURNED | PUBLIC
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");

  // Add / Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [formData, setFormData] = useState(blankForm);

  // Search-and-select employee combobox state inside modal
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef(null);

  // Quick Return Modal
  const [returnModalAsset, setReturnModalAsset] = useState(null);
  const [returnDateTime, setReturnDateTime] = useState(nowLocalDateTimeInput);
  const [returnNotes, setReturnNotes] = useState("");

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

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
    "Content-Type": "application/json",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/it-assets`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/employee`, { headers: getAuthHeaders() }),
      ]);

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(Array.isArray(assetsData) ? assetsData : []);
      } else {
        toast.error("Could not load IT assets");
      }

      if (employeesRes.ok) {
        const empData = await employeesRes.json();
        setEmployees(Array.isArray(empData) ? empData : []);
      }
    } catch (err) {
      console.error("Error loading asset management data:", err);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close employee search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target)
      ) {
        setEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getEmployeeFullName = (emp) => {
    if (!emp) return "";
    const first = emp.firstName || "";
    const last = emp.lastName || "";
    return `${first} ${last}`.trim() || emp.name || emp.email || `Employee #${emp.id}`;
  };

  const selectedEmployeeInForm = useMemo(
    () =>
      employees.find((emp) => String(emp.id) === String(formData.employeeId)) ||
      null,
    [employees, formData.employeeId]
  );

  const filteredEmployeesForSelect = useMemo(() => {
    const q = employeeSearchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const fullName = getEmployeeFullName(emp).toLowerCase();
      const code = (emp.employeeId || "").toLowerCase();
      const dept = (emp.department || emp.category?.name || "").toLowerCase();
      const pos = (emp.jobPosition || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const phone = (emp.phone || "").toLowerCase();
      return (
        fullName.includes(q) ||
        code.includes(q) ||
        dept.includes(q) ||
        pos.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      );
    });
  }, [employees, employeeSearchQuery]);

  // Summary metrics
  const stats = useMemo(() => {
    const total = assets.length;
    const publicCount = assets.filter((a) => a.isPublic || a.status === "PUBLIC").length;
    const unreturnedCount = assets.filter(
      (a) => !a.isPublic && !a.returned && a.status !== "PUBLIC"
    ).length;
    const returnedCount = assets.filter(
      (a) => !a.isPublic && a.returned
    ).length;
    const employeesHoldingCount = new Set(
      assets
        .filter((a) => !a.isPublic && !a.returned && a.employeeId)
        .map((a) => a.employeeId)
    ).size;

    return {
      total,
      publicCount,
      unreturnedCount,
      returnedCount,
      employeesHoldingCount,
    };
  }, [assets]);

  // Filtered assets list
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const effectiveStatus = asset.isPublic
        ? "PUBLIC"
        : asset.returned
        ? "RETURNED"
        : "UNRETURNED";

      if (statusFilter !== "ALL" && effectiveStatus !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "ALL" && asset.category !== categoryFilter) {
        return false;
      }

      if (employeeFilter !== "ALL") {
        if (employeeFilter === "PUBLIC_ONLY") {
          if (!asset.isPublic) return false;
        } else if (String(asset.employeeId) !== String(employeeFilter)) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const searchable = [
          asset.assetName,
          asset.assetTag,
          asset.category,
          asset.specifications,
          asset.employeeName,
          asset.employeeCode,
          asset.employeeDepartment,
          asset.employeePosition,
          asset.location,
          asset.conditionNotes,
          effectiveStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [assets, statusFilter, categoryFilter, employeeFilter, searchTerm]);

  // Grouped by employee for the "Employee Holdings" tab
  const employeeHoldingsGroups = useMemo(() => {
    const map = new Map();

    assets
      .filter((a) => !a.isPublic && a.employeeId)
      .forEach((asset) => {
        const key = String(asset.employeeId);
        if (!map.has(key)) {
          map.set(key, {
            employeeId: asset.employeeId,
            employeeName: asset.employeeName || `Employee #${asset.employeeId}`,
            employeeCode: asset.employeeCode || "",
            employeeDepartment: asset.employeeDepartment || "",
            employeePosition: asset.employeePosition || "",
            employeePhone: asset.employeePhone || "",
            employeeEmail: asset.employeeEmail || "",
            items: [],
          });
        }
        map.get(key).items.push(asset);
      });

    let groups = Array.from(map.values());

    if (employeeFilter !== "ALL" && employeeFilter !== "PUBLIC_ONLY") {
      groups = groups.filter(
        (g) => String(g.employeeId) === String(employeeFilter)
      );
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      groups = groups.filter((g) => {
        const headerMatch = [
          g.employeeName,
          g.employeeCode,
          g.employeeDepartment,
          g.employeePosition,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
        const itemMatch = g.items.some((item) =>
          [item.assetName, item.assetTag, item.specifications, item.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        );
        return headerMatch || itemMatch;
      });
    }

    return groups.sort((a, b) => {
      const aActive = a.items.filter((i) => !i.returned).length;
      const bActive = b.items.filter((i) => !i.returned).length;
      return bActive - aActive;
    });
  }, [assets, employeeFilter, searchTerm]);

  const openCreateModal = (preselectedEmployeeId = "", defaultPublic = false) => {
    setEditingAssetId(null);
    const initial = {
      ...blankForm(),
      isPublic: defaultPublic,
      category: defaultPublic ? "PRINTER" : "LAPTOP",
      employeeId: preselectedEmployeeId ? String(preselectedEmployeeId) : "",
      takenAt: nowLocalDateTimeInput(),
    };
    setFormData(initial);

    if (preselectedEmployeeId) {
      const emp = employees.find(
        (e) => String(e.id) === String(preselectedEmployeeId)
      );
      setEmployeeSearchQuery(emp ? getEmployeeFullName(emp) : "");
    } else {
      setEmployeeSearchQuery("");
    }
    setEmployeeDropdownOpen(false);
    setShowFormModal(true);
  };

  const openEditModal = (asset) => {
    setEditingAssetId(asset.id);
    setFormData({
      assetName: asset.assetName || "",
      assetTag: asset.assetTag || "",
      category: asset.category || "LAPTOP",
      specifications: asset.specifications || "",
      isPublic: Boolean(asset.isPublic),
      location: asset.location || "",
      employeeId: asset.employeeId ? String(asset.employeeId) : "",
      takenAt: toDateTimeInputValue(asset.takenAt) || nowLocalDateTimeInput(),
      returned: Boolean(asset.returned),
      returnedAt: toDateTimeInputValue(asset.returnedAt) || "",
      conditionNotes: asset.conditionNotes || "",
      issuedBy: asset.issuedBy || "",
    });
    setEmployeeSearchQuery(asset.employeeName || "");
    setEmployeeDropdownOpen(false);
    setShowFormModal(true);
  };

  const handleSaveAsset = async (e) => {
    e.preventDefault();

    if (!formData.assetName.trim()) {
      toast.error("Please enter the asset/device name");
      return;
    }

    if (!formData.isPublic && !formData.employeeId) {
      toast.error(
        "Please select an employee holding this device, or mark the asset as Public"
      );
      return;
    }

    if (!formData.isPublic && formData.returned && !formData.returnedAt) {
      toast.error("Please specify the date and time the asset was returned");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        assetName: formData.assetName.trim(),
        assetTag: formData.assetTag.trim() || null,
        category: formData.category,
        specifications: formData.specifications.trim() || null,
        isPublic: Boolean(formData.isPublic),
        location: formData.location.trim() || null,
        employeeId: formData.isPublic
          ? null
          : formData.employeeId
          ? Number(formData.employeeId)
          : null,
        takenAt:
          formData.takenAt && formData.takenAt.length === 16
            ? `${formData.takenAt}:00`
            : formData.takenAt || null,
        returned: formData.isPublic ? false : Boolean(formData.returned),
        returnedAt:
          !formData.isPublic && formData.returned && formData.returnedAt
            ? formData.returnedAt.length === 16
              ? `${formData.returnedAt}:00`
              : formData.returnedAt
            : null,
        conditionNotes: formData.conditionNotes.trim() || null,
        issuedBy: formData.issuedBy.trim() || null,
      };

      const url = editingAssetId
        ? `${API_BASE_URL}/api/it-assets/${editingAssetId}`
        : `${API_BASE_URL}/api/it-assets`;
      const method = editingAssetId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const saved = await response.json();
        if (editingAssetId) {
          setAssets((prev) =>
            prev.map((item) => (item.id === saved.id ? saved : item))
          );
          toast.success("Asset record updated");
        } else {
          setAssets((prev) => [saved, ...prev]);
          toast.success(
            saved.isPublic
              ? "Public IT asset added"
              : `Device issued to ${saved.employeeName || "employee"}`
          );
        }
        setShowFormModal(false);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to save asset record");
      }
    } catch (err) {
      console.error("Save asset error:", err);
      toast.error("Error saving asset record");
    } finally {
      setSaving(false);
    }
  };

  const openQuickReturnModal = (asset) => {
    setReturnModalAsset(asset);
    setReturnDateTime(nowLocalDateTimeInput());
    setReturnNotes(asset.conditionNotes || "");
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!returnModalAsset) return;

    setSaving(true);
    try {
      const formattedReturnTime =
        returnDateTime && returnDateTime.length === 16
          ? `${returnDateTime}:00`
          : returnDateTime;

      const response = await fetch(
        `${API_BASE_URL}/api/it-assets/${returnModalAsset.id}/mark-returned`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            returnedAt: formattedReturnTime,
            conditionNotes: returnNotes,
          }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setAssets((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        toast.success(`Marked "${updated.assetName}" as Returned`);
        setReturnModalAsset(null);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Could not mark asset as returned");
      }
    } catch (err) {
      toast.error("Failed to mark asset as returned");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkUnreturned = async (asset) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/it-assets/${asset.id}/mark-unreturned`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setAssets((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        toast.info(`Marked "${updated.assetName}" as Unreturned`);
      } else {
        toast.error("Could not update return status");
      }
    } catch (err) {
      toast.error("Failed to update return status");
    }
  };

  const handleDeleteAsset = async (asset) => {
    const confirmed = window.appConfirm
      ? await window.appConfirm(
          `Are you sure you want to delete "${asset.assetName}"?`
        )
      : window.confirm(`Are you sure you want to delete "${asset.assetName}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/it-assets/${asset.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        toast.success("Asset deleted");
      } else {
        toast.error("Failed to delete asset");
      }
    } catch (err) {
      toast.error("Error deleting asset");
    }
  };

  const getCategoryMeta = (catValue) =>
    ASSET_CATEGORIES.find((c) => c.value === catValue) ||
    ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
        <MainSidebar />
      </aside>

      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-8">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <Laptop size={15} />
              <span>IT & Company Equipment Registry</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              IT Asset Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track laptops, monitors, printers, and IT devices — see which
              employee holds what, specifications, time taken, return dates, and
              Public shared assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={() => openCreateModal("", true)}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Globe size={16} />
              Add Public Asset
            </button>

            <button
              onClick={() => openCreateModal("", false)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={17} />
              Assign / Issue Device
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              statusFilter === "ALL"
                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Tracked Devices
              </span>
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                <Laptop size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across {stats.employeesHoldingCount} active employee holder
              {stats.employeesHoldingCount === 1 ? "" : "s"}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("UNRETURNED")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              statusFilter === "UNRETURNED"
                ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Unreturned (Held Now)
              </span>
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {stats.unreturnedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Currently in possession of employees
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("RETURNED")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              statusFilter === "RETURNED"
                ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Returned Devices
              </span>
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {stats.returnedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Returned with recorded date & time
            </p>
          </div>

          <div
            onClick={() => setStatusFilter("PUBLIC")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              statusFilter === "PUBLIC"
                ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Public Shared Assets
              </span>
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                <Printer size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-indigo-700">
              {stats.publicCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Printers & shared office IT equipment
            </p>
          </div>
        </div>

        {/* View Switcher & Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("ALL_ASSETS")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "ALL_ASSETS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Laptop size={16} />
                All Devices & Status ({filteredAssets.length})
              </button>
              <button
                onClick={() => setActiveTab("BY_EMPLOYEE")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "BY_EMPLOYEE"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Users size={16} />
                By Employee Holdings ({employeeHoldingsGroups.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "UNRETURNED", "RETURNED", "PUBLIC"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "All Statuses"
                    : st === "UNRETURNED"
                    ? "Unreturned"
                    : st === "RETURNED"
                    ? "Returned"
                    : "Public"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={17}
                className=" absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by device name, specs, serial/tag, employee name, ID, or department..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Device Types</option>
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Employees & Public</option>
                <option value="PUBLIC_ONLY">🌐 Public Shared Assets Only</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {getEmployeeFullName(emp)}{" "}
                    {emp.employeeId ? `(${emp.employeeId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <RefreshCw
                size={32}
                className="mx-auto animate-spin text-blue-600"
              />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Loading IT asset registry...
              </p>
            </div>
          </div>
        ) : activeTab === "ALL_ASSETS" ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Device & Type
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Specifications
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Holder / Assignment
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      When Taken
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Return Status & Date
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredAssets.map((asset) => {
                    const catMeta = getCategoryMeta(asset.category);
                    const CatIcon = catMeta.icon;
                    const durationHeld = formatDurationHeld(
                      asset.takenAt,
                      asset.returnedAt,
                      asset.returned
                    );

                    return (
                      <tr
                        key={asset.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        {/* Device & Type */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${catMeta.color}`}
                            >
                              <CatIcon size={19} />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {asset.assetName}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${catMeta.color}`}
                                >
                                  {catMeta.label}
                                </span>
                                {asset.assetTag && (
                                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                                    #{asset.assetTag}
                                  </span>
                                )}
                              </div>
                              {asset.location && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                  <Building2 size={12} />
                                  <span>{asset.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Specifications */}
                        <td className="max-w-xs px-6 py-4 align-top">
                          {asset.specifications ? (
                            <div className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700">
                              {asset.specifications}
                            </div>
                          ) : (
                            <span className="text-xs italic text-slate-400">
                              No specifications listed
                            </span>
                          )}
                          {asset.conditionNotes && (
                            <div className="mt-1.5 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">
                                Note:
                              </span>{" "}
                              {asset.conditionNotes}
                            </div>
                          )}
                        </td>

                        {/* Holder / Assignment */}
                        <td className="px-6 py-4 align-top">
                          {asset.isPublic ? (
                            <div className="inline-flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                <Globe size={13} />
                                Public
                              </span>
                              <span className="text-xs text-slate-500">
                                {asset.location || "Shared Company Device"}
                              </span>
                            </div>
                          ) : asset.employeeId ? (
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  setEmployeeFilter(String(asset.employeeId))
                                }
                                className="text-left font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                              >
                                {asset.employeeName}
                              </button>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                {asset.employeeCode && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-blue-700">
                                    {asset.employeeCode}
                                  </span>
                                )}
                                {asset.employeePosition && (
                                  <span>{asset.employeePosition}</span>
                                )}
                              </div>
                              {asset.employeeDepartment && (
                                <div className="mt-0.5 text-xs text-slate-400">
                                  {asset.employeeDepartment}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* When Taken */}
                        <td className="px-6 py-4 align-top">
                          {asset.isPublic ? (
                            <div className="text-xs text-slate-500">
                              <span className="font-medium text-slate-700">
                                Shared Resource
                              </span>
                              {asset.takenAt && (
                                <div className="mt-0.5 text-slate-400">
                                  Added: {formatDateTimeDisplay(asset.takenAt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-slate-800">
                                {formatDateTimeDisplay(asset.takenAt)}
                              </div>
                              {durationHeld && (
                                <div className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  <Clock size={11} />
                                  {asset.returned
                                    ? `Held for ${durationHeld}`
                                    : `Held ${durationHeld}`}
                                </div>
                              )}
                              {asset.issuedBy && (
                                <div className="mt-1 text-[11px] text-slate-400">
                                  Issued by: {asset.issuedBy}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Return Status & Date */}
                        <td className="px-6 py-4 align-top">
                          {asset.isPublic ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                              <Globe size={13} />
                              Public
                            </span>
                          ) : asset.returned ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                <CheckCircle2 size={13} />
                                Returned
                              </span>
                              <div className="mt-1.5 text-xs font-medium text-slate-700">
                                {formatDateTimeDisplay(asset.returnedAt)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                <AlertCircle size={13} />
                                Unreturned
                              </span>
                              <div className="mt-1.5 text-xs text-amber-700">
                                Currently with employee
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5">
                            {!asset.isPublic && !asset.returned && (
                              <button
                                onClick={() => openQuickReturnModal(asset)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                                title="Mark this device as returned"
                              >
                                <Check size={14} />
                                Mark Returned
                              </button>
                            )}

                            {!asset.isPublic && asset.returned && (
                              <button
                                onClick={() => handleMarkUnreturned(asset)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                                title="Mark as Unreturned"
                              >
                                <RotateCcw size={13} />
                                Mark Unreturned
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(asset)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-blue-600"
                              title="Edit asset / specifications"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              onClick={() => handleDeleteAsset(asset)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
                              title="Delete asset"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <Laptop
                          size={44}
                          className="mx-auto mb-3 text-slate-300"
                        />
                        <p className="text-base font-semibold text-slate-700">
                          No IT assets match your current filters
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Click &ldquo;Assign / Issue Device&rdquo; when an
                          employee comes for a device, or &ldquo;Add Public
                          Asset&rdquo; for shared equipment like printers.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Employee Holdings View */
          <div className="space-y-4">
            {employeeHoldingsGroups.map((group) => {
              const unreturnedItems = group.items.filter((i) => !i.returned);
              const returnedItems = group.items.filter((i) => i.returned);

              return (
                <div
                  key={group.employeeId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                        {group.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {group.employeeName}
                          </h3>
                          {group.employeeCode && (
                            <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800">
                              {group.employeeCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {[
                            group.employeePosition,
                            group.employeeDepartment,
                            group.employeePhone,
                          ]
                            .filter(Boolean)
                            .join(" • ") || "Employee"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        {unreturnedItems.length} Unreturned
                      </span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        {returnedItems.length} Returned
                      </span>
                      <button
                        onClick={() => openCreateModal(group.employeeId, false)}
                        className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus size={14} />
                        Issue Device to {group.employeeName.split(" ")[0]}
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => {
                      const catMeta = getCategoryMeta(item.category);
                      const CatIcon = catMeta.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${catMeta.color}`}
                            >
                              <CatIcon size={17} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {item.assetName}
                                </span>
                                <span
                                  className={`rounded border px-2 py-0.5 text-[11px] font-medium ${catMeta.color}`}
                                >
                                  {catMeta.label}
                                </span>
                                {item.assetTag && (
                                  <span className="font-mono text-xs text-slate-500">
                                    #{item.assetTag}
                                  </span>
                                )}
                              </div>
                              {item.specifications && (
                                <p className="mt-1 text-xs text-slate-600">
                                  <span className="font-medium">Specs:</span>{" "}
                                  {item.specifications}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
                                <span>
                                  <strong>Taken:</strong>{" "}
                                  {formatDateTimeDisplay(item.takenAt)}
                                </span>
                                {item.returned && item.returnedAt && (
                                  <span className="text-emerald-700">
                                    <strong>Returned:</strong>{" "}
                                    {formatDateTimeDisplay(item.returnedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {item.returned ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                  <CheckCircle2 size={13} />
                                  Returned
                                </span>
                                <button
                                  onClick={() => handleMarkUnreturned(item)}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                >
                                  Mark Unreturned
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                  <AlertCircle size={13} />
                                  Unreturned
                                </span>
                                <button
                                  onClick={() => openQuickReturnModal(item)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  <Check size={13} />
                                  Mark Returned
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEditModal(item)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {employeeHoldingsGroups.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <Users size={42} className="mx-auto mb-3 text-slate-300" />
                <p className="text-base font-semibold text-slate-700">
                  No employee device holdings found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Issue a device to an employee to see their holdings here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add / Edit Asset Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingAssetId
                    ? "Edit IT Asset / Assignment"
                    : formData.isPublic
                    ? "Add Public Shared IT Asset"
                    : "Issue / Assign IT Device to Employee"}
                </h2>
                <p className="text-xs text-slate-500">
                  Record device details, specifications, who holds it, and when
                  it was taken or returned.
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-5 p-6">
              {/* Assignment Mode Toggle: Employee vs Public */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-100 p-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, isPublic: false }))
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    !formData.isPublic
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <User size={16} />
                  Assigned to Employee
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      isPublic: true,
                      returned: false,
                      returnedAt: "",
                    }))
                  }
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    formData.isPublic
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Globe size={16} />
                  Public Asset (Printers & Shared)
                </button>
              </div>

              {/* Search & Select Employee (when not Public) */}
              {!formData.isPublic ? (
                <div ref={employeeDropdownRef} className="relative">
                  <label className="block text-sm font-semibold text-slate-700">
                    Select Employee Coming for Device *
                  </label>
                  <p className="mb-1.5 text-xs text-slate-500">
                    Search and select from the company employee list
                  </p>

                  {selectedEmployeeInForm ? (
                    <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                          {getEmployeeFullName(selectedEmployeeInForm)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {getEmployeeFullName(selectedEmployeeInForm)}
                          </div>
                          <div className="text-xs text-slate-600">
                            {[
                              selectedEmployeeInForm.employeeId,
                              selectedEmployeeInForm.jobPosition,
                              selectedEmployeeInForm.department ||
                                selectedEmployeeInForm.category?.name,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, employeeId: "" }));
                          setEmployeeSearchQuery("");
                          setEmployeeDropdownOpen(true);
                        }}
                        className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={employeeSearchQuery}
                        onFocus={() => setEmployeeDropdownOpen(true)}
                        onChange={(e) => {
                          setEmployeeSearchQuery(e.target.value);
                          setEmployeeDropdownOpen(true);
                        }}
                        placeholder="Type employee name, ID, department, or position to search..."
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEmployeeDropdownOpen((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <ChevronDown size={17} />
                      </button>
                    </div>
                  )}

                  {employeeDropdownOpen && !selectedEmployeeInForm && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {filteredEmployeesForSelect.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No matching employees found
                        </div>
                      ) : (
                        filteredEmployeesForSelect.map((emp) => (
                          <button
                            type="button"
                            key={emp.id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                employeeId: String(emp.id),
                              }));
                              setEmployeeSearchQuery(getEmployeeFullName(emp));
                              setEmployeeDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between border-b border-slate-50 px-4 py-2.5 text-left hover:bg-blue-50"
                          >
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {getEmployeeFullName(emp)}
                              </div>
                              <div className="text-xs text-slate-500">
                                {[
                                  emp.jobPosition,
                                  emp.department || emp.category?.name,
                                  emp.email,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                            </div>
                            {emp.employeeId && (
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                                {emp.employeeId}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <Globe size={16} className="text-indigo-600" />
                    Marked as Public Asset
                  </div>
                  <p className="mt-1 text-xs text-indigo-700">
                    This device (such as a printer, shared monitor, router, or
                    general office equipment) will be marked{" "}
                    <strong>Public</strong> instead of being tied to a single
                    employee.
                  </p>
                </div>
              )}

              {/* Asset Name & Category */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Asset / Device Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.assetName}
                    onChange={(e) =>
                      setFormData({ ...formData, assetName: e.target.value })
                    }
                    placeholder="e.g. HP EliteBook 840 G8, Dell 27 Monitor, HP LaserJet"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Device Type / Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        category: nextCat,
                        isPublic:
                          nextCat === "PRINTER" && !editingAssetId
                            ? true
                            : prev.isPublic,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {ASSET_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Asset Tag / Serial & Location */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Asset Tag / Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.assetTag}
                    onChange={(e) =>
                      setFormData({ ...formData, assetTag: e.target.value })
                    }
                    placeholder="e.g. EAC-IT-042 or SN# 5CG12345"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Location / Office Area
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Main Office, Engineering Bay, Reception"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specifications */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Specifications
                </label>
                <textarea
                  rows={3}
                  value={formData.specifications}
                  onChange={(e) =>
                    setFormData({ ...formData, specifications: e.target.value })
                  }
                  placeholder="Enter technical specifications (e.g. Intel Core i7-1165G7, 16GB RAM, 512GB NVMe SSD, 14-inch FHD, Windows 11 Pro, Charger included)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Time Taken & Return Status */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    {formData.isPublic
                      ? "Date & Time Deployed"
                      : "Date & Time Taken *"}
                  </label>
                  <input
                    type="datetime-local"
                    required={!formData.isPublic}
                    value={formData.takenAt}
                    onChange={(e) =>
                      setFormData({ ...formData, takenAt: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {!formData.isPublic && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Return Status
                    </label>
                    <select
                      value={formData.returned ? "RETURNED" : "UNRETURNED"}
                      onChange={(e) => {
                        const isRet = e.target.value === "RETURNED";
                        setFormData((prev) => ({
                          ...prev,
                          returned: isRet,
                          returnedAt:
                            isRet && !prev.returnedAt
                              ? nowLocalDateTimeInput()
                              : isRet
                              ? prev.returnedAt
                              : "",
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="UNRETURNED">
                        Unreturned (Currently with Employee)
                      </option>
                      <option value="RETURNED">Returned</option>
                    </select>
                  </div>
                )}
              </div>

              {!formData.isPublic && formData.returned && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-emerald-700">
                    Date & Time Returned *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.returnedAt}
                    onChange={(e) =>
                      setFormData({ ...formData, returnedAt: e.target.value })
                    }
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Condition / Accessories Notes
                </label>
                <input
                  type="text"
                  value={formData.conditionNotes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditionNotes: e.target.value,
                    })
                  }
                  placeholder="Optional notes (e.g. Issued with mouse & charger, good condition)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingAssetId
                    ? "Update Asset"
                    : formData.isPublic
                    ? "Save Public Asset"
                    : "Record Device Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Mark Returned Modal */}
      {returnModalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Mark Device as Returned
              </h3>
              <button
                onClick={() => setReturnModalAsset(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm">
                <div className="font-semibold text-slate-900">
                  {returnModalAsset.assetName}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Held by:{" "}
                  <span className="font-medium text-slate-700">
                    {returnModalAsset.employeeName || "Employee"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Taken: {formatDateTimeDisplay(returnModalAsset.takenAt)}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Return Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Return Condition / Notes
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Returned in good condition with charger"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalAsset(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {saving ? "Saving..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

