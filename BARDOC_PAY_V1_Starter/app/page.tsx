"use client";

import { useState } from "react";

export default function Home() {
const [menu, setMenu] = useState(false);

const services = [
{ icon: "💳", title: "Pagamenti", text: "Bollettini, PagoPA, MAV e F24" },
{ icon: "💡", title: "Luce & Gas", text: "Gestisci e valuta le tue utenze" },
{ icon: "📱", title: "Ricariche", text: "SIM e ricariche telefoniche" },
{ icon: "🏦", title: "Bonifici", text: "Bonifici ordinari e istantanei" },
{ icon: "🚗", title: "Bollo Auto", text: "Controlla e paga il bollo" },
{ icon: "🎟️", title: "Biglietteria", text: "Eventi, bus e spettacoli" },
];

return (
<main
style={{
minHeight: "100vh",
background: "#f4f7f7",
color: "#172222",
fontFamily: "Arial, sans-serif",
}}
>
{/* HEADER */}
<header
style={{
background: "#111b1b",
color: "white",
padding: "18px 6%",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
position: "sticky",
top: 0,
zIndex: 10,
}}
>
<div>
<div
style={{
fontSize: "25px",
fontWeight: 800,
color: "#63e6be",
letterSpacing: "1px",
}}
>
BARDOC PAY
</div>
<div style={{ fontSize: "12px", opacity: 0.7 }}>
I tuoi servizi, in un unico posto
</div>
</div>

<button
onClick={() => setMenu(!menu)}
style={{
background: "#63e6be",
color: "#102020",
border: "none",
borderRadius: "10px",
padding: "11px 18px",
fontWeight: 700,
cursor: "pointer",
}}
>
{menu ? "Chiudi" : "Accedi"}
</button>
</header>

{/* HERO */}
<section
style={{
padding: "55px 6% 35px",
background:
"linear-gradient(135deg, #102020 0%, #193333 55%, #20504a 100%)",
color: "white",
}}
>
<div style={{ maxWidth: "1100px", margin: "auto" }}>
<div
style={{
display: "inline-block",
background: "rgba(99,230,190,.15)",
color: "#63e6be",
padding: "7px 12px",
borderRadius: "30px",
fontSize: "13px",
fontWeight: 700,
marginBottom: "15px",
}}
>
BARDOC SERVICE
</div>

<h1
style={{
fontSize: "clamp(34px, 6vw, 58px)",
lineHeight: 1.05,
margin: "0 0 18px",
maxWidth: "750px",
}}
>
Tutti i tuoi pagamenti.
<br />
<span style={{ color: "#63e6be" }}>Semplicemente.</span>
</h1>

<p
style={{
fontSize: "18px",
lineHeight: 1.6,
opacity: 0.82,
maxWidth: "650px",
}}
>
BARDOC PAY è il nuovo punto digitale di BARDOC SERVICE per
gestire pagamenti, ricariche, bollette e servizi.
</p>

<div style={{ display: "flex", gap: "12px", marginTop: "28px", flexWrap: "wrap" }}>
<button
style={{
background: "#63e6be",
color: "#102020",
border: "none",
borderRadius: "12px",
padding: "14px 23px",
fontWeight: 800,
cursor: "pointer",
}}
>
Inizia ora
</button>

<button
style={{
background: "transparent",
color: "white",
border: "1px solid rgba(255,255,255,.3)",
borderRadius: "12px",
padding: "14px 23px",
fontWeight: 700,
cursor: "pointer",
}}
>
Scopri i servizi
</button>
</div>
</div>
</section>

{/* ACCESSO */}
{menu && (
<section style={{ padding: "25px 6%" }}>
<div
style={{
maxWidth: "500px",
margin: "auto",
background: "white",
borderRadius: "18px",
padding: "25px",
boxShadow: "0 10px 30px rgba(0,0,0,.08)",
}}
>
<h2 style={{ marginTop: 0 }}>Accedi a BARDOC PAY</h2>

<input
type="email"
placeholder="Email"
style={{
width: "100%",
boxSizing: "border-box",
padding: "14px",
marginBottom: "12px",
borderRadius: "10px",
border: "1px solid #d5dddd",
}}
/>

<input
type="password"
placeholder="Password"
style={{
width: "100%",
boxSizing: "border-box",
padding: "14px",
marginBottom: "15px",
borderRadius: "10px",
border: "1px solid #d5dddd",
}}
/>

<button
style={{
width: "100%",
padding: "14px",
border: "none",
borderRadius: "10px",
background: "#193333",
color: "white",
fontWeight: 700,
cursor: "pointer",
}}
>
Accedi
</button>
</div>
</section>
)}

{/* SERVIZI */}
<section style={{ padding: "45px 6%" }}>
<div style={{ maxWidth: "1100px", margin: "auto" }}>
<div style={{ marginBottom: "25px" }}>
<div
style={{
color: "#198f78",
fontWeight: 800,
fontSize: "13px",
textTransform: "uppercase",
letterSpacing: "1px",
}}
>
I servizi
</div>

<h2 style={{ fontSize: "32px", margin: "8px 0" }}>
Cosa puoi fare con BARDOC PAY
</h2>

<p style={{ color: "#647070" }}>
Una piattaforma unica per i principali servizi di pagamento.
</p>
</div>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
gap: "18px",
}}
>
{services.map((service) => (
<div
key={service.title}
style={{
background: "white",
borderRadius: "18px",
padding: "23px",
border: "1px solid #e3eaea",
boxShadow: "0 5px 18px rgba(0,0,0,.04)",
cursor: "pointer",
}}
>
<div style={{ fontSize: "32px", marginBottom: "12px" }}>
{service.icon}
</div>

<h3 style={{ margin: "0 0 8px" }}>{service.title}</h3>

<p
style={{
margin: 0,
color: "#687777",
lineHeight: 1.5,
fontSize: "14px",
}}
>
{service.text}
</p>

<div
style={{
marginTop: "18px",
color: "#198f78",
fontWeight: 700,
fontSize: "14px",
}}
>
Apri servizio →
</div>
</div>
))}
</div>
</div>
</section>

{/* BANNER */}
<section style={{ padding: "10px 6% 50px" }}>
<div
style={{
maxWidth: "1100px",
margin: "auto",
background: "#63e6be",
borderRadius: "22px",
padding: "30px",
color: "#102020",
}}
>
<h2 style={{ marginTop: 0 }}>
Un posto, mille servizi.
</h2>

<p style={{ maxWidth: "650px", lineHeight: 1.6 }}>
BARDOC PAY nasce per portare online i servizi di BARDOC SERVICE,
in modo semplice, veloce e sicuro.
</p>

<strong>BARDOC SERVICE — Foggia</strong>
</div>
</section>

{/* FOOTER */}
<footer
style={{
background: "#111b1b",
color: "white",
padding: "28px 6%",
textAlign: "center",
fontSize: "13px",
opacity: 0.95,
}}
>
<strong style={{ color: "#63e6be" }}>BARDOC PAY</strong>
<div style={{ marginTop: "8px", opacity: 0.65 }}>
Un servizio BARDOC SERVICE
</div>
</footer>
</main>
);
}
