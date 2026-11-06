import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Users,
  Plus,
  Search,
  ArrowLeft,
  Info,
  X,
  Archive,
  BellOff,
  Pin,
  Shield,
  FolderOpen,
  Settings,
  ArrowDown,
  RefreshCw,
  LockKeyhole,
} from "lucide-react";
import { toast } from "react-toastify";
import MainSidebar from "../Eac-attendance/mainSidebar";
import ThemeToggle from "../../components/ThemeToggle";
import { useCommunication } from "./communicationContext";
import { communicationApi, request, initials, time } from "./communicationApi";
import CommunicationDialog from "./CommunicationDialog";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import EmployeeDirectory from "./EmployeeDirectory";
import "./communication.css";
import FileLoadingScreen from "../Files/FileLoadingScreen";
const dateLabel = (value) =>
  new Date(value).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export default function CommunicationPage() {
  const { me, conversations, status, revision, refresh } = useCommunication();
  const location = useLocation(),
    [params, setParams] = useSearchParams();
  const selectedId = Number(params.get("conversation")) || null;
  const [openingComplete, setOpeningComplete] = useState(false);
  const [mobilePane, setMobilePane] = useState("employees");
  useEffect(() => {
    const timer = setTimeout(() => setOpeningComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  const [filter, setFilter] = useState(
      location.pathname.endsWith("/groups") ? "groups" : "all",
    ),
    [query, setQuery] = useState(""),
    [conversation, setConversation] = useState(null),
    [messages, setMessages] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [details, setDetails] = useState(false),
    [reply, setReply] = useState(null),
    [messageQuery, setMessageQuery] = useState(""),
    [more, setMore] = useState(true),
    [olderBusy, setOlderBusy] = useState(false);
  const scroll = useRef(null),
    readPosition = useRef({ id: null, sequence: 0 }),
    typing = useRef(0),
    atBottom = useRef(true);
  useEffect(() => {
    setFilter(location.pathname.endsWith("/groups") ? "groups" : "all");
  }, [location.pathname]);
  const markRead = useCallback(
    (id, rows) => {
      if (
        document.visibilityState !== "visible" ||
        !atBottom.current ||
        !rows.length
      )
        return;
      const sequence = rows[rows.length - 1].sequence;
      if (
        readPosition.current.id === id &&
        readPosition.current.sequence >= sequence
      )
        return;
      readPosition.current = { id, sequence };
      communicationApi(
        `/conversations/${id}/receipts`,
        request("POST", { sequence, read: true }),
      )
        .then(refresh)
        .catch(() => {});
    },
    [refresh],
  );
  useEffect(() => {
    if (!selectedId || !me?.canMessage) {
      setConversation(null);
      setMessages([]);
      return;
    }
    const controller = new AbortController();
    setError("");
    if (conversation?.id !== selectedId) {
      setLoading(true);
      setConversation(null);
      setMessages([]);
      setReply(null);
      setMessageQuery("");
      atBottom.current = true;
      setMore(true);
    }
    Promise.all([
      communicationApi(`/conversations/${selectedId}`, {
        signal: controller.signal,
      }),
      communicationApi(`/conversations/${selectedId}/messages`, {
        signal: controller.signal,
      }),
    ])
      .then(([row, history]) => {
        if (controller.signal.aborted) return;
        setConversation(row);
        setMessages((old) => {
          const merged =
            old.length && old[0].conversationId === row.id
              ? [
                  ...old.filter((m) => !history.some((n) => n.id === m.id)),
                  ...history,
                ].sort((a, b) => a.sequence - b.sequence)
              : history;
          return merged;
        });
        if (history.length < 50) setMore(false);
        requestAnimationFrame(() => {
          if (atBottom.current && scroll.current)
            scroll.current.scrollTop = scroll.current.scrollHeight;
          markRead(row.id, history);
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          setConversation(null);
          setMessages([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // Reconcile the open conversation after authenticated account events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, revision, me?.canMessage, markRead]);
  useEffect(() => {
    const handle = () => {
      if (selectedId) markRead(selectedId, messages);
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [selectedId, messages, markRead]);
  const [startingEmployee, setStartingEmployee] = useState(false);
  const startEmployee = async (person) => {
    setStartingEmployee(true);
    try {
      const row = await communicationApi(
        "/conversations/direct",
        request("POST", { userId: person.userId }),
      );
      choose(row);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setStartingEmployee(false);
    }
  };
  const choose = (row) => {
    setParams({ conversation: String(row.id) });
    setDetails(false);
  };
  const run = async (action) => {
    try {
      await action();
      refresh();
      if (selectedId) {
        const [c, m] = await Promise.all([
          communicationApi(`/conversations/${selectedId}`),
          communicationApi(`/conversations/${selectedId}/messages`),
        ]);
        setConversation(c);
        setMessages((old) =>
          [...old.filter((x) => !m.some((y) => y.id === x.id)), ...m].sort(
            (a, b) => a.sequence - b.sequence,
          ),
        );
      }
    } catch (e) {
      toast.error(e.message);
    }
  };
  const action = async (kind, message, emoji) => {
    if (kind === "reply") {
      setReply(message);
      return;
    }
    if (kind === "copy") {
      try {
        await navigator.clipboard.writeText(message.text);
        toast.success("Message text copied");
      } catch {
        toast.error("Clipboard unavailable in this browser");
      }
      return;
    }
    if (["edit", "delete", "forward", "info"].includes(kind)) {
      setModal({ kind, message });
      return;
    }
    run(() =>
      communicationApi(
        `/messages/${message.id}/actions`,
        request("POST", { action: kind, emoji }),
      ),
    );
  };
  const older = async () => {
    if (!messages.length) return;
    setOlderBusy(true);
    try {
      const rows = await communicationApi(
        `/conversations/${selectedId}/messages?before=${messages[0].sequence}`,
      );
      setMessages((old) => [
        ...rows,
        ...old.filter((m) => !rows.some((x) => x.id === m.id)),
      ]);
      setMore(rows.length === 50);
      atBottom.current = false;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setOlderBusy(false);
    }
  };
  const archive = () =>
    run(() =>
      communicationApi(
        `/conversations/${selectedId}/preferences`,
        request("PATCH", { archived: !conversation.archived }),
      ),
    );
  const prefs = (field) =>
    run(() =>
      communicationApi(
        `/conversations/${selectedId}/preferences`,
        request("PATCH", { [field]: !conversation[field] }),
      ),
    );
  const [archivedRows, setArchivedRows] = useState([]);
  const listed = (filter === "archived" ? archivedRows : conversations).filter(
    (c) =>
      (filter === "archived" ? c.archived : !c.archived) &&
      (filter !== "groups" || c.type === "GROUP") &&
      (filter !== "private" || c.type === "DIRECT") &&
      (filter !== "unread" || c.unread > 0) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const [searchResult, setSearchResult] = useState(null),
    [searchCursor, setSearchCursor] = useState(0),
    [searchMore, setSearchMore] = useState(false),
    [searchBusy, setSearchBusy] = useState(false);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  useEffect(() => {
    setSearchResult(null);
    setSearchCursor(0);
    setSearchMore(false);
  }, [selectedId]);
  const searchAll = async (earlier = false) => {
    const requestedId = selectedId;
    if (!messageQuery.trim()) return;
    setSearchBusy(true);
    try {
      const result = await communicationApi(
        `/conversations/${selectedId}/search?q=${encodeURIComponent(messageQuery)}&before=${earlier ? searchCursor : 0}`,
      );
      if (selectedRef.current !== requestedId) return;
      setSearchResult((old) =>
        earlier ? [...result.messages, ...(old || [])] : result.messages,
      );
      setSearchCursor(result.nextBefore);
      setSearchMore(result.hasMore);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSearchBusy(false);
    }
  };
  const visibleMessages = (searchResult || messages).filter(
    (m) =>
      !messageQuery ||
      `${m.text} ${m.senderName} ${(m.attachments || []).map((a) => a.name).join(" ")}`
        .toLowerCase()
        .includes(messageQuery.toLowerCase()),
  );
  if (!openingComplete) return <FileLoadingScreen conversation />;
  return (
    <div
      className={`ec-root ec-shell ec-mobile-${mobilePane} ${selectedId ? "ec-chat-open" : ""}`}
    >
      <div className="ec-app-rail">
        <MainSidebar isCollapsed />
      </div>
      <nav className="ec-mobile-switcher" aria-label="Communication views">
        <button
          className={mobilePane === "employees" ? "active" : ""}
          onClick={() => setMobilePane("employees")}
        >
          <Users size={17} /> Employees
        </button>
        <button
          className={mobilePane === "chats" ? "active" : ""}
          onClick={() => setMobilePane("chats")}
        >
          <MessageCircle size={17} /> Chats
        </button>
        <ThemeToggle />
      </nav>
      <aside className="ec-conversations">
        <header className="ec-brand">
          <div>
            <span className="ec-kicker">EAC WORKSPACE</span>
            <h1>
              Communication
              <span className="ec-brand-dot" />
            </h1>
          </div>
          <button
            className="ec-round ec-primary"
            aria-label="New conversation"
            onClick={() => setModal({ kind: "direct" })}
          >
            <Plus size={20} />
          </button>
        </header>
        <div className="ec-search">
          <Search size={17} />
          <input
            aria-label="Search conversations"
            placeholder="Search conversations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <nav className="ec-chat-tabs" aria-label="Conversation filters">
          {[
            ["all", "All chats"],
            ["private", "Private"],
            ["groups", "Groups"],
            ["unread", "Unread"],
            ["archived", "Archived"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={async () => {
                setFilter(id);
                try {
                  const rows = await communicationApi(
                    `/conversations?filter=${id}`,
                  );
                  if (id === "archived") setArchivedRows(rows);
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ec-list-heading">
          <span>YOUR CONVERSATIONS</span>
          <button
            aria-label="Open employee directory"
            title="Open employee directory"
            onClick={() => setModal({ kind: "direct" })}
          >
            <Users size={17} />
          </button>
          {me?.policy.groupCreationEnabled && (
            <button
              aria-label="Create group"
              title="Create group"
              onClick={() => setModal({ kind: "group" })}
            >
              <Users size={16} />
              <Plus size={12} />
            </button>
          )}
        </div>
        <div className="ec-conversation-list">
          {listed.map((c) => (
            <button
              key={c.id}
              className={`ec-conversation-row ${selectedId === c.id ? "active" : ""}`}
              onClick={() => choose(c)}
            >
              <span className="ec-avatar">
                {c.type === "GROUP" ? <Users size={20} /> : initials(c.name)}
                {c.members.some((p) => p.id !== me?.id && p.online) && <i />}
              </span>
              <span className="ec-conversation-copy">
                <strong>{c.name}</strong>
                <small>
                  {c.lastSender
                    ? `${c.lastSender}: ${c.unread ? "New message" : "Conversation"}`
                    : "Start the conversation"}
                </small>
              </span>
              <span className="ec-conversation-meta">
                <time>{time(c.lastMessageAt)}</time>
                {c.unread > 0 ? (
                  <b>{c.unread}</b>
                ) : c.pinned ? (
                  <Pin size={12} />
                ) : null}
              </span>
            </button>
          ))}
          {!listed.length && (
            <div className="ec-list-empty">
              <MessageCircle size={26} />
              <strong>No conversations yet</strong>
              <p>
                Choose a colleague from the employee directory to get started.
              </p>
              <button onClick={() => setModal({ kind: "direct" })}>
                Open employee directory
              </button>
            </div>
          )}
        </div>
        <footer className="ec-sidebar-footer">
          <span
            className={`ec-connection ${status === "connected" ? "connected" : ""}`}
          >
            <i />
            {status === "connected"
              ? "Connected"
              : status === "offline"
                ? "Offline · retrying"
                : "Reconnecting…"}
          </span>
          <button
            aria-label="Notification preferences"
            onClick={() => setModal({ kind: "notifications" })}
          >
            <Settings size={17} />
          </button>
          <ThemeToggle />
          {me?.permissions?.length > 0 && (
            <Link
              title="Communication administration"
              to={
                me.permissions.includes("COMMUNICATION_POLICY_MANAGE")
                  ? "/admin/communication-settings"
                  : me.permissions.includes("COMMUNICATION_BACKUP_MANAGE")
                    ? "/admin/communications/backups"
                    : me.permissions.includes("COMMUNICATION_RECOVERY_MANAGE")
                      ? "/admin/communications/recovery"
                      : me.permissions.includes("COMMUNICATION_GROUP_MANAGE")
                        ? "/admin/communications/groups"
                        : me.permissions.includes("COMMUNICATION_VIEW_ALL")
                          ? "/admin/communications"
                          : "/admin/communications/audit"
              }
            >
              <Shield size={17} />
            </Link>
          )}
        </footer>
      </aside>
      <main className="ec-main">
        {!me ? (
          <div className="ec-empty">
            <RefreshCw size={32} />
            <h2>
              {status === "offline"
                ? "Communication is unavailable"
                : "Opening your workspace…"}
            </h2>
            <p>
              {status === "offline"
                ? "Check that the backend is running, then retry."
                : "Loading your account and communication permissions."}
            </p>
            {status === "offline" && <button onClick={refresh}>Retry</button>}
          </div>
        ) : !me.canMessage || !me.encryptionReady || !me.policy.enabled ? (
          <div className="ec-empty">
            <LockKeyhole size={38} />
            <h2>Communication access is required</h2>
            {me.isAdmin && !me.employeeLinked && (
              <button
                className="ec-primary"
                onClick={() => setModal({ kind: "link-employee" })}
              >
                Connect my existing employee profile
              </button>
            )}
            <p>
              {!me.canMessage
                ? "Ask your administrator to link your existing login to an active employee and grant Communication page access."
                : !me.encryptionReady
                  ? "Ask your administrator to configure the server encryption key."
                  : "Communication is currently disabled by organization policy."}
            </p>
          </div>
        ) : error ? (
          <div className="ec-empty">
            <Info size={34} />
            <h2>Conversation unavailable</h2>
            <p role="alert">{error}</p>
            <button onClick={() => setParams({})}>Back to conversations</button>
          </div>
        ) : loading ? (
          <div className="ec-empty" role="status">
            <RefreshCw className="ec-spin" size={28} />
            <p>Loading conversation…</p>
          </div>
        ) : conversation ? (
          <>
            <header className="ec-conversation-header">
              <button
                className="ec-mobile-back"
                aria-label="Back to conversations"
                onClick={() => setParams({})}
              >
                <ArrowLeft size={20} />
              </button>
              <span className="ec-avatar">
                {conversation.type === "GROUP" ? (
                  <Users size={21} />
                ) : (
                  initials(conversation.name)
                )}
              </span>
              <div>
                <h2>{conversation.name}</h2>
                <p>
                  {conversation.members
                    .filter((p) => p.id !== me.id && p.typing)
                    .map((p) => p.name)
                    .join(", ")
                    ? `${conversation.members
                        .filter((p) => p.id !== me.id && p.typing)
                        .map((p) => p.name)
                        .join(", ")} typing…`
                    : conversation.type === "GROUP"
                      ? `${conversation.members.length} members · ${conversation.announcements ? "Announcements" : "Group conversation"}`
                      : conversation.members.some(
                            (p) => p.id !== me.id && p.online,
                          )
                        ? "Online"
                        : "Private employee conversation"}
                </p>
              </div>
              <div className="ec-header-actions">
                <button
                  aria-label="Mute conversation"
                  title="Mute conversation"
                  className={conversation.muted ? "active" : ""}
                  onClick={() => prefs("muted")}
                >
                  <BellOff size={18} />
                </button>
                <button
                  aria-label="Pin conversation"
                  title="Pin conversation"
                  className={conversation.pinned ? "active" : ""}
                  onClick={() => prefs("pinned")}
                >
                  <Pin size={18} />
                </button>
                <button
                  aria-label="Archive conversation"
                  title="Archive conversation"
                  onClick={archive}
                >
                  <Archive size={18} />
                </button>
                <button
                  aria-label="Conversation information"
                  aria-expanded={details}
                  onClick={() => setDetails(!details)}
                >
                  <Info size={19} />
                </button>
                <span className="ec-mobile-chat-theme">
                  <ThemeToggle />
                </span>
              </div>
            </header>
            <div className="ec-message-search">
              <Search size={14} />
              <input
                aria-label="Search conversation messages"
                placeholder="Search this conversation…"
                value={messageQuery}
                onChange={(e) => {
                  setMessageQuery(e.target.value);
                  setSearchResult(null);
                }}
              />
              {messageQuery.trim() && (
                <button disabled={searchBusy} onClick={() => searchAll(false)}>
                  {searchBusy ? "Searching…" : "Search all history"}
                </button>
              )}
            </div>
            <div
              className="ec-messages"
              ref={scroll}
              onScroll={() => {
                const box = scroll.current;
                atBottom.current =
                  box.scrollHeight - box.scrollTop - box.clientHeight < 80;
                markRead(conversation.id, messages);
              }}
            >
              {searchResult && (
                <div className="ec-search-results">
                  <span>
                    {searchResult.length} result
                    {searchResult.length === 1 ? "" : "s"} loaded
                  </span>
                  {searchMore && (
                    <button
                      disabled={searchBusy}
                      onClick={() => searchAll(true)}
                    >
                      Search earlier messages
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSearchResult(null);
                      setMessageQuery("");
                    }}
                  >
                    Clear search
                  </button>
                </div>
              )}
              {!searchResult && more && messages.length >= 50 && (
                <button
                  className="ec-load-older"
                  disabled={olderBusy}
                  onClick={older}
                >
                  {olderBusy ? "Loading…" : "Load earlier messages"}
                </button>
              )}
              {visibleMessages.map((m, index) => (
                <div key={m.id}>
                  {(index === 0 ||
                    dateLabel(visibleMessages[index - 1].createdAt) !==
                      dateLabel(m.createdAt)) && (
                    <div className="ec-date-divider">
                      <span>{dateLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <MessageBubble message={m} me={me} onAction={action} />
                </div>
              ))}
              {messages.length === 0 && (
                <div className="ec-thread-empty">
                  <MessageCircle size={34} />
                  <h3>A new conversation</h3>
                  <p>Send your first message to {conversation.name}.</p>
                </div>
              )}
            </div>
            <button
              className="ec-jump-latest"
              title="Scroll to latest message"
              onClick={() => {
                atBottom.current = true;
                scroll.current.scrollTop = scroll.current.scrollHeight;
                markRead(conversation.id, messages);
              }}
            >
              <ArrowDown size={15} />
            </button>
            <MessageComposer
              key={conversation.id}
              conversation={conversation}
              me={me}
              reply={reply}
              onCancelReply={() => setReply(null)}
              onTyping={() => {
                if (Date.now() - typing.current > 2500) {
                  typing.current = Date.now();
                  communicationApi(`/conversations/${selectedId}/typing`, {
                    method: "POST",
                  }).catch(() => {});
                }
              }}
              onSend={async (payload) => {
                const row = await communicationApi(
                  `/conversations/${conversation.id}/messages`,
                  request("POST", payload),
                );
                setMessages((old) =>
                  [...old.filter((m) => m.id !== row.id), row].sort(
                    (a, b) => a.sequence - b.sequence,
                  ),
                );
                atBottom.current = true;
                requestAnimationFrame(() => {
                  if (scroll.current)
                    scroll.current.scrollTop = scroll.current.scrollHeight;
                });
                refresh();
              }}
            />
          </>
        ) : (
          <section
            className="ec-directory-home"
            aria-label="Employee directory"
          >
            <header>
              <span className="ec-kicker">YOUR TEAM, CONNECTED</span>
              <h2>Employee directory</h2>
              <p>Find your colleagues and start a private conversation.</p>
            </header>
            <EmployeeDirectory
              onSelect={startEmployee}
              busy={startingEmployee}
            />
          </section>
        )}
      </main>
      {details && conversation && (
        <aside className="ec-info-panel">
          <header>
            <h3>Conversation details</h3>
            <button
              aria-label="Close information"
              onClick={() => setDetails(false)}
            >
              <X size={18} />
            </button>
          </header>
          <span className="ec-avatar ec-avatar-large">
            {initials(conversation.name)}
          </span>
          <h3>{conversation.name}</h3>
          <p className="ec-muted">
            {conversation.description ||
              "Your organization’s internal communication workspace."}
          </p>
          <h4>MEMBERS · {conversation.members.length}</h4>
          {conversation.members.map((p) => (
            <div className="ec-member" key={p.id}>
              <span className="ec-avatar">{initials(p.name)}</span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.manager
                    ? "Group administrator"
                    : p.department || "Employee"}
                </small>
              </span>
              {conversation.manager &&
                conversation.type === "GROUP" &&
                p.id !== me.id && (
                  <button
                    aria-label={`Manage ${p.name}`}
                    onClick={() => setModal({ kind: "member", person: p })}
                  >
                    <Settings size={14} />
                  </button>
                )}
            </div>
          ))}
          {conversation.manager && conversation.type === "GROUP" && (
            <button
              className="ec-group-manage"
              onClick={() => setModal({ kind: "manage-group" })}
            >
              <Settings size={16} /> Manage group
            </button>
          )}
          <h4>SHARED FILES · LOADED MESSAGES</h4>
          {messages
            .flatMap((m) =>
              (m.attachments || []).map((a) => ({ ...a, messageId: m.id })),
            )
            .slice(-12)
            .map((a, index) => (
              <div className="ec-shared-file" key={`${a.messageId}-${index}`}>
                <FolderOpen size={16} />
                <span>{a.name}</span>
              </div>
            ))}
          {conversation.type === "GROUP" && (
            <button
              className="ec-danger"
              onClick={() => setModal({ kind: "leave" })}
            >
              Leave group
            </button>
          )}
          <button
            onClick={async () => {
              try {
                await communicationApi(
                  `/conversations/${conversation.id}/preferences`,
                  request("PATCH", { unread: true }),
                );
                readPosition.current = { id: null, sequence: 0 };
                setParams({});
                refresh();
              } catch (e) {
                toast.error(e.message);
              }
            }}
          >
            Mark as unread
          </button>
          {me.policy.conversationDeletionEnabled && conversation.manager && (
            <button
              className="ec-danger"
              onClick={() => setModal({ kind: "delete-conversation" })}
            >
              Remove conversation
            </button>
          )}
        </aside>
      )}
      {modal && (
        <CommunicationDialog
          modal={modal}
          conversation={conversation}
          conversations={conversations}
          onClose={() => setModal(null)}
          onDone={(row) => {
            setModal(null);
            refresh();
            if (row) choose(row);
          }}
          run={run}
        />
      )}
    </div>
  );
}
