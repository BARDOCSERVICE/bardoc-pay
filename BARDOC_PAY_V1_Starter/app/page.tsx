"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

/* =========================================================
TIPI
========================================================= */

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
month: number | null;
year: number;
file_name: string;
storage_path: string;
tax_code: string | null;
expiry_date: string | null;
};

type Communication = {
id: string;
employee_id: string | null;
title: string;
message: string;
is_general: boolean;
created_at: string;
};

/* =========================================================
CONFIGURAZIONE
========================================================= */

const ADMIN_EMAIL = "bardocfg@gmail.com";

const CURRENT_YEAR = new Date().getFullYear();

const YEARS = Array.from(
{ length: 8 },
(_, i) => CURRENT_YEAR - 5 + i
);

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

const DOCUMENT_TYPES = {
retribuzione: [
{
value: "payslip",
label: "Busta paga",
},
{
value: "payment_statement",
label: "Distinta di pagamento",
},
],

lavoro: [
{
value: "work_contract",
label: "Contratto di lavoro",
},
],

permessi: [
{
value: "leave_permit",
label: "Foglio permesso / assenza",
},
],

personali: [
{
value: "id_card",
label: "Documento d'identità",
},
{
value: "driver_license",
label: "Patente",
},
],

curriculum: [
{
value: "curriculum",
label: "Curriculum / CV storico",
},
],
};

const CATEGORY_LABELS: Record<string, string> = {
retribuzione: "Retribuzione",
lavoro: "Rapporto di lavoro",
permessi: "Permessi e assenze",
personali: "Documenti personali",
curriculum: "Curriculum",
};

/* =========================================================
FUNZIONI
========================================================= */

function documentLabel(type: string) {
const all = Object.values(DOCUMENT_TYPES).flat();

return (
all.find((item) => item.value === type)?.label ||
type
);
}

