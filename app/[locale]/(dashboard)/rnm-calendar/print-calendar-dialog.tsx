"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, pt } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  Check,
  LoaderCircle,
  Printer,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RNMCalendarEvent } from "./rnm-calendar-types";

type PrintScope = "day" | "week" | "month";

interface PrintCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorDate: Date;
  events: RNMCalendarEvent[];
}

interface PrintInterval {
  start: Date;
  end: Date;
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function PrintCalendarDialog({
  open,
  onOpenChange,
  anchorDate,
  events,
}: PrintCalendarDialogProps) {
  const t = useTranslations("RNMCalendar");
  const locale = useLocale();
  const dateLocale = locale.startsWith("pt") ? pt : enUS;
  const radioGroupName = useId();
  const defaultScopeRef = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState<PrintScope>("week");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (open) setScope("week");
  }, [open]);

  const printInterval = useMemo<PrintInterval>(() => {
    if (scope === "day") {
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    }

    if (scope === "month") {
      return {
        start: startOfMonth(anchorDate),
        end: endOfMonth(anchorDate),
      };
    }

    return {
      start: startOfWeek(anchorDate, { locale: dateLocale }),
      end: endOfWeek(anchorDate, { locale: dateLocale }),
    };
  }, [anchorDate, dateLocale, scope]);

  const periodLabel = useMemo(() => {
    if (scope === "day") {
      return capitalizeFirst(
        format(anchorDate, "PPPP", { locale: dateLocale }),
      );
    }

    if (scope === "month") {
      return capitalizeFirst(
        format(anchorDate, "MMMM yyyy", { locale: dateLocale }),
      );
    }

    return `${format(printInterval.start, "d MMM", {
      locale: dateLocale,
    })} — ${format(printInterval.end, "d MMM yyyy", {
      locale: dateLocale,
    })}`;
  }, [anchorDate, dateLocale, printInterval, scope]);

  const printableEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.start >= printInterval.start &&
            event.start <= printInterval.end,
        )
        .sort((first, second) => +first.start - +second.start),
    [events, printInterval],
  );

  const printOptions = [
    {
      value: "day" as const,
      icon: CalendarIcon,
      title: t("print.day"),
      description: capitalizeFirst(
        format(anchorDate, "PPPP", { locale: dateLocale }),
      ),
    },
    {
      value: "week" as const,
      icon: CalendarRange,
      title: t("print.week"),
      description: `${format(
        startOfWeek(anchorDate, { locale: dateLocale }),
        "d MMM",
        { locale: dateLocale },
      )} — ${format(
        endOfWeek(anchorDate, { locale: dateLocale }),
        "d MMM yyyy",
        { locale: dateLocale },
      )}`,
    },
    {
      value: "month" as const,
      icon: CalendarDays,
      title: t("print.month"),
      description: capitalizeFirst(
        format(anchorDate, "MMMM yyyy", { locale: dateLocale }),
      ),
    },
  ];

  const handlePrint = () => {
    if (isPrinting) return;

    setIsPrinting(true);
    onOpenChange(false);
    const previousTitle = document.title;
    document.title = `${t("title")} - ${periodLabel}`;

    const restoreDocument = () => {
      document.title = previousTitle;
      setIsPrinting(false);
    };

    window.addEventListener("afterprint", restoreDocument, { once: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-xl p-5 sm:p-6"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            defaultScopeRef.current?.focus();
          }}
        >
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
              <Printer className="size-5" />
            </div>
            <DialogTitle>{t("print.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("print.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2" aria-label={t("print.scopeLabel")}>
            <legend className="sr-only">{t("print.scopeLabel")}</legend>
            {printOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = scope === option.value;

              return (
                <label
                  key={option.value}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                    "hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    isSelected && "border-foreground bg-muted/60",
                  )}
                >
                  <input
                    ref={option.value === "week" ? defaultScopeRef : undefined}
                    type="radio"
                    name={radioGroupName}
                    value={option.value}
                    checked={isSelected}
                    className="sr-only"
                    onChange={() => setScope(option.value)}
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground group-hover:text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-primary-foreground",
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30 bg-background",
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                </label>
              );
            })}
          </fieldset>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("print.cancel")}
            </Button>
            <Button type="button" disabled={isPrinting} onClick={handlePrint}>
              {isPrinting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Printer className="size-4" />
              )}
              {isPrinting ? t("print.preparing") : t("print.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rnm-calendar-print" aria-hidden="true">
        <header className="rnm-print-header">
          <div>
            <h1>{t("title")}</h1>
            <p>{t("print.documentSubtitle")}</p>
          </div>
          <div className="rnm-print-brand">CASYS4</div>
        </header>

        <div className="rnm-print-period">
          <div>
            <span>{t("print.period")}</span>
            <strong>{periodLabel}</strong>
          </div>
          <div>
            <span>{t("print.generatedAtLabel")}</span>
            <strong>{format(new Date(), "Pp", { locale: dateLocale })}</strong>
          </div>
          <div>
            <span>{t("print.totalLabel")}</span>
            <strong>
              {t("print.appointmentCount", { count: printableEvents.length })}
            </strong>
          </div>
        </div>

        {printableEvents.length === 0 ? (
          <div className="rnm-print-empty">{t("print.noAppointments")}</div>
        ) : (
          <table className="rnm-print-table">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("time")}</th>
                <th>{t("print.candidate")}</th>
                <th>{t("print.company")}</th>
              </tr>
            </thead>
            <tbody>
              {printableEvents.map((event) => (
                <tr key={String(event.id)}>
                  <td>
                    {format(event.start, "EEE, P", { locale: dateLocale })}
                  </td>
                  <td>
                    {format(event.start, "HH:mm", { locale: dateLocale })} —{" "}
                    {format(event.end, "HH:mm", { locale: dateLocale })}
                  </td>
                  <td>{event.title}</td>
                  <td>{event.resource.companyName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
