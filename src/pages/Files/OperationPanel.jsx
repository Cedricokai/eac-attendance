import { useEffect, useState } from "react";
import { fileApi, jsonRequest } from "./fileApi";
import { showConfirm } from "../../services/dialogService";
const labels = {
  FILE_VIEW: "View the file workspace",
  FILE_UPLOAD: "Upload files",
  FILE_CREATE: "Create folders and copies",
  FILE_EDIT: "Edit file content",
  FILE_DELETE: "Delete files",
  FILE_DOWNLOAD: "Download files",
  FILE_SHARE: "Share files and create requests",
  FILE_MANAGE_ACCESS: "Manage existing access",
  FILE_RESTORE: "Restore files and versions",
  FILE_VIEW_AUDIT: "View file activity",
  FILE_MANAGE_SETTINGS: "Manage file settings",
  FILE_MANAGE_BACKUPS: "Manage file backups",
  FILE_ADMIN: "File administration",
};
export default function OperationPanel() {
  const [policies, setPolicies] = useState([]),
    [roles, setRoles] = useState([]),
    [selected, setSelected] = useState(""),
    [policy, setPolicy] = useState(null),
    [query, setQuery] = useState(""),
    [people, setPeople] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = async () => {
    const [items, options] = await Promise.all([
      fileApi("/admin/operations"),
      fileApi("/admin/operations/roles"),
    ]);
    setPolicies(items);
    setRoles(options);
    setSelected((current) => current || items[0]?.code || "");
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const current = policies.find((p) => p.code === selected);
    setPolicy(current ? structuredClone(current) : null);
    setMessage("");
  }, [selected, policies]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        fileApi(
          "/admin/quotas/targets?type=USER&q=" + encodeURIComponent(query),
          { signal: controller.signal },
        )
          .then(setPeople)
          .catch((e) => {
            if (e.name !== "AbortError") setError(e.message);
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const toggleRole = (role, enabled) =>
    setPolicy((current) => ({
      ...current,
      roles: enabled
        ? [...current.roles.filter((r) => r.id !== role.id), role]
        : current.roles.filter((r) => r.id !== role.id),
    }));
  return (
    <section className="fm-operation-panel">
      <h3>Operation permissions</h3>
      <p className="fm-muted">
        These controls use existing EAC roles and accounts. Page permissions and
        each file’s sharing permissions also apply. Administrators retain
        access; settings, backups, and organization administration require the
        existing administrator role.
      </p>
      {error && (
        <div className="fm-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="fm-notice" role="status">
          {message}
        </div>
      )}
      <label>
        Action
        <select
          aria-label="File operation"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {policies.map((p) => (
            <option key={p.id} value={p.code}>
              {labels[p.code] || p.code}
            </option>
          ))}
        </select>
      </label>
      {policy && (
        <form
          className="fm-settings"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              !(await showConfirm(
                "Apply the " +
                  (labels[policy.code] || policy.code) +
                  " policy? Enabled restrictions allow only the selected roles and accounts. Existing file and page permissions still apply.",
              ))
            )
              return;
            setBusy(true);
            setError("");
            try {
              const saved = await fileApi(
                "/admin/operations/" + policy.id,
                jsonRequest("PUT", {
                  enabled: policy.enabled,
                  roleIds: policy.roles.map((r) => r.id),
                  userIds: policy.users.map((u) => u.id),
                  revision: policy.revision,
                }),
              );
              await load();
              setPolicy(saved);
              setMessage(
                "Operation policy saved. Changes apply to new file operations immediately.",
              );
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            <strong>{policy.code}</strong>
          </p>
          <label className="fm-check">
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) =>
                setPolicy({ ...policy, enabled: e.target.checked })
              }
            />
            Restrict this action to selected roles and people
          </label>
          <p className="fm-muted">
            With restrictions off, standard page and file permissions apply.
            With only the administrator role selected, this action becomes
            administrator-only.
          </p>
          <div className="fm-policy-roles">
            {roles.map((role) => (
              <label className="fm-check" key={role.id}>
                <input
                  type="checkbox"
                  checked={
                    role.name === "ROLE_ADMIN" ||
                    policy.roles.some((r) => r.id === role.id)
                  }
                  disabled={role.name === "ROLE_ADMIN"}
                  onChange={(e) => toggleRole(role, e.target.checked)}
                />
                {role.name.replace(/^ROLE_/, "").replaceAll("_", " ")}
              </label>
            ))}
          </div>
          <label>
            Find an account
            <input
              aria-label="Find operation account"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or username"
            />
          </label>
          <div className="fm-policy-roles">
            {people.map((person) => (
              <label className="fm-check" key={person.id}>
                <input
                  type="checkbox"
                  checked={policy.users.some((u) => u.id === person.id)}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      users: e.target.checked
                        ? [
                            ...policy.users.filter((u) => u.id !== person.id),
                            person,
                          ]
                        : policy.users.filter((u) => u.id !== person.id),
                    })
                  }
                />
                {person.name}
              </label>
            ))}
          </div>
          {policy.users.length > 0 && (
            <div>
              <p>Assigned people</p>
              {policy.users.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  onClick={() =>
                    setPolicy({
                      ...policy,
                      users: policy.users.filter((u) => u.id !== person.id),
                    })
                  }
                >
                  {person.name} · Remove
                </button>
              ))}
            </div>
          )}
          <button className="fm-primary" disabled={busy}>
            {busy ? "Saving…" : "Save operation policy"}
          </button>
        </form>
      )}
    </section>
  );
}
