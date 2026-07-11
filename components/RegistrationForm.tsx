"use client";

import { LoaderCircle, Plus, UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { MedicalRecord, PersonRole, PortalMode, RecordInput } from "@/lib/types";

const groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const organs = ["Kidney", "Liver", "Heart", "Lungs", "Pancreas", "Cornea"];

type Notify = (kind: "success" | "error" | "info", title: string, message: string) => void;

export function RegistrationForm({ mode, role, onCreated, onNotify }: { mode: PortalMode; role: PersonRole; onCreated: (record: MedicalRecord) => void; onNotify: Notify }) {
  const [pending, setPending] = useState(false);
  const isDonor = role === "donor";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    const form = new FormData(formElement);
    const nameValue = form.get("name");
    const cnicValue = form.get("cnic");
    const phoneValue = form.get("phone");
    const bloodGroupValue = form.get("bloodGroup");
    const hospitalValue = form.get("hospital");
    const organValue = form.get("organ");
    const donorTypeValue = form.get("donorType");
    const urgencyValue = form.get("urgency");

    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    const cnic = typeof cnicValue === "string" ? cnicValue.trim() : "";
    const phone = typeof phoneValue === "string" ? phoneValue.trim() : "";
    const bloodGroup = typeof bloodGroupValue === "string" ? bloodGroupValue.trim() : "";
    const hospital = typeof hospitalValue === "string" ? hospitalValue.trim() : "";
    const age = Number(form.get("age"));
    const organ = mode === "organ" && typeof organValue === "string" ? organValue.trim() : null;
    const donorType = mode === "organ" && isDonor && typeof donorTypeValue === "string" ? donorTypeValue.trim() : null;
    const urgency = mode === "organ" && !isDonor ? Number(urgencyValue) : null;
    const payload: RecordInput = {
      mode,
      role,
      name,
      cnic,
      phone,
      age,
      bloodGroup,
      hospital,
      organ,
      donorType,
      urgency,
    };
    try {
      const request = () => fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      let response: Response;
      try { response = await request(); } catch { response = await request(); }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onCreated(result.record);
      formElement.reset();
      onNotify("success", "Registration saved", `${result.record.name} was added to the ${isDonor ? "donor registry" : "recipient queue"}.`);
    } catch (error) {
      onNotify("error", "Registration not saved", error instanceof Error ? error.message : "Unable to save this registration.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/8 bg-white/[.025] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
        <UserRoundPlus className={`size-4 ${isDonor ? "text-cyan-300" : "text-rose-300"}`} />
        {isDonor ? `Register ${mode === "blood" ? "blood donor" : "new donor"}` : `Register ${mode === "blood" ? "blood request" : "recipient patient"}`}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field"><span>Full name</span><input name="name" required placeholder="e.g. Ahmed Khan" /></label>
        <label className="field"><span>CNIC</span><input name="cnic" required inputMode="numeric" pattern="[0-9]{13}" maxLength={13} placeholder="13 digits" /></label>
        <label className="field"><span>Phone</span><input name="phone" required type="tel" placeholder="0300 0000000" /></label>
        <label className="field"><span>Age</span><input name="age" required type="number" min="1" max="120" placeholder="Age" /></label>
        <label className="field"><span>{isDonor ? "Blood group" : "Blood needed"}</span><select name="bloodGroup">{groups.map((group) => <option key={group}>{group}</option>)}</select></label>
        {mode === "organ" && <label className="field"><span>{isDonor ? "Organ offered" : "Organ needed"}</span><select name="organ">{organs.map((organ) => <option key={organ}>{organ}</option>)}</select></label>}
        {mode === "organ" && isDonor && <label className="field"><span>Donor type</span><select name="donorType"><option>Living</option><option>Deceased</option></select></label>}
        {mode === "organ" && !isDonor && <label className="field"><span>Urgency (1–10)</span><input name="urgency" type="number" min="1" max="10" defaultValue="5" /></label>}
        <label className="field sm:col-span-2"><span>Hospital / facility</span><input name="hospital" required placeholder="e.g. Mayo Hospital, Lahore" /></label>
      </div>
      <button disabled={pending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}{pending ? "Saving to network…" : "Save registration"}
      </button>
    </form>
  );
}