function formatDate(date: string | null) {
if (!date) return "—";

const parts = date.split("-");

if (parts.length !== 3) {
return date;
}

return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function daysUntil(date: string) {
const today = new Date();

today.setHours(0, 0, 0, 0);

const expiry = new Date(`${date}T00:00:00`);

return Math.ceil(
(expiry.getTime() - today.getTime()) /
86400000
);
}

function expiryStatus(
date: string | null
) {
if (!date) return "none";

const days = daysUntil(date);

if (days < 0) {
return "expired";
}

if (days <= 30) {
return "warning";
}

return "valid";
}

function formatCommunicationDate(
value: string
) {
const date = new Date(value);

return date.toLocaleString("it-IT", {
day: "2-digit",
month: "2-digit",
year: "numeric",
hour: "2-digit",
minute: "2-digit",
});
}

/* =========================================================
STILI
========================================================= */

const darkInput: React.CSSProperties = {
width: "100%",
boxSizing: "border-box",
padding: "13px 14px",
borderRadius: 10,
border: "1px solid #344955",
background: "#101e28",
color: "#fff",
fontSize: 14,
outline: "none",
};

const darkSelect: React.CSSProperties = {
width: "100%",
padding: 13,
borderRadius: 9,
border: "1px solid #344955",
background: "#101e28",
color: "#fff",
boxSizing: "border-box",
fontSize: 14,
};

const greenButton: React.CSSProperties = {
width: "100%",
padding: 14,
border: "none",
borderRadius: 10,
background: "#16c784",
color: "#062019",
fontWeight: 900,
cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
padding: "11px 16px",
border: "1px solid #344955",
borderRadius: 9,
background: "#13222c",
color: "#dce6e9",
fontWeight: 700,
cursor: "pointer",
};

/* =========================================================
HOME
========================================================= */

export default function Home() {
const [session, setSession] =
useState<any>(null);

const [loading, setLoading] =
useState(true);

const [email, setEmail] =
useState("");

const [password, setPassword] =
useState("");

const [loginMode, setLoginMode] =
useState(true);

const [message, setMessage] =
useState("");

const [submitting, setSubmitting] =
useState(false);

const [employee, setEmployee] =
useState<Employee | null>(null);

const [employees, setEmployees] =
useState<Employee[]>([]);

const [documents, setDocuments] =
useState<Document[]>([]);

const [allDocuments, setAllDocuments] =
useState<Document[]>([]);

const [communications, setCommunications] =
useState<Communication[]>([]);

const [adminCommunications, setAdminCommunications] =
useState<Communication[]>([]);

const [adminLoading, setAdminLoading] =
useState(false);

const [activeSection, setActiveSection] =
useState("dashboard");

const [search, setSearch] =
useState("");

const [selectedEmployee, setSelectedEmployee] =
useState("");

const [category, setCategory] =
useState("retribuzione");

const [documentType, setDocumentType] =
useState("payslip");

const [month, setMonth] =
useState(new Date().getMonth() + 1);

const [year, setYear] =
useState(CURRENT_YEAR);

const [taxCode, setTaxCode] =
useState("");

const [expiryDate, setExpiryDate] =
useState("");

const [file, setFile] =
useState<File | null>(null);

const [communicationMode, setCommunicationMode] =
useState<"individual" | "general">(
"individual"
);

const [communicationEmployee, setCommunicationEmployee] =
useState("");

const [communicationTitle, setCommunicationTitle] =
useState("");

const [communicationMessage, setCommunicationMessage] =
useState("");

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

/* =====================================================
SESSIONE
===================================================== */

useEffect(() => {
supabase.auth
.getSession()
.then(({ data }) => {
setSession(data.session);
setLoading(false);
});

const {
data: { subscription },
} =
supabase.auth.onAuthStateChange(
(_event, newSession) => {
setSession(newSession);
setLoading(false);
}
);

return () =>
subscription.unsubscribe();
}, []);

/* =====================================================
CARICAMENTO AREA
===================================================== */

useEffect(() => {
if (!session) return;

if (isAdmin) {
loadAdminData();
} else {
loadEmployeeArea();
}
}, [session, isAdmin]);

/* =====================================================
LOGIN
===================================================== */

async function handleSubmit(
e: React.FormEvent
) {
e.preventDefault();

setMessage("");
setSubmitting(true);

if (loginMode) {
const { error } =
await supabase.auth.signInWithPassword({
email,
password,
});

if (error) {
setMessage(
"Email o password non corretti."
);
}
} else {
const { error } =
await supabase.auth.signUp({
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

/* =====================================================
LOGOUT
===================================================== */

async function logout() {
await supabase.auth.signOut();

setSession(null);
setEmployee(null);
setDocuments([]);
setEmployees([]);
setAllDocuments([]);
setCommunications([]);
setAdminCommunications([]);

setEmail("");
setPassword("");
}

/* =====================================================
AREA DIPENDENTE
===================================================== */

async function loadEmployeeArea() {
if (!session?.user?.id) {
return;
}

const { data: emp, error: empError } =
await supabase
.from("employees")
.select("*")
.eq(
"auth_user_id",
session.user.id
)
.maybeSingle();

if (empError) {
console.error(empError);
return;
}

setEmployee(emp);

if (!emp) {
return;
}

const { data: docs } =
await supabase
.from("documents")
.select("*")
.eq("employee_id", emp.id)
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

setDocuments(docs || []);

/*
* SUPABASE RLS farà vedere:
* - comunicazioni generali
* - comunicazioni personali del dipendente
*/

const {
data: comms,
error: commError,
} = await supabase
.from("communications")
.select("*")
.order("created_at", {
ascending: false,
});

if (commError) {
console.error(commError);
return;
}

setCommunications(
comms || []
);
}

/* =====================================================
AREA ADMIN
===================================================== */

async function loadAdminData() {
setAdminLoading(true);

const {
data: employeeData,
error: employeeError,
} = await supabase
.from("employees")
.select("*")
.eq("active", true)
.order("full_name");

if (employeeError) {
console.error(employeeError);

setMessage(
"Impossibile caricare i dipendenti."
);
} else {
setEmployees(
employeeData || []
);
}

const { data: docs } =
await supabase
.from("documents")
.select("*")
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

setAllDocuments(
docs || []
);

const {
data: comms,
error: commError,
} =
await supabase
.from("communications")
.select("*")
.order("created_at", {
ascending: false,
});

if (commError) {
console.error(commError);
} else {
setAdminCommunications(
comms || []
);
}

setAdminLoading(false);
}

/* =====================================================
RESET DOCUMENTO
===================================================== */

function resetDocumentForm() {
setSelectedEmployee("");
setCategory("retribuzione");
setDocumentType("payslip");
setMonth(
new Date().getMonth() + 1
);
setYear(CURRENT_YEAR);
setTaxCode("");
setExpiryDate("");
setFile(null);

const input =
document.getElementById(
"document-file"
) as HTMLInputElement | null;

if (input) {
input.value = "";
}
}

/* =====================================================
UPLOAD DOCUMENTO
===================================================== */

async function uploadDocument() {
setMessage("");

if (!selectedEmployee) {
setMessage(
"Seleziona un dipendente."
);
return;
}

if (!file) {
setMessage(
"Seleziona un file PDF."
);
return;
}

if (
file.type !==
"application/pdf"
) {
setMessage(
"Il documento deve essere un PDF."
);
return;
}

const normalizedTaxCode =
taxCode
.trim()
.toUpperCase();

if (
normalizedTaxCode &&
!/^[A-Z0-9]{16}$/.test(
normalizedTaxCode
)
) {
setMessage(
"Il Codice Fiscale deve contenere 16 caratteri alfanumerici."
);
return;
}

const requiresTaxCode =
documentType ===
"driver_license";

const allowsExpiry =
documentType ===
"id_card" ||
documentType ===
"driver_license";

if (
requiresTaxCode &&
!normalizedTaxCode
) {
setMessage(
"Per la patente il Codice Fiscale è obbligatorio."
);
return;
}

if (
allowsExpiry &&
!expiryDate
) {
setMessage(
"Inserisci la data di scadenza."
);
return;
}

setSubmitting(true);

try {
const safeFileName =
file.name
.replace(
/[^\w.\- ]/g,
""
)
.replace(
/\s+/g,
"_"
);

const storagePath =
`${selectedEmployee}/${Date.now()}_${safeFileName}`;

const {
error: uploadError,
} =
await supabase.storage
.from(
"payroll-documents"
)
.upload(
storagePath,
file,
{
upsert: false,
contentType:
"application/pdf",
}
);

if (uploadError) {
throw uploadError;
}

const isPayroll =
documentType ===
"payslip" ||
documentType ===
"payment_statement";

const {
error: documentError,
} =
await supabase
.from("documents")
.insert({
employee_id:
selectedEmployee,

document_type:
documentType,

month: isPayroll
? month
: null,

year,

file_name:
file.name,

storage_path:
storagePath,

tax_code:
normalizedTaxCode ||
null,

expiry_date:
expiryDate ||
null,
});

if (documentError) {
throw documentError;
}

setMessage(
"Documento caricato correttamente. ✅"
);

resetDocumentForm();

await loadAdminData();
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento del documento."
);
}

setSubmitting(false);
}

/* =====================================================
APRI DOCUMENTO
===================================================== */

async function openDocument(
doc: Document
) {
const {
data,
error,
} =
await supabase.storage
.from(
"payroll-documents"
)
.createSignedUrl(
doc.storage_path,
300
);

if (error) {
console.error(error);

setMessage(
"Impossibile aprire il documento."
);

return;
}

if (data?.signedUrl) {
window.open(
data.signedUrl,
"_blank"
);
}
}

/* =====================================================
INVIA COMUNICAZIONE
===================================================== */

async function sendCommunication() {
setMessage("");

const title =
communicationTitle.trim();

const text =
communicationMessage.trim();

if (!title) {
setMessage(
"Inserisci il titolo della comunicazione."
);
return;
}

if (!text) {
setMessage(
"Inserisci il testo della comunicazione."
);
return;
}

if (
communicationMode ===
"individual" &&
!communicationEmployee
) {
setMessage(
"Seleziona il dipendente destinatario."
);
return;
}

setSubmitting(true);

try {
const {
error,
} =
await supabase
.from(
"communications"
)
.insert({
employee_id:
communicationMode ===
"individual"
? communicationEmployee
: null,

title,

message: text,

is_general:
communicationMode ===
"general",
});

if (error) {
throw error;
}

setCommunicationTitle(
""
);

setCommunicationMessage(
""
);

setCommunicationEmployee(
""
);

setMessage(
communicationMode ===
"general"
? "Comunicazione generale inviata a tutti i dipendenti. ✅"
: "Comunicazione inviata al dipendente selezionato. ✅"
);

await loadAdminData();
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante l'invio della comunicazione."
);
}

setSubmitting(false);
}

/* =====================================================
FILTRO DIPENDENTI
===================================================== */

const filteredEmployees =
useMemo(() => {
const q =
search
.trim()
.toLowerCase();

if (!q) {
return employees;
}

const employeeIdsByTaxCode =
new Set(
allDocuments
.filter((doc) =>
(
doc.tax_code ||
""
)
.toLowerCase()
.includes(q)
)
.map(
(doc) =>
doc.employee_id
)
);

return employees.filter(
(emp) =>
emp.full_name
.toLowerCase()
.includes(q) ||
(
emp.email || ""
)
.toLowerCase()
.includes(q) ||
employeeIdsByTaxCode.has(
emp.id
)
);
}, [
search,
employees,
allDocuments,
]);

/* =====================================================
PAGAMENTI
===================================================== */

const payslips =
useMemo(
() =>
allDocuments.filter(
(doc) =>
doc.document_type ===
"payslip"
),
[allDocuments]
);

const paymentStatements =
useMemo(
() =>
allDocuments.filter(
(doc) =>
doc.document_type ===
"payment_statement"
),
[allDocuments]
);

/* =====================================================
SCADENZE
===================================================== */

const expiringDocuments =
useMemo(() => {
return allDocuments
.map((doc) => ({
doc,
employee:
employees.find(
(emp) =>
emp.id ===
doc.employee_id
),
}))
.filter(
({ doc }) =>
expiryStatus(
doc.expiry_date
) === "warning"
);
}, [
allDocuments,
employees,
]);

const expiredDocuments =
useMemo(() => {
return allDocuments
.map((doc) => ({
doc,
employee:
employees.find(
(emp) =>
emp.id ===
doc.employee_id
),
}))
.filter(
({ doc }) =>
expiryStatus(
doc.expiry_date
) === "expired"
);
}, [
allDocuments,
employees,
]);

/* =====================================================
LOADING
===================================================== */

if (loading) {
return (
<div
style={{
minHeight:
"100vh",
background:
"#081521",
color: "#fff",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
fontFamily:
"Arial, sans-serif",
}}
>
<div
style={{
textAlign:
"center",
}}
>
<div
style={{
width: 78,
height: 78,
borderRadius: 22,
background:
"#16c784",
color:
"#062019",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 45,
fontWeight: 900,
margin:
"0 auto 18px",
boxShadow:
"0 0 40px rgba(22,199,132,.25)",
}}
>
B
</div>

<div
style={{
color:
"#b8c5cb",
fontSize: 15,
}}
>
Caricamento BARDOC PAY...
</div>
</div>
</div>
);
}

/* =====================================================
LOGIN
===================================================== */

if (!session) {
return (
<main
style={{
minHeight:
"100vh",
background:
"linear-gradient(135deg,#050b12,#0d202c,#07141f)",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
padding: 24,
fontFamily:
"Arial, sans-serif",
}}
>
<div
style={{
width:
"100%",
maxWidth: 450,
background:
"#111e28",
border:
"1px solid #2a3b47",
borderRadius:
26,
padding:
40,
boxShadow:
"0 30px 90px rgba(0,0,0,.45)",
color:
"#fff",
}}
>
<div
style={{
textAlign:
"center",
}}
>
<div
style={{
width: 100,
height: 100,
margin:
"0 auto 18px",
borderRadius:
26,
background:
"linear-gradient(135deg,#16c784,#61f3c1)",
color:
"#062019",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 58,
fontWeight: 900,
boxShadow:
"0 0 45px rgba(22,199,132,.25)",
}}
>
B
</div>

<div
style={{
color:
"#16c784",
fontWeight:
900,
letterSpacing:
2,
fontSize: 13,
}}
>
BARDOC SERVICE
</div>

<h1
style={{
margin:
"8px 0 5px",
fontSize:
30,
}}
>
BARDOC PAY
</h1>

<p
style={{
color:
"#9daab2",
margin:
"0 0 28px",
fontSize:
14,
}}
>
Portale digitale del personale
</p>
</div>

<form
onSubmit={
handleSubmit
}
style={{
display:
"flex",
flexDirection:
"column",
gap: 14,
}}
>
<input
type="email"
placeholder="Email"
value={
email
}
onChange={(e) =>
setEmail(
e.target.value
)
}
required
style={
darkInput
}
/>

<input
type="password"
placeholder="Password"
value={
password
}
onChange={(e) =>
setPassword(
e.target.value
)
}
required
style={
darkInput
}
/>

<button
type="submit"
disabled={
submitting
}
style={{
...greenButton,
opacity:
submitting
? 0.6
: 1,
}}
>
{submitting
? "ATTENDERE..."
: loginMode
? "ACCEDI AL PORTALE"
: "CREA ACCOUNT"}
</button>
</form>

<button
type="button"
onClick={() => {
setLoginMode(
!loginMode
);
setMessage("");
}}
style={{
width:
"100%",
marginTop:
20,
border:
"none",
background:
"transparent",
color:
"#16c784",
fontWeight:
700,
cursor:
"pointer",
}}
>
{loginMode
? "Non hai ancora un account? Registrati"
: "Hai già un account? Accedi"}
</button>

{message && (
<div
style={{
marginTop:
18,
padding:
13,
borderRadius:
10,
background:
"#213742",
color:
"#d8e5e8",
textAlign:
"center",
fontSize:
13,
}}
>
{message}
</div>
)}
</div>
</main>
);
}

/* =====================================================
AREA ADMIN
===================================================== */

if (isAdmin) {
return (
<AdminDashboard
activeSection={
activeSection
}
setActiveSection={
setActiveSection
}
employees={
filteredEmployees
}
allEmployees={
employees
}
documents={
allDocuments
}
payslips={
payslips
}
paymentStatements={
paymentStatements
}
communications={
adminCommunications
}
search={
search
}
setSearch={
setSearch
}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
category={
category
}
setCategory={(value) => {
setCategory(value);

const first =
(
DOCUMENT_TYPES as any
)[value]?.[0];

setDocumentType(
first?.value ||
"payslip"
);

setTaxCode("");
setExpiryDate("");
}}
documentType={
documentType
}
setDocumentType={
(value) => {
setDocumentType(
value
);

setTaxCode("");
setExpiryDate("");
}
}
month={
month
}
setMonth={
setMonth
}
year={
year
}
setYear={
setYear
}
taxCode={
taxCode
}
setTaxCode={
setTaxCode
}
expiryDate={
expiryDate
}
setExpiryDate={
setExpiryDate
}
file={
file
}
setFile={
setFile
}
submitting={
submitting
}
message={
message
}
uploadDocument={
uploadDocument
}
openDocument={
openDocument
}
logout={
logout
}
adminLoading={
adminLoading
}
expiringDocuments={
expiringDocuments
}
expiredDocuments={
expiredDocuments
}
communicationMode={
communicationMode
}
setCommunicationMode={
setCommunicationMode
}
communicationEmployee={
communicationEmployee
}
setCommunicationEmployee={
setCommunicationEmployee
}
communicationTitle={
communicationTitle
}
setCommunicationTitle={
setCommunicationTitle
}
communicationMessage={
communicationMessage
}
setCommunicationMessage={
setCommunicationMessage
}
sendCommunication={
sendCommunication
}
/>
);
}

/* =====================================================
AREA DIPENDENTE
===================================================== */

return (
<EmployeeArea
employee={
employee
}
documents={
documents
}
communications={
communications
}
openDocument={
openDocument
}
logout={
logout
}
session={
session
}
/>
);
}

/* =========================================================
ADMIN DASHBOARD
========================================================= */

function AdminDashboard({
activeSection,
setActiveSection,
employees,
allEmployees,
documents,
payslips,
paymentStatements,
communications,
search,
setSearch,
selectedEmployee,
setSelectedEmployee,
category,
setCategory,
documentType,
setDocumentType,
month,
setMonth,
year,
setYear,
taxCode,
setTaxCode,
expiryDate,
setExpiryDate,
file,
setFile,
submitting,
message,
uploadDocument,
openDocument,
logout,
adminLoading,
expiringDocuments,
expiredDocuments,
communicationMode,
setCommunicationMode,
communicationEmployee,
setCommunicationEmployee,
communicationTitle,
setCommunicationTitle,
communicationMessage,
setCommunicationMessage,
sendCommunication,
}: any) {
const isPayroll =
category ===
"retribuzione";

const isPersonal =
category ===
"personali";

const requiresTaxCode =
documentType ===
"driver_license";

const allowsExpiry =
documentType ===
"id_card" ||
documentType ===
"driver_license";

return (
<main
style={{
minHeight:
"100vh",
background:
"#0d1922",
color:
"#e9f0f2",
fontFamily:
"Arial, sans-serif",
display:
"flex",
}}
>
{/* =================================================
SIDEBAR
================================================= */}

<aside
style={{
width:
245,
background:
"#08141d",
borderRight:
"1px solid #20313b",
padding:
20,
boxSizing:
"border-box",
minHeight:
"100vh",
flexShrink:
0,
}}
>
<div
style={{
fontSize:
20,
fontWeight:
900,
}}
>
BARDOC{" "}
<span
style={{
color:
"#16c784",
}}
>
PAY
</span>
</div>

<div
style={{
color:
"#16c784",
fontSize:
11,
fontWeight:
800,
marginTop:
4,
marginBottom:
28,
}}
>
AMMINISTRAZIONE
</div>

<SidebarButton
active={
activeSection ===
"dashboard"
}
onClick={() =>
setActiveSection(
"dashboard"
)
}
>
🏠 Dashboard
</SidebarButton>

<SidebarButton
active={
activeSection ===
"employees"
}
onClick={() =>
setActiveSection(
"employees"
)
}
>
👥 Dipendenti
</SidebarButton>

<SidebarButton
active={
activeSection ===
"payments"
}
onClick={() =>
setActiveSection(
"payments"
)
}
>
💰 Gestione pagamenti
</SidebarButton>

<SidebarButton
active={
activeSection ===
"documents"
}
onClick={() =>
setActiveSection(
"documents"
)
}
>
📁 Documenti
</SidebarButton>

<SidebarButton
active={
activeSection ===
"communications"
}
onClick={() =>
setActiveSection(
"communications"
)
}
>
💬 Comunicazioni
</SidebarButton>

<SidebarButton
active={
activeSection ===
"deadlines"
}
onClick={() =>
setActiveSection(
"deadlines"
)
}
>
⚠️ Scadenze
</SidebarButton>

<div
style={{
height:
1,
background:
"#20313b",
margin:
"25px 0",
}}
/>

<div
style={{
color:
"#73838c",
fontSize:
12,
}}
>
<span
style={{
color:
"#16c784",
}}
>
●
</span>{" "}
Sistema operativo
</div>

<button
onClick={
logout
}
style={{
...secondaryButton,
width:
"100%",
marginTop:
20,
}}
>
Esci
</button>
</aside>

{/* =================================================
CONTENUTO
================================================= */}

<section
style={{
flex:
1,
padding:
28,
boxSizing:
"border-box",
overflow:
"auto",
}}
>
{/* ===============================================
HEADER
=============================================== */}

<header
style={{
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
marginBottom:
24,
gap:
20,
}}
>
<div>
<h1
style={{
margin:
0,
fontSize:
27,
}}
>
{activeSection ===
"dashboard"
? "Dashboard"
: activeSection ===
"employees"
? "Dipendenti"
: activeSection ===
"payments"
? "Gestione pagamenti"
: activeSection ===
"documents"
? "Documenti"
: activeSection ===
"communications"
? "Comunicazioni"
: "Scadenze"}
</h1>

<div
style={{
color:
"#82919a",
marginTop:
5,
fontSize:
13,
}}
>
Gestione del personale BARDOC SERVICE
</div>
</div>
</header>

{/* =================================================
DASHBOARD
================================================= */}

{activeSection ===
"dashboard" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
20,
padding:
28,
marginBottom:
20,
border:
"1px solid #263b47",
}}
>
<div
style={{
color:
"#16c784",
fontSize:
12,
fontWeight:
900,
}}
>
AMMINISTRAZIONE
</div>

<h2
style={{
margin:
"8px 0",
fontSize:
29,
}}
>
Benvenuto in BARDOC PAY
</h2>

<p
style={{
color:
"#a9b8c0",
margin:
0,
}}
>
Da qui puoi gestire dipendenti,
pagamenti, documenti,
comunicazioni e scadenze.
</p>
</div>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(4,minmax(0,1fr))",
gap:
14,
marginBottom:
20,
}}
>
<Stat
title="Dipendenti attivi"
value={
allEmployees.length
}
/>

<Stat
title="Documenti"
value={
documents.length
}
/>

<Stat
title="Buste paga"
value={
payslips.length
}
/>

<Stat
title="Comunicazioni"
value={
communications.length
}
/>
</div>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(0,1fr))",
gap:
16,
}}
>
<QuickCard
title="Gestione pagamenti"
description="Carica e consulta buste paga e distinte di pagamento."
button="Apri gestione pagamenti"
onClick={() =>
setActiveSection(
"payments"
)
}
/>

