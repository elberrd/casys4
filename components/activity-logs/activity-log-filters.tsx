"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
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
import { X, Filter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

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
}

export function ActivityLogFilters({
  onFiltersChange,
  onClearFilters,
}: ActivityLogFiltersProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')

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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">{t('filters')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Entity Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="entityType">{t('entityType')}</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger id="entityType">
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
          <div className="space-y-2">
            <Label htmlFor="entityId">{t('entityId')}</Label>
            <Input
              id="entityId"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={t('enterEntityId')}
            />
          </div>

          {/* Action Filter */}
          <div className="space-y-2">
            <Label htmlFor="action">{t('action')}</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger id="action">
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
          <div className="space-y-2">
            <Label htmlFor="startDate">{t('startDate')}</Label>
            <DatePicker
              value={startDateStr}
              onChange={(value) => setStartDateStr(value || "")}
            />
          </div>

          {/* End Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="endDate">{t('endDate')}</Label>
            <DatePicker
              value={endDateStr}
              onChange={(value) => setEndDateStr(value || "")}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4 mr-2" />
            {tCommon('clear')}
          </Button>
          <Button
            size="sm"
            onClick={handleApplyFilters}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('applyFilters')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
