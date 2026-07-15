import { NextResponse } from "next/server";
import { requireAdmin,validRequestOrigin } from "@/lib/auth";
import { deletePublicUser, unblockPublicUser } from "@/lib/public-db";
import { validUuid } from "@/lib/security";

export async function PATCH(request:Request,context:RouteContext<"/api/admin/public-users/[id]">){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const auth=await requireAdmin();
  if(!auth.hospital)return NextResponse.json({error:auth.error},{status:auth.status});
  const{id}=await context.params;
  if(!validUuid(id))return NextResponse.json({error:"Invalid user ID."},{status:400});
  const parsed=await request.json().catch(()=>null);
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||(parsed as Record<string,unknown>).action!=="unblock")return NextResponse.json({error:"Invalid review action."},{status:400});
  const user=await unblockPublicUser(id);
  if(!user)return NextResponse.json({error:"Blocked public account not found."},{status:404});
  return NextResponse.json({user});
}

export async function DELETE(request:Request,context:RouteContext<"/api/admin/public-users/[id]">){
  if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});
  const auth=await requireAdmin();
  if(!auth.hospital)return NextResponse.json({error:auth.error},{status:auth.status});
  const{id}=await context.params;
  if(!validUuid(id))return NextResponse.json({error:"Invalid user ID."},{status:400});
  if(!await deletePublicUser(id))return NextResponse.json({error:"Public account not found."},{status:404});
  return NextResponse.json({deleted:true});
}
