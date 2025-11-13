/**
 * Field metadata for individual process fields that can be configured as fillable
 * from status records.
 *
 * This centralized configuration defines:
 * - Available fields from individualProcesses table
 * - Field types for proper form rendering
 * - i18n label keys for localization
 * - Reference tables for relationship fields
 */

export type FieldType = "string" | "date" | "datetime" | "reference";

export interface FieldMetadata {
  /** Technical field name in the database */
  fieldName: string;
  /** i18n key for field label (e.g., "IndividualProcesses.fields.protocolNumber") */
  labelKey: string;
  /** Field type determines which UI component to render */
  fieldType: FieldType;
  /** For reference fields, which table does this reference */
  referenceTable?: string;
  /** For reference fields, query to fetch options */
  referenceQuery?: string;
}

/**
 * All fillable fields from individualProcesses table
 * These fields can be selected by admins to be fillable from a specific status
 */
export const FILLABLE_FIELDS: readonly FieldMetadata[] = [
  {
    fieldName: "passportId",
    labelKey: "IndividualProcesses.fields.passportId",
    fieldType: "reference",
    referenceTable: "passports",
    referenceQuery: "passports:list",
  },
  {
    fieldName: "applicantId",
    labelKey: "IndividualProcesses.fields.applicantId",
    fieldType: "reference",
    referenceTable: "people",
    referenceQuery: "people:list",
  },
  {
    fieldName: "processTypeId",
    labelKey: "IndividualProcesses.fields.processTypeId",
    fieldType: "reference",
    referenceTable: "processTypes",
    referenceQuery: "processTypes:list",
  },
  {
    fieldName: "legalFrameworkId",
    labelKey: "IndividualProcesses.fields.legalFrameworkId",
    fieldType: "reference",
    referenceTable: "legalFrameworks",
    referenceQuery: "legalFrameworks:list",
  },
  {
    fieldName: "cboId",
    labelKey: "IndividualProcesses.fields.cboId",
    fieldType: "reference",
    referenceTable: "cboCodes",
    referenceQuery: "cboCodes:list",
  },
  {
    fieldName: "mreOfficeNumber",
    labelKey: "IndividualProcesses.fields.mreOfficeNumber",
    fieldType: "string",
  },
  {
    fieldName: "douNumber",
    labelKey: "IndividualProcesses.fields.douNumber",
    fieldType: "string",
  },
  {
    fieldName: "douSection",
    labelKey: "IndividualProcesses.fields.douSection",
    fieldType: "string",
  },
  {
    fieldName: "douPage",
    labelKey: "IndividualProcesses.fields.douPage",
    fieldType: "string",
  },
  {
    fieldName: "douDate",
    labelKey: "IndividualProcesses.fields.douDate",
    fieldType: "date",
  },
  {
    fieldName: "protocolNumber",
    labelKey: "IndividualProcesses.fields.protocolNumber",
    fieldType: "string",
  },
  {
    fieldName: "rnmNumber",
    labelKey: "IndividualProcesses.fields.rnmNumber",
    fieldType: "string",
  },
  {
    fieldName: "rnmDeadline",
    labelKey: "IndividualProcesses.fields.rnmDeadline",
    fieldType: "date",
  },
  {
    fieldName: "appointmentDateTime",
    labelKey: "IndividualProcesses.fields.appointmentDateTime",
    fieldType: "datetime",
  },
  {
    fieldName: "deadlineDate",
    labelKey: "IndividualProcesses.fields.deadlineDate",
    fieldType: "date",
  },
] as const;

/**
 * Get field metadata by field name
 */
export function getFieldMetadata(fieldName: string): FieldMetadata | undefined {
  return FILLABLE_FIELDS.find((field) => field.fieldName === fieldName);
}

/**
 * Validate that field names are valid
 */
export function validateFieldNames(fieldNames: string[]): boolean {
  const validFieldNames = FILLABLE_FIELDS.map((f) => f.fieldName);
  return fieldNames.every((name) => validFieldNames.includes(name));
}

/**
 * Get field metadata for multiple field names
 */
export function getFieldsMetadata(fieldNames: string[]): FieldMetadata[] {
  return fieldNames
    .map((name) => getFieldMetadata(name))
    .filter((meta): meta is FieldMetadata => meta !== undefined);
}
