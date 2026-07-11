import type { HospitalSignupInput } from "./types";

export function normalizeEmail(value: unknown) { return String(value || "").trim().toLowerCase(); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
export function validPassword(value: string) { return value.length >= 10 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value); }
export function clean(value: unknown, max = 160) { return String(value || "").trim().replace(/\s+/g, " ").slice(0, max); }

export function parseSignup(body: Record<string, unknown>): HospitalSignupInput | null {
  const input = {
    hospitalName: clean(body.hospitalName), hospitalType: clean(body.hospitalType, 50), licenseNumber: clean(body.licenseNumber, 80).toUpperCase(),
    registrationAuthority: clean(body.registrationAuthority, 100), officialEmail: normalizeEmail(body.officialEmail), phone: clean(body.phone, 30),
    address: clean(body.address, 240), city: clean(body.city, 80), adminName: clean(body.adminName, 120), adminTitle: clean(body.adminTitle, 100), password: String(body.password || ""),
  };
  if (!input.hospitalName || !input.hospitalType || !input.licenseNumber || !input.registrationAuthority || !validEmail(input.officialEmail) || !input.phone || !input.address || !input.city || !input.adminName || !input.adminTitle || !validPassword(input.password)) return null;
  return input;
}

