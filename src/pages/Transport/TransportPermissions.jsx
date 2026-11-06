import { useEffect, useState } from "react";
import { TransportField } from "./TransportPrimitives";
import { transportApi, transportCommand } from "./transportApi";

export default function TransportPermissions(){
 const [data,setData]=useState(null);
 const [selected,setSelected]=useState("");
 const [form,setForm]=useState(null);
 const [reason,setReason]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{const controller=new AbortController();transportApi("/permissions",{signal:controller.signal}).then(setData).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[]);
 const choose=code=>{setSelected(code);const permission=data.permissions.find(p=>p.code===code);setForm(permission?{...permission,userIds:[...permission.userIds],roleIds:[...permission.roleIds]}:null);setReason("");setMessage("");};
 const toggle=(group,id,checked)=>setForm(old=>({...old,[group]:checked?[...old[group],id]:old[group].filter(value=>value!==id)}));
 const save=async event=>{event.preventDefault();setBusy(true);setError("");setMessage("");try{const updated=await transportApi(`/permissions/${selected}`,transportCommand("PUT",{...form,reason}));setData(updated);setForm(updated.permissions.find(p=>p.code===selected));setReason("");setMessage("Transport permission assignments saved and audited.");}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <section className="tm-panel"><h2>Transport action permissions</h2><p>Assign only the actions each account or role needs. Administrator accounts retain their administrative access. These grants do not change File Management permissions or per-file sharing.</p>{error&&<p role="alert" className="tm-error">{error}</p>}{message&&<p role="status" className="tm-success">{message}</p>}{data&&<form onSubmit={save}><TransportField label="Action permission" type="select" value={selected} options={data.permissions.map(p=>({value:p.code,label:p.code.replace("TRANSPORT_","").replaceAll("_"," ")}))} onChange={choose}/>{form&&<><div className="tm-permission-columns"><fieldset><legend>Accounts</legend>{data.users.map(user=><TransportField key={user.id} type="checkbox" label={`${user.name} (${user.username})${user.enabled?"":" — inactive"}`} value={form.userIds.includes(user.id)} onChange={checked=>toggle("userIds",user.id,checked)}/>)}</fieldset><fieldset><legend>Roles</legend>{data.roles.map(role=><TransportField key={role.id} type="checkbox" label={role.name.replace("ROLE_","").replaceAll("_"," ")} value={form.roleIds.includes(role.id)} onChange={checked=>toggle("roleIds",role.id,checked)}/>)}</fieldset></div><TransportField label="Assignment reason" type="textarea" value={reason} onChange={setReason} required help="At least ten characters. Every change is recorded in the audit history."/><div className="tm-form-actions"><button type="submit" className="tm-button-primary" disabled={busy}>{busy?"Saving…":"Save action permissions"}</button></div></>}</form>}</section>;
}
