"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { PersonDetailView } from "@/components/people/person-detail-view"
import { Eye } from "lucide-react"

interface PersonSelectorWithDetailProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function PersonSelectorWithDetail({
  value,
  onChange,
  disabled = false,
}: PersonSelectorWithDetailProps) {
  const t = useTranslations("IndividualProcesses")
  const tCommon = useTranslations("Common")
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const people = useQuery(api.people.list, {}) ?? []

  const peopleOptions = people.map((person) => ({
    value: person._id,
    label: person.fullName,
  }))

  const handleViewDetail = () => {
    if (value) {
      setDetailDialogOpen(true)
    }
  }

  const handleValueChange = (newValue: string | undefined) => {
    onChange(newValue || "")
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Combobox
            value={value}
            onValueChange={handleValueChange}
            options={peopleOptions}
            placeholder={t("selectPerson")}
            searchPlaceholder={tCommon("search")}
            emptyText={tCommon("noResults")}
            disabled={disabled}
          />
        </div>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleViewDetail}
            className="shrink-0"
            title={t("viewPersonDetail")}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">{t("viewPersonDetail")}</span>
          </Button>
        )}
      </div>

      {value && (
        <PersonDetailView
          personId={value as Id<"people">}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}
    </>
  )
}
