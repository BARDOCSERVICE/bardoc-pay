"use client";



import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Employee = {
id: string;
auth_user_id: string | null;
full_name: string;
tax_code: string | null;
email: string;
active: boolean;
created_at: string;
phone: string | null;
employee_code: string | null;
hire_date: string | null;
notes: string | null;
};

type Document = {
id: string;
employee_id: string;
document_type: string;
month: number | null;
year: number | null;
file_name: string;
storage_path: string;
created_at: string;
};

export default function Home() {
const [session, setSession] = useState\<any>(null);
const [loading, setLoading] = useState(true);
const [loginMode, setLoginMode] = useState(true);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [employees, setEmployees] = useState\<Employee[]>([]);
const [documents, setDocuments] = useState\<Document[]>([]);

const [selectedEmployee, setSelectedEmployee] =
useState\<Employee | null>(null);

const [showEmployeeForm, setShowEmployeeForm] = useState(false);
const [message, setMessage] = useState("");

const [newEmployee, setNewEmployee] = useState({
full_name: "",
email: "",
tax_code: "",
phone: "",
employee_code: "",
hire_date: "",
notes: "",
});

useEffect(() => {
checkSession();

const {
data: { subscription },
} = supabase.auth.onAuthStateChange((_event, newSession) => {
setSession(newSession);

if (newSession) {
loadData();
} else {
setEmployees([]);
setDocuments([]);
}
});

return () => subscription.unsubscribe();
}, []);

async function checkSession() {
const {
data: { session },
} = await supabase.auth.getSession();

setSession(session);

if (session) {
await loadData();
}

setLoading(false);
}

async function loadData() {
const {
data: { user },
} = await supabase.auth.getUser();

if (!user) return;

const { data: profile } = await supabase
.from("profiles")
.select("role")
.eq("id", user.id)
.single();

const role = profile?.role === "admin" ? "admin" : "employee";
setUserRole(role);

if (role === "admin") {
const { data: employeeData } = await supabase
.from("employees")
.select("*")
.order("full_name", { ascending: true });

const { data: documentData } = await supabase
.from("documents")
.select("*")
.order("created_at", { ascending: false });

setEmployees(employeeData || []);
setDocuments(documentData || []);
return;
}

const { data: employee } = await supabase
.from("employees")
.select("*")
.eq("auth_user_id", user.id)
.single();

if (!employee) {
setEmployees([]);
setDocuments([]);
setSelectedEmployee(null);
return;
}

setEmployees([employee]);
setSelectedEmployee(employee);

const { data: documentData } = await supabase
.from("documents")
.select("*")
.eq("employee_id", employee.id)
.order("created_at", { ascending: false });

setDocuments(documentData || []);
} = await supabase
.from("employees")
.select("\*")
.order("full_name", { ascending: true });

if (!employeeError) {
setEmployees(employeeData || []);
}

const {
data: documentData,
error: documentError,
} = await supabase
.from("documents")
.select("\*")
.order("created_at", { ascending: false });

if (!documentError) {
setDocuments(documentData || []);
}
}

async function handleLogin(e: React.FormEvent) {
e.preventDefault();

setMessage("");

const { error } = await supabase.auth.signInWithPassword({
email,
password,
});

if (error) {
setMessage("Email o password non corretti.");
return;
}

setMessage("");
}

async function handleRegister(e: React.FormEvent) {
e.preventDefault();

setMessage("");

const { error } = await supabase.auth.signUp({
email,
password,
});

if (error) {
setMessage(error.message);
return;
}

setMessage(
"Registrazione effettuata. Controlla la tua email per confermare l'account."
);
}

async function logout() {
await supabase.auth.signOut();
}

async function createEmployee(e: React.FormEvent) {
e.preventDefault();

setMessage("");

const { error } = await supabase.rpc("create_employee", {
p_full_name: newEmployee.full_name,
p_email: newEmployee.email,
p_tax_code: newEmployee.tax_code || null,
p_phone: newEmployee.phone || null,
p_employee_code: newEmployee.employee_code || null,
p_hire_date: newEmployee.hire_date || null,
p_notes: newEmployee.notes || null,
});

if (error) {
setMessage(error.message);
return;
}

setMessage("Dipendente inserito correttamente.");

setNewEmployee({
full_name: "",
email: "",
tax_code: "",
phone: "",
employee_code: "",
hire_date: "",
notes: "",
});

setShowEmployeeForm(false);

await loadData();
}

