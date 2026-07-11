import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AdminHospitalList } from "@/components/AdminHospitalList";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentHospital } from "@/lib/auth";
import { listHospitals } from "@/lib/db";
export const dynamic="force-dynamic";
export default async function AdminHospitalsPage(){const admin=await getCurrentHospital();if(!admin)redirect("/login");if(admin.role!=="admin")redirect("/workspace");const hospitals=await listHospitals();return <main className="auth-page min-h-screen px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl"><header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-300"><ShieldCheck className="size-4"/> PHOTA administration</p><h1 className="mt-2 text-3xl font-semibold text-white">Hospital verification center</h1><p className="mt-2 text-slate-400">Review official applications before granting access to protected medical data.</p></div><div className="flex gap-2"><Link href="/profile" className="secondary-btn">Admin profile</Link><LogoutButton/></div></header><AdminHospitalList initialHospitals={hospitals}/></div></main>}
