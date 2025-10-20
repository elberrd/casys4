"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileCheck, FileX, Clock, Upload } from "lucide-react"
import Link from "next/link"

export function ClientDocumentsWidget() {
  const t = useTranslations("Dashboard")

  const documentStatus = useQuery(api.dashboard.getCompanyDocumentStatus)

  if (!documentStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("documentStatus")}</CardTitle>
          <CardDescription>{t("documentStatusDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Aggregate totals across all people
  const totals = documentStatus.reduce(
    (acc, person) => ({
      pending: acc.pending + person.pending,
      underReview: acc.underReview + person.underReview,
      approved: acc.approved + person.approved,
      rejected: acc.rejected + person.rejected,
      total: acc.total + person.total,
    }),
    { pending: 0, underReview: 0, approved: 0, rejected: 0, total: 0 }
  )

  const completionRate =
    totals.total > 0 ? (totals.approved / totals.total) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("documentStatus")}</CardTitle>
        <CardDescription>{t("documentStatusDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t("overallCompletion")}</span>
              <span className="text-2xl font-bold">{completionRate.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {totals.approved} {t("of")} {totals.total} {t("documentsApproved")}
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Upload className="h-4 w-4 text-yellow-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("pendingUpload")}</p>
                <p className="text-xl font-bold">{totals.pending}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Clock className="h-4 w-4 text-blue-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("underReview")}</p>
                <p className="text-xl font-bold">{totals.underReview}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="rounded-full bg-green-100 p-2">
                <FileCheck className="h-4 w-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("approved")}</p>
                <p className="text-xl font-bold">{totals.approved}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="rounded-full bg-red-100 p-2">
                <FileX className="h-4 w-4 text-red-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{t("rejected")}</p>
                <p className="text-xl font-bold">{totals.rejected}</p>
              </div>
            </div>
          </div>

          {/* People with pending documents */}
          {documentStatus.length > 0 && totals.pending > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium">{t("peopleNeedingDocuments")}</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {documentStatus
                  .filter((person) => person.pending > 0)
                  .slice(0, 5)
                  .map((person) => (
                    <div
                      key={person.personId}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span className="text-muted-foreground">{person.personName}</span>
                      <Badge variant="outline">
                        {person.pending} {t("pending")}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {totals.total === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noDocumentsYet")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
