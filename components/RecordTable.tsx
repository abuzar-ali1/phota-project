"use client";

import { Database, LoaderCircle, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import type { MedicalRecord, PersonRole, PortalMode } from "@/lib/types";

export function RecordTable({ records, role, mode, onDelete }: { records: MedicalRecord[]; role: PersonRole; mode: PortalMode; onDelete: (record: MedicalRecord) => Promise<void> }) {
  const list = records.filter((record) => record.role === role);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function remove(record: MedicalRecord) {
    setDeletingId(record.id);
    try { await onDelete(record); } finally { setDeletingId(null); }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">{role === "donor" ? <Database className="size-4 text-cyan-300" /> : <UsersRound className="size-4 text-rose-300" />}{role === "donor" ? "Active donor registry" : "Recipient waiting queue"}</div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">{list.length} records</span>
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
            {!list.length && <tr><td colSpan={7} className="py-12 text-center text-slate-500">No records yet. Add the first registration above.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
