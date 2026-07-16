"use client";

import { z } from "zod";
import { useTranslations } from "next-intl";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { timestampToIsoDate } from "@/lib/document-wait-time";

function buildReceivedDateSchema(createdAt?: number) {
  const today = timestampToIsoDate(Date.now());
  const createdDate = createdAt === undefined
    ? undefined
    : timestampToIsoDate(createdAt);

  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T12:00:00.000Z`)))
    .refine((value) => value <= today)
    .refine((value) => createdDate === undefined || value >= createdDate);
}

export function DocumentReceivedDateField({
  canEdit,
  value,
  onChange,
  createdAt,
  disabled = false,
  id = "document-received-date",
}: {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  createdAt?: number;
  disabled?: boolean;
  id?: string;
}) {
  const t = useTranslations("DocumentTiming");
  if (!canEdit) return null;

  const validation = buildReceivedDateSchema(createdAt).safeParse(value);
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
        toYear={new Date().getFullYear()}
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
