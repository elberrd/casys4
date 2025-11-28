"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations, useLocale } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { Calendar, Users, Building, MapPin, FileText, Clock } from "lucide-react"

interface Step3_4ConfirmationCollectiveProps {
  wizard: UseWizardStateReturn
}

export function Step3_4ConfirmationCollective({ wizard }: Step3_4ConfirmationCollectiveProps) {
  const t = useTranslations("ProcessWizard")
  const locale = useLocale()

  const { wizardData } = wizard

  // Fetch related data for display
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

  const getDeadlineText = () => {
    if (!wizardData.deadlineUnit) return "-"

    if (wizardData.deadlineUnit === "indeterminate") {
      return t("deadlineUnits.indeterminate")
    }

    if (wizardData.deadlineUnit === "prefixed" && wizardData.deadlineSpecificDate) {
      return formatDate(wizardData.deadlineSpecificDate)
    }

    if (wizardData.deadlineQuantity) {
      const unitLabel = t(`deadlineUnits.${wizardData.deadlineUnit}`)
      return `${wizardData.deadlineQuantity} ${unitLabel}`
    }

    return "-"
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">{t("confirmationTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("confirmationCollectiveDescription")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Request Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("requestDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-sm text-muted-foreground">{t("requestDate")}</span>
              <span className="text-sm font-medium">{formatDate(wizardData.requestDate)}</span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-sm text-muted-foreground">{t("userApplicant")}</span>
              <span className="text-sm font-medium truncate">{userApplicant?.fullName || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Process Data Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("processData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-sm text-muted-foreground">{t("authorizationType")}</span>
              <span className="text-sm font-medium truncate">{processType?.name || "-"}</span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
              <span className="text-sm text-muted-foreground">{t("legalFramework")}</span>
              <span className="text-sm font-medium truncate">{legalFramework?.name || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Company & Deadline Card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              {t("companyAndDeadline")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground">{t("companyApplicant")}</span>
                <span className="text-sm font-medium">{companyApplicant?.name || "-"}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <span className="text-sm text-muted-foreground">{t("deadline")}</span>
                <span className="text-sm font-medium">{getDeadlineText()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Candidates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("candidates")}
            <Badge variant="secondary" className="ml-2">
              {wizardData.candidates.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("candidate")}</TableHead>
                  <TableHead>{t("consulate")}</TableHead>
                  <TableHead>{t("requestDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizardData.candidates.map((candidate, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{getPersonName(candidate.personId as string)}</TableCell>
                    <TableCell>{getConsulateName(candidate.consulateId as string || "")}</TableCell>
                    <TableCell>{formatDate(candidate.requestDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Initial Status Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("collectiveInitialStatusInfo")}</p>
              <p className="text-xs text-muted-foreground">{t("collectiveInitialStatusDescription")}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {t("statusEmPreparacao")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
