"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, FileText, ArrowRight, Activity, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const TERMINAL_STATUS_CODES = new Set(["concluido", "cancelado", "indeferido"])

// Reusable palette mapped on stable status codes (falls back to a deterministic
// rotation so unknown codes still get distinct colors in the stacked bar).
const STATUS_COLOR_BY_CODE: Record<string, string> = {
  em_preparacao: "bg-slate-400 dark:bg-slate-500",
  documentacao: "bg-amber-400 dark:bg-amber-500",
  em_tramite: "bg-blue-500 dark:bg-blue-400",
  exigencia: "bg-orange-500 dark:bg-orange-400",
  publicado_dou: "bg-violet-500 dark:bg-violet-400",
  deferido: "bg-emerald-500 dark:bg-emerald-400",
  concluido: "bg-emerald-600 dark:bg-emerald-500",
  cancelado: "bg-zinc-400 dark:bg-zinc-500",
  indeferido: "bg-rose-500 dark:bg-rose-400",
  entrada_brasil: "bg-cyan-500 dark:bg-cyan-400",
  rnm: "bg-indigo-500 dark:bg-indigo-400",
}

const FALLBACK_COLORS = [
  "bg-sky-500 dark:bg-sky-400",
  "bg-fuchsia-500 dark:bg-fuchsia-400",
  "bg-lime-500 dark:bg-lime-400",
  "bg-teal-500 dark:bg-teal-400",
  "bg-pink-500 dark:bg-pink-400",
]

function colorForStatus(code: string, index: number) {
  return STATUS_COLOR_BY_CODE[code] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

export function ClientProcessesWidget() {
  const t = useTranslations("Dashboard")
  const stats = useQuery(api.dashboard.getProcessStats)

  const breakdown = useMemo(() => {
    if (!stats) return null

    const entries = Object.entries(stats.statusCounts).map(([statusId, data], idx) => ({
      statusId,
      code: data.code,
      name: data.name,
      count: data.count,
      percentage: stats.statusPercentages[statusId] ?? 0,
      color: colorForStatus(data.code, idx),
    }))

    const sorted = entries.sort((a, b) => b.count - a.count)
    const completed = sorted
      .filter((s) => TERMINAL_STATUS_CODES.has(s.code))
      .reduce((acc, s) => acc + s.count, 0)
    const active = stats.total - completed

    return {
      total: stats.total,
      active,
      completed,
      entries: sorted,
    }
  }, [stats])

  if (!stats || !breakdown) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("yourProcesses")}</CardTitle>
          <CardDescription>{t("yourProcessesHealthDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (breakdown.total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("yourProcesses")}</CardTitle>
          <CardDescription>{t("yourProcessesHealthDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noProcessesYet")}</p>
        </CardContent>
      </Card>
    )
  }

  const completionRate = breakdown.total > 0
    ? Math.round((breakdown.completed / breakdown.total) * 100)
    : 0

  const topStatuses = breakdown.entries.slice(0, 5)
  const hasMoreStatuses = breakdown.entries.length > topStatuses.length

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{t("yourProcesses")}</CardTitle>
            <CardDescription>{t("yourProcessesHealthDescription")}</CardDescription>
          </div>
          <Link
            href="/individual-processes"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t("viewAll")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{t("kpiTotal")}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{breakdown.total}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t("kpiActive")}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-300">
              {breakdown.active}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t("kpiCompleted")}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              {breakdown.completed}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("processStatusDistribution")}</span>
            <span>
              {completionRate}% {t("completed").toLowerCase()}
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {breakdown.entries.map((entry) => (
              <div
                key={entry.statusId}
                className={`${entry.color} transition-all`}
                style={{ width: `${entry.percentage}%` }}
                title={`${entry.name}: ${entry.count} (${entry.percentage.toFixed(0)}%)`}
              />
            ))}
          </div>
        </div>

        <ul className="space-y-1.5">
          {topStatuses.map((entry) => (
            <li
              key={entry.statusId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${entry.color}`}
                />
                <span className="truncate">{entry.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                <span className="font-semibold">{entry.count}</span>
                <span className="text-muted-foreground">
                  {entry.percentage.toFixed(0)}%
                </span>
              </div>
            </li>
          ))}
          {hasMoreStatuses && (
            <li className="pt-1 text-center">
              <Link
                href="/individual-processes"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                +{breakdown.entries.length - topStatuses.length}{" "}
                {t("moreStatuses")}
              </Link>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
