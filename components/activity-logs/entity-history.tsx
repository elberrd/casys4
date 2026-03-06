"use client"

import { useTranslations, useLocale } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow, format } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  UserPlus,
  ArrowRightLeft,
  FileText,
  AlertTriangle,
  Copy,
  Shield,
  ArrowRight,
  Clock,
  StickyNote,
  ListTodo,
  CircleDot,
  ToggleRight,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface EntityHistoryProps {
  entityType: string
  entityId: string
  title?: string
  fullProcessHistory?: boolean
}

// Fields to skip when rendering changed fields
const SKIP_FIELDS = new Set([
  "personName",
  "collectiveProcessReference",
  "changes",
  "statusFrom",
  "statusTo",
  "message",
  "documentType",
  "taskTitle",
  "relatedDataDeleted",
  "caseStatusId",
  "legalFrameworkId",
  "processTypeId",
  "sourceProcessId",
  "newProcessId",
  "caseStatusName",
  "affectedProcesses",
])

// Human-readable field labels
const FIELD_LABELS: Record<string, Record<string, string>> = {
  pt: {
    status: "Status",
    urgent: "Urgente",
    funcao: "Funcao",
    qualification: "Qualificacao",
    protocolNumber: "Protocolo",
    deadlineDate: "Prazo",
    deadlineUnit: "Unidade do prazo",
    deadlineQuantity: "Quantidade do prazo",
    deadlineSpecificDate: "Data especifica do prazo",
    professionalExperienceSince: "Experiencia profissional desde",
    lastSalaryAmount: "Ultimo salario",
    lastSalaryCurrency: "Moeda do salario",
    exchangeRateToBRL: "Taxa de cambio para BRL",
    salaryInBRL: "Salario em BRL",
    monthlyAmountToReceive: "Valor mensal a receber",
    dateProcess: "Data do processo",
    cboId: "CBO",
    consulateId: "Consulado",
    companyApplicantId: "Empresa requerente",
    userApplicantId: "Usuario requerente",
    personId: "Pessoa",
    collectiveProcessId: "Processo coletivo",
  },
  en: {
    status: "Status",
    urgent: "Urgent",
    funcao: "Role",
    qualification: "Qualification",
    protocolNumber: "Protocol",
    deadlineDate: "Deadline",
    deadlineUnit: "Deadline unit",
    deadlineQuantity: "Deadline quantity",
    deadlineSpecificDate: "Specific deadline date",
    professionalExperienceSince: "Professional experience since",
    lastSalaryAmount: "Last salary",
    lastSalaryCurrency: "Salary currency",
    exchangeRateToBRL: "Exchange rate to BRL",
    salaryInBRL: "Salary in BRL",
    monthlyAmountToReceive: "Monthly amount to receive",
    dateProcess: "Process date",
    cboId: "CBO",
    consulateId: "Consulate",
    companyApplicantId: "Applicant company",
    userApplicantId: "Applicant user",
    personId: "Person",
    collectiveProcessId: "Collective process",
  },
}

const SUB_ENTITY_ICONS: Record<string, React.ReactNode> = {
  note: <StickyNote className="h-2.5 w-2.5" />,
  task: <ListTodo className="h-2.5 w-2.5" />,
  document: <FileText className="h-2.5 w-2.5" />,
  status: <CircleDot className="h-2.5 w-2.5" />,
  condition: <ToggleRight className="h-2.5 w-2.5" />,
}

