"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  FileCheck,
  FileX,
  Inbox,
  Loader2,
  Search,
  Upload,
} from "lucide-react"
import Link from "next/link"

type ActionTabKey = "exigencia" | "rejected" | "pending"

type ActionDoc = {
  _id: string
  individualProcessId: string
  personName: string
  referenceNumber?: string
  processTypeName?: string
  documentName: string
  status: string
  isExigencia: boolean
  caseStatusName?: string
  clientDeadlineDate?: string
}

type ActionDocGroup = {
  processId: string
  personName: string
  referenceNumber?: string
  processTypeName?: string
  docs: ActionDoc[]
}

function groupDocsByProcess(docs: ActionDoc[]): ActionDocGroup[] {
  const groups = new Map<string, ActionDocGroup>()

  for (const doc of docs) {
    const group = groups.get(doc.individualProcessId)

    if (group) {
      group.docs.push(doc)
      continue
    }

    groups.set(doc.individualProcessId, {
      processId: doc.individualProcessId,
      personName: doc.personName,
      referenceNumber: doc.referenceNumber,
      processTypeName: doc.processTypeName,
      docs: [doc],
    })
  }

  return Array.from(groups.values())
}

function parseDateOnly(dateStr: string): Date {
  // dateStr is in YYYY-MM-DD form coming from Convex.
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function formatDeadline(
  dateStr: string,
  now: Date,
  locale: string,
  labels: {
    today: string
    tomorrow: string
    overdue: (days: number) => string
    inDays: (days: number) => string
  }
): { label: string; tone: "danger" | "warning" | "neutral" } {
  const target = parseDateOnly(dateStr)
  const startOfTodayMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const diffDays = Math.round((target.getTime() - startOfTodayMs) / 86_400_000)

  if (diffDays < 0) {
    return { label: labels.overdue(Math.abs(diffDays)), tone: "danger" }
  }
  if (diffDays === 0) return { label: labels.today, tone: "danger" }
  if (diffDays === 1) return { label: labels.tomorrow, tone: "warning" }
  if (diffDays <= 7) return { label: labels.inDays(diffDays), tone: "warning" }

  return {
    label: target.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "short",
    }),
    tone: "neutral",
  }
}

function statusBadgeFor(doc: ActionDoc, t: (key: string) => string) {
  if (doc.isExigencia) {
    return { label: t("urgentRequestBadge"), variant: "destructive" as const }
  }
  if (doc.status === "rejected") {
    return { label: t("rejected"), variant: "destructive" as const }
  }
  return { label: t("pendingUpload"), variant: "secondary" as const }
}

