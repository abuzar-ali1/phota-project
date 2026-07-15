import type { PersonRole, PortalMode } from "./types";

export const ORGAN_RULES = [
  { name: "Heart", donor: { min: 18, max: 60 }, patient: { min: 0, max: 70 }, note: "Depends on cardiac condition" },
  { name: "Kidney", donor: { min: 18, max: 75 }, patient: { min: 0, max: 80 }, note: "Living and deceased donors are possible" },
  { name: "Liver", donor: { min: 18, max: 65 }, patient: { min: 0, max: 75 }, note: "Partial transplant is possible" },
  { name: "Lung", donor: { min: 18, max: 60 }, patient: { min: 0, max: 70 }, note: "Strict evaluation is required" },
  { name: "Pancreas", donor: { min: 18, max: 55 }, patient: { min: 10, max: 65 }, note: "Usually used for diabetes" },
  { name: "Cornea (Eye)", donor: { min: 18, max: 85 }, patient: { min: 0, max: 90 }, note: "Age eligibility is very flexible" },
  { name: "Bone Marrow", donor: { min: 18, max: 60 }, patient: { min: 0, max: 75 }, note: "Younger donors are generally preferred" },
  { name: "Skin", donor: { min: 18, max: 70 }, patient: { min: 0, max: 80 }, note: "Used for burn treatment" },
] as const;

export type OrganName = (typeof ORGAN_RULES)[number]["name"];
export const BLOOD_QUANTITY_LIMITS = { min: 1, max: 1000 } as const;

export function getOrganRule(organ: string | null | undefined) {
  return ORGAN_RULES.find((rule) => rule.name === organ) ?? null;
}

export function getAgeRule(mode: PortalMode, role: PersonRole, organ?: string | null) {
  if (mode === "blood") return role === "donor"
    ? { min: 18, max: 60, note: "Blood donors must be 18–60 years old" }
    : { min: 1, max: 120, note: "Enter the recipient age in completed years" };
  const rule = getOrganRule(organ);
  if (!rule) return null;
  const range = rule[role];
  return { ...range, note: rule.note };
}

export function validateAge(mode: PortalMode, role: PersonRole, organ: string | null, age: number) {
  const rule = getAgeRule(mode, role, organ);
  if (!rule) return "Please select a supported organ.";
  if (!Number.isInteger(age) || age < rule.min || age > rule.max) {
    const subject = mode === "organ" ? `${organ} ${role === "donor" ? "donor" : "recipient"}` : role === "donor" ? "Blood donor" : "Blood recipient";
    return `${subject} age must be between ${rule.min} and ${rule.max} years.`;
  }
  return null;
}

export function validateBloodQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < BLOOD_QUANTITY_LIMITS.min || quantity > BLOOD_QUANTITY_LIMITS.max) {
    return `Blood quantity must be a whole number between ${BLOOD_QUANTITY_LIMITS.min} and ${BLOOD_QUANTITY_LIMITS.max} units.`;
  }
  return null;
}
