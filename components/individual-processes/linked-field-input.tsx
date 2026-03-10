"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CPFInput } from "@/components/ui/cpf-input"
import { CNPJInput } from "@/components/ui/cnpj-input"
import { PhoneInput } from "@/components/ui/phone-input"

export const MARITAL_STATUS_OPTIONS = [
  { value: "Single", label: "Solteiro(a)", labelEn: "Single" },
  { value: "Married", label: "Casado(a)", labelEn: "Married" },
  { value: "Divorced", label: "Divorciado(a)", labelEn: "Divorced" },
  { value: "Widowed", label: "Viúvo(a)", labelEn: "Widowed" },
]

export const QUALIFICATION_OPTIONS = [
  { value: "medio", label: "Médio", labelEn: "High School" },
  { value: "tecnico", label: "Técnico", labelEn: "Technical" },
  { value: "superior", label: "Superior", labelEn: "College" },
  { value: "naoPossui", label: "Não possui", labelEn: "None" },
]

/** Inline input component for editing linked field values */
export function LinkedFieldInput({
  field,
  value,
  onChange,
}: {
  field: { fieldType: string; fieldPath: string; entityType: string }
  value: string | number
  onChange: (val: string | number) => void
}) {
  // CPF field (person.cpf) — masked input
  if (field.fieldPath === "cpf" && field.entityType === "person") {
    return (
      <CPFInput
        className="h-8 text-xs"
        value={String(value)}
        onChange={(val) => onChange(val)}
      />
    )
  }

  // CNPJ / Tax ID field (company.taxId) — masked input
  if (field.fieldPath === "taxId" && field.entityType === "company") {
    return (
      <CNPJInput
        className="h-8 text-xs"
        value={String(value)}
        onChange={(val) => onChange(val)}
      />
    )
  }

  // Phone number fields — masked input with country selector
  if (field.fieldPath === "phoneNumber") {
    return (
      <PhoneInput
        className="h-8 text-xs"
        value={String(value)}
        onChange={(val) => onChange(val)}
        defaultCountry="BR"
      />
    )
  }

  // Select fields
  if (field.fieldPath === "maritalStatus") {
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MARITAL_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.fieldPath === "qualification") {
    return (
      <Select value={String(value)} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {QUALIFICATION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Date fields
  if (field.fieldType === "date") {
    return (
      <Input
        type="date"
        className="h-8 text-xs"
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  // Number fields
  if (field.fieldType === "number") {
    return (
      <Input
        type="number"
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        step="0.01"
      />
    )
  }

  // Default: text input
  return (
    <Input
      type="text"
      className="h-8 text-xs"
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
