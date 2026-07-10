import { getApiBaseUrl } from '../utils/api'; // adjust to your helper

const API_BASE_URL = getApiBaseUrl();

const getAuthHeader = () => {
  const token = localStorage.getItem('jwtToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const fetchNotifications = async () => {
  const res = await fetch(`${API_BASE_URL}/api/notifications`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
};

export const fetchUnreadCount = async () => {
  const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  const data = await res.json();
  return data.count;
};

export const markAsRead = async (id) => {
  const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to mark as read');
};

export const markAllAsRead = async () => {
  const res = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
};