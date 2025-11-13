"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from "next-intl"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"

interface CompanyApplicantSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/**
 * CompanyApplicantSelector component
 *
 * Displays a combobox for selecting a company applicant.
 * Shows all active companies that the user has access to.
 *
 * Features:
 * - Search/filter by company name (accent-insensitive)
 * - Clear button to remove selection
 * - Empty state when no companies are available
 * - Respects role-based access control (admin sees all, client sees their company)
 */
export function CompanyApplicantSelector({
  value,
  onChange,
  disabled = false,
}: CompanyApplicantSelectorProps) {
  const t = useTranslations("IndividualProcesses")

  // Fetch active companies using the listActive query
  const companies = useQuery(api.companies.listActive, {}) ?? []

  // Map to ComboboxOption format
  const options: ComboboxOption[] = companies.map((company) => ({
    value: company._id,
    label: company.name,
  }))

  return (
    <Combobox
      options={options}
      value={value || undefined}
      onValueChange={(newValue) => onChange(newValue || "")}
      placeholder={t("selectCompanyApplicant")}
      searchPlaceholder={t("selectCompanyApplicant")}
      emptyText={t("noApplicantsFound")}
      disabled={disabled}
      showClearButton={true}
      clearButtonAriaLabel={t("clearCompanyApplicant")}
    />
  )
}
