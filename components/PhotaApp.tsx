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
    if (!hospital.emailVerifiedAt || Date.now()-new Date(hospital.emailVerifiedAt).getTime()>=7*24*60*60*1000) return router.push("/verify-email");
    if (hospital.role === "admin") return router.push("/admin/hospitals");
    if (hospital.verificationStatus !== "verified") return router.push("/pending");
    setMode(selected);
  }
  return mode && hospital ? <MedicalDashboard mode={mode} onSwitch={() => setMode(null)} hospital={hospital} /> : <PortalSelector onSelect={selectPortal} hospital={hospital} />;
}
