"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-field-value";
import { RequestConversation } from "./request-conversation";
import { RequestStatusBadge } from "./request-status-badge";
import { ApproveRequestDialog } from "./approve-request-dialog";
import { RejectRequestDialog } from "./reject-request-dialog";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  History,
  Loader2,
  RotateCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { ProcessRequestDetail } from "./types";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"processRequests"> | null;
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

  const isAdmin = currentUserRole === "admin";

  const request = useQuery(
    api.processRequests.get,
    requestId ? { id: requestId } : "skip"
  ) as ProcessRequestDetail | null | undefined;

  const reopen = useMutation(api.processRequests.reopen);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const maritalLabelMap = useMemo<Record<string, string>>(
    () => ({
      single: t("single"),
      married: t("married"),
      divorced: t("divorced"),
      widowed: t("widowed"),
    }),
    [t]
  );

  const handleReopen = async () => {
    if (!requestId) return;
    setIsReopening(true);
    try {
      await reopen({ id: requestId });
      toast.success(t("reopened"));
    } catch (error) {
      console.error("Error reopening request:", error);
      toast.error(t("errorReopen"));
    } finally {
      setIsReopening(false);
    }
  };

  const formatMoney = (currency?: string, amount?: number) => {
    if (amount === undefined || amount === null) return undefined;
    return `${currency ? `${currency} ` : ""}${amount.toLocaleString(
      locale === "pt" ? "pt-BR" : "en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    )}`;
  };

  return (
    <>
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
                  <RequestStatusBadge status={request.status} />
                  {request.version ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      v{request.version}
                    </Badge>
                  ) : null}
                  {request.isUrgent && (
                    <Badge variant="destructive" className="text-xs">
                      {t("urgent")}
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  {request.company?.name || "-"}
                  {request.requestDate
                    ? ` · ${formatDate(request.requestDate, locale)}`
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
                      value={request.candidatePerson?.fullName}
                    />
                    <Field
                      label={t("candidateEmail")}
                      value={request.candidateEmail}
                    />
                    <Field
                      label={t("maritalStatus")}
                      value={
                        request.maritalStatus
                          ? maritalLabelMap[request.maritalStatus] ??
                            request.maritalStatus
                          : undefined
                      }
                    />
                    <Field label={t("fatherName")} value={request.fatherName} />
                    <Field label={t("motherName")} value={request.motherName} />
                    <Field
                      label={t("passportNumber")}
                      value={request.candidatePassport?.passportNumber}
                    />
                    <Field
                      label={t("issueDate")}
                      value={
                        request.candidatePassport?.issueDate
                          ? formatDate(
                              request.candidatePassport.issueDate,
                              locale
                            )
                          : undefined
                      }
                    />
                    <Field
                      label={t("expiryDate")}
                      value={
                        request.candidatePassport?.expiryDate
                          ? formatDate(
                              request.candidatePassport.expiryDate,
                              locale
                            )
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
                      label={t("workplaceCity")}
                      value={request.workplaceCity?.name}
                    />
                    <Field
                      label={t("consulate")}
                      value={request.consulate?.city?.name}
                    />
                    <Field
                      label={t("requestDate")}
                      value={
                        request.requestDate
                          ? formatDate(request.requestDate, locale)
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
                          value={request.exchangeRateToBRL}
                        />
                        <Field
                          label={t("salaryInBRL")}
                          value={formatMoney("BRL", request.salaryInBRL)}
                        />
                        <Field
                          label={t("monthlyAmount")}
                          value={formatMoney(
                            "BRL",
                            request.monthlyAmountToReceive
                          )}
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
                          value={residenceDurationLabel(
                            request.residenceSince,
                            t
                          )}
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
                {request.notes && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold">{t("notes")}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {request.notes}
                      </p>
                    </section>
                  </>
                )}

                {/* Rejection reason */}
                {request.rejectionReason && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <h3 className="text-sm font-semibold">
                          {t("rejectionReason")}
                        </h3>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {request.rejectionReason}
                      </p>
                    </section>
                  </>
                )}

                {/* Approved process link */}
                {request.status === "approved" &&
                  request.approvedIndividualProcess && (
                    <>
                      <Separator />
                      <section className="space-y-2">
                        <div className="flex items-center justify-between rounded-md bg-muted p-3">
                          <div>
                            <p className="text-sm font-medium">
                              {t("statusApproved")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("collectiveProcessCreated")}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              router.push(
                                `/individual-processes/${request.approvedIndividualProcess!._id}`
                              );
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

                {/* Version history */}
                {request.versions.length > 0 && (
                  <>
                    <Separator />
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex w-full items-center justify-between px-0 hover:bg-transparent"
                        >
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <History className="h-4 w-4" />
                            {t("viewVersions")} ({request.versions.length})
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        {request.versions.map((version) => (
                          <div
                            key={version._id}
                            className="flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              v{version.version}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(version.submittedAt).toLocaleString(
                                locale === "pt" ? "pt-BR" : "en-US"
                              )}
                            </span>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {/* Conversation */}
                <Separator />
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">
                    {t("conversation")}
                  </h3>
                  <RequestConversation
                    processRequestId={request._id}
                    currentUserRole={currentUserRole}
                    currentUserId={currentUserId}
                  />
                </section>

                {/* Admin actions */}
                {isAdmin && request.status === "submitted" && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleReopen}
                        disabled={isReopening}
                      >
                        {isReopening ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        {t("reopen")}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setRejectOpen(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t("reject")}
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setApproveOpen(true)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("approve")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ApproveRequestDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        requestId={requestId}
        requestInfo={
          request
            ? {
                company: request.company?.name || "-",
                candidate: request.candidatePerson?.fullName || "-",
                processType: request.processType?.name || "-",
              }
            : undefined
        }
        onApproved={() => onOpenChange(false)}
      />

      <RejectRequestDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        requestId={requestId}
        requestInfo={
          request
            ? {
                company: request.company?.name || "-",
                candidate: request.candidatePerson?.fullName || "-",
                processType: request.processType?.name || "-",
              }
            : undefined
        }
      />
    </>
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
