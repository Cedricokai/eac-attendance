import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { toast } from "react-toastify";

function LoginPage() {
  const [credentials, setCredentials] = useState({
    userName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Enhanced API URL detection
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const API_BASE_URL = getApiBaseUrl();
      const loginUrl = `${API_BASE_URL}/auth/signin`;
      
      console.log("🚀 Login attempt details:");
      console.log("API URL:", loginUrl);
      console.log("Credentials:", credentials);

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: credentials.userName,
          password: credentials.password
        }),
      });

      console.log("📡 Response status:", response.status);

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Server error response:", errorText);
        
        // Try to parse as JSON if possible, otherwise use text
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Login response data:", data);

      if (data.token) {
        // Store authentication data
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("authToken", data.token);
        
        if (data.role) localStorage.setItem("userRole", data.role);
        if (data.user) {
          localStorage.setItem("userData", JSON.stringify(data.user));
        }

        // Navigate based on role
        if (data.role === "ROLE_ADMIN") {
          navigate("/centralizedDashboard");
        } else {
          navigate("/employeeDashboard");
        }

        toast.success("Login successful!");
      } else {
        throw new Error(data.message || "Login failed: No token received");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      let errorMessage = error.message;
      
      if (error.message.includes("Failed to fetch")) {
        const API_BASE_URL = getApiBaseUrl();
        errorMessage = `Cannot connect to server at ${API_BASE_URL}. Please check:`;
        console.log("🔧 Connection issues - check:");
        console.log("1. Is backend running on port 8080?");
        console.log("2. Is CORS configured properly?");
        console.log("3. Is the IP address correct?");
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection function (optional)
  const testConnection = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      console.log("Testing connection to:", API_BASE_URL);
      
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'GET'
      });
      console.log("Connection test result:", response.status);
    } catch (error) {
      console.error("Connection test failed:", error);
    }
  };

  // Call this on component mount to test
  React.useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Left Section */}
        <div className="hidden md:flex flex-col justify-center items-center bg-indigo-600 p-10 text-white">
          <h1 className="text-3xl font-bold mb-4">Welcome Back!</h1>
          <p className="text-center text-indigo-100">
            Sign in to access your dashboard and manage your inventory system.
          </p>
        </div>

        {/* Right Section */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <FiLogIn className="mr-2" /> Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-gray-600 text-sm mb-2">
                Username
              </label>
              <div className="flex items-center border rounded-lg px-3 py-2">
                <FiMail className="text-gray-400 mr-2" />
                <input
                  type="text"
                  name="userName"
                  value={credentials.userName}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  className="w-full outline-none"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-600 text-sm mb-2">Password</label>
              <div className="flex items-center border rounded-lg px-3 py-2">
                <FiLock className="text-gray-400 mr-2" />
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full outline-none"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="text-sm font-medium">Login Failed</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2">
                  Check if:
                  <br />• Backend server is running on port 8080
                  <br />• CORS is configured on backend
                  <br />• IP addresses are correct
                  <br />• Credentials are correct
                </p>
              </div>
            )}

            {/* Enhanced Debug Info */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-xs">
              <p><strong>Connection Info:</strong></p>
              <p>API URL: {getApiBaseUrl()}/auth/signin</p>
              <p>Current Host: {window.location.hostname}</p>
              <p>Environment: {import.meta.env.MODE}</p>
              <button 
                type="button" 
                onClick={testConnection}
                className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                Test Connection
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600 text-center">
            Don't have an account?{" "}
            <Link to="/signup" className="text-indigo-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;