import { neon } from "@neondatabase/serverless";
import type { HospitalProfile, HospitalRole, HospitalSignupInput, MedicalRecord, PortalMode, RecordInput, VerificationStatus } from "./types";

export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function isTransient(error: unknown) {
  const value = error as { message?: string; code?: string; cause?: { message?: string; code?: string }; sourceError?: { message?: string; code?: string; cause?: { message?: string; code?: string } } };
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT/i.test([value?.message, value?.code, value?.cause?.message, value?.cause?.code, value?.sourceError?.message, value?.sourceError?.code, value?.sourceError?.cause?.message, value?.sourceError?.cause?.code].filter(Boolean).join(" "));
}

export async function withRetry<T>(operation: () => Promise<T>) {
  try { return await operation(); } catch (error) { if (!isTransient(error)) throw error; return operation(); }
}

let initialized: Promise<void> | null = null;

export async function ensureSchema() {
  if (!initialized) {
    initialized = (async () => {
      const sql = database();
      await sql`CREATE TABLE IF NOT EXISTS hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hospital_name TEXT NOT NULL, hospital_type TEXT NOT NULL,
        license_number TEXT NOT NULL UNIQUE, registration_authority TEXT NOT NULL, official_email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL, admin_name TEXT NOT NULL, admin_title TEXT NOT NULL,
        password_hash TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
        role TEXT NOT NULL DEFAULT 'hospital' CHECK (role IN ('hospital','admin')), failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ, token_version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMPTZ, verified_by UUID REFERENCES hospitals(id), last_login_at TIMESTAMPTZ
      )`;
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`;
      await sql`ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`;
      await sql`ALTER TABLE hospitals DROP CONSTRAINT IF EXISTS hospitals_license_number_check`;
      await sql`ALTER TABLE hospitals ADD CONSTRAINT hospitals_license_number_check CHECK (
        char_length(license_number) BETWEEN 5 AND 40
        AND license_number ~ '^[A-Z0-9][A-Z0-9/&.-]{3,38}[A-Z0-9]$'
      ) NOT VALID`;
      await sql`CREATE TABLE IF NOT EXISTS medical_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mode TEXT NOT NULL CHECK (mode IN ('organ','blood')),
        role TEXT NOT NULL CHECK (role IN ('donor','patient')), name TEXT NOT NULL, cnic VARCHAR(13) NOT NULL,
        phone TEXT NOT NULL, age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120), blood_group VARCHAR(3) NOT NULL,
        hospital TEXT NOT NULL, organ TEXT, donor_type TEXT, urgency INTEGER CHECK (urgency BETWEEN 1 AND 10),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (mode, role, cnic)
      )`;
      await sql`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS quantity INTEGER`;
      await sql`UPDATE medical_records SET quantity=1 WHERE mode='blood' AND quantity IS NULL`;
      await sql`UPDATE medical_records SET organ='Lung' WHERE organ='Lungs'`;
      await sql`UPDATE medical_records SET organ='Cornea (Eye)' WHERE organ='Cornea'`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_age_check`;
      await sql`ALTER TABLE medical_records ADD CONSTRAINT medical_records_age_check CHECK (age BETWEEN 0 AND 120)`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_donor_min_age_check`;
      await sql`ALTER TABLE medical_records ADD CONSTRAINT medical_records_donor_min_age_check CHECK (role<>'donor' OR age>=18) NOT VALID`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_blood_donor_age_check`;
      await sql`ALTER TABLE medical_records ADD CONSTRAINT medical_records_blood_donor_age_check CHECK (
        mode<>'blood' OR role<>'donor' OR age BETWEEN 18 AND 60
      ) NOT VALID`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_quantity_check`;
      await sql`ALTER TABLE medical_records ADD CONSTRAINT medical_records_quantity_check CHECK ((mode='blood' AND quantity BETWEEN 1 AND 1000) OR (mode='organ' AND quantity IS NULL))`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_mode_role_cnic_key`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS medical_records_hospital_mode_role_cnic_uidx ON medical_records (hospital_id, mode, role, cnic) WHERE hospital_id IS NOT NULL`;
      await sql`CREATE INDEX IF NOT EXISTS medical_records_hospital_idx ON medical_records (hospital_id, mode, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS hospitals_status_idx ON hospitals (verification_status, created_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS hospital_verification_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        reviewed_by UUID NOT NULL REFERENCES hospitals(id), status TEXT NOT NULL CHECK (status IN ('verified','rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS public_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120),
        phone VARCHAR(11) NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
        area TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, location_updated_at TIMESTAMPTZ,
        email_verified_at TIMESTAMPTZ, last_blood_donation_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')), blocked_reason TEXT, blocked_at TIMESTAMPTZ,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ, token_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_login_at TIMESTAMPTZ
      )`;
      await sql`CREATE TABLE IF NOT EXISTS email_verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), account_type TEXT NOT NULL CHECK (account_type IN ('hospital','public')),
        account_id UUID NOT NULL, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, ip_hash VARCHAR(64) NOT NULL DEFAULT 'unknown',
        expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`ALTER TABLE email_verification_codes ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64) NOT NULL DEFAULT 'unknown'`;
      await sql`ALTER TABLE public_users DROP CONSTRAINT IF EXISTS public_users_phone_check`;
      await sql`ALTER TABLE public_users ADD CONSTRAINT public_users_phone_check CHECK (phone ~ '^[0-9]{11}$') NOT VALID`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS public_users_phone_uidx ON public_users (phone)`;
      await sql`CREATE TABLE IF NOT EXISTS public_donor_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK (mode IN ('organ','blood')), blood_group VARCHAR(3) NOT NULL, organ TEXT, quantity INTEGER,
        area TEXT NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ((mode='blood' AND organ IS NULL AND quantity BETWEEN 0 AND 1000 AND (active=FALSE OR quantity>=1)) OR (mode='organ' AND organ IS NOT NULL AND quantity IS NULL))
      )`;
      await sql`ALTER TABLE public_donor_listings DROP CONSTRAINT IF EXISTS public_donor_listings_check`;
      await sql`ALTER TABLE public_donor_listings ADD CONSTRAINT public_donor_listings_check CHECK (
        (mode='blood' AND organ IS NULL AND quantity BETWEEN 0 AND 1000 AND (active=FALSE OR quantity>=1))
        OR (mode='organ' AND organ IS NOT NULL AND quantity IS NULL)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS public_matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), requester_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
        donor_user_id UUID REFERENCES public_users(id) ON DELETE CASCADE, medical_record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
        donor_listing_id UUID REFERENCES public_donor_listings(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK (mode IN ('organ','blood')), blood_group VARCHAR(3) NOT NULL, organ TEXT, quantity INTEGER,
        distance_km DOUBLE PRECISION NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK ((donor_user_id IS NOT NULL AND medical_record_id IS NULL) OR (donor_user_id IS NULL AND medical_record_id IS NOT NULL))
      )`;
      await sql`ALTER TABLE public_matches ADD COLUMN IF NOT EXISTS donor_listing_id UUID REFERENCES public_donor_listings(id) ON DELETE CASCADE`;
      await sql`CREATE TABLE IF NOT EXISTS public_search_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
        query_fingerprint VARCHAR(64) NOT NULL, ip_hash VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS security_request_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_type TEXT NOT NULL CHECK(event_type IN ('signup','login')),
        account_type TEXT NOT NULL CHECK(account_type IN ('hospital','public')),account_fingerprint VARCHAR(64) NOT NULL,
        ip_hash VARCHAR(64) NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS email_verification_lookup_idx ON email_verification_codes (account_type,account_id,created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS public_donor_search_idx ON public_donor_listings (mode,active,organ,blood_group)`;
      await sql`WITH ranked AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY user_id,mode ORDER BY created_at DESC,id DESC) AS position FROM public_donor_listings WHERE active=TRUE) UPDATE public_donor_listings SET active=FALSE,updated_at=NOW() WHERE id IN (SELECT id FROM ranked WHERE position>1)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS public_donor_one_active_mode_uidx ON public_donor_listings (user_id,mode) WHERE active=TRUE`;
      await sql`CREATE INDEX IF NOT EXISTS public_matches_requester_idx ON public_matches (requester_id,created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS public_matches_donor_idx ON public_matches (donor_user_id,created_at DESC)`;
      await sql`UPDATE public_matches SET status='cancelled',updated_at=NOW() WHERE donor_user_id IS NOT NULL AND donor_listing_id IS NULL AND status='active'`;
      await sql`WITH ranked AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY requester_id,donor_listing_id ORDER BY created_at,id) AS position FROM public_matches WHERE status='active' AND donor_listing_id IS NOT NULL) UPDATE public_matches SET status='cancelled',updated_at=NOW() WHERE id IN (SELECT id FROM ranked WHERE position>1)`;
      await sql`WITH ranked AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY medical_record_id ORDER BY created_at,id) AS position FROM public_matches WHERE status='active' AND medical_record_id IS NOT NULL) UPDATE public_matches SET status='cancelled',updated_at=NOW() WHERE id IN (SELECT id FROM ranked WHERE position>1)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS public_matches_active_listing_uidx ON public_matches (requester_id,donor_listing_id) WHERE status='active' AND donor_listing_id IS NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS public_matches_active_record_uidx ON public_matches (medical_record_id) WHERE status='active' AND medical_record_id IS NOT NULL`;
      await sql`CREATE INDEX IF NOT EXISTS public_search_events_user_idx ON public_search_events (user_id,created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS public_search_events_ip_idx ON public_search_events (ip_hash,created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS security_request_events_ip_idx ON security_request_events (event_type,ip_hash,created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS security_request_events_account_idx ON security_request_events (event_type,account_fingerprint,created_at DESC)`;
      await sql`DELETE FROM security_request_events WHERE created_at<NOW()-INTERVAL '30 days'`;
      await sql`WITH ranked AS (SELECT id,ROW_NUMBER() OVER(PARTITION BY account_type,account_id ORDER BY created_at DESC,id DESC) AS position FROM email_verification_codes WHERE consumed_at IS NULL) UPDATE email_verification_codes SET consumed_at=NOW() WHERE id IN (SELECT id FROM ranked WHERE position>1)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS email_verification_one_active_uidx ON email_verification_codes (account_type,account_id) WHERE consumed_at IS NULL`;
    })().catch((error) => { initialized = null; throw error; });
  }
  return initialized;
}

function row(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid database row"); return value as Record<string, unknown>; }
const string = (value: unknown) => String(value ?? "");
const optional = (value: unknown) => value == null ? null : String(value);

function mapRecord(value: unknown): MedicalRecord {
  const r = row(value);
  return { id: string(r.id), mode: r.mode as PortalMode, role: r.role as MedicalRecord["role"], name: string(r.name), cnic: string(r.cnic), phone: string(r.phone), age: Number(r.age), bloodGroup: string(r.blood_group), hospital: string(r.hospital), organ: optional(r.organ), donorType: optional(r.donor_type), urgency: r.urgency == null ? null : Number(r.urgency), quantity: r.quantity == null ? null : Number(r.quantity), createdAt: new Date(string(r.created_at)).toISOString() };
}

export async function listRecords(mode: PortalMode, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT * FROM medical_records WHERE mode=${mode} AND hospital_id=${hospitalId} ORDER BY created_at DESC`);
  return rows.map(mapRecord);
}

export async function listNetworkOrganDonors(organ: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`
    SELECT medical_records.*
    FROM medical_records
    INNER JOIN hospitals ON hospitals.id=medical_records.hospital_id
    WHERE medical_records.mode='organ'
      AND medical_records.role='donor'
      AND medical_records.organ=${organ}
      AND medical_records.age>=18
      AND hospitals.role='hospital'
      AND hospitals.verification_status='verified'
      AND hospitals.email_verified_at>NOW()-INTERVAL '7 days'
    ORDER BY medical_records.created_at DESC
  `);
  return rows.map(mapRecord);
}

