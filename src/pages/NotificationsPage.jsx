import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  Check,
  CheckCheck,
  RefreshCw,
  Filter,
  Calendar,
  Users,
  DollarSign,
  Package,
  FileText,
  UserCheck,
  Briefcase,
  Building2,
  Truck,
  HandCoins,
  Settings,
  Home,
  User as UserIcon,
  Mail,
  Inbox,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { toast } from 'react-toastify';

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

// Format date for tooltip (optional)
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkAction, setIsBulkAction] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark a single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Marked as read');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Bulk mark selected as read
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) {
      toast.warning('No notifications selected');
      return;
    }
    setIsBulkAction(true);
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        try {
          await markAsRead(id);
          successCount++;
        } catch (e) {
          console.error(`Failed to mark ${id}:`, e);
        }
      }
      await loadNotifications();
      setSelectedIds([]);
      toast.success(`${successCount} notification(s) marked as read`);
    } catch (error) {
      toast.error('Failed to mark selected as read');
    } finally {
      setIsBulkAction(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    const iconMap = {
      'SUPERVISOR_APPROVAL_REQUEST': { icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
      'PLANNER_APPROVAL_REQUEST': { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50' },
      'HR_APPROVAL_REQUEST': { icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
      'LEAVE_APPROVED': { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      'LEAVE_REJECTED': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
      'LEAVE_REQUEST_SUBMITTED': { icon: Mail, color: 'text-indigo-500', bg: 'bg-indigo-50' },
      'LOAN_APPROVED': { icon: HandCoins, color: 'text-emerald-500', bg: 'bg-emerald-50' },
      'LOAN_REJECTED': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
      'LOAN_REQUEST_SUBMITTED': { icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
    };
    const match = Object.keys(iconMap).find(key => type && type.includes(key));
    if (match) {
      const { icon: Icon, color, bg } = iconMap[match];
      return { icon: <Icon size={18} />, color, bg };
    }
    return {
      icon: <Bell size={18} />,
      color: 'text-gray-500',
      bg: 'bg-gray-50'
    };
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadFiltered = filteredNotifications.filter(n => !n.read).length;

  // Get status badge color
  const getStatusColor = (status) => {
    if (status === 'SENT') return 'bg-green-100 text-green-700';
    if (status === 'FAILED') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  // Navigate to related entity
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.leave && notification.leave.id) {
      navigate(`/attendance/leave/${notification.leave.id}`);
    } else if (notification.loanRequest && notification.loanRequest.id) {
      navigate(`/loan/${notification.loanRequest.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Bell size={24} className="text-indigo-600" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Stay updated with all your notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={loadNotifications}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-1.5"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Filter:</span>
            <div className="flex gap-1">
              {['all', 'unread', 'read'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                    filter === f
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {f}
                  {f === 'unread' && unreadFiltered > 0 && (
                    <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                      {unreadFiltered}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              <button
                onClick={handleBulkMarkAsRead}
                disabled={isBulkAction}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                {isBulkAction ? 'Marking...' : 'Mark Read'}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bell size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No notifications</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {filter === 'all' ? "You're all caught up!" : `No ${filter} notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => {
              const { icon, color, bg } = getNotificationIcon(notification.notificationType);
              const isSelected = selectedIds.includes(notification.id);

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm border
                    ${notification.read
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-indigo-200 dark:border-indigo-800 shadow-indigo-50 dark:shadow-indigo-900/10'
                    }
                    hover:shadow-md transition-all duration-200
                  `}
                >
                  <div className="p-4 flex items-start gap-4">
                    {/* Checkbox for bulk */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(notification.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                      <span className={color}>{icon}</span>
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                            {notification.subject}
                          </p>
                          {notification.leave?.reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {notification.leave.reason}
                            </p>
                          )}
                          {notification.loanRequest?.purpose && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                              {notification.loanRequest.purpose}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1" title={formatDate(notification.createdAt)}>
                          <Clock size={12} />
                          {timeAgo(notification.createdAt)}
                        </span>
                        {notification.employee && (
                          <span className="flex items-center gap-1">
                            <UserIcon size={12} />
                            {notification.employee.firstName} {notification.employee.lastName}
                          </span>
                        )}
                        {notification.notificationType && (
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                            {notification.notificationType.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick action */}
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                        title="Mark as read"
                      >
                        <Check size={16} className="text-gray-400 hover:text-indigo-600" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span>
                Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                {filter !== 'all' && ` (${filter})`}
              </span>
              <button
                onClick={loadNotifications}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;