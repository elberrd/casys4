"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PersonSelectorWithDetail } from "@/components/individual-processes/person-selector-with-detail"
import { QuickPersonFormDialog } from "@/components/individual-processes/quick-person-form-dialog"
import { QuickConsulateFormDialog } from "@/components/individual-processes/quick-consulate-form-dialog"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations, useLocale } from "next-intl"
import { Plus, Trash2, AlertCircle } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { CandidateData } from "@/lib/validations/process-wizard"

interface Step3_3CandidatesCollectiveProps {
  wizard: UseWizardStateReturn
}

export function Step3_3CandidatesCollective({ wizard }: Step3_3CandidatesCollectiveProps) {
  const t = useTranslations("ProcessWizard")
  const tIndividual = useTranslations("IndividualProcesses")
  const locale = useLocale()

  const { wizardData, addCandidate, removeCandidate, updateCandidate } = wizard

  const [quickPersonDialogOpen, setQuickPersonDialogOpen] = useState(false)
  const [quickConsulateDialogOpen, setQuickConsulateDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newCandidatePersonId, setNewCandidatePersonId] = useState<string>("")
  const [newCandidateConsulateId, setNewCandidateConsulateId] = useState<string>("")

  // Fetch related data for summary
  const userApplicant = useQuery(
    api.people.get,
    wizardData.userApplicantId ? { id: wizardData.userApplicantId as Id<"people"> } : "skip"
  )

  const processType = useQuery(
    api.processTypes.get,
    wizardData.processTypeId ? { id: wizardData.processTypeId as Id<"processTypes"> } : "skip"
  )

  const legalFramework = useQuery(
    api.legalFrameworks.get,
    wizardData.legalFrameworkId ? { id: wizardData.legalFrameworkId as Id<"legalFrameworks"> } : "skip"
  )

  const companyApplicant = useQuery(
    api.companies.get,
    wizardData.companyApplicantId ? { id: wizardData.companyApplicantId as Id<"companies"> } : "skip"
  )

  const consulates = useQuery(api.consulates.list, {}) ?? []

  // Fetch people data for candidates display
  const people = useQuery(api.people.list, {}) ?? []

  // Consulate options for combobox
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

  const handleAddCandidate = () => {
    if (!newCandidatePersonId) return

    // Check for duplicates
    const isDuplicate = wizardData.candidates.some((c) => c.personId === newCandidatePersonId)
    if (isDuplicate) {
      return // Could show a toast here
    }

    const newCandidate: CandidateData = {
      personId: newCandidatePersonId as Id<"people">,
      requestDate: wizardData.requestDate,
      consulateId: newCandidateConsulateId ? (newCandidateConsulateId as Id<"consulates">) : undefined,
    }

    addCandidate(newCandidate)
    setNewCandidatePersonId("")
    setNewCandidateConsulateId("")
  }

  const handleQuickConsulateSuccess = (consulateId: Id<"consulates">) => {
    setNewCandidateConsulateId(consulateId as string)
    setQuickConsulateDialogOpen(false)
  }

  const handleQuickPersonSuccess = (personId: Id<"people">) => {
    setNewCandidatePersonId(personId as string)
    setQuickPersonDialogOpen(false)
  }

  const handleRemoveCandidate = (index: number) => {
    removeCandidate(index)
  }

  return (
    <div className="space-y-6">
      {/* Summary Card (Read-only) */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("processSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:gap-1">
              <span className="text-muted-foreground">{t("requestDate")}: </span>
              <span className="font-medium">{formatDate(wizardData.requestDate)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-1">
              <span className="text-muted-foreground">{t("userApplicant")}: </span>
              <span className="font-medium truncate">{userApplicant?.fullName || "-"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-1">
              <span className="text-muted-foreground">{t("authorizationType")}: </span>
              <span className="font-medium truncate">{processType?.name || "-"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-1">
              <span className="text-muted-foreground">{t("legalFramework")}: </span>
              <span className="font-medium truncate">{legalFramework?.name || "-"}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:gap-1">
              <span className="text-muted-foreground">{t("companyApplicant")}: </span>
              <span className="font-medium truncate">{companyApplicant?.name || "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Candidates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">{t("candidates")}</h3>
            <p className="text-sm text-muted-foreground">{t("candidatesDescription")}</p>
          </div>
        </div>

        {/* Add New Candidate - Now above the table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t("addNewCandidate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Candidate selector */}
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

                {/* Consulate selector */}
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

              <div className="flex justify-end">
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
                  <TableHead>#</TableHead>
                  <TableHead>{t("candidate")}</TableHead>
                  <TableHead>{t("consulate")}</TableHead>
                  <TableHead>{t("requestDate")}</TableHead>
                  <TableHead className="w-[80px]">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizardData.candidates.map((candidate, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{getPersonName(candidate.personId as string)}</TableCell>
                    <TableCell>{getConsulateName(candidate.consulateId as string || "")}</TableCell>
                    <TableCell>{formatDate(candidate.requestDate)}</TableCell>
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

      <QuickConsulateFormDialog
        open={quickConsulateDialogOpen}
        onOpenChange={setQuickConsulateDialogOpen}
        onSuccess={handleQuickConsulateSuccess}
      />
    </div>
  )
}
