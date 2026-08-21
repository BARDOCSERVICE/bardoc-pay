"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
const [session, setSession] = useState<any>(null);
const [loading, setLoading] = useState(true);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loginMode, setLoginMode] = useState(true);
const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setLoading(false);
});

const {
data: { subscription },
} = supabase.auth.onAuthStateChange((_event, newSession) => {
setSession(newSession);
setLoading(false);
});

return () => subscription.unsubscribe();
}, []);

async function handleSubmit(e: React.FormEvent) {
e.preventDefault();

setMessage("");
setSubmitting(true);

if (loginMode) {
const { error } = await supabase.auth.signInWithPassword({
email,
password,
});

if (error) {
setMessage("Email o password non corretti.");
}
} else {
const { error } = await supabase.auth.signUp({
email,
password,
});

if (error) {
setMessage(error.message);
} else {
setMessage(
"Account creato. Controlla la tua email se è richiesta la conferma."
);
}
}

setSubmitting(false);
}

async function logout() {
await supabase.auth.signOut();
setSession(null);
setEmail("");
setPassword("");
}

if (loading) {
return (
<div
style={{
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center",
background: "#07141f",
color: "white",
fontFamily: "Arial, sans-serif",
}}
>
<div style={{ textAlign: "center" }}>
<div
style={{
width: 70,
height: 70,
borderRadius: 20,
background: "#16c784",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 38,
fontWeight: 800,
margin: "0 auto 20px",
}}
>
B
</div>

<div style={{ fontSize: 18, opacity: 0.8 }}>
Caricamento BARDOC PAY...
</div>
</div>
</div>
);
}

/*
* LOGIN
* L'utente NON autenticato non può vedere il portale.
*/
if (!session) {
return (
<main
style={{
minHeight: "100vh",
background:
"linear-gradient(135deg, #07141f 0%, #102936 55%, #07141f 100%)",
display: "flex",
alignItems: "center",
justifyContent: "center",
padding: 24,
fontFamily: "Arial, sans-serif",
}}
>
<div
style={{
width: "100%",
maxWidth: 460,
background: "#ffffff",
borderRadius: 28,
padding: 42,
boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
}}
>
<div style={{ textAlign: "center" }}>
<div
style={{
width: 82,
height: 82,
margin: "0 auto 20px",
borderRadius: 24,
background: "#16c784",
color: "#062019",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 46,
fontWeight: 900,
boxShadow: "0 12px 30px rgba(22,199,132,0.30)",
}}
>
B
</div>

<div
style={{
color: "#16a970",
fontWeight: 800,
letterSpacing: 1.5,
fontSize: 14,
}}
>
BARDOC SERVICE
</div>

<h1
style={{
margin: "8px 0 6px",
color: "#13202b",
fontSize: 30,
}}
>
Portale Dipendenti
</h1>

<p
style={{
margin: "0 0 30px",
color: "#74808a",
fontSize: 15,
}}
>
Accedi alla tua area personale
</p>
</div>

<form
onSubmit={handleSubmit}
style={{
display: "flex",
flexDirection: "column",
gap: 16,
}}
>
<div>
<label
style={{
display: "block",
marginBottom: 7,
fontSize: 13,
fontWeight: 700,
color: "#26333d",
}}
>
Email
</label>

<input
type="email"
placeholder="Inserisci la tua email"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
style={{
width: "100%",
boxSizing: "border-box",
padding: "14px 15px",
borderRadius: 12,
border: "1px solid #dce3e7",
fontSize: 15,
outline: "none",
}}
/>
</div>

<div>
<label
style={{
display: "block",
marginBottom: 7,
fontSize: 13,
fontWeight: 700,
color: "#26333d",
}}
>
Password
</label>

<input
type="password"
placeholder="Inserisci la password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
style={{
width: "100%",
boxSizing: "border-box",
padding: "14px 15px",
borderRadius: 12,
border: "1px solid #dce3e7",
fontSize: 15,
outline: "none",
}}
/>
</div>

<button
type="submit"
disabled={submitting}
style={{
marginTop: 6,
padding: "15px 18px",
border: "none",
borderRadius: 12,
background: "#16c784",
color: "#062019",
fontSize: 16,
fontWeight: 800,
cursor: submitting ? "wait" : "pointer",
opacity: submitting ? 0.7 : 1,
}}
>
{submitting
? "Attendere..."
: loginMode
? "Accedi al portale"
: "Crea account"}
</button>
</form>

<button
type="button"
onClick={() => {
setLoginMode(!loginMode);
setMessage("");
}}
style={{
display: "block",
width: "100%",
marginTop: 22,
border: "none",
background: "transparent",
color: "#119e6a",
fontWeight: 700,
cursor: "pointer",
fontSize: 14,
}}
>
{loginMode
? "Non hai ancora un account? Registrati"
: "Hai già un account? Accedi"}
</button>

{message && (
<div
style={{
marginTop: 20,
padding: 13,
borderRadius: 12,
background: "#f1f7f5",
color: "#285d4b",
textAlign: "center",
fontSize: 14,
}}
>
{message}
</div>
)}

<div
style={{
marginTop: 30,
paddingTop: 20,
borderTop: "1px solid #edf0f2",
textAlign: "center",
color: "#9aa3a9",
fontSize: 12,
}}
>
BARDOC PAY · Area riservata
</div>
</div>
</main>
);
}

