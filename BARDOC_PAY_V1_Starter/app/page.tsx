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
document_category?: string | null;
document_type: string;
month?: number | null;
year: number;
file_name: string;
storage_path: string;
expiration_date?: string | null;
fiscal_code?: string | null;
};

const ADMIN_EMAIL = "bardocfg@gmail.com";

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

const documentCategories = [
{ value: "retribuzione", label: "💰 Retribuzione" },
{ value: "rapporto_lavoro", label: "📄 Rapporto di lavoro" },
{ value: "permessi_assenze", label: "📝 Permessi e assenze" },
{ value: "documenti_personali", label: "🪪 Documenti personali" },
{ value: "curriculum", label: "📁 Curriculum" },
];

const documentTypes: Record<string, { value: string; label: string }[]> = {
retribuzione: [
{ value: "payslip", label: "Busta paga" },
{ value: "payment_statement", label: "Distinta di pagamento" },
],
rapporto_lavoro: [
{ value: "employment_contract", label: "Contratto di lavoro" },
{ value: "employment_document", label: "Documento rapporto di lavoro" },
],
permessi_assenze: [
{ value: "leave_request", label: "Foglio permesso" },
{ value: "absence_document", label: "Documento assenza" },
],
documenti_personali: [
{ value: "identity_card", label: "Documento d'identità" },
{ value: "driving_license", label: "Patente" },
],
curriculum: [
{ value: "cv", label: "Curriculum Vitae" },
{ value: "historical_cv", label: "CV storico" },
],
};

function categoryLabel(value?: string | null) {
return (
documentCategories.find((item) => item.value === value)?.label ||
"Documento"
);
}

function documentLabel(value: string) {
for (const category of Object.values(documentTypes)) {
const found = category.find((item) => item.value === value);
if (found) return found.label;
}

return value;
}

function requiresExpiration(type: string) {
return (
type === "identity_card" ||
type === "driving_license"
);
}

function isExpired(date?: string | null) {
if (!date) return false;

const today = new Date();
const expiration = new Date(`${date}T23:59:59`);

return expiration < today;
}

function isExpiringSoon(date?: string | null) {
if (!date) return false;

const today = new Date();
const expiration = new Date(`${date}T23:59:59`);

const diff =
expiration.getTime() - today.getTime();

const days = diff / (1000 * 60 * 60 * 24);

return days >= 0 && days <= 30;
}

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

const [selectedEmployee, setSelectedEmployee] = useState("");
const [selectedEmployeeData, setSelectedEmployeeData] =
useState<Employee | null>(null);

const [employeeSearch, setEmployeeSearch] = useState("");
const [employeePhotoUrl, setEmployeePhotoUrl] = useState("");

const [category, setCategory] = useState("retribuzione");
const [documentType, setDocumentType] = useState("payslip");

const [month, setMonth] = useState(
new Date().getMonth() + 1
);

const [year, setYear] = useState(
new Date().getFullYear()
);

const [expirationDate, setExpirationDate] =
useState("");

const [fiscalCode, setFiscalCode] = useState("");

const [file, setFile] = useState<File | null>(null);

const [photoFile, setPhotoFile] =
useState<File | null>(null);

const [adminLoading, setAdminLoading] =
useState(false);

const [photoLoading, setPhotoLoading] =
useState(false);

const isAdmin =
session?.user?.email?.toLowerCase() ===
ADMIN_EMAIL.toLowerCase();

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

useEffect(() => {
if (!selectedEmployee) {
setSelectedEmployeeData(null);
setEmployeePhotoUrl("");
return;
}

const emp = employees.find(
(item) => item.id === selectedEmployee
);

setSelectedEmployeeData(emp || null);

if (emp?.fiscal_code) {
setFiscalCode(emp.fiscal_code);
} else {
setFiscalCode("");
}

loadEmployeePhoto(emp || null);
}, [selectedEmployee, employees]);

