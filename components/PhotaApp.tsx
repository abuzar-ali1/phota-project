"use client";

import { useState } from "react";
import type { PortalMode } from "@/lib/types";
import { MedicalDashboard } from "./MedicalDashboard";
import { PortalSelector } from "./PortalSelector";

export function PhotaApp() {
  const [mode, setMode] = useState<PortalMode | null>(null);
  return mode ? <MedicalDashboard mode={mode} onSwitch={() => setMode(null)} /> : <PortalSelector onSelect={setMode} />;
}