export function ClientDocumentsWidget() {
  const t = useTranslations("Dashboard")
  const locale = useLocale()
  const summary = useQuery(api.dashboard.getClientMissingDocumentsSummary)
  const [activeTab, setActiveTab] = useState<ActionTabKey | "all">("all")
  const [search, setSearch] = useState("")
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const groupedDocs = useMemo(() => {
    const docs = (summary?.documents ?? []) as ActionDoc[]
    return {
      exigencia: docs.filter((d) => d.isExigencia),
      rejected: docs.filter((d) => !d.isExigencia && d.status === "rejected"),
      pending: docs.filter((d) => !d.isExigencia && d.status === "not_started"),
      all: docs,
    }
  }, [summary?.documents])

  const filteredDocs = useMemo(() => {
    const base = groupedDocs[activeTab] ?? []
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((doc) => {
      const haystack = [
        doc.personName,
        doc.documentName,
        doc.processTypeName,
        doc.referenceNumber,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [groupedDocs, activeTab, search])

  const filteredGroups = useMemo(
    () => groupDocsByProcess(filteredDocs),
    [filteredDocs]
  )

  const filteredGroupIds = useMemo(
    () => filteredGroups.map((group) => group.processId),
    [filteredGroups]
  )

  useEffect(() => {
    // Keep groups expanded by default, including when data, tabs, or search change.
    setOpenGroups(new Set(filteredGroupIds))
  }, [filteredGroupIds])

  if (!summary) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("clientActionCenter")}</CardTitle>
          <CardDescription>{t("clientActionCenterDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const { totals } = summary
  const completionRate =
    totals.total > 0 ? Math.round((totals.approved / totals.total) * 100) : 0

  if (totals.total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("clientActionCenter")}</CardTitle>
          <CardDescription>{t("clientActionCenterDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noDocumentsYet")}</p>
        </CardContent>
      </Card>
    )
  }

  const now = new Date()
  const deadlineLabels = {
    today: t("deadlineToday"),
    tomorrow: t("deadlineTomorrow"),
    overdue: (days: number) => t("deadlineOverdue", { days }),
    inDays: (days: number) => t("deadlineInDays", { days }),
  }

  const isAllResolved = totals.actionRequired === 0
  const isLimitReached =
    typeof summary.documentsLimit === "number" &&
    typeof summary.documentsTotal === "number" &&
    summary.documentsTotal > summary.documentsLimit

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{t("clientActionCenter")}</CardTitle>
            <CardDescription>{t("clientActionCenterDescription")}</CardDescription>
          </div>
          <Link
            href="/individual-processes"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t("viewAllProcesses")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {isAllResolved ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                  {t("allDocumentsSent")}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  {t("allDocumentsSentDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-700 dark:text-orange-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-orange-950 dark:text-orange-100">
                  {t("documentsNeedAction", { count: totals.actionRequired })}
                </p>
                <p className="mt-0.5 text-xs text-orange-800 dark:text-orange-200">
                  {totals.exigencia > 0
                    ? t("documentsNeedActionWithExigencia", { count: totals.exigencia })
                    : t("documentsNeedActionDescription")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiTile
            label={t("urgentRequest")}
            value={totals.exigencia}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            tone="danger"
          />
          <KpiTile
            label={t("pendingUpload")}
            value={totals.pending}
            icon={<Upload className="h-3.5 w-3.5" />}
            tone="warning"
          />
          <KpiTile
            label={t("underReview")}
            value={totals.awaitingReview}
            icon={<Clock className="h-3.5 w-3.5" />}
            tone="info"
          />
          <KpiTile
            label={t("approved")}
            value={totals.approved}
            icon={<FileCheck className="h-3.5 w-3.5" />}
            tone="success"
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium">{t("overallCompletion")}</span>
            <span className="tabular-nums text-muted-foreground">
              {totals.approved} {t("of")} {totals.total} · {completionRate}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full bg-emerald-500 transition-all dark:bg-emerald-400"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActionTabKey | "all")}
          className="flex flex-1 flex-col gap-3"
        >
          <div className="space-y-2">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted p-1 sm:grid-cols-4">
              <TabsTrigger value="all" className="min-w-0 gap-1.5 px-2 py-2 text-xs sm:text-sm">
                {t("tabAll")}
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {groupedDocs.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="exigencia" className="min-w-0 gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                <span className="truncate">{t("tabExigencias")}</span>
                <Badge
                  variant={groupedDocs.exigencia.length > 0 ? "destructive" : "secondary"}
                  className="h-5 px-1.5 text-[10px]"
                >
                  {groupedDocs.exigencia.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="min-w-0 gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <FileX className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                <span className="truncate">{t("tabRejected")}</span>
                <Badge
                  variant={groupedDocs.rejected.length > 0 ? "destructive" : "secondary"}
                  className="h-5 px-1.5 text-[10px]"
                >
                  {groupedDocs.rejected.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="min-w-0 gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <Upload className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="truncate">{t("tabPending")}</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {groupedDocs.pending.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchDocuments")}
                className="h-10 pl-8 text-sm"
              />
            </div>
          </div>

          <TabsContent value={activeTab} className="m-0 flex-1">
            <ActionDocList
              groups={filteredGroups}
              openGroups={openGroups}
              onToggleGroup={(processId) => {
                setOpenGroups((current) => {
                  const next = new Set(current)
                  if (next.has(processId)) {
                    next.delete(processId)
                  } else {
                    next.add(processId)
                  }
                  return next
                })
              }}
              isLimitReached={isLimitReached}
              totalCount={summary.documentsTotal ?? filteredDocs.length}
              limit={summary.documentsLimit ?? filteredDocs.length}
              hasSearch={search.trim().length > 0}
              now={now}
              locale={locale}
              deadlineLabels={deadlineLabels}
              labels={{
                emptySearch: t("emptySearch"),
                emptyCategory: t("emptyCategory"),
                emptyAll: t("allDocumentsSentDescription"),
                documentsInProcess: (count: number) =>
                  t("documentsInProcess", { count }),
                collapseProcess: t("collapseProcess"),
                expandProcess: t("expandProcess"),
                send: t("sendDocuments"),
                reupload: t("reuploadDocument"),
                limitReached: (overflow: number) =>
                  t("documentsLimitReached", { count: overflow }),
                statusBadge: (doc: ActionDoc) => statusBadgeFor(doc, t),
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function KpiTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: "danger" | "warning" | "info" | "success"
}) {
  const palette: Record<typeof tone, string> = {
    danger: "text-orange-700 dark:text-orange-300",
    warning: "text-amber-700 dark:text-amber-300",
    info: "text-blue-700 dark:text-blue-300",
    success: "text-emerald-700 dark:text-emerald-300",
  }

  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <div className={`flex min-w-0 items-start gap-1.5 text-[11px] leading-tight sm:text-xs ${palette[tone]}`}>
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function ActionDocList({
  groups,
  openGroups,
  onToggleGroup,
  isLimitReached,
  totalCount,
  limit,
  hasSearch,
  now,
  locale,
  deadlineLabels,
  labels,
}: {
  groups: ActionDocGroup[]
  openGroups: Set<string>
  onToggleGroup: (processId: string) => void
  isLimitReached: boolean
  totalCount: number
  limit: number
  hasSearch: boolean
  now: Date
  locale: string
  deadlineLabels: {
    today: string
    tomorrow: string
    overdue: (days: number) => string
    inDays: (days: number) => string
  }
  labels: {
    emptySearch: string
    emptyCategory: string
    emptyAll: string
    documentsInProcess: (count: number) => string
    collapseProcess: string
    expandProcess: string
    send: string
    reupload: string
    limitReached: (overflow: number) => string
    statusBadge: (doc: ActionDoc) => { label: string; variant: "destructive" | "secondary" }
  }
}) {
  if (groups.length === 0) {
    return (
      <div className="flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        <p className="text-sm text-muted-foreground">
          {hasSearch ? labels.emptySearch : labels.emptyCategory}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <ScrollArea className="h-[360px] rounded-md border sm:h-[340px]">
        <div className="space-y-2 p-2">
          {groups.map((group) => {
            const isOpen = openGroups.has(group.processId)
            const groupLabel = [
              group.personName,
              group.processTypeName,
              group.referenceNumber,
            ]
              .filter(Boolean)
              .join(" · ")

            return (
              <section
                key={group.processId}
                className="overflow-hidden rounded-lg border bg-background shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.processId)}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? labels.collapseProcess : labels.expandProcess}
                  className="flex w-full items-center justify-between gap-3 bg-muted/40 px-3 py-3 text-left transition-colors hover:bg-muted/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{group.personName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.processTypeName || group.referenceNumber || groupLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      {labels.documentsInProcess(group.docs.length)}
                    </Badge>
                    <Badge variant="secondary" className="sm:hidden">
                      {group.docs.length}
                    </Badge>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <ul className="divide-y">
                    {group.docs.map((doc) => {
                      const deadline = doc.clientDeadlineDate
                        ? formatDeadline(doc.clientDeadlineDate, now, locale, deadlineLabels)
                        : null
                      const badge = labels.statusBadge(doc)
                      const actionLabel =
                        doc.status === "rejected" ? labels.reupload : labels.send

                      return (
                        <li key={doc._id}>
                          <Link
                            href={`/individual-processes/${doc.individualProcessId}`}
                            className="flex items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant={badge.variant}
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  {badge.label}
                                </Badge>
                                <span className="min-w-0 break-words text-sm font-medium leading-snug">
                                  {doc.documentName}
                                </span>
                              </div>
                              {deadline && (
                                <p
                                  className={`text-xs ${
                                    deadline.tone === "danger"
                                      ? "font-medium text-rose-600 dark:text-rose-400"
                                      : deadline.tone === "warning"
                                        ? "font-medium text-amber-600 dark:text-amber-400"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {deadline.label}
                                </p>
                              )}
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              {actionLabel}
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </ScrollArea>
      {isLimitReached && (
        <p className="text-center text-xs text-muted-foreground">
          {labels.limitReached(totalCount - limit)}
        </p>
      )}
    </div>
  )
}
