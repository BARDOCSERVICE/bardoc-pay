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

type Communication = {
id: string;
employee_id: string | null;
title: string;
message: string;
created_at: string;
general: boolean;
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
lavoro: [
{
value: "work_contract",
label: "Contratto di lavoro",
},
],
};

const CATEGORY_LABELS: Record<string, string> = {
personali: "Documenti anagrafici",
lavoro: "Rapporto contrattuale",
};

function documentLabel(type: string) {
if (type === "payslip") return "Busta paga";
if (type === "payment_statement")
return "Distinta di pagamento";
if (type === "id_card")
return "Documento d'identità";
if (type === "driver_license")
return "Patente";
if (type === "work_contract")
return "Contratto di lavoro";

return type;
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

const [communications, setCommunications] =
useState<Communication[]>([]);

const [adminLoading, setAdminLoading] =
useState(false);

const [section, setSection] =
useState<
| "dashboard"
| "employees"
| "payslips"
| "payments"
| "documents"
| "communications"
| "deadlines"
>("dashboard");

const [search, setSearch] =
useState("");

const [selectedEmployee, setSelectedEmployee] =
useState("");

const [documentType, setDocumentType] =
useState("id_card");

const [documentCategory, setDocumentCategory] =
useState("personali");

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

const [selectedEmployeeProfile, setSelectedEmployeeProfile] =
useState<Employee | null>(null);

const [employeePhotoUrl, setEmployeePhotoUrl] =
useState("");

const [employeePhoto, setEmployeePhoto] =
useState<File | null>(null);

const [photoUploading, setPhotoUploading] =
useState(false);

const [communicationTitle, setCommunicationTitle] =
useState("");

const [communicationMessage, setCommunicationMessage] =
useState("");

const [communicationType, setCommunicationType] =
useState<
"individual" | "general"
>("individual");

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

const requiresTaxCode =
documentType === "driver_license";

const allowsExpiry =
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
loadAdminData();
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
setCommunications([]);
setEmail("");
setPassword("");
}

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

const {
data: documentData,
error: documentError,
} = await supabase
.from("documents")
.select("*")
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

if (documentError) {
console.error(documentError);
} else {
setAllDocuments(
documentData || []
);
}

const {
data: communicationData,
error: communicationError,
} = await supabase
.from("communications")
.select("*")
.order("created_at", {
ascending: false,
});

if (!communicationError) {
setCommunications(
communicationData || []
);
}

setAdminLoading(false);
}

async function loadEmployeeArea() {
if (!session?.user?.id) return;

const {
data: emp,
error: empError,
} = await supabase
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
.eq(
"employee_id",
emp.id
)
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

if (!docsError) {
setDocuments(docs || []);
}

const {
data: comms,
error: commError,
} = await supabase
.from("communications")
.select("*")
.or(
`employee_id.eq.${emp.id},general.eq.true`
)
.order("created_at", {
ascending: false,
});

if (!commError) {
setCommunications(
comms || []
);
}
}

