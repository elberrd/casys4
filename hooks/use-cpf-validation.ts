"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { cleanDocumentNumber } from "@/lib/utils/document-masks"

export interface UseCpfValidationProps {
  /**
   * The CPF value to validate (can be formatted or unformatted)
   */
  cpf: string | undefined

  /**
   * Optional person ID to exclude from duplicate check (for edit mode)
   */
  personId?: Id<"people">

  /**
   * Whether validation is enabled (default: true)
   */
  enabled?: boolean
}

export interface UseCpfValidationReturn {
  /**
   * Whether the CPF validation query is in progress
   */
  isChecking: boolean

  /**
   * Whether the CPF is available
   * - `true`: CPF is available (not in use or belongs to current person)
   * - `false`: CPF is already in use by another person
   * - `null`: CPF is incomplete or validation hasn't run yet
   */
  isAvailable: boolean | null

  /**
   * Details of the existing person using this CPF (if duplicate found)
   */
  existingPerson: { _id: Id<"people">; fullName: string } | null
}

/**
 * useCpfValidation - Hook for real-time CPF duplicate checking
 *
 * This hook validates that a CPF is not already in use by another person
 * in the database. It includes debouncing to prevent excessive queries
 * and only validates when the CPF has exactly 11 digits.
 *
 * @example
 * ```tsx
 * const { isChecking, isAvailable, existingPerson } = useCpfValidation({
 *   cpf: form.watch('cpf'),
 *   personId: person?._id, // For edit mode
 *   enabled: true
 * })
 *
 * // In your component:
 * {isAvailable === false && existingPerson && (
 *   <p className="text-destructive">
 *     CPF already in use by {existingPerson.fullName}
 *   </p>
 * )}
 * {isAvailable === true && (
 *   <p className="text-success">CPF available</p>
 * )}
 * ```
 */
export function useCpfValidation({
  cpf,
  personId,
  enabled = true,
}: UseCpfValidationProps): UseCpfValidationReturn {
  // Debounced CPF value (wait 500ms after user stops typing)
  const [debouncedCpf, setDebouncedCpf] = React.useState<string>("")
  const debounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Debounce the CPF input
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedCpf(cpf || "")
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [cpf])

  // Clean the debounced CPF (remove formatting)
  const cleanedCpf = React.useMemo(() => {
    return cleanDocumentNumber(debouncedCpf)
  }, [debouncedCpf])

  // Only enable the query when:
  // 1. Validation is enabled
  // 2. CPF has exactly 11 digits (complete)
  const shouldValidate = enabled && cleanedCpf.length === 11

  // Query Convex for CPF duplicate check
  const result = useQuery(
    api.people.checkCpfDuplicate,
    shouldValidate
      ? {
          cpf: cleanedCpf,
          excludePersonId: personId,
        }
      : "skip"
  )

  // Determine validation state
  const isChecking = shouldValidate && result === undefined
  const isAvailable = shouldValidate && result ? result.isAvailable : null
  const existingPerson = result?.existingPerson || null

  return {
    isChecking,
    isAvailable,
    existingPerson,
  }
}
