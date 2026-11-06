/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, ArrowUpRight } from "lucide-react";
import { getToken } from "../../utils/auth";
import {
  communicationApi,
  socketUrl,
  initials,
  request,
} from "./communicationApi";
import { CommunicationContext } from "./communicationContext";
import "./communication.css";
export default function CommunicationProvider({ children }) {
  const location = useLocation(),
    navigate = useNavigate(),
    authToken = getToken();
  const [me, setMe] = useState(null),
    [conversations, setConversations] = useState([]),
    [notices, setNotices] = useState([]),
    [status, setStatus] = useState("connecting"),
    [opened, setOpened] = useState(false),
    [revision, setRevision] = useState(0);
  const meRef = useRef(null),
    conversationsRef = useRef([]),
    activeConversation = useRef(null),
    refreshRef = useRef(null),
    sound = useRef(null),
    noticeActive = useRef(false),
    session = useRef({ token: null, announced: false }),
    refreshVersion = useRef(0);
  activeConversation.current = location.pathname.startsWith("/communication")
    ? Number(new URLSearchParams(location.search).get("conversation")) || null
    : null;
  const refresh = useCallback(async () => {
    const token = getToken();
    if (session.current.token !== token) {
      session.current = { token, announced: false };
      noticeActive.current = false;
      meRef.current = null;
      conversationsRef.current = [];
      setMe(null);
      setConversations([]);
      setNotices([]);
      setOpened(false);
    }
    const authSession = session.current,
      version = ++refreshVersion.current;
    const current = () =>
      session.current === authSession &&
      getToken() === token &&
      refreshVersion.current === version;
    if (!token) {
      setMe(null);
      setConversations([]);
      setNotices([]);
      return;
    }
    try {
      const profile = await communicationApi("/me");
      if (!current()) return;
      setMe(profile);
      meRef.current = profile;
      if (
        profile.canMessage &&
        profile.encryptionReady &&
        profile.policy.enabled
      ) {
        const loadNotices = !authSession.announced || noticeActive.current;
        const [rows, pending] = await Promise.all([
          communicationApi("/conversations"),
          loadNotices
            ? communicationApi("/notifications").catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!current()) return;
        conversationsRef.current = rows;
        setConversations(rows);
        if (pending !== null) {
          authSession.announced = true;
          noticeActive.current = pending.length > 0;
          setNotices(pending);
        }
      } else {
        setConversations([]);
        setNotices([]);
      }
    } catch {
      if (current()) setStatus("offline");
    }
  }, []);
  refreshRef.current = refresh;
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh, location.pathname, authToken]);
  const sessionReady =
    Boolean(authToken) && session.current.token === authToken;
  useEffect(() => {
    if (
      !sessionReady ||
      !me?.canMessage ||
      !me?.encryptionReady ||
      !me?.policy?.enabled
    )
      return;
    let closed = false,
      ws,
      retry,
      ping,
      delay = 1000;
    const seen = new Set();
    const connect = () => {
      if (closed || getToken() !== authToken) return;
      setStatus("connecting");
      ws = new WebSocket(socketUrl());
      ws.onopen = () => {
        if (getToken() === authToken)
          ws.send(JSON.stringify({ type: "authenticate", token: authToken }));
        else ws.close();
      };
      ws.onmessage = (event) => {
        if (getToken() !== authToken) return;
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "connected") {
          setStatus("connected");
          delay = 1000;
          refreshRef.current();
          ping = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify({ type: "ping" }));
          }, 15000);
          return;
        }
        if (data.eventId && seen.has(data.eventId)) return;
        if (data.eventId) {
          seen.add(data.eventId);
          if (seen.size > 1000) seen.delete(seen.values().next().value);
        }
        const incoming =
          data.type === "message" && data.senderId !== meRef.current?.id;
        const muted = conversationsRef.current.find(
          (c) => c.id === data.conversationId,
        )?.muted;
        if (
          incoming &&
          !muted &&
          activeConversation.current !== data.conversationId
        )
          noticeActive.current = true;
        setRevision((n) => n + 1);
        refreshRef.current();
        if (incoming) {
          if (data.sequence)
            communicationApi(
              `/conversations/${data.conversationId}/receipts`,
              request("POST", { sequence: data.sequence, read: false }),
            ).catch(() => {});
          if (!muted && activeConversation.current !== data.conversationId) {
            if (
              localStorage.getItem("eac-communication-desktop") === "true" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              const notification = new Notification("EAC Communication", {
                body: `${data.senderName} sent you a message`,
                tag: `eac-${data.conversationId}`,
              });
              notification.onclick = () => {
                window.focus();
                navigate(`/communication?conversation=${data.conversationId}`);
                notification.close();
              };
            }
            if (localStorage.getItem("eac-communication-sound") === "true")
              try {
                const ctx =
                  sound.current ||
                  (sound.current = new (
                    window.AudioContext || window.webkitAudioContext
                  )());
                const tone = ctx.createOscillator(),
                  volume = ctx.createGain();
                volume.gain.value = 0.035;
                tone.frequency.value = 660;
                tone.connect(volume);
                volume.connect(ctx.destination);
                tone.start();
                tone.stop(ctx.currentTime + 0.12);
              } catch {
                /* Audio can require a gesture. */
              }
          }
        }
      };
      ws.onerror = () => setStatus("offline");
      ws.onclose = () => {
        clearInterval(ping);
        if (!closed && getToken() === authToken) {
          setStatus("reconnecting");
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 30000);
        }
      };
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(ping);
      ws?.close();
    };
  }, [
    sessionReady,
    me?.id,
    me?.canMessage,
    me?.encryptionReady,
    me?.policy?.enabled,
    authToken,
    navigate,
  ]);
  const unread = sessionReady
    ? conversations.reduce((n, c) => n + c.unread, 0)
    : 0;
  const authPage = [
    "/",
    "/login",
    "/signin",
    "/signup",
    "/forgot-password",
    "/must-change-password",
  ].includes(location.pathname);
  const dismissNotices = () => {
    noticeActive.current = false;
    setNotices([]);
  };
  const openNotice = (id) => {
    dismissNotices();
    setOpened(false);
    navigate(`/communication?conversation=${id}`);
  };
  return (
    <CommunicationContext.Provider
      value={{
        me: sessionReady ? me : null,
        conversations: sessionReady ? conversations : [],
        status,
        revision,
        refresh,
        unread,
      }}
    >
      {children}
      {sessionReady && !authPage && notices.length > 0 && (
        <aside
          className="ec-login-banner"
          aria-label="New message notifications"
          role="status"
          aria-live="polite"
        >
          <header>
            <span className="ec-banner-icon">
              <MessageCircle size={21} />
            </span>
            <div>
              <strong>Messages waiting for you</strong>
              <small>
                {notices.reduce((n, item) => n + item.unread, 0)} unread message
                {notices.reduce((n, item) => n + item.unread, 0) === 1
                  ? ""
                  : "s"}
              </small>
            </div>
            <button
              aria-label="Dismiss message banner"
              onClick={dismissNotices}
            >
              <X size={18} />
            </button>
          </header>
          <div className="ec-banner-messages">
            {notices.map((item) => (
              <button
                className="ec-banner-message"
                key={item.conversationId}
                onClick={() => openNotice(item.conversationId)}
              >
                <span className="ec-avatar">{initials(item.senderName)}</span>
                <span className="ec-banner-message-copy">
                  <strong>
                    {item.senderName}
                    <b>{item.unread}</b>
                  </strong>
                  {item.name !== item.senderName && <small>{item.name}</small>}
                  <p>{item.preview}</p>
                  <em>
                    Open conversation <ArrowUpRight size={13} />
                  </em>
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}
      {unread > 0 &&
        !authPage &&
        !location.pathname.startsWith("/communication") && (
          <div className="ec-notifications">
            <button
              className="ec-notification-bell"
              aria-label={`${unread} unread messages`}
              onClick={() => setOpened(!opened)}
            >
              <MessageCircle size={19} />
              <span>{unread}</span>
            </button>
            {opened && (
              <section aria-label="Unread messages">
                <header>
                  <strong>New messages</strong>
                  <button
                    aria-label="Close messages"
                    onClick={() => setOpened(false)}
                  >
                    <X size={16} />
                  </button>
                </header>
                {conversations
                  .filter((c) => c.unread)
                  .slice(0, 5)
                  .map((c) => (
                    <button key={c.id} onClick={() => openNotice(c.id)}>
                      <span className="ec-avatar">{initials(c.name)}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {c.lastSender} · {c.unread} unread
                        </small>
                      </span>
                    </button>
                  ))}
              </section>
            )}
          </div>
        )}
    </CommunicationContext.Provider>
  );
}
