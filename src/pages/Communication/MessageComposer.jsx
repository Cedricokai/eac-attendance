/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  Paperclip,
  Send,
  Smile,
  Mic,
  FolderOpen,
  X,
  Upload,
} from "lucide-react";
import { getToken } from "../../utils/auth";
import { getApiBaseUrl } from "../../utils/api";
import { bytes } from "../Files/fileApi";
import SystemFilePicker from "./SystemFilePicker";
import VoiceNoteRecorder from "./VoiceNoteRecorder";
export default function MessageComposer({
  conversation,
  me,
  reply,
  onCancelReply,
  onSend,
  onTyping,
}) {
  const key = `eac-message-draft:${me.id}:${conversation.id}`;
  const [text, setText] = useState(() => sessionStorage.getItem(key) || ""),
    [attachments, setAttachments] = useState([]),
    [picker, setPicker] = useState(false),
    [recording, setRecording] = useState(false),
    [emoji, setEmoji] = useState(false),
    [upload, setUpload] = useState(null),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [mentions, setMentions] = useState([]);
  const input = useRef(null),
    xhr = useRef(null),
    attempt = useRef(null);
  useEffect(() => {
    if (text) sessionStorage.setItem(key, text);
    else sessionStorage.removeItem(key);
  }, [text, key]);
  useEffect(() => () => xhr.current?.abort(), []);
  const uploadOne = (file, voice = false, seconds = 0) =>
    new Promise((resolve, reject) => {
      if (file.size > me.policy.maxAttachmentBytes) {
        reject(Error("File exceeds the communication upload limit."));
        return;
      }
      setUpload({ name: file.name, percent: 0 });
      const body = new FormData();
      body.append("file", file);
      body.append("voice", String(voice));
      body.append("seconds", String(seconds));
      const req = new XMLHttpRequest();
      xhr.current = req;
      req.open(
        "POST",
        `${getApiBaseUrl()}/api/communication/conversations/${conversation.id}/attachments`,
      );
      req.setRequestHeader("Authorization", `Bearer ${getToken() || ""}`);
      req.timeout = 120000;
      req.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setUpload({
            name: file.name,
            percent: Math.round((e.loaded / e.total) * 100),
          });
      };
      req.onload = () => {
        setUpload(null);
        let result;
        try {
          result = JSON.parse(req.responseText);
        } catch {
          reject(Error("Upload response unavailable"));
          return;
        }
        if (req.status >= 200 && req.status < 300) resolve(result);
        else reject(Error(result.message || "Upload failed"));
      };
      req.onerror = () => {
        setUpload(null);
        reject(Error("Upload interrupted. Please retry."));
      };
      req.ontimeout = req.onerror;
      req.onabort = () => {
        setUpload(null);
        reject(Error("Upload cancelled"));
      };
      req.send(body);
    });
  const device = async (files) => {
    setError("");
    if (attachments.length + files.length > 5) {
      setError("Attach up to five files per message.");
      return;
    }
    for (const file of files)
      try {
        const result = await uploadOne(file);
        setAttachments((old) => [...old, result]);
      } catch (e) {
        setError(e.message);
        break;
      }
  };
  const voice = async (blob, seconds) => {
    setRecording(false);
    setError("");
    try {
      const ext = blob.type.includes("ogg")
        ? "ogg"
        : blob.type.includes("mp4")
          ? "m4a"
          : "webm";
      const file = new File([blob], `Voice-note-${Date.now()}.${ext}`, {
        type: blob.type,
      });
      const result = await uploadOne(file, true, seconds);
      setAttachments((old) => [...old, result]);
    } catch (e) {
      setError(e.message);
    }
  };
  const send = async () => {
    setError("");
    setSending(true);
    const payload = {
      text,
      fileIds: attachments.map((f) => f.fileId),
      replyTo: reply?.id,
      mentions,
    };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, clientId: crypto.randomUUID() };
    try {
      await onSend({ ...payload, clientId: attempt.current.clientId });
      setText("");
      setAttachments([]);
      setMentions([]);
      attempt.current = null;
      onCancelReply();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };
  const allowed = !conversation.announcements || conversation.manager;
  return (
    <div className="ec-composer">
      {reply && (
        <div className="ec-reply-bar">
          <div>
            <small>Replying to {reply.senderName}</small>
            <p>{reply.text || "Attachment"}</p>
          </div>
          <button aria-label="Cancel reply" onClick={onCancelReply}>
            <X size={16} />
          </button>
        </div>
      )}
      {!allowed ? (
        <p className="ec-muted">
          Only group administrators can post announcements.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="ec-error">
              {error}
            </p>
          )}
          {attachments.length > 0 && (
            <div className="ec-pending-files">
              {attachments.map((a) => (
                <span key={a.fileId}>
                  {a.name} <small>{bytes(a.size)}</small>
                  <button
                    aria-label={`Remove ${a.name}`}
                    onClick={() =>
                      setAttachments((old) =>
                        old.filter((x) => x.fileId !== a.fileId),
                      )
                    }
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {upload && (
            <div className="ec-upload-progress" role="status">
              <span>
                Uploading {upload.name} · {upload.percent}%
              </span>
              <progress max="100" value={upload.percent} />
              <button onClick={() => xhr.current?.abort()}>
                Cancel upload
              </button>
            </div>
          )}
          {recording && (
            <VoiceNoteRecorder
              limit={me.policy.maxVoiceSeconds}
              onAttach={voice}
              onClose={() => setRecording(false)}
            />
          )}
          <textarea
            aria-label={`Message ${conversation.name}`}
            placeholder={`Message ${conversation.name}…`}
            value={text}
            maxLength={10000}
            disabled={sending}
            onChange={(e) => {
              setText(e.target.value);
              onTyping?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if ((text.trim() || attachments.length) && !upload && !sending)
                  send();
              }
            }}
          />
          <div className="ec-composer-tools">
            <div>
              <button
                aria-label="Upload attachments"
                title="Upload from device"
                disabled={!me.policy.filesEnabled || !!upload || sending}
                onClick={() => input.current.click()}
              >
                <Paperclip size={19} />
              </button>
              <input
                hidden
                ref={input}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.zip,.webm,.ogg,.wav,.mp3,.m4a"
                onChange={(e) => {
                  device(Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
              <button
                aria-label="Select from File Management"
                title="Select from File Management"
                disabled={!me.policy.filesEnabled || !!upload || sending}
                onClick={() => setPicker(true)}
              >
                <FolderOpen size={19} />
              </button>
              <button
                aria-label="Insert emoji"
                aria-expanded={emoji}
                onClick={() => setEmoji(!emoji)}
              >
                <Smile size={19} />
              </button>
              <button
                aria-label="Record a voice note"
                title="Record a voice note"
                disabled={
                  !me.policy.voiceEnabled ||
                  !!upload ||
                  sending ||
                  attachments.length >= 5
                }
                onClick={() => setRecording(!recording)}
              >
                <Mic size={19} />
              </button>
              {conversation.type === "GROUP" && (
                <select
                  aria-label="Mention a group member"
                  value=""
                  onChange={(e) => {
                    const person = conversation.members.find(
                      (p) => p.id === Number(e.target.value),
                    );
                    if (person) {
                      setText(
                        (old) => `${old}${old ? " " : ""}@${person.name} `,
                      );
                      setMentions((old) => [...new Set([...old, person.id])]);
                    }
                  }}
                >
                  <option value="">@ Mention</option>
                  {conversation.members
                    .filter((p) => p.id !== me.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
            <button
              className="ec-primary ec-send"
              aria-label="Send message"
              disabled={
                sending || !!upload || (!text.trim() && !attachments.length)
              }
              onClick={send}
            >
              {sending ? <Upload size={17} /> : <Send size={17} />}
              <span>{sending ? "Sending…" : "Send message"}</span>
            </button>
          </div>
          {emoji && (
            <div className="ec-emoji-picker" aria-label="Choose emoji">
              {["👍", "✅", "👏", "🙏", "🎉", "😊", "❤️", "⚡", "📌", "👀"].map(
                (e) => (
                  <button
                    key={e}
                    aria-label={`Insert ${e}`}
                    onClick={() => {
                      setText((old) => old + e);
                      setEmoji(false);
                    }}
                  >
                    {e}
                  </button>
                ),
              )}
            </div>
          )}
          <small className="ec-compose-hint">
            Ctrl / ⌘ + Enter to send · Internal employee communication
          </small>
        </>
      )}
      {picker && (
        <SystemFilePicker
          onClose={() => setPicker(false)}
          onSelect={(files) => {
            setAttachments((old) =>
              [
                ...old,
                ...files
                  .filter((f) => !old.some((a) => a.fileId === f.id))
                  .map((f) => ({
                    fileId: f.id,
                    name: f.name,
                    mime: f.mediaType,
                    size: f.sizeBytes,
                  })),
              ].slice(0, 5),
            );
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
