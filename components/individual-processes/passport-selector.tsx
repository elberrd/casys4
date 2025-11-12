"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries"
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
import { Plus } from "lucide-react"

interface PassportSelectorProps {
  personId: string
  value: string
  onChange: (value: string) => void
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
  value,
  onChange,
  disabled = false,
}: PassportSelectorProps) {
  const t = useTranslations("Passports")
  const tIndividual = useTranslations("IndividualProcesses")
  const getCountryName = useCountryTranslation()
  const [addPassportOpen, setAddPassportOpen] = useState(false)

  const passports = useQuery(
    api.passports.listByPerson,
    personId ? { personId: personId as Id<"people"> } : "skip"
  ) ?? []

  const hasPassports = passports.length > 0

  const handleAddPassportSuccess = (newPassportId?: Id<"passports">) => {
    console.log('[PassportSelector] handleAddPassportSuccess called with:', newPassportId)
    // Automatically select the newly created passport BEFORE closing dialog
    if (newPassportId) {
      console.log('[PassportSelector] Calling onChange with:', newPassportId)
      onChange(newPassportId)
      console.log('[PassportSelector] onChange called')
    } else {
      console.log('[PassportSelector] No passport ID provided, not calling onChange')
    }
    // Close dialog after setting the value
    setAddPassportOpen(false)
  }

  if (!personId) {
    return (
      <div className="text-sm text-muted-foreground">
        {tIndividual("selectPersonFirst")}
      </div>
    )
  }

  if (!hasPassports) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          {tIndividual("personHasNoPassports")}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddPassportOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addPassport")}
        </Button>

        <PassportFormDialog
          open={addPassportOpen}
          onOpenChange={setAddPassportOpen}
          personId={personId as Id<"people">}
          onSuccess={handleAddPassportSuccess}
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={tIndividual("selectPassport")} />
          </SelectTrigger>
          <SelectContent>
            {passports.map((passport) => (
              <SelectItem key={passport._id} value={passport._id}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{passport.passportNumber}</span>
                  {passport.issuingCountry && (
                    <span className="text-muted-foreground">
                      {getCountryName(passport.issuingCountry.code) || passport.issuingCountry.name}
                    </span>
                  )}
                  {passport.status && (
                    <Badge variant={getStatusVariant(passport.status)} className="text-xs">
                      {t(`status${passport.status.replace(" ", "")}`)}
                    </Badge>
                  )}
                  {passport.isActive && (
                    <Badge variant="default" className="text-xs">
                      {t("active")}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddPassportOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("addPassport")}
        </Button>
      </div>

      <PassportFormDialog
        open={addPassportOpen}
        onOpenChange={setAddPassportOpen}
        personId={personId as Id<"people">}
        onSuccess={handleAddPassportSuccess}
      />
    </>
  )
}
