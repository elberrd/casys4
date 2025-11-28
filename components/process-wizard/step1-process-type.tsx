"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { User, Users } from "lucide-react"
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
    <div className="grid gap-4 md:grid-cols-2">
      {processTypes.map((type) => {
        const Icon = type.icon
        const isSelected = wizardData.processType === type.id

        return (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary hover:shadow-md",
              isSelected && "border-primary ring-2 ring-primary ring-offset-2"
            )}
            onClick={() => selectProcessType(type.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {type.description}
              </CardDescription>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
