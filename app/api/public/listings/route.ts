import { NextResponse } from "next/server";
import { validRequestOrigin } from "@/lib/auth";
import { canonicalArea, coordinatesForArea, parseCoordinate, validCoordinates } from "@/lib/geo";
import { getOrganRule, validateAge, validateBloodQuantity } from "@/lib/medical-rules";
import { requireVerifiedPublicUser } from "@/lib/public-auth";
import { createDonorListing, deactivateDonorListing, listDonorListings } from "@/lib/public-db";
import { validUuid } from "@/lib/security";
import type { PortalMode } from "@/lib/types";

const bloodGroups = new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]);
export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await requireVerifiedPublicUser();
    if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return NextResponse.json({ listings: await listDonorListings(auth.user.id) });
  } catch (error) {
    console.error("Unable to load donor listings", error);
    return NextResponse.json({ error: "Donor availability could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const auth = await requireVerifiedPublicUser();
    if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.user.cooldownUntil && new Date(auth.user.cooldownUntil) > new Date()) {
      return NextResponse.json({ error: `Donation matching is paused until ${new Date(auth.user.cooldownUntil).toLocaleDateString("en-PK")}.` }, { status: 409 });
    }

    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NextResponse.json({ error: "Enter valid donor availability." }, { status: 400 });
    const body = parsed as Record<string, unknown>;
    const mode: PortalMode | null = body.mode === "organ" ? "organ" : body.mode === "blood" ? "blood" : null;
    const bloodGroup = String(body.bloodGroup || "");
    const organ = mode === "organ" ? String(body.organ || "") : null;
    const quantity = mode === "blood" ? Number(body.quantity) : null;
    const rawArea = String(body.area || auth.user.area || "").trim().slice(0, 100);
    let latitude = parseCoordinate(body.latitude);
    let longitude = parseCoordinate(body.longitude);

    if (!mode || !bloodGroups.has(bloodGroup)) return NextResponse.json({ error: "Select a valid donation type and blood group." }, { status: 400 });
    if (mode === "organ" && (!getOrganRule(organ) || validateAge("organ", "donor", organ, auth.user.age))) {
      return NextResponse.json({ error: `Your age is not eligible to register as a ${organ || "selected organ"} donor.` }, { status: 400 });
    }
    if (mode === "blood") {
      const ageError = validateAge("blood", "donor", null, auth.user.age);
      if (ageError) return NextResponse.json({ error: ageError }, { status: 400 });
      const quantityError = validateBloodQuantity(quantity!);
      if (quantityError) return NextResponse.json({ error: quantityError }, { status: 400 });
    }

    let area = canonicalArea(rawArea) || "Current location";
    if (!validCoordinates(latitude, longitude)) {
      const fallback = coordinatesForArea(rawArea);
      if (!fallback) return NextResponse.json({ error: "Share your location or enter a supported Punjab city." }, { status: 400 });
      latitude = fallback.latitude;
      longitude = fallback.longitude;
      area = canonicalArea(rawArea) || rawArea;
    }
    const listing = await createDonorListing(auth.user.id, { mode, bloodGroup, organ, quantity, area, latitude, longitude });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("Unable to create donor listing", error);
    return NextResponse.json({ error: "Donation availability could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const auth = await requireVerifiedPublicUser();
    if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !validUuid(id)) return NextResponse.json({ error: "A valid listing ID is required." }, { status: 400 });
    const deleted = await deactivateDonorListing(auth.user.id, id);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("Unable to deactivate donor listing", error);
    return NextResponse.json({ error: "Donation availability could not be removed." }, { status: 500 });
  }
}
