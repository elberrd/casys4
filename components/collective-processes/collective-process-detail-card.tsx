"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Edit, AlertCircle, Building2, User, MapPin, Globe2, Calendar, CheckCircle, XCircle, RotateCcw } from "lucide-react"
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
      requestDate: string
      isUrgent: boolean
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
  const { toast } = useToast()

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [cancelNotes, setCancelNotes] = useState("")
  const [cancelIndividuals, setCancelIndividuals] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // TODO: Remove these - status is now calculated from individual processes
  // const completeProcess = useMutation(api.collectiveProcesses.complete)
  // const cancelProcess = useMutation(api.collectiveProcesses.cancel)
  // const reopenProcess = useMutation(api.collectiveProcesses.reopen)

  const handleEdit = () => {
    router.push(`/collective-processes/${collectiveProcess._id}/edit`)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Check if all individuals are completed or cancelled
  const allIndividualsComplete = (collectiveProcess.individualProcesses || []).every(
    (ip) => ip.status === "completed" || ip.status === "cancelled"
  ) && (collectiveProcess.individualProcesses?.length ?? 0) > 0

  // TODO: Remove these handlers - status is now calculated automatically
  // const handleComplete = async () => {
  //   setIsLoading(true)
  //   try {
  //     await completeProcess({ id: collectiveProcess._id })
  //     toast({
  //       title: t('completeSuccess'),
  //       description: t('completeSuccessDescription'),
  //     })
  //     setCompleteDialogOpen(false)
  //     router.refresh()
  //   } catch (error: any) {
  //     toast({
  //       title: t('completeError'),
  //       description: error.message,
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  // const handleCancel = async () => {
  //   if (!cancelNotes.trim()) {
  //     toast({
  //       title: t('cancelError'),
  //       description: t('cancelNotesRequired'),
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   setIsLoading(true)
  //   try {
  //     await cancelProcess({
  //       id: collectiveProcess._id,
  //       notes: cancelNotes,
  //       cancelIndividuals,
  //     })
  //     toast({
  //       title: t('cancelSuccess'),
  //       description: t('cancelSuccessDescription'),
  //     })
  //     setCancelDialogOpen(false)
  //     setCancelNotes("")
  //     setCancelIndividuals(false)
  //     router.refresh()
  //   } catch (error: any) {
  //     toast({
  //       title: t('cancelError'),
  //       description: error.message,
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  // const handleReopen = async () => {
  //   setIsLoading(true)
  //   try {
  //     await reopenProcess({ id: collectiveProcess._id })
  //     toast({
  //       title: t('reopenSuccess'),
  //       description: t('reopenSuccessDescription'),
  //     })
  //     setReopenDialogOpen(false)
  //     router.refresh()
  //   } catch (error: any) {
  //     toast({
  //       title: t('reopenError'),
  //       description: error.message,
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

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

            {/* TODO: Status action buttons deprecated - main process status is now calculated automatically */}
            {/* Mark Complete Button - DEPRECATED - status now calculated from individual processes */}
            {/* {collectiveProcess.status === "in_progress" && allIndividualsComplete && (
              <Button onClick={() => setCompleteDialogOpen(true)} variant="default">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('markComplete')}
              </Button>
            )} */}

            {/* Cancel Button - DEPRECATED - status now calculated from individual processes */}
            {/* {collectiveProcess.status !== "cancelled" && collectiveProcess.status !== "completed" && (
              <Button onClick={() => setCancelDialogOpen(true)} variant="destructive">
                <XCircle className="mr-2 h-4 w-4" />
                {t('cancelProcess')}
              </Button>
            )} */}

            {/* Reopen Button - DEPRECATED - status now calculated from individual processes */}
            {/* {(collectiveProcess.status === "completed" || collectiveProcess.status === "cancelled") && (
              <Button onClick={() => setReopenDialogOpen(true)} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('reopenProcess')}
              </Button>
            )} */}
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

      {/* TODO: These dialogs are deprecated - main process status is now calculated from individual processes */}
      {/* Complete Dialog - DEPRECATED */}
      {/* <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('completeDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('completeDialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isLoading}>
              {isLoading ? t('completing') : t('markComplete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}

      {/* Cancel Dialog - DEPRECATED */}
      {/* <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cancelDialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-notes">{t('cancellationNotes')}</Label>
              <Textarea
                id="cancel-notes"
                placeholder={t('cancellationNotesPlaceholder')}
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                disabled={isLoading}
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cancel-individuals"
                checked={cancelIndividuals}
                onCheckedChange={(checked) => setCancelIndividuals(checked as boolean)}
                disabled={isLoading}
              />
              <Label
                htmlFor="cancel-individuals"
                className="text-sm font-normal cursor-pointer"
              >
                {t('cancelIndividualProcesses')}
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isLoading}>
              {isLoading ? t('cancelling') : t('cancelProcess')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}

      {/* Reopen Dialog - DEPRECATED */}
      {/* <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reopenDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reopenDialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={isLoading}>
              {isLoading ? t('reopening') : t('reopenProcess')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </Card>
  )
}
