"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"
import { CompanyApplicantSelector } from "@/components/individual-processes/company-applicant-selector"
import { QuickUserApplicantFormDialog } from "@/components/individual-processes/quick-user-applicant-form-dialog"
import { QuickCompanyApplicantFormDialog } from "@/components/individual-processes/quick-company-applicant-form-dialog"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"

interface Step2CollectiveMergedProps {
  wizard: UseWizardStateReturn
}

export function Step2CollectiveMerged({ wizard }: Step2CollectiveMergedProps) {
  const t = useTranslations("ProcessWizard")
  const tIndividual = useTranslations("IndividualProcesses")

  const { wizardData, updateData } = wizard

  const [quickUserApplicantDialogOpen, setQuickUserApplicantDialogOpen] = useState(false)
  const [quickCompanyApplicantDialogOpen, setQuickCompanyApplicantDialogOpen] = useState(false)
  const [previousProcessTypeId, setPreviousProcessTypeId] = useState<string>("")

  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []

  // Get filtered legal frameworks based on selected authorization type
  const filteredLegalFrameworks = useQuery(
    api.processTypes.getLegalFrameworks,
    wizardData.processTypeId && wizardData.processTypeId !== ""
      ? { processTypeId: wizardData.processTypeId as Id<"processTypes"> }
      : "skip"
  )

  // Fallback to all legal frameworks if no authorization type selected
  const allLegalFrameworks = useQuery(api.legalFrameworks.listActive, {})

  // Use filtered or all legal frameworks
  const legalFrameworks = wizardData.processTypeId && wizardData.processTypeId !== ""
    ? (filteredLegalFrameworks ?? [])
    : (allLegalFrameworks ?? [])

  // Clear legal framework when authorization type changes
  useEffect(() => {
    if (previousProcessTypeId && previousProcessTypeId !== wizardData.processTypeId) {
      if (wizardData.legalFrameworkId) {
        updateData("legalFrameworkId", "")
      }
    }
    setPreviousProcessTypeId(wizardData.processTypeId || "")
  }, [wizardData.processTypeId, previousProcessTypeId, wizardData.legalFrameworkId, updateData])

  const processTypeOptions = processTypes.map((processType) => ({
    value: processType._id,
    label: processType.name,
  }))

  const legalFrameworkOptions = legalFrameworks
    .filter((framework): framework is NonNullable<typeof framework> => framework !== null)
    .map((framework) => ({
      value: framework._id,
      label: framework.name,
    }))

  const handleQuickUserApplicantSuccess = (personId: Id<"people">) => {
    updateData("userApplicantId", personId as string)
    setQuickUserApplicantDialogOpen(false)
  }

  const handleQuickCompanyApplicantSuccess = (companyId: Id<"companies">) => {
    updateData("companyApplicantId", companyId as string)
    setQuickCompanyApplicantDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* User Applicant (Solicitante) Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("requestDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Process Data Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("processData")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Authorization Type (Process Type) */}
          <div className="space-y-2">
            <Label>{t("authorizationType")} *</Label>
            <Combobox
              options={processTypeOptions}
              value={wizardData.processTypeId}
              onValueChange={(value) => updateData("processTypeId", value ?? "")}
              placeholder={t("selectAuthorizationType")}
              searchPlaceholder={t("searchAuthorizationTypes")}
              emptyText={t("noAuthorizationTypesFound")}
            />
          </div>

          {/* Legal Framework (Amparo Legal) */}
          <div className="space-y-2">
            <Label>{t("legalFramework")} *</Label>
            <Combobox
              options={legalFrameworkOptions}
              value={wizardData.legalFrameworkId}
              onValueChange={(value) => updateData("legalFrameworkId", value ?? "")}
              placeholder={t("selectLegalFramework")}
              searchPlaceholder={t("searchLegalFrameworks")}
              emptyText={t("noLegalFrameworksFound")}
            />
            {wizardData.processTypeId && legalFrameworkOptions.length === 0 && (
              <p className="text-xs text-yellow-600">{t("noLegalFrameworksForType")}</p>
            )}
          </div>

          {/* Company Applicant (Empresa Requerente) - Required for collective */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("companyApplicant")} *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuickCompanyApplicantDialogOpen(true)}
                className="h-7"
              >
                <Plus className="h-4 w-4 mr-1" />
                {tIndividual("quickAddCompanyApplicant")}
              </Button>
            </div>
            <CompanyApplicantSelector
              value={wizardData.companyApplicantId}
              onChange={(value) => updateData("companyApplicantId", value)}
            />
          </div>

          {/* Deadline Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">{t("deadline")}</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("deadlineUnit")}</Label>
                <Select
                  value={wizardData.deadlineUnit}
                  onValueChange={(value) => updateData("deadlineUnit", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectDeadlineUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="years">{t("deadlineUnits.years")}</SelectItem>
                    <SelectItem value="months">{t("deadlineUnits.months")}</SelectItem>
                    <SelectItem value="days">{t("deadlineUnits.days")}</SelectItem>
                    <SelectItem value="prefixed">{t("deadlineUnits.prefixed")}</SelectItem>
                    <SelectItem value="indeterminate">{t("deadlineUnits.indeterminate")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(wizardData.deadlineUnit === "days" ||
                wizardData.deadlineUnit === "months" ||
                wizardData.deadlineUnit === "years") && (
                <div className="space-y-2">
                  <Label>{t("deadlineQuantity")}</Label>
                  <Input
                    type="number"
                    placeholder={t("enterDeadlineQuantity")}
                    value={wizardData.deadlineQuantity ?? ""}
                    onChange={(e) =>
                      updateData(
                        "deadlineQuantity",
                        e.target.value === "" ? undefined : parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              )}

              {wizardData.deadlineUnit === "prefixed" && (
                <div className="space-y-2">
                  <Label>{t("deadlineSpecificDate")}</Label>
                  <DatePicker
                    value={wizardData.deadlineSpecificDate}
                    onChange={(value) => updateData("deadlineSpecificDate", value || "")}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Dialogs */}
      <QuickUserApplicantFormDialog
        open={quickUserApplicantDialogOpen}
        onOpenChange={setQuickUserApplicantDialogOpen}
        onSuccess={handleQuickUserApplicantSuccess}
      />

      <QuickCompanyApplicantFormDialog
        open={quickCompanyApplicantDialogOpen}
        onOpenChange={setQuickCompanyApplicantDialogOpen}
        onSuccess={handleQuickCompanyApplicantSuccess}
      />
    </div>
  )
}
