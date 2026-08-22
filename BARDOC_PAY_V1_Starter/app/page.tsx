"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
id: string;
auth_user_id: string | null;
full_name: string;
email: string | null;
active: boolean;
fiscal_code: string | null;
photo_path: string | null;
};

type Document = {
id: string;
employee_id: string;
document_type: string;
month: number;
year: number;
file_name: string;
storage_path: string;
expiry_date?: string | null;
};

const ADMIN_EMAIL = "bardocfg@gmail.com";

const MONTHS = [
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

const DOCUMENT_TYPES = [
{
value: "identity_document",
label: "Documento di identità",
category: "personal",
expiry: true,
},
{
value: "driving_license",
label: "Patente",
category: "personal",
expiry: true,
},
{
value: "fiscal_code",
label: "Codice fiscale",
category: "personal",
expiry: false,
},
{
value: "employment_contract",
label: "Contratto di lavoro",
category: "employment",
expiry: false,
},
{
value: "work_relationship",
label: "Rapporto di lavoro",
category: "employment",
expiry: false,
},
{
value: "leave_absence",
label: "Permessi e assenze",
category: "employment",
expiry: false,
},
{
value: "payslip",
label: "Busta paga",
category: "payroll",
expiry: false,
},
{
value: "payment_statement",
label: "Distinta di pagamento",
category: "payroll",
expiry: false,
},
{
value: "curriculum",
label: "Curriculum",
category: "personal",
expiry: false,
},
];

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

const [adminSection, setAdminSection] = useState<
"dashboard" | "employees" | "upload"
>("dashboard");

const [selectedEmployee, setSelectedEmployee] = useState("");
const [documentType, setDocumentType] = useState("payslip");
const [month, setMonth] = useState(new Date().getMonth() + 1);
const [year, setYear] = useState(new Date().getFullYear());
const [expiryDate, setExpiryDate] = useState("");
const [file, setFile] = useState<File | null>(null);

const [employeeSearch, setEmployeeSearch] = useState("");
const [selectedEmployeeProfile, setSelectedEmployeeProfile] =
useState<Employee | null>(null);

const [employeePhoto, setEmployeePhoto] = useState<File | null>(null);
const [employeePhotoUrl, setEmployeePhotoUrl] = useState("");
const [photoUploading, setPhotoUploading] = useState(false);

const isAdmin =
session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

const selectedDocumentType = useMemo(
() => DOCUMENT_TYPES.find((item) => item.value === documentType),
[documentType]
);

const filteredEmployees = useMemo(() => {
const search = employeeSearch.trim().toLowerCase();

if (!search) return employees;

return employees.filter((emp) => {
return (
emp.full_name.toLowerCase().includes(search) ||
emp.email?.toLowerCase().includes(search) ||
emp.fiscal_code?.toLowerCase().includes(search)
);
});
}, [employees, employeeSearch]);

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
setSelectedEmployeeProfile(null);
setEmployeePhotoUrl("");
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

async function openEmployeeProfile(emp: Employee) {
setSelectedEmployeeProfile(emp);
setEmployeePhotoUrl("");
setEmployeePhoto(null);
setMessage("");

if (!emp.photo_path) return;

const { data, error } = await supabase.storage
.from("employee-photos")
.createSignedUrl(emp.photo_path, 600);

if (error) {
console.error(error);
return;
}

if (data?.signedUrl) {
setEmployeePhotoUrl(data.signedUrl);
}
}

async function uploadEmployeePhoto() {
if (!selectedEmployeeProfile) {
setMessage("Seleziona un dipendente.");
return;
}

if (!employeePhoto) {
setMessage("Seleziona una foto.");
return;
}

if (
!["image/jpeg", "image/png", "image/webp"].includes(
employeePhoto.type
)
) {
setMessage("La foto deve essere JPG, PNG oppure WEBP.");
return;
}

if (employeePhoto.size > 5 * 1024 * 1024) {
setMessage("La foto non può superare 5 MB.");
return;
}

setPhotoUploading(true);
setMessage("");

try {
const extension =
employeePhoto.type === "image/png"
? "png"
: employeePhoto.type === "image/webp"
? "webp"
: "jpg";

const storagePath = `${
selectedEmployeeProfile.id
}/${crypto.randomUUID()}.${extension}`;

const { error: uploadError } = await supabase.storage
.from("employee-photos")
.upload(storagePath, employeePhoto, {
upsert: false,
contentType: employeePhoto.type,
});

if (uploadError) {
throw uploadError;
}

const { error: updateError } = await supabase
.from("employees")
.update({
photo_path: storagePath,
})
.eq("id", selectedEmployeeProfile.id);

if (updateError) {
throw updateError;
}

const updatedEmployee = {
...selectedEmployeeProfile,
photo_path: storagePath,
};

setSelectedEmployeeProfile(updatedEmployee);

setEmployees((current) =>
current.map((emp) =>
emp.id === updatedEmployee.id ? updatedEmployee : emp
)
);

const { data: signedData } = await supabase.storage
.from("employee-photos")
.createSignedUrl(storagePath, 600);

if (signedData?.signedUrl) {
setEmployeePhotoUrl(signedData.signedUrl);
}

setEmployeePhoto(null);
setMessage("Foto del dipendente caricata correttamente. ✅");
} catch (error: any) {
console.error(error);
setMessage(
error?.message || "Errore durante il caricamento della foto."
);
}

setPhotoUploading(false);
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

if (
selectedDocumentType?.expiry &&
!expiryDate
) {
setMessage("Inserisci la data di scadenza del documento.");
return;
}

setSubmitting(true);

try {
const employeeFolder = selectedEmployee;

const safeFileName = file.name
.replace(/[^\w.\- ]/g, "")
.replace(/\s+/g, "_");

const storagePath = `${employeeFolder}/${Date.now()}_${safeFileName}`;

const { error: uploadError } = await supabase.storage
.from("payroll-documents")
.upload(storagePath, file, {
upsert: false,
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
expiry_date: expiryDate || null,
});

if (documentError) {
throw documentError;
}

setMessage("Documento caricato correttamente. ✅");

setSelectedEmployee("");
setDocumentType("payslip");
setMonth(new Date().getMonth() + 1);
setYear(new Date().getFullYear());
setExpiryDate("");
setFile(null);

const input = document.getElementById(
"document-file"
) as HTMLInputElement | null;

if (input) input.value = "";
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento del documento."
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
const found = DOCUMENT_TYPES.find(
(item) => item.value === type
);

if (found) return found.label;

return "Documento";
}

function initials(name: string) {
return name
.split(" ")
.filter(Boolean)
.map((part) => part[0])
.slice(0, 2)
.join("")
.toUpperCase();
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
color: "#062019",
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
background: "#121820",
fontFamily: "Arial, sans-serif",
color: "#f1f5f6",
}}
>
<div
style={{
display: "flex",
minHeight: "100vh",
}}
>
{/* SIDEBAR */}

<aside
style={{
width: 240,
background: "#0b1118",
borderRight: "1px solid #26313a",
padding: 20,
boxSizing: "border-box",
display: "flex",
flexDirection: "column",
}}
>
<div
style={{
padding: "10px 12px 25px",
borderBottom: "1px solid #26313a",
marginBottom: 20,
}}
>
<div
style={{
fontSize: 20,
fontWeight: 900,
color: "#ffffff",
}}
>
BARDOC <span style={{ color: "#16c784" }}>PAY</span>
</div>

<div
style={{
marginTop: 5,
fontSize: 12,
color: "#7f8c94",
}}
>
Area amministratore
</div>
</div>

<button
onClick={() => {
setAdminSection("dashboard");
setSelectedEmployeeProfile(null);
setMessage("");
}}
style={{
width: "100%",
padding: "13px 14px",
marginBottom: 6,
border: "none",
borderRadius: 10,
textAlign: "left",
background:
adminSection === "dashboard"
? "#16c784"
: "transparent",
color:
adminSection === "dashboard"
? "#062019"
: "#aebbc2",
fontWeight: 700,
cursor: "pointer",
}}
>
▣ Dashboard
</button>

<button
onClick={() => {
setAdminSection("employees");
setSelectedEmployeeProfile(null);
setMessage("");
}}
style={{
width: "100%",
padding: "13px 14px",
marginBottom: 6,
border: "none",
borderRadius: 10,
textAlign: "left",
background:
adminSection === "employees"
? "#16c784"
: "transparent",
color:
adminSection === "employees"
? "#062019"
: "#aebbc2",
fontWeight: 700,
cursor: "pointer",
}}
>
👥 Dipendenti
</button>

<button
onClick={() => {
setAdminSection("upload");
setSelectedEmployeeProfile(null);
setMessage("");
}}
style={{
width: "100%",
padding: "13px 14px",
marginBottom: 6,
border: "none",
borderRadius: 10,
textAlign: "left",
background:
adminSection === "upload"
? "#16c784"
: "transparent",
color:
adminSection === "upload"
? "#062019"
: "#aebbc2",
fontWeight: 700,
cursor: "pointer",
}}
>
↑ Carica documento
</button>

<div style={{ flex: 1 }} />

<button
onClick={logout}
style={{
width: "100%",
padding: 12,
border: "1px solid #33414a",
borderRadius: 10,
background: "transparent",
color: "#d8e0e3",
fontWeight: 700,
cursor: "pointer",
}}
>
Esci
</button>
</aside>

{/* CONTENUTO */}

<section
style={{
flex: 1,
padding: 30,
boxSizing: "border-box",
overflowX: "auto",
}}
>
{adminSection === "dashboard" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 22,
padding: 30,
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
Dashboard
</h1>

<p
style={{
margin: 0,
color: "#b8c5cb",
}}
>
Gestione del personale e documentazione BARDOC PAY.
</p>
</div>

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(220px,1fr))",
gap: 18,
}}
>
<div
style={{
background: "#1a232c",
border: "1px solid #29343d",
borderRadius: 18,
padding: 24,
}}
>
<div style={{ color: "#8c9aa2" }}>
Dipendenti attivi
</div>

