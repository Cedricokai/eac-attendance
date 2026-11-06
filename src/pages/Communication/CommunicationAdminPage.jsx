import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  LockKeyhole,
  ArrowLeft,
  RefreshCw,
  Download,
} from "lucide-react";
import MainSidebar from "../Eac-attendance/mainSidebar";
import { useCommunication } from "./communicationContext";
import { communicationApi, request, reviewHeaders } from "./communicationApi";
import { downloadBlob } from "../Files/fileApi";
import MessageBubble from "./MessageBubble";
import "./communication.css";
export default function CommunicationAdminPage() {
  const { me, refresh } = useCommunication(),
    location = useLocation();
  const mode = location.pathname.includes("communication-settings")
    ? "settings"
    : location.pathname.endsWith("/recovery")
      ? "recovery"
      : location.pathname.endsWith("/backups")
        ? "backups"
        : location.pathname.endsWith("/audit")
          ? "audit"
          : location.pathname.endsWith("/groups")
            ? "groups"
            : "oversight";
  const [reason, setReason] = useState(""),
    [rows, setRows] = useState(null),
    [messages, setMessages] = useState([]),
    [conversation, setConversation] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [policy, setPolicy] = useState(null),
    [preview, setPreview] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [page, setPage] = useState(0);
  const [groupDirectory, setGroupDirectory] = useState([]),
    [addEmployee, setAddEmployee] = useState({});
  const codes = {
    settings: "COMMUNICATION_POLICY_MANAGE",
    oversight: "COMMUNICATION_VIEW_ALL",
    recovery: "COMMUNICATION_RECOVERY_MANAGE",
    backups: "COMMUNICATION_BACKUP_MANAGE",
    audit: "COMMUNICATION_ADMIN",
    groups: "COMMUNICATION_GROUP_MANAGE",
  };
  const allowed =
    me?.permissions?.includes(codes[mode]) && (mode !== "oversight" || me?.isAdmin);
  const work = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const get = async (path) =>
    communicationApi(path, { headers: reviewHeaders(reason) });
  const load = () =>
    work(async () => {
      setMessages([]);
      setConversation(null);
      setPreview(null);
      if (mode === "settings") setPolicy(await get("/admin/policy"));
      else if (mode === "groups") {
        setRows(await get("/admin/groups"));
        setGroupDirectory(await get("/admin/group-directory"));
      } else
        setRows(
          await get(
            mode === "oversight"
              ? `/admin/conversations?page=${page}`
              : mode === "audit"
                ? `/admin/audit?page=${page}`
                : `/admin/${mode}?page=${page}`,
          ),
        );
    });
  const review = async (c) => {
    await work(async () => {
      setMessages(await get(`/admin/conversations/${c.id}/messages`));
      setConversation(c);
    });
  };
  const tabs = [
    ["oversight", "Employee conversations", "/admin/communications"],
    ["settings", "Policies", "/admin/communication-settings"],
    ["recovery", "Recovery", "/admin/communications/recovery"],
    ["backups", "Backups", "/admin/communications/backups"],
    ["audit", "Audit log", "/admin/communications/audit"],
    ["groups", "Group administration", "/admin/communications/groups"],
  ];
  return (
    <div className="ec-root ec-admin-shell">
      <div className="ec-app-rail">
        <MainSidebar isCollapsed />
      </div>
      <main>
        <header className="ec-admin-heading">
          <div>
            <span className="ec-kicker">AUTHORIZED COMMUNICATION CONTROLS</span>
            <h1>
              <Shield size={26} /> Communication administration
            </h1>
            <p>
              Administrators and assigned accounts can manage these controls. Access is recorded
              with your review reason.
            </p>
          </div>
          <Link to="/communication">
            <ArrowLeft size={16} /> My conversations
          </Link>
        </header>
        <nav className="ec-admin-tabs">
          {tabs
            .filter(([id]) => me?.permissions?.includes(codes[id]) && (id !== "oversight" || me?.isAdmin))
            .map(([id, label, path]) => (
              <Link className={mode === id ? "active" : ""} key={id} to={path}>
                {label}
              </Link>
            ))}
        </nav>
        {!allowed ? (
          <section className="ec-admin-card ec-empty">
            <LockKeyhole size={38} />
            <h2>Explicit authorization required</h2>
            <p>
              {mode === "oversight" ? "Only ADMIN accounts can review employee conversations. Ordinary employee accounts cannot access this page." : <>This action requires an administrator account or the assigned permission {codes[mode]}.</>}
            </p>
          </section>
        ) : (
          <>
            <section className="ec-admin-card ec-review-reason">
              <label>
                Review or change reason
                <textarea
                  value={reason}
                  maxLength={500}
                  minLength={8}
                  placeholder="Explain the business reason for this access (at least 8 characters)…"
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                className="ec-primary"
                disabled={busy || reason.trim().length < 8}
                onClick={load}
              >
                <RefreshCw size={16} />{" "}
                {mode === "oversight"
                  ? "Open authorized directory"
                  : "Load protected records"}
              </button>
            </section>
            {error && (
              <p className="ec-error" role="alert">
                {error}
              </p>
            )}
            {busy && <p role="status">Working…</p>}
            {mode === "settings" && policy && (
              <section className="ec-admin-card">
                <h2>Organization communication policy</h2>
                <p className="ec-muted">
                  Deletion is disabled by default. Enabled deletion is
                  recoverable and retains the encrypted record; automatic
                  permanent destruction is not enabled.
                </p>
                <div className="ec-policy-grid">
                  {Object.entries(policy)
                    .filter(([, v]) => typeof v === "boolean")
                    .map(([key, value]) => (
                      <label className="ec-check" key={key}>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setPolicy((old) => ({
                              ...old,
                              [key]: e.target.checked,
                            }))
                          }
                        />
                        {key.replace(/([A-Z])/g, " $1")}
                      </label>
                    ))}
                </div>
                <div className="ec-policy-grid">
                  {[
                    ["editMinutes", "Edit window (minutes)"],
                    ["deleteMinutes", "Delete window (minutes)"],
                    ["retentionDays", "Recovery period (days)"],
                    ["maxAttachmentBytes", "Attachment limit (bytes)"],
                    ["maxVoiceSeconds", "Voice-note limit (seconds)"],
                    ["backupIntervalHours", "Backup interval (hours)"],
                    ["backupRetentionDays", "Backup retention target (days)"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        value={policy[key]}
                        onChange={(e) =>
                          setPolicy((old) => ({
                            ...old,
                            [key]: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  className="ec-primary"
                  disabled={busy || reason.trim().length < 8}
                  onClick={() =>
                    work(async () => {
                      await communicationApi("/admin/policy", {
                        ...request("PUT", policy),
                        headers: reviewHeaders(reason),
                      });
                      await refresh();
                      setRows({ saved: true });
                    })
                  }
                >
                  Save audited policy
                </button>
                {rows?.saved && (
                  <p role="status">Policy saved by the backend.</p>
                )}
              </section>
            )}
            {mode === "oversight" && rows && (
              <div className="ec-review-layout">
                <section className="ec-admin-card">
                  <h2>Conversation directory</h2>
                  {rows.map((c) => (
                    <button
                      className="ec-review-row"
                      key={c.id}
                      disabled={busy}
                      onClick={() => review(c)}
                    >
                      <strong>
                        {c.type === "DIRECT"
                          ? c.members.map((p) => p.name).join(" ↔ ")
                          : c.name}
                      </strong>
                      <small>
                        {c.type} · {c.members.length} members
                      </small>
                    </button>
                  ))}
                  {!rows.length && <p>No conversations recorded.</p>}
                  <div className="ec-actions">
                    <button
                      disabled={!page}
                      onClick={() => setPage((n) => n - 1)}
                    >
                      Previous page
                    </button>
                    <span>Page {page + 1}</span>
                    <button
                      disabled={rows.length < 50}
                      onClick={() => setPage((n) => n + 1)}
                    >
                      Next page
                    </button>
                  </div>
                  <small>
                    Click “Open authorized directory” after changing the page.
                  </small>
                </section>
                {conversation && (
                  <section className="ec-admin-card ec-review-messages">
                    <header>
                      <h2>Read-only review · #{conversation.id}</h2>
                      {me.isAdmin && me.permissions.includes("COMMUNICATION_EXPORT") && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            work(async () => {
                              const content = await get(
                                `/admin/conversations/${conversation.id}/export?before=${messages.length ? messages[messages.length - 1].sequence + 1 : 0}`,
                              );
                              downloadBlob(
                                new Blob([JSON.stringify(content, null, 2)], {
                                  type: "application/json",
                                }),
                                `communication-${conversation.id}-page.json`,
                              );
                            })
                          }
                        >
                          <Download size={15} /> Export this page
                        </button>
                      )}
                    </header>
                    {messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        me={me}
                        reason={reason}
                        onAction={() => {}}
                      />
                    ))}
                    {messages.length >= 50 && (
                      <button
                        onClick={() =>
                          work(async () =>
                            setMessages(
                              await get(
                                `/admin/conversations/${conversation.id}/messages?before=${messages[0].sequence}`,
                              ),
                            ),
                          )
                        }
                      >
                        Review earlier page
                      </button>
                    )}
                  </section>
                )}
              </div>
            )}
            {mode === "recovery" && rows && (
              <section className="ec-admin-card">
                <h2>Recoverable records</h2>
                {["messages", "conversations"].map((kind) => (
                  <section key={kind}>
                    <h3>{kind}</h3>
                    {rows[kind]?.map((row) => (
                      <div className="ec-recovery-row" key={row.id}>
                        <div>
                          <strong>
                            #{row.id} ·{" "}
                            {row.sender || row.name || "Conversation"}
                          </strong>
                          <small>
                            Removed {new Date(row.deletedAt).toLocaleString()} ·
                            Recovery until{" "}
                            {new Date(row.retainUntil).toLocaleString()}
                          </small>
                        </div>
                        <button
                          disabled={busy || !row.recoverable}
                          onClick={() =>
                            work(async () => {
                              await communicationApi(
                                `/admin/recovery/${kind === "messages" ? "message" : "conversation"}/${row.id}`,
                                request("POST", { reason }),
                              );
                              setRows(await get("/admin/recovery"));
                            })
                          }
                        >
                          {row.recoverable ? "Restore" : "Recovery expired"}
                        </button>
                      </div>
                    ))}
                    {!rows[kind]?.length && (
                      <p className="ec-muted">No removed {kind}.</p>
                    )}
                  </section>
                ))}
              </section>
            )}
            {mode === "backups" && rows && (
              <section className="ec-admin-card">
                <header>
                  <h2>Encrypted communication backups</h2>
                  <button
                    className="ec-primary"
                    disabled={busy || reason.trim().length < 8}
                    onClick={() =>
                      work(async () => {
                        const created = await communicationApi(
                          "/admin/backups",
                          request("POST", { reason }),
                        );
                        setRows(await get("/admin/backups"));
                        if (created.status === "FAILED")
                          setError(created.error);
                      })
                    }
                  >
                    Create backup
                  </button>
                </header>
                <p className="ec-muted">
                  Keep encryption keys separately. Local archives require an
                  independently protected off-device backup for disaster
                  recovery.
                </p>
                {rows.map((row) => (
                  <div className="ec-backup-row" key={row.id}>
                    <div>
                      <strong>
                        {new Date(row.createdAt).toLocaleString()}
                      </strong>
                      <small>
                        {row.id} · {row.status}
                        {row.error && ` · ${row.error}`}
                      </small>
                    </div>
                    <button
                      disabled={busy || row.status !== "VERIFIED"}
                      onClick={() =>
                        work(async () => {
                          const result = await communicationApi(
                            `/admin/backups/${row.id}/verify`,
                            request("POST", { reason }),
                          );
                          setPreview({ ...result, verifiedOnly: true });
                        })
                      }
                    >
                      Verify
                    </button>
                    <button
                      disabled={busy || row.status !== "VERIFIED"}
                      onClick={() =>
                        work(async () => {
                          setConfirmed(false);
                          setPreview(
                            await communicationApi(
                              `/admin/backups/${row.id}/restore-preview`,
                              request("POST", { reason }),
                            ),
                          );
                        })
                      }
                    >
                      Review restore
                    </button>
                  </div>
                ))}
                {!rows.length && <p>No backups recorded yet.</p>}
                {preview && (
                  <div className="ec-restore-preview">
                    <h3>
                      {preview.verifiedOnly
                        ? "Integrity verified"
                        : "Restore impact summary"}
                    </h3>
                    <p>
                      {preview.impact ||
                        "The encrypted archive passed its integrity and decryption checks."}
                    </p>
                    {!preview.verifiedOnly && (
                      <>
                        <p>
                          {preview.missingMessages} missing message records can
                          be restored. Existing records will not be overwritten.
                        </p>
                        <label className="ec-check">
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                          />{" "}
                          I reviewed the impact and authorize this selective
                          restore.
                        </label>
                        <button
                          className="ec-primary"
                          disabled={busy || !confirmed}
                          onClick={() =>
                            work(async () => {
                              const result = await communicationApi(
                                `/admin/backups/${preview.id}/restore`,
                                request("POST", {
                                  reason,
                                  confirmation: preview.confirmation,
                                }),
                              );
                              setPreview({ ...result, verifiedOnly: true });
                            })
                          }
                        >
                          Confirm restore
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>
            )}
            {mode === "groups" && Array.isArray(rows) && (
              <section className="ec-admin-card">
                <h2>Group administration</h2>
                <p className="ec-muted">
                  Membership and group settings only. Message review requires
                  its separate permission.
                </p>
                {rows.map((group) => (
                  <section className="ec-admin-card" key={group.id}>
                    <label className="ec-form">
                      Group name
                      <input
                        value={group.name}
                        onChange={(e) =>
                          setRows((old) =>
                            old.map((g) =>
                              g.id === group.id
                                ? { ...g, name: e.target.value }
                                : g,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="ec-check">
                      <input
                        type="checkbox"
                        checked={group.announcements}
                        onChange={(e) =>
                          setRows((old) =>
                            old.map((g) =>
                              g.id === group.id
                                ? { ...g, announcements: e.target.checked }
                                : g,
                            ),
                          )
                        }
                      />{" "}
                      Administrator-only announcements
                    </label>
                    <button
                      disabled={busy}
                      onClick={() =>
                        work(async () => {
                          await communicationApi(`/admin/groups/${group.id}`, {
                            ...request("PATCH", {
                              name: group.name,
                              announcements: group.announcements,
                            }),
                            headers: reviewHeaders(reason),
                          });
                          setRows(await get("/admin/groups"));
                        })
                      }
                    >
                      Save group settings
                    </button>
                    {group.members.map((person) => (
                      <div className="ec-member" key={person.id}>
                        <span>
                          {person.name}{" "}
                          {person.manager ? "· Administrator" : ""}
                        </span>
                        <button
                          disabled={busy}
                          onClick={() =>
                            work(async () => {
                              await communicationApi(
                                `/admin/groups/${group.id}`,
                                {
                                  ...request("PATCH", {
                                    manager: person.id,
                                    value: !person.manager,
                                  }),
                                  headers: reviewHeaders(reason),
                                },
                              );
                              setRows(await get("/admin/groups"));
                            })
                          }
                        >
                          {person.manager ? "Demote" : "Appoint administrator"}
                        </button>
                        <button
                          disabled={busy}
                          className="ec-danger"
                          onClick={() =>
                            work(async () => {
                              await communicationApi(
                                `/admin/groups/${group.id}`,
                                {
                                  ...request("PATCH", { remove: person.id }),
                                  headers: reviewHeaders(reason),
                                },
                              );
                              setRows(await get("/admin/groups"));
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <select
                      aria-label={`Employee to add to ${group.name}`}
                      value={addEmployee[group.id] || ""}
                      onChange={(e) =>
                        setAddEmployee((old) => ({
                          ...old,
                          [group.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Choose an employee</option>
                      {groupDirectory
                        .filter(
                          (p) => !group.members.some((m) => m.id === p.id),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button
                      disabled={busy || !addEmployee[group.id]}
                      onClick={() =>
                        work(async () => {
                          await communicationApi(`/admin/groups/${group.id}`, {
                            ...request("PATCH", {
                              add: Number(addEmployee[group.id]),
                            }),
                            headers: reviewHeaders(reason),
                          });
                          setRows(await get("/admin/groups"));
                        })
                      }
                    >
                      Add member
                    </button>
                  </section>
                ))}
                {rows.length === 0 && <p>No groups have been created.</p>}
              </section>
            )}
            {mode === "audit" && rows && (
              <section className="ec-admin-card">
                <h2>Communication access and activity</h2>
                {rows.content?.map((row) => (
                  <div className="ec-audit-row" key={row.id}>
                    <strong>{row.action}</strong>
                    <span>
                      {row.actor} · {new Date(row.createdAt).toLocaleString()}
                    </span>
                    <p>
                      {row.reason || "Routine participant activity"}{" "}
                      {row.conversationId &&
                        `· Conversation #${row.conversationId}`}
                    </p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
