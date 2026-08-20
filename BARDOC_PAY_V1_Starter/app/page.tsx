"use client";

import { useState } from "react";

type Employee = {
id: number;
name: string;
role: string;
department: string;
email: string;
phone: string;
status: "Attivo" | "Assente";
};

const employees: Employee[] = [
{
id: 1,
name: "Dipendente 1",
role: "Operatore Sportello",
department: "BARDOC SERVICE",
email: "dipendente1@bardocservice.com",
phone: "",
status: "Attivo",
},
{
id: 2,
name: "Dipendente 2",
role: "Operatore Sportello",
department: "BARDOC SERVICE",
email: "dipendente2@bardocservice.com",
phone: "",
status: "Attivo",
},
{
id: 3,
name: "Dipendente 3",
role: "Operatore Sportello",
department: "BARDOC SERVICE",
email: "dipendente3@bardocservice.com",
phone: "",
status: "Attivo",
},
{
id: 4,
name: "Dipendente 4",
role: "Operatore Sportello",
department: "BARDOC SERVICE",
email: "dipendente4@bardocservice.com",
phone: "",
status: "Attivo",
},
];

export default function Home() {
const [activePage, setActivePage] = useState("dashboard");
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
null
);
const [showMenu, setShowMenu] = useState(false);

const menuItems = [
{ id: "dashboard", icon: "▦", label: "Dashboard" },
{ id: "dipendenti", icon: "♙", label: "Dipendenti" },
{ id: "presenze", icon: "◷", label: "Presenze" },
{ id: "ferie", icon: "☀", label: "Ferie e permessi" },
{ id: "buste", icon: "▤", label: "Buste paga" },
{ id: "documenti", icon: "□", label: "Documenti" },
{ id: "calendario", icon: "□", label: "Calendario" },
{ id: "comunicazioni", icon: "✉", label: "Comunicazioni" },
];

