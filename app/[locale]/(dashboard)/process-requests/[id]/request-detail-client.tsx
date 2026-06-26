"use client";

import { useMemo } from "react";
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
  const currentUser = useQuery(api.userProfiles.getCurrentUser, {});

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
        (request && request.person?.fullName) || t("requestDetails"),
    },
  ];

  const isLoading = request === undefined || currentUser === undefined;

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
                  {request?.person?.fullName || t("requestDetails")}
                </h1>
                {request && <RequestStatusBadge status={request.requestStatus} />}
                {request?.urgent && (
                  <Badge variant="destructive" className="text-xs">
                    {t("urgent")}
                  </Badge>
                )}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {request?.company?.name || ""}
                {request?.requestedAt
                  ? ` · ${formatDate(
                      new Date(request.requestedAt).toISOString().slice(0, 10),
                      locale,
                    )}`
                  : ""}
              </p>
            </div>
          </div>

          {request?.requestStatus === "draft" &&
            currentUser?.role === "client" && (
              <Button
                onClick={() =>
                  router.push(
                    request.requestGroupId
                      ? `/process-requests/new?group=${request.requestGroupId}`
                      : `/process-requests/new?id=${request._id}`,
                  )
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t("continueEditing")}
              </Button>
            )}

          {request?.requestStatus === "solicitado" && (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/individual-processes/${request._id}`)
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
        ) : request === null ? (
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
              {/* Candidate + passport */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("candidate")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field
                    label={t("candidate")}
                    value={request.person?.fullName}
                  />
                  <Field
                    label={t("candidateEmail")}
                    value={request.person?.email}
                  />
                  <Field
                    label={t("maritalStatus")}
                    value={
                      request.person?.maritalStatus
                        ? maritalLabelMap[request.person.maritalStatus] ??
                          request.person.maritalStatus
                        : undefined
                    }
                  />
                  <Field
                    label={t("fatherName")}
                    value={request.person?.fatherName}
                  />
                  <Field
                    label={t("motherName")}
                    value={request.person?.motherName}
                  />
                  <Field
                    label={t("passportNumber")}
                    value={request.passport?.passportNumber}
                  />
                  <Field
                    label={t("issueDate")}
                    value={
                      request.passport?.issueDate
                        ? formatDate(request.passport.issueDate, locale)
                        : undefined
                    }
                  />
                  <Field
                    label={t("expiryDate")}
                    value={
                      request.passport?.expiryDate
                        ? formatDate(request.passport.expiryDate, locale)
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
                      value={request.processType?.name}
                    />
                    <Field
                      label={t("legalFramework")}
                      value={request.legalFramework?.name}
                    />
                    <Field
                      label={t("consulate")}
                      value={request.consulate?.city?.name}
                    />
                    <Field
                      label={t("requestDate")}
                      value={
                        request.dateProcess
                          ? formatDate(request.dateProcess, locale)
                          : undefined
                      }
                    />
                  </div>
                  {request.legalFramework?.description && (
                    <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      {request.legalFramework.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Salary */}
              {(request.lastSalaryAmount !== undefined ||
                request.salaryInBRL !== undefined ||
                request.monthlyAmountToReceive !== undefined) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("salary")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field
                      label={t("amount")}
                      value={formatMoney(
                        request.lastSalaryCurrency,
                        request.lastSalaryAmount,
                      )}
                    />
                    <Field
                      label={t("exchangeRate")}
                      value={
                        request.lastSalaryCurrency === "BRL" ||
                        !request.exchangeRateToBRL
                          ? undefined
                          : request.exchangeRateToBRL
                      }
                    />
                    <Field
                      label={t("salaryInBRL")}
                      value={formatMoney("BRL", request.salaryInBRL)}
                    />
                    <Field
                      label={t("monthlyAmount")}
                      value={formatMoney("BRL", request.monthlyAmountToReceive)}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Visa receipt + residence */}
              {(request.visaReceiptLocation ||
                request.residenceCountryName ||
                request.residenceCity) && (
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
                          request.visaReceiptLocation === "brazil"
                            ? t("brazil")
                            : request.visaReceiptLocation === "abroad"
                              ? t("abroad")
                              : undefined
                        }
                      />
                      <Field
                        label={t("residenceCountry")}
                        value={request.residenceCountryName}
                      />
                      <Field
                        label={t("residenceState")}
                        value={request.residenceStateCode}
                      />
                      <Field
                        label={t("residenceCity")}
                        value={request.residenceCity}
                      />
                      <Field
                        label={t("consularPost")}
                        value={request.consularPost}
                      />
                      <Field
                        label={t("residenceSince")}
                        value={
                          request.residenceSince
                            ? formatDate(request.residenceSince, locale)
                            : undefined
                        }
                      />
                    </div>
                    <Field
                      label={t("residenceAddressAbroad")}
                      value={request.residenceAddressAbroad}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Professional experience */}
              {request.professionalExperience && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("professionalExperience")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.professionalExperience}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {request.requestNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t("notes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.requestNotes}
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
