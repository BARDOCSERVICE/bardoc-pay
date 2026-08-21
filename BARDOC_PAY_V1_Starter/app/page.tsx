"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home(){

const [session,setSession]=useState<any>(null);
const [loading,setLoading]=useState(true);

const [email,setEmail]=useState("");
const [password,setPassword]=useState("");

const [loginMode,setLoginMode]=useState(true);
const [message,setMessage]=useState("");

useEffect(()=>{

supabase.auth.getSession().then(({data})=>{

setSession(data.session);
setLoading(false);

});

const {data:{subscription}}=
supabase.auth.onAuthStateChange((_event,newSession)=>{

setSession(newSession);

});

return ()=>subscription.unsubscribe();

},[]);

async function handleSubmit(e:React.FormEvent){

e.preventDefault();

if(loginMode){

const {error}=await supabase.auth.signInWithPassword({
email,
password
});

if(error){
setMessage(error.message);
}

}else{

const {error}=await supabase.auth.signUp({
email,
password
});

if(error){
setMessage(error.message);
}else{
setMessage("Account creato.");
}

}

}

async function logout(){

await supabase.auth.signOut();
setSession(null);

}

if(loading){

return(
<div style={{
height:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontSize:20
}}>
Caricamento...
</div>
);

}

if(!session){

return(

<div style={{
minHeight:"100vh",
display:"flex",
justifyContent:"center",
alignItems:"center",
background:"#1d2531",
padding:20
}}>

<div style={{
background:"#fffaf3",
padding:40,
borderRadius:25,
width:520,
maxWidth:"100%"
}}>

<div style={{
width:75,
height:75,
borderRadius:"50%",
background:"#19b86b",
color:"white",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontSize:40,
fontWeight:"bold",
margin:"0 auto 25px"
}}>
B
</div>

<h1 style={{
textAlign:"center",
color:"#333"
}}>
BARDOC SERVICE
</h1>

<h2 style={{
textAlign:"center",
color:"#19b86b",
marginBottom:25
}}>
Portale Dipendenti
</h2>

<form
onSubmit={handleSubmit}
style={{
display:"flex",
flexDirection:"column",
gap:15
}}
>

<input
type="email"
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
style={{
padding:14,
borderRadius:10,
border:"1px solid #ccc"
}}
required
/>

<input
type="password"
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{
padding:14,
borderRadius:10,
border:"1px solid #ccc"
}}
required
/>

<button style={{
padding:15,
border:"none",
borderRadius:10,
background:"#19b86b",
color:"white",
fontWeight:"bold",
fontSize:16
}}>
{loginMode?"Accedi":"Registrati"}
</button>

</form>

<button
onClick={()=>setLoginMode(!loginMode)}
style={{
background:"none",
border:"none",
color:"#19b86b",
marginTop:20,
fontWeight:"bold"
}}
>
{loginMode?"Crea un account":"Hai già un account?"}
</button>

<p style={{
marginTop:20,
textAlign:"center"
}}>
{message}
</p>

</div>

</div>

);

}

return(

<div style={{
minHeight:"100vh",
padding:40,
background:"#f4f6f5"
}}>

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:40
}}>

<div>

<h1>BARDOC PAY</h1>

<p>{session.user.email}</p>

</div>

<button
onClick={logout}
style={{
padding:"12px 20px",
border:"none",
background:"#19b86b",
color:"white",
borderRadius:10
}}
>
Esci
</button>

</div>

<div style={{
background:"white",
padding:30,
borderRadius:20
}}>

<h2>Benvenuto nel portale.</h2>

<p style={{marginTop:10}}>
Il login Supabase è operativo.
</p>

</div>

</div>

);

}
