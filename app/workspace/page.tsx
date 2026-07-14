import { redirect } from "next/navigation";
import { PhotaApp } from "@/components/PhotaApp";
import { getCurrentHospital } from "@/lib/auth";
import { emailVerificationIsCurrent } from "@/lib/verification";
export const dynamic="force-dynamic";
export default async function WorkspacePage(){const hospital=await getCurrentHospital();if(!hospital)redirect("/login");if(!emailVerificationIsCurrent(hospital.emailVerifiedAt))redirect("/verify-email");if(hospital.role==="admin")redirect("/admin/hospitals");if(hospital.verificationStatus!=="verified")redirect("/pending");return <PhotaApp hospital={hospital}/>}