<div
style={{
fontSize: 36,
fontWeight: 900,
marginTop: 10,
}}
>
{employees.length}
</div>
</div>

<div
style={{
background: "#1a232c",
border: "1px solid #29343d",
borderRadius: 18,
padding: 24,
}}
>
<div style={{ color: "#8c9aa2" }}>
Documenti caricati
</div>

<div
style={{
fontSize: 36,
fontWeight: 900,
marginTop: 10,
}}
>
—
</div>
</div>

<div
style={{
background: "#1a232c",
border: "1px solid #29343d",
borderRadius: 18,
padding: 24,
}}
>
<div style={{ color: "#8c9aa2" }}>
Azioni rapide
</div>

<button
onClick={() =>
setAdminSection("employees")
}
style={{
marginTop: 15,
padding: "11px 15px",
border: "none",
borderRadius: 10,
background: "#16c784",
color: "#062019",
fontWeight: 800,
cursor: "pointer",
}}
>
Cerca dipendente
</button>
</div>
</div>
</>
)}

{adminSection === "employees" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 22,
padding: 30,
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
PERSONALE
</div>

<h1 style={{ margin: "8px 0" }}>
Dipendenti
</h1>

<p
style={{
margin: 0,
color: "#b8c5cb",
}}
>
Cerca e gestisci la scheda personale dei dipendenti.
</p>
</div>

<div
style={{
background: "#1a232c",
border: "1px solid #29343d",
borderRadius: 20,
padding: 25,
}}
>
{!selectedEmployeeProfile ? (
<>
<input
type="text"
placeholder="Cerca nome, email o codice fiscale..."
value={employeeSearch}
onChange={(e) =>
setEmployeeSearch(e.target.value)
}
style={{
width: "100%",
boxSizing: "border-box",
padding: "15px 16px",
borderRadius: 12,
border: "1px solid #394650",
background: "#111920",
color: "#ffffff",
fontSize: 15,
marginBottom: 20,
}}
/>

{adminLoading ? (
<div
style={{
padding: 30,
textAlign: "center",
color: "#8c9aa2",
}}
>
Caricamento dipendenti...
</div>
) : filteredEmployees.length === 0 ? (
<div
style={{
padding: 30,
textAlign: "center",
color: "#8c9aa2",
}}
>
Nessun dipendente trovato.
</div>
) : (
<div
style={{
display: "grid",
gap: 10,
}}
>
{filteredEmployees.map((emp) => (
<button
key={emp.id}
onClick={() =>
openEmployeeProfile(emp)
}
style={{
display: "flex",
alignItems: "center",
gap: 15,
width: "100%",
padding: 16,
border:
"1px solid #2d3942",
borderRadius: 14,
background: "#111920",
color: "#ffffff",
cursor: "pointer",
textAlign: "left",
}}
>
<div
style={{
width: 52,
height: 52,
borderRadius: "50%",
background: "#16c784",
color: "#062019",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontWeight: 900,
fontSize: 18,
flexShrink: 0,
}}
>
{initials(emp.full_name)}
</div>

<div style={{ flex: 1 }}>
<strong
style={{ fontSize: 16 }}
>
{emp.full_name}
</strong>

<div
style={{
color: "#8c9aa2",
fontSize: 13,
marginTop: 4,
}}
>
{emp.email ||
"Email non presente"}
</div>

{emp.fiscal_code && (
<div
style={{
color: "#8c9aa2",
fontSize: 12,
marginTop: 3,
}}
>
CF:{" "}
{emp.fiscal_code}
</div>
)}
</div>

<span
style={{
color: "#16c784",
fontWeight: 800,
fontSize: 12,
}}
>
● ATTIVO
</span>
</button>
))}
</div>
)}
</>
) : (
<>
<button
onClick={() => {
setSelectedEmployeeProfile(null);
setEmployeePhotoUrl("");
setEmployeePhoto(null);
}}
style={{
border: "none",
background: "transparent",
color: "#16c784",
fontWeight: 800,
cursor: "pointer",
marginBottom: 20,
}}
>
← Torna ai dipendenti
</button>

<div
style={{
display: "grid",
gridTemplateColumns:
"260px minmax(0,1fr)",
gap: 24,
}}
>
{/* FOTO */}

<div
style={{
background: "#0b1118",
border:
"1px solid #29343d",
borderRadius: 20,
padding: 24,
textAlign: "center",
}}
>
{employeePhotoUrl ? (
<img
src={employeePhotoUrl}
alt={
selectedEmployeeProfile.full_name
}
style={{
width: 170,
height: 170,
borderRadius: "50%",
objectFit: "cover",
display: "block",
margin:
"0 auto 18px",
border:
"4px solid #16c784",
}}
/>
) : (
<div
style={{
width: 170,
height: 170,
borderRadius: "50%",
background:
"#16c784",
color: "#062019",
display: "flex",
alignItems: "center",
justifyContent:
"center",
margin:
"0 auto 18px",
fontSize: 50,
fontWeight: 900,
}}
>
{initials(
selectedEmployeeProfile.full_name
)}
</div>
)}

<strong
style={{
fontSize: 18,
}}
>
{
selectedEmployeeProfile.full_name
}
</strong>

<div
style={{
color: "#16c784",
fontSize: 13,
fontWeight: 800,
marginTop: 8,
}}
>
● ATTIVO
</div>

<label
style={{
display: "block",
marginTop: 22,
padding: 12,
borderRadius: 10,
background:
"#16c784",
color: "#062019",
fontWeight: 800,
cursor: "pointer",
}}
>
📷 Carica / cambia foto

<input
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={(e) =>
setEmployeePhoto(
e.target.files?.[0] ||
null
)
}
style={{
display: "none",
}}
/>
</label>

{employeePhoto && (
<button
onClick={
uploadEmployeePhoto
}
disabled={
photoUploading
}
style={{
width: "100%",
marginTop: 10,
padding: 11,
border:
"1px solid #16c784",
borderRadius: 10,
background:
"transparent",
color: "#16c784",
fontWeight: 800,
cursor: "pointer",
}}
>
{photoUploading
? "Caricamento..."
: "SALVA FOTO"}
</button>
)}
</div>

{/* DATI */}

<div>
<h2
style={{
marginTop: 0,
}}
>
{
selectedEmployeeProfile.full_name
}
</h2>

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(220px,1fr))",
gap: 14,
}}
>
<div
style={{
padding: 18,
background:
"#111920",
borderRadius: 14,
border:
"1px solid #29343d",
}}
>
<small
style={{
color:
"#8c9aa2",
}}
>
Email
</small>

