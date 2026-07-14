import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { database, ensureSchema } from "./db";
import { sendOtpEmail } from "./email";

export type VerificationAccountType = "hospital" | "public";
export const EMAIL_VERIFICATION_DAYS = 7;

function pepper() {
  const value = process.env.OTP_PEPPER || (process.env.NODE_ENV !== "production" ? process.env.JWT_SECRET : undefined);
  if (!value || value.length < 32) throw new Error("OTP_PEPPER or JWT_SECRET must contain at least 32 characters.");
  return value;
}

function digest(accountType: VerificationAccountType, accountId: string, code: string) {
  return createHmac("sha256", pepper()).update(`${accountType}:${accountId}:${code}`).digest("hex");
}

export function emailVerificationIsCurrent(verifiedAt: string | null | undefined) {
  if (!verifiedAt) return false;
  return Date.now() - new Date(verifiedAt).getTime() < EMAIL_VERIFICATION_DAYS * 24 * 60 * 60 * 1000;
}

export async function issueEmailVerification(accountType: VerificationAccountType, accountId: string, email: string, name: string, ipHash: string) {
  await ensureSchema(); const sql = database();
  const code = String(randomInt(100000, 1000000));
  const[,,rows]=await sql.transaction((transaction)=>[
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:otp-account:${accountType}:${accountId}`},0::bigint))`,
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:otp-ip:${ipHash}`},0::bigint))`,
    transaction`WITH limits AS (
      SELECT COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '1 hour')::int AS hourly,
        COUNT(*) FILTER (WHERE created_at>NOW()-INTERVAL '60 seconds')::int AS recent
      FROM email_verification_codes WHERE (account_type=${accountType} AND account_id=${accountId}) OR ip_hash=${ipHash}
    ), invalidated AS (
      UPDATE email_verification_codes SET consumed_at=NOW() WHERE account_type=${accountType} AND account_id=${accountId}
        AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM limits WHERE recent=0 AND hourly<5) RETURNING id
    ), inserted AS (
      INSERT INTO email_verification_codes (account_type,account_id,code_hash,ip_hash,expires_at)
      SELECT ${accountType},${accountId},${digest(accountType,accountId,code)},${ipHash},NOW()+INTERVAL '10 minutes'
      FROM limits CROSS JOIN (SELECT COUNT(*) FROM invalidated) dependency WHERE recent=0 AND hourly<5
      ON CONFLICT DO NOTHING RETURNING id
    ) SELECT hourly,recent,(SELECT id::text FROM inserted LIMIT 1) AS verification_id FROM limits`,
  ]);
  const result=rows[0] as Record<string,unknown>;const verificationId=result.verification_id?String(result.verification_id):null;
  if(!verificationId){if(Number(result.recent)>0)throw new Error("Please wait one minute before requesting another code.");throw new Error("Too many verification codes requested. Try again in one hour.");}
  try{return await sendOtpEmail(email,name,code);}catch(error){await sql`UPDATE email_verification_codes SET consumed_at=NOW() WHERE id=${verificationId} AND consumed_at IS NULL`;throw error;}
}

export async function verifyEmailCode(accountType: VerificationAccountType, accountId: string, code: string) {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the six-digit verification code." } as const;
  await ensureSchema(); const sql = database();
  const codes = await sql`UPDATE email_verification_codes SET attempts=attempts+1 WHERE id=(
      SELECT id FROM email_verification_codes WHERE account_type=${accountType} AND account_id=${accountId}
        AND consumed_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY created_at DESC LIMIT 1
    ) AND attempts<5 RETURNING *`;
  if (!codes[0]) return { ok:false,error:"This code has expired. Request a new verification code." } as const;
  const record=codes[0] as Record<string,unknown>; const expected=Buffer.from(String(record.code_hash),"hex"); const received=Buffer.from(digest(accountType,accountId,code),"hex");
  if (expected.length!==received.length || !timingSafeEqual(expected,received)) {
    return { ok:false,error:"The verification code is incorrect." } as const;
  }
  const updated=accountType==="hospital"
    ? await sql`WITH consumed AS (UPDATE email_verification_codes SET consumed_at=NOW() WHERE id=${String(record.id)} AND consumed_at IS NULL AND expires_at>NOW() RETURNING id) UPDATE hospitals SET email_verified_at=NOW() WHERE id=${accountId} AND EXISTS (SELECT 1 FROM consumed) RETURNING email_verified_at`
    : await sql`WITH consumed AS (UPDATE email_verification_codes SET consumed_at=NOW() WHERE id=${String(record.id)} AND consumed_at IS NULL AND expires_at>NOW() RETURNING id) UPDATE public_users SET email_verified_at=NOW() WHERE id=${accountId} AND EXISTS (SELECT 1 FROM consumed) RETURNING email_verified_at`;
  if(!updated[0])return{ok:false,error:"This code was already used. Request a new verification code."}as const;
  return { ok:true,verifiedAt:new Date(String((updated[0] as Record<string,unknown>).email_verified_at)).toISOString() } as const;
}
