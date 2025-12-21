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
    <Button variant="outline" size="sm" onClick={onClick}>
      <Save className="mr-2 h-4 w-4" />
      {t("saveFilter")}
    </Button>
  )
}
