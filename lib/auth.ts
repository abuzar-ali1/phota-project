import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getHospitalById } from "./db";
import { emailVerificationIsCurrent } from "./verification";
import type { HospitalProfile } from "./types";

export const SESSION_COOKIE = "phota_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(hospital: HospitalProfile, tokenVersion: number) {
  return new SignJWT({ role: hospital.role, status: hospital.verificationStatus, version: tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }).setSubject(hospital.id).setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).setIssuer("phota-hospital-network").setAudience("phota-web").sign(secret());
}

export const sessionCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS, priority: "high" as const };

export async function readSessionToken(token?: string) {
  try {
    const value = token || (await cookies()).get(SESSION_COOKIE)?.value;
    if (!value) return null;
    const { payload } = await jwtVerify(value, secret(), { issuer: "phota-hospital-network", audience: "phota-web", algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.version !== "number") return null;
    return { hospitalId: payload.sub, tokenVersion: payload.version };
  } catch { return null; }
}

export async function getCurrentHospital(): Promise<HospitalProfile | null> {
  const session = await readSessionToken();
  if (!session) return null;
  const hospital = await getHospitalById(session.hospitalId);
  if (!hospital || hospital.tokenVersion !== session.tokenVersion) return null;
  const { passwordHash: _passwordHash, failedLoginAttempts: _attempts, lockedUntil: _locked, tokenVersion: _version, ...profile } = hospital;
  void _passwordHash; void _attempts; void _locked; void _version;
  return profile;
}

export async function requireVerifiedHospital() {
  const hospital = await getCurrentHospital();
  if (!hospital) return { error: "Authentication required.", status: 401 as const, hospital: null };
  if (!emailVerificationIsCurrent(hospital.emailVerifiedAt)) return { error: "Email re-verification is required.", status: 428 as const, hospital: null };
  if (hospital.role !== "admin" && hospital.verificationStatus !== "verified") return { error: "Hospital verification is required.", status: 403 as const, hospital: null };
  return { error: null, status: 200 as const, hospital };
}

export async function requireAdmin() {
  const hospital = await getCurrentHospital();
  if (!hospital) return { error: "Authentication required.", status: 401 as const, hospital: null };
  if (!emailVerificationIsCurrent(hospital.emailVerifiedAt)) return { error: "Email re-verification is required.", status: 428 as const, hospital: null };
  if (hospital.role !== "admin") return { error: "Administrator access required.", status: 403 as const, hospital: null };
  return { error: null, status: 200 as const, hospital };
}

export function hospitalDestination(hospital: HospitalProfile) {
  if (!emailVerificationIsCurrent(hospital.emailVerifiedAt)) return "/verify-email";
  if (hospital.role === "admin") return "/admin/hospitals";
  return hospital.verificationStatus === "verified" ? "/workspace" : "/pending";
}

export function validRequestOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}
