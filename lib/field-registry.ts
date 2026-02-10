/**
 * Registry of available fields per entity type.
 * Used by UI comboboxes when creating field mappings and info requirements.
 */

export interface FieldRegistryEntry {
  fieldPath: string
  label: string
  labelEn: string
  fieldType: "text" | "date" | "number" | "select" | "city" | "country"
}

export type EntityType = "person" | "individualProcess" | "passport" | "company"

export const ENTITY_TYPE_LABELS: Record<EntityType, { label: string; labelEn: string }> = {
  person: { label: "Pessoa", labelEn: "Person" },
  individualProcess: { label: "Processo Individual", labelEn: "Individual Process" },
  passport: { label: "Passaporte", labelEn: "Passport" },
  company: { label: "Empresa", labelEn: "Company" },
}

export const FIELD_REGISTRY: Record<EntityType, FieldRegistryEntry[]> = {
  person: [
    { fieldPath: "givenNames", label: "Nome(s)", labelEn: "Given name(s)", fieldType: "text" },
    { fieldPath: "middleName", label: "Nome do meio", labelEn: "Middle name", fieldType: "text" },
    { fieldPath: "surname", label: "Sobrenome", labelEn: "Surname", fieldType: "text" },
    { fieldPath: "email", label: "E-mail", labelEn: "Email", fieldType: "text" },
    { fieldPath: "cpf", label: "CPF", labelEn: "CPF", fieldType: "text" },
    { fieldPath: "birthDate", label: "Data de nascimento", labelEn: "Date of birth", fieldType: "date" },
    { fieldPath: "birthCityId", label: "Cidade de nascimento", labelEn: "City of birth", fieldType: "city" },
    { fieldPath: "nationalityId", label: "Nacionalidade", labelEn: "Nationality", fieldType: "country" },
    { fieldPath: "maritalStatus", label: "Estado civil", labelEn: "Marital status", fieldType: "select" },
    { fieldPath: "profession", label: "Profissao", labelEn: "Profession", fieldType: "text" },
    { fieldPath: "cargo", label: "Cargo", labelEn: "Position", fieldType: "text" },
    { fieldPath: "currentCityId", label: "Cidade de residencia", labelEn: "City of residence", fieldType: "city" },
    { fieldPath: "residenceSince", label: "Desde quando reside", labelEn: "Residing since", fieldType: "date" },
    { fieldPath: "motherName", label: "Nome da mae", labelEn: "Mother's name", fieldType: "text" },
    { fieldPath: "fatherName", label: "Nome do pai", labelEn: "Father's name", fieldType: "text" },
    { fieldPath: "phoneNumber", label: "Telefone", labelEn: "Phone number", fieldType: "text" },
    { fieldPath: "address", label: "Endereco", labelEn: "Address", fieldType: "text" },
  ],
  individualProcess: [
    { fieldPath: "funcao", label: "Funcao / Duty", labelEn: "Function / Duty", fieldType: "text" },
    { fieldPath: "monthlyAmountToReceive", label: "Salario mensal (BRL)", labelEn: "Monthly salary (BRL)", fieldType: "number" },
    { fieldPath: "firstEntryDate", label: "Data do 1o ingresso no Brasil", labelEn: "Date of 1st entry in Brazil", fieldType: "date" },
    { fieldPath: "qualification", label: "Qualificacao", labelEn: "Qualification", fieldType: "select" },
    { fieldPath: "professionalExperienceSince", label: "Experiencia profissional desde", labelEn: "Professional experience since", fieldType: "date" },
  ],
  passport: [
    { fieldPath: "passportNumber", label: "Numero do passaporte", labelEn: "Passport number", fieldType: "text" },
    { fieldPath: "issueDate", label: "Data de expedicao", labelEn: "Issue date", fieldType: "date" },
    { fieldPath: "expiryDate", label: "Valido ate", labelEn: "Valid until", fieldType: "date" },
    { fieldPath: "issuingCountryId", label: "Pais emissor", labelEn: "Issuing country", fieldType: "country" },
  ],
  company: [
    { fieldPath: "taxId", label: "CNPJ", labelEn: "Tax ID (CNPJ)", fieldType: "text" },
    { fieldPath: "name", label: "Razao social", labelEn: "Company name", fieldType: "text" },
    { fieldPath: "email", label: "E-mail da empresa", labelEn: "Company email", fieldType: "text" },
    { fieldPath: "phoneNumber", label: "Telefone da empresa", labelEn: "Company phone", fieldType: "text" },
  ],
}

export const RESPONSIBLE_PARTY_OPTIONS = [
  { value: "client", label: "Cliente", labelEn: "Client" },
  { value: "admin", label: "Admin", labelEn: "Admin" },
  { value: "company", label: "Empresa", labelEn: "Company" },
] as const

export const WORKFLOW_TYPE_OPTIONS = [
  { value: "upload", label: "Upload", labelEn: "Upload" },
  { value: "prepare_and_sign", label: "Preparar e assinar", labelEn: "Prepare and sign" },
  { value: "admin_prepare", label: "Admin prepara", labelEn: "Admin prepares" },
] as const

/**
 * Get a field entry from the registry
 */
export function getFieldEntry(entityType: EntityType, fieldPath: string): FieldRegistryEntry | undefined {
  return FIELD_REGISTRY[entityType]?.find((f) => f.fieldPath === fieldPath)
}

/**
 * Get all entity types as options
 */
export function getEntityTypeOptions() {
  return Object.entries(ENTITY_TYPE_LABELS).map(([value, labels]) => ({
    value: value as EntityType,
    label: labels.label,
    labelEn: labels.labelEn,
  }))
}
