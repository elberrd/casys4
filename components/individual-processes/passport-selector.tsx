"use client"

import { useRef, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
import { getPassportValidityStatus } from "@/lib/passport"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PassportFormDialog } from "@/components/passports/passport-form-dialog"
import { Pencil, Plus } from "lucide-react"

interface PassportSelectorProps {
  personId: string
  individualProcessId?: Id<"individualProcesses">
  value: string
  onChange: (value: string) => void
  onCreated?: (passportId: Id<"passports">) => void
  disabled?: boolean
}

function getStatusVariant(status: "Valid" | "Expiring Soon" | "Expired") {
  switch (status) {
    case "Valid":
      return "success"
    case "Expiring Soon":
      return "warning"
    case "Expired":
      return "destructive"
  }
}

export function PassportSelector({
  personId,
  individualProcessId,
  value,
  onChange,
  onCreated,
  disabled = false,
}: PassportSelectorProps) {
  const t = useTranslations("Passports")
  const tIndividual = useTranslations("IndividualProcesses")
  const getCountryName = useCountryTranslation()
  const [formOpen, setFormOpen] = useState(false)
  const [editingPassportId, setEditingPassportId] = useState<
    Id<"passports"> | undefined
  >(undefined)
  const editingPassportIdRef = useRef<Id<"passports"> | undefined>(undefined)

  const passports =
    useQuery(
      api.passports.listByPerson,
      personId ? { personId: personId as Id<"people"> } : "skip",
    ) ?? []

  const hasPassports = passports.length > 0

  const openCreateDialog = () => {
    editingPassportIdRef.current = undefined
    setEditingPassportId(undefined)
    setFormOpen(true)
  }

  const openEditDialog = () => {
    if (!value) return
    const passportId = value as Id<"passports">
    editingPassportIdRef.current = passportId
    setEditingPassportId(passportId)
    setFormOpen(true)
  }

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      editingPassportIdRef.current = undefined
      setEditingPassportId(undefined)
    }
  }

  const handleFormSuccess = (newPassportId?: Id<"passports">) => {
    if (newPassportId) {
      onChange(newPassportId)
      if (!editingPassportIdRef.current) {
        onCreated?.(newPassportId)
      }
    }
    handleFormOpenChange(false)
  }

  if (!personId) {
    return (
      <div className="text-sm text-muted-foreground">
        {tIndividual("selectPersonFirst")}
      </div>
    )
  }

  return (
    <>
      {/* Keep a single form dialog mounted across empty/list views so creating
          the first passport does not remount an empty "Criar Passaporte" modal. */}
      {hasPassports ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
            <Select value={value} onValueChange={onChange} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder={tIndividual("selectPassport")} />
              </SelectTrigger>
              <SelectContent>
                {passports.map((passport) => {
                  const validity = getPassportValidityStatus(passport.expiryDate)
                  return (
                    <SelectItem key={passport._id} value={passport._id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {passport.passportNumber}
                        </span>
                        {passport.issuingCountry && (
                          <span className="text-muted-foreground">
                            {getCountryName(passport.issuingCountry.code) ||
                              passport.issuingCountry.name}
                          </span>
                        )}
                        {validity && (
                          <Badge
                            variant={getStatusVariant(validity)}
                            className="text-xs"
                          >
                            {t(`status${validity.replace(" ", "")}`)}
                          </Badge>
                        )}
                        {passport.isActive && (
                          <Badge variant="default" className="text-xs">
                            {t("active")}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={openEditDialog}
              disabled={disabled || !value}
              aria-label={t("editSelectedPassport")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateDialog}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addPassport")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {tIndividual("personHasNoPassports")}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateDialog}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addPassport")}
          </Button>
        </div>
      )}

      <PassportFormDialog
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        personId={personId as Id<"people">}
        passportId={editingPassportId}
        individualProcessId={individualProcessId}
        onSuccess={handleFormSuccess}
      />
    </>
  )
}
