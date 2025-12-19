// src/pages/Eac-inventory/outgoing.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TruckIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  ArchiveBoxIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  HomeIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardIcon
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { SidebarWithBurgerMenu } from "./SidebarWithBurgerMenu";

/**
 * Clean, consistent Outgoing.jsx
 * - No missing icon imports (uses XMarkIcon instead of unavailable DocumentXMarkIcon).
 * - Standardized store_type: 'regular' | 'ppe' | 'kitchenStore' | 'returnable'
 * - All methods included: fetch, filters, export, markAsReturned, markAsNotReturned, modal UI, badges.
 */

const STORE_TYPES = {
  REGULAR: "regular",
  PPE: "ppe",
  KITCHEN: "kitchenStore",
  RETURNABLE: "returnable",
};

  const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;

  console.log("🖥️ Current hostname:", hostname);
  console.log("🔌 Current port:", port);

  // If frontend is opened via localhost → use localhost backend
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log("🏠 Using LOCALHOST API URL");
    return "http://localhost:8080";
  }

  // LAN access
  if (hostname.startsWith("192.168.")) {
    console.log("🏠 Using LAN API URL");
    return import.meta.env.VITE_API_BASE_URL_LOCAL;
  }

  // Public / Tailscale / Cloudflare IP
  if (hostname === "100.114.178.13") {
    console.log("🌐 Using PUBLIC API URL");
    return import.meta.env.VITE_API_BASE_URL_PUBLIC;
  }

  // Default fallback
  console.log("🌍 Using PUBLIC API URL (fallback)");
  return import.meta.env.VITE_API_BASE_URL_PUBLIC;
};

  const API_BASE_URL = getApiBaseUrl();

const defaultGetAuthToken = () =>
  localStorage.getItem("jwtToken") || localStorage.getItem("authToken");

