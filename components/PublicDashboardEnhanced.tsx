"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock3,
  Droplets,
  HeartHandshake,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Navigation,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { ORGAN_RULES } from "@/lib/medical-rules";
import { readApiResponse } from "@/lib/client-api";
import type { PortalMode, PublicDonorListing, PublicMatch, PublicSearchResult, PublicUserProfile } from "@/lib/types";
import { PublicLogoutButton } from "./PublicLogoutButton";

const bloodGroups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
type LocationState = { latitude: number | null; longitude: number | null; area: string };
type Notice = { kind: "success" | "error" | "info"; text: string };

export function PublicDashboard({ user, initialListings, initialMatches }: {
  user: PublicUserProfile;
  initialListings: PublicDonorListing[];
  initialMatches: PublicMatch[];
}) {
  const [location, setLocation] = useState<LocationState>({ latitude: user.latitude, longitude: user.longitude, area: user.area || "" });
  const [locating, setLocating] = useState(false);
  const [searchMode, setSearchMode] = useState<PortalMode>("blood");
  const [searchGroup, setSearchGroup] = useState("O+");
  const [searchOrgan, setSearchOrgan] = useState<string>(ORGAN_RULES[0].name);
  const [searchQuantity, setSearchQuantity] = useState(1);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [donorMode, setDonorMode] = useState<PortalMode>("blood");
  const [donorGroup, setDonorGroup] = useState("O+");
  const [donorOrgan, setDonorOrgan] = useState<string>(ORGAN_RULES[0].name);
  const [donorQuantity, setDonorQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [listings, setListings] = useState(initialListings);
  const [notice, setNotice] = useState<Notice | null>(null);

  const cooldownActive = Boolean(user.cooldownUntil && new Date(user.cooldownUntil) > new Date());
  const activeMatches = useMemo(() => initialMatches.filter((match) => match.status === "active"), [initialMatches]);
  const mapQuery = location.latitude != null && location.longitude != null ? `${location.latitude},${location.longitude}` : location.area || "Punjab Pakistan";

  function locate() {
    if (!navigator.geolocation) {
      setNotice({ kind: "error", text: "Geolocation is not supported. Enter your city manually." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, area: "Current location" });
        setNotice({ kind: "success", text: "Location captured. Only approximate distance is shown to matched users." });
        setLocating(false);
      },
      () => {
        setNotice({ kind: "error", text: "Location permission was denied. Enter a Punjab city or area manually." });
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function runSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setNotice(null);
    setMatchId(null);
    setResults([]);
    setSearched(false);
    try {
      const response = await fetch("/api/public/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: searchMode, bloodGroup: searchGroup, organ: searchMode === "organ" ? searchOrgan : null, quantity: searchMode === "blood" ? searchQuantity : null, ...location }),
      });
      const result = await readApiResponse<{ results: PublicSearchResult[]; matchId: string | null }>(response, "public");
      setResults(result.results);
      setMatchId(result.matchId);
      setSearched(true);
      setNotice({
        kind: result.results.length ? "success" : "info",
        text: result.matchId
          ? `${result.results.length} nearby matches found. The nearest verified contact is ready.`
          : result.results.length
            ? `${result.results.length} potential matches found, but availability changed before the contact was reserved. Search again.`
            : "No eligible availability was found. Try again when new donors are listed.",
      });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Search failed." });
    } finally {
      setSearching(false);
    }
  }

  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/public/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: donorMode, bloodGroup: donorGroup, organ: donorMode === "organ" ? donorOrgan : null, quantity: donorMode === "blood" ? donorQuantity : null, ...location }),
      });
      const result = await readApiResponse<{ listing: PublicDonorListing }>(response, "public");
      setListings((current) => [result.listing, ...current.map((item) => item.mode === result.listing.mode ? { ...item, active: false } : item)]);
      setNotice({ kind: "success", text: "Your donor availability and location are now visible to eligible nearby searches." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Availability could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      const response = await fetch(`/api/public/listings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await readApiResponse<{ deleted: boolean }>(response, "public");
      setListings((current) => current.map((item) => item.id === id ? { ...item, active: false } : item));
      setNotice({ kind: "success", text: "Donation availability paused." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Availability could not be paused." });
    }
  }

  return <main className="auth-page min-h-screen">
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#071014]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1450px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/public" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-rose-400 text-white"><HeartHandshake className="size-5" /></span>
          <span><strong className="block text-sm text-white">PHOTA Public</strong><small className="text-[10px] uppercase tracking-[.16em] text-slate-500">Location-aware matching</small></span>
        </Link>
        <nav className="flex items-center gap-2"><Link href="/public/profile" className="secondary-btn"><UserRound /> <span className="hidden sm:inline">{user.name}</span></Link><PublicLogoutButton /></nav>
      </div>
    </header>

    <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-300"><Activity className="size-4" /> Verified public account</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white sm:text-5xl">Welcome, {user.name.split(" ")[0]}</h1><p className="mt-3 max-w-3xl leading-7 text-slate-400">Request nearby medical support or publish donor availability. Final eligibility must be confirmed by qualified clinicians.</p></div>
        <div className="flex gap-3"><Stat label="Active matches" value={activeMatches.length} /><Stat label="Donor listings" value={listings.filter((item) => item.active).length} /></div>
      </section>

      {cooldownActive && <div className="mt-5 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[.07] p-4 text-sm text-amber-100"><Clock3 className="size-5 shrink-0 text-amber-300" /><p><strong>Blood donation cooldown active.</strong> Donor listings and new donor matches are paused until {new Date(user.cooldownUntil!).toLocaleDateString("en-PK", { dateStyle: "long" })}.</p></div>}
      {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`mt-5 rounded-xl border p-4 text-sm ${notice.kind === "error" ? "border-rose-300/20 bg-rose-300/8 text-rose-200" : notice.kind === "success" ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-200" : "border-cyan-300/20 bg-cyan-300/8 text-cyan-200"}`}>{notice.text}</div>}

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <FormCard tone="rose" eyebrow="Recipient request" title="Find blood or organ support" description="Enter the patient's requirement and location to rank compatible nearby availability.">
          <form onSubmit={runSearch} className="grid gap-4 p-5 sm:grid-cols-2">
            <Segment value={searchMode} onChange={setSearchMode} />
            <label className="field"><span>Recipient blood group</span><select value={searchGroup} onChange={(event) => setSearchGroup(event.target.value)}>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label>
            {searchMode === "organ"
              ? <label className="field"><span>Organ required</span><select value={searchOrgan} onChange={(event) => setSearchOrgan(event.target.value)}>{ORGAN_RULES.map((rule) => <option key={rule.name}>{rule.name}</option>)}</select></label>
              : <label className="field"><span>Blood units needed</span><input type="number" min="1" max="1000" step="1" value={searchQuantity} onChange={(event) => setSearchQuantity(Number(event.target.value))} /></label>}
            <LocationFields location={location} setLocation={setLocation} locate={locate} locating={locating} />
            <button disabled={searching} className="primary-btn bg-rose-400 text-white hover:bg-rose-300 sm:col-span-2">{searching ? <LoaderCircle className="animate-spin" /> : <Search />}{searching ? "Cross-checking network…" : "Find nearest matches"}</button>
          </form>
        </FormCard>

        <FormCard tone="emerald" eyebrow="Donor registration" title="Offer donor availability" description="Publish your availability with a current location so an eligible nearby recipient can find you.">
          <form onSubmit={saveListing} className="grid gap-4 p-5 sm:grid-cols-2">
            <Segment value={donorMode} onChange={setDonorMode} />
            <label className="field"><span>Your blood group</span><select value={donorGroup} onChange={(event) => setDonorGroup(event.target.value)}>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label>
            {donorMode === "organ"
              ? <label className="field"><span>Organ offered</span><select value={donorOrgan} onChange={(event) => setDonorOrgan(event.target.value)}>{ORGAN_RULES.map((rule) => <option key={rule.name}>{rule.name}</option>)}</select></label>
              : <label className="field"><span>Units available</span><input type="number" min="1" max="1000" step="1" value={donorQuantity} onChange={(event) => setDonorQuantity(Number(event.target.value))} /></label>}
            <LocationFields location={location} setLocation={setLocation} locate={locate} locating={locating} />
            <button disabled={saving || cooldownActive} className="primary-btn sm:col-span-2">{saving ? <LoaderCircle className="animate-spin" /> : <Plus />}{saving ? "Publishing availability…" : cooldownActive ? "Donor availability paused" : "Publish donor availability"}</button>
          </form>
          <div className="divide-y divide-white/5 border-t border-white/8">
            {listings.slice(0, 4).map((listing) => <div key={listing.id} className="flex items-center justify-between px-5 py-3 text-sm"><div><strong className={listing.active ? "text-white" : "text-slate-500"}>{listing.mode === "blood" ? `${listing.quantity} units · ${listing.bloodGroup}` : `${listing.organ} · ${listing.bloodGroup}`}</strong><small className="mt-1 block text-slate-500">{listing.active ? `${listing.area} · visible to eligible requests` : "Paused"}</small></div>{listing.active && <button onClick={() => void deactivate(listing.id)} aria-label="Pause listing" className="grid size-9 place-items-center rounded-lg border border-rose-300/15 text-rose-300 transition hover:bg-rose-300/10"><Trash2 className="size-4" /></button>}</div>)}
          </div>
        </FormCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 p-5"><div><p className="eyebrow">Search results</p><h2 className="mt-1 text-xl font-semibold text-white">Potential availability</h2></div><span className="text-xs text-slate-500">{searched ? `${results.length} results` : "Run a search"}</span></div>
          {matchId && <div className="m-5 flex flex-col gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.07] p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm text-emerald-100">Nearest verified match opened</strong><p className="mt-1 text-xs text-slate-400">Open the match to contact the donor or verified hospital directly.</p></div><Link href={`/public/matches/${matchId}`} className="primary-btn">Open contact <ArrowRight /></Link></div>}
          <div className="divide-y divide-white/5">
            {results.map((result) => <article key={`${result.sourceType}-${result.sourceId}`} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[.025] sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${result.mode === "blood" ? "bg-rose-300/10 text-rose-300" : "bg-emerald-300/10 text-emerald-300"}`}>{result.mode === "blood" ? <Droplets /> : <HeartPulse />}</span><div><strong className="text-sm text-white">{result.hospitalName || result.label}</strong><p className="mt-1 text-xs text-slate-400">{result.mode === "blood" ? `${result.quantity} ${result.quantity === 1 ? "unit" : "units"} · ${result.bloodGroup}` : `${result.organ} · ${result.bloodGroup}`}</p></div></div><span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-200"><MapPin className="size-3.5" />{result.distanceKm} km · {result.area}</span></article>)}
            {searched && !results.length && <p className="px-5 py-10 text-center text-sm text-slate-500">No eligible availability found.</p>}
            {!searched && <p className="px-5 py-10 text-center text-sm text-slate-500">Complete the recipient request form to see compatible nearby donors.</p>}
          </div>
        </div>
        <section className="panel overflow-hidden"><div className="relative h-72"><iframe src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} title="Public portal search area" className="absolute inset-0 size-full border-0 grayscale-[.2]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><div className="flex gap-3 p-4 text-xs leading-5 text-slate-400"><ShieldCheck className="size-5 shrink-0 text-emerald-300" />Distances are calculated securely. Exact donor home coordinates are not displayed in search results.</div></section>
      </section>

      <section className="mt-5 panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 p-5"><div><p className="eyebrow">Verified connections</p><h2 className="mt-1 text-xl font-semibold text-white">Matched contacts</h2></div><PhoneCall className="text-emerald-300" /></div>
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {initialMatches.map((match) => <Link key={match.id} href={`/public/matches/${match.id}`} className="group rounded-2xl border border-white/8 bg-white/[.025] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-white/[.05]"><div className="flex items-center justify-between"><span className={`status-${match.status === "active" ? "verified" : "pending"}`}>{match.status}</span><ArrowRight className="size-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300" /></div><strong className="mt-4 block text-white">{match.counterpartName}</strong><p className="mt-1 text-xs text-slate-400">{match.mode === "blood" ? `${match.quantity} units · ${match.bloodGroup}` : `${match.organ} · ${match.bloodGroup}`} · {match.distanceKm} km</p></Link>)}
          {!initialMatches.length && <div className="py-8 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">Your nearest eligible contact will appear here after a successful search.</div>}
        </div>
      </section>
    </div>
  </main>;
}

function FormCard({ tone, eyebrow, title, description, children }: { tone: "rose" | "emerald"; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className={`panel overflow-hidden animate-[fade-up_.6s_ease-out] transition duration-300 ${tone === "rose" ? "hover:border-rose-300/20" : "hover:border-emerald-300/20"}`}>
    <div className={`border-b border-white/8 bg-gradient-to-r p-5 ${tone === "rose" ? "from-rose-400/[.10] to-transparent" : "from-emerald-300/[.10] to-transparent"}`}>
      <p className={`eyebrow flex items-center gap-2 ${tone === "rose" ? "text-rose-300" : "text-emerald-300"}`}><Sparkles className="size-3.5" />{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
    </div>
    {children}
  </section>;
}

function Segment({ value, onChange }: { value: PortalMode; onChange: (value: PortalMode) => void }) {
  return <div role="group" aria-label="Medical requirement type" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#091216] p-1 sm:col-span-2"><button type="button" aria-pressed={value === "blood"} onClick={() => onChange("blood")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${value === "blood" ? "bg-rose-400 text-white shadow-lg shadow-rose-950/30" : "text-slate-400 hover:text-white"}`}>Blood</button><button type="button" aria-pressed={value === "organ"} onClick={() => onChange("organ")} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${value === "organ" ? "bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/30" : "text-slate-400 hover:text-white"}`}>Organ</button></div>;
}

function LocationFields({ location, setLocation, locate, locating }: { location: LocationState; setLocation: React.Dispatch<React.SetStateAction<LocationState>>; locate: () => void; locating: boolean }) {
  return <div className="grid gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.035] p-3 sm:col-span-2 sm:grid-cols-[1fr_auto] sm:items-end"><label className="field"><span>City / area</span><input required value={location.area} onChange={(event) => setLocation((current) => ({ ...current, area: event.target.value, latitude: null, longitude: null }))} placeholder="e.g. Lahore" /></label><button type="button" onClick={locate} disabled={locating} className="secondary-btn min-h-12 border-cyan-300/15 px-4 text-cyan-100">{locating ? <LoaderCircle className="animate-spin" /> : <Navigation />}{locating ? "Locating…" : "Use current location"}</button></div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-32 rounded-2xl border border-white/8 bg-white/[.035] p-4"><strong className="text-2xl text-emerald-300">{value.toString().padStart(2, "0")}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span></div>;
}
