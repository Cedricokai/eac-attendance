import { useState } from "react";
import Link from "./TransportLink";
import { TransportField } from "./TransportPrimitives";
import { transportApi, transportCommand } from "./transportApi";
export default function TransportEmailTest(){
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [sent,setSent]=useState(false);
 const submit=async event=>{event.preventDefault();setBusy(true);setError("");setSent(false);try{await transportApi("/settings/test-email",transportCommand("POST",{email}));setSent(true);}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <section className="tm-panel"><h2>Test email delivery</h2><p>Send a configuration test using the existing backend email connection. This explicitly requested test can run while ordinary email notifications are paused.</p>{error&&<p role="alert" className="tm-error">{error}</p>}{sent&&<p role="status" className="tm-success">Test email queued. <Link to="/transport/notifications">Open delivery history</Link> to review the result.</p>}<form onSubmit={submit}><TransportField label="Test recipient email" type="email" value={email} onChange={setEmail} required/><div className="tm-form-actions"><button className="tm-button-primary" disabled={busy} type="submit">{busy?"Queuing test…":"Send configuration test"}</button></div></form></section>;
}
