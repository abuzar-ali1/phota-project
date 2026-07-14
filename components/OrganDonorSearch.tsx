"use client";

import { Building2, LoaderCircle, Phone, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { readApiResponse } from "@/lib/client-api";
import { ORGAN_RULES } from "@/lib/medical-rules";
import type { MedicalRecord, NetworkDonorResult, NetworkDonorsResponse } from "@/lib/types";

const bloodGroups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
type Notify = (kind: "success" | "error" | "info", title: string, message: string) => void;

export function OrganDonorSearch({ patients, onNotify }: { patients: MedicalRecord[]; onNotify: Notify }) {
  const firstPatient = patients.find((patient) => patient.organ);
  const [patientId, setPatientId] = useState(firstPatient?.id ?? "");
  const [organ, setOrgan] = useState(firstPatient?.organ ?? ORGAN_RULES[0].name);
  const [bloodGroup, setBloodGroup] = useState(firstPatient?.bloodGroup ?? "O+");
  const [donors, setDonors] = useState<NetworkDonorResult[]>([]);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);

  function choosePatient(id: string) {
    setPatientId(id);
    const patient = patients.find((item) => item.id === id);
    if (!patient) return;
    if (patient.organ) setOrgan(patient.organ);
    setBloodGroup(patient.bloodGroup);
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const query = new URLSearchParams({ mode: "organ", scope: "network-donors", organ, bloodGroup });
      const response = await fetch(`/api/records?${query.toString()}`, { cache: "no-store" });
      const result = await readApiResponse<NetworkDonorsResponse>(response, "hospital");
      setDonors(result.donors);
      setSearched(true);
      onNotify(result.donors.length ? "success" : "info", result.donors.length ? "Compatible donors found" : "No compatible donor found", result.donors.length ? `${result.donors.length} verified donor ${result.donors.length === 1 ? "record matches" : "records match"} the recipient criteria.` : `No verified ${organ} donor currently matches blood group ${bloodGroup}.`);
    } catch (error) {
      onNotify("error", "Search failed", error instanceof Error ? error.message : "Unable to search the donor network.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-white/8 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Verified hospital network</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Search compatible organ donors</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Choose a waiting recipient or enter the needed organ and recipient blood group. The search checks every eligible donor registered by a verified hospital.</p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-1.5 text-xs font-semibold text-emerald-200"><ShieldCheck className="size-3.5" /> Authorized hospitals only</span>
        </div>

        <form onSubmit={search} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-end">
          <label className="field"><span>Waiting recipient</span><select value={patientId} onChange={(event) => choosePatient(event.target.value)}><option value="">Enter criteria manually</option>{patients.filter((patient) => patient.organ).map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.organ} · {patient.bloodGroup}</option>)}</select></label>
          <label className="field"><span>Organ needed</span><select value={organ} onChange={(event) => { setOrgan(event.target.value); setPatientId(""); }}>{ORGAN_RULES.map((rule) => <option key={rule.name} value={rule.name}>{rule.name}</option>)}</select></label>
          <label className="field"><span>Recipient blood group</span><select value={bloodGroup} onChange={(event) => { setBloodGroup(event.target.value); setPatientId(""); }}>{bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></label>
          <button disabled={pending} className="primary-btn min-h-11 justify-center md:col-span-2 xl:col-span-1">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{pending ? "Searching…" : "Search all donors"}</button>
        </form>
      </div>

      {searched && (
        <div>
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3 text-sm"><span className="font-semibold text-white">Compatible {organ} donors for {bloodGroup}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{donors.length} found</span></div>
          {donors.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[.025] text-[11px] uppercase tracking-wider text-slate-500"><tr><th>Donor</th><th>Organ</th><th>Blood</th><th>Donor type</th><th>Verified facility</th><th>Contact</th></tr></thead><tbody className="divide-y divide-white/5">{donors.map((donor) => <tr key={donor.id} className="transition hover:bg-white/[.025]"><td><span className="flex items-center gap-2 font-semibold text-slate-200"><UserRoundCheck className="size-4 text-emerald-300" />{donor.name}</span><small className="mt-1 block text-slate-500">Age {donor.age}</small></td><td>{donor.organ}</td><td><span className="blood-chip">{donor.bloodGroup}</span></td><td><span className="status-chip">{donor.donorType}</span></td><td><span className="flex items-center gap-2 text-slate-300"><Building2 className="size-4 text-cyan-300" />{donor.hospital}</span></td><td><a href={`tel:${donor.phone}`} className="flex items-center gap-2 text-cyan-200 hover:text-cyan-100"><Phone className="size-4" />{donor.phone}</a></td></tr>)}</tbody></table></div> : <div className="grid min-h-44 place-items-center px-5 text-center"><div><Search className="mx-auto mb-3 size-7 text-slate-600" /><p className="font-medium text-slate-300">No compatible donor is currently available</p><p className="mt-1 text-sm text-slate-500">Try another recipient or repeat the search when new donors are registered.</p></div></div>}
        </div>
      )}
    </section>
  );
}