function resetDocumentForm() {
setSelectedEmployee("");
setDocumentType("id_card");
setDocumentCategory("personali");
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

let folder =
selectedEmployee;

if (
documentType ===
"payslip"
) {
folder =
`${selectedEmployee}/payslips`;
}

if (
documentType ===
"payment_statement"
) {
folder =
`${selectedEmployee}/payments`;
}

if (
documentType ===
"id_card" ||
documentType ===
"driver_license"
) {
folder =
`${selectedEmployee}/personal`;
}

if (
documentType ===
"work_contract"
) {
folder =
`${selectedEmployee}/employment`;
}

const storagePath =
`${folder}/${Date.now()}_${safeFileName}`;

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

async function openEmployeeProfile(
emp: Employee
) {
setSelectedEmployeeProfile(
emp
);

setEmployeePhotoUrl("");

if (!emp.photo_path) return;

const {
data,
error,
} =
await supabase.storage
.from("employee-photos")
.createSignedUrl(
emp.photo_path,
600
);

if (!error && data?.signedUrl) {
setEmployeePhotoUrl(
data.signedUrl
);
}
}

async function uploadEmployeePhoto() {
if (!selectedEmployeeProfile) {
return;
}

if (!employeePhoto) {
setMessage(
"Seleziona una foto."
);
return;
}

if (
![
"image/jpeg",
"image/png",
"image/webp",
].includes(
employeePhoto.type
)
) {
setMessage(
"La foto deve essere JPG, PNG oppure WEBP."
);
return;
}

setPhotoUploading(true);

try {
const extension =
employeePhoto.type ===
"image/png"
? "png"
: employeePhoto.type ===
"image/webp"
? "webp"
: "jpg";

const storagePath =
`${selectedEmployeeProfile.id}/${crypto.randomUUID()}.${extension}`;

const {
error: uploadError,
} =
await supabase.storage
.from(
"employee-photos"
)
.upload(
storagePath,
employeePhoto,
{
upsert: false,
contentType:
employeePhoto.type,
}
);

if (uploadError) {
throw uploadError;
}

const {
error: updateError,
} =
await supabase
.from("employees")
.update({
photo_path:
storagePath,
})
.eq(
"id",
selectedEmployeeProfile.id
);

if (updateError) {
throw updateError;
}

const updated = {
...selectedEmployeeProfile,
photo_path:
storagePath,
};

setSelectedEmployeeProfile(
updated
);

setEmployees((current) =>
current.map((emp) =>
emp.id === updated.id
? updated
: emp
)
);

const {
data,
} =
await supabase.storage
.from(
"employee-photos"
)
.createSignedUrl(
storagePath,
600
);

if (data?.signedUrl) {
setEmployeePhotoUrl(
data.signedUrl
);
}

setEmployeePhoto(null);

setMessage(
"Foto caricata correttamente. ✅"
);
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento della foto."
);
}

setPhotoUploading(false);
}

async function sendCommunication() {
setMessage("");

if (
!communicationTitle.trim()
) {
setMessage(
"Inserisci il titolo della comunicazione."
);
return;
}

if (
!communicationMessage.trim()
) {
setMessage(
"Inserisci il testo della comunicazione."
);
return;
}

if (
communicationType ===
"individual" &&
!selectedEmployee
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
communicationType ===
"individual"
? selectedEmployee
: null,

title:
communicationTitle.trim(),

message:
communicationMessage.trim(),

general:
communicationType ===
"general",
});

if (error) {
throw error;
}

setCommunicationTitle("");
setCommunicationMessage("");
setCommunicationType(
"individual"
);

setMessage(
communicationType ===
"individual"
? "Comunicazione inviata al dipendente. ✅"
: "Comunicazione generale inviata a tutti i dipendenti. ✅"
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

const filteredEmployees =
useMemo(() => {
const q =
search
.trim()
.toLowerCase();

if (!q) return employees;

return employees.filter(
(emp) =>
emp.full_name
.toLowerCase()
.includes(q) ||
(emp.email || "")
.toLowerCase()
.includes(q) ||
(emp.fiscal_code || "")
.toLowerCase()
.includes(q)
);
}, [
search,
employees,
]);

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

const expiringDocuments =
useMemo(
() =>
allDocuments
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
),
[
allDocuments,
employees,
]
);

const expiredDocuments =
useMemo(
() =>
allDocuments
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
),
[
allDocuments,
employees,
]
);

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
width: 72,
height: 72,
borderRadius: 18,
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
fontSize: 40,
fontWeight:
900,
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
<Login
email={email}
setEmail={setEmail}
password={password}
setPassword={setPassword}
loginMode={loginMode}
setLoginMode={setLoginMode}
submitting={submitting}
message={message}
handleSubmit={
handleSubmit
}
/>
);
}

if (!isAdmin) {
return (
<EmployeeArea
employee={employee}
documents={documents}
communications={
communications
}
openDocument={
openDocument
}
logout={logout}
session={session}
/>
);
}

