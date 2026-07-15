import { redirect } from "next/navigation";
import { PublicMatchContact } from "@/components/PublicMatchContact";
import { getCurrentPublicUser } from "@/lib/public-auth";
import { getPublicMatch } from "@/lib/public-db";
import { emailVerificationIsCurrent } from "@/lib/verification";
export const dynamic="force-dynamic";
export default async function PublicMatchPage({params}:{params:Promise<{id:string}>}){const user=await getCurrentPublicUser();if(!user)redirect("/public/login");if(user.status==="blocked")redirect("/public/blocked");if(!emailVerificationIsCurrent(user.emailVerifiedAt))redirect("/public/verify-email");const{id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))redirect("/public/dashboard");const match=await getPublicMatch(user.id,id);if(!match)redirect("/public/dashboard");return <PublicMatchContact matchId={id} initialMatch={match}/>}
