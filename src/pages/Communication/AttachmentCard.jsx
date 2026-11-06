/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { FileText, Download, Eye, Music } from "lucide-react";
import { FileModal } from "../Files/FileDialogs";
import { downloadBlob, bytes } from "../Files/fileApi";
import { attachmentBlob } from "./communicationApi";
export default function AttachmentCard({ attachment, messageId, reason }) {
  const [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const audio = useRef(null);
  useEffect(() => {
    if (!preview) return;
    const value = URL.createObjectURL(preview);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [preview]);
  const fetchContent = async (open) => {
    setBusy(true);
    setError("");
    try {
      const blob = await attachmentBlob(messageId, attachment.fileId, reason);
      if (open) setPreview(blob);
      else downloadBlob(blob, attachment.name);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const supported =
    attachment.mime.startsWith("image/") ||
    attachment.mime.startsWith("audio/") ||
    attachment.mime === "application/pdf";
  const type =
    attachment.mime === "application/pdf"
      ? "pdf"
      : /spreadsheet/.test(attachment.mime)
        ? "sheet"
        : /wordprocessing/.test(attachment.mime)
          ? "word"
          : "";
  return (
    <div className={`ec-attachment ${type}`}>
      <div className="ec-attachment-summary">
        {attachment.voice ? <Music size={25} /> : <FileText size={25} />}
        <div>
          <strong>{attachment.name}</strong>
          <small>
            {bytes(attachment.size)} ·{" "}
            {attachment.voice
              ? "Voice note"
              : attachment.name.split(".").pop().toUpperCase()}
          </small>
        </div>
      </div>
      <div className="ec-actions">
        {supported && (
          <button disabled={busy} onClick={() => fetchContent(true)}>
            <Eye size={14} />
            {attachment.voice ? "Play" : "Preview"}
          </button>
        )}
        <button disabled={busy} onClick={() => fetchContent(false)}>
          <Download size={14} /> Download
        </button>
      </div>
      {error && <small role="alert">{error}</small>}
      {preview && (
        <FileModal
          title={attachment.name}
          onClose={() => setPreview(null)}
          wide
        >
          {attachment.mime.startsWith("image/") ? (
            <img className="ec-media-preview" src={url} alt={attachment.name} />
          ) : attachment.mime.startsWith("audio/") ? (
            <div className="ec-audio">
              <audio ref={audio} controls src={url} />
              <label>
                Playback speed
                <select
                  defaultValue="1"
                  onChange={(e) => {
                    if (audio.current)
                      audio.current.playbackRate = Number(e.target.value);
                  }}
                >
                  <option value="1">1×</option>
                  <option value="1.5">1.5×</option>
                  <option value="2">2×</option>
                </select>
              </label>
            </div>
          ) : (
            <iframe
              title={attachment.name}
              className="ec-pdf-preview"
              src={url}
              sandbox="allow-same-origin"
            />
          )}
        </FileModal>
      )}
    </div>
  );
}
