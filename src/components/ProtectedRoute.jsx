import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { XCircle, ArrowLeft, Home, ShieldAlert } from "lucide-react";

const ProtectedRoute = ({ children, allowMustChangePageOnly = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [attemptedPath, setAttemptedPath] = useState("");

  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
    if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
    return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
  };

  const mustChangePassword = (() => {
    try {
      const raw = localStorage.getItem("userData");
      if (!raw) return false;
      const u = JSON.parse(raw);
      return Boolean(u?.mustChangePassword);
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // If user must change password, force them ONLY to /must-change-password
      if (mustChangePassword) {
        if (location.pathname !== "/must-change-password") {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }
        setIsAuthorized(true);
        setLoading(false);
        return;
      }

      if (allowMustChangePageOnly && !mustChangePassword) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/pages/check-access?path=${encodeURIComponent(location.pathname)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          let data = {};
          try {
            data = await response.json();
          } catch {
            data = {};
          }
          const allowed = data.allowed ?? true;
          setIsAuthorized(allowed);
          
          // Show modal if not authorized
          if (!allowed) {
            setAttemptedPath(location.pathname);
            setShowPermissionModal(true);
          }
        } else if (response.status === 401 || response.status === 403) {
          setIsAuthorized(false);
          setAttemptedPath(location.pathname);
          setShowPermissionModal(true);
        } else if (response.status === 404) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          setAttemptedPath(location.pathname);
          setShowPermissionModal(true);
        }
      } catch (err) {
        console.error("Check access error:", err);
        setIsAuthorized(false);
        setAttemptedPath(location.pathname);
        setShowPermissionModal(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleGoBack = () => {
    setShowPermissionModal(false);
    navigate(-1); // Go back to previous page
  };

  const handleGoToDashboard = () => {
    setShowPermissionModal(false);
    navigate("/employeeDashboard"); // Go to home/dashboard
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  // If mustChangePassword, always force route without modal
  if (mustChangePassword && location.pathname !== "/must-change-password") {
    return <Navigate to="/must-change-password" replace />;
  }

  // Show permission denied modal if not authorized
  if (showPermissionModal) {
    // Get a user-friendly page name from the path
    const getPageName = (path) => {
      const name = path.replace(/^\//, '').replace(/-/g, ' ');
      return name.charAt(0).toUpperCase() + name.slice(1) || "this page";
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2">
                <ShieldAlert className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-white">Access Denied</h2>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-800 font-medium mb-1">
                  You are not authorized to view this page.
                </p>
                <p className="text-sm text-gray-500">
                  You don't have the necessary permissions to access 
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded mx-1 text-sm">
                    {getPageName(attemptedPath)}
                  </span>
                  .
                </p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-amber-700">
                <span className="font-medium">Note:</span> If you believe this is an error, 
                please contact your system administrator to request access.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
              Previous
              </button>
              <button
                onClick={handleGoToDashboard}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/employeeDashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;