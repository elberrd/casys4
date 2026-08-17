"use client"

import { useTranslations } from "next-intl"
import { CheckCircle2, FileSignature, Inbox } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export type SignedReturnOutcome = "approved" | "uploaded"

interface AwaitingSignatureFieldProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function AwaitingSignatureField({
  id,
  checked,
  onCheckedChange,
  disabled = false,
}: AwaitingSignatureFieldProps) {
  const t = useTranslations("DocumentUpload")

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        checked
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="min-w-0 space-y-1">
          <label
            htmlFor={id}
            className="flex cursor-pointer items-center gap-2 text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            <FileSignature className="h-4 w-4 text-indigo-700 dark:text-indigo-300" aria-hidden="true" />
            {t("awaitingSignature")}
          </label>
          <p className="text-xs text-indigo-800 dark:text-indigo-200">
            {t("awaitingSignatureDescription")}
          </p>
        </div>
      </div>
    </div>
  )
}

interface SignedReturnOutcomeFieldProps {
  name: string
  value: SignedReturnOutcome
  onValueChange: (value: SignedReturnOutcome) => void
  disabled?: boolean
}

export function SignedReturnOutcomeField({
  name,
  value,
  onValueChange,
  disabled = false,
}: SignedReturnOutcomeFieldProps) {
  const t = useTranslations("DocumentUpload")

  const options: Array<{
    value: SignedReturnOutcome
    title: string
    description: string
    icon: typeof CheckCircle2
  }> = [
    {
      value: "approved",
      title: t("signedReturnComplete"),
      description: t("signedReturnCompleteDescription"),
      icon: CheckCircle2,
    },
    {
      value: "uploaded",
      title: t("signedReturnReceived"),
      description: t("signedReturnReceivedDescription"),
      icon: Inbox,
    },
  ]

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">{t("signedReturnQuestion")}</legend>
      <p className="text-xs text-muted-foreground">
        {t("signedReturnQuestionDescription")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon
          const selected = value === option.value

          return (
            <label
              key={option.value}
              className={cn(
                "relative cursor-pointer rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                selected
                  ? option.value === "approved"
                    ? "border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/40"
                    : "border-blue-400 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-border bg-card hover:bg-accent/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onValueChange(option.value)}
                className="sr-only"
              />
              <span className="flex items-start gap-2">
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    option.value === "approved"
                      ? "text-green-700 dark:text-green-300"
                      : "text-blue-700 dark:text-blue-300",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 space-y-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                    {option.title}
                    {option.value === "approved" && (
                      <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                        {t("recommended")}
                      </Badge>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
