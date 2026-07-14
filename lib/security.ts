import "server-only";
import { createHmac } from "node:crypto";

function securitySecret(){const value=process.env.RATE_LIMIT_PEPPER||(process.env.NODE_ENV!=="production"?(process.env.OTP_PEPPER||process.env.JWT_SECRET):undefined);if(!value||value.length<32)throw new Error("RATE_LIMIT_PEPPER must contain at least 32 characters.");return value;}

export function requestIpHash(request:Request){const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();const ip=request.headers.get("cf-connecting-ip")||forwarded||request.headers.get("x-real-ip")||"unknown";return createHmac("sha256",securitySecret()).update(ip).digest("hex");}

export function securityFingerprint(value:string){return createHmac("sha256",securitySecret()).update(value).digest("hex");}

export function validUuid(value:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
