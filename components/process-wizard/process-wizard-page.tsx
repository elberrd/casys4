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
import { Step2CollectiveMerged } from "./step2-collective-merged"
import { Step3_3CandidatesCollective } from "./step3-3-candidates-collective"

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

        // Use the first candidate's requestDate as the process date, or current date as fallback
        const processRequestDate = wizardData.candidates.length > 0
          ? wizardData.candidates[0].requestDate
          : new Date().toISOString().split('T')[0]

        // Create collective process FIRST to get the ID
        // workplaceCityId is optional - use company's cityId if available
        // Note: consulateId is now per-candidate, not at collective level
        // Note: requestDate is now per-candidate, using first candidate's date for the process
        const collectiveProcessId = await createCollectiveProcess({
          referenceNumber,
          companyId: wizardData.companyApplicantId as Id<"companies">,
          contactPersonId: wizardData.userApplicantId as Id<"people">,
          processTypeId: wizardData.processTypeId as Id<"processTypes">,
          workplaceCityId: companyApplicant?.cityId ? (companyApplicant.cityId as Id<"cities">) : undefined,
          requestDate: processRequestDate,
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
        // Merged step for individual processes (combines request details + process data + candidates)
        return <Step2ProcessDataIndividual wizard={wizard} />
      case "processDataCollective":
        // Merged step for collective processes (combines userApplicant + process data, without requestDate)
        return <Step2CollectiveMerged wizard={wizard} />
      case "candidatesCollective":
        return <Step3_3CandidatesCollective wizard={wizard} />
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
