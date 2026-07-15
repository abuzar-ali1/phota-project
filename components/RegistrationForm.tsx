"use client";

import { Activity, Building2, CalendarDays, Droplets, HeartPulse, IdCard, LoaderCircle, Phone, Plus, UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { readApiResponse } from "@/lib/client-api";
import { BLOOD_QUANTITY_LIMITS, getAgeRule, ORGAN_RULES, validateAge, validateBloodQuantity } from "@/lib/medical-rules";
import type { ApiRecordResponse, MedicalRecord, PersonRole, PortalMode, RecordInput } from "@/lib/types";

const groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
type Notify = (kind: "success" | "error" | "info", title: string, message: string) => void;

export function RegistrationForm({ mode, role, onCreated, onNotify }: { mode: PortalMode; role: PersonRole; onCreated: (record: MedicalRecord) => void; onNotify: Notify }) {
  const [pending, setPending] = useState(false);
  const [selectedOrgan, setSelectedOrgan] = useState<string>(ORGAN_RULES[0].name);
  const isDonor = role === "donor";
  const ageRule = getAgeRule(mode, role, selectedOrgan)!;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
    const name = text("name");
    const cnic = text("cnic");
    const phone = text("phone");
    const bloodGroup = text("bloodGroup");
    const hospital = text("hospital");
    const age = Number(form.get("age"));
    const organ = mode === "organ" ? text("organ") : null;
    const donorType = mode === "organ" && isDonor ? text("donorType") : null;
    const urgency = mode === "organ" && !isDonor ? Number(form.get("urgency")) : null;
    const quantity = mode === "blood" ? Number(form.get("quantity")) : null;

    if (!/^\d{13}$/.test(cnic)) {
      onNotify("error", "Check CNIC", "CNIC must contain exactly 13 digits.");
      return;
    }
    if (!/^\d{11}$/.test(phone)) {
      onNotify("error", "Check phone number", "Phone number must contain exactly 11 digits.");
      return;
    }
    const ageError = validateAge(mode, role, organ, age);
    if (ageError) {
      onNotify("error", "Age is not eligible", ageError);
      return;
    }
    if (mode === "blood") {
      const quantityError = validateBloodQuantity(quantity!);
      if (quantityError) {
        onNotify("error", "Check blood quantity", quantityError);
        return;
      }
    }

    const payload: RecordInput = { mode, role, name, cnic, phone, age, bloodGroup, hospital, organ, donorType, urgency, quantity };
    setPending(true);
    try {
      const request = () => fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      let response: Response;
      try { response = await request(); } catch { response = await request(); }
      const result = await readApiResponse<ApiRecordResponse>(response, "hospital");
      onCreated(result.record);
      formElement.reset();
      setSelectedOrgan(ORGAN_RULES[0].name);
      onNotify("success", "Registration saved", `${result.record.name} was added to the ${isDonor ? "donor registry" : "recipient queue"}.`);
    } catch (error) {
      onNotify("error", "Registration not saved", error instanceof Error ? error.message : "Unable to save this registration.");
    } finally {
      setPending(false);
    }
  }

  const title = isDonor
    ? `Register ${mode === "blood" ? "blood donor" : "organ donor"}`
    : `Register ${mode === "blood" ? "blood request" : "recipient patient"}`;

  return (
    <form onSubmit={submit} className={`registration-card group ${isDonor ? "registration-donor" : "registration-recipient"}`}>
      <div className="registration-glow" />
      <div className="relative mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="registration-icon"><UserRoundPlus /></span>
          <div><p className="eyebrow">{isDonor ? "Donor availability" : "Patient requirement"}</p><h3 className="mt-1 text-base font-semibold text-white">{title}</h3></div>
        </div>
        <span className="rounded-full border border-white/8 bg-white/[.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure record</span>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2">
        <label className="field"><span>Full name</span><div className="field-control"><UserRoundPlus /><input name="name" required maxLength={120} placeholder="e.g. Ahmed Khan" /></div></label>
        <label className="field"><span>CNIC</span><div className="field-control"><IdCard /><input name="cnic" required inputMode="numeric" pattern="[0-9]{13}" maxLength={13} placeholder="13 digits" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 13); }} /></div></label>
        <label className="field"><span>Phone</span><div className="field-control"><Phone /><input name="phone" required type="tel" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} placeholder="03000000000" title="Enter exactly 11 digits" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11); }} /></div></label>
        <label className="field"><span>Age</span><div className="field-control"><CalendarDays /><input name="age" required type="number" min={ageRule.min} max={ageRule.max} step="1" placeholder={`${ageRule.min}–${ageRule.max} years`} /></div><small className="field-help">Allowed: {ageRule.min}–{ageRule.max} years · {ageRule.note}</small></label>
        <label className="field"><span>{isDonor ? "Blood group" : "Blood needed"}</span><div className="field-control"><Droplets /><select name="bloodGroup">{groups.map((group) => <option key={group}>{group}</option>)}</select></div></label>
        {mode === "blood" && <label className="field"><span>Blood units {isDonor ? "available" : "needed"}</span><div className="field-control"><Activity /><input name="quantity" required type="number" inputMode="numeric" min={BLOOD_QUANTITY_LIMITS.min} max={BLOOD_QUANTITY_LIMITS.max} step="1" defaultValue="1" placeholder="Number of units" /></div></label>}
        {mode === "organ" && <label className="field"><span>{isDonor ? "Organ offered" : "Organ needed"}</span><div className="field-control"><HeartPulse /><select name="organ" value={selectedOrgan} onChange={(event) => setSelectedOrgan(event.target.value)}>{ORGAN_RULES.map((rule) => <option key={rule.name} value={rule.name}>{rule.name}</option>)}</select></div></label>}
        {mode === "organ" && isDonor && <label className="field"><span>Donor type</span><div className="field-control"><Activity /><select name="donorType"><option>Living</option><option>Deceased</option></select></div></label>}
        {mode === "organ" && !isDonor && <label className="field"><span>Urgency (1–10)</span><div className="field-control"><Activity /><input name="urgency" type="number" min="1" max="10" defaultValue="5" /></div></label>}
        <label className="field sm:col-span-2"><span>Hospital / facility</span><div className="field-control"><Building2 /><input name="hospital" required maxLength={160} placeholder="e.g. Mayo Hospital, Lahore" /></div></label>
      </div>
      <button disabled={pending} className="registration-submit">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{pending ? "Saving to network…" : "Save registration"}
      </button>
    </form>
  );
}
