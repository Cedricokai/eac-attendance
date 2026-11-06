/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { Folder, Plus, ChevronRight, Copy, X } from "lucide-react";
import { toast } from "react-toastify";
import { FileModal } from "./FileDialogs";
import { fileApi, jsonRequest, date, bytes } from "./fileApi";

function FolderChooser({ onChoose, onClose }) {
  const [parent, setParent] = useState(null);
  const [trail, setTrail] = useState([]);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    fileApi(`?size=100${parent ? `&parentId=${parent}` : ""}`)
      .then((p) => setFolders(p.content.filter((f) => f.folder)))
      .catch((e) => setError(e.message));
  }, [parent]);
  return (
    <FileModal title="Choose upload destination" onClose={onClose}>
      <div className="fm-crumbs">
        <button
          onClick={() => {
            setParent(null);
            setTrail([]);
          }}
        >
          My files
        </button>
        {trail.map((folder, i) => (
          <button
            key={folder.id}
            onClick={() => {
              setParent(folder.id);
              setTrail(trail.slice(0, i + 1));
            }}
          >
            {folder.name}
          </button>
        ))}
      </div>
      {error && <p className="fm-error">{error}</p>}
      {folders.map((folder) => (
        <button
          className="fm-folder-choice"
          key={folder.id}
          onClick={() => {
            setParent(folder.id);
            setTrail([...trail, folder]);
          }}
        >
          <Folder size={19} />
          {folder.name}
          <ChevronRight size={15} />
        </button>
      ))}
      <footer>
        <button onClick={onClose}>Cancel</button>
        <button
          className="fm-primary"
          disabled={!parent}
          onClick={() => {
            onChoose(trail[trail.length - 1]);
            onClose();
          }}
        >
          Use this folder
        </button>
      </footer>
    </FileModal>
  );
}
export default function FileRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [dialog, setDialog] = useState(false);
  const [picker, setPicker] = useState(false);
  const [folder, setFolder] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [limit, setLimit] = useState(25);
  const [notify, setNotify] = useState(true);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = useCallback(
    () =>
      fileApi("/requests")
        .then(setRequests)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  const close = useCallback(() => setDialog(false), []);
  const closePicker = useCallback(() => setPicker(false), []);
  return (
    <>
      <div className="fm-toolbar">
        <p className="fm-muted">
          Collect files without exposing your folders. Recipients verify their
          email and can upload only.
        </p>
        <button
          className="fm-primary"
          onClick={() => {
            setDialog(true);
            setLink("");
          }}
        >
          <Plus size={16} />
          New file request
        </button>
      </div>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      {!requests.length ? (
        <div className="fm-empty">
          <Folder size={38} />
          <h2>No file requests yet</h2>
          <p>
            Create a request to collect documents from employees or external
            recipients.
          </p>
        </div>
      ) : (
        <div className="fm-table-wrap">
          <table className="fm-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Recipient</th>
                <th>Destination</th>
                <th>Uploads</th>
                <th>Expires</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.recipient}</td>
                  <td>{r.folder}</td>
                  <td>{r.uploadCount}</td>
                  <td>{date(r.expiresAt)}</td>
                  <td>
                    {r.revokedAt
                      ? "Closed"
                      : new Date(r.expiresAt) < new Date()
                        ? "Expired"
                        : "Open"}
                  </td>
                  <td>
                    <button
                      disabled={!!r.revokedAt}
                      onClick={async () => {
                        try {
                          await fileApi(`/requests/${r.id}`, {
                            method: "DELETE",
                          });
                          reload();
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      <X size={15} />
                      Close request
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && (
        <FileModal title="New file request" onClose={close}>
          <p className="fm-muted">
            An administrator must enable external sharing. Up to 20 files may be
            submitted per request; global upload and storage limits still apply.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await fileApi(
                  "/requests",
                  jsonRequest("POST", {
                    folderId: folder?.id,
                    title,
                    description,
                    name,
                    email,
                    expiresAt: new Date(expiry).toISOString(),
                    maxUploadBytes: limit * 1048576,
                    notifyEmail: notify,
                  }),
                );
                setLink(result.link);
                reload();
                toast.success(
                  result.emailDelivery === "failed"
                    ? "Request created; email submission failed"
                    : "File request created",
                );
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Request title
              <input
                required
                maxLength={180}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                maxLength={2000}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <button type="button" onClick={() => setPicker(true)}>
              <Folder size={16} />
              {folder ? folder.name : "Choose destination folder"}
            </button>
            <div className="fm-two">
              <label>
                Recipient name
                <input
                  required
                  maxLength={160}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Recipient email
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
            <div className="fm-two">
              <label>
                Expiration
                <input
                  required
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </label>
              <label>
                Maximum file size (MB)
                <input
                  required
                  type="number"
                  min="1"
                  max="500"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="fm-check">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              Request email notification
            </label>
            <button className="fm-primary" disabled={busy || !folder}>
              {busy ? "Creating…" : "Create request"}
            </button>
          </form>
          {link && (
            <div className="fm-notice" style={{ display: "block" }}>
              <label>
                Secure request link
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    toast.success("Request link copied");
                  } catch {
                    setError("Select and copy the link manually.");
                  }
                }}
              >
                <Copy size={15} />
                Copy link
              </button>
            </div>
          )}
          {picker && (
            <FolderChooser onChoose={setFolder} onClose={closePicker} />
          )}
        </FileModal>
      )}
    </>
  );
}

export function GuestUploadRequest({ data, transport }) {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(data.remainingUploads);
  return (
    <div
      className="fm-app"
      style={{ justifyContent: "center", alignItems: "center", padding: 25 }}
    >
      <main className="fm-modal">
        <div className="fm-brand">
          <span>E</span>
          <div>
            EAC <b>Files</b>
          </div>
        </div>
        <h1 style={{ marginTop: 25, fontSize: 24 }}>{data.title}</h1>
        <p className="fm-muted" style={{ marginTop: 15 }}>
          {data.description}
        </p>
        <div className="fm-notice">
          Upload only · Up to {bytes(data.maxUploadBytes)} per file ·{" "}
          {remaining} submissions remaining
        </div>
        <p className="fm-muted">
          You can submit requested files here. This link does not provide access
          to the destination folder or its contents.
        </p>
        <label>
          Select files
          <input
            type="file"
            multiple
            disabled={busy || !remaining}
            onChange={(e) => setFiles([...e.target.files])}
          />
        </label>
        <button
          className="fm-primary"
          disabled={busy || !files.length || !remaining}
          onClick={async () => {
            setBusy(true);
            for (const file of files) {
              try {
                if (file.size > data.maxUploadBytes)
                  throw new Error("File exceeds the request size limit");
                const form = new FormData();
                form.append("file", file);
                const result = await transport.upload(form);
                setRemaining(result.remainingUploads);
                setResults((previous) => [
                  ...previous,
                  { name: file.name, ok: true },
                ]);
              } catch (e) {
                setResults((previous) => [
                  ...previous,
                  { name: file.name, ok: false, error: e.message },
                ]);
              }
            }
            setFiles([]);
            setBusy(false);
          }}
        >
          {busy ? "Submitting…" : "Submit files"}
        </button>
        {results.map((result, i) => (
          <p key={i} className={result.ok ? "fm-notice" : "fm-error"}>
            {result.name}: {result.ok ? "Received" : result.error}
          </p>
        ))}
      </main>
    </div>
  );
}
