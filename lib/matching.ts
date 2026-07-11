import type { MatchResult, MedicalRecord } from "./types";

const compatibleDonors: Record<string, string[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export function isBloodCompatible(donor: string, recipient: string): boolean {
  return compatibleDonors[recipient]?.includes(donor) ?? false;
}

export function findBestMatch(records: MedicalRecord[]): MatchResult | null {
  const donors = records.filter((record) => record.role === "donor");
  const patients = records
    .filter((record) => record.role === "patient")
    .sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0));

  for (const patient of patients) {
    const donor = donors.find(
      (candidate) =>
        isBloodCompatible(candidate.bloodGroup, patient.bloodGroup) &&
        (candidate.mode === "blood" || candidate.organ === patient.organ),
    );
    if (donor) return { donor, patient };
  }
  return null;
}

