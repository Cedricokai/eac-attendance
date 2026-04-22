import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiFetch } from "../../utils/api";
import { FiLock, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("token") || "";
  }, [location.search]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Reset token is missing. Please use the link from your email.");
      return;
    }
    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      toast.success(res?.message || "Password reset successful. Please login.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-8">
        <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
        <p className="text-sm text-gray-600 mt-2">
          Set a new password for your account.
        </p>

        {!token && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Missing reset token. Please open the reset link from your email.
          </div>
        )}

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
            disabled={loading || !token}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            type="submit"
          >
            {loading ? "Saving..." : "Reset Password"}
          </button>

          <Link
            to="/"
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <FiArrowLeft className="mr-2" />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
