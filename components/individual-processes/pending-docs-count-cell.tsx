"use client";

import { createContext, useContext } from "react";
import { useTranslations } from "next-intl";
import { FileWarning } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pending-document counts loaded on demand for the rows on screen. `null` when
 * the rows already carry their own `pendingDocsCount` (client users).
 */
export const PendingDocsCountsContext = createContext<ReadonlyMap<
  Id<"individualProcesses">,
  number
> | null>(null);

interface PendingDocsCountCellProps {
  processId: Id<"individualProcesses">;
  count?: number;
}

export function PendingDocsCountCell({
  processId,
  count,
}: PendingDocsCountCellProps) {
  const t = useTranslations("IndividualProcesses");
  const loadedCounts = useContext(PendingDocsCountsContext);
  const resolvedCount = count ?? (loadedCounts ? loadedCounts.get(processId) : 0);

  if (resolvedCount === undefined) {
    return <Skeleton className="h-5 w-16" />;
  }

  if (resolvedCount === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
        {t("pendingDocsUpToDate")}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 text-xs border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300"
    >
      <FileWarning className="h-3 w-3" />
      {t("pendingDocsCount", { count: resolvedCount })}
    </Badge>
  );
}
