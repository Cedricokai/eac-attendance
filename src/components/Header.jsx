import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService";

// Simple time-ago function (no external dependency)
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

const Header = ({ toggleSidebar, user, onLogout }) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // State for real notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Don't show breadcrumbs on auth pages
  const showBreadcrumbs = location.pathname !== "/" &&
                          !location.pathname.includes("/login") &&
                          !location.pathname.includes("/signup") &&
                          !location.pathname.includes("/forgot-password") &&
                          !location.pathname.includes("/reset-password");

  // Load notifications and unread count
  const loadNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Initial load and polling every 60 seconds
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark a single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(notifs =>
        notifs.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(notifs => notifs.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Helper: get icon based on notification type
  const getNotifIcon = (type) => {
    const baseClasses = "p-1.5 rounded-full flex-shrink-0";
    if (type && type.includes("SUPERVISOR") || type.includes("APPROVAL")) {
      return (
        <div className={`${baseClasses} bg-blue-50`}>
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    } else if (type && type.includes("REJECT")) {
      return (
        <div className={`${baseClasses} bg-red-50`}>
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    } else if (type && type.includes("LOAN")) {
      return (
        <div className={`${baseClasses} bg-purple-50`}>
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className={`${baseClasses} bg-gray-100`}>
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      );
    }
  };

  return (
    <>
      <header className="flex justify-between items-center border-b border-gray-200 bg-white h-16 w-full px-6 shadow-sm">
        {/* Left section */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          {showBreadcrumbs && (
            <div className="hidden md:block flex-1 min-w-0">
              <Breadcrumbs />
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <Link to="/settingspage" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>

          <div className="border-l border-gray-200 h-8"></div>

          {/* Notification Bell with Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="p-2 hover:bg-gray-100 rounded-full relative transition-colors"
              aria-label="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100 max-h-80 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-indigo-600 hover:underline"
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </div>

                {loadingNotifs ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                        !notif.read ? "bg-blue-50/50" : ""
                      } border-b border-gray-50 last:border-0 cursor-pointer`}
                      onClick={() => {
                        if (!notif.read) handleMarkAsRead(notif.id);
                        // Optionally navigate to detail
                      }}
                    >
                      {getNotifIcon(notif.notificationType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">{notif.subject}</p>
                        <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                      )}
                    </div>
                  ))
                )}

                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <Link
                    to="/NotificationsPage"
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => setNotifDropdownOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="border-l border-gray-200 h-8"></div>

          {/* User Dropdown (unchanged) */}
          <div className="relative" ref={userDropdownRef}>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-sm">
                <span className="font-medium text-sm">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
              </div>
              <span className="font-medium text-gray-700 group-hover:text-gray-900 hidden sm:inline">
                {user?.name?.split(" ")[0] || "User"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${userDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                  <p className="text-xs text-indigo-600 capitalize mt-1 font-medium">{user?.role || "employee"}</p>
                </div>
                <button onClick={() => { navigate("/settingspage"); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button onClick={() => { onLogout(); setUserDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile breadcrumbs */}
      {showBreadcrumbs && (
        <div className="md:hidden px-4 py-2 bg-gray-50 border-b border-gray-100">
          <Breadcrumbs />
        </div>
      )}
    </>
  );
};

export default Header;