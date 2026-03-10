"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"

export interface UsePassportNumberValidationProps {
  passportNumber: string | undefined
  passportId?: Id<"passports">
  enabled?: boolean
}

export interface UsePassportNumberValidationReturn {
  isChecking: boolean
  isAvailable: boolean | null
  existingPassport: { _id: Id<"passports">; passportNumber: string; personName: string } | null
}

export function usePassportNumberValidation({
  passportNumber,
  passportId,
  enabled = true,
}: UsePassportNumberValidationProps): UsePassportNumberValidationReturn {
  const [debouncedValue, setDebouncedValue] = React.useState<string>("")
  const debounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedValue(passportNumber || "")
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [passportNumber])

  const trimmed = debouncedValue.trim()
  const shouldValidate = enabled && trimmed.length >= 3

  const result = useQuery(
    api.passports.checkPassportNumberDuplicate,
    shouldValidate
      ? {
          passportNumber: trimmed,
          excludePassportId: passportId,
        }
      : "skip"
  )

  const isChecking = shouldValidate && result === undefined
  const isAvailable = shouldValidate && result ? result.isAvailable : null
  const existingPassport = result?.existingPassport || null

  return {
    isChecking,
    isAvailable,
    existingPassport,
  }
}
