import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fileApi } from "./fileApi";
import { FileModal } from "./FileDialogs";
import "./onlyoffice.css";

export default function OfficeTemplateGallery({parentId,onClose,onCreated}) {
 const [page,setPage]=useState(0),[data,setData]=useState(null),[selected,setSelected]=useState(null),[name,setName]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();fileApi(`/onlyoffice/templates?page=${page}`,{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[page]);
 const create=async e=>{e.preventDefault();setBusy(true);setError("");try{const item=await fileApi("/onlyoffice/from-template",{method:"POST",body:JSON.stringify({templateId:selected.id,parentId:parentId||null,name})});onCreated(item);onClose();}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <FileModal title="Create from an Office template" onClose={onClose}>{error&&<p className="fm-error" role="alert">{error}</p>}<p>Templates retain their original images, formatting and workbook structure. A new private copy is created in the current folder.</p>{!data?<p role="status">Loading templates…</p>:data.configured===false?<p className="fm-notice">The administrator needs to configure an existing template folder. Upload your letterheads and workbook templates into that folder using Files; existing sharing rules control access.</p>:<><div className="fm-office-templates">{data.content.filter(item=>!item.folder&&/\.(docx|xlsx|pptx)$/i.test(item.name)).map(item=><button type="button" aria-pressed={selected?.id===item.id} key={item.id} onClick={()=>{setSelected(item);setName(item.name.replace(/(\.[^.]+)$/," (copy)$1"));}}>{item.name}</button>)}</div>{!data.content.length&&<p>No accessible templates in this folder.</p>}<div className="fm-actions"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={data.last} onClick={()=>setPage(p=>p+1)}>Next</button></div>{selected&&<form onSubmit={create}><label>New filename<input required value={name} onChange={e=>setName(e.target.value)}/></label><button className="fm-primary" disabled={busy}>{busy?"Creating copy…":"Create and open"}</button></form>}</>}</FileModal>;
}
OfficeTemplateGallery.propTypes={parentId:PropTypes.any,onClose:PropTypes.func.isRequired,onCreated:PropTypes.func.isRequired};
