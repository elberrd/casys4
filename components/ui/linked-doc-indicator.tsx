"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Paperclip } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LinkedDocIndicatorProps {
  individualProcessId: Id<"individualProcesses"> | undefined
  entityType: string
  fieldPath: string
}

/**
 * Small paperclip icon that appears next to form field labels
 * when the field is linked to a document type via field mappings.
 * Pass individualProcessId to enable; if undefined, renders nothing.
 */
export function LinkedDocIndicator({
  individualProcessId,
  entityType,
  fieldPath,
}: LinkedDocIndicatorProps) {
  const linkedFieldsMap = useQuery(
    api.documentTypeFieldMappings.getLinkedFieldsMap,
    individualProcessId ? { individualProcessId } : "skip"
  )

  if (!linkedFieldsMap) return null

  const key = `${entityType}:${fieldPath}`
  const links = linkedFieldsMap[key]
  if (!links?.length) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Paperclip className="h-3 w-3 text-muted-foreground inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent>
        {links.map((l) => l.documentTypeName).join(", ")}
      </TooltipContent>
    </Tooltip>
  )
}
