import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import { TransportBadge, TransportTable } from "./TransportPrimitives";
import { transportDate } from "./transportFormat";
import { transportApi } from "./transportApi";

export default function TransportDocuments(){
 const [params]=useSearchParams();
 const [records,setRecords]=useState(null);
 const [error,setError]=useState("");
 const [status,setStatus]=useState(params.get("status")||"");
 const [type,setType]=useState("");
 const [history,setHistory]=useState(false);
 const load=useCallback(()=>{setError("");transportApi(`/documents?history=${history}`).then(setRecords).catch(e=>setError(e.message));},[history]);
 useEffect(load,[load]);
 const rows=(records||[]).filter(r=>(!status||r.status===status)&&(!type||r.documentType===type));
 return <TransportWorkspace title="Documents & expiry" description="Track vehicle compliance and retain previous renewals." loading={!records&&!error} error={error} onRetry={load}><section className="tm-panel"><div className="tm-toolbar"><label>Condition <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All conditions</option>{["VALID","EXPIRING_SOON","EXPIRED","NOT_RECORDED"].map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select></label><label>Document type <select value={type} onChange={e=>setType(e.target.value)}><option value="">All document types</option>{[...new Set((records||[]).map(r=>r.documentType))].sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label><label><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/>Include previous renewals</label></div><p>Documents remain valid through their expiry date in Africa/Accra. Open a vehicle profile to record a renewal or download the original attachment.</p><TransportTable rows={rows} columns={[{key:"vehicle",label:"Vehicle"},{key:"documentType",label:"Document"},{key:"referenceNumber",label:"Reference"},{key:"issueDate",label:"Issued",render:r=>transportDate(r.issueDate)},{key:"expiryDate",label:"Expiry",render:r=>transportDate(r.expiryDate)},{key:"daysRemaining",label:"Days remaining"},{key:"status",label:"Condition",render:r=><TransportBadge value={r.active?r.status:"HISTORICAL"}/>},{key:"fileName",label:"Attachment"}]} actions={row=><Link className="tm-record-link" to={`/transport/vehicles/${row.vehicleId}`}>Open vehicle profile</Link>}/></section></TransportWorkspace>;
}
