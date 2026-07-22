"use client";

import { z } from "zod";
import { useTranslations } from "next-intl";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { timestampToIsoDate } from "@/lib/document-wait-time";

export const documentTimingDateSchema = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
});

export function DocumentReceivedDateField({
  canEdit,
  value,
  onChange,
  disabled = false,
  id = "document-received-date",
}: {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const t = useTranslations("DocumentTiming");
  if (!canEdit) return null;

  const validation = documentTimingDateSchema.safeParse(value);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{t("receivedDate")}</Label>
      <DatePicker
        id={id}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? getDefaultReceivedDate())}
        disabled={disabled}
        showYearMonthDropdowns
        ariaLabel={t("receivedDate")}
        ariaDescribedBy={validation.success ? hintId : errorId}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {t("receivedDateHint")}
      </p>
      {!validation.success && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {t("receivedDateInvalid")}
        </p>
      )}
    </div>
  );
}

export function getDefaultReceivedDate(): string {
  return timestampToIsoDate(Date.now());
}

export function getReceivedDateOverride(value: string): string | undefined {
  const today = getDefaultReceivedDate();
  return value && value !== today ? value : undefined;
}
