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
  filterOptions?: {
    users: Array<{
      userId: Id<"users">
      fullName: string
      email?: string
    }>
    entityTypes: string[]
    actions: string[]
  }
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
  filterOptions,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters = false,
}: ActivityLogFiltersProps) {
  const t = useTranslations('ActivityLogs')
  const tCommon = useTranslations('Common')

  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string>("all")
  const [entityType, setEntityType] = useState<string>("all")
  const [entityId, setEntityId] = useState<string>("")
  const [action, setAction] = useState<string>("all")
  const [startDateStr, setStartDateStr] = useState<string>("")
  const [endDateStr, setEndDateStr] = useState<string>("")

  const handleApplyFilters = () => {
    const startDate = startDateStr ? new Date(`${startDateStr}T00:00:00`).getTime() : undefined
    const endDate = endDateStr ? new Date(`${endDateStr}T23:59:59.999`).getTime() : undefined

    onFiltersChange({
      userId: userId !== "all" ? (userId as Id<"users">) : undefined,
      entityType: entityType !== "all" ? entityType : undefined,
      entityId: entityId || undefined,
      action: action !== "all" ? action : undefined,
      startDate,
      endDate,
    })
  }

  const handleClear = () => {
    setUserId("all")
    setEntityType("all")
    setEntityId("")
    setAction("all")
    setStartDateStr("")
    setEndDateStr("")
    onClearFilters()
  }

  // Count active local filters
  const activeFilterCount = [
    userId !== "all",
    entityType !== "all",
    !!entityId,
    action !== "all",
    !!startDateStr,
    !!endDateStr,
  ].filter(Boolean).length

  return (
    <Card className="mx-auto w-full max-w-[1600px] overflow-hidden border-dashed bg-gradient-to-b from-muted/20 to-background">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background/70">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{t('filters')}</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="h-6 rounded-full px-2 text-xs font-medium">
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
                "flex h-8 w-8 items-center justify-center rounded-md border bg-background/60 transition-colors",
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
          <CardContent className="px-5 pb-5 pt-0">
            <div className="border-t pt-5">
              <div className="rounded-xl border bg-background/70 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                  {/* User Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="userId" className="text-xs font-medium text-muted-foreground">
                      {t('user')}
                    </Label>
                    <Select value={userId} onValueChange={setUserId}>
                      <SelectTrigger id="userId" className="h-9">
                        <SelectValue placeholder={t('selectUser')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{tCommon('all')}</SelectItem>
                        {filterOptions?.users.map((user) => (
                          <SelectItem key={user.userId} value={user.userId}>
                            {user.fullName}{user.email ? ` (${user.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        {filterOptions?.entityTypes.map((type) => (
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
                        {filterOptions?.actions.map((act) => (
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
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  {tCommon('clear')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  className="h-9"
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
