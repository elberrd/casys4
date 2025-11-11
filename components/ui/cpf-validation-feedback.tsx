"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Check, X, Loader2 } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

export interface CpfValidationFeedbackProps {
  /**
   * Whether the CPF validation query is in progress
   */
  isChecking: boolean

  /**
   * Whether the CPF is available
   * - `true`: CPF is available
   * - `false`: CPF is already in use
   * - `null`: No validation result yet (incomplete CPF or not validated)
   */
  isAvailable: boolean | null

  /**
   * Details of the existing person using this CPF (if duplicate found)
   */
  existingPerson: { _id: Id<"people">; fullName: string } | null

  /**
   * Optional className for the container
   */
  className?: string
}

/**
 * CpfValidationFeedback - Visual feedback component for CPF duplicate validation
 *
 * Displays real-time feedback about CPF availability:
 * - Green check mark when CPF is available
 * - Red X with person name when CPF is already in use
 * - Loading spinner while checking
 * - Nothing when CPF is incomplete
 *
 * @example
 * ```tsx
 * const { isChecking, isAvailable, existingPerson } = useCpfValidation({
 *   cpf: form.watch('cpf'),
 *   personId: person?._id
 * })
 *
 * <CpfValidationFeedback
 *   isChecking={isChecking}
 *   isAvailable={isAvailable}
 *   existingPerson={existingPerson}
 * />
 * ```
 */
export function CpfValidationFeedback({
  isChecking,
  isAvailable,
  existingPerson,
  className,
}: CpfValidationFeedbackProps) {
  const t = useTranslations("People")

  // Don't render anything if validation hasn't run yet
  if (isAvailable === null && !isChecking) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs absolute mt-1 right-0",
        className
      )}
    >
      {/* Loading state */}
      {isChecking && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">{t("cpfChecking")}</span>
        </>
      )}

      {/* Available state - green check */}
      {!isChecking && isAvailable === true && (
        <>
          <Check className="h-3 w-3 text-green-600 dark:text-green-500 flex-shrink-0" />
          <span className="text-green-600 dark:text-green-500 font-medium">
            {t("cpfAvailable")}
          </span>
        </>
      )}

      {/* Unavailable state - red X with person name */}
      {!isChecking && isAvailable === false && existingPerson && (
        <>
          <X className="h-3 w-3 text-destructive flex-shrink-0" />
          <span className="text-destructive">
            {t("cpfInUseBy", { name: existingPerson.fullName })}
          </span>
        </>
      )}
    </div>
  )
}
