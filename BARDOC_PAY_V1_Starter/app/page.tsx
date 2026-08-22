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
fiscal_code: string | null;
photo_path: string | null;
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

type AdminSection =
| "dashboard"
| "employees"
| "payments"
| "documents"
| "communications"
| "deadlines";

/* =========================================================
COSTANTI
========================================================= */

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
anagrafici: [
{
value: "id_card",
label: "Documento d'identità",
},
{
value: "driver_license",
label: "Patente",
},
{
value: "fiscal_code",
label: "Codice fiscale",
},
{
value: "curriculum",
label: "Curriculum / CV",
},
],

contrattuali: [
{
value: "work_contract",
label: "Contratto di lavoro",
},
{
value: "work_relationship",
label: "Rapporto di lavoro",
},
{
value: "leave_permit",
label: "Permessi e assenze",
},
],
};

const PAYMENT_TYPES = [
{
value: "payslip",
label: "Busta paga",
},
{
value: "payment_statement",
label: "Distinta di pagamento",
},
];

/* =========================================================
FUNZIONI UTILI
========================================================= */

function documentLabel(type: string) {
const all = [
...Object.values(DOCUMENT_TYPES).flat(),
...PAYMENT_TYPES,
];

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

const [adminLoading, setAdminLoading] =
useState(false);

const [adminSection, setAdminSection] =
useState<AdminSection>("dashboard");

const [search, setSearch] =
useState("");

const [selectedEmployee, setSelectedEmployee] =
useState("");

const [selectedEmployeeProfile, setSelectedEmployeeProfile] =
useState<Employee | null>(null);

const [employeePhotoUrl, setEmployeePhotoUrl] =
useState("");

const [employeePhoto, setEmployeePhoto] =
useState<File | null>(null);

const [photoUploading, setPhotoUploading] =
useState(false);

const [paymentType, setPaymentType] =
useState("payslip");

const [month, setMonth] =
useState(new Date().getMonth() + 1);

const [year, setYear] =
useState(CURRENT_YEAR);

const [documentCategory, setDocumentCategory] =
useState("anagrafici");

const [documentType, setDocumentType] =
useState("id_card");

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

const [communicationText, setCommunicationText] =
useState("");

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

/* =======================================================
AUTENTICAZIONE
======================================================= */

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

/* =======================================================
CARICAMENTO DATI
======================================================= */

useEffect(() => {
if (!session) return;

if (isAdmin) {
loadAdminData();
} else {
loadEmployeeArea();
}
}, [session, isAdmin]);

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

if (communicationError) {
console.warn(
"Tabella communications non disponibile:",
communicationError.message
);
} else {
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
.eq("employee_id", emp.id)
.order("year", {
ascending: false,
})
.order("month", {
ascending: false,
});

if (docsError) {
console.error(docsError);
} else {
setDocuments(docs || []);
}

const {
data: communicationData,
error: communicationError,
} = await supabase
.from("communications")
.select("*")
.or(
`employee_id.eq.${emp.id},is_general.eq.true`
)
.order("created_at", {
ascending: false,
});

if (!communicationError) {
setCommunications(
communicationData || []
);
}
}

/* =======================================================
LOGIN
======================================================= */

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

/* =======================================================
FOTO DIPENDENTE
======================================================= */

async function openEmployeeProfile(
emp: Employee
) {
setSelectedEmployeeProfile(emp);
setEmployeePhotoUrl("");
setEmployeePhoto(null);
setMessage("");

if (!emp.photo_path) return;

const { data, error } =
await supabase.storage
.from("employee-photos")
.createSignedUrl(
emp.photo_path,
600
);

if (error) {
console.error(error);
return;
}

if (data?.signedUrl) {
setEmployeePhotoUrl(
data.signedUrl
);
}
}

async function uploadEmployeePhoto() {
if (!selectedEmployeeProfile) {
setMessage(
"Seleziona un dipendente."
);
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

if (
employeePhoto.size >
5 * 1024 * 1024
) {
setMessage(
"La foto non può superare 5 MB."
);
return;
}

setPhotoUploading(true);
setMessage("");

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
} = await supabase.storage
.from("employee-photos")
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
} = await supabase
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

const updatedEmployee = {
...selectedEmployeeProfile,
photo_path:
storagePath,
};

setSelectedEmployeeProfile(
updatedEmployee
);

setEmployees(
(current) =>
current.map((emp) =>
emp.id ===
updatedEmployee.id
? updatedEmployee
: emp
)
);

const {
data: signedData,
} =
await supabase.storage
.from("employee-photos")
.createSignedUrl(
storagePath,
600
);

if (signedData?.signedUrl) {
setEmployeePhotoUrl(
signedData.signedUrl
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

/* =======================================================
UPLOAD DOCUMENTI GENERALI
======================================================= */

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
documentType ===
"driver_license" &&
!normalizedTaxCode
) {
setMessage(
"Per la patente il Codice Fiscale è obbligatorio."
);
return;
}

if (
(documentType ===
"id_card" ||
documentType ===
"driver_license") &&
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
} = await supabase.storage
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

/* =======================================================
UPLOAD BUSTE PAGA / DISTINTE
======================================================= */

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
"Seleziona una busta paga o distinta in PDF."
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
`${selectedEmployee}/${Date.now()}_${safeFileName}`;

const {
error: uploadError,
} = await supabase.storage
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

expiry_date:
null,
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

await loadAdminData();
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento."
);
}

