import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
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
  UserGroupIcon, // Added for User Page
} from "@heroicons/react/24/solid";

const CentralSidebar = ({
  activeDashboard,
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [user] = useState({
    name: "Demo User",
    role: "admin",
  });

  const handleAccordion = (value) => {
    setOpenAccordion(openAccordion === value ? null : value);
  };

  const logout = () => console.log("Logging out...");

  const dashboards = [
    { 
      id: "attendance", 
      name: "Attendance", 
      icon: <UsersIcon className="h-5 w-5" />, 
      roles: ["admin", "manager", "supervisor"] 
    },
    { 
      id: "hr", 
      name: "HR Management", 
      icon: <BriefcaseIcon className="h-5 w-5" />, 
      roles: ["admin", "hr"],
      subItems: [
        { name: "Employees", icon: <ChevronRightIcon className="h-3 w-5" /> },
        { name: "Departments", icon: <ChevronRightIcon className="h-3 w-5" /> },
      ]
    },
    { 
      id: "payroll", 
      name: "Payroll", 
      icon: <CurrencyDollarIcon className="h-5 w-5" />, 
      roles: ["admin", "accountant"] 
    },
    { 
      id: "inventory", 
      name: "Inventory", 
      icon: <CubeIcon className="h-5 w-5" />, 
      roles: ["admin", "inventory"] 
    },
    { 
      id: "reports", 
      name: "Reports", 
      icon: <ChartBarIcon className="h-5 w-5" />, 
      roles: ["admin", "manager"] 
    },
  ];

  const filteredDashboards = dashboards.filter((dashboard) =>
    dashboard.roles.includes(user?.role || "employee")
  );

  // Desktop Sidebar
  const renderDesktopSidebar = () => (
    <motion.div
      initial={{ width: sidebarOpen ? 240 : 80 }}
      animate={{ width: sidebarOpen ? 240 : 80 }}
      className={`hidden md:flex h-full bg-white shadow-xl fixed z-30`}
    >
      <Card className="h-full w-full rounded-none shadow-none">
        <div className="mb-2 flex items-center gap-4 p-4">
          {sidebarOpen ? (
            <>
              <img
                src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
                alt="brand"
                className="h-8 w-8"
              />
              <Typography variant="h5">Employee Portal</Typography>
            </>
          ) : (
            <div className="w-8 h-8 rounded-md bg-indigo-800 flex items-center justify-center mx-auto">
              <span className="text-white font-bold">E</span>
            </div>
          )}
          <IconButton
            variant="text"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            {sidebarOpen ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </IconButton>
        </div>

        <List>
          <Link to="/dashboard">
            <ListItem>
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
                <ListItem className="p-0" selected={openAccordion === dashboard.id}>
                  <AccordionHeader
                    onClick={() => handleAccordion(dashboard.id)}
                    className="border-b-0 p-3"
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
                      <ListItem key={item.name}>
                        <ListItemPrefix>
                          {item.icon}
                        </ListItemPrefix>
                        {item.name}
                      </ListItem>
                    ))}
                  </List>
                </AccordionBody>
              </Accordion>
            ) : (
              <Link to={`/${dashboard.id}`} key={dashboard.id}>
                <ListItem>
                  <ListItemPrefix>
                    {dashboard.icon}
                  </ListItemPrefix>
                  {dashboard.name}
                </ListItem>
              </Link>
            )
          ))}

          <hr className="my-2 border-blue-gray-50" />
          
          <ListItem>
            <ListItemPrefix>
              <BellIcon className="h-5 w-5" />
            </ListItemPrefix>
            Notifications
            <ListItemSuffix>
              <Chip value="14" size="sm" variant="ghost" color="blue-gray" />
            </ListItemSuffix>
          </ListItem>
          
          <ListItem>
            <ListItemPrefix>
              <UserCircleIcon className="h-5 w-5" />
            </ListItemPrefix>
            Profile
          </ListItem>
          
          <ListItem>
            <ListItemPrefix>
              <Cog6ToothIcon className="h-5 w-5" />
            </ListItemPrefix>
            Settings
          </ListItem>

          {/* New User Page Button */}
          <Link to="/Userpage">
            <ListItem>
              <ListItemPrefix>
                <UserGroupIcon className="h-5 w-5" />
              </ListItemPrefix>
              User Page
            </ListItem>
          </Link>
          
          <ListItem onClick={logout}>
            <ListItemPrefix>
              <PowerIcon className="h-5 w-5" />
            </ListItemPrefix>
            Log Out
          </ListItem>
        </List>
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
            <Card className="h-[calc(100vh-2rem)] w-full p-4">
              <div className="mb-2 flex items-center gap-4 p-4">
                <img
                  src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
                  alt="brand"
                  className="h-8 w-8"
                />
                <Typography variant="h5">Employee Portal</Typography>
                <IconButton
                  variant="text"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="ml-auto"
                >
                  <XMarkIcon className="h-5 w-5" />
                </IconButton>
              </div>

              <List>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <ListItem>
                    <ListItemPrefix>
                      <HomeIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    Dashboard
                  </ListItem>
                </Link>

                {filteredDashboards.map((dashboard) => (
                  <Link 
                    to={`/${dashboard.id}`} 
                    key={dashboard.id}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ListItem>
                      <ListItemPrefix>
                        {dashboard.icon}
                      </ListItemPrefix>
                      {dashboard.name}
                    </ListItem>
                  </Link>
                ))}

                <hr className="my-2 border-blue-gray-50" />
                
                <ListItem>
                  <ListItemPrefix>
                    <BellIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Notifications
                  <ListItemSuffix>
                    <Chip value="14" size="sm" variant="ghost" color="blue-gray" />
                  </ListItemSuffix>
                </ListItem>
                
                <ListItem>
                  <ListItemPrefix>
                    <UserCircleIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Profile
                </ListItem>
                
                <ListItem>
                  <ListItemPrefix>
                    <Cog6ToothIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Settings
                </ListItem>

                {/* New User Page Button for mobile */}
                <Link to="/Userpage" onClick={() => setMobileMenuOpen(false)}>
                  <ListItem>
                    <ListItemPrefix>
                      <UserGroupIcon className="h-5 w-5" />
                    </ListItemPrefix>
                    User Page
                  </ListItem>
                </Link>
                
                <ListItem onClick={logout}>
                  <ListItemPrefix>
                    <PowerIcon className="h-5 w-5" />
                  </ListItemPrefix>
                  Log Out
                </ListItem>
              </List>
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
        className="md:hidden fixed top-4 left-4 z-50"
      >
        <Bars3Icon className="h-8 w-8 stroke-2" />
      </IconButton>

      {renderDesktopSidebar()}
      {renderMobileDrawer()}
    </>
  );
};

export default CentralSidebar;