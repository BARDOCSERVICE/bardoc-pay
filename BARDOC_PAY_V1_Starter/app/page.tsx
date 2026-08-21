"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
id: string;
full_name: string;
tax_code: string | null;
email: string | null;
phone: string | null;
active: boolean;
};

type Document = {
id: string;
employee_id: string;
document_type: string;
month: number;
year: number;
file_name: string;
storage_path: string;
created_at: string;
};

type DocumentWithUrl = Document & {
signedUrl?: string;
};

export default function Home() {
const [session, setSession] = useState<any>(null);
const [loading, setLoading] = useState(true);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [loginMode, setLoginMode] = useState(true);
const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

const [employee, setEmployee] = useState<Employee | null>(null);
const [documents, setDocuments] = useState<DocumentWithUrl[]>([]);
const [documentsLoading, setDocumentsLoading] = useState(false);

useEffect(() => {
loadSession();

const {
data: { subscription },
} = supabase.auth.onAuthStateChange((_event, newSession) => {
setSession(newSession);

if (newSession) {
loadEmployeeAndDocuments(newSession.user.id);
} else {
setEmployee(null);
setDocuments([]);
}

setLoading(false);
});

return () => subscription.unsubscribe();
}, []);

async function loadSession() {
const { data } = await supabase.auth.getSession();

setSession(data.session);
setLoading(false);

if (data.session) {
await loadEmployeeAndDocuments(data.session.user.id);
}
}

async function loadEmployeeAndDocuments(authUserId: string) {
setDocumentsLoading(true);
setMessage("");

try {
/*
* CERCA IL DIPENDENTE COLLEGATO
* auth_user_id = utente Supabase autenticato
*/
const { data: employeeData, error: employeeError } =
await supabase
.from("employees")
.select("id, full_name, tax_code, email, phone, active")
.eq("auth_user_id", authUserId)
.maybeSingle();

if (employeeError) {
console.error(employeeError);
setMessage("Errore nel caricamento del profilo.");
return;
}

if (!employeeData) {
setEmployee(null);
setDocuments([]);
setMessage(
"Il tuo account non è ancora associato a un dipendente."
);
return;
}

setEmployee(employeeData);

/*
* RECUPERA I DOCUMENTI DEL DIPENDENTE
*/
const { data: documentsData, error: documentsError } =
await supabase
.from("documents")
.select(
"id, employee_id, document_type, month, year, file_name, storage_path, created_at"
)
.eq("employee_id", employeeData.id)
.order("year", { ascending: false })
.order("month", { ascending: false });

if (documentsError) {
console.error(documentsError);
setMessage("Errore nel caricamento dei documenti.");
return;
}

/*
* CREA URL TEMPORANEI PER I PDF PRIVATI
*/
const documentsWithUrls: DocumentWithUrl[] = [];

for (const document of documentsData || []) {
const { data: signedData, error: signedError } =
await supabase.storage
.from("payroll-documents")
.createSignedUrl(document.storage_path, 60 * 10);

if (signedError) {
console.error(
"Errore URL documento:",
document.file_name,
signedError
);

documentsWithUrls.push(document);
} else {
documentsWithUrls.push({
...document,
signedUrl: signedData?.signedUrl,
});
}
}

setDocuments(documentsWithUrls);
} finally {
setDocumentsLoading(false);
}
}

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
setEmployee(null);
setDocuments([]);
setEmail("");
setPassword("");
}

function getMonthName(month: number) {
const months = [
"Gennaio",
"Febbraio",
"Marzo",
"Aprile",
"Maggio",
"Giugno",
"Luglio",
"Agosto",
"Settembre",
"Ottobre",
"Novembre",
"Dicembre",
];

return months[month - 1] || `Mese ${month}`;
}

