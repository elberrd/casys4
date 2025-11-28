"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import { PersonSelectorWithDetail } from "@/components/individual-processes/person-selector-with-detail"
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"
import { QuickPersonFormDialog } from "@/components/individual-processes/quick-person-form-dialog"
import { QuickUserApplicantFormDialog } from "@/components/individual-processes/quick-user-applicant-form-dialog"
import { QuickConsulateFormDialog } from "@/components/individual-processes/quick-consulate-form-dialog"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"

interface Step2_1RequestDetailsIndividualProps {
  wizard: UseWizardStateReturn
}

export function Step2_1RequestDetailsIndividual({ wizard }: Step2_1RequestDetailsIndividualProps) {
  const t = useTranslations("ProcessWizard")
  const tIndividual = useTranslations("IndividualProcesses")

  const { wizardData, updateData } = wizard

  const [quickPersonDialogOpen, setQuickPersonDialogOpen] = useState(false)
  const [quickUserApplicantDialogOpen, setQuickUserApplicantDialogOpen] = useState(false)
  const [quickConsulateDialogOpen, setQuickConsulateDialogOpen] = useState(false)

  const consulates = useQuery(api.consulates.list, {}) ?? []

  const consulateOptions = consulates.map((consulate) => {
    const cityName = consulate.city?.name ?? ""
    const stateName = consulate.state?.name ?? ""
    const countryName = consulate.country?.name ?? ""
    const label = [cityName, stateName, countryName].filter(Boolean).join(", ") || consulate._id
    return {
      value: consulate._id,
      label,
    }
  })

  const handleQuickPersonSuccess = (personId: Id<"people">) => {
    updateData("personId", personId as string)
    setQuickPersonDialogOpen(false)
  }

  const handleQuickUserApplicantSuccess = (personId: Id<"people">) => {
    updateData("userApplicantId", personId as string)
    setQuickUserApplicantDialogOpen(false)
  }

  const handleQuickConsulateSuccess = (consulateId: Id<"consulates">) => {
    updateData("consulateId", consulateId as string)
    setQuickConsulateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Request Date */}
      <div className="space-y-2">
        <Label>{t("requestDate")}</Label>
        <DatePicker
          value={wizardData.requestDate}
          onChange={(value) => updateData("requestDate", value || "")}
        />
        <p className="text-xs text-muted-foreground">{t("requestDateDescription")}</p>
      </div>

      {/* User Applicant (Solicitante) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("userApplicant")} *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickUserApplicantDialogOpen(true)}
            className="h-7"
          >
            <Plus className="h-4 w-4 mr-1" />
            {tIndividual("quickAddUserApplicant")}
          </Button>
        </div>
        <UserApplicantSelector
          value={wizardData.userApplicantId}
          onChange={(value) => updateData("userApplicantId", value)}
        />
      </div>

      {/* Consulate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("consulate")}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickConsulateDialogOpen(true)}
            className="h-7"
          >
            <Plus className="h-4 w-4 mr-1" />
            {tIndividual("quickAddConsulate")}
          </Button>
        </div>
        <Combobox
          options={consulateOptions}
          value={wizardData.consulateId}
          onValueChange={(value) => updateData("consulateId", value ?? "")}
          placeholder={t("selectConsulate")}
          searchPlaceholder={t("searchConsulates")}
          emptyText={t("noConsulatesFound")}
        />
        <p className="text-xs text-muted-foreground">{t("consulateDescription")}</p>
      </div>

      {/* Candidate (Person) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("candidate")} *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setQuickPersonDialogOpen(true)}
            className="h-7"
          >
            <Plus className="h-4 w-4 mr-1" />
            {tIndividual("quickAddPerson")}
          </Button>
        </div>
        <PersonSelectorWithDetail
          value={wizardData.personId as Id<"people"> | ""}
          onChange={(value) => updateData("personId", value as string)}
        />
      </div>

      {/* Quick Add Dialogs */}
      <QuickPersonFormDialog
        open={quickPersonDialogOpen}
        onOpenChange={setQuickPersonDialogOpen}
        onSuccess={handleQuickPersonSuccess}
      />

      <QuickUserApplicantFormDialog
        open={quickUserApplicantDialogOpen}
        onOpenChange={setQuickUserApplicantDialogOpen}
        onSuccess={handleQuickUserApplicantSuccess}
      />

      <QuickConsulateFormDialog
        open={quickConsulateDialogOpen}
        onOpenChange={setQuickConsulateDialogOpen}
        onSuccess={handleQuickConsulateSuccess}
      />
    </div>
  )
}
