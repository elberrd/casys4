"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ActivityLogFiltersProps {
  onFiltersChange: (filters: {
    userId?: Id<"users">
    entityType?: string
    entityId?: string
    action?: string
    startDate?: number
    endDate?: number
  }) => void
  onClearFilters: () => void
  hasActiveFilters?: boolean
}

export function ActivityLogFilters({
  onFiltersChange,
  onClearFilters,
  hasActiveFilters = false,
}: ActivityLogFiltersProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')

  const [isOpen, setIsOpen] = useState(false)
  const [entityType, setEntityType] = useState<string>("")
  const [entityId, setEntityId] = useState<string>("")
  const [action, setAction] = useState<string>("")
  const [startDateStr, setStartDateStr] = useState<string>("")
  const [endDateStr, setEndDateStr] = useState<string>("")

  // Common entity types in the system
  const entityTypes = [
    "collectiveProcesses",
    "individualProcesses",
    "tasks",
    "documents",
    "documentsDelivered",
    "users",
    "userProfiles",
    "companies",
    "people",
  ]

  // Common actions
  const actions = [
    "created",
    "updated",
    "deleted",
    "status_changed",
    "status_added",
    "approved",
    "rejected",
    "assigned",
    "reassigned",
    "completed",
    "cancelled",
    "reopened",
    "uploaded",
    "deactivated",
  ]

  const handleApplyFilters = () => {
    const startDate = startDateStr ? new Date(startDateStr).getTime() : undefined
    const endDate = endDateStr ? new Date(endDateStr).getTime() : undefined

    onFiltersChange({
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      action: action || undefined,
      startDate,
      endDate,
    })
  }

  const handleClear = () => {
    setEntityType("")
    setEntityId("")
    setAction("")
    setStartDateStr("")
    setEndDateStr("")
    onClearFilters()
  }

  // Count active local filters
  const activeFilterCount = [entityType, entityId, action, startDateStr, endDateStr].filter(Boolean).length

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('filters')}</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filtro' : 'filtros'}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {isOpen ? t('clickToHideFilters') : t('clickToShowFilters')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && !isOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="h-8 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  {tCommon('clear')}
                </Button>
              )}
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                isOpen ? "bg-muted" : ""
              )}>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Entity Type Filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="entityType" className="text-xs font-medium text-muted-foreground">
                    {t('entityType')}
                  </Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger id="entityType" className="h-9">
                      <SelectValue placeholder={t('selectEntityType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tCommon('all')}</SelectItem>
                      {entityTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`entityTypes.${type}`, { defaultValue: type })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity ID Filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="entityId" className="text-xs font-medium text-muted-foreground">
                    {t('entityId')}
                  </Label>
                  <Input
                    id="entityId"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder={t('enterEntityId')}
                    className="h-9"
                  />
                </div>

                {/* Action Filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="action" className="text-xs font-medium text-muted-foreground">
                    {t('action')}
                  </Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger id="action" className="h-9">
                      <SelectValue placeholder={t('selectAction')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tCommon('all')}</SelectItem>
                      {actions.map((act) => (
                        <SelectItem key={act} value={act}>
                          {t(`actions.${act}`, { defaultValue: act })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date Filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
                    {t('startDate')}
                  </Label>
                  <DatePicker
                    value={startDateStr}
                    onChange={(value) => setStartDateStr(value || "")}
                  />
                </div>

                {/* End Date Filter */}
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
                    {t('endDate')}
                  </Label>
                  <DatePicker
                    value={endDateStr}
                    onChange={(value) => setEndDateStr(value || "")}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  {tCommon('clear')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  className="h-8"
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  {t('applyFilters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