function selectEmployee(employee: Employee) {
if (userRole === "admin") {
setSelectedEmployee(employee);
}
}

function getEmployeeDocuments(employeeId: string) {
return documents.filter((doc) => doc.employee_id === employeeId);
}

if (loading) {
return (
\<main className="loading">
\<div className="loader">\</div>
\<p>Caricamento BARDOC SERVICE...\</p>

\<style jsx>{`
.loading {
min-height: 100vh;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #071512;
color: white;
font-family: Arial, sans-serif;
}

.loader {
width: 42px;
height: 42px;
border: 4px solid #263b36;
border-top-color: #35e0a0;
border-radius: 50%;
animation: spin 1s linear infinite;
}

@keyframes spin {
to {
transform: rotate(360deg);
}
}
`}\</style>
\</main>
);
}

if (!session) {
return (
\<main className="loginPage">
\<div className="loginCard">
\<div className="logo">B\</div>

\<h1>BARDOC SERVICE\</h1>
\<h2>Portale Dipendenti\</h2>

\<p className="subtitle">
Gestione del personale e documenti aziendali
\</p>

\<form onSubmit={loginMode ? handleLogin : handleRegister}>
\<label>Email\</label>

\<input
type="email"
placeholder="[nome@bardocservice.com](mailto:nome@bardocservice.com)"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
/>

\<label>Password\</label>

\<input
type="password"
placeholder="Password"
value={password}
onChange={(e) => setPassword(e.target.value)}
required
minLength={6}
/>

{message && \<div className="message">{message}\</div>}

\<button type="submit">
{loginMode ? "Accedi al portale" : "Crea account"}
\</button>
\</form>

\<button
className="switchButton"
onClick={() => {
setLoginMode(!loginMode);
setMessage("");
}}
\>
{loginMode
? "Devi creare un account?"
: "Hai già un account? Accedi"}
\</button>

\<div className="loginFooter">
BARDOC SERVICE
\<br />
Un posto, mille servizi.
\</div>
\</div>

\<style jsx>{`
.loginPage {
min-height: 100vh;
background: linear-gradient(135deg, #06110e, #102923);
display: flex;
align-items: center;
justify-content: center;
padding: 20px;
font-family: Arial, sans-serif;
}

.loginCard {
width: 100%;
max-width: 430px;
background: #ffffff;
border-radius: 24px;
padding: 38px;
box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
}

.logo {
width: 60px;
height: 60px;
border-radius: 50%;
background: #20c997;
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 32px;
font-weight: 800;
margin-bottom: 20px;
}

h1 {
margin: 0;
color: #101b18;
font-size: 27px;
}

h2 {
margin: 8px 0;
color: #20a879;
font-size: 22px;
}

.subtitle {
color: #68746f;
margin-bottom: 30px;
}

label {
display: block;
margin: 16px 0 7px;
font-weight: 700;
color: #24332e;
}

input {
width: 100%;
box-sizing: border-box;
padding: 14px;
border: 1px solid #d8dfdc;
border-radius: 10px;
font-size: 15px;
outline: none;
}

input:focus {
border-color: #20c997;
}

button {
width: 100%;
margin-top: 22px;
border: 0;
border-radius: 10px;
padding: 14px;
background: #20c997;
color: white;
font-weight: 800;
font-size: 16px;
cursor: pointer;
}

button:hover {
opacity: 0.9;
}

.switchButton {
background: transparent;
color: #15966f;
margin-top: 10px;
}

.message {
margin-top: 15px;
padding: 12px;
background: #eefaf5;
color: #147b5b;
border-radius: 9px;
font-size: 14px;
}

.loginFooter {
text-align: center;
margin-top: 30px;
color: #89938f;
font-size: 12px;
line-height: 1.6;
}
`}\</style>
\</main>
);
}

const activeEmployees = employees.filter((employee) => employee.active);