return (
<AdminDashboard
section={section}
setSection={setSection}
employees={employees}
filteredEmployees={
filteredEmployees
}
documents={allDocuments}
payslips={payslips}
paymentStatements={
paymentStatements
}
search={search}
setSearch={setSearch}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
documentCategory={
documentCategory
}
setDocumentCategory={
(value: string) => {
setDocumentCategory(
value
);

const first =
DOCUMENT_TYPES[
value
]?.[0];

if (first) {
setDocumentType(
first.value
);
}

setTaxCode("");
setExpiryDate("");
}
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
setFile={setFile}
submitting={submitting}
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
selectedEmployeeProfile={
selectedEmployeeProfile
}
setSelectedEmployeeProfile={
setSelectedEmployeeProfile
}
employeePhotoUrl={
employeePhotoUrl
}
employeePhoto={
employeePhoto
}
setEmployeePhoto={
setEmployeePhoto
}
uploadEmployeePhoto={
uploadEmployeePhoto
}
photoUploading={
photoUploading
}
communicationType={
communicationType
}
setCommunicationType={
setCommunicationType
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
communications={
communications
}
/>
);
}

/* LOGIN */

function Login({
email,
setEmail,
password,
setPassword,
loginMode,
setLoginMode,
submitting,
message,
handleSubmit,
}: any) {
return (
<main
style={{
minHeight:
"100vh",
background:
"linear-gradient(135deg,#07141f,#102936,#07141f)",
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
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 44,
fontWeight:
900,
}}
>
B
</div>

<div
style={{
color:
"#16c784",
fontWeight:
800,
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
onClick={() =>
setLoginMode(
!loginMode
)
}
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

/* ADMIN */

function AdminDashboard({
section,
setSection,
employees,
filteredEmployees,
documents,
payslips,
paymentStatements,
search,
setSearch,
selectedEmployee,
setSelectedEmployee,
documentCategory,
setDocumentCategory,
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
selectedEmployeeProfile,
setSelectedEmployeeProfile,
employeePhotoUrl,
employeePhoto,
setEmployeePhoto,
uploadEmployeePhoto,
photoUploading,
communicationType,
setCommunicationType,
communicationTitle,
setCommunicationTitle,
communicationMessage,
setCommunicationMessage,
sendCommunication,
communications,
}: any) {
const isPayroll =
section === "payslips" ||
section === "payments";

const isPersonal =
documentCategory ===
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
section ===
"dashboard"
}
onClick={() =>
setSection(
"dashboard"
)
}
>
⌂ Dashboard
</SidebarButton>

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
>
♙ Dipendenti
</SidebarButton>

<SidebarButton
active={
section ===
"payslips"
}
onClick={() =>
setSection(
"payslips"
)
}
>
💰 Buste paga
</SidebarButton>

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
>
🏦 Distinte di pagamento
</SidebarButton>

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
>
📁 Documenti
</SidebarButton>

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
>
💬 Comunicazioni
</SidebarButton>

<SidebarButton
active={
section ===
"deadlines"
}
onClick={() =>
setSection(
"deadlines"
)
}
>
◷ Scadenze
</SidebarButton>

<div
style={{
marginTop:
35,
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
onClick={logout}
style={{
width:
"100%",
marginTop:
30,
padding:
12,
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
</aside>

<section
style={{
flex: 1,
padding:
28,
boxSizing:
"border-box",
overflowX:
"auto",
}}
>
{section ===
"dashboard" && (
<DashboardHome
employees={
employees
}
documents={
documents
}
expiringDocuments={
expiringDocuments
}
expiredDocuments={
expiredDocuments
}
setSection={
setSection
}
/>
)}

{section ===
"employees" && (
<EmployeesSection
employees={
filteredEmployees
}
search={search}
setSearch={
setSearch
}
adminLoading={
adminLoading
}
selectedEmployeeProfile={
selectedEmployeeProfile
}
setSelectedEmployeeProfile={
setSelectedEmployeeProfile
}
employeePhotoUrl={
employeePhotoUrl
}
employeePhoto={
employeePhoto
}
setEmployeePhoto={
setEmployeePhoto
}
uploadEmployeePhoto={
uploadEmployeePhoto
}
photoUploading={
photoUploading
}
documents={
documents
}
openDocument={
openDocument
}
setSection={
setSection
}
/>
)}

{(section ===
"payslips" ||
section ===
"payments") && (
<PayrollSection
type={
section ===
"payslips"
? "payslip"
: "payment_statement"
}
documents={
section ===
"payslips"
? payslips
: paymentStatements
}
employees={
employees
}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
month={month}
setMonth={setMonth}
year={year}
setYear={setYear}
file={file}
setFile={setFile}
submitting={
submitting
}
uploadDocument={
uploadDocument
}
openDocument={
openDocument
}
message={message}
/>
)}

{section ===
"documents" && (
<DocumentsSection
employees={
employees
}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
documentCategory={
documentCategory
}
setDocumentCategory={
setDocumentCategory
}
documentType={
documentType
}
setDocumentType={
setDocumentType
}
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
uploadDocument={
uploadDocument
}
message={message}
/>
)}

{section ===
"communications" && (
<CommunicationsSection
employees={
employees
}
communicationType={
communicationType
}
setCommunicationType={
setCommunicationType
}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
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
submitting={
submitting
}
message={message}
communications={
communications
}
/>
)}

{section ===
"deadlines" && (
<DeadlinesSection
expiringDocuments={
expiringDocuments
}
expiredDocuments={
expiredDocuments
}
openDocument={
openDocument
}
/>
)}
</section>
</main>
);
}

/* DASHBOARD */

function DashboardHome({
employees,
documents,
expiringDocuments,
expiredDocuments,
setSection,
}: any) {
return (
<>
<Header
title="Dashboard"
subtitle="Gestione del personale BARDOC SERVICE"
/>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(4,minmax(180px,1fr))",
gap: 14,
marginBottom:
20,
}}
>
<Stat
title="Dipendenti attivi"
value={
employees.length
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
"repeat(3,minmax(220px,1fr))",
gap: 16,
}}
>
<QuickCard
title="Dipendenti"
description="Cerca e gestisci le schede del personale."
button="GESTISCI DIPENDENTI"
onClick={() =>
setSection(
"employees"
)
}
/>

<QuickCard
title="Buste paga"
description="Carica e consulta le buste paga mensili."
button="GESTISCI BUSTE PAGA"
onClick={() =>
setSection(
"payslips"
)
}
/>

<QuickCard
title="Comunicazioni"
description="Invia comunicazioni individuali o generali."
button="APRI COMUNICAZIONI"
onClick={() =>
setSection(
"communications"
)
}
/>
</div>
</>
);
}

/* EMPLOYEES */

function EmployeesSection({
employees,
search,
setSearch,
adminLoading,
selectedEmployeeProfile,
setSelectedEmployeeProfile,
employeePhotoUrl,
employeePhoto,
setEmployeePhoto,
uploadEmployeePhoto,
photoUploading,
documents,
openDocument,
setSection,
}: any) {
if (
selectedEmployeeProfile
) {
const employeeDocs =
documents.filter(
(doc: Document) =>
doc.employee_id ===
selectedEmployeeProfile.id
);

return (
<>
<Header
title="Scheda dipendente"
subtitle="Fascicolo digitale del dipendente"
/>

<button
onClick={() =>
setSelectedEmployeeProfile(
null
)
}
style={
backButton
}
>
← Torna ai dipendenti
</button>

<div
style={{
display:
"grid",
gridTemplateColumns:
"280px minmax(0,1fr)",
gap: 20,
marginTop:
18,
}}
>
<div
style={
cardStyle
}
>
<div
style={{
textAlign:
"center",
}}
>
{employeePhotoUrl ? (
<img
src={
employeePhotoUrl
}
alt={
selectedEmployeeProfile.full_name
}
style={{
width: 180,
height: 180,
objectFit:
"cover",
borderRadius:
"50%",
border:
"4px solid #16c784",
}}
/>
) : (
<div
style={{
width: 180,
height: 180,
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
fontSize: 50,
fontWeight:
900,
margin:
"0 auto",
}}
>
{initials(
selectedEmployeeProfile.full_name
)}
</div>
)}

<h2>
{
selectedEmployeeProfile.full_name
}
</h2>

<div
style={{
color:
"#16c784",
fontWeight:
800,
}}
>
● ATTIVO
</div>

<label
style={{
display:
"block",
marginTop:
20,
padding:
12,
borderRadius:
9,
background:
"#16c784",
color:
"#062019",
fontWeight:
800,
cursor:
"pointer",
}}
>
📷 Carica / cambia foto

<input
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={(
e
) =>
setEmployeePhoto(
e.target.files?.[0] ||
null
)
}
style={{
display:
"none",
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
...greenButton,
marginTop:
10,
}}
>
{photoUploading
? "CARICAMENTO..."
: "SALVA FOTO"}
</button>
)}
</div>
</div>

<div>
<div
style={
cardStyle
}
>
<h2>
Dati personali
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(200px,1fr))",
gap: 14,
}}
>
<Info
label="Nome completo"
value={
selectedEmployeeProfile.full_name
}
/>

<Info
label="Email"
value={
selectedEmployeeProfile.email ||
"—"
}
/>

<Info
label="Codice fiscale"
value={
selectedEmployeeProfile.fiscal_code ||
"—"
}
/>

<Info
label="Stato"
value="Attivo"
/>
</div>
</div>

<div
style={{
...cardStyle,
marginTop:
18,
}}
>
<h2>
Fascicolo digitale
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(3,minmax(180px,1fr))",
gap: 12,
}}
>
<FolderCard
title="Buste paga"
count={
employeeDocs.filter(
(d) =>
d.document_type ===
"payslip"
).length
}
onClick={() =>
setSection(
"payslips"
)
}
/>

