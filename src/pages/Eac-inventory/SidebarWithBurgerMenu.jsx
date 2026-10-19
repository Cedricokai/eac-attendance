import React from "react";
import {
  PresentationChartBarIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  InboxIcon,
  PowerIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CubeTransparentIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  HomeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CogIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserRole } from '../../utils/auth';

export function SidebarWithBurgerMenu({ onToggle }) {
  const [open, setOpen] = React.useState(0);
  const [openAlert, setOpenAlert] = React.useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleOpen = (value) => {
    setOpen(open === value ? 0 : value);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    onToggle(true);
  };
  
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    onToggle(false);
  };

  const handleNavigation = (path) => {
    navigate(path);
    closeDrawer();
  };

  const handleLogout = () => {
    // Clear all auth tokens
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    sessionStorage.clear();
    
    // Navigate to login
    navigate("/");
    closeDrawer();
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      // Navigate to products page with search query
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      closeDrawer();
    }
  };

  const isActiveRoute = (path) => {
    return location.pathname.startsWith(path);
  };

  // Get user role from localStorage (if exists)
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("userData") || "{}");
  } catch {
    user = {};
  }

  const storedRole = String(
    getUserRole() || user?.role?.name || user?.role || ""
  ).trim().toUpperCase().replace(/^ROLE_/, "");

  const userRole = {
    ADMIN: "admin",
    PROCUREMENT_OFFICER: "procurementmanager",
    PROCUREMENT_MANAGER: "procurementmanager",
    INVENTORY: "storekeeper",
    STOREKEEPER: "storekeeper",
    STORE_OFFICER: "storeofficer",
    PLANNER: "planner",
    EMPLOYEE: "employee"
  }[storedRole] || storedRole.toLowerCase();
  const roleLabel = {
    admin: "Administrator",
    procurementmanager: "Procurement",
    procurement_officer: "Procurement",
    role_procurement_officer: "Procurement",
    storekeeper: "Storekeeper",
    storeofficer: "Store Officer",
    planner: "Planner",
    employee: "Employee"
  }[userRole] || (userRole ? userRole.replace(/^role_/, "").replaceAll("_", " ") : "");
  
  // Determine if user has inventory access
  const hasInventoryAccess = userRole === "storekeeper" || 
                           userRole === "planner" || 
                           userRole === "procurementmanager" ||
                           userRole === "storeofficer" ||
                           userRole === "employee" ||
                           userRole === "admin";

  return (
    <>
      <button 
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={openDrawer}
      >
        {isDrawerOpen ? (
          <XMarkIcon className="h-8 w-8 stroke-2 text-gray-700" />
        ) : (
          <Bars3Icon className="h-8 w-8 stroke-2 text-gray-700" />
        )}
      </button>
      
      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[9999] flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          
          {/* Sidebar */}
          <div className="relative h-full w-80 bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div 
                className="mb-2 flex items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleNavigation("/centralizedDashboard")}
              >
                <img
                  src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
                  alt="brand"
                  className="h-8 w-8"
                />
                <div>
                  <h5 className="text-xl font-semibold text-gray-900">
                    Inventory System
                  </h5>
                  <p className="text-xs text-gray-500">
                    {roleLabel ? `Role: ${roleLabel}` : 'Not logged in'}
                  </p>
                </div>
              </div>
              
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search Inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-1">
                  {/* Dashboard */}
                  <li>
                    <button 
                      onClick={() => handleNavigation("/centralizedDashboard")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActiveRoute("/centralizedDashboard") 
                          ? "bg-blue-100 text-blue-700" 
                          : "hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                      }`}
                    >
                      <PresentationChartBarIcon className="h-5 w-5" />
                      <span className="font-medium">Central Dashboard</span>
                    </button>
                  </li>

                  {/* Inventory Accordion */}
                  {hasInventoryAccess && (
                    <li>
                      <button 
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isActiveRoute("/InventoryDashboard") || 
                          isActiveRoute("/products") ||
                          isActiveRoute("/search") ||
                          isActiveRoute("/received") ||
                          isActiveRoute("/outgoing") ||
                          isActiveRoute("/ppe") ||
                          isActiveRoute("/ReportsDashboard") ||
                          isActiveRoute("/CostCenterManagement") ||
                          isActiveRoute("/history")
                            ? "bg-blue-100 text-blue-700" 
                            : "hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                        }`}
                        onClick={() => handleOpen(1)}
                      >
                        <div className="flex items-center gap-3">
                          <ShoppingBagIcon className="h-5 w-5" />
                          <span className="font-medium">Inventory</span>
                        </div>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${
                            open === 1 ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      
                      {open === 1 && (
                        <ul className="ml-8 mt-2 space-y-1 border-l border-gray-200 pl-4">
                          <li>
                            <button 
                              onClick={() => handleNavigation("/InventoryDashboard")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/InventoryDashboard") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <ChartBarIcon className="h-3 w-3" />
                              <span>Dashboard</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/products")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/products") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <ShoppingCartIcon className="h-3 w-3" />
                              <span>All Products</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/received?tab=transfer")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/received") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <DocumentArrowDownIcon className="h-3 w-3" />
                              <span>Receive / Transfer Stock</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/outgoing")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/outgoing") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <DocumentArrowUpIcon className="h-3 w-3" />
                              <span>Outgoing Items</span>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleNavigation("/ppe")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/ppe")
                                  ? "bg-blue-50 text-blue-700"
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <ShieldCheckIcon className="h-3 w-3" />
                              <span>PPE Inventory</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/search")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/search") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <MagnifyingGlassIcon className="h-3 w-3" />
                              <span>Search</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/ReportsDashboard")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/ReportsDashboard") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <ChartBarIcon className="h-3 w-3" />
                              <span>Reports</span>
                            </button>
                          </li>
                          <li>
                            <button 
                              onClick={() => handleNavigation("/history")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/history") 
                                  ? "bg-blue-50 text-blue-700" 
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <ClockIcon className="h-3 w-3" />
                              <span>Product History</span>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleNavigation("/CostCenterManagement")}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                isActiveRoute("/CostCenterManagement")
                                  ? "bg-blue-50 text-blue-700"
                                  : "hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                              }`}
                            >
                              <BuildingLibraryIcon className="h-3 w-3" />
                              <span>Cost Centers</span>
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  )}

                  {["admin", "accountant", "accounts", "finance"].includes(userRole.replace(/^role_/, "")) && <li><button onClick={() => handleNavigation("/accountsFundingReview")} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-green-50"><ClipboardDocumentCheckIcon className="h-5 w-5" /><span>Accounts Funding Review</span></button></li>}
                  {/* Transactions/Requests Accordion */}
                  {(userRole === "employee" || userRole === "planner" || userRole === "procurementmanager" || userRole === "storekeeper" || userRole === "storeofficer" || userRole === "admin") && (
                    <li>
                      <button 
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isActiveRoute("/InventoryRequest") ||
                          (isActiveRoute("/received") && location.search.includes("tab=requests")) ||
                          isActiveRoute("/plannerProductsReview") ||
                          isActiveRoute("/procurementManagerReview") ||
                          isActiveRoute("/procurementPurchases") ||
                          isActiveRoute("/DirectPurchase") ||
                          isActiveRoute("/StoreOfficerApproval")
                            ? "bg-green-100 text-green-700" 
                            : "hover:bg-green-50 text-gray-700 hover:text-green-700"
                        }`}
                        onClick={() => handleOpen(2)}
                      >
                        <div className="flex items-center gap-3">
                          <ClipboardDocumentCheckIcon className="h-5 w-5" />
                          <span className="font-medium">Requests & Approvals</span>
                        </div>
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${
                            open === 2 ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      
                      {open === 2 && (
                        <ul className="ml-8 mt-2 space-y-1 border-l border-gray-200 pl-4">
                          {/* Employee routes */}
                          {userRole === "employee" && (
                            <>
                              <li>
                                <button 
                                  onClick={() => handleNavigation("/InventoryRequest")}
                                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                    isActiveRoute("/InventoryRequest") 
                                      ? "bg-green-50 text-green-700" 
                                      : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                  }`}
                                >
                                  <DocumentTextIcon className="h-3 w-3" />
                                  <span>Submit Inventory Request</span>
                                </button>
                              </li>
                            </>
                          )}

                          {/* Storekeeper routes */}
                          {(userRole === "storekeeper" || userRole === "storeofficer") && (
                            <li>
                              <button 
                                onClick={() => handleNavigation("/received?tab=requests")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/received") && location.search.includes("tab=requests")
                                    ? "bg-green-50 text-green-700" 
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <ClipboardDocumentCheckIcon className="h-3 w-3" />
                                <span>Manage Approved Requests</span>
                              </button>
                            </li>
                          )}

                          {/* Planner routes */}
                          {userRole === "planner" && (
                            <li>
                              <button 
                                onClick={() => handleNavigation("/plannerProductsReview")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/plannerProductsReview") 
                                    ? "bg-green-50 text-green-700" 
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <DocumentCheckIcon className="h-3 w-3" />
                              <span>Review Inventory Requests</span>
                              </button>
                            </li>
                          )}

                          {/* Procurement Manager routes */}
                          {(userRole === "procurementmanager" || userRole === "admin") && (
                            <>
                            <li>
                              <button 
                                onClick={() => handleNavigation("/procurementManagerReview")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/procurementManagerReview") 
                                    ? "bg-green-50 text-green-700" 
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <DocumentCheckIcon className="h-3 w-3" />
                                <span>Approval Queue</span>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleNavigation("/procurementPurchases")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/procurementPurchases")
                                    ? "bg-green-50 text-green-700"
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <ShoppingCartIcon className="h-3 w-3" />
                                <span>Procurement Purchases</span>
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleNavigation("/DirectPurchase")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/DirectPurchase")
                                    ? "bg-green-50 text-green-700"
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <ShoppingBagIcon className="h-3 w-3" />
                                <span>Direct Purchases</span>
                              </button>
                            </li>
                            </>
                          )}

                          {/* Store Officer routes */}
                          {userRole === "storeofficer" && (
                            <li>
                              <button 
                                onClick={() => handleNavigation("/StoreOfficerApproval")}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-sm ${
                                  isActiveRoute("/StoreOfficerApproval") 
                                    ? "bg-green-50 text-green-700" 
                                    : "hover:bg-green-50 text-gray-600 hover:text-green-700"
                                }`}
                              >
                                <ClipboardDocumentCheckIcon className="h-3 w-3" />
                                <span>Approve & Issue</span>
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  )}

                  <hr className="my-4 border-gray-200" />
                  
                  {/* User Profile & Settings */}
                  <li>
                    <button 
                      onClick={() => handleNavigation(`/profile/${user?.id || 'me'}`)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActiveRoute("/profile") 
                          ? "bg-blue-100 text-blue-700" 
                          : "hover:bg-blue-50 text-gray-700 hover:text-blue-700"
                      }`}
                    >
                      <UserCircleIcon className="h-5 w-5" />
                      <span className="font-medium">My Profile</span>
                    </button>
                  </li>
                  
                  <li>
                    <button 
                      onClick={() => handleNavigation("/settingspage")}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActiveRoute("/settingspage") 
                          ? "bg-gray-100 text-gray-700" 
                          : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                      <span className="font-medium">Settings</span>
                    </button>
                  </li>
                  
                  {/* Log Out */}
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors"
                    >
                      <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                      <span className="font-medium">Log Out</span>
                    </button>
                  </li>
                </ul>
              </nav>

              {/* Alert Footer */}
              {openAlert && (
                <div className="mt-auto p-4 border-t border-gray-200">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h6 className="text-sm font-semibold text-blue-900">
                        Quick Access
                      </h6>
                      <button 
                        onClick={() => setOpenAlert(false)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {userRole === "employee" && (
                        <button 
                          onClick={() => handleNavigation("/InventoryRequest")}
                          className="w-full text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <PlusIcon className="h-3 w-3" />
                          Request New Item
                        </button>
                      )}
                      {(userRole === "storekeeper" || userRole === "admin") && (
                        <button 
                          onClick={() => handleNavigation("/products")}
                          className="w-full text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <ShoppingCartIcon className="h-3 w-3" />
                          View All Products
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Additional icons needed
function ShieldCheckIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function DocumentCheckIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
    </svg>
  );
}

function PlusIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
