"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-field-value";
import { RequestStatusBadge } from "@/components/process-requests/request-status-badge";
import type { ProcessRequestDetail } from "@/components/process-requests/types";

interface RequestDetailClientProps {
  requestId: Id<"individualProcesses">;
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function RequestDetailClient({ requestId }: RequestDetailClientProps) {
  const t = useTranslations("ProcessRequests");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const locale = useLocale();
  const router = useRouter();

  const request = useQuery(api.processRequests.get, { id: requestId }) as
    | ProcessRequestDetail
    | null
    | undefined;
  const groupedRequests = useQuery(
    api.processRequests.getRequestGroup,
    request?.requestGroupId
      ? { requestGroupId: request.requestGroupId }
      : "skip",
  ) as ProcessRequestDetail[] | undefined;
  const currentUser = useQuery(api.userProfiles.getCurrentUser, {});
  const [selectedRequestId, setSelectedRequestId] =
    useState<Id<"individualProcesses">>(requestId);

  const candidates = request?.requestGroupId
    ? (groupedRequests ?? [])
    : request
      ? [request]
      : [];
  const activeRequest =
    candidates.find((candidate) => candidate._id === selectedRequestId) ??
    candidates.find((candidate) => candidate._id === requestId) ??
    request;

  const maritalLabelMap = useMemo<Record<string, string>>(
    () => ({
      single: t("single"),
      married: t("married"),
      divorced: t("divorced"),
      widowed: t("widowed"),
    }),
    [t],
  );

  const formatMoney = (currency?: string, amount?: number) => {
    if (amount === undefined || amount === null) return undefined;
    return `${currency ? `${currency} ` : ""}${amount.toLocaleString(
      locale === "pt" ? "pt-BR" : "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )}`;
  };

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("processManagement") },
    { label: tBreadcrumbs("processRequests"), href: "/process-requests" },
    {
      label:
        (activeRequest && activeRequest.person?.fullName) ||
        t("requestDetails"),
    },
  ];

  const isLoading =
    request === undefined ||
    currentUser === undefined ||
    (request?.requestGroupId !== undefined && groupedRequests === undefined);

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Title bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => router.push("/process-requests")}
              aria-label={t("backToRequests")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  {activeRequest?.person?.fullName || t("requestDetails")}
                </h1>
                {activeRequest && (
                  <RequestStatusBadge status={activeRequest.requestStatus} />
                )}
                {activeRequest?.urgent && (
                  <Badge variant="destructive" className="text-xs">
                    {t("urgent")}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {activeRequest?.company?.name || ""}
                {activeRequest?.requestedAt
                  ? ` · ${formatDate(
                      new Date(activeRequest.requestedAt)
                        .toISOString()
                        .slice(0, 10),
                      locale,
                    )}`
                  : ""}
              </p>
            </div>
          </div>

          {activeRequest?.requestStatus === "draft" &&
            currentUser?.role === "client" && (
              <Button
                onClick={() =>
                  router.push(
                    activeRequest.requestGroupId
                      ? `/process-requests/new?group=${activeRequest.requestGroupId}`
                      : `/process-requests/new?id=${activeRequest._id}`,
                  )
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("continueEditing")}
              </Button>
            )}

          {activeRequest?.requestStatus === "solicitado" && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/individual-processes/${activeRequest._id}`)
              }
            >
              {t("viewProcess")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : request === null || !activeRequest ? (
          <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t("noRequests")}</p>
            <Button
              variant="outline"
              onClick={() => router.push("/process-requests")}
            >
              {t("backToRequests")}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("candidatesCount", { count: candidates.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    role="group"
                    aria-label={t("candidate")}
                  >
                    {candidates.map((candidate, index) => {
                      const isSelected = candidate._id === activeRequest._id;
                      return (
                        <Button
                          key={candidate._id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="max-w-[16rem] shrink-0"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedRequestId(candidate._id)}
                        >
                          <span className="truncate">
                            {candidate.person?.fullName ||
                              `${t("candidate")} ${index + 1}`}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Candidate + passport */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{t("candidate")}</CardTitle>
                  {activeRequest.linkedExistingPerson && (
                    <Badge variant="secondary" className="font-normal">
                      {t("linkedExistingPersonBadge")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field
                  label={t("candidate")}
                  value={activeRequest.person?.fullName}
                />
                <Field
                  label={t("candidateEmail")}
                  value={activeRequest.person?.email}
                />
                <Field
                  label={t("maritalStatus")}
                  value={
                    activeRequest.person?.maritalStatus
                      ? (maritalLabelMap[activeRequest.person.maritalStatus] ??
                        activeRequest.person.maritalStatus)
                      : undefined
                  }
                />
                <Field
                  label={t("fatherName")}
                  value={activeRequest.person?.fatherName}
                />
                <Field
                  label={t("motherName")}
                  value={activeRequest.person?.motherName}
                />
                <Field
                  label={t("passportNumber")}
                  value={activeRequest.passport?.passportNumber}
                />
                <Field
                  label={t("issueDate")}
                  value={
                    activeRequest.passport?.issueDate
                      ? formatDate(activeRequest.passport.issueDate, locale)
                      : undefined
                  }
                />
                <Field
                  label={t("expiryDate")}
                  value={
                    activeRequest.passport?.expiryDate
                      ? formatDate(activeRequest.passport.expiryDate, locale)
                      : undefined
                  }
                />
              </CardContent>
            </Card>

            {/* Process / legal framework */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("basicInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label={t("processType")}
                    value={activeRequest.processType?.name}
                  />
                  <Field
                    label={t("legalFramework")}
                    value={activeRequest.legalFramework?.name}
                  />
                  <Field
                    label={t("consulate")}
                    value={activeRequest.consulate?.city?.name}
                  />
                  <Field
                    label={t("requestDate")}
                    value={
                      activeRequest.dateProcess
                        ? formatDate(activeRequest.dateProcess, locale)
                        : undefined
                    }
                  />
                </div>
                {activeRequest.legalFramework?.description && (
                  <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                    {activeRequest.legalFramework.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Salary */}
            {(activeRequest.lastSalaryAmount !== undefined ||
              activeRequest.salaryInBRL !== undefined ||
              activeRequest.monthlyAmountToReceive !== undefined) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("salary")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label={t("amount")}
                    value={formatMoney(
                      activeRequest.lastSalaryCurrency,
                      activeRequest.lastSalaryAmount,
                    )}
                  />
                  <Field
                    label={t("exchangeRate")}
                    value={
                      activeRequest.lastSalaryCurrency === "BRL" ||
                      !activeRequest.exchangeRateToBRL
                        ? undefined
                        : activeRequest.exchangeRateToBRL
                    }
                  />
                  <Field
                    label={t("salaryInBRL")}
                    value={formatMoney("BRL", activeRequest.salaryInBRL)}
                  />
                  <Field
                    label={t("monthlyAmount")}
                    value={formatMoney(
                      "BRL",
                      activeRequest.monthlyAmountToReceive,
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Visa receipt + residence */}
            {(activeRequest.visaReceiptLocation ||
              activeRequest.residenceCountryName ||
              activeRequest.residenceCity) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("visaReceiptLocation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field
                      label={t("visaReceiptLocation")}
                      value={
                        activeRequest.visaReceiptLocation === "brazil"
                          ? t("brazil")
                          : activeRequest.visaReceiptLocation === "abroad"
                            ? t("abroad")
                            : undefined
                      }
                    />
                    <Field
                      label={t("residenceCountry")}
                      value={activeRequest.residenceCountryName}
                    />
                    <Field
                      label={t("residenceState")}
                      value={activeRequest.residenceStateCode}
                    />
                    <Field
                      label={t("residenceCity")}
                      value={activeRequest.residenceCity}
                    />
                    <Field
                      label={t("consularPost")}
                      value={activeRequest.consularPost}
                    />
                    <Field
                      label={t("residenceSince")}
                      value={
                        activeRequest.residenceSince
                          ? formatDate(activeRequest.residenceSince, locale)
                          : undefined
                      }
                    />
                  </div>
                  <Field
                    label={t("residenceAddressAbroad")}
                    value={activeRequest.residenceAddressAbroad}
                  />
                </CardContent>
              </Card>
            )}

            {/* Professional experience */}
            {activeRequest.professionalExperience && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("professionalExperience")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {activeRequest.professionalExperience}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {activeRequest.requestNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("notes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {activeRequest.requestNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
