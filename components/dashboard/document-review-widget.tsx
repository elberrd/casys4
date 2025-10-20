"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, ExternalLink } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { formatDistanceToNow } from "date-fns"
import { enUS, ptBR } from "date-fns/locale"
import { useLocale } from "next-intl"

export function DocumentReviewWidget() {
  const t = useTranslations("Dashboard")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const router = useRouter()

  const documents = useQuery(api.dashboard.getDocumentReviewQueue)
  const dateLocale = locale === "pt" ? ptBR : enUS

  if (!documents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("documentReviewQueue")}</CardTitle>
          <CardDescription>{t("documentReviewQueueDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("documentReviewQueue")}</CardTitle>
            <CardDescription>{t("documentReviewQueueDescription")}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/individual-processes")}
          >
            {t("viewAll")}
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t("noDocumentsForReview")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 5).map((doc) => {
              const timeAgo = formatDistanceToNow(new Date(doc.uploadedAt), {
                addSuffix: true,
                locale: dateLocale,
              })

              return (
                <div
                  key={doc._id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/individual-processes/${doc.individualProcessId}`)}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {doc.documentType?.name || tCommon("notApplicable")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.person?.fullName || tCommon("notApplicable")}
                      </p>
                      {doc.mainProcess && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.mainProcess.referenceNumber}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                    </div>
                  </div>
                </div>
              )
            })}
            {documents.length > 5 && (
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  +{documents.length - 5} {t("moreDocuments")}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
