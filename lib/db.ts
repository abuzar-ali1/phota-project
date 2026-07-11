import { neon } from "@neondatabase/serverless";
import type { MedicalRecord, PortalMode, RecordInput } from "./types";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function isTransientConnectionError(error: unknown): boolean {
  const value = error as {
    message?: string;
    code?: string;
    cause?: { message?: string; code?: string };
    sourceError?: { message?: string; code?: string; cause?: { message?: string; code?: string } };
  };
  const details = [value?.message, value?.code, value?.cause?.message, value?.cause?.code, value?.sourceError?.message, value?.sourceError?.code, value?.sourceError?.cause?.message, value?.sourceError?.cause?.code].filter(Boolean).join(" ");
  return /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT/i.test(details);
}

async function withTransientRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error;
    return operation();
  }
}

let initialized: Promise<void> | null = null;

function isRecordRow(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return value == null ? null : String(value);
  return value.trim() ? value : null;
}

function readNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ensureSchema(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      const sql = database();
      await sql`
        CREATE TABLE IF NOT EXISTS medical_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mode TEXT NOT NULL CHECK (mode IN ('organ', 'blood')),
          role TEXT NOT NULL CHECK (role IN ('donor', 'patient')),
          name TEXT NOT NULL,
          cnic VARCHAR(13) NOT NULL,
          phone TEXT NOT NULL,
          age INTEGER NOT NULL CHECK (age BETWEEN 1 AND 120),
          blood_group VARCHAR(3) NOT NULL,
          hospital TEXT NOT NULL,
          organ TEXT,
          donor_type TEXT,
          urgency INTEGER CHECK (urgency BETWEEN 1 AND 10),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (mode, role, cnic)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS medical_records_mode_idx ON medical_records (mode, created_at DESC)`;
    })().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
}

function mapRecord(row: unknown): MedicalRecord {
  if (!isRecordRow(row)) throw new Error("Invalid database row.");

  const mode = row.mode;
  const role = row.role;

  return {
    id: readString(row.id),
    mode: mode === "organ" || mode === "blood" ? mode : "blood",
    role: role === "donor" || role === "patient" ? role : "patient",
    name: readString(row.name),
    cnic: readString(row.cnic),
    phone: readString(row.phone),
    age: Math.max(1, Math.min(120, Math.trunc(readNumber(row.age)))),
    bloodGroup: readString(row.blood_group),
    hospital: readString(row.hospital),
    organ: readOptionalString(row.organ),
    donorType: readOptionalString(row.donor_type),
    urgency: row.urgency == null ? null : Math.max(1, Math.min(10, Math.trunc(readNumber(row.urgency)))),
    createdAt: new Date(String(row.created_at ?? new Date().toISOString())).toISOString(),
  };
}

export async function listRecords(mode: PortalMode): Promise<MedicalRecord[]> {
  await ensureSchema();
  const sql = database();
  const rows = await withTransientRetry(() => sql`SELECT * FROM medical_records WHERE mode = ${mode} ORDER BY created_at DESC`);
  return (Array.isArray(rows) ? rows : []).map((row) => mapRecord(row));
}

export async function createRecord(input: RecordInput): Promise<MedicalRecord> {
  await ensureSchema();
  const sql = database();
  const rows = await withTransientRetry(() => sql`
    INSERT INTO medical_records (mode, role, name, cnic, phone, age, blood_group, hospital, organ, donor_type, urgency)
    VALUES (${input.mode}, ${input.role}, ${input.name}, ${input.cnic}, ${input.phone}, ${input.age}, ${input.bloodGroup}, ${input.hospital}, ${input.organ}, ${input.donorType}, ${input.urgency})
    ON CONFLICT (mode, role, cnic) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      age = EXCLUDED.age,
      blood_group = EXCLUDED.blood_group,
      hospital = EXCLUDED.hospital,
      organ = EXCLUDED.organ,
      donor_type = EXCLUDED.donor_type,
      urgency = EXCLUDED.urgency
    RETURNING *
  `);
  const firstRow = Array.isArray(rows) ? rows[0] : null;
  if (!firstRow) throw new Error("The record could not be created.");
  return mapRecord(firstRow);
}

export async function deleteRecord(id: string): Promise<boolean> {
  await ensureSchema();
  const sql = database();
  const rows = await withTransientRetry(() => sql`DELETE FROM medical_records WHERE id = ${id} RETURNING id`);
  return Array.isArray(rows) && rows.length > 0;
}
