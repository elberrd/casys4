"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { Table } from "@tanstack/react-table"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface DataGridFilterProps<TData> {
  table: Table<TData>
  placeholder?: string
  className?: string
}

export function DataGridFilter<TData>({
  table,
  placeholder,
  className,
}: DataGridFilterProps<TData>) {
  const tCommon = useTranslations("Common")
  const [value, setValue] = useState<string>("")
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isInitialMount = useRef(true)

  // Debounced filter update to avoid excessive re-renders
  useEffect(() => {
    // Skip the initial mount to prevent state update before component is mounted
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      table.setGlobalFilter(value)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, table])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    []
  )

  const handleClear = useCallback(() => {
    setValue("")
    table.setGlobalFilter("")
  }, [table])

  return (
    <div className={`relative ${className || ""}`}>
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder || tCommon("search")}
        value={value}
        onChange={handleChange}
        className="pl-8 pr-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          aria-label={tCommon("clearSearch")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
