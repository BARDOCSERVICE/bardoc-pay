"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  active: boolean;
  photo_url?: string | null;
  hire_date?: string | null;
};

type Document = {
  id: string;
  employee_id: string;
  document_type: string;
  month: number | null;
  year: number;
  file_name: string;
  storage_path: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  present_days: number;
  absent_days: number;
};

type ExtraPayment = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  amount: number;
  description: string | null;
};

type Communication = {
  id: string;
  employee_id: string | null;
  title: string;
  message: string;
  is_general: boolean;
  created_at: string;
};

type AdminMessage = {
  id: string;
  employee_id: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const ADMIN_EMAIL = "bardocfg@gmail.com";

const MONTHS = [
  "Gennaio","Febbraio","Marzo","Aprile",
  "Maggio","Giugno","Luglio","Agosto",
  "Settembre","Ottobre","Novembre","Dicembre"
];

function formatDate(date?: string | null){
  if(!date) return "—";
  const [y,m,d]=date.split("-");
  return `${d}/${m}/${y}`;
}

function money(v:number){
  return new Intl.NumberFormat("it-IT",{
    style:"currency",
    currency:"EUR"
  }).format(v);
}

export default function Home(){

const [session,setSession]=useState<any>(null);
const [loading,setLoading]=useState(true);
const [employee,setEmployee]=useState<Employee|null>(null);

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");

const [documents,setDocuments]=useState<Document[]>([]);
const [attendance,setAttendance]=useState<Attendance[]>([]);
const [extraPayments,setExtraPayments]=useState<ExtraPayment[]>([]);
const [communications,setCommunications]=useState<Communication[]>([]);
const [adminMessages,setAdminMessages]=useState<AdminMessage[]>([]);

const [subject,setSubject]=useState("");
const [contactMessage,setContactMessage]=useState("");
const [contactOpen,setContactOpen]=useState(false);

const isAdmin=
session?.user?.email?.toLowerCase()===ADMIN_EMAIL;

useEffect(()=>{

supabase.auth.getSession().then(({data})=>{
setSession(data.session);
setLoading(false);
});

const {data:{subscription}}=
supabase.auth.onAuthStateChange((_e,s)=>{
setSession(s);
});

return()=>subscription.unsubscribe();

},[]);

useEffect(()=>{
if(!session)return;

if(isAdmin){
loadAdmin();
}else{
loadEmployee();
}

},[session]);

async function loadEmployee(){

const {data:emp}=await supabase
.from("employees")
.select("*")
.eq("auth_user_id",session.user.id)
.maybeSingle();

setEmployee(emp);

if(!emp)return;

const {data:docs}=await supabase
.from("documents")
.select("*")
.eq("employee_id",emp.id);

setDocuments(docs||[]);

const {data:att}=await supabase
.from("attendance")
.select("*")
.eq("employee_id",emp.id);

setAttendance(att||[]);

const {data:ext}=await supabase
.from("extra_payments")
.select("*")
.eq("employee_id",emp.id);

setExtraPayments(ext||[]);

const {data:comm}=await supabase
.from("communications")
.select("*");

setCommunications(comm||[]);
}

async function loadAdmin(){

const {data}=await supabase
.from("admin_messages")
.select("*")
.order("created_at",{ascending:false});

setAdminMessages(data||[]);
}
  async function sendAdminRequest(){

if(!employee)return;

if(!subject.trim()||!contactMessage.trim()){
alert("Compila tutti i campi.");
return;
}

const {error}=await supabase
.from("admin_messages")
.insert({
employee_id:employee.id,
subject:subject.trim(),
message:contactMessage.trim(),
});

if(error){
alert("Errore durante l'invio.");
return;
}

setSubject("");
setContactMessage("");
setContactOpen(false);

alert("Richiesta inviata all'amministrazione.");
}

async function logout(){
await supabase.auth.signOut();
}

if(loading){

return(

<main style={{
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
background:"#081521",
color:"#fff",
fontFamily:"Arial"
}}>

<div style={{textAlign:"center"}}>

<div style={{
width:90,
height:90,
borderRadius:24,
background:"linear-gradient(135deg,#16c784,#61f3c1)",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontSize:46,
fontWeight:900,
color:"#062019",
margin:"0 auto 20px"
}}>
B
</div>

<h2>BARDOC PAY</h2>

<div>Caricamento...</div>

</div>

</main>

);

}

if(!session){

return(

<main style={{
minHeight:"100vh",
background:"radial-gradient(circle,#143944,#07141f)",
display:"flex",
justifyContent:"center",
alignItems:"center",
padding:20
}}>

<div style={{
width:"100%",
maxWidth:430,
background:"#10202b",
borderRadius:24,
padding:34,
color:"#fff"
}}>

<div style={{textAlign:"center"}}>

<div style={{
width:90,
height:90,
borderRadius:24,
background:"linear-gradient(135deg,#16c784,#61f3c1)",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontSize:48,
fontWeight:900,
color:"#062019",
margin:"0 auto 18px"
}}>
B
</div>

<h2>BARDOC PAY</h2>

<div style={{
color:"#16c784",
fontSize:12,
fontWeight:700
}}>
TEAM BARDOC SERVICE
</div>

</div>

<input
placeholder="Email"
value={email}
onChange={e=>setEmail(e.target.value)}
style={{
width:"100%",
marginTop:25,
padding:14,
borderRadius:10,
border:"1px solid #304650",
background:"#0f1b23",
color:"#fff"
}}
/>

<input
type="password"
placeholder="Password"
value={password}
onChange={e=>setPassword(e.target.value)}
style={{
width:"100%",
marginTop:12,
padding:14,
borderRadius:10,
border:"1px solid #304650",
background:"#0f1b23",
color:"#fff"
}}
/>

<button
onClick={async()=>{

const {error}=await supabase.auth.signInWithPassword({
email,
password
});

if(error)alert(error.message);

}}
style={{
width:"100%",
marginTop:20,
padding:15,
borderRadius:10,
border:"none",
background:"#16c784",
fontWeight:900,
cursor:"pointer"
}}
>

ACCEDI

</button>

</div>

</main>

);

}

if(isAdmin){

return(

<main style={{
minHeight:"100vh",
background:"#08141d",
color:"#fff",
padding:28,
fontFamily:"Arial"
}}>

<row justify=between align=center>
  <box gap=0>
    <title size=lg>BARDOC PAY</title>
    <caption color=info>AMMINISTRAZIONE</caption>
  </box>

  <button variant=outline onClick={logout}>Esci</button>
</row>

<box gap=3 padding={{ top: 4, bottom: 4 }}>

<box background="linear-gradient(135deg,#0f2b34,#0a1720)" border={{ size: 1, color: "#24424a" }} radius=2xl padding=3 gap=1>
  <caption color=info>AMMINISTRAZIONE</caption>
  <title size=xl>Centro Messaggi</title>
  <text size=sm>Le richieste inviate dai dipendenti arrivano qui.</text>
</box>

{adminMessages.length===0?(

<box background="#13222c" border={{ size: 1, color: "#2d4048" }} radius=xl padding=3>
  <text color=secondary>Nessuna richiesta presente.</text>
</box>

):(

adminMessages.map(msg=>(

<box key={msg.id} background="#13222c" border={{ size: 1, color: "#2d4048" }} radius=xl padding=3 gap=1>

<row justify=between align=center>
  <box gap=0>
    <title size=sm>{msg.subject}</title>
    <caption>{new Date(msg.created_at).toLocaleString("it-IT")}</caption>
  </box>

  <badge color={msg.is_read ? "secondary" : "info"} label={msg.is_read ? "Letto" : "Nuovo"} />
</row>

<text size=sm>{msg.message}</text>

</box>

))

)}

</box>

</main>

);

}

/* ===========================
   AREA PERSONALE DIPENDENTE
=========================== */

const years=Array.from(new Set(documents.map(d=>d.year))).sort((a,b)=>b-a);

return(

<main style={{
minHeight:"100vh",
background:"linear-gradient(180deg,#07141f,#0d1922)",
color:"#fff",
fontFamily:"Arial"
}}>

<header style={{
padding:"20px 28px",
display:"flex",
justifyContent:"space-between",
alignItems:"center",
background:"#08141d",
borderBottom:"1px solid #21323b"
}}>

<div>

<h2 style={{margin:0}}>BARDOC PAY</h2>

<div style={{
color:"#16c784",
fontSize:12,
fontWeight:800
}}>
AREA PERSONALE
</div>

</div>

<button
onClick={logout}
style={{
padding:"10px 18px",
background:"transparent",
color:"#fff",
border:"1px solid #334955",
borderRadius:10
}}
>
Esci
</button>

</header>

<section style={{
maxWidth:1100,
margin:"30px auto",
padding:"0 20px"
}}>

<div style={{
background:"linear-gradient(135deg,#0b2728,#102d39)",
borderRadius:26,
padding:30,
marginBottom:22
}}>

<div style={{
color:"#16c784",
fontWeight:900,
fontSize:12
}}>
AREA PERSONALE
</div>

<div style={{
fontSize:18,
marginTop:6,
letterSpacing:1
}}>
TEAM BARDOC SERVICE
</div>

<div style={{
display:"flex",
alignItems:"center",
gap:22,
marginTop:24,
flexWrap:"wrap"
}}>

<div style={{
width:110,
height:110,
borderRadius:"50%",
overflow:"hidden",
border:"3px solid #16c784",
background:"#12342d"
}}>

{employee?.photo_url?(
<img
src={employee.photo_url}
style={{
width:"100%",
height:"100%",
objectFit:"cover"
}}
/>
):(
<div style={{
width:"100%",
height:"100%",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontSize:40,
fontWeight:900
}}>
{employee?.full_name?.charAt(0)}
</div>
)}

</div>

<div>

<h1 style={{margin:"0 0 8px"}}>
{employee?.full_name}
</h1>

<div style={{color:"#a9b8c0"}}>
Collabora presso la struttura
</div>

<div style={{
color:"#16c784",
fontWeight:900,
marginTop:4
}}>
BARDOC SERVICE
</div>

<div style={{
marginTop:8,
color:"#95a7af"
}}>
Dal {formatDate(employee?.hire_date)}
</div>

</div>

</div>

</div>
  {/* ===========================
    PRESENZE
=========================== */}

<div style={{
background:"#172630",
border:"1px solid #293c47",
borderRadius:20,
padding:24,
marginBottom:20
}}>

<h2 style={{margin:"0 0 16px"}}>
📊 Presenze mensili
</h2>

{attendance.length===0?(
<div style={{color:"#8fa2ab"}}>
Nessun dato disponibile.
</div>
):(

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",
gap:18
}}>

{attendance
.sort((a,b)=>b.year-a.year||b.month-a.month)
.map(item=>{

const total=item.present_days+item.absent_days||1;
const percent=item.present_days/total*100;

return(

<div
key={item.id}
style={{
background:"#0f1d26",
border:"1px solid #29414b",
borderRadius:16,
padding:18
}}
>

<div style={{
display:"flex",
alignItems:"center",
gap:18
}}>

<div style={{
width:100,
height:100,
borderRadius:"50%",
background:`conic-gradient(#16c784 0 ${percent}%, #ef5555 ${percent}% 100%)`,
position:"relative"
}}>

<div style={{
position:"absolute",
inset:12,
borderRadius:"50%",
background:"#0f1d26",
display:"flex",
justifyContent:"center",
alignItems:"center",
flexDirection:"column"
}}>

<div style={{
fontWeight:900,
color:"#16c784",
fontSize:22
}}>
{Math.round(percent)}%
</div>

<div style={{
fontSize:10,
color:"#8fa2ab"
}}>
PRESENZE
</div>

</div>

</div>

<div>

<strong>
{MONTHS[item.month-1]} {item.year}
</strong>

<div style={{
marginTop:8,
color:"#16c784"
}}>
● Presenze: {item.present_days}
</div>

<div style={{
marginTop:4,
color:"#ef5555"
}}>
● Assenze: {item.absent_days}
</div>

</div>

</div>

</div>

);

})}

</div>

)}

</div>

{/* ===========================
    RETRIBUZIONE
=========================== */}

<div style={{
background:"#172630",
border:"1px solid #293c47",
borderRadius:20,
padding:24,
marginBottom:20
}}>

<h2 style={{margin:"0 0 16px"}}>
💶 Retribuzione
</h2>

{years.length===0?(
<div style={{color:"#8fa2ab"}}>
Nessuna busta paga disponibile.
</div>
):(

years.map(year=>(

<details
key={year}
style={{
marginBottom:12,
border:"1px solid #2b4049",
borderRadius:12,
overflow:"hidden"
}}
>

<summary style={{
padding:16,
cursor:"pointer",
background:"#10202b",
fontWeight:900
}}>
📅 {year}
</summary>

<div style={{padding:14}}>

{MONTHS.map((monthName,index)=>{

const month=index+1;

const docs=documents.filter(
d=>d.year===year&&d.month===month
);

const payslip=docs.find(
d=>d.document_type==="payslip"
);

const statement=docs.find(
d=>d.document_type==="payment_statement"
);

const extras=extraPayments.filter(
e=>e.year===year&&e.month===month
);

if(!payslip&&!statement&&!extras.length)return null;

return(

<details
key={month}
style={{
marginBottom:10,
border:"1px solid #304650",
borderRadius:10,
overflow:"hidden"
}}
>

<summary style={{
padding:14,
cursor:"pointer",
background:"#0f1d26"
}}>
{monthName}
</summary>

<div style={{
padding:14,
display:"flex",
flexDirection:"column",
gap:10
}}>

{payslip&&(

<button
onClick={async()=>{

const {data}=await supabase.storage
.from("payroll-documents")
.createSignedUrl(payslip.storage_path,300);

if(data?.signedUrl){
window.open(data.signedUrl,"_blank");
}

}}
style={{
padding:12,
border:"none",
borderRadius:10,
background:"#16c784",
fontWeight:900,
cursor:"pointer"
}}
>
📄 Busta paga
</button>

)}

{statement&&(

<button
onClick={async()=>{

const {data}=await supabase.storage
.from("payroll-documents")
.createSignedUrl(statement.storage_path,300);

if(data?.signedUrl){
window.open(data.signedUrl,"_blank");
}

}}
style={{
padding:12,
border:"none",
borderRadius:10,
background:"#16c784",
fontWeight:900,
cursor:"pointer"
}}
>
💳 Distinta di pagamento
</button>

)}

{extras.map(extra=>(

<div
key={extra.id}
style={{
padding:14,
borderRadius:10,
background:"#113129",
border:"1px solid #205645"
}}
>

<div style={{
color:"#16c784",
fontWeight:800
}}>
{extra.description||"Premio lavorativo"}
</div>

<div style={{
marginTop:5,
fontWeight:900
}}>
{money(extra.amount)}
</div>

</div>

))}

</div>

</details>

);

})}

</div>

</details>

))

)}

</div>

{/* ===========================
    COMUNICAZIONI
=========================== */}

<div style={{
background:"#172630",
border:"1px solid #293c47",
borderRadius:20,
padding:24,
marginBottom:20
}}>

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:16,
flexWrap:"wrap",
gap:12
}}>

