"use client";

import { Building2, Droplets, LoaderCircle, Phone, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { readApiResponse } from "@/lib/client-api";
import { BLOOD_QUANTITY_LIMITS } from "@/lib/medical-rules";
import type { MedicalRecord, NetworkDonorResult, NetworkDonorsResponse } from "@/lib/types";

const bloodGroups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
type Notify = (kind: "success" | "error" | "info", title: string, message: string) => void;

export function BloodDonorSearch({ patients, onNotify }: { patients: MedicalRecord[]; onNotify: Notify }) {
  const firstPatient = patients[0];
  const [patientId, setPatientId] = useState(firstPatient?.id ?? "");
  const [bloodGroup, setBloodGroup] = useState(firstPatient?.bloodGroup ?? "O+");
  const [quantity, setQuantity] = useState(firstPatient?.quantity ?? 1);
  const [donors, setDonors] = useState<NetworkDonorResult[]>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  function choosePatient(id: string) {
    setPatientId(id);
    const patient = patients.find((item) => item.id === id);
    if (!patient) return;
    setBloodGroup(patient.bloodGroup);
    setQuantity(patient.quantity ?? 1);
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const query = new URLSearchParams({
        mode: "blood",
        scope: "network-donors",
        bloodGroup,
        quantity: String(quantity),
      });
      const response = await fetch(`/api/records?${query.toString()}`, { cache: "no-store" });
      const result = await readApiResponse<NetworkDonorsResponse>(response, "hospital");
      setDonors(result.donors);
      setSearched(true);
      onNotify(
        result.donors.length ? "success" : "info",
        result.donors.length ? "Compatible blood donors found" : "No compatible donor found",
        result.donors.length
          ? `${result.donors.length} verified donor ${result.donors.length === 1 ? "has" : "records have"} enough compatible blood.`
          : `No verified donor currently has ${quantity} ${quantity === 1 ? "unit" : "units"} compatible with ${bloodGroup}.`,
      );
    } catch (error) {
      onNotify("error", "Search failed", error instanceof Error ? error.message : "Unable to search the blood donor network.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel form-panel overflow-hidden">
      <div className="relative border-b border-white/8 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Verified hospital network</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-white"><Droplets className="size-5 text-rose-300" /> Search compatible blood donors</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Select a waiting recipient or enter the required blood group and units. Results include only verified hospitals, medically compatible blood groups, sufficient quantity, and donors aged 18–60.</p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-rose-300/15 bg-rose-300/[.06] px-3 py-1.5 text-xs font-semibold text-rose-100"><ShieldCheck className="size-3.5" /> Verified facilities only</span>
        </div>

        <form onSubmit={search} className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_.8fr_.7fr_auto] xl:items-end">
          <label className="field"><span>Waiting recipient</span><select value={patientId} onChange={(event) => choosePatient(event.target.value)}><option value="">Enter criteria manually</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.bloodGroup} · {patient.quantity ?? 1} units</option>)}</select></label>
          <label className="field"><span>Blood needed</span><select value={bloodGroup} onChange={(event) => { setBloodGroup(event.target.value); setPatientId(""); }}>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label>
          <label className="field"><span>Units needed</span><input value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setPatientId(""); }} type="number" min={BLOOD_QUANTITY_LIMITS.min} max={BLOOD_QUANTITY_LIMITS.max} step="1" required /></label>
          <button disabled={pending} className="primary-btn min-h-12 justify-center md:col-span-2 xl:col-span-1">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{pending ? "Searching…" : "Search all donors"}</button>
        </form>
      </div>

      {searched && (
        <div className="animate-[fade-up_.35s_ease-out]">
          <div className="flex flex-col gap-2 border-b border-white/8 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-white">Compatible donors for {bloodGroup} · {quantity} {quantity === 1 ? "unit" : "units"}</span><span className="w-fit rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{donors.length} found</span></div>
          {donors.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[.025] text-[11px] uppercase tracking-wider text-slate-500"><tr><th>Donor</th><th>Blood</th><th>Available</th><th>Verified facility</th><th>Contact</th></tr></thead><tbody className="divide-y divide-white/5">{donors.map((donor) => <tr key={donor.id} className="transition hover:bg-white/[.025]"><td><span className="flex items-center gap-2 font-semibold text-slate-200"><UserRoundCheck className="size-4 text-emerald-300" />{donor.name}</span><small className="mt-1 block text-slate-500">Age {donor.age}</small></td><td><span className="blood-chip">{donor.bloodGroup}</span></td><td><span className="status-chip">{donor.quantity} {donor.quantity === 1 ? "unit" : "units"}</span></td><td><span className="flex items-center gap-2 text-slate-300"><Building2 className="size-4 text-cyan-300" />{donor.hospital}</span></td><td><a href={`tel:${donor.phone}`} className="flex items-center gap-2 text-cyan-200 hover:text-cyan-100"><Phone className="size-4" />{donor.phone}</a></td></tr>)}</tbody></table></div> : <div className="grid min-h-44 place-items-center px-5 text-center"><div><Search className="mx-auto mb-3 size-7 text-slate-600" /><p className="font-medium text-slate-300">No compatible donor is currently available</p><p className="mt-1 text-sm text-slate-500">Try a smaller quantity or repeat the search when new donors are registered.</p></div></div>}
        </div>
      )}
    </section>
  );
}
