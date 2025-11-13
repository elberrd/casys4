"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from "next-intl"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Id } from "@/convex/_generated/dataModel"

interface UserApplicantSelectorProps {
  companyId: string | undefined
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * UserApplicantSelector component
 *
 * Displays a combobox for selecting a user applicant (person) filtered by company.
 * Only shows people who have current relationships with the selected company.
 *
 * Features:
 * - Cascading filter: requires company to be selected first
 * - Search/filter by person name (accent-insensitive)
 * - Clear button to remove selection
 * - Empty states for different scenarios (no company selected, company has no users)
 * - Respects role-based access control (admin sees all, client sees their company)
 */
export function UserApplicantSelector({
  companyId,
  value,
  onChange,
  disabled = false,
}: UserApplicantSelectorProps) {
  const t = useTranslations("IndividualProcesses")

  // Only fetch people if a company is selected
  const people = useQuery(
    api.people.listPeopleByCompany,
    companyId ? { companyId: companyId as Id<"companies"> } : "skip"
  ) ?? []

  // If no company selected, show prompt message
  if (!companyId) {
    return (
      <Combobox
        options={[]}
        value={undefined}
        onValueChange={() => {}}
        placeholder={t("selectCompanyFirst")}
        searchPlaceholder={t("selectUserApplicant")}
        emptyText={t("selectCompanyFirst")}
        disabled={true}
        showClearButton={false}
      />
    )
  }

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
      emptyText={t("companyHasNoUsers")}
      disabled={disabled}
      showClearButton={true}
      clearButtonAriaLabel={t("clearUserApplicant")}
    />
  )
}
