/* eslint-disable react/prop-types */
import {
  Check,
  CheckCheck,
  Reply,
  Forward,
  Copy,
  Pencil,
  Trash2,
  Pin,
  Smile,
  Info,
} from "lucide-react";
import { initials, time } from "./communicationApi";
import AttachmentCard from "./AttachmentCard";
export default function MessageBubble({ message, me, onAction, reason }) {
  const own = message.senderId === me.id;
  return (
    <article
      className={`ec-message ${own ? "own" : ""} ${message.deletedAt ? "deleted" : ""}`}
    >
      <span className="ec-avatar ec-message-avatar" title={message.senderName}>
        {initials(message.senderName)}
      </span>
      <div className="ec-message-body">
        <div className="ec-message-sender">
          {message.senderName}
          {message.pinned && <Pin size={12} aria-label="Pinned message" />}
        </div>
        {message.forwarded && (
          <small className="ec-forwarded">Forwarded message</small>
        )}
        {message.replyTo && (
          <div className="ec-message-reply">
            <Reply size={12} /> Reply to message #{message.replyTo}
          </div>
        )}
        {message.deletedAt ? (
          <p className="ec-muted">
            Message removed · retained for authorized recovery
          </p>
        ) : (
          <>
            <p className="ec-message-text">{message.text}</p>
            {message.attachments?.map((a) => (
              <AttachmentCard
                key={a.fileId}
                attachment={a}
                messageId={message.id}
                reason={reason}
              />
            ))}
            {Object.entries(message.reactions || {})
              .filter(([, people]) => people.length)
              .map(([emoji, people]) => (
                <button
                  className="ec-reaction"
                  key={emoji}
                  onClick={() => onAction("react", message, emoji)}
                >
                  {emoji} {people.length}
                </button>
              ))}
          </>
        )}
        <footer>
          <time dateTime={message.createdAt}>{time(message.createdAt)}</time>
          {message.editedAt && <span>edited</span>}
          {own && (
            <span
              className={message.receipt === "read" ? "ec-read-receipt" : ""}
              aria-label={message.receipt}
              title={message.receipt}
            >
              {message.receipt === "sent" ? (
                <Check size={14} />
              ) : (
                <CheckCheck size={14} />
              )}
            </span>
          )}
        </footer>
        {!reason && !message.deletedAt && (
          <div className="ec-message-actions">
            <button
              title="Reply"
              aria-label={`Reply to message ${message.id}`}
              onClick={() => onAction("reply", message)}
            >
              <Reply size={14} />
            </button>
            <button
              title="Forward"
              aria-label="Forward message"
              onClick={() => onAction("forward", message)}
            >
              <Forward size={14} />
            </button>
            <button
              title="Copy text"
              aria-label="Copy message text"
              onClick={() => onAction("copy", message)}
            >
              <Copy size={14} />
            </button>
            <button
              title="React"
              aria-label="React to message"
              onClick={() => onAction("react", message, "👍")}
            >
              <Smile size={14} />
            </button>
            <button
              title="Pin message"
              aria-label="Pin message"
              onClick={() => onAction("pin", message)}
            >
              <Pin size={14} />
            </button>
            {own && me.policy.editingEnabled && (
              <button
                title="Edit message"
                aria-label="Edit message"
                onClick={() => onAction("edit", message)}
              >
                <Pencil size={14} />
              </button>
            )}
            {((own && me.policy.deletionEnabled) ||
              me.policy.groupModeratorDeletion) && (
              <button
                title="Remove message"
                aria-label="Remove message"
                onClick={() => onAction("delete", message)}
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              title="Message information"
              aria-label="Message information"
              onClick={() => onAction("info", message)}
            >
              <Info size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
