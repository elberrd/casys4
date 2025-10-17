"use client"

import { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

export interface BulkAction<TData> {
  label: string
  icon?: React.ReactNode
  onClick: (selectedRows: TData[]) => void | Promise<void>
  variant?: "default" | "destructive" | "outline" | "secondary"
}

interface DataGridBulkActionsProps<TData> {
  table: Table<TData>
  actions: BulkAction<TData>[]
  className?: string
}

export function DataGridBulkActions<TData>({
  table,
  actions,
  className,
}: DataGridBulkActionsProps<TData>) {
  const tCommon = useTranslations("Common")
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  if (selectedCount === 0) {
    return null
  }

  const selectedData = selectedRows.map((row) => row.original)

  return (
    <div
      className={`flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 animate-in fade-in slide-in-from-top-2 ${
        className || ""
      }`}
    >
      <div className="flex-1 text-sm text-muted-foreground">
        {tCommon("itemsSelected", { count: selectedCount })}
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "default"}
            size="sm"
            onClick={() => action.onClick(selectedData)}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetRowSelection()}
          aria-label={tCommon("deselectAll")}
        >
          <X className="h-4 w-4 mr-1" />
          {tCommon("deselectAll")}
        </Button>
      </div>
    </div>
  )
}
