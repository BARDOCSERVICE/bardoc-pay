"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
id: string;
auth_user_id: string | null;
full_name: string;
email: string | null;
active: boolean;
fiscal_code?: string | null;
photo_path?: string | null;
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

const YEARS = Array.from(
{ length: 8 },
(_, i) => CURRENT_YEAR - 5 + i
);

const DOCUMENT_TYPES: Record<
string,
{ value: string; label: string }[]
> = {
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

if (parts.length !== 3) return date;

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

if (days < 0) return "expired";

if (days <= 30) return "warning";

return "valid";
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

const [adminLoading, setAdminLoading] =
useState(false);

const [adminSection, setAdminSection] =
useState<
| "dashboard"
| "employees"
| "payments"
| "documents"
| "communications"
| "expiry"
>("dashboard");

const [search, setSearch] =
useState("");

const [selectedEmployee, setSelectedEmployee] =
useState("");

const [category, setCategory] =
useState("personali");

const [documentType, setDocumentType] =
useState("id_card");

const [month, setMonth] =
useState(
new Date().getMonth() + 1
);

const [year, setYear] =
useState(CURRENT_YEAR);

const [taxCode, setTaxCode] =
useState("");

const [expiryDate, setExpiryDate] =
useState("");

const [file, setFile] =
useState<File | null>(null);

const [paymentType, setPaymentType] =
useState<
"payslip" | "payment_statement"
>("payslip");

const [communicationMode, setCommunicationMode] =
useState<
"individual" | "general"
>("individual");

const [communicationEmployee, setCommunicationEmployee] =
useState("");

const [communicationTitle, setCommunicationTitle] =
useState("");

const [communicationText, setCommunicationText] =
useState("");

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

const selectedTypeRequiresTaxCode =
documentType === "driver_license";

const selectedTypeAllowsExpiry =
documentType === "id_card" ||
documentType === "driver_license";

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
await supabase.auth.signInWithPassword(
{
email,
password,
}
);

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

if (!emp) return;

const {
data: docs,
error: docsError,
} = await supabase
.from("documents")
.select("*")
.eq("employee_id", emp.id)
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

if (docsError) {
console.error(docsError);
return;
}

setDocuments(docs || []);
}

async function loadEmployees() {
setAdminLoading(true);

const {
data,
error,
} = await supabase
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

const {
data: docs,
error: docsError,
} = await supabase
.from("documents")
.select("*")
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

if (docsError) {
console.error(docsError);
}

setAllDocuments(docs || []);

setAdminLoading(false);
}

