import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff, FiShield, FiPackage, FiCalendar, FiCheckCircle, FiGlobe } from "react-icons/fi";
import { toast } from "react-toastify";

function LoginPage() {
  const [credentials, setCredentials] = useState({
    userName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Create animated bubbles
  useEffect(() => {
    const createBubble = () => {
      const bubble = document.createElement('div');
      bubble.className = 'bubble absolute rounded-full bg-gradient-to-br from-indigo-200/20 to-purple-200/20 backdrop-blur-sm';
      
      // Random size between 20px and 80px
      const size = Math.random() * 60 + 20;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      
      // Random position
      bubble.style.left = `${Math.random() * 100}%`;
      bubble.style.top = `${Math.random() * 100}%`;
      
      // Random animation duration between 15s and 30s
      const duration = Math.random() * 15 + 15;
      bubble.style.animation = `float ${duration}s ease-in-out infinite`;
      bubble.style.animationDelay = `${Math.random() * 5}s`;
      
      // Random opacity
      bubble.style.opacity = Math.random() * 0.4 + 0.1;
      
      document.querySelector('.bubble-container')?.appendChild(bubble);
      
      // Remove bubble after animation completes
      setTimeout(() => {
        bubble.remove();
      }, duration * 1000);
    };

    // Create initial bubbles
    for (let i = 0; i < 15; i++) {
      createBubble();
    }

    // Create new bubbles periodically
    const interval = setInterval(createBubble, 3000);

    return () => {
      clearInterval(interval);
      document.querySelectorAll('.bubble').forEach(bubble => bubble.remove());
    };
  }, []);

  // Enhanced API URL detection
  const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Only log in development mode and with sensitive info masked
    if (process.env.NODE_ENV === 'development') {
      console.log("🖥️ Current hostname:", hostname);
      console.log("🔌 Current port:", port);
    }

    // If frontend is opened via localhost → use localhost backend
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (process.env.NODE_ENV === 'development') {
        console.log("🏠 Using LOCALHOST API URL");
      }
      return "http://localhost:8080";
    }

    // LAN access
    if (hostname.startsWith("192.168.")) {
      if (process.env.NODE_ENV === 'development') {
        console.log("🏠 Using LAN API URL");
      }
      return import.meta.env.VITE_API_BASE_URL_LOCAL;
    }

    // Public / Tailscale / Cloudflare IP
    if (hostname === "100.114.178.13") {
      if (process.env.NODE_ENV === 'development') {
        console.log("🌐 Using PUBLIC API URL");
      }
      return import.meta.env.VITE_API_BASE_URL_PUBLIC;
    }

    // Default fallback
    if (process.env.NODE_ENV === 'development') {
      console.log("🌍 Using PUBLIC API URL (fallback)");
    }
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
      
      // Only log in development mode and mask sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.log("🚀 Login attempt details:");
        console.log("API URL:", loginUrl);
        console.log("Username:", credentials.userName);
        console.log("Password: [HIDDEN FOR SECURITY]");
      }

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

      if (process.env.NODE_ENV === 'development') {
        console.log("📡 Response status:", response.status);
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text();
        
        // Only log full error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ Server error response:", errorText);
        } else {
          console.error("❌ Authentication failed");
        }
        
        // Try to parse as JSON if possible, otherwise use text
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || `Authentication failed (${response.status})`;
        } catch {
          errorMessage = `Authentication failed (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Only log successful response in development, but mask sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.log("✅ Login successful");
        // Log only non-sensitive parts of the response
        const safeData = { ...data };
        if (safeData.token) safeData.token = "[TOKEN HIDDEN]";
        if (safeData.user?.password) safeData.user.password = "[HIDDEN]";
        console.log("Response data:", safeData);
      }

      if (data.token) {
        localStorage.setItem("jwtToken", data.token);
        localStorage.setItem("authToken", data.token);

        if (data.role) localStorage.setItem("userRole", data.role);
        if (data.user) {
          // Store user data without sensitive information
          const safeUserData = { ...data.user };
          delete safeUserData.password;
          delete safeUserData.securityQuestion;
          delete safeUserData.securityAnswer;
          localStorage.setItem("userData", JSON.stringify(safeUserData));
        }

        // FIRST TIME LOGIN ENFORCEMENT
        if (data.user?.mustChangePassword) {
          toast.info("You must change your password before continuing.");
          navigate("/must-change-password");
          return;
        }

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
      // Log only generic error in production
      if (process.env.NODE_ENV === 'development') {
        console.error("❌ Login error:", error);
      } else {
        console.error("❌ Authentication failed");
      }
      
      let errorMessage = error.message;
      
      if (error.message.includes("Failed to fetch")) {
        const API_BASE_URL = getApiBaseUrl();
        
        // Only show detailed connection troubleshooting in development
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `Cannot connect to server at ${API_BASE_URL}. Please check:`;
          console.log("🔧 Connection issues - check:");
          console.log("1. Is backend running on port 8080?");
          console.log("2. Is CORS configured properly?");
          console.log("3. Is the IP address correct?");
        } else {
          errorMessage = "Cannot connect to authentication server. Please try again later or contact IT support.";
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection function (optional) - now with security in mind
  const testConnection = async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      
      // Only log connection tests in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Testing connection to:", API_BASE_URL);
      }
      
      const response = await fetch(`${API_BASE_URL}/auth/test`, {
        method: 'GET',
        // Add a timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Connection test result:", response.status);
      }
      
      // Show user-friendly message
      if (response.ok) {
        toast.info("Connection to server is working properly");
      } else {
        toast.warning("Server responded but with an error. Please check configuration.");
      }
    } catch (error) {
      // Only log details in development
      if (process.env.NODE_ENV === 'development') {
        console.error("Connection test failed:", error);
      }
      
      // Show user-friendly message
      toast.error("Unable to reach authentication server. Please check your network connection.");
    }
  };

  // Remove the automatic connection test on mount to reduce console noise
  // Connection test will only run when user clicks the button

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Bubbles Container */}
      <div className="bubble-container absolute inset-0 w-full h-full overflow-hidden pointer-events-none" />
      
      {/* CSS for bubble animation */}
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            25% {
              transform: translate(20px, -20px) rotate(5deg);
            }
            50% {
              transform: translate(-15px, 15px) rotate(-5deg);
            }
            75% {
              transform: translate(10px, -10px) rotate(3deg);
            }
          }
          
          .bubble {
            animation: float 20s ease-in-out infinite;
            will-change: transform;
          }
          
          .bubble:hover {
            opacity: 0.8;
            transition: opacity 0.3s ease;
          }
        `}
      </style>

      {/* Main Login Card */}
      <div className="max-w-6xl w-full grid lg:grid-cols-2 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative z-10">
        {/* Left Section - Welcome & Features */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-4 h-4 bg-white/10 rounded-full animate-pulse"
                style={{
                  top: `${20 + i * 15}%`,
                  left: `${10 + i * 20}%`,
                  animationDelay: `${i * 0.5}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <FiShield className="text-3xl mr-3 text-white/90 animate-pulse" />
              <h1 className="text-4xl font-bold tracking-tight">Enterprise Portal</h1>
            </div>
            
            <p className="text-xl mb-10 text-indigo-100 font-medium leading-relaxed">
              Your gateway to unified business management - where productivity meets precision
            </p>
            
            <div className="space-y-8">
              <div className="flex items-start transform transition-transform duration-300 hover:translate-x-2">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm">
                  <FiCalendar className="text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Attendance & Workforce</h3>
                  <p className="text-indigo-100/80 text-sm">Real-time tracking, shift management, and team scheduling with intelligent analytics</p>
                </div>
              </div>
              
              <div className="flex items-start transform transition-transform duration-300 hover:translate-x-2">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm">
                  <FiPackage className="text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Inventory Control</h3>
                  <p className="text-indigo-100/80 text-sm">Comprehensive stock monitoring, request processing, and multi-location inventory optimization</p>
                </div>
              </div>
              
              <div className="flex items-start transform transition-transform duration-300 hover:translate-x-2">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm">
                  <FiCheckCircle className="text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Leave & Approvals</h3>
                  <p className="text-indigo-100/80 text-sm">Streamlined leave management with automated workflows and approval hierarchies</p>
                </div>
              </div>
              
              <div className="flex items-start transform transition-transform duration-300 hover:translate-x-2">
                <div className="bg-white/20 p-3 rounded-xl mr-4 backdrop-blur-sm">
                  <FiGlobe className="text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Central Command</h3>
                  <p className="text-indigo-100/80 text-sm">Holistic dashboard with cross-functional insights and enterprise-wide reporting</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-white/20">
              <p className="text-indigo-100/70 text-sm italic">
                "Connecting teams, processes, and data for operational excellence"
              </p>
            </div>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="p-8 md:p-12 lg:p-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 flex items-center">
                <FiLogIn className="mr-3 text-indigo-600 animate-bounce" /> 
                Secure Access
              </h2>
              <p className="text-gray-600 mt-2">Authenticate to enter your management workspace</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold shadow-sm">
              v2.1 • Professional
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-gray-700 text-sm font-medium">
                Organizational Username
              </label>
              <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all duration-200 bg-white/50 backdrop-blur-sm">
                <FiMail className="text-gray-400 mr-3 text-lg" />
                <input
                  type="text"
                  name="userName"
                  value={credentials.userName}
                  onChange={handleChange}
                  placeholder="Enter your enterprise username"
                  className="w-full outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-gray-700 text-sm font-medium">
                  Secure Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center transition-colors duration-200"
                >
                  {showPassword ? (
                    <>
                      <FiEyeOff className="mr-1" /> Hide Password
                    </>
                  ) : (
                    <>
                      <FiEye className="mr-1" /> Show Password
                    </>
                  )}
                </button>
              </div>
              <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all duration-200 bg-white/50 backdrop-blur-sm">
                <FiLock className="text-gray-400 mr-3 text-lg" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  placeholder="Enter your secure passphrase"
                  className="w-full outline-none bg-transparent text-gray-800 placeholder-gray-400"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying Credentials...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <FiShield className="mr-2" />
                  Access Enterprise Portal
                </span>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl shadow-sm animate-pulse">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium">Authentication Failed</h3>
                    <div className="mt-2 text-sm space-y-1">
                      <p>{error}</p>
                      <p className="text-xs text-red-600/70">Please verify your credentials and network connection</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Debug Info - Only visible in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center mb-2">
                  <FiGlobe className="text-blue-500 mr-2 animate-pulse" />
                  <h4 className="text-sm font-medium text-blue-800">Connection Diagnostics (Dev Mode)</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700 mb-3">
                  <div>
                    <span className="font-medium">Endpoint:</span>
                    <p className="truncate">{getApiBaseUrl()}/auth/signin</p>
                  </div>
                  <div>
                    <span className="font-medium">Host:</span>
                    <p>{window.location.hostname}</p>
                  </div>
                  <div>
                    <span className="font-medium">Environment:</span>
                    <p>{import.meta.env.MODE}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-green-600 font-semibold">Ready</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={testConnection}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
                >
                  Run Connection Test
                </button>
              </div>
            )}
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <Link 
                to="/signup" 
                className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline transition-all duration-200 flex items-center group"
              >
                <span className="mr-2">📋</span>
                Request New Account
                <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
              
              <Link
                to="/forgot-password"
                className="text-gray-600 hover:text-gray-800 font-medium hover:underline transition-colors duration-200 flex items-center"
              >
                <span className="mr-2">🔑</span>
                Password Recovery
              </Link>
              
              <a 
                href="#" 
                className="text-gray-600 hover:text-gray-800 font-medium hover:underline transition-colors duration-200 flex items-center"
              >
                <span className="mr-2">📞</span>
                IT Support
              </a>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-6 pt-4 border-t border-gray-100">
              © 2024 Enterprise Management Platform • v2.1.4 • Secure SSL Connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;