<div>

<h2 style={{margin:0}}>
📢 Comunicazioni
</h2>

<div style={{
color:"#8fa2ab",
fontSize:13,
marginTop:4
}}>
Messaggi inviati dall'amministrazione.
</div>

</div>

<button
onClick={()=>setContactOpen(true)}
style={{
padding:"12px 18px",
border:"none",
borderRadius:10,
background:"#16c784",
fontWeight:900,
cursor:"pointer"
}}
>
Contatta l'Amministrazione
</button>

</div>

{communications.length===0?(
<div style={{color:"#8fa2ab"}}>
Nessuna comunicazione.
</div>
):(

communications.map(comm=>(

<div
key={comm.id}
style={{
padding:"16px 0",
borderTop:"1px solid #293b45"
}}
>

<strong>{comm.title}</strong>

<div style={{
marginTop:8,
whiteSpace:"pre-wrap",
color:"#d5dfe3"
}}>
{comm.message}
</div>

<div style={{
marginTop:8,
fontSize:11,
color:"#7f919a"
}}>
{new Date(comm.created_at).toLocaleString("it-IT")}
</div>

</div>

))

)}

</div>

{/* ===========================
    POPUP CONTATTA AMMINISTRAZIONE
=========================== */}

{contactOpen&&(

<div style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,.65)",
display:"flex",
justifyContent:"center",
alignItems:"center",
zIndex:999
}}>

