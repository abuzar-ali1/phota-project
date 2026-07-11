"use client";

import Image from "next/image";
import { Activity, ArrowRight, BookOpen, Building2, Dna, Droplets, GraduationCap, ShieldCheck } from "lucide-react";
import type { PortalMode } from "@/lib/types";

const teamMembers = [
  { name: "Abuzar Ali", image: "/abuzar-ali.jpeg" },
  { name: "Muhammad Naeem", image: "/naeem.jpeg" },
  { name: "Javeria Khursheed", image: "/javeria.jpg" },
  { name: "Noor Fatima", image: "/noor.jpg" },
];

export function PortalSelector({ onSelect }: { onSelect: (mode: PortalMode) => void }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,57,80,.14),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(36,232,178,.13),transparent_35%)]" />
      <div className="relative w-full max-w-5xl animate-[fade-up_.7s_ease-out]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[.22em] text-slate-300">
            <Activity className="size-4 text-emerald-300" /> PHOTA Command Network
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-.04em] text-white sm:text-6xl">
            <svg className="mx-auto h-16 w-full max-w-[34rem] sm:h-24" viewBox="0 0 800 160" preserveAspectRatio="xMidYMid meet" role="img" aria-label="PHOTA logo">
              <defs>
                <linearGradient id="photaGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#FF5A7A">
                    <animate attributeName="offset" values="0;0.6;0" dur="6s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="50%" stopColor="#7C4DFF">
                    <animate attributeName="offset" values="0.2;1;0.2" dur="6s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor="#00E3B7">
                    <animate attributeName="offset" values="0.4;1;0.4" dur="6s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
                <filter id="photaShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
                </filter>
              </defs>
              <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue'" fontWeight="700" fontSize="88" fill="url(#photaGrad)" filter="url(#photaShadow)">PHOTA</text>
              <text x="50%" y="92%" textAnchor="middle" dominantBaseline="middle" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="16" fill="#94A3B8">Punjab Health Organ & Transfusion Assistant</text>
            </svg>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-400 sm:text-lg">
            Punjab&apos;s unified medical matching workspace for organ allocation and urgent blood dispatch.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button onClick={() => onSelect("blood")} className="portal-card group text-left">
            <div className="portal-card-image bg-[url('/blood.jpg')]" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#080b0e]/95 via-[#10090d]/78 to-rose-950/55" />
            <div className="relative z-10">
              <div className="mb-10 flex items-start justify-between">
                <span className="grid size-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-300/25 backdrop-blur"><Droplets className="size-7" /></span>
                <ArrowRight className="size-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-rose-300" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-rose-300">Emergency logistics</p>
              <h2 className="text-3xl font-semibold text-white">Blood Bank Portal</h2>
              <p className="mt-3 max-w-md leading-7 text-slate-300">Register blood donors, prioritize requests, and dispatch compatible supply between hospitals.</p>
            </div>
          </button>

          <button onClick={() => onSelect("organ")} className="portal-card group text-left">
            <div className="portal-card-image bg-[url('/surgery.jpg')]" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#071014]/95 via-[#07161a]/78 to-cyan-950/55" />
            <div className="relative z-10">
              <div className="mb-10 flex items-start justify-between">
                <span className="grid size-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-200/25 backdrop-blur"><Dna className="size-7" /></span>
                <ArrowRight className="size-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-200">Transplant coordination</p>
              <h2 className="text-3xl font-semibold text-white">Organ Match Portal</h2>
              <p className="mt-3 max-w-md leading-7 text-slate-300">Coordinate donor records, recipient urgency, biological matching, and hospital routing.</p>
            </div>
          </button>
        </div>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#071014]/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,.28)] backdrop-blur-xl sm:p-7" aria-labelledby="project-team-title">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300"><GraduationCap className="size-4" /> University project</div>
              <h2 id="project-team-title" className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Meet the project team</h2>
            </div>
            <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:text-right">
              <div className="flex items-center gap-2 lg:justify-end"><Building2 className="size-4 text-cyan-300" /><span>Allama Iqbal Open University</span></div>
              <div className="flex items-center gap-2 lg:justify-end"><BookOpen className="size-4 text-emerald-300" /><span>BS Computer Science · Second Semester</span></div>
              <p className="text-xs text-slate-500 sm:col-span-2">Lahore Regional Campus</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member) => (
              <div key={member.name} className="group rounded-2xl border border-white/8 bg-white/[.035] p-4 text-center transition duration-300 hover:-translate-y-1 hover:border-emerald-300/20 hover:bg-white/[.065]">
                <div className="relative mx-auto size-28 overflow-hidden rounded-full border-2 border-emerald-300/30 bg-slate-800 p-1 shadow-[0_0_0_5px_rgba(110,231,183,.06)] sm:size-32">
                  <Image src={member.image} alt={`${member.name} profile picture`} fill sizes="128px" className="rounded-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{member.name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-[.14em] text-emerald-300/80">BSCS Student</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="size-4" /> Secure records powered by the PHOTA medical network</div>
      </div>
    </main>
  );
}
