"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function PublicSignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }
    try {
      const response = await fetch("/api/public/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace(result.redirectTo);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5 animate-[fade-up_.5s_ease-out]">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="auth-field"><span>Full name</span><div><input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Your legal name" /></div></label>
      <label className="auth-field"><span>Age</span><div><input name="age" required type="number" min="1" max="120" step="1" placeholder="Age in years" /></div></label>
      <label className="auth-field"><span>Phone number</span><div><input name="phone" required type="tel" inputMode="numeric" pattern="[0-9]{11}" minLength={11} maxLength={11} autoComplete="tel" placeholder="03000000000" onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 11); }} /></div></label>
      <label className="auth-field"><span>Email address</span><div><input name="email" required type="email" autoComplete="email" placeholder="you@example.com" /></div></label>
      <label className="auth-field"><span>Create password</span><div><input name="password" required type={show ? "text" : "password"} minLength={10} maxLength={128} autoComplete="new-password" placeholder="Upper/lowercase and number" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button></div></label>
      <label className="auth-field"><span>Confirm password</span><div><input name="confirmPassword" required type={show ? "text" : "password"} minLength={10} maxLength={128} autoComplete="new-password" placeholder="Repeat password" /></div></label>
    </div>
    <div className="flex gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[.05] p-4 text-xs leading-5 text-slate-300"><ShieldCheck className="size-5 shrink-0 text-emerald-300" /><p>Your email must be verified before searches, matching, donor availability, or WhatsApp contact is enabled. Verification renews every seven days.</p></div>
    {error && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/8 p-3 text-sm text-rose-200">{error}</p>}
    <button disabled={pending} className="auth-submit">{pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}{pending ? "Creating secure account…" : "Create public account"}</button>
    <p className="text-center text-sm text-slate-400">Already registered? <Link href="/public/login" className="font-semibold text-emerald-300">Sign in</Link></p>
  </form>;
}