<FolderCard
title="Distinte di pagamento"
count={
employeeDocs.filter(
(d) =>
d.document_type ===
"payment_statement"
).length
}
onClick={() =>
setSection(
"payments"
)
}
/>

<FolderCard
title="Documenti personali"
count={
employeeDocs.filter(
(d) =>
d.document_type ===
"id_card" ||
d.document_type ===
"driver_license"
).length
}
onClick={() =>
setSection(
"documents"
)
}
/>

<FolderCard
title="Rapporto contrattuale"
count={
employeeDocs.filter(
(d) =>
d.document_type ===
"work_contract"
).length
}
onClick={() =>
setSection(
"documents"
)
}
/>
</div>
</div>
</div>
</div>
</>
);
}

return (
<>
<Header
title="Dipendenti"
subtitle="Cerca e gestisci le schede del personale"
/>

<div
style={
cardStyle
}
>
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
marginBottom:
18,
}}
/>

{adminLoading ? (
<div>
Caricamento...
</div>
) : employees.length ===
0 ? (
<div
style={{
color:
"#81919a",
}}
>
Nessun dipendente trovato.
</div>
) : (
employees.map(
(
emp: Employee
) => (
<button
key={
emp.id
}
onClick={() =>
setSelectedEmployeeProfile(
emp
)
}
style={{
width:
"100%",
display:
"flex",
alignItems:
"center",
gap: 14,
padding:
14,
background:
"#101e28",
border:
"1px solid #293c47",
borderRadius:
12,
color:
"#fff",
textAlign:
"left",
cursor:
"pointer",
marginBottom:
10,
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
"#81919a",
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
"#81919a",
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
fontWeight:
800,
fontSize:
12,
}}
>
ATTIVO
</span>
</button>
)
)
)}
</div>
</>
);
}