function getDocumentLabel(type: string) {
switch (type) {
case "payslip":
return "Busta paga";

case "contract":
return "Contratto";

case "document":
return "Documento";

default:
return type;
}
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
BARDOC PAY
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
BARDOC PAY
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
{(employee?.full_name || session.user.email || "U")
.charAt(0)
.toUpperCase()}
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

<div
style={{
padding: "13px 14px",
color: "#ffffff",
fontSize: 14,
marginBottom: 3,
borderRadius: 10,
background: "rgba(255,255,255,0.05)",
}}
>
▤ Le mie buste paga
</div>

<div
style={{
padding: "13px 14px",
color: "#aebbc2",
fontSize: 14,
marginBottom: 3,
borderRadius: 10,
}}
>
✦ Ferie e permessi
</div>

<div
style={{
padding: "13px 14px",
color: "#aebbc2",
fontSize: 14,
marginBottom: 3,
borderRadius: 10,
}}
>
◷ Presenze
</div>

<div
style={{
padding: "13px 14px",
color: "#aebbc2",
fontSize: 14,
marginBottom: 3,
borderRadius: 10,
}}
>
✉ Comunicazioni
</div>

<div
style={{
marginTop: 35,
padding: 14,
borderRadius: 12,
background: "rgba(255,255,255,0.04)",
color: "#8e9ba3",
fontSize: 12,
}}
>
<strong style={{ color: "#16c784" }}>●</strong>{" "}
Accesso autorizzato
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
AREA PERSONALE
</div>

<h1 style={{ margin: "8px 0", fontSize: 32 }}>
{employee?.full_name || "Dipendente"}
</h1>

<p
style={{
margin: 0,
color: "#b8c5cb",
}}
>
Benvenuto nel tuo portale BARDOC PAY.
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

{!employee ? (
<div
style={{
background: "#ffffff",
borderRadius: 20,
padding: 30,
border: "1px solid #e6ebea",
}}
>
<h2 style={{ marginTop: 0 }}>
Account non associato
</h2>

<p style={{ color: "#74808a" }}>
L'account{" "}
<strong>{session.user.email}</strong>{" "}
è autenticato, ma non è ancora collegato a un dipendente.
</p>

<p style={{ color: "#74808a" }}>
Contatta l'amministratore per completare l'associazione.
</p>
</div>
) : (
<>
<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit, minmax(200px, 1fr))",
gap: 16,
marginBottom: 24,
}}
>
<div
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
Documenti disponibili
</div>

<div
style={{
fontSize: 30,
fontWeight: 800,
}}
>
{documents.length}
</div>
</div>

<div
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
Email
</div>

<div
style={{
fontSize: 16,
fontWeight: 700,
wordBreak: "break-word",
}}
>
{employee.email || session.user.email}
</div>
</div>

<div
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
Stato account
</div>

<div
style={{
fontSize: 16,
fontWeight: 800,
color: "#119e6a",
}}
>
● Attivo
</div>
</div>
</div>

<div
style={{
background: "#ffffff",
borderRadius: 20,
padding: 25,
border: "1px solid #e6ebea",
}}
>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 22,
}}
>
<div>
<h2
style={{
margin: 0,
fontSize: 21,
}}
>
I miei documenti
</h2>

<p
style={{
margin: "6px 0 0",
color: "#89959b",
fontSize: 13,
}}
>
Buste paga e documenti personali
</p>
</div>
</div>

{documentsLoading ? (
<div
style={{
padding: 40,
textAlign: "center",
color: "#89959b",
}}
>
Caricamento documenti...
</div>
) : documents.length === 0 ? (
<div
style={{
padding: 40,
textAlign: "center",
background: "#f5f8f7",
borderRadius: 14,
color: "#89959b",
}}
>
<div
style={{
fontSize: 35,
marginBottom: 10,
}}
>
📄
</div>

Nessun documento disponibile.
</div>
) : (
<div
style={{
display: "flex",
flexDirection: "column",
gap: 10,
}}
>
{documents.map((document) => (
<div
key={document.id}
style={{
display: "flex",
alignItems: "center",
justifyContent: "space-between",
gap: 15,
padding: 16,
borderRadius: 14,
background: "#f7f9f8",
border: "1px solid #e8edeb",
}}
>
<div
style={{
display: "flex",
alignItems: "center",
gap: 14,
}}
>
<div
style={{
width: 46,
height: 46,
borderRadius: 12,
background: "#e1f8ef",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 22,
}}
>
📄
</div>

<div>
<div
style={{
fontWeight: 800,
color: "#26333d",
}}
>
{getDocumentLabel(
document.document_type
)}
</div>

<div
style={{
fontSize: 13,
color: "#89959b",
marginTop: 4,
}}
>
{getMonthName(document.month)}{" "}
{document.year}
</div>

<div
style={{
fontSize: 12,
color: "#a1aaaf",
marginTop: 3,
}}
>
{document.file_name}
</div>
</div>
</div>

{document.signedUrl ? (
<a
href={document.signedUrl}
target="_blank"
rel="noopener noreferrer"
style={{
padding: "10px 15px",
borderRadius: 10,
background: "#16c784",
color: "#062019",
textDecoration: "none",
fontWeight: 800,
fontSize: 13,
whiteSpace: "nowrap",
}}
>
Apri PDF
</a>
) : (
<span
style={{
color: "#a33",
fontSize: 12,
}}
>
Non disponibile
</span>
)}
</div>
))}
</div>
)}
</div>
</>
)}

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