setSubmitting(false);
}

function resetDocumentForm() {
setSelectedEmployee("");
setDocumentCategory(
"anagrafici"
);
setDocumentType(
"id_card"
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

function resetPaymentForm() {
setSelectedEmployee("");
setPaymentType("payslip");
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

/* =======================================================
APERTURA DOCUMENTO
======================================================= */

async function openDocument(
doc: Document
) {
const {
data,
error,
} = await supabase.storage
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

/* =======================================================
COMUNICAZIONI
======================================================= */

async function sendCommunication() {
setMessage("");

const title =
communicationTitle.trim();

const text =
communicationText.trim();

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
} = await supabase
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

setMessage(
communicationMode ===
"individual"
? "Comunicazione inviata al dipendente. ✅"
: "Comunicazione generale inviata a tutti i dipendenti. ✅"
);

setCommunicationTitle("");
setCommunicationText("");
setCommunicationEmployee("");

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

/* =======================================================
RICERCA
======================================================= */

const filteredEmployees =
useMemo(() => {
const q =
search
.trim()
.toLowerCase();

if (!q) {
return employees;
}

return employees.filter(
(emp) => {
return (
emp.full_name
.toLowerCase()
.includes(q) ||
(
emp.email || ""
)
.toLowerCase()
.includes(q) ||
(
emp.fiscal_code ||
""
)
.toLowerCase()
.includes(q)
);
}
);
}, [
search,
employees,
]);

/* =======================================================
FILTRI PAGAMENTI
======================================================= */

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

/* =======================================================
SCADENZE
======================================================= */

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
) ===
"warning"
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
) ===
"expired"
);
}, [
allDocuments,
employees,
]);

/* =======================================================
LOADING
======================================================= */

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
fontSize: 44,
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
Caricamento
BARDOC PAY...
</div>
</div>
</div>
);
}

/* =======================================================
LOGIN
======================================================= */

if (!session) {
return (
<LoginPage
email={email}
password={password}
setEmail={setEmail}
setPassword={setPassword}
loginMode={loginMode}
setLoginMode={
setLoginMode
}
submitting={
submitting
}
message={
message
}
handleSubmit={
handleSubmit
}
/>
);
}

/* =======================================================
AMMINISTRATORE
======================================================= */

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

payslips={
payslips
}

paymentStatements={
paymentStatements
}

