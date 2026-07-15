"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Dna, Droplets, UserRound } from "lucide-react";
import type { HospitalProfile, PortalMode } from "@/lib/types";

export function HospitalWorkspaceSelector({ onSelect, hospital }: { onSelect: (mode: PortalMode) => void; hospital: HospitalProfile }) {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,57,80,.12),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(36,232,178,.12),transparent_35%)]" />
    <div className="relative w-full max-w-5xl animate-[fade-up_.65s_ease-out]">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-white"><ArrowLeft className="size-4" /> Home</Link><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Verified hospital workspace</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Choose a medical registry</h1></div>
        <Link href="/profile" className="group flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-[#071014]/85 px-3 py-2 shadow-lg backdrop-blur-xl transition hover:bg-emerald-300/[.08]"><span className="grid size-9 place-items-center rounded-lg bg-emerald-300/10 text-emerald-300"><UserRound className="size-4" /></span><span><strong className="flex items-center gap-1.5 text-xs text-white">{hospital.hospitalName}<BadgeCheck className="size-3.5 text-emerald-300" /></strong><small className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hospital profile</small></span></Link>
      </header>
      <section className="grid gap-5 md:grid-cols-2">
        <button onClick={() => onSelect("blood")} className="portal-card group text-left"><div className="portal-card-image bg-[url('/blood.jpg')]" /><div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#080b0e]/95 via-[#10090d]/78 to-rose-950/55" /><div className="relative z-10"><div className="mb-12 flex items-start justify-between"><span className="grid size-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-300/25 backdrop-blur"><Droplets className="size-7" /></span><ArrowRight className="size-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-rose-300" /></div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-rose-300">Emergency logistics</p><h2 className="text-3xl font-semibold text-white">Blood Bank Registry</h2><p className="mt-3 max-w-md leading-7 text-slate-300">Register donors and recipients, track quantities, and identify compatible clinical routes.</p></div></button>
        <button onClick={() => onSelect("organ")} className="portal-card group text-left"><div className="portal-card-image bg-[url('/surgery.jpg')]" /><div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#071014]/95 via-[#07161a]/78 to-cyan-950/55" /><div className="relative z-10"><div className="mb-12 flex items-start justify-between"><span className="grid size-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/25 backdrop-blur"><Dna className="size-7" /></span><ArrowRight className="size-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" /></div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Transplant coordination</p><h2 className="text-3xl font-semibold text-white">Organ Match Registry</h2><p className="mt-3 max-w-md leading-7 text-slate-300">Coordinate donor records, recipient urgency, biological matching, and hospital routing.</p></div></button>
      </section>
    </div>
  </main>;
}
