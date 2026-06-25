"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-field-value";
import { RequestConversation } from "./request-conversation";
import { RequestStatusBadge } from "./request-status-badge";
import { ExternalLink } from "lucide-react";
import type { ProcessRequestDetail } from "./types";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"individualProcesses"> | null;
  currentUserRole: "admin" | "client";
  currentUserId?: Id<"users">;
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

export function RequestDetailsDialog({
  open,
  onOpenChange,
  requestId,
  currentUserRole,
  currentUserId,
}: RequestDetailsDialogProps) {
  const t = useTranslations("ProcessRequests");
  const locale = useLocale();
  const router = useRouter();

  const request = useQuery(
    api.processRequests.get,
    requestId ? { id: requestId } : "skip"
  ) as ProcessRequestDetail | null | undefined;

  const maritalLabelMap = useMemo<Record<string, string>>(
    () => ({
      single: t("single"),
      married: t("married"),
      divorced: t("divorced"),
      widowed: t("widowed"),
    }),
    [t]
  );

  const formatMoney = (currency?: string, amount?: number) => {
    if (amount === undefined || amount === null) return undefined;
    return `${currency ? `${currency} ` : ""}${amount.toLocaleString(
      locale === "pt" ? "pt-BR" : "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        {request === undefined ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : request === null ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("noRequests")}
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle>{t("requestDetails")}</DialogTitle>
                <RequestStatusBadge status={request.requestStatus} />
                {request.urgent && (
                  <Badge variant="destructive" className="text-xs">
                    {t("urgent")}
                  </Badge>
                )}
              </div>
              <DialogDescription>
                {request.company?.name || "-"}
                {request.requestedAt
                  ? ` · ${formatDate(
                      new Date(request.requestedAt).toISOString().slice(0, 10),
                      locale
                    )}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Candidate + passport */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("candidate")}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                </div>
              </section>

              <Separator />

              {/* Process / legal framework */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">
                  {t("basicInformation")}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
              </section>

              {/* Salary */}
              {(request.lastSalaryAmount !== undefined ||
                request.salaryInBRL !== undefined ||
                request.monthlyAmountToReceive !== undefined) && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">{t("salary")}</h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field
                        label={t("amount")}
                        value={formatMoney(
                          request.lastSalaryCurrency,
                          request.lastSalaryAmount
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
                    </div>
                  </section>
                </>
              )}

              {/* Visa receipt + residence */}
              {(request.visaReceiptLocation ||
                request.residenceCountryName ||
                request.residenceCity) && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">
                      {t("visaReceiptLocation")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                      <Field
                        label={t("residenceDuration")}
                        value={residenceDurationLabel(request.residenceSince, t)}
                      />
                    </div>
                    <Field
                      label={t("residenceAddressAbroad")}
                      value={request.residenceAddressAbroad}
                    />
                  </section>
                </>
              )}

              {/* Professional experience */}
              {request.professionalExperience && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      {t("professionalExperience")}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.professionalExperience}
                    </p>
                  </section>
                </>
              )}

              {/* Notes */}
              {request.requestNotes && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">{t("notes")}</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.requestNotes}
                    </p>
                  </section>
                </>
              )}

              {/* Link to the live process (finalized requests) */}
              {request.requestStatus === "solicitado" && (
                <>
                  <Separator />
                  <section className="space-y-2">
                    <div className="flex items-center justify-between rounded-md bg-muted p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {t("statusSolicitado")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("processCreatedFromRequest")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          router.push(`/individual-processes/${request._id}`);
                          onOpenChange(false);
                        }}
                      >
                        {t("viewProcess")}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </section>
                </>
              )}

              {/* Conversation */}
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("conversation")}</h3>
                <RequestConversation
                  individualProcessId={request._id}
                  currentUserRole={currentUserRole}
                  currentUserId={currentUserId}
                />
              </section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compute a "X years, Y months" residence-duration label from an ISO date.
 * Reads the current time at call-time (never at module scope).
 */
function residenceDurationLabel(
  residenceSince: string | undefined,
  t: (key: string) => string
): string | undefined {
  if (!residenceSince) return undefined;
  const start = new Date(residenceSince);
  if (Number.isNaN(start.getTime())) return undefined;
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${t("livesForYears")}`);
  if (remMonths > 0 || years === 0)
    parts.push(`${remMonths} ${t("livesForMonths")}`);
  return parts.join(" · ");
}
