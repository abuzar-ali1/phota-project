"use client";

import Link from "next/link";
import { Activity, ArrowLeftRight, BadgeCheck, CircleCheck, Database, ExternalLink, HeartPulse, LoaderCircle, MapPin, Menu, Route, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findBestMatch } from "@/lib/matching";
import type { ApiRecordsResponse, HospitalProfile, MedicalRecord, PortalMode } from "@/lib/types";
import { RecordTable } from "./RecordTable";
import { RegistrationForm } from "./RegistrationForm";
import { ToastViewport, type ToastItem } from "./ToastViewport";
import { LogoutButton } from "./LogoutButton";

type Match = { donor: MedicalRecord; patient: MedicalRecord } | null;

export function MedicalDashboard({ mode, onSwitch, hospital }: { mode: PortalMode; onSwitch: () => void; hospital: HospitalProfile }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"operations" | "registry">("operations");
  const [match, setMatch] = useState<Match>(null);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState("Ready to scan the live registry.");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((kind: ToastItem["kind"], title: string, message: string) => {
    const id = ++toastId.current;
    setToasts((current) => [...current, { id, kind, title, message }].slice(-4));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/records?mode=${mode}`, { cache: "no-store" });
      const result = (await response.json()) as ApiRecordsResponse;
      if (!response.ok) throw new Error(result.error ?? "Unable to load records.");
      setRecords(result.records);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (!active) return;
    })();
    return () => { active = false; };
  }, [load]);

  const donors = records.filter((record) => record.role === "donor").length;
  const patients = records.filter((record) => record.role === "patient").length;
  const mapQuery = match ? `${match.donor.hospital} to ${match.patient.hospital}` : "Punjab Pakistan hospitals";
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(match?.donor.hospital || "Punjab Pakistan")}&destination=${encodeURIComponent(match?.patient.hospital || "Punjab Pakistan")}`;

  function addRecord(record: MedicalRecord) {
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
    setError("");
  }

  async function removeRecord(record: MedicalRecord) {
    try {
      const response = await fetch(`/api/records?id=${encodeURIComponent(record.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      if (match?.donor.id === record.id || match?.patient.id === record.id) setMatch(null);
      notify("success", "Record removed", `${record.name} was deleted from the database.`);
    } catch (caught) {
      notify("error", "Delete failed", caught instanceof Error ? caught.message : "The record could not be removed.");
    }
  }

  function runMatch() {
    setMatching(true);
    setMatch(null);
    setMatchMessage("Scanning blood compatibility and clinical priority…");
    window.setTimeout(() => {
      const result = findBestMatch(records);
      setMatch(result);
      setMatching(false);
      setMatchMessage(result ? `Compatible route confirmed for ${result.patient.name}.` : "No compatible pair is available in the current registry.");
      notify(result ? "success" : "info", result ? "Compatible match found" : "No match found", result ? `${result.donor.name} can be routed to ${result.patient.name}.` : "Try adding another compatible donor or recipient.");
    }, 900);
  }

  const theme = mode === "organ" ? "emerald" : "rose";
  const logs = useMemo(() => [
    { text: `${records.length} verified records synchronized from Neon`, ok: true },
    { text: mode === "organ" ? "Organ and blood rules armed" : "Blood compatibility matrix armed", ok: true },
    { text: matchMessage, ok: Boolean(match) },
  ], [records.length, mode, matchMessage, match]);

  return (
    <main className={`min-h-screen mode-${theme}`}>
      <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#071014]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={onSwitch} className="flex items-center gap-3 text-left">
            <span className={`grid size-10 place-items-center rounded-xl ${mode === "organ" ? "bg-emerald-400 text-slate-950" : "bg-rose-500 text-white"}`}><HeartPulse className="size-5" /></span>
            <span><strong className="block text-sm tracking-wide text-white">PHOTA</strong><small className="text-[10px] uppercase tracking-[.18em] text-slate-500">Medical command</small></span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            <button onClick={() => setTab("operations")} className={`nav-btn ${tab === "operations" ? "active" : ""}`}>Operations</button>
            <button onClick={() => setTab("registry")} className={`nav-btn ${tab === "registry" ? "active" : ""}`}>Registry</button>
            <button onClick={onSwitch} className="ml-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"><ArrowLeftRight className="size-3.5" /> Switch portal</button>
            <Link href="/profile" className="ml-2 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 text-xs font-semibold text-emerald-200"><UserRound className="size-3.5"/>{hospital.hospitalName}<BadgeCheck className="size-3.5"/></Link>
            <LogoutButton className="nav-btn ml-1"/>
          </nav>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden" aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileOpen && <div className="grid gap-2 border-t border-white/8 p-4 md:hidden"><button onClick={() => { setTab("operations"); setMobileOpen(false); }} className="nav-btn active">Operations</button><button onClick={() => { setTab("registry"); setMobileOpen(false); }} className="nav-btn">Registry</button><button onClick={onSwitch} className="nav-btn">Switch portal</button><Link href="/profile" className="nav-btn">Hospital profile</Link><LogoutButton className="nav-btn"/></div>}
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-primary"><Activity className="size-4" /> Live Punjab network</div>
            <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-[-.035em] text-white sm:text-5xl">{mode === "organ" ? "Organ matching & route control" : "Blood dispatch & compatibility control"}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">Real-time registration, clinical matching, and hospital-to-hospital coordination from one secure workspace.</p>
          </div>
          <div className="flex gap-3">
            <Stat value={donors} label={mode === "blood" ? "Blood donors" : "Active donors"} color="cyan" />
            <Stat value={patients} label="Waiting patients" color="rose" />
          </div>
        </section>

        {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/8 p-4 text-sm text-rose-200">{error} <button onClick={() => { setLoading(true); void load(); }} className="ml-2 underline">Retry</button></div>}
        {loading ? <div className="grid min-h-[420px] place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></div> : tab === "operations" ? (
          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <section className="panel h-fit p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Registration desk</p><h2 className="mt-1 text-xl font-semibold text-white">Add medical records</h2></div><ShieldCheck className="size-5 text-primary" /></div>
              <div className="space-y-4"><RegistrationForm mode={mode} role="donor" onCreated={addRecord} onNotify={notify} /><RegistrationForm mode={mode} role="patient" onCreated={addRecord} onNotify={notify} /></div>
            </section>

            <div className="space-y-5">
              <section className="panel overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="eyebrow">Routing monitor</p><h2 className="mt-1 text-xl font-semibold text-white">Google Maps dispatch view</h2></div>
                  <a href={directions} target="_blank" rel="noreferrer" className="secondary-btn">Open directions <ExternalLink className="size-3.5" /></a>
                </div>
                <div className="relative min-h-[340px] bg-slate-900 sm:min-h-[460px]">
                  <iframe key={mapSrc} src={mapSrc} title="Hospital route on Google Maps" className="absolute inset-0 h-full w-full border-0 grayscale-[.25] contrast-[1.05]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                  {!match && <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-[#071014]/90 p-4 shadow-2xl backdrop-blur"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-white/5"><MapPin className="size-4 text-primary" /></span><div><strong className="block text-sm text-white">Route waiting for a confirmed match</strong><span className="text-xs text-slate-400">The selected donor and recipient hospitals will appear here.</span></div></div></div>}
                </div>
              </section>

              <section className="panel p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft"><Sparkles className="size-5 text-primary" /></span><div><h3 className="font-semibold text-white">Smart compatibility engine</h3><p className="mt-1 text-sm text-slate-400">Prioritizes urgency, organ type, and medically compatible blood groups.</p></div></div>
                  <button onClick={runMatch} disabled={matching || donors === 0 || patients === 0} className="primary-btn">{matching ? <LoaderCircle className="size-4 animate-spin" /> : <Route className="size-4" />}{matching ? "Scanning…" : "Run matching engine"}</button>
                </div>
                {match && <div className="mt-5 grid gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.06] p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"><MatchPerson label="Donor facility" record={match.donor} /><div className="hidden items-center gap-2 text-xs font-bold text-emerald-300 sm:flex"><CircleCheck className="size-5" /> MATCH</div><MatchPerson label="Recipient facility" record={match.patient} align="right" /></div>}
                <div className="mt-4 space-y-2 rounded-xl bg-black/20 p-4 font-mono text-xs">{logs.map((log, index) => <div key={index} className="flex gap-2 text-slate-400"><span className={log.ok ? "text-emerald-300" : "text-amber-300"}>●</span>{log.text}</div>)}</div>
              </section>
            </div>
          </div>
        ) : (
          <div className="space-y-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary-soft"><Database className="size-5 text-primary" /></span><div><p className="eyebrow">Neon database</p><h2 className="text-xl font-semibold text-white">Live medical registry</h2></div></div><RecordTable records={records} role="donor" mode={mode} onDelete={removeRecord} /><RecordTable records={records} role="patient" mode={mode} onDelete={removeRecord} /></div>
        )}
      </div>
    </main>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: "cyan" | "rose" }) { return <div className="min-w-32 rounded-2xl border border-white/8 bg-white/[.035] p-4"><strong className={`text-2xl ${color === "cyan" ? "text-cyan-300" : "text-rose-300"}`}>{value.toString().padStart(2, "0")}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span></div>; }
function MatchPerson({ label, record, align = "left" }: { label: string; record: MedicalRecord; align?: "left" | "right" }) { return <div className={align === "right" ? "sm:text-right" : ""}><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span><strong className="mt-1 block text-sm text-white">{record.hospital}</strong><span className="text-xs text-slate-400">{record.name} · {record.bloodGroup}</span></div>; }
