"use client"

import { useState, useCallback, useMemo } from "react"
import {
  WizardState,
  initialWizardState,
  validateStep1,
  validateStep2_1Individual,
  validateStep2_2,
  validateStep2IndividualMerged,
  validateStep2CollectiveMerged,
  validateStep3_3Candidates,
  CandidateData,
} from "@/lib/validations/process-wizard"

export type WizardStep =
  | "processType"
  | "requestDetailsIndividual"
  | "processDataIndividual"
  | "processDataCollective"
  | "candidatesCollective"

export interface StepInfo {
  id: WizardStep
  title: string
  description: string
  stepNumber: number
}

// Default steps shown before process type is selected
const DEFAULT_STEPS: StepInfo[] = [
  { id: "processType", title: "Tipo de Processo", description: "Selecione o tipo de processo", stepNumber: 1 },
  { id: "processDataIndividual", title: "Dados do Processo", description: "Preencha os dados do processo", stepNumber: 2 },
]

const INDIVIDUAL_STEPS: StepInfo[] = [
  { id: "processType", title: "Tipo de Processo", description: "Selecione o tipo de processo", stepNumber: 1 },
  { id: "processDataIndividual", title: "Dados do Processo", description: "Preencha os dados do processo e adicione os candidatos", stepNumber: 2 },
]

const COLLECTIVE_STEPS: StepInfo[] = [
  { id: "processType", title: "Tipo de Processo", description: "Selecione o tipo de processo", stepNumber: 1 },
  { id: "processDataCollective", title: "Dados do Processo", description: "Preencha os dados do processo", stepNumber: 2 },
  { id: "candidatesCollective", title: "Candidatos", description: "Adicione os candidatos", stepNumber: 3 },
]

export function useWizardState() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("processType")
  const [wizardData, setWizardData] = useState<WizardState>(initialWizardState)
  const [visitedSteps, setVisitedSteps] = useState<Set<WizardStep>>(new Set(["processType"]))

  const steps = useMemo(() => {
    if (wizardData.processType === "individual") {
      return INDIVIDUAL_STEPS
    } else if (wizardData.processType === "collective") {
      return COLLECTIVE_STEPS
    }
    // Show default steps before type is selected (preview of individual flow)
    return DEFAULT_STEPS
  }, [wizardData.processType])

  const currentStepInfo = useMemo(() => {
    return steps.find((s) => s.id === currentStep) || steps[0]
  }, [steps, currentStep])

  const currentStepIndex = useMemo(() => {
    return steps.findIndex((s) => s.id === currentStep)
  }, [steps, currentStep])

  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const updateData = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setWizardData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateMultipleData = useCallback((updates: Partial<WizardState>) => {
    setWizardData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Candidates management for collective process
  const addCandidate = useCallback((candidate: CandidateData) => {
    setWizardData((prev) => ({
      ...prev,
      candidates: [...prev.candidates, candidate],
    }))
  }, [])

  const removeCandidate = useCallback((index: number) => {
    setWizardData((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((_, i) => i !== index),
    }))
  }, [])

  const updateCandidate = useCallback((index: number, candidate: CandidateData) => {
    setWizardData((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c, i) => (i === index ? candidate : c)),
    }))
  }, [])

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case "processType":
        return validateStep1(wizardData)
      case "requestDetailsIndividual":
        return validateStep2_1Individual(wizardData)
      case "processDataIndividual":
        // New merged step: validates shared fields + at least 1 candidate
        return validateStep2IndividualMerged(wizardData)
      case "processDataCollective":
        // New merged step: validates userApplicant + process data (company required)
        return validateStep2CollectiveMerged(wizardData)
      case "candidatesCollective":
        return validateStep3_3Candidates(wizardData)
      default:
        return false
    }
  }, [currentStep, wizardData])

  const goToNextStep = useCallback(() => {
    if (!validateCurrentStep()) return false

    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex].id
      setCurrentStep(nextStep)
      setVisitedSteps((prev) => new Set([...prev, nextStep]))
      return true
    }
    return false
  }, [currentStepIndex, steps, validateCurrentStep])

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
      return true
    }
    return false
  }, [currentStepIndex, steps])

  const goToStep = useCallback((step: WizardStep) => {
    const stepIndex = steps.findIndex((s) => s.id === step)
    if (stepIndex !== -1 && visitedSteps.has(step)) {
      setCurrentStep(step)
      return true
    }
    return false
  }, [steps, visitedSteps])

  const reset = useCallback(() => {
    setCurrentStep("processType")
    setWizardData(initialWizardState)
    setVisitedSteps(new Set(["processType"]))
  }, [])

  // Handle process type selection - determines the flow
  const selectProcessType = useCallback((type: "individual" | "collective") => {
    setWizardData((prev) => ({
      ...initialWizardState,
      processType: type,
      requestDate: prev.requestDate, // Keep the request date
    }))

    // Reset visited steps when changing process type
    setVisitedSteps(new Set(["processType"]))

    // Navigate to next step based on type
    if (type === "individual") {
      // Individual now goes directly to merged process data step
      setCurrentStep("processDataIndividual")
      setVisitedSteps(new Set(["processType", "processDataIndividual"]))
    } else {
      // Collective now goes directly to merged process data step (no separate requestDetails step)
      setCurrentStep("processDataCollective")
      setVisitedSteps(new Set(["processType", "processDataCollective"]))
    }
  }, [])

  const hasUnsavedChanges = useMemo(() => {
    // Check if any data has been entered
    return (
      wizardData.processType !== undefined ||
      wizardData.userApplicantId !== "" ||
      wizardData.personId !== "" ||
      wizardData.processTypeId !== "" ||
      wizardData.candidates.length > 0
    )
  }, [wizardData])

  return {
    // Current state
    currentStep,
    currentStepInfo,
    currentStepIndex,
    wizardData,
    steps,
    visitedSteps,

    // Navigation flags
    isFirstStep,
    isLastStep,
    hasUnsavedChanges,

    // Actions
    updateData,
    updateMultipleData,
    addCandidate,
    removeCandidate,
    updateCandidate,
    selectProcessType,
    validateCurrentStep,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    reset,
  }
}

export type UseWizardStateReturn = ReturnType<typeof useWizardState>
