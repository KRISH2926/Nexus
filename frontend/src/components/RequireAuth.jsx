import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const roleHome = {
  student: "/student",
  teacher: "/mentor",
  security: "/security",
  admin: "/admin"
};

export default function RequireAuth({ allowedRoles, children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleHome[role] || "/"} replace />;
  }

  return children;
}
