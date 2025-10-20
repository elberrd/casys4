"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
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

interface MainProcessDetailCardProps {
  mainProcess: {
    _id: Id<"mainProcesses">
    referenceNumber: string
    status: string
    isUrgent: boolean
    requestDate: string
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
      name: string
    } | null
    originRequest?: {
      _id: Id<"processRequests">
      status: string
      requestDate: string
      isUrgent: boolean
    } | null
    individualProcesses?: Array<{
      _id: Id<"individualProcesses">
      status: string
    }>
  }
}

export function MainProcessDetailCard({ mainProcess }: MainProcessDetailCardProps) {
  const t = useTranslations('MainProcesses')
  const tCommon = useTranslations('Common')
  const router = useRouter()
  const { toast } = useToast()

  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [cancelNotes, setCancelNotes] = useState("")
  const [cancelIndividuals, setCancelIndividuals] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const completeProcess = useMutation(api.mainProcesses.complete)
  const cancelProcess = useMutation(api.mainProcesses.cancel)
  const reopenProcess = useMutation(api.mainProcesses.reopen)

  const handleEdit = () => {
    router.push(`/main-processes/${mainProcess._id}/edit`)
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Check if all individuals are completed or cancelled
  const allIndividualsComplete = (mainProcess.individualProcesses || []).every(
    (ip) => ip.status === "completed" || ip.status === "cancelled"
  )

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await completeProcess({ id: mainProcess._id })
      toast({
        title: t('completeSuccess'),
        description: t('completeSuccessDescription'),
      })
      setCompleteDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: t('completeError'),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelNotes.trim()) {
      toast({
        title: t('cancelError'),
        description: t('cancelNotesRequired'),
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await cancelProcess({
        id: mainProcess._id,
        notes: cancelNotes,
        cancelIndividuals,
      })
      toast({
        title: t('cancelSuccess'),
        description: t('cancelSuccessDescription'),
      })
      setCancelDialogOpen(false)
      setCancelNotes("")
      setCancelIndividuals(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: t('cancelError'),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReopen = async () => {
    setIsLoading(true)
    try {
      await reopenProcess({ id: mainProcess._id })
      toast({
        title: t('reopenSuccess'),
        description: t('reopenSuccessDescription'),
      })
      setReopenDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: t('reopenError'),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-3xl font-bold">
                {mainProcess.referenceNumber}
              </CardTitle>
              {mainProcess.isUrgent && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {tCommon('urgent')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={mainProcess.status} type="main_process" />
              {mainProcess.processType && (
                <Badge variant="outline">{mainProcess.processType.name}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEdit} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              {tCommon('edit')}
            </Button>

            {/* Mark Complete Button - visible when in_progress and all individuals are done */}
            {mainProcess.status === "in_progress" && allIndividualsComplete && (
              <Button onClick={() => setCompleteDialogOpen(true)} variant="default">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('markComplete')}
              </Button>
            )}

            {/* Cancel Button - visible when not cancelled */}
            {mainProcess.status !== "cancelled" && mainProcess.status !== "completed" && (
              <Button onClick={() => setCancelDialogOpen(true)} variant="destructive">
                <XCircle className="mr-2 h-4 w-4" />
                {t('cancelProcess')}
              </Button>
            )}

            {/* Reopen Button - visible when completed or cancelled */}
            {(mainProcess.status === "completed" || mainProcess.status === "cancelled") && (
              <Button onClick={() => setReopenDialogOpen(true)} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('reopenProcess')}
              </Button>
            )}
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

            {mainProcess.company && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('company')}</p>
                  <p className="text-sm text-muted-foreground">{mainProcess.company.name}</p>
                </div>
              </div>
            )}

            {mainProcess.contactPerson && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('contactPerson')}</p>
                  <p className="text-sm text-muted-foreground">{mainProcess.contactPerson.fullName}</p>
                  {mainProcess.contactPerson.email && (
                    <p className="text-xs text-muted-foreground">{mainProcess.contactPerson.email}</p>
                  )}
                </div>
              </div>
            )}

            {mainProcess.workplaceCity && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('workplaceCity')}</p>
                  <p className="text-sm text-muted-foreground">{mainProcess.workplaceCity.name}</p>
                </div>
              </div>
            )}

            {mainProcess.consulate && (
              <div className="flex items-start gap-2">
                <Globe2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('consulate')}</p>
                  <p className="text-sm text-muted-foreground">{mainProcess.consulate.name}</p>
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
                <p className="text-sm text-muted-foreground">{mainProcess.requestDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('createdAt')}</p>
                <p className="text-sm text-muted-foreground">{formatTimestamp(mainProcess.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t('updatedAt')}</p>
                <p className="text-sm text-muted-foreground">{formatTimestamp(mainProcess.updatedAt)}</p>
              </div>
            </div>

            {mainProcess.completedAt && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('completedAt')}</p>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(mainProcess.completedAt)}</p>
                </div>
              </div>
            )}

            {/* Origin Request Info */}
            {mainProcess.originRequest && (
              <div className="flex items-start gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('createdFromRequest')}</p>
                  <Badge variant="secondary" className="text-xs">
                    {t('requestDate')}: {mainProcess.originRequest.requestDate}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Complete Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
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
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
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
      </AlertDialog>

      {/* Reopen Dialog */}
      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
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
      </AlertDialog>
    </Card>
  )
}
