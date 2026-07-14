import { NextResponse } from "next/server";
import { getCurrentHospital, validRequestOrigin } from "@/lib/auth";
import { getCurrentPublicUser } from "@/lib/public-auth";
import { issueEmailVerification } from "@/lib/verification";
import { requestIpHash } from "@/lib/security";

export const runtime="nodejs";
export async function POST(request:Request){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  try{
    const body=await request.json().catch(()=>({}));
    const ipHash=requestIpHash(request);
    if(body.accountType==="public"){
      const user=await getCurrentPublicUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
      await issueEmailVerification("public",user.id,user.email,user.name,ipHash);
    }else{
      const hospital=await getCurrentHospital();if(!hospital)return NextResponse.json({error:"Authentication required."},{status:401});
      await issueEmailVerification("hospital",hospital.id,hospital.officialEmail,hospital.adminName,ipHash);
    }
    return NextResponse.json({message:"A six-digit code was sent to your email."});
  }catch(error){const message=error instanceof Error?error.message:"Unable to send a verification code.";const status=/wait|too many/i.test(message)?429:503;return NextResponse.json({error:message},{status});}
}
