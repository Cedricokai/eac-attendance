/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Search, MessageCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { getToken } from "../../utils/auth";
import { initials } from "./communicationApi";
export default function EmployeeDirectory({
  onSelect,
  busy = false,
  multiple = false,
  selectedIds = [],
}) {
  const [query, setQuery] = useState(""),
    [people, setPeople] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      apiFetch(
        `/api/employee?view=communication&q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${getToken() || ""}` },
        },
      )
        .then((rows) => {
          if (!controller.signal.aborted) setPeople(rows);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, retry]);
  return (
    <div className="ec-employee-directory">
      <div className="ec-picker-filter">
        <Search size={17} />
        <input
          aria-label="Search employees"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employee name, ID or department…"
        />
      </div>
      {error ? (
        <div className="ec-error" role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((n) => n + 1)}>
            <RefreshCw size={15} /> Retry directory
          </button>
        </div>
      ) : loading ? (
        <p role="status">Loading employees…</p>
      ) : (
        <>
          <p className="ec-directory-count">
            {people.length} employee{people.length === 1 ? "" : "s"} · Select an
            available colleague to{" "}
            {multiple ? "add to the group" : "start a conversation"}.
          </p>
          <div className="ec-picker-list ec-employee-list">
            {people.length === 0 ? (
              <p>No employees match your search.</p>
            ) : (
              people.map((person) => (
                <button
                  key={person.id}
                  disabled={busy || !person.canMessage}
                  className={
                    selectedIds.includes(person.userId) ? "selected" : ""
                  }
                  onClick={() => onSelect(person)}
                >
                  <span className="ec-avatar">{initials(person.name)}</span>
                  <span>
                    <strong>
                      {person.name || person.employeeId}
                      {person.self ? " (You)" : ""}
                    </strong>
                    <small>
                      {person.employeeId}
                      {person.department ? ` · ${person.department}` : ""}
                    </small>
                    <small
                      className={
                        person.canMessage ? "ec-employee-available" : ""
                      }
                    >
                      {person.availability}
                    </small>
                  </span>
                  {multiple && person.canMessage ? (
                    <input
                      aria-label={`Select ${person.name}`}
                      type="checkbox"
                      readOnly
                      checked={selectedIds.includes(person.userId)}
                    />
                  ) : person.canMessage ? (
                    <MessageCircle size={17} />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
