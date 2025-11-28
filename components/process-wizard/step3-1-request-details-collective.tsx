"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"
import { QuickUserApplicantFormDialog } from "@/components/individual-processes/quick-user-applicant-form-dialog"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"

interface Step3_1RequestDetailsCollectiveProps {
  wizard: UseWizardStateReturn
}

export function Step3_1RequestDetailsCollective({ wizard }: Step3_1RequestDetailsCollectiveProps) {
  const t = useTranslations("ProcessWizard")
  const tIndividual = useTranslations("IndividualProcesses")

  const { wizardData, updateData } = wizard

  const [quickUserApplicantDialogOpen, setQuickUserApplicantDialogOpen] = useState(false)

  const handleQuickUserApplicantSuccess = (personId: Id<"people">) => {
    updateData("userApplicantId", personId as string)
    setQuickUserApplicantDialogOpen(false)
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

      {/* Quick Add Dialog */}
      <QuickUserApplicantFormDialog
        open={quickUserApplicantDialogOpen}
        onOpenChange={setQuickUserApplicantDialogOpen}
        onSuccess={handleQuickUserApplicantSuccess}
      />
    </div>
  )
}
