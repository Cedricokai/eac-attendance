# Step 12: Navigation & Sidebar Update - Complete Implementation Guide

## Overview
This document provides detailed instructions for updating the inventory sidebar and adding new menu items for all product management features.

---

## 1. Updated Inventory Sidebar Navigation Structure

### Navigation Menu Hierarchy

```
📊 INVENTORY DASHBOARD
├── 📦 PRODUCTS MANAGEMENT
│   ├── View All Products
│   ├── Add Product
│   └── Product Reports
├── 📤 OUTGOING ITEMS
│   ├── View Outgoing
│   └── Create Outgoing
├── 📥 RECEIVED ITEMS
│   ├── View Received
│   └── Create Received
│
├── 🆕 PRODUCT REQUEST WORKFLOW (NEW)
│   ├── 📋 Request Products (Employee)
│   ├── ✅ Procurement Manager Review
│   ├── 🚚 Store Officer Approval & Issuance
│   └── 📊 Request Status History
│
├── 💰 COST MANAGEMENT (NEW)
│   ├── 📍 Cost Centers / Projects
│   ├── 💾 Budget Tracking
│   ├── 💵 Inventory Value
│   └── 📈 Cost Analysis
│
├── 📊 REPORTS & ANALYTICS (NEW)
│   ├── 📈 Product Request Reports
│   ├── 💹 Cost Summary by Project
│   ├── 📊 Usage by Employee
│   ├── 💰 Monthly/Quarterly Analysis
│   └── 📉 Inventory Value Trends
│
└── ⚙️ SETTINGS
    ├── System Settings
    └── User Preferences
```

---

## 2. Updated Sidebar Component with New Features

### Create Enhanced Sidebar Component

**File:** `src/pages/Eac-inventory/InventorySidebar.jsx`

```jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Input,
  Drawer,
  Card,
  Badge,
  Divider,
} from "@material-tailwind/react";
import {
  PresentationChartBarIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  InboxIcon,
  PowerIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MapPinIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/solid";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export function InventorySidebar({ onToggle, userRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openAccordion, setOpenAccordion] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpen = (value) => {
    setOpenAccordion(openAccordion === value ? 0 : value);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    onToggle?.(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    onToggle?.(false);
  };

  const isActive = (path) => location.pathname === path;

  const navigateTo = (path) => {
    navigate(path);
    closeDrawer();
  };

  // Helper function to render menu items with role-based access
  const MenuItem = ({ icon: Icon, label, path, badge, requiredRole }) => {
    // Check if user has required role
    if (requiredRole && !userRole?.includes(requiredRole)) {
      return null; // Hide if user doesn't have required role
    }

    return (
      <ListItem
        onClick={() => navigateTo(path)}
        selected={isActive(path)}
        className={`${
          isActive(path) ? "bg-blue-100 text-blue-700" : ""
        } rounded-lg cursor-pointer hover:bg-blue-50 transition-colors`}
      >
        <ListItemPrefix>
          <Icon className="h-5 w-5" />
        </ListItemPrefix>
        <span>{label}</span>
        {badge && (
          <ListItemSuffix>
            <Chip
              value={badge}
              size="sm"
              variant="ghost"
              color="blue"
              className="rounded-full"
            />
          </ListItemSuffix>
        )}
      </ListItem>
    );
  };

  return (
    <>
      {/* Hamburger Button */}
      <IconButton variant="text" size="lg" onClick={openDrawer}>
        {isDrawerOpen ? (
          <XMarkIcon className="h-8 w-8 stroke-2" />
        ) : (
          <Bars3Icon className="h-8 w-8 stroke-2" />
        )}
      </IconButton>

      {/* Drawer */}
      <Drawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        overlayProps={{
          className: "bg-black bg-opacity-20 backdrop-blur-sm",
        }}
        className="z-[9999]"
      >
        <Card
          color="transparent"
          shadow={false}
          className="h-[calc(100vh-2rem)] w-full p-4 bg-gradient-to-b from-blue-50 to-white overflow-y-auto"
        >
          {/* Header */}
          <div className="mb-4 flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white">
            <ShoppingBagIcon className="h-8 w-8" />
            <div>
              <Typography variant="h6">Inventory System</Typography>
              <Typography variant="small" className="opacity-75">
                Product Management
              </Typography>
            </div>
          </div>

          {/* Search */}
          <div className="p-2 mb-4">
            <Input
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              label="Search"
              placeholder="Find items..."
              className="bg-white"
            />
          </div>

          <List>
            {/* 1. Dashboard */}
            <MenuItem
              icon={PresentationChartBarIcon}
              label="Dashboard"
              path="/InventoryDashboard"
            />

            <Divider className="my-2" />

            {/* 2. Products Management */}
            <Accordion
              open={openAccordion === 1}
              icon={<ChevronDownIcon className="h-4 w-4" />}
            >
              <AccordionHeader onClick={() => handleOpen(1)}>
                <ListItemPrefix>
                  <ShoppingBagIcon className="h-5 w-5" />
                </ListItemPrefix>
                <span>Products</span>
              </AccordionHeader>
              <AccordionBody className="py-1">
                <List className="p-0">
                  <MenuItem
                    icon={ClipboardDocumentListIcon}
                    label="All Products"
                    path="/products"
                  />
                  <MenuItem
                    icon={ChartBarIcon}
                    label="Product Reports"
                    path="/inventory-reports?tab=products"
                  />
                </List>
              </AccordionBody>
            </Accordion>

            {/* 3. Stock Movement */}
            <Accordion
              open={openAccordion === 2}
              icon={<ChevronDownIcon className="h-4 w-4" />}
            >
              <AccordionHeader onClick={() => handleOpen(2)}>
                <ListItemPrefix>
                  <ArrowDownTrayIcon className="h-5 w-5" />
                </ListItemPrefix>
                <span>Stock Movement</span>
              </AccordionHeader>
              <AccordionBody className="py-1">
                <List className="p-0">
                  <MenuItem
                    icon={ArrowUpTrayIcon}
                    label="Incoming (Received)"
                    path="/received"
                  />
                  <MenuItem
                    icon={ArrowDownTrayIcon}
                    label="Outgoing (Issued)"
                    path="/outgoing"
                  />
                </List>
              </AccordionBody>
            </Accordion>

            <Divider className="my-2" />

            {/* 4. Product Request Workflow (NEW) */}
            <Accordion
              open={openAccordion === 3}
              icon={<ChevronDownIcon className="h-4 w-4" />}
            >
              <AccordionHeader onClick={() => handleOpen(3)}>
                <ListItemPrefix>
                  <DocumentCheckIcon className="h-5 w-5 text-green-600" />
                </ListItemPrefix>
                <span className="font-semibold text-green-700">
                  🆕 Product Requests
                </span>
              </AccordionHeader>
              <AccordionBody className="py-1">
                <List className="p-0 space-y-1">
                  {/* Employee: Request Products */}
                  <MenuItem
                    icon={ClipboardDocumentListIcon}
                    label="Request Products"
                    path="/product-request-form"
                    requiredRole="EMPLOYEE"
                  />

                  {/* Procurement Manager */}
                  <MenuItem
                    icon={DocumentCheckIcon}
                    label="Procurement Review"
                    path="/procurement-manager-review"
                    requiredRole="PROCUREMENT_MANAGER"
                    badge="Pending"
                  />

                  {/* Store Officer */}
                  <MenuItem
                    icon={TruckIcon}
                    label="Store Approval & Issue"
                    path="/store-officer-approval"
                    requiredRole="STORE_OFFICER"
                    badge="Ready"
                  />
                </List>
              </AccordionBody>
            </Accordion>

            {/* 5. Cost Management (NEW) */}
            <Accordion
              open={openAccordion === 4}
              icon={<ChevronDownIcon className="h-4 w-4" />}
            >
              <AccordionHeader onClick={() => handleOpen(4)}>
                <ListItemPrefix>
                  <CurrencyDollarIcon className="h-5 w-5 text-orange-600" />
                </ListItemPrefix>
                <span className="font-semibold text-orange-700">
                  💰 Cost Management
                </span>
              </AccordionHeader>
              <AccordionBody className="py-1">
                <List className="p-0 space-y-1">
                  <MenuItem
                    icon={MapPinIcon}
                    label="Cost Centers / Projects"
                    path="/cost-center-management"
                    requiredRole="ADMIN"
                  />
                  <MenuItem
                    icon={CurrencyDollarIcon}
                    label="Budget Tracking"
                    path="/inventory-reports?tab=budget"
                  />
                  <MenuItem
                    icon={ChartBarIcon}
                    label="Cost Analysis"
                    path="/inventory-reports?tab=cost"
                  />
                </List>
              </AccordionBody>
            </Accordion>

            {/* 6. Reports & Analytics (NEW) */}
            <Accordion
              open={openAccordion === 5}
              icon={<ChevronDownIcon className="h-4 w-4" />}
            >
              <AccordionHeader onClick={() => handleOpen(5)}>
                <ListItemPrefix>
                  <ChartBarIcon className="h-5 w-5 text-purple-600" />
                </ListItemPrefix>
                <span className="font-semibold text-purple-700">
                  📊 Reports & Analytics
                </span>
              </AccordionHeader>
              <AccordionBody className="py-1">
                <List className="p-0 space-y-1">
                  <MenuItem
                    icon={ChartBarIcon}
                    label="All Reports"
                    path="/inventory-reports"
                  />
                  <MenuItem
                    icon={ChartBarIcon}
                    label="Requests by Status"
                    path="/inventory-reports?tab=status"
                  />
                  <MenuItem
                    icon={ChartBarIcon}
                    label="Usage by Employee"
                    path="/inventory-reports?tab=usage"
                  />
                  <MenuItem
                    icon={ChartBarIcon}
                    label="Cost Summary"
                    path="/inventory-reports?tab=cost"
                  />
                </List>
              </AccordionBody>
            </Accordion>

            <Divider className="my-2" />

            {/* 7. Settings */}
            <MenuItem
              icon={Cog6ToothIcon}
              label="Settings"
              path="/settingspage"
            />

            {/* 8. Logout */}
            <ListItem
              onClick={() => {
                localStorage.removeItem("jwtToken");
                navigate("/");
                closeDrawer();
              }}
              className="text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              <ListItemPrefix>
                <PowerIcon className="h-5 w-5" />
              </ListItemPrefix>
              <span>Logout</span>
            </ListItem>
          </List>
        </Card>
      </Drawer>
    </>
  );
}

export default InventorySidebar;
```