export async function listNetworkBloodDonors() {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`
    SELECT medical_records.*
    FROM medical_records
    INNER JOIN hospitals ON hospitals.id=medical_records.hospital_id
    WHERE medical_records.mode='blood'
      AND medical_records.role='donor'
      AND medical_records.age BETWEEN 18 AND 60
      AND medical_records.quantity>0
      AND hospitals.role='hospital'
      AND hospitals.verification_status='verified'
      AND hospitals.email_verified_at>NOW()-INTERVAL '7 days'
    ORDER BY medical_records.created_at DESC
  `);
  return rows.map(mapRecord);
}

export async function createRecord(input: RecordInput, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`INSERT INTO medical_records (mode,role,name,cnic,phone,age,blood_group,hospital,organ,donor_type,urgency,quantity,hospital_id)
    VALUES (${input.mode},${input.role},${input.name},${input.cnic},${input.phone},${input.age},${input.bloodGroup},${input.hospital},${input.organ},${input.donorType},${input.urgency},${input.quantity},${hospitalId})
    ON CONFLICT (hospital_id,mode,role,cnic) WHERE hospital_id IS NOT NULL DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,age=EXCLUDED.age,blood_group=EXCLUDED.blood_group,hospital=EXCLUDED.hospital,organ=EXCLUDED.organ,donor_type=EXCLUDED.donor_type,urgency=EXCLUDED.urgency,quantity=EXCLUDED.quantity RETURNING *`);
  return mapRecord(rows[0]);
}

