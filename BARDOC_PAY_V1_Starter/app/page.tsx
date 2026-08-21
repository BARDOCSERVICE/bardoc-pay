"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
id: string;
auth_user_id: string | null;
full_name: string;
email: string | null;
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
};

const ADMIN_EMAIL = "bardocfg@gmail.com";

export default function Home() {
const [session, setSession] = useState<any>(null);
const [loading, setLoading] = useState(true);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loginMode, setLoginMode] = useState(true);
const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

const [employee, setEmployee] = useState<Employee | null>(null);
const [employees, setEmployees] = useState<Employee[]>([]);
const [documents, setDocuments] = useState<Document[]>([]);

const [adminLoading, setAdminLoading] = useState(false);

const [selectedEmployee, setSelectedEmployee] = useState("");
const [documentType, setDocumentType] = useState("payslip");
const [month, setMonth] = useState(new Date().getMonth() + 1);
const [year, setYear] = useState(new Date().getFullYear());
const [file, setFile] = useState<File | null>(null);

const isAdmin =
session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

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

useEffect(() => {
if (!session) return;

if (isAdmin) {
loadEmployees();
} else {
loadEmployeeArea();
}
}, [session, isAdmin]);

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
setEmployees([]);
setEmail("");
setPassword("");
}

async function loadEmployeeArea() {
if (!session?.user?.id) return;

const { data: emp, error: empError } = await supabase
.from("employees")
.select("*")
.eq("auth_user_id", session.user.id)
.maybeSingle();

if (empError) {
console.error(empError);
return;
}

setEmployee(emp);

if (!emp) return;

const { data: docs, error: docsError } = await supabase
.from("documents")
.select("*")
.eq("employee_id", emp.id)
.order("year", { ascending: false })
.order("month", { ascending: false });

if (docsError) {
console.error(docsError);
return;
}

setDocuments(docs || []);
}

async function loadEmployees() {
setAdminLoading(true);

const { data, error } = await supabase
.from("employees")
.select("*")
.eq("active", true)
.order("full_name");

if (error) {
console.error(error);
setMessage("Impossibile caricare i dipendenti.");
} else {
setEmployees(data || []);
}

setAdminLoading(false);
}

async function uploadDocument() {
setMessage("");

if (!selectedEmployee) {
setMessage("Seleziona un dipendente.");
return;
}

if (!file) {
setMessage("Seleziona un file PDF.");
return;
}

if (file.type !== "application/pdf") {
setMessage("Il documento deve essere un PDF.");
return;
}

setSubmitting(true);

try {
const employeeFolder = selectedEmployee;

const safeFileName = file.name
.replace(/[^\w.\- ]/g, "")
.replace(/\s+/g, "_");

const storagePath = `${employeeFolder}/${safeFileName}`;

const { error: uploadError } = await supabase.storage
.from("payroll-documents")
.upload(storagePath, file, {
upsert: true,
contentType: "application/pdf",
});

if (uploadError) {
throw uploadError;
}

const { error: documentError } = await supabase
.from("documents")
.insert({
employee_id: selectedEmployee,
document_type: documentType,
month,
year,
file_name: file.name,
storage_path: storagePath,
});

if (documentError) {
throw documentError;
}

setMessage("Documento caricato correttamente. ✅");

setSelectedEmployee("");
setDocumentType("payslip");
setMonth(new Date().getMonth() + 1);
setYear(new Date().getFullYear());
setFile(null);

const input = document.getElementById(
"document-file"
) as HTMLInputElement | null;

if (input) input.value = "";
} catch (error: any) {
console.error(error);
setMessage(
error?.message || "Errore durante il caricamento del documento."
);
}

setSubmitting(false);
}

async function openDocument(doc: Document) {
const { data, error } = await supabase.storage
.from("payroll-documents")
.createSignedUrl(doc.storage_path, 300);

if (error) {
console.error(error);
setMessage("Impossibile aprire il documento.");
return;
}

if (data?.signedUrl) {
window.open(data.signedUrl, "_blank");
}
}

function documentLabel(type: string) {
if (type === "payment_statement") {
return "Distinta di pagamento";
}

return "Busta paga";
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
<input
type="email"
placeholder="Email"
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
}}
/>

<input
type="password"
placeholder="Password"
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
}}
/>

<button
type="submit"
disabled={submitting}
style={{
padding: "15px 18px",
border: "none",
borderRadius: 12,
background: "#16c784",
color: "#062019",
fontSize: 16,
fontWeight: 800,
cursor: "pointer",
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
}}
>
{message}
</div>
)}
</div>
</main>
);
}

/*
* AREA AMMINISTRATORE
*/
if (isAdmin) {
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
background: "#ffffff",
borderBottom: "1px solid #e5e9e8",
padding: "18px 28px",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
}}
>
<div>
<strong style={{ fontSize: 21 }}>BARDOC PAY</strong>
<div style={{ color: "#89959b", fontSize: 13 }}>
Area amministratore
</div>
</div>

<button
onClick={logout}
style={{
padding: "10px 17px",
border: "1px solid #dce4e1",
borderRadius: 10,
background: "#fff",
fontWeight: 700,
cursor: "pointer",
}}
>
Esci
</button>
</header>

<section
style={{
maxWidth: 1000,
margin: "0 auto",
padding: 30,
}}
>
<div
style={{
background: "linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 22,
padding: 30,
color: "#fff",
marginBottom: 22,
}}
>
<div
style={{
color: "#16c784",
fontWeight: 800,
fontSize: 13,
}}
>
AMMINISTRAZIONE
</div>