function renderContent() {
switch (activePage) {
case "dipendenti":
return (
<section>
<div className="pageHeader">
<div>
<h1>Dipendenti</h1>
<p>Gestisci il personale di BARDOC SERVICE.</p>
</div>

<button className="primaryButton">+ Nuovo dipendente</button>
</div>

<div className="card">
<div className="searchRow">
<input
className="search"
placeholder="Cerca dipendente..."
/>

<select className="select">
<option>Tutti</option>
<option>Attivi</option>
<option>Assenti</option>
</select>
</div>

<div className="table">
<div className="tableHeader">
<span>Dipendente</span>
<span>Ruolo</span>
<span>Email</span>
<span>Stato</span>
<span></span>
</div>

{employees.map((employee) => (
<div className="tableRow" key={employee.id}>
<div className="employeeName">
<div className="avatar">
{employee.name.charAt(employee.name.length - 1)}
</div>
<div>
<strong>{employee.name}</strong>
<small>{employee.department}</small>
</div>
</div>

<span>{employee.role}</span>
<span>{employee.email}</span>

<span>
<b className="status">
<i></i>
{employee.status}
</b>
</span>

<button
className="detailsButton"
onClick={() => setSelectedEmployee(employee)}
>
Apri
</button>
</div>
))}
</div>
</div>
</section>
);

case "presenze":
return (
<section>
<div className="pageHeader">
<div>
<h1>Presenze</h1>
<p>Controlla entrate, uscite e ore lavorate.</p>
</div>

<button className="primaryButton">+ Registra presenza</button>
</div>

<div className="stats">
<Stat title="Presenti oggi" value="4" />
<Stat title="Assenti oggi" value="0" />
<Stat title="Ore lavorate" value="32h" />
<Stat title="Ore straordinarie" value="2h" />
</div>

<div className="card">
<h2>Presenze di oggi</h2>

{employees.map((employee) => (
<div className="presenceRow" key={employee.id}>
<div className="employeeName">
<div className="avatar">
{employee.name.charAt(employee.name.length - 1)}
</div>
<strong>{employee.name}</strong>
</div>

<span>Entrata: 08:00</span>
<span>Uscita: 13:30</span>

<b className="status">
<i></i>
Presente
</b>
</div>
))}
</div>
</section>
);

case "ferie":
return (
<section>
<div className="pageHeader">
<div>
<h1>Ferie e permessi</h1>
<p>Gestisci richieste e disponibilità del personale.</p>
</div>

<button className="primaryButton">+ Nuova richiesta</button>
</div>

<div className="stats">
<Stat title="Richieste in attesa" value="2" />
<Stat title="Ferie approvate" value="6" />
<Stat title="Permessi" value="3" />
<Stat title="Giorni disponibili" value="18" />
</div>

<div className="card">
<h2>Richieste recenti</h2>

<div className="request">
<div>
<strong>Dipendente 1</strong>
<small>Ferie · 25/08/2026 - 29/08/2026</small>
</div>

<span className="waiting">In attesa</span>

<div className="requestButtons">
<button className="approve">Approva</button>
<button className="reject">Rifiuta</button>
</div>
</div>

<div className="request">
<div>
<strong>Dipendente 2</strong>
<small>Permesso · 27/08/2026</small>
</div>

<span className="waiting">In attesa</span>

<div className="requestButtons">
<button className="approve">Approva</button>
<button className="reject">Rifiuta</button>
</div>
</div>
</div>
</section>
);

case "buste":
return (
<section>
<div className="pageHeader">
<div>
<h1>Buste paga</h1>
<p>Archivio delle buste paga dei dipendenti.</p>
</div>

<button className="primaryButton">+ Carica busta paga</button>
</div>

<div className="card">
<div className="payroll">
<div>
<strong>Agosto 2026</strong>
<small>Dipendente 1</small>
</div>

<span>PDF</span>
<button className="detailsButton">Visualizza</button>
</div>

<div className="payroll">
<div>
<strong>Agosto 2026</strong>
<small>Dipendente 2</small>
</div>

<span>PDF</span>
<button className="detailsButton">Visualizza</button>
</div>

<div className="payroll">
<div>
<strong>Agosto 2026</strong>
<small>Dipendente 3</small>
</div>

<span>PDF</span>
<button className="detailsButton">Visualizza</button>
</div>
</div>
</section>
);

case "documenti":
return (
<section>
<div className="pageHeader">
<div>
<h1>Documenti</h1>
<p>Documenti del personale e dell'azienda.</p>
</div>

<button className="primaryButton">+ Carica documento</button>
</div>

<div className="documentGrid">
<Document title="Contratti" icon="▤" />
<Document title="Documenti personali" icon="□" />
<Document title="Certificazioni" icon="✓" />
<Document title="Buste paga" icon="€" />
<Document title="Comunicazioni" icon="✉" />
<Document title="Altri documenti" icon="+" />
</div>
</section>
);

case "calendario":
return (
<section>
<div className="pageHeader">
<div>
<h1>Calendario</h1>
<p>Turni, ferie, permessi e appuntamenti.</p>
</div>
</div>

<div className="card calendar">
<div className="calendarTop">
<button>‹</button>
<h2>Agosto 2026</h2>
<button>›</button>
</div>

<div className="week">
<span>Lun</span>
<span>Mar</span>
<span>Mer</span>
<span>Gio</span>
<span>Ven</span>
<span>Sab</span>
<span>Dom</span>
</div>

<div className="days">
{Array.from({ length: 31 }, (_, i) => (
<div key={i} className={i + 1 === 20 ? "today" : ""}>
{i + 1}
</div>
))}
</div>
</div>
</section>
);

case "comunicazioni":
return (
<section>
<div className="pageHeader">
<div>
<h1>Comunicazioni</h1>
<p>Invia comunicazioni al personale.</p>
</div>

<button className="primaryButton">+ Nuova comunicazione</button>
</div>

<div className="card">
<div className="message">
<div className="messageIcon">✉</div>
<div>
<strong>Comunicazione aziendale</strong>
<p>Nuovi orari operativi BARDOC SERVICE.</p>
<small>20 agosto 2026</small>
</div>
</div>

<div className="message">
<div className="messageIcon">!</div>
<div>
<strong>Avviso al personale</strong>
<p>Ricordiamo di registrare correttamente entrate e uscite.</p>
<small>19 agosto 2026</small>
</div>
</div>
</div>
</section>
);

default:
return (
<section>
<div className="welcome">
<div>
<p className="eyebrow">BARDOC SERVICE</p>
<h1>Portale Dipendenti</h1>
<p>
Tutto il personale aziendale in un unico posto.
</p>
</div>

<div className="welcomeLogo">B</div>
</div>

<div className="stats">
<Stat title="Dipendenti" value="4" />
<Stat title="Presenti oggi" value="4" />
<Stat title="Ferie in attesa" value="2" />
<Stat title="Documenti" value="28" />
</div>

<div className="dashboardGrid">
<div className="card">
<div className="cardTitle">
<div>
<h2>Presenze di oggi</h2>
<p>Situazione del personale</p>
</div>

<button
className="linkButton"
onClick={() => setActivePage("presenze")}
>
Vedi tutte
</button>
</div>

{employees.map((employee) => (
<div className="miniEmployee" key={employee.id}>
<div className="employeeName">
<div className="avatar">
{employee.name.charAt(employee.name.length - 1)}
</div>

<div>
<strong>{employee.name}</strong>
<small>{employee.role}</small>
</div>
</div>

<b className="status">
<i></i>
Presente
</b>
</div>
))}
</div>

<div className="card">
<div className="cardTitle">
<div>
<h2>Azioni rapide</h2>
<p>Gestisci il personale</p>
</div>
</div>

<div className="quickActions">
<button onClick={() => setActivePage("dipendenti")}>
<span>♙</span>
Dipendenti
</button>

<button onClick={() => setActivePage("presenze")}>
<span>◷</span>
Presenze
</button>

<button onClick={() => setActivePage("ferie")}>
<span>☀</span>
Ferie e permessi
</button>

<button onClick={() => setActivePage("buste")}>
<span>▤</span>
Buste paga
</button>
</div>
</div>
</div>

<div className="card">
<div className="cardTitle">
<div>
<h2>Attività recenti</h2>
<p>Ultime attività del portale</p>
</div>
</div>

<div className="activity">
<span className="activityDot"></span>
<div>
<strong>Nuova richiesta ferie</strong>
<small>Dipendente 1 · oggi alle 09:15</small>
</div>
</div>

<div className="activity">
<span className="activityDot"></span>
<div>
<strong>Presenza registrata</strong>
<small>Dipendente 2 · oggi alle 08:02</small>
</div>
</div>

<div className="activity">
<span className="activityDot"></span>
<div>
<strong>Nuovo documento caricato</strong>
<small>Dipendente 3 · ieri alle 16:42</small>
</div>
</div>
</div>
</section>
);
}
}

