import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownTrayIcon, ArrowLeftIcon, DocumentArrowUpIcon, MagnifyingGlassIcon, TrashIcon } from "@heroicons/react/24/outline";
import { SidebarWithBurgerMenu } from "./SidebarWithBurgerMenu";

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:8080";
  if (hostname.startsWith("192.168.")) return import.meta.env.VITE_API_BASE_URL_LOCAL;
  return import.meta.env.VITE_API_BASE_URL_PUBLIC || "http://localhost:8080";
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("jwtToken") || localStorage.getItem("authToken")}`,
});

const readError = async (response, fallback) => {
  try {
    const data = await response.json();
    return data.message || data.error || fallback;
  } catch {
    return fallback;
  }
};

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export default function WaybillDocuments() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Waybill");
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/inventory/documents`, { headers: authHeaders() });
      if (!response.ok) throw new Error(await readError(response, "Documents could not be loaded."));
      setDocuments(await response.json());
    } catch {
      setMessage("Documents could not be loaded from the server.");
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((item) => [item.name, item.location, item.type, item.fileName]
      .some((value) => String(value).toLowerCase().includes(query)));
  }, [documents, search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!name.trim() || !location.trim() || !file) {
      setMessage("Enter a document name and location, then choose a file.");
      return;
    }

    setSaving(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File must not exceed 10 MB.");
      const body = new FormData();
      body.append("name", name.trim());
      body.append("location", location.trim());
      body.append("type", type);
      body.append("file", file);
      const response = await fetch(`${getApiBaseUrl()}/api/inventory/documents`, {
        method: "POST", headers: authHeaders(), body,
      });
      if (!response.ok) throw new Error(await readError(response, "Upload failed."));
      setName("");
      setLocation("");
      setType("Waybill");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage("Document uploaded successfully.");
      await loadDocuments();
    } catch (error) {
      setMessage(error.message || "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = async (document) => {
    setMessage("");
    const response = await fetch(`${getApiBaseUrl()}/api/inventory/documents/${document.id}/download`, { headers: authHeaders() });
    if (!response.ok) { setMessage(await readError(response, "Download failed.")); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = window.document.createElement("a");
    link.href = url; link.download = document.fileName; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const deleteDocument = async (document) => {
    if (!window.confirm(`Delete “${document.name}”?`)) return;
    const response = await fetch(`${getApiBaseUrl()}/api/inventory/documents/${document.id}`, { method: "DELETE", headers: authHeaders() });
    if (response.ok) { setMessage("Document deleted."); await loadDocuments(); }
    else setMessage(await readError(response, "Delete failed."));
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${sidebarOpen ? "opacity-70" : ""}`}>
      <div className="fixed left-4 top-4 z-50"><SidebarWithBurgerMenu onToggle={setSidebarOpen} /></div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => navigate("/InventoryDashboard")} className="mb-6 ml-12 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700">
          <ArrowLeftIcon className="h-4 w-4" /> Inventory dashboard
        </button>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-7 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/15 p-4"><DocumentArrowUpIcon className="h-9 w-9" /></div>
            <div><h1 className="text-3xl font-bold">Waybills & Documents</h1><p className="mt-1 text-blue-100">Upload and organize inventory paperwork by name and location.</p></div>
          </div>
        </div>

        <div className="grid gap-7 lg:grid-cols-[380px_1fr]">
          <form onSubmit={handleSubmit} className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Upload document</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">All fields are required.</p>
            <label className="mb-4 block text-sm font-semibold">Document name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Waybill WB-2026-014" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="mb-4 block text-sm font-semibold">Location
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Warehouse, Shelf A3" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="mb-4 block text-sm font-semibold">Document type
              <select value={type} onChange={(e) => setType(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal outline-none focus:border-blue-500">
                <option>Waybill</option><option>Delivery Note</option><option>Invoice</option><option>Receipt</option><option>Other</option>
              </select>
            </label>
            <label className="mb-5 block text-sm font-semibold">File
              <input ref={fileInput} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
            </label>
            {message && <p className={`mb-4 rounded-lg p-3 text-sm ${message.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{message}</p>}
            <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-60">
              <DocumentArrowUpIcon className="h-5 w-5" /> {saving ? "Uploading..." : "Upload document"}
            </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="text-xl font-bold">Stored documents</h2><p className="text-sm text-slate-500">{documents.length} document{documents.length === 1 ? "" : "s"}</p></div>
              <div className="relative"><MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-blue-500" /></div>
            </div>
            {filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center"><DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-semibold text-slate-600">No documents found</p><p className="text-sm text-slate-400">Upload your first inventory document.</p></div>
            ) : (
              <div className="space-y-3">{filteredDocuments.map((document) => (
                <article key={document.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 hover:border-blue-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{document.type}</span><span className="text-xs text-slate-400">{new Date(document.uploadedAt).toLocaleDateString()}</span></div><h3 className="mt-2 truncate font-bold">{document.name}</h3><p className="truncate text-sm text-slate-500">{document.location} · {document.fileName} · {formatBytes(document.size)}</p></div>
                  <div className="flex shrink-0 gap-2"><button onClick={() => downloadDocument(document)} title="Download" className="rounded-lg bg-slate-100 p-2.5 text-slate-700 hover:bg-blue-100 hover:text-blue-700"><ArrowDownTrayIcon className="h-5 w-5" /></button><button onClick={() => deleteDocument(document)} title="Delete" className="rounded-lg bg-slate-100 p-2.5 text-slate-700 hover:bg-red-100 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button></div>
                </article>
              ))}</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
