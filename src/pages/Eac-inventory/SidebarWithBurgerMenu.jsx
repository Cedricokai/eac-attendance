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
} from "@heroicons/react/24/outline";

export function SidebarWithBurgerMenu({ onToggle }) {
  const [open, setOpen] = React.useState(0);
  const [openAlert, setOpenAlert] = React.useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

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
              <div className="mb-2 flex items-center gap-4 p-4 border-b border-gray-200">
                <img
                  src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
                  alt="brand"
                  className="h-8 w-8"
                />
                <h5 className="text-xl font-semibold text-gray-900">
                  Inventory System
                </h5>
              </div>
              
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search Inventory"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-4">
                <ul className="space-y-2">
                  {/* Dashboard */}
                  <li>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors">
                      <PresentationChartBarIcon className="h-5 w-5" />
                      <span className="font-medium">Dashboard</span>
                    </button>
                  </li>

                  {/* Inventory Accordion */}
                  <li>
                    <button 
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
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
                          <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm">
                            <ChevronRightIcon className="h-3 w-3" />
                            Products
                          </button>
                        </li>
                        <li>
                          <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm">
                            <ChevronRightIcon className="h-3 w-3" />
                            Categories
                          </button>
                        </li>
                        <li>
                          <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm">
                            <ChevronRightIcon className="h-3 w-3" />
                            Suppliers
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>

                  {/* Transactions Accordion */}
                  <li>
                    <button 
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                      onClick={() => handleOpen(2)}
                    >
                      <div className="flex items-center gap-3">
                        <CubeTransparentIcon className="h-5 w-5" />
                        <span className="font-medium">Transactions</span>
                      </div>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${
                          open === 2 ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    
                    {open === 2 && (
                      <ul className="ml-8 mt-2 space-y-1 border-l border-gray-200 pl-4">
                        <li>
                          <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm">
                            <ChevronRightIcon className="h-3 w-3" />
                            Incoming
                          </button>
                        </li>
                        <li>
                          <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors text-sm">
                            <ChevronRightIcon className="h-3 w-3" />
                            Outgoing
                          </button>
                        </li>
                      </ul>
                    )}
                  </li>

                  <hr className="my-4 border-gray-200" />
                  
                  {/* Additional Menu Items */}
                  <li>
                    <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <InboxIcon className="h-5 w-5" />
                        <span className="font-medium">Notifications</span>
                      </div>
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                        3
                      </span>
                    </button>
                  </li>
                  
                  <li>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors">
                      <UserCircleIcon className="h-5 w-5" />
                      <span className="font-medium">Profile</span>
                    </button>
                  </li>
                  
                  <li>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors">
                      <Cog6ToothIcon className="h-5 w-5" />
                      <span className="font-medium">Settings</span>
                    </button>
                  </li>
                  
                  <li>
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-gray-700 hover:text-red-700 transition-colors">
                      <PowerIcon className="h-5 w-5" />
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
                        Inventory Tips
                      </h6>
                      <button 
                        onClick={() => setOpenAlert(false)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-blue-800 opacity-80">
                      Use the search feature to quickly find inventory items.
                    </p>
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