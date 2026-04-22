// ProtectedLayout.jsx (update this file)
import { Outlet } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";
import Header from "../components/Header"; // Adjust path as needed

export default function ProtectedLayout({ toggleSidebar, user, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header at the top */}
      <Header 
        toggleSidebar={toggleSidebar} 
        user={user} 
        onLogout={onLogout} 
      />
      
      {/* Breadcrumbs directly below header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumbs />
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Outlet />
      </div>
    </div>
  );
}