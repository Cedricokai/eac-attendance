import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

import { transportApi } from "./transportApi";

function AssetPreview({ asset }) {
  const [url, setUrl] = useState("");
  useEffect(() => {let active = true;let objectUrl;const controller = new AbortController();if (asset.readable && /^image\/(jpeg|png|webp)$/.test(asset.mediaType)) transportApi(`/assets/${asset.id}/download`, { blob: true, signal: controller.signal }).then(blob => {if (!active) return;objectUrl = URL.createObjectURL(new Blob([blob], { type: asset.mediaType }));setUrl(objectUrl);}).catch(() => {});return () => {active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};}, [asset.id, asset.readable, asset.mediaType]);
  return url ? <img className="tm-asset-preview" src={url} alt={asset.name} loading="lazy" /> : <div className="tm-asset-placeholder"><strong>{asset.mediaType==="application/pdf"?"PDF":"FILE"}</strong><span>{asset.readable ? asset.mediaType : "Access restricted"}</span></div>;
}
AssetPreview.propTypes = { asset: PropTypes.object.isRequired };

export default function TransportAssets({ vehicleId, purpose, referenceId, editable = false, primaryFileId, onChanged }) {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const [pending, setPending] = useState([]);
  const input = useRef(null);
  const params = new URLSearchParams({ purpose });if(referenceId)params.set("referenceId",String(referenceId));
  const query=params.toString();
  const load = useCallback(() => transportApi(`/vehicles/${vehicleId}/assets?${query}`).then(setRecords).catch(e => setError(e.message)), [vehicleId, query]);
  useEffect(() => {setRecords([]);setPending([]);setError("");load();}, [load]);
  const upload = async event => {event.preventDefault();setBusy(true);setError("");let queue=[...pending];try{for(const item of pending){const body=new FormData();body.append("file",item.file);const uploadParams=new URLSearchParams({purpose,shareWithAssignedDriver:String(share)});if(referenceId)uploadParams.set("referenceId",String(referenceId));await transportApi(`/vehicles/${vehicleId}/assets?${uploadParams}`,{method:"POST",body,headers:{"Idempotency-Key":item.key}});queue=queue.filter(entry=>entry.key!==item.key);setPending(queue);}if(input.current)input.current.value="";onChanged?.();}catch(e){setError(e.message);}finally{await load();setBusy(false);}};
  const action = async (path, method) => {setBusy(true);setError("");try{await transportApi(path,{method});await load();onChanged?.();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const download = async asset => {setBusy(true);setError("");try{const blob=await transportApi(`/assets/${asset.id}/download`,{blob:true});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=asset.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <section className="tm-asset-section" aria-busy={busy}>{error && <p role="alert" className="tm-error">{error}</p>}
    {editable && <form className="tm-asset-upload" onSubmit={upload}><label><span>{purpose==="VEHICLE_IMAGE"?"Choose vehicle images":"Choose attachments"}</span><input ref={input} type="file" multiple={purpose!=="FUEL_RECEIPT"} accept={purpose==="VEHICLE_IMAGE"?"image/jpeg,image/png,image/webp":"application/pdf,image/jpeg,image/png,image/webp"} disabled={busy} onChange={event=>{const selected=[...event.target.files];if(selected.some(file=>!file.size||file.size>10*1024*1024)){setError("Choose non-empty files up to 10 MB each.");setPending([]);return;}if(selected.length>10){setError("Select up to ten files at a time.");setPending([]);return;}setError("");setPending(selected.map(file=>({file,key:crypto.randomUUID()})));}}/></label><label className="tm-share-choice"><input type="checkbox" checked={share} disabled={busy} onChange={e=>setShare(e.target.checked)}/>Also share these new files with the assigned driver</label>{pending.length>0 && <><p>{pending.map(item=>item.file.name).join(", ")}</p><button type="submit" disabled={busy} className="tm-button-primary">{busy?"Uploading…":"Upload selected files"}</button></>}<p>Original files are stored in File Management. Removing a link here retains the original file.</p></form>}
    {records.length ? <div className="tm-asset-grid">{records.map(asset=><article className="tm-asset-card" key={asset.id}><AssetPreview asset={asset}/><h3>{asset.name}</h3><small>{asset.sizeBytes==null?"Size unavailable":`${(asset.sizeBytes/1024).toFixed(1)} KB`}{asset.fileId===primaryFileId?" · Primary image":""}</small><div className="tm-row-actions"><button type="button" disabled={busy||!asset.readable} onClick={()=>download(asset)}> Download</button>{editable&&<>{purpose==="VEHICLE_IMAGE"&&asset.fileId!==primaryFileId&&asset.readable&&<button type="button" disabled={busy} onClick={()=>action(`/vehicles/${vehicleId}/primary-image/${asset.id}`,"POST")}> Make primary</button>}<button type="button" disabled={busy} onClick={()=>action(`/assets/${asset.id}`,"DELETE")}>Remove link</button></>}</div></article>)}</div> : <p>No attachments recorded.</p>}
  </section>;
}
TransportAssets.propTypes = { vehicleId: PropTypes.oneOfType([PropTypes.number,PropTypes.string]).isRequired, purpose: PropTypes.string.isRequired, referenceId: PropTypes.number, editable: PropTypes.bool, primaryFileId: PropTypes.number, onChanged: PropTypes.func };
