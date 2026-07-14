import { NextResponse } from "next/server";
import { validRequestOrigin } from "@/lib/auth";
import { PUBLIC_SESSION_COOKIE } from "@/lib/public-auth";
export async function POST(request:Request){if(!validRequestOrigin(request))return NextResponse.json({error:"Invalid request origin."},{status:403});const response=NextResponse.json({ok:true});response.cookies.set(PUBLIC_SESSION_COOKIE,"",{httpOnly:true,path:"/",maxAge:0,sameSite:"lax",secure:process.env.NODE_ENV==="production"});return response;}
