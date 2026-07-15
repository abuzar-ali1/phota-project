import { redirect } from "next/navigation";
import { Ban, ShieldAlert } from "lucide-react";
import { PublicLogoutButton } from "@/components/PublicLogoutButton";
import { getCurrentPublicUser } from "@/lib/public-auth";

export const dynamic = "force-dynamic";

export default async function PublicBlockedPage() {
  const user = await getCurrentPublicUser();
  if (!user) redirect("/public/login");
  if (user.status !== "blocked") redirect("/public/dashboard");
  return <main className="auth-page grid min-h-screen place-items-center px-4"><section className="w-full max-w-xl rounded-[30px] border border-rose-300/15 bg-[#071014]/95 p-8 text-center shadow-2xl"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose-300/10 text-rose-300"><Ban className="size-8" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-rose-300">Automated security protection</p><h1 className="mt-2 text-3xl font-semibold text-white">Account blocked for review</h1><p className="mt-4 leading-7 text-slate-400">{user.blockedReason || "Suspicious repeated activity triggered PHOTA's anti-spam safeguards."}</p><div className="mt-6 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-left text-xs leading-5 text-slate-300"><ShieldAlert className="size-5 shrink-0 text-amber-300" />Medical searches, donor listings, new matches, and WhatsApp contact access are disabled while this account is blocked. Contact a PHOTA administrator for review.</div><div className="mt-7"><PublicLogoutButton /></div></section></main>;
}