useEffect(() => {
const types =
documentTypes[category] || [];

if (
types.length > 0 &&
!types.some(
(item) => item.value === documentType
)
) {
setDocumentType(types[0].value);
}
}, [category]);

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
setSelectedEmployee("");
setSelectedEmployeeData(null);
setEmployeePhotoUrl("");
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

const { data: docs, error: docsError } =
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

if (docsError) {
console.error(docsError);
return;
}

setDocuments(docs || []);

await loadEmployeePhoto(emp);
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
setMessage(
"Impossibile caricare i dipendenti."
);
} else {
setEmployees(data || []);
}

setAdminLoading(false);
}

async function loadEmployeePhoto(
emp: Employee | null
) {
setEmployeePhotoUrl("");

if (!emp) return;

const path =
emp.photo_path ||
`${emp.id}/photo`;

const { data, error } =
await supabase.storage
.from("employee-photos")
.createSignedUrl(path, 3600);

if (!error && data?.signedUrl) {
setEmployeePhotoUrl(
data.signedUrl
);
}
}

async function uploadEmployeePhoto() {
if (!selectedEmployee) {
setMessage(
"Seleziona prima un dipendente."
);
return;
}

if (!photoFile) {
setMessage(
"Seleziona una foto."
);
return;
}

if (
!photoFile.type.startsWith("image/")
) {
setMessage(
"Il file deve essere un'immagine."
);
return;
}

setPhotoLoading(true);
setMessage("");

try {
const path =
`${selectedEmployee}/photo`;

const { error } =
await supabase.storage
.from("employee-photos")
.upload(
path,
photoFile,
{
upsert: true,
contentType:
photoFile.type,
}
);

if (error) {
throw error;
}

await supabase
.from("employees")
.update({
photo_path: path,
})
.eq(
"id",
selectedEmployee
);

setMessage(
"Foto dipendente aggiornata. ✅"
);

setPhotoFile(null);

await loadEmployees();

const emp =
employees.find(
(item) =>
item.id === selectedEmployee
);

await loadEmployeePhoto(
emp || selectedEmployeeData
);
} catch (error: any) {
console.error(error);

setMessage(
error?.message ||
"Errore durante il caricamento della foto."
);
}

setPhotoLoading(false);
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

if (
requiresExpiration(
documentType
) &&
!expirationDate
) {
setMessage(
"Inserisci la data di scadenza del documento."
);
return;
}

if (
documentType ===
"driving_license" &&
!fiscalCode.trim()
) {
setMessage(
"Per la patente il codice fiscale è obbligatorio."
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

const {
error: documentError,
} = await supabase
.from("documents")
.insert({
employee_id:
selectedEmployee,

document_category:
category,

document_type:
documentType,

month:
category ===
"retribuzione"
? month
: null,

year,

file_name:
file.name,

storage_path:
storagePath,

expiration_date:
expirationDate ||
null,

fiscal_code:
fiscalCode
.trim()
.toUpperCase() ||
null,
});

if (documentError) {
throw documentError;
}

setMessage(
"Documento caricato correttamente. ✅"
);

setFile(null);
setExpirationDate("");

const input =
document.getElementById(
"document-file"
) as HTMLInputElement | null;

if (input) {
input.value = "";
}

setCategory(
"retribuzione"
);

setDocumentType(
"payslip"
);

setMonth(
new Date().getMonth() + 1
);

setYear(
new Date().getFullYear()
);
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
const search =
employeeSearch
.trim()
.toLowerCase();

if (!search) {
return employees;
}

return employees.filter(
(emp) => {
const name =
emp.full_name
?.toLowerCase() ||
"";

const email =
emp.email
?.toLowerCase() ||
"";

const cf =
emp.fiscal_code
?.toLowerCase() ||
"";

return (
name.includes(search) ||
email.includes(search) ||
cf.includes(search)
);
}
);
}, [
employees,
employeeSearch,
]);

if (loading) {
return (
<div
style={{
minHeight: "100vh",
display: "flex",
alignItems: "center",
justifyContent: "center",
background:
"#07141f",
color: "white",
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
width: 70,
height: 70,
borderRadius: 20,
background:
"#16c784",
display: "flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 38,
fontWeight: 900,
margin:
"0 auto 20px",
}}
>
B
</div>

<div
style={{
fontSize: 18,
opacity: 0.8,
}}
>
Caricamento
BARDOC PAY...
</div>
</div>
</div>
);
}

if (!session) {
return (
<main
style={{
minHeight:
"100vh",
background:
"linear-gradient(135deg,#07141f 0%,#102936 55%,#07141f 100%)",
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
maxWidth: 460,
background:
"#ffffff",
borderRadius: 28,
padding: 42,
boxShadow:
"0 25px 70px rgba(0,0,0,.35)",
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
width: 82,
height: 82,
margin:
"0 auto 20px",
borderRadius: 24,
background:
"#16c784",
color:
"#062019",
display: "flex",
alignItems:
"center",
justifyContent:
"center",
fontSize: 46,
fontWeight: 900,
}}
>
B
</div>

<div
style={{
color:
"#16a970",
fontWeight: 800,
letterSpacing:
1.5,
fontSize: 14,
}}
>
BARDOC SERVICE
</div>

<h1
style={{
margin:
"8px 0 6px",
color:
"#13202b",
fontSize: 30,
}}
>
Portale Dipendenti
</h1>

<p
style={{
margin:
"0 0 30px",
color:
"#74808a",
}}
>
Accedi alla tua
area personale
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
gap: 16,
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
style={{
width:
"100%",
boxSizing:
"border-box",
padding:
"14px 15px",
borderRadius:
12,
border:
"1px solid #dce3e7",
fontSize: 15,
}}
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
style={{
width:
"100%",
boxSizing:
"border-box",
padding:
"14px 15px",
borderRadius:
12,
border:
"1px solid #dce3e7",
fontSize: 15,
}}
/>

<button
type="submit"
disabled={
submitting
}
style={{
padding:
"15px 18px",
border: "none",
borderRadius:
12,
background:
"#16c784",
color:
"#062019",
fontSize: 16,
fontWeight: 800,
cursor:
"pointer",
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
setLoginMode(
!loginMode
);
setMessage("");
}}
style={{
display:
"block",
width: "100%",
marginTop: 22,
border: "none",
background:
"transparent",
color:
"#119e6a",
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
marginTop: 20,
padding: 13,
borderRadius:
12,
background:
"#f1f7f5",
color:
"#285d4b",
textAlign:
"center",
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
<main
style={{
minHeight:
"100vh",
background:
"#17202b",
fontFamily:
"Arial, sans-serif",
color:
"#ffffff",
}}
>
<header
style={{
background:
"#111923",
borderBottom:
"1px solid #293541",
padding:
"18px 28px",
display: "flex",
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
"#8f9ca7",
fontSize: 13,
}}
>
Area amministratore
</div>
</div>

<button
onClick={logout}
style={{
padding:
"10px 17px",
border:
"1px solid #394652",
borderRadius:
10,
background:
"#1b2631",
color:
"#ffffff",
fontWeight: 700,
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
1200,
margin:
"0 auto",
padding: 30,
}}
>
<div
style={{
background:
"linear-gradient(135deg,#0d1824,#243442)",
borderRadius:
22,
padding: 30,
marginBottom:
22,
}}
>
<div
style={{
color:
"#16c784",
fontWeight: 800,
fontSize: 13,
}}
>
AMMINISTRAZIONE
</div>

<h1
style={{
margin:
"8px 0",
fontSize: 32,
}}
>
Gestione personale
</h1>

<p
style={{
margin: 0,
color:
"#aebbc4",
}}
>
Cerca un dipendente
e gestisci il suo
fascicolo digitale.
</p>
</div>

<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
20,
padding: 25,
marginBottom:
20,
}}
>
<label
style={{
display:
"block",
marginBottom:
8,
fontWeight: 700,
}}
>
Cerca dipendente
</label>

<input
value={
employeeSearch
}
onChange={(e) =>
setEmployeeSearch(
e.target.value
)
}
placeholder="Nome, email o codice fiscale..."
style={{
width:
"100%",
boxSizing:
"border-box",
padding:
"14px 15px",
borderRadius:
12,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
fontSize: 15,
}}
/>

<div
style={{
marginTop: 15,
display:
"grid",
gridTemplateColumns:
"1fr",
gap: 8,
}}
>
{filteredEmployees
.slice(0, 8)
.map((emp) => (
<button
key={
emp.id
}
onClick={() =>
setSelectedEmployee(
emp.id
)
}
style={{
display:
"flex",
alignItems:
"center",
gap: 12,
textAlign:
"left",
padding:
"12px 14px",
borderRadius:
12,
border:
"1px solid #35434f",
background:
selectedEmployee ===
emp.id
? "#263944"
: "#18232d",
color:
"#ffffff",
cursor:
"pointer",
}}
>
<div
style={{
width: 38,
height: 38,
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
{emp.full_name
?.charAt(
0
)
.toUpperCase()}
</div>

<div>
<strong>
{
emp.full_name
}
</strong>

<div
style={{
color:
"#8796a2",
fontSize:
12,
marginTop:
3,
}}
>
{emp.email ||
"Email non presente"}
</div>

{emp.fiscal_code && (
<div
style={{
color:
"#16c784",
fontSize:
11,
marginTop:
2,
}}
>
CF:{" "}
{
emp.fiscal_code
}
</div>
)}
</div>
</button>
))}
</div>
</div>

{selectedEmployeeData && (
<>
<div
style={{
display:
"grid",
gridTemplateColumns:
"280px 1fr",
gap: 20,
marginBottom:
20,
}}
>
<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
20,
padding: 24,
textAlign:
"center",
}}
>
<div
style={{
width: 150,
height: 150,
borderRadius:
18,
margin:
"0 auto 18px",
overflow:
"hidden",
background:
"#0e1821",
border:
"3px solid #16c784",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
}}
>
{employeePhotoUrl ? (
<img
src={
employeePhotoUrl
}
alt="Foto dipendente"
style={{
width:
"100%",
height:
"100%",
objectFit:
"cover",
}}
/>
) : (
<span
style={{
fontSize:
55,
fontWeight:
900,
color:
"#16c784",
}}
>
{selectedEmployeeData.full_name
?.charAt(
0
)
.toUpperCase()}
</span>
)}
</div>

<h2
style={{
margin:
"0 0 6px",
fontSize:
20,
}}
>
{
selectedEmployeeData.full_name
}
</h2>

<div
style={{
color:
"#8998a4",
fontSize:
13,
}}
>
{selectedEmployeeData.email ||
"Email non presente"}
</div>

<div
style={{
marginTop:
12,
padding:
"8px 10px",
borderRadius:
8,
background:
"#162d27",
color:
"#16c784",
fontSize:
12,
fontWeight:
700,
}}
>
Codice fiscale
</div>

<div
style={{
marginTop:
6,
color:
"#ffffff",
fontSize:
13,
wordBreak:
"break-all",
}}
>
{selectedEmployeeData.fiscal_code ||
"Non presente"}
</div>

<input
type="file"
accept="image/*"
onChange={(e) =>
setPhotoFile(
e.target
.files?.[0] ||
null
)
}
style={{
marginTop:
20,
width:
"100%",
color:
"#ffffff",
fontSize:
12,
}}
/>

<button
onClick={
uploadEmployeePhoto
}
disabled={
photoLoading
}
style={{
width:
"100%",
marginTop:
10,
padding:
"11px 12px",
border:
"none",
borderRadius:
10,
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
{photoLoading
? "Caricamento..."
: "Aggiorna foto"}
</button>
</div>

<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
20,
padding: 28,
}}
>
<div
style={{
color:
"#16c784",
fontWeight:
800,
fontSize:
13,
}}
>
FASCICOLO DIGITALE
</div>

<h2
style={{
margin:
"8px 0 10px",
}}
>
{
selectedEmployeeData.full_name
}
</h2>

<p
style={{
color:
"#93a0aa",
margin:
"0 0 25px",
}}
>
Carica documenti,
contratti,
permessi,
documenti personali
e curriculum.
</p>

<div
style={{
display:
"grid",
gridTemplateColumns:
"1fr 1fr",
gap: 16,
}}
>
<div>
<label>
Categoria documento
</label>

<select
value={
category
}
onChange={(e) =>
setCategory(
e.target
.value
)
}
style={{
width:
"100%",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
}}
>
{documentCategories.map(
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
</div>

<div>
<label>
Tipo documento
</label>

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
style={{
width:
"100%",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
}}
>
{(
documentTypes[
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
{
item.label
}
</option>
)
)}
</select>
</div>

{category ===
"retribuzione" && (
<div>
<label>
Mese
</label>

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
style={{
width:
"100%",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
}}
>
{months.map(
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
</div>
)}

<div>
<label>
Anno
</label>

<input
type="number"
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
style={{
width:
"100%",
boxSizing:
"border-box",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
}}
/>
</div>

{requiresExpiration(
documentType
) && (
<div>
<label>
Data di scadenza
</label>

<input
type="date"
value={
expirationDate
}
onChange={(e) =>
setExpirationDate(
e.target
.value
)
}
style={{
width:
"100%",
boxSizing:
"border-box",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
}}
/>
</div>
)}

{(documentType ===
"driving_license" ||
documentType ===
"identity_card") && (
<div>
<label>
Codice fiscale
{documentType ===
"driving_license" &&
" *"}
</label>

<input
type="text"
value={
fiscalCode
}
onChange={(e) =>
setFiscalCode(
e.target
.value
.toUpperCase()
)
}
placeholder="Codice fiscale"
maxLength={
16
}
style={{
width:
"100%",
boxSizing:
"border-box",
marginTop:
7,
padding:
14,
borderRadius:
10,
border:
"1px solid #3b4955",
background:
"#17212b",
color:
"#ffffff",
textTransform:
"uppercase",
}}
/>

<div
style={{
marginTop:
5,
color:
"#82909b",
fontSize:
11,
}}
>
{documentType ===
"driving_license"
? "Obbligatorio per la patente."
: "Facoltativo: utile per la ricerca del dipendente."}
</div>
</div>
)}
</div>

<div
style={{
marginTop:
20,
}}
>
<label>
Documento PDF
</label>

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
display:
"block",
marginTop:
10,
width:
"100%",
color:
"#ffffff",
}}
/>
</div>

<button
onClick={
uploadDocument
}
disabled={
submitting
}
style={{
width:
"100%",
marginTop:
25,
padding:
16,
border:
"none",
borderRadius:
12,
background:
"#16c784",
color:
"#062019",
fontWeight:
900,
fontSize:
16,
cursor:
"pointer",
}}
>
{submitting
? "Caricamento..."
: "CARICA DOCUMENTO"}
</button>

{message && (
<div
style={{
marginTop:
18,
padding:
14,
borderRadius:
12,
background:
"#162d27",
color:
"#16c784",
textAlign:
"center",
}}
>
{message}
</div>
)}
</div>
</div>
</>
)}

<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
16,
padding: 20,
color:
"#8998a4",
}}
>
{adminLoading
? "Caricamento dipendenti..."
: `${employees.length} dipendenti attivi`}
</div>
</section>
</main>
);
}

return (
<main
style={{
minHeight:
"100vh",
background:
"#17202b",
fontFamily:
"Arial, sans-serif",
color:
"#ffffff",
}}
>
<header
style={{
background:
"#111923",
borderBottom:
"1px solid #293541",
padding:
"18px 28px",
display: "flex",
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
"#8998a4",
fontSize: 13,
}}
>
Area personale
</div>
</div>

<button
onClick={logout}
style={{
padding:
"10px 17px",
border:
"1px solid #394652",
borderRadius:
10,
background:
"#1b2631",
color:
"#ffffff",
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
"linear-gradient(135deg,#0d1824,#243442)",
borderRadius:
22,
padding: 30,
}}
>
<div
style={{
color:
"#16c784",
fontWeight:
800,
fontSize: 13,
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
"#aebbc4",
}}
>
Benvenuto nel tuo
portale BARDOC PAY.
</p>
</div>

<div
style={{
display:
"grid",
gridTemplateColumns:
"220px 1fr",
gap: 20,
marginTop: 20,
}}
>
<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
20,
padding: 22,
textAlign:
"center",
}}
>
<div
style={{
width: 130,
height: 130,
margin:
"0 auto",
borderRadius:
"50%",
overflow:
"hidden",
background:
"#111923",
border:
"3px solid #16c784",
display:
"flex",
alignItems:
"center",
justifyContent:
"center",
}}
>
{employeePhotoUrl ? (
<img
src={
employeePhotoUrl
}
alt="Foto"
style={{
width:
"100%",
height:
"100%",
objectFit:
"cover",
}}
/>
) : (
<span
style={{
fontSize:
45,
fontWeight:
900,
color:
"#16c784",
}}
>
{employee?.full_name
?.charAt(
0
)
.toUpperCase()}
</span>
)}
</div>

