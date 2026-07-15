import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HeartHandshake, MapPin, MessageCircle, PhoneCall, Search, ShieldCheck } from "lucide-react";
import { getCurrentPublicUser, publicDestination } from "@/lib/public-auth";

export const dynamic = "force-dynamic";

export default async function PublicPortalPage() {
  const user = await getCurrentPublicUser();
  const destination = user ? publicDestination(user) : "/public/signup";
  return <main className="auth-page min-h-screen px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-6xl animate-[fade-up_.6s_ease-out]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-rose-400 text-white"><HeartHandshake /></span><span><strong className="block text-white">PHOTA Public</strong><small className="text-xs text-slate-400">Patient &amp; Donor Network</small></span></Link>
        <div className="flex gap-2">{user ? <Link href={destination} className="primary-btn">Open dashboard <ArrowRight /></Link> : <><Link href="/public/login" className="secondary-btn px-4">Sign in</Link><Link href="/public/signup" className="primary-btn">Register</Link></>}</div>
      </header>
      <section className="relative mt-8 min-h-[510px] overflow-hidden rounded-[34px] border border-white/10 bg-[#071014]/88 shadow-2xl">
        <Image src="/public.jpeg" alt="Public patients and donors supported by healthcare professionals" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071014]/98 via-[#071014]/82 to-[#071014]/30" />
        <div className="relative flex min-h-[510px] max-w-3xl flex-col justify-center px-6 py-14 sm:px-10 lg:px-16">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-200 backdrop-blur-xl"><ShieldCheck className="size-4" /> Protected public access</span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-.045em] text-white sm:text-6xl">Find nearby blood and organ support safely.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">Search verified availability, publish donor support with your location, and contact an authenticated match directly through WhatsApp.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href={destination} className="primary-btn">{user ? "Continue to portal" : "Create secure account"}<ArrowRight /></Link>{!user && <Link href="/public/login" className="secondary-btn bg-slate-950/40 px-5 py-3 backdrop-blur-xl">I already have an account</Link>}</div>
        </div>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {[{ icon: <Search />, title: "Medical search", text: "Search by blood group or organ with server-side compatibility checks." }, { icon: <MapPin />, title: "Nearest first", text: "Location-aware ranking shows approximate distance without exposing donor coordinates." }, { icon: <span className="relative"><MessageCircle /><PhoneCall className="absolute -right-1 -bottom-1 size-3" /></span>, title: "WhatsApp contact", text: "After a verified match, open the donor or hospital contact directly in WhatsApp." }].map((item) => <article key={item.title} className="panel p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/15"><span className="grid size-11 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300 [&_svg]:size-5">{item.icon}</span><h2 className="mt-5 text-lg font-semibold text-white">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p></article>)}
      </section>
      <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-5 text-slate-500">PHOTA presents potential availability for coordination. Final blood or transplant eligibility must be confirmed by qualified clinicians and a verified hospital.</p>
    </div>
  </main>;
}
