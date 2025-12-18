"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, User, FileText, Scale, TrendingUp } from "lucide-react"

interface MissingDataModalProps {
  companyId: Id<"companies">
  open: boolean
  onOpenChange: (open: boolean) => void
  missingType?: "qualification" | "profExperience" | "both"
}

export function MissingDataModal({
  companyId,
  open,
  onOpenChange,
  missingType = "both",
}: MissingDataModalProps) {
  const t = useTranslations('Companies.dashboard')
  const router = useRouter()

  const processes = useQuery(
    api.companies.getProcessesWithMissingData,
    open ? { companyId, missingType } : "skip"
  )

  const handleProcessClick = (processId: Id<"individualProcesses">) => {
    router.push(`/individual-processes/${processId}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t('missingDataDetails')}
          </DialogTitle>
          <DialogDescription>
            {t('missingDataDescription')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {!processes ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : processes.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">{t('noMissingDataFound')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {processes.map((process) => (
                <div
                  key={process._id}
                  onClick={() => handleProcessClick(process._id)}
                  className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-3">
                      {/* Candidate */}
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('candidate')}
                          </p>
                          <p className="text-sm font-medium truncate">
                            {process.person?.fullName || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Authorization Type */}
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('authorizationType')}
                          </p>
                          <p className="text-sm truncate">
                            {process.processType?.name || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      {/* Legal Framework */}
                      <div className="flex items-start gap-2">
                        <Scale className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t('legalFramework')}
                          </p>
                          <p className="text-sm truncate">
                            {process.legalFramework?.name || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t('status')}
                          </p>
                          {process.caseStatus ? (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: process.caseStatus.color,
                                color: process.caseStatus.color,
                              }}
                            >
                              {process.caseStatus.name}
                            </Badge>
                          ) : (
                            <span className="text-sm">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Missing Data Indicators */}
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                    {process.missingQualification && (
                      <Badge variant="destructive" className="text-xs">
                        {t('qualificationMissing')}
                      </Badge>
                    )}
                    {process.missingProfExperience && (
                      <Badge variant="destructive" className="text-xs">
                        {t('profExperienceMissing')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
