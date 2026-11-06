/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { Search, Folder, ChevronLeft, FileText } from "lucide-react";
import { FileModal } from "../Files/FileDialogs";
import { fileApi, bytes } from "../Files/fileApi";
export default function SystemFilePicker({ onSelect, onClose }) {
  const [query, setQuery] = useState(""),
    [scope, setScope] = useState("files"),
    [parent, setParent] = useState(null),
    [data, setData] = useState(null),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    const timer = setTimeout(
      () =>
        fileApi(
          `?scope=${scope}&page=${page}&size=30&q=${encodeURIComponent(query)}${parent ? `&parentId=${parent}` : ""}`,
          { signal: controller.signal },
        )
          .then(setData)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      200,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, scope, parent, page]);
  return (
    <FileModal title="Select from File Management" onClose={onClose}>
      <p className="ec-muted">
        Existing file access is checked for every recipient. No permissions will
        be granted automatically.
      </p>
      <div className="ec-picker-filter">
        <Search size={16} />
        <input
          autoFocus
          aria-label="Search managed files"
          placeholder="Search files…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <select
          value={scope}
          aria-label="File source"
          onChange={(e) => {
            setScope(e.target.value);
            setParent(null);
            setPage(0);
          }}
        >
          <option value="files">My files</option>
          <option value="shared">Shared with me</option>
        </select>
      </div>
      {parent && (
        <button onClick={() => setParent(null)}>
          <ChevronLeft size={15} /> Back to root
        </button>
      )}
      {error && (
        <p className="ec-error" role="alert">
          {error}
        </p>
      )}
      <div className="ec-picker-list">
        {!data && !error && <p role="status">Loading authorized files…</p>}
        {data?.content.map((file) =>
          file.folder ? (
            <button
              key={file.id}
              onClick={() => {
                setParent(file.id);
                setPage(0);
              }}
            >
              <Folder size={22} color="#ce8b00" fill="#ffc928" />
              <strong>{file.name}</strong>
            </button>
          ) : (
            <label key={file.id}>
              <input
                type="checkbox"
                checked={selected.some((x) => x.id === file.id)}
                onChange={() =>
                  setSelected((old) =>
                    old.some((x) => x.id === file.id)
                      ? old.filter((x) => x.id !== file.id)
                      : old.length < 5
                        ? [...old, file]
                        : old,
                  )
                }
              />
              <FileText size={20} />
              <span>
                <strong>{file.name}</strong>
                <small>{bytes(file.sizeBytes)}</small>
              </span>
            </label>
          ),
        )}
        {data?.content.length === 0 && <p>No accessible files found.</p>}
      </div>
      <footer className="ec-actions">
        <button disabled={!page} onClick={() => setPage((n) => n - 1)}>
          Previous
        </button>
        <button
          disabled={!data || page + 1 >= data.totalPages}
          onClick={() => setPage((n) => n + 1)}
        >
          Next
        </button>
        <button
          className="ec-primary"
          disabled={!selected.length}
          onClick={() => onSelect(selected)}
        >
          Attach {selected.length || ""} file{selected.length === 1 ? "" : "s"}
        </button>
      </footer>
    </FileModal>
  );
}
