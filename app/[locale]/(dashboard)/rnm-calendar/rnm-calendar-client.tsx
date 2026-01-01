"use client"

import { useState, useMemo, useCallback } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations, useLocale } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { IndividualProcessFormDialog } from "@/components/individual-processes/individual-process-form-dialog"
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { pt, enUS } from "date-fns/locale"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, CalendarDays, CalendarRange, LayoutList, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar.css"

const locales = {
  'pt': pt,
  'en': enUS,
}

interface CustomToolbarProps {
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void
  onView: (view: View) => void
  view: View
  label: string
  localizer: { messages: any }
}

const CustomToolbar = ({ onNavigate, onView, view, label, localizer: { messages } }: CustomToolbarProps) => {
  return (
    <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between p-2">
      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
            {messages.today}
          </Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => onNavigate('PREV')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onNavigate('NEXT')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-foreground sm:ml-2">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
        <Button
          variant={view === Views.MONTH ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onView(Views.MONTH)}
          className={cn("flex-1 sm:flex-none", view === Views.MONTH && "bg-background shadow-sm")}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {messages.month}
        </Button>
        <Button
          variant={view === Views.WEEK ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onView(Views.WEEK)}
          className={cn("flex-1 sm:flex-none", view === Views.WEEK && "bg-background shadow-sm")}
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          {messages.week}
        </Button>
        <Button
          variant={view === Views.AGENDA ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onView(Views.AGENDA)}
          className={cn("flex-1 sm:flex-none", view === Views.AGENDA && "bg-background shadow-sm")}
        >
          <LayoutList className="mr-2 h-4 w-4" />
          {messages.agenda}
        </Button>
      </div>
    </div>
  )
}

export function RNMCalendarClient() {
  const t = useTranslations('RNMCalendar')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const locale = useLocale()

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    getDay,
    locales,
  })

  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProcessId, setSelectedProcessId] = useState<Id<"individualProcesses"> | undefined>(undefined)

  // Fetch RNM appointments from Convex
  const appointments = useQuery(api.individualProcesses.listRNMAppointments, {}) ?? []

  // Transform appointments into calendar events
  const events = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.appointmentDateTime)
      .map((appointment) => ({
        id: appointment._id,
        title: appointment.person?.fullName || t('noCandidate'),
        start: new Date(appointment.appointmentDateTime!),
        end: new Date(new Date(appointment.appointmentDateTime!).getTime() + 60 * 60 * 1000), // 1 hour duration
        resource: {
          processId: appointment._id,
          rnmNumber: appointment.rnmNumber,
          companyName: appointment.companyApplicant?.name,
        },
      }))
  }, [appointments, t])

  const handleSelectEvent = useCallback((event: any) => {
    const processId = event.resource.processId as Id<"individualProcesses">
    setSelectedProcessId(processId)
    setIsDialogOpen(true)
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setSelectedProcessId(undefined)
    }
  }, [])

  const breadcrumbs = [
    {
      label: tBreadcrumbs('dashboard'),
      href: '/dashboard',
    },
    {
      label: tBreadcrumbs('rnmCalendar'),
    },
  ]

  // Custom messages for calendar
  const messages = {
    today: t('today'),
    previous: t('previous') || 'Anterior',
    next: t('next') || 'Próximo',
    month: t('month'),
    week: t('week'),
    day: t('day') || 'Dia',
    agenda: t('agenda') || 'Agenda',
    date: t('date') || 'Data',
    time: t('time') || 'Hora',
    event: t('event') || 'Evento',
    showMore: (total: number) => `+${total} ${t('more') || 'mais'}`,
    noEventsInRange: t('noEventsInRange') || 'Não há eventos neste período.',
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>

        <Card className="border-none shadow-none sm:border sm:shadow-sm">
          <CardContent className="p-0 sm:p-6">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 'calc(100vh - 280px)', minHeight: 600 }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              messages={messages}
              culture={locale}
              components={{
                toolbar: CustomToolbar,
              }}
              eventPropGetter={() => ({
                className: 'bg-primary border-primary text-primary-foreground text-xs rounded-md shadow-sm px-1.5 py-1 hover:bg-primary/90 transition-all cursor-pointer',
              })}
              dayPropGetter={(date) => {
                const isToday = new Date().toDateString() === date.toDateString()
                return {
                  className: cn(
                    "bg-background hover:bg-muted/30 transition-colors",
                    isToday && "bg-accent/10"
                  ),
                }
              }}
              views={{
                month: true,
                week: true,
                agenda: true,
              }}
              step={60}
              showMultiDayTimes
              popup
              className="rounded-md border bg-card text-card-foreground shadow-sm p-4"
            />
          </CardContent>
        </Card>

        {events.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('noAppointments')}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('noAppointmentsDescription') || 'Não há agendamentos de RNM no momento. Os agendamentos aparecerão aqui quando forem adicionados aos processos individuais.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedProcessId && (
        <IndividualProcessFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          individualProcessId={selectedProcessId}
        />
      )}
    </>
  )
}
