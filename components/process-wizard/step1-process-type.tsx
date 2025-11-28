"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { User, Users, Check } from "lucide-react"
import { UseWizardStateReturn } from "./use-wizard-state"
import { useTranslations } from "next-intl"

interface Step1ProcessTypeProps {
  wizard: UseWizardStateReturn
}

export function Step1ProcessType({ wizard }: Step1ProcessTypeProps) {
  const t = useTranslations("ProcessWizard")
  const { wizardData, selectProcessType } = wizard

  const processTypes = [
    {
      id: "individual" as const,
      icon: User,
      title: t("individualProcess"),
      description: t("individualProcessDescription"),
    },
    {
      id: "collective" as const,
      icon: Users,
      title: t("collectiveProcess"),
      description: t("collectiveProcessDescription"),
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {processTypes.map((type) => {
        const Icon = type.icon
        const isSelected = wizardData.processType === type.id

        return (
          <Card
            key={type.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-md active:scale-[0.98]",
              isSelected && "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5"
            )}
            onClick={() => selectProcessType(type.id)}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg truncate">{type.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm leading-relaxed">
                {type.description}
              </CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
