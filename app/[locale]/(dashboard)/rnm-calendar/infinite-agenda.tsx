"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfDay,
} from "date-fns";
import { enUS, pt } from "date-fns/locale";
import { Building2, ChevronRight, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RNMCalendarEvent } from "./rnm-calendar-types";

const AGENDA_BATCH_DAYS = 14;
const AGENDA_DAYS_BEFORE_ANCHOR = 14;
const AGENDA_DAYS_AFTER_ANCHOR = 28;
const LOAD_THRESHOLD_PX = 180;

interface InfiniteAgendaProps {
  anchorDate: Date;
  events: RNMCalendarEvent[];
  isLoading: boolean;
  onSelectEvent: (event: RNMCalendarEvent) => void;
}

interface PendingPrepend {
  scrollHeight: number;
  scrollTop: number;
}

export function InfiniteAgenda({
  anchorDate,
  events,
  isLoading,
  onSelectEvent,
}: InfiniteAgendaProps) {
  const t = useTranslations("RNMCalendar");
  const locale = useLocale();
  const dateLocale = locale.startsWith("pt") ? pt : enUS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingPrependRef = useRef<PendingPrepend | null>(null);
  const pendingFocusRef = useRef<string | null>(
    format(startOfDay(anchorDate), "yyyy-MM-dd"),
  );
  const hasFocusedOnceRef = useRef(false);
  const loadingPastRef = useRef(false);
  const loadingFutureRef = useRef(false);
  const suppressLazyLoadUntilRef = useRef(0);

  const [rangeStart, setRangeStart] = useState(() =>
    addDays(startOfDay(anchorDate), -AGENDA_DAYS_BEFORE_ANCHOR),
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    addDays(startOfDay(anchorDate), AGENDA_DAYS_AFTER_ANCHOR),
  );
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [isLoadingFuture, setIsLoadingFuture] = useState(false);

  const eventsByDay = useMemo(() => {
    const groupedEvents = new Map<string, RNMCalendarEvent[]>();

    for (const event of events) {
      const key = format(event.start, "yyyy-MM-dd");
      const dayEvents = groupedEvents.get(key) ?? [];
      dayEvents.push(event);
      groupedEvents.set(key, dayEvents);
    }

    for (const dayEvents of groupedEvents.values()) {
      dayEvents.sort((first, second) => +first.start - +second.start);
    }

    return groupedEvents;
  }, [events]);

  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeEnd, rangeStart],
  );

  useEffect(() => {
    const normalizedAnchor = startOfDay(anchorDate);
    pendingFocusRef.current = format(normalizedAnchor, "yyyy-MM-dd");
    setRangeStart(addDays(normalizedAnchor, -AGENDA_DAYS_BEFORE_ANCHOR));
    setRangeEnd(addDays(normalizedAnchor, AGENDA_DAYS_AFTER_ANCHOR));
  }, [anchorDate]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const pendingPrepend = pendingPrependRef.current;

    if (scroller && pendingPrepend) {
      const addedHeight = scroller.scrollHeight - pendingPrepend.scrollHeight;
      scroller.scrollTop = pendingPrepend.scrollTop + addedHeight;
      pendingPrependRef.current = null;
      requestAnimationFrame(() => {
        loadingPastRef.current = false;
        setIsLoadingPast(false);
      });
    }

    const focusKey = pendingFocusRef.current;
    if (!scroller || !focusKey) return;

    const target = scroller.querySelector<HTMLElement>(
      `[data-agenda-date="${focusKey}"]`,
    );
    if (!target) return;

    const useSmoothScroll = hasFocusedOnceRef.current;
    const targetTop =
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    suppressLazyLoadUntilRef.current =
      Date.now() + (useSmoothScroll ? 700 : 80);
    scroller.scrollTo({
      top: Math.max(0, targetTop - 41),
      behavior: useSmoothScroll ? "smooth" : "auto",
    });
    hasFocusedOnceRef.current = true;
    pendingFocusRef.current = null;
  }, [isLoading, rangeEnd, rangeStart]);

  const loadPast = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || loadingPastRef.current) return;

    loadingPastRef.current = true;
    setIsLoadingPast(true);
    pendingPrependRef.current = {
      scrollHeight: scroller.scrollHeight,
      scrollTop: scroller.scrollTop,
    };
    setRangeStart((current) => addDays(current, -AGENDA_BATCH_DAYS));
  }, []);

  const loadFuture = useCallback(() => {
    if (loadingFutureRef.current) return;

    loadingFutureRef.current = true;
    setIsLoadingFuture(true);
    setRangeEnd((current) => addDays(current, AGENDA_BATCH_DAYS));
    requestAnimationFrame(() => {
      loadingFutureRef.current = false;
      setIsLoadingFuture(false);
    });
  }, []);

  const handleScroll = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || Date.now() < suppressLazyLoadUntilRef.current) return;

    if (scroller.scrollTop <= LOAD_THRESHOLD_PX) {
      loadPast();
    }

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (distanceFromBottom <= LOAD_THRESHOLD_PX) {
      loadFuture();
    }
  }, [loadFuture, loadPast]);

  if (isLoading) {
    return (
      <div
        className="rnm-agenda-scroll"
        role="region"
        aria-label={t("agendaRegionLabel")}
        aria-busy="true"
      >
        <div className="rnm-agenda-sticky-header">
          <span>{t("date")}</span>
          <span>{t("appointments")}</span>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 7 }).map((_, index) => (
            <div className="rnm-agenda-day" key={index}>
              <div className="rnm-agenda-date-rail space-y-2">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="rnm-agenda-events py-3">
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="rnm-agenda-scroll"
      role="region"
      aria-label={t("agendaRegionLabel")}
      aria-busy={isLoadingPast || isLoadingFuture}
      tabIndex={0}
      onScroll={handleScroll}
    >
      <div className="rnm-agenda-sticky-header">
        <span>{t("date")}</span>
        <span>{t("appointments")}</span>
      </div>

      <div className="rnm-agenda-loader" aria-live="polite">
        {isLoadingPast && (
          <span>
            <LoaderCircle className="size-3.5 animate-spin" />
            {t("loadingEarlierDates")}
          </span>
        )}
      </div>

      {days.map((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDay.get(dayKey) ?? [];
        const isToday = isSameDay(day, new Date());

        return (
          <section
            key={dayKey}
            data-agenda-date={dayKey}
            className={cn("rnm-agenda-day", isToday && "is-today")}
          >
            <div className="rnm-agenda-date-rail">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {format(day, "dd", { locale: dateLocale })}
                </span>
                <span className="truncate text-sm font-medium capitalize">
                  {format(day, "EEE", { locale: dateLocale })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">
                  {format(day, "MMMM yyyy", { locale: dateLocale })}
                </span>
                {isToday && (
                  <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
                    {t("today")}
                  </span>
                )}
              </div>
            </div>

            <div className="rnm-agenda-events">
              {dayEvents.length === 0 ? (
                <div className="rnm-agenda-empty-day">
                  {t("noAppointmentsForDay")}
                </div>
              ) : (
                dayEvents.map((event) => {
                  const startTime = format(event.start, "HH:mm", {
                    locale: dateLocale,
                  });
                  const endTime = format(event.end, "HH:mm", {
                    locale: dateLocale,
                  });

                  return (
                    <button
                      key={String(event.id)}
                      type="button"
                      className="rnm-agenda-event"
                      aria-label={t("openAppointment", {
                        name: event.title,
                        time: startTime,
                      })}
                      onClick={() => onSelectEvent(event)}
                    >
                      <span className="rnm-agenda-event-time">
                        <strong>{startTime}</strong>
                        <span>{endTime}</span>
                      </span>
                      <span className="min-w-0 text-start">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {event.title}
                        </span>
                        {event.resource.companyName && (
                          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {event.resource.companyName}
                            </span>
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          </section>
        );
      })}

      <div className="rnm-agenda-loader" aria-live="polite">
        {isLoadingFuture && (
          <span>
            <LoaderCircle className="size-3.5 animate-spin" />
            {t("loadingLaterDates")}
          </span>
        )}
      </div>
    </div>
  );
}
