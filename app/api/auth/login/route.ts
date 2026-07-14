import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSessionToken, hospitalDestination, SESSION_COOKIE, sessionCookieOptions, validRequestOrigin } from "@/lib/auth";
import { getHospitalByEmail, recordFailedLogin, recordSuccessfulLogin } from "@/lib/db";
import { normalizeEmail, validEmail } from "@/lib/auth-validation";
import { emailVerificationIsCurrent, issueEmailVerification } from "@/lib/verification";
import { requestIpHash, securityFingerprint } from "@/lib/security";
import { reserveSecurityRequest } from "@/lib/abuse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const body = await request.json(); const email = normalizeEmail(body.email); const password = String(body.password || "");
    if (!validEmail(email) || !password) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const ipHash=requestIpHash(request);
    if(!await reserveSecurityRequest("login","hospital",securityFingerprint(email),ipHash))return NextResponse.json({error:"Too many sign-in attempts. Try again later."},{status:429});
    const hospital = await getHospitalByEmail(email);
    if (!hospital) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    if (!(await compare(password, hospital.passwordHash))) { await recordFailedLogin(hospital.id); return NextResponse.json({ error: "Invalid email or password." }, { status: 401 }); }
    await recordSuccessfulLogin(hospital.id);
    let emailWarning:string|null=null;if(!emailVerificationIsCurrent(hospital.emailVerifiedAt)){try{await issueEmailVerification("hospital",hospital.id,hospital.officialEmail,hospital.adminName,ipHash);}catch(error){emailWarning=error instanceof Error?error.message:"Request a verification code on the next page.";}}
    const response = NextResponse.json({ hospital: { id:hospital.id,hospitalName:hospital.hospitalName,role:hospital.role,verificationStatus:hospital.verificationStatus }, redirectTo:hospitalDestination(hospital),emailWarning });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(hospital, hospital.tokenVersion), sessionCookieOptions);
    return response;
  } catch (error) { console.error("Hospital login failed", error); return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 500 }); }
}
