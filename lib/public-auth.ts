import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getPublicUserById } from "./public-db";
import { emailVerificationIsCurrent } from "./verification";
import type { PublicUserProfile } from "./types";

export const PUBLIC_SESSION_COOKIE="phota_public_session";
const SESSION_SECONDS=60*60*8;

function secret(){const value=process.env.JWT_SECRET;if(!value||value.length<32)throw new Error("JWT_SECRET must contain at least 32 characters.");return new TextEncoder().encode(value);}

export async function createPublicSessionToken(user:PublicUserProfile,tokenVersion:number){return new SignJWT({accountType:"public",version:tokenVersion}).setProtectedHeader({alg:"HS256",typ:"JWT"}).setSubject(user.id).setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).setIssuer("phota-public-network").setAudience("phota-web").sign(secret());}

export const publicSessionCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:SESSION_SECONDS,priority:"high" as const};

export async function readPublicSessionToken(token?:string){try{const value=token||(await cookies()).get(PUBLIC_SESSION_COOKIE)?.value;if(!value)return null;const{payload}=await jwtVerify(value,secret(),{issuer:"phota-public-network",audience:"phota-web",algorithms:["HS256"]});if(!payload.sub||typeof payload.version!=="number")return null;return{userId:payload.sub,tokenVersion:payload.version};}catch{return null;}}

export async function getCurrentPublicUser():Promise<PublicUserProfile|null>{const session=await readPublicSessionToken();if(!session)return null;const user=await getPublicUserById(session.userId);if(!user||user.tokenVersion!==session.tokenVersion)return null;const{passwordHash:_password,failedLoginAttempts:_attempts,lockedUntil:_locked,tokenVersion:_version,...profile}=user;void _password;void _attempts;void _locked;void _version;return profile;}

export async function requirePublicUser(){const user=await getCurrentPublicUser();if(!user)return{error:"Authentication required.",status:401 as const,user:null};if(user.status==="blocked")return{error:user.blockedReason||"This account is blocked.",status:423 as const,user:null};return{error:null,status:200 as const,user};}

export async function requireVerifiedPublicUser(){const auth=await requirePublicUser();if(!auth.user)return auth;if(!emailVerificationIsCurrent(auth.user.emailVerifiedAt))return{error:"Email re-verification is required.",status:428 as const,user:null};return auth;}

export function publicDestination(user:PublicUserProfile){if(user.status==="blocked")return"/public/blocked";return emailVerificationIsCurrent(user.emailVerifiedAt)?"/public/dashboard":"/public/verify-email";}
