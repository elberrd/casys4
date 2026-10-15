"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, AlertCircle, Building2, User, MapPin, Globe2, Calendar } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"

interface CollectiveProcessDetailCardProps {
  collectiveProcess: {
    _id: Id<"collectiveProcesses">
    referenceNumber: string
    status: string // DEPRECATED: Kept for backward compatibility
    isUrgent?: boolean
    requestDate?: string
    notes?: string
    createdAt: number
    updatedAt: number
    completedAt?: number
    company?: {
      _id: Id<"companies">
      name: string
    } | null
    contactPerson?: {
      _id: Id<"people">
      fullName: string
      email?: string
    } | null
    processType?: {
      _id: Id<"processTypes">
      name: string
    } | null
    workplaceCity?: {
      _id: Id<"cities">
      name: string
    } | null
    consulate?: {
      _id: Id<"consulates">
      city?: {
        _id: Id<"cities">
        name: string
      } | null
    } | null
    originRequest?: {
      _id: Id<"processRequests">
      status: string
      requestDate?: string
      isUrgent?: boolean
      requesterProfile?: {
        fullName: string
        email: string
      } | null
    } | null
    individualProcesses?: Array<{
      _id: Id<"individualProcesses">
      status?: string
    }>
    // NEW: Calculated status from individual processes
    calculatedStatus?: {
      displayText: string
      displayTextEn: string
      breakdown: Array<{
        caseStatusId: string
        caseStatusName: string
        caseStatusNameEn?: string
        count: number
      }>
      totalProcesses: number
      hasMultipleStatuses: boolean
    }
  }
}

export function CollectiveProcessDetailCard({ collectiveProcess }: CollectiveProcessDetailCardProps) {
  const t = useTranslations('CollectiveProcesses')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const handleEdit = () => {
    router.push(`/collective-processes/${collectiveProcess._id}/edit`)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-3xl font-bold">
                {collectiveProcess.referenceNumber}
              </CardTitle>
              {collectiveProcess.isUrgent && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {tCommon('urgent')}
                </Badge>
              )}
            </div>
            {collectiveProcess.processType && (
              <Badge variant="outline">{collectiveProcess.processType.name}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              {tCommon('edit')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('companyInformation')}
            </h3>

            {collectiveProcess.company && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('company')}</p>
                  <p className="text-sm text-muted-foreground">{collectiveProcess.company.name}</p>
                </div>
              </div>
            )}

            {collectiveProcess.contactPerson && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('contactPerson')}</p>
                  <p className="text-sm text-muted-foreground">{collectiveProcess.contactPerson.fullName}</p>
                  {collectiveProcess.contactPerson.email && (
                    <p className="text-xs text-muted-foreground">{collectiveProcess.contactPerson.email}</p>
                  )}
                </div>
              </div>
            )}

            {collectiveProcess.originRequest?.requesterProfile && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('requester')}</p>
                  <p className="text-sm text-muted-foreground">{collectiveProcess.originRequest.requesterProfile.fullName}</p>
                  {collectiveProcess.originRequest.requesterProfile.email && (
                    <p className="text-xs text-muted-foreground">{collectiveProcess.originRequest.requesterProfile.email}</p>
                  )}
                </div>
              </div>
            )}

            {collectiveProcess.workplaceCity && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('workplaceCity')}</p>
                  <p className="text-sm text-muted-foreground">{collectiveProcess.workplaceCity.name}</p>
                </div>
              </div>
            )}

            {collectiveProcess.consulate && (
              <div className="flex items-start gap-2">
                <Globe2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('consulate')}</p>
                  <p className="text-sm text-muted-foreground">{collectiveProcess.consulate.city?.name || "-"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Process Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('processInformation')}
            </h3>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('requestDate')}</p>
                <p className="text-sm text-muted-foreground">{collectiveProcess.requestDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('createdAt')}</p>
                <p className="text-sm text-muted-foreground">{formatTimestamp(collectiveProcess.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('updatedAt')}</p>
                <p className="text-sm text-muted-foreground">{formatTimestamp(collectiveProcess.updatedAt)}</p>
              </div>
            </div>

            {collectiveProcess.completedAt && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('completedAt')}</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(collectiveProcess.completedAt)}</p>
                </div>
              </div>
            )}

            {/* Origin Request Info */}
            {collectiveProcess.originRequest && (
              <div className="flex items-start gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('createdFromRequest')}</p>
                  <Badge variant="secondary" className="text-xs">
                    {t('requestDate')}: {collectiveProcess.originRequest.requestDate}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