<div
style={{
marginTop:
15,
fontWeight:
800,
}}
>
{employee?.full_name}
</div>

<div
style={{
marginTop:
6,
color:
"#8998a4",
fontSize:
12,
}}
>
{employee?.email}
</div>
</div>

<div
style={{
background:
"#202b36",
border:
"1px solid #33404b",
borderRadius:
20,
padding: 25,
}}
>
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
"#8998a4",
}}
>
Non sono presenti
documenti.
</p>
) : (
documents.map(
(doc) => {
const expired =
isExpired(
doc.expiration_date
);

const soon =
isExpiringSoon(
doc.expiration_date
);

return (
<div
key={
doc.id
}
style={{
padding:
16,
borderTop:
"1px solid #33404b",
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
}}
>
<div>
<div
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
categoryLabel(
doc.document_category
)
}
</div>

<strong
style={{
display:
"block",
marginTop:
5,
}}
>
{documentLabel(
doc.document_type
)}
</strong>

<div
style={{
color:
"#8998a4",
fontSize:
12,
marginTop:
5,
}}
>
{
doc.file_name
}

{doc.month &&
` · ${months[
doc.month -
1
]} ${doc.year}`}
</div>

{doc.expiration_date && (
<div
style={{
marginTop:
7,
color:
expired
? "#ff6464"
: soon
? "#f4b942"
: "#8998a4",
fontSize:
12,
fontWeight:
700,
}}
>
{expired
? "🚨 Documento scaduto"
: soon
? "⚠️ In scadenza entro 30 giorni"
: `Scadenza: ${new Date(
doc.expiration_date
).toLocaleDateString(
"it-IT"
)}`}
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
10,
padding:
"10px 16px",
fontWeight:
900,
cursor:
"pointer",
whiteSpace:
"nowrap",
}}
>
Apri PDF
</button>
</div>
</div>
);
}
)
)}
</div>
</div>

<div
style={{
marginTop:
20,
padding: 18,
background:
"#202b36",
borderRadius:
16,
color:
"#8998a4",
fontSize:
13,
}}
>
Accesso effettuato
come{" "}
<strong
style={{
color:
"#ffffff",
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
