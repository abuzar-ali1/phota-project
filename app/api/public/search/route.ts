import { NextResponse } from "next/server";
import { validRequestOrigin } from "@/lib/auth";
import { canonicalArea,coordinatesForArea,distanceKm,parseCoordinate,validCoordinates } from "@/lib/geo";
import { isBloodCompatible,isOrganBloodCompatible } from "@/lib/matching";
import { getOrganRule,validateAge,validateBloodQuantity } from "@/lib/medical-rules";
import { requireVerifiedPublicUser } from "@/lib/public-auth";
import { createOrGetMatch,loadSearchCandidates,recordSearchAttempt,updatePublicLocation } from "@/lib/public-db";
import { requestIpHash,securityFingerprint } from "@/lib/security";
import type { PortalMode,PublicSearchResult } from "@/lib/types";

const bloodGroups=new Set(["O-","O+","A-","A+","B-","B+","AB-","AB+"]);
export const runtime="nodejs";

export async function POST(request:Request){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  try{
    const auth=await requireVerifiedPublicUser();
    if(!auth.user)return NextResponse.json({error:auth.error},{status:auth.status});
    const body=await request.json().catch(()=>null);
    if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Enter valid search criteria."},{status:400});
    const input=body as Record<string,unknown>;
    const mode:PortalMode|null=input.mode==="organ"?"organ":input.mode==="blood"?"blood":null;
    const bloodGroup=String(input.bloodGroup||"");
    const organ=mode==="organ"?String(input.organ||""):null;
    const quantity=mode==="blood"?Number(input.quantity):null;
    const rawArea=String(input.area||auth.user.area||"").trim().slice(0,100);
    let latitude=parseCoordinate(input.latitude);let longitude=parseCoordinate(input.longitude);
    if(!mode||!bloodGroups.has(bloodGroup))return NextResponse.json({error:"Select blood or organ and a valid blood group."},{status:400});
    const organRule=mode==="organ"?getOrganRule(organ):null;
    if(mode==="organ"&&!organRule)return NextResponse.json({error:"Select a supported organ."},{status:400});
    const ageError=validateAge(mode,"patient",organ,auth.user.age);
    if(ageError)return NextResponse.json({error:ageError},{status:400});
    if(mode==="blood"){
      const error=validateBloodQuantity(quantity!);
      if(error)return NextResponse.json({error},{status:400});
    }
    let area=canonicalArea(rawArea)||"Current location";
    if(!validCoordinates(latitude,longitude)){
      const fallback=coordinatesForArea(rawArea);
      if(!fallback)return NextResponse.json({error:"Share your location or enter a supported Punjab city."},{status:400});
      latitude=fallback.latitude;longitude=fallback.longitude;area=canonicalArea(rawArea)||rawArea;
    }
    const fingerprint=securityFingerprint(JSON.stringify({mode,bloodGroup,organ,quantity,lat:latitude.toFixed(2),lng:longitude.toFixed(2)}));
    const security=await recordSearchAttempt(auth.user.id,fingerprint,requestIpHash(request));
    if(security.blocked)return NextResponse.json({error:security.reason,blocked:true},{status:423});
    if(security.throttled)return NextResponse.json({error:"This network is sending too many searches. Wait a few minutes and try again."},{status:429});
    await updatePublicLocation(auth.user.id,area,latitude,longitude);
    const origin={latitude,longitude};
    const candidates=(await loadSearchCandidates(mode,organ,organRule?.donor.max??120))
      .filter((candidate)=>candidate.donorUserId!==auth.user!.id)
      .filter((candidate)=>mode==="blood"?isBloodCompatible(candidate.bloodGroup,bloodGroup):isOrganBloodCompatible(candidate.bloodGroup,bloodGroup,organ))
      .filter((candidate)=>mode==="organ"||((candidate.quantity??0)>=(quantity??1)))
      .map((candidate)=>{const target=candidate.latitude!=null&&candidate.longitude!=null?{latitude:candidate.latitude,longitude:candidate.longitude}:coordinatesForArea(candidate.city||candidate.area);return target?{candidate,distance:distanceKm(origin,target)}:null;})
      .filter((value):value is NonNullable<typeof value>=>Boolean(value)).sort((a,b)=>a.distance-b.distance).slice(0,20);
    const results:PublicSearchResult[]=candidates.map(({candidate,distance},index)=>({
      sourceType:candidate.sourceType,sourceId:String(index),label:candidate.label,hospitalName:candidate.hospitalName,
      mode:candidate.mode,bloodGroup:candidate.bloodGroup,organ:candidate.organ,quantity:candidate.quantity,
      area:candidate.sourceType==="public"?"Nearby verified area":candidate.city||candidate.area,
      distanceKm:Math.max(5,Math.ceil(distance/5)*5),
    }));
    let matchId:string|null=null;
    if(candidates[0]){
      const nearest=candidates[0];
      const protectedDistance=nearest.candidate.sourceType==="public"?Math.max(5,Math.ceil(nearest.distance/5)*5):Number(nearest.distance.toFixed(1));
      matchId=await createOrGetMatch(auth.user.id,nearest.candidate,bloodGroup,organ,quantity,protectedDistance,organRule?.donor.max??120);
    }
    return NextResponse.json({results,matchId,location:{area,latitude,longitude}});
  }catch(error){
    console.error("Public medical search failed",error);
    return NextResponse.json({error:"Search is temporarily unavailable."},{status:500});
  }
}
