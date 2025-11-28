"use client"

import { ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Check, AlertCircle, X, Loader2 } from "lucide-react"
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
  isLast,
  onClick
}: {
  step: StepInfo
  isActive: boolean
  isCompleted: boolean
  isVisited: boolean
  isLast: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex items-center flex-1">
      <button
        type="button"
        onClick={isVisited && !isActive ? onClick : undefined}
        disabled={!isVisited || isActive}
        className={cn(
          "group flex items-center gap-3 transition-all",
          isVisited && !isActive && "cursor-pointer hover:opacity-80",
          (!isVisited || isActive) && "cursor-default"
        )}
      >
        {/* Step Circle */}
        <div
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
            // Active state
            isActive && "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25",
            // Completed state
            isCompleted && !isActive && "border-primary bg-primary text-primary-foreground",
            // Future/unvisited state
            !isActive && !isCompleted && "border-muted-foreground/30 bg-background text-muted-foreground"
          )}
        >
          {isCompleted && !isActive ? (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <span className="text-sm font-semibold">{step.stepNumber}</span>
          )}
        </div>

        {/* Step Title - Hidden on mobile, visible on larger screens */}
        <div className="hidden sm:block">
          <p
            className={cn(
              "text-sm font-medium whitespace-nowrap transition-colors",
              isActive && "text-foreground",
              isCompleted && !isActive && "text-foreground",
              !isActive && !isCompleted && "text-muted-foreground"
            )}
          >
            {step.title}
          </p>
        </div>
      </button>

      {/* Connector Line */}
      {!isLast && (
        <div className="flex-1 mx-3 sm:mx-4">
          <div
            className={cn(
              "h-[2px] w-full transition-colors duration-300",
              isCompleted ? "bg-primary" : "bg-muted-foreground/20"
            )}
          />
        </div>
      )}
    </div>
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
    return stepIndex < currentStepIndex
  }

  const canGoNext = validateCurrentStep()

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Stepper Card */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="py-6 px-4 sm:px-6">
          <div className="flex items-center">
            {steps.map((step, index) => (
              <StepIndicator
                key={step.id}
                step={step}
                isActive={currentStep === step.id}
                isCompleted={isStepCompleted(index)}
                isVisited={visitedSteps.has(step.id)}
                isLast={index === steps.length - 1}
                onClick={() => goToStep(step.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {/* Step Header */}
          <div className="mb-8 pb-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {currentStepInfo.stepNumber}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {currentStepInfo.title}
              </h2>
            </div>
            <p className="text-muted-foreground pl-11">
              {currentStepInfo.description}
            </p>
          </div>

          {/* Step Content */}
          <div className="min-h-[350px]">
            {children}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="py-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Cancel Button */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-2 h-4 w-4" />
              {tCommon("cancel")}
            </Button>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {t("previous")}
                </Button>
              )}

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext || isSubmitting}
                className={cn(
                  "min-w-[120px]",
                  isLastStep && "bg-green-600 hover:bg-green-700"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon("loading")}
                  </>
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
        </CardContent>
      </Card>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {t("exitConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("exitConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("continueEditing")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("discardAndExit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