<div
style={{
fontWeight: 800,
marginTop: 6,
}}
>
{selectedEmployeeProfile.email ||
"—"}
</div>
</div>

<div
style={{
padding: 18,
background:
"#111920",
borderRadius: 14,
border:
"1px solid #29343d",
}}
>
<small
style={{
color:
"#8c9aa2",
}}
>
Codice fiscale
</small>

<div
style={{
fontWeight: 800,
marginTop: 6,
}}
>
{selectedEmployeeProfile.fiscal_code ||
"—"}
</div>
</div>

<div
style={{
padding: 18,
background:
"#111920",
borderRadius: 14,
border:
"1px solid #29343d",
}}
>
<small
style={{
color:
"#8c9aa2",
}}
>
Stato
</small>

<div
style={{
fontWeight: 800,
color:
"#16c784",
marginTop: 6,
}}
>
● Attivo
</div>
</div>
</div>

<h3
style={{
marginTop: 28,
}}
>
📁 Fascicolo digitale
</h3>

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(190px,1fr))",
gap: 12,
}}
>
{[
"🪪 Documenti personali",
"📑 Rapporto di lavoro",
"💰 Buste paga",
"🏦 Distinte di pagamento",
"📝 Permessi e assenze",
"📄 Curriculum",
"🚨 Scadenze",
].map((item) => (
<div
key={item}
style={{
padding: 17,
borderRadius: 13,
background:
"#111920",
border:
"1px solid #29343d",
fontWeight: 700,
}}
>
{item}
</div>
))}
</div>
</div>
</div>

{message && (
<div
style={{
marginTop: 20,
padding: 14,
borderRadius: 12,
background: "#12352b",
color: "#8ff0c9",
textAlign: "center",
}}
>
{message}
</div>
)}
</>
)}
</div>
</>
)}

{adminSection === "upload" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 22,
padding: 30,
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

<p
style={{
margin: 0,
color: "#b8c5cb",
}}
>
Pubblica documenti e documentazione del personale.
</p>
</div>

<div
style={{
background: "#1a232c",
border:
"1px solid #29343d",
borderRadius: 20,
padding: 28,
}}
>
<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(auto-fit,minmax(250px,1fr))",
gap: 18,
}}
>
{/* DIPENDENTE */}

<div>
<label>Dipendente</label>

<select
value={selectedEmployee}
onChange={(e) =>
setSelectedEmployee(
e.target.value
)
}
style={{
width: "100%",
padding: 14,
marginTop: 7,
borderRadius: 10,
border:
"1px solid #394650",
background:
"#111920",
color: "#ffffff",
}}
>
<option value="">
