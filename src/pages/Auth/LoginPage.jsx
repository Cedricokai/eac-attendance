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
      // Demo login - replace with your actual authentication
      if (credentials.userName === "admin" && credentials.password === "admin123") {
        // Store demo authentication data
        localStorage.setItem("jwtToken", "demo-token");
        localStorage.setItem("authToken", "demo-token");
        localStorage.setItem("userRole", "ROLE_ADMIN");
        localStorage.setItem("userData", JSON.stringify({
          name: "Admin User",
          email: "admin@demo.com",
          role: "ROLE_ADMIN"
        }));

        navigate("/centralizedDashboard");
        toast.success("Demo login successful!");
      } else if (credentials.userName === "employee" && credentials.password === "employee123") {
        // Store demo authentication data
        localStorage.setItem("jwtToken", "demo-token");
        localStorage.setItem("authToken", "demo-token");
        localStorage.setItem("userRole", "ROLE_EMPLOYEE");
        localStorage.setItem("userData", JSON.stringify({
          name: "Employee User",
          email: "employee@demo.com",
          role: "ROLE_EMPLOYEE"
        }));

        navigate("/employeeDashboard");
        toast.success("Demo login successful!");
      } else {
        throw new Error("Invalid credentials. Use admin/admin123 or employee/employee123");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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

            {/* Demo Credentials */}
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
              <p className="font-medium">Demo Credentials:</p>
              <p className="mt-1">Admin: admin / admin123</p>
              <p>Employee: employee / employee123</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="text-sm font-medium">Login Failed</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

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