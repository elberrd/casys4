"use client"

import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { useTranslations } from "next-intl"

interface SaveFilterButtonProps {
  hasActiveFilters: boolean
  onClick: () => void
}

export function SaveFilterButton({ hasActiveFilters, onClick }: SaveFilterButtonProps) {
  const t = useTranslations("SavedFilters")

  if (!hasActiveFilters) return null

  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-2">
      <Save className="h-4 w-4 flex-shrink-0" />
      <span className="hidden xl:inline whitespace-nowrap">{t("saveFilter")}</span>
    </Button>
  )
}
