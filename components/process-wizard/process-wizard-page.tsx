"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Id } from "@/convex/_generated/dataModel"

import { useWizardState } from "./use-wizard-state"
import { WizardLayout } from "./wizard-layout"
import { Step1ProcessType } from "./step1-process-type"
import { Step2ProcessDataIndividual } from "./step2-process-data-individual"
import { Step2_2ProcessData } from "./step2-2-process-data"
import { Step2_3ConfirmationIndividual } from "./step2-3-confirmation-individual"
import { Step3_1RequestDetailsCollective } from "./step3-1-request-details-collective"
import { Step3_3CandidatesCollective } from "./step3-3-candidates-collective"
import { Step3_4ConfirmationCollective } from "./step3-4-confirmation-collective"

export function ProcessWizardPage() {
  const t = useTranslations("ProcessWizard")
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()

  const wizard = useWizardState()
  const { currentStep, wizardData, reset } = wizard

  const [isSubmitting, setIsSubmitting] = useState(false)

  const createIndividualProcess = useMutation(api.individualProcesses.create)
  const createCollectiveProcess = useMutation(api.collectiveProcesses.create)

  // Fetch company data to get cityId for workplace city
  const companyApplicant = useQuery(
    api.companies.get,
    wizardData.companyApplicantId ? { id: wizardData.companyApplicantId as Id<"companies"> } : "skip"
  )

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (wizardData.processType === "individual") {
        // Create individual processes for each candidate (no collective process)
        const createdProcessIds: Id<"individualProcesses">[] = []

        for (const candidate of wizardData.candidates) {
          const processId = await createIndividualProcess({
            dateProcess: candidate.requestDate,
            personId: candidate.personId as Id<"people">,
            userApplicantId: wizardData.userApplicantId ? (wizardData.userApplicantId as Id<"people">) : undefined,
            consulateId: candidate.consulateId ? (candidate.consulateId as Id<"consulates">) : undefined,
            processTypeId: wizardData.processTypeId ? (wizardData.processTypeId as Id<"processTypes">) : undefined,
            legalFrameworkId: wizardData.legalFrameworkId ? (wizardData.legalFrameworkId as Id<"legalFrameworks">) : undefined,
            companyApplicantId: wizardData.companyApplicantId ? (wizardData.companyApplicantId as Id<"companies">) : undefined,
            deadlineUnit: wizardData.deadlineUnit || undefined,
            deadlineQuantity: wizardData.deadlineQuantity,
            deadlineSpecificDate: wizardData.deadlineSpecificDate || undefined,
          })
          createdProcessIds.push(processId)
        }

        toast({
          title: t("individualProcessesCreated"),
          description: t("individualProcessesCreatedDescription", { count: createdProcessIds.length }),
        })

        // Reset wizard and redirect
        reset()
        // Redirect to list if multiple, or to detail if single
        if (createdProcessIds.length === 1) {
          router.push(`/${locale}/individual-processes/${createdProcessIds[0]}`)
        } else {
          router.push(`/${locale}/individual-processes`)
        }
      } else if (wizardData.processType === "collective") {
        // Generate reference number for collective process
        const referenceNumber = `CP-${Date.now().toString(36).toUpperCase()}`

        // Create collective process FIRST to get the ID
        // workplaceCityId is optional - use company's cityId if available
        // Note: consulateId is now per-candidate, not at collective level
        const collectiveProcessId = await createCollectiveProcess({
          referenceNumber,
          companyId: wizardData.companyApplicantId as Id<"companies">,
          contactPersonId: wizardData.userApplicantId as Id<"people">,
          processTypeId: wizardData.processTypeId as Id<"processTypes">,
          workplaceCityId: companyApplicant?.cityId ? (companyApplicant.cityId as Id<"cities">) : undefined,
          requestDate: wizardData.requestDate,
        })

        // Now create all individual processes with the collectiveProcessId
        // Each candidate can have their own consulate
        for (const candidate of wizardData.candidates) {
          await createIndividualProcess({
            collectiveProcessId: collectiveProcessId,
            dateProcess: candidate.requestDate,
            personId: candidate.personId as Id<"people">,
            userApplicantId: wizardData.userApplicantId ? (wizardData.userApplicantId as Id<"people">) : undefined,
            consulateId: candidate.consulateId ? (candidate.consulateId as Id<"consulates">) : undefined,
            processTypeId: wizardData.processTypeId ? (wizardData.processTypeId as Id<"processTypes">) : undefined,
            legalFrameworkId: wizardData.legalFrameworkId ? (wizardData.legalFrameworkId as Id<"legalFrameworks">) : undefined,
            companyApplicantId: wizardData.companyApplicantId ? (wizardData.companyApplicantId as Id<"companies">) : undefined,
            deadlineUnit: wizardData.deadlineUnit || undefined,
            deadlineQuantity: wizardData.deadlineQuantity,
            deadlineSpecificDate: wizardData.deadlineSpecificDate || undefined,
          })
        }

        toast({
          title: t("collectiveProcessCreated"),
          description: t("collectiveProcessCreatedDescription", { count: wizardData.candidates.length }),
        })

        // Reset wizard and redirect
        reset()
        router.push(`/${locale}/collective-processes/${collectiveProcessId}`)
      }
    } catch (error) {
      console.error("Error creating process:", error)
      toast({
        title: t("errorCreatingProcess"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case "processType":
        return <Step1ProcessType wizard={wizard} />
      case "processDataIndividual":
        // New merged step for individual processes (combines request details + process data + candidates)
        return <Step2ProcessDataIndividual wizard={wizard} />
      case "processDataCollective":
        return <Step2_2ProcessData wizard={wizard} />
      case "confirmationIndividual":
        return <Step2_3ConfirmationIndividual wizard={wizard} />
      case "requestDetailsCollective":
        return <Step3_1RequestDetailsCollective wizard={wizard} />
      case "candidatesCollective":
        return <Step3_3CandidatesCollective wizard={wizard} />
      case "confirmationCollective":
        return <Step3_4ConfirmationCollective wizard={wizard} />
      default:
        return null
    }
  }

  return (
    <WizardLayout
      wizard={wizard}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    >
      {renderStep()}
    </WizardLayout>
  )
}