const ViewDetailModal = ({
  record,
  isOpen,
  onClose,
  navigate,
  markAsReturned,
  markAsNotReturned
}) => {
  if (!isOpen || !record) return null;

  const isTransfer =
    record.type === "transfer" || record.recordType === "TRANSFER";
  const isRequest =
    record.type === "request" ||
    record.recordType === "REQUEST" ||
    record.recordType === "ISSUED";
  const isPpe = Boolean(record.isPpe || record.ppe);
  const isReturnable = Boolean(record.returnableAfterUse || record.returnable);

  const formatDate = (d) =>
    !d ? "N/A" : new Date(d).toLocaleString();

  const formatDateOnly = (d) =>
    !d ? "N/A" : new Date(d).toLocaleDateString();

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-200";
    switch (status.toLowerCase()) {
      case "transferred":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "issued":
        return "bg-green-100 text-green-800 border-green-200";
      case "requested":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "returned":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "not_returned":
        return "bg-red-100 text-red-800 border-red-200";
      case "overdue":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getReturnBadge = () => {
    if (!isReturnable) return null;
    switch ((record.returnStatus || "").toUpperCase()) {
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200">
            <DocumentCheckIcon className="h-3 w-3" />
            Returned on {formatDateOnly(record.returnedDate)}
          </span>
        );
      case "NOT_RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            <XMarkIcon className="h-3 w-3" />
            Not Returned
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            <ClockIcon className="h-3 w-3" />
            Pending Return
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40">
      <div className="w-full max-w-4xl overflow-hidden bg-white rounded-lg shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isPpe ? "bg-purple-100" : isTransfer ? "bg-blue-100" : "bg-green-100"
              }`}
            >
              {isPpe ? (
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
              ) : isTransfer ? (
                <TruckIcon className="h-6 w-6 text-blue-600" />
              ) : (
                <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {record.displayType || "Record"} Details
              </h3>
              <p className="text-sm text-gray-600">
                Record #: {record.code || record.id}
                {isReturnable && (
                  <span className="ml-2 inline-flex items-center gap-1 text-sm text-gray-500">
                    <ArchiveBoxIcon className="h-4 w-4" />
                    Returnable Item
                  </span>
                )}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {isReturnable && (
            <div className="mb-6 p-4 rounded border bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ArchiveBoxIcon className="h-6 w-6 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Returnable Item Tracking</h4>
                    <p className="text-sm text-gray-600">
                      Expected return date: {record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleString() : "Not specified"}
                    </p>
                  </div>
                </div>
                <div>{getReturnBadge()}</div>
              </div>

              {record.returnStatus !== "RETURNED" && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      markAsReturned(record.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-teal-600 rounded hover:bg-teal-700"
                  >
                    <DocumentCheckIcon className="h-4 w-4" />
                    Mark as Returned
                  </button>

                  <button
                    onClick={() => {
                      markAsNotReturned(record.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Mark as Not Returned
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-500">Item Information</h4>
                <div className="p-4 rounded bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-semibold text-gray-900">{record.name}</div>
                    <div className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                      (record.quantity || 0) > 10 ? "bg-green-100 text-green-800" :
                      (record.quantity || 0) > 5 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {record.quantity || (record.quantityMoved || record.quantityMoved === 0 ? record.quantityMoved : 0)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{record.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Code</div>
                      <div className="font-medium">{record.code || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Product ID</div>
                      <div className="font-medium">{record.productId || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-500">Location</h4>
                <div className="p-4 rounded bg-gray-50">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPinIcon className="h-5 w-5 text-blue-500" />
                    <div className="font-medium text-gray-900">
                      {record.location ? String(record.location).replace("_", " ") : "Not specified"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Source</div>
                      <div className="font-medium">{record.source || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Status</div>
                      <div className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-500">Requester</h4>
                <div className="p-4 rounded bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                      <UserIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{record.requester || record.employeeName || "Unknown"}</div>
                      <div className="text-sm text-gray-600">{record.department || "Not specified"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Employee ID</div>
                      <div className="font-medium">{record.employeeId || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Department</div>
                      <div className="font-medium">{record.department || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-500">Transaction</h4>
                <div className="p-4 rounded bg-gray-50">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="text-gray-600">Date & Time</div>
                      <div className="font-medium">{formatDate(record.date)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div className="text-gray-600">Processed By</div>
                      <div className="font-medium">{record.userName || "System"}</div>
                    </div>
                    {record.projectName && (
                      <div className="flex justify-between">
                        <div className="text-gray-600">Project</div>
                        <div className="font-medium">{record.projectName}</div>
                      </div>
                    )}
                    {record.urgency && (
                      <div className="flex justify-between">
                        <div className="text-gray-600">Urgency</div>
                        <div className="font-medium">{String(record.urgency).toUpperCase()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isRequest && record.items && record.items.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-medium text-gray-500">Items</h4>
              <div className="p-4 rounded bg-gray-50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-200">
                        <th className="p-2 text-xs text-gray-500">Item</th>
                        <th className="p-2 text-xs text-gray-500">Code</th>
                        <th className="p-2 text-xs text-gray-500">Requested</th>
                        <th className="p-2 text-xs text-gray-500">Approved</th>
                        <th className="p-2 text-xs text-gray-500">Issued</th>
                        <th className="p-2 text-xs text-gray-500">Returnable</th>
                        <th className="p-2 text-xs text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.items.map((it, i) => (
                        <tr className="border-b last:border-0" key={i}>
                          <td className="p-2">{it.productName}</td>
                          <td className="p-2 text-sm text-gray-600">{it.productCode || "N/A"}</td>
                          <td className="p-2">{it.requestedQuantity || 0}</td>
                          <td className="p-2 text-green-600">{it.approvedQuantity || 0}</td>
                          <td className="p-2 text-blue-600">{it.issuedQuantity || 0}</td>
                          <td className="p-2">{it.returnableAfterUse ? "Yes" : "No"}</td>
                          <td className="p-2">
                            <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              it.returnableAfterUse && it.returnStatus === "RETURNED" ? "bg-teal-100 text-teal-800" :
                              it.returnableAfterUse && it.returnStatus === "NOT_RETURNED" ? "bg-red-100 text-red-800" :
                              it.returnableAfterUse && it.returnStatus === "OVERDUE" ? "bg-orange-100 text-orange-800" :
                              it.returnableAfterUse ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {it.returnableAfterUse ? (it.returnStatus || "PENDING") : "N/A"}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {(record.notes || record.plannerNotes || record.procurementNotes) && (
            <div className="mt-6 space-y-3">
              {record.notes && (
                <div className="p-4 rounded bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                    <div className="text-sm font-medium text-blue-700">General Notes</div>
                  </div>
                  <div className="text-sm text-gray-700">{record.notes}</div>
                </div>
              )}
              {record.plannerNotes && (
                <div className="p-4 rounded bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardIcon className="h-4 w-4 text-amber-500" />
                    <div className="text-sm font-medium text-amber-700">Planner Notes</div>
                  </div>
                  <div className="text-sm text-gray-700">{record.plannerNotes}</div>
                </div>
              )}
              {record.procurementNotes && (
                <div className="p-4 rounded bg-emerald-50">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="h-4 w-4 text-emerald-500" />
                    <div className="text-sm font-medium text-emerald-700">Procurement Notes</div>
                  </div>
                  <div className="text-sm text-gray-700">{record.procurementNotes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarIcon className="h-4 w-4" />
            Last updated: {record.date ? new Date(record.date).toLocaleString() : "N/A"}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>

            {record.productId && String(record.id).indexOf("request-") === -1 && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/inventory/item/${record.productId}`);
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                View Product
              </button>
            )}

            {String(record.id).includes("request-") && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/${record.isPpe ? "ppe" : "product"}-request/${record.productId}`);
                }}
                className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 flex items-center gap-2"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                View Full Request
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Outgoing() {
  const [outgoingRecords, setOutgoingRecords] = useState([]);
  const [issuedRequests, setIssuedRequests] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI control states
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [storeTypeFilter, setStoreTypeFilter] = useState("all");
  const [returnStatusFilter, setReturnStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const navigate = useNavigate();

  const storeTypes = [
    { value: "all", label: "All Stores" },
    { value: STORE_TYPES.REGULAR, label: "Regular Store" },
    { value: STORE_TYPES.PPE, label: "PPE Store" },
    { value: STORE_TYPES.KITCHEN, label: "Kitchen Store" },
    { value: STORE_TYPES.RETURNABLE, label: "Returnable Items" }
  ];

  const returnStatuses = [
    { value: "all", label: "All Return Status" },
    { value: "RETURNED", label: "Returned" },
    { value: "NOT_RETURNED", label: "Not Returned" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "PENDING", label: "Pending Return" },
    { value: "NON_RETURNABLE", label: "Non-Returnable" }
  ];

  // determine store type robustly
  const determineStoreType = (record = {}) => {
    if (record.isPpe || record.ppe || record.request_type === "ppe") return STORE_TYPES.PPE;

    if (record.returnableAfterUse || record.returnable || (Array.isArray(record.returnableItems) && record.returnableItems.length > 0)) {
      return STORE_TYPES.RETURNABLE;
    }

    const name = String(record.name || "").toLowerCase();
    const desc = String(record.description || "").toLowerCase();
    const cat = String(record.category || "").toLowerCase();
    const dept = String(record.department || "").toLowerCase();

    const isKitchen = [name, desc, cat, dept].some(s => s.includes("kitchen")) || record.store_type === "kitchenStore" || record.kitchenStore === true;
    if (isKitchen) return STORE_TYPES.KITCHEN;
    return STORE_TYPES.REGULAR;
  };

  // fetch both outgoing and issued requests, transform to unified shape
  const fetchOutgoingRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = defaultGetAuthToken();

      if (!token) {
        throw new Error("Authentication token not found. Please login.");
      }

      const [outgoingRes, requestsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/api/outgoing`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        }),
        fetch(`${API_BASE_URL}/api/inventory-requests/issued`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        })
      ]);

      let transformedOutgoing = [];
      if (outgoingRes.status === "fulfilled" && outgoingRes.value.ok) {
        const data = await outgoingRes.value.json();
        transformedOutgoing = (data || []).map(rec => {
          const isReturnable = Boolean(rec.returnableAfterUse || rec.returnable);
          const issuedDate = rec.movementDate || rec.transferDate || rec.movement_date || rec.transfer_date || null;
          const expectedReturnDate = isReturnable ? new Date(issuedDate || Date.now()).getTime() + ((rec.returnPeriod || 30) * 24 * 60 * 60 * 1000) : null;

          let returnStatus = "NON_RETURNABLE";
          if (isReturnable) {
            if (rec.returnedDate || rec.returned_date) returnStatus = "RETURNED";
            else if ((rec.returnStatus || rec.return_status || "").toUpperCase() === "NOT_RETURNED") returnStatus = "NOT_RETURNED";
            else if (expectedReturnDate && Date.now() > expectedReturnDate) returnStatus = "OVERDUE";
            else returnStatus = "PENDING";
          }

          const storeType = determineStoreType(rec);

          return {
            ...rec,
            id: typeof rec.id === "string" || typeof rec.id === "number" ? rec.id : (rec.code || `out-${Math.random()}`),
            name: rec.name || rec.productName || rec.product_name || "Unnamed Item",
            code: rec.code || rec.requestNumber || rec.request_number || `OUT-${rec.id || Math.random()}`,
            description: rec.description || rec.notes || "",
            userName: rec.userName || rec.user_name || rec.requestedBy || rec.requested_by || "System",
            productId: rec.productId || rec.product_id,
            type: rec.recordType === "TRANSFER" || rec.record_type === "TRANSFER" ? "transfer" : (rec.recordType === "ISSUED" ? "request" : "transfer"),
            displayType: rec.recordType === "TRANSFER" ? "Inventory Transfer" : (rec.recordType === "ISSUED" ? "Issued Item" : (rec.recordType === "REQUEST" ? "Request" : "Transfer")),
            icon: CubeIcon,
            color: rec.recordType === "TRANSFER" ? "blue" : (rec.recordType === "ISSUED" ? "green" : "purple"),
            quantity: rec.quantityMoved || rec.quantity_moved || rec.quantity || rec.stock || 0,
            requester: rec.requestedBy || rec.requested_by || rec.userName || rec.user_name,
            location: rec.location || rec.locationName || "Not specified",
            date: rec.movementDate || rec.transferDate || rec.movement_date || rec.transfer_date || rec.date,
            source: rec.recordType === "TRANSFER" ? "Store Transfer" : "Employee Request",
            status: rec.status || (rec.recordType === "TRANSFER" ? "Transferred" : "Issued"),
            recordType: rec.recordType || rec.record_type,
            employeeName: rec.employeeName || rec.employee_name || rec.requestedBy,
            employeeId: rec.employeeId || rec.employee_id,
            department: rec.department || "Not specified",
            projectName: rec.projectName || rec.job || rec.project_name || "Not specified",
            ppe: rec.ppe || rec.isPpe || false,
            returnableAfterUse: isReturnable,
            returnable: isReturnable,
            returnPeriod: rec.returnPeriod || rec.return_period || 30,
            expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : null,
            returnedDate: rec.returnedDate || rec.returned_date || null,
            returnStatus: returnStatus,
            returnNotes: rec.returnNotes || rec.return_notes || "",
            store_type: storeType,
          };
        });
      } else {
        // if outgoingRes failed
        if (outgoingRes.status === "rejected") {
          console.warn("outgoing fetch failed:", outgoingRes.reason);
        } else if (outgoingRes.status === "fulfilled" && !outgoingRes.value.ok) {
          console.warn("outgoing fetch returned non-ok:", outgoingRes.value.status);
        }
      }

      let transformedRequests = [];
      if (requestsRes.status === "fulfilled" && requestsRes.value.ok) {
        const data = await requestsRes.value.json();
        transformedRequests = (data || []).map(req => {
          const items = req.items || [];
          const totalQuantity = items.reduce((s, it) => s + (it.issuedQuantity || it.approvedQuantity || it.requestedQuantity || 0), 0);
          const isPpe = Boolean(req.ppeRequest || req.isPpe || req.ppe);

          const issuedDate = req.issuedDate || req.requestDate || req.issued_date || req.request_date || new Date().toISOString();
          const returnableItems = (items || []).filter(it => it.returnableAfterUse);
          const hasReturnableItems = returnableItems.length > 0;
          const expectedReturnDate = hasReturnableItems ? new Date(issuedDate).getTime() + (30 * 24 * 60 * 60 * 1000) : null;

          let returnStatus = "NON_RETURNABLE";
          if (hasReturnableItems) {
            if (req.returnedDate || req.returned_date) returnStatus = "RETURNED";
            else if ((req.returnStatus || req.return_status || "").toUpperCase() === "NOT_RETURNED") returnStatus = "NOT_RETURNED";
            else if (expectedReturnDate && Date.now() > expectedReturnDate) returnStatus = "OVERDUE";
            else returnStatus = "PENDING";
          }

          const storeType = determineStoreType(req);

          return {
            id: `request-${req.id}`,
            name: isPpe ? `${(items || []).length} PPE Items` : (items.map(i => i.productName || i.product_name).join(", ") || "Multiple Items"),
            code: req.requestNumber || req.request_number || `REQ-${req.id}`,
            description: req.notes || req.projectName || req.project_name || "No description",
            userName: req.requestedBy || req.requested_by,
            productId: req.id,
            type: "request",
            displayType: isPpe ? "PPE Request" : "Inventory Request",
            icon: isPpe ? ShieldCheckIcon : ClipboardDocumentListIcon,
            color: isPpe ? "purple" : "green",
            quantity: totalQuantity,
            requester: req.requestedBy || req.requested_by,
            location: req.location || req.destination || "Not specified",
            date: req.issuedDate || req.requestDate || new Date().toISOString(),
            source: "Employee Request",
            status: "Issued",
            items: items,
            employeeName: req.requestedBy,
            department: req.department || "Not specified",
            job: req.jobDescription || req.projectName || req.project_name || "Not specified",
            recordType: "REQUEST",
            employeeId: req.requestedById || req.requested_by_id || "N/A",
            plannerNotes: req.plannerNotes || req.planner_notes,
            procurementNotes: req.procurementNotes || req.procurement_notes,
            estimatedCost: req.estimatedCost || req.estimated_cost,
            deliveryDate: req.deliveryDate || req.delivery_date,
            isPpe: isPpe,
            returnableAfterUse: hasReturnableItems,
            returnable: hasReturnableItems,
            returnPeriod: 30,
            expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : null,
            returnedDate: req.returnedDate || req.returned_date || null,
            returnStatus: returnStatus,
            returnNotes: req.returnNotes || req.return_notes || "",
            returnableItems: returnableItems,
            store_type: storeType,
          };
        });
      } else {
        if (requestsRes.status === "rejected") {
          console.warn("requests fetch failed:", requestsRes.reason);
        } else if (requestsRes.status === "fulfilled" && !requestsRes.value.ok) {
          console.warn("requests fetch returned non-ok:", requestsRes.value.status);
        }
      }

      const all = [...transformedOutgoing, ...transformedRequests];
      setOutgoingRecords(transformedOutgoing);
      setIssuedRequests(transformedRequests);

      // dedupe / set unique locations
      const locations = Array.from(new Set(all.map(r => r.location).filter(Boolean))).sort();
      setUniqueLocations(locations);
      setFilteredRecords(all);
    } catch (err) {
      console.error("Error fetching outgoing records:", err);
      setError(err.message || "Failed to load outgoing inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutgoingRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filtering logic
  useEffect(() => {
    let all = [...outgoingRecords, ...issuedRequests];

    if (activeTab !== "all") {
      if (activeTab === "regular") {
        all = all.filter(r => r.store_type === STORE_TYPES.REGULAR);
      } else if (activeTab === "ppe") {
        all = all.filter(r => r.store_type === STORE_TYPES.PPE);
      } else if (activeTab === "kitchen") {
        all = all.filter(r => r.store_type === STORE_TYPES.KITCHEN);
      } else if (activeTab === "returnable") {
        all = all.filter(r => r.store_type === STORE_TYPES.RETURNABLE);
      }
    }

    if (typeFilter !== "all") {
      if (typeFilter === "transfer") {
        all = all.filter(r => r.type === "transfer" || (r.recordType && r.recordType === "TRANSFER"));
      } else if (typeFilter === "request") {
        all = all.filter(r => r.type === "request" || (r.recordType && (r.recordType === "REQUEST" || r.recordType === "ISSUED")));
      }
    }

    if (storeTypeFilter !== "all") {
      all = all.filter(r => r.store_type === storeTypeFilter);
    }

    if (returnStatusFilter !== "all") {
      if (returnStatusFilter === "NON_RETURNABLE") {
        all = all.filter(r => !r.returnableAfterUse);
      } else {
        all = all.filter(r => r.returnableAfterUse && r.returnStatus === returnStatusFilter);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      all = all.filter(r =>
        (r.name || "").toString().toLowerCase().includes(term) ||
        (r.code || "").toString().toLowerCase().includes(term) ||
        (r.description || "").toString().toLowerCase().includes(term) ||
        (r.requester || "").toString().toLowerCase().includes(term) ||
        (r.location || "").toString().toLowerCase().includes(term) ||
        (r.employeeName || "").toString().toLowerCase().includes(term)
      );
    }

    if (dateFilter) {
      all = all.filter(r => {
        if (!r.date) return false;
        const recDate = new Date(r.date).toISOString().split("T")[0];
        return recDate === dateFilter;
      });
    }

    if (locationFilter) {
      all = all.filter(r => r.location === locationFilter);
    }

    setFilteredRecords(all);
  }, [
    searchTerm,
    dateFilter,
    locationFilter,
    typeFilter,
    storeTypeFilter,
    returnStatusFilter,
    outgoingRecords,
    issuedRequests,
    activeTab
  ]);

  const formatDate = (d) => (!d ? "N/A" : new Date(d).toLocaleString());
  const formatDateOnly = (d) => (!d ? "N/A" : new Date(d).toLocaleDateString());

  // badges
  const getReturnStatusBadge = (record) => {
    if (!record.returnableAfterUse) return null;
    switch ((record.returnStatus || "").toUpperCase()) {
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800 border border-teal-200">
            <DocumentCheckIcon className="h-3 w-3" />
            Returned
          </span>
        );
      case "NOT_RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
            <XMarkIcon className="h-3 w-3" />
            Not Returned
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-200">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setLocationFilter("");
    setTypeFilter("all");
    setStoreTypeFilter("all");
    setReturnStatusFilter("all");
    setShowAdvancedFilters(false);
  };

  const openViewModal = (record) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setSelectedRecord(null);
    setIsViewModalOpen(false);
  };

  // mark as returned
  const markAsReturned = async (recordId) => {
    try {
      const token = defaultGetAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/outgoing/${recordId}/return`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ returnedDate: new Date().toISOString(), returnStatus: "RETURNED", returnNotes: "Item returned to store" })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || `Failed to mark as returned: ${response.status}`);
      }

      const updated = await response.json();

      setOutgoingRecords(prev => prev.map(r => (String(r.id) === String(recordId) ? { ...r, returnedDate: updated.returnedDate || new Date().toISOString(), returnStatus: "RETURNED" } : r)));
      setIssuedRequests(prev => prev.map(r => (String(r.id) === String(recordId) ? { ...r, returnedDate: updated.returnedDate || new Date().toISOString(), returnStatus: "RETURNED" } : r)));
    } catch (err) {
      console.error("Error marking as returned:", err);
      setError(err.message || "Error marking record as returned");
    }
  };

  // mark as not returned
  const markAsNotReturned = async (recordId) => {
    try {
      const token = defaultGetAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/outgoing/${recordId}/not-returned`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ returnStatus: "NOT_RETURNED", returnNotes: "Item not returned - follow up required" })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || `Failed to mark as not returned: ${response.status}`);
      }

      const updated = await response.json();

      setOutgoingRecords(prev => prev.map(r => (String(r.id) === String(recordId) ? { ...r, returnStatus: "NOT_RETURNED" } : r)));
      setIssuedRequests(prev => prev.map(r => (String(r.id) === String(recordId) ? { ...r, returnStatus: "NOT_RETURNED" } : r)));
    } catch (err) {
      console.error("Error marking as not returned:", err);
      setError(err.message || "Error marking record as not returned");
    }
  };

  // CSV export
  const exportToCSV = () => {
    const recordsToExport = filteredRecords;
    if (!recordsToExport || recordsToExport.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Record ID","Type","Store Type","Item Name","Code","Quantity","Requester","Department","Location","Issue Date","Status","Returnable","Return Status","Expected Return Date","Actual Return Date","Project","Notes"
    ];

    const rows = recordsToExport.map(record => [
      record.code || record.id,
      record.displayType || record.type,
      record.store_type || "regular",
      record.name || "",
      record.code || "",
      record.quantity || record.quantityMoved || 0,
      record.requester || record.userName || "",
      record.department || "",
      record.location || "",
      formatDate(record.date),
      record.status || "",
      record.returnableAfterUse ? "Yes" : "No",
      record.returnStatus ? record.returnStatus : "N/A",
      record.expectedReturnDate ? formatDateOnly(record.expectedReturnDate) : "N/A",
      record.returnedDate ? formatDateOnly(record.returnedDate) : "N/A",
      record.projectName || "",
      (record.notes || "").replace(/\n/g, " ")
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outgoing-records-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // derived counts
  const totalItems = useMemo(() => outgoingRecords.length + issuedRequests.length, [outgoingRecords, issuedRequests]);
  const combined = useMemo(() => [...outgoingRecords, ...issuedRequests], [outgoingRecords, issuedRequests]);
  const returnableItems = useMemo(() => combined.filter(r => r.returnableAfterUse).length, [combined]);
  const returnedItems = useMemo(() => combined.filter(r => (r.returnStatus || "").toUpperCase() === "RETURNED").length, [combined]);
  const overdueItems = useMemo(() => combined.filter(r => (r.returnStatus || "").toUpperCase() === "OVERDUE").length, [combined]);
  const notReturnedItems = useMemo(() => combined.filter(r => (r.returnStatus || "").toUpperCase() === "NOT_RETURNED").length, [combined]);
  const regularStoreItems = useMemo(() => combined.filter(r => r.store_type === STORE_TYPES.REGULAR).length, [combined]);
  const ppeStoreItems = useMemo(() => combined.filter(r => r.store_type === STORE_TYPES.PPE).length, [combined]);
  const kitchenStoreItems = useMemo(() => combined.filter(r => r.store_type === STORE_TYPES.KITCHEN).length, [combined]);
  const returnableStoreItems = useMemo(() => combined.filter(r => r.store_type === STORE_TYPES.RETURNABLE).length, [combined]);

  // grouped, for table sections
  const groupedByStore = {
    [STORE_TYPES.REGULAR]: filteredRecords.filter(r => r.store_type === STORE_TYPES.REGULAR),
    [STORE_TYPES.PPE]: filteredRecords.filter(r => r.store_type === STORE_TYPES.PPE),
    [STORE_TYPES.KITCHEN]: filteredRecords.filter(r => r.store_type === STORE_TYPES.KITCHEN),
    [STORE_TYPES.RETURNABLE]: filteredRecords.filter(r => r.store_type === STORE_TYPES.RETURNABLE)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && combined.length === 0) {
    return (
      <div className="mx-auto mt-10 w-96 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-600">Error</h2>
          <p className="text-red-600">{error}</p>
          <button onClick={() => fetchOutgoingRecords()} className="px-4 py-2 mt-4 text-white bg-blue-600 rounded">Retry</button>
        </div>
      </div>
    );
  }

  // render store section helper
  const renderStoreSection = (storeTypeKey, records, Icon, colorClass) => {
    if (!records || records.length === 0) return null;

    const returnedInSection = records.filter(r => (r.returnStatus || "").toUpperCase() === "RETURNED").length;
    const pendingInSection = records.filter(r => (r.returnStatus || "").toUpperCase() === "PENDING").length;
    const overdueInSection = records.filter(r => (r.returnStatus || "").toUpperCase() === "OVERDUE").length;
    const notReturnedInSection = records.filter(r => (r.returnStatus || "").toUpperCase() === "NOT_RETURNED").length;

    const storeLabel = storeTypeKey === STORE_TYPES.KITCHEN ? "Kitchen Store" :
      storeTypeKey === STORE_TYPES.PPE ? "PPE Store" :
      storeTypeKey === STORE_TYPES.RETURNABLE ? "Returnable Items" : "Regular Store";

    return (
      <div key={storeTypeKey} className="mb-8">
        <div className="flex items-center justify-between p-4 mb-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{storeLabel}</h3>
              <p className="text-sm text-gray-600">{records.length} items</p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-green-600">{returnedInSection}</div>
              <div className="text-gray-500">Returned</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-600">{pendingInSection}</div>
              <div className="text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-orange-600">{overdueInSection}</div>
              <div className="text-gray-500">Overdue</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{notReturnedInSection}</div>
              <div className="text-gray-500">Not Returned</div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max table-auto">
              <thead>
                <tr>
                  {[
                    "Type","Record #","Item/Request","Description","Quantity","Requester","Location","Issue Date","Status","Return Status","Actions"
                  ].map(h => (
                    <th key={h} className="p-4 text-left bg-gray-50 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-700">{h}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={String(record.id)} className="transition-colors hover:bg-gray-50/50">
                    <td className="p-4 border-b">
                      <div className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border
                        " >
                        <record.icon className="h-3 w-3" />
                        <span>{record.displayType || record.type}</span>
                      </div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="text-sm font-mono text-gray-900">{record.code || `ID:${record.id}`}</div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{record.name}</div>
                        <div className="mt-1 text-xs text-gray-500">ID: {record.productId || "N/A"}</div>
                      </div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="text-sm text-gray-700 max-w-xs truncate">{record.description || "No description"}</div>
                    </td>

                    <td className="p-4 border-b">
                      <div className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                        (record.quantity || 0) > 10 ? "bg-green-100 text-green-800" :
                        (record.quantity || 0) > 5 ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {record.quantity || record.quantityMoved || 0} {record.type === "request" ? "items" : "units"}
                      </div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{record.requester || "Unknown"}</span>
                      </div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{record.location || "Location not specified"}</span>
                      </div>
                    </td>

                    <td className="p-4 border-b">
                      <div className="text-sm text-gray-700">{formatDate(record.date)}</div>
                    </td>

                    <td className="p-4 border-b">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${(() => {
                        const s = (record.status || "").toLowerCase();
                        if (s === "transferred") return "bg-blue-100 text-blue-800 border border-blue-200";
                        if (s === "issued") return "bg-green-100 text-green-800 border border-green-200";
                        if (s === "requested") return "bg-yellow-100 text-yellow-800 border border-yellow-200";
                        return "bg-gray-100 text-gray-800 border border-gray-200";
                      })()}`}>
                        {record.status}
                      </span>
                    </td>

                    <td className="p-4 border-b">
                      {record.returnableAfterUse ? (
                        <div className="flex flex-col gap-2">
                          {getReturnStatusBadge(record)}
                          <div className="flex gap-1">
                            <button title="Mark as Returned" onClick={() => markAsReturned(record.id)} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 inline-flex items-center gap-1">
                              <DocumentCheckIcon className="h-3 w-3" />Returned
                            </button>
                            <button title="Mark as Not Returned" onClick={() => markAsNotReturned(record.id)} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 inline-flex items-center gap-1">
                              <XMarkIcon className="h-3 w-3" />Not Returned
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Non-returnable</span>
                      )}
                    </td>

                    <td className="p-4 border-b">
                      <button onClick={() => openViewModal(record)} className="px-3 py-1 text-sm text-blue-600 rounded border border-blue-200 hover:bg-blue-50 inline-flex items-center gap-1">
                        <MagnifyingGlassIcon className="h-3 w-3" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <SidebarWithBurgerMenu onToggle={() => {}} />
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeftIcon className="h-5 w-5" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Outgoing Management</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">Welcome, Admin</div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
              <UserCircleIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-16 p-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Total Records</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{totalItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Returnable Items</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{returnableItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100">
                <ArchiveBoxIcon className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Returned</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{returnedItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                <DocumentCheckIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Overdue / Not Returned</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{overdueItems + notReturnedItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Regular Store</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{regularStoreItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">PPE Store</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{ppeStoreItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Kitchen Store</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{kitchenStoreItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100">
                <HomeIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Returnable Items</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{returnableStoreItems}</div>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-100">
                <ArchiveBoxIcon className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 bg-white border rounded-lg shadow-sm">
          <div className="flex border-b">
            <button onClick={() => setActiveTab("all")} className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition ${
              activeTab === "all" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
              All Records ({totalItems})
            </button>

            <button onClick={() => setActiveTab("regular")} className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition ${activeTab === "regular" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <CubeIcon className="w-5 h-5 inline mr-2 text-blue-500" />
              Regular ({regularStoreItems})
            </button>

            <button onClick={() => setActiveTab("ppe")} className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition ${activeTab === "ppe" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <ShieldCheckIcon className="w-5 h-5 inline mr-2 text-purple-500" />
              PPE ({ppeStoreItems})
            </button>

            <button onClick={() => setActiveTab("kitchen")} className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition ${activeTab === "kitchen" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <HomeIcon className="w-5 h-5 inline mr-2 text-orange-500" />
              Kitchen ({kitchenStoreItems})
            </button>

            <button onClick={() => setActiveTab("returnable")} className={`flex-1 py-4 px-6 font-semibold text-center border-b-2 transition ${activeTab === "returnable" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <ArchiveBoxIcon className="w-5 h-5 inline mr-2 text-teal-500" />
              Returnable ({returnableStoreItems})
            </button>
          </div>
        </div>

        <div className="p-6 mb-6 bg-white border rounded-lg shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium text-gray-700">Search Records</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                </div>
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, code, description, requester, or location..." className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="w-full lg:w-48">
              <label className="block mb-2 text-sm font-medium text-gray-700"><CalendarIcon className="w-4 h-4 inline mr-1" />Date</label>
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="w-full lg:w-48">
              <label className="block mb-2 text-sm font-medium text-gray-700"><MapPinIcon className="w-4 h-4 inline mr-1" />Location</label>
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>{String(loc).replace("_", " ")}</option>)}
              </select>
            </div>

            <div className="w-full lg:w-48">
              <label className="block mb-2 text-sm font-medium text-gray-700">Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="all">All Types</option>
                <option value="transfer">Transfers</option>
                <option value="request">Requests</option>
              </select>
            </div>

            <div className="w-full lg:w-48">
              <label className="block mb-2 text-sm font-medium text-gray-700">Store Type</label>
              <select value={storeTypeFilter} onChange={(e) => setStoreTypeFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                {storeTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="w-full lg:w-48">
              <label className="block mb-2 text-sm font-medium text-gray-700"><ArchiveBoxIcon className="w-4 h-4 inline mr-1" />Return Status</label>
              <select value={returnStatusFilter} onChange={(e) => setReturnStatusFilter(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
                {returnStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={clearFilters} className="px-4 py-3 border rounded-lg">Clear Filters</button>
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-3 text-green-700 border border-green-600 rounded-lg hover:bg-green-50">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* sections: render grouped store sections */}
        <div>
          {renderStoreSection(STORE_TYPES.REGULAR, groupedByStore[STORE_TYPES.REGULAR], CubeIcon, "bg-blue-100")}
          {renderStoreSection(STORE_TYPES.PPE, groupedByStore[STORE_TYPES.PPE], ShieldCheckIcon, "bg-purple-100")}
          {renderStoreSection(STORE_TYPES.KITCHEN, groupedByStore[STORE_TYPES.KITCHEN], HomeIcon, "bg-orange-100")}
          {renderStoreSection(STORE_TYPES.RETURNABLE, groupedByStore[STORE_TYPES.RETURNABLE], ArchiveBoxIcon, "bg-teal-100")}
        </div>
      </div>

      {/* modal */}
      <ViewDetailModal
        record={selectedRecord}
        isOpen={isViewModalOpen}
        onClose={closeViewModal}
        navigate={navigate}
        markAsReturned={markAsReturned}
        markAsNotReturned={markAsNotReturned}
      />
    </div>
  );
}