<div style={{
width:"95%",
maxWidth:520,
background:"#0f1b23",
border:"1px solid #2d414a",
borderRadius:22,
padding:24
}}>

<h2 style={{marginTop:0}}>
📩 Contatta l'Amministrazione
</h2>

<input
placeholder="Oggetto"
value={subject}
onChange={e=>setSubject(e.target.value)}
style={{
width:"100%",
padding:13,
borderRadius:10,
border:"1px solid #334955",
background:"#13222c",
color:"#fff",
marginBottom:14
}}
/>

<textarea
rows={6}
placeholder="Scrivi il messaggio..."
value={contactMessage}
onChange={e=>setContactMessage(e.target.value)}
style={{
width:"100%",
padding:13,
borderRadius:10,
border:"1px solid #334955",
background:"#13222c",
color:"#fff",
resize:"vertical"
}}
/>

<div style={{
display:"flex",
gap:10,
marginTop:20
}}>

<button
onClick={()=>setContactOpen(false)}
style={{
flex:1,
padding:13,
borderRadius:10,
border:"1px solid #3b515d",
background:"transparent",
color:"#fff",
cursor:"pointer"
}}
>
Annulla
</button>

<button
onClick={sendAdminRequest}
style={{
flex:1,
padding:13,
borderRadius:10,
border:"none",
background:"#16c784",
fontWeight:900,
cursor:"pointer"
}}
>
Invia richiesta
</button>

</div>

</div>

</div>

)}

<div style={{
marginTop:22,
padding:16,
background:"#13222c",
borderRadius:12,
color:"#95a7af",
fontSize:12
}}>
Accesso effettuato come <strong>{session.user.email}</strong>
</div>

</section>

</main>

);

}
