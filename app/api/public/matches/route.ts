import { NextResponse } from "next/server";
import { requireVerifiedPublicUser } from "@/lib/public-auth";
import { listPublicMatches } from "@/lib/public-db";
export const runtime="nodejs";
export async function GET(){try{const auth=await requireVerifiedPublicUser();if(!auth.user)return NextResponse.json({error:auth.error},{status:auth.status});return NextResponse.json({matches:await listPublicMatches(auth.user.id)});}catch(error){console.error("Unable to load public matches",error);return NextResponse.json({error:"Matches could not be loaded."},{status:500});}}
