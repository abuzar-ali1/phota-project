import { NextResponse } from "next/server";
import { validRequestOrigin } from "@/lib/auth";
import { requireVerifiedPublicUser } from "@/lib/public-auth";
import { completeBloodDonation } from "@/lib/public-db";
import { validUuid } from "@/lib/security";

export const runtime="nodejs";
export async function POST(request:Request,context:RouteContext<"/api/public/matches/[id]/donation">){if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});try{const auth=await requireVerifiedPublicUser();if(!auth.user)return NextResponse.json({error:auth.error},{status:auth.status});const{id}=await context.params;if(!validUuid(id))return NextResponse.json({error:"Invalid match ID."},{status:400});const cooldownUntil=await completeBloodDonation(id,auth.user.id);if(!cooldownUntil)return NextResponse.json({error:"Only the matched blood donor can complete this donation."},{status:403});return NextResponse.json({completed:true,cooldownUntil});}catch(error){console.error("Unable to complete donation",error);return NextResponse.json({error:"Donation completion could not be recorded."},{status:500});}}