<h1 style={{ margin: "8px 0" }}>
Carica documento
</h1>

<p style={{ margin: 0, color: "#b8c5cb" }}>
Pubblica buste paga e distinte di pagamento per i dipendenti.
</p>
</div>

<div
style={{
background: "#fff",
borderRadius: 20,
padding: 28,
border: "1px solid #e6ebea",
}}
>
<div
style={{
display: "grid",
gridTemplateColumns: "1fr 1fr",
gap: 18,
}}
>
<div>
<label>Dipendente</label>

<select
value={selectedEmployee}
onChange={(e) => setSelectedEmployee(e.target.value)}
style={{
width: "100%",
padding: 14,
marginTop: 7,
borderRadius: 10,
border: "1px solid #dce3e7",
}}
>
<option value="">Seleziona dipendente</option>

{employees.map((emp) => (
<option key={emp.id} value={emp.id}>
{emp.full_name}
</option>
))}
</select>
</div>

<div>
<label>Tipo documento</label>

<select
value={documentType}
onChange={(e) => setDocumentType(e.target.value)}
style={{
width: "100%",
padding: 14,
marginTop: 7,
borderRadius: 10,
border: "1px solid #dce3e7",
}}
>
<option value="payslip">Busta paga</option>
<option value="payment_statement">
Distinta di pagamento
</option>
</select>
</div>

<div>
<label>Mese</label>

<select
value={month}
onChange={(e) => setMonth(Number(e.target.value))}
style={{
width: "100%",
padding: 14,
marginTop: 7,
borderRadius: 10,
border: "1px solid #dce3e7",
}}
>
{[
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
].map((name, index) => (
<option key={name} value={index + 1}>
{name}
</option>
))}
</select>
</div>

<div>
<label>Anno</label>

<input
type="number"
value={year}
onChange={(e) => setYear(Number(e.target.value))}
style={{
width: "100%",
padding: 14,
marginTop: 7,
borderRadius: 10,
border: "1px solid #dce3e7",
boxSizing: "border-box",
}}
/>
</div>
</div>

<div style={{ marginTop: 20 }}>
<label>Documento PDF</label>

<input
id="document-file"
type="file"
accept="application/pdf,.pdf"
onChange={(e) =>
setFile(e.target.files?.[0] || null)
}
style={{
display: "block",
marginTop: 10,
width: "100%",
}}
/>
</div>

<button
onClick={uploadDocument}
disabled={submitting}
style={{
width: "100%",
marginTop: 25,
padding: 16,
border: "none",
borderRadius: 12,
background: "#16c784",
color: "#062019",
fontWeight: 800,
fontSize: 16,
cursor: submitting ? "wait" : "pointer",
}}
>
{submitting
? "Caricamento..."
: "CARICA DOCUMENTO"}
</button>

{message && (
<div
style={{
marginTop: 18,
padding: 14,
borderRadius: 12,
background: "#f1f7f5",
color: "#285d4b",
textAlign: "center",
}}
>
{message}
</div>
)}
</div>

<div
style={{
marginTop: 20,
padding: 20,
background: "#fff",
borderRadius: 16,
border: "1px solid #e6ebea",
}}
>
<strong>Dipendenti attivi</strong>

<div style={{ marginTop: 12, color: "#74808a" }}>
{adminLoading
? "Caricamento..."
: `${employees.length} dipendenti presenti`}
</div>
</div>
</section>
</main>
);
}

/*
* AREA DIPENDENTE
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
background: "#fff",
padding: "18px 28px",
borderBottom: "1px solid #e5e9e8",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
}}
>
<div>
<strong style={{ fontSize: 21 }}>BARDOC PAY</strong>
<div style={{ color: "#89959b", fontSize: 13 }}>
Area personale
</div>
</div>

<button
onClick={logout}
style={{
padding: "10px 17px",
border: "1px solid #dce4e1",
borderRadius: 10,
background: "#fff",
fontWeight: 700,
}}
>
Esci
</button>
</header>

<section
style={{
maxWidth: 1100,
margin: "0 auto",
padding: 30,
}}
>
<div
style={{
background: "linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 22,
padding: 30,
color: "#fff",
}}
>
<div
style={{
color: "#16c784",
fontWeight: 800,
fontSize: 13,
}}
>
AREA PERSONALE
</div>

<h1 style={{ margin: "8px 0" }}>
{employee?.full_name || "Dipendente"}
</h1>

<p style={{ margin: 0, color: "#b8c5cb" }}>
Benvenuto nel tuo portale BARDOC PAY.
</p>
</div>

<div
style={{
background: "#fff",
borderRadius: 20,
padding: 25,
marginTop: 20,
}}
>
<h2 style={{ marginTop: 0 }}>I miei documenti</h2>

{documents.length === 0 ? (
<p style={{ color: "#89959b" }}>
Non sono presenti documenti.
</p>
) : (
documents.map((doc) => (
<div
key={doc.id}
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
padding: 16,
borderTop: "1px solid #edf0ef",
}}
>
<div>
<strong>
{documentLabel(doc.document_type)}
</strong>

<div
style={{
color: "#89959b",
fontSize: 13,
marginTop: 5,
}}
>
{doc.file_name} · {doc.month}/{doc.year}
</div>
</div>

<button
onClick={() => openDocument(doc)}
style={{
background: "#16c784",
border: "none",
borderRadius: 10,
padding: "10px 16px",
fontWeight: 800,
cursor: "pointer",
}}
>
Apri PDF
</button>
</div>
))
)}
</div>

<div
style={{
marginTop: 20,
padding: 18,
background: "#fff",
borderRadius: 16,
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
</main>
);
}
