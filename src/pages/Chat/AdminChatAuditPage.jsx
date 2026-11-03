// src/pages/Chat/AdminChatAuditPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAdminAllConversations,
  fetchAdminConversationAudit,
  createChatWebSocketClient,
} from '../../services/chatService';
import {
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  ChevronRightIcon,
  XMarkIcon,
  RadioIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

function formatFullDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function AdminChatAuditPage() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('THREADS'); // 'THREADS' | 'LIVE_FEED'

  // Selected thread for audit
  const [selectedThread, setSelectedThread] = useState(null);
  const [auditTranscript, setAuditTranscript] = useState([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [keywordSearch, setKeywordSearch] = useState('');

  // Live feed stream
  const [liveStream, setLiveStream] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Load all company conversation summaries
  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminAllConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Real-time admin audit stream
  useEffect(() => {
    const client = createChatWebSocketClient({
      onAdminAuditMessage: (msg) => {
        setLiveStream((prev) => [msg, ...prev.slice(0, 99)]);

        // Also update transcript if active thread matches
        if (
          selectedThread &&
          ((msg.senderId === selectedThread.user1Id && msg.recipientId === selectedThread.user2Id) ||
            (msg.senderId === selectedThread.user2Id && msg.recipientId === selectedThread.user1Id))
        ) {
          setAuditTranscript((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      },
      onConnectionChange: (connected) => {
        setWsConnected(connected);
      },
    });

    return () => {
      client.disconnect();
    };
  }, [selectedThread]);

  // Load audit transcript when thread is selected
  useEffect(() => {
    if (!selectedThread) return;

    const loadTranscript = async () => {
      try {
        setTranscriptLoading(true);
        const data = await fetchAdminConversationAudit(
          selectedThread.user1Id,
          selectedThread.user2Id,
          keywordSearch
        );
        setAuditTranscript(data);
      } catch (err) {
        console.error('Failed to load audit transcript:', err);
      } finally {
        setTranscriptLoading(false);
      }
    };

    loadTranscript();
  }, [selectedThread, keywordSearch]);

  // Filter conversation summaries
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const q = searchFilter.toLowerCase();
      return (
        c.user1Name.toLowerCase().includes(q) ||
        c.user2Name.toLowerCase().includes(q) ||
        c.user1JobPosition?.toLowerCase().includes(q) ||
        c.user2JobPosition?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchFilter]);

  // Metrics
  const totalMonitoredMessages = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.totalMessages || 0), 0);
  }, [conversations]);

  const uniqueUsersCount = useMemo(() => {
    const userIds = new Set();
    conversations.forEach((c) => {
      userIds.add(c.user1Id);
      userIds.add(c.user2Id);
    });
    return userIds.size;
  }, [conversations]);

  // Export transcript as CSV
  const handleExportCSV = () => {
    if (!selectedThread || auditTranscript.length === 0) return;

    const headers = ['Message ID', 'Timestamp', 'Sender Name', 'Sender Role', 'Recipient Name', 'Content', 'Attachment'];
    const rows = auditTranscript.map((m) => [
      m.id,
      m.createdAt,
      `"${m.senderName}"`,
      `"${m.senderRole}"`,
      `"${m.recipientName}"`,
      `"${(m.content || '').replace(/"/g, '""')}"`,
      `"${m.attachmentUrl || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Audit_${selectedThread.user1Name}_and_${selectedThread.user2Name}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-300">
              <ShieldCheckIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Company Chat Monitoring & Audit Center
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Admin Only
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Full transparency oversight for organizational compliance, dispute resolution, and security auditing across all staff communications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center gap-2"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Back to Chat Hub</span>
            </button>
            <button
              onClick={loadConversations}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-900/60">
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
            <p className="text-xs text-slate-400">Active Threads</p>
            <p className="text-2xl font-bold text-white mt-0.5">{conversations.length}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
            <p className="text-xs text-slate-400">Total Monitored Messages</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{totalMonitoredMessages}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
            <p className="text-xs text-slate-400">Participating Staff</p>
            <p className="text-2xl font-bold text-purple-300 mt-0.5">{uniqueUsersCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
            <p className="text-xs text-slate-400">Live Audit Stream</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="text-sm font-semibold text-white">
                {wsConnected ? 'Streaming Live' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('THREADS')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'THREADS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <UserGroupIcon className="w-4 h-4" />
          <span>Conversation Threads ({filteredConversations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LIVE_FEED')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'LIVE_FEED'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <RadioIcon className="w-4 h-4 text-emerald-500" />
          <span>Real-time Live Stream ({liveStream.length})</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'THREADS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: THREADS LIST */}
          <div className="lg:col-span-5 space-y-3">
            {/* Search filter */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee name, role, or message content..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Conversation cards */}
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl">
                  Loading company threads...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-xl">
                  No conversation threads match criteria
                </div>
              ) : (
                filteredConversations.map((thread, idx) => {
                  const isSelected =
                    selectedThread?.user1Id === thread.user1Id &&
                    selectedThread?.user2Id === thread.user2Id;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedThread(thread)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Users Pair Header */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                            <span className="truncate">{thread.user1Name}</span>
                            <span className="text-slate-400 font-normal">↔</span>
                            <span className="truncate">{thread.user2Name}</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{thread.user1JobPosition || 'Staff'}</span>
                            <span>•</span>
                            <span>{thread.user2JobPosition || 'Staff'}</span>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {timeAgo(thread.lastMessageTime)}
                        </span>
                      </div>

                      {/* Latest Message Snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-2 bg-slate-50 dark:bg-slate-700/40 p-2 rounded-lg font-mono text-[11px]">
                        {thread.lastMessage || 'Attachment'}
                      </p>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-500">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {thread.totalMessages} Messages
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          Inspect <ChevronRightIcon className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: TRANSCRIPT AUDIT INSPECTOR */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[695px] overflow-hidden">
            {selectedThread ? (
              <>
                {/* Transcript Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>{selectedThread.user1Name}</span>
                      <span className="text-slate-400 font-normal">↔</span>
                      <span>{selectedThread.user2Name}</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Audit transcript ({auditTranscript.length} messages)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                      title="Export CSV"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                      title="Print Transcript"
                    >
                      <PrinterIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Keyword search inside transcript */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search keywords in this transcript..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {keywordSearch && (
                      <button
                        onClick={() => setKeywordSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Transcript Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  {transcriptLoading ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading transcript...</div>
                  ) : auditTranscript.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No messages in transcript</div>
                  ) : (
                    auditTranscript.map((msg, i) => {
                      const isUser1 = msg.senderId === selectedThread.user1Id;

                      return (
                        <div
                          key={msg.id || i}
                          className={`p-3 rounded-xl border text-xs shadow-sm ${
                            isUser1
                              ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/40 ml-0 mr-8'
                              : 'bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-900/40 ml-8 mr-0'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5 mb-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isUser1 ? 'bg-blue-500' : 'bg-purple-500'
                                }`}
                              />
                              {msg.senderName} ({msg.senderRole?.replace('ROLE_', '')})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatFullDate(msg.createdAt)}
                            </span>
                          </div>

                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>

                          {msg.attachmentUrl && (
                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                📎 {msg.attachmentName || 'Attachment'}
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ShieldCheckIcon className="w-12 h-12 stroke-[1.2] text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Select a Conversation Thread to Inspect
                </p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Click any conversation pair on the left to review its complete audit history, keyword search statements, or download compliance transcripts.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LIVE FEED STREAM */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <RadioIcon className="w-5 h-5 text-emerald-500 animate-pulse" />
                Live Organization Message Stream
              </h3>
              <p className="text-xs text-slate-500">
                Incoming messages across all staff members appear here in real-time as they are transmitted.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {liveStream.length} real-time events logged this session
            </span>
          </div>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto">
            {liveStream.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Listening for real-time messages... As soon as employees send messages, they will appear here live.
              </div>
            ) : (
              liveStream.map((msg, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                      <span className="text-blue-600 dark:text-blue-400">{msg.senderName}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{msg.recipientName}</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-200">{msg.content}</p>
                    {msg.attachmentName && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        📎 {msg.attachmentName}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {formatFullDate(msg.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
