"use client";

import { BadgeCheck, CalendarDays, LoaderCircle, MapPin, ShieldAlert, ShieldCheck, Trash2, UserRound, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { readApiResponse } from "@/lib/client-api";
import type { PublicUserProfile } from "@/lib/types";

export function AdminPublicUserDirectory({ initialUsers }: { initialUsers: PublicUserProfile[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const blockedCount = users.filter((user) => user.status === "blocked").length;

  async function unblock(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/public-users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unblock" }) });
      const result = await readApiResponse<{ user: PublicUserProfile }>(response, "hospital");
      setUsers((current) => current.map((user) => user.id === id ? result.user : user));
      setMessage("Public account restored. Its previous session was revoked and the user must sign in again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Account review failed.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(user: PublicUserProfile) {
    if (!window.confirm(`Permanently delete ${user.name}? Their donor listings, matches, verification records, and account access will also be removed.`)) return;
    setBusy(user.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/public-users/${user.id}`, { method: "DELETE" });
      await readApiResponse<{ deleted: boolean }>(response, "hospital");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage(`${user.name} was permanently deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Public account could not be deleted.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="mt-10">
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-cyan-300"><UserRound className="size-4" /> Public user administration</p><h2 className="mt-2 text-2xl font-semibold text-white">Registered public accounts</h2><p className="mt-1 text-sm text-slate-400">Review every patient or donor account, restore blocked access, or permanently delete the account and its linked data.</p></div>
      <div className="flex gap-2 text-xs"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-slate-300">{users.length} users</span><span className="rounded-full border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-amber-200">{blockedCount} blocked</span></div>
    </div>
    {message && <p role="status" className="mb-4 rounded-xl border border-cyan-300/15 bg-cyan-300/[.06] p-3 text-sm text-cyan-100">{message}</p>}
    <div className="grid gap-4 xl:grid-cols-2">
      {users.map((user) => <article key={user.id} className="panel p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/15">
        <div className="flex items-start gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${user.status === "blocked" ? "bg-amber-300/10 text-amber-300" : "bg-emerald-300/10 text-emerald-300"}`}>{user.status === "blocked" ? <ShieldAlert /> : <UserRound />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-semibold text-white">{user.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${user.status === "blocked" ? "bg-amber-300/10 text-amber-300" : "bg-emerald-300/10 text-emerald-300"}`}>{user.status}</span>{user.emailVerifiedAt && <span className="flex items-center gap-1 text-[10px] font-semibold text-cyan-200"><BadgeCheck className="size-3.5" /> Email verified</span>}</div>
            <p className="mt-2 break-all text-sm text-slate-300">{user.email}</p>
            <p className="mt-1 text-sm text-slate-400">{user.phone} · Age {user.age}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="size-3.5" />{user.area || "Location not added"}</span><span className="flex items-center gap-1"><CalendarDays className="size-3.5" />Joined {new Date(user.createdAt).toLocaleDateString("en-PK")}</span></div>
            {user.blockedReason && <p className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/[.04] p-2 text-xs leading-5 text-amber-100/80">{user.blockedReason}</p>}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/7 pt-4">
          {user.status === "blocked" && <button disabled={busy === user.id} onClick={() => void unblock(user.id)} className="secondary-btn border-emerald-300/20 text-emerald-200">{busy === user.id ? <LoaderCircle className="animate-spin" /> : <UserRoundCheck />} Restore access</button>}
          <button disabled={busy === user.id} onClick={() => void remove(user)} aria-label={`Delete ${user.name}`} className="secondary-btn border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20">{busy === user.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete user</button>
        </div>
      </article>)}
      {!users.length && <div className="panel p-10 text-center text-sm text-slate-400 xl:col-span-2"><ShieldCheck className="mx-auto mb-3 size-8 text-emerald-300" />No public accounts have registered yet.</div>}
    </div>
  </section>;
}
