import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, ShieldCheck } from "lucide-react";

export function PublicAuthShell({ eyebrow, title, description, children, imageSrc = "/public.jpeg" }: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  imageSrc?: string;
}) {
  return <main className="auth-page min-h-screen px-4 py-6 sm:px-6 sm:py-8">
    <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#071014]/92 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[.92fr_1.08fr]">
      <section className="relative min-h-64 overflow-hidden border-b border-white/10 p-6 sm:min-h-80 sm:p-8 lg:min-h-0 lg:border-r lg:border-b-0 lg:p-10">
        <Image src={imageSrc} alt="PHOTA public donor login" fill priority sizes="(max-width: 1024px) 100vw, 46vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061014]/38 via-[#061014]/38 to-[#071014]/95 lg:bg-gradient-to-t lg:from-[#071014]/95 lg:via-[#071014]/45 lg:to-[#071014]/22" />
        <div className="relative flex h-full min-h-52 flex-col justify-between sm:min-h-64 lg:min-h-full">
          <Link href="/" className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 backdrop-blur-xl">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-400 text-white"><HeartHandshake className="size-5" /></span>
            <span><strong className="block text-sm text-white">PHOTA Public</strong><small className="text-[11px] text-slate-300">Patient &amp; Donor Network</small></span>
          </Link>
          <div className="mt-14 lg:mt-0">
            <ShieldCheck className="mb-4 size-9 text-emerald-300" />
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">Nearby help. Direct donor contact. Verified coordination.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">Use secure matching to find eligible support and continue the conversation through WhatsApp.</p>
          </div>
        </div>
      </section>
      <section className="flex items-center p-5 sm:p-8 lg:p-12">
        <div className="w-full animate-[fade-up_.55s_ease-out]">
          <Link href="/public" className="mb-8 flex items-center gap-2 text-sm font-semibold text-rose-300 lg:hidden"><HeartHandshake className="size-5" /> PHOTA Public Portal</Link>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-rose-300">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl leading-7 text-slate-400">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  </main>;
}
