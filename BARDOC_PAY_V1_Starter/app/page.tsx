"use client";

import { useEffect, useMemo, useState } from "react";
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
month: number | null;
year: number;
file_name: string;
storage_path: string;
tax_code: string | null;
expiry_date: string | null;
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

const CURRENT_YEAR = new Date().getFullYear();

const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 5 + i);

const DOCUMENT_TYPES: Record<string, { value: string; label: string }[]> = {
retribuzione: [
{ value: "payslip", label: "Busta paga" },
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

function documentLabel(type: string) {
const all = Object.values(DOCUMENT_TYPES).flat();
return all.find((item) => item.value === type)?.label || type;
}

function categoryFromType(type: string) {
for (const [category, values] of Object.entries(DOCUMENT_TYPES)) {
if (values.some((item) => item.value === type)) {
return category;
}
}

return "retribuzione";
}

function formatDate(date: string | null) {
if (!date) return "—";

const parts = date.split("-");
if (parts.length !== 3) return date;

return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function daysUntil(date: string) {
const today = new Date();
today.setHours(0, 0, 0, 0);

const expiry = new Date(`${date}T00:00:00`);

return Math.ceil(
(expiry.getTime() - today.getTime()) / 86400000
);
}

function expiryStatus(date: string | null) {
if (!date) return "none";

const days = daysUntil(date);

if (days < 0) return "expired";
if (days <= 30) return "warning";

return "valid";
}

export default function Home() {
const [session, setSession] = useState<any>(null);
const [loading, setLoading] = useState(true);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loginMode, setLoginMode] = useState(true);

const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

const [employee, setEmployee] =
useState<Employee | null>(null);

const [employees, setEmployees] =
useState<Employee[]>([]);

const [documents, setDocuments] =
useState<Document[]>([]);

const [allDocuments, setAllDocuments] =
useState<Document[]>([]);

const [adminLoading, setAdminLoading] = useState(false);

const [search, setSearch] = useState("");

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

const [taxCode, setTaxCode] = useState("");

const [expiryDate, setExpiryDate] =
useState("");

const [file, setFile] =
useState<File | null>(null);

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

const selectedTypeRequiresTaxCode =
documentType === "driver_license";

const selectedTypeAllowsExpiry =
documentType === "id_card" ||
documentType === "driver_license";

useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setSession(data.session);
setLoading(false);
});

const {
data: { subscription },
} = supabase.auth.onAuthStateChange(
(_event, newSession) => {
setSession(newSession);
setLoading(false);
}
);

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

async function logout() {
await supabase.auth.signOut();

setSession(null);
setEmployee(null);
setDocuments([]);
setEmployees([]);
setAllDocuments([]);
setEmail("");
setPassword("");
}

async function loadEmployeeArea() {
if (!session?.user?.id) return;

const { data: emp, error: empError } =
await supabase
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

const { data: docs, error: docsError } =
await supabase
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

const { data, error } =
await supabase
.from("employees")
.select("*")
.eq("active", true)
.order("full_name");

if (error) {
console.error(error);
setMessage(
"Impossibile caricare i dipendenti."
);
} else {
setEmployees(data || []);
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

setAllDocuments(docs || []);

setAdminLoading(false);
}

function resetDocumentForm() {
setSelectedEmployee("");
setCategory("retribuzione");
setDocumentType("payslip");
setMonth(new Date().getMonth() + 1);
setYear(CURRENT_YEAR);
setTaxCode("");
setExpiryDate("");
setFile(null);

const input = document.getElementById(
"document-file"
) as HTMLInputElement | null;

if (input) input.value = "";
}

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

if (file.type !== "application/pdf") {
setMessage(
"Il documento deve essere un PDF."
);
return;
}

const normalizedTaxCode =
taxCode.trim().toUpperCase();

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

if (
selectedTypeRequiresTaxCode &&
!normalizedTaxCode
) {
setMessage(
"Per la patente il Codice Fiscale è obbligatorio."
);
return;
}

if (
selectedTypeAllowsExpiry &&
!expiryDate
) {
setMessage(
"Inserisci la data di scadenza."
);
return;
}

setSubmitting(true);

try {
const safeFileName = file.name
.replace(/[^\w.\- ]/g, "")
.replace(/\s+/g, "_");

const storagePath =
`${selectedEmployee}/${Date.now()}_${safeFileName}`;

const { error: uploadError } =
await supabase.storage
.from("payroll-documents")
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
documentType === "payslip" ||
documentType ===
"payment_statement";

const { error: documentError } =
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
normalizedTaxCode || null,

expiry_date:
expiryDate || null,
});

if (documentError) {
throw documentError;
}

setMessage(
"Documento caricato correttamente. ✅"
);

resetDocumentForm();

await loadEmployees();
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
const { data, error } =
await supabase.storage
.from("payroll-documents")
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

const filteredEmployees =
useMemo(() => {
const q =
search.trim().toLowerCase();

if (!q) return employees;

const employeeIdsByTaxCode =
new Set(
allDocuments
.filter((doc) =>
(doc.tax_code || "")
.toLowerCase()
.includes(q)
)
.map(
(doc) => doc.employee_id
)
);

return employees.filter(
(emp) =>
emp.full_name
.toLowerCase()
.includes(q) ||
(emp.email || "")
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

const expiringDocuments =
useMemo(() => {
return allDocuments
.map((doc) => ({
doc,
employee: employees.find(
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
employee: employees.find(
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

if (loading) {
return (
<div
style={{
minHeight: "100vh",
background: "#081521",
color: "#fff",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontFamily:
"Arial, sans-serif",
}}
>
<div
style={{
textAlign: "center",
}}
>
<div
style={{
width: 72,
height: 72,
borderRadius: 18,
background:
"#16c784",
color: "#062019",
display: "flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 40,
fontWeight: 900,
margin:
"0 auto 18px",
}}
>
B
</div>

<div
style={{
color: "#b8c5cb",
}}
>
Caricamento BARDOC PAY...
</div>
</div>
</div>
);
}

if (!session) {
return (
<main
style={{
minHeight: "100vh",
background:
"linear-gradient(135deg,#07141f,#102936,#07141f)",
display: "flex",
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
width: "100%",
maxWidth: 450,
background: "#172631",
border:
"1px solid #2a3b47",
borderRadius: 22,
padding: 38,
boxShadow:
"0 25px 70px rgba(0,0,0,.35)",
color: "#fff",
}}
>
<div
style={{
textAlign: "center",
}}
>
<div
style={{
width: 78,
height: 78,
margin:
"0 auto 18px",
borderRadius: 20,
background:
"#16c784",
color: "#062019",
display: "flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 44,
fontWeight: 900,
}}
>
B
</div>

<div
style={{
color: "#16c784",
fontWeight: 800,
letterSpacing: 1.5,
fontSize: 13,
}}
>
BARDOC SERVICE
</div>

<h1
style={{
margin:
"8px 0 6px",
fontSize: 29,
}}
>
Portale Dipendenti
</h1>

<p
style={{
color: "#9daab2",
marginBottom: 28,
}}
>
Accedi alla tua area personale
</p>
</div>

<form
onSubmit={
handleSubmit
}
style={{
display: "flex",
flexDirection:
"column",
gap: 14,
}}
>
<input
type="email"
placeholder="Email"
value={email}
onChange={(e) =>
setEmail(
e.target.value
)
}
required
style={darkInput}
/>

<input
type="password"
placeholder="Password"
value={password}
onChange={(e) =>
setPassword(
e.target.value
)
}
required
style={darkInput}
/>

<button
type="submit"
disabled={
submitting
}
style={
greenButton
}
>
{submitting
? "Attendere..."
: loginMode
? "ACCEDI"
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
width: "100%",
marginTop: 20,
border: "none",
background:
"transparent",
color: "#16c784",
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
marginTop: 18,
padding: 13,
borderRadius: 10,
background:
"#213742",
color: "#d8e5e8",
textAlign:
"center",
fontSize: 13,
}}
>
{message}
</div>
)}
</div>
</main>
);
}

if (isAdmin) {
return (
<AdminDashboard
employees={
filteredEmployees
}
allEmployees={
employees
}
documents={
allDocuments
}
search={search}
setSearch={setSearch}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
category={category}
setCategory={(value) => {
setCategory(value);

const first =
DOCUMENT_TYPES[
value
]?.[0];

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
month={month}
setMonth={setMonth}
year={year}
setYear={setYear}
taxCode={taxCode}
setTaxCode={setTaxCode}
expiryDate={
expiryDate
}
setExpiryDate={
setExpiryDate
}
file={file}
setFile={setFile}
submitting={
submitting
}
message={message}
uploadDocument={
uploadDocument
}
openDocument={
openDocument
}
logout={logout}
adminLoading={
adminLoading
}
expiringDocuments={
expiringDocuments
}
expiredDocuments={
expiredDocuments
}
/>
);
}

return (
<EmployeeArea
employee={employee}
documents={documents}
openDocument={
openDocument
}
logout={logout}
session={session}
/>
);
}

const darkInput: React.CSSProperties =
{
width: "100%",
boxSizing: "border-box",
padding: "13px 14px",
borderRadius: 10,
border:
"1px solid #344955",
background: "#101e28",
color: "#fff",
fontSize: 14,
outline: "none",
};

const greenButton: React.CSSProperties =
{
width: "100%",
padding: 14,
border: "none",
borderRadius: 10,
background: "#16c784",
color: "#062019",
fontWeight: 900,
cursor: "pointer",
};

function AdminDashboard({
employees,
allEmployees,
documents,
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
}: any) {
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

const isPayroll =
category ===
"retribuzione";

return (
<main
style={{
minHeight: "100vh",
background: "#0d1922",
color: "#e9f0f2",
fontFamily:
"Arial, sans-serif",
display: "flex",
}}
>
<aside
style={{
width: 235,
background: "#08141d",
borderRight:
"1px solid #20313b",
padding: 20,
boxSizing:
"border-box",
minHeight: "100vh",
}}
>
<div
style={{
fontSize: 20,
fontWeight: 900,
marginBottom: 4,
}}
>
BARDOC PAY
</div>

<div
style={{
color: "#16c784",
fontSize: 11,
fontWeight: 800,
marginBottom: 30,
}}
>
AMMINISTRAZIONE
</div>

{[
"⌂ Dashboard",
"♙ Dipendenti",
"▣ Documenti",
"€ Buste paga",
"▤ Distinte pagamento",
"◷ Scadenze",
].map(
(item, index) => (
<div
key={item}
style={{
padding:
"13px 12px",
borderRadius: 9,
marginBottom: 5,
background:
index === 0
? "#12332d"
: "transparent",
color:
index === 0
? "#16c784"
: "#a9b7be",
fontWeight:
index === 0
? 800
: 600,
}}
>
{item}
</div>
)
)}

<div
style={{
position:
"fixed",
bottom: 22,
width: 190,
color: "#73838c",
fontSize: 12,
}}
>
<span
style={{
color: "#16c784",
}}
>
●
</span>{" "}
Sistema operativo
</div>
</aside>

<section
style={{
flex: 1,
padding: 28,
maxWidth: 1500,
boxSizing:
"border-box",
}}
>
<header
style={{
display: "flex",
justifyContent:
"space-between",
alignItems:
"center",
marginBottom: 24,
}}
>
<div>
<h1
style={{
margin: 0,
fontSize: 26,
}}
>
Dashboard
</h1>

<div
style={{
color: "#82919a",
marginTop: 5,
fontSize: 13,
}}
>
Gestione del personale BARDOC SERVICE
</div>
</div>

<button
onClick={logout}
style={{
padding:
"10px 17px",
border:
"1px solid #30424d",
borderRadius: 9,
background:
"#13222c",
color: "#dce6e9",
fontWeight: 700,
cursor:
"pointer",
}}
>
Esci
</button>
</header>

<div
style={{
display: "grid",
gridTemplateColumns:
"repeat(4,1fr)",
gap: 14,
marginBottom: 20,
}}
>
<Stat
title="Dipendenti attivi"
value={
allEmployees.length
}
/>

<Stat
title="Documenti totali"
value={
documents.length
}
/>

<Stat
title="In scadenza"
value={
expiringDocuments.length
}
alert
/>

<Stat
title="Scaduti"
value={
expiredDocuments.length
}
danger
/>
</div>

{(expiringDocuments.length >
0 ||
expiredDocuments.length >
0) && (
<div
style={{
background:
"#17242c",
border:
"1px solid #30434d",
borderRadius: 14,
padding: 18,
marginBottom: 20,
}}
>
<h3
style={{
marginTop: 0,
}}
>
🚨 Scadenze documenti
</h3>

{[
...expiredDocuments,
...expiringDocuments,
]
.slice(0, 6)
.map(
({
doc,
employee,
}: any) => (
<div
key={doc.id}
style={{
display:
"flex",
justifyContent:
"space-between",
borderTop:
"1px solid #263841",
padding:
"11px 0",
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
"#8999a2",
fontSize: 12,
marginTop: 4,
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
expiryStatus(
doc.expiry_date
) ===
"expired"
? "#ff7777"
: "#ffc857",
fontWeight:
800,
fontSize: 13,
}}
>
{formatDate(
doc.expiry_date
)}
</span>
</div>
)
)}
</div>
)}

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius: 16,
padding: 24,
marginBottom: 20,
}}
>
<h2
style={{
margin:
"0 0 5px",
}}
>
Carica documento
</h2>

<p
style={{
margin:
"0 0 22px",
color:
"#82919a",
fontSize: 13,
}}
>
Pubblica documenti e documentazione del personale.
</p>

<div
style={{
display: "grid",
gridTemplateColumns:
"1fr 1fr",
gap: 17,
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
(emp: Employee) => (
<option
key={emp.id}
value={emp.id}
>
{emp.full_name}
</option>
)
)}
</select>
</Field>

<Field
label="Categoria documento"
>
<select
value={category}
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
([value, label]) => (
<option
key={value}
value={value}
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
DOCUMENT_TYPES[
category
] || []
).map(
(item) => (
<option
key={
item.value
}
value={
item.value
}
>
{item.label}
</option>
)
)}
</select>
</Field>

{isPayroll && (
<Field label="Mese">
<select
value={month}
onChange={(e) =>
setMonth(
Number(
e.target
.value
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
key={name}
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
)}

<Field label="Anno">
<select
value={year}
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
key={y}
value={y}
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
maxLength={16}
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
marginTop: 6,
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
e.target
.value
)
}
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
marginTop: 6,
}}
>
La data permetterà a BARDOC PAY di generare gli alert.
</small>
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
e.target
.files?.[0] ||
null
)
}
style={{
width:
"100%",
marginTop: 8,
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
marginTop: 22,
opacity:
submitting
? 0.65
: 1,
}}
>
{submitting
? "CARICAMENTO..."
: "CARICA DOCUMENTO"}
</button>

{message && (
<div
style={{
marginTop: 15,
padding: 13,
borderRadius: 9,
background:
"#12342d",
color:
"#b9f3de",
fontSize: 13,
}}
>
{message}
</div>
)}
</div>

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius: 16,
padding: 22,
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
gap: 15,
marginBottom: 16,
}}
>
<h2
style={{
margin: 0,
}}
>
Dipendenti
</h2>

<input
value={search}
onChange={(e) =>
setSearch(
e.target.value
)
}
placeholder="Cerca nome, email o codice fiscale..."
style={{
...darkInput,
maxWidth: 360,
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
(emp: Employee) => {
const employeeDocs =
documents.filter(
(doc) =>
doc.employee_id ===
emp.id
);

return (
<div
key={emp.id}
style={{
borderTop:
"1px solid #263841",
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
{
emp.full_name
}
</strong>

<div
style={{
color:
"#778993",
fontSize: 12,
marginTop: 4,
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
fontSize: 12,
fontWeight:
800,
}}
>
{employeeDocs.length} documenti
</span>
</div>
);
}
)
)}
</div>
</section>
</main>
);
}

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
borderRadius: 14,
padding: 20,
}}
>
<div
style={{
color:
"#81919a",
fontSize: 12,
marginBottom: 10,
}}
>
{title}
</div>

