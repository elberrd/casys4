"use client"

import { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PassportSelector } from "@/components/individual-processes/passport-selector"
import { toast } from "sonner"

interface LinkPassportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individualProcessId: Id<"individualProcesses">
  personId: Id<"people">
  currentPassportId?: Id<"passports"> | null
}

export function LinkPassportDialog({
  open,
  onOpenChange,
  individualProcessId,
  personId,
  currentPassportId,
}: LinkPassportDialogProps) {
  const t = useTranslations("IndividualProcesses")
  const tCommon = useTranslations("Common")
  const tPassports = useTranslations("Passports")
  const updateProcess = useMutation(api.individualProcesses.update)

  const [selectedPassportId, setSelectedPassportId] = useState<string>(
    currentPassportId ?? "",
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedPassportId(currentPassportId ?? "")
    }
  }, [open, currentPassportId])

  const handleSave = async () => {
    if (!selectedPassportId) {
      toast.error(t("selectPassport"))
      return
    }
    setIsSubmitting(true)
    try {
      await updateProcess({
        id: individualProcessId,
        passportId: selectedPassportId as Id<"passports">,
      })
      toast.success(tPassports("updatedSuccess"))
      onOpenChange(false)
    } catch (error) {
      toast.error(tPassports("errorUpdate"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("passportInformation")}</DialogTitle>
          <DialogDescription>
            {t("passportInformationDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <PassportSelector
            personId={personId}
            individualProcessId={individualProcessId}
            value={selectedPassportId}
            onChange={setSelectedPassportId}
            disabled={isSubmitting}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !selectedPassportId ||
              selectedPassportId === (currentPassportId ?? "")
            }
          >
            {isSubmitting ? tCommon("loading") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
