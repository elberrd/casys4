"use client";

import { useState, useMemo, useCallback } from "react";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { useTranslations, useLocale } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  getDay,
  parse,
  startOfWeek,
} from "date-fns";
import { pt, enUS } from "date-fns/locale";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFullName } from "@/lib/utils/person-names";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InfiniteAgenda } from "./infinite-agenda";
import { PrintCalendarDialog } from "./print-calendar-dialog";
import type { RNMCalendarEvent } from "./rnm-calendar-types";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

const locales = {
  pt: pt,
  en: enUS,
};

const AGENDA_NAVIGATION_DAYS = 14;

interface CustomToolbarProps {
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
  onPrint: () => void;
  view: View;
  label: string;
  messages: {
    today: string;
    previous: string;
    next: string;
    month: string;
    week: string;
    agenda: string;
    print: string;
  };
}

const CustomToolbar = ({
  onNavigate,
  onView,
  onPrint,
  view,
  label,
  messages,
}: CustomToolbarProps) => {
  return (
    <div className="mb-4 flex flex-col gap-3 px-1 pt-1 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:justify-start">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
            className="h-8 px-2.5"
          >
            {messages.today}
          </Button>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={messages.previous}
              onClick={() => onNavigate("PREV")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={messages.next}
              onClick={() => onNavigate("NEXT")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="truncate text-base font-semibold capitalize text-foreground sm:text-lg lg:ms-2">
          {label}
        </h2>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 px-2.5"
          aria-label={messages.print}
          onClick={onPrint}
        >
          <Printer className="size-4" />
          <span className="hidden sm:inline">{messages.print}</span>
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={view === Views.MONTH ? "secondary" : "ghost"}
            size="sm"
            aria-label={messages.month}
            onClick={() => onView(Views.MONTH)}
            className={cn(
              "min-w-0 flex-1 px-2 sm:flex-none sm:px-3",
              view === Views.MONTH && "bg-background shadow-sm",
            )}
          >
            <CalendarDays className="size-4 sm:me-1.5" />
            <span className="hidden sm:inline">{messages.month}</span>
          </Button>
          <Button
            variant={view === Views.WEEK ? "secondary" : "ghost"}
            size="sm"
            aria-label={messages.week}
            onClick={() => onView(Views.WEEK)}
            className={cn(
              "min-w-0 flex-1 px-2 sm:flex-none sm:px-3",
              view === Views.WEEK && "bg-background shadow-sm",
            )}
          >
            <CalendarRange className="size-4 sm:me-1.5" />
            <span className="hidden sm:inline">{messages.week}</span>
          </Button>
          <Button
            variant={view === Views.AGENDA ? "secondary" : "ghost"}
            size="sm"
            aria-label={messages.agenda}
            onClick={() => onView(Views.AGENDA)}
            className={cn(
              "min-w-0 flex-1 px-2 sm:flex-none sm:px-3",
              view === Views.AGENDA && "bg-background shadow-sm",
            )}
          >
            <LayoutList className="size-4 sm:me-1.5" />
            <span className="hidden sm:inline">{messages.agenda}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export function RNMCalendarClient() {
  const t = useTranslations("RNMCalendar");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const locale = useLocale();
  const dateLocale = locale.startsWith("pt") ? pt : enUS;

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (calendarDate: Date) =>
          startOfWeek(calendarDate, { locale: dateLocale }),
        getDay,
        locales,
      }),
    [dateLocale],
  );

  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printAnchorDate, setPrintAnchorDate] = useState(new Date());
  const [selectedProcessId, setSelectedProcessId] = useState<
    Id<"individualProcesses"> | undefined
  >(undefined);

  // Fetch RNM appointments from Convex
  const appointments = useQuery(
    api.individualProcesses.listRNMAppointments,
    {},
  );
  const isLoadingAppointments = appointments === undefined;

  // Transform appointments into calendar events
  const baseEvents = useMemo<RNMCalendarEvent[]>(() => {
    return (appointments ?? [])
      .filter((appointment) => appointment.appointmentDateTime)
      .map((appointment) => ({
        id: appointment._id,
        title: appointment.person
          ? getFullName(appointment.person)
          : t("noCandidate"),
        start: new Date(appointment.appointmentDateTime!),
        // RNM appointments are point-in-time slots. We render them as 30min by default to avoid
        // visual overlap in week view when schedules are tight.
        end: new Date(
          new Date(appointment.appointmentDateTime!).getTime() + 30 * 60 * 1000,
        ),
        resource: {
          processId: appointment._id,
          rnmNumber: appointment.rnmNumber,
          companyName: appointment.companyApplicant?.name,
        },
      }));
  }, [appointments, t]);

  const openProcessDialog = useCallback(
    (processId: Id<"individualProcesses">) => {
      setSelectedProcessId(processId);
      setIsDialogOpen(true);
    },
    [],
  );

  const handleSelectEvent = useCallback(
    (event: RNMCalendarEvent) => {
      // Grouped events are handled by the popover inside the event renderer
      if (event.resource.groupedEvents?.length) return;
      openProcessDialog(event.resource.processId);
    },
    [openProcessDialog],
  );

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedProcessId(undefined);
    }
  }, []);

  const breadcrumbs = [
    {
      label: tBreadcrumbs("dashboard"),
      href: "/dashboard",
    },
    {
      label: tBreadcrumbs("rnmCalendar"),
    },
  ];

  // Custom messages for calendar
  const messages = {
    today: t("today"),
    previous: t("previous"),
    next: t("next"),
    month: t("month"),
    week: t("week"),
    day: t("day"),
    agenda: t("agenda"),
    date: t("date"),
    time: t("time"),
    event: t("event"),
    print: t("print.button"),
    showMore: (total: number) => `+${total} ${t("more")}`,
    noEventsInRange: t("noEventsInRange"),
  };

  // Group overlapping events for month and week views only (not agenda)
  const events = useMemo(() => {
    // Agenda view shows all events ungrouped
    if (view === Views.AGENDA) {
      return baseEvents;
    }

    // Group events by their start time (rounded to 30-min buckets for week, exact for month)
    const bucketMinutes = view === Views.WEEK ? 30 : 1440; // 30 min for week, 1 day for month
    const buckets = new Map<string, RNMCalendarEvent[]>();

    for (const ev of baseEvents) {
      const d: Date = ev.start;
      const dayKey = format(d, "yyyy-MM-dd");

      let key: string;
      if (view === Views.WEEK) {
        // For week view, group by 30-min time slots
        const minutes = d.getHours() * 60 + d.getMinutes();
        const bucketStartMinutes =
          Math.floor(minutes / bucketMinutes) * bucketMinutes;
        key = `${dayKey}:${bucketStartMinutes}`;
      } else {
        // For month view, group by day
        key = dayKey;
      }

      const arr = buckets.get(key) ?? [];
      arr.push(ev);
      buckets.set(key, arr);
    }

    const grouped: RNMCalendarEvent[] = [];
    for (const [, group] of buckets) {
      group.sort((a, b) => +a.start - +b.start);

      if (group.length === 1) {
        grouped.push(group[0]);
        continue;
      }

      // Multiple events in same bucket - show first one with "+x more" indicator
      const primary = group[0];
      grouped.push({
        ...primary,
        id: `group:${primary.id}`,
        resource: {
          ...primary.resource,
          groupedEvents: group,
        },
      });
    }

    return grouped;
  }, [baseEvents, view]);

  const formatEventTime = useCallback(
    (d: Date) => format(d, "HH:mm", { locale: dateLocale }),
    [dateLocale],
  );

  const EventRenderer = useCallback(
    ({ event }: { event: RNMCalendarEvent }) => {
      const groupedEvents = event.resource.groupedEvents;
      const time = formatEventTime(event.start);

      // Single event - no grouping
      if (!groupedEvents?.length) {
        return (
          <span className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">{time}</span>
            <span className="truncate">{event.title}</span>
          </span>
        );
      }

      // Multiple events - show primary with "+x more" button
      const extraCount = groupedEvents.length - 1;

      // Week view: show only button (no person name, no time - calendar shows time automatically)
      if (view === Views.WEEK) {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-xs font-semibold underline underline-offset-2 opacity-90 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                +{extraCount} {t("more")}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-2"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {format(event.start, "dd/MM/yyyy", { locale: dateLocale })}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {groupedEvents.map((ev) => (
                  <button
                    key={String(ev.id)}
                    type="button"
                    className="w-full rounded-md border bg-card px-2 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      openProcessDialog(ev.resource.processId);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatEventTime(ev.start)}
                      </span>
                      <span className="truncate">{ev.title}</span>
                    </div>
                    {ev.resource?.companyName && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {ev.resource.companyName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      // Month view: show time, person name, and button
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold tabular-nums">{time}</span>
            <span className="truncate">{event.title}</span>
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 text-[11px] font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 px-1"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                +{extraCount} {t("more")}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-2"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {format(event.start, "dd/MM/yyyy", { locale: dateLocale })}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {groupedEvents.map((ev) => (
                  <button
                    key={String(ev.id)}
                    type="button"
                    className="w-full rounded-md border bg-card px-2 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      openProcessDialog(ev.resource.processId);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatEventTime(ev.start)}
                      </span>
                      <span className="truncate">{ev.title}</span>
                    </div>
                    {ev.resource?.companyName && (
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {ev.resource.companyName}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    },
    [dateLocale, formatEventTime, openProcessDialog, t, view],
  );

  const calendarLabel = useMemo(() => {
    if (view === Views.WEEK) {
      const weekStart = startOfWeek(date, { locale: dateLocale });
      const weekEnd = endOfWeek(date, { locale: dateLocale });
      return `${format(weekStart, "d MMM", {
        locale: dateLocale,
      })} — ${format(weekEnd, "d MMM yyyy", { locale: dateLocale })}`;
    }

    return format(date, "MMMM yyyy", { locale: dateLocale });
  }, [date, dateLocale, view]);

  const handleToolbarNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      if (action === "TODAY") {
        setDate(new Date());
        return;
      }

      const direction = action === "PREV" ? -1 : 1;
      setDate((currentDate) => {
        if (view === Views.MONTH) {
          return addMonths(currentDate, direction);
        }

        if (view === Views.WEEK) {
          return addWeeks(currentDate, direction);
        }

        return addDays(currentDate, direction * AGENDA_NAVIGATION_DAYS);
      });
    },
    [view],
  );

  const handleOpenPrintDialog = useCallback(() => {
    setPrintAnchorDate(new Date());
    setIsPrintDialogOpen(true);
  }, []);

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <Card className="overflow-hidden border shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <CustomToolbar
              onNavigate={handleToolbarNavigate}
              onView={setView}
              onPrint={handleOpenPrintDialog}
              view={view}
              label={calendarLabel}
              messages={messages}
            />

            {view === Views.AGENDA ? (
              <InfiniteAgenda
                anchorDate={date}
                events={baseEvents}
                isLoading={isLoadingAppointments}
                onSelectEvent={handleSelectEvent}
              />
            ) : (
              <Calendar<RNMCalendarEvent>
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{
                  height: "clamp(32rem, calc(100dvh - 18rem), 70rem)",
                }}
                toolbar={false}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                onSelectEvent={handleSelectEvent}
                messages={messages}
                culture={locale}
                components={{
                  event: EventRenderer,
                }}
                eventPropGetter={() => ({
                  className:
                    "bg-primary border-primary text-primary-foreground text-xs rounded-md shadow-sm px-1.5 py-1 hover:bg-primary/90 transition-all cursor-pointer",
                })}
                dayPropGetter={(calendarDate) => {
                  const isToday =
                    new Date().toDateString() === calendarDate.toDateString();
                  return {
                    className: cn(
                      "bg-background hover:bg-muted/30 transition-colors",
                      isToday && "bg-muted/70 hover:bg-muted",
                    ),
                  };
                }}
                views={{
                  month: true,
                  week: true,
                }}
                step={30}
                timeslots={2}
                dayLayoutAlgorithm="no-overlap"
                showMultiDayTimes
                popup
                className="rnm-calendar-grid text-card-foreground"
              />
            )}
          </CardContent>
        </Card>

        {!isLoadingAppointments &&
          view !== Views.AGENDA &&
          baseEvents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("noAppointments")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t("noAppointmentsDescription")}
                </p>
              </CardContent>
            </Card>
          )}
      </div>

      <PrintCalendarDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        anchorDate={printAnchorDate}
        events={baseEvents}
      />

      {selectedProcessId && (
        <IndividualProcessFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          individualProcessId={selectedProcessId}
        />
      )}
    </>
  );
}
