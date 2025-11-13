"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";

interface InitialStatusFormProps {
  onStatusChange: (caseStatusId: Id<"caseStatuses">, date: string) => void;
  defaultDate?: string;
}

export function InitialStatusForm({
  onStatusChange,
  defaultDate,
}: InitialStatusFormProps) {
  const t = useTranslations("IndividualProcesses");
  const locale = useLocale();
  const isMounted = useRef(false);

  // Get "em_preparacao" status as default
  const caseStatuses = useQuery(api.caseStatuses.listActive) ?? [];
  const emPreparacaoStatus = caseStatuses.find(s => s.code === "em_preparacao");

  const [selectedStatusId, setSelectedStatusId] = useState<Id<"caseStatuses"> | "">(
    emPreparacaoStatus?._id || ""
  );
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);

  // Set default status when it loads
  useEffect(() => {
    if (emPreparacaoStatus && !selectedStatusId) {
      setSelectedStatusId(emPreparacaoStatus._id);
    }
  }, [emPreparacaoStatus, selectedStatusId]);

  // Notify parent of changes only after component is mounted
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      // Call once on mount with initial values
      if (selectedStatusId && date) {
        setTimeout(() => {
          onStatusChange(selectedStatusId as Id<"caseStatuses">, date);
        }, 0);
      }
      return;
    }

    if (selectedStatusId && date) {
      onStatusChange(selectedStatusId as Id<"caseStatuses">, date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatusId, date]);

  const caseStatusOptions = caseStatuses.map((status) => ({
    value: status._id,
    label: locale === "en" && status.nameEn ? status.nameEn : status.name,
    color: status.color,
    category: status.category,
  }));

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h4 className="text-sm font-semibold mb-2">{t("initialStatus")}</h4>
        <p className="text-sm text-muted-foreground">{t("initialStatusDescription")}</p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="initial-status">{t("caseStatus")}</Label>
          <Combobox
            options={caseStatusOptions}
            value={selectedStatusId as string}
            onValueChange={(value) => setSelectedStatusId(value as Id<"caseStatuses">)}
            placeholder={t("selectCaseStatus")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="initial-status-date">{t("statusDate")}</Label>
          <DatePicker
            value={date}
            onChange={(value) => setDate(value || "")}
          />
        </div>
      </div>
    </div>
  );
}
