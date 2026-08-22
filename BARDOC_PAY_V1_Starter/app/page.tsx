"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { supabase } from "../lib/supabase";

/* =========================================================
   BARDOC PAY - PAGINA COMPLETA
   ========================================================= */

type Employee = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  active: boolean;
};

type DocumentRow = {
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

type EmployeeProfile = {
  employee_id: string;
  employment_start_date: string | null;
  photo_path: string | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  present_days: number;
  absent_days: number;
};

const ADMIN_EMAIL = "bardocfg@gmail.com";
const CURRENT_YEAR = new Date().getFullYear();

const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 5 + i);

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const CATEGORY_LABELS: Record<string, string> = {
  lavoro: "Rapporto di lavoro",
  permessi: "Permessi e assenze",
  personali: "Documenti personali",
  curriculum: "Curriculum",
};

const DOCUMENT_TYPES: Record<string, { value: string; label: string }[]> = {
  lavoro: [{ value: "work_contract", label: "Contratto di lavoro" }],
  permessi: [{ value: "leave_permit", label: "Foglio permesso / assenza" }],
  personali: [
    { value: "id_card", label: "Documento d'identità" },
    { value: "driver_license", label: "Patente" },
  ],
  curriculum: [{ value: "curriculum", label: "Curriculum / CV storico" }],
};

const PAYMENT_TYPES = [
  { value: "payslip", label: "Busta paga" },
  { value: "payment_statement", label: "Distinta di pagamento" },
  { value: "extra", label: "Extra" },
  { value: "work_bonus", label: "Premio lavorativo" },
];

function documentLabel(type: string) {
  if (type === "payslip") return "Busta paga";
  if (type === "payment_statement") return "Distinta di pagamento";
  if (type === "extra") return "Extra";
  if (type === "work_bonus") return "Premio lavorativo";
  return Object.values(DOCUMENT_TYPES).flat().find(x => x.value === type)?.label || type;
}

function monthLabel(month: number | null) {
  return month ? MONTHS[month - 1] || String(month) : "";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
}