function resetDocumentForm() {
setSelectedEmployee("");
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

function resetPaymentForm() {
setSelectedEmployee("");
setMonth(
new Date().getMonth() + 1
);
setYear(CURRENT_YEAR);
setFile(null);

const input =
document.getElementById(
"payment-file"
) as HTMLInputElement | null;

if (input) {
input.value = "";
}
}

async function uploadPayment() {
setMessage("");

if (!selectedEmployee) {
setMessage(
"Seleziona un dipendente."
);
return;
}

if (!file) {
setMessage(
"Seleziona il PDF della busta paga o della distinta."
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
`${selectedEmployee}/pagamenti/${Date.now()}_${safeFileName}`;

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

const {
error: documentError,
} = await supabase
.from("documents")
.insert({
employee_id:
selectedEmployee,

document_type:
paymentType,

month,

year,

file_name:
file.name,

storage_path:
storagePath,

tax_code: null,

expiry_date: null,
});

if (documentError) {
throw documentError;
}

setMessage(
paymentType ===
"payslip"
? "Busta paga caricata correttamente. ✅"
: "Distinta di pagamento caricata correttamente. ✅"
);

resetPaymentForm();

await loadEmployees();
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento."
);
}

setSubmitting(false);
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
`${selectedEmployee}/documenti/${Date.now()}_${safeFileName}`;

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

const {
error: documentError,
} = await supabase
.from("documents")
.insert({
employee_id:
selectedEmployee,

document_type:
documentType,

month: null,

year,

file_name:
file.name,

storage_path:
storagePath,

tax_code:
normalizedTaxCode ||
null,

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
emp.email ||
""
)
.toLowerCase()
.includes(q) ||
(
emp.fiscal_code ||
""
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

const paymentDocuments =
useMemo(() => {
return allDocuments.filter(
(doc) =>
doc.document_type ===
"payslip" ||
doc.document_type ===
"payment_statement"
);
}, [allDocuments]);

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

if (loading) {
return (
<div
style={{
minHeight: "100vh",
background:
"#081521",
color: "#fff",
display: "flex",
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
width: 72,
height: 72,
borderRadius: 18,
background:
"#16c784",
color:
"#062019",
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
color:
"#b8c5cb",
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
background:
"#172631",
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
textAlign:
"center",
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
color:
"#062019",
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
color:
"#16c784",
fontWeight: 800,
letterSpacing:
1.5,
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
color:
"#9daab2",
marginBottom:
28,
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
style={
darkInput
}
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
style={
darkInput
}
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
border:
"none",
background:
"transparent",
color:
"#16c784",
fontWeight: 700,
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
marginTop: 18,
padding: 13,
borderRadius: 10,
background:
"#213742",
color:
"#d8e5e8",
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
section={
adminSection
}
setSection={
setAdminSection
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
paymentDocuments={
paymentDocuments
}
search={search}
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
setCategory={
setCategory
}
documentType={
documentType
}
setDocumentType={
setDocumentType
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
setFile={
setFile
}
paymentType={
paymentType
}
setPaymentType={
setPaymentType
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
uploadPayment={
uploadPayment
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
communicationText={
communicationText
}
setCommunicationText={
setCommunicationText
}
/>
);
}

return (
<EmployeeArea
employee={
employee
}
documents={
documents
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

const darkInput: React.CSSProperties =
{
width: "100%",
boxSizing:
"border-box",
padding:
"13px 14px",
borderRadius: 10,
border:
"1px solid #344955",
background:
"#101e28",
color: "#fff",
fontSize: 14,
outline:
"none",
};

const greenButton: React.CSSProperties =
{
width: "100%",
padding: 14,
border: "none",
borderRadius: 10,
background:
"#16c784",
color:
"#062019",
fontWeight: 900,
cursor:
"pointer",
};

const darkSelect: React.CSSProperties =
{
width: "100%",
padding: 13,
borderRadius: 9,
border:
"1px solid #344955",
background:
"#101e28",
color: "#fff",
boxSizing:
"border-box",
fontSize: 14,
};

function AdminDashboard({
section,
setSection,
employees,
allEmployees,
documents,
paymentDocuments,
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
paymentType,
setPaymentType,
submitting,
message,
uploadDocument,
uploadPayment,
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
communicationText,
setCommunicationText,
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
<aside
style={{
width: 245,
background:
"#08141d",
borderRight:
"1px solid #20313b",
padding: 20,
boxSizing:
"border-box",
minHeight:
"100vh",
flexShrink: 0,
}}
>
<div
style={{
fontSize: 20,
fontWeight: 900,
marginBottom: 4,
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
fontSize: 11,
fontWeight: 800,
marginBottom:
30,
}}
>
AMMINISTRAZIONE
</div>

<SidebarButton
active={
section ===
"dashboard"
}
onClick={() =>
setSection(
"dashboard"
)
}
icon="⌂"
label="Dashboard"
/>

<SidebarButton
active={
section ===
"employees"
}
onClick={() =>
setSection(
"employees"
)
}
icon="♙"
label="Dipendenti"
/>

<SidebarButton
active={
section ===
"payments"
}
onClick={() =>
setSection(
"payments"
)
}
icon="€"
label="Gestione pagamenti"
/>

<SidebarButton
active={
section ===
"documents"
}
onClick={() =>
setSection(
"documents"
)
}
icon="▣"
label="Documenti"
/>

<SidebarButton
active={
section ===
"communications"
}
onClick={() =>
setSection(
"communications"
)
}
icon="✉"
label="Comunicazioni"
/>

<SidebarButton
active={
section ===
"expiry"
}
onClick={() =>
setSection(
"expiry"
)
}
icon="◷"
label="Scadenze"
/>

<div
style={{
position:
"fixed",
bottom: 22,
width: 200,
color:
"#73838c",
fontSize: 12,
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
</aside>

<section
style={{
flex: 1,
padding: 28,
maxWidth: 1500,
boxSizing:
"border-box",
overflowX:
"auto",
}}
>
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
}}
>
<div>
<h1
style={{
margin: 0,
fontSize: 26,
}}
>
{section ===
"dashboard"
? "Dashboard"
: section ===
"employees"
? "Dipendenti"
: section ===
"payments"
? "Gestione pagamenti"
: section ===
"documents"
? "Documenti"
: section ===
"communications"
? "Comunicazioni"
: "Scadenze"}
</h1>

<div
style={{
color:
"#82919a",
marginTop: 5,
fontSize: 13,
}}
>
Gestione del personale BARDOC SERVICE
</div>
</div>

<button
onClick={
logout
}
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
fontWeight:
700,
cursor:
"pointer",
}}
>
Esci
</button>
</header>

{/* DASHBOARD */}

{section ===
"dashboard" && (
<>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
18,
padding: 28,
marginBottom:
20,
}}
>
<div
style={{
color:
"#16c784",
fontWeight:
800,
fontSize: 12,
}}
>
AMMINISTRAZIONE
</div>

<h2
style={{
margin:
"8px 0",
}}
>
Panoramica BARDOC PAY
</h2>

<p
style={{
color:
"#a9b8c0",
margin: 0,
}}
>
Controlla rapidamente personale, pagamenti, documenti e scadenze.
</p>
</div>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(4,minmax(0,1fr))",
gap: 14,
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

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(3,minmax(0,1fr))",
gap: 15,
}}
>
<QuickCard
icon="♙"
title="Dipendenti"
text="Cerca e consulta il personale."
onClick={() =>
setSection(
"employees"
)
}
/>

<QuickCard
icon="€"
title="Gestione pagamenti"
text="Carica buste paga e distinte."
onClick={() =>
setSection(
"payments"
)
}
/>

<QuickCard
icon="✉"
title="Comunicazioni"
text="Invia comunicazioni individuali o generali."
onClick={() =>
setSection(
"communications"
)
}
/>
</div>
</>
)}

{/* DIPENDENTI */}

{section ===
"employees" && (
<>
<Panel>
<h2
style={{
marginTop: 0,
}}
>
Ricerca dipendente
</h2>

<p
style={{
color:
"#82919a",
fontSize: 13,
}}
>
Cerca per nome, email oppure codice fiscale.
</p>

<input
value={search}
onChange={(e) =>
setSearch(
e.target.value
)
}
placeholder="Cerca dipendente..."
style={
darkInput
}
/>
</Panel>

<Panel>
<h2
style={{
marginTop: 0,
}}
>
Dipendenti
</h2>

{adminLoading ? (
<p
style={{
color:
"#82919a",
}}
>
Caricamento...
</p>
) : employees.length ===
0 ? (
<p
style={{
color:
"#82919a",
}}
>
Nessun dipendente trovato.
</p>
) : (
employees.map(
(
emp: Employee
) => {
const docs =
documents.filter(
(
doc
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
"16px 0",
display:
"flex",
alignItems:
"center",
gap: 15,
}}
>
<div
style={{
width: 52,
height: 52,
borderRadius:
"50%",
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
fontWeight:
900,
fontSize: 17,
flexShrink:
0,
}}
>
{initials(
emp.full_name
)}
</div>

<div
style={{
flex: 1,
}}
>
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

{emp.fiscal_code && (
<div
style={{
color:
"#778993",
fontSize:
12,
marginTop:
3,
}}
>
CF:{" "}
{
emp.fiscal_code
}
</div>
)}
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
{docs.length}{" "}
documenti
</span>
</div>
);
}
)
)}
</Panel>
</>
)}

{/* GESTIONE PAGAMENTI */}

{section ===
"payments" && (
<>
<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(0,1fr))",
gap: 18,
}}
>
<PaymentCard
title="Busta paga"
icon="€"
employeeId={
selectedEmployee
}
setEmployeeId={
setSelectedEmployee
}
month={month}
setMonth={
setMonth
}
year={year}
setYear={
setYear
}
file={file}
setFile={
setFile
}
submitting={
submitting
}
onUpload={() => {
setPaymentType(
"payslip"
);
uploadPayment();
}}
inputId="payment-file"
buttonText="CARICA BUSTA PAGA"
employees={
allEmployees
}
/>

<PaymentCard
title="Distinta di pagamento"
icon="🏦"
employeeId={
selectedEmployee
}
setEmployeeId={
setSelectedEmployee
}
month={month}
setMonth={
setMonth
}
year={year}
setYear={
setYear
}
file={file}
setFile={
setFile
}
submitting={
submitting
}
onUpload={() => {
setPaymentType(
"payment_statement"
);
uploadPayment();
}}
inputId="payment-file-2"
buttonText="CARICA DISTINTA"
employees={
allEmployees
}
/>
</div>

{message && (
<Message
text={
message
}
/>
)}

<Panel>
<h2
style={{
marginTop: 0,
}}
>
Pagamenti caricati
</h2>

{paymentDocuments.length ===
0 ? (
<p
style={{
color:
"#82919a",
}}
>
Nessun pagamento caricato.
</p>
) : (
paymentDocuments.map(
(
doc: Document
) => {
const emp =
allEmployees.find(
(
item: Employee
) =>
item.id ===
doc.employee_id
);

return (
<DocumentRow
key={
doc.id
}
doc={
doc
}
employeeName={
emp?.full_name
}
openDocument={
openDocument
}
/>
);
}
)
)}
</Panel>
</>
)}

{/* DOCUMENTI */}

{section ===
"documents" && (
<>
<Panel>
<h2
style={{
marginTop: 0,
}}
>
Caricamento documenti
</h2>

<p
style={{
color:
"#82919a",
fontSize: 13,
}}
>
Carica documenti anagrafici, contrattuali, permessi e curriculum.
</p>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 17,
}}
>
<Field label="Dipendente">
<select
value={
selectedEmployee
}
onChange={(
e
) =>
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

<Field label="Categoria">
<select
value={
category
}
onChange={(
e
) => {
const value =
e.target
.value;

setCategory(
value
);

const first =
DOCUMENT_TYPES[
value
]?.[0];

setDocumentType(
first?.value ||
""
);

setTaxCode(
""
);

setExpiryDate(
""
);
}}
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
{
label
}
</option>
)
)}
</select>
</Field>

<Field label="Tipo documento">
<select
value={
documentType
}
onChange={(
e
) => {
setDocumentType(
e.target
.value
);

setTaxCode(
""
);

setExpiryDate(
""
);
}}
style={
darkSelect
}
>
{(
DOCUMENT_TYPES[
category
] ||
[]
).map(
(
item
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

<Field label="Anno">
<select
value={
year
}
onChange={(
e
) =>
setYear(
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
onChange={(
e
) =>
setTaxCode(
e.target.value.toUpperCase()
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
<Field label="Data di scadenza">
<input
type="date"
value={
expiryDate
}
onChange={(
e
) =>
setExpiryDate(
e.target
.value
)
}
style={
darkInput
}
/>
</Field>
)}
</div>

<Field label="Documento PDF">
<input
id="document-file"
type="file"
accept="application/pdf,.pdf"
onChange={(
e
) =>
setFile(
e.target.files?.[0] ||
null
)
}
style={{
width:
"100%",
marginTop:
8,
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
22,
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
<Message
text={
message
}
/>
)}
</Panel>
</>
)}

{/* COMUNICAZIONI */}

{section ===
"communications" && (
<>
<Panel>
<h2
style={{
marginTop: 0,
}}
>
Comunicazioni
</h2>

<p
style={{
color:
"#82919a",
}}
>
Invia un messaggio a un singolo dipendente oppure una comunicazione generale a tutto il personale.
</p>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 12,
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
16,
border:
"1px solid #344955",
borderRadius:
10,
background:
communicationMode ===
"individual"
? "#16c784"
: "#101e28",
color:
communicationMode ===
"individual"
? "#062019"
: "#fff",
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
16,
border:
"1px solid #344955",
borderRadius:
10,
background:
communicationMode ===
"general"
? "#16c784"
: "#101e28",
color:
communicationMode ===
"general"
? "#062019"
: "#fff",
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
<Field label="Dipendente destinatario">
<select
value={
communicationEmployee
}
onChange={(
e
) =>
setCommunicationEmployee(
e.target
.value
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

<Field label="Titolo">
<input
value={
communicationTitle
}
onChange={(
e
) =>
setCommunicationTitle(
e.target
.value
)
}
placeholder="Titolo della comunicazione"
style={
darkInput
}
/>
</Field>

<Field label="Messaggio">
<textarea
value={
communicationText
}
onChange={(
e
) =>
setCommunicationText(
e.target
.value
)
}
placeholder="Scrivi qui la comunicazione..."
rows={8}
style={{
...darkInput,
resize:
"vertical",
}}
/>
</Field>

<button
onClick={() => {
setMessage(
communicationMode ===
"individual"
? "Comunicazione individuale pronta per l'invio. Per renderla persistente collegheremo la sezione alla tabella comunicazioni di Supabase."
: "Comunicazione generale pronta per l'invio. Per renderla persistente collegheremo la sezione alla tabella comunicazioni di Supabase."
);
}}
style={{
...greenButton,
marginTop:
20,
}}
>
INVIA COMUNICAZIONE
</button>

{message && (
<Message
text={
message
}
/>
)}
</Panel>
</>
)}

{/* SCADENZE */}

{section ===
"expiry" && (
<>
<Panel>
<h2
style={{
marginTop: 0,
}}
>
Scadenze documenti
</h2>

<p
style={{
color:
"#82919a",
}}
>
Controllo dei documenti scaduti e in scadenza.
</p>
</Panel>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 18,
}}
>
<Panel>
<h3
style={{
color:
"#ffc857",
marginTop:
0,
}}
>
⚠️ In scadenza
</h3>

{expiringDocuments.length ===
0 ? (
<p
style={{
color:
"#82919a",
}}
>
Nessun documento in scadenza nei prossimi 30 giorni.
</p>
) : (
expiringDocuments.map(
({
doc,
employee,
}: any) => (
<ExpiryRow
key={
doc.id
}
doc={
doc
}
employee={
employee
}
openDocument={
openDocument
}
/>
)
)
)}
</Panel>

<Panel>
<h3
style={{
color:
"#ff7777",
marginTop:
0,
}}
>
🚨 Scaduti
</h3>

{expiredDocuments.length ===
0 ? (
<p
style={{
color:
"#82919a",
}}
>
Nessun documento scaduto.
</p>
) : (
expiredDocuments.map(
({
doc,
employee,
}: any) => (
<ExpiryRow
key={
doc.id
}
doc={
doc
}
employee={
employee
}
openDocument={
openDocument
}
/>
)
)
)}
</Panel>
</div>
</>
)}
</section>
</main>
);
}

function SidebarButton({
active,
onClick,
icon,
label,
}: any) {
return (
<button
onClick={
onClick
}
style={{
width:
"100%",
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
textAlign:
"left",
cursor:
"pointer",
fontSize:
14,
}}
>
<span
style={{
display:
"inline-block",
width: 25,
}}
>
{icon}
</span>

{label}
</button>
);
}

function Panel({
children,
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
24,
marginBottom:
20,
}}
>
{children}
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

function Message({
text,
}: {
text: string;
}) {
return (
<div
style={{
marginTop:
16,
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
28,
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

function QuickCard({
icon,
title,
text,
onClick,
}: any) {
return (
<button
onClick={
onClick
}
style={{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
14,
padding:
22,
textAlign:
"left",
color:
"#fff",
cursor:
"pointer",
}}
>
<div
style={{
fontSize:
26,
color:
"#16c784",
}}
>
{icon}
</div>

<h3>
{title}
</h3>

<p
style={{
color:
"#82919a",
fontSize:
13,
}}
>
{text}
</p>
</button>
);
}

function PaymentCard({
title,
icon,
employeeId,
setEmployeeId,
month,
setMonth,
year,
setYear,
file,
setFile,
submitting,
onUpload,
inputId,
buttonText,
employees,
}: any) {
return (
<Panel>
<div
style={{
fontSize:
30,
marginBottom:
8,
}}
>
{icon}
</div>

<h2
style={{
marginTop:
0,
}}
>
{title}
</h2>

<Field label="Dipendente">
<select
value={
employeeId
}
onChange={(
e
) =>
setEmployeeId(
e.target
.value
)
}
style={
darkSelect
}
>
<option value="">
Seleziona dipendente
</option>

{employees.map(
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

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 12,
}}
>
<Field label="Mese">
<select
value={
month
}
onChange={(
e
) =>
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
key={
name
}
value={
index +
1
}
>
{
name
}
</option>
)
)}
</select>
</Field>

<Field label="Anno">
<select
value={
year
}
onChange={(
e
) =>
setYear(
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
</div>

<Field label="Documento PDF">
<input
id={
inputId
}
type="file"
accept="application/pdf,.pdf"
onChange={(
e
) =>
setFile(
e.target
.files?.[0] ||
null
)
}
style={{
width:
"100%",
color:
"#cbd6da",
marginTop:
8,
}}
/>
</Field>

<button
onClick={
onUpload
}
disabled={
submitting
}
style={{
...greenButton,
marginTop:
22,
opacity:
submitting
? 0.65
: 1,
}}
>
{submitting
? "CARICAMENTO..."
: buttonText}
</button>
</Panel>
);
}

function DocumentRow({
doc,
employeeName,
openDocument,
}: any) {
return (
<div
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
gap: 15,
}}
>
<div>
<strong>
{employeeName ||
"Dipendente"}
</strong>

<div
style={{
color:
"#82919a",
fontSize:
12,
marginTop:
4,
}}
>
{documentLabel(
doc.document_type
)}{" "}
·{" "}
{doc.month
? `${doc.month}/${doc.year}`
: doc.year}
</div>

<div
style={{
color:
"#677981",
fontSize:
11,
marginTop:
3,
}}
>
{doc.file_name}
</div>
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
borderRadius:
9,
padding:
"10px 15px",
fontWeight:
900,
cursor:
"pointer",
}}
>
Apri PDF
</button>
</div>
);
}

function ExpiryRow({
doc,
employee,
openDocument,
}: any) {
return (
<div
style={{
borderTop:
"1px solid #263841",
padding:
"13px 0",
display:
"flex",
justifyContent:
"space-between",
alignItems:
"center",
gap: 12,
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
"#82919a",
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

<div
style={{
textAlign:
"right",
}}
>
<div
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
fontSize:
12,
}}
>
{formatDate(
doc.expiry_date
)}
</div>

<button
onClick={() =>
openDocument(
doc
)
}
style={{
marginTop:
6,
background:
"transparent",
border:
"1px solid #344955",
color:
"#cbd6da",
borderRadius:
7,
padding:
"6px 9px",
cursor:
"pointer",
}}
>
Apri
</button>
</div>
</div>
);
}

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
style={{
padding:
"10px 17px",
border:
"1px solid #30424d",
borderRadius:
9,
background:
"#13222c",
color:
"#dce6e9",
fontWeight:
700,
cursor:
"pointer",
}}
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
padding: 30,
}}
>
<div
style={{
background:
"linear-gradient(135deg,#07141f,#102d39)",
borderRadius:
20,
padding: 30,
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

<Panel>
<h2
style={{
marginTop:
0,
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
(
doc: Document
) => (
<DocumentRow
key={
doc.id
}
doc={
doc
}
employeeName=""
openDocument={
openDocument
}
/>
)
)
)}
</Panel>

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
{
session.user
.email
}
</strong>
</div>
</section>
</main>
);
}