export async function deleteRecord(id: string, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await sql`DELETE FROM medical_records WHERE id=${id} AND hospital_id=${hospitalId} RETURNING id`;
  return rows.length > 0;
}

export type HospitalAuthRecord = HospitalProfile & { passwordHash: string; failedLoginAttempts: number; lockedUntil: string | null; tokenVersion: number };

function mapHospital(value: unknown): HospitalProfile {
  const r = row(value);
  return { id:string(r.id),hospitalName:string(r.hospital_name),hospitalType:string(r.hospital_type),licenseNumber:string(r.license_number),registrationAuthority:string(r.registration_authority),officialEmail:string(r.official_email),phone:string(r.phone),address:string(r.address),city:string(r.city),adminName:string(r.admin_name),adminTitle:string(r.admin_title),verificationStatus:r.verification_status as VerificationStatus,role:r.role as HospitalRole,createdAt:new Date(string(r.created_at)).toISOString(),verifiedAt:r.verified_at?new Date(string(r.verified_at)).toISOString():null,lastLoginAt:r.last_login_at?new Date(string(r.last_login_at)).toISOString():null,emailVerifiedAt:r.email_verified_at?new Date(string(r.email_verified_at)).toISOString():null,latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude) };
}

function mapHospitalAuth(value: unknown): HospitalAuthRecord { const r=row(value); return {...mapHospital(r),passwordHash:string(r.password_hash),failedLoginAttempts:Number(r.failed_login_attempts),lockedUntil:r.locked_until?new Date(string(r.locked_until)).toISOString():null,tokenVersion:Number(r.token_version)}; }

