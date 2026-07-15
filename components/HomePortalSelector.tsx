import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, Building2, GraduationCap, HeartHandshake, Hospital, ShieldCheck } from "lucide-react";
import type { HospitalProfile } from "@/lib/types";

const team = [
  { name: "Abuzar Ali", image: "/abuzar-ali.png" },
  { name: "Muhammad Naeem", image: "/naeem.jpeg" },
  { name: "Javeria Khursheed", image: "/javeria.jpg" },
  { name: "Noor Fatima", image: "/noor.jpg" },
];

export function HomePortalSelector({ hospital }: { hospital?: HospitalProfile }) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(251,113,133,.13),transparent_32%),radial-gradient(circle_at_85%_70%,rgba(110,231,183,.12),transparent_35%)]" />
      <div className="relative mx-auto max-w-6xl animate-[fade-up_.65s_ease-out]">
        <header className="mx-auto mb-9 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-4 py-2 text-[11px] font-bold uppercase tracking-[.2em] text-slate-300 backdrop-blur-xl">
            <ShieldCheck className="size-4 text-emerald-300" /> Punjab Health Organ &amp; Transfusion Assistant
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-.05em] text-white sm:text-6xl">Choose your secure PHOTA portal</h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty leading-7 text-slate-400">One protected network for individual donors and patients, and one verified workspace for registered hospitals.</p>
        </header>

        <section className="grid gap-5 lg:grid-cols-2" aria-label="PHOTA portals">
          <PortalCard
            href="/public"
            image="/public.jpeg"
            imageAlt="Patients, donors, and healthcare workers using the public PHOTA network"
            accent="rose"
            eyebrow="For patients and donors"
            title="Public Portal"
            description="Search nearby blood and organ availability, publish donor support, and contact an eligible match directly through WhatsApp."
            action="Enter public portal"
            icon={<HeartHandshake className="size-7" />}
          />
          <PortalCard
            href={hospital ? "/workspace" : "/login"}
            image="/hospital.jfif"
            imageAlt="Modern verified hospital building"
            accent="emerald"
            eyebrow="For verified medical facilities"
            title="Hospital Portal"
            description="Manage blood and organ registries, coordinate clinical matches, and operate through an administrator-approved hospital account."
            action={hospital ? "Open hospital workspace" : "Hospital sign in"}
            icon={<Hospital className="size-7" />}
            badge={hospital ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-200"><BadgeCheck className="size-4" /> {hospital.hospitalName}</span> : undefined}
          />
        </section>

        <section className="mt-8 border-t border-white/10 pt-7" aria-labelledby="project-team-title">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300"><GraduationCap className="size-4" /> University project</p>
              <h2 id="project-team-title" className="mt-2 text-xl font-semibold text-white">BS Computer Science · Second Semester</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-400"><Building2 className="size-4 text-cyan-300" /> Allama Iqbal Open University, Lahore Regional Campus <BookOpen className="ml-1 size-4 text-emerald-300" /></p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3">
              {team.map((member) => <div key={member.name} className="flex items-center gap-2.5"><span className="relative size-11 overflow-hidden rounded-full border-2 border-emerald-300/25 bg-slate-800"><Image src={member.image} alt={`${member.name} profile`} fill sizes="44px" className="object-cover" /></span><span className="text-sm font-semibold text-slate-200">{member.name}</span></div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PortalCard({ href, image, imageAlt, accent, eyebrow, title, description, action, icon, badge }: {
  href: string;
  image: string;
  imageAlt: string;
  accent: "rose" | "emerald";
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const rose = accent === "rose";
  return <Link href={href} className={`portal-card group min-h-[440px] p-0 sm:p-0 ${rose ? "hover:border-rose-300/35" : "hover:border-emerald-300/35"}`}>
    <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
    <div className={`absolute inset-0 z-[1] ${rose ? "bg-gradient-to-t from-[#10070b] via-[#10070b]/78 to-slate-950/20" : "bg-gradient-to-t from-[#04110e] via-[#04110e]/76 to-slate-950/20"}`} />
    <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className={`grid size-14 place-items-center rounded-2xl border backdrop-blur-xl ${rose ? "border-rose-200/20 bg-rose-400/15 text-rose-200" : "border-emerald-200/20 bg-emerald-300/15 text-emerald-200"}`}>{icon}</span>
        {badge}
      </div>
      <p className={`text-[10px] font-bold uppercase tracking-[.22em] ${rose ? "text-rose-300" : "text-emerald-300"}`}>{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">{description}</p>
      <span className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${rose ? "text-rose-200" : "text-emerald-200"}`}>{action}<ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
    </div>
  </Link>;
}
