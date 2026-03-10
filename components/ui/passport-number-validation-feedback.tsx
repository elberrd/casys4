"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Check, X, Loader2 } from "lucide-react"
import { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

export interface PassportNumberValidationFeedbackProps {
  isChecking: boolean
  isAvailable: boolean | null
  existingPassport: { _id: Id<"passports">; passportNumber: string; personName: string } | null
  className?: string
}

export function PassportNumberValidationFeedback({
  isChecking,
  isAvailable,
  existingPassport,
  className,
}: PassportNumberValidationFeedbackProps) {
  const t = useTranslations("Passports")

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
      {isChecking && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">{t("passportNumberChecking")}</span>
        </>
      )}

      {!isChecking && isAvailable === true && (
        <>
          <Check className="h-3 w-3 text-green-600 dark:text-green-500 flex-shrink-0" />
          <span className="text-green-600 dark:text-green-500 font-medium">
            {t("passportNumberAvailable")}
          </span>
        </>
      )}

      {!isChecking && isAvailable === false && existingPassport && (
        <>
          <X className="h-3 w-3 text-destructive flex-shrink-0" />
          <span className="text-destructive">
            {t("passportNumberInUseBy", { name: existingPassport.personName })}
          </span>
        </>
      )}
    </div>
  )
}
