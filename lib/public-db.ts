import "server-only";
import { database, ensureSchema, withRetry } from "./db";
import type { PortalMode, PublicDonorListing, PublicMatch, PublicSearchResult, PublicUserProfile, PublicUserSignupInput } from "./types";

type DbRow = Record<string, unknown>;
const text = (value: unknown) => String(value ?? "");
const nullableText = (value: unknown) => value == null ? null : String(value);
const iso = (value: unknown) => value == null ? null : new Date(String(value)).toISOString();

function row(value: unknown): DbRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid database row");
  return value as DbRow;
}

export type PublicUserAuthRecord = PublicUserProfile & {
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  tokenVersion: number;
};

function mapPublicUser(value: unknown): PublicUserAuthRecord {
  const r = row(value);
  const lastBloodDonationAt = iso(r.last_blood_donation_at);
  return {
    id: text(r.id), name: text(r.name), age: Number(r.age), phone: text(r.phone), email: text(r.email),
    area: nullableText(r.area), latitude: r.latitude == null ? null : Number(r.latitude), longitude: r.longitude == null ? null : Number(r.longitude),
    emailVerifiedAt: iso(r.email_verified_at), lastBloodDonationAt, cooldownUntil: iso(r.cooldown_until),
    status: r.status as PublicUserProfile["status"], blockedReason: nullableText(r.blocked_reason), blockedAt:iso(r.blocked_at),createdAt: iso(r.created_at)!, lastLoginAt: iso(r.last_login_at),
    passwordHash: text(r.password_hash), failedLoginAttempts: Number(r.failed_login_attempts), lockedUntil: iso(r.locked_until), tokenVersion: Number(r.token_version),
  };
}

function publicProfile(user:PublicUserAuthRecord):PublicUserProfile{const{passwordHash:_password,failedLoginAttempts:_attempts,lockedUntil:_locked,tokenVersion:_version,...profile}=user;void _password;void _attempts;void _locked;void _version;return profile;}

export async function createPublicUser(input: PublicUserSignupInput, passwordHash: string) {
  await ensureSchema(); const sql = database();
  const rows = await sql`WITH stale AS (
      DELETE FROM public_users users WHERE (users.email=${input.email.toLowerCase()} OR users.phone=${input.phone})
        AND users.email_verified_at IS NULL AND users.created_at<NOW()-INTERVAL '1 hour'
        AND NOT EXISTS(SELECT 1 FROM public_donor_listings listing WHERE listing.user_id=users.id)
        AND NOT EXISTS(SELECT 1 FROM public_matches match WHERE match.requester_id=users.id OR match.donor_user_id=users.id)
      RETURNING id
    ), cleared_codes AS (
      DELETE FROM email_verification_codes WHERE account_type='public' AND account_id IN (SELECT id FROM stale) RETURNING id
    ) INSERT INTO public_users (name,age,phone,email,password_hash)
      SELECT ${input.name},${input.age},${input.phone},${input.email.toLowerCase()},${passwordHash}
      FROM (SELECT COUNT(*) FROM cleared_codes) dependency RETURNING *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until`;
  return mapPublicUser(rows[0]);
}

export async function getPublicUserByEmail(email: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until FROM public_users WHERE email=${email.toLowerCase()} LIMIT 1`);
  return rows[0] ? mapPublicUser(rows[0]) : null;
}

export async function getPublicUserById(id: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until FROM public_users WHERE id=${id} LIMIT 1`);
  return rows[0] ? mapPublicUser(rows[0]) : null;
}