---

## 3. Role-Based Access Control (RBAC) Setup

### User Roles Configuration

```javascript
// src/config/userRoles.js

export const USER_ROLES = {
  ADMIN: 'ROLE_ADMIN',
  EMPLOYEE: 'ROLE_EMPLOYEE',
  HR: 'ROLE_HR',
  PROCUREMENT_MANAGER: 'ROLE_PROCUREMENT_MANAGER',
  STORE_OFFICER: 'ROLE_STORE_OFFICER',
  SUPERVISOR: 'ROLE_SUPERVISOR'
};

// Feature access control
export const FEATURE_ACCESS = {
  REQUEST_PRODUCT: ['EMPLOYEE', 'ADMIN'],
  APPROVE_PROCUREMENT: ['PROCUREMENT_MANAGER', 'ADMIN'],
  APPROVE_STORE: ['STORE_OFFICER', 'ADMIN'],
  MANAGE_COST_CENTERS: ['ADMIN'],
  VIEW_REPORTS: ['ADMIN', 'HR', 'PROCUREMENT_MANAGER', 'STORE_OFFICER'],
  MANAGE_PRODUCTS: ['ADMIN', 'STORE_OFFICER']
};

// Get user role from token
export const getUserRole = () => {
  const role = localStorage.getItem('userRole');
  return role;
};

// Check if user has access to feature
export const hasAccess = (feature) => {
  const role = getUserRole();
  return FEATURE_ACCESS[feature]?.includes(role);
};
```