/*
* PORTALE DOPO IL LOGIN
*/
return (
<main
style={{
minHeight: "100vh",
background: "#f3f6f5",
fontFamily: "Arial, sans-serif",
color: "#17232d",
}}
>
<header
style={{
height: 72,
background: "#ffffff",
borderBottom: "1px solid #e5e9e8",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
padding: "0 28px",
}}
>
<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
<div
style={{
width: 44,
height: 44,
borderRadius: 13,
background: "#16c784",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 25,
fontWeight: 900,
color: "#062019",
}}
>
B
</div>

<div>
<div style={{ fontWeight: 800 }}>BARDOC SERVICE</div>
<div style={{ fontSize: 12, color: "#8a949b" }}>
Portale del personale
</div>
</div>
</div>

<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
<div
style={{
width: 38,
height: 38,
borderRadius: "50%",
background: "#dff8ee",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontWeight: 800,
color: "#119e6a",
}}
>
{session.user.email?.charAt(0).toUpperCase() || "U"}
</div>

<button
onClick={logout}
style={{
padding: "10px 17px",
border: "1px solid #dce4e1",
borderRadius: 10,
background: "#ffffff",
color: "#26333d",
fontWeight: 700,
cursor: "pointer",
}}
>
Esci
</button>
</div>
</header>

<div
style={{
display: "flex",
minHeight: "calc(100vh - 72px)",
}}
>
<aside
style={{
width: 235,
background: "#07141f",
color: "#ffffff",
padding: "26px 16px",
boxSizing: "border-box",
}}
>
<div
style={{
padding: "12px 14px",
borderRadius: 12,
background: "rgba(22,199,132,0.12)",
color: "#16c784",
fontWeight: 800,
marginBottom: 20,
}}
>
▣ Dashboard
</div>

{[
"♙ Dipendenti",
"◷ Presenze",
"✦ Ferie e permessi",
"▤ Buste paga",
"▧ Documenti",
"□ Calendario",
"✉ Comunicazioni",
].map((item) => (
<div
key={item}
style={{
padding: "13px 14px",
color: "#aebbc2",
fontSize: 14,
marginBottom: 3,
borderRadius: 10,
}}
>
{item}
</div>
))}

<div
style={{
position: "absolute",
bottom: 25,
marginLeft: 10,
color: "#8e9ba3",
fontSize: 12,
}}
>
<strong style={{ color: "#16c784" }}>●</strong> Accesso autorizzato
</div>
</aside>

<section
style={{
flex: 1,
padding: 30,
boxSizing: "border-box",
maxWidth: 1400,
margin: "0 auto",
width: "100%",
}}
>
<div
style={{
background:
"linear-gradient(135deg, #07141f 0%, #102d39 100%)",
borderRadius: 22,
padding: "32px 34px",
color: "#ffffff",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 24,
}}
>
<div>
<div
style={{
color: "#16c784",
fontWeight: 800,
fontSize: 13,
letterSpacing: 1,
}}
>
BARDOC SERVICE
</div>

<h1 style={{ margin: "8px 0", fontSize: 32 }}>
Portale Dipendenti
</h1>

<p style={{ margin: 0, color: "#b8c5cb" }}>
Tutto il personale aziendale in un unico posto.
</p>
</div>

<div
style={{
width: 72,
height: 72,
borderRadius: 20,
background: "#16c784",
color: "#062019",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 40,
fontWeight: 900,
}}
>
B
</div>
</div>

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit, minmax(190px, 1fr))",
gap: 16,
marginBottom: 24,
}}
>
{[
["Dipendenti", "4"],
["Presenti oggi", "4"],
["Ferie in attesa", "2"],
["Documenti", "28"],
].map(([title, value]) => (
<div
key={title}
style={{
background: "#ffffff",
borderRadius: 17,
padding: 22,
border: "1px solid #e6ebea",
}}
>
<div
style={{
color: "#89959b",
fontSize: 13,
marginBottom: 12,
}}
>
{title}
</div>

<div
style={{
fontSize: 30,
fontWeight: 800,
color: "#182630",
}}
>
{value}
</div>
</div>
))}
</div>

