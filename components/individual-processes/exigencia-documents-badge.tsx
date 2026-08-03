"use client";

import { useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ExigenciaDocumentSummary {
  _id: Id<"documentsDelivered">;
  fileName: string;
  documentName?: string;
  documentTypeName?: string;
}

interface ExigenciaDocumentsBadgeProps {
  documents: readonly ExigenciaDocumentSummary[];
}

export function ExigenciaDocumentsBadge({
  documents,
}: ExigenciaDocumentsBadgeProps) {
  const t = useTranslations("IndividualProcesses");

  if (documents.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex cursor-help items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm ring-1 ring-amber-600/40 transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t("exigenciaDocsBadgeAriaLabel", {
              count: documents.length,
            })}
            onClick={(event) => event.stopPropagation()}
          >
            <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
            {documents.length}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm border bg-popover text-popover-foreground shadow-md"
        >
          <div className="space-y-1.5 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("exigenciaDocsBadgeTooltip")}
            </div>
            <ul className="space-y-1">
              {documents.map((document) => (
                <li
                  key={document._id}
                  className="flex items-start gap-1.5 text-foreground"
                >
                  <Paperclip
                    className="mt-0.5 h-3 w-3 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <span className="break-words">
                    {document.documentTypeName ||
                      document.documentName ||
                      document.fileName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
