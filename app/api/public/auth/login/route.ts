import {compare} from "bcryptjs";
import {NextResponse} from "next/server";
import {reserveSecurityRequest} from "@/lib/abuse";
import {validRequestOrigin} from "@/lib/auth";
import {normalizeEmail,validEmail} from "@/lib/auth-validation";
import {createPublicSessionToken,PUBLIC_SESSION_COOKIE,publicDestination,publicSessionCookieOptions} from "@/lib/public-auth";
import {getPublicUserByEmail,recordPublicFailedLogin,recordPublicSuccessfulLogin} from "@/lib/public-db";
import {requestIpHash,securityFingerprint} from "@/lib/security";
import {emailVerificationIsCurrent,issueEmailVerification} from "@/lib/verification";

export const runtime="nodejs";
export async function POST(request:Request){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  try{
    const parsed=await request.json().catch(()=>null);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return NextResponse.json({error:"Invalid email or password."},{status:401});
    const body=parsed as Record<string,unknown>;const email=normalizeEmail(body.email);const password=String(body.password||"");
    if(!validEmail(email)||!password)return NextResponse.json({error:"Invalid email or password."},{status:401});
    const ipHash=requestIpHash(request);
    if(!await reserveSecurityRequest("login","public",securityFingerprint(email),ipHash))return NextResponse.json({error:"Too many sign-in attempts. Try again later."},{status:429});
    const user=await getPublicUserByEmail(email);
    if(!user||!(await compare(password,user.passwordHash))){if(user)await recordPublicFailedLogin(user.id);return NextResponse.json({error:"Invalid email or password."},{status:401});}
    await recordPublicSuccessfulLogin(user.id);
    let emailWarning:string|null=null;
    if(user.status!=="blocked"&&!emailVerificationIsCurrent(user.emailVerifiedAt)){try{await issueEmailVerification("public",user.id,user.email,user.name,ipHash);}catch(error){emailWarning=error instanceof Error?error.message:"Request a verification code on the next page.";}}
    const response=NextResponse.json({redirectTo:publicDestination(user),emailWarning});
    response.cookies.set(PUBLIC_SESSION_COOKIE,await createPublicSessionToken(user,user.tokenVersion),publicSessionCookieOptions);
    return response;
  }catch(error){console.error("Public login failed",error);return NextResponse.json({error:"Sign in is temporarily unavailable."},{status:500});}
}
