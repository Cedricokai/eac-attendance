/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { FileModal } from "../Files/FileDialogs";
import { communicationApi, request, initials } from "./communicationApi";
import StartConversationDialog from "./StartConversationDialog";
export default function CommunicationDialog({
  modal,
  conversation,
  conversations,
  onClose,
  onDone,
}) {
  const [candidate, setCandidate] = useState(null),
    [linkConfirmed, setLinkConfirmed] = useState(false);
  const [text, setText] = useState(modal.message?.text || ""),
    [name, setName] = useState(conversation?.name || ""),
    [description, setDescription] = useState(conversation?.description || ""),
    [announcements, setAnnouncements] = useState(
      conversation?.announcements || false,
    ),
    [reason, setReason] = useState(""),
    [target, setTarget] = useState(""),
    [people, setPeople] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(
      localStorage.getItem("eac-communication-sound") === "true",
    ),
    [desktop, setDesktop] = useState(
      localStorage.getItem("eac-communication-desktop") === "true",
    );
  useEffect(() => {
    if (modal.kind === "link-employee")
      communicationApi("/account/employee-link")
        .then(setCandidate)
        .catch((e) => setError(e.message));
    if (modal.kind === "manage-group")
      communicationApi("/directory")
        .then(setPeople)
        .catch((e) => setError(e.message));
  }, [modal.kind]);
  if (["direct", "group"].includes(modal.kind))
    return (
      <StartConversationDialog
        mode={modal.kind}
        onClose={onClose}
        onDone={onDone}
      />
    );
  const execute = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const headings = {
    edit: "Edit your message",
    delete: "Remove message",
    forward: "Forward message",
    info: "Message information",
    member: "Manage group member",
    "manage-group": "Group settings",
    leave: "Leave group",
    "delete-conversation": "Remove conversation",
    notifications: "Notification preferences",
    archives: "Archived conversations",
    "link-employee": "Connect your existing employee profile",
  };
  return (
    <FileModal title={headings[modal.kind] || "Conversation"} onClose={onClose}>
      {modal.kind === "link-employee" && candidate && (
        <div className="ec-form">
          <p>
            This connects your existing login to the employee profile with the
            same email. It creates no accounts and grants no administrative
            review permissions.
          </p>
          <strong>{candidate.name}</strong>
          <small>Employee ID: {candidate.employeeId}</small>
          <label className="ec-check">
            <input
              type="checkbox"
              checked={linkConfirmed}
              onChange={(e) => setLinkConfirmed(e.target.checked)}
            />{" "}
            This is my employee profile.
          </label>
          <button
            className="ec-primary"
            disabled={busy || !linkConfirmed}
            onClick={() =>
              execute(() =>
                communicationApi(
                  "/account/employee-link",
                  request("POST", { employeeId: candidate.id }),
                ),
              )
            }
          >
            Confirm profile connection
          </button>
        </div>
      )}
      {error && (
        <p className="ec-error" role="alert">
          {error}
        </p>
      )}
      {modal.kind === "edit" && (
        <>
          <label className="ec-form">
            Message
            <textarea
              value={text}
              maxLength={10000}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button
            className="ec-primary"
            disabled={busy || !text.trim()}
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/messages/${modal.message.id}`,
                  request("PATCH", { text }),
                ),
              )
            }
          >
            Save changes
          </button>
        </>
      )}
      {["delete", "delete-conversation"].includes(modal.kind) && (
        <>
          <p>
            This is recoverable removal under your organization’s retention
            policy. It does not immediately destroy the record.
          </p>
          <label className="ec-form">
            Reason
            <textarea
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="ec-danger"
            disabled={busy || !reason.trim()}
            onClick={() =>
              execute(() =>
                communicationApi(
                  modal.kind === "delete"
                    ? `/messages/${modal.message.id}`
                    : `/conversations/${conversation.id}`,
                  request("DELETE", { reason }),
                ),
              )
            }
          >
            Remove
          </button>
        </>
      )}
      {modal.kind === "forward" && (
        <>
          <p className="ec-muted">
            File access is validated again for the destination’s current
            participants.
          </p>
          <div className="ec-picker-list">
            {conversations
              .filter((c) => c.id !== conversation.id)
              .map((c) => (
                <button
                  key={c.id}
                  className={target === c.id ? "selected" : ""}
                  onClick={() => setTarget(c.id)}
                >
                  <span className="ec-avatar">{initials(c.name)}</span>
                  {c.name}
                </button>
              ))}
            {conversations.length < 2 && (
              <p>Start another conversation before forwarding a message.</p>
            )}
          </div>
          <button
            className="ec-primary"
            disabled={busy || !target}
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/conversations/${target}/messages`,
                  request("POST", {
                    clientId: crypto.randomUUID(),
                    forwardedFrom: modal.message.id,
                  }),
                ),
              )
            }
          >
            Forward message
          </button>
        </>
      )}
      {modal.kind === "info" && (
        <dl className="ec-message-information">
          <dt>Sender</dt>
          <dd>{modal.message.senderName}</dd>
          <dt>Sent</dt>
          <dd>{new Date(modal.message.createdAt).toLocaleString()}</dd>
          <dt>Status</dt>
          <dd>{modal.message.receipt}</dd>
          {modal.message.editedAt && (
            <>
              <dt>Edited</dt>
              <dd>{new Date(modal.message.editedAt).toLocaleString()}</dd>
            </>
          )}
        </dl>
      )}
      {modal.kind === "member" && (
        <div className="ec-form">
          <p>{modal.person.name}</p>
          <button
            disabled={busy}
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/groups/${conversation.id}`,
                  request("PATCH", {
                    manager: modal.person.id,
                    value: !modal.person.manager,
                  }),
                ),
              )
            }
          >
            {modal.person.manager
              ? "Remove administrator role"
              : "Appoint as group administrator"}
          </button>
          <button
            disabled={busy}
            className="ec-danger"
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/groups/${conversation.id}`,
                  request("PATCH", { remove: modal.person.id }),
                ),
              )
            }
          >
            Remove from group
          </button>
        </div>
      )}
      {modal.kind === "manage-group" && (
        <div className="ec-form">
          <label>
            Group name
            <input
              value={name}
              maxLength={140}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="ec-check">
            <input
              type="checkbox"
              checked={announcements}
              onChange={(e) => setAnnouncements(e.target.checked)}
            />{" "}
            Only administrators may post
          </label>
          <button
            className="ec-primary"
            disabled={busy || !name.trim()}
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/groups/${conversation.id}`,
                  request("PATCH", { name, description, announcements }),
                ),
              )
            }
          >
            Save group settings
          </button>
          <h3>Add an employee</h3>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Employee to add"
          >
            <option value="">Choose an employee</option>
            {people
              .filter((p) => !conversation.members.some((m) => m.id === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.employeeId}
                </option>
              ))}
          </select>
          <p className="ec-muted">
            New members see messages from their join time. Older shared-file
            access is not granted automatically.
          </p>
          <button
            disabled={busy || !target}
            onClick={() =>
              execute(() =>
                communicationApi(
                  `/groups/${conversation.id}`,
                  request("PATCH", { add: Number(target) }),
                ),
              )
            }
          >
            Add employee
          </button>
        </div>
      )}
      {modal.kind === "leave" && (
        <>
          <p>
            You will lose access to this group. Appoint another administrator
            first if you are its only administrator.
          </p>
          <button
            className="ec-danger"
            disabled={busy}
            onClick={() =>
              execute(() =>
                communicationApi(`/groups/${conversation.id}/leave`, {
                  method: "POST",
                }),
              )
            }
          >
            Leave group
          </button>
        </>
      )}
      {modal.kind === "notifications" && (
        <div className="ec-form">
          <p>
            Notifications show the sender’s name without private message
            content.
          </p>
          <label className="ec-check">
            <input
              type="checkbox"
              checked={sound}
              onChange={(e) => {
                setSound(e.target.checked);
                localStorage.setItem(
                  "eac-communication-sound",
                  String(e.target.checked),
                );
              }}
            />{" "}
            Play a notification sound
          </label>
          <label className="ec-check">
            <input
              type="checkbox"
              checked={desktop}
              onChange={async (e) => {
                if (e.target.checked) {
                  if (!("Notification" in window)) {
                    setError(
                      "Desktop notifications are not supported by this browser.",
                    );
                    return;
                  }
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted") {
                    setError(
                      "Desktop notification permission was not granted.",
                    );
                    return;
                  }
                }
                const value = e.target.checked;
                setDesktop(value);
                localStorage.setItem(
                  "eac-communication-desktop",
                  String(value),
                );
              }}
            />{" "}
            Browser notifications on this device
          </label>
          <p className="ec-muted">
            You can mute individual conversations from their header.
          </p>
        </div>
      )}
      {modal.kind === "archives" && (
        <div className="ec-picker-list">
          {modal.rows.map((c) => (
            <button key={c.id} onClick={() => onDone(c)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </FileModal>
  );
}