export async function createHospital(input: HospitalSignupInput, passwordHash: string, role: HospitalRole) {
  await ensureSchema(); const sql=database(); const status:VerificationStatus=role==="admin"?"verified":"pending";
  const rows=await sql`WITH stale AS (
      DELETE FROM hospitals hospital WHERE hospital.role='hospital' AND hospital.verification_status='pending'
        AND hospital.email_verified_at IS NULL AND hospital.created_at<NOW()-INTERVAL '24 hours'
        AND (hospital.official_email=${input.officialEmail.toLowerCase()} OR hospital.license_number=${input.licenseNumber})
        AND NOT EXISTS(SELECT 1 FROM medical_records record WHERE record.hospital_id=hospital.id) RETURNING id
    ), cleared_codes AS (
      DELETE FROM email_verification_codes WHERE account_type='hospital' AND account_id IN (SELECT id FROM stale) RETURNING id
    ) INSERT INTO hospitals (hospital_name,hospital_type,license_number,registration_authority,official_email,phone,address,city,admin_name,admin_title,password_hash,verification_status,role,verified_at)
      SELECT ${input.hospitalName},${input.hospitalType},${input.licenseNumber},${input.registrationAuthority},${input.officialEmail.toLowerCase()},${input.phone},${input.address},${input.city},${input.adminName},${input.adminTitle},${passwordHash},${status},${role},${role==="admin"?new Date():null}
      FROM (SELECT COUNT(*) FROM cleared_codes) dependency RETURNING *`;
  return mapHospital(rows[0]);
}

