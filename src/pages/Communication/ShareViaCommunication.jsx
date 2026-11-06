/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, Send } from "lucide-react";
import { FileModal } from "../Files/FileDialogs";
import { communicationApi, request, initials } from "./communicationApi";
import { useCommunication } from "./communicationContext";
import "./communication.css";
export default function ShareViaCommunication({ files, onClose }) {
  const { conversations, refresh } = useCommunication();
  const navigate = useNavigate();
  const [query, setQuery] = useState(""),
    [people, setPeople] = useState([]),
    [target, setTarget] = useState(null),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(null);
  const [clientId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        communicationApi(`/directory?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
          .then(setPeople)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      const conversation =
        target.kind === "person"
          ? await communicationApi(
              "/conversations/direct",
              request("POST", { userId: target.id }),
            )
          : target;
      await communicationApi(
        `/conversations/${conversation.id}/messages`,
        request("POST", { clientId, text, fileIds: files.map((f) => f.id) }),
      );
      setSent(conversation.id);
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ec-root">
      <FileModal title="Share via Communication" onClose={onClose}>
        {sent ? (
          <div className="ec-share-success">
            <MessageCircle size={36} />
            <h3>Files shared successfully</h3>
            <p>The backend confirmed your message.</p>
            <button
              className="ec-primary"
              onClick={() => {
                onClose();
                navigate(`/communication?conversation=${sent}`);
              }}
            >
              View conversation
            </button>
          </div>
        ) : (
          <>
            <p className="ec-muted">
              Recipients must already have access to existing files. Use File
              Management’s Share action to grant access explicitly.
            </p>
            <div className="ec-shared-selection">
              {files.map((f) => (
                <span key={f.id}>{f.name}</span>
              ))}
            </div>
            <div className="ec-picker-filter">
              <Search size={16} />
              <input
                aria-label="Search employees or conversations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search employees or groups…"
              />
            </div>
            <div className="ec-picker-list">
              <small>YOUR CONVERSATIONS</small>
              {conversations
                .filter((c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((c) => (
                  <button
                    className={
                      target?.kind === "conversation" && target.id === c.id
                        ? "selected"
                        : ""
                    }
                    key={`c${c.id}`}
                    onClick={() => setTarget({ ...c, kind: "conversation" })}
                  >
                    <span className="ec-avatar">{initials(c.name)}</span>
                    <strong>{c.name}</strong>
                  </button>
                ))}
              <small>EMPLOYEE DIRECTORY</small>
              {people.map((p) => (
                <button
                  className={
                    target?.kind === "person" && target.id === p.id
                      ? "selected"
                      : ""
                  }
                  key={`p${p.id}`}
                  onClick={() => setTarget({ ...p, kind: "person" })}
                >
                  <span className="ec-avatar">{initials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.employeeId}</small>
                  </span>
                </button>
              ))}
              {!people.length && !conversations.length && (
                <p>No eligible recipients yet.</p>
              )}
            </div>
            <label className="ec-form">
              Optional message
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={10000}
              />
            </label>
            {error && (
              <p className="ec-error" role="alert">
                {error}
              </p>
            )}
            <footer className="ec-actions">
              <button onClick={onClose}>Cancel</button>
              <button
                className="ec-primary"
                disabled={busy || !target || !files.length || files.length > 5}
                onClick={send}
              >
                <Send size={16} /> {busy ? "Sending…" : "Send files"}
              </button>
            </footer>
          </>
        )}
      </FileModal>
    </div>
  );
}