return (
<>
<style jsx global>{`
* {
box-sizing: border-box;
}

body {
margin: 0;
font-family: Arial, Helvetica, sans-serif;
background: #f4f7f6;
color: #182522;
}

button,
input,
select {
font-family: inherit;
}

button {
cursor: pointer;
}

.app {
min-height: 100vh;
display: flex;
}

.sidebar {
width: 250px;
min-height: 100vh;
background: #111918;
color: white;
padding: 24px 16px;
position: fixed;
left: 0;
top: 0;
bottom: 0;
z-index: 10;
}

.brand {
display: flex;
align-items: center;
gap: 10px;
padding: 0 10px 28px;
}

.brandLogo {
width: 38px;
height: 38px;
border-radius: 11px;
background: #32e0a0;
color: #10201b;
display: flex;
align-items: center;
justify-content: center;
font-size: 23px;
font-weight: 900;
}

.brand strong {
font-size: 18px;
letter-spacing: .4px;
}

.brand small {
display: block;
color: #9baaa5;
margin-top: 3px;
font-size: 10px;
}

.nav {
display: flex;
flex-direction: column;
gap: 5px;
}

.navButton {
width: 100%;
border: 0;
background: transparent;
color: #aebbb7;
padding: 12px 13px;
border-radius: 10px;
text-align: left;
display: flex;
align-items: center;
gap: 12px;
font-size: 14px;
}

.navButton:hover,
.navButton.active {
background: #20302c;
color: #42e3a6;
}

.navIcon {
width: 20px;
text-align: center;
font-size: 17px;
}

.sidebarBottom {
position: absolute;
left: 16px;
right: 16px;
bottom: 20px;
border-top: 1px solid #293532;
padding-top: 15px;
}

.userBox {
display: flex;
align-items: center;
gap: 10px;
padding: 10px;
}

.userAvatar {
width: 36px;
height: 36px;
background: #32e0a0;
color: #10201b;
border-radius: 50%;
display: flex;
justify-content: center;
align-items: center;
font-weight: 800;
}

.userBox strong {
font-size: 13px;
}

.userBox small {
display: block;
color: #889691;
margin-top: 2px;
}

.main {
margin-left: 250px;
width: calc(100% - 250px);
min-height: 100vh;
}

.topbar {
height: 72px;
background: white;
border-bottom: 1px solid #e4ebe8;
display: flex;
justify-content: space-between;
align-items: center;
padding: 0 35px;
position: sticky;
top: 0;
z-index: 5;
}

.topTitle {
font-size: 14px;
color: #71807b;
}

.topRight {
display: flex;
align-items: center;
gap: 18px;
}

.notification {
position: relative;
font-size: 21px;
}

.badge {
position: absolute;
top: -5px;
right: -7px;
width: 16px;
height: 16px;
background: #ff625d;
color: white;
border-radius: 50%;
font-size: 9px;
display: flex;
justify-content: center;
align-items: center;
}

.content {
padding: 35px;
max-width: 1450px;
margin: auto;
}

.pageHeader {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 27px;
}

h1 {
margin: 0;
font-size: 31px;
letter-spacing: -1px;
}

h2 {
margin: 0;
font-size: 18px;
}

.pageHeader p,
.cardTitle p {
color: #7a8984;
margin: 7px 0 0;
font-size: 14px;
}

.primaryButton {
border: 0;
background: #31dca0;
color: #10201b;
font-weight: 800;
padding: 12px 18px;
border-radius: 9px;
}

.primaryButton:hover {
background: #24c98e;
}

.welcome {
background: linear-gradient(120deg, #10211d, #1d3830);
border-radius: 18px;
color: white;
padding: 34px 38px;
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 25px;
}

.welcome h1 {
font-size: 35px;
margin-top: 3px;
}

.welcome p:not(.eyebrow) {
color: #c4d4ce;
}

.eyebrow {
color: #42e3a6;
font-weight: 800;
font-size: 12px;
letter-spacing: 1px;
margin: 0 0 5px;
}

.welcomeLogo {
width: 90px;
height: 90px;
border-radius: 25px;
background: #32e0a0;
color: #10201b;
display: flex;
align-items: center;
justify-content: center;
font-size: 55px;
font-weight: 900;
}

.stats {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 17px;
margin-bottom: 23px;
}

.stat {
background: white;
border: 1px solid #e5ebe9;
border-radius: 13px;
padding: 20px;
}

.statLabel {
color: #75837f;
font-size: 13px;
}

.statValue {
font-size: 29px;
font-weight: 800;
margin-top: 9px;
}

.dashboardGrid {
display: grid;
grid-template-columns: 1.4fr 1fr;
gap: 22px;
margin-bottom: 22px;
}

.card {
background: white;
border: 1px solid #e3eae7;
border-radius: 14px;
padding: 23px;
margin-bottom: 22px;
overflow: hidden;
}

.cardTitle {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 20px;
}

.linkButton {
border: 0;
background: transparent;
color: #13ad79;
font-weight: 700;
}

.miniEmployee,
.presenceRow,
.payroll,
.request,
.message,
.activity {
display: flex;
align-items: center;
justify-content: space-between;
padding: 14px 0;
border-bottom: 1px solid #edf1ef;
}

.miniEmployee:last-child,
.presenceRow:last-child,
.payroll:last-child,
.request:last-child,
.message:last-child,
.activity:last-child {
border-bottom: 0;
}

.employeeName {
display: flex;
align-items: center;
gap: 11px;
}

.avatar {
width: 38px;
height: 38px;
background: #d9f8ed;
color: #087b58;
border-radius: 10px;
display: flex;
align-items: center;
justify-content: center;
font-weight: 800;
}

.employeeName strong,
.request strong,
.payroll strong,
.message strong {
display: block;
font-size: 14px;
}

.employeeName small,
.request small,
.payroll small,
.message small,
.activity small {
display: block;
color: #87948f;
margin-top: 4px;
font-size: 12px;
}

.status {
color: #15966d;
font-size: 12px;
display: flex;
align-items: center;
gap: 6px;
}

.status i {
display: block;
width: 7px;
height: 7px;
background: #27d394;
border-radius: 50%;
}

.quickActions {
display: grid;
grid-template-columns: 1fr 1fr;
gap: 11px;
}

.quickActions button {
border: 1px solid #e2e9e6;
background: #f8faf9;
border-radius: 11px;
padding: 17px 10px;
color: #24322f;
text-align: left;
font-weight: 700;
}

.quickActions button:hover {
border-color: #32dca0;
background: #f0fff9;
}

.quickActions span {
color: #0eae79;
font-size: 20px;
display: block;
margin-bottom: 7px;
}

.activity {
justify-content: flex-start;
gap: 12px;
}

.activityDot {
width: 9px;
height: 9px;
border-radius: 50%;
background: #31dca0;
}

.searchRow {
display: flex;
gap: 12px;
margin-bottom: 20px;
}

.search,
.select {
border: 1px solid #dce5e1;
border-radius: 9px;
padding: 12px 14px;
outline: none;
background: white;
}

.search {
width: 100%;
max-width: 450px;
}

.select {
min-width: 150px;
}

.table {
width: 100%;
overflow-x: auto;
}

.tableHeader,
.tableRow {
min-width: 850px;
display: grid;
grid-template-columns: 2fr 1.5fr 2fr 1fr .7fr;
gap: 15px;
align-items: center;
}

.tableHeader {
color: #84918d;
font-size: 11px;
text-transform: uppercase;
padding: 13px 0;
border-bottom: 1px solid #e7ecea;
}

.tableRow {
padding: 15px 0;
border-bottom: 1px solid #edf1ef;
font-size: 13px;
}

.detailsButton {
border: 1px solid #d5e2dd;
background: white;
color: #178a67;
padding: 8px 12px;
border-radius: 7px;
font-weight: 700;
}

.detailsButton:hover {
background: #effbf7;
}

.presenceRow {
gap: 20px;
font-size: 13px;
}

.waiting {
color: #b67800;
background: #fff6dd;
padding: 6px 10px;
border-radius: 20px;
font-size: 11px;
font-weight: 700;
}

.requestButtons {
display: flex;
gap: 7px;
}

.approve,
.reject {
border: 0;
padding: 8px 11px;
border-radius: 7px;
font-size: 12px;
font-weight: 700;
}

.approve {
background: #dff8ed;
color: #087b58;
}

.reject {
background: #ffebeb;
color: #b33d3d;
}

.payroll span {
background: #e9f0ff;
color: #3c65b7;
padding: 5px 9px;
border-radius: 5px;
font-size: 10px;
font-weight: 800;
}

.documentGrid {
display: grid;
grid-template-columns: repeat(3, 1fr);
gap: 18px;
}

.document {
background: white;
border: 1px solid #e2e9e6;
border-radius: 14px;
padding: 24px;
transition: .2s;
}

.document:hover {
transform: translateY(-2px);
border-color: #32dca0;
}

.documentIcon {
width: 45px;
height: 45px;
background: #dff8ed;
color: #0b956a;
border-radius: 11px;
display: flex;
align-items: center;
justify-content: center;
font-size: 20px;
margin-bottom: 15px;
}

.document strong {
font-size: 15px;
}

.document small {
display: block;
color: #84918d;
margin-top: 6px;
}

.calendar {
max-width: 900px;
}

.calendarTop {
display: flex;
align-items: center;
justify-content: space-between;
margin-bottom: 25px;
}

.calendarTop button {
border: 1px solid #dfe8e4;
background: white;
border-radius: 7px;
width: 35px;
height: 35px;
}

.week,
.days {
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 7px;
}

.week {
color: #899690;
font-size: 11px;
text-align: center;
margin-bottom: 7px;
}

.days div {
min-height: 75px;
padding: 10px;
border: 1px solid #edf1ef;
border-radius: 8px;
font-size: 13px;
}

.days .today {
background: #dff8ed;
border-color: #31dca0;
font-weight: 800;
}

.message {
justify-content: flex-start;
gap: 15px;
}

.messageIcon {
width: 42px;
height: 42px;
border-radius: 10px;
background: #e0f8ee;
color: #0b966a;
display: flex;
align-items: center;
justify-content: center;
font-weight: 800;
}

@media (max-width: 1000px) {
.sidebar {
width: 210px;
}

.main {
margin-left: 210px;
width: calc(100% - 210px);
}

.stats {
grid-template-columns: repeat(2, 1fr);
}

.dashboardGrid {
grid-template-columns: 1fr;
}

.documentGrid {
grid-template-columns: repeat(2, 1fr);
}
}

@media (max-width: 700px) {
.sidebar {
width: 70px;
padding: 15px 8px;
}

.brand strong,
.brand small,
.navButton span:not(.navIcon),
.sidebarBottom {
display: none;
}

.brand {
justify-content: center;
padding: 0 0 20px;
}

.navButton {
justify-content: center;
padding: 13px;
}

.main {
margin-left: 70px;
width: calc(100% - 70px);
}

.content {
padding: 20px;
}

.topbar {
padding: 0 20px;
}

.pageHeader {
align-items: flex-start;
gap: 15px;
flex-direction: column;
}

.stats {
grid-template-columns: 1fr 1fr;
}

.documentGrid {
grid-template-columns: 1fr;
}

.welcomeLogo {
display: none;
}
}
`}</style>

<div className="app">
<aside className="sidebar">
<div className="brand">
<div className="brandLogo">B</div>
<div>
<strong>BARDOC SERVICE</strong>
<small>PORTALE DIPENDENTI</small>
</div>
</div>

<nav className="nav">
{menuItems.map((item) => (
<button
key={item.id}
className={`navButton ${
activePage === item.id ? "active" : ""
}`}
onClick={() => setActivePage(item.id)}
>
<span className="navIcon">{item.icon}</span>
<span>{item.label}</span>
</button>
))}
</nav>

<div className="sidebarBottom">
<div className="userBox">
<div className="userAvatar">A</div>
<div>
<strong>Amministratore</strong>
<small>BARDOC SERVICE</small>
</div>
</div>
</div>
</aside>

<main className="main">
<header className="topbar">
<div className="topTitle">
BARDOC SERVICE / Portale del personale
</div>

<div className="topRight">
<div className="notification">
♧
<span className="badge">2</span>
</div>

<div className="userAvatar">A</div>
</div>
</header>

<div className="content">{renderContent()}</div>
</main>

{selectedEmployee && (
<div
style={{
position: "fixed",
inset: 0,
background: "rgba(0,0,0,.45)",
zIndex: 50,
display: "flex",
alignItems: "center",
justifyContent: "center",
padding: 20,
}}
onClick={() => setSelectedEmployee(null)}
>
<div
style={{
background: "white",
width: "100%",
maxWidth: 500,
borderRadius: 18,
padding: 30,
}}
onClick={(e) => e.stopPropagation()}
>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 25,
}}
>
<h2>Scheda dipendente</h2>

<button
onClick={() => setSelectedEmployee(null)}
style={{
border: 0,
background: "#f0f3f2",
borderRadius: 8,
width: 35,
height: 35,
}}
>
×
</button>
</div>

<div
style={{
display: "flex",
alignItems: "center",
gap: 15,
marginBottom: 25,
}}
>
<div className="avatar" style={{ width: 55, height: 55 }}>
{selectedEmployee.name.charAt(
selectedEmployee.name.length - 1
)}
</div>

<div>
<strong>{selectedEmployee.name}</strong>
<small>{selectedEmployee.role}</small>
</div>
</div>

<div
style={{
display: "grid",
gap: 15,
fontSize: 14,
}}
>
<div>
<small style={{ color: "#83908c" }}>Reparto</small>
<div>{selectedEmployee.department}</div>
</div>

<div>
<small style={{ color: "#83908c" }}>Email</small>
<div>{selectedEmployee.email}</div>
</div>

<div>
<small style={{ color: "#83908c" }}>Telefono</small>
<div>{selectedEmployee.phone || "Non inserito"}</div>
</div>

<div>
<small style={{ color: "#83908c" }}>Stato</small>
<div className="status">
<i></i>
{selectedEmployee.status}
</div>
</div>
</div>
</div>
</div>
)}
</div>
</>
);
}

function Stat({ title, value }: { title: string; value: string }) {
return (
<div className="stat">
<div className="statLabel">{title}</div>
<div className="statValue">{value}</div>
</div>
);
}

function Document({ title, icon }: { title: string; icon: string }) {
return (
<div className="document">
<div className="documentIcon">{icon}</div>
<strong>{title}</strong>
<small>Gestisci i documenti</small>
</div>
);
}
