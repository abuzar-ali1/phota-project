"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  IdCard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  HOSPITAL_LICENSE_HTML_PATTERN,
  HOSPITAL_LICENSE_MAX_LENGTH,
  HOSPITAL_LICENSE_MIN_LENGTH,
  normalizeHospitalLicense,
  validHospitalLicense,
} from "@/lib/auth-validation";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [licenseLength, setLicenseLength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const licenseNumber = normalizeHospitalLicense(payload.licenseNumber);

    if (!validHospitalLicense(licenseNumber)) {
      setError("Enter a valid 5–40 character license number using letters, numbers, /, &, . or -. Example: PHC/L&A/2025/PL-91226.");
      return;
    }
    if (payload.password !== payload.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, licenseNumber }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(result.redirectTo || "/verify-email");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Application could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 animate-[fade-up_.45s_ease-out]">
      <section className="form-section">
        <div className="form-section-title"><span className="form-section-icon"><Building2 /></span><div><strong>Hospital identity</strong><small>Official facility and registration information</small></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="auth-field"><span>Hospital name</span><div><Building2 /><input name="hospitalName" required maxLength={160} placeholder="e.g. Mayo Hospital" /></div></label>
          <label className="auth-field"><span>Hospital type</span><div><Building2 /><select name="hospitalType" required defaultValue=""><option value="" disabled>Select type</option><option>Public Hospital</option><option>Private Hospital</option><option>Teaching Hospital</option><option>Specialized Hospital</option></select></div></label>
          <label className="auth-field sm:col-span-2"><span className="flex items-center justify-between gap-3"><span>Registration / license number</span><small className="font-normal text-slate-500">{licenseLength}/{HOSPITAL_LICENSE_MAX_LENGTH}</small></span><div><IdCard /><input name="licenseNumber" required minLength={HOSPITAL_LICENSE_MIN_LENGTH} maxLength={HOSPITAL_LICENSE_MAX_LENGTH} pattern={HOSPITAL_LICENSE_HTML_PATTERN} title="Use 5–40 letters, numbers, slash, ampersand, dot or hyphen" placeholder="PHC/L&A/2025/PL-91226 or PL-91226" autoCapitalize="characters" onInput={(event) => { const next = event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9/&.-]/g, "").slice(0, HOSPITAL_LICENSE_MAX_LENGTH); event.currentTarget.value = next; setLicenseLength(next.length); }} /></div><small className="normal-case tracking-normal text-slate-500">Accepted length: 5–40 characters. Spaces are removed automatically.</small></label>
          <label className="auth-field"><span>Registration authority</span><div><BadgeCheck /><select name="registrationAuthority" required defaultValue=""><option value="" disabled>Select authority</option><option>Punjab Healthcare Commission</option><option>Pakistan Medical & Dental Council</option><option>PHOTA</option><option>Government Health Department</option></select></div></label>
          <label className="auth-field"><span>City</span><div><MapPin /><input name="city" required maxLength={80} placeholder="Lahore" /></div></label>
          <label className="auth-field sm:col-span-2"><span>Complete hospital address</span><div className="items-start"><MapPin className="mt-3" /><textarea name="address" required maxLength={240} rows={3} placeholder="Street, area, district and postal code" /></div></label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-title"><span className="form-section-icon"><ShieldCheck /></span><div><strong>Authorized access</strong><small>Administrator and secure login credentials</small></div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="auth-field"><span>Official hospital email</span><div><Mail /><input name="officialEmail" type="email" autoComplete="email" required maxLength={254} placeholder="admin@hospital.org" /></div></label>
          <label className="auth-field"><span>Hospital phone</span><div><Phone /><input name="phone" type="tel" autoComplete="tel" required maxLength={30} placeholder="+92 42 0000000" /></div></label>
          <label className="auth-field"><span>Authorized administrator</span><div><UserRound /><input name="adminName" autoComplete="name" required maxLength={120} placeholder="Full legal name" /></div></label>
          <label className="auth-field"><span>Administrator designation</span><div><BadgeCheck /><input name="adminTitle" required maxLength={100} placeholder="Medical Director / IT Administrator" /></div></label>
          <label className="auth-field"><span>Create password</span><div><LockKeyhole /><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={10} maxLength={128} placeholder="Upper/lowercase and number" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
          <label className="auth-field"><span>Confirm password</span><div><LockKeyhole /><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={10} maxLength={128} placeholder="Repeat password" /></div></label>
        </div>
      </section>

      <div className="flex gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-4 text-xs leading-5 text-slate-300"><ShieldCheck className="size-5 shrink-0 text-cyan-300" /><p>Submitting does not grant immediate access. A PHOTA administrator must verify the hospital license and official details first.</p></div>
      {error && <p role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/8 p-3 text-sm text-rose-200">{error}</p>}
      <button disabled={pending} className="auth-submit">{pending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}{pending ? "Submitting securely…" : "Submit hospital application"}</button>
      <p className="text-center text-sm text-slate-400">Already registered? <Link href="/login" className="font-semibold text-emerald-300 transition hover:text-emerald-200">Sign in</Link></p>
    </form>
  );
}
