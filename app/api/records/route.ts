import { NextResponse } from "next/server";
import { createRecord, deleteRecord, listNetworkBloodDonors, listNetworkOrganDonors, listRecords } from "@/lib/db";
import { requireVerifiedHospital, validRequestOrigin } from "@/lib/auth";
import { getOrganRule, validateAge, validateBloodQuantity } from "@/lib/medical-rules";
import { isBloodCompatible, isOrganBloodCompatible } from "@/lib/matching";
import type { ApiErrorResponse, NetworkDonorResult, PortalMode, RecordInput } from "@/lib/types";

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
    const auth = await requireVerifiedHospital();
    if (!auth.hospital) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const url = new URL(request.url);
    const mode = normalizeMode(url.searchParams.get("mode"));
    if (!mode) {
      return NextResponse.json({ error: "A valid portal mode is required." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (url.searchParams.get("scope") === "network-donors") {
      const recipientBloodGroup = readString(url.searchParams.get("bloodGroup"));
      if (!recipientBloodGroup || !bloodGroups.has(recipientBloodGroup)) {
        return NextResponse.json({ error: "Select a valid recipient blood group." } satisfies ApiErrorResponse, { status: 400 });
      }
      const quantity = mode === "blood" ? Number(url.searchParams.get("quantity")) : null;
      if (mode === "blood") {
        const quantityError = validateBloodQuantity(quantity!);
        if (quantityError) return NextResponse.json({ error: quantityError } satisfies ApiErrorResponse, { status: 400 });
      }
      const organ = mode === "organ" ? readString(url.searchParams.get("organ")) : null;
      if (mode === "organ" && (!organ || !getOrganRule(organ))) {
        return NextResponse.json({ error: "Select a supported organ to search." } satisfies ApiErrorResponse, { status: 400 });
      }
      const networkDonors = mode === "organ" ? await listNetworkOrganDonors(organ!) : await listNetworkBloodDonors();
      const donors = networkDonors
        .filter((donor) => mode === "organ"
          ? isOrganBloodCompatible(donor.bloodGroup, recipientBloodGroup, organ)
          : isBloodCompatible(donor.bloodGroup, recipientBloodGroup) && (donor.quantity ?? 0) >= quantity!)
        .map(({ id, name, phone, age, bloodGroup, hospital, organ: donorOrgan, donorType, quantity: availableQuantity, createdAt }) => ({
          id, name, phone, age, bloodGroup, hospital, organ: donorOrgan, donorType, quantity: availableQuantity, createdAt,
        } satisfies NetworkDonorResult));
      return NextResponse.json({ donors });
    }
    return NextResponse.json({ records: await listRecords(mode, auth.hospital.id) });
  } catch (error) {
    console.error("Unable to load records", error);
    return NextResponse.json({ error: "The database is temporarily unavailable." } satisfies ApiErrorResponse, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const auth = await requireVerifiedHospital();
    if (!auth.hospital) return NextResponse.json({ error: auth.error }, { status: auth.status });
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
    if (!/^\d{11}$/.test(phone)) {
      return NextResponse.json({ error: "Phone number must contain exactly 11 digits." } satisfies ApiErrorResponse, { status: 400 });
    }
    if (!bloodGroups.has(bloodGroup)) {
      return NextResponse.json({ error: "Invalid blood group." } satisfies ApiErrorResponse, { status: 400 });
    }

    const ageValue = body.age;
    const age = typeof ageValue === "number" ? ageValue : Number(ageValue);
    const organ = mode === "organ" ? readString(body.organ) : null;
    if (mode === "organ" && (!organ || !getOrganRule(organ))) {
      return NextResponse.json({ error: "Please select a supported organ." } satisfies ApiErrorResponse, { status: 400 });
    }
    const ageError = validateAge(mode, role, organ, age);
    if (ageError) {
      return NextResponse.json({ error: ageError } satisfies ApiErrorResponse, { status: 400 });
    }

    const quantityValue = body.quantity;
    const quantity = mode === "blood" ? (typeof quantityValue === "number" ? quantityValue : Number(quantityValue)) : null;
    if (mode === "blood") {
      const quantityError = validateBloodQuantity(quantity!);
      if (quantityError) return NextResponse.json({ error: quantityError } satisfies ApiErrorResponse, { status: 400 });
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
      quantity,
    } satisfies RecordInput, auth.hospital.id);

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
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const auth = await requireVerifiedHospital();
    if (!auth.hospital) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "A valid record ID is required." } satisfies ApiErrorResponse, { status: 400 });
    }
    await deleteRecord(id, auth.hospital.id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete record", error);
    return NextResponse.json({ error: "The record could not be removed." } satisfies ApiErrorResponse, { status: 500 });
  }
}
