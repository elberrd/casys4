"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from "next-intl"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"

interface ApplicantSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * ApplicantSelector component
 *
 * Displays a combobox for selecting an applicant (person with company).
 * Only shows people who have current company relationships.
 * Display format: "Person Name - Company Name"
 *
 * Features:
 * - Search/filter by person name or company name (accent-insensitive)
 * - Clear button to remove selection
 * - Empty state when no applicants are available
 * - Respects role-based access control (admin sees all, client sees their company)
 */
export function ApplicantSelector({
  value,
  onChange,
  disabled = false,
}: ApplicantSelectorProps) {
  const t = useTranslations("IndividualProcesses")

  // Fetch people with companies using the new query
  const peopleWithCompanies = useQuery(api.people.listPeopleWithCompanies, {}) ?? []

  // Map to ComboboxOption format with "Person Name - Company Name" as label
  const options: ComboboxOption[] = peopleWithCompanies.map((person) => ({
    value: person._id,
    label: `${person.fullName} - ${person.companyName}`,
  }))

  return (
    <Combobox
      options={options}
      value={value || undefined}
      onValueChange={(newValue) => onChange(newValue || "")}
      placeholder={t("selectApplicant")}
      searchPlaceholder={t("searchApplicant")}
      emptyText={t("noApplicantsFound")}
      disabled={disabled}
      showClearButton={true}
      clearButtonAriaLabel={t("clearApplicant")}
    />
  )
}
