import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { apiFetch } from "../../utils/api";
import { FiMail, FiArrowLeft, FiSend } from "react-icons/fi";

export default function ForgotPasswordPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    setLoading(true);
    try {
      // Backend always returns same message (anti-enumeration). We mirror that.
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim() }),
      });

      toast.success(res?.message || "If the account exists, a reset link has been sent");
      setEmailOrUsername("");
    } catch (err) {
      // Even if error, show same message to user (avoid enumeration + consistent UX)
      toast.success("If the account exists, a reset link has been sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-white/20 p-8">
        <h1 className="text-2xl font-bold text-gray-800">Password Recovery</h1>
        <p className="text-sm text-gray-600 mt-2">
          Enter your email or username. If an account exists, you will receive a reset link.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Email or Username
          </label>
          <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 bg-white/50">
            <FiMail className="text-gray-400 mr-3 text-lg" />
            <input
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full outline-none bg-transparent text-gray-800 placeholder-gray-400"
              placeholder="e.g. cedric.okai or cedric@company.com"
              autoComplete="username"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
            type="submit"
          >
            {loading ? "Sending..." : (
              <span className="flex items-center justify-center">
                <FiSend className="mr-2" />
                Send Reset Link
              </span>
            )}
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