<QuickCard
title="Documenti"
description="Gestisci documenti anagrafici e rapporto contrattuale."
button="Apri documenti"
onClick={() =>
setActiveSection(
"documents"
)
}
/>

<QuickCard
title="Comunicazioni"
description="Invia messaggi individuali oppure comunicazioni generali."
button="Apri comunicazioni"
onClick={() =>
setActiveSection(
"communications"
)
}
/>

<QuickCard
title="Scadenze"
description="Controlla documenti in scadenza e già scaduti."
button="Controlla scadenze"
onClick={() =>
setActiveSection(
"deadlines"
)
}
/>
</div>
</>
)}

{/* =================================================
DIPENDENTI
================================================= */}

{activeSection ===
"employees" && (
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
}}
>
<div
style={{
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
gap:
15,
marginBottom:
18,
}}
>
<div>
<h2
style={{
margin:
0,
}}
>
Gestione dipendenti
</h2>

<div
style={{
color:
"#82919a",
fontSize:
13,
marginTop:
5,
}}
>
Cerca per nome, email o codice fiscale.
</div>
</div>

<input
value={
search
}
onChange={(e) =>
setSearch(
e.target.value
)
}
placeholder="Cerca dipendente..."
style={{
...darkInput,
maxWidth:
360,
}}
/>
</div>

