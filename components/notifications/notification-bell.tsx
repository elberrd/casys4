"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationDropdown } from "./notification-dropdown"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const unreadCount = useQuery(api.notifications.getUnreadCount)

  const displayCount = unreadCount && unreadCount > 99 ? "99+" : unreadCount

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications ${unreadCount ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground",
                unreadCount > 99 && "px-1.5"
              )}
            >
              {displayCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-0">
        <NotificationDropdown onClose={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