function formatCommunicationDate(value: string) {
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function expiryStatus(date: string | null) {
  if (!date) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${date}T00:00:00`);
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 30) return "warning";
  return "valid";
}

const inputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "13px 14px",
  borderRadius: 10, border: "1px solid #344955", background: "#101e28",
  color: "#fff", fontSize: 14, outline: "none",
};

const selectStyle: CSSProperties = { ...inputStyle };

const buttonStyle: CSSProperties = {
  width: "100%", padding: 14, border: "none", borderRadius: 10,
  background: "#16c784", color: "#062019", fontWeight: 900, cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  padding: "10px 15px", border: "1px solid #344955", borderRadius: 9,
  background: "#13222c", color: "#dce6e9", fontWeight: 800, cursor: "pointer",
};

const cardStyle: CSSProperties = {
  background: "#172630", border: "1px solid #293c47", borderRadius: 16, padding: 22,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: "block", color: "#aebbc2", fontSize: 12, fontWeight: 800, marginBottom: 7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <div style={{ marginTop: 15, padding: 13, borderRadius: 9, background: "#12342d", color: "#b9f3de", fontSize: 13 }}>{text}</div>;
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
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [employeePhotoUrl, setEmployeePhotoUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRow[]>([]);
  const [adminCommunications, setAdminCommunications] = useState<Communication[]>([]);
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [category, setCategory] = useState("personali");
  const [documentType, setDocumentType] = useState("id_card");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [taxCode, setTaxCode] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [paymentType, setPaymentType] = useState("payslip");
  const [paymentMonth, setPaymentMonth] = useState(new Date().getMonth() + 1);
  const [paymentYear, setPaymentYear] = useState(CURRENT_YEAR);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);

  const [communicationMode, setCommunicationMode] = useState<"individual" | "general">("individual");
  const [communicationEmployee, setCommunicationEmployee] = useState("");
  const [communicationTitle, setCommunicationTitle] = useState("");
  const [communicationMessage, setCommunicationMessage] = useState("");

  const [profileEmployee, setProfileEmployee] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const [attendanceEmployee, setAttendanceEmployee] = useState("");
  const [attendanceYear, setAttendanceYear] = useState(CURRENT_YEAR);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [presentDays, setPresentDays] = useState(0);
  const [absentDays, setAbsentDays] = useState(0);

  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (isAdmin) loadAdminData();
    else loadEmployeeArea();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    if (loginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("Email o password non corretti.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      setMessage(error ? error.message : "Account creato. Controlla la tua email se è richiesta la conferma.");
    }
    setSubmitting(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null); setEmployee(null); setDocuments([]); setEmployees([]);
    setAllDocuments([]); setCommunications([]); setAdminCommunications([]);
    setProfiles([]); setAllAttendance([]); setAttendance([]); setEmployeePhotoUrl(null);
  }

  async function signedPhoto(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from("employee-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  }

  async function loadEmployeeArea() {
    if (!session?.user?.id) return;
    const { data: emp, error } = await supabase.from("employees").select("*").eq("auth_user_id", session.user.id).maybeSingle();
    if (error) { console.error(error); return; }
    setEmployee(emp || null);
    if (!emp) return;

    const [docsRes, commRes, profileRes, attendanceRes] = await Promise.all([
      supabase.from("documents").select("*").eq("employee_id", emp.id).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("communications").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_profiles").select("*").eq("employee_id", emp.id).maybeSingle(),
      supabase.from("attendance_monthly").select("*").eq("employee_id", emp.id).order("year", { ascending: false }).order("month", { ascending: false }),
    ]);

    setDocuments(docsRes.data || []);
    setCommunications(commRes.data || []);
    setEmployeeProfile(profileRes.data || null);
    setAttendance(attendanceRes.data || []);
    setEmployeePhotoUrl(await signedPhoto(profileRes.data?.photo_path || null));
  }

  async function loadAdminData() {
    setAdminLoading(true);
    const [empRes, docsRes, commRes, profileRes, attendanceRes] = await Promise.all([
      supabase.from("employees").select("*").eq("active", true).order("full_name"),
      supabase.from("documents").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("communications").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_profiles").select("*"),
      supabase.from("attendance_monthly").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
    ]);
    if (empRes.error) setMessage("Impossibile caricare i dipendenti.");
    setEmployees(empRes.data || []);
    setAllDocuments(docsRes.data || []);
    setAdminCommunications(commRes.data || []);
    setProfiles(profileRes.data || []);
    setAllAttendance(attendanceRes.data || []);
    setAdminLoading(false);
  }

  function resetDocumentForm() {
    setSelectedEmployee(""); setCategory("personali"); setDocumentType("id_card");
    setYear(CURRENT_YEAR); setTaxCode(""); setExpiryDate(""); setFile(null);
  }

  async function uploadDocument() {
    setMessage("");
    if (!selectedEmployee) return setMessage("Seleziona un dipendente.");
    if (!file) return setMessage("Seleziona un file PDF.");
    if (file.type !== "application/pdf") return setMessage("Il documento deve essere un PDF.");
    const cf = taxCode.trim().toUpperCase();
    if (cf && !/^[A-Z0-9]{16}$/.test(cf)) return setMessage("Il Codice Fiscale deve contenere 16 caratteri alfanumerici.");
    if (documentType === "driver_license" && !cf) return setMessage("Per la patente il Codice Fiscale è obbligatorio.");
    if ((documentType === "id_card" || documentType === "driver_license") && !expiryDate) return setMessage("Inserisci la data di scadenza.");

    setSubmitting(true);
    try {
      const safe = file.name.replace(/[^\w.\- ]/g, "").replace(/\s+/g, "_");
      const path = `${selectedEmployee}/${Date.now()}_${safe}`;
      const { error: uploadError } = await supabase.storage.from("payroll-documents").upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("documents").insert({
        employee_id: selectedEmployee, document_type: documentType, month: null, year,
        file_name: file.name, storage_path: path, tax_code: cf || null, expiry_date: expiryDate || null,
      });
      if (error) throw error;
      setMessage("Documento caricato correttamente. ✅");
      resetDocumentForm();
      await loadAdminData();
    } catch (e: any) { setMessage(e?.message || "Errore durante il caricamento del documento."); }
    setSubmitting(false);
  }

  async function uploadPayment() {
    setMessage("");
    if (!selectedEmployee) return setMessage("Seleziona un dipendente.");
    if (!paymentFile) return setMessage("Seleziona un file PDF.");
    if (paymentFile.type !== "application/pdf") return setMessage("Il documento deve essere un PDF.");
    setSubmitting(true);
    try {
      const safe = paymentFile.name.replace(/[^\w.\- ]/g, "").replace(/\s+/g, "_");
      const path = `${selectedEmployee}/${paymentYear}/${String(paymentMonth).padStart(2, "0")}/${Date.now()}_${safe}`;
      const { error: uploadError } = await supabase.storage.from("payroll-documents").upload(path, paymentFile, { upsert: false, contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("documents").insert({
        employee_id: selectedEmployee, document_type: paymentType, month: paymentMonth, year: paymentYear,
        file_name: paymentFile.name, storage_path: path, tax_code: null, expiry_date: null,
      });
      if (error) throw error;
      setPaymentFile(null);
      setMessage("Documento di pagamento caricato correttamente. ✅");
      await loadAdminData();
    } catch (e: any) { setMessage(e?.message || "Errore durante il caricamento del pagamento."); }
    setSubmitting(false);
  }

  async function openDocument(doc: DocumentRow) {
    const { data, error } = await supabase.storage.from("payroll-documents").createSignedUrl(doc.storage_path, 300);
    if (error || !data?.signedUrl) return setMessage("Impossibile aprire il documento.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function sendCommunication() {
    setMessage("");
    const title = communicationTitle.trim();
    const text = communicationMessage.trim();
    if (!title) return setMessage("Inserisci il titolo della comunicazione.");
    if (!text) return setMessage("Inserisci il testo della comunicazione.");
    if (communicationMode === "individual" && !communicationEmployee) return setMessage("Seleziona il dipendente destinatario.");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("communications").insert({
        employee_id: communicationMode === "individual" ? communicationEmployee : null,
        title, message: text, is_general: communicationMode === "general",
      });
      if (error) throw error;
      setCommunicationTitle(""); setCommunicationMessage(""); setCommunicationEmployee("");
      setMessage(communicationMode === "general" ? "Comunicazione generale inviata a tutti i dipendenti. ✅" : "Comunicazione inviata al dipendente selezionato. ✅");
      await loadAdminData();
    } catch (e: any) { setMessage(e?.message || "Errore durante l'invio della comunicazione."); }
    setSubmitting(false);
  }

  async function deleteCommunication(id: string) {
    if (!window.confirm("Vuoi cancellare definitivamente questa comunicazione?")) return;
    setSubmitting(true);
    const { error } = await supabase.from("communications").delete().eq("id", id);
    if (error) setMessage(error.message);
    else { setMessage("Comunicazione cancellata. ✅"); await loadAdminData(); }
    setSubmitting(false);
  }

  async function saveProfile() {
    setMessage("");
    if (!profileEmployee) return setMessage("Seleziona un dipendente.");
    setSubmitting(true);
    try {
      let photoPath = profiles.find(p => p.employee_id === profileEmployee)?.photo_path || null;
      if (profilePhoto) {
        if (!profilePhoto.type.startsWith("image/")) throw new Error("La foto deve essere un'immagine.");
        const safe = profilePhoto.name.replace(/[^\w.\-]/g, "_");
        const path = `${profileEmployee}/${Date.now()}_${safe}`;
        const { error } = await supabase.storage.from("employee-photos").upload(path, profilePhoto, { upsert: false });
        if (error) throw error;
        photoPath = path;
      }
      const { error } = await supabase.from("employee_profiles").upsert({
        employee_id: profileEmployee,
        employment_start_date: employmentStartDate || null,
        photo_path: photoPath,
      }, { onConflict: "employee_id" });
      if (error) throw error;
      setProfilePhoto(null);
      setMessage("Profilo dipendente aggiornato. ✅");
      await loadAdminData();
    } catch (e: any) { setMessage(e?.message || "Errore durante il salvataggio del profilo."); }
    setSubmitting(false);
  }

  function selectProfileEmployee(id: string) {
    setProfileEmployee(id);
    const profile = profiles.find(p => p.employee_id === id);
    setEmploymentStartDate(profile?.employment_start_date || "");
    setProfilePhoto(null);
  }

  function selectAttendanceEmployee(id: string) {
    setAttendanceEmployee(id);
    const row = allAttendance.find(a => a.employee_id === id && a.year === attendanceYear && a.month === attendanceMonth);
    setPresentDays(row?.present_days || 0);
    setAbsentDays(row?.absent_days || 0);
  }

  function loadAttendanceForm(yearValue: number, monthValue: number, employeeId = attendanceEmployee) {
    setAttendanceYear(yearValue); setAttendanceMonth(monthValue);
    const row = allAttendance.find(a => a.employee_id === employeeId && a.year === yearValue && a.month === monthValue);
    setPresentDays(row?.present_days || 0); setAbsentDays(row?.absent_days || 0);
  }

  async function saveAttendance() {
    setMessage("");
    if (!attendanceEmployee) return setMessage("Seleziona un dipendente.");
    if (presentDays < 0 || absentDays < 0) return setMessage("I giorni non possono essere negativi.");
    setSubmitting(true);
    const { error } = await supabase.from("attendance_monthly").upsert({
      employee_id: attendanceEmployee, year: attendanceYear, month: attendanceMonth,
      present_days: Number(presentDays), absent_days: Number(absentDays),
    }, { onConflict: "employee_id,year,month" });
    if (error) setMessage(error.message);
    else { setMessage("Presenze e assenze salvate. ✅"); await loadAdminData(); }
    setSubmitting(false);
  }

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    const ids = new Set(allDocuments.filter(d => (d.tax_code || "").toLowerCase().includes(q)).map(d => d.employee_id));
    return employees.filter(e => e.full_name.toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q) || ids.has(e.id));
  }, [search, employees, allDocuments]);

  const payslips = useMemo(() => allDocuments.filter(d => d.document_type === "payslip"), [allDocuments]);
  const paymentStatements = useMemo(() => allDocuments.filter(d => d.document_type === "payment_statement"), [allDocuments]);
  const extras = useMemo(() => allDocuments.filter(d => d.document_type === "extra"), [allDocuments]);
  const bonuses = useMemo(() => allDocuments.filter(d => d.document_type === "work_bonus"), [allDocuments]);

  const expiringDocuments = useMemo(() => allDocuments.filter(d => expiryStatus(d.expiry_date) === "warning"), [allDocuments]);
  const expiredDocuments = useMemo(() => allDocuments.filter(d => expiryStatus(d.expiry_date) === "expired"), [allDocuments]);

  useEffect(() => {
    if (!profileEmployee) return;
    const profile = profiles.find(p => p.employee_id === profileEmployee);
    setEmploymentStartDate(profile?.employment_start_date || "");
  }, [profiles, profileEmployee]);

  if (loading) return <LoadingScreen />;

  if (!session) {
    return (
      <main style={loginPage}>
        <div style={{ ...cardStyle, width: "100%", maxWidth: 450, padding: 40, background: "#111e28" }}>
          <div style={{ textAlign: "center" }}>
            <div style={logoBox}>B</div>
            <div style={{ color: "#16c784", fontWeight: 900, letterSpacing: 2, fontSize: 13 }}>BARDOC SERVICE</div>
            <h1 style={{ margin: "8px 0 5px", fontSize: 30 }}>BARDOC PAY</h1>
            <p style={{ color: "#9daab2", margin: "0 0 28px", fontSize: 14 }}>Portale digitale del personale</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={submitting} style={{ ...buttonStyle, opacity: submitting ? .6 : 1 }}>{submitting ? "ATTENDERE..." : loginMode ? "ACCEDI AL PORTALE" : "CREA ACCOUNT"}</button>
          </form>
          <button type="button" onClick={() => { setLoginMode(!loginMode); setMessage(""); }} style={{ width: "100%", marginTop: 20, border: 0, background: "transparent", color: "#16c784", fontWeight: 800, cursor: "pointer" }}>
            {loginMode ? "Non hai ancora un account? Registrati" : "Hai già un account? Accedi"}
          </button>
          {message && <Message text={message} />}
        </div>
      </main>
    );
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        activeSection={activeSection} setActiveSection={setActiveSection}
        employees={filteredEmployees} allEmployees={employees} documents={allDocuments}
        payslips={payslips} paymentStatements={paymentStatements} extras={extras} bonuses={bonuses}
        communications={adminCommunications} search={search} setSearch={setSearch}
        selectedEmployee={selectedEmployee} setSelectedEmployee={setSelectedEmployee}
        category={category} setCategory={(v: string) => { setCategory(v); const first = DOCUMENT_TYPES[v]?.[0]; setDocumentType(first?.value || "id_card"); setTaxCode(""); setExpiryDate(""); }}
        documentType={documentType} setDocumentType={setDocumentType} year={year} setYear={setYear}
        taxCode={taxCode} setTaxCode={setTaxCode} expiryDate={expiryDate} setExpiryDate={setExpiryDate}
        file={file} setFile={setFile} submitting={submitting} message={message}
        uploadDocument={uploadDocument} openDocument={openDocument} logout={logout} adminLoading={adminLoading}
        expiringDocuments={expiringDocuments} expiredDocuments={expiredDocuments}
        paymentType={paymentType} setPaymentType={setPaymentType} paymentMonth={paymentMonth} setPaymentMonth={setPaymentMonth}
        paymentYear={paymentYear} setPaymentYear={setPaymentYear} paymentFile={paymentFile} setPaymentFile={setPaymentFile}
        uploadPayment={uploadPayment}
        communicationMode={communicationMode} setCommunicationMode={setCommunicationMode}
        communicationEmployee={communicationEmployee} setCommunicationEmployee={setCommunicationEmployee}
        communicationTitle={communicationTitle} setCommunicationTitle={setCommunicationTitle}
        communicationMessage={communicationMessage} setCommunicationMessage={setCommunicationMessage}
        sendCommunication={sendCommunication} deleteCommunication={deleteCommunication}
        profileEmployee={profileEmployee} selectProfileEmployee={selectProfileEmployee}
        employmentStartDate={employmentStartDate} setEmploymentStartDate={setEmploymentStartDate}
        profilePhoto={profilePhoto} setProfilePhoto={setProfilePhoto} saveProfile={saveProfile} profiles={profiles}
        attendanceEmployee={attendanceEmployee} selectAttendanceEmployee={selectAttendanceEmployee}
        attendanceYear={attendanceYear} attendanceMonth={attendanceMonth} presentDays={presentDays} absentDays={absentDays}
        setPresentDays={setPresentDays} setAbsentDays={setAbsentDays} loadAttendanceForm={loadAttendanceForm}
        saveAttendance={saveAttendance} allAttendance={allAttendance}
      />
    );
  }

  return <EmployeeArea employee={employee} profile={employeeProfile} photoUrl={employeePhotoUrl} documents={documents} communications={communications} attendance={attendance} openDocument={openDocument} logout={logout} session={session} />;
}

const loginPage: CSSProperties = {
  minHeight: "100vh", background: "linear-gradient(135deg,#050b12,#0d202c,#07141f)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Arial, sans-serif",
};

const logoBox: CSSProperties = {
  width: 100, height: 100, margin: "0 auto 18px", borderRadius: 26,
  background: "linear-gradient(135deg,#16c784,#61f3c1)", color: "#062019",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58, fontWeight: 900,
  boxShadow: "0 0 45px rgba(22,199,132,.25)",
};

function LoadingScreen() {
  return <div style={{ minHeight: "100vh", background: "#081521", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial,sans-serif" }}>
    <div style={{ textAlign: "center" }}><div style={{ ...logoBox, width: 78, height: 78, fontSize: 45 }}>B</div><div style={{ color: "#b8c5cb", fontSize: 15 }}>Caricamento BARDOC PAY...</div></div>
  </div>;
}

function AdminDashboard(props: any) {
  const {
    activeSection, setActiveSection, employees, allEmployees, documents, payslips, paymentStatements, extras, bonuses,
    communications, search, setSearch, selectedEmployee, setSelectedEmployee, category, setCategory, documentType, setDocumentType,
    year, setYear, taxCode, setTaxCode, expiryDate, setExpiryDate, file, setFile, submitting, message, uploadDocument, openDocument,
    logout, adminLoading, expiringDocuments, expiredDocuments, paymentType, setPaymentType, paymentMonth, setPaymentMonth,
    paymentYear, setPaymentYear, paymentFile, setPaymentFile, uploadPayment, communicationMode, setCommunicationMode,
    communicationEmployee, setCommunicationEmployee, communicationTitle, setCommunicationTitle, communicationMessage, setCommunicationMessage,
    sendCommunication, deleteCommunication, profileEmployee, selectProfileEmployee, employmentStartDate, setEmploymentStartDate,
    profilePhoto, setProfilePhoto, saveProfile, attendanceEmployee, selectAttendanceEmployee, attendanceYear, attendanceMonth,
    presentDays, absentDays, setPresentDays, setAbsentDays, loadAttendanceForm, saveAttendance, allAttendance,
  } = props;

  const title = activeSection === "dashboard" ? "Dashboard" : activeSection === "employees" ? "Dipendenti" : activeSection === "payments" ? "Gestione pagamenti" : activeSection === "documents" ? "Documenti" : activeSection === "communications" ? "Comunicazioni" : "Scadenze";

  return <main style={{ minHeight: "100vh", background: "#0d1922", color: "#e9f0f2", fontFamily: "Arial,sans-serif", display: "flex" }}>
    <aside style={{ width: 245, background: "#08141d", borderRight: "1px solid #20313b", padding: 20, boxSizing: "border-box", minHeight: "100vh", flexShrink: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>BARDOC <span style={{ color: "#16c784" }}>PAY</span></div>
      <div style={{ color: "#16c784", fontSize: 11, fontWeight: 800, marginTop: 4, marginBottom: 28 }}>AMMINISTRAZIONE</div>
      {["dashboard", "employees", "payments", "documents", "communications", "deadlines"].map((id, i) => <SidebarButton key={id} active={activeSection === id} onClick={() => setActiveSection(id)}>{["🏠 Dashboard", "👥 Dipendenti", "💰 Gestione pagamenti", "📁 Documenti", "💬 Comunicazioni", "⚠️ Scadenze"][i]}</SidebarButton>)}
      <div style={{ height: 1, background: "#20313b", margin: "25px 0" }} />
      <div style={{ color: "#73838c", fontSize: 12 }}><span style={{ color: "#16c784" }}>●</span> Sistema operativo</div>
      <button onClick={logout} style={{ ...secondaryButton, width: "100%", marginTop: 20 }}>Esci</button>
    </aside>

    <section style={{ flex: 1, padding: 28, boxSizing: "border-box", overflow: "auto" }}>
      <header style={{ marginBottom: 24 }}><h1 style={{ margin: 0, fontSize: 27 }}>{title}</h1><div style={{ color: "#82919a", marginTop: 5, fontSize: 13 }}>Gestione del personale BARDOC SERVICE</div></header>

      {activeSection === "dashboard" && <AdminHome allEmployees={allEmployees} documents={documents} payslips={payslips} communications={communications} setActiveSection={setActiveSection} />}

      {activeSection === "employees" && <>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, marginBottom: 18 }}>
            <div><h2 style={{ margin: 0 }}>Gestione dipendenti</h2><div style={{ color: "#82919a", fontSize: 13, marginTop: 5 }}>Cerca per nome, email o codice fiscale.</div></div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca dipendente..." style={{ ...inputStyle, maxWidth: 360 }} />
          </div>
          {adminLoading ? <div>Caricamento...</div> : employees.map((emp: Employee) => <div key={emp.id} style={{ borderTop: "1px solid #263841", padding: "15px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}>
            <div><strong>{emp.full_name}</strong><div style={{ color: "#778993", fontSize: 12, marginTop: 4 }}>{emp.email || "Nessuna email"}</div></div>
            <button onClick={() => { selectProfileEmployee(emp.id); selectAttendanceEmployee(emp.id); }} style={secondaryButton}>Gestisci scheda</button>
          </div>)}
        </div>

        <div style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>👤 Profilo del dipendente</h2>
          <Field label="Dipendente"><select value={profileEmployee} onChange={e => selectProfileEmployee(e.target.value)} style={selectStyle}><option value="">Seleziona dipendente</option>{allEmployees.map((e: Employee) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
          {profileEmployee && <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Data inizio collaborazione"><input type="date" value={employmentStartDate} onChange={e => setEmploymentStartDate(e.target.value)} style={inputStyle} /></Field>
              <Field label="Foto dipendente"><input type="file" accept="image/*" onChange={e => setProfilePhoto(e.target.files?.[0] || null)} style={{ width: "100%", color: "#cbd6da" }} /></Field>
            </div>
            <button onClick={saveProfile} disabled={submitting} style={{ ...buttonStyle, marginTop: 20 }}>{submitting ? "SALVATAGGIO..." : "SALVA PROFILO"}</button>
          </>}
          {message && <Message text={message} />}
        </div>

        <div style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>📊 Presenze e assenze mensili</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Dipendente"><select value={attendanceEmployee} onChange={e => selectAttendanceEmployee(e.target.value)} style={selectStyle}><option value="">Seleziona dipendente</option>{allEmployees.map((e: Employee) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
            <Field label="Anno"><select value={attendanceYear} onChange={e => loadAttendanceForm(Number(e.target.value), attendanceMonth)} style={selectStyle}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
            <Field label="Mese"><select value={attendanceMonth} onChange={e => loadAttendanceForm(attendanceYear, Number(e.target.value))} style={selectStyle}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
            <Field label="Giorni di presenza"><input type="number" min={0} value={presentDays} onChange={e => setPresentDays(Number(e.target.value))} style={inputStyle} /></Field>
            <Field label="Giorni di assenza"><input type="number" min={0} value={absentDays} onChange={e => setAbsentDays(Number(e.target.value))} style={inputStyle} /></Field>
          </div>
          <button onClick={saveAttendance} disabled={submitting} style={{ ...buttonStyle, marginTop: 20 }}>{submitting ? "SALVATAGGIO..." : "SALVA PRESENZE DEL MESE"}</button>
          {attendanceEmployee && <AttendanceAdminTable employeeId={attendanceEmployee} allAttendance={allAttendance} />}
        </div>
      </>}

      {activeSection === "payments" && <>
        <div style={{ ...cardStyle, background: "linear-gradient(135deg,#07141f,#102d39)", marginBottom: 18 }}><h2 style={{ margin: "0 0 7px" }}>Gestione pagamenti</h2><p style={{ margin: 0, color: "#a9b8c0" }}>Buste paga, distinte, extra e premi lavorativi, organizzati per dipendente, anno e mese.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 20 }}><Stat title="Buste paga" value={payslips.length} /><Stat title="Distinte" value={paymentStatements.length} /><Stat title="Extra" value={extras.length} /><Stat title="Premi" value={bonuses.length} /></div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Carica pagamento del mese</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Dipendente"><select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={selectStyle}><option value="">Seleziona dipendente</option>{allEmployees.map((e: Employee) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
            <Field label="Tipo documento"><select value={paymentType} onChange={e => setPaymentType(e.target.value)} style={selectStyle}>{PAYMENT_TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field>
            <Field label="Anno"><select value={paymentYear} onChange={e => setPaymentYear(Number(e.target.value))} style={selectStyle}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
            <Field label="Mese"><select value={paymentMonth} onChange={e => setPaymentMonth(Number(e.target.value))} style={selectStyle}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></Field>
          </div>
          <Field label="PDF"><input type="file" accept="application/pdf,.pdf" onChange={e => setPaymentFile(e.target.files?.[0] || null)} style={{ width: "100%", color: "#cbd6da" }} /></Field>
          <div style={{ marginTop: 10, color: "#81919a", fontSize: 12 }}>Extra e Premio lavorativo compariranno nell'area del dipendente soltanto se vengono effettivamente caricati.</div>
          <button onClick={uploadPayment} disabled={submitting} style={{ ...buttonStyle, marginTop: 20 }}>{submitting ? "CARICAMENTO..." : "CARICA DOCUMENTO"}</button>
          {message && <Message text={message} />}
        </div>
        <DocumentList title="Documenti di pagamento caricati" documents={documents.filter((d: DocumentRow) => ["payslip", "payment_statement", "extra", "work_bonus"].includes(d.document_type))} employees={allEmployees} openDocument={openDocument} />
      </>}

      {activeSection === "documents" && <div style={cardStyle}>
        <h2 style={{ margin: "0 0 6px" }}>Carica documento</h2><p style={{ margin: "0 0 10px", color: "#82919a", fontSize: 13 }}>Documenti anagrafici, contrattuali, permessi e curriculum.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Dipendente"><select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={selectStyle}><option value="">Seleziona dipendente</option>{allEmployees.map((e: Employee) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>
          <Field label="Categoria"><select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Tipo documento"><select value={documentType} onChange={e => setDocumentType(e.target.value)} style={selectStyle}>{(DOCUMENT_TYPES[category] || []).map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></Field>
          <Field label="Anno"><select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></Field>
        </div>
        {(documentType === "id_card" || documentType === "driver_license") && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label={documentType === "driver_license" ? "Codice Fiscale *" : "Codice Fiscale"}><input value={taxCode} onChange={e => setTaxCode(e.target.value.toUpperCase())} maxLength={16} style={inputStyle} /></Field>
          <Field label="Data di scadenza"><input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} /></Field>
        </div>}
        <Field label="Documento PDF"><input type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ width: "100%", color: "#cbd6da" }} /></Field>
        <button onClick={uploadDocument} disabled={submitting} style={{ ...buttonStyle, marginTop: 20 }}>{submitting ? "CARICAMENTO..." : "CARICA DOCUMENTO"}</button>
        {message && <Message text={message} />}
      </div>}

      {activeSection === "communications" && <>
        <div style={{ ...cardStyle, background: "linear-gradient(135deg,#07141f,#102d39)", marginBottom: 18 }}><div style={{ color: "#16c784", fontSize: 12, fontWeight: 900 }}>COMUNICAZIONI</div><h2 style={{ margin: "8px 0" }}>Comunicazioni al personale</h2><p style={{ margin: 0, color: "#a9b8c0" }}>Messaggi individuali oppure comunicazioni generali a tutto il personale.</p></div>
        <div style={cardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <ModeButton active={communicationMode === "individual"} onClick={() => setCommunicationMode("individual")}>👤 Comunicazione individuale</ModeButton>
            <ModeButton active={communicationMode === "general"} onClick={() => setCommunicationMode("general")}>📢 Comunicazione generale</ModeButton>
          </div>
          {communicationMode === "individual" && <Field label="Dipendente destinatario"><select value={communicationEmployee} onChange={e => setCommunicationEmployee(e.target.value)} style={selectStyle}><option value="">Seleziona dipendente</option>{allEmployees.map((e: Employee) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></Field>}
          {communicationMode === "general" && <div style={{ padding: 14, borderRadius: 10, background: "#263a43", color: "#c7d5da", marginTop: 17, fontSize: 13 }}>📢 Questa comunicazione sarà visibile a tutti i dipendenti.</div>}
          <Field label="Titolo"><input value={communicationTitle} onChange={e => setCommunicationTitle(e.target.value)} placeholder="Es. Comunicazione importante" style={inputStyle} /></Field>
          <Field label="Messaggio"><textarea value={communicationMessage} onChange={e => setCommunicationMessage(e.target.value)} placeholder="Scrivi qui la comunicazione..." rows={7} style={{ ...inputStyle, resize: "vertical", fontFamily: "Arial,sans-serif" }} /></Field>
          <button onClick={sendCommunication} disabled={submitting} style={{ ...buttonStyle, marginTop: 20 }}>{submitting ? "INVIO..." : communicationMode === "general" ? "INVIA A TUTTI I DIPENDENTI" : "INVIA AL DIPENDENTE"}</button>
          {message && <Message text={message} />}
        </div>
        <div style={{ ...cardStyle, marginTop: 20 }}><h3 style={{ marginTop: 0 }}>Storico comunicazioni</h3>{communications.length === 0 ? <div style={{ color: "#82919a" }}>Nessuna comunicazione presente.</div> : communications.map((comm: Communication) => <CommunicationAdminCard key={comm.id} comm={comm} employees={allEmployees} onDelete={deleteCommunication} />)}</div>
      </>}

      {activeSection === "deadlines" && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}><Stat title="Documenti in scadenza" value={expiringDocuments.length} alert /><Stat title="Documenti scaduti" value={expiredDocuments.length} danger /></div><DeadlineList title="Documenti scaduti" items={expiredDocuments} danger employees={allEmployees} /><DeadlineList title="Documenti in scadenza entro 30 giorni" items={expiringDocuments} alert employees={allEmployees} /></>}
    

      <div style={{ ...cardStyle, marginBottom: 20 }}><h2 style={{ marginTop: 0 }}>💬 Comunicazioni</h2>{communications.length === 0 ? <p style={{ color: "#81919a" }}>Non ci sono comunicazioni.</p> : <>{[...general, ...personal].map(c => <CommunicationCard key={c.id} communication={c} general={c.is_general} />)}</>}</div>

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>💬 Contatta l'Amministrazione</h2>
        <p style={{ color: "#81919a", fontSize: 13, lineHeight: 1.6 }}>
          Hai bisogno di assistenza o vuoi inviare una richiesta?
          Premi il pulsante qui sotto: il messaggio verrà inviato direttamente
          al Centro Messaggi dell'Amministrazione.
        </p>

        <button
          onClick={() => setContactOpen(true)}
          style={{ ...buttonStyle, width: "100%", marginTop: 10 }}
        >
          CONTATTA L'AMMINISTRAZIONE
        </button>
      </div>


    </section>
  
      {contactOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:999, padding:20 }}>
          <div style={{ width:"100%", maxWidth:520, background:"#172630", border:"1px solid #2f4652", borderRadius:18, padding:24 }}>
            <h2 style={{ marginTop:0 }}>Contatta l'Amministrazione</h2>
            <p style={{ color:"#8ea0aa", fontSize:13, marginBottom:18 }}>
              Invia una richiesta direttamente al Centro Messaggi dell'amministrazione.
            </p>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Oggetto" style={inputStyle}/>
            <textarea value={contactMessage} onChange={e=>setContactMessage(e.target.value)} placeholder="Scrivi il messaggio..." rows={6} style={{...inputStyle,marginTop:12,resize:"vertical"}}/>
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button onClick={()=>setContactOpen(false)} style={{...secondaryButton,flex:1}}>Annulla</button>
              <button onClick={sendAdminRequest} style={{...buttonStyle,flex:1}}>Invia</button>
            </div>
          </div>
        </div>
      )}

  </main>;
}

function AdminHome({ allEmployees, documents, payslips, communications, setActiveSection }: any) {
  return <>
    <div style={{ ...cardStyle, background: "linear-gradient(135deg,#07141f,#102d39)", marginBottom: 20 }}><div style={{ color: "#16c784", fontSize: 12, fontWeight: 900 }}>AMMINISTRAZIONE</div><h2 style={{ margin: "8px 0" }}>Benvenuto in BARDOC PAY</h2><p style={{ color: "#a9b8c0", margin: 0 }}>Gestisci dipendenti, pagamenti, documenti, comunicazioni e presenze.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 20 }}><Stat title="Dipendenti attivi" value={allEmployees.length} /><Stat title="Documenti" value={documents.length} /><Stat title="Buste paga" value={payslips.length} /><Stat title="Comunicazioni" value={communications.length} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
      <QuickCard title="Dipendenti" description="Gestisci foto, data di inizio collaborazione e presenze mensili." button="Apri dipendenti" onClick={() => setActiveSection("employees")} />
      <QuickCard title="Gestione pagamenti" description="Carica buste paga, distinte, extra e premi lavorativi." button="Apri pagamenti" onClick={() => setActiveSection("payments")} />
      <QuickCard title="Documenti" description="Carica documenti anagrafici e rapporto contrattuale." button="Apri documenti" onClick={() => setActiveSection("documents")} />
      <QuickCard title="Comunicazioni" description="Invia messaggi individuali o generali e cancella quelli già inviati." button="Apri comunicazioni" onClick={() => setActiveSection("communications")} />
    </div>
  </>;
}

function SidebarButton({ active, onClick, children }: any) { return <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: "13px 12px", border: 0, borderRadius: 9, marginBottom: 5, background: active ? "#12332d" : "transparent", color: active ? "#16c784" : "#a9b7be", fontWeight: active ? 800 : 600, cursor: "pointer" }}>{children}</button>; }
function ModeButton({ active, onClick, children }: any) { return <button onClick={onClick} style={{ padding: 15, borderRadius: 10, border: active ? "2px solid #16c784" : "1px solid #344955", background: active ? "#12342d" : "#101e28", color: "#fff", fontWeight: 800, cursor: "pointer" }}>{children}</button>; }
function Stat({ title, value, alert, danger }: any) { return <div style={cardStyle}><div style={{ color: "#81919a", fontSize: 12, marginBottom: 10 }}>{title}</div><div style={{ fontSize: 29, fontWeight: 900, color: danger ? "#ff7777" : alert ? "#ffc857" : "#f2f6f7" }}>{value}</div></div>; }
function QuickCard({ title, description, button, onClick }: any) { return <div style={cardStyle}><h3 style={{ margin: "0 0 8px" }}>{title}</h3><p style={{ color: "#82919a", fontSize: 13, lineHeight: 1.5, minHeight: 40 }}>{description}</p><button onClick={onClick} style={{ ...buttonStyle, marginTop: 8 }}>{button}</button></div>; }

function DocumentList({ title, documents, employees, openDocument }: any) {
  return <div style={{ ...cardStyle, marginTop: 20 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{documents.length === 0 ? <div style={{ color: "#81919a" }}>Nessun documento presente.</div> : documents.map((doc: DocumentRow) => {
    const employee = employees.find((e: Employee) => e.id === doc.employee_id);
    return <div key={doc.id} style={{ borderTop: "1px solid #293b45", padding: "15px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}>
      <div><strong>{employee?.full_name || "Dipendente"}</strong><div style={{ color: "#16c784", fontSize: 12, marginTop: 4 }}>{documentLabel(doc.document_type)}</div><div style={{ color: "#81919a", fontSize: 12, marginTop: 4 }}>{doc.file_name} · {doc.month ? `${monthLabel(doc.month)} ${doc.year}` : doc.year}</div></div>
      <button onClick={() => openDocument(doc)} style={{ ...secondaryButton, color: "#16c784" }}>Apri PDF</button>
    </div>;
  })}</div>;
}

function CommunicationAdminCard({ comm, employees, onDelete }: any) {
  const target = comm.is_general ? "Tutti i dipendenti" : employees.find((e: Employee) => e.id === comm.employee_id)?.full_name || "Dipendente";
  return <div style={{ borderTop: "1px solid #263841", padding: "16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start" }}><div><strong>{comm.title}</strong><div style={{ color: "#16c784", fontSize: 12, marginTop: 5 }}>{comm.is_general ? "📢 " : "👤 "}{target}</div></div><span style={{ color: "#71828c", fontSize: 11 }}>{formatCommunicationDate(comm.created_at)}</span></div><div style={{ color: "#b7c4ca", marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{comm.message}</div><button onClick={() => onDelete(comm.id)} style={{ ...secondaryButton, marginTop: 12, color: "#ff7777", borderColor: "#5b3333" }}>🗑 Cancella comunicazione</button></div>;
}

function DeadlineList({ title, items, danger, alert, employees }: any) { return <div style={{ ...cardStyle, marginBottom: 20 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{items.length === 0 ? <div style={{ color: "#81919a" }}>Nessun documento presente.</div> : items.map((doc: DocumentRow) => <div key={doc.id} style={{ borderTop: "1px solid #293b45", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><strong>{employees.find((e: Employee) => e.id === doc.employee_id)?.full_name || "Dipendente"}</strong><div style={{ color: "#81919a", fontSize: 12, marginTop: 4 }}>{documentLabel(doc.document_type)}</div></div><span style={{ color: danger ? "#ff7777" : alert ? "#ffc857" : "#16c784", fontWeight: 900 }}>{formatDate(doc.expiry_date)}</span></div>)}</div>; }

function AttendanceAdminTable({ employeeId, allAttendance }: any) {
  const rows = allAttendance.filter((a: Attendance) => a.employee_id === employeeId).slice(0, 12);
  return <div style={{ marginTop: 22 }}><h3>Ultimi mesi registrati</h3>{rows.length === 0 ? <div style={{ color: "#81919a" }}>Nessun mese registrato.</div> : rows.map((a: Attendance) => <div key={a.id} style={{ borderTop: "1px solid #293b45", padding: "10px 0", display: "flex", justifyContent: "space-between" }}><span>{monthLabel(a.month)} {a.year}</span><span><span style={{ color: "#16c784", fontWeight: 800 }}>{a.present_days} presenti</span> · <span style={{ color: "#ff5b66", fontWeight: 800 }}>{a.absent_days} assenti</span></span></div>)}</div>;
}

function AttendanceDonut({ present, absent }: { present: number; absent: number }) {
  const total = present + absent;
  if (total <= 0) return <div style={{ width: 120, height: 120, borderRadius: "50%", border: "12px solid #344955", display: "flex", alignItems: "center", justifyContent: "center", color: "#81919a", fontSize: 11, textAlign: "center" }}>Nessun dato</div>;
  const pct = (present / total) * 100;
  return <div style={{ width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(#16c784 0 ${pct}%, #ff4d5a ${pct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><div style={{ width: 70, height: 70, borderRadius: "50%", background: "#172630", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>{Math.round(pct)}%</div></div>;
}

function EmployeeArea({ employee, profile, photoUrl, documents, communications, attendance, openDocument, logout, session }: any) {
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  const payments = documents.filter((d: DocumentRow) => ["payslip", "payment_statement", "extra", "work_bonus"].includes(d.document_type));
  const personalDocs = documents.filter((d: DocumentRow) => !["payslip", "payment_statement", "extra", "work_bonus"].includes(d.document_type));

  const startYear = profile?.employment_start_date ? Number(profile.employment_start_date.slice(0, 4)) : CURRENT_YEAR;
  const documentYears = payments.map((d: DocumentRow) => d.year);
  const attendanceYears = attendance.map((a: Attendance) => a.year);
  const rangeYears = Array.from({ length: Math.max(1, CURRENT_YEAR - startYear + 1) }, (_, i) => CURRENT_YEAR - i);
  const years = Array.from(new Set([...rangeYears, ...documentYears, ...attendanceYears])).sort((a, b) => b - a);

  function yearData(y: number) {
    const months = new Set<number>();
    payments.filter((d: DocumentRow) => d.year === y && d.month).forEach((d: DocumentRow) => months.add(d.month as number));
    attendance.filter((a: Attendance) => a.year === y).forEach((a: Attendance) => months.add(a.month));
    return Array.from(months).sort((a, b) => b - a);
  }

  const general = communications.filter((c: Communication) => c.is_general);
  const personal = communications.filter((c: Communication) => !c.is_general);

  return <main style={{ minHeight: "100vh", background: "#0d1922", color: "#e9f0f2", fontFamily: "Arial,sans-serif" }}>
    <header style={{ background: "#08141d", borderBottom: "1px solid #20313b", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><strong style={{ fontSize: 21 }}>BARDOC <span style={{ color: "#16c784" }}>PAY</span></strong><div style={{ color: "#16c784", fontSize: 12, marginTop: 3 }}>AREA PERSONALE · TEAM BARDOC SERVICE</div></div>
      <button onClick={logout} style={secondaryButton}>Esci</button>
    </header>

    <section style={{ maxWidth: 1180, margin: "0 auto", padding: 30 }}>
      <div style={{ ...cardStyle, background: "linear-gradient(135deg,#07141f,#102d39)", marginBottom: 20 }}>
        <div style={{ color: "#16c784", fontSize: 12, fontWeight: 900 }}>AREA PERSONALE</div>
        <h1 style={{ margin: "8px 0 3px", fontSize: 30 }}>TEAM BARDOC SERVICE</h1>
        <div style={{ color: "#a9b8c0" }}>Benvenuto nel tuo portale BARDOC PAY</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr)", gap: 18, marginBottom: 20 }}>
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 22 }}>
          {photoUrl ? <img src={photoUrl} alt="Foto dipendente" style={{ width: 145, height: 145, borderRadius: "50%", objectFit: "cover", border: "2px solid #16c784", flexShrink: 0 }} /> : <div style={{ width: 145, height: 145, borderRadius: "50%", background: "#12342d", color: "#16c784", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 54, fontWeight: 900, flexShrink: 0 }}>{employee?.full_name?.charAt(0)?.toUpperCase() || "B"}</div>}
          <div><h2 style={{ margin: "0 0 12px", fontSize: 25 }}>{employee?.full_name || "Dipendente"}</h2><div style={{ color: "#c4d0d5", lineHeight: 1.6 }}>Collabora presso la struttura<br /><strong style={{ color: "#16c784" }}>BARDOC SERVICE</strong>{profile?.employment_start_date && <><br />dal <strong>{formatDate(profile.employment_start_date)}</strong></>}</div></div>
        </div>
        <div style={cardStyle}><h2 style={{ margin: "0 0 14px", color: "#16c784", fontSize: 18 }}>📊 Presenze mensili</h2><p style={{ marginTop: 0, color: "#81919a", fontSize: 12 }}>Ogni mese mostra separatamente giorni di presenza e assenza.</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{attendance.slice(0, 4).map((a: Attendance) => <MonthlyAttendanceMini key={a.id} a={a} />)}</div>{attendance.length === 0 && <div style={{ color: "#81919a" }}>Nessun dato di presenza ancora inserito.</div>}</div>
      </div>
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>💰 Retribuzione</h2>
        <p style={{ color: "#81919a", fontSize: 13 }}>Apri un anno per visualizzare i mesi. Gli extra e i premi compaiono soltanto quando sono stati effettivamente caricati.</p>
        {years.map(y => {
          const months = yearData(y);
          const isOpen = !!openYears[y];
          return <div key={y} style={{ borderTop: "1px solid #293b45" }}>
            <button onClick={() => setOpenYears(v => ({ ...v, [y]: !v[y] }))} style={{ width: "100%", padding: "17px 4px", border: 0, background: "transparent", color: "#16c784", display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>{y}<span>{isOpen ? "⌃" : "⌄"}</span></button>
            {isOpen && <div style={{ paddingBottom: 10 }}>{months.length === 0 ? <div style={{ color: "#81919a", padding: "0 4px 14px" }}>Nessun dato mensile presente.</div> : months.map(m => {
              const key = `${y}-${m}`; const open = !!openMonths[key]; const monthDocs = payments.filter((d: DocumentRow) => d.year === y && d.month === m); const att = attendance.find((a: Attendance) => a.year === y && a.month === m);
              return <div key={key} style={{ background: "#101e28", border: "1px solid #293c47", borderRadius: 13, margin: "8px 0", overflow: "hidden" }}>
                <button onClick={() => setOpenMonths(v => ({ ...v, [key]: !v[key] }))} style={{ width: "100%", padding: 15, border: 0, background: "transparent", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}><strong>{monthLabel(m)}</strong><span>{open ? "−" : "+"}</span></button>
                {open && <div style={{ borderTop: "1px solid #293c47", padding: 16 }}>
                  {att && <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 16, marginBottom: 10, borderBottom: "1px solid #293c47" }}><AttendanceDonut present={att.present_days} absent={att.absent_days} /><div><div style={{ color: "#16c784", fontWeight: 900 }}>🟢 {att.present_days} giorni di presenza</div><div style={{ color: "#ff5b66", fontWeight: 900, marginTop: 8 }}>🔴 {att.absent_days} giorni di assenza</div></div></div>}
                  {(["payslip", "payment_statement", "extra", "work_bonus"] as string[]).map(type => monthDocs.filter((d: DocumentRow) => d.document_type === type).map((doc: DocumentRow) => <PaymentRow key={doc.id} doc={doc} openDocument={openDocument} />))}
                  {monthDocs.length === 0 && <div style={{ color: "#81919a" }}>Nessun documento di pagamento per questo mese.</div>}
                </div>}
              </div>;
            })}</div>}
          </div>;
        })}
      </div>

      <div style={{ ...cardStyle, marginTop: 20 }}><h2 style={{ marginTop: 0 }}>📁 I miei documenti</h2>{personalDocs.length === 0 ? <p style={{ color: "#81919a" }}>Non sono presenti documenti.</p> : personalDocs.map((doc: DocumentRow) => <PersonalDocumentRow key={doc.id} doc={doc} openDocument={openDocument} />)}</div>

      <div style={{ marginTop: 20, padding: 16, background: "#13222c", borderRadius: 12, color: "#81919a", fontSize: 12 }}>Accesso effettuato come <strong style={{ color: "#dce6e9" }}>{session.user.email}</strong></div>
    </section>
  </main>;
}

function MonthlyAttendanceMini({ a }: { a: Attendance }) { return <div style={{ background: "#101e28", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div><strong>{monthLabel(a.month)} {a.year}</strong><div style={{ fontSize: 11, marginTop: 5 }}><span style={{ color: "#16c784" }}>● {a.present_days} presenti</span><br /><span style={{ color: "#ff5b66" }}>● {a.absent_days} assenti</span></div></div><AttendanceDonut present={a.present_days} absent={a.absent_days} /></div>; }
function PaymentRow({ doc, openDocument }: any) { const color = doc.document_type === "extra" || doc.document_type === "work_bonus" ? "#ffc857" : "#16c784"; return <div style={{ borderTop: "1px solid #293b45", padding: "13px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}><div><strong style={{ color }}>{doc.document_type === "extra" ? "⭐ Extra" : doc.document_type === "work_bonus" ? "🏆 Premio lavorativo" : doc.document_type === "payslip" ? "📄 Busta paga" : "📄 Distinta di pagamento"}</strong><div style={{ color: "#81919a", fontSize: 11, marginTop: 4 }}>{doc.file_name}</div></div><button onClick={() => openDocument(doc)} style={{ ...secondaryButton, color: "#16c784" }}>Apri PDF</button></div>; }
function PersonalDocumentRow({ doc, openDocument }: any) { return <div style={{ borderTop: "1px solid #293b45", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15 }}><div><strong>{documentLabel(doc.document_type)}</strong><div style={{ color: "#81919a", fontSize: 12, marginTop: 4 }}>{doc.file_name}</div>{doc.expiry_date && <div style={{ color: expiryStatus(doc.expiry_date) === "expired" ? "#ff7777" : expiryStatus(doc.expiry_date) === "warning" ? "#ffc857" : "#81919a", fontSize: 12, marginTop: 4 }}>Scadenza: {formatDate(doc.expiry_date)}</div>}</div><button onClick={() => openDocument(doc)} style={{ ...secondaryButton, color: "#16c784" }}>Apri PDF</button></div>; }
function CommunicationCard({ communication, general }: any) { return <div style={{ borderTop: "1px solid #293b45", padding: "16px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 15 }}><div><strong>{general ? "📢 " : "👤 "}{communication.title}</strong><div style={{ color: "#16c784", fontSize: 11, fontWeight: 800, marginTop: 5 }}>{general ? "COMUNICAZIONE GENERALE" : "COMUNICAZIONE PERSONALE"}</div></div><span style={{ color: "#71828c", fontSize: 11 }}>{formatCommunicationDate(communication.created_at)}</span></div><div style={{ marginTop: 10, color: "#c4d0d5", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{communication.message}</div></div>; }
