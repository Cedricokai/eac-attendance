import { useCallback, useEffect, useRef, useState } from "react";
import { fileApi } from "./fileApi";

const GUID = "asc.{B785C60D-E5F1-48D1-A624-2BF8EAC50001}";
export default function useOfficeSheets(fileId, session) {
  const [policy, setPolicy] = useState(null), [connected, setConnected] = useState(false);
  const [active, setActive] = useState(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [appliedVersion, setAppliedVersion] = useState(null);
  const [cellLockRequest,setCellLockRequest]=useState(null),[cellLockRevision,setCellLockRevision]=useState(0);
  const bridge = useRef(null), snapshot = useRef(null), options = useRef(null);
  const enabled = session?.config.documentType === "cell";
  const send = useCallback((type, data) => {
    if (bridge.current && options.current) bridge.current.postMessage({ source: "eac-sheet-manager", nonce: options.current.bridgeNonce, type, data }, new URL(session.scriptUrl).origin);
  }, [session]);
  const updateActive = useCallback(name => {
    const current = snapshot.current, settings = options.current;
    if (!current || !settings) return;
    const sheet = current.sheets.find(entry => entry.name === name);
    const allowed = current.adminOverride || settings.userId === current.ownerId || (sheet && (!sheet.restricted || ["CanView", "CanEdit"].includes(sheet.members[settings.userId])));
    setActive({ name, denied: !allowed });
  }, []);
  useEffect(() => {
    if (!enabled) { setPolicy(null); setConnected(false); return; }
    const controller = new AbortController(); let live = true, loading = false;
    options.current = session.config.editorConfig.plugins?.options?.[GUID];
    if (!options.current?.bridgeNonce) { setError("Restart the backend and reopen this workbook to load the EAC sheet-access bridge."); return; }
    setConnected(false); setActive(null); setAppliedVersion(null); setCellLockRevision(0);setCellLockRequest(null); setError(""); bridge.current = null; snapshot.current = null;
    const load = async () => {
      if (loading) return; loading = true;
      try { const current = await fileApi(`/${fileId}/onlyoffice/sheets`, { signal: controller.signal });
        if (live) { snapshot.current = current; setPolicy(current); setError(""); send("policy", current); if (!current.pending) setNotice(""); }
      } catch (e) { if (live && !controller.signal.aborted) setError(e.message); } finally { loading = false; }
    };
    const receive = event => {
      const message = event.data;
      if (event.origin !== new URL(session.scriptUrl).origin || !message || message.source !== "eac-office-sheets" || message.nonce !== options.current.bridgeNonce) return;
      if (!bridge.current && message.type === "ready") bridge.current = event.source;
      if (event.source !== bridge.current) return;
      if (message.type === "ready") { setConnected(true); if (snapshot.current) send("policy", snapshot.current); }
      if (message.type === "active") updateActive(message.data.name);
      if (message.type === "applied") {setAppliedVersion(message.data.policyVersion);setNotice("Sheet access applied. Saving and verifying the workbook restrictions…");}
      if (message.type === "error") setError(String(message.data));
      if(message.type==="cell-lock-request")fileApi(`/${fileId}/onlyoffice/cell-locks/status`,{method:"POST",body:JSON.stringify({sheet:message.data.sheet})}).then(status=>{if(live)setCellLockRequest({...message.data,...status});}).catch(e=>{if(live)setError(e.message);});
      if(message.type==="cell-locked"){setCellLockRevision(value=>value+1);setNotice(`Cell ${message.data.locked?"locks":"unlocks"} applied to ${message.data.range}. Saving the protected workbook…`);}
    };
    window.addEventListener("message", receive); load();
    const interval = setInterval(load, 10000);
    return () => { live = false; controller.abort(); clearInterval(interval); window.removeEventListener("message", receive); bridge.current = null; options.current = null; };
  }, [enabled, fileId, session, send, updateActive]);
  const saved = useCallback(current => { snapshot.current = current; setPolicy(current); setError(""); setNotice("Assignments saved in EAC; applying them to the workbook…"); send("apply", current); }, [send]);
  const select = useCallback(name => { updateActive(name); send("select", { name }); }, [send, updateActive]);
  const applyCellLock=useCallback(async request=>{setError("");const saved=await fileApi(`/${fileId}/onlyoffice/cell-locks`,{method:"POST",body:JSON.stringify({...request,sessionId:session.sessionId,expectedVersion:request.version})});setCellLockRequest(null);setNotice("Standard Excel cell protection saved. Reopening the protected workbook…");return saved;},[fileId,session]);
  const startCellLock=useCallback(locked=>{setError("");send("cell-lock-start",{locked});},[send]);
  return { enabled, policy, connected,startCellLock, active, error, notice, saved, select, appliedVersion,cellLockRequest,cellLockRevision,applyCellLock,closeCellLock:()=>setCellLockRequest(null) };
}
