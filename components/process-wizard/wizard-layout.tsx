"use client"

import { ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Check, AlertCircle, X } from "lucide-react"
import { UseWizardStateReturn, StepInfo } from "./use-wizard-state"
import { useTranslations } from "next-intl"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"

interface WizardLayoutProps {
  wizard: UseWizardStateReturn
  children: ReactNode
  onSubmit?: () => Promise<void>
  isSubmitting?: boolean
}

function StepIndicator({
  step,
  isActive,
  isCompleted,
  isVisited,
  onClick
}: {
  step: StepInfo
  isActive: boolean
  isCompleted: boolean
  isVisited: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={isVisited ? onClick : undefined}
      disabled={!isVisited}
      className={cn(
        "flex flex-col items-center gap-2 transition-all",
        isVisited && !isActive ? "cursor-pointer" : "cursor-default",
        !isVisited && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
          isActive && "border-primary bg-primary text-primary-foreground",
          isCompleted && !isActive && "border-green-500 bg-green-500 text-white",
          !isActive && !isCompleted && isVisited && "border-muted-foreground",
          !isVisited && "border-muted"
        )}
      >
        {isCompleted && !isActive ? (
          <Check className="h-5 w-5" />
        ) : (
          <span className="text-sm font-semibold">{step.stepNumber}</span>
        )}
      </div>
      <div className="text-center">
        <p
          className={cn(
            "text-xs font-medium",
            isActive && "text-primary",
            !isActive && "text-muted-foreground"
          )}
        >
          {step.title}
        </p>
      </div>
    </button>
  )
}

function StepConnector({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 flex-1 mx-2",
        isCompleted ? "bg-green-500" : "bg-muted"
      )}
    />
  )
}

export function WizardLayout({
  wizard,
  children,
  onSubmit,
  isSubmitting = false,
}: WizardLayoutProps) {
  const t = useTranslations("ProcessWizard")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const locale = useLocale()
  const [showExitDialog, setShowExitDialog] = useState(false)

  const {
    currentStep,
    currentStepInfo,
    currentStepIndex,
    steps,
    visitedSteps,
    isFirstStep,
    isLastStep,
    hasUnsavedChanges,
    validateCurrentStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
  } = wizard

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit()
    } else {
      goToNextStep()
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true)
    } else {
      router.push(`/${locale}/individual-processes`)
    }
  }

  const handleConfirmExit = () => {
    setShowExitDialog(false)
    router.push(`/${locale}/individual-processes`)
  }

  const isStepCompleted = (stepIndex: number): boolean => {
    if (stepIndex < currentStepIndex) return true
    return false
  }

  const canGoNext = validateCurrentStep()

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <StepIndicator
                  step={step}
                  isActive={currentStep === step.id}
                  isCompleted={isStepCompleted(index)}
                  isVisited={visitedSteps.has(step.id)}
                  onClick={() => goToStep(step.id)}
                />
                {index < steps.length - 1 && (
                  <StepConnector isCompleted={isStepCompleted(index)} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{currentStepInfo.title}</h2>
            <p className="text-sm text-muted-foreground">
              {currentStepInfo.description}
            </p>
          </div>

          <div className="min-h-[300px]">{children}</div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
        >
          <X className="mr-2 h-4 w-4" />
          {tCommon("cancel")}
        </Button>

        <div className="flex gap-2">
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isSubmitting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("previous")}
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext || isSubmitting}
          >
            {isSubmitting ? (
              tCommon("loading")
            ) : isLastStep ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("createProcess")}
              </>
            ) : (
              <>
                {t("next")}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              {t("exitConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("exitConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("continueEditing")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("discardAndExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
