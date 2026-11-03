import React, { useState, useEffect, useMemo } from "react";
import {
  Laptop,
  Monitor,
  Printer,
  HardDrive,
  Smartphone,
  Wifi,
  Cpu,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Globe,
  Calendar,
  Building2,
  FileText,
  ShieldCheck,
  Info,
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

export default function MyAssetsPage() {
  const [myAssets, setMyAssets] = useState([]);
  const [publicAssets, setPublicAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState("MY_ITEMS"); // MY_ITEMS | PUBLIC_ITEMS
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | UNRETURNED | RETURNED
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

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
      const [myRes, pubRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/it-assets/my-assets`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/it-assets/public`, { headers: getAuthHeaders() }),
      ]);

      if (myRes.ok) {
        const myData = await myRes.json();
        setMyAssets(Array.isArray(myData) ? myData : []);
      } else {
        toast.error("Could not load your assigned assets");
      }

      if (pubRes.ok) {
        const pubData = await pubRes.json();
        setPublicAssets(Array.isArray(pubData) ? pubData : []);
      }
    } catch (err) {
      console.error("Error loading employee assets:", err);
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = myAssets.length;
    const unreturned = myAssets.filter((a) => !a.returned).length;
    const returned = myAssets.filter((a) => a.returned).length;
    const publicCount = publicAssets.length;

    return { total, unreturned, returned, publicCount };
  }, [myAssets, publicAssets]);

  const filteredMyAssets = useMemo(() => {
    return myAssets.filter((item) => {
      if (statusFilter === "UNRETURNED" && item.returned) return false;
      if (statusFilter === "RETURNED" && !item.returned) return false;

      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const searchable = [
          item.assetName,
          item.assetTag,
          item.category,
          item.specifications,
          item.location,
          item.conditionNotes,
          item.issuedBy,
          item.returned ? "returned" : "unreturned",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [myAssets, statusFilter, categoryFilter, searchTerm]);

  const filteredPublicAssets = useMemo(() => {
    return publicAssets.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const searchable = [
          item.assetName,
          item.assetTag,
          item.category,
          item.specifications,
          item.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [publicAssets, categoryFilter, searchTerm]);

  const getCategoryMeta = (catValue) =>
    ASSET_CATEGORIES.find((c) => c.value === catValue) ||
    ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
        <MainSidebar />
      </aside>

      <main className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <Laptop size={15} />
              <span>Personal Equipment Portal</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              My Assigned IT Assets
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review company laptops, monitors, accessories, and equipment
              issued to you, their specifications, when you took them, and their return status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => {
              setActiveTab("MY_ITEMS");
              setStatusFilter("ALL");
            }}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              activeTab === "MY_ITEMS" && statusFilter === "ALL"
                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Devices Issued
              </span>
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                <Laptop size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {stats.total}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Assigned to you across your tenure
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab("MY_ITEMS");
              setStatusFilter("UNRETURNED");
            }}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              activeTab === "MY_ITEMS" && statusFilter === "UNRETURNED"
                ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Currently in Your Possession
              </span>
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {stats.unreturned}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active devices marked Unreturned
            </p>
          </div>

          <div
            onClick={() => {
              setActiveTab("MY_ITEMS");
              setStatusFilter("RETURNED");
            }}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              activeTab === "MY_ITEMS" && statusFilter === "RETURNED"
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
              {stats.returned}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Handed back with verified return date
            </p>
          </div>

          <div
            onClick={() => setActiveTab("PUBLIC_ITEMS")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              activeTab === "PUBLIC_ITEMS"
                ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                Public Shared Assets
              </span>
              <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
                <Globe size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-indigo-700">
              {stats.publicCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Office printers &amp; shared resources
            </p>
          </div>
        </div>

        {/* View Selection & Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab("MY_ITEMS")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "MY_ITEMS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Laptop size={16} />
                My Devices ({myAssets.length})
              </button>
              <button
                onClick={() => setActiveTab("PUBLIC_ITEMS")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "PUBLIC_ITEMS"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Globe size={16} />
                Public Shared Assets ({publicAssets.length})
              </button>
            </div>

            {activeTab === "MY_ITEMS" && (
              <div className="flex items-center gap-2">
                {["ALL", "UNRETURNED", "RETURNED"].map((st) => (
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
                      ? "All Items"
                      : st === "UNRETURNED"
                      ? "Unreturned (In Hand)"
                      : "Returned"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by device name, specifications, serial/tag, location, or notes..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="text-center">
              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Loading your equipment records...
              </p>
            </div>
          </div>
        ) : activeTab === "MY_ITEMS" ? (
          <div className="space-y-4">
            {filteredMyAssets.map((asset) => {
              const catMeta = getCategoryMeta(asset.category);
              const CatIcon = catMeta.icon;
              const durationHeld = formatDurationHeld(
                asset.takenAt,
                asset.returnedAt,
                asset.returned
              );

              return (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${catMeta.color}`}
                      >
                        <CatIcon size={22} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {asset.assetName}
                          </h3>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${catMeta.color}`}
                          >
                            {catMeta.label}
                          </span>
                          {asset.assetTag && (
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                              #{asset.assetTag}
                            </span>
                          )}
                        </div>
                        {asset.location && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <Building2 size={13} />
                            <span>Location: {asset.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {asset.returned ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 size={14} />
                          Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
                          <AlertCircle size={14} />
                          Unreturned (With You)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {/* Specifications */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Device Specifications
                      </p>
                      {asset.specifications ? (
                        <div className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
                          {asset.specifications}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs italic text-slate-400">
                          No specifications recorded for this device.
                        </p>
                      )}
                    </div>

                    {/* Timeline & Metadata */}
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Date &amp; Time Taken
                        </span>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {formatDateTimeDisplay(asset.takenAt)}
                        </div>
                        {asset.issuedBy && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Handed over by: {asset.issuedBy}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Return Status
                        </span>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {asset.returned ? (
                            <span className="text-emerald-700">
                              Returned on {formatDateTimeDisplay(asset.returnedAt)}
                            </span>
                          ) : (
                            <span className="text-amber-700">
                              Not returned yet
                            </span>
                          )}
                        </div>
                        {asset.conditionNotes && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Condition: {asset.conditionNotes}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Time Held
                        </span>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {durationHeld ? (
                            <span className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs">
                              <Clock size={12} />
                              {durationHeld}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {asset.returned ? "Prior usage duration" : "Active duration"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMyAssets.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <Laptop size={44} className="mx-auto mb-3 text-slate-300" />
                <p className="text-base font-semibold text-slate-700">
                  No equipment records found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm || statusFilter !== "ALL" || categoryFilter !== "ALL"
                    ? "Try clearing your search or filters."
                    : "No IT devices have been issued to your account yet."}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Public Assets Tab */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredPublicAssets.map((asset) => {
                const catMeta = getCategoryMeta(asset.category);
                const CatIcon = catMeta.icon;

                return (
                  <div
                    key={asset.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${catMeta.color}`}
                          >
                            <CatIcon size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {asset.assetName}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-semibold border ${catMeta.color}`}
                              >
                                {catMeta.label}
                              </span>
                              {asset.assetTag && (
                                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                  #{asset.assetTag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                          <Globe size={12} />
                          Public
                        </span>
                      </div>

                      {asset.specifications && (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
                          <strong className="block text-slate-900 mb-1">
                            Specifications:
                          </strong>
                          {asset.specifications}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>Location: <strong>{asset.location || "Office Shared"}</strong></span>
                      {asset.conditionNotes && <span>Note: {asset.conditionNotes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPublicAssets.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
                <Printer size={44} className="mx-auto mb-3 text-slate-300" />
                <p className="text-base font-semibold text-slate-700">
                  No public assets found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  No shared equipment matches the filter.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