{adminLoading ? (
<div
style={{
color:
"#8999a2",
}}
>
Caricamento...
</div>
) : (
employees.map(
(
emp: Employee
) => {
const employeeDocs =
documents.filter(
(
doc: Document
) =>
doc.employee_id ===
emp.id
);

return (
<div
key={
emp.id
}
style={{
borderTop:
"1px solid #263841",
padding:
"15px 0",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
}}
>
<div>
<strong>
{
emp.full_name
}
</strong>

<div
style={{
color:
"#778993",
fontSize:
12,
marginTop:
4,
}}
>
{emp.email ||
"Nessuna email"}
</div>
</div>

<span
style={{
color:
"#16c784",
fontSize:
12,
fontWeight:
800,
}}
>
{
employeeDocs.length
}{" "}
documenti
</span>
</div>
);
}
)
)}
</div>
)}

{/* =================================================
GESTIONE PAGAMENTI
================================================= */}

{activeSection ===
"payments" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
18,
padding:
24,
marginBottom:
18,
}}
>
<h2
style={{
margin:
"0 0 7px",
}}
>
Gestione pagamenti
</h2>

<p
style={{
margin:
0,
color:
"#a9b8c0",
}}
>
Gestisci buste paga e distinte di pagamento
dei dipendenti.
</p>
</div>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(0,1fr))",
gap:
16,
marginBottom:
20,
}}
>
<Stat
title="Buste paga"
value={
payslips.length
}
/>

