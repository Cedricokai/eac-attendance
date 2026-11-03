// src/pages/Chat/ChatHubPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  fetchChatContacts,
  fetchChatHistory,
  sendChatMessage,
  markChatAsRead,
  uploadChatAttachment,
  createChatWebSocketClient,
} from '../../services/chatService';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  PhotoIcon,
  UserCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon as CheckSolidIcon } from '@heroicons/react/24/solid';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return diffDay === 1 ? 'Yesterday' : `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDividerDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// Generate consistent avatar colors based on name
function getAvatarGradient(name = '') {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export default function ChatHubPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Current user info
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch {
      return {};
    }
  }, []);
  const userRole = localStorage.getItem('userRole') || '';
  const isAdmin = userRole === 'ROLE_ADMIN' || userRole === 'ADMIN';

  // State
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [inChatSearch, setInChatSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsClientRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Load contacts
  const loadContacts = async () => {
    try {
      setLoadingContacts(true);
      const data = await fetchChatContacts();
      setContacts(data);

      // Check if navigated with state { selectedContactId }
      if (location.state?.selectedContactId) {
        const target = data.find((c) => c.id === location.state.selectedContactId);
        if (target) {
          setSelectedContact(target);
        }
      }
    } catch (err) {
      console.error('Failed to load chat contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Initialize WebSocket STOMP client
  useEffect(() => {
    const client = createChatWebSocketClient({
      onMessageReceived: (newMsg) => {
        // If message is from or to the currently active conversation
        setMessages((prev) => {
          if (
            (selectedContact && newMsg.senderId === selectedContact.id) ||
            (selectedContact && newMsg.recipientId === selectedContact.id)
          ) {
            // Avoid duplicate by ID
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          }
          return prev;
        });

        // Update contacts unread count and latest snippet
        setContacts((prevContacts) =>
          prevContacts.map((c) => {
            if (c.id === newMsg.senderId) {
              const isCurrentChat = selectedContact && selectedContact.id === c.id;
              return {
                ...c,
                lastMessage: newMsg.content || (newMsg.attachmentName ? `📎 ${newMsg.attachmentName}` : ''),
                lastMessageTime: newMsg.createdAt,
                unreadCount: isCurrentChat ? 0 : c.unreadCount + 1,
              };
            }
            if (c.id === newMsg.recipientId) {
              return {
                ...c,
                lastMessage: newMsg.content || (newMsg.attachmentName ? `📎 ${newMsg.attachmentName}` : ''),
                lastMessageTime: newMsg.createdAt,
              };
            }
            return c;
          })
        );

        if (selectedContact && newMsg.senderId === selectedContact.id) {
          markChatAsRead(selectedContact.id);
          setTimeout(() => scrollToBottom(true), 100);
        }
      },
      onReadReceipt: (receipt) => {
        // Mark sent messages as read in active view
        setMessages((prev) =>
          prev.map((m) => (m.senderId === storedUser.id ? { ...m, isRead: true } : m))
        );
      },
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      },
    });

    wsClientRef.current = client;

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, [selectedContact, storedUser.id]);

  // When selected contact changes, load conversation history and mark as read
  useEffect(() => {
    if (!selectedContact) return;

    let isMounted = true;
    const loadHistory = async () => {
      try {
        setLoadingMessages(true);
        const history = await fetchChatHistory(selectedContact.id);
        if (isMounted) {
          setMessages(history);
          setTimeout(() => scrollToBottom(false), 50);
        }
        // Mark as read
        if (selectedContact.unreadCount > 0) {
          await markChatAsRead(selectedContact.id);
          setContacts((prev) =>
            prev.map((c) => (c.id === selectedContact.id ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to load message history:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedContact]);

  // Handle Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachment) || !selectedContact || sending) return;

    const contentToSend = inputText.trim();
    const currentAttachment = attachment;

    setInputText('');
    setAttachment(null);
    setSending(true);

    try {
      const savedDto = await sendChatMessage({
        recipientId: selectedContact.id,
        content: contentToSend,
        attachmentUrl: currentAttachment?.url,
        attachmentName: currentAttachment?.fileName,
        attachmentType: currentAttachment?.fileType,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === savedDto.id)) return prev;
        return [...prev, savedDto];
      });

      // Update contact's last message in the list
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                lastMessage: contentToSend || `📎 ${currentAttachment?.fileName}`,
                lastMessageTime: savedDto.createdAt,
              }
            : c
        )
      );

      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore input on failure
      setInputText(contentToSend);
      setAttachment(currentAttachment);
      alert('Could not deliver message. Please check connection and try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle file attachment upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      const res = await uploadChatAttachment(file);
      setAttachment({
        url: res.url,
        fileName: res.fileName,
        fileType: res.fileType,
        isImage: file.type.startsWith('image/'),
      });
    } catch (err) {
      console.error('Attachment upload failed:', err);
      alert('Failed to upload file attachment: ' + err.message);
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.userName.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.jobPosition?.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchContact.toLowerCase());

      if (!matchSearch) return false;

      if (filterRole === 'UNREAD') return c.unreadCount > 0;
      if (filterRole === 'ADMIN') return c.role === 'ROLE_ADMIN' || c.role === 'ADMIN';
      if (filterRole === 'PLANNER') return c.role === 'ROLE_PLANNER' || c.role === 'PLANNER';

      return true;
    });
  }, [contacts, searchContact, filterRole]);

  // In-chat filtered messages
  const displayedMessages = useMemo(() => {
    if (!inChatSearch.trim()) return messages;
    return messages.filter((m) =>
      m.content?.toLowerCase().includes(inChatSearch.toLowerCase()) ||
      m.attachmentName?.toLowerCase().includes(inChatSearch.toLowerCase())
    );
  }, [messages, inChatSearch]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;

    displayedMessages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', date: msg.createdAt });
      }
      groups.push({ type: 'message', data: msg });
    });

    return groups;
  }, [displayedMessages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden font-sans">
      {/* TOP STATUS & ACTION BAR */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              EAC Workspace Chat
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-700/40">
                <SparklesIcon className="w-3 h-3 text-blue-500" /> Internal
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct and secure messaging between company staff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* WebSocket Live Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {wsConnected ? 'Live Connection' : 'Syncing'}
          </div>

          {/* Admin Audit Button */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/chat-audit')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm shadow-purple-500/20 transition-all hover:scale-[1.02]"
              title="Admin Monitoring & Compliance Center"
            >
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Admin Monitoring</span>
            </button>
          )}

          <button
            onClick={loadContacts}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Refresh Contacts"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* ================================================================= */}
        {/* LEFT PANE: CONTACTS & SEARCH */}
        {/* ================================================================= */}
        <div className="w-80 md:w-96 flex flex-col bg-white dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700/80">
          {/* Search Contacts */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-700/60 space-y-2.5">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, role, department..."
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              {searchContact && (
                <button
                  onClick={() => setSearchContact('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 text-[11px] font-medium overflow-x-auto no-scrollbar">
              {['ALL', 'UNREAD', 'ADMIN', 'PLANNER'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterRole(tab)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterRole === tab
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab === 'ALL' ? 'All Staff' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/40">
            {loadingContacts ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading directory...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No matching contacts found</div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const gradient = getAvatarGradient(contact.name);

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-900/20 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                      >
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {contact.name}
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {timeAgo(contact.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                          {contact.jobPosition || contact.role?.replace('ROLE_', '') || 'Staff'}
                        </span>
                        {contact.department && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-medium truncate">
                            {contact.department}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                        {contact.lastMessage || <span className="italic text-slate-400">Say hello...</span>}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {contact.unreadCount > 0 && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/30 animate-pulse">
                        {contact.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANE: ACTIVE CONVERSATION */}
        {/* ================================================================= */}
        <div className="flex-1 flex flex-col bg-slate-100/60 dark:bg-slate-900/60">
          {selectedContact ? (
            <>
              {/* Active Contact Header */}
              <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                      selectedContact.name
                    )} flex items-center justify-center text-white font-bold text-sm shadow-sm`}
                  >
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {selectedContact.name}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {selectedContact.role?.replace('ROLE_', '')}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedContact.jobPosition || 'Employee'} • {selectedContact.email}
                    </p>
                  </div>
                </div>

                {/* In-Chat Search Bar */}
                <div className="relative w-48 sm:w-60">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search in chat..."
                    value={inChatSearch}
                    onChange={(e) => setInChatSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {inChatSearch && (
                    <button
                      onClick={() => setInChatSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    <ArrowPathIcon className="w-5 h-5 animate-spin mr-2 text-blue-500" />
                    Loading conversation transcript...
                  </div>
                ) : displayedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      No messages yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Start an internal workplace conversation with {selectedContact.name}.
                    </p>
                  </div>
                ) : (
                  groupedMessages.map((item, idx) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date-${idx}`} className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-[10px] font-semibold tracking-wider uppercase">
                            {formatDividerDate(item.date)}
                          </span>
                        </div>
                      );
                    }

                    const msg = item.data;
                    const isMe =
                      msg.senderId === storedUser.id ||
                      msg.senderUserName === storedUser.userName;

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] sm:max-w-[65%] rounded-2xl p-3.5 shadow-sm transition-all ${
                            isMe
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-none'
                          }`}
                        >
                          {/* Sender name for received messages */}
                          {!isMe && (
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">
                              {msg.senderName}
                            </p>
                          )}

                          {/* Message Text */}
                          {msg.content && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content}
                            </p>
                          )}

                          {/* Attachment Display */}
                          {msg.attachmentUrl && (
                            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                              {msg.attachmentType?.startsWith('image/') ||
                              msg.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <div className="rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt={msg.attachmentName || 'Attachment'}
                                    className="max-h-60 rounded-lg cursor-pointer hover:opacity-95 transition"
                                    onClick={() => setPreviewImage(msg.attachmentUrl)}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={msg.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium transition ${
                                    isMe
                                      ? 'bg-white/10 hover:bg-white/20 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  <DocumentIcon className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate flex-1">
                                    {msg.attachmentName || 'Download File'}
                                  </span>
                                  <ArrowDownTrayIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Timestamp and Delivery Checks */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${
                              isMe ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span>
                                {msg.isRead ? (
                                  <CheckSolidIcon className="w-3 h-3 text-cyan-200 inline" title="Read" />
                                ) : (
                                  <CheckIcon className="w-3 h-3 inline text-white/70" title="Delivered" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Box */}
              {attachment && (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                    {attachment.isImage ? (
                      <PhotoIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <DocumentIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{attachment.fileName}</span>
                  </div>
                  <button
                    onClick={() => setAttachment(null)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Bottom Input Area */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-end gap-2"
              >
                {/* File Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Attach file or photo"
                >
                  {uploadingAttachment ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <PaperClipIcon className="w-5 h-5" />
                  )}
                </button>

                {/* Textarea Input */}
                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${selectedContact.name}... (Press Enter to send)`}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none max-h-32"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachment) || sending}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white shadow-md shadow-blue-500/20 transition-all hover:scale-[1.03] disabled:scale-100"
                  title="Send message"
                >
                  {sending ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5 -rotate-45 translate-x-0.5 -translate-y-0.5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
                <ChatBubbleLeftRightIcon className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Select a Colleague to Chat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                Connect in real-time with team members across engineering, attendance, management,
                and field operations.
              </p>
              {isAdmin && (
                <div className="mt-6 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-800 dark:text-purple-300 max-w-md text-left flex items-start gap-3">
                  <ShieldCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Administrator Notice:</span> As an administrator, you
                    can view company-wide message exchanges and audit conversation transcripts anytime
                    via the Admin Monitoring panel.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Enlarged attachment"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
