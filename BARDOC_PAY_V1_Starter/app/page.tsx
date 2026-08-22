
"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee={id:string;
auth_user_id:string|null;
full_name:string;
email:string|null;
hire_date:string|null};
type Document={id:string;
employee_id:string;
document_type:string;
month:number|null;
year:number;
file_name:string;
storage_path:string};
type Communication={id:string;
employee_id:string|null;
title:string;
message:string;
is_general:boolean;
created_at:string};

const ADMIN="bardocfg@gmail.com";
const MONTHS=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

export default function Home(){
 const [session,setSession]=useState<any>(null);
 const [loading,setLoading]=useState(true);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [emp,setEmp]=useState<Employee|null>(null);
 const [docs,setDocs]=useState<Document[]>([]);
 const [comms,setComms]=useState<Communication[]>([]);
 const [open,setOpen]=useState(false);
 const [subj,setSubj]=useState("");
 const [msg,setMsg]=useState("");

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);
setLoading(false)});
const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!session||session.user.email===ADMIN)return;
(async()=>{const {data:e}=await supabase.from("employees").select("*").eq("auth_user_id",session.user.id).maybeSingle();
setEmp(e);
if(e){const {data:d}=await supabase.from("documents").select("*").eq("employee_id",e.id);
const {data:c}=await supabase.from("communications").select("*").order("created_at",{ascending:false});
setDocs(d||[]);
setComms(c||[])}})()},[session]);

 const years=useMemo(()=>Array.from(new Set(docs.map(d=>d.year))).sort((a,b)=>b-a),[docs]);

 async function send(){if(!emp||!subj.trim()||!msg.trim())return;
await supabase.from("admin_messages").insert({employee_id:emp.id,subject:subj,message:msg});
setOpen(false);
setSubj("");
setMsg("");
alert("Richiesta inviata");
}

 if(loading)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#08141d",color:"#fff"}}>Caricamento...</main>;
 if(!session)return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#08141d"}}>
<div style={{width:360,padding:28,borderRadius:18,background:"#172630",color:"#fff"}}>
<h1>BARDOC PAY</h1>
<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:12,marginBottom:10}}/>
<input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%",padding:12,marginBottom:16}}/>
<button onClick={()=>supabase.auth.signInWithPassword({email,password})} style={{width:"100%",padding:12,background:"#16c784",border:"none",borderRadius:10,fontWeight:700}}>ACCEDI</button>
</div>
</main>;
 if(session.user.email===ADMIN)return <main style={{minHeight:"100vh",background:"#08141d",color:"#fff",padding:28}}>
<h1>BARDOC PAY · AMMINISTRAZIONE</h1>
<button onClick={()=>supabase.auth.signOut()}>Esci</button>
<p>Centro Messaggi attivo.</p>
</main>;

 return <main style={{minHeight:"100vh",background:"#08141d",color:"#fff",padding:24,fontFamily:"Arial"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<h1>BARDOC PAY</h1>
<div style={{color:"#16c784"}}>TEAM BARDOC SERVICE</div>
</div>
<button onClick={()=>supabase.auth.signOut()}>Esci</button>
</div>
  <div style={{background:"#172630",padding:22,borderRadius:20,margin:"20px 0"}}>
<h2>{emp?.full_name}</h2>
<p>Assunto il {emp?.hire_date||"-"}</p>
</div>
  <div style={{background:"#172630",padding:22,borderRadius:20,marginBottom:20}}>
<h2>💬 Comunicazioni</h2>{comms.length?comms.map(c=>
<div key={c.id} style={{padding:"10px 0",borderTop:"1px solid #2d404a"}}>
<strong>{c.title}</strong>
<p>{c.message}</p>
</div>):<p>Nessuna comunicazione.</p>}</div>
  <div style={{background:"#172630",padding:22,borderRadius:20,marginBottom:20}}>
<h2>💬 Contatta l'Amministrazione</h2>
<p>Invia una richiesta al Centro Messaggi dell'amministratore.</p>
<button onClick={()=>setOpen(true)} style={{width:"100%",padding:12,background:"#16c784",border:"none",borderRadius:10,fontWeight:700}}>CONTATTA L'AMMINISTRAZIONE</button>
</div>
  <div style={{background:"#172630",padding:22,borderRadius:20}}>
<h2>📁 Documenti</h2>{years.map(y=>
<div key={y}>
<h3>{y}</h3>{docs.filter(d=>d.year===y).map(d=>
<div key={d.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
<span>{(d.month?MONTHS[d.month-1]+" · ":"")+d.file_name}</span>
<button onClick={async()=>{const {data}=await supabase.storage.from("payroll-documents").createSignedUrl(d.storage_path,300);
if(data?.signedUrl)window.open(data.signedUrl,"_blank");
}}>Apri</button>
</div>)}</div>)}</div>
  {open&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"grid",placeItems:"center"}}>
<div style={{background:"#172630",padding:22,borderRadius:18,width:420}}>
<h3>Contatta l'Amministrazione</h3>
<input value={subj} onChange={e=>setSubj(e.target.value)} placeholder="Oggetto" style={{width:"100%",padding:10,marginBottom:10}}/>
<textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={5} placeholder="Messaggio" style={{width:"100%",padding:10}}/>
<div style={{display:"flex",gap:10,marginTop:12}}>
<button onClick={()=>setOpen(false)}>Annulla</button>
<button onClick={send}>Invia</button>
</div>
</div>
</div>}
 </main>;
}
