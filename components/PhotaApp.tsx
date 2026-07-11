"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { HospitalProfile, PortalMode } from "@/lib/types";
import { MedicalDashboard } from "./MedicalDashboard";
import { PortalSelector } from "./PortalSelector";

export function PhotaApp({hospital}:{hospital?:HospitalProfile}) {
  const router=useRouter();
  const [mode, setMode] = useState<PortalMode | null>(null);
  function selectPortal(selected: PortalMode) {
    if (!hospital) return router.push(`/login?portal=${selected}`);
    if (hospital.role === "admin") return router.push("/admin/hospitals");
    if (hospital.verificationStatus !== "verified") return router.push("/pending");
    setMode(selected);
  }
  return mode && hospital ? <MedicalDashboard mode={mode} onSwitch={() => setMode(null)} hospital={hospital} /> : <PortalSelector onSelect={selectPortal} hospital={hospital} />;
}
