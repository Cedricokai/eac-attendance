import { useEffect, useState } from "react";
import { fileApi, jsonRequest, bytes, date, downloadBlob } from "./fileApi";
import { getApiBaseUrl } from "../../utils/api";
import { getToken } from "../../utils/auth";
import { showConfirm } from "../../services/dialogService";
export default function BackupPanel() {
  const [backups, setBackups] = useState([]),
    [policy, setPolicy] = useState(null),
    [destination, setDestination] = useState("FILESYSTEM"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const load = async () => {
    const [list, config] = await Promise.all([
      fileApi("/backups"),
      fileApi("/backups/policy"),
    ]);
    setBackups(list);
    setPolicy(config);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fm-backup-panel">
      <h2>Backups & recovery</h2>
      <p className="fm-muted">
        Snapshots include the file tree, originals, and every saved version,
        including recycled files. They do not include the attendance database,
        account configuration, or unsaved browser edits. Keep an independent
        copy outside this server.
      </p>
      {error && (
        <div role="alert" className="fm-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="fm-notice">
          {message}
        </div>
      )}
      <div className="fm-toolbar">
        <select
          aria-label="Backup destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          <option value="FILESYSTEM">Server / NAS filesystem</option>
          <option value="DATABASE">Database chunks (up to 256 MB)</option>
        </select>
        <button
          className="fm-primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await fileApi("/backups", jsonRequest("POST", { destination }));
              setMessage("Backup completed and checksums verified.");
            })
          }
        >
          {busy ? "Working…" : "Create backup now"}
        </button>
        <button disabled={busy} onClick={() => run(load)}>
          Refresh
        </button>
      </div>
      {policy && (
        <form
          className="fm-settings"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              setPolicy(
                await fileApi("/backups/policy", jsonRequest("PUT", policy)),
              );
              setMessage("Backup schedule saved.");
            });
          }}
        >
          <h3>Automatic backups</h3>
          <label>
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) =>
                setPolicy({ ...policy, enabled: e.target.checked })
              }
            />{" "}
            Enable scheduled backups
          </label>
          <label>
            Frequency
            <select
              value={policy.frequency}
              onChange={(e) =>
                setPolicy({ ...policy, frequency: e.target.value })
              }
            >
              <option>DAILY</option>
              <option>WEEKLY</option>
              <option>MONTHLY</option>
            </select>
          </label>
          <label>
            Storage
            <select
              value={policy.destination}
              onChange={(e) =>
                setPolicy({ ...policy, destination: e.target.value })
              }
            >
              <option value="FILESYSTEM">Server / NAS filesystem</option>
              <option value="DATABASE">Database chunks</option>
            </select>
          </label>
          <label>
            Scheduled snapshots to retain
            <input
              type="number"
              min="1"
              max="365"
              value={policy.retainCount}
              onChange={(e) =>
                setPolicy({ ...policy, retainCount: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Maximum uncompressed bytes
            <input
              type="number"
              min="1048576"
              max="10737418240"
              value={policy.maxBackupBytes}
              onChange={(e) =>
                setPolicy({ ...policy, maxBackupBytes: Number(e.target.value) })
              }
            />
          </label>
          <p>
            Next run: {date(policy.nextRun)} · Last result:{" "}
            {policy.lastStatus || "No scheduled run yet"}. Monthly runs every 30
            days. Manual backups are retained.
          </p>
          <button disabled={busy} className="fm-primary">
            Save schedule
          </button>
        </form>
      )}
      <div className="fm-table-wrap">
        <table className="fm-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Storage</th>
              <th>Contents</th>
              <th>Size</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id}>
                <td>
                  {date(b.createdAt)}
                  <small>{b.createdBy}</small>
                </td>
                <td>{b.destination}</td>
                <td>
                  {b.itemCount} items · {b.versionCount} versions
                </td>
                <td>{bytes(b.sizeBytes)}</td>
                <td>{date(b.verifiedAt)}</td>
                <td>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await fileApi(`/backups/${b.id}/verify`, {
                          method: "POST",
                        });
                        setMessage(
                          "Archive and all content checksums verified.",
                        );
                      })
                    }
                  >
                    Verify
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const response = await fetch(
                          `${getApiBaseUrl()}/api/files/backups/${b.id}/download`,
                          {
                            headers: { Authorization: `Bearer ${getToken()}` },
                          },
                        );
                        if (!response.ok)
                          throw new Error("Backup download failed");
                        downloadBlob(
                          await response.blob(),
                          `eac-files-${b.id}.zip`,
                        );
                      })
                    }
                  >
                    Download
                  </button>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await showConfirm(
                          "Restore this snapshot into a new private folder owned by you? Existing files and permissions remain intact. Storage quotas apply.",
                        )
                      )
                        run(async () => {
                          const folder = await fileApi(
                            `/backups/${b.id}/restore`,
                            { method: "POST" },
                          );
                          setMessage(
                            `Recovered into “${folder.name}” in My files. Sharing is disabled on recovered copies.`,
                          );
                        });
                    }}
                  >
                    Recover copies
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!backups.length && (
          <p className="fm-empty">
            No backups yet. Create your first snapshot above.
          </p>
        )}
      </div>
    </div>
  );
}
