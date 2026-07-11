import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createHospital } from "@/lib/db";
import { parseSignup } from "@/lib/auth-validation";
import { validRequestOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const input = parseSignup(await request.json());
    if (!input) return NextResponse.json({ error: "Please provide valid hospital details and a strong password." }, { status: 400 });
    const admins = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    const role = admins.includes(input.officialEmail) ? "admin" : "hospital";
    const hospital = await createHospital(input, await hash(input.password, 12), role);
    return NextResponse.json({ hospital, message: role === "admin" ? "Administrator account created." : "Application submitted for verification." }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string }).code;
    const detail = String((error as { detail?: string }).detail || "");
    if (code === "23505") return NextResponse.json({ error: detail.includes("license") ? "This hospital license is already registered." : "This official email is already registered." }, { status: 409 });
    console.error("Hospital signup failed", error);
    return NextResponse.json({ error: "The hospital application could not be submitted." }, { status: 500 });
  }
}