<div
style={{
display: "grid",
gridTemplateColumns: "2fr 1fr",
gap: 18,
}}
>
<div
style={{
background: "#ffffff",
borderRadius: 20,
padding: 25,
border: "1px solid #e6ebea",
}}
>
<h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
Presenze di oggi
</h2>

<p
style={{
margin: "0 0 22px",
color: "#89959b",
fontSize: 13,
}}
>
Situazione del personale
</p>

{[1, 2, 3, 4].map((number) => (
<div
key={number}
style={{
display: "flex",
alignItems: "center",
justifyContent: "space-between",
padding: "14px 0",
borderTop:
number === 1 ? "none" : "1px solid #edf0ef",
}}
>
<div
style={{
display: "flex",
alignItems: "center",
gap: 12,
}}
>
<div
style={{
width: 34,
height: 34,
borderRadius: 10,
background: "#e3f8f0",
display: "flex",
alignItems: "center",
justifyContent: "center",
color: "#119e6a",
fontWeight: 800,
}}
>
{number}
</div>

<div>
<strong>Dipendente {number}</strong>
<div
style={{
fontSize: 12,
color: "#929da3",
}}
>
Operatore Sportello
</div>
</div>
</div>

<span
style={{
color: "#16a970",
fontSize: 13,
fontWeight: 700,
}}
>
● Presente
</span>
</div>
))}
</div>

<div
style={{
background: "#ffffff",
borderRadius: 20,
padding: 25,
border: "1px solid #e6ebea",
}}
>
<h2 style={{ margin: "0 0 5px", fontSize: 20 }}>
Accesso rapido
</h2>

<p
style={{
margin: "0 0 20px",
color: "#89959b",
fontSize: 13,
}}
>
Gestisci il personale
</p>

{[
"👤 Dipendenti",
"◷ Presenze",
"✦ Ferie e permessi",
"▤ Buste paga",
].map((item) => (
<div
key={item}
style={{
padding: 15,
marginBottom: 9,
borderRadius: 12,
background: "#f5f8f7",
fontWeight: 700,
fontSize: 14,
}}
>
{item}
</div>
))}
</div>
</div>

<div
style={{
marginTop: 22,
padding: 18,
background: "#ffffff",
borderRadius: 16,
border: "1px solid #e6ebea",
color: "#7d898f",
fontSize: 13,
}}
>
Accesso effettuato come{" "}
<strong style={{ color: "#26333d" }}>
{session.user.email}
</strong>
</div>
</section>
</div>
</main>
);
}