return (
\<main className="dashboard">
\<header className="header">
\<div>
\<div className="brand">
\<span className="brandLogo">B\</span>
\<span>BARDOC SERVICE\</span>
\</div>

\<p>Portale gestione personale\</p>
\</div>

\<button className="logout" onClick={logout}>
Esci
\</button>
\</header>

\<section className="welcome">
\<div>
\<h1>Dashboard\</h1>
\<p>Benvenuto nel Portale Dipendenti BARDOC SERVICE.\</p>
\</div>

\<button
className="addButton"
onClick={() => setShowEmployeeForm(true)}
\>
\+ Nuovo dipendente
\</button>
\</section>

{message && \<div className="success">{message}\</div>}

\<section className="stats">
\<div className="stat">
\<span>Dipendenti\</span>
\<strong>{employees.length}\</strong>
\</div>

\<div className="stat">
\<span>Attivi\</span>
\<strong>{activeEmployees.length}\</strong>
\</div>

\<div className="stat">
\<span>Documenti\</span>
\<strong>{documents.length}\</strong>
\</div>
\</section>

{showEmployeeForm && (
\<section className="panel">
\<div className="panelHeader">
\<h2>Nuovo dipendente\</h2>

\<button
className="close"
onClick={() => setShowEmployeeForm(false)}
\>
×
\</button>
\</div>

\<form className="employeeForm" onSubmit={createEmployee}>
\<input
placeholder="Nome e cognome \*"
value={newEmployee.full_name}
onChange={(e) =>
setNewEmployee({
...newEmployee,
full_name: e.target.value,
})
}
required
/>

\<input
type="email"
placeholder="Email \*"
value={newEmployee.email}
onChange={(e) =>
setNewEmployee({
...newEmployee,
email: e.target.value,
})
}
required
/>

\<input
placeholder="Codice fiscale"
value={newEmployee.tax_code}
onChange={(e) =>
setNewEmployee({
...newEmployee,
tax_code: e.target.value,
})
}
/>

\<input
placeholder="Telefono"
value={newEmployee.phone}
onChange={(e) =>
setNewEmployee({
...newEmployee,
phone: e.target.value,
})
}
/>

\<input
placeholder="Codice dipendente"
value={newEmployee.employee_code}
onChange={(e) =>
setNewEmployee({
...newEmployee,
employee_code: e.target.value,
})
}
/>

\<input
type="date"
value={newEmployee.hire_date}
onChange={(e) =>
setNewEmployee({
...newEmployee,
hire_date: e.target.value,
})
}
/>

\<textarea
placeholder="Note"
value={newEmployee.notes}
onChange={(e) =>
setNewEmployee({
...newEmployee,
notes: e.target.value,
})
}
/>

\<button type="submit">Salva dipendente\</button>
\</form>
\</section>
)}

\<section className="content">
\<div className="employees">
\<div className="sectionTitle">
\<h2>Dipendenti\</h2>
\<span>{employees.length} totali\</span>
\</div>

{employees.length === 0 ? (
\<div className="empty">
Nessun dipendente presente.
\</div>
) : (
\<div className="employeeList">
{employees.map((employee) => (
\<button
key={[employee.id](http://employee.id/)}
className="employee"
onClick={() => selectEmployee(employee)}
\>
\<div className="avatar">
{employee.full_name.charAt(0).toUpperCase()}
\</div>

\<div className="employeeInfo">
\<strong>{employee.full_name}\</strong>
\<span>
{employee.employee_code || "Codice non assegnato"}
\</span>
\<small>{employee.email}\</small>
\</div>

\<span
className={
employee.active ? "activeBadge" : "inactiveBadge"
}
\>
{employee.active ? "Attivo" : "Non attivo"}
\</span>
\</button>
))}
\</div>
)}
\</div>

\<aside className="details">
{!selectedEmployee ? (
\<div className="emptyDetails">
\<div className="bigIcon">\</div>
\<h3>Seleziona un dipendente\</h3>
\<p>
Seleziona un dipendente per visualizzare anagrafica e
documenti.
\</p>
\</div>
) : (
<>
\<div className="profileHeader">
\<div className="bigAvatar">
{selectedEmployee.full_name.charAt(0).toUpperCase()}
\</div>

\<div>
\<h2>{selectedEmployee.full_name}\</h2>
\<span>
{selectedEmployee.active ? "Dipendente attivo" : "Non attivo"}
\</span>
\</div>
\</div>

\<div className="infoGrid">
\<div>
\<label>Email\</label>
\<p>{selectedEmployee.email || "—"}\</p>
\</div>

\<div>
\<label>Telefono\</label>
\<p>{selectedEmployee.phone || "—"}\</p>
\</div>

\<div>
\<label>Codice fiscale\</label>
\<p>{selectedEmployee.tax_code || "—"}\</p>
\</div>

\<div>
\<label>Codice dipendente\</label>
\<p>{selectedEmployee.employee_code || "—"}\</p>
\</div>

\<div>
\<label>Data assunzione\</label>
\<p>{selectedEmployee.hire_date || "—"}\</p>
\</div>
\</div>

\<div className="documents">
\<h3>Documenti e buste paga\</h3>

{getEmployeeDocuments(selectedEmployee.id).length === 0 ? (
\<div className="emptyDocument">
Nessun documento presente.
\</div>
) : (
getEmployeeDocuments(selectedEmployee.id).map((doc) => (
\<div className="document" key={[doc.id](http://doc.id/)}>
\<div className="documentIcon">\</div>

\<div>
\<strong>{doc.file_name}\</strong>
\<span>
{doc.document_type}
{doc.month && doc.year
? ` — ${doc.month}/${doc.year}`
: ""}
\</span>
\</div>

\<button
className="viewButton"
onClick={() =>
window.open(doc.storage_path, "_blank")
}
\>
Apri
\</button>
\</div>
))
)}
\</div>
\</>
)}
\</aside>
\</section>

\<footer>
\<strong>BARDOC SERVICE\</strong>
\<span>Un posto, mille servizi.\</span>
\</footer>

\<style jsx>{`
.dashboard {
min-height: 100vh;
background: #f4f7f5;
color: #17231f;
font-family: Arial, sans-serif;
}

.header {
background: #071512;
color: white;
padding: 22px 6%;
display: flex;
justify-content: space-between;
align-items: center;
}

.brand {
display: flex;
align-items: center;
gap: 10px;
font-size: 20px;
font-weight: 900;
}

.brandLogo {
width: 38px;
height: 38px;
border-radius: 50%;
background: #20c997;
display: flex;
justify-content: center;
align-items: center;
}

.header p {
margin: 5px 0 0 48px;
color: #a8bbb5;
font-size: 13px;
}

.logout {
border: 1px solid #4d625b;
background: transparent;
color: white;
padding: 10px 18px;
border-radius: 9px;
cursor: pointer;
}

.welcome {
padding: 40px 6% 25px;
display: flex;
justify-content: space-between;
align-items: center;
}

.welcome h1 {
margin: 0;
font-size: 34px;
}

.welcome p {
color: #697873;
}

.addButton {
background: #20c997;
color: white;
border: 0;
padding: 14px 20px;
border-radius: 10px;
font-weight: 800;
cursor: pointer;
}

.success {
margin: 0 6% 20px;
padding: 13px;
background: #e6f8f1;
color: #167c5b;
border-radius: 10px;
}

.stats {
padding: 0 6% 25px;
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 18px;
}

.stat {
background: white;
border-radius: 16px;
padding: 22px;
box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
}

.stat span {
display: block;
color: #73817c;
font-size: 14px;
}

.stat strong {
display: block;
margin-top: 8px;
font-size: 30px;
color: #159b72;
}

.panel {
margin: 0 6% 25px;
background: white;
padding: 25px;
border-radius: 16px;
}

.panelHeader {
display: flex;
justify-content: space-between;
align-items: center;
}

.close {
width: 35px;
height: 35px;
border: 0;
border-radius: 50%;
background: #edf2ef;
cursor: pointer;
font-size: 20px;
}

.employeeForm {
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 14px;
margin-top: 20px;
}

.employeeForm input,
.employeeForm textarea {
box-sizing: border-box;
width: 100%;
padding: 13px;
border: 1px solid #d9e1dd;
border-radius: 9px;
font-size: 14px;
}

.employeeForm textarea {
min-height: 90px;
grid-column: span 2;
}

.employeeForm button {
background: #20c997;
color: white;
border: 0;
border-radius: 9px;
padding: 13px;
font-weight: 800;
cursor: pointer;
}

.content {
padding: 0 6% 40px;
display: grid;
grid-template-columns: 1fr 1.25fr;
gap: 25px;
}

.employees,
.details {
background: white;
border-radius: 18px;
padding: 25px;
box-shadow: 0 5px 20px rgba(0, 0, 0, 0.04);
}

.sectionTitle {
display: flex;
justify-content: space-between;
align-items: center;
}

.sectionTitle span {
color: #87948f;
font-size: 13px;
}

.employeeList {
display: flex;
flex-direction: column;
gap: 8px;
margin-top: 15px;
}

.employee {
width: 100%;
border: 1px solid #edf0ef;
background: white;
padding: 13px;
border-radius: 12px;
display: flex;
align-items: center;
text-align: left;
cursor: pointer;
}

.employee:hover {
border-color: #20c997;
background: #f8fcfa;
}

.avatar,
.bigAvatar {
flex-shrink: 0;
background: #dff8ee;
color: #159b72;
font-weight: 900;
display: flex;
align-items: center;
justify-content: center;
border-radius: 50%;
}

.avatar {
width: 42px;
height: 42px;
}

.employeeInfo {
margin-left: 12px;
flex: 1;
}

.employeeInfo strong,
.employeeInfo span,
.employeeInfo small {
display: block;
}

.employeeInfo span {
color: #159b72;
font-size: 12px;
margin-top: 3px;
}

.employeeInfo small {
color: #89938f;
margin-top: 3px;
}

.activeBadge,
.inactiveBadge {
font-size: 11px;
padding: 5px 8px;
border-radius: 20px;
}

.activeBadge {
background: #e1f8ef;
color: #13865f;
}

.inactiveBadge {
background: #eee;
color: #777;
}

.profileHeader {
display: flex;
align-items: center;
gap: 15px;
padding-bottom: 20px;
border-bottom: 1px solid #edf0ef;
}

.bigAvatar {
width: 58px;
height: 58px;
font-size: 23px;
}

.profileHeader h2 {
margin: 0 0 5px;
}

.profileHeader span {
color: #159b72;
font-size: 13px;
}

.infoGrid {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 20px;
padding: 20px 0;
}

.infoGrid label {
color: #89938f;
font-size: 12px;
}

.infoGrid p {
margin: 5px 0 0;
font-weight: 700;
font-size: 14px;
}

.documents {
border-top: 1px solid #edf0ef;
padding-top: 20px;
}

.document {
display: flex;
align-items: center;
gap: 12px;
padding: 12px;
border: 1px solid #edf0ef;
border-radius: 10px;
margin-top: 8px;
}

.documentIcon {
font-size: 24px;
}

.document > div:nth-child(2) {
flex: 1;
}

.document strong,
.document span {
display: block;
}

.document span {
font-size: 12px;
color: #7b8782;
margin-top: 4px;
}

.viewButton {
width: auto;
margin: 0;
padding: 8px 12px;
background: #e5f8f1;
color: #11855f;
border: 0;
border-radius: 7px;
font-weight: 700;
cursor: pointer;
}

.empty,
.emptyDocument,
.emptyDetails {
color: #84918c;
text-align: center;
padding: 35px 15px;
}

.bigIcon {
font-size: 40px;
}

footer {
background: #071512;
color: white;
padding: 25px 6%;
display: flex;
justify-content: space-between;
}

footer span {
color: #8ea39b;
}

@media (max-width: 850px) {
.stats,
.content,
.employeeForm {
grid-template-columns: 1fr;
}

.employeeForm textarea {
grid-column: span 1;
}

.welcome {
flex-direction: column;
align-items: flex-start;
gap: 20px;
}

.addButton {
width: 100%;
}

.infoGrid {
grid-template-columns: 1fr;
}
}
`}\</style>
\</main>
);
}
