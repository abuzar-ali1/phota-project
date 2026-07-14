import { redirect } from "next/navigation";
import { PublicAuthShell } from "@/components/PublicAuthShell";
import { PublicLoginForm } from "@/components/PublicLoginForm";
import { getCurrentPublicUser, publicDestination } from "@/lib/public-auth";
export const dynamic="force-dynamic";
export default async function PublicLoginPage(){const user=await getCurrentPublicUser();if(user)redirect(publicDestination(user));return <PublicAuthShell eyebrow="Protected public access" title="Sign in to the public portal" description="Access nearby medical availability, donor tools, match messages, and your verification status."><PublicLoginForm/></PublicAuthShell>}
