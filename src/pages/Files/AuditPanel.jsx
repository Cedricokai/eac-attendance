import { useEffect, useState } from "react";
import { fileApi, downloadBlob, date } from "./fileApi";
import { getToken } from "../../utils/auth";
import { getApiBaseUrl } from "../../utils/api";
export default function AuditPanel() {
  const [query, setQuery] = useState(""),
    [action, setAction] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  const params = new URLSearchParams({
    q: query,
    action,
    status,
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    page,
  });
  const path = params.toString();
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fileApi("/admin/audit?" + path, { signal: controller.signal })
          .then(setData)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      300,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path]);
  const exportCsv = async () => {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/files/admin/audit/export?${path}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) throw new Error("Audit export failed");
      downloadBlob(await response.blob(), "eac-file-audit.csv");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="fm-toolbar">
        <input
          aria-label="Search file activity"
          placeholder="File or user"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <input
          aria-label="Filter action"
          placeholder="Action, e.g. UPLOAD"
          value={action}
          onChange={(e) => {
            setAction(e.target.value.toUpperCase());
            setPage(0);
          }}
        />
        <label>
          From
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          To
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filter activity result"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All results</option>
          {["SUCCESS", "DENIED", "REJECTED", "FAILED", "CONFLICT"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <button onClick={exportCsv}>Export CSV</button>
      </div>
      <p className="fm-muted">
        Exports include up to 10,000 matching events. Your account permissions
        apply to search and export.
      </p>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      <div className="fm-table-wrap">
        <table className="fm-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Action</th>
              <th>Person</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.content.map((event) => (
              <tr key={event.id}>
                <td>{event.filename}</td>
                <td>{event.action.replaceAll("_", " ")}</td>
                <td>{event.username}</td>
                <td>{date(event.createdAt)}</td>
                <td>{event.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && !data.content.length && (
        <p className="fm-empty">No matching events.</p>
      )}
      <div className="fm-pagination">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} / {Math.max(1, data?.totalPages || 0)}
        </span>
        <button
          disabled={page + 1 >= (data?.totalPages || 0)}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </>
  );
}