communications={
communications
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

photoUploading={
photoUploading
}

uploadEmployeePhoto={
uploadEmployeePhoto
}

openEmployeeProfile={
openEmployeeProfile
}

paymentType={
paymentType
}

setPaymentType={
setPaymentType
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

documentCategory={
documentCategory
}

setDocumentCategory={(
value: string
) => {
setDocumentCategory(
value
);

const first =
DOCUMENT_TYPES[
value
]?.[0];

setDocumentType(
first?.value ||
"id_card"
);

setTaxCode("");
setExpiryDate("");
}}

documentType={
documentType
}

setDocumentType={(
value: string
) => {
setDocumentType(
value
);

if (
value !==
"driver_license" &&
value !==
"id_card"
) {
setExpiryDate("");
}

setTaxCode("");
}}

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

setMessage={
setMessage
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

sendCommunication={
sendCommunication
}
/>
);
}

/* =======================================================
AREA DIPENDENTE
======================================================= */

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
LOGIN PAGE
========================================================= */

function LoginPage({
email,
password,
setEmail,
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
"radial-gradient(circle at top,#12323c 0%,#07141f 55%,#03080d 100%)",
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
maxWidth:
460,
background:
"rgba(15,28,38,.96)",
border:
"1px solid #2b404b",
borderRadius:
26,
padding:
40,
boxShadow:
"0 30px 90px rgba(0,0,0,.55)",
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
width: 105,
height: 105,
margin:
"0 auto 18px",
borderRadius:
"50%",
border:
"2px solid #16c784",
background:
"linear-gradient(145deg,#16c784,#0b6650)",
color:
"#041711",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
fontSize:
62,
fontWeight:
900,
boxShadow:
"0 0 35px rgba(22,199,132,.25)",
}}
>
B
</div>

<div
style={{
color:
"#16c784",
fontSize:
13,
fontWeight:
900,
letterSpacing:
2,
}}
>
BARDOC SERVICE
</div>

<h1
style={{
margin:
"10px 0 5px",
fontSize:
30,
}}
>
BARDOC PAY
</h1>

<p
style={{
color:
"#95a6af",
margin:
"0 0 28px",
}}
>
Portale del personale
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
e.target
.value
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
e.target
.value
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
800,
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

/* =========================================================
DASHBOARD AMMINISTRATORE
========================================================= */

function AdminDashboard({
section,
setSection,
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
selectedEmployeeProfile,
setSelectedEmployeeProfile,
employeePhotoUrl,
employeePhoto,
setEmployeePhoto,
photoUploading,
uploadEmployeePhoto,
openEmployeeProfile,
paymentType,
setPaymentType,
month,
setMonth,
year,
setYear,
documentCategory,
setDocumentCategory,
documentType,
setDocumentType,
taxCode,
setTaxCode,
expiryDate,
setExpiryDate,
file,
setFile,
submitting,
message,
setMessage,
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
sendCommunication,
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
display:
"flex",
}}
>
{/* SIDEBAR */}

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
paddingBottom:
20,
borderBottom:
"1px solid #20313b",
marginBottom:
20,
}}
>
<div
style={{
fontSize:
21,
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
5,
}}
>
AMMINISTRAZIONE
</div>
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
"payments"
}
onClick={() =>
setSection(
"payments"
)
}
>
€ Gestione pagamenti
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
▣ Documenti
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
✉ Comunicazioni
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
flex:
1,
minHeight:
40,
}}
/>

<div
style={{
color:
"#6f8089",
fontSize:
11,
marginBottom:
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
width:
"100%",
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
800,
cursor:
"pointer",
}}
>
Esci
</button>
</aside>

{/* CONTENUTO */}

<section
style={{
flex:
1,
padding:
28,
boxSizing:
"border-box",
maxWidth:
1600,
overflowX:
"auto",
}}
>
{/* DASHBOARD */}

