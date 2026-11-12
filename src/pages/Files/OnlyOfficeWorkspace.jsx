import { useCallback, useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ArrowLeft, Download, History, RefreshCw, Share2, MessageSquare, ShieldCheck, LockKeyhole, Save } from "lucide-react";
import { fileApi, fileBlob, downloadBlob } from "./fileApi";
import { HistoryDialog, ShareDialog, CommentsDialog } from "./FileDialogs";
import "./onlyoffice.css";
import SheetAccessDialog from "./SheetAccessDialog";
import useOfficeSheets from "./useOfficeSheets";
import { CellLockDialog, OfficeDownloadDialog, OfficePasswordDialog } from "./OfficeProtectionDialogs";
import { ReturnWorkDialog } from "./FileWorkReview";

const scripts = new Map();
function loadEditor(url) {
  if (scripts.has(url)) return scripts.get(url);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url; script.async = true; script.referrerPolicy = "no-referrer";
    const timeout = setTimeout(() => { script.remove(); scripts.delete(url); reject(new Error("ONLYOFFICE Document Server is not reachable. Start the local Office container and retry.")); }, 20000);
    script.onload = () => { clearTimeout(timeout); if (window.DocsAPI?.DocEditor) resolve(); else { scripts.delete(url); reject(new Error("The document server did not provide its editor API.")); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); scripts.delete(url); const local = ["localhost", "127.0.0.1"].includes(new URL(url).hostname); reject(new Error(local ? "ONLYOFFICE is unreachable on port 8082. Run Start-EAC-With-Office.cmd in the backend folder and wait for its health check, then retry. Docker Desktop must stay running for document editing." : "Cannot reach the ONLYOFFICE editor. Check the configured HTTPS Document Server address, certificate and reverse proxy, then retry.")); };
    document.head.appendChild(script);
  });
  scripts.set(url, promise); return promise;
}

