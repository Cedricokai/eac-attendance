/* eslint-disable react/prop-types */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Download,
  Save,
  Loader2,
  History,
  Share2,
  MessageSquare,
} from "lucide-react";
import { fileApi, fileBlob, downloadBlob, bytes } from "./fileApi";
import { HistoryDialog, ShareDialog, CommentsDialog } from "./FileDialogs";
import { ReturnWorkDialog } from "./FileWorkReview";
import { showConfirm } from "../../services/dialogService";
import EditorBoundary from "./EditorBoundary";
const DocumentEditor = lazy(() => import("./editors/DocumentEditor"));
const SpreadsheetEditor = lazy(() => import("./editors/SpreadsheetEditor"));
const ImageEditor = lazy(() => import("./editors/ImageEditor"));
const PdfEditor = lazy(() => import("./editors/PdfEditor"));
const PdfPreview = lazy(() => import("./editors/PdfPreview"));
const OriginalWordEditor = lazy(() => import("./editors/OriginalWordEditor"));
const LiveWorkspace = lazy(() => import("./LiveWorkspace"));
const OnlyOfficeWorkspace = lazy(() => import("./OnlyOfficeWorkspace"));

function TextEditor({ blob, canEdit, onChange, extension }) {
  const [text, setText] = useState("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    blob.text().then(setText);
  }, [blob]);
  const change = (value) => {
    setText(value);
    onChange(new Blob([value], { type: blob.type || "text/plain" }));
  };
  const validate = () => {
    try {
      if (extension === "json") {
        const data = JSON.parse(text);
        setError("Valid JSON");
        return data;
      }
      if (extension === "xml") {
        const xml = new DOMParser().parseFromString(text, "application/xml");
        if (xml.querySelector("parsererror"))
          throw new Error(xml.querySelector("parsererror").textContent);
        setError("Valid XML");
        return xml;
      }
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="fm-editor-toolbar">
        <input
          aria-label="Find text"
          placeholder="Find text"
          value={find}
          onChange={(e) => setFind(e.target.value)}
        />
        <input
          aria-label="Replace with"
          placeholder="Replace with"
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
        />
        <button
          disabled={!canEdit || !find}
          onClick={() => change(text.split(find).join(replace))}
        >
          Replace all
        </button>
        <button
          disabled={!find}
          onClick={() => {
            const start = text.indexOf(find, ref.current.selectionEnd);
            if (start >= 0) {
              ref.current.focus();
              ref.current.setSelectionRange(start, start + find.length);
            } else {
              ref.current.setSelectionRange(0, 0);
              setError("No more matches; search restarts from the beginning.");
            }
          }}
        >
          Find next
        </button>
        {["json", "xml"].includes(extension) && (
          <button onClick={validate}>Validate {extension.toUpperCase()}</button>
        )}
        {extension === "json" && (
          <button
            disabled={!canEdit}
            onClick={() => {
              try {
                change(JSON.stringify(JSON.parse(text), null, 2));
                setError("");
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            Format JSON
          </button>
        )}
      </div>
      {error && (
        <div className="fm-notice" role="status">
          {error}
        </div>
      )}
      <div className="fm-editor-content">
        <div className="fm-code-wrap">
          <div className="fm-code-lines" aria-hidden="true">
            {Array.from(
              { length: Math.min(10000, text.split("\n").length) },
              (_, i) => i + 1,
            ).join("\n")}
          </div>
          <textarea
            ref={ref}
            aria-label="File contents"
            spellCheck={false}
            readOnly={!canEdit}
            value={text}
            onChange={(e) => change(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}

export default function FileWorkspace({ item, onClose, guest = null }) {
  const [current, setCurrent] = useState(item);
  const [blob, setBlob] = useState(null);
  const [payload, setPayload] = useState(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [liveMode, setLiveMode] = useState(false);
  const saving = useRef(false);
  const generation = useRef(0);
  const closeDialog = useCallback(() => setDialog(null), []);
  const extension = current.name.split(".").pop().toLowerCase();
  const officeFile = !guest && ["docx", "xlsx", "pptx"].includes(extension);
  const textFile = ["txt", "json", "xml", "md", "log"].includes(extension);
  const documentFile = ["eacdoc", "docx"].includes(extension);
  const spreadsheetFile = ["eacsheet", "xlsx", "csv"].includes(extension);
  const imageFile =
    current.mediaType.startsWith("image/") && extension !== "svg";
  const pdfFile = extension === "pdf";
  const presentationFile = ["eacslides", "pptx"].includes(extension);
  const native =
    textFile ||
    [
      "eacdoc",
      "docx",
      "eacsheet",
      "xlsx",
      "csv",
      "pdf",
      "png",
      "jpg",
      "jpeg",
      "webp",
    ].includes(extension);
  const canEdit =
    ["OWNER", "MANAGER", "EDITOR"].includes(current.access) &&
    current.editorEnabled !== false &&
    current.canEdit !== false && (!guest || !["docx", "xlsx", "pptx"].includes(extension));
  const canManage = ["OWNER", "MANAGER"].includes(current.access);
  const loadBlob = useCallback(
    (target) => (guest ? guest.download() : fileBlob(target)),
    [guest],
  );
  useEffect(() => {
    if (officeFile) return;
    if (item.canDownload===false) {setError("Original-file downloads are disabled. Online preview for this format is unavailable without transferring its original bytes.");return;}
    let cancelled = false;
    loadBlob(item)
      .then((content) => {
        if (!cancelled) {
          setBlob(content);
          setStatus("Saved");
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [item, loadBlob, officeFile]);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const changed = useCallback((content) => {
    setPreparing(false);
    setPayload(content);
    generation.current++;
    setDirty(true);
    setStatus("Unsaved changes");
  }, []);
  const save = useCallback(async () => {
    if (
      !dirty ||
      preparing ||
      !payload ||
      saving.current ||
      !canEdit ||
      !native
    )
      return;
    saving.current = true;
    setStatus("Saving…");
    setError("");
    const savedGeneration = generation.current;
    try {
      const form = new FormData();
      form.append("file", payload, current.name);
      form.append("revision", current.revision);
      const updated = guest
        ? await guest.save(form)
        : await fileApi("/" + current.id + "/content", {
            method: "POST",
            body: form,
          });
      setCurrent(updated);
      if (generation.current === savedGeneration) {
        setDirty(false);
        setStatus("Saved");
      } else setStatus("Unsaved changes");
    } catch (e) {
      setError(e.message);
      setStatus("Save failed — keep this window open");
    } finally {
      saving.current = false;
    }
  }, [dirty, preparing, payload, canEdit, native, current, guest]);
  useEffect(() => {
    if (!dirty || preparing || error || !native) return;
    const timer = setTimeout(save, 1800);
    return () => clearTimeout(timer);
  }, [dirty, preparing, save, error, native]);
  const saveCopy = async (content, name) => {
    if (guest) {
      downloadBlob(content, name);
      return;
    }
    if (saving.current) return;
    saving.current = true;
    try {
      const form = new FormData();
      form.append("file", content, name);
      if (current.parentId) form.append("parentId", current.parentId);
      const created = await fileApi("/upload", { method: "POST", body: form });
      setCurrent(created);
      setBlob(content);
      setPayload(null);
      setPreparing(false);
      setDirty(false);
      setStatus("Saved");
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      saving.current = false;
    }
  };
  const close = async () => {
    if (
      !dirty ||
      (await showConfirm("You have unsaved changes. Close without saving?"))
    )
      onClose();
  };
  const reload = async () => {
    if (
      dirty &&
      !(await showConfirm(
        "Reloading discards your local unsaved edits. Continue?",
      ))
    )
      return;
    try {
      const updated = guest
        ? await guest.state()
        : await fileApi("/" + current.id);
      const content = await loadBlob(updated);
      setCurrent(updated);
      setBlob(content);
      setReloadKey((k) => k + 1);
      setPreparing(false);
      setPayload(null);
      setDirty(false);
      setError("");
      setStatus("Saved");
    } catch (e) {
      setError(e.message);
    }
  };
  if (officeFile) return <Suspense fallback={<div className="fm-notice">Opening native Office workspace…</div>}><OnlyOfficeWorkspace item={current} onClose={onClose}/></Suspense>;
  if (liveMode)
    return (
      <Suspense fallback={<div>Connecting…</div>}>
        <LiveWorkspace item={current} onClose={onClose} />
      </Suspense>
    );
  return (
    <section
      className={`fm-editor ${documentFile ? "fm-word-editor" : spreadsheetFile ? "fm-excel-editor" : ""}`}
      aria-label="EAC file workspace"
    >
      <header className="fm-editor-bar">
        <button onClick={close}>
          <ArrowLeft size={17} />
          {guest ? "Close shared file" : "Files"}
        </button>
        <div>
          <h2>{current.name}</h2>
          <small>
            EAC{" "}
            {documentFile
              ? "Document Editor"
              : spreadsheetFile
                ? "Spreadsheet Editor"
                : pdfFile
                  ? "PDF Editor"
                  : imageFile
                    ? "Image Editor"
                    : presentationFile
                      ? "Presentation Editor"
                      : textFile
                        ? "Text Editor"
                        : "Preview"}{" "}
            · {bytes(current.sizeBytes)}
          </small>
        </div>
        <small role="status" className={error ? "fm-save-error" : ""}>
          {status}
        </small>
        {native && canEdit && (
          <button
            className="fm-primary"
            disabled={!dirty || preparing}
            onClick={save}
          >
            <Save size={16} />
            Save
          </button>
        )}
        {!guest &&
          current.editorEnabled !== false &&
          ["eacdoc", "eacsheet"].includes(extension) && (
            <button disabled={dirty} onClick={() => setLiveMode(true)}>
              Join live session
            </button>
          )}
        {!guest && canManage && (
          <button onClick={() => setDialog("share")}>
            <Share2 size={16} />
            Share
          </button>
        )}
        {!guest && canEdit && current.access !== "OWNER" && <button disabled={dirty || preparing} title={dirty ? "Save your changes before sending back" : undefined} onClick={() => setDialog("return-work")}>Send back to owner</button>}
        {!guest && (
          <button onClick={() => setDialog("history")}>
            <History size={16} />
            History
          </button>
        )}
        <button
          disabled={current.canDownload===false}
          onClick={async () => {
            try {
              downloadBlob(await loadBlob(current), current.name);
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Download size={16} />
          Download
        </button>
      </header>
      {current.editorEnabled === false && (
        <div className="fm-notice">
          Your administrator disabled editing for this format. You can preview
          or download the file.
        </div>
      )}
      {error && (
        <div className="fm-error" role="alert">
          {error}
          {dirty && (
            <>
              <button onClick={save}>Retry save</button>
              <button onClick={() => downloadBlob(payload, current.name)}>
                Download unsaved copy
              </button>
              <button
                onClick={() =>
                  saveCopy(
                    payload,
                    current.name.replace(/(\.[^.]+)$/, " (recovered)$1"),
                  )
                }
              >
                Save a recovered copy
              </button>
            </>
          )}
          <button onClick={reload}>Reload saved version</button>
        </div>
      )}
      {!blob ? (
        <div className="fm-editor-content">
          <Loader2 className="fm-spin" />
        </div>
      ) : (
        <EditorBoundary key={current.id + "-" + reloadKey}>
          <Suspense fallback={<div className="fm-notice">Loading editor…</div>}>
            {presentationFile ? (
              <div className="fm-notice">
                PowerPoint editing has been removed. Your existing file is
                preserved and can still be downloaded.
              </div>
            ) : extension === "docx" ? (
              <OriginalWordEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                canEdit={canEdit}
                onChange={changed}
                onPreparing={() => {
                  setPreparing(true);
                  setDirty(true);
                  setStatus("Preparing document changes…");
                }}
              />
            ) : pdfFile && blob.size > 50 * 1024 * 1024 ? (
              <PdfPreview blob={blob} />
            ) : pdfFile ? (
              <PdfEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                canEdit={canEdit}
                item={current}
                onChange={changed}
              />
            ) : imageFile ? (
              <ImageEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                canEdit={canEdit}
                item={current}
                onChange={changed}
                onSaveCopy={saveCopy}
              />
            ) : spreadsheetFile ? (
              <SpreadsheetEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                extension={extension}
                canEdit={canEdit}
                item={current}
                onChange={changed}
                onSaveCopy={saveCopy}
              />
            ) : documentFile ? (
              <DocumentEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                extension={extension}
                canEdit={canEdit && (!guest || extension === "eacdoc")}
                item={current}
                onChange={changed}
                onSaveCopy={saveCopy}
              />
            ) : textFile ? (
              <TextEditor
                key={current.id + "-" + reloadKey}
                blob={blob}
                extension={extension}
                canEdit={canEdit}
                onChange={changed}
              />
            ) : (
              <main className="fm-editor-content">
                {current.mediaType.startsWith("image/") &&
                extension !== "svg" ? (
                  <img
                    className="fm-editor-preview"
                    src={url}
                    alt={current.name}
                  />
                ) : extension === "pdf" ? (
                  <iframe
                    title={current.name}
                    src={url}
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="fm-empty">
                    <Download size={40} />
                    <h2>Download this file to open it</h2>
                    <p>
                      A native editor for this format is not available yet. Your
                      uploaded original is preserved.
                    </p>
                    <button
                      className="fm-primary"
                      onClick={() => downloadBlob(blob, current.name)}
                    >
                      Download original
                    </button>
                  </div>
                )}
              </main>
            )}
          </Suspense>
        </EditorBoundary>
      )}
      <footer className="fm-editor-status">
        <span>{canEdit ? "Editing permitted" : "View only"}</span>
        <span>Version {current.currentVersion}</span>
        <span>Saved changes create immutable versions.</span>
      </footer>
      {!guest && (
        <button
          style={{ position: "absolute", bottom: 45, right: 25 }}
          onClick={() => setDialog("comments")}
        >
          <MessageSquare size={17} />
          Comments
        </button>
      )}
      {dialog === "comments" && (
        <CommentsDialog item={current} onClose={closeDialog} />
      )}
      {dialog === "history" && (
        <HistoryDialog item={current} onClose={closeDialog} refresh={reload} />
      )}
      {dialog === "share" && (
        <ShareDialog item={current} onClose={closeDialog} refresh={() => {}} />
      )}
      {dialog === "return-work" && <ReturnWorkDialog item={current} onClose={closeDialog}/>}
    </section>
  );
}