{section ===
"dashboard" && (
<DashboardHome
allEmployees={
allEmployees
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

{/* DIPENDENTI */}

{section ===
"employees" && (
<EmployeesSection
employees={
employees
}
allEmployees={
allEmployees
}
search={
search
}
setSearch={
setSearch
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
photoUploading={
photoUploading
}
uploadEmployeePhoto={
uploadEmployeePhoto
}
openEmployeeProfile={
openEmployeeProfile
}
documents={
documents
}
openDocument={
openDocument
}
adminLoading={
adminLoading
}
setSection={
setSection
}
/>
)}

{/* GESTIONE PAGAMENTI */}

{section ===
"payments" && (
<PaymentsSection
employees={
allEmployees
}
documents={
documents
}
payslips={
payslips
}
paymentStatements={
paymentStatements
}
selectedEmployee={
selectedEmployee
}
setSelectedEmployee={
setSelectedEmployee
}
paymentType={
paymentType
}
setPaymentType={
setPaymentType
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
uploadPayment={
uploadPayment
}
openDocument={
openDocument
}
setMessage={
setMessage
}
/>
)}

{/* DOCUMENTI */}

{section ===
"documents" && (
<DocumentsSection
employees={
allEmployees
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
year={
year
}
setYear={
setYear
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
/>
)}

{/* COMUNICAZIONI */}

{section ===
"communications" && (
<CommunicationsSection
employees={
allEmployees
}
communications={
communications
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
submitting={
submitting
}
message={
message
}
sendCommunication={
sendCommunication
}
/>
)}

{/* SCADENZE */}

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

/* =========================================================
DASHBOARD HOME
========================================================= */

function DashboardHome({
allEmployees,
documents,
expiringDocuments,
expiredDocuments,
setSection,
}: any) {
return (
<>
<PageHeader
eyebrow="AMMINISTRAZIONE"
title="Dashboard"
subtitle="Gestione completa del personale BARDOC SERVICE."
/>

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
"repeat(2,minmax(0,1fr))",
gap:
18,
}}
>
<QuickCard
title="Gestione pagamenti"
text="Carica e consulta buste paga e distinte di pagamento."
button="Apri gestione pagamenti"
onClick={() =>
setSection(
"payments"
)
}
/>

<QuickCard
title="Documenti"
text="Gestisci documenti anagrafici e rapporto contrattuale."
button="Apri documenti"
onClick={() =>
setSection(
"documents"
)
}
/>

<QuickCard
title="Comunicazioni"
text="Invia comunicazioni individuali oppure comunicazioni generali."
button="Apri comunicazioni"
onClick={() =>
setSection(
"communications"
)
}
/>

<QuickCard
title="Scadenze"
text="Controlla documenti in scadenza e documenti già scaduti."
button="Controlla scadenze"
onClick={() =>
setSection(
"deadlines"
)
}
/>
</div>
</>
);
}

/* =========================================================
DIPENDENTI
========================================================= */

function EmployeesSection({
employees,
allEmployees,
search,
setSearch,
selectedEmployeeProfile,
setSelectedEmployeeProfile,
employeePhotoUrl,
employeePhoto,
setEmployeePhoto,
photoUploading,
uploadEmployeePhoto,
openEmployeeProfile,
documents,
openDocument,
adminLoading,
setSection,
}: any) {
return (
<>
<PageHeader
eyebrow="PERSONALE"
title="Dipendenti"
subtitle="Cerca e gestisci il fascicolo digitale del personale."
/>

{!selectedEmployeeProfile ? (
<div
style={
panelStyle
}
>
<input
value={
search
}
onChange={(e) =>
setSearch(
e.target
.value
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
<EmptyState text="Caricamento dipendenti..." />
) : employees.length ===
0 ? (
<EmptyState text="Nessun dipendente trovato." />
) : (
employees.map(
(emp: Employee) => (
<button
key={
emp.id
}
onClick={() =>
openEmployeeProfile(
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
gap:
14,
padding:
15,
marginBottom:
10,
border:
"1px solid #2d414c",
borderRadius:
13,
background:
"#101e28",
color:
"#fff",
cursor:
"pointer",
textAlign:
"left",
}}
>
<div
style={{
width:
52,
height:
52,
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
flex:
1,
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
"#7f919b",
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
"#7f919b",
fontSize:
11,
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
11,
fontWeight:
900,
}}
>
● ATTIVO
</span>
</button>
)
)
)}

<div
style={{
marginTop:
15,
color:
"#748690",
fontSize:
12,
}}
>
{allEmployees.length} dipendenti attivi
</div>
</div>
) : (
<div
style={
panelStyle
}
>
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
"260px minmax(0,1fr)",
gap:
24,
}}
>
<div
style={{
...panelStyle,
textAlign:
"center",
margin:
0,
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
width:
175,
height:
175,
objectFit:
"cover",
borderRadius:
"50%",
border:
"4px solid #16c784",
display:
"block",
margin:
"0 auto 18px",
}}
/>
) : (
<div
style={{
width:
175,
height:
175,
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
fontSize:
55,
fontWeight:
900,
margin:
"0 auto 18px",
}}
>
{initials(
selectedEmployeeProfile.full_name
)}
</div>
)}

<strong
style={{
fontSize:
18,
}}
>
{
selectedEmployeeProfile.full_name
}
</strong>

<div
style={{
color:
"#16c784",
fontSize:
12,
fontWeight:
800,
marginTop:
8,
}}
>
● ATTIVO
</div>

<label
style={{
display:
"block",
marginTop:
22,
padding:
12,
background:
"#16c784",
color:
"#062019",
borderRadius:
9,
fontWeight:
900,
cursor:
"pointer",
}}
>
📷 Carica / cambia foto

<input
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={(e) =>
setEmployeePhoto(
e.target
.files?.[0] ||
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
width:
"100%",
marginTop:
10,
padding:
11,
border:
"1px solid #16c784",
borderRadius:
9,
background:
"transparent",
color:
"#16c784",
fontWeight:
900,
cursor:
"pointer",
}}
>
{photoUploading
? "CARICAMENTO..."
: "SALVA FOTO"}
</button>
)}
</div>

<div>
<h2
style={{
marginTop:
0,
}}
>
{
selectedEmployeeProfile.full_name
}
</h2>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(3,minmax(0,1fr))",
gap:
12,
}}
>
<InfoCard
title="Email"
value={
selectedEmployeeProfile.email ||
"—"
}
/>

<InfoCard
title="Codice fiscale"
value={
selectedEmployeeProfile.fiscal_code ||
"—"
}
/>

<InfoCard
title="Stato"
value="● Attivo"
green
/>
</div>

<h3
style={{
marginTop:
28,
}}
>
📁 Fascicolo digitale
</h3>

<div
style={{
display:
"grid",
gridTemplateColumns:
"repeat(2,minmax(0,1fr))",
gap:
12,
}}
>
<QuickCard
title="Gestione pagamenti"
text="Buste paga e distinte di pagamento."
button="Gestisci"
onClick={() =>
setSection(
"payments"
)
}
/>

<QuickCard
title="Documenti"
text="Documenti anagrafici e contrattuali."
button="Gestisci"
onClick={() =>
setSection(
"documents"
)
}
/>
</div>

<h3
style={{
marginTop:
28,
}}
>
Documenti presenti
</h3>

{documents.filter(
(doc: Document) =>
doc.employee_id ===
selectedEmployeeProfile.id
).length ===
0 ? (
<EmptyState text="Nessun documento presente." />
) : (
documents
.filter(
(doc: Document) =>
doc.employee_id ===
selectedEmployeeProfile.id
)
.slice(0, 10)
.map(
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
openDocument={
openDocument
}
/>
)
)
)}
</div>
</div>
</div>
)}
</>
);
}

