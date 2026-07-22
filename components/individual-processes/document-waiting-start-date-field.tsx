"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { timestampToIsoDate } from "@/lib/document-wait-time";

import { documentTimingDateSchema } from "./document-received-date-field";

export function DocumentWaitingStartDateField({
  canEdit,
  value,
  defaultDate,
  onChange,
  disabled = false,
  loading = false,
  id = "document-waiting-start-date",
}: {
  canEdit: boolean;
  value: string;
  defaultDate: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  id?: string;
}) {
  const t = useTranslations("DocumentTiming");
  if (!canEdit) return null;

  const validation = documentTimingDateSchema.safeParse(value);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("waitingStartDate")}</Label>
      <DatePicker
        id={id}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? defaultDate)}
        disabled={disabled || loading || !defaultDate}
        showYearMonthDropdowns
        ariaLabel={t("waitingStartDate")}
        ariaDescribedBy={validation.success ? hintId : errorId}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {loading ? t("waitingStartDateLoading") : t("waitingStartDateHint")}
      </p>
      {!loading && !validation.success && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t("waitingStartDateInvalid")}
        </p>
      )}
    </div>
  );
}

export function useDocumentWaitingStartDate({
  open,
  canEdit,
  individualProcessId,
  documentId,
}: {
  open: boolean;
  canEdit: boolean;
  individualProcessId: Id<"individualProcesses">;
  documentId?: Id<"documentsDelivered">;
}) {
  const defaults = useQuery(
    api.documentsDelivered.getWaitingStartDefaults,
    canEdit
      ? {
          individualProcessId,
          documentId,
        }
      : "skip",
  );
  const defaultWaitingStartDate = defaults
    ? timestampToIsoDate(defaults.waitingStartedAt)
    : "";
  const [waitingStartDate, setWaitingStartDate] = useState("");

  useEffect(() => {
    if (open && defaultWaitingStartDate) {
      setWaitingStartDate(defaultWaitingStartDate);
    }
  }, [open, defaultWaitingStartDate, documentId]);

  return {
    waitingStartDate,
    setWaitingStartDate,
    defaultWaitingStartDate,
    isWaitingStartDateLoading: canEdit && defaults === undefined,
    isWaitingStartDateValid:
      !canEdit || documentTimingDateSchema.safeParse(waitingStartDate).success,
    waitingStartDateOverride:
      canEdit &&
      waitingStartDate &&
      waitingStartDate !== defaultWaitingStartDate
        ? waitingStartDate
        : undefined,
  };
}
