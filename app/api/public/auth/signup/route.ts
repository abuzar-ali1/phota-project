import {hash} from "bcryptjs";
import {NextResponse} from "next/server";
import {reserveSecurityRequest} from "@/lib/abuse";
import {validRequestOrigin} from "@/lib/auth";
import {parsePublicSignup} from "@/lib/auth-validation";
import {createPublicSessionToken,PUBLIC_SESSION_COOKIE,publicSessionCookieOptions} from "@/lib/public-auth";
import {createPublicUser} from "@/lib/public-db";
import {requestIpHash,securityFingerprint} from "@/lib/security";
import {issueEmailVerification} from "@/lib/verification";

export const runtime="nodejs";
export async function POST(request:Request){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  try{
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Please provide valid registration details."},{status:400});
    const input=parsePublicSignup(body as Record<string,unknown>);
    if(!input)return NextResponse.json({error:"Enter a valid name, age, 11-digit phone, email, and strong password."},{status:400});
    const ipHash=requestIpHash(request);
    if(!await reserveSecurityRequest("signup","public",securityFingerprint(input.email),ipHash))return NextResponse.json({error:"Too many registration attempts. Try again later."},{status:429});
    const user=await createPublicUser(input,await hash(input.password,12));
    let emailWarning:string|null=null;
    try{await issueEmailVerification("public",user.id,user.email,user.name,ipHash);}catch(error){emailWarning=error instanceof Error?error.message:"Verification email delivery is temporarily unavailable.";}
    const response=NextResponse.json({redirectTo:"/public/verify-email",emailWarning},{status:201});
    response.cookies.set(PUBLIC_SESSION_COOKIE,await createPublicSessionToken(user,user.tokenVersion),publicSessionCookieOptions);
    return response;
  }catch(error){
    const code=(error as{code?:string}).code;
    if(code==="23505")return NextResponse.json({error:"This email or phone number is already registered."},{status:409});
    console.error("Public signup failed",error);return NextResponse.json({error:"Registration is temporarily unavailable."},{status:500});
  }
}
