import { redirect } from "next/navigation";
import { PublicAuthShell } from "@/components/PublicAuthShell";
import { PublicSignupForm } from "@/components/PublicSignupForm";
import { getCurrentPublicUser, publicDestination } from "@/lib/public-auth";
export const dynamic="force-dynamic";
export default async function PublicSignupPage(){const user=await getCurrentPublicUser();if(user)redirect(publicDestination(user));return <PublicAuthShell eyebrow="Public registration" title="Create your protected account" description="Register as an individual patient or donor. Your required profile details stay protected and email ownership is verified before access."><PublicSignupForm/></PublicAuthShell>}
