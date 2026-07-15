"use client";

import { Database, LoaderCircle, Search, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";
import type { MedicalRecord, PersonRole, PortalMode } from "@/lib/types";

export function RecordTable({ records, role, mode, onDelete }: { records: MedicalRecord[]; role: PersonRole; mode: PortalMode; onDelete: (record: MedicalRecord) => Promise<void> }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const roleRecords = records.filter((record) => record.role === role);
  const normalizedQuery = query.trim().toLowerCase();
  const list = normalizedQuery ? roleRecords.filter((record) => [record.name, record.cnic, record.phone, record.bloodGroup, record.hospital, record.organ, record.donorType]
    .filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery))) : roleRecords;

  async function remove(record: MedicalRecord) {
    setDeletingId(record.id);
    try { await onDelete(record); } finally { setDeletingId(null); }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">{role === "donor" ? <Database className="size-4 text-cyan-300" /> : <UsersRound className="size-4 text-rose-300" />}{role === "donor" ? "Active donor registry" : "Recipient waiting queue"}</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 sm:w-72"><span className="sr-only">Search this registry</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${role === "donor" ? "donors" : "recipients"}…`} className="min-h-10 w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/10" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"><X className="size-3.5" /></button>}</label>
          <span className="w-fit whitespace-nowrap rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{list.length}{normalizedQuery ? ` of ${roleRecords.length}` : ""} records</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-white/[.025] text-[11px] uppercase tracking-wider text-slate-500">
            <tr><th>Patient</th><th>Blood</th>{mode === "blood" && <th>Quantity</th>}{mode === "organ" && <th>Organ</th>}<th>Hospital</th><th>Contact</th>{mode === "organ" && <th>Status</th>}<th className="w-16 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.map((record) => (
              <tr key={record.id} className="transition hover:bg-white/[.025]">
                <td><strong className="block text-slate-200">{record.name}</strong><span className="text-xs text-slate-500">Age {record.age} · {record.cnic}</span></td>
                <td><span className="blood-chip">{record.bloodGroup}</span></td>
                {mode === "blood" && <td><span className="status-chip">{record.quantity} {record.quantity === 1 ? "unit" : "units"}</span></td>}
                {mode === "organ" && <td>{record.organ}</td>}
                <td>{record.hospital}</td><td>{record.phone}</td>
                {mode === "organ" && <td>{role === "donor" ? <span className="status-chip">{record.donorType}</span> : <span className="urgency-chip">Level {record.urgency}/10</span>}</td>}
                <td className="text-right"><button onClick={() => void remove(record)} disabled={deletingId === record.id} aria-label={`Delete ${record.name}`} title={`Delete ${record.name}`} className="inline-grid size-9 place-items-center rounded-lg border border-rose-400/15 bg-rose-400/[.06] text-rose-300 transition hover:border-rose-300/30 hover:bg-rose-400/15 disabled:opacity-50">{deletingId === record.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="py-12 text-center text-slate-500">{normalizedQuery ? "No records match this search." : "No records yet. Add the first registration above."}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
