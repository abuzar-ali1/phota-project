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
  quantity: number | null;
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

export type NetworkDonorResult = Pick<MedicalRecord, "id" | "name" | "phone" | "age" | "bloodGroup" | "hospital" | "organ" | "donorType" | "quantity" | "createdAt">;

export type NetworkDonorsResponse = {
  donors: NetworkDonorResult[];
  error?: string;
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
  emailVerifiedAt: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type HospitalSignupInput = Omit<HospitalProfile, "id" | "verificationStatus" | "role" | "createdAt" | "verifiedAt" | "lastLoginAt" | "emailVerifiedAt" | "latitude" | "longitude"> & { password: string };

export type PublicUserStatus = "active" | "blocked";

export type PublicUserProfile = {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  emailVerifiedAt: string | null;
  lastBloodDonationAt: string | null;
  cooldownUntil: string | null;
  status: PublicUserStatus;
  blockedReason: string | null;
  blockedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type PublicUserSignupInput = Pick<PublicUserProfile, "name" | "age" | "phone" | "email"> & { password: string };

export type PublicDonorListing = {
  id: string;
  mode: PortalMode;
  bloodGroup: string;
  organ: string | null;
  quantity: number | null;
  area: string;
  latitude: number;
  longitude: number;
  active: boolean;
  createdAt: string;
};

export type PublicSearchResult = {
  sourceType: "public" | "hospital";
  sourceId: string;
  label: string;
  hospitalName: string | null;
  mode: PortalMode;
  bloodGroup: string;
  organ: string | null;
  quantity: number | null;
  area: string;
  distanceKm: number;
};

export type PublicMatch = {
  id: string;
  requesterId: string;
  donorUserId: string | null;
  medicalRecordId: string | null;
  mode: PortalMode;
  bloodGroup: string;
  organ: string | null;
  quantity: number | null;
  distanceKm: number;
  status: "active" | "closed" | "cancelled";
  counterpartName: string;
  counterpartPhone: string | null;
  hospitalName: string | null;
  hospitalPhone: string | null;
  currentUserRole: "requester" | "donor";
  donorCooldownUntil: string | null;
  createdAt: string;
};
