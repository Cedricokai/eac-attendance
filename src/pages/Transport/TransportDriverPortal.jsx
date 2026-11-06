import { useCallback, useEffect, useState } from "react";
import Link from "./TransportLink";
import TransportWorkspace from "./TransportWorkspace";
import { TransportBadge, TransportEmpty, TransportTable } from "./TransportPrimitives";
import { transportDate } from "./transportFormat";
import { transportApi } from "./transportApi";

export default function TransportDriverPortal(){
 const [data,setData]=useState(null);
 const [error,setError]=useState("");
 const load=useCallback(()=>{setError("");Promise.all([transportApi("/vehicles"),transportApi("/faults"),transportApi("/inspection-assignments")]).then(([vehicles,faults,inspections])=>setData({vehicles,faults,inspections})).catch(e=>setError(e.message));},[]);
 useEffect(load,[load]);
 return <TransportWorkspace title="My driver workspace" description="Your assigned vehicles, inspections, and repair requests." loading={!data&&!error} error={error} onRetry={load}>{context=>!context.driverId?<section className="tm-panel"><TransportEmpty title="No driver profile is linked" description="A Transport administrator can link your existing employee account to a driver record."/></section>:data&&<>
  <section className="tm-panel"><h2>Quick actions</h2><div className="tm-row-actions"><Link className="tm-record-link" to="/transport/faults">Report a vehicle fault</Link><Link className="tm-record-link" to="/transport/inspections">Complete an inspection</Link>{context.rules.driverFuelEnabled&&<Link className="tm-record-link" to="/fuel">Record fuel and receipts</Link>}<Link className="tm-record-link" to="/transport/notifications">View my notifications</Link></div></section>
  <section className="tm-panel"><h2>Assigned vehicles</h2><TransportTable rows={data.vehicles} columns={[{key:"dvla",label:"Registration"},{key:"name",label:"Vehicle"},{key:"operationalStatus",label:"Operational state",render:r=><TransportBadge value={r.operationalStatus}/>},{key:"currentMileage",label:"Odometer (km)"},{key:"vehicleLicenseExpiry",label:"DVLA expiry",render:r=>transportDate(r.vehicleLicenseExpiry)},{key:"insuranceExpiry",label:"Insurance expiry",render:r=>transportDate(r.insuranceExpiry)}]} actions={row=><Link className="tm-record-link" to={`/transport/vehicles/${row.id}`}>Details, mileage & documents</Link>}/></section>
  <section className="tm-panel"><h2>My repair requests</h2><TransportTable rows={data.faults.filter(f=>f.reporterId===context.userId)} columns={[{key:"reference",label:"Reference"},{key:"vehicle",label:"Vehicle"},{key:"severity",label:"Severity",render:r=><TransportBadge value={r.severity}/>},{key:"status",label:"Progress",render:r=><TransportBadge value={r.status}/>},{key:"reviewNotes",label:"Review update"}]} actions={row=><Link className="tm-record-link" to={`/transport/faults?record=${row.id}`}>Open request</Link>}/></section>
  <section className="tm-panel"><h2>Assigned inspections</h2><TransportTable rows={data.inspections} columns={[{key:"vehicle",label:"Vehicle"},{key:"templateName",label:"Checklist"},{key:"nextDue",label:"Next due",render:r=>transportDate(r.nextDue)}]} actions={()=><Link className="tm-record-link" to="/transport/inspections">Complete checklist</Link>}/></section>
 </>}</TransportWorkspace>;
}