export async function listPublicUsers(){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until FROM public_users ORDER BY created_at DESC`);return rows.map((value)=>publicProfile(mapPublicUser(value)));}

export async function deletePublicUser(id:string){await ensureSchema();const sql=database();const[,rows]=await sql.transaction((transaction)=>[
  transaction`DELETE FROM email_verification_codes WHERE account_type='public' AND account_id=${id}`,
  transaction`DELETE FROM public_users WHERE id=${id} RETURNING id`,
]);return rows.length>0;}

export async function unblockPublicUser(id:string){await ensureSchema();const sql=database();const rows=await sql`UPDATE public_users SET status='active',blocked_reason=NULL,blocked_at=NULL,failed_login_attempts=0,locked_until=NULL,token_version=token_version+1 WHERE id=${id} AND status='blocked' RETURNING *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until`;return rows[0]?publicProfile(mapPublicUser(rows[0])):null;}

export async function updateNewPublicUserEmail(id:string,email:string){await ensureSchema();const sql=database();const rows=await sql`WITH updated AS (
    UPDATE public_users users SET email=${email.toLowerCase()},email_verified_at=NULL
    WHERE users.id=${id} AND users.status='active' AND users.email_verified_at IS NULL AND users.created_at>NOW()-INTERVAL '24 hours'
      AND NOT EXISTS(SELECT 1 FROM public_donor_listings listing WHERE listing.user_id=users.id)
      AND NOT EXISTS(SELECT 1 FROM public_matches match WHERE match.requester_id=users.id OR match.donor_user_id=users.id)
    RETURNING *,last_blood_donation_at+INTERVAL '3 months' AS cooldown_until
  ), cleared AS (
    UPDATE email_verification_codes SET consumed_at=NOW() WHERE account_type='public' AND account_id IN(SELECT id FROM updated) AND consumed_at IS NULL RETURNING id
  ) SELECT updated.* FROM updated CROSS JOIN(SELECT COUNT(*) FROM cleared) dependency`;
  return rows[0]?publicProfile(mapPublicUser(rows[0])):null;}

export async function recordPublicFailedLogin(id: string) {
  await ensureSchema(); const sql = database();
  await sql`UPDATE public_users SET failed_login_attempts=LEAST(failed_login_attempts+1,100),locked_until=NULL WHERE id=${id}`;
}

export async function recordPublicSuccessfulLogin(id: string) {
  await ensureSchema(); const sql = database();
  await sql`UPDATE public_users SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=${id}`;
}

export async function updatePublicLocation(id: string, area: string, latitude: number, longitude: number) {
  await ensureSchema(); const sql = database();
  await sql`UPDATE public_users SET area=${area},latitude=${latitude},longitude=${longitude},location_updated_at=NOW() WHERE id=${id}`;
}

export async function recordSearchAttempt(userId: string, fingerprint: string, ipHash: string) {
  await ensureSchema(); const sql = database();
  const[,,rows]=await sql.transaction((transaction)=>[
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:search-user:${userId}`},0::bigint))`,
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:search-ip:${ipHash}`},0::bigint))`,
    transaction`WITH locked_user AS (
      SELECT id,status FROM public_users WHERE id=${userId} FOR UPDATE
    ), inserted AS (
      INSERT INTO public_search_events (user_id,query_fingerprint,ip_hash)
      SELECT id,${fingerprint},${ipHash} FROM locked_user WHERE status='active' RETURNING id
    ), counts AS (
      SELECT
        (COUNT(*) FILTER (WHERE user_id=${userId} AND created_at>NOW()-INTERVAL '10 minutes')+(SELECT COUNT(*) FROM inserted))::int AS recent_count,
        (COUNT(*) FILTER (WHERE user_id=${userId} AND created_at>NOW()-INTERVAL '10 minutes' AND query_fingerprint=${fingerprint})+(SELECT COUNT(*) FROM inserted))::int AS repeated_count,
        (COUNT(*) FILTER (WHERE user_id=${userId} AND created_at>NOW()-INTERVAL '24 hours')+(SELECT COUNT(*) FROM inserted))::int AS daily_count,
        (COUNT(*) FILTER (WHERE ip_hash=${ipHash} AND created_at>NOW()-INTERVAL '10 minutes')+(SELECT COUNT(*) FROM inserted))::int AS ip_recent_count
      FROM public_search_events
    ), blocked AS (
      UPDATE public_users SET status='blocked',blocked_reason='Automated protection blocked this account after suspicious repeated medical searches.',blocked_at=NOW()
      WHERE id=${userId} AND EXISTS (SELECT 1 FROM counts WHERE recent_count>=15 OR repeated_count>=10 OR daily_count>=80)
      RETURNING id
    ) SELECT counts.*,(EXISTS(SELECT 1 FROM blocked) OR NOT EXISTS(SELECT 1 FROM inserted)) AS blocked,
      (ip_recent_count>=100) AS ip_throttled FROM counts`,
  ]);
  const counts = row(rows[0]);
  const recent = Number(counts.recent_count); const repeated = Number(counts.repeated_count); const daily = Number(counts.daily_count);
  const blocked=Boolean(counts.blocked);const throttled=Boolean(counts.ip_throttled);
  const reason=blocked?"Automated protection blocked this account after suspicious repeated medical searches.":null;
  if (blocked) return { blocked: true, throttled: false, reason, recent, repeated, daily };
  return { blocked: false, throttled, reason: null, recent, repeated, daily };
}

export async function createDonorListing(userId: string, input: Omit<PublicDonorListing, "id" | "active" | "createdAt">) {
  await ensureSchema(); const sql = database();
  const[,rows]=await sql.transaction((transaction)=>[
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:public-donor:${userId}`},0::bigint))`,
    transaction`WITH eligible AS (
      SELECT id FROM public_users WHERE id=${userId} AND status='active' AND email_verified_at>NOW()-INTERVAL '7 days'
        AND (last_blood_donation_at IS NULL OR NOW()>=last_blood_donation_at+INTERVAL '3 months') FOR UPDATE
    ), deactivated AS (
      UPDATE public_donor_listings SET active=FALSE,updated_at=NOW()
      WHERE user_id=${userId} AND mode=${input.mode} AND EXISTS(SELECT 1 FROM eligible) RETURNING id
    ) INSERT INTO public_donor_listings (user_id,mode,blood_group,organ,quantity,area,latitude,longitude)
      SELECT eligible.id,${input.mode},${input.bloodGroup},${input.organ},${input.quantity},${input.area},${input.latitude},${input.longitude}
      FROM eligible INNER JOIN public_users users ON users.id=eligible.id CROSS JOIN (SELECT COUNT(*) FROM deactivated) dependency
      WHERE ${input.mode}<>'blood' OR users.age BETWEEN 18 AND 60
      RETURNING *`,
  ]);
  if(!rows[0])throw new Error("Account is not currently eligible to publish this donor availability.");
  return mapListing(rows[0]);
}

function mapListing(value: unknown): PublicDonorListing {
  const r = row(value);
  return { id:text(r.id),mode:r.mode as PortalMode,bloodGroup:text(r.blood_group),organ:nullableText(r.organ),quantity:r.quantity==null?null:Number(r.quantity),area:text(r.area),latitude:Number(r.latitude),longitude:Number(r.longitude),active:Boolean(r.active),createdAt:iso(r.created_at)! };
}

export async function listDonorListings(userId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT * FROM public_donor_listings WHERE user_id=${userId} ORDER BY created_at DESC`);
  return rows.map(mapListing);
}