/* PAYROLL */

function PayrollSection({
type,
documents,
employees,
selectedEmployee,
setSelectedEmployee,
month,
setMonth,
year,
setYear,
file,
setFile,
submitting,
uploadDocument,
openDocument,
message,
}: any) {
const title =
type === "payslip"
? "Buste paga"
: "Distinte di pagamento";

return (
<>
<Header
title={title}
subtitle={
type ===
"payslip"
? "Gestione delle buste paga dei dipendenti"
: "Gestione delle distinte di pagamento"
}
/>

<div
style={
cardStyle
}
>
<h2>
Carica{" "}
{type ===
"payslip"
? "busta paga"
: "distinta di pagamento"}
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(4,minmax(160px,1fr))",
gap: 14,
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
m,
i
) => (
<option
key={m}
value={
i + 1
}
>
{m}
</option>
)
)}
</select>
</Field>

<Field label="Anno">
<select
value={year}
onChange={(e) =>
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

<Field label="PDF">
<input
type="file"
accept="application/pdf,.pdf"
onChange={(e) =>
setFile(
e.target.files?.[0] ||
null
)
}
style={{
color:
"#cbd6da",
width:
"100%",
}}
/>
</Field>
</div>

<button
onClick={() => {
uploadDocument();
}}
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
: type ===
"payslip"
? "CARICA BUSTA PAGA"
: "CARICA DISTINTA"}
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
style={
cardStyle
}
>
<h2>
Documenti caricati
</h2>

