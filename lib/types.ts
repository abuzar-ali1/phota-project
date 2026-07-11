export type PortalMode = "organ" | "blood";
export type PersonRole = "donor" | "patient";

export type MedicalRecord = {
  id: string;
  mode: PortalMode;
  role: PersonRole;
  name: string;
  cnic: string;
  phone: string;
  age: number;
  bloodGroup: string;
  hospital: string;
  organ: string | null;
  donorType: string | null;
  urgency: number | null;
  createdAt: string;
};

export type RecordInput = Omit<MedicalRecord, "id" | "createdAt">;
export type MatchResult = {
  donor: MedicalRecord;
  patient: MedicalRecord;
};

export type ApiRecordsResponse = {
  records: MedicalRecord[];
  error?: string;
};

export type ApiRecordResponse = {
  record: MedicalRecord;
  error?: string;
};

export type ApiErrorResponse = {
  error: string;
};

export type VerificationStatus = "pending" | "verified" | "rejected";
export type HospitalRole = "hospital" | "admin";

export type HospitalProfile = {
  id: string;
  hospitalName: string;
  hospitalType: string;
  licenseNumber: string;
  registrationAuthority: string;
  officialEmail: string;
  phone: string;
  address: string;
  city: string;
  adminName: string;
  adminTitle: string;
  verificationStatus: VerificationStatus;
  role: HospitalRole;
  createdAt: string;
  verifiedAt: string | null;
  lastLoginAt: string | null;
};

export type HospitalSignupInput = Omit<HospitalProfile, "id" | "verificationStatus" | "role" | "createdAt" | "verifiedAt" | "lastLoginAt"> & { password: string };
