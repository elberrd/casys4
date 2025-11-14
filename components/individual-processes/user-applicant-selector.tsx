"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from "next-intl"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Id } from "@/convex/_generated/dataModel"

interface UserApplicantSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * UserApplicantSelector component
 *
 * Displays a combobox for selecting a user applicant (person).
 * Shows only people who have companies associated with them.
 *
 * Features:
 * - Only shows people with company relationships
 * - Search/filter by person name (accent-insensitive)
 * - Clear button to remove selection
 * - Respects role-based access control (admin sees all, client sees their company)
 */
export function UserApplicantSelector({
  value,
  onChange,
  disabled = false,
}: UserApplicantSelectorProps) {
  const t = useTranslations("IndividualProcesses")

  // Fetch only people who have companies associated
  const people = useQuery(api.people.listPeopleWithCompanies, {}) ?? []

  // Map to ComboboxOption format
  const options: ComboboxOption[] = people.map((person) => ({
    value: person._id,
    label: person.fullName,
  }))

  return (
    <Combobox
      options={options}
      value={value || undefined}
      onValueChange={(newValue) => onChange(newValue || "")}
      placeholder={t("selectUserApplicant")}
      searchPlaceholder={t("selectUserApplicant")}
      emptyText={t("noApplicantsFound")}
      disabled={disabled}
      showClearButton={true}
      clearButtonAriaLabel={t("clearUserApplicant")}
    />
  )
}
