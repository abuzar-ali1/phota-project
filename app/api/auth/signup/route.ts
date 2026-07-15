import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createHospital, getHospitalByEmail } from "@/lib/db";
import { normalizeHospitalLicense, parseSignup, validHospitalLicense } from "@/lib/auth-validation";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, validRequestOrigin } from "@/lib/auth";
import { issueEmailVerification } from "@/lib/verification";
import { requestIpHash, securityFingerprint } from "@/lib/security";
import { reserveSecurityRequest } from "@/lib/abuse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Please provide valid hospital details." }, { status: 400 });
    const raw = body as Record<string, unknown>;
    if (!validHospitalLicense(normalizeHospitalLicense(raw.licenseNumber))) {
      return NextResponse.json({ error: "License number must be 5–40 characters and may use letters, numbers, /, &, . and -." }, { status: 400 });
    }
    const input = parseSignup(raw);
    if (!input) return NextResponse.json({ error: "Please provide valid hospital details and a strong password." }, { status: 400 });
    const ipHash=requestIpHash(request);
    if(!await reserveSecurityRequest("signup","hospital",securityFingerprint(input.officialEmail),ipHash))return NextResponse.json({error:"Too many registration attempts. Try again later."},{status:429});
    // Administrator identities are never provisioned through this public endpoint.
    const role = "hospital" as const;
    const hospital = await createHospital(input, await hash(input.password, 12), role);
    const authHospital=await getHospitalByEmail(input.officialEmail); if(!authHospital)throw new Error("Hospital account could not be loaded.");
    let emailWarning:string|null=null;try{await issueEmailVerification("hospital",hospital.id,hospital.officialEmail,hospital.adminName,ipHash);}catch(error){emailWarning=error instanceof Error?error.message:"Verification email delivery is temporarily unavailable.";}
    const response=NextResponse.json({hospital,message:"Hospital application created. Verify the official email to continue.",redirectTo:"/verify-email",emailWarning},{status:201});
    response.cookies.set(SESSION_COOKIE,await createSessionToken(authHospital,authHospital.tokenVersion),sessionCookieOptions);return response;
  } catch (error) {
    const code = (error as { code?: string }).code;
    const detail = String((error as { detail?: string }).detail || "");
    if (code === "23505") return NextResponse.json({ error: detail.includes("license") ? "This hospital license is already registered." : "This official email is already registered." }, { status: 409 });
    console.error("Hospital signup failed", error);
    return NextResponse.json({ error: "The hospital application could not be submitted." }, { status: 500 });
  }
}
