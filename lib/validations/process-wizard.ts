import { z } from "zod";
import { Id } from "@/convex/_generated/dataModel";

// Step 1: Process Type Selection
export const processTypeSelectionSchema = z.object({
  processType: z.enum(["individual", "collective"], {
    message: "Selecione o tipo de processo",
  }),
});

export type ProcessTypeSelectionData = z.infer<typeof processTypeSelectionSchema>;

// Step 2.1 / 3.1: Request Details (Individual / Collective)
export const requestDetailsSchema = z.object({
  requestDate: z.string().min(1, "Data da solicitação é obrigatória"),
  userApplicantId: z
    .custom<Id<"people">>((val) => typeof val === "string" && val.length > 0, {
      message: "Solicitante é obrigatório",
    }),
  consulateId: z
    .custom<Id<"consulates">>((val) => typeof val === "string", {
      message: "ID do consulado inválido",
    })
    .optional()
    .or(z.literal("")),
});

// Additional field for individual process - candidate
export const requestDetailsIndividualSchema = requestDetailsSchema.extend({
  personId: z.custom<Id<"people">>((val) => typeof val === "string" && val.length > 0, {
    message: "Candidato é obrigatório",
  }),
});

export type RequestDetailsData = z.infer<typeof requestDetailsSchema>;
export type RequestDetailsIndividualData = z.infer<typeof requestDetailsIndividualSchema>;

// Step 2.2 / 3.2: Process Data (Individual - company is optional)
export const processDataSchema = z.object({
  processTypeId: z.custom<Id<"processTypes">>((val) => typeof val === "string" && val.length > 0, {
    message: "Tipo de autorização é obrigatório",
  }),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string" && val.length > 0, {
    message: "Amparo legal é obrigatório",
  }),
  companyApplicantId: z
    .custom<Id<"companies">>((val) => typeof val === "string", {
      message: "ID da empresa inválido",
    })
    .optional()
    .or(z.literal("")),
  deadlineUnit: z.string().optional().or(z.literal("")),
  deadlineQuantity: z.coerce.number().optional(),
  deadlineSpecificDate: z.string().optional().or(z.literal("")),
});

// Step 3.2: Process Data for Collective (company is required)
export const processDataCollectiveSchema = z.object({
  processTypeId: z.custom<Id<"processTypes">>((val) => typeof val === "string" && val.length > 0, {
    message: "Tipo de autorização é obrigatório",
  }),
  legalFrameworkId: z.custom<Id<"legalFrameworks">>((val) => typeof val === "string" && val.length > 0, {
    message: "Amparo legal é obrigatório",
  }),
  companyApplicantId: z.custom<Id<"companies">>((val) => typeof val === "string" && val.length > 0, {
    message: "Empresa requerente é obrigatória para processos coletivos",
  }),
  deadlineUnit: z.string().optional().or(z.literal("")),
  deadlineQuantity: z.coerce.number().optional(),
  deadlineSpecificDate: z.string().optional().or(z.literal("")),
});

export type ProcessDataFormData = z.infer<typeof processDataSchema>;

// Step 3.3: Candidates for Collective Process
export const candidateSchema = z.object({
  personId: z.custom<Id<"people">>((val) => typeof val === "string" && val.length > 0, {
    message: "Candidato é obrigatório",
  }),
  requestDate: z.string().min(1, "Data da solicitação é obrigatória"),
  consulateId: z
    .custom<Id<"consulates">>((val) => typeof val === "string", {
      message: "ID do consulado inválido",
    })
    .optional()
    .or(z.literal("")),
});

export const candidatesSchema = z.object({
  candidates: z.array(candidateSchema).min(1, "Adicione pelo menos um candidato"),
});

export type CandidateData = z.infer<typeof candidateSchema>;
export type CandidatesFormData = z.infer<typeof candidatesSchema>;

// Complete wizard state type
export interface WizardState {
  // Step 1
  processType?: "individual" | "collective";

  // Step 2.1 / 3.1 - Request Details
  requestDate: string;
  userApplicantId: string;
  consulateId: string;

  // Step 2.1 only - Individual candidate
  personId: string;

  // Step 2.2 / 3.2 - Process Data
  processTypeId: string;
  legalFrameworkId: string;
  companyApplicantId: string;
  deadlineUnit: string;
  deadlineQuantity?: number;
  deadlineSpecificDate: string;

  // Step 3.3 - Collective candidates
  candidates: CandidateData[];
}

export const initialWizardState: WizardState = {
  processType: undefined,
  requestDate: new Date().toISOString().split('T')[0],
  userApplicantId: "",
  consulateId: "",
  personId: "",
  processTypeId: "",
  legalFrameworkId: "",
  companyApplicantId: "",
  deadlineUnit: "",
  deadlineQuantity: undefined,
  deadlineSpecificDate: "",
  candidates: [],
};

// Validation helpers
export function validateStep1(data: Partial<WizardState>): boolean {
  const result = processTypeSelectionSchema.safeParse({ processType: data.processType });
  return result.success;
}

export function validateStep2_1Individual(data: Partial<WizardState>): boolean {
  const result = requestDetailsIndividualSchema.safeParse({
    requestDate: data.requestDate,
    userApplicantId: data.userApplicantId,
    consulateId: data.consulateId,
    personId: data.personId,
  });
  return result.success;
}

export function validateStep2_2(data: Partial<WizardState>): boolean {
  const result = processDataSchema.safeParse({
    processTypeId: data.processTypeId,
    legalFrameworkId: data.legalFrameworkId,
    companyApplicantId: data.companyApplicantId,
    deadlineUnit: data.deadlineUnit,
    deadlineQuantity: data.deadlineQuantity,
    deadlineSpecificDate: data.deadlineSpecificDate,
  });
  return result.success;
}

export function validateStep3_2Collective(data: Partial<WizardState>): boolean {
  const result = processDataCollectiveSchema.safeParse({
    processTypeId: data.processTypeId,
    legalFrameworkId: data.legalFrameworkId,
    companyApplicantId: data.companyApplicantId,
    deadlineUnit: data.deadlineUnit,
    deadlineQuantity: data.deadlineQuantity,
    deadlineSpecificDate: data.deadlineSpecificDate,
  });
  return result.success;
}

export function validateStep3_1Collective(data: Partial<WizardState>): boolean {
  const result = requestDetailsSchema.safeParse({
    requestDate: data.requestDate,
    userApplicantId: data.userApplicantId,
    consulateId: data.consulateId,
  });
  return result.success;
}

export function validateStep3_3Candidates(data: Partial<WizardState>): boolean {
  const result = candidatesSchema.safeParse({
    candidates: data.candidates,
  });
  return result.success;
}