{documents.length ===
0 ? (
<Empty text="Nessun documento presente." />
) : (
documents.map(
(doc: Document) => {
const emp =
employees.find(
(
e: Employee
) =>
e.id ===
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
</div>
</>
);
}

/* DOCUMENTS */

function DocumentsSection({
employees,
selectedEmployee,
setSelectedEmployee,
documentCategory,
setDocumentCategory,
documentType,
setDocumentType,
year,
setYear,
taxCode,
setTaxCode,
expiryDate,
setExpiryDate,
file,
setFile,
submitting,
uploadDocument,
message,
}: any) {
const requiresTaxCode =
documentType ===
"driver_license";

const allowsExpiry =
documentType ===
"id_card" ||
documentType ===
"driver_license";

return (
<>
<Header
title="Documenti"
subtitle="Caricamento dei documenti anagrafici e del rapporto contrattuale"
/>

<div
style={
cardStyle
}
>
<h2>
Carica documento
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(220px,1fr))",
gap: 15,
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

<Field
label="Categoria"
>
<select
value={
documentCategory
}
onChange={(e) =>
setDocumentCategory(
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
DOCUMENT_TYPES[
documentCategory
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
value={year}
onChange={(e) =>
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

{documentCategory ===
"personali" && (
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
</Field>
)}

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
color:
"#cbd6da",
width:
"100%",
}}
/>
</Field>
</div>

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
);
}

/* COMMUNICATIONS */

function CommunicationsSection({
employees,
communicationType,
setCommunicationType,
selectedEmployee,
setSelectedEmployee,
communicationTitle,
setCommunicationTitle,
communicationMessage,
setCommunicationMessage,
sendCommunication,
submitting,
message,
communications,
}: any) {
return (
<>
<Header
title="Comunicazioni"
subtitle="Invia comunicazioni individuali o generali"
/>

<div
style={
cardStyle
}
>
<h2>
Nuova comunicazione
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 15,
}}
>
<Field
label="Tipo comunicazione"
>
<select
value={
communicationType
}
onChange={(e) =>
setCommunicationType(
e.target
.value
)
}
style={
darkSelect
}
>
<option value="individual">
Comunicazione individuale
</option>

<option value="general">
Comunicazione generale
</option>
</select>
</Field>

{communicationType ===
"individual" && (
<Field
label="Destinatario"
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
)}
</div>

<Field label="Titolo">
<input
value={
communicationTitle
}
onChange={(e) =>
setCommunicationTitle(
e.target.value
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
communicationMessage
}
onChange={(e) =>
setCommunicationMessage(
e.target.value
)
}
placeholder="Scrivi il messaggio..."
rows={7}
style={{
...darkInput,
resize:
"vertical",
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
: communicationType ===
"individual"
? "INVIA AL DIPENDENTE"
: "INVIA A TUTTI"}
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
style={
cardStyle
}
>
<h2>
Comunicazioni inviate
</h2>

{communications.length ===
0 ? (
<Empty text="Nessuna comunicazione presente." />
) : (
communications.map(
(
comm: Communication
) => (
<div
key={
comm.id
}
style={{
borderTop:
"1px solid #293c47",
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
gap: 15,
}}
>
<strong>
{
comm.title
}
</strong>

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
{comm.general
? "GENERALE"
: "INDIVIDUALE"}
</span>
</div>

<p
style={{
color:
"#9aaab2",
whiteSpace:
"pre-wrap",
lineHeight:
1.5,
}}
>
{
comm.message
}
</p>

<small
style={{
color:
"#71828c",
}}
>
{new Date(
comm.created_at
).toLocaleString(
"it-IT"
)}
</small>
</div>
)
)
)}
</div>
</>
);
}

/* DEADLINES */

function DeadlinesSection({
expiringDocuments,
expiredDocuments,
openDocument,
}: any) {
return (
<>
<Header
title="Scadenze"
subtitle="Controllo dei documenti in scadenza e scaduti"
/>

<div
style={
cardStyle
}
>
<h2>
⚠️ Documenti in scadenza
</h2>

{expiringDocuments.length ===
0 ? (
<Empty text="Nessun documento in scadenza nei prossimi 30 giorni." />
) : (
expiringDocuments.map(
({
doc,
employee,
}: any) => (
<DeadlineRow
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
</div>

<div
style={{
...cardStyle,
marginTop:
18,
}}
>
<h2>
🚨 Documenti scaduti
</h2>

{expiredDocuments.length ===
0 ? (
<Empty text="Non risultano documenti scaduti." />
) : (
expiredDocuments.map(
({
doc,
employee,
}: any) => (
<DeadlineRow
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
</div>
</>
);
}

/* COMPONENTS */

function Header({
title,
subtitle,
}: any) {
return (
<header
style={{
marginBottom:
24,
}}
>
<h1
style={{
margin: 0,
fontSize:
27,
}}
>
{title}
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
{subtitle}
</div>
</header>
);
}

function SidebarButton({
children,
active,
onClick,
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
textAlign:
"left",
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

function Stat({
title,
value,
alert,
danger,
}: any) {
return (
<div
style={
cardStyle
}
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

function QuickCard({
title,
description,
button,
onClick,
}: any) {
return (
<div
style={
cardStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
{title}
</h2>

<p
style={{
color:
"#82919a",
minHeight:
45,
lineHeight:
1.5,
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
10,
}}
>
{button}
</button>
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
14,
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

function Info({
label,
value,
}: any) {
return (
<div
style={{
padding:
16,
background:
"#101e28",
border:
"1px solid #293c47",
borderRadius:
10,
}}
>
<small
style={{
color:
"#71828c",
}}
>
{label}
</small>

<div
style={{
marginTop:
6,
fontWeight:
800,
}}
>
{value}
</div>
</div>
);
}

function FolderCard({
title,
count,
onClick,
}: any) {
return (
<button
onClick={
onClick
}
style={{
padding:
18,
background:
"#101e28",
border:
"1px solid #293c47",
borderRadius:
12,
color:
"#fff",
textAlign:
"left",
cursor:
"pointer",
}}
>
<div
style={{
fontWeight:
800,
}}
>
{title}
</div>

<div
style={{
color:
"#16c784",
fontSize:
13,
marginTop:
7,
}}
>
{count} documenti
</div>
</button>
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
"1px solid #293c47",
padding:
"15px 0",
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
{doc.month
? ` · ${doc.month}/${doc.year}`
: ` · ${doc.year}`}
</div>

<div
style={{
color:
"#71828c",
fontSize:
12,
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
style={
smallGreenButton
}
>
Apri PDF
</button>
</div>
);
}

function DeadlineRow({
doc,
employee,
openDocument,
}: any) {
const status =
expiryStatus(
doc.expiry_date
);

return (
<div
style={{
borderTop:
"1px solid #293c47",
padding:
"15px 0",
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

<div
style={{
display:
"flex",
alignItems:
"center",
gap: 12,
}}
>
<span
style={{
color:
status ===
"expired"
? "#ff7777"
: "#ffc857",
fontWeight:
800,
}}
>
{formatDate(
doc.expiry_date
)}
</span>

<button
onClick={() =>
openDocument(
doc
)
}
style={
smallGreenButton
}
>
PDF
</button>
</div>
</div>
);
}

function Message({
text,
}: any) {
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

function Empty({
text,
}: any) {
return (
<div
style={{
color:
"#81919a",
padding:
"15px 0",
}}
>
{text}
</div>
);
}

function EmployeeArea({
employee,
documents,
communications,
openDocument,
logout,
session,
}: any) {
const payslips =
documents.filter(
(d: Document) =>
d.document_type ===
"payslip"
);

const payments =
documents.filter(
(d: Document) =>
d.document_type ===
"payment_statement"
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

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(0,1fr))",
gap: 18,
marginTop:
20,
}}
>
<EmployeeDocumentsCard
title="Buste paga"
documents={
payslips
}
openDocument={
openDocument
}
/>

<EmployeeDocumentsCard
title="Distinte di pagamento"
documents={
payments
}
openDocument={
openDocument
}
/>
</div>

<div
style={{
...cardStyle,
marginTop:
20,
}}
>
<h2>
📁 I miei documenti
</h2>

{documents.length ===
0 ? (
<Empty text="Non sono presenti documenti." />
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
</div>

<div
style={{
...cardStyle,
marginTop:
20,
}}
>
<h2>
💬 Comunicazioni
</h2>

{communications.length ===
0 ? (
<Empty text="Non sono presenti comunicazioni." />
) : (
communications.map(
(
comm: Communication
) => (
<div
key={
comm.id
}
style={{
borderTop:
"1px solid #293c47",
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
}}
>
<strong>
{
comm.title
}
</strong>

<span
style={{
color:
"#16c784",
fontSize:
11,
fontWeight:
800,
}}
>
{comm.general
? "GENERALE"
: "PRIVATA"}
</span>
</div>

<p
style={{
whiteSpace:
"pre-wrap",
color:
"#a9b8c0",
lineHeight:
1.5,
}}
>
{
comm.message
}
</p>

<small
style={{
color:
"#71828c",
}}
>
{new Date(
comm.created_at
).toLocaleString(
"it-IT"
)}
</small>
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
{
session.user.email
}
</strong>
</div>
</section>
</main>
);
}

function EmployeeDocumentsCard({
title,
documents,
openDocument,
}: any) {
return (
<div
style={
cardStyle
}
>
<h2>
{title}
</h2>

{documents.length ===
0 ? (
<Empty text="Nessun documento presente." />
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
</div>
);
}

const cardStyle: React.CSSProperties =
{
background:
"#172630",
border:
"1px solid #293c47",
borderRadius:
16,
padding:
22,
boxSizing:
"border-box",
};

const darkInput: React.CSSProperties =
{
width:
"100%",
boxSizing:
"border-box",
padding:
"13px 14px",
borderRadius:
9,
border:
"1px solid #344955",
background:
"#101e28",
color:
"#fff",
fontSize:
14,
outline:
"none",
};

const darkSelect: React.CSSProperties =
{
width:
"100%",
padding:
13,
borderRadius:
9,
border:
"1px solid #344955",
background:
"#101e28",
color:
"#fff",
boxSizing:
"border-box",
fontSize:
14,
};

const greenButton: React.CSSProperties =
{
width:
"100%",
padding:
14,
border:
"none",
borderRadius:
10,
background:
"#16c784",
color:
"#062019",
fontWeight:
900,
cursor:
"pointer",
};

const smallGreenButton: React.CSSProperties =
{
background:
"#16c784",
border:
"none",
borderRadius:
8,
padding:
"9px 13px",
color:
"#062019",
fontWeight:
900,
cursor:
"pointer",
};

const backButton: React.CSSProperties =
{
border:
"none",
background:
"transparent",
color:
"#16c784",
fontWeight:
800,
cursor:
"pointer",
};
