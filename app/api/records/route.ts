import { NextResponse } from "next/server";
import { createRecord, deleteRecord, listRecords } from "@/lib/db";
import type { ApiErrorResponse, PortalMode, RecordInput } from "@/lib/types";

export const runtime = "nodejs";

const bloodGroups = new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]);

function isRecordBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeMode(value: unknown): PortalMode | null {
  return value === "organ" || value === "blood" ? value : null;
}

export async function GET(request: Request) {
  try {
    const mode = normalizeMode(new URL(request.url).searchParams.get("mode"));
    if (!mode) {
      return NextResponse.json({ error: "A valid portal mode is required." } satisfies ApiErrorResponse, { status: 400 });
    }
    return NextResponse.json({ records: await listRecords(mode) });
  } catch (error) {
    console.error("Unable to load records", error);
    return NextResponse.json({ error: "The database is temporarily unavailable." } satisfies ApiErrorResponse, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!isRecordBody(body)) {
      return NextResponse.json({ error: "Please send a valid registration payload." } satisfies ApiErrorResponse, { status: 400 });
    }

    const name = readString(body.name);
    const cnic = readString(body.cnic);
    const phone = readString(body.phone);
    const hospital = readString(body.hospital);
    const bloodGroup = readString(body.bloodGroup);
    const mode = normalizeMode(body.mode);
    const role = body.role === "donor" || body.role === "patient" ? body.role : null;

    if (!name || !cnic || !phone || !hospital || !bloodGroup) {
      return NextResponse.json({ error: "Please complete all required fields." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (!mode) {
      return NextResponse.json({ error: "Invalid portal mode." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: "Invalid registration type." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (!/^\d{13}$/.test(cnic)) {
      return NextResponse.json({ error: "CNIC must contain exactly 13 digits." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (!bloodGroups.has(bloodGroup)) {
      return NextResponse.json({ error: "Invalid blood group." } satisfies ApiErrorResponse, { status: 400 });
    }

    const ageValue = body.age;
    const age = typeof ageValue === "number" ? ageValue : Number(ageValue);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return NextResponse.json({ error: "Enter a valid age between 1 and 120." } satisfies ApiErrorResponse, { status: 400 });
    }

    const organ = mode === "organ" ? readString(body.organ) : null;
    if (mode === "organ" && !organ) {
      return NextResponse.json({ error: "Please select an organ." } satisfies ApiErrorResponse, { status: 400 });
    }

    const record = await createRecord({
      mode,
      role,
      name,
      cnic,
      phone,
      age,
      bloodGroup,
      hospital,
      organ: mode === "organ" ? organ : null,
      donorType: mode === "organ" && role === "donor" ? readString(body.donorType) ?? "Living" : null,
      urgency: mode === "organ" && role === "patient" ? Math.min(10, Math.max(1, Number(body.urgency) || 5)) : null,
    } satisfies RecordInput);

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique")
      ? "A record with this CNIC already exists in this list."
      : "The registration could not be saved.";
    console.error("Unable to create record", error);
    return NextResponse.json({ error: message } satisfies ApiErrorResponse, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "A valid record ID is required." } satisfies ApiErrorResponse, { status: 400 });
    }
    await deleteRecord(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete record", error);
    return NextResponse.json({ error: "The record could not be removed." } satisfies ApiErrorResponse, { status: 500 });
  }
}