export function EntityHistory({
  entityType,
  entityId,
  title,
  fullProcessHistory,
}: EntityHistoryProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')
  const locale = useLocale()

  const simpleHistory = useQuery(
    api.activityLogs.getEntityHistory,
    fullProcessHistory ? "skip" : { entityType, entityId }
  )
  const fullHistory = useQuery(
    api.activityLogs.getIndividualProcessFullHistory,
    fullProcessHistory ? { processId: entityId as any } : "skip"
  )
  const history = fullProcessHistory ? fullHistory : simpleHistory

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-3.5 w-3.5" />
      case "created_from_existing":
        return <Copy className="h-3.5 w-3.5" />
      case "updated":
      case "fillable_fields_updated":
      case "filled_fields_saved":
        return <Pencil className="h-3.5 w-3.5" />
      case "deleted":
      case "bulk_deleted":
        return <Trash2 className="h-3.5 w-3.5" />
      case "approved":
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5" />
      case "rejected":
        return <AlertTriangle className="h-3.5 w-3.5" />
      case "assigned":
      case "reassigned":
        return <UserPlus className="h-3.5 w-3.5" />
      case "status_changed":
      case "status_added":
      case "status_updated":
        return <ArrowRightLeft className="h-3.5 w-3.5" />
      case "urgent_update":
      case "bulk_urgent_update":
        return <AlertTriangle className="h-3.5 w-3.5" />
      case "authorization_update":
      case "bulk_authorization_update":
        return <Shield className="h-3.5 w-3.5" />
      case "marked_as_previous":
        return <Clock className="h-3.5 w-3.5" />
      case "condition_fulfilled":
      case "condition_unfulfilled":
        return <ToggleRight className="h-3.5 w-3.5" />
      default:
        return <FileText className="h-3.5 w-3.5" />
    }
  }

  const getActionStyle = (action: string): { bg: string; text: string; badge: string } => {
    switch (action) {
      case "created":
      case "created_from_existing":
        return { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300" }
      case "updated":
      case "fillable_fields_updated":
      case "filled_fields_saved":
      case "authorization_update":
      case "bulk_authorization_update":
        return { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" }
      case "deleted":
      case "bulk_deleted":
      case "rejected":
        return { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" }
      case "approved":
      case "completed":
        return { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", badge: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300" }
      case "status_changed":
      case "status_added":
      case "status_updated":
      case "status_deleted":
        return { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", badge: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300" }
      case "urgent_update":
      case "bulk_urgent_update":
        return { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300" }
      case "assigned":
      case "reassigned":
        return { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", badge: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" }
      case "condition_fulfilled":
        return { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", badge: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300" }
      case "condition_unfulfilled":
        return { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", badge: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300" }
      default:
        return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", badge: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300" }
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "boolean") return value ? (locale === "pt" ? "Sim" : "Yes") : (locale === "pt" ? "Nao" : "No")
    if (typeof value === "number") {
      // Check if it looks like a timestamp (> year 2000 in ms)
      if (value > 946684800000) {
        try {
          return format(new Date(value), locale === "pt" ? "dd/MM/yyyy" : "MM/dd/yyyy")
        } catch {
          return String(value)
        }
      }
      return String(value)
    }
    if (typeof value === "string") {
      // Check if it's an ISO date or date-like string
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          return format(new Date(value), locale === "pt" ? "dd/MM/yyyy" : "MM/dd/yyyy")
        } catch {
          return value
        }
      }
      // Hide raw Convex IDs - they should have been resolved to names
      if (/^[a-z0-9]{20,}$/.test(value) || (value.length > 30 && value.includes(":"))) {
        return "..."
      }
      return value
    }
    return String(value)
  }

  const getFieldLabel = (field: string): string => {
    const labels = FIELD_LABELS[locale] || FIELD_LABELS.en
    return labels[field] || field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()
  }

  // Build renderable detail items from a log
  const getDetailItems = (log: any): { type: string; content: React.ReactNode }[] => {
    const items: { type: string; content: React.ReactNode }[] = []
    const details = log.details
    if (!details) return items

    // Status change
    if (details.statusFrom && details.statusTo) {
      items.push({
        type: "status",
        content: (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs font-normal">
              {details.statusFrom}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge className="text-xs font-normal">
              {details.statusTo}
            </Badge>
          </div>
        ),
      })
    }

    // Case status name (for created)
    if (details.caseStatusName && log.action === "created") {
      items.push({
        type: "info",
        content: (
          <span className="text-xs text-muted-foreground">
            Status: <span className="font-medium text-foreground">{details.caseStatusName}</span>
          </span>
        ),
      })
    }

    // Document type
    if (details.documentType) {
      items.push({
        type: "info",
        content: (
          <span className="text-xs text-muted-foreground">
            {t('documentType')}: <span className="font-medium text-foreground">{details.documentType}</span>
          </span>
        ),
      })
    }

    // Task title
    if (details.taskTitle) {
      items.push({
        type: "info",
        content: (
          <span className="text-xs text-muted-foreground">
            {t('taskTitle')}: <span className="font-medium text-foreground">{details.taskTitle}</span>
          </span>
        ),
      })
    }

    // Urgency
    if (details.urgent !== undefined) {
      items.push({
        type: "info",
        content: (
          <span className="text-xs text-muted-foreground">
            {locale === "pt" ? "Urgente" : "Urgent"}: <span className="font-medium text-foreground">{details.urgent ? (locale === "pt" ? "Sim" : "Yes") : (locale === "pt" ? "Nao" : "No")}</span>
          </span>
        ),
      })
    }

    // Message
    if (details.message) {
      items.push({
        type: "message",
        content: (
          <span className="text-xs text-muted-foreground italic">{details.message}</span>
        ),
      })
    }

    // Related data deleted (for delete actions)
    if (details.relatedDataDeleted) {
      const rd = details.relatedDataDeleted as Record<string, number>
      const parts = Object.entries(rd)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${count} ${key}`)
      if (parts.length > 0) {
        items.push({
          type: "info",
          content: (
            <span className="text-xs text-muted-foreground">
              {locale === "pt" ? "Dados relacionados removidos" : "Related data removed"}: <span className="font-medium text-foreground">{parts.join(", ")}</span>
            </span>
          ),
        })
      }
    }

    // Changed fields (before/after)
    if (details.changes && typeof details.changes === "object") {
      const changes = details.changes as Record<string, { before: unknown; after: unknown }>
      const changeEntries = Object.entries(changes).filter(([key]) => !SKIP_FIELDS.has(key))
      if (changeEntries.length > 0) {
        items.push({
          type: "changes",
          content: (
            <div className="space-y-1">
              {changeEntries.slice(0, 5).map(([field, change]) => (
                <div key={field} className="flex items-baseline gap-1.5 text-xs">
                  <span className="text-muted-foreground font-medium shrink-0">{getFieldLabel(field)}:</span>
                  <span className="text-muted-foreground line-through">{formatFieldValue(change.before)}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0 translate-y-px" />
                  <span className="font-medium text-foreground">{formatFieldValue(change.after)}</span>
                </div>
              ))}
              {changeEntries.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{changeEntries.length - 5} {locale === "pt" ? "mais alteracoes" : "more changes"}
                </span>
              )}
            </div>
          ),
        })
      }
    }

    // Remaining flat detail fields not already handled
    for (const [key, value] of Object.entries(details)) {
      if (SKIP_FIELDS.has(key)) continue
      if (key === "urgent") continue // already handled above
      if (typeof value === "object" && value !== null) continue // skip nested objects
      items.push({
        type: "info",
        content: (
          <span className="text-xs text-muted-foreground">
            {getFieldLabel(key)}: <span className="font-medium text-foreground">{formatFieldValue(value)}</span>
          </span>
        ),
      })
    }

    return items
  }

  if (history === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || t('entityHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || t('entityHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('noHistoryFound')}
          </p>
        </CardContent>
      </Card>
    )
  }

  const dateLocale = locale === "pt" ? ptBR : enUS

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title || t('entityHistory')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-0">
            {history.map((log, index) => {
              const style = getActionStyle(log.action)
              const isLast = index === history.length - 1
              const user = log.user?.fullName || tCommon('unknown')
              const actionLabel = t(`actions.${log.action}`, { defaultValue: log.action })
              const detailItems = getDetailItems(log)
              const subEntityType = (log as any).subEntityType as string | null
              const subEntityLabel = (log as any).subEntityLabel as string | null

              return (
                <div key={log._id} className="relative flex gap-3 group">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${style.bg} ${style.text}`}>
                      {getActionIcon(log.action)}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {subEntityType && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-muted-foreground">{SUB_ENTITY_ICONS[subEntityType]}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {t(`subEntityTypes.${subEntityType}`, { defaultValue: subEntityType })}
                              {subEntityLabel && `: ${subEntityLabel}`}
                            </span>
                          </div>
                        )}
                        <p className="text-sm">
                          <span className="font-medium">{user}</span>
                          <span className="text-muted-foreground"> &middot; {actionLabel.toLowerCase()}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(log.createdAt), locale === "pt" ? "dd/MM/yyyy 'as' HH:mm" : "MMM d, yyyy 'at' h:mm a", { locale: dateLocale })}
                          {" "}
                          <span className="text-muted-foreground/60">
                            ({formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                              locale: dateLocale,
                            })})
                          </span>
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${style.badge}`}>
                        {actionLabel}
                      </Badge>
                    </div>

                    {/* Detail items */}
                    {detailItems.length > 0 && (
                      <div className="mt-2 space-y-1.5 rounded-md border bg-muted/40 px-3 py-2">
                        {detailItems.map((item, i) => (
                          <div key={i}>{item.content}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
