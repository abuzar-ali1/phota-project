import { redirect } from "next/navigation";
import { PublicDashboard } from "@/components/PublicDashboard";
import { getCurrentPublicUser } from "@/lib/public-auth";
import { listDonorListings,listPublicMatches } from "@/lib/public-db";
import { emailVerificationIsCurrent } from "@/lib/verification";
export const dynamic="force-dynamic";
export default async function PublicDashboardPage(){const user=await getCurrentPublicUser();if(!user)redirect("/public/login");if(user.status==="blocked")redirect("/public/blocked");if(!emailVerificationIsCurrent(user.emailVerifiedAt))redirect("/public/verify-email");const[listings,matches]=await Promise.all([listDonorListings(user.id),listPublicMatches(user.id)]);return <PublicDashboard user={user} initialListings={listings} initialMatches={matches}/>}
