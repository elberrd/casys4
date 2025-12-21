"use client"

import { NotificationBell } from "@/components/notifications/notification-bell"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface FixedActionButtonsProps {
  onCreateClick: () => void
  createButtonText?: string
  className?: string
}

export function FixedActionButtons({
  onCreateClick,
  createButtonText = "Criar",
  className
}: FixedActionButtonsProps) {
  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[100] flex flex-row items-center gap-3",
        "md:top-6 md:right-6",
        className
      )}
    >
      <Button
        onClick={onCreateClick}
        size="sm"
        className="gap-2 sm:shadow-lg flex-shrink-0"
      >
        <Plus className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline whitespace-nowrap">{createButtonText}</span>
      </Button>
      <div className="flex-shrink-0">
        <NotificationBell />
      </div>
    </div>
  )
}
