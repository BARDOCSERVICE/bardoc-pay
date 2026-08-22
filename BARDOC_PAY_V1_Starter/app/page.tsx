"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  active: boolean;
  photo_url?: string | null;
  hire_date?: string | null;
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

type Communication = {
  id: string;
  employee_id: string | null;
  title: string;
  message: string;
  is_general: boolean;
  created_at: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  present_days: number;
  absent_days: number;
};

type ExtraPayment = {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  amount: number;
  description: string | null;
};

type AdminMessage = {
  id: string;
  employee_id: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
employee_id:string;
subject:string;
message:string;
is_read:boolean;
created_at:string;
};
const ADMIN_EMAIL="bardocfg@gmail.com";

const CURRENT_YEAR=new Date().getFullYear();

const YEARS=Array.from({length:8},(_,i)=>CURRENT_YEAR-5+i);

const MONTHS=[
"Gennaio","Febbraio","Marzo","Aprile",
"Maggio","Giugno","Luglio","Agosto",
"Settembre","Ottobre","Novembre","Dicembre"
];

const DOCUMENT_TYPES={
retribuzione:[
{value:"payslip",label:"Busta paga"},
{value:"payment_statement",label:"Distinta pagamento"}
],
  lavoro:[
{value:"work_contract",label:"Contratto"}
],
permessi:[
{value:"leave_permit",label:"Permesso"}
],
personali:[
{value:"id_card",label:"Carta identità"},
{value:"driver_license",label:"Patente"}
],
curriculum:[
{value:"curriculum",label:"Curriculum"}
]
};

const CATEGORY_LABELS={
retribuzione:"Retribuzione",
lavoro:"Rapporto di lavoro",
permessi:"Permessi",
personali:"Documenti personali",
curriculum:"Curriculum"
};
