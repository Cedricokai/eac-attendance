if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
  window.global = window;
}
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs.min.js';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

const getAuthHeaders = () => {
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// ============================================================================
// REST API METHODS
// ============================================================================

/**
 * Fetch all employee contacts with unread count and latest message snippet
 */
export const fetchChatContacts = async () => {
  const res = await fetch(`${API_BASE_URL}/api/chat/contacts`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to fetch contacts');
  }
  return res.json();
};

/**
 * Fetch conversation message history between current user and a contact
 */
export const fetchChatHistory = async (contactId) => {
  const res = await fetch(`${API_BASE_URL}/api/chat/history/${contactId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to fetch chat history');
  }
  return res.json();
};

/**
 * Send a chat message via REST (reliable fallback and attachment support)
 */
export const sendChatMessage = async ({ recipientId, content, attachmentUrl, attachmentName, attachmentType }) => {
  const res = await fetch(`${API_BASE_URL}/api/chat/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      recipientId,
      content,
      attachmentUrl,
      attachmentName,
      attachmentType,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to send message');
  }
  return res.json();
};

/**
 * Mark messages from contact as read
 */
export const markChatAsRead = async (contactId) => {
  const res = await fetch(`${API_BASE_URL}/api/chat/mark-read/${contactId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    console.warn('Failed to mark chat as read for contact', contactId);
    return false;
  }
  return res.json();
};

/**
 * Get total unread messages count for badges
 */
export const fetchTotalUnreadChatCount = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unreadCount || 0;
  } catch (e) {
    console.error('Failed to fetch unread count:', e);
    return 0;
  }
};

/**
 * Upload a file/image attachment for chat
 */
export const uploadChatAttachment = async (file) => {
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/chat/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to upload attachment');
  }
  return res.json();
};

// ============================================================================
// ADMIN AUDIT REST METHODS
// ============================================================================

/**
 * Admin: Fetch overview of all employee conversations in organization
 */
export const fetchAdminAllConversations = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/chat/conversations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to fetch admin conversation audit');
  }
  return res.json();
};

/**
 * Admin: Fetch full transcript between any two employees
 */
export const fetchAdminConversationAudit = async (user1Id, user2Id, keyword = '') => {
  let url = `${API_BASE_URL}/api/admin/chat/conversation/${user1Id}/${user2Id}`;
  if (keyword) {
    url += `?keyword=${encodeURIComponent(keyword)}`;
  }
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to fetch conversation audit transcript');
  }
  return res.json();
};

// ============================================================================
// WEBSOCKET / STOMP MANAGER
// ============================================================================

let stompClient = null;
let currentSubscriptions = [];

export const createChatWebSocketClient = ({
  onMessageReceived,
  onAdminAuditMessage,
  onReadReceipt,
  onConnectionChange,
}) => {
  const token = localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole') || '';
  const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

  // SockJS factory pointing to backend /ws endpoint
  const socketUrl = `${API_BASE_URL}/ws`;

  const client = new Client({
    webSocketFactory: () => new SockJS(socketUrl),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    debug: (str) => {
      if (process.env.NODE_ENV === 'development') {
        // console.log('[STOMP]', str);
      }
    },
    onConnect: (frame) => {
      if (onConnectionChange) onConnectionChange(true);

      // Subscribe to private incoming messages
      const userSub = client.subscribe('/user/queue/messages', (message) => {
        try {
          const payload = JSON.parse(message.body);
          if (payload.type === 'READ_RECEIPT') {
            if (onReadReceipt) onReadReceipt(payload);
          } else {
            if (onMessageReceived) onMessageReceived(payload);
          }
        } catch (e) {
          console.error('Error parsing incoming WebSocket message:', e);
        }
      });
      currentSubscriptions.push(userSub);

      // If user is Admin, subscribe to real-time company audit feed
      if (isAdmin) {
        const adminSub = client.subscribe('/topic/admin/chat', (message) => {
          try {
            const payload = JSON.parse(message.body);
            if (onAdminAuditMessage) onAdminAuditMessage(payload);
          } catch (e) {
            console.error('Error parsing admin audit message:', e);
          }
        });
        currentSubscriptions.push(adminSub);
      }
    },
    onDisconnect: () => {
      if (onConnectionChange) onConnectionChange(false);
    },
    onStompError: (frame) => {
      console.warn('STOMP error:', frame.headers['message']);
      if (onConnectionChange) onConnectionChange(false);
    },
  });

  stompClient = client;
  client.activate();

  return {
    disconnect: () => {
      currentSubscriptions.forEach((sub) => {
        try {
          sub.unsubscribe();
        } catch (e) {}
      });
      currentSubscriptions = [];
      if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
      }
    },
    sendViaSocket: (recipientId, content, attachment = null) => {
      if (stompClient && stompClient.connected) {
        stompClient.publish({
          destination: '/app/chat.send',
          body: JSON.stringify({
            recipientId,
            content,
            attachmentUrl: attachment?.url,
            attachmentName: attachment?.fileName,
            attachmentType: attachment?.fileType,
          }),
        });
        return true;
      }
      return false;
    },
  };
};