/* =========================================================
GESTIONE PAGAMENTI
========================================================= */

function PaymentsSection({
employees,
documents,
payslips,
paymentStatements,
selectedEmployee,
setSelectedEmployee,
paymentType,
setPaymentType,
month,
setMonth,
year,
setYear,
file,
setFile,
submitting,
message,
uploadPayment,
openDocument,
}: any) {
return (
<>
<PageHeader
eyebrow="PAGAMENTI"
title="Gestione pagamenti"
subtitle="Gestisci buste paga e distinte di pagamento del personale."
/>

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
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Carica documento di pagamento
</h2>

<p
style={{
color:
"#81919a",
fontSize:
13,
}}
>
Seleziona il dipendente e scegli se caricare una busta paga oppure una distinta di pagamento.
</p>

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
<Field label="Dipendente">
<select
value={
selectedEmployee
}
onChange={(e) =>
setSelectedEmployee(
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

<Field label="Tipo pagamento">
<select
value={
paymentType
}
onChange={(e) =>
setPaymentType(
e.target
.value
)
}
style={
darkSelect
}
>
{PAYMENT_TYPES.map(
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

<Field label="Mese">
<select
value={
month
}
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

<Field label="Anno">
<select
value={
year
}
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
</div>

<Field label="Documento PDF">
<input
id="payment-file"
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
color:
"#cbd6da",
}}
/>
</Field>

<button
onClick={
uploadPayment
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
: paymentType ===
"payslip"
? "CARICA BUSTA PAGA"
: "CARICA DISTINTA DI PAGAMENTO"}
</button>

{message && (
<MessageBox
message={
message
}
/>
)}
</div>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Buste paga
</h2>

{payslips.length ===
0 ? (
<EmptyState text="Nessuna busta paga caricata." />
) : (
payslips.map(
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
openDocument={
openDocument
}
/>
)
)
)}
</div>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Distinte di pagamento
</h2>

{paymentStatements.length ===
0 ? (
<EmptyState text="Nessuna distinta di pagamento caricata." />
) : (
paymentStatements.map(
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

/* =========================================================
DOCUMENTI
========================================================= */

function DocumentsSection({
employees,
selectedEmployee,
setSelectedEmployee,
documentCategory,
setDocumentCategory,
documentType,
setDocumentType,
taxCode,
setTaxCode,
expiryDate,
setExpiryDate,
year,
setYear,
file,
setFile,
submitting,
message,
uploadDocument,
}: any) {
const isPersonal =
documentCategory ===
"anagrafici";

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
<PageHeader
eyebrow="DOCUMENTI"
title="Documenti"
subtitle="Caricamento dei documenti anagrafici e del rapporto contrattuale."
/>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Carica documento
</h2>

<p
style={{
color:
"#81919a",
fontSize:
13,
}}
>
Tutta la documentazione del dipendente viene archiviata nel suo fascicolo digitale.
</p>

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
<Field label="Dipendente">
<select
value={
selectedEmployee
}
onChange={(e) =>
setSelectedEmployee(
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

<Field label="Categoria">
<select
value={
documentCategory
}
onChange={(e) =>
setDocumentCategory(
e.target
.value
)
}
style={
darkSelect
}
>
<option value="anagrafici">
Documenti anagrafici
</option>

<option value="contrattuali">
Rapporto contrattuale
</option>
</select>
</Field>

<Field label="Tipo documento">
<select
value={
documentType
}
onChange={(e) =>
setDocumentType(
e.target
.value
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
value={
year
}
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
e.target
.value
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
display:
"block",
color:
"#71828c",
marginTop:
5,
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
</div>

<Field label="Documento PDF">
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
<MessageBox
message={
message
}
/>
)}
</div>
</>
);
}

/* =========================================================
COMUNICAZIONI
========================================================= */

function CommunicationsSection({
employees,
communications,
communicationMode,
setCommunicationMode,
communicationEmployee,
setCommunicationEmployee,
communicationTitle,
setCommunicationTitle,
communicationText,
setCommunicationText,
submitting,
message,
sendCommunication,
}: any) {
return (
<>
<PageHeader
eyebrow="COMUNICAZIONI"
title="Comunicazioni"
subtitle="Invia messaggi individuali oppure comunicazioni generali a tutto il personale."
/>

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
<button
onClick={() =>
setCommunicationMode(
"individual"
)
}
style={{
padding:
22,
borderRadius:
15,
border:
communicationMode ===
"individual"
? "2px solid #16c784"
: "1px solid #293c47",
background:
"#172630",
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
color:
"#16c784",
fontSize:
24,
marginBottom:
8,
}}
>
👤
</div>

<strong>
Comunicazione individuale
</strong>

<div
style={{
color:
"#81919a",
fontSize:
12,
marginTop:
6,
}}
>
Messaggio destinato a un singolo dipendente.
</div>
</button>

<button
onClick={() =>
setCommunicationMode(
"general"
)
}
style={{
padding:
22,
borderRadius:
15,
border:
communicationMode ===
"general"
? "2px solid #16c784"
: "1px solid #293c47",
background:
"#172630",
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
color:
"#16c784",
fontSize:
24,
marginBottom:
8,
}}
>
📢
</div>

<strong>
Comunicazione generale
</strong>

<div
style={{
color:
"#81919a",
fontSize:
12,
marginTop:
6,
}}
>
Messaggio inviato a tutti i dipendenti.
</div>
</button>
</div>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Nuova comunicazione
</h2>

{communicationMode ===
"individual" && (
<Field label="Dipendente destinatario">
<select
value={
communicationEmployee
}
onChange={(e) =>
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

<Field label="Titolo">
<input
value={
communicationTitle
}
onChange={(e) =>
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
onChange={(e) =>
setCommunicationText(
e.target
.value
)
}
placeholder="Scrivi qui la comunicazione..."
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
: communicationMode ===
"individual"
? "INVIA AL DIPENDENTE"
: "INVIA A TUTTI I DIPENDENTI"}
</button>

{message && (
<MessageBox
message={
message
}
/>
)}
</div>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
Comunicazioni recenti
</h2>

{communications.length ===
0 ? (
<EmptyState text="Nessuna comunicazione presente." />
) : (
communications
.slice(0, 20)
.map(
(
communication: Communication
) => (
<div
key={
communication.id
}
style={{
borderTop:
"1px solid #293c47",
padding:
"15px 0",
}}
>
<div
style={{
display:
"flex",
justifyContent:
"space-between",
gap:
12,
}}
>
<strong>
{
communication.title
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
{communication.is_general
? "GENERALE"
: "INDIVIDUALE"}
</span>
</div>

<div
style={{
color:
"#81919a",
fontSize:
13,
marginTop:
6,
whiteSpace:
"pre-wrap",
}}
>
{
communication.message
}
</div>
</div>
)
)
)}
</div>
</>
);
}

/* =========================================================
SCADENZE
========================================================= */

function DeadlinesSection({
expiringDocuments,
expiredDocuments,
openDocument,
}: any) {
return (
<>
<PageHeader
eyebrow="CONTROLLO"
title="Scadenze"
subtitle="Controlla documenti prossimi alla scadenza e documenti già scaduti."
/>

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
title="In scadenza entro 30 giorni"
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

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
🚨 Documenti in scadenza
</h2>

{expiringDocuments.length ===
0 ? (
<EmptyState text="Nessun documento in scadenza nei prossimi 30 giorni." />
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
expired={
false
}
/>
)
)
)}
</div>

<div
style={
panelStyle
}
>
<h2
style={{
marginTop:
0,
}}
>
❌ Documenti scaduti
</h2>

{expiredDocuments.length ===
0 ? (
<EmptyState text="Nessun documento scaduto." />
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
expired={
true
}
/>
)
)
)}
</div>
</>
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
const ownCommunications =
communications || [];

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
11,
marginTop:
3,
fontWeight:
800,
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

{/* COMUNICAZIONI */}

<div
style={{
...panelStyle,
marginTop:
20,
}}
>
<h2
style={{
marginTop:
0,
}}
>
📢 Comunicazioni
</h2>

{ownCommunications.length ===
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
ownCommunications.map(
(
communication: Communication
) => (
<div
key={
communication.id
}
style={{
borderTop:
"1px solid #293c47",
padding:
"15px 0",
}}
>
<div
style={{
display:
"flex",
justifyContent:
"space-between",
gap:
12,
}}
>
<strong>
{
communication.title
}
</strong>

<span
style={{
color:
"#16c784",
fontSize:
10,
fontWeight:
900,
}}
>
{communication.is_general
? "COMUNICAZIONE GENERALE"
: "COMUNICAZIONE PERSONALE"}
</span>
</div>

<div
style={{
color:
"#aab8bf",
fontSize:
13,
marginTop:
7,
whiteSpace:
"pre-wrap",
}}
>
{
communication.message
}
</div>

<div
style={{
color:
"#657780",
fontSize:
10,
marginTop:
8,
}}
>
{new Date(
communication.created_at
).toLocaleString(
"it-IT"
)}
</div>
</div>
)
)
)}
</div>

{/* DOCUMENTI */}

<div
style={{
...panelStyle,
marginTop:
20,
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
<DocumentRow
key={
doc.id
}
doc={
doc
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

/* =========================================================
COMPONENTI GRAFICI
========================================================= */

function PageHeader({
eyebrow,
title,
subtitle,
}: any) {
return (
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
11,
fontWeight:
900,
letterSpacing:
1,
}}
>
{eyebrow}
</div>

<h1
style={{
margin:
"8px 0 5px",
fontSize:
28,
}}
>
{title}
</h1>

<p
style={{
margin:
0,
color:
"#a0b0b8",
fontSize:
13,
}}
>
{subtitle}
</p>
</div>
);
}

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
textAlign:
"left",
fontSize:
13,
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
title,
text,
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
"0 0 7px",
}}
>
{title}
</h3>

<p
style={{
margin:
"0 0 16px",
color:
"#81919a",
fontSize:
13,
lineHeight:
1.5,
}}
>
{text}
</p>

<button
onClick={
onClick
}
style={{
padding:
"10px 14px",
border:
"none",
borderRadius:
9,
background:
"#16c784",
color:
"#062019",
fontWeight:
900,
cursor:
"pointer",
}}
>
{button}
</button>
</div>
);
}

function InfoCard({
title,
value,
green,
}: any) {
return (
<div
style={{
padding:
17,
background:
"#101e28",
border:
"1px solid #293c47",
borderRadius:
12,
}}
>
<small
style={{
color:
"#748690",
}}
>
{title}
</small>

<div
style={{
marginTop:
6,
fontWeight:
800,
color:
green
? "#16c784"
: "#fff",
fontSize:
13,
}}
>
{value}
</div>
</div>
);
}

function DocumentRow({
doc,
openDocument,
}: any) {
return (
<div
style={{
borderTop:
"1px solid #293c47",
padding:
"14px 0",
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
"#81919a",
fontSize:
12,
marginTop:
4,
}}
>
{doc.file_name}
{doc.month
? ` · ${MONTHS[doc.month - 1]} ${doc.year}`
: ` · ${doc.year}`}
</div>

{doc.tax_code && (
<div
style={{
color:
"#687983",
fontSize:
11,
marginTop:
3,
}}
>
CF:{" "}
{doc.tax_code}
</div>
)}

{doc.expiry_date && (
<div
style={{
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
11,
fontWeight:
700,
marginTop:
4,
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
borderRadius:
9,
padding:
"10px 15px",
fontWeight:
900,
cursor:
"pointer",
flexShrink:
0,
}}
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
expired,
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
gap:
15,
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
gap:
15,
}}
>
<span
style={{
color:
expired
? "#ff7777"
: "#ffc857",
fontWeight:
900,
fontSize:
12,
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
style={{
padding:
"8px 12px",
border:
"1px solid #30424d",
borderRadius:
8,
background:
"#13222c",
color:
"#dce6e9",
cursor:
"pointer",
fontWeight:
700,
}}
>
Apri
</button>
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
marginTop:
16,
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

function EmptyState({
text,
}: {
text: string;
}) {
return (
<div
style={{
padding:
25,
textAlign:
"center",
color:
"#81919a",
}}
>
{text}
</div>
);
}

function MessageBox({
message,
}: {
message: string;
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
{message}
</div>
);
}

/* =========================================================
STILI
========================================================= */

const panelStyle: React.CSSProperties =
{
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
marginBottom:
20,
};
