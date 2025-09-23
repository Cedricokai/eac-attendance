import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiLogIn } from "react-icons/fi";
import { toast } from "react-toastify";

function LoginPage() {
  const [credentials, setCredentials] = useState({
    userNameOrEmail: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:8080/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: credentials.userNameOrEmail,
          password: credentials.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login response:", data); // 👀 check backend shape

        // ✅ Ensure we pick the correct JWT key
        const jwtToken = data.token || data.accessToken || data.jwt;
        if (!jwtToken || jwtToken.split(".").length !== 3) {
          throw new Error("Invalid JWT token received from backend");
        }

        // Save JWT + optional tokens
        localStorage.setItem("jwtToken", jwtToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.role) {
          localStorage.setItem("userRole", data.role);
        }

        // ✅ Redirect: Admin → Centralized, Others → EmployeeDashboard
        if (data.role === "ROLE_ADMIN") {
          navigate("/centralizedDashboard");
        } else {
          navigate("/employeeDashboard");
        }

        toast.success("Login successful!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }
    } catch (error) {
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
            Sign in to access your dashboard and manage your payroll system.
          </p>
        </div>

        {/* Right Section */}
        <div className="p-8 md:p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <FiLogIn className="mr-2" /> Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username or Email */}
            <div>
              <label className="block text-gray-600 text-sm mb-2">
                Username or Email
              </label>
              <div className="flex items-center border rounded-lg px-3 py-2">
                <FiMail className="text-gray-400 mr-2" />
                <input
                  type="text"
                  name="userNameOrEmail"
                  value={credentials.userNameOrEmail}
                  onChange={handleChange}
                  placeholder="Enter your username or email"
                  className="w-full outline-none"
                  required
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
                />
              </div>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Signup Link */}
          <p className="mt-6 text-sm text-gray-600 text-center">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-indigo-600 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