<Stat
title="Distinte di pagamento"
value={
paymentStatements.length
}
/>
</div>

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
24,
}}
>
<h3
style={{
marginTop:
0,
}}
>
Carica documento di pagamento
</h3>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap:
16,
}}
>
<Field
label="Dipendente"
>
<select
value={
selectedEmployee
}
onChange={(e) =>
setSelectedEmployee(
e.target.value
)
}
style={
darkSelect
}
>
<option value="">
Seleziona dipendente
</option>

{allEmployees.map(
(
emp: Employee
) => (
<option
key={
emp.id
}
value={
emp.id
}
>
{
emp.full_name
}
</option>
)
)}
</select>
</Field>

<Field
label="Tipo"
>
<select
value={
documentType ===
"payment_statement"
? "payment_statement"
: "payslip"
}
onChange={(e) =>
setDocumentType(
e.target.value
)
}
style={
darkSelect
}
>
<option value="payslip">
Busta paga
</option>

<option value="payment_statement">
Distinta di pagamento
</option>
</select>
</Field>

<Field
label="Anno"
>
<select
value={
year
}
onChange={(e) =>
setYear(
Number(
e.target.value
)
)
}
style={
darkSelect
}
>
{YEARS.map(
(y) => (
<option
key={
y
}
value={
y
}
>
{y}
</option>
)
)}
</select>
</Field>

<Field
label="Mese"
>
<select
value={
month
}
onChange={(e) =>
setMonth(
Number(
e.target.value
)
)
}
style={
darkSelect
}
>
{MONTHS.map(
(
name,
index
) => (
<option
key={
name
}
value={
index +
1
}
>
{name}
</option>
)
)}
</select>
</Field>
</div>

<Field
label="PDF"
>
<input
id="document-file"
type="file"
accept="application/pdf,.pdf"
onChange={(e) =>
setFile(
e.target.files?.[0] ||
null
)
}
style={{
width:
"100%",
color:
"#cbd6da",
}}
/>
</Field>

<button
onClick={
uploadDocument
}
disabled={
submitting
}
style={{
...greenButton,
marginTop:
20,
}}
>
{submitting
? "CARICAMENTO..."
: "CARICA DOCUMENTO"}
</button>

{message && (
<Message
text={
message
}
/>
)}
</div>

<DocumentList
title="Buste paga caricate"
documents={
payslips
}
employees={
allEmployees
}
openDocument={
openDocument
}
/>

<DocumentList
title="Distinte di pagamento caricate"
documents={
paymentStatements
}
employees={
allEmployees
}
openDocument={
openDocument
}
/>
</>
)}

