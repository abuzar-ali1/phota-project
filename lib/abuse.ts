import "server-only";
import {database,ensureSchema} from "./db";

export async function reserveSecurityRequest(eventType:"signup"|"login",accountType:"hospital"|"public",accountFingerprint:string,ipHash:string){
  await ensureSchema();const sql=database();
  const limits=eventType==="signup"?{ipShort:5,ipDaily:20,accountShort:3,accountDaily:5}:{ipShort:30,ipDaily:300,accountShort:100,accountDaily:500};
  const[,,rows]=await sql.transaction((transaction)=>[
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:security-account:${eventType}:${accountFingerprint}`},0::bigint))`,
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:security-ip:${eventType}:${ipHash}`},0::bigint))`,
    transaction`WITH counts AS (
      SELECT
        COUNT(*) FILTER(WHERE ip_hash=${ipHash} AND created_at>NOW()-INTERVAL '10 minutes')::int AS ip_short,
        COUNT(*) FILTER(WHERE ip_hash=${ipHash} AND created_at>NOW()-INTERVAL '24 hours')::int AS ip_daily,
        COUNT(*) FILTER(WHERE account_fingerprint=${accountFingerprint} AND created_at>NOW()-INTERVAL '10 minutes')::int AS account_short,
        COUNT(*) FILTER(WHERE account_fingerprint=${accountFingerprint} AND created_at>NOW()-INTERVAL '24 hours')::int AS account_daily
      FROM security_request_events WHERE event_type=${eventType}
    ), inserted AS (
      INSERT INTO security_request_events(event_type,account_type,account_fingerprint,ip_hash)
      SELECT ${eventType},${accountType},${accountFingerprint},${ipHash} FROM counts
      WHERE ip_short<${limits.ipShort} AND ip_daily<${limits.ipDaily} AND account_short<${limits.accountShort} AND account_daily<${limits.accountDaily}
      RETURNING id
    ) SELECT EXISTS(SELECT 1 FROM inserted) AS allowed`,
  ]);
  return Boolean((rows[0] as Record<string,unknown>)?.allowed);
}
