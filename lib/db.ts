import { neon } from "@neondatabase/serverless";
import type { HospitalProfile, HospitalRole, HospitalSignupInput, MedicalRecord, PortalMode, RecordInput, VerificationStatus } from "./types";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function isTransient(error: unknown) {
  const value = error as { message?: string; code?: string; cause?: { message?: string; code?: string }; sourceError?: { message?: string; code?: string; cause?: { message?: string; code?: string } } };
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT/i.test([value?.message, value?.code, value?.cause?.message, value?.cause?.code, value?.sourceError?.message, value?.sourceError?.code, value?.sourceError?.cause?.message, value?.sourceError?.cause?.code].filter(Boolean).join(" "));
}

async function withRetry<T>(operation: () => Promise<T>) {
  try { return await operation(); } catch (error) { if (!isTransient(error)) throw error; return operation(); }
}

let initialized: Promise<void> | null = null;

async function ensureSchema() {
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
      await sql`CREATE TABLE IF NOT EXISTS medical_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mode TEXT NOT NULL CHECK (mode IN ('organ','blood')),
        role TEXT NOT NULL CHECK (role IN ('donor','patient')), name TEXT NOT NULL, cnic VARCHAR(13) NOT NULL,
        phone TEXT NOT NULL, age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120), blood_group VARCHAR(3) NOT NULL,
        hospital TEXT NOT NULL, organ TEXT, donor_type TEXT, urgency INTEGER CHECK (urgency BETWEEN 1 AND 10),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (mode, role, cnic)
      )`;
      await sql`ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE medical_records DROP CONSTRAINT IF EXISTS medical_records_mode_role_cnic_key`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS medical_records_hospital_mode_role_cnic_uidx ON medical_records (hospital_id, mode, role, cnic) WHERE hospital_id IS NOT NULL`;
      await sql`CREATE INDEX IF NOT EXISTS medical_records_hospital_idx ON medical_records (hospital_id, mode, created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS hospitals_status_idx ON hospitals (verification_status, created_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS hospital_verification_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        reviewed_by UUID NOT NULL REFERENCES hospitals(id), status TEXT NOT NULL CHECK (status IN ('verified','rejected')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    })().catch((error) => { initialized = null; throw error; });
  }
  return initialized;
}

function row(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid database row"); return value as Record<string, unknown>; }
const string = (value: unknown) => String(value ?? "");
const optional = (value: unknown) => value == null ? null : String(value);

function mapRecord(value: unknown): MedicalRecord {
  const r = row(value);
  return { id: string(r.id), mode: r.mode as PortalMode, role: r.role as MedicalRecord["role"], name: string(r.name), cnic: string(r.cnic), phone: string(r.phone), age: Number(r.age), bloodGroup: string(r.blood_group), hospital: string(r.hospital), organ: optional(r.organ), donorType: optional(r.donor_type), urgency: r.urgency == null ? null : Number(r.urgency), createdAt: new Date(string(r.created_at)).toISOString() };
}

export async function listRecords(mode: PortalMode, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`SELECT * FROM medical_records WHERE mode=${mode} AND hospital_id=${hospitalId} ORDER BY created_at DESC`);
  return rows.map(mapRecord);
}

export async function createRecord(input: RecordInput, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`INSERT INTO medical_records (mode,role,name,cnic,phone,age,blood_group,hospital,organ,donor_type,urgency,hospital_id)
    VALUES (${input.mode},${input.role},${input.name},${input.cnic},${input.phone},${input.age},${input.bloodGroup},${input.hospital},${input.organ},${input.donorType},${input.urgency},${hospitalId})
    ON CONFLICT (hospital_id,mode,role,cnic) WHERE hospital_id IS NOT NULL DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,age=EXCLUDED.age,blood_group=EXCLUDED.blood_group,hospital=EXCLUDED.hospital,organ=EXCLUDED.organ,donor_type=EXCLUDED.donor_type,urgency=EXCLUDED.urgency RETURNING *`);
  return mapRecord(rows[0]);
}