export async function getHospitalByEmail(email:string){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE official_email=${email.toLowerCase()} LIMIT 1`);return rows[0]?mapHospitalAuth(rows[0]):null;}
export async function getHospitalById(id:string){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE id=${id} LIMIT 1`);return rows[0]?mapHospitalAuth(rows[0]):null;}
export async function recordFailedLogin(id:string){await ensureSchema();const sql=database();await sql`UPDATE hospitals SET failed_login_attempts=LEAST(failed_login_attempts+1,100),locked_until=NULL WHERE id=${id}`;}
export async function recordSuccessfulLogin(id:string){await ensureSchema();const sql=database();await sql`UPDATE hospitals SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=${id}`;}
export async function listHospitals(){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE role='hospital' ORDER BY CASE verification_status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END,created_at DESC`);return rows.map(mapHospital);}
export async function reviewHospital(id:string,status:"verified"|"rejected",adminId:string){await ensureSchema();const sql=database();const rows=await sql`WITH updated AS (UPDATE hospitals SET verification_status=${status},verified_at=${status==="verified"?new Date():null},verified_by=${adminId} WHERE id=${id} AND role='hospital' RETURNING *),event AS (INSERT INTO hospital_verification_events (hospital_id,reviewed_by,status) SELECT id,${adminId},${status} FROM updated RETURNING id) SELECT updated.* FROM updated CROSS JOIN (SELECT COUNT(*) FROM event) dependency`;return rows[0]?mapHospital(rows[0]):null;}
export async function deleteHospital(id:string){await ensureSchema();const sql=database();const rows=await sql`DELETE FROM hospitals WHERE id=${id} AND role='hospital' RETURNING hospital_name`;return rows[0]?string(rows[0].hospital_name):null;}

export async function updatePendingHospitalEmail(id:string,email:string){await ensureSchema();const sql=database();const rows=await sql`WITH updated AS (
    UPDATE hospitals hospital SET official_email=${email.toLowerCase()},email_verified_at=NULL
    WHERE hospital.id=${id} AND hospital.role='hospital' AND hospital.verification_status='pending' AND hospital.email_verified_at IS NULL
      AND hospital.created_at>NOW()-INTERVAL '24 hours' AND NOT EXISTS(SELECT 1 FROM medical_records record WHERE record.hospital_id=hospital.id)
    RETURNING *
  ), cleared AS (
    UPDATE email_verification_codes SET consumed_at=NOW() WHERE account_type='hospital' AND account_id IN(SELECT id FROM updated) AND consumed_at IS NULL RETURNING id
  ) SELECT updated.* FROM updated CROSS JOIN(SELECT COUNT(*) FROM cleared) dependency`;
  return rows[0]?mapHospital(rows[0]):null;}
