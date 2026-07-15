"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Clock3, ExternalLink, HeartHandshake, LoaderCircle, MapPin, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { readApiResponse } from "@/lib/client-api";
import type { PublicMatch } from "@/lib/types";

export function PublicMatchContact({ matchId, initialMatch }: { matchId: string; initialMatch: PublicMatch }) {
  const [match, setMatch] = useState(initialMatch);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const cooldownActive = Boolean(match.donorCooldownUntil && new Date(match.donorCooldownUntil) > new Date());
  const contactAllowed = match.status === "active" && !cooldownActive;
  const whatsappUrl = match.counterpartPhone ? buildWhatsAppUrl(match.counterpartPhone, match) : null;

  async function complete() {
    if (!window.confirm("Confirm that this blood donation was completed? A strict three-month cooldown will begin immediately.")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/public/matches/${matchId}/donation`, { method: "POST" });
      const result = await readApiResponse<{ cooldownUntil: string }>(response, "public");
      setMatch((current) => ({ ...current, status: "closed", donorCooldownUntil: result.cooldownUntil }));
      setNotice(`Donation recorded. Donor availability is paused until ${new Date(result.cooldownUntil).toLocaleDateString("en-PK", { dateStyle: "long" })}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Donation could not be completed.");
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page min-h-screen px-4 py-6 sm:px-6">
    <div className="mx-auto max-w-5xl animate-[fade-up_.55s_ease-out]">
      <header className="mb-5 flex items-center justify-between"><Link href="/public/dashboard" className="secondary-btn"><ArrowLeft /> Dashboard</Link><span className={`status-${match.status === "active" ? "verified" : "pending"}`}>{match.status}</span></header>
      <section className="panel overflow-hidden">
        <div className="relative overflow-hidden border-b border-white/8 p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_15%,rgba(110,231,183,.12),transparent_35%),radial-gradient(circle_at_10%_100%,rgba(34,211,238,.08),transparent_36%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-300">{match.medicalRecordId ? <Building2 /> : <UserRound />}</span><div><p className="eyebrow">Verified PHOTA match</p><h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{match.counterpartName}</h1><p className="mt-2 text-sm text-slate-400">{match.mode === "blood" ? `${match.quantity} blood ${match.quantity === 1 ? "unit" : "units"} · ${match.bloodGroup}` : `${match.organ} · recipient group ${match.bloodGroup}`} · approximately {match.distanceKm} km away</p></div></div>
            <span className="flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 text-xs font-semibold text-emerald-200"><ShieldCheck className="size-4" /> Authenticated contact</span>
          </div>
        </div>

        {notice && <p role="status" className="m-5 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-200">{notice}</p>}
        {error && <p role="alert" className="m-5 rounded-xl border border-rose-300/20 bg-rose-300/8 p-4 text-sm text-rose-200">{error}</p>}

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_.8fr]">
          <div>
            <p className="eyebrow">Direct coordination</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Continue securely on WhatsApp</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">PHOTA only reveals this contact after an authenticated medical match. Use WhatsApp to arrange hospital coordination, screening, and next steps. Never send money or identity documents to an individual.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {contactAllowed && whatsappUrl
                ? <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-btn"><WhatsAppMark /> Contact on WhatsApp <ExternalLink className="size-4" /></a>
                : <span className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.06] px-4 py-3 text-sm text-amber-100"><Clock3 className="size-4 text-amber-300" />{!match.counterpartPhone ? "No WhatsApp number is available" : "Contact is paused for this match"}</span>}
              {contactAllowed && match.medicalRecordId && match.counterpartPhone && <a href={`tel:${match.counterpartPhone}`} className="secondary-btn px-4 py-3"><Phone /> Call hospital</a>}
            </div>
          </div>
          <aside className="rounded-2xl border border-white/8 bg-white/[.03] p-5">
            <p className="eyebrow">Before you contact</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li className="flex gap-3"><ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-300" />Confirm the match through a verified hospital.</li>
              <li className="flex gap-3"><HeartHandshake className="mt-1 size-4 shrink-0 text-rose-300" />Donation must remain voluntary and free from payment.</li>
              <li className="flex gap-3"><MapPin className="mt-1 size-4 shrink-0 text-cyan-300" />Meet only at an appropriate medical facility.</li>
            </ul>
          </aside>
        </div>

        {cooldownActive && <div className="mx-5 mb-5 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-4 text-sm text-amber-100 sm:mx-8 sm:mb-8"><Clock3 className="size-5 shrink-0 text-amber-300" />This match is paused during the donor&apos;s required three-month blood-donation cooldown.</div>}
        {match.mode === "blood" && match.currentUserRole === "donor" && match.status === "active" && <div className="border-t border-white/8 p-5 sm:px-8"><button onClick={() => void complete()} disabled={pending} className="secondary-btn border-emerald-300/20 px-4 py-3 text-emerald-200">{pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />} Mark blood donation completed</button></div>}
      </section>
    </div>
  </main>;
}

function buildWhatsAppUrl(phone: string, match: PublicMatch) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("92") ? digits : digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
  if (!/^\d{10,15}$/.test(international)) return null;
  const subject = match.mode === "blood" ? `${match.bloodGroup} blood match` : `${match.organ} match`;
  const message = `Hello, I am contacting you regarding our verified PHOTA ${subject}. Please coordinate the next steps through an appropriate hospital.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

function WhatsAppMark() {
  return <span className="relative grid size-6 place-items-center rounded-full bg-white text-[#16a862]"><MessageCircle className="size-5 fill-current" /><Phone className="absolute size-2.5 text-[#16a862]" /></span>;
}