{/* =================================================
DOCUMENTI
================================================= */}

{activeSection ===
"documents" && (
<>
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
24,
}}
>
<h2
style={{
margin:
"0 0 6px",
}}
>
Carica documento
</h2>

<p
style={{
margin:
"0 0 10px",
color:
"#82919a",
fontSize:
13,
}}
>
Caricamento documenti anagrafici,
contrattuali, permessi e curriculum.
</p>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap:
16,
}}
>
<Field
label="Dipendente"
>
<select
value={
selectedEmployee
}
onChange={(e) =>
setSelectedEmployee(
e.target.value
)
}
style={
darkSelect
}
>
<option value="">
Seleziona dipendente
</option>

{allEmployees.map(
(
emp: Employee
) => (
<option
key={
emp.id
}
value={
emp.id
}
>
{
emp.full_name
}
</option>
)
)}
</select>
</Field>

<Field
label="Categoria"
>
<select
value={
category
}
onChange={(e) =>
setCategory(
e.target.value
)
}
style={
darkSelect
}
>
{Object.entries(
CATEGORY_LABELS
).map(
([
value,
label,
]) => (
<option
key={
value
}
value={
value
}
>
{label}
</option>
)
)}
</select>
</Field>

<Field
label="Tipo documento"
>
<select
value={
documentType
}
onChange={(e) =>
setDocumentType(
e.target.value
)
}
style={
darkSelect
}
>
{(
(
DOCUMENT_TYPES as any
)[category] ||
[]
).map(
(
item: any
) => (
<option
key={
item.value
}
value={
item.value
}
>
{
item.label
}
</option>
)
)}
</select>
</Field>

<Field
label="Anno"
>
<select
value={
year
}
onChange={(e) =>
setYear(
Number(
e.target.value
)
)
}
style={
darkSelect
}
>
{YEARS.map(
(y) => (
<option
key={
y
}
value={
y
}
>
{y}
</option>
)
)}
</select>
</Field>

{isPersonal && (
<Field
label={
requiresTaxCode
? "Codice Fiscale *"
: "Codice Fiscale"
}
>
<input
value={
taxCode
}
onChange={(e) =>
setTaxCode(
e.target.value
.toUpperCase()
)
}
maxLength={
16
}
placeholder="16 caratteri alfanumerici"
style={
darkInput
}
/>

<small
style={{
color:
"#71828c",
display:
"block",
marginTop:
6,
}}
>
{requiresTaxCode
? "Obbligatorio per la patente."
: "Facoltativo per il documento d'identità."}
</small>
</Field>
)}

{allowsExpiry && (
<Field
label="Data di scadenza"
>
<input
type="date"
value={
expiryDate
}
onChange={(e) =>
setExpiryDate(
e.target.value
)
}
style={
darkInput
}
/>
</Field>
)}
</div>

<Field
label="Documento PDF"
>
<input
id="document-file"
type="file"
accept="application/pdf,.pdf"
onChange={(e) =>
setFile(
e.target.files?.[0] ||
null
)
}
style={{
width:
"100%",
color:
"#cbd6da",
}}
/>
</Field>

<button
onClick={
uploadDocument
}
disabled={
submitting
}
style={{
...greenButton,
marginTop:
20,
}}
>
{submitting
? "CARICAMENTO..."
: "CARICA DOCUMENTO"}
</button>

{message && (
<Message
text={
message
}
/>
)}
</div>
</>
)}

{/* =================================================
COMUNICAZIONI
================================================= */}

{activeSection ===
"communications" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
18,
padding:
24,
marginBottom:
18,
}}
>
<div
style={{
color:
"#16c784",
fontSize:
12,
fontWeight:
900,
}}
>
COMUNICAZIONI
</div>

<h2
style={{
margin:
"8px 0",
}}
>
Comunicazioni al personale
</h2>

<p
style={{
margin:
0,
color:
"#a9b8c0",
}}
>
Invia comunicazioni private a un dipendente
oppure messaggi generali a tutto il personale.
</p>
</div>

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
24,
marginBottom:
20,
}}
>
<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap:
12,
marginBottom:
20,
}}
>
<button
onClick={() =>
setCommunicationMode(
"individual"
)
}
style={{
padding:
15,
borderRadius:
10,
border:
communicationMode ===
"individual"
? "2px solid #16c784"
: "1px solid #344955",
background:
communicationMode ===
"individual"
? "#12342d"
: "#101e28",
color:
"#fff",
fontWeight:
800,
cursor:
"pointer",
}}
>
👤 Comunicazione individuale
</button>

<button
onClick={() =>
setCommunicationMode(
"general"
)
}
style={{
padding:
15,
borderRadius:
10,
border:
communicationMode ===
"general"
? "2px solid #16c784"
: "1px solid #344955",
background:
communicationMode ===
"general"
? "#12342d"
: "#101e28",
color:
"#fff",
fontWeight:
800,
cursor:
"pointer",
}}
>
📢 Comunicazione generale
</button>
</div>

{communicationMode ===
"individual" && (
<Field
label="Dipendente destinatario"
>
<select
value={
communicationEmployee
}
onChange={(e) =>
setCommunicationEmployee(
e.target.value
)
}
style={
darkSelect
}
>
<option value="">
Seleziona dipendente
</option>

{allEmployees.map(
(
emp: Employee
) => (
<option
key={
emp.id
}
value={
emp.id
}
>
{
emp.full_name
}
</option>
)
)}
</select>
</Field>
)}

{communicationMode ===
"general" && (
<div
style={{
padding:
14,
borderRadius:
10,
background:
"#263a43",
color:
"#c7d5da",
marginBottom:
17,
fontSize:
13,
}}
>
📢 Questa comunicazione sarà visibile
a tutti i dipendenti.
</div>
)}

<Field
label="Titolo"
>
<input
value={
communicationTitle
}
onChange={(e) =>
setCommunicationTitle(
e.target.value
)
}
placeholder="Es. Comunicazione importante"
style={
darkInput
}
/>
</Field>

<Field
label="Messaggio"
>
<textarea
value={
communicationMessage
}
onChange={(e) =>
setCommunicationMessage(
e.target.value
)
}
placeholder="Scrivi qui la comunicazione..."
rows={
7
}
style={{
...darkInput,
resize:
"vertical",
fontFamily:
"Arial, sans-serif",
}}
/>
</Field>

