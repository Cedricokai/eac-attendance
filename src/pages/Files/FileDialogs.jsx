/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, useId } from "react";
import {
  Search,
  X,
  UserPlus,
  Trash2,
  History,
  Folder,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  fileApi,
  employeeSharingRecipients,
  jsonRequest,
  fileBlob,
  downloadBlob,
  bytes,
  date,
} from "./fileApi";

export function FileModal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prior = document.activeElement;
    const panel = ref.current;
    if (!panel.contains(document.activeElement)) {
      const input = panel.querySelector(
        'input:not(:disabled):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),textarea:not(:disabled),select:not(:disabled)',
      );
      (input || panel).focus({ preventScroll: true });
    }
    const key = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      event.stopPropagation();
      const nodes = ref.current?.querySelectorAll(
        'button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
      );
      if (!nodes?.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", key);
    return () => {
      panel.removeEventListener("keydown", key);
      if (prior?.isConnected) prior.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div
      className="fm-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fm-modal ${wide ? "fm-modal-wide" : ""}`}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function NameDialog({ title, initial = "", submit, onClose }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <FileModal title={title} onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await submit(name);
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            autoFocus
            maxLength={180}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && (
          <p className="fm-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="fm-primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </button>
        </footer>
      </form>
    </FileModal>
  );
}

export function ShareDialog({ item, onClose, refresh }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [shares, setShares] = useState([]);
  const [recipient, setRecipient] = useState("");
  const [external, setExternal] = useState(false);
  const [access, setAccess] = useState("SAVED");
  const [allowDownload, setAllowDownload] = useState(false);
  const [expiry, setExpiry] = useState("");
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fileApi(`/${item.id}/shares`)
      .then(setShares)
      .catch((e) => setError(e.message));
  }, [item.id]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        employeeSharingRecipients(query, controller.signal)
          .then(setPeople)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const send = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await fileApi(
        `/${item.id}/share`,
        jsonRequest("POST", {
          userId: Number(recipient),
          access: access === "SAVED" ? null : access,
          useSavedAccess: access === "SAVED",
          allowDownload,
          expiresAt: expiry ? new Date(expiry).toISOString() : null,
          notifyEmail: notify,
        }),
      );
      toast.success(
        result.emailDelivery === "failed"
          ? "Access granted. Email delivery failed; share the file link manually."
          : "Access granted",
      );
      setShares(await fileApi(`/${item.id}/shares`));
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FileModal title={`Share “${item.name}”`} onClose={onClose}>
      <p className="fm-muted">
        Access applies to this item and the contents of shared folders.
        Recipients also need File Management page access.
      </p>
      <form onSubmit={send}>
        <label>
          <Search size={16} /> Find an employee
          <input
            placeholder="Name, employee ID, email or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Recipient
          <select
            required
            value={recipient}
            onChange={(e) => {setRecipient(e.target.value);const existing=shares.find(s=>s.userId===Number(e.target.value));setAllowDownload(existing ? existing.allowDownload !== false : false);}}
          >
            <option value="">Select an employee account</option>
            {people.map((p) => (
              <option key={p.userId ?? `employee-${p.employeeId}`} value={p.userId ?? ""} disabled={p.userId == null}>
                {p.name} · {p.employeeId || p.email}{p.userId == null ? " · No active linked account" : ""}
              </option>
            ))}
          </select>
          {people.length === 0 && (
            <small>
              No matching employees.
            </small>
          )}
        </label>
        <div className="fm-two">
          <label>
            Permission
            <select value={access} onChange={(e) => setAccess(e.target.value)}>
              <option value="SAVED">Use saved file access</option>
              {["VIEWER", "COMMENTER", "EDITOR", "MANAGER"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Expires (optional)
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
        </div>
        <p className="fm-muted">Saved file access uses this employee’s saved sheet assignments. Cell locks, sheet restrictions and the document opening password remain applied. Apply and save pending sheet changes first. For files without sheet assignments, existing access is kept; new recipients receive Viewer access. Manager access allows changing permissions.</p>
        <label className="fm-check">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />{" "}
          Send email notification
        </label>
        <label className="fm-check"><input type="checkbox" checked={allowDownload} onChange={e=>setAllowDownload(e.target.checked)}/>Allow employee to download the original or saved file</label>
        <p className="fm-muted">Turn off for online access only. This also blocks earlier-version downloads, password exports and copying into another file. Owners and ADMIN retain access. Screen capture cannot be prevented.</p>
        <button className="fm-primary" disabled={busy || !recipient}>
          <UserPlus size={16} />
          {busy ? "Sharing…" : access === "SAVED" ? "Send with saved access" : "Grant access"}
        </button>
      </form>
      {error && (
        <p className="fm-error" role="alert">
          {error}
        </p>
      )}
      <h3>Manage access</h3>
      {!item.folder && (
        <button onClick={() => setExternal(true)}>
          Invite External Person
        </button>
      )}
      {external && (
        <ExternalInvitationDialog
          item={item}
          onClose={() => setExternal(false)}
        />
      )}
      <p className="fm-muted">
        Owner: {item.owner}. Permissions inherited from parent folders must be
        changed on that folder.
      </p>
      {shares.length === 0 && <p>No direct shares yet.</p>}
      {shares.map((s) => (
        <div className="fm-access" key={s.id}>
          <span>
            <strong>{s.name}</strong>
            <small>
              {s.email} · {s.access} · {s.allowDownload === false ? "Downloads blocked" : "Downloads allowed"}
              {s.expiresAt && ` · Expires ${date(s.expiresAt)}`}
            </small>
          </span>
          <button
            aria-label={`Revoke ${s.name}`}
            onClick={async () => {
              try {
                await fileApi(`/${item.id}/shares/${s.id}`, {
                  method: "DELETE",
                });
                setShares(shares.filter((v) => v.id !== s.id));
                refresh();
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </FileModal>
  );
}

export function HistoryDialog({ item, onClose, refresh }) {
  const [versions, setVersions] = useState([]);
  const [current, setCurrent] = useState(item);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let loading = false;
    const load = async () => {
      if (loading) return; loading = true;
      try {
        const [history, saved] = await Promise.all([
          fileApi(`/${item.id}/versions`, { signal: controller.signal }),
          fileApi(`/${item.id}`, { signal: controller.signal }),
        ]);
        setVersions(history); setCurrent(saved);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { loading = false; }
    };
    load(); const timer = setInterval(load, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [item.id]);
  return (
    <FileModal title="Version history" onClose={onClose}>
      <p className="fm-muted">
        {item.name} · Originals and earlier versions stay intact when you
        restore.
      </p>
      {error && (
        <p role="alert" className="fm-error">
          {error}
        </p>
      )}
      {versions.map((v) => (
        <article className="fm-version" key={v.number}>
          <History size={20} />
          <div>
            <strong>
              Version {v.number}
              {v.number === current.currentVersion ? " · Current" : ""}
            </strong>
            <p>
              {v.reason} · {bytes(v.sizeBytes)}
            </p>
            <div className="fm-version-employee-bar">
              <span className="fm-version-employee-avatar" aria-hidden="true">
                {(v.editor || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
              </span>
              <span className="fm-version-employee-details">
                <strong>{v.editor || "Employee unavailable"}</strong>
                <small>{v.reason?.startsWith("ONLYOFFICE") ? "Last editor reported by ONLYOFFICE" : "Version created by"}</small>
                <time dateTime={v.createdAt}>{date(v.createdAt)}</time>
              </span>
              <span className="fm-version-saved"><CheckCircle2 size={14} />Saved</span>
            </div>
          </div>
          <div>
            <button
              disabled={busy || item.canDownload === false}
              onClick={async () => {
                try {
                  downloadBlob(await fileBlob(item, v.number), item.name);
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Download
            </button>
            {["OWNER", "MANAGER", "EDITOR"].includes(item.access) &&
              v.number !== current.currentVersion && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const updated = await fileApi(
                        `/${item.id}/versions/${v.number}/restore`,
                        jsonRequest("POST", { revision: current.revision }),
                      );
                      setCurrent(updated);
                      setVersions(await fileApi(`/${item.id}/versions`));
                      refresh();
                      toast.success("Version restored as a new version");
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Restore
                </button>
              )}
          </div>
        </article>
      ))}
    </FileModal>
  );
}

export function DestinationDialog({ item, mode, onClose, refresh }) {
  const [parent, setParent] = useState(null);
  const [trail, setTrail] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fileApi(`?size=100${parent ? `&parentId=${parent}` : ""}`)
      .then((p) =>
        setFolders(p.content.filter((f) => f.folder && f.id !== item.id)),
      )
      .catch((e) => setError(e.message));
  }, [parent, item.id]);
  return (
    <FileModal
      title={`${mode === "move" ? "Move" : "Copy"} ${item.name}`}
      onClose={onClose}
    >
      <p className="fm-muted">Choose a destination folder.</p>
      <div className="fm-crumbs">
        <button
          onClick={() => {
            setParent(null);
            setTrail([]);
          }}
        >
          My files
        </button>
        {trail.map((t, i) => (
          <button
            key={t.id}
            onClick={() => {
              setParent(t.id);
              setTrail(trail.slice(0, i + 1));
            }}
          >
            {t.name}
          </button>
        ))}
      </div>
      {folders.map((f) => (
        <button
          className="fm-folder-choice"
          key={f.id}
          onClick={() => {
            setParent(f.id);
            setTrail([...trail, f]);
          }}
        >
          <Folder size={22} />
          {f.name}
          <ChevronRight size={16} />
        </button>
      ))}
      {error && <p className="fm-error">{error}</p>}
      <footer>
        <button onClick={onClose}>Cancel</button>
        <button
          className="fm-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await fileApi(
                `/${item.id}/${mode}`,
                jsonRequest("POST", {
                  parentId: parent,
                  revision: item.revision,
                }),
              );
              refresh();
              onClose();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "move" ? "Move here" : "Copy here"}
        </button>
      </footer>
    </FileModal>
  );
}

export function CommentsDialog({ item, onClose, inline = false }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [thread, setThread] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const writable = ["OWNER", "MANAGER", "EDITOR", "COMMENTER"].includes(
    item.access,
  );
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const rows = await fileApi(`/${item.id}/comments`, { signal: controller.signal });
        if (!controller.signal.aborted) setComments(rows);
      } catch (e) {
        if (!controller.signal.aborted) { setComments([]); setError(e.message); }
      } finally { running = false; }
    };
    refresh();
    const interval = inline ? setInterval(refresh, 5000) : null;
    return () => { controller.abort(); clearInterval(interval); };
  }, [item.id, inline]);
  const reload = async () => setComments(await fileApi(`/${item.id}/comments`));
  const content = (<>
      {error && (
        <p className="fm-error" role="alert">
          {error}
        </p>
      )}
      {!comments.length && (
        <p className="fm-muted">
          Start a discussion about this file. Mention an account with @username
          (up to 10 people who already have access). Comments are attached to
          the file, rather than a text selection.
        </p>
      )}
      {comments
        .filter((c) => c.threadId === null)
        .map((c) => (
          <article className="fm-version" key={c.id}>
            <div style={{ flex: 1 }}>
              <strong>
                {c.author}
                {c.resolved ? " · Resolved" : ""}
              </strong>
              <small>{date(c.createdAt)}</small>
              <p
                style={{
                  whiteSpace: "pre-wrap",
                  color: "#44536b",
                  fontSize: 13,
                }}
              >
                {c.body}
              </p>
              {comments
                .filter((reply) => reply.threadId === c.id)
                .map((reply) => (
                  <div
                    key={reply.id}
                    style={{
                      borderLeft: "2px solid #e0e8f5",
                      paddingLeft: 12,
                      marginTop: 15,
                    }}
                  >
                    <strong>{reply.author}</strong>
                    <p style={{ whiteSpace: "pre-wrap" }}>{reply.body}</p>
                    <small>{date(reply.createdAt)}</small>
                  </div>
                ))}
              {writable && (
                <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
                  <button disabled={c.resolved} onClick={() => setThread(c.id)}>
                    Reply
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await fileApi(
                          `/${item.id}/comments/${c.id}?resolved=${!c.resolved}`,
                          { method: "PUT" },
                        );
                        await reload();
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    {c.resolved ? "Reopen" : "Resolve"}
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      {writable && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await fileApi(
                `/${item.id}/comments`,
                jsonRequest("POST", { body, threadId: thread }),
              );
              await reload();
              setBody("");
              setThread(null);
              setError("");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {thread ? "Reply to thread" : "New comment"}
            <textarea
              required
              maxLength={4000}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <footer>
            {thread && (
              <button type="button" onClick={() => setThread(null)}>
                Cancel reply
              </button>
            )}
            <button disabled={busy || !body.trim()} className="fm-primary">
              {busy ? "Posting…" : "Post comment"}
            </button>
          </footer>
        </form>
      )}
    </>);
  return inline
    ? <section className="fm-office-comments" aria-label="Comments box"><header><strong>Comments box</strong><button type="button" onClick={onClose}>Close</button></header>{content}</section>
    : <FileModal title={`Comments · ${item.name}`} onClose={onClose}>{content}</FileModal>;

}

export function ExternalInvitationDialog({ item, onClose }) {
  const [invitations, setInvitations] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState("VIEWER");
  const [expiry, setExpiry] = useState("");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fileApi(`/${item.id}/guests`)
      .then(setInvitations)
      .catch((e) => setError(e.message));
  }, [item.id]);
  return (
    <FileModal title="Invite External Person" onClose={onClose}>
      <p className="fm-muted">
        Recipients verify their invited email address and can access only this
        file. External sharing must be enabled by an administrator. Email
        delivery needs working SMTP settings.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await fileApi(
              `/${item.id}/guests`,
              jsonRequest("POST", {
                name,
                email,
                access,
                expiresAt: new Date(expiry).toISOString(),
                message,
                notifyEmail: notify,
              }),
            );
            setLink(result.link);
            setInvitations(await fileApi(`/${item.id}/guests`));
            toast.success(
              result.emailDelivery === "failed"
                ? "Invitation created. Email submission failed."
                : "Invitation created",
            );
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Full name
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <div className="fm-two">
          <label>
            Permission
            <select value={access} onChange={(e) => setAccess(e.target.value)}>
              <option>VIEWER</option>
              <option>EDITOR</option>
            </select>
          </label>
          <label>
            Expiration date
            <input
              required
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
        </div>
        <label>
          Message (optional)
          <textarea
            maxLength={2000}
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="fm-check">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Request invitation email delivery
        </label>
        <button className="fm-primary" disabled={busy}>
          {busy ? "Creating…" : "Create invitation"}
        </button>
      </form>
      {error && (
        <p role="alert" className="fm-error">
          {error}
        </p>
      )}
      {link && (
        <div className="fm-notice" style={{ display: "block" }}>
          <label>
            Invitation link
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                toast.success("Invitation link copied");
              } catch {
                setError("Select and copy the invitation link manually.");
              }
            }}
          >
            Copy link
          </button>
          <p>
            This link is shown once. The recipient still needs an emailed
            verification code.
          </p>
        </div>
      )}
      <h3>External access</h3>
      {invitations.map((invite) => (
        <div className="fm-access" key={invite.id}>
          <span>
            <strong>{invite.name}</strong>
            <small>
              {invite.email} · {invite.access} ·{" "}
              {invite.revokedAt
                ? "Revoked"
                : `Expires ${date(invite.expiresAt)}`}
            </small>
          </span>
          <button
            disabled={!!invite.revokedAt}
            onClick={async () => {
              try {
                await fileApi(`/${item.id}/guests/${invite.id}`, {
                  method: "DELETE",
                });
                setInvitations(await fileApi(`/${item.id}/guests`));
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Revoke
          </button>
        </div>
      ))}
    </FileModal>
  );
}
