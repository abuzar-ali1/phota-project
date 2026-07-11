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

