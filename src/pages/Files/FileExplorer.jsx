/* eslint-disable react/prop-types */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {OfficeDownloadDialog} from "./OfficeProtectionDialogs";
import {ReturnWorkDialog} from "./FileWorkReview";
import { toast } from "react-toastify";
import {
  FolderOpen,
  MessageCircle,
  Folder,
  FileText,
  Image,
  Sheet,
  Presentation,
  File,
  Home,
  Users,
  Send,
  Clock,
  Star,
  Trash2,
  HardDrive,
  Activity,
  Settings,
  Search,
  Plus,
  Upload,
  LayoutGrid,
  List,
  ArrowDownWideNarrow,
  ChevronRight,
  MoreHorizontal,
  Download,
  Share2,
  Pencil,
  Copy,
  Move,
  RotateCcw,
  History,
  ArrowLeft,
  X,
  Menu,
  ShieldCheck,
  Loader2,
  FileInput,
} from "lucide-react";
import {
  fileApi,
  jsonRequest,
  fileBlob,
  downloadBlob,
  bytes,
  date,
} from "./fileApi";
import {
  FileModal,
  NameDialog,
  ShareDialog,
  HistoryDialog,
  DestinationDialog,
} from "./FileDialogs";
import { showConfirm } from "../../services/dialogService";
import "./files.css";
import FileLoadingScreen from "./FileLoadingScreen";
import ThemeToggle from "../../components/ThemeToggle";
import FolderIcon from "./FolderIcon";