export async function deactivateDonorListing(userId: string, id: string) {
  await ensureSchema(); const sql = database();
  const rows = await sql`UPDATE public_donor_listings SET active=FALSE,updated_at=NOW() WHERE id=${id} AND user_id=${userId} RETURNING id`;
  return rows.length > 0;
}

export type SearchCandidate = PublicSearchResult & { sourceId:string; donorUserId: string | null; medicalRecordId: string | null; latitude: number | null; longitude: number | null; city: string | null };

export async function loadSearchCandidates(mode: PortalMode, organ: string | null, maxDonorAge:number) {
  await ensureSchema(); const sql = database();
  const publicRows = await withRetry(() => sql`SELECT listing.*,users.name,users.id AS donor_user_id
    FROM public_donor_listings listing INNER JOIN public_users users ON users.id=listing.user_id
    WHERE listing.mode=${mode} AND listing.active=TRUE AND (${organ}::text IS NULL OR listing.organ=${organ})
      AND users.status='active' AND users.age BETWEEN 18 AND ${maxDonorAge} AND users.email_verified_at>NOW()-INTERVAL '7 days'
      AND (users.last_blood_donation_at IS NULL OR NOW()>=users.last_blood_donation_at+INTERVAL '3 months')`);
  const hospitalRows = await withRetry(() => sql`SELECT records.id,records.mode,records.blood_group,records.organ,records.quantity,
    hospitals.hospital_name,hospitals.phone AS hospital_phone,hospitals.city,hospitals.latitude,hospitals.longitude
    FROM medical_records records INNER JOIN hospitals ON hospitals.id=records.hospital_id
    WHERE records.mode=${mode} AND records.role='donor' AND records.age BETWEEN 18 AND ${maxDonorAge} AND (${organ}::text IS NULL OR records.organ=${organ})
      AND hospitals.role='hospital' AND hospitals.verification_status='verified' AND hospitals.email_verified_at>NOW()-INTERVAL '7 days'
      AND NOT EXISTS (SELECT 1 FROM public_matches active_match WHERE active_match.medical_record_id=records.id AND active_match.status='active')`);
  const publicCandidates: SearchCandidate[] = publicRows.map((value) => { const r=row(value); return {sourceType:"public",sourceId:text(r.id),label:"Verified community donor",hospitalName:null,mode:r.mode as PortalMode,bloodGroup:text(r.blood_group),organ:nullableText(r.organ),quantity:r.quantity==null?null:Number(r.quantity),area:text(r.area),distanceKm:0,donorUserId:text(r.donor_user_id),medicalRecordId:null,latitude:Number(r.latitude),longitude:Number(r.longitude),city:null}; });
  const hospitalCandidates: SearchCandidate[] = hospitalRows.map((value) => { const r=row(value); return {sourceType:"hospital",sourceId:text(r.id),label:text(r.hospital_name),hospitalName:text(r.hospital_name),mode:r.mode as PortalMode,bloodGroup:text(r.blood_group),organ:nullableText(r.organ),quantity:r.quantity==null?null:Number(r.quantity),area:text(r.city),distanceKm:0,donorUserId:null,medicalRecordId:text(r.id),latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude),city:text(r.city)}; });
  return [...publicCandidates, ...hospitalCandidates];
}