export default function OnlyOfficeWorkspace({ item, onClose }) {
  const id = `office-${useId().replaceAll(":", "")}`;
  const editor = useRef(null), pendingSave = useRef(null), lockSaveSeen = useRef(null);
  const [lockCheckpointPending, setLockCheckpointPending] = useState(false);
  const [error, setError] = useState(""), [status, setStatus] = useState("Opening native Office editor…");
  const [dialog, setDialog] = useState(null), [attempt, setAttempt] = useState(0), [session, setSession] = useState(null);
  const [current, setCurrent] = useState(item), [saving, setSaving] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false), [documentReady, setDocumentReady] = useState(false);
  const [saveError, setSaveError] = useState(""), [returnAwait, setReturnAwait] = useState(null);
  const sheets = useOfficeSheets(item.id, session);
  useEffect(() => {
    if (returnAwait !== null && current.currentVersion > returnAwait) { setReturnAwait(null); setDialog("return-work"); }
  }, [returnAwait, current.currentVersion]);
  useEffect(() => {
    if (!session) return;
    const lockKey = `${session.sessionId}:${sheets.cellLockRevision}`, newLock = sheets.cellLockRevision > 0 && lockSaveSeen.current !== lockKey;
    if (!newLock && (sheets.appliedVersion === null || !sheets.policy?.pending)) return;
    if (newLock) { lockSaveSeen.current = lockKey; setLockCheckpointPending(true); }
    const baselineVersion = current.currentVersion, controller = new AbortController(); let tries = 0, timer;
    const save = async () => {
      try {
        const result = await fileApi(`/onlyoffice/sessions/${session.sessionId}/save`, { method: "POST", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (newLock && result.version > baselineVersion) { setLockCheckpointPending(false); setCurrent(old => ({ ...old, currentVersion: result.version })); setStatus(`Saved · version ${result.version} recorded in file history`); return; }
        if (result.requested) { pendingSave.current = result.version; setStatus("Protection save requested · waiting for verification"); return; }
        if (++tries < 10) timer = setTimeout(save, 2000);
        else setSaveError("Protection changes are still synchronizing. Use the native editor Save button, then Save workbook. No cell content needs to be changed.");
      } catch (e) { if (!controller.signal.aborted) setSaveError(e.message); }
    };
    timer = setTimeout(save, 1500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [session, sheets.appliedVersion, sheets.policy?.pending, sheets.cellLockRevision, current.currentVersion]);
  const refresh = useCallback(() => fileApi(`/${item.id}`).then(setCurrent).catch(e => setError(e.message)), [item.id]);
  useEffect(() => {
    const controller = new AbortController(); let active = true, heartbeat;
    setError(""); setStatus("Opening native Office editor…"); setSession(null); setDocumentReady(false); setReturnAwait(null);
    (async () => {
      const state = await fileApi("/onlyoffice/status", { signal: controller.signal });
      if (!state.enabled) throw new Error("Native Office editing is disabled in lightweight local mode. Download the original to use Microsoft Office, or connect the NAS document server to enable browser editing. Your stored original is preserved.");
      const response = await fileApi(`/${item.id}/onlyoffice/config`, { method: "POST", signal: controller.signal });
      if (!active) return; setSession(response);
      await loadEditor(response.scriptUrl); if (!active) return;
      const config = { ...response.config, events: {
        onAppReady: () => active && setStatus("Editor connected · opening document; enter its password if requested"),
        onDocumentReady: () => { if (active) { setDocumentReady(true); setStatus("Connected · changes are versioned by the server"); } },
        onDocumentStateChange: event => active && setStatus(event.data ? "Editing · synchronizing changes…" : "Synced with editor · save checkpoints update file history"),
        onError: event => active && setError(event.data?.errorDescription || "The Office editor reported an error. Keep this window open and retry the connection."),
        onRequestUsers: async event => {
          if (!response.canManageProtection || event.data?.c !== "protect") return;
          try { const users = await fileApi(`/${item.id}/onlyoffice/users`, { signal: controller.signal }); if (active) editor.current?.setUsers({ c: "protect", users }); } catch (e) { if (active) setError(e.message); }
        },
      } };
      editor.current = new window.DocsAPI.DocEditor(id, config);
      heartbeat = setInterval(async () => {
        try {
          const result = await fileApi(`/onlyoffice/sessions/${response.sessionId}/heartbeat`, { method: "POST", signal: controller.signal });
          if (active) setNeedsPassword(!!result.needsPassword);
          const latest = await fileApi(`/${item.id}`, { signal: controller.signal });
          if (latest.canDownload !== undefined && latest.canDownload !== response.config.document.permissions.download) throw new Error("Download permissions changed. Close and reopen this document to apply the current sharing restrictions.");
          if (active) {
            setCurrent(old => ({ ...old, ...latest, currentVersion: result.version }));
            if (pendingSave.current !== null && result.version > pendingSave.current) { pendingSave.current = null; setLockCheckpointPending(false); setStatus(`Saved · version ${result.version} recorded in file history`); }
          }
        } catch (e) { if (active && !controller.signal.aborted) { setError(`Editing connection stopped: ${e.message}`); editor.current?.destroyEditor(); editor.current = null; clearInterval(heartbeat); } }
      }, 25000);
    })().catch(e => { if (active && !controller.signal.aborted) { setError(e.message); setStatus("Native editor unavailable"); } });
    return () => { active = false; pendingSave.current = null; controller.abort(); clearInterval(heartbeat); editor.current?.destroyEditor(); editor.current = null; };
  }, [item.id, id, attempt]);
  const download = async () => { if (session?.config.documentType === "cell") { setDialog("download"); return; } try { downloadBlob(await fileBlob(current), current.name); } catch (e) { setError(e.message); } };
  const sendBack = async () => {
    setSaving(true); setSaveError("");
    try {
      const result = await fileApi(`/onlyoffice/sessions/${session.sessionId}/save`, { method: "POST" });
      if (result.requested) { pendingSave.current = result.version; setReturnAwait(result.version); setStatus("Saving your work · the return form opens after the saved checkpoint is confirmed"); }
      else if (pendingSave.current !== null) setSaveError("A save is still pending. Wait for a verified checkpoint before sending your work back.");
      else { const latest = await fileApi(`/${item.id}`); setCurrent(latest); setDialog("return-work"); }
    } catch (e) { setSaveError(e.message); } finally { setSaving(false); }
  };
  return <section className={`fm-editor fm-onlyoffice fm-office-${session?.config.documentType || (current.name?.toLowerCase().endsWith(".xlsx") ? "cell" : "word")}`} aria-label="Native Office workspace">
    <header className="fm-editor-bar"><button onClick={onClose}><ArrowLeft size={17}/>Files</button><div><h2>{current.name}</h2><small>ONLYOFFICE Docs · version {current.currentVersion}</small></div><small role="status">{status}</small><button onClick={() => { refresh(); setDialog("history"); }}><History size={16}/>History</button>{["OWNER", "MANAGER"].includes(current.access) && <button onClick={() => setDialog("share")}><Share2 size={16}/>Share</button>}<button disabled={lockCheckpointPending || sheets.policy?.pending || session?.config.document.permissions.download === false} title={session?.config.document.permissions.download === false ? "The owner has disabled downloads, or access to every sheet is required" : undefined} onClick={download}><Download size={16}/>Download original / saved file</button></header>
    {error && <div className="fm-error" role="alert"><span>{error}</span><button onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16}/>Retry editor</button></div>}
    {sheets.enabled && <div className="fm-notice">{sheets.policy?.adminOverride ? "ADMIN access · full control of all sheets." : session.canManageProtection ? "Choose Sheet access to assign employees to individual worksheets." : "Open any sheet below. Restricted sheets require the owner's permission."} Full workbook downloads require access to every sheet.</div>}
    <div className="fm-onlyoffice-actions">{session?.canManageProtection && <button onClick={() => setDialog("password")}><LockKeyhole size={16}/>Verify file password</button>}<button aria-expanded={dialog === "comments"} onClick={() => setDialog(dialog === "comments" ? null : "comments")}><MessageSquare size={16}/>Comments box</button>{session && current.canEdit && <button disabled={saving} onClick={async () => { setSaving(true); setSaveError(""); try { const request = await fileApi(`/onlyoffice/sessions/${session.sessionId}/save`, { method: "POST" }); if (request.requested) { pendingSave.current = request.version; setStatus("Save requested · waiting for a verified checkpoint"); } else setStatus(sheets.policy?.pending ? "Sheet access is still synchronizing; no cell edit is required. Retry save shortly." : "No new synchronized changes · the uploaded file is already stored and can be shared."); } catch (e) { setSaveError(e.message); } finally { setSaving(false); } }}><Save size={16}/>{saving ? "Requesting save…" : session.config.documentType === "cell" ? "Save workbook" : "Save document"}</button>}{sheets.policy?.canManage && sheets.connected && <><button onClick={() => sheets.startCellLock(true)}><LockKeyhole size={16}/>Lock selected cells</button><button onClick={() => sheets.startCellLock(false)}>Unlock selected cells</button></>}{sheets.policy?.canManage && <button onClick={() => setDialog("sheets")}><ShieldCheck size={16}/>Sheet access</button>}{sheets.enabled && <span>{sheets.policy?.sheets.length || "…"} sheets · {sheets.connected ? "Access controls connected" : "Connecting access controls…"}</span>}</div>
    {needsPassword && <div className="fm-notice">An encrypted save needs verification. Your stored versions are preserved. <button onClick={() => setDialog("password")}>Verify file opening password</button></div>}
    {current.canEdit && current.access !== "OWNER" && <div className="fm-onlyoffice-actions"><button disabled={!documentReady || saving || needsPassword || returnAwait !== null || lockCheckpointPending || !!sheets.policy?.pending} onClick={sendBack}>Send back to owner</button>{returnAwait !== null && <button onClick={() => setReturnAwait(null)}>Cancel waiting to send</button>}<small>Sends the saved version and your work notes for owner review.</small></div>}
    {saveError && <p className="fm-error" role="alert">{saveError}</p>}
    {sheets.error && <p className="fm-error" role="alert">{sheets.error}</p>}
    {sheets.notice && <p className="fm-sheet-pending" role="status">{sheets.notice}</p>}
    {sheets.policy && <nav className="fm-sheet-tabs" aria-label="Workbook sheets">{sheets.policy.sheets.map(sheet => <button key={sheet.name} className={sheets.active?.name === sheet.name ? "is-active" : ""} onClick={() => sheets.select(sheet.name)}>{sheet.restricted && <LockKeyhole size={13}/>} {sheet.name}</button>)}</nav>}
    <div className="fm-office-editor-area">
    <div className="fm-onlyoffice-host"><div id={id}/>{sheets.enabled && documentReady && (!sheets.connected || sheets.active?.denied) && <div className="fm-sheet-denial" role="status"><LockKeyhole size={34}/><h3>{sheets.active?.denied ? "You’re not allowed to view this sheet" : "Connecting sheet access…"}</h3><p>{sheets.active?.denied ? "Contact the workbook owner for access, or choose another sheet above." : "The workbook will open when its access controls connect."}</p></div>}</div>
    {dialog === "comments" && <CommentsDialog inline item={current} onClose={() => setDialog(null)}/>}
    </div>
    <footer className="fm-editor-status"><span>Original and saved revisions stay in your existing file storage.</span><span>Save in the native editor; closing can take a few seconds to commit its final version.</span></footer>
    {sheets.cellLockRequest && <CellLockDialog request={sheets.cellLockRequest} onClose={sheets.closeCellLock} onApply={async request => { const saved = await sheets.applyCellLock(request); editor.current?.destroyEditor(); editor.current = null; setCurrent(saved); setAttempt(value => value + 1); }}/>}
    {dialog === "password" && <OfficePasswordDialog item={current} onClose={() => setDialog(null)} onVerified={async password => { await fileApi(`/${item.id}/onlyoffice/password`, { method: "POST", body: JSON.stringify({ password }) }); setDialog(null); setNeedsPassword(false); setSaveError(""); setStatus("File password verified. Save the workbook again to record the encrypted changes."); }}/>}
    {dialog === "download" && <OfficeDownloadDialog item={current} onClose={() => setDialog(null)}/>}
    {dialog === "return-work" && <ReturnWorkDialog item={current} onClose={() => setDialog(null)}/>}
    {dialog === "history" && <HistoryDialog item={{ ...current, canDownload: session?.config.document.permissions.download }} onClose={() => setDialog(null)} refresh={refresh}/>}
    {dialog === "share" && <ShareDialog item={current} onClose={() => setDialog(null)} refresh={refresh}/>}
    {dialog === "sheets" && sheets.policy && <SheetAccessDialog item={current} policy={sheets.policy} onClose={() => setDialog(null)} onSaved={sheets.saved} connected={sheets.connected}/>}
  </section>;
}
OnlyOfficeWorkspace.propTypes = { item: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };
