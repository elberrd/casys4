"use client"

import { useCallback, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Id } from "@/convex/_generated/dataModel"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

import { useWizardState } from "./use-wizard-state"
import { WizardLayout } from "./wizard-layout"
import type { WizardFinalizationPhase } from "./wizard-layout"
import { Step1ProcessType } from "./step1-process-type"
import { Step2ProcessDataIndividual } from "./step2-process-data-individual"
import { Step2CollectiveMerged } from "./step2-collective-merged"
import { Step3_3CandidatesCollective } from "./step3-3-candidates-collective"
import {
  PassportAttachmentQueue,
  type PassportAttachmentQueueEntry,
  type PassportAttachmentQueueSummary,
} from "./passport-attachment-queue"

type WizardCreationResult =
  | {
      kind: "individual"
      processIds: Id<"individualProcesses">[]
    }
  | {
      kind: "collective"
      collectiveProcessId: Id<"collectiveProcesses">
    }

interface CreationAttempt {
  processType: "individual" | "collective"
  referenceNumber?: string
  collectiveProcessId?: Id<"collectiveProcesses">
  processIds: Array<Id<"individualProcesses"> | undefined>
}

interface PendingCurrentProcessConflict {
  candidateIndex: number
  candidateName: string
}

function isCurrentProcessConflict(error: unknown): boolean {
  if (!(error instanceof ConvexError)) return false

  const data: unknown = error.data
  return (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    data.code === "CURRENT_PROCESS_CONFLICT"
  )
}

export function ProcessWizardPage() {
  const t = useTranslations("ProcessWizard")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const locale = useLocale()
  const { toast } = useToast()

  const wizard = useWizardState()
  const { currentStep, wizardData, reset } = wizard

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [finalizationPhase, setFinalizationPhase] =
    useState<WizardFinalizationPhase>("idle")
  const [passportQueue, setPassportQueue] = useState<
    PassportAttachmentQueueEntry[]
  >([])
  const [creationResult, setCreationResult] =
    useState<WizardCreationResult | null>(null)
  const [pendingCurrentProcessConflict, setPendingCurrentProcessConflict] =
    useState<PendingCurrentProcessConflict | null>(null)
  const creationAttemptRef = useRef<CreationAttempt | null>(null)
  const replaceExistingCurrentIndexesRef = useRef(new Set<number>())
  const submitGuardRef = useRef(false)

  const createIndividualProcess = useMutation(api.individualProcesses.create)
  const createCollectiveProcess = useMutation(api.collectiveProcesses.create)

  // Fetch company data to get cityId for workplace city
  const companyApplicant = useQuery(
    api.companies.get,
    wizardData.companyApplicantId ? { id: wizardData.companyApplicantId as Id<"companies"> } : "skip"
  )
  const people = useQuery(api.people.list, {}) ?? []

  const completeCreation = useCallback(
    (result: WizardCreationResult) => {
      setFinalizationPhase("complete")
      setPassportQueue([])
      setCreationResult(null)
      setPendingCurrentProcessConflict(null)
      creationAttemptRef.current = null
      replaceExistingCurrentIndexesRef.current.clear()
      submitGuardRef.current = false
      reset()

      if (result.kind === "collective") {
        router.push(`/${locale}/collective-processes/${result.collectiveProcessId}`)
      } else if (result.processIds.length === 1) {
        router.push(`/${locale}/individual-processes/${result.processIds[0]}`)
      } else {
        router.push(`/${locale}/individual-processes`)
      }
    },
    [locale, reset, router]
  )

  const handlePassportQueueComplete = useCallback(
    (summary: PassportAttachmentQueueSummary) => {
      if (!creationResult) return

      toast({
        title: t("passportFinalizationComplete"),
        description: t("passportFinalizationSummary", {
          attached: summary.attached,
          skipped: summary.skipped,
          noCandidate: summary.noCandidate,
        }),
      })
      completeCreation(creationResult)
    },
    [completeCreation, creationResult, t, toast]
  )

  const handleSubmit = async () => {
    if (submitGuardRef.current || !wizardData.processType) return

    submitGuardRef.current = true
    setIsSubmitting(true)
    setFinalizationPhase("creating")
    let awaitingPassportResolution = false
    let currentCandidateIndex: number | undefined

    try {
      const attempt =
        creationAttemptRef.current ??
        {
          processType: wizardData.processType,
          referenceNumber:
            wizardData.processType === "collective"
              ? `CP-${Date.now().toString(36).toUpperCase()}`
              : undefined,
          processIds: [],
        }
      creationAttemptRef.current = attempt

      if (wizardData.processType === "individual") {
        for (const [index, candidate] of wizardData.candidates.entries()) {
          if (attempt.processIds[index]) continue

          currentCandidateIndex = index

          const processId = await createIndividualProcess({
            dateProcess: candidate.requestDate,
            personId: candidate.personId as Id<"people">,
            passportId: candidate.passportId,
            userApplicantId: wizardData.userApplicantId ? (wizardData.userApplicantId as Id<"people">) : undefined,
            userApplicantCompanyId: wizardData.userApplicantCompanyId ? (wizardData.userApplicantCompanyId as Id<"companies">) : undefined,
            consulateId: candidate.consulateId ? (candidate.consulateId as Id<"consulates">) : undefined,
            processTypeId: wizardData.processTypeId ? (wizardData.processTypeId as Id<"processTypes">) : undefined,
            legalFrameworkId: wizardData.legalFrameworkId ? (wizardData.legalFrameworkId as Id<"legalFrameworks">) : undefined,
            companyApplicantId: wizardData.companyApplicantId ? (wizardData.companyApplicantId as Id<"companies">) : undefined,
            deadlineUnit: wizardData.deadlineUnit || undefined,
            deadlineQuantity: wizardData.deadlineQuantity,
            deadlineSpecificDate: wizardData.deadlineSpecificDate || undefined,
            replaceExistingCurrent:
              replaceExistingCurrentIndexesRef.current.has(index) || undefined,
          })
          attempt.processIds[index] = processId
          replaceExistingCurrentIndexesRef.current.delete(index)
        }

        const createdProcessIds = attempt.processIds.filter(
          (processId): processId is Id<"individualProcesses"> =>
            processId !== undefined
        )
        const result: WizardCreationResult = {
          kind: "individual",
          processIds: createdProcessIds,
        }

        toast({
          title: t("individualProcessesCreated"),
          description: t("individualProcessesCreatedDescription", { count: createdProcessIds.length }),
        })

        const queue = wizardData.candidates.flatMap((candidate, index) => {
          const individualProcessId = attempt.processIds[index]
          if (!candidate.passportId || !individualProcessId) return []

          const person = people.find((item) => item._id === candidate.personId)
          return [{
            individualProcessId,
            passportId: candidate.passportId,
            candidateName:
              person?.fullName ?? t("candidateNumber", { number: index + 1 }),
          }]
        })

        if (queue.length > 0) {
          awaitingPassportResolution = true
          setCreationResult(result)
          setPassportQueue(queue)
          setFinalizationPhase("resolving_passports")
        } else {
          completeCreation(result)
        }
      } else if (wizardData.processType === "collective") {
        // Use the first candidate's requestDate as the process date, or current date as fallback
        const processRequestDate = wizardData.candidates.length > 0
          ? wizardData.candidates[0].requestDate
          : new Date().toISOString().split('T')[0]

        // Create collective process FIRST to get the ID
        // workplaceCityId is optional - use company's cityId if available
        // Note: consulateId is now per-candidate, not at collective level
        // Note: requestDate is now per-candidate, using first candidate's date for the process
        if (!attempt.collectiveProcessId) {
          attempt.collectiveProcessId = await createCollectiveProcess({
            referenceNumber: attempt.referenceNumber!,
            companyId: wizardData.companyApplicantId as Id<"companies">,
            contactPersonId: wizardData.userApplicantId as Id<"people">,
            processTypeId: wizardData.processTypeId as Id<"processTypes">,
            workplaceCityId: companyApplicant?.cityId ? (companyApplicant.cityId as Id<"cities">) : undefined,
            requestDate: processRequestDate,
          })
        }

        // Now create all individual processes with the collectiveProcessId
        // Each candidate can have their own consulate
        for (const [index, candidate] of wizardData.candidates.entries()) {
          if (attempt.processIds[index]) continue

          currentCandidateIndex = index

          attempt.processIds[index] = await createIndividualProcess({
            collectiveProcessId: attempt.collectiveProcessId,
            dateProcess: candidate.requestDate,
            personId: candidate.personId as Id<"people">,
            passportId: candidate.passportId,
            userApplicantId: wizardData.userApplicantId ? (wizardData.userApplicantId as Id<"people">) : undefined,
            userApplicantCompanyId: wizardData.userApplicantCompanyId ? (wizardData.userApplicantCompanyId as Id<"companies">) : undefined,
            consulateId: candidate.consulateId ? (candidate.consulateId as Id<"consulates">) : undefined,
            processTypeId: wizardData.processTypeId ? (wizardData.processTypeId as Id<"processTypes">) : undefined,
            legalFrameworkId: wizardData.legalFrameworkId ? (wizardData.legalFrameworkId as Id<"legalFrameworks">) : undefined,
            companyApplicantId: wizardData.companyApplicantId ? (wizardData.companyApplicantId as Id<"companies">) : undefined,
            deadlineUnit: wizardData.deadlineUnit || undefined,
            deadlineQuantity: wizardData.deadlineQuantity,
            deadlineSpecificDate: wizardData.deadlineSpecificDate || undefined,
            replaceExistingCurrent:
              replaceExistingCurrentIndexesRef.current.has(index) || undefined,
          })
          replaceExistingCurrentIndexesRef.current.delete(index)
        }

        const result: WizardCreationResult = {
          kind: "collective",
          collectiveProcessId: attempt.collectiveProcessId,
        }

        toast({
          title: t("collectiveProcessCreated"),
          description: t("collectiveProcessCreatedDescription", { count: wizardData.candidates.length }),
        })

        const queue = wizardData.candidates.flatMap((candidate, index) => {
          const individualProcessId = attempt.processIds[index]
          if (!candidate.passportId || !individualProcessId) return []

          const person = people.find((item) => item._id === candidate.personId)
          return [{
            individualProcessId,
            passportId: candidate.passportId,
            candidateName:
              person?.fullName ?? t("candidateNumber", { number: index + 1 }),
          }]
        })

        if (queue.length > 0) {
          awaitingPassportResolution = true
          setCreationResult(result)
          setPassportQueue(queue)
          setFinalizationPhase("resolving_passports")
        } else {
          completeCreation(result)
        }
      }
    } catch (error) {
      if (
        isCurrentProcessConflict(error) &&
        currentCandidateIndex !== undefined
      ) {
        const candidate = wizardData.candidates[currentCandidateIndex]
        const person = candidate
          ? people.find((item) => item._id === candidate.personId)
          : undefined

        setPendingCurrentProcessConflict({
          candidateIndex: currentCandidateIndex,
          candidateName:
            person?.fullName ??
            t("candidateNumber", { number: currentCandidateIndex + 1 }),
        })
        setFinalizationPhase("awaiting_current_process_replacement")
        return
      }

      console.error("Error creating process:", error)
      setFinalizationPhase("creation_error")
      const attempt = creationAttemptRef.current
      const createdCount =
        attempt?.processIds.filter((processId) => processId !== undefined).length ?? 0
      const hasPartialCreation =
        createdCount > 0 || attempt?.collectiveProcessId !== undefined
      toast({
        title: t("errorCreatingProcess"),
        description: hasPartialCreation
          ? t("processCreationPartialError", { count: createdCount })
          : t("processCreationErrorDescription"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      if (!awaitingPassportResolution) {
        submitGuardRef.current = false
      }
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
    <>
      <WizardLayout
        wizard={wizard}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        finalizationPhase={finalizationPhase}
      >
        {renderStep()}
      </WizardLayout>

      <PassportAttachmentQueue
        open={finalizationPhase === "resolving_passports"}
        entries={passportQueue}
        onComplete={handlePassportQueueComplete}
      />

      <ConfirmationDialog
        open={pendingCurrentProcessConflict !== null}
        onOpenChange={(open) => {
          if (open || submitGuardRef.current) return

          setPendingCurrentProcessConflict(null)
          const attempt = creationAttemptRef.current
          const hasPartialCreation =
            attempt?.collectiveProcessId !== undefined ||
            attempt?.processIds.some((processId) => processId !== undefined)

          if (hasPartialCreation) {
            setFinalizationPhase("creation_error")
          } else {
            creationAttemptRef.current = null
            setFinalizationPhase("idle")
          }
        }}
        title={t("currentProcessConflictTitle")}
        description={t("currentProcessConflictDescription", {
          candidate:
            pendingCurrentProcessConflict?.candidateName ??
            t("candidateNumber", { number: 1 }),
        })}
        confirmText={t("currentProcessConflictConfirm")}
        cancelText={tCommon("cancel")}
        loadingText={t("currentProcessConflictConfirming")}
        isLoading={isSubmitting}
        onConfirm={() => {
          if (!pendingCurrentProcessConflict) return

          replaceExistingCurrentIndexesRef.current.add(
            pendingCurrentProcessConflict.candidateIndex,
          )
          void handleSubmit()
          setPendingCurrentProcessConflict(null)
        }}
      />
    </>
  )
}