export async function createOrGetMatch(requesterId: string, candidate: SearchCandidate, bloodGroup: string, organ: string | null, quantity: number | null, distanceKm: number, maxDonorAge:number) {
  await ensureSchema(); const sql = database();
  const[,rows]=candidate.donorUserId
    ? await sql.transaction((transaction)=>[
      transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:public-donor:${candidate.donorUserId}`},0::bigint))`,
      transaction`WITH requester_ok AS (
        SELECT id FROM public_users WHERE id=${requesterId} AND status='active' AND email_verified_at>NOW()-INTERVAL '7 days'
      ), existing AS (
        SELECT matches.id FROM public_matches matches INNER JOIN public_users donor ON donor.id=matches.donor_user_id
        WHERE matches.requester_id=${requesterId} AND matches.donor_listing_id=${candidate.sourceId} AND matches.mode=${candidate.mode}
          AND matches.blood_group=${bloodGroup} AND matches.organ IS NOT DISTINCT FROM ${organ} AND matches.quantity IS NOT DISTINCT FROM ${quantity}
          AND matches.status='active' AND donor.status='active' AND donor.email_verified_at>NOW()-INTERVAL '7 days'
          AND (donor.last_blood_donation_at IS NULL OR NOW()>=donor.last_blood_donation_at+INTERVAL '3 months') LIMIT 1
      ), eligible AS (
        SELECT listing.id,listing.user_id FROM public_donor_listings listing INNER JOIN public_users donor ON donor.id=listing.user_id
        WHERE listing.id=${candidate.sourceId} AND listing.user_id=${candidate.donorUserId} AND listing.active=TRUE AND listing.mode=${candidate.mode}
          AND listing.blood_group=${candidate.bloodGroup} AND listing.organ IS NOT DISTINCT FROM ${organ}
          AND (${candidate.mode}<>'blood' OR listing.quantity>=${quantity}) AND donor.status='active' AND donor.age BETWEEN 18 AND ${maxDonorAge}
          AND donor.email_verified_at>NOW()-INTERVAL '7 days' AND (donor.last_blood_donation_at IS NULL OR NOW()>=donor.last_blood_donation_at+INTERVAL '3 months')
          AND EXISTS(SELECT 1 FROM requester_ok) AND NOT EXISTS(SELECT 1 FROM existing)
      ), inserted AS (
        INSERT INTO public_matches (requester_id,donor_user_id,donor_listing_id,mode,blood_group,organ,quantity,distance_km)
        SELECT ${requesterId},eligible.user_id,eligible.id,${candidate.mode},${bloodGroup},${organ},${quantity},${distanceKm} FROM eligible
        ON CONFLICT DO NOTHING RETURNING id,donor_listing_id
      ), reserved AS (
        UPDATE public_donor_listings listing SET
          quantity=CASE WHEN listing.mode='blood' THEN listing.quantity-${quantity} ELSE listing.quantity END,
          active=CASE WHEN listing.mode='blood' THEN listing.quantity-${quantity}>0 ELSE FALSE END,updated_at=NOW()
        WHERE listing.id IN (SELECT donor_listing_id FROM inserted) AND listing.active=TRUE
          AND (listing.mode<>'blood' OR listing.quantity>=${quantity}) RETURNING listing.id
      ), cancelled AS (
        UPDATE public_matches SET status='cancelled',updated_at=NOW() WHERE id IN (SELECT id FROM inserted)
          AND NOT EXISTS(SELECT 1 FROM reserved) RETURNING id
      ) SELECT id FROM inserted WHERE EXISTS(SELECT 1 FROM reserved) AND NOT EXISTS(SELECT 1 FROM cancelled)
        UNION ALL SELECT id FROM existing LIMIT 1`,
      ])
    : await sql.transaction((transaction)=>[
      transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:hospital-record:${candidate.medicalRecordId}`},0::bigint))`,
      transaction`WITH requester_ok AS (
        SELECT id FROM public_users WHERE id=${requesterId} AND status='active' AND email_verified_at>NOW()-INTERVAL '7 days'
      ), eligible AS (
        SELECT records.id FROM medical_records records INNER JOIN hospitals ON hospitals.id=records.hospital_id
        WHERE records.id=${candidate.medicalRecordId} AND records.mode=${candidate.mode} AND records.role='donor'
          AND records.age BETWEEN 18 AND ${maxDonorAge} AND records.blood_group=${candidate.bloodGroup}
          AND records.organ IS NOT DISTINCT FROM ${organ} AND (${candidate.mode}<>'blood' OR records.quantity>=${quantity})
          AND hospitals.role='hospital' AND hospitals.verification_status='verified' AND hospitals.email_verified_at>NOW()-INTERVAL '7 days'
          AND EXISTS(SELECT 1 FROM requester_ok)
      ), existing AS (
        SELECT matches.id FROM public_matches matches WHERE matches.requester_id=${requesterId}
          AND matches.medical_record_id=${candidate.medicalRecordId} AND matches.mode=${candidate.mode}
          AND matches.blood_group=${bloodGroup} AND matches.organ IS NOT DISTINCT FROM ${organ}
          AND matches.quantity IS NOT DISTINCT FROM ${quantity} AND matches.status='active' AND EXISTS(SELECT 1 FROM eligible) LIMIT 1
      ), inserted AS (
        INSERT INTO public_matches (requester_id,medical_record_id,mode,blood_group,organ,quantity,distance_km)
        SELECT ${requesterId},eligible.id,${candidate.mode},${bloodGroup},${organ},${quantity},${distanceKm}
        FROM eligible WHERE NOT EXISTS(SELECT 1 FROM existing) ON CONFLICT DO NOTHING RETURNING id
      ) SELECT id FROM inserted UNION ALL SELECT id FROM existing LIMIT 1`,
    ]);
  return rows[0]?text(row(rows[0]).id):null;
}

