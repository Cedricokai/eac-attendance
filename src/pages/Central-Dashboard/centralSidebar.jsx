import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  ListItemSuffix,
  Chip,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Drawer,
  Card,
} from "@material-tailwind/react";
import {
  UsersIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  HomeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  XMarkIcon,
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  PowerIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

const CentralSidebar = ({
  activeDashboard,
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.98:8080';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("jwtToken");
        if (!token) {
          navigate("/");
          return;
        }

        const response = await fetch(`http://${API_BASE_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser({
            name: data.name || data.username,
            role: data.role ? data.role.replace("ROLE_", "").toLowerCase() : 'employee',
            email: data.email,
          });
        } else {
          console.error("Failed to fetch user, status:", response.status);
          if (response.status === 401) {
            handleLogout();
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate, API_BASE_URL]);

  const handleAccordion = (value) => {
    setOpenAccordion(openAccordion === value ? null : value);
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      await fetch(`http://${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");
      localStorage.removeItem("authToken");
      
      // Redirect to login
      navigate("/");
    }
  };

  const dashboards = [
    { 
      id: "attendance", 
      name: "Attendance", 
      icon: <UsersIcon className="h-5 w-5" />, 
      roles: ["admin", "hr", "supervisor"],
      path: "/attendance"
    },
    { 
      id: "hr", 
      name: "HR Management", 
      icon: <BriefcaseIcon className="h-5 w-5" />, 
      roles: ["admin", "hr"],
      path: "/hr",
      subItems: [
        { name: "Employees", path: "/employees", icon: <ChevronRightIcon className="h-3 w-5" /> },
        { name: "Departments", path: "/departments", icon: <ChevronRightIcon className="h-3 w-5" /> },
      ]
    },
    { 
      id: "payroll", 
      name: "Payroll", 
      icon: <CurrencyDollarIcon className="h-5 w-5" />, 
      roles: ["admin", "hr", "accountant"],
      path: "/payroll"
    },
    { 
      id: "inventory", 
      name: "Inventory", 
      icon: <CubeIcon className="h-5 w-5" />, 
      roles: ["admin", "inventory"],
      path: "/inventory"
    },
    { 
      id: "reports", 
      name: "Reports", 
      icon: <ChartBarIcon className="h-5 w-5" />, 
      roles: ["admin", "manager", "hr"],
      path: "/reports"
    },
    { 
      id: "userpage", 
      name: "User Management", 
      icon: <UserGroupIcon className="h-5 w-5" />, 
      roles: ["admin"],
      path: "/userpage"
    },
    { 
      id: "settings", 
      name: "Settings", 
      icon: <Cog6ToothIcon className="h-5 w-5" />, 
      roles: ["admin"],
      path: "/settings"
    },
     { 
      id: "JobsManagement", 
      name: "JobsManagement", 
      icon: <Cog6ToothIcon className="h-5 w-5" />, 
      roles: ["admin"],
      path: "/JobsManagement"
    },
  ];

  // Filter dashboards based on user role
  const filteredDashboards = dashboards.filter((dashboard) => {
    if (!user?.role) return false;
    return dashboard.roles.includes(user.role);
  });

  // Desktop Sidebar
  const renderDesktopSidebar = () => (
    <motion.div
      initial={{ width: sidebarOpen ? 240 : 80 }}
      animate={{ width: sidebarOpen ? 240 : 80 }}
      className={`hidden md:flex h-full bg-white shadow-xl fixed z-30 border-r border-gray-200`}
    >
      <Card className="h-full w-full rounded-none shadow-none bg-white">
        {/* Header */}
        <div className="mb-2 flex items-center gap-4 p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <>
              <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">EAC</span>
              </div>
              <Typography variant="h5" color="blue-gray" className="font-bold">
                Employee Portal
              </Typography>
            </>
          ) : (
            <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">E</span>
            </div>
          )}
          <IconButton
            variant="text"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            <ChevronRightIcon 
              className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} 
            />
          </IconButton>
        </div>

        {/* User Info */}
        {sidebarOpen && user && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 font-medium text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="small" className="font-medium text-gray-900 truncate">
                  {user.name}
                </Typography>
                <Typography variant="small" className="text-gray-500 capitalize">
                  {user.role}
                </Typography>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <List className="p-2">
            <Link to="/centralizedDashboard">
              <ListItem 
                className={`rounded-lg mb-1 ${
                  activeDashboard === 'main' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ListItemPrefix>
                  <HomeIcon className="h-5 w-5" />
                </ListItemPrefix>
                {sidebarOpen && "Dashboard"}
              </ListItem>
            </Link>

            {filteredDashboards.map((dashboard) => (
              dashboard.subItems ? (
                <Accordion
                  key={dashboard.id}
                  open={openAccordion === dashboard.id}
                  icon={
                    <ChevronDownIcon
                      className={`mx-auto h-4 w-4 transition-transform ${
                        openAccordion === dashboard.id ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem 
                    className={`p-0 rounded-lg mb-1 ${
                      activeDashboard === dashboard.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    <AccordionHeader
                      onClick={() => handleAccordion(dashboard.id)}
                      className="border-b-0 p-3 hover:bg-transparent"
                    >
                      <ListItemPrefix>
                        {dashboard.icon}
                      </ListItemPrefix>
                      {sidebarOpen && (
                        <Typography className="mr-auto font-normal">
                          {dashboard.name}
                        </Typography>
                      )}
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0">
                      {dashboard.subItems.map((item) => (
                        <Link to={item.path} key={item.name}>
                          <ListItem className="py-2 pl-8 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                            <ListItemPrefix>
                              {item.icon}
                            </ListItemPrefix>
                            {sidebarOpen && item.name}
                          </ListItem>
                        </Link>
                      ))}
                    </List>
                  </AccordionBody>
                </Accordion>
              ) : (
                <Link to={dashboard.path} key={dashboard.id}>
                  <ListItem 
                    className={`rounded-lg mb-1 ${
                      activeDashboard === dashboard.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ListItemPrefix>
                      {dashboard.icon}
                    </ListItemPrefix>
                    {sidebarOpen && dashboard.name}
                  </ListItem>
                </Link>
              )
            ))}

            <hr className="my-3 border-gray-200" />
            
            {/* Additional Menu Items */}
            {sidebarOpen && (
              <>
                <ListItem className="rounded-lg text-gray-700 hover:bg-gray-50">
                  <ListItemPrefix>
                    <BellIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Notifications
                  <ListItemSuffix>
                    <Chip value="14" size="sm" variant="ghost" color="blue-gray" />
                  </ListItemSuffix>
                </ListItem>
                
                <ListItem className="rounded-lg text-gray-700 hover:bg-gray-50">
                  <ListItemPrefix>
                    <UserCircleIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Profile
                </ListItem>
              </>
            )}
            
            <ListItem 
              className="rounded-lg text-gray-700 hover:bg-gray-50"
              onClick={() => navigate('/settings')}
            >
              <ListItemPrefix>
                <Cog6ToothIcon className="h-5 w-5" />
              </ListItemPrefix>
              {sidebarOpen && "Settings"}
            </ListItem>

            {/* Logout Button */}
            <ListItem 
              onClick={handleLogout}
              className="rounded-lg text-red-600 hover:bg-red-50 mt-2"
            >
              <ListItemPrefix>
                <PowerIcon className="h-5 w-5" />
              </ListItemPrefix>
              {sidebarOpen && "Log Out"}
            </ListItem>
          </List>
        </div>
      </Card>
    </motion.div>
  );

  // Mobile Drawer
  const renderMobileDrawer = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          <Drawer
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            className="md:hidden"
          >
            <Card className="h-[calc(100vh-2rem)] w-full p-4 bg-white">
              {/* Mobile Header */}
              <div className="mb-2 flex items-center gap-4 p-4 border-b border-gray-200">
                <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">EAC</span>
                </div>
                <Typography variant="h5" color="blue-gray" className="font-bold">
                  Employee Portal
                </Typography>
                <IconButton
                  variant="text"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-auto"
                >
                  <XMarkIcon className="h-5 w-5" />
                </IconButton>
              </div>

              {/* Mobile User Info */}
              {user && (
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <Typography variant="small" className="font-medium text-gray-900">
                        {user.name}
                      </Typography>
                      <Typography variant="small" className="text-gray-500 capitalize">
                        {user.role}
                      </Typography>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Navigation */}
              <div className="flex-1 overflow-y-auto">
                <List className="p-2">
                  <Link to="/centralizedDashboard" onClick={() => setMobileMenuOpen(false)}>
                    <ListItem 
                      className={`rounded-lg mb-1 ${
                        activeDashboard === 'main' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ListItemPrefix>
                        <HomeIcon className="h-5 w-5" />
                      </ListItemPrefix>
                      Dashboard
                    </ListItem>
                  </Link>

                  {filteredDashboards.map((dashboard) => (
                    dashboard.subItems ? (
                      <Accordion
                        key={dashboard.id}
                        open={openAccordion === dashboard.id}
                        icon={
                          <ChevronDownIcon
                            className={`mx-auto h-4 w-4 transition-transform ${
                              openAccordion === dashboard.id ? "rotate-180" : ""
                            }`}
                          />
                        }
                      >
                        <ListItem 
                          className={`p-0 rounded-lg mb-1 ${
                            activeDashboard === dashboard.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                          }`}
                        >
                          <AccordionHeader
                            onClick={() => handleAccordion(dashboard.id)}
                            className="border-b-0 p-3 hover:bg-transparent"
                          >
                            <ListItemPrefix>
                              {dashboard.icon}
                            </ListItemPrefix>
                            <Typography className="mr-auto font-normal">
                              {dashboard.name}
                            </Typography>
                          </AccordionHeader>
                        </ListItem>
                        <AccordionBody className="py-1">
                          <List className="p-0">
                            {dashboard.subItems.map((item) => (
                              <Link 
                                to={item.path} 
                                key={item.name}
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                <ListItem className="py-2 pl-8 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                                  <ListItemPrefix>
                                    {item.icon}
                                  </ListItemPrefix>
                                  {item.name}
                                </ListItem>
                              </Link>
                            ))}
                          </List>
                        </AccordionBody>
                      </Accordion>
                    ) : (
                      <Link 
                        to={dashboard.path} 
                        key={dashboard.id}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ListItem 
                          className={`rounded-lg mb-1 ${
                            activeDashboard === dashboard.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <ListItemPrefix>
                            {dashboard.icon}
                          </ListItemPrefix>
                          {dashboard.name}
                        </ListItem>
                      </Link>
                    )
                  ))}

                  <hr className="my-3 border-gray-200" />
                  
                  {/* Additional Mobile Menu Items */}
                  <ListItem className="rounded-lg text-gray-700 hover:bg-gray-50">
                    <ListItemPrefix>
                      <BellIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    Notifications
                    <ListItemSuffix>
                      <Chip value="14" size="sm" variant="ghost" color="blue-gray" />
                    </ListItemSuffix>
                  </ListItem>
                  
                  <ListItem className="rounded-lg text-gray-700 hover:bg-gray-50">
                    <ListItemPrefix>
                      <UserCircleIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    Profile
                  </ListItem>
                  
                  <ListItem 
                    className="rounded-lg text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      navigate('/settings');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ListItemPrefix>
                      <Cog6ToothIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    Settings
                  </ListItem>

                  {/* Mobile Logout Button */}
                  <ListItem 
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg text-red-600 hover:bg-red-50 mt-2"
                  >
                    <ListItemPrefix>
                      <PowerIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    Log Out
                  </ListItem>
                </List>
              </div>
            </Card>
          </Drawer>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Burger Menu Button (Mobile) */}
      <IconButton
        variant="text"
        size="lg"
        onClick={() => setMobileMenuOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
      >
        <Bars3Icon className="h-6 w-6 stroke-2" />
      </IconButton>

      {renderDesktopSidebar()}
      {renderMobileDrawer()}
    </>
  );
};

export default CentralSidebar;