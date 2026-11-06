import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, Mail, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "../../utils/api";
import FileWorkspace from "./FileWorkspace";
import { GuestUploadRequest } from "./FileRequestsPanel";
import "./files.css";

export default function FileGuestPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [session, setSession] = useState(
    () => sessionStorage.getItem("eacGuest:" + token) || "",
  );
  const [info, setInfo] = useState(null);
  const [item, setItem] = useState(null);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const request = useCallback(
    async (path, options = {}, binary = false) => {
      const response = await fetch(
        `${getApiBaseUrl()}/api/file-guests${path}`,
        {
          ...options,
          headers: {
            "X-EAC-Guest-Invite": token,
            ...(session ? { "X-EAC-Guest-Session": session } : {}),
            ...(options.body instanceof FormData
              ? {}
              : { "Content-Type": "application/json" }),
            ...options.headers,
          },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.message ||
            "This invitation or verification session is unavailable.",
        );
      }
      if (binary) return response.blob();
      const body = await response.text();
      return body ? JSON.parse(body) : null;
    },
    [token, session],
  );
  const transport = useMemo(
    () => ({
      upload: (form) => request("/upload", { method: "POST", body: form }),
      download: () => request("/content", {}, true),
      state: () => request("/state"),
      save: (form) => request("/save", { method: "POST", body: form }),
    }),
    [request],
  );
  useEffect(() => {
    request("/info")
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [request]);
  useEffect(() => {
    if (!session) return;
    transport
      .state()
      .then(setItem)
      .catch((e) => {
        setError(e.message);
        setSession("");
        sessionStorage.removeItem("eacGuest:" + token);
      });
  }, [session, transport, token]);
  useEffect(() => {
    if (!item || !session) return;
    const timer = setInterval(
      () =>
        transport.state().catch((e) => {
          setError(e.message);
          setItem(null);
          setSession("");
          sessionStorage.removeItem("eacGuest:" + token);
        }),
      15000,
    );
    return () => clearInterval(timer);
  }, [item, session, transport, token]);
  if (item?.uploadOnly && !closed)
    return <GuestUploadRequest data={item} transport={transport} />;
  if (item && !closed)
    return (
      <div className="fm-app">
        <FileWorkspace
          key={item.id}
          item={item}
          guest={transport}
          onClose={() => setClosed(true)}
        />
      </div>
    );
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
        <h1 style={{ marginTop: 30, fontSize: 24 }}>
          {closed ? "Shared file closed" : "A file has been shared with you"}
        </h1>
        {closed ? (
          <p className="fm-muted" style={{ marginTop: 15 }}>
            You may close this tab or{" "}
            <button onClick={() => setClosed(false)}>Reopen the file</button>.
          </p>
        ) : (
          <>
            <p className="fm-muted" style={{ margin: "15px 0" }}>
              <ShieldCheck size={17} /> Verify your invited email to open this
              file. Guest access is restricted to this file.
            </p>
            {info && (
              <div className="fm-notice">
                <div>
                  <strong>{info.name}</strong>
                  <p>
                    {info.recipient} · {info.access} · Expires{" "}
                    {new Date(info.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {error && (
              <p className="fm-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="fm-primary"
              disabled={busy || !info}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await request("/code", { method: "POST" });
                  setSent(true);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <Loader2 className="fm-spin" size={16} />
              ) : (
                <Mail size={16} />
              )}
              {sent ? "Request another code" : "Email verification code"}
            </button>
            {sent && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const result = await request("/verify", {
                      method: "POST",
                      body: JSON.stringify({ code }),
                    });
                    setSession(result.session);
                    sessionStorage.setItem("eacGuest:" + token, result.session);
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Six-digit verification code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <button
                  className="fm-primary"
                  disabled={busy || code.length !== 6}
                >
                  Verify and open
                </button>
                <p className="fm-muted" style={{ marginTop: 12 }}>
                  The code expires in 10 minutes. If it does not arrive, contact
                  the sender.
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
