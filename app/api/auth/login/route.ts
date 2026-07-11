import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, validRequestOrigin } from "@/lib/auth";
import { getHospitalByEmail, recordFailedLogin, recordSuccessfulLogin } from "@/lib/db";
import { normalizeEmail, validEmail } from "@/lib/auth-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json(); const email = normalizeEmail(body.email); const password = String(body.password || "");
    if (!validEmail(email) || !password) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const hospital = await getHospitalByEmail(email);
    if (!hospital) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    if (hospital.lockedUntil && new Date(hospital.lockedUntil) > new Date()) return NextResponse.json({ error: "Account temporarily locked after repeated failed attempts. Try again in 15 minutes." }, { status: 423 });
    if (!(await compare(password, hospital.passwordHash))) { await recordFailedLogin(hospital.id); return NextResponse.json({ error: "Invalid email or password." }, { status: 401 }); }
    await recordSuccessfulLogin(hospital.id);
    const response = NextResponse.json({ hospital: { id:hospital.id,hospitalName:hospital.hospitalName,role:hospital.role,verificationStatus:hospital.verificationStatus }, redirectTo: hospital.role === "admin" ? "/admin/hospitals" : hospital.verificationStatus === "verified" ? "/workspace" : "/pending" });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(hospital, hospital.tokenVersion), sessionCookieOptions);
    return response;
  } catch (error) { console.error("Hospital login failed", error); return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 500 }); }
}

