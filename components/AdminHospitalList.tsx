"use client";

import { BadgeCheck, Ban, Building2, LoaderCircle, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { readApiResponse } from "@/lib/client-api";
import type { HospitalProfile } from "@/lib/types";

export function AdminHospitalList({ initialHospitals }: { initialHospitals: HospitalProfile[] }) {
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function review(id: string, status: "verified" | "rejected") {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/hospitals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readApiResponse<{ hospital: HospitalProfile }>(response, "hospital");
      setHospitals((current) => current.map((hospital) => hospital.id === id ? result.hospital : hospital));
      setMessage(`Hospital ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(hospital: HospitalProfile) {
    if (!window.confirm(`Permanently delete ${hospital.hospitalName}? This will also delete all medical records owned by this hospital.`)) return;
    setBusy(hospital.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/hospitals/${hospital.id}`, { method: "DELETE" });
      await readApiResponse<{ deleted: boolean }>(response, "hospital");
      setHospitals((current) => current.filter((item) => item.id !== hospital.id));
      setMessage(`${hospital.hospitalName} was permanently deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hospital could not be deleted.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-4">
    {message && <p role="status" className="rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-3 text-sm text-emerald-200">{message}</p>}
    {hospitals.map((hospital) => <article key={hospital.id} className="rounded-2xl border border-white/8 bg-white/[.03] p-5 transition hover:bg-white/[.045]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Building2 /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-white">{hospital.hospitalName}</h2><span className={`status-${hospital.verificationStatus}`}>{hospital.verificationStatus}</span></div>
            <p className="mt-1 text-sm text-slate-400">{hospital.hospitalType} · {hospital.licenseNumber}</p>
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5" />{hospital.address}, {hospital.city}</p>
            <p className="mt-1 text-xs text-slate-500">{hospital.officialEmail} · {hospital.phone} · Administrator: {hospital.adminName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0">
          <button disabled={busy === hospital.id} onClick={() => void review(hospital.id, "verified")} className="secondary-btn border-emerald-300/20 text-emerald-200">{busy === hospital.id ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />} Verify</button>
          <button disabled={busy === hospital.id} onClick={() => void review(hospital.id, "rejected")} className="secondary-btn border-rose-300/20 text-rose-200"><Ban /> Reject</button>
          <button disabled={busy === hospital.id} onClick={() => void remove(hospital)} aria-label={`Delete ${hospital.hospitalName}`} className="secondary-btn border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"><Trash2 /> Delete</button>
        </div>
      </div>
    </article>)}
    {!hospitals.length && <div className="rounded-2xl border border-white/8 bg-white/[.03] p-12 text-center text-slate-400"><ShieldCheck className="mx-auto mb-3 size-8 text-emerald-300" />No hospital applications yet.</div>}
  </div>;
}
