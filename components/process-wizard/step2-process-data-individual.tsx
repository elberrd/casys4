"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PersonSelectorWithDetail } from "@/components/individual-processes/person-selector-with-detail"
import { UserApplicantSelector } from "@/components/individual-processes/user-applicant-selector"
import { CompanyApplicantSelector } from "@/components/individual-processes/company-applicant-selector"
import { QuickPersonFormDialog } from "@/components/individual-processes/quick-person-form-dialog"
import { QuickUserApplicantFormDialog } from "@/components/individual-processes/quick-user-applicant-form-dialog"
import { QuickCompanyApplicantFormDialog } from "@/components/individual-processes/quick-company-applicant-form-dialog"
import { QuickConsulateFormDialog } from "@/components/individual-processes/quick-consulate-form-dialog"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations, useLocale } from "next-intl"
import { Plus, Trash2, AlertCircle, Users } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { CandidateData } from "@/lib/validations/process-wizard"

interface Step2ProcessDataIndividualProps {
  wizard: UseWizardStateReturn
}

export function Step2ProcessDataIndividual({ wizard }: Step2ProcessDataIndividualProps) {
  const t = useTranslations("ProcessWizard")
  const tIndividual = useTranslations("IndividualProcesses")
  const locale = useLocale()

  const { wizardData, updateData, addCandidate, removeCandidate } = wizard

  // Quick add dialog states
  const [quickPersonDialogOpen, setQuickPersonDialogOpen] = useState(false)
  const [quickUserApplicantDialogOpen, setQuickUserApplicantDialogOpen] = useState(false)
  const [quickCompanyApplicantDialogOpen, setQuickCompanyApplicantDialogOpen] = useState(false)
  const [quickConsulateDialogOpen, setQuickConsulateDialogOpen] = useState(false)

  // State for previous process type to clear legal framework when authorization type changes
  const [previousProcessTypeId, setPreviousProcessTypeId] = useState<string>("")

  // New candidate form state
  const [newCandidatePersonId, setNewCandidatePersonId] = useState<string>("")
  const [newCandidateConsulateId, setNewCandidateConsulateId] = useState<string>("")
  const [newCandidateRequestDate, setNewCandidateRequestDate] = useState<string>(
    wizardData.requestDate || new Date().toISOString().split('T')[0]
  )

  // Data fetching
  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []
  const consulates = useQuery(api.consulates.list, {}) ?? []
  const people = useQuery(api.people.list, {}) ?? []

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

  // Options for dropdowns
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

  // Helper functions
  const getPersonName = (personId: string): string => {
    const person = people.find((p) => p._id === personId)
    return person?.fullName || "-"
  }

  const getConsulateName = (consulateId: string): string => {
    if (!consulateId) return "-"
    const consulate = consulates.find((c) => c._id === consulateId)
    if (!consulate) return "-"
    const cityName = consulate.city?.name ?? ""
    const stateName = consulate.state?.name ?? ""
    const countryName = consulate.country?.name ?? ""
    return [cityName, stateName, countryName].filter(Boolean).join(", ") || "-"
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US")
  }

  // Handlers
  const handleAddCandidate = () => {
    if (!newCandidatePersonId) return

    // Check for duplicates
    const isDuplicate = wizardData.candidates.some((c) => c.personId === newCandidatePersonId)
    if (isDuplicate) {
      return // Could show a toast here
    }

    const newCandidate: CandidateData = {
      personId: newCandidatePersonId as Id<"people">,
      requestDate: newCandidateRequestDate,
      consulateId: newCandidateConsulateId ? (newCandidateConsulateId as Id<"consulates">) : undefined,
    }

    addCandidate(newCandidate)
    setNewCandidatePersonId("")
    setNewCandidateConsulateId("")
    setNewCandidateRequestDate(wizardData.requestDate || new Date().toISOString().split('T')[0])
  }

  const handleRemoveCandidate = (index: number) => {
    removeCandidate(index)
  }

  const handleQuickPersonSuccess = (personId: Id<"people">) => {
    setNewCandidatePersonId(personId as string)
    setQuickPersonDialogOpen(false)
  }

  const handleQuickUserApplicantSuccess = (personId: Id<"people">) => {
    updateData("userApplicantId", personId as string)
    setQuickUserApplicantDialogOpen(false)
  }

  const handleQuickCompanyApplicantSuccess = (companyId: Id<"companies">) => {
    updateData("companyApplicantId", companyId as string)
    setQuickCompanyApplicantDialogOpen(false)
  }

  const handleQuickConsulateSuccess = (consulateId: Id<"consulates">) => {
    setNewCandidateConsulateId(consulateId as string)
    setQuickConsulateDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* General/Shared Data Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("processData")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Company Applicant (Empresa Requerente) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("companyApplicant")}</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <Separator />

      {/* Candidates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <h3 className="text-base font-semibold">{t("candidates")}</h3>
              <p className="text-sm text-muted-foreground">{t("candidatesIndividualDescription")}</p>
            </div>
          </div>
          {wizardData.candidates.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {wizardData.candidates.length} {wizardData.candidates.length === 1 ? t("candidateSingular") : t("candidatePlural")}
            </span>
          )}
        </div>

        {/* Add New Candidate Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("addNewCandidate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Request Date - First field */}
                <div className="space-y-2">
                  <div className="flex items-center h-7">
                    <Label>{t("requestDate")}</Label>
                  </div>
                  <DatePicker
                    value={newCandidateRequestDate}
                    onChange={(value) => setNewCandidateRequestDate(value || new Date().toISOString().split('T')[0])}
                  />
                </div>

                {/* Candidate selector - Second field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("selectCandidate")} *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuickPersonDialogOpen(true)}
                      className="h-7 w-7"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <PersonSelectorWithDetail
                    value={newCandidatePersonId}
                    onChange={(value) => setNewCandidatePersonId(value)}
                  />
                </div>

                {/* Consulate selector - Third field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("consulate")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuickConsulateDialogOpen(true)}
                      className="h-7 w-7"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Combobox
                    options={consulateOptions}
                    value={newCandidateConsulateId}
                    onValueChange={(value) => setNewCandidateConsulateId(value ?? "")}
                    placeholder={t("selectConsulate")}
                    searchPlaceholder={t("searchConsulates")}
                    emptyText={t("noConsulatesFound")}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleAddCandidate}
                  disabled={!newCandidatePersonId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addCandidate")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        {wizardData.candidates.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>{t("requestDate")}</TableHead>
                  <TableHead>{t("candidate")}</TableHead>
                  <TableHead>{t("consulate")}</TableHead>
                  <TableHead className="w-[80px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizardData.candidates.map((candidate, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{formatDate(candidate.requestDate)}</TableCell>
                    <TableCell>{getPersonName(candidate.personId as string)}</TableCell>
                    <TableCell>{getConsulateName(candidate.consulateId as string || "")}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCandidate(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t("noCandidatesAdded")}</p>
            </CardContent>
          </Card>
        )}
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

      <QuickCompanyApplicantFormDialog
        open={quickCompanyApplicantDialogOpen}
        onOpenChange={setQuickCompanyApplicantDialogOpen}
        onSuccess={handleQuickCompanyApplicantSuccess}
      />

      <QuickConsulateFormDialog
        open={quickConsulateDialogOpen}
        onOpenChange={setQuickConsulateDialogOpen}
        onSuccess={handleQuickConsulateSuccess}
      />
    </div>
  )
}
