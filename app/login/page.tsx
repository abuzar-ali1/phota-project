import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentHospital, hospitalDestination } from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function LoginPage(){const hospital=await getCurrentHospital();if(hospital)redirect(hospitalDestination(hospital));return <AuthShell eyebrow="Authorized access" title="Hospital sign in" description="Sign in with your hospital's approved administrator account to access protected donor, recipient, and routing records."><LoginForm/></AuthShell>}