<div
style={{
fontSize: 28,
fontWeight: 900,
color: danger
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

function Field({
label,
children,
}: any) {
return (
<div
style={{
marginTop: 17,
}}
>
<label
style={{
display:
"block",
color:
"#aebbc2",
fontSize: 12,
fontWeight: 700,
marginBottom: 7,
}}
>
{label}
</label>

{children}
</div>
);
}

const darkSelect: React.CSSProperties =
{
width: "100%",
padding: 13,
borderRadius: 9,
border:
"1px solid #344955",
background: "#101e28",
color: "#fff",
boxSizing:
"border-box",
fontSize: 14,
};

function EmployeeArea({
employee,
documents,
openDocument,
logout,
session,
}: any) {
return (
<main
style={{
minHeight: "100vh",
background:
"#0d1922",
color: "#e9f0f2",
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
fontSize: 21,
}}
>
BARDOC PAY
</strong>

<div
style={{
color:
"#16c784",
fontSize: 12,
marginTop: 3,
}}
>
AREA PERSONALE
</div>
</div>

<button
onClick={logout}
style={{
padding:
"10px 17px",
border:
"1px solid #30424d",
borderRadius: 9,
background:
"#13222c",
color:
"#dce6e9",
fontWeight: 700,
}}
>
Esci
</button>
</header>

<section
style={{
maxWidth: 1100,
margin:
"0 auto",
padding: 30,
}}
>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius: 20,
padding: 30,
border:
"1px solid #263b47",
}}
>
<div
style={{
color:
"#16c784",
fontSize: 12,
fontWeight: 900,
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
margin: 0,
color:
"#a9b8c0",
}}
>
Benvenuto nel tuo portale BARDOC PAY.
</p>
</div>

<div
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius: 16,
padding: 24,
marginTop: 20,
}}
>
<h2
style={{
marginTop: 0,
}}
>
I miei documenti
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
(doc: Document) => (
<div
key={doc.id}
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
fontSize: 12,
marginTop: 5,
}}
>
{doc.file_name}
{doc.month
? ` · ${doc.month}/${doc.year}`
: ` · ${doc.year}`}
</div>

{doc.expiry_date && (
<div
style={{
marginTop: 5,
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
fontSize: 12,
fontWeight: 700,
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
background:
"#16c784",
border:
"none",
borderRadius: 9,
padding:
"10px 16px",
fontWeight: 900,
cursor:
"pointer",
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
marginTop: 20,
padding: 16,
background:
"#13222c",
borderRadius: 12,
color:
"#81919a",
fontSize: 12,
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
