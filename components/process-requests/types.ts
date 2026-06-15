import { Id } from "@/convex/_generated/dataModel";

/**
 * Enriched process-request shape returned by `api.processRequests.list`.
 * Kept intentionally permissive on the nested relations so the list/detail
 * views can read the joined fields the backend computes.
 */
export interface ProcessRequestListItem {
  _id: Id<"processRequests">;
  companyId: Id<"companies">;
  createdBy: Id<"users">;
  status: string;
  version?: number;
  submittedAt?: number;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  rejectionReason?: string;
  approvedIndividualProcessId?: Id<"individualProcesses">;
  candidatePersonId?: Id<"people">;
  candidatePassportId?: Id<"passports">;
  passportStorageId?: Id<"_storage">;
  candidateEmail?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  processTypeId?: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  workplaceCityId?: Id<"cities">;
  consulateId?: Id<"consulates">;
  isUrgent?: boolean;
  requestDate?: string;
  notes?: string;
  lastSalaryCurrency?: string;
  lastSalaryAmount?: number;
  exchangeRateToBRL?: number;
  salaryInBRL?: number;
  monthlyAmountToReceive?: number;
  visaReceiptLocation?: "brazil" | "abroad";
  residenceCountryCode?: string;
  residenceCountryName?: string;
  residenceStateCode?: string;
  residenceCity?: string;
  residenceSince?: string;
  residenceAddressAbroad?: string;
  consularPost?: string;
  professionalExperience?: string;
  createdAt: number;
  updatedAt: number;
  company: { _id: Id<"companies">; name: string } | null;
  candidatePerson:
    | {
        _id: Id<"people">;
        fullName: string;
        givenNames?: string;
        middleName?: string;
        surname?: string;
        sex?: string;
        birthDate?: string;
        email?: string;
      }
    | null;
  candidatePassport:
    | {
        _id: Id<"passports">;
        passportNumber: string;
        issueDate?: string;
        expiryDate?: string;
      }
    | null;
  processType: { _id: Id<"processTypes">; name: string } | null;
  legalFramework:
    | { _id: Id<"legalFrameworks">; name: string; description?: string }
    | null;
  workplaceCity: { _id: Id<"cities">; name: string } | null;
  consulate: { _id: Id<"consulates">; city?: { name: string } | null } | null;
  reviewerProfile: { fullName: string } | null;
  creatorProfile: { fullName?: string; email?: string } | null;
  approvedIndividualProcess: { _id: Id<"individualProcesses"> } | null;
}

export interface ProcessRequestVersion {
  _id: Id<"processRequestVersions">;
  version: number;
  snapshot: Record<string, unknown>;
  submittedBy: Id<"users">;
  submittedAt: number;
}

export type ProcessRequestDetail = ProcessRequestListItem & {
  versions: ProcessRequestVersion[];
};