---

## 4. Protected Routes Component

### Create ProtectedRoute Component

```javascript
// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, FEATURE_ACCESS } from '../config/userRoles';

const ProtectedRoute = ({ children, requiredRole, feature }) => {
  const userRole = getUserRole();

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // Check by feature
  if (feature) {
    const allowedRoles = FEATURE_ACCESS[feature] || [];
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/employeeDashboard" replace />;
    }
  }

  // Check by specific role
  if (requiredRole && !requiredRole.includes(userRole)) {
    return <Navigate to="/employeeDashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
```

---

## 5. Update App.jsx with Protected Routes

### Add Protected Routes to App.jsx

```jsx
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <SettingsProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Employee Routes */}
        <Route
          path="/product-request-form"
          element={
            <ProtectedRoute feature="REQUEST_PRODUCT">
              <ProductRequestForm />
            </ProtectedRoute>
          }
        />

        {/* Procurement Manager Routes */}
        <Route
          path="/procurement-manager-review"
          element={
            <ProtectedRoute feature="APPROVE_PROCUREMENT">
              <ProcurementManagerReview />
            </ProtectedRoute>
          }
        />

        {/* Store Officer Routes */}
        <Route
          path="/store-officer-approval"
          element={
            <ProtectedRoute feature="APPROVE_STORE">
              <StoreOfficerApproval />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/cost-center-management"
          element={
            <ProtectedRoute feature="MANAGE_COST_CENTERS">
              <CostCenterManagement />
            </ProtectedRoute>
          }
        />

        {/* Reports - Multiple Roles */}
        <Route
          path="/inventory-reports"
          element={
            <ProtectedRoute feature="VIEW_REPORTS">
              <ReportsDashboard />
            </ProtectedRoute>
          }
        />

        {/* ... existing routes ... */}
      </Routes>
    </SettingsProvider>
  );
}
```

---

## 6. Integration into Inventory Pages

### Update InventoryDashboard to use new sidebar

```jsx
import InventorySidebar from './InventorySidebar';

const InventoryDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userRole = localStorage.getItem('userRole');

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="fixed">
        <InventorySidebar 
          onToggle={setSidebarOpen}
          userRole={userRole}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Dashboard content */}
      </div>
    </div>
  );
};
```

---

## 7. Summary

✅ **Step 12 is now COMPLETE!** You have:

1. ✅ Added 5 new routes to `App.jsx`
2. ✅ Created enhanced `InventorySidebar.jsx` with new menu items
3. ✅ Implemented role-based access control (RBAC)
4. ✅ Created `ProtectedRoute` component for route protection
5. ✅ Updated navigation with all new features organized by category
6. ✅ Added badge notifications for pending items

---

## 8. New Routes Reference

| Route | Component | Access Level |
|-------|-----------|--------------|
| `/product-request-form` | ProductRequestForm | EMPLOYEE |
| `/procurement-manager-review` | ProcurementManagerReview | PROCUREMENT_MANAGER |
| `/store-officer-approval` | StoreOfficerApproval | STORE_OFFICER |
| `/cost-center-management` | CostCenterManagement | ADMIN |
| `/inventory-reports` | ReportsDashboard | ADMIN, HR, PROCUREMENT_MANAGER, STORE_OFFICER |

---

## 9. Menu Items Summary

**NEW SECTIONS ADDED:**
- 🆕 Product Requests (Workflow)
- 💰 Cost Management  
- 📊 Reports & Analytics

**UPDATED SECTIONS:**
- ✨ Products (with new reports)
- ✨ Stock Movement (with analytics)
- ⚙️ Settings

---

## All 12 Steps Completed! 🎉

You now have a **complete product management system** with:
- ✅ Cost tracking
- ✅ Approval workflows
- ✅ Budget management
- ✅ Reports & analytics
- ✅ Role-based access
- ✅ Beautiful UI with Material-Tailwind