function mapMatch(value: unknown, currentUserId: string, includeContact = false): PublicMatch {
  const r = row(value); const requesterId=text(r.requester_id); const donorUserId=nullableText(r.donor_user_id);
  const donorCooldownUntil=iso(r.donor_cooldown_until);
  const isRequester=requesterId===currentUserId;
  const contactEligible=includeContact&&r.status==="active"&&(!donorCooldownUntil||new Date(donorCooldownUntil)<=new Date());
  const counterpartPhone=contactEligible?(isRequester?(donorUserId?nullableText(r.donor_phone):nullableText(r.hospital_phone)):nullableText(r.requester_phone)):null;
  return {
    id:text(r.id),requesterId,donorUserId,medicalRecordId:nullableText(r.medical_record_id),mode:r.mode as PortalMode,
    bloodGroup:text(r.blood_group),organ:nullableText(r.organ),quantity:r.quantity==null?null:Number(r.quantity),distanceKm:Number(r.distance_km),
    status:r.status as PublicMatch["status"],counterpartName:isRequester?(donorUserId?text(r.donor_name):text(r.hospital_name)):text(r.requester_name),counterpartPhone,
    hospitalName:nullableText(r.hospital_name),hospitalPhone:nullableText(r.hospital_phone),currentUserRole:isRequester?"requester":"donor",donorCooldownUntil,createdAt:iso(r.created_at)!,
  };
}

