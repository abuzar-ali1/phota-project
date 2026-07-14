import {NextResponse} from "next/server";
import {getCurrentHospital,validRequestOrigin} from "@/lib/auth";
import {normalizeEmail,validEmail} from "@/lib/auth-validation";
import {updatePendingHospitalEmail} from "@/lib/db";
import {getCurrentPublicUser} from "@/lib/public-auth";
import {updateNewPublicUserEmail} from "@/lib/public-db";
import {requestIpHash} from "@/lib/security";
import {issueEmailVerification} from "@/lib/verification";

export const runtime="nodejs";
export async function PATCH(request:Request){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  try{
    const parsed=await request.json().catch(()=>null);
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return NextResponse.json({error:"Enter a valid email address."},{status:400});
    const body=parsed as Record<string,unknown>;const email=normalizeEmail(body.email);const accountType=body.accountType==="public"?"public":"hospital";
    if(!validEmail(email))return NextResponse.json({error:"Enter a valid email address."},{status:400});
    if(accountType==="public"){
      const current=await getCurrentPublicUser();if(!current)return NextResponse.json({error:"Authentication required."},{status:401});
      const user=await updateNewPublicUserEmail(current.id,email);if(!user)return NextResponse.json({error:"Email correction is available only before a new account is verified or used."},{status:403});
      let deliveryWarning:string|null=null;try{await issueEmailVerification("public",user.id,user.email,user.name,requestIpHash(request));}catch(error){deliveryWarning=error instanceof Error?error.message:"Verification email could not be delivered.";}
      return NextResponse.json({email:user.email,deliveryWarning});
    }
    const current=await getCurrentHospital();if(!current)return NextResponse.json({error:"Authentication required."},{status:401});
    const hospital=await updatePendingHospitalEmail(current.id,email);if(!hospital)return NextResponse.json({error:"Email correction is available only for a new pending hospital application."},{status:403});
    let deliveryWarning:string|null=null;try{await issueEmailVerification("hospital",hospital.id,hospital.officialEmail,hospital.adminName,requestIpHash(request));}catch(error){deliveryWarning=error instanceof Error?error.message:"Verification email could not be delivered.";}
    return NextResponse.json({email:hospital.officialEmail,deliveryWarning});
  }catch(error){if((error as{code?:string}).code==="23505")return NextResponse.json({error:"That email is already registered."},{status:409});console.error("Verification email correction failed",error);return NextResponse.json({error:"Email could not be updated."},{status:500});}
}