const ShareViaCommunication = lazy(
  () => import("../Communication/ShareViaCommunication"),
);
const FileWorkspace = lazy(() => import("./FileWorkspace"));
const FileWorkReview = lazy(() => import("./FileWorkReview"));
const OfficeTemplateGallery = lazy(() => import("./OfficeTemplateGallery"));
const FileRequestsPanel = lazy(() => import("./FileRequestsPanel"));
const OperationPanel = lazy(() => import("./OperationPanel"));
const QuotaPanel = lazy(() => import("./QuotaPanel"));
const AuditPanel = lazy(() => import("./AuditPanel"));
const StorageAnalytics = lazy(() => import("./StorageAnalytics"));
const BackupPanel = lazy(() => import("./BackupPanel"));
const navigation = [
  ["home", "Home", Home],
  ["files", "My files", FolderOpen],
  ["shared", "Shared with me", Users],
  ["shared-by-me", "Shared by me", Send],
  ["work-review", "Employee work review", ShieldCheck],
  ["recent", "Recent", Clock],
  ["starred", "Starred", Star],
  ["requests", "File requests", FileInput],
  ["trash", "Recycle bin", Trash2],
  ["storage", "Storage", HardDrive],
  ["activity", "Activity", Activity],
];
const titles = Object.fromEntries(navigation.map(([id, name]) => [id, name]));
function FileIcon({ item, size = 24 }) {
  if (item.folder)
    return <FolderIcon size={size} hasContents={item.hasContents} />;
  const ext = item.name.split(".").pop().toLowerCase();
  const Icon = item.folder
    ? Folder
    : item.mediaType.startsWith("image/")
      ? Image
      : ["xlsx", "csv", "eacsheet"].includes(ext)
        ? Sheet
        : ["pptx", "eacslides"].includes(ext)
          ? Presentation
          : ["docx", "pdf", "txt", "eacdoc"].includes(ext)
            ? FileText
            : File;
  return (
    <Icon
      size={size}
      className={`fm-file-icon ${item.folder ? "folder" : ext === "pdf" ? "pdf" : ["xlsx", "csv", "eacsheet"].includes(ext) ? "sheet" : ["doc", "docx", "eacdoc"].includes(ext) ? "word" : ["pptx", "eacslides"].includes(ext) ? "slides" : "document"}`}
    />
  );
}
export default function FileExplorer() {
  const [params, setParams] = useSearchParams();
  const scope = params.get("view") || "files";
  const parent = Number(params.get("folder")) || null;
  const [data, setData] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
  });
  const [storage, setStorage] = useState(null);
  const [trail, setTrail] = useState([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [grid, setGrid] = useState(
    () => localStorage.getItem("eac-files-view") !== "list",
  );
  const [sort, setSort] = useState("name");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingDelayComplete, setLoadingDelayComplete] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLoadingDelayComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [menu, setMenu] = useState(null);
  const [newMenu, setNewMenu] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [uploading, setUploading] = useState("");
  const [dragging, setDragging] = useState(false);
  const editorDisabled = (type) =>
    (storage?.disabledEditors || "").split(",").includes(type);
  const [settings, setSettings] = useState(null);
  const savedSettings = useRef(null);
  const [workspace, setWorkspace] = useState(null);
  const upload = useRef(null);
  const folderUpload = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);
  const close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setPage(0);
    setSelected([]);
    setMenu(null);
    setSidebar(false);
  }, [scope, parent]);
  useEffect(() => {
    fileApi("/storage")
      .then(setStorage)
      .catch((e) => setError(e.message));
  }, [refreshKey]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const options = { signal: controller.signal };
    const load = async () => {
      if (scope === "settings") {
        const config = await fileApi("/settings", options);
        savedSettings.current = config;
        setSettings(config);
        return;
      }
      if (["storage", "requests", "backups", "activity", "work-review"].includes(scope))
        return;
      const result = await fileApi(
        `?scope=${scope === "home" ? "recent" : scope}&page=${page}&size=50&q=${encodeURIComponent(search)}${parent ? `&parentId=${parent}` : ""}`,
        options,
      );
      setData(result);
      setTrail(
        await fileApi(
          `/breadcrumbs${parent ? `?parentId=${parent}` : ""}`,
          options,
        ),
      );
    };
    load()
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setInitialLoading(false);
        }
      });
    return () => controller.abort();
  }, [scope, parent, page, search, refreshKey]);
  useEffect(() => {
    const id = params.get("file");
    if (!id) return;
    fileApi(`/${id}`)
      .then(setWorkspace)
      .catch((e) => toast.error(e.message));
  }, [params]);
  useEffect(() => {
    const dismiss = (e) => {
      if (!e.target.closest("[data-file-menu]")) {
        setMenu(null);
        setNewMenu(false);
      }
    };
    document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, []);
  const navigate = (view, folder) => {
    setQuery("");
    setType("all");
    setParams({ view, ...(folder ? { folder } : {}) });
  };
  const run = async (action) => {
    try {
      await action();
      refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };
  const open = (item) =>
    item.folder ? navigate("files", item.id) : setWorkspace(item);
  const download = (item) => {
    if(item.canDownload===false){toast.error("The owner has disabled downloads. Open the document online in EAC.");return;}
    if(item.name?.toLowerCase().endsWith(".xlsx")){setDialog({kind:"office-download",item});return;}
    return run(async () => downloadBlob(await fileBlob(item), item.name));
  };
  const remove = async (items, permanent = false) => {
    if (
      !(await showConfirm(
        permanent
          ? `Permanently delete ${items.length} item(s)? This cannot be undone.`
          : `Move ${items.length} item(s) to the recycle bin?`,
      ))
    )
      return;
    for (const item of items) {
      try {
        await fileApi(
          `/${item.id}${permanent ? "/permanent" : `?revision=${item.revision}`}`,
          { method: "DELETE" },
        );
      } catch (e) {
        toast.error(`${item.name}: ${e.message}`);
      }
    }
    setSelected([]);
    refresh();
  };
  const uploadFiles = async (files) => {
    const all = Array.from(files);
    if (!all.length) return;
    const folders = new Map();
    let done = 0;
    for (const file of all) {
      setUploading(`Uploading ${++done} of ${all.length}: ${file.name}`);
      try {
        if (storage && file.size > storage.maxUploadBytes)
          throw new Error(
            `Maximum upload size is ${bytes(storage.maxUploadBytes)}`,
          );
        let destination = parent;
        const parts = file.webkitRelativePath?.split("/").slice(0, -1) || [];
        for (let i = 0; i < parts.length; i++) {
          const path = parts.slice(0, i + 1).join("/");
          if (!folders.has(path)) {
            const created = await fileApi(
              "/folders",
              jsonRequest("POST", { name: parts[i], parentId: destination }),
            );
            folders.set(path, created.id);
          }
          destination = folders.get(path);
        }
        const form = new FormData();
        form.append("file", file);
        if (destination) form.append("parentId", destination);
        await fileApi("/upload", { method: "POST", body: form });
      } catch (e) {
        toast.error(`${file.name}: ${e.message}`);
      }
    }
    setUploading("");
    refresh();
    upload.current.value = "";
    folderUpload.current.value = "";
  };
  const createText = async (name) => {
    if (["document","spreadsheet"].includes(dialog?.kind)) {
      const item = await fileApi("/onlyoffice/create", { method:"POST", body:JSON.stringify({name,parentId:parent||null,type:dialog.kind==="document"?"docx":"xlsx"}) });
      setWorkspace(item); refresh(); return;
    }
    let content = new Blob([""], { type: "text/plain" });
    if (dialog?.kind === "document") {
      const format = await import("./editors/documentFormat");
      content = format.documentBlob(format.emptyDocument());
    }
    if (dialog?.kind === "spreadsheet") {
      const format = await import("./editors/workbookFormat");
      content = format.workbookBlob(format.blankWorkbook(name));
    }
    if (dialog?.kind === "presentation") {
      const format = await import("./editors/presentationFormat");
      content = format.presentationBlob(format.blankPresentation());
    }
    const form = new FormData();
    form.append("file", content, name);
    if (parent) form.append("parentId", parent);
    const item = await fileApi("/upload", { method: "POST", body: form });
    setWorkspace(item);
    refresh();
  };
  const visible = data.content
    .filter(
      (item) =>
        type === "all" ||
        (type === "folders"
          ? item.folder
          : !item.folder &&
            (type === "images"
              ? item.mediaType.startsWith("image/")
              : ["docx", "pdf", "txt", "eacdoc"].includes(
                  item.name.split(".").pop(),
                ))),
    )
    .sort(
      (a, b) =>
        Number(b.folder) - Number(a.folder) ||
        (sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "size"
            ? b.sizeBytes - a.sizeBytes
            : new Date(b.updatedAt) - new Date(a.updatedAt)),
    );
  const chosen = visible.filter((item) => selected.includes(item.id));
  const pct = storage
    ? Math.min(
        100,
        (storage.quotaBytes > 0 ? storage.usedBytes / storage.quotaBytes : 0) *
          100,
      )
    : 0;
  const fileActions = (item) => (
    <>
      {scope === "trash" ? (
        <>
          <button
            onClick={() =>
              run(() => fileApi(`/${item.id}/restore`, { method: "POST" }))
            }
          >
            <RotateCcw size={16} />
            Restore
          </button>
          <button className="fm-danger" onClick={() => remove([item], true)}>
            <Trash2 size={16} />
            Permanently delete
          </button>
        </>
      ) : (
        <>
          <button onClick={() => open(item)}>
            <FolderOpen size={16} />
            {item.folder ? "Open folder" : "Open"}
          </button>
          {!item.folder && /\.xlsx$/i.test(item.name) && ["OWNER","MANAGER"].includes(item.access) && <button onClick={()=>open(item)}><Sheet size={16}/>Manage protected ranges</button>}
          <button
            onClick={() =>
              run(() =>
                fileApi(`/${item.id}/star?value=${!item.starred}`, {
                  method: "PUT",
                }),
              )
            }
          >
            <Star size={16} />
            {item.starred ? "Remove star" : "Add to starred"}
          </button>
          {!item.folder && (
            <>
              <button disabled={item.canDownload===false} onClick={() => download(item)}>
                <Download size={16} />
                Download
              </button>
              <button onClick={() => setDialog({ kind: "history", item })}>
                <History size={16} />
                Version history
              </button>
              {item.canEdit && item.access !== "OWNER" && <button onClick={() => setDialog({kind:"return-work",item})}><Send size={16}/>Send back to owner</button>}
            </>
          )}
          <button onClick={() => setDialog({ kind: "copy", item })}>
            <Copy size={16} />
            Make a copy
          </button>
          {["OWNER", "MANAGER", "EDITOR"].includes(item.access) && (
            <button onClick={() => setDialog({ kind: "rename", item })}>
              <Pencil size={16} />
              Rename
            </button>
          )}
          {["OWNER", "MANAGER"].includes(item.access) && (
            <>
              <button onClick={() => setDialog({ kind: "share", item })}>
                <Share2 size={16} />
                Share & manage access
              </button>
              {item.access === "OWNER" && (
                <button onClick={() => setDialog({ kind: "move", item })}>
                  <Move size={16} />
                  Move
                </button>
              )}
              {!item.folder && (
                <button
                  onClick={() =>
                    setDialog({ kind: "communication", items: [item] })
                  }
                >
                  <MessageCircle size={16} /> Share via Communication
                </button>
              )}
              <button className="fm-danger" onClick={() => remove([item])}>
                <Trash2 size={16} />
                Move to recycle bin
              </button>
            </>
          )}
        </>
      )}
    </>
  );
  if (initialLoading || !loadingDelayComplete) return <FileLoadingScreen />;
  return (
    <div
      className="fm-app"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (["files", "home"].includes(scope))
          uploadFiles(event.dataTransfer.files);
      }}
    >
      <aside className={`fm-sidebar ${sidebar ? "is-open" : ""}`}>
        <Link className="fm-brand" to="/centralizedDashboard">
          <span>E</span>
          <div>
            EAC <b>Files</b>
            <small>YOUR WORK, CONNECTED</small>
          </div>
        </Link>
        <button
          className="fm-primary fm-new"
          onClick={() => {
            navigate("files");
            setDialog({ kind: "folder" });
          }}
        >
          <Plus size={18} />
          Create folder
        </button>
        <nav aria-label="File navigation">
          {navigation.map(([id, name, Icon]) => (
            <button
              key={id}
              className={scope === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              {name}
            </button>
          ))}
          {storage?.admin && (
            <button
              className={scope === "settings" ? "active" : ""}
              onClick={() => navigate("settings")}
            >
              <Settings size={19} />
              File settings
            </button>
          )}
          {storage?.admin && (
            <button
              className={scope === "backups" ? "active" : ""}
              onClick={() => navigate("backups")}
            >
              <HardDrive size={19} />
              Backups & recovery
            </button>
          )}
        </nav>
        <div className="fm-sidebar-bottom">
          <Link to="/centralizedDashboard">
            <ArrowLeft size={16} />
            Back to EAC
          </Link>
          <div className="fm-capacity">
            <HardDrive size={17} />
            <strong>Storage</strong>
            <span>
              {storage?.quotaBytes === 0 ? "Unlimited" : `${Math.round(pct)}%`}
            </span>
            <progress max="100" value={pct} />
            <small>
              {bytes(storage?.usedBytes)} of{" "}
              {storage?.quotaBytes === 0
                ? "Unlimited"
                : bytes(storage?.quotaBytes)}{" "}
              used
            </small>
            <small>Includes versions and recycled files</small>
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="fm-sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <main className="fm-main">
        <header className="fm-topbar">
          <button
            className="fm-mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebar(true)}
          >
            <Menu size={22} />
          </button>
          <div className="fm-search">
            <Search size={20} />
            <input
              aria-label="Search files"
              placeholder="Search your files and folders"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={16} />
              </button>
            )}
          </div>
          <Link
            to="/communication"
            className="fm-communication-link"
            title="Send a message to a colleague"
          >
            <MessageCircle size={18} />
            <span>Send a message</span>
          </Link>
          <span className="fm-security">
            <ShieldCheck size={16} />
            Company workspace
          </span>
          <span className="fm-avatar" title="Your account">
            {(() => {
              try {
                return (
                  JSON.parse(localStorage.getItem("userData"))?.name?.charAt(
                    0,
                  ) || "E"
                );
              } catch {
                return "E";
              }
            })()}
          </span>
          <ThemeToggle />
        </header>
        <section className="fm-content">
          <div className="fm-heading">
            <div>
              <p className="fm-eyebrow">EAC WORKSPACE</p>
              <h1>
                {parent
                  ? trail[trail.length - 1]?.name || "Folder"
                  : titles[scope] || "File settings"}
              </h1>
              <p className="fm-muted">
                {scope === "home"
                  ? "Pick up where you left off."
                  : scope === "trash"
                    ? "Restore deleted work or remove it permanently."
                    : scope === "shared"
                      ? "Work shared with you by your colleagues."
                      : "A secure home for your team’s work."}
              </p>
            </div>
            {["home", "files"].includes(scope) && (
              <div className="fm-create-actions">
                <div className="fm-menu-anchor" data-file-menu>
                  <button
                    className="fm-primary"
                    onClick={() => setNewMenu(!newMenu)}
                  >
                    <Plus size={18} />
                    New
                  </button>
                  {newMenu && (
                    <div className="fm-menu">
                      <button
                        onClick={() => {
                          setDialog({ kind: "folder" });
                          setNewMenu(false);
                        }}
                      >
                        <Folder size={17} />
                        Folder
                      </button>
                      <button
                        disabled={editorDisabled("document")}
                        onClick={() => {
                          setDialog({ kind: "document" });
                          setNewMenu(false);
                        }}
                      >
                        <FileText size={17} />
                        Document
                      </button>
                      <button
                        disabled={editorDisabled("spreadsheet")}
                        onClick={() => {
                          setDialog({ kind: "spreadsheet" });
                          setNewMenu(false);
                        }}
                      >
                        <Sheet size={17} />
                        Spreadsheet
                      </button>
                      <button onClick={()=>{setDialog({kind:"office-templates"});setNewMenu(false);}}><FileText size={17}/>From an Office template</button>
                      <button
                        disabled={editorDisabled("text")}
                        onClick={() => {
                          setDialog({ kind: "text" });
                          setNewMenu(false);
                        }}
                      >
                        <FileText size={17} />
                        Text file
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => upload.current.click()}
                  disabled={!!uploading}
                >
                  <Upload size={17} />
                  Upload files
                </button>
                <button
                  onClick={() => folderUpload.current.click()}
                  disabled={!!uploading}
                >
                  <FolderOpen size={17} />
                  Upload folder
                </button>
              </div>
            )}
          </div>
          <input
            ref={upload}
            type="file"
            multiple
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <input
            ref={folderUpload}
            type="file"
            multiple
            webkitdirectory=""
            hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
          {uploading && (
            <div className="fm-notice" role="status">
              <Loader2 className="fm-spin" size={18} />
              {uploading}
            </div>
          )}
          {error && (
            <div className="fm-error" role="alert">
              {error}
              <button onClick={refresh}>Retry</button>
            </div>
          )}
          {loading ? (
            <div className="fm-skeleton" aria-label="Loading files">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} />
              ))}
            </div>
          ) : scope === "backups" ? (
            <Suspense fallback={<p>Loading backups…</p>}>
              <BackupPanel />
            </Suspense>
          ) : scope === "work-review" ? (
            <Suspense fallback={<p>Loading employee work…</p>}><FileWorkReview onOpen={open}/></Suspense>
          ) : scope === "requests" ? (
            <Suspense fallback={<p>Loading file requests…</p>}>
              <FileRequestsPanel />
            </Suspense>
          ) : scope === "storage" ? (
            <>
              <div className="fm-storage-heading">
                <HardDrive size={40} />
                <div>
                  <h2>{bytes(storage?.usedBytes)} used</h2>
                  <p>
                    of{" "}
                    {storage?.quotaBytes === 0
                      ? "Unlimited"
                      : bytes(storage?.quotaBytes)}{" "}
                    available to your account
                  </p>
                </div>
              </div>
              <progress className="fm-storage-progress" max="100" value={pct} />
              <div className="fm-stat-grid">
                {[
                  ["Files", storage?.files],
                  ["Folders", storage?.folders],
                  ["Upload limit", bytes(storage?.maxUploadBytes)],
                  [
                    "Available",
                    storage?.quotaBytes === 0
                      ? "Unlimited"
                      : bytes(
                          Math.max(
                            0,
                            (storage?.quotaBytes || 0) -
                              (storage?.usedBytes || 0),
                          ),
                        ),
                  ],
                ].map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
              <p className="fm-muted">
                Usage includes every preserved version and files in your recycle
                bin. Permanently removing eligible items releases their storage.
              </p>
              <Suspense fallback={<p>Loading storage analysis…</p>}>
                <StorageAnalytics />
              </Suspense>
            </>
          ) : scope === "settings" && settings ? (
            <>
              <form
                className="fm-settings"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const retention = [
                    "recycleRetentionDays",
                    "versionRetentionDays",
                    "auditRetentionDays",
                  ];
                  if (
                    retention.some(
                      (key) =>
                        Number(settings[key]) > 0 &&
                        Number(settings[key]) !==
                          Number(savedSettings.current?.[key] || 0),
                    ) &&
                    !(await showConfirm(
                      "Apply retention settings? Recycled files, old intermediate versions, and audit events can be permanently removed after the chosen days. Version 1 and the current version of retained files are preserved. Keep a verified backup.",
                    ))
                  )
                    return;
                  run(async () => {
                    const updated = await fileApi(
                      "/settings",
                      jsonRequest("PUT", settings),
                    );
                    savedSettings.current = updated;
                    setSettings(updated);
                    toast.success("File settings saved");
                  });
                }}
              >
                <h2>Upload & storage policy</h2>
                <p className="fm-muted">
                  These limits are enforced by the backend. The deployment
                  ceiling is 500 MB per file.
                </p>
                {[
                  ["Maximum upload (bytes)", "maxUploadBytes"],
                  [
                    "Default user quota (bytes; 0 = unlimited)",
                    "userQuotaBytes",
                  ],
                  [
                    "Organization quota (bytes; 0 = unlimited)",
                    "organizationQuotaBytes",
                  ],
                  ["Maximum filename length", "maxFilenameLength"],
                ].map(([label, key]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      type="number"
                      min={key.includes("Quota") ? "0" : "1"}
                      value={settings[key]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Blocked extensions (comma-separated)
                  <input
                    value={settings.blockedExtensions}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        blockedExtensions: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="fm-check">
                  <input
                    type="checkbox"
                    checked={settings.internalSharing}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        internalSharing: e.target.checked,
                      })
                    }
                  />
                  Enable internal sharing
                </label>
                <label className="fm-check">
                  <input
                    type="checkbox"
                    checked={!!settings.externalSharing}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        externalSharing: e.target.checked,
                      })
                    }
                  />
                  Enable external guest invitations (email verification
                  required)
                </label>
                <label className="fm-check">
                  <input
                    type="checkbox"
                    checked={!!settings.collaborationEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        collaborationEnabled: e.target.checked,
                      })
                    }
                  />
                  Enable live collaboration (requires the local collaboration
                  service)
                </label>
                <label className="fm-check">
                  <input
                    type="checkbox"
                    checked={!!settings.emailNotifications}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        emailNotifications: e.target.checked,
                      })
                    }
                  />
                  Automatic file email notices
                </label>
                <p className="fm-muted">
                  Uses the existing EAC SMTP settings for access revocation,
                  @mentions, received file requests, failed backups, and storage
                  warnings. Storage warnings are limited to one per account per
                  24 hours. Explicit share/invitation emails and verification
                  codes follow their own send controls. Check Activity for
                  delivery failures.
                </p>
                <h3>Native editors</h3>
                <p className="fm-muted">
                  Disable an editor to make its files read-only in EAC.
                  Downloads and version recovery remain available.
                </p>
                {["document", "spreadsheet", "pdf", "image", "text"].map(
                  (type) => (
                    <label className="fm-check" key={type}>
                      <input
                        type="checkbox"
                        checked={
                          !(settings.disabledEditors || "")
                            .split(",")
                            .includes(type)
                        }
                        onChange={(e) => {
                          const disabled = new Set(
                            (settings.disabledEditors || "")
                              .split(",")
                              .filter(Boolean),
                          );
                          if (e.target.checked) disabled.delete(type);
                          else disabled.add(type);
                          setSettings({
                            ...settings,
                            disabledEditors: [...disabled].join(","),
                          });
                        }}
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)} editor
                    </label>
                  ),
                )}
                <h3>Retention</h3>
                <p className="fm-muted">
                  0 keeps everything. Enabled policies run daily at 03:30 UTC.
                  Intermediate-version cleanup preserves version 1 and the
                  current saved version. Recycle-bin cleanup permanently removes
                  expired deleted files, including their versions.
                </p>
                {[
                  ["recycleRetentionDays", "Recycle bin (days)"],
                  ["versionRetentionDays", "Intermediate versions (days)"],
                  ["auditRetentionDays", "Audit events (days)"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min="0"
                      max="3650"
                      value={settings[key] || 0}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [key]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
                <button className="fm-primary">Save settings</button>
                <button
                  type="button"
                  disabled={
                    ![
                      "recycleRetentionDays",
                      "versionRetentionDays",
                      "auditRetentionDays",
                    ].some((key) => Number(savedSettings.current?.[key]) > 0) ||
                    [
                      "recycleRetentionDays",
                      "versionRetentionDays",
                      "auditRetentionDays",
                    ].some(
                      (key) =>
                        Number(settings[key] || 0) !==
                        Number(savedSettings.current?.[key] || 0),
                    )
                  }
                  onClick={async () => {
                    if (
                      await showConfirm(
                        "Run the saved retention policy now? This permanently removes eligible deleted files, intermediate versions, and audit events. This action cannot be undone without a backup.",
                      )
                    )
                      run(async () => {
                        const result = await fileApi("/admin/retention/run", {
                          method: "POST",
                        });
                        toast.success(
                          "Retention complete: " +
                            result.files +
                            " items, " +
                            result.versions +
                            " versions, " +
                            result.events +
                            " events removed",
                        );
                      });
                  }}
                >
                  Run saved retention policy now
                </button>
              </form>
              <Suspense fallback={<p>Loading quotas…</p>}>
                <QuotaPanel />
              </Suspense>
              <Suspense fallback={<p>Loading operation permissions…</p>}>
                <OperationPanel />
              </Suspense>
            </>
          ) : scope === "activity" ? (
            <Suspense fallback={<p>Loading activity…</p>}>
              <AuditPanel />
            </Suspense>
          ) : (
            <>
              <div className="fm-toolbar">
                <div className="fm-crumbs">
                  <button onClick={() => navigate("files")}>My files</button>
                  {trail.map((t) => (
                    <span key={t.id}>
                      <ChevronRight size={15} />
                      <button onClick={() => navigate("files", t.id)}>
                        {t.name}
                      </button>
                    </span>
                  ))}
                </div>
                <div className="fm-view-controls">
                  <select
                    aria-label="Filter file types"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">All types</option>
                    <option value="folders">Folders</option>
                    <option value="documents">Documents</option>
                    <option value="images">Images</option>
                  </select>
                  <ArrowDownWideNarrow size={16} />
                  <select
                    aria-label="Sort files on this page"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="name">Name</option>
                    <option value="updated">Modified</option>
                    <option value="size">Size</option>
                  </select>
                  <div className="fm-view-toggle">
                    <button
                      className={!grid ? "active" : ""}
                      aria-label="List view"
                      onClick={() => {
                        setGrid(false);
                        localStorage.setItem("eac-files-view", "list");
                      }}
                    >
                      <List size={18} />
                    </button>
                    <button
                      className={grid ? "active" : ""}
                      aria-label="Grid view"
                      onClick={() => {
                        setGrid(true);
                        localStorage.setItem("eac-files-view", "grid");
                      }}
                    >
                      <LayoutGrid size={18} />
                    </button>
                  </div>
                </div>
              </div>
              {chosen.length > 0 && (
                <div className="fm-selection">
                  <button
                    aria-label="Clear selection"
                    onClick={() => setSelected([])}
                  >
                    <X size={16} />
                  </button>
                  <strong>{chosen.length} selected</strong>
                  {scope !== "trash" && (
                    <button
                      className="fm-primary"
                      disabled={
                        chosen.length > 5 || chosen.every((item) => item.folder)
                      }
                      onClick={() =>
                        setDialog({
                          kind: "communication",
                          items: chosen.filter((item) => !item.folder),
                        })
                      }
                    >
                      <MessageCircle size={16} /> Share via Communication
                    </button>
                  )}
                  {scope !== "trash" && (
                    <button
                      onClick={() =>
                        chosen.filter((f) => !f.folder && f.canDownload!==false).forEach(download)
                      }
                    >
                      <Download size={16} />
                      Download
                    </button>
                  )}
                  <button onClick={() => remove(chosen, scope === "trash")}>
                    <Trash2 size={16} />
                    {scope === "trash" ? "Delete permanently" : "Delete"}
                  </button>
                  {scope === "trash" && (
                    <button
                      onClick={() =>
                        run(async () => {
                          for (const f of chosen)
                            await fileApi(`/${f.id}/restore`, {
                              method: "POST",
                            });
                          setSelected([]);
                        })
                      }
                    >
                      <RotateCcw size={16} />
                      Restore
                    </button>
                  )}
                </div>
              )}
              {!visible.length ? (
                <div className="fm-empty">
                  <div>
                    <FolderOpen size={44} />
                  </div>
                  <h2>
                    {query
                      ? "No matching files"
                      : scope === "trash"
                        ? "Your recycle bin is empty"
                        : scope === "shared"
                          ? "Nothing shared with you yet"
                          : "Room for your next idea"}
                  </h2>
                  <p>
                    {query
                      ? "Try a different filename."
                      : ["home", "files"].includes(scope)
                        ? "Upload your first file or create a folder to get organized."
                        : "Files will appear here when you use this part of your workspace."}
                  </p>
                  {["home", "files"].includes(scope) && (
                    <button
                      className="fm-primary"
                      onClick={() => upload.current.click()}
                    >
                      <Upload size={17} />
                      Upload files
                    </button>
                  )}
                </div>
              ) : grid ? (
                <div className="fm-grid">
                  {visible.map((item) => (
                    <article
                      key={item.id}
                      className={`fm-card ${selected.includes(item.id) ? "selected" : ""}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu(item.id);
                      }}
                    >
                      <div className="fm-card-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.name}`}
                          checked={selected.includes(item.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, item.id]
                                : selected.filter((id) => id !== item.id),
                            )
                          }
                        />
                        <span>
                          {item.starred && (
                            <Star size={15} fill="currentColor" />
                          )}
                          {!["OWNER"].includes(item.access) && (
                            <Users size={15} />
                          )}
                        </span>
                        <div className="fm-menu-anchor" data-file-menu>
                          <button
                            aria-label={`Actions for ${item.name}`}
                            onClick={() =>
                              setMenu(menu === item.id ? null : item.id)
                            }
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {menu === item.id && (
                            <div className="fm-menu">{fileActions(item)}</div>
                          )}
                        </div>
                      </div>
                      <button
                        className="fm-card-preview"
                        onClick={() => scope !== "trash" && open(item)}
                      >
                        <FileIcon item={item} size={item.folder ? 64 : 72} />
                        <span>
                          {item.folder
                            ? "FOLDER"
                            : item.name.split(".").pop().toUpperCase()}
                        </span>
                      </button>
                      <button
                        className="fm-card-title"
                        onClick={() => scope !== "trash" && open(item)}
                        title={item.name}
                      >
                        {item.name}
                      </button>
                      <div className="fm-card-meta">
                        <span>
                          {item.folder ? "Folder" : bytes(item.sizeBytes)}
                        </span>
                        <span>
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="fm-table-wrap">
                  <table className="fm-table fm-file-list">
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Select all files on this page"
                            checked={
                              !!visible.length &&
                              visible.every((f) => selected.includes(f.id))
                            }
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? visible.map((f) => f.id)
                                  : [],
                              )
                            }
                          />
                        </th>
                        <th>Name</th>
                        <th>{scope === "trash" ? "Deleted" : "Modified"}</th>
                        <th>Owner</th>
                        <th>Size</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((item) => (
                        <tr
                          key={item.id}
                          className={
                            selected.includes(item.id) ? "selected" : ""
                          }
                        >
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${item.name}`}
                              checked={selected.includes(item.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, item.id]
                                    : selected.filter((id) => id !== item.id),
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="fm-file-name"
                              onClick={() => scope !== "trash" && open(item)}
                            >
                              <FileIcon item={item} />
                              <span>{item.name}</span>
                              {item.starred && (
                                <Star size={14} fill="currentColor" />
                              )}
                            </button>
                            <small className="fm-mobile-file-meta">
                              {item.owner} ·{" "}
                              {item.folder ? "Folder" : bytes(item.sizeBytes)} ·{" "}
                              {date(
                                scope === "trash"
                                  ? item.deletedAt
                                  : item.updatedAt,
                              )}
                            </small>
                          </td>
                          <td>
                            {date(
                              scope === "trash"
                                ? item.deletedAt
                                : item.updatedAt,
                            )}
                          </td>
                          <td>{item.owner}</td>
                          <td>{item.folder ? "—" : bytes(item.sizeBytes)}</td>
                          <td>
                            <div className="fm-menu-anchor" data-file-menu>
                              <button
                                aria-label={`Actions for ${item.name}`}
                                onClick={() =>
                                  setMenu(menu === item.id ? null : item.id)
                                }
                              >
                                <MoreHorizontal size={20} />
                              </button>
                              {menu === item.id && (
                                <div className="fm-menu">
                                  {fileActions(item)}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="fm-pagination">
                <small>
                  {data.totalElements} items · 50 per page · filters and sort
                  apply to this page
                </small>
                <button disabled={!page} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span>
                  {page + 1} / {Math.max(1, data.totalPages)}
                </span>
                <button
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </main>
      {dragging && (
        <div className="fm-dropzone" onDragLeave={() => setDragging(false)}>
          <Upload size={48} />
          <h2>Drop files to upload</h2>
          <p>Files will be added to the current folder.</p>
        </div>
      )}
      {dialog?.kind === "folder" && (
        <NameDialog
          title="Create folder"
          onClose={close}
          submit={async (name) => {
            await fileApi(
              "/folders",
              jsonRequest("POST", { name, parentId: parent }),
            );
            refresh();
          }}
        />
      )}
      {dialog?.kind === "text" && (
        <NameDialog
          title="Create text file"
          initial="Untitled.txt"
          onClose={close}
          submit={createText}
        />
      )}
      {dialog?.kind === "presentation" && (
        <NameDialog
          title="Create presentation"
          initial="Untitled.eacslides"
          onClose={close}
          submit={createText}
        />
      )}
      {dialog?.kind === "office-templates" && <Suspense fallback={<FileModal title="Templates" onClose={close}><p>Loading templates…</p></FileModal>}><OfficeTemplateGallery parentId={parent} onClose={close} onCreated={item=>{setWorkspace(item);refresh();}}/></Suspense>}
      {dialog?.kind === "spreadsheet" && (
        <NameDialog
          title="Create spreadsheet"
          initial="Untitled.xlsx"
          onClose={close}
          submit={createText}
        />
      )}
      {dialog?.kind === "document" && (
        <NameDialog
          title="Create document"
          initial="Untitled.docx"
          onClose={close}
          submit={createText}
        />
      )}
      {dialog?.kind === "rename" && (
        <NameDialog
          title="Rename"
          initial={dialog.item.name}
          onClose={close}
          submit={async (name) => {
            await fileApi(
              `/${dialog.item.id}`,
              jsonRequest("PATCH", { name, revision: dialog.item.revision }),
            );
            refresh();
          }}
        />
      )}
      {dialog?.kind === "share" && (
        <ShareDialog item={dialog.item} onClose={close} refresh={refresh} />
      )}
      {dialog?.kind === "office-download" && <OfficeDownloadDialog item={dialog.item} onClose={close}/>}
      {dialog?.kind === "return-work" && <ReturnWorkDialog item={dialog.item} onClose={close}/>}
      {dialog?.kind === "history" && (
        <HistoryDialog item={dialog.item} onClose={close} refresh={refresh} />
      )}
      {["move", "copy"].includes(dialog?.kind) && (
        <DestinationDialog
          mode={dialog.kind}
          item={dialog.item}
          onClose={close}
          refresh={refresh}
        />
      )}
      {dialog?.kind === "communication" && (
        <Suspense
          fallback={<p role="status">Opening communication sharing…</p>}
        >
          <ShareViaCommunication files={dialog.items} onClose={close} />
        </Suspense>
      )}
      {workspace && (
        <Suspense
          fallback={
            <FileModal title="Opening file…" onClose={() => setWorkspace(null)}>
              <p>Loading workspace…</p>
            </FileModal>
          }
        >
          <FileWorkspace
            key={workspace.id}
            item={workspace}
            onClose={() => {
              setWorkspace(null);
              if (params.has("file")) {
                const next = new URLSearchParams(params);
                next.delete("file");
                setParams(next);
              }
              refresh();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
