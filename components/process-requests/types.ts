import { Id } from "@/convex/_generated/dataModel";

/**
 * Enriched process-request shape returned by `api.processRequests.list` / `get`.
 * A requested process IS an `individualProcesses` row, so the id and fields are
 * those of the process. `requestStatus` distinguishes draft vs solicitado.
 */
export interface ProcessRequestListItem {
  _id: Id<"individualProcesses">;
  requestStatus?: "draft" | "solicitado";
  requestGroupId?: string;
  linkedExistingPerson?: boolean;
  requestedBy?: Id<"users">;
  requestedAt?: number;
  requestNotes?: string;
  companyApplicantId?: Id<"companies">;
  userApplicantCompanyId?: Id<"companies">;
  personId: Id<"people">;
  passportId?: Id<"passports">;
  processTypeId?: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  consulateId?: Id<"consulates">;
  urgent?: boolean;
  dateProcess?: string;
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
  person:
    | {
        _id: Id<"people">;
        fullName: string;
        givenNames?: string;
        middleName?: string;
        surname?: string;
        sex?: string;
        birthDate?: string;
        owned?: boolean;
        email?: string | null;
        maritalStatus?: string | null;
        fatherName?: string | null;
        motherName?: string | null;
        hasEmail?: boolean;
        hasMaritalStatus?: boolean;
        hasFatherName?: boolean;
        hasMotherName?: boolean;
      }
    | null;
  passport:
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
  consulate: { _id: Id<"consulates">; city?: { name: string } | null } | null;
  requesterProfile: { fullName?: string; email?: string } | null;
}

export type ProcessRequestDetail = ProcessRequestListItem;
