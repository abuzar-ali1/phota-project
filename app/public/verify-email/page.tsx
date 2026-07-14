import { redirect } from "next/navigation";
import { EmailVerificationForm } from "@/components/EmailVerificationForm";
import { PublicAuthShell } from "@/components/PublicAuthShell";
import { PublicLogoutButton } from "@/components/PublicLogoutButton";
import { VerificationEmailCorrection } from "@/components/VerificationEmailCorrection";
import { getCurrentPublicUser, publicDestination } from "@/lib/public-auth";
import { emailVerificationIsCurrent } from "@/lib/verification";

export const dynamic="force-dynamic";

export default async function PublicVerifyEmailPage(){
  const user=await getCurrentPublicUser();
  if(!user)redirect("/public/login");
  if(user.status==="blocked")redirect("/public/blocked");
  if(emailVerificationIsCurrent(user.emailVerifiedAt))redirect(publicDestination(user));
  return <PublicAuthShell eyebrow="Required security renewal" title="Verify your email" description="Email verification protects medical searches and conversations. It must be renewed every seven days.">
    <EmailVerificationForm accountType="public" email={user.email}/>
    {!user.emailVerifiedAt&&<VerificationEmailCorrection accountType="public" currentEmail={user.email}/>}
    <p className="mt-4 text-center text-xs leading-5 text-slate-400">No code? Use “Send a new code” to see any delivery or configuration problem immediately.</p>
    <PublicLogoutButton className="secondary-btn mt-4 w-full"/>
  </PublicAuthShell>;
}
