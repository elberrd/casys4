"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react"
import { MissingDataModal } from "./missing-data-modal"

interface MissingDataCardProps {
  companyId: Id<"companies">
}

export function MissingDataCard({ companyId }: MissingDataCardProps) {
  const t = useTranslations('Companies.dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"qualification" | "profExperience" | "both">("both")

  const stats = useQuery(api.companies.getCompanyQualificationStats, { companyId })

  const handleOpenModal = (type: "qualification" | "profExperience" | "both") => {
    setModalType(type)
    setModalOpen(true)
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('missingData')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasIssues = stats.withoutQualification > 0 || stats.withoutProfExperience > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('missingData')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasIssues && stats.total > 0 ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('allProcessesComplete')}
            </AlertDescription>
          </Alert>
        ) : stats.total === 0 ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm text-muted-foreground">{t('noProcesses')}</p>
          </div>
        ) : (
          <>
            {/* Without Qualification */}
            {stats.withoutQualification > 0 && (
              <Alert variant="destructive" className="relative">
                <AlertTriangle className="h-4 w-4" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal("qualification")}
                  className="absolute top-3 right-3 h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {t('viewDetails')}
                </Button>
                <AlertDescription>
                  <div className="flex items-center justify-between pr-24">
                    <span>{t('withoutQualification')}</span>
                    <span className="font-bold text-lg ml-2">
                      {stats.withoutQualification}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-destructive/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full"
                      style={{
                        width: `${Math.round((stats.withoutQualification / stats.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {Math.round((stats.withoutQualification / stats.total) * 100)}% {t('ofTotal')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Without Professional Experience */}
            {stats.withoutProfExperience > 0 && (
              <Alert variant="destructive" className="relative">
                <AlertTriangle className="h-4 w-4" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenModal("profExperience")}
                  className="absolute top-3 right-3 h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {t('viewDetails')}
                </Button>
                <AlertDescription>
                  <div className="flex items-center justify-between pr-24">
                    <span>{t('withoutProfExperience')}</span>
                    <span className="font-bold text-lg ml-2">
                      {stats.withoutProfExperience}
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-destructive/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive rounded-full"
                      style={{
                        width: `${Math.round((stats.withoutProfExperience / stats.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {Math.round((stats.withoutProfExperience / stats.total) * 100)}% {t('ofTotal')}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('totalProcesses')}: <strong>{stats.total}</strong>
                </p>
                {hasIssues && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenModal("both")}
                    className="h-7 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('viewAllMissing')}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Missing Data Modal */}
      <MissingDataModal
        companyId={companyId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        missingType={modalType}
      />
    </Card>
  )
}