<button
onClick={
sendCommunication
}
disabled={
submitting
}
style={{
...greenButton,
marginTop:
20,
}}
>
{submitting
? "INVIO..."
: communicationMode ===
"general"
? "INVIA A TUTTI I DIPENDENTI"
: "INVIA AL DIPENDENTE"}
</button>

{message && (
<Message
text={
message
}
/>
)}
</div>

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
}}
>
<h3
style={{
marginTop:
0,
}}
>
Storico comunicazioni
</h3>

{communications.length ===
0 ? (
<div
style={{
color:
"#82919a",
}}
>
Nessuna comunicazione presente.
</div>
) : (
communications.map(
(
comm: Communication
) => {
const target =
comm.is_general
? "Tutti i dipendenti"
: allEmployees.find(
(
emp: Employee
) =>
emp.id ===
comm.employee_id
)
?.full_name ||
"Dipendente";

return (
<div
key={
comm.id
}
style={{
borderTop:
"1px solid #263841",
padding:
"16px 0",
}}
>
<div
style={{
display:
"flex",
justifyContent:
"space-between",
gap:
15,
}}
>
<div>
<strong>
{
comm.title
}
</strong>

<div
style={{
color:
"#16c784",
fontSize:
12,
marginTop:
5,
}}
>
{comm.is_general
? "📢 "
: "👤 "}
{
target
}
</div>
</div>

<span
style={{
color:
"#71828c",
fontSize:
11,
}}
>
{formatCommunicationDate(
comm.created_at
)}
</span>
</div>

<div
style={{
color:
"#b7c4ca",
marginTop:
10,
whiteSpace:
"pre-wrap",
lineHeight:
1.5,
}}
>
{
comm.message
}
</div>
</div>
);
}
)
)}
</div>
</>
)}

{/* =================================================
SCADENZE
================================================= */}

{activeSection ===
"deadlines" && (
<>
<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap:
16,
marginBottom:
20,
}}
>
<Stat
title="Documenti in scadenza"
value={
expiringDocuments.length
}
alert
/>

<Stat
title="Documenti scaduti"
value={
expiredDocuments.length
}
danger
/>
</div>

<DeadlineList
title="Documenti scaduti"
items={
expiredDocuments
}
danger
/>

<DeadlineList
title="Documenti in scadenza entro 30 giorni"
items={
expiringDocuments
}
alert
/>
</>
)}
</section>
</main>
);
}

/* =========================================================
SIDEBAR BUTTON
========================================================= */

function SidebarButton({
active,
onClick,
children,
}: any) {
return (
<button
onClick={
onClick
}
style={{
width:
"100%",
textAlign:
"left",
padding:
"13px 12px",
border:
"none",
borderRadius:
9,
marginBottom:
5,
background:
active
? "#12332d"
: "transparent",
color:
active
? "#16c784"
: "#a9b7be",
fontWeight:
active
? 800
: 600,
cursor:
"pointer",
}}
>
{children}
</button>
);
}

/* =========================================================
STAT
========================================================= */

function Stat({
title,
value,
alert,
danger,
}: any) {
return (
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
14,
padding:
20,
}}
>
<div
style={{
color:
"#81919a",
fontSize:
12,
marginBottom:
10,
}}
>
{title}
</div>

<div
style={{
fontSize:
29,
fontWeight:
900,
color:
danger
? "#ff7777"
: alert
? "#ffc857"
: "#f2f6f7",
}}
>
{value}
</div>
</div>
);
}

/* =========================================================
QUICK CARD
========================================================= */

function QuickCard({
title,
description,
button,
onClick,
}: any) {
return (
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
}}
>
<h3
style={{
margin:
"0 0 8px",
}}
>
{title}
</h3>

<p
style={{
color:
"#82919a",
fontSize:
13,
lineHeight:
1.5,
minHeight:
40,
}}
>
{description}
</p>

<button
onClick={
onClick
}
style={{
...greenButton,
marginTop:
8,
}}
>
{button}
</button>
</div>
);
}

/* =========================================================
FIELD
========================================================= */

function Field({
label,
children,
}: any) {
return (
<div
style={{
marginTop:
17,
}}
>
<label
style={{
display:
"block",
color:
"#aebbc2",
fontSize:
12,
fontWeight:
700,
marginBottom:
7,
}}
>
{label}
</label>

{children}
</div>
);
}

/* =========================================================
MESSAGE
========================================================= */

function Message({
text,
}: {
text: string;
}) {
return (
<div
style={{
marginTop:
15,
padding:
13,
borderRadius:
9,
background:
"#12342d",
color:
"#b9f3de",
fontSize:
13,
}}
>
{text}
</div>
);
}

/* =========================================================
DOCUMENT LIST
========================================================= */

function DocumentList({
title,
documents,
employees,
openDocument,
}: any) {
return (
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
marginTop:
20,
}}
>
<h3
style={{
marginTop:
0,
}}
>
{title}
</h3>

{documents.length ===
0 ? (
<div
style={{
color:
"#81919a",
}}
>
Nessun documento presente.
</div>
) : (
documents.map(
(
doc: Document
) => {
const employee =
employees.find(
(
emp: Employee
) =>
emp.id ===
doc.employee_id
);

return (
<div
key={
doc.id
}
style={{
borderTop:
"1px solid #293b45",
padding:
"15px 0",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
gap:
15,
}}
>
<div>
<strong>
{
employee?.full_name ||
"Dipendente"
}
</strong>

<div
style={{
color:
"#16c784",
fontSize:
12,
marginTop:
4,
}}
>
{documentLabel(
doc.document_type
)}
</div>

<div
style={{
color:
"#81919a",
fontSize:
12,
marginTop:
4,
}}
>
{doc.file_name}
{doc.month
? ` · ${doc.month}/${doc.year}`
: ` · ${doc.year}`}
</div>
</div>

<button
onClick={() =>
openDocument(
doc
)
}
style={{
...secondaryButton,
color:
"#16c784",
}}
>
Apri PDF
</button>
</div>
);
}
)
)}
</div>
);
}

/* =========================================================
DEADLINE LIST
========================================================= */