export async function deleteRecord(id: string, hospitalId: string) {
  await ensureSchema(); const sql = database();
  const rows = await withRetry(() => sql`DELETE FROM medical_records WHERE id=${id} AND hospital_id=${hospitalId} RETURNING id`);
  return rows.length > 0;
}

export type HospitalAuthRecord = HospitalProfile & { passwordHash: string; failedLoginAttempts: number; lockedUntil: string | null; tokenVersion: number };

function mapHospital(value: unknown): HospitalProfile {
  const r = row(value);
  return { id:string(r.id),hospitalName:string(r.hospital_name),hospitalType:string(r.hospital_type),licenseNumber:string(r.license_number),registrationAuthority:string(r.registration_authority),officialEmail:string(r.official_email),phone:string(r.phone),address:string(r.address),city:string(r.city),adminName:string(r.admin_name),adminTitle:string(r.admin_title),verificationStatus:r.verification_status as VerificationStatus,role:r.role as HospitalRole,createdAt:new Date(string(r.created_at)).toISOString(),verifiedAt:r.verified_at?new Date(string(r.verified_at)).toISOString():null,lastLoginAt:r.last_login_at?new Date(string(r.last_login_at)).toISOString():null };
}

function mapHospitalAuth(value: unknown): HospitalAuthRecord { const r=row(value); return {...mapHospital(r),passwordHash:string(r.password_hash),failedLoginAttempts:Number(r.failed_login_attempts),lockedUntil:r.locked_until?new Date(string(r.locked_until)).toISOString():null,tokenVersion:Number(r.token_version)}; }

export async function createHospital(input: HospitalSignupInput, passwordHash: string, role: HospitalRole) {
  await ensureSchema(); const sql=database(); const status:VerificationStatus=role==="admin"?"verified":"pending";
  const rows=await withRetry(()=>sql`INSERT INTO hospitals (hospital_name,hospital_type,license_number,registration_authority,official_email,phone,address,city,admin_name,admin_title,password_hash,verification_status,role,verified_at)
    VALUES (${input.hospitalName},${input.hospitalType},${input.licenseNumber},${input.registrationAuthority},${input.officialEmail.toLowerCase()},${input.phone},${input.address},${input.city},${input.adminName},${input.adminTitle},${passwordHash},${status},${role},${role==="admin"?new Date():null}) RETURNING *`);
  return mapHospital(rows[0]);
}

export async function getHospitalByEmail(email:string){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE official_email=${email.toLowerCase()} LIMIT 1`);return rows[0]?mapHospitalAuth(rows[0]):null;}
export async function getHospitalById(id:string){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE id=${id} LIMIT 1`);return rows[0]?mapHospitalAuth(rows[0]):null;}
export async function recordFailedLogin(id:string){await ensureSchema();const sql=database();await withRetry(()=>sql`UPDATE hospitals SET failed_login_attempts=failed_login_attempts+1,locked_until=CASE WHEN failed_login_attempts+1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE locked_until END WHERE id=${id}`);}
export async function recordSuccessfulLogin(id:string){await ensureSchema();const sql=database();await withRetry(()=>sql`UPDATE hospitals SET failed_login_attempts=0,locked_until=NULL,last_login_at=NOW() WHERE id=${id}`);}
export async function listHospitals(){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`SELECT * FROM hospitals WHERE role='hospital' ORDER BY CASE verification_status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END,created_at DESC`);return rows.map(mapHospital);}
export async function reviewHospital(id:string,status:"verified"|"rejected",adminId:string){await ensureSchema();const sql=database();const rows=await withRetry(()=>sql`UPDATE hospitals SET verification_status=${status},verified_at=${status==="verified"?new Date():null},verified_by=${adminId} WHERE id=${id} AND role='hospital' RETURNING *`);if(!rows[0])return null;await withRetry(()=>sql`INSERT INTO hospital_verification_events (hospital_id,reviewed_by,status) VALUES (${id},${adminId},${status})`);return mapHospital(rows[0]);}