export async function listPublicMatches(userId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT matches.*,requester.name AS requester_name,requester.phone AS requester_phone,donor.name AS donor_name,donor.phone AS donor_phone,donor.last_blood_donation_at+INTERVAL '3 months' AS donor_cooldown_until,
    hospitals.hospital_name,hospitals.phone AS hospital_phone FROM public_matches matches
    INNER JOIN public_users requester ON requester.id=matches.requester_id
    LEFT JOIN public_users donor ON donor.id=matches.donor_user_id
    LEFT JOIN medical_records records ON records.id=matches.medical_record_id
    LEFT JOIN hospitals ON hospitals.id=records.hospital_id
    WHERE matches.requester_id=${userId} OR matches.donor_user_id=${userId} ORDER BY matches.created_at DESC`);
  return rows.map((value) => mapMatch(value,userId));
}

export async function getPublicMatch(userId: string, matchId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT matches.*,requester.name AS requester_name,requester.phone AS requester_phone,donor.name AS donor_name,donor.phone AS donor_phone,donor.last_blood_donation_at+INTERVAL '3 months' AS donor_cooldown_until,
    hospitals.hospital_name,hospitals.phone AS hospital_phone FROM public_matches matches
    INNER JOIN public_users requester ON requester.id=matches.requester_id
    LEFT JOIN public_users donor ON donor.id=matches.donor_user_id
    LEFT JOIN medical_records records ON records.id=matches.medical_record_id
    LEFT JOIN hospitals ON hospitals.id=records.hospital_id
    WHERE matches.id=${matchId} AND (matches.requester_id=${userId} OR matches.donor_user_id=${userId}) LIMIT 1`);
  return rows[0] ? mapMatch(rows[0],userId,true) : null;
}

export async function completeBloodDonation(matchId: string, donorUserId: string) {
  await ensureSchema(); const sql = database();
  const[,rows]=await sql.transaction((transaction)=>[
    transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`phota:public-donor:${donorUserId}`},0::bigint))`,
    transaction`WITH target AS (
      SELECT id,donor_user_id,status FROM public_matches WHERE id=${matchId} AND donor_user_id=${donorUserId} AND mode='blood'
    ), updated_donor AS (
      UPDATE public_users SET last_blood_donation_at=NOW()
      WHERE id=${donorUserId} AND EXISTS(SELECT 1 FROM target WHERE status='active')
      RETURNING last_blood_donation_at+INTERVAL '3 months' AS cooldown_until
    ), deactivated AS (
      UPDATE public_donor_listings SET active=FALSE,updated_at=NOW() WHERE user_id=${donorUserId} AND mode='blood'
        AND EXISTS(SELECT 1 FROM updated_donor) RETURNING id
    ), closed AS (
      UPDATE public_matches SET status='closed',updated_at=NOW() WHERE donor_user_id=${donorUserId} AND status='active'
        AND EXISTS(SELECT 1 FROM updated_donor) RETURNING id
    ) SELECT cooldown_until FROM updated_donor CROSS JOIN (SELECT COUNT(*) FROM deactivated) listing_updates CROSS JOIN (SELECT COUNT(*) FROM closed) match_updates
      UNION ALL SELECT users.last_blood_donation_at+INTERVAL '3 months' AS cooldown_until FROM public_users users
        WHERE users.id=${donorUserId} AND users.last_blood_donation_at IS NOT NULL AND EXISTS(SELECT 1 FROM target WHERE status='closed') LIMIT 1`,
  ]);
  return rows[0]?new Date(text(row(rows[0]).cooldown_until)).toISOString():null;
}
