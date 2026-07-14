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

const compatibleOrganDonors: Record<string,string[]> = { O:["O"],A:["O","A"],B:["O","B"],AB:["O","A","B","AB"] };
export function isOrganBloodCompatible(donor:string,recipient:string,organ:string|null){
  if(organ==="Cornea (Eye)"||organ==="Bone Marrow"||organ==="Skin")return true;
  const donorAbo=donor.replace(/[+-]$/,"");const recipientAbo=recipient.replace(/[+-]$/,"");
  return compatibleOrganDonors[recipientAbo]?.includes(donorAbo)??false;
}

export function findBestMatch(records: MedicalRecord[]): MatchResult | null {
  const donors = records.filter((record) => record.role === "donor");
  const patients = records
    .filter((record) => record.role === "patient")
    .sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0));

  for (const patient of patients) {
    const donor = donors.find(
      (candidate) =>
        candidate.mode === patient.mode &&
        candidate.age >= 18 &&
        (candidate.mode === "organ"
          ? isOrganBloodCompatible(candidate.bloodGroup, patient.bloodGroup, patient.organ)
          : isBloodCompatible(candidate.bloodGroup, patient.bloodGroup)) &&
        (candidate.mode === "organ"
          ? candidate.organ === patient.organ
          : (candidate.quantity ?? 0) >= (patient.quantity ?? 0)),
    );
    if (donor) return { donor, patient };
  }
  return null;
}
