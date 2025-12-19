// src/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }) => {
  const storedRole = localStorage.getItem("userRole");

  if (storedRole !== role) {
    return <Navigate to={`/${storedRole}login`} />;
  }

  return children;
};

export default ProtectedRoute;