function DeadlineList({
title,
items,
danger,
alert,
}: any) {
return (
<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
marginBottom:
20,
}}
>
<h3
style={{
marginTop:
0,
}}
>
{title}
</h3>

{items.length ===
0 ? (
<div
style={{
color:
"#81919a",
}}
>
Nessun documento presente.
</div>
) : (
items.map(
({
doc,
employee,
}: any) => (
<div
key={
doc.id
}
style={{
borderTop:
"1px solid #293b45",
padding:
"14px 0",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
}}
>
<div>
<strong>
{employee?.full_name ||
"Dipendente"}
</strong>

<div
style={{
color:
"#81919a",
fontSize:
12,
marginTop:
4,
}}
>
{documentLabel(
doc.document_type
)}
</div>
</div>

<span
style={{
color:
danger
? "#ff7777"
: alert
? "#ffc857"
: "#16c784",
fontWeight:
900,
fontSize:
13,
}}
>
{formatDate(
doc.expiry_date
)}
</span>
</div>
)
)
)}
</div>
);
}

/* =========================================================
AREA DIPENDENTE
========================================================= */

function EmployeeArea({
employee,
documents,
communications,
openDocument,
logout,
session,
}: any) {
const generalCommunications =
communications.filter(
(item: Communication) =>
item.is_general
);

const personalCommunications =
communications.filter(
(item: Communication) =>
!item.is_general
);

return (
<main
style={{
minHeight:
"100vh",
background:
"#0d1922",
color:
"#e9f0f2",
fontFamily:
"Arial, sans-serif",
}}
>
<header
style={{
background:
"#08141d",
borderBottom:
"1px solid #20313b",
padding:
"18px 28px",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
}}
>
<div>
<strong
style={{
fontSize:
21,
}}
>
BARDOC{" "}
<span
style={{
color:
"#16c784",
}}
>
PAY
</span>
</strong>

<div
style={{
color:
"#16c784",
fontSize:
12,
marginTop:
3,
}}
>
AREA PERSONALE
</div>
</div>

<button
onClick={
logout
}
style={
secondaryButton
}
>
Esci
</button>
</header>

<section
style={{
maxWidth:
1100,
margin:
"0 auto",
padding:
30,
}}
>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
20,
padding:
30,
border:
"1px solid #263b47",
marginBottom:
20,
}}
>
<div
style={{
color:
"#16c784",
fontSize:
12,
fontWeight:
900,
}}
>
AREA PERSONALE
</div>

<h1
style={{
margin:
"8px 0",
}}
>
{employee?.full_name ||
"Dipendente"}
</h1>

<p
style={{
margin:
0,
color:
"#a9b8c0",
}}
>
Benvenuto nel tuo portale BARDOC PAY.
</p>
</div>

{/* =================================================
COMUNICAZIONI
================================================= */}

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
24,
marginBottom:
20,
}}
>
<h2
style={{
marginTop:
0,
}}
>
💬 Comunicazioni
</h2>

{communications.length ===
0 ? (
<p
style={{
color:
"#81919a",
}}
>
Non ci sono comunicazioni.
</p>
) : (
<>
{generalCommunications.map(
(
comm: Communication
) => (
<CommunicationCard
key={
comm.id
}
communication={
comm
}
general
/>
)
)}

{personalCommunications.map(
(
comm: Communication
) => (
<CommunicationCard
key={
comm.id
}
communication={
comm
}
/>
)
)}
</>
)}
</div>

{/* =================================================
DOCUMENTI
================================================= */}

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
24,
}}
>
<h2
style={{
marginTop:
0,
}}
>
📁 I miei documenti
</h2>

{documents.length ===
0 ? (
<p
style={{
color:
"#81919a",
}}
>
Non sono presenti documenti.
</p>
) : (
documents.map(
(
doc: Document
) => (
<div
key={
doc.id
}
style={{
borderTop:
"1px solid #293b45",
padding:
"16px 0",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
gap:
15,
}}
>
<div>
<strong>
{documentLabel(
doc.document_type
)}
</strong>

<div
style={{
color:
"#82919a",
fontSize:
12,
marginTop:
5,
}}
>
{
doc.file_name
}

{doc.month
? ` · ${doc.month}/${doc.year}`
: ` · ${doc.year}`}
</div>

{doc.expiry_date && (
<div
style={{
marginTop:
5,
color:
expiryStatus(
doc.expiry_date
) ===
"expired"
? "#ff7777"
: expiryStatus(
doc.expiry_date
) ===
"warning"
? "#ffc857"
: "#81919a",
fontSize:
12,
fontWeight:
700,
}}
>
Scadenza:{" "}
{formatDate(
doc.expiry_date
)}
</div>
)}
</div>

<button
onClick={() =>
openDocument(
doc
)
}
style={{
...greenButton,
width:
"auto",
padding:
"10px 16px",
}}
>
Apri PDF
</button>
</div>
)
)
)}
</div>

<div
style={{
marginTop:
20,
padding:
16,
background:
"#13222c",
borderRadius:
12,
color:
"#81919a",
fontSize:
12,
}}
>
Accesso effettuato come{" "}
<strong
style={{
color:
"#dce6e9",
}}
>
{session.user.email}
</strong>
</div>
</section>
</main>
);
}

/* =========================================================
COMMUNICATION CARD
========================================================= */

function CommunicationCard({
communication,
general,
}: {
communication: Communication;
general?: boolean;
}) {
return (
<div
style={{
borderTop:
"1px solid #293b45",
padding:
"16px 0",
}}
>
<div
style={{
display:
"flex",
justifyContent:
"space-between",
gap:
15,
}}
>
<div>
<strong
style={{
fontSize:
16,
}}
>
{general
? "📢 "
: "👤 "}
{
communication.title
}
</strong>

<div
style={{
color:
"#16c784",
fontSize:
11,
fontWeight:
800,
marginTop:
5,
}}
>
{general
? "COMUNICAZIONE GENERALE"
: "COMUNICAZIONE PERSONALE"}
</div>
</div>

<span
style={{
color:
"#71828c",
fontSize:
11,
}}
>
{formatCommunicationDate(
communication.created_at
)}
</span>
</div>

<div
style={{
marginTop:
10,
color:
"#c4d0d5",
lineHeight:
1.6,
whiteSpace:
"pre-wrap",
}}
>
{
communication.message
}
</div>
</div>
);
}
