import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiFetch } from "../../utils/api";
import { FiLock, FiEye, FiEyeOff, FiShield } from "react-icons/fi";

export default function MustChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const token = localStorage.getItem("jwtToken");
    if (!token) {
      toast.error("Session expired. Please login again.");
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/first-login/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // your backend uses SecurityContext
        },
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      // Clear mustChangePassword flag locally if you store it
      const raw = localStorage.getItem("userData");
      if (raw) {
        try {
          const u = JSON.parse(raw);
          u.mustChangePassword = false;
          localStorage.setItem("userData", JSON.stringify(u));
        } catch {}
      }

      toast.success(res?.message || "Password set successfully. Please login again.");
      // Recommended: force re-login after password change
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("authToken");
      navigate("/", { replace: true });

    } catch (err) {
      toast.error(err.message || "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-8">
        <div className="flex items-center mb-4">
          <FiShield className="text-2xl text-indigo-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Set Your Password</h1>
        </div>

        <p className="text-sm text-gray-600">
          This is your first login. You must set a new password to continue.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 bg-white/50">
            <FiLock className="text-gray-400 mr-3 text-lg" />
            <input
              type={show ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full outline-none bg-transparent text-gray-800 placeholder-gray-400"
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="text-indigo-600 hover:text-indigo-800 ml-3"
            >
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 bg-white/50">
            <FiLock className="text-gray-400 mr-3 text-lg" />
            <input
              type={show ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full outline-none bg-transparent text-gray-800 placeholder-gray-400"
              placeholder="Re-type password"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            type="submit"
          >
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
