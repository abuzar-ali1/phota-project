import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { EmailVerificationForm } from "@/components/EmailVerificationForm";
import { LogoutButton } from "@/components/LogoutButton";
import { VerificationEmailCorrection } from "@/components/VerificationEmailCorrection";
import { getCurrentHospital, hospitalDestination } from "@/lib/auth";
import { emailVerificationIsCurrent } from "@/lib/verification";

export const dynamic="force-dynamic";

export default async function HospitalVerifyEmailPage(){
  const hospital=await getCurrentHospital();
  if(!hospital)redirect("/login");
  if(emailVerificationIsCurrent(hospital.emailVerifiedAt))redirect(hospitalDestination(hospital));
  return <AuthShell eyebrow="Mandatory email security" title="Verify the official hospital email" description="Enter the one-time code sent to the authorized hospital email. This verification must be renewed every seven days.">
    <EmailVerificationForm accountType="hospital" email={hospital.officialEmail}/>
    {!hospital.emailVerifiedAt&&hospital.role==="hospital"&&hospital.verificationStatus==="pending"&&<VerificationEmailCorrection accountType="hospital" currentEmail={hospital.officialEmail}/>}
    <p className="mt-4 text-center text-xs leading-5 text-slate-400">No code? Use “Send a new code” to see any delivery or configuration problem immediately.</p>
    <LogoutButton className="secondary-btn mt-4 w-full"/>
  </AuthShell>;
}
