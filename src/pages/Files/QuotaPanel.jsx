import { useEffect, useState } from "react";
import { fileApi, jsonRequest, bytes } from "./fileApi";
export default function QuotaPanel() {
  const [rows, setRows] = useState([]),
    [targets, setTargets] = useState([]),
    [type, setType] = useState("USER"),
    [query, setQuery] = useState(""),
    [target, setTarget] = useState(""),
    [limit, setLimit] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => fileApi("/admin/quotas").then(setRows);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fileApi(
          `/admin/quotas/targets?type=${type}&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        )
          .then(setTargets)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, query]);
  return (
    <>
      <h3>Account & folder quotas</h3>
      <p className="fm-muted">
        Limits include historical versions and recycle-bin contents. Account
        overrides replace the default account quota; folder limits cover their
        entire subtree. Lowering a quota preserves stored content and blocks
        further writes until usage is below the limit.
      </p>
      {error && (
        <p className="fm-error" role="alert">
          {error}
        </p>
      )}
      <form
        className="fm-toolbar"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await fileApi(
              "/admin/quotas",
              jsonRequest("PUT", {
                type,
                targetId: Number(target),
                limitBytes: limit,
              }),
            );
            await load();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <select
          aria-label="Quota type"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setTarget("");
          }}
        >
          <option value="USER">Account</option>
          <option value="FOLDER">Folder</option>
        </select>
        <input
          aria-label="Search quota targets"
          placeholder="Search accounts or folders"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Quota target"
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">
            Choose {type === "USER" ? "account" : "folder"}
          </option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label>
          Limit in bytes (0 = unlimited)
          <input
            type="number"
            min="0"
            max="10995116277760"
            required
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <button disabled={busy} className="fm-primary">
          Save quota
        </button>
      </form>
      <div className="fm-table-wrap">
        <table className="fm-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Type</th>
              <th>Used</th>
              <th>Limit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.type}</td>
                <td>{bytes(row.usedBytes)}</td>
                <td>
                  {row.limitBytes === 0 ? "Unlimited" : bytes(row.limitBytes)}
                </td>
                <td>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await fileApi("/admin/quotas/" + row.id, {
                          method: "DELETE",
                        });
                        await load();
                      } catch (e) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Use default limit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
